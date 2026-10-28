import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { Tree } from 'primereact/tree';
import LibraryAddMenu from './library/LibraryAddMenu';
import SidebarUpdateIndicator from './SidebarUpdateIndicator';
import SidebarAppearanceMenu from './SidebarAppearanceMenu';
import VaultLayoutMenu from './vault/VaultLayoutMenu';
import { readSavedVaultLayout, isVaultLayout } from './vault/vaultLayoutModes';
import NotesLayoutMenu from './notes/NotesLayoutMenu';
import { readSavedNotesLayout, isNotesLayout } from './notes/notesLayoutModes';
import ConnectionsLayoutMenu from './connections/ConnectionsLayoutMenu';
import ConnectionsBrowser from './connections/ConnectionsBrowser';
import {
  CONNECTIONS_LAYOUT_STORAGE_KEY,
  isConnectionsLayout,
  readSavedConnectionsLayout
} from './connections/connectionsLayoutModes';
import { findFolderPath, isConnectionFolder } from './connections/connectionsBrowse';
import { iconThemes, ensureIconTheme, onIconThemeLoaded } from '../themes/icon-themes';
import { FolderIconRenderer, FolderIconPresets } from './FolderIconSelector';
import { SSHIconRenderer, SSHIconPresets } from './SSHIconSelector';
import {
  sessionActionIconThemes,
  getDefaultSessionActionIconTheme,
  newDocumentToolbarIcon,
  ensureSessionActionIconTheme,
  onSessionActionIconThemeLoaded
} from '../themes/session-action-icons';
import ConnectionDetailsPanel from './ConnectionDetailsPanel';
import SidebarIconRail from './SidebarIconRail';
import { TabChunkFallback } from './tabLoaders';

