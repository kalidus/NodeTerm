const AntigravityCliProcessManager = require('./AntigravityCliProcessManager');

function setDependencies({ mainWindow, getPty, isAppQuitting, getAntigravityCliConfig }) {
  AntigravityCliProcessManager.initialize({
    mainWindow,
    getPty,
    isAppQuitting,
    getAntigravityCliConfig
  });
}

const AntigravityCliHandlers = {
  start: (tabId, { cols, rows }) => AntigravityCliProcessManager.startAntigravityCliSession(tabId, { cols, rows }),
  data: (tabId, data) => AntigravityCliProcessManager.writeToAntigravityCli(tabId, data),
  resize: (tabId, { cols, rows }) => AntigravityCliProcessManager.resizeAntigravityCli(tabId, { cols, rows }),
  stop: (tabId) => AntigravityCliProcessManager.stopAntigravityCli(tabId)
};

module.exports = {
  setDependencies,
  AntigravityCliHandlers,
  cleanup: () => AntigravityCliProcessManager.cleanup()
};
