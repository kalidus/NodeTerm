/**
 * Handlers IPC para funcionalidades de Guacamole
 * - Configuración de timeout de guacd
 * - Estado de Guacamole
 * - Creación de tokens
 * - Gestión de conexiones
 */

const { ipcMain } = require('electron');

/**
 * Registra todos los handlers IPC de Guacamole
 * @param {Object} dependencies - Dependencias necesarias
 * @param {Object} dependencies.guacdService - Servicio de guacd
 * @param {Object} dependencies.guacamoleServer - Servidor Guacamole
 * @param {Number} dependencies.guacamoleServerReadyAt - Timestamp de inicialización del servidor
 * @param {Function} dependencies.sendToRenderer - Función para enviar datos al renderer
 * @param {Function} dependencies.disconnectAllGuacamoleConnections - Función para desconectar conexiones
 * @param {Object} dependencies.guacdInactivityTimeoutMs - Variable de timeout
 * @param {Function} dependencies.getGuacamoleServer - Función getter para obtener el servidor actual
 * @param {Function} dependencies.getGuacamoleServerReadyAt - Función getter para obtener el timestamp actual
 */
function registerGuacamoleHandlers({
  guacdService,
  guacamoleServer,
  guacamoleServerReadyAt,
  sendToRenderer,
  disconnectAllGuacamoleConnections,
  guacdInactivityTimeoutMs,
  getGuacamoleServer,
  getGuacamoleServerReadyAt,
  getOrCreateGuacamoleSecretKey
}) {
  // IPC para configurar el watchdog de guacd desde la UI
  ipcMain.handle('guacamole:set-guacd-timeout-ms', async (event, timeoutMs) => {
    try {
      const parsed = parseInt(timeoutMs, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        return { success: false, error: 'Invalid timeout value' };
      }
      
      // Actualizar la variable global
      guacdInactivityTimeoutMs = parsed;
      
      // Si el servicio guacd está activo, actualizar su configuración
      if (guacdService && typeof guacdService.setInactivityTimeout === 'function') {
        guacdService.setInactivityTimeout(parsed);
      }
      
      return { success: true, value: parsed };
    } catch (error) {
      console.error('Error setting guacd timeout:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('guacamole:get-guacd-timeout-ms', async () => {
    return { success: true, value: guacdInactivityTimeoutMs };
  });

  // Handler para crear pestañas de Guacamole
  ipcMain.on('guacamole:create-tab', (event, data) => {
    // Reenviar el evento al renderer para crear la pestaña
    sendToRenderer(event.sender, 'guacamole:create-tab', data);
  });

  // IPC handlers for Guacamole RDP connections
  // Cache para evitar logs repetidos
  let guacamoleStatusWarningLogged = false;
  
  ipcMain.handle('guacamole:get-status', async (event) => {
    try {
      const guacdStatus = guacdService ? guacdService.getStatus() : { isRunning: false, method: 'unknown' };
      
      // Obtener el estado actual del servidor usando las funciones getter
      const currentServer = getGuacamoleServer ? getGuacamoleServer() : guacamoleServer;
      const currentReadyAt = getGuacamoleServerReadyAt ? getGuacamoleServerReadyAt() : guacamoleServerReadyAt;
      
      // Logging solo cuando hay un problema real y no se ha logueado antes
      if (!currentServer && !guacamoleStatusWarningLogged) {
        console.warn('⚠️ [guacamole:get-status] guacamoleServer es null. guacdStatus:', guacdStatus);
        guacamoleStatusWarningLogged = true;
      } else if (currentServer) {
        // Resetear el flag si el servidor está disponible
        guacamoleStatusWarningLogged = false;
      }
      
      const result = {
        guacd: guacdStatus,
        server: currentServer ? {
          isRunning: true,
          running: true,
          port: currentServer.port || 'unknown',
          readyAt: currentReadyAt || Date.now()
        } : { 
          isRunning: false,
          running: false,
          readyAt: 0
        }
      };
      
      return result;
    } catch (error) {
      console.error('Error getting Guacamole status:', error);
      const errorResult = {
        guacd: { isRunning: false, method: 'error' },
        server: { 
          isRunning: false,
          running: false,
          readyAt: 0
        }
      };
      return errorResult;
    }
  });

  // Permitir establecer el método preferido desde la UI (docker|wsl|mock)
  ipcMain.handle('guacamole:set-preferred-method', async (event, method) => {
    try {
      if (guacdService && typeof guacdService.setPreferredMethod === 'function') {
        // Establecer la nueva preferencia
        guacdService.setPreferredMethod(method);
        
        // Guardar la preferencia de forma persistente
        try {
          const { savePreferredGuacdMethod } = require('../../main/utils/file-utils');
          await savePreferredGuacdMethod(method);
          console.log(`💾 Preferencia de método Guacd guardada: ${method}`);
        } catch (saveError) {
          console.warn('⚠️ No se pudo guardar la preferencia de método Guacd:', saveError.message);
        }
        
        // Reiniciar el servicio para aplicar la nueva preferencia
        console.log(`🔄 Aplicando nueva preferencia de método Guacd: ${method}`);
        const restartSuccess = await guacdService.restart();
        
        if (restartSuccess) {
          console.log(`✅ GuacdService reiniciado exitosamente con método: ${method}`);
          return { success: true, method, restarted: true };
        } else {
          console.warn(`⚠️ GuacdService no se pudo reiniciar con método: ${method}`);
          return { success: false, error: 'Failed to restart GuacdService with new method' };
        }
      } else {
        return { success: false, error: 'GuacdService not available' };
      }
    } catch (error) {
      console.error('Error setting preferred method:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('guacamole:disconnect-all', async () => {
    await disconnectAllGuacamoleConnections();
    return { success: true };
  });

  ipcMain.handle('guacamole:create-token', async (event, config) => {
    try {
      
      // Si guacd está en modo mock, informar al usuario y rechazar
      try {
        if (guacdService && guacdService.getStatus && guacdService.getStatus().method === 'mock') {
          const connectionType = config.connectionType || 'RDP';
          const message = `${connectionType} requiere Docker Desktop o WSL. Activa Docker Desktop o instala/activa WSL para utilizar ${connectionType} con Guacamole.`;
          console.warn(`⚠️  [MAIN] Intento de crear token con guacd en modo mock. ${message}`);
          return { success: false, error: message };
        }
      } catch {}
      
      // Detectar tipo de conexión: RDP o VNC
      const connectionType = config.connectionType || (config.type === 'vnc' || config.type === 'vnc-guacamole' ? 'vnc' : 'rdp');
      const isVNC = connectionType === 'vnc';
      
      // Calcular resolución final: priorizar width/height, luego parsear resolution
      let finalWidth = config.width || 1024;
      let finalHeight = config.height || 768;
      
      // Si no hay width/height específicos pero sí resolution, parsearla
      if (!config.width && !config.height && config.resolution) {
        const [width, height] = config.resolution.split('x');
        if (width && height) {
          finalWidth = parseInt(width);
          finalHeight = parseInt(height);
          console.log(`🔄 [MAIN] Parseando resolution "${config.resolution}" → ${finalWidth}x${finalHeight}`);
        }
      }

      // Normalizar profundidad de color
      let normalizedColorDepth = 32;
      try {
        const candidateDepth = parseInt(config.colorDepth, 10);
        const allowedDepths = [8, 16, 24, 32];
        if (allowedDepths.includes(candidateDepth)) {
          normalizedColorDepth = candidateDepth;
        }
      } catch {}

      console.log(`🔐 [MAIN] Creando token para configuración ${connectionType.toUpperCase()}:`, {
        hostname: config.hostname,
        username: config.username,
        password: config.password ? '***OCULTA***' : 'NO DEFINIDA',
        port: config.port,
        width: finalWidth,
        height: finalHeight,
        dpi: config.dpi,
        colorDepth: normalizedColorDepth,
        enableDrive: config.enableDrive,
        driveHostDir: config.driveHostDir,
        enableWallpaper: config.enableWallpaper,
        redirectClipboard: config.redirectClipboard,
        security: config.security,
        resolution: config.resolution,
        autoResize: config.autoResize,
        readOnly: config.readOnly
      });
      
      // Obtener el estado actual del servidor usando las funciones getter
      const currentServer = getGuacamoleServer ? getGuacamoleServer() : guacamoleServer;
      
      if (!currentServer) {
        throw new Error('Servidor Guacamole no está inicializado');
      }

      const crypto = require('crypto');
      const CIPHER = 'AES-256-CBC';
      // ✅ CRÍTICO: Usar la misma clave que el servidor Guacamole
      // Si no se proporciona la función, usar fallback (solo para compatibilidad)
      let SECRET_KEY;
      if (getOrCreateGuacamoleSecretKey && typeof getOrCreateGuacamoleSecretKey === 'function') {
        SECRET_KEY = await getOrCreateGuacamoleSecretKey(); // 32 bytes exactos para AES-256-CBC
      } else {
        // Fallback: usar clave hardcodeada (solo para compatibilidad con versiones antiguas)
        console.warn('⚠️ [MAIN] Usando clave hardcodeada como fallback. Esto puede causar errores de validación.');
        const SECRET_KEY_RAW = 'NodeTermGuacamoleSecretKey2024!';
        SECRET_KEY = crypto.createHash('sha256').update(SECRET_KEY_RAW).digest(); // 32 bytes exactos
      }

      // Preparar campos de drive si el usuario lo activó (solo para RDP)
      let driveSettings = {};
      if (!isVNC) {
        try {
          if (config.enableDrive) {
            console.log('🔍 [DEBUG] Drive config:', {
              enableDrive: config.enableDrive,
              driveHostDir: config.driveHostDir,
              hasDriveHostDir: !!config.driveHostDir,
              driveHostDirLength: config.driveHostDir?.length || 0
            });
            
            // Si llega una carpeta de host desde UI, resolverla según método actual
            let resolvedDrivePath = null;
            if (config.driveHostDir && typeof config.driveHostDir === 'string' && config.driveHostDir.trim().length > 0 && typeof guacdService.resolveDrivePath === 'function') {
              resolvedDrivePath = guacdService.resolveDrivePath(config.driveHostDir);
            } else if (typeof guacdService.getDrivePathForCurrentMethod === 'function') {
              resolvedDrivePath = guacdService.getDrivePathForCurrentMethod();
            }
            const drivePath = resolvedDrivePath;
            const driveName = guacdService.getDriveName ? guacdService.getDriveName() : 'NodeTerm Drive';
            if (typeof drivePath === 'string' && drivePath.trim().length > 0) {
              driveSettings = {
                'enable-drive': true,
                'drive-path': drivePath,
                'drive-name': driveName,
                'create-drive-path': true
              };
              console.log('🔍 [DEBUG] Final drive settings:', driveSettings);
            } else {
              // fallback: solo activar drive sin ruta explícita
              driveSettings = {
                'enable-drive': true,
                'create-drive-path': true
              };
              console.log('🔍 [DEBUG] Fallback drive settings:', driveSettings);
            }
          }
        } catch (e) {
          // Si algo falla, no bloquear la conexión, sólo loguear
          console.warn('⚠️  [MAIN] No se pudo calcular drive-path para Guacamole:', e?.message || e);
        }
      }

      // Construir objeto de configuración según el tipo
      let connectionSettings = {};
      
      if (isVNC) {
        // Configuración VNC
        connectionSettings = {
          hostname: config.hostname,
          port: config.port || 5900,
          password: config.password || '',
          "read-only": config.readOnly === true ? true : false,
          "color-depth": normalizedColorDepth,
          width: finalWidth,
          height: finalHeight,
          dpi: config.dpi || 96,
          // Portapapeles: desactivar solo si el usuario lo deshabilitó
          "disable-clipboard": (config.redirectClipboard === false) ? true : undefined,
          // Compresión VNC
          "enable-compression": config.enableCompression !== false, // Por defecto true
          // Calidad de imagen
          "image-quality": config.imageQuality || 'lossless', // lossless, lossy-low, lossy-medium, lossy-high
          // Actualización automática
          "auto-reconnect": config.autoReconnect !== false, // Por defecto true
        };
      } else {
        // Configuración RDP (existente)
        connectionSettings = {
          hostname: config.hostname,
          username: config.username,
          password: config.password,
          port: config.port || 3389,
          security: config.security || "any",
          "ignore-cert": true,
          // Drive redirection
          ...driveSettings,
          "enable-wallpaper": config.enableWallpaper === true ? true : false,
          width: finalWidth,
          height: finalHeight,
          dpi: config.dpi || 96,
          "color-depth": normalizedColorDepth,
          // Características visuales optimizadas: desactivadas por defecto para conexión más rápida
          // Solo se activan si el usuario las habilita explícitamente o si autoResize está activo
          "enable-desktop-composition": (config.enableDesktopComposition === true || config.autoResize === true) ? true : false,
          "enable-font-smoothing": config.enableFontSmoothing === true ? true : false,
          "enable-theming": config.enableTheming === true ? true : false,
          "enable-full-window-drag": (config.enableFullWindowDrag === true || config.autoResize === true) ? true : false,
          "enable-menu-animations": config.enableMenuAnimations === true ? true : false,
          // Configuración específica para resize dinámico
          // Usar display-update siempre para evitar reconexiones, incluso con resolución fija
          "resize-method": "display-update",
          // Portapapeles: desactivar solo si el usuario lo deshabilitó
          "disable-clipboard": (config.redirectClipboard === false) ? true : undefined,
          // Compatibilidad Windows 11: desactivar GFX cuando se active la casilla
          "enable-gfx": (config.enableGfx === true) ? true : undefined,
          // Flags de prueba (enviar solo el activo si es true). Guacamole ignora claves con undefined.
          "disable-glyph-caching": config.disableGlyphCaching === true ? true : undefined,
          "disable-offscreen-caching": config.disableOffscreenCaching === true ? true : undefined,
          "disable-bitmap-caching": config.disableBitmapCaching === true ? true : undefined,
          "disable-copy-rect": config.disableCopyRect === true ? true : undefined,
          // Configuración de mouse para mejorar sincronización de cursor en macOS
          "mouse-mode": "absolute", // Usar modo absoluto para mejor sincronización
          "enable-mouse": true, // Asegurar que el mouse esté habilitado
          "mouse-autoselect": true // Auto-selección de mouse para mejor experiencia
        };
      }

      const tokenObject = {
        connection: {
          type: isVNC ? "vnc" : "rdp",
          settings: connectionSettings
        }
      };
      
      console.log('📄 [MAIN] Token objeto final:', {
        type: tokenObject.connection.type,
        settings: {
          ...tokenObject.connection.settings,
          password: tokenObject.connection.settings.password ? '***OCULTA***' : 'NO DEFINIDA'
        }
      });

      // Encriptar token usando Crypt de guacamole-lite para asegurar compatibilidad de formato
      const Crypt = require('guacamole-lite/lib/Crypt.js');
      const crypt = new Crypt(CIPHER, SECRET_KEY);
      const token = crypt.encrypt(tokenObject);
      
      // Añadir '&' al final para asegurar separación si el cliente añade más parámetros
      const websocketUrl = `ws://localhost:8081/?token=${encodeURIComponent(token)}&`;
      
      return {
        success: true,
        token: token,
        websocketUrl: websocketUrl
      };
    } catch (error) {
      console.error('Error creating Guacamole token:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido al crear token'
      };
    }
  });
}

module.exports = {
  registerGuacamoleHandlers
};
