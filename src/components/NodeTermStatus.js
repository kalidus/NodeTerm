import React, { useState, useEffect, useRef } from 'react';
import { getVersionInfo } from '../version-info';
import SyncManager from '../utils/SyncManager';
import SecureStorage from '../services/SecureStorage';

const NodeTermStatus = ({ sshConnectionsCount = 0, foldersCount = 0, rdpConnectionsCount = 0 }) => {
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
				// Probar conexión de forma asíncrona (no bloqueante)
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
				// Intentar cargar clave (si está desbloqueada en sesión)
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

	const StatusPill = ({ color, icon, label, sublabel }) => (
		<div style={{
			display: 'flex',
			alignItems: 'center',
			gap: 10,
			padding: '8px 10px',
			borderRadius: 10,
			border: '1px solid rgba(255,255,255,0.12)',
			background: `linear-gradient(135deg, ${color}22, ${color}11)`,
			boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
		}}>
			<span style={{
				width: 28,
				height: 28,
				borderRadius: 8,
				background: `${color}33`,
				border: '1px solid rgba(255,255,255,0.14)',
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center'
			}}>
				<i className={icon} style={{ color, fontSize: 14 }} />
			</span>
			<div style={{ minWidth: 0 }}>
				<div style={{ color: 'var(--text-color)', fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
				{sublabel && <div style={{ color: 'var(--text-color-secondary)', fontSize: 11 }}>{sublabel}</div>}
			</div>
		</div>
	);

	// Obtener número de passwords (contador fiable o conteo en claro)
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

	const { appVersion } = getVersionInfo();
	const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#3b82f6';

	return (
		<div style={{ padding: '1rem' }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
				<i className="pi pi-chart-bar" style={{ color: 'var(--primary-color)' }} />
				<h3 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.1rem' }}>Estado de NodeTerm</h3>
			</div>
			
			{/* Estadísticas principales */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: '1fr 1fr 1fr 1fr',
				alignItems: 'center',
				gap: 8,
				padding: '6px 10px',
				borderRadius: 10,
				border: `1px solid ${primary.trim()}55`,
				background: `linear-gradient(135deg, ${primary.trim()}22, ${primary.trim()}11)`,
				boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
				marginBottom: 10
			}}>
				<div style={{ textAlign: 'center' }}>
					<div style={{ color: primary, fontWeight: 800, fontSize: 14 }}>{sshConnectionsCount}</div>
					<div style={{ color: 'var(--text-color-secondary)', fontSize: 11 }}>Conexiones SSH</div>
				</div>
				<div style={{ textAlign: 'center' }}>
					<div style={{ color: primary, fontWeight: 800, fontSize: 14 }}>{rdpConnectionsCount}</div>
					<div style={{ color: 'var(--text-color-secondary)', fontSize: 11 }}>Conexiones RDP</div>
				</div>
				<div style={{ textAlign: 'center' }}>
					<div style={{ color: primary, fontWeight: 800, fontSize: 14 }}>{passwordsCount}</div>
					<div style={{ color: 'var(--text-color-secondary)', fontSize: 11 }}>Passwords</div>
				</div>
				<div style={{ textAlign: 'center' }}>
					<div style={{ color: primary, fontWeight: 800, fontSize: 14 }}>{foldersCount}</div>
					<div style={{ color: 'var(--text-color-secondary)', fontSize: 11 }}>Carpetas</div>
				</div>
			</div>

			{/* Estado de servicios */}
			<div style={{ display: 'grid', gap: 10 }}>
				{/* Nextcloud */}
				{(() => {
					const ncConfigured = !!syncState.configured;
					const ncColor = !ncConfigured ? '#9ca3af' : (syncState.connectivity === 'ok' ? '#22c55e' : (syncState.connectivity === 'checking' ? '#60a5fa' : '#ef4444'));
					const ncLabel = ncConfigured ? (syncState.connectivity === 'ok' ? 'Nextcloud conectado' : (syncState.connectivity === 'checking' ? 'Comprobando Nextcloud…' : 'Error conectando a Nextcloud')) : 'Nextcloud no configurado';
					const last = getRelativeTime(syncState.lastSync);
					return (
						<StatusPill color={ncColor} icon="pi pi-cloud" label={ncLabel} sublabel={last ? `Última sync: ${last}` : (ncConfigured ? 'Sync habilitada' : 'Configura Nextcloud en ajustes')} />
					);
				})()}

				{/* Guacd */}
				{(() => {
					const gColor = guacdState.isRunning ? '#22c55e' : '#ef4444';
					const method = (guacdState.method || 'unknown').toUpperCase();
					const label = guacdState.isRunning ? `Guacd activo (${method})` : 'Guacd detenido';
					const sub = guacdState.isRunning ? `${guacdState.host}:${guacdState.port}` : 'Preferido: Docker/WSL';
					return (
						<StatusPill color={gColor} icon="pi pi-desktop" label={label} sublabel={sub} />
					);
				})()}

				{/* Vault */}
				{(() => {
					const configured = vaultState.configured;
					const unlocked = vaultState.unlocked;
					const vColor = !configured ? '#9ca3af' : (unlocked ? '#22c55e' : '#f59e0b');
					const vLabel = !configured ? 'Vault no configurado' : (unlocked ? 'Vault desbloqueado' : 'Vault bloqueado');
					const vSub = !configured ? 'Configura la clave maestra' : (unlocked ? 'Sesión activa' : 'Se requerirá clave maestra');
					return (
						<StatusPill color={vColor} icon="pi pi-lock" label={vLabel} sublabel={vSub} />
					);
				})()}
			</div>
		</div>
	);
};

export default NodeTermStatus;
