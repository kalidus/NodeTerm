/**
 * AIService - Servicio principal para manejar las APIs de IA
 * Soporta modelos remotos (GPT, Claude, etc.) y locales (Llama, Qwen, DeepSeek)
 */

class AIService {
  constructor() {
    this.currentModel = null;
    this.modelType = 'remote'; // 'remote' o 'local'
    this.apiKey = null;
    this.models = {
      remote: [
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions' },
        { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', endpoint: 'https://api.anthropic.com/v1/messages' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', endpoint: 'https://api.anthropic.com/v1/messages' },
      ],
      local: [
        { id: 'llama-3-8b', name: 'Llama 3 8B', size: '4.7GB', downloaded: false },
        { id: 'llama-3-70b', name: 'Llama 3 70B', size: '40GB', downloaded: false },
        { id: 'qwen-7b', name: 'Qwen 7B', size: '4.5GB', downloaded: false },
        { id: 'deepseek-33b', name: 'DeepSeek 33B', size: '20GB', downloaded: false },
        { id: 'mistral-7b', name: 'Mistral 7B', size: '4.1GB', downloaded: false },
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
   * Enviar mensaje al modelo de IA
   */
  async sendMessage(message, options = {}) {
    if (!this.currentModel) {
      throw new Error('No se ha seleccionado ningún modelo');
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
        response = await this.sendToRemoteModel(message, options);
      } else {
        response = await this.sendToLocalModel(message, options);
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
    }

    try {
      const response = await fetch(model.endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error en la API');
      }

      const data = await response.json();
      
      // Extraer respuesta según el proveedor
      if (model.provider === 'openai') {
        return data.choices[0].message.content;
      } else if (model.provider === 'anthropic') {
        return data.content[0].text;
      }
    } catch (error) {
      console.error('Error llamando a API remota:', error);
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

    // Aquí se implementaría la comunicación con Ollama o el servidor local
    // Por ahora, retornamos un placeholder
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model.id,
          prompt: message,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error('Error en modelo local');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error llamando a modelo local:', error);
      // Retornar mensaje de error más amigable
      throw new Error('No se pudo conectar con el modelo local. Asegúrate de que Ollama esté ejecutándose.');
    }
  }

  /**
   * Descargar modelo local
   */
  async downloadLocalModel(modelId, onProgress = null) {
    const model = this.models.local.find(m => m.id === modelId);
    if (!model) {
      throw new Error('Modelo no encontrado');
    }

    try {
      // Simular descarga (en producción, esto llamaría a Ollama)
      const response = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: modelId
        })
      });

      if (!response.ok) {
        throw new Error('Error descargando modelo');
      }

      // Marcar como descargado
      model.downloaded = true;
      this.saveConfig();

      return true;
    } catch (error) {
      console.error('Error descargando modelo local:', error);
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
      const response = await fetch('http://localhost:11434/api/delete', {
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

