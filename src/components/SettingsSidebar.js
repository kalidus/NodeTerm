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

  const nodeTemplate = useCallback((node) => {
    const isLeaf = node.isLeaf;
    const isTopLevelLeaf = isLeaf && !node.parentId;

    if (!isLeaf) {
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            toggleCategory(node.key);
          }}
          className="flex align-items-center"
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none',
            width: '100%',
            fontWeight: '600',
            fontSize: `${Math.round(explorerFontSize * 0.87)}px`,
            fontFamily: explorerFont || 'inherit'
          }}
        >
          <span
            className={node.categoryIcon}
            style={{
              color: 'color-mix(in srgb, var(--ui-sidebar-selected) 50%, black)',
              fontSize: `${folderIconSize}px`,
              marginRight: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 16
            }}
          />
          <span
            className="node-label"
            style={{
              lineHeight: '20px',
              color: 'color-mix(in srgb, var(--ui-sidebar-selected) 50%, black)',
              fontSize: `${Math.round(explorerFontSize * 0.85)}px`,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {node.label}
          </span>
          <span
            style={{
              marginLeft: 'auto',
              background: 'color-mix(in srgb, var(--ui-sidebar-selected) 15%, transparent)',
              color: 'color-mix(in srgb, var(--ui-sidebar-selected) 50%, black)',
              borderRadius: '10px',
              padding: '0 6px',
              fontSize: `${Math.round(explorerFontSize * 0.72)}px`,
              fontWeight: '700',
              border: '1px solid color-mix(in srgb, var(--ui-sidebar-selected) 30%, transparent)'
            }}
          >
            {node.children.length}
          </span>
        </div>
      );
    }

    const hoverKey = node.parentId ? node.key : `${node.key}__main`;
    const isHovered = hoveredItem === hoverKey;
    const itemColor = isTopLevelLeaf ? 'color-mix(in srgb, var(--ui-sidebar-selected) 50%, black)' : 'var(--ui-sidebar-text)';
    const itemOpacity = isTopLevelLeaf ? 1 : isHovered ? 1 : 0.9;

    return (
      <div
        onMouseEnter={() => setHoveredItem(hoverKey)}
        onMouseLeave={() => setHoveredItem(null)}
        className="flex align-items-center"
        style={{
          padding: '0.1rem 0.25rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          fontFamily: explorerFont || 'inherit',
          transition: 'all 0.12s ease'
        }}
        title={node.description || node.label}
      >
        <i
          className={isTopLevelLeaf ? node.categoryIcon : node.toolIcon}
          style={{
            fontSize: `${connectionIconSize}px`,
            color: isHovered ? 'var(--ui-sidebar-selected)' : itemColor,
            opacity: isTopLevelLeaf ? (isHovered ? 1 : 0.95) : (isHovered ? 1 : 0.7),
            transition: 'all 0.12s ease',
            flexShrink: 0
          }}
        />

        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: `${explorerFontSize}px`,
              fontWeight: '500',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: itemColor,
              opacity: itemOpacity,
              transition: 'opacity 0.12s ease'
            }}
          >
            {node.label}
          </div>
        </div>
        {isHovered && (
          <i
            className="pi pi-arrow-right animate-fade-in"
            style={{
              fontSize: '0.65rem',
              color: 'var(--ui-sidebar-selected)',
              flexShrink: 0,
              marginRight: '4px'
            }}
          />
        )}
      </div>
    );
  }, [connectionIconSize, explorerFont, explorerFontSize, folderIconSize, hoveredItem]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`
        .settings-tree .p-treenode-leaf > .p-treenode-content {
          min-height: 38px !important;
          height: auto !important;
          line-height: normal !important;
          padding-top: 4px !important;
          padding-bottom: 4px !important;
        }
        .settings-tree .p-treenode:not(.p-treenode-leaf) > .p-treenode-content {
          min-height: 26px !important;
          height: auto !important;
          line-height: normal !important;
          padding-top: 4px !important;
          padding-bottom: 4px !important;
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
