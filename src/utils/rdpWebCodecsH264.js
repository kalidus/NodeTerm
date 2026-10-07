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

/** Caja par que cubre los rectángulos, recortada al frame. */
function unionAlignedBox(regions, frameW, frameH) {
  const maxW = frameW & ~1;
  const maxH = frameH & ~1;
  if (maxW <= 0 || maxH <= 0) return { left: 0, top: 0, right: frameW, bottom: frameH };
  let left = maxW;
  let top = maxH;
  let right = 0;
  let bottom = 0;
  for (const region of regions) {
    if (region.left < left) left = region.left;
    if (region.top < top) top = region.top;
    if (region.right > right) right = region.right;
    if (region.bottom > bottom) bottom = region.bottom;
  }
  left = Math.max(0, left & ~1);
  top = Math.max(0, top & ~1);
  right = Math.min(maxW, (right + 1) & ~1);
  bottom = Math.min(maxH, (bottom + 1) & ~1);
  if (left >= right || top >= bottom) return { left: 0, top: 0, right: maxW, bottom: maxH };
  return { left, top, right, bottom };
}

function planeAt(plane, stride, x, y) {
  if (!plane || x < 0 || y < 0 || x >= stride) return 0;
  const index = y * stride + x;
  if (index >= plane.length) return 0;
  return plane[index];
}

function cropHolds(crop, x, y, subsampled) {
  const ox = subsampled ? crop.originX >> 1 : crop.originX;
  const oy = subsampled ? crop.originY >> 1 : crop.originY;
  const w = subsampled ? crop.width >> 1 : crop.width;
  const h = subsampled ? crop.height >> 1 : crop.height;
  return x >= ox && y >= oy && x < ox + w && y < oy + h;
}

function readCrop(crop, plane, x, y, subsampled) {
  if (!cropHolds(crop, x, y, subsampled)) return null;
  const ox = subsampled ? crop.originX >> 1 : crop.originX;
  const oy = subsampled ? crop.originY >> 1 : crop.originY;
  const stride = subsampled ? crop.width >> 1 : crop.width;
  return planeAt(crop[plane], stride, x - ox, y - oy);
}

/**
 * Reconstruye U y V a resolución completa (AVC444v2, MS-RDPEGFX 3.3.8.3.3).
 * El frame principal aporta el croma par. El auxiliar guarda el impar:
 * la mitad izquierda de Y/U/V es U y la derecha es V.
 * `aux.spans` son esas dos franjas cuando no se ha leído el frame entero.
 */
