/**
 * MITM RDP local para capturar mstsc/mRemoteNG hacia Wallix (mismo esquema JSONL que el bridge).
 *
 * Uso:
 *   node testing/rdp/mitm-capture.js
 *   node testing/rdp/mitm-capture.js --host bastion-dsn.sec.dsn.inet --port 3389 --listen 3390
 *   node testing/rdp/mitm-capture.js --out testing/rdp/traces/mstsc-selector-frio.jsonl
 *
 * Luego abre testing/rdp/wallix-selector-mitm.rdp (o mstsc a 127.0.0.1:3390) con CredSSP off.
 * Acepta el aviso del certificado autofirmado.
 */

'use strict';

const net = require('net');
const tls = require('tls');
const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

const {
  PROTOCOL_SSL,
  parseX224ConnectionConfirm,
  protocolName,
  RdpStreamDeframer
} = require('../../src/main/services/rdp-protocol-helpers');
const { createPduTraceWriter, defaultTracePath } = require('../../src/main/services/rdp-pdu-trace');
const {
  isMcsConnectInitial,
  isMcsConnectResponse,
  findClientNetworkChannels,
  patchScCoreClientRequestedProtocols
} = require('../../src/main/services/rdp-mcs-helpers');
const { parseMcsSendData } = require('../../src/main/services/rdp-autodetect');
const { describeCliprdrPdu } = require('../../src/main/services/rdp-channel-filter');

/** Canal cliprdr tipico tras CS_NET=[rdpdr,rdpsnd,cliprdr,drdynvc] + I/O 1003. */
const CLIPRDR_CHANNEL_HINT = 1006;

function parseArgs(argv) {
  const out = {
    host: 'bastion-dsn.sec.dsn.inet',
    port: 3389,
    listen: 3390,
    out: null,
    user: 'rt01119'
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--host') out.host = argv[++i];
    else if (a === '--port') out.port = parseInt(argv[++i], 10) || 3389;
    else if (a === '--listen') out.listen = parseInt(argv[++i], 10) || 3390;
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--user') out.user = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function generateSelfSignedCert() {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);
  const attrs = [
    { name: 'commonName', value: '127.0.0.1' },
    { name: 'organizationName', value: 'NodeTerm MITM' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 7, ip: '127.0.0.1' },
        { type: 2, value: 'localhost' }
      ]
    }
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return {
    key: forge.pki.privateKeyToPem(keys.privateKey),
    cert: forge.pki.certificateToPem(cert)
  };
}

/** Localiza RDP_NEG_REQ (type=0x01, length=8) en un X.224 CR. */
function findNegReqOffset(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 19 || buf[0] !== 0x03) return -1;
  for (let i = 7; i <= buf.length - 8; i++) {
    if (buf[i] === 0x01 && buf.readUInt16LE(i + 2) === 8) return i;
  }
  return -1;
}

function readRequestedProtocols(buf) {
  const off = findNegReqOffset(buf);
  if (off < 0) return null;
  return buf.readUInt32LE(off + 4) >>> 0;
}

/** Reescribe requestedProtocols del RDP_NEG_REQ a solo SSL (0x01). */
function forceSslInX224Cr(buf) {
  const off = findNegReqOffset(buf);
  if (off < 0) return buf;
  const out = Buffer.from(buf);
  out.writeUInt32LE(PROTOCOL_SSL, off + 4);
  return out;
}

/** Reescribe selectedProtocol del RDP_NEG_RSP a SSL. */
function forceSslInX224Cc(buf) {
  const parsed = parseX224ConnectionConfirm(buf);
  if (!parsed || !parsed.ok || parsed.negoOffset == null) return buf;
  const out = Buffer.from(buf);
  out.writeUInt32LE(PROTOCOL_SSL, parsed.negoOffset + 4);
  // flags: EXTENDED_CLIENT_DATA_SUPPORTED | DYNVC_GFX (0x01) tipico mstsc
  if (out[parsed.negoOffset] === 0x02) {
    out[parsed.negoOffset + 1] = out[parsed.negoOffset + 1] | 0x01;
  }
  return out;
}

/** Solo traza: NUNCA usar el deframer para decidir qué bytes salen al peer (rompe teclado Fast-Path). */
function traceChunk(chunk, deframer, trace, dir) {
  try {
    for (const frame of deframer.push(chunk)) {
      if (dir === 'c2s' && isMcsConnectInitial(frame)) {
        const chans = findClientNetworkChannels(frame);
        console.log(
          `[mitm] MCS Connect Initial nativo CS_NET=[${chans.join(',')}]` +
          ` len=${frame.length}` +
          (chans.includes('cliprdr') ? ' (cliprdr anunciado)' : ' AVISO: sin cliprdr')
        );
      }
      // Visibilidad portapapeles durante la prueba.
      try {
        const mcs = parseMcsSendData(frame);
        if (mcs && mcs.channelId === CLIPRDR_CHANNEL_HINT && mcs.userData) {
          const desc = describeCliprdrPdu(mcs.userData) || `len=${mcs.userData.length}`;
          console.log(`[mitm] CLIPRDR ${dir} ch=${mcs.channelId} ${desc}`);
        }
      } catch (_) { /* noop */ }
      if (trace.enabled) trace.write(dir, frame);
    }
  } catch (e) {
    console.warn(`[mitm] deframer ${dir}: ${e.message}`);
  }
}

