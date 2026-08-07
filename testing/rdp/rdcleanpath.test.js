'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const bridge = require('../../src/main/services/RdpNativeBridgeService');
const { PROTOCOL_SSL, readSelectedProtocol } = require('../../src/main/services/rdp-protocol-helpers');

describe('RDCleanPath response preserves X.224 CC', () => {
  it('no reescribe selectedProtocol 0x01 de Wallix', () => {
    const wallixCc = Buffer.from('030000130ed000000000000201080001000000', 'hex');
    assert.equal(readSelectedProtocol(wallixCc), PROTOCOL_SSL);

    const fakeCert = Buffer.from([0x30, 0x03, 0x02, 0x01, 0x01]);
    const pdu = bridge.createRdCleanPathResponsePdu('bastion-dsn.sec.dsn.inet', wallixCc, [fakeCert]);
    assert.equal(pdu[0], 0x30);

    const extracted = bridge.extractX224FromRdCleanPath(pdu);
    assert.ok(extracted, 'debe extraer X.224 del Response');
    assert.equal(readSelectedProtocol(extracted), PROTOCOL_SSL);
    assert.deepEqual(Buffer.from(extracted), wallixCc);
  });
});
