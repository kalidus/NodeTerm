import NextcloudService from '../services/NextcloudService';
import SecureStorage from '../services/SecureStorage';
// Importar SessionManager directamente
import SessionManager from '../services/SessionManager';
// Importar theme managers para recargar temas tras sincronización
import { themeManager } from './themeManager';
import { statusBarThemeManager } from './statusBarThemeManager';

class SyncManager {
  constructor(sessionManager) {
    this.nextcloudService = new NextcloudService();
    this.secureStorage = new SecureStorage();
    this.sessionManager = sessionManager || null; // Usar la instancia pasada
    this.syncEnabled = false;
    this.lastSyncTime = null;
    this.autoSyncInterval = null;
    this.syncInProgress = false;
    this.autoSyncIntervalMinutes = 5; // Intervalo por defecto: 5 minutos
    
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
        this.autoSyncIntervalMinutes = parsed.autoSyncIntervalMinutes || 5; // Cargar intervalo configurado
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
      lastSyncTime: this.lastSyncTime?.toISOString(),
      autoSyncIntervalMinutes: this.autoSyncIntervalMinutes
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

    // Sincronizar según el intervalo configurado
    const intervalMs = this.autoSyncIntervalMinutes * 60 * 1000;
    this.autoSyncInterval = setInterval(() => {
      if (this.syncEnabled && !this.syncInProgress) {
        this.syncToCloud().catch(error => {
          console.error('Error en sincronización automática:', error);
        });
      }
      this.lastSyncTime = new Date();
      this.saveSyncConfig();
    }, intervalMs);
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
   * Configura el intervalo de sincronización automática
   */
  setAutoSyncInterval(minutes) {
    if (minutes < 1 || minutes > 1440) { // Entre 1 minuto y 24 horas
      throw new Error('El intervalo debe estar entre 1 minuto y 24 horas');
    }
    
    this.autoSyncIntervalMinutes = minutes;
    this.saveSyncConfig();
    
    // Si la sincronización automática está habilitada, reiniciar con el nuevo intervalo
    if (this.syncEnabled) {
      this.startAutoSync();
    }
  }

  /**
   * Obtiene el intervalo de sincronización actual
   */
  getAutoSyncInterval() {
    return this.autoSyncIntervalMinutes;
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
      
      // Configuraciones de UI - CORREGIR KEYS
      uiTheme: localStorage.getItem('ui_theme'),  // Cambiar de 'basicapp_ui_theme' a 'ui_theme'
      statusBarTheme: localStorage.getItem('basicapp_statusbar_theme'),
      terminalTheme: localStorage.getItem('basicapp_terminal_theme'),
      iconTheme: localStorage.getItem('iconTheme'),  // Cambiar de 'basicapp_icon_theme' a 'iconTheme'
      explorerFont: localStorage.getItem('explorerFont'),  // Cambiar de 'basicapp_explorer_font' a 'explorerFont'
      explorerFontSize: localStorage.getItem('explorerFontSize'),  // Cambiar de 'basicapp_explorer_font_size' a 'explorerFontSize'
      explorerColorTheme: localStorage.getItem('explorerColorTheme'),  // Cambiar de 'basicapp_explorer_color_theme' a 'explorerColorTheme'
      sidebarFont: localStorage.getItem('sidebarFont'),  // Cambiar de 'basicapp_sidebar_font' a 'sidebarFont'
      sidebarFontSize: localStorage.getItem('sidebarFontSize'),  // Cambiar de 'basicapp_sidebar_font_size' a 'sidebarFontSize'
      statusBarIconTheme: localStorage.getItem('basicapp_statusbar_icon_theme'),
      statusBarPollingInterval: localStorage.getItem('statusBarPollingInterval'),  // Cambiar de 'basicapp_statusbar_polling_interval' a 'statusBarPollingInterval'
      
      // Historial de conexiones
      connectionHistory: localStorage.getItem('nodeterm_connection_history'),
      favoriteConnections: localStorage.getItem('nodeterm_favorite_connections'),
      
      // Metadatos de sincronización
      syncTimestamp: new Date().toISOString(),
      version: '1.0'
    };

    // Filtrar valores null/undefined y strings "undefined"
    Object.keys(data).forEach(key => {
      if (data[key] === null || data[key] === undefined || data[key] === 'undefined') {
        delete data[key];
      }
    });

    console.log('[SYNC] Datos a sincronizar:', Object.keys(data).filter(k => k !== 'syncTimestamp' && k !== 'version').length, 'elementos');
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
    // --- LOG: Mostrar el valor de uiTheme recibido ---
    if (data.uiTheme) {
      console.log('[SYNC][applyRemoteData] Valor de uiTheme recibido del JSON:', data.uiTheme);
    } else {
      console.log('[SYNC][applyRemoteData] No se recibió uiTheme en el JSON, se usará "Light" por defecto.');
    }
    // --- FIN LOG ---

    // --- Asegurar que ui_theme en localStorage se sobrescriba antes de recargar temas ---
    if (data.uiTheme) {
      localStorage.setItem('ui_theme', data.uiTheme);
      console.log('[SYNC][applyRemoteData] localStorage["ui_theme"] actualizado a:', data.uiTheme);
    } else {
      localStorage.setItem('ui_theme', 'Light');
      console.log('[SYNC][applyRemoteData] localStorage["ui_theme"] actualizado a valor por defecto: Light');
    }
    // --- FIN ---

    Object.keys(data).forEach(key => {
      if (key === 'syncTimestamp' || key === 'version' || key === 'uiTheme') return; // Skip metadata y uiTheme (ya lo pusimos)
      if (data[key] !== null && data[key] !== undefined) {
        localStorage.setItem(key, data[key]);
        applied.push(key);
      }
    });

    // Recargar temas después de aplicar los datos
    this.reloadThemesFromStorage();

    return applied;
  }

