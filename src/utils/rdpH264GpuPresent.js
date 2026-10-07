/**
 * Pinta un VideoFrame de hardware sin drawImage directo.
 * En Windows ese blit importa la textura D3D11 del decodificador en el canvas
 * acelerado y el proceso GPU muere (exit 34). Aquí la GPU copia el frame a un
 * canvas propio y el canvas RDP solo recibe esa textura ya convertida.
 *
 * Ping-pong de 2 scratch: submit sin await del fence en el hot path; el blit
 * corre cuando GPU termina. Así el main thread no se bloquea (audio RDPSND).
 *
 * Tras llamar a present(frame), el caller no debe copyTo/drawImage/clone del
 * mismo VideoFrame: importExternalTexture ya lo usa. present() cierra el frame.
 */

'use strict';

const SHADER = `
struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VsOut {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, 1.0),
    vec2f(3.0, 1.0),
    vec2f(-1.0, -3.0)
  );
  var uv = array<vec2f, 3>(
    vec2f(0.0, 0.0),
    vec2f(2.0, 0.0),
    vec2f(0.0, 2.0)
  );
  return VsOut(vec4f(pos[vi], 0.0, 1.0), uv[vi]);
}

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var tex: texture_external;

@fragment
fn fs(in: VsOut) -> @location(0) vec4f {
  return textureSampleBaseClampToEdge(tex, samp, in.uv);
}
`;

function closeFrame(frame) {
  if (!frame) return;
  try { frame.close(); } catch (_) { /* noop */ }
}

