const net = require('net');
const { registerSsh2PqcKex, PQC_KEX_ALGORITHMS } = require('./pqc/registerSsh2PqcKex');

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

function buildSshAlgorithms(config = {}) {
  const isBastion = isWallixBastion(config);

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
          ...(isBastion ? ['diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'] : [])
        ],
        cipher: [
          'aes256-gcm@openssh.com',
          'chacha20-poly1305@openssh.com',
          'aes256-ctr',
          'aes192-ctr',
          'aes128-gcm@openssh.com',
          'aes128-ctr',
          ...(isBastion ? ['aes256-gcm', 'aes128-gcm'] : [])
        ],
        serverHostKey: [
          'ssh-ed25519',
          'ecdsa-sha2-nistp256',
          'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521',
          'rsa-sha2-512',
          'rsa-sha2-256',
          'ssh-rsa',
          ...(isBastion ? ['ssh-dss'] : [])
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
    return process.env.SSH_AUTH_SOCK;
  }

  if (process.platform === 'win32') {
    return '\\\\.\\pipe\\openssh-ssh-agent';
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
  if (policy === 'strict' || policy === 'known_hosts' || policy === 'warn_new') {
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

  const policy = normalizeHostKeyPolicy(config.hostKeyPolicy);
  return {
    ...connectConfig,
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
    port: config.port || 22
  }, config.host, config.port || 22, config, { knownHostsService, notify });

  if (interactive) {
    connectConfig.tryKeyboard = true;
    connectConfig.readyTimeout = 30000;
    connectConfig.keepaliveInterval = 30000;
    connectConfig.keepaliveCountMax = 3;
  }

  connectConfig.algorithms = buildSshAlgorithms(config);

  if (config.privateKey && String(config.privateKey).trim()) {
    connectConfig.privateKey = config.privateKey;
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
  return getEffectiveForwarding(config).requested || isProxyJumpEnabled(config);
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
