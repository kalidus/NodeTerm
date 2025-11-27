import React, { useState, useMemo } from 'react';

/**
 * Componente de Sidebar de Navegación para SettingsDialog
 * Maneja la navegación vertical con items principales y subitems
 */
const SettingsSidebarNav = ({
  activeMainTab,
  activeSubTab,
  onMainTabChange,
  onSubTabChange
}) => {
  const [expandedItems, setExpandedItems] = useState({ 
    seguridad: true, 
    apariencia: true 
  });

  const navigationStructure = useMemo(() => [
    {
      id: 'general',
      label: 'General',
      icon: 'pi pi-sliders-h',
      subitems: []
    },
    {
      id: 'seguridad',
      label: 'Seguridad',
      icon: 'pi pi-shield',
      subitems: [
        { id: 'clave-maestra', label: 'Clave Maestra', icon: 'pi pi-key' },
        { id: 'auditoria', label: 'Auditoría', icon: 'pi pi-video' }
      ]
    },
    {
      id: 'apariencia',
      label: 'Apariencia',
      icon: 'pi pi-palette',
      subitems: [
        { id: 'interfaz', label: 'Interfaz', icon: 'pi pi-eye' },
        { id: 'pestanas', label: 'Pestañas', icon: 'pi pi-palette' },
        { id: 'terminal', label: 'Terminal', icon: 'pi pi-desktop' },
        { id: 'status-bar', label: 'Status Bar', icon: 'pi pi-sliders-h' },
        { id: 'explorador-sesiones', label: 'Expl. Sesiones', icon: 'pi pi-sitemap' },
        { id: 'explorador-archivos', label: 'Expl. Archivos', icon: 'pi pi-folder-open' }
      ]
    },
    {
      id: 'rdp',
      label: 'RDP',
      icon: 'pi pi-desktop',
      subitems: []
    },
    {
      id: 'clientes-ia',
      label: 'Clientes de IA',
      icon: 'pi pi-comments',
      subitems: []
    },
    {
      id: 'actualizaciones',
      label: 'Actualizaciones',
      icon: 'pi pi-refresh',
      subitems: []
    },
    {
      id: 'sincronizacion',
      label: 'Sincronización',
      icon: 'pi pi-cloud',
      subitems: []
    },
    {
      id: 'informacion',
      label: 'Información',
      icon: 'pi pi-info-circle',
      subitems: []
    }
  ], []);

  const toggleExpandItem = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleMainItemClick = (tabId) => {
    // Solo cambiar el tab si NO tiene subitems
    // Si tiene subitems, solo expandir/contraer sin cambiar tab
    const item = navigationStructure.find(i => i.id === tabId);
    
    if (item && item.subitems.length === 0) {
      // Item SIN subitems: cambiar el tab
      onMainTabChange(tabId);
      onSubTabChange(null);
      console.log(`[SettingsSidebarNav] Main item clicked (sin subitems): ${tabId}`);
    } else {
      // Item CON subitems: solo log
      console.log(`[SettingsSidebarNav] Item con subitems clickeado (expandir/contraer): ${tabId}`);
    }
  };

  const handleSubItemClick = (subitemId, parentId) => {
    // Primero cambiar al tab principal (para que se abra el TabPanel padre)
    onMainTabChange(parentId);
    // Luego cambiar al subitem
    onSubTabChange(subitemId);
    
    console.log(`[SettingsSidebarNav] Sub item clicked: ${subitemId} (parent: ${parentId})`);
  };

  return (
    <div className="settings-sidebar">
      <div className="settings-nav-items">
        {navigationStructure.map((item) => (
          <div key={item.id}>
            {/* Item Principal */}
            <div
              className={`settings-nav-item ${activeMainTab === item.id && !activeSubTab ? 'active' : ''} ${expandedItems[item.id] && item.subitems.length > 0 ? 'expanded' : ''}`}
              onClick={() => {
                handleMainItemClick(item.id);
                if (item.subitems.length > 0) {
                  toggleExpandItem(item.id);
                }
              }}
            >
              <i className={`${item.icon} settings-nav-item-icon`}></i>
              <span className="settings-nav-item-text">{item.label}</span>
              {item.subitems.length > 0 && (
                <i className="pi pi-chevron-right settings-nav-item-chevron"></i>
              )}
            </div>
            
            {/* Subitems */}
            {item.subitems.length > 0 && expandedItems[item.id] && (
              <div className="settings-nav-subitems">
                {item.subitems.map((subitem) => (
                  <div
                    key={subitem.id}
                    className={`settings-nav-subitem ${activeSubTab === subitem.id ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubItemClick(subitem.id, item.id);
                    }}
                  >
                    <i className={`${subitem.icon} settings-nav-subitem-icon`}></i>
                    <span>{subitem.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsSidebarNav;

