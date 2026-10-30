'use strict';

/**
 * Implementación de Streamlined NTRU Prime 761 (sntrup761)
 * Compatible bit a bit con sntrup761.c de OpenSSH (sntrup761x25519-sha512@openssh.com).
 *
 * Algoritmo de dominio público por Daniel J. Bernstein, Chitchanok Chuengsatiansup,
 * Tanja Lange y Christine van Vredendaal.
 */

const crypto = require('crypto');

const P = 761;
const Q = 4591;
const W = 286;
const Q12 = (Q - 1) / 2; // 2295
const HASH_BYTES = 32;
const SMALL_BYTES = Math.floor((P + 3) / 4); // 191
const SECRETKEYS_BYTES = 2 * SMALL_BYTES; // 382
const CONFIRM_BYTES = 32;

const PUBLIC_KEY_BYTES = 1158;
const SECRET_KEY_BYTES = 1763;
const CIPHERTEXT_BYTES = 1039;
const SHARED_SECRET_BYTES = 32;

function toInt16(x) {
  return (x << 16) >> 16;
}

function toInt8(x) {
  return (x << 24) >> 24;
}

function int16NegativeMask(x) {
  return toInt16(x) >> 15;
}

function int16NonzeroMask(x) {
  const v = toInt16(x);
  return (v | -v) >> 31;
}

function F3_freeze(x) {
  const v = toInt16(x);
  return toInt8(v - 3 * ((10923 * v + 16384) >> 15));
}

const Q16 = Math.floor((0x10000 + Math.floor(Q / 2)) / Q);
const Q20 = Math.floor((0x100000 + Math.floor(Q / 2)) / Q);
const Q28 = Math.floor((0x10000000 + Math.floor(Q / 2)) / Q);

function Fq_freeze(x) {
  let v = x | 0;
  v = (v - Q * (Math.imul(Q16, v) >> 16)) | 0;
  v = (v - Q * (Math.imul(Q20, v) >> 20)) | 0;
  return toInt16(v - Q * ((Math.imul(Q28, v) + 0x8000000) >> 28));
}

function Weightw_mask(r) {
  let weight = 0;
  for (let i = 0; i < P; ++i) {
    weight += r[i] & 1;
  }
  return int16NonzeroMask(weight - W);
}

function uint32_divmod_uint14(x, m) {
  const u = x >>> 0;
  const qVal = Math.floor(u / m) >>> 0;
  const rVal = (u - qVal * m) & 0xffff;
  return { Q: qVal, r: rVal };
}

function uint32_mod_uint14(x, m) {
  return uint32_divmod_uint14(x, m).r;
}

function Encode(out, outOffset, R, M, len) {
  if (len === 1) {
    let r = R[0];
    let m = M[0];
    while (m > 1) {
      out[outOffset++] = r & 0xff;
      r >>>= 8;
      m = (m + 255) >>> 8;
    }
    return outOffset;
  }
  if (len > 1) {
    const half = Math.floor((len + 1) / 2);
    const R2 = new Uint16Array(half);
    const M2 = new Uint16Array(half);
    let i;
    for (i = 0; i < len - 1; i += 2) {
      const m0 = M[i];
      let r = (R[i] + R[i + 1] * m0) >>> 0;
      let m = (M[i + 1] * m0) >>> 0;
      while (m >= 16384) {
        out[outOffset++] = r & 0xff;
        r >>>= 8;
        m = (m + 255) >>> 8;
      }
      R2[i >> 1] = r & 0xffff;
      M2[i >> 1] = m & 0xffff;
    }
    if (i < len) {
      R2[i >> 1] = R[i];
      M2[i >> 1] = M[i];
    }
    return Encode(out, outOffset, R2, M2, half);
  }
  return outOffset;
}

