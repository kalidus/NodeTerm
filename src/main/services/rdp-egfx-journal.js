/**
 * Diario corto de EGFX. Una línea JSON por evento, anillo de 200.
 * El binario del último resize se sobrescribe aparte (tope 4 MB).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const MAX_LINES = 200;
const MAX_CAPTURE = 4 * 1024 * 1024;

function logDir() {
  return path.join(app.getPath('userData'), 'logs');
}

function journalPath() {
  return path.join(logDir(), 'rdp-egfx-diag.jsonl');
}

function capturePath() {
  return path.join(logDir(), 'rdp-egfx-last-resize.bin');
}

function ensureDir() {
  fs.mkdirSync(logDir(), { recursive: true });
}

function appendLine(line) {
  if (typeof line !== 'string' || !line.trim()) return;
  const text = line.trim().replace(/[\r\n]/g, '');
  ensureDir();
  const file = journalPath();
  let lines = [];
  try {
    lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  } catch (_) {
    lines = [];
  }
  lines.push(text);
  if (lines.length > MAX_LINES) {
    lines = lines.slice(lines.length - MAX_LINES);
  }
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
}

function writeCapture(bytes) {
  if (!bytes) return;
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const capped = buf.length > MAX_CAPTURE ? buf.subarray(0, MAX_CAPTURE) : buf;
  ensureDir();
  fs.writeFileSync(capturePath(), capped);
}

module.exports = {
  journalPath,
  capturePath,
  appendLine,
  writeCapture
};
