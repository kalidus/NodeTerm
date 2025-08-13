const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class RdpManager {
  constructor() {
    this.activeConnections = new Map();
    this.tempFiles = new Set();
    this.connectionCounter = 0;
  }

  /**
   * Conectar a servidor RDP
   */
  async connect(config, onConnect, onDisconnect, onError) {
    const connectionId = `rdp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    try {
      // Validar configuración
      this.validateConfig(config);
      
      // Crear archivo .rdp temporal con configuración simple
      const rdpFilePath = await this.createRdpFile(config, connectionId);
      
      // Construir argumentos para mstsc.exe
      const args = this.buildMstscArgs(config, rdpFilePath);
      
      // Lanzar proceso
      const process = this.launchMstscProcess(args, connectionId);
      
      // Guardar conexión
      this.activeConnections.set(connectionId, {
        id: connectionId,
        config: config,
        process: process,
        rdpFilePath: rdpFilePath,
        status: 'connecting',
        startTime: Date.now()
      });
      
      // Configurar handlers
      this.setupProcessHandlers(process, connectionId, onConnect, onDisconnect, onError);
      
      return connectionId;
      
    } catch (error) {
      console.error(`Error starting RDP connection ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Desconectar conexión RDP
   */
  disconnect(connectionId) {
    const connection = this.activeConnections.get(connectionId);
    
    if (!connection) {
      return false;
    }
    
    try {
      // Terminar proceso si existe
      if (connection.process && !connection.process.killed) {
        connection.process.kill('SIGTERM');
      }
      
      // Limpiar archivo temporal si existe
      if (connection.rdpFilePath) {
        this.cleanupTempFile(connection.rdpFilePath);
      }
      
      // Remover de conexiones activas
      this.activeConnections.delete(connectionId);
      
      return true;
      
    } catch (error) {
      console.error(`Error disconnecting ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Obtener lista de conexiones activas
   */
  getActiveConnections() {
    const connections = [];
    
    for (const [id, conn] of this.activeConnections) {
      connections.push({
        id,
        server: conn.config.server,
        username: conn.config.username,
        startTime: conn.startTime,
        status: conn.status
      });
    }
    
    return connections;
  }

  /**
   * Desconectar todas las conexiones
   */
  disconnectAll() {
    const results = [];
    
    for (const connectionId of this.activeConnections.keys()) {
      const result = this.disconnect(connectionId);
      results.push({ connectionId, result });
    }
    
    return results;
  }

  /**
   * Generar ID único para conexión
   */
  generateConnectionId() {
    this.connectionCounter++;
    return `rdp_${Date.now()}_${this.connectionCounter}`;
  }

  /**
   * Validar configuración de conexión
   */
  validateConfig(config) {
    if (!config.server || typeof config.server !== 'string') {
      throw new Error('Servidor es requerido');
    }
    
    if (!config.username || typeof config.username !== 'string') {
      throw new Error('Usuario es requerido');
    }
    
    // Validaciones opcionales
    if (config.port && (isNaN(config.port) || config.port < 1 || config.port > 65535)) {
      throw new Error('Puerto debe estar entre 1 y 65535');
    }
  }

  /**
   * Crear archivo .rdp temporal
   */
  async createRdpFile(config, connectionId) {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = os.tmpdir();
    const fileName = `nodeterm_rdp_${connectionId}.rdp`;
    const filePath = path.join(tempDir, fileName);
    
    const content = this.generateRdpContent(config);
    
    fs.writeFileSync(filePath, content, 'utf8');
    
    // Guardar referencia para limpieza posterior
    this.tempFiles.add(filePath);
    
    return filePath;
  }

  /**
   * Generar contenido del archivo .rdp
   */
  generateRdpContent(config) {
    // Detectar si es un servidor que probablemente requiera certificados
    const isEnterpriseServer = config.server.includes('.sec.') || 
                              config.server.includes('bastion') || 
                              config.server.includes('corporate') ||
                              config.server.includes('enterprise');
    
    // Configuración base
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

    // Configuraciones adicionales según opciones
    let finalWidth = 1600;
    let finalHeight = 1000;

    // Parsear resolución si está disponible
    if (config.resolution) {
      const [width, height] = config.resolution.split('x');
      if (width && height) {
        finalWidth = parseInt(width);
        finalHeight = parseInt(height);
      }
    }

    // Configuración de pantalla
    if (config.fullscreen === true) {
      lines.push('screen mode id:i:2'); // Pantalla completa
    } else {
      lines.push('screen mode id:i:1'); // Ventana
      lines.push(`desktopwidth:i:${finalWidth}`);
      lines.push(`desktopheight:i:${finalHeight}`);
      lines.push(`winposstr:s:0,1,100,100,${100 + finalWidth + 16},${100 + finalHeight + 39}`);
    }

    // Smart sizing
    if (config.smartSizing) {
      lines.push('smart sizing:i:1');   // Activar smart sizing
    } else {
      lines.push('smart sizing:i:0');   // Desactivar smart sizing
    }

    // Configuración de autenticación según el tipo de servidor
    if (isEnterpriseServer) {
      // Para servidores empresariales que requieren certificados
      lines.push('authentication level:i:2');
      lines.push('prompt for credentials:i:1');
      lines.push('promptcredentialonce:i:0');
    } else {
      // Para servidores normales (Microsoft, etc.)
      lines.push('authentication level:i:0');
      lines.push('prompt for credentials:i:0');
      lines.push('promptcredentialonce:i:1');
    }

    return lines.join('\r\n') + '\r\n';
  }

  /**
   * Construir argumentos para mstsc.exe
   */
  buildMstscArgs(config, rdpFilePath) {
    // Solo pasar el archivo .rdp
    const args = [rdpFilePath];
    
    return args;
  }

  /**
   * Lanzar proceso mstsc.exe
   */
  launchMstscProcess(args, connectionId) {
    const { exec } = require('child_process');
    
    // Usar start para ejecutar mstsc.exe de forma independiente
    const command = `start "" mstsc.exe "${args[0]}"`;
    
    const childProcess = exec(command, {
      windowsHide: false,
      shell: true
    });
    
    return childProcess;
  }

  /**
   * Configurar event handlers para el proceso
   */
  setupProcessHandlers(process, connectionId, onConnect, onDisconnect, onError) {
    const connection = this.activeConnections.get(connectionId);
    
    if (!connection) return;

    // Con start, el proceso se ejecuta de forma independiente
    connection.status = 'launched';
    
    // Considerar conectado después de un delay para dar tiempo a certificados
    setTimeout(() => {
      if (connection.status === 'launched') {
        connection.status = 'connected';
        if (onConnect) {
          onConnect(connectionId);
        }
      }
    }, 35000); // 35 segundos de delay para dar tiempo a certificados

    // Con exec usamos 'close' en lugar de 'exit'
    process.on('close', (code, signal) => {
      // Con start, el proceso se cierra inmediatamente pero mstsc.exe sigue ejecutándose
      // Solo marcar como desconectado si hay un error real
      if (code !== 0 && code !== null) {
        connection.status = 'disconnected';
        
        if (onDisconnect) {
          onDisconnect(connectionId, { code, signal });
        }
        
        // Limpiar archivo temporal si existe
        if (connection.rdpFilePath) {
          this.cleanupTempFile(connection.rdpFilePath);
        }
        
        // Remover de conexiones activas
        this.activeConnections.delete(connectionId);
      }
    });

    // Error en el proceso
    process.on('error', (error) => {
      console.error(`RDP process error for connection ${connectionId}:`, error);
      
      // Solo marcar como error si realmente hay un problema
      if (connection.status !== 'connected') {
        connection.status = 'error';
        
        if (onError) {
          onError(connectionId, error);
        }
      }
    });
  }

  /**
   * Limpiar archivo temporal
   */
  cleanupTempFile(filePath) {
    if (!filePath) return;
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      this.tempFiles.delete(filePath);
    } catch (error) {
      console.warn('Error eliminando archivo temporal RDP:', error.message);
    }
  }

  /**
   * Limpiar todos los archivos temporales
   */
  cleanupAllTempFiles() {
    for (const filePath of this.tempFiles) {
      this.cleanupTempFile(filePath);
    }
  }

  /**
   * Obtener presets comunes de configuración
   */
  getPresets() {
    return {
      default: {
        resolution: '1600x1000',
        colorDepth: 32,
        redirectFolders: true,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: true,
        fullscreen: false,
        smartSizing: true,
        connectionTimeout: 60000
      },
      performance: {
        resolution: '1280x800',
        colorDepth: 16,
        redirectFolders: false,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: false,
        fullscreen: false,
        smartSizing: true,
        connectionTimeout: 90000
      },
      fullFeature: {
        resolution: '1920x1080',
        colorDepth: 32,
        redirectFolders: true,
        redirectClipboard: true,
        redirectPrinters: true,
        redirectAudio: true,
        fullscreen: true,
        span: true,
        smartSizing: false,
        connectionTimeout: 120000
      },
      qhd: {
        resolution: '2560x1440',
        colorDepth: 32,
        redirectFolders: true,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: true,
        fullscreen: false,
        smartSizing: true,
        connectionTimeout: 60000
      },
      ultrawide: {
        resolution: '3440x1440',
        colorDepth: 32,
        redirectFolders: true,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: true,
        fullscreen: false,
        smartSizing: true,
        connectionTimeout: 60000
      },
      uhd: {
        resolution: '3840x2160',
        colorDepth: 32,
        redirectFolders: true,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: true,
        fullscreen: false,
        smartSizing: true,
        connectionTimeout: 60000
      }
    };
  }
}

module.exports = RdpManager;
