import React, { useState, useEffect, useRef } from 'react';
import { getVersionInfo } from '../version-info';
import SyncManager from '../utils/SyncManager';
import SecureStorage from '../services/SecureStorage';
import { aiService } from '../services/AIService';

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
	const [syncState, setSyncState] = useState({ configured: false, enabled: false, lastSync: null, connectivity: 'unknown' });
	const [guacdState, setGuacdState] = useState({ isRunning: false, method: 'unknown', host: '127.0.0.1', port: 4822 });
	const [vaultState, setVaultState] = useState({ configured: false, unlocked: false });
	const [ollamaState, setOllamaState] = useState({ isRunning: false, url: 'http://localhost:11434', isRemote: false });
	const [wslDistributions, setWSLDistributions] = useState([]);
	const [cygwinAvailable, setCygwinAvailable] = useState(false);
	const [dockerContainers, setDockerContainers] = useState([]);
	const [availableTerminals, setAvailableTerminals] = useState([]);
	const syncManagerRef = useRef(null);
	const secureStorageRef = useRef(null);

	useEffect(() => {
		// Inicializar managers
		if (!syncManagerRef.current) syncManagerRef.current = new SyncManager();
		if (!secureStorageRef.current) secureStorageRef.current = new SecureStorage();

		// Estado Nextcloud
		try {
			const st = syncManagerRef.current.getSyncStatus();
			setSyncState(prev => ({ ...prev, configured: st.configured, enabled: st.enabled, lastSync: st.lastSync, connectivity: st.configured ? 'checking' : 'unknown' }));
			if (st.configured) {
				setTimeout(async () => {
					try {
						const res = await syncManagerRef.current.nextcloudService.testConnection();
						setSyncState(prev => ({ ...prev, connectivity: res?.success ? 'ok' : 'error' }));
					} catch (_) {
						setSyncState(prev => ({ ...prev, connectivity: 'error' }));
					}
				}, 0);
			}
		} catch {}

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
		let intervalId = null;
		const fetchGuacd = async () => {
			try {
				if (window?.electron?.ipcRenderer) {
					const st = await window.electron.ipcRenderer.invoke('guacamole:get-status');
					if (st && st.guacd) setGuacdState(st.guacd);
				}
			} catch {}
		};
		fetchGuacd();
		intervalId = setInterval(fetchGuacd, 5000);

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
		const ollamaIntervalId = setInterval(fetchOllama, 5000);

		return () => { 
			if (intervalId) clearInterval(intervalId);
			if (ollamaIntervalId) clearInterval(ollamaIntervalId);
		};
	}, []);

	// Detectar distribuciones WSL
	useEffect(() => {
		if (!horizontal || !compact) return;
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
				console.error('Error en detección de distribuciones WSL:', error);
				setWSLDistributions([]);
			}
		};
		detectWSLDistributions();
	}, [horizontal, compact]);

	// Detectar disponibilidad de Cygwin
	useEffect(() => {
		if (!horizontal || !compact) return;
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
					console.error('Error detectando Cygwin:', error);
					setCygwinAvailable(false);
				}
			} else {
				setCygwinAvailable(false);
			}
		};
		detectCygwin();
	}, [horizontal, compact]);

	// Detectar contenedores Docker
	useEffect(() => {
		if (!horizontal || !compact) return;
		let mounted = true;
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
				console.error('Error detectando Docker:', error);
				setDockerContainers([]);
			}
		};
		detectDocker();
		return () => { mounted = false; };
	}, [horizontal, compact]);

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
			terminals.push({
				label: 'WSL',
				value: 'wsl',
				icon: 'pi pi-server',
				color: '#4fc3f7',
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
			wslDistributions.forEach(distro => {
				const isBasicUbuntu = distro.name === 'ubuntu' && !distro.label.includes('24.04');
				const isBasicDebian = distro.name === 'debian';
				if (!isBasicUbuntu && !isBasicDebian) {
					terminals.push({
						label: distro.label,
						value: `wsl-${distro.name}`,
						icon: distro.icon,
						color: getColorForCategory(distro.category),
						action: () => handleOpenTerminal(`wsl-${distro.name}`, distro),
						distroInfo: distro
					});
				}
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

	// Tamaños para la barra superior compacta (HomeTab)
	const compactBar = {
		containerPadding: '0.5rem 0.9rem',
		containerGap: '1.0rem',
		buttonSize: 40,
		buttonRadius: 8,
		buttonIconSize: '1.0rem',
		labelFontSize: '0.48rem',
		labelLineHeight: '1.05',
		separatorHeight: 56,
		serviceSize: 36,
		serviceIconSize: '0.85rem',
		labelMaxWidth: 52
	};

	// Layout horizontal compacto - LAYOUT 3: BARRA SUPERIOR CENTRADA
	if (horizontal && compact) {
		return (
			<div style={{ 
				width: '100%',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				padding: '0 2rem',
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
				`}</style>

				{/* BARRA SUPERIOR CENTRADA: ACCIONES Y TERMINALES */}
				<div style={{ 
					background: `linear-gradient(135deg,
						rgba(16, 20, 28, 0.7) 0%,
						rgba(16, 20, 28, 0.5) 100%)`,
					backdropFilter: 'blur(12px) saturate(140%)',
					WebkitBackdropFilter: 'blur(12px) saturate(140%)',
					border: `1px solid ${themeColors.cardBorder || 'rgba(255,255,255,0.15)'}`,
					borderRadius: '16px',
					boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
					padding: compactBar.containerPadding,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: compactBar.containerGap,
					width: 'fit-content',
					maxWidth: '90%',
					minWidth: '560px',
					overflow: 'hidden'
				}}>
					{/* SECCIÓN 1: ACCIONES */}
					<div style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '0.4rem',
						alignItems: 'center',
						justifyContent: 'center',
						minWidth: 0,
						flex: '0 0 auto'
					}}>
					{/* Botones */}
						<div style={{
							display: 'flex',
							alignItems: 'flex-start',
							justifyContent: 'center',
							gap: '0.5rem',
							flexWrap: 'wrap',
							maxWidth: '100%',
							overflow: 'hidden',
							width: '100%'
						}}>
						{/* Botón Nueva Conexión */}
						<div style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '0.25rem'
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
								<i className="pi pi-plus-circle" style={{ color: '#22c55e', fontSize: compactBar.buttonIconSize, fontWeight: 'bold' }} />
							</button>
							<span style={{
								fontSize: compactBar.labelFontSize,
								fontWeight: '500',
								color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
								textAlign: 'center',
								lineHeight: compactBar.labelLineHeight
							}}>
								Nueva
							</span>
						</div>

						{/* Botón Terminal */}
						{onToggleTerminalVisibility && (
							<div style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: '0.25rem'
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
										background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.25) 0%, rgba(0, 188, 212, 0.15) 100%)',
										border: '1px solid rgba(0, 188, 212, 0.35)',
										boxShadow: '0 1px 4px rgba(0, 188, 212, 0.2)',
										transition: 'all 0.2s ease',
										position: 'relative'
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 188, 212, 0.35) 0%, rgba(0, 188, 212, 0.25) 100%)';
										e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
										e.currentTarget.style.boxShadow = '0 3px 8px rgba(0, 188, 212, 0.3)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 188, 212, 0.25) 0%, rgba(0, 188, 212, 0.15) 100%)';
										e.currentTarget.style.transform = 'translateY(0) scale(1)';
										e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 188, 212, 0.2)';
									}}
								>
									<i className="pi pi-desktop" style={{ color: '#00BCD4', fontSize: compactBar.buttonIconSize, fontWeight: 'bold' }} />
								</button>
								<span style={{
									fontSize: compactBar.labelFontSize,
									fontWeight: '500',
									color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
									textAlign: 'center',
									lineHeight: compactBar.labelLineHeight
								}}>
									Terminal
								</span>
							</div>
						)}

						{/* Botón Historial */}
						<div style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '0.25rem'
						}}>
							<button
								title="Ver historial de conexiones"
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
								<i className="pi pi-list" style={{ color: '#64C8FF', fontSize: compactBar.buttonIconSize, fontWeight: 'bold' }} />
							</button>
							<span style={{
								fontSize: compactBar.labelFontSize,
								fontWeight: '500',
								color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
								textAlign: 'center',
								lineHeight: compactBar.labelLineHeight
							}}>
								Historial
							</span>
						</div>

						{/* Botón Passwords */}
						<div style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '0.25rem'
						}}>
							<button
								title="Gestor de contraseñas"
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
								<i className="pi pi-key" style={{ color: '#FFC107', fontSize: compactBar.buttonIconSize, fontWeight: 'bold' }} />
							</button>
							<span style={{
								fontSize: compactBar.labelFontSize,
								fontWeight: '500',
								color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
								textAlign: 'center',
								lineHeight: compactBar.labelLineHeight
							}}>
								Keys
							</span>
						</div>

						{/* Botón Configuración */}
						{onOpenSettings && (
							<div style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: '0.25rem'
							}}>
								<button
									title="Configuración"
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
										background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.25) 0%, rgba(76, 175, 80, 0.15) 100%)',
										border: '1px solid rgba(76, 175, 80, 0.35)',
										boxShadow: '0 1px 4px rgba(76, 175, 80, 0.2)',
										transition: 'all 0.2s ease',
										position: 'relative'
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.35) 0%, rgba(76, 175, 80, 0.25) 100%)';
										e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
										e.currentTarget.style.boxShadow = '0 3px 8px rgba(76, 175, 80, 0.3)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.25) 0%, rgba(76, 175, 80, 0.15) 100%)';
										e.currentTarget.style.transform = 'translateY(0) scale(1)';
										e.currentTarget.style.boxShadow = '0 1px 4px rgba(76, 175, 80, 0.2)';
									}}
								>
									<i className="pi pi-cog" style={{ color: '#4CAF50', fontSize: compactBar.buttonIconSize, fontWeight: 'bold' }} />
								</button>
								<span style={{
									fontSize: compactBar.labelFontSize,
									fontWeight: '500',
									color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
									textAlign: 'center',
									lineHeight: compactBar.labelLineHeight
								}}>
									Config
								</span>
							</div>
						)}

						{/* Botón Status Bar */}
						{onToggleStatusBar && (
							<div style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: '0.25rem'
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
										background: statusBarVisible
											? 'linear-gradient(135deg, rgba(79, 195, 247, 0.35) 0%, rgba(79, 195, 247, 0.25) 100%)'
											: 'linear-gradient(135deg, rgba(79, 195, 247, 0.25) 0%, rgba(79, 195, 247, 0.15) 100%)',
										border: '1px solid rgba(79, 195, 247, 0.35)',
										boxShadow: '0 1px 4px rgba(79, 195, 247, 0.2)',
										transition: 'all 0.2s ease',
										position: 'relative'
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = 'linear-gradient(135deg, rgba(79, 195, 247, 0.35) 0%, rgba(79, 195, 247, 0.25) 100%)';
										e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
										e.currentTarget.style.boxShadow = '0 3px 8px rgba(79, 195, 247, 0.3)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = statusBarVisible
											? 'linear-gradient(135deg, rgba(79, 195, 247, 0.35) 0%, rgba(79, 195, 247, 0.25) 100%)'
											: 'linear-gradient(135deg, rgba(79, 195, 247, 0.25) 0%, rgba(79, 195, 247, 0.15) 100%)';
										e.currentTarget.style.transform = 'translateY(0) scale(1)';
										e.currentTarget.style.boxShadow = '0 1px 4px rgba(79, 195, 247, 0.2)';
									}}
								>
									<i 
										className={statusBarVisible ? 'pi pi-eye' : 'pi pi-eye-slash'} 
										style={{ color: '#4fc3f7', fontSize: compactBar.buttonIconSize, fontWeight: 'bold' }} 
									/>
								</button>
								<span style={{
									fontSize: compactBar.labelFontSize,
									fontWeight: '500',
									color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
									textAlign: 'center',
									lineHeight: compactBar.labelLineHeight
								}}>
									Status
								</span>
							</div>
						)}

						{/* Botón Grabaciones y Auditoría */}
						<div style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '0.25rem'
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
								<i className="pi pi-video" style={{ color: '#a855f7', fontSize: compactBar.buttonIconSize, fontWeight: 'bold' }} />
							</button>
							<span style={{
								fontSize: compactBar.labelFontSize,
								fontWeight: '500',
								color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
								textAlign: 'center',
								lineHeight: compactBar.labelLineHeight
							}}>
								Audit
							</span>
						</div>
					</div>
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

						{/* SECCIÓN 2: TERMINALES */}
						{availableTerminals.length > 0 && (
							<div style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '0.4rem',
								alignItems: 'center',
								justifyContent: 'center',
								minWidth: 0,
								flex: '0 0 auto'
							}}>
				{/* Botones */}
								<div style={{
									display: 'flex',
									alignItems: 'flex-start',
									justifyContent: 'center',
									gap: '0.5rem',
									flexWrap: 'wrap',
									maxWidth: '100%',
									overflow: 'hidden',
									width: '100%'
								}}>
								{availableTerminals.map((terminal, index) => (
									<div key={index} style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: '0.25rem'
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
												background: `linear-gradient(135deg, ${terminal.color}25 0%, ${terminal.color}15 100%)`,
												border: `1px solid ${terminal.color}35`,
												boxShadow: `0 1px 4px ${terminal.color}20`,
												transition: 'all 0.2s ease',
												position: 'relative'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = `linear-gradient(135deg, ${terminal.color}35 0%, ${terminal.color}25 100%)`;
												e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
												e.currentTarget.style.boxShadow = `0 3px 8px ${terminal.color}30`;
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = `linear-gradient(135deg, ${terminal.color}25 0%, ${terminal.color}15 100%)`;
												e.currentTarget.style.transform = 'translateY(0) scale(1)';
												e.currentTarget.style.boxShadow = `0 1px 4px ${terminal.color}20`;
											}}
										>
											<i className={terminal.icon} style={{ color: terminal.color, fontSize: compactBar.buttonIconSize, fontWeight: 'bold' }} />
										</button>
										<span style={{
											fontSize: compactBar.labelFontSize,
											fontWeight: '500',
											color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
											textAlign: 'center',
											lineHeight: compactBar.labelLineHeight,
											maxWidth: `${compactBar.labelMaxWidth}px`,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap'
										}}>
											{terminal.label}
										</span>
									</div>
								))}

								{/* Botón Docker si hay contenedores */}
								{dockerContainers.length > 0 && (
									<div style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: '0.25rem'
									}}>
										<button
											title={`Docker (${dockerContainers.length})`}
											onClick={() => handleOpenTerminal(`docker-${dockerContainers[0].name}`, { dockerContainer: dockerContainers[0] })}
											style={{
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: `${compactBar.buttonSize}px`,
												height: `${compactBar.buttonSize}px`,
												padding: '0',
												borderRadius: `${compactBar.buttonRadius}px`,
												background: 'linear-gradient(135deg, rgba(36, 150, 237, 0.25) 0%, rgba(36, 150, 237, 0.15) 100%)',
												border: '1px solid rgba(36, 150, 237, 0.35)',
												boxShadow: '0 1px 4px rgba(36, 150, 237, 0.2)',
												transition: 'all 0.2s ease',
												position: 'relative',
												overflow: 'visible'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = 'linear-gradient(135deg, rgba(36, 150, 237, 0.35) 0%, rgba(36, 150, 237, 0.25) 100%)';
												e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
												e.currentTarget.style.boxShadow = '0 3px 8px rgba(36, 150, 237, 0.3)';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = 'linear-gradient(135deg, rgba(36, 150, 237, 0.25) 0%, rgba(36, 150, 237, 0.15) 100%)';
												e.currentTarget.style.transform = 'translateY(0) scale(1)';
												e.currentTarget.style.boxShadow = '0 1px 4px rgba(36, 150, 237, 0.2)';
											}}
										>
											<div style={{ position: 'relative' }}>
												<i className="pi pi-box" style={{ color: '#2496ED', fontSize: compactBar.buttonIconSize, fontWeight: 'bold' }} />
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
										<span style={{
											fontSize: compactBar.labelFontSize,
											fontWeight: '500',
											color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
											textAlign: 'center',
											lineHeight: compactBar.labelLineHeight
										}}>
											Docker
										</span>
									</div>
								)}
							</div>
						</div>
					)}

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
						flex: '0 0 auto'
					}}>
			{/* Badges de servicios */}
						<div style={{
							display: 'flex',
							alignItems: 'flex-start',
							justifyContent: 'center',
							gap: '0.5rem',
							flexWrap: 'wrap',
							maxWidth: '100%',
							overflow: 'hidden',
							width: '100%'
						}}>
							{/* Nextcloud */}
							{(() => {
								const ncConfigured = !!syncState.configured;
								const ncColor = !ncConfigured ? '#9ca3af' : (syncState.connectivity === 'ok' ? '#22c55e' : (syncState.connectivity === 'checking' ? '#60a5fa' : '#ef4444'));
								const ncStatus = ncConfigured ? (syncState.connectivity === 'ok' ? 'Conectado' : 'Error') : 'No configurado';
								return (
									<div style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: '0.25rem'
									}}>
										<div 
											onClick={onOpenSettings}
											title={`Nextcloud: ${ncStatus}`}
											style={{
												position: 'relative',
												width: `${compactBar.serviceSize}px`,
												height: `${compactBar.serviceSize}px`,
												borderRadius: '50%',
												background: `linear-gradient(135deg, ${ncColor}25 0%, ${ncColor}15 100%)`,
												border: `2px solid ${ncColor}50`,
												cursor: onOpenSettings ? 'pointer' : 'default',
												transition: 'all 0.2s ease',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												boxShadow: `0 1px 4px ${ncColor}20`
											}}
											onMouseEnter={(e) => {
												if (onOpenSettings) {
													e.currentTarget.style.transform = 'translateY(-1px) scale(1.1)';
													e.currentTarget.style.boxShadow = `0 3px 8px ${ncColor}30`;
												}
											}}
											onMouseLeave={(e) => {
												if (onOpenSettings) {
													e.currentTarget.style.transform = 'translateY(0) scale(1)';
													e.currentTarget.style.boxShadow = `0 1px 4px ${ncColor}20`;
												}
											}}
										>
											<i className="pi pi-cloud" style={{ color: ncColor, fontSize: compactBar.serviceIconSize }} />
										</div>
										<span style={{
											fontSize: compactBar.labelFontSize,
											fontWeight: '500',
											color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
											textAlign: 'center',
											lineHeight: compactBar.labelLineHeight,
											maxWidth: `${compactBar.labelMaxWidth}px`,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap'
										}}>
											Nextcloud
										</span>
									</div>
								);
							})()}

							{/* Guacd */}
							{(() => {
								const guacdColor = guacdState.isRunning ? '#22c55e' : '#ef4444';
								const guacdStatus = guacdState.isRunning ? 'En ejecución' : 'Detenido';
								return (
									<div style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: '0.25rem'
									}}>
										<div 
											title={`Guacd: ${guacdStatus} (${guacdState.method})`}
											style={{
												position: 'relative',
												width: `${compactBar.serviceSize}px`,
												height: `${compactBar.serviceSize}px`,
												borderRadius: '50%',
												background: `linear-gradient(135deg, ${guacdColor}25 0%, ${guacdColor}15 100%)`,
												border: `2px solid ${guacdColor}50`,
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												boxShadow: `0 1px 4px ${guacdColor}20`
											}}
										>
											<i className="pi pi-desktop" style={{ color: guacdColor, fontSize: compactBar.serviceIconSize }} />
										</div>
										<span style={{
											fontSize: compactBar.labelFontSize,
											fontWeight: '500',
											color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
											textAlign: 'center',
											lineHeight: compactBar.labelLineHeight,
											maxWidth: `${compactBar.labelMaxWidth}px`,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap'
										}}>
											Guacd
										</span>
									</div>
								);
							})()}

							{/* Vault */}
							{(() => {
								const vaultColor = !vaultState.configured ? '#9ca3af' : (vaultState.unlocked ? '#22c55e' : '#f59e0b');
								const vaultStatus = !vaultState.configured ? 'No configurado' : (vaultState.unlocked ? 'Desbloqueado' : 'Bloqueado');
								return (
									<div style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: '0.25rem'
									}}>
										<div 
											title={`Vault: ${vaultStatus}`}
											style={{
												position: 'relative',
												width: `${compactBar.serviceSize}px`,
												height: `${compactBar.serviceSize}px`,
												borderRadius: '50%',
												background: `linear-gradient(135deg, ${vaultColor}25 0%, ${vaultColor}15 100%)`,
												border: `2px solid ${vaultColor}50`,
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												boxShadow: `0 1px 4px ${vaultColor}20`
											}}
										>
											<i className={vaultState.unlocked ? 'pi pi-unlock' : 'pi pi-lock'} style={{ color: vaultColor, fontSize: compactBar.serviceIconSize }} />
										</div>
										<span style={{
											fontSize: compactBar.labelFontSize,
											fontWeight: '500',
											color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
											textAlign: 'center',
											lineHeight: compactBar.labelLineHeight,
											maxWidth: `${compactBar.labelMaxWidth}px`,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap'
										}}>
											Vault
										</span>
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
										gap: '0.25rem'
									}}>
										<div 
											title={`Ollama: ${ollamaStatus}${ollamaState.isRemote ? ' (Remoto)' : ''}`}
											style={{
												position: 'relative',
												width: `${compactBar.serviceSize}px`,
												height: `${compactBar.serviceSize}px`,
												borderRadius: '50%',
												background: `linear-gradient(135deg, ${ollamaColor}25 0%, ${ollamaColor}15 100%)`,
												border: `2px solid ${ollamaColor}50`,
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												boxShadow: `0 1px 4px ${ollamaColor}20`
											}}
										>
											<i className="pi pi-brain" style={{ color: ollamaColor, fontSize: compactBar.serviceIconSize }} />
										</div>
										<span style={{
											fontSize: compactBar.labelFontSize,
											fontWeight: '500',
											color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
											textAlign: 'center',
											lineHeight: compactBar.labelLineHeight,
											maxWidth: `${compactBar.labelMaxWidth}px`,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap'
										}}>
											Ollama
										</span>
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
