import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { getFavorites, toggleFavorite, onUpdate, isFavorite, reorderFavorites, helpers } from '../utils/connectionStore';
import { iconThemes } from '../themes/icon-themes';
import { SSHIconRenderer, SSHIconPresets } from './SSHIconSelector';
import favoriteGroupsStore from '../utils/favoriteGroupsStore';
import FilterPanel from './FilterPanel';
import FilterBadge from './FilterBadge';
import { InputText } from 'primereact/inputtext';
import { OverlayPanel } from 'primereact/overlaypanel';
import { themes } from '../themes';
import { themeManager } from '../utils/themeManager';
import { Slider } from 'primereact/slider';
import { uiThemes, CLASSIC_UI_KEYS, FUTURISTIC_UI_KEYS, MODERN_UI_KEYS, ANIMATED_UI_KEYS, NATURE_UI_KEYS } from '../themes/ui-themes';

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
	localLinuxTerminalTheme,
	setLocalLinuxTerminalTheme,
	terminalTheme = {},
	terminalTitle = '/local',
	onOpenSettings = null,
	terminalFrameStyle = 'macos',
	setTerminalFrameStyle = () => { },
	terminalOpacity = 1.0,
	onTerminalOpacityChange = () => { },
	onToggleTerminalVisibility,
	children
}) => {
	// Helper para ajustar la opacidad de los colores (Hex o RGBA)
	const adjustOpacity = (color, opacity) => {
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

	const localTerminalBg = useMemo(() => {
		const baseColor = themes[localLinuxTerminalTheme]?.theme?.background || '#0c0c0c';
		if (terminalOpacity >= 0.99) return baseColor;
		return adjustOpacity(baseColor, terminalOpacity);
	}, [localLinuxTerminalTheme, terminalOpacity]);

	const [favoriteConnections, setFavoriteConnections] = useState([]);
	const [passwordNodes, setPasswordNodes] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [filteredSearchResults, setFilteredSearchResults] = useState([]);
	const [isSearching, setIsSearching] = useState(false);
	const [showDropdown, setShowDropdown] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const [activeBottomView, setActiveBottomView] = useState('all');
	const themePickerRef = useRef(null);
	const uiThemePickerRef = useRef(null);
	const frameStylePickerRef = useRef(null);
	const terminalOpacityOverlayRef = useRef(null);
	const [currentUITheme, setCurrentUITheme] = useState(() => localStorage.getItem('ui_theme') || 'Light');

	const handleThemeSelect = (themeName) => {
		if (setLocalLinuxTerminalTheme) {
			setLocalLinuxTerminalTheme(themeName);
			localStorage.setItem('localLinuxTerminalTheme', themeName);
		}

		// Dispatch local event for components listening to storage changes
		window.dispatchEvent(new Event('storage'));
		window.dispatchEvent(new CustomEvent('terminal-theme-changed', { detail: { theme: themeName } }));

		themePickerRef.current?.hide();
	};

	const handleUIThemeSelect = (themeName) => {
		setCurrentUITheme(themeName);
		themeManager.applyTheme(themeName);
		uiThemePickerRef.current?.hide();
	};

	const UI_CATEGORIES = [
		{ id: 'classic', name: 'Clásicos', keys: CLASSIC_UI_KEYS },
		{ id: 'futuristic', name: 'Futuristas', keys: FUTURISTIC_UI_KEYS },
		{ id: 'modern', name: 'Modernos', keys: MODERN_UI_KEYS },
		{ id: 'animated', name: 'Animados', keys: ANIMATED_UI_KEYS },
		{ id: 'nature', name: 'Naturaleza', keys: NATURE_UI_KEYS }
	];

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

	// Componente interno para las filas de conexión
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
		<div className={`connection-history-root${terminalView ? ' is-terminal-view' : ''}`} style={{ background: 'transparent' }}>
			<style>{`
				/* -- Custom Hero Splash Styles -- */
				.connection-history-root { background: transparent !important; height: 100%; display: flex; flex-direction: column; color: ${themeColors.textPrimary || '#fff'}; }
				.connection-history-root:not(.is-terminal-view) { overflow-y: auto; }
				.connection-history-root.is-terminal-view { overflow: hidden; }
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
					font-size: 24px; 
					font-weight: 800; 
					background: linear-gradient(90deg, ${themeColors.textPrimary || '#ffffff'}, ${themeColors.primaryColor || '#4fc3f7'}); 
					-webkit-background-clip: text; 
					-webkit-text-fill-color: transparent; 
					margin: 0; 
					letter-spacing: -0.5px;
				}
				.hero-status { color: #81c784; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; font-family: 'Fira Code', monospace; }
				.hero-search-container { 
					width: 100%; 
					max-width: 500px;
					margin: 0 auto;
					position: relative; 
					z-index: 100;
				}
				.hero-search-container::before {
					content: "\u279C  ~";
					position: absolute;
					left: 20px;
					top: 50%;
					transform: translateY(-50%);
					color: ${terminalTheme.green || '#27c93f'};
					font-family: 'Fira Code', 'Consolas', monospace;
					font-weight: bold;
					font-size: 0.85rem;
					z-index: 2;
					pointer-events: none;
					opacity: 0.8;
				}
				.hero-search-input, .p-inputtext.hero-search-input:enabled:focus {
					width: 100% !important;
					background: ${terminalTheme.selectionBackground || 'rgba(255,255,255,0.05)'} !important;
					border: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '55' : 'rgba(255,255,255,0.1)'} !important;
					border-radius: 10px !important;
					padding: 10px 70px 10px 65px !important;
					color: ${terminalTheme.foreground || '#fff'} !important;
					font-size: 0.9rem;
					font-family: 'Fira Code', 'Consolas', monospace !important;
					outline: none !important;
					box-shadow: 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.05) !important;
					backdrop-filter: blur(16px);
					transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
				}
				.hero-search-input::placeholder {
					color: ${terminalTheme.foreground || '#fff'};
					opacity: 0.45;
				}
				.hero-search-input:focus, .p-inputtext.hero-search-input:enabled:focus {
					border-color: ${terminalTheme.green || '#27c93f'} !important;
					box-shadow: 0 0 20px ${terminalTheme.green ? terminalTheme.green + '44' : 'rgba(39, 201, 63, 0.2)'},
					            inset 0 1px 1px rgba(255,255,255,0.05) !important;
					background: ${terminalTheme.background || 'rgba(15, 18, 24, 0.95)'} !important;
					transform: translateY(-1px);
				}
				/* Hide old search icon since we use terminal prompt */
				.hero-search-icon { display: none; }
				.hero-search-spinner { position: absolute; right: 70px; top: 50%; transform: translateY(-50%); color: ${terminalTheme.green || '#27c93f'}; font-size: 1.2rem; z-index: 2; }
				
				.hero-terminal-btn {
					position: absolute;
					right: 8px;
					top: 50%;
					transform: translateY(-50%);
					height: 32px;
					padding: 0 12px;
					border-radius: 8px;
					background: #000000;
					border: 1px solid rgba(255,255,255,0.2);
					color: #ffffff;
					font-family: monospace;
					font-weight: bold;
					font-size: 1rem;
					display: flex;
					align-items: center;
					justify-content: center;
					cursor: pointer;
					z-index: 3;
					transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
					box-shadow: 0 2px 4px rgba(0,0,0,0.3);
				}
				.hero-terminal-btn:hover {
					background: #1a1a1a;
					border-color: rgba(255,255,255,0.4);
					box-shadow: 0 4px 8px rgba(0,0,0,0.4);
					transform: translateY(-50%) scale(1.02);
				}
				.hero-terminal-btn:active {
					background: #000000;
					transform: translateY(-50%) scale(0.98);
					box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
				}

				.hero-action-buttons {
					display: flex;
					justify-content: center;
					gap: 4px;
					margin-top: 20px;
					background: rgba(0, 0, 0, 0.2);
					padding: 4px;
					border-radius: 12px;
					border: 1px solid rgba(255, 255, 255, 0.03);
					backdrop-filter: blur(10px);
				}
				.hero-action-btn {
					background: transparent;
					border: 1px solid transparent;
					border-radius: 10px;
					padding: 8px 18px;
					color: rgba(255,255,255,0.6);
					font-size: 0.85rem;
					font-weight: 500;
					font-family: 'Inter', system-ui, -apple-system, sans-serif;
					display: flex;
					align-items: center;
					gap: 8px;
					cursor: pointer;
					transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
				}
				.hero-action-btn:hover {
					color: #fff;
					background: rgba(255, 255, 255, 0.05);
				}
				.hero-action-btn.active {
					background: ${terminalTheme.selectionBackground || 'rgba(255,255,255,0.1)'};
					color: #fff;
					border-color: rgba(255, 255, 255, 0.05);
					box-shadow: 0 4px 12px rgba(0,0,0,0.2);
				}
				.hero-action-btn i {
					font-size: 0.9rem;
					opacity: 0.6;
				}
				.hero-action-btn.active i {
					opacity: 1;
					color: ${terminalTheme.green || '#3fb950'};
				}
				.hero-action-btn.terminal-primary {
					background: ${terminalTheme.green ? terminalTheme.green + '22' : 'rgba(39, 201, 63, 0.1)'};
					color: ${terminalTheme.green || '#3fb950'};
					border: 1px solid ${terminalTheme.green ? terminalTheme.green + '44' : 'rgba(39, 201, 63, 0.2)'};
				}
				.hero-action-btn.terminal-primary:hover {
					background: ${terminalTheme.green ? terminalTheme.green + '33' : 'rgba(39, 201, 63, 0.15)'};
					transform: translateY(-1px);
				}
				
				.hero-shortcuts { color: ${themeColors.textSecondary || 'rgba(255,255,255,0.3)'}; font-size: 0.75rem; display: flex; justify-content: center; gap: 20px; font-weight: 500;}
				.hero-shortcuts kbd { background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.08); margin-right: 6px; font-family: monospace; color: rgba(255,255,255,0.7); }

				/* --- Top Terminal Frame (Search + Actions) --- */
				.top-terminal-frame {
					margin: 0 auto 24px auto;
					border-radius: 12px;
					overflow: hidden;
					display: flex;
					flex-direction: column;
					border: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '55' : 'rgba(255,255,255,0.12)'};
					background: ${terminalTheme.background || '#0d1117'};
					box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04);
					max-width: 650px;
					width: 100%;
				}
				.top-terminal-header {
					height: 36px;
					box-sizing: border-box;
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
				.top-terminal-header .traffic-lights {
					display: flex;
					gap: 6px;
					align-items: center;
					flex-shrink: 0;
				}
				.top-terminal-header .traffic-dot {
					width: 12px;
					height: 12px;
					border-radius: 50%;
					flex-shrink: 0;
				}
				.top-terminal-header .traffic-dot.red { background: #ff5f56; border: 1px solid #e0443e; cursor: pointer; transition: filter 0.15s; }
				.top-terminal-header .traffic-dot.red:hover { filter: brightness(1.25); }
				.top-terminal-header .traffic-dot.yellow { background: #ffbd2e; border: 1px solid #dea123; }
				.top-terminal-header .traffic-dot.green { background: #27c93f; border: 1px solid #1aab29; }
				.top-terminal-header .header-path {
					position: absolute;
					left: 50%;
					top: 50%;
					transform: translate(-50%, -50%);
					color: ${terminalTheme.foreground || '#c9d1d9'};
					font-size: 11.5px;
					user-select: none;
					pointer-events: none;
					font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
					font-weight: 500;
					letter-spacing: 0.3px;
					display: flex;
					align-items: center;
					gap: 6px;
					white-space: nowrap;
				}
				.top-terminal-header .header-brand {
					font-weight: 800;
					letter-spacing: 0.5px;
					color: ${themeColors.textPrimary || '#fff'};
					opacity: 1;
				}
				.top-terminal-header .header-sessions {
					font-size: 10px;
					opacity: 0.7;
					display: flex;
					align-items: center;
					gap: 4px;
					background: rgba(129, 199, 132, 0.1);
					padding: 2px 8px;
					border-radius: 10px;
					color: #81c784;
					border: 1px solid rgba(129, 199, 132, 0.2);
				}
				.top-terminal-header .header-path .path-tilde { color: ${terminalTheme.green || '#3fb950'}; opacity: 0.8; }
				
				.top-terminal-body {
					padding: 18px 20px 22px;
					display: flex;
					flex-direction: column;
					align-items: center;
					background: transparent;
				}

				/* --- Terminal Frame for Recents --- */
				.recents-terminal-frame {
					margin: 0 1rem 1rem 1rem;
					border-radius: 12px;
					overflow: hidden;
					display: flex;
					flex-direction: column;
					border: 1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '55' : 'rgba(255,255,255,0.12)'};
					box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04);
					flex: 1;
					min-height: 120px;
					box-sizing: border-box;
				}
				.recents-terminal-header {
					height: 36px;
					box-sizing: border-box;
					flex-shrink: 0;
					background: ${(() => {
					const bg = terminalTheme.background || '#0d1117';
					const adjustOpacity = (color, opacity) => {
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
					// Un poco más de opacidad para el header para que se note, pero que siga siendo transparente
					return adjustOpacity(bg, Math.min(terminalOpacity + 0.1, 1.0));
				})()};
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
					min-width: 50px;
					z-index: 5;
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
					color: ${terminalTheme.foreground || '#c9d1d9'};
					opacity: 0.6;
					font-size: 11.5px;
					user-select: none;
					pointer-events: none;
					font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
					font-weight: 400;
					letter-spacing: 0.3px;
				}
				.recents-terminal-header .header-path .path-tilde { color: ${terminalTheme.green || '#3fb950'}; }
				
				/* GNOME Style */
				.gnome-dot {
					width: 24px;
					height: 24px;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					background: rgba(255,255,255,0.1);
					color: #fff;
					font-size: 10px;
					cursor: pointer;
					transition: background 0.2s;
				}
				.gnome-dot:hover { background: #e81123; }
				.gnome-controls { display: flex; align-items: center; }

				/* KDE Style */
				.kde-controls { display: flex; align-items: center; gap: 4px; }
				.kde-dot {
					width: 24px;
					height: 24px;
					display: flex;
					align-items: center;
					justify-content: center;
					color: ${themeColors.textPrimary || '#fff'};
					cursor: pointer;
					border-radius: 4px;
					transition: all 0.2s;
				}
				.kde-dot:hover { background: rgba(255,255,255,0.1); }
				.kde-dot.close:hover { background: #e81123; color: #fff !important; }

				/* Custom Thin Icons */
				.custom-icon {
					width: 10px;
					height: 10px;
					position: relative;
					display: flex;
					align-items: center;
					justify-content: center;
					opacity: 0.8;
				}
				.kde-dot:hover .custom-icon { opacity: 1; }
				.icon-min::after {
					content: '';
					width: 10px;
					height: 1px;
					background: currentColor;
				}
				.icon-max::after {
					content: '';
					width: 8px;
					height: 8px;
					border: 1px solid currentColor;
				}
				.icon-close::before, .icon-close::after {
					content: '';
					position: absolute;
					width: 11px;
					height: 1px;
					background: currentColor;
				}
				.icon-close::before { transform: rotate(45deg); }
				.icon-close::after { transform: rotate(-45deg); }

				/* Windows Style */
				.windows-controls { display: flex; align-items: center; }
				.win-dot {
					width: 32px;
					height: 24px;
					display: flex;
					align-items: center;
					justify-content: center;
					color: ${themeColors.textPrimary || '#fff'};
					cursor: pointer;
					transition: all 0.15s;
				}
				.win-dot:hover { background: rgba(255,255,255,0.1); }
				.win-dot.close:hover { background: #e81123; color: #fff !important; }

				/* Futuristic Style */
				.recents-terminal-frame.futuristic, .top-terminal-frame.futuristic {
					border: 1px solid #00f2ff !important;
					box-shadow: 0 0 15px rgba(0, 242, 255, 0.3) !important;
					clip-path: polygon(0 0, 98% 0, 100% 8%, 100% 100%, 8% 100%, 0 92%);
					background: transparent !important;
					padding: 1px;
				}
				.futuristic-controls { display: flex; gap: 10px; }
				.cyber-dot {
					width: 20px; height: 20px;
					border: 1px solid #00f2ff;
					display: flex; align-items: center; justify-content: center;
					font-size: 10px; color: #00f2ff; cursor: pointer;
					text-shadow: 0 0 5px #00f2ff;
					transform: skew(-15deg);
					transition: all 0.2s;
				}
				.cyber-dot:hover { background: #00f2ff; color: #000; box-shadow: 0 0 10px #00f2ff; }

				/* Modern Glass Style */
				.recents-terminal-frame.modern {
					border: 1px solid rgba(255,255,255,0.2) !important;
					backdrop-filter: blur(25px) saturate(180%) !important;
					background: transparent !important;
					border-radius: 16px !important;
					overflow: hidden;
				}
				.modern-controls { display: flex; gap: 6px; }
				.glass-dot {
					width: 28px; height: 28px;
					border-radius: 8px;
					display: flex; align-items: center; justify-content: center;
					background: rgba(255,255,255,0.05);
					border: 1px solid rgba(255,255,255,0.1);
					color: #fff; cursor: pointer;
					transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
				}
				.glass-dot:hover { background: rgba(255,255,255,0.15); transform: translateY(-1px); }

				/* Retro CRT Style */
				.recents-terminal-frame.retro {
					border: 10px solid #2c2c2c !important;
					border-radius: 20px !important;
					box-shadow: inset 0 0 20px rgba(0,0,0,0.8), 0 5px 15px rgba(0,0,0,0.5) !important;
					background: transparent !important;
				}
				.retro-controls { display: flex; gap: 8px; }
				.retro-switch {
					width: 24px; height: 12px;
					background: #444; border: 2px solid #666;
					position: relative; cursor: pointer;
				}
				.retro-switch::after {
					content: ''; position: absolute; left: 2px; top: 2px;
					width: 8px; height: 4px; background: #888;
				}
				.retro-switch.on::after { left: auto; right: 2px; background: #0f0; box-shadow: 0 0 5px #0f0; }

				/* Removed WhiteSur, Orchis, Fluent as requested */

				/* Matcha Style */
				.recents-terminal-frame.matcha {
					border-top: 3px solid #2eb398 !important;
					border-radius: 4px !important;
				}
				.matcha-controls { display: flex; gap: 2px; }
				.matcha-dot {
					width: 26px; height: 26px;
					display: flex; align-items: center; justify-content: center;
					color: #aaa; cursor: pointer;
				}
				.matcha-dot:hover { color: #fff; background: rgba(255,255,255,0.05); }
				
				.recents-header-right { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
				.recents-header-filter-btn {
					background: transparent;
					border: none;
					color: ${terminalTheme.foreground || '#c9d1d9'};
					opacity: 0.6;
					cursor: pointer;
					padding: 4px 6px;
					border-radius: 4px;
					font-size: 0.85rem;
					transition: color 0.15s, background 0.15s;
					display: flex; align-items: center;
				}
				.recents-header-filter-btn:hover, .recents-header-filter-btn.active { color: ${terminalTheme.green || '#3fb950'}; background: rgba(255,255,255,0.06); opacity: 1; }
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

				/* Apply Opacity to Terminal Backgrounds (High Specificity Overrides) */
				.recents-terminal-frame, .top-terminal-frame,
				.recents-terminal-frame.macos, .top-terminal-frame.macos,
				.recents-terminal-frame.gnome, .top-terminal-frame.gnome,
				.recents-terminal-frame.kde, .top-terminal-frame.kde,
				.recents-terminal-frame.windows, .top-terminal-frame.windows,
				.recents-terminal-frame.matcha, .top-terminal-frame.matcha,
				.recents-terminal-frame.futuristic, .top-terminal-frame.futuristic,
				.recents-terminal-frame.modern, .top-terminal-frame.modern,
				.recents-terminal-frame.retro, .top-terminal-frame.retro {
					background-color: ${(() => {
					const bg = terminalTheme.background || '#0d1117';
					const adjustOpacityLoc = (color, opacity) => {
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
					return adjustOpacityLoc(bg, terminalOpacity);
				})()} !important;
					background: ${(() => {
					const bg = terminalTheme.background || '#0d1117';
					const adjustOpacityLoc = (color, opacity) => {
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
					return adjustOpacityLoc(bg, terminalOpacity);
				})()} !important;
				}
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
				/* Custom scrollbar for theme picker overlay */
				.theme-picker-overlay .p-overlaypanel-content {
					padding: 0;
				}
				.theme-picker-overlay *::-webkit-scrollbar {
					width: 8px;
				}
				.theme-picker-overlay *::-webkit-scrollbar-track {
					background: transparent;
				}
				.theme-picker-overlay *::-webkit-scrollbar-thumb {
					background: rgba(255, 255, 255, 0.15);
					border-radius: 4px;
					border: 2px solid transparent;
					background-clip: padding-box;
				}
				.theme-picker-overlay *::-webkit-scrollbar-thumb:hover {
					background: rgba(255, 255, 255, 0.3);
					border: 2px solid transparent;
					background-clip: padding-box;
				}

				.frame-style-option {
					display: flex;
					align-items: center;
					gap: 12px;
					padding: 10px 16px;
					cursor: pointer;
					transition: all 0.2s;
					border-radius: 8px;
					color: #fff;
				}
				.frame-style-option:hover {
					background: rgba(255, 255, 255, 0.05);
				}
				.frame-style-option.active {
					background: ${themeColors.hoverBackground || 'rgba(255, 255, 255, 0.1)'};
					border: 1px solid rgba(255, 255, 255, 0.1);
				}
				.frame-preview {
					display: flex;
					align-items: center;
					width: 60px;
					height: 24px;
					border-radius: 4px;
					border: 1px solid rgba(255,255,255,0.1);
					padding: 0 4px;
					overflow: hidden;
					background: rgba(0,0,0,0.2);
				}
				.frame-preview-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
				.frame-preview-bar { flex: 1; height: 2px; background: rgba(255,255,255,0.1); margin: 0 4px; border-radius: 1px; }
				.frame-preview-btn { width: 4px; height: 4px; background: rgba(255,255,255,0.2); flex-shrink: 0; }
			`}</style>



			<div className="hero-splash-header" style={{ paddingBottom: '20px' }}>

				<div className={`top-terminal-frame ${terminalFrameStyle}`}>
					<div className="top-terminal-header">
						<div className="traffic-lights">
							{terminalFrameStyle === 'macos' ? (
								<>
									<div className="traffic-dot red" />
									<div className="traffic-dot yellow" />
									<div className="traffic-dot green" />
								</>
							) : terminalFrameStyle === 'gnome' ? (
								<div className="gnome-controls" style={{ marginLeft: '-8px' }}>
									<div className="gnome-dot close" title="Cerrar"><i className="pi pi-times" /></div>
								</div>
							) : terminalFrameStyle === 'kde' ? (
								<div className="kde-controls" style={{ marginLeft: '-8px' }}>
									<div className="kde-dot minimize" title="Minimizar"><div className="custom-icon icon-min" /></div>
									<div className="kde-dot maximize" title="Maximizar"><div className="custom-icon icon-max" /></div>
									<div className="kde-dot close" title="Cerrar"><div className="custom-icon icon-close" /></div>
								</div>
							) : terminalFrameStyle === 'windows' ? (
								<div className="windows-controls" style={{ marginLeft: '-8px' }}>
									<div className="win-dot minimize" title="Minimizar"><div className="custom-icon icon-min" /></div>
									<div className="win-dot maximize" title="Maximizar"><div className="custom-icon icon-max" /></div>
									<div className="win-dot close" title="Cerrar"><div className="custom-icon icon-close" /></div>
								</div>
							) : terminalFrameStyle === 'matcha' ? (
								<div className="matcha-controls" style={{ marginLeft: '-8px' }}>
									<div className="matcha-dot"><i className="pi pi-times" /></div>
								</div>
							) : terminalFrameStyle === 'futuristic' ? (
								<div className="futuristic-controls" style={{ marginLeft: '-8px' }}>
									<div className="cyber-dot"><i className="pi pi-times" /></div>
								</div>
							) : terminalFrameStyle === 'modern' ? (
								<div className="modern-controls" style={{ marginLeft: '-8px' }}>
									<div className="glass-dot"><i className="pi pi-times" /></div>
								</div>
							) : (
								<div className="retro-controls" style={{ marginLeft: '-8px' }}>
									<div className="retro-switch on" />
								</div>
							)}
						</div>
						<div className="header-path">
							<span className="header-brand">NodeTerm</span>
							<span style={{ opacity: 0.4 }}>{'\u00B7'}</span>
							<div style={{ opacity: 0.4, display: 'flex', alignItems: 'center', fontSize: '11px' }}>
								<span className="path-tilde">~</span>/home
							</div>
						</div>
						<div className="header-sessions-container" style={{ marginLeft: 'auto', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
							<span className="header-sessions" style={{ fontSize: '9px', fontWeight: 600 }}>
								<i className="pi pi-circle-fill" style={{ fontSize: '5px' }} />
								{activeIds.size} sessions
							</span>
							<i
								className="pi pi-palette"
								style={{
									fontSize: '0.9rem',
									color: themeColors.textPrimary || '#fff',
									opacity: 0.6,
									cursor: 'pointer',
									padding: '4px',
									borderRadius: '4px',
									transition: 'all 0.2s'
								}}
								title="Cambiar tema de la interfaz"
								onClick={(e) => {
									e.stopPropagation();
									uiThemePickerRef.current?.toggle(e);
								}}
								onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
								onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
							/>
						</div>
					</div>
					<div className="top-terminal-body">
						<div className="hero-search-container" style={{ margin: '0 0 12px 0' }}>
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
								className="hero-terminal-btn"
								title="Mostrar/ocultar terminal local flotante"
								onClick={(e) => {
									e.stopPropagation();
									if (onToggleTerminalVisibility) {
										onToggleTerminalVisibility();
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
								className={`hero-action-btn terminal-primary ${terminalView ? 'active' : ''}`}
								title="Abrir nueva terminal local"
								onClick={(e) => {
									e.stopPropagation();
									if (onTerminalToggle) {
										const terminalType = localStorage.getItem('nodeterm_default_local_terminal') || 'powershell';
										onTerminalToggle(true, terminalType, false);
									}
								}}
							>
								<i className="pi pi-plus-circle" /> Terminal
							</button>
							<button
								className={`hero-action-btn ${activeBottomView === 'recent' && !terminalView ? 'active' : ''}`}
								onClick={() => {
									if (terminalView && onTerminalToggle) onTerminalToggle(false);
									setActiveBottomView('recent');
								}}
							>
								<i className="pi pi-clock" /> Recientes
							</button>
							<button
								className={`hero-action-btn ${activeBottomView === 'favorites' && !terminalView ? 'active' : ''}`}
								onClick={() => {
									if (terminalView && onTerminalToggle) onTerminalToggle(false);
									setActiveBottomView('favorites');
								}}
							>
								<i className="pi pi-star" /> Favoritos
							</button>
						</div>
					</div>
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



			{/* FAVORITES TABLE - Terminal-style frame for favorites */}
			{
				!terminalView && activeBottomView === 'favorites' && (
					<div className={`recents-terminal-frame favorites-terminal-frame ${terminalFrameStyle}`}>
						{/* macOS-style header */}
						<div className="recents-terminal-header">
							<div className="traffic-lights">
								{terminalFrameStyle === 'macos' ? (
									<>
										<div
											className="traffic-dot red"
											onClick={() => setActiveBottomView('all')}
											title="Cerrar favoritos"
										/>
										<div className="traffic-dot yellow" />
										<div className="traffic-dot green" />
									</>
								) : terminalFrameStyle === 'gnome' ? (
									<div className="gnome-controls">
										<div className="gnome-dot close" title="Cerrar" onClick={() => setActiveBottomView('all')}><i className="pi pi-times" /></div>
									</div>
								) : terminalFrameStyle === 'kde' ? (
									<div className="kde-controls">
										<div className="kde-dot minimize" title="Minimizar"><i className="pi pi-minus" /></div>
										<div className="kde-dot maximize" title="Maximizar"><i className="pi pi-stop" /></div>
										<div className="kde-dot close" title="Cerrar" onClick={() => setActiveBottomView('all')}><i className="pi pi-times" /></div>
									</div>
								) : terminalFrameStyle === 'windows' ? (
									<div className="windows-controls">
										<div className="win-dot minimize" title="Minimizar"><i className="pi pi-minus" /></div>
										<div className="win-dot maximize" title="Maximizar"><i className="pi pi-stop" /></div>
										<div className="win-dot close" title="Cerrar" onClick={() => setActiveBottomView('all')}><i className="pi pi-times" /></div>
									</div>
								) : terminalFrameStyle === 'orchis' ? (
									<div className="orchis-controls">
										<div className="orchis-dot" onClick={() => setActiveBottomView('all')} title="Cerrar"><i className="pi pi-times" /></div>
									</div>
								) : terminalFrameStyle === 'fluent' ? (
									<div className="fluent-controls">
										<div className="fluent-dot"><i className="pi pi-minus" /></div>
										<div className="fluent-dot"><i className="pi pi-stop" /></div>
										<div className="fluent-dot" onClick={() => setActiveBottomView('all')} title="Cerrar"><i className="pi pi-times" /></div>
									</div>
								) : terminalFrameStyle === 'matcha' ? (
									<div className="matcha-controls">
										<div className="matcha-dot" onClick={() => setActiveBottomView('all')} title="Cerrar"><i className="pi pi-times" /></div>
									</div>
								) : terminalFrameStyle === 'futuristic' ? (
									<div className="futuristic-controls">
										<div className="cyber-dot" onClick={() => setActiveBottomView('all')} title="Cerrar">EXE</div>
									</div>
								) : terminalFrameStyle === 'modern' ? (
									<div className="modern-controls">
										<div className="glass-dot" onClick={() => setActiveBottomView('all')} title="Cerrar"><i className="pi pi-times" /></div>
									</div>
								) : (
									<div className="retro-controls">
										<div className="retro-switch on" onClick={() => setActiveBottomView('all')} title="OFF" />
									</div>
								)}
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
					<div className={`recents-terminal-frame ${terminalFrameStyle}`}>
						{/* macOS-style header with filter on the right */}
						<div className="recents-terminal-header">
							<div className="traffic-lights">
								{terminalFrameStyle === 'macos' ? (
									<>
										<div
											className="traffic-dot red"
											onClick={() => setActiveBottomView('all')}
											title="Cerrar recientes"
										/>
										<div className="traffic-dot yellow" />
										<div className="traffic-dot green" />
									</>
								) : terminalFrameStyle === 'gnome' ? (
									<div className="gnome-controls">
										<div className="gnome-dot close" title="Cerrar" onClick={() => setActiveBottomView('all')}><i className="pi pi-times" /></div>
									</div>
								) : terminalFrameStyle === 'kde' ? (
									<div className="kde-controls">
										<div className="kde-dot minimize" title="Minimizar"><i className="pi pi-minus" /></div>
										<div className="kde-dot maximize" title="Maximizar"><i className="pi pi-stop" /></div>
										<div className="kde-dot close" title="Cerrar" onClick={() => setActiveBottomView('all')}><i className="pi pi-times" /></div>
									</div>
								) : terminalFrameStyle === 'windows' ? (
									<div className="windows-controls">
										<div className="win-dot minimize" title="Minimizar"><i className="pi pi-minus" /></div>
										<div className="win-dot maximize" title="Maximizar"><i className="pi pi-stop" /></div>
										<div className="win-dot close" title="Cerrar" onClick={() => setActiveBottomView('all')}><i className="pi pi-times" /></div>
									</div>
								) : terminalFrameStyle === 'orchis' ? (
									<div className="orchis-controls">
										<div className="orchis-dot" onClick={() => setActiveBottomView('all')} title="Cerrar"><i className="pi pi-times" /></div>
									</div>
								) : terminalFrameStyle === 'fluent' ? (
									<div className="fluent-controls">
										<div className="fluent-dot"><i className="pi pi-minus" /></div>
										<div className="fluent-dot"><i className="pi pi-stop" /></div>
										<div className="fluent-dot" onClick={() => setActiveBottomView('all')} title="Cerrar"><i className="pi pi-times" /></div>
									</div>
								) : terminalFrameStyle === 'matcha' ? (
									<div className="matcha-controls">
										<div className="matcha-dot" onClick={() => setActiveBottomView('all')} title="Cerrar"><i className="pi pi-times" /></div>
									</div>
								) : terminalFrameStyle === 'futuristic' ? (
									<div className="futuristic-controls">
										<div className="cyber-dot" onClick={() => setActiveBottomView('all')} title="Cerrar">EXE</div>
									</div>
								) : terminalFrameStyle === 'modern' ? (
									<div className="modern-controls">
										<div className="glass-dot" onClick={() => setActiveBottomView('all')} title="Cerrar"><i className="pi pi-times" /></div>
									</div>
								) : (
									<div className="retro-controls">
										<div className="retro-switch on" onClick={() => setActiveBottomView('all')} title="OFF" />
									</div>
								)}
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

			{/* CSS Overrides for Terminal Transparency in Integrated View */}
			<style>
				{`
					.recents-terminal-frame .xterm, 
					.recents-terminal-frame .xterm-viewport,
					.recents-terminal-frame .xterm-screen,
					.recents-terminal-frame .xterm-screen canvas, 
					.recents-terminal-frame .xterm-rows,
					.recents-terminal-frame .xterm-text-layer, 
					.recents-terminal-frame .xterm-selection-layer,
					.recents-terminal-frame .xterm-link-layer, 
					.recents-terminal-frame .xterm-cursor-layer,
					.recents-terminal-frame .xterm-decoration-container, 
					.recents-terminal-frame .xterm-helpers,
					.recents-terminal-frame .p-tabview, 
					.recents-terminal-frame .p-tabview-panels,
					.recents-terminal-frame .p-tabview-panel {
						background: transparent !important;
						background-color: transparent !important;
					}
				`}
			</style>

			{/* EMBEDDED LOCAL TERMINAL - Always mounted to preserve session state, shown/hidden via display */}
			<div
				className={`recents-terminal-frame ${terminalFrameStyle}`}
				style={{
					display: terminalView ? 'flex' : 'none',
					background: localTerminalBg
				}}
			>
				{/* macOS-style header */}
				<div className="recents-terminal-header">
					<div className="traffic-lights">
						{terminalFrameStyle === 'macos' ? (
							<>
								<div
									className="traffic-dot red"
									onClick={() => {
										if (onTerminalToggle) onTerminalToggle(false);
										// Al cerrar el terminal integrado, forzar vista de Recientes para evitar el 'old code' de favoritos
										setActiveBottomView('recent');
									}}
									title="Ocultar Terminal"
								/>
								<div className="traffic-dot yellow" />
								<div className="traffic-dot green" />
							</>
						) : terminalFrameStyle === 'gnome' ? (
							<div className="gnome-controls">
								<div
									className="gnome-dot close"
									title="Cerrar"
									onClick={() => {
										if (onTerminalToggle) onTerminalToggle(false);
										setActiveBottomView('recent');
									}}
								>
									<i className="pi pi-times" />
								</div>
							</div>
						) : terminalFrameStyle === 'kde' ? (
							<div className="kde-controls">
								<div className="kde-dot minimize" title="Minimizar"><div className="custom-icon icon-min" /></div>
								<div className="kde-dot maximize" title="Maximizar"><div className="custom-icon icon-max" /></div>
								<div
									className="kde-dot close"
									title="Cerrar"
									onClick={() => {
										if (onTerminalToggle) onTerminalToggle(false);
										setActiveBottomView('recent');
									}}
								>
									<div className="custom-icon icon-close" />
								</div>
							</div>
						) : terminalFrameStyle === 'windows' ? (
							<div className="windows-controls">
								<div className="win-dot minimize" title="Minimizar"><div className="custom-icon icon-min" /></div>
								<div className="win-dot maximize" title="Maximizar"><div className="custom-icon icon-max" /></div>
								<div
									className="win-dot close"
									title="Cerrar"
									onClick={() => {
										if (onTerminalToggle) onTerminalToggle(false);
										setActiveBottomView('recent');
									}}
								>
									<div className="custom-icon icon-close" />
								</div>
							</div>
						) : terminalFrameStyle === 'orchis' ? (
							<div className="orchis-controls">
								<div className="orchis-dot" onClick={() => { if (onTerminalToggle) onTerminalToggle(false); setActiveBottomView('recent'); }} title="Cerrar"><i className="pi pi-times" /></div>
							</div>
						) : terminalFrameStyle === 'fluent' ? (
							<div className="fluent-controls">
								<div className="fluent-dot"><i className="pi pi-minus" /></div>
								<div className="fluent-dot"><i className="pi pi-stop" /></div>
								<div className="fluent-dot" onClick={() => { if (onTerminalToggle) onTerminalToggle(false); setActiveBottomView('recent'); }} title="Cerrar"><i className="pi pi-times" /></div>
							</div>
						) : terminalFrameStyle === 'matcha' ? (
							<div className="matcha-controls">
								<div className="matcha-dot" onClick={() => { if (onTerminalToggle) onTerminalToggle(false); setActiveBottomView('recent'); }} title="Cerrar"><i className="pi pi-times" /></div>
							</div>
						) : terminalFrameStyle === 'futuristic' ? (
							<div className="futuristic-controls">
								<div
									className="cyber-dot"
									title="Cerrar"
									onClick={() => {
										if (onTerminalToggle) onTerminalToggle(false);
										setActiveBottomView('recent');
									}}
								>
									EXE
								</div>
							</div>
						) : terminalFrameStyle === 'modern' ? (
							<div className="modern-controls">
								<div
									className="glass-dot"
									title="Cerrar"
									onClick={() => {
										if (onTerminalToggle) onTerminalToggle(false);
										setActiveBottomView('recent');
									}}
								>
									<i className="pi pi-times" />
								</div>
							</div>
						) : (
							<div className="retro-controls">
								<div
									className="retro-switch on"
									title="OFF"
									onClick={() => {
										if (onTerminalToggle) onTerminalToggle(false);
										setActiveBottomView('recent');
									}}
								/>
							</div>
						)}
					</div>
					<div className="header-path">
						<span className="path-tilde">~</span>{terminalTitle}
					</div>
					<div className="recents-header-right" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
						<i
							className="pi pi-desktop"
							style={{
								fontSize: '0.9rem',
								color: terminalTheme.foreground || '#c9d1d9',
								opacity: 0.6,
								cursor: 'pointer',
								padding: '4px',
								borderRadius: '4px',
								transition: 'all 0.2s'
							}}
							title="Cambiar estilo de marco"
							onClick={(e) => {
								e.stopPropagation();
								frameStylePickerRef.current?.toggle(e);
							}}
							onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
							onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
						/>
						<i
							className="pi pi-palette"
							style={{
								fontSize: '0.9rem',
								color: terminalTheme.foreground || '#c9d1d9',
								opacity: 0.6,
								cursor: 'pointer',
								padding: '4px',
								borderRadius: '4px',
								transition: 'all 0.2s'
							}}
							title="Fijar Tema Linux/WSL... (clic derecho para Preferencias)"
							onClick={(e) => {
								e.stopPropagation();
								themePickerRef.current?.toggle(e);
							}}
							onContextMenu={(e) => {
								e.preventDefault();
								if (onOpenSettings) onOpenSettings();
								setTimeout(() => {
									try {
										window.dispatchEvent(new CustomEvent('open-settings-dialog', {
											detail: { tab: 'appearance', subTab: 'terminal' }
										}));
									} catch (err) {
										console.error('Error opening settings tab:', err);
									}
								}, 100);
							}}
							onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
							onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
						/>
						<i
							className="pi pi-eye"
							style={{
								fontSize: '0.9rem',
								color: terminalTheme.foreground || '#c9d1d9',
								opacity: 0.6,
								cursor: 'pointer',
								padding: '4px',
								borderRadius: '4px',
								transition: 'all 0.2s'
							}}
							title="Ajustar opacidad del terminal"
							onClick={(e) => {
								e.stopPropagation();
								terminalOpacityOverlayRef.current?.toggle(e);
							}}
							onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
							onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
						/>
						<i className="pi pi-th-large" style={{ fontSize: '0.9rem', color: terminalTheme.foreground || '#c9d1d9', opacity: 0.3, cursor: 'not-allowed', padding: '4px' }} title="Split Terminal (Próximamente)" />
					</div>
				</div>

				<OverlayPanel
					ref={terminalOpacityOverlayRef}
					style={{
						width: '200px',
						backgroundColor: 'var(--ui-dialog-bg, #1e1e1e)',
						border: '1px solid var(--ui-content-border, #444)',
						boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
						borderRadius: '8px'
					}}
					className="theme-picker-overlay"
				>
					<div style={{ padding: '12px' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
							<span style={{ color: 'var(--ui-dialog-text)', fontSize: '0.9rem', fontWeight: 'bold' }}>Opacidad</span>
							<span style={{ color: 'var(--ui-dialog-text)', opacity: 0.6, fontSize: '0.8rem' }}>{Math.round(terminalOpacity * 100)}%</span>
						</div>
						<Slider
							value={terminalOpacity * 100}
							onChange={(e) => onTerminalOpacityChange(e.value / 100)}
							min={5}
							max={100}
							step={1}
							style={{ width: '100%' }}
						/>
					</div>
				</OverlayPanel>

				{/* Terminal Body - always kept alive */}
				{children}
			</div>

			<OverlayPanel
				ref={themePickerRef}
				style={{
					width: '280px',
					backgroundColor: 'var(--ui-dialog-bg, #1e1e1e)',
					border: '1px solid var(--ui-content-border, #444)',
					boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
					borderRadius: '8px'
				}}
				className="theme-picker-overlay"
			>
				<div style={{ maxHeight: '350px', overflowY: 'auto', padding: '4px' }}>
					<div style={{
						padding: '8px 12px',
						fontWeight: '600',
						fontSize: '14px',
						color: 'var(--ui-dialog-text)',
						borderBottom: '1px solid var(--ui-content-border, #444)',
						marginBottom: '8px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between'
					}}>
						<span>Tema (Linux/WSL)</span>
						<i className="pi pi-palette" style={{ opacity: 0.7 }} />
					</div>
					{Object.keys(themes).map(themeKey => {
						const currentTheme = themes[themeKey]?.theme || {};
						return (
							<div
								key={themeKey}
								onClick={() => handleThemeSelect(themeKey)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '12px',
									padding: '10px 12px',
									cursor: 'pointer',
									borderRadius: '6px',
									backgroundColor: themeKey === localLinuxTerminalTheme ? 'rgba(var(--ui-button-primary-rgb), 0.2)' : 'transparent',
									transition: 'all 0.2s',
									margin: '2px 0'
								}}
								className="theme-picker-item"
								onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
								onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeKey === localLinuxTerminalTheme ? 'rgba(var(--ui-button-primary-rgb), 0.2)' : 'transparent'}
							>
								<div style={{
									width: '18px',
									height: '18px',
									borderRadius: '4px',
									background: `linear-gradient(135deg, ${currentTheme.background || '#000'} 0%, ${currentTheme.background || '#000'} 45%, ${currentTheme.cursor || currentTheme.green || currentTheme.foreground || '#fff'} 100%)`,
									border: `1px solid ${currentTheme.cursor || currentTheme.foreground || 'rgba(255,255,255,0.2)'}`,
									boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
									opacity: 0.9
								}} />
								<span style={{
									fontSize: '13px',
									color: 'var(--ui-dialog-text)',
									fontWeight: themeKey === localLinuxTerminalTheme ? '600' : 'normal',
									flex: 1
								}}>{themeKey}</span>
								{themeKey === localLinuxTerminalTheme && (
									<i className="pi pi-check" style={{ fontSize: '10px', color: 'var(--ui-button-primary)' }} />
								)}
							</div>
						);
					})}
					<div
						style={{
							padding: '10px 12px',
							marginTop: '8px',
							borderTop: '1px solid var(--ui-content-border, #444)',
							textAlign: 'center',
							fontSize: '11px',
							color: 'var(--ui-dialog-text)',
							opacity: 0.7,
							cursor: 'pointer'
						}}
						onClick={() => {
							themePickerRef.current?.hide();
							if (onOpenSettings) onOpenSettings();
							setTimeout(() => {
								try {
									window.dispatchEvent(new CustomEvent('open-settings-dialog', {
										detail: { tab: 'appearance', subTab: 'terminal' }
									}));
								} catch (err) {
									console.error('Error opening settings tab:', err);
								}
							}, 100);
						}}
					>
						Ajustes avanzados...
					</div>
				</div>
			</OverlayPanel>

			<OverlayPanel
				ref={uiThemePickerRef}
				style={{
					width: '320px',
					backgroundColor: 'var(--ui-dialog-bg, #1e1e1e)',
					border: '1px solid var(--ui-content-border, #444)',
					boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
					borderRadius: '12px'
				}}
				className="ui-theme-picker-overlay"
			>
				<div style={{ maxHeight: '450px', overflowY: 'auto', padding: '8px' }}>
					<div style={{
						padding: '8px 12px',
						fontWeight: '700',
						fontSize: '15px',
						color: 'var(--ui-dialog-text)',
						borderBottom: '1px solid var(--ui-content-border, #444)',
						marginBottom: '12px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						letterSpacing: '0.5px'
					}}>
						<span>Temas de Interfaz</span>
						<i className="pi pi-sparkles" style={{ color: 'var(--ui-button-primary)', opacity: 0.9 }} />
					</div>

					{UI_CATEGORIES.map(category => (
						<div key={category.id} className="ui-theme-category-group">
							<div style={{
								fontSize: '11px',
								textTransform: 'uppercase',
								color: 'rgba(255,255,255,0.4)',
								fontWeight: '600',
								padding: '8px 12px 4px',
								letterSpacing: '1px'
							}}>
								{category.name}
							</div>
							{category.keys.map(themeKey => {
								const theme = uiThemes[themeKey];
								if (!theme) return null;
								const isActive = theme.name === currentUITheme;
								const colors = theme.colors || {};

								return (
									<div
										key={themeKey}
										onClick={() => handleUIThemeSelect(theme.name)}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '12px',
											padding: '8px 12px',
											cursor: 'pointer',
											borderRadius: '8px',
											backgroundColor: isActive ? 'rgba(var(--ui-button-primary-rgb), 0.15)' : 'transparent',
											transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
											margin: '2px 0'
										}}
										className={`ui-theme-item ${isActive ? 'active' : ''}`}
										onMouseEnter={(e) => {
											if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
										}}
										onMouseLeave={(e) => {
											if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
										}}
									>
										<div style={{
											display: 'flex',
											gap: '2px',
											width: '24px',
											height: '24px',
											borderRadius: '6px',
											overflow: 'hidden',
											border: `1px solid ${isActive ? 'var(--ui-button-primary)' : 'rgba(255,255,255,0.1)'}`,
											boxShadow: isActive ? '0 0 10px rgba(var(--ui-button-primary-rgb), 0.3)' : 'none'
										}}>
											<div style={{ flex: 1, backgroundColor: colors.sidebarBackground || '#000' }} />
											<div style={{ flex: 1, backgroundColor: colors.buttonPrimary || '#fff' }} />
											<div style={{ flex: 1, backgroundColor: colors.contentBackground || '#333' }} />
										</div>
										<span style={{
											fontSize: '13px',
											color: isActive ? 'var(--ui-button-primary)' : 'var(--ui-dialog-text)',
											fontWeight: isActive ? '600' : '500',
											flex: 1
										}}>{theme.name}</span>
										{isActive && (
											<i className="pi pi-check" style={{ fontSize: '12px', color: 'var(--ui-button-primary)' }} />
										)}
									</div>
								);
							})}
						</div>
					))}

					<div
						style={{
							padding: '12px',
							marginTop: '12px',
							borderTop: '1px solid var(--ui-content-border, #444)',
							textAlign: 'center',
							fontSize: '11px',
							color: 'var(--ui-dialog-text)',
							opacity: 0.6,
							cursor: 'pointer',
							transition: 'opacity 0.2s'
						}}
						onClick={() => {
							uiThemePickerRef.current?.hide();
							if (onOpenSettings) onOpenSettings();
							setTimeout(() => {
								try {
									window.dispatchEvent(new CustomEvent('open-settings-dialog', {
										detail: { tab: 'appearance' }
									}));
								} catch (err) {
									console.error('Error opening settings tab:', err);
								}
							}, 100);
						}}
						onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
						onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
					>
						Gestión completa de temas...
					</div>
				</div>
			</OverlayPanel>

			<OverlayPanel ref={frameStylePickerRef} className="theme-picker-overlay" style={{ background: themeColors.cardBackground || '#1e1e1e', width: '220px' }}>
				<div style={{ padding: '8px' }}>
					<h4 style={{ margin: '0 0 10px 8px', color: themeColors.textPrimary || '#fff', fontSize: '0.9rem' }}>Estilo de Marco</h4>
					{[
						{ id: 'macos', label: 'macOS (Traffic)', dots: ['#ff5f56', '#ffbd2e', '#27c93f'] },
						{ id: 'gnome', label: 'GNOME (Adwaita)', icon: 'pi pi-times', right: true },
						{ id: 'kde', label: 'KDE (Breeze)', icons: ['pi-minus', 'pi-stop', 'pi-times'], right: true },
						{ id: 'windows', label: 'Windows (WinUI)', icons: ['pi-minus', 'pi-stop', 'pi-times'], right: true },
						{ id: 'matcha', label: 'Matcha (Green)', line: '#2eb398', icons: ['pi-times'], right: true },
						{ id: 'futuristic', label: 'Futurista (Cyber)', color: '#00f2ff', text: 'EXE' },
						{ id: 'modern', label: 'Moderno (Glass)', rounded: true, icons: ['pi-times'], right: true },
						{ id: 'retro', label: 'Retro (CRT)', color: '#0f0', switch: true }
					].map(style => (
						<div
							key={style.id}
							className={`frame-style-option ${terminalFrameStyle === style.id ? 'active' : ''}`}
							onClick={() => {
								setTerminalFrameStyle(style.id);
								frameStylePickerRef.current?.hide();
							}}
						>
							<div className="frame-preview" style={{
								borderColor: style.color || 'rgba(255,255,255,0.1)',
								borderTop: style.line ? `2px solid ${style.line}` : undefined,
								borderRadius: style.rounded ? '8px' : '4px'
							}}>
								{style.dots ? (
									<div style={{ display: 'flex', gap: '3px' }}>
										{style.dots.map((c, i) => <div key={i} className="frame-preview-dot" style={{ background: c }} />)}
									</div>
								) : style.switch ? (
									<div className="frame-preview-dot" style={{ background: '#0f0', boxShadow: '0 0 4px #0f0' }} />
								) : style.text ? (
									<span style={{ fontSize: '6px', color: style.color }}>{style.text}</span>
								) : (
									<div style={{ display: 'flex', gap: '2px', marginLeft: style.right ? 'auto' : 0 }}>
										{(style.icons || [style.icon]).map((ico, i) => (
											<i key={i} className={`pi ${ico}`} style={{ fontSize: '6px', opacity: 0.5 }} />
										))}
									</div>
								)}
								<div className="frame-preview-bar" />
							</div>
							<span style={{ fontSize: '0.82rem' }}>{style.label}</span>
						</div>
					))}
				</div>
			</OverlayPanel>
		</div >
	);
};

export default ConnectionHistory;
