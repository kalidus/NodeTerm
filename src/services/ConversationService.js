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
    
    // Sistema de agrupación híbrida
    this.folders = new Map(); // Carpetas personalizadas
    this.favorites = new Set(); // IDs de conversaciones favoritas
    this.tags = new Map(); // Etiquetas por conversación
    
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
      attachedFiles: [],
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

    // Si es el primer mensaje del usuario y el título es el por defecto, actualizarlo
    if (role === 'user' && conversation.messages.length === 1) {
      const newTitle = this.generateTitleFromFirstPrompt(content);
      conversation.title = newTitle;
    }

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

  // ===== SISTEMA DE AGRUPACIÓN HÍBRIDA =====

  /**
   * Obtener conversaciones agrupadas automáticamente
   */
  getGroupedConversations() {
    const allConversations = this.getAllConversations('lastMessageAt', 'desc');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const grouped = {
      recent: [], // Últimas 10 conversaciones activas
      favorites: [], // Conversaciones favoritas
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: [],
      archived: []
    };

    allConversations.forEach(conv => {
      const timeDiff = now - conv.lastMessageAt;

      // Favoritas (independiente de fecha)
      if (this.favorites.has(conv.id)) {
        grouped.favorites.push(conv);
        return;
      }

      // Archivadas
      if (!conv.isActive) {
        grouped.archived.push(conv);
        return;
      }

      // Recientes (últimas 10)
      if (grouped.recent.length < 10) {
        grouped.recent.push(conv);
      }

      // Agrupación temporal
      if (timeDiff < oneDay) {
        grouped.today.push(conv);
      } else if (timeDiff < 2 * oneDay) {
        grouped.yesterday.push(conv);
      } else if (timeDiff < oneWeek) {
        grouped.thisWeek.push(conv);
      } else if (timeDiff < oneMonth) {
        grouped.thisMonth.push(conv);
      } else {
        grouped.older.push(conv);
      }
    });

    return grouped;
  }

  /**
   * Gestión de favoritos
   */
  toggleFavorite(conversationId) {
    if (this.favorites.has(conversationId)) {
      this.favorites.delete(conversationId);
    } else {
      this.favorites.add(conversationId);
    }
    this.saveConversations();
    return this.favorites.has(conversationId);
  }

  isFavorite(conversationId) {
    return this.favorites.has(conversationId);
  }

  /**
   * Gestión de carpetas personalizadas
   */
  createFolder(name, description = '') {
    const folderId = this.generateFolderId();
    const folder = {
      id: folderId,
      name: name.trim(),
      description: description.trim(),
      createdAt: Date.now(),
      conversationIds: []
    };
    this.folders.set(folderId, folder);
    this.saveConversations();
    return folder;
  }

  deleteFolder(folderId) {
    if (this.folders.has(folderId)) {
      this.folders.delete(folderId);
      this.saveConversations();
      return true;
    }
    return false;
  }

  renameFolder(folderId, newName) {
    const folder = this.folders.get(folderId);
    if (folder) {
      folder.name = newName.trim();
      this.saveConversations();
      return true;
    }
    return false;
  }

  addConversationToFolder(conversationId, folderId) {
    const folder = this.folders.get(folderId);
    if (folder && !folder.conversationIds.includes(conversationId)) {
      folder.conversationIds.push(conversationId);
      this.saveConversations();
      return true;
    }
    return false;
  }

  removeConversationFromFolder(conversationId, folderId) {
    const folder = this.folders.get(folderId);
    if (folder) {
      folder.conversationIds = folder.conversationIds.filter(id => id !== conversationId);
      this.saveConversations();
      return true;
    }
    return false;
  }

  getFolderConversations(folderId) {
    const folder = this.folders.get(folderId);
    if (!folder) return [];

    return folder.conversationIds
      .map(id => this.conversations.get(id))
      .filter(conv => conv !== undefined)
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }

  getAllFolders() {
    return Array.from(this.folders.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Gestión de etiquetas
   */
  addTag(conversationId, tag) {
    if (!this.tags.has(conversationId)) {
      this.tags.set(conversationId, []);
    }
    const tags = this.tags.get(conversationId);
    if (!tags.includes(tag)) {
      tags.push(tag);
      this.saveConversations();
    }
    return tags;
  }

  removeTag(conversationId, tag) {
    if (this.tags.has(conversationId)) {
      const tags = this.tags.get(conversationId);
      const index = tags.indexOf(tag);
      if (index > -1) {
        tags.splice(index, 1);
        if (tags.length === 0) {
          this.tags.delete(conversationId);
        }
        this.saveConversations();
      }
    }
  }

  getConversationTags(conversationId) {
    return this.tags.get(conversationId) || [];
  }

  getAllTags() {
    const allTags = new Set();
    this.tags.forEach(tags => {
      tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  }

  /**
   * Búsqueda avanzada con filtros
   */
  advancedSearch(options = {}) {
    let results = Array.from(this.conversations.values());

    // Filtro por texto
    if (options.query && options.query.trim()) {
      const searchTerm = options.query.toLowerCase();
      results = results.filter(conversation => 
        conversation.title.toLowerCase().includes(searchTerm) ||
        conversation.messages.some(msg => 
          msg.content.toLowerCase().includes(searchTerm)
        )
      );
    }

    // Filtro por etiquetas
    if (options.tags && options.tags.length > 0) {
      results = results.filter(conversation => {
        const conversationTags = this.getConversationTags(conversation.id);
        return options.tags.some(tag => conversationTags.includes(tag));
      });
    }

    // Filtro por favoritos
    if (options.favoritesOnly) {
      results = results.filter(conversation => this.favorites.has(conversation.id));
    }

    // Filtro por carpeta
    if (options.folderId) {
      const folderConversations = this.getFolderConversations(options.folderId);
      const folderIds = folderConversations.map(conv => conv.id);
      results = results.filter(conversation => folderIds.includes(conversation.id));
    }

    // Filtro por fecha
    if (options.dateFrom) {
      results = results.filter(conv => conv.createdAt >= options.dateFrom);
    }
    if (options.dateTo) {
      results = results.filter(conv => conv.createdAt <= options.dateTo);
    }

    // Filtro por modelo
    if (options.modelId) {
      results = results.filter(conv => conv.modelId === options.modelId);
    }

    // Ordenamiento
    const sortBy = options.sortBy || 'lastMessageAt';
    const order = options.order || 'desc';
    results.sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      return order === 'desc' ? bValue - aValue : aValue - bValue;
    });

    return results;
  }

  // ===== GESTIÓN DE ARCHIVOS ADJUNTOS POR CONVERSACIÓN =====

  /**
   * Agregar archivos adjuntos a la conversación actual
   */
  addAttachedFiles(files) {
    if (!this.currentConversationId) {
      console.warn('No hay conversación activa para agregar archivos');
      return false;
    }

    const conversation = this.conversations.get(this.currentConversationId);
    if (!conversation) return false;

    // Asegurar que el array exista
    if (!conversation.attachedFiles) {
      conversation.attachedFiles = [];
    }

    // Agregar archivos nuevos, evitando duplicados por ID
    const existingIds = new Set(conversation.attachedFiles.map(f => f.id));
    files.forEach(file => {
      if (!existingIds.has(file.id)) {
        conversation.attachedFiles.push(file);
      }
    });

    conversation.updatedAt = Date.now();
    this.saveConversations();
    return true;
  }

  /**
   * Remover archivo adjunto de la conversación actual
   */
  removeAttachedFile(fileId) {
    if (!this.currentConversationId) return false;

    const conversation = this.conversations.get(this.currentConversationId);
    if (!conversation) return false;

    const initialLength = conversation.attachedFiles?.length || 0;
    conversation.attachedFiles = (conversation.attachedFiles || []).filter(f => f.id !== fileId);
    
    if (conversation.attachedFiles.length < initialLength) {
      conversation.updatedAt = Date.now();
      this.saveConversations();
      return true;
    }
    return false;
  }

  /**
   * Obtener archivos adjuntos de la conversación actual
   */
  getAttachedFiles() {
    if (!this.currentConversationId) return [];

    const conversation = this.conversations.get(this.currentConversationId);
    return conversation?.attachedFiles || [];
  }

  /**
   * Obtener archivos adjuntos de una conversación específica
   */
  getAttachedFilesForConversation(conversationId) {
    const conversation = this.conversations.get(conversationId);
    return conversation?.attachedFiles || [];
  }

  /**
   * Limpiar todos los archivos adjuntos de la conversación actual
   */
  clearAttachedFiles() {
    if (!this.currentConversationId) return false;

    const conversation = this.conversations.get(this.currentConversationId);
    if (!conversation) return false;

    conversation.attachedFiles = [];
    conversation.updatedAt = Date.now();
    this.saveConversations();
    return true;
  }

  /**
   * Reemplazar archivos adjuntos de la conversación actual
   */
  setAttachedFiles(files) {
    if (!this.currentConversationId) return false;

    const conversation = this.conversations.get(this.currentConversationId);
    if (!conversation) return false;

    conversation.attachedFiles = Array.isArray(files) ? files : [];
    conversation.updatedAt = Date.now();
    this.saveConversations();
    return true;
  }

  // Métodos privados

  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateFolderId() {
    return `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateDefaultTitle() {
    const now = new Date();
    return `Nueva conversación - ${now.toLocaleDateString('es-ES')} ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  }

  /**
   * Generar título basado en el primer prompt del usuario
   */
  generateTitleFromFirstPrompt(firstMessage) {
    if (!firstMessage || !firstMessage.trim()) {
      return this.generateDefaultTitle();
    }

    // Limpiar el mensaje: remover saltos de línea, espacios extra, y caracteres especiales
    let cleanMessage = firstMessage
      .replace(/\s+/g, ' ') // Reemplazar múltiples espacios con uno solo
      .replace(/\n+/g, ' ') // Reemplazar saltos de línea con espacios
      .trim();

    // Remover caracteres especiales al inicio y final
    cleanMessage = cleanMessage.replace(/^[^\w\s]+|[^\w\s]+$/g, '');

    // Si el mensaje está vacío después de limpiar, usar título por defecto
    if (!cleanMessage) {
      return this.generateDefaultTitle();
    }

    // Truncar a 50 caracteres máximo
    const maxLength = 50;
    if (cleanMessage.length <= maxLength) {
      return cleanMessage;
    }

    // Truncar y agregar puntos suspensivos
    return cleanMessage.substring(0, maxLength - 3) + '...';
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
          
          // Asegurar compatibilidad hacia atrás: agregar attachedFiles si no existen
          this.conversations.forEach((conversation) => {
            if (!conversation.attachedFiles) {
              conversation.attachedFiles = [];
            }
          });
        }
        
        // Cargar índice
        if (data.index) {
          this.conversationIndex = data.index;
        }
        
        // Cargar conversación actual
        if (data.currentConversationId) {
          this.currentConversationId = data.currentConversationId;
        }
        
        // Cargar carpetas
        if (data.folders) {
          this.folders = new Map(data.folders);
        }
        
        // Cargar favoritos
        if (data.favorites) {
          this.favorites = new Set(data.favorites);
        }
        
        // Cargar etiquetas
        if (data.tags) {
          this.tags = new Map(data.tags);
        }
        
        // Limpiar duplicados después de cargar
        this.cleanupDuplicateConversations();
      }
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
      this.conversations = new Map();
      this.conversationIndex = [];
      this.folders = new Map();
      this.favorites = new Set();
      this.tags = new Map();
    }
  }

  saveConversations() {
    try {
      const data = {
        conversations: Array.from(this.conversations.entries()),
        index: this.conversationIndex,
        currentConversationId: this.currentConversationId,
        folders: Array.from(this.folders.entries()),
        favorites: Array.from(this.favorites),
        tags: Array.from(this.tags.entries()),
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
