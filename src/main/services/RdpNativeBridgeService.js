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
const { parseX224ConnectionConfirm, protocolName, describeRdpPdu, describeDisconnectPdu, preferDisconnectDesc, splitTpktFrames, RdpStreamDeframer, RdpFrameSplitter } = require('./rdp-protocol-helpers');
const { prepareMcsConnectInitial, findClientCoreData, findClientNetworkChannels, patchInfoPacket, patchInfoAutoLogon, isMcsConnectInitial, patchClientCoreWant32bpp, describeClientEarlyCaps, formatClientEarlyCaps } = require('./rdp-mcs-helpers');
const { patchFontSequenceFlags } = require('./rdp-font-helpers');
const {
  describeCapabilities,
  formatCapabilities,
  patchConfirmActiveBitmapBpp,
  sanitizeDemandActiveEmptyRemoteFx,
  stripDemandActiveEmptyRemoteFx,
  sanitizeBastionConfirmActiveGraphics
} = require('./rdp-caps-helpers');
const { fixWallixBitmapStrideCrop, FastPathBitmapReassembler } = require('./rdp-fastpath-helpers');
const { SessionTimeline } = require('./rdp-session-timeline');
const { parseDvcPdu } = require('./rdp-dynvc');
const {
  BridgeLatencyMetrics,
  WsBackpressureController,
  WsTickBatcher,
  DIRECT_WS_CHUNK_BYTES,
  classifyFastPathUpdate,
  gfxBypassesBitmapQueue,
  egfxSkipsSyncBitmapFlush
} = require('./rdp-bridge-backpressure');
const {
  createChannelFilterState,
  processServerFrame,
  learnClientInitiator,
  buildMcsSendDataRequest,
  describeCliprdrPdu,
  isUserMcsChannel,
  isSafeStaticCliprdrWrite,
  fallbackNamedCliprdrWrite,
  greetingOnUnsafeCliprdr,
  greetingStillOnIo,
  canFlushCliprdrToNamedVc,
  sanitizeIllegalCliprdrWrite,
  fallbackIoNamedCliprdrWrite,
  isCliprdrClientPayloadDesc,
  unsafeCliprdrClientWriteDest,
  enqueueClientCliprdr,
  takePendingClientCliprdr,
  shouldRecordMutedClientCliprdr,
  rememberClientCliprdrHandshake,
  patchClientCapsGeneralFlags,
  takeCliprdrRehandshake,
  applyCliprdrReplayFrame,
  CHANNEL_FLAG_FIRST,
  CHANNEL_FLAG_LAST,
  CHANNEL_FLAG_SHOW_PROTOCOL,
  maybePromoteSelectorAppCliprdr,
  retryConfirmAppCliprdrWrite,
  retryConfirmRdpCliprdrWrite,
  buildAppProbeCliprdrWrites,
  remapClientDrdynvcFrame,
  remapClientRdpsndFrame,
  wasmAllowsGraphicsDvc,
  formatDrdynvcForwardDebug,
  siphonAutoDetectFrames
} = require('./rdp-channel-filter');
const {
  noteCliprdrHealth,
  hasCliprdrFailure,
  summarizeCliprdrHealth,
  formatCliprdrHealthLine,
  cliprdrLiveHint,
  cliprdrWatchKind,
  formatCliprdrWatchTimeout,
  CLIPRDR_WATCH_MS,
  isUserOrOrderlyClose,
  formatRdpSessionCloseReason,
  shouldDumpDisconnectDebug
} = require('./rdp-cliprdr-health');
const {
  parseMcsSendData,
  rewriteMcsChannelId,
  clearChannelPduShowProtocol,
  buildMcsSendDataIndication,
  isChannelPduHeader
} = require('./rdp-autodetect');

/** FIRST sin LAST abre serie; LAST la cierra. Continuaciones no llevan CLIPRDR_HEADER. */
function noteClientCliprdrFragment(channelFilter, userData) {
  if (!channelFilter || !isChannelPduHeader(userData)) return;
  const flags = userData.readUInt32LE(4);
  const first = (flags & CHANNEL_FLAG_FIRST) !== 0;
  const last = (flags & CHANNEL_FLAG_LAST) !== 0;
  if (first && !last) {
    channelFilter.clientCliprdrFragmentOpen = true;
  } else if (last) {
    channelFilter.clientCliprdrFragmentOpen = false;
  }
}

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

// Wallix (y hosts donde cliprdr como primer VC rompe el saludo) ignoran nombres y
// mapean por indice: anteponer rdpdr/rdpsnd para que cliprdr no sea el unico/primer VC.
// :RDP: rdpdr+rdpsnd delante. :APP: rail+rdpdr+rdpsnd.
// En directo tambien: sin inject cliprdr queda primero y la sesion no arranca.
// El filtro alinea rdpsnd/drdynvc por nombre y despacha antes de claimCliprdr
// (evita SNDC_TRAINING≡TEMP_DIRECTORY y DynVC huerfano).
// NODETERM_RDP_INJECT_CHANNELS admite un orden o 'off'.
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
    || wallixServiceFromUsername(session.userChain)
    || wallixServiceFromUsername(session.bastionUser)
    || (session.wallixService ? String(session.wallixService).toUpperCase() : null);
}

function isBastionSession(session) {
  if (!session) return false;
  if (session.useBastionWallix === true || session.isBastion === true) return true;
  if (session.bastionUser || session.targetServer || session.bastionHost) return true;
  if (wallixServiceFromSession(session) != null) return true;
  const rawUser = String(session.username || session.userChain || '');
  if (rawUser.split('@').length >= 3) return true;
  if (rawUser.includes('#') || (rawUser.includes('@') && rawUser.includes(':'))) return true;
  if (typeof session.selectedProtocol === 'number' && session.selectedProtocol !== 0x02 && session.selectedProtocol !== 0x08) {
    return true;
  }
  return false;
}

/** Preferencia de gráficos del usuario. El bastión no la degrada a bitmap. */
function resolveIronRdpGraphics(config) {
  return config && config.ironRdpGraphics === 'egfx' ? 'egfx' : 'bitmap';
}

/**
 * Sin EGFX el Confirm Active de bastión se deja en RLE (sin RFX/Surface).
 * Con EGFX el WASM anuncia Surface/codecs: caparlo deja la superficie negra tras el banner.
 * Directo (normalizeBitmaps=false) nunca sanea.
 */
function shouldSanitizeBastionConfirm(normalizeBitmaps, egfxGraphics) {
  return normalizeBitmaps === true && egfxGraphics !== true;
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
    (note.includes('heartbeat') || note.includes('probe-keepalive-echo')
      || note.includes('rdpdr-absorb') || note.includes('rdpdr-user-loggedon')
      || note.includes('rail-absorb') || note.includes('rail-handshake')
      || note.includes('cliprdr-swallow-2nd-gen')
      || note.includes('cliprdr-defer-weak-caps')
      // DynVC keepalive / ruido: no saturar consola ni el tope de hitos del timeline.
      || note.includes('dvc-echo-reply')
      || note.includes('dvc-compressed-drop')
      || note.includes('dvc-soft-sync')
      || note.includes('dvc-unsupported-cmd-drop')
      || /dvc-data ch=\d+ .*absorbed/i.test(note)
      || /dvc-close ch=/i.test(note));
}

