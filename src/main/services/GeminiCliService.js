const GeminiCliProcessManager = require('./GeminiCliProcessManager');

function setDependencies({ mainWindow, getPty, isAppQuitting, getGeminiCliConfig }) {
  GeminiCliProcessManager.initialize({
    mainWindow,
    getPty,
    isAppQuitting,
    getGeminiCliConfig
  });
}

const GeminiCliHandlers = {
  start: (tabId, { cols, rows }) => GeminiCliProcessManager.startGeminiCliSession(tabId, { cols, rows }),
  data: (tabId, data) => GeminiCliProcessManager.writeToGeminiCli(tabId, data),
  resize: (tabId, { cols, rows }) => GeminiCliProcessManager.resizeGeminiCli(tabId, { cols, rows }),
  stop: (tabId) => GeminiCliProcessManager.stopGeminiCli(tabId)
};

module.exports = {
  setDependencies,
  GeminiCliHandlers,
  cleanup: () => GeminiCliProcessManager.cleanup()
};
