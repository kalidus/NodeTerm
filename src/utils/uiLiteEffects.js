/**
 * Perfil de efectos ligeros: apaga backdrop-filter / glass costoso.
 * En Linux se activa por defecto la primera vez (override del usuario se respeta).
 */

export const LITE_EFFECTS_KEY = 'nodeterm_ui_lite_effects';

export function isLinuxPlatform() {
  try {
    if (typeof window !== 'undefined' && window.electron?.platform) {
      return window.electron.platform === 'linux';
    }
  } catch { /* ignore */ }
  if (typeof navigator !== 'undefined') {
    return /linux/i.test(navigator.userAgent || '') && !/android/i.test(navigator.userAgent || '');
  }
  return false;
}

/**
 * Resuelve el valor inicial: localStorage si existe; si no, true en Linux.
 */
export function resolveLiteEffectsEnabled() {
  try {
    const saved = localStorage.getItem(LITE_EFFECTS_KEY);
    if (saved === 'true' || saved === 'false') {
      return saved === 'true';
    }
  } catch { /* ignore */ }
  return isLinuxPlatform();
}

export function applyLiteEffectsAttribute(enabled) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-ui-lite-effects', enabled ? 'true' : 'false');
}

export function persistLiteEffectsEnabled(enabled) {
  try {
    localStorage.setItem(LITE_EFFECTS_KEY, enabled ? 'true' : 'false');
  } catch { /* ignore */ }
  applyLiteEffectsAttribute(enabled);
  try {
    window.dispatchEvent(new CustomEvent('nodeterm-lite-effects-changed', { detail: { enabled: !!enabled } }));
  } catch { /* ignore */ }
}

/** Aplicar en arranque temprano (antes del primer paint de glass). */
export function applyLiteEffectsFromStorage() {
  applyLiteEffectsAttribute(resolveLiteEffectsEnabled());
}

export function isLiteEffectsEnabled() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-ui-lite-effects') === 'true';
}