/** Solo CREATE/reject/stub/caps relevantes en el timeline (no Echo ni closes). */
function isInterestingDvcTimelineNote(note) {
  if (typeof note !== 'string' || !/dvc-/i.test(note)) return false;
  if (isNoisyDrop(note)) return false;
  return /dvc-(reject|accept-stub|accept |forward-caps|forward ch=|caps )/i.test(note)
    || /GRAPHICS/i.test(note);
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
    /** Sesiones bastion con rewrite RLE activo (fairness multi-sesion). */
    this.activeBastionSessions = 0;
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

          if (socket && typeof socket.setNoDelay === 'function') {
            socket.setNoDelay(true);
          }

          this.wss.handleUpgrade(request, socket, head, (ws) => {
            if (ws && ws._socket && typeof ws._socket.setNoDelay === 'function') {
              ws._socket.setNoDelay(true);
            }
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
      userChain: String(config.username || config.user || ''),
      bastionUser: config.bastionUser || null,
      bastionHost: config.bastionHost || null,
      targetUser: config.targetUser || null,
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
      selectedProtocol: typeof config.selectedProtocol === 'number' ? config.selectedProtocol : null,
      // Opt-in audio IronRDP (RDPSND / AUDIO_PLAYBACK_DVC). El bridge lo usa si CS_NET
      // llega tarde (NLA) y wasmChannelNames aun no lista rdpsnd.
      redirectAudio: config.redirectAudio === true,
      // EGFX: el bridge rechaza AUDIO_PLAYBACK_DVC (comparte DynVC con Graphics) y
      // deja solo rdpsnd estatico. Vale tambien en bastion (banner bitmap + GFX tras el hop).
      ironRdpGraphics: resolveIronRdpGraphics(config),
      // Debug del bridge: env, rdp-flags.json o flag desde el renderer (localStorage).
      rdpDebug: config.rdpDebug === true || config.enableRdpDebug === true,
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
    const connState = { ws, session, userClosing: false };

    this.activeConnections.set(connectionId, connState);

    let rdCleanPathPhase = 'waiting_request';
    let savedX224Cc = null;
    let savedSelectedProtocol = null;
    let bytesToRdp = 0;
    let bytesFromRdp = 0;
    let framesFromRdp = 0;
    let framesToRdp = 0;
    let lastRdpFrameAt = 0;
    let lastWsFrameAt = 0;
    let demandActiveCount = 0;
    // Anillos en memoria: frames solo se vuelcan con NODETERM_RDP_DEBUG=1.
    // El anillo cliprdr se vuelca si el portapapeles fallo o si hay debug.
    // session.rdpDebug viene del renderer (localStorage / window.__NODETERM_RDP_DEBUG__).
    const isDebug = rdpDebug() || session.rdpDebug === true;
    // Metricas de latencia: solo con debug (cero coste en uso normal).
    const latencyMetrics = isDebug ? new BridgeLatencyMetrics() : null;
    if (latencyMetrics) latencyMetrics.startLoopMonitor();
    // En directo el splitter reenvia fragmentos sueltos; para clasificar updates
    // en debug se usa un deframer independiente (copias solo en debug).
    const statsDeframer = latencyMetrics ? new RdpStreamDeframer() : null;
    const recentRdpFrames = [];
    const recentWasmFrames = [];
    const recentCliprdrEvents = [];
    const RECENT_FRAMES_WINDOW = 20;
    const RECENT_CLIPRDR_WINDOW = 25;
    let firstCloseSide = null;
    let lastDisconnectDesc = null;
    let cliprdrWatchTimer = null;

    const clearCliprdrWatch = () => {
      if (cliprdrWatchTimer) {
        clearTimeout(cliprdrWatchTimer);
        cliprdrWatchTimer = null;
      }
    };

    const armCliprdrWatch = () => {
      clearCliprdrWatch();
      const kind = cliprdrWatchKind(channelFilter);
      if (!kind) return;
      cliprdrWatchTimer = setTimeout(() => {
        cliprdrWatchTimer = null;
        if (cliprdrWatchKind(channelFilter) !== kind) return;
        const line = formatCliprdrWatchTimeout(kind);
        if (!line) return;
        const ts = new Date().toISOString().slice(11, 19);
        recentCliprdrEvents.push(`[${ts}] [Bridge] ${line}`);
        if (recentCliprdrEvents.length > RECENT_CLIPRDR_WINDOW) {
          recentCliprdrEvents.shift();
        }
        console.warn(`[Bridge] ${line}`);
        emitClipboardUnhealthy(kind === 'request' ? 'pending_data' : 'no_data_request');
      }, CLIPRDR_WATCH_MS);
    };

    const emitClipboardUnhealthy = (reason) => {
      if (channelFilter.loggedClipboardUnhealthy) return;
      channelFilter.loggedClipboardUnhealthy = true;
      const summary = summarizeCliprdrHealth(channelFilter);
      const failReason = reason || summary.failReason || 'unknown';
      console.warn(`⚠️ [RdpNativeBridgeService] Portapapeles RDP no disponible (${failReason})`);
      this.emit('clipboard-unhealthy', {
        tokenId: session.id,
        reason: failReason,
        summary
      });
    };

    const maybeEmitClipboardUnhealthy = () => {
      if (channelFilter.loggedClipboardUnhealthy) return;
      const health = channelFilter.cliprdrHealth;
      if (!(health && health.failed)) return;
      const summary = summarizeCliprdrHealth(channelFilter);
      emitClipboardUnhealthy(summary.failReason || 'unknown');
    };

    const recordCliprdrEvent = (msg, opts = {}) => {
      const ts = new Date().toISOString().slice(11, 19);
      recentCliprdrEvents.push(`[${ts}] ${msg}`);
      if (recentCliprdrEvents.length > RECENT_CLIPRDR_WINDOW) {
        recentCliprdrEvents.shift();
      }
      noteCliprdrHealth(channelFilter, msg, opts);
      maybeEmitClipboardUnhealthy();
      if (opts.skipWatch) return;
      const hint = cliprdrLiveHint(msg, opts);
      if (hint) {
        if (!channelFilter.loggedCliprdrLiveHints) {
          channelFilter.loggedCliprdrLiveHints = new Set();
        }
        const already = hint.once && channelFilter.loggedCliprdrLiveHints.has(hint.kind);
        if (hint.once) channelFilter.loggedCliprdrLiveHints.add(hint.kind);
        if (!already) {
          console.warn(`[Bridge] ${hint.message}`);
        }
      }
      armCliprdrWatch();
    };

    const trafficStats = createTrafficStats((line) => {
      if (isDebug) {
        console.log(`[Bridge] ${line}`);
      }
      this.emit('diagnostic-log', { category: 'traffic', message: line });
    });

    const noteClose = (side) => {
      if (!firstCloseSide) firstCloseSide = side;
    };
    const channelFilter = createChannelFilterState();
    channelFilter.wallixService = wallixServiceFromSession(session) || (isBastionSession(session) ? 'n/a' : null);
    channelFilter.isBastion = isBastionSession(session);
    channelFilter.allowAudioPlayback = session.redirectAudio === true;
    channelFilter.egfxGraphics = session.ironRdpGraphics === 'egfx';
    channelFilter.recentCliprdrEvents = recentCliprdrEvents;
    channelFilter.recordCliprdr = recordCliprdrEvent;
    const streamDeframer = new RdpStreamDeframer();
    const frameSplitter = new RdpFrameSplitter();
    // Bastion: siempre StreamDeframer (PDU entero para bitmaps/filtro).
    // Directo: FrameSplitter solo durante CredSSP/NLA (StreamDeframer ahi cuelga
    // HYBRID). Tras MCS Connect Initial → StreamDeframer para no partir TPKT
    // de EGFX/cliprdr y provocar dechunkify huerfano en IronRDP.
    const normalizeBitmaps = channelFilter.isBastion === true;
    let bastionSessionCounted = false;
    if (normalizeBitmaps) {
      this.activeBastionSessions += 1;
      bastionSessionCounted = true;
    }
    let directPostNlaDeframer = false;
    let graphicsCapsWarnTimer = null;
    // Linea de tiempo solo-log para bastion: donde se va la espera tras los banners.
    const timeline = new SessionTimeline({
      enabled: normalizeBitmaps,
      label: channelFilter.wallixService || (normalizeBitmaps ? 'bastion' : ''),
      log: (line) => console.log(`⏱️ [Bridge] ${line}`)
    });
    // Experimento opt-in (NODETERM_RDP_FORCE32=1): pedir sesion de 32bpp al servidor para que
    // pueda usar RemoteFX/Surface Commands. Solo conexion directa; nunca en bastion.
    const force32 = !normalizeBitmaps && readDiagFlag('NODETERM_RDP_FORCE32');
    const bitmapReassembler = new FastPathBitmapReassembler();
    const framesDir = path.join(__dirname, '../../../testing/rdp/frames');
    if (process.env.NODETERM_RDP_RECORD_FRAMES === '1') {
      try { fs.mkdirSync(framesDir, { recursive: true }); } catch (_) { /* noop */ }
    }

    let isCleanedUp = false;
    let bastionSliceTimer = null;
    let rewriteFailFrames = 0;
    let rewriteFailRects = 0;
    let rewriteFailSampleBpp = null;
    let rewriteFailLastLogAt = 0;
    /** Ultimo byte del servidor (ms). Sirve para no etiquetar ECONNRESET activo como idle. */
    let lastServerDataAt = 0;
    const RECENT_SERVER_TRAFFIC_MS = 15000;
    const noteServerTraffic = () => {
      lastServerDataAt = Date.now();
    };
    const hadRecentServerTraffic = () => {
      const at = Math.max(lastServerDataAt, timeline.lastInAt || 0);
      return at > 0 && (Date.now() - at) < RECENT_SERVER_TRAFFIC_MS;
    };

    const flushRewriteFailLog = (force = false) => {
      if (!rewriteFailFrames && !rewriteFailRects) return;
      const now = Date.now();
      if (!force && now - rewriteFailLastLogAt < 2000) return;
      rewriteFailLastLogAt = now;
      const sample = rewriteFailSampleBpp != null ? ` (sample bpp=${rewriteFailSampleBpp})` : '';
      console.warn(
        `[Bridge] FastPath BITMAP: ${rewriteFailFrames} frames, ${rewriteFailRects} rects sin reescribir${sample}; se reenvian originales`
      );
      rewriteFailFrames = 0;
      rewriteFailRects = 0;
      rewriteFailSampleBpp = null;
    };

    const cleanup = (reason = 'Cerrado por el usuario', closeCode = 1000) => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      flushRewriteFailLog(true);
      if (bastionSliceTimer) {
        clearImmediate(bastionSliceTimer);
        bastionSliceTimer = null;
      }
      if (graphicsCapsWarnTimer) {
        clearTimeout(graphicsCapsWarnTimer);
        graphicsCapsWarnTimer = null;
      }
      if (bastionSessionCounted) {
        bastionSessionCounted = false;
        this.activeBastionSessions = Math.max(0, this.activeBastionSessions - 1);
      }
      clearCliprdrWatch();
      if (channelFilter.appCliprdrWriteRetryTimer) {
        clearTimeout(channelFilter.appCliprdrWriteRetryTimer);
        channelFilter.appCliprdrWriteRetryTimer = null;
      }
      if (channelFilter.rdpCliprdrWriteRetryTimer) {
        clearTimeout(channelFilter.rdpCliprdrWriteRetryTimer);
        channelFilter.rdpCliprdrWriteRetryTimer = null;
      }
      if (channelFilter.appCliprdrCapsWaitTimer) {
        clearTimeout(channelFilter.appCliprdrCapsWaitTimer);
        channelFilter.appCliprdrCapsWaitTimer = null;
      }
      const userInitiated = isUserOrOrderlyClose({
        wsReadyState: ws.readyState,
        reason,
        firstCloseSide,
        userClosing: connState.userClosing
      });
      const formattedReason = userInitiated
        ? 'Cerrado por el usuario'
        : formatRdpSessionCloseReason(reason, lastDisconnectDesc);
      const clipboardFailed = hasCliprdrFailure(channelFilter);
      const dump = shouldDumpDisconnectDebug({
        cliprdrFailed: clipboardFailed,
        isDebug
      });
      const clipSummary = formatCliprdrHealthLine(summarizeCliprdrHealth(channelFilter));

      timeline.stop();
      if (timeline.enabled) {
        console.log(`⏱️ [Bridge] ${timeline.summary()}`);
      }
      if (userInitiated && !clipboardFailed && !isDebug) {
        console.log(`🧹 [RdpNativeBridgeService] Sesion RDP finalizada (${formattedReason}) [toRdp=${framesToRdp} (${bytesToRdp}B), fromRdp=${framesFromRdp} (${bytesFromRdp}B)]`);
      } else if (clipboardFailed) {
        console.warn(`⚠️ [RdpNativeBridgeService] Fallo de clipboard al cerrar (${formattedReason}) [toRdp=${framesToRdp} (${bytesToRdp}B), fromRdp=${framesFromRdp} (${bytesFromRdp}B)]`);
      } else if (!isDebug) {
        console.warn(`⚠️ [RdpNativeBridgeService] Desconexion (${formattedReason}) [toRdp=${framesToRdp} (${bytesToRdp}B), fromRdp=${framesFromRdp} (${bytesFromRdp}B)]`);
      } else {
        console.warn(`⚠️ [RdpNativeBridgeService] Desconexion anomala detectada (${formattedReason}) [toRdp=${framesToRdp} (${bytesToRdp}B), fromRdp=${framesFromRdp} (${bytesFromRdp}B)]`);
        console.warn(`🔎 [Bridge] Primer extremo en cerrar: ${firstCloseSide || 'desconocido'}`);
      }
      console.warn(`[Bridge] ${clipSummary}`);

      if (dump.cliprdr && recentCliprdrEvents.length) {
        console.warn(`🔎 [Bridge] Ultimos ${recentCliprdrEvents.length} eventos de portapapeles:`);
        for (const line of recentCliprdrEvents) {
          console.warn(`   ${line}`);
        }
      }
      if (dump.frames) {
        console.warn(`🔎 [Bridge] Primer extremo en cerrar: ${firstCloseSide || 'desconocido'}`);
        if (recentRdpFrames.length) {
          console.warn(`🔎 [Bridge] Ultimos ${recentRdpFrames.length} frames del servidor antes del corte:`);
          for (const line of recentRdpFrames) {
            console.warn(`   ${line}`);
          }
        }
        if (recentWasmFrames.length) {
          console.warn(`🔎 [Bridge] Ultimos ${recentWasmFrames.length} frames entregados a IronRDP WASM:`);
          for (const line of recentWasmFrames) {
            console.warn(`   ${line}`);
          }
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
        port: session.port,
        clipboardFailed,
        userInitiated
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
      try { streamDeframer.reset(); } catch (e) {}
      try { frameSplitter.reset(); } catch (e) {}
      try { bitmapReassembler.reset(); } catch (e) {}
      if (latencyMetrics) {
        try { console.log(latencyMetrics.formatLine()); } catch (e) {}
        latencyMetrics.stopLoopMonitor();
      }
    };

    ws.on('message', (message) => {
      try {
        const payload = Buffer.isBuffer(message) ? message : Buffer.from(message);

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

              // Bastión y directo: latest-wins seguro (solo bitmaps ya cubiertos) sin callar TLS.
              // Directo: pausa TLS solo a 2 MB, como ultimo recurso anti-OOM.
              // Métricas [Bridge Perf] solo con NODETERM_RDP_DEBUG / session.rdpDebug.
              const backpressure = new WsBackpressureController({
                bastion: normalizeBitmaps,
                metrics: latencyMetrics
              });

              // Un unico ws.send por evento TLS 'data' (en vez de uno por PDU/fragmento): menos
              // frames WS, menos syscalls y menos mensajes para el WASM, que trata el WS como un
              // flujo de bytes. Kill-switch: NODETERM_RDP_COALESCE=0 (env o rdp-flags.json).
              const coalesceFlag = readDiagEntry('NODETERM_RDP_COALESCE');
              const coalesceWs = !(coalesceFlag === false || coalesceFlag === 0
                || coalesceFlag === '0' || coalesceFlag === 'false');
              const tickBatcher = new WsTickBatcher(coalesceWs);
              timeline.mark('tls-ok-transparente');
              timeline.start(() => ({
                pending: backpressure.pendingBitmaps.length,
                buffered: ws.bufferedAmount
              }));

              const sendDirectToWasm = (out) => {
                if (!out || typeof out.length !== 'number') return;
                if (ws.readyState !== ws.OPEN) return;
                flushTickOut();
                ws.send(out, { binary: true }, () => {
                  checkResumeTls();
                });
              };

              const sendBinaryToWasm = (out) => {
                if (!out || typeof out.length !== 'number') return;
                if (ws.readyState !== ws.OPEN) return;
                if (tickBatcher.push(out)) {
                  // Directo: un bloque de cientos de KB se decodifica de un tirón en el
                  // renderer. Al pasar de 64 KB se envia el lote (el frame que lo cruza
                  // sale entero) y se abre otro. Bastion sigue con un solo mensaje por tick.
                  if (!normalizeBitmaps && tickBatcher.shouldFlush(DIRECT_WS_CHUNK_BYTES)) {
                    flushTickOut();
                    tickBatcher.begin();
                  }
                  return;
                }
                ws.send(out, { binary: true }, () => {
                  checkResumeTls();
                });
              };

              const flushTickOut = () => {
                const payload = tickBatcher.take();
                if (!payload || ws.readyState !== ws.OPEN) return;
                ws.send(payload, { binary: true }, () => {
                  checkResumeTls();
                });
              };

              const rewriteAndSend = (ready, frameTag) => {
                const t0 = (latencyMetrics || normalizeBitmaps) ? process.hrtime.bigint() : 0n;
                const stridePatch = normalizeBitmaps
                  ? fixWallixBitmapStrideCrop(ready)
                  : { patchedCount: 0 };
                // SURFACE_CMDS / EGFX: fixWallixBitmapStrideCrop solo reescribe BITMAP RLE;
                // el resto (surface/GFX) se reenvia sin tocar.
                if (normalizeBitmaps) {
                  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
                  backpressure.noteRewriteSpent(ms);
                  if (latencyMetrics) {
                    latencyMetrics.noteRewrite(ms, !!stridePatch.patchedCount);
                  }
                }
                const outChunks = stridePatch.patchedCount
                  ? (stridePatch.buffers || [stridePatch.buf])
                  : [ready];
                if (stridePatch.failed) {
                  rewriteFailFrames += 1;
                  rewriteFailRects += stridePatch.failed;
                  if (rewriteFailSampleBpp == null && stridePatch.sampleBpp != null) {
                    rewriteFailSampleBpp = stridePatch.sampleBpp;
                  }
                  flushRewriteFailLog(false);
                }
                if (stridePatch.patchedCount && isDebug) {
                  console.log(
                    `[Bridge] FastPath BITMAP normalizado frame#${frameTag}: rects=${stridePatch.numberRectangles} patched=${stridePatch.patchedCount}` +
                      (stridePatch.solidCount != null ? ` solid=${stridePatch.solidCount} crop=${stridePatch.cropCount}` : '') +
                      (stridePatch.pduCount > 1 ? ` pdus=${stridePatch.pduCount}` : '')
                  );
                }
                for (const out of outChunks) {
                  sendBinaryToWasm(out);
                }
              };

              const flushPendingBitmap = (opts) => {
                const pending = backpressure.takePendingIfDrained(ws.bufferedAmount, opts);
                if (pending) {
                  // En orden: cada delta pendiente se pinta sobre el anterior.
                  for (const frame of pending) rewriteAndSend(frame, 'pending');
                }
              };

              // El banner deja de valer en el salto: tirarlo evita reescribir RLE a 3 ms/tick.
              const dropStaleBannerBitmaps = (reason) => {
                if (!channelFilter.egfxGraphics) return 0;
                const dropped = backpressure.dropPending();
                try { bitmapReassembler.reset(); } catch (e) {}
                channelFilter.bannerBitmapsDropped = true;
                if (dropped > 0) {
                  timeline.mark('banner-bitmaps-dropped', `${dropped} reason=${reason}`);
                  console.log(
                    `[Bridge] EGFX: ${dropped} bitmap(s) del banner descartados en ${reason}`
                  );
                }
                return dropped;
              };

              // Bastion: reescribe pendientes hasta gastar el presupuesto (~3 ms) y deja el resto.
              // Con 2+ sesiones bastion, tope mas bajo para no ahogar la segunda conexion.
              const rewritePendingSlice = () => {
                backpressure.beginDataTick();
                let sent = 0;
                const maxFrames = this.activeBastionSessions > 1 ? 8 : 32;
                while (sent < maxFrames && backpressure.hasPending()) {
                  const frame = backpressure.takePendingWithinBudget(ws.bufferedAmount, { force: true });
                  if (!frame) break;
                  rewriteAndSend(frame, 'pending');
                  sent += 1;
                }
                return sent;
              };

              // La rodaja corre cuando el handler TLS ya ha salido, asi el raton se escribe entre medias.
              const scheduleBastionSlice = () => {
                if (bastionSliceTimer || isCleanedUp) return;
                bastionSliceTimer = setImmediate(() => {
                  bastionSliceTimer = null;
                  if (isCleanedUp || ws.readyState !== ws.OPEN) return;
                  if (!backpressure.hasPending()) return;
                  if (tickBatcher.active) flushTickOut();
                  tickBatcher.begin();
                  try {
                    rewritePendingSlice();
                  } catch (sliceErr) {
                    console.warn('[Bridge] Error reescribiendo rodaja bastion:', sliceErr.message);
                  }
                  try {
                    flushTickOut();
                  } catch (sendErr) {
                    console.warn('[Bridge] Error enviando rodaja bastion:', sendErr.message);
                  }
                  if (backpressure.hasPending()) scheduleBastionSlice();
                });
              };

              const checkResumeTls = () => {
                if (backpressure.shouldResumeTls(ws.bufferedAmount)) {
                  backpressure.markTlsPaused(false);
                  if (tlsSocket && !tlsSocket.destroyed) {
                    tlsSocket.resume();
                  }
                }
                if (normalizeBitmaps) {
                  if (backpressure.hasPending()) scheduleBastionSlice();
                } else {
                  flushPendingBitmap();
                }
              };

              if (ws._socket && typeof ws._socket.on === 'function') {
                ws._socket.on('drain', checkResumeTls);
              }

              tlsSocket.on('data', (chunk) => {
                // Si un tick anterior abortó con salida acumulada, se entrega antes de empezar.
                if (tickBatcher.active) flushTickOut();
                tickBatcher.begin();
                backpressure.beginDataTick();
                let bastionSlicedThisTick = false;
                backpressure.noteBufferedAmount(ws.bufferedAmount);
                // Solo path directo: pausar TLS en colas extremas.
                if (backpressure.shouldPauseTls(ws.bufferedAmount)) {
                  backpressure.markTlsPaused(true);
                  tlsSocket.pause();
                }

                // Bastion: PDU completo. Directo: splitter en NLA, deframer tras MCS.
                if (!normalizeBitmaps && !directPostNlaDeframer
                    && channelFilter.mcsConnectPrepared) {
                  const splitterIdle = frameSplitter.remainingBytes === 0
                    && (!frameSplitter.headerBuf || frameSplitter.headerBuf.length === 0);
                  if (splitterIdle) directPostNlaDeframer = true;
                }
                const splitFrames = (normalizeBitmaps || directPostNlaDeframer)
                  ? streamDeframer.push(chunk)
                  : frameSplitter.push(chunk);
                // RTT y ancho de banda se contestan antes de la ráfaga gráfica.
                // Si la respuesta espera a procesar los bitmaps, Windows mide
                // esa espera como red lenta y baja la calidad H.264 al mover.
                const earlyAd = siphonAutoDetectFrames(channelFilter, splitFrames);
                if (earlyAd.notes.length && isDebug) {
                  for (const item of earlyAd.notes) {
                    console.log(
                      `[Bridge AutoDetect] reply idx=${item.index}/${item.burst} lag=${item.lagMs}ms ${item.note}`
                    );
                  }
                }
                if (earlyAd.replies.length && tlsSocket && tlsSocket.writable) {
                  for (const reply of earlyAd.replies) {
                    bytesToRdp += reply.length;
                    tlsSocket.write(reply);
                  }
                }
                const frames = earlyAd.kept;

                if (latencyMetrics) {
                  const statFrames = normalizeBitmaps ? frames : statsDeframer.push(chunk);
                  for (const sf of statFrames) {
                    const kind = classifyFastPathUpdate(sf);
                    if (kind) latencyMetrics.noteUpdate(kind, sf.length);
                  }
                }

                for (let frame of frames) {
                  const now = Date.now();
                  const gapFromLastRdp = lastRdpFrameAt > 0 ? now - lastRdpFrameAt : 0;
                  lastRdpFrameAt = now;
                  if (latencyMetrics) latencyMetrics.noteGap(gapFromLastRdp);

                  framesFromRdp += 1;
                  noteServerTraffic();
                  const isFastPath = frame.length >= 2 && (frame[0] & 0x03) === 0 && frame[0] !== 0x30;
                  let pduDesc = (isFastPath && !isDebug) ? 'FastPath' : describeRdpPdu(frame);

                  // Wallix: RemoteFX con property length 0 tumba IronRDP en Demand Active.
                  // Bastion: strip (no legitimar RFX). Directo: fill ServerContainer(1).
                  if (!isFastPath && pduDesc.includes('DEMAND_ACTIVE')) {
                    demandActiveCount += 1;
                    const rfxSan = normalizeBitmaps
                      ? stripDemandActiveEmptyRemoteFx(frame)
                      : sanitizeDemandActiveEmptyRemoteFx(frame);
                    if (rfxSan.patched) {
                      frame = rfxSan.buf;
                      pduDesc = describeRdpPdu(frame);
                      if (isDebug) {
                        console.log(
                          normalizeBitmaps
                            ? `[Bridge] Demand Active bastion: ${rfxSan.count} RemoteFX vacio(s) eliminados`
                            : `[Bridge] Demand Active: ${rfxSan.count} RemoteFX prop vacia(s) -> ServerContainer(1)`
                        );
                      }
                    }
                  }

                  const n = frame.length;

                  if (timeline.enabled) {
                    timeline.mark('first-frame', `#${framesFromRdp} ${n}B ${pduDesc}`);
                    if (!isFastPath) {
                      if (pduDesc.includes('DEACTIVATE_ALL')) {
                        timeline.event('DEACTIVATE_ALL', `#${framesFromRdp}`);
                      } else if (pduDesc.includes('DEMAND_ACTIVE')) {
                        timeline.event(`DEMAND_ACTIVE ${demandActiveCount}`, `#${framesFromRdp} ${n}B`);
                      }
                    } else {
                      if (demandActiveCount >= 2) {
                        timeline.mark('first-fastpath-tras-2o-demand-active', `#${framesFromRdp} ${n}B`);
                      }
                      if (!timeline.has('first-surface-cmds') || !timeline.has('first-bitmap')) {
                        const fpKind = classifyFastPathUpdate(frame);
                        if (fpKind === 'SURFACE_CMDS') timeline.mark('first-surface-cmds', `#${framesFromRdp} ${n}B`);
                        else if (fpKind === 'BITMAP') timeline.mark('first-bitmap', `#${framesFromRdp} ${n}B`);
                      }
                    }
                  }

                  // Sondeo: que bpp/codecs ofrece el servidor (solo debug).
                  if (isDebug && !isFastPath && pduDesc.includes('DEMAND_ACTIVE')) {
                    try {
                      const srvCaps = describeCapabilities(frame);
                      if (srvCaps) console.log(formatCapabilities(srvCaps));
                    } catch (_) { /* noop */ }
                  }

                  if (isDebug || !isFastPath) {
                    recentRdpFrames.push(`#${framesFromRdp} ${n}B | ${pduDesc}`);
                    if (recentRdpFrames.length > RECENT_FRAMES_WINDOW) recentRdpFrames.shift();

                    // El motivo del cierre viaja en un PDU TPKT, no en FastPath: se comprueba solo en paquetes no-FastPath
                    const disconnectDesc = describeDisconnectPdu(frame);
                    if (disconnectDesc) {
                      lastDisconnectDesc = preferDisconnectDesc(lastDisconnectDesc, disconnectDesc);
                      const discMsg = `🛑 [Bridge] El servidor anuncia cierre en frame#${framesFromRdp}: ${disconnectDesc}`;
                      console.warn(discMsg);
                      this.emit('diagnostic-log', { category: 'disconnect', message: discMsg });
                    }
                  }

                  if (isDebug) {
                    if (framesFromRdp <= 20 && !isFastPathNoise(pduDesc)) {
                      console.log(`[Bridge] RDP in frame#${framesFromRdp}: ${n}B | ${pduDesc}`);
                    } else if (gapFromLastRdp >= 400) {
                      console.log(`⏱️ [Bridge Trace GAP ${gapFromLastRdp}ms] Pausa RDP -> Frame #${framesFromRdp} (${n}B): ${pduDesc}`);
                    } else if (
                      pduDesc.includes('DEMAND_ACTIVE') ||
                      pduDesc.includes('DEACTIVATE_ALL') ||
                      pduDesc.includes('AUTODETECT') ||
                      pduDesc.includes('HEARTBEAT') ||
                      pduDesc.includes('CONTROL') ||
                      pduDesc.includes('SAVE_SESSION_INFO') ||
                      pduDesc.includes('SET_ERROR_INFO') ||
                      pduDesc.includes('FRAME_ACK') ||
                      pduDesc.includes('SURFACE_CMDS')
                    ) {
                      console.log(`📡 [Bridge Trace PDU #${framesFromRdp}] ${pduDesc}`);
                    }
                    if (process.env.NODETERM_RDP_RECORD_FRAMES === '1') {
                      try {
                        fs.writeFileSync(path.join(framesDir, `from-${String(framesFromRdp).padStart(2, '0')}-${n}b.hex`), frame.toString('hex'), 'utf8');
                      } catch (_) { /* noop */ }
                    }
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
                  if (timeline.enabled && channelFilter.wallixService
                      && timeline.label !== channelFilter.wallixService
                      && typeof timeline.setLabel === 'function') {
                    timeline.setLabel(channelFilter.wallixService);
                  }
                  sanitizeIllegalCliprdrWrite(channelFilter);
                  if (prevWriteCh != null
                      && channelFilter.cliprdrWriteChannelId == null
                      && greetingStillOnIo(channelFilter)) {
                    const clearedMsg = `[Bridge Clipboard] write path ${prevWriteCh} anulado (saludo aun en IO ${channelFilter.serverCliprdrChannelId})`;
                    recordCliprdrEvent(clearedMsg);
                    if (isDebug) console.log(clearedMsg);
                  }
                  if (channelFilter.cliprdrWriteChannelId != null &&
                      channelFilter.cliprdrWriteChannelId !== prevWriteCh) {
                    const writeName = channelFilter.channelIdToName instanceof Map
                      ? (channelFilter.channelIdToName.get(channelFilter.cliprdrWriteChannelId) || '?')
                      : '?';
                    const greetCh = channelFilter.serverCliprdrChannelId;
                    const writeMsg = `[Bridge] cliprdr write path=${channelFilter.cliprdrWriteChannelId} (${writeName}); saludo por ${greetCh}`;
                    recordCliprdrEvent(writeMsg);
                    if (isDebug || wallixServiceFromSession(session) === 'APP') {
                      console.log(writeMsg);
                    }
                  }
                  if (canFlushCliprdrToNamedVc(channelFilter)) {
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
                    if (isDebug) {
                      console.log(`🔬 [RDP Bridge] Canales MCS servidor: ${chDetails}`);
                    }
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
                    recordCliprdrEvent(clipLog, { inbound: true });
                    if (isDebug) {
                      console.log(`📋 ${clipLog}`);
                    }
                    this.emit('diagnostic-log', {
                      category: 'cliprdr',
                      message: clipLog
                    });
                    if (processed.note && processed.note.includes('cliprdr-defer-weak-caps')
                        && !channelFilter.loggedCliprdrDeferWeakCaps) {
                      channelFilter.loggedCliprdrDeferWeakCaps = true;
                      const deferMsg = '[Bridge Clipboard] CB_CLIP_CAPS del selector no se entrega a IronRDP ' +
                        `(generalFlags=0x${(channelFilter.cliprdrServerGeneralFlags || 0).toString(16)} sin file clip)`;
                      recordCliprdrEvent(deferMsg);
                      if (isDebug) console.log(deferMsg);
                      this.emit('diagnostic-log', { category: 'cliprdr', message: deferMsg });
                    }
                    // APP en frio: 1 READY. Selector→APP: 2o READY en 1001.
                    // Selector→RDP: 2o READY en IO, o servidor en VC nombrado (claimCliprdrPdu).
                    if (processed.cliprdrDesc && processed.cliprdrDesc.includes('CB_MONITOR_READY')) {
                      if (maybePromoteSelectorAppCliprdr(channelFilter)) {
                        retryConfirmAppCliprdrWrite(channelFilter);
                        retryConfirmRdpCliprdrWrite(channelFilter);
                        if (typeof timeline.setLabel === 'function') {
                          timeline.setLabel(channelFilter.wallixService || timeline.label);
                        }
                      }
                      if (channelFilter.cliprdrSelectorAppInferred
                          && !channelFilter.loggedCliprdrSelectorAppInferred) {
                        channelFilter.loggedCliprdrSelectorAppInferred = true;
                        const svcLabel = channelFilter.wallixService === 'RDP' ? 'RDP' : 'APP';
                        const writeNote = channelFilter.cliprdrWriteChannelId != null
                          ? `write path via cliprdr nombrado ${channelFilter.cliprdrWriteChannelId}`
                          : 'write path pendiente (saludo IO; no escribir 1006 hasta VC nombrado)';
                        const inferMsg = `[Bridge Clipboard] selector ${svcLabel} inferido: saludo ${channelFilter.serverCliprdrChannelId}, ${writeNote}`;
                        recordCliprdrEvent(inferMsg);
                        console.log(inferMsg);
                        this.emit('diagnostic-log', { category: 'cliprdr', message: inferMsg });
                        if (typeof timeline.setLabel === 'function') {
                          timeline.setLabel(svcLabel);
                        }
                      }
                      const readyCount = channelFilter.cliprdrMonitorReadyCount || 0;
                      const isAppReady = channelFilter.wallixService === 'APP' && readyCount >= 1;
                      const isSelectorRdpReady = channelFilter.wallixService === 'RDP'
                        && channelFilter.cliprdrSelectorAppInferred
                        && readyCount >= 1;
                      const isSecondReady = readyCount >= 2;
                      if (isSecondReady || isAppReady || isSelectorRdpReady) {
                        sanitizeIllegalCliprdrWrite(channelFilter);
                        retryConfirmAppCliprdrWrite(channelFilter);
                        retryConfirmRdpCliprdrWrite(channelFilter);
                        const writeSafe = canFlushCliprdrToNamedVc(channelFilter);
                        const hasClientCaps = Buffer.isBuffer(channelFilter.cachedClientCaps);
                        if ((writeSafe || isSecondReady) && !hasClientCaps) {
                          if (!channelFilter.loggedCliprdrWaitingClientCaps) {
                            channelFilter.loggedCliprdrWaitingClientCaps = true;
                            const waitMsg = '[Bridge Clipboard] CB_MONITOR_READY: esperando CAPS del cliente WASM' +
                              ` (wasm=${channelFilter.cliprdrChannelId} -> write ${channelFilter.cliprdrWriteChannelId})`;
                            recordCliprdrEvent(waitMsg);
                            console.log(waitMsg);
                          }
                          if ((channelFilter.wallixService === 'APP'
                                || (channelFilter.wallixService === 'RDP'
                                    && channelFilter.cliprdrSelectorAppInferred))
                              && !channelFilter.appCliprdrCapsWaitTimer) {
                            channelFilter.appCliprdrCapsWaitTimer = setTimeout(() => {
                              channelFilter.appCliprdrCapsWaitTimer = null;
                              if (isCleanedUp || Buffer.isBuffer(channelFilter.cachedClientCaps)) return;
                              const lateMsg = `[Bridge Clipboard] ${channelFilter.wallixService}: 2s sin CAPS del cliente WASM tras MONITOR_READY`;
                              recordCliprdrEvent(lateMsg);
                              console.warn(lateMsg);
                            }, 2000);
                          }
                        } else if (writeSafe || isSecondReady) {
                          // Solo rehandshake al wire si el saludo ya no esta en IO.
                          const replay = writeSafe
                            ? takeCliprdrRehandshake(channelFilter)
                            : [];
                          if (replay.length && tlsSocket && tlsSocket.writable) {
                            for (const pdu of replay) {
                              bytesToRdp += pdu.length;
                              tlsSocket.write(pdu);
                              const parsedReplay = parseMcsSendData(pdu);
                              const replayDesc = parsedReplay
                                ? describeCliprdrPdu(parsedReplay.userData)
                                : 'PDU';
                              const replayCh = parsedReplay
                                ? parsedReplay.channelId
                                : channelFilter.cliprdrWriteChannelId;
                              const replayMsg = `[Bridge Clipboard] rehandshake cliprdr ch=${replayCh} ${replayDesc}` +
                                (channelFilter.wallixService === 'RDP' && channelFilter.cliprdrSelectorAppInferred
                                  ? ' (selector→RDP)'
                                  : '');
                              recordCliprdrEvent(replayMsg);
                              if (isDebug) console.log(replayMsg);
                              this.emit('diagnostic-log', { category: 'cliprdr', message: replayMsg });
                            }
                          } else if (writeSafe && !replay.length && !channelFilter.loggedCliprdrRehandshakeMiss) {
                            channelFilter.loggedCliprdrRehandshakeMiss = true;
                            const missMsg = channelFilter.cliprdrRehandshakeSkippedUnsafe
                              ? '[Bridge Clipboard] CB_MONITOR_READY sin write path seguro (saludo por canal de usuario)'
                              : '[Bridge Clipboard] CB_MONITOR_READY sin CAPS de cliente en cache';
                            recordCliprdrEvent(missMsg);
                            console.warn(missMsg);
                            this.emit('diagnostic-log', { category: 'cliprdr', message: missMsg });
                          }
                          if (writeSafe && tlsSocket && tlsSocket.writable) {
                            this.flushPendingClientCliprdr(channelFilter, tlsSocket, ws, (n) => {
                              bytesToRdp += n;
                            });
                          }
                        }
                      }
                      if (channelFilter.wallixService === 'APP'
                          && channelFilter.cliprdrWriteChannelId == null
                          && !channelFilter.appCliprdrWriteRetryTimer) {
                        channelFilter.appCliprdrWriteRetryTimer = setTimeout(() => {
                          channelFilter.appCliprdrWriteRetryTimer = null;
                          if (isCleanedUp || channelFilter.cliprdrWriteChannelId != null) return;
                          maybePromoteSelectorAppCliprdr(channelFilter);
                          if (!retryConfirmAppCliprdrWrite(channelFilter)) return;
                          if (!canFlushCliprdrToNamedVc(channelFilter)) return;
                          const writeName = channelFilter.channelIdToName instanceof Map
                            ? (channelFilter.channelIdToName.get(channelFilter.cliprdrWriteChannelId) || '?')
                            : '?';
                          const lateMsg = `[Bridge] cliprdr write path=${channelFilter.cliprdrWriteChannelId} (${writeName}); saludo por ${channelFilter.serverCliprdrChannelId} (reintento APP)`;
                          recordCliprdrEvent(lateMsg);
                          console.log(lateMsg);
                          if (!tlsSocket || !tlsSocket.writable) return;
                          channelFilter.cliprdrRehandshakePending = true;
                          const lateReplay = takeCliprdrRehandshake(channelFilter);
                          for (const pdu of lateReplay) {
                            bytesToRdp += pdu.length;
                            tlsSocket.write(pdu);
                          }
                          this.flushPendingClientCliprdr(channelFilter, tlsSocket, ws, (n) => {
                            bytesToRdp += n;
                          });
                        }, 400);
                      }
                      if (channelFilter.wallixService === 'RDP'
                          && channelFilter.cliprdrSelectorAppInferred
                          && !canFlushCliprdrToNamedVc(channelFilter)
                          && !channelFilter.rdpCliprdrWriteRetryTimer) {
                        channelFilter.rdpCliprdrWriteRetryTimer = setTimeout(() => {
                          channelFilter.rdpCliprdrWriteRetryTimer = null;
                          if (isCleanedUp) return;
                          if (canFlushCliprdrToNamedVc(channelFilter)) return;
                          maybePromoteSelectorAppCliprdr(channelFilter);
                          if (!retryConfirmRdpCliprdrWrite(channelFilter)) return;
                          if (!canFlushCliprdrToNamedVc(channelFilter)) return;
                          const writeName = channelFilter.channelIdToName instanceof Map
                            ? (channelFilter.channelIdToName.get(channelFilter.cliprdrWriteChannelId) || '?')
                            : '?';
                          const lateMsg = `[Bridge] cliprdr write path=${channelFilter.cliprdrWriteChannelId} (${writeName}); saludo por ${channelFilter.serverCliprdrChannelId} (reintento selector→RDP)`;
                          recordCliprdrEvent(lateMsg);
                          console.log(lateMsg);
                          if (!tlsSocket || !tlsSocket.writable) return;
                          channelFilter.cliprdrRehandshakePending = true;
                          const lateReplay = takeCliprdrRehandshake(channelFilter);
                          for (const pdu of lateReplay) {
                            bytesToRdp += pdu.length;
                            tlsSocket.write(pdu);
                          }
                          this.flushPendingClientCliprdr(channelFilter, tlsSocket, ws, (n) => {
                            bytesToRdp += n;
                          });
                        }, 400);
                      }
                    }
                  }
                  // Dropped: replies SIEMPRE (Echo/stubs). isNoisyDrop solo silencia logs.
                  if (processed.dropped) {
                    const note = String(processed.note || '').replace(/ hex=[0-9a-f]+/i, '');
                    const dropMsg = `MCS ch=${processed.channelId}: ${note}` +
                      (processed.replies.length ? ` (replies=${processed.replies.length})` : '');
                    // Bastion: solo CREATE/reject/stub/caps (Echo/close/absorb saturan el log).
                    if (timeline.enabled && isInterestingDvcTimelineNote(processed.note)
                        && !/hex=/i.test(dropMsg)) {
                      timeline.event(`DROP ${note}`, `#${framesFromRdp}`);
                    }
                    if (isDebug || !isNoisyDrop(processed.note)) {
                      if (isDebug) {
                        console.log(`🚫 DROPPED #${framesFromRdp} ${dropMsg}`);
                      }
                      if (processed.channelId !== channelFilter.ioChannelId) {
                        this.emit('diagnostic-log', {
                          category: 'dropped',
                          message: `DROPPED frame #${framesFromRdp} (ch=${processed.channelId}): ${processed.note}`
                        });
                      }
                    }
                    if (processed.replies.length && tlsSocket && tlsSocket.writable) {
                      for (const reply of processed.replies) {
                        bytesToRdp += reply.length;
                        tlsSocket.write(reply);
                      }
                    }
                    bytesFromRdp += n;
                    timeline.noteIn('drop', n);
                    trafficStats.note(`DROP ${pduDesc}`, n);
                    continue;
                  }
                  frame = processed.forward;
                  // El filtro puede consumir el frame sin reenviar nada (forward nulo):
                  // no hay nada que entregar a IronRDP.
                  if (!frame || typeof frame.length !== 'number') {
                    bytesFromRdp += n;
                    timeline.noteIn('drop', n);
                    trafficStats.note(pduDesc, n);
                    continue;
                  }

                  // Caps quick-reply u otras respuestas DVC junto al forward hacia WASM.
                  if (processed.replies && processed.replies.length && tlsSocket && tlsSocket.writable) {
                    for (const reply of processed.replies) {
                      bytesToRdp += reply.length;
                      tlsSocket.write(reply);
                    }
                  }

                  if (processed.dvcForward && typeof processed.note === 'string') {
                    if (/dvc-forward-caps/i.test(processed.note)) {
                      timeline.mark('dvc-caps-hacia-wasm', `#${framesFromRdp}`);
                      dropStaleBannerBitmaps('dvc-caps');
                      if (timeline.enabled && !channelFilter.loggedEgfxGraphicsCreate
                          && !graphicsCapsWarnTimer) {
                        graphicsCapsWarnTimer = setTimeout(() => {
                          graphicsCapsWarnTimer = null;
                          if (isCleanedUp || channelFilter.loggedEgfxGraphicsCreate) return;
                          const pend = backpressure.pendingBitmaps
                            ? backpressure.pendingBitmaps.length
                            : 0;
                          timeline.mark('egfx-caps-no-create', `pend=${pend}`);
                          console.warn(
                            `⚠️ [Bridge] DynVC Caps sin Graphics CREATE tras 5s` +
                            ` (bitmap-only; pend=${pend})`
                          );
                        }, 5000);
                        if (graphicsCapsWarnTimer && typeof graphicsCapsWarnTimer.unref === 'function') {
                          graphicsCapsWarnTimer.unref();
                        }
                      }
                    }
                    if (!channelFilter.loggedEgfxGraphicsCreate
                        && /^dvc-forward ch=/i.test(processed.note)
                        && /GRAPHICS/i.test(processed.note)) {
                      channelFilter.loggedEgfxGraphicsCreate = true;
                      if (graphicsCapsWarnTimer) {
                        clearTimeout(graphicsCapsWarnTimer);
                        graphicsCapsWarnTimer = null;
                      }
                      timeline.mark('egfx-graphics-create', `#${framesFromRdp}`);
                      console.log(
                        `[Bridge] EGFX Graphics CREATE mcs=${processed.channelId}` +
                        ` wasm=${channelFilter.wasmDrdynvcChannelId} ${processed.note}`
                      );
                    }
                  }

                  if (processed.dvcForward && isDebug) {
                    channelFilter.dvcForwardDebugCount = (channelFilter.dvcForwardDebugCount || 0) + 1;
                    if (channelFilter.dvcForwardDebugCount <= 24) {
                      const parsedFwd = parseMcsSendData(frame);
                      const dbg = parsedFwd
                        ? formatDrdynvcForwardDebug(parsedFwd.userData)
                        : null;
                      console.log(
                        `[Bridge] DynVC->WASM #${channelFilter.dvcForwardDebugCount}` +
                        ` ch=${processed.channelId} ${processed.note || ''}` +
                        (dbg ? ` | ${dbg}` : '')
                      );
                    }
                  }

                  // FastPath y el resto de frames sueltos no se listan: saturan el log y tapan cliprdr.
                  if (!processed.isCliprdr && !isFastPathNoise(pduDesc) && isDebug) {
                    console.log(`[Bridge] RDP->WASM frame#${framesFromRdp}: ${frame.length}B | ${pduDesc}`);
                  }

                  // Normalizar bitmaps 16bpp solo en sesiones Wallix / Bastión.
                  // Los fragmentos Fast-Path se juntan antes de corregir el stride;
                  // ordenes y puntero no esperan.
                  const readyFrames = normalizeBitmaps ? bitmapReassembler.push(frame) : [frame];

                  bytesFromRdp += n;
                  timeline.noteIn(isFastPath ? 'fp' : (processed.dvcForward ? 'dvc' : 'tpkt'), n);
                  if (processed.dvcForward) {
                    timeline.mark('primer-dvc-hacia-wasm', `#${framesFromRdp} ${n}B`);
                  }
                  trafficStats.note(pduDesc, n);
                  // El banner ya no pinta el destino. Tirarlo en señales de salto evita
                  // que ORDERS/SURFACE reescriban la cola RLE a 3 ms/tick.
                  if (channelFilter.egfxGraphics && !isFastPath) {
                    if (pduDesc.includes('DEACTIVATE_ALL')) {
                      dropStaleBannerBitmaps('DEACTIVATE_ALL');
                    } else if (pduDesc.includes('DEMAND_ACTIVE') && demandActiveCount >= 2) {
                      dropStaleBannerBitmaps('DEMAND_ACTIVE');
                    }
                  }
                  if (ws.readyState === ws.OPEN) {
                    try {
                      if (!normalizeBitmaps) flushPendingBitmap();
                      // Graphics (DynVC) no espera al rewriter del banner: mustFlushBefore
                      // reescribía toda la cola RLE antes de cada TPKT y el salto tardaba.
                      const gfxFast = gfxBypassesBitmapQueue(
                        channelFilter.egfxGraphics,
                        processed.dvcForward
                      );
                      const clipFast = processed.isCliprdr && !processed.buffered;
                      const staleBannerPending = channelFilter.egfxGraphics === true
                        && backpressure.hasPending()
                        && channelFilter.bannerBitmapsDropped !== true;
                      for (const ready of readyFrames) {
                        if (!ready || typeof ready.length !== 'number') continue;
                        // DynVC/EGFX (gfxFast) no espera al rewriter RLE del banner
                        // ni en bastion. Cliprdr fast solo en directo (bastion reensambla).
                        if ((gfxFast || (!normalizeBitmaps && clipFast)) && ready === frame) {
                          if (isDebug || !isFastPath) {
                            recentWasmFrames.push(
                              `#${framesFromRdp} ${ready.length}B | ${describeRdpPdu(ready)}` +
                              (processed.serverChannelId != null && processed.serverChannelId !== processed.channelId
                                ? ` [remap ch=${processed.serverChannelId}->${processed.channelId}]`
                                : '')
                            );
                            if (recentWasmFrames.length > RECENT_FRAMES_WINDOW) recentWasmFrames.shift();
                          }
                          sendDirectToWasm(ready);
                          continue;
                        }
                        // Un frame grafico no-bitmap (ordenes, surface...) no puede adelantar
                        // a bitmaps pendientes: se vacian antes, en orden.
                        // Con EGFX: TPKT siempre; ORDERS/SURFACE solo si el banner ya se tiro.
                        if (backpressure.mustFlushBefore(ready)
                            && !egfxSkipsSyncBitmapFlush(channelFilter.egfxGraphics, ready, {
                              staleBannerPending
                            })) {
                          flushPendingBitmap({ force: true, ignoreBudget: true });
                        }
                        if (backpressure.shouldShedBitmap(ws.bufferedAmount, ready)) {
                          // Sin rewrite: ahorra CPU mientras la cola WASM está llena
                          // o se agotó el presupuesto RLE de este tick.
                          if (backpressure.pendingOverflow()) {
                            if (normalizeBitmaps) {
                              // Una sola rodaja por evento TLS. El resto sigue en diferido.
                              if (!bastionSlicedThisTick) {
                                rewritePendingSlice();
                                backpressure.exhaustBudget();
                                bastionSlicedThisTick = true;
                                scheduleBastionSlice();
                              }
                            } else {
                              flushPendingBitmap({ force: true, ignoreBudget: true });
                            }
                          }
                          continue;
                        }
                        if (isDebug || !isFastPath) {
                          recentWasmFrames.push(
                            `#${framesFromRdp} ${ready.length}B | ${describeRdpPdu(ready)}` +
                            (processed.serverChannelId != null && processed.serverChannelId !== processed.channelId
                              ? ` [remap ch=${processed.serverChannelId}->${processed.channelId}]`
                              : '')
                          );
                          if (recentWasmFrames.length > RECENT_FRAMES_WINDOW) recentWasmFrames.shift();
                        }
                        rewriteAndSend(ready, framesFromRdp);
                      }
                    } catch (sendErr) {
                      console.warn('[Bridge] Error enviando frames a WebSocket:', sendErr.message);
                    }
                  }
                }
                // Directo: vaciar ya (enviar no reescribe). Bastion: no reescribir la rafaga
                // dentro de este callback; una rodaja diferida pinta lo que quede, tambien
                // si ya no llega mas trafico.
                if (!normalizeBitmaps && ws.readyState === ws.OPEN) {
                  try {
                    flushPendingBitmap({ force: true, ignoreBudget: true });
                  } catch (_) { /* noop */ }
                } else if (normalizeBitmaps && backpressure.hasPending()) {
                  scheduleBastionSlice();
                }
                try {
                  flushTickOut();
                } catch (sendErr) {
                  console.warn('[Bridge] Error enviando lote a WebSocket:', sendErr.message);
                }
                if (latencyMetrics) {
                  latencyMetrics.maybeLog((line) => console.log(line), normalizeBitmaps ? 2000 : 5000);
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
                    // Con trafico reciente no es idle: Wallix/red corto el socket (p.ej. cliprdr ilegal).
                    const resetReason = hadRecentServerTraffic()
                      ? 'Conexión cortada por el servidor remoto o la red'
                      : 'Conexión cortada por el servidor remoto o la red (posible inactividad)';
                    cleanup(resetReason, 4002);
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
          // Fast-track para eventos de entrada del cliente (ratón, teclado)
          // Los paquetes FastPath de entrada no contienen canales virtuales ni desconexiones.
          const isFastPathInput = Buffer.isBuffer(payload) && payload.length >= 2 &&
            (payload[0] & 0x03) === 0 && payload[0] !== 0x30;

          if (isFastPathInput) {
            bytesToRdp += payload.length;
            timeline.noteOut('input', payload.length);
            if (latencyMetrics) latencyMetrics.noteInput();
            if (tlsSocket && tlsSocket.writable) {
              tlsSocket.write(payload);
            } else if (targetSocket && targetSocket.writable) {
              targetSocket.write(payload);
            }
            return;
          }

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
            if (isDebug) {
              console.log(`🔬 [RDP Bridge] ${chMsg}`);
            }
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
          for (let clientFrame of clientFrames) {
            // Bastion sin EGFX: Confirm Active sin RFX/Surface (bpp intacto → RLE 16/24).
            // Con EGFX no se capa: el destino tiene que ver Surface/codecs del WASM.
            if (shouldSanitizeBastionConfirm(normalizeBitmaps, channelFilter.egfxGraphics)
                && clientFrame[0] === 0x03 && clientFrame.length > 100) {
              try {
                const bastionCaps = sanitizeBastionConfirmActiveGraphics(clientFrame);
                if (bastionCaps.patched) {
                  clientFrame = bastionCaps.buf;
                  clientFramesChanged = true;
                  if (isDebug) {
                    console.log(
                      `[Bridge] Bastion Confirm Active: bppTouched=${bastionCaps.bpp} surface0=${bastionCaps.surface}` +
                        ` codecsRemoved=${bastionCaps.codecsRemoved}`
                    );
                  }
                }
              } catch (capErr) {
                if (isDebug) console.warn('[Bridge] Error sanitizando Confirm Active bastion:', capErr.message);
              }
            }
            // Confirm Active del WASM: sondeo de capacidades (debug) y, con
            // NODETERM_RDP_FORCE32, pedir 32bpp en el Bitmap Capability.
            if ((isDebug || force32) && clientFrame[0] === 0x03 && clientFrame.length > 100) {
              try {
                const clientCaps = describeCapabilities(clientFrame);
                if (clientCaps && clientCaps.kind === 'CONFIRM') {
                  if (isDebug) console.log(formatCapabilities(clientCaps));
                  if (force32 && !channelFilter.isBastion) {
                    const hasRfx = clientCaps.codecs.some((c) => c.name === 'RemoteFX' || c.name === 'ImageRemoteFX');
                    if (clientCaps.surfaceCmds != null && hasRfx) {
                      const capPatch = patchConfirmActiveBitmapBpp(clientFrame, 32);
                      if (capPatch.patched) {
                        clientFrame = capPatch.buf;
                        clientFramesChanged = true;
                        console.log(`[Bridge] FORCE32: Confirm Active bpp ${capPatch.before} -> 32`);
                      }
                    } else {
                      console.log('[Bridge] FORCE32: el WASM no anuncia RemoteFX/SurfaceCommands; Confirm Active sin cambios');
                    }
                  }
                }
              } catch (capErr) {
                if (isDebug) console.warn('[Bridge] Error sondeando capacidades:', capErr.message);
              }
            }
            const clientDisc = describeDisconnectPdu(clientFrame);
            if (clientDisc) {
              lastDisconnectDesc = preferDisconnectDesc(lastDisconnectDesc, clientDisc);
              connState.userClosing = true;
            }
            const { forward: kept, inject, extraForwardsBefore, extraForwards } =
              this.filterClientVirtualChannelFrame(clientFrame, channelFilter);
            if (timeline.enabled) {
              const sendOut = parseMcsSendData(clientFrame);
              const isDvcOut = !!sendOut && (
                (channelFilter.wasmDrdynvcChannelId != null && sendOut.channelId === channelFilter.wasmDrdynvcChannelId)
                || (channelFilter.drdynvcChannelId != null && sendOut.channelId === channelFilter.drdynvcChannelId)
              );
              if (kept) {
                timeline.noteOut(isDvcOut ? 'dvc' : 'tpkt', kept.length);
                if (isDvcOut) timeline.mark('primer-dvc-cliente-al-servidor', `${kept.length}B`);
              } else if (isDvcOut) {
                timeline.event('DVC del cliente NO reenviado al servidor', `${clientFrame.length}B`);
              }
            }
            if (kept !== clientFrame || (extraForwardsBefore && extraForwardsBefore.length)
                || (extraForwards && extraForwards.length)) {
              clientFramesChanged = true;
            }
            if (extraForwardsBefore && extraForwardsBefore.length) {
              keptClientFrames.push(...extraForwardsBefore);
            }
            if (kept) keptClientFrames.push(kept);
            if (extraForwards && extraForwards.length) keptClientFrames.push(...extraForwards);
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
                  const errMsg = `[Bridge] No se pudo inyectar PDU cliprdr hacia WASM: ${e.message}`;
                  console.warn(errMsg);
                  recordCliprdrEvent(`ERROR: ${errMsg}`);
                }
              }
            });
          }


          const pduDesc = describeRdpPdu(payload);

          if (isDebug) {
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
            const earlyCaps = describeClientEarlyCaps(payload);
            if (earlyCaps) console.log(formatClientEarlyCaps(earlyCaps));
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
            injectChannels: resolveInjectedChannels(session),
            force32
          });
          forward = prepared.buf;
          const sentChs = findClientNetworkChannels(prepared.buf);
          // Una linea por conexion, siempre: el juego de canales condiciona todo el resto de la
          // sesion y sin este rastro una inyeccion que no se aplica no se distingue de una que si.
          const wallixService = wallixServiceFromSession(session) || 'n/a';
          const csNet = sentChs.length ? sentChs.join(',') : 'ninguno';
          console.log(`[Bridge] MCS prepare: service=${wallixService} CS_NET=[${csNet}]; ${prepared.notes.join('; ') || 'sin cambios'}`);
          if (sentChs.length) {
            channelFilter.mcsConnectPrepared = true;
            const wasmChs = findClientNetworkChannels(payload);
            if (wasmChs.length && (!channelFilter.wasmChannelNames || channelFilter.wasmChannelNames.length === 0)) {
              channelFilter.wasmChannelNames = wasmChs;
            } else if (!channelFilter.wasmChannelNames || channelFilter.wasmChannelNames.length === 0) {
              channelFilter.wasmChannelNames = (channelFilter.clientChannelNames || []).slice();
            }
            channelFilter.clientChannelNames = sentChs;
          }
        } else if (framesToRdp <= 10 && forward) {
          // Directo con NLA: el primer frame post-TLS es CredSSP y el Connect Initial llega
          // despues. Aplicar prepare (inyeccion + nombres) una sola vez; learnClientInitiator
          // puede haber rellenado wasmChannelNames antes, pero aun hace falta inject/FORCE32.
          if (isMcsConnectInitial(forward) && !channelFilter.mcsConnectPrepared) {
            channelFilter.mcsConnectPrepared = true;
            const connectInitial = forward;
            const preparedLate = prepareMcsConnectInitial(connectInitial, savedSelectedProtocol, {
              injectChannels: resolveInjectedChannels(session),
              force32
            });
            forward = preparedLate.buf;
            const sentChsLate = findClientNetworkChannels(preparedLate.buf);
            const wallixServiceLate = wallixServiceFromSession(session) || 'n/a';
            const csNetLate = sentChsLate.length ? sentChsLate.join(',') : 'ninguno';
            console.log(`[Bridge] MCS prepare (NLA late): service=${wallixServiceLate} CS_NET=[${csNetLate}]; ${preparedLate.notes.join('; ') || 'sin cambios'}`);
            if (sentChsLate.length) {
              const wasmChsLate = findClientNetworkChannels(connectInitial);
              if (wasmChsLate.length && (!channelFilter.wasmChannelNames || channelFilter.wasmChannelNames.length === 0)) {
                channelFilter.wasmChannelNames = wasmChsLate;
              } else if (!channelFilter.wasmChannelNames || channelFilter.wasmChannelNames.length === 0) {
                channelFilter.wasmChannelNames = sentChsLate.slice();
              }
              channelFilter.clientChannelNames = sentChsLate;
            }
          } else if (force32 && !channelFilter.isBastion && isMcsConnectInitial(forward)) {
            const want32 = patchClientCoreWant32bpp(forward);
            if (want32.patched) {
              forward = want32.buf;
              console.log(`[Bridge] FORCE32 Connect Initial: ${want32.changes.join(', ')}`);
            }
          }
          // Solo se aplican los interruptores de rendimiento que ya existen en el formulario
          // (fondo, arrastre de ventana completa, animaciones de menu, composicion).
          // Temas y suavizado de fuentes se dejan como los envia IronRDP: sus defaults del
          // formulario (false) cambiarian el aspecto de las conexiones guardadas.
          const infoResult = patchInfoPacket(forward, {
            enableWallpaper: session.enableWallpaper,
            enableFullWindowDrag: session.enableFullWindowDrag,
            enableMenuAnimations: session.enableMenuAnimations,
            enableDesktopComposition: session.enableDesktopComposition
          });
          if (infoResult.perfFlagsBefore != null && !channelFilter.loggedPerfFlags) {
            channelFilter.loggedPerfFlags = true;
            console.log(
              `[Bridge] perfFlags cliente: 0x${infoResult.perfFlagsBefore.toString(16)} -> 0x${infoResult.perfFlagsAfter.toString(16)}` +
              ` (wallpaper=${session.enableWallpaper ? 'on' : 'off'}, dragCompleto=${session.enableFullWindowDrag ? 'on' : 'off'},` +
              ` animMenus=${session.enableMenuAnimations ? 'on' : 'off'}, composicion=${session.enableDesktopComposition ? 'on' : 'off'})`
            );
          }
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
    // Si el servidor entrego cliprdr por el canal IO, serverCliprdrChannelId apunta al
    // canal IO (1003). El path de recuperacion (fallbackIoNamedCliprdrWrite) usa ioChannelId
    // para detectarlo: se mantiene dest=serverCliprdrChannelId para que destIsIo sea correcto.
    const dest = channelFilter.serverCliprdrChannelId || channelFilter.cliprdrOnUnsafeChannel || 1001;
    const negotiated = channelFilter.cliprdrChannelId;
    const destIsIo = channelFilter.ioChannelId != null && dest === channelFilter.ioChannelId;
    const keepClientCaps = isUserMcsChannel(channelFilter, dest) || destIsIo;
    const inject = [];
    // Aunque no se escriba en 1001, hay que cachear el handshake por si mas
    // tarde se confirma un VC estatico (o un segundo MONITOR_READY del selector).
    if (clipDesc) rememberClientCliprdrHandshake(channelFilter, clipDesc, frame);
    if (!channelFilter.loggedCliprdrMisaligned) {
      channelFilter.loggedCliprdrMisaligned = true;
      const csNet = Array.isArray(channelFilter.clientChannelNames)
        ? channelFilter.clientChannelNames.join(',')
        : '?';
      const destName = channelFilter.channelIdToName instanceof Map
        ? (channelFilter.channelIdToName.get(dest) || 'sin-nombre')
        : 'sin-nombre';
      const svc = channelFilter.wallixService || 'n/a';
      const misMsg = `⚠️ [Bridge Clipboard] ${svc} cliprdr no alineado; CS_NET=[${csNet}] dest=${dest} (${destName})`;
      console.warn(misMsg);
      if (typeof channelFilter.recordCliprdr === 'function') channelFilter.recordCliprdr(misMsg);
      this.emit('diagnostic-log', { category: 'cliprdr-misaligned', message: misMsg });
    }
    // EGFX: un CHANNEL_PDU en 1001 o en el IO (1003) congela el gráfico tras el banner.
    // Se encola y se acusa al WASM. Sin EGFX se mantiene el camino de bitmap.
    const egfxMuteUnsafe = channelFilter.egfxGraphics === true
      && (isUserMcsChannel(channelFilter, dest) || destIsIo);
    const synthAck = () => {
      if (!isCliprdrFormatListDesc(clipDesc) || channelFilter.cliprdrFormatListAcked) return;
      channelFilter.cliprdrFormatListAcked = true;
      inject.push(buildCliprdrFormatListResponseOk(0, negotiated));
      const ackMsg = '[Bridge Clipboard] CB_FORMAT_LIST_RESPONSE(OK) sintetizado hacia WASM ' +
        `(FORMAT_LIST por ${negotiated} cierra la sesion si el saludo fue por ${dest})`;
      if (typeof channelFilter.recordCliprdr === 'function') channelFilter.recordCliprdr(ackMsg);
      if (rdpDebug()) console.log(ackMsg);
      this.emit('diagnostic-log', { category: 'cliprdr', message: ackMsg });
    };

    if (egfxMuteUnsafe) {
      synthAck();
      enqueueClientCliprdr(channelFilter, frame);
      if (!channelFilter.loggedCliprdrUserMute) {
        channelFilter.loggedCliprdrUserMute = true;
        const muteMsg = `⚠️ [Bridge Clipboard] EGFX: cliprdr WASM->RDP encolado: no se escribe CHANNEL_PDU en MCS ${dest} (congela el grafico)`;
        console.warn(muteMsg);
        if (typeof channelFilter.recordCliprdr === 'function') channelFilter.recordCliprdr(muteMsg);
        this.emit('diagnostic-log', { category: 'cliprdr-mute', message: muteMsg });
      }
      return { forward: null, inject };
    }

    const appProbePayload = channelFilter.wallixService === 'APP'
      && greetingOnUnsafeCliprdr(channelFilter)
      && isCliprdrClientPayloadDesc(clipDesc);
    if (!appProbePayload && channelFilter.cliprdrWriteChannelId == null) {
      const recovered = destIsIo
        ? fallbackIoNamedCliprdrWrite(channelFilter)
        : fallbackNamedCliprdrWrite(channelFilter);
      if (recovered != null) channelFilter.cliprdrWriteChannelId = recovered;
    }
    sanitizeIllegalCliprdrWrite(channelFilter);
    const recoveredDest = channelFilter.cliprdrWriteChannelId;
    const recoveredSafe = !appProbePayload
      && channelFilter.wallixService !== 'n/a'
      && recoveredDest != null
      && canFlushCliprdrToNamedVc(channelFilter)
      && !isUserMcsChannel(channelFilter, recoveredDest)
      && (channelFilter.ioChannelId == null || recoveredDest !== channelFilter.ioChannelId);

    if (recoveredSafe) {
      const isCaps = clipDesc && clipDesc.includes('CB_CLIP_CAPS');
      const extraForwardsBefore = [];
      if (isCaps) {
        channelFilter.cliprdrHandshakeSentToRecoveredDest = true;
      } else if (!channelFilter.cliprdrHandshakeSentToRecoveredDest && Buffer.isBuffer(channelFilter.cachedClientCaps)) {
        channelFilter.cliprdrHandshakeSentToRecoveredDest = true;
        channelFilter.cliprdrHandshakeSentToRecoveredDestAlready = true;
        const flags = CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST | CHANNEL_FLAG_SHOW_PROTOCOL;
        extraForwardsBefore.push(applyCliprdrReplayFrame(channelFilter.cachedClientCaps, recoveredDest, flags));
      }

      if (clipDesc && clipDesc.includes('CB_TEMP_DIRECTORY')) {
        // Para service=RDP el TEMPDIR es necesario: el Session Probe de Wallix lo usa
        // para validar el directorio temporal en la maquina de escritorio de destino.
        // Solo se descarta cuando el servicio no es RDP (APP/n/a/sin servicio).
        if (channelFilter.wallixService !== 'RDP') {
          return { forward: null, inject };
        }
        // Para RDP: reenviar TEMPDIR remapeado al write path recuperado.
        const out = rewriteMcsChannelId(frame, recoveredDest) || frame;
        return { forward: out, inject, extraForwardsBefore };
      }

      if (isCaps && channelFilter.cliprdrHandshakeSentToRecoveredDestAlready) {
        return { forward: null, inject };
      }
      if (isCaps) {
        channelFilter.cliprdrHandshakeSentToRecoveredDestAlready = true;
      }


      channelFilter.cliprdrRecoveredFromUnsafe = true;
      if (!channelFilter.loggedCliprdrRecovered) {
        channelFilter.loggedCliprdrRecovered = true;
        const recMsg = `[Bridge Clipboard] write path recuperado ch=${recoveredDest} (saludo por ${dest})`;
        console.warn(recMsg);
        if (typeof channelFilter.recordCliprdr === 'function') channelFilter.recordCliprdr(recMsg);
        this.emit('diagnostic-log', { category: 'cliprdr', message: recMsg });
      }
      synthAck();
      if (clipDesc && clipDesc.includes('CB_FORMAT_DATA_REQUEST')) {
        channelFilter.cliprdrDataRequested = true;
      }
      const out = rewriteMcsChannelId(frame, recoveredDest) || frame;
      return { forward: out, inject, extraForwardsBefore };
    }

    if (clipDesc && clipDesc.includes('CB_TEMP_DIRECTORY')) {
      const dropMsg = `⚠️ [Bridge Clipboard] CB_TEMP_DIRECTORY del cliente descartado (destino ${dest}): ${clipDesc}`;
      console.warn(dropMsg);
      if (typeof channelFilter.recordCliprdr === 'function') channelFilter.recordCliprdr(dropMsg);
      this.emit('diagnostic-log', { category: 'cliprdr-tempdir-drop', message: dropMsg });
      return { forward: null, inject };
    }

    if (!keepClientCaps && clipDesc && clipDesc.includes('CB_CLIP_CAPS')) {
      const dropMsg = `⚠️ [Bridge Clipboard] CB_CLIP_CAPS del cliente descartado (destino ${dest} congela el grafico): ${clipDesc}`;
      console.warn(dropMsg);
      if (typeof channelFilter.recordCliprdr === 'function') channelFilter.recordCliprdr(dropMsg);
      this.emit('diagnostic-log', { category: 'cliprdr-caps-drop', message: dropMsg });
      return { forward: null, inject };
    }

    synthAck();

    if (clipDesc && clipDesc.includes('CB_FORMAT_DATA_REQUEST')) {
      channelFilter.cliprdrDataRequested = true;
    }

    const isFormatList = clipDesc && clipDesc.includes('CB_FORMAT_LIST')
      && !clipDesc.includes('CB_FORMAT_LIST_RESPONSE');
    const isBastionIo = destIsIo && (channelFilter.isBastion || channelFilter.wallixService === 'RDP');
    const payloadOk = isCliprdrClientPayloadDesc(clipDesc) && !(isFormatList && isBastionIo);
    const unsafeDest = unsafeCliprdrClientWriteDest(channelFilter, dest);
    if (payloadOk && unsafeDest != null) {
      let out = unsafeDest === parsed.channelId
        ? frame
        : (rewriteMcsChannelId(frame, unsafeDest) || frame);
      const keepShowProtocol = (channelFilter.wallixService === 'APP'
          || channelFilter.wallixService === 'RDP')
        && greetingOnUnsafeCliprdr(channelFilter);
      if (isUserMcsChannel(channelFilter, unsafeDest) && !keepShowProtocol) {
        const cleaned = clearChannelPduShowProtocol(out, parsed.dataOff);
        if (cleaned) out = cleaned;
      }
      const extras = buildAppProbeCliprdrWrites(channelFilter, out, clipDesc);
      if (!channelFilter.loggedCliprdrUnsafePayload) {
        channelFilter.loggedCliprdrUnsafePayload = true;
        const extraNote = extras.before.length
          ? `; CAPS tambien por ${unsafeDest}`
          : '';
        const mirrorNote = extras.after.length
          ? `; lista/datos tambien por ${channelFilter.cliprdrWriteChannelId}`
          : '';
        const payMsg = `[Bridge Clipboard] cliprdr datos por ch=${unsafeDest} (saludo por ${dest}${extraNote}${mirrorNote})`;
        console.warn(payMsg);
        if (typeof channelFilter.recordCliprdr === 'function') channelFilter.recordCliprdr(payMsg);
        this.emit('diagnostic-log', { category: 'cliprdr', message: payMsg });
      }
      return {
        forward: out,
        inject,
        extraForwardsBefore: extras.before,
        extraForwards: extras.after
      };
    }

    // MCS 1001/1002: CHANNEL_PDU de CAPS/TEMPDIR deja el TLS vivo y congela el grafico.
    // Se encola por si mas tarde se confirma el VC cliprdr estatico (1004).
    if (keepClientCaps) {
      enqueueClientCliprdr(channelFilter, frame);
      if (!channelFilter.loggedCliprdrUserMute) {
        channelFilter.loggedCliprdrUserMute = true;
        const muteMsg = `⚠️ [Bridge Clipboard] cliprdr WASM->RDP encolado: no se escribe CHANNEL_PDU en MCS ${dest} (congela el grafico)`;
        console.warn(muteMsg);
        if (typeof channelFilter.recordCliprdr === 'function') channelFilter.recordCliprdr(muteMsg);
        this.emit('diagnostic-log', { category: 'cliprdr-mute', message: muteMsg });
      }
      return { forward: null, inject };
    }

    if (!allowUserChannelCliprdr()) {
      enqueueClientCliprdr(channelFilter, frame);
      if (!channelFilter.loggedCliprdrUserMute) {
        channelFilter.loggedCliprdrUserMute = true;
        const muteMsg = `⚠️ [Bridge Clipboard] cliprdr WASM->RDP encolado: no se escribe CHANNEL_PDU en ${negotiated} (cierra si dest=${dest})`;
        console.warn(muteMsg);
        if (typeof channelFilter.recordCliprdr === 'function') channelFilter.recordCliprdr(muteMsg);
        this.emit('diagnostic-log', { category: 'cliprdr-mute', message: muteMsg });
      }
      return { forward: null, inject };
    }

    let out = rewriteMcsChannelId(frame, dest) || frame;
    const cleaned = clearChannelPduShowProtocol(out, parsed.dataOff);
    if (cleaned) out = cleaned;
    if (!channelFilter.loggedCliprdrUserRemap) {
      channelFilter.loggedCliprdrUserRemap = true;
      const remapMsg = `[Bridge Clipboard] cliprdr WASM->RDP remapeado ch=${parsed.channelId}->${dest} (escribir en ${negotiated} cierra la sesion)`;
      if (typeof channelFilter.recordCliprdr === 'function') channelFilter.recordCliprdr(remapMsg);
      if (rdpDebug()) console.log(remapMsg);
      this.emit('diagnostic-log', { category: 'cliprdr', message: remapMsg });
    }
    return { forward: out, inject };
  }

  /**
   * Si el write path se confirma en un VC estatico (p.ej. MONITOR_READY en 1004 tras CAPS en 1001),
   * se vacia la cola de PDUs del cliente hacia ese canal.
   */
  flushPendingClientCliprdr(channelFilter, tlsSocket, ws, onBytes) {
    sanitizeIllegalCliprdrWrite(channelFilter);
    if (!canFlushCliprdrToNamedVc(channelFilter)) {
      if (Array.isArray(channelFilter.pendingClientCliprdr)
          && channelFilter.pendingClientCliprdr.length > 0
          && greetingStillOnIo(channelFilter)
          && !channelFilter.loggedCliprdrFlushDeferredIo) {
        channelFilter.loggedCliprdrFlushDeferredIo = true;
        const deferMsg = `[Bridge Clipboard] flush diferido: saludo aun en IO ${channelFilter.serverCliprdrChannelId} (no escribir VC nombrado)`;
        if (typeof channelFilter.recordCliprdr === 'function') channelFilter.recordCliprdr(deferMsg);
        console.warn(deferMsg);
        this.emit('diagnostic-log', { category: 'cliprdr', message: deferMsg });
      }
      return;
    }
    const pending = takePendingClientCliprdr(channelFilter);
    if (!pending.length) return;
    const wasmInjections = [];
    for (const queued of pending) {
      const { forward, inject, extraForwardsBefore, extraForwards } =
        this.filterClientVirtualChannelFrame(queued, channelFilter);
      const outgoing = [];
      if (extraForwardsBefore && extraForwardsBefore.length) outgoing.push(...extraForwardsBefore);
      if (forward) outgoing.push(forward);
      if (extraForwards && extraForwards.length) outgoing.push(...extraForwards);
      for (const out of outgoing) {
        if (!out || !tlsSocket || !tlsSocket.writable) continue;
        if (typeof onBytes === 'function') onBytes(out.length);
        tlsSocket.write(out);
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
    if (isClip && !isCliprdrFragmentDesc(clipDesc) && shouldRecordMutedClientCliprdr(channelFilter, clipDesc)) {
      const wasmMsg = `📤 cliprdr ch=${parsed.channelId} ${clipDesc}`;
      if (typeof channelFilter.recordCliprdr === 'function') {
        channelFilter.recordCliprdr(wasmMsg, { inbound: false });
      }
      if (rdpDebug()) {
        console.log(`📋 ${wasmMsg}`);
      }
      this.emit('diagnostic-log', { category: 'wasm-channel', message: wasmMsg });
    }

    if (!isClip) {
      // Caps quick-reply: el bridge ya respondio Caps al servidor; un segundo
      // CapsResponse del WASM desalinea DynVC / alarga el salto Wallix.
      if (channelFilter.egfxCapsRepliedByBridge) {
        const dvcClient = parseDvcPdu(parsed.userData);
        if (dvcClient && dvcClient.type === 'caps-req') {
          if (!channelFilter.loggedEgfxCapsMute) {
            channelFilter.loggedEgfxCapsMute = true;
            console.log('[Bridge] DynVC: CapsResponse WASM omitido (bridge ya respondio al servidor)');
          }
          return { forward: null, inject: [] };
        }
      }
      // Con inyeccion, WASM habla DynVC en wasmDrdynvcChannelId y el servidor en
      // drdynvcChannelId. AUDIO_PLAYBACK_DVC llega antes del saludo cliprdr: si no
      // remapeamos el CREATE_RSP, el servidor no ve la respuesta y la sesion cuelga
      // en "conectando". En bastion puro sin EGFX se mantiene el gate cliprdr.
      const needsDynvcRemap = channelFilter.wasmDrdynvcChannelId != null
        && channelFilter.drdynvcChannelId != null
        && channelFilter.wasmDrdynvcChannelId !== channelFilter.drdynvcChannelId;
      const canRemapDynvc = !needsDynvcRemap
        || channelFilter.cliprdrWriteChannelId != null
        || channelFilter.cliprdrServerReady
        || channelFilter.isBastion !== true
        || wasmAllowsGraphicsDvc(channelFilter);
      let out = frame;
      if (canRemapDynvc) {
        out = remapClientDrdynvcFrame(channelFilter, out);
      }
      out = remapClientRdpsndFrame(channelFilter, out);
      return {
        forward: out,
        inject: []
      };
    }

    // Aviso de orden CLIPRDR: el cliente no deberia emitir nada antes de CB_MONITOR_READY
    // (MS-RDPECLIP 1.3.2.1). No se descarta el PDU; solo se avisa una vez por sesion.
    if (!channelFilter.cliprdrServerReady && !channelFilter.loggedCliprdrBeforeReady) {
      channelFilter.loggedCliprdrBeforeReady = true;
      const guardMsg = `⚠️ [Bridge Clipboard] PDU cliprdr WASM->RDP antes de CB_MONITOR_READY (se reenvía igualmente): ${clipDesc}`;
      console.warn(guardMsg);
      if (typeof channelFilter.recordCliprdr === 'function') {
        channelFilter.recordCliprdr(guardMsg);
      }
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
      && (isSafeStaticCliprdrWrite(channelFilter, serverClipCh) || writeCh === serverClipCh)
      && (writeCh == null || writeCh === serverClipCh);
    const isBastion = serverClipCh != null
      && serverClipCh !== channelFilter.cliprdrChannelId
      && !greetingOnAlignedStatic;
    if (isBastion) {
      channelFilter.isBastion = true;
    }
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
    // Se incluye el caso serverClipCh==null: cuando el servidor no ha enviado cliprdr todavia
    // el CAPS del cliente debe igualmente cachearse para el rehandshake posterior.
    const destIsUserChannel = writeCh == null && (
      serverClipCh == null
      || isUserMcsChannel(channelFilter, serverClipCh)
      || (channelFilter.cliprdrOnUnsafeChannel != null
          && (serverClipCh == null || isUserMcsChannel(channelFilter, serverClipCh)
              || serverClipCh === channelFilter.cliprdrOnUnsafeChannel))
    );

    // Destino distinto del VC negociado (APP/ESAH 1001, IO 1003, rdpsnd 1005).
    // FORMAT_LIST en 1004 cierra el TLS. CHANNEL_PDU en MCS 1001 congela el grafico;
    // en IO (1003) rompe el Share Control. CAPS en rdpsnd deja la pantalla en negro.
    // TEMPDIR se descarta para APP/n/a/sin-nombre; se reenvía si service=RDP (Session Probe lo necesita).
    // filterClientCliprdrOnUserChannel no escribe en canales inseguros pero sintetiza
    // CB_FORMAT_LIST_RESPONSE(OK) para que IronRDP WASM pase a Ready.
    const appProbePayload = channelFilter.wallixService === 'APP'
      && greetingOnUnsafeCliprdr(channelFilter)
      && isCliprdrClientPayloadDesc(clipDesc);
    if (isClip && (destIsUserChannel || destIsIoChannel || (writeCh == null && destIsForeignStaticVc)
        || appProbePayload)) {
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
      const dropMsg = `⚠️ [Bridge Clipboard] CB_CLIP_CAPS del cliente descartado (destino ${handshakeDest} congela el grafico): ${clipDesc}`;
      console.warn(dropMsg);
      if (typeof channelFilter.recordCliprdr === 'function') {
        channelFilter.recordCliprdr(dropMsg);
      }
      this.emit('diagnostic-log', { category: 'cliprdr-caps-drop', message: dropMsg });
      return { forward: null, inject: [] };
    }
    if (isClip && (handshakeName === 'rdpsnd' || handshakeName === 'rdpdr') &&
        clipDesc && clipDesc.includes('CB_TEMP_DIRECTORY') && !greetingOnHandshakeDest) {
      const dropMsg = `⚠️ [Bridge Clipboard] CB_TEMP_DIRECTORY del cliente descartado (destino ${handshakeDest}): ${clipDesc}`;
      console.warn(dropMsg);
      if (typeof channelFilter.recordCliprdr === 'function') {
        channelFilter.recordCliprdr(dropMsg);
      }
      this.emit('diagnostic-log', { category: 'cliprdr-tempdir-drop', message: dropMsg });
      return { forward: null, inject: [] };
    }
    const unnamedHandshake = channelFilter.channelIdToName instanceof Map
      && handshakeDest != null
      && !channelFilter.channelIdToName.has(handshakeDest);
    const dropTempOnRecovery = unnamedHandshake
      // Para service=RDP (ESAH/Wallix), TEMPDIR es necesario para el handshake:
      // no se descarta aunque el write path se haya recuperado de un canal IO.
      || (channelFilter.cliprdrRecoveredFromUnsafe
          && channelFilter.wallixService !== 'RDP');
    if (isClip && clipDesc && clipDesc.includes('CB_TEMP_DIRECTORY') && dropTempOnRecovery) {
      const why = unnamedHandshake
        ? `${handshakeDest} sin nombre`
        : `recuperado ch=${handshakeDest}`;
      const dropMsg = `[Bridge Clipboard] CB_TEMP_DIRECTORY del cliente descartado (destino ${why}): ${clipDesc}`;
      console.warn(dropMsg);
      if (typeof channelFilter.recordCliprdr === 'function') {
        channelFilter.recordCliprdr(dropMsg);
      }
      this.emit('diagnostic-log', { category: 'cliprdr-tempdir-drop', message: dropMsg });
      return { forward: null, inject: [] };
    }

    const dropCaps = isBastion && clipDesc && clipDesc.includes('CB_CLIP_CAPS') &&
      readDiagFlag('NODETERM_RDP_CLIPRDR_DROP_CLIENT_CAPS');
    if (dropCaps) {
      const dropMsg = `⚠️ [Bridge Clipboard] CB_CLIP_CAPS del cliente descartado (el bastion corta al recibirlo): ${clipDesc}`;
      console.warn(dropMsg);
      if (typeof channelFilter.recordCliprdr === 'function') {
        channelFilter.recordCliprdr(dropMsg);
      }
      this.emit('diagnostic-log', { category: 'cliprdr-caps-drop', message: dropMsg });
      return { forward: null, inject: [] };
    }

    const dropTemp = isBastion && clipDesc && clipDesc.includes('CB_TEMP_DIRECTORY') &&
      readDiagFlag('NODETERM_RDP_CLIPRDR_DROP_CLIENT_TEMPDIR');
    if (dropTemp) {
      const dropMsg = `⚠️ [Bridge Clipboard] CB_TEMP_DIRECTORY del cliente descartado (ruta relativa): ${clipDesc}`;
      console.warn(dropMsg);
      if (typeof channelFilter.recordCliprdr === 'function') {
        channelFilter.recordCliprdr(dropMsg);
      }
      this.emit('diagnostic-log', { category: 'cliprdr-tempdir-drop', message: dropMsg });
      return { forward: null, inject: [] };
    }

    // Experimento de diagnostico: silencia por completo el sentido cliente->servidor del canal
    // cliprdr sin tocar el contrario. Aisla si el cierre lo provoca el dato del cliente.
    if (readDiagFlag('NODETERM_RDP_CLIPRDR_MUTE_CLIENT')) {
      const muteMsg = `🔇 [Bridge Clipboard] cliprdr WASM->RDP silenciado (experimento): ${clipDesc}`;
      console.log(muteMsg);
      if (typeof channelFilter.recordCliprdr === 'function') {
        channelFilter.recordCliprdr(muteMsg);
      }
      this.emit('diagnostic-log', { category: 'cliprdr-mute', message: muteMsg });
      return { forward: null, inject: [] };
    }

    // Marca que el cliente ya ha pedido el contenido del portapapeles: a partir de aqui interesa
    // ver todos los frames del servidor para saber si contesta, si calla o si algo se descarta.
    if (clipDesc && clipDesc.includes('CB_FORMAT_DATA_REQUEST')) {
      channelFilter.cliprdrDataRequested = true;
    }

    // Serie chunked (p.ej. FORMAT_DATA_RESPONSE flags=0x11): el FIRST abre y LAST cierra.
    // Hay que remapear tambien middle/LAST sin CLIPRDR_HEADER (inyeccion 1004->1005).
    const wasFragmentOpen = channelFilter.clientCliprdrFragmentOpen === true;
    noteClientCliprdrFragment(channelFilter, parsed.userData);

    let out = frame;
    const inject = [];

    // Se escribe en el canal por el que el servidor entrega cliprdr de verdad, que es el que
    // aprende el filtro, no en el que negocio el cliente: el bastion usa uno distinto y cambia
    // entre sesiones. Conexiones directas: serverClipCh coincide con el del cliente y no se toca.
    // 1001/IO no. Un VC estatico ajeno (rdpsnd) si es el write path confirmado (saludo ahi).
    const remapDest = writeCh != null ? writeCh : serverClipCh;
    const fragmentRemap = wasFragmentOpen || channelFilter.clientCliprdrFragmentOpen === true;
    const canRemap = !readDiagFlag('NODETERM_RDP_CLIPRDR_NO_REMAP') &&
      remapDest != null &&
      remapDest !== parsed.channelId &&
      !destIsIoChannel &&
      (fragmentRemap
        || ((writeCh != null || !destIsForeignStaticVc) && !destIsUserChannel));

    if (canRemap) {
      const remapped = rewriteMcsChannelId(out, remapDest);
      if (remapped) {
        out = remapped;
        const remapMsg = `[Bridge Clipboard] cliprdr WASM->RDP remapeado ch=${parsed.channelId}->${remapDest}`;
        if (typeof channelFilter.recordCliprdr === 'function') {
          channelFilter.recordCliprdr(remapMsg);
        }
        if (rdpDebug() || !channelFilter.loggedCliprdrRemap) {
          channelFilter.loggedCliprdrRemap = true;
          if (rdpDebug()) {
            console.log(`📤 ${remapMsg}`);
          }
          this.emit('diagnostic-log', { category: 'cliprdr', message: remapMsg });
        }
      }
    }

    // IronRDP marca CHANNEL_FLAG_SHOW_PROTOCOL (flags=0x13). En el salto del
    // selector la maquina saluda con 0x3, pero solo acusa el FORMAT_LIST si el
    // cliente mantiene 0x13 (el mismo encuadre que CAPS y TEMPDIR). Limpiar el
    // flag aqui deja la lista en 0x3 y no hay CB_FORMAT_LIST_RESPONSE.
    const dropShowProtocol = isBastion && canRemap;
    if (dropShowProtocol) {
      const cleaned = clearChannelPduShowProtocol(out, parsed.dataOff);
      if (cleaned) {
        out = cleaned;
        if (rdpDebug()) {
          const flagMsg = '[Bridge] CHANNEL_FLAG_SHOW_PROTOCOL limpiado en cliprdr WASM->RDP (bastion)';
          console.log(flagMsg);
          this.emit('diagnostic-log', { category: 'cliprdr', message: flagMsg });
        }
      }
    }

    if (out && clipDesc && clipDesc.includes('CB_CLIP_CAPS') && channelFilter.cliprdrDeferWeakCaps
        && !channelFilter.cliprdrClientCapsWirePatched) {
      rememberClientCliprdrHandshake(channelFilter, clipDesc, out);
      const patched = patchClientCapsGeneralFlags(out, channelFilter.cliprdrServerGeneralFlags);
      if (patched) {
        out = patched;
        channelFilter.cliprdrClientCapsWirePatched = true;
        const patchMsg = '[Bridge Clipboard] CB_CLIP_CAPS hacia el selector recortado a generalFlags=0x' +
          `${(channelFilter.cliprdrServerGeneralFlags || 0).toString(16)} (la copia para la maquina conserva file clip)`;
        if (typeof channelFilter.recordCliprdr === 'function') channelFilter.recordCliprdr(patchMsg);
        if (rdpDebug()) console.log(patchMsg);
        this.emit('diagnostic-log', { category: 'cliprdr', message: patchMsg });
      }
    }

    if (out && clipDesc) {
      rememberClientCliprdrHandshake(channelFilter, clipDesc, out);
      const parsedOut = parseMcsSendData(out);
      const outDesc = parsedOut ? describeCliprdrPdu(parsedOut.userData) : null;
      if (outDesc && outDesc !== clipDesc && typeof channelFilter.recordCliprdr === 'function') {
        const sentMsg = `📤 cliprdr ch=${parsedOut.channelId} ${outDesc}`;
        channelFilter.recordCliprdr(sentMsg);
        if (rdpDebug()) console.log(sentMsg);
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
      const ackMsg = '📥 [Bridge Clipboard] CB_FORMAT_LIST_RESPONSE(OK) sintetizado hacia WASM ' +
        '(el bastión no lo envía y sin él IronRDP nunca pasa a Ready)';
      if (typeof channelFilter.recordCliprdr === 'function') {
        channelFilter.recordCliprdr(ackMsg);
      }
      if (rdpDebug()) {
        console.log(ackMsg);
      }
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
   * La pestana o el renderer van a hacer shutdown: el FIN de TLS que sigue
   * no debe clasificarse como corte del servidor remoto.
   */
  markUserClose(tokenId) {
    if (!tokenId) return false;
    let marked = false;
    for (const conn of this.activeConnections.values()) {
      if (conn.session && conn.session.id === tokenId) {
        conn.userClosing = true;
        marked = true;
      }
    }
    return marked;
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
module.exports.isBastionSession = isBastionSession;
module.exports.resolveIronRdpGraphics = resolveIronRdpGraphics;
module.exports.shouldSanitizeBastionConfirm = shouldSanitizeBastionConfirm;
/** Solo silencia logs; el bridge SIEMPRE escribe processed.replies en drops. */
module.exports.isNoisyDrop = isNoisyDrop;
module.exports.isInterestingDvcTimelineNote = isInterestingDvcTimelineNote;
