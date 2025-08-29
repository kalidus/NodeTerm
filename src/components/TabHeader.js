import React from 'react';
import { Button } from 'primereact/button';
import DistroIcon from './DistroIcon';

const TabHeader = React.memo(({ 
  // Props básicas de PrimeReact
  className,
  onClick,
  onKeyDown,
  leftIcon,
  rightIcon,
  style,
  selected,
  
  // Props específicas de la pestaña
  tab,
  idx,
  
  // Estados de drag & drop
  isDragging,
  isDragOver,
  dragStartTimer,
  draggedTabIndex,
  
  // Props de iconos
  tabDistros,
  
  // Event handlers
  onTabClick,
  onTabDragStart,
  onTabDragOver,
  onTabDragLeave,
  onTabDrop,
  onTabDragEnd,
  onTabContextMenu,
  onTabClose
}) => {
  const isHomeTab = tab.type === 'home';

  return (
    <div
      className={`${className} ${isDragging ? 'tab-dragging' : ''} ${isDragOver ? 'tab-drop-zone' : ''}`}
      style={{ 
        ...style, 
        display: 'flex', 
        alignItems: 'center', 
        maxWidth: 220,
        opacity: isDragging ? 0.5 : 1,
        borderLeft: isDragOver ? '3px solid var(--primary-color)' : 'none',
        transition: 'opacity 0.2s, border-left 0.2s',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onClick={(e) => {
        // Prevenir click si está en proceso de drag o hay un timer activo
        if (draggedTabIndex !== null || dragStartTimer !== null) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (onTabClick) {
          onTabClick(e);
        } else {
          onClick(e);
        }
      }}
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-selected={selected}
      role="tab"
      draggable="true"
      onDragStart={(e) => onTabDragStart && onTabDragStart(e, idx)}
      onDragOver={(e) => onTabDragOver && onTabDragOver(e, idx)}
      onDragLeave={onTabDragLeave}
      onDrop={(e) => onTabDrop && onTabDrop(e, idx)}
      onDragEnd={onTabDragEnd}
      onContextMenu={(e) => onTabContextMenu && onTabContextMenu(e, tab.key)}
      title="Arrastra para reordenar pestañas | Clic derecho para opciones de grupo"
    >
      {leftIcon}
      
      {/* Mostrar icono de distribución si está disponible para pestañas de terminal */}
      {tab.type === 'terminal' && tabDistros && tabDistros[tab.key] && (
        <DistroIcon distro={tabDistros[tab.key]} size={12} />
      )}
      
      {/* Icono específico para pestaña de inicio */}
      {tab.type === 'home' && (
        <i className="pi pi-home" style={{ fontSize: '12px', marginRight: '6px', color: '#28a745' }}></i>
      )}
      
      {/* Icono específico para splits */}
      {tab.type === 'split' && (
        <i className="pi pi-window-maximize" style={{ fontSize: '12px', marginRight: '6px', color: '#007ad9' }}></i>
      )}
      
      {/* Icono específico para exploradores */}
      {(tab.type === 'explorer' || tab.isExplorerInSSH) && (
        <i className="pi pi-folder-open" style={{ fontSize: '12px', marginRight: '6px' }}></i>
      )}
      
      {/* Icono específico para pestañas RDP */}
      {tab.type === 'rdp' && (
        <i className="pi pi-desktop" style={{ fontSize: '12px', marginRight: '6px', color: '#007ad9' }}></i>
      )}
      
      {/* Icono específico para pestañas RDP-Guacamole */}
      {tab.type === 'rdp-guacamole' && (
        <i className="pi pi-desktop" style={{ fontSize: '12px', marginRight: '6px', color: '#ff6b35' }}></i>
      )}
      
      {/* Icono específico para pestañas Guacamole */}
      {tab.type === 'guacamole' && (
        <i className="pi pi-globe" style={{ fontSize: '12px', marginRight: '6px', color: '#00C851' }}></i>
      )}
      
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {tab.label}
      </span>
      
      {tab.type !== 'home' && (
        <Button
          icon="pi pi-times"
          className="p-button-rounded p-button-text p-button-sm ml-2"
          style={{ marginLeft: 8, minWidth: 12, minHeight: 12 }}
          onClick={(e) => {
            e.stopPropagation();
            if (onTabClose) {
              onTabClose(tab, idx, isHomeTab);
            }
          }}
        />
      )}
      
      {rightIcon}
    </div>
  );
});

export default TabHeader;
