/**
 * Pinta un VideoFrame de hardware sin drawImage directo.
 * En Windows ese blit importa la textura D3D11 del decodificador en el canvas
 * acelerado y el proceso GPU muere (exit 34). Aquí la GPU copia el frame a un
 * canvas propio y el canvas RDP solo recibe esa textura ya convertida.
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
  let scratch = null;
  let scratchCtx = null;
  let busy = false;
  let latest = null;
  let reported = false;

  const dropLatest = () => {
    if (!latest) return;
    closeFrame(latest.frame);
    if (typeof latest.resolve === 'function') latest.resolve();
    latest = null;
  };

  const blitRegions = (regions) => {
    const ctx = get2dContext();
    if (!ctx || !scratch) return;
    ctx.imageSmoothingEnabled = false;
    for (const region of regions) {
      ctx.drawImage(
        scratch,
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

  const ensureScratch = (width, height) => {
    const w = Math.max(1, width | 0);
    const h = Math.max(1, height | 0);
    if (!scratch) scratch = new OffscreenCanvas(w, h);
    if (scratch.width !== w || scratch.height !== h) {
      scratch.width = w;
      scratch.height = h;
      scratchCtx = null;
    }
    if (!scratchCtx) {
      scratchCtx = scratch.getContext('webgpu');
      scratchCtx.configure({
        device: gpu.device,
        format: gpu.format,
        alphaMode: 'opaque',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
      });
    }
    return scratchCtx;
  };

  const gpuPresent = async (frame, regions) => {
    const width = frame.displayWidth || frame.codedWidth;
    const height = frame.displayHeight || frame.codedHeight;
    if (!width || !height) {
      closeFrame(frame);
      return;
    }
    let imported = false;
    try {
      const ctx = ensureScratch(width, height);
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
      await gpu.device.queue.onSubmittedWorkDone();
      if (!reported) {
        reported = true;
        console.warn('[IronRDP WebCodecs] presenta en gpu', width, height);
      }
      blitRegions(regions);
      closeFrame(frame);
    } catch (_) {
      if (imported) closeFrame(frame);
      else await copyPresent(frame, regions);
    }
  };

  const run = async (frame, regions, resolve) => {
    try {
      if (mode === 'copy' || !gpu) await copyPresent(frame, regions);
      else await gpuPresent(frame, regions);
    } finally {
      if (typeof resolve === 'function') resolve();
      busy = false;
      if (!latest) return;
      const job = latest;
      latest = null;
      busy = true;
      void run(job.frame, job.regions, job.resolve);
    }
  };

  const kick = (frame, regions) => new Promise((resolve) => {
    if (busy) {
      if (latest) {
        closeFrame(latest.frame);
        if (typeof latest.resolve === 'function') latest.resolve();
      }
      latest = { frame, regions, resolve };
      return;
    }
    busy = true;
    void run(frame, regions, resolve);
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
      mode = 'webgpu';
    } catch (_) {
      if (gen !== generation) return;
      gpu = null;
      mode = 'copy';
    }
    if (gen !== generation) return;
    const job = latest;
    latest = null;
    if (!job) {
      busy = false;
      return;
    }
    busy = true;
    void run(job.frame, job.regions, job.resolve);
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
          busy = true;
          if (!initPromise) initPromise = init();
        });
      }
      return kick(frame, regions);
    },
    dispose() {
      generation += 1;
      dropLatest();
      busy = false;
      try { gpu?.device?.destroy(); } catch (_) { /* noop */ }
      gpu = null;
      scratch = null;
      scratchCtx = null;
      mode = 'copy';
    }
  };
}

module.exports = { createH264GpuPresenter };
