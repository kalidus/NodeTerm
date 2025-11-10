import React, { useState, useEffect, useMemo, useRef } from 'react';
import AIChatPanel from './AIChatPanel';
import ConversationHistory from './ConversationHistory';
import TabbedTerminal from './TabbedTerminal';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

const AIChatTab = ({
  tab,
  isActiveTab,
  localFontFamily,
  localFontSize,
  localPowerShellTheme,
  localLinuxTerminalTheme
}) => {
  const [showHistory, setShowHistory] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [themeVersion, setThemeVersion] = useState(0);
  const [showLocalTerminal, setShowLocalTerminal] = useState(false);
  const [terminalState, setTerminalState] = useState('normal');
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  // Escuchar cambios en el tema
  useEffect(() => {
    const onThemeChanged = () => {
      setThemeVersion(v => v + 1);
    };
    window.addEventListener('theme-changed', onThemeChanged);
    return () => window.removeEventListener('theme-changed', onThemeChanged);
  }, []);

  // Sincronizar con cambios de pestaña activa
  useEffect(() => {
    if (!isActiveTab && showLocalTerminal) {
      setShowLocalTerminal(false);
    }
  }, [isActiveTab, showLocalTerminal]);

  useEffect(() => {
    if (!showLocalTerminal) {
      setTerminalState('normal');
    }
  }, [showLocalTerminal]);

  useEffect(() => {
    const handleToggleLocalTerminal = (event) => {
      const targetTabKey = event?.detail?.tabKey;
      if (targetTabKey && tab?.key && targetTabKey !== tab.key) return;
      if (!isActiveTab) return;
      setShowLocalTerminal(prev => !prev);
    };

    window.addEventListener('ai-chat-toggle-local-terminal', handleToggleLocalTerminal);
    return () => {
      window.removeEventListener('ai-chat-toggle-local-terminal', handleToggleLocalTerminal);
    };
  }, [tab?.key, isActiveTab]);

  // Obtener el tema actual
  const currentTheme = useMemo(() => {
    return themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [themeVersion]);

  const themeColors = useMemo(() => {
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
    window.dispatchEvent(new CustomEvent('load-conversation', { 
      detail: { conversationId } 
    }));
  };

  const handleNewConversation = () => {
    window.dispatchEvent(new CustomEvent('new-conversation'));
  };

  const handleTerminalMinimize = () => {
    setShowLocalTerminal(false);
  };

  const handleTerminalMaximize = () => {
    setTerminalState(prev => (prev === 'maximized' ? 'normal' : 'maximized'));
  };

  // Manejo del resize del terminal
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newHeight = containerRect.bottom - e.clientY;
      
      // Límites: mínimo 150px, máximo 80% del contenedor
      const minHeight = 150;
      const maxHeight = containerRect.height * 0.8;
      
      setTerminalHeight(Math.max(minHeight, Math.min(newHeight, maxHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Definir colores antes de usarlos
  const resolvedBackground = themeColors.background && themeColors.background !== 'transparent'
    ? themeColors.background
    : '#10141c';
  const resolvedCardBackground = currentTheme.colors?.contentBackground || themeColors.cardBackground || resolvedBackground;

  // Sin terminal local o terminal maximizada
  if (!showLocalTerminal) {
    return (
      <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        background: resolvedBackground,
        overflow: 'hidden'
      }}>
        {showHistory && (
          <div style={{
            width: '300px',
            height: '100%',
            borderRight: `1px solid ${themeColors.borderColor}`,
            background: themeColors.background,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
          }}>
            <ConversationHistory
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              currentConversationId={currentConversationId}
            />
          </div>
        )}

        <div style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: themeColors.background,
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <AIChatPanel 
            showHistory={showHistory}
            onToggleHistory={() => setShowHistory(!showHistory)}
          />
        </div>
      </div>
    );
  }

  // Terminal maximizada
  if (terminalState === 'maximized') {
    return (
      <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: resolvedBackground,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderTop: `1px solid ${themeColors.borderColor}`,
          background: resolvedCardBackground,
          overflow: 'hidden'
        }}>
          <TabbedTerminal
            onMinimize={handleTerminalMinimize}
            onMaximize={handleTerminalMaximize}
            terminalState={terminalState}
            localFontFamily={localFontFamily}
            localFontSize={localFontSize}
            localPowerShellTheme={localPowerShellTheme}
            localLinuxTerminalTheme={localLinuxTerminalTheme}
          />
        </div>
      </div>
    );
  }

  // Terminal normal con resize
  return (
    <div 
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: resolvedBackground,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Área del chat */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {showHistory && (
          <div style={{
            width: '300px',
            height: '100%',
            borderRight: `1px solid ${themeColors.borderColor}`,
            background: themeColors.background,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
          }}>
            <ConversationHistory
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              currentConversationId={currentConversationId}
            />
          </div>
        )}

        <div style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: themeColors.background,
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <AIChatPanel 
            showHistory={showHistory}
            onToggleHistory={() => setShowHistory(!showHistory)}
          />
        </div>
      </div>

      {/* Separador redimensionable */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          height: '6px',
          width: '100%',
          background: themeColors.borderColor,
          cursor: 'row-resize',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
          userSelect: 'none'
        }}
      >
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '40px',
          height: '4px',
          background: themeColors.primaryColor,
          borderRadius: '2px',
          opacity: 0.6
        }} />
      </div>

      {/* Terminal local */}
      <div style={{
        height: `${terminalHeight}px`,
        display: 'flex',
        flexDirection: 'column',
        borderTop: `1px solid ${themeColors.borderColor}`,
        background: resolvedCardBackground,
        flexShrink: 0,
        overflow: 'hidden'
      }}>
        <TabbedTerminal
          onMinimize={handleTerminalMinimize}
          onMaximize={handleTerminalMaximize}
          terminalState={terminalState}
          localFontFamily={localFontFamily}
          localFontSize={localFontSize}
          localPowerShellTheme={localPowerShellTheme}
          localLinuxTerminalTheme={localLinuxTerminalTheme}
        />
      </div>
    </div>
  );
};

export default AIChatTab;
