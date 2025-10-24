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
    if (confirm('¿Estás seguro de que quieres eliminar esta carpeta? Las conversaciones no se eliminarán.')) {
      conversationService.deleteFolder(folderId);
    }
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
            padding: 1rem;
            border-bottom: 1px solid ${themeColors.borderColor};
            background: ${themeColors.cardBackground};
            display: flex;
            justify-content: space-between;
            align-items: center;
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
            width: 100%;
            padding: 0.6rem;
            background: ${themeColors.primaryColor};
            border: none;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
          }

          .create-folder-btn:hover {
            background: ${themeColors.primaryColor}dd;
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
            border-radius: 4px;
            padding: 0.4rem 0.8rem;
            color: ${themeColors.textPrimary};
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.8rem;
          }

          .back-btn:hover {
            background: ${themeColors.hoverBackground};
          }
        `}
      </style>

      <div className="folder-manager">
        {/* Header */}
        <div className="folder-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="back-btn" onClick={onBack}>
              <i className="pi pi-arrow-left" />
              Volver
            </button>
            <h3 style={{ margin: 0, color: themeColors.textPrimary }}>Carpetas</h3>
          </div>
          <button
            className="create-folder-btn"
            onClick={() => setShowCreateFolder(true)}
            style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
          >
            <i className="pi pi-plus" />
            Nueva Carpeta
          </button>
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
              <div className="folder-header-item">
                {editingFolder === folder.id ? (
                  <input
                    type="text"
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    className="create-folder-input"
                    autoFocus
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

                <div className="folder-actions">
                  {editingFolder === folder.id ? (
                    <>
                      <button
                        className="folder-action-btn"
                        onClick={() => handleRenameFolder(folder.id)}
                        title="Guardar"
                      >
                        <i className="pi pi-check" />
                      </button>
                      <button
                        className="folder-action-btn"
                        onClick={handleCancelEdit}
                        title="Cancelar"
                      >
                        <i className="pi pi-times" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="folder-action-btn"
                        onClick={() => handleStartEdit(folder)}
                        title="Renombrar"
                      >
                        <i className="pi pi-pencil" />
                      </button>
                      <button
                        className="folder-action-btn delete"
                        onClick={() => handleDeleteFolder(folder.id)}
                        title="Eliminar"
                      >
                        <i className="pi pi-trash" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Conversaciones en la carpeta */}
              {folder.conversationIds.length > 0 && (
                <div className="conversations-in-folder expanded">
                  {conversationService.getFolderConversations(folder.id).map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`conversation-in-folder ${conversation.id === currentConversationId ? 'active' : ''}`}
                      onClick={() => onConversationSelect(conversation.id)}
                    >
                      <div>
                        <div className="conversation-title-small">{conversation.title}</div>
                        <div className="conversation-preview-small">
                          {getConversationPreview(conversation)}
                        </div>
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
      </div>
    </>
  );
};

export default FolderManager;
