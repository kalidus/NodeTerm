import { STORAGE_KEYS } from './constants';
import { persistSyncedSetting } from './persistSyncedSetting';

/** Claves de opciones del panel Home sincronizadas entre instancias. */
export const HOME_TAB_SYNC_KEYS = [
  'nodeterm_terminal_opacity',
  STORAGE_KEYS.TERMINAL_FRAME_STYLE,
  STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_TABS_VISIBLE,
  STORAGE_KEYS.HOME_TAB_STATUS_BAR_VISIBLE,
  STORAGE_KEYS.HOME_TAB_RIGHT_COLUMN_VISIBLE,
  STORAGE_KEYS.HOME_TAB_RIGHT_COLUMN_COLLAPSED,
  STORAGE_KEYS.HOME_TAB_CARD_VISIBLE,
  STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE,
  STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_WORKSPACE,
  STORAGE_KEYS.MINIMAL_MODE,
  'localLinuxTerminalTheme'
];

export function persistHomeTabSetting(key, value) {
  persistSyncedSetting(key, value);
}

export function readBoolSetting(key, defaultValue = false) {
  try {
    const saved = localStorage.getItem(key);
    return saved !== null ? saved === 'true' : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function readFloatSetting(key, defaultValue) {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return defaultValue;
    const val = parseFloat(saved);
    return Number.isNaN(val) ? defaultValue : val;
  } catch {
    return defaultValue;
  }
}

export function readStringSetting(key, defaultValue) {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch {
    return defaultValue;
  }
}
