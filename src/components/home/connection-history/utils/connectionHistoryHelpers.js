import { iconThemes } from '../../../../themes/icon-themes';
import { SSHIconPresets } from '../../../SSHIconSelector';
import { helpers } from '../../../../utils/connectionStore';

// Helper para ajustar la opacidad de los colores (Hex o RGBA)
export const adjustOpacity = (color, opacity) => {
	if (!color) return `rgba(0,0,0,${opacity})`;
	if (color.startsWith('rgba')) {
		return color.replace(/[\d.]+\)$/g, `${opacity})`);
	}
	if (color.startsWith('#')) {
		const hex = color.replace('#', '');
		const r = parseInt(hex.substring(0, 2), 16) || 0;
		const g = parseInt(hex.substring(2, 4), 16) || 0;
		const b = parseInt(hex.substring(4, 6), 16) || 0;
		return `rgba(${r}, ${g}, ${b}, ${opacity})`;
	}
	return color;
};

// Formatear "Hace 5m", "Hace 2 h", "Ayer", etc.
export function formatRelativeTime(iso) {
	if (!iso) return '-';
	const d = new Date(iso);
	if (isNaN(d.getTime())) return '-';
	const s = Math.floor((Date.now() - d) / 1000);
	if (s < 60) return 'Ahora';
	if (s < 3600) return `Hace ${Math.floor(s / 60)}m`;
	if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
	if (s < 172800) return 'Ayer';
	if (s < 604800) return `Hace ${Math.floor(s / 86400)} días`;
	if (s < 2592000) return `Hace ${Math.floor(s / 604800)} sem`;
	return `Hace ${Math.floor(s / 2592000)} mes`;
}

// Formato compacto para paneles estrechos ("5m", "2h", "ayer", "3d", "1sem", "1mes")
export function formatRelativeTimeShort(iso) {
	if (!iso) return '-';
	const d = new Date(iso);
	if (isNaN(d.getTime())) return '-';
	const s = Math.floor((Date.now() - d) / 1000);
	if (s < 60) return 'ahora';
	if (s < 3600) return `${Math.floor(s / 60)}m`;
	if (s < 86400) return `${Math.floor(s / 3600)}h`;
	if (s < 172800) return 'ayer';
	if (s < 604800) return `${Math.floor(s / 86400)}d`;
	if (s < 2592000) return `${Math.floor(s / 604800)}sem`;
	return `${Math.floor(s / 2592000)}mes`;
}

export function hexToRgbString(hex) {
	if (!hex) return '79, 195, 247';
	if (hex.startsWith('rgb')) {
		const m = hex.match(/[\d.]+/g);
		if (m && m.length >= 3) return `${m[0]}, ${m[1]}, ${m[2]}`;
	}
	if (hex.startsWith('#')) {
		const clean = hex.replace('#', '');
		if (clean.length === 3) {
			const r = parseInt(clean[0] + clean[0], 16) || 0;
			const g = parseInt(clean[1] + clean[1], 16) || 0;
			const b = parseInt(clean[2] + clean[2], 16) || 0;
			return `${r}, ${g}, ${b}`;
		}
		const r = parseInt(clean.substring(0, 2), 16) || 0;
		const g = parseInt(clean.substring(2, 4), 16) || 0;
		const b = parseInt(clean.substring(4, 6), 16) || 0;
		return `${r}, ${g}, ${b}`;
	}
	return '79, 195, 247';
}

export function getProtocolBadge(type) {
	switch (type) {
		case 'ssh': return 'SSH';
		case 'rdp-guacamole':
		case 'rdp': return 'RDP';
		case 'vnc-guacamole':
		case 'vnc': return 'VNC';
		case 'explorer':
		case 'sftp': return 'SFTP';
		case 'ftp': return 'FTP';
		case 'scp': return 'SCP';
		case 'group': return 'GRUPO';
		case 'password':
		case 'secret': return 'PWD';
		case 'crypto_wallet': return 'WALLET';
		case 'api_key': return 'API KEY';
		case 'secure_note': return 'NOTE';
		case 'document':
		case 'quick-note': return 'NOTA';
		case 'ssh-tunnel': return 'TUNNEL';
		default: return (type || 'HOST').toUpperCase();
	}
}

export function matchesProtocolFilter(itemType, filter) {
	if (!filter || filter === 'all') return true;
	const t = (itemType || '').toLowerCase();
	if (filter === 'ssh') return t === 'ssh';
	if (filter === 'rdp') return t === 'rdp' || t === 'rdp-guacamole';
	if (filter === 'vnc') return t === 'vnc' || t === 'vnc-guacamole';
	if (filter === 'sftp') return ['sftp', 'explorer', 'ftp', 'scp'].includes(t);
	if (filter === 'password') return ['password', 'secret', 'crypto_wallet', 'api_key'].includes(t);
	if (filter === 'note') return ['secure_note', 'document', 'quick-note'].includes(t);
	if (filter === 'ssh-tunnel') return t === 'ssh-tunnel';
	return t === filter;
}

