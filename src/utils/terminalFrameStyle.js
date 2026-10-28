import { STORAGE_KEYS } from './constants';
import { persistHomeTabSetting } from './homeTabSync';

export const TERMINAL_FRAME_STYLE_DEFAULT = 'macos';

/** Catálogo de estilos de marco del terminal (Home + TitleBar). */
export const TERMINAL_FRAME_STYLE_OPTIONS = [
  // Clásicos & OS
  { id: 'macos', label: 'macOS (Traffic)', dots: ['#ff5f56', '#ffbd2e', '#27c93f'] },
  { id: 'gnome', label: 'GNOME (Adwaita)', icons: ['pi-minus', 'pi-stop', 'pi-times'], right: true },
  { id: 'kde', label: 'KDE (Breeze)', icons: ['pi-minus', 'pi-stop', 'pi-times'], right: true },
  { id: 'windows', label: 'Windows (WinUI)', icons: ['pi-minus', 'pi-stop', 'pi-times'], right: true },
  // Minimalistas
  { id: 'frameless', label: 'Sin marco (Solo Terminal)', frameless: true, text: '∅' },
  { id: 'minimal', label: 'Minimal (Sin botones)', noButtons: true },
  { id: 'matcha', label: 'Matcha (Green)', line: '#2eb398', icons: ['pi-minus', 'pi-stop', 'pi-times'], right: true },
  // Futuristas & Cyberpunk
  { id: 'cyberpunk-pro', label: 'Cyberpunk Pro (Arasaka)', color: '#fcee0a', tag: 'SYS', cyberBorder: true, right: true },
  { id: 'hologram', label: 'Holográfico (Sci-Fi Cyan)', color: '#00e5ff', hud: true, right: true },
  { id: 'holo-amber', label: 'Holográfico Ámbar (Deus Ex)', color: '#ffb000', hud: true, right: true },
  { id: 'holo-emerald', label: 'Holográfico Esmeralda (Radar)', color: '#00ff88', hud: true, right: true },
  { id: 'holo-crimson', label: 'Holográfico Carmesí (Red Alert)', color: '#ff0055', hud: true, right: true },
  { id: 'holo-violet', label: 'Holográfico Violeta (Quantum)', color: '#a855f7', hud: true, right: true },
  { id: 'plasma-cyan', label: 'Plasma Fusión (Core HUD)', color: '#00f2ff', hud: true, plasma: true, right: true },
  { id: 'matrix', label: 'Matrix (Digital Rain)', color: '#00ff66', matrix: true, right: true },
  { id: 'futuristic', label: 'Futurista (Cyber)', color: '#00f2ff', futuristic: true, right: true },
  // Modernos & Efectos
  { id: 'aurora-glass', label: 'Aurora Glass (Liquid)', rounded: true, color: '#93c5fd', aurora: true, right: true },
  { id: 'modern', label: 'Moderno (Glass)', rounded: true, icons: ['pi-minus', 'pi-stop', 'pi-times'], right: true },
  { id: 'synthwave', label: 'Synthwave (Neon 80s)', synthwave: true, rounded: true, color: '#d946ef', glow: 'rgba(217,70,239,0.5)', dots: ['#06b6d4', '#8b5cf6', '#ec4899'], right: true },
  { id: 'synthwave-sunset', label: 'Synthwave Atardecer (Outrun)', synthwave: true, rounded: true, color: '#fb923c', glow: 'rgba(251,146,60,0.55)', dots: ['#fbbf24', '#f97316', '#ec4899'], right: true },
  { id: 'synthwave-ocean', label: 'Synthwave Océano (Neón Azul)', synthwave: true, rounded: true, color: '#38bdf8', glow: 'rgba(56,189,248,0.55)', dots: ['#22d3ee', '#3b82f6', '#818cf8'], right: true },
  { id: 'synthwave-emerald', label: 'Synthwave Esmeralda (Neón Verde)', synthwave: true, rounded: true, color: '#34d399', glow: 'rgba(52,211,153,0.55)', dots: ['#a3e635', '#22c55e', '#2dd4bf'], right: true },
  { id: 'synthwave-crimson', label: 'Synthwave Carmesí (Neón Rojo)', synthwave: true, rounded: true, color: '#f43f5e', glow: 'rgba(244,63,94,0.55)', dots: ['#fb7185', '#ef4444', '#e879f9'], right: true },
  { id: 'synthwave-arctic', label: 'Synthwave Ártico (Hielo)', synthwave: true, rounded: true, color: '#7dd3fc', glow: 'rgba(125,211,252,0.55)', dots: ['#e0f2fe', '#38bdf8', '#a78bfa'], right: true },
  { id: 'synthwave-violet', label: 'Synthwave Violeta (Ultravioleta)', synthwave: true, rounded: true, color: '#c084fc', glow: 'rgba(192,132,252,0.55)', dots: ['#e879f9', '#a855f7', '#6366f1'], right: true },
  { id: 'synthwave-toxic', label: 'Synthwave Tóxico (Ácido)', synthwave: true, rounded: true, color: '#bef264', glow: 'rgba(190,242,100,0.55)', dots: ['#facc15', '#84cc16', '#e879f9'], right: true },
  { id: 'synthwave-copper', label: 'Synthwave Cobre (Bronce)', synthwave: true, rounded: true, color: '#d97706', glow: 'rgba(217,119,6,0.55)', dots: ['#fdba74', '#ea580c', '#9a3412'], right: true },
  { id: 'synthwave-sakura', label: 'Synthwave Sakura (Cerezo)', synthwave: true, rounded: true, color: '#f9a8d4', glow: 'rgba(249,168,212,0.55)', dots: ['#fbcfe8', '#f472b6', '#c084fc'], right: true },
  { id: 'synthwave-lemon', label: 'Synthwave Limón (Neón)', synthwave: true, rounded: true, color: '#facc15', glow: 'rgba(250,204,21,0.55)', dots: ['#fef08a', '#eab308', '#a3e635'], right: true },
  { id: 'synthwave-lagoon', label: 'Synthwave Laguna (Turquesa)', synthwave: true, rounded: true, color: '#2dd4bf', glow: 'rgba(45,212,191,0.55)', dots: ['#99f6e4', '#14b8a6', '#0284c7'], right: true },
  { id: 'stealth', label: 'Stealth Ops (Matte)', color: '#ff6b00', stealth: true, right: true },
  { id: 'retro', label: 'Retro (CRT)', color: '#0f0', switch: true, right: true }
];

export function getCurrentTerminalFrameStyle() {
  try {
    return localStorage.getItem(STORAGE_KEYS.TERMINAL_FRAME_STYLE) || TERMINAL_FRAME_STYLE_DEFAULT;
  } catch {
    return TERMINAL_FRAME_STYLE_DEFAULT;
  }
}

export function getTerminalFrameStyleLabel(styleId) {
  const id = styleId || getCurrentTerminalFrameStyle();
  const opt = TERMINAL_FRAME_STYLE_OPTIONS.find((o) => o.id === id);
  return opt?.label || id;
}

export function setTerminalFrameStyle(styleId) {
  const id = styleId || TERMINAL_FRAME_STYLE_DEFAULT;
  persistHomeTabSetting(STORAGE_KEYS.TERMINAL_FRAME_STYLE, id);
  try {
    window.dispatchEvent(new CustomEvent('terminal-frame-style-changed', {
      detail: { style: id }
    }));
  } catch {
    // Ignorar errores al despachar el evento
  }
  return id;
}
