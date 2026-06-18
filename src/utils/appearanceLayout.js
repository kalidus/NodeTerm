/** Clave localStorage del estilo de apariencia (layout global de la UI). */
export const UI_LAYOUT_STORAGE_KEY = 'ui_layout';

const LAYOUT_BODY_CLASSES = ['layout-default', 'layout-cyberpunk', 'layout-unified', 'layout-unified-rounded', 'layout-unified-app-rounded', 'layout-modern-custom'];

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
    localStorage.setItem(UI_LAYOUT_STORAGE_KEY, 'unified-rounded');
  }
  document.body.classList.remove(...LAYOUT_BODY_CLASSES);
  document.body.classList.add(`layout-${layoutId}`);
  if (window.electronAPI && window.electronAPI.setWindowCorners) {
    window.electronAPI.setWindowCorners(layoutId);
  }
  return layoutId;
}
