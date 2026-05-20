import { themeManager } from './themeManager';
import { statusBarThemeManager } from './statusBarThemeManager';
import { applyTabTheme, applyTabLayout } from './tabThemeLoader';
import {
  PRESET_STORAGE_KEY,
  ACTIVE_PRESET_STORAGE_KEY,
  PRESET_SETTINGS_KEYS,
  builtinPresets
} from '../themes/presets/index';
import localStorageSyncService from '../services/LocalStorageSyncService';

/**
 * PresetManager handles saving, loading, and applying appearance presets.
 * A preset captures every localStorage key related to appearance and restores
 * them all at once, then fires the necessary events so React and DOM update.
 */
class PresetManager {
  constructor() {
    this._listeners = [];
  }

  // ─── Read ───────────────────────────────────────────────────────────────────

  /**
   * Returns all user-defined presets from localStorage.
   * @returns {Array}
   */
  getUserPresets() {
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Returns builtin + user presets combined.
   * @returns {Array}
   */
  getAllPresets() {
    return [...builtinPresets, ...this.getUserPresets()];
  }

  /**
   * Returns the ID of the currently active preset, or null.
   * @returns {string|null}
   */
  getActivePresetId() {
    return localStorage.getItem(ACTIVE_PRESET_STORAGE_KEY) || null;
  }

  // ─── Save / Delete ───────────────────────────────────────────────────────────

  /**
   * Reads ALL relevant localStorage keys and returns them as a preset object.
   * @param {string} name  - Preset display name
   * @param {string} [icon] - Emoji icon (optional)
   * @returns {Object}
   */
  captureCurrentSettings(name, icon = '⭐') {
    const settings = {};
    PRESET_SETTINGS_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        settings[key] = value;
      }
    });

    return {
      id: `user-${Date.now()}`,
      name,
      icon,
      description: `Preset guardado el ${new Date().toLocaleDateString('es-ES')}`,
      isBuiltin: false,
      settings,
    };
  }

  /**
   * Saves a new user preset, then persists to localStorage.
   * @param {string} name
   * @param {string} [icon]
   * @returns {Object} The saved preset
   */
  saveCurrentAsPreset(name, icon = '⭐') {
    const preset = this.captureCurrentSettings(name, icon);
    const userPresets = this.getUserPresets();
    userPresets.push(preset);
    this._saveUserPresets(userPresets);
    this._notifyChange();
    return preset;
  }

  /**
   * Deletes a user preset by id. Built-in presets cannot be deleted.
   * @param {string} id
   */
  deleteUserPreset(id) {
    const userPresets = this.getUserPresets().filter(p => p.id !== id);
    this._saveUserPresets(userPresets);
    if (this.getActivePresetId() === id) {
      localStorage.removeItem(ACTIVE_PRESET_STORAGE_KEY);
    }
    this._notifyChange();
  }

  /**
   * Renames a user preset.
   * @param {string} id
   * @param {string} newName
   */
  renameUserPreset(id, newName) {
    const userPresets = this.getUserPresets().map(p =>
      p.id === id ? { ...p, name: newName } : p
    );
    this._saveUserPresets(userPresets);
    this._notifyChange();
  }

  /**
   * Overwrites the settings of an existing user preset with the current
   * localStorage values, keeping its name, icon and id intact.
   * @param {string} id
   */
  updateUserPreset(id) {
    const userPresets = this.getUserPresets();
    const index = userPresets.findIndex(p => p.id === id);
    if (index === -1) return;

    const existing = userPresets[index];
    const freshSettings = this.captureCurrentSettings(existing.name, existing.icon);

    userPresets[index] = {
      ...existing,
      settings: freshSettings.settings,
      description: `Actualizado el ${new Date().toLocaleDateString('es-ES')}`,
    };

    this._saveUserPresets(userPresets);
    this._notifyChange();
  }

  // ─── Apply ───────────────────────────────────────────────────────────────────

  /**
   * Applies all settings from a preset: writes to localStorage and fires all
   * necessary DOM events so React state, CSS variables, and xterm all update.
   * @param {Object} preset
   */
  applyPreset(preset) {
    if (!preset || !preset.settings) return;

    // 1. Reset ALL managed keys first, then apply the preset values.
    // This ensures that keys present in a previous preset but absent in the new
    // one are cleared from localStorage (instead of staying from the old preset).
    PRESET_SETTINGS_KEYS.forEach(key => {
      if (!(key in preset.settings)) {
        localStorage.removeItem(key);
      }
    });

    Object.entries(preset.settings).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    });

    // Track whether sidebar font color comes from a preset vs user custom.
    // Preset-sourced overrides should NOT stick when the user changes UI theme manually.
    try {
      const presetSidebarColor = preset.settings['sidebarFontColor'];
      if (presetSidebarColor) {
        localStorage.setItem('sidebarFontColorSource', 'preset');
      } else {
        localStorage.removeItem('sidebarFontColorSource');
      }
    } catch { }

    // 2. Mark this preset as active
    localStorage.setItem(ACTIVE_PRESET_STORAGE_KEY, preset.id);

    // 3. Apply UI theme via ThemeManager (handles CSS custom properties + animations)
    const uiTheme = preset.settings['ui_theme'];
    if (uiTheme && themeManager) {
      themeManager.applyTheme(uiTheme, { source: 'preset', preserveSidebarFontColor: true });
      localStorage.setItem('ui_theme', uiTheme);
    }

    // 4. Apply status bar theme via StatusBarThemeManager
    const statusBarTheme = preset.settings['basicapp_statusbar_theme'];
    if (statusBarTheme && statusBarThemeManager) {
      statusBarThemeManager.applyTheme(statusBarTheme);
    }

    // 5. Apply tab theme and layout
    const tabTheme = preset.settings['nodeterm_tab_theme'];
    if (tabTheme) {
      applyTabTheme(tabTheme);
    }

    const tabLayout = preset.settings['nodeterm_tab_layout'];
    if (tabLayout) {
      applyTabLayout(tabLayout);
    }

    // 6. Fire global events so all React components re-read from localStorage

    // General settings-updated event (triggers useThemeManagement.updateThemesFromSync)
    window.dispatchEvent(new CustomEvent('settings-updated', {
      detail: { source: 'preset' }
    }));

    // UI theme change (updates uiTheme state in useThemeManagement)
    window.dispatchEvent(new Event('theme-changed'));

    // Icon theme change
    window.dispatchEvent(new Event('icon-theme-changed'));

    // Tab theme change
    if (tabTheme) {
      window.dispatchEvent(new CustomEvent('tab-theme-changed', { detail: tabTheme }));
    }

    // Tab layout change
    if (tabLayout) {
      window.dispatchEvent(new CustomEvent('tab-layout-changed', { detail: tabLayout }));
    }

    // Action bar icon theme change (iconos superiores de la sidebar)
    const actionBarIconTheme = preset.settings['actionBarIconTheme'];
    if (actionBarIconTheme) {
      window.dispatchEvent(new CustomEvent('action-bar-icon-theme-changed', {
        detail: { theme: actionBarIconTheme }
      }));
    }

    // Terminal theme change (SSH)
    const terminalTheme = preset.settings['basicapp_terminal_theme'];
    if (terminalTheme) {
      window.dispatchEvent(new CustomEvent('terminal-theme-changed', {
        detail: { theme: terminalTheme, terminalType: 'ssh' }
      }));
    }

    this._notifyChange();

    // 7. Force an immediate sync to app-data.json so that any deleted keys
    // (e.g. sidebarFontColor cleared when switching presets) are persisted
    // before the user can restart the app. The debounced sync (2s) is too slow.
    // forceSync() resets the change-detection snapshot to guarantee the write.
    try {
      localStorageSyncService.forceSync();
    } catch { }
  }

  // ─── Listeners ───────────────────────────────────────────────────────────────

  /**
   * Subscribe to preset list changes (add/delete/apply).
   * @param {Function} fn
   * @returns {Function} Unsubscribe function
   */
  subscribe(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  _saveUserPresets(presets) {
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
    } catch (e) {
      console.error('[PresetManager] Error saving user presets:', e);
    }
  }

  _notifyChange() {
    this._listeners.forEach(fn => {
      try { fn(); } catch { }
    });
  }
}

export const presetManager = new PresetManager();
