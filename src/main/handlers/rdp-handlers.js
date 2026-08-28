/**
 * Handlers para conexiones RDP (Remote Desktop Protocol)
 * 
 * 🚀 OPTIMIZACIÓN: Los handlers de RDP no son críticos para el arranque
 * Se registran de forma diferida con el resto de handlers secundarios
 */

const { ipcMain } = require('electron');

// Lazy loading de RdpManager
let RdpManager = null;
let rdpManager = null;

function getRdpManager() {
  if (!rdpManager) {
    if (!RdpManager) {
      RdpManager = require('../../utils/RdpManager');
    }
    rdpManager = new RdpManager();
  }
  return rdpManager;
}

/**
 * Registra los handlers de RDP
 */
function registerRdpHandlers(dependencies) {
  const { sendToRenderer } = dependencies;
  
  // === RDP Connection Handlers ===
  ipcMain.handle('rdp:connect', async (event, config) => {
    try {
      const connectionId = await getRdpManager().connect(config);
      
      // Setup process handlers for events
      const connection = getRdpManager().activeConnections.get(connectionId);
      if (connection) {
        getRdpManager().setupProcessHandlers(
          connection.process,
          connectionId,
          (connectionId) => {
            // On connect
            sendToRenderer(event.sender, 'rdp:connected', { connectionId });
          },
          (connectionId) => {
            // On disconnect
            sendToRenderer(event.sender, 'rdp:disconnected', { connectionId });
          },
          (connectionId, error) => {
            // On error
            sendToRenderer(event.sender, 'rdp:error', { connectionId, error });
          }
        );
      }
      
      return {
        success: true,
        connectionId,
        timestamp: connection?.timestamp,
        server: connection?.server,
        port: connection?.port,
        username: connection?.username
      };
    } catch (error) {
      console.error('❌ [RDP] Error conectando:', error);
      return {
        success: false,
        error: error?.message || 'Error desconocido al conectar'
      };
    }
  });
  
  ipcMain.handle('rdp:disconnect', async (event, connectionId) => {
    return getRdpManager().disconnect(connectionId);
  });
  
  ipcMain.handle('rdp:disconnect-all', async (event) => {
    return getRdpManager().disconnectAll();
  });
  
  ipcMain.handle('rdp:get-active-connections', async (event) => {
    return getRdpManager().getActiveConnections();
  });
  
  ipcMain.handle('rdp:get-presets', async (event) => {
    return getRdpManager().getPresets();
  });
  
  // Handler para mostrar ventana RDP si está minimizada
  ipcMain.handle('rdp:show-window', async (event, { server }) => {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      if (process.platform === 'win32') {
        // Intentar restaurar la ventana de mstsc.exe usando PowerShell
        const psCommand = `
          $windows = Get-Process mstsc -ErrorAction SilentlyContinue | Select-Object -ExpandProperty MainWindowHandle;
          foreach ($hwnd in $windows) {
            $signature = '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);';
            $ShowWindow = Add-Type -MemberDefinition $signature -Name Win32ShowWindow -Namespace Win32Functions -PassThru;
            $ShowWindow::ShowWindow($hwnd, 9);
            $ShowWindow::SetForegroundWindow($hwnd);
          }
        `;
        
        await execPromise(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
        return { success: true };
      }
      return { success: false, error: 'Solo soportado en Windows' };
    } catch (error) {
      console.error('❌ [RDP] Error mostrando ventana:', error);
      return { success: false, error: error?.message || 'Error desconocido' };
    }
  });
  
  // Handler para desconectar sesión RDP específica
  ipcMain.handle('rdp:disconnect-session', async (event, { server }) => {
    try {
      // Buscar y terminar procesos mstsc.exe que coincidan con el servidor
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        
        // Terminar procesos mstsc.exe
        await execPromise('taskkill /F /IM mstsc.exe /T');
        return { success: true };
      }
      return { success: false, error: 'Solo soportado en Windows' };
    } catch (error) {
      console.error('❌ [RDP] Error desconectando sesión:', error);
      return { success: false, error: error?.message || 'Error desconocido' };
    }
  });
  
  // Handler para RDP Web HTML5 Nativo (Sin guacd/WSL/Docker)
  ipcMain.handle('rdp:create-native-bridge-token', async (event, config) => {
    try {
      const rdpNativeBridgeService = require('../services/RdpNativeBridgeService');
      const { probeSelectedProtocol } = require('../services/rdp-nego-probe');
      await rdpNativeBridgeService.initialize();

      const host = config?.hostname || config?.server || config?.host;
      const port = config?.port || 3389;
      const username = config?.username || config?.user || 'nodeterm';

      let nego = null;
      try {
        nego = await probeSelectedProtocol({ host, port, username });
        console.log(`[RDP Native Bridge] Preflight X.224 ${host}:${port} -> ${nego.protocolLabel}${nego.error ? ` (${nego.error})` : ''}`);
      } catch (probeErr) {
        console.warn('[RDP Native Bridge] Preflight X.224 fallo:', probeErr?.message || probeErr);
      }

      const sessionInfo = rdpNativeBridgeService.createSessionToken(config);
      console.log('🚀 [RDP Native Bridge] Token creado para RDP Web Nativo (Sin guacd/WSL):', sessionInfo.tokenId);
      return {
        success: true,
        wsUrl: sessionInfo.wsUrl,
        tokenId: sessionInfo.tokenId,
        port: sessionInfo.port,
        selectedProtocol: nego && nego.ok ? nego.selectedProtocol : null,
        protocolLabel: nego ? nego.protocolLabel : null,
        negoOk: !!(nego && nego.ok)
      };
    } catch (error) {
      console.error('❌ [RDP Native Bridge] Error creando token:', error);
      return {
        success: false,
        error: error?.message || 'Error al iniciar puente RDP nativo'
      };
    }
  });

  // Handler para guardar PDFs de trabajos de impresión RDP redirigidos
  ipcMain.handle('rdp:save-print-pdf', async (event, { filename, data }) => {
    try {
      const { app, shell } = require('electron');
      const fs = require('fs').promises;
      const path = require('path');
      const downloadsDir = app.getPath('downloads');
      const safeName = filename || `nodeterm-rdp-print-${Date.now()}.pdf`;
      const filePath = path.join(downloadsDir, safeName);
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      await fs.writeFile(filePath, buffer);
      console.log(`🖨️ [RDP Print] Documento PDF guardado exitosamente en: ${filePath} (${buffer.length} bytes)`);
      try {
        shell.showItemInFolder(filePath);
      } catch (_) {}
      return { success: true, filePath, filename: safeName };
    } catch (err) {
      console.error('❌ [RDP Print] Error guardando PDF:', err);
      return { success: false, error: err.message };
    }
  });

  console.log('✅ [RDP Handlers] Registrados');
}

/**
 * Limpia las conexiones RDP (llamado al cerrar la app)
 */
function cleanupRdpConnections() {
  if (rdpManager) {
    rdpManager.disconnectAll();
    rdpManager.cleanupAllTempFiles();
  }
}

module.exports = {
  registerRdpHandlers,
  cleanupRdpConnections
};
