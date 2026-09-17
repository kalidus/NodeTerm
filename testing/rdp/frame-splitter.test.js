'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Importar o definir la clase RdpFrameSplitter
const { RdpFrameSplitter } = require('../../src/main/services/rdp-protocol-helpers');

describe('RdpFrameSplitter - Stateful TCP Segmentation & Anti-Corruption', () => {
  test('separa tramas TPKT y Fast-Path concatenadas en un mismo chunk', () => {
    const splitter = new RdpFrameSplitter();

    // TPKT de 16 bytes: 03 00 00 10 + 12 bytes
    const tpkt = Buffer.concat([Buffer.from([0x03, 0x00, 0x00, 0x10]), Buffer.alloc(12, 0x01)]);
    // FastPath de 10 bytes: 00 0a + 8 bytes
    const fp = Buffer.concat([Buffer.from([0x00, 0x0a]), Buffer.alloc(8, 0x02)]);

    const chunk = Buffer.concat([tpkt, fp]);
    const frames = splitter.push(chunk);

    assert.equal(frames.length, 2);
    assert.deepEqual(frames[0], tpkt);
    assert.deepEqual(frames[1], fp);
  });

  test('no corta ni trocea un frame grande de Fast-Path fragmentado entre varios paquetes TCP cuyos píxeles tienen bits en cero', () => {
    const splitter = new RdpFrameSplitter();

    // FastPath PDU de 5000 bytes:
    // Header de 3 bytes: 0x00 (action=0), 0x80 | (5000 >> 8) = 0x93, 5000 & 0xff = 0x88
    const fpHdr = Buffer.from([0x00, 0x80 | ((5000 >> 8) & 0x7f), 5000 & 0xff]);
    // Payload de 4997 bytes donde los primeros bytes de cada chunk fragmentado simulan píxeles con bits 0 (que antes engañaban a splitRdpFrames)
    const fpPayload = Buffer.alloc(4997, 0x55);
    // Poner a 0x00 los bytes que caerán al inicio del chunk 2 y chunk 3
    fpPayload[1460 - 3] = 0x00; // inicio de chunk 2
    fpPayload[1460 - 3 + 1] = 0x20; // longitud falsa
    fpPayload[2920 - 3] = 0x00; // inicio de chunk 3
    fpPayload[2920 - 3 + 1] = 0x30; // longitud falsa

    const fullFpPdu = Buffer.concat([fpHdr, fpPayload]);
    assert.equal(fullFpPdu.length, 5000);

    // Simular entrega TCP fragmentada: chunk1 (1460B), chunk2 (1460B), chunk3 (1460B), chunk4 (620B)
    const chunk1 = fullFpPdu.subarray(0, 1460);
    const chunk2 = fullFpPdu.subarray(1460, 2920);
    const chunk3 = fullFpPdu.subarray(2920, 4380);
    const chunk4 = fullFpPdu.subarray(4380, 5000);

    const f1 = splitter.push(chunk1);
    assert.equal(f1.length, 1);
    assert.equal(f1[0].length, 1460);
    assert.deepEqual(f1[0], chunk1);

    const f2 = splitter.push(chunk2);
    // ¡CRÍTICO!: No debe trocearse en sub-frames a pesar de que chunk2[0] === 0x00
    assert.equal(f2.length, 1);
    assert.equal(f2[0].length, 1460);
    assert.deepEqual(f2[0], chunk2);

    const f3 = splitter.push(chunk3);
    assert.equal(f3.length, 1);
    assert.equal(f3[0].length, 1460);
    assert.deepEqual(f3[0], chunk3);

    const f4 = splitter.push(chunk4);
    assert.equal(f4.length, 1);
    assert.equal(f4[0].length, 620);
    assert.deepEqual(f4[0], chunk4);

    // Si concatenamos los 4 chunks emitidos, reconstruyen exactamente el PDU original sin ninguna pérdida
    const reassembled = Buffer.concat([f1[0], f2[0], f3[0], f4[0]]);
    assert.equal(reassembled.length, 5000);
    assert.deepEqual(reassembled, fullFpPdu);
  });

  test('permite un frame nuevo inmediatamente después de completar un frame fragmentado en el mismo chunk', () => {
    const splitter = new RdpFrameSplitter();

    // FastPath de 1000 bytes
    const fp1Hdr = Buffer.from([0x00, 0x80 | ((1000 >> 8) & 0x7f), 1000 & 0xff]);
    const fp1 = Buffer.concat([fp1Hdr, Buffer.alloc(997, 0xaa)]);

    // Chunk 1 tiene los primeros 600 bytes
    const chunk1 = fp1.subarray(0, 600);
    // Chunk 2 tiene los 400 bytes restantes de fp1 MÁS un TPKT de 20 bytes nuevo
    const nextTpkt = Buffer.concat([Buffer.from([0x03, 0x00, 0x00, 0x14]), Buffer.alloc(16, 0xbb)]);
    const chunk2 = Buffer.concat([fp1.subarray(600, 1000), nextTpkt]);

    const f1 = splitter.push(chunk1);
    assert.equal(f1.length, 1);
    assert.equal(f1[0].length, 600);

    const f2 = splitter.push(chunk2);
    // f2 debe tener 2 elementos: los 400 bytes que completan fp1, y el nextTpkt de 20 bytes separado
    assert.equal(f2.length, 2);
    assert.equal(f2[0].length, 400);
    assert.deepEqual(f2[0], fp1.subarray(600, 1000));
    assert.equal(f2[1].length, 20);
    assert.deepEqual(f2[1], nextTpkt);
  });
});
