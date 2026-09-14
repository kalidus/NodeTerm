import React from 'react';
import ConnectionRow from './ConnectionRow';
import FilterBadge from '../../../FilterBadge';
import StandaloneStatusBar from '../../../StandaloneStatusBar';
import { activeKey } from '../utils/connectionHistoryHelpers';

export const HomeTerminalSplitPanel = ({
	children,
	splitOpen,
	setSplitOpen,
	splitView,
	setSplitView,
	splitWidth,
	handleSplitDragStart,
	splitBodyRef,
	filteredFavorites = [],
	filteredRecentsForDisplay = [],
	activeFavFilters = { protocols: [], groups: [], states: [] },
	activeRecentFilters = { protocols: [], groups: [], states: [] },
	getActiveFilterCount,
	getFilterLabel,
	getFilterColor,
	getFilterIcon,
	handleRemoveFilter,
	setFilterContext,
	setFilterPanelOpen,
	clearRecents,
	isFavorite,
	activeIds = new Set(),
	onConnectToHistory,
	onEdit,
	handleToggleFavoriteWithGroup,
	statusBarVisible = false,
	terminalTheme = {}
}) => {
	const activeFilters = splitView === 'favorites' ? activeFavFilters : activeRecentFilters;
	const activeCount = getActiveFilterCount ? getActiveFilterCount(activeFilters) : 0;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
			<div
				ref={splitBodyRef}
				style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}
			>
				<div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
					{children}
				</div>

				{splitOpen && (() => {
					const splitConnections = splitView === 'favorites' ? filteredFavorites : filteredRecentsForDisplay;
					const panelW = splitWidth !== null
						? splitWidth
						: (splitBodyRef.current ? splitBodyRef.current.getBoundingClientRect().width * 0.25 : 220);
					return (
						<>
							<div
								onMouseDown={handleSplitDragStart}
								style={{
									width: 4,
									height: '100%',
									cursor: 'col-resize',
									flexShrink: 0,
									background: 'rgba(255,255,255,0.06)',
									transition: 'background 0.15s'
								}}
								onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
								onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
								title="Arrastrar para redimensionar"
							/>
							<div style={{
								width: panelW,
								minWidth: 160,
								maxWidth: '60%',
								flexShrink: 0,
								display: 'flex',
								flexDirection: 'column',
								overflow: 'hidden'
							}}>
								<div style={{
									display: 'flex',
									alignItems: 'center',
									gap: 2,
									padding: '4px 8px',
									borderBottom: `1px solid rgba(255,255,255,0.06)`,
									flexShrink: 0
								}}>
									<button
										onClick={() => setSplitView('recent')}
										style={{
											flex: 1,
											padding: '3px 5px',
											border: 'none',
											borderRadius: 3,
											cursor: 'pointer',
											fontSize: '0.7rem',
											fontFamily: 'inherit',
											background: splitView === 'recent' ? 'rgba(79,195,247,0.14)' : 'transparent',
											color: splitView === 'recent' ? '#4fc3f7' : 'rgba(255,255,255,0.35)',
											fontWeight: splitView === 'recent' ? 700 : 400,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											gap: 3
										}}
									>
										<i className="pi pi-clock" style={{ fontSize: '0.65rem' }} /> Recientes
									</button>
									<button
										onClick={() => setSplitView('favorites')}
										style={{
											flex: 1,
											padding: '3px 5px',
											border: 'none',
											borderRadius: 3,
											cursor: 'pointer',
											fontSize: '0.7rem',
											fontFamily: 'inherit',
											background: splitView === 'favorites' ? 'rgba(255,215,0,0.1)' : 'transparent',
											color: splitView === 'favorites' ? '#FFD700' : 'rgba(255,255,255,0.35)',
											fontWeight: splitView === 'favorites' ? 700 : 400,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											gap: 3
										}}
									>
										<i className="pi pi-star" style={{ fontSize: '0.65rem' }} /> Favoritos
									</button>
									<button
										onClick={() => setSplitOpen(false)}
										title="Cerrar split"
										style={{
											padding: '3px 5px',
											border: 'none',
											borderRadius: 3,
											cursor: 'pointer',
											background: 'transparent',
											color: 'rgba(255,255,255,0.2)',
											fontSize: '0.6rem',
											flexShrink: 0
										}}
										onMouseEnter={e => e.currentTarget.style.color = '#ff5f56'}
										onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
									>
										<i className="pi pi-times" />
									</button>
								</div>
								<div style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									padding: '2px 8px',
									fontSize: '0.62rem',
									color: 'rgba(255,255,255,0.25)',
									fontFamily: "'Fira Code', monospace",
									borderBottom: `1px solid rgba(255,255,255,0.04)`,
									flexShrink: 0
								}}>
									<div>
										<span style={{ color: 'rgba(255,255,255,0.4)' }}>~</span>/{splitView === 'favorites' ? 'favorites' : 'recent'} · {splitConnections.length}
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
										<button
											className="split-header-filter-btn"
											onClick={(e) => {
												e.stopPropagation();
												setFilterContext(splitView === 'favorites' ? 'favorites' : 'recents');
												setFilterPanelOpen(true);
											}}
											style={{
												background: 'transparent',
												border: 'none',
												color: activeCount > 0 ? '#4fc3f7' : 'rgba(255,255,255,0.4)',
												cursor: 'pointer',
												padding: '2px',
												display: 'flex',
												alignItems: 'center',
												transition: 'color 0.2s'
											}}
											title="Filtrar por protocolo"
											onMouseEnter={e => e.currentTarget.style.color = '#4fc3f7'}
											onMouseLeave={e => e.currentTarget.style.color = activeCount > 0 ? '#4fc3f7' : 'rgba(255,255,255,0.4)'}
										>
											<i className={activeCount > 0 ? "pi pi-filter-fill" : "pi pi-filter"} style={{ fontSize: '0.65rem' }} />
										</button>

										{splitView === 'recent' && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													if (confirm('¿Estás seguro de que deseas limpiar el historial de recientes?')) {
														clearRecents?.();
													}
												}}
												style={{
													background: 'transparent',
													border: 'none',
													color: 'rgba(255,255,255,0.4)',
													cursor: 'pointer',
													padding: '2px',
													display: 'flex',
													alignItems: 'center',
													transition: 'color 0.2s'
												}}
												title="Limpiar panel de recientes"
												onMouseEnter={e => e.currentTarget.style.color = '#ff5f56'}
												onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
											>
												<i className="pi pi-trash" style={{ fontSize: '0.65rem' }} />
											</button>
										)}
									</div>
								</div>
								{activeCount > 0 && (
									<div style={{
										display: 'flex',
										flexWrap: 'wrap',
										gap: '4px',
										padding: '4px 8px',
										borderBottom: `1px solid rgba(255,255,255,0.04)`,
										background: 'rgba(255,255,255,0.02)',
										flexShrink: 0
									}}>
										{activeFilters.protocols?.map(filterId => (
											<FilterBadge
												key={`protocol-${filterId}`}
												label={getFilterLabel('protocols', filterId)}
												color={getFilterColor('protocols', filterId)}
												icon={getFilterIcon('protocols', filterId)}
												type="protocol"
												onRemove={() => handleRemoveFilter(splitView === 'favorites' ? 'favorites' : 'recents', 'protocols', filterId)}
												compact
											/>
										))}
										{activeFilters.groups?.map(filterId => (
											<FilterBadge
												key={`group-${filterId}`}
												label={getFilterLabel('groups', filterId)}
												color={getFilterColor('groups', filterId)}
												icon={getFilterIcon('groups', filterId)}
												type="group"
												onRemove={() => handleRemoveFilter(splitView === 'favorites' ? 'favorites' : 'recents', 'groups', filterId)}
												compact
											/>
										))}
										{activeFilters.states?.map(filterId => (
											<FilterBadge
												key={`state-${filterId}`}
												label={getFilterLabel('states', filterId)}
												color={getFilterColor('states', filterId)}
												icon={getFilterIcon('states', filterId)}
												type="state"
												onRemove={() => handleRemoveFilter(splitView === 'favorites' ? 'favorites' : 'recents', 'states', filterId)}
												compact
											/>
										))}
									</div>
								)}
								<div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
									{splitConnections.length === 0 ? (
										<div style={{
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'center',
											justifyContent: 'center',
											height: '100%',
											gap: 8,
											color: 'rgba(255,255,255,0.2)',
											fontSize: '0.75rem',
											padding: 16,
											textAlign: 'center'
										}}>
											<i className={splitView === 'favorites' ? 'pi pi-star' : 'pi pi-clock'} style={{ fontSize: '1.3rem', opacity: 0.3 }} />
											<span>No hay {splitView === 'favorites' ? 'favoritos' : 'recientes'}</span>
										</div>
									) : splitConnections.map(conn => (
										<ConnectionRow
											key={conn.id}
											connection={conn}
											isPinned={isFavorite ? isFavorite(conn) : false}
											isActive={activeIds ? activeIds.has(activeKey(conn)) : false}
											onConnect={onConnectToHistory}
											onEdit={onEdit}
											onToggleFav={handleToggleFavoriteWithGroup}
											isSplit={true}
										/>
									))}
								</div>
							</div>
						</>
					);
				})()}
			</div>

			{statusBarVisible && (
				<StandaloneStatusBar
					visible={true}
					style={{
						position: 'relative',
						bottom: 'auto',
						left: 'auto',
						right: 'auto',
						width: '100%',
						zIndex: 5,
						borderTop: `1px solid ${terminalTheme.brightBlack ? terminalTheme.brightBlack + '33' : 'rgba(255,255,255,0.05)'}`,
						marginTop: 'auto'
					}}
				/>
			)}
		</div>
	);
};

export default HomeTerminalSplitPanel;