function combineAvc444v2Chroma(main, aux, rect) {
  const left = rect.left | 0;
  const top = rect.top | 0;
  const width = (rect.right | 0) - left;
  const height = (rect.bottom | 0) - top;
  if (!main || !aux || width <= 0 || height <= 0) return null;
  const mainFrameW = main.frameWidth || main.width;
  const local = !aux.spans && aux.width !== mainFrameW;
  const frameW = local ? aux.width : (aux.frameWidth || aux.width);
  const ax = (x) => (local ? x - left : x);
  const ay = (y) => (local ? y - top : y);
  const mainOx = main.originX || 0;
  const mainOy = main.originY || 0;
  const mainCStride = main.width >> 1;
  const u444 = new Uint8Array(width * height);
  const v444 = new Uint8Array(width * height);

  const mainC = (plane, x, y) => planeAt(main[plane], mainCStride, x - (mainOx >> 1), y - (mainOy >> 1));
  const auxY = (x, y) => {
    if (aux.spans) {
      const hit = readCrop(aux.spans.u, 'y', x, y, false);
      if (hit !== null) return hit;
      const other = readCrop(aux.spans.v, 'y', x, y, false);
      return other === null ? 0 : other;
    }
    return planeAt(aux.y, aux.width, x - (aux.originX || 0), y - (aux.originY || 0));
  };
  const auxC = (plane, x, y) => {
    if (aux.spans) {
      const hit = readCrop(aux.spans.u, plane, x, y, true);
      if (hit !== null) return hit;
      const other = readCrop(aux.spans.v, plane, x, y, true);
      return other === null ? 0 : other;
    }
    const stride = aux.width >> 1;
    return planeAt(aux[plane], stride, x - ((aux.originX || 0) >> 1), y - ((aux.originY || 0) >> 1));
  };

  for (let y = 0; y < height; y++) {
    const sy = top + y;
    for (let x = 0; x < width; x++) {
      const sx = left + x;
      const index = y * width + x;
      u444[index] = mainC('u', sx >> 1, sy >> 1);
      v444[index] = mainC('v', sx >> 1, sy >> 1);
    }
  }

  const halfWidth = (width + 1) >> 1;
  for (let y = 0; y < height; y++) {
    const row = ay(top + y);
    for (let x = 0; x < halfWidth; x++) {
      const odd = (x << 1) + 1;
      if (odd >= width) break;
      const srcX = (ax(left) >> 1) + x;
      const index = y * width + odd;
      u444[index] = auxY(srcX, row);
      v444[index] = auxY(srcX + (frameW >> 1), row);
    }
  }

  const quarter = (width + 3) >> 2;
  const halfHeight = (height + 1) >> 1;
  const split = frameW >> 2;
  for (let y = 0; y < halfHeight; y++) {
    const sy = top + (y << 1) + 1;
    if (sy >= top + height) break;
    const row = ay(sy);
    const chromaY = row >> 1;
    const localY = sy - top;
    for (let x = 0; x < quarter; x++) {
      const srcX = (ax(left) >> 2) + x;
      const col0 = x << 2;
      const col2 = col0 + 2;
      if (col0 < width) {
        const index = localY * width + col0;
        u444[index] = auxC('u', srcX, chromaY);
        v444[index] = auxC('u', srcX + split, chromaY);
      }
      if (col2 < width) {
        const index = localY * width + col2;
        u444[index] = auxC('v', srcX, chromaY);
        v444[index] = auxC('v', srcX + split, chromaY);
      }
    }
  }

  return { u: u444, v: v444, width, height, left, top };
}

function undoChromaFilter(sample, right, below, diag) {
  const restored = (sample << 2) - (right + below + diag);
  if (Math.abs(restored - sample) < 30) return sample;
  if (restored < 0) return 0;
  if (restored > 255) return 255;
  return restored;
}

function yuv601FullToRgb(y, u, v) {
  const d = u - 128;
  const e = v - 128;
  const r = y + ((1436 * e + 512) >> 10);
  const g = y - ((352 * d + 731 * e + 512) >> 10);
  const b = y + ((1815 * d + 512) >> 10);
  return [
    r < 0 ? 0 : r > 255 ? 255 : r,
    g < 0 ? 0 : g > 255 ? 255 : g,
    b < 0 ? 0 : b > 255 ? 255 : b
  ];
}

function avc444RectToRgba(main, chroma) {
  if (!chroma) return null;
  const { u, v, width, height, left, top } = chroma;
  const rgba = new Uint8Array(width * height * 4);
  const ox = main.originX || 0;
  const oy = main.originY || 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let cu = u[y * width + x];
      let cv = v[y * width + x];
      if ((x & 1) === 0 && (y & 1) === 0 && x + 1 < width && y + 1 < height) {
        cu = undoChromaFilter(cu, u[y * width + x + 1], u[(y + 1) * width + x], u[(y + 1) * width + x + 1]);
        cv = undoChromaFilter(cv, v[y * width + x + 1], v[(y + 1) * width + x], v[(y + 1) * width + x + 1]);
      }
      const yv = planeAt(main.y, main.width, left + x - ox, top + y - oy);
      const rgb = yuv601FullToRgb(yv, cu, cv);
      const offset = (y * width + x) * 4;
      rgba[offset] = rgb[0];
      rgba[offset + 1] = rgb[1];
      rgba[offset + 2] = rgb[2];
      rgba[offset + 3] = 255;
    }
  }
  return rgba;
}

