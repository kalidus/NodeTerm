const net = require('net');
const fs = require('fs');
const { registerSsh2PqcKex, PQC_KEX_ALGORITHMS } = require('./pqc/registerSsh2PqcKex');
const { shouldUseTmuxPersist } = require('./tmuxSession');

// Registrar soporte de intercambio de claves (KEX) híbrido Post-Cuántico en ssh2
registerSsh2PqcKex();

const ssh2Constants = (() => {
  try {
    return require('ssh2/lib/protocol/constants.js');
  } catch (_) {
    return null;
  }
})();

function filterSupported(list, supportedList) {
  if (!Array.isArray(supportedList) || supportedList.length === 0) {
    return list;
  }
  const filtered = list.filter((alg) => supportedList.includes(alg));
  return filtered.length > 0 ? filtered : list;
}

function isWallixBastion(config) {
  return !!(config && config.useBastionWallix);
}

function isLegacyCompatibility(config) {
  return !!(config && config.legacyCompatibility);
}

/**
 * Detecta si un error de conexión corresponde a un fallo en la fase de Handshake/KEX
 * (y NO a credenciales ni a rechazo explícito de clave de host en known_hosts),
 * permitiendo reintentar automáticamente en modo de compatibilidad legacy (sin PQC).
 */
function isHandshakeOrKexError(err) {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : (err.message || '');
  const lower = msg.toLowerCase();

  // No reintentar si fue rechazado por política de known_hosts o por autenticación
  if (
    lower.includes('host denied') ||
    lower.includes('known_hosts') ||
    lower.includes('clave de host') ||
    lower.includes('authentication') ||
    lower.includes('enotfound') ||
    lower.includes('econnrefused') ||
    lower.includes('ehostunreach') ||
    lower.includes('enetunreach')
  ) {
    return false;
  }

  if (err.level === 'handshake') {
    return true;
  }

  return /handshake failed|signature verification failed|key exchange|no matching .* algorithm|unable to agree|unsupported algorithm|dh secret|bad packet length|packet corrupt|protocol error|econnreset/i.test(msg);
}

/**
 * Reordena serverHostKey para priorizar el tipo de clave que ya esté registrado
 * en known_hosts para este servidor, evitando falsos rechazos por cambio de tipo de clave.
 */
function prioritizeKnownHostKeyAlgorithms(algorithms, existingKeyType) {
  if (!algorithms || !Array.isArray(algorithms.serverHostKey) || !existingKeyType) {
    return algorithms;
  }

  const preferred = existingKeyType === 'ssh-rsa'
    ? ['rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa']
    : [existingKeyType];

  const prioritized = [
    ...preferred.filter((k) => algorithms.serverHostKey.includes(k)),
    ...algorithms.serverHostKey.filter((k) => !preferred.includes(k))
  ];

  return {
    ...algorithms,
    serverHostKey: prioritized
  };
}

function buildSshAlgorithms(config = {}) {
  const raw = isLegacyCompatibility(config)
    ? {
        kex: [
          'curve25519-sha256',
          'curve25519-sha256@libssh.org',
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
          'diffie-hellman-group-exchange-sha256',
          'diffie-hellman-group14-sha256',
          'diffie-hellman-group-exchange-sha1',
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group1-sha1'
        ],
        cipher: [
          'aes128-ctr',
          'aes192-ctr',
          'aes256-ctr',
          'aes128-gcm@openssh.com',
          'aes256-gcm@openssh.com',
          'aes128-gcm',
          'aes256-gcm',
          'aes256-cbc',
          'aes192-cbc',
          'aes128-cbc',
          '3des-cbc'
        ],
        serverHostKey: [
          'ssh-ed25519',
          'ecdsa-sha2-nistp256',
          'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521',
          'rsa-sha2-512',
          'rsa-sha2-256',
          'ssh-rsa',
          'ssh-dss'
        ],
        hmac: [
          'hmac-sha2-256',
          'hmac-sha2-512',
          'hmac-sha1'
        ],
        compress: ['none']
      }
    : {
        // Prioridad 1: KEX Híbrido Post-Cuántico (ML-KEM-768 / sntrup761)
        // Prioridad 2: KEX Clásico Moderno (Curve25519 / ECDH / DH-SHA2)
        // Prioridad 3: Fallback al final para servidores antiguos (DH-SHA1)
        kex: [
          ...PQC_KEX_ALGORITHMS,
          'curve25519-sha256',
          'curve25519-sha256@libssh.org',
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
          'diffie-hellman-group-exchange-sha256',
          'diffie-hellman-group14-sha256',
          'diffie-hellman-group16-sha512',
          'diffie-hellman-group18-sha512',
          'diffie-hellman-group-exchange-sha1',
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group1-sha1'
        ],
        // Prioridad 1: AEAD y CTR de 256 bits (resistentes a Grover)
        // Prioridad 2: AEAD y CTR de 192/128 bits
        // Prioridad 3: Fallback CBC/3DES al final para equipos legacy
        cipher: [
          'aes256-gcm@openssh.com',
          'chacha20-poly1305@openssh.com',
          'aes256-ctr',
          'aes192-ctr',
          'aes128-gcm@openssh.com',
          'aes128-ctr',
          'aes256-gcm',
          'aes128-gcm',
          'aes256-cbc',
          'aes192-cbc',
          'aes128-cbc',
          '3des-cbc'
        ],
        serverHostKey: [
          'ssh-ed25519',
          'ecdsa-sha2-nistp256',
          'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521',
          'rsa-sha2-512',
          'rsa-sha2-256',
          'ssh-rsa',
          'ssh-dss'
        ],
        hmac: [
          'hmac-sha2-512-etm@openssh.com',
          'hmac-sha2-256-etm@openssh.com',
          'hmac-sha2-512',
          'hmac-sha2-256',
          'hmac-sha1-etm@openssh.com',
          'hmac-sha1'
        ],
        compress: ['none']
      };

  // Filtrar contra los algoritmos soportados por el runtime actual (OpenSSL vs Electron BoringSSL)
  return {
    kex: filterSupported(raw.kex, ssh2Constants?.SUPPORTED_KEX),
    cipher: filterSupported(raw.cipher, ssh2Constants?.SUPPORTED_CIPHER),
    serverHostKey: filterSupported(raw.serverHostKey, ssh2Constants?.SUPPORTED_SERVER_HOST_KEY),
    hmac: filterSupported(raw.hmac, ssh2Constants?.SUPPORTED_MAC),
    compress: raw.compress
  };
}

