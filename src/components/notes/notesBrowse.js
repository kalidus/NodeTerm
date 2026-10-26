const NOTE_TYPES = ['document', 'quick-note'];

export const TIMELINE_SECTIONS = [
  { id: 'today', title: 'Hoy' },
  { id: 'week', title: 'Esta semana' },
  { id: 'older', title: 'Anterior' }
];

export function isQuickNotesGroup(node) {
  return Boolean(node && node.key === 'quick_note');
}

export function isNotebook(node) {
  if (!node || isQuickNotesGroup(node)) return false;
  return Boolean(node.droppable || node.data?.type === 'document-folder');
}

export function isNote(node) {
  const type = node?.data?.type || node?.type;
  return Boolean(node && NOTE_TYPES.includes(type) && !isNotebook(node) && !isQuickNotesGroup(node));
}

export function isBrowsableItem(node) {
  return Boolean(node && (isNotebook(node) || isNote(node) || isQuickNotesGroup(node)));
}

function htmlToSearchText(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function noteSnippet(node, maxLen = 120) {
  if (isNotebook(node) || isQuickNotesGroup(node)) return '';
  const md = (node.data?.markdownSource || '').replace(/\s+/g, ' ').trim();
  const html = htmlToSearchText(node.data?.content || '');
  const text = md || html;
  if (!text) return 'Sin contenido';
  return text.length > maxLen ? `${text.slice(0, maxLen).trim()}…` : text;
}

function nodeMatchesQuery(node, search) {
  if ((node.label || '').toLowerCase().includes(search)) return true;
  const tags = node.data?.tags;
  if (Array.isArray(tags) && tags.some((t) => String(t).toLowerCase().includes(search))) return true;
  const md = (node.data?.markdownSource || '').toLowerCase();
  if (md.includes(search)) return true;
  const content = htmlToSearchText(node.data?.content || '').toLowerCase();
  return content.includes(search);
}

export function collectSearchHits(nodes, searchTerm) {
  const search = (searchTerm || '').trim().toLowerCase();
  if (!search) return [];
  const hits = [];

  const walk = (list) => {
    (list || []).forEach((node) => {
      if (!node) return;
      if (isNote(node)) {
        if (nodeMatchesQuery(node, search)) hits.push(node);
        return;
      }
      if (isQuickNotesGroup(node)) {
        walk(node.children);
        return;
      }
      if (isNotebook(node)) {
        if ((node.label || '').toLowerCase().includes(search)) hits.push(node);
        walk(node.children);
      }
    });
  };

  walk(nodes);
  return hits;
}

export function findFolderPath(nodes, key, trail = []) {
  for (const node of nodes || []) {
    if (!node) continue;
    if (node.key === key && isNotebook(node)) return [...trail, node.key];
    if (node.children && node.children.length) {
      const nextTrail = isNotebook(node) ? [...trail, node.key] : trail;
      const found = findFolderPath(node.children, key, nextTrail);
      if (found) return found;
    }
  }
  return null;
}

export function resolveBrowse(nodes, stack) {
  const crumbs = [{ key: null, label: 'Notas' }];
  let children = nodes || [];
  const nextStack = [];

  for (const key of stack || []) {
    const folder = children.find((node) => node && node.key === key && isNotebook(node));
    if (!folder) break;
    nextStack.push(key);
    crumbs.push({ key: folder.key, label: folder.label || 'Libreta' });
    children = folder.children || [];
  }

  const atRoot = nextStack.length === 0;
  return {
    crumbs,
    stack: nextStack,
    children: (children || []).filter((node) => {
      if (!node) return false;
      if (atRoot && isQuickNotesGroup(node)) return true;
      if (isQuickNotesGroup(node)) return false;
      return isNotebook(node) || isNote(node);
    })
  };
}

export function countNotesInFolder(folderNode) {
  let count = 0;
  const walk = (node) => {
    (node?.children || []).forEach((child) => {
      if (isNotebook(child)) walk(child);
      else if (isNote(child)) count += 1;
    });
  };
  walk(folderNode);
  return count;
}

export function relativeNoteDate(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThat = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfThat) / 86400000);
  if (dayDiff === 0) return 'Hoy';
  if (dayDiff === 1) return 'Ayer';
  if (dayDiff > 1 && dayDiff < 7) return `Hace ${dayDiff} días`;
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function timelineBucket(ts) {
  if (!ts) return 'older';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return 'older';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 86400000;
  const t = date.getTime();
  if (t >= startOfToday) return 'today';
  if (t >= startOfWeek) return 'week';
  return 'older';
}

export function collectDescendantNotes(nodes) {
  const notes = [];
  const walk = (list) => {
    (list || []).forEach((node) => {
      if (isNote(node)) notes.push(node);
      else if (isNotebook(node) || isQuickNotesGroup(node)) walk(node.children);
    });
  };
  walk(nodes);
  return notes;
}

export function groupNotesByTag(notes) {
  const groups = new Map();
  const untagged = [];
  (notes || []).forEach((node) => {
    const tags = Array.isArray(node.data?.tags)
      ? node.data.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];
    if (!tags.length) {
      untagged.push(node);
      return;
    }
    tags.forEach((tag) => {
      const key = tag.toLowerCase();
      if (!groups.has(key)) groups.set(key, { title: tag, items: [] });
      groups.get(key).items.push(node);
    });
  });
  const sections = [...groups.values()].sort((a, b) => a.title.localeCompare(b.title, 'es'));
  if (untagged.length) sections.push({ title: 'Sin etiqueta', items: untagged });
  return sections;
}

export function notebookSpineColor(node) {
  const source = String(node?.data?.customIcon || node?.key || node?.label || '');
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }
  const palette = [
    '#5e81ac', '#bf616a', '#a3be8c', '#ebcb8b', '#b48ead',
    '#88c0d0', '#d08770', '#81a1c1', '#8fbcbb', '#4c6ef5'
  ];
  return palette[Math.abs(hash) % palette.length];
}

const ROMAN = [
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
];

export function toRoman(n) {
  if (n <= 0) return String(n);
  let remaining = n;
  let out = '';
  for (const [value, glyph] of ROMAN) {
    while (remaining >= value) {
      out += glyph;
      remaining -= value;
    }
  }
  return out;
}

export function notesSubtitle(node) {
  if (isQuickNotesGroup(node)) {
    const count = (node.children || []).filter(isNote).length;
    return count === 1 ? '1 nota rápida' : `${count} notas rápidas`;
  }
  if (isNotebook(node)) {
    const count = countNotesInFolder(node);
    return count === 1 ? '1 nota' : `${count} notas`;
  }
  return relativeNoteDate(node.data?.updatedAt || node.data?.createdAt) || 'Nota';
}