function paintTargets(meta, frameW, frameH) {
  const regions = parseRegionRects(meta.rects);
  const inside = regions.filter((region) => (
    region.left >= 0 && region.top >= 0 && region.right <= frameW && region.bottom <= frameH && region.left < region.right
  ));
  if (inside.length) return { regions: inside, originLeft: 0, originTop: 0 };
  const destW = Math.max(0, (meta.right | 0) - (meta.left | 0)) || frameW;
  const destH = Math.max(0, (meta.bottom | 0) - (meta.top | 0)) || frameH;
  const w = Math.min(destW, frameW);
  const h = Math.min(destH, frameH);
  if (w <= 0 || h <= 0) return null;
  return {
    regions: [{ left: 0, top: 0, right: w, bottom: h }],
    originLeft: meta.left | 0,
    originTop: meta.top | 0
  };
}

function chromaSpanBox(x, y, w, h, frameW, frameH) {
  const maxW = frameW & ~1;
  const maxH = frameH & ~1;
  const left = Math.max(0, x & ~1);
  const top = Math.max(0, y & ~1);
  const right = Math.min(maxW, (x + w + 1) & ~1);
  const bottom = Math.min(maxH, (y + h + 1) & ~1);
  if (left >= right || top >= bottom) return null;
  return { left, top, right, bottom };
}

/** Franjas del frame auxiliar donde AVC444v2 guarda el croma impar de `box`. */
function chromaSpansFor(box, frameW, frameH) {
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  const halfWidth = (width + 1) >> 1;
  const uX = box.left >> 1;
  return {
    u: chromaSpanBox(uX, box.top, halfWidth, height, frameW, frameH),
    v: chromaSpanBox((frameW >> 1) + uX, box.top, halfWidth, height, frameW, frameH)
  };
}

async function readRgbaRect(frame, box) {
  const w = box.right - box.left;
  const h = box.bottom - box.top;
  const rgba = new Uint8Array(w * h * 4);
  try {
    await frame.copyTo(rgba, {
      format: 'RGBA',
      rect: { x: box.left, y: box.top, width: w, height: h },
      layout: [{ offset: 0, stride: w * 4 }]
    });
    return rgba;
  } catch (_) {
    const scratch = new OffscreenCanvas(w, h);
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(frame, box.left, box.top, w, h, 0, 0, w, h);
    return new Uint8Array(ctx.getImageData(0, 0, w, h).data);
  }
}

function sliceI420Planes(src, box) {
  const w = box.right - box.left;
  const h = box.bottom - box.top;
  const cw = w >> 1;
  const ch = h >> 1;
  const y = new Uint8Array(w * h);
  const u = new Uint8Array(cw * ch);
  const v = new Uint8Array(cw * ch);
  const cStride = src.width >> 1;
  for (let row = 0; row < h; row++) {
    y.set(src.y.subarray((box.top + row) * src.width + box.left, (box.top + row) * src.width + box.left + w), row * w);
  }
  for (let row = 0; row < ch; row++) {
    const sy = (box.top >> 1) + row;
    const sx = box.left >> 1;
    u.set(src.u.subarray(sy * cStride + sx, sy * cStride + sx + cw), row * cw);
    v.set(src.v.subarray(sy * cStride + sx, sy * cStride + sx + cw), row * cw);
  }
  return { y, u, v, width: w, height: h, originX: box.left, originY: box.top };
}

async function copyI420(frame, box) {
  const w = box.right - box.left;
  const h = box.bottom - box.top;
  const cw = w >> 1;
  const ch = h >> 1;
  const ySize = w * h;
  const cSize = cw * ch;
  const buf = new Uint8Array(ySize + cSize * 2);
  await frame.copyTo(buf, {
    format: 'I420',
    rect: { x: box.left, y: box.top, width: w, height: h },
    layout: [
      { offset: 0, stride: w },
      { offset: ySize, stride: cw },
      { offset: ySize + cSize, stride: cw }
    ]
  });
  return {
    y: buf.subarray(0, ySize),
    u: buf.subarray(ySize, ySize + cSize),
    v: buf.subarray(ySize + cSize),
    width: w,
    height: h,
    originX: box.left,
    originY: box.top
  };
}

async function readI420Rect(frame, box) {
  try {
    return await copyI420(frame, box);
  } catch (err) {
    const frameW = (frame.displayWidth || frame.codedWidth) & ~1;
    const frameH = (frame.displayHeight || frame.codedHeight) & ~1;
    if (box.left === 0 && box.top === 0 && box.right === frameW && box.bottom === frameH) throw err;
    const full = await copyI420(frame, { left: 0, top: 0, right: frameW, bottom: frameH });
    return sliceI420Planes(full, box);
  }
}

