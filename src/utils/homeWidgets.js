/**
 * Registro de widgets del canvas Home.
 * HomeTab/ConnectionHistory leen IDs desde aqui para layout, picker y presets.
 */

export const HOME_WIDGETS = [
  {
    id: 'search',
    title: 'Buscador',
    path: 'home',
    icon: 'pi pi-search',
    required: true,
    defaultVisible: true,
    minWidth: 220,
    minHeight: 90,
    defaultWidth: 560,
    defaultHeight: 200
  },
  {
    id: 'terminal',
    title: 'Terminal',
    path: 'local',
    icon: 'pi pi-desktop',
    required: true,
    defaultVisible: true,
    minWidth: 380,
    minHeight: 200,
    defaultWidth: 640,
    defaultHeight: 360
  },
  {
    id: 'favorites',
    title: 'Favoritos',
    path: 'favorites',
    icon: 'pi pi-star',
    required: false,
    group: 'conexiones',
    defaultVisible: true,
    minWidth: 250,
    minHeight: 140,
    defaultWidth: 420,
    defaultHeight: 220
  },
  {
    id: 'recents',
    title: 'Recientes',
    path: 'recent',
    icon: 'pi pi-clock',
    required: false,
    group: 'conexiones',
    defaultVisible: false,
    minWidth: 250,
    minHeight: 140,
    defaultWidth: 360,
    defaultHeight: 260
  },
  {
    id: 'sessions',
    title: 'Sesiones vivas',
    path: 'sessions',
    icon: 'pi pi-circle-fill',
    required: false,
    group: 'conexiones',
    defaultVisible: false,
    minWidth: 220,
    minHeight: 140,
    defaultWidth: 320,
    defaultHeight: 240
  },
  {
    id: 'vault',
    title: 'Vault',
    path: 'vault',
    icon: 'pi pi-lock',
    required: false,
    group: 'conexiones',
    defaultVisible: false,
    minWidth: 220,
    minHeight: 140,
    defaultWidth: 320,
    defaultHeight: 240
  },
  {
    id: 'notes',
    title: 'Notas rapidas',
    path: 'notes',
    icon: 'pi pi-file',
    required: false,
    group: 'workspace',
    defaultVisible: false,
    minWidth: 220,
    minHeight: 140,
    defaultWidth: 320,
    defaultHeight: 240
  },
  {
    id: 'groups',
    title: 'Grupos workspace',
    path: 'groups',
    icon: 'pi pi-th-large',
    required: false,
    group: 'workspace',
    defaultVisible: false,
    minWidth: 220,
    minHeight: 140,
    defaultWidth: 340,
    defaultHeight: 240
  },
  {
    id: 'sysmon',
    title: 'Hardware',
    path: 'sysmon',
    icon: 'pi pi-bolt',
    required: false,
    group: 'extra',
    defaultVisible: false,
    minWidth: 280,
    minHeight: 200,
    defaultWidth: 340,
    defaultHeight: 260
  },
  {
    id: 'filters',
    title: 'Filtros',
    path: 'filters',
    icon: 'pi pi-filter',
    required: false,
    group: 'workspace',
    defaultVisible: false,
    minWidth: 320,
    minHeight: 280,
    defaultWidth: 420,
    defaultHeight: 380
  },
  {
    id: 'quickbar',
    title: 'Acciones',
    path: 'acciones',
    icon: 'pi pi-ellipsis-h',
    required: false,
    group: 'workspace',
    defaultVisible: false,
    minWidth: 180,
    minHeight: 200,
    defaultWidth: 360,
    defaultHeight: 280
  },
  {
    id: 'releaseNotes',
    title: 'Novedades',
    path: 'releases',
    icon: 'pi pi-book',
    required: false,
    group: 'extra',
    defaultVisible: false,
    minWidth: 480,
    minHeight: 280,
    defaultWidth: 720,
    defaultHeight: 480
  }
];

export const HOME_WIDGET_IDS = HOME_WIDGETS.map((w) => w.id);

export function getHomeWidget(id) {
  return HOME_WIDGETS.find((w) => w.id === id) || null;
}

export function getOptionalHomeWidgets() {
  return HOME_WIDGETS.filter((w) => !w.required);
}

export const HOME_WIDGET_GROUP_ORDER = [
  { id: 'conexiones', label: 'Conexiones' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'extra', label: 'Extra' }
];

export function getOptionalHomeWidgetsByGroup() {
  const widgets = getOptionalHomeWidgets();
  const grouped = HOME_WIDGET_GROUP_ORDER.map((group) => ({
    ...group,
    widgets: widgets.filter((widget) => widget.group === group.id)
  })).filter((group) => group.widgets.length > 0);

  const knownIds = new Set(HOME_WIDGET_GROUP_ORDER.map((group) => group.id));
  const leftover = widgets.filter((widget) => !knownIds.has(widget.group));
  if (leftover.length > 0) {
    grouped.push({ id: 'otros', label: 'Otros', widgets: leftover });
  }
  return grouped;
}

export function createHiddenPanelState(widget, index = 0) {
  return {
    visible: false,
    x: 20 + (index % 3) * 24,
    y: 40 + (index % 3) * 24,
    width: widget.defaultWidth || 320,
    height: widget.defaultHeight || 240,
    minWidth: widget.minWidth,
    minHeight: widget.minHeight,
    zIndex: 14 + index,
    isMaximized: false
  };
}

export function ensureHomeWidgetLayout(layout = {}, canvasWidth = 1200, canvasHeight = 800) {
  const next = { ...layout };
  HOME_WIDGETS.forEach((widget, index) => {
    if (!next[widget.id] || typeof next[widget.id] !== 'object') {
      next[widget.id] = createHiddenPanelState(widget, index);
    }
  });
  const existingW = Number(next.canvasWidth);
  const existingH = Number(next.canvasHeight);
  if (!(existingW > 100)) {
    next.canvasWidth = canvasWidth > 100 ? canvasWidth : 1200;
  }
  if (!(existingH > 100)) {
    next.canvasHeight = canvasHeight > 100 ? canvasHeight : 800;
  }
  return next;
}

export function flattenVaultNodes(nodes, types) {
  const out = [];
  const walk = (list) => {
    if (!Array.isArray(list)) return;
    for (const node of list) {
      const data = node.data || node;
      const type = data.type || node.type;
      if (types.includes(type)) {
        out.push({
          id: node.key || data.id || data.key,
          key: node.key || data.id || data.key,
          name: node.label || data.name || data.title || '',
          label: node.label || data.name || data.title || '',
          type,
          username: data.username,
          url: data.url,
          group: data.group,
          host: data.host,
          updatedAt: data.updatedAt || data.modifiedAt || node.updatedAt,
          ...data
        });
      }
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

export const VAULT_SECRET_TYPES = ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note'];
export const NOTE_TYPES = ['document', 'quick-note'];
