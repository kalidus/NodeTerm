'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  locateCapabilities,
  describeCapabilities,
  formatCapabilities,
  patchConfirmActiveBitmapBpp
} = require('../../src/main/services/rdp-caps-helpers');

const RFX_GUID = Buffer.from('122f777672bd6344afb3b73c9c6f7886', 'hex');
const NSC_GUID = Buffer.from('b91b8dca0f004f15589fae2d1a87e2d6', 'hex');

function capSet(type, body) {
  const h = Buffer.alloc(4);
  h.writeUInt16LE(type, 0);
  h.writeUInt16LE(4 + body.length, 2);
  return Buffer.concat([h, body]);
}

function bitmapSet(bpp, w = 1280, h = 720) {
  const b = Buffer.alloc(24);
  b.writeUInt16LE(bpp, 0);
  b.writeUInt16LE(1, 2); b.writeUInt16LE(1, 4); b.writeUInt16LE(1, 6);
  b.writeUInt16LE(w, 8); b.writeUInt16LE(h, 10);
  return capSet(0x0002, b);
}

function surfaceSet(flags) {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(flags, 0);
  return capSet(0x001c, b);
}

function codecsSet(codecs) {
  const parts = [Buffer.from([codecs.length])];
  for (const c of codecs) {
    const props = c.props || Buffer.alloc(0);
    const e = Buffer.alloc(19);
    c.guid.copy(e, 0);
    e[16] = c.id;
    e.writeUInt16LE(props.length, 17);
    parts.push(e, props);
  }
  return capSet(0x001d, Buffer.concat(parts));
}

/** TPKT + X.224 data + MCS SendData (0x64 cliente / 0x68 servidor) + Share Control. */
function buildCapsPdu(kind, sets, { source = 'MSTSC' } = {}) {
  const src = Buffer.from(`${source}\0`, 'ascii');
  const capsBody = Buffer.concat(sets);
  const combined = 4 + capsBody.length; // numberCapabilities(2) + pad(2) + sets
  const fixed = kind === 'CONFIRM' ? 4 + 2 + 2 + 2 : 4 + 2 + 2; // shareId[+originator] + lenSrc + lenComb
  const shareHdr = Buffer.alloc(6);
  const totalLen = 6 + fixed + src.length + combined;
  shareHdr.writeUInt16LE(totalLen, 0);
  shareHdr.writeUInt16LE((kind === 'CONFIRM' ? 3 : 1) | 0x10, 2);
  shareHdr.writeUInt16LE(1002, 4);
  const mid = Buffer.alloc(fixed);
  let o = 0;
  mid.writeUInt32LE(0x103ea, o); o += 4;
  if (kind === 'CONFIRM') { mid.writeUInt16LE(0x03ea, o); o += 2; }
  mid.writeUInt16LE(src.length, o); o += 2;
  mid.writeUInt16LE(combined, o);
  const caps = Buffer.alloc(4);
  caps.writeUInt16LE(sets.length, 0);
  const ud = Buffer.concat([shareHdr, mid, src, caps, capsBody]);

  const per = ud.length < 0x80 ? Buffer.from([ud.length]) : Buffer.from([0x80 | (ud.length >> 8), ud.length & 0xff]);
  const mcs = Buffer.alloc(6);
  mcs[0] = kind === 'CONFIRM' ? 0x64 : 0x68;
  mcs.writeUInt16BE(1002, 1);
  mcs.writeUInt16BE(1003, 3);
  mcs[5] = 0x70;
  const x224 = Buffer.from([0x02, 0xf0, 0x80]);
  const body = Buffer.concat([x224, mcs, per, ud]);
  const tpkt = Buffer.from([0x03, 0x00, 0, 0]);
  tpkt.writeUInt16BE(4 + body.length, 2);
  return Buffer.concat([tpkt, body]);
}

