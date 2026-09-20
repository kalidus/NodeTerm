import { STORAGE_KEYS } from './constants';
import { getPlatformDefaultTerminalType } from './defaultLocalTerminal';
import { persistHomeTabSetting } from './homeTabSync';

export const HOME_DOCK_PINS_KEY = STORAGE_KEYS.HOME_TAB_DOCK_PINS || 'nodeterm_home_dock_pins';
export const HOME_JUMP_PINS_KEY = STORAGE_KEYS.HOME_TAB_JUMP_PINS || 'nodeterm_home_jump_pins';

export const DOCK_GROUPS = [
  { id: 'connect', label: 'Conectar' },
  { id: 'data', label: 'Datos' },
  { id: 'system', label: 'Sistema' }
];

export const DOCK_ACTIONS = [
  {
    id: 'new-connection',
    label: 'Nueva conexion',
    icon: 'pi pi-plus',
    color: '#22c55e',
    keywords: 'nueva ssh rdp vnc host conexion',
    event: 'open-new-unified-connection-dialog',
    group: 'connect'
  },
  {
    id: 'new-group',
    label: 'Nuevo grupo',
    icon: 'pi pi-th-large',
    color: '#ff9800',
    keywords: 'grupo pestanas tabs workspace',
    event: 'open-create-group-dialog',
    group: 'connect'
  },
  {
    id: 'tools',
    label: 'Herramientas de red',
    icon: 'pi pi-wrench',
    color: '#06b6d4',
    keywords: 'ping dns scan red wol ssl',
    event: 'open-network-tools-dialog',
    group: 'connect'
  },
  {
    id: 'local-terminal',
    label: 'Terminal local',
    icon: 'pi pi-desktop',
    color: '#4fc3f7',
    keywords: 'powershell wsl bash cmd shell',
    run: 'local-terminal',
    group: 'connect'
  },
  {
    id: 'vault',
    label: 'Vault / secretos',
    icon: 'pi pi-lock',
    color: '#f59e0b',
    keywords: 'password secreto vault clave',
    event: 'open-password-manager',
    group: 'data'
  },
  {
    id: 'audit',
    label: 'Auditoria',
    icon: 'pi pi-history',
    color: '#a855f7',
    keywords: 'grabacion audit recording',
    run: 'audit',
    group: 'data'
  },
  {
    id: 'import-export',
    label: 'Importar / Exportar',
    icon: 'pi pi-arrow-right-arrow-left',
    color: '#34d399',
    keywords: 'import export backup nodeterm mremoteng keepass',
    settingsTab: 'importar-exportar',
    group: 'data'
  },
  {
    id: 'sync',
    label: 'Sincronizacion',
    icon: 'pi pi-cloud',
    color: '#60a5fa',
    keywords: 'nextcloud sync nube cloud',
    settingsTab: 'sincronizacion',
    group: 'data'
  },
  {
    id: 'settings',
    label: 'Configuracion',
    icon: 'pi pi-cog',
    color: '#b0bec5',
    keywords: 'ajustes settings preferencias',
    run: 'settings',
    group: 'system'
  },
  {
    id: 'palette',
    label: 'Paleta de comandos',
    icon: 'pi pi-search',
    color: '#818cf8',
    keywords: 'buscar palette comando ctrl k',
    event: 'open-command-palette',
    group: 'system'
  },
  {
    id: 'stats',
    label: 'Estadisticas',
    icon: 'pi pi-chart-pie',
    color: '#ec4899',
    keywords: 'stats estadisticas metricas',
    run: 'stats',
    group: 'system'
  },
  {
    id: 'about',
    label: 'Acerca de',
    icon: 'pi pi-info-circle',
    color: '#94a3b8',
    keywords: 'about version informacion',
    settingsTab: 'informacion',
    group: 'system'
  }
];

export const DEFAULT_DOCK_PINS = [
  { type: 'action', id: 'new-connection' },
  { type: 'action', id: 'tools' },
  { type: 'action', id: 'vault' },
  { type: 'action', id: 'local-terminal' },
  { type: 'action', id: 'settings' }
];

function safeParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function getDockPins() {
  try {
    return safeParse(localStorage.getItem(HOME_DOCK_PINS_KEY), DEFAULT_DOCK_PINS);
  } catch {
    return DEFAULT_DOCK_PINS;
  }
}

