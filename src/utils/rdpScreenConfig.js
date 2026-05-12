const RDP_COLOR_DEPTHS = [32, 24, 16];

const RDP_RESOLUTION_VALUES = [
  'fullscreen',
  '3840x2160',
  '3440x1440',
  '2560x1440',
  '2560x1080',
  '1920x1200',
  '1920x1080',
  '1680x1050',
  '1600x1000',
  '1600x900',
  '1440x900',
  '1366x768',
  '1280x1024',
  '1280x800',
  '1280x720',
  '1024x768'
];

const RDP_SCREEN_PRESETS = {
  default: {
    resolution: '1600x1000',
    colorDepth: 32,
    guacDpi: 96,
    fullscreen: false,
    smartSizing: true,
    autoResize: true,
    redirectFolders: true,
    redirectClipboard: true,
    redirectPrinters: false,
    redirectAudio: true,
    guacEnableWallpaper: true,
    guacEnableFontSmoothing: false,
    guacEnableTheming: false,
    guacEnableDesktopComposition: false,
    guacEnableFullWindowDrag: false,
    guacEnableMenuAnimations: false
  },
  performance: {
    resolution: '1280x800',
    colorDepth: 16,
    guacDpi: 96,
    fullscreen: false,
    smartSizing: true,
    autoResize: true,
    redirectFolders: false,
    redirectClipboard: true,
    redirectPrinters: false,
    redirectAudio: false,
    guacEnableWallpaper: false,
    guacEnableFontSmoothing: false,
    guacEnableTheming: false,
    guacEnableDesktopComposition: false,
    guacEnableFullWindowDrag: false,
    guacEnableMenuAnimations: false
  },
  quality: {
    resolution: '1920x1080',
    colorDepth: 32,
    guacDpi: 120,
    fullscreen: false,
    smartSizing: false,
    autoResize: false,
    redirectFolders: true,
    redirectClipboard: true,
    redirectPrinters: false,
    redirectAudio: true,
    guacEnableWallpaper: true,
    guacEnableFontSmoothing: true,
    guacEnableTheming: true,
    guacEnableDesktopComposition: true,
    guacEnableFullWindowDrag: true,
    guacEnableMenuAnimations: true
  }
};

function normalizeRdpColorDepth(value, fallback = 32) {
  const parsed = parseInt(value, 10);
  if (RDP_COLOR_DEPTHS.includes(parsed)) {
    return parsed;
  }
  return fallback;
}

function parseResolutionValue(resolution) {
  if (!resolution || resolution === 'fullscreen') {
    return null;
  }

  const match = String(resolution).match(/^(\d+)\s*x\s*(\d+)$/i);
  if (!match) {
    return null;
  }

  const width = parseInt(match[1], 10);
  const height = parseInt(match[2], 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function resolveRdpScreenDimensions(config = {}, viewport = {}) {
  const viewportWidth = Math.max(320, parseInt(viewport.width, 10) || 1024);
  const viewportHeight = Math.max(240, parseInt(viewport.height, 10) || 768);
  const resolution = config.resolution || '1600x1000';
  const wantsFullscreen = config.fullscreen === true || resolution === 'fullscreen';

  if (wantsFullscreen) {
    return {
      width: viewportWidth,
      height: viewportHeight,
      resolution: 'fullscreen',
      fullscreen: true
    };
  }

  if (config.autoResize === true) {
    const width = Math.floor(viewportWidth * 0.8);
    const height = Math.floor(viewportHeight * 0.7);
    return {
      width,
      height,
      resolution: `${width}x${height}`,
      fullscreen: false
    };
  }

  const parsed = parseResolutionValue(resolution);
  if (parsed) {
    return {
      width: parsed.width,
      height: parsed.height,
      resolution: `${parsed.width}x${parsed.height}`,
      fullscreen: false
    };
  }

  return {
    width: 1600,
    height: 1000,
    resolution: '1600x1000',
    fullscreen: false
  };
}

function buildRdpPresetFormPatch(presetId, currentFormData = {}) {
  const preset = RDP_SCREEN_PRESETS[presetId];
  if (!preset) {
    return { preset: presetId };
  }

  const patch = {
    preset: presetId,
    ...preset
  };

  if (currentFormData.clientType === 'mstsc') {
    delete patch.autoResize;
    delete patch.guacDpi;
    delete patch.guacEnableWallpaper;
    delete patch.guacEnableFontSmoothing;
    delete patch.guacEnableTheming;
    delete patch.guacEnableDesktopComposition;
    delete patch.guacEnableFullWindowDrag;
    delete patch.guacEnableMenuAnimations;
  }

  return patch;
}

function getRdpScreenPreset(presetId) {
  return RDP_SCREEN_PRESETS[presetId] || null;
}

module.exports = {
  RDP_COLOR_DEPTHS,
  RDP_RESOLUTION_VALUES,
  RDP_SCREEN_PRESETS,
  normalizeRdpColorDepth,
  parseResolutionValue,
  resolveRdpScreenDimensions,
  buildRdpPresetFormPatch,
  getRdpScreenPreset
};
