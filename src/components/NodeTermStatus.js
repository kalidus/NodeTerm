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

	// Layout horizontal compacto - DISEÑO CON TÍTULOS Y SERVICIOS MEJORADOS
	if (horizontal && compact) {
		return (
			<div style={{ 
				padding: '0.8rem 1rem',
				display: 'flex',
				alignItems: 'flex-start',
				gap: '1rem',
				width: '100%',
				background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(15, 23, 42, 0.2) 100%)',
				borderRadius: '10px',
				border: '1px solid rgba(79, 195, 247, 0.15)',
				minHeight: '60px'
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

				{/* SECCIÓN 1: ACCIONES */}
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '0.4rem',
					minWidth: 'fit-content'
				}}>
					{/* Título */}
					<div style={{
						fontSize: '0.55rem',
						fontWeight: '700',
						color: themeColors.textSecondary || '#9E9E9E',
						textTransform: 'uppercase',
						letterSpacing: '0.5px',
						marginBottom: '0.2rem'
					}}>
						Acciones
					</div>
					{/* Botones */}
					<div style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.35rem',
						flexWrap: 'wrap'
					}}>
					{/* Botón Terminal */}
					{onToggleTerminalVisibility && (
						<button
							title="Mostrar/ocultar terminal local"
							onClick={onToggleTerminalVisibility}
							style={{
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: '24px',
								height: '24px',
								borderRadius: '5px',
								background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.25) 0%, rgba(0, 188, 212, 0.15) 100%)',
								border: '1px solid rgba(0, 188, 212, 0.35)',
								boxShadow: '0 1px 4px rgba(0, 188, 212, 0.2)',
								transition: 'all 0.2s ease',
								padding: 0
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 188, 212, 0.35) 0%, rgba(0, 188, 212, 0.25) 100%)';
								e.currentTarget.style.transform = 'scale(1.1)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 188, 212, 0.25) 0%, rgba(0, 188, 212, 0.15) 100%)';
								e.currentTarget.style.transform = 'scale(1)';
							}}
						>
							<i className="pi pi-desktop" style={{ color: '#00BCD4', fontSize: '0.6rem' }} />
						</button>
					)}

					{/* Botón Chat IA */}
					{onToggleAIChat && (
						<button
							title={showAIChat ? 'Ocultar chat de IA' : 'Mostrar chat de IA'}
							onClick={onToggleAIChat}
							style={{
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: '24px',
								height: '24px',
								borderRadius: '5px',
								background: showAIChat
									? 'linear-gradient(135deg, rgba(138, 43, 226, 0.35) 0%, rgba(138, 43, 226, 0.25) 100%)'
									: 'linear-gradient(135deg, rgba(138, 43, 226, 0.25) 0%, rgba(138, 43, 226, 0.15) 100%)',
								border: '1px solid rgba(138, 43, 226, 0.35)',
								boxShadow: '0 1px 4px rgba(138, 43, 226, 0.2)',
								transition: 'all 0.2s ease',
								padding: 0
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'linear-gradient(135deg, rgba(138, 43, 226, 0.35) 0%, rgba(138, 43, 226, 0.25) 100%)';
								e.currentTarget.style.transform = 'scale(1.1)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = showAIChat
									? 'linear-gradient(135deg, rgba(138, 43, 226, 0.35) 0%, rgba(138, 43, 226, 0.25) 100%)'
									: 'linear-gradient(135deg, rgba(138, 43, 226, 0.25) 0%, rgba(138, 43, 226, 0.15) 100%)';
								e.currentTarget.style.transform = 'scale(1)';
							}}
						>
							<i 
								className={showAIChat ? 'pi pi-times' : 'pi pi-comments'} 
								style={{ color: '#8A2BE2', fontSize: '0.6rem' }} 
							/>
						</button>
					)}

					{/* Botón Historial */}
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
							width: '24px',
							height: '24px',
							borderRadius: '5px',
							background: 'linear-gradient(135deg, rgba(100, 200, 255, 0.25) 0%, rgba(100, 200, 255, 0.15) 100%)',
							border: '1px solid rgba(100, 200, 255, 0.35)',
							boxShadow: '0 1px 4px rgba(100, 200, 255, 0.2)',
							transition: 'all 0.2s ease',
							padding: 0
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100, 200, 255, 0.35) 0%, rgba(100, 200, 255, 0.25) 100%)';
							e.currentTarget.style.transform = 'scale(1.1)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100, 200, 255, 0.25) 0%, rgba(100, 200, 255, 0.15) 100%)';
							e.currentTarget.style.transform = 'scale(1)';
						}}
					>
						<i className="pi pi-list" style={{ color: '#64C8FF', fontSize: '0.6rem' }} />
					</button>

					{/* Botón Passwords */}
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
							width: '24px',
							height: '24px',
							borderRadius: '5px',
							background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 193, 7, 0.15) 100%)',
							border: '1px solid rgba(255, 193, 7, 0.35)',
							boxShadow: '0 1px 4px rgba(255, 193, 7, 0.2)',
							transition: 'all 0.2s ease',
							padding: 0
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 0.35) 0%, rgba(255, 193, 7, 0.25) 100%)';
							e.currentTarget.style.transform = 'scale(1.1)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 193, 7, 0.15) 100%)';
							e.currentTarget.style.transform = 'scale(1)';
						}}
					>
						<i className="pi pi-key" style={{ color: '#FFC107', fontSize: '0.6rem' }} />
					</button>

					{/* Botón Configuración */}
					{onOpenSettings && (
						<button
							title="Configuración"
							onClick={onOpenSettings}
							style={{
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: '24px',
								height: '24px',
								borderRadius: '5px',
								background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.25) 0%, rgba(76, 175, 80, 0.15) 100%)',
								border: '1px solid rgba(76, 175, 80, 0.35)',
								boxShadow: '0 1px 4px rgba(76, 175, 80, 0.2)',
								transition: 'all 0.2s ease',
								padding: 0
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.35) 0%, rgba(76, 175, 80, 0.25) 100%)';
								e.currentTarget.style.transform = 'scale(1.1)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.25) 0%, rgba(76, 175, 80, 0.15) 100%)';
								e.currentTarget.style.transform = 'scale(1)';
							}}
						>
							<i className="pi pi-cog" style={{ color: '#4CAF50', fontSize: '0.6rem' }} />
						</button>
					)}

					{/* Botón Status Bar */}
					{onToggleStatusBar && (
						<button
							title={statusBarVisible ? 'Ocultar status bar' : 'Mostrar status bar'}
							onClick={onToggleStatusBar}
							style={{
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: '24px',
								height: '24px',
								borderRadius: '5px',
								background: statusBarVisible
									? 'linear-gradient(135deg, rgba(79, 195, 247, 0.35) 0%, rgba(79, 195, 247, 0.25) 100%)'
									: 'linear-gradient(135deg, rgba(79, 195, 247, 0.25) 0%, rgba(79, 195, 247, 0.15) 100%)',
								border: '1px solid rgba(79, 195, 247, 0.35)',
								boxShadow: '0 1px 4px rgba(79, 195, 247, 0.2)',
								transition: 'all 0.2s ease',
								padding: 0
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'linear-gradient(135deg, rgba(79, 195, 247, 0.35) 0%, rgba(79, 195, 247, 0.25) 100%)';
								e.currentTarget.style.transform = 'scale(1.1)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = statusBarVisible
									? 'linear-gradient(135deg, rgba(79, 195, 247, 0.35) 0%, rgba(79, 195, 247, 0.25) 100%)'
									: 'linear-gradient(135deg, rgba(79, 195, 247, 0.25) 0%, rgba(79, 195, 247, 0.15) 100%)';
								e.currentTarget.style.transform = 'scale(1)';
							}}
						>
							<i 
								className={statusBarVisible ? 'pi pi-eye' : 'pi pi-eye-slash'} 
								style={{ color: '#4fc3f7', fontSize: '0.6rem' }} 
							/>
						</button>
					)}
					</div>
				</div>

				{/* Separador */}
				<div style={{
					width: '1px',
					height: '50px',
					background: 'rgba(255, 255, 255, 0.1)',
					borderRadius: '1px',
					alignSelf: 'stretch'
				}} />

				{/* SECCIÓN 2: TERMINALES */}
				{availableTerminals.length > 0 && (
					<div style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '0.4rem',
						minWidth: 'fit-content'
					}}>
						{/* Título */}
						<div style={{
							fontSize: '0.55rem',
							fontWeight: '700',
							color: themeColors.textSecondary || '#9E9E9E',
							textTransform: 'uppercase',
							letterSpacing: '0.5px',
							marginBottom: '0.2rem'
						}}>
							Terminales
						</div>
						{/* Botones */}
						<div style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.3rem',
							flexWrap: 'wrap'
						}}>
						{availableTerminals.slice(0, 4).map((terminal, index) => (
							<button
								key={index}
								title={terminal.label}
								onClick={terminal.action}
								style={{
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									width: '24px',
									height: '24px',
									borderRadius: '5px',
									background: `linear-gradient(135deg, ${terminal.color}25 0%, ${terminal.color}15 100%)`,
									border: `1px solid ${terminal.color}35`,
									boxShadow: `0 1px 4px ${terminal.color}20`,
									transition: 'all 0.2s ease',
									padding: 0,
									fontSize: '0.6rem'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = `linear-gradient(135deg, ${terminal.color}35 0%, ${terminal.color}25 100%)`;
									e.currentTarget.style.transform = 'scale(1.1)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = `linear-gradient(135deg, ${terminal.color}25 0%, ${terminal.color}15 100%)`;
									e.currentTarget.style.transform = 'scale(1)';
								}}
							>
								<i className={terminal.icon} style={{ color: terminal.color, fontSize: '0.6rem' }} />
							</button>
						))}

						{/* Botón Docker si hay contenedores */}
						{dockerContainers.length > 0 && (
							<button
								title={`Docker (${dockerContainers.length})`}
								onClick={() => handleOpenTerminal(`docker-${dockerContainers[0].name}`, { dockerContainer: dockerContainers[0] })}
								style={{
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									width: '24px',
									height: '24px',
									borderRadius: '5px',
									background: 'linear-gradient(135deg, rgba(36, 150, 237, 0.25) 0%, rgba(36, 150, 237, 0.15) 100%)',
									border: '1px solid rgba(36, 150, 237, 0.35)',
									boxShadow: '0 1px 4px rgba(36, 150, 237, 0.2)',
									transition: 'all 0.2s ease',
									padding: 0,
									position: 'relative',
									fontSize: '0.6rem'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = 'linear-gradient(135deg, rgba(36, 150, 237, 0.35) 0%, rgba(36, 150, 237, 0.25) 100%)';
									e.currentTarget.style.transform = 'scale(1.1)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = 'linear-gradient(135deg, rgba(36, 150, 237, 0.25) 0%, rgba(36, 150, 237, 0.15) 100%)';
									e.currentTarget.style.transform = 'scale(1)';
								}}
							>
								<i className="pi pi-box" style={{ color: '#2496ED', fontSize: '0.6rem' }} />
								{dockerContainers.length > 1 && (
									<span style={{
										position: 'absolute',
										top: '-6px',
										right: '-6px',
										background: '#ff4444',
										color: 'white',
										borderRadius: '50%',
										width: '12px',
										height: '12px',
										fontSize: '7px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontWeight: 'bold',
										border: '1px solid rgba(255,255,255,0.5)'
									}}>
										{dockerContainers.length}
									</span>
								)}
							</button>
						)}
						</div>
					</div>
				)}

				{/* Separador */}
				<div style={{
					width: '1px',
					height: '50px',
					background: 'rgba(255, 255, 255, 0.1)',
					borderRadius: '1px',
					alignSelf: 'stretch'
				}} />

				{/* SECCIÓN 3: SERVICIOS */}
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '0.4rem',
					minWidth: 'fit-content',
					flex: 1
				}}>
					{/* Título */}
					<div style={{
						fontSize: '0.55rem',
						fontWeight: '700',
						color: themeColors.textSecondary || '#9E9E9E',
						textTransform: 'uppercase',
						letterSpacing: '0.5px',
						marginBottom: '0.2rem'
					}}>
						Servicios
					</div>
					{/* Lista de servicios - EN UNA LÍNEA */}
					<div style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: '0.5rem',
						flexWrap: 'wrap'
					}}>
						{/* Nextcloud */}
						{(() => {
							const ncConfigured = !!syncState.configured;
							const ncColor = !ncConfigured ? '#9ca3af' : (syncState.connectivity === 'ok' ? '#22c55e' : (syncState.connectivity === 'checking' ? '#60a5fa' : '#ef4444'));
							const ncStatus = ncConfigured ? (syncState.connectivity === 'ok' ? 'conectado' : 'error') : 'no configurado';
							
							return (
								<div style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.3rem',
									padding: '0.2rem 0.5rem',
									borderRadius: '5px',
									background: 'rgba(255, 255, 255, 0.02)',
									border: `1px solid ${ncColor}25`,
									whiteSpace: 'nowrap'
								}}>
									{/* Indicador de estado */}
									<div style={{
										width: '6px',
										height: '6px',
										borderRadius: '50%',
										background: ncColor,
										boxShadow: `0 0 4px ${ncColor}60`,
										flexShrink: 0
									}} />
									{/* Nombre del servicio */}
									<span style={{
										fontSize: '0.6rem',
										fontWeight: '600',
										color: themeColors.textPrimary || '#fff'
									}}>
										Nextcloud
									</span>
									{/* Estado */}
									<span style={{
										fontSize: '0.55rem',
										color: ncColor,
										fontWeight: '500'
									}}>
										{ncStatus}
									</span>
									{/* Botón de configuración */}
									{onOpenSettings && (
										<button
											title="Configurar Nextcloud"
											onClick={onOpenSettings}
											style={{
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: '16px',
												height: '16px',
												borderRadius: '3px',
												background: 'rgba(79, 195, 247, 0.15)',
												border: '1px solid rgba(79, 195, 247, 0.3)',
												transition: 'all 0.2s ease',
												padding: 0,
												marginLeft: '0.2rem'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = 'rgba(79, 195, 247, 0.25)';
												e.currentTarget.style.transform = 'scale(1.1)';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = 'rgba(79, 195, 247, 0.15)';
												e.currentTarget.style.transform = 'scale(1)';
											}}
										>
											<i className="pi pi-cog" style={{ color: '#4fc3f7', fontSize: '0.5rem' }} />
										</button>
									)}
								</div>
							);
						})()}

						{/* Guacd */}
						{(() => {
							const gColor = guacdState.isRunning ? '#22c55e' : '#ef4444';
							const gStatus = guacdState.isRunning ? 'activo' : 'inactivo';
							
							return (
								<div style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.3rem',
									padding: '0.2rem 0.5rem',
									borderRadius: '5px',
									background: 'rgba(255, 255, 255, 0.02)',
									border: `1px solid ${gColor}25`,
									whiteSpace: 'nowrap'
								}}>
									{/* Indicador de estado */}
									<div style={{
										width: '6px',
										height: '6px',
										borderRadius: '50%',
										background: gColor,
										boxShadow: `0 0 4px ${gColor}60`,
										flexShrink: 0
									}} />
									{/* Nombre del servicio */}
									<span style={{
										fontSize: '0.6rem',
										fontWeight: '600',
										color: themeColors.textPrimary || '#fff'
									}}>
										Guacd
									</span>
									{/* Estado */}
									<span style={{
										fontSize: '0.55rem',
										color: gColor,
										fontWeight: '500'
									}}>
										{gStatus}
									</span>
									{/* Botón de configuración */}
									{onOpenSettings && (
										<button
											title="Configurar Guacd"
											onClick={onOpenSettings}
											style={{
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: '16px',
												height: '16px',
												borderRadius: '3px',
												background: 'rgba(79, 195, 247, 0.15)',
												border: '1px solid rgba(79, 195, 247, 0.3)',
												transition: 'all 0.2s ease',
												padding: 0,
												marginLeft: '0.2rem'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = 'rgba(79, 195, 247, 0.25)';
												e.currentTarget.style.transform = 'scale(1.1)';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = 'rgba(79, 195, 247, 0.15)';
												e.currentTarget.style.transform = 'scale(1)';
											}}
										>
											<i className="pi pi-cog" style={{ color: '#4fc3f7', fontSize: '0.5rem' }} />
										</button>
									)}
								</div>
							);
						})()}

						{/* Vault */}
						{(() => {
							const configured = vaultState.configured;
							const unlocked = vaultState.unlocked;
							const vColor = !configured ? '#9ca3af' : (unlocked ? '#22c55e' : '#f59e0b');
							const vStatus = !configured ? 'no configurado' : (unlocked ? 'desbloqueado' : 'bloqueado');
							
							return (
								<div style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.3rem',
									padding: '0.2rem 0.5rem',
									borderRadius: '5px',
									background: 'rgba(255, 255, 255, 0.02)',
									border: `1px solid ${vColor}25`,
									whiteSpace: 'nowrap'
								}}>
									{/* Indicador de estado */}
									<div style={{
										width: '6px',
										height: '6px',
										borderRadius: '50%',
										background: vColor,
										boxShadow: `0 0 4px ${vColor}60`,
										flexShrink: 0
									}} />
									{/* Nombre del servicio */}
									<span style={{
										fontSize: '0.6rem',
										fontWeight: '600',
										color: themeColors.textPrimary || '#fff'
									}}>
										Vault
									</span>
									{/* Estado */}
									<span style={{
										fontSize: '0.55rem',
										color: vColor,
										fontWeight: '500'
									}}>
										{vStatus}
									</span>
									{/* Botón de configuración */}
									{onOpenSettings && (
										<button
											title="Configurar Vault"
											onClick={onOpenSettings}
											style={{
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: '16px',
												height: '16px',
												borderRadius: '3px',
												background: 'rgba(79, 195, 247, 0.15)',
												border: '1px solid rgba(79, 195, 247, 0.3)',
												transition: 'all 0.2s ease',
												padding: 0,
												marginLeft: '0.2rem'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = 'rgba(79, 195, 247, 0.25)';
												e.currentTarget.style.transform = 'scale(1.1)';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = 'rgba(79, 195, 247, 0.15)';
												e.currentTarget.style.transform = 'scale(1)';
											}}
										>
											<i className="pi pi-cog" style={{ color: '#4fc3f7', fontSize: '0.5rem' }} />
										</button>
									)}
								</div>
							);
						})()}

						{/* Ollama */}
						{(() => {
							const isRunning = ollamaState.isRunning;
							const oColor = isRunning ? '#22c55e' : '#ef4444';
							const oStatus = isRunning ? 'activo' : 'inactivo';
							
							return (
								<div style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.3rem',
									padding: '0.2rem 0.5rem',
									borderRadius: '5px',
									background: 'rgba(255, 255, 255, 0.02)',
									border: `1px solid ${oColor}25`,
									whiteSpace: 'nowrap'
								}}>
									{/* Indicador de estado */}
									<div style={{
										width: '6px',
										height: '6px',
										borderRadius: '50%',
										background: oColor,
										boxShadow: `0 0 4px ${oColor}60`,
										flexShrink: 0
									}} />
									{/* Nombre del servicio */}
									<span style={{
										fontSize: '0.6rem',
										fontWeight: '600',
										color: themeColors.textPrimary || '#fff'
									}}>
										Ollama
									</span>
									{/* Estado */}
									<span style={{
										fontSize: '0.55rem',
										color: oColor,
										fontWeight: '500'
									}}>
										{oStatus}
									</span>
									{/* Botón de configuración */}
									{onOpenSettings && (
										<button
											title="Configurar Ollama"
											onClick={onOpenSettings}
											style={{
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: '16px',
												height: '16px',
												borderRadius: '3px',
												background: 'rgba(79, 195, 247, 0.15)',
												border: '1px solid rgba(79, 195, 247, 0.3)',
												transition: 'all 0.2s ease',
												padding: 0,
												marginLeft: '0.2rem'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = 'rgba(79, 195, 247, 0.25)';
												e.currentTarget.style.transform = 'scale(1.1)';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = 'rgba(79, 195, 247, 0.15)';
												e.currentTarget.style.transform = 'scale(1)';
											}}
										>
											<i className="pi pi-cog" style={{ color: '#4fc3f7', fontSize: '0.5rem' }} />
										</button>
									)}
								</div>
							);
						})()}
					</div>
				</div>

				{/* Separador */}
				<div style={{
					width: '1px',
					height: '50px',
					background: 'rgba(255, 255, 255, 0.1)',
					borderRadius: '1px',
					alignSelf: 'stretch'
				}} />

				{/* SECCIÓN 4: ESTADÍSTICAS */}
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '0.4rem',
					minWidth: 'fit-content',
					marginLeft: 'auto'
				}}>
					{/* Título */}
					<div style={{
						fontSize: '0.55rem',
						fontWeight: '700',
						color: themeColors.textSecondary || '#9E9E9E',
						textTransform: 'uppercase',
						letterSpacing: '0.5px',
						marginBottom: '0.2rem'
					}}>
						Estadísticas
					</div>
					{/* KPI Compacto - "Quesito" */}
					<div style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.3rem',
						padding: '0.4rem 0.6rem',
						background: 'rgba(255, 255, 255, 0.05)',
						borderRadius: '6px',
						border: '1px solid rgba(255, 255, 255, 0.1)'
					}}>
					<i className="pi pi-chart-pie" style={{ color: '#4fc3f7', fontSize: '0.6rem' }} />
					
					{/* SSH */}
					<span style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.2rem',
						fontSize: '0.65rem',
						fontWeight: '700',
						color: themeColors.textPrimary || '#fff'
					}}>
						<i className="pi pi-server" style={{ color: '#4fc3f7', fontSize: '0.5rem' }} />
						{sshConnectionsCount}
					</span>

					<div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.2)' }} />

					{/* RDP */}
					<span style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.2rem',
						fontSize: '0.65rem',
						fontWeight: '700',
						color: themeColors.textPrimary || '#fff'
					}}>
						<i className="pi pi-desktop" style={{ color: '#ff6b35', fontSize: '0.5rem' }} />
						{rdpConnectionsCount}
					</span>

					<div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.2)' }} />

					{/* Keys */}
					<span style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.2rem',
						fontSize: '0.65rem',
						fontWeight: '700',
						color: themeColors.textPrimary || '#fff'
					}}>
						<i className="pi pi-key" style={{ color: '#FFC107', fontSize: '0.5rem' }} />
						{passwordsCount}
					</span>
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
};

export default NodeTermStatus;
