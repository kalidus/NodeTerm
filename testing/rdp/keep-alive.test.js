const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  RDP_KEEP_ALIVE_INTERVAL_MS,
  RDP_KEEP_ALIVE_IDLE_MS,
  planRdpKeepAlive
} = require('../../src/utils/rdpKeepAlive');

describe('planRdpKeepAlive', () => {
  test('espera 15s de inactividad y el timer va a 10s', () => {
    assert.equal(RDP_KEEP_ALIVE_IDLE_MS, 15000);
    assert.equal(RDP_KEEP_ALIVE_INTERVAL_MS, 10000);
    assert.equal(planRdpKeepAlive({ idleMs: 14999, x: 40, y: 20 }), null);
    const plan = planRdpKeepAlive({ idleMs: 15000, x: 40, y: 20 });
    assert.deepEqual(plan.points, [
      { x: 39, y: 20 },
      { x: 40, y: 20 }
    ]);
  });

  test('en x=0 el nudge entra en pantalla y vuelve', () => {
    const plan = planRdpKeepAlive({ idleMs: 20000, x: 0, y: 0 });
    assert.deepEqual(plan.points, [
      { x: 1, y: 0 },
      { x: 0, y: 0 }
    ]);
  });

  test('sin posición conocida usa 1,1', () => {
    const plan = planRdpKeepAlive({ idleMs: 20000 });
    assert.deepEqual(plan.points, [
      { x: 0, y: 1 },
      { x: 1, y: 1 }
    ]);
  });

  test('no mueve el cursor con el botón pulsado ni durante una transferencia', () => {
    assert.equal(planRdpKeepAlive({ idleMs: 60000, x: 8, y: 8, pointerDown: true }), null);
    assert.equal(planRdpKeepAlive({ idleMs: 60000, x: 8, y: 8, fileTransferArmed: true }), null);
  });

  test('trunca coordenadas y descarta idle inválido', () => {
    const plan = planRdpKeepAlive({ idleMs: 16000, x: 10.9, y: -4 });
    assert.deepEqual(plan.points, [
      { x: 9, y: 0 },
      { x: 10, y: 0 }
    ]);
    assert.equal(planRdpKeepAlive({ idleMs: Number.NaN, x: 3, y: 3 }), null);
  });
});
