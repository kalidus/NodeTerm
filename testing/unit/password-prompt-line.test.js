const { describe, it } = require('node:test');
const assert = require('node:assert');

// passwordPromptGate is ESM; load via dynamic import in Node
async function loadGate() {
  return import('../../src/services/passwordPromptGate.js');
}

describe('isPasswordPromptLine — modo contraseña UI', () => {
  it('detecta prompts cortos de password/sudo/contraseña', async () => {
    const { isPasswordPromptLine } = await loadGate();
    assert.strictEqual(isPasswordPromptLine('Password:'), true);
    assert.strictEqual(isPasswordPromptLine('password: '), true);
    assert.strictEqual(isPasswordPromptLine('[sudo] password for alice:'), true);
    assert.strictEqual(isPasswordPromptLine('Contraseña:'), true);
    assert.strictEqual(isPasswordPromptLine('Enter passphrase for key:'), true);
  });

  it('no activa con echo o líneas que no son el prompt', async () => {
    const { isPasswordPromptLine } = await loadGate();
    assert.strictEqual(isPasswordPromptLine('echo "password: foo"'), false);
    assert.strictEqual(isPasswordPromptLine('user@host:~$ '), false);
    assert.strictEqual(isPasswordPromptLine(''), false);
    assert.strictEqual(
      isPasswordPromptLine('a'.repeat(200) + ' password:'),
      false
    );
  });
});
