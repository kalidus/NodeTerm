import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getFavorites, onUpdate, clearRecents, isFavorite } from '../utils/connectionStore';
import { themes } from '../themes';
import { themeManager } from '../utils/themeManager';
import {
	uiThemes,
	CLASSIC_UI_KEYS,
	FUTURISTIC_UI_KEYS,
	MODERN_UI_KEYS,
	ANIMATED_UI_KEYS,
	NATURE_UI_KEYS
} from '../themes/ui-themes';
import { FaWindows, FaUbuntu, FaLinux } from 'react-icons/fa';
import { SiAnthropic, SiDebian, SiDocker, SiGooglegemini, SiOpenai } from 'react-icons/si';
import AIClientBrandIcon from './AIClientBrandIcon';
import HomePanelWrapper from './HomePanelWrapper';
import HomePanelGuideOverlay from './HomePanelGuideOverlay';
import HomeTelemetryPanel from './HomeTelemetryPanel';

// Modular connection-history package
import {
	ConnectionHistoryStyles,
	HomeIntegratedTerminalShell,
	HomeSearchPanel,
	HomeRecentsPanel,
	HomeFavoritesPanel,
	HomeTerminalSplitPanel,
	ConnectionHistoryDialogs,
	ConnectionHistoryOverlays,
	useConnectionSearch,
	useFavoriteGroupsManager,
	adjustOpacity
} from './home/connection-history';

