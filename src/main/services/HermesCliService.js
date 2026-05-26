const HermesCliProcessManager = require('./HermesCliProcessManager');

function setDependencies({ mainWindow, getPty, isAppQuitting, getHermesCliConfig }) {
  HermesCliProcessManager.initialize({
    mainWindow,
    getPty,
    isAppQuitting,
    getHermesCliConfig
  });
}

const HermesCliHandlers = {
  start: (tabId, { cols, rows }) => HermesCliProcessManager.startHermesCliSession(tabId, { cols, rows }),
  data: (tabId, data) => HermesCliProcessManager.writeToHermesCli(tabId, data),
  resize: (tabId, { cols, rows }) => HermesCliProcessManager.resizeHermesCli(tabId, { cols, rows }),
  stop: (tabId) => HermesCliProcessManager.stopHermesCli(tabId)
};

module.exports = {
  setDependencies,
  HermesCliHandlers,
  cleanup: () => HermesCliProcessManager.cleanup()
};
