'use strict';

/**
 * Implementación de ML-KEM-768 (NIST FIPS 203 / CRYSTALS-Kyber)
 * Utiliza las primitivas nativas en C++ de Node.js (OpenSSL 3.0+):
 * sha3-256, sha3-512, shake128 y shake256.
 *
 * Basado en la especificación NIST FIPS 203 y la estructura de referencia
 * de @noble/post-quantum (MIT License, Paul Miller).
 */

const crypto = require('crypto');

const N = 256;
const Q = 3329;
const F = 3303; // 3303 ≡ 128^(-1) mod 3329
const ROOT_OF_UNITY = 17;
const K = 3; // ML-KEM-768
const ETA1 = 2;
const ETA2 = 2;
const DU = 10;
const DV = 4;

const PUBLIC_KEY_BYTES = 1184; // 384 * K + 32
const SECRET_KEY_BYTES = 2400; // 768 * K + 96
const CIPHERTEXT_BYTES = 1088; // 32 * (DU * K + DV)
const SHARED_SECRET_BYTES = 32;

function mod(a, modulo = Q) {
  const result = (a % modulo) | 0;
  return (result >= 0 ? result | 0 : (modulo + result) | 0) | 0;
}

function bitReversal(n, bits = 7) {
  let rev = 0;
  for (let i = 0; i < bits; i++) {
    rev = (rev << 1) | ((n >>> i) & 1);
  }
  return rev;
}

const nttZetas = (() => {
  const out = new Uint16Array(N);
  for (let i = 0; i < N; i++) {
    const b = bitReversal(i, 7);
    const p = BigInt(ROOT_OF_UNITY) ** BigInt(b) % BigInt(Q);
    out[i] = Number(p) | 0;
  }
  return out;
})();

const NTT = {
  encode(r) {
    for (let k = 1, len = 128; len > 1; len >>= 1) {
      for (let start = 0; start < N; start += 2 * len) {
        const zeta = nttZetas[k++];
        for (let j = start; j < start + len; j++) {
          const t = mod(zeta * r[j + len]);
          r[j + len] = mod(r[j] - t) | 0;
          r[j] = mod(r[j] + t) | 0;
        }
      }
    }
    return r;
  },
  decode(r) {
    for (let k = 127, len = 2; len < 129; len <<= 1) {
      for (let start = 0; start < N; start += 2 * len) {
        const zeta = nttZetas[k--];
        for (let j = start; j < start + len; j++) {
          const t = r[j];
          r[j] = mod(t + r[j + len]);
          r[j + len] = mod(zeta * (r[j + len] - t));
        }
      }
    }
    for (let i = 0; i < r.length; i++) {
      r[i] = mod(F * r[i]);
    }
    return r;
  }
};

function getMask(bits) {
  return (1 << bits) - 1;
}

function bitsCoder(d, c) {
  const mask = getMask(d);
  const bytesLen = d * (N / 8);
  return {
    bytesLen,
    encode(poly) {
      const r = new Uint8Array(bytesLen);
      for (let i = 0, buf = 0, bufLen = 0, pos = 0; i < poly.length; i++) {
        buf |= (c.encode(poly[i]) & mask) << bufLen;
        bufLen += d;
        for (; bufLen >= 8; bufLen -= 8, buf >>= 8) {
          r[pos++] = buf & getMask(bufLen);
        }
      }
      return r;
    },
    decode(bytes) {
      const r = new Uint16Array(N);
      for (let i = 0, buf = 0, bufLen = 0, pos = 0; i < bytes.length; i++) {
        buf |= bytes[i] << bufLen;
        bufLen += 8;
        for (; bufLen >= d; bufLen -= d, buf >>= d) {
          r[pos++] = c.decode(buf & mask);
        }
      }
      return r;
    }
  };
}

function compress(d) {
  if (d >= 12) {
    return { encode: (i) => i, decode: (i) => i };
  }
  const a = 2 ** (d - 1);
  return {
    encode: (i) => Math.floor(((i << d) + Q / 2) / Q),
    decode: (i) => (i * Q + a) >>> d
  };
}

function polyCoder(d) {
  return bitsCoder(d, compress(d));
}

