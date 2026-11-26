const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function createMockLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

async function loadHomeTabDefaults() {
  const { STORAGE_KEYS } = await import('../../src/utils/constants.js');
  const src = fs.readFileSync(
    path.join(__dirname, '../../src/utils/homeTabDefaults.js'),
    'utf8'
  );
  const body = src
    .replace(/^import .*;$/gm, '')
    .replace(/export function /g, 'function ')
    + '\nreturn { getDefaultLocalTerminalType, isHomeButtonLocked, isSidebarStartCollapsed, applyFirstRunHomeTabDefaults };';
  const factory = new Function('STORAGE_KEYS', 'getPlatformDefaultTerminalType', body);
  return {
    STORAGE_KEYS,
    ...factory(STORAGE_KEYS, () => 'linux-terminal')
  };
}

describe('Defaults de primera instalación (sidebar y Home)', () => {
  const prevLocalStorage = global.localStorage;

  beforeEach(() => {
    global.localStorage = createMockLocalStorage();
  });

  afterEach(() => {
    global.localStorage = prevLocalStorage;
  });

  it('colapsa la sidebar por defecto en primera instalación sin sobrescribir preferencias guardadas', async () => {
    const {
      STORAGE_KEYS,
      applyFirstRunHomeTabDefaults,
      isSidebarStartCollapsed
    } = await loadHomeTabDefaults();

    assert.strictEqual(isSidebarStartCollapsed(), true);

    applyFirstRunHomeTabDefaults();
    assert.strictEqual(localStorage.getItem(STORAGE_KEYS.SIDEBAR_START_COLLAPSED), 'true');
    assert.strictEqual(isSidebarStartCollapsed(), true);

    localStorage.setItem(STORAGE_KEYS.SIDEBAR_START_COLLAPSED, 'false');
    applyFirstRunHomeTabDefaults();
    assert.strictEqual(localStorage.getItem(STORAGE_KEYS.SIDEBAR_START_COLLAPSED), 'false');
    assert.strictEqual(isSidebarStartCollapsed(), false);
  });

  it('muestra solo el panel de clave maestra y el terminal minimizado en primera instalación', async () => {
    const { buildFirstRunHomePanelsLayout } = await import('../../src/utils/homeTabPresets.js');
    const {
      MINIMIZED_PANEL_HEIGHT,
      isPanelShowing,
      scalePanelsToCanvas
    } = await import('../../src/utils/homeTabSnapping.js');

    for (const [w, h] of [[1920, 1080], [1440, 900], [1280, 720]]) {
      const layout = buildFirstRunHomePanelsLayout(w, h, { showMasterKey: true });

      const visiblePanels = Object.entries(layout)
        .filter(([id, panel]) => isPanelShowing(id, panel))
        .map(([id]) => id)
        .sort();

      assert.deepStrictEqual(visiblePanels, ['masterKey', 'terminal'], `Canvas ${w}x${h}`);
      assert.strictEqual(layout.search.visible, false);
      assert.strictEqual(layout.favorites.visible, false);
      assert.strictEqual(layout.recordings.visible, false);

      assert.strictEqual(layout.terminal.visible, true);
      assert.strictEqual(layout.terminal.isMinimized, true);
      assert.strictEqual(layout.terminal.isMaximized, false);
      assert.strictEqual(layout.terminal.height, MINIMIZED_PANEL_HEIGHT);
      assert.ok(layout.terminal.preMinimizedHeight >= 260, `preMinimizedHeight ${w}x${h}`);

      assert.strictEqual(layout.masterKey.visible, true);
      assert.strictEqual(layout.masterKey.isMinimized, false);
      assert.strictEqual(layout.masterKey.isMaximized, false);

      const masterBottom = layout.masterKey.y + layout.masterKey.height;
      assert.ok(
        masterBottom <= layout.terminal.y,
        `masterKey (${masterBottom}) no debe solapar terminal minimizado (${layout.terminal.y}) en ${w}x${h}`
      );
    }

    // Al escalar el layout al canvas real tras montar, mantiene solo masterKey y terminal minimizado
    const initial = buildFirstRunHomePanelsLayout(1440, 900, { showMasterKey: true });
    const scaled = scalePanelsToCanvas(initial, 1440, 900, 1360, 790);
    const visibleScaled = Object.entries(scaled)
      .filter(([id, panel]) => isPanelShowing(id, panel))
      .map(([id]) => id)
      .sort();
    assert.deepStrictEqual(visibleScaled, ['masterKey', 'terminal']);
    assert.strictEqual(scaled.terminal.isMinimized, true);
    assert.strictEqual(scaled.terminal.height, MINIMIZED_PANEL_HEIGHT);
  });
});
