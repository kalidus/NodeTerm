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

    // Al ser asíncrono, en el mismo tick aún no debe haber enviado nada
    assert.strictEqual(sender.calls.length, 0);

    // Esperar a que la ventana de micro-batch expire
    await new Promise((resolve) => setTimeout(resolve, 25));

    // Debe haber emitido exactamente 1 llamada IPC con el texto acumulado
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

    // Al superar 100 bytes (50 + 60 = 110), debe disparar flush inmediato síncrono
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

    // Llamamos flush explícito
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
});
