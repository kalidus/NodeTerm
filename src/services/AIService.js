/**
 * AIService - Servicio principal para manejar las APIs de IA
 * Soporta modelos remotos (GPT, Claude, etc.) y locales (Llama, Qwen, DeepSeek)
 */

import { conversationService } from './ConversationService';
import debugLogger from '../utils/debugLogger';

class AIService {
  constructor() {
    this.currentModel = null;
    this.modelType = 'remote'; // 'remote', 'local' o 'remote-ollama'
    this.apiKey = null;
    this.remoteOllamaUrl = null;
    this.performanceConfig = null; // Configuración manual de rendimiento
    this.models = {
      remote: [
        { 
          id: 'gpt-4', 
          name: 'GPT-4', 
          provider: 'openai', 
          endpoint: 'https://api.openai.com/v1/chat/completions', 
          performance: 'high',
          description: 'El modelo más avanzado de OpenAI. Excelente para tareas complejas, programación, análisis y razonamiento profundo.',
          useCases: ['Programación avanzada', 'Análisis de datos', 'Investigación', 'Escritura técnica', 'Resolución de problemas complejos'],
          strengths: ['Razonamiento superior', 'Código de alta calidad', 'Análisis detallado', 'Creatividad avanzada'],
          bestFor: 'Desarrolladores, investigadores, analistas y usuarios que necesitan la máxima calidad'
        },
        { 
          id: 'gpt-3.5-turbo', 
          name: 'GPT-3.5 Turbo', 
          provider: 'openai', 
          endpoint: 'https://api.openai.com/v1/chat/completions', 
          performance: 'medium',
          description: 'Modelo rápido y eficiente de OpenAI. Ideal para uso general, programación básica y conversaciones.',
          useCases: ['Programación básica', 'Asistencia general', 'Escritura', 'Traducción', 'Resumen de textos'],
          strengths: ['Velocidad alta', 'Costo eficiente', 'Buena calidad general', 'Respuestas rápidas'],
          bestFor: 'Uso diario, programación básica, estudiantes y usuarios que buscan velocidad'
        },
        { 
          id: 'claude-3-opus', 
          name: 'Claude 3 Opus', 
          provider: 'anthropic', 
          endpoint: 'https://api.anthropic.com/v1/messages', 
          performance: 'high',
          description: 'El modelo más potente de Anthropic. Destaca en análisis, escritura creativa y comprensión de contexto.',
          useCases: ['Análisis profundo', 'Escritura creativa', 'Investigación académica', 'Edición de textos', 'Análisis de documentos'],
          strengths: ['Comprensión superior', 'Escritura excelente', 'Análisis detallado', 'Creatividad'],
          bestFor: 'Escritores, investigadores, analistas y usuarios que necesitan análisis profundo'
        },
        { 
          id: 'claude-3-sonnet', 
          name: 'Claude 3 Sonnet', 
          provider: 'anthropic', 
          endpoint: 'https://api.anthropic.com/v1/messages', 
          performance: 'medium',
          description: 'Modelo equilibrado de Anthropic. Buen balance entre velocidad y calidad para uso general.',
          useCases: ['Programación', 'Asistencia general', 'Análisis de datos', 'Escritura', 'Resolución de problemas'],
          strengths: ['Balance velocidad/calidad', 'Buena programación', 'Análisis sólido', 'Respuestas coherentes'],
          bestFor: 'Desarrolladores, profesionales y usuarios que buscan un buen balance'
        },
        { 
          id: 'gemini-2.5-flash', 
          name: 'Gemini 2.5 Flash', 
          provider: 'google', 
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', 
          performance: 'high',
          description: 'El modelo más reciente y rápido de Google. Excelente para tareas generales y programación con velocidad superior.',
          useCases: ['Programación rápida', 'Análisis de datos', 'Investigación', 'Escritura técnica', 'Resolución de problemas'],
          strengths: ['Velocidad excepcional', 'Código de calidad', 'Análisis rápido', 'Multimodal'],
          bestFor: 'Desarrolladores que necesitan velocidad, analistas y usuarios que buscan respuestas rápidas'
        },
        { 
          id: 'gemini-2.5-pro', 
          name: 'Gemini 2.5 Pro', 
          provider: 'google', 
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent', 
          performance: 'high',
          description: 'El modelo más potente de Google. Máxima calidad para tareas complejas y análisis profundos.',
          useCases: ['Programación avanzada', 'Análisis complejo', 'Investigación profunda', 'Escritura técnica', 'Resolución de problemas difíciles'],
          strengths: ['Máxima calidad', 'Razonamiento superior', 'Análisis profundo', 'Código avanzado'],
          bestFor: 'Desarrolladores senior, investigadores y usuarios que necesitan la máxima calidad'
        },
        { 
          id: 'gemini-2.0-flash-exp', 
          name: 'Gemini 2.0 Flash', 
          provider: 'google', 
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', 
          performance: 'high',
          description: 'Modelo experimental de Google con capacidades avanzadas. Ideal para probar nuevas funcionalidades.',
          useCases: ['Experimentación', 'Funcionalidades nuevas', 'Análisis innovador', 'Programación experimental'],
          strengths: ['Funcionalidades nuevas', 'Capacidades experimentales', 'Innovación', 'Tecnología de vanguardia'],
          bestFor: 'Usuarios avanzados, investigadores y desarrolladores que quieren probar lo último'
        },
      ],
      local: {
        ollama: [
          { 
            id: 'llama3.2:latest', 
            name: 'Llama 3.2 (Latest - 3B)', 
            size: '2GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo predeterminado de Llama 3.2 optimizado para texto. Versión recomendada para la mayoría de usuarios.',
            useCases: ['Programación general', 'Asistencia técnica', 'Procesamiento de texto', 'Uso general'],
            strengths: ['Versión recomendada', 'Optimizado para texto', 'Excelente balance', 'Versatilidad'],
            bestFor: 'Usuarios que quieren la versión más reciente optimizada para texto'
          },
          { 
            id: 'llama3.2:1b', 
            name: 'Llama 3.2 (1B)', 
            size: '1.3GB', 
            downloaded: false, 
            performance: 'low',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo más ligero de Llama 3.2 optimizado para dispositivos con recursos limitados. Ideal para uso básico.',
            useCases: ['Procesamiento básico', 'Dispositivos móviles', 'Uso ligero', 'Tareas simples'],
            strengths: ['Muy ligero', 'Rápido', 'Eficiente', 'Ideal para móviles'],
            bestFor: 'Usuarios con dispositivos limitados o que necesitan máxima velocidad'
          },
          { 
            id: 'llama3.1:latest', 
            name: 'Llama 3.1 (Latest - 8B)', 
            size: '4.7GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo predeterminado de Llama 3.1 con excelente rendimiento. Versión recomendada para la mayoría de usuarios.',
            useCases: ['Programación avanzada', 'Análisis de código', 'Escritura técnica', 'Resolución de problemas complejos', 'Uso general'],
            strengths: ['Versión recomendada', 'Excelente programación', 'Razonamiento sólido', 'Código de calidad'],
            bestFor: 'Usuarios que quieren lo mejor de Llama 3.1 sin configurar versiones específicas'
          },
          { 
            id: 'llama3.1:70b', 
            name: 'Llama 3.1 (70B)', 
            size: '40GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo más potente de Llama 3.1. Excelente para programación avanzada y análisis complejos con máxima calidad.',
            useCases: ['Programación avanzada', 'Análisis de código complejo', 'Investigación', 'Razonamiento profundo', 'Tareas de alta complejidad'],
            strengths: ['Excelente programación', 'Razonamiento superior', 'Código de máxima calidad', 'Análisis profundo', 'Máxima potencia'],
            bestFor: 'Desarrolladores senior, investigadores y usuarios que necesitan máxima calidad en programación'
          },
          { 
            id: 'llama3', 
            name: 'Llama 3 (8B)', 
            size: '4.7GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo estable y confiable de Meta. Buen balance entre rendimiento y recursos para uso general.',
            useCases: ['Programación general', 'Asistencia técnica', 'Análisis de datos', 'Escritura', 'Resolución de problemas'],
            strengths: ['Estabilidad', 'Buena programación', 'Análisis sólido', 'Respuestas coherentes'],
            bestFor: 'Uso general, programación básica-intermedia y usuarios que buscan estabilidad'
          },
          { 
            id: 'llama3:70b', 
            name: 'Llama 3 (70B)', 
            size: '40GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo más potente de Llama 3. Excelente para programación avanzada y análisis complejos con máxima calidad.',
            useCases: ['Programación avanzada', 'Análisis de código complejo', 'Investigación', 'Razonamiento profundo', 'Tareas de alta complejidad'],
            strengths: ['Excelente programación', 'Razonamiento superior', 'Código de máxima calidad', 'Análisis profundo', 'Máxima potencia'],
            bestFor: 'Desarrolladores senior, investigadores y usuarios que necesitan máxima calidad en programación'
          },
          { 
            id: 'llama2', 
            name: 'Llama 2 (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo clásico de Meta. Versión anterior estable y confiable para uso general.',
            useCases: ['Programación básica', 'Asistencia general', 'Análisis de texto', 'Resolución de problemas'],
            strengths: ['Estabilidad', 'Buena comprensión', 'Respuestas coherentes', 'Amplio conocimiento'],
            bestFor: 'Uso general, programación básica y usuarios que buscan estabilidad'
          },
          { 
            id: 'deepseek-r1:8b', 
            name: 'DeepSeek R1 (8B)', 
            size: '5.2GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo especializado en razonamiento y programación. Ideal para tareas que requieren lógica profunda.',
            useCases: ['Programación compleja', 'Razonamiento lógico', 'Análisis matemático', 'Resolución de algoritmos', 'Debugging avanzado'],
            strengths: ['Razonamiento superior', 'Programación avanzada', 'Lógica matemática', 'Análisis profundo'],
            bestFor: 'Desarrolladores senior, matemáticos, investigadores y usuarios que necesitan razonamiento profundo'
          },
          { 
            id: 'mistral', 
            name: 'Mistral (7B)', 
            size: '4.1GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo europeo eficiente. Excelente para programación y tareas técnicas con buen rendimiento.',
            useCases: ['Programación', 'Análisis técnico', 'Escritura técnica', 'Resolución de problemas', 'Asistencia general'],
            strengths: ['Eficiencia', 'Buena programación', 'Análisis técnico', 'Respuestas precisas'],
            bestFor: 'Desarrolladores, técnicos y usuarios que buscan eficiencia en programación'
          },
          { 
            id: 'qwen2.5', 
            name: 'Qwen 2.5 (7B)', 
            size: '4.5GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo chino con capacidades multilingües. Excelente para programación y análisis en múltiples idiomas.',
            useCases: ['Programación multilingüe', 'Análisis de código', 'Traducción técnica', 'Asistencia general'],
            strengths: ['Multilingüe', 'Buena programación', 'Análisis de código', 'Flexibilidad'],
            bestFor: 'Desarrolladores internacionales, programación multilingüe y análisis de código'
          },
          { 
            id: 'gemma2', 
            name: 'Gemma 2 (9B)', 
            size: '5.4GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo de Google optimizado para eficiencia. Excelente para programación y análisis con recursos moderados.',
            useCases: ['Programación eficiente', 'Análisis de datos', 'Escritura técnica', 'Resolución de problemas', 'Asistencia general'],
            strengths: ['Eficiencia', 'Buena programación', 'Análisis sólido', 'Optimización'],
            bestFor: 'Desarrolladores que buscan eficiencia, análisis de datos y programación optimizada'
          },
          { 
            id: 'phi3', 
            name: 'Phi-3 (3.8B)', 
            size: '2.3GB', 
            downloaded: false, 
            performance: 'low',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo compacto de Microsoft. Ideal para dispositivos con recursos limitados y tareas básicas.',
            useCases: ['Asistencia básica', 'Respuestas rápidas', 'Dispositivos móviles', 'Tareas simples', 'Prototipado'],
            strengths: ['Muy compacto', 'Velocidad alta', 'Bajo consumo', 'Fácil instalación'],
            bestFor: 'Dispositivos con recursos limitados, desarrollo móvil y tareas básicas rápidas'
          },
          { 
            id: 'codellama', 
            name: 'Code Llama (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo de programación de Meta basado en Llama. Excelente para generación y comprensión de código.',
            useCases: ['Programación en múltiples lenguajes', 'Generación de código', 'Explicación de código', 'Refactoring', 'Debugging'],
            strengths: ['Multilenguaje', 'Comprensión de código', 'Generación eficiente', 'Soporte para múltiples paradigmas'],
            bestFor: 'Desarrolladores que trabajan con múltiples lenguajes de programación'
          },
          { 
            id: 'wizardcoder', 
            name: 'WizardCoder (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo especializado en programación con capacidades avanzadas de generación de código.',
            useCases: ['Generación de código', 'Programación asistida', 'Resolución de problemas', 'Optimización de código'],
            strengths: ['Generación de código limpio', 'Comprensión de requerimientos', 'Optimización', 'Buena documentación'],
            bestFor: 'Desarrolladores que buscan asistencia inteligente en programación'
          },
          { 
            id: 'starcoder', 
            name: 'StarCoder (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo de código de BigCode entrenado en repositorios públicos. Excelente para programación.',
            useCases: ['Programación en múltiples lenguajes', 'Generación de código', 'Completado de código', 'Refactoring'],
            strengths: ['Gran conocimiento de código', 'Soporte multilenguaje', 'Comprensión de patrones', 'Generación eficiente'],
            bestFor: 'Desarrolladores que necesitan un modelo con amplio conocimiento de código'
          }
        ],
        independent: [
          { 
            id: 'deepseek-coder:6.7b', 
            name: 'DeepSeek Coder (6.7B)', 
            size: '4.1GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'independent',
            platformName: 'Independiente',
            platformDescription: 'No requiere Ollama - Funciona directamente',
            description: 'Modelo especializado en programación y generación de código. Optimizado para tareas de desarrollo.',
            useCases: ['Generación de código', 'Refactoring', 'Debugging', 'Documentación técnica', 'Análisis de código'],
            strengths: ['Excelente en programación', 'Generación de código de calidad', 'Comprensión de sintaxis', 'Refactoring inteligente'],
            bestFor: 'Desarrolladores, programadores y equipos de desarrollo que necesitan asistencia en código'
          },
          { 
            id: 'magicoder:7b', 
            name: 'Magicoder (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'independent',
            platformName: 'Independiente',
            platformDescription: 'No requiere Ollama - Funciona directamente',
            description: 'Modelo de programación con capacidades mágicas para generación de código y resolución de problemas.',
            useCases: ['Generación de código', 'Resolución de bugs', 'Optimización', 'Documentación automática'],
            strengths: ['Generación creativa', 'Resolución de problemas', 'Optimización inteligente', 'Código bien documentado'],
            bestFor: 'Desarrolladores que buscan soluciones creativas y optimizadas'
          },
          { 
            id: 'phind-codellama:7b', 
            name: 'Phind CodeLlama (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'independent',
            platformName: 'Independiente',
            platformDescription: 'No requiere Ollama - Funciona directamente',
            description: 'Versión optimizada de CodeLlama por Phind. Mejorado para búsqueda y generación de código.',
            useCases: ['Búsqueda de código', 'Generación eficiente', 'Análisis de código', 'Documentación'],
            strengths: ['Búsqueda inteligente', 'Generación rápida', 'Análisis profundo', 'Documentación clara'],
            bestFor: 'Desarrolladores que necesitan búsqueda y análisis eficiente de código'
          },
          { 
            id: 'octocoder:7b', 
            name: 'OctoCoder (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'independent',
            platformName: 'Independiente',
            platformDescription: 'No requiere Ollama - Funciona directamente',
            description: 'Modelo especializado en desarrollo web y aplicaciones. Optimizado para tecnologías modernas.',
            useCases: ['Desarrollo web', 'Aplicaciones modernas', 'Frontend/Backend', 'APIs', 'Frameworks populares'],
            strengths: ['Conocimiento web', 'Frameworks modernos', 'APIs y servicios', 'Desarrollo full-stack'],
            bestFor: 'Desarrolladores web y de aplicaciones modernas'
          },
          { 
            id: 'sqlcoder:7b', 
            name: 'SQLCoder (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'independent',
            platformName: 'Independiente',
            platformDescription: 'No requiere Ollama - Funciona directamente',
            description: 'Modelo especializado en SQL y bases de datos. Excelente para consultas y optimización de bases de datos.',
            useCases: ['Consultas SQL', 'Optimización de bases de datos', 'Análisis de datos', 'Diseño de esquemas', 'Migración de datos'],
            strengths: ['SQL avanzado', 'Optimización de consultas', 'Análisis de rendimiento', 'Diseño de bases de datos'],
            bestFor: 'Desarrolladores de bases de datos, analistas de datos y administradores de sistemas'
          },
          { 
            id: 'python-coder:7b', 
            name: 'Python Coder (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'independent',
            platformName: 'Independiente',
            platformDescription: 'No requiere Ollama - Funciona directamente',
            description: 'Modelo especializado en Python. Optimizado para desarrollo, análisis de datos y machine learning.',
            useCases: ['Desarrollo Python', 'Data Science', 'Machine Learning', 'Automatización', 'Scripting'],
            strengths: ['Python puro', 'Librerías populares', 'Data Science', 'ML/AI', 'Automatización'],
            bestFor: 'Desarrolladores Python, científicos de datos y profesionales de ML/AI'
          }
        ]
      }
    };
    this.conversationHistory = [];
    this.loadConfig();
  }

