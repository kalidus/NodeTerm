const { describe, it } = require('node:test');
const assert = require('node:assert');

const { TerminalStdoutRingBuffer } = require('../../src/main/services/TerminalStdoutRingBuffer');

describe('TerminalStdoutRingBuffer', () => {
  it('acumula stdout solo en hibernación y lo drena al despertar', () => {
    const ring = new TerminalStdoutRingBuffer({ maxBytes: 1024 });
    ring.setHibernating('tab-1', true);
    assert.strictEqual(ring.isHibernating('tab-1'), true);

    ring.push('tab-1', 'hello ');
    ring.push('tab-1', 'world');
    assert.strictEqual(ring.drain('tab-1'), 'hello world');
    assert.strictEqual(ring.isHibernating('tab-1'), false);
    assert.strictEqual(ring.drain('tab-1'), '');
  });

  it('recorta el ring cuando supera maxBytes', () => {
    const ring = new TerminalStdoutRingBuffer({ maxBytes: 20 });
    ring.setHibernating('t', true);
    ring.push('t', 'aaaaaaaaaa');
    ring.push('t', 'bbbbbbbbbb');
    ring.push('t', 'cccccccccc');
    const drained = ring.drain('t');
    assert.ok(drained.length <= 30);
    assert.ok(drained.includes('c'));
  });

  it('clear elimina hibernación y buffer', () => {
    const ring = new TerminalStdoutRingBuffer();
    ring.setHibernating('x', true);
    ring.push('x', 'data');
    ring.clear('x');
    assert.strictEqual(ring.isHibernating('x'), false);
    assert.strictEqual(ring.drain('x'), '');
  });
});
