const { createAiCliHandler } = require('../utils/ai-cli-handler-factory');

const claudeCli = createAiCliHandler({
  channelPrefix: 'claude',
  configFileName: 'claude-config.json',
  securityKeyField: 'claudeAuthToken',
  securityKeyOutputName: 'authToken',
  npmPackage: '@anthropic-ai/claude-code',
  binaryNamesWin: ['claude.cmd', 'claude.exe', 'claude'],
  binaryNamesUnix: ['claude'],
  hasDefaultModel: true
});

module.exports = {
  registerClaudeHandlers: claudeCli.registerHandlers,
  getClaudeConfig: claudeCli.getConfig
};