  /**
   * Cargar configuración desde localStorage
   */
  loadConfig() {
    try {
      const config = localStorage.getItem('ai-service-config');
      if (config) {
        const parsed = JSON.parse(config);
        this.currentModel = parsed.currentModel || null;
        this.modelType = parsed.modelType || 'remote';
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

    // Si hay configuración manual, usarla (pero solo para modelos locales)
    if (this.performanceConfig) {
      debugLogger.trace('AIService', `Usando configuración manual:`, this.performanceConfig);
      return this.performanceConfig;
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
              console.log(`Modelo ${modelName} está instalado pero no está en la configuración predefinida`);
            }
          }
        });
        
        // Limpiar duplicados - remover modelos predefinidos que ya están instalados con tags
        this.cleanDuplicateModels();
        
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
    this.currentModel = modelId;
    this.modelType = type;
    this.saveConfig();
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

    // Mejorar el mensaje si es para scripts de Python
    const enhancedMessage = this.enhanceMessageForPythonScripts(message);
    
    // Agregar mensaje al historial
    this.conversationHistory.push({
      role: 'user',
      content: enhancedMessage,
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

    // Obtener mensajes de la conversación actual
    const conversationMessages = currentConversation.messages || [];
    
    // 🪟 VENTANA DESLIZANTE INTELIGENTE POR TOKENS (como ChatGPT/Claude)
    let limitedMessages = this.smartTokenBasedHistoryLimit(conversationMessages, finalOptions);

    // Mejorar el mensaje si es para scripts de Python
    const enhancedMessage = this.enhanceMessageForPythonScripts(message);
    
    // Agregar mensaje del usuario a la conversación
    conversationService.addMessage('user', enhancedMessage, {
      timestamp: Date.now()
    });

    const startTime = Date.now();
    
    try {
      let response;
      
      // Callback de inicio
      if (callbacks.onStart) {
        callbacks.onStart({
          model: this.currentModel,
          modelType: this.modelType,
          message: message
        });
      }

      if (this.modelType === 'remote') {
        response = await this.sendToRemoteModelWithCallbacks(message, limitedMessages, callbacks, finalOptions);
      } else {
        response = await this.sendToLocalModelWithCallbacks(message, limitedMessages, callbacks, finalOptions);
      }

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Callback de finalización
      if (callbacks.onComplete) {
        callbacks.onComplete({
          response,
          latency,
          model: this.currentModel,
          modelType: this.modelType
        });
      }

      // Agregar respuesta a la conversación actual
      conversationService.addMessage('assistant', response, {
        latency,
        model: this.currentModel,
        modelType: this.modelType,
        tokens: finalOptions.maxTokens
      });

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
          modelType: this.modelType
        });
      }
      
