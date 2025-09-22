const { ipcMain, BrowserWindow } = require('electron');

/**
 * Handlers para funcionalidades de la aplicación
 * - Recarga de ventana
 * - DevTools
 * - Zoom
 * - Pantalla completa
 */

/**
 * Registra todos los handlers de aplicación
 * @param {Object} dependencies - Dependencias necesarias
 * @param {BrowserWindow} dependencies.mainWindow - Ventana principal
 * @param {Function} dependencies.disconnectAllGuacamoleConnections - Función para desconectar conexiones Guacamole
 */
function registerAppHandlers({ mainWindow, disconnectAllGuacamoleConnections }) {
  
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
}

module.exports = {
  registerAppHandlers
};
