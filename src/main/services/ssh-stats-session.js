/**
 * Búsqueda de sesiones SSH y sondeo de estadísticas.
 * El bucle real sigue en SSHStatsService; aquí queda el IPC que lo dispara.
 */

function createSshStatsSession({ sshConnections, getMainWindow, sshStatsService }) {
  async function findSSHConnection(tabId, sshConfig = null) {
    if (sshConnections[tabId]) {
      return sshConnections[tabId];
    }

    if (sshConfig && sshConfig.host && sshConfig.username) {
      if (sshConfig.useBastionWallix) {
        for (const conn of Object.values(sshConnections)) {
          if (conn.config &&
            conn.config.useBastionWallix &&
            conn.config.bastionHost === sshConfig.bastionHost &&
            conn.config.bastionUser === sshConfig.bastionUser &&
            conn.config.host === sshConfig.host &&
            conn.config.username === sshConfig.username &&
            (conn.config.port || 22) === (sshConfig.port || 22)) {
            return conn;
          }
        }
      } else {
        for (const conn of Object.values(sshConnections)) {
          if (conn.config &&
            !conn.config.useBastionWallix &&
            conn.config.host === sshConfig.host &&
            conn.config.username === sshConfig.username &&
            (conn.config.port || 22) === (sshConfig.port || 22)) {
            return conn;
          }
        }
      }
    }

    return null;
  }

  async function statsLoop(tabId, realHostname, finalDistroId, host) {
    return sshStatsService.startStatsLoop(
      tabId,
      sshConnections[tabId],
      realHostname,
      finalDistroId,
      host,
      getMainWindow(),
      sshConnections
    );
  }

  function startStatsLoopIfIdle(tabId) {
    const conn = sshConnections[tabId];
    if (!conn || conn.statsTimeout || conn.statsLoopRunning) return;
    if (conn.config && conn.config.useBastionWallix) {
      if (typeof conn.wallixStatsLoop === 'function') {
        conn.wallixStatsLoop();
      }
      return;
    }
    statsLoop(tabId, conn.realHostname || 'unknown', conn.finalDistroId || 'linux', conn.config && conn.config.host);
  }

  function syncSshStatsDemand(tabId) {
    if (sshStatsService.shouldPollStats(tabId)) startStatsLoopIfIdle(tabId);
    else sshStatsService.stopStatsLoop(tabId, sshConnections);
  }

  function register(ipcMain) {
    ipcMain.on('ssh:set-active-stats-tab', (event, tabId) => {
      sshStatsService.setActiveStatsTab(tabId);
      sshStatsService.stopInactiveStatsLoops(sshConnections, tabId);
      startStatsLoopIfIdle(tabId);
    });

    ipcMain.on('ssh:set-pinned-stats-tabs', (event, tabIds) => {
      const { next, removed } = sshStatsService.setPinnedStatsTabs(tabIds);
      removed.forEach((tabId) => {
        if (sshStatsService.shouldPollStats(tabId)) return;
        sshStatsService.stopStatsLoop(tabId, sshConnections);
      });
      next.forEach((tabId) => startStatsLoopIfIdle(tabId));
    });

    ipcMain.on('ssh:set-statusbar-visible', (event, tabId, visible) => {
      sshStatsService.setStatusBarVisible(tabId, visible);
      syncSshStatsDemand(tabId);
    });

    ipcMain.on('ssh:set-monitor-stats', (event, tabId, active) => {
      sshStatsService.setMonitorStatsConsumer(tabId, !!active);
      syncSshStatsDemand(tabId);
    });

    ipcMain.on('statusbar:set-polling-interval', (event, intervalSec) => {
      const sec = Math.max(1, Math.min(20, parseInt(intervalSec, 10) || 3));
      const intervalMs = sec * 1000;
      sshStatsService.setPollingInterval(intervalMs);
      try {
        require('./StatsWorkerService').setStatsBaseInterval(intervalMs);
      } catch (_) { }
    });
  }

  return { findSSHConnection, statsLoop, register };
}

module.exports = { createSshStatsSession };
