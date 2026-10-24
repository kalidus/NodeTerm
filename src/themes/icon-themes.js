/**
 * Shim — icon themes live in ./icon-themes/ (nord+material eager, rest lazy).
 * Existing `import { iconThemes } from '../themes/icon-themes'` keeps working.
 */
export {
  iconThemes,
  getIconTheme,
  ensureIconTheme,
  isIconThemeLoaded,
  preloadIconThemes,
  onIconThemeLoaded,
  warmIconThemesFromStorage,
  iconThemeMeta,
  iconThemeIds,
  iconThemeOptions
} from './icon-themes/index';
