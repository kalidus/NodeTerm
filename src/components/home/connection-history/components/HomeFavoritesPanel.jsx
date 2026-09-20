import React from 'react';
import FilterBadge from '../../../FilterBadge';
import { CyberConnectionList, usePanelBreakpoints } from './CyberConnectionList';

export const HomeFavoritesPanel = ({
	activeFavFilters = { protocols: [], groups: [], states: [] },
	getActiveFilterCount,
	getFilterLabel,
	getFilterColor,
	getFilterIcon,
	handleRemoveFilter,
	filteredFavorites = [],
	activeIds,
	onConnectToHistory,
	onEdit,
	handleToggleFavoriteWithGroup,
	onOpenFilter,
	filterOpen = false
}) => {
	const activeCount = getActiveFilterCount ? getActiveFilterCount(activeFavFilters) : 0;
	const { ref, className: breakpointClass } = usePanelBreakpoints();
	const count = filteredFavorites.length;

	return (
		<div
			ref={ref}
			className={`cyber-sessions-panel-body ${breakpointClass}`.trim()}
		>
			{activeCount > 0 && (
				<div className="cyber-sessions-chips-bar">
					{activeFavFilters.protocols?.map(filterId => (
						<FilterBadge
							key={`fav-protocol-${filterId}`}
							label={getFilterLabel('protocols', filterId)}
							color={getFilterColor('protocols', filterId)}
							icon={getFilterIcon('protocols', filterId)}
							type="protocol"
							onRemove={() => handleRemoveFilter('favorites', 'protocols', filterId)}
							compact
						/>
					))}
					{activeFavFilters.groups?.map(filterId => (
						<FilterBadge
							key={`fav-group-${filterId}`}
							label={getFilterLabel('groups', filterId)}
							color={getFilterColor('groups', filterId)}
							icon={getFilterIcon('groups', filterId)}
							type="group"
							onRemove={() => handleRemoveFilter('favorites', 'groups', filterId)}
							compact
						/>
					))}
					{activeFavFilters.states?.map(filterId => (
						<FilterBadge
							key={`fav-state-${filterId}`}
							label={getFilterLabel('states', filterId)}
							color={getFilterColor('states', filterId)}
							icon={getFilterIcon('states', filterId)}
							type="state"
							onRemove={() => handleRemoveFilter('favorites', 'states', filterId)}
							compact
						/>
					))}
				</div>
			)}
			<CyberConnectionList
				connections={filteredFavorites}
				accent="#FFD700"
				title={`FAVORITES // ${count.toString().padStart(2, '0')}`}
				subtitle="ACCESOS FAVORITOS"
				headerRight={onOpenFilter ? (
					<button
						type="button"
						className={`cyber-sessions-filter-btn${(filterOpen || activeCount > 0) ? ' active' : ''}`}
						onClick={(e) => {
							e.stopPropagation();
							onOpenFilter();
						}}
						title={filterOpen ? 'Cerrar panel de filtros' : 'Filtrar favoritos'}
					>
						<i className={`pi ${activeCount > 0 ? 'pi-filter-fill' : 'pi-filter'}`} />
						{activeCount > 0 && <span>{activeCount}</span>}
					</button>
				) : null}
				emptyMessage="// NO HAY CONEXIONES MARCADAS COMO FAVORITAS"
				activeIds={activeIds}
				onConnect={onConnectToHistory}
				onEdit={onEdit}
				onToggleFav={handleToggleFavoriteWithGroup}
				showTime
				showFav
				itemKeyPrefix="fav"
				hudClassName="cyber-sessions-hud"
			/>
		</div>
	);
};

export default HomeFavoritesPanel;
