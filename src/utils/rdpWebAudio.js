/**
 * Reproductor PCM para RDPSND (MS-RDPEA) vía Web Audio API.
 * El WASM entrega bloques PCM; aquí se encolan y reproducen con baja latencia.
 */

const DEFAULT_MAX_QUEUE_SEC = 1.5;

/**
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
      ctx = new AC();
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
        /* autoplay policy: caller may retry after user gesture */
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

    const now = audioCtx.currentTime;
    if (nextStart < now) nextStart = now;
    if (nextStart - now > maxQueueSec) {
      nextStart = now + 0.02;
    }
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
