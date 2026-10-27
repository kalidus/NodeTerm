/**
 * Handlers IPC de detección/instalación de plataformas terminal:
 * WSL, Cygwin embebido y Docker.
 */

const { ipcMain } = require('electron');

function safeHandle(channel, handler) {
  try {
    ipcMain.removeHandler(channel);
  } catch (_) {
    /* noop */
  }
  ipcMain.handle(channel, handler);
}

/**
 * @param {{
 *   getMainWindow: () => import('electron').BrowserWindow | null | undefined,
 *   WSL: any,
 *   Cygwin: any,
 *   getDocker: () => any
 * }} dependencies
 */
function registerPlatformTerminalHandlers(dependencies = {}) {
  const { getMainWindow, WSL, Cygwin, getDocker } = dependencies;

  let wslDetectionLogged = false;
  let wslDetectionResultLogged = false;
  let cygwinInstalling = false;

  const emitCygwinInstallProgress = (phase, current, total) => {
    try {
      const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : null;
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
        mainWindow.webContents.send('cygwin:install-progress', {
          phase,
          current,
          total,
          percent
        });
      }
    } catch (e) {
      // ignore
    }
  };

  safeHandle('detect-wsl-distributions', async () => {
    if (!wslDetectionLogged) {
      console.log('🚀 [MAIN] Detectando distribuciones WSL...');
      wslDetectionLogged = true;
    }

    try {
      const distributions = await WSL.detectAllWSLDistributions();
      if (!wslDetectionResultLogged) {
        if (process.env.DEBUG_WSL === 'true') {
          console.log('✅ [MAIN] WSL Detección:', distributions.length, 'distribuciones encontradas');
          distributions.forEach(distro => console.log(`  - ${distro.name} (${distro.label}, ${distro.category})`));
        }
        wslDetectionResultLogged = true;
      }
      return distributions;
    } catch (error) {
      console.error('❌ [MAIN] Error en detección de distribuciones WSL:', error);
      return [];
    }
  });

  safeHandle('detect-ubuntu-availability', async () => {
    try {
      const distributions = await WSL.detectAllWSLDistributions();
      return distributions;
    } catch (error) {
      console.error('❌ Error en detección de distribuciones WSL:', error);
      return [];
    }
  });

  safeHandle('cygwin:detect', async () => {
    try {
      return Cygwin.CygwinHandlers.detect();
    } catch (error) {
      console.error('❌ Error detecting Cygwin:', error);
      return { available: false, path: null, error: error.message };
    }
  });

  safeHandle('docker:list', async () => {
    try {
      const docker = typeof getDocker === 'function' ? getDocker() : null;
      if (!docker || !docker.DockerHandlers) {
        return { success: false, available: false, containers: [], error: 'Docker service not initialized' };
      }
      return docker.DockerHandlers.list();
    } catch (error) {
      console.error('❌ Error listing Docker containers:', error.message);
      return { success: false, available: false, containers: [], error: error.message };
    }
  });

  safeHandle('cygwin:install', async (_event, options = {}) => {
    if (process.platform !== 'win32') {
      return { success: false, error: 'Cygwin solo esta disponible en Windows.' };
    }

    if (cygwinInstalling) {
      return {
        success: false,
        error: 'Ya hay una instalacion de Cygwin en progreso. Espera a que termine.'
      };
    }

    try {
      cygwinInstalling = true;
      const tier = options?.tier || 'medium';
      console.log(`[Cygwin] Iniciando instalacion oficial (tier=${tier})...`);

      const {
        installCygwinPackage,
        getInstallStatus
      } = require('../services/CygwinDownloader');

      const result = await installCygwinPackage({
        tier,
        progressCallback: (phase, current, total) => {
          emitCygwinInstallProgress(phase, current, total);
        }
      });

      Cygwin.resetCygwinPaths();

      if (result.success) {
        const status = getInstallStatus();
        console.log('[Cygwin] Instalacion completada en:', status.root, 'tier:', status.tier);
        return { success: true, ...status };
      }

      return result;
    } catch (error) {
      console.error('[Cygwin] Error en cygwin:install:', error);
      return {
        success: false,
        error: error.message || String(error)
      };
    } finally {
      cygwinInstalling = false;
    }
  });

  safeHandle('cygwin:uninstall', async () => {
    if (process.platform !== 'win32') {
      return { success: false, error: 'Cygwin solo esta disponible en Windows.' };
    }

    if (cygwinInstalling) {
      return {
        success: false,
        error: 'Hay una instalacion en progreso. Espera a que termine.'
      };
    }

    try {
      if (Cygwin && Cygwin.CygwinHandlers && typeof Cygwin.CygwinHandlers.cleanupAndWait === 'function') {
        await Cygwin.CygwinHandlers.cleanupAndWait();
      } else if (Cygwin && Cygwin.CygwinHandlers) {
        Cygwin.CygwinHandlers.cleanup();
      }

      const { uninstallCygwinPackage } = require('../services/CygwinDownloader');
      const result = await uninstallCygwinPackage();
      Cygwin.resetCygwinPaths();
      return result;
    } catch (error) {
      console.error('[Cygwin] Error en cygwin:uninstall:', error);
      return {
        success: false,
        error: error.message || String(error)
      };
    }
  });

  safeHandle('cygwin:install-status', async () => {
    try {
      const { getInstallStatus } = require('../services/CygwinDownloader');
      const downloadStatus = getInstallStatus();
      const detect = Cygwin.CygwinHandlers.detect();
      return {
        success: true,
        ...downloadStatus,
        available: detect.available === true,
        path: detect.path || downloadStatus.path,
        root: detect.root || downloadStatus.root,
        installing: cygwinInstalling
      };
    } catch (error) {
      return {
        success: false,
        installed: false,
        available: false,
        error: error.message || String(error)
      };
    }
  });
}

module.exports = {
  registerPlatformTerminalHandlers
};
