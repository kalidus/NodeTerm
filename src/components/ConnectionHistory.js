import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';
import { getFavorites, getRecents, toggleFavorite, isFavorite, onUpdate } from '../utils/connectionStore';
import SyncManager from '../utils/SyncManager';
import SecureStorage from '../services/SecureStorage';

const ConnectionHistory = ({ onConnectToHistory, layout = 'two-columns', recentsLimit = 10, activeIds = new Set(), onEdit, templateColumns, favoritesColumns = 2, recentsColumns = 1 }) => {
	const [recentConnections, setRecentConnections] = useState([]);
	const [favoriteConnections, setFavoriteConnections] = useState([]);
	const [favType, setFavType] = useState(() => localStorage.getItem('nodeterm_fav_type') || 'all');
	const [recType, setRecType] = useState('all');
	const [favQuery, setFavQuery] = useState('');
	const [recQuery, setRecQuery] = useState('');
	const [syncState, setSyncState] = useState({ configured: false, enabled: false, lastSync: null, connectivity: 'unknown' });
	const [guacdState, setGuacdState] = useState({ isRunning: false, method: 'unknown', host: '127.0.0.1', port: 4822 });
	const [vaultState, setVaultState] = useState({ configured: false, unlocked: false });
	const syncManagerRef = useRef(null);
	const secureStorageRef = useRef(null);

	useEffect(() => {
		loadConnectionHistory();
		const off = onUpdate(() => loadConnectionHistory());
		return () => off && off();
	}, [recentsLimit]);

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

	const loadConnectionHistory = () => {
		try {
			const favs = getFavorites();
			const recents = getRecents(recentsLimit);
			setFavoriteConnections(favs.map(c => ({ ...c, isFavorite: true, status: 'success' })));
			setRecentConnections(recents.map(c => ({ ...c, isFavorite: isFavorite(c.id), status: 'success' })));
		} catch (error) {
			console.error('Error cargando historial de conexiones:', error);
		}
	};

	const getConnectionTypeIcon = (type) => {
		switch (type) {
			case 'ssh':
				return 'pi pi-server';
			case 'rdp-guacamole':
				return 'pi pi-desktop';
			case 'explorer':
				return 'pi pi-folder-open';
			case 'group':
				return 'pi pi-th-large';
			default:
				return 'pi pi-circle';
		}
	};

	const getConnectionTypeColor = (type) => {
		switch (type) {
			case 'ssh':
				return '#4fc3f7';
			case 'rdp-guacamole':
				return '#ff6b35';
			case 'explorer':
				return '#FFB300';
			case 'group':
				return '#9c27b0';
			default:
				return '#9E9E9E';
		}
	};

	const TypeChips = ({ value, onChange }) => (
		<div style={{ display: 'flex', gap: 6 }}>
			{[
				{ key: 'all', label: 'Todos' },
				{ key: 'ssh', label: 'SSH' },
				{ key: 'rdp-guacamole', label: 'RDP' },
				{ key: 'explorer', label: 'SFTP' },
				{ key: 'group', label: 'Grupos' }
			].map(opt => (
				<button
					key={opt.key}
					onClick={() => { onChange(opt.key); if (onChange === setFavType) localStorage.setItem('nodeterm_fav_type', opt.key); }}
					style={{
						padding: '2px 8px',
						borderRadius: 999,
						border: '1px solid rgba(255,255,255,0.14)',
						background: value === opt.key ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
						color: 'var(--text-color)',
						fontSize: 11,
						cursor: 'pointer',
						backdropFilter: 'blur(8px) saturate(130%)'
					}}
				>{opt.label}</button>
			))}
		</div>
	);

	// TypeChips específico para recientes (sin grupos)
	const RecentsTypeChips = ({ value, onChange }) => (
		<div style={{ display: 'flex', gap: 6 }}>
			{[
				{ key: 'all', label: 'Todos' },
				{ key: 'ssh', label: 'SSH' },
				{ key: 'rdp-guacamole', label: 'RDP' },
				{ key: 'explorer', label: 'SFTP' }
			].map(opt => (
				<button
					key={opt.key}
					onClick={() => { onChange(opt.key); }}
					style={{
						padding: '2px 8px',
						borderRadius: 999,
						border: '1px solid rgba(255,255,255,0.14)',
						background: value === opt.key ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
						color: 'var(--text-color)',
						fontSize: 11,
						cursor: 'pointer',
						backdropFilter: 'blur(8px) saturate(130%)'
					}}
				>{opt.label}</button>
			))}
		</div>
	);

	const applyTypeFilter = (items, type) => {
		if (type === 'all') return items;
		return items.filter(c => c.type === type);
	};

	// Filtro específico para recientes que excluye grupos
	const applyRecentsTypeFilter = (items, type) => {
		// Primero excluir grupos de recientes
		const nonGroupItems = items.filter(c => c.type !== 'group');
		if (type === 'all') return nonGroupItems;
		return nonGroupItems.filter(c => c.type === type);
	};

	const applyQueryFilter = (items, query) => {
		if (!query) return items;
		const q = query.toLowerCase();
		return items.filter(c => (
			(c.name && c.name.toLowerCase().includes(q)) ||
			(c.host && c.host.toLowerCase().includes(q)) ||
			(c.username && c.username.toLowerCase().includes(q))
		));
	};

	const filteredFavorites = applyQueryFilter(applyTypeFilter(favoriteConnections, favType), favQuery);
	const filteredRecents = applyQueryFilter(applyRecentsTypeFilter(recentConnections, recType), recQuery);

	const ConnectionCard = ({ connection, showFavoriteAction = false, compact = false, micro = false, onEdit }) => {
		const isActive = activeIds.has(`${connection.type}:${connection.host}:${connection.username}:${connection.port}`);
		return (
			<div
				className="connection-mini-row"
				onClick={() => onConnectToHistory?.(connection)}
				style={{
					display: 'grid',
					gridTemplateColumns: 'auto 1fr auto 12px',
					alignItems: 'center',
					gap: micro ? '6px' : (compact ? '8px' : '12px'),
					padding: micro ? '4px 8px' : (compact ? '6px 10px' : '10px 14px'),
					border: '1px solid rgba(255,255,255,0.14)',
					borderRadius: micro ? '8px' : (compact ? '10px' : '14px'),
					background: 'rgba(16, 20, 28, 0.45)',
					backdropFilter: 'blur(10px) saturate(140%)',
					boxShadow: micro ? '0 3px 12px rgba(0,0,0,0.2)' : (compact ? '0 4px 16px rgba(0,0,0,0.22)' : '0 6px 24px rgba(0,0,0,0.25)'),
					cursor: 'pointer',
					transition: 'all 0.2s ease'
				}}
				onMouseEnter={(e) => {
					const typeColor = getConnectionTypeColor(connection.type);
					e.currentTarget.style.borderColor = typeColor;
					e.currentTarget.style.boxShadow = micro ? `0 0 0 1px ${typeColor}66, 0 4px 12px rgba(0,0,0,0.28)` : (compact ? `0 0 0 1px ${typeColor}66, 0 6px 18px rgba(0,0,0,0.3)` : `0 0 0 1px ${typeColor}66, 0 10px 28px rgba(0,0,0,0.35)`);
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
					e.currentTarget.style.boxShadow = micro ? '0 3px 12px rgba(0,0,0,0.2)' : (compact ? '0 4px 16px rgba(0,0,0,0.22)' : '0 6px 24px rgba(0,0,0,0.25)');
				}}
			>
				<div style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					width: micro ? 26 : (compact ? 32 : 38),
					height: micro ? 26 : (compact ? 32 : 38),
					borderRadius: micro ? 8 : (compact ? 10 : 12),
					background: `linear-gradient(135deg, ${getConnectionTypeColor(connection.type)}88, ${getConnectionTypeColor(connection.type)}44)`,
					border: '1px solid rgba(255,255,255,0.18)',
					boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)'
				}}>
					<i className={getConnectionTypeIcon(connection.type)} style={{ color: '#fff', fontSize: micro ? 12 : (compact ? 14 : 16) }} />
				</div>

				<div style={{ minWidth: 0 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
						<span style={{ color: 'var(--text-color)', fontWeight: 700, fontSize: micro ? 12 : (compact ? 13 : 14), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{connection.name}</span>
						<span style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 6,
							padding: micro ? '1px 6px' : (compact ? '2px 8px' : '4px 10px'),
							borderRadius: 999,
							background: 'rgba(255,255,255,0.06)',
							border: '1px solid rgba(255,255,255,0.16)',
							color: getConnectionTypeColor(connection.type),
							fontSize: micro ? 9 : (compact ? 10 : 11),
							fontWeight: 700
						}}>
							{connection.type === 'rdp-guacamole' ? 'RDP' : 
							 (connection.type === 'explorer' ? 'SFTP' : 
							  connection.type === 'group' ? 'Grupo' : 'SSH')}
						</span>
						{connection.type === 'group' && connection.sessions && (
							<span style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 4,
								padding: micro ? '1px 4px' : (compact ? '2px 6px' : '3px 8px'),
								borderRadius: 999,
								background: 'rgba(255,255,255,0.08)',
								border: '1px solid rgba(255,255,255,0.12)',
								color: 'var(--text-color)',
								fontSize: micro ? 8 : (compact ? 9 : 10),
								fontWeight: 600
							}}>
								{connection.sessions.length}
							</span>
						)}
					</div>
				</div>

				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
					<div style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						padding: micro ? 1 : (compact ? 2 : 4),
						borderRadius: 999,
						background: 'rgba(255,255,255,0.06)',
						border: '1px solid rgba(255,255,255,0.16)'
					}}>
						{showFavoriteAction && (
							<span
								title={connection.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
								style={{
									width: micro ? 20 : (compact ? 24 : 28),
									height: micro ? 20 : (compact ? 24 : 28),
									borderRadius: '50%',
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: 'var(--text-color)',
									background: 'rgba(255,255,255,0.08)',
									border: '1px solid rgba(255,255,255,0.16)',
									transition: 'all .15s ease',
									cursor: 'pointer'
								}}
								onMouseEnter={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,\
255,255,0.16)'; e.style.color = '#fff'; }}
								onMouseLeave={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,\
255,255,0.08)'; e.style.color = 'var(--text-color)'; }}
								onClick={() => { toggleFavorite(connection); loadConnectionHistory(); }}
							>
								<i className={connection.isFavorite ? 'pi pi-star-fill' : 'pi pi-star'} style={{ fontSize: micro ? 10 : (compact ? 12 : 14) }} />
							</span>
						)}
						{onEdit && (
							<span
								title="Editar"
								style={{
									width: micro ? 20 : (compact ? 24 : 28),
									height: micro ? 20 : (compact ? 24 : 28),
									borderRadius: '50%',
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: 'var(--text-color)',
									background: 'rgba(255,255,255,0.08)',
									border: '1px solid rgba(255,255,255,0.16)',
									transition: 'all .15s ease',
									cursor: 'pointer'
								}}
								onMouseEnter={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,\
255,255,0.16)'; e.style.color = '#fff'; }}
								onMouseLeave={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,\
255,255,0.08)'; e.style.color = 'var(--text-color)'; }}
								onClick={() => onEdit(connection)}
							>
								<i className="pi pi-pencil" style={{ fontSize: micro ? 10 : (compact ? 12 : 14) }} />
							</span>
						)}
						<span
							title="Conectar"
							style={{
								width: micro ? 20 : (compact ? 24 : 28),
								height: micro ? 20 : (compact ? 24 : 28),
								borderRadius: '50%',
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								color: 'var(--text-color)',
								background: 'rgba(255,255,255,0.08)',
								border: '1px solid rgba(255,255,255,0.16)',
								transition: 'all .15s ease',
								cursor: 'pointer'
							}}
							onMouseEnter={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,\
255,255,0.16)'; e.style.color = '#fff'; }}
							onMouseLeave={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,\
255,255,0.08)'; e.style.color = 'var(--text-color)'; }}
							onClick={() => onConnectToHistory?.(connection)}
						>
							<i className="pi pi-external-link" style={{ fontSize: micro ? 10 : (compact ? 12 : 14) }} />
						</span>
					</div>
				</div>

				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
						<span style={{ width: micro ? 6 : (compact ? 8 : 10), height: micro ? 6 : (compact ? 8 : 10), borderRadius: '50%', background: isActive ? '#22c55e' : '#9E9E9E', boxShadow: isActive ? '0 0 10px rgba(34,197,94,0.5)' : 'none' }} />
				</div>
			</div>
		);
	};

	const twoColumns = layout === 'two-columns';

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

	return (
		<div style={{ padding: '1rem' }}>
			<div style={{ display: 'grid', gridTemplateColumns: templateColumns ? templateColumns : (twoColumns ? '1fr 360px' : '1fr'), gap: '1rem' }}>
				{/* Columna izquierda: Favoritos y debajo Recientes */}
				<div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
						<i className="pi pi-star-fill" style={{ color: '#FFD700' }} />
						<h3 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.1rem' }}>Conexiones Favoritas</h3>
						<Badge value={filteredFavorites.length} style={{ fontSize: 11, minWidth: '1.1rem', height: '1.1rem', lineHeight: '1.1rem' }} />
						<div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
							<TypeChips value={favType} onChange={setFavType} />
						</div>
					</div>
					{filteredFavorites.length > 0 ? (
						<div style={{ display: 'grid', gridTemplateColumns: `repeat(${favoritesColumns}, 1fr)`, gap: 4 }}>
							{filteredFavorites.map(connection => (
								<ConnectionCard key={connection.id} connection={connection} showFavoriteAction={true} compact={true} micro={true} onEdit={onEdit} />
							))}
						</div>
					) : (
						<Card style={{ textAlign: 'center', padding: '2rem', background: 'var(--surface-card)' }}>
							<i className="pi pi-info-circle" style={{ fontSize: '3rem', color: 'var(--text-color-secondary)', marginBottom: '1rem', display: 'block' }} />
							<h4 style={{ color: 'var(--text-color)', marginBottom: '0.5rem' }}>No hay favoritos</h4>
							<p style={{ color: 'var(--text-color-secondary)', margin: 0 }}>Marca conexiones desde la sidebar o desde estas tarjetas</p>
						</Card>
					)}

					{/* (Recientes movido a la columna derecha) */}
				</div>

				{/* Columna derecha: Panel de estado */}
				<div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
						<i className="pi pi-chart-bar" style={{ color: 'var(--primary-color)' }} />
						<h3 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.1rem' }}>Estado de NodeTerm</h3>
					</div>
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

						{/* Recientes debajo del estado del sistema */}
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>
							<i className="pi pi-clock" style={{ color: 'var(--primary-color)' }} />
						<h3 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.1rem' }}>Conexiones Recientes</h3>
						<Badge value={filteredRecents.length} style={{ fontSize: 11, minWidth: '1.1rem', height: '1.1rem', lineHeight: '1.1rem' }} />
						<div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
							<RecentsTypeChips value={recType} onChange={setRecType} />
						</div>
						</div>
					{filteredRecents.length > 0 ? (
						<div style={{ display: 'grid', gridTemplateColumns: `repeat(${recentsColumns}, 1fr)`, gap: 6 }}>
							{filteredRecents.map(connection => (
								<ConnectionCard key={connection.id} connection={connection} showFavoriteAction={true} compact={true} onEdit={onEdit} />
							))}
						</div>
						) : (
							<Card style={{ textAlign: 'center', padding: '2rem', background: 'var(--surface-card)' }}>
								<i className="pi pi-info-circle" style={{ fontSize: '3rem', color: 'var(--text-color-secondary)', marginBottom: '1rem', display: 'block' }} />
								<h4 style={{ color: 'var(--text-color)', marginBottom: '0.5rem' }}>No hay conexiones recientes</h4>
								<p style={{ color: 'var(--text-color-secondary)', margin: 0 }}>Las conexiones aparecerán aquí después de usarlas</p>
							</Card>
						)}
				</div>
			</div>
		</div>
	);
};

export default ConnectionHistory;
