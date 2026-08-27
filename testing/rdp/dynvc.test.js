'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseMcsSendData } = require('../../src/main/services/rdp-autodetect');
const {
  parseDvcPdu,
  buildDvcCreateResponse,
  handleDvcRequest,
  STATUS_SUCCESS,
  STATUS_NOT_SUPPORTED
} = require('../../src/main/services/rdp-dynvc');

describe('rdp-dynvc', () => {
  it('responde instantáneamente a AUDIO_PLAYBACK_DVC (gap-6994ms)', () => {
    const p = path.join(__dirname, 'frames/gap-6994ms-from-f122-43b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const mcs = parseMcsSendData(raw);
    assert.ok(mcs);
    assert.equal(mcs.channelId, 1001);

    const dvc = parseDvcPdu(mcs.userData);
    assert.ok(dvc);
    assert.equal(dvc.type, 'create-req');
    assert.equal(dvc.channelId, 0x12);
    assert.equal(dvc.channelName, 'AUDIO_PLAYBACK_DVC');

    const res = handleDvcRequest(mcs.channelId, 1002, mcs.userData);
    assert.ok(res.handled);
    assert.equal(res.replies.length, 1);
    assert.ok(res.note.includes('AUDIO_PLAYBACK_DVC'));

    // Verificar estructura del paquete de respuesta generado
    const reply = res.replies[0];
    const replyMcs = parseMcsSendData(reply);
    assert.ok(replyMcs);
    assert.equal(replyMcs.channelId, 1001);
    assert.equal(replyMcs.initiator, 1002);

    // CHANNEL_PDU length
    assert.equal(replyMcs.userData.readUInt32LE(0), 6); // 1 header + 1 id + 4 status
    // DVC header byte (0x20 = DVC_CREATE_RSP, cbId=0)
    assert.equal(replyMcs.userData[8], 0x20);
    assert.equal(replyMcs.userData[9], 0x12); // ChannelId 0x12
    assert.equal(replyMcs.userData.readUInt32LE(10), STATUS_NOT_SUPPORTED);
  });

  it('responde a Microsoft::Windows::RDS::Input (gap-2131ms)', () => {
    const p = path.join(__dirname, 'frames/gap-2131ms-from-f123-55b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const mcs = parseMcsSendData(raw);
    assert.ok(mcs);

    const dvc = parseDvcPdu(mcs.userData);
    assert.ok(dvc);
    assert.equal(dvc.channelName, 'Microsoft::Windows::RDS::Input');

    const res = handleDvcRequest(mcs.channelId, 1002, mcs.userData);
    assert.ok(res.handled);
    assert.equal(res.replies.length, 1);
  });

  it('responde a RDCamera_Device_Enumerator (gap-7876ms)', () => {
    const p = path.join(__dirname, 'frames/gap-7876ms-from-f124-51b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const mcs = parseMcsSendData(raw);
    assert.ok(mcs);

    const dvc = parseDvcPdu(mcs.userData);
    assert.ok(dvc);
    assert.equal(dvc.channelName, 'RDCamera_Device_Enumerator');

    const res = handleDvcRequest(mcs.channelId, 1002, mcs.userData);
    assert.ok(res.handled);
    assert.equal(res.replies.length, 1);
  });

  it('responde a Microsoft::Windows::RDS::DisplayControl (gap-2136ms)', () => {
    const p = path.join(__dirname, 'frames/gap-2136ms-from-f125-64b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const mcs = parseMcsSendData(raw);
    assert.ok(mcs);

    const dvc = parseDvcPdu(mcs.userData);
    assert.ok(dvc);
    assert.equal(dvc.channelName, 'Microsoft::Windows::RDS::DisplayControl');

    const res = handleDvcRequest(mcs.channelId, 1002, mcs.userData);
    assert.ok(res.handled);
    assert.equal(res.replies.length, 1);
  });

  it('responde a DVC Capabilities Request con estructura correcta', () => {
    // DVC Caps Request V3: Cmd=0x05, Sp=0x01 (0x54), pad8=0x00, Version=0x0003, MaxDataSize, Flags
    const dvcPayload = Buffer.from('54000300333311113d0aa704', 'hex');
    const channelPdu = Buffer.alloc(8 + dvcPayload.length);
    channelPdu.writeUInt32LE(dvcPayload.length, 0);
    channelPdu.writeUInt32LE(0x03, 4);
    dvcPayload.copy(channelPdu, 8);

    const parsed = parseDvcPdu(channelPdu);
    assert.ok(parsed);
    assert.equal(parsed.type, 'caps-req');
    assert.equal(parsed.version, 3);
    assert.equal(parsed.sp, 1);

    const res = handleDvcRequest(1003, 1002, channelPdu);
    assert.ok(res.handled);
    assert.equal(res.replies.length, 1);

    const replyMcs = parseMcsSendData(res.replies[0]);
    assert.ok(replyMcs);
    assert.equal(replyMcs.userData.readUInt32LE(0), 12); // V3 len = 12
    assert.equal(replyMcs.userData[8], 0x54); // Cmd = 0x05, Sp = 1
    assert.equal(replyMcs.userData[9], 0x00); // pad8 = 0
    assert.equal(replyMcs.userData.readUInt16LE(10), 3); // Version = 3
    assert.equal(replyMcs.userData.readUInt32LE(12), 0x11113333);
  });

  it('acepta ECHO DVC y responde a ping Echo (MS-RDPEECO)', () => {
    // 1. Create REQ for "ECHO"
    const nameBuf = Buffer.from('ECHO\0', 'ascii');
    const createReq = Buffer.concat([Buffer.from([0x10, 0x08]), nameBuf]); // Cmd=1, cbId=0, chId=8, "ECHO\0"
    const cpdu = Buffer.alloc(8 + createReq.length);
    cpdu.writeUInt32LE(createReq.length, 0);
    cpdu.writeUInt32LE(0x03, 4);
    createReq.copy(cpdu, 8);

    const resCreate = handleDvcRequest(1003, 1002, cpdu);
    assert.ok(resCreate.handled);
    assert.equal(resCreate.replies.length, 1);
    assert.ok(resCreate.note.includes('dvc-accept'));

    // 2. Data Ping on channel 8
    const pingData = Buffer.from('HEARTBEAT_TEST_123', 'ascii');
    const dataReq = Buffer.concat([Buffer.from([0x40, 0x08]), pingData]); // Cmd=4, cbId=0, chId=8
    const cpduData = Buffer.alloc(8 + dataReq.length);
    cpduData.writeUInt32LE(dataReq.length, 0);
    cpduData.writeUInt32LE(0x03, 4);
    dataReq.copy(cpduData, 8);

    const resData = handleDvcRequest(1003, 1002, cpduData);
    assert.ok(resData.handled);
    assert.equal(resData.replies.length, 1);
    assert.ok(resData.note.includes('dvc-echo-reply'));

    const replyMcs = parseMcsSendData(resData.replies[0]);
    assert.ok(replyMcs);
    assert.equal(replyMcs.userData[8], 0x40); // Cmd=4, cbId=0
    assert.equal(replyMcs.userData[9], 0x08); // chId=8
    assert.equal(replyMcs.userData.subarray(10).toString('ascii'), 'HEARTBEAT_TEST_123');
  });
});

