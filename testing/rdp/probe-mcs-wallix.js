/**
 * Tras X.224+TLS, envia MCS Connect Initial de prueba y mira si Wallix responde.
 * Uso:
 *   node testing/rdp/probe-mcs-wallix.js
 *   node testing/rdp/probe-mcs-wallix.js --variant iron
 *   node testing/rdp/probe-mcs-wallix.js --variant full
 */

'use strict';

const net = require('net');
const tls = require('tls');
const fs = require('fs');
const path = require('path');
const {
  PROTOCOL_SSL,
  PROTOCOL_HYBRID,
  PROTOCOL_HYBRID_EX,
  protocolName,
  parseX224ConnectionConfirm
} = require('../../src/main/services/rdp-protocol-helpers');
const { buildX224ConnectionRequest } = require('../../src/main/services/rdp-nego-probe');
const { findClientCoreData } = require('../../src/main/services/rdp-mcs-helpers');

function parseArgs(argv) {
  const out = {
    host: 'bastion-dsn.sec.dsn.inet',
    port: 3389,
    user: 'rt01119',
    variant: 'both', // iron | full | both
    timeoutMs: 12000
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--host') out.host = argv[++i];
    else if (a === '--port') out.port = parseInt(argv[++i], 10) || 3389;
    else if (a === '--user') out.user = argv[++i];
    else if (a === '--variant') out.variant = argv[++i];
  }
  return out;
}

function loadIronMcs() {
  const p = path.join(__dirname, 'last-mcs-connect-initial.hex');
  if (!fs.existsSync(p)) return null;
  return Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
}

/**
 * MCS Connect Initial "completo" inspirado en clientes tipicos:
 * CS_CORE + CS_CLUSTER + CS_SECURITY(none) + CS_NET(rdpdr,rdpsnd,cliprdr,drdynvc)
 * Construccion simplificada: reutiliza CS_CORE del dump Iron y sustituye cola GCC.
 */
function buildFullMcsFromIron(ironBuf) {
  const core = findClientCoreData(ironBuf);
  if (!core) throw new Error('No CS_CORE en dump iron');
  const coreBlock = ironBuf.subarray(core.offset, core.offset + core.length);

  const cluster = Buffer.alloc(12);
  cluster.writeUInt16LE(0xc004, 0);
  cluster.writeUInt16LE(12, 2);
  cluster.writeUInt32LE(0x0000000d, 4); // REDIRECTION_SUPPORTED | version bits tipicos
  cluster.writeUInt32LE(0, 8);

  const security = Buffer.alloc(12);
  security.writeUInt16LE(0xc002, 0);
  security.writeUInt16LE(12, 2);
  security.writeUInt32LE(0, 4); // ENCRYPTION_METHOD_NONE (TLS)
  security.writeUInt32LE(0, 8);

  const channels = [
    { name: 'rdpdr', opts: 0x80800000 },
    { name: 'rdpsnd', opts: 0xc0000000 },
    { name: 'cliprdr', opts: 0xc0a00000 },
    { name: 'drdynvc', opts: 0xc0800000 }
  ];
  const netLen = 8 + channels.length * 12;
  const net = Buffer.alloc(netLen);
  net.writeUInt16LE(0xc003, 0);
  net.writeUInt16LE(netLen, 2);
  net.writeUInt32LE(channels.length, 4);
  channels.forEach((ch, idx) => {
    const o = 8 + idx * 12;
    Buffer.from(ch.name, 'ascii').copy(net, o);
    net.writeUInt32LE(ch.opts >>> 0, o + 8);
  });

  const gccUser = Buffer.concat([coreBlock, cluster, security, net]);

  // Reconstruir enveloping: tomar prefijo hasta "Duca" inclusive del iron dump y reescribir lengths.
  const duca = ironBuf.indexOf(Buffer.from('Duca'));
  if (duca < 0) throw new Error('No Duca');
  // Estructura Iron: ... Duca | PER-len | gcc
  // PER len de 266 era 81 0a (0x10a). Para nueva longitud usamos igual forma.
  const gccLen = gccUser.length;
  let perLen;
  if (gccLen < 0x80) perLen = Buffer.from([gccLen]);
  else if (gccLen < 0x4000) {
    // Iron uso 0x81 0x0a para 0x10a — forma: 0x8000|len en 2 bytes big-endian style used by their PER
    // En el dump: 81 0a => 0x010a. Usamos el mismo encoding que Iron: 0x80 | (len>>8), len&0xff si len>=128
    perLen = Buffer.from([0x80 | ((gccLen >> 8) & 0x3f), gccLen & 0xff]);
  } else {
    throw new Error('gcc demasiado grande');
  }

  // Prefijo hasta Duca (incluido)
  const prefixToDuca = ironBuf.subarray(0, duca + 4);

  // Reconstruir MCS BER: localizar 7f 65 (Connect-Initial) y reescribir longitudes es fragil.
  // Enfoque pragmatico: reemplazar solo desde Duca en adelante y ajustar TPKT/X224/MCS lengths
  // midiendo el buffer final.

  // Buscar inicio user-data GCC en iron (byte tras perLen)
  const ironPerStart = duca + 4;
  let ironPerHdr = 1;
  if (ironBuf[ironPerStart] & 0x80) ironPerHdr = 2;
  const afterGccPrefix = Buffer.concat([prefixToDuca, perLen, gccUser]);

  // afterGccPrefix todavia tiene el viejo encabezado TPKT/MCS con lengths viejas.
  // Recalcular: el PDU completo es afterGccPrefix pero el prefijo incluye TPKT con len antigua.
  // Rehacemos TPKT+X224 alrededor del cuerpo MCS.

  // Extraer cuerpo MCS (desde 7f 65)
  const mcsTag = afterGccPrefix.indexOf(Buffer.from([0x7f, 0x65]));
  if (mcsTag < 0) throw new Error('No MCS tag');
  let mcsBody = afterGccPrefix.subarray(mcsTag);

  // Reescribir longitud BER del Connect-Initial (7f 65 82 xx xx)
  // Contenido tras cabecera de longitud
  if (mcsBody[0] !== 0x7f || mcsBody[1] !== 0x65) throw new Error('tag');
  // Saltar tag y length encoding antigua
  let oldContentStart = 2;
  if (mcsBody[2] & 0x80) {
    const n = mcsBody[2] & 0x7f;
    oldContentStart = 3 + n;
  } else {
    oldContentStart = 3;
  }
  const content = mcsBody.subarray(oldContentStart);
  // content sigue teniendo vieja cola; mejor reconstruir content desde callingDomain... hasta gcc nuevo
  // Mas simple: usar content del iron hasta el byte anterior a CS_CORE relativo... demasiado fragil.

  // Plan B mas robusto: partir del iron buffer completo, sustituir gcc user data y
  // ajustar: PER len, BER len del 7f65, TPKT len, X224 li.
  return rebuildWithNewGcc(ironBuf, gccUser);
}

