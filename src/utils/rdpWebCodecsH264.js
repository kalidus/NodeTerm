/**
 * Decodificador H.264 AVC420 vía WebCodecs para frames EGFX.
 * Los NAL units llegan en formato AVC (prefijo longitud BE 4 bytes), no Annex B.
 *
 * Activo cuando VideoDecoder existe. Apagar con localStorage NODETERM_RDP_WEBCODECS=0
 * (o window.__NODETERM_RDP_WEBCODECS__ = false).
 *
 * Los píxeles no se pintan en el canvas. Se devuelven al framebuffer EGFX
 * (applyRgba) para que Progressive y el vídeo compartan la misma imagen.
 */

'use strict';

function isWebCodecsH264Available() {
  return typeof VideoDecoder === 'function' && typeof EncodedVideoChunk === 'function';
}

function isWebCodecsH264Enabled() {
  if (typeof window === 'undefined') return true;
  if (window.__NODETERM_RDP_WEBCODECS__ === false) return false;
  if (window.__NODETERM_RDP_WEBCODECS__ === true) return true;
  try {
    return window.localStorage?.getItem('NODETERM_RDP_WEBCODECS') !== '0';
  } catch (_) {
    return true;
  }
}

/** Convierte AVC (length-prefixed) a Annex B (start codes). */
function avcToAnnexB(avcData) {
  const src = avcData instanceof Uint8Array ? avcData : new Uint8Array(avcData);
  const out = [];
  let i = 0;
  while (i + 4 <= src.length) {
    const naluLen = (src[i] << 24) | (src[i + 1] << 16) | (src[i + 2] << 8) | src[i + 3];
    i += 4;
    if (naluLen <= 0 || i + naluLen > src.length) break;
    out.push(0, 0, 0, 1);
    for (let j = 0; j < naluLen; j++) out.push(src[i + j]);
    i += naluLen;
  }
  return new Uint8Array(out);
}

function isAnnexB(src) {
  return src.length >= 4 && src[0] === 0 && src[1] === 0 && (src[2] === 1 || (src[2] === 0 && src[3] === 1));
}

/** NALs de un bitstream Annex B. El prefijo 00 00 00 01 no es una longitud. */
function annexBNals(src) {
  const marks = [];
  for (let i = 0; i + 3 < src.length; i++) {
    if (src[i] === 0 && src[i + 1] === 0 && src[i + 2] === 0 && src[i + 3] === 1) {
      marks.push({ sc: i, nal: i + 4 });
      i += 3;
    } else if (src[i] === 0 && src[i + 1] === 0 && src[i + 2] === 1) {
      marks.push({ sc: i, nal: i + 3 });
      i += 2;
    }
  }
  return marks.map((mark, index) => {
    const end = index + 1 < marks.length ? marks[index + 1].sc : src.length;
    return { nal: src.subarray(mark.nal, end), offset: mark.nal };
  });
}

function parseAvcNals(avcData) {
  const src = avcData instanceof Uint8Array ? avcData : new Uint8Array(avcData);
  const nals = [];
  let i = 0;
  while (i + 4 <= src.length) {
    const naluLen = (src[i] << 24) | (src[i + 1] << 16) | (src[i + 2] << 8) | src[i + 3];
    i += 4;
    if (naluLen <= 0 || i + naluLen > src.length) break;
    nals.push(src.subarray(i, i + naluLen));
    i += naluLen;
  }
  return nals;
}

/** avcC (ISO/IEC 14496-15). El SPS se copia tal cual; el nivel alto va solo en el codec string. */
function buildAvcC(sps, pps) {
  const ppsLen = pps ? pps.length : 0;
  const out = new Uint8Array(6 + 2 + sps.length + 1 + (pps ? 2 + ppsLen : 0));
  let o = 0;
  out[o++] = 1;
  out[o++] = sps[1];
  out[o++] = sps[2];
  out[o++] = sps[3];
  out[o++] = 0xFF;
  out[o++] = 0xE1;
  out[o++] = (sps.length >> 8) & 0xFF;
  out[o++] = sps.length & 0xFF;
  out.set(sps, o);
  o += sps.length;
  out[o++] = pps ? 1 : 0;
  if (pps) {
    out[o++] = (ppsLen >> 8) & 0xFF;
    out[o++] = ppsLen & 0xFF;
    out.set(pps, o);
  }
  return out;
}

