'use strict';
/**
 * Comprueba que better-sqlite3 y dpapi cargan en el runtime de Electron.
 * Invocado por rebuild-browser-import-native.js (no usar a mano).
 */
try {
  const db = require('better-sqlite3')(':memory:');
  db.close();
  const { Dpapi, isPlatformSupported } = require('@primno/dpapi');
  if (process.platform === 'win32' && isPlatformSupported && (!Dpapi || typeof Dpapi.unprotectData !== 'function')) {
    process.exit(2);
  }
  process.exit(0);
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