function splitCoder(...lengths) {
  const getLength = (c) => (typeof c === 'number' ? c : c.bytesLen);
  const bytesLen = lengths.reduce((sum, a) => sum + getLength(a), 0);
  return {
    bytesLen,
    encode(bufs) {
      const res = new Uint8Array(bytesLen);
      for (let i = 0, pos = 0; i < lengths.length; i++) {
        const c = lengths[i];
        const l = getLength(c);
        const b = typeof c === 'number' ? bufs[i] : c.encode(bufs[i]);
        res.set(b, pos);
        if (typeof c !== 'number') b.fill(0);
        pos += l;
      }
      return res;
    },
    decode(buf) {
      const res = [];
      let cur = buf;
      for (const c of lengths) {
        const l = getLength(c);
        const b = cur.subarray(0, l);
        res.push(typeof c === 'number' ? b : c.decode(b));
        cur = cur.subarray(l);
      }
      return res;
    }
  };
}

function vecCoder(c, vecLen) {
  const bytesLen = vecLen * c.bytesLen;
  return {
    bytesLen,
    encode(u) {
      const res = new Uint8Array(bytesLen);
      for (let i = 0, pos = 0; i < u.length; i++) {
        const b = c.encode(u[i]);
        res.set(b, pos);
        b.fill(0);
        pos += b.length;
      }
      return res;
    },
    decode(a) {
      const r = [];
      for (let i = 0; i < a.length; i += c.bytesLen) {
        r.push(c.decode(a.subarray(i, i + c.bytesLen)));
      }
      return r;
    }
  };
}

function cleanBytes(...list) {
  for (const t of list) {
    if (!t) continue;
    if (Array.isArray(t)) {
      for (const b of t) b.fill(0);
    } else if (typeof t.fill === 'function') {
      t.fill(0);
    }
  }
}

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

// --- Keccak-f[1600] / SHA-3 / SHAKE (compatible con Node OpenSSL y Electron BoringSSL) ---
const KECCAK_ROTC = new Uint8Array([
  1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14, 27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44
]);
const KECCAK_PILN = new Uint8Array([
  10, 7, 11, 17, 18, 3, 5, 16, 8, 21, 24, 4, 15, 23, 19, 13, 12, 2, 20, 14, 22, 9, 6, 1
]);
const KECCAK_RC = (() => {
  const rc = new Uint32Array(48);
  let r = 1;
  for (let round = 0; round < 24; round++) {
    let lo = 0;
    let hi = 0;
    for (let j = 0; j < 7; j++) {
      if (r & 1) {
        const bit = (1 << j) - 1;
        if (bit < 32) lo ^= (1 << bit) >>> 0;
        else hi ^= (1 << (bit - 32)) >>> 0;
      }
      r = ((r << 1) ^ ((r >> 7) * 0x71)) & 0xff;
    }
    rc[2 * round] = lo >>> 0;
    rc[2 * round + 1] = hi >>> 0;
  }
  return rc;
})();

