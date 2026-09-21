/**
 * RdpNativeBridgeService.js
 * Servicio proxy TCP-a-WebSocket nativo en Node.js para conexiones RDP Web HTML5 (IronRDP WASM).
 * 
 * 🚀 Característica Clave: 100% independiente de guacd, WSL (ubuntu.exe) y Docker.
 * Funciona de forma totalmente nativa en Windows, macOS y Linux.
 */

const net = require('net');
const tls = require('tls');
const http = require('http');
const crypto = require('crypto');
const EventEmitter = require('events');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');
const { parseX224ConnectionConfirm, protocolName, describeRdpPdu, describeDisconnectPdu, splitRdpFrames, splitTpktFrames, RdpFrameSplitter } = require('./rdp-protocol-helpers');
const { prepareMcsConnectInitial, findClientCoreData, findClientNetworkChannels, patchInfoPacket, patchInfoAutoLogon } = require('./rdp-mcs-helpers');
const { patchFontSequenceFlags } = require('./rdp-font-helpers');
const { fixWallixBitmapStrideCrop } = require('./rdp-fastpath-helpers');
const {
  createChannelFilterState,
  processServerFrame,
  learnClientInitiator,
  buildMcsSendDataRequest,
  describeCliprdrPdu,
  isUserMcsChannel,
  isSafeStaticCliprdrWrite,
  enqueueClientCliprdr,
  takePendingClientCliprdr
} = require('./rdp-channel-filter');
const {
  parseMcsSendData,
  rewriteMcsChannelId,
  clearChannelPduShowProtocol,
  buildMcsSendDataIndication
} = require('./rdp-autodetect');

function debugLog(...args) {
  if (process.env.NODETERM_RDP_DEBUG === '1') {
    console.log(...args);
  }
}

// Interruptores de diagnostico del bridge. Se leen del entorno y, si no estan ahi, de un fichero
// rdp-flags.json en la raiz del proyecto. El fichero existe porque el bridge corre en el proceso
// principal de Electron, lanzado a traves de cross-env y concurrently: fijar la variable en la
// terminal no siempre llega hasta ahi, y un flag que se pierde en silencio invalida la prueba sin
// que se note. Se relee en cada sesion para no tener que reiniciar entre experimentos.
const DIAG_FLAGS_FILE = 'rdp-flags.json';

const CB_FORMAT_LIST_RESPONSE = 0x0003;
const CB_RESPONSE_OK = 0x0001;
const CHANNEL_FLAG_FIRST_LAST = 0x03;

/**
 * CB_FORMAT_LIST_RESPONSE con CB_RESPONSE_OK (MS-RDPECLIP 2.2.3.2), envuelto en su
 * CHANNEL_PDU_HEADER y en una indicacion MCS lista para entregar a IronRDP WASM.
 */
function buildCliprdrFormatListResponseOk(initiator, channelId) {
  const clipHdr = Buffer.alloc(8);
  clipHdr.writeUInt16LE(CB_FORMAT_LIST_RESPONSE, 0);
  clipHdr.writeUInt16LE(CB_RESPONSE_OK, 2);
  clipHdr.writeUInt32LE(0, 4);

  const chanHdr = Buffer.alloc(8);
  chanHdr.writeUInt32LE(clipHdr.length, 0);
  chanHdr.writeUInt32LE(CHANNEL_FLAG_FIRST_LAST, 4);

  return buildMcsSendDataIndication(
    initiator == null ? 0 : initiator,
    channelId,
    Buffer.concat([chanHdr, clipHdr])
  );
}

function readDiagEntry(name) {
  if (process.env[name] != null && process.env[name] !== '') return process.env[name];
  try {
    const file = path.join(process.cwd(), DIAG_FLAGS_FILE);
    if (!fs.existsSync(file)) return undefined;
    return JSON.parse(fs.readFileSync(file, 'utf8'))[name];
  } catch {
    return undefined;
  }
}

function readDiagFlag(name) {
  const value = readDiagEntry(name);
  return value === true || value === '1' || value === 1;
}

/** Interruptores que llevan un valor, no solo on/off. Devuelve '' si no esta definido. */
function readDiagValue(name) {
  const value = readDiagEntry(name);
  return value == null ? '' : String(value).trim();
}

// IronRDP declara solo cliprdr. Wallix ignora nombres y mapea por indice.
// :RDP: rdpdr+rdpsnd delante para que cliprdr no sea el unico/primer VC
// (si lo es, Session Probe acaba saludando por MCS 1001 en sesiones sucesivas).
// :APP: rail+rdpdr+rdpsnd delante. NODETERM_RDP_INJECT_CHANNELS admite un orden o 'off'.
const RDP_INJECTED_CHANNELS = { before: ['rdpdr', 'rdpsnd'], after: [] };
const APP_INJECTED_CHANNELS = { before: ['rail', 'rdpdr', 'rdpsnd'], after: [] };
const APP_INJECTED_CHANNELS_RAIL = APP_INJECTED_CHANNELS;

function wallixServiceFromUsername(username) {
  const m = String(username || '').match(/:(RDP|APP):/i);
  return m ? m[1].toUpperCase() : null;
}

function wallixServiceFromSession(session) {
  if (!session) return null;
  return wallixServiceFromUsername(session.username)
    || wallixServiceFromUsername(session.bastionUser)
    || (session.wallixService ? String(session.wallixService).toUpperCase() : null);
}

function parseInjectChannelsSpec(requested) {
  const parts = String(requested || '').split('*');
  const split = (s) => s.split(',').map((n) => n.trim()).filter(Boolean);
  if (parts.length === 1) return { before: [], after: split(parts[0]) };
  return { before: split(parts[0]), after: split(parts.slice(1).join(',')) };
}

function resolveInjectedChannels(session) {
  const requested = readDiagValue('NODETERM_RDP_INJECT_CHANNELS');
  if (requested && requested.toLowerCase() === 'off') return null;
  if (requested) return parseInjectChannelsSpec(requested);
  if (wallixServiceFromSession(session) === 'APP') return APP_INJECTED_CHANNELS;
  return RDP_INJECTED_CHANNELS;
}

const TRAFFIC_STATS_INTERVAL_MS = 15000;

function rdpDebug() {
  return process.env.NODETERM_RDP_DEBUG === '1' || readDiagFlag('NODETERM_RDP_DEBUG');
}

function isFastPathNoise(desc) {
  return typeof desc === 'string' && desc.includes('FastPath');
}

function isCliprdrFragmentDesc(desc) {
  return typeof desc === 'string' &&
    (desc.includes('continuación') || desc.includes('msgType=0x'));
}

function isCliprdrFormatListDesc(desc) {
  return typeof desc === 'string' &&
    desc.includes('CB_FORMAT_LIST') &&
    !desc.includes('CB_FORMAT_LIST_RESPONSE');
}

/** Default ON: un 0/false del flag lo apaga. El fichero rdp-flags.json no debe dejarlo a 0 en silencio. */
function allowUserChannelCliprdr() {
  const value = readDiagEntry('NODETERM_RDP_CLIPRDR_ALLOW_USER_CHANNEL');
  if (value == null || value === '') return true;
  if (value === false || value === 0 || value === '0') return false;
  return value === true || value === '1' || value === 1;
}

function isNoisyDrop(note) {
  return typeof note === 'string' &&
    (note.includes('heartbeat') || note.includes('rdpdr-absorb') || note.includes('rdpdr-user-loggedon')
      || note.includes('rail-absorb') || note.includes('rail-handshake'));
}

