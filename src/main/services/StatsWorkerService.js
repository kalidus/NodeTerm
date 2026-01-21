// ============================================
// SERVICIO DE WORKER DE ESTADÍSTICAS DEL SISTEMA
// Gestiona el worker que calcula las estadísticas del sistema
// ============================================

const { fork } = require('child_process');
const path = require('path');

let statsWorker = null;
let statsWorkerReady = false;
let statsWorkerQueue = [];

function startStatsWorker() {
  if (statsWorker) {
    try { statsWorker.kill(); } catch {}
    statsWorker = null;
    statsWorkerReady = false;
  }
  
  statsWorker = fork(path.join(__dirname, '../../../system-stats-worker.js'));
  statsWorkerReady = true;
  
  statsWorker.on('exit', () => {
    statsWorkerReady = false;
    // Reiniciar automáticamente si muere
    setTimeout(startStatsWorker, 1000);
  });
  
  statsWorker.on('message', (msg) => {
    if (statsWorkerQueue.length > 0) {
      const { resolve, timeout } = statsWorkerQueue.shift();
      clearTimeout(timeout);
      if (msg.type === 'stats') {
        resolve(msg.data);
      } else {
        resolve(getFallbackStats('WorkerError'));
      }
    }
  });
}

function getFallbackStats(model = 'NoData') {
  return {
    cpu: { usage: 0, cores: 0, model },
    memory: { used: 0, total: 0, percentage: 0 },
    disks: [],
    network: { download: 0, upload: 0 },
    temperature: { cpu: 0, gpu: 0 }
  };
}

async function getSystemStats() {
  return new Promise((resolve) => {
    if (!statsWorkerReady) {
      // Si el worker no está listo, devolver fallback
      resolve(getFallbackStats('NoWorker'));
      return;
    }
    
    const timeout = setTimeout(() => {
      resolve(getFallbackStats('Timeout'));
    }, 15000); // 15 segundos de timeout
    
    statsWorkerQueue.push({ resolve, timeout });
    
    try {
      statsWorker.send('get-stats');
    } catch (e) {
      clearTimeout(timeout);
      resolve(getFallbackStats('ErrorSend'));
    }
  });
}

function isWorkerReady() {
  return statsWorkerReady;
}

function stopStatsWorker() {
  if (statsWorker) {
    try {
      statsWorker.kill();
    } catch (e) {
      console.error('Error stopping stats worker:', e);
    }
    statsWorker = null;
    statsWorkerReady = false;
  }
}

module.exports = {
  startStatsWorker,
  getSystemStats,
  isWorkerReady,
  stopStatsWorker,
  getFallbackStats
};
