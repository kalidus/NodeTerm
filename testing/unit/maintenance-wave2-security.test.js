const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('Oleada 2 — seguridad subprocess y extracciones', () => {
  it('discovery-scan no usa shell:true ni exec/execAsync para ARP/neighbor', () => {
    const src = read('src/main/services/network-tools/discovery-scan.js');
    assert.ok(!src.includes('shell: true'), 'no debe quedar shell: true');
    assert.ok(!src.includes('shell:true'), 'no debe quedar shell:true');
    assert.ok(!/\bpromisify\(exec\)/.test(src), 'no debe usar promisify(exec)');
    assert.ok(!/\bexecAsync\b/.test(src), 'no debe usar execAsync');
    assert.ok(src.includes("execFileAsync(\n        'powershell.exe'"), 'neighbor table vía execFile powershell');
    assert.ok(src.includes("execFile(file, args"), 'ARP clásico vía execFile argv');
  });

  it('GuacdService Expand-Archive usa execFile sin interpolar cmd en shell', () => {
    const src = read('src/services/GuacdService.js');
    assert.ok(!/exec\(cmd/.test(src), 'no debe quedar exec(cmd) para extract');
    assert.ok(src.includes("execFile(\n        'powershell.exe'"), 'Expand-Archive vía execFile');
    assert.ok(src.includes('GUACD_ZIP'), 'rutas vía env, no interpoladas en -Command');
  });

  it('main.js delega createWindow y ssh connect a módulos extraídos', () => {
    const main = read('main.js');
    assert.ok(main.includes("require('./src/main/window/create-main-window')"));
    assert.ok(main.includes('createMainWindow('));
    assert.ok(main.includes("require('./src/main/services/ssh-connect-session')"));
    assert.ok(main.includes('registerSshConnectSession('));
    assert.ok(!main.includes("ipcMain.on('ssh:connect'"), 'ssh:connect no debe vivir en main.js');
    assert.ok(!main.includes('wslDistroProcesses'), 'mapa WSL muerto eliminado');
    assert.ok(!main.includes('detectUbuntuSimple'), 'detectUbuntuSimple eliminado');
  });

  it('create-main-window exporta createMainWindow', () => {
    const src = read('src/main/window/create-main-window.js');
    assert.ok(/function createMainWindow\s*\(/.test(src));
    assert.ok(src.includes('module.exports'));
    assert.ok(src.includes('createMainWindow'));
    assert.ok(src.includes('buildSplashHtml') || src.includes('getSplashHtml'));
  });

  it('ssh-connect-session exporta registerSshConnectSession y registra IPC SSH', () => {
    const src = read('src/main/services/ssh-connect-session.js');
    assert.ok(/function registerSshConnectSession\s*\(/.test(src));
    assert.ok(src.includes("ipcMain.on('ssh:connect'"));
    assert.ok(src.includes("ipcMain.on('ssh:data'"));
    assert.ok(src.includes("ipcMain.on('ssh:resize'"));
    assert.ok(src.includes("ipcMain.on('ssh:disconnect'"));
    assert.ok(src.includes("ipcMain.handle('ssh:check-connection'"));
    assert.ok(src.includes('module.exports'));
  });

  it('App.js ya no importa formDebugger en el path caliente', () => {
    const src = read('src/components/App.js');
    assert.ok(!src.includes("from '../utils/formDebugger'"), 'sin imports de formDebugger');
    assert.ok(!src.includes('resolveFormBlocking'), 'sin resolveFormBlocking automático');
    assert.ok(!src.includes('window.unblockForms'), 'sin global de emergencia');
    assert.ok(!src.includes('window.emergencyUnblock'), 'sin emergencyUnblock global');
  });
});
