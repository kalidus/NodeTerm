'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const vendorPkg = JSON.parse(
  fs.readFileSync(path.join(root, 'src/vendor/ironrdp/wasm/package.json'), 'utf8')
);
const patch = fs.readFileSync(
  path.join(root, 'src/vendor/ironrdp/patches/egfx-nodeterm.patch'),
  'utf8'
);

test('vendor WASM es egfx.52: CapsAdvertise V10.7 sin AVC_THINCLIENT', () => {
  assert.equal(vendorPkg.version, '0.7.0-nodeterm-egfx.52');
  assert.match(patch, /CapabilitySet::V10_7/);
  assert.match(patch, /CapabilitiesV107Flags::SMALL_CACHE/);
  assert.match(patch, /sin AVC_THINCLIENT|sin thin-client|sin AVC_THIN/);
  assert.doesNotMatch(
    patch,
    /CapabilitySet::V10_7 \{\s*flags: CapabilitiesV107Flags::SMALL_CACHE \| CapabilitiesV107Flags::AVC_THIN_CLIENT/
  );
  assert.doesNotMatch(patch, /should_pace_progressive/);
  assert.doesNotMatch(patch, /try_recv\(\)/);
  assert.match(patch, /coalesce_contiguous_rects/);
  assert.match(patch, /wts2:\{\},s2s:\{\},prog:\{\}/);
  assert.match(patch, /blit_count >= 24/);
  assert.match(patch, /const CHUNK: usize = 64 \* 1024/);
  assert.match(patch, /select!/);
  assert.doesNotMatch(patch, /select_biased!/);
  assert.doesNotMatch(patch, /carried_damage/);
  assert.match(patch, /pump_egfx/);
  assert.match(patch, /struct BitCursor/);
  assert.match(patch, /fn tiles_per_slice\(\) -> usize \{\r?\n\+        24/);
  assert.match(patch, /yield_to_browser/);
  assert.match(patch, /GRAPHICS_BUDGET_MS: f64 = 12\.0/);
  assert.match(patch, /avc420_only/);
  assert.doesNotMatch(patch, /set_superseded_absolute/);
  assert.doesNotMatch(patch, /PROGRESSIVE_TILES_PER_SLICE/);
  assert.doesNotMatch(patch, /graphics_updates >= 24/);
});

test('el estado grafico EGFX va por id de sesion', () => {
  assert.match(patch, /static GFX_SLOTS/);
  assert.match(patch, /fn set_avc420_webcodecs_callback\(session_id: u32/);
  assert.match(patch, /pub fn apply_egfx_rgba\(\r?\n\+\s*session_id: u32/);
  assert.match(patch, /fn acknowledge_egfx_presented\(session_id: u32/);
  assert.match(patch, /fn release_gfx_session\(session_id: u32/);
  assert.doesNotMatch(patch, /static AVC420_WEBCODECS_CALLBACK/);
  assert.doesNotMatch(patch, /static PENDING_AVC:/);
  assert.doesNotMatch(patch, /static AVC_WAKE:/);
  const tab = fs.readFileSync(path.join(root, 'src/components/IronRdpCanvasTab.jsx'), 'utf8');
  assert.match(tab, /applyEgfxRgba\(gfxSessionId,/);
  assert.match(tab, /acknowledgeEgfxPresented\(gfxSessionId,/);
  assert.match(tab, /builder\.extension\(gfxSession\(gfxSessionId\)\)/);
  assert.doesNotMatch(tab, /setAvc420WebcodecsCallback\(null\)/);
  assert.doesNotMatch(tab, /setEgfxResetCallback\(null\)/);
});
