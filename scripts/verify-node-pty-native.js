#!/usr/bin/env node
/**
 * Verifica que node-pty carga bajo Electron (usado por rebuild-node-pty-native.js).
 */
'use strict';

try {
  const pty = require('node-pty');
  if (typeof pty.spawn !== 'function') {
    console.error('[nodeterm] node-pty.spawn no es una función');
    process.exit(1);
  }
  console.log('[nodeterm] node-pty OK');
  process.exit(0);
} catch (e) {
  console.error('[nodeterm] node-pty FAIL:', e.message);
  process.exit(1);
}
