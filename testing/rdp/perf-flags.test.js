const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { buildMcsSendDataRequest, parseMcsSendData } = require('../../src/main/services/rdp-autodetect');
const {
  patchInfoPacket,
  PERF_DISABLE_WALLPAPER,
  PERF_DISABLE_THEMING,
  PERF_ENABLE_FONT_SMOOTHING,
  PERF_ENABLE_DESKTOP_COMPOSITION,
  PERF_DISABLE_FULLWINDOWDRAG,
  PERF_DISABLE_MENUANIMATIONS
} = require('../../src/main/services/rdp-mcs-helpers');

/**
 * TS_INFO_PACKET con el layout real de MS-RDPBCGR 2.2.1.11.1.1: cada string va
 * seguido de un terminador nulo de 2 bytes que no cuenta en su cb*.
 */
function buildInfoUserData({ user = 'User', pass = 'Pass', perfFlags = 0, address = '127.0.0.1', dir = 'C:\\x' } = {}) {
  const u16 = (s) => Buffer.from(s, 'utf16le');
  const term = Buffer.alloc(2);
  const userB = u16(user);
  const passB = u16(pass);
  const addrB = Buffer.concat([u16(address), term]); // cbClientAddress incluye terminador
  const dirB = Buffer.concat([u16(dir), term]);

  const head = Buffer.alloc(4 + 4 + 4 + 10);
  head.writeUInt32LE(0, 0); // sec header
  head.writeUInt32LE(0x000004e4, 4); // CodePage
  head.writeUInt32LE(0x00000011, 8); // INFO_MOUSE | INFO_UNICODE
  head.writeUInt16LE(0, 12); // cbDomain
  head.writeUInt16LE(userB.length, 14);
  head.writeUInt16LE(passB.length, 16);
  head.writeUInt16LE(0, 18); // cbAlternateShell
  head.writeUInt16LE(0, 20); // cbWorkingDir

  const ext1 = Buffer.alloc(4);
  ext1.writeUInt16LE(2, 0); // AF_INET
  ext1.writeUInt16LE(addrB.length, 2);
  const cbDir = Buffer.alloc(2);
  cbDir.writeUInt16LE(dirB.length, 0);
  const tz = Buffer.alloc(172);
  const sessionAndPerf = Buffer.alloc(8);
  sessionAndPerf.writeUInt32LE(0, 0);
  sessionAndPerf.writeUInt32LE(perfFlags >>> 0, 4);

  // Cabecera (22 bytes) -> Domain(0)+term -> User+term -> Pass+term -> Shell(0)+term -> WorkDir(0)+term
  return Buffer.concat([
    head.subarray(0, 22),
    term, userB, term, passB, term, term, term,
    ext1, addrB, cbDir, dirB, tz, sessionAndPerf,
    Buffer.alloc(2) // cbAutoReconnectCookie
  ]);
}

function perfFlagsOf(raw) {
  const u = parseMcsSendData(raw).userData;
  // Info packet empieza en 4; ext tras 22 + 5 terminadores + strings
  const cbUser = u.readUInt16LE(14);
  const cbPass = u.readUInt16LE(16);
  const extOff = 22 + 10 + cbUser + cbPass;
  const cbAddr = u.readUInt16LE(extOff + 2);
  const dirOff = extOff + 4 + cbAddr;
  const cbDir = u.readUInt16LE(dirOff);
  return u.readUInt32LE(dirOff + 2 + cbDir + 172 + 4);
}

