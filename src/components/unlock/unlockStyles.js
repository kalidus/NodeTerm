/**
 * Registro de estilos de la pantalla de desbloqueo.
 * Preferencia: localStorage `nodeterm_unlock_style` (default: classic).
 */

export const UNLOCK_STYLE_STORAGE_KEY = 'nodeterm_unlock_style';
export const DEFAULT_UNLOCK_STYLE = 'classic';

export const UNLOCK_STYLE_IDS = [
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

/** Estilos fullscreen (overlay propio). classic y premium-card usan shell modal. */
export const UNLOCK_FULLSCREEN_STYLES = new Set([
  'vault-gate',
  'terminal',
  'glass-hud',
  'synthwave',
  'aurora',
  'matrix',
  'ember',
  'nord',
  'midnight'
]);

/** Estilos en Apariencia (con preview fotorealista). */
export const UNLOCK_STYLE_META = [
  {
    id: 'classic',
    nameKey: 'unlockScreen.styles.classic.name',
    descKey: 'unlockScreen.styles.classic.desc',
    name: 'Classic',
    desc: 'El diálogo compacto actual de NodeTerm.',
    accentColor: '#0e639c'
  },
  {
    id: 'vault-gate',
    nameKey: 'unlockScreen.styles.vaultGate.name',
    descKey: 'unlockScreen.styles.vaultGate.desc',
    name: 'Vault Gate',
    desc: 'Pantalla completa con card centrada y wordmark NodeTerm.',
    accentColor: '#3b82f6'
  },
  {
    id: 'terminal',
    nameKey: 'unlockScreen.styles.terminal.name',
    descKey: 'unlockScreen.styles.terminal.desc',
    name: 'Terminal',
    desc: 'Consola unlock>_ con tipografía mono y estética CLI.',
    accentColor: '#00ff66'
  },
  {
    id: 'premium-card',
    nameKey: 'unlockScreen.styles.premiumCard.name',
    descKey: 'unlockScreen.styles.premiumCard.desc',
    name: 'Premium Card',
    desc: 'Modal pulido sobre máscara, sin banners de relleno.',
    accentColor: '#0e639c'
  },
  {
    id: 'glass-hud',
    nameKey: 'unlockScreen.styles.glassHud.name',
    descKey: 'unlockScreen.styles.glassHud.desc',
    name: 'Glass HUD',
    desc: 'Cristal translúcido con glow cian tipo hologram.',
    accentColor: '#00f2fe'
  },
  {
    id: 'synthwave',
    nameKey: 'unlockScreen.styles.synthwave.name',
    descKey: 'unlockScreen.styles.synthwave.desc',
    name: 'Synthwave',
    desc: 'Retro 80s con fucsia y ámbar, eco del splash Outrun.',
    accentColor: '#ff007f'
  },
  {
    id: 'aurora',
    nameKey: 'unlockScreen.styles.aurora.name',
    descKey: 'unlockScreen.styles.aurora.desc',
    name: 'Aurora',
    desc: 'Gradientes fríos suaves, sin neón agresivo.',
    accentColor: '#7dd3fc'
  },
  {
    id: 'matrix',
    nameKey: 'unlockScreen.styles.matrix.name',
    descKey: 'unlockScreen.styles.matrix.desc',
    name: 'Matrix',
    desc: 'Lluvia digital verde y acceso tipo consola hacker.',
    accentColor: '#22c55e'
  },
  {
    id: 'ember',
    nameKey: 'unlockScreen.styles.ember.name',
    descKey: 'unlockScreen.styles.ember.desc',
    name: 'Ember',
    desc: 'Carbón y cobre cálido, ambiente de bóveda al fuego.',
    accentColor: '#f97316'
  },
  {
    id: 'nord',
    nameKey: 'unlockScreen.styles.nord.name',
    descKey: 'unlockScreen.styles.nord.desc',
    name: 'Nord',
    desc: 'Paleta nórdica slate y azul polar, minimalista.',
    accentColor: '#88c0d0'
  },
  {
    id: 'midnight',
    nameKey: 'unlockScreen.styles.midnight.name',
    descKey: 'unlockScreen.styles.midnight.desc',
    name: 'Midnight',
    desc: 'Índigo profundo con toque elegante y discreto.',
    accentColor: '#818cf8'
  }
];

export function isValidUnlockStyle(style) {
  return UNLOCK_STYLE_IDS.includes(style);
}

export function normalizeUnlockStyle(style) {
  const id = String(style || '').toLowerCase().trim();
  return isValidUnlockStyle(id) ? id : DEFAULT_UNLOCK_STYLE;
}

export function loadUnlockStyle() {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_UNLOCK_STYLE;
    return normalizeUnlockStyle(localStorage.getItem(UNLOCK_STYLE_STORAGE_KEY));
  } catch (_) {
    return DEFAULT_UNLOCK_STYLE;
  }
}

export function saveUnlockStyle(style) {
  const id = normalizeUnlockStyle(style);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(UNLOCK_STYLE_STORAGE_KEY, id);
    }
  } catch (_) {
    /* noop */
  }
  return id;
}

export function isFullscreenUnlockStyle(style) {
  return UNLOCK_FULLSCREEN_STYLES.has(normalizeUnlockStyle(style));
}

export function getUnlockStyleMeta(style) {
  const id = normalizeUnlockStyle(style);
  return UNLOCK_STYLE_META.find((m) => m.id === id) || UNLOCK_STYLE_META[0];
}
