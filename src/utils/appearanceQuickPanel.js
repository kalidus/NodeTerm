import { themeManager } from './themeManager';
import { uiThemes } from '../themes/ui-themes';
import { presetManager } from './presetManager';
import { applyTabTheme, getTabThemeList, applyTabLayout, getTabLayoutList } from './tabThemeLoader';
import { setUILayout, UI_LAYOUT_OPTIONS, getCurrentUILayoutId } from './appearanceLayout';
import { themes } from '../themes';
import { statusBarThemes } from '../themes/status-bar-themes';
import { statusBarIconThemes } from '../themes/statusbar-icon-themes';
import { statusBarThemeManager } from './statusBarThemeManager';
import { treeThemeOptions } from '../themes/tree-themes';
import { iconThemes } from '../themes/icon-themes';
import { sessionActionIconThemes } from '../themes/session-action-icons';
import i18n from '../i18n';

const TAB_THEME_STORAGE_KEY = 'nodeterm_tab_theme';
const TAB_LAYOUT_STORAGE_KEY = 'nodeterm_tab_layout';

const TERMINAL_STORAGE = {
  ssh: 'basicapp_terminal_theme',
  powershell: 'localPowerShellTheme',
  linux: 'localLinuxTerminalTheme',
  docker: 'localDockerTerminalTheme'
};

const TERMINAL_DEFAULTS = {
  ssh: 'Default Dark',
  powershell: 'Dark',
  linux: 'Dark',
  docker: 'Default Dark'
};

const LAYOUT_STYLE_CLASS = {
  solid: 'solid',
  underline: 'underline',
  boxed: 'boxed',
  minimal: 'minimal',
  vscode: 'vscode',
  browser: 'browser',
  retro: 'retro',
  pills: 'pills',
  classicBrowser: 'classic',
  chrome: 'chrome'
};

const AI_CLIENTS_STORAGE_KEY = 'ai_clients_enabled';

const APP_CATALOG = [
  { id: 'guacamole', category: 'services', name: 'Guacamole', short: 'GU', color: '#059669', description: 'Proxy RDP/VNC con Docker, WSL o nativo.' },
  { id: 'cygwin', category: 'services', name: 'Cygwin Terminal', short: 'CY', color: '#00AA00', description: 'Runtime Unix portable para Windows.' },
  { id: 'browser', category: 'services', name: 'Navegador Web', short: 'WB', color: '#38bdf8', description: 'Navegador integrado en pestañas.' },
  { id: 'claude', category: 'cli', name: 'Claude Code', short: 'CL', color: '#f59e0b', description: 'CLI de Anthropic con terminal dedicada.' },
  { id: 'opencode', category: 'cli', name: 'OpenCode', short: 'OC', color: '#6366f1', description: 'Agente open-source multi-proveedor.' },
  { id: 'codexcli', category: 'cli', name: 'Codex CLI', short: 'CX', color: '#10b981', description: 'CLI de OpenAI Codex.' },
  { id: 'antigravitycli', category: 'cli', name: 'Antigravity CLI', short: 'AG', color: '#4285f4', description: 'CLI de Google con subagentes.' },
  { id: 'hermescli', category: 'cli', name: 'Hermes Agent', short: 'HM', color: '#14b8a6', description: 'Agente autónomo con memoria y TUI.' },
  { id: 'anythingllm', category: 'webapps', name: 'AnythingLLM', short: 'AL', color: '#4CAF50', description: 'RAG multi-modelo con Docker.' },
  { id: 'openwebui', category: 'webapps', name: 'Open WebUI', short: 'OW', color: '#2196F3', description: 'Chat tipo ChatGPT para Ollama.' },
  { id: 'librechat', category: 'webapps', name: 'LibreChat', short: 'LC', color: '#9C27B0', description: 'Chat multi-proveedor avanzado.' },
  { id: 'agentzero', category: 'webapps', name: 'Agent Zero', short: 'AZ', color: '#E91E63', description: 'Agentes autónomos con Docker.' },
  { id: 'openclaw', category: 'webapps', name: 'OpenClaw', short: 'CW', color: '#FF6B35', description: 'Gateway de agentes con sandbox.' },
  { id: 'opennotebook', category: 'webapps', name: 'Open Notebook', short: 'ON', color: '#10B981', description: 'NotebookLM local auto-hospedado.' }
];

