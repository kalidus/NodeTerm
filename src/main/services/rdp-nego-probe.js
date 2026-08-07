/**
 * Preflight X.224: descubre selectedProtocol del servidor sin TLS completo.
 * Usado para decidir enableCredssp antes de arrancar IronRDP WASM.
 */

'use strict';

const net = require('net');
const {
  PROTOCOL_SSL,
  PROTOCOL_HYBRID,
  PROTOCOL_HYBRID_EX,
  protocolName,
  parseX224ConnectionConfirm
} = require('./rdp-protocol-helpers');

function buildX224ConnectionRequest(username, requestedProtocols) {
  let samUser = String(username || 'nodeterm');
  if (samUser.includes('\\')) samUser = samUser.split('\\')[1];
  const cookieStr = `Cookie: mstshash=${samUser}\r\n`;
  const cookieBytes = Buffer.from(cookieStr, 'utf8');
  const nego = Buffer.alloc(8);
  nego[0] = 0x01;
  nego[1] = 0x00;
  nego.writeUInt16LE(8, 2);
  nego.writeUInt32LE(requestedProtocols >>> 0, 4);
  const tpktLen = 11 + cookieBytes.length + nego.length;
  const header = Buffer.from([
    0x03, 0x00,
    (tpktLen >> 8) & 0xff, tpktLen & 0xff,
    tpktLen - 5, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);
  return Buffer.concat([header, cookieBytes, nego]);
}

/**
 * @returns {Promise<{ ok: boolean, selectedProtocol: number|null, failureCode: number|null, protocolLabel: string, error?: string }>}
 */
function probeSelectedProtocol({ host, port = 3389, username = 'nodeterm', timeoutMs = 8000 } = {}) {
  const requested = PROTOCOL_SSL | PROTOCOL_HYBRID | PROTOCOL_HYBRID_EX;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch (_) {}
      resolve(result);
    };

    const socket = net.connect({ host, port: parseInt(port, 10) || 3389 });
    const timer = setTimeout(() => {
      finish({
        ok: false,
        selectedProtocol: null,
        failureCode: null,
        protocolLabel: 'timeout',
        error: `probe timeout ${timeoutMs}ms`
      });
    }, timeoutMs);

    socket.setTimeout(timeoutMs);
    socket.once('timeout', () => {
      clearTimeout(timer);
      finish({
        ok: false,
        selectedProtocol: null,
        failureCode: null,
        protocolLabel: 'timeout',
        error: 'socket timeout'
      });
    });

    socket.once('error', (err) => {
      clearTimeout(timer);
      finish({
        ok: false,
        selectedProtocol: null,
        failureCode: null,
        protocolLabel: 'error',
        error: err.message
      });
    });

    socket.once('connect', () => {
      socket.setNoDelay(true);
      socket.write(buildX224ConnectionRequest(username, requested));
    });

    socket.once('data', (chunk) => {
      clearTimeout(timer);
      const parsed = parseX224ConnectionConfirm(chunk);
      if (!parsed) {
        finish({
          ok: false,
          selectedProtocol: null,
          failureCode: null,
          protocolLabel: 'parse-error',
          error: 'X.224 CC no parseable'
        });
        return;
      }
      if (!parsed.ok) {
        finish({
          ok: false,
          selectedProtocol: null,
          failureCode: parsed.failureCode,
          protocolLabel: `FAILURE(${parsed.failureCode})`,
          error: `NEG_FAILURE ${parsed.failureCode}`
        });
        return;
      }
      finish({
        ok: true,
        selectedProtocol: parsed.selectedProtocol,
        failureCode: null,
        protocolLabel: protocolName(parsed.selectedProtocol)
      });
    });
  });
}

module.exports = {
  probeSelectedProtocol,
  buildX224ConnectionRequest
};
