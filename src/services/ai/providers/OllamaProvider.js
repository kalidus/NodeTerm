/**
 * OllamaProvider - Proveedor para modelos locales de Ollama
 * Soporta streaming y non-streaming, reasoning models, etc.
 */

import { BaseProvider } from './BaseProvider';
import debugLogger from '../../../utils/debugLogger';

export class OllamaProvider extends BaseProvider {
  constructor() {
    super('ollama');
  }

  /**
   * Obtener URL base de Ollama
   * @param {string} ollamaUrl - URL de Ollama (puede ser null para usar default)
   * @returns {string} URL base
   */
  getOllamaUrl(ollamaUrl = null) {
    return ollamaUrl || 'http://localhost:11434';
  }

  /**
   * Preparar headers para la petición HTTP
   */
  prepareHeaders() {
    return {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Preparar opciones de Ollama desde opciones genéricas
   */
  prepareOllamaOptions(options = {}) {
    return {
      temperature: options.temperature ?? 0.7,
      num_predict: options.maxTokens ?? 4000,
      num_ctx: options.contextLimit ?? 8000,
      top_k: options.top_k ?? 40,
      top_p: options.top_p ?? 0.9,
      repeat_penalty: options.repeat_penalty ?? 1.1
    };
  }

  /**
   * Preparar body de la petición HTTP para Ollama
   */
  prepareRequestBody(modelId, messages, options = {}) {
    const ollamaOptions = this.prepareOllamaOptions(options);
    
    return {
      model: modelId,
      messages: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })),
      stream: options.stream || false,
      options: ollamaOptions
    };
  }

  /**
   * Obtener URL del endpoint
   */
  getEndpointUrl(ollamaUrl = null) {
    return `${this.getOllamaUrl(ollamaUrl)}/api/chat`;
  }

  /**
   * Procesar respuesta de Ollama (non-streaming)
   */
  async processResponse(response, modelId) {
    if (!response.ok) {
      const errorText = await response.text();
      debugLogger.error('OllamaProvider', 'Error de Ollama', {
        status: response.status,
        error: errorText
      });
      
      if (response.status === 404) {
        throw new Error('Modelo no encontrado en Ollama. Verifica que el modelo esté descargado correctamente.');
      } else if (response.status === 0 || errorText.includes('Failed to fetch') || errorText.includes('NetworkError')) {
        throw new Error('No se pudo conectar con Ollama. Verifica que esté ejecutándose en http://localhost:11434');
      }
      
      throw new Error(`Error del servidor Ollama (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Log detallado de respuesta
    debugLogger.debug('OllamaProvider', 'Respuesta cruda de Ollama', {
      resumida: JSON.stringify(data).substring(0, 200),
      message: data.message,
      contentLength: data.message?.content?.length || 0,
      hasReasoning: !!(data.message?.reasoning_content || data.reasoning_content)
    });
    
    // Capturar reasoning content de modelos especiales
    const reasoningContent = data.message?.reasoning_content || 
                             data.reasoning_content || 
                             data.message?.reasoning ||
                             data.reasoning ||
                             data.message?.thinking ||
                             data.thinking ||
                             data.message?.chain_of_thought ||
                             data.chain_of_thought ||
                             null;
    
    // Extraer contenido principal
    const content = data.message?.content || '';
    
    if (!content && !reasoningContent) {
      debugLogger.warn('OllamaProvider', 'Respuesta sin contenido', {
        modelId: modelId,
        dataKeys: Object.keys(data),
        messageKeys: data.message ? Object.keys(data.message) : []
      });
      throw new Error('La respuesta de Ollama no contiene contenido');
    }

    // Si hay reasoning, combinarlo con el contenido
    if (reasoningContent) {
      return `[Reasoning]\n${reasoningContent}\n\n[Response]\n${content}`;
    }

    return content;
  }

  /**
   * Enviar mensaje al proveedor (método simple, non-streaming)
   */
  async sendMessage(modelId, messages, options = {}, ollamaUrl = null) {
    const headers = this.prepareHeaders();
    const requestBody = this.prepareRequestBody(modelId, messages, { ...options, stream: false });
    const endpoint = this.getEndpointUrl(ollamaUrl);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
        signal: options.signal
      });

      return await this.processResponse(response, modelId);
    } catch (error) {
      // Manejar errores de conexión
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('No se pudo conectar con Ollama. Verifica que esté ejecutándose en http://localhost:11434');
      } else if (error.message.includes('404')) {
        throw new Error('Modelo no encontrado en Ollama. Verifica que el modelo esté descargado correctamente.');
      }
      
      throw error;
    }
  }

  /**
   * Enviar mensaje con streaming
   * @param {string} modelId - ID del modelo
   * @param {Array} messages - Mensajes de conversación
   * @param {Object} options - Opciones
   * @param {Function} onChunk - Callback para cada chunk recibido
   * @param {string} ollamaUrl - URL de Ollama (opcional)
   * @returns {Promise<string>} Contenido completo acumulado
   */
  async sendMessageStreaming(modelId, messages, options = {}, onChunk = null, ollamaUrl = null) {
    const headers = this.prepareHeaders();
    const requestBody = this.prepareRequestBody(modelId, messages, { ...options, stream: true });
    const endpoint = this.getEndpointUrl(ollamaUrl);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
        signal: options.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        debugLogger.error('OllamaProvider', 'Error de Ollama (streaming)', {
          status: response.status,
          error: errorText
        });
        
        if (response.status === 404) {
          throw new Error('Modelo no encontrado en Ollama. Verifica que el modelo esté descargado correctamente.');
        } else if (response.status === 0 || errorText.includes('Failed to fetch') || errorText.includes('NetworkError')) {
          throw new Error('No se pudo conectar con Ollama. Verifica que esté ejecutándose en http://localhost:11434');
        }
        
        throw new Error(`Error del servidor Ollama (${response.status}): ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let reasoningContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Mantener línea incompleta en buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const json = JSON.parse(line);
            
            // Procesar chunk de contenido
            if (json.message?.content) {
              const chunk = json.message.content;
              fullContent += chunk;
              
              if (onChunk) {
                onChunk(chunk, fullContent);
              }
            }
            
            // Capturar reasoning si está presente
            if (json.message?.reasoning_content || json.reasoning_content) {
              const reasoning = json.message?.reasoning_content || json.reasoning_content;
              reasoningContent += reasoning;
            }
            
            // Si es el último chunk (done: true), terminar
            if (json.done) {
              break;
            }
          } catch (e) {
            // Ignorar líneas que no son JSON válido
            debugLogger.debug('OllamaProvider', 'Línea no JSON en streaming', { line: line.substring(0, 100) });
          }
        }
      }

      // Si hay reasoning, combinarlo con el contenido
      if (reasoningContent) {
        return `[Reasoning]\n${reasoningContent}\n\n[Response]\n${fullContent}`;
      }

      return fullContent;
    } catch (error) {
      // Manejar errores de conexión
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('No se pudo conectar con Ollama. Verifica que esté ejecutándose en http://localhost:11434');
      } else if (error.message.includes('404')) {
        throw new Error('Modelo no encontrado en Ollama. Verifica que el modelo esté descargado correctamente.');
      }
      
      throw error;
    }
  }

  /**
   * Manejar errores específicos de Ollama
   */
  handleError(error, modelId) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return new Error('No se pudo conectar con Ollama. Verifica que esté ejecutándose en http://localhost:11434');
    } else if (error.message.includes('404')) {
      return new Error('Modelo no encontrado en Ollama. Verifica que el modelo esté descargado correctamente.');
    }
    
    return error;
  }
}

// Exportar instancia singleton
export const ollamaProvider = new OllamaProvider();
export default ollamaProvider;

