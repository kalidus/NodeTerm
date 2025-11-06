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

  _formatToolResult(result) {
    if (!result) return '';
    try {
      if (typeof result === 'object' && Array.isArray(result.content)) {
        const textItems = result.content
          .filter(it => typeof it?.text === 'string' && it.text.trim().length > 0)
          .map(it => it.text.trim());
        return textItems.join('\n');
      }
      if (typeof result === 'string') return result;
      return JSON.stringify(result, null, 2);
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
      const toolName = currentToolCall.toolName || currentToolCall.tool || currentToolCall.name;
      const args = currentToolCall.arguments || currentToolCall.args || {};

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

      const toolCallId = this._makeToolCallId(conversationId);
      conversationService.addMessage('assistant_tool_call', `Llamando herramienta: ${toolName}`, { toolCallId, toolName, toolArgs: args, isToolCall: true, turnId });
      // this._dispatchConversationUpdated(); // ❌ ELIMINADO: addMessage() ya dispara el evento
      if (callbacks.onStatus) callbacks.onStatus({ status: 'tool-execution', message: `Ejecutando ${toolName}...`, provider: 'local', model: modelId, toolName, toolArgs: args, turnId });

      let result;
      try {
        result = await mcpClient.callTool(toolName, args);
        if (callbacks.onToolResult) callbacks.onToolResult({ toolName, args, result });
      } catch (error) {
        conversationService.addMessage('tool', `❌ Error en ${toolName}: ${error.message}`, { toolCallId, toolName, toolArgs: args, error: true, turnId });
        // this._dispatchConversationUpdated(); // ❌ ELIMINADO: addMessage() ya dispara el evento
        providerMessages.push({ role: 'system', content: `❌ Error ejecutando herramienta ${toolName}: ${error.message}` });
        const errorFollowUp = await callModelFn(providerMessages, { maxTokens: Math.min(500, options.maxTokens || 1000) });
        return errorFollowUp;
      }

      const cleanText = this._formatToolResult(result);

      conversationService.addMessage('tool', cleanText || `✔️ ${toolName} completado`, { toolCallId, toolName, toolArgs: args, isToolResult: true, turnId });
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
}

const toolOrchestrator = new ToolOrchestrator();
export default toolOrchestrator;


