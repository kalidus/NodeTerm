const BaseRdpClient = require('./BaseRdpClient');
const { spawn } = require('child_process');

/**
 * Cliente RDP usando xRDP (Linux)
 */
class XrdpClient extends BaseRdpClient {
  constructor() {
    super();
    this.name = 'xrdp';
    this.displayName = 'xRDP';
    this.description = 'Servidor/Cliente RDP de código abierto para Linux';
    this.website = 'https://www.xrdp.org';
  }

  async checkAvailability() {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      
      if (process.platform !== 'linux') {
        this.isAvailable = false;
        resolve(false);
        return;
      }
      
      // Verificar si xrdp está instalado
      exec('which xrdp-chansrv', (error) => {
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
      throw new Error(`Error conectando con xRDP: ${error.message}`);
    }
  }

  buildArgs(config, connectionId) {
    // xRDP typically uses FreeRDP as client, so build FreeRDP args
    const args = [];
    
    // Servidor y puerto
    args.push(`/v:${config.server}${config.port ? ':' + config.port : ''}`);
    
    // Usuario
    if (config.username) {
      args.push(`/u:${config.username}`);
    }
    
    // Contraseña (si está disponible)
    if (config.password) {
      args.push(`/p:${config.password}`);
    }
    
    // Resolución
    if (config.resolution) {
      args.push(`/size:${config.resolution}`);
    }
    
    // Configuraciones adicionales
    args.push('/cert-ignore');
    args.push(`/window-title:NodeTerm xRDP - ${config.server}`);
    
    return args;
  }

  launchProcess(args, connectionId) {
    return spawn('xfreerdp', args, {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }
}

module.exports = XrdpClient;
