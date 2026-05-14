import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Tree } from 'primereact/tree';
import { ContextMenu } from 'primereact/contextmenu';
import { sessionActionIconThemes } from '../themes/session-action-icons';
import {
  loadDocumentTree,
  saveDocumentTree,
  createDocumentNode,
  createFolderNode,
  addNodeToTree,
  removeNodeFromTree,
  updateNodeInTree,
  filterDocumentTree
} from '../utils/documentStore';
import '../styles/components/documents.css';

const DocumentsSidebar = ({
  showToast,
  confirmDialog,
  uiTheme = 'Light',
  onBackToConnections,
  sidebarCollapsed,
  setSidebarCollapsed,
  explorerFont,
  explorerFontSize = 14,
  masterKey,
  secureStorage,
  sessionActionIconTheme = 'modern',
  sidebarFilter = '',
  treeTheme = 'default'
}) => {
  const [documentNodes, setDocumentNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  const [searchText, setSearchText] = useState('');

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
    try {
      localStorage.setItem('documents_expanded_keys', JSON.stringify(expandedKeys));
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
      summary: 'Documento creado',
      detail: `"${newDoc.label}" creado correctamente`,
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
      : `¿Eliminar el documento "${node.label}"?`;

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
          label: 'Nuevo documento',
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
        label: 'Abrir documento',
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

  const displayNodes = searchText
    ? filterDocumentTree(documentNodes, searchText)
    : documentNodes;

  const nodeTemplate = (node) => {
    const isFolder = node.droppable || node.data?.type === 'document-folder';
    return (
      <span
        className="document-tree-node"
        onDoubleClick={() => !isFolder && handleOpenDocument(node)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: isFolder ? 'default' : 'pointer',
          fontSize: `${explorerFontSize}px`,
          fontFamily: explorerFont || 'inherit',
          padding: '2px 0'
        }}
      >
        <i
          className={isFolder ? 'pi pi-folder' : 'pi pi-file'}
          style={{
            fontSize: '0.9rem',
            color: isFolder ? '#ffc107' : '#64b5f6'
          }}
        />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

  return (
    <>
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
        width: '100%',
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
          tooltip={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
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
            onClick={() => {
              setParentKeyForNew(null);
              setNewItemName('');
              setShowNewDocDialog(true);
            }}
            tooltip="Nuevo documento"
            tooltipOptions={{ position: 'bottom' }}
            style={{
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
            }}
          >
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              color: 'var(--ui-sidebar-text)'
            }}>
              <i className="pi pi-file-plus" style={{ fontSize: '1rem' }} />
            </span>
          </Button>

          <Button
            className="p-button-rounded p-button-text sidebar-action-button glass-button"
            onClick={() => {
              setParentKeyForNew(null);
              setNewItemName('');
              setShowNewFolderDialog(true);
            }}
            tooltip="Nueva carpeta"
            tooltipOptions={{ position: 'bottom' }}
            style={{
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
            }}
          >
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              color: 'var(--ui-sidebar-text)'
            }}>
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
            className="p-button-rounded p-button-text sidebar-action-button glass-button"
            onClick={onBackToConnections}
            tooltip="Volver a conexiones"
            tooltipOptions={{ position: 'bottom' }}
            style={{
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
            }}
          >
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              color: '#64b5f6'
            }}>
              <i className="pi pi-arrow-left" style={{ fontSize: '1rem' }} />
            </span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="documents-search-box">
        <InputText
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Buscar documentos..."
          style={{ width: '100%' }}
        />
      </div>

      {/* Tree */}
      <div className="documents-sidebar-content" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {isLoading ? (
          <div className="documents-empty-state">
            <i className="pi pi-spin pi-spinner" />
            <p>Cargando documentos...</p>
          </div>
        ) : displayNodes.length === 0 ? (
          <div className="documents-empty-state">
            <i className="pi pi-file-edit" />
            <p>
              {searchText
                ? 'No se encontraron documentos'
                : 'No hay documentos. Crea uno nuevo con el botón de arriba.'}
            </p>
          </div>
        ) : (
          <Tree
            value={displayNodes}
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
              fontSize: `${explorerFontSize}px`,
              fontFamily: explorerFont || 'inherit',
              border: 'none',
              background: 'transparent',
              padding: '0 4px'
            }}
          />
        )}
      </div>

      <ContextMenu model={contextMenuItems} ref={contextMenuRef} />

      {/* New Document Dialog */}
      <Dialog
        header="Nuevo documento"
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
          <label htmlFor="doc-name" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Nombre del documento</label>
          <InputText
            id="doc-name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Mi documento..."
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
    </>
  );
};

export default DocumentsSidebar;