function rebuildWithNewGcc(ironBuf, gccUser) {
  const duca = ironBuf.indexOf(Buffer.from('Duca'));
  const core = findClientCoreData(ironBuf);
  const oldGccStart = core.offset;
  const oldGccEnd = ironBuf.length; // gcc va hasta el final en este dump
  const before = ironBuf.subarray(0, duca + 4);

  const gccLen = gccUser.length;
  const perLen = gccLen < 0x80
    ? Buffer.from([gccLen])
    : Buffer.from([0x80 | ((gccLen >> 8) & 0x3f), gccLen & 0xff]);

  // before incluye hasta Duca; luego perLen+gcc. Pero before aun tiene TPKT/MCS lens viejas
  // y el tramo entre Duca y oldGccStart en iron era perLen viejo.
  const assembled = Buffer.concat([before, perLen, gccUser]);

  // Ajustar BER length de 7f 65
  const tagAt = assembled.indexOf(Buffer.from([0x7f, 0x65]));
  if (tagAt < 0) throw new Error('mcs tag missing');
  // content = todo tras length field hasta EOF
  // Necesitamos saber donde empieza el content en `assembled`.
  // En iron: 7f 65 82 01 87 <content de 0x187 bytes>
  // En assembled el content empieza tras reescribir length.

  // Calcular content = assembled[tagAt+2+lenBytes..] pero primero detectamos lenBytes del buffer actual (viejo)
  let lenBytes = 1;
  if (assembled[tagAt + 2] & 0x80) lenBytes = 1 + (assembled[tagAt + 2] & 0x7f);
  const contentStart = tagAt + 2 + lenBytes;
  const content = assembled.subarray(contentStart);
  const contentLen = content.length;

  let newLenField;
  if (contentLen < 0x80) newLenField = Buffer.from([contentLen]);
  else if (contentLen <= 0xff) newLenField = Buffer.from([0x81, contentLen]);
  else newLenField = Buffer.from([0x82, (contentLen >> 8) & 0xff, contentLen & 0xff]);

  const mcsPdu = Buffer.concat([
    Buffer.from([0x7f, 0x65]),
    newLenField,
    content
  ]);

  // X.224 Data header: LI + 0xf0 + 0x80 + mcs
  const x224Li = 2 + mcsPdu.length; // dt + eot + mcs? Actually LI includes following bytes except LI itself
  // Standard: TPDU Data: LI (1) | 0xF0 | 0x80 | userData; LI = 2 + userData.length? 
  // In iron: 02 f0 80 ... so LI=2 means only the 2 bytes f0 80 are in fixed header and user data not counted in LI for X.224 Data in RDP?
  // RDP uses LI=2 for Data TPDU always (0xf0 0x80), user data follows. Keep LI=2.
  const x224 = Buffer.concat([Buffer.from([0x02, 0xf0, 0x80]), mcsPdu]);
  const tpktLen = 4 + x224.length;
  const tpkt = Buffer.concat([
    Buffer.from([0x03, 0x00, (tpktLen >> 8) & 0xff, tpktLen & 0xff]),
    x224
  ]);
  return tpkt;
}

