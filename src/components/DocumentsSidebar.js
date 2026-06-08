import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Tree } from 'primereact/tree';
import { ContextMenu } from 'primereact/contextmenu';
import { sessionActionIconThemes } from '../themes/session-action-icons';
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
  findNodeInTree
} from '../utils/documentStore';
import {
  isDescendantInFullTree,
  isShowMoreTreeNode,
  moveNodeFromTreeEvent
} from '../utils/treeDragDrop';
import localStorageSyncService from '../services/LocalStorageSyncService';
import DocumentDetailsPanel from './DocumentDetailsPanel';
import QuickNotesSidePanel from './QuickNotesSidePanel';
import '../styles/components/documents.css';

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
  const [expandedKeys, setExpandedKeys] = useState({});
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  const [quickNotesPanelOpen, setQuickNotesPanelOpen] = useState(false);

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

  const contextMenuRef = useRef(null);
  const inlineRenameInputRef = useRef(null);
  const sidebarRootRef = useRef(null);
  const [contextMenuItems, setContextMenuItems] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('documents_expanded_keys');
      if (saved) setExpandedKeys(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    const reloadFromStorage = async () => {
      setIsLoading(true);
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
    const load = async () => {
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
  }, [masterKey, secureStorage]);

  useEffect(() => {
    if (isLoading) return;
    saveDocumentTree(documentNodes, secureStorage, masterKey);
  }, [documentNodes, isLoading, secureStorage, masterKey]);

  const handleOpenDocument = useCallback((node) => {
    if (node.data?.type === 'document-folder' || node.droppable) return;
    window.dispatchEvent(new CustomEvent('open-document-tab', {
      detail: {
        key: node.key,
        label: node.label,
        data: node.data
      }
    }));
  }, []);

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
    const key = resolveSelectedKey();
    if (!key || key === 'quick_note') return null;
    const node = findNodeInTree(documentNodes, key);
    if (!node) return null;
    const isFolder = node.droppable || node.data?.type === 'document-folder';
    return isFolder ? key : null;
  }, [documentNodes, resolveSelectedKey]);

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
          data: newNote.data
        }
      }));
    }, 50);
  }, []);

  // Elimina una nota del contenedor de notas rápidas
  const deleteQuickNote = useCallback((noteNode) => {
    if (confirmDialog) {
      confirmDialog({
        message: `¿Eliminar la nota rápida "${noteNode.label}"?`,
        header: 'Confirmar eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptClassName: 'p-button-danger',
        accept: () => {
          setDocumentNodes(prev => prev.map(node => {
            if (node.key === 'quick_note') {
              return {
                ...node,
                children: (node.children || []).filter(c => c.key !== noteNode.key)
              };
            }
            return node;
          }));
          showToast?.({
            severity: 'info',
            summary: 'Eliminada',
            detail: `"${noteNode.label}" eliminada`,
            life: 3000
          });
        }
      });
    } else {
      setDocumentNodes(prev => prev.map(node => {
        if (node.key === 'quick_note') {
          return {
            ...node,
            children: (node.children || []).filter(c => c.key !== noteNode.key)
          };
        }
        return node;
      }));
    }
  }, [confirmDialog, showToast]);

  const handleCreateNewNote = useCallback(() => {
    createNewDocumentInTree(getParentKeyForNewNote());
  }, [createNewDocumentInTree, getParentKeyForNewNote]);

  const commitInlineRename = useCallback(() => {
    if (!inlineRenamingKey) return;
    const trimmed = inlineRenameValue.trim() || 'Nueva nota';
    setDocumentNodes(prev =>
      updateNodeInTree(prev, inlineRenamingKey, { label: trimmed })
    );
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
    setDocumentNodes(prev =>
      updateNodeInTree(prev, renamingNode.key, { label: newItemName.trim() })
    );
    setShowRenameDialog(false);
    setNewItemName('');
    setRenamingNode(null);
  };

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
    setDocumentNodes(prev => [item.nodeData, ...prev]);
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

  const handleDelete = (node) => {
    // Guardar copia del nodo antes de eliminar
    const nodeCopy = JSON.parse(JSON.stringify(node));
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

    if (isFolder) {
      items.push(
        {
          label: 'Nueva nota',
          icon: 'pi pi-file',
          command: () => createNewDocumentInTree(node.key)
        },
        {
          label: 'Nueva subcarpeta',
          icon: 'pi pi-folder',
          command: () => {
            setParentKeyForNew(node.key);
            setNewItemName('');
            setShowNewFolderDialog(true);
          }
        },
        { separator: true }
      );
    } else {
      items.push({
        label: 'Abrir nota',
        icon: 'pi pi-external-link',
        command: () => handleOpenDocument(node)
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

  const handleEmptySpaceContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const items = [
      {
        label: 'Nueva nota',
        icon: 'pi pi-file',
        command: () => handleCreateNewNote()
      },
      {
        label: 'Nueva carpeta',
        icon: 'pi pi-folder',
        command: () => {
          setParentKeyForNew(null);
          setNewItemName('');
          setShowNewFolderDialog(true);
        }
      }
    ];

    setContextMenuItems(items);
    contextMenuRef.current?.show(e);
  };

  const onDragDrop = (event) => {
    const { dragNode, dropNode, dropPoint, dropIndex } = event || {};
    if (!dragNode?.key || dragNode.key === 'quick_note') return;
    if (isShowMoreTreeNode(dragNode) || isShowMoreTreeNode(dropNode)) return;

    if (dropNode?.key && isDescendantInFullTree(documentNodes, dragNode.key, dropNode.key)) {
      return;
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
    const isFolder = node.droppable || node.data?.type === 'document-folder';
    const isInlineRenaming = inlineRenamingKey === node.key;
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
            handleOpenDocument(node);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: isFolder ? 'default' : 'pointer',
          fontFamily: explorerFont || 'inherit',
          width: '100%'
        }}
      >
        <span
          style={{
            minWidth: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 20
          }}
        >
          <i
            className={isFolder ? 'pi pi-folder' : 'pi pi-file'}
            style={{
              fontSize: '0.9rem',
              color: isFolder ? '#ffc107' : '#64b5f6'
            }}
          />
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
              height: 22,
              padding: '0 4px',
              fontSize: 'inherit',
              fontFamily: 'inherit'
            }}
          />
        ) : (
          <span
            className="node-label"
            style={{
              flex: 1,
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
        {!isInlineRenaming && isFolder && (() => {
          const count = countNotesInFolder(node);
          return count > 0 ? (
            <span className="qnp-count-badge" style={{ marginLeft: 'auto', marginRight: '4px' }}>{count}</span>
          ) : null;
        })()}
      </span>
    );
  };

  // Sync external updates when a document is saved from the editor
  useEffect(() => {
    const handler = (e) => {
      const { key, content, markdownSource } = e.detail || {};
      if (!key) return;
      setDocumentNodes(prev =>
        updateNodeInTree(prev, key, {
          data: { content, markdownSource, updatedAt: Date.now() }
        })
      );
    };
    window.addEventListener('document-content-updated', handler);
    return () => window.removeEventListener('document-content-updated', handler);
  }, []);

  const openNewFolderDialog = () => {
    setParentKeyForNew(null);
    setNewItemName('');
    setShowNewFolderDialog(true);
  };

  // Listen to events from the unified sidebar toolbar when hideHeader=true
  useEffect(() => {
    if (!hideHeader) return;
    const onNewDoc = () => handleCreateNewNote();
    const onNewFolder = () => openNewFolderDialog();
    const onToggleExpandAll = () => toggleExpandAllDocuments();
    window.addEventListener('documents-sidebar:new-doc', onNewDoc);
    window.addEventListener('documents-sidebar:new-folder', onNewFolder);
    window.addEventListener('documents-sidebar:toggle-expand-all', onToggleExpandAll);
    return () => {
      window.removeEventListener('documents-sidebar:new-doc', onNewDoc);
      window.removeEventListener('documents-sidebar:new-folder', onNewFolder);
      window.removeEventListener('documents-sidebar:toggle-expand-all', onToggleExpandAll);
    };
  }, [hideHeader, toggleExpandAllDocuments, handleCreateNewNote]);

  useEffect(() => {
    if (!hideHeader) return;
    window.dispatchEvent(new CustomEvent('documents-sidebar:expand-state', {
      detail: { allExpanded: allDocTreeExpanded }
    }));
  }, [hideHeader, allDocTreeExpanded]);

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
    return 'Notas';
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
  const handleOpenQuickNote = useCallback((node) => {
    setSelectedNodeKey(node.key);
    window.dispatchEvent(new CustomEvent('open-document-tab', {
      detail: {
        key: node.key,
        label: node.label,
        data: node.data
      }
    }));
  }, []);

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
              data: newDoc.data
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
              tooltip={tCommon('tooltips.newFolder')}
              tooltipOptions={{ position: 'bottom' }}
              style={DOC_HEADER_GLASS_BTN}
            >
              <span style={{ ...DOC_HEADER_ICON_WRAP, color: 'var(--ui-sidebar-text)' }}>
                {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.newFolder}
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
        className="tree-container"
        onContextMenu={handleEmptySpaceContextMenu}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'hidden',
          overflowX: 'hidden',
          position: 'relative',
          fontSize: `${explorerFontSize}px`
        }}
      >
        {isLoading ? (
          <div className="documents-empty-state">
            <i className="pi pi-spin pi-spinner" />
            <p>Cargando notas...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
              <span style={{ minWidth: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 20 }}>
                <i className="pi pi-bolt" style={{ fontSize: '0.9rem', color: '#ffc107' }} />
              </span>
              <span className="node-label" style={{ flex: 1, fontWeight: 'bold', color: 'var(--ui-primary-color, #64b5f6)' }}>
                Notas rápidas
              </span>
              {/* Indicador del número de notas rápidas */}
              {(() => {
                const qn = documentNodes.find(n => n.key === 'quick_note');
                const count = qn?.children?.length || 0;
                return count > 0 ? (
                  <span className="qnp-count-badge">{count}</span>
                ) : null;
              })()}
              <i
                className={`pi ${quickNotesPanelOpen ? 'pi-chevron-left' : 'pi-chevron-right'}`}
                style={{ fontSize: '0.7rem', opacity: 0.5, marginRight: 4 }}
              />
            </div>

            {filteredDocumentNodes.length === 0 ? (
              <div className="documents-empty-state" style={{ flex: 1 }}>
                <i className="pi pi-file-edit" />
                <p>No hay notas creadas en el árbol.</p>
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <Tree
                  value={treeValue}
                  expandedKeys={expandedKeys}
                  onToggle={(e) => setExpandedKeys(e.value)}
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
        selectedNode={selectedNodeForDetails}
        uiTheme={uiTheme}
        onOpenDocument={handleOpenDocument}
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
        explorerFont={explorerFont}
        explorerFontSize={explorerFontSize}
        title={activePanelTitle}
        iconClass={activePanelIconClass}
        iconColor={activePanelIconColor}
        selectedNoteKey={selectedNodeKey}
      />

      <ContextMenu model={contextMenuItems} ref={contextMenuRef} />

      {/* New Folder Dialog */}
      <Dialog
        header="Nueva carpeta"
        visible={showNewFolderDialog}
        onHide={() => setShowNewFolderDialog(false)}
        style={{ width: '380px' }}
        modal
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button label="Cancelar" className="p-button-text" onClick={() => setShowNewFolderDialog(false)} />
            <Button label="Crear" icon="pi pi-check" onClick={handleCreateFolder} disabled={!newItemName.trim()} />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="folder-name" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Nombre de la carpeta</label>
          <InputText
            id="folder-name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Mi carpeta..."
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
        </div>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog
        header="Renombrar"
        visible={showRenameDialog}
        onHide={() => setShowRenameDialog(false)}
        style={{ width: '380px' }}
        modal
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button label="Cancelar" className="p-button-text" onClick={() => setShowRenameDialog(false)} />
            <Button label="Renombrar" icon="pi pi-check" onClick={handleRename} disabled={!newItemName.trim()} />
          </div>
        }
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
      </Dialog>
      {/* ─ Botón flotante papelera docs ─ */}
      <button
        id="doc-trash-btn"
        onClick={() => setShowDocTrashModal(true)}
        title={`Papelera (${trashedDocuments.length})`}
        style={{
          position: 'absolute', bottom: '12px', right: '10px',
          width: '30px', height: '30px', borderRadius: '8px', border: 'none',
          background: trashedDocuments.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(120,120,140,0.12)',
          color: trashedDocuments.length > 0 ? '#f87171' : '#888',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', zIndex: 10, transition: 'background 0.2s, transform 0.15s',
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
        style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', animation: 'trashModalIn 0.18s ease' }}
        onClick={e => { if (e.target === e.currentTarget) { setShowDocTrashModal(false); setDocTrashConfirm(null); } }}
      >
        <style>{`@keyframes trashModalIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}} .dtrash-item:hover{background:rgba(255,255,255,0.06)!important} .dtrash-restore:hover{background:rgba(34,197,94,0.22)!important} .dtrash-del:hover{background:rgba(239,68,68,0.22)!important}`}</style>
        <div style={{ background: 'linear-gradient(145deg,#1a1b2e,#16213e)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', width: '460px', maxHeight: '560px', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', overflow: 'hidden', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
          {/* Header */}
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(239,68,68,0.06)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="pi pi-trash" style={{ color: '#f87171', fontSize: '16px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#f1f5f9' }}>Papelera de notas</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                {trashedDocuments.length === 0 ? 'Vacía' : `${trashedDocuments.length} elemento${trashedDocuments.length !== 1 ? 's' : ''} • Se pueden restaurar`}
              </div>
            </div>
            <button onClick={() => { setShowDocTrashModal(false); setDocTrashConfirm(null); }} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#94a3b8', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
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
                <div style={{ fontSize: '12px', color: '#475569' }}>Las notas eliminadas aparecerán aquí</div>
              </div>
            ) : trashedDocuments.map((item, idx) => (
              <div key={item.id} className="dtrash-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: idx < trashedDocuments.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`pi ${item.isFolder ? 'pi-folder' : 'pi-file'}`} style={{ color: '#64748b', fontSize: '13px' }} />
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
