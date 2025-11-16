/**
 * ToolOrchestrator - Orquestación de tool-calls MCP por conversación
 *
 * FLUJO PRINCIPAL:
 * ─────────────────
 * - Emite mensajes estructurados: 'assistant_tool_call' y 'tool'
 * - Ejecuta tools vía MCP y encadena iteraciones
 * - Reinyecta observaciones al modelo como mensajes 'system' efímeros
 * - Dedupe por (tool,args) con TTL y anti-loop en el mismo turno
 * 
 * ESTRATEGIA ANTI-PROACTIVIDAD:
 * ──────────────────────────────
 * Después de ejecutar un tool, se inyectan instrucciones TEMPORALES
 * (NO se guardan en conversationService para evitar contaminar contexto):
 * 
 * • maxTokens: 100 → Solo espacio para "Hecho." (sin reasoning)
 * • temperature: 0.2 → Casi determinista
 * • Bloqueo: mismo tool + mismo path = bloqueado en el mismo turno
 * 
 * Esto evita que el modelo sea "perezoso" en solicitudes posteriores
 * del usuario por tener instrucciones "NO hagas nada" en el historial.
 */

import { conversationService } from './ConversationService';
import mcpClient from './MCPClientService';
import { getRecentToolExecution, rememberToolExecution } from './ToolExecutionCache';
import { summarizeToolResult } from '../utils/toolResultSummarizer';

class ToolOrchestrator {
  constructor() {
    this.stateByConversation = new Map();
    this.dedupeTtlMs = 2 * 60 * 1000; // 2 min
  }

  _now() { return Date.now(); }

  _getState(conversationId) {
    if (!this.stateByConversation.has(conversationId)) {
      this.stateByConversation.set(conversationId, {
        lastToolCallCounter: 0,
        recentCalls: new Map(), // key -> { ts }
      });
    }
    return this.stateByConversation.get(conversationId);
  }

  _makeToolCallId(conversationId) {
    const st = this._getState(conversationId);
    st.lastToolCallCounter += 1;
    return `toolcall_${st.lastToolCallCounter}_${this._now()}`;
  }

  _normalizePath(p) {
    try {
      if (!p || typeof p !== 'string') return p;
      let s = p.replace(/\\/g, '/').trim();
      if (/^[a-zA-Z]:\//.test(s)) s = s.toLowerCase();
      if (s.length > 3) s = s.replace(/\/$/, '');
      return s;
    } catch { return p; }
  }

  _normalizeArgs(toolName, args) {
    const clone = JSON.parse(JSON.stringify(args || {}));
    const stripEmpty = (obj) => {
      Object.keys(obj).forEach(k => { if (obj[k] === undefined || obj[k] === null) delete obj[k]; });
      return obj;
    };
    if (toolName === 'read_text_file') {
      if (clone.head === 0) delete clone.head;
      if (clone.tail === 0) delete clone.tail;
      if (clone.path) clone.path = this._normalizePath(clone.path);
      return stripEmpty(clone);
    }
    if (['list_directory','directory_tree','list_directory_with_sizes'].includes(toolName)) {
      if (clone.path) clone.path = this._normalizePath(clone.path);
      return stripEmpty(clone);
    }
    ['path','source','destination'].forEach(k => { if (clone[k]) clone[k] = this._normalizePath(clone[k]); });
    return stripEmpty(clone);
  }

  _stableStringify(obj) {
    try {
      const keys = Object.keys(obj).sort();
      const out = {};
      keys.forEach(k => { out[k] = obj[k]; });
      return JSON.stringify(out);
    } catch { return JSON.stringify(obj); }
  }

  _makeDedupeKey(toolName, args) {
    const normalized = this._normalizeArgs(toolName, args || {});
    return `${toolName}::${this._stableStringify(normalized)}`;
  }

  _isDuplicate(conversationId, toolName, args) {
    const st = this._getState(conversationId);
    const key = this._makeDedupeKey(toolName, args);
    const entry = st.recentCalls.get(key);
    return !!entry && (this._now() - entry.ts) < this.dedupeTtlMs;
  }

  _remember(conversationId, toolName, args) {
    const st = this._getState(conversationId);
    const key = this._makeDedupeKey(toolName, args);
    st.recentCalls.set(key, { ts: this._now() });
    // limpieza
    for (const [k, v] of st.recentCalls) {
      if ((this._now() - v.ts) > this.dedupeTtlMs) st.recentCalls.delete(k);
    }
  }

  _formatToolResult(result, toolName = '', args = {}) {
    if (!result) return '';
    try {
      let text = '';
      
      // Extraer el texto del resultado
      if (typeof result === 'object' && Array.isArray(result.content)) {
        const textItems = result.content
          .filter(it => typeof it?.text === 'string' && it.text.trim().length > 0)
          .map(it => it.text.trim());
        text = textItems.join('\n');
      } else if (typeof result === 'string') {
        text = result;
      } else {
        text = JSON.stringify(result, null, 2);
      }
      
      // 🗜️ OPTIMIZACIÓN: Comprimir resultados largos inteligentemente
      text = this._compressToolResult(text, toolName, args);
      
      // 🔧 IMPORTANTE: Si el texto parece ser JSON, envolverlo en backticks SIEMPRE
      const trimmed = text.trim();
      if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
        return `\`\`\`json\n${trimmed}\n\`\`\``;
      }
      
      return text;
    } catch (e) { 
      console.error(`❌ [ToolOrchestrator._formatToolResult] Error:`, e);
      return String(result); 
    }
  }