export const CYBER_PROTOCOL_OPTIONS = [
	{ id: 'all', label: 'TODOS', icon: 'pi pi-list', color: '#ffffff' },
	{ id: 'ssh', label: 'SSH', icon: 'pi pi-terminal', color: '#4fc3f7' },
	{ id: 'rdp', label: 'RDP', icon: 'pi pi-desktop', color: '#ff6b35' },
	{ id: 'vnc', label: 'VNC', icon: 'pi pi-eye', color: '#81c784' },
	{ id: 'sftp', label: 'SFTP', icon: 'pi pi-folder', color: '#FFB300' },
	{ id: 'password', label: 'SECRETOS', icon: 'pi pi-key', color: '#E91E63' },
	{ id: 'note', label: 'NOTAS', icon: 'pi pi-file', color: '#64b5f6' },
	{ id: 'ssh-tunnel', label: 'TÚNEL', icon: 'pi pi-sync', color: '#a78bfa' },
];

export function defaultPort(type) {
	const t = type || '';
	if (['ssh', 'sftp', 'explorer', 'scp'].includes(t)) return 22;
	if (t === 'ftp') return 21;
	if (['rdp', 'rdp-guacamole'].includes(t)) return 3389;
	if (['vnc', 'vnc-guacamole'].includes(t)) return 5900;
	return 0;
}

export function buildHostLabel(conn) {
	if (!conn) return '-';
	if (conn.type === 'group') return conn.name || '-';

	// Para secretos (passwords, wallets, etc.), mostrar URL o username
	if (['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note'].includes(conn.type)) {
		if (conn.url) return conn.url;
		if (conn.username) return conn.username;
		return conn.group || '-';
	}

	// En conexiones con bastión (Wallix), la cadena completa está en bastionUser
	const user = conn.useBastionWallix ? (conn.bastionUser || conn.username || conn.user || '') : (conn.username || conn.user || '');
	const host = conn.host || conn.hostname || '';
	const port = conn.port != null && conn.port !== '' ? Number(conn.port) : null;
	const def = defaultPort(conn.type);
	let part = user ? (host ? `${user}@${host}` : user) : (host || '-');
	if (port != null && !isNaN(port) && port !== def) part += `:${port}`;
	return part;
}

// Función helper para buscar un nodo en el árbol de la sidebar
export const findNodeInTree = (nodes, connection) => {
	if (!nodes || !Array.isArray(nodes) || !connection) return null;

	for (const node of nodes) {
		if (node.data) {
			const nodeType = node.data.type;
			const connType = connection.type === 'rdp' ? 'rdp-guacamole' :
				connection.type === 'vnc' ? 'vnc-guacamole' :
					connection.type;

			if (nodeType === connType ||
				(nodeType === 'rdp' && connType === 'rdp-guacamole') ||
				(nodeType === 'vnc' && connType === 'vnc-guacamole')) {
				const nodeHost = node.data?.host || node.data?.server || node.data?.targetServer || node.data?.hostname;
				const nodeUser = node.data?.user || node.data?.username;
				const nodePort = node.data?.port;
				const connHost = connection.host || connection.hostname;
				const connUser = connection.username || connection.user;
				const connPort = connection.port;

				if (nodeHost === connHost &&
					nodeUser === connUser &&
					(nodePort == null || connPort == null || nodePort === connPort)) {
					return node;
				}
			}
		}

		if (node.children && Array.isArray(node.children)) {
			const found = findNodeInTree(node.children, connection);
			if (found) return found;
		}
	}

	return null;
};

export const getNodeFolderPath = (nodes, targetNode) => {
	const findFolderPath = (nodeList, target, currentPath = []) => {
		if (!nodeList || !target) return null;
		for (const node of nodeList) {
			const isFolder = !node.data || (!node.data.type || (node.data.type !== 'ssh' && node.data.type !== 'rdp' && node.data.type !== 'rdp-guacamole'));
			const newPath = isFolder ? [...currentPath, node.label] : currentPath;

			if (node.key === target.key) {
				return currentPath;
			}

			if (node.children && node.children.length > 0) {
				const foundPath = findFolderPath(node.children, target, newPath);
				if (foundPath) {
					return foundPath;
				}
			}
		}
		return null;
	};
	return findFolderPath(nodes, targetNode);
};

export const findNodePath = (nodes, targetNode) => {
	const findPath = (nodeList, target, currentPath = []) => {
		if (!nodeList || !target) return null;
		for (const node of nodeList) {
			const newPath = [...currentPath, node.key];

			if (node.key === target.key) {
				return newPath;
			}

			if (node.children && node.children.length > 0) {
				const foundPath = findPath(node.children, target, newPath);
				if (foundPath) return foundPath;
			}
		}
		return null;
	};

	return findPath(nodes, targetNode);
};

