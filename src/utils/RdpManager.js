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
    
    console.log(`Starting RDP connection ${connectionId} to ${config.server}`);
    
    try {
      // Validar configuración
      this.validateConfig(config);
      console.log(`Configuration validated for connection ${connectionId}`);
      
      // Crear archivo .rdp temporal con configuración simple
      const rdpFilePath = await this.createRdpFile(config, connectionId);
      console.log(`RDP file created: ${rdpFilePath} for connection ${connectionId}`);
      
      // Construir argumentos para mstsc.exe
      const args = this.buildMstscArgs(config, rdpFilePath);
      console.log(`Arguments built for connection ${connectionId}:`, args);
      
      // Lanzar proceso
      const process = this.launchMstscProcess(args, connectionId);
      console.log(`Process launched for connection ${connectionId}, PID: ${process.pid}`);
      
      // Guardar conexión
      this.activeConnections.set(connectionId, {
        id: connectionId,
        config: config,
        process: process,
        rdpFilePath: rdpFilePath,
        status: 'connecting',
        startTime: Date.now()
      });
      
      console.log(`Connection ${connectionId} saved to active connections`);
      
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
      console.log(`Connection ${connectionId} not found`);
      return false;
    }
    
    console.log(`Disconnecting RDP connection ${connectionId}`);
    
    try {
      // Terminar proceso si existe
      if (connection.process && !connection.process.killed) {
        connection.process.kill('SIGTERM');
        console.log(`Process killed for connection ${connectionId}`);
      }
      
      // Limpiar archivo temporal si existe
      if (connection.rdpFilePath) {
        this.cleanupTempFile(connection.rdpFilePath);
      }
      
      // Remover de conexiones activas
      this.activeConnections.delete(connectionId);
      
      console.log(`Connection ${connectionId} disconnected successfully`);
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
    
    console.log(`RDP file content for ${connectionId}:`);
    console.log(content);
    
    fs.writeFileSync(filePath, content, 'utf8');
    
    // Guardar referencia para limpieza posterior
    this.tempFiles.add(filePath);
    
    return filePath;
  }

  /**
   * Generar contenido del archivo .rdp
   */
  generateRdpContent(config) {
    // Configuración mínima absoluta - solo lo esencial
    const lines = [
      `full address:s:${config.server}${config.port ? ':' + config.port : ''}`,
      `username:s:${config.username}`,
      'screen mode id:i:1',
      'desktopwidth:i:1600',
      'desktopheight:i:1000',
      'session bpp:i:32',
      'compression:i:1',
      'keyboardhook:i:2',
      'audiocapturemode:i:0',
      'videoplaybackmode:i:1',
      'connection type:i:7',
      'networkautodetect:i:1',
      'bandwidthautodetect:i:1',
      'displayconnectionbar:i:1',
      'enableworkspacereconnect:i:0',
      'disable wallpaper:i:0',
      'allow font smoothing:i:1',
      'allow desktop composition:i:0',
      'disable full window drag:i:0',
      'disable menu anims:i:0',
      'disable themes:i:0',
      'disable cursor setting:i:0',
      'bitmapcachepersistenable:i:1',
      'audiomode:i:0',
      'redirectprinters:i:0',
      'redirectcomports:i:0',
      'redirectsmartcards:i:1',
      'redirectclipboard:i:1',
      'redirectposdevices:i:0',
      'autoreconnection enabled:i:1',
      'authentication level:i:2', // Cambiar a 2 para permitir certificados
      'prompt for credentials:i:1', // Cambiar a 1 para permitir prompt
      'negotiate security layer:i:1',
      'remoteapplicationmode:i:0',
      'alternate shell:s:',
      'shell working directory:s:',
      'gatewayhostname:s:',
      'gatewayusagemethod:i:4',
      'gatewaycredentialssource:i:4',
      'gatewayprofileusagemethod:i:0',
      'promptcredentialonce:i:0', // Cambiar a 0 para permitir múltiples prompts
      'use redirection server name:i:0',
      'rdgiskdcproxy:i:0',
      'kdcproxyname:s:',
      'drivestoredirect:s:*'
    ];

    return lines.join('\r\n') + '\r\n';
  }

  /**
   * Construir argumentos para mstsc.exe
   */
  buildMstscArgs(config, rdpFilePath) {
    console.log(`Building arguments for connection ${config.server}`);
    
    // Solo pasar el archivo .rdp
    const args = [rdpFilePath];
    
    console.log(`Arguments built for connection ${config.server}:`, args);
    return args;
  }

  /**
   * Lanzar proceso mstsc.exe
   */
  launchMstscProcess(args, connectionId) {
    console.log(`Launching RDP process for connection ${connectionId} with args:`, args);
    
    const { exec } = require('child_process');
    
    // Usar start para ejecutar mstsc.exe de forma independiente
    const command = `start "" mstsc.exe "${args[0]}"`;
    console.log(`Executing command: ${command}`);
    
    const childProcess = exec(command, {
      windowsHide: false,
      shell: true
    });
    
    console.log(`RDP process ${connectionId} launched with PID: ${childProcess.pid}`);
    
    return childProcess;
  }

  /**
   * Configurar event handlers para el proceso
   */
  setupProcessHandlers(process, connectionId, onConnect, onDisconnect, onError) {
    const connection = this.activeConnections.get(connectionId);
    
    if (!connection) return;

    console.log(`Setting up RDP handlers for connection ${connectionId}`);

    // Con start, el proceso se ejecuta de forma independiente
    connection.status = 'launched';
    console.log(`RDP process launched for connection ${connectionId}, PID: ${process.pid}`);
    
    // Considerar conectado después de un delay para dar tiempo a certificados
    setTimeout(() => {
      if (connection.status === 'launched') {
        connection.status = 'connected';
        if (onConnect) {
          onConnect(connectionId);
        }
        console.log(`RDP connection ${connectionId} considered established`);
      }
    }, 35000); // 35 segundos de delay para dar tiempo a certificados

    // Con exec usamos 'close' en lugar de 'exit'
    process.on('close', (code, signal) => {
      console.log(`RDP process closed for connection ${connectionId}, code: ${code}, signal: ${signal}`);
      
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
      } else {
        console.log(`RDP process ${connectionId} closed normally (code ${code}), mstsc.exe should be running independently`);
      }
    });

    // Error en el proceso
    process.on('error', (error) => {
      console.error(`RDP process error for connection ${connectionId}:`, error);
      connection.status = 'error';
      
      if (onError) {
        onError(connectionId, error);
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
