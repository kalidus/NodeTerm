'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { bastionHopMaxFrames } = require('../../src/main/services/RdpNativeBridgeService');

describe('bastionHopMaxFrames', () => {
  it('hop con N>1: presupuesto completo (64)', () => {
    assert.equal(bastionHopMaxFrames(2, true), 64);
    assert.equal(bastionHopMaxFrames(3, true), 64);
  });

  it('post-hop con N>1: tope fairness (8)', () => {
    assert.equal(bastionHopMaxFrames(2, false), 8);
    assert.equal(bastionHopMaxFrames(5, false), 8);
  });

  it('N=1: siempre 64 (hop o post-hop)', () => {
    assert.equal(bastionHopMaxFrames(1, true), 64);
    assert.equal(bastionHopMaxFrames(1, false), 64);
    assert.equal(bastionHopMaxFrames(0, true), 64);
    assert.equal(bastionHopMaxFrames(0, false), 64);
  });
});
