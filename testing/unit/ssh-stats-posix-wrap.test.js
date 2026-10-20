const { describe, it } = require('node:test');
const assert = require('node:assert');

const sshStatsService = require('../../src/main/services/SSHStatsService');

describe('SSHStatsService wrapInPosixSh', () => {
  it('envuelve el comando en /bin/sh -c con comillas simples', () => {
    const wrapped = sshStatsService.wrapInPosixSh('echo hello && (true || false)');
    assert.strictEqual(wrapped, `/bin/sh -c 'echo hello && (true || false)'`);
  });

  it('escapa comillas simples internas al estilo POSIX', () => {
    const wrapped = sshStatsService.wrapInPosixSh("echo 'hi'");
    assert.strictEqual(wrapped, `/bin/sh -c 'echo '\\''hi'\\'''`);
  });

  it('logStatsErrorOnce no repite el mismo mensaje por tabId', () => {
    const errors = [];
    const original = console.error;
    console.error = (...args) => { errors.push(args); };

    try {
      const err = new Error('fish: command substitution');
      sshStatsService.clearStatsError('tab-fish');
      sshStatsService.logStatsErrorOnce('tab-fish', err);
      sshStatsService.logStatsErrorOnce('tab-fish', err);
      assert.strictEqual(errors.length, 1);

      sshStatsService.logStatsErrorOnce('tab-fish', new Error('otro fallo'));
      assert.strictEqual(errors.length, 2);

      sshStatsService.clearStatsError('tab-fish');
      sshStatsService.logStatsErrorOnce('tab-fish', err);
      assert.strictEqual(errors.length, 3);
    } finally {
      console.error = original;
      sshStatsService.clearStatsError('tab-fish');
    }
  });
});
