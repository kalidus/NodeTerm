/**
 * Probe live: negociacion X.224 + TLS contra un host RDP.
 * Uso (PowerShell):
 *   cd c:\Users\kalid\Documents\Antigravity\NodeTerm
 *   node testing/rdp/probe-wallix-nego.js
 *   node testing/rdp/probe-wallix-nego.js --host bastion-dsn.sec.dsn.inet --user rt01119
 *
 * No envia credenciales CredSSP; solo mide selectedProtocol y estabilidad TLS.
 */

'use strict';

const net = require('net');
const tls = require('tls');
const {
  PROTOCOL_SSL,
  PROTOCOL_HYBRID,
  PROTOCOL_HYBRID_EX,
  protocolName,
  buildX224ConnectionRequest,
  parseX224ConnectionConfirm
} = require('./x224-helpers');

function parseArgs(argv) {
  const out = {
    host: 'bastion-dsn.sec.dsn.inet',
    port: 3389,
    user: 'rt01119',
    timeoutMs: 12000,
    requested: PROTOCOL_SSL | PROTOCOL_HYBRID | PROTOCOL_HYBRID_EX
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--host') out.host = argv[++i];
    else if (a === '--port') out.port = parseInt(argv[++i], 10) || 3389;
    else if (a === '--user') out.user = argv[++i];
    else if (a === '--timeout') out.timeoutMs = parseInt(argv[++i], 10) || 12000;
    else if (a === '--ssl-only') out.requested = PROTOCOL_SSL;
    else if (a === '--nla-only') out.requested = PROTOCOL_HYBRID | PROTOCOL_HYBRID_EX;
  }
  return out;
}

function connectOnce(opts) {
  return new Promise((resolve) => {
    const result = {
      host: opts.host,
      port: opts.port,
      user: opts.user,
      requestedProtocols: opts.requested,
      requestedName: protocolName(opts.requested),
      tcpOk: false,
      x224: null,
      tlsOk: false,
      tlsError: null,
      postTlsBytes: 0,
      postTlsHexPreview: '',
      closedReason: null,
      error: null
    };

    const socket = net.connect({ host: opts.host, port: opts.port });
    let settled = false;
    let tlsSocket = null;
    let phase = 'tcp';

    const finish = (extra) => {
      if (settled) return;
      settled = true;
      Object.assign(result, extra || {});
      try { if (tlsSocket) tlsSocket.destroy(); } catch (_) {}
      try { socket.destroy(); } catch (_) {}
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ error: `timeout en fase=${phase} tras ${opts.timeoutMs}ms` });
    }, opts.timeoutMs);

    socket.setTimeout(opts.timeoutMs);
    socket.once('timeout', () => {
      clearTimeout(timer);
      finish({ error: `socket timeout en fase=${phase}` });
    });

    socket.once('error', (err) => {
      clearTimeout(timer);
      finish({ error: `TCP error: ${err.message}` });
    });

    socket.once('connect', () => {
      result.tcpOk = true;
      phase = 'x224';
      socket.setNoDelay(true);
      const cr = buildX224ConnectionRequest(opts.user, opts.requested);
      console.log(`[probe] TCP OK ${opts.host}:${opts.port}`);
      console.log(`[probe] Enviando X.224 CR (${cr.length} bytes) requested=${protocolName(opts.requested)} user=${opts.user}`);
      socket.write(cr);
    });

    socket.once('data', (x224CcChunk) => {
      phase = 'tls';
      const parsed = parseX224ConnectionConfirm(x224CcChunk);
      result.x224 = {
        rawLen: x224CcChunk.length,
        hexPreview: x224CcChunk.subarray(0, Math.min(40, x224CcChunk.length)).toString('hex'),
        parsed
      };

      if (!parsed) {
        clearTimeout(timer);
        finish({ error: 'X.224 CC no parseable' });
        return;
      }

      if (!parsed.ok) {
        console.log(`[probe] X.224 NEG_FAILURE code=${parsed.failureCode}`);
        clearTimeout(timer);
        finish({});
        return;
      }

      console.log(`[probe] X.224 CC ok selectedProtocol=0x${parsed.selectedProtocol.toString(16)} (${protocolName(parsed.selectedProtocol)})`);
      console.log(`[probe] CC bytes=${x224CcChunk.length} preview=${result.x224.hexPreview}`);

      if (parsed.selectedProtocol === PROTOCOL_SSL) {
        console.log('[probe] Servidor eligio TLS Direct 0x01. El bridge debe reenviar este CC intacto (sin forzar 0x02).');
      }

      tlsSocket = tls.connect({
        socket,
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        minVersion: 'TLSv1',
        ciphers: 'ALL:DEFAULT'
      }, () => {
        result.tlsOk = true;
        phase = 'post-tls';
        const cert = tlsSocket.getPeerCertificate(true);
        console.log(`[probe] TLS OK protocol=${tlsSocket.getProtocol()} cipher=${tlsSocket.getCipher()?.name || '?'}`);
        console.log(`[probe] Peer CN=${cert && cert.subject ? cert.subject.CN : '(sin cert)'} raw=${cert && cert.raw ? cert.raw.length : 0} bytes`);

        // Esperar un momento a datos post-TLS (el servidor suele esperar MCS del cliente)
        setTimeout(() => {
          clearTimeout(timer);
          finish({ closedReason: result.closedReason || 'idle-after-tls (servidor espera MCS/CredSSP del cliente)' });
        }, 1500);
      });

      tlsSocket.on('data', (chunk) => {
        result.postTlsBytes += chunk.length;
        if (!result.postTlsHexPreview) {
          result.postTlsHexPreview = chunk.subarray(0, Math.min(32, chunk.length)).toString('hex');
        }
        console.log(`[probe] DATA post-TLS +${chunk.length} bytes (total=${result.postTlsBytes})`);
      });

      tlsSocket.on('error', (err) => {
        result.tlsError = err.message;
        console.log(`[probe] TLS error: ${err.message}`);
      });

      tlsSocket.on('close', () => {
        result.closedReason = result.closedReason || 'tls-closed';
        console.log(`[probe] TLS closed (postTlsBytes=${result.postTlsBytes})`);
      });
    });
  });
}

