/**
 * Salud del canal cliprdr y criterio de dump al cerrar la sesion.
 * El anillo de PDUs se conserva en memoria; solo se vuelca si hay fallo o debug.
 */

'use strict';

const WS_CLOSING = 2;
const WS_CLOSED = 3;
const CB_RESPONSE_FAIL = 0x0002;

function createCliprdrHealth() {
  return {
    pendingRequest: null,
    failed: false,
    failReason: null
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

function noteCliprdrHealth(state, desc) {
  if (!state || typeof desc !== 'string' || !desc) return state;
  const health = ensureCliprdrHealth(state);

  const failKind = cliprdrResponseFailReason(desc);
  if (failKind) {
    health.failed = true;
    health.failReason = failKind;
    health.pendingRequest = null;
    return state;
  }

  const requestKind = requestKindFromDesc(desc);
  if (requestKind) {
    health.pendingRequest = requestKind;
    return state;
  }

  const responseKind = responseKindFromDesc(desc);
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
    ready: !!(state && state.cliprdrServerReady),
    csNet,
    pending: health.pendingRequest || null,
    failed,
    failReason: health.failReason || null,
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
    ` ready=${!!s.ready}` +
    ` csNet=[${s.csNet || ''}]` +
    ` pending=${s.pending || 'none'}` +
    ` failed=${!!s.failed}${failBit}`;
}

function isUserOrOrderlyClose({ wsReadyState, reason, firstCloseSide, lastDisconnectDesc, userClosing } = {}) {
  if (userClosing === true) return true;
  if (wsReadyState === WS_CLOSING || wsReadyState === WS_CLOSED) return true;

  const r = String(reason || '').toLowerCase();
  if (
    r.includes('usuario') ||
    r.includes('user') ||
    r.includes('tab') ||
    r.includes('websocket') ||
    r.includes('wasm')
  ) {
    return true;
  }

  const side = String(firstCloseSide || '').toLowerCase();
  if (side.includes('websocket') || side.includes('wasm') || side.includes('ironrdp')) {
    return true;
  }

  const disc = String(lastDisconnectDesc || '');
  if (
    disc.includes('Disconnect Provider Ultimatum') ||
    disc.includes('ERRINFO_LOGOFF_BY_USER') ||
    disc.includes('ERRINFO_RPC_INITIATED_LOGOFF') ||
    disc.includes('user-requested') ||
    disc.includes('rn-user-requested')
  ) {
    return true;
  }
  return false;
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
  createCliprdrHealth,
  noteCliprdrHealth,
  hasCliprdrFailure,
  summarizeCliprdrHealth,
  formatCliprdrHealthLine,
  isUserOrOrderlyClose,
  shouldDumpDisconnectDebug
};
