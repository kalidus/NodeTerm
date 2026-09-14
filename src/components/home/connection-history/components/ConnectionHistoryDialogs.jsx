import React from 'react';
import ReactDOM from 'react-dom';
import FilterPanel from '../../../FilterPanel';
import favoriteGroupsStore from '../../../../utils/favoriteGroupsStore';

export const ConnectionHistoryDialogs = ({
	// FilterPanel props
	filterPanelOpen,
	setFilterPanelOpen,
	filterContext,
	activeFavFilters,
	activeRecentFilters,
	handleApplyFilters,
	recentConnections = [],
	favoriteConnections = [],
	favoriteGroups = [],
	countByType,
	themeColors,
	handleDeleteGroup,

	// Filter Config Dialog props
	showFilterConfig,
	setShowFilterConfig,
	allFilters,
	setAllFilters,

	// Create Group Dialog props
	showCreateGroupDialog,
	setShowCreateGroupDialog,
	newGroupName,
	setNewGroupName,
	newGroupColor,
	setNewGroupColor,
	handleCreateGroup,

	// Edit Group Menu props
	editingGroup,
	setEditingGroup,

	// Group Selector Dialog props
	showGroupSelector,
	setShowGroupSelector,
	connectionToFavorite,
	setConnectionToFavorite,
	customGroups = [],
	selectedGroupsForFav = [],
	toggleGroupForFavorite,
	handleRemoveFavoriteFromDialog,
	handleConfirmAddFavorite,
	toggleFavorite,
	loadConnectionHistory,
	isFavorite,

	// Edit Favorite Groups Dialog props
	showEditFavGroups,
	setShowEditFavGroups,
	editingFavorite,
	editSelectedGroups = [],
	toggleEditGroup,
	handleSaveEditGroups
}) => {
	return (
		<>
			{/* FilterPanel Dropdown - Rendered in Portal to avoid clipping */}
			{ReactDOM.createPortal(
				<FilterPanel
					isOpen={filterPanelOpen}
					onClose={() => setFilterPanelOpen(false)}
					activeFilters={filterContext === 'favorites' ? activeFavFilters : activeRecentFilters}
					onApplyFilters={handleApplyFilters}
					availableFilters={{
						protocols: favoriteGroupsStore.getProtocolFilters().map(f => ({
							...f,
							count: countByType ? countByType(filterContext === 'recents' ? recentConnections : favoriteConnections, f.id) : 0
						})),
						groups: favoriteGroups.filter(g => !g.isDefault).map(g => ({
							id: g.id,
							label: g.name,
							icon: g.icon || 'pi-folder',
							color: g.color,
							count: filterContext === 'recents'
								? recentConnections.filter(c => c.groupId === g.id).length
								: favoriteGroupsStore.getFavoritesInGroup(g.id, favoriteConnections).length
						}))
					}}
					themeColors={themeColors}
					onCreateGroup={() => setShowCreateGroupDialog(true)}
					onDeleteGroup={handleDeleteGroup}
				/>,
				document.body
			)}

			{/* Filter Configuration Dialog */}
			{showFilterConfig && ReactDOM.createPortal(
				<div className="create-group-overlay" onClick={() => setShowFilterConfig(false)}>
					<div className="app-dialog create-group-dialog filter-config-dialog" onClick={(e) => e.stopPropagation()}>
						<div className="dialog-header">
							<h3><i className="pi pi-cog" /> Configurar Filtros</h3>
							<button className="dialog-close" onClick={() => setShowFilterConfig(false)}>
								<i className="pi pi-times" />
							</button>
						</div>
						<div className="dialog-body">
							<p style={{ color: 'rgba(255,255,255,0.6)', margin: '0 0 16px', fontSize: '0.85rem' }}>
								Activa o desactiva los filtros que deseas ver en la barra:
							</p>
							<div className="filter-config-list">
								{allFilters.map(filter => (
									<div
										key={filter.id}
										className={`filter-config-item ${filter.visible ? 'visible' : 'hidden'}`}
										style={{ '--item-color': filter.color }}
									>
										<div className="filter-config-info">
											{filter.isGroup && (
												<span className="filter-config-dot" style={{ background: filter.color }} />
											)}
											<i className={`pi ${filter.icon}`} style={{ color: filter.color }} />
											<span className="filter-config-label">{filter.label}</span>
											{filter.isProtocol && <span className="filter-config-type">Protocolo</span>}
											{filter.isGroup && <span className="filter-config-type">Grupo</span>}
										</div>
										<button
											type="button"
											className={`filter-config-toggle ${filter.visible ? 'on' : 'off'}`}
											onClick={() => {
												if (filter.id !== 'all') {
													favoriteGroupsStore.setFilterVisibility(filter.id, !filter.visible);
													setAllFilters(favoriteGroupsStore.getAllFilters());
												}
											}}
											disabled={filter.id === 'all'}
											title={filter.id === 'all' ? 'Este filtro siempre está visible' : (filter.visible ? 'Ocultar' : 'Mostrar')}
										>
											<i className={filter.visible ? 'pi pi-eye' : 'pi pi-eye-slash'} />
										</button>
									</div>
								))}
							</div>
						</div>
						<div className="dialog-footer">
							<button
								className="btn-cancel"
								onClick={() => {
									favoriteGroupsStore.resetFilterConfig();
									setAllFilters(favoriteGroupsStore.getAllFilters());
								}}
							>
								<i className="pi pi-refresh" /> Restaurar
							</button>
							<button className="btn-create" onClick={() => setShowFilterConfig(false)}>
								<i className="pi pi-check" /> Listo
							</button>
						</div>
					</div>
				</div>,
				document.body
			)}

			{/* Create Group Dialog */}
			{showCreateGroupDialog && ReactDOM.createPortal(
				<div className="create-group-overlay" onClick={() => setShowCreateGroupDialog(false)}>
					<div className="app-dialog create-group-dialog" onClick={(e) => e.stopPropagation()}>
						<div className="dialog-header">
							<h3>Crear Grupo</h3>
							<button className="dialog-close" onClick={() => setShowCreateGroupDialog(false)}>
								<i className="pi pi-times" />
							</button>
						</div>
						<div className="dialog-body">
							<div className="form-field">
								<label>Nombre del grupo</label>
								<input
									type="text"
									value={newGroupName}
									onChange={(e) => setNewGroupName(e.target.value)}
									placeholder={"Ej: Producción, Desarrollo..."}
									autoFocus
									onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
								/>
							</div>
							<div className="form-field">
								<label>Color</label>
								<div className="color-picker">
									{['#4fc3f7', '#ff6b35', '#81c784', '#FFB300', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722'].map(c => (
										<button
											key={c}
											type="button"
											className={`color-option ${newGroupColor === c ? 'selected' : ''}`}
											style={{ background: c }}
											onClick={() => setNewGroupColor(c)}
										/>
									))}
								</div>
							</div>
						</div>
						<div className="dialog-footer">
							<button className="btn-cancel" onClick={() => setShowCreateGroupDialog(false)}>
								Cancelar
							</button>
							<button className="btn-create" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
								<i className="pi pi-check" /> Crear
							</button>
						</div>
					</div>
				</div>,
				document.body
			)}

			{/* Edit/Delete Group Menu */}
			{editingGroup && ReactDOM.createPortal(
				<div className="create-group-overlay" onClick={() => setEditingGroup(null)}>
					<div className="app-dialog create-group-dialog small" onClick={(e) => e.stopPropagation()}>
						<div className="dialog-header">
							<h3>Opciones de "{editingGroup.name}"</h3>
							<button className="dialog-close" onClick={() => setEditingGroup(null)}>
								<i className="pi pi-times" />
							</button>
						</div>
						<div className="dialog-body">
							<button
								className="menu-option danger"
								onClick={() => {
									handleDeleteGroup(editingGroup.id);
									setEditingGroup(null);
								}}
							>
								<i className="pi pi-trash" /> Eliminar grupo
							</button>
						</div>
					</div>
				</div>,
				document.body
			)}

			{/* Group Selector Dialog */}
			{showGroupSelector && connectionToFavorite && ReactDOM.createPortal(
				<div className="create-group-overlay" onClick={() => setShowGroupSelector(false)}>
					<div className="app-dialog create-group-dialog" onClick={(e) => e.stopPropagation()}>
						<div className="dialog-header">
							<h3>{isFavorite(connectionToFavorite) ? 'Editar favorito' : 'Agregar a favoritos'}</h3>
							<button className="dialog-close" onClick={() => setShowGroupSelector(false)}>
								<i className="pi pi-times" />
							</button>
						</div>
						<div className="dialog-body">
							<p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 16px', fontSize: '0.9rem' }}>
								Selecciona los grupos para <strong style={{ color: '#fff' }}>{connectionToFavorite.name}</strong>:
							</p>
							<div className="groups-selector">
								{customGroups.map(group => (
									<button
										key={group.id}
										type="button"
										className={`group-selector-item ${selectedGroupsForFav.includes(group.id) ? 'selected' : ''}`}
										onClick={() => toggleGroupForFavorite(group.id)}
										style={{ '--group-color': group.color }}
									>
										<span className="group-dot" style={{ background: group.color }} />
										<span>{group.name}</span>
										{selectedGroupsForFav.includes(group.id) && (
											<i className="pi pi-check" style={{ marginLeft: 'auto', color: group.color }} />
										)}
									</button>
								))}
							</div>
							{!customGroups.length && (
								<p style={{ color: 'rgba(255,255,255,0.5)', margin: '8px 0', fontSize: '0.8rem', fontStyle: 'italic' }}>
									No hay grupos personalizados.
								</p>
							)}
						</div>
						<div className="dialog-footer">
							{isFavorite(connectionToFavorite) ? (
								<button
									className="btn-cancel"
									style={{ color: '#ff5252' }}
									onClick={handleRemoveFavoriteFromDialog}
								>
									<i className="pi pi-trash" style={{ marginRight: 6 }} />
									Quitar fav
								</button>
							) : (
								<button
									className="btn-cancel"
									onClick={() => {
										toggleFavorite?.(connectionToFavorite);
										loadConnectionHistory?.();
										setShowGroupSelector(false);
										setConnectionToFavorite(null);
									}}
								>
									Sin grupos
								</button>
							)}

							<button className="btn-create" onClick={handleConfirmAddFavorite}>
								{isFavorite(connectionToFavorite) ? (
									<><i className="pi pi-save" /> Guardar</>
								) : (
									<><i className="pi pi-star-fill" /> Agregar</>
								)}
							</button>
						</div>
					</div>
				</div>,
				document.body
			)}

			{/* Edit Favorite Groups Dialog */}
			{showEditFavGroups && editingFavorite && ReactDOM.createPortal(
				<div className="create-group-overlay" onClick={() => setShowEditFavGroups(false)}>
					<div className="app-dialog create-group-dialog" onClick={(e) => e.stopPropagation()}>
						<div className="dialog-header">
							<h3><i className="pi pi-folder" /> Grupos de Favoritos</h3>
							<button className="dialog-close" onClick={() => setShowEditFavGroups(false)}>
								<i className="pi pi-times" />
							</button>
						</div>
						<div className="dialog-body">
							<p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 16px', fontSize: '0.9rem' }}>
								Asignar <strong style={{ color: '#fff' }}>{editingFavorite.name}</strong> a grupos:
							</p>
							<div className="groups-selector">
								{customGroups.length > 0 ? (
									customGroups.map(group => (
										<button
											key={group.id}
											type="button"
											className={`group-selector-item ${editSelectedGroups.includes(group.id) ? 'selected' : ''}`}
											onClick={() => toggleEditGroup(group.id)}
											style={{ '--group-color': group.color }}
										>
											<span className="group-dot" style={{ background: group.color }} />
											<span>{group.name}</span>
											{editSelectedGroups.includes(group.id) && (
												<i className="pi pi-check" style={{ marginLeft: 'auto', color: group.color }} />
											)}
										</button>
									))
								) : (
									<div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
										<i className="pi pi-info-circle" style={{ display: 'block', fontSize: '1.5rem', marginBottom: '8px' }} />
										No hay grupos personalizados creados.
									</div>
								)}
							</div>
						</div>
						<div className="dialog-footer">
							<button className="btn-cancel" onClick={() => setShowEditFavGroups(false)}>Cancelar</button>
							<button className="btn-create" onClick={handleSaveEditGroups}>
								<i className="pi pi-save" /> Guardar Cambios
							</button>
						</div>
					</div>
				</div>,
				document.body
			)}
		</>
	);
};

export default ConnectionHistoryDialogs;
