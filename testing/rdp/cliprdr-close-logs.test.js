'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createChannelFilterState } = require('../../src/main/services/rdp-channel-filter');
const {
  noteCliprdrHealth,
  hasCliprdrFailure,
  summarizeCliprdrHealth,
  formatCliprdrHealthLine,
  cliprdrLiveHint,
  cliprdrWatchKind,
  formatCliprdrWatchTimeout,
  isUserOrOrderlyClose,
  formatRdpSessionCloseReason,
  shouldDumpDisconnectDebug,
  WS_CLOSED,
  WS_CLOSING
} = require('../../src/main/services/rdp-cliprdr-health');

function desc(name, flags = 0, dataLen = 4) {
  return `[ChanHdr len=12 flags=0x13] ${name} (flags=0x${flags.toString(16)}, dataLen=${dataLen}, payloadLen=12B)`;
}

describe('isUserOrOrderlyClose', () => {
  test('FIN de TLS con WS ya cerrado no es cierre de usuario local', () => {
    assert.equal(isUserOrOrderlyClose({
      wsReadyState: WS_CLOSED,
      reason: 'Cerrado por el servidor remoto (FIN)',
      firstCloseSide: 'servidor RDP (FIN de TLS)'
    }), false);
  });

  test('WS en CLOSING tambien cuenta como cierre de usuario', () => {
    assert.equal(isUserOrOrderlyClose({
      wsReadyState: WS_CLOSING,
      reason: 'Cerrado por el servidor remoto'
    }), true);
  });

  test('motivo WASM/usuario es cierre ordenado', () => {
    assert.equal(isUserOrOrderlyClose({
      wsReadyState: 1,
      reason: 'Cerrado por el usuario'
    }), true);
  });

  test('Disconnect Ultimatum del servidor no es cierre de usuario local', () => {
    assert.equal(isUserOrOrderlyClose({
      wsReadyState: 1,
      reason: 'Cerrado por el servidor remoto (FIN)',
      lastDisconnectDesc: 'MCS Disconnect Provider Ultimatum (rn-user-requested)'
    }), false);
  });

  test('ERRINFO_LOGOFF_BY_USER no es cierre de pestana local', () => {
    assert.equal(isUserOrOrderlyClose({
      wsReadyState: 1,
      reason: 'Cerrado por el servidor remoto',
      lastDisconnectDesc: 'TS_SET_ERROR_INFO errorInfo=0x0000000c (ERRINFO_LOGOFF_BY_USER)'
    }), false);
  });

  test('FIN de TLS con WS abierto y sin PDU de logoff no es usuario', () => {
    assert.equal(isUserOrOrderlyClose({
      wsReadyState: 1,
      reason: 'Cerrado por el servidor remoto (FIN)',
      firstCloseSide: 'servidor RDP (FIN de TLS)'
    }), false);
  });

  test('userClosing + FIN TLS + WS OPEN es cierre de usuario', () => {
    assert.equal(isUserOrOrderlyClose({
      wsReadyState: 1,
      reason: 'Cerrado por el servidor remoto (FIN)',
      firstCloseSide: 'servidor RDP (FIN de TLS)',
      userClosing: true
    }), true);
  });

  test('PDU Disconnect Ultimatum del cliente es cierre de usuario', () => {
    assert.equal(isUserOrOrderlyClose({
      wsReadyState: 1,
      reason: 'Cerrado por el servidor remoto (FIN)',
      lastDisconnectDesc: 'MCS Disconnect Provider Ultimatum (rn-provider-initiated)',
      userClosing: true
    }), true);
  });
});

