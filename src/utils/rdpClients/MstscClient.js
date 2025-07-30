const BaseRdpClient = require('./BaseRdpClient');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Cliente RDP usando Microsoft Terminal Services Client (mstsc.exe)
 */
class MstscClient extends BaseRdpClient {
  constructor() {
    super();
    this.name = 'mstsc';
    this.displayName = 'Microsoft MSTSC';
    this.description = 'Cliente RDP nativo de Windows';
    this.website = 'https://microsoft.com';
  }

  async checkAvailability() {
    return new Promise((resolve) => {
      // mstsc.exe está disponible por defecto en Windows
      if (process.platform === 'win32') {
        exec('where mstsc.exe', (error) => {
          this.isAvailable = !error;
          resolve(this.isAvailable);
        });
      } else {
        this.isAvailable = false;
        resolve(false);
      }
    });
  }

  async connect(config, connectionId, tempFiles) {
    try {
      // Crear archivo .rdp
      const rdpFilePath = await this.createRdpFile(config, connectionId, tempFiles);
      
      // Construir argumentos
      const args = this.buildArgs(config, rdpFilePath);
      
      // Lanzar proceso
      const process = this.launchProcess(args, connectionId);
      
      return {
        process,
        rdpFilePath,
        client: this.name
      };
      
    } catch (error) {
      throw new Error(`Error conectando con MSTSC: ${error.message}`);
    }
  }

  buildArgs(config, rdpFilePath) {
    return [rdpFilePath];
  }

  launchProcess(args, connectionId) {
    const command = `start "" mstsc.exe "${args[0]}"`;
    
    return exec(command, {
      windowsHide: false,
      shell: true
    });
  }

  async createRdpFile(config, connectionId, tempFiles) {
    const tempDir = os.tmpdir();
    const fileName = `nodeterm_rdp_${connectionId}.rdp`;
    const filePath = path.join(tempDir, fileName);
    
    const content = this.generateRdpContent(config);
    
    fs.writeFileSync(filePath, content, 'utf8');
    tempFiles.add(filePath);
    
    return filePath;
  }

  generateRdpContent(config) {
    const isEnterpriseServer = config.server.includes('.sec.') || 
                              config.server.includes('bastion') || 
                              config.server.includes('corporate') ||
                              config.server.includes('enterprise');
    
    const lines = [
      `full address:s:${config.server}${config.port ? ':' + config.port : ''}`,
      `username:s:${config.username}`,
      'enablecredsspsupport:i:1',
      'authentication level:i:2',
      `administrative session:i:${config.admin === true ? 1 : 0}`,
      'negotiate security layer:i:1',
      'connect to console:i:0',
      'disable wallpaper:i:0',
      'disable full window drag:i:0',
      'disable menu anims:i:0',
      'disable themes:i:0',
      'disable cursor setting:i:0',
      'bitmapcachepersistenable:i:1',
      'compression:i:1',
      'keyboardhook:i:2',
      'audiocapturemode:i:0',
      'videoplaybackmode:i:1',
      'connection type:i:7',
      'redirectsmartcards:i:1',
      'redirectcomports:i:0',
      'redirectposdevices:i:0',
      'redirectdirectx:i:1',
      'session bpp:i:32',
      'allow font smoothing:i:1',
      'promptcredentialonce:i:1'
    ];

    let finalWidth = 1600;
    let finalHeight = 1000;

    if (config.resolution) {
      const [width, height] = config.resolution.split('x');
      if (width && height) {
        finalWidth = parseInt(width);
        finalHeight = parseInt(height);
      }
    }

    if (config.fullscreen) {
      lines.push('screen mode id:i:2');
    } else {
      lines.push('screen mode id:i:1');
      lines.push(`desktopwidth:i:${finalWidth}`);
      lines.push(`desktopheight:i:${finalHeight}`);
      lines.push(`winposstr:s:0,1,100,100,${100 + finalWidth + 16},${100 + finalHeight + 39}`);
    }

    if (config.smartSizing) {
      lines.push('smart sizing:i:1');
    } else {
      lines.push('smart sizing:i:0');
    }

    if (isEnterpriseServer) {
      lines.push('authentication level:i:2');
      lines.push('prompt for credentials:i:1');
      lines.push('promptcredentialonce:i:0');
    } else {
      lines.push('authentication level:i:0');
      lines.push('prompt for credentials:i:0');
      lines.push('promptcredentialonce:i:1');
    }

    return lines.join('\r\n') + '\r\n';
  }
}

module.exports = MstscClient;
