import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getVersionInfo } from '../version-info';
import SyncManager from '../utils/SyncManager';
import SecureStorage from '../services/SecureStorage';
import { aiService } from '../services/AIService';
import { FaUbuntu, FaLinux, FaRedhat, FaCentos, FaFedora } from 'react-icons/fa';
import { SiDebian, SiDocker } from 'react-icons/si';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { getActionBarIcon, actionBarIconColors } from '../themes/action-bar-icon-themes';

const NodeTermStatus = ({ 
	sshConnectionsCount = 0, 
	foldersCount = 0, 
	rdpConnectionsCount = 0, 
	themeColors = {}, 
	horizontal = false, 
	compact = false,
	onCreateSSHConnection,
	onCreateFolder,
	onOpenFileExplorer,
	onOpenSettings,
	onToggleTerminalVisibility,
	onToggleAIChat,
	onToggleStatusBar,
	showAIChat = false,
	statusBarVisible = true
}) => {
	const { t, locale } = useTranslation('common');
	const [syncState, setSyncState] = useState({ configured: false, enabled: false, lastSync: null, connectivity: 'unknown' });
	const [guacdState, setGuacdState] = useState({ isRunning: false, method: 'unknown', host: '127.0.0.1', port: 4822 });
	const [vaultState, setVaultState] = useState({ configured: false, unlocked: false });
	const [ollamaState, setOllamaState] = useState({ isRunning: false, url: 'http://localhost:11434', isRemote: false });
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
	// Estado para el tema de iconos de la barra de acciones
	const [actionBarIconTheme, setActionBarIconTheme] = useState(() => {
		try {
			return localStorage.getItem('actionBarIconTheme') || 'original';
		} catch {
			return 'original';
		}
	});
	const [aiClientsState, setAiClientsState] = useState({
		nodeterm: false,
		anythingllm: { enabled: false, running: false },
		openwebui: { enabled: false, running: false }
	});
	const [wslDistributions, setWSLDistributions] = useState([]);
	const [cygwinAvailable, setCygwinAvailable] = useState(false);
	const [dockerContainers, setDockerContainers] = useState([]);
	const [availableTerminals, setAvailableTerminals] = useState([]);
	const [dockerMenuOpen, setDockerMenuOpen] = useState(false);
	const [dockerMenuPosition, setDockerMenuPosition] = useState({ top: 0, left: 0 });
	const [ubuntuMenuOpen, setUbuntuMenuOpen] = useState(false);
	const [ubuntuMenuPosition, setUbuntuMenuPosition] = useState({ top: 0, left: 0 });
	const [ubuntuDistributions, setUbuntuDistributions] = useState([]);
	const syncManagerRef = useRef(null);
	const secureStorageRef = useRef(null);
	const [scaleFactor, setScaleFactor] = useState(1); // Factor de escala para reducir iconos
	const barContainerRef = useRef(null);
	const dockerButtonRef = useRef(null);
	const ubuntuButtonRef = useRef(null);

	useEffect(() => {
		// Inicializar managers
		if (!syncManagerRef.current) syncManagerRef.current = new SyncManager();
		if (!secureStorageRef.current) secureStorageRef.current = new SecureStorage();

		// Estado Nextcloud - Función para actualizar el estado
		const updateNextcloudState = async () => {
			try {
				if (syncManagerRef.current) {
					const st = syncManagerRef.current.getSyncStatus();
					setSyncState(prev => ({ ...prev, configured: st.configured, enabled: st.enabled, lastSync: st.lastSync, connectivity: st.configured ? 'checking' : 'unknown' }));
					if (st.configured) {
						try {
							const res = await syncManagerRef.current.nextcloudService.testConnection();
							setSyncState(prev => ({ ...prev, connectivity: res?.success ? 'ok' : 'error' }));
						} catch (_) {
							setSyncState(prev => ({ ...prev, connectivity: 'error' }));
						}
					}
				}
			} catch {}
		};
		
		// Actualizar estado inicial
		updateNextcloudState();
		
		// Escuchar eventos de cambio en la configuración de Nextcloud (solo cuando cambia, no periódicamente)
		const handleSyncConfigChange = () => {
			updateNextcloudState();
		};
		const handleSyncStorageChange = (e) => {
			// Actualizar cuando cambie algo relacionado con sync en localStorage
			if (e.key && (e.key.includes('nextcloud') || e.key.includes('sync'))) {
				updateNextcloudState();
			}
		};
		window.addEventListener('sync-config-changed', handleSyncConfigChange);
		window.addEventListener('storage', handleSyncStorageChange);

		// Estado Vault
		try {
			const hasKey = secureStorageRef.current.hasSavedMasterKey();
			setVaultState({ configured: hasKey, unlocked: false });
			if (hasKey) {
				secureStorageRef.current.getMasterKey().then(key => {
					setVaultState({ configured: true, unlocked: !!key });
				}).catch(() => {
					setVaultState({ configured: true, unlocked: false });
				});
			}
		} catch {}

		// Estado Guacd (IPC)
		// 🚀 OPTIMIZACIÓN: Retrasar la primera llamada para no bloquear el arranque
		// Esperar un poco para que la ventana esté lista y Guacamole pueda inicializarse
		let intervalId = null;
		const fetchGuacd = async () => {
			try {
				if (window?.electron?.ipcRenderer) {
					const st = await window.electron.ipcRenderer.invoke('guacamole:get-status');
					if (st && st.guacd) setGuacdState(st.guacd);
				}
			} catch {}
		};
		// Retrasar la primera llamada 2 segundos para dar tiempo a que la ventana esté lista
		setTimeout(() => {
			fetchGuacd();
		}, 2000);
		intervalId = setInterval(fetchGuacd, 10000); // Reducido de 5000ms a 10000ms para ahorrar CPU/RAM

		// Estado Ollama
		const fetchOllama = async () => {
			try {
				const ollamaUrl = aiService.getOllamaUrl();
				const isRemote = !!aiService.remoteOllamaUrl;
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 3000);
				
				const response = await fetch(`${ollamaUrl}/api/tags`, { 
					method: 'GET',
					signal: controller.signal
				});
				clearTimeout(timeoutId);
				
				if (response.ok) {
					setOllamaState({ isRunning: true, url: ollamaUrl, isRemote });
				} else {
					setOllamaState({ isRunning: false, url: ollamaUrl, isRemote });
				}
			} catch (error) {
				const ollamaUrl = aiService.getOllamaUrl();
				const isRemote = !!aiService.remoteOllamaUrl;
				setOllamaState({ isRunning: false, url: ollamaUrl, isRemote });
			}
		};
		fetchOllama();
		const ollamaIntervalId = setInterval(fetchOllama, 10000); // Reducido de 5000ms a 10000ms para ahorrar CPU/RAM

		// Verificar estado de servicios Docker de IA
		const checkAIDockerServices = async () => {
			try {
				if (window?.electron?.ipcRenderer) {
					// Obtener configuración actual desde localStorage
					const saved = localStorage.getItem('ai_clients_enabled');
					let config = { anythingllm: false, openwebui: false };
					if (saved) {
						try {
							config = JSON.parse(saved);
						} catch (e) {}
					}

					// Verificar AnythingLLM
					if (config.anythingllm) {
						try {
							const anythingllmResult = await window.electron.ipcRenderer.invoke('anythingllm:get-status');
							const isRunning = anythingllmResult?.success && anythingllmResult?.status?.isRunning || false;
							console.log('[NodeTermStatus] AnythingLLM estado:', { enabled: true, running: isRunning, result: anythingllmResult });
							setAiClientsState(prev => ({
								...prev,
								anythingllm: {
									enabled: true,
									running: isRunning
								}
							}));
						} catch (e) {
							console.warn('[NodeTermStatus] Error verificando AnythingLLM:', e);
							setAiClientsState(prev => ({
								...prev,
								anythingllm: { enabled: true, running: false }
							}));
						}
					} else {
						setAiClientsState(prev => ({
							...prev,
							anythingllm: { enabled: false, running: false }
						}));
					}

					// Verificar OpenWebUI
					if (config.openwebui) {
						try {
							const openwebuiResult = await window.electron.ipcRenderer.invoke('openwebui:get-status');
							setAiClientsState(prev => ({
								...prev,
								openwebui: {
									...prev.openwebui,
									enabled: true,
									running: openwebuiResult?.success && openwebuiResult?.status?.isRunning || false
								}
							}));
						} catch (e) {
							setAiClientsState(prev => ({
								...prev,
								openwebui: { ...prev.openwebui, enabled: true, running: false }
							}));
						}
					} else {
						setAiClientsState(prev => ({
							...prev,
							openwebui: { enabled: false, running: false }
						}));
					}
				}
			} catch (error) {
				console.warn('[NodeTermStatus] Error verificando servicios Docker de IA:', error);
			}
		};

		// Cargar configuración de clientes de IA
		const loadAIClientsConfig = () => {
			try {
				const saved = localStorage.getItem('ai_clients_enabled');
				if (saved) {
					const parsed = JSON.parse(saved);
					setAiClientsState({
						nodeterm: parsed.nodeterm || false,
						anythingllm: { enabled: parsed.anythingllm || false, running: false },
						openwebui: { enabled: parsed.openwebui || false, running: false }
					});
					// Si hay clientes habilitados, verificar su estado inmediatamente
					if (parsed.anythingllm || parsed.openwebui) {
						setTimeout(checkAIDockerServices, 500);
					}
				}
			} catch (error) {
				console.warn('[NodeTermStatus] Error cargando configuración de clientes de IA:', error);
			}
		};
		loadAIClientsConfig();
		checkAIDockerServices();
		const aiServicesIntervalId = setInterval(checkAIDockerServices, 10000);

		// Escuchar cambios en la configuración de clientes de IA
		const handleAIClientsConfigChange = (e) => {
			if (e.detail?.config) {
				const config = e.detail.config;
				setAiClientsState(prev => ({
					nodeterm: config.nodeterm || false,
					anythingllm: { enabled: config.anythingllm || false, running: prev.anythingllm.running },
					openwebui: { enabled: config.openwebui || false, running: prev.openwebui.running }
				}));
				// Verificar estado de servicios después de actualizar configuración
				setTimeout(checkAIDockerServices, 500);
			} else {
				// Si no hay detail, recargar desde localStorage
				loadAIClientsConfig();
				setTimeout(checkAIDockerServices, 500);
			}
		};
		window.addEventListener('ai-clients-config-changed', handleAIClientsConfigChange);
		const handleStorageChange = (e) => {
			if (e.key === 'ai_clients_enabled') {
				loadAIClientsConfig();
				setTimeout(checkAIDockerServices, 500);
			}
		};
		window.addEventListener('storage', handleStorageChange);

		// Escuchar cambios en la fuente y tamaño de HomeTab
		const handleHomeTabFontChange = () => {
			try {
				const newFont = localStorage.getItem('homeTabFont') || localStorage.getItem('sidebarFont') || '"Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
				const newSize = localStorage.getItem('homeTabFontSize');
				const parsedSize = newSize ? parseInt(newSize, 10) : null;
				setHomeTabFont(newFont);
				setHomeTabFontSize(parsedSize);
			} catch {}
		};
		handleHomeTabFontChange();
		
		// Escuchar cambios en localStorage para la fuente (entre pestañas)
		const handleHomeTabFontStorageChange = (e) => {
			if (e.key === 'homeTabFont' || e.key === 'homeTabFontSize' || e.key === 'sidebarFont') {
				handleHomeTabFontChange();
			}
		};
		window.addEventListener('storage', handleHomeTabFontStorageChange);
		
		// Escuchar eventos personalizados cuando se cambia la fuente desde la configuración
		const handleFontConfigChange = () => {
			handleHomeTabFontChange();
		};
		window.addEventListener('home-tab-font-changed', handleFontConfigChange);
		window.addEventListener('sidebar-font-changed', handleFontConfigChange);
		
		// Escuchar cambios en el tema de iconos de la barra de acciones
		const handleActionBarIconThemeChange = (e) => {
			try {
				const newTheme = e?.detail?.theme || localStorage.getItem('actionBarIconTheme') || 'original';
				setActionBarIconTheme(newTheme);
			} catch {}
		};
		window.addEventListener('action-bar-icon-theme-changed', handleActionBarIconThemeChange);
		
		// Escuchar cambios en localStorage para el tema de iconos
		const handleActionBarIconThemeStorageChange = (e) => {
			if (e.key === 'actionBarIconTheme') {
				handleActionBarIconThemeChange(e);
			}
		};
		window.addEventListener('storage', handleActionBarIconThemeStorageChange);
		
		// Polling periódico para detectar cambios (por si el evento no se dispara)
		const fontCheckInterval = setInterval(() => {
			try {
				const currentFont = localStorage.getItem('homeTabFont') || localStorage.getItem('sidebarFont') || '"Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
				const currentSize = localStorage.getItem('homeTabFontSize');
				const parsedSize = currentSize ? parseInt(currentSize, 10) : null;
				if (currentFont !== homeTabFont || parsedSize !== homeTabFontSize) {
					setHomeTabFont(currentFont);
					setHomeTabFontSize(parsedSize);
				}
				// Verificar también cambios en el tema de iconos
				const currentIconTheme = localStorage.getItem('actionBarIconTheme') || 'original';
				if (currentIconTheme !== actionBarIconTheme) {
					setActionBarIconTheme(currentIconTheme);
				}
			} catch {}
		}, 1000);

		return () => { 
			if (intervalId) clearInterval(intervalId);
			if (ollamaIntervalId) clearInterval(ollamaIntervalId);
			if (aiServicesIntervalId) clearInterval(aiServicesIntervalId);
			if (fontCheckInterval) clearInterval(fontCheckInterval);
			window.removeEventListener('ai-clients-config-changed', handleAIClientsConfigChange);
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('storage', handleHomeTabFontStorageChange);
			window.removeEventListener('home-tab-font-changed', handleFontConfigChange);
			window.removeEventListener('sidebar-font-changed', handleFontConfigChange);
			window.removeEventListener('action-bar-icon-theme-changed', handleActionBarIconThemeChange);
			window.removeEventListener('storage', handleActionBarIconThemeStorageChange);
			window.removeEventListener('sync-config-changed', handleSyncConfigChange);
			window.removeEventListener('storage', handleSyncStorageChange);
		};
	}, []);

	// 🚀 OPTIMIZACIÓN: Detectar distribuciones WSL DIFERIDO
	useEffect(() => {
		if (!horizontal || !compact) return;
		const timer = setTimeout(() => {
			const detectWSLDistributions = async () => {
				try {
					if (window.electron && window.electron.ipcRenderer) {
						const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
						if (Array.isArray(distributions)) {
							setWSLDistributions(distributions);
						} else {
							setWSLDistributions([]);
						}
					} else {
						setWSLDistributions([]);
					}
				} catch (error) {
					setWSLDistributions([]);
				}
			};
			detectWSLDistributions();
		}, 900); // Diferir 900ms
		return () => clearTimeout(timer);
	}, [horizontal, compact]);

	// 🚀 OPTIMIZACIÓN: Detectar disponibilidad de Cygwin DIFERIDO
	useEffect(() => {
		if (!horizontal || !compact) return;
		const timer = setTimeout(() => {
			const detectCygwin = async () => {
				if (window.electron && window.electron.platform === 'win32') {
					try {
						const result = await window.electronAPI.invoke('cygwin:detect');
						if (result && typeof result.available === 'boolean') {
							setCygwinAvailable(result.available);
						} else {
							setCygwinAvailable(false);
						}
					} catch (error) {
						setCygwinAvailable(false);
					}
				} else {
					setCygwinAvailable(false);
				}
			};
			detectCygwin();
		}, 1000); // Diferir 1000ms
		return () => clearTimeout(timer);
	}, [horizontal, compact]);

	// 🚀 OPTIMIZACIÓN: Detectar contenedores Docker DIFERIDO
	useEffect(() => {
		if (!horizontal || !compact) return;
		let mounted = true;
		const timer = setTimeout(() => {
			const detectDocker = async () => {
				try {
					if (window.electron && window.electronAPI && mounted) {
						const result = await window.electronAPI.invoke('docker:list');
						if (mounted && result && result.success && Array.isArray(result.containers)) {
							setDockerContainers(result.containers);
						} else {
							setDockerContainers([]);
						}
					}
				} catch (error) {
					setDockerContainers([]);
				}
			};
			detectDocker();
		}, 1100); // Diferir 1100ms
		return () => { mounted = false; clearTimeout(timer); };
	}, [horizontal, compact]);

	// Cerrar menú Docker al hacer clic fuera
	useEffect(() => {
		if (!dockerMenuOpen) return;
		
		const handleClickOutside = (event) => {
			const target = event.target;
			// Verificar si el clic fue fuera del menú y del botón
			const dockerMenu = target.closest('[data-docker-menu]');
			const dockerButton = target.closest('[data-docker-button]');
			
			if (!dockerMenu && !dockerButton) {
				console.log('[Docker] Clic fuera, cerrando menú');
				setDockerMenuOpen(false);
			}
		};
		
		// Agregar listener después de un pequeño delay para evitar que se cierre inmediatamente
		const timeoutId = setTimeout(() => {
			window.addEventListener('click', handleClickOutside, true);
		}, 100);
		
		return () => {
			clearTimeout(timeoutId);
			window.removeEventListener('click', handleClickOutside, true);
		};
	}, [dockerMenuOpen]);

	// Cerrar menú Ubuntu al hacer clic fuera
	useEffect(() => {
		if (!ubuntuMenuOpen) return;
		
		const handleClickOutside = (event) => {
			const target = event.target;
			// Verificar si el clic fue fuera del menú y del botón
			const ubuntuMenu = target.closest('[data-ubuntu-menu]');
			const ubuntuButton = target.closest('[data-ubuntu-button]');
			
			if (!ubuntuMenu && !ubuntuButton) {
				setUbuntuMenuOpen(false);
			}
		};
		
		// Agregar listener después de un pequeño delay para evitar que se cierre inmediatamente
		const timeoutId = setTimeout(() => {
			window.addEventListener('click', handleClickOutside, true);
		}, 100);
		
		return () => {
			clearTimeout(timeoutId);
			window.removeEventListener('click', handleClickOutside, true);
		};
	}, [ubuntuMenuOpen]);

	// Función para obtener colores según la categoría
	const getColorForCategory = (category) => {
		const colorMap = {
			'ubuntu': '#E95420',
			'debian': '#A81D33',
			'kali': '#557C94',
			'alpine': '#0D597F',
			'opensuse': '#73BA25',
			'fedora': '#294172',
			'centos': '#262577',
			'default': '#8ae234'
		};
		return colorMap[category] || colorMap.default;
	};

	// Función para obtener el icono de distribución según la categoría o label
	const getDistroIcon = (terminal) => {
		const category = terminal.distroInfo?.category || terminal.category || '';
		const label = (terminal.label || '').toLowerCase();
		const value = (terminal.value || '').toLowerCase();
		
		// Convertir el tamaño del icono a píxeles si es rem para cálculos
		let baseIconSizePx = 20;
		const iconSizeStr = compactBar.buttonIconSize;
		if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
			const remValue = parseFloat(iconSizeStr.replace('rem', ''));
			baseIconSizePx = Math.max(remValue * 16, 20);
		} else if (typeof iconSizeStr === 'number') {
			baseIconSizePx = Math.max(iconSizeStr, 20);
		}
		
		// Detectar PowerShell - aumentar tamaño
		if (value === 'powershell') {
			const powershellIconSize = Math.round(baseIconSizePx * 1.3);
			return <i className={terminal.icon} style={{ color: terminal.color, fontSize: `${powershellIconSize}px`, fontWeight: 'bold' }} />;
		}
		
		// Detectar WSL genérico (usar pingüino de Linux) - debe ser exactamente 'wsl' sin distribuciones específicas - aumentar tamaño
		if (value === 'wsl' && !value.includes('ubuntu') && !value.includes('debian') && !value.includes('kali')) {
			const wslIconSize = Math.round(baseIconSizePx * 1.3);
			// Usar el color primario del tema si está disponible, sino el color del terminal
			const wslColor = themeColors?.primaryColor || terminal.color || '#4fc3f7';
			return <FaLinux style={{ color: wslColor, fontSize: `${wslIconSize}px` }} />;
		}
		
		// Detectar Ubuntu (por categoría o por nombre)
		if (category === 'ubuntu' || label.includes('ubuntu') || value.includes('ubuntu')) {
			// Convertir el tamaño del icono a píxeles si es rem
			let iconSizePx = 20;
			const iconSizeStr = compactBar.buttonIconSize;
			if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
				const remValue = parseFloat(iconSizeStr.replace('rem', ''));
				iconSizePx = Math.max(remValue * 16, 20);
			} else if (typeof iconSizeStr === 'number') {
				iconSizePx = Math.max(iconSizeStr, 20);
			}
			// Aumentar tamaño para que sea más visible (1.4x para Ubuntu)
			iconSizePx = Math.round(iconSizePx * 1.4);
			
			// Si es Ubuntu básico (sin versión específica), usar color blanco
			const isBasicUbuntu = !label.includes('24.04') && !label.includes('22.04') && !label.includes('20.04');
			const ubuntuColor = isBasicUbuntu ? '#FFFFFF' : (terminal.color || '#E95420');
			
			return <FaUbuntu style={{ color: ubuntuColor, fontSize: `${iconSizePx}px` }} />;
		}
		
		// Detectar Debian
		if (category === 'debian' || label.includes('debian') || value.includes('debian')) {
			return <SiDebian style={{ color: terminal.color, fontSize: compactBar.buttonIconSize }} />;
		}
		
		// Detectar Kali Linux (usar icono SVG oficial del dragón de Kali Linux)
		if (category === 'kali' || label.includes('kali') || value.includes('kali')) {
			// Convertir el tamaño del icono a píxeles si es rem, o usar un tamaño mínimo
			let iconSizePx = 20; // Tamaño por defecto
			const iconSizeStr = compactBar.buttonIconSize;
			if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
				const remValue = parseFloat(iconSizeStr.replace('rem', ''));
				iconSizePx = Math.max(remValue * 16, 20); // Convertir rem a px (mínimo 20px)
			} else if (typeof iconSizeStr === 'number') {
				iconSizePx = Math.max(iconSizeStr, 20);
			}
			// Aumentar el tamaño para que sea más visible (1.5x para Kali)
			iconSizePx = Math.round(iconSizePx * 1.5);
			
			// Color de Kali Linux: #557C94 (azul grisáceo) - usar el color del SVG original o el del terminal
			const kaliColor = terminal.color || '#78909c';
			return (
				<svg 
					xmlns="http://www.w3.org/2000/svg"
					width={iconSizePx} 
					height={iconSizePx} 
					viewBox="0 0 48 48" 
					style={{ 
						display: 'inline-block', 
						verticalAlign: 'middle',
						flexShrink: 0
					}}
				>
					{/* Dragón oficial de Kali Linux - SVG real */}
					<path fill={kaliColor} d="M46.125,38.868c-0.192-0.815-0.481-1.618-0.919-2.346c-0.871-1.466-2.199-2.585-3.594-3.489 c-1.409-0.901-2.916-1.624-4.458-2.219c-2.953-1.141-2.81-1.103-4.803-1.814c-4.416-1.574-6.868-3.914-7.022-6.452 c-0.074-1.229,1.126-5.234,6.074-4.282c1.175,0.226,2.287,0.543,3.382,1.037c1.009,0.456,3.954,1.884,4.986,3.917v0 c0.078,0.897,0.394,1.244,1.656,1.84c0.949,0.448,1.907,0.935,1.993,2.039c0.005,0.06,0.051,0.109,0.131,0.121 c0.052,0,0.1-0.031,0.121-0.081c0.182-0.439,0.915-0.989,1.461-0.839c0.063,0.016,0.119-0.009,0.148-0.061 c0.03-0.052,0.02-0.116-0.021-0.158l-0.863-0.854c-0.311-0.31-0.651-0.721-0.939-1.249c-0.078-0.142-0.145-0.282-0.204-0.417 c-0.038-0.094-0.076-0.187-0.114-0.281c-0.724-1.895-2.073-3.925-3.465-5.24c-0.756-0.727-1.588-1.367-2.475-1.913 c-0.891-0.538-1.819-1.016-2.833-1.302l-0.074,0.256c0.947,0.327,1.833,0.849,2.662,1.419c0.828,0.579,1.593,1.243,2.273,1.979 c0.971,1.032,1.736,2.23,2.282,3.512l-1.993-2.477l0.055,0.858l-1.633-1.841l0.101,0.862l-1.586-1.279l0.136,0.584 c-0.357-0.236-3.525-1.496-5.106-2.09s-4.705-3.524-3.804-7.232c0,0-1.477-0.574-2.535-0.965c-1.043-0.376-2.09-0.717-3.14-1.046 c-2.1-0.658-4.212-1.258-6.335-1.818c-2.123-0.557-4.26-1.062-6.409-1.508c-2.15-0.441-4.312-0.834-6.5-1.053L2.722,3.319 C4.875,3.65,7,4.152,9.109,4.701c2.108,0.555,4.202,1.166,6.279,1.829c2.076,0.665,4.139,1.37,6.177,2.128 c1.018,0.379,2.033,0.769,3.027,1.188c0.211,0.088,0.426,0.18,0.641,0.272c-1.224-0.241-2.448-0.432-3.673-0.591 c-2.211-0.281-4.424-0.458-6.639-0.558c-2.214-0.1-4.43-0.116-6.642-0.034C6.068,9.021,3.856,9.194,1.674,9.568l0.043,0.304 c2.18-0.224,4.375-0.246,6.563-0.183c2.189,0.067,4.374,0.231,6.547,0.477c2.172,0.246,4.335,0.567,6.469,0.986 c1.316,0.261,2.624,0.564,3.903,0.921c-1.011-0.101-2.017-0.127-3.014-0.115c-1.977,0.03-3.926,0.247-5.848,0.574 c-1.922,0.33-3.818,0.773-5.675,1.346c-1.851,0.579-3.681,1.267-5.361,2.249l0.116,0.208c1.72-0.828,3.568-1.358,5.426-1.779 c1.862-0.414,3.751-0.698,5.644-0.868c1.891-0.168,3.792-0.224,5.663-0.101c1.664,0.11,3.317,0.363,4.83,0.849c0,0,0,0,0,0 c0.065,0.445,0.366,1.346,0.511,1.796c0,0,0,0,0,0c-4.255,1.957-4.794,5.477-4.446,7.365c0.409,2.214,2.011,3.902,3.904,4.995 c1.567,0.891,3.168,1.459,4.726,2.047c1.555,0.583,3.095,1.143,4.467,1.918c1.352,0.747,2.476,1.901,3.391,3.21 c1.837,2.638,2.572,5.964,2.792,9.245l0.365-0.01c0.008-3.323-0.47-6.802-2.252-9.812c-0.588-0.986-1.314-1.921-2.171-2.733 c0.992,0.384,1.961,0.818,2.887,1.333c1.373,0.779,2.667,1.749,3.548,3.051c0.444,0.647,0.755,1.375,0.983,2.133 c0.202,0.767,0.295,1.565,0.329,2.371h0.312C46.337,40.522,46.291,39.69,46.125,38.868z"></path>
				</svg>
			);
		}
		
		// Detectar Alpine (usar FaLinux con estilo personalizado)
		if (category === 'alpine' || label.includes('alpine') || value.includes('alpine')) {
			return <FaLinux style={{ color: terminal.color, fontSize: compactBar.buttonIconSize }} />;
		}
		
		// Detectar openSUSE (usar FaLinux con estilo personalizado)
		if (category === 'opensuse' || label.includes('opensuse') || label.includes('suse') || value.includes('opensuse')) {
			return <FaLinux style={{ color: terminal.color, fontSize: compactBar.buttonIconSize }} />;
		}
		
		// Detectar Fedora
		if (category === 'fedora' || label.includes('fedora') || value.includes('fedora')) {
			return <FaFedora style={{ color: terminal.color, fontSize: compactBar.buttonIconSize }} />;
		}
		
		// Detectar CentOS
		if (category === 'centos' || label.includes('centos') || value.includes('centos')) {
			return <FaCentos style={{ color: terminal.color, fontSize: compactBar.buttonIconSize }} />;
		}
		
		// Detectar RedHat
		if (category === 'redhat' || category === 'rhel' || label.includes('redhat') || label.includes('rhel')) {
			return <FaRedhat style={{ color: terminal.color, fontSize: compactBar.buttonIconSize }} />;
		}
		
		// Detectar Cygwin - aumentar tamaño
		if (value === 'cygwin' || label.includes('cygwin')) {
			const cygwinIconSize = Math.round(baseIconSizePx * 1.3);
			return <i className={terminal.icon} style={{ color: terminal.color, fontSize: `${cygwinIconSize}px`, fontWeight: 'bold' }} />;
		}
		
		// Detectar Docker - aumentar tamaño
		if (value.includes('docker') || label.includes('docker')) {
			const dockerIconSize = Math.round(baseIconSizePx * 1.3);
			return <SiDocker style={{ color: terminal.color, fontSize: `${dockerIconSize}px` }} />;
		}
		
		// Fallback: usar icono genérico de PrimeIcons si no hay match
		return <i className={terminal.icon} style={{ color: terminal.color, fontSize: compactBar.buttonIconSize, fontWeight: 'bold' }} />;
	};

	// Handler para abrir terminales
	const handleOpenTerminal = (terminalType, distroInfo = null) => {
		try {
			window.dispatchEvent(new CustomEvent('create-terminal-tab', {
				detail: { 
					type: terminalType,
					distroInfo: distroInfo
				}
			}));
		} catch (e) { /* noop */ }
	};

	// Generar lista de terminales disponibles
	useEffect(() => {
		if (!horizontal || !compact) return;
		const platform = window.electron?.platform || 'unknown';
		const terminals = [];

		if (platform === 'win32') {
			terminals.push({
				label: 'PowerShell',
				value: 'powershell',
				icon: 'pi pi-microsoft',
				color: '#0078D4',
				action: () => handleOpenTerminal('powershell')
			});
			// Usar el color primario del tema para WSL genérico
			const wslColor = themeColors?.primaryColor || '#4fc3f7';
			terminals.push({
				label: 'WSL',
				value: 'wsl',
				icon: 'pi pi-server',
				color: wslColor,
				action: () => handleOpenTerminal('wsl')
			});
			if (cygwinAvailable) {
				terminals.push({
					label: 'Cygwin',
					value: 'cygwin',
					icon: 'pi pi-code',
					color: '#00FF00',
					action: () => handleOpenTerminal('cygwin')
				});
			}
			
			// Separar distribuciones para ordenarlas correctamente
			// console.log('[NodeTermStatus] Distribuciones WSL detectadas:', wslDistributions.map(d => ({ name: d.name, label: d.label })));
			
			// Recopilar todas las distribuciones Ubuntu (básico y con versión)
			const allUbuntuDistros = wslDistributions.filter(distro => {
				const isUbuntu = distro.name && distro.name.toLowerCase().includes('ubuntu');
				return isUbuntu;
			}).map(distro => ({
				label: distro.label,
				value: `wsl-${distro.name}`,
				icon: distro.icon,
				color: getColorForCategory(distro.category),
				action: () => handleOpenTerminal(`wsl-${distro.name}`, distro),
				distroInfo: distro
			}));
			
			// Guardar distribuciones Ubuntu en estado separado para el menú agrupado
			setUbuntuDistributions(allUbuntuDistros);
			
			const otherDistros = wslDistributions.filter(distro => {
				const isUbuntu = distro.name && distro.name.toLowerCase().includes('ubuntu');
				const isBasicDebian = distro.name && distro.name.toLowerCase().includes('debian');
				return !isUbuntu && !isBasicDebian;
			});
			
			// Agregar el resto de distribuciones (Kali Linux, etc.) - Ubuntu se maneja por separado
			otherDistros.forEach(distro => {
				terminals.push({
					label: distro.label,
					value: `wsl-${distro.name}`,
					icon: distro.icon,
					color: getColorForCategory(distro.category),
					action: () => handleOpenTerminal(`wsl-${distro.name}`, distro),
					distroInfo: distro
				});
			});
		} else if (platform === 'linux' || platform === 'darwin') {
			terminals.push({
				label: 'Terminal',
				value: 'linux-terminal',
				icon: 'pi pi-desktop',
				color: '#4fc3f7',
				action: () => handleOpenTerminal('linux-terminal')
			});
		} else {
			terminals.push({
				label: 'Terminal',
				value: 'powershell',
				icon: 'pi pi-desktop',
				color: '#4fc3f7',
				action: () => handleOpenTerminal('powershell')
			});
		}

		setAvailableTerminals(terminals);
	}, [wslDistributions, cygwinAvailable, horizontal, compact]);

	const getRelativeTime = (date) => {
		try {
			if (!date) return null;
			const d = (date instanceof Date) ? date : new Date(date);
			const now = new Date();
			const diffInMinutes = Math.floor((now - d) / (1000 * 60));
			if (diffInMinutes < 1) return 'hace un momento';
			if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
			const diffInHours = Math.floor(diffInMinutes / 60);
			if (diffInHours < 24) return `hace ${diffInHours} h`;
			const diffInDays = Math.floor(diffInHours / 24);
			if (diffInDays < 7) return `hace ${diffInDays} días`;
			const diffInWeeks = Math.floor(diffInDays / 7);
			return `hace ${diffInWeeks} sem`;
		} catch { return null; }
	};

	// Obtener número de passwords
	let passwordsCount = 0;
	try {
		const stored = parseInt(localStorage.getItem('passwords_count'));
		if (!isNaN(stored) && stored >= 0) {
			passwordsCount = stored;
		} else {
			const plain = localStorage.getItem('passwordManagerNodes');
			if (plain) {
				const parsed = JSON.parse(plain);
				const walk = (list) => list.reduce((acc, n) => acc + (n?.data?.type === 'password' ? 1 : 0) + (Array.isArray(n?.children) ? walk(n.children) : 0), 0);
				passwordsCount = Array.isArray(parsed) ? walk(parsed) : 0;
			}
		}
	} catch {}



	// Componente de estadística
	const StatItem = ({ icon, value, label, color = '#4fc3f7', compact = false }) => (
		<div style={{
			display: 'flex',
			alignItems: 'center',
			gap: compact ? '0.4rem' : '0.5rem',
			padding: compact ? '0.4rem' : '0.5rem',
			borderRadius: compact ? '6px' : '8px',
			background: 'rgba(255,255,255,0.02)',
			border: '1px solid rgba(255,255,255,0.05)',
			transition: 'all 0.2s ease'
		}}>
			<div style={{
				width: compact ? '16px' : '20px',
				height: compact ? '16px' : '20px',
				borderRadius: compact ? '3px' : '4px',
				background: `${color}20`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center'
			}}>
				<i className={icon} style={{ color, fontSize: compact ? '0.5rem' : '0.6rem' }} />
			</div>
			<div style={{ flex: 1 }}>
				<div style={{ 
					color: themeColors.textPrimary || 'var(--text-color)', 
					fontWeight: '700', 
					fontSize: compact ? '0.6rem' : '0.7rem',
					lineHeight: '1.2'
				}}>
					{value}
				</div>
				<div style={{ 
					color: themeColors.textSecondary || 'var(--text-color-secondary)', 
					fontSize: compact ? '0.45rem' : '0.5rem',
					lineHeight: '1.2'
				}}>
					{label}
				</div>
			</div>
		</div>
	);

	// Tamaños para la barra superior compacta (HomeTab) - se ajustan dinámicamente
	// Calcular tamaño de fuente: usar homeTabFontSize si está configurado, sino usar el cálculo basado en scaleFactor
	// Usar useMemo para recalcular cuando cambien homeTabFont, homeTabFontSize o scaleFactor
	const compactBar = React.useMemo(() => {
		const labelFontSizeValue = homeTabFontSize ? `${homeTabFontSize * 0.65}px` : `${0.65 * scaleFactor}rem`;
		return {
			containerPadding: '0.2rem 0.9rem',
			containerGap: `${1.0 * scaleFactor}rem`,
			buttonSize: 34 * scaleFactor,
			buttonRadius: 7 * scaleFactor,
			buttonIconSize: `${0.85 * scaleFactor}rem`,
			labelFontSize: labelFontSizeValue,
			labelLineHeight: '1.05',
			labelFontFamily: homeTabFont || '"Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
			separatorHeight: 48 * scaleFactor,
			serviceSize: 30 * scaleFactor,
			serviceIconSize: `${0.72 * scaleFactor}rem`,
			labelMaxWidth: 52 * scaleFactor
		};
	}, [scaleFactor, homeTabFont, homeTabFontSize]);

	// Efecto para ajustar el tamaño dinámicamente según el espacio disponible
	useEffect(() => {
		if (!horizontal || !compact) return;

		let rafId = null;
		let pendingRaf = false;
		
		const adjustScale = () => {
			// Evitar múltiples llamadas simultáneas
			if (pendingRaf) return;
			pendingRaf = true;
			
			if (rafId) cancelAnimationFrame(rafId);
			
			rafId = requestAnimationFrame(() => {
				pendingRaf = false;
				const container = barContainerRef.current;
				if (!container) return;

				const containerWidth = container.scrollWidth || container.offsetWidth;
				const parentWidth = container.parentElement?.offsetWidth || window.innerWidth;
				const availableWidth = parentWidth * 0.95; // 95% del ancho disponible
				
				setScaleFactor(prev => {
					// Calcular el factor de escala ideal directamente
					let newScale = prev;
					
					if (containerWidth > availableWidth && prev > 0.65) {
						// Calcular reducción más precisa basada en la diferencia
						const overflowRatio = availableWidth / containerWidth;
						newScale = Math.max(0.65, prev * overflowRatio * 0.98);
					} else if (containerWidth < availableWidth * 0.8 && prev < 1) {
						// Calcular aumento más preciso basado en el espacio disponible
						const spaceRatio = availableWidth / containerWidth;
						newScale = Math.min(1, prev * Math.min(spaceRatio * 0.98, 1.05));
					}
					
					// Redondear a 2 decimales para evitar cambios microscópicos
					return Math.round(newScale * 100) / 100;
				});
			});
		};

		// Throttle para ResizeObserver - solo ejecutar cada frame
		let resizeRafId = null;
		const throttledAdjustScale = () => {
			if (resizeRafId) return;
			resizeRafId = requestAnimationFrame(() => {
				resizeRafId = null;
				adjustScale();
			});
		};

		// Ajustar al montar y al redimensionar
		const resizeObserver = new ResizeObserver(throttledAdjustScale);

		if (barContainerRef.current) {
			resizeObserver.observe(barContainerRef.current);
			if (barContainerRef.current.parentElement) {
				resizeObserver.observe(barContainerRef.current.parentElement);
			}
		}

		window.addEventListener('resize', throttledAdjustScale, { passive: true });
		// Ajustar después de que se renderice (con delay mínimo)
		const initialTimeout = setTimeout(adjustScale, 50);

		return () => {
			if (rafId) cancelAnimationFrame(rafId);
			if (resizeRafId) cancelAnimationFrame(resizeRafId);
			clearTimeout(initialTimeout);
			resizeObserver.disconnect();
			window.removeEventListener('resize', throttledAdjustScale);
		};
	}, [horizontal, compact, availableTerminals.length, dockerContainers.length, ubuntuDistributions.length]);

	// Layout horizontal compacto - LAYOUT 3: BARRA SUPERIOR CENTRADA
	if (horizontal && compact) {
		return (
			<div style={{ 
				width: '100%',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				padding: '0.1rem 0.5rem',
				boxSizing: 'border-box'
			}}>
				{/* Estilos globales para animaciones */}
				<style>{`
					@keyframes pulse {
						0%, 100% {
							opacity: 1;
							box-shadow: 0 0 12px rgba(34, 197, 94, 0.8);
						}
						50% {
							opacity: 0.6;
							box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
						}
					}
					@keyframes terminalGlow {
						0%, 100% {
							filter: drop-shadow(0 0 4px currentColor);
						}
						50% {
							filter: drop-shadow(0 0 12px currentColor) drop-shadow(0 0 8px currentColor);
						}
					}
					.terminal-button-hover {
						animation: terminalGlow 1.5s ease-in-out infinite;
					}
					/* Transiciones suaves para todos los elementos del menú que cambian de tamaño */
					[data-compact-menu-container] button,
					[data-compact-menu-container] span,
					[data-compact-menu-container] div[style*="width"],
					[data-compact-menu-container] div[style*="height"],
					[data-compact-menu-container] div[style*="fontSize"],
					[data-compact-menu-container] i,
					[data-compact-menu-container] svg {
						transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1),
						            height 0.2s cubic-bezier(0.4, 0, 0.2, 1),
						            font-size 0.2s cubic-bezier(0.4, 0, 0.2, 1),
						            padding 0.2s cubic-bezier(0.4, 0, 0.2, 1),
						            gap 0.2s cubic-bezier(0.4, 0, 0.2, 1),
						            border-radius 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
					}
				`}</style>

				{/* BARRA SUPERIOR CENTRADA: ACCIONES Y TERMINALES */}
				<div 
					ref={barContainerRef}
					data-compact-menu-container
					style={{ 
						padding: compactBar.containerPadding,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: compactBar.containerGap,
						width: 'fit-content',
						maxWidth: '95%',
						minWidth: 'min-content',
						overflow: 'hidden',
						transition: 'padding 0.2s cubic-bezier(0.4, 0, 0.2, 1), gap 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
						willChange: 'padding, gap'
					}}>
					{/* SECCIÓN 1: ACCIONES */}
					<div style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '0.4rem',
						alignItems: 'center',
						justifyContent: 'center',
						minWidth: 0,
						flexShrink: 0
					}}>
					{/* Botones principales */}
						<div style={{
							display: 'flex',
							alignItems: 'flex-start',
							justifyContent: 'flex-start',
							gap: '0.5rem',
							flexWrap: 'nowrap',
							maxWidth: '100%',
							overflow: 'visible',
							width: 'auto'
						}}>
						{/* Botón Nueva Conexión */}
						<div style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '0.25rem',
							flexShrink: 0
						}}>
							<button
								title="Nueva conexión SSH/RDP/VNC"
								onClick={() => {
									window.dispatchEvent(new CustomEvent('open-new-unified-connection-dialog'));
								}}
								style={{
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									width: `${compactBar.buttonSize}px`,
									height: `${compactBar.buttonSize}px`,
									padding: '0',
									borderRadius: `${compactBar.buttonRadius}px`,
									background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(34, 197, 94, 0.15) 100%)',
									border: '1px solid rgba(34, 197, 94, 0.35)',
									boxShadow: '0 1px 4px rgba(34, 197, 94, 0.2)',
									transition: 'all 0.2s ease',
									position: 'relative'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.35) 0%, rgba(34, 197, 94, 0.25) 100%)';
									e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
									e.currentTarget.style.boxShadow = '0 3px 8px rgba(34, 197, 94, 0.3)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(34, 197, 94, 0.15) 100%)';
									e.currentTarget.style.transform = 'translateY(0) scale(1)';
									e.currentTarget.style.boxShadow = '0 1px 4px rgba(34, 197, 94, 0.2)';
								}}
							>
								{getActionBarIcon(actionBarIconTheme, 'nuevo', (() => {
									let baseIconSizePx = 20;
									const iconSizeStr = compactBar.buttonIconSize;
									if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
										const remValue = parseFloat(iconSizeStr.replace('rem', ''));
										baseIconSizePx = Math.max(remValue * 16, 20);
									} else if (typeof iconSizeStr === 'number') {
										baseIconSizePx = Math.max(iconSizeStr, 20);
									}
									return Math.round(baseIconSizePx * 1.3);
								})(), '#22c55e')}
							</button>
						</div>

						{/* Botón Crear Grupo */}
						<div style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '0.25rem',
							flexShrink: 0
						}}>
							<button
								title="Crear grupo de pestañas"
								onClick={() => {
									window.dispatchEvent(new CustomEvent('open-create-group-dialog'));
								}}
								style={{
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									width: `${compactBar.buttonSize}px`,
									height: `${compactBar.buttonSize}px`,
									padding: '0',
									borderRadius: `${compactBar.buttonRadius}px`,
									background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.25) 0%, rgba(255, 152, 0, 0.15) 100%)',
									border: '1px solid rgba(255, 152, 0, 0.35)',
									boxShadow: '0 1px 4px rgba(255, 152, 0, 0.2)',
									transition: 'all 0.2s ease',
									position: 'relative'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 152, 0, 0.35) 0%, rgba(255, 152, 0, 0.25) 100%)';
									e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
									e.currentTarget.style.boxShadow = '0 3px 8px rgba(255, 152, 0, 0.3)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 152, 0, 0.25) 0%, rgba(255, 152, 0, 0.15) 100%)';
									e.currentTarget.style.transform = 'translateY(0) scale(1)';
									e.currentTarget.style.boxShadow = '0 1px 4px rgba(255, 152, 0, 0.2)';
								}}
							>
								{getActionBarIcon(actionBarIconTheme, 'grupo', (() => {
									let baseIconSizePx = 20;
									const iconSizeStr = compactBar.buttonIconSize;
									if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
										const remValue = parseFloat(iconSizeStr.replace('rem', ''));
										baseIconSizePx = Math.max(remValue * 16, 20);
									} else if (typeof iconSizeStr === 'number') {
										baseIconSizePx = Math.max(iconSizeStr, 20);
									}
									return Math.round(baseIconSizePx * 1.3);
								})(), '#ff9800')}
							</button>
						</div>

						{/* Separador vertical decorativo */}
						<div style={{
							width: '1px',
							height: `${compactBar.separatorHeight}px`,
							background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
							borderRadius: '1px',
							flexShrink: 0,
							margin: '0 0.5rem',
							minWidth: '1px'
						}} />

						{/* Botón Conexiones */}
						{(() => {
							const conexionesColor = '#64C8FF';
							// Usar el mismo tamaño que las terminales (1.3x del tamaño base)
							let baseIconSizePx = 20;
							const iconSizeStr = compactBar.buttonIconSize;
							if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
								const remValue = parseFloat(iconSizeStr.replace('rem', ''));
								baseIconSizePx = Math.max(remValue * 16, 20);
							} else if (typeof iconSizeStr === 'number') {
								baseIconSizePx = Math.max(iconSizeStr, 20);
							}
							const conexionesIconSize = Math.round(baseIconSizePx * 1.3);
							
							return (
								<div style={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									gap: '0.25rem',
									flexShrink: 0
								}}>
									<button
										title="Ver historial de sesiones"
										onClick={() => {
											const expandSidebarEvent = new CustomEvent('expand-sidebar');
											window.dispatchEvent(expandSidebarEvent);
											const switchToConnectionsEvent = new CustomEvent('switch-to-connections');
											window.dispatchEvent(switchToConnectionsEvent);
										}}
										style={{
											cursor: 'pointer',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											width: `${compactBar.buttonSize}px`,
											height: `${compactBar.buttonSize}px`,
											padding: '0',
											borderRadius: `${compactBar.buttonRadius}px`,
											background: 'linear-gradient(135deg, rgba(100, 200, 255, 0.25) 0%, rgba(100, 200, 255, 0.15) 100%)',
											border: '1px solid rgba(100, 200, 255, 0.35)',
											boxShadow: '0 1px 4px rgba(100, 200, 255, 0.2)',
											transition: 'all 0.2s ease',
											position: 'relative'
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100, 200, 255, 0.35) 0%, rgba(100, 200, 255, 0.25) 100%)';
											e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
											e.currentTarget.style.boxShadow = '0 3px 8px rgba(100, 200, 255, 0.3)';
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100, 200, 255, 0.25) 0%, rgba(100, 200, 255, 0.15) 100%)';
											e.currentTarget.style.transform = 'translateY(0) scale(1)';
											e.currentTarget.style.boxShadow = '0 1px 4px rgba(100, 200, 255, 0.2)';
										}}
									>
										{getActionBarIcon(actionBarIconTheme, 'conexiones', conexionesIconSize, conexionesColor)}
									</button>
								</div>
							);
						})()}

						{/* Botón Contraseñas */}
						{(() => {
							const passwordsColor = '#FFC107';
							// Usar el mismo tamaño que las terminales (1.3x del tamaño base)
							let baseIconSizePx = 20;
							const iconSizeStr = compactBar.buttonIconSize;
							if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
								const remValue = parseFloat(iconSizeStr.replace('rem', ''));
								baseIconSizePx = Math.max(remValue * 16, 20);
							} else if (typeof iconSizeStr === 'number') {
								baseIconSizePx = Math.max(iconSizeStr, 20);
							}
							const passwordsIconSize = Math.round(baseIconSizePx * 1.6);
							
							return (
								<div style={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									gap: '0.25rem',
									flexShrink: 0
								}}>
									<button
										title={locale === 'es' ? 'Gestor de secretos' : 'Secrets manager'}
										onClick={() => {
											const expandSidebarEvent = new CustomEvent('expand-sidebar');
											window.dispatchEvent(expandSidebarEvent);
											window.dispatchEvent(new CustomEvent('open-password-manager'));
										}}
										style={{
											cursor: 'pointer',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											width: `${compactBar.buttonSize}px`,
											height: `${compactBar.buttonSize}px`,
											padding: '0',
											borderRadius: `${compactBar.buttonRadius}px`,
											background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 193, 7, 0.15) 100%)',
											border: '1px solid rgba(255, 193, 7, 0.35)',
											boxShadow: '0 1px 4px rgba(255, 193, 7, 0.2)',
											transition: 'all 0.2s ease',
											position: 'relative'
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 0.35) 0%, rgba(255, 193, 7, 0.25) 100%)';
											e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
											e.currentTarget.style.boxShadow = '0 3px 8px rgba(255, 193, 7, 0.3)';
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 193, 7, 0.15) 100%)';
											e.currentTarget.style.transform = 'translateY(0) scale(1)';
											e.currentTarget.style.boxShadow = '0 1px 4px rgba(255, 193, 7, 0.2)';
										}}
									>
										{getActionBarIcon(actionBarIconTheme, 'contraseñas', passwordsIconSize, passwordsColor)}
									</button>
								</div>
							);
						})()}

						{/* Botón Herramientas de Red */}
						{(() => {
							const netToolsColor = '#06b6d4';
							// Usar el mismo tamaño que las terminales (1.3x del tamaño base)
							let baseIconSizePx = 20;
							const iconSizeStr = compactBar.buttonIconSize;
							if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
								const remValue = parseFloat(iconSizeStr.replace('rem', ''));
								baseIconSizePx = Math.max(remValue * 16, 20);
							} else if (typeof iconSizeStr === 'number') {
								baseIconSizePx = Math.max(iconSizeStr, 20);
							}
							const netToolsIconSize = Math.round(baseIconSizePx * 1.3);
							
							return (
								<div style={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									gap: '0.25rem',
									flexShrink: 0
								}}>
									<button
										title="Herramientas de Red y Seguridad"
										onClick={() => {
											window.dispatchEvent(new CustomEvent('open-network-tools-dialog'));
										}}
										style={{
											cursor: 'pointer',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											width: `${compactBar.buttonSize}px`,
											height: `${compactBar.buttonSize}px`,
											padding: '0',
											borderRadius: `${compactBar.buttonRadius}px`,
											background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%)',
											border: '1px solid rgba(6, 182, 212, 0.35)',
											boxShadow: '0 1px 4px rgba(6, 182, 212, 0.2)',
											transition: 'all 0.2s ease',
											position: 'relative'
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.35) 0%, rgba(6, 182, 212, 0.25) 100%)';
											e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
											e.currentTarget.style.boxShadow = '0 3px 8px rgba(6, 182, 212, 0.3)';
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%)';
											e.currentTarget.style.transform = 'translateY(0) scale(1)';
											e.currentTarget.style.boxShadow = '0 1px 4px rgba(6, 182, 212, 0.2)';
										}}
									>
										{getActionBarIcon(actionBarIconTheme, 'nettools', netToolsIconSize, netToolsColor)}
									</button>
								</div>
							);
						})()}
					</div>
				</div>

						{/* Separador vertical decorativo */}
						<div style={{
							width: '1px',
							height: `${compactBar.separatorHeight}px`,
							background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
							borderRadius: '1px',
							flexShrink: 0,
							margin: '0 0.5rem',
							minWidth: '1px'
						}} />

						{/* SECCIÓN 2: TERMINALES */}
						{availableTerminals.length > 0 && (
							<div style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '0.4rem',
								alignItems: 'center',
								justifyContent: 'center',
								minWidth: 0,
								flexShrink: 0
							}}>
				{/* Botones */}
								<div style={{
									display: 'flex',
									alignItems: 'flex-start',
									justifyContent: 'flex-start',
									gap: '0.5rem',
									flexWrap: 'nowrap',
									maxWidth: '100%',
									overflow: 'visible',
									width: 'auto'
								}}>
								{availableTerminals.map((terminal, index) => (
									<div key={index} style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: '0.25rem',
										flexShrink: 0
									}}>
										<button
											title={terminal.label}
											onClick={terminal.action}
											style={{
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: `${compactBar.buttonSize}px`,
												height: `${compactBar.buttonSize}px`,
												padding: '0',
												borderRadius: `${compactBar.buttonRadius}px`,
												background: 'transparent',
												border: 'none',
												boxShadow: 'none',
												transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
												position: 'relative',
												overflow: 'visible'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.classList.add('terminal-button-hover');
												e.currentTarget.style.transform = 'scale(1.1)';
												// Agregar efecto de brillo al icono
												const icon = e.currentTarget.querySelector('i, svg');
												if (icon) {
													icon.style.transition = 'all 0.3s ease';
													icon.style.filter = `drop-shadow(0 0 8px ${terminal.color}) drop-shadow(0 0 4px ${terminal.color})`;
												}
											}}
											onMouseLeave={(e) => {
												e.currentTarget.classList.remove('terminal-button-hover');
												e.currentTarget.style.transform = 'scale(1)';
												// Quitar efecto de brillo del icono
												const icon = e.currentTarget.querySelector('i, svg');
												if (icon) {
													icon.style.filter = 'none';
												}
											}}
										>
											{getDistroIcon(terminal)}
										</button>
									</div>
								))}

								{/* Botón Ubuntu si hay distribuciones */}
								{ubuntuDistributions.length > 0 && (
									<div 
										data-ubuntu-button
										style={{
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'center',
											gap: '0.25rem',
											flexShrink: 0,
											position: 'relative',
											zIndex: ubuntuMenuOpen ? 10000 : 'auto'
										}}
									>
										<button
											ref={ubuntuButtonRef}
											data-ubuntu-button
											type="button"
											title={`Ubuntu (${ubuntuDistributions.length} distribución${ubuntuDistributions.length > 1 ? 'es' : ''})`}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												if (ubuntuDistributions.length === 1) {
													// Si solo hay una distribución, abrirla directamente
													ubuntuDistributions[0].action();
												} else {
													// Si hay múltiples, calcular posición y abrir/cerrar el menú
													if (ubuntuButtonRef.current) {
														const rect = ubuntuButtonRef.current.getBoundingClientRect();
														const newPosition = {
															top: rect.bottom + 8,
															left: rect.left + (rect.width / 2)
														};
														setUbuntuMenuPosition(newPosition);
													}
													setUbuntuMenuOpen(!ubuntuMenuOpen);
												}
											}}
											style={{
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: `${compactBar.buttonSize}px`,
												height: `${compactBar.buttonSize}px`,
												padding: '0',
												borderRadius: `${compactBar.buttonRadius}px`,
												background: 'transparent',
												border: 'none',
												boxShadow: 'none',
												transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
												position: 'relative',
												overflow: 'visible'
											}}
											onMouseEnter={(e) => {
												if (!ubuntuMenuOpen) {
													e.currentTarget.classList.add('terminal-button-hover');
													e.currentTarget.style.transform = 'scale(1.1)';
													const ubuntuIcon = e.currentTarget.querySelector('svg');
													if (ubuntuIcon) {
														ubuntuIcon.style.transition = 'all 0.3s ease';
														ubuntuIcon.style.filter = 'drop-shadow(0 0 8px #E95420) drop-shadow(0 0 4px #E95420)';
													}
												}
											}}
											onMouseLeave={(e) => {
												if (!ubuntuMenuOpen) {
													e.currentTarget.classList.remove('terminal-button-hover');
													e.currentTarget.style.transform = 'scale(1)';
													const ubuntuIcon = e.currentTarget.querySelector('svg');
													if (ubuntuIcon) {
														ubuntuIcon.style.filter = 'none';
													}
												}
											}}
										>
											<div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
												<FaUbuntu style={{
													color: '#FFFFFF',
													fontSize: (() => {
														let baseIconSizePx = 20;
														const iconSizeStr = compactBar.buttonIconSize;
														if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
															const remValue = parseFloat(iconSizeStr.replace('rem', ''));
															baseIconSizePx = Math.max(remValue * 16, 20);
														} else if (typeof iconSizeStr === 'number') {
															baseIconSizePx = Math.max(iconSizeStr, 20);
														}
														return `${Math.round(baseIconSizePx * 1.4)}px`;
													})()
												}} />
												{/* Badge con número de distribuciones */}
												{ubuntuDistributions.length > 1 && (
													<span style={{
														position: 'absolute',
														top: '-4px',
														right: '-6px',
														background: 'linear-gradient(135deg, #E95420 0%, #c4451a 100%)',
														color: '#ffffff',
														fontSize: '0.55rem',
														fontWeight: '700',
														borderRadius: '50%',
														minWidth: '14px',
														height: '14px',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														border: '1.5px solid rgba(255,255,255,0.3)',
														boxShadow: '0 2px 4px rgba(0,0,0,0.3), 0 0 6px rgba(233, 84, 32, 0.4)',
														zIndex: 1
													}}>
														{ubuntuDistributions.length}
													</span>
												)}
											</div>
										</button>
										
										{/* Menú desplegable de distribuciones Ubuntu - Renderizado con Portal */}
										{ubuntuMenuOpen && ubuntuDistributions.length > 1 && typeof document !== 'undefined' && document.body && (() => {
											return createPortal(
												<>
													{/* Overlay para cerrar al hacer clic fuera */}
													<div 
														style={{
															position: 'fixed',
															top: 0,
															left: 0,
															right: 0,
															bottom: 0,
															zIndex: 9998,
															background: 'rgba(0,0,0,0.1)'
														}}
														onClick={() => {
															setUbuntuMenuOpen(false);
														}}
													/>
													<div 
														data-ubuntu-menu
														style={{
															position: 'fixed',
															top: `${ubuntuMenuPosition.top}px`,
															left: `${ubuntuMenuPosition.left}px`,
															transform: 'translateX(-50%)',
															background: `linear-gradient(135deg,
																rgba(16, 20, 28, 1) 0%,
																rgba(16, 20, 28, 0.98) 100%)`,
															backdropFilter: 'blur(12px) saturate(140%)',
															WebkitBackdropFilter: 'blur(12px) saturate(140%)',
															border: `3px solid rgba(233, 84, 32, 0.9)`,
															borderRadius: '12px',
															boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(233, 84, 32, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
															padding: '0.75rem',
															minWidth: '200px',
															zIndex: 10000,
															display: 'flex',
															flexDirection: 'column',
															gap: '0.5rem',
															maxHeight: '400px',
															overflowY: 'auto',
															pointerEvents: 'auto',
															visibility: 'visible',
															opacity: 1
														}}
														onClick={(e) => {
															e.stopPropagation();
															e.preventDefault();
														}}
														onMouseDown={(e) => e.stopPropagation()}
													>
												<div style={{
													padding: '0.5rem',
													fontSize: '0.7rem',
													fontWeight: '600',
													color: themeColors.textPrimary || '#fff',
													borderBottom: `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.1)'}`,
													marginBottom: '0.25rem'
												}}>
													Distribuciones Ubuntu ({ubuntuDistributions.length})
												</div>
												{ubuntuDistributions.map((distro, idx) => (
													<button
														key={idx}
														onClick={() => {
															distro.action();
															setUbuntuMenuOpen(false);
														}}
														style={{
															padding: '0.5rem 0.75rem',
															borderRadius: '6px',
															background: 'rgba(255,255,255,0.05)',
															border: '1px solid transparent',
															color: themeColors.textPrimary || '#fff',
															fontSize: '0.65rem',
															textAlign: 'left',
															cursor: 'pointer',
															transition: 'all 0.2s ease',
															display: 'flex',
															alignItems: 'center',
															gap: '0.5rem'
														}}
														onMouseEnter={(e) => {
															e.currentTarget.style.background = 'rgba(233, 84, 32, 0.2)';
															e.currentTarget.style.border = '1px solid rgba(233, 84, 32, 0.4)';
														}}
														onMouseLeave={(e) => {
															e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
															e.currentTarget.style.border = '1px solid transparent';
														}}
													>
														<FaUbuntu style={{ color: '#E95420', fontSize: '0.9rem', flexShrink: 0 }} />
														<span style={{ 
															flex: 1, 
															overflow: 'hidden', 
															textOverflow: 'ellipsis', 
															whiteSpace: 'nowrap' 
														}}>
															{distro.label || `Ubuntu ${idx + 1}`}
														</span>
													</button>
												))}
												</div>
											</>,
											document.body
											);
										})()}
									</div>
								)}

								{/* Botón Docker si hay contenedores */}
								{dockerContainers.length > 0 && (
									<div 
										data-docker-button
										style={{
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'center',
											gap: '0.25rem',
											flexShrink: 0,
											position: 'relative',
											zIndex: dockerMenuOpen ? 10000 : 'auto'
										}}
									>
										<button
											ref={dockerButtonRef}
											data-docker-button
											type="button"
											title={`Docker (${dockerContainers.length} contenedor${dockerContainers.length > 1 ? 'es' : ''})`}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												console.log('[Docker] Click detectado, contenedores:', dockerContainers.length);
												if (dockerContainers.length === 1) {
													// Si solo hay un contenedor, abrirlo directamente
													console.log('[Docker] Abriendo contenedor único:', dockerContainers[0].name);
													handleOpenTerminal(`docker-${dockerContainers[0].name}`, { dockerContainer: dockerContainers[0] });
												} else {
													// Si hay múltiples, calcular posición y abrir/cerrar el menú
													if (dockerButtonRef.current) {
														const rect = dockerButtonRef.current.getBoundingClientRect();
														const newPosition = {
															top: rect.bottom + 8,
															left: rect.left + (rect.width / 2)
														};
														console.log('[Docker] Posición calculada:', newPosition, 'Rect:', rect);
														setDockerMenuPosition(newPosition);
													}
													const newState = !dockerMenuOpen;
													console.log('[Docker] Toggle menú, estado actual:', dockerMenuOpen, '-> nuevo estado:', newState);
													setDockerMenuOpen(newState);
												}
											}}
											style={{
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: `${compactBar.buttonSize}px`,
												height: `${compactBar.buttonSize}px`,
												padding: '0',
												borderRadius: `${compactBar.buttonRadius}px`,
												background: 'transparent',
												border: 'none',
												boxShadow: 'none',
												transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
												position: 'relative',
												overflow: 'visible'
											}}
											onMouseEnter={(e) => {
												if (!dockerMenuOpen) {
													e.currentTarget.classList.add('terminal-button-hover');
													e.currentTarget.style.transform = 'scale(1.1)';
													// Agregar efecto de brillo al icono de Docker
													const dockerIcon = e.currentTarget.querySelector('svg');
													if (dockerIcon) {
														dockerIcon.style.transition = 'all 0.3s ease';
														dockerIcon.style.filter = 'drop-shadow(0 0 8px #2496ED) drop-shadow(0 0 4px #2496ED)';
													}
												}
											}}
											onMouseLeave={(e) => {
												if (!dockerMenuOpen) {
													e.currentTarget.classList.remove('terminal-button-hover');
													e.currentTarget.style.transform = 'scale(1)';
													// Quitar efecto de brillo del icono de Docker
													const dockerIcon = e.currentTarget.querySelector('svg');
													if (dockerIcon) {
														dockerIcon.style.filter = 'none';
													}
												}
											}}
										>
											<div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
												<SiDocker style={{ 
													color: '#2496ED',
													fontSize: (() => {
														let baseIconSizePx = 20;
														const iconSizeStr = compactBar.buttonIconSize;
														if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
															const remValue = parseFloat(iconSizeStr.replace('rem', ''));
															baseIconSizePx = Math.max(remValue * 16, 20);
														} else if (typeof iconSizeStr === 'number') {
															baseIconSizePx = Math.max(iconSizeStr, 20);
														}
														const dockerIconSize = Math.round(baseIconSizePx * 1.3);
														return `${dockerIconSize}px`;
													})(),
													display: 'block'
												}} />
												{dockerContainers.length > 1 && (
													<span style={{
														position: 'absolute',
														top: '-6px',
														right: '-6px',
														background: '#ff4444',
														color: 'white',
														borderRadius: '50%',
														width: '14px',
														height: '14px',
														fontSize: '0.55rem',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														fontWeight: 'bold',
														border: '1.5px solid rgba(255,255,255,0.8)',
														boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
													}}>
														{dockerContainers.length}
													</span>
												)}
											</div>
										</button>
										
										{/* Menú desplegable de contenedores Docker - Renderizado con Portal */}
										{dockerMenuOpen && dockerContainers.length > 1 && typeof document !== 'undefined' && document.body && (() => {
											console.log('[Docker] Creando portal, posición:', dockerMenuPosition);
											return createPortal(
												<>
													{/* Overlay para cerrar al hacer clic fuera */}
													<div 
														style={{
															position: 'fixed',
															top: 0,
															left: 0,
															right: 0,
															bottom: 0,
															zIndex: 9998,
															background: 'rgba(0,0,0,0.1)'
														}}
														onClick={() => {
															console.log('[Docker] Overlay click, cerrando menú');
															setDockerMenuOpen(false);
														}}
													/>
													<div 
														data-docker-menu
														style={{
															position: 'fixed',
															top: `${dockerMenuPosition.top}px`,
															left: `${dockerMenuPosition.left}px`,
															transform: 'translateX(-50%)',
															background: `linear-gradient(135deg,
																rgba(16, 20, 28, 1) 0%,
																rgba(16, 20, 28, 0.98) 100%)`,
															backdropFilter: 'blur(12px) saturate(140%)',
															WebkitBackdropFilter: 'blur(12px) saturate(140%)',
															border: `3px solid rgba(36, 150, 237, 0.9)`,
															borderRadius: '12px',
															boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(36, 150, 237, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
															padding: '0.75rem',
															minWidth: '200px',
															zIndex: 10000,
															display: 'flex',
															flexDirection: 'column',
															gap: '0.5rem',
															maxHeight: '400px',
															overflowY: 'auto',
															pointerEvents: 'auto',
															visibility: 'visible',
															opacity: 1
														}}
														onClick={(e) => {
															e.stopPropagation();
															e.preventDefault();
														}}
														onMouseDown={(e) => e.stopPropagation()}
													>
												<div style={{
													padding: '0.5rem',
													fontSize: '0.7rem',
													fontWeight: '600',
													color: themeColors.textPrimary || '#fff',
													borderBottom: `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.1)'}`,
													marginBottom: '0.25rem'
												}}>
													Contenedores Docker ({dockerContainers.length})
												</div>
												{dockerContainers.map((container, idx) => (
													<button
														key={idx}
														onClick={() => {
															handleOpenTerminal(`docker-${container.name}`, { dockerContainer: container });
															setDockerMenuOpen(false);
														}}
														style={{
															padding: '0.5rem 0.75rem',
															borderRadius: '6px',
															background: 'rgba(255,255,255,0.05)',
															border: '1px solid transparent',
															color: themeColors.textPrimary || '#fff',
															fontSize: '0.65rem',
															textAlign: 'left',
															cursor: 'pointer',
															transition: 'all 0.2s ease',
															display: 'flex',
															alignItems: 'center',
															gap: '0.5rem'
														}}
														onMouseEnter={(e) => {
															e.currentTarget.style.background = 'rgba(36, 150, 237, 0.2)';
															e.currentTarget.style.border = '1px solid rgba(36, 150, 237, 0.4)';
														}}
														onMouseLeave={(e) => {
															e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
															e.currentTarget.style.border = '1px solid transparent';
														}}
													>
														<SiDocker style={{ color: '#2496ED', fontSize: '0.9rem', flexShrink: 0 }} />
														<span style={{ 
															flex: 1, 
															overflow: 'hidden', 
															textOverflow: 'ellipsis', 
															whiteSpace: 'nowrap' 
														}}>
															{container.name || `Contenedor ${idx + 1}`}
														</span>
													</button>
												))}
												</div>
											</>,
											document.body
											);
										})()}
									</div>
								)}
							</div>
						</div>
					)}

					{/* Separador vertical decorativo */}
					{(() => {
						const hasActiveAIClients = aiClientsState.nodeterm || 
							aiClientsState.anythingllm.enabled ||
							aiClientsState.openwebui.enabled;
						
						if (!hasActiveAIClients) return null;
						
						return (
							<div style={{
								width: '1px',
								height: `${compactBar.separatorHeight}px`,
								background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
								borderRadius: '1px',
								flexShrink: 0,
								margin: '0 0.5rem',
								minWidth: '1px'
							}} />
						);
					})()}

					{/* SECCIÓN 4: CLIENTES DE IA */}
					{(() => {
						const hasActiveAIClients = aiClientsState.nodeterm || 
							aiClientsState.anythingllm.enabled ||
							aiClientsState.openwebui.enabled;
						
						if (!hasActiveAIClients) return null;

						return (
							<div style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '0.4rem',
								alignItems: 'center',
								justifyContent: 'center',
								minWidth: 0,
								flexShrink: 0
							}}>
								{/* Badges de clientes de IA */}
								<div style={{
									display: 'flex',
									alignItems: 'flex-start',
									justifyContent: 'flex-start',
									gap: '0.5rem',
									flexWrap: 'nowrap',
									maxWidth: '100%',
									overflow: 'visible',
									width: 'auto'
								}}>
									{/* NodeTerm AI */}
									{aiClientsState.nodeterm && (
										<div style={{
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'center',
											gap: '0.25rem',
											flexShrink: 0
										}}>
											<div 
												title="NodeTerm AI: Activo"
												onClick={() => {
													const tabId = `ai-chat-${Date.now()}`;
													const newAITab = {
														key: tabId,
														label: 'Chat IA',
														type: 'ai-chat',
														createdAt: Date.now(),
														groupId: null
													};
													window.dispatchEvent(new CustomEvent('create-ai-chat-tab', {
														detail: { tab: newAITab }
													}));
												}}
												style={{
													position: 'relative',
													width: `${compactBar.serviceSize}px`,
													height: `${compactBar.serviceSize}px`,
													borderRadius: '50%',
													background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(139, 92, 246, 0.15) 100%)',
													border: '2px solid rgba(139, 92, 246, 0.50)',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													boxShadow: '0 1px 4px rgba(139, 92, 246, 0.20)',
													cursor: 'pointer',
													transition: 'all 0.2s ease'
												}}
												onMouseEnter={(e) => {
													e.currentTarget.style.transform = 'translateY(-1px) scale(1.1)';
													e.currentTarget.style.boxShadow = '0 3px 8px rgba(139, 92, 246, 0.30)';
												}}
												onMouseLeave={(e) => {
													e.currentTarget.style.transform = 'translateY(0) scale(1)';
													e.currentTarget.style.boxShadow = '0 1px 4px rgba(139, 92, 246, 0.20)';
												}}
											>
												<i className="pi pi-desktop" style={{ color: '#8b5cf6', fontSize: compactBar.serviceIconSize }} />
											</div>
										</div>
									)}

									{/* AnythingLLM */}
									{aiClientsState.anythingllm.enabled && (
										<div style={{
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'center',
											gap: '0.25rem',
											flexShrink: 0
										}}>
											{(() => {
												const isRunning = aiClientsState.anythingllm.running;
												const anythingllmColor = isRunning ? '#22c55e' : '#f59e0b';
												const anythingllmStatus = isRunning ? 'En ejecución' : 'Detenido';
												return (
													<div 
														title={`AnythingLLM: ${anythingllmStatus}`}
														onClick={() => {
															const newTab = {
																key: `anythingllm-${Date.now()}`,
																label: 'AnythingLLM',
																type: 'anything-llm',
																createdAt: Date.now(),
																groupId: null
															};
															window.dispatchEvent(new CustomEvent('create-anythingllm-tab', {
																detail: { tab: newTab }
															}));
														}}
														style={{
															position: 'relative',
															width: `${compactBar.serviceSize}px`,
															height: `${compactBar.serviceSize}px`,
															borderRadius: '50%',
															background: `linear-gradient(135deg, ${anythingllmColor}25 0%, ${anythingllmColor}15 100%)`,
															border: `2px solid ${anythingllmColor}50`,
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'center',
															boxShadow: `0 1px 4px ${anythingllmColor}20`,
															cursor: 'pointer',
															transition: 'all 0.2s ease'
														}}
														onMouseEnter={(e) => {
															e.currentTarget.style.transform = 'translateY(-1px) scale(1.1)';
															e.currentTarget.style.boxShadow = `0 3px 8px ${anythingllmColor}30`;
														}}
														onMouseLeave={(e) => {
															e.currentTarget.style.transform = 'translateY(0) scale(1)';
															e.currentTarget.style.boxShadow = `0 1px 4px ${anythingllmColor}20`;
														}}
													>
														<i className="pi pi-comments" style={{ color: anythingllmColor, fontSize: compactBar.serviceIconSize }} />
													</div>
												);
											})()}
										</div>
									)}

									{/* OpenWebUI */}
									{aiClientsState.openwebui.enabled && (
										<div style={{
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'center',
											gap: '0.25rem',
											flexShrink: 0
										}}>
											{(() => {
												const isRunning = aiClientsState.openwebui.running;
												const openwebuiColor = isRunning ? '#3b82f6' : '#f59e0b';
												const openwebuiStatus = isRunning ? 'En ejecución' : 'Detenido';
												return (
													<div 
														title={`OpenWebUI: ${openwebuiStatus}`}
														onClick={() => {
															const newTab = {
																key: `openwebui-${Date.now()}`,
																label: 'OpenWebUI',
																type: 'openwebui',
																createdAt: Date.now(),
																groupId: null
															};
															window.dispatchEvent(new CustomEvent('create-openwebui-tab', {
																detail: { tab: newTab }
															}));
														}}
														style={{
															position: 'relative',
															width: `${compactBar.serviceSize}px`,
															height: `${compactBar.serviceSize}px`,
															borderRadius: '50%',
															background: `linear-gradient(135deg, ${openwebuiColor}25 0%, ${openwebuiColor}15 100%)`,
															border: `2px solid ${openwebuiColor}50`,
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'center',
															boxShadow: `0 1px 4px ${openwebuiColor}20`,
															cursor: 'pointer',
															transition: 'all 0.2s ease'
														}}
														onMouseEnter={(e) => {
															e.currentTarget.style.transform = 'translateY(-1px) scale(1.1)';
															e.currentTarget.style.boxShadow = `0 3px 8px ${openwebuiColor}30`;
														}}
														onMouseLeave={(e) => {
															e.currentTarget.style.transform = 'translateY(0) scale(1)';
															e.currentTarget.style.boxShadow = `0 1px 4px ${openwebuiColor}20`;
														}}
													>
														<i className="pi pi-globe" style={{ color: openwebuiColor, fontSize: compactBar.serviceIconSize }} />
													</div>
												);
											})()}
										</div>
									)}
								</div>
							</div>
						);
					})()}

					{/* Separador vertical decorativo */}
					<div style={{
						width: '1px',
						height: `${compactBar.separatorHeight}px`,
						background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
						borderRadius: '1px',
						flexShrink: 0,
						margin: '0 0.5rem',
						minWidth: '1px'
					}} />

					{/* SECCIÓN: Configuración, Terminal y Status (compactos y en fila) */}
					<div style={{
						display: 'flex',
						flexDirection: 'row',
						gap: '0.5rem',
						alignItems: 'center',
						justifyContent: 'flex-start',
						minWidth: 0,
						flexShrink: 0
					}}>
						{/* Botón Configuración */}
						{onOpenSettings && (() => {
							// Obtener color del tema o usar un color por defecto
							const configColor = themeColors.primary || themeColors.accent || themeColors.textPrimary || '#4fc3f7';
							// Usar el mismo tamaño que las terminales (1.3x del tamaño base)
							let baseIconSizePx = 20;
							const iconSizeStr = compactBar.buttonIconSize;
							if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
								const remValue = parseFloat(iconSizeStr.replace('rem', ''));
								baseIconSizePx = Math.max(remValue * 16, 20);
							} else if (typeof iconSizeStr === 'number') {
								baseIconSizePx = Math.max(iconSizeStr, 20);
							}
							const configIconSize = Math.round(baseIconSizePx * 1.1);
							
							return (
								<div style={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									gap: '0.25rem',
									flexShrink: 0
								}}>
									<button
										title="Abrir configuración de la aplicación"
										onClick={onOpenSettings}
										style={{
											cursor: 'pointer',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											width: `${compactBar.buttonSize}px`,
											height: `${compactBar.buttonSize}px`,
											padding: '0',
											borderRadius: `${compactBar.buttonRadius}px`,
											background: 'transparent',
											border: 'none',
											boxShadow: 'none',
											transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
											position: 'relative',
											overflow: 'visible'
										}}
										onMouseEnter={(e) => {
											e.currentTarget.classList.add('terminal-button-hover');
											e.currentTarget.style.transform = 'scale(1.1)';
											// Agregar efecto de brillo al icono
											const icon = e.currentTarget.querySelector('i');
											if (icon) {
												icon.style.transition = 'all 0.3s ease';
												icon.style.filter = `drop-shadow(0 0 8px ${configColor}) drop-shadow(0 0 4px ${configColor})`;
											}
										}}
										onMouseLeave={(e) => {
											e.currentTarget.classList.remove('terminal-button-hover');
											e.currentTarget.style.transform = 'scale(1)';
											// Quitar efecto de brillo del icono
											const icon = e.currentTarget.querySelector('i');
											if (icon) {
												icon.style.filter = 'none';
											}
										}}
									>
										{getActionBarIcon(actionBarIconTheme, 'config', configIconSize, configColor)}
									</button>
								</div>
							);
						})()}

						{/* Botón Terminal */}
						{onToggleTerminalVisibility && (() => {
							// Obtener color del tema o usar un color por defecto
							const terminalColor = themeColors.primary || themeColors.accent || themeColors.textPrimary || '#00BCD4';
							// Usar el mismo tamaño que las terminales (1.3x del tamaño base)
							let baseIconSizePx = 20;
							const iconSizeStr = compactBar.buttonIconSize;
							if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
								const remValue = parseFloat(iconSizeStr.replace('rem', ''));
								baseIconSizePx = Math.max(remValue * 16, 20);
							} else if (typeof iconSizeStr === 'number') {
								baseIconSizePx = Math.max(iconSizeStr, 20);
							}
							const terminalIconSize = Math.round(baseIconSizePx * 1.3);
							const terminalIconUrl = 'https://icons.iconarchive.com/icons/alecive/flatwoken/256/Apps-Terminal-Pc-104-icon.png';
							
							return (
								<div style={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									gap: '0.25rem',
									flexShrink: 0
								}}>
									<button
										title="Mostrar/ocultar terminal local"
										onClick={onToggleTerminalVisibility}
										style={{
											cursor: 'pointer',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											width: `${compactBar.buttonSize}px`,
											height: `${compactBar.buttonSize}px`,
											padding: '0',
											borderRadius: `${compactBar.buttonRadius}px`,
											background: 'transparent',
											border: 'none',
											boxShadow: 'none',
											transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
											position: 'relative',
											overflow: 'visible'
										}}
										onMouseEnter={(e) => {
											e.currentTarget.classList.add('terminal-button-hover');
											e.currentTarget.style.transform = 'scale(1.1)';
											// Agregar efecto de brillo al icono
											const icon = e.currentTarget.querySelector('svg, i');
											if (icon) {
												icon.style.transition = 'all 0.3s ease';
												icon.style.filter = `drop-shadow(0 0 8px ${terminalColor}) drop-shadow(0 0 4px ${terminalColor})`;
											}
										}}
										onMouseLeave={(e) => {
											e.currentTarget.classList.remove('terminal-button-hover');
											e.currentTarget.style.transform = 'scale(1)';
											// Quitar efecto de brillo del icono
											const icon = e.currentTarget.querySelector('svg, i');
											if (icon) {
												icon.style.filter = 'none';
											}
										}}
									>
										{getActionBarIcon(actionBarIconTheme, 'terminal', terminalIconSize, terminalColor)}
									</button>
								</div>
							);
						})()}

						{/* Botón Status Bar */}
						{onToggleStatusBar && (() => {
							// Obtener color del tema o usar un color por defecto
							const statusColor = themeColors.primary || themeColors.accent || themeColors.textPrimary || '#4fc3f7';
							// Usar el mismo tamaño que las terminales (1.3x del tamaño base)
							let baseIconSizePx = 20;
							const iconSizeStr = compactBar.buttonIconSize;
							if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
								const remValue = parseFloat(iconSizeStr.replace('rem', ''));
								baseIconSizePx = Math.max(remValue * 16, 20);
							} else if (typeof iconSizeStr === 'number') {
								baseIconSizePx = Math.max(iconSizeStr, 20);
							}
							const statusIconSize = Math.round(baseIconSizePx * 1.6);
							
							return (
								<div style={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									gap: '0.25rem',
									flexShrink: 0
								}}>
									<button
										title={statusBarVisible ? 'Ocultar status bar' : 'Mostrar status bar'}
										onClick={onToggleStatusBar}
										style={{
											cursor: 'pointer',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											width: `${compactBar.buttonSize}px`,
											height: `${compactBar.buttonSize}px`,
											padding: '0',
											borderRadius: `${compactBar.buttonRadius}px`,
											background: 'transparent',
											border: 'none',
											boxShadow: 'none',
											transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
											position: 'relative',
											overflow: 'visible'
										}}
										onMouseEnter={(e) => {
											e.currentTarget.classList.add('terminal-button-hover');
											e.currentTarget.style.transform = 'scale(1.1)';
											// Agregar efecto de brillo al icono
											const icon = e.currentTarget.querySelector('svg, i');
											if (icon) {
												icon.style.transition = 'all 0.3s ease';
												icon.style.filter = `drop-shadow(0 0 8px ${statusColor}) drop-shadow(0 0 4px ${statusColor})`;
											}
										}}
										onMouseLeave={(e) => {
											e.currentTarget.classList.remove('terminal-button-hover');
											e.currentTarget.style.transform = 'scale(1)';
											// Quitar efecto de brillo del icono
											const icon = e.currentTarget.querySelector('svg, i');
											if (icon) {
												icon.style.filter = 'none';
											}
										}}
									>
										{getActionBarIcon(actionBarIconTheme, 'statusbar', statusIconSize, statusColor)}
									</button>
								</div>
							);
						})()}
					</div>

					{/* Separador vertical decorativo */}
					<div style={{
						width: '1px',
						height: `${compactBar.separatorHeight}px`,
						background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
						borderRadius: '1px',
						flexShrink: 0,
						margin: '0 0.5rem'
					}} />

					{/* SECCIÓN 3: SERVICIOS */}
					<div style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '0.4rem',
						alignItems: 'center',
						justifyContent: 'center',
						minWidth: 0,
						flexShrink: 0
					}}>
			{/* Badges de servicios */}
						<div style={{
							display: 'flex',
							alignItems: 'flex-start',
							justifyContent: 'flex-start',
							gap: '0.5rem',
							flexWrap: 'nowrap',
							maxWidth: '100%',
							overflow: 'visible',
							width: 'auto'
						}}>
							{/* Botón Grabaciones y Auditoría */}
							{(() => {
								const auditColor = '#a855f7';
								// Usar un tamaño más pequeño para el icono de Audit (1.0x del tamaño base en lugar de 1.3x)
								let baseIconSizePx = 20;
								const iconSizeStr = compactBar.buttonIconSize;
								if (typeof iconSizeStr === 'string' && iconSizeStr.includes('rem')) {
									const remValue = parseFloat(iconSizeStr.replace('rem', ''));
									baseIconSizePx = Math.max(remValue * 16, 20);
								} else if (typeof iconSizeStr === 'number') {
									baseIconSizePx = Math.max(iconSizeStr, 20);
								}
								const auditIconSize = Math.round(baseIconSizePx * 1.0);
								
								return (
									<div style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: '0.25rem',
										flexShrink: 0
									}}>
										<button
											title="Ver grabaciones y auditoría"
											onClick={async () => {
												try {
													if (window?.electron?.ipcRenderer) {
														const result = await window.electron.ipcRenderer.invoke('recording:list', {});
														if (result && result.success && Array.isArray(result.recordings) && result.recordings.length > 0) {
															const auditTabId = `audit_global_${Date.now()}`;
															window.dispatchEvent(new CustomEvent('create-audit-tab', {
																detail: {
																	tabId: auditTabId,
																	title: 'Auditoría Global',
																	recordings: result.recordings
																}
															}));
														} else {
															// Si no hay grabaciones, mostrar mensaje
															if (window.showToast) {
																window.showToast('info', 'Sin grabaciones', 'No hay grabaciones disponibles para mostrar');
															}
														}
													}
												} catch (e) {
													console.warn('[NodeTermStatus] Error abriendo auditoría global:', e?.message || e);
													if (window.showToast) {
														window.showToast('error', 'Error', 'Error al cargar las grabaciones');
													}
												}
											}}
											style={{
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: `${compactBar.buttonSize}px`,
												height: `${compactBar.buttonSize}px`,
												padding: '0',
												borderRadius: `${compactBar.buttonRadius}px`,
												background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%)',
												border: '1px solid rgba(168, 85, 247, 0.35)',
												boxShadow: '0 1px 4px rgba(168, 85, 247, 0.2)',
												transition: 'all 0.2s ease',
												position: 'relative'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.35) 0%, rgba(168, 85, 247, 0.25) 100%)';
												e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
												e.currentTarget.style.boxShadow = '0 3px 8px rgba(168, 85, 247, 0.3)';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%)';
												e.currentTarget.style.transform = 'translateY(0) scale(1)';
												e.currentTarget.style.boxShadow = '0 1px 4px rgba(168, 85, 247, 0.2)';
											}}
										>
											{getActionBarIcon(actionBarIconTheme, 'audit', auditIconSize, auditColor)}
										</button>
									</div>
								);
							})()}

							{/* Vault */}
							{(() => {
								// Naranja cuando está configurado, gris cuando no está configurado
								const vaultColor = !vaultState.configured ? '#9ca3af' : '#f59e0b';
								const vaultStatus = !vaultState.configured ? 'No configurado' : (vaultState.unlocked ? 'Desbloqueado' : 'Bloqueado');
								return (
									<div style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: '0.25rem',
										flexShrink: 0
									}}>
										<button
											onClick={() => {
												if (onOpenSettings) {
													onOpenSettings();
												} else {
													// Fallback: disparar evento directamente si onOpenSettings no está disponible
													try {
														window.dispatchEvent(new CustomEvent('open-settings-dialog', {
															detail: { tab: 'security' }
														}));
													} catch (e) {
														console.warn('[NodeTermStatus] Error abriendo configuración de Vault:', e);
													}
												}
											}}
											title={`Vault: ${vaultStatus}`}
											style={{
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: `${compactBar.buttonSize}px`,
												height: `${compactBar.buttonSize}px`,
												padding: '0',
												borderRadius: `${compactBar.buttonRadius}px`,
												background: `linear-gradient(135deg, rgba(${parseInt(vaultColor.slice(1,3), 16)}, ${parseInt(vaultColor.slice(3,5), 16)}, ${parseInt(vaultColor.slice(5,7), 16)}, 0.25) 0%, rgba(${parseInt(vaultColor.slice(1,3), 16)}, ${parseInt(vaultColor.slice(3,5), 16)}, ${parseInt(vaultColor.slice(5,7), 16)}, 0.15) 100%)`,
												border: `1px solid rgba(${parseInt(vaultColor.slice(1,3), 16)}, ${parseInt(vaultColor.slice(3,5), 16)}, ${parseInt(vaultColor.slice(5,7), 16)}, 0.35)`,
												boxShadow: `0 1px 4px rgba(${parseInt(vaultColor.slice(1,3), 16)}, ${parseInt(vaultColor.slice(3,5), 16)}, ${parseInt(vaultColor.slice(5,7), 16)}, 0.2)`,
												transition: 'all 0.2s ease',
												position: 'relative'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = `linear-gradient(135deg, rgba(${parseInt(vaultColor.slice(1,3), 16)}, ${parseInt(vaultColor.slice(3,5), 16)}, ${parseInt(vaultColor.slice(5,7), 16)}, 0.35) 0%, rgba(${parseInt(vaultColor.slice(1,3), 16)}, ${parseInt(vaultColor.slice(3,5), 16)}, ${parseInt(vaultColor.slice(5,7), 16)}, 0.25) 100%)`;
												e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
												e.currentTarget.style.boxShadow = `0 3px 8px rgba(${parseInt(vaultColor.slice(1,3), 16)}, ${parseInt(vaultColor.slice(3,5), 16)}, ${parseInt(vaultColor.slice(5,7), 16)}, 0.3)`;
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = `linear-gradient(135deg, rgba(${parseInt(vaultColor.slice(1,3), 16)}, ${parseInt(vaultColor.slice(3,5), 16)}, ${parseInt(vaultColor.slice(5,7), 16)}, 0.25) 0%, rgba(${parseInt(vaultColor.slice(1,3), 16)}, ${parseInt(vaultColor.slice(3,5), 16)}, ${parseInt(vaultColor.slice(5,7), 16)}, 0.15) 100%)`;
												e.currentTarget.style.transform = 'translateY(0) scale(1)';
												e.currentTarget.style.boxShadow = `0 1px 4px rgba(${parseInt(vaultColor.slice(1,3), 16)}, ${parseInt(vaultColor.slice(3,5), 16)}, ${parseInt(vaultColor.slice(5,7), 16)}, 0.2)`;
											}}
										>
											<i className={vaultState.unlocked ? 'pi pi-unlock' : 'pi pi-lock'} style={{ color: vaultColor, fontSize: compactBar.serviceIconSize }} />
										</button>
									</div>
								);
							})()}

							{/* Nextcloud */}
							{(() => {
								const ncConfigured = !!syncState.configured;
								// Azul si está configurado (bien configurado), rojo solo si hay error explícito
								const ncColor = !ncConfigured ? '#60a5fa' : (syncState.connectivity === 'error' ? '#ef4444' : '#60a5fa');
								const ncStatus = ncConfigured ? (syncState.connectivity === 'ok' ? 'Conectado' : (syncState.connectivity === 'error' ? 'Error' : 'Configurado')) : 'No configurado';
								return (
									<div style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: '0.25rem',
										flexShrink: 0
									}}>
										<button
											onClick={() => {
												if (onOpenSettings) {
													onOpenSettings();
												} else {
													// Fallback: disparar evento directamente si onOpenSettings no está disponible
													try {
														window.dispatchEvent(new CustomEvent('open-settings-dialog', {
															detail: { tab: 'sync' }
														}));
													} catch (e) {
														console.warn('[NodeTermStatus] Error abriendo configuración de Cloud:', e);
													}
												}
											}}
											title={`Nextcloud: ${ncStatus}`}
											style={{
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: `${compactBar.buttonSize}px`,
												height: `${compactBar.buttonSize}px`,
												padding: '0',
												borderRadius: `${compactBar.buttonRadius}px`,
												background: `linear-gradient(135deg, rgba(${parseInt(ncColor.slice(1,3), 16)}, ${parseInt(ncColor.slice(3,5), 16)}, ${parseInt(ncColor.slice(5,7), 16)}, 0.25) 0%, rgba(${parseInt(ncColor.slice(1,3), 16)}, ${parseInt(ncColor.slice(3,5), 16)}, ${parseInt(ncColor.slice(5,7), 16)}, 0.15) 100%)`,
												border: `1px solid rgba(${parseInt(ncColor.slice(1,3), 16)}, ${parseInt(ncColor.slice(3,5), 16)}, ${parseInt(ncColor.slice(5,7), 16)}, 0.35)`,
												boxShadow: `0 1px 4px rgba(${parseInt(ncColor.slice(1,3), 16)}, ${parseInt(ncColor.slice(3,5), 16)}, ${parseInt(ncColor.slice(5,7), 16)}, 0.2)`,
												transition: 'all 0.2s ease',
												position: 'relative'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = `linear-gradient(135deg, rgba(${parseInt(ncColor.slice(1,3), 16)}, ${parseInt(ncColor.slice(3,5), 16)}, ${parseInt(ncColor.slice(5,7), 16)}, 0.35) 0%, rgba(${parseInt(ncColor.slice(1,3), 16)}, ${parseInt(ncColor.slice(3,5), 16)}, ${parseInt(ncColor.slice(5,7), 16)}, 0.25) 100%)`;
												e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
												e.currentTarget.style.boxShadow = `0 3px 8px rgba(${parseInt(ncColor.slice(1,3), 16)}, ${parseInt(ncColor.slice(3,5), 16)}, ${parseInt(ncColor.slice(5,7), 16)}, 0.3)`;
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = `linear-gradient(135deg, rgba(${parseInt(ncColor.slice(1,3), 16)}, ${parseInt(ncColor.slice(3,5), 16)}, ${parseInt(ncColor.slice(5,7), 16)}, 0.25) 0%, rgba(${parseInt(ncColor.slice(1,3), 16)}, ${parseInt(ncColor.slice(3,5), 16)}, ${parseInt(ncColor.slice(5,7), 16)}, 0.15) 100%)`;
												e.currentTarget.style.transform = 'translateY(0) scale(1)';
												e.currentTarget.style.boxShadow = `0 1px 4px rgba(${parseInt(ncColor.slice(1,3), 16)}, ${parseInt(ncColor.slice(3,5), 16)}, ${parseInt(ncColor.slice(5,7), 16)}, 0.2)`;
											}}
										>
											<i className="pi pi-cloud" style={{ color: ncColor, fontSize: compactBar.serviceIconSize }} />
										</button>
									</div>
								);
							})()}

							{/* Guacd */}
							{(() => {
								const guacdColor = guacdState.isRunning ? '#22c55e' : '#ef4444';
								const guacdStatus = guacdState.isRunning ? 'En ejecución' : 'Detenido';
								const isDocker = guacdState.method === 'docker';
								return (
									<div style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: '0.25rem',
										flexShrink: 0
									}}>
										<button
											title={`Guacd: ${guacdStatus} (${guacdState.method})`}
											style={{
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: `${compactBar.buttonSize}px`,
												height: `${compactBar.buttonSize}px`,
												padding: '0',
												borderRadius: `${compactBar.buttonRadius}px`,
												background: `linear-gradient(135deg, rgba(${parseInt(guacdColor.slice(1,3), 16)}, ${parseInt(guacdColor.slice(3,5), 16)}, ${parseInt(guacdColor.slice(5,7), 16)}, 0.25) 0%, rgba(${parseInt(guacdColor.slice(1,3), 16)}, ${parseInt(guacdColor.slice(3,5), 16)}, ${parseInt(guacdColor.slice(5,7), 16)}, 0.15) 100%)`,
												border: `1px solid rgba(${parseInt(guacdColor.slice(1,3), 16)}, ${parseInt(guacdColor.slice(3,5), 16)}, ${parseInt(guacdColor.slice(5,7), 16)}, 0.35)`,
												boxShadow: `0 1px 4px rgba(${parseInt(guacdColor.slice(1,3), 16)}, ${parseInt(guacdColor.slice(3,5), 16)}, ${parseInt(guacdColor.slice(5,7), 16)}, 0.2)`,
												transition: 'all 0.2s ease',
												position: 'relative'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = `linear-gradient(135deg, rgba(${parseInt(guacdColor.slice(1,3), 16)}, ${parseInt(guacdColor.slice(3,5), 16)}, ${parseInt(guacdColor.slice(5,7), 16)}, 0.35) 0%, rgba(${parseInt(guacdColor.slice(1,3), 16)}, ${parseInt(guacdColor.slice(3,5), 16)}, ${parseInt(guacdColor.slice(5,7), 16)}, 0.25) 100%)`;
												e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
												e.currentTarget.style.boxShadow = `0 3px 8px rgba(${parseInt(guacdColor.slice(1,3), 16)}, ${parseInt(guacdColor.slice(3,5), 16)}, ${parseInt(guacdColor.slice(5,7), 16)}, 0.3)`;
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = `linear-gradient(135deg, rgba(${parseInt(guacdColor.slice(1,3), 16)}, ${parseInt(guacdColor.slice(3,5), 16)}, ${parseInt(guacdColor.slice(5,7), 16)}, 0.25) 0%, rgba(${parseInt(guacdColor.slice(1,3), 16)}, ${parseInt(guacdColor.slice(3,5), 16)}, ${parseInt(guacdColor.slice(5,7), 16)}, 0.15) 100%)`;
												e.currentTarget.style.transform = 'translateY(0) scale(1)';
												e.currentTarget.style.boxShadow = `0 1px 4px rgba(${parseInt(guacdColor.slice(1,3), 16)}, ${parseInt(guacdColor.slice(3,5), 16)}, ${parseInt(guacdColor.slice(5,7), 16)}, 0.2)`;
											}}
										>
											{isDocker ? (
												<i className="pi pi-box" style={{ color: guacdColor, fontSize: compactBar.serviceIconSize }} />
											) : (
												<i className="pi pi-window-maximize" style={{ color: guacdColor, fontSize: compactBar.serviceIconSize }} />
											)}
										</button>
									</div>
								);
							})()}

							{/* Ollama */}
							{(() => {
								const ollamaColor = ollamaState.isRunning ? '#22c55e' : '#ef4444';
								const ollamaStatus = ollamaState.isRunning ? 'En ejecución' : 'Detenido';
								return (
									<div style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: '0.25rem',
										flexShrink: 0
									}}>
										<button
											title={`Ollama: ${ollamaStatus}${ollamaState.isRemote ? ' (Remoto)' : ''}`}
											style={{
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: `${compactBar.buttonSize}px`,
												height: `${compactBar.buttonSize}px`,
												padding: '0',
												borderRadius: `${compactBar.buttonRadius}px`,
												background: `linear-gradient(135deg, rgba(${parseInt(ollamaColor.slice(1,3), 16)}, ${parseInt(ollamaColor.slice(3,5), 16)}, ${parseInt(ollamaColor.slice(5,7), 16)}, 0.25) 0%, rgba(${parseInt(ollamaColor.slice(1,3), 16)}, ${parseInt(ollamaColor.slice(3,5), 16)}, ${parseInt(ollamaColor.slice(5,7), 16)}, 0.15) 100%)`,
												border: `1px solid rgba(${parseInt(ollamaColor.slice(1,3), 16)}, ${parseInt(ollamaColor.slice(3,5), 16)}, ${parseInt(ollamaColor.slice(5,7), 16)}, 0.35)`,
												boxShadow: `0 1px 4px rgba(${parseInt(ollamaColor.slice(1,3), 16)}, ${parseInt(ollamaColor.slice(3,5), 16)}, ${parseInt(ollamaColor.slice(5,7), 16)}, 0.2)`,
												transition: 'all 0.2s ease',
												position: 'relative'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = `linear-gradient(135deg, rgba(${parseInt(ollamaColor.slice(1,3), 16)}, ${parseInt(ollamaColor.slice(3,5), 16)}, ${parseInt(ollamaColor.slice(5,7), 16)}, 0.35) 0%, rgba(${parseInt(ollamaColor.slice(1,3), 16)}, ${parseInt(ollamaColor.slice(3,5), 16)}, ${parseInt(ollamaColor.slice(5,7), 16)}, 0.25) 100%)`;
												e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
												e.currentTarget.style.boxShadow = `0 3px 8px rgba(${parseInt(ollamaColor.slice(1,3), 16)}, ${parseInt(ollamaColor.slice(3,5), 16)}, ${parseInt(ollamaColor.slice(5,7), 16)}, 0.3)`;
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = `linear-gradient(135deg, rgba(${parseInt(ollamaColor.slice(1,3), 16)}, ${parseInt(ollamaColor.slice(3,5), 16)}, ${parseInt(ollamaColor.slice(5,7), 16)}, 0.25) 0%, rgba(${parseInt(ollamaColor.slice(1,3), 16)}, ${parseInt(ollamaColor.slice(3,5), 16)}, ${parseInt(ollamaColor.slice(5,7), 16)}, 0.15) 100%)`;
												e.currentTarget.style.transform = 'translateY(0) scale(1)';
												e.currentTarget.style.boxShadow = `0 1px 4px rgba(${parseInt(ollamaColor.slice(1,3), 16)}, ${parseInt(ollamaColor.slice(3,5), 16)}, ${parseInt(ollamaColor.slice(5,7), 16)}, 0.2)`;
											}}
										>
											<i className="pi pi-desktop" style={{ color: ollamaColor, fontSize: compactBar.serviceIconSize }} />
										</button>
									</div>
								);
							})()}
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Layout vertical original - mantenido para compatibilidad
	return (
		<div style={{
			padding: '1.25rem'
		}}>
			{/* Header simplificado */}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				marginBottom: '1.5rem'
			}}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
					<div style={{
						width: '24px',
						height: '24px',
						borderRadius: '6px',
						background: 'linear-gradient(135deg, rgba(79, 195, 247, 0.2) 0%, rgba(79, 195, 247, 0.1) 100%)',
						border: '1px solid rgba(79, 195, 247, 0.3)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						boxShadow: '0 1px 4px rgba(79, 195, 247, 0.15)'
					}}>
						<i className="pi pi-chart-bar" style={{ color: '#4fc3f7', fontSize: '0.9rem' }} />
					</div>
					<h3 style={{
						margin: 0,
						color: themeColors.textPrimary || 'var(--text-color)',
						fontSize: '0.9rem',
						fontWeight: '700',
						letterSpacing: '0.1px'
					}}>
						Estado de NodeTerm
					</h3>
				</div>
				
				{/* Solo el punto verde */}
				<div style={{
					width: '8px',
					height: '8px',
					borderRadius: '50%',
					background: '#22c55e',
					boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
				}} />
			</div>

			{/* Dashboard de métricas elegante - compacto */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(3, 1fr)',
				gap: '0.4rem',
				marginBottom: '1.2rem'
			}}>
				<StatItem icon="pi pi-server" value={sshConnectionsCount} label="SSH" color="#4fc3f7" compact={true} />
				<StatItem icon="pi pi-desktop" value={rdpConnectionsCount} label="RDP" color="#ff6b35" compact={true} />
				<StatItem icon="pi pi-key" value={passwordsCount} label="Keys" color="#FFC107" compact={true} />
			</div>
		</div>
	);
}

export default NodeTermStatus;
