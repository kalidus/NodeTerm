import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tree } from 'primereact/tree';
import { iconThemes } from '../themes/icon-themes';
import { themeManager, getThemeGroupColorPalette } from '../utils/themeManager';

const TOOL_CATEGORIES = [
  {
    id: 'connectivity',
    label: 'Conectividad',
    icon: 'pi pi-wifi',
    tools: [
      { id: 'ping', label: 'Ping', icon: 'pi pi-clock', description: 'Test de conectividad con estadísticas' },
      { id: 'traceroute', label: 'Traceroute', icon: 'pi pi-sitemap', description: 'Trazado de rutas de red' }
    ]
  },
  {
    id: 'scanning',
    label: 'Escaneo',
    icon: 'pi pi-search',
    tools: [
      { id: 'port-scan', label: 'Port Scanner', icon: 'pi pi-th-large', description: 'Escaneo de puertos TCP' },
      { id: 'network-scan', label: 'Network Scan', icon: 'pi pi-globe', description: 'Descubrimiento de hosts en red' }
    ]
  },
  {
    id: 'dns',
    label: 'DNS',
    icon: 'pi pi-database',
    tools: [
      { id: 'dns-lookup', label: 'DNS Lookup', icon: 'pi pi-search-plus', description: 'Resolución de registros DNS' },
      { id: 'reverse-dns', label: 'Reverse DNS', icon: 'pi pi-replay', description: 'DNS inverso (IP a hostname)' }
    ]
  },
  {
    id: 'security',
    label: 'Seguridad',
    icon: 'pi pi-shield',
    tools: [
      { id: 'ssl-check', label: 'SSL Checker', icon: 'pi pi-lock', description: 'Verificación de certificados SSL/TLS' },
      { id: 'http-headers', label: 'HTTP Headers', icon: 'pi pi-file', description: 'Análisis de cabeceras HTTP' },
      { id: 'host-vuln-scan', label: 'Host Vuln Scanner', icon: 'pi pi-exclamation-triangle', description: 'Detecta vulnerabilidades y CVEs' },
      { id: 'web-security-scan', label: 'Web Security', icon: 'pi pi-globe', description: 'Analiza seguridad web' },
      { id: 'cvss-calculator', label: 'CVSS Calculator', icon: 'pi pi-chart-bar', description: 'Calcula CVSS 3.1 y 4.0' }
    ]
  },
  {
    id: 'utilities',
    label: 'Utilidades',
    icon: 'pi pi-cog',
    tools: [
      { id: 'whois', label: 'WHOIS', icon: 'pi pi-id-card', description: 'Información de dominio' },
      { id: 'subnet-calc', label: 'Subnet Calculator', icon: 'pi pi-calculator', description: 'Calculadora de subredes' },
      { id: 'wake-on-lan', label: 'Wake on LAN', icon: 'pi pi-power-off', description: 'Despertar equipos en red' }
    ]
  }
];

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
      case 'scanning': return '#f59e0b';
      case 'dns': return '#3b82f6';
      case 'security': return '#ef4444';
      case 'utilities': return '#8b5cf6';
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

  const nodeTemplate = (node, options) => {
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
            fontSize: '0.8rem',
            fontFamily: explorerFont || 'inherit',
          }}
        >
          {/* Icono de la Sección (usado en lugar de la carpeta genérica) */}
          <span className={node.categoryIcon} style={{ 
            color: 'color-mix(in srgb, var(--ui-sidebar-selected) 50%, black)', 
            fontSize: `${folderIconSize}px`,
            marginRight: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 16
          }} />

          {/* Nombre de la Sección */}
          <span className="node-label" style={{
            lineHeight: '20px',
            color: 'color-mix(in srgb, var(--ui-sidebar-selected) 50%, black)',
            fontSize: `${Math.round(explorerFontSize * 0.85)}px`,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>{node.label}</span>

          {/* Contador de Herramientas */}
          <span style={{
            marginLeft: 'auto',
            background: 'color-mix(in srgb, var(--ui-sidebar-selected) 15%, transparent)',
            color: 'color-mix(in srgb, var(--ui-sidebar-selected) 50%, black)',
            borderRadius: '10px',
            padding: '0 6px',
            fontSize: `${Math.round(explorerFontSize * 0.72)}px`,
            fontWeight: '700',
            border: '1px solid color-mix(in srgb, var(--ui-sidebar-selected) 30%, transparent)'
          }}>
            {node.children.length}
          </span>
        </div>
      );
    } else {
      const isHovered = hoveredTool === node.key;
      return (
        <div 
          onMouseEnter={() => setHoveredTool(node.key)}
          onMouseLeave={() => setHoveredTool(null)}
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
          {/* Icono de la Herramienta */}
          <i 
            className={node.toolIcon} 
            style={{ 
              fontSize: `${connectionIconSize}px`, 
              color: isHovered ? 'var(--ui-sidebar-selected)' : 'var(--ui-sidebar-text)',
              opacity: isHovered ? 1 : 0.7,
              transition: 'all 0.12s ease',
              flexShrink: 0 
            }}
          />

          {/* Texto y Descripción */}
          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ 
              fontSize: `${explorerFontSize}px`, 
              fontWeight: '500', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              color: 'var(--ui-sidebar-text)',
              opacity: isHovered ? 1 : 0.9,
              transition: 'opacity 0.12s ease'
            }}>
              {node.label}
            </div>
            <div style={{ 
              fontSize: `${Math.round(explorerFontSize * 0.8)}px`, 
              color: 'var(--ui-sidebar-text)', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap', 
              opacity: isHovered ? 0.85 : 0.55,
              transition: 'opacity 0.12s ease'
            }}>
              {node.description}
            </div>
          </div>

          {/* Flecha al pasar el ratón */}
          {isHovered && (
            <i className="pi pi-arrow-right animate-fade-in" style={{ fontSize: '0.65rem', color: 'var(--ui-sidebar-selected)', flexShrink: 0, marginRight: '4px' }} />
          )}
        </div>
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sobrescribimos estilos del árbol para esta sección para permitir la doble línea sin colisiones y ocultar conector en raíz */}
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
        /* Ocultar el guión conector horizontal (-) en los nodos raíz (Categorías) */
        .tools-tree > .p-tree-container > .p-treenode > .p-treenode-content::before {
          display: none !important;
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
              if (onOpenTool) {
                onOpenTool(node.key, node.label);
              }
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