describe('formatRdpSessionCloseReason', () => {
  test('Ultimatum del servidor es desconexion ordenada', () => {
    assert.equal(
      formatRdpSessionCloseReason(
        'Cerrado por el servidor remoto (FIN)',
        'MCS Disconnect Provider Ultimatum (rn-user-requested)'
      ),
      'Cerrado por el servidor (desconexion ordenada)'
    );
  });

  test('ERRINFO_IDLE_TIMEOUT es inactividad', () => {
    assert.equal(
      formatRdpSessionCloseReason(
        'Cerrado por el servidor remoto (FIN)',
        'TS_SET_ERROR_INFO errorInfo=0x00000003 (ERRINFO_IDLE_TIMEOUT)'
      ),
      'Conexion cortada por inactividad o timeout'
    );
  });

  test('ERRINFO_LOGOFF_BY_USER es logoff remoto', () => {
    assert.equal(
      formatRdpSessionCloseReason(
        'Cerrado por el servidor remoto',
        'TS_SET_ERROR_INFO errorInfo=0x0000000c (ERRINFO_LOGOFF_BY_USER)'
      ),
      'Logoff en el sistema remoto'
    );
  });

  test('ERRINFO_DISCONNECTED_BY_OTHER_CONNECTION es sesion desplazada', () => {
    assert.equal(
      formatRdpSessionCloseReason(
        'Cerrado por el servidor remoto',
        'TS_SET_ERROR_INFO errorInfo=0x00000005 (ERRINFO_DISCONNECTED_BY_OTHER_CONNECTION)'
      ),
      'Sesion desplazada por otra conexion'
    );
  });
});

describe('shouldDumpDisconnectDebug', () => {
  test('cierre de pestana sin fallo no vuelca nada', () => {
    assert.deepEqual(shouldDumpDisconnectDebug({
      cliprdrFailed: false,
      isDebug: false
    }), { frames: false, cliprdr: false });
  });

  test('fallo cliprdr vuelca solo el anillo de clipboard', () => {
    assert.deepEqual(shouldDumpDisconnectDebug({
      cliprdrFailed: true,
      isDebug: false
    }), { frames: false, cliprdr: true });
  });

  test('rdpDebug vuelca frames y clipboard', () => {
    assert.deepEqual(shouldDumpDisconnectDebug({
      cliprdrFailed: false,
      isDebug: true
    }), { frames: true, cliprdr: true });
  });
});

