const ClaudeProcessManager = require('./ClaudeProcessManager');

function setDependencies({ mainWindow, getPty, isAppQuitting, getClaudeConfig }) {
  ClaudeProcessManager.initialize({
    mainWindow,
    getPty,
    isAppQuitting,
    getClaudeConfig
  });
}

const ClaudeHandlers = {
  start: (tabId, { cols, rows }) => ClaudeProcessManager.startClaudeSession(tabId, { cols, rows }),
  data: (tabId, data) => ClaudeProcessManager.writeToClaude(tabId, data),
  resize: (tabId, { cols, rows }) => ClaudeProcessManager.resizeClaude(tabId, { cols, rows }),
  stop: (tabId) => ClaudeProcessManager.stopClaude(tabId)
};

module.exports = {
  setDependencies,
  ClaudeHandlers,
  cleanup: () => ClaudeProcessManager.cleanup()
};
