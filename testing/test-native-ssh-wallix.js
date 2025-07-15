const { Client } = require('ssh2');

const wallixConfig = {
  host: 'bastion-dsn.sec.dsn.inet',
  port: 22,
  username: 'rt01119@default@ESJC-SGCT-NX02P:SSH:rt01119',
  password: 'Sola4win$100k' // <--- PON AQUÍ TU CONTRASEÑA
};

function openShell(label) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log(`[${label}] Conexión SSH lista.`);
      conn.shell((err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        stream.on('close', () => {
          console.log(`[${label}] Shell cerrado.`);
          conn.end();
        }).on('data', (data) => {
          process.stdout.write(`[${label}] ${data.toString()}`);
        });
        stream.write(`echo "${label} activa"\n`);
        resolve({ conn, stream });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect(wallixConfig);
  });
}

(async () => {
  try {
    const shell1 = await openShell('Shell1');
    setTimeout(async () => {
      try {
        const shell2 = await openShell('Shell2');
        setTimeout(() => {
          shell1.stream.end();
          shell2.stream.end();
        }, 10000);
      } catch (err) {
        console.error('[Shell2] Error:', err.message || err);
        shell1.stream.end();
      }
    }, 2000);
  } catch (err) {
    console.error('[Shell1] Error:', err.message || err);
  }
})(); 