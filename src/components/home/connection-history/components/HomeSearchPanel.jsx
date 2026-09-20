import React, { useRef, useState, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import {
	matchesProtocolFilter,
	CYBER_PROTOCOL_OPTIONS,
	hexToRgbString,
	getConnectionTypeColor,
	getProtocolBadge,
	getNodeFolderPath
} from '../utils/connectionHistoryHelpers';
import { CyberConnectionList } from './CyberConnectionList';

export const HomeSearchPanel = ({
	searchTerm,
	setSearchTerm,
	handleSearchKeyDown,
	isSearching,
	activeIndex,
	setActiveIndex,
	onTogglePanelVisibility,
	onToggleMinimizePanel,
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
	const containerRef = useRef(null);
	const [panelWidth, setPanelWidth] = useState(400);

	useEffect(() => {
		if (!containerRef.current) return;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const w = entry.contentRect.width;
				if (w > 0) setPanelWidth(w);
			}
		});
		ro.observe(containerRef.current);
		return () => ro.disconnect();
	}, []);

	const isCompact = panelWidth < 440;
	const isNarrow = panelWidth < 340;
	const isVeryNarrow = panelWidth < 270;

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
		<div ref={containerRef} className={`cyber-search-panel-body ${isCompact ? 'is-compact' : ''} ${isNarrow ? 'is-narrow' : ''} ${isVeryNarrow ? 'is-very-narrow' : ''}`}>
			{/* Top Zone: Search input + Buttons */}
			<div className="cyber-search-top-zone">
				<div className="hero-search-container" style={{ margin: '0', width: '100%', maxWidth: '100%' }}>
					<div className="cyber-search-input-wrapper">
						<InputText
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							onKeyDown={handleSearchKeyDown}
							className="hero-search-input"
							placeholder={
								isVeryNarrow
									? "Buscar..."
									: isNarrow
										? "Buscar conexiones..."
										: "Search hosts, IPs, protocols, passwords..."
							}
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
							title={panelsLayout?.terminal?.isMinimized ? "Restaurar terminal local" : "Minimizar terminal local"}
							onClick={(e) => {
								e.stopPropagation();
								if (onToggleMinimizePanel) {
									onToggleMinimizePanel('terminal');
								} else if (onTogglePanelVisibility) {
									onTogglePanelVisibility('terminal', false);
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
						title="Abrir o enfocar terminal local"
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
						<i className="pi pi-plus-circle" />
						{!isVeryNarrow && <span className="btn-label">{isNarrow ? 'Term' : 'Terminal'}</span>}
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
						<i className="pi pi-clock" />
						{!isVeryNarrow && <span className="btn-label">{isNarrow ? 'Rec' : 'Recientes'}</span>}
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
						<i className="pi pi-star" />
						{!isVeryNarrow && <span className="btn-label">{isNarrow ? 'Fav' : 'Favoritos'}</span>}
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
						{!isVeryNarrow && (
							<span className="btn-label">
								{searchProtocolFilter === 'all'
									? (isNarrow ? 'Filt' : 'Filtrar')
									: (isNarrow ? searchProtocolFilter.slice(0, 3).toUpperCase() : searchProtocolFilter.toUpperCase())}
							</span>
						)}
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
							const hostLabel = `${sub}${port && Number(port) !== 22 && Number(port) !== 3389 && !sub.includes(`:${port}`) ? `:${port}` : ''}`;
							const isSelected = activeIndex === idx;
							const cardTitle = folderPathString ? `${label} (${hostLabel}) · ${folderPathString}` : `${label} (${hostLabel})`;

							return (
								<div
									key={node.key || `${node.label}-${idx}`}
									className={`cyber-result-card ${isSelected ? 'active-item' : ''}`}
									style={{
										'--row-color': color,
										'--row-color-rgb': rgbColor
									}}
									title={cardTitle}
									onClick={() => handleSelectSearchResult(node)}
									onMouseEnter={() => setActiveIndex(idx)}
								>
									<span className="crc-prefix-arrow">$</span>
									<span className="crc-badge">{badgeLabel}</span>
									<div className="crc-info">
										<div className="crc-top-line">
											<span className="crc-name">{label}</span>
											<span className="crc-host">{hostLabel}</span>
										</div>
									</div>
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
				<CyberConnectionList
					connections={currentRecents}
					accent="#2196F3"
					title={`RECENT SESSIONS // ${currentRecents.length.toString().padStart(2, '0')}`}
					titleExtra={searchProtocolFilter !== 'all' ? (
						<span style={{ color: '#4fc3f7', opacity: 0.8, fontSize: '0.68rem' }}>
							[{searchProtocolFilter.toUpperCase()}]
						</span>
					) : null}
					subtitle="HISTORIAL RECIENTE"
					headerRight={(
						<button
							type="button"
							className="cyber-search-clear-btn"
							style={{ position: 'static', transform: 'none', width: '18px', height: '18px' }}
							onClick={() => setSearchPanelMode('standby')}
							title="Cerrar recientes"
						>
							<i className="pi pi-times" />
						</button>
					)}
					emptyMessage="// NO SE REGISTRARON SESIONES RECIENTES"
					activeIndex={activeIndex}
					onActiveIndexChange={setActiveIndex}
					onConnect={onConnectToHistory}
					onEdit={onEdit}
					onToggleFav={handleToggleFavoriteWithGroup}
					showTime
					showFav
					itemKeyPrefix="recent"
				/>
			) : searchPanelMode === 'favorites' ? (
				<CyberConnectionList
					connections={currentFavorites}
					accent="#FFD700"
					title={`FAVORITES // ${currentFavorites.length.toString().padStart(2, '0')}`}
					titleExtra={searchProtocolFilter !== 'all' ? (
						<span style={{ color: '#FFD700', opacity: 0.8, fontSize: '0.68rem' }}>
							[{searchProtocolFilter.toUpperCase()}]
						</span>
					) : null}
					subtitle="ACCESOS FAVORITOS"
					headerRight={(
						<button
							type="button"
							className="cyber-search-clear-btn"
							style={{ position: 'static', transform: 'none', width: '18px', height: '18px' }}
							onClick={() => setSearchPanelMode('standby')}
							title="Cerrar favoritos"
						>
							<i className="pi pi-times" />
						</button>
					)}
					emptyMessage="// NO HAY CONEXIONES MARCADAS COMO FAVORITAS"
					activeIndex={activeIndex}
					onActiveIndexChange={setActiveIndex}
					onConnect={onConnectToHistory}
					onEdit={onEdit}
					onToggleFav={handleToggleFavoriteWithGroup}
					showTime={false}
					showFav
					itemKeyPrefix="fav"
				/>
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
							const hostLabel = `${sub}${port && Number(port) !== 22 && Number(port) !== 3389 && !sub.includes(`:${port}`) ? `:${port}` : ''}`;
							const isSelected = activeIndex === idx;
							const cardTitle = folderPathString ? `${label} (${hostLabel}) · ${folderPathString}` : `${label} (${hostLabel})`;

							return (
								<div
									key={node.key || `proto-${idx}`}
									className={`cyber-result-card ${isSelected ? 'active-item' : ''}`}
									style={{
										'--row-color': color,
										'--row-color-rgb': rgbColor
									}}
									title={cardTitle}
									onClick={() => handleSelectSearchResult(node)}
									onMouseEnter={() => setActiveIndex(idx)}
								>
									<span className="crc-prefix-arrow">$</span>
									<span className="crc-badge">{badgeLabel}</span>
									<div className="crc-info">
										<div className="crc-top-line">
											<span className="crc-name">{label}</span>
											<span className="crc-host">{hostLabel}</span>
										</div>
									</div>
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
					<div style={{ display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
						<span className="css-dot" />
						<span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
							{isNarrow ? 'STANDBY' : 'STANDBY // BUSCADOR DIRECTO'}
						</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: isNarrow ? '3px' : '4px', flexShrink: 0 }}>
						{!isVeryNarrow && <span><kbd>↑↓</kbd>{!isNarrow && ' Navegar'}</span>}
						<span><kbd>↵</kbd>{!isNarrow && ' Conectar'}</span>
						<span><kbd>ESC</kbd>{!isNarrow && ' Limpiar'}</span>
					</div>
				</div>
			)}
		</div>
	);
};
export default HomeSearchPanel;
