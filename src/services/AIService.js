/**
 * AIService - Servicio principal para manejar las APIs de IA
 * Soporta modelos remotos (GPT, Claude, etc.) y locales (Llama, Qwen, DeepSeek)
 */

import { conversationService } from './ConversationService';
import debugLogger from '../utils/debugLogger';

import fileAnalysisService from './FileAnalysisService';
import mcpClient from './MCPClientService';
import toolOrchestrator from './ToolOrchestrator';
import modelMemoryService from './ModelMemoryService';
import { summarizeToolResult } from '../utils/toolResultSummarizer';
import { rememberToolExecution, getRecentToolExecution } from './ToolExecutionCache';
import { modelManager } from './ai/ModelManager';

const TOOLS_REQUIRE_FULL_CONTEXT = new Set([
  'search_nodeterm'
]);

class AIService {
  constructor() {
    this.currentModel = null;
    this.modelType = 'remote'; // 'remote', 'local' o 'remote-ollama'
    this.apiKey = null;
    this.remoteOllamaUrl = null;
    this.performanceConfig = null; // Configuración manual de rendimiento
    // Caché simple para los directorios permitidos de MCP (evita pedirlos repetidamente)
    this.allowedDirectoriesCache = { value: null, fetchedAt: 0 };
    this.mcpDefaultDirs = {}; // Map<serverId, { raw, normalized }>
    // Flag para invalidar información del filesystem cuando se modifica
    this._filesystemModified = false;
    // Feature flags y orquestador
    this.featureFlags = { structuredToolMessages: true };
    this.toolOrchestrator = toolOrchestrator;
    // Servicio de gestión de memoria
    this.memoryService = modelMemoryService;
    // Usar ModelManager para obtener todos los modelos
    this.models = modelManager.getAllModels();
    // Nota: Los modelos ahora están centralizados en ModelManager
    // El código anterior que definía this.models aquí ha sido movido a ModelManager
    this.conversationHistory = [];
    this.loadConfig();
  }

  _setMcpDefaultDir(serverId, path) {
    if (!serverId || !path || typeof path !== 'string') return;
    const trimmed = path.trim();
    if (!trimmed) return;
    const normalized = trimmed.replace(/\\/g, '/');
    this.mcpDefaultDirs[serverId] = {
      raw: trimmed,
      normalized
    };
  }

  _getMcpDefaultDir(serverId) {
    if (!serverId) return null;
    return this.mcpDefaultDirs[serverId] || null;
  }

  /**
   * Validar si un modelo está disponible para uso
   */
  validateModelAvailability(modelId, type) {
    if (!modelId) return false;
    
    if (type === 'local') {
      const model = this.getAllLocalModels().find(m => m.id === modelId);
      if (!model) return false;
      // Solo permitir modelos que estén marcados como descargados
      return model.downloaded === true;
    } else if (type === 'remote') {
      const model = this.models.remote.find(m => m.id === modelId);
      if (!model) return false;
      // Solo permitir modelos remotos con API key configurada
      const apiKey = this.getApiKey(model.provider);
      return !!apiKey;
    }
    
    return false;
  }

  /**
   * Cargar configuración desde localStorage
   */
  loadConfig() {
    try {
      const config = localStorage.getItem('ai-service-config');
      if (config) {
        const parsed = JSON.parse(config);
        
        // Restaurar API keys primero (necesario para validación de modelos remotos)
        this.apiKey = parsed.apiKey || null;
        this.remoteOllamaUrl = parsed.remoteOllamaUrl || null;
        this.performanceConfig = parsed.performanceConfig || null;
        
        // Cargar estado de modelos locales descargados
        if (parsed.localModels) {
          const allLocalModels = this.getAllLocalModels();
          allLocalModels.forEach(model => {
            const saved = parsed.localModels.find(m => m.id === model.id);
            if (saved) {
              model.downloaded = saved.downloaded;
            }
          });
        }
        
        // Validar que el modelo guardado esté disponible antes de usarlo
        const savedModel = parsed.currentModel;
        const savedType = parsed.modelType || 'remote';
        
        if (savedModel && this.validateModelAvailability(savedModel, savedType)) {
          // Modelo válido, usar configuración guardada
          this.currentModel = savedModel;
          this.modelType = savedType;
        } else {
          // Modelo no válido o no disponible, limpiar selección
          // El usuario deberá seleccionar un modelo válido manualmente
          this.currentModel = null;
          this.modelType = 'remote';
          
          if (savedModel) {
            debugLogger.warn('AIService', `Modelo guardado ${savedModel} (${savedType}) no está disponible. Limpiando selección.`);
          }
        }
      }
    } catch (error) {
      console.error('Error cargando configuración de AI:', error);
    }
  }

  /**
   * Guardar configuración en localStorage
   */
  saveConfig() {
    try {
      const config = {
        currentModel: this.currentModel,
        modelType: this.modelType,
        apiKey: this.apiKey,
        remoteOllamaUrl: this.remoteOllamaUrl,
        performanceConfig: this.performanceConfig,
        localModels: this.getAllLocalModels().map(m => ({ id: m.id, downloaded: m.downloaded }))
      };
      localStorage.setItem('ai-service-config', JSON.stringify(config));
    } catch (error) {
      console.error('Error guardando configuración de AI:', error);
    }
  }

  /**
   * Obtener todos los modelos locales (Ollama + Independientes)
   */
  getAllLocalModels() {
    return [...this.models.local.ollama, ...this.models.local.independent];
  }

  /**
   * Obtener lista de modelos disponibles
   */
  getAvailableModels(type = null) {
    if (type) {
      if (type === 'local') {
        return this.getAllLocalModels();
      }
      return this.models[type] || [];
    }
    return {
      remote: this.models.remote,
      local: this.getAllLocalModels()
    };
  }

  /**
   * Obtener solo los modelos funcionales (con API key o descargados)
   */
  getFunctionalModels() {
    const functional = [];
    
    // Modelos remotos con API key configurada
    this.models.remote.forEach(model => {
      const apiKey = this.getApiKey(model.provider);
      if (apiKey) {
        functional.push({
          ...model,
          type: 'remote',
          displayName: `${model.name} (${model.provider})`
        });
      }
    });
    
    // Modelos locales descargados
    this.getAllLocalModels().forEach(model => {
      if (model.downloaded) {
        functional.push({
          ...model,
          type: 'local',
          displayName: `${model.name} (Local)`
        });
      }
    });
    
    return functional;
  }

