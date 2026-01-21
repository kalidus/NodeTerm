/**
 * SSHAuthService - Servicio centralizado para autenticación SSH
 * 
 * Maneja:
 * - Autenticación manual con password
 * - Autenticación interactiva (keyboard-interactive)
 * - Reintentos de autenticación
 * - Acumulación de input del usuario
 * - Reconexión con nuevas credenciales
 */

const { sendToRenderer } = require('../utils');

class SSHAuthService {
  constructor() {
    // No necesitamos estado global, cada conexión maneja su propio estado
  }

  /**
   * Inicializa el estado de autenticación para una conexión
   */
  initializeAuthState(conn, hasPassword) {
    conn.manualPasswordMode = !hasPassword;
    conn.manualPasswordBuffer = '';
    conn.keyboardInteractiveFinish = null;
    conn.keyboardInteractivePrompts = null;
    conn.keyboardInteractiveResponses = [];
    conn._currentResponse = '';
  }

  /**
   * Activa el modo de password manual
   */
  enableManualPasswordMode(conn, sender, tabId, message = 'Por favor, introduce el password') {
    if (!conn) return;
    
    conn.manualPasswordMode = true;
    conn.manualPasswordBuffer = '';
    sendToRenderer(sender, `ssh:data:${tabId}`, `\r\n${message}:\r\nPassword: `);
  }

  /**
   * Desactiva el modo de password manual
   */
  disableManualPasswordMode(conn) {
    if (!conn) return;
    
    conn.manualPasswordMode = false;
    conn.manualPasswordBuffer = '';
  }

  /**
   * Verifica si un error es de autenticación
   */
  isAuthenticationError(error) {
    if (!error) return false;
    
    const errorMessage = typeof error === 'string' ? error : error.message || '';
    
    return errorMessage.includes('authentication') ||
           errorMessage.includes('Authentication failed') ||
           errorMessage.includes('All configured authentication methods failed');
  }

