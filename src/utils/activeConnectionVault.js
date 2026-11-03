/**
 * Vault de conexiones activo (selector tipo Termius).
 * Solo afecta a la vista del sidebar; las pestañas abiertas no se cierran.
 */

import { DEFAULT_VAULT_ID } from '../shared/vault-connection-trees';

export const ACTIVE_CONNECTION_VAULT_KEY = 'nodeterm_active_connection_vault';

export function getActiveConnectionVaultId() {
  try {
    const id = localStorage.getItem(ACTIVE_CONNECTION_VAULT_KEY);
    if (!id || id === DEFAULT_VAULT_ID) return DEFAULT_VAULT_ID;
    return String(id);
  } catch (_) {
    return DEFAULT_VAULT_ID;
  }
}

export function setActiveConnectionVaultId(vaultId) {
  const id = !vaultId || vaultId === DEFAULT_VAULT_ID ? DEFAULT_VAULT_ID : String(vaultId);
  try {
    if (id === DEFAULT_VAULT_ID) {
      localStorage.removeItem(ACTIVE_CONNECTION_VAULT_KEY);
    } else {
      localStorage.setItem(ACTIVE_CONNECTION_VAULT_KEY, id);
    }
  } catch (_) {
    /* noop */
  }
  try {
    window.dispatchEvent(
      new CustomEvent('active-connection-vault-changed', { detail: { vaultId: id } })
    );
  } catch (_) {
    /* noop */
  }
  return id;
}

export { DEFAULT_VAULT_ID };
