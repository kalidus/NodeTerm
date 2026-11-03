/**
 * Registro de estilos de splash (IDs unificados con unlock).
 * Mirror ESM del catálogo CommonJS en src/main/utils/splash-styles.js.
 */

export const SPLASH_STYLE_STORAGE_NOTE = 'splash-preferences.json (main process)';
export const DEFAULT_SPLASH_STYLE = 'classic';

export const SPLASH_STYLE_IDS = [
  'classic',
  'vault-gate',
  'terminal',
  'premium-card',
  'glass-hud',
  'synthwave',
  'aurora',
  'matrix',
  'ember',
  'nord',
  'midnight'
];

export const LEGACY_SPLASH_STYLE_MAP = {
  'hologram-hud': 'glass-hud',
  'synthwave-outrun': 'synthwave',
  'terminal-minimalist': 'terminal'
};

export const SPLASH_STYLE_META = [
  {
    id: 'classic',
    nameKey: 'splashScreen.styles.classic.name',
    descKey: 'splashScreen.styles.classic.desc',
    name: 'Classic',
    desc: 'El tema clásico de arranque con tonos azulados oscuros.',
    accentColor: '#3b82f6',
    bgColor: 'linear-gradient(180deg, #1a2332 0%, #0f1722 50%, #0a0f18 100%)'
  },
  {
    id: 'vault-gate',
    nameKey: 'splashScreen.styles.vaultGate.name',
    descKey: 'splashScreen.styles.vaultGate.desc',
    name: 'Vault Gate',
    desc: 'Card centrada azul sobre fondo de bóveda.',
    accentColor: '#3b82f6',
    bgColor: 'linear-gradient(180deg, #1a2332 0%, #0a0f18 100%)'
  },
  {
    id: 'terminal',
    nameKey: 'splashScreen.styles.terminal.name',
    descKey: 'splashScreen.styles.terminal.desc',
    name: 'Terminal',
    desc: 'Consola minimalista en verde Matrix con ticker CLI.',
    accentColor: '#00ff66',
    bgColor: '#000000'
  },
  {
    id: 'premium-card',
    nameKey: 'splashScreen.styles.premiumCard.name',
    descKey: 'splashScreen.styles.premiumCard.desc',
    name: 'Premium Card',
    desc: 'Tarjeta pulida centrada sobre máscara oscura.',
    accentColor: '#0e639c',
    bgColor: '#080a0e'
  },
  {
    id: 'glass-hud',
    nameKey: 'splashScreen.styles.glassHud.name',
    descKey: 'splashScreen.styles.glassHud.desc',
    name: 'Glass HUD',
    desc: 'HUD cian holográfico con rejilla táctica.',
    accentColor: '#00f2fe',
    bgColor: '#06040d'
  },
  {
    id: 'synthwave',
    nameKey: 'splashScreen.styles.synthwave.name',
    descKey: 'splashScreen.styles.synthwave.desc',
    name: 'Synthwave',
    desc: 'Retro 80s con fucsia y ámbar neón.',
    accentColor: '#ff007f',
    bgColor: '#0f021a'
  },
  {
    id: 'aurora',
    nameKey: 'splashScreen.styles.aurora.name',
    descKey: 'splashScreen.styles.aurora.desc',
    name: 'Aurora',
    desc: 'Gradientes fríos suaves, sin neón agresivo.',
    accentColor: '#6366f1',
    bgColor: 'linear-gradient(160deg, #7dd3fc 0%, #818cf8 48%, #c4b5fd 100%)'
  },
  {
    id: 'matrix',
    nameKey: 'splashScreen.styles.matrix.name',
    descKey: 'splashScreen.styles.matrix.desc',
    name: 'Matrix',
    desc: 'Lluvia digital verde y acceso tipo consola hacker.',
    accentColor: '#22c55e',
    bgColor: '#020c06'
  },
  {
    id: 'ember',
    nameKey: 'splashScreen.styles.ember.name',
    descKey: 'splashScreen.styles.ember.desc',
    name: 'Ember',
    desc: 'Carbón y cobre cálido de arranque.',
    accentColor: '#f97316',
    bgColor: '#120a06'
  },
  {
    id: 'nord',
    nameKey: 'splashScreen.styles.nord.name',
    descKey: 'splashScreen.styles.nord.desc',
    name: 'Nord',
    desc: 'Paleta nórdica slate y azul polar.',
    accentColor: '#88c0d0',
    bgColor: 'linear-gradient(180deg, #4c566a 0%, #2e3440 100%)'
  },
  {
    id: 'midnight',
    nameKey: 'splashScreen.styles.midnight.name',
    descKey: 'splashScreen.styles.midnight.desc',
    name: 'Midnight',
    desc: 'Índigo profundo con toque elegante.',
    accentColor: '#818cf8',
    bgColor: '#07070f'
  }
];

export function isValidSplashStyle(style) {
  return SPLASH_STYLE_IDS.includes(style);
}

export function normalizeSplashStyle(style) {
  let id = String(style || '').toLowerCase().trim();
  if (LEGACY_SPLASH_STYLE_MAP[id]) {
    id = LEGACY_SPLASH_STYLE_MAP[id];
  }
  return isValidSplashStyle(id) ? id : DEFAULT_SPLASH_STYLE;
}

export function getSplashStyleMeta(style) {
  const id = normalizeSplashStyle(style);
  return SPLASH_STYLE_META.find((m) => m.id === id) || SPLASH_STYLE_META[0];
}
