import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';
import { getFavorites, toggleFavorite, onUpdate } from '../utils/connectionStore';

const ConnectionHistory = ({ onConnectToHistory, layout = 'two-columns', recentsLimit = 10, activeIds = new Set(), onEdit, templateColumns, favoritesColumns = 2, recentsColumns = 1, sshConnectionsCount = 0, foldersCount = 0, rdpConnectionsCount = 0 }) => {
	const [favoriteConnections, setFavoriteConnections] = useState([]);
	const [favType, setFavType] = useState(() => localStorage.getItem('nodeterm_fav_type') || 'all');
	const [favQuery, setFavQuery] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 15;

	useEffect(() => {
		loadConnectionHistory();
		const off = onUpdate(() => loadConnectionHistory());
		return () => off && off();
	}, [recentsLimit]);


	const loadConnectionHistory = () => {
		try {
			const favs = getFavorites();
			setFavoriteConnections(favs.map(c => ({ ...c, isFavorite: true, status: 'success' })));
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
		<>
			<div style={{ display: 'flex', gap: 5 }}>
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
							padding: '2px 7px',
							borderRadius: 999,
							border: '1px solid rgba(255,255,255,0.14)',
							background: value === opt.key ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
							color: 'var(--text-color)',
							fontSize: 10,
							cursor: 'pointer',
							backdropFilter: 'blur(8px) saturate(130%)'
						}}
					>{opt.label}</button>
				))}
			</div>
			{/* Línea separadora debajo de los botones de filtro */}
			<div style={{ 
				height: '0.5px', 
				background: 'var(--ui-tabgroup-border, #444)', 
				opacity: 0.6,
				width: '100%',
				margin: '6px 0 0 0',
				padding: 0,
				boxSizing: 'border-box',
				border: 'none',
				outline: 'none'
			}} />
		</>
	);


	const applyTypeFilter = (items, type) => {
		if (type === 'all') return items;
		return items.filter(c => c.type === type);
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
	
	// Resetear la página cuando cambian los filtros
	useEffect(() => {
		setCurrentPage(1);
	}, [favType, favQuery]);

	// Calcular paginación
	const totalPages = Math.ceil(filteredFavorites.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedFavorites = filteredFavorites.slice(startIndex, endIndex);

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

	return (
		<div style={{ padding: '0.5rem 0.5rem 0.25rem 0.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.25rem', flex: '0 0 auto' }}>
				{/* Columna única: Favoritos */}
				<div style={{ display: 'flex', flexDirection: 'column' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
						<i className="pi pi-star-fill" style={{ color: '#FFD700', fontSize: '1rem' }} />
						<h3 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1rem' }}>Conexiones Favoritas</h3>
						<Badge value={filteredFavorites.length} style={{ fontSize: 10, minWidth: '1rem', height: '1rem', lineHeight: '1rem' }} />
						<div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
							<TypeChips value={favType} onChange={setFavType} />
						</div>
					</div>
					
					{/* Contenedor con altura fija para los favoritos */}
					<div style={{ 
						maxHeight: '380px', 
						minHeight: '380px',
						overflow: 'hidden',
						display: 'flex',
						flexDirection: 'column'
					}}>
						{filteredFavorites.length > 0 ? (
							<>
								<div style={{ 
									display: 'grid', 
									gridTemplateColumns: `repeat(${favoritesColumns}, 1fr)`, 
									gap: 4,
									flex: '0 0 auto',
									paddingRight: '4px'
								}}>
									{paginatedFavorites.map(connection => (
										<ConnectionCard key={connection.id} connection={connection} showFavoriteAction={true} compact={true} micro={true} onEdit={onEdit} />
									))}
								</div>
								
								{/* Controles de paginación */}
								{totalPages > 1 && (
									<div style={{ 
										display: 'flex', 
										alignItems: 'center', 
										justifyContent: 'center',
										gap: '0.4rem',
										marginTop: '0.4rem',
										padding: '0.2rem 0',
										flex: '0 0 auto'
									}}>
										<button
											onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
											disabled={currentPage === 1}
											style={{
												padding: '3px 6px',
												borderRadius: '6px',
												border: '1px solid rgba(255,255,255,0.14)',
												background: currentPage === 1 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
												color: currentPage === 1 ? 'rgba(255,255,255,0.3)' : 'var(--text-color)',
												fontSize: '10px',
												cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
												transition: 'all 0.2s ease',
												display: 'flex',
												alignItems: 'center',
												gap: '3px'
											}}
										>
											<i className="pi pi-chevron-left" style={{ fontSize: '9px' }} />
										</button>
										
										<div style={{ display: 'flex', gap: '3px' }}>
											{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
												<button
													key={page}
													onClick={() => setCurrentPage(page)}
													style={{
														padding: '3px 6px',
														minWidth: '24px',
														borderRadius: '6px',
														border: '1px solid rgba(255,255,255,0.14)',
														background: currentPage === page ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
														color: 'var(--text-color)',
														fontSize: '10px',
														fontWeight: currentPage === page ? '700' : '500',
														cursor: 'pointer',
														transition: 'all 0.2s ease'
													}}
												>
													{page}
												</button>
											))}
										</div>
										
										<button
											onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
											disabled={currentPage === totalPages}
											style={{
												padding: '3px 6px',
												borderRadius: '6px',
												border: '1px solid rgba(255,255,255,0.14)',
												background: currentPage === totalPages ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
												color: currentPage === totalPages ? 'rgba(255,255,255,0.3)' : 'var(--text-color)',
												fontSize: '10px',
												cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
												transition: 'all 0.2s ease',
												display: 'flex',
												alignItems: 'center',
												gap: '3px'
											}}
										>
											<i className="pi pi-chevron-right" style={{ fontSize: '9px' }} />
										</button>
										
										<span style={{
											marginLeft: '0.4rem',
											padding: '3px 8px',
											borderRadius: '6px',
											background: 'rgba(255,255,255,0.05)',
											border: '1px solid rgba(255,255,255,0.1)',
											color: 'var(--text-color-secondary)',
											fontSize: '9px',
											fontWeight: '500'
										}}>
											{startIndex + 1}-{Math.min(endIndex, filteredFavorites.length)} de {filteredFavorites.length}
										</span>
									</div>
								)}
							</>
						) : (
							<Card style={{ textAlign: 'center', padding: '2rem', background: 'var(--surface-card)' }}>
								<i className="pi pi-info-circle" style={{ fontSize: '3rem', color: 'var(--text-color-secondary)', marginBottom: '1rem', display: 'block' }} />
								<h4 style={{ color: 'var(--text-color)', marginBottom: '0.5rem' }}>No hay favoritos</h4>
								<p style={{ color: 'var(--text-color-secondary)', margin: 0 }}>Marca conexiones desde la sidebar o desde estas tarjetas</p>
							</Card>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default ConnectionHistory;
