import React, { useMemo } from 'react';
import FilterPanel from '../../../FilterPanel';
import favoriteGroupsStore from '../../../../utils/favoriteGroupsStore';

export const HomeFilterPanel = ({
	isOpen = false,
	onClose,
	context = 'recents',
	onContextChange,
	activeFavFilters,
	activeRecentFilters,
	onApplyFilters,
	recentConnections = [],
	favoriteConnections = [],
	favoriteGroups = [],
	countByType,
	themeColors = {},
	onCreateGroup,
	onDeleteGroup
}) => {
	const availableFilters = useMemo(() => ({
		protocols: favoriteGroupsStore.getProtocolFilters().map(f => ({
			...f,
			count: countByType ? countByType(context === 'recents' ? recentConnections : favoriteConnections, f.id) : 0
		})),
		groups: favoriteGroups.filter(g => !g.isDefault).map(g => ({
			id: g.id,
			label: g.name,
			icon: g.icon || 'pi-folder',
			color: g.color,
			count: context === 'recents'
				? recentConnections.filter(c => c.groupId === g.id).length
				: favoriteGroupsStore.getFavoritesInGroup(g.id, favoriteConnections).length
		}))
	}), [context, recentConnections, favoriteConnections, favoriteGroups, countByType]);

	return (
		<div className="home-filter-panel-root">
			{onContextChange && (
				<div className="home-filter-context-tabs">
					<button
						type="button"
						className={`home-filter-context-tab${context === 'recents' ? ' active' : ''}`}
						onClick={() => onContextChange('recents')}
					>
						<i className="pi pi-clock" />
						Recientes
					</button>
					<button
						type="button"
						className={`home-filter-context-tab${context === 'favorites' ? ' active' : ''}`}
						onClick={() => onContextChange('favorites')}
					>
						<i className="pi pi-star" />
						Favoritos
					</button>
				</div>
			)}
			<FilterPanel
				embedded
				isOpen={isOpen}
				onClose={onClose}
				activeFilters={context === 'favorites' ? activeFavFilters : activeRecentFilters}
				onApplyFilters={onApplyFilters}
				availableFilters={availableFilters}
				themeColors={themeColors}
				onCreateGroup={onCreateGroup}
				onDeleteGroup={onDeleteGroup}
			/>
		</div>
	);
};

export default HomeFilterPanel;
