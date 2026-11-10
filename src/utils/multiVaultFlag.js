/**
 * Flag de vaults independientes (conexiones, passwords y notas).
 * La key de storage conserva el prefijo histórico "experimental" por compatibilidad.
 */

export const MULTI_VAULT_FLAG_KEY = 'nodeterm_experimental_multi_vault';

export function isMultiVaultEnabled() {
  try {
    return localStorage.getItem(MULTI_VAULT_FLAG_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

export function setMultiVaultEnabled(enabled) {
  try {
    if (enabled) {
      localStorage.setItem(MULTI_VAULT_FLAG_KEY, 'true');
    } else {
      localStorage.removeItem(MULTI_VAULT_FLAG_KEY);
    }
  } catch (_) {
    /* noop */
  }
  try {
    window.dispatchEvent(
      new CustomEvent('multi-vault-flag-changed', { detail: { enabled: !!enabled } })
    );
  } catch (_) {
    /* noop */
  }
}
