#!/usr/bin/env node
'use strict';
const fs = require('fs');
const p = 'node_modules/@devolutions/iron-remote-desktop-rdp/iron-remote-desktop-rdp.js';
const js = fs.readFileSync(p, 'utf8');
const m = 'data:application/wasm;base64,';
const i = js.indexOf(m) + m.length;
const e = js.indexOf('"', i);
const w = Buffer.from(js.slice(i, e), 'base64');
const old = Buffer.from([0x20, 0x01, 0x2d, 0x00, 0xe3, 0x09, 0x45]);
const neu = Buffer.from([0x20, 0x01, 0x1a, 0x41, 0x00, 0x01, 0x01]);
console.log(JSON.stringify({
  jsSize: js.length,
  wasmSize: w.length,
  oldHits: w.indexOf(old),
  newHits: w.indexOf(neu)
}));
