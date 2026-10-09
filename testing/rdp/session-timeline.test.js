'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { SessionTimeline, shouldLogSilence } = require('../../src/main/services/rdp-session-timeline');

function makeClock(start = 1000) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

describe('SessionTimeline', () => {
  it('deshabilitado no registra ni imprime nada', () => {
    const lines = [];
    const tl = new SessionTimeline({ enabled: false, log: (l) => lines.push(l) });
    tl.mark('first-frame');
    tl.event('x');
    tl.noteIn('fp', 10);
    tl.tick();
    assert.deepEqual(lines, []);
    assert.equal(tl.summary(), '');
  });

  it('mark es unico y usa tiempo relativo', () => {
    const clock = makeClock();
    const lines = [];
    const tl = new SessionTimeline({ now: clock.now, log: (l) => lines.push(l) });
    clock.advance(250);
    assert.equal(tl.mark('first-frame', '#1'), true);
    clock.advance(100);
    assert.equal(tl.mark('first-frame', '#2'), false);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /\+250ms\] first-frame #1/);
  });

  it('tick resume entrada y salida por tipo y los reinicia', () => {
    const clock = makeClock();
    const lines = [];
    const tl = new SessionTimeline({ now: clock.now, log: (l) => lines.push(l) });
    tl.start(() => ({ pending: 3, buffered: 2048 }));
    tl.mark('first-frame');
    tl.noteIn('fp', 4000);
    tl.noteIn('dvc', 1600);
    tl.noteIn('dvc', 1600);
    tl.noteOut('dvc', 40);
    clock.advance(1000);
    tl.tick();
    tl.stop();
    const line = lines[lines.length - 1];
    assert.match(line, /in: fp=1\/3\.9KB dvc=2\/3\.1KB/);
    assert.match(line, /out: dvc=1\/40B/);
    assert.match(line, /pend=3 ws=2\.0KB/);
    clock.advance(1000);
    tl.tick();
    assert.match(lines[lines.length - 1], /silencio 1s/);
  });

  it('silencio solo en 1s, 5s y multiplos de 15', () => {
    assert.equal(shouldLogSilence(1), true);
    assert.equal(shouldLogSilence(5), true);
    assert.equal(shouldLogSilence(2), false);
    assert.equal(shouldLogSilence(10), false);
    assert.equal(shouldLogSilence(15), true);
    assert.equal(shouldLogSilence(30), true);
    assert.equal(shouldLogSilence(16), false);
  });

  it('input-only se trata como silencio (no linea de trafico)', () => {
    const clock = makeClock();
    const lines = [];
    const tl = new SessionTimeline({ now: clock.now, log: (l) => lines.push(l) });
    tl.mark('first-frame');
    tl.noteOut('input', 234);
    clock.advance(1000);
    tl.tick();
    assert.match(lines[lines.length - 1], /silencio 1s/);
    assert.ok(!/in: fp=/.test(lines[lines.length - 1]));
  });

  it('setLabel cambia el prefijo de las lineas', () => {
    const clock = makeClock();
    const lines = [];
    const tl = new SessionTimeline({ now: clock.now, log: (l) => lines.push(l), label: 'n/a' });
    tl.mark('first-frame');
    assert.match(lines[0], /\[Timeline n\/a \+/);
    tl.setLabel('RDP');
    tl.noteIn('fp', 10);
    clock.advance(1000);
    tl.tick();
    assert.match(lines[lines.length - 1], /\[Timeline RDP \+/);
  });

  it('marca LAG del event loop cuando el tick llega tarde', () => {
    const clock = makeClock();
    const lines = [];
    const tl = new SessionTimeline({ now: clock.now, log: (l) => lines.push(l) });
    tl.mark('first-frame');
    tl.noteIn('fp', 10);
    clock.advance(1900);
    tl.tick();
    assert.match(lines[lines.length - 1], /LAG event-loop 900ms/);
  });

  it('resumen incluye totales, hitos y edad del ultimo dato', () => {
    const clock = makeClock();
    const tl = new SessionTimeline({ now: clock.now, log: () => {} });
    tl.mark('first-frame');
    tl.noteIn('fp', 100);
    tl.noteOut('input', 5);
    clock.advance(700);
    const s = tl.summary();
    assert.match(s, /in: fp=1\/100B/);
    assert.match(s, /out: dvc=0\/0B tpkt=0\/0B input=1\/5B/);
    assert.match(s, /ultimo dato servidor hace 700ms/);
    assert.match(s, /first-frame=\+0ms/);
  });
});
