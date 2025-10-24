/**
 * ConversationService - Servicio para gestionar el historial de conversaciones
 * Extiende las funcionalidades del AIService para manejar múltiples conversaciones
 */

class ConversationService {
  constructor() {
    this.currentConversationId = null;
    this.conversations = new Map(); // Map para acceso rápido por ID
    this.conversationIndex = []; // Array ordenado para búsqueda
    this.maxConversations = 50; // Límite de conversaciones almacenadas
    this.maxMessagesPerConversation = 100; // Límite de mensajes por conversación
    
    this.loadConversations();
  }

  /**
   * Crear nueva conversación
   */
  createConversation(title = null, modelId = null, modelType = null) {
    // Verificar si ya hay una conversación actual vacía (sin mensajes)
    const currentConversation = this.getCurrentConversation();
    if (currentConversation && currentConversation.messages.length === 0) {
      // Reutilizar la conversación vacía existente
      if (title) {
        currentConversation.title = title;
        currentConversation.updatedAt = Date.now();
        this.saveConversations();
      }
      return currentConversation;
    }

    const conversationId = this.generateConversationId();
    const now = Date.now();
    
    const conversation = {
      id: conversationId,
      title: title || this.generateDefaultTitle(),
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      modelId: modelId,
      modelType: modelType,
      messages: [],
      isActive: true,
      metadata: {
        messageCount: 0,
        totalTokens: 0,
        averageLatency: 0
      }
    };

    this.conversations.set(conversationId, conversation);
    this.addToIndex(conversation);
    this.currentConversationId = conversationId;
    
    this.saveConversations();
    return conversation;
  }

