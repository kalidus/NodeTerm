import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getFavorites, toggleFavorite, onUpdate, isFavorite, reorderFavorites } from '../utils/connectionStore';
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
	// const scrollRef = useRef(null); // Eliminado por no tener uso

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



	const filteredPinned = applyTypeFilter(favoriteConnections, typeFilter);
	const filteredRecents = applyTypeFilter(recentConnections, typeFilter);

	const activeKey = (c) => {
		if (c.type === 'group') return `group:${c.id}`;
		return `${c.type}:${c.host || ''}:${c.username || ''}:${c.port || ''}`;
	};

	const handleFilterChange = (key) => {
		setTypeFilter(key);
		localStorage.setItem('nodeterm_fav_type', key);
	};

	// Componente interno para las tarjetas del Carrusel
	const RibbonCard = ({ connection, isActive, onConnect, onEdit, onToggleFav, onDragStart, onDragOver, onDrop, index }) => {
		const typeColor = getConnectionTypeColor(connection.type);
		const hostLabel = connection.host || connection.hostname || '—';
		const protocolLabel = getProtocolLabel(connection.type);
		const timeStr = formatRelativeTime(connection.lastConnected);

		// Map index to a gradient class
		const gradientClass = `icon-gradient-${(index % 5) + 1}`;

		const handleStar = (e) => {
			e.stopPropagation();
			e.preventDefault();
			onToggleFav(connection);
		};

		return (
			<div
				className="ribbon-card apple-card"
				onClick={() => onConnect?.(connection)}
				style={{ '--card-accent': typeColor }}
				title={`${connection.name} (${hostLabel})`}
				draggable
				onDragStart={(e) => onDragStart(e, connection)}
				onDragOver={(e) => onDragOver(e)}
				onDrop={(e) => onDrop(e, connection)}
			>
				{/* Edit Button (visible on hover) */}
				<div
					className="ribbon-card__edit"
					onClick={(e) => {
						e.stopPropagation();
						onEdit?.(connection);
					}}
					onMouseDown={(e) => e.stopPropagation()}
					title="Editar conexión"
				>
					<i className="pi pi-pencil" style={{ fontSize: '0.8rem' }} />
				</div>

				{/* Pin Button */}
				<div
					className="ribbon-card__pin"
					onClick={handleStar}
					onMouseDown={(e) => e.stopPropagation()}
					title="Quitar de favoritos"
				>
					<i className="pi pi-star-fill" style={{ fontSize: '0.8rem' }} />
				</div>

				{/* Icon with Gradient Background */}
				<div className={`ribbon-card__icon-wrapper ${gradientClass}`}>
					<div className="ribbon-card__icon">
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
								return <SSHIconRenderer preset={preset} pixelSize={48} />;
							}
							const svg = getConnectionTypeIconSVG(connection.type, customIcon);
							if (svg) {
								return React.cloneElement(svg, { width: 48, height: 48, style: { width: 48, height: 48 } });
							}
							return <i className={getConnectionTypeIcon(connection.type)} aria-hidden="true" />;
						})()}
					</div>

					{/* Protocol Badge (Integrated) */}
					<div className="ribbon-card__protocol-badge">
						{protocolLabel}
					</div>
				</div>

				{/* Content */}
				<div className="ribbon-card__content">
					<div className="ribbon-card__name" title={connection.name}>{connection.name}</div>
					<div className="ribbon-card__host" title={hostLabel}>{hostLabel}</div>
					<div className="ribbon-card__time">
						<span className={`ribbon-card__status-dot ${isActive ? 'is-active' : ''}`} title={isActive ? "Sesión activa" : "Desconectado"} />
						{timeStr}
					</div>
				</div>
			</div>
		);
	};

	const FavoritesRibbon = ({ connections, fullList, onReorder }) => {
		const trackRef = useRef(null);
		const [draggedItem, setDraggedItem] = useState(null);
		const [scrollPos, setScrollPos] = useState(0);
		const [totalWidth, setTotalWidth] = useState(0);
		const [visibleWidth, setVisibleWidth] = useState(0);

		useEffect(() => {
			const updateScrollRes = () => {
				if (trackRef.current) {
					setScrollPos(trackRef.current.scrollLeft);
					setTotalWidth(trackRef.current.scrollWidth);
					setVisibleWidth(trackRef.current.offsetWidth);
				}
			};

			const track = trackRef.current;
			if (track) {
				track.addEventListener('scroll', updateScrollRes);
				// Initial check
				setTimeout(updateScrollRes, 100);
			}
			window.addEventListener('resize', updateScrollRes);
			return () => {
				track?.removeEventListener('scroll', updateScrollRes);
				window.removeEventListener('resize', updateScrollRes);
			};
		}, [connections]);

		const scroll = (direction) => {
			if (trackRef.current) {
				const scrollAmount = direction === 'left' ? -300 : 300;
				trackRef.current.scrollBy({
					left: scrollAmount,
					behavior: 'smooth'
				});
			}
		};

		const handleDragStart = (e, item) => {
			setDraggedItem(item);
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', item.id);
		};

		const handleDragOver = (e) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'move';
		};

		const handleDrop = (e, targetItem) => {
			e.preventDefault();
			if (!draggedItem || draggedItem.id === targetItem.id) return;

			const sourceList = fullList || connections;
			const newList = [...sourceList];

			const draggedIdx = newList.findIndex(i => i.id === draggedItem.id);
			const targetIdx = newList.findIndex(i => i.id === targetItem.id);

			if (draggedIdx >= 0 && targetIdx >= 0) {
				newList.splice(draggedIdx, 1);
				newList.splice(targetIdx, 0, draggedItem);
				if (onReorder) {
					onReorder(newList);
				} else {
					reorderFavorites(newList);
					loadConnectionHistory();
				}
			}
			setDraggedItem(null);
		};

		const hasItems = connections && connections.length > 0;

		// Calcular dots (simplificado: uno por cada 3 items o similar, o simplemente por item si no son muchos)
		// Mejor: un dot fijo o proporcional. En la imagen hay 5 dots para 5+ items.
		const dotsCount = Math.min(connections?.length || 0, 8);
		const activeDotIndex = Math.round((scrollPos / (totalWidth - visibleWidth || 1)) * (dotsCount - 1)) || 0;

		return (
			<div className="favorites-ribbon-section">
				<div className="modern-section-header">
					<div className="modern-header-title">
						<i className="pi pi-star-fill" style={{ color: '#FFD700' }} />
						<span>FAVORITOS</span>
					</div>
					<div className="modern-header-line"></div>
				</div>

				<div className="ribbon-container-relative">
					{/* Modern Circular Navigation Buttons (Side) */}
					{hasItems && (
						<>
							<button
								className="ribbon-side-btn prev"
								onClick={() => scroll('left')}
								aria-label="Anterior"
							>
								<i className="pi pi-chevron-left" />
							</button>
							<button
								className="ribbon-side-btn next"
								onClick={() => scroll('right')}
								aria-label="Siguiente"
							>
								<i className="pi pi-chevron-right" />
							</button>
						</>
					)}

					<div className="favorites-ribbon-track" ref={trackRef}>
						{hasItems ? (
							connections.map((c, idx) => (
								<RibbonCard
									key={c.id}
									connection={c}
									index={idx}
									isActive={activeIds.has(activeKey(c))}
									onConnect={onConnectToHistory}
									onEdit={onEdit}
									onToggleFav={(conn) => { toggleFavorite(conn); loadConnectionHistory(); }}
									onDragStart={handleDragStart}
									onDragOver={handleDragOver}
									onDrop={handleDrop}
								/>
							))
						) : (
							<div className="ribbon-empty">
								<i className="pi pi-star" style={{ fontSize: '1.5rem', opacity: 0.5 }} />
								<span>Usa el icono <i className="pi pi-star" /> en la lista para agregar favoritos</span>
							</div>
						)}
					</div>
				</div>

				{/* Pagination Dots */}
				{hasItems && connections.length > 1 && (
					<div className="ribbon-pagination">
						{Array.from({ length: dotsCount }).map((_, i) => (
							<div
								key={i}
								className={`pagination-dot ${i === activeDotIndex ? 'active' : ''}`}
							/>
						))}
					</div>
				)}
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
			<div
				className={`connection-card-row ${isActive ? 'active-row' : ''}`}
				onClick={() => onConnect?.(connection)}
				style={{ '--row-accent': typeColor }}
			>
				{/* Name & Icon */}
				<div className="col-name">
					<div className="icon-box" style={{ color: typeColor }}>
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
					<div className="col-name-text" title={connection.name}>{connection.name}</div>
				</div>

				{/* Host */}
				<div className="col-host" title={hostLabel}>
					{hostLabel}
				</div>

				{/* Protocol */}
				<div className="col-protocol">
					<span className="glass-tag" style={{ color: typeColor, borderColor: typeColor }}>
						{protocolLabel}
					</span>
				</div>

				{/* Last Used */}
				<div className="col-time">
					{timeStr}
				</div>

				{/* Actions */}
				<div className="col-actions" onClick={(e) => e.stopPropagation()}>
					<button
						className={`glass-action-btn ${fav ? 'fav-active' : ''}`}
						onClick={handleStar}
						title={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
					>
						<i className={fav ? 'pi pi-star-fill' : 'pi pi-star'} />
					</button>
					{onEdit && (
						<button
							className="glass-action-btn"
							onClick={handleEdit}
							title="Editar"
						>
							<i className="pi pi-pencil" />
						</button>
					)}
				</div>
			</div>
		);
	};

	const ConnectionTable = ({ connections, title, emptyMessage }) => {
		if (connections.length === 0) {
			return (
				<div className="connection-list-container">

					<div className="ribbon-empty" style={{
						marginTop: '0.5rem',
						height: 'auto',
						minHeight: '100px',
						flexDirection: 'column',
						gap: '8px',
						color: themeColors.textSecondary || 'rgba(255,255,255,0.4)',
						background: themeColors.itemBackground || 'rgba(255,255,255,0.02)',
						border: `1px dashed ${themeColors.borderColor || 'rgba(255,255,255,0.1)'}`
					}}>
						<i className="pi pi-history" style={{ fontSize: '1.5rem', opacity: 0.5, color: themeColors.textSecondary }} />
						<span>{emptyMessage}</span>
					</div>
				</div>
			);
		}

		return (
			<div className="connection-list-container">

				<div className="connection-list-body">
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
				</div>
			</div>
		);
	};

	return (
		<div className="connection-history-root">
			{/* Filters */}
			<div className="connection-history-filters" style={{ marginBottom: '1rem' }}>
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

			{/* FAVORITES RIBBON (Always visible, shows placeholder if empty) */}
			<FavoritesRibbon
				connections={filteredPinned}
				fullList={favoriteConnections}
				onReorder={(newList) => {
					setFavoriteConnections(newList);
					reorderFavorites(newList);
				}}
			/>

			{/* RECIENTES TABLE (Fills remaining space) */}
			<section className="connection-history-section" style={{ flex: 1, minHeight: 0, marginTop: '0.2rem' }}>
				<div className="modern-section-header">
					<div className="modern-header-title">
						<i className="pi pi-history" style={{ color: '#4fc3f7' }} />
						<span>RECIENTES</span>
					</div>
					<div className="modern-header-line"></div>
				</div>

				<ConnectionTable
					connections={filteredRecents}
					title="Nombre"
					emptyMessage="No hay sesiones recientes"
				/>
			</section>
		</div>
	);
};

export default ConnectionHistory;
