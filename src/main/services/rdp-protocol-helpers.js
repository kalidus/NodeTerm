/**
 * Helpers RDP / X.224 / politica CredSSP (sin Electron).
 * PROTOCOL_SSL=0x01, PROTOCOL_HYBRID=0x02, PROTOCOL_HYBRID_EX=0x08
 */

'use strict';

const PROTOCOL_SSL = 0x00000001;
const PROTOCOL_HYBRID = 0x00000002;
const PROTOCOL_HYBRID_EX = 0x00000008;

function protocolName(code) {
  const n = code >>> 0;
  const parts = [];
  if (n & PROTOCOL_SSL) parts.push('SSL(0x01)');
  if (n & PROTOCOL_HYBRID) parts.push('HYBRID(0x02)');
  if (n & PROTOCOL_HYBRID_EX) parts.push('HYBRID_EX(0x08)');
  if (parts.length === 0) return `UNKNOWN(0x${n.toString(16)})`;
  return parts.join('|');
}

/**
 * Politica CredSSP segun security + selectedProtocol del preflight.
 * Mantener alineado con src/utils/rdpSecurityPolicy.js
 */
function resolveCredsspPolicy(security, selectedProtocol) {
  const sec = String(security || 'any').toLowerCase();
  if (sec === 'tls' || sec === 'rdp') return false;
  if (sec === 'nla') return true;
  if (selectedProtocol === PROTOCOL_SSL) return false;
  if (
    selectedProtocol === PROTOCOL_HYBRID ||
    selectedProtocol === PROTOCOL_HYBRID_EX ||
    (typeof selectedProtocol === 'number' && (selectedProtocol & (PROTOCOL_HYBRID | PROTOCOL_HYBRID_EX)))
  ) {
    return true;
  }
  return true;
}

/**
 * Lee selectedProtocol (u32 LE) del bloque RDP_NEG_RSP en un X.224 CC.
 * @returns {number|null}
 */
function readSelectedProtocol(buf) {
  const parsed = parseX224ConnectionConfirm(buf);
  if (!parsed || !parsed.ok) return null;
  return parsed.selectedProtocol;
}

function parseX224ConnectionConfirm(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 11) return null;
  if (buf[0] !== 0x03 || buf[1] !== 0x00) return null;

  const tpktLen = buf.readUInt16BE(2);
  let negoOffset = -1;
  for (let i = 7; i <= buf.length - 8; i++) {
    const t = buf[i];
    if ((t === 0x02 || t === 0x03) && buf.readUInt16LE(i + 2) === 8) {
      negoOffset = i;
      break;
    }
  }
  if (negoOffset < 0) {
    if (buf.length < 19) {
      return { ok: true, selectedProtocol: 0, failureCode: null, rawLen: buf.length, tpktLen, hasNego: false };
    }
    negoOffset = 11;
  }

  const type = buf[negoOffset];
  const result = buf.readUInt32LE(negoOffset + 4);
  if (type === 0x03) {
    return {
      ok: false,
      selectedProtocol: null,
      failureCode: result,
      rawLen: buf.length,
      tpktLen,
      hasNego: true,
      negoOffset
    };
  }

  return {
    ok: true,
    selectedProtocol: result >>> 0,
    failureCode: null,
    rawLen: buf.length,
    tpktLen,
    hasNego: true,
    negoOffset
  };
}

module.exports = {
  PROTOCOL_SSL,
  PROTOCOL_HYBRID,
  PROTOCOL_HYBRID_EX,
  protocolName,
  resolveCredsspPolicy,
  readSelectedProtocol,
  parseX224ConnectionConfirm
};
