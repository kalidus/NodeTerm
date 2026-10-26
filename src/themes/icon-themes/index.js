/**
 * Icon themes — nord + material eager (tree fallbacks); rest lazy-loaded.
 */
import nord from './nord';
import material from './material';
import { iconThemeMeta, iconThemeIds, iconThemeOptions } from './meta';
import { futuristCatalog } from './futurist-catalog';
import { ghostCatalog } from './ghost-catalog';

export { iconThemeMeta, iconThemeIds, iconThemeOptions };

const FALLBACK_ID = 'nord';

/** @type {Record<string, { name: string, icons: Record<string, unknown> }>} */
const cache = {
  nord,
  material
};

/** Mutable compat map — starts with eager themes; filled as chunks load. */
export const iconThemes = {
  nord,
  material
};

const loaders = {
  cyberpunk: () => import(/* webpackChunkName: "icon-theme-cyberpunk" */ './cyberpunk'),
  fluent: () => import(/* webpackChunkName: "icon-theme-fluent" */ './fluent'),
  linea: () => import(/* webpackChunkName: "icon-theme-linea" */ './linea'),
  dracula: () => import(/* webpackChunkName: "icon-theme-dracula" */ './dracula'),
  solarized: () => import(/* webpackChunkName: "icon-theme-solarized" */ './solarized'),
  vscode: () => import(/* webpackChunkName: "icon-theme-vscode" */ './vscode'),
  atom: () => import(/* webpackChunkName: "icon-theme-atom" */ './atom'),
  monokai: () => import(/* webpackChunkName: "icon-theme-monokai" */ './monokai'),
  onedark: () => import(/* webpackChunkName: "icon-theme-onedark" */ './onedark'),
  gruvbox: () => import(/* webpackChunkName: "icon-theme-gruvbox" */ './gruvbox'),
  tokyonight: () => import(/* webpackChunkName: "icon-theme-tokyonight" */ './tokyonight'),
  palenight: () => import(/* webpackChunkName: "icon-theme-palenight" */ './palenight'),
  minimal: () => import(/* webpackChunkName: "icon-theme-minimal" */ './minimal'),
  synthwave: () => import(/* webpackChunkName: "icon-theme-synthwave" */ './synthwave'),
  nodetermBasic: () => import(/* webpackChunkName: "icon-theme-nodetermBasic" */ './nodetermBasic'),
  retroGaming: () => import(/* webpackChunkName: "icon-theme-retroGaming" */ './retroGaming'),
  corporate: () => import(/* webpackChunkName: "icon-theme-corporate" */ './corporate'),
  nature: () => import(/* webpackChunkName: "icon-theme-nature" */ './nature'),
  space: () => import(/* webpackChunkName: "icon-theme-space" */ './space'),
  ocean: () => import(/* webpackChunkName: "icon-theme-ocean" */ './ocean'),
  fire: () => import(/* webpackChunkName: "icon-theme-fire" */ './fire'),
  ice: () => import(/* webpackChunkName: "icon-theme-ice" */ './ice'),
  forest: () => import(/* webpackChunkName: "icon-theme-forest" */ './forest'),
  sunset: () => import(/* webpackChunkName: "icon-theme-sunset" */ './sunset'),
  matrix: () => import(/* webpackChunkName: "icon-theme-matrix" */ './matrix'),
  neon: () => import(/* webpackChunkName: "icon-theme-neon" */ './neon'),
  gradient: () => import(/* webpackChunkName: "icon-theme-gradient" */ './gradient'),
  rainbow: () => import(/* webpackChunkName: "icon-theme-rainbow" */ './rainbow'),
  metallic: () => import(/* webpackChunkName: "icon-theme-metallic" */ './metallic'),
  holographic: () => import(/* webpackChunkName: "icon-theme-holographic" */ './holographic'),
  glitch: () => import(/* webpackChunkName: "icon-theme-glitch" */ './glitch'),
  vaporwave: () => import(/* webpackChunkName: "icon-theme-vaporwave" */ './vaporwave'),
  glass: () => import(/* webpackChunkName: "icon-theme-glass" */ './glass'),
  acrylic: () => import(/* webpackChunkName: "icon-theme-acrylic" */ './acrylic'),
  neumorphic: () => import(/* webpackChunkName: "icon-theme-neumorphic" */ './neumorphic'),
  glassmorphism: () => import(/* webpackChunkName: "icon-theme-glassmorphism" */ './glassmorphism'),
  neon_glow: () => import(/* webpackChunkName: "icon-theme-neon_glow" */ './neon_glow'),
  cupertino: () => import(/* webpackChunkName: "icon-theme-cupertino" */ './cupertino'),
  cyber_blue: () => import(/* webpackChunkName: "icon-theme-cyber_blue" */ './cyber_blue'),
  aurora: () => import(/* webpackChunkName: "icon-theme-aurora" */ './aurora'),
  ghost_ui: () => import(/* webpackChunkName: "icon-theme-ghost_ui" */ './ghost_ui'),
  neon_matrix: () => import(/* webpackChunkName: "icon-theme-neon_matrix" */ './neon_matrix'),
  obsidian_glass: () => import(/* webpackChunkName: "icon-theme-obsidian_glass" */ './obsidian_glass'),
  crimson_tech: () => import(/* webpackChunkName: "icon-theme-crimson_tech" */ './crimson_tech')
};

