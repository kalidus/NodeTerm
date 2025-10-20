import React, { useState, useEffect, useRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { aiService } from '../services/AIService';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';
import AIConfigDialog from './AIConfigDialog';

const AIChatPanel = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState(null);
  const [modelType, setModelType] = useState('remote');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [themeVersion, setThemeVersion] = useState(0);
  const [functionalModels, setFunctionalModels] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  // Cargar configuración inicial
  useEffect(() => {
    const config = aiService.loadConfig();
    setCurrentModel(aiService.currentModel);
    setModelType(aiService.modelType);
    
    // Cargar modelos funcionales
    const functional = aiService.getFunctionalModels();
    setFunctionalModels(functional);
    
    // Cargar historial si existe
    const history = aiService.getHistory();
    if (history && history.length > 0) {
      setMessages(history.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      })));
    }
  }, []);

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      // Agregar mensaje del usuario
      const newUserMessage = {
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newUserMessage]);

      // Enviar a la IA
      const response = await aiService.sendMessage(userMessage);

      // Agregar respuesta de la IA
      const aiMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      
      // Mostrar error al usuario
      const errorMessage = {
        role: 'system',
        content: `Error: ${error.message}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    aiService.clearHistory();
  };

  const handleModelChange = (modelId, modelType) => {
    aiService.setCurrentModel(modelId, modelType);
    setCurrentModel(modelId);
    setModelType(modelType);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    return (
      <div
        key={index}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          marginBottom: '1rem',
          animation: 'slideIn 0.3s ease-out'
        }}
      >
        {/* Mensaje */}
        <div
          style={{
            maxWidth: '75%',
            background: isSystem
              ? 'rgba(255, 107, 53, 0.1)'
              : isUser
              ? `linear-gradient(135deg, ${themeColors.primaryColor}dd 0%, ${themeColors.primaryColor}99 100%)`
              : `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`,
            color: themeColors.textPrimary,
            padding: '0.75rem 1rem',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            border: `1px solid ${isSystem ? 'rgba(255, 107, 53, 0.3)' : themeColors.borderColor}`,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap'
          }}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <div
          style={{
            fontSize: '0.7rem',
            color: themeColors.textSecondary,
            marginTop: '0.25rem',
            opacity: 0.7
          }}
        >
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .ai-input:focus {
            outline: none;
            border-color: ${themeColors.primaryColor} !important;
            box-shadow: 0 0 0 2px ${themeColors.primaryColor}33 !important;
          }

          .ai-scrollbar::-webkit-scrollbar {
            width: 8px;
          }

          .ai-scrollbar::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.05);
            border-radius: 4px;
          }

          .ai-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
          }

          .ai-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.3);
          }

          .ai-model-dropdown .p-dropdown {
            background: rgba(255,255,255,0.05) !important;
            border: 1px solid ${themeColors.borderColor} !important;
            border-radius: 12px !important;
            color: ${themeColors.textPrimary} !important;
            transition: all 0.2s ease !important;
          }

          .ai-model-dropdown .p-dropdown:not(.p-disabled):hover {
            background: rgba(255,255,255,0.08) !important;
            border-color: ${themeColors.borderColor} !important;
          }

          .ai-model-dropdown .p-dropdown:not(.p-disabled).p-focus {
            border-color: ${themeColors.primaryColor} !important;
            box-shadow: 0 0 0 2px ${themeColors.primaryColor}33 !important;
          }

          .ai-model-dropdown .p-dropdown-label {
            color: ${themeColors.textPrimary} !important;
            padding: 0.75rem 1rem !important;
            font-size: 0.9rem !important;
          }

          .ai-model-dropdown .p-dropdown-trigger {
            color: ${themeColors.textPrimary} !important;
          }

          .ai-model-dropdown .p-dropdown.p-disabled {
            opacity: 0.5;
            background: rgba(255,255,255,0.03) !important;
          }

          .p-dropdown-panel {
            background: ${themeColors.cardBackground} !important;
            border: 1px solid ${themeColors.borderColor} !important;
            border-radius: 12px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
          }

          .p-dropdown-panel .p-dropdown-items {
            padding: 0.5rem !important;
          }

          .p-dropdown-panel .p-dropdown-item {
            color: ${themeColors.textPrimary} !important;
            background: transparent !important;
            padding: 0.75rem 1rem !important;
            border-radius: 8px !important;
            margin: 0.25rem 0 !important;
            transition: all 0.2s ease !important;
            font-size: 0.9rem !important;
          }

          .p-dropdown-panel .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover {
            background: ${themeColors.hoverBackground} !important;
            color: ${themeColors.textPrimary} !important;
          }

          .p-dropdown-panel .p-dropdown-item.p-highlight {
            background: ${themeColors.primaryColor}40 !important;
            color: ${themeColors.textPrimary} !important;
          }

          .p-dropdown-panel .p-dropdown-empty-message {
            color: ${themeColors.textSecondary} !important;
            padding: 0.75rem 1rem !important;
          }
        `}
      </style>

      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: themeColors.background,
          position: 'relative'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem',
            background: `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`,
            backdropFilter: 'blur(8px)',
            borderBottom: `1px solid ${themeColors.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Icono de IA */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: `linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${themeColors.primaryColor}dd 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 2px 8px ${themeColors.primaryColor}30`
              }}
            >
              <i className="pi pi-comments" style={{ color: 'white', fontSize: '1.2rem' }} />
            </div>

            <div>
              <h2 style={{ margin: 0, color: themeColors.textPrimary, fontSize: '1.2rem', fontWeight: '600' }}>
                Chat de IA
              </h2>
              <p style={{ margin: 0, color: themeColors.textSecondary, fontSize: '0.75rem' }}>
                {currentModel ? `Modelo: ${currentModel}` : 'Selecciona un modelo en configuración'}
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowConfigDialog(true)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                color: themeColors.textPrimary,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = themeColors.hoverBackground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
            >
              <i className="pi pi-cog" />
              <span>Config</span>
            </button>

            <button
              onClick={handleClearChat}
              style={{
                background: 'rgba(255,107,53,0.2)',
                border: '1px solid rgba(255,107,53,0.4)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                color: themeColors.textPrimary,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,107,53,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,107,53,0.2)';
              }}
            >
              <i className="pi pi-trash" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>

        {/* Mensajes */}
        <div
          className="ai-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: themeColors.textSecondary,
                textAlign: 'center',
                gap: '1rem'
              }}
            >
              <i className="pi pi-comments" style={{ fontSize: '4rem', opacity: 0.3 }} />
              <div>
                <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>¡Comienza una conversación!</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  Escribe un mensaje para interactuar con la IA
                </p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => renderMessage(message, index))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: themeColors.primaryColor,
                  animation: 'pulse 1s ease-in-out infinite'
                }}
              />
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: themeColors.primaryColor,
                  animation: 'pulse 1s ease-in-out 0.2s infinite'
                }}
              />
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: themeColors.primaryColor,
                  animation: 'pulse 1s ease-in-out 0.4s infinite'
                }}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input área */}
        <div
          style={{
            padding: '1rem',
            background: `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`,
            backdropFilter: 'blur(8px)',
            borderTop: `1px solid ${themeColors.borderColor}`
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              disabled={isLoading || !currentModel}
              className="ai-input"
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '12px',
                color: themeColors.textPrimary,
                fontSize: '0.95rem',
                resize: 'none',
                minHeight: '48px',
                maxHeight: '120px',
                transition: 'all 0.2s ease'
              }}
              rows={1}
            />

            {/* Selector de modelos */}
            <Dropdown
              value={currentModel || null}
              options={functionalModels}
              onChange={(e) => {
                const selectedModel = functionalModels.find(m => m.id === e.value);
                if (selectedModel) {
                  handleModelChange(selectedModel.id, selectedModel.type);
                }
              }}
              optionLabel="displayName"
              optionValue="id"
              placeholder={functionalModels.length === 0 ? "Sin modelos" : "Selecciona modelo"}
              disabled={isLoading || functionalModels.length === 0}
              className="ai-model-dropdown"
              style={{
                minWidth: '180px',
                maxWidth: '220px',
                height: '48px'
              }}
              panelStyle={{
                background: themeColors.cardBackground,
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            />

            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim() || !currentModel}
              style={{
                background: currentModel && inputValue.trim()
                  ? `linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${themeColors.primaryColor}dd 100%)`
                  : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 1.5rem',
                color: 'white',
                cursor: currentModel && inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '500',
                boxShadow: currentModel && inputValue.trim() ? `0 2px 8px ${themeColors.primaryColor}30` : 'none',
                opacity: currentModel && inputValue.trim() && !isLoading ? 1 : 0.5
              }}
            >
              <i className={isLoading ? 'pi pi-spin pi-spinner' : 'pi pi-send'} />
              <span>{isLoading ? 'Enviando...' : 'Enviar'}</span>
            </button>
          </div>

          {!currentModel && functionalModels.length === 0 && (
            <div
              style={{
                marginTop: '0.5rem',
                fontSize: '0.8rem',
                color: 'rgba(255,107,53,0.8)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <i className="pi pi-exclamation-triangle" />
              <span>Configura un modelo de IA para comenzar</span>
            </div>
          )}
        </div>

        {/* Diálogo de configuración */}
        <AIConfigDialog
          visible={showConfigDialog}
          onHide={() => {
            setShowConfigDialog(false);
            // Recargar configuración después de cerrar el diálogo
            setCurrentModel(aiService.currentModel);
            setModelType(aiService.modelType);
            // Recargar modelos funcionales
            const functional = aiService.getFunctionalModels();
            setFunctionalModels(functional);
          }}
        />
      </div>
    </>
  );
};

export default AIChatPanel;

