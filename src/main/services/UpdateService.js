/**
 * UpdateService.js
 * 
 * Servicio de actualización automática usando electron-updater.
 * Maneja la comprobación, descarga e instalación de actualizaciones desde GitHub Releases.
 * 
 * Características:
 * - Comprobación automática periódica
 * - Comprobación manual bajo demanda
 * - Descarga en segundo plano
 * - Notificación al renderer de eventos
 * - Configuración persistente
 */

const { autoUpdater } = require('electron-updater');
const { app, BrowserWindow } = require('electron');
const log = require('electron-log');
const path = require('path');

class UpdateService {
  constructor() {
    this.mainWindow = null;
    this.checkInterval = null;
    this.updateInfo = null;
    
    // Configuración por defecto
    this.config = {
      autoCheck: true,              // Comprobar automáticamente
      checkIntervalHours: 24,       // Cada 24 horas por defecto
      autoDownload: true,           // Descargar automáticamente
      autoInstall: false,           // No instalar automáticamente (requiere confirmación)
      channel: 'latest',            // Canal: 'latest' o 'beta'
    };

    // Configurar electron-updater
    this.setupAutoUpdater();
    
    // Configurar logging
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
  }

  /**
   * Configura los eventos de autoUpdater
   */
  setupAutoUpdater() {
    // Configurar para desarrollo (permitir comprobaciones en modo dev)
    if (process.env.NODE_ENV === 'development') {
      autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
      autoUpdater.forceDevUpdateConfig = true;
    }

    // Evento: Comprobando actualizaciones
    autoUpdater.on('checking-for-update', () => {
      log.info('Comprobando actualizaciones...');
      this.sendStatusToWindow('checking-for-update');
    });

    // Evento: Actualización disponible
    autoUpdater.on('update-available', (info) => {
      log.info('Actualización disponible:', info.version);
      this.updateInfo = info;
      this.sendStatusToWindow('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        releaseName: info.releaseName,
      });
    });

    // Evento: No hay actualizaciones
    autoUpdater.on('update-not-available', (info) => {
      log.info('No hay actualizaciones disponibles. Versión actual:', info.version);
      this.sendStatusToWindow('update-not-available', {
        version: info.version,
      });
    });

    // Evento: Error durante la actualización
    autoUpdater.on('error', (err) => {
      log.error('Error en actualización:', err);
      this.sendStatusToWindow('error', {
        message: err.message || 'Error desconocido',
      });
    });

    // Evento: Progreso de descarga
    autoUpdater.on('download-progress', (progressObj) => {
      log.info(`Descargando: ${progressObj.percent.toFixed(2)}%`);
      this.sendStatusToWindow('download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    });

    // Evento: Actualización descargada
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Actualización descargada:', info.version);
      this.sendStatusToWindow('update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    });

    // Configuración de autoUpdater
    autoUpdater.autoDownload = this.config.autoDownload;
    autoUpdater.autoInstallOnAppQuit = true;
  }

  /**
   * Establece la ventana principal para enviar eventos
   */
  setMainWindow(window) {
    this.mainWindow = window;
  }

  /**
   * Envía eventos al proceso renderer
   */
  sendStatusToWindow(event, data = {}) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('updater-event', {
        event,
        data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Carga la configuración desde el almacenamiento
   */
  loadConfig(storedConfig) {
    if (storedConfig && typeof storedConfig === 'object') {
      this.config = { ...this.config, ...storedConfig };
      autoUpdater.autoDownload = this.config.autoDownload;
      log.info('Configuración de actualización cargada:', this.config);
    }
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    autoUpdater.autoDownload = this.config.autoDownload;
    log.info('Configuración de actualización actualizada:', this.config);
    return this.config;
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Comprueba manualmente si hay actualizaciones
   */
  async checkForUpdates() {
    try {
      log.info('Comprobación manual de actualizaciones iniciada');
      
      // Configurar el canal si es necesario
      if (this.config.channel === 'beta') {
        autoUpdater.allowPrerelease = true;
      } else {
        autoUpdater.allowPrerelease = false;
      }

      // En modo desarrollo, simular una comprobación
      if (process.env.NODE_ENV === 'development') {
        log.info('Modo desarrollo: simulando comprobación de actualizaciones');
        
        // Simular que no hay actualizaciones disponibles
        setTimeout(() => {
          this.sendStatusToWindow('update-not-available', {
            version: app.getVersion(),
          });
        }, 2000);
        
        return {
          success: true,
          updateInfo: null,
          message: 'Modo desarrollo: no se pueden comprobar actualizaciones reales'
        };
      }

      const result = await autoUpdater.checkForUpdates();
      return {
        success: true,
        updateInfo: result?.updateInfo || null,
      };
    } catch (error) {
      log.error('Error al comprobar actualizaciones:', error);
      
      // En modo desarrollo, mostrar mensaje más amigable
      if (process.env.NODE_ENV === 'development') {
        return {
          success: false,
          error: 'En modo desarrollo, las actualizaciones se prueban con la aplicación empaquetada',
          isDevMode: true
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Descarga la actualización manualmente
   */
  async downloadUpdate() {
    try {
      log.info('Descarga manual de actualización iniciada');
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      log.error('Error al descargar actualización:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Instala la actualización y reinicia la aplicación
   */
  quitAndInstall() {
    log.info('Instalando actualización y reiniciando...');
    autoUpdater.quitAndInstall(false, true);
  }

  /**
   * Inicia la comprobación automática periódica
   */
  startAutoCheck() {
    if (!this.config.autoCheck) {
      log.info('Comprobación automática desactivada');
      return;
    }

    // Detener cualquier intervalo existente
    this.stopAutoCheck();

    // Comprobación inicial después de 60 segundos
    setTimeout(() => {
      this.checkForUpdates();
    }, 60000);

    // Configurar intervalo periódico
    const intervalMs = this.config.checkIntervalHours * 60 * 60 * 1000;
    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, intervalMs);

    log.info(`Comprobación automática iniciada cada ${this.config.checkIntervalHours} horas`);
  }

  /**
   * Detiene la comprobación automática
   */
  stopAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      log.info('Comprobación automática detenida');
    }
  }

  /**
   * Obtiene información de la actualización actual
   */
  getUpdateInfo() {
    return {
      currentVersion: app.getVersion(),
      updateAvailable: this.updateInfo !== null,
      updateInfo: this.updateInfo,
    };
  }

  /**
   * Reinicia el servicio con nueva configuración
   */
  restart() {
    this.stopAutoCheck();
    if (this.config.autoCheck) {
      this.startAutoCheck();
    }
  }
}

// Singleton
let updateServiceInstance = null;

function getUpdateService() {
  if (!updateServiceInstance) {
    updateServiceInstance = new UpdateService();
  }
  return updateServiceInstance;
}

module.exports = {
  UpdateService,
  getUpdateService,
};