  /**
   * Cargar conversación existente
   */
  loadConversation(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      this.currentConversationId = conversationId;
      conversation.isActive = true;
      this.saveConversations();
      return conversation;
    }
    return null;
  }

  /**
   * Obtener conversación actual
   */
  getCurrentConversation() {
    if (this.currentConversationId) {
      return this.conversations.get(this.currentConversationId);
    }
    return null;
  }

  /**
   * Agregar mensaje a la conversación actual
   */
  addMessage(role, content, metadata = {}) {
    if (!this.currentConversationId) {
      // Si no hay conversación activa, crear una nueva
      this.createConversation();
    }

    const conversation = this.conversations.get(this.currentConversationId);
    if (!conversation) return false;

    const message = {
      id: this.generateMessageId(),
      role: role,
      content: content,
      timestamp: Date.now(),
      metadata: metadata
    };

    conversation.messages.push(message);
    conversation.updatedAt = Date.now();
    conversation.lastMessageAt = Date.now();
    conversation.metadata.messageCount = conversation.messages.length;

    // Actualizar metadatos
    if (metadata.tokens) {
      conversation.metadata.totalTokens += metadata.tokens;
    }
    if (metadata.latency) {
      const totalLatency = conversation.metadata.averageLatency * (conversation.messages.length - 1) + metadata.latency;
      conversation.metadata.averageLatency = totalLatency / conversation.messages.length;
    }

    // Limitar mensajes si es necesario
    if (conversation.messages.length > this.maxMessagesPerConversation) {
      conversation.messages = conversation.messages.slice(-this.maxMessagesPerConversation);
    }

    this.saveConversations();
    return message;
  }

  /**
   * Obtener todas las conversaciones ordenadas por fecha
   */
  getAllConversations(sortBy = 'lastMessageAt', order = 'desc') {
    const conversations = Array.from(this.conversations.values());
    
    return conversations.sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      return order === 'desc' ? bValue - aValue : aValue - bValue;
    });
  }

  /**
   * Buscar conversaciones
   */
  searchConversations(query, filters = {}) {
    let results = Array.from(this.conversations.values());

    // Filtro por texto
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase();
      results = results.filter(conversation => 
        conversation.title.toLowerCase().includes(searchTerm) ||
        conversation.messages.some(msg => 
          msg.content.toLowerCase().includes(searchTerm)
        )
      );
    }

    // Filtros adicionales
    if (filters.modelId) {
      results = results.filter(conv => conv.modelId === filters.modelId);
    }
    if (filters.modelType) {
      results = results.filter(conv => conv.modelType === filters.modelType);
    }
    if (filters.dateFrom) {
      results = results.filter(conv => conv.createdAt >= filters.dateFrom);
    }
    if (filters.dateTo) {
      results = results.filter(conv => conv.createdAt <= filters.dateTo);
    }

    return results.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }

  /**
   * Renombrar conversación
   */
  renameConversation(conversationId, newTitle) {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.title = newTitle.trim() || this.generateDefaultTitle();
      conversation.updatedAt = Date.now();
      this.saveConversations();
      return true;
    }
    return false;
  }

  /**
   * Eliminar conversación
   */
  deleteConversation(conversationId) {
    if (this.conversations.has(conversationId)) {
      this.conversations.delete(conversationId);
      this.removeFromIndex(conversationId);
      
      // Si era la conversación actual, limpiar
      if (this.currentConversationId === conversationId) {
        this.currentConversationId = null;
      }
      
      this.saveConversations();
      return true;
    }
    return false;
  }

  /**
   * Archivar conversación
   */
  archiveConversation(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.isActive = false;
      conversation.updatedAt = Date.now();
      this.saveConversations();
      return true;
    }
    return false;
  }

  /**
   * Exportar conversación
   */
  exportConversation(conversationId, format = 'json') {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    if (format === 'json') {
      return JSON.stringify(conversation, null, 2);
    } else if (format === 'markdown') {
      return this.conversationToMarkdown(conversation);
    } else if (format === 'txt') {
      return this.conversationToText(conversation);
    }
    return null;
  }

  /**
   * Importar conversación
   */
  importConversation(data, format = 'json') {
    try {
      let conversation;
      
      if (format === 'json') {
        conversation = JSON.parse(data);
      } else {
        throw new Error('Formato no soportado');
      }

      // Validar estructura
      if (!conversation.id || !conversation.messages) {
        throw new Error('Estructura de conversación inválida');
      }

      // Generar nuevo ID para evitar conflictos
      conversation.id = this.generateConversationId();
      conversation.importedAt = Date.now();

      this.conversations.set(conversation.id, conversation);
      this.addToIndex(conversation);
      this.saveConversations();
      
      return conversation;
    } catch (error) {
      console.error('Error importando conversación:', error);
      return null;
    }
  }

  /**
   * Limpiar conversaciones antiguas
   */
  cleanupOldConversations() {
    const conversations = this.getAllConversations('lastMessageAt', 'desc');
    
    if (conversations.length > this.maxConversations) {
      const toDelete = conversations.slice(this.maxConversations);
      toDelete.forEach(conv => {
        this.conversations.delete(conv.id);
        this.removeFromIndex(conv.id);
      });
      this.saveConversations();
    }
  }

  /**
   * Limpiar conversaciones duplicadas y vacías
   */
  cleanupDuplicateConversations() {
    const conversations = Array.from(this.conversations.values());
    const emptyConversations = conversations.filter(conv => conv.messages.length === 0);
    
    // Si hay más de una conversación vacía, eliminar las duplicadas
    if (emptyConversations.length > 1) {
      // Mantener solo la más reciente
      const sortedEmpty = emptyConversations.sort((a, b) => b.createdAt - a.createdAt);
      const toDelete = sortedEmpty.slice(1); // Eliminar todas excepto la primera
      
      toDelete.forEach(conv => {
        this.conversations.delete(conv.id);
        this.removeFromIndex(conv.id);
      });
      
      this.saveConversations();
    }
  }

  /**
   * Obtener estadísticas de conversaciones
   */
  getConversationStats() {
    const conversations = Array.from(this.conversations.values());
    
    return {
      total: conversations.length,
      active: conversations.filter(c => c.isActive).length,
      archived: conversations.filter(c => !c.isActive).length,
      totalMessages: conversations.reduce((sum, c) => sum + c.messages.length, 0),
      totalTokens: conversations.reduce((sum, c) => sum + (c.metadata.totalTokens || 0), 0),
      averageLatency: conversations.reduce((sum, c) => sum + (c.metadata.averageLatency || 0), 0) / conversations.length || 0
    };
  }

  // Métodos privados

  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateDefaultTitle() {
    const now = new Date();
    return `Conversación ${now.toLocaleDateString('es-ES')} ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  }

  addToIndex(conversation) {
    this.conversationIndex.push({
      id: conversation.id,
      title: conversation.title,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt
    });
    this.conversationIndex.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }

  removeFromIndex(conversationId) {
    this.conversationIndex = this.conversationIndex.filter(item => item.id !== conversationId);
  }

  conversationToMarkdown(conversation) {
    let markdown = `# ${conversation.title}\n\n`;
    markdown += `**Creada:** ${new Date(conversation.createdAt).toLocaleString('es-ES')}\n`;
    markdown += `**Modelo:** ${conversation.modelId || 'N/A'}\n`;
    markdown += `**Mensajes:** ${conversation.messages.length}\n\n`;
    markdown += `---\n\n`;

    conversation.messages.forEach((message, index) => {
      const timestamp = new Date(message.timestamp).toLocaleTimeString('es-ES');
      const role = message.role === 'user' ? '👤 Usuario' : '🤖 Asistente';
      
      markdown += `## ${role} - ${timestamp}\n\n`;
      markdown += `${message.content}\n\n`;
      
      if (message.metadata && Object.keys(message.metadata).length > 0) {
        markdown += `*Metadatos: ${JSON.stringify(message.metadata)}*\n\n`;
      }
    });

    return markdown;
  }

  conversationToText(conversation) {
    let text = `${conversation.title}\n`;
    text += `Creada: ${new Date(conversation.createdAt).toLocaleString('es-ES')}\n`;
    text += `Modelo: ${conversation.modelId || 'N/A'}\n`;
    text += `Mensajes: ${conversation.messages.length}\n\n`;
    text += `${'='.repeat(50)}\n\n`;

    conversation.messages.forEach((message, index) => {
      const timestamp = new Date(message.timestamp).toLocaleTimeString('es-ES');
      const role = message.role === 'user' ? 'USUARIO' : 'ASISTENTE';
      
      text += `[${timestamp}] ${role}:\n`;
      text += `${message.content}\n\n`;
    });

    return text;
  }

  loadConversations() {
    try {
      const stored = localStorage.getItem('ai-conversations-data');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Cargar conversaciones
        if (data.conversations) {
          this.conversations = new Map(data.conversations);
        }
        
        // Cargar índice
        if (data.index) {
          this.conversationIndex = data.index;
        }
        
        // Cargar conversación actual
        if (data.currentConversationId) {
          this.currentConversationId = data.currentConversationId;
        }
        
        // Limpiar duplicados después de cargar
        this.cleanupDuplicateConversations();
      }
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
      this.conversations = new Map();
      this.conversationIndex = [];
    }
  }

  saveConversations() {
    try {
      const data = {
        conversations: Array.from(this.conversations.entries()),
        index: this.conversationIndex,
        currentConversationId: this.currentConversationId,
        lastSaved: Date.now()
      };
      
      localStorage.setItem('ai-conversations-data', JSON.stringify(data));
    } catch (error) {
      console.error('Error guardando conversaciones:', error);
    }
  }
}

// Exportar instancia singleton
export const conversationService = new ConversationService();
export default conversationService;
