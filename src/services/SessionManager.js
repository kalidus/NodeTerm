/**
 * SessionManager - Gestiona sesiones SSH/Terminal con cifrado seguro
 * Integra con SecureStorage para proteger credenciales
 */
class SessionManager {
  constructor() {
    this.secureStorage = null; // Se inicializará dinámicamente
    this.sessions = new Map();
    this.nextId = 1;
  }

  /**
   * Obtiene la instancia de SecureStorage de forma lazy
   */
  async getSecureStorage() {
    if (!this.secureStorage) {
      try {
        const { default: SecureStorage } = await import('./SecureStorage');
        this.secureStorage = new SecureStorage();
      } catch (error) {
        console.error('Error cargando SecureStorage:', error);
        throw error;
      }
    }
    return this.secureStorage;
  }

  /**
   * Inicializa el manager cargando sesiones cifradas
   */
  async initialize() {
    try {
      const secureStorage = await this.getSecureStorage();
      if (secureStorage.hasSecureSessions()) {
        const masterKey = await secureStorage.getMasterKey();
        if (masterKey) {
          const sessions = await secureStorage.loadSecureSessions();
          this.loadSessionsFromArray(sessions);
        }
      }
    } catch (error) {
      console.error('Error inicializando SessionManager:', error);
    }
  }

  /**
   * Carga sesiones desde un array
   */
  loadSessionsFromArray(sessions) {
    this.sessions.clear();
    this.nextId = 1;
    
    sessions.forEach(session => {
      this.sessions.set(session.id, session);
      if (session.id >= this.nextId) {
        this.nextId = session.id + 1;
      }
    });
  }

