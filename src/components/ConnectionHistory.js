import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getFavorites, toggleFavorite, onUpdate, isFavorite, reorderFavorites, helpers } from '../utils/connectionStore';
import { iconThemes } from '../themes/icon-themes';
import { SSHIconRenderer, SSHIconPresets } from './SSHIconSelector';
import favoriteGroupsStore from '../utils/favoriteGroupsStore';

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

	// Estados para colapsar/expandir secciones
	const [favoritesCollapsed, setFavoritesCollapsed] = useState(() => {
		try {
			const saved = localStorage.getItem('nodeterm_favorites_collapsed');
			return saved === 'true';
		} catch {
			return false;
		}
	});

	const [recentsCollapsed, setRecentsCollapsed] = useState(() => {
		try {
			const saved = localStorage.getItem('nodeterm_recents_collapsed');
			return saved === 'true';
		} catch {
			return false;
		}
	});

	// Estados para grupos de favoritos personalizados
	const [favoriteGroups, setFavoriteGroups] = useState(() => favoriteGroupsStore.getGroups());
	const [activeGroupId, setActiveGroupId] = useState(() => {
		const saved = localStorage.getItem('nodeterm_active_group');
		return saved || 'all';
	});
	const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
	const [newGroupName, setNewGroupName] = useState('');
	const [newGroupColor, setNewGroupColor] = useState('#4fc3f7');
	const [editingGroup, setEditingGroup] = useState(null);
	const filterBarRef = useRef(null);
	const [indicatorStyle, setIndicatorStyle] = useState({});

	// Funciones para toggle de colapso
	const toggleFavoritesCollapsed = () => {
		setFavoritesCollapsed(prev => {
			const newValue = !prev;
			try {
				localStorage.setItem('nodeterm_favorites_collapsed', newValue.toString());
			} catch (e) {
				console.error('Error guardando estado de favoritos colapsados:', e);
			}
			return newValue;
		});
	};

	const toggleRecentsCollapsed = () => {
		setRecentsCollapsed(prev => {
			const newValue = !prev;
			try {
				localStorage.setItem('nodeterm_recents_collapsed', newValue.toString());
			} catch (e) {
				console.error('Error guardando estado de recientes colapsados:', e);
			}
			return newValue;
		});
	};

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

	// Cargar y sincronizar grupos de favoritos
	useEffect(() => {
		const unsubscribe = favoriteGroupsStore.onGroupsUpdate(() => {
			setFavoriteGroups(favoriteGroupsStore.getGroups());
		});
		return () => unsubscribe();
	}, []);

	// Escuchar evento de agregar favorito desde sidebar (para mostrar selector de grupos)
	useEffect(() => {
		const handleSidebarFavorite = (e) => {
			const connection = e.detail?.connection;
			if (!connection) return;

			const isCurrentlyFavorite = isFavorite(connection);
			const userGroups = favoriteGroups.filter(g => !g.isDefault);

			if (isCurrentlyFavorite) {
				// Si ya es favorito, quitarlo
				toggleFavorite(connection);
				loadConnectionHistory();
			} else {
				// Si no es favorito y hay grupos, mostrar selector
				if (userGroups.length > 0) {
					setConnectionToFavorite(connection);
					setSelectedGroupsForFav([]);
					setShowGroupSelector(true);
				} else {
					// Si no hay grupos, agregar directamente
					toggleFavorite(connection);
					loadConnectionHistory();
				}
			}
		};

		window.addEventListener('request-add-favorite-with-groups', handleSidebarFavorite);
		return () => window.removeEventListener('request-add-favorite-with-groups', handleSidebarFavorite);
	}, [favoriteGroups, loadConnectionHistory]);

	// Actualizar indicador del filtro activo (sliding pill)
	useEffect(() => {
		const updateIndicator = () => {
			if (!filterBarRef.current) return;
			const activeButton = filterBarRef.current.querySelector('.filter-segment.active');
			if (activeButton) {
				const barRect = filterBarRef.current.getBoundingClientRect();
				const btnRect = activeButton.getBoundingClientRect();
				setIndicatorStyle({
					left: btnRect.left - barRect.left,
					width: btnRect.width,
				});
			}
		};
		// Delay para asegurar que el DOM esté listo
		const timer = setTimeout(updateIndicator, 50);
		window.addEventListener('resize', updateIndicator);
		return () => {
			clearTimeout(timer);
			window.removeEventListener('resize', updateIndicator);
		};
	}, [typeFilter, activeGroupId, favoriteGroups]);

	// Funciones para gestión de grupos
	const handleCreateGroup = () => {
		if (!newGroupName.trim()) return;
		try {
			favoriteGroupsStore.createGroup({
				name: newGroupName.trim(),
				color: newGroupColor,
				icon: 'pi-folder'
			});
			setNewGroupName('');
			setNewGroupColor('#4fc3f7');
			setShowCreateGroupDialog(false);
			setFavoriteGroups(favoriteGroupsStore.getGroups());
		} catch (error) {
			console.error('Error creando grupo:', error.message);
		}
	};

	const handleDeleteGroup = (groupId) => {
		try {
			favoriteGroupsStore.deleteGroup(groupId);
			setFavoriteGroups(favoriteGroupsStore.getGroups());
			if (activeGroupId === groupId) {
				setActiveGroupId('all');
				localStorage.setItem('nodeterm_active_group', 'all');
			}
		} catch (error) {
			console.error('Error eliminando grupo:', error.message);
		}
	};

	const handleGroupChange = (groupId) => {
		// Si hacemos clic en el grupo activo, volver a 'all' (sin filtro de grupo)
		const newGroupId = (activeGroupId === groupId) ? 'all' : groupId;
		setActiveGroupId(newGroupId);
		localStorage.setItem('nodeterm_active_group', newGroupId);
	};

	// Estado para el selector de grupos al agregar favorito
	const [showGroupSelector, setShowGroupSelector] = useState(false);
	const [connectionToFavorite, setConnectionToFavorite] = useState(null);
	const [selectedGroupsForFav, setSelectedGroupsForFav] = useState([]);

	// Manejar toggle de favorito con selector de grupo
	const handleToggleFavoriteWithGroup = (connection) => {
		const isCurrentlyFavorite = isFavorite(connection);
		// Calcular grupos personalizados aquí para evitar problemas de hoisting
		const userGroups = favoriteGroups.filter(g => !g.isDefault);

		if (isCurrentlyFavorite) {
			// Si ya es favorito, solo quitarlo
			toggleFavorite(connection);
			loadConnectionHistory();
		} else {
			// Si no es favorito y hay grupos personalizados, mostrar selector
			if (userGroups.length > 0) {
				setConnectionToFavorite(connection);
				setSelectedGroupsForFav([]);
				setShowGroupSelector(true);
			} else {
				// Si no hay grupos personalizados, agregar directamente
				toggleFavorite(connection);
				loadConnectionHistory();
			}
		}
	};


	// Confirmar agregar a favoritos con grupos seleccionados
	const handleConfirmAddFavorite = () => {
		if (!connectionToFavorite) return;

		// Agregar a favoritos
		toggleFavorite(connectionToFavorite);

		// Asignar a grupos seleccionados
		if (selectedGroupsForFav.length > 0) {
			const serial = typeof connectionToFavorite === 'string'
				? connectionToFavorite
				: (connectionToFavorite.id || helpers.buildId(connectionToFavorite));
			favoriteGroupsStore.assignFavoriteToGroups(serial, selectedGroupsForFav);
		}

		setShowGroupSelector(false);
		setConnectionToFavorite(null);
		setSelectedGroupsForFav([]);
		loadConnectionHistory();
	};

	// Toggle selección de grupo para el favorito
	const toggleGroupForFavorite = (groupId) => {
		setSelectedGroupsForFav(prev => {
			if (prev.includes(groupId)) {
				return prev.filter(id => id !== groupId);
			}
			return [...prev, groupId];
		});
	};

	// Estado para editar grupos de un favorito existente
	const [showEditFavGroups, setShowEditFavGroups] = useState(false);
	const [editingFavorite, setEditingFavorite] = useState(null);
	const [editSelectedGroups, setEditSelectedGroups] = useState([]);

	// Abrir diálogo para editar grupos de un favorito existente
	const handleEditFavoriteGroups = (connection) => {
		const favId = connection.id || helpers.buildId(connection);
		const currentGroups = favoriteGroupsStore.getFavoriteGroups(favId);
		setEditingFavorite(connection);
		setEditSelectedGroups(currentGroups);
		setShowEditFavGroups(true);
	};

	// Toggle grupo para favorito existente
	const toggleEditGroup = (groupId) => {
		setEditSelectedGroups(prev => {
			if (prev.includes(groupId)) {
				return prev.filter(id => id !== groupId);
			}
			return [...prev, groupId];
		});
	};

	// Guardar cambios de grupos
	const handleSaveEditGroups = () => {
		if (!editingFavorite) return;
		const favId = editingFavorite.id || helpers.buildId(editingFavorite);
		favoriteGroupsStore.assignFavoriteToGroups(favId, editSelectedGroups);
		setShowEditFavGroups(false);
		setEditingFavorite(null);
		setEditSelectedGroups([]);
		loadConnectionHistory();
	};

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



	// Calculate active connections (filtered by group)
	const activeFavs = activeGroupId === 'all'
		? favoriteConnections
		: favoriteGroupsStore.getFavoritesInGroup(activeGroupId, favoriteConnections);

	const activeRecents = activeGroupId === 'all'
		? recentConnections
		: favoriteGroupsStore.getFavoritesInGroup(activeGroupId, recentConnections);

	const filteredPinned = applyTypeFilter(activeFavs, typeFilter);
	const filteredRecents = applyTypeFilter(activeRecents, typeFilter);

	const activeKey = (c) => {
		if (c.type === 'group') return `group:${c.id}`;
		return `${c.type}:${c.host || ''}:${c.username || ''}:${c.port || ''}`;
	};

	const handleFilterChange = (key) => {
		setTypeFilter(key);
		localStorage.setItem('nodeterm_fav_type', key);
	};

	// Componente interno para las tarjetas del Carrusel
	const RibbonCard = ({ connection, isActive, onConnect, onEdit, onToggleFav, onEditGroups, onDragStart, onDragOver, onDrop, index }) => {
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

		const handleGroups = (e) => {
			e.stopPropagation();
			e.preventDefault();
			onEditGroups?.(connection);
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

				{/* Groups Button (only if custom groups exist) */}
				{customGroups.length > 0 && (
					<div
						className="ribbon-card__groups"
						onClick={handleGroups}
						onMouseDown={(e) => e.stopPropagation()}
						title="Gestionar grupos"
					>
						<i className="pi pi-folder" style={{ fontSize: '0.8rem' }} />
					</div>
				)}

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

	const FavoritesRibbon = ({ connections, fullList, onReorder, collapsed, onToggleCollapsed }) => {
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
					<button
						className="section-collapse-btn"
						onClick={onToggleCollapsed}
						title={collapsed ? "Expandir favoritos" : "Colapsar favoritos"}
						style={{
							background: 'transparent',
							border: 'none',
							padding: '4px 8px',
							cursor: 'pointer',
							color: 'rgba(255, 255, 255, 0.7)',
							fontSize: '0.9rem',
							transition: 'all 0.2s ease',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
							e.currentTarget.style.transform = 'scale(1.1)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
							e.currentTarget.style.transform = 'scale(1)';
						}}
					>
						<i className={collapsed ? "pi pi-chevron-down" : "pi pi-chevron-up"} />
					</button>
					<div className="modern-header-title">
						<i className="pi pi-star-fill" style={{ color: '#FFD700' }} />
						<span>FAVORITOS</span>
					</div>
					<div className="modern-header-line"></div>
				</div>

				{!collapsed && (
					<>
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
											onEditGroups={handleEditFavoriteGroups}
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
					</>
				)}
			</div>
		);
	};


	const filterTabs = [
		{ key: 'all', label: 'Todas', icon: 'pi-th-large', color: '#9E9E9E' },
		{ key: 'ssh', label: 'SSH', icon: 'pi-server', color: '#4fc3f7' },
		{ key: 'rdp-guacamole', label: 'RDP', icon: 'pi-desktop', color: '#ff6b35' },
		{ key: 'vnc-guacamole', label: 'VNC', icon: 'pi-desktop', color: '#81c784' },
		{ key: 'sftp', label: 'SFTP', icon: 'pi-folder-open', color: '#FFB300' },
		{ key: 'secret', label: 'Secretos', icon: 'pi-key', color: '#E91E63' },
	];

	// Calcular contadores por tipo de conexión
	const countByType = (connections, filterKey) => {
		if (filterKey === 'all') return connections.length;
		if (filterKey === 'vnc-guacamole') return connections.filter(c => c.type === 'vnc-guacamole' || c.type === 'vnc').length;
		if (filterKey === 'rdp-guacamole') return connections.filter(c => c.type === 'rdp-guacamole' || c.type === 'rdp').length;
		if (filterKey === 'sftp') return connections.filter(c => ['sftp', 'explorer', 'ftp', 'scp'].includes(c.type)).length;
		if (filterKey === 'secret') return connections.filter(c => ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note'].includes(c.type)).length;
		return connections.filter(c => c.type === filterKey).length;
	};



	// Obtener grupos personalizados (excluyendo 'all')
	const customGroups = favoriteGroups.filter(g => !g.isDefault);


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
							onToggleFav={handleToggleFavoriteWithGroup}
						/>
					))}
				</div>
			</div>
		);
	};

	return (
		<div className="connection-history-root">
			{/* Advanced Filter Bar - Segmented Control with Groups */}
			<div className="filter-bar-wrapper" style={{ marginBottom: '1rem' }}>
				{/* Protocol Filters - Segmented Control */}
				<div className="segmented-control" ref={filterBarRef}>
					{/* Sliding indicator */}
					<div
						className="segment-indicator"
						style={{
							transform: `translateX(${indicatorStyle.left || 0}px)`,
							width: indicatorStyle.width || 0
						}}
					/>

					{filterTabs.map(({ key, label, icon, color }) => {
						// Only count Favorites for the filter badges
						// This provides a clean "Inventory Count" without noise from Recents history
						const count = countByType(activeFavs, key);
						return (
							<button
								key={key}
								type="button"
								className={`filter-segment ${typeFilter === key ? 'active' : ''}`}
								onClick={() => handleFilterChange(key)}
								title={`${label} (${count})`}
							>
								<i className={`pi ${icon}`} style={{ color: typeFilter === key ? color : 'inherit' }} />
								<span className="segment-label">{label}</span>
								{count > 0 && <span className="segment-count">{count}</span>}
							</button>
						);
					})}
				</div>

				{/* Separator */}
				<div className="filter-bar-separator" />

				{/* Custom Groups Tabs */}
				<div className="groups-control">
					{/* User-created groups */}

					{customGroups.map(group => (
						<div key={group.id} className="group-tab-wrapper">
							<button
								type="button"
								className={`group-tab ${activeGroupId === group.id ? 'active' : ''}`}
								onClick={() => handleGroupChange(group.id)}
								onContextMenu={(e) => {
									e.preventDefault();
									setEditingGroup(group);
								}}
								style={{ '--group-color': group.color }}
								title={`Grupo: ${group.name}`}
							>
								<span className="group-dot" style={{ background: group.color }} />
								<span>{group.name}</span>
							</button>
							<button
								type="button"
								className="group-delete-btn"
								onClick={(e) => {
									e.stopPropagation();
									handleDeleteGroup(group.id);
								}}
								title={`Eliminar grupo "${group.name}"`}
							>
								<i className="pi pi-times" />
							</button>
						</div>
					))}


					{/* Add new group button */}
					<button
						type="button"
						className="group-tab add-group-btn"
						onClick={() => setShowCreateGroupDialog(true)}
						title="Crear nuevo grupo"
					>
						<i className="pi pi-plus" />
					</button>
				</div>
			</div>

			{/* Create Group Dialog */}
			{showCreateGroupDialog && (
				<div className="create-group-overlay" onClick={() => setShowCreateGroupDialog(false)}>
					<div className="create-group-dialog" onClick={(e) => e.stopPropagation()}>
						<div className="dialog-header">
							<h3>Crear Grupo</h3>
							<button className="dialog-close" onClick={() => setShowCreateGroupDialog(false)}>
								<i className="pi pi-times" />
							</button>
						</div>
						<div className="dialog-body">
							<div className="form-field">
								<label>Nombre del grupo</label>
								<input
									type="text"
									value={newGroupName}
									onChange={(e) => setNewGroupName(e.target.value)}
									placeholder="Ej: Producción, Desarrollo..."
									autoFocus
									onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
								/>
							</div>
							<div className="form-field">
								<label>Color</label>
								<div className="color-picker">
									{['#4fc3f7', '#ff6b35', '#81c784', '#FFB300', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722'].map(c => (
										<button
											key={c}
											type="button"
											className={`color-option ${newGroupColor === c ? 'selected' : ''}`}
											style={{ background: c }}
											onClick={() => setNewGroupColor(c)}
										/>
									))}
								</div>
							</div>
						</div>
						<div className="dialog-footer">
							<button className="btn-cancel" onClick={() => setShowCreateGroupDialog(false)}>
								Cancelar
							</button>
							<button className="btn-create" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
								<i className="pi pi-check" /> Crear
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Edit/Delete Group Menu */}
			{editingGroup && (
				<div className="create-group-overlay" onClick={() => setEditingGroup(null)}>
					<div className="create-group-dialog small" onClick={(e) => e.stopPropagation()}>
						<div className="dialog-header">
							<h3>Opciones de "{editingGroup.name}"</h3>
							<button className="dialog-close" onClick={() => setEditingGroup(null)}>
								<i className="pi pi-times" />
							</button>
						</div>
						<div className="dialog-body">
							<button
								className="menu-option danger"
								onClick={() => {
									handleDeleteGroup(editingGroup.id);
									setEditingGroup(null);
								}}
							>
								<i className="pi pi-trash" /> Eliminar grupo
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Group Selector Dialog - shown when adding a favorite */}
			{showGroupSelector && connectionToFavorite && (
				<div className="create-group-overlay" onClick={() => setShowGroupSelector(false)}>
					<div className="create-group-dialog" onClick={(e) => e.stopPropagation()}>
						<div className="dialog-header">
							<h3>Agregar a favoritos</h3>
							<button className="dialog-close" onClick={() => setShowGroupSelector(false)}>
								<i className="pi pi-times" />
							</button>
						</div>
						<div className="dialog-body">
							<p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 16px', fontSize: '0.9rem' }}>
								Selecciona los grupos donde quieres añadir <strong style={{ color: '#fff' }}>{connectionToFavorite.name}</strong>:
							</p>
							<div className="groups-selector">
								{customGroups.map(group => (
									<button
										key={group.id}
										type="button"
										className={`group-selector-item ${selectedGroupsForFav.includes(group.id) ? 'selected' : ''}`}
										onClick={() => toggleGroupForFavorite(group.id)}
										style={{ '--group-color': group.color }}
									>
										<span className="group-dot" style={{ background: group.color }} />
										<span>{group.name}</span>
										{selectedGroupsForFav.includes(group.id) && (
											<i className="pi pi-check" style={{ marginLeft: 'auto', color: group.color }} />
										)}
									</button>
								))}
							</div>
							<p style={{ color: 'rgba(255,255,255,0.5)', margin: '16px 0 0', fontSize: '0.8rem', fontStyle: 'italic' }}>
								Puedes saltarte este paso para agregar sin grupos
							</p>
						</div>
						<div className="dialog-footer">
							<button
								className="btn-cancel"
								onClick={() => {
									// Agregar sin grupos
									toggleFavorite(connectionToFavorite);
									loadConnectionHistory();
									setShowGroupSelector(false);
									setConnectionToFavorite(null);
								}}
							>
								Sin grupos
							</button>
							<button className="btn-create" onClick={handleConfirmAddFavorite}>
								<i className="pi pi-star-fill" /> Agregar
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Edit Favorite Groups Dialog */}
			{showEditFavGroups && editingFavorite && (
				<div className="create-group-overlay" onClick={() => setShowEditFavGroups(false)}>
					<div className="create-group-dialog" onClick={(e) => e.stopPropagation()}>
						<div className="dialog-header">
							<h3><i className="pi pi-folder" /> Grupos de Favoritos</h3>
							<button className="dialog-close" onClick={() => setShowEditFavGroups(false)}>
								<i className="pi pi-times" />
							</button>
						</div>
						<div className="dialog-body">
							<p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 16px', fontSize: '0.9rem' }}>
								Asignar <strong style={{ color: '#fff' }}>{editingFavorite.name}</strong> a grupos:
							</p>
							<div className="groups-selector">
								{customGroups.length > 0 ? (
									customGroups.map(group => (
										<button
											key={group.id}
											type="button"
											className={`group-selector-item ${editSelectedGroups.includes(group.id) ? 'selected' : ''}`}
											onClick={() => toggleEditGroup(group.id)}
											style={{ '--group-color': group.color }}
										>
											<span className="group-dot" style={{ background: group.color }} />
											<span>{group.name}</span>
											{editSelectedGroups.includes(group.id) && (
												<i className="pi pi-check" style={{ marginLeft: 'auto', color: group.color }} />
											)}
										</button>
									))
								) : (
									<div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
										<i className="pi pi-info-circle" style={{ display: 'block', fontSize: '1.5rem', marginBottom: '8px' }} />
										No hay grupos personalizados creados.
									</div>
								)}
							</div>
						</div>
						<div className="dialog-footer">
							<button className="btn-cancel" onClick={() => setShowEditFavGroups(false)}>Cancelar</button>
							<button className="btn-create" onClick={handleSaveEditGroups}>
								<i className="pi pi-save" /> Guardar Cambios
							</button>
						</div>
					</div>
				</div>
			)}

			{/* FAVORITES RIBBON (Always visible, shows placeholder if empty) */}
			<FavoritesRibbon
				connections={filteredPinned}
				fullList={activeFavs}
				onReorder={(newList) => {
					// Reorder only works if showing all favorites or we handle group reordering logic carefully
					// For now, if filtered, we might just update the main list if possible, but simplest is:
					if (activeGroupId === 'all' && typeFilter === 'all') {
						setFavoriteConnections(newList);
						reorderFavorites(newList);
					}
				}}
				collapsed={favoritesCollapsed}
				onToggleCollapsed={toggleFavoritesCollapsed}
			/>


			{/* RECIENTES TABLE (Fills remaining space) */}
			<section className="connection-history-section" style={{ flex: 1, minHeight: 0, marginTop: '0.2rem' }}>
				<div className="modern-section-header">
					<button
						className="section-collapse-btn"
						onClick={toggleRecentsCollapsed}
						title={recentsCollapsed ? "Expandir recientes" : "Colapsar recientes"}
						style={{
							background: 'transparent',
							border: 'none',
							padding: '4px 8px',
							cursor: 'pointer',
							color: 'rgba(255, 255, 255, 0.7)',
							fontSize: '0.9rem',
							transition: 'all 0.2s ease',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
							e.currentTarget.style.transform = 'scale(1.1)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
							e.currentTarget.style.transform = 'scale(1)';
						}}
					>
						<i className={recentsCollapsed ? "pi pi-chevron-down" : "pi pi-chevron-up"} />
					</button>
					<div className="modern-header-title">
						<i className="pi pi-history" style={{ color: '#4fc3f7' }} />
						<span>RECIENTES</span>
					</div>
					<div className="modern-header-line"></div>
				</div>

				{!recentsCollapsed && (
					<ConnectionTable
						connections={filteredRecents}
						title="Nombre"
						emptyMessage="No hay sesiones recientes"
					/>
				)}
			</section>
		</div>
	);
};

export default ConnectionHistory;
