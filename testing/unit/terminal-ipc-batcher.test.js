const { describe, it } = require('node:test');
const assert = require('node:assert');

const { TerminalIpcBatcher } = require('../../src/main/services/TerminalIpcBatcher');

function makeMockSender() {
  const calls = [];
  return {
    calls,
    isDestroyed: () => false,
    isCrashed: () => false,
    mainFrame: { isDestroyed: () => false },
    send(eventName, payload) {
      calls.push({ eventName, payload });
    }
  };
}

describe('TerminalIpcBatcher - Micro-batching de Salida de Terminal', () => {
  it('agrupa múltiples llamadas de datos en un solo mensaje IPC tras la ventana temporal', async () => {
    const batcher = new TerminalIpcBatcher({ batchDelayMs: 10 });
    const sender = makeMockSender();

    batcher.send(sender, 'ssh:data:tab-1', 'line 1\n');
    batcher.send(sender, 'ssh:data:tab-1', 'line 2\n');
    batcher.send(sender, 'ssh:data:tab-1', 'line 3\n');

    assert.strictEqual(sender.calls.length, 0);

    await new Promise((resolve) => setTimeout(resolve, 25));

    assert.strictEqual(sender.calls.length, 1);
    assert.strictEqual(sender.calls[0].eventName, 'ssh:data:tab-1');
    assert.strictEqual(sender.calls[0].payload, 'line 1\nline 2\nline 3\n');
  });

  it('hace flush inmediato cuando los datos superan maxBufferSize sin esperar al temporizador', () => {
    const batcher = new TerminalIpcBatcher({ batchDelayMs: 50, maxBufferSize: 100 });
    const sender = makeMockSender();

    const chunk50 = 'a'.repeat(50);
    batcher.send(sender, 'wsl:data:tab-2', chunk50);
    assert.strictEqual(sender.calls.length, 0);

    const chunk60 = 'b'.repeat(60);
    batcher.send(sender, 'wsl:data:tab-2', chunk60);

    assert.strictEqual(sender.calls.length, 1);
    assert.strictEqual(sender.calls[0].eventName, 'wsl:data:tab-2');
    assert.strictEqual(sender.calls[0].payload.length, 110);
  });

  it('flush explícito envía datos pendientes de inmediato antes de cerrar o desconectar', () => {
    const batcher = new TerminalIpcBatcher({ batchDelayMs: 100 });
    const sender = makeMockSender();

    batcher.send(sender, 'powershell:data:tab-3', 'mensaje final antes de exit');
    assert.strictEqual(sender.calls.length, 0);

    batcher.flush('powershell:data:tab-3');

    assert.strictEqual(sender.calls.length, 1);
    assert.strictEqual(sender.calls[0].payload, 'mensaje final antes de exit');
    assert.strictEqual(batcher.hasPending('powershell:data:tab-3'), false);
  });

  it('clear descarta los datos y cancela el timer sin emitir IPC (tab cerrada/destruida)', async () => {
    const batcher = new TerminalIpcBatcher({ batchDelayMs: 10 });
    const sender = makeMockSender();

    batcher.send(sender, 'ubuntu:data:tab-4', 'datos que deben descartarse');
    batcher.clear('ubuntu:data:tab-4');

    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.strictEqual(sender.calls.length, 0);
    assert.strictEqual(batcher.hasPending('ubuntu:data:tab-4'), false);
  });

  it('mantiene canales independientes aislados sin mezclar datos', async () => {
    const batcher = new TerminalIpcBatcher({ batchDelayMs: 10 });
    const sender = makeMockSender();

    batcher.send(sender, 'ssh:data:tab-A', 'data A');
    batcher.send(sender, 'ssh:data:tab-B', 'data B');

    await new Promise((resolve) => setTimeout(resolve, 25));

    assert.strictEqual(sender.calls.length, 2);
    const callA = sender.calls.find(c => c.eventName === 'ssh:data:tab-A');
    const callB = sender.calls.find(c => c.eventName === 'ssh:data:tab-B');

    assert.ok(callA);
    assert.strictEqual(callA.payload, 'data A');
    assert.ok(callB);
    assert.strictEqual(callB.payload, 'data B');
  });

  it('recompone un emoji UTF-8 partido en dos Buffer sin caracteres rotos', async () => {
    const batcher = new TerminalIpcBatcher({ batchDelayMs: 10 });
    const sender = makeMockSender();
    const emoji = Buffer.from([0xf0, 0x9f, 0x98, 0x80]);
    batcher.send(sender, 'ssh:data:tab-utf8', emoji.subarray(0, 2));
    batcher.send(sender, 'ssh:data:tab-utf8', emoji.subarray(2));

    await new Promise((resolve) => setTimeout(resolve, 25));

    assert.strictEqual(sender.calls.length, 1);
    assert.strictEqual(sender.calls[0].payload, '😀');
  });

  it('aplaza bytes UTF-8 incompletos al siguiente flush (StringDecoder)', () => {
    const batcher = new TerminalIpcBatcher({ batchDelayMs: 50, maxBufferSize: 2 });
    const sender = makeMockSender();
    batcher.send(sender, 'ssh:data:tab-utf8b', Buffer.from([0xf0, 0x9f]));
    assert.strictEqual(sender.calls.length, 0);
    batcher.send(sender, 'ssh:data:tab-utf8b', Buffer.from([0x98, 0x80]));
    batcher.flush('ssh:data:tab-utf8b');
    assert.strictEqual(sender.calls.length, 1);
    assert.strictEqual(sender.calls[0].payload, '😀');
  });

  it('no rompe ñ cuando el flush corta tras el lead C3', () => {
    const prefix = Buffer.from('línea-', 'utf8');
    const leadOnly = Buffer.concat([prefix, Buffer.from([0xc3])]);
    // Tras decode, solo queda 'línea-' encolado (C3 vive en el StringDecoder)
    const batcher = new TerminalIpcBatcher({
      batchDelayMs: 50,
      maxBufferSize: Buffer.byteLength('línea-', 'utf8')
    });
    const sender = makeMockSender();
    batcher.send(sender, 'ssh:data:tab-n', leadOnly);
    assert.strictEqual(sender.calls.length, 1);
    assert.strictEqual(sender.calls[0].payload, 'línea-');
    assert.ok(!sender.calls[0].payload.includes('\uFFFD'));

    batcher.send(sender, 'ssh:data:tab-n', Buffer.from([0xb1]));
    batcher.flush('ssh:data:tab-n');
    assert.strictEqual(sender.calls.length, 2);
    assert.strictEqual(sender.calls[1].payload, 'ñ');
  });

  it('aplaza € y 中 partidos entre flushes', () => {
    const batcher = new TerminalIpcBatcher({ batchDelayMs: 50, maxBufferSize: 2 });
    const sender = makeMockSender();
    batcher.send(sender, 'ssh:data:tab-euro', Buffer.from([0xe2, 0x82]));
    assert.strictEqual(sender.calls.length, 0);
    batcher.send(sender, 'ssh:data:tab-euro', Buffer.from([0xac]));
    batcher.flush('ssh:data:tab-euro');
    assert.strictEqual(sender.calls[0].payload, '€');

    const sender2 = makeMockSender();
    const batcher2 = new TerminalIpcBatcher({ batchDelayMs: 50, maxBufferSize: 1 });
    batcher2.send(sender2, 'ssh:data:tab-zh', Buffer.from([0xe4]));
    assert.strictEqual(sender2.calls.length, 0);
    batcher2.send(sender2, 'ssh:data:tab-zh', Buffer.from([0xb8, 0xad]));
    batcher2.flush('ssh:data:tab-zh');
    assert.strictEqual(sender2.calls.length, 1);
    assert.strictEqual(sender2.calls[0].payload, '中');
  });

  it('sobrevive al reuso/mutación del Buffer del pool estilo ssh2 (decode inmediato)', () => {
    const batcher = new TerminalIpcBatcher({ batchDelayMs: 50, maxBufferSize: 64 * 1024 });
    const sender = makeMockSender();
    const line = Buffer.from('línea-ñ-€-中\n', 'utf8');

    // Sin Buffer.from previo: el mismo Buffer se entrega y se sobrescribe tras send()
    const pooled = Buffer.allocUnsafe(line.length);
    line.copy(pooled);
    batcher.send(sender, 'ssh:data:tab-pool', pooled);
    pooled.fill(0x41);

    batcher.flush('ssh:data:tab-pool');
    assert.strictEqual(sender.calls.length, 1);
    assert.strictEqual(sender.calls[0].payload, 'línea-ñ-€-中\n');
    assert.ok(!sender.calls[0].payload.includes('\uFFFD'));
  });

  it('sobrevive si el pool se muta entre dos send del mismo tick', () => {
    const batcher = new TerminalIpcBatcher({ batchDelayMs: 50 });
    const sender = makeMockSender();
    const pooled = Buffer.allocUnsafe(16);

    const part1 = Buffer.from('línea-ñ', 'utf8');
    part1.copy(pooled);
    batcher.send(sender, 'ssh:data:tab-pool2', pooled.subarray(0, part1.length));
    pooled.fill(0xff);

    const part2 = Buffer.from('-€-中\n', 'utf8');
    part2.copy(pooled);
    batcher.send(sender, 'ssh:data:tab-pool2', pooled.subarray(0, part2.length));
    pooled.fill(0x00);

    batcher.flush('ssh:data:tab-pool2');
    assert.strictEqual(sender.calls[0].payload, 'línea-ñ-€-中\n');
    assert.ok(!sender.calls[0].payload.includes('\uFFFD'));
  });

  it('mantiene línea-ñ-€-中 intacta con chunks de 1 byte y flushes intercalados', () => {
    const sample = Buffer.from('línea-ñ-€-中\n', 'utf8');
    const batcher = new TerminalIpcBatcher({ batchDelayMs: 9999, maxBufferSize: 7 });
    const sender = makeMockSender();
    for (let i = 0; i < 30; i++) {
      for (let off = 0; off < sample.length; off++) {
        batcher.send(sender, 'ssh:data:tab-fuzz', sample.subarray(off, off + 1));
      }
    }
    batcher.flush('ssh:data:tab-fuzz', { final: true });
    const all = sender.calls.map((c) => c.payload).join('');
    assert.ok(!all.includes('\uFFFD'), `FFFD in payload: ${JSON.stringify(all.slice(0, 80))}`);
    assert.ok(all.includes('ñ'));
    assert.ok(all.includes('€'));
    assert.ok(all.includes('中'));
    assert.strictEqual(all.split('\n').filter((l) => l === 'línea-ñ-€-中').length, 30);
  });
});
