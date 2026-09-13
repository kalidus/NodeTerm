/**
 * VncNativeBridgeService.js
 * 
 * Servicio nativo para conectar clientes noVNC (HTML5 Canvas) en el renderer
 * directamente a servidores VNC (protocolo RFB sobre TCP) sin intermediarios
 * pesados como guacd, WSL o Docker.
 * 
 * Arquitectura:
 * [Renderer: noVNC] <-- WebSocket binario local --> [Node.js Bridge] <-- TCP 5900 --> [Servidor VNC Remoto]
 */

const http = require('http');
const net = require('net');
const crypto = require('crypto');
const EventEmitter = require('events');
const { WebSocketServer } = require('ws');

function debugLog(...args) {
  if (process.env.NODETERM_VNC_DEBUG === '1' || process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
}

class VncNativeBridgeService extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.wss = null;
    this.port = 0;
    this.activeConnections = new Map();
    this.sessionTokens = new Map();
    this.isInitialized = false;
  }

  /**
   * Inicializa el servidor HTTP/WebSocket local para el puente VNC nativo
   */
  async initialize() {
    if (this.isInitialized && this.server) {
      return { port: this.port };
    }

    return new Promise((resolve, reject) => {
      try {
        // Servidor HTTP en localhost en puerto efímero (0)
        this.server = http.createServer((req, res) => {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('NodeTerm VNC Native Bridge Active');
        });

        this.wss = new WebSocketServer({ noServer: true });

        // Manejador de actualización de protocolo WebSocket (HTTP Upgrade)
        this.server.on('upgrade', (request, socket, head) => {
          const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
          const token = url.searchParams.get('token');
          debugLog(`🌐 [VncNativeBridgeService] Solicitud WebSocket Upgrade para URL: ${request.url}`);

          if (!token || !this.sessionTokens.has(token)) {
            console.warn(`⚠️ [VncNativeBridgeService] Token inválido o ausente: token="${token}"`);
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          const session = this.sessionTokens.get(token);
          this.sessionTokens.delete(token); // Token de un solo uso

          this.wss.handleUpgrade(request, socket, head, (ws) => {
            debugLog(`✅ [VncNativeBridgeService] Handshake WebSocket completado para sesión VNC ${session.host}:${session.port}`);
            this.handleConnection(ws, session);
          });
        });

        this.server.listen(0, '127.0.0.1', () => {
          const address = this.server.address();
          this.port = address.port;
          this.isInitialized = true;
          console.log(`✅ [VncNativeBridgeService] Servidor VNC Nativo iniciado en 127.0.0.1:${this.port} (Sin guacd/WSL/Docker)`);
          resolve({ port: this.port });
        });

        this.server.on('error', (err) => {
          console.error('❌ [VncNativeBridgeService] Error iniciando servidor:', err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera un token de sesión seguro para conectar una pestaña VNC nativa
   */
  createSessionToken(config) {
    const tokenId = crypto.randomBytes(16).toString('hex');
    const sessionData = {
      id: tokenId,
      host: config.hostname || config.server || config.host || '127.0.0.1',
      port: parseInt(config.port, 10) || 5900,
      password: config.password || '',
      readOnly: config.readOnly === true,
      autoReconnect: config.autoReconnect !== false,
      createdAt: Date.now()
    };

    this.sessionTokens.set(tokenId, sessionData);

    // Auto-expirar token en 60 segundos si no se usa
    setTimeout(() => {
      this.sessionTokens.delete(tokenId);
    }, 60000);

    return {
      tokenId,
      port: this.port,
      wsUrl: `ws://127.0.0.1:${this.port}/vnc-bridge?token=${tokenId}`
    };
  }

  /**
   * Establece la tubería bidireccional entre el WebSocket (noVNC) y el socket TCP remoto (servidor VNC)
   */
  handleConnection(ws, session) {
    const connectionId = `vnc_${session.id}_${Date.now()}`;
    console.log(`🔌 [VncNativeBridgeService] Conectando socket TCP a ${session.host}:${session.port}`);

    let isCleanedUp = false;
    const tcpSocket = new net.Socket();

    // Desactivar algoritmo de Nagle para mínima latencia en interacción remota
    tcpSocket.setNoDelay(true);

    this.activeConnections.set(connectionId, { ws, tcpSocket, session });

    const cleanup = (reason = 'normal') => {
      if (isCleanedUp) return;
      isCleanedUp = true;

      this.activeConnections.delete(connectionId);

      try {
        tcpSocket.removeAllListeners();
        tcpSocket.destroy();
      } catch (_) {}

      try {
        if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
          ws.close();
        }
      } catch (_) {}

      debugLog(`🧹 [VncNativeBridgeService] Sesión VNC finalizada (${reason})`);
      this.emit('session-closed', { connectionId, host: session.host, port: session.port, reason });
    };

    // Conectar al servidor VNC remoto
    tcpSocket.connect(session.port, session.host, () => {
      debugLog(`🔗 [VncNativeBridgeService] Socket TCP conectado a ${session.host}:${session.port}`);
    });

    // Reenvío de datos: WebSocket -> Socket TCP
    ws.on('message', (message) => {
      if (tcpSocket.writable) {
        tcpSocket.write(message);
      }
    });

    // Reenvío de datos: Socket TCP -> WebSocket
    tcpSocket.on('data', (chunk) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(chunk);
      }
    });

    // Manejo de eventos y errores de TCP
    tcpSocket.on('error', (err) => {
      console.warn(`⚠️ [VncNativeBridgeService] Error en socket TCP (${session.host}:${session.port}):`, err.message);
      cleanup(`tcp_error: ${err.message}`);
    });

    tcpSocket.on('close', (hadError) => {
      cleanup(hadError ? 'tcp_closed_with_error' : 'tcp_closed');
    });

    tcpSocket.on('timeout', () => {
      cleanup('tcp_timeout');
    });

    // Manejo de eventos y errores de WebSocket
    ws.on('error', (err) => {
      console.warn(`⚠️ [VncNativeBridgeService] Error en WebSocket:`, err.message);
      cleanup(`ws_error: ${err.message}`);
    });

    ws.on('close', (code, reason) => {
      cleanup(`ws_closed: ${code} - ${reason || 'normal'}`);
    });
  }

  /**
   * Cierra una conexión activa específica
   */
  disconnect(connectionId) {
    const conn = this.activeConnections.get(connectionId);
    if (conn) {
      try { conn.tcpSocket.destroy(); } catch (_) {}
      try { conn.ws.close(); } catch (_) {}
      this.activeConnections.delete(connectionId);
    }
  }

  /**
   * Cierra todas las conexiones activas
   */
  disconnectAll() {
    for (const [id, conn] of this.activeConnections.entries()) {
      try { conn.tcpSocket.destroy(); } catch (_) {}
      try { conn.ws.close(); } catch (_) {}
    }
    this.activeConnections.clear();
    this.sessionTokens.clear();
  }

  /**
   * Detiene el servidor local
   */
  async stop() {
    this.disconnectAll();
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.isInitialized = false;
          console.log('🛑 [VncNativeBridgeService] Servidor VNC Nativo detenido');
          resolve();
        });
      });
    }
  }
}

module.exports = new VncNativeBridgeService();
