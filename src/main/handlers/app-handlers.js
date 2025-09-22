/**
 * Handlers para funcionalidades de la aplicación
 * - Recarga de ventana, DevTools, Zoom, Pantalla completa
 * - Información de versión
 * - Cierre de aplicación
 */

const { ipcMain, BrowserWindow, app } = require('electron');

/**
 * Registra todos los handlers de aplicación
 * @param {Object} dependencies - Dependencias necesarias
 * @param {BrowserWindow} dependencies.mainWindow - Ventana principal
 * @param {Function} dependencies.disconnectAllGuacamoleConnections - Función para desconectar conexiones Guacamole
 * @param {Object} dependencies.packageJson - Información del package.json
 * @param {Object} dependencies.sshConnections - Conexiones SSH activas
 * @param {Function} dependencies.cleanupOrphanedConnections - Función para limpiar conexiones
 * @param {Object} dependencies.isAppQuitting - Variable de estado de cierre
 */
function registerAppHandlers({ 
  mainWindow, 
  disconnectAllGuacamoleConnections,
  packageJson,
  sshConnections,
  cleanupOrphanedConnections,
  isAppQuitting
}) {
  
  // === HANDLERS DE INTERFAZ DE USUARIO ===
  
  // Handler para recargar la ventana
  ipcMain.handle('app:reload', () => {
    if (mainWindow) {
      mainWindow.reload();
    }
  });

  // Handler para recarga forzada (ignorando caché)
  ipcMain.handle('app:force-reload', () => {
    if (mainWindow) {
      // Intentar cerrar conexiones Guacamole antes de recargar el renderer
      try {
        // Not awaited on purpose; quick cleanup then reload
        disconnectAllGuacamoleConnections();
      } catch {}
      mainWindow.webContents.reloadIgnoringCache();
    }
  });

  // Handler para alternar DevTools
  ipcMain.handle('app:toggle-dev-tools', () => {
    if (mainWindow) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Handler para zoom in
  ipcMain.handle('app:zoom-in', () => {
    if (mainWindow) {
      const currentZoom = mainWindow.webContents.getZoomLevel();
      mainWindow.webContents.setZoomLevel(Math.min(currentZoom + 0.5, 3));
    }
  });

  // Handler para zoom out
  ipcMain.handle('app:zoom-out', () => {
    if (mainWindow) {
      const currentZoom = mainWindow.webContents.getZoomLevel();
      mainWindow.webContents.setZoomLevel(Math.max(currentZoom - 0.5, -3));
    }
  });

  // Handler para tamaño real (zoom 0)
  ipcMain.handle('app:actual-size', () => {
    if (mainWindow) {
      mainWindow.webContents.setZoomLevel(0);
    }
  });

  // Handler para alternar pantalla completa
  ipcMain.handle('app:toggle-fullscreen', () => {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  // === HANDLERS DE INFORMACIÓN Y CIERRE ===

  // IPC handler para obtener información de versión
  ipcMain.handle('get-version-info', () => {
    return {
      appVersion: packageJson.version,
      appName: packageJson.name,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      platform: process.platform,
      arch: process.arch
    };
  });

  // Permite cerrar la app desde el renderer (React) usando ipcRenderer
  ipcMain.on('app-quit', () => {
    isAppQuitting.value = true;
    
    // Close all SSH connections and clear timeouts before quitting
    Object.values(sshConnections).forEach(conn => {
      if (conn.statsTimeout) {
        clearTimeout(conn.statsTimeout);
      }
      if (conn.connection) {
        try {
          conn.connection.end();
        } catch (e) {
          // Ignore errors when closing connections
        }
      }
    });
    
    // Clear SSH connections
    Object.keys(sshConnections).forEach(key => {
      delete sshConnections[key];
    });
    
    // Cleanup orphaned connections
    cleanupOrphanedConnections(sshConnections, sshConnections);
    
    // Disconnect all Guacamole connections
    disconnectAllGuacamoleConnections();
    
    // Quit the app
    app.quit();
  });
}

module.exports = {
  registerAppHandlers
};