const net = require('net');

function isWallixBastion(config) {
  return !!(config && config.useBastionWallix);
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

function buildSshConnectOptions(config, options = {}) {
  const { includePassword = false, interactive = false } = options;
  const forwarding = getEffectiveForwarding(config);
  const agentPath = resolveSshAgentPath();

  const connectConfig = {
    host: config.host,
    username: config.username,
    port: config.port || 22
  };

  if (interactive) {
    connectConfig.tryKeyboard = true;
    connectConfig.readyTimeout = 30000;
    connectConfig.keepaliveInterval = 30000;
    connectConfig.keepaliveCountMax = 3;
    connectConfig.algorithms = {
      cipher: [
        'aes128-gcm@openssh.com',
        'aes256-gcm@openssh.com',
        'aes128-ctr',
        'aes192-ctr',
        'aes256-ctr'
      ],
      compress: ['none']
    };
  }

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
  const forwarding = getRequestedForwarding(config);
  if (!forwarding.requested) {
    return cacheKey;
  }

  const parts = [];
  if (forwarding.x11) parts.push('x11');
  if (forwarding.agent) parts.push('agent');
  return `${cacheKey}|fwd:${parts.join('+')}`;
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
  getRequestedForwarding,
  getEffectiveForwarding,
  resolveSshAgentPath,
  parseDisplayEndpoint,
  setupX11ForwardingListener,
  buildSshConnectOptions,
  buildShellOptions,
  appendForwardingFlagsToCacheKey,
  getBastionForwardingWarning
};
