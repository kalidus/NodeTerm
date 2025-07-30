const BaseRdpClient = require('./BaseRdpClient');
const { spawn } = require('child_process');
const path = require('path');

/**
 * Cliente RDP usando FreeRDP Web
 */
class FreeRdpWebClient extends BaseRdpClient {
  constructor() {
    super();
    this.name = 'freerdpweb';
    this.displayName = 'FreeRDP Web';
    this.description = 'Cliente RDP basado en navegador web';
    this.website = 'https://github.com/FreeRDP/FreeRDP-WebConnect';
  }

  async checkAvailability() {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      
      // Verificar si hay algún servidor web RDP ejecutándose
      // o si hay instalación de FreeRDP Web
      const command = process.platform === 'win32' ? 'where node' : 'which node';
      
      exec(command, (error) => {
        // Por ahora, consideramos disponible si Node.js está disponible
        // En una implementación real, verificarías la instalación específica
        this.isAvailable = !error;
        resolve(this.isAvailable);
      });
    });
  }

  async connect(config, connectionId, tempFiles) {
    try {
      // Esta es una implementación de ejemplo
      // En la realidad, FreeRDP Web requiere un servidor web
      const args = this.buildArgs(config, connectionId);
      const process = this.launchProcess(args, connectionId);
      
      return {
        process,
        rdpFilePath: null,
        client: this.name
      };
      
    } catch (error) {
      throw new Error(`Error conectando con FreeRDP Web: ${error.message}`);
    }
  }

  buildArgs(config, connectionId) {
    // Construir URL de conexión para FreeRDP Web
    const url = new URL('http://localhost:8080/rdp'); // Puerto por defecto
    
    // Agregar parámetros de conexión
    url.searchParams.set('server', config.server);
    url.searchParams.set('port', config.port || 3389);
    url.searchParams.set('username', config.username || '');
    
    if (config.resolution) {
      const [width, height] = config.resolution.split('x');
      url.searchParams.set('width', width);
      url.searchParams.set('height', height);
    }
    
    return [url.toString()];
  }

  launchProcess(args, connectionId) {
    // Abrir en el navegador por defecto
    const command = process.platform === 'win32' ? 'start' : 
                   process.platform === 'darwin' ? 'open' : 'xdg-open';
    
    return spawn(command, args, {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }
}

module.exports = FreeRdpWebClient;
