const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  DETACH_NUDGE_PX,
  pointerLeftWindow,
  resolveDetachPoint
} = require('../../src/utils/tabDragExit');

const view = { width: 800, height: 600 };

describe('pointerLeftWindow', () => {
  it('ignora el movimiento entre pestañas', () => {
    const exit = pointerLeftWindow({
      relatedTarget: {},
      clientX: -20,
      clientY: 10
    }, view);
    assert.strictEqual(exit, null);
  });

  it('ignora un punto dentro del viewport aunque relatedTarget sea null', () => {
    const exit = pointerLeftWindow({ relatedTarget: null, clientX: 40, clientY: 20 }, view);
    assert.strictEqual(exit, null);
  });

  it('marca el borde superior', () => {
    const exit = pointerLeftWindow({ relatedTarget: null, clientX: 120, clientY: 0 }, view);
    assert.deepStrictEqual(exit, { edge: 'top', clientX: 120, clientY: 0 });
  });

  it('marca el borde derecho cuando el puntero lo rebasa', () => {
    const exit = pointerLeftWindow({ relatedTarget: null, clientX: 840, clientY: 200 }, view);
    assert.strictEqual(exit.edge, 'right');
  });

  it('en una esquina se queda con el desborde mayor', () => {
    const exit = pointerLeftWindow({ relatedTarget: null, clientX: -4, clientY: -30 }, view);
    assert.strictEqual(exit.edge, 'top');
  });

  it('rechaza un viewport inválido', () => {
    assert.strictEqual(pointerLeftWindow({ relatedTarget: null, clientX: 0, clientY: 0 }, null), null);
  });
});

describe('resolveDetachPoint', () => {
  const bounds = { x: 100, y: 80, width: 900, height: 700 };

  it('usa el cursor global si ya está fuera de la ventana', () => {
    const point = resolveDetachPoint(bounds, { x: 40, y: 90 }, {
      edge: 'top',
      clientX: 10,
      clientY: 0
    });
    assert.deepStrictEqual(point, { x: 40, y: 90 });
  });

  it('empuja por encima del borde superior si el cursor sigue dentro', () => {
    const point = resolveDetachPoint(bounds, { x: 200, y: 100 }, {
      edge: 'top',
      clientX: 180,
      clientY: 0
    });
    assert.deepStrictEqual(point, { x: 280, y: 80 - DETACH_NUDGE_PX });
  });

  it('empuja a la derecha del borde derecho', () => {
    const point = resolveDetachPoint(bounds, { x: 150, y: 120 }, {
      edge: 'right',
      clientX: 900,
      clientY: 40
    });
    assert.deepStrictEqual(point, {
      x: 100 + 900 + DETACH_NUDGE_PX,
      y: 120
    });
  });
});
