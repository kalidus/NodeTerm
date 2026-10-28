import { STORAGE_KEYS } from './constants';
import { getPlatformDefaultTerminalType } from './defaultLocalTerminal';

/**
 * Terminal local por defecto según plataforma (misma lógica que SettingsDialog).
 * @returns {'powershell' | 'linux-terminal'}
 */
export function getDefaultLocalTerminalType() {
  return getPlatformDefaultTerminalType();
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
    [STORAGE_KEYS.HOME_TAB_RIGHT_COLUMN_VISIBLE]: 'false',
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

const MAIN_FRAME_HEADER_MIGRATION_FLAG = 'nodeterm_migrated_main_frame_header_v1';
const USER_PRESETS_STORAGE_KEY = 'nodeterm_user_presets';

/**
 * One-shot: oculta el marco superior en la sesión actual y en presets de usuario
 * antiguos que lo tenían visible. El toggle en Configuración → General sigue disponible.
 */
export function migrateMainFrameHeaderCollapsed() {
  try {
    if (localStorage.getItem(MAIN_FRAME_HEADER_MIGRATION_FLAG) === 'true') return;

    localStorage.setItem(STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED, 'true');

    const raw = localStorage.getItem(USER_PRESETS_STORAGE_KEY);
    if (raw) {
      const presets = JSON.parse(raw);
      if (Array.isArray(presets)) {
        let changed = false;
        const next = presets.map((preset) => {
          if (!preset || typeof preset !== 'object') return preset;
          const settings = preset.settings && typeof preset.settings === 'object'
            ? { ...preset.settings }
            : {};
          if (settings[STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED] === 'true') {
            return preset;
          }
          changed = true;
          settings[STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED] = 'true';
          return { ...preset, settings };
        });
        if (changed) {
          localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(next));
        }
      }
    }

    localStorage.setItem(MAIN_FRAME_HEADER_MIGRATION_FLAG, 'true');
  } catch (err) {
    console.warn('[HomeTab] Error migrando marco superior en presets:', err);
  }
}
