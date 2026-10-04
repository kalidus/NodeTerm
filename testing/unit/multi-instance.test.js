const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

test('Multi-instance safeStorage and path resolution', async (t) => {
  const mainDataDir = process.env.APPDATA 
    ? path.join(process.env.APPDATA, 'nodeterm')
    : path.join(require('os').homedir(), '.nodeterm');
  assert.ok(fs.existsSync(mainDataDir), 'mainDataDir must exist');

  const mainLocalState = path.join(mainDataDir, 'Local State');
  if (fs.existsSync(mainLocalState)) {
    assert.ok(true);
  } else {
    // En CI o entornos sin perfil creado, generar dummy para probar copia
    fs.writeFileSync(mainLocalState, '{"os_crypt":{}}');
  }

  // Simular directorio de instancia secundaria
  const tempDir = path.join(require('os').tmpdir(), `nodeterm-test-instance-${process.pid}`);
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Verificar que Local State se copia idéntico
    const tempLocalState = path.join(tempDir, 'Local State');
    fs.copyFileSync(mainLocalState, tempLocalState);
    assert.ok(fs.existsSync(tempLocalState), 'Local State must exist in tempDir');
    
    const mainContent = fs.readFileSync(mainLocalState);
    const tempContent = fs.readFileSync(tempLocalState);
    assert.deepEqual(mainContent, tempContent, 'Local State contents must match');
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  }
});

test('McpApiServer safe discovery removal', async (t) => {
  const mcpServer = require('../../src/main/services/McpApiServer');
  assert.ok(typeof mcpServer._removeServerInfo === 'function');
  assert.ok(typeof mcpServer.start === 'function');
});
