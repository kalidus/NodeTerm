/**
 * Salud del canal cliprdr y criterio de dump al cerrar la sesion.
 * El anillo de PDUs se conserva en memoria; solo se vuelca si hay fallo o debug.
 */

'use strict';

const WS_CLOSING = 2;
const WS_CLOSED = 3;
const CB_RESPONSE_FAIL = 0x0002;
const CLIPRDR_WATCH_MS = 2000;
const INBOUND_CLIP_MARK = '\u{1F4E5}';
const OUTBOUND_CLIP_MARK = '\u{1F4E4}';

function createCliprdrHealth() {
  return {
    pendingRequest: null,
    failed: false,
    failReason: null,
    serverFormatList: 0,
    dataRequested: 0,
    dataResponses: 0,
    dataResponseEmpty: false
  };
}

function ensureCliprdrHealth(state) {
  if (!state) return createCliprdrHealth();
  if (!state.cliprdrHealth) state.cliprdrHealth = createCliprdrHealth();
  return state.cliprdrHealth;
}

function cliprdrResponseFailReason(desc) {
  if (typeof desc !== 'string') return null;
  const match = desc.match(/CB_(FORMAT_LIST|FORMAT_DATA|FILECONTENTS)_RESPONSE \(flags=0x([0-9a-f]+)/i);
  if (!match) return null;
  const flags = parseInt(match[2], 16);
  if (flags !== CB_RESPONSE_FAIL) return null;
  return match[1].toLowerCase();
}

function requestKindFromDesc(desc) {
  if (typeof desc !== 'string') return null;
  if (desc.includes('CB_FORMAT_DATA_REQUEST')) return 'data';
  if (desc.includes('CB_FILECONTENTS_REQUEST')) return 'file';
  return null;
}

function responseKindFromDesc(desc) {
  if (typeof desc !== 'string') return null;
  if (desc.includes('CB_FORMAT_DATA_RESPONSE')) return 'data';
  if (desc.includes('CB_FILECONTENTS_RESPONSE')) return 'file';
  return null;
}

function parseCliprdrDataLen(desc) {
  if (typeof desc !== 'string') return null;
  const match = desc.match(/dataLen=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseCliprdrFlags(desc) {
  if (typeof desc !== 'string') return null;
  const match = desc.match(/CB_[A-Z_]+ \(flags=0x([0-9a-f]+)/i);
  return match ? match[1] : null;
}

function isInboundCliprdrDesc(desc, inbound) {
  if (inbound === true) return true;
  if (inbound === false) return false;
  if (typeof desc !== 'string') return false;
  if (desc.includes(OUTBOUND_CLIP_MARK)) return false;
  return desc.includes(INBOUND_CLIP_MARK) || desc.includes('<-ch=');
}

function isServerFormatListDesc(desc, inbound) {
  if (typeof desc !== 'string') return false;
  if (!desc.includes('CB_FORMAT_LIST') || desc.includes('CB_FORMAT_LIST_RESPONSE')) return false;
  return isInboundCliprdrDesc(desc, inbound);
}

function resolveCliprdrFailReason(state, health) {
  if (health && health.failReason) return health.failReason;
  if (health && health.pendingRequest) return `pending_${health.pendingRequest}`;
  if (health && (health.serverFormatList || 0) > 0 && !health.dataRequested) return 'no_data_request';
  if (!state) return null;
  const writeCh = state.cliprdrWriteChannelId;
  const recovered = !!state.cliprdrRecoveredFromUnsafe || writeCh != null;
  if (state.loggedCliprdrMisaligned && !recovered) return 'misaligned';
  if (state.loggedCliprdrUserMute && writeCh == null) return 'muted';
  if (Array.isArray(state.pendingClientCliprdr) && state.pendingClientCliprdr.length > 0 && writeCh == null) {
    return 'queued';
  }
  return null;
}

function noteCliprdrHealth(state, desc, opts = {}) {
  if (!state || typeof desc !== 'string' || !desc) return state;
  const health = ensureCliprdrHealth(state);
  const inbound = opts && opts.inbound;
  const dataLen = parseCliprdrDataLen(desc);

  if (isServerFormatListDesc(desc, inbound) && dataLen > 0) {
    health.serverFormatList = (health.serverFormatList || 0) + 1;
  }

  const failKind = cliprdrResponseFailReason(desc);
  if (failKind) {
    health.failed = true;
    health.failReason = failKind;
    health.pendingRequest = null;
    if (desc.includes('CB_FORMAT_DATA_RESPONSE')) {
      health.dataResponses = (health.dataResponses || 0) + 1;
    }
    return state;
  }

  const requestKind = requestKindFromDesc(desc);
  if (requestKind) {
    health.pendingRequest = requestKind;
    if (requestKind === 'data') {
      health.dataRequested = (health.dataRequested || 0) + 1;
    }
    return state;
  }

  const responseKind = responseKindFromDesc(desc);
  if (responseKind === 'data') {
    health.dataResponses = (health.dataResponses || 0) + 1;
    if (dataLen === 0) {
      health.failed = true;
      health.failReason = 'empty_response';
      health.dataResponseEmpty = true;
    }
  }
  if (responseKind && health.pendingRequest === responseKind) {
    health.pendingRequest = null;
  }
  return state;
}

function hasCliprdrFailure(state) {
  if (!state) return false;
  const health = state.cliprdrHealth;
  if (health && health.failed) return true;
  if (health && health.pendingRequest) return true;
  if (health && (health.serverFormatList || 0) > 0 && !health.dataRequested) return true;

  const writeCh = state.cliprdrWriteChannelId;
  const recovered = !!state.cliprdrRecoveredFromUnsafe || writeCh != null;
  if (state.loggedCliprdrMisaligned && !recovered) return true;
  if (state.loggedCliprdrUserMute && writeCh == null) return true;
  if (Array.isArray(state.pendingClientCliprdr) && state.pendingClientCliprdr.length > 0 && writeCh == null) {
    return true;
  }
  return false;
}

function summarizeCliprdrHealth(state) {
  const health = (state && state.cliprdrHealth) || createCliprdrHealth();
  const csNet = state && Array.isArray(state.clientChannelNames)
    ? state.clientChannelNames.join(',')
    : '';
  const failed = hasCliprdrFailure(state);
  return {
    writeCh: state ? state.cliprdrWriteChannelId : null,
    dest: state ? state.serverCliprdrChannelId : null,
    ready: !!(state && state.cliprdrServerReady),
    csNet,
    listIn: health.serverFormatList || 0,
    req: health.dataRequested || 0,
    resp: health.dataResponses || 0,
    pending: health.pendingRequest || null,
    failed,
    failReason: failed ? resolveCliprdrFailReason(state, health) : null,
    negotiated: state ? state.cliprdrChannelId : null,
    serverCh: state ? state.serverCliprdrChannelId : null,
    misaligned: !!(state && state.loggedCliprdrMisaligned),
    muted: !!(state && state.loggedCliprdrUserMute)
  };
}

function formatCliprdrHealthLine(summary) {
  const s = summary || {};
  const failBit = s.failReason ? ` reason=${s.failReason}` : '';
  return `cliprdr write=${s.writeCh == null ? 'none' : s.writeCh}` +
    ` dest=${s.dest == null && s.serverCh == null ? 'none' : (s.dest != null ? s.dest : s.serverCh)}` +
    ` ready=${!!s.ready}` +
    ` listIn=${s.listIn || 0}` +
    ` req=${s.req || 0}` +
    ` resp=${s.resp || 0}` +
    ` pending=${s.pending || 'none'}` +
    ` failed=${!!s.failed}${failBit}`;
}

function cliprdrLiveHint(desc, opts = {}) {
  if (typeof desc !== 'string' || !desc) return null;
  const dataLen = parseCliprdrDataLen(desc);
  const flags = parseCliprdrFlags(desc);
  if (isServerFormatListDesc(desc, opts.inbound) && dataLen > 0) {
    return {
      kind: 'server_list',
      once: true,
      message: `cliprdr FORMAT_LIST del servidor dataLen=${dataLen}`
    };
  }
  if (desc.includes('CB_FORMAT_DATA_REQUEST')) {
    return {
      kind: 'data_request',
      once: false,
      message: `cliprdr FORMAT_DATA_REQUEST dataLen=${dataLen == null ? '?' : dataLen}`
    };
  }
  if (desc.includes('CB_FORMAT_DATA_RESPONSE')) {
    return {
      kind: 'data_response',
      once: false,
      message: `cliprdr FORMAT_DATA_RESPONSE flags=0x${flags || '?'} dataLen=${dataLen == null ? '?' : dataLen}`
    };
  }
  return null;
}

function cliprdrWatchKind(state) {
  const health = state && state.cliprdrHealth;
  if (!health) return null;
  if (health.pendingRequest) return 'request';
  if ((health.serverFormatList || 0) > 0 && !health.dataRequested) return 'list';
  return null;
}

function formatCliprdrWatchTimeout(kind) {
  if (kind === 'list') return 'cliprdr: FORMAT_LIST del servidor sin FORMAT_DATA_REQUEST (2s)';
  if (kind === 'request') return 'cliprdr: FORMAT_DATA_REQUEST sin respuesta (2s)';
  return null;
}

function isUserOrOrderlyClose({ wsReadyState, reason, firstCloseSide, userClosing } = {}) {
  if (userClosing === true) return true;

  const side = String(firstCloseSide || '').toLowerCase();
  if (side.includes('websocket') || side.includes('wasm') || side.includes('ironrdp')) {
    return true;
  }
  if (side.includes('servidor') || side.includes('tls') || side.includes('tcp')) {
    return false;
  }

  if (wsReadyState === WS_CLOSING || wsReadyState === WS_CLOSED) return true;

  const r = String(reason || '').toLowerCase();
  if (
    r.includes('cerrado por el usuario') ||
    r.includes('tab') ||
    r.includes('websocket') ||
    r.includes('wasm')
  ) {
    return true;
  }
  return false;
}

function formatRdpSessionCloseReason(reason, lastDisconnectDesc) {
  const disc = String(lastDisconnectDesc || '');
  if (disc.includes('ERRINFO_IDLE_TIMEOUT')) {
    return 'Conexion cortada por inactividad o timeout';
  }
  if (disc.includes('ERRINFO_LOGON_TIMEOUT')) {
    return 'Tiempo de inicio de sesion agotado';
  }
  if (disc.includes('ERRINFO_DISCONNECTED_BY_OTHER_CONNECTION')) {
    return 'Sesion desplazada por otra conexion';
  }
  if (disc.includes('ERRINFO_LOGOFF_BY_USER') || disc.includes('ERRINFO_RPC_INITIATED_LOGOFF')) {
    return 'Logoff en el sistema remoto';
  }
  if (disc.includes('ERRINFO_RPC_INITIATED_DISCONNECT') || disc.includes('Disconnect Provider Ultimatum')) {
    return 'Cerrado por el servidor (desconexion ordenada)';
  }

  if (!reason) return 'Cerrado por el servidor remoto';
  const r = String(reason);
  if (r.includes('WebSocket') || r.includes('WASM') || r.includes('cerrado por el usuario') || r.includes('tab')) {
    return 'Cerrado por el usuario';
  }
  if (r.includes('inactividad') || r.includes('idle') || r.includes('ETIMEDOUT') || r.includes('timeout')) {
    return 'Conexion cortada por inactividad o timeout';
  }
  if (r.includes('ECONNRESET') || r.includes('EPIPE') || r.includes('reiniciada')) {
    return 'Conexion cortada por el servidor remoto o la red (posible inactividad)';
  }
  if (r.includes('CLOSED') || r.includes('TLS socket closed') || r.includes('servidor remoto') || r.includes('FIN')) {
    return 'Cerrado por el servidor remoto';
  }
  if (r.includes('ECONNREFUSED')) {
    return 'Conexion rechazada por el servidor remoto';
  }
  return r;
}

function shouldDumpDisconnectDebug({ cliprdrFailed, isDebug } = {}) {
  if (isDebug) return { frames: true, cliprdr: true };
  if (cliprdrFailed) return { frames: false, cliprdr: true };
  return { frames: false, cliprdr: false };
}

module.exports = {
  CB_RESPONSE_FAIL,
  WS_CLOSING,
  WS_CLOSED,
  CLIPRDR_WATCH_MS,
  createCliprdrHealth,
  noteCliprdrHealth,
  hasCliprdrFailure,
  summarizeCliprdrHealth,
  formatCliprdrHealthLine,
  cliprdrLiveHint,
  cliprdrWatchKind,
  formatCliprdrWatchTimeout,
  isUserOrOrderlyClose,
  formatRdpSessionCloseReason,
  shouldDumpDisconnectDebug
};