  /**
   * Obtener configuración de rendimiento para un modelo
   */
  getModelPerformanceConfig(modelId, modelType) {
    debugLogger.debug('AIService', `getModelPerformanceConfig - Modelo: ${modelId}, Tipo: ${modelType}`);
    
    // Configuraciones específicas por modelo cloud
    const cloudModelConfigs = {
      // OpenAI Models
      'gpt-4': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 128000 // 128K contexto
      },
      'gpt-4-turbo': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 128000 // 128K contexto
      },
      'gpt-3.5-turbo': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 16000 // 16K contexto
      },
      'gpt-3.5-turbo-16k': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 16000 // 16K contexto
      },
      
      // Anthropic Models
      'claude-3-opus': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 200000 // 200K contexto
      },
      'claude-3-sonnet': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 200000 // 200K contexto
      },
      'claude-3-haiku': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 200000 // 200K contexto
      },
      'claude-2': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 100000 // 100K contexto
      },
      
      // Google Models
      'gemini-2.5-flash': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 1000000 // 1M contexto (Flash tiene contexto muy alto)
      },
      'gemini-2.5-pro': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 2000000 // 2M contexto (Pro tiene el contexto más alto)
      },
      'gemini-2.0-flash-exp': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 1000000 // 1M contexto (experimental)
      },
      // Modelos legacy (por compatibilidad)
      'gemini-pro': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 32000 // 32K contexto
      },
      'gemini-pro-vision': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 32000 // 32K contexto
      }
    };

    // Si es un modelo cloud, usar configuración específica (prioridad máxima)
    if (modelType === 'remote' && cloudModelConfigs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para ${modelId}:`, cloudModelConfigs[modelId]);
      return cloudModelConfigs[modelId];
    }

    // Para modelos locales, verificar configuración guardada manualmente (prioridad alta)
    if (modelType === 'local') {
      try {
        const localConfigs = JSON.parse(localStorage.getItem('local-model-performance-configs') || '{}');
        
        // Buscar configuración exacta primero
        if (localConfigs[modelId]) {
          debugLogger.debug('AIService', `Usando configuración guardada para ${modelId}`);
          return localConfigs[modelId];
        }
        
        // Si no se encuentra, intentar con el nombre base (sin tags como :latest, :8b, etc.)
        // Esto permite que modelos como "llama3.2:latest" usen la configuración de "llama3.2"
        const baseModelId = modelId.split(':')[0];
        if (baseModelId !== modelId && localConfigs[baseModelId]) {
          debugLogger.debug('AIService', `Usando configuración guardada para ${baseModelId} (base de ${modelId})`);
          return localConfigs[baseModelId];
        }
        
        // Buscar también por coincidencias parciales (para modelos personalizados)
        // Por ejemplo, si tenemos "mistral:7b" instalado y configuramos "mistral"
        const matchingKey = Object.keys(localConfigs).find(key => {
          return modelId.includes(key) || key.includes(baseModelId);
        });
        if (matchingKey) {
          debugLogger.debug('AIService', `Usando configuración guardada (coincidencia parcial) ${matchingKey} para ${modelId}`);
          return localConfigs[matchingKey];
        }
      } catch (e) {
        debugLogger.warn('AIService', `Error al cargar configuración individual de ${modelId}:`, e.message);
      }
    }

    // Si no, usar configuración automática basada en performance
    let model;
    if (modelType === 'local') {
      model = this.getAllLocalModels().find(m => m.id === modelId);
    } else {
      model = this.models[modelType].find(m => m.id === modelId);
    }
    
    if (!model) {
      debugLogger.warn('AIService', `Modelo no encontrado, usando configuración por defecto`);
      return this.getDefaultPerformanceConfig();
    }

    // Configuraciones específicas para modelos Qwen con contextos largos
    const qwen3Configs = {
      'qwen2.5': {
        maxTokens: 12000,
        temperature: 0.7,
        maxHistory: 16,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de Qwen 2.5
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'qwen3:8b': {
        maxTokens: 15000,
        temperature: 0.7,
        maxHistory: 20,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de Qwen3
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'qwen3:30b': {
        maxTokens: 20000,
        temperature: 0.7,
        maxHistory: 25,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de Qwen3
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    };

    // Configuraciones específicas para modelos GPT-OSS con contextos largos
    const gptOssConfigs = {
      'gpt-oss:20b': {
        maxTokens: 12000,
        temperature: 0.7,
        maxHistory: 20,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de GPT-OSS 20B
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'gpt-oss:120b': {
        maxTokens: 16000,
        temperature: 0.7,
        maxHistory: 24,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de GPT-OSS 120B
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    };

    // Configuraciones específicas para Llama 3.2
    const llama32Configs = {
      'llama3.2:latest': {
        maxTokens: 6000,
        temperature: 0.7,
        maxHistory: 12,
        useStreaming: true,
        contextLimit: 8000,    // 8K contexto nativo de Llama 3.2 3B
        num_ctx: 8000          // Para Ollama
      },
      'llama3.2:1b': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 4000,    // 4K contexto nativo de Llama 3.2 1B
        num_ctx: 4000          // Para Ollama
      }
    };

    // Configuraciones específicas para Llama 3.1 con contexto extendido
    const llama31Configs = {
      'llama3.1:8b': {
        maxTokens: 8000,
        temperature: 0.7,
        maxHistory: 16,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de Llama 3.1 8B
        num_ctx: 128000        // Para Ollama
      },
      'llama3.1:latest': {
        maxTokens: 8000,
        temperature: 0.7,
        maxHistory: 16,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de Llama 3.1
        num_ctx: 128000        // Para Ollama
      },
      'llama3.1:70b': {
        maxTokens: 12000,
        temperature: 0.7,
        maxHistory: 20,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de Llama 3.1 70B
        num_ctx: 128000        // Para Ollama
      }
    };

    // Configuraciones específicas para Llama 3 (versión anterior)
    const llama3Configs = {
      'llama3': {
        maxTokens: 6000,
        temperature: 0.7,
        maxHistory: 12,
        useStreaming: true,
        contextLimit: 8000,    // 8K contexto nativo de Llama 3 8B
        num_ctx: 8000          // Para Ollama
      },
      'llama3:70b': {
        maxTokens: 10000,
        temperature: 0.7,
        maxHistory: 16,
        useStreaming: true,
        contextLimit: 8000,    // 8K contexto nativo de Llama 3 70B
        num_ctx: 8000          // Para Ollama
      }
    };

    // Configuraciones específicas para DeepSeek R1 (todos tienen 128K contexto)
    const deepseekR1Configs = {
      'deepseek-r1:latest': {
        maxTokens: 2000,
        temperature: 0.7,
        maxHistory: 20,
        useStreaming: true,
        contextLimit: 8192,  // Reducido para velocidad
        num_ctx: 8192,      // Para Ollama - más rápido
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:1.5b': {
        maxTokens: 2000,
        temperature: 0.7,
        maxHistory: 16,
        useStreaming: true,
        contextLimit: 8192,  // Reducido para velocidad
        num_ctx: 8192,       // Para Ollama - más rápido
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:7b': {
        maxTokens: 2000,
        temperature: 0.7,
        maxHistory: 18,
        useStreaming: true,
        contextLimit: 8192,  // Reducido para velocidad
        num_ctx: 8192,       // Para Ollama - más rápido
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:8b': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 30,
        useStreaming: true,
        contextLimit: 32768,  // 32K contexto - DeepSeek-R1 8B soporta hasta 128K nativo
        num_ctx: 32768,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:14b': {
        maxTokens: 14000,
        temperature: 0.7,
        maxHistory: 24,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:32b': {
        maxTokens: 16000,
        temperature: 0.7,
        maxHistory: 28,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:70b': {
        maxTokens: 20000,
        temperature: 0.7,
        maxHistory: 32,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:671b': {
        maxTokens: 24000,
        temperature: 0.7,
        maxHistory: 36,
        useStreaming: true,
        contextLimit: 160000,  // 160K contexto nativo
        num_ctx: 160000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    };

    // Configuraciones específicas para Gemma 3 (multimodal)
    const gemma3Configs = {
      'gemma3:latest': {
        maxTokens: 12000,
        temperature: 0.7,
        maxHistory: 20,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'gemma3:270m': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 12,
        useStreaming: true,
        contextLimit: 32000,   // 32K contexto nativo
        num_ctx: 32000,        // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'gemma3:1b': {
        maxTokens: 6000,
        temperature: 0.7,
        maxHistory: 14,
        useStreaming: true,
        contextLimit: 32000,   // 32K contexto nativo
        num_ctx: 32000,        // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'gemma3:4b': {
        maxTokens: 12000,
        temperature: 0.7,
        maxHistory: 20,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo (multimodal)
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'gemma3:12b': {
        maxTokens: 16000,
        temperature: 0.7,
        maxHistory: 24,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo (multimodal)
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'gemma3:27b': {
        maxTokens: 20000,
        temperature: 0.7,
        maxHistory: 28,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo (multimodal)
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    };

    // Si es un modelo Gemma 3, usar configuración específica
    if (gemma3Configs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para Gemma 3 ${modelId}:`, gemma3Configs[modelId]);
      return gemma3Configs[modelId];
    }

    // Si es un modelo DeepSeek R1, usar configuración específica
    if (deepseekR1Configs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para DeepSeek R1 ${modelId}:`, deepseekR1Configs[modelId]);
      return deepseekR1Configs[modelId];
    }

    // Si es un modelo Qwen, usar configuración específica
    if (qwen3Configs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para Qwen ${modelId}:`, qwen3Configs[modelId]);
      return qwen3Configs[modelId];
    }

    // Si es un modelo GPT-OSS, usar configuración específica
    if (gptOssConfigs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para GPT-OSS ${modelId}:`, gptOssConfigs[modelId]);
      return gptOssConfigs[modelId];
    }

    // Si es un modelo Llama 3.2, usar configuración específica
    if (llama32Configs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para Llama 3.2 ${modelId}:`, llama32Configs[modelId]);
      return llama32Configs[modelId];
    }

    // Si es un modelo Llama 3.1, usar configuración específica
    if (llama31Configs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para Llama 3.1 ${modelId}:`, llama31Configs[modelId]);
      return llama31Configs[modelId];
    }

    // Si es un modelo Llama 3, usar configuración específica
    if (llama3Configs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para Llama 3 ${modelId}:`, llama3Configs[modelId]);
      return llama3Configs[modelId];
    }

    const performanceLevel = model.performance || 'medium';
    debugLogger.debug('AIService', `Usando configuración por performance (${performanceLevel}) para ${modelId}`);
    
    const configs = {
      low: {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 5,
        useStreaming: false,
        contextLimit: 2000
      },
      medium: {
        maxTokens: 6000,  // Reducido de 7000 para mejor coherencia con modelos cloud
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 8000  // Aumentado de 4000 para mejor contexto
      },
      high: {
        maxTokens: 8000,  // Reducido de 12000 para mantener consistencia
        temperature: 0.7,
        maxHistory: 10,
        useStreaming: true,
        contextLimit: 16000  // Aumentado de 8000 para aprovechar mejor los modelos grandes
      }
    };

    const finalConfig = configs[performanceLevel] || configs.medium;
    debugLogger.trace('AIService', `Configuración final para ${modelId}:`, finalConfig);
    return finalConfig;
  }

  /**
   * Configuración por defecto
   */
  getDefaultPerformanceConfig() {
    return {
      maxTokens: 7000,
      temperature: 0.7,
      maxHistory: 8,
      useStreaming: true,
      contextLimit: 4000
    };
  }

  /**
   * Establecer configuración manual de rendimiento
   */
  setPerformanceConfig(config) {
    this.performanceConfig = config;
    this.saveConfig();
  }

  /**
   * Obtener configuración manual de rendimiento
   */
  getPerformanceConfig() {
    return this.performanceConfig;
  }

  /**
   * Limpiar configuración manual (volver a automática)
   */
  clearPerformanceConfig() {
    this.performanceConfig = null;
    this.saveConfig();
  }

  /**
   * Activar/desactivar logging de debug detallado para AIService
   */
  setDebugLogging(enabled) {
    if (enabled) {
      debugLogger.enableModule('AIService');
    } else {
      debugLogger.disableModule('AIService');
    }
  }

  /**
   * Obtener estado del debug logging
   */
  isDebugLoggingEnabled() {
    return debugLogger.isModuleEnabled('AIService');
  }

  /**
   * Detectar modelos instalados en Ollama
   */
  async detectOllamaModels() {
    try {
      const ollamaUrl = this.getOllamaUrl();
      const response = await fetch(`${ollamaUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`No se pudo conectar con Ollama en ${ollamaUrl}`);
      }
      
      const data = await response.json();
      
      // Actualizar lista de modelos locales con los detectados
      if (data.models && Array.isArray(data.models)) {
        // Primero marcar todos los modelos como no instalados
        this.models.local.ollama.forEach(model => {
          model.downloaded = false;
        });
        this.models.local.independent.forEach(model => {
          model.downloaded = false;
        });
        
        // Luego marcar como instalados solo los que están en Ollama
        const installedModelNames = data.models.map(model => model.name);
        
        installedModelNames.forEach(modelName => {
          // Extraer el nombre base del modelo (sin tags como :latest, :8b, etc.)
          const baseModelName = modelName.split(':')[0];
          
          // Buscar en modelos de Ollama prefiriendo coincidencia exacta, luego coincidencia de nombre base
          let ollamaIndex = this.models.local.ollama.findIndex(m => m.id === modelName);
          if (ollamaIndex === -1) {
            ollamaIndex = this.models.local.ollama.findIndex(m => m.id === baseModelName);
          }
          
          if (ollamaIndex >= 0) {
            this.models.local.ollama[ollamaIndex].downloaded = true;
            // Actualizar el ID para que coincida con el nombre exacto instalado
            this.models.local.ollama[ollamaIndex].id = modelName;
            // NO actualizar el nombre para mantener el nombre configurado con el número de B
          } else {
            // Buscar en modelos independientes
            let independentIndex = this.models.local.independent.findIndex(m => m.id === modelName);
            if (independentIndex === -1) {
              independentIndex = this.models.local.independent.findIndex(m => m.id === baseModelName);
            }
            
            if (independentIndex >= 0) {
              this.models.local.independent[independentIndex].downloaded = true;
              // Actualizar el ID para que coincida con el nombre exacto instalado
              this.models.local.independent[independentIndex].id = modelName;
              // NO actualizar el nombre para mantener el nombre configurado
            } else {
              // Modelo no conocido, no agregarlo a la lista predefinida
              // Solo marcar como no disponible en la configuración
              debugLogger.debug('AIService.Models', 'Modelo detectado fuera de la configuración predefinida', {
                modelName
              });
            }
          }
        });
        
        // Limpiar duplicados - remover modelos predefinidos que ya están instalados con tags
        this.cleanDuplicateModels();
        
        // Validar que el modelo actual siga siendo válido después de la detección
        if (this.currentModel && this.modelType === 'local') {
          if (!this.validateModelAvailability(this.currentModel, this.modelType)) {
            debugLogger.warn('AIService', `El modelo actual ${this.currentModel} ya no está instalado. Limpiando selección.`);
            this.currentModel = null;
            this.modelType = 'remote';
          }
        }
        
        this.saveConfig();
        
        return installedModelNames;
      }
      
      return [];
    } catch (error) {
      console.error('Error detectando modelos de Ollama:', error);
      return [];
    }
  }

  /**
   * Limpiar modelos duplicados - remover modelos predefinidos que ya están instalados con tags
   */
  cleanDuplicateModels() {
    // Crear un mapa de modelos instalados por nombre base
    const installedBaseNames = new Set();
    this.models.local.ollama.forEach(model => {
      if (model.downloaded && model.id.includes(':')) {
        const baseName = model.id.split(':')[0];
        installedBaseNames.add(baseName);
      }
    });

    // Remover modelos predefinidos que ya están instalados con tags
    this.models.local.ollama = this.models.local.ollama.filter(model => {
      if (!model.downloaded && installedBaseNames.has(model.id)) {
        return false; // Remover modelo predefinido que ya está instalado con tag
      }
      return true;
    });
  }

  /**
   * Agregar modelo personalizado
   */
  addCustomModel(modelId, modelName = null) {
    const existingModel = this.getAllLocalModels().find(m => m.id === modelId);
    if (!existingModel) {
      this.models.local.ollama.push({
        id: modelId,
        name: modelName || modelId,
        size: 'Personalizado',
        downloaded: true,
        custom: true
      });
      this.saveConfig();
    }
  }

  /**
   * Seleccionar modelo actual
   */
  setCurrentModel(modelId, type) {
    // Validar que el modelo esté disponible antes de seleccionarlo
    if (!this.validateModelAvailability(modelId, type)) {
      const modelName = modelId || 'desconocido';
      const errorMsg = type === 'local' 
        ? `El modelo ${modelName} no está instalado. Instálalo primero en Ollama.`
        : `El modelo ${modelName} no está disponible. Configura la API Key correspondiente.`;
      debugLogger.error('AIService', 'Modelo no disponible al intentar seleccionarlo', {
        modelId,
        modelType: type,
        message: errorMsg
      });
      throw new Error(errorMsg);
    }
    
    this.currentModel = modelId;
    this.modelType = type;
    this.saveConfig();
    
    debugLogger.info('AIService', `Modelo seleccionado: ${modelId} (${type})`);
  }

  /**
   * Configurar API Key para modelos remotos
   */
  setApiKey(provider, key) {
    if (!this.apiKey) {
      this.apiKey = {};
    }
    this.apiKey[provider] = key;
    this.saveConfig();
  }

  /**
   * Obtener API Key para un provider
   */
  getApiKey(provider) {
    return this.apiKey?.[provider] || null;
  }

  /**
   * Configurar URL de Ollama remoto
   */
  setRemoteOllamaUrl(url) {
    this.remoteOllamaUrl = url;
    this.saveConfig();
  }

  /**
   * Obtener URL de Ollama (local o remoto)
   */
  getOllamaUrl() {
    return this.remoteOllamaUrl || 'http://localhost:11434';
  }

  /**
   * Enviar mensaje al modelo de IA
   */
  async sendMessage(message, options = {}) {
    if (!this.currentModel) {
      throw new Error('No se ha seleccionado ningún modelo');
    }

    // Obtener configuración de rendimiento automática
    const perfConfig = this.getModelPerformanceConfig(this.currentModel, this.modelType);
    
    // Combinar opciones con configuración automática
    const finalOptions = {
      ...perfConfig,
      ...options
    };

    // Limitar historial si es necesario
    if (this.conversationHistory.length > finalOptions.maxHistory) {
      this.conversationHistory = this.conversationHistory.slice(-finalOptions.maxHistory);
    }

    // Agregar mensaje al historial
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    try {
      let response;
      
      if (this.modelType === 'remote') {
        response = await this.sendToRemoteModel(message, finalOptions);
      } else {
        response = await this.sendToLocalModel(message, finalOptions);
      }

      // Agregar respuesta al historial
      this.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      console.error('Error enviando mensaje a IA:', error);
      throw error;
    }
  }

  /**
   * FILTRAR tools por contexto/relevancia
   * ✨ MEJORADO: Filtrado más agresivo con scoring y límite máximo
   */
  filterToolsByContext(tools, message = '') {
    const MAX_TOOLS = 6; // Límite máximo de tools para no abrumar al modelo
    const lowerMsg = message.toLowerCase();
    
    // Calcular score de relevancia para cada tool
    const toolsWithScore = tools.map(tool => {
      let score = 0;
      const toolName = tool.name.toLowerCase();
      const toolDesc = (tool.description || '').toLowerCase();
      
      // Búsquedas en web/internet
      if (lowerMsg.match(/busca|search|google|web|internet|sitio|página|url|http|\.com/)) {
        if (toolName.includes('search') || toolName.includes('web') || toolName.includes('fetch')) score += 10;
        if (toolName.includes('goto') || toolName.includes('screenshot')) score += 5;
      }
      
      // Archivos: LEER
      if (lowerMsg.match(/lee|leer|muestra|abre|ver|contenido|archivo|file/)) {
        if (toolName.includes('read_file') || toolName.includes('read_text')) score += 10;
        if (toolName.includes('get_file_info')) score += 5;
      }
      
      // Archivos: CREAR/ESCRIBIR
      if (lowerMsg.match(/crea|crear|escribe|guarda|guardar|genera|nuevo archivo|write/)) {
        if (toolName.includes('write_file') || toolName.includes('create')) score += 10;
        if (toolName.includes('append')) score += 5;
      }
      
      // Archivos: EDITAR/MODIFICAR
      if (lowerMsg.match(/edita|editar|modifica|cambia|actualiza|reemplaza|edit/)) {
        if (toolName.includes('edit_file') || toolName.includes('update')) score += 10;
        if (toolName.includes('write_file')) score += 3; // Fallback
      }
      
      // SSH/Terminal: HOSTS y CONEXIONES (ALTA PRIORIDAD)
      if (lowerMsg.match(/ssh|host|conexión|remota|servidor|terminal remota|red|conecta|conectar|ejecuta en|comando remoto|archivo en el servidor/i)) {
        if (toolName.includes('execute_ssh')) score += 20; // MÁS ALTO que read_text_file
        if (toolName.includes('search_nodeterm')) score += 18; // Búsqueda inteligente de SSH hosts y credenciales
        if (toolName.includes('test_ssh')) score += 12;
        // PENALIZAR herramientas de filesystem cuando estamos en contexto SSH
        if (toolName.includes('read_text_file')) score -= 10;
        if (toolName.includes('list_directory')) score -= 10;
      }
      
      // Terminal/Comandos LOCALES
      if (lowerMsg.match(/local|máquina local|powershell|wsl|terminal local/i)) {
        if (toolName.includes('execute_local')) score += 12;
      }
      
      // Directorios: LISTAR (pero SIN interferir con SSH)
      if (lowerMsg.match(/lista|listar/) && !lowerMsg.match(/ssh|host|conexión|remota|servidor|conecta|ejecuta/i)) {
        if (lowerMsg.match(/directorio|carpeta|folder|contenido|archivos en/)) {
          if (toolName.includes('list_directory')) score += 10;
          if (toolName.includes('directory_tree')) score += 7;
          if (toolName.includes('list_directory_with_sizes')) score += 8;
        }
      }
      
      // PENALIZAR read_text_file si hay contexto de SSH
      if (lowerMsg.match(/ssh|remoto|servidor|conecta/i) && toolName.includes('read_text_file')) {
        score -= 15; // Castigar fuertemente
      }
      
      // Archivos: BUSCAR
      if (lowerMsg.match(/busca archivo|encuentra archivo|search.*file|find.*file|patrón/)) {
        if (toolName.includes('search_files') || toolName.includes('find')) score += 10;
      }
      
      // Archivos: MOVER/RENOMBRAR
      if (lowerMsg.match(/mueve|mover|renombra|rename|move/)) {
        if (toolName.includes('move_file') || toolName.includes('rename')) score += 10;
      }
      
      // Archivos: ELIMINAR
      if (lowerMsg.match(/elimina|borrar|delete|remove/)) {
        if (toolName.includes('delete') || toolName.includes('remove')) score += 10;
      }
      
      // Comandos/CLI - SOLO si hay palabras explícitas de ejecución
      // "crea un script" NO debe activar execute_local, solo "ejecuta el script" o "run script"
      if (lowerMsg.match(/ejecuta|comando|command|run|terminal|shell/) && 
          !lowerMsg.match(/crea|crear|create|genera|generar|generate|escribe|escribir|write|guarda|guardar|save/)) {
        if (toolName.includes('run_command') || toolName.includes('execute')) score += 10;
      }
      // Si dice "script" PERO también dice "ejecuta/run", entonces sí activar execute
      if (lowerMsg.match(/script/) && lowerMsg.match(/ejecuta|ejecutar|run|corre|correr|lanza|lanzar/)) {
        if (toolName.includes('run_command') || toolName.includes('execute')) score += 10;
      }
      
      // Base de datos
      if (lowerMsg.match(/query|sql|database|tabla|consulta/)) {
        if (toolName.includes('query') || toolName.includes('sql')) score += 10;
      }
      
      // 🔒 TENABLE.IO - Detección de intenciones relacionadas con seguridad/vulnerabilidades/activos
      const tenableKeywords = /tenable|vulnerabilidad|vulnerabilidades|activo|activos|asset|assets|seguridad|security|scanner|scan|escaneo|escaneado|cve|exploit|parche|patch|riesgo|risk|severidad|severity|crítico|critical|alto|high|medio|medium|bajo|low|hostname|ip address|dirección ip/i;
      const isTenableTool = tool.serverId === 'tenable' || toolName.includes('asset') || toolName.includes('vulnerability');
      
      if (lowerMsg.match(tenableKeywords) || isTenableTool) {
        // Alta prioridad para herramientas de Tenable cuando se menciona
        if (isTenableTool) {
          if (lowerMsg.match(/lista|listar|muestra|mostrar|obtén|obtener|get|busca|buscar|search|find/i)) {
            if (toolName.includes('get_assets') || toolName.includes('list')) score += 25;
            if (toolName.includes('search_assets')) score += 23;
            if (toolName.includes('get_asset_details')) score += 22;
          }
          if (lowerMsg.match(/vulnerabilidad|vulnerabilidades|vulnerability|cve|exploit|riesgo|risk|severidad|severity/i)) {
            if (toolName.includes('vulnerability') || toolName.includes('vulnerabilities')) score += 25;
            if (toolName.includes('get_asset_details')) score += 20; // Los detalles pueden incluir vulnerabilidades
          }
          if (lowerMsg.match(/detalle|detalles|detail|información|info|específico|specific/i)) {
            if (toolName.includes('get_asset_details')) score += 24;
          }
          // Si es herramienta de Tenable pero no hay keywords específicos, dar score base
          if (isTenableTool && score === 0) {
            score += 15; // Score base para herramientas de Tenable
          }
        }
      }
      
      // Penalizar tools genéricas si hay específicas
      if (toolName === 'write_file' && lowerMsg.includes('edit')) score -= 3;
      if (toolName === 'read_file' && lowerMsg.includes('list')) score -= 3;
      
      return { tool, score };
    });
    
    // Ordenar por score descendente
    toolsWithScore.sort((a, b) => b.score - a.score);
    
    // Tomar las top N más relevantes
    const topTools = toolsWithScore
      .filter(t => t.score > 0) // Solo las que tienen score positivo
      .slice(0, MAX_TOOLS)
      .map(t => t.tool);
    
    // Si no hay tools con score, usar un conjunto mínimo por defecto
    if (topTools.length === 0) {
      const defaultNames = ['read_file', 'list_directory', 'write_file'];
      topTools.push(...tools.filter(t => defaultNames.some(dn => t.name.includes(dn))).slice(0, 3));
    }
    
    // 🔒 CRÍTICO: SIEMPRE incluir herramientas de Tenable si están disponibles
    // Esto asegura que el modelo las conozca y pueda usarlas cuando sea necesario
    const tenableTools = tools.filter(t => t.serverId === 'tenable');
    const hasTenableInTop = topTools.some(t => t.serverId === 'tenable');
    
    if (tenableTools.length > 0 && !hasTenableInTop) {
      // Agregar TODAS las herramientas de Tenable (son solo 4, no afecta mucho el límite)
      // Priorizar get_assets primero, luego las demás
      const sortedTenable = [
        tenableTools.find(t => t.name === 'get_assets'),
        tenableTools.find(t => t.name === 'search_assets'),
        tenableTools.find(t => t.name === 'get_asset_details'),
        tenableTools.find(t => t.name === 'get_asset_vulnerabilities')
      ].filter(Boolean);
      
      // Agregar las que no están ya en topTools
      sortedTenable.forEach(tool => {
        if (!topTools.some(t => t.serverId === tool.serverId && t.name === tool.name)) {
          topTools.unshift(tool); // Agregar al inicio para máxima prioridad
        }
      });
      
      debugLogger.debug('AIService.ToolsFilter', 'Herramientas de Tenable agregadas forzosamente', {
        cantidad: sortedTenable.length,
        herramientas: sortedTenable.map(t => t.name)
      });
    }

    debugLogger.debug('AIService.ToolsFilter', 'Tools filtrados con scoring', {
      disponibles: tools.length,
      relevantes: topTools.length,
      topScores: toolsWithScore.slice(0, 3).map(t => ({ name: t.tool.name, score: t.score }))
    });
    
    return topTools;
  }

  /**
   * Inyectar contexto MCP (tools, resources, prompts) en los mensajes
   */
  async injectMCPContext(message = '') {
    try {
      // Verificar si hay MCPs activos
      if (!mcpClient.hasActiveServers()) {
        return { tools: [], resources: [], prompts: [], hasTools: false };
      }

      // Obtener tools disponibles
      let tools = mcpClient.getAvailableTools();
      const resources = mcpClient.getAvailableResources();
      const prompts = mcpClient.getAvailablePrompts();

      // 🔒 DEBUG: Log de herramientas disponibles antes del filtro
      const tenableToolsBefore = tools.filter(t => t.serverId === 'tenable');
      if (tenableToolsBefore.length > 0) {
        debugLogger.debug('AIService.MCP', 'Herramientas de Tenable disponibles antes del filtro', {
          cantidad: tenableToolsBefore.length,
          herramientas: tenableToolsBefore.map(t => t.name)
        });
      }

      // 🔍 FILTRAR TOOLS (contextual)
      tools = this.filterToolsByContext(tools, message);
      
      // 🔒 DEBUG: Log de herramientas después del filtro
      const tenableToolsAfter = tools.filter(t => t.serverId === 'tenable');
      if (tenableToolsBefore.length > 0 && tenableToolsAfter.length === 0) {
        debugLogger.warn('AIService.MCP', '⚠️ Herramientas de Tenable fueron filtradas completamente', {
          antes: tenableToolsBefore.length,
          despues: 0,
          mensaje: message.substring(0, 100)
        });
      }

      debugLogger.debug('AIService.MCP', 'Contexto MCP generado', {
        tools: tools.length,
        resources: resources.length,
        prompts: prompts.length
      });

      return {
        tools,
        resources,
        prompts,
        hasTools: tools.length > 0
      };
    } catch (error) {
      console.error('[MCP] Error obteniendo contexto MCP:', error);
      return { tools: [], resources: [], prompts: [], hasTools: false };
    }
  }

  /**
   * Obtener lista de directorios permitidos (con caché de 5 minutos)
   */
  async getAllowedDirectoriesCached() {
    try {
      const now = Date.now();
      const TTL_MS = 5 * 60 * 1000; // 5 minutos
      if (this.allowedDirectoriesCache.value && (now - this.allowedDirectoriesCache.fetchedAt) < TTL_MS) {
        return this.allowedDirectoriesCache.value;
      }

      // Llamar a la tool solo si existe en el servidor filesystem
      const tools = mcpClient.getAvailableTools() || [];
      const hasFilesystem = tools.some(t => t.name === 'list_allowed_directories');
      if (!hasFilesystem) return null;

      const result = await mcpClient.callTool('list_allowed_directories', {});
      let dirsText = null;
      if (result && result.content && Array.isArray(result.content) && result.content.length > 0) {
        const text = result.content[0].text || '';
        // Formato esperado: "Allowed directories:\nC:\\path1"
        const match = text.match(/Allowed directories:\s*([\s\S]+)/i);
        if (match) {
          dirsText = match[1].trim();
        }
      }

      this.allowedDirectoriesCache = {
        value: dirsText,
        fetchedAt: now
      };

      if (dirsText) {
        const firstLine = dirsText.split('\n').map(l => l.trim()).find(Boolean);
        if (firstLine) {
          this._setMcpDefaultDir('filesystem', firstLine);
        }
      }
      return dirsText;
    } catch (err) {
      debugLogger.warn('AIService.MCP', 'No se pudieron cachear los directorios permitidos', {
        error: err.message
      });
      return null;
    }
  }

  /**
   * Generar few-shot examples para mejorar comprensión de tools
   * 📚 Los ejemplos ayudan al modelo a entender el uso correcto
   */
  generateToolExamples(tools, provider) {
    // Seleccionar hasta 3 ejemplos representativos
    const exampleTools = tools.slice(0, 3);
    
    if (exampleTools.length === 0) return '';
    
    let examples = '\n🎯 EJEMPLOS DE USO:\n\n';
    
    exampleTools.forEach((tool, idx) => {
      const params = tool.inputSchema?.properties || {};
      const required = tool.inputSchema?.required || [];
      
      // Generar ejemplo de parámetros
      const exampleArgs = {};
      Object.keys(params).forEach(key => {
        if (required.includes(key)) {
          const param = params[key];
          // Generar valor de ejemplo según el tipo
          if (param.type === 'string') {
            if (key === 'path' || key === 'file' || key === 'source' || key === 'destination') {
              exampleArgs[key] = '/ruta/archivo.txt';
            } else if (key === 'content' || key === 'text') {
              exampleArgs[key] = 'contenido del texto';
            } else if (key === 'pattern') {
              exampleArgs[key] = '*.txt';
            } else {
              exampleArgs[key] = 'valor';
            }
          } else if (param.type === 'number' || param.type === 'integer') {
            exampleArgs[key] = 100;
          } else if (param.type === 'boolean') {
            exampleArgs[key] = true;
          } else if (param.type === 'array') {
            exampleArgs[key] = [];
          } else {
            exampleArgs[key] = param.example || 'valor';
          }
        }
      });
      
      const toolName = tool.serverId ? `${tool.serverId}__${tool.name}` : tool.name;
      
      examples += `Ejemplo ${idx + 1}:\n`;
      examples += `Usuario: "${this._generateUserExampleForTool(tool)}"\n`;
      examples += `Tool llamada: ${toolName}\n`;
      examples += `Argumentos: ${JSON.stringify(exampleArgs, null, 2)}\n\n`;
    });
    
    return examples;
  }
  
  /**
   * Generar ejemplo de petición del usuario para una tool
   */
  _generateUserExampleForTool(tool) {
    const name = tool.name;
    
    if (name.includes('list') && name.includes('directory')) {
      return 'Lista los archivos del directorio actual';
    } else if (name.includes('read') && name.includes('file')) {
      return 'Lee el contenido del archivo config.json';
    } else if (name.includes('write') && name.includes('file')) {
      return 'Crea un archivo llamado notas.txt con el texto "Hola mundo"';
    } else if (name.includes('edit') && name.includes('file')) {
      return 'Cambia la línea que dice "version: 1.0" por "version: 2.0"';
    } else if (name.includes('search')) {
      return 'Busca todos los archivos .txt en el directorio';
    } else if (name.includes('create') && name.includes('directory')) {
      return 'Crea una carpeta llamada "proyectos"';
    } else if (name.includes('move')) {
      return 'Mueve el archivo documento.txt a la carpeta backup';
    } else if (name.includes('delete')) {
      return 'Elimina el archivo temporal.tmp';
    } else if (name.includes('get') && name.includes('info')) {
      return 'Dame información del archivo imagen.png';
    }
    
    return `Usa la herramienta ${name}`;
  }

  /**
   * Convertir tools MCP a formato function calling del proveedor
   * ✨ MEJORADO: Enriquece descripciones automáticamente para mejor comprensión
   */
  convertMCPToolsToProviderFormat(tools, provider, options = {}) {
    if (!tools || tools.length === 0) return [];

    return tools.map(tool => {
      // 🔍 Enriquecer descripción automáticamente
      let enrichedDescription = tool.description || `Herramienta ${tool.name}`;
      
      // Agregar contexto de parámetros importantes a la descripción
      if (tool.inputSchema && tool.inputSchema.properties) {
        const params = tool.inputSchema.properties;
        const required = tool.inputSchema.required || [];
        
        // Si hay parámetros requeridos, mencionarlos en la descripción
        if (required.length > 0) {
          const requiredParams = required.map(r => `'${r}'`).join(', ');
          enrichedDescription += `. Requiere: ${requiredParams}`;
        }
        
        // Agregar hints específicos por tipo de tool
        if (tool.name.includes('read') || tool.name.includes('list')) {
          enrichedDescription += '. Use esta herramienta cuando necesite OBTENER o VER información';
        } else if (tool.name.includes('write') || tool.name.includes('create')) {
          enrichedDescription += '. Use esta herramienta cuando necesite CREAR o GUARDAR contenido';
        } else if (tool.name.includes('edit') || tool.name.includes('update') || tool.name.includes('modify')) {
          enrichedDescription += '. Use esta herramienta cuando necesite MODIFICAR contenido existente';
        } else if (tool.name.includes('delete') || tool.name.includes('remove')) {
          enrichedDescription += '. Use esta herramienta cuando necesite ELIMINAR algo';
        } else if (tool.name.includes('search') || tool.name.includes('find')) {
          enrichedDescription += '. Use esta herramienta cuando necesite BUSCAR o ENCONTRAR algo';
        } else if (tool.name.includes('move') || tool.name.includes('rename')) {
          enrichedDescription += '. Use esta herramienta cuando necesite MOVER o RENOMBRAR';
        }
      }

      // Formato común para function calling
      const toolDef = {
        name: (options.namespace ? `${tool.serverId}__${tool.name}` : tool.name),
        description: enrichedDescription,
        parameters: tool.inputSchema || { type: 'object', properties: {} }
      };

      // Adaptar según el proveedor
      if (provider === 'openai') {
        return {
          type: 'function',
          function: toolDef
        };
      } else if (provider === 'anthropic') {
        return {
          name: toolDef.name,
          description: toolDef.description,
          input_schema: toolDef.parameters
        };
      } else if (provider === 'google') {
        return {
          name: toolDef.name,
          description: toolDef.description,
          parameters: toolDef.parameters
        };
      }

      return toolDef;
    });
  }

  /**
   * Generar system prompt UNIVERSAL para MCP (modelos sin function calling)
   * ✨ MEJORADO: Más simple, directo y con ejemplos
   */
  generateUniversalMCPSystemPrompt(tools, options = {}) {
    if (!tools || tools.length === 0) return '';

    const maxPerServer = typeof options.maxPerServer === 'number' ? options.maxPerServer : 6;
    const serverHints = options.serverHints || {};

    // Agrupar tools por servidor
    const serverIdToTools = tools.reduce((acc, t) => {
      const sid = t.serverId || 'unknown';
      if (!acc[sid]) acc[sid] = [];
      acc[sid].push(t);
      return acc;
    }, {});

    let out = '';
    out += 'HERRAMIENTAS DISPONIBLES:\n\n';
    out += 'Formato JSON: {"tool":"<server>__<name>","arguments":{...}}\n';
    out += 'Usa estas herramientas cuando el usuario pida ejecutar comandos, listar archivos, o trabajar con servidores.\n\n';

    const serverIds = Object.keys(serverIdToTools).sort();
    serverIds.forEach((serverId, sidx) => {
      const list = serverIdToTools[serverId] || [];
      const selected = list.slice(0, Math.max(1, maxPerServer));

      out += `[${serverId}]\n`;

      // Hints específicos del servidor (p.ej., filesystem)
      const hints = serverHints[serverId] || {};
      if (hints.allowedDirsText) {
        const lines = String(hints.allowedDirsText).split('\n').map(l => l.trim()).filter(Boolean).slice(0, 2);
        out += `Dirs: ${lines.join(', ')}${lines.length < 2 ? '' : '...'}\n`;
      }
      if (hints.defaultRaw) {
        out += `⚠️ DEFAULT PATH: ${hints.defaultRaw}\n`;
        out += `CRÍTICO: SIEMPRE usa rutas ABSOLUTAS comenzando con este directorio.\n`;
        out += `Ejemplo correcto: "${hints.defaultRaw}\\archivo.txt"\n`;
        out += `Ejemplo INCORRECTO: "archivo.txt" (ruta relativa - NO usar)\n`;
      }

      // Acciones comunes (sólo si es filesystem) - OPTIMIZADO
      if (serverId === 'filesystem') {
        const names = list.map(t => t.name);
        const has = (n) => names.includes(n);
        const actions = [];
        if (has('list_directory')) actions.push('listar→list_directory');
        if (has('read_text_file')) actions.push('leer→read_text_file');
        if (has('write_file')) actions.push('crear→write_file');
        if (has('edit_file')) actions.push('editar→edit_file');
        if (has('move_file')) actions.push('mover→move_file(source,destination con nombre completo)');
        if (has('search_files')) actions.push('buscar→search_files(pattern,path)');
        if (actions.length > 0) {
          out += `Acciones: ${actions.join(', ')}\n`;
        }
      }

      selected.forEach((tool, tidx) => {
        const schema = tool.inputSchema || {};
        const properties = schema.properties || {};
        const required = schema.required || [];
        const keys = Object.keys(properties);

        // Formato compacto: nombre(params) - descripción COMPLETA (sin truncar)
        const reqParams = keys.filter(k => required.includes(k));
        const optParams = keys.filter(k => !required.includes(k));
        const paramsList = [...reqParams, ...optParams.map(p => `${p}?`)];
        
        out += `${tool.name}(${paramsList.join(',')})`;
        if (tool.description) {
          // ✅ Mostrar descripción completa (era 60 caracteres, muy corto)
          out += ` - ${tool.description}`;
        }
        // 🔧 CRÍTICO: Reforzar nombre correcto para search_nodeterm
        if (tool.name === 'search_nodeterm') {
          out += ' ⚠️ NOMBRE CORRECTO: "search_nodeterm" (NO "search_noderm", NO "search_nodeterms")';
        }
        out += '\n';

        // Ejemplo compacto
        const exampleArgs = {};
        reqParams.forEach((p) => {
          const prop = properties[p] || {};
          if (prop.type === 'string') {
            const isPathLike = /path|file|dir|directory/i.test(p);
            if (isPathLike && hints.defaultRaw) {
              const baseRaw = hints.defaultRaw;
              const needsSep = !baseRaw.endsWith('\\') && !baseRaw.endsWith('/');
              if (/dir|directory/i.test(p)) {
                exampleArgs[p] = baseRaw;
              } else {
                const sep = needsSep ? (baseRaw.includes('\\') ? '\\' : '/') : '';
                exampleArgs[p] = `${baseRaw}${sep}file.txt`;
              }
            } else {
              exampleArgs[p] = 'value';
            }
          }
          else if (prop.type === 'array') exampleArgs[p] = [];
          else if (prop.type === 'object') exampleArgs[p] = {};
          else exampleArgs[p] = prop.type === 'number' ? 0 : true;
        });

        if (keys.length > 0) {
          out += `  {"tool":"${serverId}__${tool.name}","arguments":${JSON.stringify(exampleArgs)}}\n`;
        }
      });

      if (sidx < serverIds.length - 1) {
        out += '\n';
      }
    });

    // Ejemplos compactos con rutas absolutas
    out += '\nEJEMPLOS:\n';
    // Usar el defaultRaw si está disponible para filesystem
    const fsHints = serverHints['filesystem'] || {};
    const basePath = fsHints.defaultRaw || 'C:\\path\\to\\dir';
    const sep = basePath.includes('\\') ? '\\' : '/';
    out += `Listar: {"tool":"filesystem__list_directory","arguments":{"path":"${basePath}"}}\n`;
    out += `Leer: {"tool":"filesystem__read_file","arguments":{"path":"${basePath}${sep}config.json"}}\n`;
    out += `Crear: {"tool":"filesystem__write_file","arguments":{"path":"${basePath}${sep}file.txt","content":"texto"}}\n`;
    
    // 🔧 CRÍTICO: Ejemplo explícito para search_nodeterm (NO search_noderm)
    const hasSearchNodeterm = tools.some(t => t.name === 'search_nodeterm');
    if (hasSearchNodeterm) {
      out += `Buscar SSH: {"tool":"ssh-terminal__search_nodeterm","arguments":{"query":"AC68U"}}\n`;
      out += `Listar todos SSH: {"tool":"ssh-terminal__search_nodeterm","arguments":{}}\n`;
      out += '⚠️ IMPORTANTE: El nombre correcto es "search_nodeterm" (NO "search_noderm", NO "search_nodeterms").\n';
      out += '🚫 CRÍTICO: search_nodeterm SOLO debe usarse cuando el usuario EXPLÍCITAMENTE pide buscar, listar o conectar a una conexión SSH. NO lo uses proactivamente ni para sugerencias.\n';
    }
    
    // 🔒 Ejemplos específicos para Tenable.io
    const hasTenableTools = tools.some(t => t.serverId === 'tenable');
    if (hasTenableTools) {
      out += '\n🔒 EJEMPLOS TENABLE.IO:\n';
      out += `Listar activos: {"tool":"tenable__get_assets","arguments":{"limit":"50","offset":"0"}}\n`;
      out += `Buscar activo: {"tool":"tenable__search_assets","arguments":{"search_term":"servidor01","limit":"50"}}\n`;
      out += `Detalles de activo: {"tool":"tenable__get_asset_details","arguments":{"asset_id":"uuid-del-activo"}}\n`;
      out += `Vulnerabilidades: {"tool":"tenable__get_asset_vulnerabilities","arguments":{"asset_id":"uuid-del-activo","severity":"critical","limit":"100"}}\n`;
      out += '⚠️ IMPORTANTE: Cuando el usuario mencione Tenable, vulnerabilidades, activos o seguridad, usa estas herramientas automáticamente.\n';
    }
    
    out += '\nCRÍTICO: USA SIEMPRE RUTAS ABSOLUTAS. NO uses rutas relativas.\n';
    out += '\n🔴 FORMATO DE RESPUESTA - CRÍTICO:\n';
    out += '• Si el objetivo requiere MÚLTIPLES herramientas → Usa formato PLAN: {"plan":[{"tool":"...","arguments":{...}},{"tool":"...","arguments":{...}}]}\n';
    out += '• Si solo necesitas UNA herramienta → {"tool":"<server>__<name>","arguments":{...}}\n';
    out += '• NO preguntes, NO expliques, NO uses campos como "messages" o "response"\n';
    out += '• Solo responde en texto natural cuando hayas completado TODAS las acciones\n';
    out += '• Ejemplo PLAN: {"plan":[{"tool":"ssh-terminal__search_nodeterm","arguments":{"query":"Kepler"}},{"tool":"ssh-terminal__execute_ssh","arguments":{"hostId":"Kepler","command":"free -h"}}]}\n';
    out += '• Ejemplo correcto: {"tool":"ssh-terminal__search_nodeterm","arguments":{"query":"Kepler"}}\n';
    out += '• Ejemplo INCORRECTO: {"messages":["¿Puedo usar search_nodeterm?"]}\n';
    out += '\n⚠️ NOMBRES DE HERRAMIENTAS: Usa EXACTAMENTE los nombres mostrados arriba. NO inventes nombres similares.\n';
    out += '🚫 NO USES HERRAMIENTAS PROACTIVAMENTE: Solo ejecuta herramientas cuando el usuario lo pida explícitamente.\n';
    out += '\n🔴 REGLA CRÍTICA - CREAR vs EJECUTAR:\n';
    out += '• "crea un script" / "crea un archivo" → SOLO usa write_file (NO execute_local)\n';
    out += '• "ejecuta el script" / "run script" / "corre el comando" → USA execute_local\n';
    out += '• "crea y ejecuta" → PRIMERO write_file, LUEGO execute_local\n';
    out += '• Si el usuario SOLO pide CREAR/GENERAR/ESCRIBIR → NO ejecutes comandos automáticamente\n\n';

    return out;
  }

  /**
   * Detectar PLAN de herramientas (modo ReAct) en la respuesta
   * Retorna: { isPlan: true, tools: [{tool, arguments}, ...] } o null
   */
  _detectToolPlan(response) {
    if (!response || typeof response !== 'string') return null;
    
    // Buscar JSON con estructura de plan: {"plan": [...]}
    // Mejorado: buscar también variantes como "tools", "steps", "actions"
    const jsonPatterns = [
      /\{[\s\S]*?"plan"[\s\S]*?\[[\s\S]*?\][\s\S]*?\}/g,
      /\{[\s\S]*?"tools"[\s\S]*?\[[\s\S]*?\][\s\S]*?\}/g,
      /\{[\s\S]*?"steps"[\s\S]*?\[[\s\S]*?\][\s\S]*?\}/g
    ];
    
    let matches = [];
    for (const pattern of jsonPatterns) {
      const found = response.match(pattern);
      if (found) matches = matches.concat(found);
    }
    
    if (!matches || matches.length === 0) return null;
    
    for (const jsonStr of matches) {
      try {
        const data = JSON.parse(jsonStr);
        // Buscar plan, tools, steps, o actions
        const planArray = data.plan || data.tools || data.steps || data.actions;
        
        if (planArray && Array.isArray(planArray) && planArray.length > 0) {
          // Validar que cada elemento del plan tenga tool
          const validTools = planArray.filter(t => {
            if (!t) return false;
            // Aceptar tool, toolName, name, o function
            return !!(t.tool || t.toolName || t.name || t.function);
          });
          
          if (validTools.length > 0) {
            debugLogger.debug('AIService.MCP', 'Plan detectado con herramientas válidas', {
              herramientas: validTools.length,
              formato: data.plan ? 'plan' : (data.tools ? 'tools' : (data.steps ? 'steps' : 'actions'))
            });
            return {
              isPlan: true,
              tools: validTools.map(t => ({
                tool: t.tool || t.toolName || t.name || t.function,
                toolName: t.tool || t.toolName || t.name || t.function,
                arguments: t.arguments || t.args || t.params || {},
                serverId: t.serverId || t.server || null
              }))
            };
          }
        }
      } catch (e) {
        // Intentar extraer JSON más específico si falla el parse completo
        try {
          // Buscar solo el array del plan
          const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
          if (arrayMatch) {
            const arrayData = JSON.parse(arrayMatch[0]);
            if (Array.isArray(arrayData) && arrayData.length > 0) {
              const validTools = arrayData.filter(t => t && (t.tool || t.toolName || t.name));
              if (validTools.length > 0) {
                debugLogger.debug('AIService.MCP', 'Plan detectado (array directo)', {
                  herramientas: validTools.length
                });
                return {
                  isPlan: true,
                  tools: validTools.map(t => ({
                    tool: t.tool || t.toolName || t.name,
                    toolName: t.tool || t.toolName || t.name,
                    arguments: t.arguments || t.args || {},
                    serverId: t.serverId || t.server || null
                  }))
                };
              }
            }
          }
        } catch (e2) {
          continue;
        }
      }
    }
    
    return null;
  }

  /**
   * Ejecutar un PLAN completo de herramientas (modo ReAct)
   */
  async _executeToolPlan(plan, callbacks = {}, modelId = null) {
    debugLogger.debug('AIService.MCP', 'Ejecutando plan de herramientas', {
      herramientas: plan.tools.length
    });
    
    const results = [];
    let lastSearchResult = null; // 🔧 Guardar resultado de search_nodeterm para usar en execute_ssh
    
    for (let i = 0; i < plan.tools.length; i++) {
      const toolSpec = plan.tools[i];
      let toolName = toolSpec.toolName || toolSpec.tool;
      let args = { ...toolSpec.arguments || {} };
      
      debugLogger.debug('AIService.MCP', 'Ejecutando herramienta del plan', {
        indice: i + 1,
        total: plan.tools.length,
        tool: toolName
      });
      
      // 🔧 CRÍTICO: Si es execute_ssh y no tiene hostId, intentar extraerlo del último search_nodeterm
      if ((toolName.includes('execute_ssh') || toolName === 'execute_ssh') && !args.hostId && lastSearchResult) {
        try {
          // Intentar extraer hostId del resultado de search_nodeterm
          const searchText = typeof lastSearchResult === 'string' ? lastSearchResult : 
                            (lastSearchResult?.content?.[0]?.text || JSON.stringify(lastSearchResult));
          
          // Buscar el nombre del servidor en el resultado (ej: "Kepler")
          const queryMatch = plan.tools.find(t => 
            (t.toolName || t.tool || '').includes('search_nodeterm')
          )?.arguments?.query;
          
          if (queryMatch) {
            args.hostId = queryMatch; // Usar el query original como hostId
            debugLogger.debug('AIService.MCP', 'hostId inyectado desde search_nodeterm', {
              hostId: args.hostId,
              query: queryMatch
            });
          } else {
            // Intentar extraer del resultado parseado
            let parsedResult = null;
            try {
              if (typeof lastSearchResult === 'object' && lastSearchResult._originalResult) {
                parsedResult = lastSearchResult._originalResult;
              } else if (typeof searchText === 'string') {
                const jsonMatch = searchText.match(/\{[\s\S]*?"ssh_results"[\s\S]*?\}/);
                if (jsonMatch) {
                  parsedResult = JSON.parse(jsonMatch[0]);
                }
              }
              
              if (parsedResult?.ssh_results?.[0]?.label) {
                args.hostId = parsedResult.ssh_results[0].label;
                debugLogger.debug('AIService.MCP', 'hostId extraído del resultado parseado', {
                  hostId: args.hostId
                });
              } else if (parsedResult?.ssh_results?.[0]?.name) {
                args.hostId = parsedResult.ssh_results[0].name.split('[')[0].trim();
                debugLogger.debug('AIService.MCP', 'hostId extraído del name', {
                  hostId: args.hostId
                });
              }
            } catch (parseError) {
              debugLogger.warn('AIService.MCP', 'Error parseando resultado de search_nodeterm', {
                error: parseError.message
              });
            }
          }
        } catch (error) {
          debugLogger.warn('AIService.MCP', 'Error extrayendo hostId de search_nodeterm', {
            error: error.message
          });
        }
      }
      
      // Normalizar y resolver serverId
      const normalized = this._normalizeFunctionCall(toolName, args);
      const serverId = normalized.serverId;
      const actualToolName = normalized.toolName;
      const callArgs = normalized.arguments;
      
      // Guardar mensaje de tool call
      conversationService.addMessage('assistant_tool_call', `Llamando herramienta: ${actualToolName}`, {
        isToolCall: true,
        toolName: actualToolName,
        toolArgs: callArgs
      });
      
      // Callback de tool ejecutada
      if (callbacks.onToolResult) {
        callbacks.onToolResult({ toolName: actualToolName, args: callArgs, result: null });
      }
      
      try {
        if (!serverId) {
          throw new Error(`No se pudo resolver el servidor para la herramienta ${actualToolName}`);
        }
        
        const result = await mcpClient.callTool(serverId, actualToolName, callArgs);
        const text = result?.content?.[0]?.text || 'OK';
        
        // 🔧 CRÍTICO: Guardar resultado de search_nodeterm para usar en execute_ssh siguientes
        if (actualToolName.includes('search_nodeterm') || actualToolName === 'search_nodeterm') {
          lastSearchResult = result;
        }
        
        const planSummary = summarizeToolResult({
          toolName: actualToolName,
          args: callArgs,
          resultText: text
        });
        
        // Guardar resultado de la tool
        conversationService.addMessage('tool', planSummary, {
          isToolResult: true,
          toolName: actualToolName,
          toolArgs: callArgs,
          toolResultText: text,
          toolResultSummary: planSummary
        });
        rememberToolExecution(conversationService.currentConversationId, actualToolName, callArgs, {
          summary: planSummary,
          rawText: text,
          isError: false
        });
        
        // 🔧 CRÍTICO: Guardar tanto el objeto result completo como el texto
        results.push({ 
          tool: actualToolName, 
          success: true, 
          result: result,  // Objeto completo del MCP
          resultText: text, // Texto extraído
          rawResult: result?.content?.[0]?.text || text // Texto crudo del resultado
        });
        
        debugLogger.debug('AIService.MCP', 'Resultado guardado en plan', {
          tool: actualToolName,
          hasResult: !!result,
          hasResultText: !!text,
          textLength: text?.length || 0
        });
        
        // Callback de tool ejecutada con resultado
        if (callbacks.onToolResult) {
          callbacks.onToolResult({ toolName: actualToolName, args: callArgs, result });
        }
        
        debugLogger.debug('AIService.MCP', 'Herramienta del plan completada', {
          indice: i + 1,
          total: plan.tools.length,
          tool: actualToolName
        });
      } catch (error) {
        const errorMsg = `❌ Error ejecutando ${actualToolName}: ${error.message}`;
        const errorSummary = summarizeToolResult({
          toolName: actualToolName,
          args: callArgs,
          resultText: errorMsg,
          isError: true
        });
        conversationService.addMessage('tool', errorSummary, {
          error: true,
          isToolResult: true,
          toolName: actualToolName,
          toolArgs: callArgs,
          toolResultText: errorMsg,
          toolResultSummary: errorSummary
        });
        results.push({ tool: actualToolName, success: false, error: error.message });
        console.error(`   ❌ [${i + 1}/${plan.tools.length}] ${actualToolName} falló:`, error.message);
      }
    }
    
    debugLogger.debug('AIService.MCP', 'Plan completado', {
      exitosas: results.filter(r => r.success).length,
      total: results.length
    });
    
    // 🔧 CRÍTICO: Después de ejecutar el plan, pedir al modelo que genere una respuesta basada en los resultados
    debugLogger.debug('AIService.MCP', 'Intentando generar respuesta después del plan', {
      resultsCount: results.length,
      successCount: results.filter(r => r.success).length,
      hasCallbacks: !!callbacks,
      hasModelId: !!modelId
    });
    
    const currentConversation = conversationService.getCurrentConversation();
    if (currentConversation && callbacks) {
      const conversationMessages = currentConversation.messages || [];
      const lastUserMessage = conversationMessages.filter(m => m.role === 'user').slice(-1)[0];
      const lastUserGoal = lastUserMessage?.content || '';
      
      // Obtener el último resultado exitoso (normalmente el de execute_ssh)
      const lastSuccessResult = results.filter(r => r.success).slice(-1)[0];
      debugLogger.debug('AIService.MCP', 'Último resultado exitoso', {
        hasResult: !!lastSuccessResult,
        hasResultObj: !!(lastSuccessResult?.result),
        hasResultText: !!(lastSuccessResult?.resultText),
        tool: lastSuccessResult?.tool
      });
      
      if (lastSuccessResult && (lastSuccessResult.result || lastSuccessResult.resultText || lastSuccessResult.rawResult)) {
        // Construir mensaje con el resultado para que el modelo genere una respuesta
        let resultText = '';
        
        // Prioridad 1: rawResult (texto crudo del resultado)
        if (lastSuccessResult.rawResult) {
          resultText = lastSuccessResult.rawResult;
        }
        // Prioridad 2: resultText (texto extraído)
        else if (lastSuccessResult.resultText) {
          resultText = lastSuccessResult.resultText;
        }
        // Prioridad 3: result object
        else if (lastSuccessResult.result) {
          if (typeof lastSuccessResult.result === 'string') {
            resultText = lastSuccessResult.result;
          } else if (lastSuccessResult.result?.content?.[0]?.text) {
            resultText = lastSuccessResult.result.content[0].text;
          } else {
            resultText = JSON.stringify(lastSuccessResult.result, null, 2);
          }
        }
        
        // 🔧 SOLUCIÓN DIRECTA: Si es execute_ssh y el resultado tiene información útil, devolverlo directamente
        if (lastSuccessResult.tool?.includes('execute_ssh') && resultText && resultText.includes('load average')) {
          // Extraer solo la línea con el resultado del comando
          const lines = resultText.split('\n');
          const resultLine = lines.find(l => l.includes('load average') || (l.includes('Mem:') && l.includes('total')));
          if (resultLine) {
            return `El servidor Kepler tiene la siguiente información de RAM:\n\n${resultText.split('\n').filter(l => l.trim().length > 0 && !l.includes('Ejecutado en')).join('\n')}`;
          }
        }
        
        if (resultText && resultText.trim().length > 0) {
          debugLogger.debug('AIService.MCP', 'Resultado extraído, generando respuesta', {
            resultTextLength: resultText.length,
            preview: resultText.substring(0, 200)
          });
          
          const followUpMessages = [
            ...conversationMessages.slice(-5), // Últimos 5 mensajes para contexto
            {
              role: 'user',
              content: `He ejecutado el comando solicitado en el servidor. Resultado:\n\n${resultText}\n\nAhora genera una respuesta natural y útil explicando el resultado al usuario. Incluye información relevante del resultado (ej: valores de memoria, estado del sistema, etc.). Objetivo original: ${lastUserGoal}`
            }
          ];
          
          try {
            // Obtener el modelo actual
            const currentModelId = modelId || this.currentModel?.id;
            if (!currentModelId) {
              debugLogger.warn('AIService.MCP', 'No hay modelo actual para generar respuesta', {
                modelId,
                currentModelId: this.currentModel?.id
              });
              throw new Error('No hay modelo actual');
            }
            
            debugLogger.debug('AIService.MCP', 'Llamando al modelo para generar respuesta', {
              modelId: currentModelId,
              messagesCount: followUpMessages.length
            });
            
            // Llamar al modelo para generar respuesta basada en el resultado
            const modelResponse = await this.sendToLocalModelStreamingWithCallbacks(
              currentModelId,
              followUpMessages,
              callbacks,
              { maxTokens: 800, temperature: 0.7 }
            );
            
            debugLogger.debug('AIService.MCP', 'Respuesta del modelo recibida', {
              hasResponse: !!modelResponse,
              length: modelResponse?.length || 0,
              preview: modelResponse?.substring(0, 100) || '(vacío)'
            });
            
            if (modelResponse && modelResponse.trim().length > 0) {
              return modelResponse;
            } else {
              debugLogger.warn('AIService.MCP', 'Modelo devolvió respuesta vacía');
            }
          } catch (error) {
            debugLogger.error('AIService.MCP', 'Error generando respuesta después del plan', {
              error: error.message,
              stack: error.stack
            });
          }
        } else {
          debugLogger.warn('AIService.MCP', 'No se pudo extraer texto del resultado', {
            hasResult: !!lastSuccessResult.result,
            hasResultText: !!lastSuccessResult.resultText
          });
        }
      }
    }
    
    // Fallback si no se pudo generar respuesta
    const successCount = results.filter(r => r.success).length;
    if (successCount === results.length) {
      return '✅ Operación completada correctamente.';
    } else {
      return `⚠️ Operación completada con ${successCount}/${results.length} herramientas exitosas.`;
    }
  }

  /**
   * Detectar si la respuesta del modelo solicita usar una tool
   */
  detectToolCallInResponse(response) {
    if (!response || typeof response !== 'string') return null;
    
    // NUEVO: Log agresivo para ver la respuesta COMPLETA
    debugLogger.debug('AIService.MCP', 'detectToolCallInResponse entrada', {
      tipo: typeof response,
      length: response?.length,
      muestra: response?.substring(0, 200),
      incluyeTool: response?.includes('"tool"'),
      incluyeLlave: response?.includes('{')
    });
    
    try {
      // Estrategia 1: Bloques explícitos con backticks (```json...```)
      const toolCall = this._extractToolCallFromCodeBlock(response);
      if (toolCall) {
        return toolCall;
      }
      
      // Estrategia 2: JSON flexible en cualquier posición (con preámbulo/epilogo)
      const jsonToolCall = this._extractToolCallFromJSON(response);
      return jsonToolCall;
      
    } catch (error) {
      // Error inesperado en detección
      if (response.trim().startsWith('{') && response.trim().endsWith('}')) {
        debugLogger.debug('AIService.MCP', 'JSON inválido detectado al buscar tool call', {
          error: error.message.substring(0, 100)
        });
      }
      console.error('❌ [AIService] Error detectando tool call:', error.message);
      return null;
    }
  }

  /**
   * Detectar solicitud de PROMPT MCP en respuesta del modelo
   * Formato esperado:
   * {"prompt": {"server":"<serverId>", "name":"<promptName>", "arguments":{...}}}
   */
  detectPromptCallInResponse(response) {
    if (!response || typeof response !== 'string') return null;
    try {
      // Buscar bloque JSON que contenga "prompt": { ... }
      const re = /\{[\s\S]*?"prompt"\s*:\s*\{[\s\S]*?\}[\s\S]*?\}/g;
      const matches = response.match(re);
      if (!matches) return null;
      for (const jsonStr of matches) {
        try {
          const data = JSON.parse(jsonStr);
          const pr = data.prompt;
          if (pr && typeof pr === 'object' && pr.name) {
            return { serverId: pr.server || pr.serverId, promptName: pr.name, arguments: pr.arguments || {} };
          }
        } catch (_) { /* ignore */ }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  async _handlePromptCallAndContinue({ serverId, promptName, arguments: args }, messages, callbacks, options, modelId) {
    try {
      const res = await mcpClient.getPrompt(serverId, promptName, args || {});
      const promptText = res?.result?.content?.[0]?.text || res?.content?.[0]?.text || '';
      const nextMessages = [...messages, { role: 'user', content: promptText }];
      return await this.sendToLocalModelStreamingWithCallbacks(modelId, nextMessages, callbacks, { ...options, maxTokens: Math.max(800, options.maxTokens || 1500) });
    } catch (e) {
      return `Error obteniendo prompt ${promptName} de ${serverId || 'desconocido'}: ${e.message}`;
    }
  }

  /**
   * Convertir JSON Schema a el formato de parámetros de Gemini (tipos en MAYÚSCULAS)
   */
  _toGeminiSchema(schema) {
    if (!schema || typeof schema !== 'object') return { type: 'OBJECT' };

    const upper = (t) => {
      if (!t) return undefined;
      const map = {
        object: 'OBJECT',
        array: 'ARRAY',
        string: 'STRING',
        number: 'NUMBER',
        integer: 'INTEGER',
        boolean: 'BOOLEAN'
      };
      return map[String(t).toLowerCase()] || String(t).toUpperCase();
    };

    const convert = (node) => {
      if (!node || typeof node !== 'object') return node;
      const t = upper(node.type);
      if (t === 'OBJECT') {
        const props = node.properties || {};
        const outProps = {};
        Object.keys(props).forEach((k) => {
          outProps[k] = convert(props[k]);
        });
        return {
          type: 'OBJECT',
          properties: outProps,
          required: Array.isArray(node.required) ? node.required : undefined
        };
      }
      if (t === 'ARRAY') {
        return {
          type: 'ARRAY',
          items: convert(node.items || {})
        };
      }
      // Primitivos
      return { type: t };
    };

    return convert(schema);
  }

  _resolveToolInfo(toolName, serverIdHint = null) {
    // 🔒 DEBUG: Validar entrada
    if (!toolName) {
      debugLogger.warn('AIService.MCP', '_resolveToolInfo recibió toolName vacío', { toolName, serverIdHint });
      return { serverId: null, toolName: toolName || '' };
    }
    
    const tools = mcpClient.getAvailableTools() || [];
    
    // 🔒 ESPECIAL: Si serverIdHint es 'tenable', buscar específicamente en Tenable primero
    if (serverIdHint === 'tenable') {
      const tenableMatch = tools.find(t => t.serverId === 'tenable' && t.name === toolName);
      if (tenableMatch) {
        debugLogger.debug('AIService.MCP', 'Herramienta de Tenable encontrada', { toolName, serverId: 'tenable' });
        return { serverId: 'tenable', toolName: tenableMatch.name };
      }
    }
    
    if (serverIdHint) {
      const match = tools.find(t => t.serverId === serverIdHint && t.name === toolName);
      if (match) {
        return { serverId: match.serverId, toolName: match.name };
      }
    }

    const exactMatches = tools.filter(t => t.name === toolName);
    if (exactMatches.length === 1) {
      return { serverId: exactMatches[0].serverId, toolName: exactMatches[0].name };
    }

    if (exactMatches.length > 1) {
      // 🔒 MEJORADO: Priorizar Tenable si hay múltiples matches
      const tenableMatch = exactMatches.find(t => t.serverId === 'tenable');
      if (tenableMatch) {
        return { serverId: tenableMatch.serverId, toolName: tenableMatch.name };
      }
      return { serverId: exactMatches[0].serverId, toolName: exactMatches[0].name };
    }

    const namespacedMatch = tools.find(t => `${t.serverId}__${t.name}` === toolName);
    if (namespacedMatch) {
      return { serverId: namespacedMatch.serverId, toolName: namespacedMatch.name };
    }

    const filesystemMatch = tools.find(t => t.serverId === 'filesystem' && t.name === toolName);
    if (filesystemMatch) {
      return { serverId: filesystemMatch.serverId, toolName: filesystemMatch.name };
    }
    
    // 🔒 ESPECIAL: Buscar en Tenable si el nombre contiene palabras relacionadas
    if (toolName.includes('asset') || toolName.includes('vulnerability') || toolName.includes('tenable')) {
      const tenableTools = tools.filter(t => t.serverId === 'tenable');
      const tenableMatch = tenableTools.find(t => 
        t.name.includes(toolName) || toolName.includes(t.name)
      );
      if (tenableMatch) {
        debugLogger.debug('AIService.MCP', 'Herramienta de Tenable encontrada por nombre relacionado', { 
          toolName, 
          encontrada: tenableMatch.name 
        });
        return { serverId: 'tenable', toolName: tenableMatch.name };
      }
    }

    // 🔧 NUEVO: Fuzzy matching para nombres similares (corrección automática)
    // Buscar herramientas con nombres similares (útil cuando el modelo genera nombres incorrectos)
    const similarTools = this._findSimilarToolName(toolName, tools);
    if (similarTools.length > 0) {
      const bestMatch = similarTools[0];
      console.warn(`⚠️ [AIService] Tool "${toolName}" no encontrada, usando similar: "${bestMatch.name}"`);
      return { serverId: bestMatch.serverId, toolName: bestMatch.name };
    }

    return { serverId: serverIdHint, toolName };
  }

  /**
   * Encontrar herramientas con nombres similares usando distancia de Levenshtein
   */
  _findSimilarToolName(targetName, tools, maxDistance = 3) {
    if (!targetName || typeof targetName !== 'string' || !tools || tools.length === 0) {
      return [];
    }

    const targetLower = targetName.toLowerCase();
    const candidates = [];

    for (const tool of tools) {
      const toolNameLower = tool.name.toLowerCase();
      
      // Calcular distancia de Levenshtein simple
      const distance = this._levenshteinDistance(targetLower, toolNameLower);
      
      // También verificar si el nombre contiene el target o viceversa
      const containsMatch = toolNameLower.includes(targetLower) || targetLower.includes(toolNameLower);
      
      if (distance <= maxDistance || containsMatch) {
        candidates.push({
          ...tool,
          distance: containsMatch ? Math.min(distance, 1) : distance
        });
      }
    }

    // Ordenar por distancia (menor es mejor)
    candidates.sort((a, b) => a.distance - b.distance);
    
    return candidates;
  }

  /**
   * Calcular distancia de Levenshtein entre dos strings
   */
  _levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // eliminación
            dp[i][j - 1] + 1,     // inserción
            dp[i - 1][j - 1] + 1  // sustitución
          );
        }
      }
    }

    return dp[m][n];
  }

  _normalizeFunctionCall(fullName, rawArgs) {
    debugLogger.debug('AIService.MCP', '_normalizeFunctionCall entrada', { fullName, rawArgs });
    let argsObj;
    if (!rawArgs) {
      argsObj = {};
    } else if (typeof rawArgs === 'string') {
      argsObj = { tool: rawArgs };
    } else {
      argsObj = { ...rawArgs };
    }

    let toolName = argsObj.tool || argsObj.name || fullName;
    let serverId = argsObj.server || argsObj.serverId || null;

    // 🔧 ARREGLO: Manejar nombres namespaced con doble guión bajo (__) O un solo guión bajo (_)
    // El modelo a veces genera ssh-terminal_search_noderm en lugar de ssh-terminal__search_nodeterm
    if (!serverId && typeof fullName === 'string') {
      // Intentar con doble guión bajo primero (formato correcto)
      if (fullName.includes('__')) {
        const idx = fullName.indexOf('__');
        if (idx >= 0) {
          serverId = fullName.slice(0, idx);
          toolName = fullName.slice(idx + 2);
        }
      }
      // Si no se encontró, intentar con un solo guión bajo (formato incorrecto del modelo)
      else if (fullName.includes('_') && !fullName.includes('__')) {
        // Buscar patrones como "ssh-terminal_search_noderm"
        const parts = fullName.split('_');
        if (parts.length >= 2) {
          const possibleServerId = parts[0];
          const possibleBaseName = parts.slice(1).join('_');
          
          // Verificar si existe un servidor con ese ID
          const tools = mcpClient.getAvailableTools() || [];
          const serverExists = tools.some(t => t.serverId === possibleServerId);
          if (serverExists) {
            serverId = possibleServerId;
            toolName = possibleBaseName;
          }
        }
      }
    }

    if (!serverId) {
      const tools = mcpClient.getAvailableTools() || [];
      const matches = tools.filter(t => t.name === toolName);
      if (matches.length === 1) {
        serverId = matches[0].serverId;
      } else if (matches.length > 1) {
        serverId = matches[0].serverId;
      }
    }

    if (!serverId) {
      const fallbackDir = this._getMcpDefaultDir('filesystem');
      if (fallbackDir) {
        serverId = 'filesystem';
      }
    }

    if (!serverId) {
      const tools = mcpClient.getAvailableTools() || [];
      const fsMatch = tools.find(t => t.serverId === 'filesystem' && t.name === toolName);
      if (fsMatch) {
        serverId = 'filesystem';
      }
    }

    if (!serverId) {
      debugLogger.warn('AIService.MCP', '_normalizeFunctionCall sin serverId resuelto', {
        fullName,
        rawArgs,
        toolName,
        argsObj
      });
    }

    // Construir argumentos limpios
    let finalArgs = argsObj.arguments || argsObj.args || argsObj.parameters;
    if (typeof finalArgs === 'string') {
      finalArgs = { tool: finalArgs };
    }

    if (!finalArgs || typeof finalArgs !== 'object' || Array.isArray(finalArgs)) {
      const copy = { ...argsObj };
      delete copy.tool;
      delete copy.name;
      delete copy.server;
      delete copy.serverId;
      delete copy.arguments;
      delete copy.args;
      delete copy.parameters;
      finalArgs = copy;
    } else {
      finalArgs = { ...finalArgs };
    }

    if (finalArgs.arguments && typeof finalArgs.arguments === 'object' && !Array.isArray(finalArgs.arguments)) {
      finalArgs = { ...finalArgs, ...finalArgs.arguments };
      delete finalArgs.arguments;
    }

    if (finalArgs.server || finalArgs.serverId) {
      serverId = serverId || finalArgs.server || finalArgs.serverId;
      delete finalArgs.server;
      delete finalArgs.serverId;
    }

    const nestedTool = finalArgs.tool || finalArgs.toolName;
    if (nestedTool) {
      toolName = nestedTool;
      delete finalArgs.tool;
      delete finalArgs.toolName;
    }

    if (!serverId) {
      const tools = mcpClient.getAvailableTools() || [];
      const matches = tools.filter(t => t.name === toolName);
      if (matches.length === 1) {
        serverId = matches[0].serverId;
      }
    }

    if (!finalArgs || typeof finalArgs !== 'object') {
      finalArgs = {};
    }

    const defaultInfo = serverId ? this._getMcpDefaultDir(serverId) : this._getMcpDefaultDir('filesystem');
    const defaultPath = defaultInfo?.raw || defaultInfo?.normalized || null;
    if (defaultPath) {
      if (['list_directory', 'directory_tree', 'list_directory_with_sizes'].includes(toolName) && !finalArgs.path) {
        finalArgs.path = defaultPath;
      }
      if (toolName === 'read_text_file' && !finalArgs.path) {
        finalArgs.path = defaultPath;
      }
    }

    const resolved = this._resolveToolInfo(toolName, serverId);
    const normalized = { serverId: resolved.serverId, toolName: resolved.toolName, arguments: finalArgs };
    debugLogger.debug('AIService.MCP', '_normalizeFunctionCall salida', normalized);
    return normalized;
  }

  async _handleRemotePostResponse(rawResponse, conversationMessages, mcpContext, callbacks, options, model) {
    let responseText = rawResponse || '';

    if (mcpContext?.hasTools) {
      if (!this._getMcpDefaultDir('filesystem')) {
        try { await this.getAllowedDirectoriesCached(); } catch (_) {}
      }
      const toolCall = this.detectToolCallInResponse(responseText);
      if (toolCall) {
        if (this.toolOrchestrator) {
          try {
            const orchestratorResult = await this.toolOrchestrator.executeLoop({
              modelId: model.id,
              initialToolCall: toolCall,
              baseProviderMessages: conversationMessages,
              detectToolCallInResponse: (resp) => this.detectToolCallInResponse(resp),
              callModelFn: async () => 'Hecho.',
              callbacks,
              options,
              turnId: options?.turnId
            });
            return orchestratorResult;
          } catch (error) {
            console.error('[MCP] Error en loop remoto:', error);
            return `Error ejecutando herramienta: ${error.message}`;
          }
        }

        try {
          const normalized = this._normalizeFunctionCall(toolCall.toolName || toolCall.tool, toolCall.arguments || {});
          const serverId = normalized.serverId;
          const toolName = normalized.toolName;
          const callArgs = normalized.arguments;
          
          conversationService.addMessage('assistant_tool_call', `Llamando herramienta: ${toolName}`, { isToolCall: true, toolName, toolArgs: callArgs });
          const result = serverId ? await mcpClient.callTool(serverId, toolName, callArgs)
                                  : await mcpClient.callTool(toolName, callArgs);
          const text = result?.content?.[0]?.text || 'OK';
          conversationService.addMessage('tool', text, { isToolResult: true, toolName, toolArgs: callArgs });
          return 'Hecho.';
        } catch (error) {
          conversationService.addMessage('tool', `❌ Error ejecutando herramienta: ${error.message}`, { error: true });
          return `Error ejecutando herramienta: ${error.message}`;
        }
      }

      const promptCall = this.detectPromptCallInResponse(responseText);
      if (promptCall) {
        return await this._handlePromptCallAndContinue(promptCall, conversationMessages, callbacks, options, model.id);
      }
    }

    return responseText;
  }

  /**
   * Inferir intención básica del usuario para Filesystem a partir del texto
   */
  _inferFilesystemIntent(text) {
    if (!text || typeof text !== 'string') return null;
    const s = text.toLowerCase();
    if (/(mover|mueve|renombrar|renombra|move|rename)/.test(s)) return 'move';
    if (/(copiar|copia|copy)/.test(s)) return 'copy';
    if (/(borrar|eliminar|borra|remove|delete)/.test(s)) return 'delete';
    if (/(crear carpeta|crear directorio|mkdir|create directory)/.test(s)) return 'mkdir';
    if (/(listar|lista|ver contenido|list)/.test(s)) return 'list';
    if (/(leer|read)/.test(s)) return 'read';
    if (/(editar|edit)/.test(s)) return 'edit';
    return null;
  }

  /**
   * Extraer tool call de bloques de código (```json...```)
   */
  _extractToolCallFromCodeBlock(response) {
    const jsonBlockRegex = /```(?:json|tool|tool_call)?\s*([\s\S]*?)```/gi;
    let match = jsonBlockRegex.exec(response);
    
    while (match) {
      try {
        const jsonContent = match[1].trim();
        const data = JSON.parse(jsonContent);
        const toolCall = this._normalizeToolCall(data);
        if (toolCall) return toolCall;
      } catch (e) {
        // Este bloque no es válido, intentar siguiente
      }
      match = jsonBlockRegex.exec(response);
    }
    
    return null;
  }

  /**
   * Extraer tool call de JSON flexible (en cualquier posición con preámbulo/epilogo)
   */
  _extractToolCallFromJSON(response) {
    // NUEVO: Log para debugging
    debugLogger.debug('AIService.MCP', 'Buscando JSON en respuesta', { length: response.length });
    
    // Buscar JSON que contenga "tool" o "use_tool"
    // Permite preámbulo y epilogo alrededor del JSON
    // FIX: Usar [\s\S]* GREEDY (sin ?) para capturar hasta el ÚLTIMO } del objeto
    const jsonPattern = /\{[\s\S]*?"(?:tool|use_tool)"[\s\S]*\}/g;
    const matches = response.match(jsonPattern);
    
    if (!matches) {
      debugLogger.debug('AIService.MCP', 'No se encontró JSON con tool/use_tool');
      return null;
    }
    
    // Intentar cada JSON encontrado (puede haber múltiples)
    for (let i = 0; i < matches.length; i++) {
      const jsonStr = matches[i];
      debugLogger.debug('AIService.MCP', 'Intentando candidato para tool call', {
        indice: i + 1,
        preview: jsonStr.substring(0, 50).replace(/\n/g, '\\n')
      });
      
      try {
        const data = JSON.parse(jsonStr);
        const toolCall = this._normalizeToolCall(data);
        if (toolCall) {
          debugLogger.debug('AIService.MCP', 'Tool call detectado', { tool: toolCall.toolName });
          return toolCall;
        }
      } catch (e) {
        debugLogger.debug('AIService.MCP', 'JSON inválido durante parseo de tool call', { error: e.message });
        continue;
      }
    }
    
    debugLogger.debug('AIService.MCP', 'Ningún candidato fue un tool call válido');
    return null;
  }

  /**
   * Validar si data es un tool call válido
   */
  _isValidToolCall(data) {
    if (!data || typeof data !== 'object') return false;
    
    const hasToolField = (data.tool && typeof data.tool === 'string') ||
                         (data.use_tool && typeof data.use_tool === 'string');
    
    return hasToolField;
  }

  /**
   * Normalizar tool call a formato estándar
   */
  _normalizeToolCall(data) {
    if (!this._isValidToolCall(data)) return null;
    
    return {
      toolName: data.tool || data.use_tool,
      arguments: data.arguments || {},
      serverId: data.serverId || data.server || null
    };
  }

  /**
   * Manejar loop de tool calls para modelos locales (system prompt)
   * Soporta múltiples iteraciones, re-inyección de resultados, y detección de loops
   */
  async handleLocalToolCallLoop(toolCall, messages, callbacks = {}, options = {}, modelId, maxIterations) {
    let iteration = 0;
    let currentToolCall = toolCall;
    let conversationMessages = [...messages];
    let lastToolName = null;
    let consecutiveRepeats = 0;
    const lastUserGoal = (() => {
      try {
        const reversed = [...messages].reverse();
        const lastUser = reversed.find(m => m && m.role === 'user' && typeof m.content === 'string');
        return lastUser ? lastUser.content : null;
      } catch (_) {
        return null;
      }
    })();
    const inferredIntent = this._inferFilesystemIntent(lastUserGoal || '');
    
    const limit = Number.isFinite(maxIterations) ? Math.max(1, maxIterations) : Infinity;
    const limitInfo = Number.isFinite(limit) ? limit : null;
    
    debugLogger.debug('AIService.MCP', 'Iniciando loop de tool calls', { maxIterations: limitInfo });
    
    while (currentToolCall && iteration < limit) {
      iteration++;
      
      debugLogger.debug('AIService.MCP', 'Iteración de loop tool call', {
        iteration,
        maxIterations: limitInfo,
        tool: currentToolCall.toolName
      });
      
      // NEW: Detect infinite loops (same tool repeated)
      if (lastToolName === currentToolCall.toolName) {
        consecutiveRepeats++;
        debugLogger.warn('AIService.MCP', 'Mismo tool repetido consecutivamente', {
          repeticiones: consecutiveRepeats,
          tool: currentToolCall.toolName
        });
        
        // Si el mismo tool se pide 2 veces seguidas (es decir, 3 veces en total), probablemente es un loop
        if (consecutiveRepeats >= 2) {
          debugLogger.warn('AIService.MCP', 'Loop infinito detectado, deteniendo ejecución', {
            tool: currentToolCall.toolName
          });
          if (callbacks.onStatus) {
            callbacks.onStatus({
              status: 'warning',
              message: `⚠️ Loop infinito detectado (${currentToolCall.toolName} repetido 3 veces)`,
              model: modelId,
              provider: 'local'
            });
          }
          
          // FIX: Return the last meaningful response instead of just breaking
          const lastMessage = conversationMessages[conversationMessages.length - 1];
          const lastContent = lastMessage?.content || '';
          
          return `⚠️ Se detectó un loop infinito con la herramienta "${currentToolCall.toolName}". El modelo solicitó esta herramienta repetidamente sin progresar.

Última respuesta del modelo:
${lastContent}

Por favor, intenta un enfoque diferente o simplifica tu solicitud.`;
        }
      } else {
        consecutiveRepeats = 0;
        lastToolName = currentToolCall.toolName;
      }
      
      // Callback de estado: ejecutando herramienta
      if (callbacks.onStatus) {
        callbacks.onStatus({
          status: 'tool-execution',
          message: `🔧 Ejecutando herramienta: ${currentToolCall.toolName}...`,
          model: modelId,
          provider: 'local',
          toolName: currentToolCall.toolName,
          toolArgs: currentToolCall.arguments,
          iteration,
          maxIterations: limitInfo
        });
      }
      
      try {
        // Ejecutar la tool via MCP (soportar serverId y nombres namespaced)
        let execResult = null;
        let baseName = currentToolCall.toolName;
        let serverIdHint = currentToolCall.serverId || null;

        if (!serverIdHint && typeof baseName === 'string' && baseName.includes('__')) {
          const idx = baseName.indexOf('__');
          const sid = baseName.slice(0, idx);
          const name = baseName.slice(idx + 2);
          if (sid && name) {
            serverIdHint = sid;
            baseName = name;
          }
        }

        // 🔧 CRITICAL FIX: Asegurar que arguments siempre sea un objeto válido
        if (!currentToolCall.arguments || typeof currentToolCall.arguments !== 'object') {
          currentToolCall.arguments = {};
        }

        const defaultInfoLocal = this._getMcpDefaultDir(serverIdHint || 'filesystem');
        const defaultPathLocal = defaultInfoLocal?.raw || defaultInfoLocal?.normalized || null;
        
        // ✅ FIXED: Inyectar path ANTES de validar
        if (defaultPathLocal) {
          if (['list_directory', 'directory_tree', 'list_directory_with_sizes'].includes(baseName) && !currentToolCall.arguments.path) {
            currentToolCall.arguments.path = defaultPathLocal;
            debugLogger.debug('AIService.MCP', 'Path inyectado para herramienta', {
              tool: baseName,
              path: defaultPathLocal
            });
          }
          if (baseName === 'read_text_file' && !currentToolCall.arguments.path) {
            currentToolCall.arguments.path = defaultPathLocal;
            debugLogger.debug('AIService.MCP', 'Path inyectado para herramienta', {
              tool: baseName,
              path: defaultPathLocal
            });
          }
        }

        // 🔍 DEBUG: Validar argumentos antes de ejecutar
        debugLogger.debug('AIService.MCP', 'Ejecutando herramienta', {
          tool: baseName,
          args: currentToolCall.arguments
        });
        
        if (!currentToolCall.arguments || Object.keys(currentToolCall.arguments).length === 0) {
          debugLogger.warn('AIService.MCP', 'Argumentos vacíos para herramienta, puede fallar', {
            tool: baseName
          });
        }

        if (serverIdHint) {
          execResult = await mcpClient.callTool(serverIdHint, baseName, currentToolCall.arguments);
        } else {
          execResult = await mcpClient.callTool(baseName, currentToolCall.arguments);
        }
        const result = (execResult && execResult.success === true && execResult.result) ? execResult.result : execResult;
        
        // Verificar si hubo error en la tool
        if (result.isError) {
          const errorText = result.content?.[0]?.text || 'Error desconocido';
          console.error(`❌ [MCP] ${currentToolCall.toolName} falló:`, errorText);
          
          // ✅ CRÍTICO: Guardar error como tool result con formato correcto
          const formattedErrorText = `❌ Error en ${currentToolCall.toolName}: ${errorText}`;
          if (callbacks && typeof callbacks.onToolResult === 'function') {
            try {
              callbacks.onToolResult({
                toolName: currentToolCall.toolName,
                args: currentToolCall.arguments,
                result: { isError: true, error: errorText, content: [{ text: formattedErrorText }] },
                error: true
              });
            } catch (cbErr) {
              debugLogger.warn('AIService.MCP', 'onToolResult callback lanzó un error al reportar error', {
                error: cbErr?.message
              });
            }
          }
          
          // Callback de error
          if (callbacks.onStatus) {
            callbacks.onStatus({
              status: 'tool-error',
              message: `Error en herramienta ${currentToolCall.toolName}: ${errorText}`,
              model: modelId,
              provider: 'local',
              toolName: currentToolCall.toolName,
              error: errorText
            });
          }
          
          // No devolver inmediatamente, informar al modelo
          conversationMessages.push({
            role: 'user',
            content: `❌ Error ejecutando ${currentToolCall.toolName}: ${errorText}`
          });
          
          // Pedir al modelo que intente de otra forma
          const errorFollowUp = await this.sendToLocalModelStreamingWithCallbacks(
            modelId,
            conversationMessages,
            callbacks,
            { ...options, maxTokens: 500, temperature: 0.3 }
          );
          
          // Detectar si hay otra tool call después del error
          currentToolCall = this.detectToolCallInResponse(errorFollowUp);
          if (!currentToolCall) {
            return errorFollowUp;
          }
          continue;
        }
        
        debugLogger.debug('AIService.MCP', 'Ejecución de herramienta completada', {
          tool: currentToolCall.toolName
        });
        
        // ✅ IMPROVED: Detectar lenguaje para archivos de texto
        let detectedLanguage = '';
        if (baseName === 'read_text_file') {
          const filePath = currentToolCall.arguments?.path || '';
          const ext = filePath.split('.').pop()?.toLowerCase() || '';
          const langMap = {
            'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
            'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c', 'h': 'c', 'hpp': 'cpp',
            'cs': 'csharp', 'php': 'php', 'rb': 'ruby', 'go': 'go', 'rs': 'rust', 'swift': 'swift',
            'kt': 'kotlin', 'scala': 'scala', 'sh': 'bash', 'bash': 'bash', 'zsh': 'bash', 'fish': 'bash',
            'ps1': 'powershell', 'json': 'json', 'yaml': 'yaml', 'yml': 'yaml', 'xml': 'xml',
            'html': 'html', 'htm': 'html', 'css': 'css', 'scss': 'scss', 'sass': 'sass', 'less': 'less',
            'sql': 'sql', 'md': 'markdown', 'mdx': 'markdown', 'txt': 'text', 'log': 'text'
          };
          detectedLanguage = langMap[ext] || '';
        }
        
        // Notificar a la UI con el resultado de la tool
        if (callbacks && typeof callbacks.onToolResult === 'function') {
          try {
            callbacks.onToolResult({
              toolName: currentToolCall.toolName,
              args: currentToolCall.arguments,
              result,
              detectedLanguage,
              filePath: currentToolCall.arguments?.path
            });
          } catch (cbErr) {
            debugLogger.warn('AIService.MCP', 'onToolResult callback lanzó un error', {
              error: cbErr?.message
            });
          }
        }
        
        // Formatear resultado
        const cleanResult = (() => {
          const text = result.content?.[0]?.text || 'OK';
          
          // Operaciones de escritura/modificación
          if (text.includes('Successfully wrote') || text.includes('Successfully created')) {
            return '✅ Archivo creado correctamente';
          }
          if (text.includes('Successfully moved')) {
            return '✅ Archivo movido correctamente';
          }
          if (text.includes('DIFF INDEX') || text.includes('---') || text.includes('```diff')) {
            return '✅ Archivo editado correctamente';
          }
          
          // ✅ NO procesar aquí - dejar para AIChatPanel.js
          // Solo devolver el texto sin formateo para que renderMarkdown lo procese
          if (text.includes('[FILE]') || text.includes('[DIR]')) {
            return text;
          }
          
          // ✅ IMPROVED: Contenido de archivos - detectar lenguaje y formatear como código
          // Detectar extensión si está disponible en los metadatos o por patrones
          if (currentToolCall.toolName === 'read_text_file' || currentToolCall.toolName === 'read_file' || baseName === 'read_text_file') {
            const filePath = currentToolCall.arguments?.path || '';
            const ext = filePath.split('.').pop()?.toLowerCase() || '';
            
            // Map extensiones a lenguajes soportados en markdown
            const langMap = {
              'js': 'javascript',
              'jsx': 'javascript',
              'ts': 'typescript',
              'tsx': 'typescript',
              'py': 'python',
              'java': 'java',
              'cpp': 'cpp',
              'c': 'c',
              'h': 'c',
              'hpp': 'cpp',
              'cs': 'csharp',
              'php': 'php',
              'rb': 'ruby',
              'go': 'go',
              'rs': 'rust',
              'swift': 'swift',
              'kt': 'kotlin',
              'scala': 'scala',
              'sh': 'bash',
              'bash': 'bash',
              'zsh': 'bash',
              'fish': 'bash',
              'ps1': 'powershell',
              'json': 'json',
              'yaml': 'yaml',
              'yml': 'yaml',
              'xml': 'xml',
              'html': 'html',
              'htm': 'html',
              'css': 'css',
              'scss': 'scss',
              'sass': 'sass',
              'less': 'less',
              'sql': 'sql',
              'md': 'markdown',
              'mdx': 'markdown',
              'txt': 'text',
              'log': 'text'
            };
            
            const lang = langMap[ext] || '';
            debugLogger.debug('AIService.MCP', 'Lenguaje detectado para archivo', {
              extension: ext,
              lenguaje: lang
            });
            
            // No añadir bloques de código aquí - se manejan en AIChatPanel.js
            return text;
          }
          
          // Texto general o resultado de otros comandos
          return text;
        })();
        
        // Marcar si el filesystem fue modificado
        const finalOperations = ['write_file', 'edit_file', 'create_directory', 'move_file'];
        if (finalOperations.includes(currentToolCall.toolName)) {
          this._filesystemModified = true;
        }
        
        // NUEVO: Re-inyectar resultado en conversación para que el modelo lo vea
        debugLogger.debug('AIService.MCP', 'Reinyectando resultado en conversación');
        const { observation: toolObservation, summary: toolSummary } = this._buildToolObservation({
          toolName: currentToolCall.toolName,
          args: currentToolCall.arguments,
          resultText: cleanResult,
          isError: !!result.isError,
          lastUserGoal,
          inferredIntent
        });
        conversationMessages.push({
          role: 'user',
          content: toolObservation,
          metadata: { isToolObservation: true, toolName: currentToolCall.toolName }
        });
        
        // Preguntar al modelo si necesita más herramientas
        // Aumentar maxTokens para dar espacio a tool calls encadenados
        const followUp = await this.sendToLocalModelStreamingWithCallbacks(
          modelId,
          conversationMessages,
          callbacks,
          { ...options, maxTokens: Math.max(800, options.maxTokens || 500), temperature: 0.3, contextLimit: Math.min(4096, options.contextLimit || 8000) }
        );
        
        // 🔧 NUEVO: Si la respuesta está vacía, reintentar con prompt simplificado
        if (!followUp || followUp.trim().length === 0) {
          debugLogger.warn('AIService.MCP', 'Modelo generó respuesta vacía tras ejecutar tool; reintentando con prompt simplificado');
          
          conversationMessages.push({
            role: 'user',
            content: `Por favor, responde confirmando que la operación se completó exitosamente o genera el SIGUIENTE tool-call necesario para cumplir el objetivo. ${lastUserGoal ? `Objetivo: ${lastUserGoal}. ` : ''}Recuerda responder sólo con JSON válido cuando uses herramientas.`
          });
          
          const retryResponse = await this.sendToLocalModelStreamingWithCallbacks(
            modelId,
            conversationMessages,
            callbacks,
            { ...options, maxTokens: 1500, temperature: 0.6, contextLimit: Math.min(4096, options.contextLimit || 8000) }
          );
          
          if (retryResponse && retryResponse.trim().length > 0) {
            debugLogger.debug('AIService.MCP', 'Retry exitoso tras respuesta vacía');
            return retryResponse;
          } else {
            debugLogger.warn('AIService.MCP', 'Retry falló después de respuesta vacía, retornando mensaje por defecto');
            return `✅ Operación completada correctamente.`;
          }
        }
        
        // NUEVO: Detectar si hay otro tool call
        const nextToolCall = this.detectToolCallInResponse(followUp);
        
        // 🔧 CRÍTICO: Ignorar tool call si es IDÉNTICO al que acabamos de ejecutar
        // Esto previene loops infinitos cuando el modelo menciona la herramienta anterior
        if (nextToolCall) {
          const isSameTool = nextToolCall.toolName === currentToolCall.toolName;
          const isSameArgs = JSON.stringify(nextToolCall.arguments) === JSON.stringify(currentToolCall.arguments);
          
          if (isSameTool && isSameArgs) {
            debugLogger.warn('AIService.MCP', 'Tool call duplicado detectado; terminando loop', {
              tool: nextToolCall.toolName
            });
            // Retornar la respuesta sin el JSON del tool call
            const cleanResponse = followUp.replace(/\{[\s\S]*?"tool"[\s\S]*?\}/g, '').trim();
            return cleanResponse || `✅ Operación completada correctamente.`;
          }
        }
        
        currentToolCall = nextToolCall;
        
        if (!currentToolCall) {
          // No hay más tools, el modelo respondió normalmente
          debugLogger.debug('AIService.MCP', 'Loop completado, el modelo respondió sin pedir más herramientas');
          
          return followUp;
        }
        
        // Hay otro tool call DIFERENTE, continuar loop
        debugLogger.debug('AIService.MCP', 'Modelo solicita otra herramienta, continuando loop');
        
      } catch (error) {
        debugLogger.error('AIService.MCP', 'Error ejecutando herramienta', {
          tool: currentToolCall.toolName,
          error: error?.message
        });
        
        // Callback de error
        if (callbacks.onStatus) {
          callbacks.onStatus({
            status: 'tool-error',
            message: `Error en herramienta ${currentToolCall.toolName}: ${error.message}`,
            model: modelId,
            provider: 'local',
            toolName: currentToolCall.toolName,
            error: error.message
          });
        }
        
        // Informar error al modelo
        conversationMessages.push({
          role: 'user',
          content: `❌ Error técnico ejecutando ${currentToolCall.toolName}: ${error.message}`
        });
        
        // Dar oportunidad al modelo de responder
        try {
          const errorResponse = await this.sendToLocalModelStreamingWithCallbacks(
            modelId,
            conversationMessages,
            callbacks,
            { ...options, maxTokens: 500, temperature: 0.3, contextLimit: Math.min(2048, options.contextLimit || 8000) }
          );
          return errorResponse;
        } catch (recoveryError) {
          throw new Error(`Error ejecutando herramienta ${currentToolCall.toolName}: ${error.message}`);
        }
      }
    }
    
    const limitReached = Number.isFinite(limit) && iteration >= limit && currentToolCall;
    if (limitReached) {
      debugLogger.warn('AIService.MCP', 'Límite de iteraciones alcanzado en loop de herramientas (local)', {
        maxIterations: limit
      });
      
      if (callbacks.onStatus) {
        callbacks.onStatus({
          status: 'warning',
          message: `Límite de herramientas alcanzado (${limit} iteraciones)`,
          model: modelId,
          provider: 'local'
        });
      }
      
      if (conversationMessages.length > 0) {
        const lastMessage = conversationMessages[conversationMessages.length - 1];
        if (lastMessage.content) {
          return lastMessage.content;
        }
      }
      
      return 'Lo siento, alcancé el límite de uso de herramientas configurado para este modelo.';
    }
    
    return 'Operación completada.';
  }

  /**
   * Enviar mensaje con callbacks de estado
   */
  async sendMessageWithCallbacks(message, callbacks = {}, options = {}) {
    if (!this.currentModel) {
      throw new Error('No se ha seleccionado ningún modelo');
    }

    // Obtener configuración de rendimiento automática
    const perfConfig = this.getModelPerformanceConfig(this.currentModel, this.modelType);
    
    // Combinar opciones con configuración automática
    const finalOptions = {
      ...perfConfig,
      ...options
    };

    // Obtener historial de la conversación actual desde ConversationService
    const currentConversation = conversationService.getCurrentConversation();
    if (!currentConversation) {
      throw new Error('No hay conversación activa');
    }

    // 🔧 VALIDACIÓN DE SINCRONIZACIÓN
    debugLogger.debug('AIService.Conversation', 'Validación de conversación', {
      currentId: currentConversation.id,
      serviceId: conversationService.currentConversationId
    });
    if (currentConversation.id !== conversationService.currentConversationId) {
      debugLogger.warn('AIService.Conversation', 'Desincronización detectada', {
        currentId: currentConversation.id,
        serviceId: conversationService.currentConversationId
      });
    }

    // Obtener mensajes de la conversación actual
    const conversationMessages = currentConversation.messages || [];
    // Considerar "primera conversación" cuando solo hay 1 mensaje (el del usuario que acabamos de agregar)
    const isFirstMessage = conversationMessages.length === 1;
    
    debugLogger.debug('AIService.Conversation', 'Mensajes en conversación actual', {
      total: conversationMessages.length
    });
    
    // 🪟 VENTANA DESLIZANTE INTELIGENTE POR TOKENS (como ChatGPT/Claude)
    const contextualMessages = this._prepareMessagesForContext(conversationMessages);
    let limitedMessages = this.smartTokenBasedHistoryLimit(contextualMessages, finalOptions);
    debugLogger.debug('AIService.Conversation', 'Mensajes después de limitación', {
      total: limitedMessages.length
    });

    // Construir contexto efímero de archivos adjuntos (RAG ligero)
    const attachedFiles = conversationService.getAttachedFiles();
    const ephemeralContext = fileAnalysisService.buildEphemeralContext(attachedFiles, message, {
      maxChars: Math.min(3000, (finalOptions.contextLimit || 8000) / 2)
    });

    // Mensajes a enviar al proveedor (no se guardan como historial visible)
    const providerMessages = [...limitedMessages];
    
    // Si el último mensaje es del usuario, reemplazarlo para evitar duplicados
    if (providerMessages.length > 0 && providerMessages[providerMessages.length - 1].role === 'user') {
      providerMessages[providerMessages.length - 1] = { role: 'user', content: message };
    } else {
      // Si no hay mensaje del usuario al final, agregarlo
      providerMessages.push({ role: 'user', content: message });
    }
    
    // Contexto efímero de archivos adjuntos (debe ir antes del mensaje del usuario)
    // Insertar antes del último mensaje (que es el del usuario)
    if (ephemeralContext && ephemeralContext.length > 0) {
      providerMessages.splice(providerMessages.length - 1, 0, { role: 'system', content: ephemeralContext });
    }

    // Si el filesystem fue modificado, agregar nota para invalidar información anterior
    if (this._filesystemModified) {
      providerMessages.splice(providerMessages.length - 1, 0, {
        role: 'system',
        content: '⚠️ FILESYSTEM MODIFICADO. Archivos/directorios anteriores ya NO son válidos. DEBES ejecutar tools de nuevo para obtener información actualizada.'
      });
      this._filesystemModified = false; // Reset flag
    }

    // Log compacto
    debugLogger.debug('AIService.Conversation', 'Enviando mensajes al modelo', {
      mensajes: providerMessages.length
    });

    // Metadatos para la UI: indicar si se usó contexto efímero y qué archivos
    const ephemeralFilesUsed = (ephemeralContext && ephemeralContext.length > 0)
      ? (attachedFiles || []).map(f => f.name)
      : [];

    const startTime = Date.now();
    
    try {
      let response;
      
      // Callback de inicio
      if (callbacks.onStart) {
        callbacks.onStart({
          model: this.currentModel,
          modelType: this.modelType,
          message: message,
          ephemeralContextUsed: ephemeralContext && ephemeralContext.length > 0,
          ephemeralFilesUsed
        });
      }

      if (this.modelType === 'remote') {
        response = await this.sendToRemoteModelWithCallbacks(message, providerMessages, callbacks, finalOptions);
      } else {
        response = await this.sendToLocalModelWithCallbacks(message, providerMessages, callbacks, finalOptions);
      }

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Callback de finalización
      if (callbacks.onComplete) {
        callbacks.onComplete({
          response,
          latency,
          model: this.currentModel,
          modelType: this.modelType,
          ephemeralContextUsed: ephemeralContext && ephemeralContext.length > 0,
          ephemeralFilesUsed
        });
      }

      return response;
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Callback de error
      if (callbacks.onError) {
        callbacks.onError({
          error,
          latency,
          model: this.currentModel,
          modelType: this.modelType,
          ephemeralContextUsed: ephemeralContext && ephemeralContext.length > 0,
          ephemeralFilesUsed
        });
      }
      
      console.error('Error enviando mensaje a IA:', error);
      throw error;
    }
  }

  /**
   * Validar y leer JSON de forma segura con límites de tamaño
   * Evita que respuestas muy largas causen crash de memoria
   */
  async _safeReadJSON(response, modelId) {
    // Límite de seguridad: 10MB para respuesta JSON
    const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
    
    try {
      // Verificar Content-Length si está disponible
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (size > MAX_RESPONSE_SIZE) {
          debugLogger.warn('AIService.RemoteModel', 'Respuesta excede límite de tamaño', {
            modelId,
            contentLength: size,
            maxAllowed: MAX_RESPONSE_SIZE
          });
          throw new Error(`La respuesta del modelo es demasiado grande (${Math.round(size / 1024 / 1024)}MB). Intenta con una pregunta más específica.`);
        }
      }
      
      // Leer respuesta con timeout de 30 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout al procesar respuesta del modelo (30s)')), 30000)
      );
      
      const data = await Promise.race([
        response.json(),
        timeoutPromise
      ]);
      
      return data;
      
    } catch (error) {
      // Capturar errores de memoria específicos
      if (error.message.includes('out of memory') || 
          error.message.includes('allocation failed') ||
          error.message.includes('JavaScript heap')) {
        debugLogger.error('AIService.RemoteModel', 'Error de memoria al leer JSON', {
          modelId,
          error: error.message
        });
        throw new Error('La respuesta del modelo es demasiado grande y causó un error de memoria. Por favor, intenta con una pregunta más específica o divide tu solicitud en partes más pequeñas.');
      }
      
      throw error;
    }
  }

  /**
   * Procesar respuesta de forma segura con límites de tamaño
   * Evita que respuestas muy largas causen crash de memoria
   */
  async _safeProcessResponse(response, modelProvider, modelId) {
    const MAX_CONTENT_LENGTH = 500000; // ~500k caracteres para el contenido de texto
    
    try {
      // Leer JSON de forma segura
      const data = await this._safeReadJSON(response, modelId);
      
      // Extraer contenido según el proveedor
      let content = '';
      if (modelProvider === 'openai') {
        content = data.choices?.[0]?.message?.content || '';
      } else if (modelProvider === 'anthropic') {
        content = data.content?.[0]?.text || '';
      } else if (modelProvider === 'google') {
        content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
      
      // Verificar tamaño del contenido extraído
      if (content.length > MAX_CONTENT_LENGTH) {
        debugLogger.warn('AIService.RemoteModel', 'Contenido de respuesta muy largo, truncando', {
          modelId,
          originalLength: content.length,
          maxAllowed: MAX_CONTENT_LENGTH
        });
        
        // Truncar de forma inteligente en el último punto o salto de línea antes del límite
        let truncated = content.substring(0, MAX_CONTENT_LENGTH);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastNewline = truncated.lastIndexOf('\n');
        const cutPoint = Math.max(lastPeriod, lastNewline);
        
        if (cutPoint > MAX_CONTENT_LENGTH * 0.8) { // Si el punto está en el último 20%
          truncated = truncated.substring(0, cutPoint + 1);
        }
        
        content = truncated + '\n\n[⚠️ Respuesta truncada por exceder el límite de tamaño. La respuesta original era muy larga.]';
      }
      
      return content;
      
    } catch (error) {
      // Propagar errores ya formateados
      throw error;
    }
  }
  
  /**
   * Truncar contenido de texto si excede límites
   */
  _truncateContent(content, maxLength = 500000) {
    if (!content || content.length <= maxLength) {
      return content;
    }
    
    debugLogger.warn('AIService.RemoteModel', 'Truncando contenido largo', {
      originalLength: content.length,
      maxAllowed: maxLength
    });
    
    // Truncar de forma inteligente
    let truncated = content.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    const cutPoint = Math.max(lastPeriod, lastNewline);
    
    if (cutPoint > maxLength * 0.8) {
      truncated = truncated.substring(0, cutPoint + 1);
    }
    
    return truncated + '\n\n[⚠️ Respuesta truncada por exceder el límite de tamaño. La respuesta original era muy larga.]';
  }

  /**
   * Enviar mensaje a modelo remoto
   */
  async sendToRemoteModel(message, options = {}) {
    const model = this.models.remote.find(m => m.id === this.currentModel);
    if (!model) {
      throw new Error('Modelo remoto no encontrado');
    }

    const apiKey = this.getApiKey(model.provider);
    if (!apiKey) {
      throw new Error(`API Key no configurada para ${model.provider}`);
    }

    // Preparar mensajes según el proveedor
    let requestBody;
    let headers;
    let endpointWithKey = null;

    if (model.provider === 'openai') {
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      
      requestBody = {
        model: model.id,
        messages: this.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: options.stream || false,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000
      };
    } else if (model.provider === 'anthropic') {
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      };
      
      requestBody = {
        model: model.id,
        messages: this.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: options.maxTokens || 2000
      };
    } else if (model.provider === 'google') {
      headers = {
        'Content-Type': 'application/json'
      };
      
      // Gemini usa un formato diferente - necesita el API key como parámetro de query
      endpointWithKey = `${model.endpoint}?key=${apiKey}`;
      
      // Convertir historial de conversación al formato de Gemini
      const contents = this.conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
      
      requestBody = {
        contents: contents,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2000
        }
      };
    }

    try {
      // Usar la URL correcta según el proveedor
      const requestUrl = model.provider === 'google' ? endpointWithKey : model.endpoint;
      
      // Intentar con reintentos para errores 503 (modelo sobrecargado)
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(requestUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
        signal: options.signal
      });

      if (!response.ok) {
        const error = await response.json();
            const errorMessage = error.error?.message || 'Error en la API';
            
            // Si es error 503 (modelo sobrecargado) y no es el último intento, reintentar
            if (response.status === 503 && attempt < 3) {
              debugLogger.warn('AIService.RemoteModel', 'Modelo remoto sobrecargado, reintentando', {
                modelId: model.id,
                intento: attempt,
                delayMs: attempt * 2000
              });
              await new Promise(resolve => setTimeout(resolve, attempt * 2000)); // Esperar 2, 4 segundos
              continue;
            }
            
            throw new Error(errorMessage);
      }

      // 🛡️ USAR PROCESAMIENTO SEGURO para evitar crashes de memoria con respuestas largas
      const content = await this._safeProcessResponse(response, model.provider, model.id);
      return content;
        } catch (error) {
          lastError = error;
          
          // Si es error de modelo sobrecargado y no es el último intento, reintentar
          if (error.message.includes('overloaded') && attempt < 3) {
            debugLogger.warn('AIService.RemoteModel', 'Modelo remoto sobrecargado (mensaje), reintentando', {
              modelId: model.id,
              intento: attempt,
              delayMs: attempt * 2000
            });
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          }
          
          // Si no es el último intento, continuar con el siguiente intento
          if (attempt < 3) {
            continue;
          }
          
          throw error;
        }
      }
      
      throw lastError;
    } catch (error) {
      debugLogger.error('AIService.RemoteModel', 'Error llamando a API remota', {
        modelId: model.id,
        error: error?.message
      });
      
      // Si es error de modelo sobrecargado, intentar con otro modelo del mismo proveedor
      if (error.message.includes('overloaded') || error.message.includes('503') || error.message.includes('The model is overloaded')) {
        debugLogger.warn('AIService.RemoteModel', 'Intentando fallback automático por modelo sobrecargado', {
          modelId: model.id
        });
        
        // Buscar otros modelos del mismo proveedor que no hayan sido intentados
        const alternativeModels = this.models.remote.filter(m => 
          m.provider === model.provider && 
          m.id !== model.id && 
          this.getApiKey(m.provider) // Que tenga API key configurada
        );
        
        if (alternativeModels.length > 0) {
          const fallbackModel = alternativeModels[0];
          debugLogger.info('AIService.RemoteModel', 'Cambiando a modelo fallback', {
            fallbackModel: fallbackModel.name
          });
          
          // Temporalmente cambiar el modelo actual para el fallback
          const originalModel = this.currentModel;
          this.currentModel = fallbackModel.id;
          
          try {
            const result = await this.sendToRemoteModel(message, options);
            
            // Restaurar modelo original
            this.currentModel = originalModel;
            return result;
          } catch (fallbackError) {
            // Restaurar modelo original
            this.currentModel = originalModel;
            console.error('Error en modelo fallback:', fallbackError);
            throw new Error(`Todos los modelos de ${model.provider} están sobrecargados. Por favor, intenta más tarde o cambia a otro proveedor (OpenAI, Anthropic).`);
          }
        }
      }
      
      throw error;
    }
  }

  /**
   * Enviar mensaje a modelo local
   */
  async sendToLocalModel(message, options = {}) {
    const model = this.getAllLocalModels().find(m => m.id === this.currentModel);
    if (!model) {
      throw new Error('Modelo local no encontrado');
    }

    if (!model.downloaded) {
      throw new Error('El modelo local no está descargado');
    }

    // Comunicación con Ollama usando la API /api/chat
    try {
      // Preparar mensajes en el formato que espera Ollama
      const messages = this.conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      const ollamaUrl = this.getOllamaUrl();
      
      // Usar streaming si está habilitado
      if (options.useStreaming) {
        return await this.sendToLocalModelStreaming(model.id, messages, options);
      } else {
        return await this.sendToLocalModelNonStreaming(model.id, messages, options);
      }
    } catch (error) {
      console.error('Error llamando a modelo local:', error);
      
      // Isajes de error más específicos
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('No se pudo conectar con Ollama. Verifica que esté ejecutándose en http://localhost:11434');
      } else if (error.message.includes('404')) {
        throw new Error('Modelo no encontrado en Ollama. Verifica que el modelo esté descargado correctamente.');
      } else {
        throw error;
      }
    }
  }

  /**
   * Enviar mensaje a modelo remoto con callbacks
   */
  async sendToRemoteModelWithCallbacks(message, conversationMessages, callbacks = {}, options = {}) {
    const model = this.models.remote.find(m => m.id === this.currentModel);
    if (!model) {
      throw new Error('Modelo remoto no encontrado');
    }

    const apiKey = this.getApiKey(model.provider);
    if (!apiKey) {
      throw new Error(`API Key no configurada para ${model.provider}`);
    }

    // Callback de estado: conectando
    if (callbacks.onStatus) {
      callbacks.onStatus({
        status: 'connecting',
        message: `Conectando con ${model.name}...`,
        model: model.name,
        provider: model.provider
      });
    }

    try {
      // 🔌 Inyectar tools MCP como function-calling cuando sea posible
      const mcpEnabled = options.mcpEnabled !== false;
      let mcpContext = { tools: [], hasTools: false };
      if (mcpEnabled) {
        try {
          const ctx = await this.injectMCPContext(message);
          mcpContext = { tools: ctx.tools || [], hasTools: (ctx.tools || []).length > 0 };
        } catch (e) {
          debugLogger.warn('AIService.MCP', 'Error obteniendo contexto MCP (remote)', {
            error: e.message
          });
        }
      }
      // Preparar mensajes según el proveedor
      let requestBody;
      let headers;
      let endpointWithKey = null;

      if (model.provider === 'openai') {
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        };
        
        requestBody = {
          model: model.id,
          messages: conversationMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          stream: false,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2000
        };
        if (mcpContext.hasTools) {
          const providerTools = this.convertMCPToolsToProviderFormat(mcpContext.tools, 'openai', { namespace: true });
          if (providerTools.length > 0) {
            requestBody.tools = providerTools;
            
            // ✨ MEJORADO: Configuración inteligente de tool_choice
            // Detectar si la pregunta REQUIERE usar una tool
            const lowerMsg = message.toLowerCase();
            const requiresTool = lowerMsg.match(/lista|lee|crea|busca|muestra|guarda|edita/) && 
                                 lowerMsg.match(/archivo|directorio|carpeta|file/);
            
            if (requiresTool && providerTools.length <= 3) {
              // Si claramente necesita una tool y hay pocas opciones, forzar uso
              requestBody.tool_choice = 'required';
            } else {
              requestBody.tool_choice = 'auto';
            }
            
            // ✨ Ajustar temperatura para mejor precisión con tools
            requestBody.temperature = Math.min(options.temperature || 0.7, 0.3);
            
            // ✨ NUEVO: Agregar few-shot examples como mensaje de sistema
            const examples = this.generateToolExamples(mcpContext.tools, 'openai');
            if (examples && examples.length > 0) {
              // Buscar si ya hay un mensaje de sistema
              const systemMsgIndex = requestBody.messages.findIndex(m => m.role === 'system');
              if (systemMsgIndex >= 0) {
                // Agregar ejemplos al mensaje de sistema existente
                requestBody.messages[systemMsgIndex].content += '\n\n' + examples;
              } else {
                // Crear nuevo mensaje de sistema con ejemplos
                requestBody.messages.unshift({
                  role: 'system',
                  content: 'Usa las herramientas disponibles cuando sea necesario.' + examples
                });
              }
            }
          }
        }
      } else if (model.provider === 'anthropic') {
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        };
        
        requestBody = {
          model: model.id,
          messages: conversationMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          max_tokens: options.maxTokens || 2000
        };
        if (mcpContext.hasTools) {
          const providerTools = this.convertMCPToolsToProviderFormat(mcpContext.tools, 'anthropic', { namespace: true });
          if (providerTools.length > 0) {
            requestBody.tools = providerTools;
            
            // ✨ NUEVO: Agregar few-shot examples como system prompt
            const examples = this.generateToolExamples(mcpContext.tools, 'anthropic');
            if (examples && examples.length > 0) {
              // Anthropic usa un campo 'system' separado
              requestBody.system = 'Usa las herramientas disponibles cuando sea necesario.' + examples;
            }
          }
        }
      } else if (model.provider === 'google') {
        headers = {
          'Content-Type': 'application/json'
        };
        
        endpointWithKey = `${model.endpoint}?key=${apiKey}`;
        
        const contents = conversationMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));
        
        requestBody = {
          contents: contents,
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 2000
          }
        };
        if (mcpContext.hasTools) {
          const providerTools = this.convertMCPToolsToProviderFormat(mcpContext.tools, 'google', { namespace: true }) || [];
          if (providerTools.length > 0) {
            // Gemini espera tools: [{ function_declarations: [ { name, description, parameters } ] }]
            const functionDecls = providerTools.map(fn => ({
              name: fn.name,
              description: fn.description,
              parameters: this._toGeminiSchema(fn.parameters)
            }));
            requestBody.tools = [{ function_declarations: functionDecls }];
            
            // ✨ MEJORADO: Configuración inteligente del modo de function calling
            const lowerMsg = message.toLowerCase();
            const requiresTool = lowerMsg.match(/lista|lee|crea|busca|muestra|guarda|edita/) && 
                                 lowerMsg.match(/archivo|directorio|carpeta|file/);
            
            // Gemini acepta: AUTO, ANY (required), NONE
            const mode = (requiresTool && functionDecls.length <= 3) ? 'ANY' : 'AUTO';
            requestBody.tool_config = { function_calling_config: { mode } };

            // Inyectar prompt universal como systemInstruction con hints (filesystem)
            try {
              const serverHints = {};
              const hasFilesystem = (mcpContext.tools || []).some(t => t.serverId === 'filesystem');
              if (hasFilesystem) {
                const allowedDirsText = await this.getAllowedDirectoriesCached();
                if (allowedDirsText) {
                  const rawLines = String(allowedDirsText).split('\n').map(l => l.trim()).filter(Boolean);
                  let first = rawLines[0] || '';
                  if (/^Allowed directories:/i.test(first)) {
                    first = first.replace(/^Allowed directories:/i, '').trim();
                  }
                  const primaryDirNormalized = first ? first.replace(/\\/g, '/') : null;
                  if (first) {
                    this._setMcpDefaultDir('filesystem', first);
                  }
                  serverHints['filesystem'] = { allowedDirsText, primaryDirNormalized, defaultRaw: first || null };
                }
              }
              const toolsPrompt = this.generateUniversalMCPSystemPrompt(mcpContext.tools, { maxPerServer: 6, serverHints });
              
              // ✨ NUEVO: Agregar few-shot examples para mejorar precisión
              const examples = this.generateToolExamples(mcpContext.tools, 'google');
              const enhancedPrompt = toolsPrompt + examples;
              
              requestBody.systemInstruction = { role: 'system', parts: [{ text: enhancedPrompt }] };
            } catch (_) {}
          }
        }
      }

      // Callback de estado: generando
      if (callbacks.onStatus) {
        callbacks.onStatus({
          status: 'generating',
          message: `Generando respuesta con ${model.name}...`,
          model: model.name,
          provider: model.provider
        });
      }

      // Usar la URL correcta según el proveedor
      const requestUrl = model.provider === 'google' ? endpointWithKey : model.endpoint;
      
      // Intentar con reintentos para errores 503
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Callback de reintento si no es el primer intento
          if (attempt > 1 && callbacks.onStatus) {
            callbacks.onStatus({
              status: 'retrying',
              message: `Reintentando con ${model.name}... (${attempt}/3)`,
              model: model.name,
              provider: model.provider,
              attempt
            });
          }

          const response = await fetch(requestUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            signal: options.signal
          });

          if (!response.ok) {
            const error = await response.json();
            const errorMessage = error.error?.message || 'Error en la API';
            
            if (response.status === 503 && attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, attempt * 2000));
              continue;
            }
            
            throw new Error(errorMessage);
          }

          // 🛡️ LEER JSON DE FORMA SEGURA para evitar crashes de memoria
          const data = await this._safeReadJSON(response, model.id);
          
          // Extraer respuesta y manejar tool-calls cuando aplique
          if (model.provider === 'openai') {
            const choice = data.choices?.[0]?.message || {};
            const toolCalls = choice.tool_calls || [];
            if (mcpContext.hasTools && Array.isArray(toolCalls) && toolCalls.length > 0) {
              // Ejecutar tools solicitadas y re-preguntar
              let followMessages = [...requestBody.messages];
              const executionSummaries = [];
              for (const tc of toolCalls) {
                const fn = tc.function || {};
                const fullName = fn.name || '';
                let args = {};
                try { args = fn.arguments ? JSON.parse(fn.arguments) : fn.arguments || {}; } catch (_) { args = fn.arguments || {}; }
                const normalized = this._normalizeFunctionCall(fullName, args);
                const serverId = normalized.serverId;
                const toolName = normalized.toolName;
                const callArgs = normalized.arguments;
                
                // 🔒 DEBUG: Validar que toolName y serverId estén definidos
                if (!toolName || toolName === 'undefined') {
                  console.error(`❌ [AIService] ERROR: toolName es undefined después de normalizar`, {
                    fullName,
                    args,
                    normalized
                  });
                  executionSummaries.push(`• ERROR: Nombre de herramienta inválido (undefined)`);
                  continue;
                }
                
                if (!serverId) {
                  console.error(`❌ [AIService] ERROR: serverId es undefined después de normalizar`, {
                    fullName,
                    args,
                    normalized
                  });
                  executionSummaries.push(`• ERROR: Servidor MCP no identificado para herramienta ${toolName}`);
                  continue;
                }
                
                const cachedExecution = getRecentToolExecution(conversationService.currentConversationId, toolName, callArgs);
                if (cachedExecution && !cachedExecution.isError) {
                  executionSummaries.push(`• ${toolName}: ${cachedExecution.summary || cachedExecution.rawText}`);
                  continue;
                }
                
                let result;
                try {
                  result = serverId
                    ? await mcpClient.callTool(serverId, toolName, callArgs)
                    : await mcpClient.callTool(toolName, callArgs);
                  const text = result?.content?.[0]?.text || 'OK';
                  rememberToolExecution(conversationService.currentConversationId, toolName, callArgs, {
                    summary: summarizeToolResult({
                      toolName,
                      args: callArgs,
                      resultText: text
                    }),
                    rawText: text,
                    isError: false
                  });
                  executionSummaries.push(`• ${toolName}: ${text.substring(0, 800)}`);
                } catch (e) {
                  rememberToolExecution(conversationService.currentConversationId, toolName, callArgs, {
                    summary: `ERROR ${e.message}`,
                    rawText: e.message,
                    isError: true
                  });
                  executionSummaries.push(`• ${toolName}: ERROR ${e.message}`);
                }
              }
              followMessages.push({ role: 'user', content: `Resultados de herramientas:\n${executionSummaries.join('\n')}\n\nSi necesitas otra herramienta, propón el siguiente tool-call en JSON.` });
              // Segunda llamada para respuesta final (con tools aún registradas)
              requestBody.messages = followMessages;
              const response2 = await fetch(requestUrl, {
                method: 'POST', headers, body: JSON.stringify(requestBody), signal: options.signal
              });
              if (!response2.ok) {
                const e2 = await response2.text();
                throw new Error(e2 || 'Error tras tool calls');
              }
              const data2 = await this._safeReadJSON(response2, model.id);
              let finalText = data2.choices?.[0]?.message?.content || '';
              finalText = this._truncateContent(finalText);
              return await this._handleRemotePostResponse(finalText, conversationMessages, mcpContext, callbacks, options, model);
            }
            let finalText = choice.content || '';
            finalText = this._truncateContent(finalText);
            return await this._handleRemotePostResponse(finalText, conversationMessages, mcpContext, callbacks, options, model);
          } else if (model.provider === 'anthropic') {
            // Búsqueda simple de tool_use en contenido (aprox)
            const content = data.content || [];
            const toolUse = content.find(p => p.type === 'tool_use');
            if (mcpContext.hasTools && toolUse) {
              const normalized = this._normalizeFunctionCall(toolUse.name, toolUse.input || {});
              const serverId = normalized.serverId;
              const toolName = normalized.toolName;
              const callArgs = normalized.arguments;
              const cachedExecution = getRecentToolExecution(conversationService.currentConversationId, toolName, callArgs);
              
              if (cachedExecution && !cachedExecution.isError) {
                const nextBody = { ...requestBody };
                nextBody.messages = [
                  ...requestBody.messages,
                  { role: 'user', content: `Resultado de ${toolName} (reutilizado): ${cachedExecution.summary || cachedExecution.rawText}` }
                ];
                const response2 = await fetch(requestUrl, { method: 'POST', headers, body: JSON.stringify(nextBody), signal: options.signal });
                if (!response2.ok) {
                  const e2 = await response2.text();
                  throw new Error(e2 || 'Error tras tool calls (Anthropic)');
                }
                const data2 = await this._safeReadJSON(response2, model.id);
                let finalText = data2.content?.[0]?.text || '';
                finalText = this._truncateContent(finalText);
                return await this._handleRemotePostResponse(finalText, conversationMessages, mcpContext, callbacks, options, model);
              }
              
              try {
                const result = serverId ? await mcpClient.callTool(serverId, toolName, callArgs)
                                        : await mcpClient.callTool(toolName, callArgs);
                const text = result?.content?.[0]?.text || 'OK';
                rememberToolExecution(conversationService.currentConversationId, toolName, callArgs, {
                  summary: summarizeToolResult({
                    toolName,
                    args: callArgs,
                    resultText: text
                  }),
                  rawText: text,
                  isError: false
                });
                const nextBody = { ...requestBody };
                nextBody.messages = [
                  ...requestBody.messages,
                  { role: 'user', content: `Resultado de ${toolName}: ${text.substring(0, 1000)}` }
                ];
                const response2 = await fetch(requestUrl, { method: 'POST', headers, body: JSON.stringify(nextBody), signal: options.signal });
                if (!response2.ok) {
                  const e2 = await response2.text();
                  throw new Error(e2 || 'Error tras tool calls (Anthropic)');
                }
                const data2 = await this._safeReadJSON(response2, model.id);
                let finalText = data2.content?.[0]?.text || '';
                finalText = this._truncateContent(finalText);
                return await this._handleRemotePostResponse(finalText, conversationMessages, mcpContext, callbacks, options, model);
              } catch (e) {
                rememberToolExecution(conversationService.currentConversationId, toolName, callArgs, {
                  summary: `ERROR ${e.message}`,
                  rawText: e.message,
                  isError: true
                });
                return `Error ejecutando herramienta: ${e.message}`;
              }
            }
            let finalText = data.content?.[0]?.text || '';
            finalText = this._truncateContent(finalText);
            return await this._handleRemotePostResponse(finalText, conversationMessages, mcpContext, callbacks, options, model);
          } else if (model.provider === 'google') {
            // Detectar functionCall y ejecutar tools si aplica
            const candidate = (data.candidates && data.candidates[0]) || {};
            const parts = candidate.content?.parts || candidate.content || [];
            const calls = Array.isArray(parts) ? parts.filter(p => p.functionCall) : [];
            
            // 🔒 DEBUG: Log de function calls de Google
            if (calls.length > 0) {
              console.log(`🔧 [AIService] Google function calls detectados:`, calls.length);
              calls.forEach((call, idx) => {
                console.log(`   Call ${idx}:`, JSON.stringify(call.functionCall || call, null, 2));
              });
            }
            
            if (mcpContext.hasTools && calls.length > 0) {
              // Usar toolOrchestrator para ejecutar herramientas en loop
              if (this.toolOrchestrator && calls.length === 1) {
                const firstCall = calls[0];
                const fc = firstCall.functionCall || {};
                const fullName = fc.name || '';
                
                // 🔒 DEBUG: Validar que fullName no esté vacío
                if (!fullName) {
                  console.error(`❌ [AIService] Google functionCall sin nombre:`, JSON.stringify(fc, null, 2));
                  console.error(`   firstCall completo:`, JSON.stringify(firstCall, null, 2));
                  return `Error: El modelo no proporcionó un nombre de función válido. Function call recibido: ${JSON.stringify(fc)}`;
                }
                
                const normalized = this._normalizeFunctionCall(fullName, fc.args || {});
                
                // 🔒 DEBUG: Validar resultado de normalización
                if (!normalized.toolName || !normalized.serverId) {
                  console.error(`❌ [AIService] Error normalizando function call de Google`, {
                    fullName,
                    fcArgs: fc.args,
                    normalized
                  });
                  return `Error: No se pudo resolver la herramienta "${fullName}". Verifica que el servidor MCP esté activo.`;
                }
                
                const initialToolCall = {
                  toolName: normalized.toolName,
                  arguments: normalized.arguments,
                  serverId: normalized.serverId
                };
                
                try {
                  const orchestratorResult = await this.toolOrchestrator.executeLoop({
                    modelId: model.id,
                    initialToolCall,
                    baseProviderMessages: conversationMessages,
                    detectToolCallInResponse: (resp) => this.detectToolCallInResponse(resp),
                    callModelFn: async (updatedMessages) => {
                      // Re-llamar a Gemini con mensajes actualizados
                      const nextBody = { ...requestBody };
                      nextBody.contents = updatedMessages.map(msg => ({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.content }]
                      }));
                      const response2 = await fetch(requestUrl, { 
                        method: 'POST', 
                        headers, 
                        body: JSON.stringify(nextBody), 
                        signal: options.signal 
                      });
                      if (!response2.ok) {
                        const e2 = await response2.text();
                        throw new Error(e2 || 'Error en llamada secundaria');
                      }
                      const data2 = await response2.json();
                      const cand2 = (data2.candidates && data2.candidates[0]) || {};
                      const parts2 = cand2.content?.parts || cand2.content || [];
                      return Array.isArray(parts2) ? parts2.map(p => p.text).filter(Boolean).join('\n') : '';
                    },
                    callbacks,
                    options,
                    turnId: options?.turnId
                  });
                  return orchestratorResult;
                } catch (error) {
                  console.error('[MCP] Error en loop remoto (Gemini):', error);
                  return `Error ejecutando herramienta: ${error.message}`;
                }
              }
              
              // Fallback: ejecutar todas las tools solicitadas en secuencia
              for (const call of calls) {
                const fc = call.functionCall || {};
                const fullName = fc.name || '';
                const normalized = this._normalizeFunctionCall(fullName, fc.args || {});
                const serverId = normalized.serverId;
                const toolName = normalized.toolName;
                const callArgs = normalized.arguments;
                const cachedExecution = getRecentToolExecution(conversationService.currentConversationId, toolName, callArgs);
                
                conversationService.addMessage('assistant_tool_call', `Llamando herramienta: ${toolName}`, { 
                  isToolCall: true, 
                  toolName, 
                  toolArgs: callArgs 
                });
                
                if (cachedExecution && !cachedExecution.isError) {
                  conversationService.addMessage('tool', cachedExecution.summary || cachedExecution.rawText, { 
                    isToolResult: true, 
                    toolName, 
                    toolArgs: callArgs,
                    toolResultText: cachedExecution.rawText,
                    toolResultSummary: cachedExecution.summary || cachedExecution.rawText
                  });
                  continue;
                }
                
                try {
                  if (!serverId) {
                    throw new Error(`No se pudo resolver el servidor para la herramienta ${toolName}`);
                  }
                  
                  const result = await mcpClient.callTool(serverId, toolName, callArgs);
                  const text = result?.content?.[0]?.text || 'OK';
                  
                  conversationService.addMessage('tool', text, { 
                    isToolResult: true, 
                    toolName, 
                    toolArgs: callArgs 
                  });
                  rememberToolExecution(conversationService.currentConversationId, toolName, callArgs, {
                    summary: summarizeToolResult({
                      toolName,
                      args: callArgs,
                      resultText: text
                    }),
                    rawText: text,
                    isError: false
                  });
                  
                  if (callbacks.onToolResult) {
                    callbacks.onToolResult({ toolName, args: callArgs, result });
                  }
                } catch (e) {
                  const errorMsg = `❌ Error ejecutando herramienta ${toolName}: ${e.message}`;
                  conversationService.addMessage('tool', errorMsg, { error: true });
                  rememberToolExecution(conversationService.currentConversationId, toolName, callArgs, {
                    summary: errorMsg,
                    rawText: errorMsg,
                    isError: true
                  });
                }
              }
              
              return 'Hecho.';
            }
            const text = Array.isArray(parts) ? parts.map(p => p.text).filter(Boolean).join('\n') : '';
            return await this._handleRemotePostResponse(text || '', conversationMessages, mcpContext, callbacks, options, model);
          }
        } catch (error) {
          lastError = error;
          
          if (error.message.includes('overloaded') && attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          }
          
          if (attempt < 3) {
            continue;
          }
          
          throw error;
        }
      }
      
      throw lastError;
    } catch (error) {
      // Callback de error
      if (callbacks.onError) {
        callbacks.onError({
          error,
          model: model.name,
          provider: model.provider
        });
      }
      
      throw error;
    }
  }

  /**
   * Enviar mensaje a modelo local con callbacks
   */
  async sendToLocalModelWithCallbacks(message, conversationMessages, callbacks = {}, options = {}) {
    const model = this.getAllLocalModels().find(m => m.id === this.currentModel);
    if (!model) {
      throw new Error('Modelo local no encontrado');
    }

    if (!model.downloaded) {
      throw new Error('El modelo local no está descargado');
    }

    try {
      let messages = conversationMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : (msg.role === 'system' ? 'system' : 'user'),
        content: msg.content
      }));

      // 🔌 INYECTAR TOOLS MCP EN SYSTEM PROMPT (si no está desactivado)
      const mcpEnabled = options.mcpEnabled !== false; // Por defecto true
      let mcpContext = { tools: [], resources: [], prompts: [], hasTools: false };
      
      if (mcpEnabled) {
        mcpContext = await this.injectMCPContext(message);
        
        if (mcpContext.hasTools) {

          // Construir hints por servidor (filesystem: directorios permitidos)
          const serverHints = {};
          try {
            const hasFilesystem = (mcpContext.tools || []).some(t => t.serverId === 'filesystem');
            if (hasFilesystem) {
              const allowedDirsText = await this.getAllowedDirectoriesCached();
              if (allowedDirsText) {
                const rawLines = String(allowedDirsText).split('\n').map(l => l.trim()).filter(Boolean);
                let first = rawLines[0] || '';
                if (/^Allowed directories:/i.test(first)) {
                  first = first.replace(/^Allowed directories:/i, '').trim();
                }
                const primaryDirNormalized = first ? first.replace(/\\/g, '/') : null;
                if (first) {
                  this._setMcpDefaultDir('filesystem', first);
                }
                serverHints['filesystem'] = {
                  allowedDirsText,
                  primaryDirNormalized,
                  defaultRaw: first || null
                };
              }
            }
          } catch (e) {
            debugLogger.warn('AIService.MCP', 'No se pudieron obtener directorios permitidos', {
              error: e.message
            });
          }

          const toolsPrompt = this.generateUniversalMCPSystemPrompt(mcpContext.tools, { maxPerServer: 6, serverHints });
          
          const systemIndex = messages.findIndex(m => m.role === 'system');
          if (systemIndex >= 0) {
            messages[systemIndex].content += (messages[systemIndex].content.endsWith('\n') ? '' : '\n\n') + toolsPrompt;
          } else {
            messages.unshift({
              role: 'system',
              content: toolsPrompt
            });
          }
        }
      }

      const ollamaUrl = this.getOllamaUrl();
      
      // Callback de estado: conectando
      if (callbacks.onStatus) {
        callbacks.onStatus({
          status: 'connecting',
          message: `Conectando con ${model.name} local...`,
          model: model.name,
          provider: 'local',
          mcpEnabled: mcpContext.hasTools
        });
      }
      
      // 🔧 AJUSTE INTELIGENTE DE TOKENS: El modelo necesita espacio para razonar
      const adjustedOptions = { ...options };
      
      // Calcular tamaño aproximado del contexto actual
      const contextSize = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
      const contextTokens = Math.ceil(contextSize / 4); // Aproximación: 4 chars = 1 token
      
      if (mcpContext.hasTools) {
        // IMPORTANTE: deepseek-r1 es un modelo de reasoning que necesita espacio para pensar
        // 800 tokens es DEMASIADO BAJO, especialmente después de múltiples tool calls
        // Aumentar según el tamaño del contexto:
        const baseTokens = options.maxTokens || 2000;
        const minTokensForTools = 1500; // Mínimo para generar tool calls + razonamiento
        const maxTokensForTools = 3000; // Máximo para evitar respuestas muy largas
        
        // Si el contexto es grande (>6000 tokens), dar más espacio al modelo
        if (contextTokens > 6000) {
          adjustedOptions.maxTokens = maxTokensForTools;
        } else if (contextTokens > 3000) {
          adjustedOptions.maxTokens = 2000;
        } else {
          adjustedOptions.maxTokens = Math.max(minTokensForTools, Math.min(baseTokens, maxTokensForTools));
        }
        
      }
      
      // 🔍 DEBUG: Mostrar qué se envía al modelo
      if (mcpContext.hasTools) {
        const systemMsg = messages.find(m => m.role === 'system');
        if (systemMsg) {
          const promptLength = systemMsg.content.length;
          const promptPreview = systemMsg.content.substring(0, 500);
          debugLogger.debug('AIService.LocalModel', 'Prompt system enviado', {
            length: promptLength,
            tokensAprox: Math.ceil(promptLength / 4),
            preview: promptPreview + '...',
            toolsCount: mcpContext.tools.length
          });
        }
      }
      
      // Usar streaming si está habilitado
      let response;
      if (adjustedOptions.useStreaming) {
        response = await this.sendToLocalModelStreamingWithCallbacks(model.id, messages, callbacks, adjustedOptions);
      } else {
        response = await this.sendToLocalModelNonStreamingWithCallbacks(model.id, messages, callbacks, adjustedOptions);
      }
      
      // 🔍 DEBUG: Mostrar qué responde el modelo
      debugLogger.debug('AIService.LocalModel', 'Respuesta del modelo', {
        isEmpty: !response || response.trim().length === 0,
        length: response?.length || 0,
        preview: response ? response.substring(0, 200) : '(vacío)'
      });
      
      // 🔧 RETRY AUTOMÁTICO: Si la respuesta está vacía, reintentar con prompt simplificado
      if ((!response || response.trim().length === 0) && mcpContext.hasTools) {
        debugLogger.warn('AIService.Toolchain', 'Modelo generó respuesta vacía; reintentando con prompt simplificado');
        
        // Callback de estado: reintentando
        if (callbacks.onStatus) {
          callbacks.onStatus({
            status: 'retrying',
            message: '⚠️ Reintentando solicitud...',
            model: model.name,
            provider: 'local'
          });
        }
        
        // Agregar prompt de ayuda
        const retryMessages = [
          ...messages,
          {
            role: 'user',
            content: 'Por favor, responde usando alguna de las herramientas disponibles o proporciona una respuesta textual.'
          }
        ];
        
        // Reintentar con parámetros ajustados (más tokens para dar espacio al modelo)
        try {
          const retryResponse = await this.sendToLocalModelStreamingWithCallbacks(
            model.id,
            retryMessages,
            callbacks,
            { ...adjustedOptions, maxTokens: 1500, temperature: 0.6 }
          );
          
          if (retryResponse && retryResponse.trim().length > 0) {
            debugLogger.debug('AIService.Toolchain', 'Retry de modelo exitoso', {
              respuestaLength: retryResponse.length
            });
            response = retryResponse;
          } else {
            debugLogger.warn('AIService.Toolchain', 'Retry falló, usando respuesta por defecto');
            return 'Lo siento, tuve problemas al procesar tu solicitud. Por favor, intenta reformularla.';
          }
        } catch (retryError) {
          debugLogger.error('AIService.Toolchain', 'Error durante retry de modelo', {
            error: retryError?.message
          });
          return 'Lo siento, tuve problemas al procesar tu solicitud. Por favor, intenta de nuevo.';
        }
      }
      
      // 🔧 DETECTAR SI LA RESPUESTA ES UN PLAN o TOOL CALL
      if (mcpContext.hasTools) {
        // Prioridad 1: Detectar PLAN (múltiples herramientas)
        const toolPlan = this._detectToolPlan(response);
        if (toolPlan) {
          debugLogger.debug('AIService.Toolchain', 'Plan detectado; ejecutando herramientas', {
            herramientas: toolPlan.tools.length
          });
          return await this._executeToolPlan(toolPlan, callbacks, model.id);
        }
        
        // Prioridad 2: Detectar tool call individual
        const toolCall = this.detectToolCallInResponse(response);
        if (toolCall) {
          debugLogger.info('AIService.Toolchain', 'Tool call detectado; iniciando ejecución', {
            tool: toolCall.toolName,
            structuredToolMessages: this.featureFlags?.structuredToolMessages,
            hasOrchestrator: !!this.toolOrchestrator
          });
          
          if (this.featureFlags?.structuredToolMessages && this.toolOrchestrator) {
            debugLogger.debug('AIService.Toolchain', 'Usando toolOrchestrator.executeLoop');
            const callModelFn = async (provMessages, overrides = {}) => {
              const adjusted = { ...options, ...overrides };
              return await this.sendToLocalModelStreamingWithCallbacks(
                model.id,
                provMessages,
                callbacks,
                adjusted
              );
            };
            const orchestratorResult = await this.toolOrchestrator.executeLoop({
              modelId: model.id,
              initialToolCall: toolCall,
              baseProviderMessages: messages,
              detectToolCallInResponse: (resp) => this.detectToolCallInResponse(resp),
              callModelFn,
              callbacks,
              options,
              turnId: options?.turnId
            });
            debugLogger.debug('AIService.Toolchain', 'toolOrchestrator.executeLoop completado', {
              resultadoLength: orchestratorResult?.length || 0
            });
            return orchestratorResult;
          }
          
          debugLogger.debug('AIService.Toolchain', 'Usando handleLocalToolCallLoop');
          const loopResult = await this.handleLocalToolCallLoop(toolCall, messages, callbacks, options, model.id);
          debugLogger.debug('AIService.Toolchain', 'handleLocalToolCallLoop completado', {
            resultadoLength: loopResult?.length || 0
          });
          return loopResult;
        } else {
          // Si no hay tool, intentar detectar PROMPT MCP
          const promptCall = this.detectPromptCallInResponse(response);
          if (promptCall) {
            debugLogger.debug('AIService.MCP', 'Prompt solicitado por el modelo', {
              prompt: promptCall.promptName,
              server: promptCall.serverId || 'sin server'
            });
            const promptResult = await this._handlePromptCallAndContinue(promptCall, messages, callbacks, options, model.id);
            return promptResult;
          }
          debugLogger.debug('AIService.Toolchain', 'No se detectó tool/prompt call; retornando respuesta directa');
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error llamando a modelo local:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('No se pudo conectar con Ollama. Verifica que esté ejecutándose en http://localhost:11434');
      } else if (error.message.includes('404')) {
        throw new Error('Modelo no encontrado en Ollama. Verifica que el modelo esté descargado correctamente.');
      } else {
        throw error;
      }
    }
  }

  /**
   * Enviar mensaje a modelo local sin streaming
   */
  async sendToLocalModelNonStreaming(modelId, messages, options) {
    const ollamaUrl = this.getOllamaUrl();
    
    // Preparar opciones con configuración (usar valores de options directamente, sin defaults hardcodeados)
    const ollamaOptions = {
      temperature: options.temperature ?? 0.7,
      num_predict: options.maxTokens ?? 4000,
      num_ctx: options.contextLimit ?? 8000,
      top_k: options.top_k ?? 40,
      top_p: options.top_p ?? 0.9,
      repeat_penalty: options.repeat_penalty ?? 1.1
    };
    
    // Preparar el body completo que se enviará a Ollama
    const requestBody = {
      model: modelId,
      messages: messages,
      stream: false,
      options: ollamaOptions
    };
    
    // Log compacto
    
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: options.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLogger.error('AIService.LocalModel', 'Error de Ollama', {
        error: errorText
      });
      throw new Error(`Error del servidor Ollama (${response.status})`);
    }

    const data = await response.json();
    
    // NUEVO: Log detallado de respuesta
    debugLogger.debug('AIService.LocalModel', 'Respuesta cruda de Ollama', {
      resumida: JSON.stringify(data).substring(0, 200),
      message: data.message,
      contentLength: data.message?.content?.length || 0,
      hasReasoning: !!(data.message?.reasoning_content || data.reasoning_content)
    });
    
    // ✅ CAPTURAR REASONING UNIVERSAL: Buscar reasoning en TODOS los modelos
    // Ollama puede devolver reasoning en diferentes campos según el modelo
    const reasoningContent = data.message?.reasoning_content || 
                             data.reasoning_content || 
                             data.message?.reasoning ||
                             data.reasoning ||
                             data.message?.thinking ||
                             data.thinking ||
                             data.message?.chain_of_thought ||
                             data.chain_of_thought ||
                             null;
    
    // 🔍 DEBUG: Log solo para modelos reasoning conocidos o cuando se detecta reasoning
    const isReasoningModel = modelId && (modelId.includes('deepseek-r1') || modelId.includes('o1') || modelId.includes('reasoning'));
    if (isReasoningModel || reasoningContent) {
      if (data.message) {
        const messageKeys = Object.keys(data.message);
        debugLogger.debug('AIService.Reasoning', 'Respuesta completa de Ollama (non-streaming)', {
          model: modelId,
          messageKeys: messageKeys,
          hasReasoning: !!reasoningContent,
          reasoningLength: reasoningContent ? reasoningContent.length : 0,
          allKeys: Object.keys(data),
          preview: JSON.stringify(data).substring(0, 500)
        });
      }
    }
    
    // La respuesta de Ollama viene en data.message.content
    if (data.message && data.message.content) {
      // Si hay callbacks y hay reasoning, notificarlo
      if (callbacks && callbacks.onReasoning && reasoningContent) {
        callbacks.onReasoning({
          reasoning: reasoningContent,
          model: modelId,
          provider: 'local',
          isComplete: true
        });
      }
      return data.message.content;
    } else {
      debugLogger.error('AIService.LocalModel', 'Respuesta vacía o inválida de Ollama', {
        message: data.message,
        content: data.message?.content
      });
      throw new Error('Respuesta inválida del modelo local');
    }
  }

  /**
   * Enviar mensaje a modelo local con streaming
   */
  async sendToLocalModelStreaming(modelId, messages, options) {
    const ollamaUrl = this.getOllamaUrl();
    
    // ✅ NUEVO: Contexto dinámico basado en RAM disponible
    const systemMem = this.memoryService.getSystemMemory();
    const dynamicContext = this._calcDynamicContext(systemMem.freeMB);
    
    // Preparar opciones con configuración (usar valores de options directamente, sin defaults hardcodeados)
    const ollamaOptions = {
      temperature: options.temperature ?? 0.7,
      num_predict: options.maxTokens ?? 4000,
      num_ctx: options.contextLimit ?? dynamicContext, // ✅ Dinámico
      top_k: options.top_k ?? 40,
      top_p: options.top_p ?? 0.9,
      repeat_penalty: options.repeat_penalty ?? 1.1
    };
    
    // Preparar el body completo que se enviará a Ollama
    const requestBody = {
      model: modelId,
      messages: messages,
      stream: true,
      options: ollamaOptions
    };
    
    // Log compacto
    
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: options.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Ollama:', errorText);
      throw new Error(`Error del servidor Ollama (${response.status})`);
    }

    // Leer el stream de respuesta
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message && data.message.content) {
              fullResponse += data.message.content;
            }
          } catch (e) {
            // Ignorar líneas que no sean JSON válido
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }

  /**
   * Enviar mensaje a modelo local con streaming y callbacks
   */
  async sendToLocalModelStreamingWithCallbacks(modelId, messages, callbacks = {}, options = {}) {
    const ollamaUrl = this.getOllamaUrl();
    
    // Preparar opciones que se enviarán a Ollama (usar valores de options directamente)
    const ollamaOptions = {
      temperature: options.temperature ?? 0.7,
      num_predict: options.maxTokens ?? 4000,
      num_ctx: options.contextLimit ?? 8000,
      top_k: options.top_k ?? 40,
      top_p: options.top_p ?? 0.9,
      repeat_penalty: options.repeat_penalty ?? 1.1
    };
    
    // 🔍 DEBUG: Verificar si es un modelo reasoning
    const isReasoningModel = modelId && (modelId.includes('deepseek-r1') || modelId.includes('o1') || modelId.includes('reasoning'));
    if (isReasoningModel) {
      debugLogger.debug('AIService.Reasoning', 'Modelo reasoning detectado en streaming, esperando reasoning_content', {
        model: modelId
      });
    }
    
    // Preparar el body completo que se enviará a Ollama
    const requestBody = {
      model: modelId,
      messages: messages,
      stream: true,
      options: ollamaOptions
    };
    
    // Log compacto
    
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: options.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Ollama:', errorText);
      throw new Error(`Error del servidor Ollama (${response.status})`);
    }

    // Callback de estado: generando
    if (callbacks.onStatus) {
      callbacks.onStatus({
        status: 'generating',
        message: 'Generando respuesta...',
        model: modelId,
        provider: 'local'
      });
    }

    // Leer el stream de respuesta
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let reasoningContent = ''; // ✅ ACUMULAR REASONING durante streaming

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            // ✅ CAPTURAR REASONING UNIVERSAL: Buscar reasoning en TODOS los modelos
            // Ollama puede devolver reasoning en diferentes campos según el modelo
            const reasoningChunk = data.message?.reasoning_content || 
                                   data.reasoning_content || 
                                   data.message?.reasoning ||
                                   data.reasoning ||
                                   data.message?.thinking ||
                                   data.thinking ||
                                   data.message?.chain_of_thought ||
                                   data.chain_of_thought ||
                                   null;
            
            if (reasoningChunk && typeof reasoningChunk === 'string' && reasoningChunk.trim().length > 0) {
              reasoningContent += reasoningChunk;
              // Notificar reasoning incremental si hay callback
              if (callbacks.onReasoning) {
                callbacks.onReasoning({
                  reasoning: reasoningContent,
                  model: modelId,
                  provider: 'local',
                  isComplete: false
                });
              }
            }
            
            // 🔍 DEBUG: Log solo para modelos reasoning conocidos o cuando se detecta reasoning
            const isReasoningModel = modelId && (modelId.includes('deepseek-r1') || modelId.includes('o1') || modelId.includes('reasoning'));
            if (isReasoningModel || reasoningChunk) {
              if (data.message && Object.keys(data.message).length > 0) {
                const messageKeys = Object.keys(data.message);
                debugLogger.debug('AIService.Reasoning', 'Campos detectados en streaming', {
                  model: modelId,
                  keys: messageKeys,
                  hasReasoning: !!reasoningChunk,
                  reasoningLength: reasoningChunk ? reasoningChunk.length : 0,
                  preview: JSON.stringify(data.message).substring(0, 200)
                });
              }
            }
            
            if (data.message && data.message.content) {
              fullResponse += data.message.content;
              
              // Callback de streaming
              if (callbacks.onStream) {
                callbacks.onStream({
                  content: data.message.content,
                  fullResponse,
                  model: modelId,
                  provider: 'local'
                });
              }
            }
          } catch (e) {
            // Ignorar líneas que no sean JSON válido
          }
        }
      }
      
      // ✅ NOTIFICAR REASONING COMPLETO al finalizar streaming
      if (reasoningContent && callbacks.onReasoning) {
        callbacks.onReasoning({
          reasoning: reasoningContent,
          model: modelId,
          provider: 'local',
          isComplete: true
        });
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }

  /**
   * Enviar mensaje a modelo local sin streaming con callbacks
   */
  async sendToLocalModelNonStreamingWithCallbacks(modelId, messages, callbacks = {}, options = {}) {
    const ollamaUrl = this.getOllamaUrl();
    
    // Preparar opciones que se enviarán a Ollama (usar valores de options directamente)
    const ollamaOptions = {
      temperature: options.temperature ?? 0.7,
      num_predict: options.maxTokens ?? 4000,
      num_ctx: options.contextLimit ?? 8000,
      top_k: options.top_k ?? 40,
      top_p: options.top_p ?? 0.9,
      repeat_penalty: options.repeat_penalty ?? 1.1
    };
    
    // Preparar el body completo que se enviará a Ollama
    const requestBody = {
      model: modelId,
      messages: messages,
      stream: false,
      options: ollamaOptions
    };
    
    // Log compacto
    
    // Callback de estado: generando
    if (callbacks.onStatus) {
      callbacks.onStatus({
        status: 'generating',
        message: 'Generando respuesta...',
        model: modelId,
        provider: 'local'
      });
    }

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: options.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Ollama:', errorText);
      throw new Error(`Error del servidor Ollama (${response.status})`);
    }

    const data = await response.json();
    
    // ✅ CAPTURAR REASONING UNIVERSAL: Buscar reasoning en TODOS los modelos
    // Ollama puede devolver reasoning en diferentes campos según el modelo
    const reasoningContent = data.message?.reasoning_content || 
                             data.reasoning_content || 
                             data.message?.reasoning ||
                             data.reasoning ||
                             data.message?.thinking ||
                             data.thinking ||
                             data.message?.chain_of_thought ||
                             data.chain_of_thought ||
                             null;
    
    // 🔍 DEBUG: Log solo para modelos reasoning conocidos o cuando se detecta reasoning
    const isReasoningModel = modelId && (modelId.includes('deepseek-r1') || modelId.includes('o1') || modelId.includes('reasoning'));
    if (isReasoningModel || reasoningContent) {
      if (data.message) {
        const messageKeys = Object.keys(data.message);
        debugLogger.debug('AIService.Reasoning', 'Respuesta completa de Ollama (non-streaming with callbacks)', {
          model: modelId,
          messageKeys: messageKeys,
          hasReasoning: !!reasoningContent,
          reasoningLength: reasoningContent ? reasoningContent.length : 0,
          allKeys: Object.keys(data),
          preview: JSON.stringify(data).substring(0, 500)
        });
      }
    }
    
    // Si hay callbacks y hay reasoning, notificarlo
    if (callbacks && callbacks.onReasoning && reasoningContent) {
      callbacks.onReasoning({
        reasoning: reasoningContent,
        model: modelId,
        provider: 'local',
        isComplete: true
      });
    }
    
    // La respuesta de Ollama viene en data.message.content
    if (data.message && data.message.content) {
      return data.message.content;
    } else {
      throw new Error('Respuesta inválida del modelo local');
    }
  }

  /**
   * Descargar modelo local usando Ollama
   */
  async downloadLocalModel(modelId, onProgress = null) {
    const model = this.getAllLocalModels().find(m => m.id === modelId);
    if (!model) {
      throw new Error('Modelo no encontrado');
    }

    try {
       // Usar la API de Ollama para descargar el modelo
       const ollamaUrl = this.getOllamaUrl();
       const response = await fetch(`${ollamaUrl}/api/pull`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
        body: JSON.stringify({
          name: modelId,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error de Ollama al descargar:', errorText);
        throw new Error(`Error descargando modelo (${response.status})`);
      }

      // Leer el stream de respuesta para mostrar progreso
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let downloadComplete = false;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          downloadComplete = true;
          break;
        }

        // Decodificar el chunk y procesar el progreso
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            // Llamar callback de progreso si está disponible
            if (onProgress && data.status) {
              const progress = {
                status: data.status,
                total: data.total,
                completed: data.completed,
                percent: data.total ? (data.completed / data.total) * 100 : 0
              };
              onProgress(progress);
            }
            
            // Verificar si la descarga está completa
            if (data.status === 'success' || data.status === 'complete') {
              downloadComplete = true;
            }
          } catch (e) {
            // Ignorar líneas que no sean JSON válido
          }
        }
      }

      if (downloadComplete) {
        // Marcar como descargado
        model.downloaded = true;
        this.saveConfig();
        
        // Refrescar la lista de modelos instalados
        await this.detectOllamaModels();
        
        return true;
      } else {
        throw new Error('La descarga no se completó correctamente');
      }
    } catch (error) {
      console.error('Error descargando modelo local:', error);
      
      if (error.message.includes('Failed to fetch')) {
        throw new Error('No se pudo conectar con Ollama. Verifica que esté ejecutándose.');
      }
      
      throw error;
    }
  }

  /**
   * Eliminar modelo local
   */
  async deleteLocalModel(modelId) {
    const model = this.getAllLocalModels().find(m => m.id === modelId);
    if (!model) {
      throw new Error('Modelo no encontrado');
    }

    try {
       // Eliminar modelo usando Ollama
       const ollamaUrl = this.getOllamaUrl();
       const response = await fetch(`${ollamaUrl}/api/delete`, {
         method: 'DELETE',
         headers: {
           'Content-Type': 'application/json'
         },
        body: JSON.stringify({
          name: modelId
        })
      });

      if (!response.ok) {
        throw new Error('Error eliminando modelo');
      }

      // Marcar como no descargado
      model.downloaded = false;
      this.saveConfig();

      return true;
    } catch (error) {
      console.error('Error eliminando modelo local:', error);
      throw error;
    }
  }

  /**
   * Limpiar historial de conversación
   */
  clearHistory() {
    this.conversationHistory = [];
    this._filesystemModified = false; // Reset flag al limpiar historial
  }

  /**
   * Obtener historial de conversación
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * Cargar historial desde localStorage
   */
  loadHistory(conversationId) {
    try {
      const histories = JSON.parse(localStorage.getItem('ai-conversations') || '{}');
      this.conversationHistory = histories[conversationId] || [];
    } catch (error) {
      debugLogger.error('AIService.History', 'Error cargando historial', {
        error: error?.message
      });
    }
  }

  /**
   * Guardar historial en localStorage
   */
  saveHistory(conversationId) {
    try {
      const histories = JSON.parse(localStorage.getItem('ai-conversations') || '{}');
      histories[conversationId] = this.conversationHistory;
      localStorage.setItem('ai-conversations', JSON.stringify(histories));
    } catch (error) {
      debugLogger.error('AIService.History', 'Error guardando historial', {
        error: error?.message
      });
    }
  }

  _prepareMessagesForContext(messages = []) {
    if (!Array.isArray(messages)) return [];
    const MAX_FULL_CONTEXT_CHARS = 4000;
    
    return messages.map((msg) => {
      if (!msg || typeof msg !== 'object') return msg;
      const metadata = msg.metadata || {};
      const clone = { ...msg };
      if (metadata.isToolResult) {
        const toolName = (metadata.toolName || '').toLowerCase();
        if (TOOLS_REQUIRE_FULL_CONTEXT.has(toolName)) {
          const raw = metadata.toolResultText || clone.content || '';
          clone.content = raw.slice(0, MAX_FULL_CONTEXT_CHARS);
          return clone;
        }
        const summary = metadata.toolResultSummary || summarizeToolResult({
          toolName: metadata.toolName || 'tool',
          args: metadata.toolArgs || {},
          resultText: metadata.toolResultText || clone.content || '',
          isError: metadata.error === true,
          maxResultChars: 240
        });
        clone.content = summary;
        return clone;
      }
      if (metadata.isToolObservation && typeof clone.content === 'string') {
        clone.content = clone.content.trim();
        return clone;
      }
      return clone;
    });
  }

  _buildToolObservation({ toolName, args, resultText, isError, lastUserGoal, inferredIntent }) {
    const summary = summarizeToolResult({
      toolName,
      args,
      resultText,
      isError,
      maxResultChars: 320
    });

    const readableName = toolName || 'herramienta';
    const lines = [
      `${isError ? '⚠️' : '🔧'} ${isError ? 'Error en' : 'Resultado de'} ${readableName}`,
      summary
    ];

    if (lastUserGoal) {
      lines.push(`🎯 Objetivo del usuario: ${lastUserGoal}`);
    }

    if (!isError && inferredIntent === 'move') {
      lines.push('PISTA: Si ya ves el origen y el destino en el resultado anterior, usa la herramienta "move_file" con los parámetros EXACTOS del schema (from/to, source/destination u old/new).');
    }
    
    if (toolName && TOOLS_REQUIRE_FULL_CONTEXT.has(toolName.toLowerCase())) {
      const raw = (resultText || '').trim();
      if (raw.length > 0) {
        lines.push('📋 Detalle completo:\n' + raw.slice(0, 4000));
      }
    }

    if (isError) {
      lines.push('Describe claramente el fallo y propone al usuario el siguiente paso o sugiere otra herramienta con JSON válido si es necesario.');
    } else {
      // CRÍTICO: Si el objetivo requiere más acciones, genera el tool call DIRECTAMENTE
      // NO generes texto explicativo como "He encontrado..." o "Ahora ejecutaré..."
      // Si necesitas otra herramienta → SOLO genera el JSON del tool call, sin texto
      if (lastUserGoal) {
        const goalLower = lastUserGoal.toLowerCase();
        const hasMultipleActions = /\s+y\s+|\s+,\s+|\s+then\s+|y\s+(luego|después|ahora)/i.test(goalLower);
        if (hasMultipleActions) {
          lines.push('⚠️ El objetivo tiene múltiples acciones. Si solo completaste una, genera el tool call para la siguiente. NO expliques, solo genera el JSON.');
        }
      }
      lines.push('Formato tool call: {"tool":"<server>__<name>","arguments":{...}}');
      lines.push('❌ NO generes texto como "He encontrado..." o "Ahora ejecutaré...". Si necesitas otra herramienta, genera SOLO el tool call JSON.');
    }

    return {
      observation: lines.filter(Boolean).join('\n'),
      summary
    };
  }

  /**
   * 🪟 VENTANA DESLIZANTE INTELIGENTE POR TOKENS
   * Sistema como ChatGPT/Claude - trunca automáticamente sin bloquear al usuario
   * @param {Array} messages - Todos los mensajes de la conversación
   * @param {Object} options - Configuraciones de modelo (contextLimit, etc.)
   * @returns {Array} Mensajes limitados por tokens
   */
  smartTokenBasedHistoryLimit(messages, options) {
    if (!messages || messages.length === 0) return [];

    const contextLimit = options.contextLimit || 16000; // Límite en tokens
    const reserveTokensForResponse = 2000; // Reservar espacio para la respuesta
    const targetLimit = contextLimit - reserveTokensForResponse;

    // Calcular tokens por mensaje usando función simple
    const messagesWithTokens = messages.map(msg => {
      const content = msg.content || '';
      // Detección simple de idioma español para cálculo preciso
      const hasSpanish = /[áéíóúñüÁÉÍÓÚÑÜ¿¡]/.test(content);
      const ratio = hasSpanish ? 3.5 : 4; // tokens por caracter
      const tokens = Math.ceil(content.length / ratio);
      
      return {
        ...msg,
        estimatedTokens: tokens
      };
    });

    // Calcular tokens totales
    let totalTokens = messagesWithTokens.reduce((sum, msg) => sum + msg.estimatedTokens, 0);

    // Si estamos dentro del límite, devolver todos los mensajes
    if (totalTokens <= targetLimit) {
      return messages;
    }

    // 🔪 TRUNCAMIENTO INTELIGENTE (como los grandes modelos)
    debugLogger.debug('AIService.History', 'Ventana deslizante activada', {
      totalTokens,
      targetLimit
    });

    // Estrategia: mantener los mensajes más recientes hasta alcanzar el límite
    let truncatedMessages = [];
    let runningTotal = 0;
    let truncatedCount = 0;

    // Empezar desde el final (mensajes más recientes)
    for (let i = messagesWithTokens.length - 1; i >= 0; i--) {
      const msg = messagesWithTokens[i];
      
      // Si agregar este mensaje nos pasaría del límite
      if (runningTotal + msg.estimatedTokens > targetLimit) {
        truncatedCount = i + 1; // Contar mensajes eliminados
        break;
      }
      
      runningTotal += msg.estimatedTokens;
      truncatedMessages.unshift(msg); // Agregar al principio
    }

    // Intentar preservar coherencia de pares (user-assistant)
    if (truncatedMessages.length > 0) {
      const firstMsg = truncatedMessages[0];
      
      // Si el primer mensaje es de assistant, intentar incluir el user anterior
      if (firstMsg.role === 'assistant' && truncatedCount > 0) {
        const previousMsg = messagesWithTokens[truncatedCount - 1];
        if (previousMsg.role === 'user' && 
            runningTotal + previousMsg.estimatedTokens <= targetLimit * 1.05) { // 5% de tolerancia
          truncatedMessages.unshift(previousMsg);
          truncatedCount--;
        }
      }
    }

    // Registro para transparencia (como ChatGPT - opcional y sutil)
    if (truncatedCount > 0) {
      debugLogger.debug('AIService.History', 'Contexto optimizado', {
        mensajesArchivados: truncatedCount,
        tokensLiberados: totalTokens - runningTotal
      });
      
      // Notificación sutil opcional (muy discreta, como los grandes modelos)
      this.lastContextOptimization = {
        messagesArchived: truncatedCount,
        tokensFreed: totalTokens - runningTotal,
        timestamp: Date.now()
      };
    }

    return truncatedMessages;
  }


  /**
   * Detectar archivos mencionados en la respuesta - VERSIÓN SIMPLIFICADA
   * Solo extrae bloques de código de la respuesta actual
   * 
   * 🔒 AUDITORÍA DE SEGURIDAD:
   * - SOLO procesa 'content' (respuesta actual de la IA)
   * - NUNCA incluye historial de conversaciones anteriores
   * - NUNCA busca en contenido del usuario
   * - 'userMessage' solo se usa para detectar INTENCIÓN (edición vs archivo nuevo)
   * - Flujo: AIChatPanel.js línea 326 → data.response (respuesta actual)
   * - data.response viene de sendMessageWithCallbacks (línea 981-986)
   * - sendMessageWithCallbacks retorna SOLO respuesta nueva, NO historial
   */
  detectFilesInResponse(content, userMessage = '') {
    if (!content) return [];
    
    const files = [];
    const seenFiles = new Set();
    
    // PASO 1: Extraer SOLO bloques de código formales: ```lenguaje\ncode```
    // Regex crítica: esto es lo ÚNICO que se procesa
    const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let match;
    let blockIndex = 0;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      blockIndex++;
      const language = (match[1] || 'txt').trim().toLowerCase();
      const code = match[2].trim();
      const blockStartPosition = match.index;
      
      // Solo aceptar bloques con contenido real (más de 20 caracteres)
      if (code.length < 20) continue;
      
      // Solo aceptar lenguajes de programación válidos
      const validLanguages = {
        'python': 'py',
        'javascript': 'js',
        'typescript': 'ts',
        'html': 'html',
        'css': 'css',
        'jsx': 'jsx',
        'tsx': 'tsx',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yml',
        'markdown': 'md',
        'bash': 'sh',
        'shell': 'sh',
        'sh': 'sh',
        'powershell': 'ps1',
        'batch': 'bat',
        'cmd': 'cmd',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'csharp': 'cs',
        'go': 'go',
        'rust': 'rs',
        'php': 'php',
        'ruby': 'rb',
        'perl': 'pl',
        'swift': 'swift',
        'kotlin': 'kt',
        'scala': 'scala',
        'dart': 'dart',
        'lua': 'lua',
        'r': 'r',
        'julia': 'jl',
        'haskell': 'hs',
        'erlang': 'erl',
        'elixir': 'ex',
        'clojure': 'clj',
        'fsharp': 'fs',
        'ocaml': 'ml',
        'prolog': 'pl',
        'lisp': 'lisp',
        'scheme': 'scm',
        'racket': 'rkt',
        'd': 'd',
        'nim': 'nim',
        'crystal': 'cr',
        'zig': 'zig',
        'v': 'v',
        'sql': 'sql',
        'matlab': 'm',
        'octave': 'm',
        'fortran': 'f90',
        'assembly': 'asm',
        'vhdl': 'vhdl',
        'verilog': 'v',
        'tcl': 'tcl',
        'ada': 'adb',
        'cobol': 'cob',
        'pascal': 'pas'
      };
      
      if (!(language in validLanguages)) continue;
      
      // PASO 2: PRIMERO buscar título markdown antes del bloque de código
      const titleFromMarkdown = this.extractTitleFromMarkdown(content, blockStartPosition);
      let fileName;
      
      if (titleFromMarkdown) {
        const extension = this.getLanguageExtension(language);
        fileName = `${titleFromMarkdown}.${extension}`;
      } else {
        // Si no hay título markdown, usar la lógica original
        fileName = this.generateDescriptiveFileName(code, language, blockIndex, userMessage);
      }
      
      // Si generateDescriptiveFileName retorna null, IGNORAR este bloque (ej: comandos bash simples)
      if (fileName === null) continue;
      
      // Evitar duplicados - si el nombre ya existe, agregar sufijo único
      let uniqueFileName = fileName;
      let counter = 1;
      while (seenFiles.has(uniqueFileName)) {
        const fileParts = fileName.split('.');
        const name = fileParts.slice(0, -1).join('.');
        const extension = fileParts[fileParts.length - 1];
        uniqueFileName = `${name}_${counter}.${extension}`;
        counter++;
      }
      
      files.push(uniqueFileName);
      seenFiles.add(uniqueFileName);
    }
    
    return files;
  }

  /**
   * Generar nombre simple de archivo basado en el contenido
   * Detecta si es una edición o un archivo nuevo
   */
  generateSimpleFileName(code, language, blockIndex, userMessage) {
    const extensions = {
      'python': 'py',
      'javascript': 'js',
      'typescript': 'ts',
      'html': 'html',
      'css': 'css',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'json': 'json',
      'xml': 'xml',
      'bash': 'sh',
      'shell': 'sh',
      'sh': 'sh',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rust': 'rs',
      'php': 'php',
      'ruby': 'rb',
      'sql': 'sql'
    };
    
    const ext = extensions[language] || language;
    
    // FILTRO ESPECIAL: Para bash/sh, diferenciar entre comandos simples y scripts
    if (language === 'bash' || language === 'shell' || language === 'sh') {
      // Si es un comando simple (una línea o pocas líneas de comandos), IGNORAR
      const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
      
      // Verificar si es un script real (tiene estructura de script)
      const isRealScript = code.includes('#!/') || // Shebang
                          code.includes('function ') || // Definición de función
                          code.includes('for ') || // Loops
                          code.includes('while ') ||
                          code.includes('if ') || // Condicionales
                          code.includes('case ') ||
                          lines.length > 3; // Más de 3 líneas de verdadero código
      
      // Si es solo comandos simples (una o dos líneas), NO generar archivo
      if (!isRealScript && lines.length <= 2) {
        return null; // Retornar null para ignorar este bloque
      }
    }
    
    // DETECTAR EDICIONES: Si es código incompleto o fragmento, probablemente es edición
    const isEditionIndicators = [
      'document.getElementById', // Edición de HTML existente
      'addEventListener', // Edición de script existente
      'querySelector', // Edición de HTML/CSS
      'fetch(', // Edición de API
      'const', // Edición de función existente
      'function ', // Nueva función en archivo existente
      'export ', // Edición de módulo
      'import ', // Edición de imports
    ];
    
    const hasEditionIndicators = isEditionIndicators.some(indicator => code.includes(indicator));
    
    // Si tiene indicadores de edición Y no es un archivo completo, es una edición
    const isCompleteFile = code.includes('<!DOCTYPE') || 
                          code.includes('if __name__') ||
                          code.includes('function main') ||
                          code.includes('package main');
    
    const isEdition = hasEditionIndicators && !isCompleteFile;
    
    // 1. Si el usuario pidió explícitamente algo, usar ese nombre
    if (userMessage) {
      const userLower = userMessage.toLowerCase();
      
      // Palabras clave que indican edición
      const editKeywords = ['añade', 'agrega', 'add', 'edit', 'modifica', 'update', 'edita', 'improve', 'mejorar', 'incluye', 'include'];
      const isEditRequest = editKeywords.some(kw => userLower.includes(kw));
      
      // Si es solicitud de edición y el código parece una edición, retornar archivo conocido
      if (isEditRequest && isEdition) {
        // Detectar qué archivo es probablemente una edición
        if (language === 'html' && code.includes('<')) return 'index.html';
        if (language === 'javascript' && code.includes('document.')) return 'index.js';
        if (language === 'javascript' && code.includes('app.on')) return 'main.js';
        if (language === 'css') return 'styles.css';
        if (language === 'json' && code.includes('"')) return 'package.json';
      }
      
      // Electron
      if (userLower.includes('electron') && language === 'javascript') {
        if (code.includes('BrowserWindow') || code.includes('app.on')) return 'main.js';
        if (code.includes('<html') || code.includes('<!DOCTYPE')) return 'index.html';
      }
      
      // React
      if ((userLower.includes('react') || userLower.includes('componente')) && language === 'jsx') {
        return `Component.${ext}`;
      }
      
      // Package.json
      if (userLower.includes('package.json') && language === 'json') {
        return 'package.json';
      }
    }
    
    // 2. Detectar archivos especiales por contenido
    if (language === 'html' && code.includes('<!DOCTYPE')) {
      return 'index.html';
    }
    if (language === 'json' && code.includes('"name"') && code.includes('"version"')) {
      return 'package.json';
    }
    if (language === 'javascript' && code.includes('module.exports')) {
      return 'index.js';
    }
    if (language === 'css' && code.split('\n').length > 2) {
      return 'styles.css';
    }
    
    // 3. Si parece una edición pero no sabemos cuál archivo, usar nombre genérico
    if (isEdition) {
      const typeNames = {
        'python': 'script',
        'javascript': 'index',
        'typescript': 'index',
        'html': 'index',
        'css': 'styles',
        'json': 'config',
        'java': 'App',
        'cpp': 'main',
        'sql': 'query',
        'bash': 'script',
        'shell': 'script',
        'sh': 'script'
      };
      
      const baseName = typeNames[language] || 'file';
      return `${baseName}.${ext}`; // Sin números para ediciones
    }
    
    // 4. Nombre genérico basado en tipo para archivos nuevos
    const typeNames = {
      'python': 'script',
      'javascript': 'script',
      'typescript': 'script',
      'html': 'page',
      'css': 'styles',
      'json': 'config',
      'java': 'App',
      'cpp': 'main',
      'sql': 'query',
      'bash': 'script',
      'shell': 'script',
      'sh': 'script'
    };
    
    const baseName = typeNames[language] || 'file';
    return `${baseName}_${blockIndex}.${ext}`;
  }

  /**
   * Verificar si el código es significativo y merece ser un archivo
   */
  isSignificantCode(code, language) {
    // Criterios más flexibles para detectar scripts completos
    const minLength = 20; // Muy bajo para scripts pequeños pero completos
    const lines = code.split('\n');
    const lineCount = lines.length;
    
    // Para Python, ser más inclusivo con scripts de prueba
    if (language === 'python') {
      const hasPythonStructure = (
        code.includes('def ') || 
        code.includes('class ') || 
        code.includes('import ') ||
        code.includes('if __name__') ||
        code.includes('main()') ||
        code.includes('assert ') ||
        code.includes('print(') ||
        code.includes('for ') ||
        code.includes('if ') ||
        code.includes('while ') ||
        code.includes('try:') ||
        code.includes('except:') ||
        code.includes('input(') ||
        code.includes('return ')
      );
      
      // Un script Python es significativo si:
      // 1. Tiene estructura Python Y (es suficientemente largo O tiene múltiples líneas)
      // 2. O es un script completo con main() o if __name__
      const isCompleteScript = code.includes('if __name__') || code.includes('main()');
      const hasGoodLength = code.length > minLength;
      const hasMultipleLines = lineCount > 2;
      
      return hasPythonStructure && (isCompleteScript || (hasGoodLength && hasMultipleLines));
    }
    
    // Para otros lenguajes, mantener criterios más estrictos
    const hasStructure = (
      code.includes('import ') || 
      code.includes('def ') || 
      code.includes('class ') || 
      code.includes('function ') || 
      code.includes('const ') || 
      code.includes('let ') || 
      code.includes('var ') ||
      code.includes('public class') ||
      code.includes('#include') ||
      code.includes('package ') ||
      code.includes('export ') ||
      code.includes('module.exports') ||
      code.includes('require(') ||
      code.includes('from ') ||
      code.includes('@') // Decoradores
    );
    
    const hasContent = code.length > minLength;
    const hasMultipleLines = lineCount > 3;
    
    return hasStructure && hasContent && hasMultipleLines;
  }

  /**
   * Calcular la significancia del código para seleccionar el mejor
   */
  calculateCodeSignificance(code, language) {
    let score = 0;
    
    // Puntuación base por longitud (más código = más significativo)
    score += Math.min(code.length / 100, 10);
    
    // Puntuación por estructura - más específica para Python
    const structureKeywords = {
      'python': [
        'def ', 'class ', 'import ', 'if __name__', 'main()',
        'assert ', 'print(', 'for ', 'if ', 'while ', 'try:', 'except:',
        'return ', 'yield ', 'lambda ', 'with ', 'as '
      ],
      'javascript': ['function', 'const ', 'class ', 'export ', 'import '],
      'java': ['public class', 'public static void main', 'import '],
      'cpp': ['int main', 'class ', '#include']
    };
    
    const keywords = structureKeywords[language] || structureKeywords['python'];
    keywords.forEach(keyword => {
      if (code.includes(keyword)) {
        score += 2;
      }
    });
    
    // Puntuación especial para scripts Python completos
    if (language === 'python') {
      // Script completo con main
      if (code.includes('if __name__') && code.includes('main()')) {
        score += 10; // Puntuación alta para scripts completos
      }
      
      // Script con funciones definidas
      if (code.includes('def ')) {
        score += 5;
      }
      
      // Script con pruebas (assert)
      if (code.includes('assert ')) {
        score += 3;
      }
      
      // Script con bucles o condicionales
      if (code.includes('for ') || code.includes('while ') || code.includes('if ')) {
        score += 2;
      }
      
      // Script con manejo de errores
      if (code.includes('try:') || code.includes('except:')) {
        score += 2;
      }
      
      // Script con input del usuario
      if (code.includes('input(')) {
        score += 2;
      }
    }
    
    // Puntuación por funcionalidad específica
    const functionalityKeywords = {
      'python': ['random', 'randint', 'suma', 'resta', 'multiplicacion', 'division', 'celsius', 'fahrenheit', 'prueba', 'test'],
      'javascript': ['express', 'react', 'vue', 'angular', 'api', 'server'],
      'java': ['@SpringBootApplication', '@RestController', '@Service', '@Entity'],
      'cpp': ['iostream', 'vector', 'string', 'algorithm']
    };
    
    const funcKeywords = functionalityKeywords[language] || functionalityKeywords['python'];
    funcKeywords.forEach(keyword => {
      if (code.toLowerCase().includes(keyword.toLowerCase())) {
        score += 3;
      }
    });
    
    // Puntuación por comentarios y documentación
    const commentCount = (code.match(/#|\/\/|\/\*/g) || []).length;
    score += Math.min(commentCount, 5);
    
    // Puntuación por líneas de código
    const lineCount = code.split('\n').length;
    score += Math.min(lineCount / 10, 5);
    
    return score;
  }

  /**
   * Verificar si se debe crear un archivo (evitar duplicados innecesarios)
   */
  shouldCreateFile(code, language, existingFiles) {
            const extension = this.getLanguageExtension(language);
    
    // Si ya hay archivos del mismo tipo, ser más selectivo
    const sameTypeFiles = existingFiles.filter(f => f.endsWith(`.${extension}`));
    if (sameTypeFiles.length >= 1) {
      // Solo crear si es realmente único o importante
      return this.isUniqueCode(code, language) || this.isImportantCode(code, language);
    }
    
    // Si es el primer archivo de este tipo, permitir si es significativo
    return this.isSignificantCode(code, language);
  }

  /**
   * Verificar si el código es único (no duplicado)
   */
  isUniqueCode(code, language) {
    // Buscar características únicas del código
    const uniquePatterns = {
      'python': [/def\s+\w+/, /class\s+\w+/, /import\s+\w+/],
      'javascript': [/function\s+\w+/, /const\s+\w+/, /class\s+\w+/],
      'java': [/public\s+class\s+\w+/, /public\s+static\s+void\s+main/],
      'cpp': [/int\s+main\s*\(/, /class\s+\w+/, /#include/]
    };
    
    const patterns = uniquePatterns[language] || [];
    return patterns.some(pattern => pattern.test(code));
  }

  /**
   * Verificar si el código es importante (merece ser archivo)
   */
  isImportantCode(code, language) {
    const importantKeywords = {
      'python': ['def ', 'class ', 'import ', 'if __name__'],
      'javascript': ['function', 'const ', 'class ', 'export '],
      'java': ['public class', 'public static void main'],
      'cpp': ['int main', 'class ', '#include'],
      'html': ['<!DOCTYPE', '<html', '<head', '<body'],
      'css': ['@media', '@keyframes', 'body', 'html'],
      'sql': ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE']
    };
    
    const keywords = importantKeywords[language] || [];
    return keywords.some(keyword => code.includes(keyword));
  }

  /**
   * Generar nombre de archivo descriptivo basado en el contenido del código
   */
  generateDescriptiveFileName(code, language, index, userMessage = '') {
    const extension = this.getLanguageExtension(language);
    
    // FILTRO ESPECIAL: Para bash/sh, diferenciar entre comandos simples y scripts
    if (language === 'bash' || language === 'shell' || language === 'sh') {
      // Si es un comando simple (una línea o pocas líneas de comandos), IGNORAR
      const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
      
      // Verificar si es un script real (tiene estructura de script)
      const isRealScript = code.includes('#!/') || // Shebang
                          code.includes('function ') || // Definición de función
                          code.includes('for ') || // Loops
                          code.includes('while ') ||
                          code.includes('if ') || // Condicionales
                          code.includes('case ') ||
                          lines.length > 3; // Más de 3 líneas de verdadero código
      
      // Si es solo comandos simples (una o dos líneas), NO generar archivo
      if (!isRealScript && lines.length <= 2) {
        return null; // Retornar null para ignorar este bloque
      }
    }
    
    // 1. PRIMERO: Intentar generar nombre basado en la solicitud del usuario
    const nameFromUserRequest = this.extractNameFromUserRequest(userMessage, language);
    if (nameFromUserRequest) {
      return `${nameFromUserRequest}.${extension}`;
    }
    
    // 2. Buscar títulos y descripciones en comentarios
    const titleFromComments = this.extractTitleFromComments(code, language);
    if (titleFromComments) {
      return `${titleFromComments}.${extension}`;
    }
    
    // 3. Buscar descripción del propósito en el contexto (más específico)
    const purposeFromContext = this.extractPurposeFromContext(code, language);
    if (purposeFromContext) {
      return `${purposeFromContext}.${extension}`;
    }
    
    // 4. Buscar patrones específicos de funcionalidad
    const functionalityName = this.extractFunctionalityName(code, language);
    if (functionalityName) {
      return `${functionalityName}.${extension}`;
    }
    
    // 5. Buscar nombres de funciones principales
    const mainFunctionName = this.extractMainFunctionName(code, language);
    if (mainFunctionName) {
      return `${mainFunctionName}.${extension}`;
    }
    
    // 6. Analizar el contenido del código para generar nombre descriptivo
    const contentBasedName = this.generateNameFromCodeContent(code, language, userMessage);
    if (contentBasedName) {
      return `${contentBasedName}.${extension}`;
    }
    
    // 7. Si no se encuentra nada descriptivo, usar un nombre genérico pero más específico
    const genericNames = {
      'python': 'script_python',
      'javascript': 'script_js',
      'typescript': 'script_ts',
      'java': 'script_java',
      'cpp': 'script_cpp',
      'c': 'script_c',
      'html': 'page_html',
      'css': 'styles_css',
      'sql': 'query_sql'
    };
    
    const baseName = genericNames[language] || 'script';
    return `${baseName}.${extension}`;
  }

  /**
   * Generar nombre basado en el contenido del código
   */
  generateNameFromCodeContent(code, language, userMessage = '') {
    const codeLower = code.toLowerCase();
    const messageLower = userMessage.toLowerCase();
    
    // Patrones específicos para diferentes tipos de código
    if (codeLower.includes('csv') || messageLower.includes('csv')) {
      return 'procesar_csv';
    }
    if (codeLower.includes('pandas') || codeLower.includes('dataframe')) {
      return 'analisis_datos';
    }
    if (codeLower.includes('import csv') || codeLower.includes('csv.reader')) {
      return 'lector_csv';
    }
    if (codeLower.includes('def ') && codeLower.includes('csv')) {
      return 'funciones_csv';
    }
    if (codeLower.includes('class ') && codeLower.includes('csv')) {
      return 'clase_csv';
    }
    if (codeLower.includes('pandas') && codeLower.includes('read_csv')) {
      return 'pandas_csv';
    }
    if (codeLower.includes('to_excel') || codeLower.includes('excel')) {
      return 'exportar_excel';
    }
    if (codeLower.includes('json') && codeLower.includes('load')) {
      return 'procesar_json';
    }
    if (codeLower.includes('api') || codeLower.includes('requests')) {
      return 'cliente_api';
    }
    if (codeLower.includes('web') || codeLower.includes('scraping')) {
      return 'web_scraper';
    }
    if (codeLower.includes('database') || codeLower.includes('sql')) {
      return 'base_datos';
    }
    if (codeLower.includes('test') || codeLower.includes('unittest')) {
      return 'test_unitario';
    }
    if (codeLower.includes('main') && codeLower.includes('if __name__')) {
      return 'script_principal';
    }
    
    return null;
  }

  /**
   * Extraer nombre basado en la solicitud del usuario
   */
  extractNameFromUserRequest(userMessage, language) {
    if (!userMessage) return null;
    
    const message = userMessage.toLowerCase();
    
    // Patrones de solicitudes comunes del usuario
    const requestPatterns = {
      'calculadora': ['calculadora', 'calculadora basica', 'operaciones basicas', 'sumar restar multiplicar dividir', 'calculadora simple'],
      'generador_numeros': ['generar numeros', 'numeros aleatorios', 'random', 'generar numero', 'numero aleatorio'],
      'sumador': ['sumar numeros', 'suma', 'sumar', 'suma de numeros'],
      'conversor_temperatura': ['conversor', 'temperatura', 'celsius fahrenheit', 'convertir temperatura'],
      'promedio': ['promedio', 'calcular promedio', 'media'],
      'manejador_archivos': ['manejar archivos', 'leer archivo', 'escribir archivo', 'archivos'],
      'web_scraper': ['scraper', 'web scraping', 'extraer datos', 'scraping'],
      'api_client': ['api', 'cliente api', 'llamar api', 'consumir api'],
      'base_datos': ['base de datos', 'database', 'sql', 'consulta'],
      'automatizacion': ['automatizar', 'automatizacion', 'tarea automatica', 'cron'],
      'escaner_redes': ['escanear redes', 'escanear red', 'redes locales', 'escanear dispositivos', 'red local', 'escanear red local', 'dispositivos red', 'redes', 'escanear'],
      'monitor_sistema': ['monitor', 'monitorear', 'sistema', 'recursos', 'cpu', 'memoria', 'disco'],
      'backup_archivos': ['backup', 'respaldo', 'copiar archivos', 'respaldo archivos'],
      'conversor_archivos': ['convertir archivos', 'conversor archivos', 'formato archivo'],
      'generador_passwords': ['generar contraseñas', 'passwords', 'contraseñas', 'generar password'],
      'analizador_logs': ['analizar logs', 'logs', 'analizar archivos log', 'log files']
    };
    
    // Buscar el patrón que mejor coincida con la solicitud del usuario
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [name, keywords] of Object.entries(requestPatterns)) {
      let score = 0;
      keywords.forEach(keyword => {
        if (message.includes(keyword)) {
          score += keyword.length; // Puntuación basada en la longitud de la palabra clave
        }
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = name;
      }
    }
    
    // Solo devolver si hay una coincidencia significativa
    return bestScore > 5 ? bestMatch : null;
  }

  /**
   * Extraer nombre basado en la funcionalidad específica del código
   */
  extractFunctionalityName(code, language) {
    const functionalityPatterns = {
      'python': {
        'generador_numeros': ['random', 'randint', 'aleatorio', 'generar_numero', 'numero_aleatorio'],
        'calculadora_basica': ['suma', 'resta', 'multiplicacion', 'division', 'calculadora', 'operaciones', 'opcion', 'elija'],
        'sumador_numeros': ['sumar', 'suma', 'numeros', 'cantidad', 'ingrese'],
        'promedio_numeros': ['promedio', 'calcular_promedio', 'numeros', 'promediar'],
        'conversor_temperatura': ['celsius', 'fahrenheit', 'convertir', 'temperatura', 'grados'],
        'manejador_archivos': ['open', 'read', 'write', 'file', 'path', 'os'],
        'web_scraper': ['requests', 'beautifulsoup', 'scrape', 'url', 'html'],
        'api_client': ['requests', 'api', 'http', 'get', 'post', 'json'],
        'base_datos': ['sqlite', 'mysql', 'postgres', 'database', 'db'],
        'automatizacion': ['schedule', 'cron', 'automate', 'task', 'job']
      },
      'javascript': {
        'web_app': ['express', 'react', 'vue', 'angular', 'dom', 'html'],
        'api_server': ['express', 'fastify', 'koa', 'api', 'server'],
        'procesador_datos': ['json', 'array', 'map', 'filter', 'reduce'],
        'utilidad': ['util', 'helper', 'common', 'shared', 'tool']
      },
      'java': {
        'aplicacion_spring': ['@SpringBootApplication', '@RestController', '@Service'],
        'modelo_datos': ['@Entity', '@Table', '@Column', 'model', 'entity'],
        'utilidad': ['util', 'helper', 'common', 'shared', 'tool']
      }
    };
    
    const patterns = functionalityPatterns[language] || functionalityPatterns['python'];
    
    // Buscar el patrón con más coincidencias
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [name, keywords] of Object.entries(patterns)) {
      let score = 0;
      keywords.forEach(keyword => {
        if (code.toLowerCase().includes(keyword.toLowerCase())) {
          score++;
        }
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = name;
      }
    }
    
    // Solo devolver si hay al menos 2 coincidencias
    return bestScore >= 2 ? bestMatch : null;
  }

  /**
   * Extraer nombre de la función principal
   */
  extractMainFunctionName(code, language) {
    const mainFunctionPatterns = {
      'python': [
        /def\s+(\w+)\s*\([^)]*\):/,  // def function_name():
        /def\s+main\s*\([^)]*\):/,   // def main():
        /def\s+(\w+)\s*\([^)]*\):\s*"""/  // def function_name(): """
      ],
      'javascript': [
        /function\s+(\w+)\s*\([^)]*\)/,  // function functionName()
        /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/,  // const functionName = () =>
        /export\s+(?:default\s+)?function\s+(\w+)/  // export function functionName
      ],
      'java': [
        /public\s+static\s+void\s+(\w+)\s*\([^)]*\)/,  // public static void methodName()
        /public\s+class\s+(\w+)/  // public class ClassName
      ]
    };
    
    const patterns = mainFunctionPatterns[language] || mainFunctionPatterns['python'];
    
    // Lista de nombres de funciones genéricas que no deben usarse
    const genericFunctionNames = [
      'main', 'test', 'example', 'demo', 'sample', 'temp', 'tmp', 'func', 'function', 'method'
    ];
    
    // Lista de nombres de funciones específicas que SÍ deben usarse
    const specificFunctionNames = [
      'fahrenheit_a_celsius', 'celsius_a_fahrenheit', 'conversor_temperatura',
      'calcular_promedio', 'verificar_par_impar', 'generar_contrasena'
    ];
    
    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match) {
        const functionName = match[1];
        if (functionName && 
            (specificFunctionNames.includes(functionName.toLowerCase()) ||
             (!genericFunctionNames.includes(functionName.toLowerCase()) && functionName.length > 3))) {
          return functionName.toLowerCase();
        }
      }
    }
    
    return null;
  }

  /**
   * Extraer título de markdown que aparece antes del bloque de código
   */
  extractTitleFromMarkdown(content, blockStartPosition) {
    // Obtener el texto antes del bloque de código
    const textBeforeBlock = content.substring(0, blockStartPosition);
    
    // Buscar títulos markdown hacia atrás desde la posición del bloque
    const lines = textBeforeBlock.split('\n').reverse();
    
    for (let i = 0; i < Math.min(lines.length, 10); i++) { // Buscar hasta 10 líneas atrás
      const line = lines[i].trim();
      
      // Patrones de títulos markdown - CORREGIDOS según los logs reales
      const titlePatterns = [
        // **Script 1: Conversor de temperatura** (formato real de tus logs)
        /^\*\*Script\s*\d*:\s*(.+?)\*\*$/i,
        // **Ejemplo 1: Calculadora**
        /^\*\*Ejemplo\s*\d*:\s*(.+?)\*\*$/i,
        // ## Script 1: Par o Impar
        /^#+\s*Script\s*\d*:\s*(.+)$/i,
        // ## Ejemplo 1: Calculadora  
        /^#+\s*Ejemplo\s*\d*:\s*(.+)$/i,
        // ## 1. Conversor de temperatura
        /^#+\s*\d+\.\s*(.+)$/i,
        // ## Conversor de temperatura
        /^#+\s*([A-Z][^#\n]{3,100})$/i,
        // Script 1: Par o Impar (sin formato)
        /^Script\s*\d*:\s*(.+)$/i,
        // Ejemplo: Calculadora (sin formato) 
        /^Ejemplo\s*\d*:\s*(.+)$/i,
        // Casos específicos 
        /^(Juego\s+de\s+Adivina\s+el\s+Número)$/i,
        /^(Generador\s+de\s+números?\s+aleatorios?)$/i,
        /^(Conversor\s+de\s+temperatura)$/i,
        // Cualquier título descriptivo con palabras clave
        /^(.*(?:juego|generador|calculadora|conversor|sistema|programa).*[a-zA-Z\s]{5,60})$/i,
        // Título que empiece con mayúscula y tenga al menos 3 palabras
        /^([A-Z][a-z]+\s+[a-z]+\s+[A-Z][a-z]+.*?)$/i,
        // Título simple con palabras descriptivas
        /^([A-Z][a-zA-Z\s]{8,60})$/i
      ];
      
      for (const pattern of titlePatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const titleText = match[1].trim();
          return this.sanitizeFileName(titleText);
        }
      }
      
      // Si encontramos una línea que no está vacía y no es un título, dejar de buscar
      if (line.length > 0 && !line.match(/^```/) && !line.match(/^\s*$/)) {
        break;
      }
    }
    
    return null;
  }

  /**
   * Convertir texto a nombre de archivo válido
   */
  sanitizeFileName(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s\-]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '_') // Espacios a guiones bajos
      .replace(/_+/g, '_') // Múltiples guiones bajos a uno solo
      .replace(/^_|_$/g, '') // Remover guiones bajos al inicio y final
      .substring(0, 50); // Limitar longitud
  }

  /**
   * Extraer título de comentarios en el código
   */
  extractTitleFromComments(code, language) {
    // Buscar títulos más específicos y descriptivos
    const titlePatterns = {
      'python': [
        /#\s*Ejemplo:\s*([^#\n]+)/,        // Ejemplo: Título
        /#\s*Script:\s*([^#\n]+)/,         // Script: Título
        /#\s*Programa:\s*([^#\n]+)/,       // Programa: Título
        /#\s*Calculadora\s+([^#\n]+)/,      // Calculadora Título
        /#\s*Sumador\s+([^#\n]+)/,         // Sumador Título
        /#\s*Conversor\s+([^#\n]+)/,       // Conversor Título
        /#\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,  // Títulos con mayúsculas
        /"""\s*([^"]{3,30})\s*"""/         // Docstrings
      ],
      'javascript': [
        /\/\/\s*Ejemplo:\s*([^\/\n]+)/,    // Ejemplo: Título
        /\/\/\s*Script:\s*([^\/\n]+)/,     // Script: Título
        /\/\/\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,  // Títulos con mayúsculas
        /\/\*\s*([^*]{3,30})\s*\*\//       // Comentarios de bloque
      ],
      'java': [
        /\/\/\s*Ejemplo:\s*([^\/\n]+)/,    // Ejemplo: Título
        /\/\/\s*Class:\s*([^\/\n]+)/,      // Class: Título
        /\/\/\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,  // Títulos con mayúsculas
        /\/\*\s*([^*]{3,30})\s*\*\//       // Comentarios de bloque
      ],
      'cpp': [
        /\/\/\s*Ejemplo:\s*([^\/\n]+)/,    // Ejemplo: Título
        /\/\/\s*Program:\s*([^\/\n]+)/,    // Program: Título
        /\/\/\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,  // Títulos con mayúsculas
        /\/\*\s*([^*]{3,30})\s*\*\//       // Comentarios de bloque
      ]
    };
    
    const patterns = titlePatterns[language] || titlePatterns['python'];
    
    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match) {
        let title = match[1].trim();
        
        // Limpiar y formatear el título de manera más inteligente
        title = title
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')  // Solo letras, números y espacios
          .replace(/\s+/g, '_')         // Espacios a guiones bajos
          .replace(/_+/g, '_')          // Múltiples guiones bajos a uno
          .replace(/^_|_$/g, '')        // Quitar guiones al inicio y final
          .substring(0, 30);           // Limitar longitud
        
        // Solo usar si es un título válido (no muy corto ni genérico)
        if (title.length > 3 && !this.isGenericTitle(title)) {
          return title;
        }
      }
    }
    
    return null;
  }

  /**
   * Verificar si un título es genérico y no debe usarse
   */
  isGenericTitle(title) {
    const genericTitles = [
      'script', 'program', 'code', 'example', 'ejemplo',
      'import', 'definir', 'funcion', 'function', 'class',
      'main', 'principal', 'basic', 'basico', 'simple',
      'configuracion', 'configuracion de', 'configuracion de la',
      'configuracion de la interfaz', 'configuracion de la red',
      'configuracion de la red local', 'configuracion de la red local',
      'configuracion de la red local', 'configuracion de la red local'
    ];
    
    return genericTitles.some(generic => 
      title.toLowerCase().includes(generic) || 
      title.toLowerCase() === generic
    );
  }

  /**
   * Extraer propósito del contexto del código
   */
  extractPurposeFromContext(code, language) {
    // Buscar palabras clave que indiquen el propósito específico
    const purposeKeywords = {
      'python': {
        'prueba_for': ['for ', 'frutas', 'bucle', 'iteracion', 'lista', 'append'],
        'verificador_par_impar': ['% 2', 'par', 'impar', 'numero % 2', 'es par', 'es impar'],
        'prueba_if': ['if ', 'condicional', 'assert', 'verificar', 'validar'],
        'prueba_while': ['while ', 'bucle', 'iteracion', 'condicion'],
        'prueba_funciones': ['def ', 'funcion', 'parametros', 'return'],
        'prueba_clases': ['class ', 'objeto', 'metodo', 'constructor'],
        'prueba_manejo_errores': ['try:', 'except:', 'error', 'excepcion'],
        'analizador_csv': ['csv', 'analizar', 'archivo', 'columnas', 'filas', 'frecuencia'],
        'lista_tareas': ['tareas', 'agregar', 'mostrar', 'pendientes', 'opcion', 'menu'],
        'calculadora_interactiva': ['calcular', 'operacion', 'ingrese', 'numeros', 'resultado'],
        'calculadora_basica': ['suma', 'resta', 'multiplicacion', 'division', 'calculadora', 'operaciones'],
        'sumador_numeros': ['sumar', 'suma', 'numeros', 'cantidad', 'ingrese'],
        'promedio_numeros': ['promedio', 'calcular_promedio', 'numeros', 'promediar'],
        'conversor_temperatura': ['celsius', 'fahrenheit', 'convertir', 'temperatura', 'grados'],
        'data_analysis': ['pandas', 'numpy', 'dataframe', 'csv', 'json', 'analysis'],
        'web_scraper': ['requests', 'beautifulsoup', 'scrape', 'url', 'html'],
        'api_client': ['requests', 'api', 'http', 'get', 'post', 'json'],
        'file_handler': ['open', 'read', 'write', 'file', 'path', 'os'],
        'database': ['sqlite', 'mysql', 'postgres', 'database', 'db'],
        'automation': ['schedule', 'cron', 'automate', 'task', 'job']
      },
      'javascript': {
        'web_app': ['express', 'react', 'vue', 'angular', 'dom', 'html'],
        'api_server': ['express', 'fastify', 'koa', 'api', 'server'],
        'data_processor': ['json', 'array', 'map', 'filter', 'reduce'],
        'utility': ['util', 'helper', 'common', 'shared', 'tool']
      },
      'java': {
        'spring_app': ['@SpringBootApplication', '@RestController', '@Service'],
        'data_model': ['@Entity', '@Table', '@Column', 'model', 'entity'],
        'utility': ['util', 'helper', 'common', 'shared', 'tool']
      }
    };
    
    const keywords = purposeKeywords[language] || purposeKeywords['python'];
    
    // Buscar el propósito más específico primero - ordenar por especificidad
    const sortedPurposes = Object.entries(keywords).sort((a, b) => {
      // Contar cuántas palabras clave coinciden para cada propósito
      const aMatches = a[1].filter(word => code.toLowerCase().includes(word.toLowerCase())).length;
      const bMatches = b[1].filter(word => code.toLowerCase().includes(word.toLowerCase())).length;
      return bMatches - aMatches; // Más coincidencias primero
    });
    
    for (const [purpose, words] of sortedPurposes) {
      const matchingWords = words.filter(word => 
        code.toLowerCase().includes(word.toLowerCase())
      );
      
      // Solo considerar si tiene al menos 2 coincidencias O es muy específico
      if (matchingWords.length >= 2 || 
          (matchingWords.length >= 1 && ['celsius', 'fahrenheit', 'temperatura', 'pandas', 'numpy', 'beautifulsoup'].some(specific => 
            matchingWords.some(match => match.includes(specific))))) {
        return purpose;
      }
    }
    
    // Si no encuentra propósito específico, buscar patrones generales
    const generalPatterns = {
      'python': {
        'script_prueba': ['assert ', 'print(', 'prueba', 'test'],
        'script_basico': ['def ', 'if __name__', 'main()'],
        'script_bucle': ['for ', 'while ', 'bucle'],
        'script_condicional': ['if ', 'elif ', 'else:', 'condicional'],
        'script_interactivo': ['input(', 'while True', 'opcion', 'menu'],
        'script_tareas': ['tareas', 'agregar', 'mostrar', 'pendientes'],
        'script_calculadora': ['calcular', 'operacion', 'numeros', 'resultado'],
        'calculadora': ['suma', 'resta', 'multiplicacion', 'division'],
        'sumador': ['sumar', 'suma', 'numeros'],
        'conversor': ['convertir', 'celsius', 'fahrenheit', 'grados']
      }
    };
    
    const patterns = generalPatterns[language] || generalPatterns['python'];
    
    for (const [purpose, words] of Object.entries(patterns)) {
      const hasPatterns = words.some(word => 
        code.toLowerCase().includes(word.toLowerCase())
      );
      
      if (hasPatterns) {
        return purpose;
      }
    }
    
    return null;
  }

  /**
   * Verificar si el código es relevante al contexto de la solicitud del usuario
   */
  isRelevantToContext(code, userContext, language) {
    if (!userContext || userContext.trim() === '') return true; // Si no hay contexto, aceptar
    
    const codeLower = code.toLowerCase();
    const userContextLower = userContext.toLowerCase();
    
    debugLogger.debug('AIService.Relevance', 'Validando relevancia', {
      userContext: userContext.substring(0, 50),
      language,
      codePreview: code.substring(0, 50)
    });
    
    // Validar por tipo de solicitud específica CON MAYOR PRECISIÓN
    if (userContextLower.includes('electron')) {
      const isRelevant = codeLower.includes('electron') || 
                         codeLower.includes('app.on') || 
                         codeLower.includes('browserwindow') ||
                         codeLower.includes('createwindow') ||
                         codeLower.includes('const { app, browserwindow }') ||
                         codeLower.includes('loadurl') ||
                         codeLower.includes('index.html') ||
                         codeLower.includes('<!doctype html>') ||
                         codeLower.includes('<html') ||
                         codeLower.includes('mi aplicación') ||
                         codeLower.includes('aplicación electrónica');
      
      debugLogger.debug('AIService.Relevance', 'Electron validation', {
        isRelevant,
        hasElectron: codeLower.includes('electron'),
        hasAppOn: codeLower.includes('app.on'),
        hasBrowserWindow: codeLower.includes('browserwindow'),
        hasLoadURL: codeLower.includes('loadurl'),
        hasIndexHTML: codeLower.includes('index.html'),
        hasHTML: codeLower.includes('<!doctype html>') || codeLower.includes('<html')
      });
      
      return isRelevant;
    }
    
    if (userContextLower.includes('react')) {
      const isRelevant = codeLower.includes('react') || 
                         codeLower.includes('import react') ||
                         codeLower.includes('from "react"');
      
      debugLogger.debug('AIService.Relevance', 'React validation', { isRelevant });
      return isRelevant;
    }
    
    if (userContextLower.includes('vue')) {
      const isRelevant = codeLower.includes('vue') || 
                         codeLower.includes('import') && codeLower.includes('vue');
      
      debugLogger.debug('AIService.Relevance', 'Vue validation', { isRelevant });
      return isRelevant;
    }
    
    if (userContextLower.includes('python') || userContextLower.includes('pandas')) {
      const isRelevant = codeLower.includes('import') || 
                         codeLower.includes('def ') || 
                         codeLower.includes('pandas');
      
      debugLogger.debug('AIService.Relevance', 'Python validation', { isRelevant });
      return isRelevant;
    }
    
    if (userContextLower.includes('web scraper') || userContextLower.includes('scraper')) {
      const isRelevant = codeLower.includes('scraper') || 
                         codeLower.includes('requests') ||
                         codeLower.includes('beautifulsoup') ||
                         codeLower.includes('fetch(');
      
      debugLogger.debug('AIService.Relevance', 'Web scraper validation', { isRelevant });
      return isRelevant;
    }
    
    if (userContextLower.includes('data analysis') || userContextLower.includes('analisis de datos')) {
      const isRelevant = codeLower.includes('pandas') || 
                         codeLower.includes('numpy') ||
                         codeLower.includes('dataframe') ||
                         codeLower.includes('csv');
      
      debugLogger.debug('AIService.Relevance', 'Data analysis validation', { isRelevant });
      return isRelevant;
    }
    
    // Detectar archivos JavaScript/HTML genéricos si el contexto es de desarrollo
    if (userContextLower.includes('proyecto') || userContextLower.includes('aplicación') || 
        userContextLower.includes('app') || userContextLower.includes('desarrollo')) {
      
      const isRelevant = (language === 'javascript' && (
        codeLower.includes('function') || 
        codeLower.includes('const ') || 
        codeLower.includes('let ') ||
        codeLower.includes('var ') ||
        codeLower.includes('import ') ||
        codeLower.includes('export ')
      )) || (language === 'html' && (
        codeLower.includes('<!doctype') ||
        codeLower.includes('<html') ||
        codeLower.includes('<head') ||
        codeLower.includes('<body')
      ));
      
      debugLogger.debug('AIService.Relevance', 'Generic project validation', {
        isRelevant,
        language,
        hasJS: language === 'javascript',
        hasHTML: language === 'html'
      });
      return isRelevant;
    }
    
    // Si no hay contexto específico conocido, RECHAZAR por defecto (más restrictivo)
    debugLogger.debug('AIService.Relevance', 'Contexto no reconocido; rechazando archivo');
    return false;
  }

  /**
   * Obtener extensión de archivo basada en el lenguaje
   */
  getLanguageExtension(language) {
    const extensions = {
      'python': 'py',
      'javascript': 'js',
      'typescript': 'ts',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'csharp': 'cs',
      'perl': 'pl',
      'ruby': 'rb',
      'swift': 'swift',
      'kotlin': 'kt',
      'scala': 'scala',
      'rust': 'rs',
      'dart': 'dart',
      'php': 'php',
      'lua': 'lua',
      'r': 'r',
      'matlab': 'm',
      'octave': 'm',
      'fortran': 'f90',
      'haskell': 'hs',
      'erlang': 'erl',
      'elixir': 'ex',
      'clojure': 'clj',
      'fsharp': 'fs',
      'ocaml': 'ml',
      'prolog': 'pl',
      'lisp': 'lisp',
      'scheme': 'scm',
      'racket': 'rkt',
      'd': 'd',
      'nim': 'nim',
      'crystal': 'cr',
      'zig': 'zig',
      'v': 'v',
      'sql': 'sql',
      'matlab': 'm',
      'octave': 'm',
      'fortran': 'f90',
      'assembly': 'asm',
      'vhdl': 'vhdl',
      'verilog': 'v',
      'tcl': 'tcl',
      'ada': 'adb',
      'cobol': 'cob',
      'pascal': 'pas',
      'smalltalk': 'st',
      'forth': 'fth',
      'apl': 'apl',
      'j': 'ijs',
      'k': 'k',
      'q': 'q',
      'wolfram': 'wl',
      'maxima': 'mac',
      'sage': 'sage',
      'maple': 'mpl',
      'mathematica': 'nb',
      'go': 'go',
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
  }

  /**
   * ℹ️ NOTA: Validación de memoria ahora es PASIVA
   * - El monitoreo solo reporta datos
   * - Las descargas son MANUALES (widget)
   * - Sin auto-descarga automática
   */

  /**
   * ✅ NUEVO: Calcular contexto dinámico según RAM disponible
   */
  _calcDynamicContext(freeRAMMB) {
    return this.memoryService.calcDynamicContext(freeRAMMB);
  }

  /**
   * 📝 Cambiar modelo - SIN auto-descarga
   * La descarga del modelo anterior es MANUAL (widget)
   */
  async switchModel(newModelId, newModelType) {
    const oldModel = this.currentModel;
    const oldType = this.modelType;

    this.currentModel = newModelId;
    this.modelType = newModelType;

    this.saveConfig();
  }

  /**
   * ✅ NUEVO: Cargar modelo automáticamente al reiniciar
   * Intenta cargar el último modelo usado
   */
  async autoLoadLastModel() {
    try {
      const config = JSON.parse(localStorage.getItem('ai-service-config') || '{}');
      
      if (!config.currentModel || !config.modelType) {
        return false;
      }

      const modelId = config.currentModel;
      const modelType = config.modelType;

      // Si es modelo local, verificar que existe
      if (modelType === 'local') {
        const localModel = this.getAllLocalModels().find(m => m.id === modelId);
        
        if (!localModel) {
          console.warn(`[AIService] ⚠️ Modelo local ${modelId} no encontrado`);
          return false;
        }

        if (!localModel.downloaded) {
          console.warn(`[AIService] ⚠️ Modelo ${modelId} no está descargado`);
          return false;
        }
      }

      // Si es modelo remoto, verificar que existe
      if (modelType === 'remote') {
        const remoteModel = this.models.remote.find(m => m.id === modelId);
        
        if (!remoteModel) {
          console.warn(`[AIService] ⚠️ Modelo remoto ${modelId} no encontrado`);
          return false;
        }
      }

      // Cargar el modelo
      this.currentModel = modelId;
      this.modelType = modelType;

      // Si es local, usar ModelMemoryService para cargarlo en memoria
      if (modelType === 'local') {
        try {
          // Usar loadModelToMemory que usa /api/generate con keep_alive
          const loaded = await this.memoryService.loadModelToMemory(modelId);
          if (!loaded) {
            console.warn(`[AIService] ⚠️ No se pudo precargar ${modelId}, pero Ollama lo cargará automáticamente`);
          }
        } catch (error) {
          console.warn(`[AIService] ⚠️ Error precargando modelo: ${error.message}`);
          // No es crítico, Ollama cargará automáticamente cuando se use
        }
      }

      return true;

    } catch (error) {
      console.error('[AIService] ❌ Error al cargar modelo automáticamente:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const aiService = new AIService();
export default aiService;

