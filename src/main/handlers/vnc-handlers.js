/**
 * vnc-handlers.js
 * 
 * Handlers IPC para conexiones VNC Nativas (HTML5 noVNC sin Guacamole).
 * Registrado como parte de los handlers secundarios de NodeTerm.
 */

const { ipcMain, BrowserWindow } = require('electron');
const net = require('net');

let vncNativeBridgeService = null;

function getVncNativeBridgeService() {
  if (!vncNativeBridgeService) {
    vncNativeBridgeService = require('../services/VncNativeBridgeService');
  }
  return vncNativeBridgeService;
}

/**
 * Prueba rápida de conectividad TCP antes de entregar el token WebSocket.
 * Evita bloqueos y proporciona mensajes de error claros e inteligibles.
 */
function preflightTcpProbe(host, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isSettled = false;

    const finish = (result) => {
      if (isSettled) return;
      isSettled = true;
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      finish({ ok: true });
    });

    socket.once('timeout', () => {
      finish({ ok: false, errorCode: 'ETIMEDOUT' });
    });

    socket.once('error', (err) => {
      finish({ ok: false, errorCode: err.code || 'ECONNFAILED', message: err.message });
    });

    try {
      socket.connect(port, host);
    } catch (err) {
      finish({ ok: false, errorCode: 'ECONNFAILED', message: err.message });
    }
  });
}

/**
 * Registra los handlers de VNC Nativo
 */
function registerVncHandlers(dependencies = {}) {
  const { sendToRenderer } = dependencies;
  const bridgeService = getVncNativeBridgeService();

  // Reenviar evento de sesión cerrada al renderer
  bridgeService.removeAllListeners('session-closed');
  bridgeService.on('session-closed', (eventData) => {
    try {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          if (typeof sendToRenderer === 'function') {
            sendToRenderer(win, 'vnc:native-session-closed', eventData);
          } else {
            win.webContents.send('vnc:native-session-closed', eventData);
          }
        }
      });
    } catch (err) {
      console.warn('[VNC Handlers] Error enviando vnc:native-session-closed:', err);
    }
  });

  // Handler para crear token del puente nativo VNC
  ipcMain.handle('vnc:create-native-bridge-token', async (event, config) => {
    try {
      await bridgeService.initialize();

      const host = config?.hostname || config?.server || config?.host || '127.0.0.1';
      const port = parseInt(config?.port, 10) || 5900;

      // Realizar preflight check de conectividad TCP
      const probe = await preflightTcpProbe(host, port, 3500);
      if (!probe.ok && probe.errorCode) {
        const code = probe.errorCode;
        if (code === 'ECONNREFUSED') {
          return {
            success: false,
            error: `Conexión rechazada por ${host}:${port} (ECONNREFUSED). Comprueba que el servidor VNC esté iniciado y escuchando en el puerto ${port}.`
          };
        }
        if (code === 'ENOTFOUND') {
          return {
            success: false,
            error: `No se pudo resolver el host "${host}" (ENOTFOUND). Verifica el nombre o dirección IP del servidor.`
          };
        }
        if (code === 'ETIMEDOUT') {
          return {
            success: false,
            error: `Tiempo de espera agotado al conectar con ${host}:${port} (ETIMEDOUT). Verifica si el cortafuegos o VPN permiten el acceso a este puerto.`
          };
        }
        if (code === 'EHOSTUNREACH' || code === 'ENETUNREACH') {
          return {
            success: false,
            error: `Red o servidor inaccesible (${code}) en ${host}:${port}. Verifica tu conexión a internet o VPN.`
          };
        }
      }

      const sessionInfo = bridgeService.createSessionToken(config);
      if (process.env.NODETERM_VNC_DEBUG === '1') {
        console.log('🚀 [VNC Native Bridge] Token creado exitosamente:', sessionInfo.tokenId);
      }

      return {
        success: true,
        wsUrl: sessionInfo.wsUrl,
        tokenId: sessionInfo.tokenId,
        port: sessionInfo.port
      };
    } catch (error) {
      console.error('❌ [VNC Native Bridge] Error creando token:', error);
      return {
        success: false,
        error: error?.message || 'Error al iniciar puente VNC nativo'
      };
    }
  });

  // Handler para desconectar sesión
  ipcMain.handle('vnc:disconnect-session', async (event, { connectionId } = {}) => {
    try {
      if (connectionId) {
        bridgeService.disconnect(connectionId);
      } else {
        bridgeService.disconnectAll();
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

/**
 * Limpieza al cerrar la aplicación
 */
function cleanupVncConnections() {
  if (vncNativeBridgeService) {
    vncNativeBridgeService.stop();
  }
}

module.exports = {
  registerVncHandlers,
  cleanupVncConnections
};
