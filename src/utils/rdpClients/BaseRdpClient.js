/**
 * Clase base abstracta para clientes RDP
 */
class BaseRdpClient {
  constructor() {
    this.name = 'Base';
    this.displayName = 'Cliente Base';
    this.isAvailable = false;
  }

  /**
   * Verificar si el cliente está disponible en el sistema
   */
  async checkAvailability() {
    throw new Error('checkAvailability debe ser implementado por la clase hija');
  }

  /**
   * Conectar usando este cliente
   */
  async connect(config, connectionId) {
    throw new Error('connect debe ser implementado por la clase hija');
  }

  /**
   * Construir argumentos específicos del cliente
   */
  buildArgs(config, rdpFilePath) {
    throw new Error('buildArgs debe ser implementado por la clase hija');
  }

  /**
   * Lanzar proceso específico del cliente
   */
  launchProcess(args, connectionId) {
    throw new Error('launchProcess debe ser implementado por la clase hija');
  }

  /**
   * Obtener configuraciones específicas del cliente
   */
  getClientSpecificConfig(config) {
    return config;
  }

  /**
   * Obtener información del cliente
   */
  getInfo() {
    return {
      name: this.name,
      displayName: this.displayName,
      isAvailable: this.isAvailable,
      description: this.description || '',
      website: this.website || ''
    };
  }
}

module.exports = BaseRdpClient;
