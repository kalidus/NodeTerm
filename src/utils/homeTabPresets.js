import { STORAGE_KEYS } from './constants';
import { SNAP_CONFIG } from './homeTabSnapping';

const USER_PRESETS_KEY = 'nodeterm_home_user_presets';
const MONITOR_LAYOUTS_KEY = 'nodeterm_home_monitor_layouts';

/**
 * Obtiene la clave de pantalla actual (resolucion + DPR).
 * Conserva lookup legado "1920x1080" en getLayoutForCurrentDisplay.
 */
export function getCurrentDisplayKey() {
  if (typeof window === 'undefined' || !window.screen) {
    return '1920x1080@1';
  }
  const w = window.screen.width || 1920;
  const h = window.screen.height || 1080;
  const dpr = (typeof window.devicePixelRatio === 'number' && window.devicePixelRatio > 0)
    ? window.devicePixelRatio
    : 1;
  const dprKey = Number.isInteger(dpr) ? String(dpr) : String(Math.round(dpr * 100) / 100);
  return `${w}x${h}@${dprKey}`;
}

function lookupMonitorLayout(map, key) {
  if (!map || !key) return null;
  if (map[key]) return map[key];
  const legacy = String(key).split('@')[0];
  if (legacy && map[legacy]) return map[legacy];
  return null;
}

/**
 * Guarda el layout autorado para una clave de pantalla concreta.
 */