/**
 * Un access unit con SPS es clave aunque el slice no sea IDR: Windows manda
 * así el escritorio, y configure() rechaza el primer decode si no es key.
 */
function inspectAvcAccessUnit(avcData) {
  const src = avcData instanceof Uint8Array ? avcData : new Uint8Array(avcData);
  const nals = isAnnexB(src) ? annexBNals(src).map((entry) => entry.nal) : parseAvcNals(src);
  let sps = null;
  let pps = null;
  let hasIdr = false;
  let hasSlice = false;
  for (const nal of nals) {
    if (!nal.length) continue;
    const nalType = nal[0] & 0x1f;
    if (nalType === 7 && !sps) sps = nal;
    else if (nalType === 8 && !pps) pps = nal;
    else if (nalType === 5) hasIdr = true;
    if (nalType === 1 || nalType === 5) hasSlice = true;
  }
  let codec = null;
  let description = null;
  if (sps && sps.length >= 4) {
    const level = Math.max(sps[3], 0x33);
    const hex = (n) => n.toString(16).toUpperCase().padStart(2, '0');
    codec = `avc1.${hex(sps[1])}${hex(sps[2])}${hex(level)}`;
    description = buildAvcC(sps, pps);
  }
  return { key: hasIdr || !!sps, hasSlice, codec, description };
}

/**
 * avc1.PPCCLL a partir del SPS. El nivel se sube al menos a 5.1: un escritorio
 * de más de 1080p no entra en el nivel 3.0 (avc1.42E01E) y el decoder no emite frames.
 */
function avcCodecString(avcData) {
  return inspectAvcAccessUnit(avcData).codec;
}

function patchAnnexBSpsLevel(avcData) {
  const src = avcData instanceof Uint8Array ? avcData : new Uint8Array(avcData);
  const out = new Uint8Array(src);
  for (const entry of annexBNals(out)) {
    const nal = entry.nal;
    if (nal.length >= 4 && (nal[0] & 0x1f) === 7 && nal[3] < 0x33) out[entry.offset + 3] = 0x33;
  }
  return out;
}

/** El nivel 4.0 del SPS de Windows no cabe en un escritorio de más de 1080p. */
function patchSpsLevel(avcData) {
  const src = avcData instanceof Uint8Array ? avcData : new Uint8Array(avcData);
  const out = new Uint8Array(src);
  let i = 0;
  while (i + 4 <= out.length) {
    const naluLen = (out[i] << 24) | (out[i + 1] << 16) | (out[i + 2] << 8) | out[i + 3];
    i += 4;
    if (naluLen < 4 || i + naluLen > out.length) break;
    if ((out[i] & 0x1f) === 7 && out[i + 3] < 0x33) out[i + 3] = 0x33;
    i += naluLen;
  }
  return out;
}

function avcChunkType(avcData) {
  const src = avcData instanceof Uint8Array ? avcData : new Uint8Array(avcData);
  let i = 0;
  let key = false;
  let hasSlice = false;
  while (i + 4 <= src.length) {
    const naluLen = (src[i] << 24) | (src[i + 1] << 16) | (src[i + 2] << 8) | src[i + 3];
    i += 4;
    if (naluLen <= 0 || i + naluLen > src.length) break;
    const nalType = src[i] & 0x1f;
    if (nalType === 5) key = true;
    if (nalType === 1 || nalType === 5) hasSlice = true;
    i += naluLen;
  }
  if (!hasSlice || key) return 'key';
  return 'delta';
}

/**
 * Copia un rectángulo exclusivo (right/bottom one-past) desde un framebuffer RGBA.
 * Devuelve null si el rectángulo queda vacío.
 */
function cropRgbaRect(src, frameWidth, frameHeight, left, top, right, bottom) {
  const l = Math.max(0, left | 0);
  const t = Math.max(0, top | 0);
  const r = Math.min(frameWidth | 0, right | 0);
  const b = Math.min(frameHeight | 0, bottom | 0);
  if (l >= r || t >= b) return null;
  const w = r - l;
  const h = b - t;
  const rgba = new Uint8Array(w * h * 4);
  const stride = (frameWidth | 0) * 4;
  for (let row = 0; row < h; row++) {
    const srcOff = (t + row) * stride + l * 4;
    rgba.set(src.subarray(srcOff, srcOff + w * 4), row * w * 4);
  }
  return { rgba, left: l, top: t, right: r, bottom: b };
}

