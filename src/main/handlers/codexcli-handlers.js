const { createAiCliHandler } = require('../utils/ai-cli-handler-factory');

const codexCli = createAiCliHandler({
  channelPrefix: 'codexcli',
  configFileName: 'codexcli-config.json',
  securityKeyField: 'codexApiKey',
  securityKeyOutputName: 'apiKey',
  npmPackage: '@openai/codex',
  binaryNamesWin: ['codex.cmd', 'codex.exe', 'codex'],
  binaryNamesUnix: ['codex']
});

module.exports = {
  registerCodexCliHandlers: codexCli.registerHandlers,
  getCodexCliConfig: codexCli.getConfig
};
