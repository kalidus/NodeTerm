/**
 * Traza PDU JSONL compartida (bridge NodeTerm y mitm-capture).
 * Una linea por frame: t_ms, dir, tipo, canal, len, hex64.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { describeRdpPdu } = require('./rdp-protocol-helpers');
const { parseMcsSendData } = require('./rdp-autodetect');
const { describeCliprdrPdu } = require('./rdp-channel-filter');
const { findClientNetworkChannels } = require('./rdp-mcs-helpers');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function hexPrefix(buf, maxBytes = 64) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) return '';
  return buf.subarray(0, Math.min(maxBytes, buf.length)).toString('hex');
}

function classifyFrame(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    return { tipo: 'empty', canal: null, extra: {} };
  }
  const tipo = describeRdpPdu(buf) || `raw(${buf.length}B)`;
  let canal = null;
  let cliprdr = null;
  let csNet = null;
  try {
    const parsed = parseMcsSendData(buf);
    if (parsed && parsed.channelId != null) {
      canal = parsed.channelId;
      const clip = describeCliprdrPdu(parsed.userData);
      if (clip) cliprdr = clip;
    }
  } catch (_) { /* noop */ }
  try {
    if (buf[0] === 0x03 && buf.length > 12 && buf[7] === 0x7f && buf[8] === 0x65) {
      const chs = findClientNetworkChannels(buf);
      if (chs.length) csNet = chs;
    }
  } catch (_) { /* noop */ }
  return { tipo, canal, extra: { cliprdr, csNet } };
}

/** Hex completo en handshake: primeros N frames por direccion, CS_NET/SC_NET y tramas cortas con nota. */
const FULL_HEX_MAX_FRAMES = 40;
const FULL_HEX_MAX_LEN = 4096;

function shouldWriteFullHex(buf, indexForDir, extra, opts) {
  if (opts && opts.full === true) return buf.length <= 65536;
  if (buf.length > FULL_HEX_MAX_LEN) return false;
  if (indexForDir <= FULL_HEX_MAX_FRAMES) return true;
  if (extra && extra.csNet) return true;
  return false;
}

/**
 * Writer JSONL. startMs fija t=0 de la sesion.
 * @param {string} filePath
 * @param {{ label?: string, startMs?: number }} [opts]
 */
function createPduTraceWriter(filePath, opts = {}) {
  if (!filePath) {
    return {
      enabled: false,
      write() {},
      writeInput() {},
      close() {},
      path: null
    };
  }
  ensureDir(filePath);
  const startMs = opts.startMs != null ? opts.startMs : Date.now();
  const stream = fs.createWriteStream(filePath, { flags: 'a' });
  const meta = {
    t_ms: 0,
    dir: 'meta',
    tipo: 'session-start',
    label: opts.label || '',
    startedAt: new Date(startMs).toISOString()
  };
  stream.write(`${JSON.stringify(meta)}\n`);

  return {
    enabled: true,
    path: filePath,
    startMs,
    /**
     * @param {string} dir 'c2s' / 's2c' = CABLE (comparable con mstsc MITM).
     *   'c2s-wasm' / 's2c-wasm' = lado WASM (antes/despues del filtro del bridge).
     * @param {Buffer} buf
     * @param {string} [note]
     * @param {{ src?: 'wire'|'wasm'|'synth', full?: boolean }} [opts]
     */
    write(dir, buf, note, opts) {
      if (!Buffer.isBuffer(buf)) return;
      const { tipo, canal, extra } = classifyFrame(buf);
      const counts = this._counts || (this._counts = {});
      counts[dir] = (counts[dir] || 0) + 1;
      const row = {
        t_ms: Date.now() - startMs,
        dir,
        tipo,
        canal,
        len: buf.length,
        hex64: hexPrefix(buf),
        note: note || undefined,
        src: (opts && opts.src) || undefined,
        cliprdr: extra.cliprdr || undefined,
        csNet: extra.csNet || undefined
      };
      if (shouldWriteFullHex(buf, counts[dir], extra, opts)) {
        row.hex = buf.toString('hex');
      }
      stream.write(`${JSON.stringify(row)}\n`);
    },
    /** Entrada FastPath (raton/teclado): fila compacta, nunca hex completo. */
    writeInput(dir, buf, note) {
      if (!Buffer.isBuffer(buf)) return;
      const row = {
        t_ms: Date.now() - startMs,
        dir,
        tipo: 'FastPath INPUT',
        canal: null,
        len: buf.length,
        hex64: hexPrefix(buf),
        note: note || undefined
      };
      stream.write(`${JSON.stringify(row)}\n`);
    },
    mark(name, detail) {
      const row = {
        t_ms: Date.now() - startMs,
        dir: 'mark',
        tipo: String(name || 'mark'),
        detail: detail || undefined
      };
      stream.write(`${JSON.stringify(row)}\n`);
    },
    close() {
      try { stream.end(); } catch (_) { /* noop */ }
    }
  };
}

/** Path por defecto bajo testing/rdp/traces/. */
function defaultTracePath(prefix) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safe = String(prefix || 'rdp').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(process.cwd(), 'testing', 'rdp', 'traces', `${safe}-${stamp}.jsonl`);
}

module.exports = {
  createPduTraceWriter,
  defaultTracePath,
  classifyFrame,
  hexPrefix
};
