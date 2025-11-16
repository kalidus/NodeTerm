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
import ModelMemoryIndicator from './ModelMemoryIndicator';
import ShellSelector from './ShellSelector';
import smartFileDetectionService from '../services/SmartFileDetectionService';
import fileAnalysisService from '../services/FileAnalysisService';
import mcpClient from '../services/MCPClientService';
import debugLogger from '../utils/debugLogger';
import '../utils/debugConversations'; // 🔧 Debug utility

// Importar tema de highlight.js
import 'highlight.js/styles/github-dark.css';
// Importar estilos del AI chat
import '../styles/components/ai-chat.css';
import { FaBrain } from 'react-icons/fa';

const AIChatPanel = ({ showHistory = true, onToggleHistory, onExecuteCommandInTerminal }) => {
  const [messages, setMessages] = useState([]);
  const [reasoningUpdateTrigger, setReasoningUpdateTrigger] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState(null);
  const [modelType, setModelType] = useState('remote');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [themeVersion, setThemeVersion] = useState(0);
  const [functionalModels, setFunctionalModels] = useState([]);
  const [isModelSwitching, setIsModelSwitching] = useState(false); // ✅ NUEVO: Loading de cambio de modelo
  const [modelSwitchProgress, setModelSwitchProgress] = useState(0); // ✅ Progreso 0-100
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Estados avanzados para Fase 2
  const [currentStatus, setCurrentStatus] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const lastToolResultRef = useRef(null);
  const loggedToolMessageIdsRef = useRef(new Set());
  const filesystemStatusRef = useRef('');
  
  // Estado persistente para tarjetas de herramientas expandidas (por messageId)
  const expandedToolCardsRef = useRef(new Set());
  
  // ✅ Estado para reasoning (razonamiento del modelo)
  const reasoningByMessageIdRef = useRef(new Map()); // messageId -> reasoning content
  const [expandedReasoningIds, setExpandedReasoningIds] = useState(new Set()); // messageIds con reasoning expandido (estado compartido)
  
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
  const [showMemoryIndicator, setShowMemoryIndicator] = useState(true); // ✅ NUEVO - Mostrar por defecto
  const [mcpExpanded, setMcpExpanded] = useState(false);
  const [memoryExpanded, setMemoryExpanded] = useState(false);
  const [showMcpPanel, setShowMcpPanel] = useState(false); // Panel de herramientas MCP
  const [showMemoryPanel, setShowMemoryPanel] = useState(false); // Panel de memoria
  const [toolsCount, setToolsCount] = useState(0); // Conteo de herramientas MCP

  // Estados para selector de modelo personalizado
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [modelSelectorTab, setModelSelectorTab] = useState('all'); // 'all' o 'local'

  // Estados para Shell Selector del MCP
  const [selectedShell, setSelectedShell] = useState(() => {
    try {
      const saved = localStorage.getItem('defaultMcpShell');
      return saved || 'powershell';
    } catch {
      return 'powershell';
    }
  });
  const [availableShells, setAvailableShells] = useState([]);
  const [wslDistributions, setWSLDistributions] = useState([]);
  const [cygwinAvailable, setCygwinAvailable] = useState(false);

  // Helper para obtener el nombre del catálogo
  const getMcpCatalogName = (serverId) => {
    try {
      const catalogPath = require.resolve('../data/mcp-catalog.json');
      delete require.cache[catalogPath];
    } catch (e) {
      // Ignore if path resolution fails
    }
    try {
      const mcpData = require('../data/mcp-catalog.json');
      const mcp = mcpData.mcps?.find(m => m.id === serverId);
      return mcp?.name || serverId;
    } catch (e) {
      return serverId;
    }
  };

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

  const logConversation = useCallback((level, message, data) => {
    const args = data ? [data] : [];
    switch (level) {
      case 'error':
        debugLogger.error('AIChatConversation', message, ...args);
        break;
      case 'warn':
        debugLogger.warn('AIChatConversation', message, ...args);
        break;
      case 'debug':
        debugLogger.debug('AIChatConversation', message, ...args);
        break;
      default:
        debugLogger.info('AIChatConversation', message, ...args);
    }
  }, []);

  // Detectar si un texto parece un tool-call JSON para NO mostrarlo en streaming
  const looksLikeToolJson = useCallback((text) => {
    if (!text || typeof text !== 'string') return false;
    const head = text.slice(0, 1200);
    if (/```\s*(json|tool|tool_call)/i.test(head)) return true;
    if (/\"use_tool\"\s*:\s*\"/i.test(head)) return true;
    if (/\"tool\"\s*:\s*\"/i.test(head)) return true;
    // Nuevo: también considerar planes {"plan":[...]}
    if (/\"plan\"\s*:\s*\[/i.test(head)) return true;
    // CRÍTICO: Detectar {"arguments":{...}} - es un tool call JSON sin "tool"
    if (/\"arguments\"\s*:\s*\{/i.test(head)) return true;
    // CRÍTICO: Detectar JSON que comienza directo (sin explicación de texto)
    if (head.trimStart().startsWith('{') && /\"tool\"|\"arguments\"|\"use_tool\"|\"plan\"/.test(head.slice(0, 300))) return true;
    return false;
  }, []);

  // Escuchar actualizaciones de la conversación para sincronizar mensajes en vivo
  useEffect(() => {
    const handleConversationUpdate = (event) => {
      const conv = conversationService.getCurrentConversation();
      if (!conv) return;
      
      const detail = event?.detail || {};
      
      setMessages(prev => {
        // Obtener mensajes persistidos desde localStorage
        const persisted = (conv.messages || []).map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata || {}, // ✅ Asegurar que metadata siempre existe (puede perderse al cargar desde localStorage)
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
          return prev;
        }
        
        // Merge: Combinar persistidos + streaming
        const merged = [...persisted, ...streaming];
        
        return merged;
      });
    };

    window.addEventListener('conversation-updated', handleConversationUpdate);
    return () => window.removeEventListener('conversation-updated', handleConversationUpdate);
  }, []);

  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return;
    }
    const logged = loggedToolMessageIdsRef.current;
    messages.forEach(msg => {
      const isToolResult = msg?.metadata?.isToolResult || msg?.role === 'tool';
      if (!isToolResult || !msg?.id || logged.has(msg.id)) {
        return;
      }
      logged.add(msg.id);
      logConversation('debug', 'Resultado de herramienta persistido', {
        messageId: msg.id,
        toolName: msg?.metadata?.toolName,
        hasToolResultText: !!msg?.metadata?.toolResultText
      });
      if (!msg?.metadata?.toolResultText) {
        logConversation('warn', 'Resultado de herramienta sin toolResultText', {
          messageId: msg.id,
          toolName: msg?.metadata?.toolName
        });
      }
    });
  }, [messages, logConversation]);

  const looksLikeJsonStart = useCallback((text) => {
    if (!text || typeof text !== 'string') return false;
    const t = text.trimStart();
    // Solo considerar JSON si empieza con { y contiene "tool" o "use_tool" en los primeros 300 chars
    if (t.startsWith('{')) {
      const head = t.substring(0, 300);
      // CRÍTICO: Detectar "arguments" también
      return head.includes('"tool"') || head.includes('"use_tool"') || head.includes('"plan"') || head.includes('"arguments"');
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
  // Efecto para actualizar conteo de herramientas MCP
  useEffect(() => {
    const updateToolsCount = () => {
      try {
        const tools = mcpClient.getAvailableTools();
        setToolsCount(tools.length);
      } catch (error) {
        console.error('[AIChatPanel] Error actualizando conteo de herramientas:', error);
      }
    };

    updateToolsCount();
    
    // Listener para cambios en MCP
    const unsubscribe = mcpClient.addListener((event) => {
      if (event === 'tools-updated' || event === 'servers-updated') {
        updateToolsCount();
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Detectar shells disponibles (PowerShell, WSL, Cygwin)
  useEffect(() => {
    const detectShells = async () => {
      const shells = ['powershell']; // PowerShell siempre disponible en Windows
      
      try {
        // Detectar distribuciones WSL
        if (window.electron && window.electron.ipcRenderer) {
          try {
            const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
            if (Array.isArray(distributions) && distributions.length > 0) {
              setWSLDistributions(distributions);
              distributions.forEach(distro => {
                shells.push(`wsl-${distro.name || distro.label}`);
              });
            }
          } catch (e) {
            console.error('Error detectando WSL:', e);
          }

          // Detectar Cygwin
          try {
            const result = await window.electronAPI.invoke('cygwin:detect');
            if (result && result.available) {
              setCygwinAvailable(true);
              shells.push('cygwin');
            }
          } catch (e) {
            console.error('Error detectando Cygwin:', e);
          }
        }
      } catch (error) {
        console.error('Error en detección de shells:', error);
      }

      setAvailableShells(shells);
    };

    detectShells();
  }, []);

  // Monitorear cambios en la shell seleccionada y agregar mensaje de contexto
  const previousShellRef = useRef(selectedShell);
  useEffect(() => {
    if (previousShellRef.current !== selectedShell && currentConversationId) {
      // Solo mostrar el mensaje si ya hay una conversación iniciada y cambió la shell
      const getShellName = (shell) => {
        if (shell === 'powershell') return 'PowerShell';
        if (shell === 'cygwin') return 'Cygwin';
        if (shell.startsWith('wsl-')) {
          const distroName = shell.replace('wsl-', '');
          return `WSL: ${distroName}`;
        }
        return shell;
      };

      const shellName = getShellName(selectedShell);
      const contextMessage = `⚠️ Terminal cambiada a **${shellName}**. Los próximos comandos se ejecutarán en esta terminal.`;
      
      // Agregar mensaje de contexto al historial
      // El renderMarkdown convertirá **texto** a HTML <strong>
      const htmlMessage = contextMessage
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
      
      conversationService.addMessage('system', htmlMessage, {
        isSystemMessage: true,
        type: 'shell-changed'
      });

      // Actualizar el estado de mensajes para que se vea inmediatamente
      const currentConversation = conversationService.getCurrentConversation();
      if (currentConversation && currentConversation.messages) {
        setMessages(
          currentConversation.messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            metadata: m.metadata
          }))
        );
      }

      // 🔧 ACTUALIZAR LA CONFIGURACIÓN DEL MCP NODETERM CLI
      // Convertir selectedShell a preferredTerminal (parámetro del MCP)
      const getPreferredTerminal = (shell) => {
        if (shell === 'powershell') return 'powershell';
        if (shell === 'cygwin') return 'cygwin';
        if (shell.startsWith('wsl-')) {
          // Para WSL: pasar la distro específica (ubuntu-24.04, kali-linux, etc)
          const distroName = shell.replace('wsl-', '');
          return distroName;
        }
        return shell;
      };

      const preferredTerminal = getPreferredTerminal(selectedShell);
      
      // Actualizar la configuración del MCP y reiniciar el servidor
      (async () => {
        try {
          console.log(`[Shell Selector] 🎯 Cambiando terminal a: ${preferredTerminal}`);
          
          // 1️⃣ Actualizar la configuración en el archivo
          console.log(`[Shell Selector] 💾 Guardando config: preferredTerminal = ${preferredTerminal}`);
          const updateResult = await mcpClient.updateServerConfig('ssh-terminal', {
            options: {
              preferredTerminal: preferredTerminal
            }
          });
          console.log(`[Shell Selector] ✅ updateServerConfig completado:`, updateResult);
          
          // Esperar 2 segundos para asegurar que la config se escribió completamente en disco
          // y se limpió el caché del SO
          console.log(`[Shell Selector] ⏳ Esperando 2s para persistencia de config en disco...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 2️⃣ Detener el servidor
          console.log(`[Shell Selector] 🛑 Deteniendo servidor ssh-terminal...`);
          const stopResult = await mcpClient.stopServer('ssh-terminal');
          console.log(`[Shell Selector] ✅ Servidor detenido:`, stopResult);
          
          // Esperar 1 segundo para asegurar que se detuvo, liberó recursos y limpió caché
          console.log(`[Shell Selector] ⏳ Esperando 1s después de detener...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 3️⃣ Reiniciar el servidor (debería cargar la nueva configuración)
          console.log(`[Shell Selector] 🚀 Reiniciando servidor ssh-terminal...`);
          const startResult = await mcpClient.startServer('ssh-terminal');
          console.log(`[Shell Selector] ✅ Servidor reiniciado:`, startResult);
          
          console.log(`[Shell Selector] ✅ Terminal cambiada a: ${preferredTerminal}`);
          
        } catch (error) {
          console.error(`[Shell Selector] ❌ Error actualizando MCP:`, error);
        }
      })();

      previousShellRef.current = selectedShell;
    }
  }, [selectedShell, currentConversationId]);

  useEffect(() => {
    const config = aiService.loadConfig();
    setCurrentModel(aiService.currentModel);
    setModelType(aiService.modelType);
    
    // Cargar modelos funcionales
    const functional = aiService.getFunctionalModels();
    setFunctionalModels(functional);

    // ✅ NUEVO: Cargar automáticamente el último modelo usado
    (async () => {
      const loaded = await aiService.autoLoadLastModel();
      if (loaded) {
        setCurrentModel(aiService.currentModel);
        setModelType(aiService.modelType);
      }
    })();
    
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
    mcpClient.initialize().then(() => {
      // Sincronizar MCPs instalados con localStorage
      const allServers = mcpClient.getAllServers();
      const existingServerIds = new Set(allServers.map(s => s.id));
      const enabledServerIds = allServers
        .filter(s => s.config?.enabled)
        .map(s => s.id);

      // Merge: mantener lo que ya está en localStorage (filtrado) + agregar nuevos enabled
      setSelectedMcpServers(prev => {
        // PASO 1: Filtrar MCPs que no existen
        const filteredPrev = prev.filter(id => existingServerIds.has(id));
        
        // PASO 2: Filtrar MCPs que fueron deshabilitados
        const stillEnabledPrev = filteredPrev.filter(id => {
          const server = allServers.find(s => s.id === id);
          return server && server.config?.enabled !== false;
        });
        
        const removed = prev.filter(id => !existingServerIds.has(id));
        const disabled = filteredPrev.filter(id => !stillEnabledPrev.includes(id));
        
        const merged = new Set([...stillEnabledPrev, ...enabledServerIds]);
        const merged_array = Array.from(merged);

        // Solo actualizar si hay cambios
        if (JSON.stringify(merged_array) !== JSON.stringify(prev)) {
          localStorage.setItem('selectedMcpServers', JSON.stringify(merged_array));
          return merged_array;
        }
        return prev;
      });
    }).catch(error => {
      console.error('Error inicializando MCP client:', error);
    });

    // Iniciar MCPs marcados como por defecto después de 1 segundo
    // (dar tiempo a que se inicialice MCPClient)
    const initDefaultMcps = setTimeout(() => {
      if (selectedMcpServers.length > 0) {
        const allServers = mcpClient.getAllServers();
        const serverMap = new Map(allServers.map(s => [s.id, s]));
        
        // Filtrar: solo MCPs que existen AND están habilitados
        const validServerIds = selectedMcpServers.filter(id => {
          const server = serverMap.get(id);
          if (!server) return false;
          if (server.config?.enabled === false) return false;
          return true;
        });

        if (validServerIds.length === 0) return;
        validServerIds.forEach(serverId => {
          mcpClient.startServer(serverId).catch(error => {
            console.error(`Error iniciando MCP ${serverId}:`, error);
          });
        });
      }
    }, 1000);

    return () => clearTimeout(initDefaultMcps);
  }, [selectedMcpServers]);

  // 🔗 Sincronizar TODAS las conexiones SSH del árbol ("explorador de sesiones")
  useEffect(() => {
    const syncSSHConnectionsToMCP = async () => {
      try {
        let allSSHConnections = [];

        // 🎯 OPCIÓN 1: Usar window.sshConnectionsFromSidebar (Sidebar las sincroniza automáticamente)
        if (window.sshConnectionsFromSidebar && Array.isArray(window.sshConnectionsFromSidebar) && window.sshConnectionsFromSidebar.length > 0) {
          allSSHConnections = window.sshConnectionsFromSidebar;
        }
        
        // 🎯 OPCIÓN 2: Intentar leer desde basicapp2_tree_data como fallback
        if (allSSHConnections.length === 0) {
          try {
            const treeDataStr = localStorage.getItem('basicapp2_tree_data');
            if (treeDataStr) {
              const nodes = JSON.parse(treeDataStr);
              
              // Extraer TODAS las conexiones SSH del árbol (recursivamente)
              const extractSSHNodes = (nodes) => {
                let sshNodes = [];
                for (const node of nodes) {
                  if (node.data && node.data.type === 'ssh') {
                    sshNodes.push(node);
                  }
                  if (node.children && node.children.length > 0) {
                    sshNodes = sshNodes.concat(extractSSHNodes(node.children));
                  }
                }
                return sshNodes;
              };
              
              const sshNodes = extractSSHNodes(nodes);
              allSSHConnections = sshNodes.map((node, idx) => {
                const connData = {
                  id: node.key || `ssh_${node.data.host}_${node.data.username}`,
                  type: 'ssh',
                  label: node.label,
                  name: node.label || node.data.name || `${node.data.username}@${node.data.host}`,
                  host: node.data.useBastionWallix ? node.data.targetServer : node.data.host,
                  port: node.data.port || 22,
                  username: node.data.username || node.data.user,
                  password: node.data.password || '',
                  privateKey: node.data.privateKey || '',
                  useBastionWallix: node.data.useBastionWallix || false,
                  bastionHost: node.data.bastionHost || '',
                  bastionUser: node.data.bastionUser || '',
                  targetServer: node.data.targetServer || ''
                };
                return connData;
              });
            }
          } catch (e) {
            // Error silencioso - solo fallback
          }
        }

        // 🎯 OPCIÓN 2: Si no hay basicapp2_tree_data, desencriptar connections_encrypted
        if (allSSHConnections.length === 0) {
          try {
            const encryptedStr = localStorage.getItem('connections_encrypted');
            if (encryptedStr) {
              // console.log(`🔍 [AIChatPanel] basicapp2_tree_data vacío, intentando desencriptar connections_encrypted...`);
              
              // Necesitamos la masterKey para desencriptar
              // La obtenemos del window (debería estar disponible si el usuario está logueado)
              if (window.currentMasterKey) {
                try {
                  const SecureStorage = require('../services/SecureStorage').default || require('../services/SecureStorage');
                  const secureStorage = new SecureStorage();
                  const encryptedObj = JSON.parse(encryptedStr);
                  const decrypted = await secureStorage.decryptData(encryptedObj, window.currentMasterKey);
                  
                  // decrypted debería ser un array de nodos
                  if (Array.isArray(decrypted)) {
                    const extractSSHNodes = (nodes) => {
                      let sshNodes = [];
                      for (const node of nodes) {
                        if (node.data && node.data.type === 'ssh') {
                          sshNodes.push(node);
                        }
                        if (node.children && node.children.length > 0) {
                          sshNodes = sshNodes.concat(extractSSHNodes(node.children));
                        }
                      }
                      return sshNodes;
                    };
                    
                    const sshNodes = extractSSHNodes(decrypted);
                    allSSHConnections = sshNodes.map(node => ({
                      id: node.key || `ssh_${node.data.host}_${node.data.username}`,
                      type: 'ssh',
                      label: node.label, // Guardar el label original del nodo
                      name: node.label || node.data.name || `${node.data.username}@${node.data.host}`,
                      host: node.data.useBastionWallix ? node.data.targetServer : node.data.host,
                      port: node.data.port || 22,
                      username: node.data.username || node.data.user,
                      password: node.data.password || '',
                      privateKey: node.data.privateKey || '',
                      // Datos de Bastion Wallix si existen
                      useBastionWallix: node.data.useBastionWallix || false,
                      bastionHost: node.data.bastionHost || '',
                      bastionUser: node.data.bastionUser || '',
                      targetServer: node.data.targetServer || ''
                    }));
                    // console.log(`✅ [AIChatPanel] ${allSSHConnections.length} conexiones desencriptadas desde connections_encrypted`);
                  }
                } catch (decryptError) {
                  // Error silencioso - solo fallback
                }
              }
            }
          } catch (e) {
            // Error silencioso - solo fallback
          }
        }

        // Si no hay conexiones en localStorage, intentar obtenerlas desde window.sshConnectionsFromSidebar
        if (allSSHConnections.length === 0 && window.sshConnectionsFromSidebar) {
          allSSHConnections = window.sshConnectionsFromSidebar;
        }
        
        if (allSSHConnections.length === 0) {
          return;
        }
        
        // Formatear para el MCP (pasar TODO el objeto tal cual)
        const connections = allSSHConnections.map(conn => ({
          ...conn  // ✅ Pasar TODOS los campos del objeto
        }));

        // Guardar TODAS las conexiones en memoria del MCP (en el renderer process)
        if (window.electron?.ipcRenderer) {
          try {
            // Verificar si ya se sincronizó recientemente (debounce de 2 segundos)
            const now = Date.now();
            const lastSyncKey = 'lastSSHSyncTime';
            const lastSync = window[lastSyncKey] || 0;
            const timeSinceLastSync = now - lastSync;
            
            if (timeSinceLastSync < 2000) {
              return;
            }
            
            window[lastSyncKey] = now;
            
            // Enviar con un pequeño retry solo si el servidor no está listo aún
            const sendConnections = (attempt = 0) => {
              try {
                window.electron.ipcRenderer.send('app:save-ssh-connections-for-mcp', connections);
              } catch (err) {
                console.error(`❌ [AIChatPanel] Error enviando conexiones:`, err.message);
              }
            };
            
            // Enviar inmediatamente y un solo retry después de 500ms si es necesario
            sendConnections(0);
            setTimeout(() => sendConnections(1), 500);
          } catch (ipcError) {
            console.error('[AIChatPanel] ❌ Error en IPC send:', ipcError.message);
          }
        } else {
          console.error('[AIChatPanel] ❌ window.electron.ipcRenderer NO está disponible');
        }
      } catch (error) {
        console.error('[AIChatPanel] ❌ Error en sincronización SSH:', error);
      }
    };

    // Sincronizar al montar el componente (con delay para dar tiempo a que localStorage esté listo)
    const initialSyncTimeout = setTimeout(() => {
      syncSSHConnectionsToMCP();
    }, 500); // Delay corto solo para asegurar que todo esté cargado

    // Escuchar cambios en el árbol de conexiones
    const handleTreeUpdated = () => {
      syncSSHConnectionsToMCP();
    };

    const handleSidebarSSHUpdated = (event) => {
      // Resincronizar INMEDIATAMENTE cuando Sidebar actualiza
      syncSSHConnectionsToMCP();
    };

    window.addEventListener('connections-updated', handleTreeUpdated);
    window.addEventListener('sidebar-ssh-connections-updated', handleSidebarSSHUpdated);
    
    return () => {
      clearTimeout(initialSyncTimeout);
      window.removeEventListener('connections-updated', handleTreeUpdated);
      window.removeEventListener('sidebar-ssh-connections-updated', handleSidebarSSHUpdated);
    };
  }, []);

  // 🔐 Sincronizar PASSWORDS del Password Manager con el MCP
  useEffect(() => {
    const syncPasswordsToMCP = async () => {
      try {
        let allPasswords = [];

        // 🎯 OPCIÓN 1: Usar window.passwordsFromPasswordManager (si Sidebar lo sincroniza)
        if (window.passwordsFromPasswordManager && Array.isArray(window.passwordsFromPasswordManager) && window.passwordsFromPasswordManager.length > 0) {
          allPasswords = window.passwordsFromPasswordManager;
        }
        
        // 🎯 OPCIÓN 2: Intentar desde passwords_encrypted (desencriptar si hay master key)
        if (allPasswords.length === 0 && window.currentMasterKey) {
          try {
            const encryptedStr = localStorage.getItem('passwords_encrypted');
            if (encryptedStr) {
              try {
                const SecureStorage = require('../services/SecureStorage').default || require('../services/SecureStorage');
                const secureStorage = new SecureStorage();
                const encryptedObj = JSON.parse(encryptedStr);
                const decrypted = await secureStorage.decryptData(encryptedObj, window.currentMasterKey);
                
                if (Array.isArray(decrypted)) {
                  allPasswords = decrypted;
                }
              } catch (decryptError) {
                // Error silencioso - solo fallback
              }
            }
          } catch (e) {
            // Error silencioso - solo fallback
          }
        }
        
        // 🎯 OPCIÓN 3: Leer desde passwordManagerNodes (sin encriptar, fallback)
        if (allPasswords.length === 0) {
          try {
            const plainStr = localStorage.getItem('passwordManagerNodes');
            if (plainStr) {
              allPasswords = JSON.parse(plainStr);
            }
          } catch (e) {
            // Error silencioso - solo fallback
          }
        }

        if (allPasswords.length === 0) {
          return;
        }
        
        // Enviar al MCP via IPC
        if (window.electron?.ipcRenderer) {
          try {
            const sendPasswords = (attempt = 0) => {
              try {
                window.electron.ipcRenderer.send('app:save-passwords-for-mcp', allPasswords);
              } catch (err) {
                console.error(`❌ [AIChatPanel] Error en intento ${attempt + 1}:`, err.message);
              }
            };
            
            // Enviar múltiples veces para asegurar entrega
            sendPasswords(0);
            setTimeout(() => sendPasswords(1), 200);
            setTimeout(() => sendPasswords(2), 1000);
          } catch (ipcError) {
            console.error('[AIChatPanel] ❌ Error en IPC send:', ipcError.message);
          }
        } else {
          console.error('[AIChatPanel] ❌ window.electron.ipcRenderer NO está disponible');
        }
      } catch (error) {
        console.error('[AIChatPanel] ❌ Error sincronizando contraseñas:', error);
      }
    };

    // Sincronizar con delay para dar tiempo a que todo cargue
    const initialSyncTimeout = setTimeout(() => {
      syncPasswordsToMCP();
    }, 1500); // Delay ligeramente mayor que SSH para asegurar que Password Manager esté listo

    // Escuchar cambios en contraseñas
    const handlePasswordsUpdated = (event) => {
      syncPasswordsToMCP();
    };

    window.addEventListener('passwords-updated', handlePasswordsUpdated);
    
    return () => {
      clearTimeout(initialSyncTimeout);
      window.removeEventListener('passwords-updated', handlePasswordsUpdated);
    };
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

  // Escuchar evento para abrir AIConfigDialog en pestaña MCP
  useEffect(() => {
    const handleOpenAIConfig = (event) => {
      debugLogger.debug('AIChatPanel.UI', 'Evento open-ai-config recibido', event.detail);
      
      if (event.detail?.tab === 'mcp-manager') {
        // Guardar el servidor a seleccionar en window para que MCPManagerTab lo lea cuando se carguen los datos
        if (event.detail?.selectServer) {
          window.__mcpConfigSelectServer = event.detail.selectServer;
          debugLogger.debug('AIChatPanel.UI', 'Servidor MCP seleccionado para configuración', window.__mcpConfigSelectServer);
        }
        
        // Abrir el diálogo en la pestaña MCP
        setShowConfigDialog(true);
      }
    };

    window.addEventListener('open-ai-config', handleOpenAIConfig);
    return () => {
      window.removeEventListener('open-ai-config', handleOpenAIConfig);
    };
  }, []);

  // Escuchar cambios en los servidores MCP (todos, no solo activos)
  useEffect(() => {
    const updateMcpServers = () => {
      // Obtener TODOS los MCPs instalados, no solo los activos
      const allServers = mcpClient.getAllServers();
      setActiveMcpServers(allServers || []);
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

  // ✅ NUEVO: Sincronizar selectedMcpServers cuando un MCP es deshabilitado
  useEffect(() => {
    const handleMcpToggle = (event, data) => {
      if (event === 'server-toggled') {
        const { serverId, enabled } = data;
        
        if (!enabled) {
          // Si se deshabilita un MCP, removerlo de selectedMcpServers
          setSelectedMcpServers(prev => {
            if (prev.includes(serverId)) {
              const updated = prev.filter(id => id !== serverId);
              localStorage.setItem('selectedMcpServers', JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
        }
      }
    };
    
    const unsubscribe = mcpClient.addListener(handleMcpToggle);
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ✅ NUEVO: Iniciar monitoreo PASIVO de memoria al cargar el componente
  // El monitoreo SOLO observa RAM cada 30s, sin tomar acciones automáticas
  // Las descargas son MANUALES via widget (Ctrl+M)
  useEffect(() => {
    aiService.memoryService.startMonitoring();

    return () => {
      // Opcional: detener monitoreo al desmontar
      // aiService.memoryService.stopMonitoring();
    };
  }, []);

  // ✅ NUEVO: Shortcut Ctrl+M para mostrar/ocultar widget de memoria
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        setShowMemoryIndicator(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const filesystemServer = activeMcpServers.find(server => server.id === 'filesystem');
    const isDisabled = disabledMcpServers.includes('filesystem');
    const isSelected = selectedMcpServers.includes('filesystem') && !isDisabled;
    const isRunning = filesystemServer?.running && filesystemServer?.state === 'ready';
    const isEnabled = filesystemServer?.config?.enabled !== false;
    const isAvailable = Boolean(
      mcpToolsEnabled &&
      filesystemServer &&
      isSelected &&
      isRunning &&
      isEnabled
    );

    const normalizeAllowedPaths = (rawValue) => {
      if (!rawValue) return [];

      const pushValuesFrom = (value, target, seen) => {
        if (!value) return;
        let paths = [];
        if (Array.isArray(value)) {
          paths = value;
        } else if (typeof value === 'string') {
          const trimmed = value.trim();
          if (!trimmed) return;
          const looksLikeJsonArray = trimmed.startsWith('[') && trimmed.endsWith(']');
          if (looksLikeJsonArray) {
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) {
                paths = parsed;
              } else {
                paths = [trimmed];
              }
            } catch {
              paths = trimmed.split(/\r?\n|,/);
            }
          } else {
            paths = trimmed.split(/\r?\n|,/);
          }
        } else if (typeof value === 'object') {
          paths = Object.values(value || {});
        }

        paths
          .map(path => (typeof path === 'string' ? path.trim() : String(path || '').trim()))
          .filter(Boolean)
          .forEach(path => {
            if (!seen.has(path)) {
              seen.add(path);
              target.push(path);
            }
          });
      };

      const collected = [];
      const seen = new Set();

      pushValuesFrom(rawValue, collected, seen);
      return collected;
    };

    let allowedPaths = [];
    if (isAvailable && filesystemServer) {
      const candidates = [
        filesystemServer.config?.configValues?.allowedPaths,
        filesystemServer.config?.allowedPaths,
        filesystemServer.config?.options?.allowedPaths,
        filesystemServer.allowedPaths,
        filesystemServer.config?.env?.ALLOWED_PATHS,
        filesystemServer.config?.env?.ALLOWED_DIR
      ];

      candidates.forEach(candidate => {
        const paths = normalizeAllowedPaths(candidate);
        if (paths.length > 0) {
          allowedPaths = Array.from(new Set([...allowedPaths, ...paths]));
        }
      });
    }

    const serverMeta = filesystemServer
      ? {
          id: filesystemServer.id,
          name: filesystemServer.name || filesystemServer.id,
          state: filesystemServer.state || null,
          running: Boolean(filesystemServer.running),
          enabled: filesystemServer.config?.enabled !== false,
          version: filesystemServer.version || null
        }
      : null;

    const detail = {
      type: 'filesystem',
      conversationId: currentConversationId || null,
      active: isAvailable,
      isSelected: Boolean(isSelected && filesystemServer),
      running: Boolean(isRunning),
      allowedPaths: allowedPaths,
      defaultPath: allowedPaths.length > 0 ? allowedPaths[0] : null,
      server: serverMeta
    };

    const serialized = JSON.stringify(detail);
    if (filesystemStatusRef.current !== serialized) {
      filesystemStatusRef.current = serialized;
      window.dispatchEvent(new CustomEvent('filesystem-mcp-status', { detail }));
    }
  }, [
    activeMcpServers,
    selectedMcpServers,
    disabledMcpServers,
    mcpToolsEnabled,
    currentConversationId
  ]);

  useEffect(() => {
    return () => {
      filesystemStatusRef.current = '';
      window.dispatchEvent(new CustomEvent('filesystem-mcp-status', {
        detail: {
          type: 'filesystem',
          conversationId: null,
          active: false,
          isSelected: false,
          running: false,
          allowedPaths: [],
          defaultPath: null,
          server: null
        }
      }));
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

    logConversation('debug', 'Usuario envía mensaje', {
      conversationId: currentConversationId,
      length: userMessage.length,
      attachedFiles: attachedFiles.length
    });

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
        logConversation('debug', 'Sincronizando conversación activa', {
          conversationId: currentConversationId
        });
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
        onReasoning: (reasoningData) => {
          // ✅ CAPTURAR REASONING: Guardar en el mensaje actual del asistente
          if (reasoningData.reasoning) {
            setMessages(prev => prev.map(msg => {
              if (msg.id === assistantMessageId) {
                // Actualizar reasoning en el mensaje
                const currentReasoning = reasoningByMessageIdRef.current.get(assistantMessageId) || '';
                const newReasoning = reasoningData.isComplete 
                  ? reasoningData.reasoning 
                  : (currentReasoning + reasoningData.reasoning);
                
                reasoningByMessageIdRef.current.set(assistantMessageId, newReasoning);
                
                return {
                  ...msg,
                  metadata: {
                    ...msg.metadata,
                    reasoning: newReasoning,
                    hasReasoning: true
                  }
                };
              }
              return msg;
            }));
          }
        },
        onToolResult: (toolData) => {
          logConversation('info', 'Resultado de herramienta recibido (stream)', {
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
          const isErrorResult = Boolean(
            toolData?.result?.isError ||
            toolData?.result?.error ||
            toolData?.error
          );


          // Guardar último resultado para posibles fallbacks del mensaje final
          lastToolResultRef.current = { 
            toolName: toolData.toolName, 
            text: resultText,
            timestamp: Date.now(), // 🔧 Agregar timestamp para verificar si es reciente
            isError: isErrorResult
          };
          
          // 🖥️ APERTURA AUTOMÁTICA DE TERMINAL - ejecutar comandos locales/SSH
          const baseName = toolData.toolName.includes('__') ? toolData.toolName.split('__')[1] : toolData.toolName;
          console.log('🔍 Verificando si abrir terminal:', {
            baseName,
            hasCommand: !!toolData.args?.command,
            isError: isErrorResult,
            shouldOpen: (baseName === 'execute_local' || baseName === 'execute_ssh') && toolData.args?.command && !isErrorResult,
            hasCallback: typeof onExecuteCommandInTerminal === 'function'
          });
          
          if ((baseName === 'execute_local' || baseName === 'execute_ssh') && toolData.args?.command && !isErrorResult) {
            console.log('✅ Llamando callback para abrir terminal:', {
              baseName,
              command: toolData.args.command,
              workingDir: toolData.args.workingDir,
              hostId: toolData.args.hostId
            });
            
            // Pequeño delay para que el resultado se renderice primero
            setTimeout(() => {
              const commandData = { 
                command: toolData.args.command,
                workingDir: toolData.args.workingDir,
                hostId: toolData.args.hostId,
                toolType: baseName
              };
              
              console.log('🚀 Ejecutando callback con datos:', commandData);
              console.log('🔍 Tipo de callback:', typeof onExecuteCommandInTerminal);
              console.log('🔍 Callback es función?', typeof onExecuteCommandInTerminal === 'function');
              
              // Llamar callback directamente si existe
              if (typeof onExecuteCommandInTerminal === 'function') {
                console.log('✅ Llamando onExecuteCommandInTerminal(commandData)...');
                try {
                  onExecuteCommandInTerminal(commandData);
                  console.log('✅ Callback ejecutado correctamente');
                } catch (error) {
                  console.error('❌ Error ejecutando callback:', error);
                }
              } else {
                console.warn('⚠️ onExecuteCommandInTerminal callback no está definido');
                // Fallback a evento de window
                window.dispatchEvent(new CustomEvent('ai-chat-execute-command-in-terminal', {
                  detail: commandData
                }));
              }
            }, 100);
          } else {
            console.log('❌ NO se abrirá terminal');
          }

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
            return;
          }
          
          // Flujo legacy: persistir un mensaje de sistema minimalista y reflejar en UI
          
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
          
          // ✅ FILTRAR REASONING DEL CONTENIDO: Si hay reasoning capturado, removerlo del contenido normal
          const reasoning = reasoningByMessageIdRef.current.get(assistantMessageId);
          if (reasoning && normalizedResp) {
            // Estrategia 1: Si el contenido comienza con el reasoning completo, removerlo
            const reasoningTrimmed = reasoning.trim();
            const respTrimmed = normalizedResp.trim();
            
            // Si el contenido comienza exactamente con el reasoning
            if (respTrimmed.startsWith(reasoningTrimmed)) {
              normalizedResp = respTrimmed.substring(reasoningTrimmed.length).trim();
            }
            // Si el contenido contiene el reasoning al principio (con variaciones de espacios)
            else if (respTrimmed.toLowerCase().includes(reasoningTrimmed.toLowerCase().substring(0, Math.min(100, reasoningTrimmed.length)))) {
              // Buscar dónde termina el reasoning en el contenido
              const reasoningStart = respTrimmed.toLowerCase().indexOf(reasoningTrimmed.toLowerCase().substring(0, 50));
              if (reasoningStart >= 0 && reasoningStart < 300) {
                // Estimar dónde termina el reasoning (aproximadamente su longitud)
                const estimatedEnd = reasoningStart + reasoningTrimmed.length + 50; // Margen de error
                const afterReasoning = respTrimmed.substring(Math.min(estimatedEnd, respTrimmed.length)).trim();
                
                // Si lo que queda después parece una respuesta real (no solo espacios/puntuación)
                if (afterReasoning.length > 10 && /[a-zA-Z]/.test(afterReasoning)) {
                  normalizedResp = afterReasoning;
                } else {
                  // Si no hay contenido después del reasoning, usar fallback
                  normalizedResp = null;
                }
              }
            }
            
            // Estrategia 2: Remover líneas individuales del reasoning que aparecen al inicio
            if (normalizedResp) {
              const reasoningLines = reasoningTrimmed.split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 20); // Solo líneas significativas
              
              let cleanedResp = normalizedResp;
              let removedLines = 0;
              
              // Remover hasta 5 líneas del reasoning si aparecen al inicio
              for (const line of reasoningLines.slice(0, 5)) {
                if (line.length > 30) {
                  // Buscar la línea al inicio del contenido (con flexibilidad)
                  const lineLower = line.toLowerCase();
                  const respLower = cleanedResp.toLowerCase();
                  
                  // Buscar coincidencia aproximada (primeros 100 caracteres de la línea)
                  const linePrefix = lineLower.substring(0, Math.min(50, line.length));
                  const index = respLower.indexOf(linePrefix);
                  
                  if (index >= 0 && index < 200) {
                    // Encontrar el final de la línea (hasta el siguiente salto de línea o punto)
                    let endIndex = cleanedResp.indexOf('\n', index);
                    if (endIndex < 0) endIndex = cleanedResp.indexOf('.', index);
                    if (endIndex < 0) endIndex = index + line.length;
                    
                    // Remover esta línea
                    cleanedResp = (cleanedResp.substring(0, index) + cleanedResp.substring(endIndex + 1)).trim();
                    removedLines++;
                  }
                }
              }
              
              // Si removimos varias líneas, usar el contenido limpio
              if (removedLines >= 2) {
                normalizedResp = cleanedResp.trim();
              }
            }
            
            // Estrategia 3: Remover patrones comunes de reasoning al inicio
            if (normalizedResp) {
              const reasoningPatterns = [
                /^El usuario (está|quiere|solicita|pide|solicitó).*?\.\s*/i,
                /^Debo usar.*?herramienta.*?\.\s*/i,
                /^La herramienta.*?busca.*?\.\s*/i,
                /^Como el usuario.*?\.\s*/i,
                /^Respuesta:.*?\.\s*/i,
                /^No hay necesidad.*?\.\s*/i
              ];
              
              let cleanedResp = normalizedResp;
              for (const pattern of reasoningPatterns) {
                cleanedResp = cleanedResp.replace(pattern, '').trim();
              }
              
              normalizedResp = cleanedResp;
            }
            
            // Si después de limpiar el contenido está muy corto o vacío, usar fallback
            if (!normalizedResp || normalizedResp.length < 20) {
              normalizedResp = null; // Forzar usar fallback
            }
          }
          
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
                  if (last.isError) {
                    return last.text;
                  }
                  // Si hay resultado de tool reciente, sintetizar una explicación breve
                  if (aiService.featureFlags?.structuredToolMessages) {
                    // Intentar crear una descripción más útil basada en el toolName
                    const toolName = last.toolName || '';
                    if (toolName.includes('write') || toolName.includes('create')) {
                      return 'He completado la operación de escritura/creación.';
                    } else if (toolName.includes('read') || toolName.includes('list')) {
                      return 'He obtenido la información solicitada.';
                    } else if (toolName.includes('edit') || toolName.includes('modify')) {
                      return 'He realizado las modificaciones solicitadas.';
                    }
                    return 'Operación completada correctamente.';
                  }
                  // Intentar sintetizar una frase breve del resultado
                  const pathMatch = last.text.match(/wrote to\s+(.+)$/i);
                  const path = pathMatch ? pathMatch[1] : '';
                  return path ? `He creado el archivo en ${path}.` : `Operación completada: ${last.text.slice(0, 50)}`;
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
            logConversation('warn', 'Respuesta del modelo contiene solo metadata del sistema', {
              conversationId: conversationService.currentConversationId
            });
            // En lugar de "Hecho." genérico, usar una descripción más útil
            safeResponse = 'Operación completada correctamente.';
          }
          
          // ✅ IMPROVED: Detectar si la respuesta es SOLO JSON de tool call (no debería guardarse como respuesta)
          // NOTA: Esta detección solo se aplica si structuredToolMessages ESTÁ activo (Tool Orchestrator maneja el JSON)
          const isJsonToolCall = (() => {
            // Si NO hay orchestrator, el JSON se manejará en otro lugar
            if (!aiService.featureFlags?.structuredToolMessages) {
              return false;
            }
            
            const trimmed = safeResponse.trim();
            
            // Caso 1: JSON completo y válido
            if (trimmed.startsWith('{') && (trimmed.endsWith('}') || trimmed.endsWith('}}'))) {
              try {
                // Si puede ser parseado como JSON, verificar si tiene campos de tool
                const cleanJson = trimmed.endsWith('}}') ? trimmed.slice(0, -1) : trimmed; // Remover }} extra
                const parsed = JSON.parse(cleanJson);
                // Es un tool call si tiene "tool", "use_tool", "arguments", o "plan"
                return parsed.tool || parsed.use_tool || parsed.arguments || parsed.plan;
              } catch (e) {
                // JSON inválido/truncado - podría ser un tool call cortado
                // Verificar si contiene patrones de tool call JSON
                if (/\"tool\"|\"arguments\"|\"use_tool\"|\"plan\"/.test(trimmed.slice(0, 300))) {
                  logConversation('warn', 'JSON de tool call truncado o malformado detectado', {
                    preview: trimmed.slice(0, 100),
                    isValid: false
                  });
                  return true; // Tratarlo como tool call para evitar guardarlo
                }
                return false;
              }
            }
            
            // Caso 2: JSON que comienza la respuesta (sin explicación antes)
            if (trimmed.startsWith('{') && /\"tool\"|\"arguments\"|\"use_tool\"|\"plan\"/.test(trimmed.slice(0, 300))) {
              return true;
            }
            
            return false;
          })();
          
          if (isJsonToolCall) {
            logConversation('warn', 'Respuesta del modelo es un tool call puro. Reemplazando con fallback.', {
              conversationId: conversationService.currentConversationId,
              tool: isJsonToolCall,
              preview: safeResponse.slice(0, 100)
            });
            
            // 🔍 CRÍTICO: Verificar si la última operación tuvo ERROR
            // Buscar el último mensaje tool para ver si tiene error
            const lastToolMessage = messages.slice().reverse().find(m => 
              m.role === 'tool' || m.role === 'system' && m.metadata?.isToolResult
            );
            
            const hadError = lastToolMessage?.metadata?.error === true;
            
            if (hadError) {
              // Si hubo error, NO decir "completado", avisar del error
              const errorText = lastToolMessage?.metadata?.toolResultText || lastToolMessage?.content || '';
              const errorPreview = errorText.slice(0, 150);
              safeResponse = `Hubo un problema al ejecutar la operación: ${errorPreview}`;
              logConversation('error', 'Tool tuvo error, usando mensaje de error en fallback', {
                error: errorPreview
              });
            } else {
              // Sin error, usar fallback descriptivo normal
              const last = lastToolResultRef.current;
              if (last && last.toolName) {
                logConversation('info', 'Usando fallback basado en toolName', {
                  toolName: last.toolName
                });
                
                if (last.toolName.includes('write') || last.toolName.includes('create')) {
                  safeResponse = 'He completado la operación de escritura/creación del archivo.';
                } else if (last.toolName.includes('read')) {
                  safeResponse = 'He leído el contenido del archivo.';
                } else if (last.toolName.includes('list')) {
                  safeResponse = 'He listado el contenido del directorio.';
                } else if (last.toolName.includes('edit') || last.toolName.includes('modify')) {
                  safeResponse = 'He realizado las modificaciones solicitadas.';
                } else if (last.toolName.includes('delete') || last.toolName.includes('remove')) {
                  safeResponse = 'He eliminado el archivo/directorio.';
                } else if (last.toolName.includes('move') || last.toolName.includes('rename')) {
                  safeResponse = 'He movido/renombrado el archivo.';
                } else if (last.toolName.includes('search') || last.toolName.includes('find')) {
                  safeResponse = 'He completado la búsqueda.';
                } else if (last.toolName.includes('run') || last.toolName.includes('execute')) {
                  safeResponse = 'He ejecutado el comando.';
                } else {
                  safeResponse = 'Operación completada correctamente.';
                }
              } else {
                // Sin información de tool reciente, usar fallback genérico
                logConversation('warn', 'No hay lastToolResult disponible, usando fallback genérico');
                safeResponse = 'Operación completada correctamente.';
              }
            }
          }
          
          // Guardar la respuesta
          {
            logConversation('debug', 'Guardando respuesta del asistente', {
              safePreview: safeResponse.substring(0, 80),
              length: safeResponse.length,
              conversationId: conversationService.currentConversationId
            });
            
              // ✅ GUARDAR REASONING en metadatos si existe
              const reasoning = reasoningByMessageIdRef.current.get(assistantMessageId) || null;
              const assistantMessageObj = conversationService.addMessage('assistant', safeResponse, {
                latency: data.latency,
                model: data.model,
                provider: data.provider,
                tokens: Math.ceil(safeResponse.length / 4),
                reasoning: reasoning || undefined, // Guardar reasoning si existe
                hasReasoning: !!reasoning
                // files: files.length > 0 ? files : undefined // DESHABILITADO: No generar archivos descargables
              });
              
              // Limpiar reasoning del ref después de guardar
              if (reasoning) {
                reasoningByMessageIdRef.current.delete(assistantMessageId);
              }
              
              
              // Calcular tokens reales de la respuesta
              const responseTokens = Math.ceil(safeResponse.length / 4);

              // 🔧 ELIMINADO EL FALLBACK MANUAL: El evento 'conversation-updated' automático
              // de conversationService.addMessage() ya sincroniza los mensajes correctamente.
              // Mantener el fallback causaba duplicación de mensajes en la UI.
              
              // El mensaje streaming se reemplazará automáticamente cuando el evento
              // 'conversation-updated' se dispare y sincronice los mensajes persistidos.
              
              // Tokens calculados internamente por el sistema de ventana deslizante
          }
          
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
        logConversation('info', 'Generación cancelada por el usuario', {
          conversationId: currentConversationId
        });
        setCurrentStatus({
          status: 'cancelled',
          message: 'Generación cancelada'
        });
        return; // No mostrar mensaje de error para cancelaciones
      }
      
      logConversation('error', 'Error enviando mensaje al modelo', {
        conversationId: currentConversationId,
        error: error?.message
      });
      
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
      return;
    }

    loggedToolMessageIdsRef.current = new Set();

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
      logConversation('warn', 'UI desincronizada detectada, limpiando mensajes locales');
      setMessages([]);
      setAttachedFiles([]);
    }

    if (!serviceHasMessages && !serviceHasFiles && !uiHasMessages && !inputHasText) {
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
    }

    loggedToolMessageIdsRef.current = new Set();

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
    
    loggedToolMessageIdsRef.current = new Set();
    
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
        try {
          aiService.setCurrentModel(conversation.modelId, conversation.modelType);
          setCurrentModel(conversation.modelId);
          setModelType(conversation.modelType);
        } catch (error) {
          logConversation('error', 'No se pudo seleccionar el modelo de la conversación', {
            conversationId,
            modelId: conversation.modelId,
            modelType: conversation.modelType,
            error: error?.message
          });
          setCurrentStatus({
            status: 'error',
            message: 'El modelo configurado ya no está disponible. Selecciona otro modelo e inténtalo de nuevo.'
          });
        }
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
      logConversation('info', 'Conversación cargada', {
        conversationId: conversation.id,
        messages: conversation.messages.length,
        summary: msgSummary
      });
      
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

  /**
   * ✅ NUEVO: Cambio de modelo con auto-descarga y loading visual
   * 1. Descarga modelo antiguo (si es local)
   * 2. Muestra modal de carga 3-5 segundos
   * 3. Carga modelo nuevo
   * 4. Muestra ✅
   */
  const handleModelChange = async (modelId, modelType) => {
    // Evitar cambios múltiples simultáneos
    if (isModelSwitching) return;
    
    setIsModelSwitching(true);
    setModelSwitchProgress(0);

    try {
      const oldModel = aiService.currentModel;
      const oldType = aiService.modelType;

      // ========== PASO 1: NO descargar modelo antiguo ==========
      // ⚠️ NUNCA usar /api/delete - borra archivos permanentemente
      // Ollama descargará automáticamente el modelo anterior cuando sea necesario
      if (oldType === 'local' && oldModel && oldModel !== modelId) {
        setModelSwitchProgress(15);
      }

      // ========== PASO 2: Cambiar modelo y guardar ==========
      setModelSwitchProgress(35);
      
    aiService.setCurrentModel(modelId, modelType);
    setCurrentModel(modelId);
    setModelType(modelType);
    
      // Actualizar en la conversación
    const currentConversation = conversationService.getCurrentConversation();
    if (currentConversation) {
      currentConversation.modelId = modelId;
      currentConversation.modelType = modelType;
      currentConversation.updatedAt = Date.now();
      conversationService.saveConversations();
      }

      // ========== PASO 3: Cargar modelo nuevo en memoria ==========
      setModelSwitchProgress(50);

      // Si es modelo local, cargarlo en memoria usando ModelMemoryService
      if (modelType === 'local') {
        try {
          const loaded = await aiService.memoryService.loadModelToMemory(modelId);
          if (loaded) {
            setModelSwitchProgress(90);
          } else {
            console.warn(`[AIChatPanel] ⚠️ Modelo ${modelId} cargará automáticamente`);
            setModelSwitchProgress(75);
          }
        } catch (error) {
          console.warn(`[AIChatPanel] ⚠️ Error cargando ${modelId}: ${error.message}`);
          setModelSwitchProgress(75);
        }
      }

      // Pequeño delay para que se vea el 100%
      return new Promise((resolve) => {
        setTimeout(() => {
          setModelSwitchProgress(100);
          
          setTimeout(() => {
            setIsModelSwitching(false);
            setModelSwitchProgress(0);

            // Disparar evento para actualizar UI
      window.dispatchEvent(new CustomEvent('conversation-updated', {
        detail: {
                conversationId: currentConversation?.id,
                type: 'model-changed',
                newModel: modelId
        }
      }));

            resolve();
          }, 300);
        }, 500);
      });

    } catch (error) {
      console.error('[AIChatPanel] ❌ Error en cambio de modelo:', error);
      setIsModelSwitching(false);
      setModelSwitchProgress(0);
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
      debugLogger.debug('AIChatPanel.MCP', 'MCPs seleccionados actualizados', updated);
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
      debugLogger.debug('AIChatPanel.MCP', 'Todos los MCPs seleccionados', allIds);
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
      debugLogger.debug('AIChatPanel.MCP', 'MCPs desactivados actualizados', updated);
      return updated;
    });
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };


  // Función para copiar código al portapapeles
  const copyCode = useCallback((codeId) => {
    const codeElement = document.getElementById(codeId);
    if (!codeElement) {
      debugLogger.warn('AIChatPanel.Copy', 'No se encontró el elemento de código', { codeId });
      return;
    }

    const button = document.querySelector(`[data-code-id="${codeId}"]`);
    if (!button) {
      debugLogger.debug('AIChatPanel.Copy', 'Botón de copiado no encontrado', { codeId });
      return;
    }

    const originalText = button.innerHTML;
    const codeText = codeElement.textContent || codeElement.innerText;

    const restore = (text = originalText) => {
      button.innerHTML = text;
      button.style.background = '';
      button.style.borderColor = '';
    };

    const showSuccess = () => {
      button.innerHTML = '<i class="pi pi-check"></i> Copiado';
      button.style.background = 'rgba(100, 200, 100, 0.2)';
      button.style.borderColor = 'rgba(100, 200, 100, 0.4)';
      setTimeout(() => restore(), 2000);
    };

    const showError = () => {
      button.innerHTML = '<i class="pi pi-times"></i> Error';
      button.style.background = 'rgba(220, 53, 69, 0.2)';
      button.style.borderColor = 'rgba(220, 53, 69, 0.4)';
      setTimeout(() => restore(), 2000);
    };

    button.innerHTML = '<i class="pi pi-spin pi-spinner"></i> Copiando...';
    button.style.background = 'rgba(255, 193, 7, 0.2)';
    button.style.borderColor = 'rgba(255, 193, 7, 0.4)';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(codeText)
        .then(showSuccess)
        .catch(err => {
          debugLogger.warn('AIChatPanel.Copy', 'Clipboard API error, usando fallback', { codeId, error: err?.message });
          fallbackCopy(codeText, button, originalText, showSuccess, showError);
        });
    } else {
      fallbackCopy(codeText, button, originalText, showSuccess, showError);
    }
  }, []);

  // Función de respaldo para copiar
  const fallbackCopy = (text, button, originalText, onSuccess, onError) => {
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
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error('execCommand failed');
      }
    } catch (err) {
      debugLogger.error('AIChatPanel.Copy', 'Fallback copy failed', { error: err?.message });
      if (onError) {
        onError();
      } else {
        button.innerHTML = '<i class="pi pi-times"></i> Error';
        button.style.background = 'rgba(220, 53, 69, 0.2)';
        button.style.borderColor = 'rgba(220, 53, 69, 0.4)';
        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.background = '';
          button.style.borderColor = '';
        }, 2000);
      }
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
  const enforceLinkTargets = (html) => {
    if (!html) return '';

    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      const anchors = tempDiv.querySelectorAll('a');
      anchors.forEach((anchor) => {
        anchor.setAttribute('target', '_blank');

        const relAttr = anchor.getAttribute('rel') || '';
        const relValues = relAttr.split(/\s+/).filter(Boolean);

        if (!relValues.includes('noopener')) {
          relValues.push('noopener');
        }
        if (!relValues.includes('noreferrer')) {
          relValues.push('noreferrer');
        }

        anchor.setAttribute('rel', relValues.join(' '));
      });

      return tempDiv.innerHTML;
    } catch (error) {
      debugLogger.warn('AIChatPanel.Markdown', 'No se pudieron ajustar los enlaces del markdown', {
        error: error?.message
      });
      return html;
    }
  };

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
      
      return enforceLinkTargets(cleanHtml);
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
          debugLogger.warn('AIChatPanel.Markdown', 'Error al aplicar highlight en bloque de código', {
            error: error?.message
          });
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

  // 🎨 Componente para Tool Execution Card (Estilo ChatGPT/Claude)
  const ToolExecutionCard = ({ messageId, toolName, toolArgs, toolResult, isError = false, initialExpanded = false, messageMetadata = null }) => {
    // Leer estado persistente del ref al inicializar
    const wasExpanded = expandedToolCardsRef.current.has(messageId);
    const [expanded, setExpanded] = useState(wasExpanded || initialExpanded);
    
    // 🔐 Estado para revelar contraseñas
    const [revealedPasswords, setRevealedPasswords] = useState({});
    
    // Sincronizar estado inicial con el ref cuando cambia el messageId (re-render)
    useEffect(() => {
      const isInRef = expandedToolCardsRef.current.has(messageId);
      if (isInRef) {
        // Si está en el ref, asegurar que el estado esté expandido
        setExpanded(prev => prev ? prev : true);
      }
      // No colapsar automáticamente si no está en el ref - respetar el estado actual
      // Esto evita que las tarjetas se colapsen cuando se re-renderiza el componente
    }, [messageId]); // Solo cuando cambia el messageId (nuevo mensaje o re-render)
    
    // Toggle para revelar/ocultar contraseña
    const togglePasswordReveal = (passwordId) => {
      setRevealedPasswords(prev => ({
        ...prev,
        [passwordId]: !prev[passwordId]
      }));
    };
    
    // Sincronizar el ref cuando el usuario cambia el estado manualmente
    const handleToggle = () => {
      const newExpanded = !expanded;
      setExpanded(newExpanded);
      if (newExpanded) {
        expandedToolCardsRef.current.add(messageId);
      } else {
        expandedToolCardsRef.current.delete(messageId);
      }
    };

    // Determinar icono por tipo de herramienta
    const getToolIcon = () => {
      if (toolName.includes('filesystem') || toolName.includes('file') || toolName.includes('directory')) {
        return '📁';
      } else if (toolName.includes('web') || toolName.includes('search') || toolName.includes('http')) {
        return '🌐';
      } else if (toolName.includes('cli') || toolName.includes('command') || toolName.includes('run')) {
        return '🖥️';
      }
      return '🔧';
    };

    // Limpiar nombre de herramienta (remover prefijo server__)
    const cleanToolName = toolName.includes('__') ? toolName.split('__')[1] : toolName;

    // Formatear argumentos para mostrar
    const formatArgs = () => {
      if (!toolArgs || Object.keys(toolArgs).length === 0) return null;
      
      return Object.entries(toolArgs).map(([key, value]) => {
        // Truncar valores largos
        let displayValue = String(value);
        if (displayValue.length > 100) {
          displayValue = displayValue.slice(0, 100) + '...';
        }
        
        return (
          <div key={key} className="tool-card-param">
            <span className="tool-card-param-label">{key}:</span>
            <span className="tool-card-param-value">{displayValue}</span>
          </div>
        );
      });
    };
    
    // 🔐 Renderizar resultado con soporte para revelar contraseñas
    const renderPasswordCard = (item) => {
      const passwordReal = item?._passwordRealBackendOnly;
      const isRevealed = revealedPasswords[item.id];
      const displayPassword = isRevealed ? passwordReal : item.password;
      
      const isSSH = item.type === 'ssh';
      const icon = isSSH ? '🔗' : '📋';
      const typeLabel = isSSH ? 'Conexión SSH' : 'Contraseña';
      
      return (
        <div key={item.id} style={{ fontSize: '0.85rem', marginBottom: '0.6rem', padding: '0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
          <div style={{ lineHeight: '1.6' }}>
            <div><strong>{icon} {item.title || item.name || typeLabel}</strong></div>
            {isSSH && (
              <div style={{ marginTop: '0.4rem', color: 'rgba(100, 150, 255, 0.9)' }}>
                <strong>Host:</strong> {item.host}:{item.port}
              </div>
            )}
            <div style={{ marginTop: '0.4rem', color: 'rgba(255,255,255,0.8)' }}>
              <strong>Usuario:</strong> {item.username}
            </div>
            {passwordReal && (
              <div style={{ marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong>Contraseña:</strong>
                <code style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: '0.2rem 0.5rem',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                  letterSpacing: isRevealed ? '0' : '0.15em'
                }}>
                  {displayPassword}
                </code>
                <button 
                  onClick={() => togglePasswordReveal(item.id)}
                  style={{
                    background: 'rgba(76, 175, 80, 0.3)',
                    border: '1px solid rgba(76, 175, 80, 0.6)',
                    color: '#fff',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <i className={`pi ${isRevealed ? 'pi-eye-slash' : 'pi-eye'}`} />
                  {isRevealed ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            )}
            {item.url && item.url !== '(sin URL)' && (
              <div style={{ marginTop: '0.3rem', color: 'rgba(100, 150, 255, 0.9)', fontSize: '0.8rem' }}>
                <strong>URL:</strong> {item.url}
              </div>
            )}
          </div>
        </div>
      );
    };
    
    const renderedResult = React.useMemo(() => {
      if (!toolResult) return null;
      
      // 🔍 PRIMERO: Detectar si es texto con [DIR] / [FILE] (list_directory)
      if (typeof toolResult === 'string' && (toolResult.includes('[DIR]') || toolResult.includes('[FILE]'))) {
        try {
          const htmlContent = renderMarkdown(toolResult);
          return (
            <div 
              className="ai-md"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              style={{ fontSize: '0.85rem' }}
            />
          );
        } catch (err) {
          console.error('❌ [renderResult] Error renderizando list_directory:', err.message);
          // Fallback: mostrar como texto plano
          return <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{toolResult}</div>;
        }
      }
      return undefined; // Continuar con la lógica normal
    }, [toolResult]);

    const renderResult = () => {
      if (!toolResult) return null;
      
      // Si ya fue procesado como list_directory, devolverlo
      if (renderedResult) return renderedResult;
      
      // 🔧 CRÍTICO: Detectar si es search_nodeterm por el nombre de la herramienta
      const isSearchNodeterm = cleanToolName === 'search_nodeterm' || 
                                cleanToolName.includes('search_nodeterm') ||
                                (messageMetadata?.toolName && (
                                  messageMetadata.toolName === 'search_nodeterm' || 
                                  messageMetadata.toolName.includes('search_nodeterm')
                                ));
      
      // ✅ PASO 0: Si es search_nodeterm, SIEMPRE intentar usar originalToolResult primero (evita parsing)
      if (isSearchNodeterm && messageMetadata?.originalToolResult) {
        const originalResult = messageMetadata.originalToolResult;
        if (originalResult && typeof originalResult === 'object' && 
            (originalResult.ssh_results || originalResult.password_results || originalResult.message)) {
          const sshResults = originalResult.ssh_results || [];
          const passwordResults = originalResult.password_results || [];
          
          return (
            <div style={{ fontSize: '0.85rem' }}>
              {sshResults.length > 0 && (
                <div style={{ marginBottom: passwordResults.length > 0 ? '0.8rem' : '0' }}>
                  {sshResults.map((item, idx) => (
                    <div key={item.id || idx}>
                      {renderPasswordCard(item)}
                    </div>
                  ))}
                </div>
              )}
              
              {passwordResults.length > 0 && (
                <div>
                  {passwordResults.map((item, idx) => (
                    <div key={item.id || idx}>
                      {renderPasswordCard(item)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }
      }
      
      try {
        // 🔧 PASO 1: Limpiar markdown code blocks (```json ... ```)
        let jsonStr = toolResult;
        const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }
        jsonStr = jsonStr.trim();
        
        // PASO 2: Parsear JSON
        const parsed = JSON.parse(jsonStr);
        
        // 🔧 CRÍTICO: Si es search_nodeterm O tiene estructura de search_nodeterm, SIEMPRE renderizar con formato bonito
        const hasSearchNodetermStructure = parsed && typeof parsed === 'object' && 
            (parsed.ssh_results || parsed.password_results || parsed.message);
        
        if ((isSearchNodeterm || hasSearchNodetermStructure) && hasSearchNodetermStructure) {
          const sshResults = parsed.ssh_results || [];
          const passwordResults = parsed.password_results || [];
          
          return (
            <div style={{ fontSize: '0.85rem' }}>
              {sshResults.length > 0 && (
                <div style={{ marginBottom: passwordResults.length > 0 ? '0.8rem' : '0' }}>
                  {sshResults.map((item, idx) => (
                    <div key={item.id || idx}>
                      {renderPasswordCard(item)}
                    </div>
                  ))}
                </div>
              )}
              
              {passwordResults.length > 0 && (
                <div>
                  {passwordResults.map((item, idx) => (
                    <div key={item.id || idx}>
                      {renderPasswordCard(item)}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Mostrar mensaje solo si no hay resultados */}
              {sshResults.length === 0 && passwordResults.length === 0 && parsed.message && (
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'rgba(100, 150, 255, 0.1)', 
                  border: '1px solid rgba(100, 150, 255, 0.3)',
                  borderRadius: '4px',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}>
                  {parsed.message}
                </div>
              )}
            </div>
          );
        }
        
        // Si es un objeto individual con password oculta
        const passwordReal = parsed?.passwordReal || parsed?._passwordRealBackendOnly;
        if (parsed && typeof parsed === 'object' && (passwordReal || (parsed.password && parsed.password.includes('•')))) {
          return renderPasswordCard(parsed);
        }
        
        // JSON normal para otros casos
        return (
          <pre style={{ 
            fontSize: '0.8rem', 
            overflow: 'auto',
            background: 'rgba(0,0,0,0.3)',
            padding: '0.8rem',
            borderRadius: '4px',
            maxHeight: '400px',
            border: '1px solid rgba(100, 150, 255, 0.3)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch (e) {
        // No es JSON, devolver como texto
        return <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{String(toolResult)}</div>;
      }
    };

    // 🖥️ Función para abrir terminal y ejecutar comando
    const handleOpenInTerminal = () => {
      const command = toolArgs?.command;
      const workingDir = toolArgs?.workingDir;
      const hostId = toolArgs?.hostId;
      
      console.log('🖥️ handleOpenInTerminal (botón) called:', { cleanToolName, command, hostId });
      
      if ((cleanToolName === 'execute_local' || cleanToolName === 'execute_ssh') && command) {
        const commandData = {
          command,
          workingDir,
          hostId,
          toolType: cleanToolName
        };
        
        // Llamar callback directamente si existe
        if (typeof onExecuteCommandInTerminal === 'function') {
          onExecuteCommandInTerminal(commandData);
        } else {
          // Fallback a evento de window
          window.dispatchEvent(new CustomEvent('ai-chat-execute-command-in-terminal', {
            detail: commandData
          }));
        }
      }
    };
    
    // Determinar si mostrar el botón de terminal
    const showTerminalButton = (cleanToolName === 'execute_local' || cleanToolName === 'execute_ssh') && toolArgs?.command;

    return (
      <div className="tool-execution-card">
        <div className="tool-card-header" onClick={handleToggle}>
          <span className="tool-card-icon">{getToolIcon()}</span>
          <div className="tool-card-info">
            <div className="tool-card-name">
              {cleanToolName}
            </div>
            <div className="tool-card-status">
              {isError ? (
                <>
                  <i className="pi pi-times-circle" style={{ color: '#f44336' }} />
                  <span>Error</span>
                </>
              ) : (
                <>
                  <i className="pi pi-check-circle" style={{ color: '#4caf50' }} />
                  <span>Completado</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {showTerminalButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenInTerminal();
                }}
                style={{
                  background: 'rgba(76, 175, 80, 0.2)',
                  border: '1px solid rgba(76, 175, 80, 0.5)',
                  color: '#4caf50',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(76, 175, 80, 0.3)';
                  e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.5)';
                }}
                title="Abrir en terminal interactiva"
              >
                <i className="pi pi-external-link" />
                <span>▶️ Terminal</span>
              </button>
            )}
            <span className={`tool-card-toggle ${expanded ? 'expanded' : ''}`}>
              ▼
            </span>
          </div>
        </div>
        
        <div className={`tool-card-content ${expanded ? 'expanded' : ''}`}>
          <div className="tool-card-body">
            {formatArgs()}
            
            {toolResult && (
              <div className={`tool-card-result ${isError ? 'error' : ''}`}>
                <strong>{isError ? 'Error:' : 'Resultado:'}</strong>
                <div className="tool-result-content">
                  {renderResult()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 🧠 Componente compacto para mostrar Reasoning (icono desplegable al lado)
  const ReasoningIcon = ({ messageId, reasoning, showIconOnly = false, showPanelOnly = false }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    // Leer del estado compartido directamente
    const isExpanded = expandedReasoningIds.has(messageId);
    
    const handleToggle = (e) => {
      if (e) e.stopPropagation();
      const newExpanded = !isExpanded;
      
      // Actualizar estado compartido (esto fuerza re-render automático)
      setExpandedReasoningIds(prev => {
        const newSet = new Set(prev);
        if (newExpanded) {
          newSet.add(messageId);
        } else {
          newSet.delete(messageId);
        }
        return newSet;
      });
    };
    
    if (!reasoning || !reasoning.trim()) return null;
    
    const tokenCount = Math.ceil(reasoning.length / 4);
    
    // Solo mostrar el icono (dentro de la burbuja)
    if (showIconOnly) {
      return (
        <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
          <button
            onClick={handleToggle}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              border: '1px solid rgba(100, 150, 255, 0.3)',
              background: isExpanded 
                ? 'rgba(100, 150, 255, 0.15)' 
                : 'rgba(100, 150, 255, 0.08)',
              color: '#64b5f6',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              padding: 0
            }}
            title={`Razonamiento (${tokenCount} tokens)`}
          >
            <FaBrain style={{ fontSize: '0.75rem' }} />
          </button>
          
          {/* Tooltip compacto */}
          {showTooltip && !isExpanded && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '0.4rem',
                padding: '0.3rem 0.5rem',
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#fff',
                borderRadius: '4px',
                fontSize: '0.7rem',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                pointerEvents: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              Ver razonamiento
            </div>
          )}
        </div>
      );
    }
    
    // Solo mostrar el panel expandible (arriba de la burbuja)
    if (showPanelOnly) {
      if (!isExpanded) return null;
      
      return (
        <div
          style={{
            marginBottom: '0.5rem',
            width: '100%',
            background: 'rgba(100, 150, 255, 0.06)',
            border: '1px solid rgba(100, 150, 255, 0.2)',
            borderRadius: '8px',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <div
            onClick={handleToggle}
            style={{
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              background: 'rgba(100, 150, 255, 0.08)',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(100, 150, 255, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(100, 150, 255, 0.08)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaBrain style={{ color: '#64b5f6', fontSize: '0.85rem' }} />
              <span style={{ fontWeight: '500', color: themeColors.textPrimary, fontSize: '0.8rem' }}>
                Razonamiento
              </span>
              <span style={{ fontSize: '0.65rem', color: themeColors.textSecondary }}>
                {tokenCount} tokens
              </span>
            </div>
            <i 
              className="pi pi-chevron-up" 
              style={{ 
                fontSize: '0.7rem', 
                color: themeColors.textSecondary
              }} 
            />
          </div>
          
          <div
            style={{
              padding: '0.75rem',
              borderTop: '1px solid rgba(100, 150, 255, 0.1)',
              maxHeight: '250px',
              overflowY: 'auto'
            }}
          >
            <div
              className="ai-md"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(reasoning)
              }}
              style={{
                fontSize: '0.75rem',
                lineHeight: '1.5',
                color: themeColors.textPrimary,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                opacity: 0.9
              }}
            />
          </div>
        </div>
      );
    }
    
    // Modo completo (icono + panel)
    return (
      <>
        {/* Panel desplegable que aparece arriba */}
        {isExpanded && (
          <div
            style={{
              marginBottom: '0.5rem',
              width: '100%',
              background: 'rgba(100, 150, 255, 0.06)',
              border: '1px solid rgba(100, 150, 255, 0.2)',
              borderRadius: '8px',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div
              onClick={handleToggle}
              style={{
                padding: '0.5rem 0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                background: 'rgba(100, 150, 255, 0.08)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(100, 150, 255, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(100, 150, 255, 0.08)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaBrain style={{ color: '#64b5f6', fontSize: '0.85rem' }} />
                <span style={{ fontWeight: '500', color: themeColors.textPrimary, fontSize: '0.8rem' }}>
                  Razonamiento
                </span>
                <span style={{ fontSize: '0.65rem', color: themeColors.textSecondary }}>
                  {tokenCount} tokens
                </span>
              </div>
              <i 
                className="pi pi-chevron-up" 
                style={{ 
                  fontSize: '0.7rem', 
                  color: themeColors.textSecondary
                }} 
              />
            </div>
            
            <div
              style={{
                padding: '0.75rem',
                borderTop: '1px solid rgba(100, 150, 255, 0.1)',
                maxHeight: '250px',
                overflowY: 'auto'
              }}
            >
              <div
                className="ai-md"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(reasoning)
                }}
                style={{
                  fontSize: '0.75rem',
                  lineHeight: '1.5',
                  color: themeColors.textPrimary,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  opacity: 0.9
                }}
              />
            </div>
          </div>
        )}
      </>
    );
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const isStreaming = message.streaming;
    const hasContent = message.content && message.content.trim().length > 0;
    const isToolResult = !!(message.metadata && message.metadata.isToolResult);
    const isToolCall = message.role === 'assistant_tool_call' || !!(message.metadata && message.metadata.isToolCall);

    // ✅ FILTRAR JSON de tool calls SIEMPRE (no solo cuando orchestrator está activo)
    if (!isToolCall && !isToolResult && message.role === 'assistant') {
      const trimmed = message.content?.trim() || '';
      
      // Si el mensaje comienza con { y parece JSON de tool call, NO renderizarlo
      if (trimmed.startsWith('{') && /\"tool\"|\"arguments\"|\"use_tool\"/.test(trimmed.slice(0, 200))) {
        debugLogger.warn('AIChatPanel.Render', 'Omitiendo JSON de tool call', {
          messageId: message.id,
          preview: trimmed.slice(0, 80)
        });
        return null;
      }
      
      // Si el mensaje tiene texto + JSON trailing, extraer solo el texto
      const jsonStart = trimmed.indexOf('\n{');
      if (jsonStart > 50 && /\"tool\"|\"arguments\"/.test(trimmed.slice(jsonStart, jsonStart + 200))) {
        // Hay texto antes del JSON - renderizar solo el texto
        message.content = trimmed.slice(0, jsonStart).trim();
        debugLogger.info('AIChatPanel.Render', 'Extraído texto, removido JSON trailing', {
          original: trimmed.length,
          limpio: message.content.length
        });
      }
    }

    // No renderizar el placeholder si está en streaming y aún no hay contenido
    if (isStreaming && !hasContent) {
      return null;
    }

    // Render especial para tool-call (card compacta) - OCULTO, se muestra solo en el result
    if (isToolCall) {
      // NO renderizar tool call separado, se mostrará integrado con el resultado
      return null;
    }

    // 🎨 Render NUEVO: Tool Execution Card (Estilo ChatGPT/Claude)
    // ✅ DETECCIÓN ROBUSTA: Verificar múltiples condiciones para asegurar que se detecte correctamente
    const isToolMessage = isToolResult || 
                         message.role === 'tool' || 
                         (message.metadata?.toolName && message.metadata?.toolResultText) ||
                         (message.content && message.content.includes('✔️') && message.metadata?.toolName);
    
    if (isToolMessage) {
      const text = (message.metadata?.toolResultText || message.content || '').trim();
      const toolName = message.metadata?.toolName || 
                      (message.content?.match(/✔️\s*(\w+)/)?.[1]) || 
                      'tool';
      const toolArgs = message.metadata?.toolArgs || {};
      const isError = message.metadata?.error === true;

      // 🔍 Detectar si es código generado y mostrarlo ANTES de la tarjeta
      let codeToShow = null;
      let detectedLanguage = null;
      
      if ((toolName.includes('write') || toolName.includes('edit') || toolName.includes('create')) && toolArgs.path && toolArgs.content) {
        // Detectar lenguaje por extensión de archivo
        const path = toolArgs.path;
        const ext = path.split('.').pop()?.toLowerCase();
        
        const langMap = {
          'js': 'javascript',
          'jsx': 'javascript',
          'ts': 'typescript',
          'tsx': 'typescript',
          'py': 'python',
          'go': 'go',
          'rs': 'rust',
          'java': 'java',
          'c': 'c',
          'cpp': 'cpp',
          'cs': 'csharp',
          'php': 'php',
          'rb': 'ruby',
          'swift': 'swift',
          'kt': 'kotlin',
          'scala': 'scala',
          'sh': 'bash',
          'bash': 'bash',
          'zsh': 'bash',
          'ps1': 'powershell',
          'sql': 'sql',
          'html': 'html',
          'css': 'css',
          'scss': 'scss',
          'json': 'json',
          'xml': 'xml',
          'yaml': 'yaml',
          'yml': 'yaml',
          'md': 'markdown',
          'r': 'r',
          'lua': 'lua',
          'vim': 'vim',
          'dart': 'dart',
          'ex': 'elixir',
          'exs': 'elixir',
          'erl': 'erlang',
          'clj': 'clojure',
          'fs': 'fsharp',
          'hs': 'haskell'
        };
        
        if (ext && langMap[ext]) {
          detectedLanguage = langMap[ext];
          codeToShow = toolArgs.content;
        }
      }

      return (
        <div key={message.id || `msg-${index}-${message.timestamp}`} style={{ marginBottom: '0.8rem', width: '100%' }}>
          {/* 🎨 Mostrar CÓDIGO primero si fue generado (estilo ChatGPT limpio) */}
          {codeToShow && (
            <div style={{ marginBottom: '0.8rem', width: '100%' }}>
              <div 
                className="ai-md"
                dangerouslySetInnerHTML={{ 
                  __html: renderMarkdown(`\`\`\`${detectedLanguage}\n${codeToShow}\n\`\`\``)
                }}
                ref={(el) => {
                  if (el) {
                    highlightCodeBlocks(el);
                  }
                }}
              />
            </div>
          )}
          
          {/* 🎨 Tarjeta de Tool Execution (colapsada si ya se mostró código) */}
          <ToolExecutionCard
            messageId={message.id || `msg-${index}-${message.timestamp}`}
            toolName={toolName}
            toolArgs={toolArgs}
            toolResult={text}
            isError={isError}
            initialExpanded={codeToShow ? false : false}
            messageMetadata={message.metadata}
          />
        </div>
      );
    }

    // ✨ Renderizado normal de mensajes (usuario/asistente/system)

    return (
      <div
        key={message.id || `msg-${index}-${message.timestamp}`}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: '1.5rem',
          width: '100%',
          maxWidth: '900px',
          marginLeft: 'auto',
          marginRight: 'auto',
          gap: '0.75rem',
          animation: 'slideIn 0.3s ease-out'
        }}
      >
        {/* Avatar/Icono */}
        {!isUser && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${themeColors.primaryColor}dd 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              border: `2px solid ${themeColors.primaryColor}40`
            }}
          >
            <i className="pi pi-sparkles" style={{ color: 'white', fontSize: '1rem' }} />
          </div>
        )}
        
        {/* Contenedor de mensaje */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: isUser ? 'flex-end' : 'flex-start',
          flex: 1,
          minWidth: 0
        }}>
          {/* ✅ MOSTRAR PANEL DE REASONING ARRIBA (si está expandido) */}
          {!isUser && !isSystem && message.metadata?.hasReasoning && message.metadata?.reasoning && expandedReasoningIds.has(message.id || `msg-${index}`) && (
            <ReasoningIcon 
              messageId={message.id || `msg-${index}`}
              reasoning={message.metadata.reasoning}
              showPanelOnly={true}
            />
          )}
          
          {/* Burbuja de mensaje con contenido */}
          <div
            className={`ai-bubble ${isUser ? 'user' : isSystem ? 'system' : 'assistant'} ${isStreaming ? 'streaming' : ''} ${message.subtle ? 'subtle' : ''}`}
            style={{
              width: isUser ? 'auto' : '100%',
              maxWidth: isUser ? '75%' : '100%',
              background: isToolResult
                ? 'transparent'
                : message.subtle 
                  ? 'rgba(255, 255, 255, 0.02)'
                  : isSystem
                    ? 'rgba(255, 107, 53, 0.1)'
                    : isUser
                      ? `linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(59, 130, 246, 0.8) 100%)`
                      : `rgba(255, 255, 255, 0.05)`,
              color: message.subtle 
                ? 'rgba(255, 255, 255, 0.6)'
                : themeColors.textPrimary,
              border: isToolResult
                ? 'none'
                : message.subtle 
                  ? '1px solid rgba(255, 255, 255, 0.05)'
                  : isUser
                    ? '1px solid rgba(59, 130, 246, 0.3)'
                    : `1px solid rgba(255, 255, 255, 0.12)`,
              borderRadius: message.subtle ? '6px' : '12px',
              padding: isToolResult ? '0 0 0.2rem 0' : (message.subtle ? '0.3rem 0.5rem' : '1rem 1.2rem'),
              fontSize: message.subtle ? '0.8rem' : undefined,
              fontStyle: isToolResult ? 'normal' : (message.subtle ? 'italic' : undefined),
              opacity: message.subtle ? '0.8' : '1',
              boxShadow: message.subtle ? 'none' : (isUser ? '0 2px 8px rgba(59, 130, 246, 0.15)' : '0 2px 8px rgba(0,0,0,0.1)'),
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              position: 'relative'
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
            style={{ flex: 1, minWidth: 0 }}
          />
          
          {/* ✅ Icono de reasoning compacto al lado de la respuesta (solo el botón) */}
          {!isUser && !isSystem && message.metadata?.hasReasoning && message.metadata?.reasoning && (
            <ReasoningIcon 
              messageId={message.id || `msg-${index}`}
              reasoning={message.metadata.reasoning}
              showIconOnly={true}
            />
          )}
          
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
                marginTop: '0.4rem',
                opacity: 0.7,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                paddingLeft: isUser ? '0' : '0',
                paddingRight: isUser ? '0' : '0'
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
                    {message.metadata.latency && message.metadata.latency > 0 && (
                      <>
                        <span>•</span>
                        <span>{(message.metadata.tokens / (message.metadata.latency / 1000)).toFixed(2)} tokens/s</span>
                      </>
                    )}
                  </>
                )}
              </>
            )}
            </div>
          )}

          {/* Archivos del mensaje específico - DESHABILITADO */}
          {/* {!isStreaming && message.metadata && message.metadata.files && message.metadata.files.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              {renderFileDownloads(message.metadata.files, message.content)}
            </div>
          )} */}
        </div>

        {/* Avatar de usuario (a la derecha) */}
        {isUser && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0.6) 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(59, 130, 246, 0.2)',
              border: '2px solid rgba(59, 130, 246, 0.3)'
            }}
          >
            <i className="pi pi-user" style={{ color: 'white', fontSize: '1rem' }} />
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


          /* Scrollbar personalizado SOLO para el área principal de mensajes */
          .ai-scrollbar::-webkit-scrollbar {
            width: 6px !important;
            height: 6px !important;
          }

          .ai-scrollbar::-webkit-scrollbar-track {
            background: ${themeColors.background} !important;
            border-radius: 3px !important;
          }

          .ai-scrollbar::-webkit-scrollbar-thumb {
            background: ${themeColors.borderColor} !important;
            border-radius: 3px !important;
            opacity: 0.6 !important;
          }

          .ai-scrollbar::-webkit-scrollbar-thumb:hover {
            background: ${themeColors.textSecondary} !important;
            opacity: 0.8 !important;
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
        id="ai-chat-panel"
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
            padding: '1rem 1.5rem',
            background: `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`,
            backdropFilter: 'blur(8px)',
            borderBottom: `2px solid ${themeColors.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '56px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Icono de IA más pequeño */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(59, 130, 246, 0.8) 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 2px 8px rgba(59, 130, 246, 0.3)`,
                border: `1px solid rgba(59, 130, 246, 0.3)`
              }}
            >
              <i className="pi pi-comments" style={{ color: 'white', fontSize: '1.1rem' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, color: themeColors.textPrimary, fontSize: '1rem', fontWeight: '600', lineHeight: '1.2' }}>
                {conversationTitle || 'Chat de IA'}
              </h2>
              
              {/* Selector de modelo personalizado (estilo Open WebUI) */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  disabled={isLoading || functionalModels.length === 0 || isModelSwitching}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    color: themeColors.textPrimary,
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    cursor: (isLoading || functionalModels.length === 0 || isModelSwitching) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isModelSwitching ? 0.6 : 1,
                    minWidth: '160px',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading && functionalModels.length > 0 && !isModelSwitching) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <i className="pi pi-circle" style={{ fontSize: '0.5rem', color: 'rgba(59, 130, 246, 0.8)' }} />
                    {currentModel || 'Selecciona modelo'}
                  </span>
                  <i className={`pi pi-chevron-${showModelSelector ? 'up' : 'down'}`} style={{ fontSize: '0.7rem', opacity: 0.7 }} />
                </button>

                {/* Panel desplegable del selector */}
                {showModelSelector && (
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9998,
                        background: 'transparent'
                      }}
                      onClick={() => setShowModelSelector(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 0.5rem)',
                        left: 0,
                        width: '320px',
                        background: themeColors.cardBackground,
                        border: `1px solid ${themeColors.borderColor}`,
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                        overflow: 'hidden',
                        animation: 'slideUp 0.2s ease-out'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header del panel */}
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: `1px solid ${themeColors.borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: themeColors.textPrimary
                        }}>
                          {currentModel || 'Selecciona modelo'}
                        </span>
                        <button
                          onClick={() => setShowModelSelector(false)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: themeColors.textSecondary,
                            cursor: 'pointer',
                            padding: '0.25rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.color = themeColors.textPrimary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                            e.currentTarget.style.color = themeColors.textSecondary;
                          }}
                        >
                          <i className="pi pi-times" style={{ fontSize: '0.8rem' }} />
                        </button>
                      </div>

                      {/* Barra de búsqueda */}
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: `1px solid ${themeColors.borderColor}`
                      }}>
                        <div style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <i className="pi pi-search" style={{
                            position: 'absolute',
                            left: '0.75rem',
                            color: themeColors.textSecondary,
                            fontSize: '0.85rem'
                          }} />
                          <input
                            type="text"
                            placeholder="Buscar un Modelo"
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                              background: 'rgba(255,255,255,0.05)',
                              border: `1px solid ${themeColors.borderColor}`,
                              borderRadius: '8px',
                              color: themeColors.textPrimary,
                              fontSize: '0.85rem',
                              outline: 'none',
                              transition: 'all 0.2s ease'
                            }}
                            onFocus={(e) => {
                              e.target.style.background = 'rgba(255,255,255,0.08)';
                              e.target.style.borderColor = themeColors.primaryColor;
                            }}
                            onBlur={(e) => {
                              e.target.style.background = 'rgba(255,255,255,0.05)';
                              e.target.style.borderColor = themeColors.borderColor;
                            }}
                          />
                        </div>
                      </div>

                      {/* Tabs */}
                      <div style={{
                        display: 'flex',
                        borderBottom: `1px solid ${themeColors.borderColor}`
                      }}>
                        <button
                          onClick={() => setModelSelectorTab('all')}
                          style={{
                            flex: 1,
                            padding: '0.65rem 1rem',
                            background: modelSelectorTab === 'all' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                            border: 'none',
                            borderBottom: modelSelectorTab === 'all' ? `2px solid ${themeColors.primaryColor}` : '2px solid transparent',
                            color: modelSelectorTab === 'all' ? themeColors.textPrimary : themeColors.textSecondary,
                            fontSize: '0.85rem',
                            fontWeight: modelSelectorTab === 'all' ? '600' : '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Todos
                        </button>
                        <button
                          onClick={() => setModelSelectorTab('local')}
                          style={{
                            flex: 1,
                            padding: '0.65rem 1rem',
                            background: modelSelectorTab === 'local' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                            border: 'none',
                            borderBottom: modelSelectorTab === 'local' ? `2px solid ${themeColors.primaryColor}` : '2px solid transparent',
                            color: modelSelectorTab === 'local' ? themeColors.textPrimary : themeColors.textSecondary,
                            fontSize: '0.85rem',
                            fontWeight: modelSelectorTab === 'local' ? '600' : '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Local
                        </button>
                      </div>

                      {/* Lista de modelos */}
                      <div style={{
                        maxHeight: '400px',
                        overflowY: 'auto',
                        padding: '0.5rem 0'
                      }}>
                        {(() => {
                          // Filtrar modelos según tab y búsqueda
                          let filteredModels = functionalModels.filter(model => {
                            const matchesTab = modelSelectorTab === 'all' || model.type === 'local';
                            const matchesSearch = !modelSearchQuery || 
                              model.displayName.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
                              model.id.toLowerCase().includes(modelSearchQuery.toLowerCase());
                            return matchesTab && matchesSearch;
                          });

                          if (filteredModels.length === 0) {
                            return (
                              <div style={{
                                padding: '2rem 1rem',
                                textAlign: 'center',
                                color: themeColors.textSecondary,
                                fontSize: '0.85rem'
                              }}>
                                {modelSearchQuery ? 'No se encontraron modelos' : 'No hay modelos disponibles'}
                              </div>
                            );
                          }

                          return filteredModels.map((model) => {
                            const isSelected = currentModel === model.id;
                            const isLocal = model.type === 'local';
                            
                            return (
                              <div
                                key={model.id}
                                onClick={() => {
                                  handleModelChange(model.id, model.type);
                                  setShowModelSelector(false);
                                  setModelSearchQuery('');
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  padding: '0.75rem 1rem',
                                  background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  borderLeft: isSelected ? `3px solid ${themeColors.primaryColor}` : '3px solid transparent'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.background = 'transparent';
                                  }
                                }}
                              >
                                {/* Icono del modelo */}
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: isLocal 
                                    ? 'rgba(59, 130, 246, 0.2)' 
                                    : 'rgba(102, 187, 106, 0.2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <i className="pi pi-circle" style={{
                                    fontSize: '0.5rem',
                                    color: isLocal ? 'rgba(59, 130, 246, 0.8)' : 'rgba(102, 187, 106, 0.8)'
                                  }} />
                                </div>

                                {/* Información del modelo */}
                                <div style={{
                                  flex: 1,
                                  minWidth: 0,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.2rem'
                                }}>
                                  <div style={{
                                    fontSize: '0.85rem',
                                    fontWeight: '500',
                                    color: themeColors.textPrimary,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {model.displayName || model.id}
                                  </div>
                                  {isLocal && (
                                    <div style={{
                                      fontSize: '0.75rem',
                                      color: themeColors.textSecondary,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem'
                                    }}>
                                      <span style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: '#66bb6a',
                                        display: 'inline-block'
                                      }} />
                                      {model.size || 'Local'}
                                    </div>
                                  )}
                                </div>

                                {/* Checkmark si está seleccionado */}
                                {isSelected && (
                                  <i className="pi pi-check" style={{
                                    color: themeColors.primaryColor,
                                    fontSize: '1rem',
                                    flexShrink: 0
                                  }} />
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </div>
              {selectedMcpServers && selectedMcpServers.length > 0 && (
                selectedMcpServers
                  .map(serverId => activeMcpServers.find(s => s.id === serverId))
                  .filter(server => server && !disabledMcpServers.includes(server.id))
                  .map((server, idx) => (
                    <span 
                      key={idx}
                      title={getMcpCatalogName(server.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.3rem 0.6rem',
                        background: 'rgba(102, 187, 106, 0.15)',
                        color: '#66bb6a',
                        borderRadius: '16px',
                        fontSize: '0.65rem',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        border: '1px solid rgba(102, 187, 106, 0.3)',
                        boxShadow: '0 2px 4px rgba(102, 187, 106, 0.15)',
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        letterSpacing: '0.2px'
                      }}>
                      <i className="pi pi-wrench" style={{ fontSize: '0.6rem', marginRight: '0.3rem' }} />
                      {getMcpCatalogName(server.id).substring(0, 12)}
                    </span>
                  ))
              )}
            </div>
          </div>

          {/* Botones de acción más compactos */}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {/* Botón historial */}
            {onToggleHistory && (
              <button
                onClick={onToggleHistory}
                style={{
                  background: showHistory ? 'rgba(59, 130, 246, 0.9)' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${showHistory ? 'rgba(59, 130, 246, 0.5)' : themeColors.borderColor}`,
                  borderRadius: '10px',
                  padding: '0.4rem 0.6rem',
                  color: showHistory ? 'white' : themeColors.textPrimary,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  width: '36px',
                  height: '36px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = showHistory ? 'rgba(59, 130, 246, 1)' : 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = showHistory ? 'rgba(59, 130, 246, 0.9)' : 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
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
                borderRadius: '8px',
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
                borderRadius: '8px',
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
                borderRadius: '8px',
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
                borderRadius: '8px',
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
                borderRadius: '8px',
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
                  borderRadius: '8px',
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
            padding: '1.5rem 2rem',
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
                  borderRadius: '8px',
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
            padding: '1rem 1.5rem',
            background: `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`,
            backdropFilter: 'blur(8px)',
            borderTop: `2px solid ${themeColors.borderColor}`,
            boxShadow: '0 -2px 12px rgba(0,0,0,0.1)'
          }}
        >
          
          {/* Panel desplegable para Herramientas MCP */}
          {showMcpPanel && (
            <div style={{ 
              marginBottom: '0.6rem',
              maxHeight: '70vh',
              overflow: 'auto',
              animation: 'slideUp 0.3s ease'
            }}>
              <MCPActiveTools themeColors={themeColors} onExpandedChange={setMcpExpanded} />
            </div>
          )}

          {/* Panel desplegable para Memoria */}
          {showMemoryPanel && (
            <div style={{ 
              marginBottom: '0.6rem',
              maxHeight: '70vh',
              overflow: 'auto',
              animation: 'slideUp 0.3s ease'
            }}>
              <ModelMemoryIndicator 
                visible={showMemoryIndicator} 
                themeColors={themeColors}
                onExpandedChange={setMemoryExpanded}
              />
            </div>
          )}
          
          {/* Indicadores de rendimiento */}
          <AIPerformanceStats
            currentModel={currentModel}
            modelType={modelType}
            contextLimit={contextLimit}
            inputValue={inputValue}
            messages={messages}
            isLoading={isLoading}
            attachedFiles={attachedFiles}
            showMcpPanel={showMcpPanel}
            onToggleMcpPanel={() => setShowMcpPanel(!showMcpPanel)}
            showMemoryPanel={showMemoryPanel}
            onToggleMemoryPanel={() => setShowMemoryPanel(!showMemoryPanel)}
            toolsCount={toolsCount}
            selectedShell={selectedShell}
            onShellChange={setSelectedShell}
            availableShells={availableShells}
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
                padding: '0.9rem 1.2rem',
                background: 'rgba(255,255,255,0.08)',
                border: `1px solid rgba(255,255,255,0.2)`,
                borderRadius: '16px',
                color: themeColors.textPrimary,
                fontSize: '0.95rem',
                resize: 'none',
                minHeight: '52px',
                maxHeight: '120px',
                transition: 'all 0.2s ease',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: '1.5'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = themeColors.primaryColor || 'rgba(59, 130, 246, 0.5)';
                e.target.style.background = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = `0 0 0 3px ${themeColors.primaryColor || 'rgba(59, 130, 246, 0.1)'}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                e.target.style.background = 'rgba(255,255,255,0.08)';
                e.target.style.boxShadow = 'none';
              }}
              rows={1}
            />

            {/* Botón para archivos adjuntos */}
            <button
              onClick={toggleFileUploader}
              disabled={isLoading}
              style={{
                background: showFileUploader 
                  ? `linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(59, 130, 246, 0.8) 100%)`
                  : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '16px',
                padding: '0.6rem',
                color: 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '52px',
                height: '52px',
                opacity: isLoading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = showFileUploader 
                    ? `linear-gradient(135deg, rgba(59, 130, 246, 1) 0%, rgba(59, 130, 246, 0.9) 100%)`
                    : 'rgba(255,255,255,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = showFileUploader 
                  ? `linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(59, 130, 246, 0.8) 100%)`
                  : 'rgba(255,255,255,0.1)';
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
                  ? `linear-gradient(135deg, rgba(59, 130, 246, 1) 0%, rgba(59, 130, 246, 0.9) 100%)`
                  : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '16px',
                padding: '0.9rem 1.8rem',
                color: 'white',
                cursor: currentModel && inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                boxShadow: currentModel && inputValue.trim() ? `0 4px 12px rgba(59, 130, 246, 0.3)` : 'none',
                opacity: currentModel && inputValue.trim() && !isLoading ? 1 : 0.5
              }}
              onMouseEnter={(e) => {
                if (currentModel && inputValue.trim() && !isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 6px 16px rgba(59, 130, 246, 0.4)`;
                  e.currentTarget.style.background = `linear-gradient(135deg, rgba(59, 130, 246, 1) 0%, rgba(59, 130, 246, 0.95) 100%)`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = currentModel && inputValue.trim() ? `0 4px 12px rgba(59, 130, 246, 0.3)` : 'none';
                e.currentTarget.style.background = currentModel && inputValue.trim()
                  ? `linear-gradient(135deg, rgba(59, 130, 246, 1) 0%, rgba(59, 130, 246, 0.9) 100%)`
                  : 'rgba(255,255,255,0.1)';
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.25rem 0', color: themeColors.textPrimary, fontSize: '1.2rem', fontWeight: '600' }}>
                    🔧 Servidores MCP
                  </h2>
                  <p style={{ margin: 0, color: themeColors.textSecondary, fontSize: '0.8rem' }}>
                    {activeMcpServers.length} servidor{activeMcpServers.length !== 1 ? 's' : ''} instalado{activeMcpServers.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      setShowMcpDialog(false);
                      // Disparar evento para abrir AIConfigDialog (donde está MCPManagerTab)
                      window.dispatchEvent(new CustomEvent('open-ai-config', { 
                        detail: { tab: 'mcp-manager' } 
                      }));
                    }}
                    title="Configurar y instalar MCPs"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: `1px solid ${themeColors.borderColor}`,
                      color: themeColors.textPrimary,
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.borderColor = themeColors.primaryColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = themeColors.borderColor;
                    }}
                  >
                    ⚙️
                  </button>
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
              </div>

              <p style={{ margin: '0 0 1rem 0', color: themeColors.textSecondary, fontSize: '0.85rem' }}>
                Selecciona qué MCPs usar por defecto. Gestiona instalaciones en ⚙️
              </p>

              {activeMcpServers && activeMcpServers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {/* Lista de MCPs con botones de acción */}
                  {activeMcpServers.map((server, idx) => {
                    const isSelected = selectedMcpServers.includes(server.id);
                    const isConfigured = server.config?.enabled; // Estado en mcp-config.json
                    const isRunning = server.running && server.state === 'ready'; // Proceso activo
                    
                    return (
                      <div 
                        key={idx}
                        style={{
                          padding: '0.8rem',
                          background: !isConfigured 
                            ? 'rgba(200, 100, 100, 0.08)'
                            : isRunning
                              ? `linear-gradient(135deg, rgba(102, 187, 106, 0.08) 0%, rgba(102, 187, 106, 0.03) 100%)`
                              : 'rgba(255, 193, 7, 0.08)',
                          border: !isConfigured
                            ? '1px solid rgba(200, 100, 100, 0.2)'
                            : isRunning
                              ? '1px solid rgba(102, 187, 106, 0.2)'
                              : '1px solid rgba(255, 193, 7, 0.2)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.6rem',
                          opacity: !isConfigured ? 0.6 : 1,
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
                            background: !isConfigured 
                              ? 'rgba(200, 100, 100, 0.15)' 
                              : isRunning
                                ? 'rgba(102, 187, 106, 0.15)'
                                : 'rgba(255, 193, 7, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: !isConfigured 
                              ? '#c06464'
                              : isRunning
                                ? '#66bb6a'
                                : '#ffc107',
                            flexShrink: 0,
                            position: 'relative'
                          }}>
                            <i className="pi pi-wrench" style={{ fontSize: '1rem' }} />
                            {isRunning && (
                              <div style={{
                                position: 'absolute',
                                bottom: '-2px',
                                right: '-2px',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#66bb6a',
                                boxShadow: '0 0 6px #66bb6a'
                              }} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              color: !isConfigured ? themeColors.textSecondary : themeColors.textPrimary,
                              fontWeight: '600',
                              fontSize: '0.95rem',
                              textDecoration: !isConfigured ? 'line-through' : 'none'
                            }}>
                              {getMcpCatalogName(server.id)}
                            </div>
                            <div style={{
                              color: themeColors.textSecondary,
                              fontSize: '0.75rem',
                              marginTop: '0.2rem',
                              display: 'flex',
                              gap: '0.5rem',
                              alignItems: 'center'
                            }}>
                              <span>{server.id}</span>
                              {!isConfigured && <span style={{ color: '#c06464', fontWeight: '600' }}>● Deshabilitado</span>}
                              {isConfigured && !isRunning && <span style={{ color: '#ffc107', fontWeight: '600' }}>● Detenido</span>}
                              {isRunning && <span style={{ color: '#66bb6a', fontWeight: '600' }}>● En ejecución</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          flexShrink: 0,
                          flexWrap: 'wrap',
                          justifyContent: 'flex-end'
                        }}>
                          {/* Botón Por Defecto */}
                          <button
                            onClick={() => handleToggleMcpSelection(server.id)}
                            disabled={!isConfigured}
                            title={isSelected ? 'Remover de por defecto' : 'Usar por defecto'}
                            style={{
                              padding: '0.4rem 0.8rem',
                              background: isSelected ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              border: isSelected ? '1px solid rgba(255, 193, 7, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              color: isSelected ? '#ffc107' : themeColors.textSecondary,
                              cursor: !isConfigured ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              whiteSpace: 'nowrap',
                              opacity: !isConfigured ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (isConfigured) {
                                e.currentTarget.style.background = isSelected ? 'rgba(255, 193, 7, 0.3)' : 'rgba(255, 255, 255, 0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (isConfigured) {
                                e.currentTarget.style.background = isSelected ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                          >
                            <i className={`pi ${isSelected ? 'pi-star-fill' : 'pi-star'}`} style={{ fontSize: '0.65rem' }} />
                          </button>

                          {/* Botón Enable/Disable (abre settings) */}
                          <button
                            onClick={() => {
                              setShowMcpDialog(false);
                              window.dispatchEvent(new CustomEvent('open-ai-config', { 
                                detail: { tab: 'mcp-manager', selectServer: server.id } 
                              }));
                            }}
                            title={isConfigured ? 'Configurar' : 'Habilitar'}
                            style={{
                              padding: '0.4rem 0.8rem',
                              background: !isConfigured
                                ? 'rgba(244, 67, 54, 0.2)'
                                : 'rgba(76, 175, 80, 0.2)',
                              border: !isConfigured
                                ? '1px solid rgba(244, 67, 54, 0.4)'
                                : '1px solid rgba(76, 175, 80, 0.4)',
                              borderRadius: '8px',
                              color: !isConfigured ? '#f44336' : '#66bb6a',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = !isConfigured
                                ? 'rgba(244, 67, 54, 0.3)'
                                : 'rgba(76, 175, 80, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = !isConfigured
                                ? 'rgba(244, 67, 54, 0.2)'
                                : 'rgba(76, 175, 80, 0.2)';
                            }}
                          >
                            {!isConfigured ? (
                              <>
                                <i className="pi pi-times" style={{ fontSize: '0.65rem' }} />
                              </>
                            ) : (
                              <>
                                <i className="pi pi-cog" style={{ fontSize: '0.65rem' }} />
                              </>
                            )}
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

        {/* ✅ NUEVO: Modal de carga de modelo */}
        {isModelSwitching && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              backdropFilter: 'blur(4px)'
            }}
          >
            <div
              style={{
                background: themeColors.cardBackground,
                border: `2px solid ${themeColors.borderColor}`,
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                minWidth: '300px',
                maxWidth: '400px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Icono animado */}
              <div
                style={{
                  fontSize: '2.5rem',
                  marginBottom: '1rem',
                  animation: 'spin 2s linear infinite'
                }}
              >
                ⚙️
              </div>

              {/* Título */}
              <h3
                style={{
                  margin: '0 0 1rem 0',
                  color: themeColors.textPrimary,
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                Cambiando Modelo
              </h3>

              {/* Descripción progresiva */}
              <div
                style={{
                  color: themeColors.textSecondary,
                  fontSize: '0.9rem',
                  marginBottom: '1.5rem',
                  height: '2.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {modelSwitchProgress < 15 && '🧹 Descargando modelo anterior...'}
                {modelSwitchProgress >= 15 && modelSwitchProgress < 35 && '💾 Guardando cambios...'}
                {modelSwitchProgress >= 35 && modelSwitchProgress < 100 && '⏳ Cargando nuevo modelo...'}
                {modelSwitchProgress === 100 && '✅ ¡Listo!'}
              </div>

              {/* Barra de progreso */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  height: '8px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '1rem'
                }}
              >
                <div
                  style={{
                    background: modelSwitchProgress === 100 ? '#4caf50' : '#2196f3',
                    height: '100%',
                    width: `${modelSwitchProgress}%`,
                    transition: 'width 0.1s ease-out',
                    borderRadius: '4px'
                  }}
                />
              </div>

              {/* Porcentaje */}
              <div
                style={{
                  color: themeColors.textSecondary,
                  fontSize: '0.85rem',
                  fontWeight: 'bold'
                }}
              >
                {modelSwitchProgress}%
              </div>

              {/* Estilo para la animación */}
              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AIChatPanel;


