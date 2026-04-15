const OpenCodeProcessManager = require('./OpenCodeProcessManager');

function setDependencies({ mainWindow, getPty, isAppQuitting, getOpenCodeConfig }) {
  OpenCodeProcessManager.initialize({
    mainWindow,
    getPty,
    isAppQuitting,
    getOpenCodeConfig
  });
}

const OpenCodeHandlers = {
  start: (tabId, { cols, rows }) => OpenCodeProcessManager.startOpenCodeSession(tabId, { cols, rows }),
  data: (tabId, data) => OpenCodeProcessManager.writeToOpenCode(tabId, data),
  resize: (tabId, { cols, rows }) => OpenCodeProcessManager.resizeOpenCode(tabId, { cols, rows }),
  stop: (tabId) => OpenCodeProcessManager.stopOpenCode(tabId)
};

module.exports = {
  setDependencies,
  OpenCodeHandlers,
  cleanup: () => OpenCodeProcessManager.cleanup()
};
