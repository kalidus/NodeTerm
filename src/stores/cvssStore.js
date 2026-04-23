const CVSS_TEMPLATES_KEY = 'nodeterm_cvss_templates_v1';
const CVSS_HISTORY_KEY = 'nodeterm_cvss_history_v1';
const MAX_HISTORY_ITEMS = 200;

function safeReadArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function safeWriteArray(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('[cvssStore] Error guardando datos:', error);
    return false;
  }
}

function nowIso() {
  return new Date().toISOString();
}

export const cvssStore = {
  getTemplates() {
    return safeReadArray(CVSS_TEMPLATES_KEY);
  },

  saveTemplate({ id, name, description = '', metrics, tags = [] }) {
    const templates = this.getTemplates();
    const templateId = id || `cvss-template-${Date.now()}`;
    const existingIndex = templates.findIndex((item) => item.id === templateId);
    const payload = {
      id: templateId,
      name: name?.trim() || 'Template CVSS',
      description: description?.trim() || '',
      tags: Array.isArray(tags) ? tags : [],
      metrics: { ...metrics },
      updatedAt: nowIso(),
      createdAt: existingIndex >= 0 ? templates[existingIndex].createdAt : nowIso()
    };

    if (existingIndex >= 0) {
      templates[existingIndex] = payload;
    } else {
      templates.push(payload);
    }

    safeWriteArray(CVSS_TEMPLATES_KEY, templates);
    return payload;
  },

  renameTemplate(id, newName) {
    const templates = this.getTemplates().map((item) =>
      item.id === id ? { ...item, name: newName?.trim() || item.name, updatedAt: nowIso() } : item
    );
    safeWriteArray(CVSS_TEMPLATES_KEY, templates);
  },

  deleteTemplate(id) {
    const templates = this.getTemplates().filter((item) => item.id !== id);
    safeWriteArray(CVSS_TEMPLATES_KEY, templates);
  },

  getHistory() {
    return safeReadArray(CVSS_HISTORY_KEY);
  },

  addHistoryEntry(entry) {
    const history = this.getHistory();
    const payload = {
      id: `cvss-report-${Date.now()}`,
      createdAt: nowIso(),
      ...entry
    };
    const next = [payload, ...history].slice(0, MAX_HISTORY_ITEMS);
    safeWriteArray(CVSS_HISTORY_KEY, next);
    return payload;
  },

  removeHistoryEntry(id) {
    const history = this.getHistory().filter((item) => item.id !== id);
    safeWriteArray(CVSS_HISTORY_KEY, history);
  },

  clearHistory() {
    safeWriteArray(CVSS_HISTORY_KEY, []);
  }
};
