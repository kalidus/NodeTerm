/** Lightweight icon-theme catalog (no SVG). */
import { futuristIconMeta } from './futurist-catalog';

const baseIconThemeMeta = [
  {
    "id": "cyberpunk",
    "name": "Cyberpunk"
  },
  {
    "id": "material",
    "name": "Material"
  },
  {
    "id": "fluent",
    "name": "Fluent"
  },
  {
    "id": "linea",
    "name": "Linea"
  },
  {
    "id": "nord",
    "name": "Nord"
  },
  {
    "id": "dracula",
    "name": "Dracula"
  },
  {
    "id": "solarized",
    "name": "Solarized"
  },
  {
    "id": "vscode",
    "name": "VS Code"
  },
  {
    "id": "atom",
    "name": "Atom"
  },
  {
    "id": "monokai",
    "name": "Monokai"
  },
  {
    "id": "onedark",
    "name": "One Dark"
  },
  {
    "id": "gruvbox",
    "name": "Gruvbox"
  },
  {
    "id": "tokyonight",
    "name": "Tokyo Night"
  },
  {
    "id": "palenight",
    "name": "Palenight"
  },
  {
    "id": "minimal",
    "name": "Minimal"
  },
  {
    "id": "synthwave",
    "name": "Synthwave"
  },
  {
    "id": "nodetermBasic",
    "name": "Nodeterm Basic"
  },
  {
    "id": "retroGaming",
    "name": "Retro Gaming"
  },
  {
    "id": "corporate",
    "name": "Corporate"
  },
  {
    "id": "nature",
    "name": "Nature"
  },
  {
    "id": "space",
    "name": "Space"
  },
  {
    "id": "ocean",
    "name": "Ocean"
  },
  {
    "id": "fire",
    "name": "Fire"
  },
  {
    "id": "ice",
    "name": "Ice"
  },
  {
    "id": "forest",
    "name": "Forest"
  },
  {
    "id": "sunset",
    "name": "Sunset"
  },
  {
    "id": "matrix",
    "name": "Matrix"
  },
  {
    "id": "neon",
    "name": "Neon"
  },
  {
    "id": "gradient",
    "name": "Gradient"
  },
  {
    "id": "rainbow",
    "name": "Rainbow"
  },
  {
    "id": "metallic",
    "name": "Metallic"
  },
  {
    "id": "holographic",
    "name": "Holographic"
  },
  {
    "id": "glitch",
    "name": "Glitch"
  },
  {
    "id": "vaporwave",
    "name": "Vaporwave"
  },
  {
    "id": "glass",
    "name": "Glassmorphism"
  },
  {
    "id": "acrylic",
    "name": "Acrylic"
  },
  {
    "id": "neumorphic",
    "name": "Neumórfico"
  },
  {
    "id": "glassmorphism",
    "name": "Glassmorphism"
  },
  {
    "id": "neon_glow",
    "name": "Neon Glow"
  },
  {
    "id": "cupertino",
    "name": "Cupertino"
  },
  {
    "id": "cyber_blue",
    "name": "Cyber Blue"
  },
  {
    "id": "aurora",
    "name": "Aurora Borealis"
  },
  {
    "id": "ghost_ui",
    "name": "Ghost UI"
  },
  {
    "id": "neon_matrix",
    "name": "Neon Matrix"
  },
  {
    "id": "obsidian_glass",
    "name": "Obsidian Glass"
  },
  {
    "id": "crimson_tech",
    "name": "Crimson Tech"
  }
];

export const iconThemeMeta = [...baseIconThemeMeta, ...futuristIconMeta];

export const iconThemeIds = iconThemeMeta.map((t) => t.id);

export const iconThemeOptions = iconThemeMeta.map((t) => ({ label: t.name, value: t.id }));
