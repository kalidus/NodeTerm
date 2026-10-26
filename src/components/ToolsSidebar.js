import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Tree } from 'primereact/tree';
import { iconThemes } from '../themes/icon-themes';
import { themeManager, getThemeGroupColorPalette } from '../utils/themeManager';
import { getHomeTabActive } from '../utils/homeTabActiveBus';
import { TOOL_CATEGORIES } from './network-tools/toolRegistry';

// Helper para obtener el color por defecto de las carpetas según el tema
const getThemeDefaultColor = (themeName) => {
  const theme = iconThemes[themeName?.toLowerCase() || 'nord'];
  if (!theme || !theme.icons || !theme.icons.folder) return '#5e81ac';

  const folderIcon = theme.icons.folder;

  if (folderIcon.props && folderIcon.props.fill && folderIcon.props.fill !== 'none') {
    return folderIcon.props.fill;
  }
  if (folderIcon.props && folderIcon.props.stroke) {
    return folderIcon.props.stroke;
  }
  if (folderIcon.props && folderIcon.props.children) {
    const children = Array.isArray(folderIcon.props.children)
      ? folderIcon.props.children
      : [folderIcon.props.children];

    for (const child of children) {
      if (child.props && child.props.fill && child.props.fill !== 'none') {
        return child.props.fill;
      }
      if (child.props && child.props.stroke) {
        return child.props.stroke;
      }
    }
  }
  return '#5e81ac';
};

