const BaseRdpClient = require('./BaseRdpClient');
const { spawn } = require('child_process');
const path = require('path');

/**
 * Cliente RDP usando FreeRDP
 */
class FreeRdpClient extends BaseRdpClient {
  constructor() {
    super();
    this.name = 'freerdp';
    this.displayName = 'FreeRDP';
    this.description = 'Cliente RDP de código abierto multiplataforma';
    this.website = 'https://www.freerdp.com';
  }

  async checkAvailability() {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      
      // Verificar si wfreerdp.exe o xfreerdp está disponible
      const command = process.platform === 'win32' ? 'where wfreerdp.exe' : 'which xfreerdp';
      
      exec(command, (error) => {
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
        rdpFilePath: null, // FreeRDP no necesita archivo .rdp
        client: this.name
      };
      
    } catch (error) {
      throw new Error(`Error conectando con FreeRDP: ${error.message}`);
    }
  }

  buildArgs(config, connectionId) {
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
    
    // Pantalla completa
    if (config.fullscreen) {
      args.push('/f');
    }
    
    // Profundidad de color
    if (config.colorDepth) {
      args.push(`/bpp:${config.colorDepth}`);
    }
    
    // Redirecciones
    if (config.redirectClipboard) {
      args.push('+clipboard');
    }
    
    if (config.redirectAudio) {
      args.push('/audio-mode:0');
    }
    
    if (config.redirectFolders) {
      args.push('/drive:home,/');
    }
    
    // Sesión administrativa
    if (config.admin) {
      args.push('/admin');
    }
    
    // Configuraciones de seguridad
    args.push('/cert-ignore');
    args.push('/sec:tls');
    
    // Configuración de ventana
    args.push('/window-title:NodeTerm RDP');
    
    return args;
  }

  launchProcess(args, connectionId) {
    const executable = process.platform === 'win32' ? 'wfreerdp.exe' : 'xfreerdp';
    
    return spawn(executable, args, {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }
}

module.exports = FreeRdpClient;