  /**
   * 🗜️ Comprimir resultados de herramientas para reducir tokens enviados al modelo
   * Mantiene información relevante pero reduce verbosidad
   */
  _compressToolResult(text, toolName, args) {
    if (!text || text.length < 500) return text; // Resultados cortos, no comprimir

    const lines = text.split('\n');
    
    // CASO 1: Listado de directorios (list_directory, list_directory_with_sizes)
    if (toolName === 'list_directory' || toolName === 'list_directory_with_sizes') {
      const files = lines.filter(l => l.includes('[FILE]'));
      const dirs = lines.filter(l => l.includes('[DIR]'));
      
      // Si hay muchos archivos/dirs, resumir
      if (files.length + dirs.length > 20) {
        const summary = [];
        summary.push(`${dirs.length} carpetas, ${files.length} archivos`);
        
        // Mostrar primeros 5 y últimos 3
        if (dirs.length > 0) {
          summary.push('\nCarpetas (primeras 5):');
          dirs.slice(0, 5).forEach(d => summary.push(d));
          if (dirs.length > 5) summary.push(`... y ${dirs.length - 5} más`);
        }
        
        if (files.length > 0) {
          summary.push('\nArchivos (primeros 5):');
          files.slice(0, 5).forEach(f => summary.push(f));
          if (files.length > 5) summary.push(`... y ${files.length - 5} más`);
        }
        
        return summary.join('\n');
      }
    }
    
    // CASO 2: Contenido de archivos (read_text_file)
    if (toolName === 'read_text_file') {
      // Si el archivo es muy largo, truncar y dar estadísticas
      if (lines.length > 100) {
        const preview = lines.slice(0, 50).join('\n');
        return `${preview}\n\n[... ${lines.length - 50} líneas más, total ${lines.length} líneas]`;
      }
    }
    
    // CASO 3: Búsqueda de archivos (search_files)
    if (toolName === 'search_files') {
      if (lines.length > 15) {
        const preview = lines.slice(0, 10).join('\n');
        return `${preview}\n... y ${lines.length - 10} resultados más (total ${lines.length})`;
      }
    }
    
    // CASO 4: JSON largo
    const trimmed = text.trim();
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && text.length > 1000) {
      try {
        const parsed = JSON.parse(trimmed);
        // Resumir JSON grande
        if (Array.isArray(parsed)) {
          return `[Array con ${parsed.length} elementos]`;
        } else if (typeof parsed === 'object') {
          const keys = Object.keys(parsed);
          return `{${keys.slice(0, 5).join(', ')}${keys.length > 5 ? `, ... +${keys.length - 5}` : ''}}`;
        }
      } catch (e) {
        // Si no es JSON válido, continuar
      }
    }
    