  /**
   * Crea una nueva sesión
   */
  createSession(sessionData) {
    const session = {
      id: this.nextId++,
      name: sessionData.name || `Sesión ${this.nextId - 1}`,
      type: sessionData.type || 'ssh', // ssh, powershell, wsl, ubuntu
      host: sessionData.host || '',
      port: sessionData.port || 22,
      username: sessionData.username || '',
      password: sessionData.password || '',
      privateKey: sessionData.privateKey || '',
      passphrase: sessionData.passphrase || '',
      jumpHost: sessionData.jumpHost || '',
      jumpPort: sessionData.jumpPort || 22,
      jumpUsername: sessionData.jumpUsername || '',
      jumpPassword: sessionData.jumpPassword || '',
      keepalive: sessionData.keepalive || false,
      compression: sessionData.compression || false,
      proxyType: sessionData.proxyType || 'none',
      proxyHost: sessionData.proxyHost || '',
      proxyPort: sessionData.proxyPort || 1080,
      proxyUsername: sessionData.proxyUsername || '',
      proxyPassword: sessionData.proxyPassword || '',
      tags: sessionData.tags || [],
      favorite: sessionData.favorite || false,
      folder: sessionData.folder || '',
      notes: sessionData.notes || '',
      color: sessionData.color || '#4CAF50',
      createdAt: new Date().toISOString(),
      lastUsed: null,
      useCount: 0
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Actualiza una sesión existente
   */
  updateSession(id, updates) {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Sesión con ID ${id} no encontrada`);
    }

    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  /**
   * Elimina una sesión
   */
  deleteSession(id) {
    return this.sessions.delete(id);
  }

  /**
   * Obtiene una sesión por ID
   */
  getSession(id) {
    return this.sessions.get(id);
  }

  /**
   * Obtiene todas las sesiones
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Busca sesiones por criterios
   */
  searchSessions(criteria) {
    const sessions = this.getAllSessions();
    
    return sessions.filter(session => {
      if (criteria.name && !session.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false;
      }
      if (criteria.type && session.type !== criteria.type) {
        return false;
      }
      if (criteria.host && !session.host.toLowerCase().includes(criteria.host.toLowerCase())) {
        return false;
      }
      if (criteria.username && !session.username.toLowerCase().includes(criteria.username.toLowerCase())) {
        return false;
      }
      if (criteria.tags && criteria.tags.length > 0) {
        const hasMatchingTag = criteria.tags.some(tag => 
          session.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }
      if (criteria.folder && session.folder !== criteria.folder) {
        return false;
      }
      if (criteria.favorite !== undefined && session.favorite !== criteria.favorite) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Registra el uso de una sesión
   */
  recordSessionUsage(id) {
    const session = this.sessions.get(id);
    if (session) {
      session.lastUsed = new Date().toISOString();
      session.useCount = (session.useCount || 0) + 1;
      this.sessions.set(id, session);
    }
  }

  /**
   * Obtiene sesiones favoritas
   */
  getFavoriteSessions() {
    return this.getAllSessions().filter(session => session.favorite);
  }

  /**
   * Obtiene sesiones usadas recientemente
   */
  getRecentSessions(limit = 10) {
    return this.getAllSessions()
      .filter(session => session.lastUsed)
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, limit);
  }

  /**
   * Obtiene sesiones por carpeta
   */
  getSessionsByFolder(folder = '') {
    return this.getAllSessions().filter(session => session.folder === folder);
  }

  /**
   * Obtiene todas las carpetas únicas
   */
  getAllFolders() {
    const folders = new Set();
    this.getAllSessions().forEach(session => {
      if (session.folder) {
        folders.add(session.folder);
      }
    });
    return Array.from(folders).sort();
  }

  /**
   * Obtiene todos los tags únicos
   */
  getAllTags() {
    const tags = new Set();
    this.getAllSessions().forEach(session => {
      session.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  /**
   * Exporta todas las sesiones para sincronización (cifrado)
   */
  async exportAllDataForSync(masterKey) {
    if (!masterKey) {
      throw new Error('Se requiere clave maestra para exportar');
    }

    const sessions = this.getAllSessions();
    const exportData = {
      sessions: sessions,
      metadata: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        totalSessions: sessions.length
      }
    };

    const secureStorage = await this.getSecureStorage();
    return await secureStorage.encryptData(exportData, masterKey);
  }

  /**
   * Importa sesiones desde datos cifrados
   */
  async importAllDataFromSync(encryptedData, masterKey) {
    if (!masterKey) {
      throw new Error('Se requiere clave maestra para importar');
    }

    try {
      const secureStorage = await this.getSecureStorage();
      const decryptedData = await secureStorage.decryptData(encryptedData, masterKey);
      
      if (decryptedData.sessions) {
        this.loadSessionsFromArray(decryptedData.sessions);
      }

      return {
        success: true,
        sessionsImported: decryptedData.sessions?.length || 0,
        metadata: decryptedData.metadata
      };
    } catch (error) {
      throw new Error(`Error importando sesiones: ${error.message}`);
    }
  }

  /**
   * Guarda todas las sesiones de forma segura
   */
  async saveSecurely() {
    try {
      const sessions = this.getAllSessions();
      const secureStorage = await this.getSecureStorage();
      await secureStorage.saveSecureSessions(sessions);
      return true;
    } catch (error) {
      console.error('Error guardando sesiones:', error);
      return false;
    }
  }

  /**
   * Duplica una sesión
   */
  duplicateSession(id) {
    const original = this.sessions.get(id);
    if (!original) {
      throw new Error(`Sesión con ID ${id} no encontrada`);
    }

    const duplicate = {
      ...original,
      id: this.nextId++,
      name: `${original.name} (Copia)`,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      useCount: 0
    };

    this.sessions.set(duplicate.id, duplicate);
    return duplicate;
  }

  /**
   * Importa sesiones desde formato legacy
   */
  importLegacySessions(legacySessions) {
    const imported = [];
    
    legacySessions.forEach(legacySession => {
      try {
        const session = this.createSession({
          name: legacySession.name,
          type: legacySession.type || 'ssh',
          host: legacySession.host,
          port: legacySession.port,
          username: legacySession.username,
          password: legacySession.password,
          // Mapear otros campos según sea necesario
        });
        imported.push(session);
      } catch (error) {
        console.error('Error importando sesión legacy:', error);
      }
    });

    return imported;
  }

  /**
   * Obtiene estadísticas de las sesiones
   */
  getSessionStats() {
    const sessions = this.getAllSessions();
    const types = {};
    
    sessions.forEach(session => {
      types[session.type] = (types[session.type] || 0) + 1;
    });

    return {
      total: sessions.length,
      favorites: sessions.filter(s => s.favorite).length,
      byType: types,
      totalFolders: this.getAllFolders().length,
      totalTags: this.getAllTags().length,
      mostUsed: sessions.reduce((max, session) => 
        (session.useCount || 0) > (max.useCount || 0) ? session : max, sessions[0]
      )
    };
  }

  /**
   * Verifica si una sesión puede conectarse (validación básica)
   */
  validateSession(session) {
    const errors = [];

    if (!session.name?.trim()) {
      errors.push('El nombre es requerido');
    }

    if (session.type === 'ssh') {
      if (!session.host?.trim()) {
        errors.push('El host es requerido para SSH');
      }
      if (!session.username?.trim()) {
        errors.push('El usuario es requerido para SSH');
      }
      if (!session.password?.trim() && !session.privateKey?.trim()) {
        errors.push('Se requiere contraseña o clave privada');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default SessionManager; 