'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const vendorPkg = JSON.parse(
  fs.readFileSync(path.join(root, 'third_party/ironrdp/wasm/package.json'), 'utf8')
);
const patch = fs.readFileSync(
  path.join(root, 'third_party/ironrdp/patches/egfx-nodeterm.patch'),
  'utf8'
);

test('vendor WASM es egfx.40: CapsAdvertise V10.7 sin AVC_THINCLIENT', () => {
  assert.equal(vendorPkg.version, '0.7.0-nodeterm-egfx.40');
  assert.match(patch, /CapabilitySet::V10_7/);
  assert.match(patch, /CapabilitiesV107Flags::SMALL_CACHE/);
  assert.match(patch, /sin AVC_THINCLIENT|sin thin-client|sin AVC_THIN/);
  assert.doesNotMatch(
    patch,
    /CapabilitySet::V10_7 \{\s*flags: CapabilitiesV107Flags::SMALL_CACHE \| CapabilitiesV107Flags::AVC_THIN_CLIENT/
  );
  assert.doesNotMatch(patch, /should_pace_progressive/);
  assert.doesNotMatch(patch, /try_recv\(\)/);
});
