/**
 * Session-action icon themes — modern + classic eager; rest lazy.
 */
import modern from './modern';
import classic from './classic';
import {
  sessionActionIconThemeMeta,
  sessionActionIconThemeIds,
  sessionActionIconThemeOptions,
  PREMIUM_SESSION_ACTION_IDS
} from './meta';
import { futuristCatalog } from '../icon-themes/futurist-catalog';

export {
  sessionActionIconThemeMeta,
  sessionActionIconThemeIds,
  sessionActionIconThemeOptions,
  PREMIUM_SESSION_ACTION_IDS
};

const FALLBACK_ID = 'modern';

/** @type {Record<string, { name: string, description?: string, icons: Record<string, unknown> }>} */
const cache = {
  modern,
  classic
};

/** Mutable compat map — starts with eager themes; filled as chunks load. */
export const sessionActionIconThemes = {
  modern,
  classic
};

const baseLoaders = {
  minimal: () => import(/* webpackChunkName: "session-action-minimal" */ './minimal'),
  original: () => import(/* webpackChunkName: "session-action-original" */ './original'),
  neon: () => import(/* webpackChunkName: "session-action-neon" */ './neon'),
  outline: () => import(/* webpackChunkName: "session-action-outline" */ './outline'),
  bold: () => import(/* webpackChunkName: "session-action-bold" */ './bold'),
  rounded: () => import(/* webpackChunkName: "session-action-rounded" */ './rounded'),
  geometric: () => import(/* webpackChunkName: "session-action-geometric" */ './geometric'),
  filled: () => import(/* webpackChunkName: "session-action-filled" */ './filled'),
  duotone: () => import(/* webpackChunkName: "session-action-duotone" */ './duotone'),
  pixel: () => import(/* webpackChunkName: "session-action-pixel" */ './pixel'),
  glyphs: () => import(/* webpackChunkName: "session-action-glyphs" */ './glyphs'),
  cyberpunk: () => import(/* webpackChunkName: "session-action-cyberpunk" */ './cyberpunk'),
  glass: () => import(/* webpackChunkName: "session-action-glass" */ './glass'),
  vibrant: () => import(/* webpackChunkName: "session-action-vibrant" */ './vibrant'),
  holographic: () => import(/* webpackChunkName: "session-action-holographic" */ './holographic'),
  glitch: () => import(/* webpackChunkName: "session-action-glitch" */ './glitch'),
  acrylic: () => import(/* webpackChunkName: "session-action-acrylic" */ './acrylic'),
  neumorphic: () => import(/* webpackChunkName: "session-action-neumorphic" */ './neumorphic'),
  fluent: () => import(/* webpackChunkName: "session-action-fluent" */ './fluent')
};

const premiumIdSet = new Set(PREMIUM_SESSION_ACTION_IDS);
/** @type {Promise<void> | null} */
let premiumInflight = null;

const inflight = new Map();
const listeners = new Set();
const idByLower = new Map(sessionActionIconThemeIds.map((id) => [id.toLowerCase(), id]));

function resolveKey(id) {
  const raw = (id || FALLBACK_ID).toString();
  if (cache[raw]) return raw;
  const canonical = idByLower.get(raw.toLowerCase());
  if (canonical) return canonical;
  return FALLBACK_ID;
}

function putTheme(id, theme) {
  cache[id] = theme;
  sessionActionIconThemes[id] = theme;
  listeners.forEach((fn) => {
    try { fn(id); } catch (_) { /* ignore */ }
  });
}

function loadPremiumBundle() {
  if (premiumInflight) return premiumInflight;
  premiumInflight = import(
    /* webpackChunkName: "session-action-premium" */ '../session-action-icons-premium'
  )
    .then((mod) => {
      const pack = mod.premiumSessionActionIconThemes || {};
      Object.keys(pack).forEach((id) => putTheme(id, pack[id]));
    })
    .catch((err) => {
      premiumInflight = null;
      console.warn('[session-action-icons] failed to load premium pack', err);
    });
  return premiumInflight;
}

/**
 * Sync lookup. Returns cached theme or modern fallback.
 * @param {string} [id]
 */
export function getSessionActionIconTheme(id) {
  const key = resolveKey(id);
  return cache[key] || cache[FALLBACK_ID];
}

export function isSessionActionIconThemeLoaded(id) {
  return Boolean(cache[resolveKey(id)]);
}

/**
 * Load theme chunk into cache.
 * @param {string} [id]
 */
export function ensureSessionActionIconTheme(id) {
  const key = resolveKey(id);
  if (cache[key]) return Promise.resolve(cache[key]);

  if (premiumIdSet.has(key)) {
    if (inflight.has(key)) return inflight.get(key);
    const promise = loadPremiumBundle().then(() => cache[key] || cache[FALLBACK_ID]);
    inflight.set(key, promise);
    promise.finally(() => inflight.delete(key));
    return promise;
  }

  const loader = baseLoaders[key];
  if (!loader) return Promise.resolve(cache[FALLBACK_ID]);

  if (inflight.has(key)) return inflight.get(key);

  const promise = loader()
    .then((mod) => {
      const theme = mod.default || mod;
      putTheme(key, theme);
      inflight.delete(key);
      return theme;
    })
    .catch((err) => {
      inflight.delete(key);
      console.warn(`[session-action-icons] failed to load "${key}"`, err);
      return cache[FALLBACK_ID];
    });

  inflight.set(key, promise);
  return promise;
}

export function preloadSessionActionIconThemes(ids) {
  const list = Array.isArray(ids) && ids.length ? ids : sessionActionIconThemeIds;
  const needsPremium = list.some((id) => premiumIdSet.has(resolveKey(id)));
  const tasks = list.map((id) => ensureSessionActionIconTheme(id));
  if (needsPremium || !ids) {
    // Full catalog preload also pulls premium once
    tasks.push(loadPremiumBundle());
  }
  return Promise.all(tasks);
}

export function onSessionActionIconThemeLoaded(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Icono de nueva nota para la barra (fallback si el tema no define newDocument). */
export const newDocumentToolbarIcon = modern.icons.newDocument;

export const getDefaultSessionActionIconTheme = () => {
  try {
    return localStorage.getItem('sessionActionIconTheme') || 'classic';
  } catch {
    return 'classic';
  }
};

export const setSessionActionIconTheme = (theme) => {
  try {
    localStorage.setItem('sessionActionIconTheme', theme);
  } catch (error) {
    console.error('Error guardando tema de iconos de acción:', error);
  }
};

let futuristActionPromise = null;

function loadFuturistActionPack() {
  if (!futuristActionPromise) {
    futuristActionPromise = import(/* webpackChunkName: "session-action-futurist" */ './futurist-pack')
      .then((mod) => {
        const themes = mod.futuristActionIconThemes;
        Object.keys(themes).forEach((themeId) => putTheme(themeId, themes[themeId]));
        return themes;
      })
      .catch((err) => {
        futuristActionPromise = null;
        console.warn('[session-action-icons] failed to load futurist pack', err);
        throw err;
      });
  }
  return futuristActionPromise;
}

futuristCatalog.forEach(({ id }) => {
  baseLoaders[id] = () => loadFuturistActionPack().then((themes) => {
    const theme = themes[id];
    if (!theme) throw new Error(`missing action icon theme ${id}`);
    return { default: theme };
  });
});

export function warmSessionActionIconThemesFromStorage() {
  try {
    const id = localStorage.getItem('sessionActionIconTheme');
    if (id) ensureSessionActionIconTheme(id);
  } catch (_) {
    /* ignore */
  }
}

warmSessionActionIconThemesFromStorage();