describe('noteCliprdrHealth / hasCliprdrFailure', () => {
  test('request sin response es fallo', () => {
    const state = createChannelFilterState();
    state.cliprdrWriteChannelId = 1004;
    state.cliprdrServerReady = true;
    noteCliprdrHealth(state, desc('CB_FORMAT_DATA_REQUEST'));
    assert.equal(hasCliprdrFailure(state), true);
    assert.equal(summarizeCliprdrHealth(state).pending, 'data');
  });

  test('request + response OK no es fallo', () => {
    const state = createChannelFilterState();
    state.cliprdrWriteChannelId = 1004;
    state.cliprdrServerReady = true;
    noteCliprdrHealth(state, desc('CB_FORMAT_DATA_REQUEST'));
    noteCliprdrHealth(state, desc('CB_FORMAT_DATA_RESPONSE', 0x1));
    assert.equal(hasCliprdrFailure(state), false);
    assert.equal(summarizeCliprdrHealth(state).pending, null);
  });

  test('response flags=0x2 es fallo', () => {
    const state = createChannelFilterState();
    state.cliprdrWriteChannelId = 1004;
    noteCliprdrHealth(state, desc('CB_FORMAT_DATA_REQUEST'));
    noteCliprdrHealth(state, desc('CB_FORMAT_DATA_RESPONSE', 0x2));
    assert.equal(hasCliprdrFailure(state), true);
    assert.equal(summarizeCliprdrHealth(state).failReason, 'format_data');
    assert.equal(summarizeCliprdrHealth(state).pending, null);
  });

  test('FILECONTENTS_RESPONSE flags=0x2 es fallo', () => {
    const state = createChannelFilterState();
    state.cliprdrWriteChannelId = 1005;
    noteCliprdrHealth(state, desc('CB_FILECONTENTS_REQUEST'));
    noteCliprdrHealth(state, desc('CB_FILECONTENTS_RESPONSE', 0x2));
    assert.equal(hasCliprdrFailure(state), true);
    assert.equal(summarizeCliprdrHealth(state).failReason, 'filecontents');
  });

  test('FORMAT_LIST_RESPONSE fail es fallo aunque no haya request', () => {
    const state = createChannelFilterState();
    state.cliprdrWriteChannelId = 1004;
    noteCliprdrHealth(state, desc('CB_FORMAT_LIST_RESPONSE', 0x2));
    assert.equal(hasCliprdrFailure(state), true);
  });

  test('handshake+remap ok y cierre de pestana no es fallo', () => {
    const state = createChannelFilterState();
    state.clientChannelNames = ['rdpdr', 'rdpsnd', 'cliprdr'];
    state.cliprdrChannelId = 1004;
    state.serverCliprdrChannelId = 1005;
    state.cliprdrWriteChannelId = 1005;
    state.cliprdrServerReady = true;
    noteCliprdrHealth(state, desc('CB_CLIP_CAPS'));
    noteCliprdrHealth(state, desc('CB_MONITOR_READY'));
    noteCliprdrHealth(state, desc('CB_FORMAT_LIST'));
    noteCliprdrHealth(state, desc('CB_FORMAT_LIST_RESPONSE', 0x1));
    assert.equal(hasCliprdrFailure(state), false);
    const summary = summarizeCliprdrHealth(state);
    assert.equal(summary.writeCh, 1005);
    assert.equal(summary.ready, true);
    assert.equal(summary.csNet, 'rdpdr,rdpsnd,cliprdr');
    assert.equal(summary.pending, null);
    assert.equal(summary.failed, false);
    assert.match(formatCliprdrHealthLine(summary), /write=1005/);
    assert.match(formatCliprdrHealthLine(summary), /pending=none/);
  });

  test('APP desalineado sin write path es fallo', () => {
    const state = createChannelFilterState();
    state.loggedCliprdrMisaligned = true;
    state.cliprdrWriteChannelId = null;
    assert.equal(hasCliprdrFailure(state), true);
  });

  test('APP desalineado recuperado no es fallo', () => {
    const state = createChannelFilterState();
    state.loggedCliprdrMisaligned = true;
    state.cliprdrWriteChannelId = 1004;
    state.cliprdrRecoveredFromUnsafe = true;
    assert.equal(hasCliprdrFailure(state), false);
  });

  test('mute sin write path es fallo', () => {
    const state = createChannelFilterState();
    state.loggedCliprdrUserMute = true;
    state.cliprdrWriteChannelId = null;
    assert.equal(hasCliprdrFailure(state), true);
  });

  test('cola pendiente sin write path es fallo', () => {
    const state = createChannelFilterState();
    state.pendingClientCliprdr = [Buffer.alloc(8)];
    state.cliprdrWriteChannelId = null;
    assert.equal(hasCliprdrFailure(state), true);
  });

  test('ChanHdr flags=0x2 no se confunde con CB_RESPONSE_FAIL', () => {
    const state = createChannelFilterState();
    state.cliprdrWriteChannelId = 1004;
    noteCliprdrHealth(
      state,
      '[ChanHdr len=24 flags=0x2] CB_FORMAT_DATA_RESPONSE (flags=0x1, dataLen=16, payloadLen=24B)'
    );
    assert.equal(hasCliprdrFailure(state), false);
  });

  test('FORMAT_LIST servidor sin DATA_REQUEST es fallo no_data_request', () => {
    const state = createChannelFilterState();
    state.cliprdrWriteChannelId = 1004;
    state.cliprdrServerReady = true;
    noteCliprdrHealth(state, desc('CB_FORMAT_LIST', 0, 64), { inbound: true });
    noteCliprdrHealth(state, desc('CB_FORMAT_LIST_RESPONSE', 0x1, 0));
    assert.equal(hasCliprdrFailure(state), true);
    const summary = summarizeCliprdrHealth(state);
    assert.equal(summary.failReason, 'no_data_request');
    assert.equal(summary.listIn, 1);
    assert.equal(summary.req, 0);
    assert.match(formatCliprdrHealthLine(summary), /reason=no_data_request/);
    assert.equal(cliprdrWatchKind(state), 'list');
  });

  test('FORMAT_LIST servidor + REQUEST + RESPONSE con datos no es fallo', () => {
    const state = createChannelFilterState();
    state.cliprdrWriteChannelId = 1004;
    state.cliprdrServerReady = true;
    noteCliprdrHealth(state, desc('CB_FORMAT_LIST', 0, 64), { inbound: true });
    noteCliprdrHealth(state, desc('CB_FORMAT_LIST_RESPONSE', 0x1, 0));
    noteCliprdrHealth(state, desc('CB_FORMAT_DATA_REQUEST'));
    noteCliprdrHealth(state, desc('CB_FORMAT_DATA_RESPONSE', 0x1, 16));
    assert.equal(hasCliprdrFailure(state), false);
    const summary = summarizeCliprdrHealth(state);
    assert.equal(summary.failReason, null);
    assert.equal(summary.listIn, 1);
    assert.equal(summary.req, 1);
    assert.equal(summary.resp, 1);
    assert.equal(cliprdrWatchKind(state), null);
  });

  test('FORMAT_DATA_RESPONSE vacia es fallo empty_response', () => {
    const state = createChannelFilterState();
    state.cliprdrWriteChannelId = 1004;
    noteCliprdrHealth(state, desc('CB_FORMAT_DATA_REQUEST'));
    noteCliprdrHealth(state, desc('CB_FORMAT_DATA_RESPONSE', 0x1, 0));
    assert.equal(hasCliprdrFailure(state), true);
    const summary = summarizeCliprdrHealth(state);
    assert.equal(summary.failReason, 'empty_response');
    assert.match(formatCliprdrHealthLine(summary), /reason=empty_response/);
  });

  test('FORMAT_LIST del cliente no cuenta como listIn', () => {
    const state = createChannelFilterState();
    state.cliprdrWriteChannelId = 1004;
    noteCliprdrHealth(state, desc('CB_FORMAT_LIST', 0, 6), { inbound: false });
    assert.equal(hasCliprdrFailure(state), false);
    assert.equal(summarizeCliprdrHealth(state).listIn, 0);
    assert.equal(cliprdrWatchKind(state), null);
  });
});

