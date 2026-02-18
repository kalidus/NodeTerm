import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { getFavorites, toggleFavorite, onUpdate, isFavorite, reorderFavorites, helpers } from '../utils/connectionStore';
import { iconThemes } from '../themes/icon-themes';
import { SSHIconRenderer, SSHIconPresets } from './SSHIconSelector';
import favoriteGroupsStore from '../utils/favoriteGroupsStore';
import FilterPanel from './FilterPanel';
import FilterBadge from './FilterBadge';

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

	// Estado para configuración unificada de filtros
	const [showFilterConfig, setShowFilterConfig] = useState(false);
	const [allFilters, setAllFilters] = useState(() => favoriteGroupsStore.getAllFilters());

	// Estado para nuevo sistema de filtros (FilterPanel)
	const [filterPanelOpen, setFilterPanelOpen] = useState(false);
	const [filterContext, setFilterContext] = useState(null); // 'favorites' | 'recents'

	const [activeFavFilters, setActiveFavFilters] = useState(() => {
		try {
			const saved = localStorage.getItem('nodeterm_fav_filters');
			return saved ? JSON.parse(saved) : { protocols: [], groups: [], states: [] };
		} catch {
			return { protocols: [], groups: [], states: [] };
		}
	});

	const [activeRecentFilters, setActiveRecentFilters] = useState(() => {
		try {
			const saved = localStorage.getItem('nodeterm_recent_filters');
			return saved ? JSON.parse(saved) : { protocols: [], groups: [], states: [] };
		} catch {
			return { protocols: [], groups: [], states: [] };
		}
	});

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

	// Cargar y sincronizar grupos de favoritos y filtros
	useEffect(() => {
		const unsubscribe = favoriteGroupsStore.onGroupsUpdate(() => {
			setFavoriteGroups(favoriteGroupsStore.getGroups());
			setAllFilters(favoriteGroupsStore.getAllFilters());
		});
		return () => unsubscribe();
	}, []);

	// Escuchar evento de agregar favorito desde sidebar (para mostrar selector de grupos)
	useEffect(() => {
		const handleSidebarFavorite = (e) => {
			const connection = e.detail?.connection;
			if (!connection) return;

			// Always show dialog for sidebar actions
			setConnectionToFavorite(connection);

			const isFav = isFavorite(connection);
			if (isFav) {
				const favId = connection.id || helpers.buildId(connection);
				const currentGroups = favoriteGroupsStore.getFavoriteGroups(favId);
				setSelectedGroupsForFav(currentGroups);
			} else {
				setSelectedGroupsForFav([]);
			}

			setShowGroupSelector(true);
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
		if (!window.confirm('¿Estás seguro de que deseas eliminar este grupo?')) return;
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

		const isFav = isFavorite(connectionToFavorite);

		// Solo hacemos toggle si NO es favorito (para añadirlo).
		// Si YA es favorito, no hacemos toggle (lo quitaría), solo actualizamos grupos.
		if (!isFav) {
			toggleFavorite(connectionToFavorite);
		}

		// Asignar a grupos seleccionados
		// Usamos un ID consistente (el toggle ya debió añadirlo al store si era nuevo)
		const serial = typeof connectionToFavorite === 'string'
			? connectionToFavorite
			: (connectionToFavorite.id || helpers.buildId(connectionToFavorite));

		favoriteGroupsStore.assignFavoriteToGroups(serial, selectedGroupsForFav);

		setShowGroupSelector(false);
		setConnectionToFavorite(null);
		setSelectedGroupsForFav([]);
		loadConnectionHistory();
	};

	// Función para quitar de favoritos desde el diálogo
	const handleRemoveFavoriteFromDialog = () => {
		if (!connectionToFavorite) return;

		const isFav = isFavorite(connectionToFavorite);
		if (isFav) {
			toggleFavorite(connectionToFavorite); // Quitar
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
			case 'ssh-tunnel': return icons.ssh; // Usar icono SSH por defecto si no hay específico
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
			case 'ssh-tunnel': return '#ab47bc'; // Purple equivalent
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




	const activeKey = (c) => {
		if (c.type === 'group') return `group:${c.id}`;
		// Usar el ID del objeto si lo tiene, o regenerarlo usando buildId para consistencia
		if (c.id && !c.id.startsWith('group:')) return c.id;

		return helpers.buildId({
			type: c.type,
			host: c.host || c.hostname || c.server || '',
			username: c.username || c.user || '',
			port: c.port
		});
	};

	const handleFilterChange = (key) => {
		setTypeFilter(key);
		localStorage.setItem('nodeterm_fav_type', key);
	};

	// ============================================
	// NEW: Multi-Filter System Functions
	// ============================================

	const matchesProtocol = (conn, protocolId) => {
		if (protocolId === 'all') return true;
		if (protocolId === 'vnc-guacamole') return conn.type === 'vnc-guacamole' || conn.type === 'vnc';
		if (protocolId === 'rdp-guacamole') return conn.type === 'rdp-guacamole' || conn.type === 'rdp';
		if (protocolId === 'sftp') return ['sftp', 'explorer', 'ftp', 'scp'].includes(conn.type);
		if (protocolId === 'secret') return ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note'].includes(conn.type);
		return conn.type === protocolId;
	};

	const applyMultipleFilters = (connections, filters) => {
		let result = [...connections];

		// Filter by protocols (OR logic within protocols)
		if (filters.protocols && filters.protocols.length > 0) {
			result = result.filter(conn => {
				return filters.protocols.some(protocolId => matchesProtocol(conn, protocolId));
			});
		}

		// Filter by groups (OR logic within groups)
		if (filters.groups && filters.groups.length > 0) {
			result = result.filter(conn => {
				return filters.groups.some(groupId => {
					return favoriteGroupsStore.isFavoriteInGroup(conn.id || helpers.buildId(conn), groupId);
				});
			});
		}

		// Filter by states (AND logic for states)
		if (filters.states && filters.states.includes('favorites')) {
			result = result.filter(conn => isFavorite(conn));
		}
		if (filters.states && filters.states.includes('connected')) {
			result = result.filter(conn => activeIds.has(activeKey(conn)));
		}
		if (filters.states && filters.states.includes('recent')) {
			const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
			result = result.filter(conn => {
				if (!conn.lastConnected) return false;
				const lastConn = new Date(conn.lastConnected);
				return lastConn >= weekAgo;
			});
		}

		return result;
	};

	const handleApplyFilters = (filters) => {
		if (filterContext === 'favorites') {
			setActiveFavFilters(filters);
			try {
				localStorage.setItem('nodeterm_fav_filters', JSON.stringify(filters));
			} catch (e) {
				console.error('Error guardando filtros favoritos:', e);
			}
		} else if (filterContext === 'recents') {
			setActiveRecentFilters(filters);
			try {
				localStorage.setItem('nodeterm_recent_filters', JSON.stringify(filters));
			} catch (e) {
				console.error('Error guardando filtros recientes:', e);
			}
		}
	};

	const handleRemoveFilter = (context, category, filterId) => {
		const setFilters = context === 'favorites' ? setActiveFavFilters : setActiveRecentFilters;
		const storageKey = context === 'favorites' ? 'nodeterm_fav_filters' : 'nodeterm_recent_filters';

		setFilters(prev => {
			const newFilters = {
				...prev,
				[category]: prev[category].filter(id => id !== filterId)
			};
			// Guardar en localStorage
			try {
				localStorage.setItem(storageKey, JSON.stringify(newFilters));
			} catch (e) {
				console.error('Error guardando filtros:', e);
			}
			return newFilters;
		});
	};

	const getActiveFilterCount = (filters) => {
		return (filters?.protocols?.length || 0) +
			(filters?.groups?.length || 0) +
			(filters?.states?.length || 0);
	};

	const getFilterLabel = (category, filterId) => {
		if (category === 'protocols') {
			const protocolFilters = favoriteGroupsStore.getProtocolFilters();
			const filter = protocolFilters.find(f => f.id === filterId);
			return filter?.label || filterId;
		} else if (category === 'groups') {
			const group = favoriteGroups.find(g => g.id === filterId);
			return group?.name || filterId;
		} else if (category === 'states') {
			const stateLabels = {
				favorites: 'Favoritos',
				connected: 'Conectados',
				recent: 'Recientes'
			};
			return stateLabels[filterId] || filterId;
		}
		return filterId;
	};

	const getFilterColor = (category, filterId) => {
		if (category === 'protocols') {
			const protocolFilters = favoriteGroupsStore.getProtocolFilters();
			const filter = protocolFilters.find(f => f.id === filterId);
			return filter?.color || '#4fc3f7';
		} else if (category === 'groups') {
			const group = favoriteGroups.find(g => g.id === filterId);
			return group?.color || '#4fc3f7';
		} else if (category === 'states') {
			const stateColors = {
				favorites: '#FFD700',
				connected: '#4CAF50',
				recent: '#2196F3'
			};
			return stateColors[filterId] || '#4fc3f7';
		}
		return '#4fc3f7';
	};

	const getFilterIcon = (category, filterId) => {
		if (category === 'protocols') {
			const protocolFilters = favoriteGroupsStore.getProtocolFilters();
			const filter = protocolFilters.find(f => f.id === filterId);
			return filter?.icon || 'pi-circle';
		} else if (category === 'groups') {
			const group = favoriteGroups.find(g => g.id === filterId);
			return group?.icon || 'pi-folder';
		} else if (category === 'states') {
			const stateIcons = {
				favorites: 'pi-star',
				connected: 'pi-circle-fill',
				recent: 'pi-clock'
			};
			return stateIcons[filterId] || 'pi-circle';
		}
		return 'pi-circle';
	};

	// ============================================
	// Calculate filtered connections (AFTER function definitions)
	// ============================================
	// Filters for Favorites
	const hasFavFilters = getActiveFilterCount(activeFavFilters) > 0;
	const filteredFavorites = hasFavFilters
		? applyMultipleFilters(favoriteConnections, activeFavFilters)
		: favoriteConnections;

	// Filters for Recents
	const hasRecentFilters = getActiveFilterCount(activeRecentFilters) > 0;
	const filteredRecentsForDisplay = hasRecentFilters
		? applyMultipleFilters(recentConnections, activeRecentFilters)
		: recentConnections;

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
								return <SSHIconRenderer preset={preset} pixelSize={32} />;
							}
							const svg = getConnectionTypeIconSVG(connection.type, customIcon);
							if (svg) {
								return React.cloneElement(svg, { width: 32, height: 32, style: { width: 32, height: 32 } });
							}
							return <i className={getConnectionTypeIcon(connection.type)} aria-hidden="true" />;
						})()}
					</div>

					{/* Protocol Badge (Integrated) */}
					<div
						className="ribbon-card__protocol-badge"
						style={{
							color: typeColor,
							borderColor: typeColor,
							top: '0',
							bottom: 'auto',
							left: '-12px',
							right: 'auto',
							transform: 'none',
							background: 'rgba(0, 0, 0, 0.7)',
							boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
							fontSize: '0.5rem',
							padding: '1px 4px',
							borderRadius: '4px'
						}}
					>
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

	const FavoritesRibbon = ({
		connections,
		fullList,
		onReorder,
		collapsed,
		onToggleCollapsed,
		onOpenFilter,
		activeFilterCount,
		activeFilters,
		onRemoveFilter
	}) => {
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
			<div
				className="favorites-ribbon-section"
				onDragOver={(e) => {
					if (e.dataTransfer.types.includes('application/nodeterm-connection') || e.dataTransfer.types.includes('application/nodeterm-ssh-node')) {
						e.preventDefault();
						e.dataTransfer.dropEffect = 'copy';
					}
				}}
				onDrop={(e) => {
					const data = e.dataTransfer.getData('application/nodeterm-connection') || e.dataTransfer.getData('application/nodeterm-ssh-node');
					if (data) {
						e.preventDefault();
						e.stopPropagation();
						try {
							const nodeData = JSON.parse(data);
							const connection = nodeData.data;
							if (connection) {
								// Usar el label del nodo como nombre de la conexión si no tiene uno o para asegurar que sea el correcto
								if (nodeData.label) {
									connection.name = nodeData.label;
								}

								if (!connection.id) {
									connection.id = helpers.buildId(connection);
								}
								if (!isFavorite(connection)) {
									toggleFavorite(connection);
									loadConnectionHistory();
									if (window.toast?.current?.show) {
										window.toast.current.show({
											severity: 'success',
											summary: 'Agregado a Favoritos',
											detail: connection.name || 'Conexión agregada',
											life: 2000
										});
									}
								} else {
									if (window.toast?.current?.show) {
										window.toast.current.show({
											severity: 'info',
											summary: 'Ya existe',
											detail: 'Esta conexión ya está en favoritos',
											life: 2000
										});
									}
								}
							}
						} catch (err) {
							console.error('Error processing drop:', err);
						}
					}
				}}
			>
				<div className="modern-section-header header-favorites">
					<button
						className="section-collapse-btn"
						onClick={onToggleCollapsed}
						title={collapsed ? "Expandir favoritos" : "Colapsar favoritos"}
						style={{
							background: 'transparent',
							border: 'none',
							padding: '4px 2px',
							cursor: 'pointer',
							fontSize: '0.9rem',
							transition: 'all 0.2s ease',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.transform = 'scale(1.1)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.transform = 'scale(1)';
						}}
					>
						<i className={collapsed ? "pi pi-chevron-down" : "pi pi-chevron-up"} />
					</button>
					<div className="modern-header-title">
						<i className="pi pi-star-fill" />
						<span>FAVORITOS</span>
					</div>

					{/* Filter Button (Inline) */}
					<button
						className={`section-action-btn ${activeFilterCount > 0 ? 'active' : ''}`}
						onClick={onOpenFilter}
						title="Filtrar conexiones"
						style={{ marginRight: '8px' }}
					>
						<i className={`pi ${activeFilterCount > 0 ? 'pi-filter-fill' : 'pi-filter'}`} />
					</button>

					{/* Active Filter Chips (Inline, Scrollable) */}
					{activeFilterCount > 0 && (
						<div className="header-active-filters">
							{activeFilters.protocols?.map(filterId => (
								<FilterBadge
									key={`protocol-${filterId}`}
									label={getFilterLabel('protocols', filterId)}
									color={getFilterColor('protocols', filterId)}
									icon={getFilterIcon('protocols', filterId)}
									type="protocol"
									onRemove={() => onRemoveFilter('protocols', filterId)}
									compact
								/>
							))}
							{activeFilters.groups?.map(filterId => (
								<FilterBadge
									key={`group-${filterId}`}
									label={getFilterLabel('groups', filterId)}
									color={getFilterColor('groups', filterId)}
									icon={getFilterIcon('groups', filterId)}
									type="group"
									onRemove={() => onRemoveFilter('groups', filterId)}
									compact
								/>
							))}
							{activeFilters.states?.map(filterId => (
								<FilterBadge
									key={`state-${filterId}`}
									label={getFilterLabel('states', filterId)}
									color={getFilterColor('states', filterId)}
									icon={getFilterIcon('states', filterId)}
									type="state"
									onRemove={() => onRemoveFilter('states', filterId)}
									compact
								/>
							))}
						</div>
					)}

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
											onDragOver={(e) => {
												if (e.dataTransfer.types.includes('application/nodeterm-connection') || e.dataTransfer.types.includes('application/nodeterm-ssh-node')) {
													e.preventDefault();
													e.dataTransfer.dropEffect = 'copy';
												} else {
													handleDragOver(e);
												}
											}}
											onDrop={(e, targetItem) => {
												const data = e.dataTransfer.getData('application/nodeterm-connection') || e.dataTransfer.getData('application/nodeterm-ssh-node');
												if (data) {
													// Permitir que el evento suba al contenedor
													return;
												}
												handleDrop(e, targetItem);
											}}
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


	// Filtros unificados visibles (protocolos + grupos personalizados)
	const visibleFilters = allFilters.filter(f => f.visible);

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

	// Debug: Log theme colors to see what we're getting
	React.useEffect(() => {
		// console.log('🎨 ConnectionHistory themeColors:', {
		// 	itemBackground: themeColors.itemBackground,
		// 	cardBackground: themeColors.cardBackground,
		// 	textPrimary: themeColors.textPrimary
		// });
	}, [themeColors]);

	return (
		<div className="connection-history-root">


			{/* FilterPanel Dropdown - Rendered in Portal to avoid clipping */}
			{ReactDOM.createPortal(
				<FilterPanel
					isOpen={filterPanelOpen}
					onClose={() => setFilterPanelOpen(false)}
					activeFilters={filterContext === 'favorites' ? activeFavFilters : activeRecentFilters}
					onApplyFilters={handleApplyFilters}
					availableFilters={{
						protocols: favoriteGroupsStore.getProtocolFilters().map(f => ({
							...f,
							count: countByType(filterContext === 'recents' ? recentConnections : favoriteConnections, f.id)
						})),
						groups: favoriteGroups.filter(g => !g.isDefault).map(g => ({
							id: g.id,
							label: g.name,
							icon: g.icon || 'pi-folder',
							color: g.color,
							count: filterContext === 'recents'
								? recentConnections.filter(c => c.groupId === g.id).length // Simple check for recents
								: favoriteGroupsStore.getFavoritesInGroup(g.id, favoriteConnections).length
						}))
					}}
					themeColors={themeColors}
					onCreateGroup={() => setShowCreateGroupDialog(true)}
					onDeleteGroup={handleDeleteGroup}
				/>,
				document.body
			)}

			{/* Filter Configuration Dialog */}
			{showFilterConfig && ReactDOM.createPortal(
				<div className="create-group-overlay" onClick={() => setShowFilterConfig(false)}>
					<div className="create-group-dialog filter-config-dialog" onClick={(e) => e.stopPropagation()}>
						<div className="dialog-header">
							<h3><i className="pi pi-cog" /> Configurar Filtros</h3>
							<button className="dialog-close" onClick={() => setShowFilterConfig(false)}>
								<i className="pi pi-times" />
							</button>
						</div>
						<div className="dialog-body">
							<p style={{ color: 'rgba(255,255,255,0.6)', margin: '0 0 16px', fontSize: '0.85rem' }}>
								Activa o desactiva los filtros que deseas ver en la barra:
							</p>
							<div className="filter-config-list">
								{allFilters.map(filter => (
									<div
										key={filter.id}
										className={`filter-config-item ${filter.visible ? 'visible' : 'hidden'}`}
										style={{ '--item-color': filter.color }}
									>
										<div className="filter-config-info">
											{filter.isGroup && (
												<span className="filter-config-dot" style={{ background: filter.color }} />
											)}
											<i className={`pi ${filter.icon}`} style={{ color: filter.color }} />
											<span className="filter-config-label">{filter.label}</span>
											{filter.isProtocol && <span className="filter-config-type">Protocolo</span>}
											{filter.isGroup && <span className="filter-config-type">Grupo</span>}
										</div>
										<button
											type="button"
											className={`filter-config-toggle ${filter.visible ? 'on' : 'off'}`}
											onClick={() => {
												if (filter.id !== 'all') {
													favoriteGroupsStore.setFilterVisibility(filter.id, !filter.visible);
													setAllFilters(favoriteGroupsStore.getAllFilters());
												}
											}}
											disabled={filter.id === 'all'}
											title={filter.id === 'all' ? 'Este filtro siempre está visible' : (filter.visible ? 'Ocultar' : 'Mostrar')}
										>
											<i className={filter.visible ? 'pi pi-eye' : 'pi pi-eye-slash'} />
										</button>
									</div>
								))}
							</div>
						</div>
						<div className="dialog-footer">
							<button
								className="btn-cancel"
								onClick={() => {
									favoriteGroupsStore.resetFilterConfig();
									setAllFilters(favoriteGroupsStore.getAllFilters());
								}}
							>
								<i className="pi pi-refresh" /> Restaurar
							</button>
							<button className="btn-create" onClick={() => setShowFilterConfig(false)}>
								<i className="pi pi-check" /> Listo
							</button>
						</div>
					</div>
				</div>,
				document.body
			)}
			{showCreateGroupDialog && ReactDOM.createPortal(
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
				</div>,
				document.body
			)}

			{/* Edit/Delete Group Menu */}
			{editingGroup && ReactDOM.createPortal(
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
				</div>,
				document.body
			)}

			{/* Group Selector Dialog - shown when adding a favorite */}
			{/* Group Selector Dialog - shown when adding a favorite */}
			{showGroupSelector && connectionToFavorite && ReactDOM.createPortal(
				<div className="create-group-overlay" onClick={() => setShowGroupSelector(false)}>
					<div className="create-group-dialog" onClick={(e) => e.stopPropagation()}>
						<div className="dialog-header">
							<h3>{isFavorite(connectionToFavorite) ? 'Editar favorito' : 'Agregar a favoritos'}</h3>
							<button className="dialog-close" onClick={() => setShowGroupSelector(false)}>
								<i className="pi pi-times" />
							</button>
						</div>
						<div className="dialog-body">
							<p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 16px', fontSize: '0.9rem' }}>
								Selecciona los grupos para <strong style={{ color: '#fff' }}>{connectionToFavorite.name}</strong>:
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
							{!customGroups.length && (
								<p style={{ color: 'rgba(255,255,255,0.5)', margin: '8px 0', fontSize: '0.8rem', fontStyle: 'italic' }}>
									No hay grupos personalizados.
								</p>
							)}
						</div>
						<div className="dialog-footer">
							{isFavorite(connectionToFavorite) ? (
								<button
									className="btn-cancel"
									style={{ color: '#ff5252' }}
									onClick={handleRemoveFavoriteFromDialog}
								>
									<i className="pi pi-trash" style={{ marginRight: 6 }} />
									Quitar fav
								</button>
							) : (
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
							)}

							<button className="btn-create" onClick={handleConfirmAddFavorite}>
								{isFavorite(connectionToFavorite) ? (
									<><i className="pi pi-save" /> Guardar</>
								) : (
									<><i className="pi pi-star-fill" /> Agregar</>
								)}
							</button>
						</div>
					</div>
				</div>,
				document.body
			)}

			{/* Edit Favorite Groups Dialog */}
			{showEditFavGroups && editingFavorite && ReactDOM.createPortal(
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
				</div>,
				document.body
			)}

			{/* FAVORITES RIBBON (Always visible, shows placeholder if empty) */}
			<FavoritesRibbon
				connections={filteredFavorites}
				fullList={favoriteConnections}
				onReorder={(newList) => {
					// Enable reordering even if filtered
					// We merge the reordered subset back into the main list
					const currentFullList = [...favoriteConnections];

					// 1. Identify indices of the items in the main list that are part of the reordered set
					// (The items in 'newList' are the ones currently visible and reordered)
					const subsetIds = new Set(newList.map(c => c.id));
					const indices = [];

					currentFullList.forEach((c, index) => {
						if (subsetIds.has(c.id)) {
							indices.push(index);
						}
					});

					// 2. Place the items from the new list into the identified slots
					if (indices.length === newList.length) {
						indices.forEach((originalIndex, i) => {
							currentFullList[originalIndex] = newList[i];
						});

						// 3. Save and update
						reorderFavorites(currentFullList);
						loadConnectionHistory();
					} else {
						console.warn('Cannot reorder: index mismatch', indices.length, newList.length);
					}
				}}
				collapsed={favoritesCollapsed}
				onToggleCollapsed={toggleFavoritesCollapsed}
				onOpenFilter={() => {
					setFilterContext('favorites');
					setFilterPanelOpen(true);
				}}
				activeFilterCount={getActiveFilterCount(activeFavFilters)}
				activeFilters={activeFavFilters}
				onRemoveFilter={(cat, id) => handleRemoveFilter('favorites', cat, id)}
			/>


			{/* RECIENTES TABLE (Fills remaining space) */}
			<section className="connection-history-section" style={{ flex: 1, minHeight: 0, marginTop: '0' }}>
				<div className="modern-section-header header-recents">
					<button
						className="section-collapse-btn"
						onClick={toggleRecentsCollapsed}
						title={recentsCollapsed ? "Expandir recientes" : "Colapsar recientes"}
						style={{
							background: 'transparent',
							border: 'none',
							padding: '4px 2px',
							cursor: 'pointer',
							fontSize: '0.9rem',
							transition: 'all 0.2s ease',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.transform = 'scale(1.1)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.transform = 'scale(1)';
						}}
					>
						<i className={recentsCollapsed ? "pi pi-chevron-down" : "pi pi-chevron-up"} />
					</button>
					<div className="modern-header-title">
						<i className="pi pi-history" />
						<span>RECIENTES</span>
					</div>

					{/* Filter Button (Recents) */}
					<button
						className={`section-action-btn ${getActiveFilterCount(activeRecentFilters) > 0 ? 'active' : ''}`}
						onClick={() => {
							setFilterContext('recents');
							setFilterPanelOpen(true);
						}}
						title="Filtrar recientes"
						style={{ marginRight: '8px' }}
					>
						<i className={`pi ${getActiveFilterCount(activeRecentFilters) > 0 ? 'pi-filter-fill' : 'pi-filter'}`} />
					</button>

					{/* Active Filter Chips (Recents) */}
					{getActiveFilterCount(activeRecentFilters) > 0 && (
						<div className="header-active-filters">
							{activeRecentFilters.protocols?.map(filterId => (
								<FilterBadge
									key={`protocol-${filterId}`}
									label={getFilterLabel('protocols', filterId)}
									color={getFilterColor('protocols', filterId)}
									icon={getFilterIcon('protocols', filterId)}
									type="protocol"
									onRemove={() => handleRemoveFilter('recents', 'protocols', filterId)}
									compact
								/>
							))}
							{activeRecentFilters.groups?.map(filterId => (
								<FilterBadge
									key={`group-${filterId}`}
									label={getFilterLabel('groups', filterId)}
									color={getFilterColor('groups', filterId)}
									icon={getFilterIcon('groups', filterId)}
									type="group"
									onRemove={() => handleRemoveFilter('recents', 'groups', filterId)}
									compact
								/>
							))}
							{activeRecentFilters.states?.map(filterId => (
								<FilterBadge
									key={`state-${filterId}`}
									label={getFilterLabel('states', filterId)}
									color={getFilterColor('states', filterId)}
									icon={getFilterIcon('states', filterId)}
									type="state"
									onRemove={() => handleRemoveFilter('recents', 'states', filterId)}
									compact
								/>
							))}
						</div>
					)}
					<div className="modern-header-line"></div>
				</div>


				{!recentsCollapsed && (
					<ConnectionTable
						connections={filteredRecentsForDisplay}
						title="Nombre"
						emptyMessage="No hay sesiones recientes"
					/>
				)}
			</section>
		</div>
	);
};

export default ConnectionHistory;
