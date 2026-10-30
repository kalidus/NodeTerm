/**
 * Utilidades compartidas de la UI forense.
 */

export const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];

export const SEVERITY_LABEL = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
  info: 'Info'
};

export const SEVERITY_COLOR = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#94a3b8',
  none: '#22c55e'
};

export const RISK_LABEL = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
  none: 'Sin hallazgos'
};

export const CATEGORY_LABEL = {
  meta: 'Sistema',
  processes: 'Procesos',
  network: 'Red',
  users: 'Usuarios',
  logins: 'Accesos',
  persistence: 'Persistencia',
  kernel: 'Kernel',
  files: 'Ficheros',
  logs: 'Logs',
  packages: 'Paquetes',
  containers: 'Contenedores',
  security: 'Seguridad',
  config: 'Configuración',
  system: 'Sistema',
  'upload-tool': 'Herramienta subida'
};

/** Agrupación de categorías de artefactos por pestaña de resultados. */
export const ARTIFACT_TABS = [
  { key: 'processes', label: 'Procesos', icon: 'pi pi-cog', categories: ['processes'] },
  { key: 'network', label: 'Red', icon: 'pi pi-share-alt', categories: ['network'] },
  { key: 'users', label: 'Usuarios', icon: 'pi pi-users', categories: ['users', 'logins'] },
  { key: 'persistence', label: 'Persistencia', icon: 'pi pi-lock', categories: ['persistence', 'kernel'] },
  { key: 'logs', label: 'Logs', icon: 'pi pi-book', categories: ['logs'] },
  { key: 'files', label: 'Ficheros y sistema', icon: 'pi pi-folder', categories: ['files', 'packages', 'containers', 'security', 'config', 'system', 'meta', 'upload-tool'] }
];

export function ipc() {
  return window?.electron?.ipcRenderer || null;
}

export async function invoke(channel, payload) {
  const api = ipc();
  if (!api) throw new Error('IPC de Electron no disponible');
  const res = await api.invoke(channel, payload || {});
  if (res && res.success === false) throw new Error(res.error || 'Error desconocido');
  return res;
}

export function notify(severity, summary, detail) {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(severity, summary, detail);
  }
}

export function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

export function formatBytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1024 / 1024).toFixed(1)} MB`;
}

export function platformLabel(p) {
  return { linux: 'Linux', windows: 'Windows', network: 'Equipo de red', auto: 'Detectar' }[p] || p || '-';
}

/** Intenta interpretar el texto como JSON tabular (salida de PowerShell). */
export function tryParseJsonRows(text) {
  const s = String(text || '').trim();
  if (!s || (s[0] !== '[' && s[0] !== '{')) return null;
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      return parsed.every((r) => r && typeof r === 'object' && !Array.isArray(r)) ? parsed : null;
    }
    return parsed && typeof parsed === 'object' ? [parsed] : null;
  } catch (_) {
    return null;
  }
}

export function cellText(value) {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
