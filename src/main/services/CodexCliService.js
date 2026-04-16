const CodexCliProcessManager = require('./CodexCliProcessManager');

function setDependencies({ mainWindow, getPty, isAppQuitting, getCodexCliConfig }) {
  CodexCliProcessManager.initialize({
    mainWindow,
    getPty,
    isAppQuitting,
    getCodexCliConfig
  });
}

const CodexCliHandlers = {
  start: (tabId, { cols, rows }) => CodexCliProcessManager.startCodexCliSession(tabId, { cols, rows }),
  data: (tabId, data) => CodexCliProcessManager.writeToCodexCli(tabId, data),
  resize: (tabId, { cols, rows }) => CodexCliProcessManager.resizeCodexCli(tabId, { cols, rows }),
  stop: (tabId) => CodexCliProcessManager.stopCodexCli(tabId)
};

module.exports = {
  setDependencies,
  CodexCliHandlers,
  cleanup: () => CodexCliProcessManager.cleanup()
};
