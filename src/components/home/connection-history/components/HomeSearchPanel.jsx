import React from 'react';
import { InputText } from 'primereact/inputtext';
import { isFavorite } from '../../../../utils/connectionStore';
import {
	matchesProtocolFilter,
	CYBER_PROTOCOL_OPTIONS,
	hexToRgbString,
	getConnectionTypeColor,
	getProtocolBadge,
	getNodeFolderPath,
	buildHostLabel,
	formatRelativeTime
} from '../utils/connectionHistoryHelpers';

export const HomeSearchPanel = ({
	searchTerm,
	setSearchTerm,
	handleSearchKeyDown,
	isSearching,
	activeIndex,
	setActiveIndex,
	onTogglePanelVisibility,
	onToggleTerminalVisibility,
	panelsLayout,
	onBringToFront,
	onTerminalToggle,
	searchPanelMode,
	setSearchPanelMode,
	searchProtocolFilter,
	setSearchProtocolFilter,
	showProtocolFilterBar,
	setShowProtocolFilterBar,
	filteredSearchResults = [],
	filteredRecentsForDisplay = [],
	filteredFavorites = [],
	protocolMatches = [],
	handleDirectConnect,
	handleSelectSearchResult,
	handleToggleFavoriteWithGroup,
	onConnectToHistory,
	onEdit,
	sidebarNodes = [],
	terminalTheme = {},
	minSearchChars = 2
}) => {
	const isSearchActive = searchTerm.trim().length >= minSearchChars;

	const currentSearchResults = searchProtocolFilter === 'all'
		? filteredSearchResults
		: filteredSearchResults.filter(n => matchesProtocolFilter(n.data?.type, searchProtocolFilter));

	const currentRecents = searchProtocolFilter === 'all'
		? filteredRecentsForDisplay
		: filteredRecentsForDisplay.filter(c => matchesProtocolFilter(c.type, searchProtocolFilter));

	const currentFavorites = searchProtocolFilter === 'all'
		? filteredFavorites
		: filteredFavorites.filter(c => matchesProtocolFilter(c.type, searchProtocolFilter));

	return (
		<div className="cyber-search-panel-body">
			{/* Top Zone: Search input + Buttons */}
			<div className="cyber-search-top-zone">
				<div className="hero-search-container" style={{ margin: '0', width: '100%', maxWidth: '100%' }}>
					<div className="cyber-search-input-wrapper">
						<InputText
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							onKeyDown={handleSearchKeyDown}
							className="hero-search-input"
							placeholder="Search hosts, IPs, protocols, passwords..."
							autoComplete="off"
							spellCheck="false"
						/>
						{isSearching && (
							<i className="pi pi-spin pi-spinner hero-search-spinner" />
						)}
						{searchTerm.length > 0 && (
							<button
								type="button"
								className="cyber-search-clear-btn"
								onClick={() => {
									setSearchTerm('');
									setActiveIndex(-1);
								}}
								title="Limpiar búsqueda (Esc)"
							>
								<i className="pi pi-times" />
							</button>
						)}
						<button
							type="button"
							className="hero-terminal-btn"
							title="Mostrar/ocultar terminal local"
							onClick={(e) => {
								e.stopPropagation();
								if (onTogglePanelVisibility) {
									onTogglePanelVisibility('terminal');
								} else if (onToggleTerminalVisibility) {
									onToggleTerminalVisibility();
								}
							}}
						>
							<span className="btn-prompt">$</span><span className="btn-cursor">_</span>
						</button>
					</div>
				</div>

				<div className="hero-action-buttons" style={{ margin: '0' }}>
					<button
						type="button"
						className={`hero-action-btn terminal-primary ${panelsLayout?.terminal?.visible !== false ? 'active' : ''}`}
						title="Abrir o enfocar terminal"
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
					>
						<i className="pi pi-plus-circle" /> Terminal
					</button>
					<button
						type="button"
						className={`hero-action-btn ${searchPanelMode === 'recents' ? 'active' : ''}`}
						title="Mostrar recientes en este panel"
						onClick={(e) => {
							e.stopPropagation();
							setSearchPanelMode(prev => (prev === 'recents' ? 'standby' : 'recents'));
							setActiveIndex(-1);
						}}
					>
						<i className="pi pi-clock" /> Recientes
					</button>
					<button
						type="button"
						className={`hero-action-btn ${searchPanelMode === 'favorites' ? 'active' : ''}`}
						title="Mostrar favoritos en este panel"
						onClick={(e) => {
							e.stopPropagation();
							setSearchPanelMode(prev => (prev === 'favorites' ? 'standby' : 'favorites'));
							setActiveIndex(-1);
						}}
					>
						<i className="pi pi-star" /> Favoritos
					</button>
					<button
						type="button"
						className={`hero-action-btn cyber-filter-trigger-btn ${searchProtocolFilter !== 'all' || showProtocolFilterBar ? 'active' : ''}`}
						title="Filtrar por tipo / protocolo"
						onClick={(e) => {
							e.stopPropagation();
							setShowProtocolFilterBar(prev => !prev);
						}}
					>
						<i className="pi pi-filter" />
						<span>{searchProtocolFilter === 'all' ? 'Filtrar' : searchProtocolFilter.toUpperCase()}</span>
						{searchProtocolFilter !== 'all' && (
							<span
								className="cyber-filter-reset-badge"
								onClick={(e) => {
									e.stopPropagation();
									setSearchProtocolFilter('all');
									setActiveIndex(-1);
								}}
								title="Restablecer filtro"
							>
								×
							</span>
						)}
					</button>
				</div>

				{/* Protocol Filter Chips Selector Bar */}
				{(showProtocolFilterBar || searchProtocolFilter !== 'all') && (
					<div className="cyber-protocol-chips-bar">
						{CYBER_PROTOCOL_OPTIONS.map((opt) => {
							const isOptActive = searchProtocolFilter === opt.id;
							return (
								<button
									key={opt.id}
									type="button"
									className={`cyber-protocol-chip ${isOptActive ? 'active' : ''}`}
									style={{ '--chip-color': opt.color }}
									onClick={(e) => {
										e.stopPropagation();
										setSearchProtocolFilter(isOptActive && opt.id !== 'all' ? 'all' : opt.id);
										setActiveIndex(-1);
									}}
								>
									<i className={opt.icon} style={{ fontSize: '0.68rem' }} />
									<span>{opt.label}</span>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{/* Middle / Integrated Real-Time Results Zone */}
			{isSearchActive ? (
				<div className="cyber-search-results-container">
					<div className="cyber-results-header-bar">
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<span
								style={{
									width: '6px',
									height: '6px',
									borderRadius: '50%',
									background: terminalTheme.green || '#27c93f',
									boxShadow: `0 0 6px ${terminalTheme.green || '#27c93f'}`
								}}
							/>
							<span style={{ color: terminalTheme.green || '#27c93f', fontWeight: '700' }}>
								MATCHES // {currentSearchResults.length.toString().padStart(2, '0')}
							</span>
							{searchProtocolFilter !== 'all' && (
								<span style={{ color: 'var(--card-accent, #4fc3f7)', opacity: 0.8, fontSize: '0.68rem' }}>
									[{searchProtocolFilter.toUpperCase()}]
								</span>
							)}
						</div>
						<span style={{ opacity: 0.5, fontSize: '0.68rem', fontFamily: 'monospace' }}>
							REAL-TIME QUERY: "{searchTerm}"
						</span>
					</div>

					<div className="cyber-results-list-scroll">
						{currentSearchResults.map((node, idx) => {
							const isPassword = node.data && ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note'].includes(node.data.type);
							const color = isPassword ? '#E91E63' : getConnectionTypeColor(node.data?.type);
							const rgbColor = hexToRgbString(color);
							const label = node.label;
							const sub = isPassword
								? (node.data.url || node.data.username || node.data.group || '-')
								: (node.data.host || node.data.hostname || node.data.server || '-');
							const port = node.data?.port;
							const badgeLabel = isPassword ? 'PWD' : getProtocolBadge(node.data?.type, port);
							const folderPath = getNodeFolderPath(sidebarNodes, node);
							const folderPathString = folderPath && folderPath.length > 0 ? folderPath.join(' / ') : null;
							const isSelected = activeIndex === idx;

							return (
								<div
									key={node.key || `${node.label}-${idx}`}
									className={`cyber-result-card ${isSelected ? 'active-item' : ''}`}
									style={{
										'--row-color': color,
										'--row-color-rgb': rgbColor
									}}
									onClick={() => handleSelectSearchResult(node)}
									onMouseEnter={() => setActiveIndex(idx)}
								>
									<span className="crc-prefix-arrow">➜</span>
									<span className="crc-badge">{badgeLabel}</span>
									<div className="crc-info">
										<div className="crc-top-line">
											<span className="crc-name">{label}</span>
											<span className="crc-host">{sub}{port && Number(port) !== 22 && Number(port) !== 3389 && !sub.includes(`:${port}`) ? `:${port}` : ''}</span>
										</div>
										{folderPathString && (
											<span className="crc-folder-path">📁 {folderPathString}</span>
										)}
									</div>
									<button
										type="button"
										className="crc-action-btn"
										onClick={(e) => {
											e.stopPropagation();
											handleSelectSearchResult(node);
										}}
									>
										<span>{isPassword ? 'ABRIR' : 'CONECTAR'}</span>
										<i className="pi pi-arrow-right" style={{ fontSize: '0.65rem' }} />
									</button>
								</div>
							);
						})}

						{currentSearchResults.length === 0 && (
							<div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
								<div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontFamily: 'monospace' }}>
									// NO SE ENCONTRARON COINCIDENCIAS GUARDADAS
								</div>
								<div
									className="cyber-direct-connect-row"
									onClick={() => handleDirectConnect(searchTerm)}
								>
									<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
										<span style={{ color: '#27c93f', fontWeight: 'bold', fontSize: '0.9rem' }}>➜</span>
										<span style={{ color: '#ffffff', fontSize: '0.82rem' }}>
											Conectar SSH directo a <strong style={{ color: terminalTheme.green || '#27c93f' }}>{searchTerm}</strong>
										</span>
									</div>
									<span style={{ color: '#27c93f', fontSize: '0.72rem', fontWeight: 'bold' }}>
										[ ENTER ↵ ]
									</span>
								</div>
							</div>
						)}
					</div>
				</div>
			) : searchPanelMode === 'recents' ? (
				/* Recents List Integrated in Cyberpunk Mode */
				<div className="cyber-search-results-container">
					<div className="cyber-results-header-bar">
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<span
								style={{
									width: '6px',
									height: '6px',
									borderRadius: '50%',
									background: '#2196F3',
									boxShadow: '0 0 6px #2196F3'
								}}
							/>
							<span style={{ color: '#2196F3', fontWeight: '700' }}>
								RECENT SESSIONS // {currentRecents.length.toString().padStart(2, '0')}
							</span>
							{searchProtocolFilter !== 'all' && (
								<span style={{ color: '#4fc3f7', opacity: 0.8, fontSize: '0.68rem' }}>
									[{searchProtocolFilter.toUpperCase()}]
								</span>
							)}
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<span style={{ opacity: 0.5, fontSize: '0.68rem', fontFamily: 'monospace' }}>
								HISTORIAL RECIENTE
							</span>
							<button
								type="button"
								className="cyber-search-clear-btn"
								style={{ position: 'static', transform: 'none', width: '18px', height: '18px' }}
								onClick={() => setSearchPanelMode('standby')}
								title="Cerrar recientes"
							>
								<i className="pi pi-times" />
							</button>
						</div>
					</div>

					<div className="cyber-results-list-scroll">
						{currentRecents.map((conn, idx) => {
							const isPassword = ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note', 'document', 'quick-note'].includes(conn.type);
							const color = isPassword ? '#E91E63' : getConnectionTypeColor(conn.type);
							const rgbColor = hexToRgbString(color);
							const label = conn.name || conn.label || '-';
							const sub = buildHostLabel(conn);
							const port = conn.port;
							const badgeLabel = isPassword ? 'PWD' : getProtocolBadge(conn.type, port);
							const timeStr = formatRelativeTime(conn.lastConnected);
							const isFav = isFavorite(conn);
							const isSelected = activeIndex === idx;

							const handleItemClick = () => {
								if (isPassword) {
									window.dispatchEvent(new CustomEvent('open-password-tab', {
										detail: { key: conn.id, label, data: { ...conn } }
									}));
								} else {
									onConnectToHistory?.(conn);
								}
							};

							return (
								<div
									key={conn.id || `recent-${idx}`}
									className={`cyber-result-card ${isSelected ? 'active-item' : ''}`}
									style={{
										'--row-color': color,
										'--row-color-rgb': rgbColor
									}}
									onClick={handleItemClick}
									onMouseEnter={() => setActiveIndex(idx)}
									onContextMenu={(e) => {
										e.preventDefault();
										e.stopPropagation();
										onEdit?.(conn);
									}}
								>
									<span className="crc-prefix-arrow">➜</span>
									<span className="crc-badge">{badgeLabel}</span>
									<div className="crc-info">
										<div className="crc-top-line">
											<span className="crc-name">{label}</span>
											<span className="crc-host">{sub}</span>
										</div>
										{timeStr && timeStr !== '-' && (
											<span className="crc-folder-path" style={{ opacity: 0.6 }}>⏱ {timeStr}</span>
										)}
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
										<button
											type="button"
											className={`glass-action-btn ${isFav ? 'fav-active' : ''}`}
											onClick={(e) => {
												e.stopPropagation();
												handleToggleFavoriteWithGroup(conn);
											}}
											title={isFav ? "Quitar de Favoritos" : "Marcar como Favorito"}
										>
											<i className={isFav ? 'pi pi-star-fill' : 'pi pi-star'} />
										</button>
										<button
											type="button"
											className="crc-action-btn"
											onClick={handleItemClick}
										>
											<span>{isPassword ? 'ABRIR' : 'CONECTAR'}</span>
											<i className="pi pi-arrow-right" style={{ fontSize: '0.65rem' }} />
										</button>
									</div>
								</div>
							);
						})}

						{currentRecents.length === 0 && (
							<div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontFamily: 'monospace' }}>
								// NO SE REGISTRARON SESIONES RECIENTES
							</div>
						)}
					</div>
				</div>
			) : searchPanelMode === 'favorites' ? (
				/* Favorites List Integrated in Cyberpunk Mode */
				<div className="cyber-search-results-container">
					<div className="cyber-results-header-bar">
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<span
								style={{
									width: '6px',
									height: '6px',
									borderRadius: '50%',
									background: '#FFD700',
									boxShadow: '0 0 6px #FFD700'
								}}
							/>
							<span style={{ color: '#FFD700', fontWeight: '700' }}>
								FAVORITES // {currentFavorites.length.toString().padStart(2, '0')}
							</span>
							{searchProtocolFilter !== 'all' && (
								<span style={{ color: '#FFD700', opacity: 0.8, fontSize: '0.68rem' }}>
									[{searchProtocolFilter.toUpperCase()}]
								</span>
							)}
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<span style={{ opacity: 0.5, fontSize: '0.68rem', fontFamily: 'monospace' }}>
								ACCESOS FAVORITOS
							</span>
							<button
								type="button"
								className="cyber-search-clear-btn"
								style={{ position: 'static', transform: 'none', width: '18px', height: '18px' }}
								onClick={() => setSearchPanelMode('standby')}
								title="Cerrar favoritos"
							>
								<i className="pi pi-times" />
							</button>
						</div>
					</div>

					<div className="cyber-results-list-scroll">
						{currentFavorites.map((conn, idx) => {
							const isPassword = ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note', 'document', 'quick-note'].includes(conn.type);
							const color = isPassword ? '#E91E63' : getConnectionTypeColor(conn.type);
							const rgbColor = hexToRgbString(color);
							const label = conn.name || conn.label || '-';
							const sub = buildHostLabel(conn);
							const port = conn.port;
							const badgeLabel = isPassword ? 'PWD' : getProtocolBadge(conn.type, port);
							const isFav = isFavorite(conn);
							const isSelected = activeIndex === idx;

							const handleItemClick = () => {
								if (isPassword) {
									window.dispatchEvent(new CustomEvent('open-password-tab', {
										detail: { key: conn.id, label, data: { ...conn } }
									}));
								} else {
									onConnectToHistory?.(conn);
								}
							};

							return (
								<div
									key={conn.id || `fav-${idx}`}
									className={`cyber-result-card ${isSelected ? 'active-item' : ''}`}
									style={{
										'--row-color': color,
										'--row-color-rgb': rgbColor
									}}
									onClick={handleItemClick}
									onMouseEnter={() => setActiveIndex(idx)}
									onContextMenu={(e) => {
										e.preventDefault();
										e.stopPropagation();
										onEdit?.(conn);
									}}
								>
									<span className="crc-prefix-arrow">➜</span>
									<span className="crc-badge">{badgeLabel}</span>
									<div className="crc-info">
										<div className="crc-top-line">
											<span className="crc-name">{label}</span>
											<span className="crc-host">{sub}</span>
										</div>
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
										<button
											type="button"
											className={`glass-action-btn ${isFav ? 'fav-active' : ''}`}
											onClick={(e) => {
												e.stopPropagation();
												handleToggleFavoriteWithGroup(conn);
											}}
											title={isFav ? "Quitar de Favoritos" : "Marcar como Favorito"}
										>
											<i className={isFav ? 'pi pi-star-fill' : 'pi pi-star'} />
										</button>
										<button
											type="button"
											className="crc-action-btn"
											onClick={handleItemClick}
										>
											<span>{isPassword ? 'ABRIR' : 'CONECTAR'}</span>
											<i className="pi pi-arrow-right" style={{ fontSize: '0.65rem' }} />
										</button>
									</div>
								</div>
							);
						})}

						{currentFavorites.length === 0 && (
							<div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontFamily: 'monospace' }}>
								// NO HAY CONEXIONES MARCADAS COMO FAVORITAS
							</div>
						)}
					</div>
				</div>
			) : searchProtocolFilter !== 'all' ? (
				/* Protocol Direct Filter Mode from Standby */
				<div className="cyber-search-results-container">
					<div className="cyber-results-header-bar">
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<span
								style={{
									width: '6px',
									height: '6px',
									borderRadius: '50%',
									background: '#4fc3f7',
									boxShadow: '0 0 6px #4fc3f7'
								}}
							/>
							<span style={{ color: '#4fc3f7', fontWeight: '700' }}>
								FILTER // {searchProtocolFilter.toUpperCase()} ({protocolMatches.length.toString().padStart(2, '0')})
							</span>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<span style={{ opacity: 0.5, fontSize: '0.68rem', fontFamily: 'monospace' }}>
								CONEXIONES GUARDADAS
							</span>
							<button
								type="button"
								className="cyber-search-clear-btn"
								style={{ position: 'static', transform: 'none', width: '18px', height: '18px' }}
								onClick={() => {
									setSearchProtocolFilter('all');
									setActiveIndex(-1);
								}}
								title="Quitar filtro"
							>
								<i className="pi pi-times" />
							</button>
						</div>
					</div>

					<div className="cyber-results-list-scroll">
						{protocolMatches.map((node, idx) => {
							const isPassword = node.data && ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note'].includes(node.data.type);
							const color = isPassword ? '#E91E63' : getConnectionTypeColor(node.data?.type);
							const rgbColor = hexToRgbString(color);
							const label = node.label;
							const sub = isPassword
								? (node.data.url || node.data.username || node.data.group || '-')
								: (node.data.host || node.data.hostname || node.data.server || '-');
							const port = node.data?.port;
							const badgeLabel = isPassword ? 'PWD' : getProtocolBadge(node.data?.type, port);
							const folderPath = getNodeFolderPath(sidebarNodes, node);
							const folderPathString = folderPath && folderPath.length > 0 ? folderPath.join(' / ') : null;
							const isSelected = activeIndex === idx;

							return (
								<div
									key={node.key || `proto-${idx}`}
									className={`cyber-result-card ${isSelected ? 'active-item' : ''}`}
									style={{
										'--row-color': color,
										'--row-color-rgb': rgbColor
									}}
									onClick={() => handleSelectSearchResult(node)}
									onMouseEnter={() => setActiveIndex(idx)}
								>
									<span className="crc-prefix-arrow">➜</span>
									<span className="crc-badge">{badgeLabel}</span>
									<div className="crc-info">
										<div className="crc-top-line">
											<span className="crc-name">{label}</span>
											<span className="crc-host">{sub}{port && Number(port) !== 22 && Number(port) !== 3389 && !sub.includes(`:${port}`) ? `:${port}` : ''}</span>
										</div>
										{folderPathString && (
											<span className="crc-folder-path">📁 {folderPathString}</span>
										)}
									</div>
									<button
										type="button"
										className="crc-action-btn"
										onClick={(e) => {
											e.stopPropagation();
											handleSelectSearchResult(node);
										}}
									>
										<span>{isPassword ? 'ABRIR' : 'CONECTAR'}</span>
										<i className="pi pi-arrow-right" style={{ fontSize: '0.65rem' }} />
									</button>
								</div>
							);
						})}

						{protocolMatches.length === 0 && (
							<div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontFamily: 'monospace' }}>
								// NO SE ENCONTRARON CONEXIONES DEL TIPO {searchProtocolFilter.toUpperCase()}
							</div>
						)}
					</div>
				</div>
			) : (
				/* Standby State: Clean & Minimalist */
				<div className="cyber-search-standby">
					<div style={{ display: 'flex', alignItems: 'center' }}>
						<span className="css-dot" />
						<span>STANDBY // BUSCADOR DIRECTO</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
						<span><kbd>↑↓</kbd> Navegar</span>
						<span><kbd>↵</kbd> Conectar</span>
						<span><kbd>ESC</kbd> Limpiar</span>
					</div>
				</div>
			)}
		</div>
	);
};
export default HomeSearchPanel;
