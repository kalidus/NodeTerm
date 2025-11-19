/**
 * GoogleProvider - Proveedor para modelos de Google (Gemini Pro, Gemini Ultra, etc.)
 */

import { BaseProvider } from './BaseProvider';
import debugLogger from '../../../utils/debugLogger';

export class GoogleProvider extends BaseProvider {
  constructor() {
    super('google');
  }

  /**
   * Preparar headers para la petición HTTP
   */
  prepareHeaders(apiKey) {
    return {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Preparar body de la petición HTTP
   * Gemini usa un formato diferente: contents en lugar de messages
   */
  prepareRequestBody(model, messages, options = {}, mcpContext = { tools: [], hasTools: false }) {
    // Convertir mensajes al formato de Gemini
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const requestBody = {
      contents: contents,
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 2000
      }
    };

    // Gemini soporta tools pero se agregan externamente por AIService
    if (mcpContext.hasTools && mcpContext.tools && mcpContext.tools.length > 0) {
      // Las tools se agregan externamente por AIService usando convertMCPToolsToProviderFormat
      // Este método solo prepara el body base
    }

    return requestBody;
  }

  /**
   * Obtener URL del endpoint
   * Gemini necesita el API key como parámetro de query
   */
  getEndpointUrl(model, apiKey) {
    return `${model.endpoint}?key=${apiKey}`;
  }

  /**
   * Procesar respuesta del proveedor
   */
  async processResponse(response, model, safeReadJSONFn = null) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Error desconocido' } }));
      const errorMessage = error.error?.message || 'Error en la API de Google';
      
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

    // Extraer contenido de la respuesta de Google Gemini
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!content) {
      debugLogger.warn('GoogleProvider', 'Respuesta sin contenido', {
        modelId: model.id,
        dataKeys: Object.keys(data),
        candidates: data.candidates?.length || 0
      });
      throw new Error('La respuesta de Google Gemini no contiene contenido');
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
            debugLogger.warn('GoogleProvider', 'Modelo sobrecargado, reintentando', {
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
          return await safeProcessResponseFn(response, 'google', model.id);
        } else {
          return await this.processResponse(response, model, safeReadJSONFn);
        }
      } catch (error) {
        lastError = error;
        
        // Si es error de modelo sobrecargado y no es el último intento, reintentar
        if (error.message.includes('overloaded') && attempt < 3) {
          debugLogger.warn('GoogleProvider', 'Modelo sobrecargado (mensaje), reintentando', {
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
   * Manejar errores específicos de Google
   */
  handleError(error, model) {
    if (error.message.includes('overloaded') || error.message.includes('503') || error.message.includes('The model is overloaded')) {
      return new Error(`El modelo ${model.name} está sobrecargado. Por favor, intenta más tarde o cambia a otro modelo.`);
    }
    
    return error;
  }

  /**
   * Extraer function calls de la respuesta (para uso externo)
   * Gemini usa un formato diferente: candidates[0].content.parts con functionCall
   */
  extractFunctionCalls(data) {
    const candidate = (data.candidates && data.candidates[0]) || {};
    const parts = candidate.content?.parts || candidate.content || [];
    return Array.isArray(parts) ? parts.filter(p => p.functionCall) : [];
  }

  /**
   * Extraer contenido de la respuesta
   */
  extractContent(data) {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Convertir schema de parámetros al formato de Gemini
   * Gemini espera un formato específico para los parámetros de funciones
   */
  toGeminiSchema(parameters) {
    if (!parameters || typeof parameters !== 'object') {
      return { type: 'object', properties: {} };
    }

    // Gemini usa un formato similar a JSON Schema pero con algunas diferencias
    // Por ahora, devolvemos el schema tal cual ya que es compatible
    return parameters;
  }
}

// Exportar instancia singleton
export const googleProvider = new GoogleProvider();
export default googleProvider;

