import NextcloudService from '../services/NextcloudService';
import SecureStorage from '../services/SecureStorage';
// Importar SessionManager directamente
import SessionManager from '../services/SessionManager';

class SyncManager {
  constructor(sessionManager) {
    this.nextcloudService = new NextcloudService();
    this.secureStorage = new SecureStorage();
    this.sessionManager = sessionManager || null; // Usar la instancia pasada
    this.syncEnabled = false;
    this.lastSyncTime = null;
    this.autoSyncInterval = null;
    this.syncInProgress = false;
    
    // Cargar configuración de sincronización
    this.loadSyncConfig();
  }

  /**
   * Obtiene la instancia de SessionManager pasada por el constructor
   */
  async getSessionManager() {
    if (this.sessionManager) {
      return this.sessionManager;
    }
    // Si no se pasó, crear una nueva (solo para compatibilidad, pero debe pasarse siempre)
    this.sessionManager = new SessionManager();
    await this.sessionManager.initialize();
    return this.sessionManager;
  }

  /**
   * Carga la configuración de sincronización
   */
  loadSyncConfig() {
    try {
      const config = localStorage.getItem('nodeterm_sync_config');
      if (config) {
        const parsed = JSON.parse(config);
        this.syncEnabled = parsed.syncEnabled || false;
        this.lastSyncTime = parsed.lastSyncTime ? new Date(parsed.lastSyncTime) : null;
      }
      
      // Cargar configuración de Nextcloud
      this.nextcloudService.loadConfig();
    } catch (error) {
      console.error('Error cargando configuración de sincronización:', error);
    }
  }

  /**
   * Guarda la configuración de sincronización
   */
  saveSyncConfig() {
    const config = {
      syncEnabled: this.syncEnabled,
      lastSyncTime: this.lastSyncTime?.toISOString()
    };
    localStorage.setItem('nodeterm_sync_config', JSON.stringify(config));
  }

  /**
   * Habilita o deshabilita la sincronización
   */
  setSyncEnabled(enabled) {
    this.syncEnabled = enabled;
    this.saveSyncConfig();

    if (enabled) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  /**
   * Inicia la sincronización automática
   */
  startAutoSync() {
    this.stopAutoSync(); // Detener cualquier intervalo existente

    // Sincronizar cada 5 minutos
    this.autoSyncInterval = setInterval(() => {
      if (this.syncEnabled && !this.syncInProgress) {
        this.syncToCloud().catch(error => {
          console.error('Error en sincronización automática:', error);
        });
      }
      this.lastSyncTime = new Date();
      this.saveSyncConfig();
    }, 5 * 60 * 1000); // 5 minutos
  }

  /**
   * Detiene la sincronización automática
   */
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  /**
   * Obtiene todos los datos locales que deben sincronizarse
   */
  getAllLocalData() {
    const data = {
      // Configuraciones de terminal
      statusBarHeight: localStorage.getItem('basicapp_statusbar_height'),
      localFontFamily: localStorage.getItem('basicapp_local_terminal_font_family'),
      localFontSize: localStorage.getItem('basicapp_local_terminal_font_size'),
      localPowerShellTheme: localStorage.getItem('basicapp_local_powershell_theme'),
      localLinuxTerminalTheme: localStorage.getItem('basicapp_local_linux_terminal_theme'),
      
      // Configuraciones de UI (buscar todas las keys que empiecen con basicapp_)
      uiTheme: localStorage.getItem('basicapp_ui_theme'),
      statusBarTheme: localStorage.getItem('basicapp_statusbar_theme'),
      terminalTheme: localStorage.getItem('basicapp_terminal_theme'),
      iconTheme: localStorage.getItem('basicapp_icon_theme'),
      explorerFont: localStorage.getItem('basicapp_explorer_font'),
      explorerFontSize: localStorage.getItem('basicapp_explorer_font_size'),
      explorerColorTheme: localStorage.getItem('basicapp_explorer_color_theme'),
      sidebarFont: localStorage.getItem('basicapp_sidebar_font'),
      sidebarFontSize: localStorage.getItem('basicapp_sidebar_font_size'),
      statusBarIconTheme: localStorage.getItem('basicapp_statusbar_icon_theme'),
      statusBarPollingInterval: localStorage.getItem('basicapp_statusbar_polling_interval'),
      
      // Historial de conexiones
      connectionHistory: localStorage.getItem('nodeterm_connection_history'),
      favoriteConnections: localStorage.getItem('nodeterm_favorite_connections'),
      
      // Metadatos de sincronización
      syncTimestamp: new Date().toISOString(),
      version: '1.0'
    };

    // Filtrar valores null/undefined
    Object.keys(data).forEach(key => {
      if (data[key] === null || data[key] === undefined) {
        delete data[key];
      }
    });

    return data;
  }

  /**
   * Aplica datos sincronizados a localStorage
   */
  applyRemoteData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Datos remotos inválidos');
    }

