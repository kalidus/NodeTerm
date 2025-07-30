const BaseRdpClient = require('./BaseRdpClient');
const { spawn } = require('child_process');

/**
 * Cliente RDP usando Remmina (Linux)
 */
class RemminaClient extends BaseRdpClient {
  constructor() {
    super();
    this.name = 'remmina';
    this.displayName = 'Remmina';
    this.description = 'Cliente de escritorio remoto para Linux';
    this.website = 'https://remmina.org';
  }

  async checkAvailability() {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      
      if (process.platform !== 'linux') {
        this.isAvailable = false;
        resolve(false);
        return;
      }
      
      exec('which remmina', (error) => {
        this.isAvailable = !error;
        resolve(this.isAvailable);
      });
    });
  }

  async connect(config, connectionId, tempFiles) {
    try {
      const args = this.buildArgs(config, connectionId);
      const process = this.launchProcess(args, connectionId);
      
      return {
        process,
        rdpFilePath: null,
        client: this.name
      };
      
    } catch (error) {
      throw new Error(`Error conectando con Remmina: ${error.message}`);
    }
  }

  buildArgs(config, connectionId) {
    // Construir URI de conexión para Remmina
    let uri = 'rdp://';
    
    if (config.username) {
      uri += `${config.username}@`;
    }
    
    uri += config.server;
    
    if (config.port && config.port !== 3389) {
      uri += `:${config.port}`;
    }
    
    return ['-c', uri];
  }

  launchProcess(args, connectionId) {
    return spawn('remmina', args, {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }
}

module.exports = RemminaClient;
