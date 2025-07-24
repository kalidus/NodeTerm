/**
 * SessionManagerSimple - Versión simplificada para testing
 */
class SessionManagerSimple {
  constructor() {
    console.log('SessionManagerSimple constructor ejecutado');
    this.sessions = new Map();
    this.nextId = 1;
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  async exportAllDataForSync(masterKey) {
    console.log('Exportando con clave:', masterKey ? 'definida' : 'undefined');
    
    const sessions = this.getAllSessions();
    const exportData = {
      sessions: sessions,
      metadata: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        totalSessions: sessions.length
      }
    };

    // Simulación de cifrado (sin SecureStorage por ahora)
    return {
      encrypted: true,
      data: JSON.stringify(exportData),
      timestamp: Date.now()
    };
  }

  async importAllDataFromSync(encryptedData, masterKey) {
    console.log('Importando datos cifrados');
    
    try {
      // Simulación de descifrado
      const data = JSON.parse(encryptedData.data || '{"sessions":[]}');
      
      return {
        success: true,
        sessionsImported: data.sessions?.length || 0,
        metadata: data.metadata
      };
    } catch (error) {
      throw new Error(`Error importando sesiones: ${error.message}`);
    }
  }
}

export default SessionManagerSimple; 