import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    // No limpiar detectedFiles aquí - mantener archivos de conversaciones anteriores

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
          const files = aiService.detectFilesInResponse(data.response, userMessage);
          
          // Actualizar mensaje final con archivos asociados
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
    aiService.clearHistory();
  };

  const handleOpenInTab = () => {
    // Crear nueva pestaña de IA
    const tabId = `ai-chat-${Date.now()}`;
    const newAITab = {
      key: tabId,
      label: 'Chat IA',
      type: 'ai-chat',
      createdAt: Date.now(),
      groupId: null
    };

    // Disparar evento para crear la pestaña
    window.dispatchEvent(new CustomEvent('create-ai-tab', {
      detail: { tab: newAITab }
    }));
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

  // Función para escapar HTML de forma segura
  const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Función para limpiar y preparar el contenido de código
  const sanitizeCodeContent = (block) => {
    // Obtener el contenido de texto puro
    const textContent = block.textContent || block.innerText || '';
    
    // Limpiar cualquier HTML existente
    block.innerHTML = '';
    
    // Establecer el contenido de texto escapado
    block.textContent = textContent;
    
    return textContent;
  };

  // Función memoizada para resaltar código de forma segura
  const highlightCodeBlocks = useCallback((element) => {
    if (!element) return;
    
    const codeBlocks = element.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
      // Limpiar el estado de resaltado previo si existe
      if (block.dataset.highlighted === 'yes') {
        delete block.dataset.highlighted;
        // Limpiar las clases de highlight.js
        block.className = block.className.replace(/hljs\s*/, '').replace(/language-\w+\s*/, '').trim();
      }
      
      // Aplicar el resaltado solo si no está ya resaltado
      if (!block.dataset.highlighted) {
        try {
          // Sanitizar el contenido del bloque de código
          sanitizeCodeContent(block);
          
          // Aplicar el resaltado de forma segura
          hljs.highlightElement(block);
        } catch (error) {
          console.warn('Error highlighting code block:', error);
          // En caso de error, asegurar que el contenido esté limpio y escapado
          sanitizeCodeContent(block);
        }
      }
    });
  }, []);

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
          marginBottom: '0.8rem',
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
            borderRadius: '8px',
            padding: '0.6rem 0.8rem'
          }}
        >
          <div 
            className="ai-md" 
            dangerouslySetInnerHTML={{ 
              __html: isUser || isSystem ? message.content : renderMarkdown(message.content)
            }}
            ref={(el) => {
              if (el && !isUser && !isSystem) {
                highlightCodeBlocks(el);
              }
            }}
            style={{ width: '100%' }}
          />
        </div>

        {/* Timestamp y métricas solo después de completar */}
        {!isStreaming && hasContent && (
          <div
            style={{
              fontSize: '0.65rem',
              color: themeColors.textSecondary,
              marginTop: '0.25rem',
              opacity: 0.7,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
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

        {/* Archivos del mensaje específico */}
        {!isStreaming && message.metadata && message.metadata.files && message.metadata.files.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            {renderFileDownloads(message.metadata.files, message.content)}
          </div>
        )}
      </div>
    );
  };

  const renderFileDownloads = (files, messageContent) => {
    if (!files || files.length === 0) return null;

    // Eliminar duplicados basándose en el nombre del archivo
    const uniqueFiles = [...new Set(files)];

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
      // Buscar el código correspondiente en el contenido del mensaje específico
      let fileContent = '';
      const extension = fileName.split('.').pop();
      
      if (messageContent) {
        const codeBlocks = messageContent.match(/```(\w+)?\n([\s\S]*?)```/g);
        if (codeBlocks) {
          // Buscar el bloque de código que corresponde a este archivo
          let foundBlock = null;
          
          // Primero intentar encontrar por nombre descriptivo
          if (fileName.includes('_')) {
            const nameParts = fileName.split('_');
            const baseName = nameParts[0];
            const expectedExtension = fileName.split('.').pop();
            
            for (let i = 0; i < codeBlocks.length; i++) {
              const match = codeBlocks[i].match(/```(\w+)?\n([\s\S]*?)```/);
              if (match) {
                const language = match[1] || 'txt';
                const code = match[2].trim();
                const actualExtension = getLanguageExtension(language);
                
                // Verificar si el código contiene patrones que coincidan con el nombre
                if (actualExtension === expectedExtension) {
                  const hasMatchingPattern = checkCodePatterns(code, baseName, language);
                  if (hasMatchingPattern) {
                    foundBlock = code;
                    break;
                  }
                }
              }
            }
          }
          
          // Si no se encontró por nombre descriptivo, usar el índice tradicional
          if (!foundBlock) {
            const blockIndex = parseInt(fileName.match(/script_(\d+)\./)?.[1]) - 1;
            if (blockIndex >= 0 && codeBlocks[blockIndex]) {
              const match = codeBlocks[blockIndex].match(/```(\w+)?\n([\s\S]*?)```/);
              if (match) {
                foundBlock = match[2].trim();
              }
            }
          }
          
          // Si aún no se encontró, buscar por extensión
          if (!foundBlock) {
            for (let i = 0; i < codeBlocks.length; i++) {
              const match = codeBlocks[i].match(/```(\w+)?\n([\s\S]*?)```/);
              if (match) {
                const language = match[1] || 'txt';
                const actualExtension = this.getLanguageExtension(language);
                if (actualExtension === extension) {
                  foundBlock = match[2].trim();
                  break;
                }
              }
            }
          }
          
          fileContent = foundBlock || '';
        }
      }
      
      // Si no se encontró contenido específico, crear contenido genérico
      if (!fileContent) {
        fileContent = `# Archivo generado: ${fileName}\n\nEste archivo fue generado por la IA.\nPuede contener código, datos u otro contenido.`;
      }
      
      // Determinar el tipo MIME basado en la extensión
      const mimeTypes = {
        'py': 'text/x-python',
        'js': 'text/javascript',
        'ts': 'text/typescript',
        'jsx': 'text/javascript',
        'tsx': 'text/typescript',
        'html': 'text/html',
        'css': 'text/css',
        'json': 'application/json',
        'xml': 'text/xml',
        'md': 'text/markdown',
        'txt': 'text/plain',
        'sh': 'text/x-shellscript',
        'sql': 'text/x-sql',
        'yaml': 'text/x-yaml',
        'yml': 'text/x-yaml'
      };
      
      const mimeType = mimeTypes[extension] || 'text/plain';
      
      // Crear blob y descargar
      const blob = new Blob([fileContent], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    };

    // Función auxiliar para verificar patrones en el código
    const checkCodePatterns = (code, baseName, language) => {
      const patterns = {
        'func': /def\s+\w+|function\s+\w+/,
        'class': /class\s+\w+/,
        'main': /if\s+__name__\s*==\s*['"]__main__['"]|public\s+static\s+void\s+main/,
        'import': /import\s+\w+/,
        'export': /export\s+(?:default\s+)?\w+/,
        'const': /const\s+\w+/,
        'script': /import\s+\w+|def\s+\w+|function\s+\w+/
      };
      
      const pattern = patterns[baseName];
      return pattern ? pattern.test(code) : false;
    };

    // Función auxiliar para obtener extensión de archivo basada en el lenguaje
    const getLanguageExtension = (language) => {
      const extensions = {
        'python': 'py',
        'javascript': 'js',
        'typescript': 'ts',
        'jsx': 'jsx',
        'tsx': 'tsx',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'go': 'go',
        'rust': 'rs',
        'php': 'php',
        'ruby': 'rb',
        'bash': 'sh',
        'shell': 'sh',
        'sql': 'sql',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'yaml': 'yml',
        'xml': 'xml',
        'markdown': 'md',
        'txt': 'txt'
      };
      return extensions[language] || 'txt';
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
            Archivos generados ({uniqueFiles.length})
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {uniqueFiles.map((file, idx) => (
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

          /* Estilos ultra compactos y profesionales para el contenido markdown */
          .ai-md {
            font-size: 0.9rem !important;
            line-height: 1.35 !important;
            max-width: 100% !important;
            word-wrap: break-word !important;
          }

          .ai-md p {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1.35 !important;
            color: ${themeColors.textPrimary} !important;
            text-align: left !important;
          }

          /* Agregar espacio solo entre párrafos separados por saltos de línea */
          .ai-md p + p {
            margin-top: 0.5rem !important;
          }

          .ai-md h1, .ai-md h2, .ai-md h3, .ai-md h4, .ai-md h5, .ai-md h6 {
            margin: 0.5rem 0 0.3rem 0 !important;
            line-height: 1.2 !important;
            color: ${themeColors.textPrimary} !important;
            font-weight: 600 !important;
            text-align: left !important;
          }

          .ai-md h1 { font-size: 1.2rem !important; }
          .ai-md h2 { font-size: 1.1rem !important; }
          .ai-md h3 { font-size: 1.05rem !important; }
          .ai-md h4, .ai-md h5, .ai-md h6 { font-size: 1rem !important; }

          .ai-md ul, .ai-md ol {
            margin: 0.3rem 0 !important;
            padding-left: 1.2rem !important;
          }

          .ai-md li {
            margin: 0 !important;
            padding: 0.08rem 0 !important;
            line-height: 1.35 !important;
            color: ${themeColors.textPrimary} !important;
          }

          .ai-md li::marker {
            color: ${themeColors.primaryColor} !important;
            font-size: 0.85rem !important;
          }

          .ai-md blockquote {
            margin: 0.4rem 0 !important;
            padding: 0.4rem 0.8rem !important;
            border-left: 2px solid ${themeColors.primaryColor} !important;
            background: rgba(255,255,255,0.02) !important;
            border-radius: 0 4px 4px 0 !important;
            font-style: italic !important;
            color: ${themeColors.textSecondary} !important;
            font-size: 0.85rem !important;
          }

          .ai-md pre {
            margin: 0.4rem 0 !important;
            padding: 0.6rem !important;
            background: rgba(0,0,0,0.15) !important;
            border-radius: 4px !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            overflow-x: auto !important;
            line-height: 1.3 !important;
          }

          .ai-md code {
            padding: 0.15rem 0.3rem !important;
            font-size: 0.8em !important;
            background: rgba(255,255,255,0.1) !important;
            border-radius: 2px !important;
            color: ${themeColors.textPrimary} !important;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
          }

          .ai-md pre code {
            background: transparent !important;
            padding: 0 !important;
            border-radius: 0 !important;
            font-size: 0.8rem !important;
            line-height: 1.3 !important;
          }

          .ai-md strong, .ai-md b {
            color: ${themeColors.textPrimary} !important;
            font-weight: 600 !important;
          }

          .ai-md em, .ai-md i {
            color: ${themeColors.textSecondary} !important;
            font-style: italic !important;
          }

          .ai-md a {
            color: ${themeColors.primaryColor} !important;
            text-decoration: none !important;
            border-bottom: 1px solid transparent !important;
            transition: all 0.2s ease !important;
          }

          .ai-md a:hover {
            border-bottom-color: ${themeColors.primaryColor} !important;
            opacity: 0.8 !important;
          }

          .ai-md table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 0.4rem 0 !important;
            background: rgba(255,255,255,0.02) !important;
            border-radius: 4px !important;
            overflow: hidden !important;
            font-size: 0.8rem !important;
          }

          .ai-md th, .ai-md td {
            padding: 0.3rem 0.5rem !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            text-align: left !important;
          }

          .ai-md th {
            background: rgba(255,255,255,0.05) !important;
            font-weight: 600 !important;
            color: ${themeColors.textPrimary} !important;
          }

          .ai-md td {
            color: ${themeColors.textSecondary} !important;
          }

          /* Espaciado mejorado entre diferentes tipos de elementos */
          .ai-md p + ul, .ai-md p + ol {
            margin-top: 0.3rem !important;
          }

          .ai-md ul + p, .ai-md ol + p {
            margin-top: 0.4rem !important;
          }

          .ai-md h1 + p, .ai-md h2 + p, .ai-md h3 + p,
          .ai-md h4 + p, .ai-md h5 + p, .ai-md h6 + p {
            margin-top: 0.2rem !important;
          }

          .ai-md h1 + ul, .ai-md h2 + ul, .ai-md h3 + ul,
          .ai-md h4 + ul, .ai-md h5 + ul, .ai-md h6 + ul {
            margin-top: 0.3rem !important;
          }

          .ai-md ul + ul, .ai-md ol + ol,
          .ai-md ul + ol, .ai-md ol + ul {
            margin-top: 0.3rem !important;
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
        {/* Header Compacto */}
        <div
          style={{
            padding: '0.6rem 1rem',
            background: `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`,
            backdropFilter: 'blur(8px)',
            borderBottom: `1px solid ${themeColors.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Icono de IA más pequeño */}
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: `linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${themeColors.primaryColor}dd 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 2px 6px ${themeColors.primaryColor}30`
              }}
            >
              <i className="pi pi-comments" style={{ color: 'white', fontSize: '1rem' }} />
            </div>

            <div>
              <h2 style={{ margin: 0, color: themeColors.textPrimary, fontSize: '1rem', fontWeight: '600', lineHeight: '1.2' }}>
                Chat de IA
              </h2>
              <p style={{ margin: 0, color: themeColors.textSecondary, fontSize: '0.7rem', lineHeight: '1.1' }}>
                {currentModel ? `Modelo: ${currentModel}` : 'Selecciona un modelo en configuración'}
              </p>
            </div>
          </div>

          {/* Botones de acción más compactos */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {/* Botón para abrir en pestaña nueva */}
            <button
              onClick={handleOpenInTab}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '6px',
                padding: '0.4rem 0.6rem',
                color: themeColors.textPrimary,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                width: '32px',
                height: '32px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
              title="Abrir Chat IA en pestaña nueva"
            >
              <i className="pi pi-external-link" style={{ fontSize: '0.8rem' }} />
            </button>

            <button
              onClick={() => setShowConfigDialog(true)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '6px',
                padding: '0.4rem 0.6rem',
                color: themeColors.textPrimary,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                width: '32px',
                height: '32px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = themeColors.hoverBackground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
              title="Configuración"
            >
              <i className="pi pi-cog" style={{ fontSize: '0.8rem' }} />
            </button>

            <button
              onClick={handleClearChat}
              style={{
                background: 'rgba(255,107,53,0.2)',
                border: '1px solid rgba(255,107,53,0.4)',
                borderRadius: '6px',
                padding: '0.4rem 0.6rem',
                color: themeColors.textPrimary,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                width: '32px',
                height: '32px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,107,53,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,107,53,0.2)';
              }}
              title="Limpiar chat"
            >
              <i className="pi pi-trash" style={{ fontSize: '0.8rem' }} />
            </button>
          </div>
        </div>

        {/* Indicador de Estado Compacto */}
        {isLoading && (
          <div
            style={{
              padding: '0.6rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: `linear-gradient(135deg, ${themeColors.primaryColor}15 0%, ${themeColors.primaryColor}08 100%)`,
              borderBottom: `1px solid ${themeColors.primaryColor}40`,
              backdropFilter: 'blur(10px)',
              animation: 'fadeIn 0.3s ease-in'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
              {/* Indicador visual más pequeño */}
              <div style={{ 
                position: 'relative',
                width: '32px',
                height: '32px',
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
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${themeColors.primaryColor}cc 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 2px 8px ${themeColors.primaryColor}40`
                }}>
                  {currentStatus?.status === 'connecting' && <i className="pi pi-link" style={{ color: '#fff', fontSize: '0.8rem' }} />}
                  {currentStatus?.status === 'generating' && <i className="pi pi-cog pi-spin" style={{ color: '#fff', fontSize: '0.8rem' }} />}
                  {currentStatus?.status === 'streaming' && <i className="pi pi-cloud-download" style={{ color: '#fff', fontSize: '0.8rem' }} />}
                  {currentStatus?.status === 'retrying' && <i className="pi pi-refresh pi-spin" style={{ color: '#fff', fontSize: '0.8rem' }} />}
                  {!currentStatus?.status && <i className="pi pi-spin pi-spinner" style={{ color: '#fff', fontSize: '0.8rem' }} />}
                </div>
              </div>

              {/* Información del estado más compacta */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: '600', 
                  color: themeColors.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  lineHeight: '1.2'
                }}>
                  {currentStatus?.status === 'connecting' ? 'Conectando...' :
                   currentStatus?.status === 'generating' ? 'Generando respuesta...' :
                   currentStatus?.status === 'streaming' ? 'Recibiendo respuesta...' :
                   currentStatus?.status === 'retrying' ? 'Reintentando...' :
                   'Procesando...'}
                  
                  {/* Puntos animados más pequeños */}
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <span style={{ 
                      width: '3px', 
                      height: '3px', 
                      borderRadius: '50%', 
                      background: themeColors.primaryColor,
                      animation: 'dot-pulse 1.4s ease-in-out infinite',
                      animationDelay: '0s'
                    }}></span>
                    <span style={{ 
                      width: '3px', 
                      height: '3px', 
                      borderRadius: '50%', 
                      background: themeColors.primaryColor,
                      animation: 'dot-pulse 1.4s ease-in-out infinite',
                      animationDelay: '0.2s'
                    }}></span>
                    <span style={{ 
                      width: '3px', 
                      height: '3px', 
                      borderRadius: '50%', 
                      background: themeColors.primaryColor,
                      animation: 'dot-pulse 1.4s ease-in-out infinite',
                      animationDelay: '0.4s'
                    }}></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botón Detener más compacto */}
            {abortController && (
              <button
                onClick={handleStopGeneration}
                style={{
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  color: '#f44336',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
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
                <i className="pi pi-stop-circle" style={{ fontSize: '0.9rem' }} />
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


          <div ref={messagesEndRef} />
        </div>

        {/* Input área compacta */}
        <div
          style={{
            padding: '0.6rem 1rem',
            background: `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`,
            backdropFilter: 'blur(8px)',
            borderTop: `1px solid ${themeColors.borderColor}`
          }}
        >
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
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
                padding: '0.6rem',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '8px',
                color: themeColors.textPrimary,
                fontSize: '0.9rem',
                resize: 'none',
                minHeight: '40px',
                maxHeight: '100px',
                transition: 'all 0.2s ease'
              }}
              rows={1}
            />

            {/* Selector de modelos más compacto */}
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
              placeholder={functionalModels.length === 0 ? "Sin modelos" : "Modelo"}
              disabled={isLoading || functionalModels.length === 0}
              className="ai-model-dropdown"
              style={{
                minWidth: '140px',
                maxWidth: '180px',
                height: '40px'
              }}
              panelStyle={{
                background: themeColors.cardBackground,
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '8px',
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
                borderRadius: '8px',
                padding: '0.6rem 1.2rem',
                color: 'white',
                cursor: currentModel && inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                boxShadow: currentModel && inputValue.trim() ? `0 2px 6px ${themeColors.primaryColor}30` : 'none',
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
                marginTop: '0.4rem',
                fontSize: '0.75rem',
                color: 'rgba(255,107,53,0.8)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <i className="pi pi-exclamation-triangle" style={{ fontSize: '0.8rem' }} />
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

