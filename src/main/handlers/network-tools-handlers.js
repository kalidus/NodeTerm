/**
 * Network Tools Handlers - Handlers IPC para herramientas de red y seguridad
 * 
 * Expone las funcionalidades del NetworkToolsService al proceso renderer
 */

const { ipcMain, dialog, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
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

  // === PING ===
  ipcMain.handle('network-tools:ping', async (event, { host, count = 4, timeout = 5 }) => {
    try {
      if (!host) {
        return { success: false, error: 'Host es requerido' };
      }
      const service = getService();
      
      // Callback para enviar actualizaciones en tiempo real
      const onProgress = (data) => {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('network-tools:progress', { tool: 'ping', data });
        }
      };
      
      const result = await service.ping(host, count, timeout, onProgress);
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
      
      // Callback para enviar actualizaciones en tiempo real
      const onProgress = (data) => {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('network-tools:progress', { tool: 'port-scan', data });
        }
      };
      
      const result = await service.portScan(host, ports, timeout, onProgress);
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
      
      // Callback para enviar actualizaciones en tiempo real
      const onProgress = (data) => {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('network-tools:progress', { tool: 'whois', data });
        }
      };
      
      const result = await service.whois(domain, onProgress);
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
      
      // Callback para enviar actualizaciones en tiempo real
      const onProgress = (data) => {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('network-tools:progress', { tool: 'traceroute', data });
        }
      };
      
      const result = await service.traceroute(host, maxHops, onProgress);
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

  // === RESOLVE MAC TO IP (ARP) ===
  ipcMain.handle('network-tools:resolve-mac-ip', async (event, { mac }) => {
    try {
      if (!mac) {
        return { success: false, error: 'MAC es requerida' };
      }
      const service = getService();
      const result = await service.findIpByMac(mac);
      return result;
    } catch (err) {
      console.error('[network-tools:resolve-mac-ip] Error:', err);
      return { success: false, error: err?.message || 'Error al resolver MAC' };
    }
  });

  // === NETWORK SCAN ===
  ipcMain.handle('network-tools:network-scan', async (event, { subnet, timeout = 1000, mode = 'full', pingTimeout, concurrency, portsToScan, nmapEnabled, netbiosEnabled }) => {
    try {
      if (!subnet) {
        return { success: false, error: 'Subred es requerida' };
      }
      const service = getService();
      const scanMode = mode === 'quick' ? 'quick' : 'full';
      const scanTimeout = typeof timeout === 'number'
        ? timeout
        : (scanMode === 'quick' ? 400 : 1000);
      
      // Callback para enviar actualizaciones en tiempo real
      const onProgress = (data) => {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('network-tools:progress', { tool: 'network-scan', data });
        }
      };
      
      const result = await service.networkScan(subnet, scanTimeout, onProgress, { 
        mode: scanMode,
        pingTimeout,
        concurrency,
        portsToScan,
        nmapEnabled,
        netbiosEnabled
      });
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:network-scan] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido' };
    }
  });

  // === HOST VULNERABILITY SCAN ===
  ipcMain.handle('network-tools:host-vuln-scan', async (event, { host, ports, timeout = 5000, useOnline = true }) => {
    try {
      if (!host) {
        return { success: false, error: 'Host es requerido' };
      }
      const service = getService();
      
      // Callback para enviar actualizaciones en tiempo real
      const onProgress = (data) => {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('network-tools:progress', { tool: 'host-vuln-scan', data });
        }
      };
      
      const result = await service.hostVulnScan(host, ports, timeout, useOnline, onProgress);
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:host-vuln-scan] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido al ejecutar el escaneo de vulnerabilidades' };
    }
  });

  // === WEB SECURITY SCAN ===
  ipcMain.handle('network-tools:web-security-scan', async (event, { url, timeout = 10000 }) => {
    try {
      if (!url) {
        return { success: false, error: 'URL es requerida' };
      }
      const service = getService();
      
      // Callback para enviar actualizaciones en tiempo real
      const onProgress = (data) => {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('network-tools:progress', { tool: 'web-security-scan', data });
        }
      };
      
      const result = await service.webSecurityScan(url, timeout, onProgress);
      if (!result || typeof result !== 'object') {
        return { success: false, error: 'Respuesta inválida del servicio' };
      }
      return result;
    } catch (err) {
      console.error('[network-tools:web-security-scan] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido al ejecutar el análisis de seguridad web' };
    }
  });

  // === GET RECENT CRITICAL VULNERABILITIES ===
  ipcMain.handle('network-tools:get-recent-vulns', async (event, { years, minScore, days }) => {
    try {
      const service = getService();
      const result = await service.getRecentCriticalVulns(years, minScore, days);
      return result;
    } catch (err) {
      console.error('[network-tools:get-recent-vulns] Error:', err);
      return { success: false, error: err?.message || 'Error al obtener vulnerabilidades' };
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

  // ── CVSS: Guardar reporte HTML ────────────────────────────────────────────
  ipcMain.handle('network-tools:save-cvss-report-html', async (event, { html, suggestedName }) => {
    try {
      const focusedWin = BrowserWindow.getFocusedWindow();
      const { canceled, filePath } = await dialog.showSaveDialog(focusedWin, {
        title: 'Guardar reporte CVSS (HTML)',
        defaultPath: suggestedName || 'cvss-report.html',
        filters: [{ name: 'HTML', extensions: ['html'] }]
      });
      if (canceled || !filePath) return { success: false, error: 'Operación cancelada.' };
      fs.writeFileSync(filePath, html, 'utf-8');
      return { success: true, filePath };
    } catch (err) {
      console.error('[network-tools:save-cvss-report-html]', err);
      return { success: false, error: err?.message || 'Error al guardar el reporte HTML.' };
    }
  });

  // ── CVSS: Guardar reporte PDF ─────────────────────────────────────────────
  ipcMain.handle('network-tools:save-cvss-report-pdf', async (event, { html, suggestedName }) => {
    let pdfWin = null;
    try {
      const focusedWin = BrowserWindow.getFocusedWindow();
      const { canceled, filePath } = await dialog.showSaveDialog(focusedWin, {
        title: 'Guardar reporte CVSS (PDF)',
        defaultPath: suggestedName || 'cvss-report.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (canceled || !filePath) return { success: false, error: 'Operación cancelada.' };

      pdfWin = new BrowserWindow({ show: false, webPreferences: { javascript: false } });
      const dataUrl = `data:text/html;charset=utf-8;base64,${Buffer.from(html, 'utf-8').toString('base64')}`;
      await pdfWin.loadURL(dataUrl);

      const pdfBuffer = await pdfWin.webContents.printToPDF({
        marginsType: 1,
        printBackground: true,
        pageSize: 'A4',
        landscape: false
      });

      fs.writeFileSync(filePath, pdfBuffer);
      return { success: true, filePath };
    } catch (err) {
      console.error('[network-tools:save-cvss-report-pdf]', err);
      return { success: false, error: err?.message || 'Error al guardar el reporte PDF.' };
    } finally {
      if (pdfWin && !pdfWin.isDestroyed()) pdfWin.destroy();
    }
  });
}

module.exports = {
  registerNetworkToolsHandlers
};
