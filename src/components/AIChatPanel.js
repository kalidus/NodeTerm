import React, { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import { Dropdown } from 'primereact/dropdown';
import { aiService } from '../services/AIService';
import { conversationService } from '../services/ConversationService';
import { markdownFormatter } from '../services/MarkdownFormatter';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';
import AIConfigDialog from './AIConfigDialog';
import FileTypeDetectionPanel from './FileTypeDetectionPanel';
import FileUploader from './FileUploader';
import AIPerformanceStats from './AIPerformanceStats';
import smartFileDetectionService from '../services/SmartFileDetectionService';
import fileAnalysisService from '../services/FileAnalysisService';

// Importar tema de highlight.js
import 'highlight.js/styles/github-dark.css';
// Importar estilos del AI chat
import '../styles/components/ai-chat.css';

const AIChatPanel = ({ showHistory = true, onToggleHistory }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState(null);
  const [modelType, setModelType] = useState('remote');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [themeVersion, setThemeVersion] = useState(0);
  const [functionalModels, setFunctionalModels] = useState([]);
  const [lastResponseTokens, setLastResponseTokens] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Estados avanzados para Fase 2
  const [currentStatus, setCurrentStatus] = useState(null);
  const [abortController, setAbortController] = useState(null);
  
  // Estados para historial de conversaciones
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversationTitle, setConversationTitle] = useState('');
  
  // Estados para detección inteligente de archivos
  const [detectedFileTypes, setDetectedFileTypes] = useState([]);
  const [showFileTypeSuggestions, setShowFileTypeSuggestions] = useState(false);
  const [fileTypeSuggestions, setFileTypeSuggestions] = useState([]);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [showDetailedFileTypes, setShowDetailedFileTypes] = useState(false);
  
  // Estados para archivos adjuntos
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showFileUploader, setShowFileUploader] = useState(false);

  // Configurar marked con resaltado de sintaxis y opciones mejoradas
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
      langPrefix: 'hljs language-',
      // Opciones adicionales para mejor manejo de formato
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: true,
      // Mejorar el manejo de tablas
      tables: true,
      // Mejorar el manejo de enlaces
      linkify: true,
      // Configuración para mejor consistencia
      headerIds: false,
      mangle: false
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
    
    // SIEMPRE empezar con una nueva conversación limpia
    // No cargar conversación anterior automáticamente para evitar mezcla de contenido
    const newConversation = conversationService.createConversation(
      null, 
      aiService.currentModel, 
      aiService.modelType
    );
    setCurrentConversationId(newConversation.id);
    setConversationTitle(newConversation.title);
    
    // Asegurar que empezamos con estado limpio
    setMessages([]);
    setAttachedFiles([]);
    
    console.log('🔄 [AIChatPanel] Nueva conversación iniciada:', {
      id: newConversation.id,
      title: newConversation.title,
      cleanStart: true
    });
  }, []);

  // Escuchar eventos del historial de conversaciones
  useEffect(() => {
    const handleLoadConversationEvent = (event) => {
      const conversationId = event.detail.conversationId;
      handleLoadConversation(conversationId);
    };

    const handleNewConversationEvent = () => {
      handleNewConversation();
    };

    window.addEventListener('load-conversation', handleLoadConversationEvent);
    window.addEventListener('new-conversation', handleNewConversationEvent);

    return () => {
      window.removeEventListener('load-conversation', handleLoadConversationEvent);
      window.removeEventListener('new-conversation', handleNewConversationEvent);
    };
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

  // Función para analizar el contexto y detectar tipos de archivos
  const analyzeFileTypes = useCallback((inputText) => {
    if (!inputText.trim()) return;
    
    try {
      const suggestions = smartFileDetectionService.getSmartSuggestions(messages, inputText);
      
      setDetectedFileTypes(suggestions.detected);
      setFileTypeSuggestions(suggestions.suggestions);
      setDetectionConfidence(suggestions.confidence);
      
      // Mostrar sugerencias si hay confianza suficiente
      if (suggestions.confidence > 0.3 && suggestions.suggestions.length > 0) {
        setShowFileTypeSuggestions(true);
      } else {
        setShowFileTypeSuggestions(false);
      }
    } catch (error) {
      console.error('Error analizando tipos de archivos:', error);
    }
  }, [messages]);

  // Analizar tipos de archivos cuando cambia el input
  useEffect(() => {
    if (inputValue.trim()) {
      const timeoutId = setTimeout(() => {
        analyzeFileTypes(inputValue);
      }, 500); // Debounce de 500ms
      
      return () => clearTimeout(timeoutId);
    } else {
      setShowFileTypeSuggestions(false);
      setDetectedFileTypes([]);
      setFileTypeSuggestions([]);
      setDetectionConfidence(0);
    }
  }, [inputValue, analyzeFileTypes]);

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
      // Agregar mensaje del usuario a la conversación con archivos adjuntos
      const userMessageObj = conversationService.addMessage('user', userMessage, {
        attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined
      });
      setMessages(prev => [...prev, {
        id: userMessageObj.id,
        role: 'user',
        content: userMessage,
        timestamp: userMessageObj.timestamp,
        attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined
      }]);

      // Actualizar el título de la conversación si es el primer mensaje
      const currentConversation = conversationService.getCurrentConversation();
      if (currentConversation && currentConversation.title !== conversationTitle) {
        setConversationTitle(currentConversation.title);
      }

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
          
          // Agregar respuesta del asistente a la conversación
          const assistantMessageObj = conversationService.addMessage('assistant', data.response, {
            latency: data.latency,
            model: data.model,
            provider: data.provider,
            tokens: Math.ceil(data.response.length / 4),
            files: files.length > 0 ? files : undefined
          });
          
          // Calcular tokens reales de la respuesta
          const responseTokens = Math.ceil(data.response.length / 4);
          
          // Actualizar mensaje final con archivos asociados
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId ? {
              ...msg,
              id: assistantMessageObj.id,
              content: data.response,
              streaming: false,
              metadata: {
                latency: data.latency,
                model: data.model,
                provider: data.provider,
                tokens: responseTokens,
                files: files.length > 0 ? files : undefined
              }
            } : msg
          ));
          
          // Actualizar tokens de la última respuesta para el contador visual
          setLastResponseTokens(responseTokens);
          
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

      // Preparar mensaje con archivos adjuntos si los hay
      let finalMessage = userMessage;
      if (attachedFiles.length > 0) {
        const fileContents = attachedFiles.map(file => 
          fileAnalysisService.prepareContentForAI(file)
        ).join('\n\n');
        finalMessage = `${userMessage}\n\n${fileContents}`;
      }

      // Enviar a la IA con callbacks
      await aiService.sendMessageWithCallbacks(finalMessage, callbacks);

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

  // Funciones para manejar archivos adjuntos
  const handleFilesAdded = (newFiles) => {
    setAttachedFiles(prev => [...prev, ...newFiles]);
    // Guardar archivos adjuntos a la conversación actual
    conversationService.addAttachedFiles(newFiles);
    // Ocultar el diálogo de upload automáticamente después de añadir archivos
    setShowFileUploader(false);
  };

  const handleFileRemoved = (fileId) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
    // Remover archivo de la conversación actual
    conversationService.removeAttachedFile(fileId);
  };

  const toggleFileUploader = () => {
    setShowFileUploader(prev => !prev);
  };

  const clearAttachedFiles = () => {
    setAttachedFiles([]);
    // Limpiar archivos adjuntos de la conversación actual
    conversationService.clearAttachedFiles();
    setShowFileUploader(false);
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
    
    // Crear nueva conversación
    const newConversation = conversationService.createConversation(
      null, 
      currentModel, 
      modelType
    );
    setCurrentConversationId(newConversation.id);
    setConversationTitle(newConversation.title);
    
    // Disparar evento para actualizar el historial
    window.dispatchEvent(new CustomEvent('conversation-updated'));
  };

  const handleNewConversation = () => {
    // Reset completo del estado antes de crear nueva conversación
    setMessages([]);
    setAttachedFiles([]);
    setInputValue('');
    setIsLoading(false);
    setLastResponseTokens(0);
    
    // Crear nueva conversación completamente limpia
    const newConversation = conversationService.createConversation(
      null, 
      currentModel, 
      modelType
    );
    
    // Actualizar estado con la nueva conversación
    setCurrentConversationId(newConversation.id);
    setConversationTitle(newConversation.title);
    
    // Asegurar que los mensajes estén vacíos (doble verificación)
    setMessages([]);
    
    console.log('Nueva conversación creada:', {
      id: newConversation.id,
      title: newConversation.title,
      messagesCount: newConversation.messages.length,
      attachedFilesCount: newConversation.attachedFiles.length
    });
    
    // Disparar evento para actualizar el historial
    window.dispatchEvent(new CustomEvent('conversation-updated'));
  };

  const handleLoadConversation = (conversationId) => {
    const conversation = conversationService.loadConversation(conversationId);
    if (conversation) {
      setCurrentConversationId(conversation.id);
      setConversationTitle(conversation.title);
      setMessages(conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata
      })));
      // Cargar archivos adjuntos de la conversación
      const attachedFiles = conversationService.getAttachedFilesForConversation(conversationId);
      setAttachedFiles(attachedFiles || []);
    }
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


  // Función para copiar código al portapapeles
  const copyCode = useCallback((codeId) => {
    console.log('copyCode called with ID:', codeId);
    const codeElement = document.getElementById(codeId);
    console.log('Code element found:', codeElement);
    
    if (codeElement) {
      const codeText = codeElement.textContent || codeElement.innerText;
      console.log('Code text to copy:', codeText);
      
      // Mostrar feedback visual inmediatamente
      const button = document.querySelector(`[data-code-id="${codeId}"]`);
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="pi pi-spin pi-spinner"></i> Copiando...';
        button.style.background = 'rgba(255, 193, 7, 0.2)';
        button.style.borderColor = 'rgba(255, 193, 7, 0.4)';
        
        // Intentar copiar con Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(codeText).then(() => {
            console.log('Code copied successfully');
            button.innerHTML = '<i class="pi pi-check"></i> Copiado';
            button.style.background = 'rgba(100, 200, 100, 0.2)';
            button.style.borderColor = 'rgba(100, 200, 100, 0.4)';
            
            setTimeout(() => {
              button.innerHTML = originalText;
              button.style.background = '';
              button.style.borderColor = '';
            }, 2000);
          }).catch(err => {
            console.error('Clipboard API error:', err);
            // Fallback
            fallbackCopy(codeText, button, originalText);
          });
        } else {
          // Fallback para navegadores que no soportan Clipboard API
          fallbackCopy(codeText, button, originalText);
        }
      }
    } else {
      console.error('Code element not found with ID:', codeId);
    }
  }, []);

  // Función de respaldo para copiar
  const fallbackCopy = (text, button, originalText) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        console.log('Code copied with fallback method');
        button.innerHTML = '<i class="pi pi-check"></i> Copiado';
        button.style.background = 'rgba(100, 200, 100, 0.2)';
        button.style.borderColor = 'rgba(100, 200, 100, 0.4)';
      } else {
        throw new Error('execCommand failed');
      }
      
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '';
        button.style.borderColor = '';
      }, 2000);
    } catch (err) {
      console.error('Fallback copy failed:', err);
      button.innerHTML = '<i class="pi pi-times"></i> Error';
      button.style.background = 'rgba(220, 53, 69, 0.2)';
      button.style.borderColor = 'rgba(220, 53, 69, 0.4)';
      
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '';
        button.style.borderColor = '';
      }, 2000);
    }
  };

  // Hacer la función copyCode global para que sea accesible desde el HTML
  useEffect(() => {
    window.copyCode = copyCode;
    return () => {
      delete window.copyCode;
    };
  }, [copyCode]);

  // Función para procesar bloques de código después del renderizado
  const processCodeBlocksAfterRender = (htmlContent) => {
    // Crear un elemento temporal para manipular el HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Buscar todos los bloques de código
    const codeBlocks = tempDiv.querySelectorAll('pre code');
    
    codeBlocks.forEach((codeBlock) => {
      const pre = codeBlock.parentElement;
      const language = codeBlock.className.match(/language-(\w+)/)?.[1] || 'text';
      const codeId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Crear el contenedor del bloque de código
      const codeContainer = document.createElement('div');
      codeContainer.className = 'ai-codeblock';
      codeContainer.setAttribute('data-language', language);
      
      // Crear el header
      const header = document.createElement('div');
      header.className = 'ai-code-header';
      
      // Crear el indicador de lenguaje
      const langSpan = document.createElement('span');
      langSpan.className = 'ai-code-lang';
      langSpan.textContent = language.toUpperCase();
      
      // Crear el botón de copiar con onclick inline
      const copyBtn = document.createElement('button');
      copyBtn.className = 'ai-copy-btn';
      copyBtn.setAttribute('data-code-id', codeId);
      copyBtn.innerHTML = '<i class="pi pi-copy"></i> Copiar';
      copyBtn.setAttribute('onclick', `window.copyCode('${codeId}')`);
      
      // Ensamblar el header
      header.appendChild(langSpan);
      header.appendChild(copyBtn);
      
      // Crear el nuevo pre con el código
      const newPre = document.createElement('pre');
      newPre.className = `hljs language-${language} ai-code-pre`;
      // Asegurar que el pre respeta el contenedor (estilos inline de respaldo)
      newPre.style.width = '100%';
      newPre.style.maxWidth = '100%';
      newPre.style.boxSizing = 'border-box';
      newPre.style.overflowX = 'auto';
      newPre.style.overflowY = 'auto';
      
      const newCode = document.createElement('code');
      newCode.id = codeId;
      newCode.textContent = codeBlock.textContent;
      // Estilos inline para el código
      newCode.style.display = 'block';
      newCode.style.width = '100%';
      newCode.style.maxWidth = '100%';
      newCode.style.boxSizing = 'border-box';
      
      newPre.appendChild(newCode);
      
      // Ensamblar el contenedor
      codeContainer.appendChild(header);
      codeContainer.appendChild(newPre);
      
      // Reemplazar el elemento original
      pre.parentNode.replaceChild(codeContainer, pre);
    });
    
    return tempDiv.innerHTML;
  };

  // Función para renderizar Markdown con formato ChatGPT-like
  const renderMarkdown = (content) => {
    if (!content) return '';
    
    try {
      // Pre-procesar el contenido para mejorar el formato
      let processedContent = preprocessMarkdown(content);
      
      // Configurar marked con opciones mejoradas
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
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: true
      });
      
      // Procesar el markdown
      const html = marked(processedContent);
      
      // Procesar bloques de código después del renderizado
      const processedHtml = processCodeBlocksAfterRender(html);
      
      // Sanitizar el HTML para seguridad
      const cleanHtml = DOMPurify.sanitize(processedHtml, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'span', 'div', 'button', 'i'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'onclick', 'data-language', 'data-code-id', 'data-code'],
        ALLOW_DATA_ATTR: true,
        ALLOW_UNKNOWN_PROTOCOLS: false,
        SANITIZE_DOM: false
      });
      
      return cleanHtml;
    } catch (error) {
      console.error('Error rendering markdown:', error);
      return content;
    }
  };

  // Función para pre-procesar el markdown y mejorar el formato
  const preprocessMarkdown = (content) => {
    if (!content) return '';
    
    let processed = content;
    
    // Mejorar encabezados de nivel 1 con separadores y emojis
    processed = processed.replace(/^#{1}\s*(.+)$/gm, (match, text) => {
      const cleanText = text.trim();
      // Separador superior para H1
      return `---\n# ${cleanText}\n---`;
    });
    
    // Mejorar encabezados de nivel 2 con numeración y iconos
    let h2Counter = 0;
    processed = processed.replace(/^#{2}\s*(.+)$/gm, (match, text) => {
      h2Counter++;
      const cleanText = text.trim();
      
      // Iconos según el contenido
      let icon = '📌';
      if (cleanText.toLowerCase().includes('características') || cleanText.toLowerCase().includes('features')) {
        icon = '⭐';
      } else if (cleanText.toLowerCase().includes('ventajas') || cleanText.toLowerCase().includes('benefits')) {
        icon = '✨';
      } else if (cleanText.toLowerCase().includes('requisitos') || cleanText.toLowerCase().includes('requirements')) {
        icon = '📋';
      } else if (cleanText.toLowerCase().includes('instalación') || cleanText.toLowerCase().includes('installation')) {
        icon = '🔧';
      } else if (cleanText.toLowerCase().includes('cómo') || cleanText.toLowerCase().includes('how')) {
        icon = '❓';
      } else if (cleanText.toLowerCase().includes('ejemplo') || cleanText.toLowerCase().includes('example')) {
        icon = '📝';
      } else if (cleanText.toLowerCase().includes('solución') || cleanText.toLowerCase().includes('solution')) {
        icon = '💡';
      } else if (cleanText.toLowerCase().includes('por qué') || cleanText.toLowerCase().includes('why')) {
        icon = '🤔';
      }
      
      return `## ${icon} ${h2Counter}. ${cleanText}`;
    });
    
    // Mejorar encabezados de nivel 3 con iconos adicionales
    processed = processed.replace(/^#{3}\s*(.+)$/gm, (match, text) => {
      const cleanText = text.trim();
      
      // Iconos para subsecciones
      let icon = '◆';
      if (cleanText.toLowerCase().includes('ventaja') || cleanText.toLowerCase().includes('benefit')) {
        icon = '✓';
      } else if (cleanText.toLowerCase().includes('tipo') || cleanText.toLowerCase().includes('type')) {
        icon = '▶';
      } else if (cleanText.toLowerCase().includes('uso') || cleanText.toLowerCase().includes('usage')) {
        icon = '▸';
      }
      
      return `### ${icon} ${cleanText}`;
    });
    
    // Mejorar listas con mejor espaciado
    processed = processed.replace(/^(\s*)([-*+])\s+(.+)$/gm, (match, indent, marker, text) => {
      return `${indent}${marker} ${text.trim()}`;
    });
    
    // Mejorar listas numeradas
    processed = processed.replace(/^(\s*)(\d+\.)\s+(.+)$/gm, (match, indent, number, text) => {
      return `${indent}${number} ${text.trim()}`;
    });
    
    // Mejorar bloques de código
    processed = processed.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      return `\`\`\`${language}\n${code.trim()}\n\`\`\``;
    });
    
    return processed;
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

  // Componente para bloques de código con formato ChatGPT-like
  const CodeBlockWithCopy = ({ code, language }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Error copying code:', err);
        // Fallback para navegadores que no soportan clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    return (
      <div className="ai-codeblock">
        <pre className="hljs">
          <code dangerouslySetInnerHTML={{ __html: code }} />
        </pre>
        <button 
          className="ai-copy-btn" 
          onClick={handleCopy} 
          title={copied ? "¡Copiado!" : "Copiar código"}
        >
          <i className={copied ? 'pi pi-check' : 'pi pi-copy'} />
          {copied ? 'Copiado' : 'Copiar'}
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
          
          {/* Indicador simple si el mensaje tenía archivos adjuntos */}
          {isUser && message.attachedFiles && message.attachedFiles.length > 0 && (
            <div style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: themeColors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <i className="pi pi-paperclip" />
              <span>{message.attachedFiles.length} archivo{message.attachedFiles.length > 1 ? 's' : ''} adjunto{message.attachedFiles.length > 1 ? 's' : ''}</span>
            </div>
          )}
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
        'cs': 'pi-file-code',
        'go': 'pi-file-code',
        'rb': 'pi-file-code',
        'php': 'pi-file-code',
        'pl': 'pi-file-code',
        'swift': 'pi-file-code',
        'kt': 'pi-file-code',
        'scala': 'pi-file-code',
        'dart': 'pi-file-code',
        'lua': 'pi-file-code',
        'r': 'pi-file-code',
        'jl': 'pi-file-code',
        'hs': 'pi-file-code',
        'erl': 'pi-file-code',
        'ex': 'pi-file-code',
        'clj': 'pi-file-code',
        'fs': 'pi-file-code',
        'ml': 'pi-file-code',
        'lisp': 'pi-file-code',
        'scm': 'pi-file-code',
        'rkt': 'pi-file-code',
        'd': 'pi-file-code',
        'nim': 'pi-file-code',
        'cr': 'pi-file-code',
        'zig': 'pi-file-code',
        'v': 'pi-file-code',
        'm': 'pi-file-code',
        'f90': 'pi-file-code',
        'asm': 'pi-file-code',
        'vhdl': 'pi-file-code',
        'tcl': 'pi-file-code',
        'adb': 'pi-file-code',
        'cob': 'pi-file-code',
        'pas': 'pi-file-code',
        'ps1': 'pi-file-code',
        'bat': 'pi-file-code',
        'cmd': 'pi-file-code',
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

    const handleDownload = (fileName) => {
      // Buscar el código correspondiente en el contenido del mensaje específico
      let fileContent = '';
      const extension = fileName.split('.').pop();
      
      if (messageContent) {
        const codeBlocks = messageContent.match(/```(\w+)?\n([\s\S]*?)```/g);
        if (codeBlocks) {
          // Buscar el bloque de código que corresponde a este archivo
          let foundBlock = null;
          
          // Estrategia 1: Buscar por índice en el nombre del archivo (script_1.js, script_2.py, etc.)
          const indexMatch = fileName.match(/script_(\d+)\./);
          if (indexMatch) {
            const blockIndex = parseInt(indexMatch[1]) - 1;
            if (blockIndex >= 0 && blockIndex < codeBlocks.length) {
              const match = codeBlocks[blockIndex].match(/```(\w+)?\n([\s\S]*?)```/);
              if (match) {
                foundBlock = match[2].trim();
              }
            }
          }
          
          // Estrategia 2: Si no se encontró por índice, buscar por nombre descriptivo
          if (!foundBlock && fileName.includes('_')) {
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
          
          // Estrategia 3: Si aún no se encontró, buscar por extensión y usar el primer bloque disponible
          if (!foundBlock) {
            for (let i = 0; i < codeBlocks.length; i++) {
              const match = codeBlocks[i].match(/```(\w+)?\n([\s\S]*?)```/);
              if (match) {
                const language = match[1] || 'txt';
                const actualExtension = getLanguageExtension(language);
                if (actualExtension === extension) {
                  foundBlock = match[2].trim();
                  break;
                }
              }
            }
          }
          
          // Estrategia 4: Si aún no se encontró, usar el primer bloque de código disponible
          if (!foundBlock && codeBlocks.length > 0) {
            const match = codeBlocks[0].match(/```(\w+)?\n([\s\S]*?)```/);
            if (match) {
              foundBlock = match[2].trim();
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

          /* Estilos específicos para el input del chat de IA con color del tema */
          #ai-chat-input:focus {
            border: 1px solid ${themeColors.primaryColor} !important;
            outline: none !important;
            box-shadow: 0 0 0 2px ${themeColors.primaryColor}33 !important;
          }

          #ai-chat-input:focus-visible {
            border: 1px solid ${themeColors.primaryColor} !important;
            outline: none !important;
            box-shadow: 0 0 0 2px ${themeColors.primaryColor}33 !important;
          }

          /* Sobrescribir cualquier estilo global que pueda interferir */
          #ai-chat-input {
            border: 1px solid rgba(255,255,255,0.15) !important;
            outline: none !important;
            box-shadow: none !important;
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
            font-size: 0.95rem !important;
            line-height: 1.6 !important;
            max-width: 100% !important;
            word-wrap: break-word !important;
          }

          .ai-md p {
            margin: 0 0 0.8rem 0 !important;
            padding: 0 !important;
            line-height: 1.7 !important;
            color: ${themeColors.textPrimary} !important;
            text-align: left !important;
          }

          /* Agregar espacio solo entre párrafos separados por saltos de línea */
          .ai-md p + p {
            margin-top: 0 !important;
          }

          .ai-md h1, .ai-md h2, .ai-md h3, .ai-md h4, .ai-md h5, .ai-md h6 {
            margin: 1rem 0 0.6rem 0 !important;
            line-height: 1.3 !important;
            color: ${themeColors.textPrimary} !important;
            font-weight: 600 !important;
            text-align: left !important;
          }

          .ai-md h1 { 
            font-size: 1.3rem !important; 
            margin-top: 0 !important;
            margin-bottom: 1rem !important;
            border-top: 1px solid rgba(255,255,255,0.15) !important;
            border-bottom: 1px solid rgba(255,255,255,0.15) !important;
            padding: 0.6rem 0 !important;
            text-align: center !important;
          }
          
          .ai-md h2 { 
            font-size: 1.35rem !important; 
            margin-top: 1.8rem !important;
            margin-bottom: 1rem !important;
            border-left: 6px solid #58a6ff !important;
            border-bottom: 3px solid #58a6ff !important;
            padding: 1rem 0 1rem 1.2rem !important;
            background: linear-gradient(90deg, rgba(88, 166, 255, 0.12) 0%, transparent 100%) !important;
            display: flex !important;
            align-items: center !important;
            gap: 1rem !important;
            font-weight: 800 !important;
            letter-spacing: 0.3px !important;
            min-height: 2rem !important;
            line-height: 1.4 !important;
            position: relative !important;
          }

          .ai-md h2:not(:first-child) {
            border-top: none !important;
            padding-top: 1rem !important;
            margin-top: 1.8rem !important;
          }

          .ai-md h2::before {
            content: "📌" !important;
            font-size: 1.5rem !important;
            display: inline-block !important;
            min-width: 1.5rem !important;
            flex-shrink: 0 !important;
            filter: drop-shadow(0 0 4px rgba(88, 166, 255, 0.3)) !important;
          }

          .ai-md h2:nth-of-type(2)::before {
            content: "⭐" !important;
          }

          .ai-md h2:nth-of-type(3)::before {
            content: "⚙️" !important;
          }

          .ai-md h2:nth-of-type(4)::before {
            content: "💡" !important;
          }

          .ai-md h2:nth-of-type(5)::before {
            content: "✨" !important;
          }

          .ai-md h2:nth-of-type(6)::before {
            content: "📋" !important;
          }

          .ai-md h3 { 
            font-size: 1.15rem !important; 
            margin-top: 1.2rem !important;
            margin-bottom: 0.6rem !important;
            border-left: 5px solid rgba(88, 166, 255, 0.8) !important;
            border-bottom: 2px solid rgba(88, 166, 255, 0.5) !important;
            padding: 0.6rem 0 0.6rem 1rem !important;
            background: rgba(88, 166, 255, 0.06) !important;
            display: flex !important;
            align-items: center !important;
            gap: 0.7rem !important;
            font-weight: 700 !important;
            letter-spacing: 0.2px !important;
          }

          .ai-md h3::before {
            content: "▸" !important;
            font-size: 1.2rem !important;
            color: #58a6ff !important;
            flex-shrink: 0 !important;
            font-weight: bold !important;
            filter: drop-shadow(0 0 2px rgba(88, 166, 255, 0.2)) !important;
          }
          
          .ai-md h4, .ai-md h5, .ai-md h6 { 
            font-size: 1rem !important;
            margin-top: 0.6rem !important;
          }

          .ai-md ul, .ai-md ol {
            margin: 0.6rem 0 0.8rem 0 !important;
            padding-left: 2.2rem !important;
            background: transparent !important;
            border: none !important;
          }

          .ai-md li {
            margin: 0.25rem 0 !important;
            padding: 0 !important;
            line-height: 1.6 !important;
            color: ${themeColors.textPrimary} !important;
            border: none !important;
            font-size: 0.95rem !important;
          }

          .ai-md li:last-child {
            border-bottom: none !important;
          }

          .ai-md ul li {
            list-style-type: none !important;
            position: relative !important;
          }

          .ai-md ul li::before {
            content: "●" !important;
            color: #58a6ff !important;
            position: absolute !important;
            left: -1.4rem !important;
            top: 0.3rem !important;
            font-size: 0.4rem !important;
            font-weight: bold !important;
          }

          .ai-md ol li {
            list-style-type: decimal !important;
            margin-left: 0 !important;
            font-size: 0.95rem !important;
            padding-left: 0.3rem !important;
            position: relative !important;
          }

          .ai-md li::marker {
            color: #58a6ff !important;
            font-size: 0.9rem !important;
          }

          .ai-md blockquote {
            margin: 1rem 0 !important;
            padding: 1rem 1.2rem !important;
            border-left: 4px solid #58a6ff !important;
            background: linear-gradient(135deg, rgba(88, 166, 255, 0.08) 0%, rgba(88, 166, 255, 0.03) 100%) !important;
            border-radius: 0 8px 8px 0 !important;
            font-style: italic !important;
            color: rgba(255,255,255,0.85) !important;
            font-size: 0.9rem !important;
            border: 1px solid rgba(88, 166, 255, 0.2) !important;
          }

          .ai-md blockquote p {
            margin: 0 !important;
            color: rgba(255,255,255,0.85) !important;
          }

          .ai-md pre {
            margin: 0.8rem 0 !important;
            padding: 0.8rem 1rem !important;
            background: rgba(0,0,0,0.3) !important;
            border-radius: 8px !important;
            border: 1px solid rgba(255,255,255,0.15) !important;
            font-size: 0.85rem !important;
            line-height: 1.4 !important;
          }

          .ai-md code:not(pre code) {
            background: rgba(88, 166, 255, 0.1) !important;
            border: 1px solid rgba(88, 166, 255, 0.2) !important;
            padding: 0.15rem 0.35rem !important;
            border-radius: 3px !important;
            font-size: 0.85em !important;
            color: #58a6ff !important;
            font-weight: 500 !important;
          }

          .ai-md strong, .ai-md b {
            font-weight: 700 !important;
            color: rgba(255, 255, 255, 0.95) !important;
          }

          .ai-md em, .ai-md i {
            font-style: italic !important;
            color: rgba(255, 255, 255, 0.9) !important;
          }

          .ai-md hr {
            border: none !important;
            height: 1px !important;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent) !important;
            margin: 1rem 0 !important;
          }
        `}
      </style>

      <div
        className="ai-chat-panel"
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
                {conversationTitle || 'Chat de IA'}
              </h2>
              <p style={{ margin: 0, color: themeColors.textSecondary, fontSize: '0.7rem', lineHeight: '1.1' }}>
                {currentModel ? `Modelo: ${currentModel}` : 'Selecciona un modelo en configuración'}
              </p>
            </div>
          </div>

          {/* Botones de acción más compactos */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {/* Botón historial */}
            {onToggleHistory && (
              <button
                onClick={onToggleHistory}
                style={{
                  background: showHistory ? themeColors.primaryColor : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${showHistory ? themeColors.primaryColor : themeColors.borderColor}`,
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  color: showHistory ? 'white' : themeColors.textPrimary,
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
                  e.currentTarget.style.background = showHistory ? themeColors.primaryColor + 'dd' : 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = showHistory ? themeColors.primaryColor : 'rgba(255,255,255,0.1)';
                }}
                title={showHistory ? 'Ocultar historial' : 'Mostrar historial'}
              >
                <i className={`pi ${showHistory ? 'pi-eye-slash' : 'pi-eye'}`} style={{ fontSize: '0.8rem' }} />
              </button>
            )}

            {/* Botón nueva conversación */}
            <button
              onClick={handleNewConversation}
              style={{
                background: 'rgba(100, 200, 100, 0.2)',
                border: '1px solid rgba(100, 200, 100, 0.4)',
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
                e.currentTarget.style.background = 'rgba(100, 200, 100, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(100, 200, 100, 0.2)';
              }}
              title="Nueva conversación"
            >
              <i className="pi pi-plus" style={{ fontSize: '0.8rem' }} />
            </button>

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
          {/* Mostrar archivos adjuntos al principio del chat */}
          {attachedFiles.length > 0 && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              border: `1px solid ${themeColors.primaryColor}`,
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: '500',
                color: themeColors.primaryColor,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className="pi pi-paperclip" />
                <span>{attachedFiles.length} archivo{attachedFiles.length > 1 ? 's' : ''} adjunto{attachedFiles.length > 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {attachedFiles.map((file) => (
                  <div key={file.id} style={{
                    fontSize: '0.8rem',
                    color: themeColors.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    paddingLeft: '1.5rem'
                  }}>
                    <i className="pi pi-file" style={{ fontSize: '0.7rem' }} />
                    <span>{file.name}</span>
                    <span style={{ fontSize: '0.75rem' }}>({file.sizeFormatted || 'OK'})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
        {/* Componente de sugerencias de tipos de archivos */}
        {showFileTypeSuggestions && fileTypeSuggestions.length > 0 && (
          <div
            style={{
              padding: '0.8rem 1rem',
              background: `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}ee 100%)`,
              backdropFilter: 'blur(8px)',
              borderTop: `1px solid ${themeColors.borderColor}`,
              borderBottom: `1px solid ${themeColors.borderColor}`
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '0.6rem'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                color: themeColors.textSecondary,
                fontSize: '0.85rem'
              }}>
                <i className="pi pi-lightbulb" style={{ color: themeColors.primaryColor }}></i>
                <span>Tipos de archivos que puedo generar:</span>
                <span style={{ 
                  background: themeColors.primaryColor, 
                  color: 'white', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  {Math.round(detectionConfidence * 100)}% confianza
                </span>
              </div>
              
              <button
                onClick={() => setShowDetailedFileTypes(true)}
                style={{
                  background: 'none',
                  border: `1px solid ${themeColors.borderColor}`,
                  color: themeColors.textSecondary,
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = themeColors.hoverBackground;
                  e.target.style.color = themeColors.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = themeColors.textSecondary;
                }}
              >
                <i className="pi pi-eye"></i>
                Ver todos
              </button>
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '0.4rem' 
            }}>
              {fileTypeSuggestions.slice(0, 6).map((suggestion, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.3rem 0.6rem',
                    background: `${suggestion.color}20`,
                    border: `1px solid ${suggestion.color}40`,
                    borderRadius: '16px',
                    fontSize: '0.8rem',
                    color: themeColors.textPrimary,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: suggestion.confidence
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = `${suggestion.color}30`;
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = `${suggestion.color}20`;
                    e.target.style.transform = 'translateY(0)';
                  }}
                  onClick={() => {
                    // Añadir el tipo de archivo al input
                    const fileTypeText = `Genera un archivo ${suggestion.type}${suggestion.extensions[0] || ''}`;
                    setInputValue(prev => prev + (prev ? ' ' : '') + fileTypeText);
                    setShowFileTypeSuggestions(false);
                    inputRef.current?.focus();
                  }}
                >
                  <i className={suggestion.icon} style={{ color: suggestion.color, fontSize: '0.9rem' }}></i>
                  <span style={{ fontWeight: '500' }}>{suggestion.type}</span>
                  <span style={{ 
                    color: themeColors.textSecondary, 
                    fontSize: '0.75rem',
                    opacity: 0.8
                  }}>
                    {suggestion.extensions.slice(0, 2).join(', ')}
                  </span>
                </div>
              ))}
            </div>
            
            {fileTypeSuggestions.length > 6 && (
              <div style={{ 
                marginTop: '0.4rem', 
                fontSize: '0.75rem', 
                color: themeColors.textSecondary,
                textAlign: 'center'
              }}>
                +{fileTypeSuggestions.length - 6} tipos más disponibles
              </div>
            )}
          </div>
        )}

        {showFileUploader ? (
          <div style={{ padding: '0 1rem 0.5rem 1rem' }}>
            <FileUploader
              onFilesAdded={handleFilesAdded}
              onFileRemoved={handleFileRemoved}
              attachedFiles={attachedFiles}
              maxFiles={5}
              disabled={isLoading}
              expandUpload={showFileUploader}
            />
          </div>
        ) : null}

        <div
          style={{
            padding: '0.6rem 1rem',
            background: `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`,
            backdropFilter: 'blur(8px)',
            borderTop: `1px solid ${themeColors.borderColor}`
          }}
        >
          {/* Indicadores de rendimiento */}
          <AIPerformanceStats
            currentModel={currentModel}
            modelType={modelType}
            maxTokens={React.useMemo(() => {
              if (!currentModel) return 7000;
              const config = aiService.getModelPerformanceConfig(currentModel, modelType);
              return config?.maxTokens || 7000;
            }, [currentModel, modelType])}
            contextLimit={React.useMemo(() => {
              if (!currentModel) return 16000;
              const config = aiService.getModelPerformanceConfig(currentModel, modelType);
              return config?.contextLimit || 16000;
            }, [currentModel, modelType])}
            inputValue={inputValue}
            messageCount={messages.length}
            isLoading={isLoading}
            lastResponseTokens={lastResponseTokens}
            attachedFiles={attachedFiles}
          />
          
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              disabled={isLoading || !currentModel}
              className="ai-input"
              id="ai-chat-input"
              style={{
                flex: 1,
                padding: '0.6rem',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid rgba(255,255,255,0.15)`,
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

            {/* Botón para archivos adjuntos */}
            <button
              onClick={toggleFileUploader}
              disabled={isLoading}
              style={{
                background: showFileUploader 
                  ? `linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${themeColors.primaryColor}dd 100%)`
                  : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.6rem',
                color: 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '40px',
                height: '40px',
                opacity: isLoading ? 0.5 : 1
              }}
              title={showFileUploader ? 'Ocultar archivos adjuntos' : 'Adjuntar archivos'}
            >
              <i className={showFileUploader ? 'pi pi-times' : 'pi pi-paperclip'} />
            </button>

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

        {/* Panel detallado de tipos de archivos */}
        {showDetailedFileTypes && (
          <FileTypeDetectionPanel
            detectedFileTypes={detectedFileTypes}
            fileTypeSuggestions={fileTypeSuggestions}
            detectionConfidence={detectionConfidence}
            themeColors={themeColors}
            onClose={() => setShowDetailedFileTypes(false)}
            onSelectFileType={(suggestion) => {
              const fileTypeText = `Genera un archivo ${suggestion.type}${suggestion.extensions[0] || ''}`;
              setInputValue(prev => prev + (prev ? ' ' : '') + fileTypeText);
              setShowDetailedFileTypes(false);
              setShowFileTypeSuggestions(false);
              inputRef.current?.focus();
            }}
          />
        )}
      </div>
    </>
  );
};

export default AIChatPanel;

