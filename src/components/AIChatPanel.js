import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import { Dropdown } from 'primereact/dropdown';
import { aiService } from '../services/AIService';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';
import AIConfigDialog from './AIConfigDialog';

// Importar tema de highlight.js
import 'highlight.js/styles/github-dark.css';

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
  
  // Estados avanzados para Fase 2
  const [currentStatus, setCurrentStatus] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const [detectedFiles, setDetectedFiles] = useState([]);

  // Configurar marked con resaltado de sintaxis
  useEffect(() => {
    marked.setOptions({
      highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.error('Error highlighting code:', err);
          }
        }
        try {
          return hljs.highlightAuto(code).value;
        } catch (err) {
          console.error('Error auto-highlighting code:', err);
          return code;
        }
      },
      breaks: true,
      gfm: true,
      langPrefix: 'hljs language-'
    });
  }, []);

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

  // Auto-scroll cuando hay estado actual
  useEffect(() => {
    if (currentStatus && isLoading) {
      scrollToBottom();
    }
  }, [currentStatus, isLoading]);

  const scrollToBottom = () => {
    // Múltiples intentos para asegurar que funciona
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });
    
    // Fallback con setTimeout
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setCurrentStatus(null);
    setDetectedFiles([]);

    // Crear AbortController para cancelar si es necesario
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Agregar mensaje del usuario inmediatamente
      const userMessageId = Date.now();
      setMessages(prev => [...prev, {
        id: userMessageId,
        role: 'user',
        content: userMessage,
        timestamp: userMessageId
      }]);

      // Pequeño delay para asegurar ID único para el mensaje de la IA
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Crear placeholder para la respuesta de la IA que se irá actualizando
      const assistantMessageId = Date.now();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: assistantMessageId,
        streaming: true
      }]);

      // Mostrar estado inicial
      setCurrentStatus({
        status: 'connecting',
        message: `Conectando...`,
        model: aiService.currentModel,
        provider: aiService.modelType
      });

      // Configurar callbacks
      const callbacks = {
        onStart: (data) => {
          setCurrentStatus({
            status: 'connecting',
            message: `Conectando con ${data.model}...`,
            model: data.model,
            provider: data.provider
          });
        },
        onStatus: (statusData) => {
          setCurrentStatus(statusData);
        },
        onStream: (streamData) => {
          // Actualizar mensaje con contenido streaming
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId ? {
              ...msg,
              content: streamData.fullResponse,
              streaming: true
            } : msg
          ));
          setCurrentStatus({
            status: 'streaming',
            message: 'Recibiendo respuesta...',
            model: streamData.model,
            provider: streamData.provider
          });
        },
        onComplete: (data) => {
          const files = aiService.detectFilesInResponse(data.response);
          if (files.length > 0) {
            setDetectedFiles(files);
          }
          
          // Actualizar mensaje final
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId ? {
              ...msg,
              content: data.response,
              streaming: false,
              metadata: {
                latency: data.latency,
                model: data.model,
                provider: data.provider,
                tokens: Math.ceil(data.response.length / 4),
                files: files.length > 0 ? files : undefined
              }
            } : msg
          ));
          
          setCurrentStatus({
            status: 'complete',
            message: `Completado en ${data.latency}ms`,
            latency: data.latency
          });
        },
        onError: (errorData) => {
          setCurrentStatus({
            status: 'error',
            message: `Error: ${errorData.error.message}`,
            model: errorData.model,
            provider: errorData.provider
          });
          
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId ? {
              ...msg,
              content: `❌ Error: ${errorData.error.message}`,
              streaming: false,
              role: 'system'
            } : msg
          ));
        }
      };

      // Enviar a la IA con callbacks
      await aiService.sendMessageWithCallbacks(userMessage, callbacks);

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      
      setCurrentStatus({
        status: 'error',
        message: `Error: ${error.message}`
      });
      
      const errorMessageId = Date.now();
      setMessages(prev => [...prev, {
        id: errorMessageId,
        role: 'system',
        content: `❌ Error: ${error.message}`,
        timestamp: errorMessageId
      }]);
    } finally {
      setIsLoading(false);
      setCurrentStatus(null);
      setAbortController(null);
      
      // Limpiar estado después de 2 segundos
      setTimeout(() => {
        setCurrentStatus(null);
      }, 2000);
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setIsLoading(false);
      setCurrentStatus(null);
      setStreamingContent('');
      setAbortController(null);
      
      // Actualizar el mensaje placeholder
      setMessages(prev => prev.map(msg => 
        msg.streaming ? {
          ...msg,
          content: 'Generación cancelada por el usuario.',
          streaming: false,
          role: 'system'
        } : msg
      ));
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
    setDetectedFiles([]);
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

  // Función para renderizar Markdown de forma segura
  const renderMarkdown = (content) => {
    if (!content) return '';
    
    try {
      // Procesar el markdown con marked
      const html = marked(content);
      
      // Sanitizar el HTML para seguridad
      const cleanHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
      });
      
      return cleanHtml;
    } catch (error) {
      console.error('Error rendering markdown:', error);
      return content;
    }
  };

  // Componente para bloques de código con botón copiar
  const CodeBlockWithCopy = ({ code, language }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {}
    };

    return (
      <div className="ai-codeblock">
        <pre className="hljs">
          <code dangerouslySetInnerHTML={{ __html: code }} />
        </pre>
        <button className="ai-copy-btn" onClick={handleCopy} title="Copiar código">
          <i className={copied ? 'pi pi-check' : 'pi pi-copy'} />
        </button>
        {language && (
          <span className="ai-code-lang">{language}</span>
        )}
      </div>
    );
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const isStreaming = message.streaming;
    const hasContent = message.content && message.content.trim().length > 0;

    // No renderizar mensajes vacíos en streaming (el indicador está arriba)
    if (isStreaming && !hasContent) {
      return null;
    }

    return (
      <div
        key={message.id || `msg-${index}-${message.timestamp}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          marginBottom: '1.5rem',
          width: '100%',
          animation: 'slideIn 0.3s ease-out'
        }}
      >
        {/* Burbuja de mensaje con contenido */}
        <div
          className={`ai-bubble ${isUser ? 'user' : isSystem ? 'system' : 'assistant'} ${isStreaming ? 'streaming' : ''}`}
          style={{
            width: isUser ? 'auto' : '100%',
            background: isSystem
              ? 'rgba(255, 107, 53, 0.1)'
              : isUser
              ? `linear-gradient(135deg, ${themeColors.primaryColor}dd 0%, ${themeColors.primaryColor}cc 100%)`
              : `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`,
            color: themeColors.textPrimary,
            border: `1px solid ${isSystem ? 'rgba(255, 107, 53, 0.3)' : themeColors.borderColor}`,
            borderRadius: '12px',
            padding: '1rem'
          }}
        >
          <div 
            className="ai-md" 
            dangerouslySetInnerHTML={{ 
              __html: isUser || isSystem ? message.content : renderMarkdown(message.content)
            }}
            ref={(el) => {
              if (el && !isUser && !isSystem) {
                el.querySelectorAll('pre code').forEach((block) => {
                  hljs.highlightElement(block);
                });
              }
            }}
            style={{ width: '100%' }}
          />
        </div>

        {/* Timestamp y métricas solo después de completar */}
        {!isStreaming && hasContent && (
          <div
            style={{
              fontSize: '0.7rem',
              color: themeColors.textSecondary,
              marginTop: '0.4rem',
              opacity: 0.7,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>{formatTimestamp(message.timestamp)}</span>
            {message.metadata && (
              <>
                <span>•</span>
                <span>{message.metadata.latency}ms</span>
                {message.metadata.tokens && (
                  <>
                    <span>•</span>
                    <span>~{message.metadata.tokens} tokens</span>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFileDownloads = (files) => {
    if (!files || files.length === 0) return null;

    const getFileIcon = (fileName) => {
      const ext = fileName.split('.').pop().toLowerCase();
      const iconMap = {
        'py': 'pi-file-code',
        'js': 'pi-file-code',
        'ts': 'pi-file-code',
        'jsx': 'pi-file-code',
        'tsx': 'pi-file-code',
        'html': 'pi-file-code',
        'css': 'pi-file-code',
        'json': 'pi-file-code',
        'java': 'pi-file-code',
        'cpp': 'pi-file-code',
        'c': 'pi-file-code',
        'go': 'pi-file-code',
        'rb': 'pi-file-code',
        'php': 'pi-file-code',
        'sh': 'pi-file-code',
        'bash': 'pi-file-code',
        'sql': 'pi-file-database',
        'csv': 'pi-file-csv',
        'txt': 'pi-file-text',
        'md': 'pi-file-text',
        'pdf': 'pi-file-pdf',
        'yaml': 'pi-file-code',
        'yml': 'pi-file-code',
        'xml': 'pi-file-code'
      };
      return iconMap[ext] || 'pi-file';
    };

    const handleDownload = (fileName) => {
      // Crear contenido simulado para el archivo
      const content = `# Archivo generado: ${fileName}\n\nEste archivo fue generado por la IA.\nPuede contener código, datos u otro contenido.`;
      
      // Crear blob y descargar
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    };

    return (
      <div
        style={{
          marginTop: '1rem',
          padding: '1rem',
          background: `linear-gradient(135deg, rgba(100, 200, 100, 0.1) 0%, rgba(100, 200, 100, 0.05) 100%)`,
          border: '1px solid rgba(100, 200, 100, 0.3)',
          borderRadius: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <i className="pi pi-download" style={{ color: '#66bb6a', fontSize: '1rem' }} />
          <span style={{ fontWeight: '600', color: themeColors.textPrimary, fontSize: '0.95rem' }}>
            Archivos generados ({files.length})
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {files.map((file, idx) => (
            <button
              key={idx}
              onClick={() => handleDownload(file)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 0.8rem',
                background: `rgba(100, 200, 100, 0.08)`,
                border: '1px solid rgba(100, 200, 100, 0.2)',
                borderRadius: '8px',
                color: themeColors.textPrimary,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '0.9rem',
                fontWeight: '500',
                textAlign: 'left'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(100, 200, 100, 0.15)';
                e.target.style.borderColor = 'rgba(100, 200, 100, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(100, 200, 100, 0.08)';
                e.target.style.borderColor = 'rgba(100, 200, 100, 0.2)';
              }}
            >
              <i className={`pi ${getFileIcon(file)}`} style={{ color: '#66bb6a' }} />
              <span style={{ flex: 1 }}>{file}</span>
              <i className="pi pi-download" style={{ color: '#66bb6a', fontSize: '0.85rem' }} />
            </button>
          ))}
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

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.8;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.4;
            }
          }

          @keyframes dot-pulse {
            0%, 80%, 100% {
              opacity: 0.3;
              transform: scale(0.8);
            }
            40% {
              opacity: 1;
              transform: scale(1);
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

        {/* Indicador de Pensamiento Profesional */}
        {isLoading && (
          <div
            style={{
              padding: '1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: `linear-gradient(135deg, ${themeColors.primaryColor}15 0%, ${themeColors.primaryColor}08 100%)`,
              borderBottom: `2px solid ${themeColors.primaryColor}40`,
              backdropFilter: 'blur(10px)',
              animation: 'fadeIn 0.3s ease-in'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
              {/* Indicador visual animado */}
              <div style={{ 
                position: 'relative',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* Círculo exterior pulsante */}
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: `${themeColors.primaryColor}20`,
                  animation: 'pulse 2s ease-in-out infinite'
                }}></div>
                
                {/* Icono central */}
                <div style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${themeColors.primaryColor}cc 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 12px ${themeColors.primaryColor}40`
                }}>
                  {currentStatus?.status === 'connecting' && <i className="pi pi-link" style={{ color: '#fff', fontSize: '1rem' }} />}
                  {currentStatus?.status === 'generating' && <i className="pi pi-cog pi-spin" style={{ color: '#fff', fontSize: '1rem' }} />}
                  {currentStatus?.status === 'streaming' && <i className="pi pi-cloud-download" style={{ color: '#fff', fontSize: '1rem' }} />}
                  {currentStatus?.status === 'retrying' && <i className="pi pi-refresh pi-spin" style={{ color: '#fff', fontSize: '1rem' }} />}
                  {!currentStatus?.status && <i className="pi pi-spin pi-spinner" style={{ color: '#fff', fontSize: '1rem' }} />}
                </div>
              </div>

              {/* Información del estado */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  color: themeColors.textPrimary,
                  marginBottom: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {currentStatus?.status === 'connecting' ? 'Conectando con IA' :
                   currentStatus?.status === 'generating' ? 'Generando respuesta' :
                   currentStatus?.status === 'streaming' ? 'Transmitiendo respuesta' :
                   currentStatus?.status === 'retrying' ? 'Reintentando conexión' :
                   'Procesando solicitud'}
                  
                  {/* Puntos animados */}
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <span style={{ 
                      width: '4px', 
                      height: '4px', 
                      borderRadius: '50%', 
                      background: themeColors.primaryColor,
                      animation: 'dot-pulse 1.4s ease-in-out infinite',
                      animationDelay: '0s'
                    }}></span>
                    <span style={{ 
                      width: '4px', 
                      height: '4px', 
                      borderRadius: '50%', 
                      background: themeColors.primaryColor,
                      animation: 'dot-pulse 1.4s ease-in-out infinite',
                      animationDelay: '0.2s'
                    }}></span>
                    <span style={{ 
                      width: '4px', 
                      height: '4px', 
                      borderRadius: '50%', 
                      background: themeColors.primaryColor,
                      animation: 'dot-pulse 1.4s ease-in-out infinite',
                      animationDelay: '0.4s'
                    }}></span>
                  </div>
                </div>
                <div style={{ 
                  fontSize: '0.85rem', 
                  color: themeColors.textSecondary,
                  opacity: 0.9
                }}>
                  {currentStatus?.status === 'connecting' ? 'Estableciendo conexión con el modelo...' :
                   currentStatus?.status === 'generating' ? 'Analizando y procesando tu solicitud...' :
                   currentStatus?.status === 'streaming' ? 'Recibiendo respuesta en tiempo real...' :
                   currentStatus?.status === 'retrying' ? `Reintento ${currentStatus.attempt || 1}/3 - Reestableciendo conexión...` :
                   'Preparando respuesta inteligente...'}
                </div>
              </div>
            </div>

            {/* Botón Detener */}
            {abortController && (
              <button
                onClick={handleStopGeneration}
                style={{
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  color: '#f44336',
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <i className="pi pi-stop-circle" style={{ fontSize: '1.1rem' }} />
                Detener
              </button>
            )}
          </div>
        )}

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

          {detectedFiles.length > 0 && renderFileDownloads(detectedFiles)}

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

