const { createAiCliHandler } = require('../utils/ai-cli-handler-factory');

const geminiCli = createAiCliHandler({
  channelPrefix: 'geminicli',
  configFileName: 'geminicli-config.json',
  securityKeyField: 'geminiApiKey',
  securityKeyOutputName: 'apiKey',
  npmPackage: '@google/gemini-cli',
  binaryNamesWin: ['gemini.cmd', 'gemini.exe', 'gemini'],
  binaryNamesUnix: ['gemini']
});

module.exports = {
  registerGeminiCliHandlers: geminiCli.registerHandlers,
  getGeminiCliConfig: geminiCli.getConfig
};
