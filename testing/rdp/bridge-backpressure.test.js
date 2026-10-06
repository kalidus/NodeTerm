'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isFastPathBitmapFrame,
  classifyFastPathUpdate,
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
    // a queda totalmente tapado por b (mismo rect): solo se conserva b
    assert.deepEqual(pending, [b]);
    assert.equal(metrics.bitmapFlushed, 1);
    assert.equal(metrics.bitmapCoalesced, 1);

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
    assert.deepEqual(pending, [b]);
  });

  describe('latest-wins seguro (lista ordenada de pendientes)', () => {
    const mk = () => new WsBackpressureController({
      bastion: true,
      highWater: 1000,
      lowWater: 100,
      rewriteBudgetMs: 50
    });

    it('conserva el delta que NO queda tapado y lo entrega en orden', () => {
      const bp = mk();
      const a = buildSolidBitmapPdu(0, 0, 8, 8, 0x1111);    // 0..7
      const b = buildSolidBitmapPdu(100, 100, 8, 8, 0x2222); // zona distinta
      const c = buildSolidBitmapPdu(0, 0, 8, 8, 0x3333);    // tapa a
      assert.equal(bp.shouldShedBitmap(5000, a), true);
      assert.equal(bp.shouldShedBitmap(5000, b), true);
      assert.equal(bp.shouldShedBitmap(5000, c), true);
      const out = bp.takePendingIfDrained(0, { force: true, ignoreBudget: true });
      assert.deepEqual(out, [b, c]);
    });

    it('un rect mayor posterior tapa a los menores contenidos', () => {
      const bp = mk();
      const small = buildSolidBitmapPdu(10, 10, 4, 4, 0x1111);
      const big = buildSolidBitmapPdu(0, 0, 32, 32, 0x2222);
      bp.shouldShedBitmap(5000, small);
      bp.shouldShedBitmap(5000, big);
      assert.deepEqual(bp.takePendingIfDrained(0, { force: true, ignoreBudget: true }), [big]);
    });

    it('un rect menor posterior NO tapa al mayor anterior', () => {
      const bp = mk();
      const big = buildSolidBitmapPdu(0, 0, 32, 32, 0x2222);
      const small = buildSolidBitmapPdu(10, 10, 4, 4, 0x1111);
      bp.shouldShedBitmap(5000, big);
      bp.shouldShedBitmap(5000, small);
      assert.deepEqual(bp.takePendingIfDrained(0, { force: true, ignoreBudget: true }), [big, small]);
    });

    it('con pendientes, un bitmap nuevo no adelanta aunque la cola este baja', () => {
      const bp = mk();
      const a = buildSolidBitmapPdu(0, 0, 8, 8, 0x1111);
      const b = buildSolidBitmapPdu(50, 50, 8, 8, 0x2222);
      assert.equal(bp.shouldShedBitmap(5000, a), true);
      // cola ya baja (entre low y high) pero a sigue pendiente: b debe ir detras
      assert.equal(bp.shouldShedBitmap(500, b), true);
      assert.deepEqual(bp.takePendingIfDrained(0, { force: true, ignoreBudget: true }), [a, b]);
      // sin pendientes vuelve a pasar directo
      assert.equal(bp.shouldShedBitmap(500, b), false);
    });

    it('frames graficos no-bitmap obligan a vaciar antes; el puntero no', () => {
      const bp = mk();
      const a = buildSolidBitmapPdu(0, 0, 8, 8);
      const orders = Buffer.from([0x00, 0x06, 0x00, 0x03, 0x00, 0x00]);
      const pointer = Buffer.from([0x00, 0x06, 0x08, 0x03, 0x00, 0x00]);
      assert.equal(bp.mustFlushBefore(orders), false); // nada pendiente
      bp.shouldShedBitmap(5000, a);
      assert.equal(bp.mustFlushBefore(orders), true);
      assert.equal(bp.mustFlushBefore(pointer), false);
      assert.equal(bp.mustFlushBefore(buildSolidBitmapPdu(1, 1, 4, 4)), false);
    });

    it('desborda por numero de frames: pendingOverflow pide vaciar', () => {
      const bp = mk();
      assert.equal(bp.pendingOverflow(), false);
      for (let i = 0; i < 30; i++) {
        // rects disjuntos: ninguno tapa a otro
        bp.shouldShedBitmap(5000, buildSolidBitmapPdu(i * 10, 0, 4, 4, i));
      }
      assert.equal(bp.hasPending(), true);
      assert.equal(bp.pendingOverflow(), true);
      const out = bp.takePendingIfDrained(0, { force: true, ignoreBudget: true });
      assert.equal(out.length, 30);
      assert.equal(bp.hasPending(), false);
      assert.equal(bp.pendingOverflow(), false);
    });
  });

  it('frames nulos no lanzan ni se descartan (regresion ready.length)', () => {
    const bp = new WsBackpressureController({ bastion: true, highWater: 10, lowWater: 1 });
    assert.equal(bp.shouldShedBitmap(5000, null), false);
    assert.equal(bp.shouldShedBitmap(5000, undefined), false);
    assert.equal(isFastPathBitmapFrame(null), false);
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

describe('WsTickBatcher', () => {
  const { WsTickBatcher } = require('../../src/main/services/rdp-bridge-backpressure');

  it('junta en orden todo lo de un tick en un solo mensaje', () => {
    const b = new WsTickBatcher(true);
    assert.equal(b.push(Buffer.from([9])), false); // sin begin no acumula
    b.begin();
    assert.equal(b.active, true);
    assert.equal(b.push(Buffer.from([1, 2])), true);
    assert.equal(b.push(Buffer.from([3])), true);
    assert.deepEqual(b.take(), Buffer.from([1, 2, 3]));
    assert.equal(b.active, false);
    assert.equal(b.take(), null);
  });

  it('un unico buffer se devuelve tal cual (sin copia) y vacio -> null', () => {
    const b = new WsTickBatcher(true);
    const one = Buffer.from([7, 7]);
    b.begin();
    b.push(one);
    assert.equal(b.take(), one);
    b.begin();
    assert.equal(b.take(), null);
  });

  it('desactivado (kill-switch): nunca acumula', () => {
    const b = new WsTickBatcher(false);
    b.begin();
    assert.equal(b.active, false);
    assert.equal(b.push(Buffer.from([1])), false);
    assert.equal(b.take(), null);
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

describe('metricas input->update y clasificacion Fast-Path', () => {
  it('classifyFastPathUpdate distingue BITMAP / SURFACE_CMDS / POINTER', () => {
    const bmp = buildSolidBitmapPdu(0, 0, 4, 4);
    assert.equal(classifyFastPathUpdate(bmp), 'BITMAP');
    assert.equal(classifyFastPathUpdate(Buffer.from([0x00, 0x08, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00])), 'SURFACE_CMDS');
    assert.equal(classifyFastPathUpdate(Buffer.from([0x00, 0x08, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00])), 'POINTER');
    assert.equal(classifyFastPathUpdate(Buffer.from([0x03, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00])), null);
  });

  it('mide la latencia desde el input mas antiguo hasta el siguiente update grafico', () => {
    const m = new BridgeLatencyMetrics();
    m.noteInput(1000);
    m.noteInput(1010); // no pisa el mas antiguo
    m.noteUpdate('POINTER', 10, 1020); // no cierra la medicion
    m.noteUpdate('BITMAP', 500, 1040);
    const s = m.summary();
    assert.equal(s.inputToUpdateCount, 1);
    assert.equal(s.inputToUpdateP50Ms, 40);
    assert.equal(s.updateBytesByKind.BITMAP, 500);
    assert.match(m.formatLine(), /in->upd n=1 p50=40ms/);
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
