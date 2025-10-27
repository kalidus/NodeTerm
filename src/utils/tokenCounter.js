/**
 * Utilidad para contar tokens con mayor precisión
 * Optimizado para texto en español e inglés
 */

class TokenCounter {
  /**
   * Contar tokens aproximados en un texto
   * @param {string} text - Texto a contar
   * @returns {number} Aproximación de tokens
   */
  static countTokens(text) {
    if (!text) return 0;
    
    const isSpanish = this.isSpanishText(text);
    const ratio = isSpanish ? 3.5 : 4;
    return Math.ceil(text.length / ratio);
  }

  /**
   * Estimar tokens en caracteres (asume español por defecto)
   * @param {number} characters - Número de caracteres
   * @param {boolean} isSpanish - Si es texto en español
   * @returns {number} Aproximación de tokens
   */
  static estimateTokensFromChars(characters, isSpanish = true) {
    const ratio = isSpanish ? 3.5 : 4;
    return Math.ceil(characters / ratio);
  }

  /**
   * Estimar caracteres necesarios para N tokens
   * @param {number} tokens - Número de tokens
   * @param {boolean} isSpanish - Si es texto en español
   * @returns {number} Aproximación de caracteres
   */
  static estimateCharsFromTokens(tokens, isSpanish = true) {
    const ratio = isSpanish ? 3.5 : 4;
    return Math.ceil(tokens * ratio);
  }

  /**
   * Obtener estadísticas de uso de tokens
   * @param {string} userMessage - Mensaje del usuario
   * @param {number} maxTokens - Máximo de tokens permitidos
   * @param {number} currentHistory - Tokens usados en historial
   * @returns {object} Estadísticas
   */
  static getTokenStats(userMessage = '', maxTokens = 7000, currentHistory = 0) {
    const messageTokens = this.countTokens(userMessage);
    const usedTokens = currentHistory + messageTokens;
    const availableTokens = Math.max(0, maxTokens - usedTokens);
    const percentUsed = Math.round((usedTokens / maxTokens) * 100);

    return {
      messageTokens,
      usedTokens,
      availableTokens,
      maxTokens,
      percentUsed,
      percentRemaining: 100 - percentUsed,
      status: percentUsed > 80 ? 'warning' : percentUsed > 95 ? 'danger' : 'ok'
    };
  }

  /**
   * Formatear número de tokens para mostrar
   * @param {number} tokens - Número de tokens
   * @returns {string} Texto formateado
   */
  static formatTokens(tokens) {
    if (tokens < 1000) return `${tokens} tokens`;
    return `${(tokens / 1000).toFixed(1)}K tokens`;
  }

  /**
   * Detectar si un texto es principalmente en español
   * @param {string} text - Texto a analizar
   * @returns {boolean} True si es español
   */
  static isSpanishText(text) {
    if (!text) return true; // Por defecto asumimos español
    
    const hasAccents = /[áéíóúñüÁÉÍÓÚÑÜ]/.test(text);
    const hasSpecialChars = /[¿¡]/.test(text);
    const spanishWords = text.match(/\b(el|la|de|que|y|a|en|un|es|se|no|te|lo|le|da|su|por|son|con|para|al|del|los|las|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b/gi) || [];
    const englishWords = text.match(/\b(the|and|or|but|in|on|at|to|for|of|with|by|from|up|about|into|through|during|before|after|above|below|between|among|under|over|around|near|far|here|there|where|when|why|how|what|who|which|that|this|these|those|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|shall)\b/gi) || [];
    
    return hasAccents || hasSpecialChars || spanishWords.length > englishWords.length;
  }

  /**
   * Obtener color según uso
   * @param {number} percentUsed - Porcentaje usado
   * @returns {string} Color en formato hex o RGB
   */
  static getColorByUsage(percentUsed) {
    if (percentUsed < 50) return '#4CAF50'; // Verde
    if (percentUsed < 75) return '#FFC107'; // Amarillo
    if (percentUsed < 90) return '#FF9800'; // Naranja
    return '#F44336'; // Rojo
  }
}

export default TokenCounter;