function createTrafficStats(emit) {
  let since = Date.now();
  let bytes = 0;
  const counts = new Map();

  return {
    note(pduDesc, size) {
      let kind = String(pduDesc || 'desconocido');
      if (kind.includes('FastPath')) kind = 'FastPath';
      else if (kind.startsWith('DROP')) kind = 'DROP';
      else kind = kind.split(' ').slice(0, 2).join(' ');
      counts.set(kind, (counts.get(kind) || 0) + 1);
      bytes += size;
      const elapsed = Date.now() - since;
      if (elapsed < TRAFFIC_STATS_INTERVAL_MS) return;
      const detail = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `${k} x${n}`)
        .join(', ');
      emit(`trafico RDP->WASM en ${Math.round(elapsed / 1000)}s: ${Math.round(bytes / 1024)}KB | ${detail}`);
      since = Date.now();
      bytes = 0;
      counts.clear();
    }
  };
}

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

        this.wss = new WebSocketServer({
          noServer: true,
          perMessageDeflate: false,
          maxPayload: 64 * 1024 * 1024
        });

        // Manejador de actualización de protocolo WebSocket (HTTP Upgrade)
        this.server.on('upgrade', (request, socket, head) => {
          const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
          const token = url.searchParams.get('token');
          debugLog(`🌐 [RdpNativeBridgeService] Solicitud WebSocket Upgrade recibida para URL: ${request.url}`);

          if (!token || !this.sessionTokens.has(token)) {
            console.warn(`⚠️ [RdpNativeBridgeService] Token inválido o ausente: token="${token}". Conexiones activas:`, Array.from(this.sessionTokens.keys()));
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          const session = this.sessionTokens.get(token);
          this.sessionTokens.delete(token); // Token de un solo uso

          this.wss.handleUpgrade(request, socket, head, (ws) => {
            debugLog(`✅ [RdpNativeBridgeService] Handshake WebSocket completado exitosamente para la sesión.`);
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
      username: (config.useBastionWallix && config.bastionUser) ? config.bastionUser : (config.username || config.user || ''),
      wallixService: config.wallixService || null,
      useBastionWallix: config.useBastionWallix === true,
      targetServer: config.targetServer || null,
      password: config.password || '',
      width: config.width || 1920,
      height: config.height || 1080,
      colorDepth: config.colorDepth || 32,
      enableWallpaper: config.guacEnableWallpaper !== undefined ? config.guacEnableWallpaper : (config.enableWallpaper !== undefined ? config.enableWallpaper : true),
      enableFontSmoothing: config.enableFontSmoothing === true || config.guacEnableFontSmoothing === true,
      enableDesktopComposition: config.enableDesktopComposition === true || config.guacEnableDesktopComposition === true,
      enableTheming: config.enableTheming !== false && config.guacEnableTheming !== false,
      enableFullWindowDrag: config.enableFullWindowDrag === true || config.guacEnableFullWindowDrag === true,
      enableMenuAnimations: config.enableMenuAnimations === true || config.guacEnableMenuAnimations === true,
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
   * Implementa la arquitectura RDCleanPath + TLS Nativo:
   * 1. Recibe RDCleanPath Request PDU de WASM (contiene X.224 Connection Request en tag [6])
   * 2. Conecta TCP con el servidor RDP y envía el X.224 CR
   * 3. Recibe la respuesta X.224 Connection Confirm del servidor RDP
   * 4. Actualiza a TLS en el proceso nativo gestionando certificados autofirmados RDP
   * 5. Obtiene el certificado X.509 real del servidor RDP
   * 6. Construye RDCleanPath Response PDU con version + x224_connection_pdu(CC) + cert_chain + server_addr
   * 7. Envía el Response a WASM. Desencripta y canaliza los datos de sesión bidireccionales.
   */
  handleConnection(ws, session) {
    const viaBastion = session.useBastionWallix === true;
    console.log(`🔌 [RdpNativeBridgeService] Conectando a ${session.host}:${session.port}${viaBastion ? ` (bastion Wallix -> ${session.targetServer || 'destino en usuario'})` : ''}`);

    const connectionId = `native_rdp_${Date.now()}`;
    let targetSocket = null;
    let tlsSocket = null;

    this.activeConnections.set(connectionId, { ws, session });

    let rdCleanPathPhase = 'waiting_request';
    let savedX224Cc = null;
    let savedSelectedProtocol = null;
    let bytesToRdp = 0;
    let bytesFromRdp = 0;
    let framesFromRdp = 0;
    let framesToRdp = 0;
    let lastRdpFrameAt = 0;
    let lastWsFrameAt = 0;
    // Los frames dejan de loguearse pasado el #40 salvo en modo debug, justo cuando ocurren los
    // cierres inesperados. Se guarda una ventana de los ultimos para volcarla al cerrar. Se
    // registran los dos sentidos por separado: cuando IronRDP falla al decodificar hay que ver la
    // secuencia que se le entrego (ya remapeada), no la que llego del servidor.
    const recentRdpFrames = [];
    const recentWasmFrames = [];
    const RECENT_FRAMES_WINDOW = 15;
    let firstCloseSide = null;

    const trafficStats = createTrafficStats((line) => {
      console.log(`[Bridge] ${line}`);
      this.emit('diagnostic-log', { category: 'traffic', message: line });
    });

    const noteClose = (side) => {
      if (!firstCloseSide) firstCloseSide = side;
    };
    const channelFilter = createChannelFilterState();
    channelFilter.wallixService = wallixServiceFromSession(session);
    const frameSplitter = new RdpFrameSplitter();
    const framesDir = path.join(__dirname, '../../../testing/rdp/frames');
    if (process.env.NODETERM_RDP_RECORD_FRAMES === '1') {
      try { fs.mkdirSync(framesDir, { recursive: true }); } catch (_) { /* noop */ }
    }

    let isCleanedUp = false;

    const formatCloseReason = (reason) => {
      if (!reason) return 'Cerrado por el usuario';
      const r = String(reason);
      if (r.includes('WebSocket') || r.includes('WASM') || r.includes('usuario') || r.includes('user') || r.includes('tab')) {
        return 'Cerrado por el usuario';
      }
      if (r.includes('inactividad') || r.includes('idle') || r.includes('ETIMEDOUT') || r.includes('timeout')) {
        return 'Conexión cortada por inactividad o timeout';
      }
      if (r.includes('ECONNRESET') || r.includes('EPIPE') || r.includes('reiniciada')) {
        return 'Conexión cortada por el servidor remoto o la red (posible inactividad)';
      }
      if (r.includes('CLOSED') || r.includes('TLS socket closed') || r.includes('servidor remoto') || r.includes('FIN')) {
        return 'Cerrado por el servidor remoto';
      }
      if (r.includes('ECONNREFUSED')) {
        return 'Conexión rechazada por el servidor remoto';
      }
      return r;
    };

    const cleanup = (reason = 'Cerrado por el usuario', closeCode = 1000) => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      const formattedReason = formatCloseReason(reason);
      console.log(`🧹 [RdpNativeBridgeService] Sesión RDP finalizada (${formattedReason}) [toRdp=${framesToRdp} (${bytesToRdp}B), fromRdp=${framesFromRdp} (${bytesFromRdp}B)]`);
      console.log(`🔎 [Bridge] Primer extremo en cerrar: ${firstCloseSide || 'desconocido'}`);
      if (recentRdpFrames.length) {
        console.log(`🔎 [Bridge] Últimos ${recentRdpFrames.length} frames del servidor antes del cierre:`);
        for (const line of recentRdpFrames) {
          console.log(`   ${line}`);
        }
      }
      if (recentWasmFrames.length) {
        console.log(`🔎 [Bridge] Últimos ${recentWasmFrames.length} frames entregados a IronRDP WASM:`);
        for (const line of recentWasmFrames) {
          console.log(`   ${line}`);
        }
      }
      this.activeConnections.delete(connectionId);

      this.emit('session-closed', {
        connectionId,
        tokenId: session.id,
        reason: formattedReason,
        rawReason: String(reason || ''),
        closeCode,
        host: session.host,
        port: session.port
      });

      try {
        if (ws.readyState === ws.OPEN) {
          const safeReason = String(formattedReason).slice(0, 120);
          ws.close(closeCode >= 1000 && closeCode < 5000 ? closeCode : 1000, safeReason);
        } else {
          ws.close();
        }
      } catch (e) {}
      try { if (tlsSocket) tlsSocket.destroy(); } catch (e) {}
      try { if (targetSocket) targetSocket.destroy(); } catch (e) {}
      try { frameSplitter.reset(); } catch (e) {}
    };

    ws.on('message', (message) => {
      try {
        const payload = Buffer.isBuffer(message) ? message : Buffer.from(message);
        const isDebug = process.env.NODETERM_RDP_DEBUG === '1';

        if (rdCleanPathPhase === 'waiting_request' && payload.length > 0 && payload[0] === 0x30) {
          debugLog(`📥 [Bridge] Recibido RDCleanPath Request PDU (${payload.length} bytes). Extrayendo X.224 CR del tag [6]...`);

          let x224Cr = this.extractX224FromRdCleanPath(payload);
          if (!x224Cr || x224Cr.length === 0) {
            let samUser = session.username || 'nodeterm';
            if (samUser.includes('\\')) samUser = samUser.split('\\')[1];
            const cookieStr = `Cookie: mstshash=${samUser}\r\n`;
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
          debugLog(`📤 [Bridge] Conectando TCP a ${session.host}:${session.port}...`);

          targetSocket = net.connect({ host: session.host, port: session.port }, () => {
            targetSocket.setNoDelay(true);
            targetSocket.setKeepAlive(true, 15000);
            targetSocket.write(x224Cr);
          });

          targetSocket.once('data', (x224CcChunk) => {
            savedX224Cc = x224CcChunk;
            debugLog(`✅ [Bridge] Recibida X.224 Connection Confirm (${x224CcChunk.length} bytes). Iniciando TLS...`);

            // Upgrade TCP socket to TLS.
            // Para evadir el chequeo estricto de KEY_USAGE_BIT_INCORRECT en certificados
            // autofirmados de Windows RDP bajo BoringSSL/Electron, se usan ciphers RSA en TLS 1.2
            const tlsOptions = {
              socket: targetSocket,
              rejectUnauthorized: false,
              checkServerIdentity: () => undefined,
              minVersion: 'TLSv1',
              maxVersion: 'TLSv1.2',
              ciphers: 'ALL:DEFAULT:!ECDHE:!DHE:RSA'
            };

            let tlsEstablished = false;
            const onTlsHandshakeError = (err) => {
              if (tlsEstablished || isCleanedUp) return;
              console.error('❌ [RdpNativeBridgeService] Error en handshake TLS:', err.message);
              cleanup(`Error TLS Handshake: ${err.message}`, 4001);
            };

            tlsSocket = tls.connect(tlsOptions, () => {
              tlsEstablished = true;
              tlsSocket.removeListener('error', onTlsHandshakeError);
              tlsSocket.setNoDelay(true);
              tlsSocket.setKeepAlive(true, 15000);
              console.log(`🔒 [RdpNativeBridgeService] Conexión RDP TLS establecida con ${session.host}:${session.port}`);

              let peerCertChain = [];
              try {
                const cert = tlsSocket.getPeerCertificate(true);
                if (cert && cert.raw) {
                  peerCertChain.push(cert.raw);
                  debugLog(`📜 [Bridge] Certificado X.509 real obtenido (${cert.raw.length} bytes)`);
                }
              } catch (e) {
                console.warn('[Bridge] Error leyendo certificado peer:', e);
              }

              const nego = parseX224ConnectionConfirm(savedX224Cc);
              if (nego && nego.ok) {
                savedSelectedProtocol = nego.selectedProtocol;
                debugLog(`[Bridge] X.224 CC selectedProtocol=0x${nego.selectedProtocol.toString(16)} (${protocolName(nego.selectedProtocol)})`);
              } else if (nego && !nego.ok) {
                console.warn(`[Bridge] X.224 NEG_FAILURE code=${nego.failureCode}`);
              }

              const responsePdu = this.createRdCleanPathResponsePdu(session.host, savedX224Cc, peerCertChain);
              debugLog(`[Bridge] Enviando RDCleanPath Response PDU (${responsePdu.length} bytes) a WASM...`);

              if (ws.readyState === ws.OPEN) {
                try {
                  ws.send(responsePdu, { binary: true });
                } catch (sendErr) {
                  console.warn('[Bridge] Error enviando RDCleanPath Response:', sendErr.message);
                }
              }

              rdCleanPathPhase = 'transparent';

              tlsSocket.on('data', (chunk) => {
                // Separar frames concatenados respetando la segmentación TCP con memoria de estado
                // para que IronRDP WASM reciba cada PDU completa sin cortar bitmaps fragmentados
                const frames = frameSplitter.push(chunk);

                for (let frame of frames) {
                  const now = Date.now();
                  const gapFromLastRdp = lastRdpFrameAt > 0 ? now - lastRdpFrameAt : 0;
                  lastRdpFrameAt = now;

                  const n = frame.length;
                  framesFromRdp += 1;
                  const pduDesc = describeRdpPdu(frame);

                  recentRdpFrames.push(`#${framesFromRdp} ${n}B | ${pduDesc}`);
                  if (recentRdpFrames.length > RECENT_FRAMES_WINDOW) recentRdpFrames.shift();

                  // El motivo del cierre viaja en un PDU, no en el socket: se registra siempre.
                  const disconnectDesc = describeDisconnectPdu(frame);
                  if (disconnectDesc) {
                    const discMsg = `🛑 [Bridge] El servidor anuncia cierre en frame#${framesFromRdp}: ${disconnectDesc}`;
                    console.warn(discMsg);
                    this.emit('diagnostic-log', { category: 'disconnect', message: discMsg });
                  }

                  if ((framesFromRdp <= 20 && !isFastPathNoise(pduDesc)) || isDebug) {
                    console.log(`[Bridge] RDP in frame#${framesFromRdp}: ${n}B | ${pduDesc}`);
                    if (process.env.NODETERM_RDP_RECORD_FRAMES === '1') {
                      try {
                        fs.writeFileSync(path.join(framesDir, `from-${String(framesFromRdp).padStart(2, '0')}-${n}b.hex`), frame.toString('hex'), 'utf8');
                      } catch (_) { /* noop */ }
                    }
                  } else if (gapFromLastRdp >= 400 && isDebug) {
                    console.log(`⏱️ [Bridge Trace GAP ${gapFromLastRdp}ms] Pausa RDP -> Frame #${framesFromRdp} (${n}B): ${pduDesc}`);
                    if (process.env.NODETERM_RDP_RECORD_FRAMES === '1') {
                      try {
                        fs.writeFileSync(path.join(framesDir, `gap-${gapFromLastRdp}ms-from-f${framesFromRdp}-${n}b.hex`), frame.toString('hex'), 'utf8');
                      } catch (_) { /* noop */ }
                    }
                  } else if (
                    isDebug && (
                      pduDesc.includes('DEMAND_ACTIVE') ||
                      pduDesc.includes('DEACTIVATE_ALL') ||
                      pduDesc.includes('AUTODETECT') ||
                      pduDesc.includes('HEARTBEAT') ||
                      pduDesc.includes('CONTROL') ||
                      pduDesc.includes('SAVE_SESSION_INFO') ||
                      pduDesc.includes('SET_ERROR_INFO') ||
                      pduDesc.includes('FRAME_ACK') ||
                      pduDesc.includes('SURFACE_CMDS')
                    )
                  ) {
                    console.log(`📡 [Bridge Trace PDU #${framesFromRdp}] ${pduDesc}`);
                  }

                  // Wallix FontMap a veces trae mapFlags invalidos para IronRDP (from_bits).
                  // Solo forzar FIRST|LAST; NO reclasificar a UPDATE (rompe FontMap con glifos).
                  const fontPatch = patchFontSequenceFlags(frame);
                  if (fontPatch.candidates.length && isDebug) {
                    console.log(`[Bridge] FontPdu frame#${framesFromRdp}:`, fontPatch.candidates.map((c) => `len=${c.totalLength} type2=0x${c.type2.toString(16)} flags=0x${c.flags.toString(16)} entry=${c.entrySize}`).join('; '));
                  }
                  if (fontPatch.patchedCount) {
                    frame = fontPatch.buf;
                    if (isDebug) {
                      console.log(`[Bridge] FontPdu adjust flags=${fontPatch.patchedCount}`, fontPatch.details.map((d) => `len=${d.totalLength} 0x${d.previous.toString(16)}->0x${d.next.toString(16)}`).join(', '));
                    }
                  }

                  // IronRDP 0.7: message channel (1001) no soportado -> no reenviar a WASM,
                  // pero responder Auto-Detect RTT/BW para que Wallix no espere (pantalla negra).
                  const wasReady = channelFilter.ready;
                  const prevWriteCh = channelFilter.cliprdrWriteChannelId;
                  const processed = processServerFrame(channelFilter, frame);
                  if (channelFilter.cliprdrWriteChannelId != null &&
                      channelFilter.cliprdrWriteChannelId !== prevWriteCh) {
                    const writeName = channelFilter.channelIdToName instanceof Map
                      ? (channelFilter.channelIdToName.get(channelFilter.cliprdrWriteChannelId) || '?')
                      : '?';
                    const greetCh = channelFilter.serverCliprdrChannelId;
                    console.log(`[Bridge] cliprdr write path=${channelFilter.cliprdrWriteChannelId} (${writeName}); saludo por ${greetCh}`);
                  }
                  if (channelFilter.cliprdrWriteChannelId != null) {
                    this.flushPendingClientCliprdr(channelFilter, tlsSocket, ws, (n) => {
                      bytesToRdp += n;
                    });
                  }
                  if (!wasReady && channelFilter.ready) {
                    const chDetails = [
                      `io=${channelFilter.ioChannelId}`,
                      `permitidos=[${[...channelFilter.allowed].join(',')}]`,
                      channelFilter.cliprdrChannelId != null ? `cliprdr=${channelFilter.cliprdrChannelId}` : 'cliprdr=NO_ASIGNADO',
                      channelFilter.serverCliprdrChannelId != null && channelFilter.serverCliprdrChannelId !== channelFilter.cliprdrChannelId
                        ? `cliprdr-servidor=${channelFilter.serverCliprdrChannelId}`
                        : null,
                      channelFilter.drdynvcChannelId != null ? `drdynvc=${channelFilter.drdynvcChannelId}` : null,
                      channelFilter.channelIdToName && channelFilter.channelIdToName.size
                        ? `declarados=[${[...channelFilter.channelIdToName.entries()].map(([id, n]) => `${id}:${n}`).join(',')}]`
                        : null,
                      channelFilter.messageChannelId != null ? `msg=${channelFilter.messageChannelId}` : null
                    ].filter(Boolean).join(' ');
                    console.log(`🔬 [RDP Bridge] Canales MCS servidor: ${chDetails}`);
                    this.emit('diagnostic-log', {
                      category: 'channels',
                      message: `Canales MCS servidor: ${chDetails}`
                    });
                  }
                  if (processed.isCliprdr && !isCliprdrFragmentDesc(processed.cliprdrDesc)) {
                    const via = processed.serverChannelId != null && processed.serverChannelId !== processed.channelId
                      ? ` <-ch=${processed.serverChannelId}`
                      : '';
                    const clipLog = `📥 cliprdr ch=${processed.channelId}${via} ${processed.cliprdrDesc || 'PDU'}`;
                    console.log(`📋 ${clipLog}`);
                    this.emit('diagnostic-log', {
                      category: 'cliprdr',
                      message: clipLog
                    });
                  }
                  if (processed.dropped && (rdpDebug() || !isNoisyDrop(processed.note))) {
                    const note = String(processed.note || '').replace(/ hex=[0-9a-f]+/i, '');
                    const dropMsg = `MCS ch=${processed.channelId}: ${note}` +
                      (processed.replies.length ? ` (replies=${processed.replies.length})` : '');
                    console.log(`🚫 DROPPED #${framesFromRdp} ${dropMsg}`);
                    if (processed.channelId !== channelFilter.ioChannelId) {
                      this.emit('diagnostic-log', {
                        category: 'dropped',
                        message: `DROPPED frame #${framesFromRdp} (ch=${processed.channelId}): ${processed.note}`
                      });
                    }
                    if (processed.replies.length && tlsSocket && tlsSocket.writable) {
                      for (const reply of processed.replies) {
                        bytesToRdp += reply.length;
                        tlsSocket.write(reply);
                      }
                    }
                    bytesFromRdp += n;
                    trafficStats.note(`DROP ${pduDesc}`, n);
                    continue;
                  }
                  frame = processed.forward;

                  // FastPath y el resto de frames sueltos no se listan: saturan el log y tapan cliprdr.
                  if (!processed.isCliprdr && !isFastPathNoise(pduDesc) && (framesFromRdp <= 20 || rdpDebug())) {
                    console.log(`[Bridge] RDP->WASM frame#${framesFromRdp}: ${frame.length}B | ${pduDesc}`);
                  }

                  // Normalizar todas las teselas 16bpp a estándar 0xf3/0xf4 y <=64x64
                  const stridePatch = fixWallixBitmapStrideCrop(frame);
                  const outChunks = stridePatch.patchedCount
                    ? (stridePatch.buffers || [stridePatch.buf])
                    : [frame];
                  if (stridePatch.patchedCount && isDebug) {
                    console.log(
                      `[Bridge] FastPath BITMAP normalizado frame#${framesFromRdp}: rects=${stridePatch.numberRectangles} patched=${stridePatch.patchedCount}` +
                        (stridePatch.solidCount != null ? ` solid=${stridePatch.solidCount} crop=${stridePatch.cropCount}` : '') +
                        (stridePatch.pduCount > 1 ? ` pdus=${stridePatch.pduCount}` : '')
                    );
                  }

                  bytesFromRdp += n;
                  trafficStats.note(pduDesc, n);
                  if (ws.readyState === ws.OPEN) {
                    try {
                      for (const out of outChunks) {
                        if (!out || typeof out.length !== 'number') continue;
                        recentWasmFrames.push(
                          `#${framesFromRdp} ${out.length}B | ${describeRdpPdu(out)}` +
                          (processed.serverChannelId != null && processed.serverChannelId !== processed.channelId
                            ? ` [remap ch=${processed.serverChannelId}->${processed.channelId}]`
                            : '')
                        );
                        if (recentWasmFrames.length > RECENT_FRAMES_WINDOW) recentWasmFrames.shift();
                        ws.send(out, { binary: true });
                      }
                    } catch (sendErr) {
                      console.warn('[Bridge] Error enviando frames a WebSocket:', sendErr.message);
                    }
                  }
                }
              });

              tlsSocket.on('end', () => {
                noteClose('servidor RDP (FIN de TLS)');
                if (!isCleanedUp) {
                  cleanup('Cerrado por el servidor remoto (FIN)', 1000);
                }
              });

              tlsSocket.on('close', () => {
                noteClose('servidor RDP (cierre de TLS)');
                if (!isCleanedUp) {
                  cleanup('Cerrado por el servidor remoto', 1000);
                }
              });

              tlsSocket.on('error', (err) => {
                if (!isCleanedUp) {
                  const isReset = err.message && (err.message.includes('ECONNRESET') || err.message.includes('EPIPE'));
                  if (isReset) {
                    console.log('ℹ️ [RdpNativeBridgeService] Conexión TLS restablecida por el host remoto o corte de red (ECONNRESET/EPIPE)');
                    cleanup('Conexión cortada por el servidor remoto o la red (posible inactividad)', 4002);
                  } else {
                    console.error('❌ [RdpNativeBridgeService] Error de conexión TLS:', err.message);
                    cleanup(`Error TLS: ${err.message}`, 4003);
                  }
                }
              });
            });

            tlsSocket.once('error', onTlsHandshakeError);
          });

          targetSocket.on('end', () => {
            if (!isCleanedUp && rdCleanPathPhase !== 'transparent') {
              cleanup('Conexión TCP finalizada por el servidor (FIN)', 1000);
            }
          });

          targetSocket.on('error', (err) => {
            if (!isCleanedUp) {
              const isBenign = err.message && (err.message.includes('ECONNRESET') || err.message.includes('EPIPE'));
              if (!isBenign) {
                console.error('❌ [RdpNativeBridgeService] Error TCP:', err.message);
              }
              cleanup(isBenign ? 'Conexión cortada por el servidor remoto o la red' : `Error TCP: ${err.message}`, 4004);
            }
          });

          targetSocket.on('close', () => {
            if (rdCleanPathPhase !== 'transparent' && !isCleanedUp) {
              cleanup('Conexión TCP cerrada antes de TLS', 4005);
            }
          });

          return;
        }

        // Primer frame post-TLS: MCS Connect Initial. Parches CS_CORE para bastiones TLS Direct.
        let forward = payload;
        if (rdCleanPathPhase === 'transparent') {
          const now = Date.now();
          const gapFromLastWs = lastWsFrameAt > 0 ? now - lastWsFrameAt : 0;
          lastWsFrameAt = now;

          framesToRdp += 1;
          const chsLearned = learnClientInitiator(channelFilter, payload);
          if (chsLearned || framesToRdp === 1) {
            const reqChs = channelFilter.clientChannelNames && channelFilter.clientChannelNames.length
              ? channelFilter.clientChannelNames.join(', ')
              : 'ninguno detectado';
            const chMsg = `Canales solicitados por cliente WASM (TS_UD_CS_NET): [${reqChs}] (initiator=0x${channelFilter.clientInitiator.toString(16)})`;
            console.log(`🔬 [RDP Bridge] ${chMsg}`);
            this.emit('diagnostic-log', { category: 'client-channels', message: chMsg });
          }

          // IronRDP agrupa varios PDUs en un mismo mensaje WebSocket: initiate_copy, estando en
          // estado Initialization, emite Capabilities + TemporaryDirectory + FormatList de una sola
          // vez (ironrdp-cliprdr). Tratando solo el primero, el remapeo de canal y la limpieza de
          // flags se aplicaban a uno y no a los otros dos (lote incoherente, que es lo que tumbaba
          // la sesión), y descartar el primero tiraba el lote entero: el FormatList no salía nunca,
          // el servidor no podía responder FormatListResponse y el cliente no llegaba a Ready.
          const clientFrames = splitTpktFrames(payload);
          const keptClientFrames = [];
          const wasmInjections = [];
          let clientFramesChanged = false;
          for (const clientFrame of clientFrames) {
            const { forward: kept, inject } = this.filterClientVirtualChannelFrame(clientFrame, channelFilter);
            if (kept !== clientFrame) clientFramesChanged = true;
            if (kept) keptClientFrames.push(kept);
            if (inject && inject.length) wasmInjections.push(...inject);
          }
          if (clientFramesChanged) {
            forward = keptClientFrames.length ? Buffer.concat(keptClientFrames) : null;
          }

          // Las inyecciones salen despues de reenviar el lote al servidor, para que IronRDP no vea
          // el acuse antes de haber terminado de emitir lo que lo provoca.
          if (wasmInjections.length && ws.readyState === ws.OPEN) {
            setImmediate(() => {
              if (ws.readyState !== ws.OPEN) return;
              for (const frame of wasmInjections) {
                try {
                  ws.send(frame, { binary: true });
                } catch (e) {
                  console.warn('[Bridge] No se pudo inyectar PDU cliprdr hacia WASM:', e.message);
                }
              }
            });
          }

          const pduDesc = describeRdpPdu(payload);

          if (framesToRdp <= 8 || isDebug) {
            if (framesToRdp <= 24) {
              console.log(`[Bridge] WASM->RDP frame#${framesToRdp}: ${payload.length}B | ${pduDesc}`);
              if (process.env.NODETERM_RDP_RECORD_FRAMES === '1') {
                try {
                  fs.writeFileSync(path.join(framesDir, `to-${String(framesToRdp).padStart(2, '0')}-${payload.length}b.hex`), payload.toString('hex'), 'utf8');
                } catch (_) { /* noop */ }
              }
            } else if (gapFromLastWs >= 400) {
              console.log(`📤 [Bridge Trace WASM GAP ${gapFromLastWs}ms] WASM->RDP #${framesToRdp} (${payload.length}B): ${pduDesc}`);
            } else if (
              pduDesc.includes('CONFIRM_ACTIVE') ||
              pduDesc.includes('AUTODETECT') ||
              pduDesc.includes('CONTROL') ||
              pduDesc.includes('FONTLIST') ||
              pduDesc.includes('SYNCHRONIZE') ||
              pduDesc.includes('FRAME_ACK')
            ) {
              console.log(`📤 [Bridge Trace WASM PDU #${framesToRdp}] ${pduDesc}`);
            }
          }
        }
        if (bytesToRdp === 0 && rdCleanPathPhase === 'transparent') {
          const core = findClientCoreData(payload);
          if (isDebug) {
            console.log(`[Bridge] Primer frame WASM->RDP: ${payload.length} bytes; CS_CORE=${core ? `len=${core.length} serverSelectedProtocol=0x${(core.serverSelectedProtocol ?? -1).toString(16)}` : 'no'}`);
            try {
              const dumpPath = path.join(__dirname, '../../../testing/rdp/last-mcs-connect-initial.hex');
              fs.mkdirSync(path.dirname(dumpPath), { recursive: true });
              fs.writeFileSync(dumpPath, payload.toString('hex'), 'utf8');
              console.log(`[Bridge] Dump MCS en ${dumpPath}`);
            } catch (dumpErr) {
              console.warn('[Bridge] No se pudo escribir dump MCS:', dumpErr.message);
            }
          }

          const prepared = prepareMcsConnectInitial(payload, savedSelectedProtocol, {
            injectChannels: resolveInjectedChannels(session)
          });
          forward = prepared.buf;
          const sentChs = findClientNetworkChannels(prepared.buf);
          // Una linea por conexion, siempre: el juego de canales condiciona todo el resto de la
          // sesion y sin este rastro una inyeccion que no se aplica no se distingue de una que si.
          const wallixService = wallixServiceFromSession(session) || 'n/a';
          const csNet = sentChs.length ? sentChs.join(',') : 'ninguno';
          console.log(`[Bridge] MCS prepare: service=${wallixService} CS_NET=[${csNet}]; ${prepared.notes.join('; ') || 'sin cambios'}`);
          if (sentChs.length) {
            if (!channelFilter.wasmChannelNames || channelFilter.wasmChannelNames.length === 0) {
              channelFilter.wasmChannelNames = (channelFilter.clientChannelNames || []).slice();
            }
            channelFilter.clientChannelNames = sentChs;
          }
        } else if (framesToRdp <= 10 && forward) {
          const infoResult = patchInfoPacket(forward, session);
          if (infoResult.patched) {
            forward = infoResult.buf;
            if (isDebug) {
              console.log(`[Bridge] TS_INFO_PACKET ajustado: ${infoResult.changes.join(', ')}`);
            }
          }
        }
        if (forward && forward.length > 0) {
          bytesToRdp += forward.length;
          if (tlsSocket && tlsSocket.writable) {
            tlsSocket.write(forward);
          } else if (targetSocket && targetSocket.writable) {
            targetSocket.write(forward);
          }
        }
      } catch (e) {
        console.error('Error enviando datos a RDP:', e);
      }
    });

    ws.on('close', (code, reasonBuf) => {
      const reasonStr = reasonBuf ? reasonBuf.toString() : '';
      noteClose(`IronRDP WASM (cierre de WebSocket code=${code || 1000})`);
      cleanup(reasonStr || 'Cerrado por el usuario', code || 1000);
    });
    ws.on('error', (e) => {
      noteClose(`IronRDP WASM (error de WebSocket: ${e.message})`);
      const isBenign = e.message && (e.message.includes('ECONNRESET') || e.message.includes('closed'));
      cleanup(isBenign ? 'Cerrado por el usuario' : `Error WebSocket: ${e.message}`, 1006);
    });
  }

  /**
   * Guardarrailes: el saludo cliprdr cayo en un canal que no es el VC cliprdr
   * (1001 usuario, rdpsnd, IO). No es el camino de producto. FORMAT_LIST en 1004
   * cierra el TLS. TEMPDIR congela. CAPS en rdpsnd deja la pantalla en negro.
   * CHANNEL_PDU en MCS 1001 congela el grafico: nunca se escribe ahi.
   */
  filterClientCliprdrOnUserChannel(frame, parsed, channelFilter, clipDesc) {
    const dest = channelFilter.serverCliprdrChannelId || channelFilter.cliprdrOnUnsafeChannel || 1001;
    const negotiated = channelFilter.cliprdrChannelId;
    const keepClientCaps = isUserMcsChannel(channelFilter, dest);
    const inject = [];
    if (!channelFilter.loggedCliprdrMisaligned) {
      channelFilter.loggedCliprdrMisaligned = true;
      const csNet = Array.isArray(channelFilter.clientChannelNames)
        ? channelFilter.clientChannelNames.join(',')
        : '?';
      const destName = channelFilter.channelIdToName instanceof Map
        ? (channelFilter.channelIdToName.get(dest) || 'sin-nombre')
        : 'sin-nombre';
      const misMsg = `[Bridge] APP cliprdr no alineado; CS_NET=[${csNet}] dest=${dest} (${destName})`;
      console.log(misMsg);
      this.emit('diagnostic-log', { category: 'cliprdr-misaligned', message: misMsg });
    }
    const synthAck = () => {
      if (!isCliprdrFormatListDesc(clipDesc) || channelFilter.cliprdrFormatListAcked) return;
      channelFilter.cliprdrFormatListAcked = true;
      inject.push(buildCliprdrFormatListResponseOk(0, negotiated));
      const ackMsg = '[Bridge] CB_FORMAT_LIST_RESPONSE(OK) sintetizado hacia WASM ' +
        `(FORMAT_LIST por ${negotiated} cierra la sesion si el saludo fue por ${dest})`;
      console.log(ackMsg);
      this.emit('diagnostic-log', { category: 'cliprdr', message: ackMsg });
    };

    if (clipDesc && clipDesc.includes('CB_TEMP_DIRECTORY')) {
      const dropMsg = `[Bridge] CB_TEMP_DIRECTORY del cliente descartado (destino ${dest}): ${clipDesc}`;
      console.log(dropMsg);
      this.emit('diagnostic-log', { category: 'cliprdr-tempdir-drop', message: dropMsg });
      return { forward: null, inject };
    }

    if (!keepClientCaps && clipDesc && clipDesc.includes('CB_CLIP_CAPS')) {
      const dropMsg = `[Bridge] CB_CLIP_CAPS del cliente descartado (destino ${dest} congela el grafico): ${clipDesc}`;
      console.log(dropMsg);
      this.emit('diagnostic-log', { category: 'cliprdr-caps-drop', message: dropMsg });
      return { forward: null, inject };
    }

    synthAck();

    if (clipDesc && clipDesc.includes('CB_FORMAT_DATA_REQUEST')) {
      channelFilter.cliprdrDataRequested = true;
    }

    // MCS 1001/1002: CHANNEL_PDU deja el TLS vivo y congela el grafico (pantalla negra).
    // Se encola por si mas tarde se confirma el VC cliprdr estatico (1004).
    if (keepClientCaps) {
      enqueueClientCliprdr(channelFilter, frame);
      if (!channelFilter.loggedCliprdrUserMute) {
        channelFilter.loggedCliprdrUserMute = true;
        const muteMsg = `[Bridge] cliprdr WASM->RDP encolado: no se escribe CHANNEL_PDU en MCS ${dest} (congela el grafico)`;
        console.log(muteMsg);
        this.emit('diagnostic-log', { category: 'cliprdr-mute', message: muteMsg });
      }
      return { forward: null, inject };
    }

    if (!allowUserChannelCliprdr()) {
      enqueueClientCliprdr(channelFilter, frame);
      if (!channelFilter.loggedCliprdrUserMute) {
        channelFilter.loggedCliprdrUserMute = true;
        const muteMsg = `[Bridge] cliprdr WASM->RDP encolado: no se escribe CHANNEL_PDU en ${negotiated} (cierra si dest=${dest})`;
        console.log(muteMsg);
        this.emit('diagnostic-log', { category: 'cliprdr-mute', message: muteMsg });
      }
      return { forward: null, inject };
    }

    let out = rewriteMcsChannelId(frame, dest) || frame;
    const cleaned = clearChannelPduShowProtocol(out, parsed.dataOff);
    if (cleaned) out = cleaned;
    if (!channelFilter.loggedCliprdrUserRemap) {
      channelFilter.loggedCliprdrUserRemap = true;
      const remapMsg = `[Bridge] cliprdr WASM->RDP remapeado ch=${parsed.channelId}->${dest} (escribir en ${negotiated} cierra la sesion)`;
      console.log(remapMsg);
      this.emit('diagnostic-log', { category: 'cliprdr', message: remapMsg });
    }
    return { forward: out, inject };
  }

  /**
   * Si el write path se confirma en un VC estatico (p.ej. MONITOR_READY en 1004 tras CAPS en 1001),
   * se vacia la cola de PDUs del cliente hacia ese canal.
   */
  flushPendingClientCliprdr(channelFilter, tlsSocket, ws, onBytes) {
    const pending = takePendingClientCliprdr(channelFilter);
    if (!pending.length) return;
    const wasmInjections = [];
    for (const queued of pending) {
      const { forward, inject } = this.filterClientVirtualChannelFrame(queued, channelFilter);
      if (forward && tlsSocket && tlsSocket.writable) {
        if (typeof onBytes === 'function') onBytes(forward.length);
        tlsSocket.write(forward);
      }
      if (inject && inject.length) wasmInjections.push(...inject);
    }
    if (wasmInjections.length && ws && ws.readyState === ws.OPEN) {
      setImmediate(() => {
        if (ws.readyState !== ws.OPEN) return;
        for (const frame of wasmInjections) {
          try {
            ws.send(frame, { binary: true });
          } catch (e) {
            console.warn('[Bridge] No se pudo inyectar PDU cliprdr hacia WASM:', e.message);
          }
        }
      });
    }
  }

  /**
   * Filtra un unico PDU MCS que el cliente WASM envia por un canal virtual estatico.
   * Devuelve { forward, inject }: el frame a reenviar al servidor (el mismo, uno reescrito, o null
   * para descartarlo) y los PDUs que hay que inyectar de vuelta hacia WASM.
   *
   * Trabaja sobre un frame suelto a proposito: IronRDP agrupa varios PDUs cliprdr en un mismo
   * mensaje WebSocket y cada uno necesita su propio remapeo de canal y su propia limpieza de flags.
   */
  filterClientVirtualChannelFrame(frame, channelFilter) {
    const parsed = parseMcsSendData(frame);
    if (!parsed || parsed.channelId === channelFilter.ioChannelId) {
      return { forward: frame, inject: [] };
    }

    const isClip = channelFilter.cliprdrChannelId != null &&
      parsed.channelId === channelFilter.cliprdrChannelId;
    const clipDesc = isClip ? describeCliprdrPdu(parsed.userData) : null;
    if (isClip && !isCliprdrFragmentDesc(clipDesc)) {
      const wasmMsg = `📤 cliprdr ch=${parsed.channelId} ${clipDesc}`;
      console.log(`📋 ${wasmMsg}`);
      this.emit('diagnostic-log', { category: 'wasm-channel', message: wasmMsg });
    }

    if (!isClip) return { forward: frame, inject: [] };

    // Aviso de orden CLIPRDR: el cliente no deberia emitir nada antes de CB_MONITOR_READY
    // (MS-RDPECLIP 1.3.2.1). No se descarta el PDU, solo se avisa.
    if (!channelFilter.cliprdrServerReady) {
      const guardMsg = `⚠️ [Bridge] PDU cliprdr WASM->RDP antes de CB_MONITOR_READY (se reenvía igualmente): ${clipDesc}`;
      console.warn(guardMsg);
      this.emit('diagnostic-log', { category: 'cliprdr-order', message: guardMsg });
    }

    // Saludo en un VC estatico (cliprdr 1004/1006, o el que Session Probe elija: a veces
    // rdpsnd 1005). El handshake es el de ESJC: remap de ID, flags 0x13, acuse real.
    // Tirar CAPS o sintetizar ACK ahi deja el canal a medias. 1001/IO siguen mute.
    const writeCh = channelFilter.cliprdrWriteChannelId;
    const serverClipCh = channelFilter.serverCliprdrChannelId;
    const greetingOnAlignedStatic = serverClipCh != null
      && !isUserMcsChannel(channelFilter, serverClipCh)
      && (channelFilter.ioChannelId == null || serverClipCh !== channelFilter.ioChannelId)
      && isSafeStaticCliprdrWrite(channelFilter, serverClipCh)
      && (writeCh == null || writeCh === serverClipCh);
    const isBastion = serverClipCh != null
      && serverClipCh !== channelFilter.cliprdrChannelId
      && !greetingOnAlignedStatic;
    const destName = channelFilter.channelIdToName instanceof Map
      ? channelFilter.channelIdToName.get(serverClipCh)
      : null;
    // rdpsnd/rdpdr: escribir cliprdr ahi calla el canal. 1001/1002/IO son canales MCS de
    // usuario, no VCs: escribir ahi deja el TLS vivo pero congela el grafico.
    const destIsForeignStaticVc = Boolean(destName) && destName !== 'cliprdr';
    const destIsIoChannel = channelFilter.ioChannelId != null
      && serverClipCh === channelFilter.ioChannelId;
    // Un CAPS en 1001 no bloquea la escritura si luego se confirma el VC negociado (1004).
    // Forzar el handshake a 1004 cuando el saludo fue por 1001 cierra ESAH (TLS FIN).
    const destIsUserChannel = writeCh == null && (
      isUserMcsChannel(channelFilter, serverClipCh)
      || (channelFilter.cliprdrOnUnsafeChannel != null
          && (serverClipCh == null || isUserMcsChannel(channelFilter, serverClipCh)
              || serverClipCh === channelFilter.cliprdrOnUnsafeChannel))
    );

    if (isClip && destIsIoChannel) {
      const dest = serverClipCh || channelFilter.cliprdrOnUnsafeChannel;
      const muteMsg = `[Bridge] cliprdr WASM->RDP silenciado: no se escribe CHANNEL_PDU en el canal IO (${dest})`;
      console.log(muteMsg);
      this.emit('diagnostic-log', { category: 'cliprdr-mute', message: muteMsg });
      return { forward: null, inject: [] };
    }

    // Destino distinto del VC negociado (APP/ESAH 1001, rdpsnd 1005).
    // FORMAT_LIST en 1004 cierra el TLS. TEMPDIR siempre se tira. CHANNEL_PDU en
    // MCS 1001 congela el grafico. CAPS en rdpsnd deja la pantalla en negro.
    if (isClip && (destIsUserChannel || (writeCh == null && destIsForeignStaticVc))) {
      return this.filterClientCliprdrOnUserChannel(frame, parsed, channelFilter, clipDesc);
    }

    const handshakeDest = writeCh != null ? writeCh : serverClipCh;
    const handshakeName = channelFilter.channelIdToName instanceof Map
      ? channelFilter.channelIdToName.get(handshakeDest)
      : null;
    const greetingOnHandshakeDest = handshakeDest != null && serverClipCh === handshakeDest;
    // CAPS/TEMPDIR en rdpsnd solo se tiran si el saludo NO fue ahi. Si Probe saluda
    // por 1005, ese canal ES cliprdr en esta sesion (ESAH lo ha hecho).
    if (isClip && handshakeName === 'rdpsnd' && clipDesc && clipDesc.includes('CB_CLIP_CAPS')
        && !greetingOnHandshakeDest) {
      const dropMsg = `[Bridge] CB_CLIP_CAPS del cliente descartado (destino ${handshakeDest} congela el grafico): ${clipDesc}`;
      console.log(dropMsg);
      this.emit('diagnostic-log', { category: 'cliprdr-caps-drop', message: dropMsg });
      return { forward: null, inject: [] };
    }
    if (isClip && (handshakeName === 'rdpsnd' || handshakeName === 'rdpdr') &&
        clipDesc && clipDesc.includes('CB_TEMP_DIRECTORY') && !greetingOnHandshakeDest) {
      const dropMsg = `[Bridge] CB_TEMP_DIRECTORY del cliente descartado (destino ${handshakeDest}): ${clipDesc}`;
      console.log(dropMsg);
      this.emit('diagnostic-log', { category: 'cliprdr-tempdir-drop', message: dropMsg });
      return { forward: null, inject: [] };
    }

    const dropCaps = isBastion && clipDesc && clipDesc.includes('CB_CLIP_CAPS') &&
      readDiagFlag('NODETERM_RDP_CLIPRDR_DROP_CLIENT_CAPS');
    if (dropCaps) {
      const dropMsg = `[Bridge] CB_CLIP_CAPS del cliente descartado (el bastion corta al recibirlo): ${clipDesc}`;
      console.log(dropMsg);
      this.emit('diagnostic-log', { category: 'cliprdr-caps-drop', message: dropMsg });
      return { forward: null, inject: [] };
    }

    const dropTemp = isBastion && clipDesc && clipDesc.includes('CB_TEMP_DIRECTORY') &&
      readDiagFlag('NODETERM_RDP_CLIPRDR_DROP_CLIENT_TEMPDIR');
    if (dropTemp) {
      const dropMsg = `🔇 [Bridge] CB_TEMP_DIRECTORY del cliente descartado (ruta relativa): ${clipDesc}`;
      console.log(dropMsg);
      this.emit('diagnostic-log', { category: 'cliprdr-tempdir-drop', message: dropMsg });
      return { forward: null, inject: [] };
    }

    // Experimento de diagnostico: silencia por completo el sentido cliente->servidor del canal
    // cliprdr sin tocar el contrario. Aisla si el cierre lo provoca el dato del cliente.
    if (readDiagFlag('NODETERM_RDP_CLIPRDR_MUTE_CLIENT')) {
      const muteMsg = `🔇 [Bridge] cliprdr WASM->RDP silenciado (experimento): ${clipDesc}`;
      console.log(muteMsg);
      this.emit('diagnostic-log', { category: 'cliprdr-mute', message: muteMsg });
      return { forward: null, inject: [] };
    }

    // Marca que el cliente ya ha pedido el contenido del portapapeles: a partir de aqui interesa
    // ver todos los frames del servidor para saber si contesta, si calla o si algo se descarta.
    if (clipDesc && clipDesc.includes('CB_FORMAT_DATA_REQUEST')) {
      channelFilter.cliprdrDataRequested = true;
    }

    let out = frame;
    const inject = [];

    // Se escribe en el canal por el que el servidor entrega cliprdr de verdad, que es el que
    // aprende el filtro, no en el que negocio el cliente: el bastion usa uno distinto y cambia
    // entre sesiones. Conexiones directas: serverClipCh coincide con el del cliente y no se toca.
    // 1001/IO no. Un VC estatico ajeno (rdpsnd) si es el write path confirmado (saludo ahi).
    const remapDest = writeCh != null ? writeCh : serverClipCh;
    const canRemap = !readDiagFlag('NODETERM_RDP_CLIPRDR_NO_REMAP') &&
      remapDest != null &&
      remapDest !== parsed.channelId &&
      (writeCh != null || !destIsForeignStaticVc) &&
      !destIsUserChannel &&
      !destIsIoChannel;

    if (canRemap) {
      const remapped = rewriteMcsChannelId(out, remapDest);
      if (remapped) {
        out = remapped;
        if (rdpDebug() || !channelFilter.loggedCliprdrRemap) {
          channelFilter.loggedCliprdrRemap = true;
          const remapMsg = `📤 [Bridge] cliprdr WASM->RDP remapeado ch=${parsed.channelId}->${remapDest}`;
          console.log(remapMsg);
          this.emit('diagnostic-log', { category: 'cliprdr', message: remapMsg });
        }
      }
    }

    // IronRDP marca CHANNEL_FLAG_SHOW_PROTOCOL (flags=0x13) mientras el bastion emite 0x03.
    // Solo se limpia al escribir en el canal del bastion. Si el PDU se queda en el canal
    // negociado (1004), 0x13 es el encuadre correcto de un cliente normal.
    if (isBastion && canRemap) {
      const cleaned = clearChannelPduShowProtocol(out, parsed.dataOff);
      if (cleaned) {
        out = cleaned;
        if (rdpDebug()) {
          const flagMsg = '📤 [Bridge] CHANNEL_FLAG_SHOW_PROTOCOL limpiado en cliprdr WASM->RDP (bastión)';
          console.log(flagMsg);
          this.emit('diagnostic-log', { category: 'cliprdr', message: flagMsg });
        }
      }
    }

    // El saludo CLIPRDR del bastion se queda a medias y hay que cerrarlo aqui.
    //
    // En ironrdp-cliprdr, un cliente solo pasa a estado Ready al recibir un FormatListResponse::Ok,
    // y sin Ready rechaza toda operacion de portapapeles ("clipboard channel is not in Ready
    // state"). El bastion nunca lo envia: no admite el CB_CLIP_CAPS del cliente (por el canal
    // negociado corta la sesion, y por el suyo deja la pantalla en negro), y sin capacidades
    // ignora el CB_FORMAT_LIST. Queda un callejon sin salida en el que el portapapeles no puede
    // arrancar nunca.
    //
    // Se sintetiza la respuesta hacia WASM. No se inventa nada del protocolo: es el acuse que
    // corresponde a la lista que el cliente acaba de enviar, y un duplicado posterior del servidor
    // es inocuo, porque en ese estado ironrdp-cliprdr solo lo traza. Solo aplica con bastion, asi
    // que las conexiones directas siguen recibiendo el acuse real de su servidor.
    if (isBastion && clipDesc && clipDesc.includes('CB_FORMAT_LIST') &&
        !clipDesc.includes('CB_FORMAT_LIST_RESPONSE') &&
        !channelFilter.cliprdrFormatListAcked) {
      channelFilter.cliprdrFormatListAcked = true;
      // initiator 0: es el valor que lleva el bastion en sus propias indicaciones cliprdr
      // (cabecera MCS observada 68 0000 03e9), asi que el acuse es indistinguible de uno real.
      inject.push(buildCliprdrFormatListResponseOk(0, channelFilter.cliprdrChannelId));
      const ackMsg = '📥 [Bridge] CB_FORMAT_LIST_RESPONSE(OK) sintetizado hacia WASM ' +
        '(el bastión no lo envía y sin él IronRDP nunca pasa a Ready)';
      console.log(ackMsg);
      this.emit('diagnostic-log', { category: 'cliprdr', message: ackMsg });
    }

    return { forward: out, inject };
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
      debugLog(`📜 [RdpNativeBridgeService] Certificado X.509 DER autofirmado generado (${derBytes.length} bytes)`);
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
      try { conn.ws?.close(); } catch (e) {}
      try { if (conn.tlsSocket) conn.tlsSocket.destroy(); } catch (e) {}
      try { if (conn.targetSocket) conn.targetSocket.destroy(); } catch (e) {}
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
// Expuesto solo para tests: decide el juego de canales de TODAS las conexiones RDP nativas
module.exports.resolveInjectedChannels = resolveInjectedChannels;
module.exports.wallixServiceFromUsername = wallixServiceFromUsername;
module.exports.wallixServiceFromSession = wallixServiceFromSession;
module.exports.RDP_INJECTED_CHANNELS = RDP_INJECTED_CHANNELS;
module.exports.APP_INJECTED_CHANNELS = APP_INJECTED_CHANNELS;
module.exports.APP_INJECTED_CHANNELS_RAIL = APP_INJECTED_CHANNELS_RAIL;
