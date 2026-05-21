import { STORAGE_KEYS } from './constants';

/**
 * Terminal local por defecto según plataforma (misma lógica que SettingsDialog).
 * @returns {'powershell' | 'linux-terminal'}
 */
export function getDefaultLocalTerminalType() {
  const platform = typeof window !== 'undefined' && window.electron?.platform
    ? window.electron.platform
    : 'unknown';
  if (platform === 'linux' || platform === 'darwin') {
    return 'linux-terminal';
  }
  return 'powershell';
}

/**
 * Lee si el botón de inicio está bloqueado (misma semántica que SettingsDialog).
 */
export function isHomeButtonLocked() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCK_HOME_BUTTON);
    if (saved === null) return true;
    try {
      return JSON.parse(saved) === true;
    } catch {
      return saved === 'true';
    }
  } catch {
    return true;
  }
}

/**
 * Aplica preferencias de homepage solo en primer arranque (claves ausentes).
 * No sobrescribe valores ya guardados por el usuario o importaciones.
 */
export function applyFirstRunHomeTabDefaults() {
  const defaults = {
    [STORAGE_KEYS.HOME_TAB_CARD_VISIBLE]: 'true',
    [STORAGE_KEYS.HOME_TAB_RIGHT_COLUMN_VISIBLE]: 'true',
    [STORAGE_KEYS.HOME_TAB_RIGHT_COLUMN_COLLAPSED]: 'true',
    [STORAGE_KEYS.HOME_TAB_STATUS_BAR_VISIBLE]: 'true',
    [STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_TABS_VISIBLE]: 'false',
    [STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE]: 'false',
    [STORAGE_KEYS.DEFAULT_LOCAL_TERMINAL]: getDefaultLocalTerminalType(),
    [STORAGE_KEYS.LOCK_HOME_BUTTON]: 'true',
    [STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED]: 'true'
  };

  try {
    Object.entries(defaults).forEach(([key, value]) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, value);
      }
    });
  } catch (err) {
    console.warn('[HomeTab] Error aplicando defaults de primera instalación:', err);
  }
}
