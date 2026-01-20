import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getFavorites, toggleFavorite, onUpdate, isFavorite } from '../utils/connectionStore';
import { iconThemes } from '../themes/icon-themes';

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
	
	const user = conn.username || conn.user || '';
	const host = conn.host || conn.hostname || '';
	const port = conn.port != null && conn.port !== '' ? Number(conn.port) : null;
	const def = defaultPort(conn.type);
	let part = user ? (host ? `${user}@${host}` : user) : (host || '—');
	if (port != null && !isNaN(port) && port !== def) part += `:${port}`;
	return part;
}

const ConnectionHistory = ({
	onConnectToHistory,
	recentConnections = [],
	activeIds = new Set(),
	onEdit,
	themeColors = {},
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
			} catch {}
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

	const getConnectionTypeIconSVG = (type) => {
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

	const ConnectionCard = ({ connection, isPinned, onEditCard }) => {
		const isActive = activeIds.has(activeKey(connection));
		const typeColor = getConnectionTypeColor(connection.type);
		const protocolLabel = getProtocolLabel(connection.type);
		const hostLabel = buildHostLabel(connection);
		const lastConnected = connection.lastConnected;
		const fav = isPinned || isFavorite(connection);
		const statusStr = isActive ? (lastConnected ? `Conectado • ${formatRelativeTime(lastConnected)}` : 'Conectado') : formatRelativeTime(lastConnected);

		const r = parseInt(typeColor.slice(1, 3), 16);
		const g = parseInt(typeColor.slice(3, 5), 16);
		const b = parseInt(typeColor.slice(5, 7), 16);

		const handleStar = (e) => {
			e.stopPropagation();
			toggleFavorite(connection);
			loadConnectionHistory();
		};

		const handleEdit = (e) => {
			e.stopPropagation();
			onEditCard?.(connection);
		};

		return (
			<div
				className={`connection-card ${isActive ? 'connection-card--active' : ''}`}
				onClick={() => onConnectToHistory?.(connection)}
				onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onConnectToHistory?.(connection); } }}
				role="button"
				tabIndex={0}
				aria-label={`Conectar a ${connection.name}`}
				style={{
					'--cc-accent': typeColor,
					'--cc-chip-bg': `rgba(${r},${g},${b},0.18)`,
					'--cc-chip-border': `rgba(${r},${g},${b},0.45)`,
					'--cc-chip-color': typeColor,
					'--cc-bg': themeColors.itemBackground || 'rgba(12, 14, 20, 0.55)',
					'--cc-bg-hover': themeColors.hoverBackground || 'rgba(16, 20, 28, 0.70)',
					'--cc-border': themeColors.borderColor || 'rgba(255,255,255,0.10)',
					'--cc-font': homeTabFont,
					'--cc-name-size': homeTabFontSize ? `${homeTabFontSize * 0.9}px` : '0.9rem',
					'--cc-host-size': homeTabFontSize ? `${homeTabFontSize * 0.72}px` : '0.75rem',
					'--cc-meta-size': homeTabFontSize ? `${homeTabFontSize * 0.7}px` : '0.7rem',
				}}
			>
				<div className="connection-card__icon">
					{(() => {
						const svg = getConnectionTypeIconSVG(connection.type);
						if (svg) {
							return React.cloneElement(svg, { width: 28, height: 28, style: { width: 28, height: 28 } });
						}
						return <i className={getConnectionTypeIcon(connection.type)} aria-hidden="true" />;
					})()}
				</div>
				<div className="connection-card__body">
					<div className="connection-card__name-row">
						{isPinned && (
							<i className="pi pi-star-fill connection-card__star" style={{ color: '#FFD700', marginRight: 6 }} aria-hidden="true" />
						)}
						<span className="connection-card__name" title={connection.name}>{connection.name}</span>
					</div>
					<div className="connection-card__host" title={hostLabel}>{hostLabel}</div>
				</div>
				<div className="connection-card__meta">
					<span className="connection-card__chip">{protocolLabel}</span>
					<span className="connection-card__status">{statusStr}</span>
				</div>
				<div className="connection-card__actions" onClick={(e) => e.stopPropagation()}>
					{!isPinned && (
						<button type="button" className="connection-card__btn connection-card__btn--star" title={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'} onClick={handleStar} aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
							<i className={fav ? 'pi pi-star-fill' : 'pi pi-star'} />
						</button>
					)}
					{isPinned && (
						<button type="button" className="connection-card__btn connection-card__btn--star" title="Quitar de favoritos" onClick={handleStar} aria-label="Quitar de favoritos">
							<i className="pi pi-star-fill" />
						</button>
					)}
					{onEditCard && (
						<button type="button" className="connection-card__btn connection-card__btn--edit" title="Editar" onClick={handleEdit} aria-label="Editar">
							<i className="pi pi-pencil" />
						</button>
					)}
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
			{/* Filtros superiores */}
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

			{/* ◷ RECIENTES (mitad superior) */}
			<section className="connection-history-section">
				<h3 className="connection-history-section-title">◷ RECIENTES</h3>
				<div className="connection-history-list home-hide-scrollbar">
					{filteredRecents.length > 0 ? (
						filteredRecents.map((c) => (
							<ConnectionCard key={c.id} connection={c} isPinned={false} onEditCard={onEdit} />
						))
					) : (
						<div className="connection-history-empty" style={{ color: themeColors.textSecondary }}>
							No hay sesiones recientes
						</div>
					)}
				</div>
			</section>

			{/* ★ PINNED (mitad inferior) */}
			<section className="connection-history-section">
				<h3 className="connection-history-section-title">★ PINNED</h3>
				<div className="connection-history-list home-hide-scrollbar">
					{filteredPinned.length > 0 ? (
						filteredPinned.map((c) => (
							<ConnectionCard key={c.id} connection={c} isPinned onEditCard={onEdit} />
						))
					) : (
						<div className="connection-history-empty" style={{ color: themeColors.textSecondary }}>
							No hay favoritos. Marca conexiones con la estrella.
						</div>
					)}
				</div>
			</section>
		</div>
	);
};

export default ConnectionHistory;
