import React, { useState, useEffect, useRef } from 'react';
import { conversationService } from '../services/ConversationService';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

const FolderMenu = ({ conversationId, onClose, onMoveToFolder }) => {
  const [folders, setFolders] = useState([]);
  const [themeVersion, setThemeVersion] = useState(0);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const menuRef = useRef(null);

  // Escuchar cambios en el tema
  useEffect(() => {
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

  // Cargar carpetas
  useEffect(() => {
    setFolders(conversationService.getAllFolders());
  }, []);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const folder = conversationService.createFolder(newFolderName.trim());
      setFolders(conversationService.getAllFolders());
      setNewFolderName('');
      setShowCreateFolder(false);
    }
  };

  const handleMoveToFolder = (folderId) => {
    conversationService.addConversationToFolder(conversationId, folderId);
    onMoveToFolder(folderId);
    onClose();
  };

  const handleRemoveFromAllFolders = () => {
    // Remover de todas las carpetas
    folders.forEach(folder => {
      conversationService.removeConversationFromFolder(conversationId, folder.id);
    });
    onClose();
  };

  // Verificar si la conversación está en alguna carpeta
  const isInAnyFolder = folders.some(folder => 
    folder.conversationIds.includes(conversationId)
  );

  return (
    <>
      <style>
        {`
          .folder-menu {
            position: absolute;
            top: 100%;
            right: 0;
            background: ${themeColors.cardBackground};
            border: 1px solid ${themeColors.borderColor};
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            min-width: 200px;
            max-width: 300px;
            max-height: 300px;
            overflow-y: auto;
          }

          .folder-menu-header {
            padding: 0.8rem;
            border-bottom: 1px solid ${themeColors.borderColor};
            font-weight: 600;
            color: ${themeColors.textPrimary};
            font-size: 0.9rem;
          }

          .folder-menu-item {
            padding: 0.6rem 0.8rem;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.8rem;
            color: ${themeColors.textPrimary};
          }

          .folder-menu-item:hover {
            background: ${themeColors.hoverBackground};
          }

          .folder-menu-item.disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .folder-menu-item.disabled:hover {
            background: transparent;
          }

          .folder-menu-divider {
            height: 1px;
            background: ${themeColors.borderColor};
            margin: 0.3rem 0;
          }

          .create-folder-section {
            padding: 0.8rem;
            border-top: 1px solid ${themeColors.borderColor};
          }

          .create-folder-input {
            width: 100%;
            padding: 0.4rem;
            background: rgba(255,255,255,0.05);
            border: 1px solid ${themeColors.borderColor};
            border-radius: 4px;
            color: ${themeColors.textPrimary};
            font-size: 0.8rem;
            margin-bottom: 0.5rem;
          }

          .create-folder-actions {
            display: flex;
            gap: 0.3rem;
          }

          .create-folder-btn {
            flex: 1;
            padding: 0.3rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.7rem;
            transition: all 0.2s ease;
          }

          .create-folder-btn.create {
            background: ${themeColors.primaryColor};
            color: white;
          }

          .create-folder-btn.cancel {
            background: rgba(255,255,255,0.1);
            color: ${themeColors.textPrimary};
            border: 1px solid ${themeColors.borderColor};
          }

          .folder-menu-item.new-folder {
            color: ${themeColors.primaryColor};
            font-weight: 500;
          }

          .folder-menu-item.new-folder:hover {
            background: ${themeColors.primaryColor}20;
          }

          .folder-icon {
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .folder-count {
            margin-left: auto;
            font-size: 0.7rem;
            color: ${themeColors.textSecondary};
          }
        `}
      </style>

      <div ref={menuRef} className="folder-menu">
        <div className="folder-menu-header">
          Mover a carpeta
        </div>

        {/* Opción para quitar de todas las carpetas */}
        {isInAnyFolder && (
          <>
            <div 
              className="folder-menu-item"
              onClick={handleRemoveFromAllFolders}
            >
              <i className="pi pi-times" style={{ color: '#f44336' }} />
              Quitar de todas las carpetas
            </div>
            <div className="folder-menu-divider" />
          </>
        )}

        {/* Lista de carpetas */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="folder-menu-item"
            onClick={() => handleMoveToFolder(folder.id)}
          >
            <i className="pi pi-folder" />
            <span>{folder.name}</span>
            <span className="folder-count">({folder.conversationIds.length})</span>
          </div>
        ))}

        {/* Crear nueva carpeta */}
        <div className="folder-menu-divider" />
        <div className="create-folder-section">
          {showCreateFolder ? (
            <>
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
                  className="create-folder-btn create"
                  onClick={handleCreateFolder}
                >
                  Crear
                </button>
                <button
                  className="create-folder-btn cancel"
                  onClick={() => setShowCreateFolder(false)}
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <div
              className="folder-menu-item new-folder"
              onClick={() => setShowCreateFolder(true)}
            >
              <i className="pi pi-plus" />
              Nueva carpeta
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FolderMenu;