const ToolsSidebar = ({
  onOpenTool,
  iconTheme,
  iconSize = 20,
  folderIconSize = 20,
  connectionIconSize = 20,
  explorerFont,
  explorerFontSize = 14,
  treeTheme = 'cursorCompact',
  explorerFontColor
}) => {
  const [expandedKeys, setExpandedKeys] = useState(
    TOOL_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  );
  const [hoveredTool, setHoveredTool] = useState(null);
  const [selectedToolKey, setSelectedToolKey] = useState(null);
  const toolClickTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toolClickTimerRef.current) {
        clearTimeout(toolClickTimerRef.current);
        toolClickTimerRef.current = null;
      }
    };
  }, []);

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

  const getCategoryColor = useCallback((categoryId, index) => {
    if (themePalette && themePalette[index]) {
      return themePalette[index];
    }
    // Fallbacks
    switch (categoryId) {
      case 'connectivity': return '#22c55e';
      case 'domain': return '#3b82f6';
      case 'web': return '#f59e0b';
      case 'vulnerabilities': return '#ef4444';
      case 'local': return '#8b5cf6';
      default: return '#5e81ac';
    }
  }, [themePalette]);

  // Mapear TOOL_CATEGORIES al formato compatible con Tree de PrimeReact
  const treeNodes = useMemo(() => {
    return TOOL_CATEGORIES.map((category, index) => {
      const color = getCategoryColor(category.id, index);
      return {
        key: category.id,
        label: category.label,
        icon: null,
        categoryIcon: category.icon,
        color: color,
        droppable: false,
        selectable: false,
        children: category.tools.map(tool => ({
          key: tool.id,
          label: tool.label,
          icon: null,
          toolIcon: tool.icon,
          description: tool.description,
          color: color,
          droppable: false,
          selectable: true,
          isLeaf: true
        }))
      };
    });
  }, [getCategoryColor]);

  const notifyExpandState = useCallback((state) => {
    const allExpanded = Object.values(state).every(Boolean);
    window.dispatchEvent(new CustomEvent('tools-sidebar:expand-state', {
      detail: { allExpanded }
    }));
  }, []);

  useEffect(() => {
    notifyExpandState(expandedKeys);
  }, [expandedKeys, notifyExpandState]);

  useEffect(() => {
    const handleToggleExpandAll = () => {
      setExpandedKeys(prev => {
        const allExpanded = Object.values(prev).every(Boolean);
        const next = TOOL_CATEGORIES.reduce((acc, cat) => ({
          ...acc,
          [cat.id]: !allExpanded
        }), {});
        return next;
      });
    };
    window.addEventListener('tools-sidebar:toggle-expand-all', handleToggleExpandAll);
    return () => window.removeEventListener('tools-sidebar:toggle-expand-all', handleToggleExpandAll);
  }, []);

  const sectionFontSize = Math.round(explorerFontSize * 0.85);
  const toolLabelFontSize = Math.round(explorerFontSize * 0.95);
  const toolDescFontSize = Math.round(explorerFontSize * 0.8);
  const badgeFontSize = Math.round(explorerFontSize * 0.72);

  const nodeTemplate = (node) => {
    const isFolder = !node.isLeaf;

    if (isFolder) {
      return (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setExpandedKeys(prev => ({
              ...prev,
              [node.key]: !prev[node.key]
            }));
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
            fontFamily: explorerFont || 'inherit',
          }}
        >
          <span className={node.categoryIcon} style={{
            color: 'var(--ui-button-primary)',
            fontSize: `${folderIconSize}px`,
            marginRight: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 16
          }} />

          <span className="tools-section-label">{node.label}</span>

          <span style={{
            marginLeft: 'auto',
            background: 'color-mix(in srgb, var(--ui-sidebar-selected) 18%, transparent)',
            color: 'var(--ui-sidebar-selected)',
            borderRadius: '10px',
            padding: '0 6px',
            fontSize: `${badgeFontSize}px`,
            fontWeight: '700',
            border: '1px solid color-mix(in srgb, var(--ui-sidebar-selected) 35%, transparent)',
            flexShrink: 0
          }}>
            {node.children.length}
          </span>
        </div>
      );
    }

    const isHovered = hoveredTool === node.key;
    return (
      <div 
        onMouseEnter={() => setHoveredTool(node.key)}
        onMouseLeave={() => setHoveredTool(null)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedToolKey(node.key);
          if (toolClickTimerRef.current) {
            clearTimeout(toolClickTimerRef.current);
          }
          toolClickTimerRef.current = setTimeout(() => {
            toolClickTimerRef.current = null;
            if (getHomeTabActive()) {
              window.dispatchEvent(new CustomEvent('open-home-tool-panel', {
                detail: {
                  toolId: node.key,
                  toolLabel: node.label,
                  toolIcon: node.toolIcon
                }
              }));
              return;
            }
            if (onOpenTool) {
              onOpenTool(node.key, node.label, 'reuse');
            }
          }, 250);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (toolClickTimerRef.current) {
            clearTimeout(toolClickTimerRef.current);
            toolClickTimerRef.current = null;
          }
          setSelectedToolKey(node.key);
          if (onOpenTool) {
            onOpenTool(node.key, node.label, 'new');
          }
        }}
        className="flex align-items-center"
        style={{
          padding: '0.1rem 0.25rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          fontFamily: explorerFont || 'inherit',
          transition: 'all 0.12s ease',
        }}
        title={node.description}
      >
        <i 
          className={node.toolIcon} 
          style={{ 
            fontSize: `${connectionIconSize}px`, 
            color: isHovered ? 'var(--ui-sidebar-selected)' : 'var(--ui-sidebar-text)',
            opacity: isHovered ? 1 : 0.6,
            transition: 'all 0.12s ease',
            flexShrink: 0 
          }}
        />

        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            className="tools-item-label"
            style={{
              color: 'var(--ui-sidebar-text)',
              opacity: isHovered ? 1 : 0.78,
              transition: 'opacity 0.12s ease'
            }}
          >
            {node.label}
          </div>
          <div
            className="tools-item-desc"
            style={{
              color: 'var(--ui-sidebar-text)',
              opacity: isHovered ? 0.85 : 0.55,
              transition: 'opacity 0.12s ease'
            }}
          >
            {node.description}
          </div>
        </div>

        {isHovered && (
          <i className="pi pi-arrow-right animate-fade-in" style={{ fontSize: '0.65rem', color: 'var(--ui-sidebar-selected)', flexShrink: 0, marginRight: '4px' }} />
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`
        .tools-tree .p-treenode-leaf > .p-treenode-content {
          min-height: 38px !important;
          height: auto !important;
          line-height: normal !important;
          padding-top: 4px !important;
          padding-bottom: 4px !important;
        }
        .tools-tree .p-treenode:not(.p-treenode-leaf) > .p-treenode-content {
          min-height: 26px !important;
          height: auto !important;
          line-height: normal !important;
          padding-top: 4px !important;
          padding-bottom: 4px !important;
        }
        .tools-tree .p-treenode-label {
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          overflow: hidden !important;
        }
        .tools-tree > .p-tree-container > .p-treenode > .p-treenode-content::before {
          display: none !important;
        }
        html body .sidebar-tree.tools-tree .tools-section-label {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          line-height: 1.25 !important;
          color: var(--ui-button-primary) !important;
          font-size: var(--tools-section-font-size) !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }
        html body .sidebar-tree.tools-tree .tools-item-label {
          font-size: var(--tools-item-font-size) !important;
          font-weight: 400 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        html body .sidebar-tree.tools-tree .tools-item-desc {
          font-size: var(--tools-desc-font-size) !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
      `}</style>
      <div className="tools-sidebar-scroll-container" style={{ flex: 1, overflowY: 'auto', padding: '0.25rem 0' }}>
        <Tree
          key={`tools-tree-${iconTheme}-${explorerFont}-${explorerFontSize}-${treeTheme}-${folderIconSize}-${iconSize}`}
          value={treeNodes}
          selectionMode="single"
          selectionKeys={selectedToolKey}
          onSelectionChange={e => setSelectedToolKey(e.value)}
          onNodeClick={(e) => {
            const node = e.node;
            if (node.isLeaf) {
              setSelectedToolKey(node.key);
            }
          }}
          expandedKeys={expandedKeys}
          onToggle={e => setExpandedKeys(e.value)}
          className={`sidebar-tree tree-theme-${treeTheme} tools-tree`}
          data-icon-theme={iconTheme}
          data-tree-theme={treeTheme}
          style={{
            height: '100%',
            overflow: 'auto',
            fontSize: `${explorerFontSize}px`,
            fontFamily: explorerFont || 'inherit',
            '--tools-section-font-size': `${sectionFontSize}px`,
            '--tools-item-font-size': `${toolLabelFontSize}px`,
            '--tools-desc-font-size': `${toolDescFontSize}px`,
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

export default ToolsSidebar;