  /**
   * Maneja errores de autenticación
   */
  handleAuthError(conn, sender, tabId, error) {
    const isAuthError = this.isAuthenticationError(error);
    
    if (isAuthError && conn) {
      this.enableManualPasswordMode(conn, sender, tabId, 'Autenticación fallida. Por favor, introduce el password');
      return true;
    }
    
    // No es error de autenticación
    const errorMsg = error?.message || error || 'Error desconocido';
    sendToRenderer(sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${errorMsg}\r\n`);
    return false;
  }

  /**
   * Procesa input del usuario en modo manual de password
   */
  processManualPasswordInput(conn, data, sender, tabId) {
    if (!conn || !conn.manualPasswordMode) {
      return null;
    }

    // Inicializar buffer si no existe
    if (!conn.manualPasswordBuffer) {
      conn.manualPasswordBuffer = '';
    }

    // Detectar Enter (envío del password)
    if (data.includes('\r') || data.includes('\n')) {
      const password = (conn.manualPasswordBuffer + data.replace(/[\r\n]/g, '')).trim();
      
      if (password) {
        return password;
      } else {
        sendToRenderer(sender, `ssh:data:${tabId}`, `\r\nPassword vacío. Por favor, introduce el password:\r\nPassword: `);
        return null;
      }
    }

    // Detectar backspace
    if (data === '\b' || data === '\x7f' || data.charCodeAt(0) === 8 || data.charCodeAt(0) === 127) {
      if (conn.manualPasswordBuffer.length > 0) {
        conn.manualPasswordBuffer = conn.manualPasswordBuffer.slice(0, -1);
        // Enviar backspace + espacio + backspace para borrar visualmente el asterisco
        sendToRenderer(sender, `ssh:data:${tabId}`, '\b \b');
      }
      return null;
    }

    // Acumular caracteres normales
    conn.manualPasswordBuffer += data;
    // Mostrar asteriscos en lugar del password
    sendToRenderer(sender, `ssh:data:${tabId}`, '*');
    return null;
  }

  /**
   * Configura el manejador de keyboard-interactive para ssh2Client
   */
  setupKeyboardInteractive(ssh2Client, conn, sender, tabId) {
    ssh2Client.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
      if (!conn) return;

      // Mostrar instrucciones en la terminal
      if (instructions) {
        sendToRenderer(sender, `ssh:data:${tabId}`, instructions + '\r\n');
      }

      // Mostrar el primer prompt
      if (prompts.length > 0 && prompts[0].prompt) {
        sendToRenderer(sender, `ssh:data:${tabId}`, prompts[0].prompt);
      } else if (prompts.length > 0) {
        sendToRenderer(sender, `ssh:data:${tabId}`, 'Password: ');
      }

      // Guardar callback para cuando el usuario escriba
      conn.keyboardInteractiveFinish = finish;
      conn.keyboardInteractivePrompts = prompts;
      conn.keyboardInteractiveResponses = [];
      conn._currentResponse = '';
    });
  }

  /**
   * Procesa input del usuario en modo keyboard-interactive
   */
  processKeyboardInteractiveInput(conn, data, sender, tabId) {
    if (!conn || !conn.keyboardInteractiveFinish || !conn.keyboardInteractivePrompts) {
      return false; // No está en modo keyboard-interactive
    }

    // Inicializar respuesta actual si no existe
    if (!conn._currentResponse) {
      conn._currentResponse = '';
    }

    // Detectar Enter (envío de respuesta)
    if (data.includes('\r') || data.includes('\n')) {
      const response = (conn._currentResponse + data.replace(/[\r\n]/g, '')).trim();
      
      if (response) {
        conn.keyboardInteractiveResponses.push(response);
      } else if (conn.keyboardInteractiveResponses.length < conn.keyboardInteractivePrompts.length) {
        // Respuesta vacía también cuenta
        conn.keyboardInteractiveResponses.push('');
      }

      conn._currentResponse = '';

      // Si tenemos todas las respuestas, enviarlas
      if (conn.keyboardInteractiveResponses.length >= conn.keyboardInteractivePrompts.length) {
        const responses = conn.keyboardInteractiveResponses.slice(0, conn.keyboardInteractivePrompts.length);
        const finish = conn.keyboardInteractiveFinish;

        // Limpiar estado antes de llamar finish
        conn.keyboardInteractiveFinish = null;
        conn.keyboardInteractivePrompts = null;
        conn.keyboardInteractiveResponses = [];
        conn._currentResponse = '';

        // Enviar las respuestas
        finish(responses);
      } else {
        // Mostrar el siguiente prompt
        const nextIndex = conn.keyboardInteractiveResponses.length;
        if (nextIndex < conn.keyboardInteractivePrompts.length && 
            conn.keyboardInteractivePrompts[nextIndex].prompt) {
          sendToRenderer(sender, `ssh:data:${tabId}`, '\r\n' + conn.keyboardInteractivePrompts[nextIndex].prompt);
        }
      }

      return true; // Input procesado
    }

    // Acumular caracteres
    conn._currentResponse += data;
    return true; // Input procesado
  }

  /**
   * Crea una configuración SSH con autenticación interactiva
   */
  createInteractiveSSHConfig(config, includePassword = false) {
    const sshConfig = {
      host: config.host,
      username: config.username,
      port: config.port || 22,
      tryKeyboard: true, // Habilitar autenticación interactiva
      readyTimeout: 30000,
      keepaliveInterval: 60000
    };

    // Solo incluir password si está disponible y se solicita
    if (includePassword && config.password && config.password.trim()) {
      sshConfig.password = config.password;
    }

    return sshConfig;
  }

  /**
   * Crea un wrapper exec() compatible con statsLoop para ssh2Client
   */
  createExecWrapper(ssh2Client) {
    // Guardar el método original antes de reemplazarlo para evitar recursión
    const originalExec = ssh2Client.exec.bind(ssh2Client);

    return (command) => {
      return new Promise((resolve, reject) => {
        // Usar el método original, no el wrapper
        originalExec(command, (err, stream) => {
          if (err) {
            reject(err);
            return;
          }

          let output = '';
          
          stream.on('data', (data) => {
            output += data.toString('utf-8');
          });

          stream.on('close', (code) => {
            if (code === 0) {
              resolve(output);
            } else {
              reject(new Error(`Command failed with code ${code}`));
            }
          });

          stream.stderr.on('data', (data) => {
            output += data.toString('utf-8');
          });
        });
      });
    };
  }

  /**
   * Configura los listeners de eventos para una conexión SSH2 con autenticación interactiva
   */
  setupSSH2ClientListeners(ssh2Client, conn, tabId, config, sender, callbacks) {
    const {
      onReady,
      onError,
      getSessionRecorder
    } = callbacks;

    // Configurar keyboard-interactive
    this.setupKeyboardInteractive(ssh2Client, conn, sender, tabId);

    // Evento ready
    ssh2Client.on('ready', () => {
      ssh2Client.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, async (err, shellStream) => {
        if (err) {
          sendToRenderer(sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${err.message || err}\r\n`);
          ssh2Client.end();
          
          // Activar modo manual para reintentar
          this.enableManualPasswordMode(conn, sender, tabId, 'Password incorrecto. Intenta de nuevo');
          return;
        }