describe('cliprdrLiveHint / watch', () => {
  test('primer FORMAT_LIST del servidor es hint once', () => {
    const hint = cliprdrLiveHint(desc('CB_FORMAT_LIST', 0, 64), { inbound: true });
    assert.equal(hint.kind, 'server_list');
    assert.equal(hint.once, true);
    assert.match(hint.message, /dataLen=64/);
  });

  test('FORMAT_DATA_REQUEST y RESPONSE son hints en vivo', () => {
    const req = cliprdrLiveHint(desc('CB_FORMAT_DATA_REQUEST'));
    assert.equal(req.kind, 'data_request');
    assert.equal(req.once, false);
    const resp = cliprdrLiveHint(desc('CB_FORMAT_DATA_RESPONSE', 0x1, 16));
    assert.equal(resp.kind, 'data_response');
    assert.match(resp.message, /flags=0x1/);
    assert.match(resp.message, /dataLen=16/);
  });

  test('CAPS y FORMAT_LIST del cliente no son hint', () => {
    assert.equal(cliprdrLiveHint(desc('CB_CLIP_CAPS')), null);
    assert.equal(cliprdrLiveHint(desc('CB_FORMAT_LIST', 0, 6), { inbound: false }), null);
  });

  test('mensajes de timeout identifican list y request', () => {
    assert.match(formatCliprdrWatchTimeout('list'), /FORMAT_LIST/);
    assert.match(formatCliprdrWatchTimeout('request'), /FORMAT_DATA_REQUEST/);
    assert.equal(formatCliprdrWatchTimeout('other'), null);
  });
});
