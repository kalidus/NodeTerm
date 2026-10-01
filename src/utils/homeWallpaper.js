import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from './constants';

export const HOME_WALLPAPER_CHANGED = 'home-tab-wallpaper-changed';

export const DEFAULT_WALLPAPER_STATE = {
  activeId: null,
  dim: 40,
  fit: 'cover',
  items: []
};

const dataUrlCache = new Map();

function clampDim(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_WALLPAPER_STATE.dim;
  return Math.max(0, Math.min(80, Math.round(n)));
}

function normalizeState(raw) {
  const items = Array.isArray(raw?.items)
    ? raw.items.filter((item) => item && item.id && item.file).map((item) => ({
      id: String(item.id),
      name: String(item.name || item.id),
      file: String(item.file)
    }))
    : [];
  const activeId = items.some((item) => item.id === raw?.activeId) ? raw.activeId : null;
  return {
    activeId,
    dim: clampDim(raw?.dim),
    fit: raw?.fit === 'contain' ? 'contain' : 'cover',
    items
  };
}

export function readWallpaperState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HOME_TAB_WALLPAPER);
    if (!raw) return { ...DEFAULT_WALLPAPER_STATE, items: [] };
    return normalizeState(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_WALLPAPER_STATE, items: [] };
  }
}

export function writeWallpaperState(nextState) {
  const state = normalizeState(nextState);
  try {
    localStorage.setItem(STORAGE_KEYS.HOME_TAB_WALLPAPER, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
  try {
    window.dispatchEvent(new CustomEvent(HOME_WALLPAPER_CHANGED, { detail: state }));
  } catch {
    /* noop */
  }
  return state;
}

function getApi() {
  return (typeof window !== 'undefined' && window.electron && window.electron.homeWallpaper)
    ? window.electron.homeWallpaper
    : null;
}

export function evictWallpaperCache(file) {
  if (file) dataUrlCache.delete(file);
}

export async function getWallpaperDataUrl(file) {
  if (!file) return null;
  if (dataUrlCache.has(file)) return dataUrlCache.get(file);
  const api = getApi();
  if (!api || typeof api.getDataUrl !== 'function') return null;
  try {
    const result = await api.getDataUrl(file);
    if (result && result.ok && result.dataUrl) {
      dataUrlCache.set(file, result.dataUrl);
      return result.dataUrl;
    }
  } catch {
    /* noop */
  }
  return null;
}

export async function importWallpapers() {
  const api = getApi();
  if (!api || typeof api.import !== 'function') {
    return { ok: false, error: 'unavailable', items: [], skipped: [], state: readWallpaperState() };
  }
  const result = await api.import();
  const imported = Array.isArray(result?.items) ? result.items : [];
  if (!result?.ok) {
    return { ok: false, error: result?.error || 'importFailed', items: [], skipped: result?.skipped || [], state: readWallpaperState() };
  }
  if (imported.length === 0) {
    return { ok: true, items: [], skipped: result.skipped || [], state: readWallpaperState() };
  }
  const current = readWallpaperState();
  const items = current.items.concat(imported);
  const state = writeWallpaperState({
    ...current,
    items,
    activeId: current.activeId || imported[0].id
  });
  return { ok: true, items: imported, skipped: result.skipped || [], state };
}

export async function deleteWallpaper(id) {
  const current = readWallpaperState();
  const item = current.items.find((entry) => entry.id === id);
  if (!item) return { ok: true, state: current };
  const api = getApi();
  if (api && typeof api.delete === 'function') {
    try {
      await api.delete(item.file);
    } catch {
      /* keep metadata cleanup even if file delete fails */
    }
  }
  evictWallpaperCache(item.file);
  const items = current.items.filter((entry) => entry.id !== id);
  const state = writeWallpaperState({
    ...current,
    items,
    activeId: current.activeId === id ? (items[0] ? items[0].id : null) : current.activeId
  });
  return { ok: true, state };
}

export function setActiveWallpaper(id) {
  const current = readWallpaperState();
  if (id && !current.items.some((item) => item.id === id)) return current;
  return writeWallpaperState({ ...current, activeId: id || null });
}

export function setWallpaperDim(dim) {
  const current = readWallpaperState();
  return writeWallpaperState({ ...current, dim: clampDim(dim) });
}

export function clearActiveWallpaper() {
  const current = readWallpaperState();
  return writeWallpaperState({ ...current, activeId: null });
}

export function useHomeWallpaper({ loadThumbs = true } = {}) {
  const [state, setState] = useState(readWallpaperState);
  const [activeUrl, setActiveUrl] = useState(null);
  const [thumbUrls, setThumbUrls] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => setState(readWallpaperState());
    window.addEventListener(HOME_WALLPAPER_CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(HOME_WALLPAPER_CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const active = state.items.find((item) => item.id === state.activeId);
    if (!active) {
      setActiveUrl(null);
      return undefined;
    }
    getWallpaperDataUrl(active.file).then((url) => {
      if (!cancelled) setActiveUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [state.activeId, state.items]);

  useEffect(() => {
    if (!loadThumbs) return undefined;
    let cancelled = false;
    (async () => {
      const next = {};
      for (const item of state.items) {
        const url = await getWallpaperDataUrl(item.file);
        if (cancelled) return;
        if (url) next[item.id] = url;
      }
      if (!cancelled) setThumbUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [state.items, loadThumbs]);

  const onImport = useCallback(async () => {
    setBusy(true);
    try {
      return await importWallpapers();
    } finally {
      setBusy(false);
    }
  }, []);

  const onDelete = useCallback(async (id) => {
    setBusy(true);
    try {
      return await deleteWallpaper(id);
    } finally {
      setBusy(false);
    }
  }, []);

  const onSelect = useCallback((id) => setActiveWallpaper(id), []);
  const onDim = useCallback((dim) => setWallpaperDim(dim), []);
  const onClear = useCallback(() => clearActiveWallpaper(), []);

  return {
    state,
    activeUrl,
    thumbUrls,
    busy,
    importWallpapers: onImport,
    deleteWallpaper: onDelete,
    setActiveWallpaper: onSelect,
    setWallpaperDim: onDim,
    clearActiveWallpaper: onClear
  };
}