const LazyImportDialog = React.lazy(() => import('./ImportDialog'));
const LazyFolderDialog = React.lazy(() =>
  import('./Dialogs').then((m) => ({ default: m.FolderDialog }))
);
const LazyPasswordManagerSidebar = React.lazy(() => import('./PasswordManagerSidebar'));
const LazyDocumentsSidebar = React.lazy(() => import('./DocumentsSidebar'));
const LazyLocalFileExplorerSidebar = React.lazy(() => import('./LocalFileExplorerSidebar'));
const LazyToolsSidebar = React.lazy(() => import('./ToolsSidebar'));
const LazySettingsSidebar = React.lazy(() => import('./SettingsSidebar'));
import { unblockAllInputs, detectBlockedInputs } from '../utils/formDebugger';
import { getFavorites, isFavorite, onUpdate as onFavoritesUpdate, removeFavorite } from '../utils/connectionStore';
import favoriteGroupsStore from '../utils/favoriteGroupsStore';
import { buildSidebarFontStack } from '../utils/sidebarFontStack';
import { setSidebarView } from '../utils/sidebarViewBus';
import { getHomeTabActive } from '../utils/homeTabActiveBus';
import { appConfirm } from './ui/AppConfirm';
import {
  FAVORITES_ROOT_KEY,
  applyFavoritesDragDropFromEvent,
  buildFavoritesSidebarTree,
  countFavoriteShortcuts,
  filterFavoritesTree,
  getDefaultFavoritesExpandedKeys,
  getFavoritesTreeDisplayNodes,
  getFavoriteGroupIdFromKey,
  isFavoriteGroupFolderKey,
  isFavoriteGroupFolderNode,
  getFavoriteIdFromShortcutKey,
  isFavoriteShortcutKey,
  isFavoriteShortcutNode,
  isFavoritesRootKey,
  onFavoriteSourceTreesUpdate,
  resolveFavoriteShortcutNode
} from '../utils/favoritesSidebarTree';
import { createAppMenu, createContextMenu } from '../utils/appMenuUtils';
import {
  findNodeInTree,
  isDescendantInFullTree,
  isShowMoreTreeNode,
  isTreeFolderNode,
  moveNodeFromTreeEvent
} from '../utils/treeDragDrop';
import { useTranslation } from '../i18n/hooks/useTranslation';
import '../styles/components/tree-themes.css';
import SidebarSkeleton from './sidebar/SidebarSkeleton';
import { getCachedIcon, clearSidebarIconCaches } from './sidebar/iconCache';
import {
  modifySVGColors,
  isDefaultThemeColor,
  getThemeDefaultColor
} from './sidebar/svgColorUtils';
import { openAIClientById } from './sidebar/openAIClientTabs';
import { useSidebarTrash } from './sidebar/useSidebarTrash';
import SidebarTrashModal from './sidebar/SidebarTrashModal';
import { useSidebarSectionAppearance } from '../hooks/useSidebarSectionAppearance';
import { useTreeDragHoverExpand } from '../hooks/useTreeDragHoverExpand';
import {
  SIDEBAR_APPEARANCE_SECTIONS,
  SIDEBAR_SECTION_LABELS
} from '../utils/sidebarSectionAppearance';

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
  setIconTheme,
  iconSize = 20,
  setIconSize,
  folderIconSize = 20,
  connectionIconSize = 20,
  explorerFont,
  setExplorerFont,
  explorerFontSize = 14,
  setExplorerFontSize,
  explorerFontColor,
  setExplorerFontColor,
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

  // Props para conexiones (estado de formularios SSH/RDP vive en App/diálogos)
  openEditSSHDialog,

  // Encriptación
  masterKey,
  secureStorage,


  // Filtro de búsqueda desde TitleBar
  sidebarFilter = '',

  // Tema del árbol
  treeTheme = 'cursorCompact',
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
  onOpenWallixRefresh,  // callback para refrescar carpetas importadas de Wallix
  openSessionNodeKeys = new Set(),
  isTransitioningSidebar = false,
  onSyncActiveEditTab
}) => {
  // Hook de internacionalización
  const { t } = useTranslation('common');
  const sectionAppearance = useSidebarSectionAppearance({ treeTheme, iconTheme });

  // Limpiar caché de iconos cuando cambian temas o tamaños de iconos para evitar fugas de memoria o iconos obsoletos
  useEffect(() => {
    clearSidebarIconCaches();
  }, [sectionAppearance.resolve, folderIconSize, connectionIconSize]);

  // Lazy icon packs: ensure each section's theme chunk, then re-render trees when it arrives
  const [iconThemePackVersion, setIconThemePackVersion] = useState(0);
  useEffect(() => {
    SIDEBAR_APPEARANCE_SECTIONS.forEach((sectionId) => {
      ensureIconTheme(sectionAppearance.resolve(sectionId).iconTheme);
    });
  }, [sectionAppearance.resolve]);
  useEffect(() => {
    return onIconThemeLoaded((id) => {
      const wanted = SIDEBAR_APPEARANCE_SECTIONS.map((sectionId) => (
        (sectionAppearance.resolve(sectionId).iconTheme || 'nord').toLowerCase()
      ));
      if (!wanted.includes(id.toLowerCase())) return;
      clearSidebarIconCaches();
      setIconThemePackVersion((v) => v + 1);
    });
  }, [sectionAppearance.resolve]);
  void iconThemePackVersion;

  const [sessionActionPackVersion, setSessionActionPackVersion] = useState(0);
  useEffect(() => {
    ensureSessionActionIconTheme(sessionActionIconTheme);
  }, [sessionActionIconTheme]);
  useEffect(() => {
    return onSessionActionIconThemeLoaded((id) => {
      if ((sessionActionIconTheme || 'modern') !== id) return;
      setSessionActionPackVersion((v) => v + 1);
    });
  }, [sessionActionIconTheme]);
  void sessionActionPackVersion;



  // Estado para diálogos
  const [showFolderDialog, setShowFolderDialog] = useState(false);

  // ── Papelera de conexiones ──────────────────────────────────────────────────
  const {
    showTrashModal,
    setShowTrashModal,
    trashedConnections,
    trashConfirm,
    setTrashConfirm,
    moveToTrash,
    restoreFromTrash,
    deleteFromTrashPermanently,
    emptyTrash,
    executeTrashConfirm,
    closeTrashModal,
  } = useSidebarTrash({ setNodes, showToast });
  // ────────────────────────────────────────────────────────────────────────────

  // Estado para modo de visualización (conexiones, passwords, localExplorer, tools)
  const [viewMode, setViewMode] = useState('connections'); // 'connections' | 'passwords' | 'documents' | 'localExplorer' | 'tools' | 'settings'
  const [showFavoritesView, setShowFavoritesView] = useState(false);
  const connectionsAppearance = sectionAppearance.resolve('connections');
  const favoritesAppearance = sectionAppearance.resolve('favorites');
  const passwordsAppearance = sectionAppearance.resolve('passwords');
  const documentsAppearance = sectionAppearance.resolve('documents');
  const toolsAppearance = sectionAppearance.resolve('tools');
  const settingsAppearance = sectionAppearance.resolve('settings');
  const viewingFavoritesTree = showFavoritesView && viewMode === 'connections';
  const activeTreeAppearance = viewingFavoritesTree ? favoritesAppearance : connectionsAppearance;
  const [favoritesRevision, setFavoritesRevision] = useState(0);
  // Keep-alive: once visited (or idle-warmed), keep mounted with display:none — instant like connections
  const [mountedSidebarViews, setMountedSidebarViews] = useState(() => new Set());

  useEffect(() => {
    setSidebarView(viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'connections') return;
    setMountedSidebarViews((prev) => {
      if (prev.has(viewMode)) return prev;
      const next = new Set(prev);
      next.add(viewMode);
      return next;
    });
  }, [viewMode]);

  // Límites de visualización de hijos por carpeta para optimizar renderizado de directorios muy grandes
  const [folderLimits, setFolderLimits] = useState({});

  const limitTreeNodes = useCallback((treeNodes) => {
    if (!treeNodes) return [];
    
    return treeNodes.map(node => {
      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      if (hasChildren) {
        // Optimización clave: si la carpeta está colapsada, no procesamos sus hijos en el DOM virtual.
        // Esto reduce drásticamente el tamaño del árbol en render y diffing de React.
        const isExpanded = allExpanded || (expandedKeys && expandedKeys[node.key] === true);
        if (!isExpanded) {
          return {
            ...node,
            leaf: false,
            children: []
          };
        }

        const totalChildren = node.children.length;
        const currentLimit = folderLimits[node.key] || 30;
        
        // Slicing first to keep recursion extremely fast and avoid rendering non-visible nodes
        const visibleChildren = node.children.slice(0, currentLimit);
        const processedChildren = limitTreeNodes(visibleChildren);
        
        if (totalChildren > currentLimit) {
          processedChildren.push({
            key: `${node.key}-show-more`,
            label: `Mostrar más (${currentLimit} de ${totalChildren})...`,
            icon: 'pi pi-plus',
            data: { isShowMoreBtn: true, parentKey: node.key, targetLimit: currentLimit + 100 },
            droppable: false,
            selectable: false,
            style: { color: '#89b4fa', fontStyle: 'italic', cursor: 'pointer' }
          });
        }
        
        return {
          ...node,
          children: processedChildren
        };
      }
      return node;
    });
  }, [folderLimits, allExpanded, expandedKeys]);

  // Estado para el nodo seleccionado actualmente (para el panel de detalles)
  const [selectedNodeForDetails, setSelectedNodeForDetails] = useState(null);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const detailsPanelTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (detailsPanelTimeoutRef.current) {
        clearTimeout(detailsPanelTimeoutRef.current);
      }
    };
  }, []);

  const isDetailsPanelVisible = useMemo(() => {
    if (!selectedNodeForDetails) return false;
    return !!(selectedNodeForDetails.data || selectedNodeForDetails.droppable);
  }, [selectedNodeForDetails]);

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
  const [localExplorerPath, setLocalExplorerPath] = useState(null);

  // Refs de rendimiento: evitar trabajo repetido durante transiciones/resize
  const sshSyncHandleRef = useRef(null); // idle callback id o timeout id
  const sidebarResizeRafRef = useRef(null);
  const sidebarResizeWidthRef = useRef(null);
  const expandedContentRef = useRef(null);
  const treeContainerRef = useRef(null);
  const dragAutoScrollRafRef = useRef(null);
  const dragAutoScrollSpeedRef = useRef(0);
  const dragAutoScrollActiveRef = useRef(false);

  const {
    noteDragStartKey,
    handleDragHoverExpandOver,
    handleDragHoverExpandLeave,
    clearDragHoverExpand
  } = useTreeDragHoverExpand({ expandedKeys, setExpandedKeys });

  const hasWarmedUpRef = useRef(false);
  const hasEverExpandedRef = useRef(!sidebarCollapsed);
  // Asentar layout en toda expansión (incluida la primera) sin animar el splitter
  const [isLayoutSettling, setIsLayoutSettling] = useState(false);
  const [isFirstExpandNoTransition, setIsFirstExpandNoTransition] = useState(false);
  const firstExpandSettledRef = useRef(!sidebarCollapsed);

  // Al expandir: anclar minWidth y congelar compactación ~250ms (antes del paint)
  useLayoutEffect(() => {
    if (sidebarCollapsed) {
      setIsLayoutSettling(false);
      setIsFirstExpandNoTransition(false);
      return;
    }

    const isFirstExpand = !firstExpandSettledRef.current;
    if (isFirstExpand) {
      firstExpandSettledRef.current = true;
      setIsFirstExpandNoTransition(true);
    }

    setIsLayoutSettling(true);
    const timer = setTimeout(() => {
      setIsLayoutSettling(false);
      setIsFirstExpandNoTransition(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [sidebarCollapsed]);

  // Tras cargar conexiones: montar notas/pass/tools en idle (display:none) para cambio instantáneo.
  useEffect(() => {
    if (!sidebarCollapsed) {
      hasEverExpandedRef.current = true;
      firstExpandSettledRef.current = true;
    }
    if (isLoading || hasWarmedUpRef.current) {
      return;
    }
    hasWarmedUpRef.current = true;

    const warmSecondarySidebars = () => {
      import('./PasswordManagerSidebar').catch(() => {});
      import('./DocumentsSidebar').catch(() => {});
      import('./ToolsSidebar').catch(() => {});
      import('./LocalFileExplorerSidebar').catch(() => {});
      import('./SettingsSidebar').catch(() => {});
      setMountedSidebarViews((prev) => {
        const next = new Set(prev);
        next.add('passwords');
        next.add('documents');
        next.add('tools');
        return next;
      });
    };

    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(warmSecondarySidebars, { timeout: 800 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(warmSecondarySidebars, 0);
    return () => clearTimeout(t);
  }, [sidebarCollapsed, isLoading]);

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

  // Mantener el panel de configuración visible al elegir una sección
  useEffect(() => {
    const handleOpenSettingsTab = () => {
      setViewMode('settings');
      setSidebarCollapsed(false);
    };

    window.addEventListener('open-settings-tab', handleOpenSettingsTab);
    return () => {
      window.removeEventListener('open-settings-tab', handleOpenSettingsTab);
    };
  }, [setSidebarCollapsed]);

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

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState(() => getThemeDefaultColor((connectionsAppearance.iconTheme || 'nord').toLowerCase()));
  const [folderIcon, setFolderIcon] = useState(null);
  const [parentNodeKey, setParentNodeKey] = useState(null);
  const [editingNode, setEditingNode] = useState(null); // Para saber si estamos editando un nodo existente

  // Actualizar color por defecto cuando cambie el tema
  useEffect(() => {
    const newDefaultColor = getThemeDefaultColor((connectionsAppearance.iconTheme || 'nord').toLowerCase());
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

  }, [connectionsAppearance.iconTheme, setNodes]);

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
    browser: true,
    claude: false,
    opencode: false,
    codexcli: false,
    antigravitycli: false,
    hermescli: false,
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
            browser: parsed.browser !== false,
            claude: parsed.claude === true,
            opencode: parsed.opencode === true,
            codexcli: parsed.codexcli === true,
            antigravitycli: parsed.antigravitycli === true,
            hermescli: parsed.hermescli === true,
            anythingllm: parsed.anythingllm === true,
            openwebui: parsed.openwebui === true,
            librechat: parsed.librechat === true,
            agentzero: parsed.agentzero === true,
            openclaw: parsed.openclaw === true,
            opennotebook: parsed.opennotebook === true
          });
        } else {
          // Sin config: IA off; navegador ON por defecto
          setAiClientsEnabled({
            browser: true,
            claude: false,
            opencode: false,
            codexcli: false,
            antigravitycli: false,
            hermescli: false,
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

    // Misma pestaña: preferir detail.config para no depender de un re-read
    const handleConfigChange = (e) => {
      const cfg = e?.detail?.config;
      if (cfg && typeof cfg === 'object') {
        setAiClientsEnabled({
          browser: cfg.browser !== false,
          claude: cfg.claude === true,
          opencode: cfg.opencode === true,
          codexcli: cfg.codexcli === true,
          antigravitycli: cfg.antigravitycli === true,
          hermescli: cfg.hermescli === true,
          anythingllm: cfg.anythingllm === true,
          openwebui: cfg.openwebui === true,
          librechat: cfg.librechat === true,
          agentzero: cfg.agentzero === true,
          openclaw: cfg.openclaw === true,
          opennotebook: cfg.opennotebook === true
        });
        return;
      }
      loadAIClientsConfig();
    };
    window.addEventListener('ai-clients-config-changed', handleConfigChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ai-clients-config-changed', handleConfigChange);
    };
  }, []);

  // Ref para el contenedor de la sidebar
  const sidebarRef = useRef(null);

  // Función para manejar el menú de aplicación (unificada)
  const handleAppMenuClick = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    // Usar los callbacks pasados como props, o el estado local como fallback
    const importCallback = onShowImportDialog || setShowImportDialog;
    const exportCallback = onShowExportDialog || (() => console.warn('onShowExportDialog no disponible'));
    const importExportCallback = onShowImportExportDialog || (() => console.warn('onShowImportExportDialog no disponible'));
    const wizardCallback = onShowImportWizard || (() => console.warn('onShowImportWizard no disponible'));
    const menuStructure = createAppMenu(importCallback, exportCallback, importExportCallback, t, wizardCallback);
    createContextMenu(event, menuStructure, 'app-context-menu-sidebar');
  }, [onShowImportDialog, setShowImportDialog, onShowExportDialog, onShowImportExportDialog, onShowImportWizard, t]);

  // Compactación progresiva al redimensionar (iconos fijos, texto/acciones se desvanecen con transición)
  useEffect(() => {
    if (!sidebarRef.current || sidebarCollapsed) {
      sidebarResizeWidthRef.current = null;
      sidebarRef.current?.style.removeProperty('--sidebar-compact');
      sidebarRef.current?.style.removeProperty('--sidebar-panel-width');
      sidebarRef.current?.classList.remove('sidebar-width-tiny', 'sidebar-width-narrow');
      return;
    }

    const sidebarElement = sidebarRef.current;
    const panelElement = expandedContentRef.current;

    // Pausar compactación mientras el layout se asienta (cualquier expand, incluido el primero)
    if (isTransitioningSidebar || isLayoutSettling) {
      sidebarResizeWidthRef.current = null;
      sidebarElement.style.setProperty('--sidebar-compact', '0');
      sidebarElement.classList.remove('sidebar-width-tiny', 'sidebar-width-narrow');
      return;
    }

    const compactFromWidth = (width) => {
      const w = Math.max(0, width);
      if (w >= 240) return 0;
      if (w <= 100) return 1;
      return (240 - w) / 140;
    };

    const applyResizeStyles = (width) => {
      const rounded = Math.round(width);
      if (sidebarResizeWidthRef.current === rounded) return;
      sidebarResizeWidthRef.current = rounded;

      const compact = compactFromWidth(width);
      sidebarElement.style.setProperty('--sidebar-compact', compact.toFixed(3));
      sidebarElement.style.setProperty('--sidebar-panel-width', `${rounded}px`);

      sidebarElement.classList.toggle('sidebar-width-tiny', width <= 92);
      sidebarElement.classList.toggle('sidebar-width-narrow', width > 92 && width < 170);

      const buttonsContainer = sidebarElement.querySelector('.sidebar-action-glass-group');
      if (buttonsContainer) {
        buttonsContainer.style.removeProperty('opacity');
        buttonsContainer.style.removeProperty('transform');
        buttonsContainer.style.removeProperty('pointer-events');
        buttonsContainer.style.removeProperty('display');
      }
    };

    const scheduleUpdate = (width) => {
      if (sidebarResizeRafRef.current) {
        cancelAnimationFrame(sidebarResizeRafRef.current);
      }
      sidebarResizeRafRef.current = requestAnimationFrame(() => {
        sidebarResizeRafRef.current = null;
        applyResizeStyles(width);
      });
    };

    const measureWidth = () => {
      const panelWidth = panelElement?.getBoundingClientRect?.().width ?? 0;
      if (panelWidth > 0) return panelWidth;
      return sidebarElement.getBoundingClientRect().width;
    };

    sidebarResizeWidthRef.current = null;

    const resizeObserver = new ResizeObserver(() => {
      scheduleUpdate(measureWidth());
    });

    resizeObserver.observe(sidebarElement);
    if (panelElement) resizeObserver.observe(panelElement);

    scheduleUpdate(measureWidth());

    return () => {
      if (sidebarResizeRafRef.current) {
        cancelAnimationFrame(sidebarResizeRafRef.current);
        sidebarResizeRafRef.current = null;
      }
      resizeObserver.disconnect();
      sidebarElement.style.removeProperty('--sidebar-compact');
      sidebarElement.style.removeProperty('--sidebar-panel-width');
      sidebarElement.classList.remove('sidebar-width-tiny', 'sidebar-width-narrow');
    };
  }, [sidebarCollapsed, viewMode, isTransitioningSidebar, isLayoutSettling]);

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

  const favoritesTree = useMemo(() => {
    if (!(showFavoritesView && viewMode === 'connections')) {
      return [];
    }
    return buildFavoritesSidebarTree({
      nodes,
      favorites: getFavorites(),
      groups: favoriteGroupsStore.getGroups(),
      getFavoriteGroups: favoriteGroupsStore.getFavoriteGroups
    });
  }, [nodes, favoritesRevision, showFavoritesView, viewMode]);

  const filteredFavoritesTree = useMemo(
    () => filterFavoritesTree(favoritesTree, sidebarFilter),
    [favoritesTree, sidebarFilter]
  );

  const displayNodes = showFavoritesView && viewMode === 'connections'
    ? filteredFavoritesTree
    : nodes;

  const processedNodes = useMemo(() => {
    if (showFavoritesView && viewMode === 'connections') {
      return getFavoritesTreeDisplayNodes(displayNodes);
    }
    return limitTreeNodes(displayNodes);
  }, [displayNodes, limitTreeNodes, showFavoritesView, viewMode]);

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
    : processedNodes.length > 0;

  useEffect(() => {
    const unsubscribeFavorites = onFavoritesUpdate(() => bumpFavoritesRevision());
    const unsubscribeGroups = favoriteGroupsStore.onGroupsUpdate(() => bumpFavoritesRevision());
    const unsubscribeSourceTrees = onFavoriteSourceTreesUpdate(() => bumpFavoritesRevision());
    return () => {
      unsubscribeFavorites();
      unsubscribeGroups();
      unsubscribeSourceTrees();
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
          const parentId = isFavoriteGroupFolderKey(parentNodeKey)
            ? getFavoriteGroupIdFromKey(parentNodeKey)
            : null;
          favoriteGroupsStore.createGroup({
            name: folderName.trim(),
            color: folderColor,
            icon: 'pi-folder',
            parentId
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
      setFolderColor(getThemeDefaultColor((activeTreeAppearance.iconTheme || 'nord').toLowerCase()));
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
    setFolderColor(getThemeDefaultColor((activeTreeAppearance.iconTheme || 'nord').toLowerCase()));
    setParentNodeKey(null);
    setEditingNode(null);

    // Desbloquear formularios por si alguna máscara quedó activa
    setTimeout(() => {
      try { unblockAllInputs(); } catch { }
    }, 0);
  };


  const onFavoritesDragDrop = (event) => {
    if (applyFavoritesDragDropFromEvent(event)) {
      bumpFavoritesRevision();
    }
  };

  // Drag and drop: solo muta el árbol completo en estado (nunca el value truncado del Tree).
  const onDragDrop = (event) => {
    if (showFavoritesView && viewMode === 'connections') {
      onFavoritesDragDrop(event);
      return;
    }

    const { dragNode, dropNode, dropPoint, dropIndex } = event || {};
    if (isShowMoreTreeNode(dragNode) || isShowMoreTreeNode(dropNode)) {
      return;
    }
    if (!dragNode?.key) {
      return;
    }

    if (dropNode?.key) {
      const dropInFull = findNodeInTree(nodes, dropNode.key);
      if (dropPoint === 0 && dropInFull && !isTreeFolderNode(dropInFull)) {
        showToast && showToast({
          severity: 'warn',
          summary: 'Operación no permitida',
          detail: 'No se puede arrastrar elementos dentro de una sesión. Solo las carpetas pueden contener otros elementos.',
          life: 3000
        });
        return;
      }

      if (isDescendantInFullTree(nodes, dragNode.key, dropNode.key)) {
        showToast && showToast({
          severity: 'warn',
          summary: 'Operación no permitida',
          detail: 'No puedes mover una carpeta dentro de sí misma.',
          life: 2500
        });
        return;
      }
    }

    setNodes((prevNodes) => {
      const result = moveNodeFromTreeEvent(prevNodes || [], {
        dragNode,
        dropNode,
        dropPoint,
        dropIndex,
        value: event?.value
      });
      return result?.nodes ?? prevNodes;
    });
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

  const stopTreeDragInteraction = useCallback(() => {
    stopTreeDragAutoScroll();
    clearDragHoverExpand();
  }, [clearDragHoverExpand, stopTreeDragAutoScroll]);

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
    handleDragHoverExpandOver(e);

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
  }, [handleDragHoverExpandOver, runTreeDragAutoScroll, stopTreeDragAutoScroll]);

  const handleTreeContainerDragLeave = useCallback((e) => {
    const container = treeContainerRef.current;
    if (!container) return;
    if (e.currentTarget.contains(e.relatedTarget)) return;
    handleDragHoverExpandLeave(e);
    stopTreeDragInteraction();
  }, [handleDragHoverExpandLeave, stopTreeDragInteraction]);

  useEffect(() => {
    return () => {
      stopTreeDragInteraction();
    };
  }, [stopTreeDragInteraction]);


  // Eventos globales para acciones de acceso rápido desde Home
  useEffect(() => {
    const handleOpenPasswords = () => setViewMode('passwords');
    const handleOpenDocuments = () => {
      setViewMode('documents');
      setSidebarCollapsed(false);
    };
    const handleOpenSettings = () => setShowSettingsDialog(true);
    const handleOpenExplorerDialog = () => {
      setShowUnifiedConnectionDialog && setShowUnifiedConnectionDialog(true);
    };
    window.addEventListener('open-password-manager', handleOpenPasswords);
    window.addEventListener('open-documents-sidebar', handleOpenDocuments);
    window.addEventListener('open-settings-dialog', handleOpenSettings);
    window.addEventListener('open-explorer-dialog', handleOpenExplorerDialog);
    return () => {
      window.removeEventListener('open-password-manager', handleOpenPasswords);
      window.removeEventListener('open-documents-sidebar', handleOpenDocuments);
      window.removeEventListener('open-settings-dialog', handleOpenSettings);
      window.removeEventListener('open-explorer-dialog', handleOpenExplorerDialog);
    };
  }, [setShowSettingsDialog, setShowUnifiedConnectionDialog, setSidebarCollapsed]);


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
            setParentNodeKey(parentKey || FAVORITES_ROOT_KEY);
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
            setFolderColor(node.color || getThemeDefaultColor((activeTreeAppearance.iconTheme || 'nord').toLowerCase()));
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
          setFolderColor(node.color || getThemeDefaultColor((activeTreeAppearance.iconTheme || 'nord').toLowerCase()));
          setFolderIcon(node.folderIcon || null);
          setShowFolderDialog(true);
        },
        deleteNode: (nodeKey, nodeLabel) => {
          if (isFavoritesRootKey(nodeKey)) {
            return;
          }

          if (isFavoriteShortcutKey(nodeKey)) {
            const favoriteId = getFavoriteIdFromShortcutKey(nodeKey);
            if (favoriteId) {
              removeFavorite(favoriteId);
              bumpFavoritesRevision();
              showToast && showToast({
                severity: 'success',
                summary: 'Quitado de favoritos',
                detail: `"${nodeLabel}" ha sido quitado de favoritos`,
                life: 3000
              });
            }
            if (hideContextMenu) hideContextMenu();
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

            appConfirm({
              message: `¿Eliminar la carpeta de favoritos "${nodeLabel}"?`,
              header: 'Confirmar eliminación',
              severity: 'danger',
              acceptLabel: 'Eliminar',
              rejectLabel: 'Cancelar',
              accept: executeFavoriteGroupDeletion
            });
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

          // Función para ejecutar la eliminación (mueve a papelera)
          const executeDeletion = () => {

            const removeNodeFromTree = (list, targetKey) => {
              if (!Array.isArray(list)) {
                return [];
              }

              return list
                .filter(node => node.key !== targetKey)
                .map(node => {
                  if (node.children && Array.isArray(node.children)) {
                    const nextChildren = removeNodeFromTree(node.children, targetKey);
                    if (nextChildren !== node.children) {
                      return { ...node, children: nextChildren };
                    }
                  }
                  return node;
                });
            };

            try {
              // Guardar el nodo completo en la papelera antes de eliminarlo
              const deletedNode = targetNode ? JSON.parse(JSON.stringify(targetNode)) : null;
              moveToTrash(nodeKey, nodeLabel, deletedNode);

              const newNodes = removeNodeFromTree(nodes, nodeKey);
              setNodes(() => logSetNodes('Sidebar-Delete', newNodes));

              showToast && showToast({
                severity: 'success',
                summary: 'Movido a la papelera',
                detail: `"${nodeLabel}" movido a la papelera`,
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
          const message = hasChildren
            ? `¿Estás seguro de que deseas eliminar la carpeta "${nodeLabel}" y todo su contenido? Esta acción no se puede deshacer.`
            : `¿Estás seguro de que deseas eliminar "${nodeLabel}"? Esta acción no se puede deshacer.`;

          appConfirm({
            message: message,
            header: 'Confirmar eliminación',
            severity: 'danger',
            acceptLabel: 'Eliminar',
            rejectLabel: 'Cancelar',
            accept: executeDeletion
          });
        }
      };
    }
  }, [nodes, setShowFolderDialog, deepCopy, findNodeByKey, showToast, confirmDialog,
    setEditingNode, setFolderName, setParentNodeKey, setNodes, openEditSSHDialog, bumpFavoritesRevision]);




  const sidebarTypographyStyle = useMemo(() => {
    const stack = buildSidebarFontStack(explorerFont);
    return {
      '--sidebar-font-family': stack,
      '--sidebar-font-size': `${explorerFontSize}px`,
      fontFamily: stack
    };
  }, [explorerFont, explorerFontSize]);

  // Función interna para el menú contextual del área del árbol
  // const onTreeAreaContextMenu = (event) => {
  //   event.preventDefault();
  //   event.stopPropagation();
  //   // Aquí se podría mostrar un menú contextual propio si se desea
  // };
  // nodeTemplate adaptado de App.js
  const nodeTemplate = (node, options) => {
    if (node.data?.isShowMoreBtn) {
      return (
        <div 
          className="flex align-items-center gap-2 p-1" 
          style={{ 
            color: '#89b4fa', 
            fontStyle: 'italic', 
            cursor: 'pointer',
            fontWeight: 'bold',
            paddingLeft: '4px',
            width: '100%'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setFolderLimits(prev => ({
              ...prev,
              [node.data.parentKey]: node.data.targetLimit
            }));
          }}
        >
          <span className="pi pi-plus-circle" style={{ fontSize: '14px' }} />
          <span>{node.label}</span>
        </div>
      );
    }
    const actionNode = isFavoriteShortcutNode(node) ? resolveFavoriteShortcutNode(node, nodes) : node;
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isFolder = !!(node.droppable || hasChildren);
    const isSSH = actionNode.data && actionNode.data.type === 'ssh';
    const isRDP = actionNode.data && actionNode.data.type === 'rdp';
    const isVNC = actionNode.data && (actionNode.data.type === 'vnc' || actionNode.data.type === 'vnc-guacamole');
    const isFileConnection = actionNode.data && (actionNode.data.type === 'sftp' || actionNode.data.type === 'ftp' || actionNode.data.type === 'scp');
    const isPassword = actionNode.data && actionNode.data.type === 'password';
    const isCryptoWallet = actionNode.data && actionNode.data.type === 'crypto_wallet';
    const isApiKey = actionNode.data && actionNode.data.type === 'api_key';
    const isSecureNote = actionNode.data && actionNode.data.type === 'secure_note';
    const isDocument = actionNode.data && (actionNode.data.type === 'document' || actionNode.data.type === 'quick-note');
    const isSSHTunnel = actionNode.data && actionNode.data.type === 'ssh-tunnel';
    // Icono según tema seleccionado para la sidebar
    let icon = null;
    const themeKey = (activeTreeAppearance.iconTheme || 'nord').toLowerCase();
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
        fluent: 1.0, // Ya es bastante grande
        ghost_ui: 1.18
      };

      const scale = SCALES[key] || (typeof key === 'string' && key.startsWith('ghost') ? 1.18 : 1.0);
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
        const cacheKey = `ssh-custom-${node.data.customIcon}-${connectionIconSize}`;
        icon = getCachedIcon(cacheKey, () => <SSHIconRenderer preset={preset} pixelSize={connectionIconSize} />);
      } else {
        // Usar icono del tema unificado
        const cacheKey = `ssh-default-${connectionIconSize}-${themeKey}`;
        icon = getCachedIcon(cacheKey, () => getNormalizedIcon(themeIcons.ssh, connectionIconSize, themeKey));
      }
    } else if (isRDP) {
      const cacheKey = `rdp-${connectionIconSize}-${themeKey}`;
      icon = getCachedIcon(cacheKey, () => getNormalizedIcon(themeIcons.rdp, connectionIconSize, themeKey) || '🖥️');
    } else if (isVNC) {
      const cacheKey = `vnc-${connectionIconSize}-${themeKey}`;
      icon = getCachedIcon(cacheKey, () => getNormalizedIcon(themeIcons.vnc || themeIcons.rdp, connectionIconSize, themeKey) || '🖥️');
    } else if (isPassword) {
      const cacheKey = `password-${connectionIconSize}`;
      icon = getCachedIcon(cacheKey, () => <span className="pi pi-lock" style={{ color: '#E91E63', fontSize: `${connectionIconSize}px` }} />);
    } else if (isCryptoWallet) {
      const cacheKey = `crypto_wallet-${connectionIconSize}`;
      icon = getCachedIcon(cacheKey, () => <span className="pi pi-wallet" style={{ color: '#F7931A', fontSize: `${connectionIconSize}px` }} />);
    } else if (isApiKey) {
      const cacheKey = `api_key-${connectionIconSize}`;
      icon = getCachedIcon(cacheKey, () => <span className="pi pi-key" style={{ color: '#00BCD4', fontSize: `${connectionIconSize}px` }} />);
    } else if (isSecureNote) {
      const cacheKey = `secure_note-${connectionIconSize}`;
      icon = getCachedIcon(cacheKey, () => <span className="pi pi-file-edit" style={{ color: '#9C27B0', fontSize: `${connectionIconSize}px` }} />);
    } else if (isDocument) {
      const cacheKey = `document-${connectionIconSize}`;
      icon = getCachedIcon(cacheKey, () => <span className="pi pi-file" style={{ color: '#64b5f6', fontSize: `${connectionIconSize}px` }} />);
    } else if (isSSHTunnel) {
      // Icono para túneles SSH con indicador de estado
      const tunnelStatus = node.data?.tunnelStatus || 'stopped';
      const cacheKey = `ssh-tunnel-${tunnelStatus}-${connectionIconSize}`;
      icon = getCachedIcon(cacheKey, () => {
        const statusColors = {
          active: '#a6e3a1',
          connecting: '#89b4fa',
          error: '#f38ba8',
          stopped: '#6c7086'
        };
        return (
          <span className="pi pi-share-alt" style={{ color: statusColors[tunnelStatus] || '#89b4fa', fontSize: `${connectionIconSize}px` }} />
        );
      });
    } else if (isFileConnection) {
      const protocol = node.data?.protocol || node.data?.type || 'sftp';
      const cacheKey = `file-${protocol}-${connectionIconSize}-${themeKey}`;
      icon = getCachedIcon(cacheKey, () => {
        const themeIcon = themeIcons[protocol] || iconThemes['material']?.icons?.[protocol];
        if (themeIcon) {
          const connectionColor = getThemeDefaultColor(themeKey);
          const normalizedIcon = getNormalizedIcon(themeIcon, connectionIconSize, themeKey);
          return modifySVGColors(normalizedIcon, connectionColor, themeKey);
        } else {
          return <span className="pi pi-folder" style={{ color: '#89b4fa', fontSize: `${connectionIconSize}px` }} />;
        }
      });
    } else if (isFolder) {
      const isFavoritesTreeView = showFavoritesView && viewMode === 'connections';
      if (isFavoritesTreeView) {
        const cacheKey = `fav-folder-${folderIconSize}`;
        icon = getCachedIcon(cacheKey, () => <FolderIconRenderer preset={FolderIconPresets.FAVORITES} pixelSize={folderIconSize} />);
      } else if (node.data?.customIcon && node.data.customIcon !== 'default' && FolderIconPresets[node.data.customIcon.toUpperCase()]) {
        const preset = FolderIconPresets[node.data.customIcon.toUpperCase()];
        const cacheKey = `folder-custom-${node.data.customIcon}-${folderIconSize}`;
        icon = getCachedIcon(cacheKey, () => <FolderIconRenderer preset={preset} pixelSize={folderIconSize} />);
      } else if (node.folderIcon && node.folderIcon !== 'general' && FolderIconPresets[node.folderIcon.toUpperCase()]) {
        const preset = FolderIconPresets[node.folderIcon.toUpperCase()];
        const cacheKey = `folder-custom-${node.folderIcon}-${folderIconSize}`;
        icon = getCachedIcon(cacheKey, () => <FolderIconRenderer preset={preset} pixelSize={folderIconSize} />);
      } else {
        const hasCustomColor = node.color && !isDefaultThemeColor(node.color);
        const folderColor = hasCustomColor ? node.color : getThemeDefaultColor(themeKey);
        const cacheKey = `folder-default-${themeKey}-${folderColor}-${folderIconSize}-${options.expanded ? 'open' : 'closed'}`;
        icon = getCachedIcon(cacheKey, () => {
          const baseIcon = options.expanded ? themeIcons.folderOpen : themeIcons.folder;
          if (baseIcon) {
            const normalizedIcon = getNormalizedIcon(baseIcon, folderIconSize, themeKey);
            return modifySVGColors(normalizedIcon, folderColor, themeKey, 0);
          } else {
            return <span 
              className={options.expanded ? "pi pi-folder-open" : "pi pi-folder"} 
              style={{ color: folderColor, fontSize: `${folderIconSize}px` }} 
            />;
          }
        });
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
    const isConnection = !isFolder && (isSSH || isRDP || isVNC || isFileConnection || isSSHTunnel);
    const hasOpenSession = isConnection && openSessionNodeKeys?.has?.(actionNode.key);
    const iconSlotUsesBadge = hasCustomFolderIcon;
    const showTunnelActiveDot = isSSHTunnel && node.data?.tunnelStatus === 'active';
    const iconSlotSize = isFolder ? (folderIconSize || 20) : (connectionIconSize || 20);
    const iconSlotClass = [
      'sidebar-node-icon-slot',
      iconSlotUsesBadge ? 'sidebar-node-icon-slot--badge' : ''
    ].filter(Boolean).join(' ');

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
      <div className="sidebar-tree-node-row flex align-items-center gap-1"
        onClick={handleFolderRowClick}
        onContextMenu={options.onNodeContextMenu ? (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isFavoritesRootKey(node.key) || isFavoriteGroupFolderNode(node)) {
            options.onNodeContextMenu(e, node);
            return;
          }
          if (isFavoriteShortcutNode(node)) {
            const resolved = resolveFavoriteShortcutNode(node, nodes);
            const shortcutType = String(node.data?.type || resolved.data?.type || '').toLowerCase();
            const isSecretOrDoc = ['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note', 'document', 'quick-note'].includes(shortcutType);
            options.onNodeContextMenu(e, {
              ...resolved,
              isFavoriteShortcut: true,
              favoriteId: node.favoriteId,
              sourceKey: node.sourceKey || resolved.key,
              key: isSecretOrDoc ? node.key : (resolved.key || node.key)
            });
            return;
          }
          options.onNodeContextMenu(e, node);
        } : undefined}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (detailsPanelTimeoutRef.current) {
            clearTimeout(detailsPanelTimeoutRef.current);
            detailsPanelTimeoutRef.current = null;
          }
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
          } else if (actionNode.data && ['password', 'crypto_wallet', 'api_key', 'secure_note'].includes(actionNode.data.type)) {
            const openKey = node.sourceKey || node.favoriteId || actionNode.data?.id || actionNode.key;
            const payload = {
              key: openKey,
              label: actionNode.label || actionNode.name,
              title: actionNode.label || actionNode.name,
              type: actionNode.data.type,
              mode: 'permanent',
              ...actionNode.data,
              id: openKey
            };
            window.dispatchEvent(new CustomEvent('open-password-tab', { detail: payload }));
          } else if (actionNode.data && ['document', 'quick-note'].includes(actionNode.data.type)) {
            const openKey = node.sourceKey || node.favoriteId || actionNode.data?.id || actionNode.key;
            window.dispatchEvent(new CustomEvent('open-document-tab', {
              detail: {
                key: openKey,
                label: actionNode.label || actionNode.name,
                data: actionNode.data
              }
            }));
          }
        }}
        style={{
          cursor: 'pointer',
          ...sidebarTypographyStyle,
          display: 'flex',
          alignItems: 'center',
          gap: `${Math.max(3, Math.round((folderIconSize || 20) * 0.12))}px`
        }}
        title={title}
        data-connection-type={isSSH ? 'ssh' : (isRDP ? 'rdp' : (isVNC ? 'vnc' : (isSSHTunnel ? 'ssh-tunnel' : null)))}
        data-node-type={isFolder ? 'folder' : 'connection'}
        data-node-key={node.key}
      >
        <span
          className={iconSlotClass}
          style={{
            minWidth: iconSlotUsesBadge ? undefined : iconSlotSize,
            width: iconSlotUsesBadge ? undefined : iconSlotSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: `${iconSlotSize}px`,
            position: 'relative',
            '--sidebar-icon-slot-size': `${iconSlotSize}px`
          }}
        >
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
          lineHeight: 'normal',
          fontFamily: sidebarTypographyStyle.fontFamily,
          fontSize: sidebarTypographyStyle['--sidebar-font-size']
        }}>{node.label}</span>
        {/* Indicador derecho: misma columna que el refresco Wallix */}
        {(hasOpenSession || showTunnelActiveDot) && (
          <span
            className={`session-active-dot${showTunnelActiveDot ? ' session-active-dot--tunnel' : ''}`}
            title={showTunnelActiveDot ? 'Túnel activo' : 'Sesión abierta'}
          />
        )}
        {/* Botón de refresco SOLO para la carpeta raíz importada de Wallix (tiene wallixUrl en data) */}
        {node.importedFrom === 'Wallix' && node.droppable && node.data && node.data.wallixUrl ? (
          <span
            className="pi pi-refresh wallix-refresh-btn"
            style={{ fontSize: '0.8rem', marginLeft: '6px', cursor: 'pointer' }}
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
    noteDragStartKey(e);
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
  // 'connections' | 'favorites' | 'documents' | 'passwords' | 'settings'
  const activeTab = (() => {
    if (viewMode === 'localExplorer') return null; // este modo oculta las pestañas
    if (viewMode === 'tools') return 'tools';
    if (viewMode === 'documents') return 'documents';
    if (viewMode === 'passwords') return 'passwords';
    if (viewMode === 'settings') return 'settings';
    if (showFavoritesView) return 'favorites';
    return 'connections';
  })();

  const TB_ICON = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '16px', height: '16px'
  };
  const [libraryAddAnchor, setLibraryAddAnchor] = useState(null);
  const libraryAddMenuModel = useMemo(() => ([
    {
      label: 'Importar carpeta a NodeTerm…',
      icon: 'pi pi-folder-open',
      command: () => window.dispatchEvent(new CustomEvent('documents-sidebar:import-folder'))
    },
    {
      label: 'Conectar carpeta de Windows…',
      icon: 'pi pi-desktop',
      command: () => window.dispatchEvent(new CustomEvent('documents-sidebar:link-folder'))
    },
    {
      label: 'Montar carpeta de Nextcloud…',
      icon: 'pi pi-cloud',
      command: () => window.dispatchEvent(new CustomEvent('documents-sidebar:mount-cloud'))
    },
    { separator: true },
    {
      label: 'Enlazar archivos sueltos…',
      icon: 'pi pi-file',
      command: () => window.dispatchEvent(new CustomEvent('documents-sidebar:link-files'))
    },
    {
      label: 'Añadir desde URL…',
      icon: 'pi pi-cloud-download',
      command: () => window.dispatchEvent(new CustomEvent('documents-sidebar:add-url'))
    },
    {
      label: 'Pegar del portapapeles',
      icon: 'pi pi-clipboard',
      command: () => window.dispatchEvent(new CustomEvent('documents-sidebar:paste'))
    }
  ]), []);
  const sessionIcons = sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons;

  const [documentsTreeAllExpanded, setDocumentsTreeAllExpanded] = useState(true);
  const [documentsNotesLayout, setDocumentsNotesLayout] = useState(readSavedNotesLayout);
  const [connectionsLayout, setConnectionsLayout] = useState(readSavedConnectionsLayout);
  const [connectionsBrowseStack, setConnectionsBrowseStack] = useState([]);
  const [passwordsTreeAllExpanded, setPasswordsTreeAllExpanded] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(CONNECTIONS_LAYOUT_STORAGE_KEY, connectionsLayout); } catch {}
  }, [connectionsLayout]);

  useEffect(() => {
    setConnectionsBrowseStack([]);
  }, [showFavoritesView]);

  useEffect(() => {
    setConnectionsBrowseStack((prev) => {
      const resolved = [];
      let level = displayNodes;
      for (const key of prev) {
        const folder = (level || []).find((node) => node && node.key === key && isConnectionFolder(node));
        if (!folder) break;
        resolved.push(key);
        level = folder.children || [];
      }
      if (resolved.length === prev.length && resolved.every((key, index) => key === prev[index])) return prev;
      return resolved;
    });
  }, [displayNodes]);
  const [passwordsVaultLayout, setPasswordsVaultLayout] = useState(readSavedVaultLayout);
  const [toolsTreeAllExpanded, setToolsTreeAllExpanded] = useState(true);
  const [settingsTreeAllExpanded, setSettingsTreeAllExpanded] = useState(true);

  useEffect(() => {
    const onDocExpandState = (e) => {
      if (typeof e.detail?.allExpanded === 'boolean') setDocumentsTreeAllExpanded(e.detail.allExpanded);
    };
    const onDocLayoutState = (e) => {
      if (isNotesLayout(e.detail?.layout)) setDocumentsNotesLayout(e.detail.layout);
    };
    const onPassExpandState = (e) => {
      if (typeof e.detail?.allExpanded === 'boolean') setPasswordsTreeAllExpanded(e.detail.allExpanded);
    };
    const onPassLayoutState = (e) => {
      if (isVaultLayout(e.detail?.layout)) setPasswordsVaultLayout(e.detail.layout);
    };
    const onToolsExpandState = (e) => {
      if (typeof e.detail?.allExpanded === 'boolean') setToolsTreeAllExpanded(e.detail.allExpanded);
    };
    const onSettingsExpandState = (e) => {
      if (typeof e.detail?.allExpanded === 'boolean') setSettingsTreeAllExpanded(e.detail.allExpanded);
    };
    window.addEventListener('documents-sidebar:expand-state', onDocExpandState);
    window.addEventListener('documents-sidebar:layout-state', onDocLayoutState);
    window.addEventListener('passwords-sidebar:expand-state', onPassExpandState);
    window.addEventListener('passwords-sidebar:layout-state', onPassLayoutState);
    window.addEventListener('tools-sidebar:expand-state', onToolsExpandState);
    window.addEventListener('settings-sidebar:expand-state', onSettingsExpandState);
    return () => {
      window.removeEventListener('documents-sidebar:expand-state', onDocExpandState);
      window.removeEventListener('documents-sidebar:layout-state', onDocLayoutState);
      window.removeEventListener('passwords-sidebar:expand-state', onPassExpandState);
      window.removeEventListener('passwords-sidebar:layout-state', onPassLayoutState);
      window.removeEventListener('tools-sidebar:expand-state', onToolsExpandState);
      window.removeEventListener('settings-sidebar:expand-state', onSettingsExpandState);
    };
  }, []);

  const toolbarAllExpanded = activeTab === 'documents'
    ? documentsTreeAllExpanded
    : activeTab === 'passwords'
      ? passwordsTreeAllExpanded
      : activeTab === 'tools'
        ? toolsTreeAllExpanded
        : activeTab === 'settings'
          ? settingsTreeAllExpanded
          : allExpanded;

  const handleToolbarExpandAll = useCallback(() => {
    if (activeTab === 'documents') {
      window.dispatchEvent(new CustomEvent('documents-sidebar:toggle-expand-all'));
    } else if (activeTab === 'passwords') {
      window.dispatchEvent(new CustomEvent('passwords-sidebar:toggle-expand-all'));
    } else if (activeTab === 'tools') {
      window.dispatchEvent(new CustomEvent('tools-sidebar:toggle-expand-all'));
    } else if (activeTab === 'settings') {
      window.dispatchEvent(new CustomEvent('settings-sidebar:toggle-expand-all'));
    } else if (activeTab === 'connections' || activeTab === 'favorites') {
      toggleExpandAll();
    }
  }, [activeTab, toggleExpandAll]);

  const sessionKeyForConnection = useCallback((node) => {
    const actionNode = isFavoriteShortcutNode(node) ? resolveFavoriteShortcutNode(node, nodes) : node;
    return actionNode?.key || node?.key;
  }, [nodes]);

  const isFavoriteConnection = useCallback((node) => {
    const actionNode = isFavoriteShortcutNode(node) ? resolveFavoriteShortcutNode(node, nodes) : node;
    return isFavorite(actionNode?.key)
      || isFavorite(node?.favoriteId)
      || isFavorite(actionNode?.data?.id)
      || isFavorite(actionNode?.data);
  }, [nodes]);

  const activateConnectionsItem = useCallback((node, mode = 'preview') => {
    if (!node) return;
    if (isConnectionFolder(node)) {
      if (mode !== 'connect') {
        const path = findFolderPath(displayNodes, node.key);
        if (path) setConnectionsBrowseStack(path);
      }
      return;
    }

    const actionNode = isFavoriteShortcutNode(node) ? resolveFavoriteShortcutNode(node, nodes) : node;
    setSelectedNodeKey(node.key);

    if (mode === 'preview') {
      if (detailsPanelTimeoutRef.current) {
        clearTimeout(detailsPanelTimeoutRef.current);
        detailsPanelTimeoutRef.current = null;
      }
      const connType = String(actionNode?.data?.type || '').toLowerCase();
      const isHomeConnection = getHomeTabActive()
        && !actionNode?.droppable
        && ['ssh', 'rdp', 'rdp-guacamole', 'vnc', 'vnc-guacamole', 'sftp', 'ftp', 'scp', 'ssh-tunnel'].includes(connType);
      if (isHomeConnection) {
        setSelectedNodeForDetails(null);
        window.dispatchEvent(new CustomEvent('open-home-connection-panel', {
          detail: { key: actionNode.key || node.key }
        }));
        return;
      }
      detailsPanelTimeoutRef.current = setTimeout(() => {
        setSelectedNodeForDetails(actionNode);
        detailsPanelTimeoutRef.current = null;
        if (typeof onSyncActiveEditTab === 'function') {
          onSyncActiveEditTab(actionNode);
        }
      }, 250);
      return;
    }

    if (detailsPanelTimeoutRef.current) {
      clearTimeout(detailsPanelTimeoutRef.current);
      detailsPanelTimeoutRef.current = null;
    }

    const type = String(actionNode?.data?.type || '').toLowerCase();
    if (type === 'ssh' && onOpenSSHConnection) {
      onOpenSSHConnection(actionNode, nodes);
    } else if ((type === 'rdp' || type === 'rdp-guacamole') && sidebarCallbacksRef?.current?.connectRDP) {
      sidebarCallbacksRef.current.connectRDP(actionNode);
    } else if ((type === 'vnc' || type === 'vnc-guacamole') && onOpenVncConnection) {
      onOpenVncConnection(actionNode, nodes);
    } else if (['sftp', 'ftp', 'scp'].includes(type) && sidebarCallbacksRef?.current?.openFileConnection) {
      sidebarCallbacksRef.current.openFileConnection(actionNode, nodes);
    } else if (type === 'ssh-tunnel' && sidebarCallbacksRef?.current?.openSSHTunnel) {
      sidebarCallbacksRef.current.openSSHTunnel(actionNode, nodes);
    } else if (actionNode?.data && ['password', 'crypto_wallet', 'api_key', 'secure_note'].includes(type)) {
      const openKey = node.sourceKey || node.favoriteId || actionNode.data?.id || actionNode.key;
      window.dispatchEvent(new CustomEvent('open-password-tab', {
        detail: {
          key: openKey,
          label: actionNode.label || actionNode.name,
          title: actionNode.label || actionNode.name,
          type: actionNode.data.type,
          mode: 'permanent',
          ...actionNode.data,
          id: openKey
        }
      }));
    } else if (actionNode?.data && ['document', 'quick-note'].includes(type)) {
      const openKey = node.sourceKey || node.favoriteId || actionNode.data?.id || actionNode.key;
      window.dispatchEvent(new CustomEvent('open-document-tab', {
        detail: {
          key: openKey,
          label: actionNode.label || actionNode.name,
          data: actionNode.data
        }
      }));
    }
  }, [displayNodes, nodes, onOpenSSHConnection, onOpenVncConnection, onSyncActiveEditTab, sidebarCallbacksRef, setSelectedNodeKey]);

  const onConnectionsBrowserContextMenu = useCallback((event, node) => {
    const resolved = (isFavoritesRootKey(node.key) || isFavoriteGroupFolderNode(node))
      ? node
      : resolveFavoriteShortcutNode(node, nodes);
    if (onNodeContextMenu) onNodeContextMenu(event, resolved);
  }, [nodes, onNodeContextMenu]);

  const showToolbarExpandAll = activeTab === 'connections'
    || activeTab === 'favorites'
    || activeTab === 'documents'
    || activeTab === 'passwords'
    || activeTab === 'tools'
    || activeTab === 'settings';

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

        {/* ── BIBLIOTECA ── */}
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
            title="Nueva carpeta"
          >
            <span style={TB_ICON}>{sessionIcons?.newFolder}</span>
          </button>
          {createTabGroupBtn}
          <span className="sidebar-panel-toolbar-sep" aria-hidden="true" />
          <button
            type="button"
            className="sidebar-panel-toolbar-btn"
            onClick={(event) => {
              const anchor = event.currentTarget;
              setLibraryAddAnchor((current) => (current === anchor ? null : anchor));
            }}
            title="Añadir a la biblioteca"
          >
            <span style={TB_ICON}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M8.5 8.5 12 12l3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 14.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </button>
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
        {activeTab !== 'settings' && (
          <SidebarUpdateIndicator
            onConfigClick={() => setShowSettingsDialog(true)}
          />
        )}
        <span className="sidebar-panel-toolbar-right-spacer" aria-hidden="true" />
        <div className="sidebar-panel-toolbar-right-end">
          {(activeTab === 'connections' || activeTab === 'favorites') && (
            <ConnectionsLayoutMenu
              layout={connectionsLayout}
              onSelect={(layout) => {
                if (isConnectionsLayout(layout)) setConnectionsLayout(layout);
              }}
            />
          )}
          {activeTab === 'documents' && (
            <NotesLayoutMenu
              layout={documentsNotesLayout}
              onSelect={(layout) => {
                setDocumentsNotesLayout(layout);
                window.dispatchEvent(new CustomEvent('documents-sidebar:set-layout', { detail: { layout } }));
              }}
            />
          )}
          {activeTab === 'passwords' && (
            <VaultLayoutMenu
              layout={passwordsVaultLayout}
              onSelect={(layout) => {
                setPasswordsVaultLayout(layout);
                window.dispatchEvent(new CustomEvent('passwords-sidebar:set-layout', { detail: { layout } }));
              }}
            />
          )}
          {showToolbarExpandAll && !(
            (activeTab === 'passwords' && passwordsVaultLayout !== 'tree')
            || (activeTab === 'documents' && documentsNotesLayout !== 'tree')
            || ((activeTab === 'connections' || activeTab === 'favorites') && connectionsLayout !== 'tree')
          ) && (
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
          {activeTab !== null && (setTreeTheme || setIconTheme || setSessionActionIconTheme) && (
            <SidebarAppearanceMenu
              treeTheme={sectionAppearance.resolve(activeTab).treeTheme}
              setTreeTheme={(value) => sectionAppearance.setSectionTreeTheme(activeTab, value)}
              iconTheme={sectionAppearance.resolve(activeTab).iconTheme}
              setIconTheme={(value) => sectionAppearance.setSectionIconTheme(activeTab, value)}
              sectionLabel={SIDEBAR_SECTION_LABELS[activeTab]}
              hasSectionOverride={sectionAppearance.hasOverride(activeTab)}
              onResetSection={() => sectionAppearance.resetSection(activeTab)}
              sessionActionIconTheme={sessionActionIconTheme}
              setSessionActionIconTheme={setSessionActionIconTheme}
              explorerFont={explorerFont}
              setExplorerFont={setExplorerFont}
              explorerFontSize={explorerFontSize}
              setExplorerFontSize={setExplorerFontSize}
              explorerFontColor={explorerFontColor}
              setExplorerFontColor={setExplorerFontColor}
              iconSize={iconSize}
              setIconSize={setIconSize}
              tooltip={`Apariencia de ${SIDEBAR_SECTION_LABELS[activeTab] || 'la sección'}`}
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
      <LibraryAddMenu
        open={Boolean(libraryAddAnchor)}
        anchorEl={libraryAddAnchor}
        items={libraryAddMenuModel}
        onClose={() => setLibraryAddAnchor(null)}
      />

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
            ...sidebarTypographyStyle,
            ...(explorerFontColor ? { '--ui-sidebar-text': explorerFontColor } : {})
          }}
          onContextMenu={onTreeAreaContextMenu}
          className="tree-container"
          onDragStartCapture={noteDragStartKey}
          onDragStart={handleExternalDragStart}
          onDragOverCapture={handleTreeContainerDragOver}
          onDragOver={handleTreeContainerDragOver}
          onDragLeave={handleTreeContainerDragLeave}
          onDrop={stopTreeDragInteraction}
          onDragEnd={stopTreeDragInteraction}
        >
          {isLoading ? (
            <SidebarSkeleton />
          ) : connectionsLayout !== 'tree' ? (
            <ConnectionsBrowser
              nodes={displayNodes}
              layout={connectionsLayout}
              browseStack={connectionsBrowseStack}
              searching={Boolean(sidebarFilter && String(sidebarFilter).trim())}
              searchTerm={sidebarFilter}
              selectedKey={typeof selectedNodeKey === 'string' ? selectedNodeKey : (selectedNodeKey ? Object.keys(selectedNodeKey)[0] : null)}
              iconTheme={activeTreeAppearance.iconTheme}
              explorerFont={explorerFont}
              explorerFontSize={explorerFontSize}
              favoritesView={showFavoritesView && viewMode === 'connections'}
              rootLabel={showFavoritesView ? 'Favoritos' : 'Conexiones'}
              openSessionNodeKeys={openSessionNodeKeys}
              sessionKeyFor={sessionKeyForConnection}
              isFavoriteFn={isFavoriteConnection}
              onCrumb={(index) => setConnectionsBrowseStack((prev) => prev.slice(0, index))}
              onActivate={activateConnectionsItem}
              onContextMenu={onConnectionsBrowserContextMenu}
            />
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
              key={`tree-${activeTreeAppearance.iconTheme}-${explorerFont}-${explorerFontSize}-${activeTreeAppearance.treeTheme}-${explorerFontColor || 'default'}-${folderIconSize}-${iconSize}-${showFavoritesView ? 'favorites' : 'all'}`}
              value={processedNodes}
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

                if (detailsPanelTimeoutRef.current) {
                  clearTimeout(detailsPanelTimeoutRef.current);
                  detailsPanelTimeoutRef.current = null;
                }

                const node = selectedKey ? findNode(displayNodes, selectedKey) : null;
                const resolvedNode = node ? resolveFavoriteShortcutNode(node, nodes) : null;

                if (resolvedNode) {
                  const connType = String(resolvedNode.data?.type || '').toLowerCase();
                  const isHomeConnection = getHomeTabActive()
                    && !resolvedNode.droppable
                    && ['ssh', 'rdp', 'rdp-guacamole', 'vnc', 'vnc-guacamole', 'sftp', 'ftp', 'scp', 'ssh-tunnel'].includes(connType);

                  if (isHomeConnection) {
                    setSelectedNodeForDetails(null);
                    window.dispatchEvent(new CustomEvent('open-home-connection-panel', {
                      detail: { key: resolvedNode.key || selectedKey }
                    }));
                    return;
                  }

                  detailsPanelTimeoutRef.current = setTimeout(() => {
                    setSelectedNodeForDetails(resolvedNode);
                    detailsPanelTimeoutRef.current = null;
                    if (typeof onSyncActiveEditTab === 'function') {
                      onSyncActiveEditTab(resolvedNode);
                    }
                  }, 250);
                } else {
                  setSelectedNodeForDetails(null);
                }
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
              className={`sidebar-tree tree-theme-${activeTreeAppearance.treeTheme}${showFavoritesView && viewMode === 'connections' ? ' sidebar-tree-favorites-view' : ''}`}
              data-icon-theme={activeTreeAppearance.iconTheme}
              data-tree-theme={activeTreeAppearance.treeTheme}
              data-font-color={explorerFontColor || ''}
              style={{
                height: '100%',
                overflow: 'auto',
                fontSize: `${explorerFontSize}px`,
                color: explorerFontColor || undefined,
                ...sidebarTypographyStyle,
                '--icon-size': `${iconSize}px`,
                '--sidebar-folder-icon-size': `${folderIconSize || 20}px`,
                '--sidebar-connection-icon-size': `${connectionIconSize || 20}px`,
                '--sidebar-icon-size': `${Math.max(folderIconSize || 20, connectionIconSize || 20)}px`,
                '--sidebar-row-min-h': `${Math.max(folderIconSize || 20, connectionIconSize || 20) + 2}px`,
                '--sidebar-row-pad-y': '0px',
                '--tree-node-padding': '0',
                ...(explorerFontColor ? {
                  '--ui-sidebar-text': explorerFontColor,
                  '--tree-text-color': explorerFontColor
                } : {})
              }}
              nodeTemplate={(node, options) => nodeTemplate(node, { ...options, onNodeContextMenu })}
              onContextMenu={(e) => {
                if (e?.originalEvent) {
                  e.originalEvent.preventDefault();
                  e.originalEvent.stopPropagation();
                }
                const targetNode = e?.node;
                if (!targetNode) return;
                const resolved = (isFavoritesRootKey(targetNode.key) || isFavoriteGroupFolderNode(targetNode))
                  ? targetNode
                  : resolveFavoriteShortcutNode(targetNode, nodes);
                if (onNodeContextMenu) {
                  onNodeContextMenu(e.originalEvent || e, resolved);
                }
              }}
            />
          )}
        </div>

        {/* Panel de detalles de conexión */}
        <ConnectionDetailsPanel
          selectedNode={selectedNodeForDetails}
          uiTheme={uiTheme}
          iconTheme={activeTreeAppearance.iconTheme}
          sessionActionIconTheme={sessionActionIconTheme}
          onNodeUpdate={updateNodeInTree}
          onOpenSSHConnection={onOpenSSHConnection}
          onOpenVncConnection={onOpenVncConnection}
          collapsed={detailsCollapsed}
          onCollapseChange={setDetailsCollapsed}
          onClose={() => {
            setSelectedNodeKey(null);
            setSelectedNodeForDetails(null);
          }}
        />
      </div>

      {(viewMode === 'passwords' || mountedSidebarViews.has('passwords')) && (
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
            iconTheme={passwordsAppearance.iconTheme}
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
            treeTheme={passwordsAppearance.treeTheme}
            showFavoritesView={showFavoritesView}
            onToggleFavoritesView={toggleFavoritesView}
            hideHeader={true}
          />
        </Suspense>
      </div>
      )}

      {(viewMode === 'documents' || mountedSidebarViews.has('documents')) && (
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
            treeTheme={documentsAppearance.treeTheme}
            iconTheme={documentsAppearance.iconTheme}
            setShowSettingsDialog={setShowSettingsDialog}
            onShowImportDialog={onShowImportDialog || setShowImportDialog}
            onShowExportDialog={onShowExportDialog}
            onShowImportExportDialog={onShowImportExportDialog}
            onShowImportWizard={onShowImportWizard}
            hideHeader={true}
          />
        </Suspense>
      </div>
      )}

      {/* Keep-alive: same pattern as connections (display:none) after first visit / idle warm */}
      {(viewMode === 'localExplorer' || mountedSidebarViews.has('localExplorer')) && (
        <div style={{ display: viewMode === 'localExplorer' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
        </div>
      )}

      {(viewMode === 'tools' || mountedSidebarViews.has('tools')) && (
        <div style={{ display: viewMode === 'tools' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Suspense fallback={<TabChunkFallback />}>
          <LazyToolsSidebar
            onOpenTool={(toolId, toolLabel, mode) => {
              window.dispatchEvent(new CustomEvent('open-network-tool', {
                detail: { toolId, toolLabel, mode: mode || 'reuse' }
              }));
            }}
            iconTheme={toolsAppearance.iconTheme}
            iconSize={iconSize}
            folderIconSize={folderIconSize}
            connectionIconSize={connectionIconSize}
            explorerFont={explorerFont}
            explorerFontSize={explorerFontSize}
            treeTheme={toolsAppearance.treeTheme}
            explorerFontColor={explorerFontColor}
          />
        </Suspense>
        </div>
      )}

      {(viewMode === 'settings' || mountedSidebarViews.has('settings')) && (
        <div style={{ display: viewMode === 'settings' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Suspense fallback={<TabChunkFallback />}>
          <LazySettingsSidebar
            iconTheme={settingsAppearance.iconTheme}
            iconSize={iconSize}
            folderIconSize={folderIconSize}
            connectionIconSize={connectionIconSize}
            explorerFont={explorerFont}
            explorerFontSize={explorerFontSize}
            treeTheme={settingsAppearance.treeTheme}
            explorerFontColor={explorerFontColor}
          />
        </Suspense>
        </div>
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
      settings: 'settings',
    };
    const targetViewMode = sectionToViewMode[sectionId] || 'connections';

    if (
      !sidebarCollapsed
      && viewMode === targetViewMode
      && sectionId !== 'settings'
      && (sectionId !== 'connections' || !showFavoritesView)
    ) {
      setSidebarCollapsed(true);
    } else {
      setViewMode(targetViewMode);
      if (sectionId === 'connections') setShowFavoritesView(false);
      setSidebarCollapsed(false);
    }
  }, [sidebarCollapsed, viewMode, showFavoritesView, setSidebarCollapsed]);

  const handleOpenAIClient = useCallback((clientId) => {
    openAIClientById(clientId);
  }, []);

  const activeIconRailSection = (() => {
    if (sidebarCollapsed) return null;
    if (viewMode === 'documents') return 'documents';
    if (viewMode === 'passwords') return 'passwords';
    if (viewMode === 'tools') return 'tools';
    if (viewMode === 'settings') return 'settings';
    if (showFavoritesView && viewMode === 'connections') return 'favorites';
    if (viewMode === 'connections') return 'connections';
    return null;
  })();

  const stabilizeTreeLayout = isLayoutSettling || isTransitioningSidebar;

  return (
    <div
      ref={sidebarRef}
      className={`sidebar-container sidebar-root${isFirstExpandNoTransition ? ' sidebar-no-transition' : ''}`}
      style={{
        padding: 0,
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        fontSize: `${explorerFontSize}px`,
        color: explorerFontColor || undefined,
        width: '100%',
        ...sidebarTypographyStyle,
        ...(explorerFontColor ? { '--ui-sidebar-text': explorerFontColor } : {})
      }}>

      {/* Icon Rail - Always visible */}
      <SidebarIconRail
        activeSection={activeIconRailSection}
        panelOpen={!sidebarCollapsed}
        onSectionClick={handleIconRailSectionClick}
        onSettingsClick={() => setShowSettingsDialog(true)}
        onSettingsDialogClick={() => setShowSettingsDialog(true)}
        onAppMenuClick={handleAppMenuClick}
        sessionActionIconTheme={sessionActionIconTheme}
        aiClientsEnabled={aiClientsEnabled}
        onOpenAIClient={handleOpenAIClient}
        viewMode={viewMode}
        onShowImportDialog={onShowImportDialog || setShowImportDialog}
        onShowExportDialog={onShowExportDialog}
        onShowImportExportDialog={onShowImportExportDialog}
        onShowImportWizard={onShowImportWizard}
      />

      {/* Panel - Collapsible content area.
          Colapsado: se oculta con visibility+absolute pero mantiene ancho de layout (~280px)
          para que el Tree no rehaga reflow en el primer expand. */}
      <div
        ref={expandedContentRef}
        className={`sidebar-panel${sidebarCollapsed ? ' sidebar-panel-hidden-layout' : ''}`}
        style={sidebarCollapsed ? {
          position: 'absolute',
          left: 0,
          top: 0,
          width: '280px',
          height: '100%',
          visibility: 'hidden',
          opacity: 1,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: -1,
          border: 'none',
          padding: 0,
          transition: 'none',
        } : (() => {
          const isFirstExpand = !hasEverExpandedRef.current;
          if (isFirstExpand) hasEverExpandedRef.current = true;
          return {
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            height: '100%',
            visibility: 'visible',
            opacity: 1,
            transition: isFirstExpand ? 'none' : 'flex 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          };
        })()}>
        <div className="sidebar-panel-content-wrapper" style={{ width: '100%', minWidth: stabilizeTreeLayout ? '240px' : 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {fullSidebar}

          {/* ── Botón flotante de papelera (solo en pestaña conexiones) ── */}
          {!sidebarCollapsed && viewMode === 'connections' && (
            <button
              id="sidebar-trash-btn"
              onClick={() => setShowTrashModal(true)}
              title={`Papelera (${trashedConnections.length})`}
              style={{
                position: 'absolute',
                bottom: isDetailsPanelVisible && detailsCollapsed ? '44px' : '12px',
                right: '10px',
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: 'none',
                background: trashedConnections.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(120,120,140,0.12)',
                color: trashedConnections.length > 0 ? '#f87171' : 'var(--ui-sidebar-text, #888)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                transition: 'background 0.2s, color 0.2s, transform 0.15s, bottom 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                backdropFilter: 'blur(4px)',
                zIndex: 10,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = trashedConnections.length > 0 ? 'rgba(239,68,68,0.28)' : 'rgba(120,120,140,0.22)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = trashedConnections.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(120,120,140,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <i className="pi pi-trash" style={{ fontSize: '13px' }} />
              {trashedConnections.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: '#ef4444', color: '#fff', borderRadius: '50%',
                  width: '14px', height: '14px', fontSize: '9px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, lineHeight: 1,
                }}>
                  {trashedConnections.length > 9 ? '9+' : trashedConnections.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>


      {showFolderDialog && (
        <Suspense fallback={<TabChunkFallback />}>
          <LazyFolderDialog
            visible={showFolderDialog}
            onHide={() => {
              setShowFolderDialog(false);
              setFolderName('');
              setFolderColor(getThemeDefaultColor((activeTreeAppearance.iconTheme || 'nord').toLowerCase()));
              setFolderIcon(null);
              setEditingNode(null);
            }}
            mode={editingNode ? 'edit' : 'new'}
            folderName={folderName}
            setFolderName={setFolderName}
            folderColor={folderColor}
            setFolderColor={setFolderColor}
            folderIcon={folderIcon}
            setFolderIcon={setFolderIcon}
            onConfirm={createNewFolder}
            themeDefaultColor={getThemeDefaultColor((activeTreeAppearance.iconTheme || 'nord').toLowerCase())}
            themeName={iconThemes[activeTreeAppearance.iconTheme?.toLowerCase()]?.name || 'Material'}
          />
        </Suspense>
      )}
      {/* Los diálogos de edición SSH y RDP ahora se manejan en DialogsManager */}


      <SidebarTrashModal
        visible={showTrashModal}
        onClose={closeTrashModal}
        trashedConnections={trashedConnections}
        trashConfirm={trashConfirm}
        setTrashConfirm={setTrashConfirm}
        executeTrashConfirm={executeTrashConfirm}
        emptyTrash={emptyTrash}
        restoreFromTrash={restoreFromTrash}
        deleteFromTrashPermanently={deleteFromTrashPermanently}
      />

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