function getRequestedForwarding(config) {
  if (!config) {
    return { x11: false, agent: false, requested: false };
  }

  return {
    x11: !!config.x11Forwarding,
    agent: !!config.agentForwarding,
    requested: !!(config.x11Forwarding || config.agentForwarding)
  };
}

function getEffectiveForwarding(config) {
  const requested = getRequestedForwarding(config);
  if (isWallixBastion(config)) {
    return { x11: false, agent: false, requested: requested.requested };
  }

  return {
    x11: requested.x11,
    agent: requested.agent,
    requested: requested.requested
  };
}

function resolveSshAgentPath() {
  if (process.env.SSH_AUTH_SOCK) {
    try {
      if (fs.existsSync(process.env.SSH_AUTH_SOCK)) {
        return process.env.SSH_AUTH_SOCK;
      }
    } catch (_) { /* noop */ }
  }

  if (process.platform === 'win32') {
    const winPipe = '\\\\.\\pipe\\openssh-ssh-agent';
    try {
      if (fs.existsSync(winPipe)) {
        return winPipe;
      }
    } catch (_) { /* noop */ }
  }

  return undefined;
}

function parseDisplayEndpoint(displayValue) {
  const display = (displayValue || process.env.DISPLAY || 'localhost:0.0').trim();
  const match = display.match(/^(?:unix|localhost:)?([^:]+):(\d+)(?:\.(\d+))?$/i);

  if (!match) {
    return { host: '127.0.0.1', port: 6000 };
  }

  const host = match[1] === 'localhost' ? '127.0.0.1' : match[1];
  const displayNumber = Number.parseInt(match[2], 10);
  const screen = Number.parseInt(match[3] || '0', 10);

  return {
    host,
    port: 6000 + (Number.isFinite(displayNumber) ? displayNumber : 0) + (Number.isFinite(screen) ? screen : 0)
  };
}

function setupX11ForwardingListener(ssh2Client) {
  if (!ssh2Client || typeof ssh2Client.on !== 'function') {
    return;
  }

  ssh2Client.on('x11', (info, accept, reject) => {
    const { host, port } = parseDisplayEndpoint(process.env.DISPLAY);
    const xServerSocket = net.createConnection({ host, port }, () => {
      const xClientSocket = accept();
      if (!xClientSocket) {
        xServerSocket.destroy();
        return;
      }

      xClientSocket.pipe(xServerSocket).pipe(xClientSocket);
    });

    xServerSocket.on('error', () => {
      if (typeof reject === 'function') {
        reject();
      }
    });
  });
}

function normalizeHostKeyPolicy(policy) {
  if (policy === 'strict' || policy === 'known_hosts' || policy === 'warn_new' || policy === 'accept-new') {
    return policy;
  }
  return 'warn_new';
}

function isProxyJumpEnabled(config) {
  return !!(config && config.proxyJumpEnabled && config.jumpHost && config.jumpUser && !isWallixBastion(config));
}

