/**
 * Configuraciones alternativas para node-pty
 * Estas configuraciones se utilizan cuando hay problemas con la configuración por defecto
 */

const alternativePtyConfig = {
  conservative: {
    name: 'xterm',
    cols: 80,
    rows: 24,
    windowsHide: false,
    useConpty: false,
    conptyLegacy: false,
    experimentalUseConpty: false
  },
  minimal: {
    name: 'xterm',
    cols: 80,
    rows: 24,
    windowsHide: false
  },
  winpty: {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    windowsHide: false,
    backend: 'winpty',
    useConpty: false
  }
};

module.exports = {
  alternativePtyConfig
};

