/**
 * ContextManager - Gestión de contexto e historial de conversación
 * 
 * Este módulo centraliza:
 * - Gestión del historial de conversación
 * - Limitación de historial según configuración
 * - Agregar/eliminar mensajes del historial
 * - Persistencia del historial por conversación
 */

import debugLogger from '../../utils/debugLogger';

class ContextManager {
  constructor() {
    this.conversationHistory = [];
    this.histories = {}; // Map<conversationId, history[]> para múltiples conversaciones
  }

  /**
   * Obtener el historial actual
   * @returns {Array} Historial de conversación
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * Limpiar el historial actual
   */
  clearHistory() {
    this.conversationHistory = [];
    debugLogger.debug('ContextManager', 'Historial limpiado');
  }

  /**
   * Agregar un mensaje al historial
   * @param {Object} message - Mensaje a agregar { role, content }
   */
  addMessage(message) {
    if (!message || !message.role || !message.content) {
      debugLogger.warn('ContextManager', 'Intento de agregar mensaje inválido', { message });
      return;
    }

    this.conversationHistory.push({
      role: message.role,
      content: message.content
    });

    debugLogger.debug('ContextManager', 'Mensaje agregado al historial', {
      role: message.role,
      contentLength: message.content?.length || 0
    });
  }

  /**
   * Agregar múltiples mensajes al historial
   * @param {Array} messages - Array de mensajes
   */
  addMessages(messages) {
    if (!Array.isArray(messages)) {
      debugLogger.warn('ContextManager', 'Intento de agregar mensajes no válidos', { messages });
      return;
    }

    messages.forEach(msg => this.addMessage(msg));
  }

  /**
   * Limitar el historial a un número máximo de mensajes
   * Mantiene los últimos N mensajes
   * @param {number} maxHistory - Número máximo de mensajes a mantener
   */
  limitHistory(maxHistory) {
    if (!maxHistory || maxHistory <= 0) {
      return;
    }

    if (this.conversationHistory.length > maxHistory) {
      const removed = this.conversationHistory.length - maxHistory;
      this.conversationHistory = this.conversationHistory.slice(-maxHistory);
      
      debugLogger.debug('ContextManager', 'Historial limitado', {
        maxHistory,
        removed,
        remaining: this.conversationHistory.length
      });
    }
  }

  /**
   * Obtener los últimos N mensajes del historial
   * @param {number} count - Número de mensajes a obtener
   * @returns {Array} Últimos N mensajes
   */
  getLastMessages(count) {
    if (!count || count <= 0) {
      return [];
    }

    return this.conversationHistory.slice(-count);
  }

  /**
   * Obtener mensajes formateados para enviar al proveedor
   * @param {Function} formatter - Función opcional para formatear cada mensaje
   * @returns {Array} Mensajes formateados
   */
  getFormattedMessages(formatter = null) {
    if (formatter && typeof formatter === 'function') {
      return this.conversationHistory.map(formatter);
    }

    return this.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Cargar historial de una conversación específica
   * @param {string} conversationId - ID de la conversación
   * @param {Object} histories - Objeto con historiales por conversación
   */
  loadConversationHistory(conversationId, histories = {}) {
    if (!conversationId) {
      this.conversationHistory = [];
      return;
    }

    this.conversationHistory = histories[conversationId] || [];
    this.histories = histories;

    debugLogger.debug('ContextManager', 'Historial de conversación cargado', {
      conversationId,
      messageCount: this.conversationHistory.length
    });
  }

  /**
   * Guardar historial de una conversación específica
   * @param {string} conversationId - ID de la conversación
   * @param {Object} histories - Objeto donde guardar (se modifica in-place)
   */
  saveConversationHistory(conversationId, histories = {}) {
    if (!conversationId) {
      return;
    }

    histories[conversationId] = [...this.conversationHistory];
    this.histories = histories;

    debugLogger.debug('ContextManager', 'Historial de conversación guardado', {
      conversationId,
      messageCount: this.conversationHistory.length
    });
  }

  /**
   * Obtener el número de mensajes en el historial
   * @returns {number} Número de mensajes
   */
  getHistoryLength() {
    return this.conversationHistory.length;
  }

  /**
   * Verificar si el historial está vacío
   * @returns {boolean} true si está vacío
   */
  isEmpty() {
    return this.conversationHistory.length === 0;
  }

  /**
   * Obtener el último mensaje del historial
   * @returns {Object|null} Último mensaje o null si está vacío
   */
  getLastMessage() {
    if (this.conversationHistory.length === 0) {
      return null;
    }

    return this.conversationHistory[this.conversationHistory.length - 1];
  }

  /**
   * Remover el último mensaje del historial
   * @returns {Object|null} Mensaje removido o null si estaba vacío
   */
  removeLastMessage() {
    if (this.conversationHistory.length === 0) {
      return null;
    }

    const removed = this.conversationHistory.pop();
    debugLogger.debug('ContextManager', 'Último mensaje removido', {
      role: removed.role,
      contentLength: removed.content?.length || 0
    });

    return removed;
  }

  /**
   * Reemplazar todo el historial
   * @param {Array} newHistory - Nuevo historial
   */
  setHistory(newHistory) {
    if (!Array.isArray(newHistory)) {
      debugLogger.warn('ContextManager', 'Intento de establecer historial no válido', { newHistory });
      return;
    }

    this.conversationHistory = [...newHistory];
    debugLogger.debug('ContextManager', 'Historial reemplazado', {
      messageCount: this.conversationHistory.length
    });
  }
}

// Exportar instancia singleton
export const contextManager = new ContextManager();
export default contextManager;

