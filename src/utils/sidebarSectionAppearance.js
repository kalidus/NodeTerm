import { treeThemes } from '../themes/tree-themes';
import { iconThemeIds } from '../themes/icon-themes/meta';
import { persistSyncedSetting } from './persistSyncedSetting';

export const SIDEBAR_SECTION_APPEARANCE_KEY = 'sidebarSectionAppearance';

export const SIDEBAR_APPEARANCE_SECTIONS = [
  'connections',
  'favorites',
  'passwords',
  'documents',
  'tools',
  'settings'
];

export const SIDEBAR_SECTION_LABELS = {
  connections: 'Conexiones',
  favorites: 'Favoritos',
  passwords: 'Secretos',
  documents: 'Biblioteca',
  tools: 'Herramientas',
  settings: 'Ajustes'
};

const iconThemeIdSet = new Set(iconThemeIds.map((id) => id.toLowerCase()));

function canonicalTreeTheme(value) {
  if (typeof value !== 'string' || !treeThemes[value]) return null;
  return value;
}

function canonicalIconTheme(value) {
  if (typeof value !== 'string') return null;
  const match = iconThemeIds.find((id) => id.toLowerCase() === value.toLowerCase());
  if (match) return match;
  return iconThemeIdSet.has(value.toLowerCase()) ? value.toLowerCase() : null;
}

function sanitizeEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const next = {};
  const treeTheme = canonicalTreeTheme(entry.treeTheme);
  const iconTheme = canonicalIconTheme(entry.iconTheme);
  if (treeTheme) next.treeTheme = treeTheme;
  if (iconTheme) next.iconTheme = iconTheme;
  return next.treeTheme || next.iconTheme ? next : null;
}

export function sanitizeSidebarSectionAppearance(map) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return {};
  const clean = {};
  SIDEBAR_APPEARANCE_SECTIONS.forEach((sectionId) => {
    const entry = sanitizeEntry(map[sectionId]);
    if (entry) clean[sectionId] = entry;
  });
  return clean;
}

export function loadSidebarSectionAppearance() {
  try {
    const raw = localStorage.getItem(SIDEBAR_SECTION_APPEARANCE_KEY);
    if (!raw) return {};
    return sanitizeSidebarSectionAppearance(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveSidebarSectionAppearance(map) {
  const clean = sanitizeSidebarSectionAppearance(map);
  const serialized = Object.keys(clean).length ? JSON.stringify(clean) : null;
  persistSyncedSetting(SIDEBAR_SECTION_APPEARANCE_KEY, serialized);
}

export function clearSidebarSectionAppearance() {
  persistSyncedSetting(SIDEBAR_SECTION_APPEARANCE_KEY, null);
}

export function resolveSectionAppearance(map, sectionId, fallbacks = {}) {
  const entry = sanitizeSidebarSectionAppearance(map)[sectionId] || {};
  return {
    treeTheme: entry.treeTheme || fallbacks.treeTheme || 'cursorCompact',
    iconTheme: entry.iconTheme || fallbacks.iconTheme || 'nord'
  };
}

export function sectionHasAppearanceOverride(map, sectionId) {
  return Boolean(sanitizeSidebarSectionAppearance(map)[sectionId]);
}

export function withSectionField(map, sectionId, field, value) {
  if (!SIDEBAR_APPEARANCE_SECTIONS.includes(sectionId)) return map || {};
  const sanitized = field === 'treeTheme' ? canonicalTreeTheme(value) : canonicalIconTheme(value);
  if (!sanitized) return map || {};
  const current = sanitizeSidebarSectionAppearance(map);
  const entry = current[sectionId] || {};
  if (entry[field] === sanitized) return map || {};
  return {
    ...current,
    [sectionId]: { ...entry, [field]: sanitized }
  };
}
