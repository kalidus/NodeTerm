'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// El modulo exporta una instancia singleton, no la clase.
const rdpBridge = require('../../src/main/services/RdpNativeBridgeService');
const { splitTpktFrames } = require('../../src/main/services/rdp-protocol-helpers');
const { parseMcsSendData } = require('../../src/main/services/rdp-autodetect');
const { maybePromoteSelectorAppCliprdr, takeCliprdrRehandshake } = require('../../src/main/services/rdp-channel-filter');

const CHANNEL_FLAG_FIRST = 0x01;
const CHANNEL_FLAG_LAST = 0x02;
const CHANNEL_FLAG_SHOW_PROTOCOL = 0x10;

const CB_CLIP_CAPS = 0x0007;
const CB_TEMP_DIRECTORY = 0x0006;
const CB_FORMAT_LIST = 0x0002;
const CB_FORMAT_LIST_RESPONSE = 0x0003;
const CB_FORMAT_DATA_REQUEST = 0x0004;
const CB_FILECONTENTS_REQUEST = 0x0008;

const CLIPRDR_CH = 1004;
const IO_CH = 1003;
const BASTION_CLIP_CH = 1006;

// MCS SendDataRequest (0x64) envuelto en TPKT, que es lo que emite el cliente.
function buildMcsRequest(channelId, userData) {
  const lenField = userData.length < 0x80
    ? Buffer.from([userData.length])
    : Buffer.from([0x80 | ((userData.length >> 8) & 0x7f), userData.length & 0xff]);

  const mcsHdr = Buffer.concat([
    Buffer.from([
      0x02, 0xf0, 0x80, 0x64,
      0x00, 0x00,
      (channelId >> 8) & 0xff, channelId & 0xff,
      0x70
    ]),
    lenField
  ]);
  const tpktLen = 4 + mcsHdr.length + userData.length;
  const tpktHdr = Buffer.from([0x03, 0x00, (tpktLen >> 8) & 0xff, tpktLen & 0xff]);
  return Buffer.concat([tpktHdr, mcsHdr, userData]);
}

// CHANNEL_PDU_HEADER (8 bytes) + CLIPRDR_HEADER (8 bytes) + datos.
function buildClipFrame(channelId, msgType, data = Buffer.alloc(0), chanFlags = null) {
  const clipHdr = Buffer.alloc(8);
  clipHdr.writeUInt16LE(msgType, 0);
  clipHdr.writeUInt16LE(0, 2);
  clipHdr.writeUInt32LE(data.length, 4);
  const clipPayload = Buffer.concat([clipHdr, data]);

  const chanHdr = Buffer.alloc(8);
  chanHdr.writeUInt32LE(clipPayload.length, 0);
  chanHdr.writeUInt32LE(
    chanFlags == null
      ? (CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST | CHANNEL_FLAG_SHOW_PROTOCOL)
      : chanFlags,
    4
  );

  return buildMcsRequest(channelId, Buffer.concat([chanHdr, clipPayload]));
}

// initiate_copy de ironrdp-cliprdr, en estado Initialization, emite los tres PDUs de una vez y
// llegan al bridge concatenados en un unico mensaje WebSocket.
function buildInitiateCopyBatch() {
  return Buffer.concat([
    buildClipFrame(CLIPRDR_CH, CB_CLIP_CAPS, Buffer.alloc(16)),
    buildClipFrame(CLIPRDR_CH, CB_TEMP_DIRECTORY, Buffer.alloc(520)),
    buildClipFrame(CLIPRDR_CH, CB_FORMAT_LIST, Buffer.alloc(24))
  ]);
}

function bastionFilterState() {
  return {
    ioChannelId: IO_CH,
    cliprdrChannelId: CLIPRDR_CH,
    serverCliprdrChannelId: BASTION_CLIP_CH,
    cliprdrServerReady: true,
    allowed: new Set([1003, 1004, 1005, 1006]),
    channelIdToName: new Map([[1004, 'rdpdr'], [1005, 'rdpsnd'], [1006, 'cliprdr']])
  };
}

function directFilterState() {
  return {
    ioChannelId: IO_CH,
    cliprdrChannelId: CLIPRDR_CH,
    serverCliprdrChannelId: CLIPRDR_CH,
    cliprdrServerReady: true
  };
}

// Reproduce el bucle del bridge: trocea el mensaje y filtra cada PDU por separado.
function filterBatch(service, payload, filterState) {
  const kept = [];
  const injected = [];
  for (const frame of splitTpktFrames(payload)) {
    const { forward, inject, extraForwardsBefore, extraForwards } =
      service.filterClientVirtualChannelFrame(frame, filterState);
    if (extraForwardsBefore) kept.push(...extraForwardsBefore);
    if (forward) kept.push(forward);
    if (extraForwards) kept.push(...extraForwards);
    injected.push(...inject);
  }
  kept.injected = injected;
  return kept;
}

function clipMsgType(frame) {
  const parsed = parseMcsSendData(frame);
  return parsed.userData.readUInt16LE(8);
}

function chanFlags(frame) {
  const parsed = parseMcsSendData(frame);
  return parsed.userData.readUInt32LE(4);
}

