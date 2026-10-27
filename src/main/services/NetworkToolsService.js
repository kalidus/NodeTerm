/**
 * NetworkToolsService - Servicio de herramientas de red y seguridad
 * 
 * Proporciona funcionalidades de diagnóstico y análisis de red:
 * - Ping, Traceroute
 * - Port Scanner, Network Scanner
 * - DNS Lookup, Reverse DNS
 * - SSL/TLS Checker, HTTP Headers
 * - WHOIS, Subnet Calculator, Wake on LAN
 */

const { exec } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);
const { assertSafeOutboundUrl } = require('../utils/ssrf-guard');

class NetworkToolsService {
  /**
   * Valida URL de herramientas HTTP (permite LAN; bloquea metadata cloud).
   * @private
   */
  _assertHttpToolUrl(url) {
    return assertSafeOutboundUrl(url, {
      allowPrivate: true,
      allowLoopback: true
    });
  }

  constructor() {
    this.platform = process.platform;
    this.commandCache = new Map(); // Cache para comandos disponibles
    this._nmapPathCache = undefined;
    this.nvdCache = new Map(); // Caché para peticiones de NVD
    
    this.nvdCachePath = null;
    try {
      const { getNodeTermDataDir } = require('../utils/file-utils');
      this.nvdCachePath = path.join(getNodeTermDataDir(), 'nvd_vulns_cache.json');
    } catch (e) {
      console.warn('[NetworkToolsService] No se pudo obtener la ruta de datos:', e);
    }
    
    this._loadCache();
  }

  /**
   * Valida si una cadena es una dirección IP válida (IPv4 o IPv6)
   * @param {string} ip
   * @returns {boolean}
   */
  _isValidIp(ip) {
    if (!ip || typeof ip !== 'string') return false;
    return net.isIP(ip.trim()) !== 0;
  }

  /**
   * Carga la caché desde el archivo persistente en disco
   * @private
   */
  _loadCache() {
    if (!this.nvdCachePath) return;
    try {
      if (fs.existsSync(this.nvdCachePath)) {
        const raw = fs.readFileSync(this.nvdCachePath, 'utf8');
        const data = JSON.parse(raw);
        for (const [key, value] of Object.entries(data)) {
          this.nvdCache.set(key, value);
        }
      }
    } catch (error) {
      console.error('[NetworkToolsService:loadCache] Error al cargar la caché persistente:', error);
    }
  }

  /**
   * Guarda la caché en un archivo persistente en disco
   * @private
   */
  _saveCache() {
    if (!this.nvdCachePath) return;
    try {
      const data = {};
      for (const [key, value] of this.nvdCache.entries()) {
        data[key] = value;
      }
      fs.writeFileSync(this.nvdCachePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('[NetworkToolsService:saveCache] Error al guardar la caché persistente:', error);
    }
  }

  /**
   * Verifica si un comando está disponible en el sistema
   * @private
   */
  async _isCommandAvailable(command) {
    if (this.commandCache.has(command)) {
      return this.commandCache.get(command);
    }

    try {
      if (this.platform === 'win32') {
        // En Windows, usar 'where' para verificar comandos
        // where es un comando interno de cmd.exe
        const { stdout } = await execAsync(`where ${command}`, {
          timeout: 2000,
          shell: true
        });
        const isAvailable = stdout && stdout.trim().length > 0 && !stdout.includes('INFO:');
        this.commandCache.set(command, isAvailable);
        return isAvailable;
      } else {
        // En Unix/Linux/macOS, usar 'command -v' (más portable que 'which')
        const { stdout } = await execAsync(`command -v ${command}`, {
          timeout: 2000,
          shell: true
        });
        const isAvailable = stdout && stdout.trim().length > 0;
        this.commandCache.set(command, isAvailable);
        return isAvailable;
      }
    } catch (error) {
      // Si hay error, el comando no está disponible
      this.commandCache.set(command, false);
      return false;
    }
  }

  /**
   * Obtiene el comando correcto según la plataforma
   * @private
   */
  _getCommand(commandName) {
    const commands = {
      ping: {
        win32: 'ping',
        darwin: 'ping',
        linux: 'ping'
      },
      traceroute: {
        win32: 'tracert',
        darwin: 'traceroute',
        linux: 'traceroute'
      },
      whois: {
        win32: 'whois',
        darwin: 'whois',
        linux: 'whois'
      }
    };

    return commands[commandName]?.[this.platform] || commandName;
  }

}

const discoveryScan = require('./network-tools/discovery-scan');
const vulnWeb = require('./network-tools/vuln-web');
const dnsWhois = require('./network-tools/dns-whois');

Object.assign(NetworkToolsService.prototype, discoveryScan, vulnWeb, dnsWhois);

module.exports = NetworkToolsService;
