import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Tree } from 'primereact/tree';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { themeManager, getThemeGroupColorPalette } from '../utils/themeManager';

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
    descriptionKey: 'sidebarDescriptions.general',
    icon: 'pi pi-cog',
    subitems: []
  },
  {
    id: 'seguridad',
    labelKey: 'sidebar.security',
    icon: 'pi pi-shield',
    subitems: [
      { id: 'clave-maestra', labelKey: 'sidebar.masterKey', descriptionKey: 'sidebarDescriptions.masterKey', icon: 'pi pi-key' },
      { id: 'auditoria', labelKey: 'sidebar.audit', descriptionKey: 'sidebarDescriptions.audit', icon: 'pi pi-video' }
    ]
  },
  {
    id: 'usuarios',
    labelKey: 'sidebar.users',
    descriptionKey: 'sidebarDescriptions.users',
    icon: 'pi pi-users',
    subitems: []
  },
  {
    id: 'apariencia',
    labelKey: 'sidebar.appearance',
    icon: 'pi pi-palette',
    subitems: [
      { id: 'interfaz', labelKey: 'sidebar.interface', descriptionKey: 'sidebarDescriptions.interface', icon: 'pi pi-eye' },
      { id: 'layouts', labelKey: 'sidebar.layouts', descriptionKey: 'sidebarDescriptions.layouts', icon: 'pi pi-th-large' },
      { id: 'pestanas', labelKey: 'sidebar.tabs', descriptionKey: 'sidebarDescriptions.tabs', icon: 'pi pi-palette' },
      { id: 'pagina-inicio', labelKey: 'sidebar.homePage', descriptionKey: 'sidebarDescriptions.homePage', icon: 'pi pi-home' },
      { id: 'terminal', labelKey: 'sidebar.terminal', descriptionKey: 'sidebarDescriptions.terminal', icon: 'pi pi-desktop' },
      { id: 'status-bar', labelKey: 'sidebar.statusBar', descriptionKey: 'sidebarDescriptions.statusBar', icon: 'pi pi-sliders-h' },
      { id: 'explorador-sesiones', labelKey: 'sidebar.sessionExplorer', descriptionKey: 'sidebarDescriptions.sessionExplorer', icon: 'pi pi-sitemap' },
      { id: 'explorador-archivos', labelKey: 'sidebar.fileExplorer', descriptionKey: 'sidebarDescriptions.fileExplorer', icon: 'pi pi-folder-open' },
      { id: 'presets', labelKey: 'sidebar.presets', descriptionKey: 'sidebarDescriptions.presets', icon: 'pi pi-star' },
      { id: 'splash-screen', labelKey: 'sidebar.splashScreen', descriptionKey: 'sidebarDescriptions.splashScreen', icon: 'pi pi-bolt' }
    ]
  },
  {
    id: 'apps',
    labelKey: 'sidebar.apps',
    descriptionKey: 'sidebarDescriptions.apps',
    icon: 'pi pi-th-large',
    subitems: []
  },
  {
    id: 'actualizaciones',
    labelKey: 'sidebar.updates',
    descriptionKey: 'sidebarDescriptions.updates',
    icon: 'pi pi-refresh',
    subitems: []
  },
  {
    id: 'sincronizacion',
    labelKey: 'sidebar.sync',
    descriptionKey: 'sidebarDescriptions.sync',
    icon: 'pi pi-cloud',
    subitems: []
  },
  {
    id: 'importar-exportar',
    labelKey: 'sidebar.importExport',
    descriptionKey: 'sidebarDescriptions.importExport',
    icon: 'pi pi-arrow-right-arrow-left',
    subitems: []
  },
  {
    id: 'integraciones',
    labelKey: 'sidebar.integrations',
    descriptionKey: 'sidebarDescriptions.integrations',
    icon: 'pi pi-link',
    subitems: [
      { id: 'mcp', labelKey: 'sidebar.mcp', descriptionKey: 'sidebarDescriptions.mcp', icon: 'pi pi-server' }
    ]
  },
  {
    id: 'informacion',
    labelKey: 'sidebar.info',
    descriptionKey: 'sidebarDescriptions.info',
    icon: 'pi pi-info-circle',
    subitems: []
  }
];