function Decode(out, outOffset, S, sOffset, M, len) {
  if (len === 1) {
    if (M[0] === 1) {
      out[outOffset] = 0;
    } else if (M[0] <= 256) {
      out[outOffset] = uint32_mod_uint14(S[sOffset], M[0]);
    } else {
      out[outOffset] = uint32_mod_uint14(S[sOffset] + ((S[sOffset + 1] & 0xffff) << 8), M[0]);
    }
    return;
  }
  if (len > 1) {
    const half = Math.floor((len + 1) / 2);
    const halfFloor = Math.floor(len / 2);
    const R2 = new Uint16Array(half);
    const M2 = new Uint16Array(half);
    const bottomr = new Uint16Array(halfFloor);
    const bottomt = new Uint32Array(halfFloor);
    let i;
    for (i = 0; i < len - 1; i += 2) {
      const m = (M[i] * M[i + 1]) >>> 0;
      if (m > 256 * 16383) {
        bottomt[i >> 1] = 256 * 256;
        bottomr[i >> 1] = S[sOffset] + 256 * S[sOffset + 1];
        sOffset += 2;
        M2[i >> 1] = ((((m + 255) >>> 8) + 255) >>> 8) & 0xffff;
      } else if (m >= 16384) {
        bottomt[i >> 1] = 256;
        bottomr[i >> 1] = S[sOffset];
        sOffset += 1;
        M2[i >> 1] = ((m + 255) >>> 8) & 0xffff;
      } else {
        bottomt[i >> 1] = 1;
        bottomr[i >> 1] = 0;
        M2[i >> 1] = m & 0xffff;
      }
    }
    if (i < len) {
      M2[i >> 1] = M[i];
    }
    Decode(R2, 0, S, sOffset, M2, half);
    for (i = 0; i < len - 1; i += 2) {
      let r = (bottomr[i >> 1] + bottomt[i >> 1] * R2[i >> 1]) >>> 0;
      const { Q: r1Tmp, r: r0 } = uint32_divmod_uint14(r, M[i]);
      const r1 = uint32_mod_uint14(r1Tmp, M[i + 1]);
      out[outOffset++] = r0;
      out[outOffset++] = r1;
    }
    if (i < len) {
      out[outOffset++] = R2[i >> 1];
    }
  }
}

function R3_fromRq(out, r) {
  for (let i = 0; i < P; ++i) {
    out[i] = F3_freeze(r[i]);
  }
}

function R3_mult(h, f, g) {
  const fg = new Int16Array(P + P - 1);
  for (let i = 0; i < P; ++i) {
    const fi = f[i];
    for (let j = 0; j < P; ++j) {
      fg[i + j] = toInt16(fg[i + j] + fi * g[j]);
    }
  }
  for (let i = P; i < P + P - 1; ++i) {
    fg[i - P] = toInt16(fg[i - P] + fg[i]);
  }
  for (let i = P; i < P + P - 1; ++i) {
    fg[i - P + 1] = toInt16(fg[i - P + 1] + fg[i]);
  }
  for (let i = 0; i < P; ++i) {
    h[i] = F3_freeze(fg[i]);
  }
}

function R3_recip(out, input) {
  const f = new Int8Array(P + 1);
  const g = new Int8Array(P + 1);
  const v = new Int8Array(P + 1);
  const r = new Int8Array(P + 1);
  r[0] = 1;
  f[0] = 1;
  f[P - 1] = -1;
  f[P] = -1;
  for (let i = 0; i < P; ++i) {
    g[P - 1 - i] = input[i];
  }
  g[P] = 0;
  let delta = 1;
  for (let loop = 0; loop < 2 * P - 1; ++loop) {
    for (let i = P; i > 0; --i) {
      v[i] = v[i - 1];
    }
    v[0] = 0;
    const sign = (-g[0] * f[0]) | 0;
    const swap = int16NegativeMask(-delta) & int16NonzeroMask(g[0]);
    delta ^= swap & (delta ^ -delta);
    delta += 1;
    for (let i = 0; i < P + 1; ++i) {
      let t = swap & (f[i] ^ g[i]);
      f[i] ^= t;
      g[i] ^= t;
      t = swap & (v[i] ^ r[i]);
      v[i] ^= t;
      r[i] ^= t;
    }
    for (let i = 0; i < P + 1; ++i) {
      g[i] = F3_freeze(g[i] + sign * f[i]);
    }
    for (let i = 0; i < P + 1; ++i) {
      r[i] = F3_freeze(r[i] + sign * v[i]);
    }
    for (let i = 0; i < P; ++i) {
      g[i] = g[i + 1];
    }
    g[P] = 0;
  }
  const sign = f[0];
  for (let i = 0; i < P; ++i) {
    out[i] = toInt8(sign * v[P - 1 - i]);
  }
  return int16NonzeroMask(delta);
}

function Rq_mult_small(h, f, g) {
  const fg = new Int32Array(P + P - 1);
  for (let i = 0; i < P; ++i) {
    const fi = f[i];
    for (let j = 0; j < P; ++j) {
      fg[i + j] = (fg[i + j] + fi * g[j]) | 0;
    }
  }
  for (let i = P; i < P + P - 1; ++i) {
    fg[i - P] = (fg[i - P] + fg[i]) | 0;
  }
  for (let i = P; i < P + P - 1; ++i) {
    fg[i - P + 1] = (fg[i - P + 1] + fg[i]) | 0;
  }
  for (let i = 0; i < P; ++i) {
    h[i] = Fq_freeze(fg[i]);
  }
}

