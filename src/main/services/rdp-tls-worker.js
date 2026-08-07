/**
 * rdp-tls-worker.js
 * Proceso secundario en Node.js puro (OpenSSL 3.x) para gestionar el canal TCP + TLS 1.3 RDP.
 * 
 * 🚀 Resuelve de forma definitiva el error ERR_SSL_KEY_USAGE_BIT_INCORRECT provocado por
 * el motor BoringSSL empaquetado dentro de Electron al conectar con servidores RDP de Windows.
 */

const net = require('net');
const tls = require('tls');

let targetSocket = null;
let tlsSocket = null;

process.on('message', (msg) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'CONNECT') {
    const { host, port, x224Cr } = msg;

    targetSocket = net.connect({ host, port }, () => {
      targetSocket.setNoDelay(true);
      targetSocket.write(Buffer.from(x224Cr, 'hex'));
    });

    targetSocket.once('data', (x224CcChunk) => {
      // Notificar X.224 CC al proceso principal
      process.send({
        type: 'X224_CC',
        x224Cc: x224CcChunk.toString('hex')
      });

      // Actualizar a TLS usando el motor OpenSSL nativo de Node.js
      tlsSocket = tls.connect({
        socket: targetSocket,
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        minVersion: 'TLSv1',
        ciphers: 'ALL:DEFAULT'
      }, () => {
        let certRawHex = null;
        try {
          const cert = tlsSocket.getPeerCertificate(true);
          if (cert && cert.raw) {
            certRawHex = cert.raw.toString('hex');
          }
        } catch (e) {
          console.warn('[RDP TLS Worker] Error leyendo certificado peer:', e);
        }

        process.send({
          type: 'TLS_CONNECTED',
          certRawHex
        });

        // Escuchar datos TLS desencriptados del servidor RDP
        tlsSocket.on('data', (tlsChunk) => {
          process.send({
            type: 'DATA_FROM_RDP',
            dataHex: tlsChunk.toString('hex')
          });
        });

        tlsSocket.on('close', () => process.send({ type: 'CLOSED', reason: 'TLS socket closed' }));
        tlsSocket.on('error', (e) => process.send({ type: 'ERROR', error: e.message }));
      });

      tlsSocket.on('error', (err) => {
        process.send({ type: 'ERROR', error: err.message });
      });
    });

    targetSocket.on('error', (err) => {
      process.send({ type: 'ERROR', error: err.message });
    });
  } else if (msg.type === 'DATA_TO_RDP') {
    if (tlsSocket && tlsSocket.writable) {
      tlsSocket.write(Buffer.from(msg.dataHex, 'hex'));
    } else if (targetSocket && targetSocket.writable) {
      targetSocket.write(Buffer.from(msg.dataHex, 'hex'));
    }
  } else if (msg.type === 'DISCONNECT') {
    try { tlsSocket.destroy(); } catch (e) {}
    try { targetSocket.destroy(); } catch (e) {}
    process.exit(0);
  }
});
