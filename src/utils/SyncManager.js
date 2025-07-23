import NextcloudService from '../services/NextcloudService';

class SyncManager {
  constructor() {
    this.nextcloudService = new NextcloudService();
    this.syncEnabled = false;
    this.lastSyncTime = null;
    this.autoSyncInterval = null;
    this.syncInProgress = false;
    
    // Cargar configuración de sincronización
    this.loadSyncConfig();
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
    }, 5 * 60 * 1000);
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
  async syncToCloud() {
    if (!this.nextcloudService.isConfigured) {
      throw new Error('Nextcloud no está configurado');
    }

    if (this.syncInProgress) {
      throw new Error('Sincronización ya en progreso');
    }

    this.syncInProgress = true;

    try {
      // Obtener datos locales
      const localData = this.getAllLocalData();
      
      // Convertir a JSON
      const jsonData = JSON.stringify(localData, null, 2);
      
      // Subir a Nextcloud
      await this.nextcloudService.uploadFile('nodeterm-settings.json', jsonData);
      
      // Actualizar tiempo de sincronización
      this.lastSyncTime = new Date();
      this.saveSyncConfig();
      
      return {
        success: true,
        message: 'Configuración sincronizada a la nube',
        timestamp: this.lastSyncTime,
        itemsCount: Object.keys(localData).length - 2 // Excluir metadatos
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
      // Descargar datos de Nextcloud
      const jsonData = await this.nextcloudService.downloadFile('nodeterm-settings.json');
      
      if (!jsonData) {
        throw new Error('No se encontró archivo de configuración en la nube');
      }
      
      // Parse JSON
      const remoteData = JSON.parse(jsonData);
      
      // Aplicar datos localmente
      const appliedItems = this.applyRemoteData(remoteData);
      
      // Actualizar tiempo de sincronización
      this.lastSyncTime = new Date();
      this.saveSyncConfig();
      
      return {
        success: true,
        message: 'Configuración descargada desde la nube',
        timestamp: this.lastSyncTime,
        itemsCount: appliedItems.length,
        appliedItems
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