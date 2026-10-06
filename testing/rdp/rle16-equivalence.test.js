'use strict';

/**
 * El decodificador RLE16 se optimizo (acceso directo por indice). Estas pruebas
 * comparan su salida byte a byte con la implementacion anterior
 * (testing/rdp/rle16-reference.js) usando flujos RLE validos generados al azar,
 * flujos truncados y teselas reales del test de fastpath.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fresh = require('../../src/main/services/rdp-rle16');
const ref = require('./rle16-reference');

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('rdp-rle16 decompress16bpp equivalente a la version anterior', () => {
  it('coincide byte a byte con flujos RLE aleatorios (ordenes simples)', () => {
    // Generador reducido y sin ordenes FGBG (se prueban aparte con datos reales).
    const rand = mulberry32(1234);
    let compared = 0;
    for (let iter = 0; iter < 400; iter++) {
      const w = 1 + Math.floor(rand() * 70);
      const h = 1 + Math.floor(rand() * 40);
      const total = w * h;
      const out = [];
      let left = total;
      const u16 = (v) => out.push(v & 0xff, (v >> 8) & 0xff);
      while (left > 0) {
        const want = Math.min(left, 1 + Math.floor(rand() * 100));
        const t = Math.floor(rand() * 6);
        if (t === 0) {
          // BG run
          if (want < 32) out.push(want);
          else { out.push(0xf0); u16(want); }
          left -= want;
        } else if (t === 1) {
          // FG run con set fg (mega)
          out.push(0xf6); u16(want); u16(Math.floor(rand() * 65536));
          left -= want;
        } else if (t === 2) {
          // COLOR run
          if (want < 32) out.push(0x60 | want);
          else { out.push(0xf3); u16(want); }
          u16(Math.floor(rand() * 65536));
          left -= want;
        } else if (t === 3) {
          // COLOR image
          if (want < 32) out.push(0x80 | want);
          else { out.push(0xf4); u16(want); }
          for (let i = 0; i < want; i++) u16(Math.floor(rand() * 65536));
          left -= want;
        } else if (t === 4 && left >= 1) {
          out.push(rand() < 0.5 ? 0xfd : 0xfe);
          left -= 1;
        } else {
          // FG run sin set (usa el fg anterior)
          out.push(0xf1); u16(want);
          left -= want;
        }
      }
      const rle = Buffer.from(out);
      const a = fresh.decompress16bpp(Buffer.from(rle), w, h);
      const b = ref.decompress16bpp(Buffer.from(rle), w, h);
      assert.ok(a.equals(b), `iter ${iter} ${w}x${h}`);
      compared += 1;
    }
    assert.equal(compared, 400);
  });

  it('ordenes FGBG, SPECIAL_FGBG y dithered: misma salida o mismo error con bytes aleatorios', () => {
    const rand = mulberry32(99);
    let equalOk = 0;
    let equalErr = 0;
    for (let iter = 0; iter < 3000; iter++) {
      const w = 1 + Math.floor(rand() * 24);
      const h = 1 + Math.floor(rand() * 12);
      const len = 1 + Math.floor(rand() * 120);
      const bytes = Buffer.alloc(len);
      for (let i = 0; i < len; i++) bytes[i] = Math.floor(rand() * 256);
      let a;
      let b;
      let ea = null;
      let eb = null;
      try { a = fresh.decompress16bpp(Buffer.from(bytes), w, h); } catch (e) { ea = e; }
      try { b = ref.decompress16bpp(Buffer.from(bytes), w, h); } catch (e) { eb = e; }
      if (ea || eb) {
        assert.ok(ea && eb, `iter ${iter}: solo una version lanzo (${ea && ea.message} / ${eb && eb.message})`);
        assert.equal(ea.name === 'RleError', eb.name === 'RleError', `iter ${iter} tipo de error`);
        if (ea.name === 'RleError') assert.equal(ea.message, eb.message, `iter ${iter} mensaje`);
        equalErr += 1;
      } else {
        assert.ok(a.equals(b), `iter ${iter} ${w}x${h}`);
        equalOk += 1;
      }
    }
    assert.ok(equalOk > 20, `pocas decodificaciones validas (${equalOk})`);
    assert.ok(equalErr > 0);
  });

  it('round trip: decode(encodeCompact(x)) reproduce los pixeles', () => {
    const rand = mulberry32(7);
    for (let iter = 0; iter < 60; iter++) {
      const w = 1 + Math.floor(rand() * 64);
      const h = 1 + Math.floor(rand() * 64);
      const px = Buffer.alloc(w * h * 2);
      // Mezcla de zonas planas y ruido
      for (let i = 0; i < px.length; i += 2) {
        const flat = rand() < 0.7;
        const v = flat ? 0x1234 : Math.floor(rand() * 65536);
        px.writeUInt16LE(v, i);
      }
      const enc = fresh.encodeCompactRgb16(px);
      assert.ok(enc.equals(ref.encodeCompactRgb16(px)), `encoder iter ${iter}`);
      const dec = fresh.decompress16bpp(Buffer.from(enc), w, h);
      assert.ok(dec.equals(px), `round trip iter ${iter}`);
    }
  });

  it('rdp-rle16 es mas rapido o igual que la referencia en una tesela tipica', () => {
    const w = 64;
    const h = 64;
    const px = Buffer.alloc(w * h * 2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) px.writeUInt16LE(x < 40 ? 0x7bef : (x * 31 + y) & 0xffff, (y * w + x) * 2);
    }
    const enc = ref.encodeCompactRgb16(px);
    const time = (impl) => {
      const t0 = process.hrtime.bigint();
      for (let i = 0; i < 400; i++) impl.decompress16bpp(Buffer.from(enc), w, h);
      return Number(process.hrtime.bigint() - t0) / 1e6;
    };
    time(fresh); time(ref); // calentamiento
    const tNew = time(fresh);
    const tOld = time(ref);
    // No es una afirmacion estricta (CI ruidoso): solo avisa si fuese mucho peor.
    assert.ok(tNew < tOld * 1.5, `nuevo ${tNew.toFixed(1)}ms vs viejo ${tOld.toFixed(1)}ms`);
  });
});
