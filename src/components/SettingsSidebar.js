import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from '../i18n/hooks/useTranslation';

/**
 * Settings navigation panel for the main Sidebar.
 * Displays configuration sections in a tree-like structure (similar to ToolsSidebar).
 * Clicking a section dispatches an event to open/focus a single settings tab
 * and navigate to the corresponding section within it.
 */

const SETTINGS_SECTIONS = [
  {
    id: 'general',
    labelKey: 'sidebar.general',
    icon: 'pi pi-cog',
    color: '#a78bfa',
    subitems: []
  },
  {
    id: 'seguridad',
    labelKey: 'sidebar.security',
    icon: 'pi pi-shield',
    color: '#ef4444',
    subitems: [
      { id: 'clave-maestra', labelKey: 'sidebar.masterKey', icon: 'pi pi-key' },
      { id: 'auditoria', labelKey: 'sidebar.audit', icon: 'pi pi-video' }
    ]
  },
  {
    id: 'usuarios',
    labelKey: 'sidebar.users',
    icon: 'pi pi-users',
    color: '#f59e0b',
    subitems: []
  },
  {
    id: 'apariencia',
    labelKey: 'sidebar.appearance',
    icon: 'pi pi-palette',
    color: '#3b82f6',
    subitems: [
      { id: 'interfaz', labelKey: 'sidebar.interface', icon: 'pi pi-eye' },
      { id: 'layouts', labelKey: 'sidebar.layouts', icon: 'pi pi-th-large' },
      { id: 'pestanas', labelKey: 'sidebar.tabs', icon: 'pi pi-palette' },
      { id: 'pagina-inicio', labelKey: 'sidebar.homePage', icon: 'pi pi-home' },
      { id: 'terminal', labelKey: 'sidebar.terminal', icon: 'pi pi-desktop' },
      { id: 'status-bar', labelKey: 'sidebar.statusBar', icon: 'pi pi-sliders-h' },
      { id: 'explorador-sesiones', labelKey: 'sidebar.sessionExplorer', icon: 'pi pi-sitemap' },
      { id: 'explorador-archivos', labelKey: 'sidebar.fileExplorer', icon: 'pi pi-folder-open' },
      { id: 'presets', labelKey: 'sidebar.presets', icon: 'pi pi-star' }
    ]
  },
  {
    id: 'apps',
    labelKey: 'sidebar.apps',
    icon: 'pi pi-th-large',
    color: '#3b82f6',
    subitems: []
  },
  {
    id: 'actualizaciones',
    labelKey: 'sidebar.updates',
    icon: 'pi pi-refresh',
    color: '#8b5cf6',
    subitems: []
  },
  {
    id: 'sincronizacion',
    labelKey: 'sidebar.sync',
    icon: 'pi pi-cloud',
    color: '#64b5f6',
    subitems: []
  },
  {
    id: 'informacion',
    labelKey: 'sidebar.info',
    icon: 'pi pi-info-circle',
    color: '#9ca3af',
    subitems: []
  }
];

const SettingsSidebar = () => {
  const { t } = useTranslation('settings');

  const [expandedCategories, setExpandedCategories] = useState({
    seguridad: true,
    apariencia: true
  });
  const [hoveredItem, setHoveredItem] = useState(null);

  const toggleCategory = useCallback((categoryId) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }, []);

  const openSettingsSection = useCallback((mainTab, subTab) => {
    window.dispatchEvent(new CustomEvent('open-settings-tab', {
      detail: { mainTab, subTab }
    }));
  }, []);

  const handleSectionClick = useCallback((section) => {
    if (section.subitems.length > 0) {
      toggleCategory(section.id);
    } else {
      openSettingsSection(section.id, null);
    }
  }, [toggleCategory, openSettingsSection]);

  const handleSubitemClick = useCallback((subitemId, parentId) => {
    openSettingsSection(parentId, subitemId);
  }, [openSettingsSection]);

  const resolvedSections = useMemo(() => {
    return SETTINGS_SECTIONS.map(section => ({
      ...section,
      label: t(section.labelKey) || section.id,
      subitems: section.subitems.map(sub => ({
        ...sub,
        label: t(sub.labelKey) || sub.id
      }))
    }));
  }, [t]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.25rem 0' }}>
        {resolvedSections.map(section => (
          <div key={section.id}>
            {/* Category header */}
            <div
              onClick={() => handleSectionClick(section)}
              onMouseEnter={() => setHoveredItem(section.id)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                padding: '0.5rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                userSelect: 'none',
                color: section.color,
                fontWeight: '600',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: hoveredItem === section.id ? 1 : 0.9,
                background: hoveredItem === section.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                transition: 'all 0.12s ease'
              }}
            >
              {section.subitems.length > 0 ? (
                <i
                  className={expandedCategories[section.id] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'}
                  style={{ fontSize: '0.65rem', transition: 'transform 0.15s ease' }}
                />
              ) : (
                <span style={{ width: '0.65rem' }} />
              )}
              <i className={section.icon} style={{ fontSize: '0.8rem' }} />
              <span>{section.label}</span>
              {section.subitems.length > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: `${section.color}25`,
                  color: section.color,
                  borderRadius: '10px',
                  padding: '0 5px',
                  fontSize: '0.65rem',
                  fontWeight: '700'
                }}>
                  {section.subitems.length}
                </span>
              )}
              {section.subitems.length === 0 && hoveredItem === section.id && (
                <i className="pi pi-arrow-right" style={{ marginLeft: 'auto', fontSize: '0.6rem', opacity: 0.6 }} />
              )}
            </div>

            {/* Subitems */}
            {expandedCategories[section.id] && section.subitems.map(sub => (
              <div
                key={sub.id}
                onClick={() => handleSubitemClick(sub.id, section.id)}
                onMouseEnter={() => setHoveredItem(sub.id)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  padding: '0.45rem 0.75rem 0.45rem 2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: hoveredItem === sub.id ? 'rgba(255,255,255,0.07)' : 'transparent',
                  borderLeft: `2px solid ${hoveredItem === sub.id ? section.color : 'transparent'}`,
                  transition: 'all 0.12s ease',
                  color: hoveredItem === sub.id ? 'var(--text-color)' : 'var(--text-color-secondary)'
                }}
              >
                <i className={sub.icon} style={{ fontSize: '0.8rem', color: hoveredItem === sub.id ? section.color : undefined, flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sub.label}
                  </div>
                </div>
                {hoveredItem === sub.id && (
                  <i className="pi pi-arrow-right" style={{ fontSize: '0.65rem', color: section.color, flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsSidebar;