export const expandNodePath = (nodePath, currentExpandedKeys = {}) => {
	if (!nodePath || nodePath.length === 0) return currentExpandedKeys;

	const newExpandedKeys = { ...currentExpandedKeys };
	for (let i = 0; i < nodePath.length - 1; i++) {
		newExpandedKeys[nodePath[i]] = true;
	}
	return newExpandedKeys;
};

export const getConnectionTypeColor = (type) => {
	switch (type) {
		case 'ssh-tunnel': return '#ab47bc';
		case 'ssh': return '#4fc3f7';
		case 'rdp-guacamole':
		case 'rdp': return '#ff6b35';
		case 'vnc-guacamole':
		case 'vnc': return '#81c784';
		case 'explorer':
		case 'sftp': return '#FFB300';
		case 'ftp': return '#4CAF50';
		case 'scp': return '#9C27B0';
		case 'group': return '#9c27b0';
		case 'password':
		case 'secret': return '#E91E63';
		case 'crypto_wallet': return '#FF9800';
		case 'api_key': return '#9C27B0';
		case 'secure_note': return '#607D8B';
		case 'document':
		case 'quick-note': return '#64b5f6';
		default: return '#9E9E9E';
	}
};

export const getProtocolLabel = (type) => {
	switch (type) {
		case 'ssh-tunnel': return 'TUNNEL';
		case 'rdp-guacamole':
		case 'rdp': return 'RDP';
		case 'vnc-guacamole':
		case 'vnc': return 'VNC';
		case 'explorer':
		case 'sftp': return 'SFTP';
		case 'ftp': return 'FTP';
		case 'scp': return 'SCP';
		case 'group': return 'GRUPO';
		case 'password':
		case 'secret': return 'PWD';
		case 'crypto_wallet': return 'WALLET';
		case 'api_key': return 'API';
		case 'secure_note': return 'NOTE';
		case 'document':
		case 'quick-note': return 'NOTA';
		default: return 'SSH';
	}
};

export const getConnectionTypeIcon = (type) => {
	switch (type) {
		case 'ssh-tunnel': return 'pi pi-share-alt';
		case 'ssh': return 'pi pi-server';
		case 'rdp-guacamole':
		case 'rdp': return 'pi pi-desktop';
		case 'vnc-guacamole':
		case 'vnc': return 'pi pi-desktop';
		case 'explorer':
		case 'sftp': return 'pi pi-folder-open';
		case 'ftp': return 'pi pi-cloud-upload';
		case 'scp': return 'pi pi-copy';
		case 'group': return 'pi pi-th-large';
		case 'password':
		case 'secret':
		case 'crypto_wallet':
		case 'api_key':
		case 'secure_note': return 'pi pi-key';
		case 'document':
		case 'quick-note': return 'pi pi-file';
		default: return 'pi pi-circle';
	}
};

export const getConnectionTypeIconSVG = (type, customIcon = null) => {
	if (customIcon && customIcon !== 'default' && SSHIconPresets[customIcon.toUpperCase()]) {
		return null;
	}

	const theme = localStorage.getItem('iconThemeSidebar') || 'nord';
	const icons = (iconThemes[theme] || iconThemes['nord']).icons || {};
	switch (type) {
		case 'ssh': return icons.ssh;
		case 'ssh-tunnel': return icons.ssh;
		case 'rdp':
		case 'rdp-guacamole': return icons.rdp;
		case 'vnc':
		case 'vnc-guacamole': return icons.vnc;
		case 'sftp':
		case 'explorer': return icons.sftp;
		case 'ftp': return icons.ftp || icons.sftp;
		case 'scp': return icons.scp || icons.sftp;
		default: return null;
	}
};

export const applyTypeFilter = (items, filter) => {
	if (!items) return [];
	if (filter === 'all') return items;
	if (filter === 'vnc-guacamole') return items.filter(c => c.type === 'vnc-guacamole' || c.type === 'vnc');
	if (filter === 'rdp-guacamole') return items.filter(c => c.type === 'rdp-guacamole' || c.type === 'rdp');
	if (filter === 'sftp') return items.filter(c => ['sftp', 'explorer', 'ftp', 'scp'].includes(c.type));
	if (filter === 'secret') return items.filter(c => ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note', 'document', 'quick-note'].includes(c.type));
	return items.filter(c => c.type === filter);
};

export const activeKey = (c) => {
	if (!c) return '';
	if (c.type === 'group') return `group:${c.id}`;
	if (c.id && !c.id.startsWith('group:')) return c.id;

	return helpers.buildId({
		type: c.type,
		host: c.host || c.hostname || c.server || '',
		username: c.username || c.user || '',
		port: c.port
	});
};
