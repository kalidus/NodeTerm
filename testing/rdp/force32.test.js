'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  findClientCoreData,
  isMcsConnectInitial,
  patchClientCoreWant32bpp,
  prepareMcsConnectInitial
} = require('../../src/main/services/rdp-mcs-helpers');
const {
  buildFastPathBitmapPdu,
  fixWallixBitmapStrideCrop,
  FastPathBitmapReassembler
} = require('../../src/main/services/rdp-fastpath-helpers');
const {
  isFastPathBitmapFrame,
  classifyFastPathUpdate,
  WsBackpressureController
} = require('../../src/main/services/rdp-bridge-backpressure');

const CAPTURE = path.join(__dirname, 'frames', 'to-01-403b.hex');
const hasCapture = fs.existsSync(CAPTURE);

function loadConnectInitial() {
  return Buffer.from(fs.readFileSync(CAPTURE, 'utf8').trim(), 'hex');
}

function coreFields(buf) {
  const found = findClientCoreData(buf);
  const d = found.offset + 4;
  return {
    high: buf.readUInt16LE(d + 136),
    supported: buf.readUInt16LE(d + 138),
    early: buf.readUInt16LE(d + 140)
  };
}

describe('FORCE32: Client Core Data', { skip: !hasCapture }, () => {
  it('el Connect Initial capturado se reconoce y pide 16bpp por defecto', () => {
    const ci = loadConnectInitial();
    assert.equal(isMcsConnectInitial(ci), true);
    const f = coreFields(ci);
    assert.equal(f.high, 0x10);
    assert.equal(f.early & 0x2, 0);
  });

  it('activa WANT_32BPP_SESSION y deja highColorDepth=24 sin cambiar longitud', () => {
    const ci = loadConnectInitial();
    const r = patchClientCoreWant32bpp(ci);
    assert.equal(r.patched, true);
    assert.equal(r.buf.length, ci.length);
    const f = coreFields(r.buf);
    assert.equal(f.high, 0x18);
    assert.equal(f.early & 0x2, 0x2);
    assert.equal(f.supported, 0xf);
    // solo cambian highColorDepth (2B) y earlyCapabilityFlags (1B efectivo)
    let diffs = 0;
    for (let i = 0; i < ci.length; i++) if (ci[i] !== r.buf[i]) diffs++;
    assert.ok(diffs >= 1 && diffs <= 4, `diffs=${diffs}`);
    // el original no se muta
    assert.equal(coreFields(ci).high, 0x10);
  });

  it('es idempotente', () => {
    const once = patchClientCoreWant32bpp(loadConnectInitial()).buf;
    const twice = patchClientCoreWant32bpp(once);
    assert.equal(twice.patched, false);
    assert.deepEqual(twice.buf, once);
  });

  it('prepareMcsConnectInitial solo aplica el cambio con force32', () => {
    const ci = loadConnectInitial();
    const off = prepareMcsConnectInitial(ci, 1, {});
    assert.equal(coreFields(off.buf).high, 0x10);
    assert.ok(!off.notes.some((n) => n.includes('FORCE32')));
    const on = prepareMcsConnectInitial(ci, 1, { force32: true });
    assert.equal(coreFields(on.buf).high, 0x18);
    assert.ok(on.notes.some((n) => n.includes('FORCE32')));
  });

  it('tramas ajenas o truncadas no se tocan ni lanzan', () => {
    assert.equal(isMcsConnectInitial(Buffer.from([0x30, 0x82, 0x01])), false);
    assert.equal(isMcsConnectInitial(null), false);
    assert.equal(patchClientCoreWant32bpp(Buffer.alloc(20)).patched, false);
    const ci = loadConnectInitial();
    for (let n = 0; n < ci.length; n += 17) {
      assert.doesNotThrow(() => patchClientCoreWant32bpp(ci.subarray(0, n)));
    }
  });
});

describe('FORCE32: Surface Commands y bitmaps no 16bpp pasan sin tocar', () => {
  function surfaceCmdsFrame() {
    const data = Buffer.alloc(24, 0xab);
    const total = 1 + 1 + 1 + 2 + data.length;
    const hdr = Buffer.from([0x00, total, 0x04, data.length & 0xff, data.length >> 8]);
    return Buffer.concat([hdr, data]);
  }

  function bitmap32Frame() {
    const w = 4;
    const h = 4;
    const pixels = Buffer.alloc(w * h * 4, 0x7f);
    const rect = Buffer.alloc(18 + pixels.length);
    rect.writeUInt16LE(0, 0);
    rect.writeUInt16LE(0, 2);
    rect.writeUInt16LE(w - 1, 4);
    rect.writeUInt16LE(h - 1, 6);
    rect.writeUInt16LE(w, 8);
    rect.writeUInt16LE(h, 10);
    rect.writeUInt16LE(32, 12);
    rect.writeUInt16LE(0, 14);
    rect.writeUInt16LE(pixels.length, 16);
    pixels.copy(rect, 18);
    return buildFastPathBitmapPdu(0x00, 0x01, [rect]);
  }

  it('SURFACE_CMDS se clasifica y no se considera bitmap descartable', () => {
    const f = surfaceCmdsFrame();
    assert.equal(classifyFastPathUpdate(f), 'SURFACE_CMDS');
    assert.equal(isFastPathBitmapFrame(f), false);
    const bp = new WsBackpressureController({ bastion: true, highWater: 10, lowWater: 1 });
    assert.equal(bp.shouldShedBitmap(1_000_000, f), false);
  });

  it('el reescritor de stride deja intacto SURFACE_CMDS y bitmap 32bpp', () => {
    for (const frame of [surfaceCmdsFrame(), bitmap32Frame()]) {
      const r = fixWallixBitmapStrideCrop(frame);
      assert.equal(r.patchedCount, 0);
      assert.deepEqual(r.buffers, [frame]);
    }
  });

  it('el reensamblador deja pasar SURFACE_CMDS en orden', () => {
    const re = new FastPathBitmapReassembler();
    const f = surfaceCmdsFrame();
    assert.deepEqual(re.push(f), [f]);
  });
});
