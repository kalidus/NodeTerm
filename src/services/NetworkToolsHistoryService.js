const STORAGE_KEY = 'nodeterm_network_tools_history';
const MAX_UNPINNED = 15;
const WHOIS_RAW_MAX = 8000;
/** Tope de result JSON para entradas pineadas (bytes aprox. del stringify). */
const PINNED_RESULT_MAX = 24000;
const UNPINNED_RESULT_MAX = 2000;

function cloneAndTrim(result, maxBytes = PINNED_RESULT_MAX) {
  if (!result || typeof result !== 'object') return result || null;
  let copy;
  try {
    copy = JSON.parse(JSON.stringify(result));
  } catch (_) {
    return null;
  }
  if (copy.certificate && copy.certificate.pem) {
    delete copy.certificate.pem;
  }
  if (copy.liveOutput != null) {
    delete copy.liveOutput;
  }
  if (typeof copy.rawData === 'string' && copy.rawData.length > WHOIS_RAW_MAX) {
    copy.rawData = `${copy.rawData.slice(0, WHOIS_RAW_MAX)}\n...`;
  }
  let serialized = JSON.stringify(copy);
  if (serialized.length > maxBytes) {
    // Mantener solo campos livianos si el resultado sigue siendo enorme
    const lean = {
      truncated: true,
      originalBytes: serialized.length
    };
    if (copy.hosts && Array.isArray(copy.hosts)) {
      lean.hostsCount = copy.hosts.length;
    }
    if (copy.subnet) lean.subnet = copy.subnet;
    if (copy.scanMode) lean.scanMode = copy.scanMode;
    if (copy.scanTime != null) lean.scanTime = copy.scanTime;
    copy = lean;
    serialized = JSON.stringify(copy);
  }
  return copy;
}

function slimEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const pinned = Boolean(entry.pinned);
  if (pinned) {
    return {
      ...entry,
      result: cloneAndTrim(entry.result, PINNED_RESULT_MAX)
    };
  }
  // Unpinned: solo metadatos + summary; sin result gordo
  const next = {
    id: entry.id,
    toolId: entry.toolId,
    target: entry.target,
    params: entry.params && typeof entry.params === 'object' ? entry.params : {},
    summary: entry.summary || '',
    pinned: false,
    createdAt: entry.createdAt || Date.now()
  };
  if (entry.result != null) {
    const tiny = cloneAndTrim(entry.result, UNPINNED_RESULT_MAX);
    if (tiny && JSON.stringify(tiny).length <= UNPINNED_RESULT_MAX) {
      next.result = tiny;
    }
  }
  return next;
}

function migrateSlimHistory(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { items: Array.isArray(items) ? items : [], changed: false };
  }
  let changed = false;
  const next = items.map((entry) => {
    const slim = slimEntry(entry);
    if (JSON.stringify(slim) !== JSON.stringify(entry)) {
      changed = true;
    }
    return slim;
  });
  return { items: next, changed };
}

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    const { items, changed } = migrateSlimHistory(list);
    if (changed) {
      saveAllLocal(items);
    }
    return items;
  } catch (_) {
    return [];
  }
}

/** Solo localStorage — no entra en SYNC_KEYS / app-data. */
function saveAllLocal(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('[NetworkToolsHistory] No se pudo guardar:', err);
  }
}

function record({ toolId, target, params, result, summary }) {
  if (!toolId || !target) return null;
  const all = loadAll();
  const targetKey = String(target).trim().toLowerCase();
  const existing = all.find((item) => (
    item.toolId === toolId && String(item.target || '').trim().toLowerCase() === targetKey
  ));
  const now = Date.now();
  const pinned = existing ? Boolean(existing.pinned) : false;
  const entry = slimEntry({
    id: existing ? existing.id : `nth-${now}-${Math.random().toString(36).slice(2, 8)}`,
    toolId,
    target: String(target).trim(),
    params: params && typeof params === 'object' ? params : {},
    result,
    summary: summary || '',
    pinned,
    createdAt: now
  });
  const merged = [entry, ...all.filter((item) => item.id !== entry.id)];
  const toolItems = merged.filter((item) => item.toolId === toolId);
  const pinnedItems = toolItems.filter((item) => item.pinned);
  const unpinned = toolItems.filter((item) => !item.pinned).slice(0, MAX_UNPINNED);
  const keepIds = new Set([...pinnedItems, ...unpinned].map((item) => item.id));
  const next = merged.filter((item) => item.toolId !== toolId || keepIds.has(item.id));
  saveAllLocal(next);
  return entry;
}

function list(toolId) {
  return loadAll()
    .filter((item) => item.toolId === toolId)
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
}

function togglePin(id) {
  const all = loadAll();
  const next = all.map((item) => (
    item.id === id ? slimEntry({ ...item, pinned: !item.pinned }) : item
  ));
  saveAllLocal(next);
}

function remove(id) {
  saveAllLocal(loadAll().filter((item) => item.id !== id));
}

const networkToolsHistoryService = {
  STORAGE_KEY,
  record,
  list,
  togglePin,
  remove,
  // Expuesto para tests
  _slimEntry: slimEntry,
  _migrateSlimHistory: migrateSlimHistory
};

export default networkToolsHistoryService;
