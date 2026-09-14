import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import favoriteGroupsStore from '../../../../utils/favoriteGroupsStore';
import { appConfirm } from '../../../ui/AppConfirm';
import { isFavorite, toggleFavorite, helpers } from '../../../../utils/connectionStore';
import { activeKey } from '../utils/connectionHistoryHelpers';

export const useFavoriteGroupsManager = ({
	recentConnections = [],
	favoriteConnections = [],
	loadConnectionHistory,
	activeIds = new Set(),
	typeFilter = 'all',
	setTypeFilter
}) => {
	// Grupos de favoritos personalizados
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

	// Configuración unificada de filtros
	const [showFilterConfig, setShowFilterConfig] = useState(false);
	const [allFilters, setAllFilters] = useState(() => favoriteGroupsStore.getAllFilters());

	// Nuevo sistema de filtros (FilterPanel)
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

	// Selector de grupos al agregar favorito
	const [showGroupSelector, setShowGroupSelector] = useState(false);
	const [connectionToFavorite, setConnectionToFavorite] = useState(null);
	const [selectedGroupsForFav, setSelectedGroupsForFav] = useState([]);

	// Editar grupos de un favorito existente
	const [showEditFavGroups, setShowEditFavGroups] = useState(false);
	const [editingFavorite, setEditingFavorite] = useState(null);
	const [editSelectedGroups, setEditSelectedGroups] = useState([]);

	// Cargar y sincronizar grupos de favoritos y filtros
	useEffect(() => {
		const unsubscribe = favoriteGroupsStore.onGroupsUpdate(() => {
			setFavoriteGroups(favoriteGroupsStore.getGroups());
			setAllFilters(favoriteGroupsStore.getAllFilters());
		});
		return () => unsubscribe();
	}, []);

	// Escuchar evento de agregar favorito desde sidebar
	useEffect(() => {
		const handleSidebarFavorite = (e) => {
			const connection = e.detail?.connection;
			if (!connection) return;

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
					width: btnRect.width
				});
			}
		};
		const timer = setTimeout(updateIndicator, 50);
		window.addEventListener('resize', updateIndicator);
		return () => {
			clearTimeout(timer);
			window.removeEventListener('resize', updateIndicator);
		};
	}, [typeFilter, activeGroupId, favoriteGroups]);

	// Funciones para gestión de grupos
	const handleCreateGroup = useCallback(() => {
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
	}, [newGroupName, newGroupColor]);

	const handleDeleteGroup = useCallback(async (groupId) => {
		const ok = await appConfirm({
			message: '¿Estás seguro de que deseas eliminar este grupo?',
			header: 'Confirmar',
			severity: 'danger',
			acceptLabel: 'Aceptar',
			rejectLabel: 'Cancelar'
		});
		if (!ok) return;
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
	}, [activeGroupId]);

	const handleGroupChange = useCallback((groupId) => {
		const newGroupId = (activeGroupId === groupId) ? 'all' : groupId;
		setActiveGroupId(newGroupId);
		localStorage.setItem('nodeterm_active_group', newGroupId);
	}, [activeGroupId]);

	// Manejar toggle de favorito con selector de grupo
	const handleToggleFavoriteWithGroup = useCallback((connection) => {
		const isCurrentlyFavorite = isFavorite(connection);
		const userGroups = favoriteGroups.filter(g => !g.isDefault);

		if (isCurrentlyFavorite) {
			toggleFavorite(connection);
			loadConnectionHistory();
		} else {
			if (userGroups.length > 0) {
				setConnectionToFavorite(connection);
				setSelectedGroupsForFav([]);
				setShowGroupSelector(true);
			} else {
				toggleFavorite(connection);
				loadConnectionHistory();
			}
		}
	}, [favoriteGroups, loadConnectionHistory]);

	// Confirmar agregar a favoritos con grupos seleccionados
	const handleConfirmAddFavorite = useCallback(() => {
		if (!connectionToFavorite) return;

		const isFav = isFavorite(connectionToFavorite);
		if (!isFav) {
			toggleFavorite(connectionToFavorite);
		}

		const serial = typeof connectionToFavorite === 'string'
			? connectionToFavorite
			: (connectionToFavorite.id || helpers.buildId(connectionToFavorite));

		favoriteGroupsStore.assignFavoriteToGroups(serial, selectedGroupsForFav);

		setShowGroupSelector(false);
		setConnectionToFavorite(null);
		setSelectedGroupsForFav([]);
		loadConnectionHistory();
	}, [connectionToFavorite, selectedGroupsForFav, loadConnectionHistory]);

	// Función para quitar de favoritos desde el diálogo
	const handleRemoveFavoriteFromDialog = useCallback(() => {
		if (!connectionToFavorite) return;

		const isFav = isFavorite(connectionToFavorite);
		if (isFav) {
			toggleFavorite(connectionToFavorite);
		}

		setShowGroupSelector(false);
		setConnectionToFavorite(null);
		setSelectedGroupsForFav([]);
		loadConnectionHistory();
	}, [connectionToFavorite, loadConnectionHistory]);

	const toggleGroupForFavorite = useCallback((groupId) => {
		setSelectedGroupsForFav(prev => {
			if (prev.includes(groupId)) {
				return prev.filter(id => id !== groupId);
			}
			return [...prev, groupId];
		});
	}, []);

	// Editar grupos de un favorito existente
	const handleEditFavoriteGroups = useCallback((connection) => {
		const favId = connection.id || helpers.buildId(connection);
		const currentGroups = favoriteGroupsStore.getFavoriteGroups(favId);
		setEditingFavorite(connection);
		setEditSelectedGroups(currentGroups);
		setShowEditFavGroups(true);
	}, []);

	const toggleEditGroup = useCallback((groupId) => {
		setEditSelectedGroups(prev => {
			if (prev.includes(groupId)) {
				return prev.filter(id => id !== groupId);
			}
			return [...prev, groupId];
		});
	}, []);

	const handleSaveEditGroups = useCallback(() => {
		if (!editingFavorite) return;
		const favId = editingFavorite.id || helpers.buildId(editingFavorite);
		favoriteGroupsStore.assignFavoriteToGroups(favId, editSelectedGroups);
		setShowEditFavGroups(false);
		setEditingFavorite(null);
		setEditSelectedGroups([]);
		loadConnectionHistory();
	}, [editingFavorite, editSelectedGroups, loadConnectionHistory]);

	// Multi-Filter Functions
	const matchesProtocol = useCallback((conn, protocolId) => {
		if (protocolId === 'all') return true;
		if (protocolId === 'vnc-guacamole') return conn.type === 'vnc-guacamole' || conn.type === 'vnc';
		if (protocolId === 'rdp-guacamole') return conn.type === 'rdp-guacamole' || conn.type === 'rdp';
		if (protocolId === 'sftp') return ['sftp', 'explorer', 'ftp', 'scp'].includes(conn.type);
		if (protocolId === 'secret') return ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note'].includes(conn.type);
		return conn.type === protocolId;
	}, []);

	const applyMultipleFilters = useCallback((connections, filters) => {
		let result = [...connections];

		if (filters.protocols && filters.protocols.length > 0) {
			result = result.filter(conn => {
				return filters.protocols.some(protocolId => matchesProtocol(conn, protocolId));
			});
		}

		if (filters.groups && filters.groups.length > 0) {
			result = result.filter(conn => {
				return filters.groups.some(groupId => {
					return favoriteGroupsStore.isFavoriteInGroup(conn.id || helpers.buildId(conn), groupId);
				});
			});
		}

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
	}, [activeIds, matchesProtocol]);

	const handleApplyFilters = useCallback((filters) => {
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
	}, [filterContext]);

	const handleRemoveFilter = useCallback((context, category, filterId) => {
		const setFilters = context === 'favorites' ? setActiveFavFilters : setActiveRecentFilters;
		const storageKey = context === 'favorites' ? 'nodeterm_fav_filters' : 'nodeterm_recent_filters';

		setFilters(prev => {
			const newFilters = {
				...prev,
				[category]: prev[category].filter(id => id !== filterId)
			};
			try {
				localStorage.setItem(storageKey, JSON.stringify(newFilters));
			} catch (e) {
				console.error('Error guardando filtros:', e);
			}
			return newFilters;
		});
	}, []);

	const getActiveFilterCount = useCallback((filters) => {
		return (filters?.protocols?.length || 0) +
			(filters?.groups?.length || 0) +
			(filters?.states?.length || 0);
	}, []);

	const getFilterLabel = useCallback((category, filterId) => {
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
	}, [favoriteGroups]);

	const getFilterColor = useCallback((category, filterId) => {
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
	}, [favoriteGroups]);

	const getFilterIcon = useCallback((category, filterId) => {
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
	}, [favoriteGroups]);

	const countByType = useCallback((connections, filterKey) => {
		if (filterKey === 'all') return connections.length;
		if (filterKey === 'vnc-guacamole') return connections.filter(c => c.type === 'vnc-guacamole' || c.type === 'vnc').length;
		if (filterKey === 'rdp-guacamole') return connections.filter(c => c.type === 'rdp-guacamole' || c.type === 'rdp').length;
		if (filterKey === 'sftp') return connections.filter(c => ['sftp', 'explorer', 'ftp', 'scp'].includes(c.type)).length;
		if (filterKey === 'secret') return connections.filter(c => ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note'].includes(c.type)).length;
		return connections.filter(c => c.type === filterKey).length;
	}, []);

	// Calculo de favoritos filtrados
	const hasFavFilters = getActiveFilterCount(activeFavFilters) > 0;
	const filteredFavorites = useMemo(() => {
		return hasFavFilters
			? applyMultipleFilters(favoriteConnections, activeFavFilters)
			: favoriteConnections;
	}, [hasFavFilters, favoriteConnections, activeFavFilters, applyMultipleFilters]);

	// Calculo de recientes filtrados
	const hasRecentFilters = getActiveFilterCount(activeRecentFilters) > 0;
	const filteredRecentsForDisplay = useMemo(() => {
		return hasRecentFilters
			? applyMultipleFilters(recentConnections, activeRecentFilters)
			: recentConnections;
	}, [hasRecentFilters, recentConnections, activeRecentFilters, applyMultipleFilters]);

	const visibleFilters = useMemo(() => allFilters.filter(f => f.visible), [allFilters]);
	const customGroups = useMemo(() => favoriteGroups.filter(g => !g.isDefault), [favoriteGroups]);

	return {
		favoriteGroups,
		setFavoriteGroups,
		activeGroupId,
		setActiveGroupId,
		showCreateGroupDialog,
		setShowCreateGroupDialog,
		newGroupName,
		setNewGroupName,
		newGroupColor,
		setNewGroupColor,
		editingGroup,
		setEditingGroup,
		filterBarRef,
		indicatorStyle,
		showFilterConfig,
		setShowFilterConfig,
		allFilters,
		setAllFilters,
		filterPanelOpen,
		setFilterPanelOpen,
		filterContext,
		setFilterContext,
		activeFavFilters,
		setActiveFavFilters,
		activeRecentFilters,
		setActiveRecentFilters,
		showGroupSelector,
		setShowGroupSelector,
		connectionToFavorite,
		setConnectionToFavorite,
		selectedGroupsForFav,
		setSelectedGroupsForFav,
		showEditFavGroups,
		setShowEditFavGroups,
		editingFavorite,
		setEditingFavorite,
		editSelectedGroups,
		setEditSelectedGroups,
		handleCreateGroup,
		handleDeleteGroup,
		handleGroupChange,
		handleToggleFavoriteWithGroup,
		handleConfirmAddFavorite,
		handleRemoveFavoriteFromDialog,
		toggleGroupForFavorite,
		handleEditFavoriteGroups,
		toggleEditGroup,
		handleSaveEditGroups,
		handleApplyFilters,
		handleRemoveFilter,
		getActiveFilterCount,
		getFilterLabel,
		getFilterColor,
		getFilterIcon,
		countByType,
		filteredFavorites,
		filteredRecentsForDisplay,
		visibleFilters,
		customGroups
	};
};
export default useFavoriteGroupsManager;
