import localStorageSyncService from '../services/LocalStorageSyncService';

const pendingSetItemTimers = new Map();

function doPersist(key, value, immediate) {
  if (value === null || value === undefined) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
    if (immediate) {
      localStorageSyncService.forceSync();
    } else {
      localStorageSyncService.debouncedSync();
    }
    return;
  }

  try {
    localStorage.setItem(key, value);
  } catch (_) {}

  if (immediate) {
    localStorageSyncService.forceSync({ [key]: value });
  } else {
    localStorageSyncService.debouncedSync({ [key]: value });
  }
}

/**
 * Persiste un valor en localStorage y programa la escritura en app-data.json.
 * @param {string} key
 * @param {string|null|undefined} value - null/undefined elimina la clave
 * @param {{ immediate?: boolean, debounceMs?: number }} [options] - immediate: escribe en app-data sin esperar debounce
 */
export function persistSyncedSetting(key, value, options = {}) {
  const { immediate = false, debounceMs = 0 } = options;

  if (debounceMs > 0 && !immediate) {
    if (pendingSetItemTimers.has(key)) {
      clearTimeout(pendingSetItemTimers.get(key));
    }
    const timer = setTimeout(() => {
      pendingSetItemTimers.delete(key);
      doPersist(key, value, false);
    }, debounceMs);
    pendingSetItemTimers.set(key, timer);
    return;
  }

  if (pendingSetItemTimers.has(key)) {
    clearTimeout(pendingSetItemTimers.get(key));
    pendingSetItemTimers.delete(key);
  }

  doPersist(key, value, immediate);
}
