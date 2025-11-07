import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import MCPActiveTools from './MCPActiveTools';
import smartFileDetectionService from '../services/SmartFileDetectionService';
import fileAnalysisService from '../services/FileAnalysisService';
import mcpClient from '../services/MCPClientService';
import '../utils/debugConversations'; // 🔧 Debug utility

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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Estados avanzados para Fase 2
  const [currentStatus, setCurrentStatus] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const lastToolResultRef = useRef(null);
  
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
  
  // Estado para MCP tools
  const [mcpToolsEnabled, setMcpToolsEnabled] = useState(true);
  const [activeMcpServers, setActiveMcpServers] = useState([]);
  const [showMcpDialog, setShowMcpDialog] = useState(false);
  const [selectedMcpServers, setSelectedMcpServers] = useState(() => {
    // Cargar MCPs seleccionados del localStorage
    try {
      const saved = localStorage.getItem('selectedMcpServers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [disabledMcpServers, setDisabledMcpServers] = useState(() => {
    // Cargar MCPs desactivados del localStorage
    try {
      const saved = localStorage.getItem('disabledMcpServers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Detectar si un texto parece un tool-call JSON para NO mostrarlo en streaming
  const looksLikeToolJson = useCallback((text) => {
    if (!text || typeof text !== 'string') return false;
    const head = text.slice(0, 1200);
    if (/```\s*(json|tool|tool_call)/i.test(head)) return true;
    if (/\"use_tool\"\s*:\s*\"/i.test(head)) return true;
    if (/\"tool\"\s*:\s*\"/i.test(head)) return true;
    return false;
  }, []);

  // Escuchar actualizaciones de la conversación para sincronizar mensajes en vivo
  useEffect(() => {
    const handleConversationUpdate = (event) => {
      const conv = conversationService.getCurrentConversation();
      if (!conv) return;
      
      // Logging detallado para debugging
      const detail = event?.detail || {};
      console.log(`🔔 [AIChatPanel] conversation-updated recibido:`, {
        conversationId: detail.conversationId,
        messageId: detail.messageId,
        role: detail.role,
        totalMessages: conv.messages?.length || 0
      });
      
      setMessages(prev => {
        // Obtener mensajes persistidos desde localStorage
        const persisted = (conv.messages || []).map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata,
          subtle: msg.subtle,
          contextOptimization: msg.contextOptimization,
          attachedFiles: msg.attachedFiles
        }));
        
        // 🔧 LÓGICA SIMPLIFICADA Y ROBUSTA:
        // localStorage es la fuente de verdad. Siempre sincronizamos desde allí.
        // Solo mantenemos mensajes "streaming" temporales si el usuario está esperando respuesta.
        
        // Verificar si hay NUEVOS mensajes persistidos
        const prevPersistedIds = new Set(prev.filter(m => !m.streaming).map(m => m.id));
        const persistedIds = new Set(persisted.map(m => m.id));
        const newPersistedIds = persisted.filter(m => !prevPersistedIds.has(m.id)).map(m => m.id);
        const hasNewPersistedMessages = newPersistedIds.length > 0;
        
        // Si hay nuevos mensajes persistidos, eliminar TODOS los streaming
        // Si NO hay nuevos mensajes, mantener streaming existentes
        const streaming = hasNewPersistedMessages ? [] : prev.filter(m => m.streaming === true);
        
        // Si NO hay cambios (mismo número de mensajes persistidos y no hay streaming), no hacer nada
        if (!hasNewPersistedMessages && streaming.length === 0 && prev.length === persisted.length) {
          console.log(`   ↩️ Sin cambios, manteniendo estado actual`);
          return prev;
        }
        
        // Merge: Combinar persistidos + streaming
        const merged = [...persisted, ...streaming];
        
        console.log(`   ✅ Sincronizando: ${persisted.length} persistidos + ${streaming.length} streaming = ${merged.length} total`);
        if (hasNewPersistedMessages) {
          console.log(`   🆕 Nuevos mensajes: ${newPersistedIds.length}`);
        }
        
        return merged;
      });
    };

    window.addEventListener('conversation-updated', handleConversationUpdate);
    return () => window.removeEventListener('conversation-updated', handleConversationUpdate);
  }, []);

  const looksLikeJsonStart = useCallback((text) => {
    if (!text || typeof text !== 'string') return false;
    const t = text.trimStart();
    // Solo considerar JSON si empieza con { y contiene "tool" o "use_tool" en los primeros 100 chars
    if (t.startsWith('{')) {
      const head = t.substring(0, 100);
      return head.includes('"tool"') || head.includes('"use_tool"');
    }
    // Bloques de código explícitos
    if (t.startsWith('```json') || t.startsWith('```tool')) return true;
    return false;
  }, []);

  // Configurar marked con resaltado de sintaxis y opciones mejoradas
  useEffect(() => {
    marked.setOptions({
      highlight: function(code, lang) {
        // Ignorar lenguajes especiales de MCP (tool, tool_call) para evitar warnings
        const mcpLangs = ['tool', 'tool_call', 'mcp'];
        if (lang && mcpLangs.includes(lang.toLowerCase())) {
          // Tratarlos como JSON
          try {
            return hljs.highlight(code, { language: 'json' }).value;
          } catch (err) {
            return code;
          }
        }
        
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            // Suprimir error en consola para lenguajes desconocidos
            return code;
          }
        }
        try {
          return hljs.highlightAuto(code).value;
        } catch (err) {
          // Suprimir error en consola
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
    
    // Inicializar MCP client
    mcpClient.initialize().catch(error => {
      console.error('Error inicializando MCP client:', error);
    });

    // Iniciar MCPs marcados como por defecto después de 1 segundo
    // (dar tiempo a que se inicialice MCPClient)
    const initDefaultMcps = setTimeout(() => {
      if (selectedMcpServers.length > 0) {
        console.log('📌 Iniciando MCPs por defecto:', selectedMcpServers);
        selectedMcpServers.forEach(serverId => {
          mcpClient.startServer(serverId).catch(error => {
            console.error(`Error iniciando MCP ${serverId}:`, error);
          });
        });
      }
    }, 1000);

    return () => clearTimeout(initDefaultMcps);
  }, [selectedMcpServers]);

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

  // Escuchar cambios en los servidores MCP activos
  useEffect(() => {
    const updateMcpServers = () => {
      const servers = mcpClient.getActiveServers();
      setActiveMcpServers(servers || []);
    };
    
    updateMcpServers();
    
    // Listener para cambios en MCP
    const unsubscribe = mcpClient.addListener((event) => {
      if (event === 'servers-updated' || event === 'tools-updated') {
        updateMcpServers();
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
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

  // Calcular contextLimit basado en el modelo actual
  const contextLimit = useMemo(() => {
    if (!currentModel) return 16000;
    const config = aiService.getModelPerformanceConfig(currentModel, modelType);
    return config?.contextLimit || 16000;
  }, [currentModel, modelType]);

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
      // Slash command: /prompts → listar prompts MCP
      if (userMessage === '/prompts' || userMessage === '/prompt') {
        const prompts = mcpClient.getAvailablePrompts() || [];
        const byServer = prompts.reduce((acc, p) => { (acc[p.serverId] = acc[p.serverId] || []).push(p); return acc; }, {});
        const lines = Object.keys(byServer).sort().flatMap(sid => {
          const list = byServer[sid].map(p => `  - ${p.name}${p.description ? ` — ${p.description}` : ''}`);
          return [`Servidor: ${sid}`, ...list, ''];
        });
        const content = lines.length > 0 ? lines.join('\n') : 'No hay prompts MCP disponibles.';
        // Persistir mensaje usuario y respuesta como assistant
        conversationService.addMessage('user', userMessage);
        conversationService.addMessage('assistant', content);
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content, timestamp: Date.now() }]);
        setIsLoading(false);
        return;
      }
      // ============= PASO 1: SINCRONIZAR CONVERSACIÓN (PRIMERO) =============
      // Asegurar que el servicio esté sincronizado con la conversación actual ANTES de limpiar historial
      if (currentConversationId && conversationService.currentConversationId !== currentConversationId) {
        console.log(`🔄 [AIChatPanel] Sincronizando conversación: ${currentConversationId}`);
        conversationService.loadConversation(currentConversationId);
      }
      
      // ============= PASO 2: LIMPIAR HISTORIAL (DESPUÉS) =============
      // CRÍTICO: Limpiar historial de AIService DESPUÉS de sincronizar, para evitar usar conversación equivocada
      aiService.clearHistory();
      
      // 🔧 SOLUCIÓN DEFINITIVA ANTI-DUPLICACIÓN:
      // En lugar de agregar el mensaje del usuario manualmente y luego intentar sincronizar,
      // agregamos un placeholder de "streaming" temporalmente y confiamos en que
      // el evento 'conversation-updated' traerá el mensaje real persistido.
      const streamingPlaceholderId = `streaming_user_${Date.now()}`;
      
      setMessages(prev => [...prev, {
        id: streamingPlaceholderId,
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
        streaming: true, // Marcado como streaming para que el listener lo elimine cuando llegue el mensaje real
        attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined
      }]);
      
      // Guardar en conversationService (que disparará el evento 'conversation-updated')
      // El evento sincronizará automáticamente el mensaje real y eliminará el placeholder
      const userMessageObj = conversationService.addMessage('user', userMessage, {
        attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined
      });

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
          // Mantener visible el estado de herramienta unos ms para UX
          try {
            const s = statusData?.status;
            if (!window.__toolStatusRefs) {
              window.__toolStatusRefs = { lastAt: 0, timer: null, minMs: 5000 };
            }
            const refs = window.__toolStatusRefs;
            const MIN_MS = refs.minMs || 5000;
            if (s === 'tool-execution') {
              if (refs.timer) { clearTimeout(refs.timer); refs.timer = null; }
              refs.lastAt = Date.now();
              setCurrentStatus(statusData);
              return;
            }
            if (s === 'tool-error') {
              if (refs.timer) { clearTimeout(refs.timer); refs.timer = null; }
              refs.lastAt = 0;
              setCurrentStatus(statusData);
              return;
            }
            const elapsed = Date.now() - (refs.lastAt || 0);
            if (refs.lastAt && elapsed < MIN_MS) {
              const delay = MIN_MS - elapsed;
              if (refs.timer) clearTimeout(refs.timer);
              refs.timer = setTimeout(() => {
                setCurrentStatus(statusData);
                refs.timer = null;
                refs.lastAt = 0;
              }, delay);
              return;
            }
            setCurrentStatus(statusData);
          } catch {
            setCurrentStatus(statusData);
          }
        },
        onStream: (streamData) => {
          // Si el contenido del stream parece un tool-call JSON, NO mostrarlo PERO mantener placeholder
          if (looksLikeToolJson(streamData.fullResponse) || looksLikeJsonStart(streamData.fullResponse)) {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId ? { ...msg, content: '⚙️ Ejecutando herramienta...', streaming: true } : msg
            ));
          } else {
            // Actualizar mensaje con contenido streaming normal
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId ? {
                ...msg,
                content: streamData.fullResponse,
                streaming: true
              } : msg
            ));
          }
          // Respetar ventana mínima del estado de herramienta
          try {
            const refs = window.__toolStatusRefs || { lastAt: 0, minMs: 5000 };
            const MIN_MS = refs.minMs || 5000;
            const elapsed = Date.now() - (refs.lastAt || 0);
            const next = { status: 'streaming', message: 'Recibiendo respuesta...', model: streamData.model, provider: streamData.provider };
            if (refs.lastAt && elapsed < MIN_MS) {
              const delay = MIN_MS - elapsed;
              if (refs.timer) clearTimeout(refs.timer);
              refs.timer = setTimeout(() => {
                setCurrentStatus(next);
                refs.timer = null;
                refs.lastAt = 0;
              }, delay);
            } else {
              setCurrentStatus(next);
              refs.lastAt = 0;
            }
          } catch {
            setCurrentStatus({ status: 'streaming', message: 'Recibiendo respuesta...', model: streamData.model, provider: streamData.provider });
          }
        },
        onToolResult: (toolData) => {
          console.log('🔧 [AIChatPanel.onToolResult] Ejecutado:', {
            toolName: toolData.toolName,
            hasArgs: !!toolData.args,
            hasResult: !!toolData.result
          });
          // Mostrar estado "resultado recibido" con icono de herramienta
          try {
            if (!window.__toolStatusRefs) {
              window.__toolStatusRefs = { lastAt: 0, timer: null, minMs: 3000 };
            }
            const refs = window.__toolStatusRefs;
            refs.lastAt = Date.now();
            setCurrentStatus({ status: 'tool-executed', message: 'Resultado recibido', toolName: toolData.toolName, toolArgs: toolData.args });
          } catch {}
          
          // Extraer texto legible del resultado (evitar mostrar JSON crudo)
          let resultText = '';
          const res = toolData.result;
          if (res && typeof res === 'object' && Array.isArray(res.content)) {
            const textItems = res.content
              .filter(it => typeof it?.text === 'string' && it.text.trim().length > 0)
              .map(it => it.text.trim());
            resultText = textItems.join('\n');
          } else if (typeof res === 'string') {
            resultText = res;
          } else {
            try { resultText = JSON.stringify(res, null, 2); } catch { resultText = String(res ?? ''); }
          }

          console.log(`   resultText length: ${resultText.length} chars`);

          // Guardar último resultado para posibles fallbacks del mensaje final
          lastToolResultRef.current = { 
            toolName: toolData.toolName, 
            text: resultText,
            timestamp: Date.now() // 🔧 Agregar timestamp para verificar si es reciente
          };

          // Mensaje minimalista y bonito (sin rutas)
          const lower = resultText.toLowerCase();
          let pretty = 'Acción completada';
          if (toolData.toolName === 'write_file') {
            pretty = lower.includes('successfully') || lower.includes('wrote') ? 'Archivo creado' : 'Escritura completada';
          } else if (toolData.toolName === 'edit_file') {
            pretty = 'Archivo editado';
          } else if (toolData.toolName === 'create_directory') {
            pretty = 'Directorio creado';
          } else if (toolData.toolName === 'move_file') {
            pretty = 'Archivo movido';
          } else if (toolData.toolName === 'list_directory' || toolData.toolName === 'list_directory_with_sizes') {
            pretty = 'Directorio listado';
          } else if (toolData.toolName === 'directory_tree') {
            pretty = 'Árbol generado';
          }
          const content = `🔧 ${toolData.toolName} · ${pretty}`;
          
          // Si usamos mensajes estructurados, el orquestador ya persistirá y emitirá 'conversation-updated'
          if (aiService.featureFlags?.structuredToolMessages) {
            console.log(`   📋 Mensajes estructurados activos, esperando que el orquestador guarde con metadatos correctos...`);
            return;
          }
          
          // Flujo legacy: persistir un mensaje de sistema minimalista y reflejar en UI
          console.log(`   Guardando en conversationService: "${content}"`);
          
          // ✅ IMPROVED: Guardar metadatos adicionales (lenguaje detectado, ruta)
          const metadata = {
            toolName: toolData.toolName,
            toolArgs: toolData.args,
            isToolResult: true,
            toolResultText: resultText,
            detectedLanguage: toolData.detectedLanguage || '',
            filePath: toolData.filePath || ''
          };
          
          const toolMessageObj = conversationService.addMessage('system', content, metadata);
          
          console.log(`   ✅ Guardado en localStorage con ID: ${toolMessageObj.id}`);
          
          setMessages(prev => {
            const idx = prev.findIndex(m => m.id === assistantMessageId);
            const arr = [...prev];
            arr.splice(idx >= 0 ? idx : arr.length, 0, {
              id: toolMessageObj.id,
              role: 'system',
              content,
              timestamp: toolMessageObj.timestamp,
              metadata,
              subtle: true
            });
            return arr;
          });
        },
        onComplete: (data) => {
          console.log('📤 [AIChatPanel.onComplete] Respuesta recibida:', {
            hasResponse: !!data.response,
            responseLength: data.response ? data.response.length : 0,
            responsePreview: data.response ? data.response.substring(0, 100) : '(vacío)'
          });
          
          const files = aiService.detectFilesInResponse(data.response, userMessage);
          
          // ============= CALCULAR SAFE RESPONSE PRIMERO (antes de guardar) =============
          // Si la respuesta está vacía, usar un fallback basado en el último resultado de tool
          
          const extractPlainResponse = (txt) => {
            if (!txt || typeof txt !== 'string') return txt;
            let raw = txt.trim();
            // strip code fences ```json ... ```
            if (/^```/.test(raw)) {
              raw = raw.replace(/^```(?:json|tool|tool_call)?/i, '').replace(/```$/i, '').trim();
            }
            try {
              const obj = JSON.parse(raw);
              if (typeof obj?.response === 'string') return obj.response;
              if (typeof obj?.message === 'string') return obj.message;
              return txt;
            } catch { return txt; }
          };

          let normalizedResp = extractPlainResponse(data.response);
          // Heurística: si el modelo solo explica que "ya se listó" o repite el resultado, colapsar
          const isMetaResponse = (() => {
            const t = (normalizedResp || '').toLowerCase();
            if (!t) return true;
            const patterns = [
              'ya ha sido mostrada', 'ya ha sido listado', 'ya se listó', 'ya se mostro', 'como se mostró', 'como se mostro',
              'mostrada anteriormente', 'listado previamente', 'como arriba', 'as shown'
            ];
            return patterns.some(p => t.includes(p));
          })();

          // 🔧 LÓGICA MEJORADA: Solo usar "Hecho." si REALMENTE se ejecutó una herramienta
          let safeResponse = (normalizedResp && normalizedResp.trim().length > 0 && !isMetaResponse)
            ? normalizedResp
            : (() => {
                // Verificar si hay un resultado de tool RECIENTE (menos de 10 segundos)
                const last = lastToolResultRef.current;
                const hasRecentToolResult = last && 
                  typeof last.text === 'string' && 
                  last.text.length > 0 &&
                  last.timestamp && 
                  (Date.now() - last.timestamp) < 10000; // 10 segundos
                
                if (hasRecentToolResult) {
                  // Solo si hay un resultado de tool reciente, usar "Hecho."
                  if (aiService.featureFlags?.structuredToolMessages) {
                    return 'Hecho.';
                  }
                  // Intentar sintetizar una frase breve
                  const pathMatch = last.text.match(/wrote to\s+(.+)$/i);
                  const path = pathMatch ? pathMatch[1] : '';
                  return path ? `Hecho. Archivo creado en ${path}.` : `Hecho. ${last.text}`;
                }
                
                // Si NO hay resultado de tool reciente, retornar la respuesta original
                // (aunque esté vacía) para no ocultar el problema
                return normalizedResp || '(El modelo no generó una respuesta)';
              })();

          // 🔧 Detectar y ocultar respuestas que son SOLO metadata o tool calls del sistema
          // Ejemplo: {"tool": null, ...} o {"tool": "write_file", "arguments": {...}}
          const isSystemMetadata = (txt) => {
            if (!txt || typeof txt !== 'string') return false;
            const trimmed = txt.trim();
            // Debe ser JSON puro
            if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;
            try {
              const parsed = JSON.parse(trimmed);
              // Es metadata si tiene el campo "tool" (independientemente de su valor)
              if ('tool' in parsed) {
                // CUALQUIER JSON con "tool" + "arguments" es metadata del sistema
                if ('arguments' in parsed) return true;
                // Si solo tiene "tool", también es metadata
                const keys = Object.keys(parsed);
                if (keys.length <= 2 && keys.includes('tool')) return true;
                // Si tiene "message" pero es genérico, también es metadata
                if (parsed.message && /^(hecho|done|complete|ok|ready)/i.test(parsed.message)) return true;
              }
            } catch {
              return false;
            }
            return false;
          };

          if (isSystemMetadata(safeResponse)) {
            console.log(`   ⚠️ Respuesta es metadata del sistema, usando "Hecho."`);
            safeResponse = 'Hecho.';
          }
          
          console.log(`   Safe response: "${safeResponse.substring(0, 80)}"`);
          
          // ============= GUARDAR CON SAFE RESPONSE (no con el original vacío) =============
          // Agregar respuesta del asistente a la conversación (usando safeResponse)
          console.log(`💾 [AIChatPanel.onComplete] Guardando mensaje del asistente en localStorage...`);
          console.log(`   Content length: ${safeResponse.length} chars`);
          console.log(`   ConversationId: ${conversationService.currentConversationId}`);
          
          const assistantMessageObj = conversationService.addMessage('assistant', safeResponse, {
            latency: data.latency,
            model: data.model,
            provider: data.provider,
            tokens: Math.ceil(safeResponse.length / 4),
            files: files.length > 0 ? files : undefined
          });
          
          console.log(`   ✅ Guardado en localStorage con ID: ${assistantMessageObj.id}`);
          console.log(`   ⏰ El evento 'conversation-updated' sincronizará la UI automáticamente...`);
          
          // Calcular tokens reales de la respuesta
          const responseTokens = Math.ceil(safeResponse.length / 4);

          // 🔧 ELIMINADO EL FALLBACK MANUAL: El evento 'conversation-updated' automático
          // de conversationService.addMessage() ya sincroniza los mensajes correctamente.
          // Mantener el fallback causaba duplicación de mensajes en la UI.
          
          // El mensaje streaming se reemplazará automáticamente cuando el evento
          // 'conversation-updated' se dispare y sincronice los mensajes persistidos.
          
          // Tokens calculados internamente por el sistema de ventana deslizante
          
          // 🪟 NOTIFICACIÓN SUTIL de optimización de contexto (como ChatGPT)
          if (aiService.lastContextOptimization && 
              aiService.lastContextOptimization.messagesArchived > 5 && // Solo si se archivaron muchos mensajes
              Date.now() - aiService.lastContextOptimization.timestamp < 5000) { // Y fue reciente
            
            const optimization = aiService.lastContextOptimization;
            setMessages(prev => [...prev, {
              id: Date.now() + 1,
              role: 'system',
              content: `💭 *Usando conversación reciente para mantener el contexto* • ${optimization.messagesArchived} mensajes anteriores archivados`,
              timestamp: Date.now() + 1,
              contextOptimization: true,
              subtle: true
            }]);
            
            // Limpiar la notificación para no mostrarla múltiples veces
            aiService.lastContextOptimization = null;
          }
          
          try {
            const refs = window.__toolStatusRefs || { lastAt: 0, minMs: 3000 };
            const MIN_MS = refs.minMs || 3000;
            const elapsed = Date.now() - (refs.lastAt || 0);
              const applyComplete = () => setCurrentStatus({ status: 'complete', message: `Completado en ${data.latency}ms`, latency: data.latency });
            if (refs.lastAt && elapsed < MIN_MS) {
              const delay = MIN_MS - elapsed;
              if (refs.timer) clearTimeout(refs.timer);
              refs.timer = setTimeout(() => {
                applyComplete();
                refs.timer = null;
                refs.lastAt = 0;
              }, delay);
            } else {
                applyComplete();
                refs.lastAt = 0;
            }
          } catch {
            setCurrentStatus({ status: 'complete', message: `Completado en ${data.latency}ms`, latency: data.latency });
          }

          // Aviso sutil de uso de contexto efímero con archivos
          if (data.ephemeralContextUsed && Array.isArray(data.ephemeralFilesUsed) && data.ephemeralFilesUsed.length > 0) {
            const shown = data.ephemeralFilesUsed.slice(0, 3);
            const extra = data.ephemeralFilesUsed.length - shown.length;
            const note = `💭 *Usé tus archivos* • ${shown.join(', ')}${extra > 0 ? ` y ${extra} más` : ''}`;
            setMessages(prev => [...prev, {
              id: Date.now() + 2,
              role: 'system',
              content: note,
              timestamp: Date.now() + 2,
              contextOptimization: true,
              subtle: true
            }]);
          }
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

      // Enviar solo el prompt del usuario; el contexto de archivos se inyecta
      // de forma efímera en el servicio de IA (RAG ligero)
      await aiService.sendMessageWithCallbacks(userMessage, callbacks, {
        signal: controller.signal,
        mcpEnabled: mcpToolsEnabled // Pasar estado de MCP
      });

    } catch (error) {
      // Si es error de cancelación, no mostrar como error
      if (error.name === 'AbortError') {
        console.log('💡 Generación cancelada por el usuario');
        setCurrentStatus({
          status: 'cancelled',
          message: 'Generación cancelada'
        });
        return; // No mostrar mensaje de error para cancelaciones
      }
      
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
    // Si la conversación actual está vacía, no hacer nada para evitar duplicados
    const currentConv = conversationService.getCurrentConversation();
    const serviceHasMessages = !!(currentConv && Array.isArray(currentConv.messages) && currentConv.messages.length > 0);
    const serviceHasFiles = !!(currentConv && Array.isArray(currentConv.attachedFiles) && currentConv.attachedFiles.length > 0);
    const uiHasMessages = messages.length > 0;
    const inputHasText = !!inputValue.trim();

    if (!serviceHasMessages && !serviceHasFiles && !uiHasMessages && !inputHasText) {
      console.log('🛑 [AIChatPanel] Limpiar chat ignorado: la conversación está vacía');
      return;
    }

    setMessages([]);
    aiService.clearHistory();

    // Crear nueva conversación para preservar la anterior con contenido
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
    // Si la conversación actual está vacía (sin mensajes, sin adjuntos y sin texto),
    // no crear otra conversación nueva para evitar duplicados en el historial.
    const currentConv = conversationService.getCurrentConversation();
    const serviceHasMessages = !!(currentConv && Array.isArray(currentConv.messages) && currentConv.messages.length > 0);
    const serviceHasFiles = !!(currentConv && Array.isArray(currentConv.attachedFiles) && currentConv.attachedFiles.length > 0);
    const uiHasMessages = messages.length > 0;
    const inputHasText = !!inputValue.trim();

    // Si hay desincronización (UI tiene mensajes pero servicio no), limpiar UI
    if (uiHasMessages && !serviceHasMessages) {
      console.log('🔧 [AIChatPanel] Limpiando UI desincronizada');
      setMessages([]);
      setAttachedFiles([]);
    }

    if (!serviceHasMessages && !serviceHasFiles && !uiHasMessages && !inputHasText) {
      console.log('🛑 [AIChatPanel] Nueva conversación ignorada: la actual está vacía');
      return;
    }

    // ============= RESET COMPLETO DEL ESTADO =============
    setMessages([]);
    setAttachedFiles([]);
    setInputValue('');
    setIsLoading(false);
    setCurrentStatus(null);                       // 🔧 Limpiar estado actual
    
    // Limpiar AIService
    aiService.clearHistory();                     // 🔧 Limpiar historial
    
    // Limpiar refs
    lastToolResultRef.current = null;             // 🔧 Limpiar tool result
    
    // Limpiar detección de archivos
    setDetectedFileTypes([]);
    setFileTypeSuggestions([]);
    setDetectionConfidence(0);
    setShowFileTypeSuggestions(false);

    // Crear nueva conversación completamente limpia
    const newConversation = conversationService.createConversation(
      null,
      currentModel,
      modelType
    );

    // Guardar MCPs seleccionados en la conversación
    if (selectedMcpServers.length > 0) {
      newConversation.selectedMcpServers = selectedMcpServers;
      console.log('📌 MCPs seleccionados guardados en conversación:', selectedMcpServers);
    }

    // Actualizar estado con la nueva conversación
    setCurrentConversationId(newConversation.id);
    setConversationTitle(newConversation.title);

    // Asegurar que los mensajes estén vacíos (doble verificación)
    setMessages([]);

    // 🔔 Disparar evento para actualizar el historial y sincronizar todos los listeners
    window.dispatchEvent(new CustomEvent('conversation-updated', {
      detail: { conversationId: newConversation.id, source: 'new' }
    }));
  };

  const handleLoadConversation = (conversationId) => {
    // ============= LIMPIEZA COMPLETA - Fase 1: UI States =============
    setMessages([]);
    setAttachedFiles([]);
    setInputValue('');                           // 🔧 Limpiar input anterior
    setIsLoading(false);
    setCurrentStatus(null);
    
    // ============= LIMPIEZA COMPLETA - Fase 2: AIService State =============
    aiService.clearHistory();                    // 🔧 Limpiar historial del AIService
    
    // ============= LIMPIEZA COMPLETA - Fase 3: Refs =============
    lastToolResultRef.current = null;            // 🔧 Limpiar tool result ref
    
    // ============= LIMPIEZA COMPLETA - Fase 4: File Detection States =============
    setDetectedFileTypes([]);                    // 🔧 Limpiar tipos de archivo detectados
    setFileTypeSuggestions([]);                  // 🔧 Limpiar sugerencias
    setDetectionConfidence(0);                   // 🔧 Limpiar confianza
    setShowFileTypeSuggestions(false);           // 🔧 Ocultar sugerencias
    
    // ============= CARGAR CONVERSACIÓN LIMPIA =============
    const conversation = conversationService.loadConversation(conversationId);
    if (conversation) {
      setCurrentConversationId(conversation.id);
      setConversationTitle(conversation.title);
      
      // Restaurar el modelo de la conversación si existe
      if (conversation.modelId) {
        aiService.setCurrentModel(conversation.modelId, conversation.modelType);
        setCurrentModel(conversation.modelId);
        setModelType(conversation.modelType);
      }
      
      // Cargar mensajes preservando toda la estructura incluyendo metadatos
      setMessages(conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata,
        subtle: msg.subtle,
        contextOptimization: msg.contextOptimization,
        attachedFiles: msg.attachedFiles
      })));
      
      // Cargar archivos adjuntos de la conversación
      const attachedFiles = conversationService.getAttachedFilesForConversation(conversationId);
      setAttachedFiles(attachedFiles || []);
      
      // Log detallado de los mensajes cargados
      const msgSummary = conversation.messages.map(m => ({
        role: m.role,
        hasContent: !!m.content && m.content.trim().length > 0,
        isToolResult: !!(m.metadata && m.metadata.isToolResult),
        contentLength: m.content ? m.content.length : 0
      }));
      console.log(`✅ [AIChatPanel] Conversación cargada: ${conversation.id}`);
      console.log(`   Mensajes: ${conversation.messages.length}`);
      console.log(`   Resumen:`, msgSummary);
      
      // 🔔 Disparar evento para notificar la carga y sincronizar todos los listeners
      window.dispatchEvent(new CustomEvent('conversation-updated', {
        detail: { conversationId: conversation.id, source: 'load' }
      }));
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
    
    // Actualizar el modelo en la conversación actual
    const currentConversation = conversationService.getCurrentConversation();
    if (currentConversation) {
      currentConversation.modelId = modelId;
      currentConversation.modelType = modelType;
      currentConversation.updatedAt = Date.now();
      conversationService.saveConversations();
      
      // Disparar evento para actualizar el historial
      window.dispatchEvent(new CustomEvent('conversation-updated', {
        detail: {
          conversationId: currentConversation.id,
          type: 'model-changed'
        }
      }));
    }
  };

  // Manejar selección de MCPs
  const handleToggleMcpSelection = (serverId) => {
    setSelectedMcpServers(prev => {
      let updated;
      if (prev.includes(serverId)) {
        updated = prev.filter(id => id !== serverId);
      } else {
        updated = [...prev, serverId];
      }
      // Guardar en localStorage
      localStorage.setItem('selectedMcpServers', JSON.stringify(updated));
      console.log('📌 MCPs seleccionados guardados:', updated);
      return updated;
    });
  };

  // Seleccionar/Deseleccionar todos
  const handleToggleAllMcps = () => {
    if (selectedMcpServers.length === activeMcpServers.length) {
      // Si todos están seleccionados, deseleccionar todos
      setSelectedMcpServers([]);
      localStorage.setItem('selectedMcpServers', JSON.stringify([]));
    } else {
      // Si no todos están seleccionados, seleccionar todos
      const allIds = activeMcpServers.map(s => s.id);
      setSelectedMcpServers(allIds);
      localStorage.setItem('selectedMcpServers', JSON.stringify(allIds));
      console.log('📌 Todos los MCPs seleccionados:', allIds);
    }
  };

  // Toggle activar/desactivar MCP
  const handleToggleMcpActive = (serverId) => {
    setDisabledMcpServers(prev => {
      let updated;
      if (prev.includes(serverId)) {
        updated = prev.filter(id => id !== serverId);
      } else {
        updated = [...prev, serverId];
      }
      // Guardar en localStorage
      localStorage.setItem('disabledMcpServers', JSON.stringify(updated));
      console.log('🔌 MCPs desactivados guardados:', updated);
      return updated;
    });
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
      let processedContent = content;
      
      // Agregar iconos visuales a [FILE] y [DIR]
      processedContent = processedContent.replace(/\[FILE\]\s+([^\n]+)/g, (match, filename) => {
        return `📄 **${filename}**`;
      });
      processedContent = processedContent.replace(/\[DIR\]\s+([^\n]+)/g, (match, dirname) => {
        return `📁 **${dirname}**`;
      });
      
      // Paso 1: Reparar títulos sin espacio después de #
      processedContent = processedContent.replace(/^(#{1,6})([^\s#])/gm, (match, hashes, char) => {
        return `${hashes} ${char}`;
      });
      
      // Paso 2: Convertir líneas en MAYÚSCULAS que parecen títulos
      processedContent = processedContent.replace(/^([A-Z][A-Z\s\d:]{4,})$/gm, (match, text) => {
        const cleanText = text.trim();
        if (cleanText.startsWith('#') || cleanText.length < 4) return match;
        
        if (cleanText.match(/^(EJEMPLO|SLIDE|DIAPOSITIVA|PASO|USO|CARACTERÍSTICAS|FEATURES|VENTAJAS|BENEFITS|REQUISITOS|REQUIREMENTS|INSTALACIÓN|INSTALLATION|CÓMO|HOW|SOLUCIÓN|SOLUTION|POR QUÉ|WHY|RESUMEN|SUMMARY)/i)) {
          return `## ${cleanText}`;
        }
        return match;
      });
      
      // Configurar marked
      marked.setOptions({
        breaks: true,
        gfm: true,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: true,
        highlight: function(code, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
              return code;
            }
          }
          try {
            return hljs.highlightAuto(code).value;
          } catch (err) {
            return code;
          }
        }
      });
      
      // Procesar markdown CON marked
      let html = marked(processedContent);
      
      // Paso 3: Agregar emojis a los H2 después del renderizado
      html = html.replace(/<h2>([^<]+)<\/h2>/g, (match, text) => {
        const cleanText = text.trim();
        
        // Si ya tiene emoji, no agregar
        const firstChar = cleanText.charCodeAt(0);
        if (firstChar > 127) {
          return match;
        }
        
        let icon = '📌';
        if (cleanText.toLowerCase().includes('ejemplo')) {
          icon = '✅';
        } else if (cleanText.toLowerCase().includes('características') || cleanText.toLowerCase().includes('features')) {
          icon = '⭐';
        } else if (cleanText.toLowerCase().includes('ventajas') || cleanText.toLowerCase().includes('benefits')) {
          icon = '✨';
        } else if (cleanText.toLowerCase().includes('requisitos') || cleanText.toLowerCase().includes('requirements')) {
          icon = '📋';
        } else if (cleanText.toLowerCase().includes('instalación') || cleanText.toLowerCase().includes('installation')) {
          icon = '🔧';
        } else if (cleanText.toLowerCase().includes('cómo') || cleanText.toLowerCase().includes('how')) {
          icon = '❓';
        } else if (cleanText.toLowerCase().includes('uso')) {
          icon = '💡';
        } else if (cleanText.toLowerCase().includes('solución') || cleanText.toLowerCase().includes('solution')) {
          icon = '🎯';
        } else if (cleanText.toLowerCase().includes('por qué') || cleanText.toLowerCase().includes('why')) {
          icon = '🤔';
        } else if (cleanText.toLowerCase().includes('nota') || cleanText.toLowerCase().includes('importante')) {
          icon = '⚠️';
        } else if (cleanText.toLowerCase().includes('resultado') || cleanText.toLowerCase().includes('resultado')) {
          icon = '📊';
        }
        
        return `<h2>${icon} ${cleanText}</h2>`;
      });
      
      // Procesar bloques de código
      const processedHtml = processCodeBlocksAfterRender(html);
      
      // Sanitizar
      const cleanHtml = DOMPurify.sanitize(processedHtml, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'span', 'div', 'button', 'i'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'onclick', 'data-language', 'data-code-id', 'data-code'],
        ALLOW_DATA_ATTR: true,
        ALLOW_UNKNOWN_PROTOCOLS: false,
        SANITIZE_DOM: false
      });
      
      return cleanHtml;
    } catch (error) {
      console.error('❌ Error rendering markdown:', error);
      // Escapar el contenido si hay error
      const div = document.createElement('div');
      div.textContent = content;
      return div.innerHTML;
    }
  };

  // Función para pre-procesar el markdown y mejorar el formato
  const preprocessMarkdown = (content) => {
    if (!content) return '';
    
    let processed = content;
    
    // ========================================
    // PASO 1: DETECTAR Y CORREGIR TÍTULOS MALFORMADOS
    // ========================================
    
    // Detectar títulos que NO tienen el símbolo # pero deberían
    // Patrón: Líneas en mayúsculas que parecen títulos
    processed = processed.replace(/^([A-Z][A-Z\s\d:]{5,}?)$/gm, (match, text) => {
      const cleanText = text.trim();
      
      // NO convertir si ya empieza con # o contiene ciertos patrones
      if (cleanText.startsWith('#') || cleanText.length < 5) {
        return match;
      }
      
      // Detectar si parece un título de ejemplo o sección
      if (cleanText.match(/^(EJEMPLO|EJEMPLO|SLIDE|DIAPOSITIVA|PASO|SECCI[ÓO]N|CAP[ÍI]TULO|USO|CARACTERÍSTICAS|FEATURES|VENTAJAS|BENEFITS|REQUISITOS|REQUIREMENTS|INSTALACIÓN|INSTALLATION|CÓMO|HOW|SOLUCIÓN|SOLUTION|POR QUÉ|WHY)/i)) {
        return `## ${cleanText}`;
      }
      
      return match;
    });
    
    // PASO 2: Reparar encabezados que TIENEN # pero sin espacio
    // Patrón: #TITULO → # TITULO
    processed = processed.replace(/^(#{1,6})([^\s#])/gm, (match, hashes, char) => {
      return `${hashes} ${char}`;
    });
    
    // PASO 3: Mejorar encabezados de nivel 1 con separadores
    processed = processed.replace(/^#{1}\s*(.+)$/gm, (match, text) => {
      const cleanText = text.trim();
      return `---\n# ${cleanText}\n---`;
    });
    
    // NO agregar emojis aquí - se agregan en renderMarkdown() después del renderizado HTML
    
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
    const isToolResult = !!(message.metadata && message.metadata.isToolResult);
    const isToolCall = message.role === 'assistant_tool_call' || !!(message.metadata && message.metadata.isToolCall);

    // No renderizar el placeholder si está en streaming y aún no hay contenido
    if (isStreaming && !hasContent) {
      return null;
    }

    // Render especial para tool-call (card compacta)
    if (isToolCall) {
      const toolName = message.metadata?.toolName || (message.content || '').replace(/Llamando herramienta:\s*/i, '').trim();
      return (
        <div key={message.id || `msg-${index}-${message.timestamp}`} style={{ marginBottom: '0.6rem', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="pi pi-wrench" style={{ color: '#ff9800', fontSize: '0.9rem' }} />
            <strong style={{ color: '#fff' }}>{toolName || 'herramienta'}</strong>
          </div>
        </div>
      );
    }

    // Render especial para resultado de tool (success card)
    if (isToolResult || message.role === 'tool') {
      // ✅ CRITICAL FIX: Usar toolResultText de metadatos, NO content (que es solo un resumen)
      const text = (message.metadata?.toolResultText || message.content || '').trim();
      const isDirToken = /\[(FILE|DIR)\]/.test(text);
      const isCodeBlock = text.includes('```') || message.metadata?.detectedLanguage;
      const isBlock = isDirToken || text.includes('\n');
      const isSuccess = /success|completad|hecho|ok/i.test(text) || (message.metadata?.error !== true);
      const border = isSuccess ? 'rgba(76, 175, 80, 0.35)' : 'rgba(244, 67, 54, 0.35)';
      const bg = isSuccess ? 'rgba(76, 175, 80, 0.10)' : 'rgba(244, 67, 54, 0.10)';
      const icon = isSuccess ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle';
      const iconColor = isSuccess ? '#4caf50' : '#f44336';
      
      // 🔧 DEBUG: Para list_directory_with_sizes
      if (message.metadata?.toolName === 'list_directory_with_sizes') {
        console.log(`📊 [renderMessage] list_directory_with_sizes:`, {
          toolName: message.metadata?.toolName,
          textLength: text.length,
          primeras200: text.substring(0, 200),
          tieneKB: text.includes('KB'),
          tieneMB: text.includes('MB'),
          tieneBytes: text.includes('bytes')
        });
      }
      
      // 🔧 DEBUG: Detectar si falta metadata
      if (!message.metadata?.toolResultText && text.includes('Successfully')) {
        console.warn(`⚠️ [renderMessage] Mensaje de tool sin toolResultText:`, {
          toolName: message.metadata?.toolName,
          hasToolResultText: !!message.metadata?.toolResultText,
          contentLength: (message.content || '').length,
          messageId: message.id
        });
      }
      
      // ✅ IMPROVED: Formatear contenido con backticks si no los tiene
      let displayText = text;
      
      // Si es read_text_file con lenguaje detectado, envolver con lenguaje
      if (message.metadata?.toolName === 'read_text_file' && message.metadata?.detectedLanguage && !text.includes('```')) {
        const lang = message.metadata.detectedLanguage;
        displayText = `\`\`\`${lang}\n${text}\n\`\`\``;
      }
      // Si es list_directory y NO tiene backticks, envolver
      else if ((message.metadata?.toolName === 'list_directory' || message.metadata?.toolName === 'list_directory_with_sizes' || message.metadata?.toolName === 'directory_tree') && !text.includes('```')) {
        displayText = `\`\`\`\n${text}\n\`\`\``;
      }
      // Si tiene [FILE] o [DIR] pero no backticks, envolver
      else if ((text.includes('[FILE]') || text.includes('[DIR]')) && !text.includes('```')) {
        displayText = `\`\`\`\n${text}\n\`\`\``;
      }
      
      return (
        <div key={message.id || `msg-${index}-${message.timestamp}`} style={{ marginBottom: '0.8rem', width: '100%' }}>
          <div className={`ai-bubble assistant subtle`} style={{
            width: '100%',
            background: bg,
            border: `1px solid ${border}`,
            color: themeColors.textPrimary,
            borderRadius: '8px',
            padding: '0.6rem 0.8rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <i className={icon} style={{ color: iconColor, fontSize: '1rem' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <strong style={{ color: '#fff' }}>{message.metadata?.toolName || (isSuccess ? 'Acción completada' : 'Acción ejecutada')}</strong>
                {message.metadata?.filePath && (
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                    <i className="pi pi-file" style={{ fontSize: '0.75rem', marginRight: '4px' }} />
                    <code style={{ fontSize: '0.75rem' }}>{message.metadata.filePath}</code>
                  </span>
                )}
                {message.metadata?.toolArgs?.path && !message.metadata?.filePath && (
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                    <i className="pi pi-folder" style={{ fontSize: '0.75rem', marginRight: '4px' }} />
                    <code style={{ fontSize: '0.75rem' }}>{message.metadata.toolArgs.path}</code>
                  </span>
                )}
              </div>
            </div>
            {isDirToken ? (
              // ✅ IMPROVED: Listado de directorios formateado bonito (con o sin tamaños)
              (() => {
                // Parsear líneas y separarlas en directorios y archivos
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                const items = lines.map(line => {
                  // Regex: captura [FILE/DIR] y todo lo demás
                  const typeMatch = line.match(/^\[(FILE|DIR)\]\s+(.+)$/i);
                  if (!typeMatch) return null;
                  
                  const type = typeMatch[1].toUpperCase();
                  let content = typeMatch[2];
                  
                  // ✅ IMPROVED: Extraer el tamaño del FINAL del contenido
                  // El tamaño está siempre al final: "123 KB", "0 B", "1.5 MB", etc.
                  const sizeRegex = /\s+([\d.]+\s*[KMGT]?i?B)\s*$/i;
                  const sizeMatch = content.match(sizeRegex);
                  
                  let name = content;
                  let size = null;
                  
                  if (sizeMatch) {
                    // Tamaño encontrado al final
                    size = sizeMatch[1].trim();
                    // Nombre es todo excepto el tamaño al final
                    name = content.substring(0, sizeMatch.index).trim();
                  }
                  
                  return { type, name, size };
                }).filter(Boolean);

                // Separar directorios de archivos
                const dirs = items.filter(i => i.type === 'DIR').sort((a, b) => a.name.localeCompare(b.name));
                const files = items.filter(i => i.type === 'FILE').sort((a, b) => a.name.localeCompare(b.name));

                return (
                  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.5' }}>
                    {dirs.length > 0 && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        {dirs.map((item, i) => (
                          <div key={`dir-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9bd3ff' }}>
                            <span>📁</span>
                            <span>{item.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {files.length > 0 && (
                      <div>
                        {files.map((item, i) => (
                          <div key={`file-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e0e0e0' }}>
                            <span>📄</span>
                            <span style={{ flex: 1 }}>{item.name}</span>
                            {item.size && <span style={{ marginLeft: 'auto', textAlign: 'right', color: '#a0a0a0', fontSize: '0.8rem' }}>{item.size}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              // ✅ IMPROVED: Renderizar con soporte para bloques de código (sin truncar)
              <div 
                className="ai-md"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(displayText) }}
                style={{ 
                  opacity: isBlock ? 0.95 : 0.9,
                  maxHeight: isCodeBlock ? 'none' : (isBlock ? '300px' : 'auto'),
                  overflow: isCodeBlock ? 'visible' : (isBlock ? 'auto' : 'visible'),
                  width: '100%'
                }}
              />
            )}
          </div>
        </div>
      );
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
          className={`ai-bubble ${isUser ? 'user' : isSystem ? 'system' : 'assistant'} ${isStreaming ? 'streaming' : ''} ${message.subtle ? 'subtle' : ''}`}
          style={{
            width: isUser ? 'auto' : '100%',
            background: isToolResult
              ? 'transparent'
              : message.subtle 
                ? 'rgba(255, 255, 255, 0.02)'
                : isSystem
                  ? 'rgba(255, 107, 53, 0.1)'
                  : isUser
                    ? `linear-gradient(135deg, ${themeColors.primaryColor}dd 0%, ${themeColors.primaryColor}cc 100%)`
                    : `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`,
            color: message.subtle 
              ? 'rgba(255, 255, 255, 0.6)'
              : themeColors.textPrimary,
            border: isToolResult
              ? 'none'
              : message.subtle 
                ? '1px solid rgba(255, 255, 255, 0.05)'
                : `1px solid ${isSystem ? 'rgba(255, 107, 53, 0.3)' : themeColors.borderColor}`,
            borderRadius: message.subtle ? '6px' : '8px',
            padding: isToolResult ? '0 0 0.2rem 0' : (message.subtle ? '0.3rem 0.5rem' : '0.6rem 0.8rem'),
            fontSize: message.subtle ? '0.8rem' : undefined,
            fontStyle: isToolResult ? 'normal' : (message.subtle ? 'italic' : undefined),
            opacity: message.subtle ? '0.8' : '1'
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

        {/* Timestamp y métricas solo después de completar (no para mensajes sutiles) */}
        {!isStreaming && hasContent && !message.subtle && (
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, color: themeColors.textPrimary, fontSize: '1rem', fontWeight: '600', lineHeight: '1.2' }}>
                {conversationTitle || 'Chat de IA'}
              </h2>
              {currentModel && (
                <span style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.5rem',
                  background: `linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${themeColors.primaryColor}dd 100%)`,
                  color: 'white',
                  borderRadius: '10px',
                  fontSize: '0.6rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  boxShadow: `0 2px 4px ${themeColors.primaryColor}40`,
                  border: `1px solid ${themeColors.primaryColor}60`
                }}>
                  {currentModel}
                </span>
              )}
              {selectedMcpServers && selectedMcpServers.length > 0 && (
                selectedMcpServers
                  .map(serverId => activeMcpServers.find(s => s.id === serverId))
                  .filter(server => server && !disabledMcpServers.includes(server.id))
                  .map((server, idx) => (
                    <span 
                      key={idx}
                      title={server.name || server.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.2rem 0.4rem',
                        background: 'rgba(102, 187, 106, 0.2)',
                        color: '#66bb6a',
                        borderRadius: '8px',
                        fontSize: '0.55rem',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        border: '1px solid rgba(102, 187, 106, 0.4)',
                        boxShadow: '0 0 4px rgba(102, 187, 106, 0.2)',
                        maxWidth: '100px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                      <i className="pi pi-wrench" style={{ fontSize: '0.5rem', marginRight: '0.25rem' }} />
                      {(server.name || server.id).substring(0, 12)}
                    </span>
                  ))
              )}
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

            {/* Botón toggle MCP Tools */}
            <button
              onClick={() => setShowMcpDialog(true)}
              style={{
                background: mcpToolsEnabled ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255,255,255,0.1)',
                border: `1px solid ${mcpToolsEnabled ? 'rgba(255, 152, 0, 0.4)' : themeColors.borderColor}`,
                borderRadius: '6px',
                padding: '0.4rem 0.6rem',
                color: mcpToolsEnabled ? '#ff9800' : themeColors.textSecondary,
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
                e.currentTarget.style.background = mcpToolsEnabled ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = mcpToolsEnabled ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255,255,255,0.1)';
              }}
              title={mcpToolsEnabled ? 'MCP Tools Activado' : 'MCP Tools Desactivado'}
            >
              <i className="pi pi-wrench" style={{ 
                fontSize: '0.8rem',
                color: mcpToolsEnabled ? '#ff9800' : 'inherit'
              }} />
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
                  background: currentStatus?.status === 'tool-execution' 
                    ? `linear-gradient(135deg, #ff9800 0%, #ff9800cc 100%)`
                    : currentStatus?.status === 'tool-error'
                    ? `linear-gradient(135deg, #f44336 0%, #f44336cc 100%)`
                    : `linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${themeColors.primaryColor}cc 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: currentStatus?.status === 'tool-execution'
                    ? `0 2px 8px rgba(255, 152, 0, 0.4)`
                    : currentStatus?.status === 'tool-error'
                    ? `0 2px 8px rgba(244, 67, 54, 0.4)`
                    : `0 2px 8px ${themeColors.primaryColor}40`
                }}>
                  {currentStatus?.status === 'connecting' && <i className="pi pi-link" style={{ color: '#fff', fontSize: '0.8rem' }} />}
                  {currentStatus?.status === 'generating' && <i className="pi pi-cog pi-spin" style={{ color: '#fff', fontSize: '0.8rem' }} />}
                  {currentStatus?.status === 'streaming' && <i className="pi pi-cloud-download" style={{ color: '#fff', fontSize: '0.8rem' }} />}
                  {currentStatus?.status === 'retrying' && <i className="pi pi-refresh pi-spin" style={{ color: '#fff', fontSize: '0.8rem' }} />}
                  {(currentStatus?.status === 'tool-execution' || currentStatus?.status === 'tool-executed') && <i className="pi pi-wrench pi-spin" style={{ color: '#fff', fontSize: '0.9rem' }} />}
                  {currentStatus?.status === 'tool-error' && <i className="pi pi-exclamation-triangle" style={{ color: '#fff', fontSize: '0.8rem' }} />}
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
                   currentStatus?.status === 'tool-execution' ? (
                    <span>
                      🔧 <strong>Ejecutando herramienta…</strong>
                      {currentStatus?.toolName && (
                        <span style={{ opacity: 0.8 }}> · {currentStatus.toolName}</span>
                      )}
                    </span>
                  ) :
                   currentStatus?.status === 'tool-executed' ? (
                     <span>
                       🔧 Resultado recibido: <strong>{currentStatus?.toolName || 'herramienta'}</strong>
                     </span>
                   ) :
                   currentStatus?.status === 'tool-error' ? (
                     <span style={{ color: '#f44336' }}>
                       ❌ Error en: <strong>{currentStatus?.toolName || 'herramienta'}</strong>
                     </span>
                   ) :
                   'Procesando...'}
                  
                  {/* Puntos animados más pequeños - no mostrar durante tool execution */}
                  {currentStatus?.status !== 'tool-execution' && currentStatus?.status !== 'tool-error' && (
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
                  )}
                </div>
                
                {/* Información adicional de tool */}
                {currentStatus?.status === 'tool-execution' && currentStatus?.toolArgs && (
                  <div style={{
                    fontSize: '0.7rem',
                    color: themeColors.textSecondary,
                    marginTop: '0.2rem',
                    opacity: 0.8
                  }}>
                    {Object.keys(currentStatus.toolArgs).length > 0 
                      ? `Con ${Object.keys(currentStatus.toolArgs).length} parámetro(s)`
                      : 'Sin parámetros'
                    }
                  </div>
                )}
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
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    paddingLeft: '1.5rem',
                    paddingRight: '0.5rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flex: 1
                    }}>
                      <i className="pi pi-file" style={{ fontSize: '0.7rem' }} />
                      <span>{file.name}</span>
                      <span style={{ fontSize: '0.75rem' }}>({file.sizeFormatted || 'OK'})</span>
                    </div>
                    <button
                      onClick={() => handleFileRemoved(file.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: themeColors.textSecondary,
                        fontSize: '0.8rem',
                        transition: 'all 0.2s ease',
                        opacity: 0.7
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.opacity = '1';
                        e.target.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
                        e.target.style.color = '#f44336';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.opacity = '0.7';
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = themeColors.textSecondary;
                      }}
                      title="Eliminar archivo adjunto"
                    >
                      <i className="pi pi-times" style={{ fontSize: '0.7rem' }} />
                    </button>
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
          {/* Herramientas MCP activas */}
          <MCPActiveTools themeColors={themeColors} />
          
          {/* Indicadores de rendimiento */}
          <AIPerformanceStats
            currentModel={currentModel}
            modelType={modelType}
            contextLimit={contextLimit}
            inputValue={inputValue}
            messages={messages}
            isLoading={isLoading}
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

        {/* Diálogo de MCPs Activos */}
        {showMcpDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowMcpDialog(false)}>
            <div style={{
              background: themeColors.cardBackground,
              border: `1px solid ${themeColors.borderColor}`,
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '70vh',
              overflow: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: themeColors.textPrimary, fontSize: '1.2rem', fontWeight: '600' }}>
                  🔧 Servidores MCP Activos
                </h2>
                <button
                  onClick={() => setShowMcpDialog(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: themeColors.textSecondary,
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    padding: 0
                  }}>
                  ✕
                </button>
              </div>

              <p style={{ margin: '0 0 1rem 0', color: themeColors.textSecondary, fontSize: '0.85rem' }}>
                Activa/desactiva MCPs y marca los que usarás por defecto
              </p>

              {activeMcpServers && activeMcpServers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {/* Lista de MCPs con botones de acción */}
                  {activeMcpServers.map((server, idx) => {
                    const isSelected = selectedMcpServers.includes(server.id);
                    const isDisabled = disabledMcpServers.includes(server.id);
                    return (
                      <div 
                        key={idx}
                        style={{
                          padding: '0.8rem',
                          background: isDisabled 
                            ? 'rgba(200, 200, 200, 0.08)'
                            : `linear-gradient(135deg, rgba(102, 187, 106, 0.08) 0%, rgba(102, 187, 106, 0.03) 100%)`,
                          border: isDisabled
                            ? '1px solid rgba(200, 200, 200, 0.2)'
                            : '1px solid rgba(102, 187, 106, 0.2)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.6rem',
                          opacity: isDisabled ? 0.6 : 1,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          flex: 1
                        }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isDisabled ? 'rgba(200, 200, 200, 0.15)' : 'rgba(102, 187, 106, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isDisabled ? '#999999' : '#66bb6a',
                            flexShrink: 0
                          }}>
                            <i className="pi pi-wrench" style={{ fontSize: '1rem' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              color: isDisabled ? themeColors.textSecondary : themeColors.textPrimary,
                              fontWeight: '600',
                              fontSize: '0.95rem',
                              textDecoration: isDisabled ? 'line-through' : 'none'
                            }}>
                              {server.name || server.id}
                            </div>
                            <div style={{
                              color: themeColors.textSecondary,
                              fontSize: '0.8rem',
                              marginTop: '0.2rem'
                            }}>
                              {server.id}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          flexShrink: 0
                        }}>
                          {/* Botón Por Defecto */}
                          <button
                            onClick={() => handleToggleMcpSelection(server.id)}
                            disabled={isDisabled}
                            title={isSelected ? 'Remover de por defecto' : 'Usar por defecto'}
                            style={{
                              padding: '0.4rem 0.8rem',
                              background: isSelected ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              border: isSelected ? '1px solid rgba(255, 193, 7, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '6px',
                              color: isSelected ? '#ffc107' : themeColors.textSecondary,
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              whiteSpace: 'nowrap',
                              opacity: isDisabled ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (!isDisabled) {
                                e.currentTarget.style.background = isSelected ? 'rgba(255, 193, 7, 0.3)' : 'rgba(255, 255, 255, 0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isDisabled) {
                                e.currentTarget.style.background = isSelected ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                          >
                            <i className={`pi ${isSelected ? 'pi-star-fill' : 'pi-star'}`} style={{ fontSize: '0.75rem' }} />
                            {isSelected ? 'Por defecto' : 'Por defecto'}
                          </button>

                          {/* Botón Activar/Desactivar */}
                          <button
                            onClick={() => handleToggleMcpActive(server.id)}
                            title={isDisabled ? 'Activar MCP' : 'Desactivar MCP'}
                            style={{
                              padding: '0.4rem 0.8rem',
                              background: isDisabled 
                                ? 'rgba(244, 67, 54, 0.2)'
                                : 'rgba(76, 175, 80, 0.2)',
                              border: isDisabled
                                ? '1px solid rgba(244, 67, 54, 0.4)'
                                : '1px solid rgba(76, 175, 80, 0.4)',
                              borderRadius: '6px',
                              color: isDisabled ? '#f44336' : '#66bb6a',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = isDisabled
                                ? 'rgba(244, 67, 54, 0.3)'
                                : 'rgba(76, 175, 80, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isDisabled
                                ? 'rgba(244, 67, 54, 0.2)'
                                : 'rgba(76, 175, 80, 0.2)';
                            }}
                          >
                            <i className={`pi ${isDisabled ? 'pi-times' : 'pi-check'}`} style={{ fontSize: '0.75rem' }} />
                            {isDisabled ? 'Inactivo' : 'Activo'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: themeColors.textSecondary
                }}>
                  <i className="pi pi-inbox" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }} />
                  <p style={{ margin: 0 }}>No hay servidores MCP activos</p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                    Configura servidores MCP en la configuración de IA
                  </p>
                </div>
              )}

              {/* Resumen de selección */}
              {activeMcpServers && activeMcpServers.length > 0 && selectedMcpServers.length > 0 && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.8rem',
                  background: 'rgba(255, 193, 7, 0.1)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  borderRadius: '8px',
                  color: themeColors.textSecondary,
                  fontSize: '0.85rem'
                }}>
                  ⭐ {selectedMcpServers.length} MCP{selectedMcpServers.length !== 1 ? 's' : ''} marcado{selectedMcpServers.length !== 1 ? 's' : ''} como por defecto
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AIChatPanel;

