import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getFavorites, toggleFavorite, onUpdate, isFavorite } from '../utils/connectionStore';
import { iconThemes } from '../themes/icon-themes';
import { SSHIconRenderer, SSHIconPresets } from './SSHIconSelector';

// Formatear "Hace 5m", "Hace 2 h", "Ayer", etc.
function formatRelativeTime(iso) {
	if (!iso) return '—';
	const d = new Date(iso);
	if (isNaN(d.getTime())) return '—';
	const s = Math.floor((Date.now() - d) / 1000);
	if (s < 60) return 'Ahora';
	if (s < 3600) return `Hace ${Math.floor(s / 60)}m`;
	if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
	if (s < 172800) return 'Ayer';
	if (s < 604800) return `Hace ${Math.floor(s / 86400)} días`;
	if (s < 2592000) return `Hace ${Math.floor(s / 604800)} sem`;
	return `Hace ${Math.floor(s / 2592000)} mes`;
}

function defaultPort(type) {
	const t = type || '';
	if (['ssh', 'sftp', 'explorer', 'scp'].includes(t)) return 22;
	if (t === 'ftp') return 21;
	if (['rdp', 'rdp-guacamole'].includes(t)) return 3389;
	if (['vnc', 'vnc-guacamole'].includes(t)) return 5900;
	return 0;
}

function buildHostLabel(conn) {
	if (conn.type === 'group') return conn.name || '—';

	// Para secretos (passwords, wallets, etc.), mostrar URL o username
	if (['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note'].includes(conn.type)) {
		if (conn.url) return conn.url;
		if (conn.username) return conn.username;
		return conn.group || '—';
	}

	// En conexiones con bastión (Wallix), la cadena completa está en bastionUser
	const user = conn.useBastionWallix ? (conn.bastionUser || conn.username || conn.user || '') : (conn.username || conn.user || '');
	const host = conn.host || conn.hostname || '';
	const port = conn.port != null && conn.port !== '' ? Number(conn.port) : null;
	const def = defaultPort(conn.type);
	let part = user ? (host ? `${user}@${host}` : user) : (host || '—');
	if (port != null && !isNaN(port) && port !== def) part += `:${port}`;
	return part;
}

// Función helper para buscar un nodo en el árbol de la sidebar
const findNodeInTree = (nodes, connection) => {
	if (!nodes || !Array.isArray(nodes)) return null;

	for (const node of nodes) {
		// Verificar si el nodo coincide con la conexión
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

		// Buscar recursivamente en los hijos
		if (node.children && Array.isArray(node.children)) {
			const found = findNodeInTree(node.children, connection);
			if (found) return found;
		}
	}

	return null;
};

