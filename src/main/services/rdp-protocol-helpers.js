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

// T.125 Result: un join que no sea rt-successful deja el canal sin unir, y cualquier dato que
// se envie por el es una violacion de protocolo.
const MCS_RESULT_NAMES = {
  0: 'rt-successful',
  1: 'rt-domain-merging',
  2: 'rt-domain-not-hierarchical',
  3: 'rt-no-such-channel',
  4: 'rt-no-such-domain',
  5: 'rt-no-such-user',
  6: 'rt-not-admitted',
  7: 'rt-other-user-id',
  8: 'rt-parameters-unacceptable',
  9: 'rt-token-not-available',
  10: 'rt-token-not-possessed',
  11: 'rt-too-many-channels',
  12: 'rt-too-many-tokens',
  13: 'rt-too-many-users',
  14: 'rt-unspecified-failure',
  15: 'rt-user-rejected'
};

// MS-RDPBCGR 2.2.8.1.1.1.2. Cuidado: la tabla de nombres de describeRdpPdu usa un indice
// secuencial propio que NO son los valores reales de PDUTYPE2; aqui van los de la especificacion.
const PDUTYPE_DATAPDU = 7;
const PDUTYPE2_SET_ERROR_INFO = 47;
const SHARE_DATA_HEADER_LEN = 18;

// T.125 DisconnectProviderUltimatum: reason va en PER de 3 bits a caballo entre los dos bytes
const MCS_DISCONNECT_REASONS = {
  0: 'rn-domain-disconnected',
  1: 'rn-provider-initiated',
  2: 'rn-token-purged',
  3: 'rn-user-requested',
  4: 'rn-channel-purged'
};

// MS-RDPBCGR 2.2.5.1.1. Sólo se nombran los códigos seguros; el resto se deja en hexadecimal
// para poder buscarlo en la especificación sin inventar nombres.
const ERROR_INFO_CODES = {
  0x00000001: 'ERRINFO_RPC_INITIATED_DISCONNECT',
  0x00000002: 'ERRINFO_RPC_INITIATED_LOGOFF',
  0x00000003: 'ERRINFO_IDLE_TIMEOUT',
  0x00000004: 'ERRINFO_LOGON_TIMEOUT',
  0x00000005: 'ERRINFO_DISCONNECTED_BY_OTHER_CONNECTION',
  0x00000006: 'ERRINFO_OUT_OF_MEMORY',
  0x00000007: 'ERRINFO_SERVER_DENIED_CONNECTION',
  0x0000000c: 'ERRINFO_LOGOFF_BY_USER',
  0x00001001: 'ERRINFO_UNKNOWNPDUTYPE2',
  0x00001002: 'ERRINFO_UNKNOWNPDUTYPE',
  0x00001003: 'ERRINFO_DATAPDUSEQUENCE',
  0x00001005: 'ERRINFO_CONTROLPDUSEQUENCE',
  0x00001006: 'ERRINFO_INVALIDCONTROLPDUACTION',
  0x00001007: 'ERRINFO_INVALIDINPUTPDUTYPE'
};

// Detecta el PDU con el que el servidor anuncia que va a cerrar la sesión, para poder saber el
// motivo en vez de quedarse en un simple cierre de socket. Devuelve null si el frame no lo es.
function describeDisconnectPdu(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 9) return null;
  if (buf[0] !== 0x03 || buf[1] !== 0x00) return null;
  if (buf[4] !== 0x02 || buf[5] !== 0xf0 || buf[6] !== 0x80) return null;

  const mcsType = buf[7];
  if (mcsType === 0x21) {
    const reason = ((mcsType & 0x03) << 1) | (buf[8] >> 7);
    const name = MCS_DISCONNECT_REASONS[reason] || `reason=${reason}`;
    return `MCS Disconnect Provider Ultimatum (${name})`;
  }

  if (mcsType !== 0x68) return null;

  let off = 13;
  const b0 = buf[off++];
  const dataLen = (b0 & 0x80) === 0 ? b0 : (((b0 & 0x7f) << 8) | buf[off++]);
  const userData = buf.subarray(off, off + dataLen);

  // La cabecera de seguridad de 4 bytes puede estar o no, asi que se prueban las dos bases.
  // Para no dar falsos positivos se exige coherencia de las tres cosas a la vez: totalLength
  // cuadrando con el tamano real, pduType = PDUTYPE_DATAPDU y pduType2 = SET_ERROR_INFO.
  for (const base of [0, 4]) {
    if (userData.length < base + SHARE_DATA_HEADER_LEN + 4) continue;
    if (userData.readUInt16LE(base) !== userData.length - base) continue;
    if ((userData.readUInt16LE(base + 2) & 0x0f) !== PDUTYPE_DATAPDU) continue;
    if (userData[base + 14] !== PDUTYPE2_SET_ERROR_INFO) continue;

    const code = userData.readUInt32LE(base + SHARE_DATA_HEADER_LEN);
    const name = ERROR_INFO_CODES[code] || 'ver MS-RDPBCGR 2.2.5.1.1';
    return `TS_SET_ERROR_INFO errorInfo=0x${code.toString(16).padStart(8, '0')} (${name})`;
  }

  return null;
}

