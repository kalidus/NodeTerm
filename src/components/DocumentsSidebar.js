import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  updateNodeInTree
} from '../utils/documentStore';
import localStorageSyncService from '../services/LocalStorageSyncService';
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
  treeTheme = 'default',
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

  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [parentKeyForNew, setParentKeyForNew] = useState(null);
  const [renamingNode, setRenamingNode] = useState(null);

  const contextMenuRef = useRef(null);
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

  const handleCreateDocument = () => {
    if (!newItemName.trim()) return;
    const newDoc = createDocumentNode(newItemName.trim());
    setDocumentNodes(prev => addNodeToTree(prev, parentKeyForNew, newDoc));
    setShowNewDocDialog(false);
    setNewItemName('');
    setParentKeyForNew(null);
    showToast?.({
      severity: 'success',
      summary: 'Nota creada',
      detail: `"${newDoc.label}" creada correctamente`,
      life: 3000
    });
  };

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

  const handleDelete = (node) => {
    const isFolder = node.droppable || node.data?.type === 'document-folder';
    const message = isFolder
      ? `¿Eliminar la carpeta "${node.label}" y todo su contenido?`
      : `¿Eliminar la nota "${node.label}"?`;

    if (confirmDialog) {
      confirmDialog({
        message,
        header: 'Confirmar eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptClassName: 'p-button-danger',
        accept: () => {
          setDocumentNodes(prev => removeNodeFromTree(prev, node.key));
          showToast?.({
            severity: 'info',
            summary: 'Eliminado',
            detail: `"${node.label}" eliminado`,
            life: 3000
          });
        }
      });
    } else {
      setDocumentNodes(prev => removeNodeFromTree(prev, node.key));
    }
  };

  const onContextMenu = (event) => {
    const node = event.node;
    if (!node) return;

    const isFolder = node.droppable || node.data?.type === 'document-folder';
    const items = [];

    if (isFolder) {
      items.push(
        {
          label: 'Nueva nota',
          icon: 'pi pi-file',
          command: () => {
            setParentKeyForNew(node.key);
            setNewItemName('');
            setShowNewDocDialog(true);
          }
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

  const onDragDrop = (event) => {
    const { dragNode, dropNode, dropIndex, value } = event || {};
    if (!dragNode) return;

    let updatedNodes = removeNodeFromTree(documentNodes, dragNode.key);

    if (dropNode && (dropNode.droppable || dropNode.data?.type === 'document-folder')) {
      updatedNodes = addNodeToTree(updatedNodes, dropNode.key, dragNode);
    } else if (dropNode) {
      const findParent = (nodes, key) => {
        for (const n of nodes) {
          if (n.children?.some(c => c.key === key)) return n;
          if (n.children) {
            const found = findParent(n.children, key);
            if (found) return found;
          }
        }
        return null;
      };
      const parent = findParent(updatedNodes, dropNode.key);
      if (parent) {
        const idx = parent.children.findIndex(c => c.key === dropNode.key);
        parent.children.splice(idx + 1, 0, dragNode);
      } else {
        const rootIdx = updatedNodes.findIndex(n => n.key === dropNode.key);
        updatedNodes.splice(rootIdx + 1, 0, dragNode);
      }
    } else {
      updatedNodes.push(dragNode);
    }

    setDocumentNodes(updatedNodes);
  };

  const treeValue = useMemo(
    () => stripTreeNodeIcons(documentNodes),
    [documentNodes]
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
    return (
      <span
        className="document-tree-node"
        onDoubleClick={() => !isFolder && handleOpenDocument(node)}
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

  const openNewDocumentDialog = () => {
    setParentKeyForNew(null);
    setNewItemName('');
    setShowNewDocDialog(true);
  };

  const openNewFolderDialog = () => {
    setParentKeyForNew(null);
    setNewItemName('');
    setShowNewFolderDialog(true);
  };

  // Listen to events from the unified sidebar toolbar when hideHeader=true
  useEffect(() => {
    if (!hideHeader) return;
    const onNewDoc = () => openNewDocumentDialog();
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
  }, [hideHeader, toggleExpandAllDocuments]);

  useEffect(() => {
    if (!hideHeader) return;
    window.dispatchEvent(new CustomEvent('documents-sidebar:expand-state', {
      detail: { allExpanded: allDocTreeExpanded }
    }));
  }, [hideHeader, allDocTreeExpanded]);

  return (
    <div className="documents-sidebar-root">
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
              onClick={openNewDocumentDialog}
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
        ) : documentNodes.length === 0 ? (
          <div className="documents-empty-state">
            <i className="pi pi-file-edit" />
            <p>No hay notas. Usa el icono de nueva nota en la cabecera.</p>
          </div>
        ) : (
          <Tree
            value={treeValue}
            expandedKeys={expandedKeys}
            onToggle={(e) => setExpandedKeys(e.value)}
            selectionMode="single"
            selectionKeys={selectedNodeKey}
            onSelectionChange={(e) => setSelectedNodeKey(e.value)}
            onContextMenu={onContextMenu}
            dragdropScope="documents"
            onDragDrop={onDragDrop}
            nodeTemplate={nodeTemplate}
            className={`sidebar-tree tree-theme-${treeTheme}`}
            data-tree-theme={treeTheme}
            style={{
              height: '100%',
              overflow: 'auto',
              fontSize: `${explorerFontSize}px`,
              fontFamily: explorerFont || 'inherit',
              border: 'none',
              background: 'transparent'
            }}
          />
        )}
      </div>

      <ContextMenu model={contextMenuItems} ref={contextMenuRef} />

      {/* Diálogo nueva nota */}
      <Dialog
        header="Nueva nota"
        visible={showNewDocDialog}
        onHide={() => setShowNewDocDialog(false)}
        style={{ width: '380px' }}
        modal
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button label="Cancelar" className="p-button-text" onClick={() => setShowNewDocDialog(false)} />
            <Button label="Crear" icon="pi pi-check" onClick={handleCreateDocument} disabled={!newItemName.trim()} />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="doc-name" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Nombre de la nota</label>
          <InputText
            id="doc-name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Mi nota..."
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateDocument()}
          />
        </div>
      </Dialog>

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
    </div>
  );
};

export default DocumentsSidebar;