      console.error('Error enviando mensaje a IA:', error);
      throw error;
    }
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
              console.log(`⚠️ Modelo ${model.id} sobrecargado, reintentando en ${attempt * 2} segundos... (intento ${attempt}/3)`);
              await new Promise(resolve => setTimeout(resolve, attempt * 2000)); // Esperar 2, 4 segundos
              continue;
            }
            
            throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Extraer respuesta según el proveedor
      if (model.provider === 'openai') {
        return data.choices[0].message.content;
      } else if (model.provider === 'anthropic') {
        return data.content[0].text;
          } else if (model.provider === 'google') {
            return data.candidates[0].content.parts[0].text;
          }
        } catch (error) {
          lastError = error;
          
          // Si es error de modelo sobrecargado y no es el último intento, reintentar
          if (error.message.includes('overloaded') && attempt < 3) {
            console.log(`⚠️ Modelo ${model.id} sobrecargado, reintentando en ${attempt * 2} segundos... (intento ${attempt}/3)`);
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
      console.error('Error llamando a API remota:', error);
      
      // Si es error de modelo sobrecargado, intentar con otro modelo del mismo proveedor
      if (error.message.includes('overloaded') || error.message.includes('503') || error.message.includes('The model is overloaded')) {
        console.log(`🔄 Modelo ${model.id} sobrecargado, intentando fallback automático...`);
        
        // Buscar otros modelos del mismo proveedor que no hayan sido intentados
        const alternativeModels = this.models.remote.filter(m => 
          m.provider === model.provider && 
          m.id !== model.id && 
          this.getApiKey(m.provider) // Que tenga API key configurada
        );
        
        if (alternativeModels.length > 0) {
          const fallbackModel = alternativeModels[0];
          console.log(`🔄 Cambiando a modelo fallback: ${fallbackModel.name}`);
          
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

          const data = await response.json();
          
          // Extraer respuesta según el proveedor
          if (model.provider === 'openai') {
            return data.choices[0].message.content;
          } else if (model.provider === 'anthropic') {
            return data.content[0].text;
          } else if (model.provider === 'google') {
            return data.candidates[0].content.parts[0].text;
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
      const messages = conversationMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      const ollamaUrl = this.getOllamaUrl();
      
      // Callback de estado: conectando
      if (callbacks.onStatus) {
        callbacks.onStatus({
          status: 'connecting',
          message: `Conectando con ${model.name} local...`,
          model: model.name,
          provider: 'local'
        });
      }
      
      // Usar streaming si está habilitado
      if (options.useStreaming) {
        return await this.sendToLocalModelStreamingWithCallbacks(model.id, messages, callbacks, options);
      } else {
        return await this.sendToLocalModelNonStreamingWithCallbacks(model.id, messages, callbacks, options);
      }
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
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 4000,
          num_ctx: options.contextLimit || 8000,
          top_k: 40,
          top_p: 0.9,
          repeat_penalty: 1.1
        }
      }),
      signal: options.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Ollama:', errorText);
      throw new Error(`Error del servidor Ollama (${response.status})`);
    }

    const data = await response.json();
    
    // La respuesta de Ollama viene en data.message.content
    if (data.message && data.message.content) {
      return data.message.content;
    } else {
      throw new Error('Respuesta inválida del modelo local');
    }
  }

  /**
   * Enviar mensaje a modelo local con streaming
   */
  async sendToLocalModelStreaming(modelId, messages, options) {
    const ollamaUrl = this.getOllamaUrl();
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 1500
        }
      }),
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
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 1500
        }
      }),
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
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 4000,
          num_ctx: options.contextLimit || 8000,
          top_k: 40,
          top_p: 0.9,
          repeat_penalty: 1.1
        }
      }),
      signal: options.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Ollama:', errorText);
      throw new Error(`Error del servidor Ollama (${response.status})`);
    }

    const data = await response.json();
    
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
      console.error('Error cargando historial:', error);
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
      console.error('Error guardando historial:', error);
    }
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
    console.log(`🪟 [AIService] Ventana deslizante activada: ${totalTokens} > ${targetLimit} tokens`);

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
      console.log(`📄 [AIService] Contexto optimizado: ${truncatedCount} mensajes antiguos archivados para mantener fluidez (${totalTokens - runningTotal} tokens liberados)`);
      
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
   * Mejorar el mensaje del usuario para scripts de Python
   */
  enhanceMessageForPythonScripts(message) {
    // Si el mensaje contiene solicitudes de scripts Python, agregar instrucciones de formato
    if (message.toLowerCase().includes('script') && 
        (message.toLowerCase().includes('python') || message.toLowerCase().includes('py'))) {
      
      const enhancedMessage = `${message}

IMPORTANTE: Para cada script de Python que generes, asegúrate de:
1. Envolver cada script completo en bloques de código con \`\`\`python al inicio y \`\`\` al final
2. Cada script debe ser independiente y ejecutable
3. Incluir comentarios descriptivos en español
4. Usar nombres de variables y funciones descriptivos
5. Cada script debe tener al menos 3-5 líneas de código funcional

Ejemplo de formato correcto:
\`\`\`python
# Script 1: Calculadora básica
def calcular(a, b, operacion):
    if operacion == '+':
        return a + b
    elif operacion == '-':
        return a - b
    # ... más código

if __name__ == "__main__":
    resultado = calcular(5, 3, '+')
    print(f"El resultado es: {resultado}")
\`\`\`

\`\`\`python
# Script 2: Generador de números aleatorios
import random

def generar_numero(min_val, max_val):
    return random.randint(min_val, max_val)

if __name__ == "__main__":
    numero = generar_numero(1, 100)
    print(f"Número aleatorio: {numero}")
\`\`\``;
      
      return enhancedMessage;
    }
    
    return message;
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
    
    console.log('🔍 Validando relevancia:', {
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
      
      console.log('🔍 Electron validation:', isRelevant, {
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
      
      console.log('🔍 React validation:', isRelevant);
      return isRelevant;
    }
    
    if (userContextLower.includes('vue')) {
      const isRelevant = codeLower.includes('vue') || 
                         codeLower.includes('import') && codeLower.includes('vue');
      
      console.log('🔍 Vue validation:', isRelevant);
      return isRelevant;
    }
    
    if (userContextLower.includes('python') || userContextLower.includes('pandas')) {
      const isRelevant = codeLower.includes('import') || 
                         codeLower.includes('def ') || 
                         codeLower.includes('pandas');
      
      console.log('🔍 Python validation:', isRelevant);
      return isRelevant;
    }
    
    if (userContextLower.includes('web scraper') || userContextLower.includes('scraper')) {
      const isRelevant = codeLower.includes('scraper') || 
                         codeLower.includes('requests') ||
                         codeLower.includes('beautifulsoup') ||
                         codeLower.includes('fetch(');
      
      console.log('🔍 Web scraper validation:', isRelevant);
      return isRelevant;
    }
    
    if (userContextLower.includes('data analysis') || userContextLower.includes('analisis de datos')) {
      const isRelevant = codeLower.includes('pandas') || 
                         codeLower.includes('numpy') ||
                         codeLower.includes('dataframe') ||
                         codeLower.includes('csv');
      
      console.log('🔍 Data analysis validation:', isRelevant);
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
      
      console.log('🔍 Generic project validation:', isRelevant, { language, hasJS: language === 'javascript', hasHTML: language === 'html' });
      return isRelevant;
    }
    
    // Si no hay contexto específico conocido, RECHAZAR por defecto (más restrictivo)
    console.log('⚠️ Contexto no reconocido, rechazando archivo');
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
      'julia': 'jl',
      'powershell': 'ps1',
      'batch': 'bat',
      'cmd': 'cmd',
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
}

// Exportar instancia singleton
export const aiService = new AIService();
export default aiService;