function preferDisconnectDesc(current, next) {
  if (!next) return current || null;
  if (!current) return next;
  const currentIsErrInfo = current.includes('TS_SET_ERROR_INFO') || current.includes('ERRINFO_');
  const nextIsUltimatum = next.includes('Disconnect Provider Ultimatum');
  if (currentIsErrInfo && nextIsUltimatum) return current;
  return next;
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
            2: 'DEACTIVATE_ALL',
            3: 'CONFIRM_ACTIVE',
            6: 'DEACTIVATE_ALL',
            7: 'DATA_PDU',
            10: 'SERVER_REDIRECTION'
          };
          const shareTypeName = sharePduTypeNames[sharePduType] || `SHARE_${sharePduType}`;
          pduDesc += ` ${shareTypeName}`;

          if (sharePduType === 7 && userData.length >= 19) {
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
        // T.125 ChannelJoinConfirm en PER alineado: byte 8 lleva el bit de presencia del campo
        // opcional y los 4 bits de Result; despues initiator, el canal pedido y el concedido.
        // Ojo: el canal concedido puede no ser el pedido, y el offset 11 es el PEDIDO.
        // El campo opcional se deduce de la longitud del frame, que es un dato duro, en vez de
        // fiarse del bit de preambulo. El byte discriminador se imprime en crudo para validarlo.
        const result = (buf[8] >> 3) & 0x0f;
        const requested = buf.readUInt16BE(11);
        const granted = buf.length >= 15 ? buf.readUInt16BE(13) : null;
        const resultName = MCS_RESULT_NAMES[result] || `result=${result}`;
        const grantedDesc = granted != null && granted !== requested ? ` concedido=${granted}` : '';
        return `MCS-ChannelJoinConfirm ch=${requested}${grantedDesc} [${resultName} hdr=0x${buf[8].toString(16).padStart(2, '0')}] (${buf.length}B)`;
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

/**
 * Separa múltiples frames concatenados en un mismo chunk TCP / TLS:
 * - TPKT (0x03 0x00 ...)
 * - Fast-Path ((b0 & 0x03) === 0 && (b0 & 0x30) === 0)
 * - CredSSP ASN.1 SEQUENCE (0x30 ...)
 *
 * Preserva intactos y aislados cada uno de los frames para que IronRDP WASM
 * no reciba bytes extra ni desalineamientos de flujo.
 *
 * @param {Buffer} buf
 * @returns {Buffer[]}
 */
class RdpStreamDeframer {
  constructor() {
    this.buffer = Buffer.alloc(0);
  }

  /**
   * Agrega un chunk TCP y retorna un array con todos los frames RDP completos.
   * Si el último frame está incompleto (fragmentado por TCP), se retiene en el buffer
   * interno hasta que lleguen los bytes restantes en el siguiente chunk.
   *
   * Soporta:
   * - TPKT (0x03 0x00 ...)
   * - Fast-Path ((b0 & 0x03) === 0 && (b0 & 0x30) === 0)
   * - CredSSP ASN.1 SEQUENCE (0x30 ...)
   *
   * @param {Buffer} chunk
   * @returns {Buffer[]}
   */
  push(chunk) {
    if (!Buffer.isBuffer(chunk) || chunk.length === 0) return [];

    if (this.buffer.length === 0) {
      this.buffer = chunk;
    } else {
      this.buffer = Buffer.concat([this.buffer, chunk]);
    }

    const frames = [];
    let offset = 0;

    while (offset < this.buffer.length) {
      const remaining = this.buffer.length - offset;
      if (remaining < 2) {
        // Necesitamos al menos 2 bytes para determinar el tipo y longitud
        break;
      }

      const b0 = this.buffer[offset];

      // 1. TPKT frame (0x03 0x00 len_hi len_lo)
      if (b0 === 0x03) {
        if (this.buffer[offset + 1] !== 0x00) {
          offset++;
          continue;
        }
        if (remaining < 4) {
          // Incompleto: faltan bytes para leer la longitud TPKT
          break;
        }
        const tpktLen = this.buffer.readUInt16BE(offset + 2);
        if (tpktLen < 4) {
          offset++;
          continue;
        }
        if (remaining < tpktLen) {
          // Incompleto: esperar al siguiente chunk TCP
          break;
        }
        frames.push(this.buffer.subarray(offset, offset + tpktLen));
        offset += tpktLen;
        continue;
      }

      // 2. CredSSP ASN.1 SEQUENCE (0x30 ...)
      if (b0 === 0x30) {
        const b1 = this.buffer[offset + 1];
        let credsspLen = 0;
        let minHdr = 2;
        if (b1 === 0x82) {
          if (remaining < 4) break;
          credsspLen = this.buffer.readUInt16BE(offset + 2) + 4;
          minHdr = 4;
        } else if (b1 === 0x81) {
          if (remaining < 3) break;
          credsspLen = this.buffer[offset + 2] + 3;
          minHdr = 3;
        } else if (b1 < 0x80) {
          credsspLen = b1 + 2;
        } else {
          offset++;
          continue;
        }
        if (credsspLen < minHdr) {
          offset++;
          continue;
        }
        if (remaining < credsspLen) {
          break;
        }
        frames.push(this.buffer.subarray(offset, offset + credsspLen));
        offset += credsspLen;
        continue;
      }

      // 3. Fast-Path frame ((b0 & 0x03) === 0 && (b0 & 0x30) === 0)
      if ((b0 & 0x03) === 0 && (b0 & 0x30) === 0) {
        const b1 = this.buffer[offset + 1];
        let fpLen = 0;
        let minHdr = 2;
        if ((b1 & 0x80) !== 0) {
          if (remaining < 3) {
            // Incompleto: faltan bytes para leer longitud FastPath
            break;
          }
          fpLen = ((b1 & 0x7f) << 8) | this.buffer[offset + 2];
          minHdr = 3;
        } else {
          fpLen = b1;
        }
        if (fpLen < minHdr) {
          offset++;
          continue;
        }
        if (remaining < fpLen) {
          // Incompleto: esperar al siguiente chunk TCP
          break;
        }
        frames.push(this.buffer.subarray(offset, offset + fpLen));
        offset += fpLen;
        continue;
      }

      // Byte no reconocido: avanzar para no bloquear
      offset++;
    }

    if (offset > 0) {
      this.buffer = this.buffer.subarray(offset);
    }

    return frames;
  }

  reset() {
    this.buffer = Buffer.alloc(0);
  }
}

function splitRdpFrames(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) {
    return [buf];
  }

  const frames = [];
  let offset = 0;

  while (offset < buf.length) {
    const remaining = buf.length - offset;
    const b0 = buf[offset];

    // 1. TPKT frame (0x03 0x00 len_hi len_lo)
    if (b0 === 0x03 && remaining >= 4 && buf[offset + 1] === 0x00) {
      const tpktLen = buf.readUInt16BE(offset + 2);
      if (tpktLen >= 4 && tpktLen <= remaining) {
        frames.push(buf.subarray(offset, offset + tpktLen));
        offset += tpktLen;
        continue;
      }
    }

    // 2. Fast-Path frame ((b0 & 0x03) === 0 && (b0 & 0x30) === 0)
    if ((b0 & 0x03) === 0 && (b0 & 0x30) === 0 && remaining >= 2) {
      const b1 = buf[offset + 1];
      let fpLen = 0;
      if ((b1 & 0x80) !== 0) {
        if (remaining >= 3) {
          fpLen = ((b1 & 0x7f) << 8) | buf[offset + 2];
        }
      } else {
        fpLen = b1;
      }
      if (fpLen >= 2 && fpLen <= remaining) {
        frames.push(buf.subarray(offset, offset + fpLen));
        offset += fpLen;
        continue;
      }
    }

    // Si no coincide con TPKT ni FastPath, o es el fragmento final (ej. CredSSP 0x30)
    frames.push(buf.subarray(offset));
    break;
  }

  return frames.length > 0 ? frames : [buf];
}

