import React from 'react';
import FilterBadge from '../../../FilterBadge';
import { CyberConnectionList, usePanelBreakpoints } from './CyberConnectionList';

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
	const { ref, className: breakpointClass } = usePanelBreakpoints();
	const count = filteredRecentsForDisplay.length;

	return (
		<div
			ref={ref}
			className={`cyber-sessions-panel-body ${breakpointClass}`.trim()}
		>
			{activeCount > 0 && (
				<div className="cyber-sessions-chips-bar">
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
			<CyberConnectionList
				connections={filteredRecentsForDisplay}
				accent="#2196F3"
				title={`RECENT SESSIONS // ${count.toString().padStart(2, '0')}`}
				subtitle="HISTORIAL RECIENTE"
				emptyMessage="// NO SE REGISTRARON SESIONES RECIENTES"
				activeIds={activeIds}
				onConnect={onConnectToHistory}
				onEdit={onEdit}
				onToggleFav={handleToggleFavoriteWithGroup}
				showTime
				showFav
				itemKeyPrefix="recent"
				hudClassName="cyber-sessions-hud"
			/>
		</div>
	);
};

export default HomeRecentsPanel;