const SettingsSidebar = ({
  iconTheme,
  iconSize = 20,
  folderIconSize = 20,
  connectionIconSize = 20,
  explorerFont,
  explorerFontSize = 14,
  treeTheme = 'cursorCompact',
  explorerFontColor
}) => {
  const { t } = useTranslation('settings');

  const [expandedCategories, setExpandedCategories] = useState({
    seguridad: true,
    apariencia: true
  });
  const [hoveredItem, setHoveredItem] = useState(null);
  const [selectedItemKey, setSelectedItemKey] = useState(null);

  const [themePalette, setThemePalette] = useState(() => {
    return getThemeGroupColorPalette(themeManager.currentTheme?.colors);
  });

  useEffect(() => {
    const handleThemeChanged = () => {
      setThemePalette(getThemeGroupColorPalette(themeManager.currentTheme?.colors));
    };
    window.addEventListener('theme-changed', handleThemeChanged);
    return () => window.removeEventListener('theme-changed', handleThemeChanged);
  }, []);

  const getSectionColor = useCallback((sectionId, index) => {
    if (themePalette && themePalette[index]) {
      return themePalette[index];
    }
    // Fallbacks
    switch (sectionId) {
      case 'general': return '#a78bfa';
      case 'seguridad': return '#ef4444';
      case 'usuarios': return '#f59e0b';
      case 'apariencia': return '#3b82f6';
      case 'apps': return '#3b82f6';
      case 'actualizaciones': return '#8b5cf6';
      case 'sincronizacion': return '#64b5f6';
      case 'importar-exportar': return '#10b981';
      case 'informacion': return '#9ca3af';
      default: return '#5e81ac';
    }
  }, [themePalette]);

  const toggleCategory = useCallback((categoryId) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }, []);

  const allExpanded = useMemo(() => {
    return Object.values(expandedCategories).every(v => v === true);
  }, [expandedCategories]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('settings-sidebar:expand-state', {
      detail: { allExpanded }
    }));
  }, [allExpanded]);

  useEffect(() => {
    const handleToggleAll = () => {
      setExpandedCategories(prev => {
        const nextState = !allExpanded;
        const updated = {};
        Object.keys(prev).forEach(key => {
          updated[key] = nextState;
        });
        return updated;
      });
    };

    window.addEventListener('settings-sidebar:toggle-expand-all', handleToggleAll);
    return () => {
      window.removeEventListener('settings-sidebar:toggle-expand-all', handleToggleAll);
    };
  }, [allExpanded]);

  const openSettingsSection = useCallback((mainTab, subTab) => {
    window.dispatchEvent(new CustomEvent('open-settings-tab', {
      detail: { mainTab, subTab }
    }));
  }, []);

  const resolvedSections = useMemo(() => {
    return SETTINGS_SECTIONS.map((section, index) => ({
      ...section,
      color: getSectionColor(section.id, index),
      label: t(section.labelKey) || section.id,
      description: section.descriptionKey ? (t(section.descriptionKey) || '') : '',
      subitems: section.subitems.map(sub => ({
        ...sub,
        label: t(sub.labelKey) || sub.id,
        description: sub.descriptionKey ? (t(sub.descriptionKey) || '') : ''
      }))
    }));
  }, [t, getSectionColor]);

  const treeNodes = useMemo(() => {
    return resolvedSections.map(section => ({
      key: section.id,
      label: section.label,
      icon: null,
      categoryIcon: section.icon,
      color: section.color,
      description: section.description,
      selectable: section.subitems.length === 0,
      isLeaf: section.subitems.length === 0,
      children: section.subitems.map(sub => ({
        key: `${section.id}__${sub.id}`,
        label: sub.label,
        icon: null,
        toolIcon: sub.icon,
        description: sub.description,
        color: section.color,
        selectable: true,
        isLeaf: true,
        parentId: section.id,
        subitemId: sub.id
      }))
    }));
  }, [resolvedSections]);

  const sectionFontSize = Math.round(explorerFontSize * 0.85);
  const subitemFontSize = Math.round(explorerFontSize * 0.94);
  const badgeFontSize = Math.round(explorerFontSize * 0.72);

  const nodeTemplate = useCallback((node) => {
    const isLeaf = node.isLeaf;
    const isTopLevel = !node.parentId;
    const hoverKey = node.parentId ? node.key : `${node.key}__main`;
    const isHovered = hoveredItem === hoverKey;
    const itemColor = 'var(--ui-sidebar-text)';

    if (isTopLevel) {
      return (
        <div
          onClick={!isLeaf ? (e) => {
            e.stopPropagation();
            toggleCategory(node.key);
          } : undefined}
          onMouseEnter={() => setHoveredItem(hoverKey)}
          onMouseLeave={() => setHoveredItem(null)}
          className="flex align-items-center"
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            userSelect: 'none',
            width: '100%',
            fontFamily: explorerFont || 'inherit',
            transition: 'all 0.12s ease',
            padding: '0 2px'
          }}
          title={node.description || node.label}
        >
          <span
            style={{
              width: `${folderIconSize}px`,
              minWidth: `${folderIconSize}px`,
              height: `${folderIconSize}px`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <i
              className={node.categoryIcon}
              style={{
                fontSize: `${folderIconSize}px`,
                color: 'var(--ui-button-primary)',
                opacity: isHovered || !isLeaf ? 1 : 0.95,
                transition: 'all 0.12s ease'
              }}
            />
          </span>

          <span className="settings-section-label">
            {node.label}
          </span>

          {!isLeaf && (
            <span
              style={{
                marginLeft: 'auto',
                background: 'color-mix(in srgb, var(--ui-sidebar-selected) 18%, transparent)',
                color: 'var(--ui-sidebar-selected)',
                borderRadius: '10px',
                padding: '0 6px',
                fontSize: `${badgeFontSize}px`,
                fontWeight: '700',
                border: '1px solid color-mix(in srgb, var(--ui-sidebar-selected) 35%, transparent)',
                flexShrink: 0
              }}
            >
              {node.children.length}
            </span>
          )}

          {isLeaf && isHovered && (
            <i
              className="pi pi-arrow-right animate-fade-in"
              style={{
                fontSize: '0.65rem',
                color: 'var(--ui-sidebar-selected)',
                flexShrink: 0,
                marginLeft: 'auto',
                marginRight: '2px'
              }}
            />
          )}
        </div>
      );
    }

    return (
      <div
        onMouseEnter={() => setHoveredItem(hoverKey)}
        onMouseLeave={() => setHoveredItem(null)}
        className="flex align-items-center"
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          userSelect: 'none',
          width: '100%',
          fontFamily: explorerFont || 'inherit',
          transition: 'all 0.12s ease',
          padding: '0 2px'
        }}
        title={node.description || node.label}
      >
        <span
          style={{
            width: `${connectionIconSize}px`,
            minWidth: `${connectionIconSize}px`,
            height: `${connectionIconSize}px`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <i
            className={node.toolIcon}
            style={{
              fontSize: `${connectionIconSize}px`,
              color: isHovered ? 'var(--ui-sidebar-selected)' : itemColor,
              opacity: isHovered ? 1 : 0.65,
              transition: 'all 0.12s ease'
            }}
          />
        </span>

        <span
          className="settings-subitem-label"
          style={{
            color: isHovered ? 'var(--ui-sidebar-selected)' : itemColor,
            opacity: isHovered ? 1 : 0.82,
            transition: 'all 0.12s ease'
          }}
        >
          {node.label}
        </span>

        {isHovered && (
          <i
            className="pi pi-arrow-right animate-fade-in"
            style={{
              fontSize: '0.65rem',
              color: 'var(--ui-sidebar-selected)',
              flexShrink: 0,
              marginLeft: 'auto',
              marginRight: '2px'
            }}
          />
        )}
      </div>
    );
  }, [badgeFontSize, connectionIconSize, explorerFont, folderIconSize, hoveredItem, toggleCategory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`
        .settings-sidebar-scroll-container {
          padding: 0.35rem 0.25rem !important;
        }
        /* Altura y padding consistente para TODOS los items raíz (secciones principales) */
        .settings-tree > .p-tree-container > .p-treenode > .p-treenode-content {
          min-height: 28px !important;
          height: auto !important;
          line-height: normal !important;
          padding-top: 3px !important;
          padding-bottom: 3px !important;
          padding-left: 2px !important;
          padding-right: 6px !important;
          margin-top: 2px !important;
          margin-bottom: 1px !important;
          border-radius: 4px !important;
          transition: background-color 0.15s ease, color 0.15s ease !important;
        }
        /* Altura y padding consistente para los subitems */
        .settings-tree .p-treenode-children .p-treenode-content {
          min-height: 26px !important;
          height: auto !important;
          line-height: normal !important;
          padding-top: 2px !important;
          padding-bottom: 2px !important;
          padding-left: 2px !important;
          padding-right: 6px !important;
          margin-top: 1px !important;
          margin-bottom: 1px !important;
          border-radius: 4px !important;
          transition: background-color 0.15s ease, color 0.15s ease !important;
        }
        /* Contenedor de subitems con indentación limpia (36px) y separación respecto a otras secciones */
        html body .sidebar-tree.settings-tree .p-treenode-children,
        html body .sidebar-tree[class*="tree-theme-"].settings-tree .p-treenode-children,
        html body .settings-tree .p-treenode-children {
          padding-left: 36px !important;
          padding-top: 2px !important;
          padding-bottom: 6px !important;
        }
        /* Ocultar el toggler invisible en subitems para evitar cualquier desplazamiento horizontal */
        html body .sidebar-tree.settings-tree .p-treenode-children .p-tree-toggler,
        html body .sidebar-tree[class*="tree-theme-"].settings-tree .p-treenode-children .p-tree-toggler,
        html body .settings-tree .p-treenode-children .p-tree-toggler {
          display: none !important;
        }
        /* Toggler de categorías raíz: ancho fijo y perfectamente alineado */
        .settings-tree > .p-tree-container > .p-treenode > .p-treenode-content > .p-tree-toggler {
          width: 16px !important;
          min-width: 16px !important;
          height: 16px !important;
          margin-right: 2px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }
        .settings-tree .p-treenode-label {
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          overflow: hidden !important;
        }
        .settings-tree > .p-tree-container > .p-treenode > .p-treenode-content::before {
          display: none !important;
        }
        /* Tamano y estilo uniforme para secciones principales */
        html body .sidebar-tree.settings-tree .settings-section-label {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          line-height: 1.25 !important;
          color: var(--ui-button-primary) !important;
          font-size: var(--settings-section-font-size) !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }
        /* Tamano y estilo uniforme para subitems */
        html body .sidebar-tree.settings-tree .settings-subitem-label {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          line-height: 1.25 !important;
          font-size: var(--settings-subitem-font-size) !important;
          font-weight: 400 !important;
        }
      `}</style>
      <div className="settings-sidebar-scroll-container" style={{ flex: 1, overflowY: 'auto', padding: '0.25rem 0' }}>
        <Tree
          key={`settings-tree-${iconTheme}-${explorerFont}-${explorerFontSize}-${treeTheme}-${folderIconSize}-${connectionIconSize}`}
          value={treeNodes}
          selectionMode="single"
          selectionKeys={selectedItemKey}
          onSelectionChange={(e) => setSelectedItemKey(e.value)}
          onNodeClick={(e) => {
            const node = e.node;
            if (node.selectable) {
              setSelectedItemKey(node.key);
              if (node.parentId) {
                openSettingsSection(node.parentId, node.subitemId);
              } else {
                openSettingsSection(node.key, null);
              }
            }
          }}
          expandedKeys={expandedCategories}
          onToggle={(e) => setExpandedCategories(e.value)}
          className={`sidebar-tree tree-theme-${treeTheme} settings-tree`}
          data-icon-theme={iconTheme}
          data-tree-theme={treeTheme}
          style={{
            height: '100%',
            overflow: 'auto',
            fontSize: `${explorerFontSize}px`,
            fontFamily: explorerFont || 'inherit',
            '--settings-section-font-size': `${sectionFontSize}px`,
            '--settings-subitem-font-size': `${subitemFontSize}px`,
            '--icon-size': `${iconSize}px`,
            '--sidebar-folder-icon-size': `${folderIconSize}px`,
            '--sidebar-connection-icon-size': `${connectionIconSize}px`,
            '--sidebar-icon-size': `${Math.max(folderIconSize, connectionIconSize)}px`,
            '--sidebar-row-min-h': `${Math.max(folderIconSize, connectionIconSize) + 2}px`,
            '--sidebar-row-pad-y': '0px',
            '--tree-node-padding': '0',
            ...(explorerFontColor ? {
              '--ui-sidebar-text': explorerFontColor,
              '--tree-text-color': explorerFontColor
            } : {})
          }}
          nodeTemplate={nodeTemplate}
        />
      </div>
    </div>
  );
};

export default SettingsSidebar;
