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
  conn.execCommand = function(command, callback) {
    console.log('[BastionExec] Ejecutando comando via SSH separado (protocolo Wallix):', command);
    
    // Usar el protocolo oficial de Wallix para ejecutar comandos remotos
    // Crear una nueva conexión SSH específicamente para este comando
    const statsConn = new Client();
    
    statsConn.on('ready', () => {
      console.log('[BastionExec] Conexión SSH para stats establecida');
      
      // Ejecutar el comando directamente sin interferir con la shell del usuario
      statsConn.exec(command, (err, stream) => {
        if (err) {
          console.warn('[BastionExec] Error ejecutando comando:', err);
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
          console.log('[BastionExec] Comando completado, código:', code, 'output length:', output.length);
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
      console.warn('[BastionExec] Error en conexión SSH para stats:', err);
      if (callback) callback(err, null);
    });
    
    // Conectar usando las mismas credenciales pero para ejecutar comandos específicos
    statsConn.connect({
      host: config.bastionHost,
      port: config.port || 22,
      username: config.bastionUser,
      password: config.password,
      readyTimeout: 10000,
      algorithms: {
        kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm'],
        serverHostKey: ['ssh-rsa', 'ssh-dss'],
        hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
      }
    });
  };
  
    // Ya no necesitamos procesamiento especial, solo enviar todo al terminal
  // Los comandos de estadísticas van por conexión SSH separada
  
  conn.on('ready', () => {
    conn.shell({ term: 'xterm-256color' }, (err, stream) => {
      if (err) {
        if (onError) onError(err);
        conn.end();
        return;
      }
      
      shellStream = stream;
      console.log('[BastionExec] Shell interactiva creada exitosamente');
      
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
  
  conn.on('error', (err) => {
    if (onError) onError(err);
  });
  
  conn.connect({
    host: config.bastionHost,
    port: config.port || 22,
    username: config.bastionUser,
    password: config.password,
    readyTimeout: 30000,
    keepaliveInterval: 60000,
    keepaliveCountMax: 3,
    algorithms: {
      kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
      cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm'],
      serverHostKey: ['ssh-rsa', 'ssh-dss'],
      hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
    },
    compress: false,
    debug: false
  });
  
  return { conn };
}

module.exports = { createBastionShell }; 