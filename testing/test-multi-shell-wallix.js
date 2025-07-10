const SSH2Promise = require('ssh2-promise');

const wallixConfig = {
  host: 'bastion-dsn.sec.dsn.inet',
  username: 'rt01119@default@ESJC-SGCT-NX02P:SSH:rt01119',
  password: 'Sola4win$100k', // <--- PON AQUÍ TU CONTRASEÑA
  port: 22,
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
};

async function main() {
  const ssh = new SSH2Promise(wallixConfig);
  await ssh.connect();
  console.log('Conexión SSH establecida.');

  // Abrir primer shell
  const shell1 = await ssh.shell({ term: 'xterm-256color' });
  shell1.write('echo "Shell 1 activa"\n');
  shell1.on('data', data => process.stdout.write('[Shell1] ' + data.toString()));

  // Abrir segundo shell
  const shell2 = await ssh.shell({ term: 'xterm-256color' });
  shell2.write('echo "Shell 2 activa"\n');
  shell2.on('data', data => process.stdout.write('[Shell2] ' + data.toString()));

  // Mantener ambos shells abiertos por 10 segundos
  setTimeout(() => {
    shell1.end();
    shell2.end();
    ssh.close();
    console.log('Cerrando shells y conexión.');
  }, 10000);
}

main().catch(err => {
  console.error('Error:', err);
}); 