/**
 * Window Manager para NodeTerm
 * Maneja la creación y gestión de ventanas de Electron
 */

const { BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

// Obtener la ruta raíz del proyecto (3 niveles arriba de este archivo)
const projectRoot = path.join(__dirname, '../../../');

class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.setupWindowHandlers();
  }

  /**
   * Crea la ventana principal de la aplicación
   */
  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1600,
      height: 1000,
      minWidth: 1400,
      minHeight: 600,
      title: 'NodeTerm',
      frame: false, // Oculta la barra de título nativa para usar una personalizada
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(projectRoot, 'preload.js')
      }
    });

    this.mainWindow.loadURL(
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : url.format({
            pathname: path.join(projectRoot, 'dist/index.html'),
            protocol: 'file:',
            slashes: true
          })
    );

    // Open the DevTools in development mode
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.removeMenu();
    this.setupApplicationMenu();
  }

  /**
   * Configura el menú de la aplicación
   */
  setupApplicationMenu() {
    const isMac = process.platform === 'darwin';
    const template = [
      ...(isMac ? [{ role: 'appMenu' }] : []),
      {
        label: 'Ver',
        submenu: [
          { role: 'reload' },
          { role: 'forcereload' },
          { role: 'toggledevtools', accelerator: 'F12' },
          { type: 'separator' },
          { role: 'resetzoom' },
          { role: 'zoomin' },
          { role: 'zoomout' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  /**
   * Configura los manejadores IPC para ventanas
   */
  setupWindowHandlers() {
    // Optimización: pausar estadísticas cuando la ventana pierda el foco
    ipcMain.on('window:focus-changed', (event, isFocused) => {
      // Esta función será implementada cuando extraigamos el stats service
      console.log('Window focus changed:', isFocused);
    });

    ipcMain.handle('window:minimize', () => {
      if (this.mainWindow) this.mainWindow.minimize();
    });

    ipcMain.handle('window:maximize', () => {
      if (this.mainWindow) this.mainWindow.maximize();
    });

    ipcMain.handle('window:unmaximize', () => {
      if (this.mainWindow) this.mainWindow.unmaximize();
    });

    ipcMain.handle('window:isMaximized', () => {
      if (this.mainWindow) return this.mainWindow.isMaximized();
      return false;
    });

    ipcMain.handle('window:close', () => {
      if (this.mainWindow) this.mainWindow.close();
    });
  }

  /**
   * Obtiene la instancia de la ventana principal
   */
  getMainWindow() {
    return this.mainWindow;
  }

  /**
   * Recarga la ventana principal
   */
  reloadWindow() {
    if (this.mainWindow) {
      this.mainWindow.reload();
    }
  }

  /**
   * Recarga la ventana principal ignorando caché
   */
  forceReloadWindow() {
    if (this.mainWindow) {
      this.mainWindow.webContents.reloadIgnoringCache();
    }
  }

  /**
   * Alterna las herramientas de desarrollo
   */
  toggleDevTools() {
    if (this.mainWindow) {
      if (this.mainWindow.webContents.isDevToolsOpened()) {
        this.mainWindow.webContents.closeDevTools();
      } else {
        this.mainWindow.webContents.openDevTools();
      }
    }
  }

  /**
   * Aumenta el zoom de la ventana
   */
  zoomIn() {
    if (this.mainWindow) {
      const currentZoom = this.mainWindow.webContents.getZoomLevel();
      this.mainWindow.webContents.setZoomLevel(Math.min(currentZoom + 0.5, 3));
    }
  }

  /**
   * Disminuye el zoom de la ventana
   */
  zoomOut() {
    if (this.mainWindow) {
      const currentZoom = this.mainWindow.webContents.getZoomLevel();
      this.mainWindow.webContents.setZoomLevel(Math.max(currentZoom - 0.5, -3));
    }
  }

  /**
   * Restablece el zoom de la ventana
   */
  actualSize() {
    if (this.mainWindow) {
      this.mainWindow.webContents.setZoomLevel(0);
    }
  }

  /**
   * Alterna el modo de pantalla completa
   */
  toggleFullscreen() {
    if (this.mainWindow) {
      this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
    }
  }
}

module.exports = WindowManager;
