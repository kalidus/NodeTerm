/**
 * Utilidad para contar tokens aproximadamente
 * Usa una estimación simple: ~1 token cada 4-5 caracteres
 */

class TokenCounter {
  /**
   * Contar tokens aproximados en un texto
   * @param {string} text - Texto a contar
   * @returns {number} Aproximación de tokens
   */
  static countTokens(text) {
    if (!text) return 0;
    // Promedio: 1 token ≈ 4 caracteres (puede variar entre 3-5)
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimar tokens en caracteres
   * @param {number} characters - Número de caracteres
   * @returns {number} Aproximación de tokens
   */
  static estimateTokensFromChars(characters) {
    return Math.ceil(characters / 4);
  }

  /**
   * Estimar caracteres necesarios para N tokens
   * @param {number} tokens - Número de tokens
   * @returns {number} Aproximación de caracteres
   */
  static estimateCharsFromTokens(tokens) {
    return Math.ceil(tokens * 4);
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
