/**
 * SessionRecordingManager - Gestiona almacenamiento, búsqueda y recuperación de grabaciones
 * Integra con SecureStorage para cifrado de grabaciones sensibles
 */

class SessionRecordingManager {
  constructor() {
    this.secureStorage = null;
    this.recordings = new Map(); // Cache en memoria de metadata
  }

  /**
   * Inicializa el manager con SecureStorage
   */
  async initialize() {
    if (typeof window !== 'undefined' && window.electron) {
      // En renderer process, usar SecureStorage del renderer
      try {
        const { default: SecureStorage } = await import('./SecureStorage');
        this.secureStorage = new SecureStorage();
      } catch (error) {
        console.error('Error cargando SecureStorage:', error);
      }
    }
    
    // Cargar índice de grabaciones
    await this.loadRecordingsIndex();
  }

  /**
   * Guarda una grabación de forma segura
   * @param {Object} recording - Grabación completa con metadata y eventos
   * @param {boolean} encrypt - Si se debe cifrar (default: true para SSH)
   * @returns {string} recordingId
   */
  async saveRecording(recording, encrypt = true) {
    try {
      const recordingId = recording.id;
      
      // Preparar metadata para el índice
      const metadata = {
        id: recordingId,
        title: recording.metadata.title,
        host: recording.metadata.host,
        username: recording.metadata.username,
        port: recording.metadata.port,
        connectionType: recording.metadata.connectionType || 'ssh',
        useBastionWallix: recording.metadata.useBastionWallix || false,
        bastionHost: recording.metadata.bastionHost,
        bastionUser: recording.metadata.bastionUser,
        sessionName: recording.metadata.sessionName,
        startTime: recording.metadata.timestamp * 1000, // Convertir a ms
        endTime: recording.endTime,
        duration: recording.duration,
        eventCount: recording.eventCount,
        bytesRecorded: recording.bytesRecorded,
        encrypted: encrypt,
        createdAt: Date.now()
      };

      // Guardar el archivo de grabación
      const storageKey = `recording_${recordingId}`;
      
      if (encrypt && this.secureStorage) {
        // Guardar cifrado
        const recordingData = JSON.stringify(recording);
        const masterKey = await this.secureStorage.getMasterKey();
        if (masterKey) {
          const encryptedData = await this.secureStorage.encryptData(recordingData, masterKey);
          await this._saveToStorage(storageKey, encryptedData);
        } else {
          console.warn('⚠️ No hay master key, guardando sin cifrar');
          await this._saveToStorage(storageKey, recording);
          metadata.encrypted = false;
        }
      } else {
        // Guardar sin cifrar
        await this._saveToStorage(storageKey, recording);
        metadata.encrypted = false;
      }

      // Actualizar índice
      this.recordings.set(recordingId, metadata);
      await this._saveRecordingsIndex();

      console.log(`💾 Grabación guardada: ${recordingId} (${encrypt ? 'cifrada' : 'sin cifrar'})`);
      return recordingId;
    } catch (error) {
      console.error('Error guardando grabación:', error);
      throw error;
    }
  }

  /**
   * Carga una grabación por ID
   * @param {string} recordingId
   * @returns {Object} Recording completo
   */
  async loadRecording(recordingId) {
    try {
      const metadata = this.recordings.get(recordingId);
      if (!metadata) {
        throw new Error(`Grabación no encontrada: ${recordingId}`);
      }

      const storageKey = `recording_${recordingId}`;
      let recordingData = await this._loadFromStorage(storageKey);

      if (metadata.encrypted && this.secureStorage) {
        const masterKey = await this.secureStorage.getMasterKey();
        if (!masterKey) {
          throw new Error('Se requiere master key para cargar grabación cifrada');
        }
        
        const decryptedData = await this.secureStorage.decryptData(recordingData, masterKey);
        recordingData = JSON.parse(decryptedData);
      }

      console.log(`📂 Grabación cargada: ${recordingId}`);
      return recordingData;
    } catch (error) {
      console.error('Error cargando grabación:', error);
      throw error;
    }
  }

  /**
   * Elimina una grabación
   * @param {string} recordingId
   */
  async deleteRecording(recordingId) {
    try {
      const storageKey = `recording_${recordingId}`;
      await this._deleteFromStorage(storageKey);
      
      this.recordings.delete(recordingId);
      await this._saveRecordingsIndex();
      
      console.log(`🗑️ Grabación eliminada: ${recordingId}`);
    } catch (error) {
      console.error('Error eliminando grabación:', error);
      throw error;
    }
  }