/**
 * s2c: reescribe SOLO el primer MCS Connect Response (SC_CORE protocols) y el resto
 * pasa opaco. Tras el parche, todo es write(chunk) sin reframe.
 */
function createS2cForwarder(clientTls, deframer, trace, clientRequestedProtocols) {
  let scCoreDone = false;
  let buf = Buffer.alloc(0);

  return function forwardS2c(chunk) {
    if (!chunk || !chunk.length) return;
    if (scCoreDone) {
      if (clientTls && clientTls.writable) clientTls.write(chunk);
      traceChunk(chunk, deframer, trace, 's2c');
      return;
    }

    buf = Buffer.concat([buf, chunk]);
    while (!scCoreDone && buf.length >= 4) {
      if (buf[0] !== 0x03 || buf[1] !== 0x00) {
        // No es TPKT: soltar buffer tal cual y pasar a opaco.
        if (clientTls && clientTls.writable) clientTls.write(buf);
        traceChunk(buf, deframer, trace, 's2c');
        buf = Buffer.alloc(0);
        scCoreDone = true;
        return;
      }
      const tpktLen = buf.readUInt16BE(2);
      if (tpktLen < 4 || buf.length < tpktLen) break;

      let frame = Buffer.from(buf.subarray(0, tpktLen));
      buf = buf.subarray(tpktLen);

      if (isMcsConnectResponse(frame) && clientRequestedProtocols != null) {
        console.log(`[mitm] MCS Connect Response len=${frame.length}`);
        const patched = patchScCoreClientRequestedProtocols(frame, clientRequestedProtocols);
        if (patched.patched) {
          console.log(
            `[mitm] SC_CORE.clientRequestedProtocols 0x${patched.old.toString(16)}` +
            ` -> 0x${patched.newVal.toString(16)} (eco del CR original)`
          );
          if (trace.enabled) trace.write('s2c', patched.buf, 'sc-core-protocols-restored');
          frame = patched.buf;
        } else {
          console.log(
            `[mitm] SC_CORE protocols: ${patched.reason}` +
            (patched.old != null ? ` (valor=0x${patched.old.toString(16)})` : '')
          );
          if (trace.enabled) trace.write('s2c', frame);
        }
        scCoreDone = true;
      } else if (trace.enabled) {
        trace.write('s2c', frame);
      }

      if (clientTls && clientTls.writable) clientTls.write(frame);
    }

    if (scCoreDone && buf.length) {
      if (clientTls && clientTls.writable) clientTls.write(buf);
      traceChunk(buf, deframer, trace, 's2c');
      buf = Buffer.alloc(0);
    }
  };
}

