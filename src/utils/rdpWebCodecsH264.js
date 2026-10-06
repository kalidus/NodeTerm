/**
 * Decodificador H.264 AVC420 vía WebCodecs para frames EGFX passthrough.
 * Los NAL units llegan en formato AVC (prefijo longitud BE 4 bytes), no Annex B.
 *
 * Apagado por defecto. Activar con localStorage NODETERM_RDP_WEBCODECS=1
 * (o window.__NODETERM_RDP_WEBCODECS__ = true).
 */

'use strict';

function isWebCodecsH264Available() {
  return typeof VideoDecoder === 'function' && typeof EncodedVideoChunk === 'function';
}

function isWebCodecsH264Enabled() {
  if (typeof window === 'undefined') return false;
  if (window.__NODETERM_RDP_WEBCODECS__ === true) return true;
  if (window.__NODETERM_RDP_WEBCODECS__ === false) return false;
  try {
    return window.localStorage?.getItem('NODETERM_RDP_WEBCODECS') === '1';
  } catch (_) {
    return false;
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

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ onError?: (err: Error) => void }} [opts]
 */
function createRdpWebCodecsDecoder(canvas, opts = {}) {
  if (!isWebCodecsH264Available()) {
    throw new Error('WebCodecs VideoDecoder no disponible en este Chromium');
  }

  const ctx = canvas.getContext('2d');
  let decoder = null;
  let timestampUs = 0;
  let configured = false;
  let lastError = null;

  const configure = () => {
    if (decoder) {
      try { decoder.close(); } catch (_) { /* noop */ }
    }
    decoder = new VideoDecoder({
      output: (frame) => {
        try {
          ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
        } finally {
          frame.close();
        }
      },
      error: (err) => {
        lastError = err;
        if (typeof opts.onError === 'function') opts.onError(err);
      }
    });
    decoder.configure({
      codec: 'avc1.42E01E',
      optimizeForLatency: true
    });
    configured = true;
  };

  configure();

  return {
    /**
     * @param {Uint8Array} avcData
     * @param {number} _surfaceId
     * @param {number} _left
     * @param {number} _top
     * @param {number} _right
     * @param {number} _bottom
     */
    push(avcData, _surfaceId, _left, _top, _right, _bottom) {
      if (!configured || !decoder || decoder.state === 'closed') configure();
      const annexB = avcToAnnexB(avcData);
      if (!annexB.length) return;
      timestampUs += 33333;
      try {
        decoder.decode(new EncodedVideoChunk({
          type: 'key',
          timestamp: timestampUs,
          data: annexB
        }));
      } catch (err) {
        lastError = err;
        if (typeof opts.onError === 'function') opts.onError(err);
      }
    },
    reset() {
      configured = false;
      configure();
    },
    close() {
      configured = false;
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
  createRdpWebCodecsDecoder
};
