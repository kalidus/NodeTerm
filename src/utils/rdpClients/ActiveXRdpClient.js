const BaseRdpClient = require('./BaseRdpClient');

/**
 * Cliente RDP usando ActiveX Control embebido
 */
class ActiveXRdpClient extends BaseRdpClient {
  constructor() {
    super();
    this.name = 'activex';
    this.displayName = 'ActiveX RDP Control';
    this.description = 'Control RDP embebido usando ActiveX nativo';
    this.website = 'https://microsoft.com';
  }

  async checkAvailability() {
    try {
      // Verificar si estamos en Windows
      if (process.platform !== 'win32') {
        this.isAvailable = false;
        return false;
      }

      // Verificar si el módulo nativo está disponible
      try {
        const RdpActiveXManager = require('../../../native/rdp-activex');
        const manager = new RdpActiveXManager();
        this.isAvailable = true;
        return true;
      } catch (error) {
        console.log('ActiveX RDP module not available:', error.message);
        this.isAvailable = false;
        return false;
      }
    } catch (error) {
      console.error('Error checking ActiveX RDP availability:', error);
      this.isAvailable = false;
      return false;
    }
  }

  async connect(config, connectionId) {
    try {
      // Para ActiveX, no necesitamos crear archivos temporales
      // La conexión se maneja directamente a través del módulo nativo
      
      return {
        client: this.name,
        connectionId: connectionId,
        config: config,
        type: 'activex' // Indicar que es una conexión ActiveX
      };
      
    } catch (error) {
      throw new Error(`Error conectando con ActiveX RDP: ${error.message}`);
    }
  }

  buildArgs(config, rdpFilePath) {
    // ActiveX no usa argumentos de línea de comandos
    return [];
  }

  launchProcess(args, connectionId) {
    // ActiveX no lanza procesos externos
    return null;
  }

  /**
   * Obtener configuraciones específicas del cliente ActiveX
   */
  getClientSpecificConfig(config) {
    return {
      ...config,
      useActiveX: true, // Marcar para usar ActiveX
      embedded: true    // Indicar que es embebido
    };
  }
}

module.exports = ActiveXRdpClient; 