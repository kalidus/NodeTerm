/**
 * Handlers para servicios del sistema (historial, estadísticas, etc.)
 * 
 * 🚀 OPTIMIZACIÓN: Estos servicios se inicializan de forma diferida
 * Solo se cargan cuando son necesarios para no bloquear el arranque
 */

const { ipcMain } = require('electron');

// Lazy loading de servicios
let ConnectionHistoryService = null;
let StatsWorkerService = null;
let ConnectionPoolCleaner = null;

let servicesInitialized = false;

/**
 * Inicializa los servicios del sistema de forma diferida
 */
function initializeSystemServices(sshConnectionPool, sshConnections) {
  if (servicesInitialized) return;
  
  try {
    // Connection History Service
    ConnectionHistoryService = require('../services/ConnectionHistoryService');
    ConnectionHistoryService.loadConnectionHistory();
    
    // System Stats Worker
    StatsWorkerService = require('../services/StatsWorkerService');
    StatsWorkerService.startStatsWorker();
    
    // Connection Pool Cleaner
    ConnectionPoolCleaner = require('../services/ConnectionPoolCleaner');
    ConnectionPoolCleaner.startOrphanCleanup(sshConnectionPool, sshConnections);
    
    servicesInitialized = true;
    console.log('✅ [System Services] Servicios del sistema inicializados');
  } catch (error) {
    console.error('❌ [System Services] Error inicializando servicios:', error);
  }
}

/**
 * Registra los handlers de servicios del sistema
 */
function registerSystemServicesHandlers(dependencies) {
  const { sshConnectionPool, sshConnections } = dependencies;
  
  // 🚀 Inicializar servicios de forma diferida
  initializeSystemServices(sshConnectionPool, sshConnections);
  
  // === Connection History Handlers ===
  ipcMain.handle('get-connection-history', async () => {
    if (!ConnectionHistoryService) {
      ConnectionHistoryService = require('../services/ConnectionHistoryService');
    }
    return ConnectionHistoryService.getConnectionHistory();
  });
  
  ipcMain.handle('add-connection-to-history', async (event, connection) => {
    if (!ConnectionHistoryService) {
      ConnectionHistoryService = require('../services/ConnectionHistoryService');
    }
    ConnectionHistoryService.addToConnectionHistory(connection);
    return true;
  });
  
  ipcMain.handle('toggle-favorite-connection', async (event, connectionId) => {
    if (!ConnectionHistoryService) {
      ConnectionHistoryService = require('../services/ConnectionHistoryService');
    }
    return ConnectionHistoryService.toggleFavoriteConnection(connectionId);
  });
  
  // === System Stats Handler ===
  // ⚠️ NOTA: get-system-stats ya se registra en registerCriticalHandlers()
  // porque TODOS los componentes del frontend lo necesitan inmediatamente
  
  console.log('✅ [System Services Handlers] Registrados');
}

module.exports = {
  registerSystemServicesHandlers,
  initializeSystemServices
};
