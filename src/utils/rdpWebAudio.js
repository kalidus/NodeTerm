/**
 * Reproductor PCM para RDPSND (MS-RDPEA) vía Web Audio API.
 * Cola soft/hard: reprograma si crece; solo tira bloques en desfase extremo.
 */

const DEFAULT_MAX_QUEUE_SEC = 0.55;
const DEFAULT_HARD_DROP_SEC = 0.9;
const DEFAULT_PLAYAHEAD_SEC = 0.05;

/**
 * @param {{ maxQueueSec?: number, hardDropSec?: number, playaheadSec?: number }} [options]
 * @returns {{
 *   playPcm: (pcm: Uint8Array, sampleRate: number, channels: number, bitsPerSample: number) => void,
 *   resume: () => Promise<void>,
 *   setGain: (gain: number) => void,
 *   close: () => void,
 *   getState: () => string,
 * }}
 */
export function createRdpWebAudioPlayer(options = {}) {
  const maxQueueSec = Number(options.maxQueueSec) > 0 ? Number(options.maxQueueSec) : DEFAULT_MAX_QUEUE_SEC;
  const hardDropSec = Number(options.hardDropSec) > 0
    ? Math.max(Number(options.hardDropSec), maxQueueSec)
    : Math.max(DEFAULT_HARD_DROP_SEC, maxQueueSec);
  const playaheadSec = Number(options.playaheadSec) >= 0 ? Number(options.playaheadSec) : DEFAULT_PLAYAHEAD_SEC;
  /** @type {AudioContext | null} */
  let ctx = null;
  /** @type {GainNode | null} */
  let gainNode = null;
  let nextStart = 0;
  let closed = false;

  function ensureContext() {
    if (closed) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      // playback: más estable bajo carga GPU que interactive.
      try {
        ctx = new AC({ latencyHint: 'playback' });
      } catch (_) {
        ctx = new AC();
      }
      gainNode = ctx.createGain();
      gainNode.gain.value = 1;
      gainNode.connect(ctx.destination);
      nextStart = ctx.currentTime;
    }
    return ctx;
  }

  async function resume() {
    const audioCtx = ensureContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch (_) {
        /* autoplay policy */
      }
    }
  }

  /**
   * @param {Uint8Array} pcm
   * @param {number} sampleRate
   * @param {number} channels
   * @param {number} bitsPerSample
   */
  function playPcm(pcm, sampleRate, channels, bitsPerSample) {
    if (closed || !pcm || pcm.length === 0) return;
    const audioCtx = ensureContext();
    if (!audioCtx || !gainNode) return;

    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }

    const rate = sampleRate > 0 ? sampleRate : 44100;
    const ch = channels > 0 ? channels : 2;
    const bits = bitsPerSample === 8 ? 8 : 16;
    const bytesPerSample = bits / 8;
    const frameCount = Math.floor(pcm.length / (bytesPerSample * ch));
    if (frameCount <= 0) return;

    const now = audioCtx.currentTime;
    const earliest = now + playaheadSec;
    if (nextStart < earliest) nextStart = earliest;

    const queued = nextStart - now;
    if (queued > hardDropSec) {
      // Desfase extremo: tirar este bloque y reanudar cerca de ahora.
      nextStart = earliest;
      return;
    }
    if (queued > maxQueueSec) {
      // Soft: acortar cola pero seguir reproduciendo (evita entrecortes).
      nextStart = earliest;
    }

    const buffer = audioCtx.createBuffer(ch, frameCount, rate);
    if (bits === 16) {
      const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
      for (let c = 0; c < ch; c += 1) {
        const dest = buffer.getChannelData(c);
        for (let i = 0; i < frameCount; i += 1) {
          const sample = view.getInt16((i * ch + c) * 2, true);
          dest[i] = sample / 32768;
        }
      }
    } else {
      for (let c = 0; c < ch; c += 1) {
        const dest = buffer.getChannelData(c);
        for (let i = 0; i < frameCount; i += 1) {
          dest[i] = (pcm[i * ch + c] - 128) / 128;
        }
      }
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    source.start(nextStart);
    nextStart += buffer.duration;
  }

  function setGain(gain) {
    if (!gainNode) return;
    const g = Number(gain);
    if (!Number.isFinite(g)) return;
    gainNode.gain.value = Math.max(0, Math.min(1, g));
  }

  function close() {
    closed = true;
    if (ctx) {
      try {
        void ctx.close();
      } catch (_) {
        /* ignore */
      }
    }
    ctx = null;
    gainNode = null;
    nextStart = 0;
  }

  function getState() {
    if (closed) return 'closed';
    if (!ctx) return 'idle';
    return ctx.state;
  }

  return { playPcm, resume, setGain, close, getState };
}