  /**
   * Recarga todos los temas desde localStorage
   */
  reloadThemesFromStorage() {
    try {
      console.log('[SYNC] Aplicando temas desde configuración descargada...');
      
      // Debug completo del estado de localStorage
          // Logs de debug removidos para limpiar la consola
      
      // Recargar tema UI
      const uiTheme = localStorage.getItem('ui_theme');  // Cambiar de 'basicapp_ui_theme' a 'ui_theme'
      if (uiTheme && themeManager) {
        console.log('[SYNC] [TEST] Aplicando tema UI:', uiTheme);
        console.log('[SYNC] [TEST] themeManager antes:', themeManager.getCurrentTheme());
        
        // Verificar si el tema existe
        const availableThemes = themeManager.getAvailableThemes();
            // Logs de debug removidos para limpiar la consola
        
        themeManager.applyTheme(uiTheme);
        
        console.log('[SYNC] [TEST] themeManager después:', themeManager.getCurrentTheme());
        
        // Verificar si se aplicaron las variables CSS
        const rootStyles = getComputedStyle(document.documentElement);
            // Logs de debug removidos para limpiar la consola
        
        console.log('[SYNC] ✓ Tema UI:', uiTheme);
      } else {
        // Log de debug removido para limpiar la consola
      }

      // Recargar tema de status bar
      const statusBarTheme = localStorage.getItem('basicapp_statusbar_theme');
      if (statusBarTheme && statusBarThemeManager) {
        statusBarThemeManager.applyTheme(statusBarTheme);
        console.log('[SYNC] ✓ Tema status bar:', statusBarTheme);
      }

      // Disparar evento global para notificar cambios de configuración
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settings-updated', {
          detail: { source: 'sync', timestamp: new Date().toISOString() }
        }));
        console.log('[SYNC] ✓ Evento global de actualización disparado');
      }

    } catch (error) {
      console.error('[SYNC] Error recargando temas:', error);
    }
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
      
      // Log específico para ver qué tema se está subiendo
      console.log('[SYNC] [CRITICAL] Tema UI que se está subiendo:', localData.uiTheme);
      console.log('[SYNC] [CRITICAL] localStorage.getItem("ui_theme") EN ESTE MOMENTO:', localStorage.getItem('ui_theme'));
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
      
      // Aplicar datos localmente (esto ya incluye la recarga de temas)
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
      autoSyncActive: this.autoSyncInterval !== null,
      autoSyncIntervalMinutes: this.autoSyncIntervalMinutes
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