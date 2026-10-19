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
    + '\nmodule.exports = { colorizeLogLine };';
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  const fn = new Function('module', 'exports', wrapped);
  fn(module, module.exports);
  return module.exports;
}

const { colorizeLogLine } = loadLogColorizer();

const ESC = '\x1b';
const RESET = `${ESC}[0m`;
const STYLE_URL = `${ESC}[36m`;
const STYLE_TS = `${ESC}[2;37m`;
const STYLE_PATH = `${ESC}[2;36m`;

function hasColored(out, text, style) {
  return out.includes(`${style}${text}${RESET}`);
}

describe('log colorizer URLs y fechas', () => {
  it('colorea URL completa con path de un segmento', () => {
    const line = 'See https://ubuntu.com/pro for details.\n';
    const out = colorizeLogLine(line);
    assert.ok(hasColored(out, 'https://ubuntu.com/pro', STYLE_URL));
    assert.strictEqual(hasColored(out, '/pro', STYLE_PATH), false);
  });

  it('colorea URL sin path', () => {
    const line = 'Docs: https://help.ubuntu.com\n';
    const out = colorizeLogLine(line);
    assert.ok(hasColored(out, 'https://help.ubuntu.com', STYLE_URL));
  });

  it('colorea varias URLs del MOTD Ubuntu', () => {
    const line = ' * Documentation:  https://help.ubuntu.com\n';
    const out = colorizeLogLine(line);
    assert.ok(hasColored(out, 'https://help.ubuntu.com', STYLE_URL));
    const line2 = 'Get more security updates with Ubuntu Pro: https://ubuntu.com/esm\n';
    const out2 = colorizeLogLine(line2);
    assert.ok(hasColored(out2, 'https://ubuntu.com/esm', STYLE_URL));
  });

  it('incluye el año en last login EN', () => {
    const line = 'Last login: Mon Oct 19 06:12:55 2026 from 192.168.10.221\n';
    const out = colorizeLogLine(line);
    assert.ok(hasColored(out, 'Mon Oct 19 06:12:55 2026', STYLE_TS));
  });

  it('colorea fecha locale ES del MOTD con UTC', () => {
    const line = 'System information as of lun 19 oct 2026 06:02:41 UTC\n';
    const out = colorizeLogLine(line);
    assert.ok(hasColored(out, 'lun 19 oct 2026 06:02:41 UTC', STYLE_TS));
  });

  it('sigue coloreando syslog clasico sin año', () => {
    const line = 'Mar  3 10:00:00 host systemd[1]: Started service.\n';
    const out = colorizeLogLine(line);
    assert.ok(hasColored(out, 'Mar  3 10:00:00', STYLE_TS));
  });

  it('sigue coloreando paths locales como path', () => {
    const line = 'tailing /var/log/syslog\n';
    const out = colorizeLogLine(line);
    assert.ok(hasColored(out, '/var/log/syslog', STYLE_PATH));
  });

  it('no incluye el punto final de frase en la URL', () => {
    const line = 'Visit https://ubuntu.com/workshop.\n';
    const out = colorizeLogLine(line);
    assert.ok(hasColored(out, 'https://ubuntu.com/workshop', STYLE_URL));
    assert.strictEqual(out.includes(`${STYLE_URL}https://ubuntu.com/workshop.`), false);
  });
});
