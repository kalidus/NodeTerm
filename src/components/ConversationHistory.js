import React, { useState, useEffect, useCallback } from 'react';
import { conversationService } from '../services/ConversationService';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

const ConversationHistory = ({ onConversationSelect, onNewConversation, currentConversationId }) => {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [themeVersion, setThemeVersion] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editingConversation, setEditingConversation] = useState(null);
  const [editTitle, setEditTitle] = useState('');

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

  // Cargar conversaciones
  const loadConversations = useCallback(() => {
    const allConversations = conversationService.getAllConversations('lastMessageAt', 'desc');
    setConversations(allConversations);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Escuchar cambios en las conversaciones
  useEffect(() => {
    const handleConversationUpdate = () => {
      loadConversations();
    };

    window.addEventListener('conversation-updated', handleConversationUpdate);
    return () => window.removeEventListener('conversation-updated', handleConversationUpdate);
  }, [loadConversations]);

  // Filtrar conversaciones
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchQuery || 
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.messages.some(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    const matchesArchive = showArchived ? !conv.isActive : conv.isActive;
    
    return matchesSearch && matchesArchive;
  });

  const handleConversationClick = (conversationId) => {
    if (onConversationSelect) {
      onConversationSelect(conversationId);
    }
  };

  const handleNewConversation = () => {
    if (onNewConversation) {
      onNewConversation();
    }
  };

  const handleDeleteConversation = (conversationId, event) => {
    event.stopPropagation();
    setShowDeleteConfirm(conversationId);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      conversationService.deleteConversation(showDeleteConfirm);
      loadConversations();
      setShowDeleteConfirm(null);
    }
  };

  const handleEditConversation = (conversation, event) => {
    event.stopPropagation();
    setEditingConversation(conversation.id);
    setEditTitle(conversation.title);
  };

  const handleSaveEdit = () => {
    if (editingConversation && editTitle.trim()) {
      conversationService.renameConversation(editingConversation, editTitle.trim());
      loadConversations();
      setEditingConversation(null);
      setEditTitle('');
    }
  };

  const handleCancelEdit = () => {
    setEditingConversation(null);
    setEditTitle('');
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
  };

  const getConversationPreview = (conversation) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage) {
      const preview = lastMessage.content.substring(0, 60);
      return preview.length < lastMessage.content.length ? preview + '...' : preview;
    }
    return 'Sin mensajes';
  };

  return (
    <>
      <style>
        {`
          .conversation-history {
            height: 100%;
            display: flex;
            flex-direction: column;
            background: ${themeColors.background};
          }

          .conversation-header {
            padding: 1rem;
            border-bottom: 1px solid ${themeColors.borderColor};
            background: ${themeColors.cardBackground};
          }

          .conversation-search {
            width: 100%;
            padding: 0.5rem;
            background: rgba(255,255,255,0.05);
            border: 1px solid ${themeColors.borderColor};
            border-radius: 6px;
            color: ${themeColors.textPrimary};
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
          }

          .conversation-search:focus {
            outline: none;
            border-color: ${themeColors.primaryColor};
            box-shadow: 0 0 0 2px ${themeColors.primaryColor}33;
          }

          .conversation-filters {
            display: flex;
            gap: 0.5rem;
            align-items: center;
          }

          .conversation-filter-btn {
            padding: 0.3rem 0.6rem;
            background: rgba(255,255,255,0.1);
            border: 1px solid ${themeColors.borderColor};
            border-radius: 4px;
            color: ${themeColors.textPrimary};
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .conversation-filter-btn:hover {
            background: ${themeColors.hoverBackground};
          }

          .conversation-filter-btn.active {
            background: ${themeColors.primaryColor};
            border-color: ${themeColors.primaryColor};
          }

          .conversation-list {
            flex: 1;
            overflow-y: auto;
            padding: 0.5rem;
          }

          .conversation-item {
            padding: 0.8rem;
            margin-bottom: 0.5rem;
            background: ${themeColors.cardBackground};
            border: 1px solid ${themeColors.borderColor};
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
          }

          .conversation-item:hover {
            background: ${themeColors.hoverBackground};
            border-color: ${themeColors.primaryColor}40;
          }

          .conversation-item.active {
            background: ${themeColors.primaryColor}20;
            border-color: ${themeColors.primaryColor};
          }

          .conversation-title {
            font-weight: 600;
            color: ${themeColors.textPrimary};
            font-size: 0.9rem;
            margin-bottom: 0.3rem;
            line-height: 1.2;
          }

          .conversation-preview {
            color: ${themeColors.textSecondary};
            font-size: 0.8rem;
            line-height: 1.3;
            margin-bottom: 0.4rem;
          }

          .conversation-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.7rem;
            color: ${themeColors.textSecondary};
          }

          .conversation-actions {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
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

          .conversation-action-btn.delete:hover {
            background: rgba(244, 67, 54, 0.2);
            color: #f44336;
          }

          .new-conversation-btn {
            width: 100%;
            padding: 0.8rem;
            background: ${themeColors.primaryColor};
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
          }

          .new-conversation-btn:hover {
            background: ${themeColors.primaryColor}dd;
            transform: translateY(-1px);
          }

          .conversation-stats {
            padding: 0.5rem 1rem;
            border-top: 1px solid ${themeColors.borderColor};
            background: ${themeColors.cardBackground};
            font-size: 0.8rem;
            color: ${themeColors.textSecondary};
            text-align: center;
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

      <div className="conversation-history">
        {/* Header con búsqueda y filtros */}
        <div className="conversation-header">
          <input
            type="text"
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="conversation-search"
          />
          
          <div className="conversation-filters">
            <button
              className={`conversation-filter-btn ${!showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived(false)}
            >
              Activas
            </button>
            <button
              className={`conversation-filter-btn ${showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived(true)}
            >
              Archivadas
            </button>
          </div>
        </div>

        {/* Lista de conversaciones */}
        <div className="conversation-list">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`conversation-item ${conversation.id === currentConversationId ? 'active' : ''}`}
              onClick={() => handleConversationClick(conversation.id)}
            >
              {editingConversation === conversation.id ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: '1px solid ' + themeColors.primaryColor,
                    color: themeColors.textPrimary,
                    padding: '0.3rem',
                    borderRadius: '4px',
                    fontSize: '0.9rem'
                  }}
                  autoFocus
                />
              ) : (
                <>
                  <div className="conversation-title">{conversation.title}</div>
                  <div className="conversation-preview">
                    {getConversationPreview(conversation)}
                  </div>
                  <div className="conversation-meta">
                    <span>{formatDate(conversation.lastMessageAt)}</span>
                    <span>{conversation.messages.length} mensajes</span>
                  </div>
                  
                  <div className="conversation-actions">
                    <button
                      className="conversation-action-btn"
                      onClick={(e) => handleEditConversation(conversation, e)}
                      title="Renombrar"
                    >
                      ✏️
                    </button>
                    <button
                      className="conversation-action-btn delete"
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {filteredConversations.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: themeColors.textSecondary,
              padding: '2rem',
              fontSize: '0.9rem'
            }}>
              {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
            </div>
          )}
        </div>

        {/* Botón nueva conversación */}
        <div style={{ padding: '1rem' }}>
          <button
            className="new-conversation-btn"
            onClick={handleNewConversation}
          >
            <i className="pi pi-plus" style={{ fontSize: '1rem' }} />
            Nueva Conversación
          </button>
        </div>

        {/* Estadísticas */}
        <div className="conversation-stats">
          {conversations.length} conversaciones
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="delete-confirm">
          <div className="delete-confirm-content">
            <div className="delete-confirm-title">Eliminar conversación</div>
            <div className="delete-confirm-message">
              ¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.
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
                onClick={confirmDelete}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConversationHistory;
