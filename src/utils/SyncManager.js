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
      
      // Cargar configuración de Nextcloud (async)
      // Nota: loadConfig ahora es async, pero no esperamos aquí para no bloquear la inicialización
      this.nextcloudService.loadConfig().catch(err => {
        console.error('Error cargando configuración Nextcloud:', err);
      });
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

    // Datos sincronizados
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
    // Asegurar que ui_theme en localStorage se sobrescriba antes de recargar temas
    if (data.uiTheme) {
      localStorage.setItem('ui_theme', data.uiTheme);
    } else {
      localStorage.setItem('ui_theme', 'Light');
    }

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
      // Aplicando temas desde configuración descargada
      
      // Debug completo del estado de localStorage
          // Logs de debug removidos para limpiar la consola
      
      // Recargar tema UI
      const uiTheme = localStorage.getItem('ui_theme');
      if (uiTheme && themeManager) {
        themeManager.applyTheme(uiTheme);
      }

      // Recargar tema de status bar
      const statusBarTheme = localStorage.getItem('basicapp_statusbar_theme');
      if (statusBarTheme && statusBarThemeManager) {
        statusBarThemeManager.applyTheme(statusBarTheme);
      }

      // Disparar evento global para notificar cambios de configuración
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settings-updated', {
          detail: { source: 'sync', timestamp: new Date().toISOString() }
        }));
      }

    } catch (error) {
      console.error('[SYNC] Error recargando temas:', error);
    }
  }

  /**
   * Cuenta recursivamente todos los secretos en el árbol de passwords
   * @param {Array} nodes - Array de nodos del árbol
   * @returns {Object} - Objeto con conteos por tipo de secreto
   */
  countAllSecretsRecursively(nodes) {
    if (!Array.isArray(nodes)) return { total: 0, byType: {} };
    
    let total = 0;
    const byType = {
      password: 0,
      crypto_wallet: 0,
      api_key: 0,
      secure_note: 0
    };
    
    const countRecursive = (nodeList) => {
      if (!Array.isArray(nodeList)) return;
      
      nodeList.forEach(node => {
        // Verificar si es un secreto (no una carpeta)
        const secretType = node.data?.type;
        const isSecret = secretType && ['password', 'crypto_wallet', 'api_key', 'secure_note'].includes(secretType);
        
        if (isSecret) {
          total++;
          if (byType[secretType] !== undefined) {
            byType[secretType]++;
          }
        }
        
        // Recursivamente contar en hijos
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          countRecursive(node.children);
        }
      });
    };
    
    countRecursive(nodes);
    return { total, byType };
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
          // treeJson obtenido de localStorage
        } else {
          console.warn('[SYNC][AUTO] No se encontró treeJson en localStorage, se subirá árbol vacío.');
          treeJson = '[]';
        }
      }
      // Subir árbol visual
      const uploadTreeResult = await this.nextcloudService.uploadFile('nodeterm-tree.json', treeJson);
      // Árbol subido a la nube
      // Obtener datos locales
      const localData = this.getAllLocalData();
      // Exportando datos locales
      // Convertir a JSON
      const jsonData = JSON.stringify(localData, null, 2);
      
      // Verificando tema UI
      // Subir configuración general a Nextcloud
      const uploadResult = await this.nextcloudService.uploadFile('nodeterm-settings.json', jsonData);
      // Configuración subida a la nube
      
      // Sincronizar sesiones cifradas si hay clave maestra
      let sessionsResult = null;
      if (this.secureStorage.hasSavedMasterKey()) {
        try {
          const sessionManager = await this.getSessionManager();
          if (sessionManager) {
            const masterKey = await this.secureStorage.getMasterKey();
            if (masterKey) {
              const encryptedSessions = await sessionManager.exportAllDataForSync(masterKey);
              // Exportando sesiones cifradas
              const sessionsJson = JSON.stringify(encryptedSessions, null, 2);
              const uploadSessionsResult = await this.nextcloudService.uploadFile('nodeterm-sessions.enc', sessionsJson);
              // Sesiones cifradas subidas a la nube
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
      
      // Sincronizar passwords cifrados si hay clave maestra
      let passwordsResult = null;
      if (this.secureStorage.hasSavedMasterKey()) {
        try {
          const masterKey = await this.secureStorage.getMasterKey();
          if (masterKey) {
            // Obtener passwords encriptados de localStorage
            const encryptedPasswordsData = localStorage.getItem('passwords_encrypted');
            if (encryptedPasswordsData) {
              // Subir passwords ya encriptados
              await this.nextcloudService.uploadFile('nodeterm-passwords.enc', encryptedPasswordsData);
              
              // Contar passwords recursivamente
              try {
                const encryptedObj = JSON.parse(encryptedPasswordsData);
                const decryptedPasswords = await this.secureStorage.decryptData(encryptedObj, masterKey);
                
                if (Array.isArray(decryptedPasswords)) {
                  const counts = this.countAllSecretsRecursively(decryptedPasswords);
                  
                  console.log('[SYNC] Secretos subidos a Nextcloud:', {
                    total: counts.total,
                    porTipo: counts.byType,
                    estructura: 'Árbol completo con carpetas y secretos'
                  });
                  
                  passwordsResult = {
                    success: true,
                    count: counts.total,
                    byType: counts.byType,
                    message: `Subidos ${counts.total} secreto(s) a Nextcloud`
                  };
                } else {
                  passwordsResult = {
                    success: true,
                    count: 0,
                    message: 'Estructura de datos inválida'
                  };
                }
              } catch (countError) {
                console.warn('Error contando passwords:', countError);
                passwordsResult = {
                  success: true,
                  count: 'unknown',
                  message: 'Subidos correctamente (error al contar)'
                };
              }
            } else {
              // No hay passwords encriptados, verificar si hay sin encriptar
              const plainPasswords = localStorage.getItem('passwordManagerNodes');
              if (plainPasswords) {
                // Encriptar y subir
                const passwordNodes = JSON.parse(plainPasswords);
                
                // Contar antes de encriptar
                const counts = this.countAllSecretsRecursively(passwordNodes);
                
                console.log('[SYNC] Secretos a subir a Nextcloud:', {
                  total: counts.total,
                  porTipo: counts.byType,
                  estructura: 'Árbol completo con carpetas y secretos'
                });
                
                const encrypted = await this.secureStorage.encryptData(passwordNodes, masterKey);
                await this.nextcloudService.uploadFile('nodeterm-passwords.enc', JSON.stringify(encrypted, null, 2));
                
                passwordsResult = {
                  success: true,
                  count: counts.total,
                  byType: counts.byType,
                  message: `Subidos ${counts.total} secreto(s) a Nextcloud`
                };
              } else {
                passwordsResult = {
                  success: true,
                  count: 0,
                  message: 'No hay passwords para sincronizar'
                };
              }
            }
          }
        } catch (error) {
          console.warn('Error sincronizando passwords cifrados:', error);
          passwordsResult = {
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
        sessions: sessionsResult,
        passwords: passwordsResult
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
                // Restaurando sesiones cifradas
                try {
                  const importResult = await sessionManager.importAllDataFromSync(encryptedSessions, masterKey);
                  // Sesiones importadas correctamente
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
      
      // Sincronizar passwords cifrados si hay clave maestra
      let passwordsResult = null;
      if (this.secureStorage.hasSavedMasterKey()) {
        try {
          const masterKey = await this.secureStorage.getMasterKey();
          if (masterKey) {
            // Intentar descargar passwords cifrados
            const passwordsData = await this.nextcloudService.downloadFile('nodeterm-passwords.enc');
            if (passwordsData) {
              // Guardar passwords encriptados en localStorage
              localStorage.setItem('passwords_encrypted', passwordsData);
              
              // Eliminar passwords sin encriptar si existen
              localStorage.removeItem('passwordManagerNodes');
              
              // Contar passwords importados recursivamente
              try {
                const encryptedObj = JSON.parse(passwordsData);
                const decryptedPasswords = await this.secureStorage.decryptData(encryptedObj, masterKey);
                
                if (Array.isArray(decryptedPasswords)) {
                  const counts = this.countAllSecretsRecursively(decryptedPasswords);
                  
                  console.log('[SYNC] Secretos descargados desde Nextcloud:', {
                    total: counts.total,
                    porTipo: counts.byType,
                    estructura: 'Árbol completo con carpetas y secretos'
                  });
                  
                  passwordsResult = {
                    success: true,
                    passwordsImported: counts.total,
                    byType: counts.byType,
                    message: `Descargados ${counts.total} secreto(s) desde Nextcloud`
                  };
                  
                  // Disparar evento para recargar passwords en el sidebar
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('passwords-synced-from-cloud', {
                      detail: { count: counts.total }
                    }));
                  }
                } else {
                  passwordsResult = {
                    success: true,
                    passwordsImported: 0,
                    message: 'Estructura de datos inválida'
                  };
                }
              } catch (countError) {
                console.warn('Error contando passwords importados:', countError);
                passwordsResult = {
                  success: true,
                  passwordsImported: 'unknown',
                  message: 'Descargados correctamente (error al contar)'
                };
              }
            } else {
              passwordsResult = {
                success: true,
                passwordsImported: 0,
                message: 'No se encontraron passwords en la nube'
              };
            }
          }
        } catch (error) {
          console.warn('Error sincronizando passwords desde la nube:', error);
          passwordsResult = {
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
        sessions: sessionsResult,
        passwords: passwordsResult
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