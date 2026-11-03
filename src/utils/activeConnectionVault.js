/**
 * Vaults de conexiones visibles (selector tipo Termius con checks).
 * Uno o varios a la vez; las pestañas abiertas no se cierran al cambiar.
 */

import { DEFAULT_VAULT_ID } from '../shared/vault-connection-trees';

export const ACTIVE_CONNECTION_VAULT_KEY = 'nodeterm_active_connection_vault';
export const VISIBLE_CONNECTION_VAULTS_KEY = 'nodeterm_visible_connection_vaults';

function emitChanged(ids) {
  try {
    window.dispatchEvent(
      new CustomEvent('visible-connection-vaults-changed', {
        detail: { vaultIds: ids }
      })
    );
    // Compat: primer id como "activo"
    window.dispatchEvent(
      new CustomEvent('active-connection-vault-changed', {
        detail: { vaultId: ids[0] || DEFAULT_VAULT_ID }
      })
    );
  } catch (_) {
    /* noop */
  }
}

function normalizeIds(ids) {
  const out = [];
  const seen = new Set();
  for (const raw of ids || []) {
    if (raw == null || raw === '') continue;
    const id = String(raw) === DEFAULT_VAULT_ID ? DEFAULT_VAULT_ID : String(raw);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  if (out.length === 0) out.push(DEFAULT_VAULT_ID);
  return out;
}

/**
 * Lista de vault ids visibles. Migra desde ACTIVE_CONNECTION_VAULT_KEY si hace falta.
 */
export function getVisibleConnectionVaultIds() {
  try {
    const raw = localStorage.getItem(VISIBLE_CONNECTION_VAULTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return normalizeIds(parsed);
      }
    }
  } catch (_) {
    /* fall through */
  }

  // Migración desde activo único
  try {
    const legacy = localStorage.getItem(ACTIVE_CONNECTION_VAULT_KEY);
    if (legacy && legacy !== DEFAULT_VAULT_ID) {
      return normalizeIds([legacy]);
    }
  } catch (_) {
    /* noop */
  }
  return [DEFAULT_VAULT_ID];
}

export function setVisibleConnectionVaultIds(ids) {
  const next = normalizeIds(ids);
  try {
    localStorage.setItem(VISIBLE_CONNECTION_VAULTS_KEY, JSON.stringify(next));
    // Mantener legacy "activo" = primero de la lista (para código que aún lo lea)
    const primary = next[0] || DEFAULT_VAULT_ID;
    if (primary === DEFAULT_VAULT_ID) {
      localStorage.removeItem(ACTIVE_CONNECTION_VAULT_KEY);
    } else {
      localStorage.setItem(ACTIVE_CONNECTION_VAULT_KEY, primary);
    }
  } catch (_) {
    /* noop */
  }
  emitChanged(next);
  return next;
}

export function toggleVisibleConnectionVault(vaultId, enabled) {
  const id =
    !vaultId || vaultId === DEFAULT_VAULT_ID ? DEFAULT_VAULT_ID : String(vaultId);
  const current = getVisibleConnectionVaultIds();
  let next;
  if (enabled) {
    next = current.includes(id) ? current : [...current, id];
  } else {
    next = current.filter((x) => x !== id);
  }
  return setVisibleConnectionVaultIds(next);
}

/** Compat: primer vault visible (modo "plano" cuando solo hay uno). */
export function getActiveConnectionVaultId() {
  return getVisibleConnectionVaultIds()[0] || DEFAULT_VAULT_ID;
}

/** Compat: deja un solo vault visible. */
export function setActiveConnectionVaultId(vaultId) {
  const id =
    !vaultId || vaultId === DEFAULT_VAULT_ID ? DEFAULT_VAULT_ID : String(vaultId);
  return setVisibleConnectionVaultIds([id])[0];
}

export { DEFAULT_VAULT_ID };