describe('describeCapabilities', () => {
  it('Confirm Active del cliente: bpp, surface commands y codecs RemoteFX', () => {
    const pdu = buildCapsPdu('CONFIRM', [
      capSet(0x0001, Buffer.alloc(20)),
      bitmapSet(16),
      surfaceSet(0x52),
      codecsSet([{ guid: RFX_GUID, id: 3 }, { guid: NSC_GUID, id: 1, props: Buffer.from([1, 0, 0, 0]) }]),
      capSet(0x001b, Buffer.from([1, 0]))
    ]);
    const info = describeCapabilities(pdu);
    assert.equal(info.kind, 'CONFIRM');
    assert.equal(info.bpp, 16);
    assert.equal(info.desktop, '1280x720');
    assert.equal(info.surfaceCmds, 0x52);
    assert.equal(info.largePointer, true);
    assert.deepEqual(info.codecs, [{ name: 'RemoteFX', id: 3 }, { name: 'NSCodec', id: 1 }]);
    const line = formatCapabilities(info);
    assert.match(line, /caps cliente: bpp=16 .*codecs=\[RemoteFX#3,NSCodec#1\] surfaceCmds=0x52/);
  });

  it('Demand Active del servidor se reconoce como DEMAND y sin codecs', () => {
    const pdu = buildCapsPdu('DEMAND', [bitmapSet(32, 1920, 1080), capSet(0x0003, Buffer.alloc(8))], { source: 'RDP' });
    const info = describeCapabilities(pdu);
    assert.equal(info.kind, 'DEMAND');
    assert.equal(info.bpp, 32);
    assert.equal(info.surfaceCmds, null);
    assert.deepEqual(info.codecs, []);
    assert.match(formatCapabilities(info), /caps servidor: bpp=32 .*codecs=\[ninguno\] surfaceCmds=no/);
  });

  it('PDU 16bpp sin RemoteFX no rompe y devuelve null para tramas ajenas', () => {
    assert.equal(describeCapabilities(Buffer.from([0x00, 0x05, 0x01, 0x02, 0x03, 0x04])), null);
    assert.equal(describeCapabilities(null), null);
    assert.equal(describeCapabilities(Buffer.alloc(30, 0x03)), null);
  });

  it('truncado: nunca lanza y no inventa conjuntos', () => {
    const pdu = buildCapsPdu('CONFIRM', [bitmapSet(16), codecsSet([{ guid: RFX_GUID, id: 3 }])]);
    for (let n = 0; n < pdu.length; n++) {
      assert.doesNotThrow(() => describeCapabilities(pdu.subarray(0, n)));
    }
    assert.ok(locateCapabilities(pdu));
  });

  it('PER de 2 bytes (PDU grande)', () => {
    const big = capSet(0x0010, Buffer.alloc(300));
    const pdu = buildCapsPdu('CONFIRM', [big, bitmapSet(16)]);
    const info = describeCapabilities(pdu);
    assert.equal(info.bpp, 16);
  });
});

describe('patchConfirmActiveBitmapBpp (solo NODETERM_RDP_FORCE32)', () => {
  it('cambia solo el bpp del Bitmap Capability y no toca longitudes', () => {
    const pdu = buildCapsPdu('CONFIRM', [bitmapSet(16), surfaceSet(0x52)]);
    const r = patchConfirmActiveBitmapBpp(pdu, 32);
    assert.equal(r.patched, true);
    assert.equal(r.before, 16);
    assert.equal(r.buf.length, pdu.length);
    assert.equal(describeCapabilities(r.buf).bpp, 32);
    let diffs = 0;
    for (let i = 0; i < pdu.length; i++) if (pdu[i] !== r.buf[i]) diffs++;
    assert.equal(diffs, 1); // 16 -> 32 solo cambia el byte bajo
    assert.equal(describeCapabilities(pdu).bpp, 16); // original intacto
  });

  it('idempotente, e ignora Demand Active y tramas ajenas', () => {
    const pdu = buildCapsPdu('CONFIRM', [bitmapSet(32)]);
    assert.equal(patchConfirmActiveBitmapBpp(pdu, 32).patched, false);
    const demand = buildCapsPdu('DEMAND', [bitmapSet(16)]);
    assert.equal(patchConfirmActiveBitmapBpp(demand, 32).patched, false);
    assert.equal(patchConfirmActiveBitmapBpp(Buffer.alloc(10), 32).patched, false);
  });
});
