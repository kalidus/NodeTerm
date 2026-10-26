import { themeManager } from './themeManager';
import { persistSyncedSetting } from './persistSyncedSetting';

/** Clave localStorage del estilo de apariencia (layout global de la UI). */
export const UI_LAYOUT_STORAGE_KEY = 'ui_layout';

const LAYOUT_BODY_CLASSES = ['layout-default', 'layout-cyberpunk', 'layout-unified', 'layout-unified-rounded', 'layout-unified-app-rounded', 'layout-modern-custom', 'layout-atelier', 'layout-mux', 'layout-islas', 'layout-dock', 'layout-tablero', 'layout-studio'];

/** Opciones de layout para selectores rápidos (titlebar, etc.). */
export const UI_LAYOUT_OPTIONS = [
  { id: 'default', name: 'Default', icon: 'pi-box' },
  { id: 'unified', name: 'Unified', icon: 'pi-stop' },
  { id: 'unified-rounded', name: 'Unified Rounded', icon: 'pi-circle' },
  { id: 'unified-app-rounded', name: 'App Rounded', icon: 'pi-window-maximize' },
  { id: 'cyberpunk', name: 'Cyberpunk', icon: 'pi-bolt' },
  { id: 'atelier', name: 'Atelier', icon: 'pi-star' },
  { id: 'mux', name: 'Mux', icon: 'pi-th-large' },
  { id: 'studio', name: 'Studio', icon: 'pi-desktop' },
  { id: 'islas', name: 'Islas', icon: 'pi-th-large' },
  { id: 'dock', name: 'Dock', icon: 'pi-arrow-down' },
  { id: 'tablero', name: 'Tablero', icon: 'pi-id-card' },
];

function syncIconThemeForLayout(layoutId) {
  if (layoutId === 'cyberpunk') {
    localStorage.setItem('iconTheme', 'cyber_blue');
    localStorage.setItem('iconThemeSidebar', 'cyber_blue');
  } else if (layoutId === 'tablero') {
    localStorage.setItem('iconTheme', 'fluent');
    localStorage.setItem('iconThemeSidebar', 'fluent');
  } else if (
    layoutId === 'unified' ||
    layoutId === 'unified-rounded' ||
    layoutId === 'unified-app-rounded' ||
    layoutId === 'atelier' ||
    layoutId === 'mux' ||
    layoutId === 'islas' ||
    layoutId === 'dock' ||
    layoutId === 'studio'
  ) {
    localStorage.setItem('iconTheme', 'cupertino');
    localStorage.setItem('iconThemeSidebar', 'cupertino');
  } else if (layoutId === 'default') {
    localStorage.setItem('iconTheme', 'ghost_ui');
    localStorage.setItem('iconThemeSidebar', 'ghost_ui');
  } else {
    return;
  }
  window.dispatchEvent(new CustomEvent('settings-updated', {
    detail: { source: 'layout-sync' }
  }));
}

/**
 * Aplica en <body> el layout guardado (moderno / cyberpunk / unificado).
 * @returns {string} layoutId aplicado
 */
export function applyUILayoutFromStorage() {
  if (typeof document === 'undefined') {
    return 'unified';
  }

  let layoutId = localStorage.getItem(UI_LAYOUT_STORAGE_KEY) || 'unified';
  if (layoutId === 'modern-custom') {
    layoutId = 'unified-rounded';
    localStorage.setItem(UI_LAYOUT_STORAGE_KEY, layoutId);
  }
  if (layoutId === 'brutal' || layoutId === 'gaceta') {
    layoutId = 'atelier';
    localStorage.setItem(UI_LAYOUT_STORAGE_KEY, layoutId);
  }
  if (layoutId === 'rail' || layoutId === 'console' || layoutId === 'kiosk') {
    layoutId = 'studio';
    localStorage.setItem(UI_LAYOUT_STORAGE_KEY, layoutId);
  }
  document.body.classList.remove(...LAYOUT_BODY_CLASSES);
  document.body.classList.add(`layout-${layoutId}`);
  if (window.electronAPI && window.electronAPI.setWindowCorners) {
    window.electronAPI.setWindowCorners(layoutId);
  }
  return layoutId;
}

/**
 * Persiste y aplica un layout de UI (iconos + body class + titlebar).
 * @param {string} layoutId
 * @returns {string} layoutId aplicado
 */
export function setUILayout(layoutId) {
  if (!layoutId) return applyUILayoutFromStorage();
  persistSyncedSetting(UI_LAYOUT_STORAGE_KEY, layoutId);
  syncIconThemeForLayout(layoutId);
  const applied = applyUILayoutFromStorage();
  themeManager.refreshTitlebarForCurrentLayout();
  window.dispatchEvent(new Event('layout-changed'));
  return applied;
}

export function getCurrentUILayoutId() {
  try {
    const id = localStorage.getItem(UI_LAYOUT_STORAGE_KEY) || 'unified';
    return id === 'modern-custom' ? 'unified-rounded' : id;
  } catch {
    return 'unified';
  }
}
