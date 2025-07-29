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
   * Crear una nueva conexión RDP
   */
  async connect(config) {
    const connectionId = this.generateConnectionId();
    
    try {
      // Validar configuración
      this.validateConfig(config);
      
      // Crear archivo .rdp temporal
      const rdpFilePath = await this.createRdpFile(config, connectionId);
      
      // Construir argumentos para mstsc.exe
      const args = this.buildMstscArgs(config, rdpFilePath);
      
      // Lanzar proceso mstsc.exe
      const process = this.launchMstscProcess(args, connectionId);
      
      // Guardar conexión activa
      this.activeConnections.set(connectionId, {
        process,
        config,
        rdpFilePath,
        startTime: new Date(),
        status: 'connecting'
      });
      
      return {
        success: true,
        connectionId,
        message: 'Conexión RDP iniciada'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Desconectar conexión RDP específica
   */
  disconnect(connectionId) {
    const connection = this.activeConnections.get(connectionId);
    
    if (!connection) {
      return { success: false, error: 'Conexión no encontrada' };
    }

    try {
      // Terminar proceso
      if (connection.process && !connection.process.killed) {
        connection.process.kill('SIGTERM');
      }
      
      // Limpiar archivo temporal
      this.cleanupTempFile(connection.rdpFilePath);
      
      // Remover de conexiones activas
      this.activeConnections.delete(connectionId);
      
      return { success: true, message: 'Conexión terminada' };
      
    } catch (error) {
      return { success: false, error: error.message };
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
    const tempDir = os.tmpdir();
    const fileName = `nodeterm_${connectionId}.rdp`;
    const filePath = path.join(tempDir, fileName);
    
    // Configuración base .rdp
    const rdpContent = this.generateRdpContent(config);
    
    // Escribir archivo
    await fs.promises.writeFile(filePath, rdpContent, 'utf8');
    
    // Guardar para limpieza posterior
    this.tempFiles.add(filePath);
    
    return filePath;
  }

  /**
   * Generar contenido del archivo .rdp
   */
  generateRdpContent(config) {
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
      'promptcredentialonce:i:1',
      'authentication level:i:0'
    ];

    // Configuraciones adicionales según opciones
    let finalWidth = 1600;
    let finalHeight = 1000;
    
    if (config.resolution) {
      const [width, height] = config.resolution.split('x');
      finalWidth = parseInt(width);
      finalHeight = parseInt(height);
      lines.push(`desktopwidth:i:${width}`);
      lines.push(`desktopheight:i:${height}`);
    } else {
      // Usar resolución por defecto apropiada
      lines.push('desktopwidth:i:1600');
      lines.push('desktopheight:i:1000');
    }

    // Configurar posición de ventana
    lines.push(`winposstr:s:0,1,100,100,${100 + finalWidth + 16},${100 + finalHeight + 39}`);
    lines.push('use multimon:i:0');

    // Configurar smart sizing según el setting del usuario
    const useSmartSizing = config.smartSizing !== false; // Por defecto habilitado
    
    if (config.fullscreen === true) {
      lines.push('screen mode id:i:2'); // Pantalla completa
      lines.push('smart sizing:i:0');   // En pantalla completa, desactivar smart sizing
      lines.push('enablesuperpan:i:0');
    } else {
      lines.push('screen mode id:i:1'); // Ventana
      lines.push(`smart sizing:i:${useSmartSizing ? 1 : 0}`);
      
      if (useSmartSizing) {
        // Smart sizing habilitado - no forzar tamaño fijo
        lines.push('enablesuperpan:i:0');
        lines.push('dynamic resolution:i:1');
        lines.push('desktop size id:i:0');
      } else {
        // Smart sizing deshabilitado - usar tamaño fijo
        lines.push('enablesuperpan:i:0');
        lines.push('dynamic resolution:i:0');
      }
      
      lines.push('pinconnectionbar:i:1'); // Mantener barra de conexión visible
      lines.push('displayconnectionbar:i:1'); // Mostrar barra de conexión
    }

    if (config.colorDepth) {
      lines.push(`session bpp:i:${config.colorDepth}`);
    }

    if (config.redirectFolders === true) {
      lines.push('drivestoredirect:s:*');
    }

    if (config.redirectPrinters === true) {
      lines.push('redirectprinters:i:1');
    }

    if (config.redirectClipboard === true) {
      lines.push('redirectclipboard:i:1');
    }

    if (config.redirectAudio === true) {
      lines.push('audiomode:i:0'); // Reproducir en equipo remoto
    } else {
      lines.push('audiomode:i:2'); // No reproducir
    }

    return lines.join('\r\n') + '\r\n';
  }

  /**
   * Construir argumentos para mstsc.exe
   */
  buildMstscArgs(config, rdpFilePath) {
    const args = [];

    if (rdpFilePath) {
      args.push(rdpFilePath);
      
      // Solo añadir argumentos de tamaño si smart sizing está deshabilitado
      const useSmartSizing = config.smartSizing !== false;
      
      if (!useSmartSizing && config.resolution && !config.fullscreen) {
        const [width, height] = config.resolution.split('x');
        args.push(`/w:${width}`);
        args.push(`/h:${height}`);
      } else if (!useSmartSizing && !config.fullscreen) {
        // Forzar tamaño por defecto solo si smart sizing está deshabilitado
        args.push('/w:1600');
        args.push('/h:1000');
      }
    } else {
      // Conexión directa sin archivo .rdp
      args.push('/v:' + config.server + (config.port ? ':' + config.port : ''));
      
      // Para conexiones directas, siempre añadir tamaño
      if (config.resolution) {
        const [width, height] = config.resolution.split('x');
        args.push(`/w:${width}`);
        args.push(`/h:${height}`);
      } else {
        args.push('/w:1600');
        args.push('/h:1000');
      }
    }

    // Solo añadir argumentos que no conflicten con el archivo .rdp
    if (config.public) {
      args.push('/public'); // Conexión pública (no guardar credenciales)
    }

    if (config.admin) {
      args.push('/admin'); // Conectar a sesión administrativa
    }

    if (config.span) {
      args.push('/span'); // Usar múltiples monitores
    }

    return args;
  }

  /**
   * Lanzar proceso mstsc.exe
   */
  launchMstscProcess(args, connectionId) {
    return spawn('mstsc.exe', args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
  }

  /**
   * Configurar event handlers para el proceso
   */
  setupProcessHandlers(process, connectionId, onConnect, onDisconnect, onError) {
    const connection = this.activeConnections.get(connectionId);
    
    if (!connection) return;

    // Proceso iniciado (no significa conexión exitosa)
    process.on('spawn', () => {
      connection.status = 'launched';
      if (onConnect) onConnect(connectionId);
    });

    // Proceso terminado
    process.on('exit', (code, signal) => {
      connection.status = 'disconnected';
      
      // Limpiar archivo temporal
      this.cleanupTempFile(connection.rdpFilePath);
      
      // Remover de conexiones activas
      this.activeConnections.delete(connectionId);
      
      if (onDisconnect) {
        onDisconnect(connectionId, { code, signal });
      }
    });

    // Error en el proceso
    process.on('error', (error) => {
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
        smartSizing: true
      },
      performance: {
        resolution: '1280x800',
        colorDepth: 16,
        redirectFolders: false,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: false,
        fullscreen: false,
        smartSizing: true
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
        smartSizing: false
      },
      qhd: {
        resolution: '2560x1440',
        colorDepth: 32,
        redirectFolders: true,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: true,
        fullscreen: false,
        smartSizing: true
      },
      ultrawide: {
        resolution: '3440x1440',
        colorDepth: 32,
        redirectFolders: true,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: true,
        fullscreen: false,
        smartSizing: true
      },
      uhd: {
        resolution: '3840x2160',
        colorDepth: 32,
        redirectFolders: true,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: true,
        fullscreen: false,
        smartSizing: true
      }
    };
  }
}

module.exports = RdpManager;
