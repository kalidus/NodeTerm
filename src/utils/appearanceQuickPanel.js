import { themeManager } from './themeManager';
import { uiThemes } from '../themes/ui-themes';
import { presetManager } from './presetManager';
import { applyTabTheme, getTabThemeList, applyTabLayout, getTabLayoutList } from './tabThemeLoader';
import { setUILayout, UI_LAYOUT_OPTIONS, getCurrentUILayoutId } from './appearanceLayout';
import { getAvailableFonts } from './fontsList';
import { themes } from '../themes';
import { statusBarThemes } from '../themes/status-bar-themes';
import { statusBarIconThemes } from '../themes/statusbar-icon-themes';
import { statusBarThemeManager } from './statusBarThemeManager';
import i18n from '../i18n';

const TAB_THEME_STORAGE_KEY = 'nodeterm_tab_theme';
const TAB_LAYOUT_STORAGE_KEY = 'nodeterm_tab_layout';
const AQP_SIZE_STORAGE_KEY = 'nodeterm_aqp_size';
const AQP_DEFAULT_SIZE = { width: 920, height: 720 };
const AQP_MIN_SIZE = { width: 560, height: 400 };
const AQP_MARGIN = 8;

const AQP_RESIZE_DIRECTIONS = [
  'right',
  'left',
  'bottom',
  'top',
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left'
];

function clampAqpSize(width, height) {
  const maxWidth = Math.max(AQP_MIN_SIZE.width, window.innerWidth - AQP_MARGIN * 2);
  const maxHeight = Math.max(AQP_MIN_SIZE.height, window.innerHeight - AQP_MARGIN * 2);
  return {
    width: Math.round(Math.min(maxWidth, Math.max(AQP_MIN_SIZE.width, width))),
    height: Math.round(Math.min(maxHeight, Math.max(AQP_MIN_SIZE.height, height)))
  };
}

function loadAqpSize() {
  try {
    const raw = localStorage.getItem(AQP_SIZE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
        return clampAqpSize(parsed.width, parsed.height);
      }
    }
  } catch (_) {
    /* ignore */
  }
  return clampAqpSize(AQP_DEFAULT_SIZE.width, AQP_DEFAULT_SIZE.height);
}

function saveAqpSize(width, height) {
  try {
    localStorage.setItem(AQP_SIZE_STORAGE_KEY, JSON.stringify(clampAqpSize(width, height)));
  } catch (_) {
    /* ignore */
  }
}

function aqpResizeCursor(direction) {
  if (direction.includes('top') && direction.includes('left')) return 'nw-resize';
  if (direction.includes('top') && direction.includes('right')) return 'ne-resize';
  if (direction.includes('bottom') && direction.includes('left')) return 'sw-resize';
  if (direction.includes('bottom') && direction.includes('right')) return 'se-resize';
  if (direction.includes('top') || direction.includes('bottom')) return 'ns-resize';
  if (direction.includes('left') || direction.includes('right')) return 'ew-resize';
  return 'default';
}

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

const TERMINAL_FONT_KEYS = {
  ssh: { family: 'basicapp_terminal_font_family', size: 'basicapp_terminal_font_size', catalogFamily: 'font-ssh', catalogSize: 'fontSize-ssh' },
  powershell: { family: 'basicapp_local_terminal_font_family', size: 'basicapp_local_terminal_font_size', catalogFamily: 'font-powershell', catalogSize: 'fontSize-powershell' },
  linux: { family: 'nodeterm_linux_font_family', size: 'nodeterm_linux_font_size', catalogFamily: 'font-linux', catalogSize: 'fontSize-linux' },
  docker: { family: 'nodeterm_docker_font_family', size: 'nodeterm_docker_font_size', catalogFamily: 'font-docker', catalogSize: 'fontSize-docker' }
};

const TERMINAL_TYPE_CHIPS = [
  { id: 'ssh', labelKey: 'settings.quickPanel.chips.ssh' },
  { id: 'powershell', labelKey: 'settings.quickPanel.chips.powershell' },
  { id: 'linux', labelKey: 'settings.quickPanel.chips.linux' },
  { id: 'docker', labelKey: 'settings.quickPanel.chips.docker' }
];

const CURSOR_STYLES = [
  { id: 'bar', labelKey: 'settings.quickPanel.terminal.cursorBar' },
  { id: 'block', labelKey: 'settings.quickPanel.terminal.cursorBlock' },
  { id: 'underline', labelKey: 'settings.quickPanel.terminal.cursorUnderline' }
];

