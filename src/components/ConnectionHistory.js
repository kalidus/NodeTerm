import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from 'primereact/badge';
import { getFavorites, toggleFavorite, onUpdate } from '../utils/connectionStore';
import { iconThemes } from '../themes/icon-themes';

const ConnectionHistory = ({ onConnectToHistory, layout = 'two-columns', recentsLimit = 10, activeIds = new Set(), onEdit, templateColumns, favoritesColumns = 2, recentsColumns = 1, sshConnectionsCount = 0, foldersCount = 0, rdpConnectionsCount = 0, themeColors = {} }) => {
	const [favoriteConnections, setFavoriteConnections] = useState([]);
	const [favType, setFavType] = useState(() => {
		const saved = localStorage.getItem('nodeterm_fav_type');
		// Convertir 'explorer' a 'sftp' para consistencia
		if (saved === 'explorer') return 'sftp';
		return saved || 'all';
	});
	const [favQuery, setFavQuery] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [containerHeight, setContainerHeight] = useState(400); // Altura inicial estimada
	const favoritesContainerRef = useRef(null);
	const resizeRafRef = useRef(0);
	const lastMeasuredHeightRef = useRef(0);
	
	// Calcular items por página dinámicamente basado en la altura disponible
	// Cada tile compacto tiene aproximadamente ~52px de altura, más gaps
	const itemHeight = 56; // Altura aproximada de cada tile (contenido + gap)
	const itemsPerRow = favoritesColumns;
	const calculateItemsPerPage = useCallback(() => {
		if (containerHeight < 200) return 14; // Mínimo
		const headerHeight = 80; // Altura del header con filtros
		const paginationHeight = 40; // Altura de la paginación (si existe)
		const availableHeight = containerHeight - headerHeight - paginationHeight;
		const rowsPerPage = Math.max(1, Math.floor(availableHeight / itemHeight));
		const calculatedItems = rowsPerPage * itemsPerRow;
		// Mínimo 14 items, pero permitir que crezca dinámicamente
		return Math.max(14, calculatedItems);
	}, [containerHeight, favoritesColumns]);
	
	const itemsPerPage = calculateItemsPerPage();

	useEffect(() => {
		loadConnectionHistory();
		const off = onUpdate(() => loadConnectionHistory());
		return () => off && off();
	}, [recentsLimit]);

	// Observar cambios en el tamaño del contenedor de favoritos
	useEffect(() => {
		if (!favoritesContainerRef.current) return;
		
		const resizeObserver = new ResizeObserver(entries => {
			for (let entry of entries) {
				const height = entry.contentRect.height;
				if (height > 0) {
					// Throttle a 1 update por frame para que el redimensionado del splitter sea fluido
					const rounded = Math.round(height);
					if (Math.abs(rounded - (lastMeasuredHeightRef.current || 0)) < 3) return;
					lastMeasuredHeightRef.current = rounded;
					if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
					resizeRafRef.current = requestAnimationFrame(() => {
						setContainerHeight(rounded);
					});
				}
			}
		});
		
		resizeObserver.observe(favoritesContainerRef.current);
		
		return () => {
			if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
			resizeObserver.disconnect();
		};
	}, []);


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
			case 'rdp':
				return 'pi pi-desktop';
			case 'vnc-guacamole':
			case 'vnc':
				return 'pi pi-desktop';
			case 'explorer':
			case 'sftp':
				return 'pi pi-folder-open';
			case 'ftp':
				return 'pi pi-cloud-upload';
			case 'scp':
				return 'pi pi-copy';
			case 'group':
				return 'pi pi-th-large';
			default:
				return 'pi pi-circle';
		}
	};

	const getConnectionTypeIconSVG = (type) => {
		const iconTheme = localStorage.getItem('nodeterm_icon_theme') || 'material';
		const theme = iconThemes[iconTheme] || iconThemes['material'];
		switch (type) {
			case 'ssh':
				return theme.icons.ssh;
			case 'rdp':
			case 'rdp-guacamole':
				return theme.icons.rdp;
			case 'vnc':
			case 'vnc-guacamole':
				return theme.icons.vnc;
			case 'sftp':
			case 'explorer':
				return theme.icons.sftp;
			default:
				return null;
		}
	};

	const getConnectionTypeColor = (type) => {
		switch (type) {
			case 'ssh':
				return '#4fc3f7';
			case 'rdp-guacamole':
			case 'rdp':
				return '#ff6b35';
			case 'vnc-guacamole':
			case 'vnc':
				return '#00ff00';
			case 'explorer':
			case 'sftp':
				return '#FFB300';
			case 'ftp':
				return '#4CAF50';
			case 'scp':
				return '#9C27B0';
			case 'group':
				return '#9c27b0';
			default:
				return '#9E9E9E';
		}
	};

	const TypeChips = ({ value, onChange }) => {
		// Determinar el valor del selector de archivos (SFTP/FTP/SCP)
		const getFileProtocolValue = () => {
			if (value === 'explorer' || value === 'sftp') return 'sftp';
			if (value === 'ftp') return 'ftp';
			if (value === 'scp') return 'scp';
			return 'sftp'; // Por defecto SFTP
		};

		const fileProtocolValue = getFileProtocolValue();
		const isFileProtocolSelected = ['explorer', 'sftp', 'ftp', 'scp'].includes(value);

		const handleFileProtocolChange = (newValue) => {
			// Mapear el valor del selector al tipo de conexión
			const typeMap = {
				'sftp': 'sftp',
				'ftp': 'ftp',
				'scp': 'scp'
			};
			const connectionType = typeMap[newValue] || 'sftp';
			onChange(connectionType);
			if (onChange === setFavType) localStorage.setItem('nodeterm_fav_type', connectionType);
		};

		return (
			<>
				<div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
					{/* Botones: Todos, SSH, RDP */}
					{[
					{ key: 'all', label: 'Todos' },
					{ key: 'ssh', label: 'SSH' },
					{ key: 'rdp-guacamole', label: 'RDP' },
					{ key: 'vnc-guacamole', label: 'VNC' }
					].map(opt => (
						<button
							key={opt.key}
							onClick={() => { onChange(opt.key); if (onChange === setFavType) localStorage.setItem('nodeterm_fav_type', opt.key); }}
							style={{
								padding: '2px 7px',
								borderRadius: 999,
								border: `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.14)'}`,
								background: value === opt.key ? (themeColors.hoverBackground || 'rgba(255,255,255,0.12)') : (themeColors.itemBackground || 'rgba(255,255,255,0.04)'),
								color: themeColors.textPrimary || 'var(--text-color)',
								fontSize: 10,
								cursor: 'pointer',
								backdropFilter: 'blur(8px) saturate(130%)',
								height: '20px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center'
							}}
						>{opt.label}</button>
					))}
					
					{/* Selector para SFTP/FTP/SCP - después de RDP */}
					<div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
						<select
							value={fileProtocolValue}
							onChange={(e) => handleFileProtocolChange(e.target.value)}
							style={{
								padding: '0 20px 0 7px',
								borderRadius: 999,
								border: `1px solid ${isFileProtocolSelected ? (themeColors.hoverBackground || 'rgba(255,255,255,0.12)') : (themeColors.borderColor || 'rgba(255,255,255,0.14)')}`,
								background: isFileProtocolSelected ? (themeColors.hoverBackground || 'rgba(255,255,255,0.12)') : (themeColors.itemBackground || 'rgba(255,255,255,0.04)'),
								color: themeColors.textPrimary || 'var(--text-color)',
								fontSize: 10,
								cursor: 'pointer',
								backdropFilter: 'blur(8px) saturate(130%)',
								outline: 'none',
								appearance: 'none',
								WebkitAppearance: 'none',
								MozAppearance: 'none',
								width: 'auto',
								minWidth: '50px',
								height: '20px',
								lineHeight: '20px',
								verticalAlign: 'middle',
								boxSizing: 'border-box',
								margin: 0
							}}
						>
							<option value="sftp">SFTP</option>
							<option value="ftp">FTP</option>
							<option value="scp">SCP</option>
						</select>
						<i 
							className="pi pi-chevron-down" 
							style={{ 
								position: 'absolute',
								right: '6px',
								top: '50%',
								transform: 'translateY(-50%)',
								pointerEvents: 'none',
								fontSize: '8px',
								color: themeColors.textPrimary || 'var(--text-color)',
								opacity: 0.7
							}} 
						/>
					</div>
					
					{/* Botón Grupos - después del selector */}
					<button
						key="group"
						onClick={() => { onChange('group'); if (onChange === setFavType) localStorage.setItem('nodeterm_fav_type', 'group'); }}
						style={{
							padding: '2px 7px',
							borderRadius: 999,
							border: `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.14)'}`,
							background: value === 'group' ? (themeColors.hoverBackground || 'rgba(255,255,255,0.12)') : (themeColors.itemBackground || 'rgba(255,255,255,0.04)'),
							color: themeColors.textPrimary || 'var(--text-color)',
							fontSize: 10,
							cursor: 'pointer',
							backdropFilter: 'blur(8px) saturate(130%)',
							height: '20px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center'
						}}
					>Grupos</button>
				</div>
			</>
		);
	};


	const applyTypeFilter = (items, type) => {
		if (type === 'all') return items;
		if (type === 'vnc-guacamole' || type === 'vnc') {
			return items.filter(c => c.type === 'vnc-guacamole' || c.type === 'vnc');
		}
		// 'explorer' y 'sftp' son ambos SFTP, así que los tratamos igual
		if (type === 'sftp') {
			return items.filter(c => c.type === 'sftp' || c.type === 'explorer');
		}
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

	// Escalado visual cuando hay pocas cards y se estiran verticalmente.
	// Calculamos un "scale" en función de la altura real por fila.
	const favScale = React.useMemo(() => {
		if (!paginatedFavorites.length) return 1;
		const rows = Math.max(1, Math.ceil(paginatedFavorites.length / favoritesColumns));
		const paginationHeight = totalPages > 1 ? 40 : 0;
		const availableForGrid = Math.max(0, containerHeight - paginationHeight);
		const rowHeight = availableForGrid / rows;
		const scale = rowHeight / itemHeight; // itemHeight ~58px (tile compacta)
		const clamped = Math.max(1, Math.min(1.6, scale));
		return Number(clamped.toFixed(3));
	}, [paginatedFavorites.length, favoritesColumns, totalPages, containerHeight]);

	const isSparseFavoritesLayout = favScale > 1.15;

	const ConnectionCard = ({ connection, showFavoriteAction = false, compact = false, micro = false, onEdit }) => {
		const isActive = activeIds.has(`${connection.type}:${connection.host}:${connection.username}:${connection.port}`);
		const typeColor = getConnectionTypeColor(connection.type);
		
		const protocolLabel =
			connection.type === 'rdp-guacamole' || connection.type === 'rdp' ? 'RDP' :
			connection.type === 'vnc-guacamole' || connection.type === 'vnc' ? 'VNC' :
			connection.type === 'explorer' ? 'SFTP' :
			connection.type === 'sftp' ? 'SFTP' :
			connection.type === 'ftp' ? 'FTP' :
			connection.type === 'scp' ? 'SCP' :
			connection.type === 'group' ? 'GRUPO' : 'SSH';
		
		const hostLabel = connection.host || connection.hostname || '—';
		
		const r = parseInt(typeColor.slice(1,3), 16);
		const g = parseInt(typeColor.slice(3,5), 16);
		const b = parseInt(typeColor.slice(5,7), 16);
		
		return (
			<div
				className="favorite-tile"
				onClick={() => onConnectToHistory?.(connection)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onConnectToHistory?.(connection);
					}
				}}
				role="button"
				tabIndex={0}
				aria-label={`Conectar a ${connection.name}`}
				style={{
					'--fav-accent': typeColor,
					'--fav-icon-bg': `rgba(${r}, ${g}, ${b}, 0.15)`,
					'--fav-icon-border': `rgba(${r}, ${g}, ${b}, 0.35)`,
					'--fav-icon-color': typeColor,
					'--fav-chip-bg': `rgba(${r}, ${g}, ${b}, 0.18)`,
					'--fav-chip-border': `rgba(${r}, ${g}, ${b}, 0.45)`,
					'--fav-chip-color': typeColor,
				}}
			>
				{/* Icono grande en badge a la izquierda */}
				<div className="favorite-tile__icon-badge">
					{getConnectionTypeIconSVG(connection.type) ? (
						React.cloneElement(getConnectionTypeIconSVG(connection.type), {
							width: '18',
							height: '18'
						})
					) : (
						<i
							className={getConnectionTypeIcon(connection.type)}
							aria-hidden="true"
						/>
					)}
				</div>
				
				{/* Contenido central */}
				<div className="favorite-tile__content">
					<div className="favorite-tile__name" title={connection.name}>
						{connection.name}
					</div>
					<div className="favorite-tile__host-row">
						<span className="favorite-tile__host" title={hostLabel}>
							{hostLabel}
						</span>
						{/* Botones de acción al final de la línea del host */}
						<div className="favorite-tile__actions" onClick={(e) => e.stopPropagation()}>
							<button
								className="favorite-tile__btn-favorite"
								title={connection.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
								onClick={() => { toggleFavorite(connection); loadConnectionHistory(); }}
								aria-label={connection.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
							>
								<i className={connection.isFavorite ? 'pi pi-star-fill' : 'pi pi-star'} />
							</button>
							{onEdit && (
								<button
									className="favorite-tile__btn-menu"
									title="Editar"
									onClick={() => onEdit(connection)}
									aria-label="Editar conexión"
								>
									<i className="pi pi-pencil" />
								</button>
							)}
						</div>
					</div>
				</div>
				
				{/* Chip protocolo en esquina superior derecha */}
				<div className="favorite-tile__chip">
					{protocolLabel}
				</div>
			</div>
		);
	};

	return (
		<div style={{ 
			padding: '0.25rem 0.5rem 0.25rem 0.5rem', 
			flex: 1,
			height: '100%',
			minHeight: 0,
			display: 'flex', 
			flexDirection: 'column',
			background: 'transparent !important',
			backgroundColor: 'transparent !important'
		}}>
			<div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', height: '100%', minHeight: 0 }}>
				{/* Columna única: Favoritos */}
				<div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, background: 'transparent !important', backgroundColor: 'transparent !important' }}>
					{/* Título mejorado con mejor separación visual */}
					<div style={{ 
						marginBottom: '0.5rem',
						padding: 0,
						position: 'relative',
						flexShrink: 0
					}}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
							{/* Icono con efecto visual mejorado */}
							<div style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: '24px',
								height: '24px',
								borderRadius: '6px',
								background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 193, 7, 0.1) 100%)',
								border: '1px solid rgba(255, 215, 0, 0.3)',
								boxShadow: '0 1px 4px rgba(255, 215, 0, 0.15)',
								position: 'relative'
							}}>
								<i className="pi pi-star-fill" style={{ 
									color: '#FFD700', 
									fontSize: '0.9rem',
									filter: 'drop-shadow(0 0 2px rgba(255, 215, 0, 0.4))'
								}} />
								{/* Efecto de brillo sutil */}
								<div style={{
									position: 'absolute',
									top: '12%',
									left: '35%',
									width: '4px',
									height: '4px',
									borderRadius: '50%',
									background: 'rgba(255, 255, 255, 0.6)',
									filter: 'blur(1px)',
									animation: 'twinkle 4s infinite'
								}} />
							</div>
							
							{/* Título con mejor tipografía */}
							<h3 style={{ 
								margin: 0, 
								color: themeColors.textPrimary || 'var(--text-color)', 
								fontSize: '0.9rem',
								fontWeight: '700',
								letterSpacing: '0.1px',
								textShadow: '0 1px 2px rgba(0,0,0,0.1)'
							}}>
								Conexiones Favoritas
							</h3>
							
							{/* Badge mejorado */}
							<div style={{
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								minWidth: '16px',
								height: '16px',
								padding: '0 4px',
								borderRadius: '8px',
								background: 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)',
								border: '1px solid rgba(156, 39, 176, 0.3)',
								boxShadow: '0 1px 2px rgba(156, 39, 176, 0.2)',
								color: '#ffffff',
								fontSize: '9px',
								fontWeight: '600',
								letterSpacing: '0.1px'
							}}>
								{filteredFavorites.length}
							</div>
							
							{/* Filtros con mejor espaciado */}
							<div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
								<TypeChips value={favType} onChange={setFavType} />
							</div>
						</div>
						
						{/* Línea decorativa con gradiente */}
						<div style={{
							height: '1px',
							background: 'linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent)',
							borderRadius: '1px',
							marginTop: '0.3rem'
						}} />
					</div>
					
					{/* Contenedor con altura dinámica para los favoritos */}
					<div 
						ref={favoritesContainerRef}
						className="home-hide-scrollbar"
						style={{ 
							flex: 1,
							height: '100%',
							minHeight: 0,
							overflow: 'auto',
							overflowX: 'hidden',
							display: 'flex',
							flexDirection: 'column',
							background: 'transparent !important',
							backgroundColor: 'transparent !important'
						}}>
						{filteredFavorites.length > 0 ? (
							<>
								<div style={{ 
									'--fav-scale': favScale,
									display: 'grid', 
									gridTemplateColumns: `repeat(${favoritesColumns}, 1fr)`, 
									gap: 8,
									flex: '1 1 auto',
									height: 'fit-content',
									alignContent: 'start',
									alignItems: 'start',
									gridAutoRows: 'min-content',
									paddingRight: '4px',
									background: 'transparent !important',
									backgroundColor: 'transparent !important'
								}}
								className={isSparseFavoritesLayout ? 'favorite-grid favorite-grid--sparse' : 'favorite-grid'}
								>
									{paginatedFavorites.map(connection => (
										<ConnectionCard key={connection.id} connection={connection} showFavoriteAction={true} compact={false} micro={false} onEdit={onEdit} />
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
												color: currentPage === 1 ? 'rgba(255,255,255,0.3)' : (themeColors.textPrimary || 'var(--text-color)'),
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
														color: themeColors.textPrimary || 'var(--text-color)',
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
												color: currentPage === totalPages ? 'rgba(255,255,255,0.3)' : (themeColors.textPrimary || 'var(--text-color)'),
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
											color: themeColors.textSecondary || 'var(--text-color-secondary)',
											fontSize: '9px',
											fontWeight: '500'
										}}>
											{startIndex + 1}-{Math.min(endIndex, filteredFavorites.length)} de {filteredFavorites.length}
										</span>
									</div>
								)}
							</>
						) : (
							<div style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								height: '100%',
								padding: '2rem',
								background: 'transparent !important',
								backgroundColor: 'transparent !important'
							}}>
								{/* Icono con gradiente y animación sutil */}
								<div style={{
									width: '80px',
									height: '80px',
									borderRadius: '50%',
									background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 193, 7, 0.1) 100%)',
									border: '2px solid rgba(255, 215, 0, 0.2)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									marginBottom: '1.5rem',
									position: 'relative',
									animation: 'pulse 2s infinite'
								}}>
									<i className="pi pi-star" style={{ 
										fontSize: '2.5rem', 
										color: '#FFD700',
										filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.3))'
									}} />
									{/* Efecto de brillo */}
									<div style={{
										position: 'absolute',
										top: '10%',
										left: '20%',
										width: '20px',
										height: '20px',
										borderRadius: '50%',
										background: 'rgba(255, 255, 255, 0.4)',
										filter: 'blur(6px)',
										animation: 'twinkle 3s infinite'
									}} />
								</div>
								
								{/* Título principal */}
								<h3 style={{ 
									color: themeColors.textPrimary || 'var(--text-color)', 
									margin: '0 0 0.5rem 0',
									fontSize: '1.2rem',
									fontWeight: '600',
									textAlign: 'center'
								}}>
									¡Comienza a marcar tus favoritos!
								</h3>
								
								{/* Descripción */}
								<p style={{ 
									color: themeColors.textSecondary || 'var(--text-color-secondary)', 
									margin: '0 0 1.5rem 0',
									fontSize: '0.9rem',
									textAlign: 'center',
									lineHeight: '1.4',
									maxWidth: '280px'
								}}>
									Marca conexiones desde la sidebar o desde las tarjetas para tener acceso rápido a ellas
								</p>
								
								{/* Botones de acción sugeridos */}
								<div style={{
									display: 'flex',
									gap: '0.75rem',
									flexWrap: 'wrap',
									justifyContent: 'center'
								}}>
									<div style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.5rem',
										padding: '0.5rem 1rem',
										background: 'rgba(255, 215, 0, 0.1)',
										border: '1px solid rgba(255, 215, 0, 0.2)',
										borderRadius: '20px',
										color: '#FFD700',
										fontSize: '0.8rem',
										fontWeight: '500'
									}}>
										<i className="pi pi-bars" style={{ fontSize: '0.9rem' }} />
										<span>Sidebar</span>
									</div>
									<div style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.5rem',
										padding: '0.5rem 1rem',
										background: 'rgba(79, 195, 247, 0.1)',
										border: '1px solid rgba(79, 195, 247, 0.2)',
										borderRadius: '20px',
										color: '#4fc3f7',
										fontSize: '0.8rem',
										fontWeight: '500'
									}}>
										<i className="pi pi-id-card" style={{ fontSize: '0.9rem' }} />
										<span>Tarjetas</span>
									</div>
								</div>
								
								{/* Línea decorativa */}
								<div style={{
									width: '60px',
									height: '2px',
									background: 'linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent)',
									marginTop: '1.5rem',
									borderRadius: '1px'
								}} />
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default ConnectionHistory;
