/**
 * Feature CSS deferred after first paint (settings, AI tabs, dialogs…).
 * PrimeReact CSS stays sync in index.js so sidebar trees never FOUC.
 */

let featuresPromise = null;

export function loadDeferredFeatureCss() {
  if (!featuresPromise) {
    featuresPromise = Promise.all([
      import('../styles/features.css'),
      import('../styles/components/animated-themes.css'),
      import('../styles/components/dialogs.css'),
      import('../styles/layout/atelier.css'),
      import('../styles/layout/mux.css'),
      import('../styles/layout/islas.css'),
      import('../styles/layout/dock.css'),
      import('../styles/layout/tablero.css')
    ]).catch(() => {});
  }
  return featuresPromise;
}

/** Kick off feature CSS download without awaiting. */
export function warmDeferredFeatureCss() {
  loadDeferredFeatureCss();
}
