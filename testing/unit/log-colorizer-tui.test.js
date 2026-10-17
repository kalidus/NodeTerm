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
    + '\nmodule.exports = { createLogColorizer, colorizeLogLine, looksLikeTuiChrome, looksLikeRestorableLogLine, looksLikeTuiSnapshot };';
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  const fn = new Function('module', 'exports', wrapped);
  fn(module, module.exports);
  return module.exports;
}

const {
  createLogColorizer,
  colorizeLogLine,
  looksLikeTuiChrome,
  looksLikeRestorableLogLine,
  looksLikeTuiSnapshot
} = loadLogColorizer();

const ESC = '\x1b';
const HTOP_LINE = ' 103 root       0.0  0.0  12345  6789 /usr/lib/systemd/systemd-timesyncd\n';
const JOURNAL_LINE = 'Mar  3 10:00:00 host systemd[1]: Started service.\n';
const HTOP_FOOTER_REV = `${ESC}[0;1;7mF1${ESC}[0;7mHelp${ESC}[0m${ESC}[0;1;7mF2${ESC}[0;7mSetup${ESC}[0m${ESC}[0;1;7mF10${ESC}[0;7mQuit${ESC}[0m\n`;
const NODETERM_DIM = `${ESC}[2;36m`;

describe('log colorizer TUI / htop', () => {
  it('no altera filas tipo htop con rutas', () => {
    const out = colorizeLogLine(HTOP_LINE);
    assert.strictEqual(out, HTOP_LINE);
  });

  it('entra en tuiMode tras alt-screen y deja pasar lineas htop', () => {
    const colorizer = createLogColorizer({ enabled: true });
    const chunk = `${ESC}[?1049h${HTOP_LINE}`;
    const first = colorizer.push(chunk);
    assert.ok(first.includes('/usr/lib/systemd/systemd-timesyncd'));
    assert.strictEqual(first.indexOf(NODETERM_DIM), -1);
    const second = colorizer.push(' 190 messagebus  0.0  0.0  999 /usr/bin/dbus-daemon\n');
    assert.strictEqual(second.indexOf(NODETERM_DIM), -1);
    assert.ok(second.includes('dbus-daemon'));
  });

  it('clear/2J o ?25l no dejan tuiMode pegado (cat sigue coloreando)', () => {
    const colorizer = createLogColorizer({ enabled: true });
    colorizer.push(`${ESC}[2J${ESC}[H`);
    colorizer.push(`${ESC}[?25l`);
    const journal = colorizer.push(JOURNAL_LINE);
    assert.ok(journal.includes(`${ESC}[`));
    assert.notStrictEqual(journal, JOURNAL_LINE);
  });

  it('?25h no sale de tuiMode (htop muestra cursor sin dejar alt-screen)', () => {
    const colorizer = createLogColorizer({ enabled: true });
    colorizer.push(`${ESC}[?1049h${HTOP_LINE}`);
    const afterShow = colorizer.push(`${ESC}[?25h`);
    assert.ok(afterShow.includes(`${ESC}[?25h`));
    const nextHtop = colorizer.push(HTOP_LINE);
    assert.strictEqual(nextHtop.indexOf(NODETERM_DIM), -1);
    assert.ok(nextHtop.includes('systemd-timesyncd'));
  });

  it('footer htop con reverse-video sale byte a byte', () => {
    const out = colorizeLogLine(HTOP_FOOTER_REV);
    assert.strictEqual(out, HTOP_FOOTER_REV);
    assert.ok(looksLikeTuiChrome(HTOP_FOOTER_REV));
  });

  it('SGR de color (37m) no se confunde con reverse-video', () => {
    assert.strictEqual(looksLikeTuiChrome(`${ESC}[37mplain white${ESC}[0m`), false);
    assert.strictEqual(looksLikeTuiChrome(`${ESC}[2;37mdebug${ESC}[0m`), false);
    assert.ok(looksLikeTuiChrome(`${ESC}[7mrev${ESC}[0m`));
    assert.ok(looksLikeTuiChrome(`${ESC}[0;1;7mF1${ESC}[0m`));
  });

  it('looksLikeRestorableLogLine: journal si, chrome htop no', () => {
    assert.strictEqual(looksLikeRestorableLogLine(JOURNAL_LINE.trim()), true);
    assert.strictEqual(looksLikeRestorableLogLine('F1HelpF2SetupF10Quit'), false);
    assert.strictEqual(looksLikeRestorableLogLine('  PID USER      PRI  NI'), false);
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

  it('sale de tuiMode con alt-screen leave y vuelve a colorear', () => {
    const colorizer = createLogColorizer({ enabled: true });
    colorizer.push(`${ESC}[?1049h${HTOP_LINE}`);
    colorizer.push(`${ESC}[?25h`);
    const stillTui = colorizer.push(HTOP_LINE);
    assert.strictEqual(stillTui.indexOf(NODETERM_DIM), -1);

    colorizer.push(`${ESC}[?1049l\n`);
    const journal = colorizer.push(JOURNAL_LINE);
    assert.ok(journal.includes(`${ESC}[`));
    assert.notStrictEqual(journal, JOURNAL_LINE);
  });

  it('looksLikeTuiSnapshot detecta pantallas htop planas (translateToString)', () => {
    const lines = [
      '    0[||||||||||||||||||||||||100.0%]',
      '  PID USER      PRI  NI  VIRT   RES   SHR S CPU% MEM%   TIME+  Command',
      '    1 root       20   0  169M  12M  8M S  0.0  0.1  0:12.34 /usr/lib/systemd/systemd',
      '  103 root        0   0  12M   6M  4M S  0.0  0.0  0:01.00 /usr/lib/systemd/systemd-timesyncd',
      '  190 messagebus  0   0  9M    4M  3M S  0.0  0.0  0:00.10 /usr/bin/dbus-daemon',
      '  220 root        0   0  20M   8M  5M S  0.0  0.1  0:00.20 /usr/sbin/sshd',
      'F1Help  F2Setup  F10Quit'
    ];
    assert.strictEqual(looksLikeTuiSnapshot(lines), true);
    assert.strictEqual(looksLikeTuiSnapshot([JOURNAL_LINE.trim()]), false);
  });
});