async function main() {
  const opts = parseArgs(process.argv);
  console.log('=== NodeTerm RDP nego probe ===');
  console.log(JSON.stringify({
    host: opts.host,
    port: opts.port,
    user: opts.user,
    requested: protocolName(opts.requested)
  }, null, 2));

  const scenarios = [
    { label: 'any (SSL|HYBRID|HYBRID_EX)', requested: PROTOCOL_SSL | PROTOCOL_HYBRID | PROTOCOL_HYBRID_EX },
    { label: 'ssl-only', requested: PROTOCOL_SSL },
    { label: 'nla-only', requested: PROTOCOL_HYBRID | PROTOCOL_HYBRID_EX }
  ];

  const reports = [];
  for (const sc of scenarios) {
    console.log(`\n--- Escenario: ${sc.label} ---`);
    const r = await connectOnce({ ...opts, requested: sc.requested });
    reports.push({ scenario: sc.label, ...r });
    if (r.error && String(r.error).includes('TCP error')) {
      console.log(`[probe] Host inalcanzable (${r.error}). Se omiten el resto de escenarios.`);
      break;
    }
  }

  console.log('\n=== RESUMEN ===');
  for (const r of reports) {
    const sel = r.x224 && r.x224.parsed && r.x224.parsed.ok
      ? `0x${r.x224.parsed.selectedProtocol.toString(16)} (${protocolName(r.x224.parsed.selectedProtocol)})`
      : (r.x224 && r.x224.parsed && !r.x224.parsed.ok
        ? `FAILURE(${r.x224.parsed.failureCode})`
        : 'n/a');
    console.log(`- ${r.scenario}: tcp=${r.tcpOk} selected=${sel} tls=${r.tlsOk} postTlsBytes=${r.postTlsBytes} err=${r.error || r.tlsError || '-'}`);
  }

  const any = reports.find((r) => r.scenario.startsWith('any'));
  if (any && any.tcpOk && any.x224 && any.x224.parsed && any.x224.parsed.ok) {
    const sel = any.x224.parsed.selectedProtocol;
    if (sel === PROTOCOL_SSL) {
      console.log('\nCONCLUSION: Host nego TLS Direct (0x01). Path correcto: CC honesto + IronRDP TLS/TS_INFO (no CredSSP).');
      process.exitCode = 0;
    } else if (sel === PROTOCOL_HYBRID || sel === PROTOCOL_HYBRID_EX || (sel & (PROTOCOL_HYBRID | PROTOCOL_HYBRID_EX))) {
      console.log('\nCONCLUSION: Host nego NLA/CredSSP. Path actual IronRDP deberia funcionar sin cambios de protocolo.');
      process.exitCode = 0;
    } else {
      console.log(`\nCONCLUSION: selectedProtocol inesperado 0x${sel.toString(16)}`);
      process.exitCode = 2;
    }
  } else if (reports.some((r) => r.error && String(r.error).includes('TCP error'))) {
    console.log('\nCONCLUSION: Host no alcanzable desde esta maquina (VPN/DNS/firewall).');
    process.exitCode = 3;
  } else {
    console.log('\nCONCLUSION: Negociacion incompleta; revisar log.');
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
