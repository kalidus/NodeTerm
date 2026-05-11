function buildJumpConfig(config, buildSshConnectOptions, applyHostKeyPolicy) {
  const jumpConfig = {
    host: config.jumpHost,
    username: config.jumpUser,
    port: config.jumpPort || 22
  };

  const jumpAuthMethod = config.jumpAuthMethod || 'password';
  if (jumpAuthMethod === 'key' && config.jumpPrivateKey?.trim()) {
    jumpConfig.privateKey = config.jumpPrivateKey;
  } else if (config.jumpPassword?.trim()) {
    jumpConfig.password = config.jumpPassword;
  } else {
    jumpConfig.tryKeyboard = true;
  }

  return applyHostKeyPolicy(jumpConfig, config.jumpHost, config.jumpPort || 22, config);
}

function buildTargetConfig(config, buildSshConnectOptions, applyHostKeyPolicy) {
  const built = buildSshConnectOptions(config);
  const targetConfig = {
    ...built.connectConfig,
    host: config.host,
    username: config.username,
    port: config.port || 22
  };

  return applyHostKeyPolicy(targetConfig, config.host, config.port || 22, config);
}

function connectViaProxyJump({
  config,
  Client,
  buildSshConnectOptions,
  applyHostKeyPolicy
}) {
  return new Promise((resolve, reject) => {
    const jumpClient = new Client();
    const targetClient = new Client();
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        targetClient.end();
      } catch (e) { /* noop */ }
      try {
        jumpClient.end();
      } catch (e) { /* noop */ }
      reject(error);
    };

    const succeed = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve({ jumpClient, targetClient });
    };

    targetClient.on('ready', succeed);
    targetClient.on('error', fail);
    jumpClient.on('error', fail);

    jumpClient.on('ready', () => {
      jumpClient.forwardOut(
        '127.0.0.1',
        0,
        config.host,
        config.port || 22,
        (err, stream) => {
          if (err) {
            fail(err);
            return;
          }

          const targetConfig = buildTargetConfig(config, buildSshConnectOptions, applyHostKeyPolicy);
          targetConfig.sock = stream;
          delete targetConfig.host;
          targetClient.connect(targetConfig);
        }
      );
    });

    jumpClient.connect(buildJumpConfig(config, buildSshConnectOptions, applyHostKeyPolicy));
  });
}

module.exports = {
  connectViaProxyJump
};
