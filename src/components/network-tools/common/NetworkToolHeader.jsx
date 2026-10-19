import React from 'react';
import NetworkToolHistoryMenu from './NetworkToolHistoryMenu';

/**
 * NetworkToolHeader - Encabezado unificado para las herramientas de red
 */
const NetworkToolHeader = ({
  tool,
  children,
  extraActions,
  isMobile = false,
  history,
  onViewHistory,
  onRerunHistory
}) => {
  const categoryColor = tool?.categoryColor || '#2196f3';
  const icon = tool?.icon || 'pi pi-cog';
  const label = tool?.label || '';
  const description = tool?.description || '';

  return (
    <div
      className="network-tool-header-container"
      style={{ '--nt-category-color': categoryColor }}
    >
      <div className="network-tool-header-row">
        <div className="network-tool-header-title-block">
          <div className="network-tool-header-icon">
            <i className={icon} />
          </div>
          <div className="network-tool-header-copy">
            <h4>{label}</h4>
            {!isMobile && description && (
              <span>{description}</span>
            )}
          </div>
        </div>
        {(history || extraActions) && (
          <div className="network-tool-header-actions">
            {history && (
              <NetworkToolHistoryMenu
                items={history.items}
                onView={onViewHistory}
                onRerun={onRerunHistory}
                onPin={history.togglePin}
                onDelete={history.remove}
              />
            )}
            {extraActions}
          </div>
        )}
      </div>

      {children && (
        <div className="network-tool-header-controls">
          {children}
        </div>
      )}
    </div>
  );
};

export default NetworkToolHeader;