function handleClient(clientSocket, opts, tlsCreds, sessionIndex) {
  clientSocket.setNoDelay(true);
  const label = `mstsc#${sessionIndex}`;
  const outPath = opts.out
    || defaultTracePath(`mstsc-selector-${sessionIndex}`);
  const trace = createPduTraceWriter(outPath, { label });
  console.log(`[mitm] ${label} aceptada -> trace ${trace.path}`);

  let phase = 'x224-cr';
  let serverPlain = null;
  let clientTls = null;
  let closed = false;
  let clientRequestedProtocols = null;

  const cleanup = (why) => {
    if (closed) return;
    closed = true;
    console.log(`[mitm] ${label} cierre: ${why || 'ok'}`);
    try { trace.mark('session-end', why || 'ok'); } catch (_) { /* noop */ }
    try { trace.close(); } catch (_) { /* noop */ }
    try { clientSocket.destroy(); } catch (_) { /* noop */ }
    try { if (serverPlain) serverPlain.destroy(); } catch (_) { /* noop */ }
    try { if (clientTls) clientTls.destroy(); } catch (_) { /* noop */ }
  };

  clientSocket.once('data', (x224CrRaw) => {
    if (phase !== 'x224-cr') return;
    phase = 'x224-cc';
    if (trace.enabled) trace.write('c2s', x224CrRaw, 'x224-cr-client');
    const requested = readRequestedProtocols(x224CrRaw);
    clientRequestedProtocols = requested;
    console.log(
      `[mitm] ${label} X.224 CR (${x224CrRaw.length}B) requestedProtocols=` +
      `0x${(requested == null ? -1 : requested).toString(16)} (${protocolName(requested || 0)})`
    );
    if (requested === 0) {
      console.warn(
        `[mitm] ${label} AVISO: mstsc pidio PROTOCOL_RDP (sin TLS).` +
        ` La plantilla .rdp debe tener negotiate security layer:i:1.` +
        ` Se fuerza SSL hacia Wallix; el cliente puede cortar si no espera TLS.`
      );
    }
    const x224Cr = forceSslInX224Cr(x224CrRaw);
    if (x224Cr !== x224CrRaw && trace.enabled) {
      trace.write('c2s', x224Cr, 'x224-cr-forced-ssl');
    }

    console.log(`[mitm] ${label} -> ${opts.host}:${opts.port} (SSL only)`);

    const serverTcp = net.connect({ host: opts.host, port: opts.port }, () => {
      serverTcp.setNoDelay(true);
      serverTcp.write(x224Cr);
    });

    serverTcp.once('data', (x224CcRaw) => {
      if (trace.enabled) trace.write('s2c', x224CcRaw, 'x224-cc-server');
      const nego = parseX224ConnectionConfirm(x224CcRaw);
      if (nego && nego.ok) {
        console.log(
          `[mitm] ${label} X.224 CC selectedProtocol=0x${(nego.selectedProtocol >>> 0).toString(16)}` +
          ` (${protocolName(nego.selectedProtocol)})`
        );
      } else if (nego && !nego.ok) {
        console.warn(`[mitm] ${label} NEG_FAILURE code=${nego.failureCode}`);
        cleanup('neg-failure');
        return;
      }

      const x224Cc = forceSslInX224Cc(x224CcRaw);
      if (trace.enabled) trace.write('s2c', x224Cc, 'x224-cc-to-client-ssl');
      clientSocket.write(x224Cc);

      // Critico: envolver al cliente YA (mstsc manda ClientHello al instante).
      // Bufferizar app-data post-TLS hasta que ambos extremos esten secure (si no,
      // se pierde el MCS Connect Initial y mstsc hace ECONNRESET).
      let clientOk = false;
      let serverOk = false;
      let piped = false;
      const pendingC2s = [];
      const pendingS2c = [];
      const deframerC2s = new RdpStreamDeframer();
      const deframerS2c = new RdpStreamDeframer();
      // Se asigna tras crear clientTls+serverPlain; tryPipe lo usa al vaciar pending.
      let forwardS2c = null;

      const forwardC2s = (chunk) => {
        if (serverPlain && serverPlain.writable) serverPlain.write(chunk);
        traceChunk(chunk, deframerC2s, trace, 'c2s');
      };

      const tryPipe = () => {
        if (!clientOk || !serverOk || closed || piped) return;
        piped = true;
        console.log(`[mitm] ${label} TLS duplex OK — forward opaco (pend c2s=${pendingC2s.length} s2c=${pendingS2c.length})`);
        trace.mark('tls-duplex-ok', `pendC2s=${pendingC2s.length} pendS2c=${pendingS2c.length}`);
        forwardS2c = createS2cForwarder(clientTls, deframerS2c, trace, clientRequestedProtocols);
        for (const chunk of pendingC2s) forwardC2s(chunk);
        pendingC2s.length = 0;
        for (const chunk of pendingS2c) forwardS2c(chunk);
        pendingS2c.length = 0;
        clientTls.on('close', () => cleanup('client-tls-close'));
        serverPlain.on('close', () => cleanup('server-tls-close'));
      };

      // Cliente (mstsc/Schannel): ciphers modernos. Bastion Wallix: RSA TLS1.2 como NodeTerm.
      clientTls = new tls.TLSSocket(clientSocket, {
        isServer: true,
        key: tlsCreds.key,
        cert: tlsCreds.cert,
        rejectUnauthorized: false,
        requestCert: false,
        minVersion: 'TLSv1',
        maxVersion: 'TLSv1.2',
        ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA:AES256-SHA'
      });
      clientTls.on('data', (chunk) => {
        if (!piped) {
          pendingC2s.push(chunk);
          return;
        }
        forwardC2s(chunk);
      });
      clientTls.on('secure', () => {
        console.log(`[mitm] ${label} TLS al cliente OK`);
        trace.mark('tls-client-ok');
        clientOk = true;
        tryPipe();
      });
      clientTls.on('error', (e) => {
        console.warn(`[mitm] ${label} client-tls-err: ${e.message}`);
        cleanup(`client-tls-err: ${e.message}`);
      });

      serverPlain = tls.connect({
        socket: serverTcp,
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        minVersion: 'TLSv1',
        maxVersion: 'TLSv1.2',
        ciphers: 'ALL:DEFAULT:!ECDHE:!DHE:RSA'
      }, () => {
        console.log(`[mitm] ${label} TLS al bastion OK`);
        trace.mark('tls-server-ok');
        serverOk = true;
        tryPipe();
      });
      serverPlain.on('data', (chunk) => {
        if (!piped) {
          pendingS2c.push(chunk);
          return;
        }
        forwardS2c(chunk);
      });
      serverPlain.on('error', (e) => {
        console.warn(`[mitm] ${label} server-tls-err: ${e.message}`);
        cleanup(`server-tls-err: ${e.message}`);
      });
    });

    serverTcp.on('error', (e) => cleanup(`server-tcp: ${e.message}`));
  });

  clientSocket.on('error', (e) => cleanup(`client: ${e.message}`));
  clientSocket.on('close', () => cleanup('client-close'));
}

