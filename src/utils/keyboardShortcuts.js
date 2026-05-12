import { STORAGE_KEYS } from './constants';

export function getDefaultConnectionSearchShortcut() {
  const platform = typeof window !== 'undefined' && window.electron?.platform
    ? window.electron.platform
    : (typeof process !== 'undefined' && process.platform ? process.platform : 'win32');

  if (platform === 'darwin') {
    return {
      meta: true,
      ctrl: false,
      alt: false,
      shift: false,
      code: 'Space',
    };
  }

  return {
    meta: false,
    ctrl: true,
    alt: false,
    shift: false,
    code: 'Space',
  };
}

export const DEFAULT_CONNECTION_SEARCH_SHORTCUT = getDefaultConnectionSearchShortcut();
const DISALLOWED_CODES = new Set([
  'Escape',
  'Tab',
  'CapsLock',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'ContextMenu',
]);

const CODE_LABELS = {
  Space: 'Espacio',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Backspace: 'Retroceso',
  Delete: 'Supr',
  Enter: 'Intro',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
};

function normalizeShortcut(shortcut) {
  if (!shortcut || typeof shortcut !== 'object') {
    return getDefaultConnectionSearchShortcut();
  }

  const fallback = getDefaultConnectionSearchShortcut();
  return {
    meta: !!shortcut.meta,
    ctrl: !!shortcut.ctrl,
    alt: !!shortcut.alt,
    shift: !!shortcut.shift,
    code: typeof shortcut.code === 'string' && shortcut.code ? shortcut.code : fallback.code,
  };
}

function shouldMigrateWindowsMetaSpaceShortcut(raw) {
  const platform = typeof window !== 'undefined' ? (window.electron?.platform || '') : '';
  if (platform !== 'win32') {
    return false;
  }

  try {
    const parsed = normalizeShortcut(JSON.parse(raw));
    return parsed.meta
      && !parsed.ctrl
      && !parsed.alt
      && !parsed.shift
      && parsed.code === 'Space';
  } catch {
    return false;
  }
}

export function getConnectionSearchShortcut() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONNECTION_SEARCH_SHORTCUT);
    if (!raw) {
      return getDefaultConnectionSearchShortcut();
    }

    if (shouldMigrateWindowsMetaSpaceShortcut(raw)) {
      const migrated = getDefaultConnectionSearchShortcut();
      localStorage.setItem(STORAGE_KEYS.CONNECTION_SEARCH_SHORTCUT, JSON.stringify(migrated));
      return migrated;
    }

    return normalizeShortcut(JSON.parse(raw));
  } catch {
    return getDefaultConnectionSearchShortcut();
  }
}
export function setConnectionSearchShortcut(shortcut) {
  const normalized = normalizeShortcut(shortcut);
  localStorage.setItem(STORAGE_KEYS.CONNECTION_SEARCH_SHORTCUT, JSON.stringify(normalized));
  return normalized;
}

export function resetConnectionSearchShortcut() {
  localStorage.removeItem(STORAGE_KEYS.CONNECTION_SEARCH_SHORTCUT);
  return getDefaultConnectionSearchShortcut();
}
export function shortcutFromKeyboardEvent(event) {
  if (!event || typeof event.code !== 'string' || !event.code) {
    return null;
  }

  if (DISALLOWED_CODES.has(event.code)) {
    return null;
  }

  const shortcut = {
    meta: !!event.metaKey,
    ctrl: !!event.ctrlKey,
    alt: !!event.altKey,
    shift: !!event.shiftKey,
    code: event.code,
  };

  if (!shortcut.meta && !shortcut.ctrl && !shortcut.alt) {
    return null;
  }

  return shortcut;
}

export function isValidShortcut(shortcut) {
  const normalized = normalizeShortcut(shortcut);
  if (!normalized.code || DISALLOWED_CODES.has(normalized.code)) {
    return false;
  }
  return normalized.meta || normalized.ctrl || normalized.alt;
}

export function matchesShortcut(event, shortcut) {
  if (!event || !shortcut) {
    return false;
  }

  const normalized = normalizeShortcut(shortcut);
  return (
    !!event.metaKey === normalized.meta
    && !!event.ctrlKey === normalized.ctrl
    && !!event.altKey === normalized.alt
    && !!event.shiftKey === normalized.shift
    && event.code === normalized.code
  );
}

function getModifierLabel(shortcut) {
  const platform = typeof window !== 'undefined'
    ? (window.electron?.platform || navigator.platform || '')
    : '';
  const isMac = /mac/i.test(platform);
  const parts = [];

  if (shortcut.ctrl) {
    parts.push(isMac ? 'Ctrl' : 'Ctrl');
  }
  if (shortcut.alt) {
    parts.push(isMac ? 'Opción' : 'Alt');
  }
  if (shortcut.shift) {
    parts.push(isMac ? 'Mayús' : 'Mayús');
  }
  if (shortcut.meta) {
    parts.push(isMac ? 'Cmd' : 'Win');
  }

  return parts;
}

function getCodeLabel(code) {
  if (!code) {
    return '';
  }

  if (CODE_LABELS[code]) {
    return CODE_LABELS[code];
  }

  if (code.startsWith('Key')) {
    return code.slice(3);
  }
  if (code.startsWith('Digit')) {
    return code.slice(5);
  }
  if (code.startsWith('Numpad')) {
    return `Num ${code.slice(6)}`;
  }
  if (code.startsWith('F') && /^F\d+$/.test(code)) {
    return code;
  }

  return code;
}

export function formatShortcutLabel(shortcut, locale = 'es') {
  const normalized = normalizeShortcut(shortcut);
  const parts = getModifierLabel(normalized);
  const codeLabel = getCodeLabel(normalized.code);

  if (locale.startsWith('en')) {
    const enParts = [];
    if (normalized.ctrl) enParts.push('Ctrl');
    if (normalized.alt) enParts.push('Alt');
    if (normalized.shift) enParts.push('Shift');
    if (normalized.meta) {
      const platform = typeof window !== 'undefined'
        ? (window.electron?.platform || navigator.platform || '')
        : '';
      enParts.push(/mac/i.test(platform) ? 'Cmd' : 'Win');
    }
    const enCode = normalized.code === 'Space' ? 'Space' : getCodeLabel(normalized.code);
    return [...enParts, enCode].join('+');
  }

  return [...parts, codeLabel].join('+');
}

export function shouldIgnoreShortcutTarget(element, event = null) {
  if (!element) {
    return false;
  }

  if (element.closest?.('.connection-search-palette')) {
    return false;
  }

  if (element.closest?.('[data-capturing-shortcut="true"]')) {
    return false;
  }

  const hasModifier = !!(event?.metaKey || event?.ctrlKey || event?.altKey);
  const tagName = element.tagName?.toLowerCase();

  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  if (element.isContentEditable) {
    return true;
  }

  if (hasModifier) {
    return false;
  }

  if (element.closest?.('.xterm')
    || element.closest?.('.xterm-screen')
    || element.closest?.('.guacamole-display')) {
    return true;
  }

  if (element.closest?.('.p-dropdown')
    || element.closest?.('.p-multiselect')
    || element.closest?.('.p-autocomplete')) {
    return true;
  }

  if (element.closest?.('.settings-dialog')) {
    return true;
  }

  return false;
}
