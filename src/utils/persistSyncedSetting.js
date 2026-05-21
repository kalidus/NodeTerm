import localStorageSyncService from '../services/LocalStorageSyncService';

/**
 * Persiste un valor en localStorage y programa la escritura en app-data.json.
 * @param {string} key
 * @param {string|null|undefined} value - null/undefined elimina la clave
 * @param {{ immediate?: boolean }} [options] - immediate: escribe en app-data sin esperar debounce
 */
export function persistSyncedSetting(key, value, options = {}) {
  const { immediate = false } = options;

  if (value === null || value === undefined) {
    localStorage.removeItem(key);
    if (immediate) {
      localStorageSyncService.forceSync();
    } else {
      localStorageSyncService.debouncedSync();
    }
    return;
  }

  localStorage.setItem(key, value);
  if (immediate) {
    localStorageSyncService.forceSync({ [key]: value });
  } else {
    localStorageSyncService.debouncedSync({ [key]: value });
  }
}
