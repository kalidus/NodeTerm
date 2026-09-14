import React from 'react';
import FilterBadge from '../../../FilterBadge';
import ConnectionTable from './ConnectionTable';

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
	handleToggleFavoriteWithGroup
}) => {
	const activeCount = getActiveFilterCount ? getActiveFilterCount(activeFavFilters) : 0;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
			{activeCount > 0 && (
				<div className="recents-filter-chips-bar" style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
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
			<div className="recents-terminal-body" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
				<ConnectionTable
					connections={filteredFavorites}
					title="Favoritos"
					emptyMessage="# no favorite sessions found"
					activeIds={activeIds}
					onConnect={onConnectToHistory}
					onEdit={onEdit}
					onToggleFav={handleToggleFavoriteWithGroup}
				/>
			</div>
		</div>
	);
};

export default HomeFavoritesPanel;
