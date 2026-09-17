'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { readFpLength, fixWallixBitmapStrideCrop } = require('../../src/main/services/rdp-fastpath-helpers');
const { createChannelFilterState, processServerFrame, learnFromServerGcc } = require('../../src/main/services/rdp-channel-filter');
const { patchFontSequenceFlags } = require('../../src/main/services/rdp-font-helpers');

const { splitTpktFrames } = require('../../src/main/services/rdp-protocol-helpers');

describe('RDP TCP Stream Deframer & Wallix Separation', () => {
  const f1Path = path.join(__dirname, 'frames/from-01-105b.hex');
  const f9Path = path.join(__dirname, 'frames/from-09-36b.hex');
  const f14Path = path.join(__dirname, 'frames/from-14-581b.hex');
  const f18HbPath = path.join(__dirname, 'frames/from-18-22b.hex');
  const f18DvcPath = path.join(__dirname, 'frames/from-18-66b.hex');

  const f1 = Buffer.from(fs.readFileSync(f1Path, 'utf8'), 'hex');
  const f9 = Buffer.from(fs.readFileSync(f9Path, 'utf8'), 'hex');
  const f14 = Buffer.from(fs.readFileSync(f14Path, 'utf8'), 'hex');
  const f18Hb = Buffer.from(fs.readFileSync(f18HbPath, 'utf8'), 'hex');
  const f18Dvc = Buffer.from(fs.readFileSync(f18DvcPath, 'utf8'), 'hex');
  const fPtr = Buffer.from([0x00, 0x07, 0x0a, 0x02, 0x00, 0x10, 0x00]); // 7B FastPath Pointer

  test('separa múltiples frames TPKT concatenados en un único chunk TCP', () => {
    // TPKT 36B seguido de TPKT 22B
    const combinedTpkt = Buffer.concat([f9, f18Hb]);
    const emitted = splitTpktFrames(combinedTpkt);

    assert.equal(emitted.length, 2);
    assert.equal(emitted[0].length, 36);
    assert.equal(emitted[0][0], 0x03);
    assert.equal(emitted[1].length, 22);
    assert.equal(emitted[1][0], 0x03);
  });

  test('dropear Heartbeat concatenado no descarta el FastPath Bitmap que viene detrás', () => {
    const channelFilter = createChannelFilterState();
    learnFromServerGcc(channelFilter, f1);

    // Chunk con Heartbeat (22B) seguido de Bitmap (581B)
    const combined = Buffer.concat([f18Hb, f14]);
    const emittedFrames = splitTpktFrames(combined);

    assert.equal(emittedFrames.length, 2);

    // Frame 1: Heartbeat debe ser dropeado
    const proc1 = processServerFrame(channelFilter, emittedFrames[0]);
    assert.equal(proc1.dropped, true);
    assert.equal(proc1.forward, null);

    // Frame 2: Bitmap DEBE conservarse y no perderse
    const proc2 = processServerFrame(channelFilter, emittedFrames[1]);
    assert.equal(proc2.dropped, false);
    assert.ok(proc2.forward);
    assert.equal(proc2.forward.length, 581);

    // Comprobar que fixWallixBitmapStrideCrop procesa el frame correctamente
    const stride = fixWallixBitmapStrideCrop(proc2.forward);
    assert.equal(stride.patchedCount, 21);
    assert.equal(stride.buffers.length, 1);
  });

  test('preserva intactos los paquetes CredSSP / NLA (0x30 ASN.1 SEQUENCE) sin mutilarlos', () => {
    // Paquete simulado de CredSSP TSRequest (ASN.1 DER Sequence 0x30)
    const credSspPacket = Buffer.alloc(512);
    credSspPacket[0] = 0x30;
    credSspPacket[1] = 0x82;
    credSspPacket.writeUInt16BE(508, 2);

    const emitted = splitTpktFrames(credSspPacket);
    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].length, 512);
    assert.equal(emitted[0][0], 0x30);
    assert.deepEqual(emitted[0], credSspPacket);
  });

  test('preserva intactos los paquetes Fast-Path (0x00) sin trocearlos erróneamente', () => {
    const emitted = splitTpktFrames(f14);
    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].length, 581);
    assert.deepEqual(emitted[0], f14);
  });

  test('resolución de usuario Wallix Modo 1 (conexión directa solo host)', () => {
    const rdpConfig = {
      hostname: 'bastion-dsn.sec.dsn.inet',
      username: 'rt01119',
      useBastionWallix: true,
      bastionUser: 'rt01119',
      targetServer: undefined
    };

    const rawUser = (rdpConfig.useBastionWallix && rdpConfig.bastionUser)
      ? rdpConfig.bastionUser
      : (rdpConfig.username || '');
    let usernameStr = String(rawUser).trim();

    const isWallixChain = usernameStr.split('@').length >= 3 || (usernameStr.includes('@') && usernameStr.includes(':'));
    const isWallixUserFormat = !!(
      rdpConfig.useBastionWallix ||
      rdpConfig.bastionUser ||
      rdpConfig.targetServer ||
      isWallixChain
    );

    if (isWallixUserFormat) {
      if (!usernameStr.includes('@') && !usernameStr.includes(':')) {
        const tServer = rdpConfig.targetServer || '';
        if (tServer) {
          usernameStr = `${usernameStr}@default@${tServer}:APP:${usernameStr}`;
        }
      }
    }

    // En Modo 1 directo debe permanecer exactamente como 'rt01119'
    assert.equal(usernameStr, 'rt01119');
    assert.equal(isWallixUserFormat, true);
  });

  test('resolución de usuario Wallix Modo 2 (cadena Wallix completa)', () => {
    const rdpConfig = {
      hostname: 'bastion-dsn.sec.dsn.inet',
      username: 'rt01119@default@Fortigate_JC:APP:rt01119',
      useBastionWallix: false,
      bastionUser: undefined
    };

    const rawUser = (rdpConfig.useBastionWallix && rdpConfig.bastionUser)
      ? rdpConfig.bastionUser
      : (rdpConfig.username || '');
    let usernameStr = String(rawUser).trim();

    const isWallixChain = usernameStr.split('@').length >= 3 || (usernameStr.includes('@') && usernameStr.includes(':'));
    const isWallixUserFormat = !!(
      rdpConfig.useBastionWallix ||
      rdpConfig.bastionUser ||
      rdpConfig.targetServer ||
      isWallixChain
    );

    if (isWallixUserFormat) {
      if (!usernameStr.includes('@') && !usernameStr.includes(':')) {
        const tServer = rdpConfig.targetServer || '';
        if (tServer) {
          usernameStr = `${usernameStr}@default@${tServer}:APP:${usernameStr}`;
        }
      }
    }

    // En Modo 2 debe preservarse íntegra la cadena y no dividirse por @
    assert.equal(usernameStr, 'rt01119@default@Fortigate_JC:APP:rt01119');
    assert.equal(isWallixUserFormat, true);
  });

  test('resolución de usuario CyberArk PAM con # o múltiples @ se preserva íntegra', () => {
    const cyberarkStrings = [
      'kalidus@admin#corp.local@srv-db-01',
      'admin#corp.local@srv-db-01',
      'kalidus@root@10.0.0.5'
    ];

    for (const str of cyberarkStrings) {
      const isBastionChain = str.split('@').length >= 3 || (str.includes('@') && (str.includes(':') || str.includes('#')));
      assert.equal(isBastionChain, true, `Cadena CyberArk ${str} debe reconocerse como bastión`);
    }
  });

  test('resolución de usuario Wallix con targetServer separado', () => {
    const rdpConfig = {
      hostname: 'bastion-dsn.sec.dsn.inet',
      username: 'rt01119',
      useBastionWallix: true,
      bastionUser: 'rt01119',
      targetServer: 'Fortigate_JC',
      targetUser: 'rt01119',
      wallixDomain: 'default',
      wallixService: 'APP'
    };

    const rawUser = (rdpConfig.useBastionWallix && rdpConfig.bastionUser)
      ? rdpConfig.bastionUser
      : (rdpConfig.username || '');
    let usernameStr = String(rawUser).trim();

    const isWallixChain = usernameStr.split('@').length >= 3 || (usernameStr.includes('@') && usernameStr.includes(':'));
    const isWallixUserFormat = !!(
      rdpConfig.useBastionWallix ||
      rdpConfig.bastionUser ||
      rdpConfig.targetServer ||
      isWallixChain
    );

    if (isWallixUserFormat) {
      if (!usernameStr.includes('@') && !usernameStr.includes(':')) {
        const tServer = rdpConfig.targetServer || '';
        const tUser = rdpConfig.targetUser || usernameStr;
        const wDomain = rdpConfig.wallixDomain || 'default';
        const wService = rdpConfig.wallixService || 'APP';
        if (tServer) {
          usernameStr = `${usernameStr}@${wDomain}@${tServer}:${wService}:${tUser}`;
        }
      }
    }

    // Debe formatearse como cadena Wallix estándar
    assert.equal(usernameStr, 'rt01119@default@Fortigate_JC:APP:rt01119');
  });

  test('separa paquete FastPath seguido de un paquete TPKT (orden invertido)', () => {
    // Chunk TCP donde el servidor envía FastPath Bitmap (581B) y luego Heartbeat TPKT (22B)
    const reversed = Buffer.concat([f14, f18Hb]);
    const emitted = splitTpktFrames(reversed);

    assert.equal(emitted.length, 2);
    assert.equal(emitted[0].length, 581);
    assert.equal(emitted[0][0] & 0x03, 0); // Fast-Path
    assert.equal(emitted[1].length, 22);
    assert.equal(emitted[1][0], 0x03); // TPKT
  });

  test('separa múltiples paquetes Fast-Path consecutivos en un mismo chunk', () => {
    // FastPath Bitmap (581B) seguido de FastPath Pointer (7B)
    const combinedFp = Buffer.concat([f14, fPtr]);
    const emitted = splitTpktFrames(combinedFp);

    assert.equal(emitted.length, 2);
    assert.equal(emitted[0].length, 581);
    assert.equal(emitted[1].length, 7);
  });

  test('canal 1001 es descartado incondicionalmente sin importar si state.ready es true o false', () => {
    // Construir frame de canal 1001 (0x03e9)
    const ch1001 = Buffer.from(f9);
    ch1001.writeUInt16BE(1001, 10);

    const unreadyState = createChannelFilterState();
    const proc1 = processServerFrame(unreadyState, ch1001);
    assert.equal(proc1.dropped, true);
    assert.equal(proc1.forward, null);

    const readyState = createChannelFilterState();
    learnFromServerGcc(readyState, f1);
    const proc2 = processServerFrame(readyState, ch1001);
    assert.equal(proc2.dropped, true);
    assert.equal(proc2.forward, null);
  });

  test('permite paquetes de licencia del servidor (SEC_LICENSE_PKT 0x0080) en canal IO', () => {
    const state = createChannelFilterState();
    learnFromServerGcc(state, f1); // ioChannelId = 1003

    // PDU de licencia del servidor (Frame 6 de Wallix, 337B)
    const frame6UserData = Buffer.from('8000000001023e017b3c31a6aee874f6', 'hex');
    const licensePdu = Buffer.concat([
      Buffer.from([0x03, 0x00, 0x00, 30, 0x02, 0xf0, 0x80, 0x68, 0x00, 0x00, 0x03, 0xeb, 0x70, 16]),
      frame6UserData
    ]);

    const proc = processServerFrame(state, licensePdu);
    assert.equal(proc.dropped, false);
    assert.ok(proc.forward);
    assert.equal(proc.forward.length, 30);
  });

  test('descarta Heartbeat del servidor (SEC_FLAGSHI_VALID y flagsHi con 0x0041 o 0x000b) en canal IO', () => {
    const state = createChannelFilterState();
    learnFromServerGcc(state, f1);

    // Heartbeat real de Wallix f18Hb (22B)
    const proc = processServerFrame(state, f18Hb);
    assert.equal(proc.dropped, true);
    assert.equal(proc.forward, null);
    assert.ok(proc.note.includes('server-heartbeat'));
  });

  test('descarta ShareControlHeader con pduType no soportado (ej. 0x0b) en canal IO', () => {
    const state = createChannelFilterState();
    learnFromServerGcc(state, f1); // ioChannelId = 1003

    // PDU ShareControlHeader con pduType = 0x000b (11) y longitud >= 10
    // totalLength=20 (0x0014), pduType=0x001b (version 1, type 0x0b), pduSource=1003, shareId=0x00010000
    const invalidPduUserData = Buffer.from('14001b00eb030000010000000000000000000000', 'hex');
    const invalidShareControl = Buffer.concat([
      Buffer.from([0x03, 0x00, 0x00, 34, 0x02, 0xf0, 0x80, 0x68, 0x00, 0x00, 0x03, 0xeb, 0x70, 20]),
      invalidPduUserData
    ]);

    const proc = processServerFrame(state, invalidShareControl);
    assert.equal(proc.dropped, true);
    assert.equal(proc.forward, null);
    assert.ok(proc.note.includes('invalid-share-control-0xb'));
  });

  test('permite ShareControlHeader con pduType estándar (DemandActive=1, ConfirmActive=3, Data=7) en canal IO', () => {
    const state = createChannelFilterState();
    learnFromServerGcc(state, f1); // ioChannelId = 1003

    // Data PDU: totalLength=20, pduType=0x0017 (type 7), pduSource=1003, shareId=0x00010000
    const dataPduUserData = Buffer.from('14001700eb030000010000000000000000000000', 'hex');
    const dataPdu = Buffer.concat([
      Buffer.from([0x03, 0x00, 0x00, 34, 0x02, 0xf0, 0x80, 0x68, 0x00, 0x00, 0x03, 0xeb, 0x70, 20]),
      dataPduUserData
    ]);

    const proc = processServerFrame(state, dataPdu);
    assert.equal(proc.dropped, false);
    assert.ok(proc.forward);
  });

  test('canal 1001 nunca secuestra el canal cliprdr (1004) y se descarta siempre', () => {
    const state = createChannelFilterState();
    learnFromServerGcc(state, f1);
    state.cliprdrChannelId = 1004;

    // Simular paquetes frame#14 (46B) y frame#15 (30B) en canal 1001
    const dummyUserData46 = Buffer.alloc(32, 0x55);
    const pdu14 = Buffer.concat([
      Buffer.from([0x03, 0x00, 0x00, 46, 0x02, 0xf0, 0x80, 0x68, 0x00, 0x00, 0x03, 0xe9, 0x70, 32]),
      dummyUserData46
    ]);

    const proc14 = processServerFrame(state, pdu14);
    assert.equal(proc14.dropped, true);
    assert.equal(proc14.forward, null);
    // Verificar que cliprdrChannelId sigue siendo 1004
    assert.equal(state.cliprdrChannelId, 1004);

    // Una PDU CLIPRDR legitima en el 1004 si debe llegar a WASM. Se exige que sea CLIPRDR de
    // verdad: reenviar cualquier cosa por venir en ese canal le colaba a IronRDP tráfico rdpdr,
    // que es lo que el bastión entrega por el canal que el cliente reservó para el portapapeles.
    const chanHdr = Buffer.alloc(8);
    chanHdr.writeUInt32LE(8, 0);
    chanHdr.writeUInt32LE(0x03, 4); // FIRST | LAST
    const clipPayload = Buffer.alloc(8);
    clipPayload.writeUInt16LE(1, 0); // CB_MONITOR_READY
    const userData = Buffer.concat([chanHdr, clipPayload]);

    const realCliprdr = Buffer.concat([
      Buffer.from([0x03, 0x00, 0x00, 30, 0x02, 0xf0, 0x80, 0x68, 0x00, 0x00, 0x03, 0xec, 0x70, userData.length]),
      userData
    ]);
    const procClip = processServerFrame(state, realCliprdr);
    assert.equal(procClip.dropped, false);
    assert.ok(procClip.forward);
    assert.equal(procClip.channelId, 1004);

    // Y basura en el 1004 se descarta en vez de reenviarse como si fuera portapapeles
    const garbage = Buffer.concat([
      Buffer.from([0x03, 0x00, 0x00, 30, 0x02, 0xf0, 0x80, 0x68, 0x00, 0x00, 0x03, 0xec, 0x70, 16]),
      Buffer.alloc(16, 0x11)
    ]);
    assert.equal(processServerFrame(state, garbage).dropped, true);
  });

  test('procesa PDU cliprdr legítima en canal 1004 y activa cliprdrServerReady', () => {
    const { isCliprdrHeader } = require('../../src/main/services/rdp-channel-filter');
    const state = createChannelFilterState();
    learnFromServerGcc(state, f1); // ioChannelId = 1003, cliprdr = 1004
    state.cliprdrChannelId = 1004;

    // Construir CB_CLIP_CAPS en canal 1004 (0x03ec): 8B ChanHdr + 8B ClipHdr + 16B Caps = 32B userData, 46B total
    const capsUserData = Buffer.alloc(32);
    capsUserData.writeUInt32LE(24, 0); // ChanHdr len = 24
    capsUserData.writeUInt32LE(3, 4);  // ChanHdr flags (FIRST|LAST)
    capsUserData.writeUInt16LE(7, 8);  // msgType = CB_CLIP_CAPS
    capsUserData.writeUInt16LE(0, 10); // msgFlags
    capsUserData.writeUInt32LE(16, 12); // dataLen = 16 (payloadLen = 24B, dataLen = 24-8 = 16)
    // Caps set
    capsUserData.writeUInt16LE(1, 16); // cCapabilitiesSets = 1
    capsUserData.writeUInt16LE(0, 18); // pad1
    capsUserData.writeUInt16LE(1, 20); // capabilitySetType = GENERAL
    capsUserData.writeUInt16LE(16, 22); // lengthCapability = 16
    capsUserData.writeUInt32LE(2, 24); // version = 2
    capsUserData.writeUInt32LE(0x2e, 28); // generalFlags

    assert.equal(isCliprdrHeader(capsUserData), true);

    const pdu1004 = Buffer.concat([
      Buffer.from([0x03, 0x00, 0x00, 46, 0x02, 0xf0, 0x80, 0x68, 0x00, 0x00, 0x03, 0xec, 0x70, 32]),
      capsUserData
    ]);

    const proc = processServerFrame(state, pdu1004);
    assert.equal(proc.dropped, false);
    assert.ok(proc.forward);
    assert.equal(proc.forward.readUInt16BE(10), 1004);
    assert.equal(proc.channelId, 1004);
    assert.equal(state.cliprdrServerReady, true);
  });

  test('procesa CB_FORMAT_LIST con alineación de padding de Windows (canal 1004 directo) sin descartarlo', () => {
    const { isCliprdrHeader } = require('../../src/main/services/rdp-channel-filter');
    const state = createChannelFilterState();
    learnFromServerGcc(state, f1); // ioChannelId = 1003, cliprdr = 1004
    state.cliprdrChannelId = 1004;

    // Simular CB_FORMAT_LIST real con padding (dataLen = 18, 2 bytes padding para múltiplo de 4, payloadLen = 28B)
    const formatUserData = Buffer.alloc(36);
    formatUserData.writeUInt32LE(28, 0); // ChanHdr len = 28
    formatUserData.writeUInt32LE(3, 4);  // ChanHdr flags = 3
    formatUserData.writeUInt16LE(2, 8);  // msgType = CB_FORMAT_LIST
    formatUserData.writeUInt16LE(0, 10); // msgFlags = 0
    formatUserData.writeUInt32LE(18, 12); // dataLen = 18

    assert.equal(isCliprdrHeader(formatUserData), true);

    const pdu1004 = Buffer.concat([
      Buffer.from([0x03, 0x00, 0x00, 50, 0x02, 0xf0, 0x80, 0x68, 0x00, 0x00, 0x03, 0xec, 0x70, 36]),
      formatUserData
    ]);

    const proc = processServerFrame(state, pdu1004);
    assert.equal(proc.dropped, false);
    assert.ok(proc.forward);
    assert.equal(proc.channelId, 1004);
    assert.equal(proc.isCliprdr, true);
  });

  test('patchClientNetworkChannelOptions inyecta CHANNEL_OPTION_INITIALIZED en TS_UD_CS_NET', () => {
    const { patchClientNetworkChannelOptions } = require('../../src/main/services/rdp-mcs-helpers');
    const fs = require('fs');
    const path = require('path');
    const dumpPath = path.join(__dirname, 'last-mcs-connect-initial.hex');
    if (!fs.existsSync(dumpPath)) return;

    const raw = Buffer.from(fs.readFileSync(dumpPath, 'utf8'), 'hex');
    const res = patchClientNetworkChannelOptions(raw);
    assert.equal(res.patched, true);
    assert.ok(res.changes.length > 0);

    // Verificar que CHANNEL_OPTION_INITIALIZED (bit 31 = 0x80000000) está activo
    const duca = res.buf.indexOf(Buffer.from('Duca'));
    let found = false;
    for (let i = duca; i + 8 <= res.buf.length; i++) {
      if (res.buf.readUInt16LE(i) === 0xc003) {
        const opt = res.buf.readUInt32LE(i + 8 + 8);
        assert.ok((opt & 0x80000000) !== 0, 'CHANNEL_OPTION_INITIALIZED debe estar activo');
        found = true;
        break;
      }
    }
    assert.equal(found, true);
  });
});