    const applied = [];
    
    Object.keys(data).forEach(key => {
      if (key === 'syncTimestamp' || key === 'version') return; // Skip metadata
      
      if (data[key] !== null && data[key] !== undefined) {
        localStorage.setItem(key, data[key]);
        applied.push(key);
      }
    });

    return applied;
  }

  /**
   * Sincroniza datos locales a la nube
   */
  async syncToCloud(treeJson) {
    if (!this.nextcloudService.isConfigured) {
      throw new Error('Nextcloud no está configurado');
    }

    if (this.syncInProgress) {
      throw new Error('Sincronización ya en progreso');
    }

    this.syncInProgress = true;

    try {
      // Si no se pasa treeJson, obtenerlo de localStorage
      if (!treeJson) {
        const localTree = localStorage.getItem('basicapp2_tree_data');
        if (localTree) {
          treeJson = localTree;
          console.log('[SYNC][AUTO] treeJson obtenido de localStorage:', treeJson);
        } else {
          console.warn('[SYNC][AUTO] No se encontró treeJson en localStorage, se subirá árbol vacío.');
          treeJson = '[]';
        }
      }
      // Subir árbol visual
      const uploadTreeResult = await this.nextcloudService.uploadFile('nodeterm-tree.json', treeJson);
      console.log('[SYNC] Resultado upload nodeterm-tree.json:', uploadTreeResult);
      // Obtener datos locales
      const localData = this.getAllLocalData();
      console.log('[SYNC] Exportando localData:', localData);
      // Convertir a JSON
      const jsonData = JSON.stringify(localData, null, 2);
      // Subir configuración general a Nextcloud
      const uploadResult = await this.nextcloudService.uploadFile('nodeterm-settings.json', jsonData);
      console.log('[SYNC] Resultado upload nodeterm-settings.json:', uploadResult);
      
      // Sincronizar sesiones cifradas si hay clave maestra
      let sessionsResult = null;
      if (this.secureStorage.hasSavedMasterKey()) {
        try {
          const sessionManager = await this.getSessionManager();
          if (sessionManager) {
            const masterKey = await this.secureStorage.getMasterKey();
            if (masterKey) {
              const encryptedSessions = await sessionManager.exportAllDataForSync(masterKey);
              console.log('[SYNC] Exportando encryptedSessions:', encryptedSessions);
              const sessionsJson = JSON.stringify(encryptedSessions, null, 2);
              const uploadSessionsResult = await this.nextcloudService.uploadFile('nodeterm-sessions.enc', sessionsJson);
              console.log('[SYNC] Resultado upload nodeterm-sessions.enc:', uploadSessionsResult);
              sessionsResult = {
                success: true,
                count: sessionManager.getAllSessions().length
              };
            }
          } else {
            sessionsResult = {
              success: false,
              error: 'No se pudo cargar SessionManager'
            };
          }
        } catch (error) {
          console.warn('Error sincronizando sesiones cifradas:', error);
          sessionsResult = {
            success: false,
            error: error.message
          };
        }
      }
      
      // Actualizar tiempo de sincronización
      this.lastSyncTime = new Date();
      this.saveSyncConfig();
      
      return {
        success: true,
        message: 'Datos sincronizados a la nube',
        timestamp: this.lastSyncTime,
        itemsCount: Object.keys(localData).length - 2, // Excluir metadatos
        sessions: sessionsResult
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sincroniza datos desde la nube
   */
  async syncFromCloud() {
    if (!this.nextcloudService.isConfigured) {
      throw new Error('Nextcloud no está configurado');
    }

    if (this.syncInProgress) {
      throw new Error('Sincronización ya en progreso');
    }

    this.syncInProgress = true;

    try {
      // Descargar configuración general
      const jsonData = await this.nextcloudService.downloadFile('nodeterm-settings.json');
      
      if (!jsonData) {
        throw new Error('No se encontró archivo de configuración en la nube');
      }
      
      // Parse JSON
      const remoteData = JSON.parse(jsonData);
      
      // Aplicar datos localmente
      const appliedItems = this.applyRemoteData(remoteData);

      // Sincronizar sesiones cifradas si hay clave maestra
      let sessionsResult = null;
      if (this.secureStorage.hasSavedMasterKey()) {
        try {
          const sessionManager = await this.getSessionManager();
          if (sessionManager) {
            const masterKey = await this.secureStorage.getMasterKey();
            if (masterKey) {
              // Intentar descargar sesiones cifradas
              const sessionsData = await this.nextcloudService.downloadFile('nodeterm-sessions.enc');
              if (sessionsData) {
                const encryptedSessions = JSON.parse(sessionsData);
                console.log('[SYNC] Restaurando sesiones: encryptedSessions=', encryptedSessions, 'masterKey:', masterKey);
                try {
                  const importResult = await sessionManager.importAllDataFromSync(encryptedSessions, masterKey);
                  console.log('[SYNC] Resultado de importAllDataFromSync:', importResult);
                  sessionsResult = {
                    success: true,
                    sessionsImported: importResult.sessionsImported,
                    metadata: importResult.metadata
                  };
                } catch (error) {
                  console.error('[SYNC] Error en importAllDataFromSync:', error);
                  sessionsResult = {
                    success: false,
                    error: error.message
                  };
                }
              }
            }
          } else {
            sessionsResult = {
              success: false,
              error: 'No se pudo cargar SessionManager'
            };
          }
        } catch (error) {
          console.warn('Error sincronizando sesiones desde la nube:', error);
          sessionsResult = {
            success: false,
            error: error.message
          };
        }
      }
      
      // Actualizar tiempo de sincronización
      this.lastSyncTime = new Date();
      this.saveSyncConfig();
      
      return {
        success: true,
        message: 'Datos descargados desde la nube',
        timestamp: this.lastSyncTime,
        itemsCount: appliedItems.length,
        appliedItems,
        sessions: sessionsResult
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sincronización bidireccional inteligente
   */
  async smartSync() {
    if (!this.nextcloudService.isConfigured) {
      throw new Error('Nextcloud no está configurado');
    }

    try {
      // Obtener información del archivo remoto
      const remoteFileInfo = await this.nextcloudService.getFileInfo('nodeterm-settings.json');
      
      if (!remoteFileInfo) {
        // No hay archivo remoto, subir datos locales
        return await this.syncToCloud();
      }
      
      // Comparar fechas de modificación
      const localLastModified = this.lastSyncTime || new Date(0);
      const remoteLastModified = remoteFileInfo.lastModified;
      
      if (remoteLastModified > localLastModified) {
        // Archivo remoto es más reciente, descargar
        return await this.syncFromCloud();
      } else {
        // Datos locales son más recientes o iguales, subir
        return await this.syncToCloud();
      }
    } catch (error) {
      console.error('Error en sincronización inteligente:', error);
      throw error;
    }
  }

  /**
   * Obtiene el estado de la sincronización
   */
  getSyncStatus() {
    return {
      enabled: this.syncEnabled,
      configured: this.nextcloudService.isConfigured,
      lastSync: this.lastSyncTime,
      inProgress: this.syncInProgress,
      autoSyncActive: this.autoSyncInterval !== null
    };
  }

  /**
   * Obtiene estadísticas de sincronización
   */
  async getSyncStats() {
    if (!this.nextcloudService.isConfigured) {
      return null;
    }

    try {
      const files = await this.nextcloudService.listFiles();
      const settingsFile = await this.nextcloudService.getFileInfo('nodeterm-settings.json');
      
      return {
        totalFiles: files.length,
        settingsFileExists: !!settingsFile,
        settingsFileSize: settingsFile?.size || 0,
        settingsLastModified: settingsFile?.lastModified
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }

  /**
   * Limpia todos los datos de sincronización
   */
  clearSyncData() {
    this.stopAutoSync();
    this.syncEnabled = false;
    this.lastSyncTime = null;
    localStorage.removeItem('nodeterm_sync_config');
    this.nextcloudService.clearConfig();
  }
}

export default SyncManager;