const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  resolveLocalPtyChannel,
  buildLocalPtyStartPayload,
  localPtyStartDelayMs,
  shouldSendLocalPtyStop,
  localPtyProbeCommand,
  localPtyErrorLabel
} = require('../../src/utils/localPtySession');

describe('localPtySession', () => {
  it('resuelve el canal de cada terminal local', () => {
    assert.strictEqual(resolveLocalPtyChannel('wsl'), 'wsl');
    assert.strictEqual(resolveLocalPtyChannel('powershell'), 'powershell');
    assert.strictEqual(resolveLocalPtyChannel('cygwin'), 'cygwin');
    assert.strictEqual(resolveLocalPtyChannel('docker'), 'docker');
    assert.strictEqual(resolveLocalPtyChannel('ubuntu', null), 'ubuntu');
    assert.strictEqual(resolveLocalPtyChannel('ubuntu', { category: 'ubuntu' }), 'ubuntu');
    assert.strictEqual(resolveLocalPtyChannel('ubuntu', { category: 'debian' }), 'wsl-distro');
  });

  it('arma el payload de start solo con metadatos en ubuntu y wsl-distro', () => {
    const ubuntu = { category: 'ubuntu', label: 'Ubuntu' };
    const debian = { category: 'debian', label: 'Debian' };

    assert.deepStrictEqual(
      buildLocalPtyStartPayload('wsl', 120, 30, null),
      { cols: 120, rows: 30 }
    );
    assert.deepStrictEqual(
      buildLocalPtyStartPayload('powershell', 80, 24, null),
      { cols: 80, rows: 24 }
    );
    assert.deepStrictEqual(
      buildLocalPtyStartPayload('cygwin', 100, 40, null),
      { cols: 100, rows: 40 }
    );
    assert.deepStrictEqual(
      buildLocalPtyStartPayload('ubuntu', 120, 30, ubuntu),
      { cols: 120, rows: 30, ubuntuInfo: ubuntu }
    );
    assert.deepStrictEqual(
      buildLocalPtyStartPayload('ubuntu', 120, 30, null),
      { cols: 120, rows: 30, ubuntuInfo: null }
    );
    assert.deepStrictEqual(
      buildLocalPtyStartPayload('wsl-distro', 120, 30, debian),
      { cols: 120, rows: 30, distroInfo: debian }
    );
    assert.deepStrictEqual(
      buildLocalPtyStartPayload('docker', 100, 40, { containerName: 'nginx' }),
      { cols: 100, rows: 40, containerName: 'nginx' }
    );
  });

  it('el payload de una distro usa el canal resuelto', () => {
    const debian = { category: 'debian', name: 'Debian' };
    const channel = resolveLocalPtyChannel('ubuntu', debian);
    assert.strictEqual(channel, 'wsl-distro');
    assert.deepStrictEqual(
      buildLocalPtyStartPayload(channel, 90, 28, debian),
      { cols: 90, rows: 28, distroInfo: debian }
    );
  });

  it('retrasa el start solo en la primera pestaña, salvo WSL', () => {
    assert.strictEqual(localPtyStartDelayMs('wsl', 'tab-1'), 0);
    assert.strictEqual(localPtyStartDelayMs('ubuntu', 'tab-1'), 300);
    assert.strictEqual(localPtyStartDelayMs('powershell', 'tab-1'), 300);
    assert.strictEqual(localPtyStartDelayMs('cygwin', 'tab-1'), 300);
    assert.strictEqual(localPtyStartDelayMs('powershell', 'tab-2'), 0);
  });

  it('WSL siempre envía stop; el resto lo omite en una recarga', () => {
    const reload = { navigationType: 1, readyState: 'complete' };
    assert.strictEqual(shouldSendLocalPtyStop('wsl', reload), true);
    assert.strictEqual(shouldSendLocalPtyStop('powershell', reload), false);
    assert.strictEqual(shouldSendLocalPtyStop('ubuntu', { navigationType: 0, readyState: 'loading' }), false);
    assert.strictEqual(shouldSendLocalPtyStop('cygwin', { navigationType: 0, readyState: 'complete' }), true);
  });

  it('la sonda de distro solo se envía en WSL y en Ubuntu sin categoría', () => {
    assert.ok(localPtyProbeCommand('wsl', null).includes('/etc/os-release'));
    assert.strictEqual(localPtyProbeCommand('ubuntu', null), 'cat /etc/os-release\n');
    assert.strictEqual(localPtyProbeCommand('ubuntu', { category: 'debian' }), null);
    assert.strictEqual(localPtyProbeCommand('powershell', null), null);
    assert.strictEqual(localPtyProbeCommand('cygwin', null), null);
  });

  it('la etiqueta de error depende de la plataforma y de la distro', () => {
    assert.strictEqual(localPtyErrorLabel('wsl'), 'WSL');
    assert.strictEqual(localPtyErrorLabel('cygwin'), 'NodeTerm');
    assert.strictEqual(localPtyErrorLabel('powershell', { platform: 'win32' }), 'PowerShell');
    assert.strictEqual(localPtyErrorLabel('powershell', { platform: 'linux' }), 'Terminal');
    assert.strictEqual(
      localPtyErrorLabel('ubuntu', { sessionInfo: { label: 'Debian' } }),
      'Debian'
    );
    assert.strictEqual(localPtyErrorLabel('ubuntu', {}), 'WSL Distribution');
  });
});