export function saveDockPins(pins) {
  const next = Array.isArray(pins) ? pins.slice(0, 12) : DEFAULT_DOCK_PINS;
  persistHomeTabSetting(HOME_DOCK_PINS_KEY, JSON.stringify(next));
  try {
    window.dispatchEvent(new CustomEvent('home-dock-pins-changed', { detail: { pins: next } }));
  } catch {
    // ignore
  }
  return next;
}

export function getJumpPins() {
  try {
    return safeParse(localStorage.getItem(HOME_JUMP_PINS_KEY), []);
  } catch {
    return [];
  }
}

export function saveJumpPins(ids) {
  const next = Array.isArray(ids) ? ids.filter(Boolean).slice(0, 8) : [];
  persistHomeTabSetting(HOME_JUMP_PINS_KEY, JSON.stringify(next));
  try {
    window.dispatchEvent(new CustomEvent('home-jump-pins-changed', { detail: { ids: next } }));
  } catch {
    // ignore
  }
  return next;
}

export function pinHostToDock(connection) {
  if (!connection) return getDockPins();
  const connId = connection.id || connection.key;
  if (!connId) return getDockPins();
  const pins = getDockPins();
  if (pins.some((p) => p.type === 'host' && (p.id === connId || p.connectionId === connId))) {
    return pins;
  }
  return saveDockPins([
    ...pins,
    {
      type: 'host',
      id: `host:${connId}`,
      connectionId: connId,
      name: connection.name || connection.label || connId,
      hostType: connection.type,
      host: connection.host || connection.hostname || ''
    }
  ]);
}

export function unpinDockItem(pinId) {
  return saveDockPins(getDockPins().filter((p) => p.id !== pinId));
}

export function reorderDockPins(fromIndex, toIndex) {
  const pins = getDockPins().slice();
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= pins.length || toIndex >= pins.length) {
    return pins;
  }
  const [moved] = pins.splice(fromIndex, 1);
  pins.splice(toIndex, 0, moved);
  return saveDockPins(pins);
}

export function getDockAction(id) {
  return DOCK_ACTIONS.find((a) => a.id === id) || null;
}

export function groupDockActions(actions) {
  const list = Array.isArray(actions) ? actions : [];
  return DOCK_GROUPS
    .map((group) => ({
      ...group,
      actions: list.filter((action) => action.group === group.id)
    }))
    .filter((group) => group.actions.length > 0);
}

export function filterPaletteActions(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return DOCK_ACTIONS;
  return DOCK_ACTIONS.filter((action) => {
    const hay = `${action.label} ${action.keywords} ${action.id}`.toLowerCase();
    return hay.includes(q);
  });
}

async function openGlobalAudit() {
  try {
    const result = await window.electron?.audit?.getAllRecordings?.();
    if (result && result.success && Array.isArray(result.recordings) && result.recordings.length > 0) {
      window.dispatchEvent(new CustomEvent('create-audit-tab', {
        detail: {
          tabId: `audit_global_${Date.now()}`,
          title: 'Auditoria Global',
          recordings: result.recordings
        }
      }));
      return;
    }
    if (window.showToast) {
      window.showToast('info', 'Sin grabaciones', 'No hay grabaciones disponibles para mostrar');
    }
  } catch (err) {
    console.warn('[HomeDock] Error abriendo auditoria:', err?.message || err);
  }
}

function openSettingsTab(mainTab) {
  window.dispatchEvent(new CustomEvent('open-settings-tab', {
    detail: { mainTab }
  }));
}

export function runDockAction(actionId, { onOpenSettings } = {}) {
  const action = getDockAction(actionId);
  if (!action) return;

  if (action.event) {
    window.dispatchEvent(new CustomEvent(action.event));
    return;
  }

  if (action.settingsTab) {
    openSettingsTab(action.settingsTab);
    return;
  }

  if (action.run === 'settings') {
    if (onOpenSettings) onOpenSettings();
    else window.dispatchEvent(new CustomEvent('open-settings-dialog'));
    return;
  }

  if (action.run === 'local-terminal') {
    const terminalType = getPlatformDefaultTerminalType();
    window.dispatchEvent(new CustomEvent('home-tab-add-terminal', {
      detail: { terminalType }
    }));
    return;
  }

  if (action.run === 'audit') {
    openGlobalAudit();
    return;
  }

  if (action.run === 'stats') {
    window.dispatchEvent(new CustomEvent('open-app-stats'));
  }
}
