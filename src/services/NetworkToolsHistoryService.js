import localStorageSyncService from './LocalStorageSyncService';

const STORAGE_KEY = 'nodeterm_network_tools_history';
const MAX_UNPINNED = 15;
const WHOIS_RAW_MAX = 8000;

function cloneAndTrim(result) {
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
  return copy;
}

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function saveAll(items) {
  try {
    const serialized = JSON.stringify(items);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorageSyncService.debouncedSync({ [STORAGE_KEY]: serialized });
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
  const entry = {
    id: existing ? existing.id : `nth-${now}-${Math.random().toString(36).slice(2, 8)}`,
    toolId,
    target: String(target).trim(),
    params: params && typeof params === 'object' ? params : {},
    result: cloneAndTrim(result),
    summary: summary || '',
    pinned: existing ? Boolean(existing.pinned) : false,
    createdAt: now
  };
  const merged = [entry, ...all.filter((item) => item.id !== entry.id)];
  const toolItems = merged.filter((item) => item.toolId === toolId);
  const pinned = toolItems.filter((item) => item.pinned);
  const unpinned = toolItems.filter((item) => !item.pinned).slice(0, MAX_UNPINNED);
  const keepIds = new Set([...pinned, ...unpinned].map((item) => item.id));
  const next = merged.filter((item) => item.toolId !== toolId || keepIds.has(item.id));
  saveAll(next);
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
    item.id === id ? { ...item, pinned: !item.pinned } : item
  ));
  saveAll(next);
}

function remove(id) {
  saveAll(loadAll().filter((item) => item.id !== id));
}

const networkToolsHistoryService = {
  STORAGE_KEY,
  record,
  list,
  togglePin,
  remove
};

export default networkToolsHistoryService;