    // CASO 5: Texto largo genérico - truncar a 800 caracteres
    if (text.length > 1500) {
      return text.slice(0, 800) + `\n\n[... ${text.length - 800} caracteres más]`;
    }
    
    return text;
  }

  _dispatchConversationUpdated() {
    // 🔧 YA NO ES NECESARIO: ConversationService.addMessage() ahora dispara el evento automáticamente
    // Mantener este método por compatibilidad pero sin hacer nada
    // El evento se dispara automáticamente cuando se guarda un mensaje en conversationService.addMessage()
  }

  async executeLoop({ modelId, initialToolCall, baseProviderMessages, detectToolCallInResponse, callModelFn, callbacks = {}, options = {}, maxIterations, turnId }) {
    const conversation = conversationService.getCurrentConversation();
    if (!conversation) throw new Error('No hay conversación activa');
    const conversationId = conversation.id;

    let iteration = 0;
    let currentToolCall = initialToolCall;
    const limit = Number.isFinite(maxIterations) ? Math.max(1, maxIterations) : Infinity;
    const seenInTurn = new Set();
    let lastToolName = null;
    let sameToolCount = 0;
    let lastFollowUpResponse = null; // 🔧 Guardar la última respuesta del modelo

    let providerMessages = Array.isArray(baseProviderMessages) ? [...baseProviderMessages] : [];

    while (currentToolCall && iteration < limit) {
      iteration += 1;
      let toolName = currentToolCall.toolName || currentToolCall.tool || currentToolCall.name;
      let args = currentToolCall.arguments || currentToolCall.args || {};

      if (toolName === lastToolName) sameToolCount += 1; else { lastToolName = toolName; sameToolCount = 1; }
      if (sameToolCount > 2) {
        if (callbacks.onStatus) callbacks.onStatus({ status: 'warning', message: `Mismo tool repetido varias veces: ${toolName}. Deteniendo.`, provider: 'local', model: modelId, turnId });
        break;
      }

      const dedupeKey = this._makeDedupeKey(toolName, args);
      // 🔧 CRÍTICO: Solo verificar duplicados DENTRO DEL MISMO TURNO (seenInTurn)
      // NO bloquear herramientas que se usaron en turnos anteriores de la conversación
      if (seenInTurn.has(dedupeKey)) {
        if (callbacks.onStatus) callbacks.onStatus({ status: 'warning', message: `Tool repetido omitido: ${toolName}`, provider: 'local', model: modelId, turnId });
        break;
      }
      seenInTurn.add(dedupeKey);

      const recentExecution = getRecentToolExecution(conversationId, toolName, args);
      if (recentExecution && !recentExecution.isError) {
        const reuseNote = `♻️ Resultado reciente de ${toolName} reutilizado.\n${recentExecution.summary || recentExecution.rawText || ''}\nSi necesitas algo distinto, pide una herramienta diferente.`;
        if (callbacks.onStatus) {
          callbacks.onStatus({
            status: 'info',
            message: `Reutilizando resultado previo de ${toolName}`,
            provider: 'local',
            model: modelId,
            toolName,
            turnId
          });
        }
        providerMessages.push({ role: 'system', content: reuseNote });
        const reuseFollowUp = await callModelFn(providerMessages, { 
          maxTokens: 1000, // ✅ AUMENTADO: Permitir respuestas más completas
          temperature: 0.35,
          skipSave: true
        });
        lastFollowUpResponse = reuseFollowUp;
        currentToolCall = detectToolCallInResponse ? detectToolCallInResponse(reuseFollowUp) : null;
        continue;
      }
      // NO llamar a this._remember() - ya no necesitamos historial entre turnos
      
      // 🔧 NUEVA DEFENSA: Bloquear tools con el mismo nombre y mismo path/target en el mismo turno
      // Esto previene sobrescribir el mismo archivo múltiples veces
      if (args.path) {
        const pathKey = `${toolName}:${args.path}`;
        if (seenInTurn.has(pathKey)) {
          console.warn(`⚠️ [ToolOrchestrator] Tool con el mismo path detectado: ${pathKey}, bloqueando para evitar sobrescritura`);
          if (callbacks.onStatus) callbacks.onStatus({ status: 'warning', message: `Operación al mismo archivo bloqueada`, provider: 'local', model: modelId, turnId });
          break;
        }
        seenInTurn.add(pathKey);
      }

      // ✅ IMPROVED: Validar y completar argumentos antes de ejecutar
      if (!args || typeof args !== 'object' || Array.isArray(args)) {
        args = {};
      }
      
      // Inyectar path por defecto si es necesario
      const toolNameBase = toolName.includes('__') ? toolName.split('__')[1] : toolName;
      if (['list_directory', 'directory_tree', 'list_directory_with_sizes', 'get_file_info', 'search_files'].includes(toolNameBase) && !args.path) {
        // Usar la ruta por defecto del filesystem
        args.path = 'C:\\Users\\kalid\\Downloads\\NodeTerm Drive'; // TODO: obtener dinámicamente
      }
      
      // ✅ IMPROVED: Validar search_files - MCP NO soporta wildcards
      if (toolNameBase === 'search_files') {
        // search_files requiere: path (string) y pattern (string)
        // Si el modelo envió "query" en lugar de "pattern", copiar el valor
        if (args.query && !args.pattern) {
          args.pattern = args.query;
          delete args.query;
        }
        
        if (!args.pattern || typeof args.pattern !== 'string') {
          args.pattern = '*';
        }
        
        // 🔧 CRÍTICO: Si el patrón contiene "*", MCP search_files NO lo soporta
        // Cambiar a list_directory y filtrar en el cliente
        if (args.pattern.includes('*')) {
          // Cambiar herramienta
          currentToolCall.toolName = 'filesystem__list_directory';
          currentToolCall.arguments = { path: args.path };
          
          // Guardar patrón para filtrar después
          currentToolCall._filterPattern = args.pattern;
          
          // Re-asignar args para que la ejecución use los nuevos argumentos
          args = { path: args.path };
          toolName = 'filesystem__list_directory';
        }
      }
      
      // ✅ IMPROVED: Validar edit_file - requiere path y edits
      if (toolNameBase === 'edit_file') {
        // edit_file requiere: path (string) y edits (array de ediciones)
        // Formato esperado: { path: "...", edits: [{ oldText: "...", newText: "..." }] }
        // MCP usa camelCase: oldText, newText (NO snake_case)
        
        if (!args.edits || !Array.isArray(args.edits)) {
          // Si no hay edits válidos, intentar construirlo desde otros parámetros
          // El modelo podría haber pasado: replacement, content, new_content, text, oldText/newText, old_text/new_text, etc.
          if (args.replacement || args.content || args.new_content || args.text || args.newText || args.new_text) {
            const editContent = args.replacement || args.content || args.new_content || args.text || args.newText || args.new_text;
            const oldText = args.oldText || args.old_text || args.originalText || args.original_text || '';
            
            args.edits = [{ 
              oldText: oldText,
              newText: editContent
            }];
          } else {
            console.warn(`⚠️ [ToolOrchestrator] edit_file sin edits válidos, args:`, args);
            // Crear edits con valores por defecto
            args.edits = [{ oldText: '', newText: '' }];
          }
        } else {
          // Validar que los elementos de edits tengan las propiedades correctas (camelCase)
          args.edits = args.edits.map(edit => {
            // Convertir snake_case a camelCase si es necesario
            const normalized = {
              oldText: edit.oldText || edit.old_text || edit.originalText || '',
              newText: edit.newText || edit.new_text || edit.replacement || ''
            };
            return normalized;
          });
        }
      }
      
      const toolCallId = this._makeToolCallId(conversationId);
      conversationService.addMessage('assistant_tool_call', `Llamando herramienta: ${toolName}`, { toolCallId, toolName, toolArgs: args, isToolCall: true, turnId });
      // this._dispatchConversationUpdated(); // ❌ ELIMINADO: addMessage() ya dispara el evento
      if (callbacks.onStatus) callbacks.onStatus({ status: 'tool-execution', message: `Ejecutando ${toolName}...`, provider: 'local', model: modelId, toolName, toolArgs: args, turnId });

      let result;
      try {
        result = await mcpClient.callTool(toolName, args);
        
        // 🔧 Si hay patrón de filtrado (porque convertimos search_files a list_directory)
        if (currentToolCall._filterPattern && toolName === 'filesystem__list_directory') {
          result = this._filterListDirectoryByPattern(result, currentToolCall._filterPattern);
        }
        
        if (callbacks.onToolResult) callbacks.onToolResult({ toolName, args, result });
      } catch (error) {
        const errorText = `❌ Error en ${toolName}: ${error.message}`;
        const errorSummary = summarizeToolResult({
          toolName,
          args,
          resultText: errorText,
          isError: true
        });
        conversationService.addMessage('tool', errorSummary, { 
          toolCallId, 
          toolName, 
          toolArgs: args, 
          error: true, 
          turnId,
          isToolResult: true,
          toolResultText: errorText,
          toolResultSummary: errorSummary
        });
        rememberToolExecution(conversationId, toolName, args, {
          summary: errorSummary,
          rawText: errorText,
          isError: true
        });
        // this._dispatchConversationUpdated(); // ❌ ELIMINADO: addMessage() ya dispara el evento
        providerMessages.push({ role: 'system', content: `❌ Error ejecutando herramienta ${toolName}: ${error.message}` });
        const errorFollowUp = await callModelFn(providerMessages, { maxTokens: Math.min(1500, options.maxTokens || 2000) });
        return errorFollowUp;
      }

      const cleanText = this._formatToolResult(result, toolName, args);
      
      // ✅ IMPROVED: Detectar lenguaje para archivos de texto
      let detectedLanguage = '';
      if (toolName === 'read_text_file') {
        const filePath = args?.path || '';
        const ext = filePath.split('.').pop()?.toLowerCase() || '';
        const langMap = {
          'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
          'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c', 'h': 'c', 'hpp': 'cpp',
          'cs': 'csharp', 'php': 'php', 'rb': 'ruby', 'go': 'go', 'rs': 'rust', 'swift': 'swift',
          'kt': 'kotlin', 'scala': 'scala', 'sh': 'bash', 'bash': 'bash', 'zsh': 'bash', 'fish': 'bash',
          'ps1': 'powershell', 'json': 'json', 'yaml': 'yaml', 'yml': 'yaml', 'xml': 'xml',
          'html': 'html', 'htm': 'html', 'css': 'css', 'scss': 'scss', 'sass': 'sass', 'less': 'less',
          'sql': 'sql', 'md': 'markdown', 'mdx': 'markdown', 'txt': 'text', 'log': 'text'
        };
        detectedLanguage = langMap[ext] || '';
      }

      // ✅ CRITICAL: Guardar toolResultText para que AIChatPanel lo renderice correctamente
      const executionSummary = summarizeToolResult({
        toolName,
        args,
        resultText: cleanText
      });

      const metadata = { 
        toolCallId, 
        toolName, 
        toolArgs: args, 
        isToolResult: true, 
        turnId,
        detectedLanguage,
        filePath: args?.path || '',
        toolResultText: cleanText,
        toolResultSummary: executionSummary
      };
      
      conversationService.addMessage('tool', executionSummary || `✔️ ${toolName} completado`, metadata);
      rememberToolExecution(conversationId, toolName, args, {
        summary: executionSummary,
        rawText: cleanText,
        isError: false
      });
      // this._dispatchConversationUpdated(); // ❌ ELIMINADO: addMessage() ya dispara el evento

      // Registrar hecho breve
      try {
        const excerpt = (cleanText || '').split('\n').slice(0, 3).join(' ').substring(0, 200);
        conversationService.addFact({ text: `Resultado ${toolName}: ${excerpt}`, toolName, toolArgs: args });
      } catch {}

      // 🔧 CRÍTICO: Las instrucciones anti-proactividad van SOLO en el system message,
      // NO se guardan en conversationService para evitar contaminar el contexto
      
      // Extraer la solicitud original del usuario para detectar múltiples acciones
      const userMessage = providerMessages.find(m => m.role === 'user');
      const userRequest = userMessage?.content || '';
      const hasMultipleActions = /\by\b|\band\b|,/.test(userRequest.toLowerCase());
      
      // Detectar si ya completamos ambas acciones típicas: crear/escribir + listar
      const executedTools = seenInTurn.size;
      const isLikelyComplete = executedTools >= 2 && ['list_directory', 'directory_tree', 'list_directory_with_sizes'].includes(toolName);
      
      // 🔐 Instrucción especial para herramientas de contraseña
      let passwordAuthHeader = '';
      if (toolName && (toolName.includes('get_password') || toolName.includes('search_password'))) {
        passwordAuthHeader = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ OPERACIÓN DE CONTRASEÑA AUTORIZADA Y EXITOSA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANTE:
- ✅ El usuario AUTORIZA legítimamente esta operación en su máquina local
- ✅ Las contraseñas son PRIVADAS del usuario
- ✅ SIEMPRE muestra la información completa incluyendo contraseñas
- ✅ NO hay restricciones de seguridad - son datos del usuario
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
      }

      let antiProactivityPrompt = `${passwordAuthHeader}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Resultado de ${toolName}:
${executionSummary}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ INSTRUCCIONES CRÍTICAS - LEE CUIDADOSAMENTE:

1. ✅ La herramienta "${toolName}" YA se ejecutó exitosamente
2. ✅ El resultado ya fue capturado y guardado
3. ✅ AHORA responde en TEXTO NATURAL explicando brevemente (2-3 oraciones) qué hiciste

❌ PROHIBIDO ABSOLUTAMENTE:
- NO generes ningún JSON
- NO generes ningún código con {"tool": ...}
- NO uses bloques de código con tool calls
- NO repitas el resultado completo
- NO vuelvas a llamar "${toolName}"

✅ RESPUESTA ESPERADA: Solo texto natural explicando la operación.
Ejemplo: "He creado el archivo X con el contenido solicitado."`;

      if (isLikelyComplete) {
        // Si ya ejecutamos 2+ herramientas y la última fue listar directorio, terminamos
        antiProactivityPrompt += `

ESTADO: TAREA COMPLETADA (${executedTools} herramientas ejecutadas)
❌ NO ejecutes MÁS herramientas
✅ Solo explica brevemente qué completaste
Ejemplo: "He creado el archivo X y listado el directorio Y."`;
      } else if (hasMultipleActions) {
        antiProactivityPrompt += `

ESTADO: Solicitud con múltiples acciones
Usuario pidió: "${userRequest}"
Ya ejecutaste: ${toolName} ✓

¿Falta algo?
- Si FALTA ejecutar otra acción → genera JSON para la siguiente herramienta
- Si YA completaste TODO → responde SOLO en texto natural

IMPORTANTE: NO repitas ${toolName}`;
      } else {
        antiProactivityPrompt += `

ESTADO: Tarea simple completada
✅ Solo responde en texto natural
❌ NO generes JSON ni código
Ejemplo: "He creado el archivo script.py con el código solicitado."`;
      }

      // Agregar el prompt SOLO a providerMessages (NO a conversationService)
      providerMessages.push({ role: 'system', content: antiProactivityPrompt });

      // 🔧 Aumentar tokens y temperatura para explicaciones naturales
      // Queremos que el modelo explique, no que genere más JSON
      // ✅ AUMENTADO: Permitir respuestas más completas (antes: 200-500, ahora: 1000-2000)
      const followUpTokens = isLikelyComplete ? 1000 : (hasMultipleActions ? 2000 : 1500);
      const followUp = await callModelFn(providerMessages, { 
        maxTokens: followUpTokens, 
        temperature: isLikelyComplete ? 0.7 : (hasMultipleActions ? 0.6 : 0.7), // Más temperatura = más natural, menos JSON
        // 🔧 NO guardar este mensaje en conversationService
        skipSave: true 
      });
      
      // 🚨 CRÍTICO: Si el modelo está generando el MISMO tool call otra vez, cortarlo
      let cleanedFollowUp = followUp;
      if (followUp && typeof followUp === 'string') {
        const trimmed = followUp.trim();
        
        // 🔍 IMPORTANTE: Verificar si el resultado de la herramienta tuvo ERROR
        const hadError = cleanText && (
          cleanText.toLowerCase().includes('error:') ||
          cleanText.toLowerCase().includes('access denied') ||
          cleanText.toLowerCase().includes('permission denied') ||
          cleanText.toLowerCase().includes('failed') ||
          cleanText.toLowerCase().includes('not found')
        );
        
        // 🚨 Caso 1: Bloque de código con JSON (```json\n{...})
        if (trimmed.startsWith('```json') || trimmed.startsWith('```\n{')) {
          // El modelo está devolviendo un tool call en markdown
          if (hadError) {
            cleanedFollowUp = `Hubo un problema: ${cleanText.slice(0, 200)}`;
          } else {
            // Generar explicación basada en el tool ejecutado
            if (toolName.includes('write') || toolName.includes('create')) {
              cleanedFollowUp = `He creado el archivo correctamente.`;
            } else if (toolName.includes('read')) {
              cleanedFollowUp = 'He leído el contenido del archivo.';
            } else if (toolName.includes('list')) {
              cleanedFollowUp = 'He listado el contenido del directorio.';
            } else if (toolName.includes('edit') || toolName.includes('modify')) {
              cleanedFollowUp = 'He modificado el archivo correctamente.';
            } else {
              cleanedFollowUp = 'Operación completada correctamente.';
            }
          }
        }
        // 🚨 Caso 2: JSON puro (sin backticks)
        else if (trimmed.startsWith('{') && 
                 trimmed.endsWith('}') && 
                 /\"tool\"|\"arguments\"|\"use_tool\"|\"plan\"/.test(trimmed.slice(0, 300))) {
          if (hadError) {
            cleanedFollowUp = `Hubo un problema: ${cleanText.slice(0, 200)}`;
          } else {
            if (toolName.includes('write') || toolName.includes('create')) {
              cleanedFollowUp = 'He creado el archivo correctamente.';
            } else if (toolName.includes('read')) {
              cleanedFollowUp = 'He leído el contenido solicitado.';
            } else if (toolName.includes('list')) {
              cleanedFollowUp = 'He listado el contenido del directorio.';
            } else {
              cleanedFollowUp = 'Operación completada correctamente.';
            }
          }
        }
        // 🚨 Caso 3: Texto + JSON trailing
        else {
          const jsonStart = trimmed.indexOf('\n{');
          if (jsonStart > 50 && /\"tool\"|\"arguments\"/.test(trimmed.slice(jsonStart, jsonStart + 200))) {
            // Hay texto antes del JSON, quedarnos solo con el texto
            cleanedFollowUp = trimmed.slice(0, jsonStart).trim();
          }
        }
      }
      
      lastFollowUpResponse = cleanedFollowUp; // 🔧 Guardar siempre la última respuesta (limpia)
      currentToolCall = detectToolCallInResponse ? detectToolCallInResponse(followUp) : null;

      if (!currentToolCall) {
        return cleanedFollowUp;
      }
      
      // Si hay otro tool call pero el loop se romperá (duplicado), devolver fallback
      const dedupeKeyNext = this._makeDedupeKey(currentToolCall.toolName || currentToolCall.tool || currentToolCall.name, currentToolCall.arguments || {});
      if (seenInTurn.has(dedupeKeyNext)) {
        // No intentar limpiar la respuesta, simplemente usar fallback
        // Esto evita mostrar JSON parcial o caracteres sueltos como "}"
        return 'Operación completada correctamente.';
      }
    }

    const limitReached = Number.isFinite(limit) && iteration >= limit && currentToolCall;
    if (limitReached) {
      debugLogger.warn('AIService.MCP', 'Límite de iteraciones alcanzado en loop de herramientas', {
        maxIterations: limit
      });
      if (callbacks.onStatus) {
        callbacks.onStatus({
          status: 'warning',
          message: `Límite de herramientas alcanzado (${limit} iteraciones)`,
          model: modelId,
          provider: 'local'
        });
      }
    }

    // 🔧 MEJORADO: Si el loop se agota (solo cuando se fijó un límite), devolver la última respuesta del modelo que guardamos
    if (limitReached && lastFollowUpResponse && lastFollowUpResponse.trim().length > 0) {
      // 🔧 CRÍTICO: Validar que NO sea un JSON de tool call (incluso truncado)
      const trimmed = lastFollowUpResponse.trim();
      
      // Caso 1: JSON que contiene "tool", "arguments", "use_tool", o "plan"
      if (trimmed.startsWith('{') && /\"tool\"|\"arguments\"|\"use_tool\"|\"plan\"/.test(trimmed.slice(0, 300))) {
        return 'Operación completada correctamente.';
      }
      
      // Caso 2: JSON truncado (termina con }})
      if (trimmed.endsWith('}}')) {
        return 'Operación completada correctamente.';
      }
      
      return lastFollowUpResponse;
    }
    
    // Fallback: buscar último mensaje del asistente en conversationService
    const conv = conversationService.getCurrentConversation();
    const assistantMessages = (conv?.messages || []).filter(m => m.role === 'assistant');
    if (assistantMessages.length > 0) {
      const last = assistantMessages[assistantMessages.length - 1];
      return last.content || 'Operación completada.';
    }
    return 'Operación completada.';
  }

  /**
   * 🔧 Filtrar resultado de list_directory con un patrón wildcard
   * Convierte p* a expresión regular y filtra los archivos
   */
  _filterListDirectoryByPattern(result, pattern) {
    try {
      // Parsear resultado de list_directory
      // Típicamente contiene líneas como: "[FILE] nombre.txt" o "[DIR] nombre"
      const lines = result?.content?.[0]?.text?.split('\n') || result?.toString?.().split('\n') || [];
      
      // Convertir wildcard pattern a regex
      // p* → /^p/i (empieza con p, case insensitive)
      // *.txt → /\.txt$/i (termina con .txt, case insensitive)
      // *pkate* → /pkate/i (contiene pkate, case insensitive)
      let regexPattern;
      if (pattern === '*') {
        regexPattern = /.*/; // Todos
      } else if (pattern.startsWith('*') && pattern.endsWith('*')) {
        // *PALABRA* → contiene
        const word = pattern.slice(1, -1);
        regexPattern = new RegExp(word, 'i');
      } else if (pattern.startsWith('*')) {
        // *TERMINA → termina con
        const end = pattern.slice(1);
        regexPattern = new RegExp(end + '$', 'i');
      } else if (pattern.endsWith('*')) {
        // EMPIEZA* → empieza con
        const start = pattern.slice(0, -1);
        regexPattern = new RegExp('^' + start, 'i');
      } else {
        // Búsqueda exacta
        regexPattern = new RegExp('^' + pattern + '$', 'i');
      }
      
      // Filtrar líneas
      const filtered = lines.filter(line => {
        // Extraer nombre del archivo/carpeta (después de [FILE] o [DIR])
        const match = line.match(/^\[(?:FILE|DIR)\]\s+(.+)$/);
        if (!match) return false;
        const name = match[1].trim();
        return regexPattern.test(name);
      });
      
      if (filtered.length === 0) {
        return { content: [{ type: 'text', text: 'No matches found' }] };
      }
      
      
      // Retornar resultado filtrado
      return {
        content: [{
          type: 'text',
          text: filtered.join('\n')
        }]
      };
    } catch (error) {
      console.error(`❌ Error filtrando: ${error.message}`);
      return result; // Devolver resultado original en caso de error
    }
  }
}

const toolOrchestrator = new ToolOrchestrator();
export default toolOrchestrator;


