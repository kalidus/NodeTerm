import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Tree } from 'primereact/tree';
import AppDialog from './ui/AppDialog';
import { appConfirm } from './ui/AppConfirm';
import { ContextMenu } from 'primereact/contextmenu';
import LibraryAddMenu from './library/LibraryAddMenu';
import {
  sessionActionIconThemes,
  ensureSessionActionIconTheme,
  onSessionActionIconThemeLoaded
} from '../themes/session-action-icons';
import { FUTURISTIC_UI_KEYS } from '../themes/ui-themes';
import { useTranslation } from '../i18n/hooks/useTranslation';
import {
  loadDocumentTree,
  saveDocumentTree,
  createDocumentNode,
  createFolderNode,
  addNodeToTree,
  removeNodeFromTree,
  updateNodeInTree,
  findNodeInTree,
  collectManagedFiles
} from '../utils/documentStore';
import TreeContextMenu from './contextmenus/TreeContextMenu';
import {
  isDescendantInFullTree,
  isShowMoreTreeNode,
  moveNodeFromTreeEvent
} from '../utils/treeDragDrop';
import localStorageSyncService from '../services/LocalStorageSyncService';
import connectionStore from '../utils/connectionStore';
import { setFavoriteSourceTrees } from '../utils/favoritesSidebarTree';
import DocumentDetailsPanel from './DocumentDetailsPanel';
import QuickNotesSidePanel from './QuickNotesSidePanel';
import { getHomeTabActive, subscribeHomeTabActive } from '../utils/homeTabActiveBus';
import { FolderIconSelectorModal } from './FolderIconSelector';
import { waitForVaultSyncIfNeeded } from '../utils/waitForVaultSync';
import NotesBrowser from './notes/NotesBrowser';
import { renderDocumentNodeIcon } from './notes/documentNodeIcon';
import {
  findFolderPath,
  isNotebook,
  isNote,
  isQuickNotesGroup,
  isLibraryFile,
  isLinkedFolder,
  isCloudFolder,
  isManagedFolder
} from './notes/notesBrowse';
import { useLibraryIngest } from './library/useLibraryIngest';
import LibraryFolderPropertiesDialog from './library/LibraryFolderPropertiesDialog';
import LibraryUrlImportDialog from './library/LibraryUrlImportDialog';
import LibraryCloudBrowserDialog from './library/LibraryCloudBrowserDialog';
import {
  runLibrarySync,
  applySyncResult,
  LIBRARY_SYNC_EVENTS
} from '../utils/LibrarySyncService';
import { mimeForName, formatFileSize } from '../shared/library-mime';
import NextcloudService from '../services/NextcloudService';

/** Ruta de usuario a partir del href que devuelve el PROPFIND. */
function webdavRelativePath(href, username) {
  let clean = String(href || '').trim();
  try {
    if (/^https?:\/\//i.test(clean)) clean = new URL(clean).pathname;
  } catch (_) {
    /* href relativo */
  }
  clean = clean.replace(/\/+$/, '');
  const markers = [
    `/remote.php/dav/files/${encodeURIComponent(username)}`,
    `/remote.php/dav/files/${username}`
  ];
  for (const marker of markers) {
    const at = clean.indexOf(marker);
    if (at !== -1) return clean.slice(at + marker.length).replace(/^\/+/, '');
  }
  return clean.replace(/^\/+/, '');
}
import {
  NOTES_LAYOUT_STORAGE_KEY,
  isNotesLayout,
  readSavedNotesLayout
} from './notes/notesLayoutModes';
import { ghostCatalog } from '../themes/icon-themes/ghost-catalog';
import '../styles/components/documents.css';
import '../styles/components/library-sidebar.css';

const GHOST_NOTEBOOK_COLORS = Object.fromEntries(
  ghostCatalog.map(({ id, color }) => [id.toLowerCase(), color])
);

/** PrimeReact Tree ya muestra icono vía node.icon; el nodeTemplate añade el propio — quitamos duplicados (también en datos guardados). */
function stripTreeNodeIcons(nodes) {
  if (!nodes?.length) return nodes || [];
  return nodes.map((n) => {
    const { icon, expandedIcon, collapsedIcon, children, ...rest } = n;
    return {
      ...rest,
      ...(children?.length ? { children: stripTreeNodeIcons(children) } : {})
    };
  });
}

function collectDocumentFolderKeys(nodes, acc = []) {
  if (!nodes?.length) return acc;
  for (const n of nodes) {
    const isFolder = n.droppable || n.data?.type === 'document-folder';
    if (isFolder && n.children?.length) {
      acc.push(n.key);
      collectDocumentFolderKeys(n.children, acc);
    }
  }
  return acc;
}

function collectDocumentLabels(nodes, acc = []) {
  if (!nodes?.length) return acc;
  for (const n of nodes) {
    if (n.key === 'quick_note') continue;
    const isFolder = n.droppable || n.data?.type === 'document-folder';
    if (!isFolder) acc.push(n.label);
    if (n.children?.length) collectDocumentLabels(n.children, acc);
  }
  return acc;
}

function getUniqueNoteLabel(tree, base = 'Nueva nota') {
  const labels = collectDocumentLabels(tree);
  if (!labels.includes(base)) return base;
  let i = 2;
  while (labels.includes(`${base} (${i})`)) i += 1;
  return `${base} (${i})`;
}

/** Mismo icono de red que en el gestor de passwords (ir al árbol de conexiones). */
function ConnectionsNavIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <circle cx="6" cy="6" r="2" fill="currentColor" />
      <circle cx="18" cy="6" r="2" fill="currentColor" />
      <circle cx="6" cy="18" r="2" fill="currentColor" />
      <circle cx="18" cy="18" r="2" fill="currentColor" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
      <circle cx="12" cy="20" r="1.5" fill="currentColor" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="20" cy="12" r="1.5" fill="currentColor" />
      <line x1="12" y1="12" x2="6" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="12" y1="12" x2="18" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="12" y1="12" x2="6" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="12" y1="12" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="12" y1="12" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="12" y1="12" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="12" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="12" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

const DOC_HEADER_GLASS_BTN = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  padding: 0,
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  borderRadius: '8px',
  transition: 'all 0.2s ease'
};

const DOC_HEADER_ICON_WRAP = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '20px',
  height: '20px'
};

// Componente para renderizar la libreta con estilo adaptado al tema de iconos activo
export const NotebookIcon = ({ themeKey = 'nord', isOpen = false, size = 18 }) => {
  const key = themeKey.toLowerCase();
  
  if (key === 'cyberpunk') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'url(#cyberGlow)' }}>
        <rect x="5" y="3" width="15" height="18" rx="1" />
        <path d="M2 6h3M2 10h3M2 14h3M2 18h3" stroke="#ff0080" />
        <path d="M9 7h7M9 12h7" stroke="#00ff41" strokeWidth="1" opacity="0.7" />
      </svg>
    );
  }
  
  if (key === 'synthwave') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#120424" stroke="#ff007f" strokeWidth="2" style={{ filter: 'url(#synthGlowNew)' }}>
        <rect x="5" y="3" width="15" height="18" rx="1" />
        <path d="M2 6h3M2 10h3M2 14h3M2 18h3" stroke="#00d2ff" />
        <path d="M9 7h7M9 12h7" stroke="#ff007f" strokeWidth="1" opacity="0.7" />
      </svg>
    );
  }

  if (key === 'neon_matrix') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#001500" stroke="#39ff14" strokeWidth="1.5" style={{ filter: 'url(#nm_glow_new)' }}>
        <rect x="5" y="3" width="15" height="18" rx="1" />
        <path d="M2 6h3M2 10h3M2 14h3M2 18h3" stroke="#39ff14" />
        <rect x="9" y="7" width="7" height="1" fill="#39ff14" opacity="0.5" />
        <rect x="9" y="11" width="7" height="1" fill="#39ff14" opacity="0.3" />
      </svg>
    );
  }

  if (key === 'ghost_ui' || key.startsWith('ghost')) {
    const color = key === 'ghost_ui' ? 'white' : (GHOST_NOTEBOOK_COLORS[key] || 'white');
    return (
      <svg width={size} height={size} viewBox="1.5 1.5 21 21" fill="none" stroke={color} strokeWidth="1.05" style={{ filter: 'url(#ghost_glow_v5)' }}>
        <rect x="5" y="3" width="15" height="18" rx="2" />
        <path d="M2 6h3M2 10h3M2 14h3M2 18h3" stroke={color} strokeWidth="1.25" />
        <path d="M9 7h7M9 12h7" stroke={color} opacity="0.4" />
      </svg>
    );
  }

  if (key === 'minimal') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
        <rect x="5" y="3" width="15" height="18" rx="1" />
        <path d="M2 6h3M2 10h3M2 14h3M2 18h3" />
      </svg>
    );
  }

  if (key === 'linea') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="15" height="18" rx="1" />
        <path d="M2 6h3M2 10h3M2 14h3M2 18h3" stroke="#007ad9" />
      </svg>
    );
  }

  let coverColor = '#5e81ac';
  let spiralColor = '#88c0d0';
  let pageLineColor = 'rgba(255,255,255,0.4)';
  let extraElement = null;

  if (key === 'nord') {
    coverColor = '#5e81ac';
    spiralColor = '#88c0d0';
  } else if (key === 'dracula') {
    coverColor = '#bd93f9';
    spiralColor = '#ff79c6';
  } else if (key === 'material') {
    coverColor = '#1976d2';
    spiralColor = '#ffb74d';
  } else if (key === 'fluent') {
    coverColor = '#0078d4';
    spiralColor = '#50e6ff';
  } else if (key === 'cupertino') {
    coverColor = '#3092D6';
    spiralColor = '#7CC0EF';
  } else if (key === 'solarized') {
    coverColor = '#b58900';
    spiralColor = '#268bd2';
  } else if (key === 'vscode') {
    coverColor = '#dcb67a';
    spiralColor = '#f5d18a';
  } else if (key === 'atom') {
    coverColor = '#4fc3f7';
    spiralColor = '#81d4fa';
  } else if (key === 'monokai') {
    coverColor = '#f92672';
    spiralColor = '#fd971f';
  } else if (key === 'onedark') {
    coverColor = '#61afef';
    spiralColor = '#e5c07b';
  } else if (key === 'gruvbox') {
    coverColor = '#b16286';
    spiralColor = '#fabd2f';
  } else if (key === 'tokyonight') {
    coverColor = '#bb9af7';
    spiralColor = '#9aa5ce';
  } else if (key === 'palenight') {
    coverColor = '#c792ea';
    spiralColor = '#ffcb6b';
  } else if (key === 'nodetermbasic') {
    coverColor = '#42a5f5';
    spiralColor = '#64b5f6';
  } else if (key === 'retro gaming' || key === 'retrogaming') {
    coverColor = '#ff00ff';
    spiralColor = '#00ffff';
    extraElement = <rect x="9" y="10" width="6" height="4" fill="#ffff00" />;
  } else if (key === 'corporate') {
    coverColor = '#1e3a8a';
    spiralColor = '#3b82f6';
  } else if (key === 'nature') {
    coverColor = '#4ade80';
    spiralColor = '#fbbf24';
  } else if (key === 'space') {
    coverColor = '#1e1b4b';
    spiralColor = '#3b82f6';
    extraElement = (
      <>
        <circle cx="9" cy="8" r="0.5" fill="#ffffff" />
        <circle cx="14" cy="12" r="0.5" fill="#ffffff" />
      </>
    );
  } else if (key === 'ocean') {
    coverColor = '#0ea5e9';
    spiralColor = '#06b6d4';
  } else if (key === 'fire') {
    coverColor = '#ef4444';
    spiralColor = '#f97316';
  } else if (key === 'ice') {
    coverColor = '#0ea5e9';
    spiralColor = '#ffffff';
  } else if (key === 'forest') {
    coverColor = '#16a34a';
    spiralColor = '#22c55e';
  } else if (key === 'cyber_blue') {
    coverColor = '#1a2236';
    spiralColor = '#00f2fe';
    extraElement = <rect x="9" y="12" width="6" height="1" fill="#00f2fe" opacity="0.5" />;
  } else if (key === 'aurora') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="3" width="15" height="18" rx="2" fill="url(#au_f_bg)" stroke="url(#au_f_grad)" strokeWidth="1.8" style={{ filter: 'url(#au_f_glow)' }} />
        <path d="M2 6h3M2 10h3M2 14h3M2 18h3" stroke="#00FFFF" strokeWidth="1.5" />
      </svg>
    );
  } else if (key === 'obsidian_glass') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="3" width="15" height="18" rx="2" fill="#050505" stroke="#444" strokeWidth="2.5" />
        <rect x="5" y="3" width="15" height="18" rx="2" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <path d="M2 6h3M2 10h3M2 14h3M2 18h3" stroke="white" opacity="0.3" strokeWidth="1.5" />
      </svg>
    );
  } else if (key === 'crimson_tech') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="3" width="15" height="18" rx="1" fill="url(#cr_f_bg)" stroke="#ff0844" strokeWidth="1.5" style={{ filter: 'url(#cr_f_glow_v2)' }} />
        <path d="M2 6h3M2 10h3M2 14h3M2 18h3" stroke="#ffb199" strokeWidth="1.5" />
      </svg>
    );
  } else if (key === 'holo') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="3" width="15" height="18" rx="2" fill="url(#holoFolder1)" style={{ filter: 'url(#holoGlow)' }} />
        <rect x="5" y="3" width="15" height="18" rx="2" fill="url(#holoFolder2)" style={{ mixBlendMode: 'overlay' }} />
        <path d="M2 6h3M2 10h3M2 14h3M2 18h3" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="3" width="15" height="18" rx="2" fill={coverColor} />
      <path d="M2 6h3M2 10h3M2 14h3M2 18h3" stroke={spiralColor} strokeWidth="2" strokeLinecap="round" />
      <path d="M9 7h7M9 12h7M9 17h7" stroke={pageLineColor} strokeWidth="1" opacity="0.3" />
      {extraElement}
    </svg>
  );
};

