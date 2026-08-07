'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  parseServerNetworkChannels,
  readSendDataIndicationChannelId,
  readChannelJoinConfirmId,
  createChannelFilterState,
  filterServerFrame
} = require('../../src/main/services/rdp-channel-filter');

describe('parseServerNetworkChannels', () => {
  it('lee SC_NET de from-01-105b (io=1003, vc=1004)', () => {
    const p = path.join(__dirname, 'frames/from-01-105b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const parsed = parseServerNetworkChannels(raw);
    assert.ok(parsed);
    assert.equal(parsed.ioChannelId, 1003);
    assert.deepEqual(parsed.channelIds, [1004]);
  });
});

describe('readSendDataIndicationChannelId', () => {
  it('lee canal 1003 / 1004 de dumps Wallix', () => {
    const io = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-09-36b.hex'), 'utf8').trim(), 'hex');
    assert.equal(readSendDataIndicationChannelId(io), 1003);
    const dvc = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-18-66b.hex'), 'utf8').trim(), 'hex');
    assert.equal(readSendDataIndicationChannelId(dvc), 1004);
  });
});

describe('readChannelJoinConfirmId', () => {
  it('detecta join de 1001 (message channel)', () => {
    const p = path.join(__dirname, 'frames/from-05-15b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    assert.equal(readChannelJoinConfirmId(raw), 1001);
  });
});

describe('filterServerFrame', () => {
  it('deja pasar IO y drdynvc; dropea 1001 tras aprender SC_NET', () => {
    const state = createChannelFilterState();
    const scNet = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-01-105b.hex'), 'utf8').trim(), 'hex');
    assert.equal(filterServerFrame(state, scNet), scNet);
    assert.equal(state.ready, true);
    assert.ok(state.allowed.has(1003));
    assert.ok(state.allowed.has(1004));
    assert.equal(state.allowed.has(1001), false);

    // from-18-22b: 8B IO con SEC_FLAGSHI — IronRDP ShareControl pide 10B; dropear.
    const shortIo = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-18-22b.hex'), 'utf8').trim(), 'hex');
    assert.equal(filterServerFrame(state, shortIo), null);

    const ioOk = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-09-36b.hex'), 'utf8').trim(), 'hex');
    assert.equal(filterServerFrame(state, ioOk), ioOk);

    const dvc = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-18-66b.hex'), 'utf8').trim(), 'hex');
    assert.equal(filterServerFrame(state, dvc), dvc);

    // Fabricar SendDataIndication a canal 1001
    const bad = Buffer.from('0300001602f08068000003e97008008041000000e903', 'hex');
    assert.equal(readSendDataIndicationChannelId(bad), 1001);
    assert.equal(filterServerFrame(state, bad), null);
    assert.equal(state.droppedCount, 2); // short-io + ch1001
    assert.equal(state.droppedByChannel[1001], 1);
    assert.equal(state.droppedByChannel[1003], 1);
  });

  it('no toca Fast-Path', () => {
    const state = createChannelFilterState();
    const fp = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-14-581b.hex'), 'utf8').trim(), 'hex');
    assert.equal(filterServerFrame(state, fp), fp);
  });
});