export function saveLayoutForDisplay(key, layout) {
  if (!key || !layout) return;
  try {
    const map = getMonitorLayoutsMap();
    map[key] = ensureRequiredHomeTerminal(layout);
    localStorage.setItem(MONITOR_LAYOUTS_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('[HomeTabPresets] Error al guardar monitor layout:', err);
  }
}

const REQUIRED_HOME_TERMINAL_DEFAULTS = {
  visible: true,
  x: 20,
  y: 154,
  width: 380,
  height: 240,
  minWidth: 380,
  minHeight: 200,
  zIndex: 10,
  isMaximized: false
};

/**
 * El panel terminal del HomeTab es obligatorio: nunca puede quedar oculto.
 * Si falta o llega con visible=false (preset antiguo, restore por monitor), se corrige.
 */
export function ensureRequiredHomeTerminal(layout) {
  if (!layout || typeof layout !== 'object') {
    return layout;
  }
  const current = layout.terminal && typeof layout.terminal === 'object'
    ? layout.terminal
    : {};
  return {
    ...layout,
    terminal: {
      ...REQUIRED_HOME_TERMINAL_DEFAULTS,
      ...current,
      visible: true
    }
  };
}

/**
 * Obtiene el mapa de layouts guardados por resolución de pantalla.
 * @returns {Record<string, any>}
 */
export function getMonitorLayoutsMap() {
  try {
    const raw = localStorage.getItem(MONITOR_LAYOUTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('[HomeTabPresets] Error al leer monitor layouts:', err);
    return {};
  }
}

/**
 * Guarda el layout específico para la pantalla/resolución actual.
 * Evita la degradación destructiva al alternar entre monitores.
 * 
 * @param {Record<string, any>} layout
 */
export function saveLayoutForCurrentDisplay(layout) {
  saveLayoutForDisplay(getCurrentDisplayKey(), layout);
}

export function getLayoutForDisplay(key, fallbackLayout) {
  try {
    const map = getMonitorLayoutsMap();
    const found = lookupMonitorLayout(map, key);
    if (found) {
      return ensureRequiredHomeTerminal(found);
    }
  } catch (err) {
    console.warn('[HomeTabPresets] Error al recuperar monitor layout:', err);
  }
  return fallbackLayout ? ensureRequiredHomeTerminal(fallbackLayout) : fallbackLayout;
}

export function getLayoutForCurrentDisplay(fallbackLayout) {
  return getLayoutForDisplay(getCurrentDisplayKey(), fallbackLayout);
}

/**
 * Genera presets de fábrica calculados para el tamaño de lienzo actual.
 * 
 * @param {number} width Anchura del contenedor
 * @param {number} height Altura del contenedor
 * @returns {Record<string, { id: string, name: string, description: string, icon: string, layout: any }>}
 */
export function getBuiltinPresets(width = 1200, height = 800) {
  const w = width > 200 ? width : 1200;
  const h = height > 200 ? height : 800;
  const pad = SNAP_CONFIG.CANVAS_PAD;
  const gap = SNAP_CONFIG.GAP;

  // --- 1. DASHBOARD PRO (Terminal Ancho Arriba + Fila de 4 Widgets Nivelados Abajo) ---
  const dashProTermH = Math.max(220, Math.floor(h * 0.62));
  const dashProRowY = pad + dashProTermH + gap;
  const dashProRowH = Math.max(130, h - dashProRowY - pad);
  const rowPanelCount = 4;
  const dashProTotalRowW = w - pad * 2 - gap * (rowPanelCount - 1);
  const dashProItemW = Math.floor(dashProTotalRowW / rowPanelCount);

  const dashboardProLayout = {
    terminal: {
      visible: true,
      x: pad,
      y: pad,
      width: w - pad * 2,
      height: dashProTermH,
      minWidth: 380,
      minHeight: 180,
      zIndex: 10,
      isMaximized: false
    },
    search: {
      visible: true,
      x: pad,
      y: dashProRowY,
      width: dashProItemW,
      height: dashProRowH,
      minWidth: 200,
      minHeight: 90,
      zIndex: 12,
      isMaximized: false
    },
    recents: {
      visible: true,
      x: pad + 1 * (dashProItemW + gap),
      y: dashProRowY,
      width: dashProItemW,
      height: dashProRowH,
      minWidth: 200,
      minHeight: 100,
      zIndex: 11,
      isMaximized: false
    },
    sysmon: {
      visible: true,
      x: pad + 2 * (dashProItemW + gap),
      y: dashProRowY,
      width: dashProItemW,
      height: dashProRowH,
      minWidth: 200,
      minHeight: 100,
      zIndex: 11,
      isMaximized: false
    },
    favorites: {
      visible: true,
      x: pad + 3 * (dashProItemW + gap),
      y: dashProRowY,
      width: w - pad - (pad + 3 * (dashProItemW + gap)),
      height: dashProRowH,
      minWidth: 200,
      minHeight: 100,
      zIndex: 11,
      isMaximized: false
    },
    quickbar: {
      visible: false,
      x: Math.max(pad, w - 260),
      y: pad,
      width: 240,
      height: h - pad * 2,
      minWidth: 180,
      minHeight: 200,
      zIndex: 15,
      isMaximized: false
    }
  };

  // --- 2. DOS COLUMNAS (SPLIT) ---
  const splitColW = Math.max(340, Math.floor((w - pad * 2 - gap) / 2));
  const splitSearchH = 120;
  const splitSearchW = Math.min(560, splitColW);
  const splitRightH = Math.max(160, Math.floor((h - pad * 2 - gap) / 2));

  const splitLayout = {
    search: {
      visible: true,
      x: pad,
      y: pad,
      width: splitColW,
      height: splitSearchH,
      minWidth: 220,
      minHeight: 90,
      zIndex: 15,
      isMaximized: false
    },
    terminal: {
      visible: true,
      x: pad,
      y: pad + splitSearchH + gap,
      width: splitColW,
      height: Math.max(200, h - (pad + splitSearchH + gap) - pad),
      minWidth: 320,
      minHeight: 180,
      zIndex: 10,
      isMaximized: false
    },
    recents: {
      visible: true,
      x: pad + splitColW + gap,
      y: pad,
      width: w - pad * 2 - splitColW - gap,
      height: splitRightH,
      minWidth: 220,
      minHeight: 120,
      zIndex: 11,
      isMaximized: false
    },
    favorites: {
      visible: true,
      x: pad + splitColW + gap,
      y: pad + splitRightH + gap,
      width: w - pad * 2 - splitColW - gap,
      height: h - (pad + splitRightH + gap) - pad,
      minWidth: 220,
      minHeight: 120,
      zIndex: 11,
      isMaximized: false
    },
    sysmon: {
      visible: false,
      x: pad + splitColW + gap,
      y: pad,
      width: 320,
      height: 220,
      minWidth: 220,
      minHeight: 160,
      zIndex: 12,
      isMaximized: false
    },
    quickbar: {
      visible: false,
      x: Math.max(pad, w - 240),
      y: pad,
      width: 220,
      height: h - pad * 2,
      minWidth: 180,
      minHeight: 200,
      zIndex: 14,
      isMaximized: false
    }
  };

  // --- 3. TERMINAL MAX ---
  const termMaxSearchW = Math.min(580, Math.floor(w * 0.5));
  const termMaxLayout = {
    search: {
      visible: true,
      x: Math.max(pad, Math.floor((w - termMaxSearchW) / 2)),
      y: pad,
      width: termMaxSearchW,
      height: 118,
      minWidth: 220,
      minHeight: 90,
      zIndex: 20,
      isMaximized: false
    },
    terminal: {
      visible: true,
      x: pad,
      y: pad + 118 + gap,
      width: w - pad * 2,
      height: Math.max(240, h - (pad + 118 + gap) - pad),
      minWidth: 380,
      minHeight: 200,
      zIndex: 10,
      isMaximized: false
    },
    recents: { visible: false, x: pad, y: pad, width: 340, height: 260, isMaximized: false },
    favorites: { visible: false, x: pad, y: pad, width: 340, height: 260, isMaximized: false },
    sysmon: { visible: false, x: pad, y: pad, width: 340, height: 260, isMaximized: false },
    quickbar: { visible: false, x: pad, y: pad, width: 220, height: 300, isMaximized: false }
  };

  return {
    'dashboard-pro': {
      id: 'dashboard-pro',
      name: 'Dashboard Pro',
      description: 'Terminal ancho superior + fila de 4 módulos nivelados abajo (Buscador, Recientes, Hardware, Favoritos)',
      icon: 'pi pi-th-large',
      layout: dashboardProLayout
    },
    'two-columns': {
      id: 'two-columns',
      name: '2 Columnas (Split)',
      description: 'Terminal a la izquierda y módulos apilados en columna a la derecha',
      icon: 'pi pi-pause',
      layout: splitLayout
    },
    'terminal-max': {
      id: 'terminal-max',
      name: 'Terminal Completa',
      description: 'Terminal ampliado ocupando la mayor parte de la pantalla',
      icon: 'pi pi-window-maximize',
      layout: termMaxLayout
    }
  };
}

/**
 * Obtiene la lista de presets guardados por el usuario.
 * @returns {Array<{ id: string, name: string, createdAt: number, layout: any }>}
 */
export function getUserPresets() {
  try {
    const raw = localStorage.getItem(USER_PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('[HomeTabPresets] Error al leer presets de usuario:', err);
    return [];
  }
}

/**
 * Guarda el layout actual como un nuevo preset personalizado del usuario.
 * 
 * @param {string} name Nombre asignado al preset
 * @param {Record<string, any>} layout Layout actual a guardar
 * @returns {Array<{ id: string, name: string, createdAt: number, layout: any }>}
 */
export function saveUserPreset(name, layout) {
  if (!name || !layout) return getUserPresets();
  const trimmedName = name.trim();
  if (!trimmedName) return getUserPresets();

  const presets = getUserPresets();
  const existingIdx = presets.findIndex((p) => p.name.toLowerCase() === trimmedName.toLowerCase());

  const newPreset = {
    id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: trimmedName,
    createdAt: Date.now(),
    layout: JSON.parse(JSON.stringify(ensureRequiredHomeTerminal(layout)))
  };

  if (existingIdx !== -1) {
    presets[existingIdx] = newPreset;
  } else {
    presets.unshift(newPreset);
  }

  try {
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
  } catch (err) {
    console.error('[HomeTabPresets] Error al persistir preset de usuario:', err);
  }

  return presets;
}

/**
 * Elimina un preset de usuario por su ID.
 * 
 * @param {string} presetId
 * @returns {Array<any>}
 */
export function deleteUserPreset(presetId) {
  if (!presetId) return getUserPresets();
  const presets = getUserPresets().filter((p) => p.id !== presetId);
  try {
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
  } catch (err) {
    console.error('[HomeTabPresets] Error al borrar preset:', err);
  }
  return presets;
}
