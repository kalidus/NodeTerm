const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { buildMcsSendDataRequest } = require('../../src/main/services/rdp-autodetect');
const {
  patchInfoPacket,
  PERF_DISABLE_WALLPAPER,
  PERF_DISABLE_THEMING,
  PERF_ENABLE_FONT_SMOOTHING,
  PERF_ENABLE_DESKTOP_COMPOSITION,
  PERF_DISABLE_FULLWINDOWDRAG,
  PERF_DISABLE_MENUANIMATIONS
} = require('../../src/main/services/rdp-mcs-helpers');

describe('patchInfoPacket TS_PERF_FLAGS', () => {
  const p = path.join(__dirname, 'frames/to-05-421b.hex');

  it('inyecta autologon en TS_INFO_PACKET estandar', () => {
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');

    const res = patchInfoPacket(raw, {
      enableWallpaper: true,
      enableFontSmoothing: true
    });

    assert.equal(res.patched, true);
    assert.ok(res.newFlags & 0x0008, 'INFO_AUTOLOGON inyectado');
  });

  it('ajusta performanceFlags cuando TS_EXTENDED_INFO_PACKET esta presente', () => {
    const userData = Buffer.alloc(240);
    userData.writeUInt32LE(0x00000000, 0); // sec header
    userData.writeUInt32LE(0x000004e4, 4); // CodePage
    userData.writeUInt32LE(0x00000811, 8); // flags: INFO_UNICODE | INFO_MOUSE | INFO_EXTENDED_INFO
    userData.writeUInt16LE(0, 12); // cbDomain
    userData.writeUInt16LE(8, 14); // cbUserName
    userData.writeUInt16LE(8, 16); // cbPassword
    userData.writeUInt16LE(0, 18); // cbAltShell
    userData.writeUInt16LE(0, 20); // cbWorkingDir

    // Strings
    userData.write('User', 22, 'utf16le');
    userData.write('Pass', 30, 'utf16le');

    // TS_EXTENDED_INFO_PACKET at off 38:
    const extOff = 38;
    userData.writeUInt16LE(2, extOff); // clientAddressFamily
    userData.writeUInt16LE(0, extOff + 2); // cbClientAddress
    const dirOff = extOff + 4;
    userData.writeUInt16LE(0, dirOff); // cbClientDir
    const tzOff = dirOff + 2;
    // tz 172B -> perfFlags at tzOff + 172 + 4
    const perfFlagsOff = tzOff + 172 + 4;
    userData.writeUInt32LE(0x00000001, perfFlagsOff); // initial perfFlags: PERF_DISABLE_WALLPAPER

    const raw = buildMcsSendDataRequest(1001, 1003, userData);

    const res = patchInfoPacket(raw, {
      enableWallpaper: true,
      enableFontSmoothing: true,
      enableDesktopComposition: true,
      enableTheming: true
    });

    assert.equal(res.patched, true);
    assert.ok(res.changes.some(c => c.includes('perfFlags')));
    assert.ok(res.newFlags & 0x0008, 'INFO_AUTOLOGON inyectado');
  });
});
