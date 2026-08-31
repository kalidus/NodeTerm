'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseResolutionValue,
  resolveRdpScreenDimensions,
  buildRdpPresetFormPatch,
  normalizeRdpColorDepth
} = require('../../src/utils/rdpScreenConfig');

test('parseResolutionValue', async (t) => {
  await t.test('parsea resoluciones validas WxH', () => {
    assert.deepEqual(parseResolutionValue('1920x1080'), { width: 1920, height: 1080 });
    assert.deepEqual(parseResolutionValue('1024x768'), { width: 1024, height: 768 });
    assert.deepEqual(parseResolutionValue(' 1280 x 800 '), { width: 1280, height: 800 });
  });

  await t.test('devuelve null para fullscreen o valores invalidos', () => {
    assert.equal(parseResolutionValue('fullscreen'), null);
    assert.equal(parseResolutionValue(''), null);
    assert.equal(parseResolutionValue(null), null);
    assert.equal(parseResolutionValue('invalido'), null);
    assert.equal(parseResolutionValue('0x0'), null);
  });
});

test('resolveRdpScreenDimensions', async (t) => {
  await t.test('respeta resolucion fija con autoResize: false', () => {
    const res = resolveRdpScreenDimensions(
      { resolution: '1024x768', autoResize: false },
      { width: 1920, height: 1080 }
    );
    assert.equal(res.width, 1024);
    assert.equal(res.height, 768);
    assert.equal(res.resolution, '1024x768');
    assert.equal(res.fullscreen, false);
  });

  await t.test('ajuste automatico autoResize: true usa dimensiones completas del viewport', () => {
    const res = resolveRdpScreenDimensions(
      { resolution: '1920x1080', autoResize: true },
      { width: 1600, height: 900 }
    );
    assert.equal(res.width, 1600);
    assert.equal(res.height, 900);
    assert.equal(res.fullscreen, false);
  });

  await t.test('fullscreen solicita dimensiones del viewport con flag fullscreen', () => {
    const res = resolveRdpScreenDimensions(
      { resolution: 'fullscreen' },
      { width: 1920, height: 1080 }
    );
    assert.equal(res.width, 1920);
    assert.equal(res.height, 1080);
    assert.equal(res.fullscreen, true);
  });
});

test('normalizeRdpColorDepth', async (t) => {
  await t.test('normaliza profundidades de color validas e invalidas', () => {
    assert.equal(normalizeRdpColorDepth(32), 32);
    assert.equal(normalizeRdpColorDepth('24'), 24);
    assert.equal(normalizeRdpColorDepth('16'), 16);
    assert.equal(normalizeRdpColorDepth(8, 32), 32);
    assert.equal(normalizeRdpColorDepth(null, 32), 32);
  });
});
