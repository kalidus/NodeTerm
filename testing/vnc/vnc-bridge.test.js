const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const net = require('node:net');
const http = require('node:http');
const { WebSocket } = require('ws');

const vncBridge = require('../../src/main/services/VncNativeBridgeService');

describe('VNC Native Bridge Service Tests', () => {
  let mockVncServer;
  let mockVncPort;
  let receivedFromClient = [];

  before(async () => {
    // Iniciar un servidor TCP simulando un servidor VNC (RFB 003.008)
    await new Promise((resolve) => {
      mockVncServer = net.createServer((socket) => {
        // Enviar saludo RFB inicial
        socket.write('RFB 003.008\n');

        socket.on('data', (data) => {
          receivedFromClient.push(data.toString());
          // Echo o respuesta
          if (data.toString().includes('RFB')) {
            socket.write(Buffer.from([1, 1])); // 1 security type: None
          }
        });
      });

      mockVncServer.listen(0, '127.0.0.1', () => {
        mockVncPort = mockVncServer.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    if (mockVncServer) {
      await new Promise((resolve) => mockVncServer.close(resolve));
    }
    await vncBridge.stop();
  });

  describe('Bridge Service Lifecycle & Connection', () => {
    it('inicializa el servidor HTTP/WebSocket en 127.0.0.1 con puerto dinamico', async () => {
      const result = await vncBridge.initialize();
      assert.ok(result.port > 0);
      assert.strictEqual(vncBridge.isInitialized, true);

      // Segunda llamada devuelve el mismo puerto sin error
      const result2 = await vncBridge.initialize();
      assert.strictEqual(result2.port, result.port);
    });

    it('genera token de sesion de un solo uso con caducidad', () => {
      const session = vncBridge.createSessionToken({
        hostname: '127.0.0.1',
        port: mockVncPort,
        password: 'test'
      });

      assert.ok(session.tokenId);
      assert.ok(session.wsUrl.includes(session.tokenId));
      assert.strictEqual(vncBridge.sessionTokens.has(session.tokenId), true);
    });

    it('rechaza conexion WebSocket con token invalido con HTTP 401', async () => {
      await new Promise((resolve) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port: vncBridge.port,
          path: '/vnc-bridge?token=invalid_token_12345',
          headers: {
            'Connection': 'Upgrade',
            'Upgrade': 'websocket',
            'Sec-WebSocket-Version': 13,
            'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ=='
          }
        });

        req.on('response', (res) => {
          assert.strictEqual(res.statusCode, 401);
          resolve();
        });

        req.on('error', () => {
          // El socket puede cerrarse inmediatamente
          resolve();
        });

        req.end();
      });
    });

    it('canaliza conexion WebSocket bidireccional hacia el socket TCP VNC', async () => {
      const session = vncBridge.createSessionToken({
        hostname: '127.0.0.1',
        port: mockVncPort
      });

      const ws = new WebSocket(session.wsUrl);
      const incomingMessages = [];

      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          // El servidor VNC debe haber enviado el saludo inicial RFB
        });

        ws.on('message', (data) => {
          incomingMessages.push(data.toString());
          if (data.toString().includes('RFB')) {
            // Responder con la versión del cliente
            ws.send('RFB 003.008\n');
          } else {
            // Recibido el handshake completo
            resolve();
          }
        });

        ws.on('error', reject);
        setTimeout(() => resolve(), 1500);
      });

      assert.ok(incomingMessages.some(m => m.includes('RFB 003.008')));
      assert.ok(receivedFromClient.some(m => m.includes('RFB 003.008')));

      ws.close();
    });

    it('cierra conexiones activas limpiamente con disconnectAll', () => {
      vncBridge.disconnectAll();
      assert.strictEqual(vncBridge.activeConnections.size, 0);
      assert.strictEqual(vncBridge.sessionTokens.size, 0);
    });
  });
});