function runOnce(opts, mcsBuf, label) {
  return new Promise((resolve) => {
    const result = {
      label,
      mcsLen: mcsBuf.length,
      core: findClientCoreData(mcsBuf),
      tcpOk: false,
      selectedProtocol: null,
      tlsOk: false,
      fromRdp: 0,
      fromRdpPreview: '',
      error: null
    };

    const socket = net.connect({ host: opts.host, port: opts.port });
    let tlsSocket = null;
    let settled = false;
    const finish = (extra) => {
      if (settled) return;
      settled = true;
      Object.assign(result, extra || {});
      try { if (tlsSocket) tlsSocket.destroy(); } catch (_) {}
      try { socket.destroy(); } catch (_) {}
      resolve(result);
    };
    const timer = setTimeout(() => finish({ error: 'timeout' }), opts.timeoutMs);

    socket.once('error', (e) => { clearTimeout(timer); finish({ error: e.message }); });
    socket.once('connect', () => {
      result.tcpOk = true;
      const cr = buildX224ConnectionRequest(opts.user, PROTOCOL_SSL | PROTOCOL_HYBRID | PROTOCOL_HYBRID_EX);
      socket.write(cr);
    });

    socket.once('data', (cc) => {
      const parsed = parseX224ConnectionConfirm(cc);
      if (!parsed || !parsed.ok) {
        clearTimeout(timer);
        finish({ error: 'nego fail' });
        return;
      }
      result.selectedProtocol = parsed.selectedProtocol;
      console.log(`[${label}] X.224 selected=${protocolName(parsed.selectedProtocol)}; envio MCS ${mcsBuf.length}B`);

      tlsSocket = tls.connect({
        socket,
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        minVersion: 'TLSv1',
        ciphers: 'ALL:DEFAULT'
      }, () => {
        result.tlsOk = true;
        tlsSocket.write(mcsBuf);
        setTimeout(() => {
          clearTimeout(timer);
          finish({});
        }, 2000);
      });

      tlsSocket.on('data', (chunk) => {
        if (!result.fromRdp) result.fromRdpPreview = chunk.subarray(0, 32).toString('hex');
        result.fromRdp += chunk.length;
        console.log(`[${label}] RDP->client +${chunk.length}B total=${result.fromRdp}`);
      });
      tlsSocket.on('error', (e) => { result.error = e.message; });
      tlsSocket.on('close', () => console.log(`[${label}] TLS closed fromRdp=${result.fromRdp}`));
    });
  });
}

async function main() {
  const opts = parseArgs(process.argv);
  const iron = loadIronMcs();
  if (!iron) {
    console.error('Falta testing/rdp/last-mcs-connect-initial.hex (conecta una vez con la app)');
    process.exit(2);
  }

  const variants = [];
  if (opts.variant === 'iron' || opts.variant === 'both') {
    variants.push({ label: 'iron-original', buf: iron });
  }
  if (opts.variant === 'full' || opts.variant === 'both') {
    variants.push({ label: 'full-channels', buf: buildFullMcsFromIron(iron) });
  }

  // Variante: mismo iron pero sin CS_NET (cortar a CS_SECURITY end)
  if (opts.variant === 'both' || opts.variant === 'nonet') {
    const core = findClientCoreData(iron);
    const secType = 0xc002;
    let secOff = -1;
    for (let i = core.offset + core.length; i + 4 <= iron.length; i++) {
      if (iron.readUInt16LE(i) === secType) { secOff = i; break; }
    }
    if (secOff >= 0) {
      const secLen = iron.readUInt16LE(secOff + 2);
      const gccUser = iron.subarray(core.offset, secOff + secLen);
      variants.push({ label: 'no-net-channel', buf: rebuildWithNewGcc(iron, gccUser) });
    }
  }

  const reports = [];
  for (const v of variants) {
    console.log(`\n=== ${v.label} ===`);
    const c = findClientCoreData(v.buf);
    console.log('CS_CORE', c);
    reports.push(await runOnce(opts, v.buf, v.label));
  }

  console.log('\n=== RESUMEN ===');
  for (const r of reports) {
    console.log(`- ${r.label}: selected=0x${(r.selectedProtocol || 0).toString(16)} tls=${r.tlsOk} fromRdp=${r.fromRdp} err=${r.error || '-'}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
