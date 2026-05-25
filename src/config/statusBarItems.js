export const STATUSBAR_LAYOUT_STORAGE_KEY = 'basicapp_statusbar_layout';
export const LEGACY_SHOW_NETWORK_DISKS_KEY = 'localShowNetworkDisks';

export const STATUSBAR_FIXED_ITEM_IDS = ['settings'];

export const STATUSBAR_CONFIGURABLE_ITEMS = [
  { id: 'host', labelKey: 'statusBar.items.host', shortLabelKey: 'statusBar.itemsShort.host' },
  { id: 'cpu', labelKey: 'statusBar.items.cpu', shortLabelKey: 'statusBar.itemsShort.cpu' },
  { id: 'memory', labelKey: 'statusBar.items.memory', shortLabelKey: 'statusBar.itemsShort.memory' },
  { id: 'gpu', labelKey: 'statusBar.items.gpu', shortLabelKey: 'statusBar.itemsShort.gpu' },
  { id: 'network', labelKey: 'statusBar.items.network', shortLabelKey: 'statusBar.itemsShort.network' },
  { id: 'diskLocal', labelKey: 'statusBar.items.diskLocal', shortLabelKey: 'statusBar.itemsShort.diskLocal' },
  { id: 'diskNetwork', labelKey: 'statusBar.items.diskNetwork', shortLabelKey: 'statusBar.itemsShort.diskNetwork' },
  { id: 'uptime', labelKey: 'statusBar.items.uptime', shortLabelKey: 'statusBar.itemsShort.uptime' },
  { id: 'ip', labelKey: 'statusBar.items.ip', shortLabelKey: 'statusBar.itemsShort.ip' },
  { id: 'version', labelKey: 'statusBar.items.version', shortLabelKey: 'statusBar.itemsShort.version' }
];

export const STATUSBAR_ALL_ITEM_IDS = [
  ...STATUSBAR_CONFIGURABLE_ITEMS.map((item) => item.id),
  ...STATUSBAR_FIXED_ITEM_IDS
];

export const DEFAULT_STATUSBAR_LAYOUT = {
  order: STATUSBAR_CONFIGURABLE_ITEMS.map((item) => item.id),
  hidden: []
};

const KNOWN_IDS = new Set(STATUSBAR_ALL_ITEM_IDS);

export function normalizeStatusBarLayout(raw) {
  const base = { ...DEFAULT_STATUSBAR_LAYOUT };
  if (!raw || typeof raw !== 'object') {
    return applyLegacyNetworkDisksMigration(base);
  }

  const order = Array.isArray(raw.order)
    ? raw.order.filter((id) => KNOWN_IDS.has(id) && id !== 'settings')
    : [...base.order];

  const hiddenSet = new Set(
    Array.isArray(raw.hidden)
      ? raw.hidden.filter((id) => KNOWN_IDS.has(id) && !STATUSBAR_FIXED_ITEM_IDS.includes(id))
      : []
  );

  STATUSBAR_CONFIGURABLE_ITEMS.forEach(({ id }) => {
    if (!order.includes(id)) {
      order.push(id);
    }
  });

  const hidden = [...hiddenSet];
  return { order, hidden };
}

function applyLegacyNetworkDisksMigration(layout) {
  try {
    const legacy = localStorage.getItem(LEGACY_SHOW_NETWORK_DISKS_KEY);
    if (legacy === 'false' && !layout.hidden.includes('diskNetwork')) {
      return {
        ...layout,
        hidden: [...layout.hidden, 'diskNetwork']
      };
    }
  } catch {
    /* noop */
  }
  return layout;
}

export function loadStatusBarLayout() {
  try {
    const item = localStorage.getItem(STATUSBAR_LAYOUT_STORAGE_KEY);
    if (item === null) {
      return applyLegacyNetworkDisksMigration({ ...DEFAULT_STATUSBAR_LAYOUT });
    }
    return normalizeStatusBarLayout(JSON.parse(item));
  } catch {
    return applyLegacyNetworkDisksMigration({ ...DEFAULT_STATUSBAR_LAYOUT });
  }
}

export function saveStatusBarLayout(layout) {
  const normalized = normalizeStatusBarLayout(layout);
  try {
    localStorage.setItem(STATUSBAR_LAYOUT_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('statusbar-layout-changed', { detail: normalized }));
    window.dispatchEvent(new StorageEvent('storage', {
      key: STATUSBAR_LAYOUT_STORAGE_KEY,
      newValue: JSON.stringify(normalized)
    }));
  } catch (error) {
    console.warn('Error saving status bar layout:', error);
  }
  return normalized;
}

export function getVisibleStatusBarOrder(layout) {
  const normalized = normalizeStatusBarLayout(layout);
  const hiddenSet = new Set(normalized.hidden);
  return normalized.order.filter((id) => !hiddenSet.has(id));
}

export function isStatusBarItemVisible(layout, itemId) {
  return getVisibleStatusBarOrder(layout).includes(itemId);
}
