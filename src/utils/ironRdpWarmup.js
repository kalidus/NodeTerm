/**
 * Inicializacion compartida del WASM IronRDP.
 * La primera llamada paga decode+compile (~6MB); las siguientes reutilizan la misma promesa.
 */

let initPromise = null;

/**
 * @param {string} [logLevel='warn']
 * @returns {Promise<void>}
 */
export function ensureIronRdpInitialized(logLevel = 'warn') {
  if (!initPromise) {
    const t0 = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
    initPromise = import('@devolutions/iron-remote-desktop-rdp')
      .then((mod) => {
        const init = mod.init || (mod.default && mod.default.init);
        if (typeof init !== 'function') {
          throw new Error('iron-remote-desktop-rdp.init no disponible');
        }
        return init(logLevel);
      })
      .then(() => {
        const ms = Math.round(
          ((typeof performance !== 'undefined' && performance.now)
            ? performance.now()
            : Date.now()) - t0
        );
        console.log(`⏱️ [IronRDP WASM] init listo (+${ms}ms)`);
      })
      .catch((err) => {
        initPromise = null;
        throw err;
      });
  }
  return initPromise;
}

/**
 * Precarga/compila el WASM en idle (fuera del 1er connect).
 * @returns {Promise<void>}
 */
export function warmupIronRdpInIdle() {
  return ensureIronRdpInitialized('warn').catch((err) => {
    console.warn('[IronRDP WASM] Precarga idle fallida:', err && err.message ? err.message : err);
  });
}
