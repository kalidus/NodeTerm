const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

describe('SshStatsStore Unit Tests', async () => {
  const { SshStatsStore } = await import('../../src/services/SshStatsStore.js');

  let store;

  beforeEach(() => {
    store = new SshStatsStore();
  });

  it('debe almacenar y recuperar estadísticas por tabId', () => {
    assert.strictEqual(store.getStats('tab-1'), null);

    const stats = { cpu: 12.5, mem: { used: 1024, total: 4096 } };
    store.setStats('tab-1', stats);

    assert.deepStrictEqual(store.getStats('tab-1'), stats);
    assert.strictEqual(store.getStats('tab-2'), null);
  });

  it('debe notificar únicamente al suscriptor del tabId correspondiente', () => {
    let tab1CallCount = 0;
    let tab2CallCount = 0;
    let tab1LastData = null;

    const unsub1 = store.subscribeTab('tab-1', (data) => {
      tab1CallCount++;
      tab1LastData = data;
    });

    const unsub2 = store.subscribeTab('tab-2', () => {
      tab2CallCount++;
    });

    store.setStats('tab-1', { cpu: 15 });

    assert.strictEqual(tab1CallCount, 1);
    assert.strictEqual(tab2CallCount, 0);
    assert.deepStrictEqual(tab1LastData, { cpu: 15 });

    unsub1();
    store.setStats('tab-1', { cpu: 20 });
    assert.strictEqual(tab1CallCount, 1, 'No debe notificar tras desuscribirse');

    unsub2();
  });

  it('debe limpiar estadísticas y oyentes con removeTab', () => {
    store.setStats('tab-1', { cpu: 5 });
    let called = false;
    store.subscribeTab('tab-1', () => { called = true; });

    store.removeTab('tab-1');
    assert.strictEqual(store.getStats('tab-1'), null);

    store.setStats('tab-1', { cpu: 10 });
    assert.strictEqual(called, false, 'Los oyentes eliminados no deben ejecutarse');
  });

  it('debe retornar snapshot completo con getAllStats', () => {
    store.setStats('tab-1', { cpu: 10 });
    store.setStats('tab-2', { cpu: 20 });

    const all = store.getAllStats();
    assert.deepStrictEqual(all, {
      'tab-1': { cpu: 10 },
      'tab-2': { cpu: 20 }
    });
  });
});
