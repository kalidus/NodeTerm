'use strict';

/**
 * Capa de canales virtual (NODETERM_RDP_CHANNELS=virtual):
 *  - CS_NET = mstsc en :APP: (sin rail)
 *  - SC_NET recortado a los canales del WASM con IDs reales por nombre, tambien en bastion
 *  - el bridge hace los joins de los VCs inyectados y absorbe sus confirms
 */

const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  createChannelFilterState,
  processServerFrame,
  parseServerNetworkChannels,
  readChannelJoinRequest
} = require('../../src/main/services/rdp-channel-filter');

function buildScNetFrame(ioId, ids) {
  const scLen = 8 + ids.length * 2;
  const sc = Buffer.alloc(scLen);
  sc.writeUInt16LE(0x0c03, 0);
  sc.writeUInt16LE(scLen, 2);
  sc.writeUInt16LE(ioId, 4);
  sc.writeUInt16LE(ids.length, 6);
  ids.forEach((id, i) => sc.writeUInt16LE(id, 8 + i * 2));
  const frame = Buffer.alloc(4 + sc.length);
  frame[0] = 0x03;
  frame.writeUInt16BE(frame.length, 2);
  sc.copy(frame, 4);
  return frame;
}

function attachConfirm(userId) {
  const b = Buffer.from('0300000b02f0802e000000', 'hex');
  b.writeUInt16BE(userId, 9);
  return b;
}

function joinConfirm(userId, channelId, result = 0) {
  const b = Buffer.from('0300000f02f0803e00000000000000', 'hex');
  b[8] = (result << 3) & 0xff;
  b.writeUInt16BE(userId, 9);
  b.writeUInt16BE(channelId, 11);
  b.writeUInt16BE(channelId, 13);
  return b;
}

function virtualState(wasmNames, clientNames) {
  const state = createChannelFilterState();
  state.isBastion = true;
  state.virtualChannels = true;
  state.wasmChannelNames = wasmNames;
  state.clientChannelNames = clientNames;
  return state;
}

describe('resolveInjectedChannels en modo virtual', () => {
  const svc = require('../../src/main/services/RdpNativeBridgeService');
  const prev = {
    ch: process.env.NODETERM_RDP_CHANNELS,
    inj: process.env.NODETERM_RDP_INJECT_CHANNELS,
    app: process.env.NODETERM_RDP_INJECT_CHANNELS_APP
  };
  beforeEach(() => {
    process.env.NODETERM_RDP_INJECT_CHANNELS = '';
    process.env.NODETERM_RDP_INJECT_CHANNELS_APP = '';
  });
  afterEach(() => {
    for (const [k, v] of [
      ['NODETERM_RDP_CHANNELS', prev.ch],
      ['NODETERM_RDP_INJECT_CHANNELS', prev.inj],
      ['NODETERM_RDP_INJECT_CHANNELS_APP', prev.app]
    ]) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  test('APP virtual: sin rail (CS_NET = mstsc)', () => {
    process.env.NODETERM_RDP_CHANNELS = 'virtual';
    assert.equal(svc.isVirtualChannelsMode(), true);
    assert.deepEqual(
      svc.resolveInjectedChannels({ username: 'u@d@Host:APP:u' }),
      { before: ['rdpdr', 'rdpsnd'], after: [] }
    );
  });

  test('APP legacy conserva rail', () => {
    process.env.NODETERM_RDP_CHANNELS = 'legacy';
    assert.deepEqual(
      svc.resolveInjectedChannels({ username: 'u@d@Host:APP:u' }),
      { before: ['rail', 'rdpdr', 'rdpsnd'], after: [] }
    );
  });

  test('valor desconocido cae al default', () => {
    process.env.NODETERM_RDP_CHANNELS = 'otro';
    assert.equal(svc.resolveChannelsMode(), 'virtual');
  });
});

describe('capa virtual en bastion', () => {
  const wasm = ['cliprdr', 'drdynvc'];
  const client = ['rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc'];
  const ids = [1004, 1005, 1006, 1007];

  test('SC_NET recortado a IDs reales de los canales del WASM', () => {
    const state = virtualState(wasm, client);
    const res = processServerFrame(state, buildScNetFrame(1003, ids));
    assert.equal(res.scNetAligned, true);
    assert.deepEqual(parseServerNetworkChannels(res.forward).channelIds, [1006, 1007]);
    assert.equal(state.cliprdrChannelId, 1006);
    assert.equal(state.wasmDrdynvcChannelId, 1007);
    assert.equal(state.drdynvcChannelId, 1007);
    assert.deepEqual([...state.virtualBridgeJoinIds].sort(), [1004, 1005]);
  });

  test('sin virtualChannels el bastion sigue sin recortar (legacy)', () => {
    const state = virtualState(wasm, client);
    state.virtualChannels = false;
    const res = processServerFrame(state, buildScNetFrame(1003, ids));
    assert.notEqual(res.scNetAligned, true);
    assert.deepEqual(parseServerNetworkChannels(res.forward).channelIds, ids);
  });

  test('Attach User Confirm dispara joins del bridge para rdpdr/rdpsnd, una sola vez', () => {
    const state = virtualState(wasm, client);
    processServerFrame(state, buildScNetFrame(1003, ids));

    // Wallix: Attach User Confirm con userId=0 (hex 2e000000).
    const res = processServerFrame(state, attachConfirm(0));
    assert.equal(res.dropped, false);
    assert.ok(res.forward, 'el Attach Confirm sigue llegando al WASM');
    assert.match(res.note || '', /virtual-bridge-joins/);
    const reqs = res.replies.map((r) => readChannelJoinRequest(r));
    assert.deepEqual(reqs, [
      { initiator: 0, channelId: 1004 },
      { initiator: 0, channelId: 1005 }
    ]);

    const again = processServerFrame(state, attachConfirm(0));
    assert.deepEqual(again.replies, []);
  });

  test('Join Confirm de canales del bridge se absorbe; los del WASM pasan', () => {
    const state = virtualState(wasm, client);
    processServerFrame(state, buildScNetFrame(1003, ids));
    processServerFrame(state, attachConfirm(0));

    const a = processServerFrame(state, joinConfirm(0, 1004));
    assert.equal(a.dropped, true);
    assert.equal(a.forward, null);
    const b = processServerFrame(state, joinConfirm(0, 1005));
    assert.equal(b.dropped, true);
    assert.deepEqual([...state.virtualJoinConfirmed].sort(), [1004, 1005]);

    for (const ch of [1003, 1006, 1007]) {
      const frame = joinConfirm(0, ch);
      const r = processServerFrame(state, frame);
      assert.equal(r.dropped, false, `ch=${ch}`);
      assert.ok(r.forward, `ch=${ch}`);
    }
  });

  test('APP sin rail: mismos IDs reales que RDP', () => {
    // CS_NET mstsc: rdpdr,rdpsnd,cliprdr,drdynvc -> SC_NET 1004..1007 en APP y RDP
    for (const svc of ['APP', 'RDP']) {
      const state = virtualState(wasm, client);
      state.wallixService = svc;
      const res = processServerFrame(state, buildScNetFrame(1003, ids));
      assert.deepEqual(parseServerNetworkChannels(res.forward).channelIds, [1006, 1007], svc);
    }
  });
});
