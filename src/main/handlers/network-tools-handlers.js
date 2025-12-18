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
      const result = await service.ping(host, count, timeout);
      // Asegurar que siempre devolvemos un objeto válido
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:ping] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido al ejecutar ping' };
    }
  });

  // === PORT SCAN ===
  ipcMain.handle('network-tools:port-scan', async (event, { host, ports = '1-1024', timeout = 2000 }) => {
    try {
      if (!host) {
        return { success: false, error: 'Host es requerido' };
      }
      const service = getService();
      const result = await service.portScan(host, ports, timeout);
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:port-scan] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido' };
    }
  });

  // === DNS LOOKUP ===
  ipcMain.handle('network-tools:dns-lookup', async (event, { domain, type = 'A' }) => {
    try {
      if (!domain) {
        return { success: false, error: 'Dominio es requerido' };
      }
      const service = getService();
      const result = await service.dnsLookup(domain, type);
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:dns-lookup] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido' };
    }
  });

  // === REVERSE DNS ===
  ipcMain.handle('network-tools:reverse-dns', async (event, { ip }) => {
    try {
      if (!ip) {
        return { success: false, error: 'IP es requerida' };
      }
      const service = getService();
      const result = await service.reverseDns(ip);
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:reverse-dns] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido' };
    }
  });

  // === SSL CHECK ===
  ipcMain.handle('network-tools:ssl-check', async (event, { host, port = 443 }) => {
    try {
      if (!host) {
        return { success: false, error: 'Host es requerido' };
      }
      const service = getService();
      const result = await service.sslCheck(host, port);
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:ssl-check] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido' };
    }
  });

  // === WHOIS ===
  ipcMain.handle('network-tools:whois', async (event, { domain }) => {
    try {
      if (!domain) {
        return { success: false, error: 'Dominio es requerido' };
      }
      const service = getService();
      const result = await service.whois(domain);
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:whois] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido' };
    }
  });

  // === TRACEROUTE ===
  ipcMain.handle('network-tools:traceroute', async (event, { host, maxHops = 30 }) => {
    try {
      if (!host) {
        return { success: false, error: 'Host es requerido' };
      }
      const service = getService();
      const result = await service.traceroute(host, maxHops);
      // Asegurar que siempre devolvemos un objeto válido
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:traceroute] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido al ejecutar traceroute' };
    }
  });

  // === HTTP HEADERS ===
  ipcMain.handle('network-tools:http-headers', async (event, { url }) => {
    try {
      if (!url) {
        return { success: false, error: 'URL es requerida' };
      }
      const service = getService();
      const result = await service.httpHeaders(url);
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:http-headers] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido' };
    }
  });

  // === SUBNET CALCULATOR ===
  ipcMain.handle('network-tools:subnet-calc', async (event, { cidr }) => {
    try {
      if (!cidr) {
        return { success: false, error: 'CIDR es requerido' };
      }
      const service = getService();
      const result = service.subnetCalc(cidr);
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:subnet-calc] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido' };
    }
  });

  // === WAKE ON LAN ===
  ipcMain.handle('network-tools:wake-on-lan', async (event, { mac, broadcast = '255.255.255.255', port = 9 }) => {
    try {
      if (!mac) {
        return { success: false, error: 'Dirección MAC es requerida' };
      }
      const service = getService();
      const result = await service.wakeOnLan(mac, broadcast, port);
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:wake-on-lan] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido' };
    }
  });

  // === NETWORK SCAN ===
  ipcMain.handle('network-tools:network-scan', async (event, { subnet, timeout = 1000 }) => {
    try {
      if (!subnet) {
        return { success: false, error: 'Subred es requerida' };
      }
      const service = getService();
      const result = await service.networkScan(subnet, timeout);
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:network-scan] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido' };
    }
  });

  // === GET NETWORK INTERFACES ===
  ipcMain.handle('network-tools:get-interfaces', async () => {
    try {
      const service = getService();
      const result = service.getNetworkInterfaces();
      
      // Asegurar que siempre devolvemos un objeto válido
      if (!result || typeof result !== 'object') {
        console.error('[network-tools:get-interfaces] Respuesta inválida del servicio:', result);
        return { success: false, error: 'Respuesta inválida del servicio', interfaces: [] };
      }
      
      // Asegurar que interfaces es un array
      if (!Array.isArray(result.interfaces)) {
        console.warn('[network-tools:get-interfaces] interfaces no es un array, convirtiendo...');
        result.interfaces = [];
      }
      
      // Si el servicio devolvió un error, devolverlo tal cual
      if (result.success === false) {
        return result;
      }
      
      // Asegurar que success es true si llegamos aquí
      result.success = true;
      
      return result;
    } catch (err) {
      console.error('[network-tools:get-interfaces] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido', interfaces: [] };
    }
  });

  console.log('✅ [registerNetworkToolsHandlers] Handlers de herramientas de red registrados correctamente');
}

module.exports = {
  registerNetworkToolsHandlers
};
