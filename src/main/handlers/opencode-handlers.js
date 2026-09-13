const { createAiCliHandler } = require('../utils/ai-cli-handler-factory');

const openCodeCli = createAiCliHandler({
  channelPrefix: 'opencode',
  configFileName: 'opencode-config.json',
  npmPackage: 'opencode-ai',
  binaryNamesWin: ['opencode.cmd', 'opencode.exe', 'opencode'],
  binaryNamesUnix: ['opencode']
});

module.exports = {
  registerOpenCodeHandlers: openCodeCli.registerHandlers,
  getOpenCodeConfig: openCodeCli.getConfig
};
