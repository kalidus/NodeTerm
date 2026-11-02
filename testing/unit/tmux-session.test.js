const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  sanitizeTmuxSessionName,
  buildDefaultTmuxSessionName,
  resolveTmuxSessionName,
  buildTmuxAttachCommand,
  shouldUseTmuxPersist
} = require('../../src/utils/tmuxSession');
const { requiresDedicatedSshSession } = require('../../src/utils/sshConnectOptions');

describe('tmuxSession', () => {
  it('sanitiza nombres peligrosos', () => {
    assert.equal(sanitizeTmuxSessionName('foo; rm -rf /'), 'foo-rm-rf');
    assert.equal(sanitizeTmuxSessionName(''), 'nodeterm');
  });

  it('genera nombre por defecto estable', () => {
    assert.equal(
      buildDefaultTmuxSessionName({ username: 'alice', host: 'db.example.com' }),
      'nodeterm-alice-db-example-com'
    );
  });

  it('respeta override manual', () => {
    assert.equal(
      resolveTmuxSessionName({
        username: 'alice',
        host: 'db',
        tmuxSessionName: 'my session!'
      }),
      'my-session'
    );
  });

  it('construye comando de attach', () => {
    assert.equal(
      buildTmuxAttachCommand('nodeterm-alice-db'),
      'tmux new-session -A -s nodeterm-alice-db'
    );
  });

  it('no usa tmux en bastión ni sin flag', () => {
    assert.equal(shouldUseTmuxPersist({ persistSession: true }), true);
    assert.equal(shouldUseTmuxPersist({ persistSession: true, useBastionWallix: true }), false);
    assert.equal(shouldUseTmuxPersist({ persistSession: false }), false);
  });

  it('persistSession fuerza sesión SSH dedicada', () => {
    assert.equal(requiresDedicatedSshSession({ persistSession: true }), true);
    assert.equal(requiresDedicatedSshSession({ persistSession: false }), false);
    assert.equal(
      requiresDedicatedSshSession({ persistSession: true, useBastionWallix: true }),
      false
    );
  });
});
