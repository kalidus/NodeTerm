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

function describeRdpPdu(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) return 'empty';

  // TPKT PDU (0x03 0x00 ...)
  if (buf[0] === 0x03 && buf.length >= 4) {
    const totalLen = buf.readUInt16BE(2);
    if (buf.length >= 7 && buf[4] === 0x02 && buf[5] === 0xf0 && buf[6] === 0x80) {
      const mcsType = buf[7];
      if (mcsType === 0x68 || mcsType === 0x64) {
        const initiator = buf.readUInt16BE(8);
        const channelId = buf.readUInt16BE(10);
        const isIndication = mcsType === 0x68;
        let pduDesc = `MCS-${isIndication ? 'Ind' : 'Req'} ch=${channelId} init=${initiator}`;

        // PER length at offset 13
        let off = 13;
        let dataLen = 0;
        if (off < buf.length) {
          const b0 = buf[off++];
          if ((b0 & 0x80) === 0) {
            dataLen = b0;
          } else if (off < buf.length) {
            dataLen = ((b0 & 0x7f) << 8) | buf[off++];
          }
        }

        const userData = buf.subarray(off, off + dataLen);
        if (userData.length >= 4) {
          const secFlags = userData.readUInt16LE(0);
          if (secFlags & 0x1000) pduDesc += ' [SEC_AUTODETECT_REQ]';
          if (secFlags & 0x2000) pduDesc += ' [SEC_AUTODETECT_RSP]';
          if (secFlags & 0x4000) pduDesc += ' [SEC_HEARTBEAT]';
        }

        if (userData.length >= 10) {
          const sharePduType = userData.readUInt16LE(2) & 0x0f;
          const sharePduTypeNames = {
            1: 'DEMAND_ACTIVE',
            2: 'CONFIRM_ACTIVE',
            3: 'DEACTIVATE_ALL',
            4: 'DATA_PDU',
            7: 'SERVER_REDIRECTION'
          };
          const shareTypeName = sharePduTypeNames[sharePduType] || `SHARE_${sharePduType}`;
          pduDesc += ` ${shareTypeName}`;

          if (sharePduType === 4 && userData.length >= 19) {
            const pduType2 = userData[18];
            const pduType2Names = {
              2: 'UPDATE',
              3: 'CONTROL',
              4: 'POINTER',
              5: 'INPUT',
              6: 'SYNCHRONIZE',
              7: 'REFRESH_RECT',
              8: 'PLAY_SOUND',
              9: 'SUPPRESS_OUTPUT',
              10: 'SHUTDOWN_REQ',
              11: 'SHUTDOWN_DENIED',
              12: 'SAVE_SESSION_INFO',
              13: 'FONTLIST',
              14: 'FONTMAP',
              15: 'SET_KEYBOARD_IND',
              16: 'BITMAPCACHE_PERSISTENT_LIST',
              17: 'BITMAPCACHE_ERROR',
              18: 'SET_KEYBOARD_IME',
              19: 'AUTO_RECONNECT_STATUS',
              20: 'SET_ERROR_INFO',
              21: 'DRAWNINEGRID_ERROR',
              22: 'DRAWGDIPLUS_ERROR',
              23: 'ARC_STATUS',
              24: 'STATUS_INFO',
              25: 'MONITOR_LAYOUT',
              26: 'FRAME_ACK'
            };
            pduDesc += `/${pduType2Names[pduType2] || `TYPE2_${pduType2}`}`;
            if (pduType2 === 2 && userData.length >= 21) {
              const updateType = userData.readUInt16LE(19);
              const updateNames = { 0: 'ORDERS', 1: 'BITMAP', 2: 'PALETTE', 3: 'SYNCHRONIZE' };
              pduDesc += `(${updateNames[updateType] || `UPD_${updateType}`})`;
            }
            if (pduType2 === 3 && userData.length >= 21) {
              const controlAction = userData.readUInt16LE(19);
              const controlNames = { 1: 'COOPERATE', 2: 'REQUEST_CONTROL', 3: 'GRANT_CONTROL' };
              pduDesc += `(${controlNames[controlAction] || `ACTION_${controlAction}`})`;
            }
          }
        }
        return `${pduDesc} (${buf.length}B)`;
      }
      if (buf[7] === 0x3e && buf.length >= 13) {
        return `MCS-ChannelJoinConfirm ch=${buf.readUInt16BE(11)} (${buf.length}B)`;
      }
      return `MCS-PDU 0x${buf[7].toString(16)} (${buf.length}B)`;
    }
    return `TPKT totalLen=${totalLen} rawLen=${buf.length}B`;
  }

  // FastPath PDU (bits 0..1 == 0)
  if ((buf[0] & 0x03) === 0) {
    let off = 1;
    if (buf.length > 1 && (buf[1] & 0x80)) {
      off = 3;
    } else {
      off = 2;
    }
    let fpDesc = 'FastPath';
    if (off < buf.length) {
      const updateHeader = buf[off];
      const updateCode = updateHeader & 0x0f;
      const updateNames = {
        0: 'ORDERS',
        1: 'BITMAP',
        2: 'PALETTE',
        3: 'SYNCHRONIZE',
        4: 'SURFACE_CMDS (EGFX)',
        5: 'PTR_HIDDEN',
        6: 'PTR_DEFAULT',
        7: 'PTR_POSITION',
        8: 'PTR_COLOR',
        9: 'PTR_CACHED',
        10: 'PTR_NEW',
        11: 'PTR_LARGE'
      };
      fpDesc += ` ${updateNames[updateCode] || `CODE_${updateCode}`}`;
    }
    return `${fpDesc} (${buf.length}B)`;
  }

  return `RAW 0x${buf[0].toString(16)} (${buf.length}B)`;
}

module.exports = {
  PROTOCOL_SSL,
  PROTOCOL_HYBRID,
  PROTOCOL_HYBRID_EX,
  protocolName,
  resolveCredsspPolicy,
  readSelectedProtocol,
  parseX224ConnectionConfirm,
  describeRdpPdu
};

