import React from 'react';
import favoriteGroupsStore from '../../../../utils/favoriteGroupsStore';

export const HomeGroupWorkspacePanel = ({
  customGroups = [],
  favoriteConnections = [],
  onLoadGroup,
  onConnectToHistory
}) => {
  const groups = (customGroups || []).filter((g) => g && !g.isDefault);

  const connectGroup = (group) => {
    const members = favoriteGroupsStore.getFavoritesInGroup(group.id, favoriteConnections) || [];
    if (onLoadGroup && members.length) {
      onLoadGroup({
        type: 'group',
        id: group.id,
        name: group.name,
        color: group.color,
        sessions: members
      });
      return;
    }
    members.forEach((conn) => onConnectToHistory?.(conn));
  };

  if (!groups.length) {
    return (
      <div className="home-widget-empty">
        Crea un grupo de favoritos para abrir un workspace de una vez.
      </div>
    );
  }

  return (
    <div className="home-group-grid">
      {groups.map((group) => {
        const members = favoriteGroupsStore.getFavoritesInGroup(group.id, favoriteConnections) || [];
        return (
          <div
            key={group.id}
            className="home-group-card"
            style={{ '--tile-color': group.color || '#4fc3f7' }}
          >
            <div className="home-fav-tile-top">
              <i className={`pi ${group.icon || 'pi-folder'}`} style={{ color: group.color || '#4fc3f7' }} />
              <span className="home-group-count">{members.length} hosts</span>
            </div>
            <div className="home-fav-name">{group.name}</div>
            <div className="home-group-actions">
              <button type="button" onClick={() => connectGroup(group)}>
                Conectar todos
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HomeGroupWorkspacePanel;
