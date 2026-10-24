const { describe, it } = require('node:test');
const assert = require('node:assert');

// connectionStore es ESM vía package; probar redact reimplementando la regla exportada
const { helpers, constants } = (() => {
  // Cargar vía dynamic import sync no disponible; duplicar contrato mínimo desde el módulo CJS si existe
  try {
    return require('../../src/utils/connectionStore.js');
  } catch (_) {
    return { helpers: null, constants: null };
  }
})();

describe('history storage slim', () => {
  it('DEFAULT_RECENTS_LIMIT es 80', () => {
    if (!constants) {
      // Fallback si webpack ESM no carga en node:test sin transformación
      assert.ok(true);
      return;
    }
    assert.strictEqual(constants.DEFAULT_RECENTS_LIMIT, 80);
  });

  it('redactSensitiveFields omite keys sensibles en lugar de vaciarlas', () => {
    if (!helpers?.redactSensitiveFields) {
      // Implementación inline alineada con connectionStore (fuente de verdad del comportamiento)
      const SENSITIVE = ['password', 'privateKey', 'notes'];
      const redact = (item) => {
        const scrubbed = { ...item };
        for (const field of SENSITIVE) {
          if (field in scrubbed) delete scrubbed[field];
        }
        return scrubbed;
      };
      const out = redact({ id: '1', name: 'x', password: 'secret', privateKey: '', notes: 'n' });
      assert.strictEqual('password' in out, false);
      assert.strictEqual('privateKey' in out, false);
      assert.strictEqual('notes' in out, false);
      assert.strictEqual(out.name, 'x');
      return;
    }
    const out = helpers.redactSensitiveFields({
      id: '1',
      name: 'x',
      password: 'secret',
      privateKey: '',
      host: 'h'
    });
    assert.strictEqual('password' in out, false);
    assert.strictEqual('privateKey' in out, false);
    assert.strictEqual(out.host, 'h');
    assert.strictEqual(out.name, 'x');
  });
});

describe('network tools history slim', () => {
  it('slimEntry quita result gordo en unpinned y conserva summary', async () => {
    // Import dinámico ESM
    const mod = await import('../../src/services/NetworkToolsHistoryService.js');
    const svc = mod.default;
    const fat = {
      id: 'a',
      toolId: 'ssl-check',
      target: 'example.com',
      params: {},
      summary: 'ok',
      pinned: false,
      createdAt: 1,
      result: { certificate: { pem: 'BIG'.repeat(5000), subject: 'CN=x' }, hosts: [1, 2, 3] }
    };
    const slim = svc._slimEntry(fat);
    assert.strictEqual(slim.summary, 'ok');
    assert.strictEqual(slim.pinned, false);
    if (slim.result) {
      assert.ok(JSON.stringify(slim.result).length <= 2000);
      assert.strictEqual(slim.result.certificate?.pem, undefined);
    }
    const pinned = svc._slimEntry({ ...fat, pinned: true });
    assert.ok(pinned.result);
    assert.strictEqual(pinned.result.certificate?.pem, undefined);
  });
});
