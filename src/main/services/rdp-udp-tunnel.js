/**
 * Proceso nativo del canal UDP fiable (RDPEUDP2 + TLS).
 * El renderer le pasa la cookie del Initiate Multitransport Request y
 * recibe los PDU de canal dinámico ya descifrados.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let child = null;
let frameBuffer = Buffer.alloc(0);
let handshake = null;
let onPayload = null;

function helperCandidates() {
  const { app } = require('electron');
  const exe = process.platform === 'win32' ? 'nodeterm-rdpeudp.exe' : 'nodeterm-rdpeudp';
  const roots = [
    path.resolve(__dirname, '../../..'),
    app?.getAppPath?.() || '',
    process.resourcesPath || ''
  ];
  const relative = [
    ['native', 'rdpeudp-helper', 'target', 'release', exe],
    ['native', 'rdpeudp-helper', 'target', 'debug', exe],
    [exe]
  ];
  const found = [];
  for (const root of roots) {
    if (!root) continue;
    for (const parts of relative) {
      found.push(path.join(root, ...parts));
    }
  }
  return found;
}

function resolveHelper() {
  return helperCandidates().find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch (_) {
      return false;
    }
  }) || null;
}

function writeFrame(stream, payload) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  stream.write(header);
  stream.write(body);
}

function consumeFrames(chunk, onFrame) {
  frameBuffer = Buffer.concat([frameBuffer, chunk]);
  while (frameBuffer.length >= 4) {
    const len = frameBuffer.readUInt32LE(0);
    if (len > 8 * 1024 * 1024) {
      throw new Error('frame UDP demasiado grande');
    }
    if (frameBuffer.length < 4 + len) break;
    const frame = Buffer.from(frameBuffer.subarray(4, 4 + len));
    frameBuffer = frameBuffer.subarray(4 + len);
    onFrame(frame);
  }
}

function stopTunnel() {
  const current = child;
  child = null;
  handshake = null;
  frameBuffer = Buffer.alloc(0);
  if (!current) return;
  try {
    if (current.stdin && !current.stdin.destroyed) {
      writeFrame(current.stdin, Buffer.alloc(0));
      current.stdin.end();
    }
  } catch (_) { /* el proceso ya cerro */ }
  try { current.kill(); } catch (_) { /* ya termino */ }
}

function openTunnel({ host, port, serverName, requestId, cookie }, emitPayload) {
  stopTunnel();
  onPayload = emitPayload;
  const exe = resolveHelper();
  if (!exe) {
    return Promise.resolve({
      ok: false,
      error: 'falta native/rdpeudp-helper/target/release/nodeterm-rdpeudp.exe'
    });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const proc = spawn(exe, [], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    child = proc;
    frameBuffer = Buffer.alloc(0);

    const timer = setTimeout(() => {
      finish({ ok: false, error: 'el canal UDP no contesto a tiempo' });
      stopTunnel();
    }, 20000);

    proc.stderr.on('data', (chunk) => {
      const text = String(chunk || '').trim();
      if (text) console.warn(`[rdp-udp] ${text}`);
    });

    proc.on('error', (error) => {
      clearTimeout(timer);
      finish({ ok: false, error: error?.message || String(error) });
      stopTunnel();
    });

    proc.on('exit', (code) => {
      clearTimeout(timer);
      if (!settled) {
        finish({ ok: false, error: `el canal UDP termino (${code})` });
      }
      if (child === proc) {
        child = null;
        handshake = null;
      }
    });

    proc.stdout.on('data', (chunk) => {
      try {
        consumeFrames(chunk, (frame) => {
          if (!handshake) {
            handshake = true;
            clearTimeout(timer);
            let parsed = null;
            try { parsed = JSON.parse(frame.toString('utf8')); } catch (_) { parsed = null; }
            if (!parsed?.ok) {
              finish({ ok: false, error: parsed?.error || 'el canal UDP rechazo el enlace' });
              stopTunnel();
              return;
            }
            finish({ ok: true });
            return;
          }
          if (onPayload && frame.length > 0) onPayload(frame);
        });
      } catch (error) {
        clearTimeout(timer);
        finish({ ok: false, error: error?.message || String(error) });
        stopTunnel();
      }
    });

    const body = JSON.stringify({
      host,
      port: Number(port) || 3389,
      serverName: serverName || host,
      requestId: Number(requestId) >>> 0,
      cookie: String(cookie || '')
    });
    try {
      writeFrame(proc.stdin, Buffer.from(body, 'utf8'));
    } catch (error) {
      clearTimeout(timer);
      finish({ ok: false, error: error?.message || String(error) });
      stopTunnel();
    }
  });
}

function sendTunnel(payload) {
  if (!child?.stdin || child.stdin.destroyed) return false;
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  if (body.length === 0) return false;
  try {
    writeFrame(child.stdin, body);
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  openTunnel,
  sendTunnel,
  stopTunnel,
  resolveHelper
};
