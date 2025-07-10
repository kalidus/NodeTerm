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
  conn.on('ready', () => {
    conn.shell({ term: 'xterm-256color' }, (err, stream) => {
      if (err) {
        if (onError) onError(err);
        conn.end();
        return;
      }
      if (onShellReady) onShellReady(stream);
      stream.on('data', (data) => {
        if (onData) onData(data);
      });
      stream.on('close', () => {
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