const MIN_SEARCH_CHARS = 2;

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
	terminalOpacity = 1.0,
	onTerminalOpacityChange = () => { },
	onToggleTerminalVisibility,
	onOpenHomeOptions = null,
	onSwitchTerminal,
	statusBarVisible = true,
	homeCardVisible = true,
	flushRightQuickBar = false,
	rightQuickBar = null,
	localTerminalMaximized = false,
	onToggleLocalTerminalMaximized = () => { },
	// Props para layout modular y paneles arrastrables
	panelsLayout = null,
	onLayoutChange = null,
	onBringToFront = null,
	onClosePanel = null,
	onToggleMaximizePanel = null,
	onToggleMinimizePanel = null,
	onTogglePanelVisibility = null,
	snapToGrid = true,
	smartSnap = true,
	snapGuides = [],
	onPanelDragging = null,
	onPanelDragEnd = null,
	onPanelResizing = null,
	onPanelResizeEnd = null,
	containerBounds = null,
	children
}) => {
	const canvasRef = useRef(null);
	const effectiveContainerBounds = containerBounds || {
		width: canvasRef.current?.offsetWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200),
		height: canvasRef.current?.offsetHeight || (typeof window !== 'undefined' ? window.innerHeight : 800)
	};

	const localTerminalBg = useMemo(() => {
		const baseColor = themes[localLinuxTerminalTheme]?.theme?.background || '#0c0c0c';
		if (terminalOpacity >= 0.99) return baseColor;
		return adjustOpacity(baseColor, terminalOpacity);
	}, [localLinuxTerminalTheme, terminalOpacity]);

	const [favoriteConnections, setFavoriteConnections] = useState([]);
	const [passwordNodes, setPasswordNodes] = useState([]);
	const [activeBottomView, setActiveBottomView] = useState('all');

	// Split panel dentro del marco del terminal integrado
	const [splitOpen, setSplitOpen] = useState(false);
	const [splitView, setSplitView] = useState('recent'); // 'recent' | 'favorites'
	const [splitWidth, setSplitWidth] = useState(null); // px o null (= 25% dinámico)
	const splitBodyRef = useRef(null);

	const handleSplitDragStart = useCallback((e) => {
		e.preventDefault();
		const container = splitBodyRef.current;
		if (!container) return;
		const startX = e.clientX;
		const containerW = container.getBoundingClientRect().width;
		const startW = splitWidth !== null ? splitWidth : containerW * 0.25;
		const onMove = (mv) => {
			const delta = startX - mv.clientX;
			setSplitWidth(Math.min(containerW * 0.6, Math.max(160, startW + delta)));
		};
		const onUp = () => {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		};
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}, [splitWidth]);

	const handleToggleSplit = useCallback((view) => {
		setSplitOpen(prev => {
			if (!prev) return true;
			if (splitView === view) return false;
			return true;
		});
		setSplitView(view);
	}, [splitView]);

	const themePickerRef = useRef(null);
	const uiThemePickerRef = useRef(null);
	const terminalSwitcherOverlayRef = useRef(null);
	const [currentUITheme, setCurrentUITheme] = useState(() => localStorage.getItem('ui_theme') || 'Light');
	const [availableTerminals, setAvailableTerminals] = useState([]);
	const [isDetectingTerminals, setIsDetectingTerminals] = useState(false);
	const [dockerContainers, setDockerContainers] = useState([]);
	const [collapsedLauncherSections, setCollapsedLauncherSections] = useState({
		Containers: true
	});

	const groupedTerminalOptions = useMemo(() => {
		const shellValues = new Set([
			'powershell',
			'linux-terminal',
			'wsl',
			'cygwin',
			'ubuntu',
			'debian',
			'wsl-distro'
		]);
		const aiCliValues = new Set(['claude', 'opencode', 'geminicli', 'codexcli', 'antigravitycli', 'hermescli']);

		const groups = [
			{ label: 'Shells', icon: 'pi pi-desktop', items: [] },
			{ label: 'AI CLIs', icon: 'pi pi-bolt', items: [] },
			{ label: 'Containers', icon: 'pi pi-box', items: [] },
			{ label: 'Otros', icon: 'pi pi-th-large', items: [] }
		];

		availableTerminals.forEach((terminal) => {
			const terminalValue = terminal.type || terminal.value;
			const valueLower = (terminalValue || '').toLowerCase();
			const isWslDistro =
				terminal.type === 'ubuntu' ||
				terminal.type === 'debian' ||
				terminal.type === 'wsl-distro' ||
				(valueLower && valueLower.startsWith('wsl-'));

			if (shellValues.has(valueLower) || isWslDistro) {
				groups[0].items.push(terminal);
			} else if (aiCliValues.has(valueLower)) {
				groups[1].items.push(terminal);
			} else if (valueLower.startsWith('docker-')) {
				groups[2].items.push(terminal);
			} else {
				groups[3].items.push(terminal);
			}
		});

		return groups.filter((group) => group.items.length > 0);
	}, [availableTerminals]);

	const activeViewName = useMemo(() => {
		if (terminalView) return 'terminal';
		if (activeBottomView === 'favorites') return 'favoritos';
		return 'recientes';
	}, [terminalView, activeBottomView]);

	const handleThemeSelect = (themeName) => {
		if (setLocalLinuxTerminalTheme) {
			setLocalLinuxTerminalTheme(themeName);
			localStorage.setItem('localLinuxTerminalTheme', themeName);
		}
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

	// Permitir que otros componentes abran el selector de temas de interfaz
	useEffect(() => {
		const handleOpenUiThemePicker = (e) => {
			try {
				const originEvent = e?.detail?.originEvent;
				if (originEvent && uiThemePickerRef.current?.toggle) {
					uiThemePickerRef.current.toggle(originEvent);
				} else if (uiThemePickerRef.current?.toggle) {
					uiThemePickerRef.current.toggle(e);
				}
			} catch (err) {
				console.warn('[ConnectionHistory] Error manejando open-ui-theme-picker:', err);
			}
		};

		window.addEventListener('open-ui-theme-picker', handleOpenUiThemePicker);
		return () => {
			window.removeEventListener('open-ui-theme-picker', handleOpenUiThemePicker);
		};
	}, []);

	// Cargar passwords desde localStorage
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

	// Detectar terminales disponibles para el selector
	useEffect(() => {
		if (!terminalView) return;

		const detectTerminals = async () => {
			setIsDetectingTerminals(true);
			try {
				const platform = window.electron?.platform || 'unknown';
				const shells = [];
				let aiClientsCfg = {};
				try {
					aiClientsCfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
				} catch {
					aiClientsCfg = {};
				}

				if (platform === 'win32') {
					shells.push({ label: 'PowerShell', value: 'powershell', icon: <FaWindows style={{ color: '#0078D4' }} /> });
					if (aiClientsCfg.geminicli === true) {
						shells.push({ label: 'Gemini CLI', value: 'geminicli', icon: <SiGooglegemini style={{ color: '#8E75B2' }} /> });
					}
					if (aiClientsCfg.claude === true) {
						shells.push({ label: 'Claude Code', value: 'claude', icon: <SiAnthropic style={{ color: '#D97706' }} /> });
					}
					if (aiClientsCfg.opencode === true) {
						shells.push({ label: 'OpenCode', value: 'opencode', icon: <AIClientBrandIcon tabType="opencode" size={18} /> });
					}
					if (aiClientsCfg.codexcli === true) {
						shells.push({ label: 'Codex CLI', value: 'codexcli', icon: <SiOpenai style={{ color: '#10A37F' }} /> });
					}
					if (aiClientsCfg.antigravitycli === true) {
						shells.push({ label: 'Antigravity CLI', value: 'antigravitycli', icon: <SiGooglegemini style={{ color: '#4285F4' }} /> });
					}
					if (aiClientsCfg.hermescli === true) {
						shells.push({ label: 'Hermes Agent', value: 'hermescli', icon: <AIClientBrandIcon tabType="hermescli" size={14} /> });
					}

					// WSL
					if (window.electron && window.electron.ipcRenderer) {
						const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
						if (Array.isArray(distributions)) {
							distributions.forEach(d => {
								let icon = <FaLinux style={{ color: '#8ae234' }} />;
								if (d.category === 'ubuntu' || (d.label || '').toLowerCase().includes('ubuntu')) {
									icon = <FaUbuntu style={{ color: '#E95420' }} />;
								} else if (d.category === 'debian' || (d.label || '').toLowerCase().includes('debian')) {
									icon = <SiDebian style={{ color: '#D70A53' }} />;
								} else if ((d.label || '').toLowerCase().includes('kali')) {
									icon = <FaLinux style={{ color: '#2196F3' }} />;
								}
								shells.push({
									label: d.label || d.name,
									value: d.name,
									type: d.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro',
									distroInfo: d,
									icon
								});
							});
						}
					}

					// Cygwin solo si está activado en Apps
					if (aiClientsCfg.cygwin === true) {
						try {
							const result = await window.electronAPI.invoke('cygwin:detect');
							if (result && result.available) {
								shells.push({ label: 'Cygwin', value: 'cygwin', icon: <FaLinux style={{ color: '#FCC624' }} /> });
							}
						} catch (e) { /* ignore */ }
					}
				} else {
					shells.push({
						label: platform === 'darwin' ? 'macOS Terminal' : 'Linux Terminal',
						value: 'powershell',
						icon: <FaLinux style={{ color: '#FCC624' }} />
					});
					if (aiClientsCfg.claude === true) {
						shells.push({ label: 'Claude Code', value: 'claude', icon: <SiAnthropic style={{ color: '#D97706' }} /> });
					}
					if (aiClientsCfg.opencode === true) {
						shells.push({ label: 'OpenCode', value: 'opencode', icon: <AIClientBrandIcon tabType="opencode" size={18} /> });
					}
					if (aiClientsCfg.geminicli === true) {
						shells.push({ label: 'Gemini CLI', value: 'geminicli', icon: <SiGooglegemini style={{ color: '#8E75B2' }} /> });
					}
					if (aiClientsCfg.codexcli === true) {
						shells.push({ label: 'Codex CLI', value: 'codexcli', icon: <SiOpenai style={{ color: '#10A37F' }} /> });
					}
					if (aiClientsCfg.antigravitycli === true) {
						shells.push({ label: 'Antigravity CLI', value: 'antigravitycli', icon: <SiGooglegemini style={{ color: '#4285F4' }} /> });
					}
					if (aiClientsCfg.hermescli === true) {
						shells.push({ label: 'Hermes Agent', value: 'hermescli', icon: <AIClientBrandIcon tabType="hermescli" size={14} /> });
					}
				}

				if (Array.isArray(dockerContainers)) {
					dockerContainers.forEach(container => {
						shells.push({
							label: container.name,
							value: `docker-${container.name}`,
							type: 'docker',
							distroInfo: container,
							icon: <SiDocker style={{ color: '#2496ED' }} />
						});
					});
				}

				setAvailableTerminals(shells);
			} catch (err) {
				console.error('Error detecting terminals:', err);
			} finally {
				setIsDetectingTerminals(false);
			}
		};

		detectTerminals();
		window.addEventListener('ai-clients-config-changed', detectTerminals);
		window.addEventListener('storage', detectTerminals);
		return () => {
			window.removeEventListener('ai-clients-config-changed', detectTerminals);
			window.removeEventListener('storage', detectTerminals);
		};
	}, [terminalView, dockerContainers]);

	// Detectar contenedores Docker
	useEffect(() => {
		let mounted = true;
		const timer = setTimeout(() => {
			const detectDocker = async () => {
				try {
					if (window.electron && window.electronAPI && mounted) {
						const result = await window.electronAPI.invoke('docker:list');
						if (mounted && result && result.success && Array.isArray(result.containers)) {
							setDockerContainers(result.containers);
						} else if (mounted) {
							setDockerContainers([]);
						}
					}
				} catch {
					if (mounted) setDockerContainers([]);
				}
			};
			detectDocker();
		}, 700);
		return () => {
			mounted = false;
			clearTimeout(timer);
		};
	}, []);

	const [typeFilter, setTypeFilter] = useState(() => {
		const saved = localStorage.getItem('nodeterm_fav_type');
		if (saved === 'explorer') return 'sftp';
		return saved || 'all';
	});

	const loadConnectionHistory = useCallback(() => {
		try {
			const favs = getFavorites();
			const recentById = new Map(recentConnections.map(r => [r.id, r]));
			const syncedFavs = favs.map(fav => {
				const recent = recentById.get(fav.id);
				if (recent && recent.lastConnected) {
					return { ...fav, lastConnected: recent.lastConnected, isFavorite: true };
				}
				return { ...fav, isFavorite: true };
			});
			syncedFavs.sort((a, b) => {
				const timeA = a.lastConnected ? new Date(a.lastConnected).getTime() : 0;
				const timeB = b.lastConnected ? new Date(b.lastConnected).getTime() : 0;
				return timeB - timeA;
			});
			setFavoriteConnections(syncedFavs);
		} catch (e) {
			console.error('Error cargando favoritos:', e);
		}
	}, [recentConnections]);

	useEffect(() => {
		loadConnectionHistory();
		const off = onUpdate(loadConnectionHistory);
		return () => off && off();
	}, [loadConnectionHistory]);

	useEffect(() => {
		loadConnectionHistory();
	}, [recentConnections, loadConnectionHistory]);

	// Hook modular de grupos y filtros
	const favoriteGroupsMgr = useFavoriteGroupsManager({
		recentConnections,
		favoriteConnections,
		loadConnectionHistory,
		activeIds,
		typeFilter,
		setTypeFilter
	});

	// Hook modular de búsqueda y teclado
	const searchMgr = useConnectionSearch({
		sidebarNodes,
		passwordNodes,
		filteredRecentsForDisplay: favoriteGroupsMgr.filteredRecentsForDisplay,
		recentConnections,
		filteredFavorites: favoriteGroupsMgr.filteredFavorites,
		favoriteConnections,
		onConnectToHistory,
		minSearchChars: MIN_SEARCH_CHARS
	});

	// Renderizador de controles de ventana Legacy para compatibilidad
	const renderLegacyControls = () => {
		if (terminalFrameStyle === 'macos') {
			return (
				<div className="traffic-lights">
					<div className="traffic-dot red" onClick={() => onTogglePanelVisibility?.('search', false)} title="Cerrar" />
					<div className="traffic-dot yellow" onClick={() => onToggleMinimizePanel?.('search')} title="Minimizar" />
					<div className="traffic-dot green" onClick={() => onToggleMaximizePanel?.('search')} title="Maximizar" />
				</div>
			);
		}
		if (terminalFrameStyle === 'gnome') {
			return (
				<div className="gnome-controls" style={{ display: 'flex', gap: '4px' }}>
					<div className="gnome-dot minimize" title="Minimizar" onClick={() => onToggleMinimizePanel?.('search')}><i className="pi pi-minus" style={{ fontSize: '8px' }} /></div>
					<div className="gnome-dot maximize" title="Maximizar" onClick={() => onToggleMaximizePanel?.('search')}><i className="pi pi-stop" style={{ fontSize: '8px' }} /></div>
					<div className="gnome-dot close" title="Cerrar" onClick={() => onTogglePanelVisibility?.('search', false)}><i className="pi pi-times" /></div>
				</div>
			);
		}
		if (terminalFrameStyle === 'kde') {
			return (
				<div className="kde-controls" style={{ display: 'flex', gap: '2px' }}>
					<div className="kde-dot minimize" title="Minimizar" onClick={() => onToggleMinimizePanel?.('search')}><div className="custom-icon icon-min" /></div>
					<div className="kde-dot maximize" title="Maximizar" onClick={() => onToggleMaximizePanel?.('search')}><div className="custom-icon icon-max" /></div>
					<div className="kde-dot close" title="Cerrar" onClick={() => onTogglePanelVisibility?.('search', false)}><div className="custom-icon icon-close" /></div>
				</div>
			);
		}
		if (terminalFrameStyle === 'windows') {
			return (
				<div className="windows-controls" style={{ display: 'flex' }}>
					<div className="win-dot minimize" title="Minimizar" onClick={() => onToggleMinimizePanel?.('search')}><div className="custom-icon icon-min" /></div>
					<div className="win-dot maximize" title="Maximizar" onClick={() => onToggleMaximizePanel?.('search')}><div className="custom-icon icon-max" /></div>
					<div className="win-dot close" title="Cerrar" onClick={() => onTogglePanelVisibility?.('search', false)}><div className="custom-icon icon-close" /></div>
				</div>
			);
		}
		if (terminalFrameStyle === 'matcha') {
			return (
				<div className="matcha-controls" style={{ display: 'flex', gap: '4px' }}>
					<div className="matcha-dot minimize" onClick={() => onToggleMinimizePanel?.('search')} title="Minimizar"><i className="pi pi-minus" style={{ fontSize: '9px' }} /></div>
					<div className="matcha-dot maximize" onClick={() => onToggleMaximizePanel?.('search')} title="Maximizar"><i className="pi pi-stop" style={{ fontSize: '9px' }} /></div>
					<div className="matcha-dot close" onClick={() => onTogglePanelVisibility?.('search', false)} title="Cerrar"><i className="pi pi-times" /></div>
				</div>
			);
		}
		if (terminalFrameStyle === 'futuristic') {
			return (
				<div className="futuristic-controls" style={{ display: 'flex', gap: '6px' }}>
					<div className="cyber-dot minimize" title="Minimizar" onClick={() => onToggleMinimizePanel?.('search')}>MIN</div>
					<div className="cyber-dot maximize" title="Maximizar" onClick={() => onToggleMaximizePanel?.('search')}>MAX</div>
					<div className="cyber-dot close" title="Cerrar" onClick={() => onTogglePanelVisibility?.('search', false)}>EXE</div>
				</div>
			);
		}
		if (terminalFrameStyle === 'modern') {
			return (
				<div className="modern-controls" style={{ display: 'flex', gap: '5px' }}>
					<div className="glass-dot minimize" title="Minimizar" onClick={() => onToggleMinimizePanel?.('search')}><i className="pi pi-minus" style={{ fontSize: '9px' }} /></div>
					<div className="glass-dot maximize" title="Maximizar" onClick={() => onToggleMaximizePanel?.('search')}><i className="pi pi-stop" style={{ fontSize: '9px' }} /></div>
					<div className="glass-dot close" title="Cerrar" onClick={() => onTogglePanelVisibility?.('search', false)}><i className="pi pi-times" /></div>
				</div>
			);
		}
		if (terminalFrameStyle === 'cyberpunk-pro') {
			return (
				<div className="cyberpunk-pro-controls" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
					<span className="cyber-pro-tag">SYS</span>
					<div className="cyber-pro-btn minimize" title="Minimizar" onClick={() => onToggleMinimizePanel?.('search')}>_</div>
					<div className="cyber-pro-btn maximize" title="Maximizar" onClick={() => onToggleMaximizePanel?.('search')}>⬡</div>
					<div className="cyber-pro-btn close" title="Cerrar" onClick={() => onTogglePanelVisibility?.('search', false)}><i className="pi pi-times" /></div>
				</div>
			);
		}
		return (
			<div className="retro-controls" style={{ display: 'flex', gap: '6px' }}>
				<div className="retro-switch minimize" title="MIN" onClick={() => onToggleMinimizePanel?.('search')} />
				<div className="retro-switch maximize" title="MAX" onClick={() => onToggleMaximizePanel?.('search')} />
				<div className="retro-switch on" title="OFF" onClick={() => onTogglePanelVisibility?.('search', false)} />
			</div>
		);
	};

	// Contenido común del buscador
	const renderSearchPanel = () => (
		<HomeSearchPanel
			searchTerm={searchMgr.searchTerm}
			setSearchTerm={searchMgr.setSearchTerm}
			handleSearchKeyDown={searchMgr.handleSearchKeyDown}
			isSearching={searchMgr.isSearching}
			activeIndex={searchMgr.activeIndex}
			setActiveIndex={searchMgr.setActiveIndex}
			onTogglePanelVisibility={onTogglePanelVisibility}
			onToggleMinimizePanel={onToggleMinimizePanel}
			onToggleTerminalVisibility={onToggleTerminalVisibility}
			panelsLayout={panelsLayout}
			onBringToFront={onBringToFront}
			onTerminalToggle={onTerminalToggle}
			searchPanelMode={searchMgr.searchPanelMode}
			setSearchPanelMode={searchMgr.setSearchPanelMode}
			searchProtocolFilter={searchMgr.searchProtocolFilter}
			setSearchProtocolFilter={searchMgr.setSearchProtocolFilter}
			showProtocolFilterBar={searchMgr.showProtocolFilterBar}
			setShowProtocolFilterBar={searchMgr.setShowProtocolFilterBar}
			filteredSearchResults={searchMgr.filteredSearchResults}
			filteredRecentsForDisplay={favoriteGroupsMgr.filteredRecentsForDisplay}
			filteredFavorites={favoriteGroupsMgr.filteredFavorites}
			protocolMatches={searchMgr.protocolMatches}
			handleDirectConnect={searchMgr.handleDirectConnect}
			handleSelectSearchResult={searchMgr.handleSelectSearchResult}
			handleToggleFavoriteWithGroup={favoriteGroupsMgr.handleToggleFavoriteWithGroup}
			onConnectToHistory={onConnectToHistory}
			onEdit={onEdit}
			sidebarNodes={sidebarNodes}
			terminalTheme={terminalTheme}
			minSearchChars={MIN_SEARCH_CHARS}
		/>
	);

	// Contenido común del terminal split
	const renderTerminalSplit = () => (
		<HomeTerminalSplitPanel
			splitOpen={splitOpen}
			setSplitOpen={setSplitOpen}
			splitView={splitView}
			setSplitView={setSplitView}
			splitWidth={splitWidth}
			handleSplitDragStart={handleSplitDragStart}
			splitBodyRef={splitBodyRef}
			filteredFavorites={favoriteGroupsMgr.filteredFavorites}
			filteredRecentsForDisplay={favoriteGroupsMgr.filteredRecentsForDisplay}
			activeFavFilters={favoriteGroupsMgr.activeFavFilters}
			activeRecentFilters={favoriteGroupsMgr.activeRecentFilters}
			getActiveFilterCount={favoriteGroupsMgr.getActiveFilterCount}
			getFilterLabel={favoriteGroupsMgr.getFilterLabel}
			getFilterColor={favoriteGroupsMgr.getFilterColor}
			getFilterIcon={favoriteGroupsMgr.getFilterIcon}
			handleRemoveFilter={favoriteGroupsMgr.handleRemoveFilter}
			setFilterContext={favoriteGroupsMgr.setFilterContext}
			setFilterPanelOpen={favoriteGroupsMgr.setFilterPanelOpen}
			clearRecents={clearRecents}
			isFavorite={isFavorite}
			activeIds={activeIds}
			onConnectToHistory={onConnectToHistory}
			onEdit={onEdit}
			handleToggleFavoriteWithGroup={favoriteGroupsMgr.handleToggleFavoriteWithGroup}
			statusBarVisible={statusBarVisible}
			terminalTheme={terminalTheme}
		>
			{children}
		</HomeTerminalSplitPanel>
	);

	// Contenido común de la tabla de recientes
	const renderRecentsPanel = () => (
		<HomeRecentsPanel
			activeRecentFilters={favoriteGroupsMgr.activeRecentFilters}
			getActiveFilterCount={favoriteGroupsMgr.getActiveFilterCount}
			getFilterLabel={favoriteGroupsMgr.getFilterLabel}
			getFilterColor={favoriteGroupsMgr.getFilterColor}
			getFilterIcon={favoriteGroupsMgr.getFilterIcon}
			handleRemoveFilter={favoriteGroupsMgr.handleRemoveFilter}
			filteredRecentsForDisplay={favoriteGroupsMgr.filteredRecentsForDisplay}
			activeIds={activeIds}
			onConnectToHistory={onConnectToHistory}
			onEdit={onEdit}
			handleToggleFavoriteWithGroup={favoriteGroupsMgr.handleToggleFavoriteWithGroup}
		/>
	);

	// Contenido común de la tabla de favoritos
	const renderFavoritesPanel = () => (
		<HomeFavoritesPanel
			activeFavFilters={favoriteGroupsMgr.activeFavFilters}
			getActiveFilterCount={favoriteGroupsMgr.getActiveFilterCount}
			getFilterLabel={favoriteGroupsMgr.getFilterLabel}
			getFilterColor={favoriteGroupsMgr.getFilterColor}
			getFilterIcon={favoriteGroupsMgr.getFilterIcon}
			handleRemoveFilter={favoriteGroupsMgr.handleRemoveFilter}
			filteredFavorites={favoriteGroupsMgr.filteredFavorites}
			activeIds={activeIds}
			onConnectToHistory={onConnectToHistory}
			onEdit={onEdit}
			handleToggleFavoriteWithGroup={favoriteGroupsMgr.handleToggleFavoriteWithGroup}
		/>
	);

	return (
		<div className={`connection-history-root${terminalView ? ' is-terminal-view' : ''}${flushRightQuickBar ? ' has-flush-right-quick-bar' : ''}${localTerminalMaximized ? ' is-terminal-maximized' : ''}`} style={{ background: 'transparent' }}>
			{/* Dynamic CSS Styles */}
			<ConnectionHistoryStyles themeColors={themeColors} terminalTheme={terminalTheme} />

			{/* ========================================================= */}
			{/* RENDER PRINCIPAL: CANVAS MODULAR O LAYOUT LEGACY          */}
			{/* ========================================================= */}
			{panelsLayout ? (
				<div
					ref={canvasRef}
					className="home-panels-canvas"
					style={{
						position: 'relative',
						width: '100%',
						height: '100%',
						minHeight: 0,
						flex: 1,
						overflow: 'hidden'
					}}
				>
					{/* Overlay de guías magnéticas inteligentes en tiempo real */}
					<HomePanelGuideOverlay guides={snapGuides} />

					{/* 1. Panel Buscador y Conexión */}
					{panelsLayout.search && panelsLayout.search.visible !== false && (
						<HomePanelWrapper
							id="search"
							title="~/home · terminal"
							path={`home · ${activeViewName || 'terminal'}`}
							panelState={panelsLayout.search}
							allPanels={panelsLayout}
							containerBounds={effectiveContainerBounds}
							onLayoutChange={onLayoutChange}
							onBringToFront={onBringToFront}
							onClose={() => (onClosePanel ? onClosePanel('search') : onTogglePanelVisibility?.('search', false))}
							onToggleMaximize={() => (onToggleMaximizePanel ? onToggleMaximizePanel('search') : null)}
							onToggleMinimize={() => (onToggleMinimizePanel ? onToggleMinimizePanel('search') : null)}
							terminalFrameStyle={terminalFrameStyle}
							snapToGrid={snapToGrid}
							smartSnap={smartSnap}
							onDragging={onPanelDragging}
							onDragEnd={onPanelDragEnd}
							onResizing={onPanelResizing}
							onResizeEnd={onPanelResizeEnd}
							minWidth={220}
							minHeight={90}
							className="top-terminal-frame search-terminal-frame"
							frameBackground={adjustOpacity(themeColors.sidebarBackground || terminalTheme.background || '#0d1117', terminalOpacity)}
						>
							{renderSearchPanel()}
						</HomePanelWrapper>
					)}

					{/* 2. Panel Terminal Integrado */}
					{panelsLayout.terminal && (
						<HomePanelWrapper
							id="terminal"
							title={terminalTitle}
							path={terminalTitle ? terminalTitle.replace(/^\/?(local\s*·\s*)?/, 'local · ') : 'local'}
							panelState={panelsLayout.terminal}
							allPanels={panelsLayout}
							containerBounds={effectiveContainerBounds}
							onLayoutChange={onLayoutChange}
							onBringToFront={onBringToFront}
							closable={false}
							onClose={() => (onToggleMinimizePanel ? onToggleMinimizePanel('terminal') : null)}
							onToggleMaximize={() => {
								if (onToggleMaximizePanel) onToggleMaximizePanel('terminal');
								else if (onToggleLocalTerminalMaximized) onToggleLocalTerminalMaximized();
							}}
							onToggleMinimize={() => (onToggleMinimizePanel ? onToggleMinimizePanel('terminal') : null)}
							terminalFrameStyle={terminalFrameStyle}
							snapToGrid={snapToGrid}
							smartSnap={smartSnap}
							onDragging={onPanelDragging}
							onDragEnd={onPanelDragEnd}
							onResizing={onPanelResizing}
							onResizeEnd={onPanelResizeEnd}
							minWidth={380}
							minHeight={200}
							className="recents-terminal-frame"
							frameBackground={localTerminalBg}
							headerRight={
								<>
									<i
										className="pi pi-clock"
										style={{
											fontSize: '0.86rem',
											color: splitOpen && splitView === 'recent' ? (terminalTheme.green || '#3fb950') : (terminalTheme.foreground || '#c9d1d9'),
											opacity: splitOpen && splitView === 'recent' ? 1 : 0.7,
											cursor: 'pointer',
											padding: '4px',
											borderRadius: '4px',
											transition: 'all 0.15s ease'
										}}
										onClick={(e) => {
											e.stopPropagation();
											handleToggleSplit('recent');
										}}
										title="Recientes — split con terminal"
									/>
									<div aria-hidden="true" style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.20)', margin: '0 4px' }} />
									<i
										className="pi pi-sliders-h"
										style={{
											fontSize: '0.9rem',
											color: terminalTheme.foreground || '#c9d1d9',
											opacity: 0.65,
											cursor: 'pointer',
											padding: '4px',
											transition: 'all 0.2s'
										}}
										title="Opciones de Home y Presets"
										onClick={(e) => {
											e.stopPropagation();
											if (onOpenHomeOptions) onOpenHomeOptions(e);
										}}
									/>
									<i
										className="pi pi-th-large"
										style={{
											fontSize: '0.9rem',
											color: terminalTheme.foreground || '#c9d1d9',
											opacity: isDetectingTerminals ? 0.3 : 0.65,
											cursor: isDetectingTerminals ? 'wait' : 'pointer',
											padding: '4px',
											transition: 'all 0.2s'
										}}
										title="Cambiar terminal integrado"
										onClick={(e) => {
											e.stopPropagation();
											terminalSwitcherOverlayRef.current?.toggle(e);
										}}
									/>
									<i
										className={`pi ${panelsLayout.terminal?.isMaximized ? 'pi-window-minimize' : 'pi-window-maximize'}`}
										style={{
											fontSize: '0.9rem',
											color: terminalTheme.foreground || '#c9d1d9',
											opacity: 0.65,
											cursor: 'pointer',
											padding: '4px',
											transition: 'all 0.2s'
										}}
										title={panelsLayout.terminal?.isMaximized ? "Restaurar Terminal" : "Ampliar Terminal al espacio libre"}
										onClick={(e) => {
											e.stopPropagation();
											if (onToggleMaximizePanel) onToggleMaximizePanel('terminal');
											else if (onToggleLocalTerminalMaximized) onToggleLocalTerminalMaximized();
										}}
									/>
								</>
							}
						>
							{renderTerminalSplit()}
						</HomePanelWrapper>
					)}

					{/* 3. Panel Conexiones Recientes */}
					{panelsLayout.recents && panelsLayout.recents.visible && (
						<HomePanelWrapper
							id="recents"
							title="~/recent"
							path={`recent · ${favoriteGroupsMgr.filteredRecentsForDisplay.length} conexiones`}
							panelState={panelsLayout.recents}
							allPanels={panelsLayout}
							containerBounds={effectiveContainerBounds}
							onLayoutChange={onLayoutChange}
							onBringToFront={onBringToFront}
							onClose={() => (onClosePanel ? onClosePanel('recents') : onTogglePanelVisibility?.('recents', false))}
							onToggleMaximize={() => (onToggleMaximizePanel ? onToggleMaximizePanel('recents') : null)}
							onToggleMinimize={() => (onToggleMinimizePanel ? onToggleMinimizePanel('recents') : null)}
							terminalFrameStyle={terminalFrameStyle}
							snapToGrid={snapToGrid}
							smartSnap={smartSnap}
							onDragging={onPanelDragging}
							onDragEnd={onPanelDragEnd}
							onResizing={onPanelResizing}
							onResizeEnd={onPanelResizeEnd}
							minWidth={250}
							minHeight={140}
							className="recents-terminal-frame"
							frameBackground={adjustOpacity(themeColors.sidebarBackground || terminalTheme.background || '#0d1117', terminalOpacity)}
							headerRight={
								<>
									<button
										className="recents-header-filter-btn"
										onClick={(e) => {
											e.stopPropagation();
											if (onTogglePanelVisibility) {
												onTogglePanelVisibility('terminal', true);
												onBringToFront?.('terminal');
											} else if (onTerminalToggle) {
												const terminalType = localStorage.getItem('nodeterm_default_local_terminal') || 'powershell';
												onTerminalToggle(true, terminalType, false);
											}
										}}
										title="Abrir o enfocar terminal"
									>
										<i className="pi pi-desktop" />
									</button>
									<button
										className={`recents-header-filter-btn ${favoriteGroupsMgr.getActiveFilterCount(favoriteGroupsMgr.activeRecentFilters) > 0 ? 'active' : ''}`}
										onClick={() => { favoriteGroupsMgr.setFilterContext('recents'); favoriteGroupsMgr.setFilterPanelOpen(true); }}
										title="Filtrar recientes"
									>
										<i className={`pi ${favoriteGroupsMgr.getActiveFilterCount(favoriteGroupsMgr.activeRecentFilters) > 0 ? 'pi-filter-fill' : 'pi-filter'}`} />
										{favoriteGroupsMgr.getActiveFilterCount(favoriteGroupsMgr.activeRecentFilters) > 0 && (
											<span style={{ fontSize: '0.7rem', marginLeft: 3 }}>{favoriteGroupsMgr.getActiveFilterCount(favoriteGroupsMgr.activeRecentFilters)}</span>
										)}
									</button>
								</>
							}
						>
							{renderRecentsPanel()}
						</HomePanelWrapper>
					)}

					{/* 4. Panel Favoritos */}
					{panelsLayout.favorites && panelsLayout.favorites.visible && (
						<HomePanelWrapper
							id="favorites"
							title="~/favorites"
							path={`favorites · ${favoriteGroupsMgr.filteredFavorites.length} conexiones`}
							panelState={panelsLayout.favorites}
							allPanels={panelsLayout}
							containerBounds={effectiveContainerBounds}
							onLayoutChange={onLayoutChange}
							onBringToFront={onBringToFront}
							onClose={() => (onClosePanel ? onClosePanel('favorites') : onTogglePanelVisibility?.('favorites', false))}
							onToggleMaximize={() => (onToggleMaximizePanel ? onToggleMaximizePanel('favorites') : null)}
							onToggleMinimize={() => (onToggleMinimizePanel ? onToggleMinimizePanel('favorites') : null)}
							terminalFrameStyle={terminalFrameStyle}
							snapToGrid={snapToGrid}
							smartSnap={smartSnap}
							onDragging={onPanelDragging}
							onDragEnd={onPanelDragEnd}
							onResizing={onPanelResizing}
							onResizeEnd={onPanelResizeEnd}
							minWidth={250}
							minHeight={140}
							className="recents-terminal-frame favorites-terminal-frame"
							frameBackground={adjustOpacity(themeColors.sidebarBackground || terminalTheme.background || '#0d1117', terminalOpacity)}
							headerRight={
								<>
									<button
										className="recents-header-filter-btn"
										onClick={(e) => {
											e.stopPropagation();
											if (onTogglePanelVisibility) {
												onTogglePanelVisibility('terminal', true);
												onBringToFront?.('terminal');
											} else if (onTerminalToggle) {
												const terminalType = localStorage.getItem('nodeterm_default_local_terminal') || 'powershell';
												onTerminalToggle(true, terminalType, false);
											}
										}}
										title="Abrir o enfocar terminal"
									>
										<i className="pi pi-desktop" />
									</button>
									<button
										className={`recents-header-filter-btn ${favoriteGroupsMgr.getActiveFilterCount(favoriteGroupsMgr.activeFavFilters) > 0 ? 'active' : ''}`}
										onClick={() => { favoriteGroupsMgr.setFilterContext('favorites'); favoriteGroupsMgr.setFilterPanelOpen(true); }}
										title="Filtrar favoritos"
									>
										<i className={`pi ${favoriteGroupsMgr.getActiveFilterCount(favoriteGroupsMgr.activeFavFilters) > 0 ? 'pi-filter-fill' : 'pi-filter'}`} />
										{favoriteGroupsMgr.getActiveFilterCount(favoriteGroupsMgr.activeFavFilters) > 0 && (
											<span style={{ fontSize: '0.7rem', marginLeft: 3 }}>{favoriteGroupsMgr.getActiveFilterCount(favoriteGroupsMgr.activeFavFilters)}</span>
										)}
									</button>
								</>
							}
						>
							{renderFavoritesPanel()}
						</HomePanelWrapper>
					)}

					{/* 5. Panel Accesos Rápidos */}
					{panelsLayout.quickbar && panelsLayout.quickbar.visible && rightQuickBar && (
						<HomePanelWrapper
							id="quickbar"
							title="Accesos Rápidos"
							path="quickbar"
							panelState={panelsLayout.quickbar}
							allPanels={panelsLayout}
							containerBounds={effectiveContainerBounds}
							onLayoutChange={onLayoutChange}
							onBringToFront={onBringToFront}
							onClose={() => (onClosePanel ? onClosePanel('quickbar') : onTogglePanelVisibility?.('quickbar', false))}
							onToggleMaximize={() => (onToggleMaximizePanel ? onToggleMaximizePanel('quickbar') : null)}
							onToggleMinimize={() => (onToggleMinimizePanel ? onToggleMinimizePanel('quickbar') : null)}
							terminalFrameStyle={terminalFrameStyle}
							snapToGrid={snapToGrid}
							smartSnap={smartSnap}
							onDragging={onPanelDragging}
							onDragEnd={onPanelDragEnd}
							onResizing={onPanelResizing}
							onResizeEnd={onPanelResizeEnd}
							minWidth={200}
							minHeight={250}
							className="recents-terminal-frame"
							frameBackground={adjustOpacity(themeColors.sidebarBackground || terminalTheme.background || '#0d1117', terminalOpacity)}
						>
							<div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
								{rightQuickBar}
							</div>
						</HomePanelWrapper>
					)}

					{/* 6. Panel Monitor de Sistema (Telemetría Cyberpunk) */}
					{panelsLayout.sysmon && panelsLayout.sysmon.visible && (
						<HomePanelWrapper
							id="sysmon"
							title="~/sysmon · telemetry"
							path="sysmon · hardware"
							titleIcon={<i className="pi pi-bolt" style={{ color: themeColors.primaryColor || '#00f2ff', fontSize: '0.8rem' }} />}
							panelState={panelsLayout.sysmon}
							allPanels={panelsLayout}
							containerBounds={effectiveContainerBounds}
							onLayoutChange={onLayoutChange}
							onBringToFront={onBringToFront}
							onClose={() => (onClosePanel ? onClosePanel('sysmon') : onTogglePanelVisibility?.('sysmon', false))}
							onToggleMaximize={() => (onToggleMaximizePanel ? onToggleMaximizePanel('sysmon') : null)}
							onToggleMinimize={() => (onToggleMinimizePanel ? onToggleMinimizePanel('sysmon') : null)}
							terminalFrameStyle={terminalFrameStyle}
							snapToGrid={snapToGrid}
							smartSnap={smartSnap}
							onDragging={onPanelDragging}
							onDragEnd={onPanelDragEnd}
							onResizing={onPanelResizing}
							onResizeEnd={onPanelResizeEnd}
							minWidth={280}
							minHeight={200}
							className="recents-terminal-frame sysmon-terminal-frame"
							frameBackground={adjustOpacity(themeColors.sidebarBackground || terminalTheme.background || '#0d1117', terminalOpacity)}
						>
							<HomeTelemetryPanel
								themeColors={themeColors}
								terminalTheme={terminalTheme}
							/>
						</HomePanelWrapper>
					)}
				</div>
			) : (
				<>
					{/* Layout Legacy para retrocompatibilidad */}
					<div className="hero-splash-header" style={{ paddingBottom: '8px' }}>
						{homeCardVisible && (
							<div className={`top-terminal-frame ${terminalFrameStyle}`}>
								<div className="top-terminal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
									{terminalFrameStyle === 'macos' ? renderLegacyControls() : <div style={{ width: '12px' }} />}
									<div className="header-path">
										<span style={{ fontWeight: 'bold' }}>
											<span className="path-tilde">~</span>/home
										</span>
										<span style={{ opacity: 0.5 }}>·</span>
										<span style={{ opacity: 0.9 }}>{activeViewName}</span>
									</div>
									{terminalFrameStyle !== 'macos' ? (
										<div className="traffic-lights" style={{ marginLeft: 'auto' }}>
											{renderLegacyControls()}
										</div>
									) : (
										<div style={{ width: '12px' }} />
									)}
								</div>
								{renderSearchPanel()}
							</div>
						)}
					</div>

					{/* FAVORITES TABLE */}
					{!terminalView && activeBottomView === 'favorites' && (
						<HomeIntegratedTerminalShell
							enabled={flushRightQuickBar && !!rightQuickBar}
							visible
							rightQuickBar={rightQuickBar}
							frameClassName={`recents-terminal-frame favorites-terminal-frame ${terminalFrameStyle}`}
							terminalFrameStyle={terminalFrameStyle}
						>
							<div className="recents-terminal-header">
								<div className="traffic-lights">
									<div className="traffic-dot red" onClick={() => setActiveBottomView('all')} title="Cerrar favoritos" />
									<div className="traffic-dot yellow" />
									<div className="traffic-dot green" />
								</div>
								<div className="header-path">
									<span className="path-tilde">~</span>/favorites &nbsp;·&nbsp; {favoriteGroupsMgr.filteredFavorites.length} connections
								</div>
							</div>
							{renderFavoritesPanel()}
						</HomeIntegratedTerminalShell>
					)}

					{/* RECIENTES TABLE */}
					{!terminalView && (activeBottomView === 'all' || activeBottomView === 'recent') && (
						<HomeIntegratedTerminalShell
							enabled={flushRightQuickBar && !!rightQuickBar}
							visible
							rightQuickBar={rightQuickBar}
							frameClassName={`recents-terminal-frame ${terminalFrameStyle}`}
							terminalFrameStyle={terminalFrameStyle}
						>
							<div className="recents-terminal-header">
								<div className="traffic-lights">
									<div className="traffic-dot red" onClick={() => setActiveBottomView('all')} title="Cerrar recientes" />
									<div className="traffic-dot yellow" />
									<div className="traffic-dot green" />
								</div>
								<div className="header-path">
									<span className="path-tilde">~</span>/recent &nbsp;·&nbsp; {favoriteGroupsMgr.filteredRecentsForDisplay.length} connections
								</div>
							</div>
							{renderRecentsPanel()}
						</HomeIntegratedTerminalShell>
					)}

					{/* EMBEDDED TERMINAL */}
					<HomeIntegratedTerminalShell
						enabled={flushRightQuickBar && !!rightQuickBar}
						visible={terminalView}
						rightQuickBar={rightQuickBar}
						frameClassName={`recents-terminal-frame ${terminalFrameStyle}`}
						frameBackground={localTerminalBg}
						terminalFrameStyle={terminalFrameStyle}
					>
						<div className="recents-terminal-header" onDoubleClick={onToggleLocalTerminalMaximized} style={{ cursor: 'pointer' }}>
							<div className="traffic-lights">
								<div className="traffic-dot red" onClick={() => { if (onToggleMinimizePanel) onToggleMinimizePanel('terminal'); }} title="Minimizar Terminal" />
								<div className="traffic-dot yellow" />
								<div className="traffic-dot green" onClick={onToggleLocalTerminalMaximized} title={localTerminalMaximized ? "Restaurar tamaño" : "Maximizar Terminal"} />
							</div>
							<div className="header-path">
								<span className="path-tilde">~</span>{terminalTitle}
							</div>
						</div>
						{renderTerminalSplit()}
					</HomeIntegratedTerminalShell>
				</>
			)}

			{/* Dialogs and Modals */}
			<ConnectionHistoryDialogs
				filterPanelOpen={favoriteGroupsMgr.filterPanelOpen}
				setFilterPanelOpen={favoriteGroupsMgr.setFilterPanelOpen}
				filterContext={favoriteGroupsMgr.filterContext}
				activeFavFilters={favoriteGroupsMgr.activeFavFilters}
				activeRecentFilters={favoriteGroupsMgr.activeRecentFilters}
				handleApplyFilters={favoriteGroupsMgr.handleApplyFilters}
				recentConnections={recentConnections}
				favoriteConnections={favoriteConnections}
				favoriteGroups={favoriteGroupsMgr.favoriteGroups}
				countByType={favoriteGroupsMgr.countByType}
				themeColors={themeColors}
				handleDeleteGroup={favoriteGroupsMgr.handleDeleteGroup}
				showFilterConfig={favoriteGroupsMgr.showFilterConfig}
				setShowFilterConfig={favoriteGroupsMgr.setShowFilterConfig}
				allFilters={favoriteGroupsMgr.allFilters}
				setAllFilters={favoriteGroupsMgr.setAllFilters}
				showCreateGroupDialog={favoriteGroupsMgr.showCreateGroupDialog}
				setShowCreateGroupDialog={favoriteGroupsMgr.setShowCreateGroupDialog}
				newGroupName={favoriteGroupsMgr.newGroupName}
				setNewGroupName={favoriteGroupsMgr.setNewGroupName}
				newGroupColor={favoriteGroupsMgr.newGroupColor}
				setNewGroupColor={favoriteGroupsMgr.setNewGroupColor}
				handleCreateGroup={favoriteGroupsMgr.handleCreateGroup}
				editingGroup={favoriteGroupsMgr.editingGroup}
				setEditingGroup={favoriteGroupsMgr.setEditingGroup}
				showGroupSelector={favoriteGroupsMgr.showGroupSelector}
				setShowGroupSelector={favoriteGroupsMgr.setShowGroupSelector}
				connectionToFavorite={favoriteGroupsMgr.connectionToFavorite}
				setConnectionToFavorite={favoriteGroupsMgr.setConnectionToFavorite}
				customGroups={favoriteGroupsMgr.customGroups}
				selectedGroupsForFav={favoriteGroupsMgr.selectedGroupsForFav}
				toggleGroupForFavorite={favoriteGroupsMgr.toggleGroupForFavorite}
				handleRemoveFavoriteFromDialog={favoriteGroupsMgr.handleRemoveFavoriteFromDialog}
				handleConfirmAddFavorite={favoriteGroupsMgr.handleConfirmAddFavorite}
				toggleFavorite={favoriteGroupsMgr.handleToggleFavoriteWithGroup}
				loadConnectionHistory={loadConnectionHistory}
				isFavorite={isFavorite}
				showEditFavGroups={favoriteGroupsMgr.showEditFavGroups}
				setShowEditFavGroups={favoriteGroupsMgr.setShowEditFavGroups}
				editingFavorite={favoriteGroupsMgr.editingFavorite}
				editSelectedGroups={favoriteGroupsMgr.editSelectedGroups}
				toggleEditGroup={favoriteGroupsMgr.toggleEditGroup}
				handleSaveEditGroups={favoriteGroupsMgr.handleSaveEditGroups}
			/>

			{/* Theme and Terminal Switcher Overlays */}
			<ConnectionHistoryOverlays
				themePickerRef={themePickerRef}
				uiThemePickerRef={uiThemePickerRef}
				terminalSwitcherOverlayRef={terminalSwitcherOverlayRef}
				themes={themes}
				localLinuxTerminalTheme={localLinuxTerminalTheme}
				handleThemeSelect={handleThemeSelect}
				onOpenSettings={onOpenSettings}
				UI_CATEGORIES={UI_CATEGORIES}
				uiThemes={uiThemes}
				currentUITheme={currentUITheme}
				handleUIThemeSelect={handleUIThemeSelect}
				availableTerminals={availableTerminals}
				isDetectingTerminals={isDetectingTerminals}
				groupedTerminalOptions={groupedTerminalOptions}
				collapsedLauncherSections={collapsedLauncherSections}
				setCollapsedLauncherSections={setCollapsedLauncherSections}
				onSwitchTerminal={onSwitchTerminal}
			/>
		</div>
	);
};

export default ConnectionHistory;
