'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  PROTOCOL_SSL,
  PROTOCOL_HYBRID,
  PROTOCOL_HYBRID_EX,
  parseX224ConnectionConfirm,
  readSelectedProtocol,
  resolveCredsspPolicy,
  protocolName
} = require('../../src/main/services/rdp-protocol-helpers');

function buildCc(selectedProtocol) {
  const buf = Buffer.from([
    0x03, 0x00, 0x00, 0x13,
    0x0e, 0xd0, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x02, 0x01, 0x08, 0x00,
    0x00, 0x00, 0x00, 0x00
  ]);
  buf.writeUInt32LE(selectedProtocol >>> 0, 15);
  return buf;
}

describe('parseX224ConnectionConfirm', () => {
  it('lee SSL 0x01 (Wallix)', () => {
    const cc = Buffer.from('030000130ed000000000000201080001000000', 'hex');
    const parsed = parseX224ConnectionConfirm(cc);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.selectedProtocol, PROTOCOL_SSL);
    assert.equal(protocolName(parsed.selectedProtocol), 'SSL(0x01)');
  });

  it('lee HYBRID 0x02', () => {
    const parsed = parseX224ConnectionConfirm(buildCc(PROTOCOL_HYBRID));
    assert.equal(parsed.selectedProtocol, PROTOCOL_HYBRID);
  });

  it('lee HYBRID_EX 0x08', () => {
    const parsed = parseX224ConnectionConfirm(buildCc(PROTOCOL_HYBRID_EX));
    assert.equal(parsed.selectedProtocol, PROTOCOL_HYBRID_EX);
  });

  it('no muta el buffer original', () => {
    const cc = buildCc(PROTOCOL_SSL);
    const before = Buffer.from(cc);
    readSelectedProtocol(cc);
    assert.deepEqual(cc, before);
  });
});

describe('resolveCredsspPolicy', () => {
  it('any sin preflight pide CredSSP (TLS tambien va on en WASM)', () => {
    assert.equal(resolveCredsspPolicy('any'), true);
    assert.equal(resolveCredsspPolicy(''), true);
  });

  it('any + selectedProtocol SSL desactiva CredSSP', () => {
    assert.equal(resolveCredsspPolicy('any', PROTOCOL_SSL), false);
  });

  it('any + selectedProtocol HYBRID activa CredSSP', () => {
    assert.equal(resolveCredsspPolicy('any', PROTOCOL_HYBRID), true);
    assert.equal(resolveCredsspPolicy('any', PROTOCOL_HYBRID_EX), true);
  });

  it('nla fuerza CredSSP aunque el servidor diga SSL', () => {
    assert.equal(resolveCredsspPolicy('nla', PROTOCOL_SSL), true);
  });

  it('tls/rdp desactivan CredSSP', () => {
    assert.equal(resolveCredsspPolicy('tls'), false);
    assert.equal(resolveCredsspPolicy('rdp'), false);
  });
});
