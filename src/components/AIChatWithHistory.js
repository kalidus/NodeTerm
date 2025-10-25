import React, { useState, useEffect } from 'react';
import AIChatPanel from './AIChatPanel';
import ConversationHistory from './ConversationHistory';
import { conversationService } from '../services/ConversationService';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';
// Importar estilos del AI chat
import '../styles/components/ai-chat.css';

const AIChatWithHistory = () => {
  const [showHistory, setShowHistory] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [themeVersion, setThemeVersion] = useState(0);

  // Escuchar cambios en el tema
  useEffect(() => {
    const onThemeChanged = () => {
      setThemeVersion(v => v + 1);
    };
    window.addEventListener('theme-changed', onThemeChanged);
    return () => window.removeEventListener('theme-changed', onThemeChanged);
  }, []);

  // Inicializar currentConversationId al cargar
  useEffect(() => {
    const currentConversation = conversationService.getCurrentConversation();
    if (currentConversation) {
      setCurrentConversationId(currentConversation.id);
    }
  }, []);

  // Escuchar actualizaciones de conversación para sincronizar la selección
  useEffect(() => {
    const handleConversationUpdate = () => {
      // Obtener la conversación actual del servicio
      const currentConversation = conversationService.getCurrentConversation();
      if (currentConversation && currentConversation.id !== currentConversationId) {
        setCurrentConversationId(currentConversation.id);
      }
    };

    window.addEventListener('conversation-updated', handleConversationUpdate);
    return () => window.removeEventListener('conversation-updated', handleConversationUpdate);
  }, [currentConversationId]);

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

  const handleConversationSelect = (conversationId) => {
    setCurrentConversationId(conversationId);
    // Disparar evento para que AIChatPanel cargue la conversación
    window.dispatchEvent(new CustomEvent('load-conversation', { 
      detail: { conversationId } 
    }));
  };

  const handleNewConversation = () => {
    // Solo disparar evento, no crear conversación aquí
    // El AIChatPanel se encargará de crear la conversación
    window.dispatchEvent(new CustomEvent('new-conversation'));
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      background: 'transparent'
    }}>
      {/* Sidebar con historial de conversaciones */}
      {showHistory && (
        <div style={{
          width: '300px',
          height: '100%',
          borderRight: `1px solid ${themeColors.borderColor}`,
          background: themeColors.background,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <ConversationHistory
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            currentConversationId={currentConversationId}
          />
        </div>
      )}

      {/* Área principal del chat */}
      <div style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent'
      }}>
        <AIChatPanel 
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory(!showHistory)}
        />
      </div>
    </div>
  );
};

export default AIChatWithHistory;