const RAIL_GROUPS = [
  {
    id: 'appearance',
    labelKey: 'settings.quickPanel.groups.appearance',
    sections: [
      {
        id: 'ui',
        icon: 'pi-desktop',
        labelKey: 'settings.sidebar.interface',
        chips: [
          { id: 'themes', labelKey: 'settings.quickPanel.chips.themes' },
          { id: 'styles', labelKey: 'settings.quickPanel.chips.styles' },
          { id: 'presets', labelKey: 'settings.quickPanel.chips.presets' }
        ]
      },
      {
        id: 'tabs',
        icon: 'pi-palette',
        labelKey: 'settings.sidebar.tabs',
        chips: [
          { id: 'themes', labelKey: 'settings.quickPanel.chips.themes' },
          { id: 'styles', labelKey: 'settings.quickPanel.chips.styles' }
        ]
      },
      {
        id: 'terminal',
        icon: 'pi-code',
        labelKey: 'settings.sidebar.terminal',
        chips: [
          { id: 'ssh', labelKey: 'settings.quickPanel.chips.ssh' },
          { id: 'powershell', labelKey: 'settings.quickPanel.chips.powershell' },
          { id: 'linux', labelKey: 'settings.quickPanel.chips.linux' },
          { id: 'docker', labelKey: 'settings.quickPanel.chips.docker' }
        ]
      },
      {
        id: 'statusbar',
        icon: 'pi-sliders-h',
        labelKey: 'settings.sidebar.statusBar',
        chips: [
          { id: 'colors', labelKey: 'settings.quickPanel.chips.colors' },
          { id: 'icons', labelKey: 'settings.quickPanel.chips.icons' }
        ]
      },
      {
        id: 'sessions',
        icon: 'pi-sitemap',
        labelKey: 'settings.sidebar.sessionExplorer',
        chips: [
          { id: 'tree', labelKey: 'settings.quickPanel.chips.tree' },
          { id: 'icons', labelKey: 'settings.quickPanel.chips.icons' },
          { id: 'actions', labelKey: 'settings.quickPanel.chips.actions' }
        ]
      }
    ]
  },
  {
    id: 'system',
    labelKey: 'settings.quickPanel.groups.system',
    sections: [
      {
        id: 'apps',
        icon: 'pi-th-large',
        labelKey: 'settings.sidebar.apps',
        chips: [
          { id: 'all', labelKey: 'settings.quickPanel.chips.all' },
          { id: 'services', labelKey: 'settings.quickPanel.chips.services' },
          { id: 'cli', labelKey: 'settings.quickPanel.chips.cli' },
          { id: 'webapps', labelKey: 'settings.quickPanel.chips.webapps' }
        ]
      },
      {
        id: 'import',
        icon: 'pi-arrow-right-arrow-left',
        labelKey: 'settings.sidebar.importExport',
        descKey: 'settings.sidebarDescriptions.importExport',
        linkTab: 'importar-exportar'
      }
    ]
  }
];

const SECTIONS = RAIL_GROUPS.flatMap(group => group.sections);