describe('patchInfoPacket TS_PERF_FLAGS', () => {
  const p = path.join(__dirname, 'frames/to-05-421b.hex');

  it('inyecta autologon en TS_INFO_PACKET capturado (si existe el fixture)', () => {
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const res = patchInfoPacket(raw, { enableWallpaper: true });
    assert.equal(res.patched, true);
    assert.ok(res.newFlags & 0x0008, 'INFO_AUTOLOGON inyectado');
  });

  it('el paquete real capturado expone perfFlags 0x86 y se puede cambiar (si existe el fixture)', () => {
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const res = patchInfoPacket(raw, { enableWallpaper: false, enableFullWindowDrag: true });
    assert.equal(res.perfFlagsBefore, 0x86);
    assert.equal(res.perfFlagsAfter, ((0x86 | PERF_DISABLE_WALLPAPER) & ~PERF_DISABLE_FULLWINDOWDRAG) >>> 0);
    assert.ok(res.changes.some((c) => c.includes('perfFlags')));
    assert.equal(perfFlagsOf(res.buf), res.perfFlagsAfter);
  });

  it('ajusta performanceFlags con el layout real (terminadores nulos)', () => {
    const userData = buildInfoUserData({ perfFlags: PERF_DISABLE_WALLPAPER });
    const raw = buildMcsSendDataRequest(1001, 1003, userData);
    assert.equal(perfFlagsOf(raw), PERF_DISABLE_WALLPAPER);

    const res = patchInfoPacket(raw, {
      enableWallpaper: true,
      enableFontSmoothing: true,
      enableDesktopComposition: true,
      enableTheming: true
    });

    assert.equal(res.patched, true);
    assert.ok(res.changes.some((c) => c.includes('perfFlags')));
    assert.ok(res.newFlags & 0x0008, 'INFO_AUTOLOGON inyectado');
    const after = perfFlagsOf(res.buf);
    assert.equal(after & PERF_DISABLE_WALLPAPER, 0);
    assert.ok(after & PERF_ENABLE_FONT_SMOOTHING);
    assert.ok(after & PERF_ENABLE_DESKTOP_COMPOSITION);
    assert.equal(after & PERF_DISABLE_THEMING, 0);
  });

  it('desactivar fondo, arrastre y animaciones activa los flags DISABLE_*', () => {
    const raw = buildMcsSendDataRequest(1001, 1003, buildInfoUserData({ perfFlags: 0 }));
    const res = patchInfoPacket(raw, {
      enableWallpaper: false,
      enableFullWindowDrag: false,
      enableMenuAnimations: false
    });
    const after = perfFlagsOf(res.buf);
    assert.ok(after & PERF_DISABLE_WALLPAPER);
    assert.ok(after & PERF_DISABLE_FULLWINDOWDRAG);
    assert.ok(after & PERF_DISABLE_MENUANIMATIONS);
    assert.equal(res.perfFlagsBefore, 0);
  });

  it('opciones ausentes no tocan los flags (temas / suavizado quedan como IronRDP)', () => {
    const base = PERF_ENABLE_FONT_SMOOTHING | PERF_DISABLE_MENUANIMATIONS | PERF_DISABLE_FULLWINDOWDRAG;
    const raw = buildMcsSendDataRequest(1001, 1003, buildInfoUserData({ perfFlags: base }));
    const res = patchInfoPacket(raw, { enableWallpaper: true });
    assert.equal(res.perfFlagsBefore, base);
    assert.equal(res.perfFlagsAfter, base);
    assert.equal(perfFlagsOf(res.buf), base);
  });

  it('aplica perfFlags aunque la contrasena este vacia (sin inyectar autologon)', () => {
    const raw = buildMcsSendDataRequest(1001, 1003, buildInfoUserData({ pass: '', perfFlags: 0 }));
    const res = patchInfoPacket(raw, { enableWallpaper: false });
    assert.equal(res.patched, true);
    assert.ok(!res.changes.includes('autologon'));
    assert.ok(perfFlagsOf(res.buf) & PERF_DISABLE_WALLPAPER);
  });

  it('no escribe fuera de rango con un paquete truncado', () => {
    const full = buildInfoUserData({ perfFlags: 0 });
    const truncated = full.subarray(0, full.length - 30);
    const raw = buildMcsSendDataRequest(1001, 1003, truncated);
    const res = patchInfoPacket(raw, { enableWallpaper: false });
    assert.equal(res.perfFlagsBefore, null);
    assert.ok(!res.changes.some((c) => c.includes('perfFlags')));
  });
});
