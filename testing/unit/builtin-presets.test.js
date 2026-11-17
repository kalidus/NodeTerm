const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readActionBarIds() {
  const block = read('src/themes/action-bar-icon-themes.js').split('export const actionBarIconThemes = {')[1].split('\n};')[0];
  return new Set([...block.matchAll(/^\s{2}(\w+):\s*\{/gm)].map((match) => match[1]));
}

function readQuotedKeys(relativePath) {
  return new Set([...read(relativePath).matchAll(/^ {2}'([^']+)': \{/gm)].map((match) => match[1]));
}

function readIconIds(relativePaths) {
  const ids = new Set();
  for (const relativePath of relativePaths) {
    for (const match of read(relativePath).matchAll(/"id": "([^"]+)"/g)) ids.add(match[1]);
    for (const match of read(relativePath).matchAll(/^\s{4}id: '([^']+)'/gm)) ids.add(match[1]);
  }
  return ids;
}

function familyName(value) {
  const match = String(value).match(/^["']?([^"',]+)/);
  return match ? match[1].trim() : String(value);
}

describe('Presets de apariencia integrados', () => {
  it('cada preset rellena claves reales de tema, fuente, pestaña y ventana', async () => {
    const { builtinPresets, PRESET_SETTINGS_KEYS } = await import('../../src/themes/presets/index.js');
    const catalog = (await import('../../src/utils/fontCatalog.js')).default;
    const { uiThemes } = await import('../../src/themes/ui-themes.js');
    const { statusBarThemes } = await import('../../src/themes/status-bar-themes.js');
    const { treeThemes } = await import('../../src/themes/tree-themes.js');
    const { getTabThemeList, getTabLayoutList } = await import('../../src/utils/tabThemeLoader.js');

    const families = new Map(catalog.fonts.map((font) => [font.family, font]));
    const themes = readQuotedKeys('src/themes.js');
    const tabThemes = new Set(getTabThemeList().map((theme) => theme.id));
    const tabLayouts = new Set(getTabLayoutList().map((layout) => layout.id));
    const windowLayouts = new Set([...read('src/utils/appearanceLayout.js').matchAll(/id: '([^']+)'/g)].map((match) => match[1]));
    const icons = readIconIds([
      'src/themes/icon-themes/meta.js',
      'src/themes/icon-themes/futurist-catalog.js',
      'src/themes/icon-themes/ghost-catalog.js',
      'src/themes/icon-themes/vscode-catalog.js'
    ]);
    const sessionIcons = readIconIds([
      'src/themes/session-action-icons/meta.js',
      'src/themes/icon-themes/futurist-catalog.js',
      'src/themes/icon-themes/vscode-catalog.js'
    ]);
    const actionBars = readActionBarIds();
    const ids = new Set();
    const optionalKey = 'sidebarFontColor';

    const expectedIds = [
      'pro-ocean', 'mux', 'atelier', 'ion-storm', 'default-dark', 'dracula', 'nord',
      'tokyo-night', 'cyberpunk', 'cyberpunk-light', 'night-owl', 'everforest', 'catppuccin',
      'rose-pine', 'emerald', 'sakura', 'moonlight', 'magma', 'oceanic',
      'papel', 'atelier-light', 'mux-light', 'menta', 'calido', 'solarized',
      'slate', 'indigo', 'graphite', 'medianoche'
    ];
    assert.strictEqual(builtinPresets.length, expectedIds.length);

    for (const preset of builtinPresets) {
      assert.ok(preset.id && !ids.has(preset.id), `id duplicado o vacío: ${preset.id}`);
      ids.add(preset.id);
      assert.strictEqual(preset.isBuiltin, true, preset.id);
      assert.strictEqual(optionalKey in preset.settings, false, `${preset.id} no debe forzar sidebarFontColor`);

      for (const key of PRESET_SETTINGS_KEYS) {
        if (key === optionalKey) continue;
        assert.ok(preset.settings[key], `${preset.id} no define ${key}`);
      }

      const settings = preset.settings;
      assert.ok(uiThemes[settings.ui_theme], `${preset.id} ui_theme ${settings.ui_theme}`);
      assert.strictEqual(settings.explorerColorTheme, settings.ui_theme, preset.id);
      assert.ok(windowLayouts.has(settings.ui_layout), `${preset.id} ui_layout ${settings.ui_layout}`);
      assert.ok(tabThemes.has(settings.nodeterm_tab_theme), `${preset.id} tab ${settings.nodeterm_tab_theme}`);
      assert.ok(tabLayouts.has(settings.nodeterm_tab_layout), `${preset.id} tab layout ${settings.nodeterm_tab_layout}`);
      assert.ok(treeThemes[settings.nodeterm_tree_theme], `${preset.id} árbol ${settings.nodeterm_tree_theme}`);
      assert.ok(icons.has(settings.iconTheme), `${preset.id} icono ${settings.iconTheme}`);
      assert.strictEqual(settings.iconThemeSidebar, settings.iconTheme, preset.id);
      assert.ok(sessionIcons.has(settings.sessionActionIconTheme), `${preset.id} sesión ${settings.sessionActionIconTheme}`);
      assert.ok(actionBars.has(settings.actionBarIconTheme), `${preset.id} action bar ${settings.actionBarIconTheme}`);

      const terminalThemes = [
        settings.basicapp_terminal_theme,
        settings.localPowerShellTheme,
        settings.localLinuxTerminalTheme,
        settings.localDockerTerminalTheme
      ];
      for (const theme of terminalThemes) {
        assert.ok(themes.has(theme), `${preset.id} terminal ${theme}`);
        assert.strictEqual(theme, terminalThemes[0], `${preset.id} mezcla terminales`);
      }

      const statusThemes = [
        settings.basicapp_statusbar_theme,
        settings.localPowerShellStatusBarTheme,
        settings.localLinuxStatusBarTheme,
        settings.localDockerStatusBarTheme,
        settings.localCygwinStatusBarTheme
      ];
      for (const theme of statusThemes) {
        assert.ok(statusBarThemes[theme], `${preset.id} status ${theme}`);
        assert.strictEqual(theme, statusThemes[0], `${preset.id} mezcla status`);
      }

      const statusIcons = [
        settings.basicapp_ssh_statusbar_icon_theme,
        settings.basicapp_powershell_statusbar_icon_theme,
        settings.basicapp_linux_statusbar_icon_theme,
        settings.basicapp_docker_statusbar_icon_theme
      ];
      for (const theme of statusIcons) {
        assert.strictEqual(theme, statusIcons[0], `${preset.id} mezcla iconos de status`);
      }

      const uiFamilies = [settings.uiFont, settings.sidebarFont, settings.explorerFont, settings.homeTabFont];
      for (const family of uiFamilies) {
        const font = families.get(family);
        assert.ok(font, `${preset.id} fuente UI ${family}`);
        assert.strictEqual(font.role, 'sans', `${preset.id} ${family} no es sans`);
        assert.strictEqual(family, uiFamilies[0], `${preset.id} mezcla fuentes UI`);
      }
      for (const size of [settings.uiFontSize, settings.sidebarFontSize, settings.explorerFontSize, settings.homeTabFontSize]) {
        assert.strictEqual(size, settings.uiFontSize, preset.id);
      }

      const monoKeys = [
        'basicapp_terminal_font_family',
        'basicapp_font_family',
        'basicapp_local_terminal_font_family',
        'nodeterm_linux_font_family',
        'nodeterm_docker_font_family'
      ];
      for (const key of monoKeys) {
        const font = families.get(familyName(settings[key]));
        assert.ok(font, `${preset.id} fuente terminal ${settings[key]}`);
        assert.strictEqual(font.role, 'mono', `${preset.id} ${settings[key]} no es mono`);
        assert.strictEqual(settings[key], settings.basicapp_terminal_font_family, preset.id);
      }
      const expectedMonoSize = preset.id === 'pro-ocean' ? '13' : '14';
      for (const key of ['basicapp_terminal_font_size', 'basicapp_font_size', 'basicapp_local_terminal_font_size', 'nodeterm_linux_font_size', 'nodeterm_docker_font_size']) {
        assert.strictEqual(settings[key], expectedMonoSize, preset.id);
      }

      assert.strictEqual(settings.nodeterm_terminal_opacity, '1', preset.id);
      assert.strictEqual(settings.nodeterm_main_frame_header_start_collapsed, 'true', preset.id);
      if (settings.ui_layout === 'islas') {
        assert.strictEqual(settings.nodeterm_home_backdrop_blur, '8', preset.id);
      }
    }

    const animated = builtinPresets
      .filter((preset) => preset.settings.basicapp_terminal_theme.includes('Animated'))
      .map((preset) => preset.id)
      .sort();
    assert.deepStrictEqual(animated, ['ion-storm', 'sakura']);

    assert.deepStrictEqual([...ids], expectedIds);
  });
});
