import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { getFavorites, toggleFavorite, onUpdate, isFavorite, reorderFavorites, helpers } from '../utils/connectionStore';
import { iconThemes } from '../themes/icon-themes';
import { SSHIconRenderer, SSHIconPresets } from './SSHIconSelector';
import favoriteGroupsStore from '../utils/favoriteGroupsStore';
import FilterPanel from './FilterPanel';
import FilterBadge from './FilterBadge';
import { InputText } from 'primereact/inputtext';

// Formatear "Hace 5m", "Hace 2 h", "Ayer", etc.
function formatRelativeTime(iso) {
	if (!iso) return '-';
	const d = new Date(iso);
	if (isNaN(d.getTime())) return '-';
	const s = Math.floor((Date.now() - d) / 1000);
	if (s < 60) return 'Ahora';
	if (s < 3600) return `Hace ${Math.floor(s / 60)}m`;
	if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
	if (s < 172800) return 'Ayer';
	if (s < 604800) return `Hace ${Math.floor(s / 86400)} d\u00EDas`;
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
	if (conn.type === 'group') return conn.name || '-';

	// Para secretos (passwords, wallets, etc.), mostrar URL o username
	if (['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note'].includes(conn.type)) {
		if (conn.url) return conn.url;
		if (conn.username) return conn.username;
		return conn.group || '-';
	}

	// En conexiones con basti\u00F3n (Wallix), la cadena completa est\u00E1 en bastionUser
	const user = conn.useBastionWallix ? (conn.bastionUser || conn.username || conn.user || '') : (conn.username || conn.user || '');
	const host = conn.host || conn.hostname || '';
	const port = conn.port != null && conn.port !== '' ? Number(conn.port) : null;
	const def = defaultPort(conn.type);
	let part = user ? (host ? `${user}@${host}` : user) : (host || '-');
	if (port != null && !isNaN(port) && port !== def) part += `:${port}`;
	return part;
}

