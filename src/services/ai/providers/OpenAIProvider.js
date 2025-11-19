/**
 * OpenAIProvider - Proveedor para modelos de OpenAI (GPT-4, GPT-3.5, etc.)
 */

import { BaseProvider } from './BaseProvider';
import debugLogger from '../../../utils/debugLogger';

export class OpenAIProvider extends BaseProvider {
  constructor() {
    super('openai');
  }

  /**
   * Preparar headers para la petición HTTP
   */
  prepareHeaders(apiKey) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
  }

  /**
   * Preparar body de la petición HTTP
   */
  prepareRequestBody(model, messages, options = {}, mcpContext = { tools: [], hasTools: false }) {
    const requestBody = {
      model: model.id,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream: options.stream || false,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000
    };

    // Agregar tools si están disponibles (esto se maneja externamente en AIService)
    // Por ahora, solo preparamos el body base
    if (mcpContext.hasTools && mcpContext.tools && mcpContext.tools.length > 0) {
      // Las tools se agregan externamente por AIService usando convertMCPToolsToProviderFormat
      // Este método solo prepara el body base
    }

    return requestBody;
  }

  /**
   * Obtener URL del endpoint
   */
  getEndpointUrl(model, apiKey) {
    return model.endpoint;
  }

  /**
   * Procesar respuesta del proveedor
   */
  async processResponse(response, model, safeReadJSONFn = null) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Error desconocido' } }));
      const errorMessage = error.error?.message || 'Error en la API de OpenAI';
      
      if (response.status === 503) {
        throw new Error('Modelo sobrecargado. Por favor, intenta más tarde.');
      }
      
      throw new Error(errorMessage);
    }

    // Usar función segura si está disponible, sino usar método estándar
    let data;
    if (safeReadJSONFn) {
      data = await safeReadJSONFn(response, model.id);
    } else {
      data = await response.json();
    }

    // Extraer contenido de la respuesta de OpenAI
    const content = data.choices?.[0]?.message?.content || '';
    
    if (!content) {
      debugLogger.warn('OpenAIProvider', 'Respuesta sin contenido', {
        modelId: model.id,
        dataKeys: Object.keys(data)
      });
      throw new Error('La respuesta de OpenAI no contiene contenido');
    }

    return content;
  }

  /**
   * Enviar mensaje al proveedor (método simple)
   */
  async sendMessage(model, messages, options = {}, apiKey, safeReadJSONFn = null, safeProcessResponseFn = null) {
    const headers = this.prepareHeaders(apiKey);
    const requestBody = this.prepareRequestBody(model, messages, options);
    const endpoint = this.getEndpointUrl(model, apiKey);

    // Intentar con reintentos para errores 503
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(requestBody),
          signal: options.signal
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: { message: 'Error desconocido' } }));
          const errorMessage = error.error?.message || 'Error en la API';
          
          // Si es error 503 (modelo sobrecargado) y no es el último intento, reintentar
          if (response.status === 503 && attempt < 3) {
            debugLogger.warn('OpenAIProvider', 'Modelo sobrecargado, reintentando', {
              modelId: model.id,
              intento: attempt,
              delayMs: attempt * 2000
            });
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          }
          
          throw new Error(errorMessage);
        }

        // Usar función segura si está disponible
        if (safeProcessResponseFn) {
          return await safeProcessResponseFn(response, 'openai', model.id);
        } else {
          return await this.processResponse(response, model, safeReadJSONFn);
        }
      } catch (error) {
        lastError = error;
        
        // Si es error de modelo sobrecargado y no es el último intento, reintentar
        if (error.message.includes('overloaded') && attempt < 3) {
          debugLogger.warn('OpenAIProvider', 'Modelo sobrecargado (mensaje), reintentando', {
            modelId: model.id,
            intento: attempt,
            delayMs: attempt * 2000
          });
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        
        // Si no es el último intento, continuar con el siguiente
        if (attempt < 3) {
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }

  /**
   * Manejar errores específicos de OpenAI
   */
  handleError(error, model) {
    if (error.message.includes('overloaded') || error.message.includes('503') || error.message.includes('The model is overloaded')) {
      return new Error(`El modelo ${model.name} está sobrecargado. Por favor, intenta más tarde o cambia a otro modelo.`);
    }
    
    return error;
  }

  /**
   * Extraer tool calls de la respuesta (para uso externo)
   */
  extractToolCalls(data) {
    const choice = data.choices?.[0]?.message || {};
    return choice.tool_calls || [];
  }

  /**
   * Extraer contenido de la respuesta
   */
  extractContent(data) {
    return data.choices?.[0]?.message?.content || '';
  }
}

// Exportar instancia singleton
export const openAIProvider = new OpenAIProvider();
export default openAIProvider;

