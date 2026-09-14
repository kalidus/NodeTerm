import React from 'react';
import FilterBadge from '../../../FilterBadge';
import ConnectionTable from './ConnectionTable';

export const HomeRecentsPanel = ({
	activeRecentFilters = { protocols: [], groups: [], states: [] },
	getActiveFilterCount,
	getFilterLabel,
	getFilterColor,
	getFilterIcon,
	handleRemoveFilter,
	filteredRecentsForDisplay = [],
	activeIds,
	onConnectToHistory,
	onEdit,
	handleToggleFavoriteWithGroup
}) => {
	const activeCount = getActiveFilterCount ? getActiveFilterCount(activeRecentFilters) : 0;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
			{activeCount > 0 && (
				<div className="recents-filter-chips-bar" style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
					{activeRecentFilters.protocols?.map(filterId => (
						<FilterBadge
							key={`protocol-${filterId}`}
							label={getFilterLabel('protocols', filterId)}
							color={getFilterColor('protocols', filterId)}
							icon={getFilterIcon('protocols', filterId)}
							type="protocol"
							onRemove={() => handleRemoveFilter('recents', 'protocols', filterId)}
							compact
						/>
					))}
					{activeRecentFilters.groups?.map(filterId => (
						<FilterBadge
							key={`group-${filterId}`}
							label={getFilterLabel('groups', filterId)}
							color={getFilterColor('groups', filterId)}
							icon={getFilterIcon('groups', filterId)}
							type="group"
							onRemove={() => handleRemoveFilter('recents', 'groups', filterId)}
							compact
						/>
					))}
					{activeRecentFilters.states?.map(filterId => (
						<FilterBadge
							key={`state-${filterId}`}
							label={getFilterLabel('states', filterId)}
							color={getFilterColor('states', filterId)}
							icon={getFilterIcon('states', filterId)}
							type="state"
							onRemove={() => handleRemoveFilter('recents', 'states', filterId)}
							compact
						/>
					))}
				</div>
			)}
			<div className="recents-terminal-body" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
				<ConnectionTable
					connections={filteredRecentsForDisplay}
					title="Nombre"
					emptyMessage="# no recent sessions"
					activeIds={activeIds}
					onConnect={onConnectToHistory}
					onEdit={onEdit}
					onToggleFav={handleToggleFavoriteWithGroup}
				/>
			</div>
		</div>
	);
};

export default HomeRecentsPanel;
