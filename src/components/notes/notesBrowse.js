import { viewerKindFor, formatFileSize } from '../../shared/library-mime';
import { getVaultRootId, isVaultRoot, DEFAULT_VAULT_ID } from '../../shared/vault-connection-trees';

const NOTE_TYPES = ['document', 'quick-note'];

export const TIMELINE_SECTIONS = [
  { id: 'today', title: 'Hoy' },
  { id: 'week', title: 'Esta semana' },
  { id: 'older', title: 'Anterior' }
];

export function isQuickNotesGroup(node) {
  return Boolean(node && node.key === 'quick_note');
}

/** Carpeta local montada: sus hijos se listan bajo demanda, no se persisten. */
export function isLinkedFolder(node) {
  return Boolean(node && (node.data?.type === 'linked-folder' || node.type === 'linked-folder'));
}

/** Carpeta de Nextcloud montada: se lista por WebDAV y no se copia a la app. */
export function isCloudFolder(node) {
  return Boolean(node && (node.data?.type === 'cloud-folder' || node.type === 'cloud-folder'));
}

/** Archivo de la biblioteca (PDF, imagen, media, texto...). */
export function isLibraryFile(node) {
  return Boolean(node && (node.data?.type === 'library-file' || node.type === 'library-file'));
}

export function isNotebook(node) {
  if (!node || isQuickNotesGroup(node)) return false;
  if (isLinkedFolder(node) || isCloudFolder(node)) return true;
  return Boolean(node.droppable || node.data?.type === 'document-folder');
}

/** Solo carpetas reales de la biblioteca: admiten crear, importar y pegar dentro. */
export function isManagedFolder(node) {
  return Boolean(node) && isNotebook(node) && !isLinkedFolder(node) && !isCloudFolder(node);
}

export function isNote(node) {
  const type = node?.data?.type || node?.type;
  return Boolean(node && NOTE_TYPES.includes(type) && !isNotebook(node) && !isQuickNotesGroup(node));
}

/** Cualquier hoja abrible: nota del editor o archivo del visor. */
export function isOpenableItem(node) {
  return isNote(node) || isLibraryFile(node);
}

export function isBrowsableItem(node) {
  return Boolean(node && (isNotebook(node) || isNote(node) || isLibraryFile(node) || isQuickNotesGroup(node)));
}

/** Categoría de visor del nodo de archivo. */
export function libraryFileKind(node) {
  if (!isLibraryFile(node)) return 'unsupported';
  return viewerKindFor(node.data?.mime, node.label || node.data?.relPath || node.data?.absPath || node.data?.remotePath);
}

function htmlToSearchText(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function noteSnippet(node, maxLen = 120) {
  if (isNotebook(node) || isQuickNotesGroup(node)) return '';
  if (isLibraryFile(node)) {
    const size = formatFileSize(node.data?.size);
    const ext = (node.data?.ext || '').toUpperCase();
    return [ext, size].filter(Boolean).join(' · ') || 'Archivo';
  }
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
      if (isNote(node) || isLibraryFile(node)) {
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
  const crumbs = [{ key: null, label: 'Biblioteca' }];
  let children = nodes || [];
  const nextStack = [];

  for (const key of stack || []) {
    const folder = children.find((node) => node && node.key === key && isNotebook(node));
    if (!folder) break;
    nextStack.push(key);
    crumbs.push({ key: folder.key, label: folder.label || 'Carpeta' });
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
      return isNotebook(node) || isNote(node) || isLibraryFile(node);
    })
  };
}

