/**
 * Flag de vaults independientes (conexiones, passwords y notas).
 * La key de storage conserva el prefijo histórico "experimental" por compatibilidad.
 */

export const MULTI_VAULT_FLAG_KEY = 'nodeterm_experimental_multi_vault';

export function isMultiVaultEnabled() {
  try {
    const raw = localStorage.getItem(MULTI_VAULT_FLAG_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch (_) {
    return true;
  }
}

export function setMultiVaultEnabled(enabled) {
  try {
    localStorage.setItem(MULTI_VAULT_FLAG_KEY, enabled ? 'true' : 'false');
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
