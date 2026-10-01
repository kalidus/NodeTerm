import { STORAGE_KEYS } from './constants';
import { persistSyncedSetting } from './persistSyncedSetting';

export const HOME_BACKDROP_BLUR_KEY = 'nodeterm_home_backdrop_blur';
export const HOME_BACKDROP_BLUR_DEFAULT = 8;
export const HOME_BACKDROP_BLUR_MAX = 40;

/** Claves de opciones del panel Home sincronizadas entre instancias. */
export const HOME_TAB_SYNC_KEYS = [
  'nodeterm_terminal_opacity',
  HOME_BACKDROP_BLUR_KEY,
  STORAGE_KEYS.TERMINAL_FRAME_STYLE,
  STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_TABS_VISIBLE,
  STORAGE_KEYS.HOME_TAB_STATUS_BAR_VISIBLE,
  STORAGE_KEYS.HOME_TAB_RIGHT_COLUMN_VISIBLE,
  STORAGE_KEYS.HOME_TAB_RIGHT_COLUMN_COLLAPSED,
  STORAGE_KEYS.HOME_TAB_CARD_VISIBLE,
  STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE,
  STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_WORKSPACE,
  STORAGE_KEYS.HOME_TAB_DOCK_PINS,
  STORAGE_KEYS.HOME_TAB_JUMP_PINS,
  STORAGE_KEYS.LAUNCHER_ACTION_PINS,
  STORAGE_KEYS.HOME_TAB_HIDE_NON_TERMINAL_HEADERS,
  STORAGE_KEYS.MINIMAL_MODE,
  'localLinuxTerminalTheme'
];

export function clampHomeBackdropBlur(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return HOME_BACKDROP_BLUR_DEFAULT;
  return Math.min(HOME_BACKDROP_BLUR_MAX, Math.max(0, Math.round(n)));
}

export function homeBackdropFilter(px, saturate) {
  const n = clampHomeBackdropBlur(px);
  if (n <= 0) return 'none';
  return saturate ? `blur(${n}px) saturate(${saturate}%)` : `blur(${n}px)`;
}

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
