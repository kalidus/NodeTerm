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
    const tl = new SessionTimeline({
      now: clock.now,
      log: (l) => lines.push(l),
      verboseTraffic: true
    });
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

  it('quiet: trafico sano no imprime linea in/out', () => {
    const clock = makeClock();
    const lines = [];
    const tl = new SessionTimeline({ now: clock.now, log: (l) => lines.push(l) });
    tl.mark('first-frame');
    tl.noteIn('fp', 4000);
    tl.noteOut('input', 10);
    clock.advance(1000);
    tl.tick();
    assert.equal(lines.length, 1);
    assert.match(lines[0], /first-frame/);
    assert.ok(!lines.some((l) => /in: fp=/.test(l)));
  });

  it('quiet: imprime trafico si hay cola pendiente', () => {
    const clock = makeClock();
    const lines = [];
    const tl = new SessionTimeline({
      now: clock.now,
      log: (l) => lines.push(l),
      getExtra: undefined
    });
    tl.start(() => ({ pending: 2, buffered: 0 }));
    tl.mark('first-frame');
    tl.noteIn('fp', 100);
    clock.advance(1000);
    tl.tick();
    tl.stop();
    assert.ok(lines.some((l) => /in: fp=1\/100B/.test(l) && /pend=2/.test(l)));
  });

  it('silencio verbose: 1s, 5s y multiplos de 15', () => {
    assert.equal(shouldLogSilence(1), true);
    assert.equal(shouldLogSilence(5), true);
    assert.equal(shouldLogSilence(2), false);
    assert.equal(shouldLogSilence(10), false);
    assert.equal(shouldLogSilence(15), true);
    assert.equal(shouldLogSilence(30), true);
    assert.equal(shouldLogSilence(16), false);
  });

  it('silencio quiet: solo 5s y multiplos de 15', () => {
    assert.equal(shouldLogSilence(1, { quiet: true }), false);
    assert.equal(shouldLogSilence(5, { quiet: true }), true);
    assert.equal(shouldLogSilence(10, { quiet: true }), false);
    assert.equal(shouldLogSilence(15, { quiet: true }), true);
    assert.equal(shouldLogSilence(30, { quiet: true }), true);
  });

  it('input-only se trata como silencio (no linea de trafico)', () => {
    const clock = makeClock();
    const lines = [];
    const tl = new SessionTimeline({
      now: clock.now,
      log: (l) => lines.push(l),
      verboseTraffic: true
    });
    tl.mark('first-frame');
    tl.noteOut('input', 234);
    clock.advance(1000);
    tl.tick();
    assert.match(lines[lines.length - 1], /silencio 1s/);
    assert.ok(!/in: fp=/.test(lines[lines.length - 1]));
  });

  it('quiet: input-only no loguea silencio a 1s; si a 5s', () => {
    const clock = makeClock();
    const lines = [];
    const tl = new SessionTimeline({ now: clock.now, log: (l) => lines.push(l) });
    tl.mark('first-frame');
    for (let i = 0; i < 5; i++) {
      tl.noteOut('input', 10);
      clock.advance(1000);
      tl.tick();
    }
    assert.ok(!lines.some((l) => /silencio 1s/.test(l)));
    assert.ok(lines.some((l) => /silencio 5s/.test(l)));
  });

  it('setLabel cambia el prefijo de las lineas', () => {
    const clock = makeClock();
    const lines = [];
    const tl = new SessionTimeline({
      now: clock.now,
      log: (l) => lines.push(l),
      label: 'n/a',
      verboseTraffic: true
    });
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

  it('resumen incluye hitos de salto banner y caps sin CREATE', () => {
    const clock = makeClock();
    const tl = new SessionTimeline({ now: clock.now, log: () => {} });
    tl.mark('first-bitmap');
    clock.advance(500);
    tl.mark('banner-bitmaps-dropped', '2 reason=DEMAND_ACTIVE');
    clock.advance(3000);
    tl.mark('dvc-caps-hacia-wasm');
    clock.advance(5000);
    tl.mark('egfx-caps-no-create', 'pend=0');
    const s = tl.summary();
    assert.match(s, /banner-bitmaps-dropped=\+500ms/);
    assert.match(s, /dvc-caps-hacia-wasm=\+3500ms/);
    assert.match(s, /egfx-caps-no-create=\+8500ms/);
    assert.ok(!/egfx-graphics-create=/.test(s));
  });

  it('silence-start a idle 5s tras first-bitmap; resume una vez con gap', () => {
    const clock = makeClock();
    const lines = [];
    const tl = new SessionTimeline({ now: clock.now, log: (l) => lines.push(l) });
    tl.mark('first-frame');
    clock.advance(100);
    tl.mark('first-bitmap');
    for (let i = 0; i < 5; i++) {
      clock.advance(1000);
      tl.tick();
    }
    assert.equal(tl.has('post-banner-silence-start'), true);
    assert.ok(lines.some((l) => /esperando Session Probe Wallix/.test(l)));
    clock.advance(2000);
    tl.noteIn('fp', 500);
    assert.equal(tl.has('desktop-fp-resume'), true);
    assert.match(
      lines.find((l) => /desktop-fp-resume/.test(l)) || '',
      /gapBanner→desktop=/
    );
    clock.advance(100);
    tl.noteIn('fp', 100);
    assert.equal(
      lines.filter((l) => /desktop-fp-resume/.test(l)).length,
      1,
      'resume una sola vez'
    );
  });
});