function applyHostKeyPolicy(connectConfig, host, port, config, context = {}) {
  if (isWallixBastion(config)) {
    return connectConfig;
  }

  const { knownHostsService, notify } = context;
  if (!knownHostsService || typeof knownHostsService.createHostVerifier !== 'function') {
    return connectConfig;
  }

  let algorithms = connectConfig.algorithms;
  if (typeof knownHostsService.lookup === 'function') {
    try {
      const existing = knownHostsService.lookup(host, port || 22);
      if (existing && existing.keyType && algorithms) {
        algorithms = prioritizeKnownHostKeyAlgorithms(algorithms, existing.keyType);
      }
    } catch (_) { /* noop */ }
  }

  const policy = normalizeHostKeyPolicy(config.hostKeyPolicy);
  return {
    ...connectConfig,
    ...(algorithms ? { algorithms } : {}),
    // Sin hostHash: ssh2 entrega la clave publica en bruto (Buffer). Con hostHash,
    // ssh2 hashea en hex y no coincide con las huellas base64 de known_hosts.
    hostVerifier: knownHostsService.createHostVerifier(
      host,
      port || 22,
      policy,
      typeof notify === 'function' ? notify : () => {}
    )
  };
}

function buildSshConnectOptions(config, options = {}) {
  const { includePassword = false, interactive = false, knownHostsService, notify } = options;
  const forwarding = getEffectiveForwarding(config);
  const agentPath = resolveSshAgentPath();

  const connectConfig = applyHostKeyPolicy({
    host: config.host,
    username: config.username,
    port: config.port || 22,
    reconnect: false,
    algorithms: buildSshAlgorithms(config)
  }, config.host, config.port || 22, config, { knownHostsService, notify });

  if (interactive) {
    connectConfig.tryKeyboard = true;
    connectConfig.readyTimeout = 30000;
    connectConfig.keepaliveInterval = 30000;
    connectConfig.keepaliveCountMax = 3;
  }

  if (config.privateKey && String(config.privateKey).trim()) {
    connectConfig.privateKey = config.privateKey;
    if (config.passphrase && String(config.passphrase).trim()) {
      connectConfig.passphrase = config.passphrase;
    }
  }

  if (includePassword && config.password && config.password.trim()) {
    connectConfig.password = config.password;
  } else if (!interactive && config.password && config.password.trim()) {
    connectConfig.password = config.password;
  } else if (!interactive && !config.password?.trim()) {
    connectConfig.tryKeyboard = true;
  }

  if (forwarding.agent) {
    if (agentPath) {
      connectConfig.agentForward = true;
      connectConfig.agent = agentPath;
    }
  } else if (agentPath) {
    connectConfig.agent = agentPath;
  }

  return {
    connectConfig,
    forwarding,
    agentPath,
    agentForwardingRequestedButUnavailable: forwarding.agent && !agentPath
  };
}

function buildShellOptions(config, overrides = {}) {
  const shellOptions = {
    term: 'xterm-256color',
    cols: 80,
    rows: 24,
    ...overrides
  };

  if (getEffectiveForwarding(config).x11) {
    shellOptions.x11 = true;
  }

  return shellOptions;
}

function appendForwardingFlagsToCacheKey(cacheKey, config) {
  let nextKey = cacheKey;
  const forwarding = getRequestedForwarding(config);
  if (forwarding.requested) {
    const parts = [];
    if (forwarding.x11) parts.push('x11');
    if (forwarding.agent) parts.push('agent');
    nextKey = `${nextKey}|fwd:${parts.join('+')}`;
  }

  if (isProxyJumpEnabled(config)) {
    nextKey = `${nextKey}|jump:${config.jumpUser}@${config.jumpHost}:${config.jumpPort || 22}`;
  }

  const policy = normalizeHostKeyPolicy(config.hostKeyPolicy);
  if (!isWallixBastion(config) && policy !== 'warn_new') {
    nextKey = `${nextKey}|hostkey:${policy}`;
  }

  if (isLegacyCompatibility(config)) {
    nextKey = `${nextKey}|legacy:1`;
  }

  return nextKey;
}

function requiresDedicatedSshSession(config) {
  // persistSession fuerza el camino dedicado (SSHAuthService + tmux),
  // no el pool ssh2-promise que solo hace shell() normal.
  return getEffectiveForwarding(config).requested
    || isProxyJumpEnabled(config)
    || shouldUseTmuxPersist(config);
}

function getBastionForwardingWarning(config) {
  if (!isWallixBastion(config)) {
    return null;
  }

  const requested = getRequestedForwarding(config);
  if (!requested.requested) {
    return null;
  }

  return 'El reenvío X11/Agent no se aplica en conexiones Bastion/Wallix en esta versión.';
}

module.exports = {
  isWallixBastion,
  isLegacyCompatibility,
  isHandshakeOrKexError,
  prioritizeKnownHostKeyAlgorithms,
  buildSshAlgorithms,
  PQC_KEX_ALGORITHMS,
  normalizeHostKeyPolicy,
  isProxyJumpEnabled,
  applyHostKeyPolicy,
  getRequestedForwarding,
  getEffectiveForwarding,
  resolveSshAgentPath,
  parseDisplayEndpoint,
  setupX11ForwardingListener,
  buildSshConnectOptions,
  buildShellOptions,
  appendForwardingFlagsToCacheKey,
  requiresDedicatedSshSession,
  getBastionForwardingWarning
};
