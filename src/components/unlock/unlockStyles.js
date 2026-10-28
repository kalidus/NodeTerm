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
  'aurora'
];

/** Estilos fullscreen (overlay propio). classic y premium-card usan shell modal. */
export const UNLOCK_FULLSCREEN_STYLES = new Set([
  'vault-gate',
  'terminal',
  'glass-hud',
  'synthwave',
  'aurora'
]);

export const UNLOCK_STYLE_META = [
  {
    id: 'classic',
    nameKey: 'unlockScreen.styles.classic.name',
    descKey: 'unlockScreen.styles.classic.desc',
    name: 'Classic',
    desc: 'El diálogo compacto actual de NodeTerm.',
    bgColor: 'linear-gradient(180deg, #2d2d30 0%, #1e1e1e 100%)',
    accentColor: '#0e639c',
    borderColor: 'rgba(14, 99, 156, 0.35)'
  },
  {
    id: 'vault-gate',
    nameKey: 'unlockScreen.styles.vaultGate.name',
    descKey: 'unlockScreen.styles.vaultGate.desc',
    name: 'Vault Gate',
    desc: 'Pantalla completa con card centrada y wordmark NodeTerm.',
    bgColor: 'linear-gradient(180deg, #1a2332 0%, #0f1722 50%, #0a0f18 100%)',
    accentColor: '#3b82f6',
    borderColor: 'rgba(59, 130, 246, 0.35)'
  },
  {
    id: 'terminal',
    nameKey: 'unlockScreen.styles.terminal.name',
    descKey: 'unlockScreen.styles.terminal.desc',
    name: 'Terminal',
    desc: 'Consola unlock>_ con tipografía mono y estética CLI.',
    bgColor: '#050505',
    accentColor: '#00ff66',
    borderColor: 'rgba(0, 255, 102, 0.4)'
  },
  {
    id: 'premium-card',
    nameKey: 'unlockScreen.styles.premiumCard.name',
    descKey: 'unlockScreen.styles.premiumCard.desc',
    name: 'Premium Card',
    desc: 'Modal pulido sobre máscara, sin banners de relleno.',
    bgColor: 'linear-gradient(160deg, #252526 0%, #1e1e1e 100%)',
    accentColor: '#0e639c',
    borderColor: 'rgba(14, 99, 156, 0.45)'
  },
  {
    id: 'glass-hud',
    nameKey: 'unlockScreen.styles.glassHud.name',
    descKey: 'unlockScreen.styles.glassHud.desc',
    name: 'Glass HUD',
    desc: 'Cristal translúcido con glow cian tipo hologram.',
    bgColor: '#06040d',
    accentColor: '#00f2fe',
    borderColor: 'rgba(0, 242, 254, 0.45)'
  },
  {
    id: 'synthwave',
    nameKey: 'unlockScreen.styles.synthwave.name',
    descKey: 'unlockScreen.styles.synthwave.desc',
    name: 'Synthwave',
    desc: 'Retro 80s con fucsia y ámbar, eco del splash Outrun.',
    bgColor: 'linear-gradient(180deg, #0f021a 0%, #1a0530 60%, #2a0840 100%)',
    accentColor: '#ff007f',
    borderColor: 'rgba(255, 0, 127, 0.45)'
  },
  {
    id: 'aurora',
    nameKey: 'unlockScreen.styles.aurora.name',
    descKey: 'unlockScreen.styles.aurora.desc',
    name: 'Aurora',
    desc: 'Gradientes fríos suaves, sin neón agresivo.',
    bgColor: 'linear-gradient(135deg, #0b1a2a 0%, #12304a 45%, #0e2838 100%)',
    accentColor: '#7dd3fc',
    borderColor: 'rgba(125, 211, 252, 0.4)'
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
