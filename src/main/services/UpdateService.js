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
const fs = require('fs');

class UpdateService {
  constructor() {
    this.mainWindow = null;
    this.checkInterval = null;
    this.updateInfo = null;

    this.isUpdateDownloaded = false;

    // Configuración por defecto
    this.config = {
      autoCheck: true,              // Comprobar automáticamente
      checkIntervalHours: 24,       // Cada 24 horas por defecto
      autoDownload: true,           // Descargar automáticamente
      autoInstall: false,           // Instalar automáticamente al cerrar (requiere configuración explícita)
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
    // Permitir que funcione siempre, sin importar si está empaquetado
    autoUpdater.forceDevUpdateConfig = false;
    log.info('🚀 Configurado para comprobar GitHub Releases');
    log.info('📦 Modo empaquetado:', app.isPackaged);
    log.info('🔧 NODE_ENV:', process.env.NODE_ENV || 'undefined');

    // Evento: Comprobando actualizaciones
    autoUpdater.on('checking-for-update', () => {
      log.info('Comprobando actualizaciones...');
      this.sendStatusToWindow('checking-for-update');
    });

    // Evento: Actualización disponible
    autoUpdater.on('update-available', (info) => {
      log.info('Actualización disponible:', info.version);
      this.updateInfo = info;
      this.isUpdateDownloaded = false; // Resetear flag
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
      log.error('Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
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
      this.isUpdateDownloaded = true;
      this.updateInfo = info; // Asegurar que tenemos la info
      this.sendStatusToWindow('update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    });

    // Configuración de autoUpdater
    if (process.platform === 'linux') {
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;
      log.info('🐧 Linux detectado: Auto-descarga y auto-instalación interna de actualizaciones desactivadas');
    } else {
      autoUpdater.autoDownload = this.config.autoDownload;
      autoUpdater.autoInstallOnAppQuit = this.config.autoInstall;
    }
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
      if (process.platform === 'linux') {
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = false;
      } else {
        autoUpdater.autoDownload = this.config.autoDownload;
        autoUpdater.autoInstallOnAppQuit = this.config.autoInstall;
      }
      log.info('Configuración de actualización cargada:', this.config);
    }
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (process.platform === 'linux') {
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;
    } else {
      autoUpdater.autoDownload = this.config.autoDownload;
      autoUpdater.autoInstallOnAppQuit = this.config.autoInstall;
    }
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
      log.info('=== INICIO COMPROBACIÓN DE ACTUALIZACIONES ===');
      log.info(`NODE_ENV: ${process.env.NODE_ENV}`);
      log.info(`app.isPackaged: ${app.isPackaged}`);
      log.info(`Versión actual: ${app.getVersion()}`);

      // Si ya hay una actualización descargada, notificarlo
      if (this.isUpdateDownloaded && this.updateInfo) {
        log.info('✅ Actualización ya descargada previamente:', this.updateInfo.version);
        this.sendStatusToWindow('update-downloaded', {
          version: this.updateInfo.version,
          releaseNotes: this.updateInfo.releaseNotes,
        });
        return {
          success: true,
          message: 'Actualización ya descargada'
        };
      }

      // MODO DESARROLLO: Simular respuesta
      if (!app.isPackaged) {
        log.info('🔧 MODO DESARROLLO: Simulando comprobación');

        // Enviar evento "checking" inmediatamente
        this.sendStatusToWindow('checking-for-update');

        // Simular respuesta después de 2 segundos
        setTimeout(() => {
          log.info('✅ Simulación: No hay actualizaciones disponibles');
          this.sendStatusToWindow('update-not-available', {
            version: app.getVersion(),
          });
        }, 2000);

        return {
          success: true,
          isDevMode: true,
          message: 'Modo desarrollo: simulación activada'
        };
      }

      // MODO PRODUCCIÓN: Comprobación real en GitHub Releases
      log.info('🚀 MODO PRODUCCIÓN: Comprobando GitHub Releases');

      // Limpiar caché del actualizador para que "Verificar ahora" obtenga siempre datos frescos
      const updateCacheDir = path.join(app.getPath('userData'), 'updater');
      if (fs.existsSync(updateCacheDir)) {
        try {
          fs.rmSync(updateCacheDir, { recursive: true, force: true });
          log.info('📂 Caché de actualizaciones limpiada para comprobación fresca');
        } catch (e) {
          log.warn('No se pudo limpiar caché de actualizaciones:', e.message);
        }
      }

      // Configurar el canal
      if (this.config.channel === 'beta') {
        autoUpdater.allowPrerelease = true;
        log.info('📦 Canal: Beta (prerelease habilitado)');
      } else {
        autoUpdater.allowPrerelease = false;
        log.info('📦 Canal: Stable (solo releases estables)');
      }

      // Configurar timeout de seguridad (30 segundos)
      const timeoutId = setTimeout(() => {
        log.error('⏱️ TIMEOUT: No se recibió respuesta en 30 segundos');
        this.sendStatusToWindow('error', {
          message: 'La comprobación tardó demasiado. Verifica tu conexión a internet.'
        });
      }, 30000);

      // Iniciar la comprobación real en GitHub Releases
      log.info('📡 Llamando a autoUpdater.checkForUpdates()...');

      try {
        const result = await autoUpdater.checkForUpdates();
        clearTimeout(timeoutId);
        log.info('✅ checkForUpdates completado exitosamente');
        log.info('📊 Resultado:', JSON.stringify(result?.updateInfo || {}, null, 2));
      } catch (error) {
        clearTimeout(timeoutId);
        log.error('❌ Error en checkForUpdates:', error.message);
        throw error;
      }

      return {
        success: true,
        message: 'Comprobación iniciada correctamente'
      };

    } catch (error) {
      log.error('❌ ERROR EN COMPROBACIÓN:', error.message);
      log.error('Stack:', error.stack);

      // Enviar evento de error al renderer
      this.sendStatusToWindow('error', {
        message: error.message || 'Error desconocido al comprobar actualizaciones'
      });

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
      if (process.platform === 'linux') {
        throw new Error('En Linux las actualizaciones internas están desactivadas para evitar romper los accesos directos.');
      }
      log.info('Descarga manual de actualización iniciada');

      // Configurar opciones de descarga para manejar errores de checksum
      autoUpdater.disableDifferentialDownload = true; // Deshabilitar descarga diferencial para evitar problemas de checksum

      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      log.error('Error al descargar actualización:', error);

      // Si es un error de checksum, intentar limpiar caché y reintentar
      if (error.message && error.message.includes('checksum')) {
        log.warn('Error de checksum detectado, limpiando caché y reintentando...');
        try {
          // Limpiar caché de actualizaciones
          const { app } = require('electron');
          const path = require('path');
          const fs = require('fs');

          const updateCacheDir = path.join(app.getPath('userData'), 'updater');
          if (fs.existsSync(updateCacheDir)) {
            fs.rmSync(updateCacheDir, { recursive: true, force: true });
            log.info('Caché de actualizaciones limpiado');
          }

          // Reintentar descarga
          await autoUpdater.downloadUpdate();
          return { success: true };
        } catch (retryError) {
          log.error('Error en reintento de descarga:', retryError);
          return {
            success: false,
            error: `Error de checksum persistente: ${retryError.message}`,
          };
        }
      }

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
      isUpdateDownloaded: this.isUpdateDownloaded,
      updateInfo: this.updateInfo,
      isAppImage: !!process.env.APPIMAGE,
      isLinux: process.platform === 'linux',
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

  /**
   * Limpia el caché de actualizaciones
   */
  clearUpdateCache() {
    try {
      const { app } = require('electron');
      const path = require('path');
      const fs = require('fs');

      const updateCacheDir = path.join(app.getPath('userData'), 'updater');
      if (fs.existsSync(updateCacheDir)) {
        fs.rmSync(updateCacheDir, { recursive: true, force: true });
        log.info('Caché de actualizaciones limpiado manualmente');
        this.isUpdateDownloaded = false; // Reset status
        this.updateInfo = null;
        return { success: true, message: 'Caché limpiado correctamente' };
      } else {
        log.info('No se encontró caché de actualizaciones para limpiar');
        return { success: true, message: 'No había caché que limpiar' };
      }
    } catch (error) {
      log.error('Error limpiando caché de actualizaciones:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Simula eventos para pruebas (Dev Only)
   */
  simulateEvents() {
    // Implementar si es necesario para depuración visual
  }

  /**
   * Obtiene la versión actual
   */
  getVersion() {
    return app.getVersion();
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