function createH264GpuPresenter(opts) {
  const get2dContext = typeof opts?.get2dContext === 'function' ? opts.get2dContext : () => null;
  let gpu = null;
  let mode = 'init';
  let generation = 0;
  let initPromise = null;
  /** @type {{ canvas: OffscreenCanvas, ctx: GPUCanvasContext | null, busy: boolean }[]} */
  let slots = [];
  let latest = null;
  let reported = false;
  let copyBusy = false;

  const dropLatest = () => {
    if (!latest) return;
    closeFrame(latest.frame);
    if (typeof latest.resolve === 'function') latest.resolve();
    latest = null;
  };

  const blitRegions = (canvas, regions) => {
    const ctx = get2dContext();
    if (!ctx || !canvas) return;
    ctx.imageSmoothingEnabled = false;
    for (const region of regions) {
      ctx.drawImage(
        canvas,
        region.sx, region.sy, region.sw, region.sh,
        region.dx, region.dy, region.sw, region.sh
      );
    }
  };

  const copyPresent = async (frame, regions) => {
    const ctx = get2dContext();
    try {
      if (!ctx || typeof frame?.copyTo !== 'function') return;
      if (!reported) {
        reported = true;
        console.warn('[IronRDP WebCodecs] presenta por copia');
      }
      ctx.imageSmoothingEnabled = false;
      for (const region of regions) {
        const rect = { x: region.sx, y: region.sy, width: region.sw, height: region.sh };
        const size = frame.allocationSize({ format: 'RGBA', rect });
        const buf = new Uint8Array(size);
        await frame.copyTo(buf, { format: 'RGBA', rect });
        const image = new ImageData(new Uint8ClampedArray(buf.buffer), region.sw, region.sh);
        ctx.putImageData(image, region.dx, region.dy);
      }
    } catch (_) { /* el siguiente frame sigue */ } finally {
      closeFrame(frame);
    }
  };

  const ensureSlots = () => {
    if (slots.length === 2) return;
    slots = [0, 1].map(() => ({
      canvas: new OffscreenCanvas(1, 1),
      ctx: null,
      busy: false
    }));
  };

  const ensureSlotConfigured = (slot, width, height) => {
    const w = Math.max(1, width | 0);
    const h = Math.max(1, height | 0);
    if (slot.canvas.width !== w || slot.canvas.height !== h) {
      slot.canvas.width = w;
      slot.canvas.height = h;
      slot.ctx = null;
    }
    if (!slot.ctx) {
      slot.ctx = slot.canvas.getContext('webgpu');
      slot.ctx.configure({
        device: gpu.device,
        format: gpu.format,
        alphaMode: 'opaque',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
      });
    }
    return slot.ctx;
  };

  const acquireSlot = () => {
    ensureSlots();
    return slots.find((s) => !s.busy) || null;
  };

  const slotsBusyCount = () => slots.reduce((n, s) => n + (s.busy ? 1 : 0), 0);

  const drainLatest = () => {
    if (!latest) return;
    if (mode === 'webgpu' && gpu) {
      if (!acquireSlot()) return;
      const job = latest;
      latest = null;
      void startGpuJob(job.frame, job.regions, job.resolve);
      return;
    }
    if (copyBusy) return;
    const job = latest;
    latest = null;
    copyBusy = true;
    void runCopy(job.frame, job.regions, job.resolve);
  };

  const finishSlot = (slot, resolve) => {
    slot.busy = false;
    if (typeof resolve === 'function') resolve();
    drainLatest();
  };

  /**
   * Submit GPU work without awaiting the fence on the hot path.
   */
  const startGpuJob = (frame, regions, resolve) => {
    const slot = acquireSlot();
    if (!slot) {
      if (latest) {
        closeFrame(latest.frame);
        if (typeof latest.resolve === 'function') latest.resolve();
      }
      latest = { frame, regions, resolve };
      return;
    }

    const width = frame.displayWidth || frame.codedWidth;
    const height = frame.displayHeight || frame.codedHeight;
    if (!width || !height || !gpu) {
      closeFrame(frame);
      if (typeof resolve === 'function') resolve();
      drainLatest();
      return;
    }

    slot.busy = true;
    let imported = false;
    try {
      const ctx = ensureSlotConfigured(slot, width, height);
      const external = gpu.device.importExternalTexture({ source: frame });
      imported = true;
      const bindGroup = gpu.device.createBindGroup({
        layout: gpu.pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: gpu.sampler },
          { binding: 1, resource: external }
        ]
      });
      const view = ctx.getCurrentTexture().createView();
      const encoder = gpu.device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view,
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 }
        }]
      });
      pass.setPipeline(gpu.pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();
      gpu.device.queue.submit([encoder.finish()]);

      const gen = generation;
      const canvas = slot.canvas;
      void gpu.device.queue.onSubmittedWorkDone().then(() => {
        if (gen !== generation) {
          closeFrame(frame);
          finishSlot(slot, resolve);
          return;
        }
        try {
          if (!reported) {
            reported = true;
            console.warn('[IronRDP WebCodecs] presenta en gpu', width, height);
          }
          blitRegions(canvas, regions);
        } catch (_) { /* siguiente frame */ }
        closeFrame(frame);
        finishSlot(slot, resolve);
      }, () => {
        closeFrame(frame);
        finishSlot(slot, resolve);
      });
    } catch (_) {
      slot.busy = false;
      if (imported) {
        closeFrame(frame);
        if (typeof resolve === 'function') resolve();
        drainLatest();
      } else {
        copyBusy = true;
        void runCopy(frame, regions, resolve);
      }
    }
  };

  const runCopy = async (frame, regions, resolve) => {
    try {
      await copyPresent(frame, regions);
    } finally {
      if (typeof resolve === 'function') resolve();
      copyBusy = false;
      drainLatest();
    }
  };

  const kick = (frame, regions) => new Promise((resolve) => {
    if (mode === 'webgpu' && gpu) {
      if (slotsBusyCount() >= 2 || !acquireSlot()) {
        if (latest) {
          closeFrame(latest.frame);
          if (typeof latest.resolve === 'function') latest.resolve();
        }
        latest = { frame, regions, resolve };
        return;
      }
      void startGpuJob(frame, regions, resolve);
      return;
    }
    if (copyBusy) {
      if (latest) {
        closeFrame(latest.frame);
        if (typeof latest.resolve === 'function') latest.resolve();
      }
      latest = { frame, regions, resolve };
      return;
    }
    copyBusy = true;
    void runCopy(frame, regions, resolve);
  });

  const init = async () => {
    const gen = generation;
    try {
      const nav = typeof navigator === 'undefined' ? null : navigator;
      if (!nav?.gpu || typeof OffscreenCanvas !== 'function') throw new Error('sin WebGPU');
      const adapter = await nav.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (gen !== generation) return;
      if (!adapter) throw new Error('sin adaptador');
      const device = await adapter.requestDevice();
      if (gen !== generation) {
        try { device.destroy(); } catch (_) { /* noop */ }
        return;
      }
      device.lost.then(() => {
        if (gpu?.device !== device) return;
        gpu = null;
        mode = 'copy';
      });
      const module = device.createShaderModule({ code: SHADER });
      const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module, entryPoint: 'vs' },
        fragment: {
          module,
          entryPoint: 'fs',
          targets: [{ format: nav.gpu.getPreferredCanvasFormat() }]
        },
        primitive: { topology: 'triangle-list' }
      });
      gpu = {
        device,
        pipeline,
        format: nav.gpu.getPreferredCanvasFormat(),
        sampler: device.createSampler({ magFilter: 'nearest', minFilter: 'nearest' })
      };
      ensureSlots();
      mode = 'webgpu';
    } catch (_) {
      if (gen !== generation) return;
      gpu = null;
      mode = 'copy';
    }
    if (gen !== generation) return;
    drainLatest();
  };

  return {
    /**
     * @returns {Promise<void>}
     */
    present(frame, regions) {
      if (!frame) return Promise.resolve();
      if (!regions?.length) {
        closeFrame(frame);
        return Promise.resolve();
      }
      if (mode === 'init') {
        return new Promise((resolve) => {
          if (latest) {
            closeFrame(latest.frame);
            if (typeof latest.resolve === 'function') latest.resolve();
          }
          latest = { frame, regions, resolve };
          if (!initPromise) initPromise = init();
        });
      }
      return kick(frame, regions);
    },
    dispose() {
      generation += 1;
      dropLatest();
      copyBusy = false;
      try { gpu?.device?.destroy(); } catch (_) { /* noop */ }
      gpu = null;
      slots = [];
      mode = 'copy';
    }
  };
}

module.exports = { createH264GpuPresenter };
