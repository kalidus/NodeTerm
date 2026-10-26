export const CONNECTIONS_LAYOUT_STORAGE_KEY = 'connections_sidebar_layout';

export const CONNECTIONS_LAYOUTS = [
  {
    id: 'tree',
    name: 'Árbol',
    description: 'Jerarquía con carpetas anidadas'
  },
  {
    id: 'hosts',
    name: 'Hosts',
    description: 'Rejilla de iconos grandes, como un rack'
  },
  {
    id: 'list',
    name: 'Lista',
    description: 'Filas con nombre y host, sin sangría'
  },
  {
    id: 'cards',
    name: 'Tarjetas',
    description: 'Protocolo, host y usuario'
  },
  {
    id: 'protocols',
    name: 'Por protocolo',
    description: 'SSH, RDP, VNC, archivos y túneles'
  },
  {
    id: 'status',
    name: 'Por estado',
    description: 'Conectadas, favoritas y el resto'
  }
];

const CONNECTIONS_LAYOUT_IDS = CONNECTIONS_LAYOUTS.map((item) => item.id);

export function isConnectionsLayout(value) {
  return CONNECTIONS_LAYOUT_IDS.includes(value);
}

export function readSavedConnectionsLayout() {
  try {
    const saved = localStorage.getItem(CONNECTIONS_LAYOUT_STORAGE_KEY);
    return isConnectionsLayout(saved) ? saved : 'tree';
  } catch {
    return 'tree';
  }
}
