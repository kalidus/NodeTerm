const { describe, it } = require('node:test');
const assert = require('node:assert');

const listeners = new Map();
const ipcMain = {
  on(channel, handler) {
    if (!listeners.has(channel)) listeners.set(channel, []);
    listeners.get(channel).push(handler);
  },
  removeAllListeners(channel) {
    listeners.delete(channel);
  }
};

const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath,
  filename: electronPath,
  loaded: true,
  exports: { ipcMain }
};

const {
  registerTabEvents,
  isTabRegistered,
  unregisterTab,
  clearAllRegisteredTabs
} = require('../../src/main/handlers/tab-events-handler');

function noopHandlers() {
  return { start() {}, data() {}, resize() {}, stop() {} };
}

function depsWith(stopTracker) {
  const track = (name) => () => { stopTracker.push(name); };
  return {
    PowerShell: { PowerShellHandlers: { ...noopHandlers(), stop: track('powershell') } },
    WSL: { WSLHandlers: { ...noopHandlers(), stop: track('wsl') } },
    Cygwin: { CygwinHandlers: { ...noopHandlers(), stop: track('cygwin') } },
    Claude: { ClaudeHandlers: noopHandlers() },
    OpenCode: { OpenCodeHandlers: noopHandlers() },
    CodexCli: { CodexCliHandlers: noopHandlers() },
    AntigravityCli: { AntigravityCliHandlers: noopHandlers() },
    HermesCli: { HermesCliHandlers: noopHandlers() },
    startUbuntuSession() {},
    handleUbuntuData() {},
    handleUbuntuResize() {},
    handleUbuntuStop: track('ubuntu'),
    startWSLDistroSession() {},
    handleWSLDistroData() {},
    handleWSLDistroResize() {},
    handleWSLDistroStop() {},
    getDocker: () => null
  };
}

function emit(channel) {
  const list = listeners.get(channel) || [];
  for (const fn of [...list]) fn();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('tab-events-handler', () => {
  it('unregisterTab quita los listeners IPC de la pestana', () => {
    const tabId = 'tab-unregister';
    registerTabEvents(tabId, depsWith([]));
    assert.strictEqual(isTabRegistered(tabId), true);
    assert.ok((listeners.get(`powershell:data:${tabId}`) || []).length > 0);

    unregisterTab(tabId);

    assert.strictEqual(isTabRegistered(tabId), false);
    assert.strictEqual(listeners.has(`powershell:data:${tabId}`), false);
    assert.strictEqual(listeners.has(`claude:start:${tabId}`), false);
  });

  it('el stop de la pestana quita los listeners despues de la rafaga', async () => {
    const tabId = 'tab-stop';
    const stops = [];
    registerTabEvents(tabId, depsWith(stops));

    emit(`powershell:stop:${tabId}`);
    emit(`wsl:stop:${tabId}`);
    emit(`ubuntu:stop:${tabId}`);
    emit(`cygwin:stop:${tabId}`);

    assert.deepStrictEqual(stops, ['powershell', 'wsl', 'ubuntu', 'cygwin']);
    assert.strictEqual(isTabRegistered(tabId), true);

    await wait(80);

    assert.strictEqual(isTabRegistered(tabId), false);
    assert.strictEqual(listeners.has(`powershell:start:${tabId}`), false);
  });

  it('volver a registrar cancela el borrado pendiente', async () => {
    const tabId = 'tab-reregister';
    const deps = depsWith([]);
    registerTabEvents(tabId, deps);
    emit(`powershell:stop:${tabId}`);
    registerTabEvents(tabId, deps);

    await wait(80);

    assert.strictEqual(isTabRegistered(tabId), true);
    assert.ok((listeners.get(`powershell:data:${tabId}`) || []).length > 0);
    unregisterTab(tabId);
  });

  it('clearAllRegisteredTabs limpia todas las pestanas', () => {
    registerTabEvents('tab-a', depsWith([]));
    registerTabEvents('tab-b', depsWith([]));
    clearAllRegisteredTabs();
    assert.strictEqual(isTabRegistered('tab-a'), false);
    assert.strictEqual(isTabRegistered('tab-b'), false);
    assert.strictEqual(listeners.has('powershell:start:tab-a'), false);
    assert.strictEqual(listeners.has('powershell:start:tab-b'), false);
  });
});