class RdpFrameSplitter {
  constructor() {
    this.remainingBytes = 0;
    this.headerBuf = Buffer.alloc(0);
  }

  reset() {
    this.remainingBytes = 0;
    this.headerBuf = Buffer.alloc(0);
  }

  push(chunk) {
    if (!Buffer.isBuffer(chunk) || chunk.length === 0) return [];

    let buf = chunk;
    if (this.headerBuf.length > 0) {
      buf = Buffer.concat([this.headerBuf, chunk]);
      this.headerBuf = Buffer.alloc(0);
    }

    const frames = [];
    let offset = 0;

    // 1. Si estamos en medio de un frame fragmentado de un chunk anterior:
    // Consumir los bytes de continuación sin inspeccionarlos como cabeceras falsas.
    if (this.remainingBytes > 0) {
      const take = Math.min(buf.length, this.remainingBytes);
      frames.push(buf.subarray(0, take));
      this.remainingBytes -= take;
      offset = take;
    }

    // 2. Parsear nuevos frames que empiezan en este chunk:
    while (offset < buf.length) {
      const remaining = buf.length - offset;
      const b0 = buf[offset];

      // A. TPKT frame (0x03 0x00 ...)
      if (b0 === 0x03) {
        if (remaining < 4) {
          this.headerBuf = buf.subarray(offset);
          break;
        }
        if (buf[offset + 1] === 0x00) {
          const tpktLen = buf.readUInt16BE(offset + 2);
          if (tpktLen >= 4) {
            if (remaining >= tpktLen) {
              frames.push(buf.subarray(offset, offset + tpktLen));
              offset += tpktLen;
              continue;
            } else {
              frames.push(buf.subarray(offset));
              this.remainingBytes = tpktLen - remaining;
              break;
            }
          }
        }
      }

      // B. Fast-Path frame ((b0 & 0x03) === 0 && (b0 & 0x30) === 0)
      if ((b0 & 0x03) === 0 && (b0 & 0x30) === 0) {
        if (remaining < 2) {
          this.headerBuf = buf.subarray(offset);
          break;
        }
        const b1 = buf[offset + 1];
        let fpLen = 0;
        let hdrLen = 2;
        if (b1 & 0x80) {
          if (remaining < 3) {
            this.headerBuf = buf.subarray(offset);
            break;
          }
          fpLen = ((b1 & 0x7f) << 8) | buf[offset + 2];
          hdrLen = 3;
        } else {
          fpLen = b1;
        }

        if (fpLen >= hdrLen) {
          if (remaining >= fpLen) {
            frames.push(buf.subarray(offset, offset + fpLen));
            offset += fpLen;
            continue;
          } else {
            frames.push(buf.subarray(offset));
            this.remainingBytes = fpLen - remaining;
            break;
          }
        }
      }

      // C. CredSSP (0x30 ...)
      if (b0 === 0x30) {
        if (remaining < 2) {
          this.headerBuf = buf.subarray(offset);
          break;
        }
        const b1 = buf[offset + 1];
        let credsspLen = 0;
        let hdrLen = 2;
        if (b1 === 0x82) {
          if (remaining < 4) {
            this.headerBuf = buf.subarray(offset);
            break;
          }
          credsspLen = buf.readUInt16BE(offset + 2) + 4;
          hdrLen = 4;
        } else if (b1 === 0x81) {
          if (remaining < 3) {
            this.headerBuf = buf.subarray(offset);
            break;
          }
          credsspLen = buf[offset + 2] + 3;
          hdrLen = 3;
        } else if (b1 < 0x80) {
          credsspLen = b1 + 2;
        }

        if (credsspLen >= hdrLen) {
          if (remaining >= credsspLen) {
            frames.push(buf.subarray(offset, offset + credsspLen));
            offset += credsspLen;
            continue;
          } else {
            frames.push(buf.subarray(offset));
            this.remainingBytes = credsspLen - remaining;
            break;
          }
        }
      }

      // Byte o payload que no coincide: enviar todo lo restante
      frames.push(buf.subarray(offset));
      break;
    }

    return frames;
  }
}

const splitTpktFrames = splitRdpFrames;

module.exports = {
  PROTOCOL_SSL,
  PROTOCOL_HYBRID,
  PROTOCOL_HYBRID_EX,
  protocolName,
  resolveCredsspPolicy,
  readSelectedProtocol,
  parseX224ConnectionConfirm,
  describeRdpPdu,
  describeDisconnectPdu,
  preferDisconnectDesc,
  splitRdpFrames,
  splitTpktFrames,
  RdpStreamDeframer,
  RdpFrameSplitter
};



