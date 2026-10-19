export const BROWSER_WEBVIEW_PARTITION = 'persist:nodeterm-browser';
export const AI_CLIENTS_STORAGE_KEY = 'ai_clients_enabled';

const FALLBACK_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

/** Navegador integrado: ON por defecto si la clave no existe (compat). */
export function isIntegratedBrowserEnabled() {
  try {
    if (typeof localStorage === 'undefined') return true;
    const raw = localStorage.getItem(AI_CLIENTS_STORAGE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    return parsed.browser !== false;
  } catch {
    return true;
  }
}

export function openUrlInSystemBrowser(url) {
  if (!url || typeof url !== 'string') return;
  const trimmed = url.trim();
  if (!trimmed) return;
  if (window.electron?.system?.openWithBrowser) {
    window.electron.system.openWithBrowser(trimmed).catch(() => {
      window.electron?.openExternal?.(trimmed);
    });
    return;
  }
  if (window.electron?.openExternal) {
    window.electron.openExternal(trimmed);
    return;
  }
  if (window.electron?.import?.openExternal) {
    window.electron.import.openExternal(trimmed);
  }
}

export function getBrowserWebviewUserAgent() {
  if (typeof navigator === 'undefined' || !navigator.userAgent) {
    return FALLBACK_CHROME_UA;
  }
  const cleaned = navigator.userAgent
    .replace(/\sElectron\/[\d.]+\s?/g, ' ')
    .replace(/\sNodeTerm\/[\d.]+\s?/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned || FALLBACK_CHROME_UA;
}

export function isIgnorableWebviewFail(event) {
  if (!event) return true;
  if (event.errorCode === -3) return true;
  if (event.isMainFrame === false) return true;
  return false;
}

export function loadWebviewUrl(view, targetUrl) {
  if (!view || !targetUrl) return;
  try {
    if (typeof view.getURL === 'function' && view.getURL() === targetUrl) {
      return;
    }
  } catch {
    // El guest puede no estar listo; se intenta loadURL igual
  }
  if (typeof view.loadURL === 'function') {
    view.loadURL(targetUrl);
    return;
  }
  view.src = targetUrl;
}
