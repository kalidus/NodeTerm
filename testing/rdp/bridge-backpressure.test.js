'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isFastPathBitmapFrame,
  BridgeLatencyMetrics,
  WsBackpressureController,
  WS_HIGH_WATER_MARK,
  WS_LOW_WATER_MARK,
  BASTION_REWRITE_BUDGET_MS
} = require('../../src/main/services/rdp-bridge-backpressure');
const {
  buildFastPathBitmapPdu,
  bitmapPayloadNeedsRewrite,
  wrapFastPathUpdate,
  parseFastPathUpdate,
  FP_FRAG_LAST,
  fixWallixBitmapStrideCrop
} = require('../../src/main/services/rdp-fastpath-helpers');
const { encodeMegaMegaColorRun } = require('../../src/main/services/rdp-rle16');

function buildSolidBitmapPdu(left, top, iw, ih, color = 0x1234) {
  const encoded = encodeMegaMegaColorRun(iw * ih, color);
  const rect = Buffer.alloc(18 + encoded.length);
  rect.writeUInt16LE(left, 0);
  rect.writeUInt16LE(top, 2);
  rect.writeUInt16LE(left + iw - 1, 4);
  rect.writeUInt16LE(top + ih - 1, 6);
  rect.writeUInt16LE(iw, 8);
  rect.writeUInt16LE(ih, 10);
  rect.writeUInt16LE(16, 12);
  rect.writeUInt16LE(0x0001 | 0x0400, 14);
  rect.writeUInt16LE(encoded.length, 16);
  encoded.copy(rect, 18);
  return buildFastPathBitmapPdu(0x00, 0x01, [rect]);
}

describe('isFastPathBitmapFrame', () => {
  it('detecta Fast-Path BITMAP y rechaza TPKT', () => {
    const bmp = buildSolidBitmapPdu(0, 0, 8, 8);
    assert.ok(bmp);
    assert.equal(isFastPathBitmapFrame(bmp), true);
    assert.equal(isFastPathBitmapFrame(Buffer.from([0x03, 0x00, 0x00, 0x08, 0x00, 0x00])), false);
  });
});

describe('WsBackpressureController bastion latest-wins', () => {
  it('no pausa TLS en bastion; shed bitmaps por cola y conserva el ultimo', () => {
    const metrics = new BridgeLatencyMetrics();
    const bp = new WsBackpressureController({
      bastion: true,
      metrics,
      highWater: 1000,
      lowWater: 100,
      rewriteBudgetMs: 50
    });
    const a = buildSolidBitmapPdu(0, 0, 4, 4, 0x1111);
    const b = buildSolidBitmapPdu(0, 0, 4, 4, 0x2222);
    const pointerLike = Buffer.from([0x00, 0x06, 0x00, 0x00, 0x01, 0x00]);

    bp.beginDataTick();
    assert.equal(bp.shouldPauseTls(50_000), false);
    assert.equal(bp.shouldShedBitmap(50, a), false);
    assert.equal(bp.shouldShedBitmap(5000, a), true);
    assert.equal(bp.shouldShedBitmap(5000, b), true);
    assert.equal(metrics.bitmapShed, 2);

    assert.equal(bp.takePendingIfDrained(500), null);
    const pending = bp.takePendingIfDrained(50);
    assert.ok(pending);
    assert.deepEqual(pending, b);
    assert.equal(metrics.bitmapFlushed, 1);

    assert.equal(bp.shouldShedBitmap(5000, pointerLike), false);
  });

  it('shed por presupuesto RLE aunque la cola WS este baja', () => {
    const metrics = new BridgeLatencyMetrics();
    const bp = new WsBackpressureController({
      bastion: true,
      metrics,
      highWater: 100_000,
      lowWater: 100,
      rewriteBudgetMs: 3
    });
    const a = buildSolidBitmapPdu(0, 0, 4, 4, 0x1111);
    const b = buildSolidBitmapPdu(0, 0, 4, 4, 0x2222);

    bp.beginDataTick();
    assert.equal(bp.shouldShedBitmap(0, a), false);
    bp.noteRewriteSpent(3.5);
    assert.equal(bp.shouldShedBitmap(0, b), true);
    assert.equal(metrics.budgetShed, 1);
    // sin ignoreBudget no envia si el presupuesto sigue agotado
    assert.equal(bp.takePendingIfDrained(0, { force: true }), null);
    // fin de tick: ignoreBudget permite el latest
    const pending = bp.takePendingIfDrained(0, { force: true, ignoreBudget: true });
    assert.ok(pending);
    assert.deepEqual(pending, b);
  });

  it('en path directo no shed; puede pedir pause TLS', () => {
    const bp = new WsBackpressureController({
      bastion: false,
      highWater: 1000,
      lowWater: 100,
      pauseTlsMark: 2000
    });
    const a = buildSolidBitmapPdu(0, 0, 4, 4);
    assert.equal(bp.shouldShedBitmap(50_000, a), false);
    assert.equal(bp.shouldPauseTls(1500), false);
    assert.equal(bp.shouldPauseTls(3000), true);
    bp.markTlsPaused(true);
    assert.equal(bp.shouldPauseTls(3000), false);
    assert.equal(bp.shouldResumeTls(50), true);
  });
});

describe('BridgeLatencyMetrics', () => {
  it('calcula p50/p95 y formatea linea Bridge Perf', () => {
    const m = new BridgeLatencyMetrics();
    for (const ms of [1, 2, 3, 4, 10]) m.noteRewrite(ms, true);
    const s = m.summary();
    assert.equal(s.rewriteCount, 5);
    assert.equal(s.rewritePatched, 5);
    assert.ok(s.rewriteP50Ms >= 1);
    assert.ok(s.rewriteP95Ms >= s.rewriteP50Ms);
    assert.match(m.formatLine(), /^\[Bridge Perf\]/);
  });
});

describe('bitmapPayloadNeedsRewrite / wrapFastPathUpdate', () => {
  it('early-out cuando stride cuadra y no es tesela delta', () => {
    const pdu = buildSolidBitmapPdu(10, 20, 8, 8);
    const info = parseFastPathUpdate(pdu);
    assert.ok(info);
    assert.equal(bitmapPayloadNeedsRewrite(info.updateData), false);
    const fixed = fixWallixBitmapStrideCrop(pdu);
    assert.equal(fixed.patchedCount, 0);
  });

  it('wrapFastPathUpdate reconstruye un PDU SINGLE desde fragmentos', () => {
    const pdu = buildSolidBitmapPdu(0, 0, 8, 4);
    const parsed = parseFastPathUpdate(pdu);
    const mid = Math.floor(parsed.updateData.length / 2);
    const firstData = parsed.updateData.subarray(0, mid);
    const lastData = parsed.updateData.subarray(mid);
    const wrapped = wrapFastPathUpdate(
      parsed.fpHeaderByte,
      (FP_FRAG_LAST << 4) | 0x1,
      Buffer.concat([firstData, lastData])
    );
    assert.ok(wrapped);
    const again = parseFastPathUpdate(wrapped);
    assert.ok(again);
    assert.equal(again.fragmentation, 0);
    assert.deepEqual(again.updateData, parsed.updateData);
  });
});

describe('umbrales exportados', () => {
  it('HIGH > LOW y presupuesto RLE > 0', () => {
    assert.ok(WS_HIGH_WATER_MARK > WS_LOW_WATER_MARK);
    assert.ok(BASTION_REWRITE_BUDGET_MS > 0);
  });
});