const DocumentsSidebar = ({
  showToast,
  confirmDialog,
  uiTheme = 'Light',
  onBackToConnections,
  onOpenPasswords,
  showFavoritesView = false,
  onToggleFavoritesView,
  sidebarCollapsed,
  setSidebarCollapsed,
  explorerFont,
  explorerFontSize = 14,
  masterKey,
  secureStorage,
  sessionActionIconTheme = 'modern',
  sidebarFilter = '',
  treeTheme = 'cursorCompact',
  iconTheme = 'nord',
  setShowSettingsDialog,
  onShowImportDialog,
  onShowExportDialog,
  onShowImportExportDialog,
  onShowImportWizard,
  hideHeader = false
}) => {
  const { t: tCommon } = useTranslation('common');
  const [documentNodes, setDocumentNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionPackVersion, setActionPackVersion] = useState(0);

  useEffect(() => {
    ensureSessionActionIconTheme(sessionActionIconTheme);
  }, [sessionActionIconTheme]);
  useEffect(() => {
    return onSessionActionIconThemeLoaded((id) => {
      if ((sessionActionIconTheme || 'modern') !== id) return;
      setActionPackVersion((v) => v + 1);
    });
  }, [sessionActionIconTheme]);
  void actionPackVersion;

  useEffect(() => {
    setFavoriteSourceTrees({ documentNodes });
  }, [documentNodes]);
  // Lectura del árbol desde callbacks asíncronos sin arrastrar closures obsoletas
  const documentNodesRef = useRef(documentNodes);
  useEffect(() => { documentNodesRef.current = documentNodes; }, [documentNodes]);
  const [expandedKeys, setExpandedKeys] = useState(() => {
    try {
      const saved = localStorage.getItem('documents_expanded_keys');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  const [quickNotesPanelOpen, setQuickNotesPanelOpen] = useState(false);
  const [notesLayout, setNotesLayout] = useState(readSavedNotesLayout);
  const [browseStack, setBrowseStack] = useState([]);

  useEffect(() => {
    try { localStorage.setItem(NOTES_LAYOUT_STORAGE_KEY, notesLayout); } catch {}
    window.dispatchEvent(new CustomEvent('documents-sidebar:layout-state', {
      detail: { layout: notesLayout }
    }));
  }, [notesLayout]);

  useEffect(() => {
    const onSetLayout = (event) => {
      const next = event.detail?.layout;
      if (isNotesLayout(next)) setNotesLayout(next);
    };
    window.addEventListener('documents-sidebar:set-layout', onSetLayout);
    return () => window.removeEventListener('documents-sidebar:set-layout', onSetLayout);
  }, []);

  useEffect(() => {
    setBrowseStack((prev) => {
      const resolved = [];
      let level = documentNodes;
      for (const key of prev) {
        const folder = (level || []).find((node) => node && node.key === key && isNotebook(node));
        if (!folder) break;
        resolved.push(key);
        level = folder.children || [];
      }
      if (resolved.length === prev.length && resolved.every((key, index) => key === prev[index])) return prev;
      return resolved;
    });
  }, [documentNodes]);

  const selectedNodeForDetails = useMemo(() => {
    if (!selectedNodeKey) return null;
    let selectedKey = null;
    if (typeof selectedNodeKey === 'string') {
      selectedKey = selectedNodeKey;
    } else if (selectedNodeKey && typeof selectedNodeKey === 'object') {
      selectedKey = Object.keys(selectedNodeKey)[0];
    }
    return selectedKey ? findNodeInTree(documentNodes, selectedKey) : null;
  }, [selectedNodeKey, documentNodes]);

  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [homeTabActive, setHomeTabActive] = useState(getHomeTabActive);

  useEffect(() => subscribeHomeTabActive(setHomeTabActive), []);

  const isDetailsPanelVisible = useMemo(() => {
    if (homeTabActive) return false;
    if (!selectedNodeForDetails) return false;
    const data = selectedNodeForDetails.data;
    const isFolder = selectedNodeForDetails.droppable || data?.type === 'document-folder';
    const isNote = data && (data.type === 'document' || data.type === 'quick-note');
    return !isFolder && !data?.isShowMoreBtn && isNote;
  }, [selectedNodeForDetails, homeTabActive]);

  const countNotesInFolder = useCallback((folderNode) => {
    let count = 0;
    const traverse = (node) => {
      if (node.children) {
        node.children.forEach(child => {
          const isChildFolder = child.droppable || child.data?.type === 'document-folder';
          if (isChildFolder) {
            traverse(child);
          } else {
            count++;
          }
        });
      }
    };
    const fullNode = findNodeInTree(documentNodes, folderNode.key) || folderNode;
    traverse(fullNode);
    return count;
  }, [documentNodes]);

  const handleNodeUpdate = useCallback((updatedNode) => {
    setDocumentNodes(prev =>
      updateNodeInTree(prev, updatedNode.key, updatedNode)
    );
  }, []);

  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [parentKeyForNew, setParentKeyForNew] = useState(null);
  const [renamingNode, setRenamingNode] = useState(null);
  const [inlineRenamingKey, setInlineRenamingKey] = useState(null);
  const [inlineRenameValue, setInlineRenameValue] = useState('');
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [iconTargetNode, setIconTargetNode] = useState(null);

  const contextMenuRef = useRef(null);
  const [libraryAddAnchor, setLibraryAddAnchor] = useState(null);
  const inlineRenameInputRef = useRef(null);
  const sidebarRootRef = useRef(null);
  const documentClickTimerRef = useRef(null);
  const [contextMenuItems, setContextMenuItems] = useState([]);
  const [quickNotesCtxMenu, setQuickNotesCtxMenu] = useState(null);
  const [quickNotesCtxItems, setQuickNotesCtxItems] = useState([]);

  useEffect(() => {
    return () => {
      if (documentClickTimerRef.current) {
        clearTimeout(documentClickTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Soft reload on sync/events: never flip isLoading (avoids tree flash after first paint)
    const reloadFromStorage = async () => {
      try {
        const savedExp = localStorage.getItem('documents_expanded_keys');
        if (savedExp) setExpandedKeys(JSON.parse(savedExp));
      } catch {}
      const tree = await loadDocumentTree(secureStorage, masterKey);
      const hasQuickNote = tree.some(node => node.key === 'quick_note');
      if (!hasQuickNote) {
        tree.unshift({
          key: 'quick_note',
          label: 'Notas rápidas',
          type: 'quick-notes-group',
          droppable: false,
          children: []
        });
      } else {
        // Migrar nodo antiguo de nota única a contenedor
        const qn = tree.find(n => n.key === 'quick_note');
        if (qn && qn.type !== 'quick-notes-group') {
          qn.type = 'quick-notes-group';
          // Si tenía contenido, preservarlo como primer hijo
          if (qn.data?.content && qn.data.content.trim() && qn.data.content.trim() !== '<p></p>') {
            const migratedChild = {
              key: `quick_note_child_${Date.now()}`,
              label: 'Nota rápida',
              type: 'document',
              data: { ...qn.data }
            };
            qn.children = [migratedChild, ...(qn.children || [])];
          } else {
            qn.children = qn.children || [];
          }
          delete qn.data;
        }
      }
      setDocumentNodes(tree);
      setIsLoading(false);
    };
    window.addEventListener('documents-storage-updated', reloadFromStorage);
    return () => window.removeEventListener('documents-storage-updated', reloadFromStorage);
  }, [masterKey, secureStorage]);

  useEffect(() => {
    try {
      const s = JSON.stringify(expandedKeys);
      localStorage.setItem('documents_expanded_keys', s);
      localStorageSyncService.debouncedSync({ documents_expanded_keys: s });
    } catch {}
  }, [expandedKeys]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await waitForVaultSyncIfNeeded('documents_encrypted', 5000);
      if (cancelled) return;
      const tree = await loadDocumentTree(secureStorage, masterKey);
      if (cancelled) return;
      const hasQuickNote = tree.some(node => node.key === 'quick_note');
      if (!hasQuickNote) {
        tree.unshift({
          key: 'quick_note',
          label: 'Notas rápidas',
          type: 'quick-notes-group',
          droppable: false,
          children: []
        });
      } else {
        // Migrar nodo antiguo de nota única a contenedor
        const qn = tree.find(n => n.key === 'quick_note');
        if (qn && qn.type !== 'quick-notes-group') {
          qn.type = 'quick-notes-group';
          if (qn.data?.content && qn.data.content.trim() && qn.data.content.trim() !== '<p></p>') {
            const migratedChild = {
              key: `quick_note_child_${Date.now()}`,
              label: 'Nota rápida',
              type: 'document',
              data: { ...qn.data }
            };
            qn.children = [migratedChild, ...(qn.children || [])];
          } else {
            qn.children = qn.children || [];
          }
          delete qn.data;
        }
      }
      setDocumentNodes(tree);
      setIsLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [masterKey, secureStorage]);

  useEffect(() => {
    if (isLoading) return;
    saveDocumentTree(documentNodes, secureStorage, masterKey);
  }, [documentNodes, isLoading, secureStorage, masterKey]);



  const handleOpenDocument = useCallback((node, mode = 'reuse') => {
    if (isLinkedFolder(node) || isCloudFolder(node) || node.data?.type === 'document-folder' || node.droppable) return;
    if (isLibraryFile(node)) {
      window.dispatchEvent(new CustomEvent('open-library-file-tab', {
        detail: { key: node.key, label: node.label, data: node.data, mode }
      }));
      return;
    }
    if (getHomeTabActive() && mode === 'reuse') {
      window.dispatchEvent(new CustomEvent('open-home-note-panel', {
        detail: {
          key: node.key,
          label: node.label,
          data: node.data
        }
      }));
      return;
    }
    window.dispatchEvent(new CustomEvent('open-document-tab', {
      detail: {
        key: node.key,
        label: node.label,
        data: node.data,
        mode
      }
    }));
  }, []);

  const activateNotesItem = useCallback((node, mode = 'reuse') => {
    if (!node) return;
    if (isQuickNotesGroup(node)) {
      setSelectedNodeKey('quick_note');
      setQuickNotesPanelOpen(true);
      return;
    }
    if (isNotebook(node)) {
      if (mode !== 'new') {
        const path = findFolderPath(documentNodes, node.key);
        if (path) setBrowseStack(path);
      }
      return;
    }
    if (!isNote(node) && !isLibraryFile(node)) return;
    setSelectedNodeKey(node.key);
    setQuickNotesPanelOpen(false);
    if (mode === 'reuse') {
      if (documentClickTimerRef.current) clearTimeout(documentClickTimerRef.current);
      documentClickTimerRef.current = setTimeout(() => {
        documentClickTimerRef.current = null;
        handleOpenDocument(node, 'reuse');
      }, 250);
      return;
    }
    if (documentClickTimerRef.current) {
      clearTimeout(documentClickTimerRef.current);
      documentClickTimerRef.current = null;
    }
    handleOpenDocument(node, 'new');
  }, [documentNodes, handleOpenDocument]);

  const resolveSelectedKey = useCallback(() => {
    if (!selectedNodeKey) return null;
    if (typeof selectedNodeKey === 'string') return selectedNodeKey;
    if (typeof selectedNodeKey === 'object') {
      const keys = Object.keys(selectedNodeKey);
      return keys[0] || null;
    }
    return null;
  }, [selectedNodeKey]);

  const getParentKeyForNewNote = useCallback(() => {
    if (notesLayout !== 'tree' && browseStack.length) {
      return browseStack[browseStack.length - 1];
    }
    const key = resolveSelectedKey();
    if (!key || key === 'quick_note') return null;
    const node = findNodeInTree(documentNodes, key);
    if (!node) return null;
    const isFolder = node.droppable || node.data?.type === 'document-folder';
    return isFolder ? key : null;
  }, [documentNodes, resolveSelectedKey, notesLayout, browseStack]);

  const createNewDocumentInTree = useCallback((parentKey = null) => {
    let newDoc;
    setDocumentNodes(prev => {
      const label = getUniqueNoteLabel(prev);
      newDoc = createDocumentNode(label);
      return addNodeToTree(prev, parentKey, newDoc);
    });
    if (parentKey) {
      setExpandedKeys(prev => ({ ...prev, [parentKey]: true }));
    }
    if (newDoc) {
      setSelectedNodeKey(newDoc.key);
      setInlineRenamingKey(newDoc.key);
      setInlineRenameValue(newDoc.label);
    }
  }, []);

  // Crea una nueva nota dentro del contenedor de notas rápidas
  const createNewQuickNote = useCallback(() => {
    const newNote = createDocumentNode('Nueva nota rápida');
    setDocumentNodes(prev => {
      return prev.map(node => {
        if (node.key === 'quick_note') {
          return {
            ...node,
            children: [newNote, ...(node.children || [])]
          };
        }
        return node;
      });
    });
    // Abrir la nueva nota en el editor principal
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-document-tab', {
        detail: {
          key: newNote.key,
          label: newNote.label,
          data: newNote.data,
          mode: 'reuse'
        }
      }));
    }, 50);
  }, []);

  // Elimina una nota del contenedor de notas rápidas y la mueve a la papelera
  const deleteQuickNote = useCallback((noteNode) => {
    const performDelete = () => {
      const nodeCopy = JSON.parse(JSON.stringify(noteNode));
      setDocumentNodes(prev => prev.map(node => {
        if (node.key === 'quick_note') {
          return {
            ...node,
            children: (node.children || []).filter(c => c.key !== noteNode.key)
          };
        }
        return node;
      }));
      // Mover a papelera
      const trashItem = {
        id: `dtrash_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        key: noteNode.key,
        label: noteNode.label || 'Sin nombre',
        isFolder: false,
        isQuickNote: true,
        deletedAt: new Date().toISOString(),
        nodeData: nodeCopy,
      };
      setTrashedDocuments(prev => [trashItem, ...prev]);
      connectionStore.removeFavoritesForTreeNode(noteNode);
      showToast?.({
        severity: 'success',
        summary: 'Movido a la papelera',
        detail: `"${noteNode.label}" movido a la papelera`,
        life: 3000
      });
    };

    appConfirm({
      message: `¿Eliminar la nota rápida "${noteNode.label}"?`,
      header: 'Confirmar eliminación',
      severity: 'danger',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: performDelete
    });
  }, [showToast, setTrashedDocuments]);

  const handleCreateNewNote = useCallback(() => {
    createNewDocumentInTree(getParentKeyForNewNote());
  }, [createNewDocumentInTree, getParentKeyForNewNote]);

  const commitInlineRename = useCallback(() => {
    if (!inlineRenamingKey) return;
    const trimmed = inlineRenameValue.trim() || 'Nueva nota';
    setDocumentNodes(prev =>
      updateNodeInTree(prev, inlineRenamingKey, { label: trimmed })
    );
    connectionStore.updateFavoriteFields(inlineRenamingKey, { name: trimmed });
    setInlineRenamingKey(null);
    setInlineRenameValue('');
  }, [inlineRenamingKey, inlineRenameValue]);

  const cancelInlineRename = useCallback(() => {
    setInlineRenamingKey(null);
    setInlineRenameValue('');
  }, []);

  useEffect(() => {
    if (!inlineRenamingKey) return;
    const input = inlineRenameInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [inlineRenamingKey]);

  const handleCreateFolder = () => {
    if (!newItemName.trim()) return;
    const newFolder = createFolderNode(newItemName.trim());
    setDocumentNodes(prev => addNodeToTree(prev, parentKeyForNew, newFolder));
    if (parentKeyForNew) {
      setExpandedKeys(prev => ({ ...prev, [parentKeyForNew]: true }));
    }
    setShowNewFolderDialog(false);
    setNewItemName('');
    setParentKeyForNew(null);
    showToast?.({
      severity: 'success',
      summary: 'Carpeta creada',
      detail: `"${newFolder.label}" creada correctamente`,
      life: 3000
    });
  };

  const handleRename = () => {
    if (!newItemName.trim() || !renamingNode) return;
    const newName = newItemName.trim();
    setDocumentNodes(prev =>
      updateNodeInTree(prev, renamingNode.key, { label: newName })
    );
    if (isLibraryFile(renamingNode)) {
      window.dispatchEvent(new CustomEvent('library-file-updated', {
        detail: { key: renamingNode.key, label: newName }
      }));
    }
    connectionStore.updateFavoriteFields(renamingNode.key, { name: newName });
    setShowRenameDialog(false);
    setNewItemName('');
    setRenamingNode(null);
    showToast?.({
      severity: 'success',
      summary: 'Renombrado',
      detail: `Nombre actualizado a "${newName}"`,
      life: 3000
    });
  };

  const handleSelectFolderIcon = useCallback((iconId) => {
    if (!iconTargetNode) return;
    const selectedIcon = iconId === 'default' || iconId == null ? null : iconId;
    setDocumentNodes(prev => {
      const node = findNodeInTree(prev, iconTargetNode.key);
      if (!node) return prev;
      return updateNodeInTree(prev, iconTargetNode.key, {
        data: {
          ...(node.data || {}),
          customIcon: selectedIcon
        }
      });
    });
    setShowIconSelector(false);
    setIconTargetNode(null);
    showToast?.({
      severity: 'success',
      summary: 'Icono actualizado',
      detail: 'Icono de la carpeta actualizado',
      life: 2500
    });
  }, [iconTargetNode, showToast]);

  // ── Papelera de notas/documentos ─────────────────────────────────────────────────────
  const DOC_TRASH_KEY = 'nodeterm_trash_documents';
  const loadDocTrash = () => { try { return JSON.parse(localStorage.getItem(DOC_TRASH_KEY) || '[]'); } catch { return []; } };
  const [showDocTrashModal, setShowDocTrashModal] = useState(false);
  const [trashedDocuments, setTrashedDocuments] = useState(loadDocTrash);
  const [docTrashConfirm, setDocTrashConfirm] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(DOC_TRASH_KEY, JSON.stringify(trashedDocuments)); } catch(e) { console.warn('Error guardando papelera docs:', e); }
  }, [trashedDocuments]);

  const restoreDocumentFromTrash = useCallback((trashId) => {
    const item = trashedDocuments.find(i => i.id === trashId);
    if (!item || !item.nodeData) return;
    if (item.isQuickNote) {
      setDocumentNodes(prev => prev.map(node => {
        if (node.key === 'quick_note') {
          return {
            ...node,
            children: [item.nodeData, ...(node.children || [])]
          };
        }
        return node;
      }));
    } else {
      setDocumentNodes(prev => [item.nodeData, ...prev]);
    }
    setTrashedDocuments(prev => prev.filter(i => i.id !== trashId));
    showToast && showToast({ severity: 'success', summary: 'Restaurado', detail: `"${item.label}" restaurado`, life: 3000 });
  }, [trashedDocuments, showToast]);

  const executeDocTrashConfirm = useCallback(() => {
    if (!docTrashConfirm) return;
    if (docTrashConfirm.type === 'empty') {
      setTrashedDocuments([]);
    } else if (docTrashConfirm.type === 'single') {
      setTrashedDocuments(prev => prev.filter(i => i.id !== docTrashConfirm.id));
    }
    setDocTrashConfirm(null);
  }, [docTrashConfirm]);
  // ────────────────────────────────────────────────────────────────────────────

  // ── Biblioteca: ingesta de archivos y carpetas ──────────────────────────
  const {
    busy: ingestBusy,
    unlocked: libraryUnlocked,
    policyFor,
    pickAndAddFiles,
    pickAndImportFolder,
    linkLocalFolder,
    mountCloudFolder,
    saveCopyOfNode,
    importFromUrl,
    importFromClipboard,
    importFromDataTransfer,
    removeFileBlob
  } = useLibraryIngest({ documentNodes, setDocumentNodes, setExpandedKeys, showToast });

  const [urlImportTarget, setUrlImportTarget] = useState(null);
  const [cloudMountTarget, setCloudMountTarget] = useState(null);
  const [folderPropsNode, setFolderPropsNode] = useState(null);
  const [dropTargetKey, setDropTargetKey] = useState(null);
  const dropDepthRef = useRef(0);

  /** Carpeta destino por defecto: la seleccionada, o la raíz. */
  const resolveIngestFolderKey = useCallback((node) => {
    if (node && isManagedFolder(node)) return node.key;
    if (notesLayout !== 'tree' && browseStack.length) return browseStack[browseStack.length - 1];
    return getParentKeyForNewNote();
  }, [notesLayout, browseStack, getParentKeyForNewNote]);

  /** El portapapeles pregunta si se guarda copia: no hay carpeta de origen. */
  const pasteIntoLibrary = useCallback(async (folderKey) => {
    const saveCopy = await appConfirm({
      header: 'Pegar en la biblioteca',
      message: '¿Guardar una copia dentro de NodeTerm? Si eliges solo abrir, el contenido se muestra y no se copia.',
      severity: 'info',
      acceptLabel: 'Guardar copia',
      rejectLabel: 'Solo abrir'
    });
    await importFromClipboard(folderKey, { saveCopy });
  }, [importFromClipboard]);

  /** Cada acción dice si copia o solo lee en el sitio. */
  const buildIngestMenuItems = useCallback((folderKey, folderLabel) => ([
    {
      label: 'Importar carpeta a NodeTerm…',
      icon: 'pi pi-folder-open',
      command: () => pickAndImportFolder(folderKey)
    },
    {
      label: 'Conectar carpeta de Windows…',
      icon: 'pi pi-desktop',
      command: () => linkLocalFolder(folderKey)
    },
    {
      label: 'Montar carpeta de Nextcloud…',
      icon: 'pi pi-cloud',
      command: () => setCloudMountTarget({ key: folderKey, label: folderLabel })
    },
    { separator: true },
    {
      label: 'Enlazar archivos sueltos…',
      icon: 'pi pi-file',
      command: () => pickAndAddFiles(folderKey, { saveCopy: false })
    },
    {
      label: 'Añadir desde URL…',
      icon: 'pi pi-cloud-download',
      command: () => setUrlImportTarget({ key: folderKey, label: folderLabel })
    },
    {
      label: 'Pegar del portapapeles',
      icon: 'pi pi-clipboard',
      command: () => pasteIntoLibrary(folderKey)
    }
  ]), [pickAndImportFolder, linkLocalFolder, pickAndAddFiles, pasteIntoLibrary]);

  const libraryAddMenuModel = useMemo(
    () => buildIngestMenuItems(resolveIngestFolderKey(null), null),
    [buildIngestMenuItems, resolveIngestFolderKey]
  );

  const folderPropsPolicy = useMemo(
    () => (folderPropsNode ? policyFor(folderPropsNode.key) : { vaultMode: 'plain', syncMode: 'none', inheritedFrom: null }),
    [folderPropsNode, policyFor]
  );

  const folderPropsStats = useMemo(() => {
    if (!folderPropsNode) return { files: 0, bytes: 0 };
    const current = findNodeInTree(documentNodes, folderPropsNode.key) || folderPropsNode;
    const managed = collectManagedFiles([current]);
    return {
      files: managed.length,
      bytes: managed.reduce((sum, { node }) => sum + (Number(node.data?.size) || 0), 0)
    };
  }, [folderPropsNode, documentNodes]);

  /**
   * Guarda la política de la carpeta. Si cambia el cifrado, reescribe en disco
   * los blobs de todo el subárbol antes de persistir el nuevo modo.
   */
  const handleFolderPropsConfirm = useCallback(async ({ vaultMode, syncMode }) => {
    const target = folderPropsNode;
    if (!target) return;
    setFolderPropsNode(null);

    const previous = policyFor(target.key);
    const current = findNodeInTree(documentNodes, target.key) || target;

    if (vaultMode !== previous.vaultMode) {
      const relPaths = collectManagedFiles([current])
        .map(({ node }) => node.data?.relPath)
        .filter(Boolean);
      if (relPaths.length) {
        const result = await window.electron?.library?.convertBlobs({
          relPaths,
          encrypt: vaultMode === 'encrypted'
        });
        if (!result?.success) {
          showToast?.({
            severity: 'error',
            summary: 'No se pudo cambiar el cifrado',
            detail: result?.error || 'Revisa que el vault esté desbloqueado.',
            life: 6000
          });
          return;
        }
        if (result.failed?.length) {
          showToast?.({
            severity: 'warn',
            summary: 'Cifrado parcialmente aplicado',
            detail: `${result.converted} convertidos, ${result.failed.length} con errores.`,
            life: 6000
          });
        }
      }
    }

    setDocumentNodes(prev => updateNodeInTree(prev, target.key, {
      data: { ...(findNodeInTree(prev, target.key)?.data || {}), vaultMode, syncMode }
    }));
    showToast?.({
      severity: 'success',
      summary: 'Propiedades guardadas',
      detail: `"${target.label}": ${vaultMode === 'encrypted' ? 'copias cifradas' : 'copias sin cifrar'}, ${syncMode === 'nextcloud' ? 'se copian a otros equipos' : 'solo en este equipo'}.`,
      life: 3500
    });
  }, [folderPropsNode, policyFor, documentNodes, showToast]);

  // Carga bajo demanda del contenido de una carpeta local enlazada
  const loadLinkedFolderChildren = useCallback(async (node) => {
    if (!isLinkedFolder(node) || !node.data?.absPath) return;
    const result = await window.electron?.library?.listLinked(node.data.absPath);
    if (!result?.success) {
      showToast?.({
        severity: 'error',
        summary: 'No se pudo leer la carpeta',
        detail: result?.error || node.data.absPath,
        life: 5000
      });
      return;
    }
    const children = (result.files || [])
      .sort((a, b) => {
        if ((a.type === 'directory') !== (b.type === 'directory')) return a.type === 'directory' ? -1 : 1;
        return String(a.name).localeCompare(String(b.name), 'es');
      })
      .map((item) => (
        item.type === 'directory'
          ? {
              key: `libmount_${item.path}`,
              label: item.name,
              type: 'linked-folder',
              droppable: false,
              leaf: false,
              children: [],
              data: { type: 'linked-folder', absPath: item.path, lazy: true, virtual: true }
            }
          : {
              key: `libfile_linked_${item.path}`,
              label: item.name,
              type: 'library-file',
              droppable: false,
              leaf: true,
              data: {
                type: 'library-file',
                storage: 'linked',
                relPath: null,
                absPath: item.path,
                mime: item.mime || mimeForName(item.name),
                size: item.size || 0,
                virtual: true,
                origin: { kind: 'local', ref: item.path, fetchedAt: Date.now() }
              }
            }
      ));

    setDocumentNodes(prev => updateNodeInTree(prev, node.key, { children, leaf: children.length === 0 }));
  }, [setDocumentNodes, showToast]);

  const loadCloudFolderChildren = useCallback(async (node) => {
    if (!isCloudFolder(node)) return;
    const service = new NextcloudService();
    const ok = await service.loadConfig();
    if (!ok || !service.isConfigured) {
      showToast?.({
        severity: 'warn',
        summary: 'Nextcloud',
        detail: 'Configura la cuenta en Ajustes → Sincronización.',
        life: 5000
      });
      return;
    }
    const result = await window.electron?.library?.listWebdav({
      baseUrl: service.baseUrl,
      username: service.username,
      password: service.password,
      ignoreSSLErrors: !!service.ignoreSSLErrors,
      path: node.data?.remotePath || ''
    });
    if (!result?.success) {
      showToast?.({
        severity: 'error',
        summary: 'No se pudo leer Nextcloud',
        detail: result?.error || node.data?.remotePath,
        life: 5000
      });
      return;
    }
    const children = (result.entries || []).map((item) => {
      const remotePath = webdavRelativePath(item.path, service.username);
      if (item.isDirectory) {
        return {
          key: `libcloud_${remotePath}`,
          label: item.name,
          type: 'cloud-folder',
          droppable: false,
          leaf: false,
          children: [],
          data: { type: 'cloud-folder', remotePath, lazy: true, virtual: true }
        };
      }
      return {
        key: `libfile_webdav_${remotePath}`,
        label: item.name,
        type: 'library-file',
        droppable: false,
        leaf: true,
        data: {
          type: 'library-file',
          storage: 'webdav',
          remotePath,
          relPath: null,
          absPath: null,
          mime: item.mime || mimeForName(item.name),
          size: item.size || 0,
          virtual: true,
          origin: { kind: 'webdav', ref: remotePath, fetchedAt: Date.now() }
        }
      };
    });
    setDocumentNodes((prev) => updateNodeInTree(prev, node.key, { children, leaf: children.length === 0 }));
  }, [setDocumentNodes, showToast]);

  // Soltar archivos del explorador del sistema sobre el árbol
  const handleNativeDragOver = useCallback((e) => {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleNativeDragEnter = useCallback((e) => {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    dropDepthRef.current += 1;
    setDropTargetKey(resolveIngestFolderKey(null) || '__root__');
  }, [resolveIngestFolderKey]);

  const handleNativeDragLeave = useCallback((e) => {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    dropDepthRef.current = Math.max(0, dropDepthRef.current - 1);
    if (dropDepthRef.current === 0) setDropTargetKey(null);
  }, []);

  const handleNativeDrop = useCallback(async (e) => {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dropDepthRef.current = 0;
    setDropTargetKey(null);
    const folderKey = resolveIngestFolderKey(null);
    await importFromDataTransfer(folderKey, e.dataTransfer, { saveCopy: false });
  }, [resolveIngestFolderKey, importFromDataTransfer]);

  // Ctrl+V sobre el árbol pega una captura o texto como archivo
  useEffect(() => {
    const root = sidebarRootRef.current;
    if (!root) return undefined;
    const onPaste = (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (!root.contains(target)) return;
      e.preventDefault();
      pasteIntoLibrary(resolveIngestFolderKey(null));
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [pasteIntoLibrary, resolveIngestFolderKey]);

  const handleDelete = (node) => {
    // Guardar copia del nodo antes de eliminar
    const nodeCopy = JSON.parse(JSON.stringify(node));
    // Los blobs managed del subárbol se borran del disco al eliminar el nodo
    const managed = collectManagedFiles([nodeCopy]);
    managed.forEach(({ node: fileNode }) => removeFileBlob(fileNode));
    const removedKeys = [nodeCopy.key, ...managed.map(({ node: fileNode }) => fileNode.key)];
    window.dispatchEvent(new CustomEvent('library-file-removed', { detail: { keys: removedKeys } }));
    // Eliminar del árbol
    setDocumentNodes(prev => removeNodeFromTree(prev, node.key));
    // Mover a papelera
    const trashItem = {
      id: `dtrash_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      key: node.key,
      label: node.label || 'Sin nombre',
      isFolder: !!(node.droppable || node.data?.type === 'document-folder'),
      deletedAt: new Date().toISOString(),
      nodeData: nodeCopy,
    };
    setTrashedDocuments(prev => [trashItem, ...prev]);
    connectionStore.removeFavoritesForTreeNode(findNodeInTree(documentNodes, node.key) || node);
    showToast?.({
      severity: 'success',
      summary: 'Movido a la papelera',
      detail: `"${node.label}" movido a la papelera`,
      life: 3000
    });
  };

  const onContextMenu = (event) => {
    const node = event.node;
    if (!node) return;

    event.originalEvent?.stopPropagation();
    event.originalEvent?.preventDefault();

    const isFolder = node.droppable || node.data?.type === 'document-folder';
    const items = [];

    if (node.key === 'quick_note') {
      items.push({
        label: 'Abrir notas rápidas',
        icon: 'pi pi-bolt',
        command: () => {
          setSelectedNodeKey('quick_note');
          setQuickNotesPanelOpen(true);
        }
      });
      setContextMenuItems(items);
      contextMenuRef.current?.show(event.originalEvent);
      return;
    }

    if (isCloudFolder(node)) {
      items.push(
        {
          label: 'Actualizar contenido',
          icon: 'pi pi-refresh',
          command: () => loadCloudFolderChildren(node)
        }
      );
      if (!node.data?.virtual) {
        items.push(
          { separator: true },
          {
            label: 'Quitar montaje',
            icon: 'pi pi-times',
            command: () => handleDelete(node)
          }
        );
      }
      setContextMenuItems(items);
      contextMenuRef.current?.show(event.originalEvent);
      return;
    }

    if (isLinkedFolder(node)) {
      items.push(
        {
          label: 'Actualizar contenido',
          icon: 'pi pi-refresh',
          command: () => loadLinkedFolderChildren(node)
        },
        {
          label: 'Abrir en el explorador',
          icon: 'pi pi-folder-open',
          command: () => window.electron?.library?.reveal({ storage: 'linked', absPath: node.data?.absPath })
        }
      );
      // Las carpetas virtuales descubiertas al navegar no viven en el árbol
      if (!node.data?.virtual) {
        items.push(
          { separator: true },
          {
            label: 'Quitar enlace',
            icon: 'pi pi-times',
            command: () => handleDelete(node)
          }
        );
      }
      setContextMenuItems(items);
      contextMenuRef.current?.show(event.originalEvent);
      return;
    }

    if (isLibraryFile(node)) {
      items.push(
        { label: 'Abrir', icon: 'pi pi-external-link', command: () => handleOpenDocument(node, 'reuse') },
        { label: 'Abrir en pestaña nueva', icon: 'pi pi-plus', command: () => handleOpenDocument(node, 'new') },
        { separator: true }
      );
      if (node.data?.storage === 'linked' || node.data?.storage === 'webdav') {
        items.push({
          label: 'Guardar copia en NodeTerm',
          icon: 'pi pi-save',
          command: () => saveCopyOfNode(node)
        });
      }
      if (node.data?.storage !== 'webdav') {
        items.push(
        {
          label: 'Abrir con aplicación externa',
          icon: 'pi pi-desktop',
          command: () => window.electron?.library?.openExternal({
            storage: node.data?.storage,
            relPath: node.data?.relPath,
            absPath: node.data?.absPath
          })
        },
        {
          label: 'Mostrar en el explorador',
          icon: 'pi pi-folder-open',
          command: () => window.electron?.library?.reveal({
            storage: node.data?.storage,
            relPath: node.data?.relPath,
            absPath: node.data?.absPath
          })
        },
        {
          label: 'Guardar una copia…',
          icon: 'pi pi-download',
          command: () => window.electron?.library?.exportFile({
            storage: node.data?.storage,
            relPath: node.data?.relPath,
            absPath: node.data?.absPath,
            fileName: node.label
          })
        }
      );
      }
      if (!node.data?.virtual) {
        items.push(
          { separator: true },
          {
            label: 'Renombrar',
            icon: 'pi pi-pencil',
            command: () => {
              setRenamingNode(node);
              setNewItemName(node.label);
              setShowRenameDialog(true);
            }
          },
          { label: 'Eliminar', icon: 'pi pi-trash', command: () => handleDelete(node) }
        );
      }
      setContextMenuItems(items);
      contextMenuRef.current?.show(event.originalEvent);
      return;
    }

    if (isFolder) {
      items.push(
        {
          label: 'Nueva nota',
          icon: 'pi pi-file',
          command: () => createNewDocumentInTree(node.key)
        },
        {
          label: 'Nueva subcarpeta',
          icon: 'pi pi-folder-plus',
          command: () => {
            setParentKeyForNew(node.key);
            setNewItemName('');
            setShowNewFolderDialog(true);
          }
        },
        { separator: true },
        ...buildIngestMenuItems(node.key, node.label),
        { separator: true },
        {
          label: 'Cambiar icono',
          icon: 'pi pi-image',
          command: () => {
            setIconTargetNode(node);
            setShowIconSelector(true);
          }
        },
        {
          label: 'Propiedades…',
          icon: 'pi pi-sliders-h',
          command: () => setFolderPropsNode(node)
        },
        { separator: true }
      );
    } else {
      const noteConnection = {
        id: node.key,
        type: node.data?.type || 'document',
        name: node.label,
        ...node.data
      };
      const isFav = connectionStore.isFavorite(noteConnection);

      items.push({
        label: 'Abrir nota',
        icon: 'pi pi-external-link',
        command: () => handleOpenDocument(node, 'reuse')
      });
      items.push({
        label: 'Abrir en pestaña nueva',
        icon: 'pi pi-plus',
        command: () => handleOpenDocument(node, 'new')
      });
      items.push({
        label: isFav ? 'Quitar de favoritos' : 'Añadir a favoritos',
        icon: isFav ? 'pi pi-star-fill' : 'pi pi-star',
        command: () => {
          connectionStore.toggleFavorite(noteConnection);
          showToast && showToast({
            severity: 'success',
            summary: isFav ? 'Quitado de favoritos' : 'Añadido a favoritos',
            detail: `"${node.label}" ${isFav ? 'quitado de' : 'añadido a'} favoritos`,
            life: 3000
          });
        }
      });
      items.push({ separator: true });
    }

    items.push(
      {
        label: 'Renombrar',
        icon: 'pi pi-pencil',
        command: () => {
          setRenamingNode(node);
          setNewItemName(node.label);
          setShowRenameDialog(true);
        }
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => handleDelete(node)
      }
    );

    setContextMenuItems(items);
    contextMenuRef.current?.show(event.originalEvent);
  };

  const onBrowserContextMenu = (event, node) => {
    onContextMenu({ node, originalEvent: event });
  };

  const handleEmptySpaceContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const targetKey = resolveIngestFolderKey(null);
    const targetLabel = targetKey ? findNodeInTree(documentNodes, targetKey)?.label : null;

    const items = [
      {
        label: 'Nueva nota',
        icon: 'pi pi-file',
        command: () => handleCreateNewNote()
      },
      {
        label: 'Nueva carpeta',
        icon: 'pi pi-folder-plus',
        command: () => {
          setParentKeyForNew(null);
          setNewItemName('');
          setShowNewFolderDialog(true);
        }
      },
      { separator: true },
      ...buildIngestMenuItems(targetKey, targetLabel)
    ];

    setContextMenuItems(items);
    contextMenuRef.current?.show(e);
  };

  const onDragDrop = (event) => {
    const { dragNode, dropNode, dropPoint, dropIndex } = event || {};
    if (!dragNode?.key || dragNode.key === 'quick_note') return;
    if (isShowMoreTreeNode(dragNode) || isShowMoreTreeNode(dropNode)) return;

    // El contenido de una carpeta enlazada es un reflejo del disco: ni se
    // reordena ni se puede soltar nada dentro desde el árbol.
    if (dragNode.data?.virtual || isLinkedFolder(dropNode) || isCloudFolder(dropNode) || dropNode?.data?.virtual) {
      return;
    }

    if (dropNode?.key && isDescendantInFullTree(documentNodes, dragNode.key, dropNode.key)) {
      return;
    }

    // Mover un archivo managed entre carpetas reubica también su blob
    if (isLibraryFile(dragNode) && dragNode.data?.storage === 'managed' && dragNode.data?.relPath) {
      const targetFolderKey = dropPoint === 0 ? dropNode?.key : null;
      window.electron?.library
        ?.moveFile({ relPath: dragNode.data.relPath, folderKey: targetFolderKey, fileName: dragNode.label })
        .then((result) => {
          if (result?.success && result.relPath !== dragNode.data.relPath) {
            setDocumentNodes((prev) => updateNodeInTree(prev, dragNode.key, {
              data: { ...(findNodeInTree(prev, dragNode.key)?.data || {}), relPath: result.relPath }
            }));
          }
        })
        .catch(() => {});
    }

    setDocumentNodes((prevNodes) => {
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

  const filteredDocumentNodes = useMemo(() => {
    return documentNodes.filter(node => node.key !== 'quick_note');
  }, [documentNodes]);

  const treeValue = useMemo(
    () => stripTreeNodeIcons(filteredDocumentNodes),
    [filteredDocumentNodes]
  );

  const folderKeysAll = useMemo(
    () => collectDocumentFolderKeys(documentNodes, []),
    [documentNodes]
  );

  const allDocTreeExpanded = useMemo(() => {
    if (!folderKeysAll.length) return true;
    return folderKeysAll.every((k) => expandedKeys[k]);
  }, [folderKeysAll, expandedKeys]);

  const toggleExpandAllDocuments = useCallback(() => {
    if (!folderKeysAll.length) return;
    if (allDocTreeExpanded) {
      setExpandedKeys({});
    } else {
      setExpandedKeys(Object.fromEntries(folderKeysAll.map((k) => [k, true])));
    }
  }, [folderKeysAll, allDocTreeExpanded]);

  const nodeTemplate = (node) => {
    const isFolder = node.droppable || node.data?.type === 'document-folder' || isLinkedFolder(node) || isCloudFolder(node);
    const isInlineRenaming = inlineRenamingKey === node.key;
    const fileNode = isLibraryFile(node);
    return (
      <span
        className="document-tree-node"
        onClick={(e) => {
          if (isInlineRenaming) {
            e.stopPropagation();
            return;
          }
          if (!isFolder) {
            e.stopPropagation();
            setSelectedNodeKey(node.key);
            setQuickNotesPanelOpen(false);
            if (documentClickTimerRef.current) {
              clearTimeout(documentClickTimerRef.current);
            }
            documentClickTimerRef.current = setTimeout(() => {
              documentClickTimerRef.current = null;
              handleOpenDocument(node, 'reuse');
            }, 250);
          }
        }}
        onDoubleClick={(e) => {
          if (isInlineRenaming || isFolder) return;
          e.stopPropagation();
          if (documentClickTimerRef.current) {
            clearTimeout(documentClickTimerRef.current);
            documentClickTimerRef.current = null;
          }
          setSelectedNodeKey(node.key);
          setQuickNotesPanelOpen(false);
          handleOpenDocument(node, 'new');
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: isFolder ? 'default' : 'pointer',
          fontFamily: explorerFont || 'inherit',
          width: '100%',
          minWidth: 0,
          overflow: 'hidden'
        }}
      >
        <span
          style={{
            minWidth: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 20,
            flexShrink: 0
          }}
        >
          {renderDocumentNodeIcon(node, {
            iconTheme,
            size: 18,
            expanded: Boolean(node.expanded),
            NotebookIcon
          })}
        </span>
        {isInlineRenaming ? (
          <InputText
            ref={inlineRenamingKey === node.key ? inlineRenameInputRef : null}
            value={inlineRenameValue}
            onChange={(e) => setInlineRenameValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                commitInlineRename();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelInlineRename();
              }
            }}
            onBlur={commitInlineRename}
            className="document-inline-rename-input"
            style={{
              flex: 1,
              minWidth: 0,
              height: 22,
              padding: '0 4px',
              fontSize: 'inherit',
              fontFamily: 'inherit'
            }}
          />
        ) : (
          <span
            className="node-label"
            title={node.label}
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: '20px',
              height: 20
            }}
          >
            {node.label}
          </span>
        )}
        {!isInlineRenaming && isFolder && !isLinkedFolder(node) && !isCloudFolder(node) && (() => {
          const count = countNotesInFolder(node);
          return count > 0 ? (
            <span className="qnp-count-badge" style={{ marginLeft: 'auto', marginRight: '4px', flexShrink: 0 }}>{count}</span>
          ) : null;
        })()}
        {!isInlineRenaming && fileNode && node.data?.size > 0 && (
          <span
            className="qnp-count-badge"
            style={{ marginLeft: 'auto', marginRight: '4px', flexShrink: 0, opacity: 0.65 }}
          >
            {formatFileSize(node.data.size)}
          </span>
        )}
      </span>
    );
  };

  // Sync external updates when a document is saved from the editor
  useEffect(() => {
    const handler = (e) => {
      const { key, content, markdownSource, tags } = e.detail || {};
      if (!key) return;
      setDocumentNodes(prev =>
        updateNodeInTree(prev, key, {
          data: {
            content,
            markdownSource,
            ...(Array.isArray(tags) ? { tags } : {}),
            updatedAt: Date.now()
          }
        })
      );
    };
    window.addEventListener('document-content-updated', handler);
    return () => window.removeEventListener('document-content-updated', handler);
  }, []);

  // Sync external title updates when renamed in the editor
  useEffect(() => {
    const handler = (e) => {
      const { key, label } = e.detail || {};
      if (!key || !label) return;
      setDocumentNodes(prev =>
        updateNodeInTree(prev, key, { label })
      );
      connectionStore.updateFavoriteFields(key, { name: label });
    };
    window.addEventListener('document-title-updated', handler);
    return () => window.removeEventListener('document-title-updated', handler);
  }, []);

  // Sync external icon updates when changed in the editor
  useEffect(() => {
    const handler = (e) => {
      const { key, icon } = e.detail || {};
      if (!key) return;
      setDocumentNodes(prev => {
        const node = findNodeInTree(prev, key);
        if (!node) return prev;
        return updateNodeInTree(prev, key, {
          data: {
            ...(node.data || {}),
            icon: icon || null
          }
        });
      });
    };
    window.addEventListener('document-icon-updated', handler);
    return () => window.removeEventListener('document-icon-updated', handler);
  }, []);

  const openNewFolderDialog = () => {
    setParentKeyForNew(notesLayout !== 'tree' && browseStack.length ? browseStack[browseStack.length - 1] : null);
    setNewItemName('');
    setShowNewFolderDialog(true);
  };

  // Listen to events from the unified sidebar toolbar when hideHeader=true
  useEffect(() => {
    if (!hideHeader) return;
    const onNewDoc = () => handleCreateNewNote();
    const onNewFolder = () => openNewFolderDialog();
    const onToggleExpandAll = () => toggleExpandAllDocuments();
    const folderKey = () => resolveIngestFolderKey(null);
    const onImportFolder = () => pickAndImportFolder(folderKey());
    const onLinkFolder = () => linkLocalFolder(folderKey());
    const onMountCloud = () => setCloudMountTarget({ key: folderKey() });
    const onLinkFiles = () => pickAndAddFiles(folderKey(), { saveCopy: false });
    const onAddUrl = () => setUrlImportTarget({ key: folderKey(), label: null });
    const onPaste = () => pasteIntoLibrary(folderKey());
    window.addEventListener('documents-sidebar:new-doc', onNewDoc);
    window.addEventListener('documents-sidebar:new-folder', onNewFolder);
    window.addEventListener('documents-sidebar:toggle-expand-all', onToggleExpandAll);
    window.addEventListener('documents-sidebar:import-folder', onImportFolder);
    window.addEventListener('documents-sidebar:link-folder', onLinkFolder);
    window.addEventListener('documents-sidebar:mount-cloud', onMountCloud);
    window.addEventListener('documents-sidebar:link-files', onLinkFiles);
    window.addEventListener('documents-sidebar:add-url', onAddUrl);
    window.addEventListener('documents-sidebar:paste', onPaste);
    return () => {
      window.removeEventListener('documents-sidebar:new-doc', onNewDoc);
      window.removeEventListener('documents-sidebar:new-folder', onNewFolder);
      window.removeEventListener('documents-sidebar:toggle-expand-all', onToggleExpandAll);
      window.removeEventListener('documents-sidebar:import-folder', onImportFolder);
      window.removeEventListener('documents-sidebar:link-folder', onLinkFolder);
      window.removeEventListener('documents-sidebar:mount-cloud', onMountCloud);
      window.removeEventListener('documents-sidebar:link-files', onLinkFiles);
      window.removeEventListener('documents-sidebar:add-url', onAddUrl);
      window.removeEventListener('documents-sidebar:paste', onPaste);
    };
  }, [
    hideHeader,
    toggleExpandAllDocuments,
    handleCreateNewNote,
    resolveIngestFolderKey,
    pickAndImportFolder,
    linkLocalFolder,
    pickAndAddFiles,
    pasteIntoLibrary
  ]);

  useEffect(() => {
    if (!hideHeader) return;
    window.dispatchEvent(new CustomEvent('documents-sidebar:expand-state', {
      detail: { allExpanded: allDocTreeExpanded }
    }));
  }, [hideHeader, allDocTreeExpanded]);

  // Sincronización de blobs: la pide SyncManager y se resuelve aquí porque el
  // árbol vivo es estado de este componente.
  useEffect(() => {
    const onSyncRequest = async (event) => {
      const requestId = event.detail?.requestId;
      let result;
      try {
        result = await runLibrarySync(documentNodesRef.current || []);
        if (result?.success && !result.skipped) {
          const { tree, inserted } = applySyncResult(documentNodesRef.current || [], result);
          // El efecto de persistencia se encarga de guardar el árbol
          if (inserted > 0) setDocumentNodes(tree);
          if (result.conflicts?.length) {
            showToast?.({
              severity: 'warn',
              summary: 'Conflictos en la biblioteca',
              detail: `${result.conflicts.length} archivo(s) cambiaron en los dos lados. Se conservó la versión remota como copia aparte.`,
              life: 8000
            });
          }
        }
      } catch (err) {
        result = { success: false, error: err?.message || String(err) };
      }
      window.dispatchEvent(new CustomEvent(LIBRARY_SYNC_EVENTS.DONE_EVENT, {
        detail: { requestId, result }
      }));
    };
    window.addEventListener(LIBRARY_SYNC_EVENTS.REQUEST_EVENT, onSyncRequest);
    return () => window.removeEventListener(LIBRARY_SYNC_EVENTS.REQUEST_EVENT, onSyncRequest);
  }, [showToast]);

  const isFolderSelected = useMemo(() => {
    const node = selectedNodeForDetails;
    return node && (node.droppable || node.data?.type === 'document-folder');
  }, [selectedNodeForDetails]);

  const isQuickNoteSelected = useMemo(() => {
    if (selectedNodeKey === 'quick_note') return true;
    const qn = documentNodes.find(n => n.key === 'quick_note');
    if (qn && qn.children) {
      return qn.children.some(child => child.key === selectedNodeKey);
    }
    return false;
  }, [selectedNodeKey, documentNodes]);

  const activePanelTitle = useMemo(() => {
    if (isQuickNoteSelected) return 'Notas rápidas';
    if (isFolderSelected && selectedNodeForDetails) return selectedNodeForDetails.label;
    return 'Biblioteca';
  }, [isQuickNoteSelected, isFolderSelected, selectedNodeForDetails]);

  const activePanelIconClass = useMemo(() => {
    return isQuickNoteSelected ? 'pi pi-bolt' : 'pi pi-folder';
  }, [isQuickNoteSelected]);

  const activePanelIconColor = useMemo(() => {
    return isQuickNoteSelected ? '#ffc107' : '#ffc107';
  }, [isQuickNoteSelected]);

  const activePanelNotes = useMemo(() => {
    if (isQuickNoteSelected) {
      const qn = documentNodes.find(n => n.key === 'quick_note');
      return qn?.children || [];
    }
    if (isFolderSelected && selectedNodeForDetails) {
      return (selectedNodeForDetails.children || []).filter(
        c => !(c.droppable || c.data?.type === 'document-folder')
      );
    }
    return [];
  }, [isQuickNoteSelected, isFolderSelected, selectedNodeForDetails, documentNodes]);

  // Abrir una nota rápida en el editor principal
  const handleOpenQuickNote = useCallback((node, mode = 'reuse') => {
    setSelectedNodeKey(node.key);
    setQuickNotesPanelOpen(false);
    handleOpenDocument(node, mode);
  }, [handleOpenDocument]);

  const handleCreateNoteInPanel = useCallback(() => {
    if (isQuickNoteSelected) {
      createNewQuickNote();
    } else if (isFolderSelected && selectedNodeForDetails) {
      const folderKey = selectedNodeForDetails.key;
      let newDoc;
      setDocumentNodes(prev => {
        const label = getUniqueNoteLabel(prev, 'Nueva nota');
        newDoc = createDocumentNode(label);
        return addNodeToTree(prev, folderKey, newDoc);
      });
      setExpandedKeys(prev => ({ ...prev, [folderKey]: true }));
      setTimeout(() => {
        if (newDoc) {
          window.dispatchEvent(new CustomEvent('open-document-tab', {
            detail: {
              key: newDoc.key,
              label: newDoc.label,
              data: newDoc.data,
              mode: 'reuse'
            }
          }));
        }
      }, 50);
    }
  }, [isQuickNoteSelected, isFolderSelected, selectedNodeForDetails, createNewQuickNote]);

  const handleDeleteNoteInPanel = useCallback((noteNode) => {
    if (isQuickNoteSelected) {
      deleteQuickNote(noteNode);
    } else {
      handleDelete(noteNode);
    }
  }, [isQuickNoteSelected, deleteQuickNote, handleDelete]);

  const handleRenameNoteInPanel = useCallback((noteNode) => {
    if (!noteNode) return;
    setRenamingNode(noteNode);
    setNewItemName(noteNode.label || '');
    setShowRenameDialog(true);
  }, []);

  const handleQuickNotesContextMenu = useCallback((e, noteNode) => {
    e.preventDefault();
    e.stopPropagation();

    if (!noteNode) {
      setQuickNotesCtxItems([
        {
          label: 'Nueva nota',
          icon: 'pi pi-plus',
          command: () => handleCreateNoteInPanel()
        }
      ]);
      setQuickNotesCtxMenu({ x: e.clientX, y: e.clientY });
      return;
    }

    const noteConnection = {
      id: noteNode.key,
      type: noteNode.data?.type || 'document',
      name: noteNode.label,
      ...noteNode.data
    };
    const isFav = connectionStore.isFavorite(noteConnection);

    setQuickNotesCtxItems([
      {
        label: 'Abrir nota',
        icon: 'pi pi-external-link',
        command: () => handleOpenQuickNote(noteNode, 'reuse')
      },
      {
        label: 'Abrir en pestaña nueva',
        icon: 'pi pi-plus',
        command: () => handleOpenQuickNote(noteNode, 'new')
      },
      {
        label: isFav ? 'Quitar de favoritos' : 'Añadir a favoritos',
        icon: isFav ? 'pi pi-star-fill' : 'pi pi-star',
        command: () => {
          connectionStore.toggleFavorite(noteConnection);
          showToast && showToast({
            severity: 'success',
            summary: isFav ? 'Quitado de favoritos' : 'Añadido a favoritos',
            detail: `"${noteNode.label}" ${isFav ? 'quitado de' : 'añadido a'} favoritos`,
            life: 3000
          });
        }
      },
      { separator: true },
      {
        label: 'Renombrar',
        icon: 'pi pi-pencil',
        command: () => handleRenameNoteInPanel(noteNode)
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        className: 'p-menuitem-danger',
        command: () => handleDeleteNoteInPanel(noteNode)
      },
      { separator: true },
      {
        label: 'Nueva nota',
        icon: 'pi pi-file',
        command: () => handleCreateNoteInPanel()
      }
    ]);
    setQuickNotesCtxMenu({ x: e.clientX, y: e.clientY });
  }, [
    handleCreateNoteInPanel,
    handleOpenQuickNote,
    handleRenameNoteInPanel,
    handleDeleteNoteInPanel,
    showToast
  ]);

  return (
    <>
    <div
      ref={sidebarRootRef}
      className={`documents-sidebar-root${quickNotesPanelOpen ? ' qnp-panel-open' : ''}`}
      style={{ position: 'relative' }}
    >
      {!hideHeader && FUTURISTIC_UI_KEYS.includes(uiTheme) && (
        <div style={{
          width: '100%',
          height: '0.5px',
          backgroundColor: 'var(--ui-sidebar-border)',
          opacity: 0.6,
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
          border: 'none',
          outline: 'none',
          flexShrink: 0
        }} />
      )}
      {!hideHeader && (
        <div className="sidebar-header-glass-stack" style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          background: 'var(--ui-sidebar-bg)',
          backdropFilter: 'none',
          borderRadius: 0,
          margin: 0,
          border: 'none',
          boxShadow: 'none',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 0,
            background: 'transparent',
            pointerEvents: 'none'
          }} />

          <Button
            className="p-button-rounded p-button-text sidebar-action-button glass-button"
            onClick={() => setSidebarCollapsed && setSidebarCollapsed(v => !v)}
            tooltip={sidebarCollapsed ? tCommon('tooltips.expandSidebar') : tCommon('tooltips.collapseSidebar')}
            tooltipOptions={{ position: 'bottom' }}
            style={{
              marginRight: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              minWidth: '38px',
              flexShrink: 0,
              padding: 0,
              transition: 'all 0.3s ease'
            }}
          >
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              color: 'var(--ui-sidebar-text)',
              opacity: 0.9
            }}>
              {sidebarCollapsed
                ? sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.expandRight
                : sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.collapseLeft}
            </span>
          </Button>

          <div style={{
            width: '1px',
            height: '24px',
            background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15), transparent)',
            margin: '0 8px',
            boxShadow: '0 0 5px rgba(255, 255, 255, 0.05)',
            flexShrink: 0
          }} />

          <div className="sidebar-action-glass-group" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginLeft: '0',
            position: 'relative',
            zIndex: 2,
            flexShrink: 1,
            minWidth: 0,
            overflow: 'hidden'
          }}>
            <Button
              className="p-button-rounded p-button-text sidebar-action-button glass-button"
              onClick={handleCreateNewNote}
              tooltip="Nueva nota"
              tooltipOptions={{ position: 'bottom' }}
              style={DOC_HEADER_GLASS_BTN}
            >
              <span style={{ ...DOC_HEADER_ICON_WRAP, color: 'var(--ui-sidebar-text)' }}>
                <i className="pi pi-file-plus" style={{ fontSize: '1rem' }} />
              </span>
            </Button>

            <Button
              className="p-button-rounded p-button-text sidebar-action-button glass-button"
              onClick={openNewFolderDialog}
              tooltip="Nueva carpeta"
              tooltipOptions={{ position: 'bottom' }}
              style={DOC_HEADER_GLASS_BTN}
            >
              <span style={{ ...DOC_HEADER_ICON_WRAP, color: 'var(--ui-sidebar-text)' }}>
                <i className="pi pi-folder-plus" style={{ fontSize: '1.05rem' }} />
              </span>
            </Button>

            <div style={{
              width: '1px',
              height: '18px',
              background: 'color-mix(in srgb, var(--ui-sidebar-text, #fff) 28%, transparent)',
              margin: '0 4px',
              flexShrink: 0
            }} />

            <Button
              className="p-button-rounded p-button-text sidebar-action-button glass-button"
              onClick={(event) => {
                const anchor = event.currentTarget;
                setLibraryAddAnchor((current) => (current === anchor ? null : anchor));
              }}
              tooltip="Añadir a la biblioteca"
              tooltipOptions={{ position: 'bottom' }}
              style={DOC_HEADER_GLASS_BTN}
            >
              <span style={{ ...DOC_HEADER_ICON_WRAP, color: 'var(--ui-sidebar-text)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8.5 8.5 12 12l3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 14.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
            </Button>

            <div style={{
              width: '1px',
              height: '24px',
              background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15), transparent)',
              margin: '0 8px',
              boxShadow: '0 0 5px rgba(255, 255, 255, 0.05)'
            }} />

            <Button
              className="p-button-rounded p-button-text sidebar-action-button glass-button key-button"
              onClick={() => onOpenPasswords?.()}
              tooltip={tCommon('tooltips.passwordManager')}
              tooltipOptions={{ position: 'bottom' }}
              style={DOC_HEADER_GLASS_BTN}
            >
              <span style={{ ...DOC_HEADER_ICON_WRAP, color: '#ffc107' }}>
                {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.passwordManager}
              </span>
            </Button>

            {onToggleFavoritesView && (
              <Button
                className={`p-button-rounded p-button-text sidebar-action-button glass-button ${showFavoritesView ? 'active' : ''}`}
                onClick={onToggleFavoritesView}
                tooltip={showFavoritesView ? tCommon('tooltips.showAllConnections') : tCommon('tooltips.showFavorites')}
                tooltipOptions={{ position: 'bottom' }}
                style={{
                  ...DOC_HEADER_GLASS_BTN,
                  background: showFavoritesView ? 'rgba(255, 193, 7, 0.12)' : DOC_HEADER_GLASS_BTN.background,
                  border: showFavoritesView ? '1px solid rgba(255, 193, 7, 0.45)' : DOC_HEADER_GLASS_BTN.border
                }}
              >
                <span style={{ ...DOC_HEADER_ICON_WRAP, color: '#ffc107' }}>
                  <i className={showFavoritesView ? 'pi pi-star-fill' : 'pi pi-star'} style={{ fontSize: '1rem' }} />
                </span>
              </Button>
            )}

            <Button
              className="p-button-rounded p-button-text sidebar-action-button glass-button"
              onClick={() => onBackToConnections?.()}
              tooltip={tCommon('tooltips.goToConnections')}
              tooltipOptions={{ position: 'bottom' }}
              style={DOC_HEADER_GLASS_BTN}
            >
              <span style={{ ...DOC_HEADER_ICON_WRAP, color: '#10b981' }}>
                <ConnectionsNavIcon />
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Tree — mismo contenedor que conexiones/passwords para alinear márgenes */}
      <div
        className={`tree-container library-tree${dropTargetKey ? ' documents-drop-active' : ''}`}
        onContextMenu={handleEmptySpaceContextMenu}
        onDragEnter={handleNativeDragEnter}
        onDragOver={handleNativeDragOver}
        onDragLeave={handleNativeDragLeave}
        onDrop={handleNativeDrop}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'hidden',
          overflowX: 'hidden',
          position: 'relative',
          fontSize: `${explorerFontSize}px`
        }}
      >
        {dropTargetKey && (
          <div className="library-drop-hint">
            Soltar para enlazar, sin copiar
          </div>
        )}
        {ingestBusy && (
          <div className="library-ingest-progress">
            <span>
              {ingestBusy.label || `Importando ${ingestBusy.done + 1} de ${ingestBusy.total}…`}
            </span>
            <div className="library-ingest-progress__bar">
              <div
                className="library-ingest-progress__fill"
                style={{ width: `${Math.round(((ingestBusy.done + 1) / Math.max(1, ingestBusy.total)) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="documents-empty-state">
            <i className="pi pi-spin pi-spinner" />
            <p>Cargando biblioteca...</p>
          </div>
        ) : notesLayout !== 'tree' ? (
          <NotesBrowser
            nodes={documentNodes}
            layout={notesLayout}
            browseStack={browseStack}
            searching={Boolean(sidebarFilter && String(sidebarFilter).trim())}
            searchTerm={sidebarFilter}
            selectedKey={typeof selectedNodeKey === 'string' ? selectedNodeKey : (selectedNodeKey ? Object.keys(selectedNodeKey)[0] : null)}
            iconTheme={iconTheme}
            explorerFont={explorerFont}
            explorerFontSize={explorerFontSize}
            NotebookIcon={NotebookIcon}
            onCrumb={(index) => setBrowseStack((prev) => prev.slice(0, index))}
            onActivate={activateNotesItem}
            onContextMenu={onBrowserContextMenu}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Pinned Quick Note Row */}
            <div 
              className={`pinned-quick-note-row ${selectedNodeKey === 'quick_note' ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNodeKey('quick_note');
                setQuickNotesPanelOpen(prev => !prev);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 8px 6px 18px',
                cursor: 'pointer',
                fontFamily: explorerFont || 'inherit',
                fontSize: `${explorerFontSize}px`,
                transition: 'background-color 0.2s',
                minHeight: '26px',
                position: 'relative'
              }}
            >
              <span style={{ minWidth: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 20, flexShrink: 0 }}>
                <i className="pi pi-bolt" style={{ fontSize: '0.9rem', color: '#ffc107' }} />
              </span>
              <span className="node-label" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'bold', color: 'var(--ui-primary-color, #64b5f6)' }}>
                Notas rápidas
              </span>
              {/* Indicador del número de notas rápidas */}
              {(() => {
                const qn = documentNodes.find(n => n.key === 'quick_note');
                const count = qn?.children?.length || 0;
                return count > 0 ? (
                  <span className="qnp-count-badge" style={{ flexShrink: 0 }}>{count}</span>
                ) : null;
              })()}
              <i
                className={`pi ${quickNotesPanelOpen ? 'pi-chevron-left' : 'pi-chevron-right'}`}
                style={{ fontSize: '0.7rem', opacity: 0.5, marginRight: 4, flexShrink: 0 }}
              />
            </div>

            {filteredDocumentNodes.length === 0 ? (
              <div className="documents-empty-state" style={{ flex: 1 }}>
                <i className="pi pi-book" />
                <p>La biblioteca está vacía.</p>
                <p style={{ fontSize: '0.78rem', opacity: 0.65 }}>
                  Enlaza una carpeta de Windows o monta una de Nextcloud. Los archivos se leen en su sitio.
                </p>
              </div>
            ) : (
              <div className="documents-tree-scroll-area" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                <Tree
                  value={treeValue}
                  expandedKeys={expandedKeys}
                  onToggle={(e) => {
                    setExpandedKeys(e.value);
                    // Las carpetas enlazadas leen el disco al desplegarse
                    Object.keys(e.value || {}).forEach((key) => {
                      if (expandedKeys[key]) return;
                      const node = findNodeInTree(documentNodes, key);
                      if (isLinkedFolder(node)) loadLinkedFolderChildren(node);
                      if (isCloudFolder(node)) loadCloudFolderChildren(node);
                    });
                  }}
                  selectionMode="single"
                  selectionKeys={selectedNodeKey}
                  onSelectionChange={(e) => {
                    setSelectedNodeKey(e.value);
                    const selectedKey = typeof e.value === 'string' ? e.value : (e.value ? Object.keys(e.value)[0] : null);
                    if (selectedKey) {
                      const node = findNodeInTree(documentNodes, selectedKey);
                      const isFolder = node?.droppable || node?.data?.type === 'document-folder';
                      if (isFolder) {
                        setQuickNotesPanelOpen(true);
                      } else {
                        setQuickNotesPanelOpen(false);
                      }
                    } else {
                      setQuickNotesPanelOpen(false);
                    }
                  }}
                  onContextMenu={onContextMenu}
                  dragdropScope="documents"
                  onDragDrop={onDragDrop}
                  nodeTemplate={nodeTemplate}
                  className={`sidebar-tree tree-theme-${treeTheme}`}
                  data-tree-theme={treeTheme}
                  style={{
                    border: 'none',
                    background: 'transparent'
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <DocumentDetailsPanel
        selectedNode={homeTabActive ? null : selectedNodeForDetails}
        uiTheme={uiTheme}
        onOpenDocument={handleOpenDocument}
        collapsed={detailsCollapsed}
        onCollapseChange={setDetailsCollapsed}
        onClose={() => {
          setSelectedNodeKey(null);
        }}
      />

      {/* Panel lateral de Notas Rápidas (estilo Joplin) */}
      <QuickNotesSidePanel
        isOpen={quickNotesPanelOpen}
        anchorRef={sidebarRootRef}
        notes={activePanelNotes}
        onClose={() => setQuickNotesPanelOpen(false)}
        onOpenNote={handleOpenQuickNote}
        onCreateNote={handleCreateNoteInPanel}
        onDeleteNote={handleDeleteNoteInPanel}
        onContextMenuNote={handleQuickNotesContextMenu}
        explorerFont={explorerFont}
        explorerFontSize={explorerFontSize}
        title={activePanelTitle}
        iconClass={activePanelIconClass}
        iconColor={activePanelIconColor}
        selectedNoteKey={selectedNodeKey}
      />

      <LibraryAddMenu
        open={Boolean(libraryAddAnchor)}
        anchorEl={libraryAddAnchor}
        items={libraryAddMenuModel}
        onClose={() => setLibraryAddAnchor(null)}
      />
      <ContextMenu model={contextMenuItems} ref={contextMenuRef} />
      <TreeContextMenu
        treeContextMenu={quickNotesCtxMenu}
        onClose={() => setQuickNotesCtxMenu(null)}
        items={quickNotesCtxItems}
      />

      {/* New Folder Dialog */}
      <AppDialog
        headerTitle="Nueva carpeta"
        headerIcon="pi pi-folder-plus"
        visible={showNewFolderDialog}
        onHide={() => setShowNewFolderDialog(false)}
        size="sm"
        confirmLabel="Crear"
        confirmIcon="pi pi-check"
        confirmDisabled={!newItemName.trim()}
        onConfirm={handleCreateFolder}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="notebook-name" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Nombre de la carpeta</label>
          <InputText
            id="notebook-name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Mi carpeta..."
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
        </div>
      </AppDialog>

      {/* Rename Dialog */}
      <AppDialog
        headerTitle="Renombrar"
        headerIcon="pi pi-pencil"
        visible={showRenameDialog}
        onHide={() => setShowRenameDialog(false)}
        size="sm"
        confirmLabel="Renombrar"
        confirmIcon="pi pi-check"
        confirmDisabled={!newItemName.trim()}
        onConfirm={handleRename}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="rename-input" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Nuevo nombre</label>
          <InputText
            id="rename-input"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
        </div>
      </AppDialog>

      <FolderIconSelectorModal
        visible={showIconSelector}
        onHide={() => {
          setShowIconSelector(false);
          setIconTargetNode(null);
        }}
        selectedIconId={iconTargetNode?.data?.customIcon}
        onSelectIcon={handleSelectFolderIcon}
        theme={uiTheme}
        defaultCategory="notes"
      />

      <LibraryUrlImportDialog
        visible={Boolean(urlImportTarget)}
        folderLabel={urlImportTarget?.label}
        defaultSaveCopy={false}
        onHide={() => setUrlImportTarget(null)}
        onConfirm={(url, options) => {
          const target = urlImportTarget;
          setUrlImportTarget(null);
          importFromUrl(target?.key || null, url, options);
        }}
      />

      <LibraryCloudBrowserDialog
        visible={Boolean(cloudMountTarget)}
        onHide={() => setCloudMountTarget(null)}
        onMount={(folder) => mountCloudFolder(cloudMountTarget?.key || null, folder)}
      />

      <LibraryFolderPropertiesDialog
        visible={Boolean(folderPropsNode)}
        folder={folderPropsNode}
        policy={folderPropsPolicy}
        inheritedPolicy={folderPropsPolicy}
        stats={folderPropsStats}
        vaultUnlocked={libraryUnlocked}
        onHide={() => setFolderPropsNode(null)}
        onConfirm={handleFolderPropsConfirm}
      />
      {/* ─ Botón flotante papelera docs ─ */}
      <button
        id="doc-trash-btn"
        onClick={() => setShowDocTrashModal(true)}
        title={`Papelera (${trashedDocuments.length})`}
        style={{
          position: 'absolute',
          bottom: isDetailsPanelVisible && detailsCollapsed ? '44px' : '12px',
          right: '10px',
          width: '30px',
          height: '30px',
          borderRadius: '8px',
          border: 'none',
          background: trashedDocuments.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(120,120,140,0.12)',
          color: trashedDocuments.length > 0 ? '#f87171' : '#888',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          zIndex: 10,
          transition: 'background 0.2s, transform 0.15s, bottom 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = trashedDocuments.length > 0 ? 'rgba(239,68,68,0.28)' : 'rgba(120,120,140,0.22)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = trashedDocuments.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(120,120,140,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <i className="pi pi-trash" style={{ fontSize: '13px' }} />
        {trashedDocuments.length > 0 && (
          <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {trashedDocuments.length > 9 ? '9+' : trashedDocuments.length}
          </span>
        )}
      </button>
    </div>

    {/* ─ Portal modal papelera documentos ─ */}
    {showDocTrashModal && ReactDOM.createPortal(
      <div
        className="app-dialog-portal-mask"
        onClick={e => { if (e.target === e.currentTarget) { setShowDocTrashModal(false); setDocTrashConfirm(null); } }}
      >
        <style>{`@keyframes trashModalIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}} .dtrash-item:hover{background:rgba(255,255,255,0.06)!important} .dtrash-restore:hover{background:rgba(34,197,94,0.22)!important} .dtrash-del:hover{background:rgba(239,68,68,0.22)!important}`}</style>
        <div className="app-dialog app-dialog-portal" style={{ width: '460px', maxHeight: '560px' }}>
          <div className="app-dialog-portal-header">
            <div className="app-dialog-header">
              <span className="app-dialog-header-icon" aria-hidden="true"><i className="pi pi-trash" /></span>
              <div className="app-dialog-header-text">
                <span className="app-dialog-header-title">Papelera de la biblioteca</span>
                <span className="app-dialog-header-subtitle">
                  {trashedDocuments.length === 0 ? 'Vacía' : `${trashedDocuments.length} elemento${trashedDocuments.length !== 1 ? 's' : ''} • Se pueden restaurar`}
                </span>
              </div>
            </div>
            <button type="button" className="app-dialog-portal-close" onClick={() => { setShowDocTrashModal(false); setDocTrashConfirm(null); }}>
              <i className="pi pi-times" />
            </button>
          </div>
          {/* Confirmación inline */}
          {docTrashConfirm && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="pi pi-exclamation-triangle" style={{ color: '#f87171', fontSize: '14px', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '12px', color: '#fca5a5', lineHeight: 1.4 }}>
                {docTrashConfirm.type === 'empty' ? '¿Vaciar toda la papelera? No se puede deshacer.' : `¿Eliminar permanentemente «${docTrashConfirm.label}»?`}
              </span>
              <button onClick={executeDocTrashConfirm} style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>Confirmar</button>
              <button onClick={() => setDocTrashConfirm(null)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '7px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}>Cancelar</button>
            </div>
          )}
          {/* Toolbar */}
          {trashedDocuments.length > 0 && (
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)' }}>
              <span style={{ fontSize: '11px', color: '#475569' }}>Haz clic en «Restaurar» para recuperar</span>
              <button onClick={() => setDocTrashConfirm({ type: 'empty' })} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                <i className="pi pi-trash" style={{ fontSize: '10px' }} /> Vaciar todo
              </button>
            </div>
          )}
          {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {trashedDocuments.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <i className="pi pi-check" style={{ fontSize: '24px', color: '#4ade80' }} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Papelera vacía</div>
                <div style={{ fontSize: '12px', color: '#475569' }}>Las notas y archivos eliminados aparecerán aquí</div>
              </div>
            ) : trashedDocuments.map((item, idx) => (
              <div key={item.id} className="dtrash-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: idx < trashedDocuments.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`pi ${item.isFolder ? 'pi-book' : 'pi-file'}`} style={{ color: '#64748b', fontSize: '13px' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                  <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="pi pi-clock" style={{ fontSize: '9px' }} />
                    {new Date(item.deletedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button className="dtrash-restore" onClick={() => restoreDocumentFromTrash(item.id)} style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', borderRadius: '7px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <i className="pi pi-undo" style={{ fontSize: '10px' }} /> Restaurar
                  </button>
                  <button className="dtrash-del" onClick={() => setDocTrashConfirm({ type: 'single', id: item.id, label: item.label })} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', color: '#f87171', borderRadius: '7px', padding: '5px 8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <i className="pi pi-times" style={{ fontSize: '10px' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

export default DocumentsSidebar;
