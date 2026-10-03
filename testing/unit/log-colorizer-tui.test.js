const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

function loadLogColorizer() {
  const src = fs.readFileSync(path.join(__dirname, '../../src/utils/logColorizer.js'), 'utf8');
  const wrapped = src
    .replace(/export function /g, 'function ')
    .replace(/export const /g, 'const ')
    .replace(/export \{[^}]+\};?/g, '')
    + '\nmodule.exports = { createLogColorizer, colorizeLogLine };';
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  const fn = new Function('module', 'exports', wrapped);
  fn(module, module.exports);
  return module.exports;
}

const { createLogColorizer, colorizeLogLine } = loadLogColorizer();

const ESC = '\x1b';
const HTOP_LINE = ' 103 root       0.0  0.0  12345  6789 /usr/lib/systemd/systemd-timesyncd\n';
const JOURNAL_LINE = 'Mar  3 10:00:00 host systemd[1]: Started service.\n';

describe('log colorizer TUI / htop', () => {
  it('no altera filas tipo htop con rutas', () => {
    const out = colorizeLogLine(HTOP_LINE);
    assert.strictEqual(out, HTOP_LINE);
  });

  it('entra en tuiMode tras clear screen y deja pasar lineas htop', () => {
    const colorizer = createLogColorizer({ enabled: true });
    const chunk = `${ESC}[2J${HTOP_LINE}`;
    const first = colorizer.push(chunk);
    assert.ok(first.includes('/usr/lib/systemd/systemd-timesyncd'));
    assert.strictEqual(first.indexOf(`${ESC}[2;36m`), -1);
    const second = colorizer.push(' 190 messagebus  0.0  0.0  999 /usr/bin/dbus-daemon\n');
    assert.strictEqual(second.indexOf(`${ESC}[2;36m`), -1);
    assert.ok(second.includes('dbus-daemon'));
  });

  it('entra en tuiMode tras ocultar cursor', () => {
    const colorizer = createLogColorizer({ enabled: true });
    const chunk = `${ESC}[?25l${HTOP_LINE}`;
    const out = colorizer.push(chunk);
    assert.strictEqual(out, chunk);
  });

  it('con highlight desactivado pasa la salida sin cambios', () => {
    const colorizer = createLogColorizer({ enabled: false });
    const chunk = HTOP_LINE + JOURNAL_LINE;
    const out = colorizer.push(chunk);
    assert.strictEqual(out, chunk);
  });

  it('sigue coloreando logs tipo journal cuando no hay senal TUI', () => {
    const out = colorizeLogLine(JOURNAL_LINE);
    assert.notStrictEqual(out, JOURNAL_LINE);
    assert.ok(out.includes(`${ESC}[`));
  });
});