const ConnectionHistory = ({
	onConnectToHistory,
	recentConnections = [],
	activeIds = new Set(),
	onEdit,
	themeColors = {},
	sidebarNodes = null, // Nodos de la sidebar para buscar iconos personalizados
}) => {
	const [favoriteConnections, setFavoriteConnections] = useState([]);
	const [typeFilter, setTypeFilter] = useState(() => {
		const saved = localStorage.getItem('nodeterm_fav_type');
		if (saved === 'explorer') return 'sftp';
		return saved || 'all';
	});
	const [homeTabFont, setHomeTabFont] = useState(() => {
		try {
			return localStorage.getItem('homeTabFont') || localStorage.getItem('sidebarFont') || '"Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
		} catch {
			return '"Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
		}
	});
	const [homeTabFontSize, setHomeTabFontSize] = useState(() => {
		try {
			const saved = localStorage.getItem('homeTabFontSize');
			return saved ? parseInt(saved, 10) : null;
		} catch {
			return null;
		}
	});
	const scrollRef = useRef(null);

	useEffect(() => {
		loadConnectionHistory();
		const off = onUpdate(loadConnectionHistory);
		return () => off && off();
	}, [loadConnectionHistory]);

	// Sincronizar favoritos cuando cambian los recientes (para actualizar lastConnected)
	useEffect(() => {
		loadConnectionHistory();
	}, [recentConnections, loadConnectionHistory]);

	useEffect(() => {
		const h = () => {
			try {
				setHomeTabFont(localStorage.getItem('homeTabFont') || localStorage.getItem('sidebarFont') || '"Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif');
				const s = localStorage.getItem('homeTabFontSize');
				setHomeTabFontSize(s ? parseInt(s, 10) : null);
			} catch { }
		};
		h();
		window.addEventListener('home-tab-font-changed', h);
		window.addEventListener('sidebar-font-changed', h);
		return () => {
			window.removeEventListener('home-tab-font-changed', h);
			window.removeEventListener('sidebar-font-changed', h);
		};
	}, []);

	const loadConnectionHistory = useCallback(() => {
		try {
			const favs = getFavorites();
			// Sincronizar lastConnected de favoritos con recientes
			const recentById = new Map(recentConnections.map(r => [r.id, r]));
			const syncedFavs = favs.map(fav => {
				const recent = recentById.get(fav.id);
				if (recent && recent.lastConnected) {
					// Si existe en recientes, usar su lastConnected (más actualizado)
					return { ...fav, lastConnected: recent.lastConnected, isFavorite: true };
				}
				return { ...fav, isFavorite: true };
			});
			setFavoriteConnections(syncedFavs);
		} catch (e) {
			console.error('Error cargando favoritos:', e);
		}
	}, [recentConnections]);

	const getConnectionTypeIcon = (type) => {
		switch (type) {
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
			default: return 'pi pi-circle';
		}
	};

	const getConnectionTypeIconSVG = (type, customIcon = null) => {
		// Si hay un icono personalizado y es válido, usarlo
		if (customIcon && customIcon !== 'default' && SSHIconPresets[customIcon.toUpperCase()]) {
			return null; // Retornar null para que se use SSHIconRenderer en su lugar
		}

		const theme = localStorage.getItem('iconThemeSidebar') || 'nord';
		const icons = (iconThemes[theme] || iconThemes['nord']).icons || {};
		switch (type) {
			case 'ssh': return icons.ssh;
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

	const getConnectionTypeColor = (type) => {
		switch (type) {
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
			default: return '#9E9E9E';
		}
	};

	const getProtocolLabel = (type) => {
		switch (type) {
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
			case 'secret': return 'PASSWORD';
			case 'crypto_wallet': return 'WALLET';
			case 'api_key': return 'API KEY';
			case 'secure_note': return 'NOTE';
			default: return 'SSH';
		}
	};

	const applyTypeFilter = (items, filter) => {
		if (filter === 'all') return items;
		if (filter === 'vnc-guacamole') return items.filter(c => c.type === 'vnc-guacamole' || c.type === 'vnc');
		if (filter === 'rdp-guacamole') return items.filter(c => c.type === 'rdp-guacamole' || c.type === 'rdp');
		if (filter === 'sftp') return items.filter(c => ['sftp', 'explorer', 'ftp', 'scp'].includes(c.type));
		if (filter === 'secret') return items.filter(c => ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note'].includes(c.type));
		return items.filter(c => c.type === filter);
	};

	const handleFilterChange = (key) => {
		setTypeFilter(key);
		localStorage.setItem('nodeterm_fav_type', key);
	};

	const filteredPinned = applyTypeFilter(favoriteConnections, typeFilter);
	const filteredRecents = applyTypeFilter(recentConnections, typeFilter);

	const activeKey = (c) => {
		if (c.type === 'group') return `group:${c.id}`;
		return `${c.type}:${c.host || ''}:${c.username || ''}:${c.port || ''}`;
	};

	// ... (helper functions keep existing)

	const ConnectionRow = ({ connection, isPinned, isActive, onConnect, onEdit, onToggleFav }) => {
		const typeColor = getConnectionTypeColor(connection.type);
		const protocolLabel = getProtocolLabel(connection.type);
		const hostLabel = buildHostLabel(connection);
		const lastConnected = connection.lastConnected;
		const fav = isPinned || isFavorite(connection);
		const timeStr = formatRelativeTime(lastConnected);

		const handleStar = (e) => {
			e.stopPropagation();
			onToggleFav(connection);
		};

		const handleEdit = (e) => {
			e.stopPropagation();
			onEdit?.(connection);
		};

		return (
			<tr
				className={`connection-table-row ${isActive ? 'active-row' : ''}`}
				onClick={() => onConnect?.(connection)}
			>
				{/* Name & Icon */}
				<td className="connection-cell cell-name">
					<div className="cell-icon" style={{ color: typeColor }}>
						{(() => {
							let customIcon = connection.customIcon;
							if ((!customIcon || customIcon === 'default') && sidebarNodes) {
								const matchingNode = findNodeInTree(sidebarNodes, connection);
								if (matchingNode && matchingNode.data?.customIcon) {
									customIcon = matchingNode.data.customIcon;
								}
							}
							if (customIcon && customIcon !== 'default' && SSHIconPresets[customIcon.toUpperCase()]) {
								const preset = SSHIconPresets[customIcon.toUpperCase()];
								return <SSHIconRenderer preset={preset} pixelSize={20} />;
							}
							const svg = getConnectionTypeIconSVG(connection.type, customIcon);
							if (svg) {
								return React.cloneElement(svg, { width: 20, height: 20, style: { width: 20, height: 20 } });
							}
							return <i className={getConnectionTypeIcon(connection.type)} aria-hidden="true" />;
						})()}
					</div>
					<span title={connection.name}>{connection.name}</span>
				</td>

				{/* Host */}
				<td className="connection-cell cell-host" title={hostLabel}>
					{hostLabel}
				</td>

				{/* Protocol */}
				<td className="connection-cell cell-protocol">
					<span className="protocol-tag" style={{ color: typeColor, borderColor: typeColor }}>
						{protocolLabel}
					</span>
				</td>

				{/* Last Used */}
				<td className="connection-cell cell-time">
					{timeStr}
				</td>

				{/* Actions */}
				<td className="connection-cell cell-actions" onClick={(e) => e.stopPropagation()}>
					<button
						className={`action-btn ${fav ? 'is-active' : ''}`}
						onClick={handleStar}
						title={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
					>
						<i className={fav ? 'pi pi-star-fill' : 'pi pi-star'} />
					</button>
					{onEdit && (
						<button
							className="action-btn"
							onClick={handleEdit}
							title="Editar"
						>
							<i className="pi pi-pencil" />
						</button>
					)}
				</td>
			</tr>
		);
	};

	const ConnectionTable = ({ connections, title, emptyMessage }) => {
		if (connections.length === 0) {
			return (
				<div
					className="connection-table-container"
					style={{
						'--ct-bg': themeColors.cardBackground || 'rgba(16, 20, 28, 0.6)',
						'--ct-border': themeColors.borderColor || 'rgba(255,255,255,0.1)',
						'--ct-header-bg': themeColors.itemBackground || 'rgba(20, 24, 32, 0.95)',
						'--ct-text-primary': themeColors.textPrimary || '#ffffff',
						'--ct-text-secondary': themeColors.textSecondary || 'rgba(255,255,255,0.6)',
						'--ct-hover-bg': themeColors.hoverBackground || 'rgba(255,255,255,0.08)',
						'--ct-row-border': themeColors.borderColor || 'rgba(255,255,255,0.05)',
						'--ct-active-bg': themeColors.hoverBackground ? `${themeColors.hoverBackground}aa` : 'rgba(33, 150, 243, 0.15)',
						'--ct-primary': themeColors.primaryColor || '#2196f3',
						'--ct-tag-bg': themeColors.itemBackground || 'rgba(255,255,255,0.1)',
					}}
				>
					<div className="connection-table-header">
						<table>
							<thead>
								<tr>
									<th style={{ paddingLeft: 12 }}>{title}</th>
								</tr>
							</thead>
						</table>
					</div>
					<div className="connection-history-empty" style={{ padding: '1rem', textAlign: 'center', color: themeColors.textSecondary }}>
						{emptyMessage}
					</div>
				</div>
			);
		}

		return (
			<div
				className="connection-table-container"
				style={{
					'--ct-bg': themeColors.cardBackground || 'rgba(16, 20, 28, 0.6)',
					'--ct-border': themeColors.borderColor || 'rgba(255,255,255,0.1)',
					'--ct-header-bg': themeColors.itemBackground || 'rgba(20, 24, 32, 0.95)',
					'--ct-text-primary': themeColors.textPrimary || '#ffffff',
					'--ct-text-secondary': themeColors.textSecondary || 'rgba(255,255,255,0.6)',
					'--ct-hover-bg': themeColors.hoverBackground || 'rgba(255,255,255,0.08)',
					'--ct-row-border': themeColors.borderColor || 'rgba(255,255,255,0.05)',
					'--ct-active-bg': themeColors.hoverBackground ? `${themeColors.hoverBackground}aa` : 'rgba(33, 150, 243, 0.15)',
					'--ct-primary': themeColors.primaryColor || '#2196f3',
					'--ct-tag-bg': themeColors.itemBackground || 'rgba(255,255,255,0.1)',
				}}
			>
				<div className="connection-table-wrapper">
					<table className="connection-table">
						<thead className="connection-table-header">
							<tr>
								<th>{title}</th>
								<th>Host</th>
								<th>Protocolo</th>
								<th>Uso</th>
								<th style={{ textAlign: 'right' }}>Acciones</th>
							</tr>
						</thead>
						<tbody className="connection-table-body">
							{connections.map((c) => (
								<ConnectionRow
									key={c.id}
									connection={c}
									isPinned={isFavorite(c)}
									isActive={activeIds.has(activeKey(c))}
									onConnect={onConnectToHistory}
									onEdit={onEdit}
									onToggleFav={(conn) => { toggleFavorite(conn); loadConnectionHistory(); }}
								/>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
	};

	const filterTabs = [
		{ key: 'all', label: 'Todas' },
		{ key: 'ssh', label: 'SSH' },
		{ key: 'rdp-guacamole', label: 'RDP' },
		{ key: 'vnc-guacamole', label: 'VNC' },
		{ key: 'sftp', label: 'SFTP' },
		{ key: 'secret', label: 'Secretos' },
	];

	return (
		<div className="connection-history-root" ref={scrollRef}>
			{/* Filters */}
			<div className="connection-history-filters">
				{filterTabs.map(({ key, label }) => (
					<button
						key={key}
						type="button"
						className={`connection-history-filter-tab ${typeFilter === key ? 'active' : ''}`}
						onClick={() => handleFilterChange(key)}
						style={{
							background: typeFilter === key ? (themeColors.hoverBackground || 'rgba(255,255,255,0.12)') : (themeColors.itemBackground || 'rgba(255,255,255,0.04)'),
							borderColor: themeColors.borderColor || 'rgba(255,255,255,0.14)',
							color: themeColors.textPrimary || 'var(--text-color)',
						}}
					>
						{label}
					</button>
				))}
			</div>

			{/* RECIENTES TABLE */}
			<section className="connection-history-section" style={{ flex: 1, minHeight: 0, marginBottom: '0.5rem' }}>
				<ConnectionTable
					connections={filteredRecents}
					title="RECIENTES"
					emptyMessage="No hay sesiones recientes"
				/>
			</section>

			{/* PINNED TABLE */}
			<section className="connection-history-section" style={{ flex: 1, minHeight: 0 }}>
				<ConnectionTable
					connections={filteredPinned}
					title="FAVORITOS (PINNED)"
					emptyMessage="No hay favoritos guardados"
				/>
			</section>
		</div>
	);
};

export default ConnectionHistory;
