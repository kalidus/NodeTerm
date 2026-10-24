/**
 * Encoding de campos binarios del vault AES-GCM (salt/iv/data).
 * v2: base64 strings. Legacy: number[] (Array.from).
 *
 * Sin Buffer/require: este módulo se embebe en el bundle del renderer (webpack).
 */

function bytesToBase64(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + chunk, u8.length)));
  }
  return btoa(s);
}

/**
 * @param {string|number[]|Uint8Array|ArrayBuffer} field
 * @returns {Uint8Array}
 */
function fieldToBytes(field) {
  if (typeof field === 'string') {
    const bin = atob(field);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      out[i] = bin.charCodeAt(i);
    }
    return out;
  }
  if (Array.isArray(field) || ArrayBuffer.isView(field)) {
    return new Uint8Array(field);
  }
  throw new Error('Invalid vault byte field encoding');
}

/**
 * Empaqueta un objeto cifrado en formato v2 (base64).
 * @param {{ salt: Uint8Array|number[]|string, iv: Uint8Array|number[]|string, data: Uint8Array|number[]|string, timestamp?: number }} parts
 */
function toEncryptedV2(parts) {
  return {
    v: 2,
    salt: typeof parts.salt === 'string' ? parts.salt : bytesToBase64(parts.salt),
    iv: typeof parts.iv === 'string' ? parts.iv : bytesToBase64(parts.iv),
    data: typeof parts.data === 'string' ? parts.data : bytesToBase64(parts.data),
    timestamp: parts.timestamp != null ? parts.timestamp : Date.now()
  };
}

/**
 * Normaliza salt/iv/data de un blob legacy o v2 a Uint8Array.
 */
function decodeEncryptedFields(encryptedObj) {
  if (!encryptedObj || typeof encryptedObj !== 'object') {
    throw new Error('Invalid encrypted object');
  }
  return {
    salt: fieldToBytes(encryptedObj.salt),
    iv: fieldToBytes(encryptedObj.iv),
    data: fieldToBytes(encryptedObj.data)
  };
}

function bytesEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Mismo ciphertext AES aunque el JSON sea legacy number[] o v2 con otro timestamp.
 */
function vaultPayloadsEquivalent(a, b) {
  try {
    const left = typeof a === 'string' ? JSON.parse(a) : a;
    const right = typeof b === 'string' ? JSON.parse(b) : b;
    const A = decodeEncryptedFields(left);
    const B = decodeEncryptedFields(right);
    return bytesEqual(A.salt, B.salt) && bytesEqual(A.iv, B.iv) && bytesEqual(A.data, B.data);
  } catch (_) {
    return false;
  }
}

/**
 * Caché de sesión para CryptoKey derivadas (PBKDF2). La clave incluye el password en memoria.
 */
function createDerivedKeyCache() {
  const map = new Map();
  return {
    async getOrDerive(password, saltBytes, iterations, deriveFn) {
      const cacheKey = `${iterations}:${bytesToBase64(saltBytes)}:${password}`;
      if (map.has(cacheKey)) {
        return map.get(cacheKey);
      }
      const value = await deriveFn();
      map.set(cacheKey, value);
      return value;
    },
    size() {
      return map.size;
    }
  };
}

module.exports = {
  bytesToBase64,
  fieldToBytes,
  toEncryptedV2,
  decodeEncryptedFields,
  bytesEqual,
  vaultPayloadsEquivalent,
  createDerivedKeyCache
};