function Rq_mult3(h, f) {
  for (let i = 0; i < P; ++i) {
    h[i] = Fq_freeze(3 * f[i]);
  }
}

function Fq_recip(a1) {
  let i = 1;
  let ai = a1;
  while (i < Q - 2) {
    ai = Fq_freeze(a1 * ai);
    i += 1;
  }
  return ai;
}

const FQ_RECIP_3 = Fq_recip(3);

function Rq_recip3(out, input) {
  const f = new Int16Array(P + 1);
  const g = new Int16Array(P + 1);
  const v = new Int16Array(P + 1);
  const r = new Int16Array(P + 1);
  r[0] = FQ_RECIP_3;
  f[0] = 1;
  f[P - 1] = -1;
  f[P] = -1;
  for (let i = 0; i < P; ++i) {
    g[P - 1 - i] = input[i];
  }
  g[P] = 0;
  let delta = 1;
  for (let loop = 0; loop < 2 * P - 1; ++loop) {
    for (let i = P; i > 0; --i) {
      v[i] = v[i - 1];
    }
    v[0] = 0;
    const swap = int16NegativeMask(-delta) & int16NonzeroMask(g[0]);
    delta ^= swap & (delta ^ -delta);
    delta += 1;
    for (let i = 0; i < P + 1; ++i) {
      let t = swap & (f[i] ^ g[i]);
      f[i] ^= t;
      g[i] ^= t;
      t = swap & (v[i] ^ r[i]);
      v[i] ^= t;
      r[i] ^= t;
    }
    const f0 = f[0];
    const g0 = g[0];
    for (let i = 0; i < P + 1; ++i) {
      g[i] = Fq_freeze(f0 * g[i] - g0 * f[i]);
    }
    for (let i = 0; i < P + 1; ++i) {
      r[i] = Fq_freeze(f0 * r[i] - g0 * v[i]);
    }
    for (let i = 0; i < P; ++i) {
      g[i] = g[i + 1];
    }
    g[P] = 0;
  }
  const scale = Fq_recip(f[0]);
  for (let i = 0; i < P; ++i) {
    out[i] = Fq_freeze(scale * v[P - 1 - i]);
  }
  return int16NonzeroMask(delta);
}

function Round(out, a) {
  for (let i = 0; i < P; ++i) {
    out[i] = toInt16(a[i] - F3_freeze(a[i]));
  }
}

function Short_fromlist(out, input) {
  const L = new Uint32Array(P);
  for (let i = 0; i < W; ++i) {
    L[i] = (input[i] & ~1) >>> 0;
  }
  for (let i = W; i < P; ++i) {
    L[i] = ((input[i] & ~3) | 1) >>> 0;
  }
  L.sort();
  for (let i = 0; i < P; ++i) {
    out[i] = toInt8((L[i] & 3) - 1);
  }
}

function Hash_prefix(out, outOffset, b, input, inlen) {
  const x = Buffer.allocUnsafe(inlen + 1);
  x[0] = b & 0xff;
  Buffer.from(input.buffer, input.byteOffset, inlen).copy(x, 1);
  const h = crypto.createHash('sha512').update(x).digest();
  for (let i = 0; i < 32; ++i) {
    out[outOffset + i] = h[i];
  }
}

function randomUint32Array(len) {
  const bytes = crypto.randomBytes(len * 4);
  const out = new Uint32Array(len);
  for (let i = 0; i < len; ++i) {
    out[i] = bytes.readUInt32LE(i * 4);
  }
  return out;
}

function Short_random(out) {
  const L = randomUint32Array(P);
  Short_fromlist(out, L);
  L.fill(0);
}

function Small_random(out) {
  const L = randomUint32Array(P);
  for (let i = 0; i < P; ++i) {
    out[i] = toInt8((((L[i] & 0x3fffffff) * 3) >>> 30) - 1);
  }
  L.fill(0);
}

function KeyGen(h, f, ginv) {
  const g = new Int8Array(P);
  const finv = new Int16Array(P);
  for (;;) {
    Small_random(g);
    const result = R3_recip(ginv, g);
    if (result === 0) break;
  }
  Short_random(f);
  Rq_recip3(finv, f);
  Rq_mult_small(h, finv, g);
}

