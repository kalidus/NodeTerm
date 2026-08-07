/**
 * RdpNativeBridgeService.js
 * Servicio proxy TCP-a-WebSocket nativo en Node.js para conexiones RDP Web HTML5 (IronRDP WASM).
 * 
 * 🚀 Característica Clave: 100% independiente de guacd, WSL (ubuntu.exe) y Docker.
 * Funciona de forma totalmente nativa en Windows, macOS y Linux.
 */

const net = require('net');
const http = require('http');
const crypto = require('crypto');
const EventEmitter = require('events');
const { WebSocketServer } = require('ws');

class RdpNativeBridgeService extends EventEmitter {
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
   * Inicializa el servidor HTTP/WebSocket local para RDP nativo
   */
  async initialize() {
    if (this.isInitialized && this.server) {
      return { port: this.port };
    }

    return new Promise((resolve, reject) => {
      try {
        // Crear servidor HTTP ligero en localhost (puerto efímero 0 para asignación automática segura)
        this.server = http.createServer((req, res) => {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('NodeTerm RDP Native Bridge Active');
        });

        this.wss = new WebSocketServer({ noServer: true });

        // Manejador de actualización de protocolo WebSocket (HTTP Upgrade)
        this.server.on('upgrade', (request, socket, head) => {
          const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
          const token = url.searchParams.get('token');
          console.log(`🌐 [RdpNativeBridgeService] Solicitud WebSocket Upgrade recibida para URL: ${request.url}`);

          if (!token || !this.sessionTokens.has(token)) {
            console.warn(`⚠️ [RdpNativeBridgeService] Token inválido o ausente: token="${token}". Conexiones activas:`, Array.from(this.sessionTokens.keys()));
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          const session = this.sessionTokens.get(token);
          this.sessionTokens.delete(token); // Token de un solo uso

          this.wss.handleUpgrade(request, socket, head, (ws) => {
            console.log(`✅ [RdpNativeBridgeService] Handshake WebSocket completado exitosamente para la sesión.`);
            this.handleConnection(ws, session);
          });
        });

        this.server.listen(0, '127.0.0.1', () => {
          const address = this.server.address();
          this.port = address.port;
          this.isInitialized = true;
          console.log(`✅ [RdpNativeBridgeService] Servidor RDP Nativo iniciado en 127.0.0.1:${this.port} (Sin guacd/WSL/Docker)`);
          resolve({ port: this.port });
        });

        this.server.on('error', (err) => {
          console.error('❌ [RdpNativeBridgeService] Error iniciando servidor:', err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera un token de sesión seguro para conectar una pestaña RDP nativa
   */
  createSessionToken(config) {
    const tokenId = crypto.randomBytes(16).toString('hex');
    const sessionData = {
      id: tokenId,
      host: config.hostname || config.server || config.host,
      port: parseInt(config.port, 10) || 3389,
      username: config.username || '',
      password: config.password || '',
      width: config.width || 1920,
      height: config.height || 1080,
      colorDepth: config.colorDepth || 32,
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
      wsUrl: `ws://127.0.0.1:${this.port}/rdp-bridge?token=${tokenId}`
    };
  }

  /**
   * Establece la conexión bidireccional entre el WebSocket cliente y el puerto RDP TCP remoto.
   * 
   * Implementa la arquitectura RDCleanPath + TLS Proxy:
   * 1. Recibe RDCleanPath Request PDU de WASM (contiene X.224 Connection Request en tag [6])
   * 2. Extrae el X.224 CR del tag [6] y lo envía al servidor RDP TCP
   * 3. Espera la respuesta X.224 Connection Confirm del servidor RDP
   * 4. Inicia actualización del socket TCP a TLS (`tls.connect`) con el servidor RDP remoto
   * 5. Al completarse el handshake TLS, obtiene el certificado X.509 real del servidor RDP
   * 6. Construye RDCleanPath Response PDU con version + x224_connection_pdu(CC) + cert_chain + server_addr
   * 7. Envía el Response a WASM. El bridge reenvía datos encriptados por TLS 1:1 entre WASM y el servidor RDP.
   */
  /**
   * Establece la conexión bidireccional entre el WebSocket cliente y el puerto RDP TCP remoto.
   * 
   * Utiliza rdp-tls-worker.js ejecutado bajo Node.js nativo (OpenSSL) para evadir BoringSSL en Electron:
   * 1. Recibe RDCleanPath Request PDU de WASM (contiene X.224 Connection Request en tag [6])
   * 2. Delega al worker TCP+TLS la conexión y negociación X.224 + TLS 1.3 con el servidor RDP
   * 3. El worker obtiene el certificado X.509 real de 724+ bytes del servidor RDP
   * 4. Construye RDCleanPath Response PDU con version + x224_connection_pdu(CC) + cert_chain + server_addr
   * 5. Envía el Response a WASM. Canaliza los datos de sesión bidireccionales encriptados.
   */
  handleConnection(ws, session) {
    const { fork } = require('child_process');
    const path = require('path');

    console.log(`🔌 [RdpNativeBridgeService] WebSocket cliente conectado para ${session.host}:${session.port}`);

    const connectionId = `native_rdp_${Date.now()}`;
    const workerPath = path.join(__dirname, 'rdp-tls-worker.js');

    let forkOptions = {};
    try {
      forkOptions.execPath = process.platform === 'win32' ? 'node.exe' : 'node';
    } catch (e) {}

    let worker = null;
    try {
      worker = fork(workerPath, [], forkOptions);
    } catch (e) {
      console.warn('⚠️ Falló fork con node genérico, usando fork predeterminado:', e);
      worker = fork(workerPath);
    }

    this.activeConnections.set(connectionId, { ws, worker, session });

    let rdCleanPathPhase = 'waiting_request';
    let savedX224CcHex = null;

    let isCleanedUp = false;
    const cleanup = (reason) => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      console.log(`🧹 [RdpNativeBridgeService] Cierre de conexión ${connectionId} provocado por: ${reason}`);
      this.activeConnections.delete(connectionId);
      try { ws.close(); } catch (e) {}
      try {
        if (worker && worker.connected) {
          worker.send({ type: 'DISCONNECT' });
        }
      } catch (e) {}
      try { if (worker) worker.kill(); } catch (e) {}
    };

    worker.on('message', (msg) => {
      if (!msg || !msg.type) return;

      if (msg.type === 'X224_CC') {
        savedX224CcHex = msg.x224Cc;
        console.log(`✅ [Bridge] Recibida X.224 Connection Confirm (${savedX224CcHex.length / 2} bytes) desde worker. Esperando TLS...`);
      } else if (msg.type === 'TLS_CONNECTED') {
        console.log(`🔒 [Bridge] Worker notificó TLS Handshake completado exitosamente!`);

        let peerCertChain = [];
        if (msg.certRawHex) {
          peerCertChain.push(Buffer.from(msg.certRawHex, 'hex'));
          console.log(`📜 [Bridge] Certificado X.509 real devuelto por worker (${msg.certRawHex.length / 2} bytes)`);
        }

        const x224CcBuffer = savedX224CcHex ? Buffer.from(savedX224CcHex, 'hex') : Buffer.from([0x03, 0x00, 0x00, 0x13, 0x0e, 0xd0, 0x00, 0x00, 0x12, 0x34, 0x00, 0x02, 0x2f, 0x08, 0x00, 0x08, 0x00, 0x00, 0x00]);
        const responsePdu = this.createRdCleanPathResponsePdu(session.host, x224CcBuffer, peerCertChain);
        console.log(`📤 [Bridge] Enviando RDCleanPath Response PDU (${responsePdu.length} bytes) a WASM...`);

        if (ws.readyState === ws.OPEN) {
          ws.send(responsePdu, { binary: true });
        }

        rdCleanPathPhase = 'transparent';
      } else if (msg.type === 'DATA_FROM_RDP') {
        if (ws.readyState === ws.OPEN) {
          ws.send(Buffer.from(msg.dataHex, 'hex'), { binary: true });
        }
      } else if (msg.type === 'ERROR') {
        console.error('❌ [Bridge Worker Error]:', msg.error);
        cleanup(`Worker Error: ${msg.error}`);
      } else if (msg.type === 'CLOSED') {
        cleanup('Worker notificó conexión cerrada');
      }
    });

    worker.on('error', (err) => cleanup(`Worker process error: ${err.message}`));
    worker.on('exit', (code) => {
      if (rdCleanPathPhase !== 'transparent') {
        cleanup(`Worker process exited with code ${code}`);
      }
    });

    ws.on('message', (message) => {
      try {
        const payload = Buffer.isBuffer(message) ? message : Buffer.from(message);

        if (rdCleanPathPhase === 'waiting_request' && payload.length > 0 && payload[0] === 0x30) {
          console.log(`📥 [Bridge] Recibido RDCleanPath Request PDU (${payload.length} bytes). Extrayendo X.224 CR del tag [6]...`);

          let x224Cr = this.extractX224FromRdCleanPath(payload);
          if (!x224Cr || x224Cr.length === 0) {
            const cookieStr = `Cookie: mstshash=${session.username || 'nodeterm'}\r\n`;
            const cookieBytes = Buffer.from(cookieStr, 'utf8');
            const tpktLen = 11 + cookieBytes.length + 8;
            x224Cr = Buffer.concat([
              Buffer.from([
                0x03, 0x00, 0x00, tpktLen,
                tpktLen - 5, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00
              ]),
              cookieBytes,
              Buffer.from([0x01, 0x00, 0x08, 0x00, 0x0b, 0x00, 0x00, 0x00])
            ]);
          }

          rdCleanPathPhase = 'waiting_x224_cc';
          console.log(`📤 [Bridge] Iniciando worker RDP TLS para ${session.host}:${session.port}...`);
          worker.send({
            type: 'CONNECT',
            host: session.host,
            port: session.port,
            x224Cr: x224Cr.toString('hex')
          });
          return;
        }

        // Reenviar datos de WASM al worker RDP
        worker.send({
          type: 'DATA_TO_RDP',
          dataHex: payload.toString('hex')
        });
      } catch (e) {
        console.error('Error enviando a worker RDP:', e);
      }
    });

    ws.on('close', () => cleanup('WebSocket (WASM client) closed'));
    ws.on('error', (e) => cleanup(`WebSocket error: ${e.message}`));
  }

  /**
   * Extrae el campo x224_connection_pdu (tag context-specific EXPLICIT 6 = 0xa6) 
   * del RDCleanPath Request PDU codificado en ASN.1 DER.
   */
  extractX224FromRdCleanPath(pdu) {
    try {
      // Saltar la cabecera SEQUENCE (0x30 + longitud)
      let offset = 0;
      if (pdu[offset] !== 0x30) return null;
      offset++;

      // Leer longitud de la secuencia
      let seqLen;
      if (pdu[offset] & 0x80) {
        const numBytes = pdu[offset] & 0x7f;
        offset++;
        seqLen = 0;
        for (let i = 0; i < numBytes; i++) {
          seqLen = (seqLen << 8) | pdu[offset++];
        }
      } else {
        seqLen = pdu[offset++];
      }

      const seqEnd = offset + seqLen;

      // Iterar por los campos del SEQUENCE buscando tag 0xa6 (context-specific EXPLICIT 6)
      while (offset < seqEnd) {
        const tag = pdu[offset++];
        let fieldLen;
        if (pdu[offset] & 0x80) {
          const numBytes = pdu[offset] & 0x7f;
          offset++;
          fieldLen = 0;
          for (let i = 0; i < numBytes; i++) {
            fieldLen = (fieldLen << 8) | pdu[offset++];
          }
        } else {
          fieldLen = pdu[offset++];
        }

        if (tag === 0xa6) {
          // EXPLICIT tag: el contenido es un OctetString (0x04 + len + data)
          const innerTag = pdu[offset];
          if (innerTag === 0x04) {
            let innerOffset = offset + 1;
            let innerLen;
            if (pdu[innerOffset] & 0x80) {
              const numBytes = pdu[innerOffset] & 0x7f;
              innerOffset++;
              innerLen = 0;
              for (let i = 0; i < numBytes; i++) {
                innerLen = (innerLen << 8) | pdu[innerOffset++];
              }
            } else {
              innerLen = pdu[innerOffset++];
            }
            return pdu.subarray(innerOffset, innerOffset + innerLen);
          }
        }

        offset += fieldLen;
      }
      return null;
    } catch (e) {
      console.error('Error parseando RDCleanPath ASN.1:', e);
      return null;
    }
  }

  /**
   * Genera el RDCleanPath Response PDU en ASN.1 DER.
   * 
   * Estructura según ironrdp-rdcleanpath (EXPLICIT tag mode):
   *   SEQUENCE {
   *     [0] EXPLICIT INTEGER version (1),
   *     [6] EXPLICIT OCTET STRING x224_connection_pdu (X.224 CC del servidor),
   *     [7] EXPLICIT SEQUENCE OF OCTET STRING server_cert_chain (vacío),
   *     [9] EXPLICIT UTF8String server_addr ("host:port")
   *   }
   */
  createRdCleanPathResponsePdu(serverHost, x224ConnectionConfirm, peerCertChain = []) {
    const VERSION_1 = 3390; // BASE_VERSION(3389) + 1, como en ironrdp-rdcleanpath
    const serverAddrStr = `${serverHost}`;

    // [0] EXPLICIT: version = 3390
    const versionField = this.derExplicitTag(0, this.derInteger(VERSION_1));

    // [6] EXPLICIT: x224_connection_pdu = OctetString(X.224 CC)
    const x224Field = this.derExplicitTag(6, this.derOctetString(x224ConnectionConfirm));

    // [7] EXPLICIT: server_cert_chain = SEQUENCE OF OCTET STRING (con los certificados X.509 reales obtenidos del servidor RDP)
    let certChainSeqContent;
    if (Array.isArray(peerCertChain) && peerCertChain.length > 0) {
      certChainSeqContent = Buffer.concat(peerCertChain.map(cert => this.derOctetString(cert)));
    } else {
      const x509DerCert = this.getSelfSignedDerCert();
      certChainSeqContent = this.derOctetString(x509DerCert);
    }
    const certChainSeq = this.derSequence(certChainSeqContent);
    const certChainField = this.derExplicitTag(7, certChainSeq);

    // [9] EXPLICIT: server_addr
    const serverAddrField = this.derExplicitTag(9, this.derUtf8String(serverAddrStr));

    const seqContent = Buffer.concat([versionField, x224Field, certChainField, serverAddrField]);
    return this.derSequence(seqContent);
  }

  /**
   * Genera o retorna un certificado X.509 autofirmado codificado en ASN.1 DER válido usando node-forge
   */
  getSelfSignedDerCert() {
    if (this.cachedDerCert) {
      return this.cachedDerCert;
    }

    try {
      const forge = require('node-forge');
      const pki = forge.pki;
      const keys = pki.rsa.generateKeyPair(1024);
      const cert = pki.createCertificate();
      cert.publicKey = keys.publicKey;
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5);

      const attrs = [
        { name: 'commonName', value: 'NodeTerm RDP Proxy' },
        { name: 'organizationName', value: 'NodeTerm' }
      ];
      cert.setSubject(attrs);
      cert.setIssuer(attrs);
      cert.sign(keys.privateKey, forge.md.sha256.create());

      const derBytes = Buffer.from(forge.asn1.toDer(pki.certificateToAsn1(cert)).getBytes(), 'binary');
      this.cachedDerCert = derBytes;
      console.log(`📜 [RdpNativeBridgeService] Certificado X.509 DER autofirmado generado (${derBytes.length} bytes)`);
      return derBytes;
    } catch (e) {
      console.error('❌ Error generando certificado X.509 DER autofirmado:', e);
      return Buffer.from([0x30, 0x82, 0x01, 0x00]);
    }
  }

  // === Helpers ASN.1 DER ===

  derSequence(content) {
    return Buffer.concat([Buffer.from([0x30]), this.derLength(content.length), content]);
  }

  derExplicitTag(tagNumber, content) {
    const tag = 0xa0 | tagNumber;
    return Buffer.concat([Buffer.from([tag]), this.derLength(content.length), content]);
  }

  derInteger(value) {
    if (value <= 0x7f) {
      return Buffer.from([0x02, 0x01, value]);
    } else if (value <= 0x7fff) {
      return Buffer.from([0x02, 0x02, (value >> 8) & 0xff, value & 0xff]);
    }
    // Para valores más grandes
    const bytes = [];
    let v = value;
    while (v > 0) { bytes.unshift(v & 0xff); v >>= 8; }
    if (bytes[0] & 0x80) bytes.unshift(0x00); // signo positivo
    return Buffer.from([0x02, bytes.length, ...bytes]);
  }

  derOctetString(data) {
    return Buffer.concat([Buffer.from([0x04]), this.derLength(data.length), data]);
  }

  derUtf8String(str) {
    const bytes = Buffer.from(str, 'utf8');
    return Buffer.concat([Buffer.from([0x0c]), this.derLength(bytes.length), bytes]);
  }

  derLength(len) {
    if (len < 0x80) {
      return Buffer.from([len]);
    } else if (len < 0x100) {
      return Buffer.from([0x81, len]);
    } else {
      return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
    }
  }

  /**
   * Detiene el servicio y cierra conexiones
   */
  async stop() {
    for (const [id, conn] of this.activeConnections) {
      try { conn.ws.close(); } catch (e) {}
      try { conn.targetSocket.destroy(); } catch (e) {}
    }
    this.activeConnections.clear();

    if (this.wss) {
      try { this.wss.close(); } catch (e) {}
    }

    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.isInitialized = false;
          console.log('🛑 [RdpNativeBridgeService] Servidor RDP Nativo detenido');
          resolve();
        });
      });
    }
  }
}

module.exports = new RdpNativeBridgeService();