const SCROLLBACK_OPTIONS = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];

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
          { id: 'themes', labelKey: 'settings.quickPanel.chips.themes' },
          { id: 'global', labelKey: 'settings.quickPanel.chips.global' },
          { id: 'typography', labelKey: 'settings.quickPanel.chips.typography' }
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
  const picked = {};
  const availableFonts = getAvailableFonts();
  const state = {
    section: 'ui',
    chip: 'themes',
    termType: 'ssh',
    query: ''
  };

  const panel = document.createElement('div');
  panel.id = 'tab-appearance-quick-panel';
  panel.className = 'aqp';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', t('settings.sidebar.appearance'));

  const initialSize = loadAqpSize();
  panel.style.width = `${initialSize.width}px`;
  panel.style.height = `${initialSize.height}px`;

  const header = el('div', 'aqp-header');
  const studio = el('div', 'aqp-studio');
  const rail = el('nav', 'aqp-rail');
  const stage = el('div', 'aqp-stage');
  studio.append(rail, stage);
  panel.append(header, studio);

  const openedAt = Date.now();
  let gridEl = null;
  let resizeState = null;
  let resizedAt = 0;
  let onResizeMove = null;
  let onResizeEnd = null;

  const stopResizeListeners = () => {
    if (onResizeMove) document.removeEventListener('mousemove', onResizeMove);
    if (onResizeEnd) document.removeEventListener('mouseup', onResizeEnd);
    onResizeMove = null;
    onResizeEnd = null;
    resizeState = null;
    panel.classList.remove('is-resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const close = () => {
    panel._aqpCleanup?.();
    panel.remove();
  };
  panel._aqpCleanup = () => {
    document.removeEventListener('click', onOutside);
    document.removeEventListener('keydown', onKey);
    stopResizeListeners();
  };

  const onOutside = (ev) => {
    if (Date.now() - openedAt < 150) return;
    if (resizeState || Date.now() - resizedAt < 200) return;
    if (!panel.contains(ev.target) && !anchorEl.contains(ev.target)) close();
  };

  const onKey = (ev) => {
    if (ev.key === 'Escape') close();
  };

  function positionPanel() {
    const margin = AQP_MARGIN;
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

  function startAqpResize(ev, direction) {
    ev.preventDefault();
    ev.stopPropagation();
    const rect = panel.getBoundingClientRect();
    resizeState = {
      direction,
      startX: ev.clientX,
      startY: ev.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startLeft: rect.left,
      startTop: rect.top
    };
    panel.classList.add('is-resizing');
    document.body.style.cursor = aqpResizeCursor(direction);
    document.body.style.userSelect = 'none';

    onResizeMove = (moveEv) => {
      if (!resizeState) return;
      const {
        direction: dir,
        startX,
        startY,
        startWidth,
        startHeight,
        startLeft,
        startTop
      } = resizeState;
      const deltaX = moveEv.clientX - startX;
      const deltaY = moveEv.clientY - startY;
      const maxWidth = Math.max(AQP_MIN_SIZE.width, window.innerWidth - AQP_MARGIN * 2);
      const maxHeight = Math.max(AQP_MIN_SIZE.height, window.innerHeight - AQP_MARGIN * 2);

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;

      if (dir.includes('right')) {
        newWidth = Math.max(AQP_MIN_SIZE.width, Math.min(maxWidth, startWidth + deltaX));
      } else if (dir.includes('left')) {
        newWidth = Math.max(AQP_MIN_SIZE.width, Math.min(maxWidth, startWidth - deltaX));
        newLeft = startLeft - (newWidth - startWidth);
      }

      if (dir.includes('bottom')) {
        newHeight = Math.max(AQP_MIN_SIZE.height, Math.min(maxHeight, startHeight + deltaY));
      } else if (dir.includes('top')) {
        newHeight = Math.max(AQP_MIN_SIZE.height, Math.min(maxHeight, startHeight - deltaY));
        newTop = startTop - (newHeight - startHeight);
      }

      panel.style.width = `${Math.round(newWidth)}px`;
      panel.style.height = `${Math.round(newHeight)}px`;
      if (dir.includes('left')) panel.style.left = `${Math.round(newLeft)}px`;
      if (dir.includes('top')) panel.style.top = `${Math.round(newTop)}px`;
    };

    onResizeEnd = () => {
      if (resizeState) {
        saveAqpSize(panel.offsetWidth, panel.offsetHeight);
        resizedAt = Date.now();
      }
      stopResizeListeners();
    };

    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
  }

  AQP_RESIZE_DIRECTIONS.forEach((direction) => {
    const handle = el('div', `aqp-resize-handle aqp-resize-handle-${direction}`);
    handle.addEventListener('mousedown', (ev) => startAqpResize(ev, direction));
    panel.append(handle);
  });

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

    const showTermTypes = section.id === 'terminal' && (state.chip === 'themes' || state.chip === 'typography');
    if (showTermTypes) {
      if (!TERMINAL_TYPE_CHIPS.some(chip => chip.id === state.termType)) {
        state.termType = 'ssh';
      }
      const typeChips = el('div', 'aqp-chips aqp-chips--secondary');
      TERMINAL_TYPE_CHIPS.forEach((chip) => {
        const button = el('button', `aqp-chip${chip.id === state.termType ? ' is-active' : ''}`, t(chip.labelKey));
        button.type = 'button';
        button.addEventListener('click', (ev) => {
          ev.stopPropagation();
          state.termType = chip.id;
          state.query = '';
          renderStage();
          positionPanel();
        });
        typeChips.append(button);
      });
      head.append(typeChips);
    }
    stage.append(head);

    const hideSearch = section.id === 'terminal' && state.chip === 'global';
    let input = null;
    if (!hideSearch) {
      const search = el('div', 'aqp-search');
      search.append(el('i', 'pi pi-search'));
      input = document.createElement('input');
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
    }

    gridEl = el('div', 'aqp-gallery aqp-gallery--grid');
    const body = el('div', 'aqp-body');
    body.append(gridEl);
    stage.append(body);
    fillGrid();
    if (input) setTimeout(() => input.focus(), 0);
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

  function formRow(label, control) {
    const row = el('div', 'aqp-form-row');
    row.append(el('span', 'aqp-form-label', label));
    row.append(control);
    return row;
  }

  function buildToggle(isOn, onToggle) {
    const track = el('button', `aqp-switch${isOn ? ' is-on' : ''}`);
    track.type = 'button';
    track.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onToggle(!isOn);
    });
    return track;
  }

  function buildTerminalGlobalForm() {
    const form = el('div', 'aqp-form-card');
    form.addEventListener('click', (ev) => ev.stopPropagation());

    let cursorStyle = readStorage('nodeterm_cursor_style', 'bar');
    let cursorBlink = readStorage('nodeterm_cursor_blink', 'true') !== 'false';
    let scrollback = parseInt(readStorage('nodeterm_scrollback_lines', '2000'), 10) || 2000;
    let localEcho = readStorage('nodeterm_ssh_local_echo', 'false') === 'true';
    let logHighlight = readStorage('nodeterm_ssh_log_highlight', 'true') !== 'false';

    const cursorGroup = el('div', 'aqp-option-group');
    CURSOR_STYLES.forEach((style) => {
      const button = el('button', `aqp-option-btn${style.id === cursorStyle ? ' is-active' : ''}`, t(style.labelKey));
      button.type = 'button';
      button.addEventListener('click', (ev) => {
        ev.stopPropagation();
        cursorStyle = style.id;
        localStorage.setItem('nodeterm_cursor_style', style.id);
        window.dispatchEvent(new CustomEvent('terminal-settings-changed', { detail: { cursorStyle: style.id } }));
        refreshSelection();
      });
      cursorGroup.append(button);
    });
    form.append(formRow(t('settings.quickPanel.terminal.cursor'), cursorGroup));

    form.append(formRow(
      t('settings.quickPanel.terminal.blink'),
      buildToggle(cursorBlink, (value) => {
        localStorage.setItem('nodeterm_cursor_blink', String(value));
        window.dispatchEvent(new CustomEvent('terminal-settings-changed', { detail: { cursorBlink: value } }));
        refreshSelection();
      })
    ));

    const historySelect = document.createElement('select');
    historySelect.className = 'aqp-select';
    SCROLLBACK_OPTIONS.forEach((value) => {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = value.toLocaleString();
      if (value === scrollback) option.selected = true;
      historySelect.append(option);
    });
    if (!SCROLLBACK_OPTIONS.includes(scrollback)) {
      const option = document.createElement('option');
      option.value = String(scrollback);
      option.textContent = scrollback.toLocaleString();
      option.selected = true;
      historySelect.append(option);
    }
    historySelect.addEventListener('change', () => {
      const value = parseInt(historySelect.value, 10);
      localStorage.setItem('nodeterm_scrollback_lines', String(value));
      window.dispatchEvent(new CustomEvent('terminal-settings-changed', { detail: { scrollback: value } }));
      refreshSelection();
    });
    form.append(formRow(t('settings.quickPanel.terminal.history'), historySelect));

    form.append(formRow(
      t('settings.quickPanel.terminal.localEcho'),
      buildToggle(localEcho, (value) => {
        localStorage.setItem('nodeterm_ssh_local_echo', String(value));
        window.dispatchEvent(new CustomEvent('terminal-settings-changed', { detail: { sshLocalEcho: value } }));
        refreshSelection();
      })
    ));

    form.append(formRow(
      t('settings.quickPanel.terminal.logHighlight'),
      buildToggle(logHighlight, (value) => {
        localStorage.setItem('nodeterm_ssh_log_highlight', String(value));
        window.dispatchEvent(new CustomEvent('terminal-settings-changed', { detail: { sshLogHighlight: value } }));
        refreshSelection();
      })
    ));

    return form;
  }

  function buildTerminalTypographyCatalog() {
    const type = state.termType || 'ssh';
    const keys = TERMINAL_FONT_KEYS[type];
    const currentFont = remembered(`font-${type}`, keys.family, availableFonts[0]?.value || 'Consolas');
    const currentSize = parseInt(remembered(`fontSize-${type}`, keys.size, '14'), 10) || 14;

    const sizeWrap = el('div', 'aqp-form-card aqp-form-card--compact');
    sizeWrap.addEventListener('click', (ev) => ev.stopPropagation());
    const sizeLabel = el('div', 'aqp-form-label', `${t('settings.quickPanel.terminal.fontSize')}: ${currentSize}px`);
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '8';
    slider.max = '32';
    slider.value = String(currentSize);
    slider.className = 'aqp-range';
    slider.addEventListener('input', () => {
      const value = parseInt(slider.value, 10);
      sizeLabel.textContent = `${t('settings.quickPanel.terminal.fontSize')}: ${value}px`;
    });
    slider.addEventListener('change', () => {
      const value = parseInt(slider.value, 10);
      picked[`fontSize-${type}`] = String(value);
      localStorage.setItem(keys.size, String(value));
      publishCatalog(keys.catalogSize, value);
      window.dispatchEvent(new CustomEvent('terminal-settings-changed', {
        detail: { fontSize: value, terminalType: type }
      }));
      refreshSelection();
    });
    sizeWrap.append(sizeLabel, slider);

    const fontCards = availableFonts
      .filter(font => matchesQuery([font.label, font.value]))
      .map((font) => {
        const preview = el('div', 'aqp-font-preview', 'Aa Bb 123');
        preview.style.fontFamily = font.value;
        return makeCard({
          active: font.value === currentFont,
          name: font.label,
          preview,
          onPick: () => {
            picked[`font-${type}`] = font.value;
            localStorage.setItem(keys.family, font.value);
            publishCatalog(keys.catalogFamily, font.value);
            window.dispatchEvent(new CustomEvent('terminal-settings-changed', {
              detail: { fontFamily: font.value, terminalType: type }
            }));
            refreshSelection();
          }
        });
      });

    return {
      mode: 'typography',
      cards: [sizeWrap, ...fontCards]
    };
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

    if (section === 'terminal' && chip === 'global') {
      return { mode: 'form', cards: [buildTerminalGlobalForm()] };
    }

    if (section === 'terminal' && chip === 'typography') {
      return buildTerminalTypographyCatalog();
    }

    if (section === 'terminal') {
      const type = state.termType || 'ssh';
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
    if (catalog.mode === 'apps') {
      gridEl.className = 'aqp-gallery aqp-gallery--apps';
    } else if (catalog.mode === 'form') {
      gridEl.className = 'aqp-gallery aqp-gallery--form';
    } else if (catalog.mode === 'typography') {
      gridEl.className = 'aqp-gallery aqp-gallery--typography';
    } else if (catalog.stacked) {
      gridEl.className = 'aqp-gallery aqp-gallery--stack';
    } else {
      gridEl.className = 'aqp-gallery aqp-gallery--grid';
    }
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
