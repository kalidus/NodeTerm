import MiniSearch from 'minisearch';

export const SEARCH_CATEGORIES = [
  { id: 'all', label: 'Todo' },
  { id: 'connection', label: 'Conexiones' },
  { id: 'password', label: 'Contraseñas' },
  { id: 'note', label: 'Notas' }
];

export const GROUP_LABELS = {
  connection: 'Conexiones',
  password: 'Contraseñas',
  note: 'Notas'
};

const GROUP_ORDER = ['connection', 'password', 'note'];
const CAP_ALL = 12;
const CAP_ONE = 40;
const MIN_QUERY = 2;

function pushTerm(terms, value) {
  const term = String(value || '');
  if (term.length >= MIN_QUERY) terms.push(term);
}

export function tokenizeSearchText(text) {
  const raw = String(text || '').toLowerCase();
  if (!raw) return [];
  const chunks = raw.split(/[^\p{L}\p{N}.:_@/+-]+/u).filter(Boolean);
  const terms = [];
  for (const chunk of chunks) {
    pushTerm(terms, chunk);
    if (!/[.:_@/+-]/.test(chunk)) continue;
    const parts = chunk.split(/[.:_@/+-]+/).filter(Boolean);
    for (const part of parts) {
      if (part !== chunk) pushTerm(terms, part);
    }
    if (parts.length > 1) {
      for (let index = 0; index < parts.length; index += 1) {
        const suffix = parts.slice(index).join('.');
        if (suffix !== chunk) pushTerm(terms, suffix);
      }
    }
  }
  return [...new Set(terms)];
}

export function highlightParts(text, query) {
  const source = String(text || '');
  const tokens = tokenizeSearchText(query).sort((a, b) => b.length - a.length);
  if (!source || !tokens.length) return [{ text: source, match: false }];
  const escaped = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'ig');
  const parts = [];
  let last = 0;
  for (const match of source.matchAll(re)) {
    const index = match.index || 0;
    if (index > last) parts.push({ text: source.slice(last, index), match: false });
    parts.push({ text: match[0], match: true });
    last = index + match[0].length;
  }
  if (last < source.length) parts.push({ text: source.slice(last), match: false });
  if (!parts.length) parts.push({ text: source, match: false });
  return parts;
}

export function extractSnippet(source, query, radius = 42) {
  const text = String(source || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const tokens = tokenizeSearchText(query);
  const lower = text.toLowerCase();
  let idx = -1;
  for (const token of tokens) {
    idx = lower.indexOf(token);
    if (idx >= 0) break;
  }
  if (idx < 0) return text.length > 90 ? `${text.slice(0, 90).trim()}…` : text;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

export function emptySearchResult(query = '', category = 'all') {
  return {
    query,
    category,
    flat: [],
    groups: [],
    totals: { connection: 0, password: 0, note: 0 }
  };
}

function toHit(result, query) {
  const subtitle = result.subtitle || '';
  const labelHasQuery = tokenizeSearchText(query).some((token) =>
    String(result.label || '').toLowerCase().includes(token)
  );
  const subtitleHasQuery = tokenizeSearchText(query).some((token) =>
    subtitle.toLowerCase().includes(token)
  );
  const snippet = result.category === 'note' || (!labelHasQuery && !subtitleHasQuery)
    ? extractSnippet(result.detail, query)
    : '';
  return {
    id: result.id,
    key: result.key,
    category: result.category,
    kind: result.kind,
    label: result.label || '',
    subtitle,
    folder: result.folder || '',
    snippet,
    score: result.score
  };
}

export function createSearchIndex(docs) {
  const mini = new MiniSearch({
    fields: ['label', 'identity', 'detail'],
    storeFields: ['key', 'category', 'kind', 'label', 'subtitle', 'folder', 'detail'],
    tokenize: tokenizeSearchText,
    processTerm: (term) => {
      const normalized = String(term || '').toLowerCase();
      return normalized.length >= MIN_QUERY ? normalized : null;
    },
    searchOptions: {
      boost: { label: 5, identity: 3, detail: 1 },
      prefix: true,
      combineWith: 'AND'
    }
  });

  if (Array.isArray(docs) && docs.length) {
    mini.addAll(docs);
  }

  return {
    search(query, category = 'all') {
      const text = String(query || '').trim();
      const activeCategory = GROUP_ORDER.includes(category) ? category : 'all';
      if (text.length < MIN_QUERY) return emptySearchResult(text, activeCategory);

      const terms = tokenizeSearchText(text);
      const fuzzy = terms.some((term) => term.length >= 4) ? 0.2 : false;
      const results = mini.search(text, {
        prefix: true,
        fuzzy,
        combineWith: 'AND',
        boost: { label: 5, identity: 3, detail: 1 },
        filter: activeCategory === 'all' ? undefined : (result) => result.category === activeCategory
      });

      const buckets = { connection: [], password: [], note: [] };
      for (const result of results) {
        if (!buckets[result.category]) continue;
        buckets[result.category].push(toHit(result, text));
      }

      const order = activeCategory === 'all' ? GROUP_ORDER : [activeCategory];
      const cap = activeCategory === 'all' ? CAP_ALL : CAP_ONE;
      const groups = [];
      const flat = [];
      const totals = {
        connection: buckets.connection.length,
        password: buckets.password.length,
        note: buckets.note.length
      };

      for (const id of order) {
        const all = buckets[id];
        if (!all.length) continue;
        const items = all.slice(0, cap);
        groups.push({
          category: id,
          label: GROUP_LABELS[id],
          total: all.length,
          items
        });
        flat.push(...items);
      }

      return { query: text, category: activeCategory, flat, groups, totals };
    }
  };
}
