/**
 * AIService - Servicio principal para manejar las APIs de IA
 * Soporta modelos remotos (GPT, Claude, etc.) y locales (Llama, Qwen, DeepSeek)
 */

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
        { 
          id: 'gemini-1.0-pro', 
          name: 'Gemini 1.0 Pro', 
          provider: 'google', 
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent', 
          performance: 'medium',
          description: 'Modelo estable y confiable de Google. Buena opción para uso general y programación.',
          useCases: ['Programación general', 'Asistencia', 'Análisis básico', 'Escritura', 'Resolución de problemas'],
          strengths: ['Estabilidad', 'Confiabilidad', 'Buena calidad', 'Costo eficiente'],
          bestFor: 'Usuarios que buscan estabilidad, programación básica y uso general confiable'
        },
      ],
      local: [
        { 
          id: 'llama3.2', 
          name: 'Llama 3.2 (3B)', 
          size: '2GB', 
          downloaded: false, 
          performance: 'low',
          description: 'Modelo ligero y rápido de Meta. Ideal para dispositivos con recursos limitados y tareas básicas.',
          useCases: ['Asistencia básica', 'Respuestas rápidas', 'Dispositivos con poca RAM', 'Tareas simples'],
          strengths: ['Muy ligero', 'Velocidad alta', 'Bajo consumo', 'Fácil de ejecutar'],
          bestFor: 'Dispositivos con poca RAM, tareas básicas y usuarios que priorizan la velocidad'
        },
        { 
          id: 'llama3.1', 
          name: 'Llama 3.1 (8B)', 
          size: '4.7GB', 
          downloaded: false, 
          performance: 'high',
          description: 'Modelo avanzado de Meta con excelente rendimiento. Ideal para programación y análisis complejos.',
          useCases: ['Programación avanzada', 'Análisis de código', 'Escritura técnica', 'Resolución de problemas complejos'],
          strengths: ['Excelente programación', 'Razonamiento sólido', 'Código de calidad', 'Análisis profundo'],
          bestFor: 'Desarrolladores, programadores y usuarios que necesitan análisis de código de calidad'
        },
        { 
          id: 'llama3', 
          name: 'Llama 3 (8B)', 
          size: '4.7GB', 
          downloaded: false, 
          performance: 'high',
          description: 'Modelo estable y confiable de Meta. Buen balance entre rendimiento y recursos para uso general.',
          useCases: ['Programación general', 'Asistencia técnica', 'Análisis de datos', 'Escritura', 'Resolución de problemas'],
          strengths: ['Estabilidad', 'Buena programación', 'Análisis sólido', 'Respuestas coherentes'],
          bestFor: 'Uso general, programación básica-intermedia y usuarios que buscan estabilidad'
        },
        { 
          id: 'mistral', 
          name: 'Mistral (7B)', 
          size: '4.1GB', 
          downloaded: false, 
          performance: 'medium',
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
          description: 'Modelo chino con capacidades multilingües. Excelente para programación y análisis en múltiples idiomas.',
          useCases: ['Programación multilingüe', 'Análisis de código', 'Traducción técnica', 'Asistencia general'],
          strengths: ['Multilingüe', 'Buena programación', 'Análisis de código', 'Flexibilidad'],
          bestFor: 'Desarrolladores internacionales, programación multilingüe y análisis de código'
        },
        { 
          id: 'deepseek-r1:8b', 
          name: 'DeepSeek R1 (8B)', 
          size: '4.7GB', 
          downloaded: false, 
          performance: 'high',
          description: 'Modelo especializado en razonamiento y programación. Ideal para tareas que requieren lógica profunda.',
          useCases: ['Programación compleja', 'Razonamiento lógico', 'Análisis matemático', 'Resolución de algoritmos', 'Debugging avanzado'],
          strengths: ['Razonamiento superior', 'Programación avanzada', 'Lógica matemática', 'Análisis profundo'],
          bestFor: 'Desarrolladores senior, matemáticos, investigadores y usuarios que necesitan razonamiento profundo'
        },
        { 
          id: 'gemma2', 
          name: 'Gemma 2 (9B)', 
          size: '5.4GB', 
          downloaded: false, 
          performance: 'high',
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
          description: 'Modelo compacto de Microsoft. Ideal para dispositivos con recursos limitados y tareas básicas.',
          useCases: ['Asistencia básica', 'Respuestas rápidas', 'Dispositivos móviles', 'Tareas simples', 'Prototipado'],
          strengths: ['Muy compacto', 'Velocidad alta', 'Bajo consumo', 'Fácil instalación'],
          bestFor: 'Dispositivos con recursos limitados, desarrollo móvil y tareas básicas rápidas'
        },
      ]
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
          this.models.local = this.models.local.map(model => {
            const saved = parsed.localModels.find(m => m.id === model.id);
            return saved ? { ...model, downloaded: saved.downloaded } : model;
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
        localModels: this.models.local.map(m => ({ id: m.id, downloaded: m.downloaded }))
      };
      localStorage.setItem('ai-service-config', JSON.stringify(config));
    } catch (error) {
      console.error('Error guardando configuración de AI:', error);
    }
  }

  /**
   * Obtener lista de modelos disponibles
   */
  getAvailableModels(type = null) {
    if (type) {
      return this.models[type] || [];
    }
    return {
      remote: this.models.remote,
      local: this.models.local
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
    this.models.local.forEach(model => {
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
    // Si hay configuración manual, usarla
    if (this.performanceConfig) {
      return this.performanceConfig;
    }

    // Si no, usar configuración automática
    const model = this.models[modelType].find(m => m.id === modelId);
    if (!model) return this.getDefaultPerformanceConfig();

    const performanceLevel = model.performance || 'medium';
    
    const configs = {
      low: {
        maxTokens: 1000,
        temperature: 0.7,
        maxHistory: 5,
        useStreaming: false,
        contextLimit: 2000
      },
      medium: {
        maxTokens: 1500,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 4000
      },
      high: {
        maxTokens: 2000,
        temperature: 0.7,
        maxHistory: 10,
        useStreaming: true,
        contextLimit: 8000
      }
    };

    return configs[performanceLevel] || configs.medium;
  }

  /**
   * Configuración por defecto
   */
  getDefaultPerformanceConfig() {
    return {
      maxTokens: 1500,
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
        const installedModels = data.models.map(model => {
          const existingModel = this.models.local.find(m => m.id === model.name);
          if (existingModel) {
            return { ...existingModel, downloaded: true };
          } else {
            // Modelo no conocido, agregarlo
            return {
              id: model.name,
              name: model.name,
              size: model.size ? `${(model.size / 1e9).toFixed(1)}GB` : 'Desconocido',
              downloaded: true
            };
          }
        });
        
        // Combinar modelos predefinidos con los detectados
        const allModels = [...this.models.local];
        installedModels.forEach(installed => {
          const index = allModels.findIndex(m => m.id === installed.id);
          if (index >= 0) {
            allModels[index] = installed;
          } else {
            allModels.push(installed);
          }
        });
        
        this.models.local = allModels;
        this.saveConfig();
        
        return installedModels;
      }
      
      return [];
    } catch (error) {
      console.error('Error detectando modelos de Ollama:', error);
      return [];
    }
  }

  /**
   * Agregar modelo personalizado
   */
  addCustomModel(modelId, modelName = null) {
    const existingModel = this.models.local.find(m => m.id === modelId);
    if (!existingModel) {
      this.models.local.push({
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
            body: JSON.stringify(requestBody)
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
    const model = this.models.local.find(m => m.id === this.currentModel);
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
      
      // Mensajes de error más específicos
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
          num_predict: options.maxTokens || 1500
        }
      })
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
      })
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
   * Descargar modelo local usando Ollama
   */
  async downloadLocalModel(modelId, onProgress = null) {
    const model = this.models.local.find(m => m.id === modelId);
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
    const model = this.models.local.find(m => m.id === modelId);
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
}

// Exportar instancia singleton
export const aiService = new AIService();
export default aiService;