function parseRegionRects(rects) {
  if (!rects || typeof rects.length !== 'number' || rects.length < 4) return [];
  const out = [];
  for (let i = 0; i + 3 < rects.length; i += 4) {
    out.push({
      left: rects[i] | 0,
      top: rects[i + 1] | 0,
      right: rects[i + 2] | 0,
      bottom: rects[i + 3] | 0
    });
  }
  return out;
}

/**
 * @param {{ applyRgba?: Function, onError?: (err: Error) => void }} [opts]
 */
function createRdpWebCodecsDecoder(opts = {}) {
  if (!isWebCodecsH264Available()) {
    throw new Error('WebCodecs VideoDecoder no disponible en este Chromium');
  }

  const applyRgba = typeof opts.applyRgba === 'function' ? opts.applyRgba : null;
  let decoder = null;
  let timestampUs = 0;
  let configured = false;
  let needsKey = true;
  let activeCodec = '';
  let acceleration = 'prefer-hardware';
  let lastError = null;
  /** @type {Map<number, object>} */
  const pending = new Map();
  /** @type {object[]} */
  const order = [];

  let reported = false;
  let reportedFirst = false;
  let reportedPaint = false;
  const fail = (err) => {
    lastError = err;
    if (!reported) {
      reported = true;
      console.warn('[IronRDP WebCodecs]', err && err.message ? err.message : err);
    }
    if (typeof opts.onError === 'function') opts.onError(err);
  };

  const deliver = async (frame, meta) => {
    try {
      if (!applyRgba || !meta || meta.display === false) return;
      const frameW = frame.displayWidth || frame.codedWidth;
      const frameH = frame.displayHeight || frame.codedHeight;
      if (!frameW || !frameH) return;
      if (!reportedPaint) {
        reportedPaint = true;
        console.warn('[IronRDP WebCodecs] pinta', frameW, frameH);
      }
      let rgba;
      try {
        rgba = new Uint8Array(frameW * frameH * 4);
        await frame.copyTo(rgba, {
          format: 'RGBA',
          layout: [{ offset: 0, stride: frameW * 4 }]
        });
      } catch (_) {
        const scratch = new OffscreenCanvas(frameW, frameH);
        const ctx = scratch.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(frame, 0, 0);
        rgba = new Uint8Array(ctx.getImageData(0, 0, frameW, frameH).data);
      }
      const regions = parseRegionRects(meta.rects);
      const paintCrop = (crop, destLeft, destTop) => {
        applyRgba(
          meta.epoch,
          meta.surfaceId,
          destLeft,
          destTop,
          destLeft + (crop.right - crop.left),
          destTop + (crop.bottom - crop.top),
          crop.rgba
        );
      };
      if (!regions.length) {
        const destW = Math.max(0, (meta.right | 0) - (meta.left | 0));
        const destH = Math.max(0, (meta.bottom | 0) - (meta.top | 0));
        const crop = cropRgbaRect(rgba, frameW, frameH, 0, 0, Math.min(destW, frameW), Math.min(destH, frameH));
        if (!crop) return;
        paintCrop(crop, meta.left | 0, meta.top | 0);
        return;
      }
      for (const region of regions) {
        const direct = cropRgbaRect(rgba, frameW, frameH, region.left, region.top, region.right, region.bottom);
        if (direct) {
          paintCrop(direct, direct.left, direct.top);
          continue;
        }
        const rw = Math.max(0, (region.right | 0) - (region.left | 0));
        const rh = Math.max(0, (region.bottom | 0) - (region.top | 0));
        const local = cropRgbaRect(rgba, frameW, frameH, 0, 0, Math.min(rw, frameW), Math.min(rh, frameH));
        if (local) paintCrop(local, region.left | 0, region.top | 0);
      }
    } catch (err) {
      fail(err instanceof Error ? err : new Error(String(err)));
    } finally {
      try { frame.close(); } catch (_) { /* noop */ }
    }
  };

  const configure = (codec) => {
    if (decoder) {
      try { decoder.close(); } catch (_) { /* noop */ }
    }
    pending.clear();
    order.length = 0;
    decoder = new VideoDecoder({
      output: (frame) => {
        let meta = pending.get(frame.timestamp);
        if (meta) {
          pending.delete(frame.timestamp);
          const index = order.indexOf(meta);
          if (index >= 0) order.splice(index, 1);
        } else {
          meta = order.shift() || null;
        }
        deliver(frame, meta);
      },
      error: (err) => {
        configured = false;
        needsKey = true;
        if (acceleration === 'prefer-hardware') acceleration = 'prefer-software';
        fail(err);
      }
    });
    decoder.configure({
      codec,
      optimizeForLatency: true,
      hardwareAcceleration: acceleration
    });
    activeCodec = codec;
    configured = true;
    needsKey = true;
  };

  return {
    /**
     * @param {Uint8Array} avcData
     * @param {number} surfaceId
     * @param {number} left
     * @param {number} top
     * @param {number} right
     * @param {number} bottom
     * @param {Uint16Array|ArrayLike<number>|null} rects
     * @param {number} epoch
     * @param {boolean} [display] false = access unit de croma: se decodifica y no se pinta
     */
    push(avcData, surfaceId, left, top, right, bottom, rects, epoch, display) {
      const raw = avcData instanceof Uint8Array ? avcData : new Uint8Array(avcData);
      const annex = isAnnexB(raw);
      const src = annex ? patchAnnexBSpsLevel(raw) : patchSpsLevel(raw);
      const unit = inspectAvcAccessUnit(src);
      if (!reportedFirst) {
        reportedFirst = true;
        const hex = Array.from(raw.subarray(0, 16)).map((b) => b.toString(16).padStart(2, '0')).join('');
        console.warn('[IronRDP WebCodecs] primer AU', raw.length, hex, unit.codec || 'sin-sps', unit.key ? 'key' : 'delta');
      }
      if (unit.codec && (!configured || !decoder || decoder.state !== 'configured' || unit.codec !== activeCodec)) {
        try {
          configure(unit.codec);
        } catch (err) {
          configured = false;
          needsKey = true;
          fail(err instanceof Error ? err : new Error(String(err)));
          return;
        }
      }
      if (!configured || !decoder || decoder.state !== 'configured') return;
      if (needsKey && !unit.key) return;
      const annexB = annex ? src : avcToAnnexB(src);
      if (!annexB.length) return;
      timestampUs += 33333;
      const meta = {
        epoch: epoch | 0,
        surfaceId: surfaceId | 0,
        left: left | 0,
        top: top | 0,
        right: right | 0,
        bottom: bottom | 0,
        rects,
        display: display !== false
      };
      pending.set(timestampUs, meta);
      order.push(meta);
      try {
        decoder.decode(new EncodedVideoChunk({
          type: unit.key ? 'key' : 'delta',
          timestamp: timestampUs,
          data: annexB
        }));
        if (unit.key) needsKey = false;
      } catch (err) {
        pending.delete(timestampUs);
        const index = order.indexOf(meta);
        if (index >= 0) order.splice(index, 1);
        configured = false;
        needsKey = true;
        fail(err instanceof Error ? err : new Error(String(err)));
      }
    },
    reset() {
      configured = false;
      needsKey = true;
      activeCodec = '';
      pending.clear();
      order.length = 0;
      if (decoder) {
        try { decoder.close(); } catch (_) { /* noop */ }
        decoder = null;
      }
    },
    close() {
      configured = false;
      pending.clear();
      if (decoder) {
        try { decoder.close(); } catch (_) { /* noop */ }
        decoder = null;
      }
    },
    get lastError() {
      return lastError;
    }
  };
}

module.exports = {
  isWebCodecsH264Available,
  isWebCodecsH264Enabled,
  avcToAnnexB,
  avcCodecString,
  avcChunkType,
  inspectAvcAccessUnit,
  buildAvcC,
  cropRgbaRect,
  parseRegionRects,
  createRdpWebCodecsDecoder
};
