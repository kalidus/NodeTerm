import React, { useState, useEffect, useRef } from 'react';
import { getVersionInfo } from '../version-info';
import SyncManager from '../utils/SyncManager';
import SecureStorage from '../services/SecureStorage';

const NodeTermStatus = ({ sshConnectionsCount = 0, foldersCount = 0, rdpConnectionsCount = 0, themeColors = {} }) => {
	const [syncState, setSyncState] = useState({ configured: false, enabled: false, lastSync: null, connectivity: 'unknown' });
	const [guacdState, setGuacdState] = useState({ isRunning: false, method: 'unknown', host: '127.0.0.1', port: 4822 });
	const [vaultState, setVaultState] = useState({ configured: false, unlocked: false });
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
		return () => { if (intervalId) clearInterval(intervalId); };
	}, []);

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
					color: 'var(--text-color)', 
					fontWeight: '700', 
					fontSize: compact ? '0.6rem' : '0.7rem',
					lineHeight: '1.2'
				}}>
					{value}
				</div>
				<div style={{ 
					color: 'var(--text-color-secondary)', 
					fontSize: compact ? '0.45rem' : '0.5rem',
					lineHeight: '1.2'
				}}>
					{label}
				</div>
			</div>
		</div>
	);

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
				marginBottom: '1.2rem',
				padding: '0.75rem',
				background: 'rgba(255,255,255,0.02)',
				borderRadius: '10px',
				border: '1px solid rgba(255,255,255,0.05)'
			}}>
				{/* SSH */}
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					padding: '0.5rem',
					background: 'linear-gradient(135deg, rgba(79, 195, 247, 0.1) 0%, rgba(79, 195, 247, 0.05) 100%)',
					borderRadius: '6px',
					border: '1px solid rgba(79, 195, 247, 0.2)',
					position: 'relative',
					overflow: 'hidden'
				}}>
					<div style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						height: '1.5px',
						background: 'linear-gradient(90deg, transparent, #4fc3f7, transparent)'
					}} />
					<div style={{
						width: '24px',
						height: '24px',
						borderRadius: '6px',
						background: 'rgba(79, 195, 247, 0.2)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						marginBottom: '0.3rem',
						boxShadow: '0 1px 4px rgba(79, 195, 247, 0.2)'
					}}>
						<i className="pi pi-server" style={{ color: '#4fc3f7', fontSize: '0.6rem' }} />
					</div>
					<div style={{
						color: themeColors.textPrimary || 'var(--text-color)',
						fontSize: '0.9rem',
						fontWeight: '700',
						marginBottom: '0.1rem'
					}}>
						{sshConnectionsCount}
					</div>
					<div style={{
						color: themeColors.textSecondary || '#9E9E9E',
						fontSize: '0.5rem',
						fontWeight: '500',
						textTransform: 'uppercase',
						letterSpacing: '0.3px'
					}}>
						SSH
					</div>
				</div>

				{/* RDP */}
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					padding: '0.5rem',
					background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 107, 53, 0.05) 100%)',
					borderRadius: '6px',
					border: '1px solid rgba(255, 107, 53, 0.2)',
					position: 'relative',
					overflow: 'hidden'
				}}>
					<div style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						height: '1.5px',
						background: 'linear-gradient(90deg, transparent, #ff6b35, transparent)'
					}} />
					<div style={{
						width: '24px',
						height: '24px',
						borderRadius: '6px',
						background: 'rgba(255, 107, 53, 0.2)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						marginBottom: '0.3rem',
						boxShadow: '0 1px 4px rgba(255, 107, 53, 0.2)'
					}}>
						<i className="pi pi-desktop" style={{ color: '#ff6b35', fontSize: '0.6rem' }} />
					</div>
					<div style={{
						color: themeColors.textPrimary || 'var(--text-color)',
						fontSize: '0.9rem',
						fontWeight: '700',
						marginBottom: '0.1rem'
					}}>
						{rdpConnectionsCount}
					</div>
					<div style={{
						color: themeColors.textSecondary || '#9E9E9E',
						fontSize: '0.5rem',
						fontWeight: '500',
						textTransform: 'uppercase',
						letterSpacing: '0.3px'
					}}>
						RDP
					</div>
				</div>

				{/* Passwords */}
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					padding: '0.5rem',
					background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%)',
					borderRadius: '6px',
					border: '1px solid rgba(255, 193, 7, 0.2)',
					position: 'relative',
					overflow: 'hidden'
				}}>
					<div style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						height: '1.5px',
						background: 'linear-gradient(90deg, transparent, #FFC107, transparent)'
					}} />
					<div style={{
						width: '24px',
						height: '24px',
						borderRadius: '6px',
						background: 'rgba(255, 193, 7, 0.2)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						marginBottom: '0.3rem',
						boxShadow: '0 1px 4px rgba(255, 193, 7, 0.2)'
					}}>
						<i className="pi pi-key" style={{ color: '#FFC107', fontSize: '0.6rem' }} />
					</div>
					<div style={{
						color: themeColors.textPrimary || 'var(--text-color)',
						fontSize: '0.9rem',
						fontWeight: '700',
						marginBottom: '0.1rem'
					}}>
						{passwordsCount}
					</div>
					<div style={{
						color: themeColors.textSecondary || '#9E9E9E',
						fontSize: '0.5rem',
						fontWeight: '500',
						textTransform: 'uppercase',
						letterSpacing: '0.3px'
					}}>
						Keys
					</div>
				</div>
			</div>

			{/* Estado de servicios con diseño moderno */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
				{/* Nextcloud */}
				{(() => {
					const ncConfigured = !!syncState.configured;
					const ncColor = !ncConfigured ? '#9ca3af' : (syncState.connectivity === 'ok' ? '#22c55e' : (syncState.connectivity === 'checking' ? '#60a5fa' : '#ef4444'));
					const ncLabel = ncConfigured ? (syncState.connectivity === 'ok' ? 'nextcloud' : (syncState.connectivity === 'checking' ? 'Comprobando...' : 'Error')) : 'Nextcloud no configurado';
					const ncStatus = ncConfigured ? (syncState.connectivity === 'ok' ? 'conectado' : (syncState.connectivity === 'checking' ? 'Verificando...' : 'Error de conexión')) : 'No configurado';
					const ncSubStatus = ncConfigured && syncState.connectivity === 'ok' ? 'Sincronización activa' : '';
					const last = getRelativeTime(syncState.lastSync);
					
					return (
						<div style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.75rem',
							padding: '0.75rem',
							borderRadius: '10px',
							background: 'rgba(255,255,255,0.02)',
							border: `1px solid ${ncColor}30`,
							position: 'relative',
							overflow: 'hidden'
						}}>
							{/* Indicador de estado */}
							<div style={{
								position: 'absolute',
								top: 0,
								left: 0,
								width: '3px',
								height: '100%',
								background: ncColor,
								borderRadius: '0 2px 2px 0'
							}} />
							
							<div style={{
								width: '28px',
								height: '28px',
								borderRadius: '8px',
								background: `${ncColor}20`,
								border: `1px solid ${ncColor}40`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								boxShadow: `0 2px 4px ${ncColor}20`
							}}>
								<i className="pi pi-cloud" style={{ color: ncColor, fontSize: '0.8rem' }} />
							</div>
							
							<div style={{ flex: 1 }}>
								<div style={{ 
									display: 'flex', 
									alignItems: 'center', 
									gap: '0.5rem',
									marginBottom: '0.2rem'
								}}>
									<span style={{ 
										color: 'var(--text-color)', 
										fontWeight: '600', 
										fontSize: '0.7rem' 
									}}>
										{ncLabel}
									</span>
									<div style={{
										width: '6px',
										height: '6px',
										borderRadius: '50%',
										background: ncColor,
										boxShadow: `0 0 4px ${ncColor}60`
									}} />
								</div>
								<div style={{ 
									color: 'var(--text-color-secondary)', 
									fontSize: '0.55rem',
									lineHeight: '1.3'
								}}>
									{last ? `Última sync: ${last}` : ncStatus}
								</div>
								{ncSubStatus && (
									<div style={{ 
										color: ncColor, 
										fontSize: '0.5rem', 
										marginTop: '0.2rem',
										fontWeight: '500'
									}}>
										{ncSubStatus}
									</div>
								)}
							</div>
						</div>
					);
				})()}

				{/* Docker/Guacd */}
				{(() => {
					const gColor = guacdState.isRunning ? '#22c55e' : '#ef4444';
					
					// Determinar el método y etiqueta correctos
					let gLabel, gStatus, gSubStatus;
					if (guacdState.isRunning) {
						const method = guacdState.method || 'unknown';
						switch (method.toLowerCase()) {
							case 'docker':
								gLabel = 'docker activo';
								gStatus = 'Sesión activa';
								break;
							case 'wsl':
								gLabel = 'wsl activo';
								gStatus = 'Sesión activa';
								break;
							case 'native':
								gLabel = 'nativo activo';
								gStatus = 'Sesión activa';
								break;
							case 'mock':
								gLabel = 'modo simulación';
								gStatus = 'Simulando';
								break;
							default:
								gLabel = 'guacd activo';
								gStatus = 'Sesión activa';
						}
						gSubStatus = `${guacdState.host}:${guacdState.port}`;
					} else {
						gLabel = 'Guacd detenido';
						gStatus = 'Inactivo';
						gSubStatus = 'Preferido: Docker/WSL';
					}
					
					return (
						<div style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.75rem',
							padding: '0.75rem',
							borderRadius: '10px',
							background: 'rgba(255,255,255,0.02)',
							border: `1px solid ${gColor}30`,
							position: 'relative',
							overflow: 'hidden'
						}}>
							{/* Indicador de estado */}
							<div style={{
								position: 'absolute',
								top: 0,
								left: 0,
								width: '3px',
								height: '100%',
								background: gColor,
								borderRadius: '0 2px 2px 0'
							}} />
							
							<div style={{
								width: '28px',
								height: '28px',
								borderRadius: '8px',
								background: `${gColor}20`,
								border: `1px solid ${gColor}40`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								boxShadow: `0 2px 4px ${gColor}20`
							}}>
								<i className="pi pi-desktop" style={{ color: gColor, fontSize: '0.8rem' }} />
							</div>
							
							<div style={{ flex: 1 }}>
								<div style={{ 
									display: 'flex', 
									alignItems: 'center', 
									gap: '0.5rem',
									marginBottom: '0.2rem'
								}}>
									<span style={{ 
										color: 'var(--text-color)', 
										fontWeight: '600', 
										fontSize: '0.7rem' 
									}}>
										{gLabel}
									</span>
									<div style={{
										width: '6px',
										height: '6px',
										borderRadius: '50%',
										background: gColor,
										boxShadow: `0 0 4px ${gColor}60`
									}} />
								</div>
								<div style={{ 
									color: 'var(--text-color-secondary)', 
									fontSize: '0.55rem',
									lineHeight: '1.3'
								}}>
									{gStatus}
								</div>
								<div style={{ 
									color: gColor, 
									fontSize: '0.5rem', 
									marginTop: '0.2rem',
									fontWeight: '500'
								}}>
									{gSubStatus}
								</div>
							</div>
						</div>
					);
				})()}

				{/* Vault */}
				{(() => {
					const configured = vaultState.configured;
					const unlocked = vaultState.unlocked;
					const vColor = !configured ? '#9ca3af' : (unlocked ? '#22c55e' : '#f59e0b');
					const vLabel = !configured ? 'Vault no configurado' : (unlocked ? 'Vault desbloqueado' : 'Vault bloqueado');
					const vStatus = !configured ? 'Configura la clave maestra' : (unlocked ? 'Sesión activa' : 'Se requerirá clave maestra');
					
					return (
						<div style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.75rem',
							padding: '0.75rem',
							borderRadius: '10px',
							background: 'rgba(255,255,255,0.02)',
							border: `1px solid ${vColor}30`,
							position: 'relative',
							overflow: 'hidden'
						}}>
							{/* Indicador de estado */}
							<div style={{
								position: 'absolute',
								top: 0,
								left: 0,
								width: '3px',
								height: '100%',
								background: vColor,
								borderRadius: '0 2px 2px 0'
							}} />
							
							<div style={{
								width: '28px',
								height: '28px',
								borderRadius: '8px',
								background: `${vColor}20`,
								border: `1px solid ${vColor}40`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								boxShadow: `0 2px 4px ${vColor}20`
							}}>
								<i className={unlocked ? "pi pi-unlock" : "pi pi-lock"} style={{ color: vColor, fontSize: '0.8rem' }} />
							</div>
							
							<div style={{ flex: 1 }}>
								<div style={{ 
									display: 'flex', 
									alignItems: 'center', 
									gap: '0.5rem',
									marginBottom: '0.2rem'
								}}>
									<span style={{ 
										color: 'var(--text-color)', 
										fontWeight: '600', 
										fontSize: '0.7rem' 
									}}>
										{vLabel}
									</span>
									<div style={{
										width: '6px',
										height: '6px',
										borderRadius: '50%',
										background: vColor,
										boxShadow: `0 0 4px ${vColor}60`
									}} />
								</div>
								<div style={{ 
									color: 'var(--text-color-secondary)', 
									fontSize: '0.55rem',
									lineHeight: '1.3'
								}}>
									{vStatus}
								</div>
							</div>
						</div>
					);
				})()}
			</div>
		</div>
	);
};

export default NodeTermStatus;

