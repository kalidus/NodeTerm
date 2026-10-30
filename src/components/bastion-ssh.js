const { buildSshAlgorithms } = require('../utils/sshConnectOptions');
const { Client } = require('ssh2');

/**
 * Crea una conexión SSH a través de Wallix y abre un shell interactivo.
 * @param {Object} config - Configuración SSH (host, port, username, password)
 * @param {function} onData - Callback para datos recibidos del shell
 * @param {function} onClose - Callback cuando el shell se cierra
 * @param {function} onError - Callback para errores
 * @param {function} onShellReady - Callback cuando el shell (stream) está listo
 * @returns {Object} { conn } - Instancia de la conexión
 */
function createBastionShell(config, onData, onClose, onError, onShellReady) {
  const conn = new Client();
  let shellStream = null;

  // Método para ejecutar comandos usando conexión SSH separada (protocolo Wallix oficial)
  conn.execCommand = function (command, callback) {

    // Usar el protocolo oficial de Wallix para ejecutar comandos remotos
    // Crear una nueva conexión SSH específicamente para este comando
    const statsConn = new Client();

    statsConn.on('ready', () => {

      // Ejecutar el comando directamente sin interferir con la shell del usuario
      statsConn.exec(command, (err, stream) => {
        if (err) {
          if (callback) callback(err, null);
          statsConn.end();
          return;
        }

        let output = '';
        let errorOutput = '';

        stream.on('data', (data) => {
          output += data.toString('utf-8');
        });

        stream.stderr?.on('data', (data) => {
          errorOutput += data.toString('utf-8');
        });

        stream.on('close', (code) => {
          statsConn.end();

          if (callback) {
            if (code === 0) {
              callback(null, { stdout: output, stderr: errorOutput, code });
            } else {
              callback(new Error(`Command failed with code ${code}: ${errorOutput}`), null);
            }
          }
        });
      });
    });

    statsConn.on('error', (err) => {
      if (callback) callback(err, null);
    });

    // Conectar usando las mismas credenciales pero para ejecutar comandos específicos
    const statsConnectConfig = {
      host: config.bastionHost,
      port: config.port || 22,
      username: config.bastionUser,
      readyTimeout: 10000,
      algorithms: buildSshAlgorithms({ ...config, useBastionWallix: true }),
      hostVerifier: () => true, // Aceptar cualquier host key para Wallix
      compress: false // Sin compresión para mejor rendimiento
    };

    // Si hay password, usarlo. Si no, permitir autenticación interactiva
    if (config.password && config.password.trim()) {
      statsConnectConfig.password = config.password;
    } else {
      statsConnectConfig.tryKeyboard = true;
    }

    statsConn.connect(statsConnectConfig);
  };

  // ✅ COMPATIBILIDAD: Añadir método exec basado en promesas para que los handlers SSH funcionen
  conn.exec = function (command) {
    return new Promise((resolve, reject) => {
      this.execCommand(command, (err, result) => {
        if (err) return reject(err);
        resolve(result.stdout || '');
      });
    });
  };

  // Ya no necesitamos procesamiento especial, solo enviar todo al terminal
  // Los comandos de estadísticas van por conexión SSH separada

  conn.on('ready', () => {
    conn.shell({
      term: 'xterm-256color',
      // Optimizaciones para reducir latencia en Wallix
      allowHalfOpen: false
    }, (err, stream) => {
      if (err) {
        if (onError) onError(err);
        conn.end();
        return;
      }

      shellStream = stream;

      // Optimizar el stream para escritura más rápida
      if (stream.setEncoding) {
        stream.setEncoding('utf-8');
      }

      // Desactivar buffering en el stream (escritura inmediata)
      if (stream.setNoDelay) {
        stream.setNoDelay(true);
      }

      if (onShellReady) onShellReady(stream);

      stream.on('data', (data) => {
        // Enviar todo al terminal - los comandos de stats van por conexión separada
        if (onData) onData(data);
      });

      stream.on('close', () => {
        shellStream = null;
        if (onClose) onClose();
        conn.end();
      });

      stream.stderr?.on('data', (data) => {
        if (onError) onError(data);
      });
    });
  });

  // Manejar autenticación interactiva (keyboard-interactive)
  conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
    // Mostrar instrucciones y prompts en la terminal
    if (instructions) {
      if (onData) onData(Buffer.from(instructions + '\r\n', 'utf-8'));
    }

    // Mostrar cada prompt
    prompts.forEach((prompt) => {
      if (prompt.prompt) {
        if (onData) onData(Buffer.from(prompt.prompt, 'utf-8'));
      }
    });

    // Las respuestas se enviarán cuando el usuario escriba en la terminal
    // Por ahora, responder con array vacío para permitir que continúe
    // El usuario escribirá el password directamente en la terminal
    const responses = prompts.map(() => '');
    finish(responses);
  });

  conn.on('error', (err) => {
    if (onError) onError(err);
  });

  const connectConfig = {
    host: config.bastionHost,
    port: config.port || 22,
    username: config.bastionUser,
    readyTimeout: 30000,
    keepaliveInterval: 60000,
    keepaliveCountMax: 3,
    algorithms: buildSshAlgorithms({ ...config, useBastionWallix: true }),
    hostVerifier: () => true, // Aceptar cualquier host key para Wallix
    compress: false, // Sin compresión para reducir latencia
    debug: false
  };

  // Si hay password, usarlo. Si no, permitir autenticación interactiva
  if (config.password && config.password.trim()) {
    connectConfig.password = config.password;
  } else {
    connectConfig.tryKeyboard = true;
  }

  conn.connect(connectConfig);

  return { conn };
}

module.exports = { createBastionShell }; 