function keccakP1600(s) {
  const B = new Uint32Array(50);
  const C = new Uint32Array(10);
  for (let round = 0; round < 24; round++) {
    for (let x = 0; x < 10; x++) {
      C[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    }
    for (let x = 0; x < 10; x += 2) {
      const x1 = (x + 8) % 10;
      const x2 = (x + 2) % 10;
      const c2l = C[x2];
      const c2h = C[x2 + 1];
      const dl = C[x1] ^ ((c2l << 1) | (c2h >>> 31));
      const dh = C[x1 + 1] ^ ((c2h << 1) | (c2l >>> 31));
      for (let y = 0; y < 50; y += 10) {
        s[x + y] ^= dl;
        s[x + y + 1] ^= dh;
      }
    }
    let tl = s[2];
    let th = s[3];
    for (let i = 0; i < 24; i++) {
      const j = KECCAK_PILN[i] * 2;
      const rot = KECCAK_ROTC[i];
      const nl = s[j];
      const nh = s[j + 1];
      if (rot < 32) {
        s[j] = (tl << rot) | (th >>> (32 - rot));
        s[j + 1] = (th << rot) | (tl >>> (32 - rot));
      } else {
        const r2 = rot - 32;
        s[j] = (th << r2) | (tl >>> (32 - r2));
        s[j + 1] = (tl << r2) | (th >>> (32 - r2));
      }
      tl = nl;
      th = nh;
    }
    for (let y = 0; y < 50; y += 10) {
      for (let x = 0; x < 10; x++) B[x] = s[y + x];
      for (let x = 0; x < 10; x += 2) {
        s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
        s[y + x + 1] ^= ~B[(x + 3) % 10] & B[(x + 5) % 10];
      }
    }
    s[0] ^= KECCAK_RC[2 * round];
    s[1] ^= KECCAK_RC[2 * round + 1];
  }
}

function keccakAbsorb(rateBytes, suffix, chunks) {
  const stateBuf = new ArrayBuffer(200);
  const stateU8 = new Uint8Array(stateBuf);
  const stateU32 = new Uint32Array(stateBuf);
  let pos = 0;
  for (const chunk of chunks) {
    const u8 = chunk instanceof Uint8Array
      ? chunk
      : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    for (let i = 0; i < u8.length; i++) {
      stateU8[pos++] ^= u8[i];
      if (pos === rateBytes) {
        keccakP1600(stateU32);
        pos = 0;
      }
    }
  }
  stateU8[pos] ^= suffix;
  stateU8[rateBytes - 1] ^= 0x80;
  keccakP1600(stateU32);
  return { stateU8, stateU32 };
}

function keccakSqueeze(rateBytes, suffix, outLen, chunks) {
  const { stateU8, stateU32 } = keccakAbsorb(rateBytes, suffix, chunks);
  const out = new Uint8Array(outLen);
  let outPos = 0;
  while (outPos < outLen) {
    const take = Math.min(rateBytes, outLen - outPos);
    out.set(stateU8.subarray(0, take), outPos);
    outPos += take;
    if (outPos < outLen) {
      keccakP1600(stateU32);
    }
  }
  return out;
}

function sha3_256(data) {
  return keccakSqueeze(136, 0x06, 32, [data]);
}

function sha3_512(...chunks) {
  return keccakSqueeze(72, 0x06, 64, chunks);
}

function shake256(dkLen, ...chunks) {
  return keccakSqueeze(136, 0x1f, dkLen, chunks);
}

function shakePRF(dkLen, key, nonce) {
  return shake256(dkLen, key, new Uint8Array([nonce]));
}

function createXof128(seed) {
  const seedBuf = new Uint8Array(seed.length + 2);
  seedBuf.set(seed);
  const blockLen = 168; // SHAKE-128 rate in bytes
  return {
    get(x, y) {
      seedBuf[seed.length] = x;
      seedBuf[seed.length + 1] = y;
      let firstBlock = true;
      const { stateU8, stateU32 } = keccakAbsorb(blockLen, 0x1f, [seedBuf]);
      return () => {
        if (!firstBlock) {
          keccakP1600(stateU32);
        }
        firstBlock = false;
        return new Uint8Array(stateU8.subarray(0, blockLen));
      };
    },
    clean() {
      seedBuf.fill(0);
    }
  };
}

function polyAdd(a, b) {
  for (let i = 0; i < N; i++) a[i] = mod(a[i] + b[i]);
}

function polySub(a, b) {
  for (let i = 0; i < N; i++) a[i] = mod(a[i] - b[i]);
}

function baseCaseMultiply(a0, a1, b0, b1, zeta) {
  const c0 = mod(a1 * b1 * zeta + a0 * b0);
  const c1 = mod(a0 * b1 + a1 * b0);
  return { c0, c1 };
}

function multiplyNTTs(f, g) {
  for (let i = 0; i < N / 2; i++) {
    let z = nttZetas[64 + (i >> 1)];
    if (i & 1) z = -z;
    const { c0, c1 } = baseCaseMultiply(
      f[2 * i + 0],
      f[2 * i + 1],
      g[2 * i + 0],
      g[2 * i + 1],
      z
    );
    f[2 * i + 0] = c0;
    f[2 * i + 1] = c1;
  }
  return f;
}

function sampleNTT(xof) {
  const r = new Uint16Array(N);
  for (let j = 0; j < N; ) {
    const b = xof();
    for (let i = 0; j < N && i + 3 <= b.length; i += 3) {
      const d1 = ((b[i + 0] >> 0) | (b[i + 1] << 8)) & 0xfff;
      const d2 = ((b[i + 1] >> 4) | (b[i + 2] << 4)) & 0xfff;
      if (d1 < Q) r[j++] = d1;
      if (j < N && d2 < Q) r[j++] = d2;
    }
  }
  return r;
}

function sampleCBD(seed, nonce, eta) {
  const buf = shakePRF((eta * N) / 4, seed, nonce);
  const r = new Uint16Array(N);
  const b32 = new Uint32Array(buf.buffer, buf.byteOffset, buf.byteLength >>> 2);
  let len = 0;
  for (let i = 0, p = 0, bb = 0, t0 = 0; i < b32.length; i++) {
    let b = b32[i];
    for (let j = 0; j < 32; j++) {
      bb += b & 1;
      b >>>= 1;
      len += 1;
      if (len === eta) {
        t0 = bb;
        bb = 0;
      } else if (len === 2 * eta) {
        r[p++] = mod(t0 - bb);
        bb = 0;
        len = 0;
      }
    }
  }
  return r;
}

const poly1 = polyCoder(1);
const polyV = polyCoder(DV);
const polyU = polyCoder(DU);
const kPkeSecretCoder = vecCoder(polyCoder(12), K);
const publicCoder = splitCoder(kPkeSecretCoder, 32);
const cipherCoder = splitCoder(vecCoder(polyU, K), polyV);
const seedCoder = splitCoder(32, 32);
const fullSecretCoder = splitCoder(
  kPkeSecretCoder.bytesLen,
  publicCoder.bytesLen,
  32,
  32
);

function kPkeKeygen(seed) {
  const seedDst = new Uint8Array(33);
  seedDst.set(seed);
  seedDst[32] = K;
  const seedHash = sha3_512(seedDst);
  const [rho, sigma] = seedCoder.decode(seedHash);
  const sHat = [];
  const tHat = [];
  for (let i = 0; i < K; i++) {
    sHat.push(NTT.encode(sampleCBD(sigma, i, ETA1)));
  }
  const x = createXof128(rho);
  for (let i = 0; i < K; i++) {
    const e = NTT.encode(sampleCBD(sigma, K + i, ETA1));
    for (let j = 0; j < K; j++) {
      const aji = sampleNTT(x.get(j, i));
      polyAdd(e, multiplyNTTs(aji, sHat[j]));
    }
    tHat.push(e);
  }
  x.clean();
  const res = {
    publicKey: publicCoder.encode([tHat, rho]),
    secretKey: kPkeSecretCoder.encode(sHat)
  };
  cleanBytes(rho, sigma, sHat, tHat, seedDst, seedHash);
  return res;
}

function kPkeEncrypt(publicKey, msg, seed) {
  const [tHat, rho] = publicCoder.decode(publicKey);
  const rHat = [];
  for (let i = 0; i < K; i++) {
    rHat.push(NTT.encode(sampleCBD(seed, i, ETA1)));
  }
  const x = createXof128(rho);
  const tmp2 = new Uint16Array(N);
  const u = [];
  for (let i = 0; i < K; i++) {
    const e1 = sampleCBD(seed, K + i, ETA2);
    const tmp = new Uint16Array(N);
    for (let j = 0; j < K; j++) {
      const aij = sampleNTT(x.get(i, j));
      polyAdd(tmp, multiplyNTTs(aij, rHat[j]));
    }
    polyAdd(e1, NTT.decode(tmp));
    u.push(e1);
    polyAdd(tmp2, multiplyNTTs(tHat[i], rHat[i]));
    tmp.fill(0);
  }
  x.clean();
  const e2 = sampleCBD(seed, 2 * K, ETA2);
  polyAdd(e2, NTT.decode(tmp2));
  const v = poly1.decode(msg);
  polyAdd(v, e2);
  cleanBytes(tHat, rHat, tmp2, e2);
  return cipherCoder.encode([u, v]);
}

function kPkeDecrypt(cipherText, privateKey) {
  const [u, v] = cipherCoder.decode(cipherText);
  const sk = kPkeSecretCoder.decode(privateKey);
  const tmp = new Uint16Array(N);
  for (let i = 0; i < K; i++) {
    polyAdd(tmp, multiplyNTTs(sk[i], NTT.encode(u[i])));
  }
  polySub(v, NTT.decode(tmp));
  cleanBytes(tmp, sk, u);
  return poly1.encode(v);
}

/**
 * Genera un par de claves ML-KEM-768
 * @param {Uint8Array} [seed] Semilla opcional de 64 bytes (d || z)
 * @returns {{ publicKey: Uint8Array, secretKey: Uint8Array }}
 */
function keygen(seed = new Uint8Array(crypto.randomBytes(64))) {
  if (!seed || seed.length !== 64) {
    throw new Error('ML-KEM-768 keygen requires a 64-byte seed');
  }
  const { publicKey, secretKey: sk } = kPkeKeygen(seed.subarray(0, 32));
  const publicKeyHash = sha3_256(publicKey);
  const secretKey = fullSecretCoder.encode([
    sk,
    publicKey,
    publicKeyHash,
    seed.subarray(32, 64)
  ]);
  cleanBytes(sk, publicKeyHash);
  return { publicKey, secretKey };
}

/**
 * Encapsula un secreto compartido usando una clave pública ML-KEM-768
 * @param {Uint8Array} publicKey Clave pública de 1184 bytes
 * @param {Uint8Array} [msg] Entropía opcional de 32 bytes
 * @returns {{ cipherText: Uint8Array, sharedSecret: Uint8Array }}
 */
function encapsulate(publicKey, msg = new Uint8Array(crypto.randomBytes(32))) {
  if (!publicKey || publicKey.length !== PUBLIC_KEY_BYTES) {
    throw new Error(`ML-KEM-768 encapsulate requires a ${PUBLIC_KEY_BYTES}-byte publicKey`);
  }
  if (!msg || msg.length !== 32) {
    throw new Error('ML-KEM-768 encapsulate requires a 32-byte message seed');
  }
  const eke = publicKey.subarray(0, 384 * K);
  const ek = kPkeSecretCoder.encode(kPkeSecretCoder.decode(eke.slice()));
  if (!equalBytes(ek, eke)) {
    cleanBytes(ek);
    throw new Error('ML-KEM-768 encapsulate: invalid publicKey modulus');
  }
  cleanBytes(ek);
  const kr = sha3_512(msg, sha3_256(publicKey));
  const cipherText = kPkeEncrypt(publicKey, msg, kr.subarray(32, 64));
  const sharedSecret = new Uint8Array(kr.subarray(0, 32));
  kr.fill(0);
  return { cipherText, sharedSecret };
}

/**
 * Desencapsula un ciphertext ML-KEM-768 usando la clave secreta
 * @param {Uint8Array} cipherText Ciphertext de 1088 bytes
 * @param {Uint8Array} secretKey Clave secreta de 2400 bytes
 * @returns {Uint8Array} Secreto compartido de 32 bytes
 */
function decapsulate(cipherText, secretKey) {
  if (!secretKey || secretKey.length !== SECRET_KEY_BYTES) {
    throw new Error(`ML-KEM-768 decapsulate requires a ${SECRET_KEY_BYTES}-byte secretKey`);
  }
  if (!cipherText || cipherText.length !== CIPHERTEXT_BYTES) {
    throw new Error(`ML-KEM-768 decapsulate requires a ${CIPHERTEXT_BYTES}-byte cipherText`);
  }
  const [sk, publicKey, publicKeyHash, z] = fullSecretCoder.decode(secretKey);
  const msg = kPkeDecrypt(cipherText, sk);
  const kr = sha3_512(msg, publicKeyHash);
  const Khat = kr.subarray(0, 32);
  const cipherText2 = kPkeEncrypt(publicKey, msg, kr.subarray(32, 64));
  const isValid = equalBytes(cipherText, cipherText2);
  const Kbar = shake256(32, z, cipherText);
  const result = new Uint8Array(isValid ? Khat : Kbar);
  cleanBytes(msg, cipherText2, kr, Kbar);
  return result;
}

module.exports = {
  PUBLIC_KEY_BYTES,
  SECRET_KEY_BYTES,
  CIPHERTEXT_BYTES,
  SHARED_SECRET_BYTES,
  keygen,
  encapsulate,
  decapsulate
};
