import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { helpers } from '../../../../utils/connectionStore';
import {
	matchesProtocolFilter
} from '../utils/connectionHistoryHelpers';

export const useConnectionSearch = ({
	sidebarNodes = [],
	passwordNodes = [],
	filteredRecentsForDisplay = [],
	recentConnections = [],
	filteredFavorites = [],
	favoriteConnections = [],
	onConnectToHistory,
	minSearchChars = 2
}) => {
	const [searchTerm, setSearchTerm] = useState('');
	const [filteredSearchResults, setFilteredSearchResults] = useState([]);
	const [isSearching, setIsSearching] = useState(false);
	const [showDropdown, setShowDropdown] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const [searchPanelMode, setSearchPanelMode] = useState('standby'); // 'standby' | 'recents' | 'favorites'
	const [searchProtocolFilter, setSearchProtocolFilter] = useState('all'); // 'all' | 'ssh' | 'rdp' | 'vnc' | 'sftp' | 'password' | 'note' | 'ssh-tunnel'
	const [showProtocolFilterBar, setShowProtocolFilterBar] = useState(false);

	// Función para encontrar todas las conexiones en el árbol
	const findAllSidebarConnections = useCallback((nodesList) => {
		if (!nodesList) return [];
		let results = [];
		const traverse = (list) => {
			for (const node of list) {
				if (node.data && (
					node.data.type === 'ssh' ||
					node.data.type === 'rdp' ||
					node.data.type === 'rdp-guacamole' ||
					node.data.type === 'vnc' ||
					node.data.type === 'vnc-guacamole' ||
					node.data.type === 'explorer' ||
					node.data.type === 'sftp' ||
					node.data.type === 'ftp' ||
					node.data.type === 'scp' ||
					node.data.type === 'ssh-tunnel'
				)) {
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

	// Función para encontrar todos los passwords y secretos en el árbol
	const findAllPasswords = useCallback((nodesList) => {
		if (!nodesList) return [];
		let results = [];
		const traverse = (list) => {
			for (const node of list) {
				if (node.data && (
					node.data.type === 'password' ||
					node.data.type === 'secret' ||
					node.data.type === 'crypto_wallet' ||
					node.data.type === 'api_key' ||
					node.data.type === 'secure_note' ||
					node.data.type === 'document' ||
					node.data.type === 'quick-note'
				)) {
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

	// Búsqueda debounced ultra-rápida (100ms)
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			if (searchTerm.trim().length >= minSearchChars) {
				setIsSearching(true);
				const performSearch = () => {
					try {
						const query = searchTerm.toLowerCase().trim();
						const allConnNodes = findAllSidebarConnections(sidebarNodes);
						const allPwdNodes = findAllPasswords(passwordNodes);
						const combined = [...allConnNodes, ...allPwdNodes];
						const MAX_RESULTS = 35;

						const filtered = [];
						for (let i = 0; i < combined.length && filtered.length < MAX_RESULTS; i++) {
							const node = combined[i];
							let matches = false;

							if (node.label && node.label.toLowerCase().includes(query)) {
								matches = true;
							} else if (node.data) {
								if (node.data.type === 'password' || node.data.type === 'secret' || node.data.type === 'crypto_wallet' || node.data.type === 'api_key' || node.data.type === 'secure_note') {
									matches = (
										(node.data.username && node.data.username.toLowerCase().includes(query)) ||
										(node.data.url && node.data.url.toLowerCase().includes(query)) ||
										(node.data.group && node.data.group.toLowerCase().includes(query)) ||
										(node.data.name && node.data.name.toLowerCase().includes(query))
									);
								} else {
									matches = (
										(node.data.host && node.data.host.toLowerCase().includes(query)) ||
										(node.data.hostname && node.data.hostname.toLowerCase().includes(query)) ||
										(node.data.user && node.data.user.toLowerCase().includes(query)) ||
										(node.data.username && node.data.username.toLowerCase().includes(query)) ||
										(node.data.name && node.data.name.toLowerCase().includes(query)) ||
										(node.data.port && String(node.data.port).includes(query))
									);
								}
							}

							if (matches) filtered.push(node);
						}

						setFilteredSearchResults(filtered);
						setIsSearching(false);
						setActiveIndex(filtered.length > 0 ? 0 : -1);
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
				setIsSearching(false);
				setActiveIndex(-1);
			}
		}, 100);

		return () => clearTimeout(timeoutId);
	}, [searchTerm, sidebarNodes, passwordNodes, findAllSidebarConnections, findAllPasswords, minSearchChars]);

	// Conectar SSH directo a IP / Hostname personalizado no guardado
	const handleDirectConnect = useCallback((query) => {
		if (!query) return;
		let raw = query.trim();
		if (!raw) return;

		let username = '';
		let host = raw;
		let port = 22;

		if (raw.includes('@')) {
			const parts = raw.split('@');
			username = parts[0];
			raw = parts[1];
		}
		if (raw.includes(':')) {
			const parts = raw.split(':');
			host = parts[0];
			const parsedPort = parseInt(parts[1], 10);
			if (!isNaN(parsedPort)) port = parsedPort;
		} else {
			host = raw;
		}

		const conn = {
			id: `direct:${username ? username + '@' : ''}${host}:${port}`,
			name: host,
			host,
			username,
			port,
			type: 'ssh',
			lastConnected: new Date().toISOString()
		};

		setSearchTerm('');
		setActiveIndex(-1);
		onConnectToHistory?.(conn);
	}, [onConnectToHistory]);

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


	const handleSelectSearchResult = useCallback((node) => {
		setSearchTerm('');
		setActiveIndex(-1);

		const isPassword = node.data && ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note', 'document', 'quick-note'].includes(node.data.type);
		if (isPassword) {
			const payload = {
				key: node.key,
				label: node.label,
				data: { ...node.data }
			};
			window.dispatchEvent(new CustomEvent('open-password-tab', { detail: payload }));
		} else {
			// Es una conexión, usar handleConnectToHistory adaptando el formato
			const conn = helpers.fromSidebarNode(node);
			if (conn) onConnectToHistory(conn);
		}
	}, [onConnectToHistory]);

	const protocolMatches = useMemo(() => {
		if (searchProtocolFilter === 'all') return [];
		const allConn = findAllSidebarConnections(sidebarNodes);
		const allPwd = findAllPasswords(passwordNodes);
		return [...allConn, ...allPwd].filter(n => matchesProtocolFilter(n.data?.type, searchProtocolFilter));
	}, [searchProtocolFilter, sidebarNodes, passwordNodes, findAllSidebarConnections, findAllPasswords]);

	const handleSearchKeyDown = useCallback((e) => {
		const isSearchingActive = searchTerm.trim().length >= minSearchChars;

		if (isSearchingActive) {
			const currentSearchResults = searchProtocolFilter === 'all'
				? filteredSearchResults
				: filteredSearchResults.filter(n => matchesProtocolFilter(n.data?.type, searchProtocolFilter));

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setActiveIndex(prev => (prev < currentSearchResults.length - 1 ? prev + 1 : 0));
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setActiveIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, currentSearchResults.length - 1)));
			} else if (e.key === 'Enter') {
				e.preventDefault();
				if (activeIndex >= 0 && activeIndex < currentSearchResults.length) {
					handleSelectSearchResult(currentSearchResults[activeIndex]);
				} else if (currentSearchResults.length > 0) {
					handleSelectSearchResult(currentSearchResults[0]);
				} else if (searchTerm.trim().length > 0) {
					handleDirectConnect(searchTerm.trim());
				}
			} else if (e.key === 'Escape') {
				e.preventDefault();
				setSearchTerm('');
				setActiveIndex(-1);
			}
			return;
		}

		// When not searching, but in recents, favorites, or protocol filter mode
		if (searchPanelMode === 'recents' || searchPanelMode === 'favorites' || searchProtocolFilter !== 'all') {
			let activeList = [];
			let isNodeList = false;

			if (searchPanelMode === 'recents') {
				activeList = searchProtocolFilter === 'all'
					? (filteredRecentsForDisplay || recentConnections)
					: (filteredRecentsForDisplay || recentConnections).filter(c => matchesProtocolFilter(c.type, searchProtocolFilter));
			} else if (searchPanelMode === 'favorites') {
				activeList = searchProtocolFilter === 'all'
					? (filteredFavorites || favoriteConnections)
					: (filteredFavorites || favoriteConnections).filter(c => matchesProtocolFilter(c.type, searchProtocolFilter));
			} else if (searchProtocolFilter !== 'all') {
				activeList = protocolMatches;
				isNodeList = true;
			}

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setActiveIndex(prev => (prev < activeList.length - 1 ? prev + 1 : 0));
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setActiveIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, activeList.length - 1)));
			} else if (e.key === 'Enter') {
				e.preventDefault();
				const target = activeIndex >= 0 ? activeList[activeIndex] : activeList[0];
				if (target) {
					if (isNodeList) {
						handleSelectSearchResult(target);
					} else {
						const isPwd = ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note', 'document', 'quick-note'].includes(target.type);
						if (isPwd) {
							window.dispatchEvent(new CustomEvent('open-password-tab', {
								detail: { key: target.id, label: target.name, data: { ...target } }
							}));
						} else {
							onConnectToHistory?.(target);
						}
					}
				}
			} else if (e.key === 'Escape') {
				e.preventDefault();
				setSearchPanelMode('standby');
				setSearchProtocolFilter('all');
				setActiveIndex(-1);
			}
			return;
		}

		if (e.key === 'Enter' && searchTerm.trim().length > 0) {
			e.preventDefault();
			handleDirectConnect(searchTerm.trim());
		}
	}, [
		searchTerm,
		filteredSearchResults,
		activeIndex,
		minSearchChars,
		searchProtocolFilter,
		searchPanelMode,
		filteredRecentsForDisplay,
		recentConnections,
		filteredFavorites,
		favoriteConnections,
		protocolMatches,
		handleSelectSearchResult,
		handleDirectConnect,
		onConnectToHistory
	]);

	return {
		searchTerm,
		setSearchTerm,
		filteredSearchResults,
		isSearching,
		showDropdown,
		setShowDropdown,
		activeIndex,
		setActiveIndex,
		searchPanelMode,
		setSearchPanelMode,
		searchProtocolFilter,
		setSearchProtocolFilter,
		showProtocolFilterBar,
		setShowProtocolFilterBar,
		handleDirectConnect,
		handleSelectSearchResult,
		handleSearchKeyDown,
		protocolMatches,
		findAllSidebarConnections,
		findAllPasswords
	};
};
export default useConnectionSearch;