describe('cliprdr cliente->servidor: lotes de varios PDUs', () => {
  const service = rdpBridge;
  let logs;
  let originalLog;
  let originalWarn;

  beforeEach(() => {
    // Los flags se leen tambien de rdp-flags.json en la raiz del proyecto, que puede existir en
    // local para diagnosticar. El entorno tiene prioridad, asi que ponerlos a '0' aisla los tests.
    process.env.NODETERM_RDP_CLIPRDR_DROP_CLIENT_CAPS = '0';
    process.env.NODETERM_RDP_CLIPRDR_DROP_CLIENT_TEMPDIR = '0';
    process.env.NODETERM_RDP_CLIPRDR_MUTE_CLIENT = '0';
    process.env.NODETERM_RDP_CLIPRDR_NO_REMAP = '0';
    process.env.NODETERM_RDP_CLIPRDR_ALLOW_USER_CHANNEL = '1';
    logs = [];
    originalLog = console.log;
    originalWarn = console.warn;
    console.log = (...a) => logs.push(a.join(' '));
    console.warn = (...a) => logs.push(a.join(' '));
  });

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    delete process.env.NODETERM_RDP_CLIPRDR_DROP_CLIENT_CAPS;
    delete process.env.NODETERM_RDP_CLIPRDR_DROP_CLIENT_TEMPDIR;
    delete process.env.NODETERM_RDP_CLIPRDR_MUTE_CLIENT;
    delete process.env.NODETERM_RDP_CLIPRDR_NO_REMAP;
    delete process.env.NODETERM_RDP_CLIPRDR_ALLOW_USER_CHANNEL;
  });

  test('trocea el lote y remapea TODOS los PDUs, no solo el primero', () => {
    const kept = filterBatch(service, buildInitiateCopyBatch(), bastionFilterState());

    assert.equal(kept.length, 3, 'no se debe perder ningun PDU del lote');
    for (const frame of kept) {
      assert.equal(
        parseMcsSendData(frame).channelId,
        BASTION_CLIP_CH,
        'un lote con canales mezclados es lo que tumbaba la sesion'
      );
      assert.equal(
        chanFlags(frame) & CHANNEL_FLAG_SHOW_PROTOCOL,
        CHANNEL_FLAG_SHOW_PROTOCOL,
        'saludo en cliprdr nombrado: mismo encuadre 0x13 que ESJC'
      );
    }
  });

  test('si el bastion entrega cliprdr por el canal IO, CAPS y FORMAT_LIST van al VC nombrado', () => {
    const state = {
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: IO_CH,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005, 1006]),
      channelIdToName: new Map([[1004, 'cliprdr'], [1005, 'rdpdr'], [1006, 'rdpsnd']])
    };

    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.equal(state.cliprdrWriteChannelId, CLIPRDR_CH);
    assert.equal(kept.length, 2, 'CAPS y FORMAT_LIST al VC cliprdr; TEMPDIR tirado');
    assert.deepEqual(kept.map(clipMsgType), [CB_CLIP_CAPS, CB_FORMAT_LIST]);
    for (const frame of kept) {
      assert.equal(parseMcsSendData(frame).channelId, CLIPRDR_CH);
      assert.notEqual(parseMcsSendData(frame).channelId, IO_CH);
    }
    assert.ok(!state.pendingClientCliprdr || state.pendingClientCliprdr.length === 0);
    assert.equal(kept.injected.length, 1, 'sintetiza acuse hacia WASM para que el portapapeles pase a Ready');
  });

  test('RDP saludo por IO 1003 en bastión no escribe en 1006 para evitar corte TLS', () => {
    const state = {
      wallixService: 'RDP',
      isBastion: true,
      ioChannelId: IO_CH,
      cliprdrChannelId: BASTION_CLIP_CH,
      serverCliprdrChannelId: IO_CH,
      cliprdrOnUnsafeChannel: IO_CH,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005, 1006]),
      channelIdToName: new Map([
        [1004, 'rdpdr'],
        [1005, 'rdpsnd'],
        [1006, 'cliprdr']
      ])
    };

    const kept = filterBatch(service, Buffer.concat([
      buildClipFrame(BASTION_CLIP_CH, CB_CLIP_CAPS, Buffer.alloc(16)),
      buildClipFrame(BASTION_CLIP_CH, CB_TEMP_DIRECTORY, Buffer.alloc(520)),
      buildClipFrame(BASTION_CLIP_CH, CB_FORMAT_LIST, Buffer.alloc(24))
    ]), state);

    assert.equal(kept.length, 0, 'no se escribe en 1006 para bastión Wallix tras saludo en IO (evita FIN)');
    assert.ok(state.cliprdrWriteChannelId == null, 'write path no confirmado aún');
    assert.equal(kept.injected.length, 1, 'sintetiza acuse hacia WASM para que el portapapeles pase a Ready');
    assert.ok(state.pendingClientCliprdr.length > 0, 'FORMAT_LIST retenido en cola');
  });

  test('RDP saludo por IO 1003 con CAPS prematuro en bastión silencia cliente hacia RDP', () => {
    const state = {
      wallixService: 'RDP',
      isBastion: true,
      ioChannelId: IO_CH,
      cliprdrChannelId: BASTION_CLIP_CH,
      serverCliprdrChannelId: null,
      cliprdrOnUnsafeChannel: null,
      allowed: new Set([1003, 1004, 1005, 1006]),
      channelIdToName: new Map([
        [1004, 'rdpdr'],
        [1005, 'rdpsnd'],
        [1006, 'cliprdr']
      ])
    };

    // 1. WASM emite CAPS antes de que el servidor salude por 1003
    const capsFrame = buildClipFrame(BASTION_CLIP_CH, CB_CLIP_CAPS, Buffer.alloc(16));
    const step1 = filterBatch(service, capsFrame, state);
    assert.equal(step1.length, 0, 'CAPS no se envía a ciegas a canal nulo/inseguro');
    assert.ok(Buffer.isBuffer(state.cachedClientCaps), 'CAPS del cliente queda en caché');

    // 2. Servidor saluda por canal IO 1003
    state.serverCliprdrChannelId = IO_CH;
    state.cliprdrOnUnsafeChannel = IO_CH;
    state.cliprdrServerReady = true;

    // 3. WASM emite TEMPDIR y FORMAT_LIST
    const restFrames = Buffer.concat([
      buildClipFrame(BASTION_CLIP_CH, CB_TEMP_DIRECTORY, Buffer.alloc(520)),
      buildClipFrame(BASTION_CLIP_CH, CB_FORMAT_LIST, Buffer.alloc(24))
    ]);
    const step2 = filterBatch(service, restFrames, state);

    assert.equal(step2.length, 0, 'silenciado hacia RDP; nada enviado a 1006');
    assert.ok(state.cliprdrWriteChannelId == null);
    assert.equal(step2.injected.length, 1, 'sintetiza ACK hacia WASM');
  });

  test('service=n/a selector Wallix: saludo por IO 1003 no escribe en 1006 en la pantalla del selector', () => {
    const state = {
      wallixService: 'n/a',
      ioChannelId: IO_CH,
      cliprdrChannelId: BASTION_CLIP_CH,
      serverCliprdrChannelId: IO_CH,
      cliprdrOnUnsafeChannel: IO_CH,
      cliprdrServerReady: true,
      cliprdrMonitorReadyCount: 1, // 1er saludo (menú de selección)
      allowed: new Set([1003, 1004, 1005, 1006]),
      channelIdToName: new Map([
        [1004, 'rdpdr'],
        [1005, 'rdpsnd'],
        [1006, 'cliprdr']
      ])
    };

    const frames = Buffer.concat([
      buildClipFrame(BASTION_CLIP_CH, CB_CLIP_CAPS, Buffer.alloc(16)),
      buildClipFrame(BASTION_CLIP_CH, CB_TEMP_DIRECTORY, Buffer.alloc(520)),
      buildClipFrame(BASTION_CLIP_CH, CB_FORMAT_LIST, Buffer.alloc(24))
    ]);
    const kept = filterBatch(service, frames, state);

    // No debe emitir nada al servidor durante la pantalla de selección del bastión
    assert.equal(kept.length, 0, 'no se escribe en 1006 ni en 1003 durante el menú del selector');
    assert.ok(state.cliprdrWriteChannelId == null, 'write path no confirmado aún');
    assert.equal(kept.injected.length, 1, 'sintetiza ACK hacia WASM para que no se bloquee');
    assert.ok(state.pendingClientCliprdr.length > 0, 'FORMAT_LIST retenido en cola');
  });

  test('service=n/a selector Wallix: segundo MONITOR_READY promueve a APP, reinyecta CAPS y vacia cola por 1006', () => {
    const state = {
      wallixService: 'n/a',
      ioChannelId: IO_CH,
      cliprdrChannelId: BASTION_CLIP_CH,
      serverCliprdrChannelId: IO_CH,
      cliprdrOnUnsafeChannel: IO_CH,
      cliprdrServerReady: true,
      cliprdrMonitorReadyCount: 1,
      allowed: new Set([1003, 1004, 1005, 1006]),
      channelIdToName: new Map([
        [1004, 'rdpdr'],
        [1005, 'rdpsnd'],
        [1006, 'cliprdr']
      ])
    };

    // 1. Cliente WASM emite durante la pantalla del selector
    const frames = Buffer.concat([
      buildClipFrame(BASTION_CLIP_CH, CB_CLIP_CAPS, Buffer.alloc(16)),
      buildClipFrame(BASTION_CLIP_CH, CB_TEMP_DIRECTORY, Buffer.alloc(520)),
      buildClipFrame(BASTION_CLIP_CH, CB_FORMAT_LIST, Buffer.alloc(24))
    ]);
    const kept1 = filterBatch(service, frames, state);
    assert.equal(kept1.length, 0, 'nada enviado durante el selector');
    assert.equal(state.pendingClientCliprdr.length, 2, 'CAPS y FORMAT_LIST retenidos');

    // 2. Usuario selecciona destino en el bastión: llega 2o MONITOR_READY (el hop RemoteApp deja el saludo en MCS 1001)
    state.cliprdrMonitorReadyCount = 2;
    state.serverCliprdrChannelId = 1001;
    const promoted = maybePromoteSelectorAppCliprdr(state);
    assert.equal(promoted, true, 'promovido a APP tras selección');
    assert.equal(state.wallixService, 'APP');
    assert.equal(state.cliprdrWriteChannelId, BASTION_CLIP_CH);

    // 3. RdpNativeBridgeService emite rehandshake y vacía cola
    const replay = takeCliprdrRehandshake(state);
    assert.ok(replay.length > 0, 'genera rehandshake CAPS para el destino');
    assert.equal(parseMcsSendData(replay[0]).channelId, BASTION_CLIP_CH);

    const flushedFrames = [];
    const mockSocket = {
      writable: true,
      write(buf) { flushedFrames.push(buf); }
    };
    service.flushPendingClientCliprdr(state, mockSocket, null);
    assert.equal(flushedFrames.length, 4, 'CAPS y FORMAT_LIST retenidos se vacian al socket para APP');
    assert.deepEqual(
      flushedFrames.map(clipMsgType),
      [CB_CLIP_CAPS, CB_CLIP_CAPS, CB_FORMAT_LIST, CB_FORMAT_LIST]
    );
    assert.equal(parseMcsSendData(flushedFrames[0]).channelId, BASTION_CLIP_CH);
    assert.equal(parseMcsSendData(flushedFrames[1]).channelId, 1001);
    assert.equal(parseMcsSendData(flushedFrames[2]).channelId, 1001);
    assert.equal(parseMcsSendData(flushedFrames[3]).channelId, BASTION_CLIP_CH);
  });

  test('service=n/a selector Wallix: segundo MONITOR_READY por IO 1003 silencia FORMAT_LIST y no escribe en 1001 ni 1006', () => {
    const state = {
      wallixService: 'n/a',
      ioChannelId: IO_CH,
      cliprdrChannelId: BASTION_CLIP_CH,
      serverCliprdrChannelId: IO_CH,
      cliprdrOnUnsafeChannel: IO_CH,
      cliprdrServerReady: true,
      cliprdrMonitorReadyCount: 2,
      allowed: new Set([1003, 1004, 1005, 1006]),
      channelIdToName: new Map([
        [1004, 'rdpdr'],
        [1005, 'rdpsnd'],
        [1006, 'cliprdr']
      ])
    };

    const formatListFrame = buildClipFrame(BASTION_CLIP_CH, CB_FORMAT_LIST, Buffer.alloc(24));
    const kept = filterBatch(service, formatListFrame, state);

    assert.equal(kept.length, 0, 'no se envia FORMAT_LIST a Wallix para evitar caida con error 1000');
    assert.equal(kept.injected.length, 1, 'sintetiza ACK para que IronRDP WASM pase a Ready');
    assert.equal(clipMsgType(kept.injected[0]), CB_FORMAT_LIST_RESPONSE);
  });

  test('APP alineado: handshake completo (CAPS+TEMPDIR+FORMAT_LIST) sale por el VC cliprdr 1006', () => {
    const state = bastionFilterState();
    state.wallixService = 'APP';
    state.cliprdrWriteChannelId = BASTION_CLIP_CH;

    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.equal(kept.length, 3, 'camino de producto: no se tira TEMPDIR ni CAPS');
    assert.deepEqual(kept.map(clipMsgType), [CB_CLIP_CAPS, CB_TEMP_DIRECTORY, CB_FORMAT_LIST]);
    for (const frame of kept) {
      assert.equal(parseMcsSendData(frame).channelId, BASTION_CLIP_CH);
    }
  });

  test('RDP saludo por 1001 escribe CAPS y FORMAT_LIST en 1001, no en el VC nombrado', () => {
    const state = {
      wallixService: 'RDP',
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1001,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005]),
      channelIdToName: new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']])
    };

    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.deepEqual(kept.map(clipMsgType), [CB_CLIP_CAPS, CB_FORMAT_LIST]);
    assert.equal(parseMcsSendData(kept[0]).channelId, 1001, 'CAPS al Probe');
    assert.equal(parseMcsSendData(kept[1]).channelId, 1001, 'FORMAT_LIST al Probe');
    assert.equal(chanFlags(kept[1]) & CHANNEL_FLAG_SHOW_PROTOCOL, CHANNEL_FLAG_SHOW_PROTOCOL);
    assert.equal(state.pendingClientCliprdr.length, 1, 'CAPS original encolado; TEMPDIR tirado');
    assert.equal(kept.injected.length, 1, 'acuse sintetico para que IronRDP pase a Ready');
  });

  test('EGFX saludo por 1001 no escribe FORMAT_LIST en 1001', () => {
    const state = {
      wallixService: 'RDP',
      egfxGraphics: true,
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1001,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005]),
      channelIdToName: new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']])
    };

    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.equal(kept.length, 0, 'EGFX no escribe CHANNEL_PDU en MCS 1001');
    for (const frame of kept) {
      assert.notEqual(parseMcsSendData(frame).channelId, 1001);
    }
    assert.ok(state.pendingClientCliprdr.length >= 1, 'handshake encolado');
    assert.equal(kept.injected.length, 1, 'acuse sintetico hacia WASM');
    assert.equal(clipMsgType(kept.injected[0]), CB_FORMAT_LIST_RESPONSE);
  });

  test('EGFX saludo por IO 1003 no escribe CHANNEL_PDU en 1003 ni en 1006', () => {
    const state = {
      wallixService: 'RDP',
      egfxGraphics: true,
      isBastion: true,
      ioChannelId: IO_CH,
      cliprdrChannelId: BASTION_CLIP_CH,
      serverCliprdrChannelId: IO_CH,
      cliprdrOnUnsafeChannel: IO_CH,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005, 1006]),
      channelIdToName: new Map([
        [1004, 'rdpdr'],
        [1005, 'rdpsnd'],
        [1006, 'cliprdr']
      ])
    };

    const frames = Buffer.concat([
      buildClipFrame(BASTION_CLIP_CH, CB_CLIP_CAPS, Buffer.alloc(16)),
      buildClipFrame(BASTION_CLIP_CH, CB_TEMP_DIRECTORY, Buffer.alloc(520)),
      buildClipFrame(BASTION_CLIP_CH, CB_FORMAT_LIST, Buffer.alloc(24))
    ]);
    const kept = filterBatch(service, frames, state);

    assert.equal(kept.length, 0, 'EGFX no escribe CHANNEL_PDU en 1003 ni en 1006');
    assert.equal(kept.injected.length, 1);
  });

  test('shouldSanitizeBastionConfirm solo capa sin EGFX', () => {
    const { shouldSanitizeBastionConfirm } = rdpBridge;
    assert.equal(shouldSanitizeBastionConfirm(true, false), true);
    assert.equal(shouldSanitizeBastionConfirm(true, undefined), true);
    assert.equal(shouldSanitizeBastionConfirm(true, true), false);
    assert.equal(shouldSanitizeBastionConfirm(false, false), false);
    assert.equal(shouldSanitizeBastionConfirm(false, true), false);
  });

  test('APP con saludo 1001 y write path null recupera el VC cliprdr 1007', () => {
    const state = {
      wallixService: 'APP',
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1001,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrServerReady: true,
      clientChannelNames: ['rail', 'rdpdr', 'rdpsnd', 'cliprdr'],
      allowed: new Set([1003, 1004, 1005, 1006, 1007]),
      channelIdToName: new Map([
        [1004, 'rail'],
        [1005, 'rdpdr'],
        [1006, 'rdpsnd'],
        [1007, 'cliprdr']
      ])
    };

    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.equal(state.cliprdrWriteChannelId, 1007);
    assert.deepEqual(kept.map(clipMsgType), [CB_CLIP_CAPS, CB_CLIP_CAPS, CB_FORMAT_LIST, CB_FORMAT_LIST]);
    assert.equal(parseMcsSendData(kept[0]).channelId, 1007, 'CAPS al VC nombrado');
    assert.equal(parseMcsSendData(kept[1]).channelId, 1001, 'CAPS al Probe');
    assert.equal(parseMcsSendData(kept[2]).channelId, 1001, 'FORMAT_LIST al Probe');
    assert.equal(parseMcsSendData(kept[3]).channelId, 1007, 'FORMAT_LIST tambien al VC nombrado');
    assert.ok(!state.pendingClientCliprdr || state.pendingClientCliprdr.length === 0);
    assert.equal(kept.injected.length, 1, 'acuse sintetico hacia WASM');
    assert.ok(logs.some((l) => l.includes('write path recuperado ch=1007')));
  });

  test('saludo en canal sin nombre reescribe CAPS y FORMAT_LIST y tira TEMPDIR', () => {
    const state = {
      wallixService: 'APP',
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 10003,
      cliprdrWriteChannelId: 10003,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005, 1006, 1007]),
      channelIdToName: new Map([
        [1004, 'rail'],
        [1005, 'rdpdr'],
        [1006, 'rdpsnd'],
        [1007, 'cliprdr']
      ])
    };

    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.equal(kept.length, 2);
    assert.deepEqual(kept.map(clipMsgType), [CB_CLIP_CAPS, CB_FORMAT_LIST]);
    for (const frame of kept) {
      assert.equal(parseMcsSendData(frame).channelId, 10003);
    }
  });

  test('si el bastion entrega cliprdr por el canal de usuario 1001, no se escribe CHANNEL_PDU ahi', () => {
    const state = {
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1001,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005]),
      channelIdToName: new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']])
    };

    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.equal(kept.length, 1, 'CAPS no se escribe en 1001; FORMAT_LIST si (el pegado si no no sale)');
    assert.equal(parseMcsSendData(kept[0]).channelId, 1001);
    assert.equal(clipMsgType(kept[0]), CB_FORMAT_LIST);
    assert.equal(state.pendingClientCliprdr.length, 1, 'CAPS encolado; TEMPDIR tirado');
    assert.equal(clipMsgType(state.pendingClientCliprdr[0]), CB_CLIP_CAPS);
    assert.equal(kept.injected.length, 1, 'acuse sintetico para que IronRDP pase a Ready');
    assert.equal(kept.injected[0][7], 0x68);
    assert.equal(parseMcsSendData(kept.injected[0]).channelId, CLIPRDR_CH);
    assert.ok(logs.some((l) => l.includes('cliprdr no alineado')));
    assert.ok(logs.some((l) => l.includes('datos por ch=1001')));
  });

  test('con destino 1001, FORMAT_DATA_REQUEST se escribe en 1001', () => {
    const state = {
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1001,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrServerReady: true,
      cliprdrFormatListAcked: true,
      allowed: new Set([1003, 1004, 1005]),
      channelIdToName: new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']])
    };

    const kept = filterBatch(service, buildClipFrame(CLIPRDR_CH, CB_FORMAT_DATA_REQUEST, Buffer.alloc(4)), state);

    assert.equal(kept.length, 1);
    assert.equal(parseMcsSendData(kept[0]).channelId, 1001);
    assert.equal(clipMsgType(kept[0]), CB_FORMAT_DATA_REQUEST);
    assert.equal((state.pendingClientCliprdr || []).length, 0);
    assert.equal(kept.injected.length, 0);
  });

  test('con destino 1001, CB_FILECONTENTS_REQUEST se escribe en 1001', () => {
    const state = {
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1001,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrServerReady: true,
      cliprdrFormatListAcked: true,
      allowed: new Set([1003, 1004, 1005]),
      channelIdToName: new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']])
    };

    const kept = filterBatch(service, buildClipFrame(CLIPRDR_CH, CB_FILECONTENTS_REQUEST, Buffer.alloc(28)), state);

    assert.equal(kept.length, 1);
    assert.equal(parseMcsSendData(kept[0]).channelId, 1001);
    assert.equal(clipMsgType(kept[0]), CB_FILECONTENTS_REQUEST);
  });

  test('con destino IO 1003, FORMAT_DATA_REQUEST va al VC nombrado cliprdr no al IO', () => {
    const state = {
      wallixService: 'RDP',
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: IO_CH,
      cliprdrOnUnsafeChannel: IO_CH,
      cliprdrServerReady: true,
      cliprdrFormatListAcked: true,
      allowed: new Set([1003, 1004, 1005, 1006]),
      channelIdToName: new Map([
        [1004, 'rdpdr'],
        [1005, 'rdpsnd'],
        [1006, 'cliprdr']
      ])
    };

    const kept = filterBatch(service, buildClipFrame(CLIPRDR_CH, CB_FORMAT_DATA_REQUEST, Buffer.alloc(4)), state);

    assert.equal(kept.length, 1);
    assert.equal(parseMcsSendData(kept[0]).channelId, 1006);
    assert.notEqual(parseMcsSendData(kept[0]).channelId, IO_CH);
  });

  test('si tras CAPS en 1001 se confirma write path 1004, el cliente escribe en 1004', () => {
    const state = {
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: CLIPRDR_CH,
      cliprdrWriteChannelId: CLIPRDR_CH,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005]),
      channelIdToName: new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']])
    };

    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.equal(kept.length, 3, 'el handshake completo va al VC negociado');
    for (const frame of kept) {
      assert.equal(parseMcsSendData(frame).channelId, CLIPRDR_CH);
    }
  });

  test('ALLOW_USER_CHANNEL=1 tampoco escribe CHANNEL_PDU en 1001', () => {
    process.env.NODETERM_RDP_CLIPRDR_ALLOW_USER_CHANNEL = '1';
    const state = {
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1001,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrServerReady: true,
      pendingClientCliprdr: [],
      allowed: new Set([1003, 1004, 1005]),
      channelIdToName: new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']])
    };

    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.equal(kept.length, 1, 'FORMAT_LIST sale por 1001; CAPS/TEMPDIR no');
    assert.equal(parseMcsSendData(kept[0]).channelId, 1001);
    assert.equal(clipMsgType(kept[0]), CB_FORMAT_LIST);
    assert.equal(kept.injected.length, 1, 'acuse sintetico para que IronRDP pase a Ready');
    assert.equal(state.pendingClientCliprdr.length, 1, 'CAPS encolado; TEMPDIR tirado');
  });

  test('si tras encolar en 1001 se confirma write path 1004, se vacia la cola hacia 1004', () => {
    const state = {
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1001,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrServerReady: true,
      pendingClientCliprdr: [],
      allowed: new Set([1003, 1004, 1005]),
      channelIdToName: new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']])
    };

    const kept = filterBatch(service, buildInitiateCopyBatch(), state);
    assert.equal(kept.length, 1, 'FORMAT_LIST ya salio por 1001');
    assert.equal(state.pendingClientCliprdr.length, 1, 'solo CAPS queda en cola');

    state.cliprdrWriteChannelId = CLIPRDR_CH;
    const written = [];
    service.flushPendingClientCliprdr(
      state,
      { writable: true, write: (buf) => written.push(buf) },
      { readyState: 0, OPEN: 1 }
    );

    assert.equal(written.length, 1, 'CAPS sale por el VC estatico');
    assert.equal(parseMcsSendData(written[0]).channelId, CLIPRDR_CH);
    assert.equal(clipMsgType(written[0]), CB_CLIP_CAPS);
    assert.equal(state.pendingClientCliprdr.length, 0);
  });

  test('ESAH alineado: saludo 1006 remapea a cliprdr, conserva 0x13 y no sintetiza ACK', () => {
    const state = {
      wallixService: 'RDP',
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1006,
      cliprdrWriteChannelId: 1006,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005, 1006]),
      channelIdToName: new Map([
        [1004, 'rdpdr'],
        [1005, 'rdpsnd'],
        [1006, 'cliprdr']
      ])
    };

    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.equal(kept.length, 3, 'CAPS+TEMPDIR+FORMAT_LIST van al VC nombrado cliprdr');
    assert.deepEqual(kept.map(clipMsgType), [CB_CLIP_CAPS, CB_TEMP_DIRECTORY, CB_FORMAT_LIST]);
    for (const frame of kept) {
      assert.equal(parseMcsSendData(frame).channelId, 1006);
      assert.equal(chanFlags(frame) & CHANNEL_FLAG_SHOW_PROTOCOL, CHANNEL_FLAG_SHOW_PROTOCOL);
    }
    assert.equal(kept.injected.length, 0, 'el acuse real lo tiene que enviar el servidor, como en ESJC');
  });

  test('APP con saludo 1001 escribe CAPS en 1007 y FORMAT_LIST en 1001', () => {
    const state = {
      wallixService: 'APP',
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1001,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrWriteChannelId: 1007,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005, 1006, 1007]),
      channelIdToName: new Map([
        [1004, 'rail'],
        [1005, 'rdpdr'],
        [1006, 'rdpsnd'],
        [1007, 'cliprdr']
      ])
    };

    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.deepEqual(
      kept.map(clipMsgType),
      [CB_CLIP_CAPS, CB_TEMP_DIRECTORY, CB_CLIP_CAPS, CB_FORMAT_LIST, CB_FORMAT_LIST]
    );
    assert.equal(parseMcsSendData(kept[0]).channelId, 1007, 'CAPS al VC nombrado');
    assert.equal(parseMcsSendData(kept[1]).channelId, 1007, 'TEMPDIR al VC nombrado');
    assert.equal(parseMcsSendData(kept[2]).channelId, 1001, 'CAPS al Probe');
    assert.equal(parseMcsSendData(kept[3]).channelId, 1001, 'FORMAT_LIST al Probe');
    assert.equal(parseMcsSendData(kept[4]).channelId, 1007, 'FORMAT_LIST tambien al VC nombrado');
    assert.equal(chanFlags(kept[3]) & CHANNEL_FLAG_SHOW_PROTOCOL, CHANNEL_FLAG_SHOW_PROTOCOL);
  });

  test('saludo por rdpsnd 1005: handshake completo, flags 0x13, sin ACK sintetico', () => {
    const state = {
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1005,
      cliprdrWriteChannelId: 1005,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005]),
      channelIdToName: new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']])
    };

    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.equal(kept.length, 3, 'si Probe saluda por 1005, ese canal ES cliprdr');
    assert.deepEqual(kept.map(clipMsgType), [CB_CLIP_CAPS, CB_TEMP_DIRECTORY, CB_FORMAT_LIST]);
    for (const frame of kept) {
      assert.equal(parseMcsSendData(frame).channelId, 1005);
      assert.equal(chanFlags(frame) & CHANNEL_FLAG_SHOW_PROTOCOL, CHANNEL_FLAG_SHOW_PROTOCOL);
    }
    assert.equal(kept.injected.length, 0);
  });

  test('segunda generacion del selector: FORMAT_LIST conserva flags 0x13 y no sintetiza ACK', () => {
    const state = {
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1005,
      cliprdrWriteChannelId: 1005,
      cliprdrServerReady: true,
      cliprdrMonitorReadyCount: 2,
      cliprdrServerChannelFlags: 0x03,
      allowed: new Set([1003, 1004, 1005]),
      channelIdToName: new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']])
    };

    const kept = filterBatch(service, buildClipFrame(CLIPRDR_CH, CB_FORMAT_LIST, Buffer.alloc(6)), state);

    assert.equal(kept.length, 1);
    assert.equal(parseMcsSendData(kept[0]).channelId, 1005);
    assert.equal(chanFlags(kept[0]) & CHANNEL_FLAG_SHOW_PROTOCOL, CHANNEL_FLAG_SHOW_PROTOCOL);
    assert.equal(kept.injected.length, 0, 'WASM ya esta en Ready; no se sintetiza el acuse');
  });

  test('descartar el CB_CLIP_CAPS no se lleva por delante el resto del lote', () => {
    process.env.NODETERM_RDP_CLIPRDR_DROP_CLIENT_CAPS = '1';

    const state = {
      wallixService: 'APP',
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1001,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrWriteChannelId: 1007,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005, 1006, 1007]),
      channelIdToName: new Map([
        [1004, 'rail'],
        [1005, 'rdpdr'],
        [1006, 'rdpsnd'],
        [1007, 'cliprdr']
      ])
    };
    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.equal(clipMsgType(kept[kept.length - 1]), CB_FORMAT_LIST, 'el FormatList tiene que salir');
  });

  test('conexion directa: el lote se reenvia intacto', () => {
    const payload = buildInitiateCopyBatch();
    const kept = filterBatch(service, payload, directFilterState());

    assert.equal(kept.length, 3);
    assert.ok(
      Buffer.concat(kept).equals(payload),
      'sin bastion no se remapea ni se limpian flags: los bytes deben ser identicos'
    );
  });

  test('conexion directa: tampoco se descarta el CB_CLIP_CAPS', () => {
    process.env.NODETERM_RDP_CLIPRDR_DROP_CLIENT_CAPS = '1';

    const kept = filterBatch(service, buildInitiateCopyBatch(), directFilterState());

    assert.deepEqual(
      kept.map(clipMsgType),
      [CB_CLIP_CAPS, CB_TEMP_DIRECTORY, CB_FORMAT_LIST],
      'el descarte es un apano para el bastion; un servidor normal si necesita las capacidades'
    );
  });

  test('el trafico del canal IO no se toca', () => {
    const ioFrame = buildMcsRequest(IO_CH, Buffer.alloc(32, 0xaa));
    const { forward, inject } = service.filterClientVirtualChannelFrame(ioFrame, bastionFilterState());

    assert.equal(forward, ioFrame, 'el canal IO debe pasar sin inspeccion ni copia');
    assert.equal(inject.length, 0);
  });

  test('el silenciado total descarta el lote completo', () => {
    process.env.NODETERM_RDP_CLIPRDR_MUTE_CLIENT = '1';

    const kept = filterBatch(service, buildInitiateCopyBatch(), bastionFilterState());

    assert.equal(kept.length, 0);
  });

  test('cliprdr nombrado alineado no sintetiza FORMAT_LIST_RESPONSE', () => {
    const kept = filterBatch(service, buildInitiateCopyBatch(), bastionFilterState());
    assert.equal(kept.injected.length, 0, 'el servidor debe enviar el acuse, como en ESJC');
  });

  test('sintetiza un CB_FORMAT_LIST_RESPONSE(OK) hacia WASM tras el CB_FORMAT_LIST', () => {
    const state = {
      wallixService: 'APP',
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1001,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrWriteChannelId: 1007,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005, 1006, 1007]),
      channelIdToName: new Map([
        [1004, 'rail'],
        [1005, 'rdpdr'],
        [1006, 'rdpsnd'],
        [1007, 'cliprdr']
      ])
    };
    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.equal(kept.injected.length, 1, 'sin este acuse IronRDP no llega nunca a Ready');

    const ack = parseMcsSendData(kept.injected[0]);
    assert.equal(kept.injected[0][7], 0x68, 'hacia WASM tiene que ser una indicacion MCS');
    assert.equal(ack.channelId, CLIPRDR_CH, 'va por el canal que negocio el cliente');
    assert.equal(ack.userData.readUInt32LE(0), 8, 'CHANNEL_PDU_HEADER.length');
    assert.equal(ack.userData.readUInt32LE(4), CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST);
    assert.equal(ack.userData.readUInt16LE(8), 0x0003, 'CB_FORMAT_LIST_RESPONSE');
    assert.equal(ack.userData.readUInt16LE(10), 0x0001, 'CB_RESPONSE_OK');
    assert.equal(ack.userData.readUInt32LE(12), 0, 'dataLen');
  });

  test('el acuse sintetico se emite una sola vez por sesion', () => {
    const state = {
      wallixService: 'APP',
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1001,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrWriteChannelId: 1007,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005, 1006, 1007]),
      channelIdToName: new Map([
        [1004, 'rail'],
        [1005, 'rdpdr'],
        [1006, 'rdpsnd'],
        [1007, 'cliprdr']
      ])
    };

    const first = filterBatch(service, buildInitiateCopyBatch(), state);
    const second = filterBatch(service, buildClipFrame(CLIPRDR_CH, CB_FORMAT_LIST, Buffer.alloc(24)), state);

    assert.equal(first.injected.length, 1);
    assert.equal(second.injected.length, 0, 'las copias posteriores ya van sobre un canal en Ready');
  });

  test('descartar el CB_TEMP_DIRECTORY conserva capacidades y lista de formatos', () => {
    process.env.NODETERM_RDP_CLIPRDR_DROP_CLIENT_TEMPDIR = '1';

    const state = {
      wallixService: 'APP',
      ioChannelId: IO_CH,
      cliprdrChannelId: CLIPRDR_CH,
      serverCliprdrChannelId: 1001,
      cliprdrOnUnsafeChannel: 1001,
      cliprdrWriteChannelId: 1007,
      cliprdrServerReady: true,
      allowed: new Set([1003, 1004, 1005, 1006, 1007]),
      channelIdToName: new Map([
        [1004, 'rail'],
        [1005, 'rdpdr'],
        [1006, 'rdpsnd'],
        [1007, 'cliprdr']
      ])
    };
    const kept = filterBatch(service, buildInitiateCopyBatch(), state);

    assert.deepEqual(
      kept.map(clipMsgType),
      [CB_CLIP_CAPS, CB_CLIP_CAPS, CB_FORMAT_LIST, CB_FORMAT_LIST]
    );
    assert.equal(kept.injected.length, 1, 'el acuse sintetico sigue saliendo');
  });

  test('conexion directa: el CB_TEMP_DIRECTORY no se descarta', () => {
    process.env.NODETERM_RDP_CLIPRDR_DROP_CLIENT_TEMPDIR = '1';

    const kept = filterBatch(service, buildInitiateCopyBatch(), directFilterState());

    assert.deepEqual(kept.map(clipMsgType), [CB_CLIP_CAPS, CB_TEMP_DIRECTORY, CB_FORMAT_LIST]);
  });

  test('conexion directa: no se sintetiza nada', () => {
    const kept = filterBatch(service, buildInitiateCopyBatch(), directFilterState());

    assert.equal(
      kept.injected.length,
      0,
      'un servidor normal responde el acuse por si mismo; falsearlo taparia un fallo real'
    );
  });

  test('NO_REMAP deja el canal negociado pero sigue troceando', () => {
    process.env.NODETERM_RDP_CLIPRDR_NO_REMAP = '1';

    const kept = filterBatch(service, buildInitiateCopyBatch(), bastionFilterState());

    assert.equal(kept.length, 3);
    for (const frame of kept) {
      assert.equal(parseMcsSendData(frame).channelId, CLIPRDR_CH);
    }
  });
});
