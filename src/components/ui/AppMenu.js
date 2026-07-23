/**
 * AppMenu - utilidades y clases compartidas para menus contextuales/app.
 * Look unificado via tokens --ui-context-* y clase app-menu-surface.
 */

export const APP_MENU_SURFACE_CLASS = 'app-menu-surface';
export const APP_MENU_ITEM_CLASS = 'app-menu-item';
export const APP_MENU_SEPARATOR_CLASS = 'app-menu-separator';
export const APP_MENU_EMPTY_CLASS = 'app-menu-empty';

/**
 * Props de estilo posicion fixed tipicas para menus custom (React).
 * @param {{ left: number, top: number }} position
 * @param {object} [extra]
 */
export function getAppMenuSurfaceStyle(position = {}, extra = {}) {
  return {
    position: 'fixed',
    left: position.left ?? position.x ?? 0,
    top: position.top ?? position.y ?? 0,
    zIndex: 9999,
    minWidth: 180,
    maxHeight: 320,
    overflow: 'auto',
    ...extra
  };
}

/**
 * Combina clases de superficie de menu.
 * @param {...(string|false|null|undefined)} classes
 */
export function appMenuClassNames(...classes) {
  return ['app-menu-surface', ...classes].filter(Boolean).join(' ');
}

export default {
  APP_MENU_SURFACE_CLASS,
  APP_MENU_ITEM_CLASS,
  APP_MENU_SEPARATOR_CLASS,
  APP_MENU_EMPTY_CLASS,
  getAppMenuSurfaceStyle,
  appMenuClassNames
};
