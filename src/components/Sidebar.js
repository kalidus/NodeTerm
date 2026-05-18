import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { Button } from 'primereact/button';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Tree } from 'primereact/tree';
import { Divider } from 'primereact/divider';
import SidebarUpdateIndicator from './SidebarUpdateIndicator';
import SidebarAppearanceMenu from './SidebarAppearanceMenu';
import { uiThemes, FUTURISTIC_UI_KEYS } from '../themes/ui-themes';
import { FolderDialog } from './Dialogs';
import { iconThemes } from '../themes/icon-themes';
import { FolderIconRenderer, FolderIconPresets } from './FolderIconSelector';
import { SSHIconRenderer, SSHIconPresets } from './SSHIconSelector';
import { sessionActionIconThemes, getDefaultSessionActionIconTheme, newDocumentToolbarIcon } from '../themes/session-action-icons';
import SidebarFilesystemExplorer from './SidebarFilesystemExplorer';
import AIClientBrandIcon from './AIClientBrandIcon';
import ConnectionDetailsPanel from './ConnectionDetailsPanel';
import SidebarIconRail from './SidebarIconRail';
import { TabChunkFallback } from './tabLoaders';

const LazyImportDialog = React.lazy(() => import('./ImportDialog'));
const LazyPasswordManagerSidebar = React.lazy(() => import('./PasswordManagerSidebar'));
const LazyDocumentsSidebar = React.lazy(() => import('./DocumentsSidebar'));
const LazyLocalFileExplorerSidebar = React.lazy(() => import('./LocalFileExplorerSidebar'));
const LazyToolsSidebar = React.lazy(() => import('./ToolsSidebar'));
import { unblockAllInputs, detectBlockedInputs, resolveFormBlocking, emergencyUnblockForms } from '../utils/formDebugger';
import ImportService from '../services/ImportService';
import localStorageSyncService from '../services/LocalStorageSyncService';
import { getFavorites, onUpdate as onFavoritesUpdate } from '../utils/connectionStore';
import favoriteGroupsStore from '../utils/favoriteGroupsStore';
import {
  FAVORITES_ROOT_KEY,
  applyFavoritesTreeLayoutFromDrop,
  buildFavoritesSidebarTree,
  countFavoriteShortcuts,
  filterFavoritesTree,
  getDefaultFavoritesExpandedKeys,
  getFavoriteGroupIdFromKey,
  isFavoriteGroupFolderKey,
  isFavoriteGroupFolderNode,
  isFavoriteShortcutNode,
  isFavoritesRootKey,
  resolveFavoriteShortcutNode
} from '../utils/favoritesSidebarTree';
import { createAppMenu, createContextMenu } from '../utils/appMenuUtils';
import { STORAGE_KEYS } from '../utils/constants';
import { treeThemes, treeThemeOptions, getTreeTheme } from '../themes/tree-themes';
import { useTranslation } from '../i18n/hooks/useTranslation';
import '../styles/components/tree-themes.css';

// Helper para loggear setNodes
function logSetNodes(source, nodes) {
  // Log de debug removido para limpiar la consola
  // Log de trace removido para limpiar la consola
  return nodes;
}

// Helper para desbloquear formularios de forma segura
function safeUnblockForms(showToast) {
  try {
    const blockedInputs = detectBlockedInputs();
    unblockAllInputs();

    if (blockedInputs.length > 0 && showToast) {
      showToast({
        severity: 'info',
        summary: 'Formularios desbloqueados',
        detail: `Se han desbloqueado ${blockedInputs.length} campos de formulario`,
        life: 2000
      });
    }
  } catch (error) {
    console.warn('Error al desbloquear formularios:', error);
  }
}

// Skeleton loader para simular árbol de directorios de forma premium
const SidebarSkeleton = () => {
  return (
    <div className="sidebar-skeleton">
      {[...Array(6)].map((_, idx) => {
        let indent = '0px';
        if (idx === 1 || idx === 4) indent = '16px';
        else if (idx === 2) indent = '32px';
        
        let width = '70%';
        if (idx === 1) width = '50%';
        else if (idx === 2) width = '60%';
        else if (idx === 4) width = '55%';
        else if (idx === 5) width = '40%';
        
        return (
          <div key={idx} className="sidebar-skeleton-item" style={{ paddingLeft: indent }}>
            <div className="sidebar-skeleton-icon" />
            <div className="sidebar-skeleton-text" style={{ width }} />
          </div>
        );
      })}
    </div>
  );
};