/**
 * Suma al RGBA del navegador solo la diferencia entre el croma 4:2:0 y el 4:4:4.
 * El color de base sigue siendo el de la GPU.
 */
function sharpenRgba(base, boxW, region, box, main, mixed) {
  const rw = mixed.width;
  const rh = mixed.height;
  const out = new Uint8Array(rw * rh * 4);
  const ox = main.originX || 0;
  const oy = main.originY || 0;
  const cStride = main.width >> 1;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const sx = region.left + x;
      const sy = region.top + y;
      const yv = planeAt(main.y, main.width, sx - ox, sy - oy);
      const u420 = planeAt(main.u, cStride, (sx >> 1) - (ox >> 1), (sy >> 1) - (oy >> 1));
      const v420 = planeAt(main.v, cStride, (sx >> 1) - (ox >> 1), (sy >> 1) - (oy >> 1));
      let u444 = mixed.u[y * rw + x];
      let v444 = mixed.v[y * rw + x];
      if ((x & 1) === 0 && (y & 1) === 0 && x + 1 < rw && y + 1 < rh) {
        u444 = undoChromaFilter(u444, mixed.u[y * rw + x + 1], mixed.u[(y + 1) * rw + x], mixed.u[(y + 1) * rw + x + 1]);
        v444 = undoChromaFilter(v444, mixed.v[y * rw + x + 1], mixed.v[(y + 1) * rw + x], mixed.v[(y + 1) * rw + x + 1]);
      }
      const soft = yuv601FullToRgb(yv, u420, v420);
      const sharp = yuv601FullToRgb(yv, u444, v444);
      const bx = sx - box.left;
      const by = sy - box.top;
      const src = (by * boxW + bx) * 4;
      const dst = (y * rw + x) * 4;
      for (let c = 0; c < 3; c++) {
        const value = base[src + c] + (sharp[c] - soft[c]);
        out[dst + c] = value < 0 ? 0 : value > 255 ? 255 : value;
      }
      out[dst + 3] = 255;
    }
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
  const presentFrame = typeof opts.presentFrame === 'function' ? opts.presentFrame : null;
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
  /** @type {Map<number, object>} */
  const lumaBySurface = new Map();

  let reported = false;
  let reportedFirst = false;
  let reportedPaint = false;
  let reportedGpu = false;
  let deliverChain = Promise.resolve();
  const SETTLE_MS = 80;
  /**
   * Un frame de luma y uno de croma como máximo.
   * No se clona: clonar VideoFrame tumba el proceso GPU (exit 34).
   */
  const hold = {
    gen: 0,
    lumaFrame: null,
    chromaFrame: null,
    meta: null,
    chromaMeta: null,
    targets: null,
    box: null,
    frameW: 0,
    frameH: 0
  };
  let settleTimer = null;

  const closeQuiet = (frame) => {
    if (!frame) return;
    try { frame.close(); } catch (_) { /* noop */ }
  };

  const clearHold = () => {
    closeQuiet(hold.lumaFrame);
    closeQuiet(hold.chromaFrame);
    hold.lumaFrame = null;
    hold.chromaFrame = null;
    hold.meta = null;
    hold.chromaMeta = null;
    hold.targets = null;
    hold.box = null;
  };

  const fail = (err) => {
    lastError = err;
    const msg = err && err.message ? err.message : String(err);
    if (!reported) {
      reported = true;
      console.warn('[IronRDP WebCodecs]', msg);
    }
    if (typeof opts.onError === 'function') opts.onError(err);
  };

  const paintBox = (rgba, box, targets, meta) => {
    const bw = box.right - box.left;
    const bh = box.bottom - box.top;
    for (const region of targets.regions) {
      const crop = cropRgbaRect(
        rgba,
        bw,
        bh,
        region.left - box.left,
        region.top - box.top,
        region.right - box.left,
        region.bottom - box.top
      );
      if (!crop) continue;
      const destLeft = targets.originLeft + region.left;
      const destTop = targets.originTop + region.top;
      applyRgba(
        meta.epoch,
        meta.surfaceId,
        destLeft,
        destTop,
        destLeft + (crop.right - crop.left),
        destTop + (crop.bottom - crop.top),
        crop.rgba
      );
    }
  };

  const lumaCovers = (main, region) => {
    const ox = main.originX || 0;
    const oy = main.originY || 0;
    return region.left >= ox && region.top >= oy
      && region.right <= ox + main.width && region.bottom <= oy + main.height;
  };

  const readAux = async (frame, box, frameW, frameH) => {
    const evenW = frameW & ~1;
    const evenH = frameH & ~1;
    const full = box.left === 0 && box.top === 0 && box.right === evenW && box.bottom === evenH;
    if (full || (box.right - box.left) * (box.bottom - box.top) >= evenW * evenH) {
      const planes = await readI420Rect(frame, { left: 0, top: 0, right: evenW, bottom: evenH });
      return { ...planes, frameWidth: frameW, frameHeight: frameH };
    }
    const spans = chromaSpansFor(box, frameW, frameH);
    if (!spans.u || !spans.v) return null;
    const spanU = await readI420Rect(frame, spans.u);
    const spanV = await readI420Rect(frame, spans.v);
    return { frameWidth: frameW, frameHeight: frameH, width: frameW, spans: { u: spanU, v: spanV } };
  };

  const presentNow = (frame, targets) => {
    const regions = [];
    for (const region of targets.regions) {
      const sw = region.right - region.left;
      const sh = region.bottom - region.top;
      if (sw <= 0 || sh <= 0) continue;
      regions.push({
        sx: region.left,
        sy: region.top,
        sw,
        sh,
        dx: targets.originLeft + region.left,
        dy: targets.originTop + region.top
      });
    }
    if (!regions.length) return;
    presentFrame(frame, regions);
  };

  const settle = async (gen) => {
    if (gen !== hold.gen) return;
    const lumaFrame = hold.lumaFrame;
    const chromaFrame = hold.chromaFrame;
    const meta = hold.meta;
    const chromaMeta = hold.chromaMeta;
    const box = hold.box;
    const frameW = hold.frameW;
    const frameH = hold.frameH;
    hold.lumaFrame = null;
    hold.chromaFrame = null;
    if (!lumaFrame || !meta || !box) {
      closeQuiet(lumaFrame);
      closeQuiet(chromaFrame);
      return;
    }
    try {
      const planes = await readI420Rect(lumaFrame, box);
      if (gen !== hold.gen) return;
      const main = { ...planes, frameWidth: frameW, frameHeight: frameH };
      lumaBySurface.set(meta.surfaceId, main);
      if (!chromaFrame || !chromaMeta) return;
      const chromaTargets = paintTargets(chromaMeta, frameW, frameH);
      if (!chromaTargets) return;
      const cBox = unionAlignedBox(chromaTargets.regions, frameW, frameH);
      const aux = await readAux(chromaFrame, cBox, frameW, frameH);
      if (gen !== hold.gen || !aux) return;
      for (const region of chromaTargets.regions) {
        if (!lumaCovers(main, region)) continue;
        const mixed = combineAvc444v2Chroma(main, aux, region);
        const rgba = avc444RectToRgba(main, mixed);
        if (!rgba) continue;
        const destLeft = chromaTargets.originLeft + region.left;
        const destTop = chromaTargets.originTop + region.top;
        applyRgba(
          meta.epoch,
          meta.surfaceId,
          destLeft,
          destTop,
          destLeft + mixed.width,
          destTop + mixed.height,
          rgba
        );
      }
    } catch (_) {
      /* el siguiente key reabre el decoder si hace falta */
    } finally {
      closeQuiet(lumaFrame);
      closeQuiet(chromaFrame);
    }
  };

  const scheduleSettle = () => {
    if (settleTimer) clearTimeout(settleTimer);
    const gen = hold.gen;
    settleTimer = setTimeout(() => {
      settleTimer = null;
      settle(gen).catch((err) => fail(err instanceof Error ? err : new Error(String(err))));
    }, SETTLE_MS);
  };

  const deliver = async (frame, meta) => {
    let keepOpen = false;
    try {
      if (!applyRgba || !meta) return;
      const frameW = frame.displayWidth || frame.codedWidth;
      const frameH = frame.displayHeight || frame.codedHeight;
      if (!frameW || !frameH) return;
      const targets = paintTargets(meta, frameW, frameH);
      if (!targets) return;
      const box = unionAlignedBox(targets.regions, frameW, frameH);

      if (presentFrame) {
        if (meta.display !== false) {
          if (!reportedGpu) {
            reportedGpu = true;
            console.warn('[IronRDP WebCodecs] presenta en gpu', frameW, frameH);
          }
          presentNow(frame, targets);
          closeQuiet(hold.lumaFrame);
          closeQuiet(hold.chromaFrame);
          hold.gen += 1;
          hold.lumaFrame = frame;
          hold.chromaFrame = null;
          hold.meta = meta;
          hold.chromaMeta = null;
          hold.targets = targets;
          hold.box = box;
          hold.frameW = frameW;
          hold.frameH = frameH;
          keepOpen = true;
          scheduleSettle();
          return;
        }
        if (hold.lumaFrame) {
          closeQuiet(hold.chromaFrame);
          hold.chromaFrame = frame;
          hold.chromaMeta = meta;
          keepOpen = true;
          scheduleSettle();
        }
        return;
      }

      if (meta.display === false) {
        const main = lumaBySurface.get(meta.surfaceId);
        if (!main || main.frameWidth !== frameW || main.frameHeight !== frameH) return;
        let aux = null;
        try {
          aux = await readAux(frame, box, frameW, frameH);
        } catch (_) {
          aux = null;
        }
        if (!aux) return;
        for (const region of targets.regions) {
          if (!lumaCovers(main, region)) continue;
          const chroma = combineAvc444v2Chroma(main, aux, region);
          const rgba = avc444RectToRgba(main, chroma);
          if (!rgba) continue;
          const destLeft = targets.originLeft + region.left;
          const destTop = targets.originTop + region.top;
          applyRgba(
            meta.epoch,
            meta.surfaceId,
            destLeft,
            destTop,
            destLeft + chroma.width,
            destTop + chroma.height,
            rgba
          );
        }
        return;
      }

      let rgba;
      try {
        rgba = await readRgbaRect(frame, box);
      } catch (err) {
        fail(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      if (!reportedPaint) {
        reportedPaint = true;
        console.warn('[IronRDP WebCodecs] pinta', frameW, frameH, box.right - box.left, box.bottom - box.top);
      }
      paintBox(rgba, box, targets, meta);
      try {
        const planes = await readI420Rect(frame, box);
        lumaBySurface.set(meta.surfaceId, {
          ...planes,
          frameWidth: frameW,
          frameHeight: frameH
        });
      } catch (_) {
        lumaBySurface.delete(meta.surfaceId);
      }
    } catch (err) {
      fail(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!keepOpen) closeQuiet(frame);
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
        const run = deliverChain.then(() => deliver(frame, meta));
        deliverChain = run.catch(() => {});
      },
      error: (err) => {
        configured = false;
        needsKey = true;
        activeCodec = '';
        if (acceleration === 'prefer-hardware') acceleration = 'prefer-software';
        if (decoder) {
          try { decoder.close(); } catch (_) { /* noop */ }
          decoder = null;
        }
        clearHold();
        if (settleTimer) {
          clearTimeout(settleTimer);
          settleTimer = null;
        }
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
     * @param {boolean} [display] false = access unit de croma: se decodifica y se mezcla, no se pinta tal cual
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
      lumaBySurface.clear();
      deliverChain = Promise.resolve();
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = null;
      clearHold();
      if (decoder) {
        try { decoder.close(); } catch (_) { /* noop */ }
        decoder = null;
      }
    },
    close() {
      configured = false;
      pending.clear();
      lumaBySurface.clear();
      deliverChain = Promise.resolve();
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = null;
      clearHold();
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
  unionAlignedBox,
  chromaSpansFor,
  combineAvc444v2Chroma,
  createRdpWebCodecsDecoder
};