function Encrypt(c, r, h) {
  const hr = new Int16Array(P);
  Rq_mult_small(hr, h, r);
  Round(c, hr);
}

function Decrypt(r, c, f, ginv) {
  const cf = new Int16Array(P);
  const cf3 = new Int16Array(P);
  const e = new Int8Array(P);
  const ev = new Int8Array(P);
  Rq_mult_small(cf, c, f);
  Rq_mult3(cf3, cf);
  R3_fromRq(e, cf3);
  R3_mult(ev, e, ginv);
  const mask = Weightw_mask(ev);
  for (let i = 0; i < W; ++i) {
    r[i] = toInt8(((ev[i] ^ 1) & ~mask) ^ 1);
  }
  for (let i = W; i < P; ++i) {
    r[i] = toInt8(ev[i] & ~mask);
  }
}

function Small_encode(s, sOffset, f) {
  let fIdx = 0;
  const limit = Math.floor(P / 4);
  for (let i = 0; i < limit; ++i) {
    let x = 0;
    for (let j = 0; j < 4; ++j) {
      x += (f[fIdx++] + 1) << (2 * j);
    }
    s[sOffset++] = x & 0xff;
  }
  s[sOffset] = (f[fIdx] + 1) & 0xff;
}

function Small_decode(f, s, sOffset) {
  let fIdx = 0;
  const limit = Math.floor(P / 4);
  for (let i = 0; i < limit; ++i) {
    const x = s[sOffset++];
    for (let j = 0; j < 4; ++j) {
      f[fIdx++] = toInt8(((x >>> (2 * j)) & 3) - 1);
    }
  }
  f[fIdx] = toInt8((s[sOffset] & 3) - 1);
}

function Rq_encode(s, r) {
  const R = new Uint16Array(P);
  const M = new Uint16Array(P);
  for (let i = 0; i < P; ++i) {
    R[i] = r[i] + Q12;
    M[i] = Q;
  }
  Encode(s, 0, R, M, P);
}

function Rq_decode(r, s) {
  const R = new Uint16Array(P);
  const M = new Uint16Array(P);
  for (let i = 0; i < P; ++i) {
    M[i] = Q;
  }
  Decode(R, 0, s, 0, M, P);
  for (let i = 0; i < P; ++i) {
    r[i] = toInt16(R[i] - Q12);
  }
}

function Rounded_encode(s, r) {
  const R = new Uint16Array(P);
  const M = new Uint16Array(P);
  const mVal = Math.floor((Q + 2) / 3);
  for (let i = 0; i < P; ++i) {
    R[i] = ((r[i] + Q12) * 10923) >>> 15;
    M[i] = mVal;
  }
  Encode(s, 0, R, M, P);
}

function Rounded_decode(r, s) {
  const R = new Uint16Array(P);
  const M = new Uint16Array(P);
  const mVal = Math.floor((Q + 2) / 3);
  for (let i = 0; i < P; ++i) {
    M[i] = mVal;
  }
  Decode(R, 0, s, 0, M, P);
  for (let i = 0; i < P; ++i) {
    r[i] = toInt16(R[i] * 3 - Q12);
  }
}

function ZKeyGen(pk, sk) {
  const h = new Int16Array(P);
  const f = new Int8Array(P);
  const v = new Int8Array(P);
  KeyGen(h, f, v);
  Rq_encode(pk, h);
  Small_encode(sk, 0, f);
  Small_encode(sk, SMALL_BYTES, v);
}

function ZEncrypt(C, r, pk) {
  const h = new Int16Array(P);
  const c = new Int16Array(P);
  Rq_decode(h, pk);
  Encrypt(c, r, h);
  Rounded_encode(C, c);
}

function ZDecrypt(r, C, sk) {
  const f = new Int8Array(P);
  const v = new Int8Array(P);
  const c = new Int16Array(P);
  Small_decode(f, sk, 0);
  Small_decode(v, sk, SMALL_BYTES);
  Rounded_decode(c, C);
  Decrypt(r, c, f, v);
}

function HashConfirm(h, hOffset, rEnc, cache, cacheOffset) {
  const x = new Uint8Array(HASH_BYTES * 2);
  Hash_prefix(x, 0, 3, rEnc, SMALL_BYTES);
  for (let i = 0; i < HASH_BYTES; ++i) {
    x[HASH_BYTES + i] = cache[cacheOffset + i];
  }
  Hash_prefix(h, hOffset, 2, x, x.length);
}