const Sidebar = React.memo(({
  isLoading = false,
  nodes,
  setNodes,
  sidebarCollapsed,
  setSidebarCollapsed,
  allExpanded,
  toggleExpandAll,
  expandedKeys,
  setExpandedKeys,
  setShowCreateGroupDialog,
  setShowSettingsDialog,
  showUnifiedConnectionDialog,
  setShowUnifiedConnectionDialog,

  iconTheme,
  iconSize = 20,
  folderIconSize = 20,
  connectionIconSize = 20,
  explorerFont,
  explorerFontSize = 14,
  explorerFontColor,
  uiTheme = 'Light',
  showToast, // callback opcional para mostrar toast global
  confirmDialog, // callback para mostrar diálogo de confirmación
  onOpenSSHConnection, // nuevo prop para doble click en SSH
  onOpenVncConnection, // nuevo prop para doble click en VNC
  onNodeContextMenu, // handler del menú contextual de nodos
  onTreeAreaContextMenu, // handler del menú contextual del área del árbol
  hideContextMenu, // función para cerrar el menú contextual
  sidebarCallbacksRef, // ref para registrar callbacks del menú contextual
  selectedNodeKey, // estado de selección del hook
  setSelectedNodeKey, // setter de selección del hook

  // Props para conexiones
  getAllFolders,
  createNewSSH,
  saveEditSSH,
  openEditSSHDialog,
  handleSaveRdpToSidebar,

  // Estados de formularios SSH
  sshName, setSSHName,
  sshHost, setSSHHost,
  sshUser, setSSHUser,
  sshPassword, setSSHPassword,
  sshPort, setSSHPort,
  sshRemoteFolder, setSSHRemoteFolder,
  sshTargetFolder, setSSHTargetFolder,
  sshAutoCopyPassword, setSSHAutoCopyPassword,

  // Estados de formularios Edit SSH
  editSSHName, setEditSSHName,
  editSSHHost, setEditSSHHost,
  editSSHUser, setEditSSHUser,
  editSSHPassword, setEditSSHPassword,
  editSSHRemoteFolder, setEditSSHRemoteFolder,
  editSSHPort, setEditSSHPort,
  editSSHAutoCopyPassword, setEditSSHAutoCopyPassword,

  // Estados para modo edición
  editSSHNode, setEditSSHNode,

  // Estados de formularios RDP
  rdpNodeData, setRdpNodeData,
  editingRdpNode, setEditingRdpNode,

  // Encriptación
  masterKey,
  secureStorage,

  isAIChatActive = false,
  onToggleLocalTerminalForAIChat,

  // Filtro de búsqueda desde TitleBar
  sidebarFilter = '',

  // Tema del árbol
  treeTheme = 'default',
  setTreeTheme,

  // Tema de iconos de acción
  sessionActionIconTheme = 'modern',
  setSessionActionIconTheme,

  // Callbacks para diálogos de importar/exportar
  onShowImportDialog,
  onShowExportDialog,
  onShowImportExportDialog,
  onShowImportWizard,
  isExternalReloadRef, // Nuevo prop para control de polling sync
  updateTreeHash,      // Nuevo prop para actualizar hash tras cambios locales
  hasActiveSshSession = false,
  onOpenFileExplorer,
  onOpenWallixRefresh  // callback para refrescar carpetas importadas de Wallix
}) => {
  // Hook de internacionalización
  const { t } = useTranslation('common');
  


  // Estado para diálogos
  const [showFolderDialog, setShowFolderDialog] = useState(false);

  // Estado para modo de visualización (conexiones, passwords, filesystem, localExplorer)
  const [viewMode, setViewMode] = useState('connections'); // 'connections' | 'passwords' | 'documents' | 'filesystem' | 'localExplorer'
  const [showFavoritesView, setShowFavoritesView] = useState(false);
  const [favoritesRevision, setFavoritesRevision] = useState(0);

  // Estado para el nodo seleccionado actualmente (para el panel de detalles)
  const [selectedNodeForDetails, setSelectedNodeForDetails] = useState(null);

  // Función para actualizar un nodo en el árbol
  const updateNodeInTree = useCallback((updatedNode) => {
    const findAndUpdateNode = (nodeList, targetKey) => {
      return nodeList.map(node => {
        if (node.key === targetKey) {
          return updatedNode;
        }
        if (node.children) {
          return {
            ...node,
            children: findAndUpdateNode(node.children, targetKey)
          };
        }
        return node;
      });
    };

    if (updatedNode && updatedNode.key) {
      const updatedNodes = findAndUpdateNode(nodes, updatedNode.key);
      setNodes(updatedNodes);

      // Actualizar también el nodo seleccionado
      setSelectedNodeForDetails(updatedNode);

      if (showToast) {
        showToast({
          severity: 'success',
          summary: 'Actualizado',
          detail: 'Cambios guardados correctamente',
          life: 2000
        });
      }
    }
  }, [nodes, setNodes, showToast]);
  const [filesystemStatus, setFilesystemStatus] = useState({
    active: false,
    allowedPaths: [],
    defaultPath: null,
    server: null,
    conversationId: null
  });
  const [initialFilesystemPath, setInitialFilesystemPath] = useState(null);
  const [localExplorerPath, setLocalExplorerPath] = useState(null);

  // Refs de rendimiento: evitar trabajo repetido durante transiciones/resize
  const sshSyncHandleRef = useRef(null); // idle callback id o timeout id
  const sidebarResizeRafRef = useRef(null);
  const sidebarResizeBucketRef = useRef(null); // 'wide' | 'narrow' | 'tiny'
  const hasEverExpandedRef = useRef(!sidebarCollapsed);
  const [disableFirstExpandTransition, setDisableFirstExpandTransition] = useState(false);
  const firstExpandTimeoutRef = useRef(null);
  const expandedContentReady = true;
  const expandedContentRef = useRef(null);
  const treeContainerRef = useRef(null);
  const dragAutoScrollRafRef = useRef(null);
  const dragAutoScrollSpeedRef = useRef(0);
  const dragAutoScrollActiveRef = useRef(false);

  // Forzar layout del contenido pre-montado lo antes posible para reducir lag en 1ª expansión
  useEffect(() => {
    if (!sidebarCollapsed) return;
    const warmup = () => {
      const el = expandedContentRef.current;
      if (el) {
        try {
          void el.offsetHeight;
          const tree = el.querySelector('.tree-container');
          if (tree) void tree.offsetHeight;
        } catch (_) {}
      }
    };
    // Doble rAF: layout en siguiente frame; más agresivo que idle para que esté listo antes del primer expand
    const rafId = requestAnimationFrame(() => requestAnimationFrame(warmup));
    return () => cancelAnimationFrame(rafId);
  }, [sidebarCollapsed]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      if (prev && !next && !hasEverExpandedRef.current) {
        hasEverExpandedRef.current = true;
        setDisableFirstExpandTransition(true);
        if (firstExpandTimeoutRef.current) clearTimeout(firstExpandTimeoutRef.current);
        firstExpandTimeoutRef.current = setTimeout(() => {
          setDisableFirstExpandTransition(false);
          firstExpandTimeoutRef.current = null;
        }, 50);
      }
      return next;
    });
  }, [setSidebarCollapsed]);

  useEffect(() => {
    return () => {
      if (firstExpandTimeoutRef.current) {
        clearTimeout(firstExpandTimeoutRef.current);
        firstExpandTimeoutRef.current = null;
      }
    };
  }, []);

  // 🔗 Sincronizar conexiones SSH a window para que AIChatPanel las acceda
  useEffect(() => {
    const extractSSHNodes = (treeNodes) => {
      let sshNodes = [];
      for (const node of treeNodes) {
        if (node.data && node.data.type === 'ssh') {
          // 🔗 PASAR TODO EL node.data COMPLETO (igual que usa la app para conectar)
          sshNodes.push({
            id: node.key || `ssh_${node.data.host}_${node.data.username}`,
            label: node.label,
            ...node.data  // ✅ SPREAD: Incluir TODOS los campos de node.data
          });
        }
        if (node.children && node.children.length > 0) {
          sshNodes = sshNodes.concat(extractSSHNodes(node.children));
        }
      }
      return sshNodes;
    };

    // Cancelar una sincronización previa si aún está pendiente
    if (sshSyncHandleRef.current) {
      try {
        if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(sshSyncHandleRef.current);
        } else {
          clearTimeout(sshSyncHandleRef.current);
        }
      } catch (_) {
        // noop
      }
      sshSyncHandleRef.current = null;
    }

    const runSync = () => {
      const sshConnections = extractSSHNodes(nodes);
      window.sshConnectionsFromSidebar = sshConnections;

      // Disparar evento para que AIChatPanel se resincronice
      window.dispatchEvent(new CustomEvent('sidebar-ssh-connections-updated', {
        detail: { count: sshConnections.length }
      }));
    };

    // Diferir a idle para no competir con layout/transiciones iniciales
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      sshSyncHandleRef.current = window.requestIdleCallback(() => {
        sshSyncHandleRef.current = null;
        runSync();
      }, { timeout: 1000 });
    } else {
      sshSyncHandleRef.current = setTimeout(() => {
        sshSyncHandleRef.current = null;
        runSync();
      }, 0);
    }

    return () => {
      if (sshSyncHandleRef.current) {
        try {
          if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
            window.cancelIdleCallback(sshSyncHandleRef.current);
          } else {
            clearTimeout(sshSyncHandleRef.current);
          }
        } catch (_) {
          // noop
        }
        sshSyncHandleRef.current = null;
      }
    };
  }, [nodes]);

  // Sincronizar selectedNodeForDetails cuando cambia el nodo en el árbol
  useEffect(() => {
    // Helper local para encontrar nodo por key
    const findNodeInTree = (nodeList, targetKey) => {
      if (targetKey === null || targetKey === undefined) return null;
      for (let node of nodeList) {
        if (node.key === targetKey) return node;
        if (node.children && node.children.length > 0) {
          const found = findNodeInTree(node.children, targetKey);
          if (found) return found;
        }
      }
      return null;
    };

    const currentKey = typeof selectedNodeKey === 'object' && selectedNodeKey !== null
      ? Object.keys(selectedNodeKey)[0]
      : selectedNodeKey;

    // Si hay una key seleccionada, buscar el nodo actualizado en el árbol
    if (currentKey) {
      const updatedNode = findNodeInTree(nodes, currentKey);
      if (updatedNode) {
        // Solo actualizar si hay cambios reales comparando con el nodo actual
        setSelectedNodeForDetails(prevNode => {
          if (!prevNode || prevNode.key !== currentKey) {
            // Si no hay nodo previo o la key cambió, actualizar directamente
            return updatedNode;
          }

          // Comparar si realmente hay cambios significativos
          const hasChanges =
            updatedNode.label !== prevNode.label ||
            JSON.stringify(updatedNode.data) !== JSON.stringify(prevNode.data);

          return hasChanges ? updatedNode : prevNode;
        });
      } else if (selectedNodeForDetails && selectedNodeForDetails.key === currentKey) {
        // Si el nodo ya no existe en el árbol, limpiar la selección
        setSelectedNodeForDetails(null);
      }
    }
  }, [nodes, selectedNodeKey]); // Solo depender de nodes y selectedNodeKey, no de selectedNodeForDetails

  // Escuchar evento para cambiar a vista de conexiones
  useEffect(() => {
    const handleSwitchToConnections = () => {
      setViewMode('connections');
    };

    window.addEventListener('switch-to-connections', handleSwitchToConnections);

    return () => {
      window.removeEventListener('switch-to-connections', handleSwitchToConnections);
    };
  }, []);

  useEffect(() => {
    const handleFilesystemStatus = (event) => {
      const detail = event?.detail || {};
      if (detail.type !== 'filesystem') return;
      setFilesystemStatus(detail);
      if (!detail.active) {
        setViewMode(prev => (prev === 'filesystem' ? 'connections' : prev));
      }
    };
    window.addEventListener('filesystem-mcp-status', handleFilesystemStatus);
    return () => {
      window.removeEventListener('filesystem-mcp-status', handleFilesystemStatus);
    };
  }, []);

  // Listener simple para mostrar explorador local en sidebar
  useEffect(() => {
    const handleShowLocalExplorer = (event) => {
      const { path } = event?.detail || {};
      if (!path) return;

      setLocalExplorerPath(path);
      setViewMode('localExplorer');
      setSidebarCollapsed(false);
    };

    window.addEventListener('show-local-file-explorer', handleShowLocalExplorer);
    return () => {
      window.removeEventListener('show-local-file-explorer', handleShowLocalExplorer);
    };
  }, []);

  const filesystemAvailable = !!filesystemStatus?.active;

  // Permitir modo filesystem si se solicita explícitamente desde FileExplorer
  // incluso sin AI Chat activo, pero solo si hay un path inicial establecido
  useEffect(() => {
    if (!isAIChatActive && viewMode === 'filesystem' && !initialFilesystemPath) {
      setViewMode('connections');
    }
  }, [isAIChatActive, viewMode, setViewMode, initialFilesystemPath]);

  // --- Utilidades para manipulación de colores en SVGs ---

  // Función para convertir hex a HSL
  const hexToHsl = (hex) => {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return [0, 0, 0];
    const r = parseInt(hex.substr(1, 2), 16) / 255;
    const g = parseInt(hex.substr(3, 2), 16) / 255;
    const b = parseInt(hex.substr(5, 2), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [h * 360, s * 100, l * 100];
  };

  // Función para convertir HSL a hex
  const hslToHex = (h, s, l) => {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (c) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Función para modificar colores de un elemento SVG de forma recursiva
  const modifySVGColors = (element, newColor, themeKey, index = 0) => {
    if (!element || !element.props) return element;

    const newProps = { ...element.props };

    // Añadir key única si no existe para evitar warnings de React
    if (!newProps.key) {
      newProps.key = `svg-child-${index}-${Date.now()}`;
    }

    // Lista de temas que deben preservar sus colores originales
    const preserveOriginalColorsThemes = [
      'monokai', 'onedark', 'gruvbox', 'tokyonight', 'palenight', 'minimal',
      'cyberpunk', 'retroGaming', 'corporate', 'space', 'ocean',
      'fire', 'ice', 'forest', 'sunset', 'matrix', 'neon', 'gradient',
      'rainbow', 'metallic', 'holographic', 'glitch',
      'vaporwave', 'minimalist', 'geometric', 'organic', 'tech', 'gaming', 'professional',
      'acrylic', 'neumorphic'
    ];

    // Si es un tema que debe preservar colores originales, no modificar nada
    if (preserveOriginalColorsThemes.includes(themeKey)) {
      return element;
    }

    // Mapeo de colores específicos del tema a colores adaptados
    const colorMapping = {
      // Synthwave: #ff007c (rosa) -> color personalizado, #00d4ff (cian) -> MANTENER (parte superior)
      '#ff007c': newColor,
      '#00d4ff': '#00d4ff',

      // Nord: #5e81ac (azul) -> color personalizado, #88c0d0 (azul claro) -> MANTENER (parte superior)
      '#5e81ac': newColor,
      '#88c0d0': '#88c0d0',

      // Dracula: #bd93f9 (púrpura) -> color personalizado, #ff79c6 (rosa) -> MANTENER (parte superior)
      '#bd93f9': newColor,
      '#ff79c6': '#ff79c6',

      // Fluent: #0078d4 (azul) -> color personalizado, #50e6ff (cian) -> MANTENER (parte superior)
      '#0078d4': newColor,
      '#50e6ff': '#50e6ff',

      // Solarized: #b58900 (amarillo) -> color personalizado, #268bd2 (azul) -> MANTENER (parte superior)
      '#b58900': newColor,
      '#268bd2': '#268bd2',

      // Material: #007ad9 (azul) -> color personalizado, #42a5f5 (azul claro) -> MANTENER (parte superior)
      // También añadimos variantes comunes de Material
      '#007ad9': newColor,
      '#42a5f5': '#42a5f5',
      '#1976d2': newColor,
      '#2196f3': newColor,

      // VS Code: #dcb67a (dorado) -> color personalizado, #f5d18a (dorado claro) -> MANTENER (parte superior)
      '#dcb67a': newColor,
      '#f5d18a': '#f5d18a',
    };

    // Cambiar colores de manera inteligente (fill y stroke)
    if (newProps.fill && newProps.fill !== 'none' && !newProps.fill.startsWith('url')) {
      if (colorMapping[newProps.fill]) {
        newProps.fill = colorMapping[newProps.fill];
      } else {
        newProps.fill = newColor;
      }
    }

    if (newProps.stroke && newProps.stroke !== 'none' && !newProps.stroke.startsWith('url')) {
      if (colorMapping[newProps.stroke]) {
        newProps.stroke = colorMapping[newProps.stroke];
      } else {
        newProps.stroke = newColor;
      }
    }

    // Procesar children recursivamente
    if (newProps.children) {
      if (Array.isArray(newProps.children)) {
        newProps.children = newProps.children.map((child, idx) =>
          typeof child === 'object' ? modifySVGColors(child, newColor, themeKey, idx) : child
        );
      } else if (typeof newProps.children === 'object') {
        newProps.children = modifySVGColors(newProps.children, newColor, themeKey, 0);
      }
    }

    return React.cloneElement(element, newProps);
  };

  // Función para verificar si un color es el color por defecto de algún tema
  const isDefaultThemeColor = (color) => {
    if (!color || typeof color !== 'string') return false;

    // 1. Verificar contra lista explícita de colores de temas
    const defaultThemeColors = [
      '#007ad9', '#42a5f5', '#1976d2', '#2196f3', // Material
      '#0078d4', '#50e6ff', // Fluent
      '#ff007c', '#00d4ff', // Synthwave
      '#5e81ac', '#88c0d0', // Nord
      '#bd93f9', '#ff79c6', // Dracula
      '#b58900', '#268bd2', // Solarized
      '#dcb67a', '#f5d18a', // VS Code
      '#6c7086', '#808080', '#999999', '#7f8c8d', '#95a5a6' // Minimal / Grises comunes
    ];

    if (defaultThemeColors.includes(color.toLowerCase())) return true;

    // 2. Heurística: Cualquier color con saturación muy baja (< 15%) se trata como gris/default
    try {
      const [h, s, l] = hexToHsl(color);
      if (s < 15) return true;
    } catch (e) {
      // Ignorar errores de parseo
    }

    return false;
  };

  // Función para obtener el color por defecto del tema actual
  const getThemeDefaultColor = (themeName) => {
    const theme = iconThemes[themeName?.toLowerCase() || 'nord'];
    if (!theme || !theme.icons || !theme.icons.folder) return '#5e81ac'; // Nord color por defecto

    const folderIcon = theme.icons.folder;

    // Si el SVG tiene fill y no es "none", usar ese color
    if (folderIcon.props && folderIcon.props.fill && folderIcon.props.fill !== 'none') {
      return folderIcon.props.fill;
    }

    // Si el SVG tiene stroke, usar ese color (para temas como linea que usan stroke)
    if (folderIcon.props && folderIcon.props.stroke) {
      return folderIcon.props.stroke;
    }

    // Fallback: buscar en los children del SVG
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

    return '#5e81ac'; // Nord color por defecto
  };



  const [showImportDialog, setShowImportDialog] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState(() => getThemeDefaultColor(iconTheme?.toLowerCase() || 'nord'));
  const [folderIcon, setFolderIcon] = useState(null);
  const [parentNodeKey, setParentNodeKey] = useState(null);
  const [editingNode, setEditingNode] = useState(null); // Para saber si estamos editando un nodo existente

  // Actualizar color por defecto cuando cambie el tema
  useEffect(() => {
    const newDefaultColor = getThemeDefaultColor(iconTheme?.toLowerCase() || 'nord');
    setFolderColor(newDefaultColor);

    // Actualizar colores de carpetas existentes SOLO si no tienen color personalizado
    const updateExistingFoldersColor = (nodes, newColor) => {
      return nodes.map(node => {
        if (node.droppable) {
          // Es una carpeta
          const updatedNode = { ...node };

          // Si la carpeta no tiene la propiedad hasCustomColor, determinar si tiene color personalizado
          // basándose en si su color es uno de los colores por defecto conocidos
          if (node.hasCustomColor === undefined || !node.hasCustomColor) {
            updatedNode.hasCustomColor = node.color && !isDefaultThemeColor(node.color);
          }

          // Solo actualizar el color si la carpeta NO tiene color personalizado
          // Las carpetas con color personalizado mantienen su color
          if (!updatedNode.hasCustomColor) {
            updatedNode.color = newColor;
          }

          // Asegurar que las carpetas no sean consideradas hojas para permitir drops
          updatedNode.leaf = false;


          // Si tiene children, actualizarlos recursivamente
          if (node.children && node.children.length > 0) {
            updatedNode.children = updateExistingFoldersColor(node.children, newColor);
          }

          return updatedNode;
        }
        return node;
      });
    };

    // Actualizar solo las carpetas sin color personalizado
    const updatedNodes = updateExistingFoldersColor(nodes, newDefaultColor);
    setNodes(updatedNodes);

    // Forzar re-render del árbol para aplicar los nuevos colores
    setTimeout(() => {
      const treeElement = document.querySelector('.sidebar-tree');
      if (treeElement) {
        treeElement.style.display = 'none';
        setTimeout(() => {
          treeElement.style.display = '';
        }, 10);
      }
    }, 100);

  }, [iconTheme, setNodes]);

  // Actualizar variable CSS cuando cambie el color de fuente
  // Usar useRef para evitar loops infinitos
  const prevColorRef = React.useRef(explorerFontColor);

  React.useEffect(() => {
    // Solo actualizar si el color realmente cambió
    if (prevColorRef.current === explorerFontColor) {
      return;
    }

    prevColorRef.current = explorerFontColor;

    // Aplicar la variable CSS al contenedor del sidebar usando el elemento raíz
    if (explorerFontColor) {
      const root = document.documentElement;
      root.style.setProperty('--ui-sidebar-text', explorerFontColor);
    } else {
      const root = document.documentElement;
      root.style.removeProperty('--ui-sidebar-text');
    }
  }, [explorerFontColor]);

  const [aiClientsEnabled, setAiClientsEnabled] = React.useState({
    nodeterm: false,
    claude: false,
    opencode: false,
    geminicli: false,
    codexcli: false,
    anythingllm: false,
    openwebui: false,
    librechat: false,
    agentzero: false,
    openclaw: false,
    opennotebook: false
  });

  // Cargar configuración de clientes de IA desde localStorage
  React.useEffect(() => {
    const loadAIClientsConfig = () => {
      try {
        const config = localStorage.getItem('ai_clients_enabled');
        if (config) {
          const parsed = JSON.parse(config);
          setAiClientsEnabled({
            nodeterm: false,
            claude: parsed.claude === true,
            opencode: parsed.opencode === true,
            geminicli: parsed.geminicli === true,
            codexcli: parsed.codexcli === true,
            anythingllm: parsed.anythingllm === true,
            openwebui: parsed.openwebui === true,
            librechat: parsed.librechat === true,
            agentzero: parsed.agentzero === true,
            openclaw: parsed.openclaw === true,
            opennotebook: parsed.opennotebook === true
          });
        } else {
          // Si no hay configuración, todos desactivados por defecto
          setAiClientsEnabled({
            nodeterm: false,
            claude: false,
            opencode: false,
            geminicli: false,
            codexcli: false,
            anythingllm: false,
            openwebui: false,
            librechat: false,
            agentzero: false,
            openclaw: false,
            opennotebook: false
          });
        }
      } catch (error) {
        console.error('[Sidebar] Error al cargar configuración de clientes IA:', error);
      }
    };

    // Cargar al montar
    loadAIClientsConfig();

    // Escuchar cambios en localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'ai_clients_enabled') {
        loadAIClientsConfig();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // También escuchar evento personalizado para cambios en la misma pestaña
    const handleConfigChange = () => {
      loadAIClientsConfig();
    };
    window.addEventListener('ai-clients-config-changed', handleConfigChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ai-clients-config-changed', handleConfigChange);
    };
  }, []);

  // Lógica para redimensionado inteligente de iconos en sidebar colapsada
  const [collapsedIconSize, setCollapsedIconSize] = useState(40);
  const [collapsedGap, setCollapsedGap] = useState(8);

  useEffect(() => {
    if (!sidebarCollapsed) return;

    const calculateSizes = () => {
      const baseSize = 40;
      const minSize = 24;
      const baseGap = 8;
      const minGap = 2;
      
      // Contar elementos activos en la sidebar colapsada
      let count = 7; // fijos: collapse, conn, pass, group, tools, settings, menu
      
      if (aiClientsEnabled) {
        const enabledClients = Object.values(aiClientsEnabled).filter(Boolean).length;
        count += enabledClients;
        if (enabledClients > 0) count += 1; // separador de clientes
        // separador entre CLIs y Apps
        if ((aiClientsEnabled.nodeterm || aiClientsEnabled.anythingllm || aiClientsEnabled.openwebui || aiClientsEnabled.librechat || aiClientsEnabled.agentzero || aiClientsEnabled.openclaw || aiClientsEnabled.opennotebook) && 
            (aiClientsEnabled.opencode || aiClientsEnabled.geminicli || aiClientsEnabled.codexcli || aiClientsEnabled.claude)) {
          count += 1;
        }
      }
      
      if (filesystemAvailable && isAIChatActive) count += 2.5; // terminal, filesystem, separador
      
      // Altura disponible aproximada (restando márgenes)
      const availableHeight = window.innerHeight - 60;
      const totalNeeded = count * (baseSize + baseGap);
      
      if (totalNeeded > availableHeight) {
        const ratio = availableHeight / totalNeeded;
        setCollapsedIconSize(Math.max(minSize, Math.floor(baseSize * ratio)));
        setCollapsedGap(Math.max(minGap, Math.floor(baseGap * ratio)));
      } else {
        setCollapsedIconSize(baseSize);
        setCollapsedGap(baseGap);
      }
    };

    calculateSizes();
    window.addEventListener('resize', calculateSizes);
    return () => window.removeEventListener('resize', calculateSizes);
  }, [sidebarCollapsed, aiClientsEnabled, filesystemAvailable, isAIChatActive]);

  // Ref para el contenedor de la sidebar
  const sidebarRef = useRef(null);

  const openOpenCodeTab = () => {
    window.dispatchEvent(new CustomEvent('create-local-terminal', {
      detail: { terminalType: 'opencode' }
    }));
  };

  const openGeminiCliTab = () => {
    window.dispatchEvent(new CustomEvent('create-local-terminal', {
      detail: { terminalType: 'geminicli' }
    }));
  };

  const openCodexCliTab = () => {
    window.dispatchEvent(new CustomEvent('create-local-terminal', {
      detail: { terminalType: 'codexcli' }
    }));
  };

  const openClaudeTab = () => {
    window.dispatchEvent(new CustomEvent('create-local-terminal', {
      detail: { terminalType: 'claude' }
    }));
  };

  const openAnythingLLMTab = () => {
    const newTab = {
      key: `anythingllm-${Date.now()}`,
      label: 'AnythingLLM',
      type: 'anything-llm',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-anythingllm-tab', {
      detail: { tab: newTab }
    }));
  };

  const openOpenWebUITab = () => {
    const newTab = {
      key: `openwebui-${Date.now()}`,
      label: 'Open WebUI',
      type: 'openwebui',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-openwebui-tab', {
      detail: { tab: newTab }
    }));
  };

  const openLibreChatTab = () => {
    const newTab = {
      key: `librechat-${Date.now()}`,
      label: 'LibreChat',
      type: 'librechat',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-librechat-tab', {
      detail: { tab: newTab }
    }));
  };

  const openAgentZeroTab = () => {
    const newTab = {
      key: `agentzero-${Date.now()}`,
      label: 'Agent Zero',
      type: 'agentzero',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-agentzero-tab', {
      detail: { tab: newTab }
    }));
  };

  const openOpenClawTab = () => {
    const newTab = {
      key: `openclaw-${Date.now()}`,
      label: 'OpenClaw',
      type: 'openclaw',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-openclaw-tab', {
      detail: { tab: newTab }
    }));
  };

  const openOpenNotebookTab = () => {
    const newTab = {
      key: `open-notebook-${Date.now()}`,
      label: 'Open Notebook',
      type: 'open-notebook',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-open-notebook-tab', {
      detail: { tab: newTab }
    }));
  };

  // Función para manejar el menú de aplicación (unificada)
  const handleAppMenuClick = (event) => {
    // Usar los callbacks pasados como props, o el estado local como fallback
    const importCallback = onShowImportDialog || setShowImportDialog;
    const exportCallback = onShowExportDialog || (() => console.warn('onShowExportDialog no disponible'));
    const importExportCallback = onShowImportExportDialog || (() => console.warn('onShowImportExportDialog no disponible'));
    const wizardCallback = onShowImportWizard || (() => console.warn('onShowImportWizard no disponible'));
    const menuStructure = createAppMenu(importCallback, exportCallback, importExportCallback, t, wizardCallback);
    createContextMenu(event, menuStructure, 'app-context-menu-sidebar');
  };

  // Efecto para manejar la visibilidad de botones durante el redimensionamiento
  useEffect(() => {
    if (!sidebarRef.current || sidebarCollapsed) {
      // Si está colapsado, limpiar el bucket para que se reaplique al expandir
      sidebarResizeBucketRef.current = null;
      return;
    }

    const sidebarElement = sidebarRef.current;

    const applyBucketStyles = (bucket) => {
      // Re-probar los elementos en cada llamada para asegurar que tenemos los actuales (ej: tras cambio de vista)
      const headerElement = sidebarElement.querySelector('.sidebar-header-glass-stack');
      const buttonsContainer = headerElement?.querySelector('.sidebar-action-glass-group');
      
      if (!buttonsContainer) return;

      // Si el bucket es el mismo, no hacemos nada (optimización)
      // Pero si cambiamos de vista, necesitamos forzar una aplicación inicial
      if (sidebarResizeBucketRef.current === bucket) return;
      sidebarResizeBucketRef.current = bucket;

      if (bucket === 'tiny') {
        buttonsContainer.style.opacity = '0.3';
        buttonsContainer.style.transform = 'scale(0.8)';
        buttonsContainer.style.pointerEvents = 'none';
        buttonsContainer.style.display = 'none';
        return;
      }

      if (bucket === 'narrow') {
        buttonsContainer.style.opacity = '0.3';
        buttonsContainer.style.transform = 'scale(0.8)';
        buttonsContainer.style.pointerEvents = 'none';
        buttonsContainer.style.display = 'flex';
        return;
      }

      // wide
      buttonsContainer.style.opacity = '1';
      buttonsContainer.style.transform = 'scale(1)';
      buttonsContainer.style.pointerEvents = 'auto';
      buttonsContainer.style.display = 'flex';
    };

    const widthToBucket = (w) => {
      if (w <= 80) return 'tiny';
      if (w <= 120) return 'narrow';
      return 'wide';
    };

    const scheduleUpdate = (width) => {
      if (sidebarResizeRafRef.current) {
        cancelAnimationFrame(sidebarResizeRafRef.current);
      }
      sidebarResizeRafRef.current = requestAnimationFrame(() => {
        sidebarResizeRafRef.current = null;
        applyBucketStyles(widthToBucket(width));
      });
    };

    // Al cambiar de vista, resetear el bucket para forzar aplicación de estilos al nuevo DOM
    sidebarResizeBucketRef.current = null;

    // Observar cambios en el tamaño de la sidebar
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries?.[0];
      const width = entry?.contentRect?.width ?? sidebarElement.getBoundingClientRect().width;
      scheduleUpdate(width);
    });
    resizeObserver.observe(sidebarElement);

    // Llamar una vez al inicio
    scheduleUpdate(sidebarElement.getBoundingClientRect().width);

    return () => {
      if (sidebarResizeRafRef.current) {
        cancelAnimationFrame(sidebarResizeRafRef.current);
        sidebarResizeRafRef.current = null;
      }
      resizeObserver.disconnect();
    };
  }, [sidebarCollapsed, viewMode]);

  // Helpers
  const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));
  const findNodeByKey = (nodes, key) => {
    if (key === null) return null;
    for (let node of nodes) {
      if (node.key === key) return node;
      if (node.children && node.children.length > 0) {
        const found = findNodeByKey(node.children, key);
        if (found) return found;
      }
    }
    return null;
  };

  const bumpFavoritesRevision = useCallback(() => {
    setFavoritesRevision((prev) => prev + 1);
  }, []);

  const favoritesTree = useMemo(() => buildFavoritesSidebarTree({
    nodes,
    favorites: getFavorites(),
    groups: favoriteGroupsStore.getGroups(),
    getFavoriteGroups: favoriteGroupsStore.getFavoriteGroups
  }), [nodes, favoritesRevision]);

  const filteredFavoritesTree = useMemo(
    () => filterFavoritesTree(favoritesTree, sidebarFilter),
    [favoritesTree, sidebarFilter]
  );

  const displayNodes = showFavoritesView && viewMode === 'connections'
    ? filteredFavoritesTree
    : nodes;

  const totalFavoriteShortcutCount = useMemo(
    () => countFavoriteShortcuts(favoritesTree),
    [favoritesTree]
  );

  const visibleFavoriteShortcutCount = useMemo(
    () => countFavoriteShortcuts(filteredFavoritesTree),
    [filteredFavoritesTree]
  );

  const hasRenderableTreeNodes = showFavoritesView && viewMode === 'connections'
    ? visibleFavoriteShortcutCount > 0
    : displayNodes.length > 0;

  useEffect(() => {
    const unsubscribeFavorites = onFavoritesUpdate(() => bumpFavoritesRevision());
    const unsubscribeGroups = favoriteGroupsStore.onGroupsUpdate(() => bumpFavoritesRevision());
    return () => {
      unsubscribeFavorites();
      unsubscribeGroups();
    };
  }, [bumpFavoritesRevision]);

  useEffect(() => {
    if (!showFavoritesView || viewMode !== 'connections') return;
    setExpandedKeys((prev) => ({
      ...(prev || {}),
      ...getDefaultFavoritesExpandedKeys(favoritesTree)
    }));
  }, [showFavoritesView, viewMode, favoritesTree]);

  const toggleFavoritesView = useCallback(() => {
    setViewMode('connections');
    setShowFavoritesView((prev) => !prev);
    setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  // Función para obtener todas las carpetas (fallback si no viene como prop)
  const getAllFoldersFallback = (nodes, prefix = '') => {
    let folders = [];
    for (const node of nodes) {
      if (node.droppable) {
        folders.push({ label: prefix + node.label, value: node.key });
        if (node.children && node.children.length > 0) {
          folders = folders.concat(getAllFoldersFallback(node.children, prefix + node.label + ' / '));
        }
      }
    }
    return folders;
  };

  // Usar la función del prop o el fallback
  const getAllFoldersToUse = getAllFolders || getAllFoldersFallback;

  // Función para manejar la importación completa (estructura + conexiones) con deduplicación local
  const handleImportComplete = async (importResult) => {
    try {
      if (!importResult) {
        showToast && showToast({
          severity: 'warn',
          summary: 'Sin datos',
          detail: 'No se encontraron conexiones para importar',
          life: 3000
        });
        return;
      }

      // Helper para eliminar duplicados cuando overwrite=true
      const normalizeLabel = (v) => {
        const s = (v || '').toString();
        return s
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const removeConflictsAndAdd = (existingNodes, incomingNodes) => {
        if (!Array.isArray(existingNodes) || !Array.isArray(incomingNodes)) {
          return [...(existingNodes || []), ...(incomingNodes || [])];
        }

        // Crear un Set con los nombres normalizados de los nodos entrantes
        const incomingLabels = new Set();
        incomingNodes.forEach(node => {
          if (node && node.label) {
            incomingLabels.add(normalizeLabel(node.label));
          }
        });

        // Filtrar los nodos existentes, eliminando los que tienen conflicto
        const filteredExisting = existingNodes.filter(node => {
          if (!node || !node.label) return true;
          return !incomingLabels.has(normalizeLabel(node.label));
        });

        // Retornar existentes filtrados + nuevos (los nuevos tienen prioridad)
        return [...filteredExisting, ...incomingNodes];
      };

      // Carpeta destino: raíz por defecto o una seleccionada en el diálogo
      const ROOT_VALUE = 'ROOT';
      const baseTargetKey = importResult?.linkFile
        ? (importResult?.linkedTargetFolderKey || ROOT_VALUE)
        : (importResult?.targetBaseFolderKey || ROOT_VALUE);

      // Opciones específicas según el modo (manual vs vinculado)
      const isLinkedMode = !!importResult?.linkFile;
      const finalCreateContainerFolder = isLinkedMode
        ? (importResult?.linkedCreateContainerFolder || false)
        : (importResult?.createContainerFolder || false);
      const finalContainerLabel = isLinkedMode
        ? (importResult?.linkedContainerFolderName || `mRemoteNG linked - ${new Date().toLocaleDateString()}`)
        : (importResult?.containerFolderName || `mRemoteNG imported - ${new Date().toLocaleDateString()}`);
      const finalOverwrite = isLinkedMode
        ? (importResult?.linkedOverwrite || false)
        : (importResult?.overwrite || false);


      const insertIntoTarget = (nodesToInsert) => {

        // Inserta un array de nodos en la carpeta destino, con soporte para overwrite y contenedor opcional
        const containerize = (children) => ({
          key: `import_container_${Date.now()}`,
          uid: `import_container_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
          label: finalContainerLabel,
          droppable: true,
          children: children,
          createdAt: new Date().toISOString(),
          isUserCreated: true,
          imported: true,
          importedFrom: 'mRemoteNG',
          leaf: false // Asegurar que contenedores acepten drops
        });

        if (baseTargetKey === ROOT_VALUE) {
          setNodes(prev => {
            const nodesCopy = JSON.parse(JSON.stringify(prev || []));
            if (finalCreateContainerFolder) {
              if (finalOverwrite) {
                return removeConflictsAndAdd(nodesCopy, [containerize(nodesToInsert)]);
              } else {
                nodesCopy.push(containerize(nodesToInsert));
                return nodesCopy;
              }
            }
            if (finalOverwrite) {
              return removeConflictsAndAdd(nodesCopy, nodesToInsert);
            } else {
              nodesCopy.push(...nodesToInsert);
              return nodesCopy;
            }
          });
          return;
        }

        setNodes(prev => {
          const nodesCopy = JSON.parse(JSON.stringify(prev || []));
          const targetNode = findNodeByKey(nodesCopy, baseTargetKey);
          if (!targetNode || !targetNode.droppable) {
            // Fallback a raíz si la carpeta no existe o no es droppable
            if (finalCreateContainerFolder) {
              if (finalOverwrite) {
                return removeConflictsAndAdd(nodesCopy, [containerize(nodesToInsert)]);
              }
              nodesCopy.push(containerize(nodesToInsert));
              return nodesCopy;
            }
            if (finalOverwrite) return removeConflictsAndAdd(nodesCopy, nodesToInsert);
            nodesCopy.push(...nodesToInsert);
            return nodesCopy;
          }
          // Inserción dentro de la carpeta seleccionada
          const currentChildren = Array.isArray(targetNode.children) ? targetNode.children : [];
          if (finalCreateContainerFolder) {
            const newChild = containerize(nodesToInsert);
            if (finalOverwrite) {
              targetNode.children = removeConflictsAndAdd(currentChildren, [newChild]);
            } else {
              targetNode.children = [newChild, ...currentChildren];
            }
          } else {
            if (finalOverwrite) {
              targetNode.children = removeConflictsAndAdd(currentChildren, nodesToInsert);
            } else {
              targetNode.children = [...nodesToInsert, ...currentChildren];
            }
          }
          return nodesCopy;
        });
      };

      let addedFolders = 0;
      let addedConnections = 0;

      // Si tenemos estructura con carpetas
      if (importResult.structure && Array.isArray(importResult.structure.nodes) && importResult.structure.nodes.length > 0) {
        let toAdd = (importResult.structure.nodes || []).map((n, idx) => ({
          ...n,
          key: n.key || `folder_${Date.now()}_${idx}_${Math.floor(Math.random() * 1e6)}`,
          uid: n.uid || `folder_${Date.now()}_${idx}_${Math.floor(Math.random() * 1e6)}`
        }));
        insertIntoTarget(toAdd);

        addedFolders = importResult.structure.folderCount || 0;
        addedConnections = importResult.structure.connectionCount || 0;

        // Persistir fuente vinculada y opciones para el banner
        if (isLinkedMode && (importResult.linkedFilePath || importResult.linkedFileName)) {
          try {
            const KEY = 'IMPORT_SOURCES';
            const sources = JSON.parse(localStorage.getItem(KEY) || '[]');
            const stableId = importResult.linkedFilePath || importResult.linkedFileName;
            // Alinear hash con el poller
            let osHash = importResult.linkedFileHash || null;
            try {
              const h = await window.electron?.import?.getFileHash?.(importResult.linkedFilePath);
              if (h?.ok && h?.hash) osHash = h.hash;
            } catch { }
            const newSource = {
              id: stableId,
              fileName: importResult.linkedFileName || null,
              filePath: importResult.linkedFilePath || null,
              fileHash: osHash,
              lastNotifiedHash: osHash,
              lastCheckedAt: Date.now(),
              intervalMs: Number(importResult.pollInterval) || 30000,
              options: {
                // Básicas para compatibilidad con el diálogo
                overwrite: !!(importResult.overwrite ?? finalOverwrite),
                createContainerFolder: !!(importResult.createContainerFolder ?? finalCreateContainerFolder),
                containerFolderName: (importResult.containerFolderName || importResult.linkedContainerFolderName || finalContainerLabel) || null,
                // Específicas de modo vinculado (las que usa el banner)
                linkedOverwrite: !!importResult.linkedOverwrite,
                linkedCreateContainerFolder: !!importResult.linkedCreateContainerFolder,
                linkedContainerFolderName: importResult.linkedContainerFolderName || importResult.containerFolderName || null
              }
            };
            const filtered = sources.filter(s => !(
              (stableId && s.id === stableId) ||
              (newSource.filePath && s.filePath === newSource.filePath) ||
              (newSource.fileName && s.fileName === newSource.fileName)
            ));
            filtered.push(newSource);
            localStorage.setItem(KEY, JSON.stringify(filtered));
          } catch { }
        }
        showToast && showToast({
          severity: 'success',
          summary: 'Importación exitosa',
          detail: `Se importaron ${addedConnections} conexiones y ${addedFolders} carpetas`,
          life: 5000
        });
        return;
      }

      // Lista plana
      const importedConnections = importResult.connections || importResult;
      if (!Array.isArray(importedConnections) || importedConnections.length === 0) {
        showToast && showToast({
          severity: 'warn',
          summary: 'Sin datos',
          detail: 'No se encontraron conexiones para importar',
          life: 3000
        });
        return;
      }

      // Para lista plana, insertar directamente en target según configuración
      insertIntoTarget(importedConnections);

      // Persistir fuente vinculada y opciones para el banner
      if (isLinkedMode && (importResult.linkedFilePath || importResult.linkedFileName)) {
        try {
          const KEY = 'IMPORT_SOURCES';
          const sources = JSON.parse(localStorage.getItem(KEY) || '[]');
          const stableId = importResult.linkedFilePath || importResult.linkedFileName;
          let osHash = importResult.linkedFileHash || null;
          try {
            const h = await window.electron?.import?.getFileHash?.(importResult.linkedFilePath);
            if (h?.ok && h?.hash) osHash = h.hash;
          } catch { }
          const newSource = {
            id: stableId,
            fileName: importResult.linkedFileName || null,
            filePath: importResult.linkedFilePath || null,
            fileHash: osHash,
            lastNotifiedHash: osHash,
            lastCheckedAt: Date.now(),
            intervalMs: Number(importResult.pollInterval) || 30000,
            options: {
              overwrite: !!(importResult.overwrite ?? finalOverwrite),
              createContainerFolder: !!(importResult.createContainerFolder ?? finalCreateContainerFolder),
              containerFolderName: (importResult.containerFolderName || importResult.linkedContainerFolderName || finalContainerLabel) || null,
              linkedOverwrite: !!importResult.linkedOverwrite,
              linkedCreateContainerFolder: !!importResult.linkedCreateContainerFolder,
              linkedContainerFolderName: importResult.linkedContainerFolderName || importResult.containerFolderName || null
            }
          };
          const filtered = sources.filter(s => !(
            (stableId && s.id === stableId) ||
            (newSource.filePath && s.filePath === newSource.filePath) ||
            (newSource.fileName && s.fileName === newSource.fileName)
          ));
          filtered.push(newSource);
          localStorage.setItem(KEY, JSON.stringify(filtered));
        } catch { }
      }
      showToast && showToast({
        severity: 'success',
        summary: 'Importación exitosa',
        detail: `Se importaron ${importedConnections.length} conexiones`,
        life: 5000
      });
      // Desbloquear formularios por si alguna máscara quedó activa
      setTimeout(() => {
        safeUnblockForms(showToast);
      }, 0);

    } catch (error) {
      console.error('Error al procesar importación:', error);
      showToast && showToast({
        severity: 'error',
        summary: 'Error de importación',
        detail: 'Error al agregar las conexiones importadas a la sidebar',
        life: 5000
      });
    }
  };

  // Sondeo de cambios en fuentes vinculadas (renderer-only, eficiente con timestamp)
  useEffect(() => {
    const KEY = 'IMPORT_SOURCES';
    // Anti-rebote en memoria (no escribe en localStorage en cada tick)
    const notifiedByKey = new Map();
    let timers = [];
    const schedule = async () => {
      // Limpiar timers previos
      timers.forEach(t => clearInterval(t));
      timers = [];

      // 1) Reconciliar al inicio: alinear fileHash/lastNotifiedHash con hash del OS para evitar banner falso en arranque
      let sources = JSON.parse(localStorage.getItem(KEY) || '[]');
      try {
        const updated = await Promise.all((sources || []).map(async (s) => {
          if (s && s.filePath) {
            try {
              const h = await window.electron?.import?.getFileHash?.(s.filePath);
              if (h?.ok && h?.hash) {
                const osHash = h.hash;
                if (s.fileHash !== osHash || s.lastNotifiedHash !== osHash || !s.lastCheckedAt) {
                  return { ...s, fileHash: osHash, lastNotifiedHash: osHash, lastCheckedAt: Date.now() };
                }
              }
            } catch { }
          }
          return s;
        }));
        // Solo escribir si hay cambios efectivos
        const before = JSON.stringify(sources);
        const after = JSON.stringify(updated);
        if (before !== after) {
          try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch { }
          sources = updated;
        }
      } catch { }

      // 2) Programar timers usando snapshot actualizado
      (sources || []).forEach(snapshotSource => {
        const interval = Math.max(5000, Number(snapshotSource.intervalMs) || 30000);
        const timer = setInterval(async () => {
          try {
            let hasChange = false;
            // Cargar SIEMPRE la versión fresca de la fuente para usar el hash actualizado
            const freshSources = JSON.parse(localStorage.getItem(KEY) || '[]');
            const source = freshSources.find(s =>
              (snapshotSource.id && s.id === snapshotSource.id) ||
              (snapshotSource.filePath && s.filePath === snapshotSource.filePath) ||
              (snapshotSource.fileName && s.fileName === snapshotSource.fileName)
            );
            if (source?.filePath) {
              const currentStoredHash = source?.fileHash || null;
              const h = await window.electron?.import?.getFileHash?.(source.filePath);
              if (h?.ok && currentStoredHash && h.hash !== currentStoredHash) {
                // Anti-rebote: notificar solo si es un hash nuevo respecto al último notificado
                const stableKey = source?.id || source?.filePath || source?.fileName;
                const lastNotified = notifiedByKey.get(stableKey);
                if (h.hash !== lastNotified) {
                  hasChange = true;
                  notifiedByKey.set(stableKey, h.hash);
                }
              }
            }
            if (hasChange) {
              const event = new CustomEvent('import-source:poll', { detail: { source, hasChange: true } });
              window.dispatchEvent(event);
            }
          } catch {
            // Silencio en error para evitar banners falsos
          }
        }, interval);
        timers.push(timer);
      });
    };
    schedule();
    const onStorage = (e) => { if (e.key === KEY) schedule(); };
    window.addEventListener('storage', onStorage);
    return () => {
      timers.forEach(t => clearInterval(t));
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  // Crear nueva carpeta o editar existente
  const createNewFolder = () => {
    if (!folderName.trim()) {
      showToast && showToast({ severity: 'error', summary: 'Error', detail: 'El nombre de carpeta no puede estar vacío', life: 3000 });
      return;
    }

    if (showFavoritesView && viewMode === 'connections') {
      try {
        if (editingNode && isFavoriteGroupFolderNode(editingNode)) {
          favoriteGroupsStore.updateGroup(editingNode.favoriteGroupId, {
            name: folderName.trim(),
            color: folderColor,
            icon: 'pi-folder'
          });
          showToast && showToast({
            severity: 'success',
            summary: 'Éxito',
            detail: `Carpeta "${folderName}" actualizada`,
            life: 3000
          });
        } else {
          favoriteGroupsStore.createGroup({
            name: folderName.trim(),
            color: folderColor,
            icon: 'pi-folder'
          });
          showToast && showToast({
            severity: 'success',
            summary: 'Éxito',
            detail: `Carpeta "${folderName}" creada en Favoritos`,
            life: 3000
          });
        }
        bumpFavoritesRevision();
      } catch (error) {
        showToast && showToast({
          severity: 'error',
          summary: 'Error',
          detail: error?.message || 'No se pudo crear la carpeta de favoritos',
          life: 3000
        });
        return;
      }

      setShowFolderDialog(false);
      setFolderName('');
      setFolderColor(getThemeDefaultColor(iconTheme?.toLowerCase() || 'nord'));
      setFolderIcon(null);
      setParentNodeKey(null);
      setEditingNode(null);
      setTimeout(() => {
        try { unblockAllInputs(); } catch { }
      }, 0);
      return;
    }

    const nodesCopy = deepCopy(nodes);

    if (editingNode) {
      // Modo edición: actualizar carpeta existente
      const updateNodeInTree = (nodes, targetKey, newLabel, newColor, newIcon) => {
        return nodes.map(node => {
          if (node.key === targetKey) {
            return { ...node, label: newLabel, color: newColor, folderIcon: newIcon || 'general' };
          }
          if (node.children) {
            return { ...node, children: updateNodeInTree(node.children, targetKey, newLabel, newColor, newIcon) };
          }
          return node;
        });
      };
      const updatedNodes = updateNodeInTree(nodesCopy, editingNode.key, folderName.trim(), folderColor, folderIcon);
      setNodes(() => logSetNodes('Sidebar', updatedNodes));
      showToast && showToast({ severity: 'success', summary: 'Éxito', detail: `Carpeta "${folderName}" actualizada`, life: 3000 });
    } else {
      // Modo creación: crear nueva carpeta
      const newKey = `node_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const newFolder = {
        key: newKey,
        label: folderName.trim(),
        droppable: true,
        children: [],
        uid: newKey,
        createdAt: new Date().toISOString(),
        isUserCreated: true,
        color: folderColor,
        folderIcon: folderIcon || 'general',
        leaf: false // Asegurar que nuevas carpetas acepten drops
      };

      if (parentNodeKey === null) {
        nodesCopy.push(newFolder);
      } else {
        const parentNode = findNodeByKey(nodesCopy, parentNodeKey);
        if (!parentNode) {
          showToast && showToast({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la carpeta', life: 3000 });
          return;
        }
        parentNode.children = parentNode.children || [];
        parentNode.children.unshift(newFolder);
      }
      setNodes(() => logSetNodes('Sidebar', nodesCopy));
      showToast && showToast({ severity: 'success', summary: 'Éxito', detail: `Carpeta "${folderName}" creada`, life: 3000 });
    }

    // Limpiar formulario
    setShowFolderDialog(false);
    setFolderName('');
    setFolderColor(getThemeDefaultColor(iconTheme?.toLowerCase() || 'nord'));
    setParentNodeKey(null);
    setEditingNode(null);

    // Desbloquear formularios por si alguna máscara quedó activa
    setTimeout(() => {
      try { unblockAllInputs(); } catch { }
    }, 0);
  };


  // Drag and drop helpers y lógica igual que antes
  // Clona el árbol y actualiza solo el subárbol con la key indicada
  function cloneTreeWithUpdatedNode(tree, targetKey, updateFn) {
    return tree.map(node => {
      if (node.key === targetKey) {
        return updateFn({ ...node });
      }
      if (node.children) {
        return { ...node, children: cloneTreeWithUpdatedNode(node.children, targetKey, updateFn) };
      }
      return node;
    });
  }
  const onFavoritesDragDrop = (event) => {
    const { dragNode, value } = event || {};
    if (!dragNode || !Array.isArray(value) || value.length === 0) {
      return;
    }

    if (isFavoritesRootKey(dragNode.key)) {
      return;
    }

    if (!isFavoriteShortcutNode(dragNode) && !isFavoriteGroupFolderNode(dragNode)) {
      return;
    }

    if (applyFavoritesTreeLayoutFromDrop(value)) {
      bumpFavoritesRevision();
    }
  };

  // Drag and drop robusto para mover entre raíz/carpetas sin mutar estado previo.
  const onDragDrop = (event) => {
    if (showFavoritesView && viewMode === 'connections') {
      onFavoritesDragDrop(event);
      return;
    }

    const { dragNode, dropNode, dropPoint, value } = event || {};
    if (!dragNode || !dropNode) {
      if (Array.isArray(value)) setNodes(value);
      return;
    }

    const isDropOverNode = dropPoint === 0;
    const isDropTargetFolder = !!(dropNode && dropNode.droppable === true);

    // Reordenado estándar (antes/después del nodo destino)
    if (!isDropOverNode || !isDropTargetFolder) {
      if (Array.isArray(value)) {
        setNodes(value);
      }
      return;
    }

    // Evitar mover un nodo dentro de sí mismo o de su propio subárbol.
    const isDescendantKey = (node, targetKey) => {
      if (!node || !Array.isArray(node.children)) return false;
      for (const child of node.children) {
        if (child.key === targetKey) return true;
        if (isDescendantKey(child, targetKey)) return true;
      }
      return false;
    };

    if (dragNode.key === dropNode.key || isDescendantKey(dragNode, dropNode.key)) {
      showToast && showToast({
        severity: 'warn',
        summary: 'Operación no permitida',
        detail: 'No puedes mover una carpeta dentro de sí misma.',
        life: 2500
      });
      return;
    }

    // Remover de forma inmutable y devolver también el nodo removido.
    const removeNodeByKey = (list, key) => {
      let removed = null;
      const next = [];
      for (const currentNode of list || []) {
        if (currentNode.key === key) {
          removed = currentNode;
          continue;
        }

        if (Array.isArray(currentNode.children) && currentNode.children.length > 0) {
          const childResult = removeNodeByKey(currentNode.children, key);
          if (childResult.removed) removed = childResult.removed;
          next.push({ ...currentNode, children: childResult.nodes });
        } else {
          next.push(currentNode);
        }
      }
      return { nodes: next, removed };
    };

    const insertIntoFolder = (list, targetKey, nodeToInsert) => {
      let inserted = false;
      const next = (list || []).map((currentNode) => {
        if (currentNode.key === targetKey) {
          inserted = true;
          const currentChildren = Array.isArray(currentNode.children) ? currentNode.children : [];
          // Insertar al inicio para mantener comportamiento previo.
          return { ...currentNode, children: [nodeToInsert, ...currentChildren] };
        }

        if (Array.isArray(currentNode.children) && currentNode.children.length > 0) {
          const updatedChildren = insertIntoFolder(currentNode.children, targetKey, nodeToInsert);
          if (updatedChildren.inserted) inserted = true;
          return { ...currentNode, children: updatedChildren.nodes };
        }
        return currentNode;
      });

      return { nodes: next, inserted };
    };

    const clonedTree = JSON.parse(JSON.stringify(nodes || []));
    const removedResult = removeNodeByKey(clonedTree, dragNode.key);
    if (!removedResult.removed) {
      if (Array.isArray(value)) setNodes(value);
      return;
    }

    const insertedResult = insertIntoFolder(removedResult.nodes, dropNode.key, removedResult.removed);
    if (!insertedResult.inserted) {
      if (Array.isArray(value)) setNodes(value);
      return;
    }

    setNodes(insertedResult.nodes);
  };

  const stopTreeDragAutoScroll = useCallback(() => {
    dragAutoScrollSpeedRef.current = 0;
    if (treeContainerRef.current) {
      treeContainerRef.current.classList.remove('drag-autoscroll-active');
    }
    if (dragAutoScrollRafRef.current) {
      cancelAnimationFrame(dragAutoScrollRafRef.current);
      dragAutoScrollRafRef.current = null;
    }
    dragAutoScrollActiveRef.current = false;
  }, []);

  const runTreeDragAutoScroll = useCallback(() => {
    const container = treeContainerRef.current;
    if (!container) {
      stopTreeDragAutoScroll();
      return;
    }

    const speed = dragAutoScrollSpeedRef.current;
    if (!speed) {
      stopTreeDragAutoScroll();
      return;
    }

    const maxScrollTop = container.scrollHeight - container.clientHeight;
    if (maxScrollTop <= 0) {
      stopTreeDragAutoScroll();
      return;
    }

    const nextScrollTop = Math.max(0, Math.min(maxScrollTop, container.scrollTop + speed));
    container.scrollTop = nextScrollTop;

    if ((nextScrollTop <= 0 && speed < 0) || (nextScrollTop >= maxScrollTop && speed > 0)) {
      stopTreeDragAutoScroll();
      return;
    }

    dragAutoScrollRafRef.current = requestAnimationFrame(runTreeDragAutoScroll);
  }, [stopTreeDragAutoScroll]);

  const handleTreeContainerDragOver = useCallback((e) => {
    const container = treeContainerRef.current;
    if (!container) return;

    e.preventDefault();

    const rect = container.getBoundingClientRect();
    const threshold = 72;
    const maxSpeed = 14;
    const pointerY = e.clientY;
    const distanceTop = pointerY - rect.top;
    const distanceBottom = rect.bottom - pointerY;

    let nextSpeed = 0;
    if (distanceTop >= 0 && distanceTop < threshold) {
      const ratio = (threshold - distanceTop) / threshold;
      nextSpeed = -Math.max(1, ratio * maxSpeed);
    } else if (distanceBottom >= 0 && distanceBottom < threshold) {
      const ratio = (threshold - distanceBottom) / threshold;
      nextSpeed = Math.max(1, ratio * maxSpeed);
    }

    dragAutoScrollSpeedRef.current = nextSpeed;

    if (nextSpeed !== 0) {
      container.classList.add('drag-autoscroll-active');
      if (!dragAutoScrollActiveRef.current) {
        dragAutoScrollActiveRef.current = true;
        dragAutoScrollRafRef.current = requestAnimationFrame(runTreeDragAutoScroll);
      }
    } else {
      stopTreeDragAutoScroll();
    }
  }, [runTreeDragAutoScroll, stopTreeDragAutoScroll]);

  const handleTreeContainerDragLeave = useCallback((e) => {
    const container = treeContainerRef.current;
    if (!container) return;
    if (e.currentTarget.contains(e.relatedTarget)) return;
    stopTreeDragAutoScroll();
  }, [stopTreeDragAutoScroll]);

  useEffect(() => {
    return () => {
      stopTreeDragAutoScroll();
    };
  }, [stopTreeDragAutoScroll]);


  // Eventos globales para acciones de acceso rápido desde Home
  useEffect(() => {
    const handleOpenPasswords = () => setViewMode('passwords');
    const handleOpenSettings = () => setShowSettingsDialog(true);
    const handleOpenExplorerDialog = () => {
      setShowUnifiedConnectionDialog && setShowUnifiedConnectionDialog(true);
    };
    window.addEventListener('open-password-manager', handleOpenPasswords);
    window.addEventListener('open-settings-dialog', handleOpenSettings);
    window.addEventListener('open-explorer-dialog', handleOpenExplorerDialog);
    return () => {
      window.removeEventListener('open-password-manager', handleOpenPasswords);
      window.removeEventListener('open-settings-dialog', handleOpenSettings);
      window.removeEventListener('open-explorer-dialog', handleOpenExplorerDialog);
    };
  }, [setShowSettingsDialog, setShowUnifiedConnectionDialog]);


  // Escuchar evento para abrir el diálogo de crear grupo desde la vista de passwords
  useEffect(() => {
    const handleOpenCreateGroupDialog = () => {
      setShowCreateGroupDialog(true);
    };
    window.addEventListener('open-create-group-dialog', handleOpenCreateGroupDialog);
    return () => {
      window.removeEventListener('open-create-group-dialog', handleOpenCreateGroupDialog);
    };
  }, [setShowCreateGroupDialog]);

  // Registrar callbacks para el menú contextual
  useEffect(() => {
    if (sidebarCallbacksRef) {
      // Preservar callbacks existentes y agregar/actualizar los del sidebar
      sidebarCallbacksRef.current = {
        ...sidebarCallbacksRef.current,
        createFolder: (parentKey) => {
          if (isFavoritesRootKey(parentKey) || isFavoriteGroupFolderKey(parentKey)) {
            setViewMode('connections');
            setShowFavoritesView(true);
            setParentNodeKey(FAVORITES_ROOT_KEY);
            setEditingNode(null);
            setShowFolderDialog(true);
            return;
          }
          setParentNodeKey(parentKey);
          setEditingNode(null);
          setShowFolderDialog(true);
        },

        duplicateSSH: (node) => {
          // Duplicar conexión SSH
          const nodesCopy = deepCopy(nodes);
          const newKey = `ssh_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
          const duplicatedNode = {
            ...node,
            key: newKey,
            uid: newKey,
            label: `${node.label} (Copia)`,
            data: {
              ...node.data,
              // Mantener todos los datos originales
            }
          };

          // Encontrar el nodo padre y añadir la copia
          const findParentAndAdd = (nodes, targetKey, newNode) => {
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].key === targetKey) {
                // Si es un nodo raíz, añadir al final
                nodes.push(newNode);
                return true;
              }
              if (nodes[i].children) {
                for (let j = 0; j < nodes[i].children.length; j++) {
                  if (nodes[i].children[j].key === targetKey) {
                    // Añadir después del nodo original
                    nodes[i].children.splice(j + 1, 0, newNode);
                    return true;
                  }
                }
                if (findParentAndAdd(nodes[i].children, targetKey, newNode)) {
                  return true;
                }
              }
            }
            return false;
          };

          // Buscar el nodo original para encontrar su posición
          const findNodePosition = (nodes, targetKey) => {
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].key === targetKey) {
                return { parentNodes: nodes, index: i, isRoot: true };
              }
              if (nodes[i].children) {
                for (let j = 0; j < nodes[i].children.length; j++) {
                  if (nodes[i].children[j].key === targetKey) {
                    return { parentNodes: nodes[i].children, index: j, isRoot: false };
                  }
                }
                const found = findNodePosition(nodes[i].children, targetKey);
                if (found) return found;
              }
            }
            return null;
          };

          const position = findNodePosition(nodesCopy, node.key);
          if (position) {
            position.parentNodes.splice(position.index + 1, 0, duplicatedNode);
            setNodes(() => logSetNodes('Sidebar-DuplicateSSH', nodesCopy));
            showToast && showToast({
              severity: 'success',
              summary: 'Duplicado',
              detail: `Conexión SSH "${node.label}" duplicada`,
              life: 3000
            });
            // Desbloquear formularios por si alguna máscara quedó activa
            setTimeout(() => {
              safeUnblockForms(showToast);
            }, 0);
          }
        },

        duplicateRDP: (node) => {
          // Duplicar conexión RDP
          const nodesCopy = deepCopy(nodes);
          const newKey = `rdp_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
          const duplicatedNode = {
            ...node,
            key: newKey,
            uid: newKey,
            label: `${node.label} (Copia)`,
            data: {
              ...node.data,
              // Mantener todos los datos originales
            }
          };

          // Buscar el nodo original para encontrar su posición
          const findNodePosition = (nodes, targetKey) => {
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].key === targetKey) {
                return { parentNodes: nodes, index: i, isRoot: true };
              }
              if (nodes[i].children) {
                for (let j = 0; j < nodes[i].children.length; j++) {
                  if (nodes[i].children[j].key === targetKey) {
                    return { parentNodes: nodes[i].children, index: j, isRoot: false };
                  }
                }
                const found = findNodePosition(nodes[i].children, targetKey);
                if (found) return found;
              }
            }
            return null;
          };

          const position = findNodePosition(nodesCopy, node.key);
          if (position) {
            position.parentNodes.splice(position.index + 1, 0, duplicatedNode);
            setNodes(() => logSetNodes('Sidebar-DuplicateRDP', nodesCopy));
            showToast && showToast({
              severity: 'success',
              summary: 'Duplicado',
              detail: `Conexión RDP "${node.label}" duplicada`,
              life: 3000
            });
            // Desbloquear formularios por si alguna máscara quedó activa
            setTimeout(() => {
              safeUnblockForms(showToast);
            }, 0);
          }
        },

        duplicateVNC: (node) => {
          // Duplicar conexión VNC
          const nodesCopy = deepCopy(nodes);
          const newKey = `vnc_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
          const duplicatedNode = {
            ...node,
            key: newKey,
            uid: newKey,
            label: `${node.label} (Copia)`,
            data: {
              ...node.data,
              // Mantener todos los datos originales
            }
          };

          // Buscar el nodo original para encontrar su posición
          const findNodePosition = (nodes, targetKey) => {
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].key === targetKey) {
                return { parentNodes: nodes, index: i, isRoot: true };
              }
              if (nodes[i].children) {
                for (let j = 0; j < nodes[i].children.length; j++) {
                  if (nodes[i].children[j].key === targetKey) {
                    return { parentNodes: nodes[i].children, index: j, isRoot: false };
                  }
                }
                const found = findNodePosition(nodes[i].children, targetKey);
                if (found) return found;
              }
            }
            return null;
          };

          const position = findNodePosition(nodesCopy, node.key);
          if (position) {
            position.parentNodes.splice(position.index + 1, 0, duplicatedNode);
            setNodes(() => logSetNodes('Sidebar-DuplicateVNC', nodesCopy));
            showToast && showToast({
              severity: 'success',
              summary: 'Duplicado',
              detail: `Conexión VNC "${node.label}" duplicada`,
              life: 3000
            });
            // Desbloquear formularios por si alguna máscara quedó activa
            setTimeout(() => {
              safeUnblockForms(showToast);
            }, 0);
          }
        },

        duplicateFolder: (node) => {
          // Duplicar carpeta con todo su contenido
          const nodesCopy = deepCopy(nodes);
          const newKey = `folder_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

          // Función recursiva para duplicar un nodo y todos sus hijos
          const duplicateNodeRecursive = (originalNode) => {
            const newNode = {
              ...originalNode,
              key: `${originalNode.key}_copy_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
              uid: `${originalNode.uid}_copy_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
              label: originalNode.droppable ? `${originalNode.label} (Copia)` : originalNode.label
            };

            if (originalNode.children && originalNode.children.length > 0) {
              newNode.children = originalNode.children.map(child => duplicateNodeRecursive(child));
            }

            return newNode;
          };

          const duplicatedFolder = duplicateNodeRecursive(node);

          // Buscar el nodo original para encontrar su posición
          const findNodePosition = (nodes, targetKey) => {
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].key === targetKey) {
                return { parentNodes: nodes, index: i, isRoot: true };
              }
              if (nodes[i].children) {
                for (let j = 0; j < nodes[i].children.length; j++) {
                  if (nodes[i].children[j].key === targetKey) {
                    return { parentNodes: nodes[i].children, index: j, isRoot: false };
                  }
                }
                const found = findNodePosition(nodes[i].children, targetKey);
                if (found) return found;
              }
            }
            return null;
          };

          const position = findNodePosition(nodesCopy, node.key);
          if (position) {
            position.parentNodes.splice(position.index + 1, 0, duplicatedFolder);
            setNodes(() => logSetNodes('Sidebar-DuplicateFolder', nodesCopy));
            showToast && showToast({
              severity: 'success',
              summary: 'Duplicado',
              detail: `Carpeta "${node.label}" y su contenido duplicados`,
              life: 3000
            });
            // Desbloquear formularios por si alguna máscara quedó activa
            setTimeout(() => {
              safeUnblockForms(showToast);
            }, 0);
          }
        },

        editFolder: (node) => {
          if (isFavoriteGroupFolderNode(node)) {
            setViewMode('connections');
            setShowFavoritesView(true);
            setParentNodeKey(FAVORITES_ROOT_KEY);
            setEditingNode(node);
            setFolderName(node.label);
            setFolderColor(node.color || getThemeDefaultColor(iconTheme?.toLowerCase() || 'nord'));
            setFolderIcon(node.folderIcon || null);
            setShowFolderDialog(true);
            return;
          }

          // Cargar datos de la carpeta para editar
          setFolderName(node.label);
          setFolderColor(node.color || '#5e81ac');
          // Encontrar la carpeta padre
          const findParent = (nodes, targetKey, currentParent = null) => {
            for (let n of nodes) {
              if (n.children && n.children.some(child => child.key === targetKey)) {
                return n.key;
              }
              if (n.children) {
                const found = findParent(n.children, targetKey, n.key);
                if (found) return found;
              }
            }
            return currentParent;
          };
          const parentKey = findParent(nodes, node.key);
          setParentNodeKey(parentKey);
          setEditingNode(node); // Estado para saber que estamos editando
          setFolderName(node.label);
          setFolderColor(node.color || getThemeDefaultColor(iconTheme?.toLowerCase() || 'nord'));
          setFolderIcon(node.folderIcon || null);
          setShowFolderDialog(true);
        },
        deleteNode: (nodeKey, nodeLabel) => {
          if (isFavoritesRootKey(nodeKey)) {
            return;
          }

          if (isFavoriteGroupFolderKey(nodeKey)) {
            const groupId = getFavoriteGroupIdFromKey(nodeKey);
            const executeFavoriteGroupDeletion = () => {
              try {
                favoriteGroupsStore.deleteGroup(groupId);
                bumpFavoritesRevision();
                showToast && showToast({
                  severity: 'success',
                  summary: 'Eliminado',
                  detail: `"${nodeLabel}" ha sido eliminado`,
                  life: 3000
                });
                if (hideContextMenu) hideContextMenu();
              } catch (error) {
                showToast && showToast({
                  severity: 'error',
                  summary: 'Error',
                  detail: error?.message || `Error al eliminar "${nodeLabel}"`,
                  life: 5000
                });
              }
            };

            const dialogToUse = confirmDialog || window.confirmDialog;
            if (dialogToUse) {
              dialogToUse({
                message: `¿Eliminar la carpeta de favoritos "${nodeLabel}"?`,
                header: 'Confirmar eliminación',
                icon: 'pi pi-exclamation-triangle',
                acceptClassName: 'p-button-danger',
                accept: executeFavoriteGroupDeletion
              });
            } else if (window.confirm(`¿Eliminar la carpeta de favoritos "${nodeLabel}"?`)) {
              executeFavoriteGroupDeletion();
            }
            return;
          }

          // Buscar el nodo para determinar si tiene hijos
          const findNodeByKey = (nodes, targetKey) => {
            for (const node of nodes) {
              if (node.key === targetKey) {
                return node;
              }
              if (node.children && Array.isArray(node.children)) {
                const found = findNodeByKey(node.children, targetKey);
                if (found) return found;
              }
            }
            return null;
          };

          const targetNode = findNodeByKey(nodes, nodeKey);
          const hasChildren = targetNode && targetNode.children && targetNode.children.length > 0;

          // Función para ejecutar la eliminación
          const executeDeletion = () => {

            const removeNodeFromTree = (nodes, targetKey) => {
              if (!Array.isArray(nodes)) {
                console.error('❌ removeNodeFromTree: nodes no es un array:', typeof nodes, nodes);
                return [];
              }

              return nodes.filter(node => {
                if (node.key === targetKey) {
                  return false;
                }
                if (node.children && Array.isArray(node.children)) {
                  node.children = removeNodeFromTree(node.children, targetKey);
                }
                return true;
              });
            };

            try {
              const nodesCopy = JSON.parse(JSON.stringify(nodes));
              const newNodes = removeNodeFromTree(nodesCopy, nodeKey);
              setNodes(() => logSetNodes('Sidebar-Delete', newNodes));

              showToast && showToast({
                severity: 'success',
                summary: 'Eliminado',
                detail: `"${nodeLabel}" ha sido eliminado`,
                life: 3000
              });

              // Cerrar menú contextual inmediatamente
              if (hideContextMenu) {
                hideContextMenu();
              }

              // Desbloquear formularios después de un breve delay
              setTimeout(() => {
                try {
                  unblockAllInputs();
                } catch (error) {
                  console.error('Error al desbloquear formularios:', error);
                }
              }, 100);

            } catch (error) {
              console.error('❌ Error en deleteNode:', error);
              showToast && showToast({
                severity: 'error',
                summary: 'Error',
                detail: `Error al eliminar "${nodeLabel}": ${error.message}`,
                life: 5000
              });
            }
          };

          // Mostrar diálogo de confirmación antes de eliminar
          const dialogToUse = confirmDialog || window.confirmDialog;

          if (dialogToUse) {
            const message = hasChildren
              ? `¿Estás seguro de que deseas eliminar la carpeta "${nodeLabel}" y todo su contenido? Esta acción no se puede deshacer.`
              : `¿Estás seguro de que deseas eliminar "${nodeLabel}"? Esta acción no se puede deshacer.`;

            dialogToUse({
              message: message,
              header: 'Confirmar eliminación',
              icon: 'pi pi-exclamation-triangle',
              acceptClassName: 'p-button-danger',
              accept: executeDeletion,
              reject: () => {
                // Usuario canceló la eliminación
              }
            });
          } else {
            // Fallback si no hay confirmDialog disponible
            executeDeletion();
          }
        }
      };
    }
  }, [nodes, setShowFolderDialog, deepCopy, findNodeByKey, showToast, confirmDialog,
    setEditingNode, setFolderName, setParentNodeKey, setNodes, openEditSSHDialog]);



  const colors = uiThemes[uiTheme]?.colors || uiThemes['Light'].colors;
  // Función interna para el menú contextual del área del árbol
  // const onTreeAreaContextMenu = (event) => {
  //   event.preventDefault();
  //   event.stopPropagation();
  //   // Aquí se podría mostrar un menú contextual propio si se desea
  // };
  // nodeTemplate adaptado de App.js
  const nodeTemplate = (node, options) => {
    const actionNode = isFavoriteShortcutNode(node) ? resolveFavoriteShortcutNode(node, nodes) : node;
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isFolder = !!(node.droppable || hasChildren);
    const isSSH = actionNode.data && actionNode.data.type === 'ssh';
    const isRDP = actionNode.data && actionNode.data.type === 'rdp';
    const isVNC = actionNode.data && (actionNode.data.type === 'vnc' || actionNode.data.type === 'vnc-guacamole');
    const isFileConnection = actionNode.data && (actionNode.data.type === 'sftp' || actionNode.data.type === 'ftp' || actionNode.data.type === 'scp');
    const isPassword = actionNode.data && actionNode.data.type === 'password';
    const isSSHTunnel = actionNode.data && actionNode.data.type === 'ssh-tunnel';
    // Icono según tema seleccionado para la sidebar
    let icon = null;
    const themeKey = (iconTheme || 'nord').toLowerCase();
    const themeIcons = iconThemes[themeKey]?.icons || iconThemes['nord'].icons;

    // Helper para unificar el tamaño óptico de los iconos según el tema
    const getNormalizedIcon = (rawIcon, size, key) => {
      if (!rawIcon) return null;
      
      // Factores de escala correctores para temas con mucho padding interno
      const SCALES = {
        material: 1.12,
        nord: 1.05,
        cyberpunk: 1.04,
        dracula: 1.08,
        solarized: 1.08,
        monokai: 1.08,
        onedark: 1.08,
        gruvbox: 1.06,
        atom: 1.05,
        vscode: 1.05,
        linea: 1.06,
        fluent: 1.0 // Ya es bastante grande
      };

      const scale = SCALES[key] || 1.0;
      const finalSize = Math.round(size * scale);

      return React.cloneElement(rawIcon, {
        width: finalSize,
        height: finalSize,
        style: {
          ...rawIcon.props.style,
          width: `${finalSize}px`,
          height: `${finalSize}px`,
          flexShrink: 0,
          display: 'block'
        }
      });
    };
    if (isSSH) {
      // Verificar si tiene icono personalizado (ignorar 'default' para usar el icono del tema)
      if (node.data?.customIcon && node.data.customIcon !== 'default' && SSHIconPresets[node.data.customIcon.toUpperCase()]) {
        const preset = SSHIconPresets[node.data.customIcon.toUpperCase()];
        icon = <SSHIconRenderer preset={preset} pixelSize={connectionIconSize} />;
      } else {
        // Usar icono del tema unificado
        icon = getNormalizedIcon(themeIcons.ssh, connectionIconSize, themeKey);
      }
    } else if (isRDP) {
      icon = getNormalizedIcon(themeIcons.rdp, connectionIconSize, themeKey) || '🖥️';
    } else if (isVNC) {
      icon = getNormalizedIcon(themeIcons.vnc || themeIcons.rdp, connectionIconSize, themeKey) || '🖥️';
    } else if (isPassword) {
      icon = <span className="pi pi-key" style={{ color: '#ffc107', fontSize: `${connectionIconSize}px` }} />;
    } else if (isSSHTunnel) {
      // Icono para túneles SSH con indicador de estado
      const tunnelStatus = node.data?.tunnelStatus || 'stopped';
      const statusColors = {
        active: '#a6e3a1',
        connecting: '#89b4fa',
        error: '#f38ba8',
        stopped: '#6c7086'
      };
      icon = (
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <span className="pi pi-share-alt" style={{ color: statusColors[tunnelStatus] || '#89b4fa', fontSize: `${connectionIconSize}px` }} />
          {tunnelStatus === 'active' && (
            <span style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#a6e3a1',
              border: '1px solid #1e1e2e'
            }} />
          )}
        </span>
      );
    } else if (isFileConnection) {
      const protocol = node.data?.protocol || node.data?.type || 'sftp';
      const themeIcon = themeIcons[protocol] || iconThemes['material']?.icons?.[protocol];
      
      if (themeIcon) {
        const connectionColor = getThemeDefaultColor(themeKey);
        // Normalizamos primero
        const normalizedIcon = getNormalizedIcon(themeIcon, connectionIconSize, themeKey);
        // Aplicamos colores después
        icon = modifySVGColors(normalizedIcon, connectionColor, themeKey);
      } else {
        icon = <span className="pi pi-folder" style={{ color: '#89b4fa', fontSize: `${connectionIconSize}px` }} />;
      }
    } else if (isFolder) {
      const isFavoritesTreeView = showFavoritesView && viewMode === 'connections';
      if (isFavoritesTreeView) {
        icon = <FolderIconRenderer preset={FolderIconPresets.FAVORITES} pixelSize={folderIconSize} />;
      } else if (node.data?.customIcon && node.data.customIcon !== 'default' && FolderIconPresets[node.data.customIcon.toUpperCase()]) {
        const preset = FolderIconPresets[node.data.customIcon.toUpperCase()];
        icon = <FolderIconRenderer preset={preset} pixelSize={folderIconSize} />;
      } else if (node.folderIcon && node.folderIcon !== 'general' && FolderIconPresets[node.folderIcon.toUpperCase()]) {
        const preset = FolderIconPresets[node.folderIcon.toUpperCase()];
        icon = <FolderIconRenderer preset={preset} pixelSize={folderIconSize} />;
      } else {
        const hasCustomColor = node.color && !isDefaultThemeColor(node.color);
        const folderColor = hasCustomColor ? node.color : getThemeDefaultColor(themeKey);
        const baseIcon = options.expanded ? themeIcons.folderOpen : themeIcons.folder;

        if (baseIcon) {
          const normalizedIcon = getNormalizedIcon(baseIcon, folderIconSize, themeKey);
          icon = modifySVGColors(normalizedIcon, folderColor, themeKey, 0);
        } else {
          icon = <span 
            className={options.expanded ? "pi pi-folder-open" : "pi pi-folder"} 
            style={{ color: folderColor, fontSize: `${folderIconSize}px` }} 
          />;
        }
      }
    } else {
      icon = themeIcons.file;
    }

    // Determinar el título según el tipo de nodo
    let title = "Click derecho para más opciones";
    if (isSSH) {
      title += " | Doble click para abrir terminal SSH";
    } else if (isRDP) {
      title += " | Doble click para conectar RDP";
    } else if (isVNC) {
      title += " | Doble click para conectar VNC";
    } else if (isFileConnection) {
      const protocolLabel = (node.data?.protocol || node.data?.type || 'SFTP').toUpperCase();
      title += ` | Doble click para abrir explorador ${protocolLabel}`;
    }

    // Detectar si tiene icono personalizado (para ajustar alineación del texto)
    const hasCustomFolderIcon = isFolder && node.folderIcon && node.folderIcon !== 'general' && FolderIconPresets[node.folderIcon.toUpperCase()];

    const handleFolderRowClick = (e) => {
      if (!isFolder) return;
      // Evitar conflicto con acciones específicas dentro del nodo (ej: refresh Wallix)
      if (e.target && typeof e.target.closest === 'function' && e.target.closest('.pi-refresh')) return;
      setExpandedKeys((prev) => {
        const current = prev || {};
        const next = { ...current };
        if (next[node.key]) {
          delete next[node.key];
        } else {
          next[node.key] = true;
        }
        return next;
      });
    };

    // Render básico, puedes añadir acciones/contextual aquí
    return (
      <div className="flex align-items-center gap-1"
        onClick={handleFolderRowClick}
        onContextMenu={options.onNodeContextMenu ? (e) => {
          if (isFavoritesRootKey(node.key) || isFavoriteGroupFolderNode(node)) {
            options.onNodeContextMenu(e, node);
            return;
          }
          options.onNodeContextMenu(e, resolveFavoriteShortcutNode(node, nodes));
        } : undefined}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (isSSH && onOpenSSHConnection) {
            onOpenSSHConnection(actionNode, nodes);
          } else if (isRDP && sidebarCallbacksRef?.current?.connectRDP) {
            sidebarCallbacksRef.current.connectRDP(actionNode);
          } else if (isVNC && onOpenVncConnection) {
            onOpenVncConnection(actionNode, nodes);
          } else if (isFileConnection && sidebarCallbacksRef?.current?.openFileConnection) {
            sidebarCallbacksRef.current.openFileConnection(actionNode, nodes);
          } else if (isSSHTunnel && sidebarCallbacksRef?.current?.openSSHTunnel) {
            sidebarCallbacksRef.current.openSSHTunnel(actionNode, nodes);
          }
        }}
        style={{
          cursor: 'pointer',
          fontFamily: explorerFont,
          display: 'flex',
          alignItems: 'center',
          gap: `${Math.max(4, Math.round((folderIconSize || 20) * 0.25))}px`
        }}
        title={title}
        data-connection-type={isSSH ? 'ssh' : (isRDP ? 'rdp' : (isVNC ? 'vnc' : (isSSHTunnel ? 'ssh-tunnel' : null)))}
        data-node-type={isFolder ? 'folder' : 'connection'}
        data-node-key={node.key}
      >
        <span style={{
          minWidth: isFolder ? (folderIconSize || 20) : (connectionIconSize || 20),
          width: isFolder ? (folderIconSize || 20) : (connectionIconSize || 20),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: `${isFolder ? (folderIconSize || 20) : (connectionIconSize || 20)}px`,
          position: 'relative'
        }}>
          {icon}
          {/* Tag SSH superpuesto en la parte derecha inferior - Solo para tema Nodeterm Basic */}
          {isSSH && themeKey === 'nodetermbasic' && (
            <span
              className="ssh-connection-tag"
              style={{
                position: 'absolute',
                bottom: '1px', // Mover a la parte inferior
                right: '-7px', // Mover un poquito más a la derecha
                backgroundColor: '#1a1a1a',
                color: '#42a5f5',
                fontSize: '5px', // Un poquito más grande
                fontWeight: 'bold',
                padding: '0.7px 2.5px', // Un poquito más grande
                borderRadius: '2px',
                border: '0.5px solid #42a5f5', // Borde más fino
                lineHeight: 1,
                zIndex: 10,
                fontFamily: 'monospace',
                letterSpacing: '0.3px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              SSH
            </span>
          )}

          {/* Tag RDP superpuesto en la parte derecha inferior - Solo para tema Nodeterm Basic */}
          {isRDP && themeKey === 'nodetermbasic' && (
            <span
              className="rdp-connection-tag"
              style={{
                position: 'absolute',
                bottom: '1px', // Mover a la parte inferior
                right: '-7px', // Mover un poquito más a la derecha
                backgroundColor: '#1a1a1a',
                color: '#00ffff', // Color azul turquesa muy chillón
                fontSize: '5px', // Un poquito más grande
                fontWeight: 'bold',
                padding: '0.7px 2.5px', // Un poquito más grande
                borderRadius: '2px',
                border: '0.5px solid #00ffff', // Borde azul turquesa muy chillón
                lineHeight: 1,
                zIndex: 10,
                fontFamily: 'monospace',
                letterSpacing: '0.3px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              RDP
            </span>
          )}
        </span>
        <span className="node-label" style={{
          flex: 1,
          marginLeft: (isSSH || isRDP || isVNC) && themeKey === 'nodetermbasic' ? '6px' : '0px',
          margin: 0,
          padding: 0,
          lineHeight: 'normal'
        }}>{node.label}</span>
        {/* Botón de refresco SOLO para la carpeta raíz importada de Wallix (tiene wallixUrl en data) */}
        {node.importedFrom === 'Wallix' && node.droppable && node.data && node.data.wallixUrl ? (
          <span
            className="pi pi-refresh"
            style={{ fontSize: '0.8rem', marginLeft: '6px', cursor: 'pointer', opacity: 0.7 }}
            title="Refrescar conexiones desde Wallix"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenWallixRefresh) onOpenWallixRefresh(node);
            }}
          />
        ) : null}
      </div>
    );
  };
  // Manejador global de drag start para el árbol
  // Esto permite que PrimeReact maneje el drag & drop interno (ordenación, líneas visuales)
  // mientras nosotros inyectamos los datos necesarios para drops externos (terminales)
  const handleExternalDragStart = (e) => {
    // Intentar encontrar el nodo arrastrado buscando la marca data-node-key
    // El e.target suele ser el elemento arrastraable de PrimeReact (fila) o un hijo
    let target = e.target;
    let keyElement = null;

    if (target instanceof Element) {
      if (target.hasAttribute('data-node-key')) {
        keyElement = target;
      } else {
        keyElement = target.querySelector('[data-node-key]');
      }
    }

    if (!keyElement) return;

    const key = keyElement.getAttribute('data-node-key');
    const node = findNodeByKey(nodes, key);

    if (!node) return;

    // Lógica original de detección de tipos
    const isSSH = node.data && node.data.type === 'ssh';
    const isRDP = node.data && node.data.type === 'rdp';
    const isVNC = node.data && (node.data.type === 'vnc' || node.data.type === 'vnc-guacamole');
    const isFileConnection = node.data && (node.data.type === 'sftp' || node.data.type === 'ftp' || node.data.type === 'scp');
    const isSSHTunnel = node.data && node.data.type === 'ssh-tunnel';

    const isDraggableConnection = isSSH || isRDP || isVNC || isFileConnection || isSSHTunnel;

    if (isDraggableConnection) {
      const nodeType = isSSH ? 'ssh' : (isRDP ? 'rdp' : (isVNC ? 'vnc' : (isSSHTunnel ? 'ssh-tunnel' : (isFileConnection ? 'file-connection' : 'unknown'))));

      const connectionNodeData = {
        type: 'connection-node',
        connectionType: nodeType,
        key: node.key,
        label: node.label,
        data: node.data
      };

      // Almacenar en ref global
      if (window.draggedConnectionNodeRef) {
        window.draggedConnectionNodeRef.current = connectionNodeData;
      }

      if (window.draggedSSHNodeRef && isSSH) {
        window.draggedSSHNodeRef.current = {
          type: 'ssh-node',
          key: node.key,
          label: node.label,
          data: node.data
        };
      }

      try {
        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.setData('application/nodeterm-connection', JSON.stringify(connectionNodeData));
        if (isSSH) {
          e.dataTransfer.setData('application/nodeterm-ssh-node', JSON.stringify(connectionNodeData));
        }
      } catch (err) {
        console.warn('Error setting dataTransfer in global handler:', err);
      }
    }
  };


  // ── Determine active tab from viewMode + showFavoritesView ──────────────
  // 'connections' | 'favorites' | 'documents' | 'passwords'
  const activeTab = (() => {
    if (viewMode === 'filesystem' || viewMode === 'localExplorer') return null; // estos modos ocultan las pestañas
    if (viewMode === 'tools') return 'tools';
    if (viewMode === 'documents') return 'documents';
    if (viewMode === 'passwords') return 'passwords';
    if (showFavoritesView) return 'favorites';
    return 'connections';
  })();

  const TB_ICON = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '16px', height: '16px'
  };
  const sessionIcons = sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons;

  const [documentsTreeAllExpanded, setDocumentsTreeAllExpanded] = useState(true);
  const [passwordsTreeAllExpanded, setPasswordsTreeAllExpanded] = useState(false);
  const [toolsTreeAllExpanded, setToolsTreeAllExpanded] = useState(true);

  useEffect(() => {
    const onDocExpandState = (e) => {
      if (typeof e.detail?.allExpanded === 'boolean') setDocumentsTreeAllExpanded(e.detail.allExpanded);
    };
    const onPassExpandState = (e) => {
      if (typeof e.detail?.allExpanded === 'boolean') setPasswordsTreeAllExpanded(e.detail.allExpanded);
    };
    const onToolsExpandState = (e) => {
      if (typeof e.detail?.allExpanded === 'boolean') setToolsTreeAllExpanded(e.detail.allExpanded);
    };
    window.addEventListener('documents-sidebar:expand-state', onDocExpandState);
    window.addEventListener('passwords-sidebar:expand-state', onPassExpandState);
    window.addEventListener('tools-sidebar:expand-state', onToolsExpandState);
    return () => {
      window.removeEventListener('documents-sidebar:expand-state', onDocExpandState);
      window.removeEventListener('passwords-sidebar:expand-state', onPassExpandState);
      window.removeEventListener('tools-sidebar:expand-state', onToolsExpandState);
    };
  }, []);

  const toolbarAllExpanded = activeTab === 'documents'
    ? documentsTreeAllExpanded
    : activeTab === 'passwords'
      ? passwordsTreeAllExpanded
      : activeTab === 'tools'
        ? toolsTreeAllExpanded
        : allExpanded;

  const handleToolbarExpandAll = useCallback(() => {
    if (activeTab === 'documents') {
      window.dispatchEvent(new CustomEvent('documents-sidebar:toggle-expand-all'));
    } else if (activeTab === 'passwords') {
      window.dispatchEvent(new CustomEvent('passwords-sidebar:toggle-expand-all'));
    } else if (activeTab === 'tools') {
      window.dispatchEvent(new CustomEvent('tools-sidebar:toggle-expand-all'));
    } else if (activeTab === 'connections' || activeTab === 'favorites') {
      toggleExpandAll();
    }
  }, [activeTab, toggleExpandAll]);

  const showToolbarExpandAll = activeTab === 'connections'
    || activeTab === 'favorites'
    || activeTab === 'documents'
    || activeTab === 'passwords'
    || activeTab === 'tools';

  const createTabGroupBtn = (
    <button
      type="button"
      className="sidebar-panel-toolbar-btn"
      onClick={() => setShowCreateGroupDialog(true)}
      title={t('tooltips.createGroup')}
    >
      <span style={TB_ICON}>{sessionIcons?.newGroup}</span>
    </button>
  );

  // ── Panel Toolbar Header (acciones fijas por sección) ─────────────────
  const newNoteIcon = sessionIcons?.newDocument ?? newDocumentToolbarIcon;

  const panelToolbarHeader = (activeTab !== null) && (
    <div className="sidebar-panel-toolbar">
      <div className="sidebar-panel-toolbar-left">
        {/* ── CONEXIONES ── */}
        {activeTab === 'connections' && (<>
          <button
            type="button"
            className="sidebar-panel-toolbar-btn"
            onClick={() => {
              if (sidebarCallbacksRef?.current?.showProtocolSelection) {
                sidebarCallbacksRef.current.showProtocolSelection();
              } else {
                window.dispatchEvent(new CustomEvent('open-new-unified-connection-dialog'));
              }
            }}
            title={t('tooltips.newConnection')}
          >
            <span style={TB_ICON}>{sessionIcons?.newConnection}</span>
          </button>
          <button
            type="button"
            className="sidebar-panel-toolbar-btn"
            onClick={() => { setParentNodeKey(null); setEditingNode(null); setShowFolderDialog(true); }}
            title={t('tooltips.createFolder')}
          >
            <span style={TB_ICON}>{sessionIcons?.newFolder}</span>
          </button>
          {createTabGroupBtn}
        </>)}

        {/* ── FAVORITOS ── */}
        {activeTab === 'favorites' && (<>
          <button
            type="button"
            className="sidebar-panel-toolbar-btn"
            onClick={() => { setParentNodeKey(FAVORITES_ROOT_KEY); setEditingNode(null); setShowFolderDialog(true); }}
            title={t('tooltips.createFolder')}
          >
            <span style={TB_ICON}>{sessionIcons?.newFolder}</span>
          </button>
          {createTabGroupBtn}
        </>)}

        {/* ── NOTAS ── */}
        {activeTab === 'documents' && (<>
          <button
            type="button"
            className="sidebar-panel-toolbar-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('documents-sidebar:new-doc'))}
            title="Nueva nota"
          >
            <span style={TB_ICON}>{newNoteIcon}</span>
          </button>
          <button
            type="button"
            className="sidebar-panel-toolbar-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('documents-sidebar:new-folder'))}
            title={t('tooltips.createFolder')}
          >
            <span style={TB_ICON}>{sessionIcons?.newFolder}</span>
          </button>
          {createTabGroupBtn}
        </>)}

        {/* ── SECRETOS ── */}
        {activeTab === 'passwords' && (<>
          <button
            type="button"
            className="sidebar-panel-toolbar-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('open-new-unified-connection-dialog', { detail: { initialCategory: 'secrets' } }))}
            title="Nuevo secreto"
          >
            <span style={TB_ICON}>{sessionIcons?.newConnection}</span>
          </button>
          <button
            type="button"
            className="sidebar-panel-toolbar-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('passwords-sidebar:new-folder'))}
            title={t('tooltips.createFolder')}
          >
            <span style={TB_ICON}>{sessionIcons?.newFolder}</span>
          </button>
          {createTabGroupBtn}
        </>)}
      </div>
      <div className="sidebar-panel-toolbar-right">
        <SidebarUpdateIndicator
          onConfigClick={() => setShowSettingsDialog(true)}
        />
        <span className="sidebar-panel-toolbar-right-spacer" aria-hidden="true" />
        <div className="sidebar-panel-toolbar-right-end">
          {showToolbarExpandAll && (
            <button
              type="button"
              className="sidebar-panel-toolbar-btn"
              onClick={handleToolbarExpandAll}
              title={toolbarAllExpanded ? t('tooltips.collapseAll') : t('tooltips.expandAll')}
            >
              <span style={TB_ICON}>
                {toolbarAllExpanded ? sessionIcons?.collapseAll : sessionIcons?.expandAll}
              </span>
            </button>
          )}
          {activeTab !== null && setTreeTheme && (
            <SidebarAppearanceMenu
              treeTheme={treeTheme}
              setTreeTheme={setTreeTheme}
              sessionActionIconTheme={sessionActionIconTheme}
              setSessionActionIconTheme={setSessionActionIconTheme}
              tooltip="Apariencia del árbol"
            />
          )}
        </div>
      </div>
    </div>
  );

  const fullSidebar = (
    // Sidebar completa
    <>
      {/* Panel toolbar header with contextual actions */}
      {panelToolbarHeader}

      {/* Vista de Conexiones (Mantenida montada para evitar flashes) */}
      <div style={{ display: viewMode === 'connections' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div
          ref={treeContainerRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'hidden',
            overflowX: 'auto',
            position: 'relative',
            fontSize: `${explorerFontSize}px`,
            color: explorerFontColor || undefined,
            ...(explorerFontColor ? { '--ui-sidebar-text': explorerFontColor } : {})
          }}
          onContextMenu={onTreeAreaContextMenu}
          className="tree-container"
          onDragStart={handleExternalDragStart}
          onDragOver={handleTreeContainerDragOver}
          onDragLeave={handleTreeContainerDragLeave}
          onDrop={stopTreeDragAutoScroll}
        >
          {isLoading ? (
            <SidebarSkeleton />
          ) : !hasRenderableTreeNodes ? (
            <div className="empty-tree-message" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
              {showFavoritesView
                ? (totalFavoriteShortcutCount === 0
                  ? t('messages.favoritesEmpty')
                  : t('messages.favoritesFilteredEmpty'))
                : (
                  <>
                    No hay elementos en el árbol.<br />Usa el botón &quot;+&quot; para crear una carpeta o conexión.
                  </>
                )}
            </div>
          ) : (
            <Tree
              key={`tree-${iconTheme}-${explorerFontSize}-${treeTheme}-${explorerFontColor || 'default'}-${folderIconSize}-${iconSize}-${showFavoritesView ? 'favorites' : 'all'}`} // Forzar re-render cuando cambie el tema o el tamaño de iconos
              value={displayNodes}
              selectionMode="single"
              selectionKeys={selectedNodeKey}
              onSelectionChange={e => {
                setSelectedNodeKey(e.value);

                // Encontrar el nodo completo para el panel de detalles
                const findNode = (nodeList, key) => {
                  for (const node of nodeList) {
                    if (node.key === key) return node;
                    if (node.children) {
                      const found = findNode(node.children, key);
                      if (found) return found;
                    }
                  }
                  return null;
                };

                // e.value puede ser un objeto { "key": true } o directamente un string "key"
                let selectedKey = null;
                if (typeof e.value === 'string') {
                  selectedKey = e.value;
                } else if (e.value && typeof e.value === 'object') {
                  selectedKey = Object.keys(e.value)[0];
                }

                const node = selectedKey ? findNode(displayNodes, selectedKey) : null;
                setSelectedNodeForDetails(node ? resolveFavoriteShortcutNode(node, nodes) : null);
              }}
              expandedKeys={expandedKeys}
              onToggle={e => setExpandedKeys(e.value)}
              dragdropScope="sidebar"
              onDragDrop={onDragDrop}
              onDragEnd={() => {
                stopTreeDragAutoScroll();
                // Limpiar el nodo SSH arrastrado al finalizar el drag
                if (window.draggedSSHNodeRef) {
                  window.draggedSSHNodeRef.current = null;
                }
              }}
              className={`sidebar-tree tree-theme-${treeTheme}${showFavoritesView && viewMode === 'connections' ? ' sidebar-tree-favorites-view' : ''}`}
              data-icon-theme={iconTheme}
              data-tree-theme={treeTheme}
              data-font-color={explorerFontColor || ''}
              style={{
                height: '100%',
                overflow: 'auto',
                fontSize: `${explorerFontSize}px`,
                color: explorerFontColor || undefined,
                '--icon-size': `${iconSize}px`,
                '--sidebar-icon-size': `${folderIconSize || 20}px`,
                '--tree-node-padding': '2px 0',
                ...(explorerFontColor ? {
                  '--ui-sidebar-text': explorerFontColor,
                  '--tree-text-color': explorerFontColor
                } : {})
              }}
              nodeTemplate={(node, options) => nodeTemplate(node, { ...options, onNodeContextMenu })}
            />
          )}
        </div>

        {/* Panel de detalles de conexión */}
        <ConnectionDetailsPanel
          selectedNode={selectedNodeForDetails}
          uiTheme={uiTheme}
          iconTheme={iconTheme}
          sessionActionIconTheme={sessionActionIconTheme}
          onNodeUpdate={updateNodeInTree}
          onOpenSSHConnection={onOpenSSHConnection}
          onOpenVncConnection={onOpenVncConnection}
        />
      </div>

      {/* Vista de Passwords (Mantenida montada para evitar flashes de descifrado scrypt) */}
      <div style={{ display: viewMode === 'passwords' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Suspense fallback={<TabChunkFallback />}>
          <LazyPasswordManagerSidebar
            nodes={nodes}
            setNodes={setNodes}
            showToast={showToast}
            confirmDialog={confirmDialog}
            uiTheme={uiTheme}
            onBackToConnections={() => setViewMode('connections')}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            iconTheme={iconTheme}
            iconSize={iconSize}
            folderIconSize={folderIconSize}
            connectionIconSize={connectionIconSize}
            explorerFont={explorerFont}
            explorerFontSize={explorerFontSize}
            masterKey={masterKey}
            secureStorage={secureStorage}
            setShowSettingsDialog={setShowSettingsDialog}
            onShowImportDialog={setShowImportDialog}
            sessionActionIconTheme={sessionActionIconTheme}
            sidebarFilter={sidebarFilter}
            treeTheme={treeTheme}
            showFavoritesView={showFavoritesView}
            onToggleFavoritesView={toggleFavoritesView}
            hideHeader={true}
          />
        </Suspense>
      </div>

      {/* Vista de Documents (Mantenida montada para consistencia y cero lag) */}
      <div style={{ display: viewMode === 'documents' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Suspense fallback={<TabChunkFallback />}>
          <LazyDocumentsSidebar
            showToast={showToast}
            confirmDialog={confirmDialog}
            uiTheme={uiTheme}
            onBackToConnections={() => setViewMode('connections')}
            onOpenPasswords={() => setViewMode('passwords')}
            showFavoritesView={showFavoritesView}
            onToggleFavoritesView={toggleFavoritesView}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            explorerFont={explorerFont}
            explorerFontSize={explorerFontSize}
            masterKey={masterKey}
            secureStorage={secureStorage}
            sessionActionIconTheme={sessionActionIconTheme}
            sidebarFilter={sidebarFilter}
            treeTheme={treeTheme}
            setShowSettingsDialog={setShowSettingsDialog}
            onShowImportDialog={onShowImportDialog || setShowImportDialog}
            onShowExportDialog={onShowExportDialog}
            onShowImportExportDialog={onShowImportExportDialog}
            onShowImportWizard={onShowImportWizard}
            hideHeader={true}
          />
        </Suspense>
      </div>

      {/* Otras vistas dinámicas que no requieren persistencia de estado de carga */}
      {viewMode === 'filesystem' && (
        <SidebarFilesystemExplorer
          status={filesystemStatus}
          onBackToConnections={() => setViewMode('connections')}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          explorerFont={explorerFont}
          explorerFontSize={explorerFontSize}
          uiTheme={uiTheme}
          showToast={showToast}
          sessionActionIconTheme={sessionActionIconTheme}
          initialPath={initialFilesystemPath}
          onPathNavigated={() => setInitialFilesystemPath(null)}
        />
      )}

      {viewMode === 'localExplorer' && (
        <Suspense fallback={<TabChunkFallback />}>
          <LazyLocalFileExplorerSidebar
            initialPath={localExplorerPath}
            onBackToConnections={() => {
              setViewMode('connections');
              setLocalExplorerPath(null);
            }}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            explorerFont={explorerFont}
            explorerFontSize={explorerFontSize}
            uiTheme={uiTheme}
            showToast={showToast}
            setShowSettingsDialog={setShowSettingsDialog}
            sessionActionIconTheme={sessionActionIconTheme}
            iconTheme={iconTheme}
            iconSize={iconSize}
            folderIconSize={folderIconSize}
          />
        </Suspense>
      )}

      {viewMode === 'tools' && (
        <Suspense fallback={<TabChunkFallback />}>
          <LazyToolsSidebar
            onOpenTool={(toolId, toolLabel) => {
              window.dispatchEvent(new CustomEvent('open-network-tool', {
                detail: { toolId, toolLabel }
              }));
            }}
          />
        </Suspense>
      )}
      
    </>
  );

  const handleIconRailSectionClick = useCallback((sectionId) => {
    if (sectionId === 'favorites') {
      if (!sidebarCollapsed && showFavoritesView && viewMode === 'connections') {
        setSidebarCollapsed(true);
      } else {
        setViewMode('connections');
        setShowFavoritesView(true);
        setSidebarCollapsed(false);
      }
      return;
    }

    const sectionToViewMode = {
      connections: 'connections',
      passwords: 'passwords',
      documents: 'documents',
      tools: 'tools',
    };
    const targetViewMode = sectionToViewMode[sectionId] || 'connections';

    if (!sidebarCollapsed && viewMode === targetViewMode && (sectionId !== 'connections' || !showFavoritesView)) {
      setSidebarCollapsed(true);
    } else {
      setViewMode(targetViewMode);
      if (sectionId === 'connections') setShowFavoritesView(false);
      setSidebarCollapsed(false);
    }
  }, [sidebarCollapsed, viewMode, showFavoritesView, setSidebarCollapsed]);

  const handleOpenAIClient = useCallback((clientId) => {
    const openers = {
      opencode: openOpenCodeTab,
      geminicli: openGeminiCliTab,
      codexcli: openCodexCliTab,
      claude: openClaudeTab,
      nodeterm: () => {
        const newAITab = {
          key: `ai-chat-${Date.now()}`,
          label: 'Chat IA',
          type: 'ai-chat',
          createdAt: Date.now(),
          groupId: null
        };
        window.dispatchEvent(new CustomEvent('create-ai-tab', { detail: { tab: newAITab } }));
      },
      anythingllm: openAnythingLLMTab,
      openwebui: openOpenWebUITab,
      librechat: openLibreChatTab,
      agentzero: openAgentZeroTab,
      openclaw: openOpenClawTab,
      opennotebook: openOpenNotebookTab,
    };
    if (openers[clientId]) openers[clientId]();
  }, []);

  const handleFilesystemClick = useCallback(() => {
    setViewMode('filesystem');
    setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  const activeIconRailSection = (() => {
    if (sidebarCollapsed) return null;
    if (viewMode === 'documents') return 'documents';
    if (viewMode === 'passwords') return 'passwords';
    if (viewMode === 'tools') return 'tools';
    if (showFavoritesView && viewMode === 'connections') return 'favorites';
    if (viewMode === 'connections') return 'connections';
    return null;
  })();

  return (
    <div
      ref={sidebarRef}
      className="sidebar-container sidebar-root"
      style={{
        padding: 0,
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        fontFamily: explorerFont,
        fontSize: `${explorerFontSize}px`,
        color: explorerFontColor || undefined,
        width: '100%',
        ...(explorerFontColor ? { '--ui-sidebar-text': explorerFontColor } : {})
      }}>

      {/* Icon Rail - Always visible */}
      <SidebarIconRail
        activeSection={activeIconRailSection}
        panelOpen={!sidebarCollapsed}
        onSectionClick={handleIconRailSectionClick}
        onSettingsClick={() => setShowSettingsDialog(true)}
        sessionActionIconTheme={sessionActionIconTheme}
        aiClientsEnabled={aiClientsEnabled}
        onOpenAIClient={handleOpenAIClient}
        filesystemAvailable={filesystemAvailable}
        isAIChatActive={isAIChatActive}
        onFilesystemClick={handleFilesystemClick}
        viewMode={viewMode}
        onToggleLocalTerminalForAIChat={isAIChatActive ? onToggleLocalTerminalForAIChat : undefined}
        onShowImportDialog={onShowImportDialog || setShowImportDialog}
        onShowExportDialog={onShowExportDialog}
        onShowImportExportDialog={onShowImportExportDialog}
        onShowImportWizard={onShowImportWizard}
      />

      {/* Panel - Collapsible content area */}
      <div
        className={`sidebar-panel${sidebarCollapsed ? ' sidebar-panel-collapsed' : ''}`}
        style={sidebarCollapsed ? {
          flex: '0 0 0px',
          width: 0,
          minWidth: 0,
          maxWidth: 0,
          opacity: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          border: 'none',
          padding: 0,
        } : {
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '100%',
          transition: 'flex 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
        }}>
        {fullSidebar}
      </div>


      <FolderDialog
        visible={showFolderDialog}
        onHide={() => {
          setShowFolderDialog(false);
          setFolderName('');
          setFolderColor(getThemeDefaultColor(iconTheme?.toLowerCase() || 'nord'));
          setFolderIcon(null);
          setEditingNode(null); // Limpiar estado de edición al cerrar
        }}
        mode={editingNode ? "edit" : "new"}
        folderName={folderName}
        setFolderName={setFolderName}
        folderColor={folderColor}
        setFolderColor={setFolderColor}
        folderIcon={folderIcon}
        setFolderIcon={setFolderIcon}
        onConfirm={createNewFolder}
        themeDefaultColor={getThemeDefaultColor(iconTheme?.toLowerCase() || 'nord')}
        themeName={iconThemes[iconTheme?.toLowerCase()]?.name || 'Material'}
      />
      {/* Los diálogos de edición SSH y RDP ahora se manejan en DialogsManager */}



      {showImportDialog && (
        <Suspense fallback={null}>
          <LazyImportDialog
            visible={showImportDialog}
            onHide={() => setShowImportDialog(false)}
            onImportComplete={handleImportComplete}
            showToast={showToast}
          />
        </Suspense>
      )}

    </div>
  );
});

export default Sidebar; 