/** Caché de iconos/colores del árbol de conexiones (Sidebar). */

export const iconCache = new Map();
export const defaultColorCache = new Map();

export const getCachedIcon = (key, creatorFn) => {
  if (iconCache.has(key)) {
    return iconCache.get(key);
  }
  const result = creatorFn();
  iconCache.set(key, result);
  return result;
};

export const clearSidebarIconCaches = () => {
  iconCache.clear();
  defaultColorCache.clear();
};
