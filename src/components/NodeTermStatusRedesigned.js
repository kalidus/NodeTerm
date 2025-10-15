import React, { useState, useEffect, useRef } from 'react';
import { getVersionInfo } from '../version-info';
import SyncManager from '../utils/SyncManager';
import SecureStorage from '../services/SecureStorage';

const NodeTermStatusRedesigned = ({ sshConnectionsCount = 0, foldersCount = 0, rdpConnectionsCount = 0 }) => {
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

	// Calcular progreso (ejemplo: 677/1024)
	const totalConnections = sshConnectionsCount + rdpConnectionsCount + passwordsCount + foldersCount;
	const maxConnections = 1024; // Valor máximo para el progreso
	const progressPercentage = Math.min((totalConnections / maxConnections) * 100, 100);
	const progressValue = Math.min(totalConnections, maxConnections);

	// Componente de progreso circular
	const CircularProgress = ({ percentage, value, max, size = 80 }) => {
		const radius = (size - 8) / 2;
		const circumference = 2 * Math.PI * radius;
		const strokeDasharray = circumference;
		const strokeDashoffset = circumference - (percentage / 100) * circumference;

		return (
			<div style={{ position: 'relative', width: size, height: size }}>
				<svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
					{/* Fondo del círculo */}
					<circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						fill="none"
						stroke="rgba(255,255,255,0.1)"
						strokeWidth="4"
					/>
					{/* Progreso */}
					<circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						fill="none"
						stroke="#4fc3f7"
						strokeWidth="4"
						strokeLinecap="round"
						strokeDasharray={strokeDasharray}
						strokeDashoffset={strokeDashoffset}
						style={{
							filter: 'drop-shadow(0 0 8px rgba(79, 195, 247, 0.5))',
							transition: 'stroke-dashoffset 0.5s ease'
						}}
					/>
				</svg>
				{/* Texto en el centro */}
				<div style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					textAlign: 'center',
					color: 'var(--text-color)'
				}}>
					<div style={{ fontSize: '0.8rem', fontWeight: '700', lineHeight: '1' }}>
						{value}/{max}
					</div>
				</div>
			</div>
		);
	};

	// Componente de estadística
	const StatItem = ({ icon, value, label, color = '#4fc3f7' }) => (
		<div style={{
			display: 'flex',
			alignItems: 'center',
			gap: '0.5rem',
			padding: '0.5rem',
			borderRadius: '8px',
			background: 'rgba(255,255,255,0.02)',
			border: '1px solid rgba(255,255,255,0.05)'
		}}>
			<div style={{
				width: '20px',
				height: '20px',
				borderRadius: '4px',
				background: `${color}20`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center'
			}}>
				<i className={icon} style={{ color, fontSize: '0.6rem' }} />
			</div>
			<div>
				<div style={{ color: 'var(--text-color)', fontWeight: '700', fontSize: '0.7rem' }}>
					{value}
				</div>
				<div style={{ color: 'var(--text-color-secondary)', fontSize: '0.5rem' }}>
					{label}
				</div>
			</div>
		</div>
	);

	return (
		<div style={{ 
			padding: '1rem',
			background: 'rgba(16, 20, 28, 0.6)',
			backdropFilter: 'blur(10px) saturate(140%)',
			borderRadius: '12px',
			border: '1px solid rgba(255,255,255,0.1)'
		}}>
			{/* Título */}
			<div style={{ 
				display: 'flex', 
				alignItems: 'center', 
				gap: '0.5rem', 
				marginBottom: '1rem' 
			}}>
				<i className="pi pi-chart-bar" style={{ color: '#4fc3f7' }} />
				<h3 style={{ 
					margin: 0, 
					color: 'var(--text-color)', 
					fontSize: '0.9rem',
					fontWeight: '600'
				}}>
					Estado de NodeTerm
				</h3>
			</div>
			
			{/* Progreso circular y estadísticas */}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				gap: '1rem',
				marginBottom: '1rem'
			}}>
				{/* Progreso circular */}
				<CircularProgress 
					percentage={progressPercentage}
					value={progressValue}
					max={maxConnections}
					size={80}
				/>
				
				{/* Estadísticas */}
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '0.3rem',
					flex: 1
				}}>
					<StatItem 
						icon="pi pi-server" 
						value={sshConnectionsCount} 
						label="Conexiones SSH" 
						color="#4fc3f7"
					/>
					<StatItem 
						icon="pi pi-desktop" 
						value={rdpConnectionsCount} 
						label="Conexiones RDP" 
						color="#ff6b35"
					/>
					<StatItem 
						icon="pi pi-key" 
						value={passwordsCount} 
						label="Passwords" 
						color="#FFC107"
					/>
				</div>
			</div>

			{/* Estado de servicios */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
				{/* Nextcloud */}
				{(() => {
					const ncConfigured = !!syncState.configured;
					const ncColor = !ncConfigured ? '#9ca3af' : (syncState.connectivity === 'ok' ? '#22c55e' : (syncState.connectivity === 'checking' ? '#60a5fa' : '#ef4444'));
					const ncLabel = ncConfigured ? (syncState.connectivity === 'ok' ? 'nextcloud' : (syncState.connectivity === 'checking' ? 'Comprobando...' : 'Error')) : 'Nextcloud no configurado';
					const ncStatus = ncConfigured ? (syncState.connectivity === 'ok' ? 'conectado' : (syncState.connectivity === 'checking' ? 'Verificando...' : 'Error de conexión')) : 'No configurado';
					const ncSubStatus = ncConfigured && syncState.connectivity === 'ok' ? 'Sincronización activa' : '';
					
					return (
						<div style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem',
							padding: '0.5rem',
							borderRadius: '8px',
							background: `${ncColor}15`,
							border: `1px solid ${ncColor}30`
						}}>
							<div style={{
								width: '24px',
								height: '24px',
								borderRadius: '6px',
								background: `${ncColor}30`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center'
							}}>
								<i className="pi pi-cloud" style={{ color: ncColor, fontSize: '0.7rem' }} />
							</div>
							<div>
								<div style={{ color: 'var(--text-color)', fontWeight: '600', fontSize: '0.6rem' }}>
									{ncLabel}
								</div>
								<div style={{ color: 'var(--text-color-secondary)', fontSize: '0.5rem' }}>
									{ncStatus}
								</div>
								{ncSubStatus && (
									<div style={{ color: 'var(--text-color-secondary)', fontSize: '0.4rem', marginTop: '0.1rem' }}>
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
					const gLabel = guacdState.isRunning ? 'docker activo' : 'Docker detenido';
					const gStatus = guacdState.isRunning ? 'Sesión activa' : 'Inactivo';
					const gSubStatus = guacdState.isRunning ? `${guacdState.host}:${guacdState.port}` : 'Preferido: Docker/WSL';
					
					return (
						<div style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem',
							padding: '0.5rem',
							borderRadius: '8px',
							background: `${gColor}15`,
							border: `1px solid ${gColor}30`
						}}>
							<div style={{
								width: '24px',
								height: '24px',
								borderRadius: '6px',
								background: `${gColor}30`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center'
							}}>
								<i className="pi pi-desktop" style={{ color: gColor, fontSize: '0.7rem' }} />
							</div>
							<div>
								<div style={{ color: 'var(--text-color)', fontWeight: '600', fontSize: '0.6rem' }}>
									{gLabel}
								</div>
								<div style={{ color: 'var(--text-color-secondary)', fontSize: '0.5rem' }}>
									{gStatus}
								</div>
								<div style={{ color: 'var(--text-color-secondary)', fontSize: '0.4rem', marginTop: '0.1rem' }}>
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
							gap: '0.5rem',
							padding: '0.5rem',
							borderRadius: '8px',
							background: `${vColor}15`,
							border: `1px solid ${vColor}30`
						}}>
							<div style={{
								width: '24px',
								height: '24px',
								borderRadius: '6px',
								background: `${vColor}30`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center'
							}}>
								<i className="pi pi-lock" style={{ color: vColor, fontSize: '0.7rem' }} />
							</div>
							<div>
								<div style={{ color: 'var(--text-color)', fontWeight: '600', fontSize: '0.6rem' }}>
									{vLabel}
								</div>
								<div style={{ color: 'var(--text-color-secondary)', fontSize: '0.5rem' }}>
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

export default NodeTermStatusRedesigned;
