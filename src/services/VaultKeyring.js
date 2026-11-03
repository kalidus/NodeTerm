/**
 * Keyring en memoria para vaults extra (conexiones).
 * El vault principal sigue usando SecureStorage / masterKey de App.js.
 */

import SecureStorage from './SecureStorage';
import { DEFAULT_VAULT_ID } from '../shared/vault-connection-trees';

class VaultKeyring {
  constructor() {
    /** @type {Map<string, string>} */
    this._keys = new Map();
    this._listeners = new Set();
    this._secureStorage = new SecureStorage();
  }

  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emit() {
    for (const fn of this._listeners) {
      try {
        fn(this.listUnlocked());
      } catch (_) {
        /* noop */
      }
    }
  }

  isUnlocked(vaultId) {
    if (!vaultId || vaultId === DEFAULT_VAULT_ID) return false;
    return this._keys.has(String(vaultId));
  }

  getKey(vaultId) {
    if (!vaultId || vaultId === DEFAULT_VAULT_ID) return null;
    return this._keys.get(String(vaultId)) || null;
  }

  listUnlocked() {
    return [...this._keys.keys()];
  }

  /**
   * Desbloquea un vault extra verificando contraseña contra su verifier / blob.
   * @param {string} vaultId
   * @param {string} password
   * @param {{ remember?: boolean, encryptedBlob?: string|object }} [options]
   */
  async unlock(vaultId, password, options = {}) {
    const id = String(vaultId || '');
    if (!id || id === DEFAULT_VAULT_ID) {
      return { success: false, error: 'vaultId inválido' };
    }
    if (!password) {
      return { success: false, error: 'Contraseña vacía' };
    }

    const verifier = window.electron?.security?.getVaultVerifier
      ? await window.electron.security.getVaultVerifier(id)
      : null;

    let ok = false;
    if (verifier) {
      ok = await this._secureStorage.verifyVaultVerifier(verifier, password);
    }

    if (!ok && options.encryptedBlob) {
      try {
        const blob =
          typeof options.encryptedBlob === 'string'
            ? JSON.parse(options.encryptedBlob)
            : options.encryptedBlob;
        const decrypted = await this._secureStorage.decryptData(blob, password);
        ok = decrypted != null;
      } catch (_) {
        ok = false;
      }
    }

    // Vault recién creado sin verifier ni blob: aceptar y crear verifier
    if (!ok && !verifier && !options.encryptedBlob) {
      ok = true;
    }

    if (!ok) {
      return { success: false, error: 'Contraseña incorrecta' };
    }

    const remember = options.remember !== false;
    try {
      const newVerifier = await this._secureStorage.createVaultVerifier(password);
      await window.electron?.security?.saveMasterKey?.({
        vaultId: id,
        masterKey: password,
        verifier: newVerifier,
        rememberPassword: remember
      });
    } catch (e) {
      console.warn('[VaultKeyring] No se pudo persistir verifier/clave:', e?.message || e);
    }

    this._keys.set(id, password);
    this._emit();
    return { success: true };
  }

  /**
   * Intenta auto-desbloquear con la clave recordada en security.json.
   */
  async tryAutoUnlock(vaultId) {
    const id = String(vaultId || '');
    if (!id || id === DEFAULT_VAULT_ID) return { success: false };
    if (this.isUnlocked(id)) return { success: true, cached: true };

    try {
      const remembered = await window.electron?.security?.getMasterKey?.(id);
      if (!remembered || typeof remembered !== 'string') {
        return { success: false };
      }
      const verifier = await window.electron?.security?.getVaultVerifier?.(id);
      if (verifier) {
        const ok = await this._secureStorage.verifyVaultVerifier(verifier, remembered);
        if (!ok) return { success: false };
      }
      this._keys.set(id, remembered);
      this._emit();
      return { success: true, auto: true };
    } catch (e) {
      return { success: false, error: e?.message };
    }
  }

  lock(vaultId) {
    const id = String(vaultId || '');
    if (!id) return;
    this._keys.delete(id);
    this._emit();
  }

  lockAll() {
    this._keys.clear();
    this._emit();
  }

  /**
   * Establece la clave en memoria sin revalidar (p. ej. tras crear vault).
   */
  setUnlocked(vaultId, password) {
    const id = String(vaultId || '');
    if (!id || id === DEFAULT_VAULT_ID || !password) return;
    this._keys.set(id, password);
    this._emit();
  }
}

const vaultKeyring = new VaultKeyring();
export default vaultKeyring;
export { VaultKeyring, DEFAULT_VAULT_ID };
