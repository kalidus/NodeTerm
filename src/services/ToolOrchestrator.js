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
 * • maxIterations: 5 → Máximo 5 tools por turno
 * • Bloqueo: mismo tool + mismo path = bloqueado en el mismo turno
 * 
 * Esto evita que el modelo sea "perezoso" en solicitudes posteriores
 * del usuario por tener instrucciones "NO hagas nada" en el historial.
 */

import { conversationService } from './ConversationService';
import mcpClient from './MCPClientService';

class ToolOrchestrator {
  constructor() {
    this.stateByConversation = new Map();
    this.defaultMaxIterations = 5; // 🔧 Reducido de 10 a 5 para limitar proactividad
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
      const text = (() => {
        if (typeof result === 'object' && Array.isArray(result.content)) {
          const textItems = result.content
            .filter(it => typeof it?.text === 'string' && it.text.trim().length > 0)
            .map(it => it.text.trim());
          return textItems.join('\n');
        }
        if (typeof result === 'string') return result;
        return JSON.stringify(result, null, 2);
      })();
      
      // 🔍 DEBUG: Ver qué devuelve list_directory_with_sizes
      if (toolName === 'list_directory_with_sizes') {
        console.log(`📊 [ToolOrchestrator] list_directory_with_sizes resultado:`, {
          toolName,
          textLength: text.length,
          primeras200: text.substring(0, 200),
          tieneKB: text.includes('KB'),
          tieneMB: text.includes('MB'),
          tieneBytes: text.includes('bytes'),
          tieneKib: text.includes('KiB')
        });
      }
      
      // ✅ NO envolver en backticks aquí - eso confunde al modelo
      // AIChatPanel.js se encargará del rendering con backticks
      return text;
    } catch { return String(result); }
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
    const limit = Math.max(1, maxIterations || this.defaultMaxIterations);
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
        console.log(`⚠️ [ToolOrchestrator] Tool duplicado en el mismo turno detectado: ${toolName}, omitiendo`);
        if (callbacks.onStatus) callbacks.onStatus({ status: 'warning', message: `Tool repetido omitido: ${toolName}`, provider: 'local', model: modelId, turnId });
        break;
      }
      seenInTurn.add(dedupeKey);
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
        console.log(`✅ [ToolOrchestrator] Path inyectado para ${toolNameBase}: ${args.path}`);
      }
      
      // ✅ IMPROVED: Validar search_files - MCP NO soporta wildcards
      if (toolNameBase === 'search_files') {
        console.log(`🔍 [ToolOrchestrator] search_files recibido con args:`, JSON.stringify(args));
        
        // search_files requiere: path (string) y pattern (string)
        // Si el modelo envió "query" en lugar de "pattern", copiar el valor
        if (args.query && !args.pattern) {
          args.pattern = args.query;
          delete args.query;
          console.log(`✅ [ToolOrchestrator] Renombrado 'query' → 'pattern': ${args.pattern}`);
        }
        
        if (!args.pattern || typeof args.pattern !== 'string') {
          args.pattern = '*';
          console.log(`✅ [ToolOrchestrator] Pattern inyectado por defecto: *`);
        }
        
        // 🔧 CRÍTICO: Si el patrón contiene "*", MCP search_files NO lo soporta
        // Cambiar a list_directory y filtrar en el cliente
        if (args.pattern.includes('*')) {
          console.log(`⚠️ [ToolOrchestrator] Patrón wildcard detectado: ${args.pattern}`);
          console.log(`   MCP search_files NO soporta wildcards, usando list_directory + filtrado cliente`);
          
          // Cambiar herramienta
          currentToolCall.toolName = 'filesystem__list_directory';
          currentToolCall.arguments = { path: args.path };
          
          // Guardar patrón para filtrar después
          currentToolCall._filterPattern = args.pattern;
          console.log(`✅ [ToolOrchestrator] Cambiado a list_directory, se filtrará con: ${args.pattern}`);
          
          // Re-asignar args para que la ejecución use los nuevos argumentos
          args = { path: args.path };
          toolName = 'filesystem__list_directory';
        } else {
          console.log(`✅ [ToolOrchestrator] Búsqueda exacta (sin wildcards): ${args.pattern}`);
        }
      }
      
      // ✅ IMPROVED: Validar edit_file - requiere path y edits
      if (toolNameBase === 'edit_file') {
        console.log(`🔍 [ToolOrchestrator] edit_file recibido con args:`, JSON.stringify(args));
        
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
            console.log(`⚠️ [ToolOrchestrator] Construyendo edits desde argumentos alternativos`);
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
          console.log(`🔍 [ToolOrchestrator] Filtrando resultado con patrón: ${currentToolCall._filterPattern}`);
          result = this._filterListDirectoryByPattern(result, currentToolCall._filterPattern);
        }
        
        if (callbacks.onToolResult) callbacks.onToolResult({ toolName, args, result });
      } catch (error) {
        conversationService.addMessage('tool', `❌ Error en ${toolName}: ${error.message}`, { toolCallId, toolName, toolArgs: args, error: true, turnId });
        // this._dispatchConversationUpdated(); // ❌ ELIMINADO: addMessage() ya dispara el evento
        providerMessages.push({ role: 'system', content: `❌ Error ejecutando herramienta ${toolName}: ${error.message}` });
        const errorFollowUp = await callModelFn(providerMessages, { maxTokens: Math.min(500, options.maxTokens || 1000) });
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
      const metadata = { 
        toolCallId, 
        toolName, 
        toolArgs: args, 
        isToolResult: true, 
        turnId,
        detectedLanguage,
        filePath: args?.path || '',
        toolResultText: cleanText  // ← CRUCIAL para renderizado en AIChatPanel
      };
      
      conversationService.addMessage('tool', cleanText || `✔️ ${toolName} completado`, metadata);
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
      
      let antiProactivityPrompt = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Resultado de ${toolName}:
${cleanText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCCIONES POST-EJECUCIÓN:
1. ✅ La herramienta "${toolName}" YA se ejecutó exitosamente
2. ✅ El resultado YA fue mostrado al usuario automáticamente
3. ❌ NO repitas el resultado en tu respuesta
4. ❌ NO vuelvas a ejecutar "${toolName}" (ya se ejecutó)`;

      if (isLikelyComplete) {
        // Si ya ejecutamos 2+ herramientas y la última fue listar directorio, terminamos
        antiProactivityPrompt += `
5. ✅ TAREA COMPLETADA - Ya ejecutaste ${executedTools} herramientas
6. ❌ NO ejecutes MÁS herramientas
7. ✅ Responde SOLO: "Hecho."`;
      } else if (hasMultipleActions) {
        antiProactivityPrompt += `
5. ⚠️ El usuario pidió: "${userRequest}"
   Ya ejecutaste: ${toolName} ✓
   
   ¿Falta algo? Analiza la solicitud:
   - Si FALTA ejecutar otra acción → ejecuta la siguiente herramienta en JSON
   - Si YA completaste TODO → responde solo: "Hecho."
   
   IMPORTANTE: NO repitas ${toolName}`;
      } else {
        antiProactivityPrompt += `
5. ✅ Tarea completa. Responde: "Hecho."`;
      }
      
      antiProactivityPrompt += `\n\n⚠️ CRÍTICO: NO repitas "${toolName}" - ya se ejecutó.`;

      // Agregar el prompt SOLO a providerMessages (NO a conversationService)
      providerMessages.push({ role: 'system', content: antiProactivityPrompt });

      // 🔧 Aumentar tokens para permitir tool calls adicionales
      // Usar MUY POCOS tokens si ya completamos la tarea
      const followUpTokens = isLikelyComplete ? 50 : (hasMultipleActions ? 500 : 200);
      const followUp = await callModelFn(providerMessages, { 
        maxTokens: followUpTokens, 
        temperature: isLikelyComplete ? 0.1 : 0.4, // Temperatura muy baja si ya terminamos
        // 🔧 NO guardar este mensaje en conversationService
        skipSave: true 
      });
      lastFollowUpResponse = followUp; // 🔧 Guardar siempre la última respuesta
      currentToolCall = detectToolCallInResponse ? detectToolCallInResponse(followUp) : null;

      if (!currentToolCall) return followUp;
      
      // Si hay otro tool call pero el loop se romperá (duplicado), devolver fallback
      const dedupeKeyNext = this._makeDedupeKey(currentToolCall.toolName || currentToolCall.tool || currentToolCall.name, currentToolCall.arguments || {});
      if (seenInTurn.has(dedupeKeyNext)) {
        console.log(`⚠️ [ToolOrchestrator] Tool call duplicado detectado en followUp, usando fallback`);
        // No intentar limpiar la respuesta, simplemente usar fallback
        // Esto evita mostrar JSON parcial o caracteres sueltos como "}"
        return 'Operación completada correctamente.';
      }
    }

    // 🔧 MEJORADO: Si el loop se agota, devolver la última respuesta del modelo que guardamos
    console.warn(`⚠️ [ToolOrchestrator] Loop agotado, devolviendo última respuesta del modelo`);
    if (lastFollowUpResponse && lastFollowUpResponse.trim().length > 0) {
      console.log(`✅ [ToolOrchestrator] Devolviendo lastFollowUpResponse (${lastFollowUpResponse.length} chars)`);
      // 🔧 CRÍTICO: Validar que NO sea un JSON de tool call
      const trimmed = lastFollowUpResponse.trim();
      if (trimmed.startsWith('{') && trimmed.includes('"tool"')) {
        console.warn(`⚠️ [ToolOrchestrator] lastFollowUpResponse es un JSON de tool call, usando fallback`);
        return 'Operación completada correctamente.';
      }
      return lastFollowUpResponse;
    }
    
    // Fallback: buscar último mensaje del asistente en conversationService
    console.log(`⚠️ [ToolOrchestrator] No hay lastFollowUpResponse, buscando en conversationService`);
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
      
      console.log(`   Regex generado: ${regexPattern}`);
      
      // Filtrar líneas
      const filtered = lines.filter(line => {
        // Extraer nombre del archivo/carpeta (después de [FILE] o [DIR])
        const match = line.match(/^\[(?:FILE|DIR)\]\s+(.+)$/);
        if (!match) return false;
        const name = match[1].trim();
        return regexPattern.test(name);
      });
      
      if (filtered.length === 0) {
        console.log(`   ❌ No hay coincidencias con patrón: ${pattern}`);
        return { content: [{ type: 'text', text: 'No matches found' }] };
      }
      
      console.log(`   ✅ Encontrados ${filtered.length} coincidencias`);
      
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