  /**
   * Lista todas las grabaciones
   * @returns {Array} Array de metadata
   */
  getAllRecordings() {
    return Array.from(this.recordings.values()).sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Filtra grabaciones por host
   * @param {string} host
   * @returns {Array}
   */
  getRecordingsByHost(host) {
    return this.getAllRecordings().filter(r => r.host === host);
  }

  /**
   * Filtra grabaciones por usuario y host
   * @param {string} username
   * @param {string} host
   * @returns {Array}
   */
  getRecordingsByConnection(username, host) {
    return this.getAllRecordings().filter(
      r => r.username === username && r.host === host
    );
  }

  /**
   * Filtra grabaciones por criterios múltiples
   * @param {Object} filters
   * @returns {Array}
   */
  searchRecordings(filters = {}) {
    let results = this.getAllRecordings();

    if (filters.host) {
      results = results.filter(r => 
        r.host.toLowerCase().includes(filters.host.toLowerCase())
      );
    }

    if (filters.username) {
      results = results.filter(r => 
        r.username.toLowerCase().includes(filters.username.toLowerCase())
      );
    }

    if (filters.startDate) {
      results = results.filter(r => r.startTime >= filters.startDate);
    }

    if (filters.endDate) {
      results = results.filter(r => r.startTime <= filters.endDate);
    }

    if (filters.minDuration) {
      results = results.filter(r => r.duration >= filters.minDuration);
    }

    if (filters.maxDuration) {
      results = results.filter(r => r.duration <= filters.maxDuration);
    }

    return results;
  }

  /**
   * Obtiene estadísticas de grabaciones
   * @returns {Object}
   */
  getStats() {
    const recordings = this.getAllRecordings();
    
    return {
      total: recordings.length,
      totalDuration: recordings.reduce((sum, r) => sum + r.duration, 0),
      totalSize: recordings.reduce((sum, r) => sum + (r.bytesRecorded || 0), 0),
      byHost: this._groupBy(recordings, 'host'),
      byUsername: this._groupBy(recordings, 'username'),
      encrypted: recordings.filter(r => r.encrypted).length,
      unencrypted: recordings.filter(r => !r.encrypted).length
    };
  }

  /**
   * Exporta una grabación al formato asciicast para uso externo
   * @param {string} recordingId
   * @returns {string} Contenido asciicast
   */
  async exportToAsciicast(recordingId) {
    const recording = await this.loadRecording(recordingId);
    
    const header = {
      version: 2,
      width: recording.metadata.width,
      height: recording.metadata.height,
      timestamp: recording.metadata.timestamp,
      duration: recording.duration,
      title: recording.metadata.title,
      env: recording.metadata.env
    };

    let output = JSON.stringify(header) + '\n';
    recording.events.forEach(event => {
      output += JSON.stringify(event) + '\n';
    });

    return output;
  }

  // ============= Métodos privados de almacenamiento =============

  /**
   * Guarda datos en localStorage/IPC
   */
  async _saveToStorage(key, data) {
    if (typeof window !== 'undefined') {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data);
      localStorage.setItem(key, serialized);
    }
  }

  /**
   * Carga datos desde localStorage/IPC
   */
  async _loadFromStorage(key) {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(key);
      if (!data) return null;
      
      try {
        return JSON.parse(data);
      } catch (e) {
        // Si falla el parse, devolver como string (puede ser data cifrada)
        return data;
      }
    }
    return null;
  }

  /**
   * Elimina datos de localStorage/IPC
   */
  async _deleteFromStorage(key) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }

  /**
   * Carga el índice de grabaciones desde storage
   */
  async loadRecordingsIndex() {
    try {
      const indexData = await this._loadFromStorage('recordings_index');
      if (indexData && Array.isArray(indexData)) {
        this.recordings.clear();
        indexData.forEach(metadata => {
          this.recordings.set(metadata.id, metadata);
        });
        console.log(`📑 Índice de grabaciones cargado: ${indexData.length} entradas`);
      }
    } catch (error) {
      console.error('Error cargando índice de grabaciones:', error);
    }
  }

  /**
   * Guarda el índice de grabaciones
   */
  async _saveRecordingsIndex() {
    try {
      const indexData = Array.from(this.recordings.values());
      await this._saveToStorage('recordings_index', indexData);
    } catch (error) {
      console.error('Error guardando índice de grabaciones:', error);
    }
  }

  /**
   * Agrupa array por campo
   */
  _groupBy(array, field) {
    const grouped = {};
    array.forEach(item => {
      const key = item[field] || 'unknown';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Limpia todas las grabaciones (usar con precaución)
   */
  async clearAllRecordings() {
    const recordingIds = Array.from(this.recordings.keys());
    for (const id of recordingIds) {
      await this.deleteRecording(id);
    }
    console.log('🧹 Todas las grabaciones eliminadas');
  }
}

// Exportar para CommonJS (Node.js/Electron main process)
module.exports = SessionRecordingManager;

