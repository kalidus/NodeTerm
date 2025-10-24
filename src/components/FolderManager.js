import React, { useState } from 'react';
import { conversationService } from '../services/ConversationService';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

const FolderManager = ({ onConversationSelect, currentConversationId, onBack }) => {
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [themeVersion, setThemeVersion] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedConversations, setSelectedConversations] = useState(new Set());

  // Escuchar cambios en el tema
  React.useEffect(() => {
    const onThemeChanged = () => {
      setThemeVersion(v => v + 1);
    };
    window.addEventListener('theme-changed', onThemeChanged);
    return () => window.removeEventListener('theme-changed', onThemeChanged);
  }, []);

  // Obtener el tema actual
  const currentTheme = React.useMemo(() => {
    return themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [themeVersion]);

  const themeColors = React.useMemo(() => {
    return {
      background: currentTheme.colors?.contentBackground || '#fafafa',
      cardBackground: currentTheme.colors?.dialogBackground || 'rgba(16, 20, 28, 0.6)',
      textPrimary: currentTheme.colors?.sidebarText || currentTheme.colors?.tabText || '#ffffff',
      textSecondary: currentTheme.colors?.sidebarText || '#9E9E9E',
      borderColor: currentTheme.colors?.sidebarBorder || currentTheme.colors?.contentBorder || 'rgba(255,255,255,0.1)',
      primaryColor: currentTheme.colors?.buttonPrimary || currentTheme.colors?.primaryColor || '#2196f3',
      hoverBackground: currentTheme.colors?.sidebarHover || 'rgba(255,255,255,0.1)',
    };
  }, [currentTheme]);

  const folders = conversationService.getAllFolders();

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      conversationService.createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowCreateFolder(false);
    }
  };

  const handleDeleteFolder = (folderId) => {
    setShowDeleteConfirm(folderId);
  };

  const confirmDeleteFolder = () => {
    if (showDeleteConfirm) {
      conversationService.deleteFolder(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  const toggleFolderExpansion = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleMoveConversation = (conversationId, targetFolderId) => {
    conversationService.addConversationToFolder(conversationId, targetFolderId);
  };

  const handleRemoveFromFolder = (conversationId, folderId) => {
    conversationService.removeConversationFromFolder(conversationId, folderId);
  };

  const toggleConversationSelection = (conversationId) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedConversations(newSelected);
  };

  const handleBulkMove = (targetFolderId) => {
    selectedConversations.forEach(conversationId => {
      conversationService.addConversationToFolder(conversationId, targetFolderId);
    });
    setSelectedConversations(new Set());
  };

  const handleBulkRemove = () => {
    selectedConversations.forEach(conversationId => {
      // Remove from all folders
      folders.forEach(folder => {
        if (folder.conversationIds.includes(conversationId)) {
          conversationService.removeConversationFromFolder(conversationId, folder.id);
        }
      });
    });
    setSelectedConversations(new Set());
  };

  const handleRenameFolder = (folderId) => {
    if (editFolderName.trim()) {
      conversationService.renameFolder(folderId, editFolderName.trim());
      setEditingFolder(null);
      setEditFolderName('');
    }
  };

  const handleStartEdit = (folder) => {
    setEditingFolder(folder.id);
    setEditFolderName(folder.name);
  };

  const handleCancelEdit = () => {
    setEditingFolder(null);
    setEditFolderName('');
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getConversationPreview = (conversation) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage) {
      const preview = lastMessage.content.substring(0, 40);
      return preview.length < lastMessage.content.length ? preview + '...' : preview;
    }
    return 'Sin mensajes';
  };

  return (
    <>
      <style>
        {`
          .folder-manager {
            height: 100%;
            display: flex;
            flex-direction: column;
            background: ${themeColors.background};
          }

          .folder-header {
            padding: 1rem 1.2rem;
            border-bottom: 1px solid ${themeColors.borderColor};
            background: ${themeColors.cardBackground};
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            backdrop-filter: blur(10px);
            border-radius: 0 0 8px 8px;
          }

          .folder-header-left {
            display: flex;
            align-items: center;
            gap: 0.8rem;
          }

          .folder-header-right {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .folder-title {
            margin: 0;
            color: ${themeColors.textPrimary};
            font-size: 1.2rem;
            font-weight: 600;
            line-height: 1.2;
          }

          .folder-stats {
            font-size: 0.75rem;
            color: ${themeColors.textSecondary};
            font-weight: 400;
            opacity: 0.8;
          }

          .folder-list {
            flex: 1;
            overflow-y: auto;
            padding: 0.5rem;
          }

          .folder-item {
            margin-bottom: 0.5rem;
            background: ${themeColors.cardBackground};
            border: 1px solid ${themeColors.borderColor};
            border-radius: 8px;
            overflow: hidden;
          }

          .folder-header-item {
            padding: 0.8rem;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .folder-header-item:hover {
            background: ${themeColors.hoverBackground};
          }

          .folder-name {
            font-weight: 600;
            color: ${themeColors.textPrimary};
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .folder-actions {
            display: flex;
            gap: 0.3rem;
            opacity: 0;
            transition: opacity 0.2s ease;
          }

          .folder-item:hover .folder-actions {
            opacity: 1;
          }

          .folder-action-btn {
            width: 24px;
            height: 24px;
            border: none;
            background: rgba(255,255,255,0.1);
            color: ${themeColors.textPrimary};
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.7rem;
            transition: all 0.2s ease;
          }

          .folder-action-btn:hover {
            background: rgba(255,255,255,0.2);
          }

          .folder-action-btn.delete:hover {
            background: rgba(244, 67, 54, 0.2);
            color: #f44336;
          }

          .conversations-in-folder {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
          }

          .conversations-in-folder.expanded {
            max-height: 300px;
          }

          .conversation-in-folder {
            padding: 0.6rem 0.8rem;
            border-top: 1px solid ${themeColors.borderColor};
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .conversation-in-folder:hover {
            background: ${themeColors.hoverBackground};
          }

          .conversation-in-folder.active {
            background: ${themeColors.primaryColor}20;
            border-left: 3px solid ${themeColors.primaryColor};
          }

          .conversation-title-small {
            font-size: 0.8rem;
            color: ${themeColors.textPrimary};
            font-weight: 500;
          }

          .conversation-preview-small {
            font-size: 0.7rem;
            color: ${themeColors.textSecondary};
            margin-top: 0.2rem;
          }

          .create-folder-btn {
            background: ${themeColors.primaryColor};
            border: none;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.3rem;
            padding: 0.5rem 0.8rem;
            font-size: 0.8rem;
            min-width: auto;
            height: 36px;
          }

          .create-folder-btn:hover {
            background: ${themeColors.primaryColor}dd;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px ${themeColors.primaryColor}40;
          }

          .create-folder-btn i {
            font-size: 0.8rem;
          }

          .create-folder-input {
            width: 100%;
            padding: 0.5rem;
            background: rgba(255,255,255,0.05);
            border: 1px solid ${themeColors.borderColor};
            border-radius: 4px;
            color: ${themeColors.textPrimary};
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
          }

          .create-folder-actions {
            display: flex;
            gap: 0.5rem;
          }

          .create-folder-action-btn {
            flex: 1;
            padding: 0.4rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
            transition: all 0.2s ease;
          }

          .create-folder-action-btn.create {
            background: ${themeColors.primaryColor};
            color: white;
          }

          .create-folder-action-btn.cancel {
            background: rgba(255,255,255,0.1);
            color: ${themeColors.textPrimary};
            border: 1px solid ${themeColors.borderColor};
          }

          .back-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid ${themeColors.borderColor};
            border-radius: 6px;
            padding: 0.5rem;
            color: ${themeColors.textPrimary};
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            font-size: 0.9rem;
          }

          .back-btn:hover {
            background: ${themeColors.hoverBackground};
            transform: translateY(-1px);
          }

          .folder-item-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.8rem;
            cursor: pointer;
            transition: all 0.2s ease;
            border-bottom: 1px solid ${themeColors.borderColor};
          }

          .folder-item-header:hover {
            background: ${themeColors.hoverBackground};
          }

          .folder-item-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
          }

          .folder-expand-btn {
            background: none;
            border: none;
            color: ${themeColors.textSecondary};
            cursor: pointer;
            padding: 0.2rem;
            border-radius: 4px;
            transition: all 0.2s ease;
          }

          .folder-expand-btn:hover {
            background: rgba(255,255,255,0.1);
            color: ${themeColors.textPrimary};
          }

          .conversation-item {
            padding: 0.6rem 0.8rem;
            border-bottom: 1px solid ${themeColors.borderColor};
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .conversation-item:hover {
            background: ${themeColors.hoverBackground};
          }

          .conversation-item.selected {
            background: ${themeColors.primaryColor}20;
            border-left: 3px solid ${themeColors.primaryColor};
          }

          .conversation-checkbox {
            width: 16px;
            height: 16px;
            cursor: pointer;
          }

          .conversation-info {
            flex: 1;
            min-width: 0;
          }

          .conversation-actions {
            display: flex;
            gap: 0.3rem;
            opacity: 0;
            transition: opacity 0.2s ease;
          }

          .conversation-item:hover .conversation-actions {
            opacity: 1;
          }

          .conversation-action-btn {
            width: 24px;
            height: 24px;
            border: none;
            background: rgba(255,255,255,0.1);
            color: ${themeColors.textPrimary};
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.7rem;
            transition: all 0.2s ease;
          }

          .conversation-action-btn:hover {
            background: rgba(255,255,255,0.2);
          }

          .conversation-action-btn.remove:hover {
            background: rgba(244, 67, 54, 0.2);
            color: #f44336;
          }

          .bulk-actions {
            padding: 0.5rem;
            background: ${themeColors.cardBackground};
            border-bottom: 1px solid ${themeColors.borderColor};
            display: flex;
            gap: 0.5rem;
            align-items: center;
            justify-content: space-between;
          }

          .bulk-actions-left {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.8rem;
            color: ${themeColors.textSecondary};
          }

          .bulk-actions-right {
            display: flex;
            gap: 0.3rem;
          }

          .bulk-action-btn {
            padding: 0.3rem 0.6rem;
            background: rgba(255,255,255,0.1);
            border: 1px solid ${themeColors.borderColor};
            border-radius: 4px;
            color: ${themeColors.textPrimary};
            font-size: 0.7rem;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.3rem;
          }

          .bulk-action-btn:hover {
            background: ${themeColors.hoverBackground};
          }

          .bulk-action-btn.primary {
            background: ${themeColors.primaryColor};
            border-color: ${themeColors.primaryColor};
            color: white;
          }

          .bulk-action-btn.danger {
            background: rgba(244, 67, 54, 0.2);
            border-color: #f44336;
            color: #f44336;
          }

          .bulk-action-btn.danger:hover {
            background: #f44336;
            color: white;
          }

          .delete-confirm {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .delete-confirm-content {
            background: ${themeColors.cardBackground};
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid ${themeColors.borderColor};
            max-width: 400px;
            width: 90%;
          }

          .delete-confirm-title {
            color: ${themeColors.textPrimary};
            font-weight: 600;
            margin-bottom: 0.5rem;
            font-size: 1.1rem;
          }

          .delete-confirm-message {
            color: ${themeColors.textSecondary};
            margin-bottom: 1rem;
            line-height: 1.4;
          }

          .delete-confirm-actions {
            display: flex;
            gap: 0.5rem;
            justify-content: flex-end;
          }

          .delete-confirm-btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
          }

          .delete-confirm-btn.cancel {
            background: rgba(255,255,255,0.1);
            color: ${themeColors.textPrimary};
            border: 1px solid ${themeColors.borderColor};
          }

          .delete-confirm-btn.delete {
            background: #f44336;
            color: white;
          }

          .delete-confirm-btn:hover {
            opacity: 0.8;
          }
        `}
      </style>

      <div className="folder-manager">
        {/* Header */}
        <div className="folder-header">
          <div className="folder-header-left">
            <button className="back-btn" onClick={onBack} title="Volver">
              <i className="pi pi-arrow-left" />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <h3 className="folder-title">Carpetas</h3>
              <span className="folder-stats">
                {folders.length} {folders.length === 1 ? 'carpeta' : 'carpetas'}
              </span>
            </div>
          </div>
          <div className="folder-header-right">
            <button
              className="create-folder-btn"
              onClick={() => setShowCreateFolder(true)}
              title="Nueva Carpeta"
            >
              <i className="pi pi-plus" />
              Nueva
            </button>
          </div>
        </div>

        {/* Lista de carpetas */}
        <div className="folder-list">
          {/* Crear nueva carpeta */}
          {showCreateFolder && (
            <div className="folder-item">
              <div className="folder-header-item">
                <input
                  type="text"
                  placeholder="Nombre de la carpeta..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="create-folder-input"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') setShowCreateFolder(false);
                  }}
                />
                <div className="create-folder-actions">
                  <button
                    className="create-folder-action-btn create"
                    onClick={handleCreateFolder}
                  >
                    Crear
                  </button>
                  <button
                    className="create-folder-action-btn cancel"
                    onClick={() => setShowCreateFolder(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Carpetas existentes */}
          {folders.map((folder) => (
            <div key={folder.id} className="folder-item">
              <div className="folder-item-header" onClick={() => toggleFolderExpansion(folder.id)}>
                <div className="folder-item-info">
                  <button className="folder-expand-btn">
                    <i className={`pi ${expandedFolders.has(folder.id) ? 'pi-chevron-down' : 'pi-chevron-right'}`} />
                  </button>
                  {editingFolder === folder.id ? (
                    <input
                      type="text"
                      value={editFolderName}
                      onChange={(e) => setEditFolderName(e.target.value)}
                      className="create-folder-input"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleRenameFolder(folder.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                  ) : (
                    <div className="folder-name">
                      <i className="pi pi-folder" />
                      {folder.name}
                      <span style={{ fontSize: '0.7rem', color: themeColors.textSecondary }}>
                        ({folder.conversationIds.length})
                      </span>
                    </div>
                  )}
                </div>

                <div className="folder-actions">
                  {editingFolder === folder.id ? (
                    <>
                      <button
                        className="folder-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameFolder(folder.id);
                        }}
                        title="Guardar"
                      >
                        <i className="pi pi-check" />
                      </button>
                      <button
                        className="folder-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                        title="Cancelar"
                      >
                        <i className="pi pi-times" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="folder-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(folder);
                        }}
                        title="Renombrar"
                      >
                        <i className="pi pi-pencil" />
                      </button>
                      <button
                        className="folder-action-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        title="Eliminar"
                      >
                        <i className="pi pi-trash" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Conversaciones en la carpeta */}
              {folder.conversationIds.length > 0 && expandedFolders.has(folder.id) && (
                <div className="conversations-in-folder expanded">
                  {/* Bulk actions bar */}
                  {selectedConversations.size > 0 && (
                    <div className="bulk-actions">
                      <div className="bulk-actions-left">
                        <span>{selectedConversations.size} seleccionadas</span>
                      </div>
                      <div className="bulk-actions-right">
                        <button
                          className="bulk-action-btn primary"
                          onClick={() => handleBulkMove(folder.id)}
                          title="Mover a esta carpeta"
                        >
                          <i className="pi pi-folder" />
                          Mover aquí
                        </button>
                        <button
                          className="bulk-action-btn danger"
                          onClick={handleBulkRemove}
                          title="Quitar de carpetas"
                        >
                          <i className="pi pi-times" />
                          Quitar
                        </button>
                      </div>
                    </div>
                  )}

                  {conversationService.getFolderConversations(folder.id).map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`conversation-item ${conversation.id === currentConversationId ? 'active' : ''} ${selectedConversations.has(conversation.id) ? 'selected' : ''}`}
                      onClick={() => onConversationSelect(conversation.id)}
                    >
                      <input
                        type="checkbox"
                        className="conversation-checkbox"
                        checked={selectedConversations.has(conversation.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleConversationSelection(conversation.id);
                        }}
                      />
                      <div className="conversation-info">
                        <div className="conversation-title-small">{conversation.title}</div>
                        <div className="conversation-preview-small">
                          {getConversationPreview(conversation)}
                        </div>
                      </div>
                      <div className="conversation-actions">
                        <button
                          className="conversation-action-btn remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromFolder(conversation.id, folder.id);
                          }}
                          title="Quitar de esta carpeta"
                        >
                          <i className="pi pi-times" />
                        </button>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: themeColors.textSecondary }}>
                        {formatDate(conversation.lastMessageAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {folders.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: themeColors.textSecondary,
              padding: '2rem',
              fontSize: '0.9rem'
            }}>
              No hay carpetas creadas
            </div>
          )}
        </div>

        {/* Modal de confirmación de eliminación */}
        {showDeleteConfirm && (
          <div className="delete-confirm">
            <div className="delete-confirm-content">
              <div className="delete-confirm-title">Eliminar carpeta</div>
              <div className="delete-confirm-message">
                ¿Estás seguro de que quieres eliminar esta carpeta? Las conversaciones no se eliminarán, solo se quitarán de la carpeta.
              </div>
              <div className="delete-confirm-actions">
                <button
                  className="delete-confirm-btn cancel"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancelar
                </button>
                <button
                  className="delete-confirm-btn delete"
                  onClick={confirmDeleteFolder}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FolderManager;