// Funci\u00F3n helper para buscar un nodo en el \u00E1rbol de la sidebar
const findNodeInTree = (nodes, connection) => {
	if (!nodes || !Array.isArray(nodes)) return null;

	for (const node of nodes) {
		// Verificar si el nodo coincide con la conexi\u00F3n
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

// Protocol and styling helpers are defined below within the component or can be moved here if needed.

const getNodeFolderPath = (nodes, targetNode) => {
	const findFolderPath = (nodeList, target, currentPath = []) => {
		if (!nodeList) return null;
		for (const node of nodeList) {
			// Solo agregar a la ruta si es una carpeta (no una conexi\u00F3n)
			const isFolder = !node.data || (!node.data.type || (node.data.type !== 'ssh' && node.data.type !== 'rdp' && node.data.type !== 'rdp-guacamole'));
			const newPath = isFolder ? [...currentPath, node.label] : currentPath;

			// Si encontramos el nodo objetivo, retornar la ruta de carpetas (sin incluir la conexi\u00F3n)
			if (node.key === target.key) {
				return currentPath;
			}

			// Si tiene hijos, buscar recursivamente
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

const ConnectionHistory = ({
	onConnectToHistory,
	recentConnections = [],
	activeIds = new Set(),
	onEdit,
	themeColors = {},
	sidebarNodes = null,
	masterKey = null,
	secureStorage = null,
	terminalView = false,
	onTerminalToggle = null,
	terminalTheme = {},
}) => {
	const [favoriteConnections, setFavoriteConnections] = useState([]);
	const [passwordNodes, setPasswordNodes] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [filteredSearchResults, setFilteredSearchResults] = useState([]);
	const [isSearching, setIsSearching] = useState(false);
	const [showDropdown, setShowDropdown] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const [activeBottomView, setActiveBottomView] = useState('all');

	// Cargar passwords desde localStorage (con soporte para encriptaci\u00F3n) - Igual que en TitleBar
	useEffect(() => {
		const loadPasswords = async () => {
			try {
				if (masterKey && secureStorage) {
					const encryptedData = localStorage.getItem('passwords_encrypted');
					if (encryptedData) {
						const decrypted = await secureStorage.decryptData(
							JSON.parse(encryptedData),
							masterKey
						);
						setPasswordNodes(decrypted || []);
					} else {
						const plainData = localStorage.getItem('passwordManagerNodes');
						if (plainData) {
							setPasswordNodes(JSON.parse(plainData) || []);
						}
					}
				} else {
					const saved = localStorage.getItem('passwordManagerNodes');
					if (saved) {
						setPasswordNodes(JSON.parse(saved) || []);
					}
				}
			} catch (error) {
				console.error('Error loading passwords for home search:', error);
				setPasswordNodes([]);
			}
		};

		loadPasswords();
		const handleStorageChange = (e) => {
			if (e.key === 'passwordManagerNodes' || e.key === 'passwords_encrypted') {
				loadPasswords();
			}
		};
		window.addEventListener('storage', handleStorageChange);
		return () => window.removeEventListener('storage', handleStorageChange);
	}, [masterKey, secureStorage]);

	// Funci\u00F3n para encontrar todas las conexiones en el \u00E1rbol
	const findAllSidebarConnections = useCallback((nodesList) => {
		if (!nodesList) return [];
		let results = [];
		const traverse = (list) => {
			for (const node of list) {
				if (node.data && (node.data.type === 'ssh' || node.data.type === 'rdp' || node.data.type === 'rdp-guacamole' || node.data.type === 'vnc' || node.data.type === 'vnc-guacamole')) {
					results.push(node);
				}
				if (node.children && node.children.length > 0) {
					traverse(node.children);
				}
			}
		};
		traverse(nodesList);
		return results;
	}, []);

	// Funci\u00F3n para encontrar todos los passwords en el \u00E1rbol
	const findAllPasswords = useCallback((nodesList) => {
		if (!nodesList) return [];
		let results = [];
		const traverse = (list) => {
			for (const node of list) {
				if (node.data && node.data.type === 'password') {
					results.push(node);
				}
				if (node.children && node.children.length > 0) {
					traverse(node.children);
				}
			}
		};
		traverse(nodesList);
		return results;
	}, []);

	// L\u00F3gica de b\u00FAsqueda debounced
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			if (searchTerm.trim()) {
				setIsSearching(true);
				const performSearch = () => {
					try {
						const query = searchTerm.toLowerCase();
						const allConnNodes = findAllSidebarConnections(sidebarNodes);
						const allPwdNodes = findAllPasswords(passwordNodes);
						const combined = [...allConnNodes, ...allPwdNodes];
						const MAX_RESULTS = 30;

						const filtered = [];
						for (let i = 0; i < combined.length && filtered.length < MAX_RESULTS; i++) {
							const node = combined[i];
							let matches = false;

							if (node.label.toLowerCase().includes(query)) {
								matches = true;
							} else if (node.data) {
								if (node.data.type === 'password') {
									matches = (
										(node.data.username && node.data.username.toLowerCase().includes(query)) ||
										(node.data.url && node.data.url.toLowerCase().includes(query)) ||
										(node.data.group && node.data.group.toLowerCase().includes(query))
									);
								} else {
									matches = (
										(node.data.host && node.data.host.toLowerCase().includes(query)) ||
										(node.data.hostname && node.data.hostname.toLowerCase().includes(query)) ||
										(node.data.user && node.data.user.toLowerCase().includes(query)) ||
										(node.data.username && node.data.username.toLowerCase().includes(query))
									);
								}
							}

							if (matches) filtered.push(node);
						}

						setFilteredSearchResults(filtered);
						setShowDropdown(filtered.length > 0);
						setIsSearching(false);
						setActiveIndex(-1);
					} catch (err) {
						console.error('Search error:', err);
						setIsSearching(false);
					}
				};

				if (typeof requestIdleCallback !== 'undefined') {
					requestIdleCallback(performSearch);
				} else {
					setTimeout(performSearch, 0);
				}
			} else {
				setFilteredSearchResults([]);
				setShowDropdown(false);
				setIsSearching(false);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [searchTerm, sidebarNodes, passwordNodes, findAllSidebarConnections, findAllPasswords]);

	// Cerrar dropdown al hacer click fuera
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (showDropdown && !event.target.closest('.hero-search-container') && !event.target.closest('.hero-search-dropdown')) {
				setShowDropdown(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showDropdown]);

	const handleSearchKeyDown = (e) => {
		if (!showDropdown) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setActiveIndex(prev => (prev < filteredSearchResults.length - 1 ? prev + 1 : prev));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
		} else if (e.key === 'Enter') {
			if (activeIndex >= 0 && activeIndex < filteredSearchResults.length) {
				handleSelectSearchResult(filteredSearchResults[activeIndex]);
			}
		} else if (e.key === 'Escape') {
			setShowDropdown(false);
		}
	};

	const handleSelectSearchResult = (node) => {
		setSearchTerm('');
		setShowDropdown(false);

		const isPassword = node.data && node.data.type === 'password';
		if (isPassword) {
			const payload = {
				key: node.key,
				label: node.label,
				data: { ...node.data }
			};
			window.dispatchEvent(new CustomEvent('open-password-tab', { detail: payload }));
		} else {
			// Es una conexi\u00F3n, usar handleConnectToHistory pero adaptando el formato
			const conn = helpers.fromSidebarNode(node);
			if (conn) onConnectToHistory(conn);
		}
	};

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

	// Estado para configuraci\u00F3n unificada de filtros
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
		// Delay para asegurar que el DOM est\u00E9 listo
		const timer = setTimeout(updateIndicator, 50);
		window.addEventListener('resize', updateIndicator);
		return () => {
			clearTimeout(timer);
			window.removeEventListener('resize', updateIndicator);
		};
	}, [typeFilter, activeGroupId, favoriteGroups]);

	// Funciones para gesti\u00F3n de grupos
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
		if (!window.confirm('\u00BFEst\u00E1s seguro de que deseas eliminar este grupo?')) return;
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
		// Calcular grupos personalizados aqu\u00ED para evitar problemas de hoisting
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

		// Solo hacemos toggle si NO es favorito (para a\u00F1adirlo).
		// Si YA es favorito, no hacemos toggle (lo quitar\u00EDa), solo actualizamos grupos.
		if (!isFav) {
			toggleFavorite(connectionToFavorite);
		}

		// Asignar a grupos seleccionados
		// Usamos un ID consistente (el toggle ya debi\u00F3 a\u00F1adirlo al store si era nuevo)
		const serial = typeof connectionToFavorite === 'string'
			? connectionToFavorite
			: (connectionToFavorite.id || helpers.buildId(connectionToFavorite));

		favoriteGroupsStore.assignFavoriteToGroups(serial, selectedGroupsForFav);

		setShowGroupSelector(false);
		setConnectionToFavorite(null);
		setSelectedGroupsForFav([]);
		loadConnectionHistory();
	};

	// Funci\u00F3n para quitar de favoritos desde el di\u00E1logo
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

	// Toggle selecci\u00F3n de grupo para el favorito
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

	// Abrir di\u00E1logo para editar grupos de un favorito existente
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
					// Si existe en recientes, usar su lastConnected (m\u00E1s actualizado)
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
		// Si hay un icono personalizado y es v\u00E1lido, usarlo
		if (customIcon && customIcon !== 'default' && SSHIconPresets[customIcon.toUpperCase()]) {
			return null; // Retornar null para que se use SSHIconRenderer en su lugar
		}

		const theme = localStorage.getItem('iconThemeSidebar') || 'nord';
		const icons = (iconThemes[theme] || iconThemes['nord']).icons || {};
		switch (type) {
			case 'ssh': return icons.ssh;
			case 'ssh-tunnel': return icons.ssh; // Usar icono SSH por defecto si no hay espec\u00EDfico
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
		const hostLabel = connection.host || connection.hostname || '-';

		return (
			<div
				className={`hero-chip ${isActive ? 'active' : ''}`}
				onClick={() => onConnect?.(connection)}
				style={{ '--card-accent': typeColor }}
				title={`${connection.name} (${hostLabel})`}
				draggable
				onDragStart={(e) => onDragStart(e, connection)}
				onDragOver={(e) => onDragOver(e)}
				onDrop={(e) => onDrop(e, connection)}
				onContextMenu={(e) => {
					e.preventDefault();
					e.stopPropagation();
					if (onEdit) onEdit(connection);
				}}
			>
				<div
					className="hero-chip-icon"
					style={{
						background: `linear-gradient(135deg, ${typeColor}40, transparent)`,
						border: `1px solid ${typeColor}80`
					}}
				>
					{(() => {
						let customIcon = connection.customIcon;
						if ((!customIcon || customIcon === 'default') && sidebarNodes) {
							const matchingNode = findNodeInTree(sidebarNodes, connection);
							if (matchingNode && matchingNode.data?.customIcon) customIcon = matchingNode.data.customIcon;
						}
						if (customIcon && customIcon !== 'default' && SSHIconPresets[customIcon.toUpperCase()]) {
							return <SSHIconRenderer preset={SSHIconPresets[customIcon.toUpperCase()]} pixelSize={24} />;
						}
						const svg = getConnectionTypeIconSVG(connection.type, customIcon);
						if (svg) return React.cloneElement(svg, { width: 24, height: 24, style: { width: 24, height: 24 } });
						return <i className={getConnectionTypeIcon(connection.type)} style={{ color: typeColor, fontSize: '1.2rem' }} />;
					})()}
				</div>
				<div className="hero-chip-content">
					<span className="hero-chip-name">{connection.name}</span>
					<span className="hero-chip-host">{hostLabel}</span>
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
								// Usar el label del nodo como nombre de la conexi\u00F3n si no tiene uno o para asegurar que sea el correcto
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
											detail: connection.name || 'Conexi\u00F3n agregada',
											life: 2000
										});
									}
								} else {
									if (window.toast?.current?.show) {
										window.toast.current.show({
											severity: 'info',
											summary: 'Ya existe',
											detail: 'Esta conexi\u00F3n ya est\u00E1 en favoritos',
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

							<div className="favorites-ribbon-track" ref={trackRef} style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '8px', maxWidth: '100%', scrollbarWidth: 'none', justifyContent: connections?.length > 4 ? 'flex-start' : 'center' }}>
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

	// Calcular contadores por tipo de conexi\u00F3n
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
		const timeStr = formatRelativeTime(connection.lastConnected);
		const fav = isPinned || isFavorite(connection);

		return (
			<div
				className={`hero-recent-card ${isActive ? 'active-row' : ''}`}
				onClick={() => onConnect?.(connection)}
				style={{ '--row-accent': typeColor }}
				onContextMenu={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onEdit?.(connection);
				}}
			>
				<span className="hrc-prompt">$</span>
				<span className="hrc-protocol-tag" style={{ color: typeColor }}>[{protocolLabel}]</span>
				<span className="hrc-name">{connection.name}</span>
				<span className="hrc-host">{hostLabel}</span>
				<span className="hrc-time">{timeStr}</span>
				<div className="hrc-actions" onClick={(e) => e.stopPropagation()}>
					<button
						className={`glass-action-btn ${fav ? 'fav-active' : ''}`}
						onClick={(e) => { e.stopPropagation(); onToggleFav(connection); }}
						title="Favorito"
					>
						<i className={fav ? 'pi pi-star-fill' : 'pi pi-star'} />
					</button>
					<button className="hrc-connect-btn" onClick={() => onConnect?.(connection)}>{'\u2192'} connect</button>
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
		// console.log('\uD83D\uDCC1 ConnectionHistory themeColors:', {
		// 	itemBackground: themeColors.itemBackground,
		// 	cardBackground: themeColors.cardBackground,
		// 	textPrimary: themeColors.textPrimary
		// });
	}, [themeColors]);

	return (
		<div className="connection-history-root" style={{ background: 'transparent' }}>
			<style>{`
				/* -- Custom Hero Splash Styles -- */
				.connection-history-root { background: transparent !important; height: 100%; overflow-y: auto; color: ${themeColors.textPrimary || '#fff'}; }
				.connection-history-section { border: none !important; background: transparent !important; }
				.hero-splash-header {
					text-align: center;
					padding: 3vh 20px 3vh;
					background: transparent;
					position: relative;
					margin-bottom: 0px;
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
				}
				.hero-title { 
					font-size: 42px; 
					font-weight: 800; 
					background: linear-gradient(90deg, ${themeColors.textPrimary || '#ffffff'}, ${themeColors.primaryColor || '#4fc3f7'}); 
					-webkit-background-clip: text; 
					-webkit-text-fill-color: transparent; 
					margin: 0 0 10px 0; 
					letter-spacing: -0.5px;
				}
				.hero-status { color: #81c784; font-size: 0.9rem; margin-bottom: 30px; display: flex; justify-content: center; align-items: center; gap: 8px; font-family: monospace; }
				.hero-search-container { 
					width: 100%; 
					max-width: 580px; 
					margin: 0 auto 16px; 
					position: relative; 
					z-index: 100;
				}
				.hero-search-container::before {
					content: "\u279C  ~";
					position: absolute;
					left: 20px;
					top: 50%;
					transform: translateY(-50%);
					color: #27c93f;
					font-family: 'Fira Code', 'Consolas', monospace;
					font-weight: bold;
					font-size: 1rem;
					z-index: 2;
					pointer-events: none;
				}
				.hero-search-input, .p-inputtext.hero-search-input:enabled:focus {
					width: 100% !important;
					background: ${themeColors.searchBackground || 'rgba(22, 27, 34, 0.6)'} !important;
					border: 1px solid ${themeColors.searchBorder || 'rgba(255,255,255,0.1)'} !important;
					border-radius: 10px !important;
					padding: 12px 70px 12px 55px !important;
					color: ${themeColors.textPrimary || '#fff'} !important;
					font-size: 1rem;
					font-family: 'Fira Code', 'Consolas', monospace !important;
					outline: none !important;
					box-shadow: 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.05) !important;
					backdrop-filter: blur(16px);
					transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
				}
				.hero-search-input:focus, .p-inputtext.hero-search-input:enabled:focus {
					border-color: #27c93f !important;
					box-shadow: 0 0 20px rgba(39, 201, 63, 0.15),
					            inset 0 1px 1px rgba(255,255,255,0.1),
					            0 0 0 1px #27c93f !important;
					background: ${themeColors.searchBackground ? themeColors.searchBackground.replace('0.85', '0.90').replace('0.6', '0.90') : 'rgba(22, 27, 34, 0.90)'} !important;
					transform: translateY(-2px);
				}
				/* Hide old search icon since we use terminal prompt */
				.hero-search-icon { display: none; }
				.hero-search-spinner { position: absolute; right: 70px; top: 50%; transform: translateY(-50%); color: #27c93f; font-size: 1.2rem; z-index: 2; }
				
				.hero-terminal-btn {
					position: absolute;
					right: 8px;
					top: 50%;
					transform: translateY(-50%);
					height: 32px;
					padding: 0 12px;
					border-radius: 8px;
					background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.01) 100%);
					border: 1px solid rgba(255,255,255,0.05);
					border-top: 1px solid rgba(255,255,255,0.1);
					color: ${themeColors.textPrimary || '#fff'};
					font-family: monospace;
					font-weight: bold;
					font-size: 1rem;
					display: flex;
					align-items: center;
					justify-content: center;
					cursor: pointer;
					z-index: 3;
					transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
					box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.15);
				}
				.hero-terminal-btn:hover {
					background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 100%);
					border-color: rgba(255,255,255,0.15);
					box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 3px 8px rgba(0,0,0,0.25);
					transform: translateY(-50%) scale(1.02);
				}
				.hero-terminal-btn:active {
					transform: translateY(-50%) scale(0.98);
					box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
				}

				.hero-action-buttons {
					display: flex;
					justify-content: center;
					gap: 16px;
					margin-bottom: 24px;
				}
				.hero-action-btn {
					background: transparent;
					border: 1px solid transparent;
					border-radius: 8px;
					padding: 8px 16px;
					color: ${themeColors.textSecondary || 'rgba(255,255,255,0.5)'};
					font-size: 0.95rem;
					font-weight: 500;
					display: flex;
					align-items: center;
					gap: 10px;
					cursor: pointer;
					transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
					backdrop-filter: blur(8px);
				}
				.hero-action-btn:hover {
					background: ${themeColors.hoverBackground || 'rgba(255,255,255,0.05)'};
					color: ${themeColors.textPrimary || '#fff'};
					border-color: rgba(255,255,255,0.05);
					transform: translateY(-1px);
				}
				.hero-action-btn.active {
					background: ${themeColors.itemBackground || 'rgba(255,255,255,0.08)'};
					color: ${themeColors.textPrimary || '#ffffff'};
					border-color: ${themeColors.borderColor || 'rgba(255,255,255,0.1)'};
					box-shadow: 0 4px 12px rgba(0,0,0,0.2);
				}
				
				.hero-shortcuts { color: ${themeColors.textSecondary || 'rgba(255,255,255,0.3)'}; font-size: 0.75rem; display: flex; justify-content: center; gap: 20px; font-weight: 500;}
				.hero-shortcuts kbd { background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.08); margin-right: 6px; font-family: monospace; color: rgba(255,255,255,0.7); }

				/* --- Terminal Frame for Recents --- */
				.recents-terminal-frame {
					margin: 0 1rem 1rem 1rem;
					border-radius: 12px;
					overflow: hidden;
					display: flex;
					flex-direction: column;
					border: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '55' : 'rgba(255,255,255,0.12)'};
					background: ${terminalTheme.background || '#0d1117'};
					box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04);
					flex: 1;
					min-height: 120px;
				}
				.recents-terminal-header {
					height: 36px;
					flex-shrink: 0;
					background: ${terminalTheme.background ? terminalTheme.background + 'ee' : 'rgba(20,22,28,0.95)'};
					border-bottom: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '44' : 'rgba(255,255,255,0.08)'};
					border-radius: 12px 12px 0 0;
					display: flex;
					align-items: center;
					padding: 0 12px;
					position: relative;
					gap: 0;
				}
				.recents-terminal-header .traffic-lights {
					display: flex;
					gap: 6px;
					align-items: center;
					flex-shrink: 0;
				}
				.recents-terminal-header .traffic-dot {
					width: 12px;
					height: 12px;
					border-radius: 50%;
					flex-shrink: 0;
				}
				.recents-terminal-header .traffic-dot.red { background: #ff5f56; border: 1px solid #e0443e; cursor: pointer; transition: filter 0.15s; }
				.recents-terminal-header .traffic-dot.red:hover { filter: brightness(1.25); }
				.recents-terminal-header .traffic-dot.yellow { background: #ffbd2e; border: 1px solid #dea123; }
				.recents-terminal-header .traffic-dot.green { background: #27c93f; border: 1px solid #1aab29; }
				.recents-terminal-header .header-path {
					flex: 1;
					text-align: center;
					color: ${terminalTheme.brightBlack || '#6e7681'};
					font-size: 11.5px;
					user-select: none;
					pointer-events: none;
					font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
					font-weight: 400;
					letter-spacing: 0.3px;
				}
				.recents-terminal-header .header-path .path-tilde { color: ${terminalTheme.green || '#3fb950'}; }
				.recents-header-right { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
				.recents-header-filter-btn {
					background: transparent;
					border: none;
					color: ${terminalTheme.brightBlack || '#6e7681'};
					cursor: pointer;
					padding: 4px 6px;
					border-radius: 4px;
					font-size: 0.85rem;
					transition: color 0.15s, background 0.15s;
					display: flex; align-items: center;
				}
				.recents-header-filter-btn:hover, .recents-header-filter-btn.active { color: ${terminalTheme.green || '#3fb950'}; background: rgba(255,255,255,0.06); }
				.recents-filter-chips-bar {
					display: flex;
					align-items: center;
					gap: 6px;
					padding: 4px 12px;
					border-bottom: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '33' : 'rgba(255,255,255,0.05)'};
					background: transparent;
					flex-wrap: wrap;
				}
				.recents-terminal-body {
					flex: 1;
					overflow-y: auto;
					padding: 4px 0;
					scrollbar-width: thin;
					scrollbar-color: ${terminalTheme.brightBlack || '#444'} transparent;
				}
				/* --- Grep-style connection rows --- */
				.connection-list-body {
					display: flex !important;
					flex-direction: column !important;
					gap: 0 !important;
					padding: 0 !important;
					width: 100% !important;
					max-width: 100% !important;
					margin: 0 !important;
					overflow: visible !important;
				}
				.hero-recent-card {
					display: grid !important;
					grid-template-columns: 24px 90px 320px 1fr 100px minmax(0,auto) !important;
					align-items: center !important;
					background: transparent !important;
					border: none !important;
					border-left: 2px solid transparent !important;
					border-radius: 0 !important;
					padding: 0 32px 0 24px !important;
					cursor: pointer !important;
					transition: background 0.1s, border-color 0.1s !important;
					box-shadow: none !important;
					min-width: 0 !important;
					width: 100% !important;
					height: 40px !important;
					font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace !important;
					font-size: 0.88rem !important;
					backdrop-filter: none !important;
				}
				.hero-recent-card:hover {
					background: ${terminalTheme.selectionBackground || 'rgba(255,255,255,0.08)'} !important;
					border-left-color: var(--row-accent) !important;
				}
				.hero-recent-card.active-row {
					border-left-color: var(--row-accent) !important;
					background: ${terminalTheme.selectionBackground || 'rgba(255,255,255,0.06)'} !important;
				}
				.hrc-prompt { color: ${terminalTheme.green || '#3fb950'}; font-weight: bold; font-size: 0.9rem; }
				.hrc-protocol-tag { font-weight: 700; font-size: 0.75rem; letter-spacing: 0.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
				.hrc-name { color: ${terminalTheme.foreground || '#ffffff'}; font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: 0.2px; }
				.hrc-host { color: ${terminalTheme.foreground || '#c9d1d9'}; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: inherit; opacity: 0.75; }
				.hrc-time { color: ${terminalTheme.foreground || '#c9d1d9'}; font-size: 0.75rem; text-align: right; white-space: nowrap; opacity: 0.5; }
				.hrc-actions { display: flex; gap: 6px; opacity: 0; transition: opacity 0.15s; align-items: center; justify-content: flex-end; }
				.hero-recent-card:hover .hrc-actions { opacity: 1; }
				.hrc-connect-btn {
					background: transparent;
					padding: 2px 8px;
					font-size: 0.72rem;
					color: ${terminalTheme.green || '#3fb950'};
					border: 1px solid ${terminalTheme.green ? terminalTheme.green + '55' : 'rgba(63,185,80,0.4)'};
					border-radius: 3px;
					cursor: pointer;
					transition: all 0.15s;
					font-family: inherit;
					font-weight: 500;
					letter-spacing: 0.3px;
				}
				.hrc-connect-btn:hover { background: ${terminalTheme.green ? terminalTheme.green + '22' : 'rgba(63,185,80,0.15)'}; color: ${terminalTheme.green || '#3fb950'}; }
				.glass-action-btn { background: transparent; border: none; cursor: pointer; color: ${terminalTheme.brightBlack || '#6e7681'}; font-size: 0.8rem; padding: 2px 4px; transition: color 0.15s; }
				.glass-action-btn:hover { color: #FFD700; }
				.glass-action-btn.fav-active i { color: #FFD700; filter: drop-shadow(0 0 3px rgba(255,215,0,0.5)); }
				/* Empty state inside terminal frame */
				.recents-terminal-body .ribbon-empty { flex-direction: column; gap: 8px; color: ${terminalTheme.brightBlack || '#6e7681'}; background: transparent; border: none; font-family: 'Fira Code', monospace; font-size: 0.82rem; min-height: 60px; }

				/* Search Dropdown Styles */
				.hero-search-dropdown {
					position: fixed;
					background: ${themeColors.cardBackground ? themeColors.cardBackground.replace('0.6', '0.90') : 'rgba(16, 20, 28, 0.90)'};
					border: 1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.1)'};
					border-radius: 16px;
					box-shadow: 0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset;
					backdrop-filter: blur(24px);
					overflow-y: auto;
					z-index: 10000;
					margin-top: 12px;
					padding: 12px;
					display: flex;
					flex-direction: column;
					gap: 6px;
				}
				.search-result-item {
					display: flex;
					align-items: center;
					gap: 16px;
					padding: 12px 16px;
					border-radius: 10px;
					cursor: pointer;
					transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
					border: 1px solid transparent;
				}
				.search-result-item:hover, .search-result-item.active {
					background: ${themeColors.hoverBackground || 'rgba(255,255,255,0.06)'};
					border-color: ${themeColors.borderColor || 'rgba(255,255,255,0.08)'};
					transform: scale(1.01);
				}
				.search-result-icon {
					width: 40px;
					height: 40px;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 1.4rem;
					border-radius: 10px;
				}
				.search-result-info { flex: 1; display: flex; flex-direction: column; overflow: hidden; gap: 4px; }
				.search-result-flex-header { display: flex; align-items: center; gap: 10px; }
				.search-result-label { font-weight: 500; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${themeColors.textPrimary || '#fff'}; }
				.search-result-sub-container { display: flex; align-items: center; gap: 10px; }
				.search-result-sub { font-size: 0.8rem; opacity: 0.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: monospace; }
				.search-result-folder { font-size: 0.75rem; opacity: 0.4; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
				.search-result-type { font-size: 0.7rem; font-weight: bold; padding: 2px 8px; border-radius: 6px; opacity: 0.8; flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.5px;}
				
				/* Hero Chips */
				.hero-chip { display: flex; align-items: center; background: ${themeColors.itemBackground || 'rgba(22, 27, 34, 0.4)'}; border: 1px solid transparent; border-radius: 16px; padding: 8px 24px 8px 8px; width: 220px; height: 70px; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); backdrop-filter: blur(10px); flex-shrink: 0; text-align: left; }
				.hero-chip:hover { background: ${themeColors.hoverBackground || 'rgba(30, 36, 45, 0.6)'}; transform: translateY(-4px); border-color: ${themeColors.borderColor || 'rgba(255,255,255,0.05)'}; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
				.hero-chip.active { border-color: var(--card-accent); background: linear-gradient(135deg, ${themeColors.itemBackground || 'rgba(22, 27, 34, 0.4)'}, ${themeColors.hoverBackground || 'rgba(30,36,45,0.6)'}); box-shadow: 0 0 0 1px var(--card-accent) inset;}
				.hero-chip-icon { width: 54px; height: 54px; min-width: 54px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px; }
				.hero-chip-content { display: flex; flex-direction: column; overflow: hidden; justify-content: center;}
				.hero-chip-name { color: ${themeColors.textPrimary || '#fff'}; font-weight: 500; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;}
				.hero-chip-host { color: ${themeColors.textSecondary || 'rgba(255,255,255,0.5)'}; font-size: 0.8rem; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.7;}
				
				/* Command Palette List Styles (override grid/cards) */
				.ribbon-side-btn, .ribbon-pagination { display: none !important; }
				.ribbon-container-relative { display: block !important; padding: 0 !important; }

				/* Keep favorites-ribbon-track in original style (horizontal scroll) */
				.favorites-ribbon-track {
					display: flex !important;
					flex-direction: row !important;
					gap: 16px !important;
					padding: 8px !important;
					width: auto !important;
					max-width: 100% !important;
					margin: 0 !important;
					overflow-x: auto !important;
					scrollbar-width: none !important;
					overflow-y: visible !important;
				}

				/* Hero Chips */
				.hero-chip { display: flex; align-items: center; background: ${themeColors.itemBackground || 'rgba(22, 27, 34, 0.4)'}; border: 1px solid transparent; border-radius: 16px; padding: 8px 24px 8px 8px; width: 220px; height: 70px; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); backdrop-filter: blur(10px); flex-shrink: 0; text-align: left; }
				.hero-chip:hover { background: ${themeColors.hoverBackground || 'rgba(30, 36, 45, 0.6)'}; transform: translateY(-4px); border-color: ${themeColors.borderColor || 'rgba(255,255,255,0.05)'}; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
				.hero-chip.active { border-color: var(--card-accent); background: linear-gradient(135deg, ${themeColors.itemBackground || 'rgba(22, 27, 34, 0.4)'}, ${themeColors.hoverBackground || 'rgba(30,36,45,0.6)'}); box-shadow: 0 0 0 1px var(--card-accent) inset;}
				.hero-chip-icon { width: 54px; height: 54px; min-width: 54px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px; }
				.hero-chip-content { display: flex; flex-direction: column; overflow: hidden; justify-content: center;}
				.hero-chip-name { color: ${themeColors.textPrimary || '#fff'}; font-weight: 500; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;}
				.hero-chip-host { color: ${themeColors.textSecondary || 'rgba(255,255,255,0.5)'}; font-size: 0.8rem; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.7;}
			`}</style>

			<div className="hero-splash-header">
				<h1 className="hero-title">NodeTerm</h1>
				<div className="hero-status">
					<i className="pi pi-circle-fill" style={{ fontSize: '0.6rem' }} />
					<span>{activeIds.size} active sessions</span>
				</div>
				<div className="hero-search-container">
					<InputText
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						onKeyDown={handleSearchKeyDown}
						className="hero-search-input"
						placeholder="Search or connect to a host..."
						onBlur={() => {
							// Pequeno delay para permitir clicks en el dropdown
							setTimeout(() => setShowDropdown(false), 200);
						}}
						onFocus={() => {
							if (filteredSearchResults.length > 0) setShowDropdown(true);
						}}
						autoComplete="off"
					/>
					{isSearching && (
						<i className="pi pi-spin pi-spinner hero-search-spinner" />
					)}

					<button
						className={`hero-terminal-btn ${terminalView ? 'active' : ''}`}
						title="Abrir nueva terminal local"
						onClick={(e) => {
							e.stopPropagation();
							if (onTerminalToggle) {
								const terminalType = localStorage.getItem('nodeterm_default_local_terminal') || 'powershell';
								onTerminalToggle(!terminalView, terminalType);
							}
						}}
					>
						$_
					</button>

					{showDropdown && ReactDOM.createPortal(
						<div
							className="hero-search-dropdown"
							style={{
								width: 'min(600px, 90vw)',
								left: '50%',
								top: document.querySelector('.hero-search-input')?.getBoundingClientRect().bottom || 0,
								transform: 'translateX(-50%)'
							}}
						>
							{filteredSearchResults.map((node, idx) => {
								const isPassword = node.data?.type === 'password';
								const color = isPassword ? '#E91E63' : getConnectionTypeColor(node.data?.type);
								const label = node.label;
								const sub = isPassword ? (node.data.url || node.data.username) : (node.data.host || node.data.hostname || node.data.server);

								// Obtener ruta de carpetas
								const folderPath = getNodeFolderPath(sidebarNodes, node);
								const folderPathString = folderPath && folderPath.length > 0 ? folderPath.join(' / ') : 'Ra\u00EDz';

								return (
									<div
										key={node.key}
										className={`search-result-item ${activeIndex === idx ? 'active' : ''}`}
										onClick={() => handleSelectSearchResult(node)}
										onMouseEnter={() => setActiveIndex(idx)}
									>
										<div className="search-result-icon" style={{ background: `${color}15`, color }}>
											<i className={isPassword ? 'pi pi-key' : getConnectionTypeIcon(node.data?.type)} />
										</div>
										<div className="search-result-info">
											<div className="search-result-flex-header">
												<span className="search-result-label">{label}</span>
												<span className="search-result-type" style={{ background: `${color}20`, color, borderColor: `${color}40`, border: '1px solid' }}>
													{isPassword ? 'PWD' : getProtocolLabel(node.data?.type)}
												</span>
											</div>
											<div className="search-result-sub-container">
												<span className="search-result-sub">{sub}</span>
												{!isPassword && <span className="search-result-folder">{'\uD83D\uDCC1'}  {folderPathString}</span>}
											</div>
										</div>
									</div>
								);
							})}
						</div>,
						document.body
					)}
				</div>

				<div className="hero-action-buttons">
					<button
						className={`hero-action-btn ${terminalView ? 'active' : ''}`}
						title="Abrir nueva terminal local"
						onClick={(e) => {
							e.stopPropagation();
							if (onTerminalToggle) {
								const terminalType = localStorage.getItem('nodeterm_default_local_terminal') || 'powershell';
								onTerminalToggle(!terminalView, terminalType);
							}
						}}
					>
						<i className="pi pi-desktop" /> Nueva terminal
					</button>
					<button
						className={`hero-action-btn ${activeBottomView === 'recent' && !terminalView ? 'active' : ''}`}
						onClick={() => {
							if (terminalView && onTerminalToggle) onTerminalToggle(false);
							setActiveBottomView('recent');
						}}
					>
						<i className="pi pi-clock" /> Recent
					</button>
					<button
						className={`hero-action-btn ${activeBottomView === 'favorites' && !terminalView ? 'active' : ''}`}
						onClick={() => {
							if (terminalView && onTerminalToggle) onTerminalToggle(false);
							setActiveBottomView('favorites');
						}}
					>
						<i className="pi pi-star" /> Favorites
					</button>
				</div>

				<div className="hero-shortcuts">
					<span><kbd>{'\u2318'}K</kbd> Quick connect</span>
					<span><kbd>{'\u2318'}T</kbd> New terminal</span>
					<span><kbd>{'\u2318'}R</kbd> Recent</span>
					<span><kbd>{'\u2318'}F</kbd> Favorites</span>
				</div>
			</div > {/* FilterPanel Dropdown - Rendered in Portal to avoid clipping */}
			{
				ReactDOM.createPortal(
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
				)
			}

			{/* Filter Configuration Dialog */}
			{
				showFilterConfig && ReactDOM.createPortal(
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
												title={filter.id === 'all' ? 'Este filtro siempre est\u00E1 visible' : (filter.visible ? 'Ocultar' : 'Mostrar')}
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
				)
			}
			{
				showCreateGroupDialog && ReactDOM.createPortal(
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
										placeholder={"Ej: Producci\u00F3n, Desarrollo..."}
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
				)
			}

			{/* Edit/Delete Group Menu */}
			{
				editingGroup && ReactDOM.createPortal(
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
				)
			}

			{/* Group Selector Dialog - shown when adding a favorite */}
			{/* Group Selector Dialog - shown when adding a favorite */}
			{
				showGroupSelector && connectionToFavorite && ReactDOM.createPortal(
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
				)
			}

			{/* Edit Favorite Groups Dialog */}
			{
				showEditFavGroups && editingFavorite && ReactDOM.createPortal(
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
				)
			}

			{/* FAVORITES RIBBON (Visible in 'all' view) */}
			{
				!terminalView && activeBottomView === 'all' && (
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
				)
			}

			{/* FAVORITES TABLE - Terminal-style frame for favorites */}
			{
				!terminalView && activeBottomView === 'favorites' && (
					<div className="recents-terminal-frame favorites-terminal-frame">
						{/* macOS-style header */}
						<div className="recents-terminal-header">
							<div className="traffic-lights">
								<div
									className="traffic-dot red"
									onClick={() => setActiveBottomView('all')}
									title="Cerrar favoritos"
								/>
								<div className="traffic-dot yellow" />
								<div className="traffic-dot green" />
							</div>
							<div className="header-path">
								<span className="path-tilde">~</span>/favorites &nbsp;{'\u00B7'}&nbsp; {filteredFavorites.length} connections
							</div>
							<div className="recents-header-right">
								<button
									className={`recents-header-filter-btn ${getActiveFilterCount(activeFavFilters) > 0 ? 'active' : ''}`}
									onClick={() => { setFilterContext('favorites'); setFilterPanelOpen(true); }}
									title="Filtrar favoritos"
								>
									<i className={`pi ${getActiveFilterCount(activeFavFilters) > 0 ? 'pi-filter-fill' : 'pi-filter'}`} />
									{getActiveFilterCount(activeFavFilters) > 0 && (
										<span style={{ fontSize: '0.7rem', marginLeft: 3 }}>{getActiveFilterCount(activeFavFilters)}</span>
									)}
								</button>
							</div>
						</div>

						{/* Active filter chips strip for favorites */}
						{getActiveFilterCount(activeFavFilters) > 0 && (
							<div className="recents-filter-chips-bar">
								{activeFavFilters.protocols?.map(filterId => (
									<FilterBadge
										key={`fav-protocol-${filterId}`}
										label={getFilterLabel('protocols', filterId)}
										color={getFilterColor('protocols', filterId)}
										icon={getFilterIcon('protocols', filterId)}
										type="protocol"
										onRemove={() => handleRemoveFilter('favorites', 'protocols', filterId)}
										compact
									/>
								))}
								{activeFavFilters.groups?.map(filterId => (
									<FilterBadge
										key={`fav-group-${filterId}`}
										label={getFilterLabel('groups', filterId)}
										color={getFilterColor('groups', filterId)}
										icon={getFilterIcon('groups', filterId)}
										type="group"
										onRemove={() => handleRemoveFilter('favorites', 'groups', filterId)}
										compact
									/>
								))}
								{activeFavFilters.states?.map(filterId => (
									<FilterBadge
										key={`fav-state-${filterId}`}
										label={getFilterLabel('states', filterId)}
										color={getFilterColor('states', filterId)}
										icon={getFilterIcon('states', filterId)}
										type="state"
										onRemove={() => handleRemoveFilter('favorites', 'states', filterId)}
										compact
									/>
								))}
							</div>
						)}

						{/* Grep-style connection list for favorites */}
						<div className="recents-terminal-body">
							<ConnectionTable
								connections={filteredFavorites}
								title="Favoritos"
								emptyMessage="# no favorite sessions found"
							/>
						</div>
					</div>
				)
			}

			{/* RECIENTES TABLE - Terminal-style frame with grep rows */}
			{
				!terminalView && (activeBottomView === 'all' || activeBottomView === 'recent') && (
					<div className="recents-terminal-frame">
						{/* macOS-style header with filter on the right */}
						<div className="recents-terminal-header">
							<div className="traffic-lights">
								<div
									className="traffic-dot red"
									onClick={() => setActiveBottomView('all')}
									title="Cerrar recientes"
								/>
								<div className="traffic-dot yellow" />
								<div className="traffic-dot green" />
							</div>
							<div className="header-path">
								<span className="path-tilde">~</span>/recent &nbsp;{'\u00B7'}&nbsp; {filteredRecentsForDisplay.length} connections
							</div>
							<div className="recents-header-right">
								<button
									className={`recents-header-filter-btn ${getActiveFilterCount(activeRecentFilters) > 0 ? 'active' : ''}`}
									onClick={() => { setFilterContext('recents'); setFilterPanelOpen(true); }}
									title="Filtrar recientes"
								>
									<i className={`pi ${getActiveFilterCount(activeRecentFilters) > 0 ? 'pi-filter-fill' : 'pi-filter'}`} />
									{getActiveFilterCount(activeRecentFilters) > 0 && (
										<span style={{ fontSize: '0.7rem', marginLeft: 3 }}>{getActiveFilterCount(activeRecentFilters)}</span>
									)}
								</button>
							</div>
						</div>

						{/* Active filter chips strip */}
						{getActiveFilterCount(activeRecentFilters) > 0 && (
							<div className="recents-filter-chips-bar">
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

						{/* Grep-style connection list */}
						<div className="recents-terminal-body">
							<ConnectionTable
								connections={filteredRecentsForDisplay}
								title="Nombre"
								emptyMessage="# no recent sessions"
							/>
						</div>
					</div>
				)
			}
		</div >
	);
};

export default ConnectionHistory;