        // Crear wrapper exec para compatibilidad con statsLoop
        const execWrapper = this.createExecWrapper(ssh2Client);
        ssh2Client.exec = execWrapper;

        // Obtener información del servidor
        let realHostname = 'unknown';
        let osRelease = '';
        
        try {
          realHostname = (await execWrapper('hostname')).trim() || 'unknown';
        } catch (e) {
          console.warn('[SSH] Error obteniendo hostname:', e);
        }

        try {
          osRelease = await execWrapper('cat /etc/os-release');
        } catch (e) {
          osRelease = 'ID=linux';
        }

        const distroId = (osRelease.match(/^ID=(.*)$/m) || [])[1] || 'linux';
        const finalDistroId = distroId.replace(/"/g, '').toLowerCase();

        // Actualizar conexión
        conn.ssh = ssh2Client;
        conn.stream = shellStream;
        conn.realHostname = realHostname;
        conn.finalDistroId = finalDistroId;
        this.disableManualPasswordMode(conn); // Desactivar modo manual

        // Configurar listeners del stream
        shellStream.on('data', (data) => {
          const dataStr = data.toString('utf-8');
          
          if (getSessionRecorder && getSessionRecorder().isRecording(tabId)) {
            getSessionRecorder().recordOutput(tabId, dataStr);
          }
          
          sendToRenderer(sender, `ssh:data:${tabId}`, dataStr);
        });

        shellStream.on('close', () => {
          sendToRenderer(sender, `ssh:data:${tabId}`, '\r\nConnection closed.\r\n');
          
          if (conn && conn.statsTimeout) {
            clearTimeout(conn.statsTimeout);
          }
          
          sendToRenderer(sender, 'ssh-connection-disconnected', {
            originalKey: conn.originalKey || tabId,
            tabId: tabId
          });
          
          ssh2Client.end();
        });

        shellStream.stderr?.on('data', (data) => {
          sendToRenderer(sender, `ssh:data:${tabId}`, data.toString('utf-8'));
        });

        sendToRenderer(sender, `ssh:data:${tabId}`, '\r\n✅ Conectado exitosamente.\r\n');
        sendToRenderer(sender, `ssh:ready:${tabId}`);
        sendToRenderer(sender, 'ssh-connection-ready', {
          originalKey: conn.originalKey || tabId,
          tabId: tabId
        });

        // Callback de éxito
        if (onReady) {
          onReady(realHostname, finalDistroId);
        }
      });
    });

    // Evento error
    ssh2Client.on('error', (err) => {
      const isAuthError = this.isAuthenticationError(err);
      
      if (isAuthError) {
        this.enableManualPasswordMode(conn, sender, tabId, 'Password incorrecto. Intenta de nuevo');
        return;
      }

      sendToRenderer(sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${err.message || err}\r\n`);
      
      if (onError) {
        onError(err);
      }
    });
  }

  /**
   * Limpia el estado de autenticación de una conexión
   */
  cleanupAuthState(conn) {
    if (!conn) return;

    conn.manualPasswordMode = false;
    conn.manualPasswordBuffer = '';
    conn.keyboardInteractiveFinish = null;
    conn.keyboardInteractivePrompts = null;
    conn.keyboardInteractiveResponses = [];
    conn._currentResponse = '';
  }
}

// Exportar instancia única (singleton)
module.exports = new SSHAuthService();