function writeRdpTemplate(listenPort, user) {
  const templatePath = path.join(__dirname, 'wallix-selector-mitm.rdp');
  // Usuario selector tipico: sin :APP:/:RDP:. Ajusta a tu cadena Wallix.
  const body = [
    'screen mode id:i:2',
    'use multimon:i:0',
    'desktopwidth:i:1920',
    'desktopheight:i:1080',
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
    'allow desktop composition:i:1',
    'disable full window drag:i:0',
    'disable menu anims:i:0',
    'disable themes:i:0',
    'disable cursor setting:i:0',
    'bitmapcachepersistenable:i:1',
    `full address:s:127.0.0.1:${listenPort}`,
    'audiomode:i:0',
    'redirectprinters:i:0',
    'redirectcomports:i:0',
    'redirectsmartcards:i:0',
    'redirectclipboard:i:1',
    'redirectposdevices:i:0',
    'autoreconnection enabled:i:1',
    // 0 = conectar aunque falle la autenticacion del servidor (cert autofirmado)
    'authentication level:i:0',
    'prompt for credentials:i:1',
    // 1 = negociar SSL/TLS. Obligatorio para el MITM.
    'negotiate security layer:i:1',
    'remoteapplicationmode:i:0',
    'alternate shell:s:',
    'shell working directory:s:',
    'gatewayhostname:s:',
    'gatewayusagemethod:i:4',
    'gatewaycredentialssource:i:4',
    'gatewayprofileusagemethod:i:0',
    'promptcredentialonce:i:0',
    'gatewaybrokeringtype:i:0',
    'use redirection server name:i:0',
    'rdgiskdcproxy:i:0',
    'kdcproxyname:s:',
    // IMPORTANTE: con enablecredsspsupport:i:0, mstsc moderno pide PROTOCOL_RDP (0)
    // y corta al recibir SSL. Con i:1 anuncia SSL|HYBRID; el MITM responde selectedProtocol=SSL
    // (forceSslInX224Cc) para que NO arranque CredSSP/NLA — igual que NodeTerm hacia Wallix.
    'enablecredsspsupport:i:1',
    `username:s:${user}`,
    ''
  ].join('\r\n');
  // mstsc exige UTF-16 LE con BOM; en UTF-8 ignora negotiate security layer y pide PROTOCOL_RDP.
  const bom = Buffer.from([0xff, 0xfe]);
  const utf16 = Buffer.from(body, 'utf16le');
  fs.writeFileSync(templatePath, Buffer.concat([bom, utf16]));
  return templatePath;
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log(`Uso: node testing/rdp/mitm-capture.js [opciones]
  --host HOST     Bastion (default bastion-dsn.sec.dsn.inet)
  --port PORT     Puerto bastion (default 3389)
  --listen PORT   Puerto local (default 3390)
  --out PATH      JSONL de salida
  --user USER     Usuario en la plantilla .rdp`);
    process.exit(0);
  }

  console.log('[mitm] Generando certificado autofirmado...');
  const tlsCreds = generateSelfSignedCert();
  const rdpPath = writeRdpTemplate(opts.listen, opts.user);
  console.log(`[mitm] Plantilla .rdp: ${rdpPath}`);
  console.log('[mitm] Abre el .rdp con mstsc (acepta el certificado). CredSSP debe estar OFF.');

  let sessionIndex = 0;
  const server = net.createServer((sock) => {
    sessionIndex += 1;
    handleClient(sock, opts, tlsCreds, sessionIndex);
  });

  server.listen(opts.listen, '127.0.0.1', () => {
    console.log(`[mitm] Escuchando 127.0.0.1:${opts.listen} -> ${opts.host}:${opts.port}`);
    console.log('[mitm] Ctrl+C para salir.');
  });

  server.on('error', (e) => {
    console.error('[mitm] Error servidor:', e.message);
    process.exit(1);
  });
}

main();
