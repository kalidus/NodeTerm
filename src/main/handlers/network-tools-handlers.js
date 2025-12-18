/**
 * Network Tools Handlers - Handlers IPC para herramientas de red y seguridad
 * 
 * Expone las funcionalidades del NetworkToolsService al proceso renderer
 */

const { ipcMain } = require('electron');
const NetworkToolsService = require('../services/NetworkToolsService');

// Instancia singleton del servicio
let networkToolsService = null;

/**
 * Obtiene o crea la instancia del servicio
 */
function getService() {
  if (!networkToolsService) {
    networkToolsService = new NetworkToolsService();
  }
  return networkToolsService;
}

/**
 * Registra todos los handlers de herramientas de red
 */
function registerNetworkToolsHandlers() {
  console.log('🌐 [registerNetworkToolsHandlers] Registrando handlers de herramientas de red...');

  // === PING ===
  ipcMain.handle('network-tools:ping', async (event, { host, count = 4, timeout = 5 }) => {
    try {
      if (!host) {
        return { success: false, error: 'Host es requerido' };
      }
      const service = getService();
      return await service.ping(host, count, timeout);
    } catch (err) {
      console.error('[network-tools:ping] Error:', err);
      return { success: false, error: err.message };
    }
  });

  // === PORT SCAN ===
  ipcMain.handle('network-tools:port-scan', async (event, { host, ports = '1-1024', timeout = 2000 }) => {
    try {
      if (!host) {
        return { success: false, error: 'Host es requerido' };
      }
      const service = getService();
      return await service.portScan(host, ports, timeout);
    } catch (err) {
      console.error('[network-tools:port-scan] Error:', err);
      return { success: false, error: err.message };
    }
  });

  // === DNS LOOKUP ===
  ipcMain.handle('network-tools:dns-lookup', async (event, { domain, type = 'A' }) => {
    try {
      if (!domain) {
        return { success: false, error: 'Dominio es requerido' };
      }
      const service = getService();
      return await service.dnsLookup(domain, type);
    } catch (err) {
      console.error('[network-tools:dns-lookup] Error:', err);
      return { success: false, error: err.message };
    }
  });

  // === REVERSE DNS ===
  ipcMain.handle('network-tools:reverse-dns', async (event, { ip }) => {
    try {
      if (!ip) {
        return { success: false, error: 'IP es requerida' };
      }
      const service = getService();
      return await service.reverseDns(ip);
    } catch (err) {
      console.error('[network-tools:reverse-dns] Error:', err);
      return { success: false, error: err.message };
    }
  });

  // === SSL CHECK ===
  ipcMain.handle('network-tools:ssl-check', async (event, { host, port = 443 }) => {
    try {
      if (!host) {
        return { success: false, error: 'Host es requerido' };
      }
      const service = getService();
      return await service.sslCheck(host, port);
    } catch (err) {
      console.error('[network-tools:ssl-check] Error:', err);
      return { success: false, error: err.message };
    }
  });

  // === WHOIS ===
  ipcMain.handle('network-tools:whois', async (event, { domain }) => {
    try {
      if (!domain) {
        return { success: false, error: 'Dominio es requerido' };
      }
      const service = getService();
      return await service.whois(domain);
    } catch (err) {
      console.error('[network-tools:whois] Error:', err);
      return { success: false, error: err.message };
    }
  });

  // === TRACEROUTE ===
  ipcMain.handle('network-tools:traceroute', async (event, { host, maxHops = 30 }) => {
    try {
      if (!host) {
        return { success: false, error: 'Host es requerido' };
      }
      const service = getService();
      return await service.traceroute(host, maxHops);
    } catch (err) {
      console.error('[network-tools:traceroute] Error:', err);
      return { success: false, error: err.message };
    }
  });

  // === HTTP HEADERS ===
  ipcMain.handle('network-tools:http-headers', async (event, { url }) => {
    try {
      if (!url) {
        return { success: false, error: 'URL es requerida' };
      }
      const service = getService();
      return await service.httpHeaders(url);
    } catch (err) {
      console.error('[network-tools:http-headers] Error:', err);
      return { success: false, error: err.message };
    }
  });

  // === SUBNET CALCULATOR ===
  ipcMain.handle('network-tools:subnet-calc', async (event, { cidr }) => {
    try {
      if (!cidr) {
        return { success: false, error: 'CIDR es requerido' };
      }
      const service = getService();
      return service.subnetCalc(cidr);
    } catch (err) {
      console.error('[network-tools:subnet-calc] Error:', err);
      return { success: false, error: err.message };
    }
  });

  // === WAKE ON LAN ===
  ipcMain.handle('network-tools:wake-on-lan', async (event, { mac, broadcast = '255.255.255.255', port = 9 }) => {
    try {
      if (!mac) {
        return { success: false, error: 'Dirección MAC es requerida' };
      }
      const service = getService();
      return await service.wakeOnLan(mac, broadcast, port);
    } catch (err) {
      console.error('[network-tools:wake-on-lan] Error:', err);
      return { success: false, error: err.message };
    }
  });

  // === NETWORK SCAN ===
  ipcMain.handle('network-tools:network-scan', async (event, { subnet, timeout = 1000 }) => {
    try {
      if (!subnet) {
        return { success: false, error: 'Subred es requerida' };
      }
      const service = getService();
      return await service.networkScan(subnet, timeout);
    } catch (err) {
      console.error('[network-tools:network-scan] Error:', err);
      return { success: false, error: err.message };
    }
  });

  // === GET NETWORK INTERFACES ===
  ipcMain.handle('network-tools:get-interfaces', async () => {
    try {
      const service = getService();
      return service.getNetworkInterfaces();
    } catch (err) {
      console.error('[network-tools:get-interfaces] Error:', err);
      return { success: false, error: err.message };
    }
  });

  console.log('✅ [registerNetworkToolsHandlers] Handlers de herramientas de red registrados correctamente');
}

module.exports = {
  registerNetworkToolsHandlers
};