function t(key, params) {
  return i18n.t(key, params);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function readStorage(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function namedEntries(record) {
  return Object.entries(record || {})
    .filter(([, item]) => item && (item.name || item.label))
    .map(([id, item]) => ({
      id,
      name: item.name || item.label || id,
      description: item.description || '',
      raw: item
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getUiThemeList() {
  return Array.from(
    new Map(
      Object.values(uiThemes || {})
        .filter(theme => theme?.name)
        .map(theme => [theme.name, theme])
    ).values()
  );
}

function themePreviewBackground(theme) {
  const side = theme.colors?.sidebarBackground || '#2b2f33';
  const content = theme.colors?.contentBackground
    || theme.colors?.menuBarBackground
    || theme.colors?.tabActiveBackground
    || '#1e1e1e';
  if (String(side).includes('gradient') || String(content).includes('gradient')) {
    return side;
  }
  return `linear-gradient(135deg, ${side} 0%, ${content} 100%)`;
}

function colorSwatch(background) {
  const swatch = el('div', 'aqp-swatch');
  swatch.style.background = background || '#333';
  return swatch;
}

function applyTabSwatch(node, preview) {
  node.style.background = preview?.background || 'var(--ui-tab-active-bg, #333)';
  node.style.borderRadius = preview?.borderRadius || '7px';
  if (preview?.border) node.style.border = preview.border;
  if (preview?.boxShadow) node.style.boxShadow = preview.boxShadow;
}

function createLayoutMock(borderStyle, compact) {
  const style = LAYOUT_STYLE_CLASS[borderStyle] || 'solid';
  const mock = el('div', `aqp-layout-mock aqp-layout-mock--${style}${compact ? ' aqp-layout-mock--compact' : ''}`);
  mock.append(el('span'), el('span'), el('span'));
  return mock;
}

function terminalSwatch(theme) {
  const colors = theme?.theme || {};
  const box = el('div', 'aqp-term-swatch');
  box.style.background = colors.background || '#1e1e1e';
  box.style.color = colors.foreground || '#d4d4d4';
  const cursor = el('span', 'aqp-term-cursor');
  cursor.style.background = colors.cursor || colors.foreground || '#d4d4d4';
  box.append(el('span', 'aqp-term-prompt', 'user@host:~$'), cursor);
  return box;
}

function dotSwatch(colors, background) {
  const box = el('div', background ? 'aqp-status-swatch' : 'aqp-dots-swatch');
  if (background) {
    box.style.background = background;
    box.style.borderColor = 'transparent';
  }
  const list = (colors && Object.values(colors).slice(0, 5)) || [];
  if (!list.length) {
    const dot = el('span');
    dot.style.background = 'var(--primary-color, #5b8def)';
    box.append(dot);
    return box;
  }
  list.forEach((color) => {
    const dot = el('span');
    dot.style.background = color;
    box.append(dot);
  });
  return box;
}

function publishCatalog(key, value) {
  window.dispatchEvent(new CustomEvent('appearance-catalog-changed', {
    detail: { key, value }
  }));
}

export function openAppearanceQuickPanel(anchorEl) {
  if (!anchorEl) return;

  const existingPanel = document.getElementById('tab-appearance-quick-panel');
  if (existingPanel) {
    existingPanel._aqpCleanup?.();
    existingPanel.remove();
    return;
  }

  const themeList = getTabThemeList();
  const layoutList = getTabLayoutList();
  const uiThemeList = getUiThemeList();
  const terminalList = namedEntries(themes);
  const statusColorList = namedEntries(statusBarThemes);
  const statusIconList = namedEntries(statusBarIconThemes);
  const sidebarIconList = namedEntries(iconThemes);
  const sessionActionList = namedEntries(sessionActionIconThemes);
  const picked = {};
  const state = {
    section: 'ui',
    chip: 'themes',
    query: ''
  };

  const panel = document.createElement('div');
  panel.id = 'tab-appearance-quick-panel';
  panel.className = 'aqp';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', t('settings.sidebar.appearance'));

  const header = el('div', 'aqp-header');
  const studio = el('div', 'aqp-studio');
  const rail = el('nav', 'aqp-rail');
  const stage = el('div', 'aqp-stage');
  studio.append(rail, stage);
  panel.append(header, studio);

  const openedAt = Date.now();
  let gridEl = null;

  const close = () => {
    panel._aqpCleanup?.();
    panel.remove();
  };
  panel._aqpCleanup = () => {
    document.removeEventListener('click', onOutside);
    document.removeEventListener('keydown', onKey);
  };

  const onOutside = (ev) => {
    if (Date.now() - openedAt < 150) return;
    if (!panel.contains(ev.target) && !anchorEl.contains(ev.target)) close();
  };

  const onKey = (ev) => {
    if (ev.key === 'Escape') close();
  };

  function positionPanel() {
    const margin = 8;
    const rect = anchorEl.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    let left = rect.right - width;
    if (left < margin) left = margin;
    if (left + width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - width);
    }
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - margin) {
      const above = rect.top - 6 - height;
      top = above >= margin ? above : margin;
    }
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
  }

  function remembered(key, storageKey, fallback) {
    if (picked[key] != null) return picked[key];
    return readStorage(storageKey, fallback);
  }

  function sectionValue(sectionId) {
    if (sectionId === 'tabs') {
      const id = readStorage(TAB_THEME_STORAGE_KEY, 'default');
      return themeList.find(item => item.id === id)?.name || id;
    }
    if (sectionId === 'ui') return remembered('ui', 'ui_theme', 'Light');
    if (sectionId === 'terminal') {
      const id = remembered('terminal-ssh', TERMINAL_STORAGE.ssh, TERMINAL_DEFAULTS.ssh);
      return terminalList.find(item => item.id === id)?.name || id;
    }
    if (sectionId === 'statusbar') {
      const id = remembered('statusbar-theme', 'basicapp_statusbar_theme', 'Default Dark');
      return statusColorList.find(item => item.id === id)?.name || id;
    }
    if (sectionId === 'sessions') {
      const id = remembered('tree-theme', 'nodeterm_tree_theme', 'cursorCompact');
      return treeThemeOptions.find(item => item.value === id)?.label || id;
    }
    if (sectionId === 'apps') {
      const enabled = readAppsConfig();
      const count = APP_CATALOG.filter(app => enabled[app.id]).length;
      return t('settings.quickPanel.appsActive', { count });
    }
    if (sectionId === 'import') {
      const section = SECTIONS.find(item => item.id === sectionId);
      return section?.descKey ? t(section.descKey) : '';
    }
    return '';
  }

  function readAppsConfig() {
    if (picked.apps) return picked.apps;
    try {
      const parsed = JSON.parse(localStorage.getItem(AI_CLIENTS_STORAGE_KEY) || '{}');
      return {
        guacamole: !!parsed.guacamole,
        cygwin: !!parsed.cygwin,
        browser: parsed.browser !== false,
        claude: !!parsed.claude,
        opencode: !!parsed.opencode,
        codexcli: !!parsed.codexcli,
        antigravitycli: !!parsed.antigravitycli,
        hermescli: !!parsed.hermescli,
        anythingllm: !!parsed.anythingllm,
        openwebui: !!parsed.openwebui,
        librechat: !!parsed.librechat,
        agentzero: !!parsed.agentzero,
        openclaw: !!parsed.openclaw,
        opennotebook: !!parsed.opennotebook
      };
    } catch {
      return { browser: true };
    }
  }

  function saveAppsConfig(next) {
    picked.apps = next;
    try {
      localStorage.setItem(AI_CLIENTS_STORAGE_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('ai-clients-config-changed', {
      detail: { config: next }
    }));
  }

  function toggleApp(appId) {
    const current = { ...readAppsConfig() };
    const nextEnabled = !current[appId];
    current[appId] = nextEnabled;
    if (appId === 'guacamole') current.rdp = nextEnabled;
    saveAppsConfig(current);
    if (appId === 'guacamole' && window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.invoke(nextEnabled ? 'guacamole:start' : 'guacamole:stop').catch(() => {});
    }
    refreshSelection();
  }

  function openSettingsTab(tab) {
    close();
    window.dispatchEvent(new CustomEvent('open-settings-tab', {
      detail: { tab, mainTab: tab }
    }));
  }

  function activeSection() {
    return SECTIONS.find(section => section.id === state.section) || SECTIONS[0];
  }

  function matchesQuery(parts) {
    const needle = norm(state.query).trim();
    if (!needle) return true;
    return parts.some(part => norm(part).includes(needle));
  }

  function renderHeader() {
    header.replaceChildren();
    const text = el('div', 'aqp-header-text');
    text.append(el('div', 'aqp-title', t('settings.sidebar.appearance')));
    text.append(el('div', 'aqp-subtitle', t(activeSection().labelKey)));
    const closeBtn = el('button', 'aqp-icon-btn');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', t('common.buttons.close'));
    closeBtn.append(el('i', 'pi pi-times'));
    closeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      close();
    });
    header.append(text, closeBtn);
  }

  function renderRail() {
    rail.replaceChildren();
    RAIL_GROUPS.forEach((group) => {
      rail.append(el('div', 'aqp-rail-group', t(group.labelKey)));
      group.sections.forEach((section) => {
        const button = el('button', `aqp-rail-item${section.id === state.section ? ' is-active' : ''}`);
        button.type = 'button';
        button.append(el('i', `pi ${section.icon}`));
        const copy = el('span', 'aqp-rail-copy');
        copy.append(el('span', 'aqp-rail-label', t(section.labelKey)));
        copy.append(el('span', 'aqp-rail-value', sectionValue(section.id)));
        button.append(copy);
        button.addEventListener('click', (ev) => {
          ev.stopPropagation();
          state.section = section.id;
          state.chip = section.chips ? section.chips[0].id : null;
          state.query = '';
          renderHeader();
          renderRail();
          renderStage();
          positionPanel();
        });
        rail.append(button);
      });
    });
  }

  function renderStage() {
    stage.replaceChildren();
    const section = activeSection();
    const head = el('div', 'aqp-stage-head');
    head.append(el('div', 'aqp-title', t(section.labelKey)));
    if (section.chips) {
      if (!section.chips.some(chip => chip.id === state.chip)) {
        state.chip = section.chips[0].id;
      }
      const chips = el('div', 'aqp-chips');
      section.chips.forEach((chip) => {
        const button = el('button', `aqp-chip${chip.id === state.chip ? ' is-active' : ''}`, t(chip.labelKey));
        button.type = 'button';
        button.addEventListener('click', (ev) => {
          ev.stopPropagation();
          state.chip = chip.id;
          state.query = '';
          renderStage();
          positionPanel();
        });
        chips.append(button);
      });
      head.append(chips);
    }
    stage.append(head);

    const search = el('div', 'aqp-search');
    search.append(el('i', 'pi pi-search'));
    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'aqp-search-input';
    input.placeholder = t('settings.quickPanel.search');
    input.value = state.query;
    input.addEventListener('click', (ev) => ev.stopPropagation());
    input.addEventListener('input', () => {
      state.query = input.value;
      fillGrid();
      positionPanel();
    });
    search.append(input);
    stage.append(search);

    gridEl = el('div', 'aqp-gallery aqp-gallery--grid');
    const body = el('div', 'aqp-body');
    body.append(gridEl);
    stage.append(body);
    fillGrid();
    setTimeout(() => input.focus(), 0);
  }

  function refreshSelection() {
    renderHeader();
    renderRail();
    fillGrid();
    positionPanel();
  }

  function makeCard({ active, preview, name, description, row, onPick }) {
    const card = el('button', `aqp-gallery-card${row ? ' aqp-gallery-card--row' : ''}`);
    card.type = 'button';
    if (active) card.classList.add('is-active');
    if (row) {
      const copy = el('div', 'aqp-gallery-copy');
      copy.append(el('span', 'aqp-gallery-name', name));
      if (description) copy.append(el('span', 'aqp-gallery-desc', description));
      card.append(preview, copy);
      if (active) card.append(el('i', 'pi pi-check aqp-check'));
    } else {
      const label = el('div', 'aqp-gallery-label');
      label.append(el('span', 'aqp-gallery-name', name));
      if (active) label.append(el('i', 'pi pi-check aqp-check'));
      card.append(preview, label);
    }
    card.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onPick();
    });
    return card;
  }

  function currentCatalog() {
    const section = state.section;
    const chip = state.chip;

    if (section === 'tabs' && chip === 'styles') {
      const current = readStorage(TAB_LAYOUT_STORAGE_KEY, 'default');
      return {
        stacked: true,
        cards: layoutList.filter(item => matchesQuery([item.name, item.description])).map(item => makeCard({
          active: item.id === current,
          row: true,
          name: item.name,
          description: item.description,
          preview: createLayoutMock(item.preview?.borderStyle, false),
          onPick: () => {
            applyTabLayout(item.id);
            localStorage.setItem(TAB_LAYOUT_STORAGE_KEY, item.id);
            refreshSelection();
          }
        }))
      };
    }

    if (section === 'tabs') {
      const current = readStorage(TAB_THEME_STORAGE_KEY, 'default');
      return {
        stacked: false,
        cards: themeList.filter(item => matchesQuery([item.name, item.id])).map(item => makeCard({
          active: item.id === current,
          name: item.name,
          preview: (() => {
            const swatch = el('div', 'aqp-swatch');
            applyTabSwatch(swatch, item.preview);
            return swatch;
          })(),
          onPick: () => {
            applyTabTheme(item.id);
            localStorage.setItem(TAB_THEME_STORAGE_KEY, item.id);
            refreshSelection();
          }
        }))
      };
    }

    if (section === 'ui' && chip === 'styles') {
      const current = remembered('ui-layout', 'ui_layout', getCurrentUILayoutId());
      return {
        stacked: false,
        cards: UI_LAYOUT_OPTIONS.filter(item => matchesQuery([item.name, item.id])).map(item => makeCard({
          active: item.id === current,
          name: item.name,
          preview: (() => {
            const swatch = el('div', 'aqp-swatch aqp-preset-mark');
            swatch.append(el('i', `pi ${item.icon || 'pi-th-large'}`));
            return swatch;
          })(),
          onPick: () => {
            setUILayout(item.id);
            picked['ui-layout'] = item.id;
            refreshSelection();
          }
        }))
      };
    }

    if (section === 'ui' && chip === 'presets') {
      const current = presetManager.getActivePresetId();
      return {
        stacked: true,
        cards: presetManager.getAllPresets().filter(preset => matchesQuery([preset.name, preset.description])).map(preset => makeCard({
          active: preset.id === current,
          row: true,
          name: preset.name,
          description: preset.description,
          preview: el('span', 'aqp-preset-mark', preset.icon || '🎨'),
          onPick: () => {
            presetManager.applyPreset(preset);
            Object.keys(picked).forEach(key => { delete picked[key]; });
            refreshSelection();
          }
        }))
      };
    }

    if (section === 'ui') {
      const current = remembered('ui', 'ui_theme', 'Light');
      return {
        stacked: false,
        cards: uiThemeList.filter(theme => matchesQuery([theme.name])).map(theme => makeCard({
          active: theme.name === current,
          name: theme.name,
          preview: colorSwatch(themePreviewBackground(theme)),
          onPick: () => {
            themeManager.applyTheme(theme.name);
            picked.ui = theme.name;
            refreshSelection();
          }
        }))
      };
    }

    if (section === 'terminal') {
      const type = chip || 'ssh';
      const current = remembered(`terminal-${type}`, TERMINAL_STORAGE[type], TERMINAL_DEFAULTS[type]);
      return {
        stacked: false,
        cards: terminalList.filter(item => matchesQuery([item.name])).map(item => makeCard({
          active: item.id === current || item.name === current,
          name: item.name,
          preview: terminalSwatch(item.raw),
          onPick: () => {
            picked[`terminal-${type}`] = item.id;
            publishCatalog(`terminal-${type}`, item.id);
            refreshSelection();
          }
        }))
      };
    }

    if (section === 'statusbar' && chip === 'icons') {
      const current = remembered('statusbar-icons', 'basicapp_statusbar_icon_theme', 'classic');
      return {
        stacked: false,
        cards: statusIconList.filter(item => matchesQuery([item.name])).map(item => makeCard({
          active: item.id === current,
          name: item.name,
          preview: dotSwatch(item.raw.colors),
          onPick: () => {
            picked['statusbar-icons'] = item.id;
            publishCatalog('statusbar-icons', item.id);
            refreshSelection();
          }
        }))
      };
    }

    if (section === 'statusbar') {
      const current = remembered('statusbar-theme', 'basicapp_statusbar_theme', 'Default Dark');
      return {
        stacked: false,
        cards: statusColorList.filter(item => matchesQuery([item.name])).map(item => makeCard({
          active: item.id === current,
          name: item.name,
          preview: dotSwatch({
            cpu: item.raw.colors?.cpuBarColor,
            memory: item.raw.colors?.memoryBarColor,
            disk: item.raw.colors?.diskBarColor
          }, item.raw.colors?.background),
          onPick: () => {
            statusBarThemeManager.applyTheme(item.id);
            picked['statusbar-theme'] = item.id;
            publishCatalog('statusbar-theme', item.id);
            refreshSelection();
          }
        }))
      };
    }

    if (section === 'sessions' && chip === 'icons') {
      const current = remembered('icon-theme-sidebar', 'iconThemeSidebar', 'nord');
      return {
        stacked: false,
        cards: sidebarIconList.filter(item => matchesQuery([item.name])).map(item => makeCard({
          active: item.id === current,
          name: item.name,
          preview: colorSwatch('color-mix(in srgb, var(--primary-color, #5b8def) 28%, transparent)'),
          onPick: () => {
            picked['icon-theme-sidebar'] = item.id;
            publishCatalog('icon-theme-sidebar', item.id);
            refreshSelection();
          }
        }))
      };
    }

    if (section === 'sessions' && chip === 'actions') {
      const current = remembered('session-action-icons', 'sessionActionIconTheme', 'classic');
      return {
        stacked: true,
        cards: sessionActionList.filter(item => matchesQuery([item.name, item.description])).map(item => makeCard({
          active: item.id === current,
          row: true,
          name: item.name,
          description: item.description,
          preview: colorSwatch('color-mix(in srgb, var(--primary-color, #5b8def) 28%, transparent)'),
          onPick: () => {
            picked['session-action-icons'] = item.id;
            publishCatalog('session-action-icons', item.id);
            refreshSelection();
          }
        }))
      };
    }

    if (section === 'sessions') {
      const current = remembered('tree-theme', 'nodeterm_tree_theme', 'cursorCompact');
      return {
        stacked: true,
        cards: treeThemeOptions.filter(item => matchesQuery([item.label, item.description])).map(item => makeCard({
          active: item.value === current,
          row: true,
          name: item.label,
          description: item.description,
          preview: colorSwatch('color-mix(in srgb, var(--ui-tab-text, #fff) 10%, transparent)'),
          onPick: () => {
            picked['tree-theme'] = item.value;
            publishCatalog('tree-theme', item.value);
            refreshSelection();
          }
        }))
      };
    }

    if (section === 'apps') {
      const enabled = readAppsConfig();
      const filter = chip && chip !== 'all' ? chip : null;
      const apps = APP_CATALOG
        .filter(app => !filter || app.category === filter)
        .filter(app => matchesQuery([app.name, app.description, app.category]));
      return {
        mode: 'apps',
        cards: apps.map((app) => {
          const active = !!enabled[app.id];
          const card = el('button', `aqp-app-card${active ? ' is-active' : ''}`);
          card.type = 'button';
          card.style.setProperty('--aqp-app-color', app.color);
          const top = el('div', 'aqp-app-top');
          const badge = el('span', 'aqp-app-badge', app.short);
          badge.style.background = app.color;
          const copy = el('div', 'aqp-app-copy');
          copy.append(el('span', 'aqp-app-name', app.name));
          copy.append(el('span', 'aqp-app-desc', app.description));
          top.append(badge, copy);
          const foot = el('div', 'aqp-app-foot');
          foot.append(el('span', 'aqp-app-tag', active
            ? t('settings.quickPanel.enabled')
            : t('settings.quickPanel.disabled')));
          const sw = el('span', `aqp-switch${active ? ' is-on' : ''}`);
          foot.append(sw);
          card.append(top, foot);
          card.addEventListener('click', (ev) => {
            ev.stopPropagation();
            toggleApp(app.id);
          });
          return card;
        })
      };
    }

    if (section === 'import') {
      const card = el('button', 'aqp-link-card');
      card.type = 'button';
      card.append(el('i', 'pi pi-arrow-right-arrow-left'));
      card.append(el('span', 'aqp-app-name', t('settings.sidebar.importExport')));
      card.append(el('span', 'aqp-app-desc', t('settings.sidebarDescriptions.importExport')));
      card.append(el('span', 'aqp-app-tag', t('settings.quickPanel.openInSettings')));
      card.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openSettingsTab('importar-exportar');
      });
      return { mode: 'apps', cards: [card] };
    }

    return { stacked: false, cards: [] };
  }

  function fillGrid() {
    if (!gridEl) return;
    const catalog = currentCatalog();
    gridEl.className = catalog.mode === 'apps'
      ? 'aqp-gallery aqp-gallery--apps'
      : (catalog.stacked ? 'aqp-gallery aqp-gallery--stack' : 'aqp-gallery aqp-gallery--grid');
    gridEl.replaceChildren();
    if (!catalog.cards.length) {
      gridEl.append(el('div', 'aqp-empty', t('settings.quickPanel.noResults')));
      return;
    }
    catalog.cards.forEach(card => gridEl.append(card));
  }

  function render() {
    renderHeader();
    renderRail();
    renderStage();
    positionPanel();
  }

  document.body.appendChild(panel);
  render();

  setTimeout(() => document.addEventListener('click', onOutside), 0);
  document.addEventListener('keydown', onKey);
}
