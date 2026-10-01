export const BROWSER_WEBVIEW_PARTITION = 'persist:nodeterm-browser';

const FALLBACK_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

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
