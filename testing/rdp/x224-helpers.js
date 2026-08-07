/**
 * Reexporta helpers de produccion + builder CR para probes.
 */
'use strict';

const helpers = require('../../src/main/services/rdp-protocol-helpers');

function buildX224ConnectionRequest(username, requestedProtocols) {
  let samUser = String(username || 'nodeterm');
  if (samUser.includes('\\')) samUser = samUser.split('\\')[1];
  const cookieStr = `Cookie: mstshash=${samUser}\r\n`;
  const cookieBytes = Buffer.from(cookieStr, 'utf8');
  const nego = Buffer.alloc(8);
  nego[0] = 0x01;
  nego[1] = 0x00;
  nego.writeUInt16LE(8, 2);
  nego.writeUInt32LE(requestedProtocols >>> 0, 4);

  const tpktLen = 11 + cookieBytes.length + nego.length;
  const header = Buffer.from([
    0x03, 0x00,
    (tpktLen >> 8) & 0xff, tpktLen & 0xff,
    tpktLen - 5, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);
  return Buffer.concat([header, cookieBytes, nego]);
}

module.exports = {
  ...helpers,
  buildX224ConnectionRequest
};
