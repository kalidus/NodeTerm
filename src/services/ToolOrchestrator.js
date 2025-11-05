/**
 * ToolOrchestrator - Orquestación de tool-calls MCP por conversación
 *
 * - Emite mensajes estructurados: 'assistant_tool_call' y 'tool'
 * - Ejecuta tools vía MCP y encadena iteraciones
 * - Reinyecta observaciones al modelo como mensajes 'system' efímeros
 * - Dedupe por (tool,args) con TTL y anti-loop en el mismo turno
 */

import { conversationService } from './ConversationService';
import mcpClient from './MCPClientService';

class ToolOrchestrator {
  constructor() {
    this.stateByConversation = new Map();
    this.defaultMaxIterations = 10;
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
    try { window.dispatchEvent(new CustomEvent('conversation-updated')); } catch {}
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
      if (seenInTurn.has(dedupeKey) || this._isDuplicate(conversationId, toolName, args)) {
        if (callbacks.onStatus) callbacks.onStatus({ status: 'warning', message: `Tool repetido omitido: ${toolName}`, provider: 'local', model: modelId, turnId });
        break;
      }
      seenInTurn.add(dedupeKey);
      this._remember(conversationId, toolName, args);

      const toolCallId = this._makeToolCallId(conversationId);
      conversationService.addMessage('assistant_tool_call', `Llamando herramienta: ${toolName}`, { toolCallId, toolName, toolArgs: args, isToolCall: true, turnId });
      this._dispatchConversationUpdated();
      if (callbacks.onStatus) callbacks.onStatus({ status: 'tool-execution', message: `Ejecutando ${toolName}...`, provider: 'local', model: modelId, toolName, toolArgs: args, turnId });

      let result;
      try {
        result = await mcpClient.callTool(toolName, args);
        if (callbacks.onToolResult) callbacks.onToolResult({ toolName, args, result });
      } catch (error) {
        conversationService.addMessage('tool', `❌ Error en ${toolName}: ${error.message}`, { toolCallId, toolName, toolArgs: args, error: true, turnId });
        this._dispatchConversationUpdated();
        providerMessages.push({ role: 'system', content: `❌ Error ejecutando herramienta ${toolName}: ${error.message}` });
        const errorFollowUp = await callModelFn(providerMessages, { maxTokens: Math.min(500, options.maxTokens || 1000) });
        return errorFollowUp;
      }

      const cleanText = this._formatToolResult(result);

      conversationService.addMessage('tool', cleanText || `✔️ ${toolName} completado`, { toolCallId, toolName, toolArgs: args, isToolResult: true, turnId });
      this._dispatchConversationUpdated();

      // Registrar hecho breve
      try {
        const excerpt = (cleanText || '').split('\n').slice(0, 3).join(' ').substring(0, 200);
        conversationService.addFact({ text: `Resultado ${toolName}: ${excerpt}`, toolName, toolArgs: args });
      } catch {}

      providerMessages.push({ role: 'system', content: `🔧 Resultado de ${toolName}:
${cleanText}` });
      providerMessages.push({ role: 'system', content: 'IMPORTANTE: El resultado ya se mostró al usuario. No lo repitas. Si hace falta otra herramienta, pídela. Si no, responde con una frase breve de confirmación.' });

      const followUp = await callModelFn(providerMessages, { maxTokens: Math.min(500, options.maxTokens || 800) });
      currentToolCall = detectToolCallInResponse ? detectToolCallInResponse(followUp) : null;

      if (!currentToolCall) return followUp;
    }

    const conv = conversationService.getCurrentConversation();
    const last = conv?.messages?.[conv.messages.length - 1];
    return last?.content || 'Hecho.';
  }
}

const toolOrchestrator = new ToolOrchestrator();
export default toolOrchestrator;


