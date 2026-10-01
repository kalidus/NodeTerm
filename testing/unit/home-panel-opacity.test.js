const { describe, it } = require('node:test');
const assert = require('node:assert');

function loadModule() {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '../../src/utils/homePanelOpacity.js'), 'utf8');
  const wrapped = src
    .replace(/export function /g, 'function ')
    .replace(/export \{[^}]+\};?/g, '')
    + '\nmodule.exports = { parseColorRgb, resolveHomePanelBaseColor, mapHomePanelOpacity, adjustOpacity, homePanelSurface };';
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  const fn = new Function('module', 'exports', wrapped);
  fn(module, module.exports);
  return module.exports;
}

const {
  parseColorRgb,
  resolveHomePanelBaseColor,
  mapHomePanelOpacity,
  adjustOpacity,
  homePanelSurface
} = loadModule();

describe('home panel opacity', () => {
  it('ignora transparent y usa el siguiente color', () => {
    const color = resolveHomePanelBaseColor('transparent', 'radial-gradient(circle at 20% 20%, #1a2840 0%, #0a1420 70%)');
    assert.strictEqual(color, 'rgb(26, 40, 64)');
  });

  it('mapea el slider con curva ease-out', () => {
    assert.ok(mapHomePanelOpacity(0.5) > 0.7);
    assert.ok(mapHomePanelOpacity(0.59) > 0.8);
    assert.ok(mapHomePanelOpacity(0.05) < 0.15);
    assert.strictEqual(mapHomePanelOpacity(1), 1);
  });

  it('aplica alpha a rgb y hex', () => {
    assert.strictEqual(adjustOpacity('#0d1117', 0.5), 'rgba(13, 17, 23, 0.5)');
    assert.strictEqual(adjustOpacity('rgb(10, 15, 25)', 0.4), 'rgba(10, 15, 25, 0.4)');
    assert.ok(adjustOpacity('transparent', 0.5).startsWith('rgba('));
  });

  it('genera superficie con fallback si el color no sirve', () => {
    const surface = homePanelSurface(['transparent', '#1a2840'], 1);
    assert.strictEqual(surface, 'rgba(26, 40, 64, 1)');
  });

  it('parsea hex corto', () => {
    assert.deepStrictEqual(parseColorRgb('#abc'), { r: 170, g: 187, b: 204 });
  });
});
