/**
 * BaseProvider - Clase base para todos los proveedores de IA
 * 
 * Esta clase define la interfaz común que todos los proveedores deben implementar
 */

import debugLogger from '../../../utils/debugLogger';

export class BaseProvider {
  constructor(providerName) {
    this.providerName = providerName;
  }

  /**
   * Enviar mensaje al proveedor
   * @param {Object} model - Modelo a usar
   * @param {Array} messages - Mensajes de conversación
   * @param {Object} options - Opciones (temperature, maxTokens, etc.)
   * @param {string} apiKey - API Key del proveedor
   * @returns {Promise<string>} Respuesta del modelo
   */
  async sendMessage(model, messages, options = {}, apiKey) {
    throw new Error('sendMessage debe ser implementado por la clase hija');
  }

  /**
   * Enviar mensaje con callbacks y soporte para tools
   * @param {Object} model - Modelo a usar
   * @param {Array} messages - Mensajes de conversación
   * @param {Object} options - Opciones
   * @param {string} apiKey - API Key del proveedor
   * @param {Object} callbacks - Callbacks (onStatus, onProgress, etc.)
   * @param {Object} mcpContext - Contexto MCP con tools
   * @param {Function} convertToolsFn - Función para convertir tools al formato del proveedor
   * @param {Function} normalizeFunctionCallFn - Función para normalizar function calls
   * @param {Function} safeReadJSONFn - Función para leer JSON de forma segura
   * @returns {Promise<string>} Respuesta del modelo
   */
  async sendMessageWithCallbacks(
    model, 
    messages, 
    options = {}, 
    apiKey, 
    callbacks = {},
    mcpContext = { tools: [], hasTools: false },
    convertToolsFn = null,
    normalizeFunctionCallFn = null,
    safeReadJSONFn = null
  ) {
    throw new Error('sendMessageWithCallbacks debe ser implementado por la clase hija');
  }

  /**
   * Preparar headers para la petición HTTP
   * @param {string} apiKey - API Key
   * @returns {Object} Headers
   */
  prepareHeaders(apiKey) {
    throw new Error('prepareHeaders debe ser implementado por la clase hija');
  }

  /**
   * Preparar body de la petición HTTP
   * @param {Object} model - Modelo a usar
   * @param {Array} messages - Mensajes de conversación
   * @param {Object} options - Opciones
   * @param {Object} mcpContext - Contexto MCP (opcional)
   * @returns {Object} Body de la petición
   */
  prepareRequestBody(model, messages, options = {}, mcpContext = { tools: [], hasTools: false }) {
    throw new Error('prepareRequestBody debe ser implementado por la clase hija');
  }

  /**
   * Procesar respuesta del proveedor
   * @param {Response} response - Respuesta HTTP
   * @param {Object} model - Modelo usado
   * @returns {Promise<string>} Contenido de la respuesta
   */
  async processResponse(response, model) {
    throw new Error('processResponse debe ser implementado por la clase hija');
  }

  /**
   * Obtener URL del endpoint (puede incluir API key como query param)
   * @param {Object} model - Modelo a usar
   * @param {string} apiKey - API Key
   * @returns {string} URL completa
   */
  getEndpointUrl(model, apiKey) {
    return model.endpoint;
  }

  /**
   * Manejar errores específicos del proveedor
   * @param {Error} error - Error original
   * @param {Object} model - Modelo usado
   * @returns {Error} Error procesado
   */
  handleError(error, model) {
    return error;
  }
}

