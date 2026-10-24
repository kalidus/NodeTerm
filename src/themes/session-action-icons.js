/**
 * Shim — session-action icon themes live in ./session-action-icons/
 * (modern + classic eager, rest lazy; premium as one chunk).
 */
export {
  sessionActionIconThemes,
  getSessionActionIconTheme,
  ensureSessionActionIconTheme,
  isSessionActionIconThemeLoaded,
  preloadSessionActionIconThemes,
  onSessionActionIconThemeLoaded,
  warmSessionActionIconThemesFromStorage,
  newDocumentToolbarIcon,
  getDefaultSessionActionIconTheme,
  setSessionActionIconTheme,
  sessionActionIconThemeMeta,
  sessionActionIconThemeIds,
  sessionActionIconThemeOptions,
  PREMIUM_SESSION_ACTION_IDS
} from './session-action-icons/index';