/** @type {Map<string, Promise<{ name: string, icons: Record<string, unknown> }>>} */
const inflight = new Map();

/** @type {Set<(id: string) => void>} */
const listeners = new Set();

/** Map lowercase → canonical id (handles nodetermBasic etc. after .toLowerCase()). */
const idByLower = new Map(iconThemeIds.map((id) => [id.toLowerCase(), id]));

function resolveKey(id) {
  const raw = (id || FALLBACK_ID).toString();
  if (cache[raw]) return raw;
  const canonical = idByLower.get(raw.toLowerCase());
  if (canonical && cache[canonical]) return canonical;
  if (canonical) return canonical;
  return FALLBACK_ID;
}

function putTheme(id, theme) {
  cache[id] = theme;
  iconThemes[id] = theme;
  // Compat: Sidebar/Dialogs often lookup with .toLowerCase()
  const lower = id.toLowerCase();
  if (lower !== id) {
    cache[lower] = theme;
    iconThemes[lower] = theme;
  }
  listeners.forEach((fn) => {
    try { fn(id); } catch (_) { /* ignore */ }
  });
}

/**
 * Sync lookup. Returns cached theme or nord fallback.
 * @param {string} [id]
 */
export function getIconTheme(id) {
  const key = resolveKey(id);
  return cache[key] || cache[FALLBACK_ID];
}

/**
 * Whether the theme SVG pack is already in memory.
 * @param {string} [id]
 */
export function isIconThemeLoaded(id) {
  const key = resolveKey(id);
  return Boolean(cache[key]);
}

/**
 * Load theme chunk into cache (no-op if already loaded / eager).
 * @param {string} [id]
 * @returns {Promise<{ name: string, icons: Record<string, unknown> }>}
 */
export function ensureIconTheme(id) {
  const key = resolveKey(id);
  if (cache[key]) return Promise.resolve(cache[key]);

  const loader = loaders[key];
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
      console.warn(`[icon-themes] failed to load "${key}"`, err);
      return cache[FALLBACK_ID];
    });

  inflight.set(key, promise);
  return promise;
}

/**
 * Preload several themes (e.g. settings dropdown open).
 * @param {string[]} [ids]
 */
export function preloadIconThemes(ids) {
  const list = Array.isArray(ids) && ids.length ? ids : iconThemeIds;
  return Promise.all(list.map((id) => ensureIconTheme(id)));
}

/** Subscribe to theme-loaded events (for re-render when lazy chunk arrives). */
export function onIconThemeLoaded(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let futuristPackPromise = null;

function loadFuturistPack() {
  if (!futuristPackPromise) {
    futuristPackPromise = import(/* webpackChunkName: "icon-theme-futurist" */ './futurist-pack')
      .then((mod) => {
        const themes = mod.futuristIconThemes;
        Object.keys(themes).forEach((id) => putTheme(id, themes[id]));
        return themes;
      })
      .catch((err) => {
        futuristPackPromise = null;
        console.warn('[icon-themes] failed to load futurist pack', err);
        throw err;
      });
  }
  return futuristPackPromise;
}

futuristCatalog.forEach(({ id }) => {
  loaders[id] = () => loadFuturistPack().then((themes) => {
    const theme = themes[id];
    if (!theme) throw new Error(`missing icon theme ${id}`);
    return { default: theme };
  });
});

let ghostPackPromise = null;

function loadGhostPack() {
  if (!ghostPackPromise) {
    ghostPackPromise = import(/* webpackChunkName: "icon-theme-ghost" */ './ghost-pack')
      .then((mod) => {
        const themes = mod.ghostIconThemes;
        Object.keys(themes).forEach((id) => putTheme(id, themes[id]));
        return themes;
      })
      .catch((err) => {
        ghostPackPromise = null;
        console.warn('[icon-themes] failed to load ghost pack', err);
        throw err;
      });
  }
  return ghostPackPromise;
}

ghostCatalog.forEach(({ id }) => {
  loaders[id] = () => loadGhostPack().then((themes) => {
    const theme = themes[id];
    if (!theme) throw new Error(`missing icon theme ${id}`);
    return { default: theme };
  });
});

/** Kick off load for themes saved in localStorage (non-blocking). */
export function warmIconThemesFromStorage() {
  try {
    const a = localStorage.getItem('iconTheme');
    const b = localStorage.getItem('iconThemeSidebar');
    if (a) ensureIconTheme(a);
    if (b && b !== a) ensureIconTheme(b);
  } catch (_) {
    /* ignore */
  }
}

// Boot warm — does not block module evaluation beyond the kickoff call.
warmIconThemesFromStorage();