function HashSession(k, b, y, z) {
  const x = new Uint8Array(HASH_BYTES + CIPHERTEXT_BYTES);
  Hash_prefix(x, 0, 3, y, SMALL_BYTES);
  for (let i = 0; i < CIPHERTEXT_BYTES; ++i) {
    x[HASH_BYTES + i] = z[i];
  }
  Hash_prefix(k, 0, b, x, x.length);
}

function Hide(c, rEnc, r, pk, cache, cacheOffset = 0) {
  Small_encode(rEnc, 0, r);
  ZEncrypt(c, r, pk);
  HashConfirm(c, CIPHERTEXT_BYTES - CONFIRM_BYTES, rEnc, cache, cacheOffset);
}

function Ciphertexts_diff_mask(c, c2) {
  let differentbits = 0;
  for (let i = 0; i < CIPHERTEXT_BYTES; ++i) {
    differentbits |= c[i] ^ c2[i];
  }
  return (((differentbits - 1) >>> 8) & 1) - 1;
}

/**
 * Genera un par de claves sntrup761
 * @returns {{ publicKey: Uint8Array, secretKey: Uint8Array }}
 */
function keygen() {
  const pk = new Uint8Array(PUBLIC_KEY_BYTES);
  const sk = new Uint8Array(SECRET_KEY_BYTES);
  ZKeyGen(pk, sk);
  let skPos = SECRETKEYS_BYTES;
  for (let i = 0; i < PUBLIC_KEY_BYTES; ++i) {
    sk[skPos++] = pk[i];
  }
  const rho = crypto.randomBytes(SMALL_BYTES);
  for (let i = 0; i < SMALL_BYTES; ++i) {
    sk[skPos + i] = rho[i];
  }
  Hash_prefix(sk, skPos + SMALL_BYTES, 4, pk, PUBLIC_KEY_BYTES);
  return { publicKey: pk, secretKey: sk };
}

/**
 * Encapsula un secreto compartido usando una clave pública sntrup761
 * @param {Uint8Array} pk Clave pública de 1158 bytes
 * @returns {{ cipherText: Uint8Array, sharedSecret: Uint8Array }}
 */
function encapsulate(pk) {
  if (!pk || pk.length !== PUBLIC_KEY_BYTES) {
    throw new Error(`sntrup761 encapsulate requires a ${PUBLIC_KEY_BYTES}-byte publicKey`);
  }
  const c = new Uint8Array(CIPHERTEXT_BYTES);
  const k = new Uint8Array(SHARED_SECRET_BYTES);
  const r = new Int8Array(P);
  const rEnc = new Uint8Array(SMALL_BYTES);
  const cache = new Uint8Array(HASH_BYTES);
  Hash_prefix(cache, 0, 4, pk, PUBLIC_KEY_BYTES);
  Short_random(r);
  Hide(c, rEnc, r, pk, cache, 0);
  HashSession(k, 1, rEnc, c);
  return { cipherText: c, sharedSecret: k };
}

/**
 * Desencapsula un ciphertext sntrup761 usando la clave secreta
 * @param {Uint8Array} c Ciphertext de 1039 bytes
 * @param {Uint8Array} sk Clave secreta de 1763 bytes
 * @returns {Uint8Array} Secreto compartido de 32 bytes
 */
function decapsulate(c, sk) {
  if (!sk || sk.length !== SECRET_KEY_BYTES) {
    throw new Error(`sntrup761 decapsulate requires a ${SECRET_KEY_BYTES}-byte secretKey`);
  }
  if (!c || c.length !== CIPHERTEXT_BYTES) {
    throw new Error(`sntrup761 decapsulate requires a ${CIPHERTEXT_BYTES}-byte cipherText`);
  }
  const k = new Uint8Array(SHARED_SECRET_BYTES);
  const pkOffset = SECRETKEYS_BYTES;
  const rhoOffset = pkOffset + PUBLIC_KEY_BYTES;
  const cacheOffset = rhoOffset + SMALL_BYTES;
  const pk = sk.subarray(pkOffset, rhoOffset);
  const r = new Int8Array(P);
  const rEnc = new Uint8Array(SMALL_BYTES);
  const cnew = new Uint8Array(CIPHERTEXT_BYTES);
  ZDecrypt(r, c, sk);
  Hide(cnew, rEnc, r, pk, sk, cacheOffset);
  const mask = Ciphertexts_diff_mask(c, cnew);
  for (let i = 0; i < SMALL_BYTES; ++i) {
    rEnc[i] ^= mask & (rEnc[i] ^ sk[rhoOffset + i]);
  }
  HashSession(k, 1 + mask, rEnc, c);
  return k;
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

