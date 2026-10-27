/** Lightweight session-action icon catalog (no SVG). */
import { futuristCatalog } from '../icon-themes/futurist-catalog';

const ACTION_COPY = {
  holo: 'Cristal iridiscente con prisma y brillo especular',
  synth: 'Sol de neón, horizonte y rejilla en perspectiva',
  cyber: 'Chaflán hexagonal, visor HUD y tarjeta de acceso',
  tron: 'Nodos y pistas de circuito',
  terminal: 'Marco CRT, prompt y cursor de bloque',
  stealthOps: 'Synthwave mate, con el glow contenido'
};

const futuristActionMeta = futuristCatalog.map((spec) => ({
  id: spec.id,
  name: spec.name,
  group: spec.group,
  description: ACTION_COPY[spec.id] || ACTION_COPY[spec.style] || '',
  premium: false
}));

const baseSessionActionIconThemeMeta = [
  {
    "id": "modern",
    "name": "Moderno",
    "description": "Iconos modernos con gradientes y sombras suaves",
    "premium": false
  },
  {
    "id": "minimal",
    "name": "Minimalista",
    "description": "Iconos minimalistas con líneas limpias",
    "premium": false
  },
  {
    "id": "original",
    "name": "Original (PrimeIcons)",
    "description": "Iconos clásicos originales de la sidebar (PrimeIcons)",
    "premium": false
  },
  {
    "id": "classic",
    "name": "Clásico",
    "description": "Iconos clásicos estilo PrimeIcons",
    "premium": false
  },
  {
    "id": "neon",
    "name": "Neón",
    "description": "Iconos con efecto neón brillante",
    "premium": false
  },
  {
    "id": "outline",
    "name": "Outline",
    "description": "Iconos outline minimalistas con estilo lineal",
    "premium": false
  },
  {
    "id": "bold",
    "name": "Audaz",
    "description": "Iconos gruesos y audaces con líneas pesadas",
    "premium": false
  },
  {
    "id": "rounded",
    "name": "Redondeado",
    "description": "Iconos con bordes muy redondeados y suaves",
    "premium": false
  },
  {
    "id": "geometric",
    "name": "Geométrico",
    "description": "Iconos abstractos con formas geométricas puras",
    "premium": false
  },
  {
    "id": "filled",
    "name": "Relleno",
    "description": "Iconos completamente rellenos con formas sólidas",
    "premium": false
  },
  {
    "id": "duotone",
    "name": "Duotono",
    "description": "Iconos con dos tonos de color superpuestos",
    "premium": false
  },
  {
    "id": "pixel",
    "name": "Pixel",
    "description": "Iconos estilo pixel art con bordes definidos",
    "premium": false
  },
  {
    "id": "glyphs",
    "name": "Glyphs",
    "description": "Iconos modernos estilo Glyphs.fyi - limpios y bien balanceados",
    "premium": false
  },
  {
    "id": "cyberpunk",
    "name": "Cyberpunk",
    "description": "Estilo futurista con colores neón vibrantes y formas angulares",
    "premium": false
  },
  {
    "id": "glass",
    "name": "Glassmorphism",
    "description": "Efecto de cristal traslúcido con desenfoque y bordes suaves",
    "premium": false
  },
  {
    "id": "vibrant",
    "name": "Vibrante",
    "description": "Gradientes modernos y coloridos con altas saturaciones",
    "premium": false
  },
  {
    "id": "holographic",
    "name": "Holográfico",
    "description": "Efecto iridiscente con gradientes cambiantes y brillos mágicos",
    "premium": false
  },
  {
    "id": "glitch",
    "name": "Glitch",
    "description": "Efecto de distorsión digital con aberración cromática",
    "premium": false
  },
  {
    "id": "acrylic",
    "name": "Acrylic",
    "description": "Efecto de cristal esmerilado con bordes suaves y traslúcido",
    "premium": false
  },
  {
    "id": "neumorphic",
    "name": "Neumórfico",
    "description": "Iconos suaves con relieve y sombras profundas estilo Neumorphism",
    "premium": false
  },
  {
    "id": "fluent",
    "name": "Fluent",
    "description": "Estilo inspirado en Microsoft Fluent con colores suaves y profundidad",
    "premium": false
  },
  {
    "id": "studio",
    "name": "Studio",
    "description": "Trazo fino profesional estilo Linear y Raycast",
    "premium": true
  },
  {
    "id": "lucide",
    "name": "Lucide Soft",
    "description": "Geometria Lucide con trazo 1.75 y padding generoso",
    "premium": true
  },
  {
    "id": "aurora",
    "name": "Aurora",
    "description": "Gradientes mesh suaves tipo Apple Intelligence",
    "premium": true
  },
  {
    "id": "noir",
    "name": "Noir",
    "description": "Siluetas solidas de alto contraste estilo Stripe",
    "premium": true
  },
  {
    "id": "carbon",
    "name": "Carbon",
    "description": "Geometria enterprise precisa estilo IBM Carbon",
    "premium": true
  },
  {
    "id": "quartz",
    "name": "Quartz",
    "description": "Cristal tipo visionOS con highlight especular",
    "premium": true
  },
  {
    "id": "solar",
    "name": "Solar",
    "description": "Duotono contemporaneo con capa primaria y secundaria",
    "premium": true
  },
  {
    "id": "geist",
    "name": "Geist",
    "description": "Geometria afilada estilo Vercel Geist",
    "premium": true
  }
];

export const sessionActionIconThemeMeta = [...baseSessionActionIconThemeMeta, ...futuristActionMeta];

export const sessionActionIconThemeIds = sessionActionIconThemeMeta.map((t) => t.id);

export const sessionActionIconThemeOptions = sessionActionIconThemeMeta.map((t) => ({
  label: t.name,
  value: t.id,
  description: t.description || ''
}));

export const PREMIUM_SESSION_ACTION_IDS = ["studio","lucide","aurora","noir","carbon","quartz","solar","geist"];