export function countNotesInFolder(folderNode) {
  let count = 0;
  const walk = (node) => {
    (node?.children || []).forEach((child) => {
      if (isNotebook(child)) walk(child);
      else if (isNote(child) || isLibraryFile(child)) count += 1;
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
      if (isNote(node) || isLibraryFile(node)) notes.push(node);
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

/** Claves sintéticas de la vista Cuaderno. No se persisten en el árbol. */
export const NOTEBOOK_LOOSE_KEY = '__notebook_loose__';
export const NOTEBOOK_PAGES_KEY = '__notebook_pages__';
export const NOTEBOOK_QUICK_KEY = 'quick_note';
export const NOTEBOOK_NAV_STORAGE_KEY = 'documents_notebook_nav';

/**
 * Nivel plano de la biblioteca cuando el árbol no trae vaults.
 * Con vaults, no mezcla sus hijos: cada vault es un grupo del selector.
 */
export function libraryLevelNodes(nodes) {
  const list = Array.isArray(nodes) ? nodes : [];
  if (!list.some((node) => isVaultRoot(node))) return list;
  return list.filter((node) => node && !isVaultRoot(node));
}

/** Clave de la entrada «Páginas» de un vault. En un árbol plano se usa «Sueltas». */
export function notebookPagesKey(parentKey) {
  return parentKey ? `${NOTEBOOK_PAGES_KEY}:${parentKey}` : NOTEBOOK_LOOSE_KEY;
}

/** Carpeta donde deben caer las notas sueltas y el primer cuaderno, si hay vault. */
export function looseNotesParentKey(nodes) {
  const list = Array.isArray(nodes) ? nodes : [];
  if (!list.some((node) => isVaultRoot(node))) return null;
  const vault = list.find((node) => (
    isVaultRoot(node)
    && !node.data?.locked
    && getVaultRootId(node) === DEFAULT_VAULT_ID
  )) || list.find((node) => isVaultRoot(node) && !node.data?.locked);
  return vault?.key || null;
}

export function findQuickNotesGroup(nodes) {
  const walk = (list) => {
    for (const node of list || []) {
      if (!node) continue;
      if (isQuickNotesGroup(node)) return node;
      if (node.children?.length) {
        const found = walk(node.children);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(nodes);
}

function isUserFolder(node) {
  return isManagedFolder(node) && !isVaultRoot(node);
}

function notebooksFromLevel(children, pagesParentKey, looseLabel, looseKey) {
  const notebooks = [];
  let loose = false;
  (children || []).forEach((node) => {
    if (!node || isQuickNotesGroup(node) || isVaultRoot(node)) return;
    if (isUserFolder(node)) {
      notebooks.push({
        key: node.key,
        label: node.label || 'Cuaderno',
        synthetic: false,
        node,
        pagesParentKey: null
      });
      return;
    }
    if (isNote(node)) loose = true;
  });
  if (loose) {
    notebooks.push({
      key: looseKey,
      label: looseLabel,
      synthetic: true,
      node: null,
      pagesParentKey: pagesParentKey || null
    });
  }
  return notebooks;
}

/**
 * Grupos del selector. Cada vault-root es un grupo, también si está bloqueado.
 * Sin vaults en el árbol, un único grupo sin título.
 */
export function listNotebookMenu(nodes) {
  const list = Array.isArray(nodes) ? nodes : [];
  const vaults = list.filter((node) => isVaultRoot(node));
  if (!vaults.length) {
    return [{
      key: null,
      label: null,
      locked: false,
      notebooks: notebooksFromLevel(list, null, 'Sueltas', NOTEBOOK_LOOSE_KEY)
    }];
  }
  const groups = vaults.map((vault) => {
    const locked = Boolean(vault.data?.locked);
    return {
      key: vault.key,
      label: vault.label || 'Vault',
      locked,
      notebooks: locked
        ? []
        : notebooksFromLevel(vault.children, vault.key, 'Páginas', notebookPagesKey(vault.key))
    };
  });
  const stray = list.filter((node) => node && !isVaultRoot(node));
  if (stray.length) {
    groups.push({
      key: null,
      label: null,
      locked: false,
      notebooks: notebooksFromLevel(stray, null, 'Sueltas', NOTEBOOK_LOOSE_KEY)
    });
  }
  return groups;
}

/** Cuadernos elegibles: los de cada grupo, sin los vaults bloqueados. */
export function listNotebooks(nodes) {
  return listNotebookMenu(nodes).flatMap((group) => group.notebooks);
}

function collectFolderSections(children, depth, ancestors, out) {
  (children || []).forEach((node) => {
    if (!isUserFolder(node)) return;
    const hasChildren = (node.children || []).some(isUserFolder);
    out.push({
      key: node.key,
      label: node.label || 'Sección',
      depth,
      synthetic: false,
      hasChildren,
      ancestorKeys: ancestors,
      node
    });
    collectFolderSections(node.children, depth + 1, [...ancestors, node.key], out);
  });
}

function pagesSection(depth = 0) {
  return {
    key: NOTEBOOK_PAGES_KEY,
    label: 'Páginas',
    depth,
    synthetic: true,
    hasChildren: false,
    ancestorKeys: [],
    node: null
  };
}

/** Secciones del cuaderno. Las notas colgando del cuaderno van a «Páginas». */
export function listNotebookSections(notebook, nodes) {
  if (!notebook) return [];
  if (notebook.synthetic) return [pagesSection()];
  const children = notebook.node?.children || [];
  const sections = [];
  collectFolderSections(children, 0, [], sections);
  const directNotes = children.some(isNote);
  if (directNotes || sections.length === 0) sections.unshift(pagesSection());
  return sections;
}

function findFolderByKey(node, key) {
  if (!node || !key) return null;
  if (node.key === key) return node;
  for (const child of node.children || []) {
    const found = findFolderByKey(child, key);
    if (found) return found;
  }
  return null;
}

/** Páginas (notas) hijas directas de la sección. Los archivos de biblioteca no entran. */
export function listSectionPages(nodes, notebook, sectionKey) {
  if (sectionKey === NOTEBOOK_QUICK_KEY) {
    const group = findQuickNotesGroup(nodes);
    return (group?.children || []).filter(isNote);
  }
  if (!notebook || !sectionKey) return [];
  if (sectionKey === NOTEBOOK_PAGES_KEY) {
    if (notebook.synthetic) {
      if (!notebook.pagesParentKey) return libraryLevelNodes(nodes).filter(isNote);
      const vault = (nodes || []).find((node) => node && node.key === notebook.pagesParentKey);
      return (vault?.children || []).filter(isNote);
    }
    return (notebook.node?.children || []).filter(isNote);
  }
  const folder = findFolderByKey(notebook.node, sectionKey);
  return (folder?.children || []).filter(isNote);
}

export function readNotebookNavState() {
  const empty = { notebookKey: null, sectionKey: null, collapsed: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(NOTEBOOK_NAV_STORAGE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return empty;
    const collapsed = {};
    if (raw.collapsed && typeof raw.collapsed === 'object') {
      Object.entries(raw.collapsed).forEach(([key, value]) => {
        if (value) collapsed[key] = true;
      });
    }
    return {
      notebookKey: typeof raw.notebookKey === 'string' ? raw.notebookKey : null,
      sectionKey: typeof raw.sectionKey === 'string' ? raw.sectionKey : null,
      collapsed
    };
  } catch {
    return empty;
  }
}

/** Elige un cuaderno y una sección que sigan existiendo. */
export function resolveNotebookNav(nodes, saved = {}) {
  const notebooks = listNotebooks(nodes);
  const notebook = notebooks.find((item) => item.key === saved.notebookKey) || notebooks[0] || null;
  const notebookKey = notebook ? notebook.key : null;
  let sectionKey = saved.sectionKey || null;
  if (sectionKey !== NOTEBOOK_QUICK_KEY) {
    const sections = notebook ? listNotebookSections(notebook, nodes) : [];
    const match = sections.find((section) => section.key === sectionKey);
    sectionKey = match ? match.key : (sections[0]?.key || null);
  }
  return { notebooks, notebook, notebookKey, sectionKey };
}

/** Carpeta donde crear la página de la sección activa. Null en notas rápidas. */
export function notebookPageParentKey(nodes, saved) {
  const { notebook, sectionKey } = resolveNotebookNav(nodes, saved);
  if (!sectionKey || sectionKey === NOTEBOOK_QUICK_KEY) return null;
  if (sectionKey === NOTEBOOK_PAGES_KEY) {
    if (!notebook || notebook.synthetic) return notebook?.pagesParentKey || null;
    return notebook.key;
  }
  return sectionKey;
}

/** Vault donde crear un cuaderno nuevo, o null si el árbol es plano. */
export function notebookVaultKey(nodes, saved) {
  const { notebook } = resolveNotebookNav(nodes, saved);
  const list = Array.isArray(nodes) ? nodes : [];
  if (!list.some((node) => isVaultRoot(node))) return null;
  if (notebook?.pagesParentKey) return notebook.pagesParentKey;
  if (notebook && !notebook.synthetic) {
    const owner = list.find((node) => (
      isVaultRoot(node)
      && !node.data?.locked
      && findFolderByKey(node, notebook.key)
    ));
    if (owner) return owner.key;
  }
  return looseNotesParentKey(nodes);
}

export function notesSubtitle(node) {
  if (isQuickNotesGroup(node)) {
    const count = (node.children || []).filter(isNote).length;
    return count === 1 ? '1 nota rápida' : `${count} notas rápidas`;
  }
  if (isLinkedFolder(node)) {
    return node.data?.absPath || 'Carpeta enlazada';
  }
  if (isCloudFolder(node)) {
    return node.data?.remotePath ? `Nextcloud · ${node.data.remotePath}` : 'Carpeta de Nextcloud';
  }
  if (isNotebook(node)) {
    const count = countNotesInFolder(node);
    return count === 1 ? '1 elemento' : `${count} elementos`;
  }
  if (isLibraryFile(node)) {
    return formatFileSize(node.data?.size) || (node.data?.ext || '').toUpperCase() || 'Archivo';
  }
  return relativeNoteDate(node.data?.updatedAt || node.data?.createdAt) || 'Nota';
}
