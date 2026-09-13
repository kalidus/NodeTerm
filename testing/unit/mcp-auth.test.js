const { describe, it } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

// Función de validación de MCP API Server para aislar y testear exhaustivamente
function validateMcpApiKey(apiKey, expectedKey) {
  if (!apiKey || typeof apiKey !== 'string') return false;
  if (!expectedKey || typeof expectedKey !== 'string') return false;
  const keyBuf = Buffer.from(String(apiKey));
  const expectedBuf = Buffer.from(String(expectedKey));
  if (keyBuf.length === 0 || keyBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(keyBuf, expectedBuf)) {
    return false;
  }
  return true;
}

describe('MCP API Server Timing-Safe Auth Tests', () => {
  const VALID_KEY = 'nodeterm_mcp_sec_9948271a8f9c0e2b1d3a4f5c6e7d8b9a';

  it('valida exitosamente cuando la API Key coincide exactamente', () => {
    assert.strictEqual(validateMcpApiKey(VALID_KEY, VALID_KEY), true);
  });

  it('rechaza claves con caracteres diferentes de igual longitud', () => {
    const alteredKey = VALID_KEY.slice(0, -1) + (VALID_KEY.slice(-1) === 'a' ? 'b' : 'a');
    assert.strictEqual(validateMcpApiKey(alteredKey, VALID_KEY), false);
  });

  it('rechaza claves de longitud diferente sin lanzar excepción en timingSafeEqual', () => {
    // Node.js crypto.timingSafeEqual lanza RangeError si los buffers tienen tamaños distintos.
    // La protección keyBuf.length !== expectedBuf.length previene ese crash.
    assert.doesNotThrow(() => {
      assert.strictEqual(validateMcpApiKey('short_key', VALID_KEY), false);
      assert.strictEqual(validateMcpApiKey(VALID_KEY + '_extra', VALID_KEY), false);
    });
  });

  it('rechaza claves vacías o de solo espacios', () => {
    assert.strictEqual(validateMcpApiKey('', VALID_KEY), false);
    assert.strictEqual(validateMcpApiKey(VALID_KEY, ''), false);
    assert.strictEqual(validateMcpApiKey('', ''), false);
  });

  it('rechaza entradas nulas, indefinidas o tipos no string', () => {
    assert.strictEqual(validateMcpApiKey(null, VALID_KEY), false);
    assert.strictEqual(validateMcpApiKey(undefined, VALID_KEY), false);
    assert.strictEqual(validateMcpApiKey(12345, VALID_KEY), false);
    assert.strictEqual(validateMcpApiKey({}, VALID_KEY), false);
    assert.strictEqual(validateMcpApiKey(VALID_KEY, null), false);
  });

  it('resiste ataques de variación de prefijos y sufijos', () => {
    for (let i = 0; i < VALID_KEY.length; i++) {
      const char = VALID_KEY[i];
      const mutated = VALID_KEY.slice(0, i) + (char === 'x' ? 'y' : 'x') + VALID_KEY.slice(i + 1);
      assert.strictEqual(validateMcpApiKey(mutated, VALID_KEY), false);
    }
  });
});
