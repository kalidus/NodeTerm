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

const { exec, spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const dns = require('dns').promises;
const tls = require('tls');
const https = require('https');
const http = require('http');
const dgram = require('dgram');
const os = require('os');
const { promisify } = require('util');

const execAsync = promisify(exec);

class NetworkToolsService {
  constructor() {
    this.platform = process.platform;
    this.commandCache = new Map(); // Cache para comandos disponibles
    this._nmapPathCache = undefined;
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

  /**
   * Ping a host with statistics
   * @param {string} host - Host or IP to ping
   * @param {number} count - Number of pings (default: 4)
   * @param {number} timeout - Timeout in seconds (default: 5)
   * @param {Function} onProgress - Callback para actualizaciones en tiempo real (data: string)
   * @returns {Promise<Object>} Ping results
   */
  async ping(host, count = 4, timeout = 5, onProgress = null) {
    return new Promise(async (resolve) => {
      if (!host || typeof host !== 'string') {
        return resolve({ success: false, error: 'Host inválido' });
      }

      const sanitizedHost = host.trim().replace(/[;&|`$]/g, '');
      let command;
      let args;

      // Verificar disponibilidad del comando ping
      const pingCmd = this._getCommand('ping');
      const isAvailable = await this._isCommandAvailable(pingCmd);
      
      if (!isAvailable) {
        return resolve({ 
          success: false, 
          error: `El comando 'ping' no está disponible en esta plataforma (${this.platform}). Por favor, instálalo o usa una alternativa.` 
        });
      }

      if (this.platform === 'win32') {
        command = 'ping';
        args = ['-n', count.toString(), '-w', (timeout * 1000).toString(), sanitizedHost];
      } else if (this.platform === 'darwin') {
        // macOS
        command = 'ping';
        args = ['-c', count.toString(), '-W', (timeout * 1000).toString(), sanitizedHost];
      } else {
        // Linux y otros Unix
        command = 'ping';
        args = ['-c', count.toString(), '-W', timeout.toString(), sanitizedHost];
      }

      const startTime = Date.now();
      const results = {
        success: false,
        host: sanitizedHost,
        sent: count,
        received: 0,
        lost: 0,
        lossPercent: 100,
        times: [],
        min: null,
        max: null,
        avg: null,
        rawOutput: '',
        error: null
      };

      const child = spawn(command, args, { timeout: (timeout * count + 5) * 1000 });
      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        // Enviar actualización en tiempo real si hay callback
        if (onProgress && typeof onProgress === 'function') {
          onProgress(dataStr);
        }
      });

      child.stderr.on('data', (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        // Enviar actualización en tiempo real si hay callback
        if (onProgress && typeof onProgress === 'function') {
          onProgress(dataStr);
        }
      });

      child.on('close', (code) => {
        results.rawOutput = output;
        results.duration = Date.now() - startTime;

        // Parse output based on platform
        if (this.platform === 'win32') {
          // Windows ping output parsing - múltiples formatos posibles
          // Formato 1: tiempo=XXms o time=XXms
          // Formato 2: tiempo<XXms o time<XXms
          const timePatterns = [
            /tiempo[=<](\d+)\s*ms/gi,
            /time[=<](\d+)\s*ms/gi,
            /(\d+)\s*ms\s*TTL/gi,
            /TTL[=\s]+(\d+).*?(\d+)\s*ms/gi
          ];
          
          for (const pattern of timePatterns) {
            const matches = output.match(pattern);
            if (matches && matches.length > 0) {
              results.times = matches.map(m => {
                const numMatch = m.match(/\d+/);
                return numMatch ? parseInt(numMatch[0]) : null;
              }).filter(t => t !== null);
              if (results.times.length > 0) {
                results.received = results.times.length;
                break;
              }
            }
          }

          // Estadísticas de Windows
          // Buscar "Paquetes: enviados = X, recibidos = Y, perdidos = Z"
          const statsPatterns = [
            /Paquetes[:\s]+enviados\s*=\s*(\d+)[,\s]+recibidos\s*=\s*(\d+)[,\s]+perdidos\s*=\s*(\d+)/i,
            /Packets[:\s]+Sent\s*=\s*(\d+)[,\s]+Received\s*=\s*(\d+)[,\s]+Lost\s*=\s*(\d+)/i,
            /(\d+)\s*enviados[,\s]+(\d+)\s*recibidos/i,
            /(\d+)\s*sent[,\s]+(\d+)\s*received/i
          ];

          for (const pattern of statsPatterns) {
            const match = output.match(pattern);
            if (match) {
              results.sent = parseInt(match[1]) || results.sent;
              results.received = parseInt(match[2]) || results.received;
              if (match[3]) {
                results.lost = parseInt(match[3]);
              }
              break;
            }
          }

          // Tiempo promedio
          const avgPatterns = [
            /Media\s*=\s*(\d+)\s*ms/i,
            /Average\s*=\s*(\d+)\s*ms/i,
            /Tiempo\s+promedio[:\s]+(\d+)\s*ms/i
          ];

          for (const pattern of avgPatterns) {
            const match = output.match(pattern);
            if (match) {
              results.avg = parseInt(match[1]);
              break;
            }
          }

          // Si no encontramos estadísticas, calcular desde los tiempos
          if (results.times.length > 0 && results.received === 0) {
            results.received = results.times.length;
          }
        } else {
          // Linux/macOS ping output parsing
          // macOS puede usar formato diferente: "time=XX.XXX ms" o "time<XX ms"
          const timePatterns = [
            /time[=<](\d+\.?\d*)\s*ms/gi,
            /time=(\d+\.?\d*)\s*ms/gi,
            /(\d+\.?\d*)\s*ms/gi
          ];
          
          for (const pattern of timePatterns) {
            const matches = output.match(pattern);
            if (matches && matches.length > 0) {
              results.times = matches.map(m => {
                const numMatch = m.match(/[\d.]+/);
                return numMatch ? parseFloat(numMatch[0]) : null;
              }).filter(t => t !== null);
              if (results.times.length > 0) {
                results.received = results.times.length;
                break;
              }
            }
          }

          // Estadísticas de paquetes
          const statsPatterns = [
            /(\d+)\s*packets?\s*transmitted[,\s]+(\d+)\s*(?:packets?\s*)?received/i,
            /(\d+)\s*packets?\s*transmitted[,\s]+(\d+)\s*received/i,
            /(\d+)\s*transmitted[,\s]+(\d+)\s*received/i
          ];

          for (const pattern of statsPatterns) {
            const match = output.match(pattern);
            if (match) {
              results.sent = parseInt(match[1]);
              results.received = parseInt(match[2]);
              break;
            }
          }

          // RTT statistics (Linux y algunos macOS)
          const rttPatterns = [
            /rtt\s+min\/avg\/max\/\w+\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/i,
            /round-trip\s+min\/avg\/max\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/i,
            /min\/avg\/max\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/i
          ];

          for (const pattern of rttPatterns) {
            const rttMatch = output.match(pattern);
            if (rttMatch) {
              results.min = parseFloat(rttMatch[1]);
              results.avg = parseFloat(rttMatch[2]);
              results.max = parseFloat(rttMatch[3]);
              break;
            }
          }
        }

        // Calculate statistics
        if (results.times.length > 0) {
          results.min = results.min || Math.min(...results.times);
          results.max = results.max || Math.max(...results.times);
          results.avg = results.avg || (results.times.reduce((a, b) => a + b, 0) / results.times.length);
        }

        results.lost = results.sent - results.received;
        results.lossPercent = results.sent > 0 ? Math.round((results.lost / results.sent) * 100) : 100;
        results.success = results.received > 0;

        if (errorOutput && !results.success) {
          results.error = errorOutput.trim();
        }

        resolve(results);
      });

      child.on('error', (err) => {
        console.error('[NetworkToolsService] Error en ping:', err);
        if (err.code === 'ENOENT') {
          results.error = `El comando 'ping' no se encontró. Por favor, asegúrate de que está instalado y disponible en tu PATH.`;
        } else {
          results.error = err.message || 'Error ejecutando ping';
        }
        results.success = false;
        resolve(results);
      });

      // Timeout de seguridad
      setTimeout(() => {
        if (child && !child.killed) {
          child.kill();
          if (!results.rawOutput) {
            results.error = 'Timeout: El comando ping excedió el tiempo máximo';
            results.success = false;
            resolve(results);
          }
        }
      }, (timeout * count + 10) * 1000);
    });
  }

  /**
   * Scan ports on a host
   * @param {string} host - Host to scan
   * @param {string|Array} ports - Ports to scan (e.g., "80,443" or "1-1024" or [80, 443])
   * @param {number} timeout - Timeout per port in ms (default: 2000)
   * @returns {Promise<Object>} Scan results
   */
  async portScan(host, ports = '1-1024', timeout = 2000, onProgress = null) {
    if (!host || typeof host !== 'string') {
      return { success: false, error: 'Host inválido' };
    }

    const sanitizedHost = host.trim();
    const portList = this._parsePorts(ports);

    if (portList.length === 0) {
      return { success: false, error: 'Lista de puertos inválida' };
    }

    if (portList.length > 65535) {
      return { success: false, error: 'Demasiados puertos (máximo 65535)' };
    }

    const results = {
      success: true,
      host: sanitizedHost,
      totalPorts: portList.length,
      openPorts: [],
      closedPorts: [],
      filteredPorts: [],
      scanTime: 0
    };

    const startTime = Date.now();
    const concurrency = 100; // Scan 100 ports at a time
    let scannedCount = 0;

    // Split ports into chunks for concurrent scanning
    for (let i = 0; i < portList.length; i += concurrency) {
      const chunk = portList.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(port => this._scanPort(sanitizedHost, port, timeout))
      );

      chunkResults.forEach((result, index) => {
        const port = chunk[index];
        scannedCount++;
        
        // Enviar actualización de progreso
        if (onProgress && typeof onProgress === 'function') {
          const progressMsg = `Escaneando puerto ${port}/${portList.length} (${scannedCount}/${portList.length})...\n`;
          onProgress(progressMsg);
          
          if (result.status === 'open') {
            onProgress(`✓ Puerto ${port} (${this._getServiceName(port)}) - ABIERTO\n`);
          }
        }
        
        if (result.status === 'open') {
          results.openPorts.push({ port, service: this._getServiceName(port) });
        } else if (result.status === 'closed') {
          results.closedPorts.push(port);
        } else {
          results.filteredPorts.push(port);
        }
      });
    }

    results.scanTime = Date.now() - startTime;
    
    // Mensaje final
    if (onProgress && typeof onProgress === 'function') {
      onProgress(`\nEscaneo completado: ${results.openPorts.length} puertos abiertos de ${portList.length} escaneados (${results.scanTime}ms)\n`);
    }
    
    return results;
  }

  /**
   * Scan a single port
   * @private
   */
  _scanPort(host, port, timeout) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let status = 'filtered';

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        status = 'open';
        socket.destroy();
      });

      socket.on('timeout', () => {
        status = 'filtered';
        socket.destroy();
      });

      socket.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
          status = 'closed';
        } else {
          status = 'filtered';
        }
        socket.destroy();
      });

      socket.on('close', () => {
        resolve({ status });
      });

      socket.connect(port, host);
    });
  }

  /**
   * Parse port specification into array
   * @private
   */
  _parsePorts(ports) {
    if (Array.isArray(ports)) {
      return ports.filter(p => p >= 1 && p <= 65535);
    }

    const result = [];
    const parts = String(ports).split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= Math.min(end, 65535); i++) {
            if (i >= 1) result.push(i);
          }
        }
      } else {
        const port = parseInt(trimmed);
        if (!isNaN(port) && port >= 1 && port <= 65535) {
          result.push(port);
        }
      }
    }

    return [...new Set(result)].sort((a, b) => a - b);
  }

  /**
   * Get common service name for a port
   * @private
   */
  _getServiceName(port) {
    const services = {
      20: 'FTP-DATA', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
      53: 'DNS', 67: 'DHCP', 68: 'DHCP', 69: 'TFTP', 80: 'HTTP',
      110: 'POP3', 119: 'NNTP', 123: 'NTP', 135: 'RPC', 137: 'NetBIOS',
      138: 'NetBIOS', 139: 'NetBIOS', 143: 'IMAP', 161: 'SNMP',
      162: 'SNMP-Trap', 389: 'LDAP', 443: 'HTTPS', 445: 'SMB',
      465: 'SMTPS', 514: 'Syslog', 587: 'SMTP', 636: 'LDAPS',
      993: 'IMAPS', 995: 'POP3S', 1433: 'MSSQL', 1521: 'Oracle',
      3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL', 5900: 'VNC',
      6379: 'Redis', 8080: 'HTTP-Proxy', 8443: 'HTTPS-Alt',
      27017: 'MongoDB', 11211: 'Memcached'
    };
    return services[port] || 'Unknown';
  }

  /**
   * DNS Lookup
   * @param {string} domain - Domain to lookup
   * @param {string} type - Record type (A, AAAA, MX, TXT, NS, SOA, CNAME, SRV)
   * @returns {Promise<Object>} DNS results
   */
  async dnsLookup(domain, type = 'A') {
    if (!domain || typeof domain !== 'string') {
      return { success: false, error: 'Dominio inválido' };
    }

    const sanitizedDomain = domain.trim().toLowerCase();
    const results = {
      success: false,
      domain: sanitizedDomain,
      type: type.toUpperCase(),
      records: [],
      ttl: null,
      queryTime: 0
    };

    const startTime = Date.now();

    try {
      const recordType = type.toUpperCase();
      let records;

      switch (recordType) {
        case 'A':
          records = await dns.resolve4(sanitizedDomain);
          results.records = records.map(ip => ({ type: 'A', value: ip }));
          break;
        case 'AAAA':
          records = await dns.resolve6(sanitizedDomain);
          results.records = records.map(ip => ({ type: 'AAAA', value: ip }));
          break;
        case 'MX':
          records = await dns.resolveMx(sanitizedDomain);
          results.records = records.map(r => ({ type: 'MX', priority: r.priority, value: r.exchange }));
          break;
        case 'TXT':
          records = await dns.resolveTxt(sanitizedDomain);
          results.records = records.map(r => ({ type: 'TXT', value: r.join(' ') }));
          break;
        case 'NS':
          records = await dns.resolveNs(sanitizedDomain);
          results.records = records.map(ns => ({ type: 'NS', value: ns }));
          break;
        case 'SOA':
          const soa = await dns.resolveSoa(sanitizedDomain);
          results.records = [{
            type: 'SOA',
            nsname: soa.nsname,
            hostmaster: soa.hostmaster,
            serial: soa.serial,
            refresh: soa.refresh,
            retry: soa.retry,
            expire: soa.expire,
            minttl: soa.minttl
          }];
          break;
        case 'CNAME':
          records = await dns.resolveCname(sanitizedDomain);
          results.records = records.map(c => ({ type: 'CNAME', value: c }));
          break;
        case 'SRV':
          records = await dns.resolveSrv(sanitizedDomain);
          results.records = records.map(r => ({
            type: 'SRV',
            priority: r.priority,
            weight: r.weight,
            port: r.port,
            value: r.name
          }));
          break;
        case 'ALL':
          // Get all record types
          const allRecords = [];
          try { 
            const a = await dns.resolve4(sanitizedDomain);
            allRecords.push(...a.map(ip => ({ type: 'A', value: ip })));
          } catch {}
          try { 
            const aaaa = await dns.resolve6(sanitizedDomain);
            allRecords.push(...aaaa.map(ip => ({ type: 'AAAA', value: ip })));
          } catch {}
          try { 
            const mx = await dns.resolveMx(sanitizedDomain);
            allRecords.push(...mx.map(r => ({ type: 'MX', priority: r.priority, value: r.exchange })));
          } catch {}
          try { 
            const ns = await dns.resolveNs(sanitizedDomain);
            allRecords.push(...ns.map(n => ({ type: 'NS', value: n })));
          } catch {}
          try { 
            const txt = await dns.resolveTxt(sanitizedDomain);
            allRecords.push(...txt.map(r => ({ type: 'TXT', value: r.join(' ') })));
          } catch {}
          results.records = allRecords;
          break;
        default:
          return { success: false, error: `Tipo de registro no soportado: ${type}` };
      }

      results.success = results.records.length > 0;
      results.queryTime = Date.now() - startTime;

      if (!results.success) {
        results.error = 'No se encontraron registros';
      }

    } catch (err) {
      results.error = err.message || 'Error en la consulta DNS';
      results.queryTime = Date.now() - startTime;
    }

    return results;
  }

  /**
   * Reverse DNS lookup
   * @param {string} ip - IP address
   * @returns {Promise<Object>} Reverse DNS results
   */
  async reverseDns(ip) {
    if (!ip || typeof ip !== 'string') {
      return { success: false, error: 'IP inválida' };
    }

    const sanitizedIp = ip.trim();
    const results = {
      success: false,
      ip: sanitizedIp,
      hostnames: [],
      queryTime: 0
    };

    const startTime = Date.now();

    try {
      const hostnames = await dns.reverse(sanitizedIp);
      results.hostnames = hostnames;
      results.success = hostnames.length > 0;
      results.queryTime = Date.now() - startTime;

      if (!results.success) {
        results.error = 'No se encontró nombre de host';
      }
    } catch (err) {
      results.error = err.message || 'Error en la consulta DNS inversa';
      results.queryTime = Date.now() - startTime;
    }

    return results;
  }

  /**
   * Check SSL/TLS certificate with comprehensive protocol and cipher testing
   * @param {string} host - Host to check
   * @param {number} port - Port (default: 443)
   * @returns {Promise<Object>} SSL certificate info
   */
  async sslCheck(host, port = 443) {
    if (!host || typeof host !== 'string') {
      return { success: false, error: 'Host inválido' };
    }

    const sanitizedHost = host.trim().replace(/^https?:\/\//, '').split('/')[0];
    const results = {
      success: false,
      host: sanitizedHost,
      port: port,
      certificate: null,
      chain: [],
      supportedProtocols: [],
      testedProtocols: [],
      ciphers: [],
      security: {
        hasWeakProtocols: false,
        hasWeakCiphers: false,
        recommendations: []
      },
      error: null
    };

    // Protocolos a probar (de más antiguo a más moderno)
    // Nota: SSLv3 no está disponible en Node.js moderno. TLSv1.0 y TLSv1.1 pueden estar deshabilitados.
    // Los valores válidos para minVersion/maxVersion en Node.js son: 'TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'
    const protocolsToTest = [
      { name: 'SSLv3', minVersion: null, maxVersion: null, deprecated: true, mayNotBeAvailable: true, skipTest: true },
      { name: 'TLSv1.0', minVersion: 'TLSv1', maxVersion: 'TLSv1', deprecated: true, mayNotBeAvailable: true },
      { name: 'TLSv1.1', minVersion: 'TLSv1.1', maxVersion: 'TLSv1.1', deprecated: true, mayNotBeAvailable: true },
      { name: 'TLSv1.2', minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2', deprecated: false, mayNotBeAvailable: false },
      { name: 'TLSv1.3', minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3', deprecated: false, mayNotBeAvailable: false }
    ];

    // Función para probar un protocolo específico
    const testProtocol = (protocolInfo) => {
      return new Promise((resolve) => {
        // Si el protocolo debe ser omitido (como SSLv3), retornar inmediatamente
        if (protocolInfo.skipTest) {
          return resolve({
            supported: false,
            protocol: protocolInfo.name,
            cipher: null,
            authorized: false,
            error: 'Protocolo no disponible en Node.js (SSLv3 fue removido por seguridad)',
            protocolUnavailable: true
          });
        }

        const options = {
          host: sanitizedHost,
          port: port,
          servername: sanitizedHost,
          rejectUnauthorized: false,
          timeout: 5000
        };

        // Solo agregar minVersion/maxVersion si están definidos
        if (protocolInfo.minVersion) {
          options.minVersion = protocolInfo.minVersion;
        }
        if (protocolInfo.maxVersion) {
          options.maxVersion = protocolInfo.maxVersion;
        }

        const socket = tls.connect(options, () => {
          try {
            const cert = socket.getPeerCertificate(true);
            const protocol = socket.getProtocol();
            const cipher = socket.getCipher();
            const cipherInfo = socket.getCipher();

            resolve({
              supported: true,
              protocol: protocol,
              cipher: cipher ? {
                name: cipher.name,
                version: cipher.version,
                standardName: cipherInfo ? cipherInfo.standardName : null
              } : null,
              authorized: socket.authorized,
              error: null
            });
          } catch (err) {
            resolve({
              supported: true,
              protocol: socket.getProtocol(),
              cipher: null,
              authorized: false,
              error: err.message
            });
          } finally {
            socket.end();
          }
        });

        socket.on('error', (err) => {
          // Error puede significar que el protocolo no está soportado por el servidor,
          // o que Node.js no soporta ese protocolo (especialmente SSLv3, TLSv1.0, TLSv1.1)
          const errorMsg = err.message || 'Error desconocido';
          const isProtocolUnavailable = protocolInfo.mayNotBeAvailable && 
            (errorMsg.includes('SSL') || errorMsg.includes('protocol') || errorMsg.includes('version'));
          
          resolve({
            supported: false,
            protocol: protocolInfo.name,
            cipher: null,
            authorized: false,
            error: isProtocolUnavailable ? 'Protocolo no disponible en Node.js/OpenSSL' : errorMsg,
            protocolUnavailable: isProtocolUnavailable
          });
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve({
            supported: false,
            protocol: protocolInfo.name,
            cipher: null,
            authorized: false,
            error: 'Timeout'
          });
        });
      });
    };

    // Primero, hacer una conexión estándar para obtener información del certificado
    return new Promise(async (resolve) => {
      const defaultOptions = {
        host: sanitizedHost,
        port: port,
        servername: sanitizedHost,
        rejectUnauthorized: false,
        timeout: 10000
      };

      const defaultSocket = tls.connect(defaultOptions, async () => {
        try {
          const cert = defaultSocket.getPeerCertificate(true);
          const protocol = defaultSocket.getProtocol();
          const cipher = defaultSocket.getCipher();

          if (cert && cert.subject) {
            results.success = true;
            
            // Información completa del certificado
            results.certificate = {
              subject: cert.subject,
              issuer: cert.issuer,
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              serialNumber: cert.serialNumber,
              fingerprint: cert.fingerprint,
              fingerprint256: cert.fingerprint256,
              subjectAltNames: cert.subjectaltname ? cert.subjectaltname.split(', ') : [],
              isValid: defaultSocket.authorized,
              daysUntilExpiry: Math.floor((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24)),
              // Información adicional
              signatureAlgorithm: cert.signatureAlgorithm || null,
              publicKey: cert.pubkey ? {
                type: cert.pubkey.type || null,
                bits: cert.pubkey.bits || null
              } : null,
              modulus: cert.modulus || null,
              exponent: cert.exponent || null
            };

            // Obtener cadena de certificados completa
            let currentCert = cert;
            while (currentCert && currentCert.issuerCertificate && 
                   currentCert.issuerCertificate !== currentCert) {
              results.chain.push({
                subject: currentCert.issuerCertificate.subject,
                issuer: currentCert.issuerCertificate.issuer,
                validFrom: currentCert.issuerCertificate.valid_from,
                validTo: currentCert.issuerCertificate.valid_to,
                serialNumber: currentCert.issuerCertificate.serialNumber
              });
              currentCert = currentCert.issuerCertificate;
            }

            // Guardar protocolo y cipher por defecto
            results.protocols = {
              version: protocol,
              cipher: cipher ? cipher.name : null,
              cipherVersion: cipher ? cipher.version : null
            };
          }

          defaultSocket.end();

          // Ahora probar todos los protocolos
          const protocolTests = [];
          for (const protocolInfo of protocolsToTest) {
            protocolTests.push(testProtocol(protocolInfo));
          }

          const protocolResults = await Promise.all(protocolTests);

          // Procesar resultados de protocolos
          for (let i = 0; i < protocolResults.length; i++) {
            const testResult = protocolResults[i];
            const protocolInfo = protocolsToTest[i];

            results.testedProtocols.push({
              name: protocolInfo.name,
              supported: testResult.supported,
              deprecated: protocolInfo.deprecated,
              cipher: testResult.cipher,
              authorized: testResult.authorized,
              error: testResult.error,
              protocolUnavailable: testResult.protocolUnavailable || false
            });

            if (testResult.supported) {
              results.supportedProtocols.push({
                name: protocolInfo.name,
                deprecated: protocolInfo.deprecated,
                cipher: testResult.cipher,
                authorized: testResult.authorized
              });

              // Agregar cipher a la lista si no está duplicado
              if (testResult.cipher && testResult.cipher.name) {
                const existingCipher = results.ciphers.find(c => c.name === testResult.cipher.name);
                if (!existingCipher) {
                  results.ciphers.push({
                    name: testResult.cipher.name,
                    version: testResult.cipher.version,
                    protocols: [protocolInfo.name]
                  });
                } else {
                  existingCipher.protocols.push(protocolInfo.name);
                }
              }

              // Detectar protocolos débiles
              if (protocolInfo.deprecated) {
                results.security.hasWeakProtocols = true;
              }
            }
          }

          // Análisis de seguridad
          if (results.security.hasWeakProtocols) {
            results.security.recommendations.push('Se detectaron protocolos obsoletos (SSLv3, TLSv1.0, TLSv1.1). Se recomienda deshabilitarlos.');
          }

          if (results.supportedProtocols.length === 0) {
            results.security.recommendations.push('No se pudo establecer conexión con ningún protocolo SSL/TLS.');
          } else if (!results.supportedProtocols.some(p => !p.deprecated)) {
            results.security.recommendations.push('Solo se soportan protocolos obsoletos. Se recomienda habilitar TLSv1.2 o superior.');
          }

          if (!results.certificate.isValid) {
            results.security.recommendations.push('El certificado no es válido. Verifica la cadena de certificados.');
          }

          if (results.certificate.daysUntilExpiry < 30) {
            results.security.recommendations.push(`El certificado expira en ${results.certificate.daysUntilExpiry} días. Se recomienda renovarlo.`);
          }

          resolve(results);
        } catch (err) {
          results.error = err.message;
          defaultSocket.end();
          resolve(results);
        }
      });

      defaultSocket.on('error', async (err) => {
        // Si falla la conexión por defecto, intentar al menos probar protocolos
        results.error = err.message;

        // Probar protocolos de todos modos
        const protocolTests = [];
        for (const protocolInfo of protocolsToTest) {
          protocolTests.push(testProtocol(protocolInfo));
        }

        const protocolResults = await Promise.all(protocolTests);
        for (let i = 0; i < protocolResults.length; i++) {
          const testResult = protocolResults[i];
          const protocolInfo = protocolsToTest[i];

          results.testedProtocols.push({
            name: protocolInfo.name,
            supported: testResult.supported,
            deprecated: protocolInfo.deprecated,
            cipher: testResult.cipher,
            authorized: testResult.authorized,
            error: testResult.error
          });

          if (testResult.supported) {
            results.supportedProtocols.push({
              name: protocolInfo.name,
              deprecated: protocolInfo.deprecated,
              cipher: testResult.cipher,
              authorized: testResult.authorized
            });
            results.success = true; // Al menos un protocolo funciona
          }
        }

        resolve(results);
      });

      defaultSocket.on('timeout', () => {
        results.error = 'Timeout de conexión';
        defaultSocket.destroy();
        resolve(results);
      });
    });
  }

  /**
   * WHOIS lookup
   * @param {string} domain - Domain to lookup
   * @param {Function} onProgress - Callback para actualizaciones en tiempo real (data: string)
   * @returns {Promise<Object>} WHOIS results
   */
  async whois(domain, onProgress = null) {
    if (!domain || typeof domain !== 'string') {
      return { success: false, error: 'Dominio inválido' };
    }

    const sanitizedDomain = domain.trim().toLowerCase().replace(/[;&|`$]/g, '');

    return new Promise(async (resolve) => {
      const results = {
        success: false,
        domain: sanitizedDomain,
        rawData: '',
        parsed: {},
        error: null
      };

      // Verificar disponibilidad del comando whois
      const whoisCmd = this._getCommand('whois');
      const isAvailable = await this._isCommandAvailable(whoisCmd);
      
      if (!isAvailable) {
        return resolve({ 
          success: false, 
          error: `El comando 'whois' no está disponible en esta plataforma (${this.platform}). Por favor, instálalo:\n\n` +
                 `- Windows: Descarga desde https://docs.microsoft.com/en-us/sysinternals/downloads/whois\n` +
                 `- macOS: brew install whois\n` +
                 `- Linux: sudo apt-get install whois (Debian/Ubuntu) o sudo yum install whois (RHEL/CentOS)`
        });
      }

      const command = whoisCmd;
      const args = [sanitizedDomain];

      const child = spawn(command, args, { timeout: 30000 });
      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        // Enviar actualización en tiempo real si hay callback
        if (onProgress && typeof onProgress === 'function') {
          onProgress(dataStr);
        }
      });

      child.stderr.on('data', (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        // Enviar actualización en tiempo real si hay callback
        if (onProgress && typeof onProgress === 'function') {
          onProgress(dataStr);
        }
      });

      child.on('close', (code) => {
        results.rawData = output;

        if (output) {
          results.success = true;
          // Parse common WHOIS fields
          results.parsed = this._parseWhois(output);
        } else if (errorOutput) {
          results.error = errorOutput.trim();
        } else {
          results.error = 'No se pudo obtener información WHOIS';
        }

        resolve(results);
      });

      child.on('error', (err) => {
        // WHOIS might not be installed
        if (err.code === 'ENOENT') {
          results.error = `El comando 'whois' no se encontró. Por favor, instálalo:\n\n` +
                         `- Windows: Descarga desde https://docs.microsoft.com/en-us/sysinternals/downloads/whois\n` +
                         `- macOS: brew install whois\n` +
                         `- Linux: sudo apt-get install whois (Debian/Ubuntu) o sudo yum install whois (RHEL/CentOS)`;
        } else {
          results.error = err.message || 'Error ejecutando whois';
        }
        resolve(results);
      });
    });
  }

  /**
   * Parse WHOIS output
   * @private
   */
  _parseWhois(data) {
    const parsed = {};
    const lines = data.split('\n');

    const patterns = {
      registrar: /Registrar:\s*(.+)/i,
      registrantName: /Registrant Name:\s*(.+)/i,
      registrantOrg: /Registrant Organization:\s*(.+)/i,
      creationDate: /Creation Date:\s*(.+)/i,
      expirationDate: /(?:Expir(?:y|ation) Date|Registry Expiry Date):\s*(.+)/i,
      updatedDate: /Updated Date:\s*(.+)/i,
      nameServers: /Name Server:\s*(.+)/i,
      status: /(?:Domain )?Status:\s*(.+)/i
    };

    const nameServers = [];
    const statuses = [];

    for (const line of lines) {
      for (const [key, pattern] of Object.entries(patterns)) {
        const match = line.match(pattern);
        if (match) {
          if (key === 'nameServers') {
            nameServers.push(match[1].trim().toLowerCase());
          } else if (key === 'status') {
            statuses.push(match[1].trim());
          } else if (!parsed[key]) {
            parsed[key] = match[1].trim();
          }
        }
      }
    }

    if (nameServers.length > 0) {
      parsed.nameServers = [...new Set(nameServers)];
    }
    if (statuses.length > 0) {
      parsed.status = [...new Set(statuses)];
    }

    return parsed;
  }

  /**
   * Traceroute to a host
   * @param {string} host - Destination host
   * @param {number} maxHops - Maximum hops (default: 30)
   * @param {Function} onProgress - Callback para actualizaciones en tiempo real (data: string)
   * @returns {Promise<Object>} Traceroute results
   */
  async traceroute(host, maxHops = 30, onProgress = null) {
    if (!host || typeof host !== 'string') {
      return { success: false, error: 'Host inválido' };
    }

    const sanitizedHost = host.trim().replace(/[;&|`$]/g, '');

    return new Promise(async (resolve) => {
      const results = {
        success: false,
        host: sanitizedHost,
        hops: [],
        rawOutput: '',
        error: null
      };

      let command, args;

      // Verificar disponibilidad del comando traceroute/tracert
      const tracerouteCmd = this._getCommand('traceroute');
      const isAvailable = await this._isCommandAvailable(tracerouteCmd);
      
      if (!isAvailable) {
        return resolve({ 
          success: false, 
          error: `El comando '${tracerouteCmd}' no está disponible en esta plataforma (${this.platform}). Por favor, instálalo o usa una alternativa.` 
        });
      }

      if (this.platform === 'win32') {
        command = 'tracert';
        args = ['-h', maxHops.toString(), '-w', '3000', sanitizedHost];
      } else if (this.platform === 'darwin') {
        // macOS
        command = 'traceroute';
        args = ['-m', maxHops.toString(), '-w', '3', sanitizedHost];
      } else {
        // Linux y otros Unix
        command = 'traceroute';
        args = ['-m', maxHops.toString(), '-w', '3', sanitizedHost];
      }

      const child = spawn(command, args, { timeout: 120000 });
      let output = '';

      child.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        // Enviar actualización en tiempo real si hay callback
        if (onProgress && typeof onProgress === 'function') {
          onProgress(dataStr);
        }
      });

      child.stderr.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        // Enviar actualización en tiempo real si hay callback
        if (onProgress && typeof onProgress === 'function') {
          onProgress(dataStr);
        }
      });

      child.on('close', (code) => {
        results.rawOutput = output;

        // Si no hay salida, marcar como error
        if (!output || output.trim().length === 0) {
          results.error = 'El comando no produjo ninguna salida. Verifica que el comando esté instalado y funcionando.';
          results.success = false;
          return resolve(results);
        }

        // Parse traceroute output
        const lines = output.split('\n');
        let hopNumber = 0;

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.length === 0) continue;
          
          // Windows format: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
          // También puede ser: "  1    1 ms    2 ms    3 ms  192.168.1.1"
          // O: "  1    *        *        *     Tiempo de espera agotado."
          const winMatch = trimmedLine.match(/^\s*(\d+)\s+(?:(\*|<?\d+)\s*ms\s+)?(?:(\*|<?\d+)\s*ms\s+)?(?:(\*|<?\d+)\s*ms\s+)?(.+)?$/);
          
          // Linux format: " 1  192.168.1.1 (192.168.1.1)  0.123 ms  0.456 ms  0.789 ms"
          // O: " 1  * * *"
          const unixMatch = trimmedLine.match(/^\s*(\d+)\s+(.+?)\s+\(?([\d.]+)\)?\s+([\d.]+)\s*ms/);
          
          // macOS puede tener formato: " 1  hostname (IP)  X.XXX ms  Y.YYY ms  Z.ZZZ ms"
          const macMatch = trimmedLine.match(/^\s*(\d+)\s+(.+?)\s+\(?([\d.]+)\)?\s+([\d.]+)\s*ms\s+([\d.]+)\s*ms\s+([\d.]+)\s*ms/);
          
          // Linux alternativo: " 1  * * *" o " 1  hostname  0.123 ms * *"
          const unixAltMatch = trimmedLine.match(/^\s*(\d+)\s+(.+?)\s+([\d.]+\s*ms|\*)/);

          if (winMatch && winMatch[1]) {
            hopNumber = parseInt(winMatch[1]);
            const times = [winMatch[2], winMatch[3], winMatch[4]]
              .filter(t => t && t !== '*')
              .map(t => t.replace('<', '').replace('ms', '').trim())
              .map(t => parseFloat(t) || 0);

            const hostInfo = winMatch[5] ? winMatch[5].trim() : '*';
            // Limpiar hostInfo de texto adicional
            const cleanHost = hostInfo.replace(/Tiempo de espera agotado\.?/i, '').replace(/Request timed out\.?/i, '').trim();

            results.hops.push({
              hop: hopNumber,
              host: cleanHost !== '*' && cleanHost.length > 0 ? cleanHost : null,
              times: times,
              avgTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null,
              timeout: cleanHost === '*' || times.length === 0 || hostInfo.includes('Tiempo de espera') || hostInfo.includes('timed out')
            });
          } else if (macMatch) {
            // macOS con 3 tiempos
            hopNumber = parseInt(macMatch[1]);
            const hostName = macMatch[2].trim();
            const ip = macMatch[3];
            const times = [parseFloat(macMatch[4]), parseFloat(macMatch[5]), parseFloat(macMatch[6])];

            results.hops.push({
              hop: hopNumber,
              host: hostName,
              ip: ip,
              times: times,
              avgTime: times.reduce((a, b) => a + b, 0) / times.length,
              timeout: false
            });
          } else if (unixMatch) {
            // Linux y otros Unix
            hopNumber = parseInt(unixMatch[1]);
            const hostName = unixMatch[2].trim();
            const ip = unixMatch[3];
            const time = parseFloat(unixMatch[4]);

            results.hops.push({
              hop: hopNumber,
              host: hostName !== '*' ? hostName : null,
              ip: ip,
              times: [time],
              avgTime: time,
              timeout: hostName === '*'
            });
          } else if (unixAltMatch) {
            // Formato alternativo de Linux
            hopNumber = parseInt(unixAltMatch[1]);
            const hostInfo = unixAltMatch[2].trim();
            const timeInfo = unixAltMatch[3];
            
            const times = [];
            if (timeInfo !== '*') {
              const timeMatch = timeInfo.match(/([\d.]+)\s*ms/);
              if (timeMatch) {
                times.push(parseFloat(timeMatch[1]));
              }
            }

            results.hops.push({
              hop: hopNumber,
              host: hostInfo !== '*' ? hostInfo : null,
              times: times,
              avgTime: times.length > 0 ? times[0] : null,
              timeout: hostInfo === '*' || times.length === 0
            });
          }
        }

        // Si no se encontraron hops pero hay salida, considerar éxito parcial
        results.success = results.hops.length > 0;
        
        if (!results.success) {
          // Si hay salida pero no se pudo parsear, incluir la salida en el error
          if (output && output.trim().length > 0) {
            results.error = `No se pudieron parsear los resultados del traceroute. Salida del comando:\n\n${output.substring(0, 500)}${output.length > 500 ? '...' : ''}`;
          } else {
            results.error = 'No se pudieron obtener resultados del traceroute';
          }
        }

        resolve(results);
      });

      child.on('error', (err) => {
        if (err.code === 'ENOENT') {
          const cmdName = this.platform === 'win32' ? 'tracert' : 'traceroute';
          results.error = `El comando '${cmdName}' no se encontró. Por favor, instálalo:\n\n` +
                         `- Windows: Ya incluido en Windows\n` +
                         `- macOS: Ya incluido en macOS\n` +
                         `- Linux: sudo apt-get install traceroute (Debian/Ubuntu) o sudo yum install traceroute (RHEL/CentOS)`;
        } else {
          results.error = err.message || 'Error ejecutando traceroute';
        }
        results.rawOutput = output || ''; // Incluir cualquier salida capturada antes del error
        resolve(results);
      });
      
      // Timeout de seguridad adicional
      setTimeout(() => {
        if (child && !child.killed) {
          child.kill();
          if (results.hops.length === 0 && !results.error) {
            results.error = `Timeout: El comando traceroute excedió el tiempo máximo (120s). Salida parcial:\n\n${output.substring(0, 500)}${output.length > 500 ? '...' : ''}`;
            results.rawOutput = output || '';
            resolve(results);
          }
        }
      }, 125000); // 125 segundos (5 segundos más que el timeout del proceso)
    });
  }

  /**
   * Get HTTP headers from a URL
   * @param {string} url - URL to check
   * @returns {Promise<Object>} HTTP headers
   */
  async httpHeaders(url) {
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'URL inválida' };
    }

    let sanitizedUrl = url.trim();
    if (!sanitizedUrl.startsWith('http://') && !sanitizedUrl.startsWith('https://')) {
      sanitizedUrl = 'https://' + sanitizedUrl;
    }

    return new Promise((resolve) => {
      const results = {
        success: false,
        url: sanitizedUrl,
        statusCode: null,
        statusMessage: null,
        headers: {},
        securityHeaders: {},
        timing: {},
        error: null
      };

      const startTime = Date.now();

      try {
        const parsedUrl = new URL(sanitizedUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
          method: 'HEAD',
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          timeout: 10000,
          headers: {
            'User-Agent': 'NodeTerm-NetworkTools/1.0'
          }
        };

        const req = protocol.request(options, (res) => {
          results.success = true;
          results.statusCode = res.statusCode;
          results.statusMessage = res.statusMessage;
          results.headers = res.headers;
          results.timing.responseTime = Date.now() - startTime;

          // Analyze security headers
          results.securityHeaders = {
            'Strict-Transport-Security': res.headers['strict-transport-security'] || null,
            'Content-Security-Policy': res.headers['content-security-policy'] || null,
            'X-Content-Type-Options': res.headers['x-content-type-options'] || null,
            'X-Frame-Options': res.headers['x-frame-options'] || null,
            'X-XSS-Protection': res.headers['x-xss-protection'] || null,
            'Referrer-Policy': res.headers['referrer-policy'] || null,
            'Permissions-Policy': res.headers['permissions-policy'] || null
          };

          resolve(results);
        });

        req.on('error', (err) => {
          results.error = err.message;
          results.timing.responseTime = Date.now() - startTime;
          resolve(results);
        });

        req.on('timeout', () => {
          results.error = 'Timeout de conexión';
          req.destroy();
          resolve(results);
        });

        req.end();
      } catch (err) {
        results.error = err.message;
        resolve(results);
      }
    });
  }

  /**
   * Calculate subnet information
   * @param {string} cidr - CIDR notation (e.g., "192.168.1.0/24")
   * @returns {Object} Subnet information
   */
  subnetCalc(cidr) {
    if (!cidr || typeof cidr !== 'string') {
      return { success: false, error: 'CIDR inválido' };
    }

    const sanitizedCidr = cidr.trim();
    const match = sanitizedCidr.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);

    if (!match) {
      return { success: false, error: 'Formato CIDR inválido. Use formato: 192.168.1.0/24' };
    }

    const ip = match[1];
    const prefix = parseInt(match[2]);

    if (prefix < 0 || prefix > 32) {
      return { success: false, error: 'Prefijo debe estar entre 0 y 32' };
    }

    // Validate IP
    const octets = ip.split('.').map(Number);
    if (octets.length !== 4 || octets.some(o => o < 0 || o > 255)) {
      return { success: false, error: 'Dirección IP inválida' };
    }

    // Calculate subnet info
    const ipInt = this._ipToInt(ip);
    const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const hostMin = network + 1;
    const hostMax = broadcast - 1;
    const totalHosts = Math.pow(2, 32 - prefix);
    const usableHosts = prefix >= 31 ? (prefix === 32 ? 1 : 2) : totalHosts - 2;

    return {
      success: true,
      input: sanitizedCidr,
      networkAddress: this._intToIp(network),
      broadcastAddress: this._intToIp(broadcast),
      subnetMask: this._intToIp(mask),
      wildcardMask: this._intToIp(~mask >>> 0),
      firstHost: prefix < 31 ? this._intToIp(hostMin) : this._intToIp(network),
      lastHost: prefix < 31 ? this._intToIp(hostMax) : this._intToIp(broadcast),
      totalHosts: totalHosts,
      usableHosts: usableHosts,
      prefix: prefix,
      ipClass: this._getIpClass(octets[0]),
      isPrivate: this._isPrivateIp(octets),
      binaryMask: mask.toString(2).padStart(32, '0').replace(/(.{8})/g, '$1.').slice(0, -1)
    };
  }

  /**
   * Convert IP string to integer
   * @private
   */
  _ipToInt(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Convert integer to IP string
   * @private
   */
  _intToIp(int) {
    return [
      (int >>> 24) & 255,
      (int >>> 16) & 255,
      (int >>> 8) & 255,
      int & 255
    ].join('.');
  }

  /**
   * Get IP class
   * @private
   */
  _getIpClass(firstOctet) {
    if (firstOctet < 128) return 'A';
    if (firstOctet < 192) return 'B';
    if (firstOctet < 224) return 'C';
    if (firstOctet < 240) return 'D (Multicast)';
    return 'E (Reserved)';
  }

  /**
   * Check if IP is private
   * @private
   */
  _isPrivateIp(octets) {
    if (octets[0] === 10) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 127) return true;
    return false;
  }

  /**
   * Wake on LAN - Send magic packet
   * @param {string} mac - MAC address
   * @param {string} broadcast - Broadcast address (default: 255.255.255.255)
   * @param {number} port - Port (default: 9)
   * @returns {Promise<Object>} Result
   */
  async wakeOnLan(mac, broadcast = '255.255.255.255', port = 9) {
    if (!mac || typeof mac !== 'string') {
      return { success: false, error: 'Dirección MAC inválida' };
    }

    // Normalize MAC address
    const cleanMac = mac.replace(/[:-]/g, '').toUpperCase();
    if (!/^[0-9A-F]{12}$/.test(cleanMac)) {
      return { success: false, error: 'Formato de MAC inválido. Use XX:XX:XX:XX:XX:XX o XX-XX-XX-XX-XX-XX' };
    }

    // Create magic packet
    const macBuffer = Buffer.from(cleanMac, 'hex');
    const magicPacket = Buffer.alloc(102);

    // First 6 bytes are 0xFF
    for (let i = 0; i < 6; i++) {
      magicPacket[i] = 0xFF;
    }

    // Repeat MAC address 16 times
    for (let i = 0; i < 16; i++) {
      macBuffer.copy(magicPacket, 6 + i * 6);
    }

    const sendTargets = [];

    if (broadcast && broadcast !== '255.255.255.255') {
      // If user specified a specific broadcast IP, we just use it
      sendTargets.push({ localIp: '0.0.0.0', broadcastIp: broadcast });
    } else {
      // Get all network interfaces to broadcast on all of them
      try {
        const interfaces = os.networkInterfaces();
        for (const [name, addrs] of Object.entries(interfaces)) {
          if (!addrs) continue;
          for (const addr of addrs) {
            if (addr.family === 'IPv4' && !addr.internal) {
              const localIp = addr.address;
              let calcBroadcast = '255.255.255.255';
              
              if (addr.cidr) {
                const subnetInfo = this.subnetCalc(addr.cidr);
                if (subnetInfo && subnetInfo.success && subnetInfo.broadcastAddress) {
                  calcBroadcast = subnetInfo.broadcastAddress;
                }
              } else if (addr.netmask) {
                try {
                  const ipInt = this._ipToInt(localIp);
                  const maskInt = this._ipToInt(addr.netmask);
                  const broadcastInt = (ipInt & maskInt) | (~maskInt >>> 0);
                  calcBroadcast = this._intToIp(broadcastInt);
                } catch (e) {
                  calcBroadcast = '255.255.255.255';
                }
              }
              
              // Send both to global broadcast and subnet broadcast for this interface
              sendTargets.push({ localIp, broadcastIp: '255.255.255.255' });
              if (calcBroadcast && calcBroadcast !== '255.255.255.255') {
                sendTargets.push({ localIp, broadcastIp: calcBroadcast });
              }
            }
          }
        }
      } catch (err) {
        console.error('Error listing interfaces for WoL:', err);
      }

      // Add a fallback default 0.0.0.0 -> 255.255.255.255 in case no interfaces were resolved
      if (sendTargets.length === 0) {
        sendTargets.push({ localIp: '0.0.0.0', broadcastIp: '255.255.255.255' });
      }
    }

    // Send the packet to all targets
    const sendPromises = sendTargets.map(({ localIp, broadcastIp }) => {
      return new Promise((resolve) => {
        try {
          const socket = dgram.createSocket('udp4');
          socket.on('error', (err) => {
            console.error(`WoL socket error on interface ${localIp}:`, err);
            socket.close();
            resolve({ success: false, localIp, broadcastIp, error: err.message });
          });

          socket.bind(0, localIp, () => {
            socket.setBroadcast(true);
            socket.send(magicPacket, 0, magicPacket.length, port, broadcastIp, (err) => {
              socket.close();
              if (err) {
                resolve({ success: false, localIp, broadcastIp, error: err.message });
              } else {
                resolve({ success: true, localIp, broadcastIp });
              }
            });
          });
        } catch (err) {
          resolve({ success: false, localIp, broadcastIp, error: err.message });
        }
      });
    });

    const results = await Promise.all(sendPromises);
    const sentCount = results.filter(r => r.success).length;

    if (sentCount === 0) {
      const firstError = results.find(r => r.error)?.error || 'Error desconocido';
      return { success: false, error: `No se pudo enviar el paquete mágico: ${firstError}` };
    }

    return {
      success: true,
      mac: mac,
      broadcast: broadcast,
      port: port,
      details: results,
      message: `Paquete mágico enviado correctamente a través de ${sentCount} interfaces/direcciones.`
    };
  }

  /**
   * Ruta a nmap.exe si está instalado
   * @private
   */
  async _getNmapPath() {
    if (this._nmapPathCache !== undefined) {
      return this._nmapPathCache;
    }

    const candidates = [
      'C:\\Program Files (x86)\\Nmap\\nmap.exe',
      'C:\\Program Files\\Nmap\\nmap.exe'
    ];

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          this._nmapPathCache = candidate;
          return candidate;
        }
      } catch { /* ignore */ }
    }

    try {
      const { stdout } = await execAsync('where nmap', { timeout: 3000, shell: true });
      const line = stdout?.split(/\r?\n/).find(l => l.trim().toLowerCase().endsWith('nmap.exe'));
      if (line) {
        this._nmapPathCache = line.trim();
        return this._nmapPathCache;
      }
    } catch { /* ignore */ }

    if (await this._isCommandAvailable('nmap')) {
      this._nmapPathCache = 'nmap';
      return 'nmap';
    }

    this._nmapPathCache = null;
    return null;
  }

  /**
   * Tabla vecinos Windows vía Get-NetNeighbor (más fiable que arp -a)
   * @private
   */
  async _readWindowsNeighborTable() {
    const table = {};
    const ps = [
      'Get-NetNeighbor -AddressFamily IPv4',
      '| Where-Object { $_.IPAddress -match \'^\\d+\\.\\d+\\.\\d+\\.\\d+$\' -and $_.LinkLayerAddress }',
      '| ForEach-Object { "$($_.IPAddress)|$($_.LinkLayerAddress)" }'
    ].join(' ');

    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -Command "${ps}"`,
        { timeout: 20000, shell: true, maxBuffer: 4 * 1024 * 1024 }
      );
      for (const line of stdout.split(/\r?\n/)) {
        const [ip, macRaw] = line.trim().split('|');
        if (!ip || !macRaw) continue;
        const mac = this._normalizeMacAddress(macRaw);
        if (mac && !this._isInvalidMac(mac)) {
          table[ip] = mac;
        }
      }
    } catch { /* ignore */ }

    return table;
  }

  /**
   * MAC de un IP concreto (PowerShell)
   * @private
   */
  async _getMacFromNetNeighbor(ip) {
    if (this.platform !== 'win32') return null;
    const ps = `Get-NetNeighbor -IPAddress '${ip}' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty LinkLayerAddress`;
    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -Command "${ps}"`,
        { timeout: 8000, shell: true }
      );
      const mac = this._normalizeMacAddress(stdout.trim());
      return mac && !this._isInvalidMac(mac) ? mac : null;
    } catch {
      return null;
    }
  }

  /**
   * Lee tabla ARP clásica (arp -a / ip neigh)
   * @private
   */
  async _readArpTableClassic() {
    return new Promise((resolve) => {
      const cmd = this.platform === 'linux' ? 'ip neigh' : 'arp -a';
      exec(cmd, { timeout: 8000 }, (err, stdout) => {
        const table = {};
        if (err || !stdout) {
          return resolve(table);
        }

        const lines = stdout.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const winMatch = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-f]{2}(?:[-:][0-9a-f]{2}){5})\s+/i);
          if (winMatch) {
            const mac = this._normalizeMacAddress(winMatch[2]);
            if (mac && !this._isInvalidMac(mac)) {
              table[winMatch[1]] = mac;
            }
            continue;
          }

          const ipNeigh = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})\s+dev\s+\S+\s+lladdr\s+([0-9a-f:]+)/i);
          if (ipNeigh) {
            const mac = this._normalizeMacAddress(ipNeigh[2]);
            if (mac && !this._isInvalidMac(mac)) {
              table[ipNeigh[1]] = mac;
            }
            continue;
          }

          const unixMatch = trimmed.match(/\((\d{1,3}(?:\.\d{1,3}){3})\)\s+at\s+([0-9a-f:]{11,17})/i);
          if (unixMatch) {
            const mac = this._normalizeMacAddress(unixMatch[2]);
            if (mac && !this._isInvalidMac(mac)) {
              table[unixMatch[1]] = mac;
            }
          }
        }

        resolve(table);
      });
    });
  }

  /**
   * Tabla IP -> MAC combinando todas las fuentes del SO
   * @private
   */
  async _readNeighborTable() {
    const merged = {};

    if (this.platform === 'win32') {
      Object.assign(merged, await this._readWindowsNeighborTable());
    }

    Object.assign(merged, await this._readArpTableClassic());
    return merged;
  }

  /** @private */
  async _readArpTable() {
    return this._readNeighborTable();
  }

  /**
   * Hostname vía nslookup (Windows / entornos AD)
   * @private
   */
  async _resolveHostnameNslookup(ip) {
    try {
      const { stdout } = await execAsync(`nslookup ${ip}`, { timeout: 6000, shell: true });
      const nameMatch = stdout.match(/^\s*Nombre:\s*(.+)$/im) || stdout.match(/^\s*Name:\s*(.+)$/im);
      if (!nameMatch) return null;
      const name = nameMatch[1].trim().replace(/\.$/, '');
      if (!name || name === ip || /servidor|server|address/i.test(name)) return null;
      return name;
    } catch {
      return null;
    }
  }

  /**
   * Enriquecimiento con nmap (MAC, fabricante, SO, hostname)
   * @private
   */
  async _nmapEnrichHost(ip) {
    const nmap = await this._getNmapPath();
    if (!nmap) return null;

    const quoted = nmap.includes(' ') ? `"${nmap}"` : nmap;
    const cmd = [
      quoted,
      '-sn', '-PR', '-Pn', '-n',
      '-O', '--osscan-guess', '--max-os-tries', '1',
      '-F', '--host-timeout', '12s',
      ip
    ].join(' ');

    try {
      const { stdout } = await execAsync(cmd, {
        timeout: 20000,
        shell: true,
        maxBuffer: 2 * 1024 * 1024
      });
      return this._parseNmapHostOutput(stdout, ip);
    } catch {
      try {
        const { stdout } = await execAsync(
          `${quoted} -sn -PR -Pn -n ${ip}`,
          { timeout: 10000, shell: true }
        );
        return this._parseNmapHostOutput(stdout, ip);
      } catch {
        return null;
      }
    }
  }

  /**
   * @private
   */
  _parseNmapHostOutput(stdout, ip) {
    if (!stdout) return null;
    const result = { mac: null, vendor: null, os: null, osDetails: null, hostname: null, deviceType: null };

    const macMatch = stdout.match(/MAC Address:\s*([0-9A-Fa-f:]+)\s*(?:\(([^)]+)\))?/);
    if (macMatch) {
      result.mac = this._normalizeMacAddress(macMatch[1]);
      result.vendor = macMatch[2]?.trim() || this._lookupMacVendor(result.mac);
    }

    const osDetails = stdout.match(/OS details:\s*(.+)/i);
    const running = stdout.match(/Running:\s*(.+)/i);
    const deviceType = stdout.match(/Device type:\s*(.+)/i);
    if (osDetails) {
      result.os = osDetails[1].trim();
      result.osDetails = result.os;
    } else if (running) {
      result.os = running[1].trim();
      result.osDetails = result.os;
    }
    if (deviceType) {
      result.deviceType = deviceType[1].trim();
    }

    const hostLine = stdout.match(new RegExp(`Nmap scan report for (.+?)(?:\\s+\\(${ip.replace(/\./g, '\\.')}\\)|\\s*$)`, 'im'));
    if (hostLine) {
      let name = hostLine[1].trim();
      if (name && name !== ip && !/^\d+\.\d+\.\d+\.\d+$/.test(name)) {
        result.hostname = name;
      }
    }

    return result;
  }

  /**
   * Resuelve MAC (ping + vecinos + nmap)
   * @private
   */
  async _resolveMacForHost(ip, neighborTable, nmapEnabled = true) {
    let mac = neighborTable[ip] || null;

    if (!mac) {
      await this._pingHostNative(ip, 1200);
      mac = await this._getMacFromNetNeighbor(ip);
      if (!mac) {
        const refreshed = await this._readNeighborTable();
        mac = refreshed[ip] || null;
        Object.assign(neighborTable, refreshed);
      }
    }

    let vendor = mac ? this._lookupMacVendor(mac) : null;

    if (!mac && nmapEnabled) {
      const nmapData = await this._nmapEnrichHost(ip);
      if (nmapData?.mac) {
        mac = nmapData.mac;
        vendor = nmapData.vendor || vendor;
        return { mac, vendor, nmapData };
      }
    }

    return { mac, vendor, nmapData: null };
  }

  /**
   * @private
   */
  _normalizeMacAddress(mac) {
    if (!mac) return null;
    const clean = mac.replace(/[^0-9a-f]/gi, '').toUpperCase();
    if (clean.length !== 12) return null;
    return clean.match(/.{2}/g).join(':');
  }

  /**
   * @private
   */
  _isInvalidMac(mac) {
    if (!mac) return true;
    const clean = mac.replace(/[^0-9A-F]/g, '');
    return clean === '000000000000' || clean === 'FFFFFFFFFFFF' || clean.startsWith('01005E');
  }

  /**
   * Lookup fabricante por prefijo OUI (MAC)
   * @private
   */
  _lookupMacVendor(mac) {
    if (!mac) return null;
    const prefix = mac.replace(/[^0-9A-F]/gi, '').substring(0, 6).toUpperCase();
    const vendors = this._getOuiVendorMap();
    return vendors[prefix] || null;
  }

  /**
   * @private
   */
  _getOuiVendorMap() {
    return {
      '000C29': 'VMware',
      '005056': 'VMware',
      '001C42': 'Parallels',
      '080027': 'VirtualBox',
      '525400': 'QEMU/KVM',
      '00155D': 'Microsoft Hyper-V',
      '001A2B': 'Cisco',
      '001B63': 'Apple',
      '001E52': 'Apple',
      '001EC2': 'Apple',
      '0026BB': 'Apple',
      'F01898': 'Apple',
      'A45E60': 'Apple',
      'DCA632': 'Raspberry Pi',
      'B827EB': 'Raspberry Pi',
      'E45F01': 'Raspberry Pi',
      '000D3A': 'Microsoft',
      '001DD8': 'Microsoft',
      '001F3A': 'Microsoft',
      '002248': 'Microsoft',
      '001B21': 'Intel',
      '001E67': 'Intel',
      '3C970E': 'Intel',
      '001CF0': 'Intel',
      '001D7E': 'Cisco',
      '000142': 'Cisco',
      '000E08': 'Cisco',
      '001A70': 'Cisco',
      '00163E': 'Cisco',
      '0019E7': 'Cisco',
      '0016C7': 'Cisco',
      '001731': 'Belkin',
      '001D0F': 'TP-Link',
      '50C7BF': 'TP-Link',
      'A42BB0': 'TP-Link',
      '001E58': 'D-Link',
      '001CF0': 'D-Link',
      '00179A': 'D-Link',
      '001B11': 'D-Link',
      '001E4A': 'D-Link',
      '002191': 'D-Link',
      '001E2A': 'Netgear',
      '001B2F': 'Netgear',
      '0026F2': 'Netgear',
      '9C3DCF': 'Netgear',
      '001A92': 'ASUS',
      '001731': 'ASUS',
      '1C872C': 'ASUS',
      '2C56DC': 'ASUS',
      '001E8C': 'ASUS',
      '000E35': 'Intel',
      '001B38': 'Intel',
      '001E64': 'Intel',
      '0022FA': 'Intel',
      '001CC0': 'Intel',
      '001E65': 'Intel',
      '001B77': 'Intel',
      '0002B3': 'Intel',
      '001B21': 'Intel',
      '001517': 'Hewlett-Packard',
      '001871': 'Hewlett-Packard',
      '002264': 'Hewlett-Packard',
      '000423': 'Intel',
      '001B21': 'Intel',
      '001CC0': 'Intel',
      '001E67': 'Intel',
      '001731': 'Intel',
      '000D0B': 'Realtek',
      '001E37': 'Realtek',
      '0013D3': 'Realtek',
      '0018FE': 'Realtek',
      '001CF0': 'Realtek',
      '001E4C': 'Realtek',
      '001731': 'Realtek',
      '000E2E': 'Edimax',
      '001D0F': 'Ubiquiti',
      '002722': 'Ubiquiti',
      '04181F': 'Ubiquiti',
      '24A43C': 'Ubiquiti',
      '788A20': 'Ubiquiti',
      'FCFAF7': 'Ubiquiti',
      'B4FBE4': 'Ubiquiti',
      '001A11': 'Google',
      'DA0B66': 'Google',
      'F4F5D8': 'Google',
      'F4F5E8': 'Google',
      '3C5AB4': 'Google',
      '001A11': 'Google',
      '001A92': 'Samsung',
      '002566': 'Samsung',
      '001632': 'Samsung',
      '0015B9': 'Samsung',
      '001EE2': 'Samsung',
      '0019E2': 'Samsung',
      '001DF6': 'Samsung',
      '0016DB': 'Samsung',
      '001D25': 'Samsung',
      '001E75': 'Samsung',
      '001FCC': 'Samsung',
      '002491': 'Samsung',
      '0019E0': 'Samsung',
      '0016B9': 'Samsung',
      '001D25': 'Samsung',
      '0242AC': 'Docker',
      '0242AC1': 'Docker',
      '000569': 'Docker',
      '00163E': 'Docker',
      '00155D': 'Microsoft',
      '001DD8': 'Microsoft',
      '001F3A': 'Microsoft',
      '001A2B': 'Microsoft',
      '00125A': 'Microsoft',
      '001D0F': 'Microsoft',
      '001731': 'Microsoft',
      '001E4C': 'Microsoft',
      '001CF0': 'Microsoft',
      '001B21': 'Microsoft',
      '001E67': 'Microsoft',
      '001CC0': 'Microsoft',
      '001731': 'Microsoft',
      '001A2B': 'Microsoft',
      '001DD8': 'Microsoft',
      '001F3A': 'Microsoft',
      '00125A': 'Microsoft',
      '001D0F': 'Microsoft',
      '001731': 'Microsoft',
      '001E4C': 'Microsoft',
      '001CF0': 'Microsoft',
      '001B21': 'Microsoft',
      '001E67': 'Microsoft',
      '001CC0': 'Microsoft'
    };
  }

  /**
   * @private
   */
  _extractTtlFromPingOutput(output) {
    if (!output) return null;
    const match = output.match(/TTL[=<]\s*(\d+)/i) || output.match(/ttl[=<]\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Sonda rápida de puertos comunes para fingerprint
   * @private
   */
  async _quickProbePorts(ip, ports = [22, 80, 135, 139, 443, 445, 3389, 548, 5357], timeout = 600) {
    const open = [];
    const results = await Promise.all(
      ports.map(async (port) => {
        const r = await this._scanPort(ip, port, timeout);
        return { port, ...r };
      })
    );
    for (const r of results) {
      if (r.status === 'open') open.push(r.port);
    }
    return open;
  }

  /**
   * NetBIOS / nbtstat (Windows)
   * @private
   */
  async _getNetbiosInfo(ip) {
    if (this.platform !== 'win32') {
      return { name: null, group: null, mac: null };
    }

    return new Promise((resolve) => {
      exec(`nbtstat -A ${ip}`, { timeout: 25000, maxBuffer: 1024 * 1024, encoding: 'buffer' }, (err, stdoutBuf) => {
        const stdout = stdoutBuf
          ? stdoutBuf.toString('latin1')
          : '';

        if (!stdout) {
          return resolve({ name: null, group: null, mac: null });
        }

        if (/Host no encontrado|host not found/i.test(stdout) && !/<00>/i.test(stdout)) {
          return resolve({ name: null, group: null, mac: null });
        }

        let name = null;
        let group = null;
        let mac = null;

        for (const line of stdout.split(/\r?\n/)) {
          const entry = line.match(/^\s*([^\s<]+)\s+<00>\s+/i);
          if (!entry) continue;
          const entryName = entry[1].trim();
          if (entryName.startsWith('__') || entryName.length < 2) continue;

          if (/grupo|group/i.test(line)) {
            if (!group) group = entryName;
          } else if (!name) {
            name = entryName;
          }
        }

        const macMatch = stdout.match(/(?:MAC Address|Direcci[oó]n física)\s*[=:]\s*([0-9A-Fa-f-]+)/i);
        if (macMatch) {
          mac = this._normalizeMacAddress(macMatch[1]);
        }

        resolve({ name, group, mac });
      });
    });
  }

  /**
   * Obtiene banners ligeros para inferir SO
   * @private
   */
  async _probeOsBanners(ip, openPorts) {
    const hints = { ssh: null, http: null, smb: null };
    const timeout = 1500;

    if (openPorts.includes(22)) {
      const banner = await this._grabBanner(ip, 22, timeout);
      if (banner.success && banner.banner) {
        hints.ssh = banner.banner.split('\n')[0].trim();
      }
    }

    if (openPorts.includes(80) || openPorts.includes(8080)) {
      const port = openPorts.includes(80) ? 80 : 8080;
      const banner = await this._grabBanner(ip, port, timeout);
      if (banner.success && banner.banner) {
        const serverMatch = banner.banner.match(/Server:\s*([^\r\n]+)/i);
        hints.http = serverMatch ? serverMatch[1].trim() : banner.banner.split('\n')[0].trim();
      }
    }

    return hints;
  }

  /**
   * Infiere sistema operativo a partir de señales recolectadas
   * @private
   */
  _guessOperatingSystem({ ttl, openPorts = [], vendor, netbiosName, banners = {} }) {
    const signals = [];
    let os = null;
    let deviceType = null;

    const has = (p) => openPorts.includes(p);

    if (ttl !== null && ttl !== undefined) {
      if (ttl >= 240) {
        signals.push(`TTL ${ttl} (red/IoT)`);
        os = os || 'Dispositivo de red';
        deviceType = deviceType || 'Router/Switch';
      } else if (ttl >= 120) {
        signals.push(`TTL ${ttl} (Windows)`);
        os = 'Windows';
      } else if (ttl >= 60 && ttl < 120) {
        signals.push(`TTL ${ttl} (Unix/Linux/macOS)`);
        os = os || 'Linux/Unix';
      }
    }

    if (has(3389) || (has(445) && has(135))) {
      signals.push('RDP/SMB');
      os = 'Windows';
      deviceType = deviceType || 'PC/Servidor Windows';
    } else if (has(445) || has(139) || has(135)) {
      signals.push('SMB/NetBIOS');
      os = os || 'Windows';
    }

    if (has(548)) {
      signals.push('AFP');
      os = 'macOS';
      deviceType = 'Mac';
    }

    if (has(22) && !has(3389)) {
      signals.push('SSH');
      if (!os || os === 'Linux/Unix') os = 'Linux';
      deviceType = deviceType || 'Servidor Linux';
    }

    if (has(62078)) {
      os = 'iOS';
      deviceType = 'iPhone/iPad';
      signals.push('puerto 62078');
    }

    if (banners.ssh) {
      const ssh = banners.ssh;
      if (/ubuntu|debian|linux/i.test(ssh)) {
        os = 'Linux';
        signals.push(`SSH: ${ssh.substring(0, 60)}`);
      } else if (/darwin|macos/i.test(ssh)) {
        os = 'macOS';
        signals.push(`SSH: ${ssh.substring(0, 60)}`);
      } else if (/windows/i.test(ssh)) {
        os = 'Windows';
        signals.push(`SSH: ${ssh.substring(0, 60)}`);
      }
    }

    if (banners.http) {
      const http = banners.http;
      if (/microsoft-iis|win32|asp\.net/i.test(http)) {
        os = 'Windows';
        signals.push(`HTTP: ${http.substring(0, 50)}`);
      } else if (/ubuntu|debian|linux/i.test(http)) {
        os = os || 'Linux';
        signals.push(`HTTP: ${http.substring(0, 50)}`);
      } else if (/darwin|macos/i.test(http)) {
        os = 'macOS';
        signals.push(`HTTP: ${http.substring(0, 50)}`);
      }
    }

    if (netbiosName) {
      signals.push(`NetBIOS: ${netbiosName}`);
      os = os || 'Windows';
    }

    if (vendor) {
      const v = vendor.toLowerCase();
      if (/vmware|virtualbox|qemu|parallels|hyper-v|docker/i.test(v)) {
        deviceType = deviceType || 'Máquina virtual';
      } else if (/apple|raspberry/i.test(v)) {
        if (!os) os = /raspberry/i.test(v) ? 'Linux (Raspberry Pi OS)' : 'macOS/iOS';
        deviceType = deviceType || (/raspberry/i.test(v) ? 'Raspberry Pi' : 'Apple');
      } else if (/cisco|ubiquiti|tp-link|netgear|d-link|asus/i.test(v)) {
        deviceType = deviceType || 'Dispositivo de red';
        os = os || 'Firmware embebido';
      }
    }

    if (!os) {
      if (has(80) || has(443)) os = 'Desconocido (servidor web)';
      else os = 'Desconocido';
    }

    return {
      os,
      deviceType: deviceType || null,
      confidence: signals.length >= 2 ? 'alta' : signals.length === 1 ? 'media' : 'baja',
      signals
    };
  }

  /**
   * Enriquece un host descubierto con MAC, hostname, SO, etc.
   * @private
   */
  async _enrichDiscoveredHost(host, neighborTable, onProgress, options = {}) {
    host.hostnames = host.hostnames || (host.hostname ? [host.hostname] : []);
    host.netbiosName = host.netbiosName || null;
    host.netbiosGroup = host.netbiosGroup || null;
    host.ttl = host.ttl ?? null;
    host.os = host.os || null;
    host.deviceType = host.deviceType || null;
    host.osSignals = host.osSignals || [];
    host.openPorts = host.openPorts || [];
    host.enrichmentSource = host.enrichmentSource || [];

    const addSource = (s) => {
      if (s && !host.enrichmentSource.includes(s)) host.enrichmentSource.push(s);
    };

    const addHostname = (name) => {
      if (!name || name === host.ip) return;
      if (!host.hostname) host.hostname = name;
      if (!host.hostnames.includes(name)) host.hostnames.push(name);
    };

    try {
      const pingResult = await this._pingHostNative(host.ip, 2000);
      if (pingResult.ttl) host.ttl = pingResult.ttl;
      addSource('ping');
    } catch { /* ignore */ }

    try {
      const { mac, vendor, nmapData } = await this._resolveMacForHost(host.ip, neighborTable, options.nmapEnabled !== false);
      if (mac) {
        host.mac = mac;
        neighborTable[host.ip] = mac;
        addSource('neighbor/arp');
      }
      if (vendor) host.vendor = vendor;

      if (nmapData) {
        if (nmapData.mac && !host.mac) host.mac = nmapData.mac;
        if (nmapData.vendor) host.vendor = nmapData.vendor;
        if (nmapData.os) {
          host.os = nmapData.os;
          host.osDetails = nmapData.osDetails;
          addSource('nmap-os');
        }
        if (nmapData.deviceType) host.deviceType = nmapData.deviceType;
        if (nmapData.hostname) addHostname(nmapData.hostname);
        addSource('nmap');
      }
    } catch { /* ignore */ }

    if (!host.os && options.nmapEnabled !== false) {
      try {
        const nmapOnly = await this._nmapEnrichHost(host.ip);
        if (nmapOnly) {
          if (nmapOnly.mac && !host.mac) host.mac = nmapOnly.mac;
          if (nmapOnly.vendor) host.vendor = nmapOnly.vendor;
          else if (nmapOnly.mac && !host.vendor) host.vendor = this._lookupMacVendor(nmapOnly.mac);
          if (nmapOnly.os) {
            host.os = nmapOnly.os;
            host.osDetails = nmapOnly.osDetails;
            addSource('nmap-os');
          }
          if (nmapOnly.deviceType) host.deviceType = nmapOnly.deviceType;
          if (nmapOnly.hostname) addHostname(nmapOnly.hostname);
          addSource('nmap');
        }
      } catch { /* ignore */ }
    }

    try {
      const reverseDns = await this.reverseDns(host.ip);
      if (reverseDns.success && reverseDns.hostnames.length > 0) {
        reverseDns.hostnames.forEach(addHostname);
        addSource('dns-ptr');
      }
    } catch { /* ignore */ }

    if (this.platform === 'win32') {
      try {
        const nsName = await this._resolveHostnameNslookup(host.ip);
        if (nsName) {
          addHostname(nsName);
          addSource('nslookup');
        }
      } catch { /* ignore */ }
    }

    if (this.platform === 'win32' && !host.hostname && options.netbiosEnabled !== false) {
      try {
        const nb = await this._getNetbiosInfo(host.ip);
        if (nb.name) {
          host.netbiosName = nb.name;
          addHostname(nb.name);
          addSource('netbios');
        }
        if (nb.group) host.netbiosGroup = nb.group;
        if (nb.mac && !host.mac) {
          host.mac = nb.mac;
          host.vendor = host.vendor || this._lookupMacVendor(host.mac);
          neighborTable[host.ip] = nb.mac;
        }
      } catch { /* ignore */ }
    }

    if (!host.mac && neighborTable[host.ip]) {
      host.mac = neighborTable[host.ip];
      host.vendor = host.vendor || this._lookupMacVendor(host.mac);
    }

    try {
      const customPorts = options.portsToScan ? this._parsePorts(options.portsToScan) : undefined;
      host.openPorts = await this._quickProbePorts(host.ip, customPorts);
      if (host.openPorts.length > 0) addSource('port-probe');
    } catch { /* ignore */ }

    if (!host.os || host.os === 'Desconocido') {
      try {
        const banners = await this._probeOsBanners(host.ip, host.openPorts);
        const osGuess = this._guessOperatingSystem({
          ttl: host.ttl,
          openPorts: host.openPorts,
          vendor: host.vendor,
          netbiosName: host.netbiosName,
          banners
        });
        if (!host.os || host.os === 'Desconocido' || osGuess.confidence !== 'baja') {
          host.os = osGuess.os;
          host.deviceType = host.deviceType || osGuess.deviceType;
          host.osConfidence = osGuess.confidence;
          host.osSignals = osGuess.signals;
          addSource('heuristic');
        }
      } catch { /* ignore */ }
    }

    if (host.mac && !host.vendor) {
      host.vendor = this._lookupMacVendor(host.mac);
    }

    if (onProgress && typeof onProgress === 'function') {
      const parts = [
        host.hostname || host.netbiosName || 'sin nombre',
        host.mac ? `MAC ${host.mac}` : null,
        host.vendor ? host.vendor : null,
        host.os ? host.os : null
      ].filter(Boolean);
      onProgress(`  ${host.ip} → ${parts.join(' | ')}\n`);
    }
  }

  /**
   * Enriquecimiento ligero (modo rápido): ARP, DNS inverso y hostname básico.
   * @private
   */
  async _enrichDiscoveredHostQuick(host, neighborTable, onProgress) {
    host.hostnames = host.hostnames || (host.hostname ? [host.hostname] : []);
    host.openPorts = host.openPorts || [];

    const addHostname = (name) => {
      if (!name || name === host.ip) return;
      if (!host.hostname) host.hostname = name;
      if (!host.hostnames.includes(name)) host.hostnames.push(name);
    };

    if (neighborTable[host.ip]) {
      host.mac = neighborTable[host.ip];
      host.vendor = this._lookupMacVendor(host.mac);
    }

    try {
      const reverseDns = await this.reverseDns(host.ip);
      if (reverseDns.success && reverseDns.hostnames.length > 0) {
        reverseDns.hostnames.forEach(addHostname);
      }
    } catch { /* ignore */ }

    if (this.platform === 'win32' && !host.hostname) {
      try {
        const nsName = await this._resolveHostnameNslookup(host.ip);
        if (nsName) addHostname(nsName);
      } catch { /* ignore */ }
    }

    if (host.mac && !host.vendor) {
      host.vendor = this._lookupMacVendor(host.mac);
    }

    if (!host.os) host.os = 'Desconocido';

    if (onProgress && typeof onProgress === 'function') {
      const parts = [
        host.hostname || 'sin nombre',
        host.mac ? `MAC ${host.mac}` : null,
        host.vendor || null
      ].filter(Boolean);
      onProgress(`  ${host.ip} → ${parts.join(' | ')}\n`);
    }
  }

  /**
   * Network scan - Discover hosts in a subnet
   * @param {string} subnet - Subnet in CIDR notation (e.g., "192.168.1.0/24")
   * @param {number} timeout - Timeout per host in ms (default: 1000)
   * @param {Function} onProgress - Callback para actualizaciones en tiempo real (data: string)
   * @param {Object} options - { mode: 'quick' | 'full' }
   * @returns {Promise<Object>} Discovered hosts
   */
  async networkScan(subnet, timeout = 1000, onProgress = null, options = {}) {
    const subnetInfo = this.subnetCalc(subnet);
    if (!subnetInfo.success) {
      return subnetInfo;
    }

    // Limit scan to reasonable size
    if (subnetInfo.totalHosts > 1024) {
      return { 
        success: false, 
        error: `Subred demasiado grande (${subnetInfo.totalHosts} hosts). Máximo permitido: 1024 hosts (/22 o mayor)` 
      };
    }

    const scanMode = options.mode === 'quick' ? 'quick' : 'full';
    const isQuick = scanMode === 'quick';
    const pingTimeout = options.pingTimeout || (isQuick ? Math.min(timeout, 450) : timeout);

    const results = {
      success: true,
      subnet: subnet,
      subnetInfo: subnetInfo,
      hosts: [],
      scanTime: 0,
      scannedCount: 0,
      scanMode
    };

    const startTime = Date.now();
    const startIp = this._ipToInt(subnetInfo.firstHost);
    const endIp = this._ipToInt(subnetInfo.lastHost);
    const concurrency = options.concurrency || (isQuick ? 90 : 50);

    const ipList = [];
    for (let ip = startIp; ip <= endIp; ip++) {
      ipList.push(this._intToIp(ip));
    }

    if (onProgress && typeof onProgress === 'function') {
      onProgress(`Iniciando escaneo de red (${isQuick ? 'RÁPIDO' : 'COMPLETO'}): ${subnet}\n`);
      onProgress(`Rango: ${subnetInfo.firstHost} - ${subnetInfo.lastHost} (${ipList.length} hosts)\n`);
      onProgress(`Timeout: ${pingTimeout}ms · Lotes de ${concurrency}...\n\n`);
    }

    // Scan in batches
    for (let i = 0; i < ipList.length; i += concurrency) {
      const batch = ipList.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(ip => this._quickPing(ip, pingTimeout, { fast: isQuick }))
      );

      batchResults.forEach((result, index) => {
        results.scannedCount++;
        const currentIp = batch[index];
        const progress = ((results.scannedCount / ipList.length) * 100).toFixed(1);
        
        // Enviar actualización de progreso
        if (onProgress && typeof onProgress === 'function') {
          if (result.alive) {
            onProgress(`✓ ${currentIp} - ACTIVO (${result.time}ms) [${results.scannedCount}/${ipList.length}] ${progress}%\n`);
          } else if (results.scannedCount % 10 === 0 || results.scannedCount === ipList.length) {
            // Mostrar progreso cada 10 hosts o al final
            onProgress(`Escaneando... [${results.scannedCount}/${ipList.length}] ${progress}%\n`);
          }
        }
        
        if (result.alive) {
          results.hosts.push({
            ip: currentIp,
            responseTime: result.time,
            hostname: null,
            hostnames: [],
            mac: null,
            vendor: null,
            os: null,
            deviceType: null,
            ttl: null,
            netbiosName: null,
            netbiosGroup: null,
            openPorts: []
          });
        }
      });
    }

    results.scanTime = Date.now() - startTime;

    if (onProgress && typeof onProgress === 'function') {
      onProgress(`\nDescubrimiento completado: ${results.hosts.length} hosts activos de ${ipList.length} (${(results.scanTime / 1000).toFixed(2)}s)\n`);
      if (isQuick) {
        onProgress(`Enriquecimiento rápido (ARP + DNS)...\n`);
      } else {
        const nmapPath = await this._getNmapPath();
        onProgress(`Resolviendo MAC, hostname y SO${nmapPath ? ' (nmap + sistema)' : ' (sistema)'}...\n`);
      }
    }

    const neighborTable = await this._readNeighborTable();

    if (isQuick) {
      const enrichConcurrency = 10;
      for (let i = 0; i < results.hosts.length; i += enrichConcurrency) {
        const batch = results.hosts.slice(i, i + enrichConcurrency);
        await Promise.all(
          batch.map(host => this._enrichDiscoveredHostQuick(host, neighborTable, onProgress))
        );
      }
    } else {
      const pingBatch = 8;
      for (let i = 0; i < results.hosts.length; i += pingBatch) {
        await Promise.all(
          results.hosts.slice(i, i + pingBatch).map(h => this._pingHostNative(h.ip, 1000))
        );
      }

      const enrichConcurrency = 2;
      for (let i = 0; i < results.hosts.length; i += enrichConcurrency) {
        const batch = results.hosts.slice(i, i + enrichConcurrency);
        await Promise.all(
          batch.map(host => this._enrichDiscoveredHost(host, neighborTable, onProgress, options))
        );
      }
    }

    if (onProgress && typeof onProgress === 'function') {
      onProgress(`\nEscaneo ${isQuick ? 'rápido' : 'completo'} finalizado.\n`);
    }

    return results;
  }

  /**
   * Quick ping using TCP connection (faster than ICMP ping)
   * @private
   */
  /**
   * Ping a host using the OS ping command
   * @private
   */
  _pingHostNative(ip, timeoutMs) {
    return new Promise((resolve) => {
      let command;
      let args;

      if (this.platform === 'win32') {
        command = 'ping';
        args = ['-n', '1', '-w', timeoutMs.toString(), ip];
      } else if (this.platform === 'darwin') {
        command = 'ping';
        args = ['-c', '1', '-W', timeoutMs.toString(), ip];
      } else {
        // Linux ping -W takes seconds, so convert timeoutMs to seconds
        const timeoutSeconds = Math.max(1, Math.round(timeoutMs / 1000));
        command = 'ping';
        args = ['-c', '1', '-W', timeoutSeconds.toString(), ip];
      }

      const startTime = Date.now();
      const child = spawn(command, args);
      
      let output = '';
      child.stdout.on('data', (data) => { output += data.toString(); });
      child.stderr.on('data', () => {});

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const ttl = this._extractTtlFromPingOutput(output);
        if (code === 0) {
          const isAlive = /TTL=/i.test(output) || /ttl=/i.test(output) || /time=/i.test(output) || /tiempo=/i.test(output);
          if (isAlive) {
            resolve({ alive: true, time: duration, ttl });
            return;
          }
        }
        resolve({ alive: false, time: null, ttl: null });
      });

      child.on('error', () => {
        resolve({ alive: false, time: null });
      });

      // Security timeout
      setTimeout(() => {
        if (!child.killed) {
          try {
            child.kill();
          } catch (e) {}
        }
      }, timeoutMs + 500);
    });
  }

  /**
   * Quick check on a TCP port
   * @private
   */
  _checkTcpPort(ip, port, timeoutMs) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const socket = new net.Socket();

      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        const time = Date.now() - startTime;
        socket.destroy();
        resolve({ alive: true, time });
      });

      socket.on('error', (err) => {
        socket.destroy();
        if (err.code === 'ECONNREFUSED') {
          resolve({ alive: true, time: Date.now() - startTime });
        } else {
          resolve({ alive: false, time: null });
        }
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ alive: false, time: null });
      });

      socket.connect(port, ip);
    });
  }

  /**
   * Quick ping using hybrid TCP and ICMP methods
   * @private
   */
  _quickPing(ip, timeout, options = {}) {
    if (options.fast) {
      return new Promise((resolve) => {
        let settled = false;
        const finishAlive = (result) => {
          if (settled || !result?.alive) return;
          settled = true;
          clearTimeout(timer);
          resolve(result);
        };
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve({ alive: false, time: null });
          }
        }, timeout);

        this._pingHostNative(ip, timeout).then(finishAlive);
        [80, 443, 445, 135].forEach((port) => {
          this._checkTcpPort(ip, port, Math.min(timeout, 320)).then(finishAlive);
        });
      });
    }

    return new Promise(async (resolve) => {
      let resolved = false;
      const done = (result) => {
        if (resolved) return;
        if (result.alive) {
          resolved = true;
          resolve(result);
        }
      };

      const icmpPromise = this._pingHostNative(ip, timeout).then(res => {
        done(res);
        return res;
      });

      const commonPorts = [80, 443, 22, 135, 445, 5357];
      const tcpPromises = commonPorts.map(port => {
        return this._checkTcpPort(ip, port, timeout).then(res => {
          done(res);
          return res;
        });
      });

      await Promise.all([icmpPromise, ...tcpPromises]);
      if (!resolved) {
        resolve({ alive: false, time: null });
      }
    });
  }

  // =============================================
  // BASE DE DATOS DE VULNERABILIDADES CONOCIDAS
  // =============================================
  
  /**
   * Base de datos local de vulnerabilidades conocidas por servicio/versión
   * Fallback cuando no hay conexión a NVD
   * @private
   */
  _getLocalVulnDatabase() {
    return {
      // SSH
      'openssh': [
        { version: '<7.0', severity: 'HIGH', cve: 'CVE-2016-0777', description: 'Roaming vulnerability permite fuga de información' },
        { version: '<7.4', severity: 'MEDIUM', cve: 'CVE-2016-10009', description: 'Ejecución remota de código via agent forwarding' },
        { version: '<8.0', severity: 'MEDIUM', cve: 'CVE-2019-6111', description: 'SCP client permite sobrescribir archivos' },
        { version: '<8.5', severity: 'LOW', cve: 'CVE-2021-28041', description: 'Double-free memory corruption' },
        { version: '<9.0', severity: 'MEDIUM', cve: 'CVE-2023-38408', description: 'Remote code execution via PKCS#11' }
      ],
      // Apache
      'apache': [
        { version: '<2.4.50', severity: 'CRITICAL', cve: 'CVE-2021-41773', description: 'Path traversal y RCE' },
        { version: '<2.4.51', severity: 'CRITICAL', cve: 'CVE-2021-42013', description: 'Path traversal bypass' },
        { version: '<2.4.54', severity: 'HIGH', cve: 'CVE-2022-31813', description: 'X-Forwarded-* header bypass' },
        { version: '<2.4.58', severity: 'MEDIUM', cve: 'CVE-2023-45802', description: 'HTTP/2 DoS vulnerability' }
      ],
      // Nginx
      'nginx': [
        { version: '<1.17.7', severity: 'MEDIUM', cve: 'CVE-2019-20372', description: 'HTTP request smuggling' },
        { version: '<1.21.0', severity: 'MEDIUM', cve: 'CVE-2021-23017', description: 'DNS resolver vulnerability' },
        { version: '<1.23.2', severity: 'MEDIUM', cve: 'CVE-2022-41741', description: 'Memory corruption in mp4 module' }
      ],
      // MySQL/MariaDB
      'mysql': [
        { version: '<5.7.32', severity: 'HIGH', cve: 'CVE-2020-14812', description: 'Server: Locking unspecified vulnerability' },
        { version: '<8.0.22', severity: 'HIGH', cve: 'CVE-2021-2007', description: 'Client: C API vulnerability' },
        { version: '<8.0.28', severity: 'MEDIUM', cve: 'CVE-2022-21351', description: 'Server: Optimizer vulnerability' }
      ],
      // PostgreSQL
      'postgresql': [
        { version: '<12.7', severity: 'HIGH', cve: 'CVE-2021-32027', description: 'Buffer overrun from integer overflow' },
        { version: '<14.3', severity: 'HIGH', cve: 'CVE-2022-1552', description: 'Autovacuum privilege escalation' },
        { version: '<15.1', severity: 'MEDIUM', cve: 'CVE-2022-41862', description: 'Client memory disclosure' }
      ],
      // FTP
      'vsftpd': [
        { version: '<3.0.3', severity: 'MEDIUM', cve: 'CVE-2015-1419', description: 'Denial of service vulnerability' }
      ],
      'proftpd': [
        { version: '<1.3.6', severity: 'CRITICAL', cve: 'CVE-2019-12815', description: 'Arbitrary file copy vulnerability' },
        { version: '<1.3.7', severity: 'HIGH', cve: 'CVE-2020-9273', description: 'Memory pool use-after-free' }
      ],
      // SMB/Samba
      'samba': [
        { version: '<4.13.17', severity: 'CRITICAL', cve: 'CVE-2021-44142', description: 'Out-of-bounds heap read/write' },
        { version: '<4.15.5', severity: 'HIGH', cve: 'CVE-2022-32742', description: 'SMB1 server memory disclosure' }
      ],
      // Redis
      'redis': [
        { version: '<6.0.10', severity: 'HIGH', cve: 'CVE-2021-21309', description: 'Integer overflow' },
        { version: '<6.2.6', severity: 'HIGH', cve: 'CVE-2021-32761', description: 'Integer overflow in BITFIELD' },
        { version: '<7.0.5', severity: 'HIGH', cve: 'CVE-2022-35951', description: 'Integer overflow in XAUTOCLAIM' }
      ],
      // MongoDB
      'mongodb': [
        { version: '<4.4.8', severity: 'HIGH', cve: 'CVE-2021-32040', description: 'DoS via crafted query' },
        { version: '<5.0.4', severity: 'MEDIUM', cve: 'CVE-2021-32039', description: 'Memory corruption' }
      ],
      // Telnet (siempre vulnerable)
      'telnet': [
        { version: '*', severity: 'CRITICAL', cve: 'N/A', description: 'Protocolo sin encriptación - credenciales en texto plano' }
      ],
      // FTP sin TLS
      'ftp': [
        { version: '*', severity: 'HIGH', cve: 'N/A', description: 'FTP sin TLS - credenciales pueden ser interceptadas' }
      ]
    };
  }

  /**
   * Mapa de servicios conocidos por puerto
   * @private
   */
  _getServicesByPort() {
    return {
      21: { service: 'ftp', name: 'FTP' },
      22: { service: 'ssh', name: 'SSH' },
      23: { service: 'telnet', name: 'Telnet' },
      25: { service: 'smtp', name: 'SMTP' },
      53: { service: 'dns', name: 'DNS' },
      80: { service: 'http', name: 'HTTP' },
      110: { service: 'pop3', name: 'POP3' },
      143: { service: 'imap', name: 'IMAP' },
      443: { service: 'https', name: 'HTTPS' },
      445: { service: 'smb', name: 'SMB' },
      993: { service: 'imaps', name: 'IMAPS' },
      995: { service: 'pop3s', name: 'POP3S' },
      1433: { service: 'mssql', name: 'MSSQL' },
      1521: { service: 'oracle', name: 'Oracle' },
      3306: { service: 'mysql', name: 'MySQL' },
      3389: { service: 'rdp', name: 'RDP' },
      5432: { service: 'postgresql', name: 'PostgreSQL' },
      5900: { service: 'vnc', name: 'VNC' },
      6379: { service: 'redis', name: 'Redis' },
      8080: { service: 'http-proxy', name: 'HTTP Proxy' },
      8443: { service: 'https-alt', name: 'HTTPS Alt' },
      27017: { service: 'mongodb', name: 'MongoDB' },
      11211: { service: 'memcached', name: 'Memcached' }
    };
  }

  /**
   * Banner grabbing - intenta obtener el banner de un servicio
   * @private
   */
  async _grabBanner(host, port, timeout = 3000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let banner = '';
      let resolved = false;

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        // Algunos servicios envían banner inmediatamente, otros necesitan input
        // Enviamos un pequeño request genérico para HTTP/HTTPS
        if (port === 80 || port === 8080) {
          socket.write('HEAD / HTTP/1.0\r\nHost: ' + host + '\r\n\r\n');
        } else if (port === 443 || port === 8443) {
          // Para HTTPS necesitamos TLS, usaremos otro método
          socket.destroy();
          resolve({ success: false, banner: null, reason: 'TLS required' });
          return;
        }
      });

      socket.on('data', (data) => {
        banner += data.toString();
        // Limitar tamaño del banner
        if (banner.length > 2048) {
          socket.destroy();
        }
      });

      socket.on('timeout', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve({ success: banner.length > 0, banner: banner.trim() || null });
        }
      });

      socket.on('error', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve({ success: false, banner: null });
        }
      });

      socket.on('close', () => {
        if (!resolved) {
          resolved = true;
          resolve({ success: banner.length > 0, banner: banner.trim() || null });
        }
      });

      socket.connect(port, host);

      // Timeout adicional
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve({ success: banner.length > 0, banner: banner.trim() || null });
        }
      }, timeout + 500);
    });
  }

  /**
   * Obtener banner via TLS
   * @private
   */
  async _grabTlsBanner(host, port, timeout = 5000) {
    return new Promise((resolve) => {
      const options = {
        host,
        port,
        servername: host,
        rejectUnauthorized: false,
        timeout
      };

      const socket = tls.connect(options, () => {
        // Enviar request HTTP
        socket.write('HEAD / HTTP/1.0\r\nHost: ' + host + '\r\n\r\n');
      });

      let banner = '';
      let resolved = false;

      socket.on('data', (data) => {
        banner += data.toString();
        if (banner.length > 2048) {
          socket.destroy();
        }
      });

      socket.on('error', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve({ success: false, banner: null });
        }
      });

      socket.on('timeout', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve({ success: banner.length > 0, banner: banner.trim() || null });
        }
      });

      socket.on('close', () => {
        if (!resolved) {
          resolved = true;
          resolve({ success: banner.length > 0, banner: banner.trim() || null });
        }
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve({ success: banner.length > 0, banner: banner.trim() || null });
        }
      }, timeout + 500);
    });
  }

  /**
   * Parsear versión de un banner
   * @private
   */
  _parseVersionFromBanner(banner, service) {
    if (!banner) return null;

    const patterns = {
      ssh: /SSH-[\d.]+-OpenSSH[_-]?([\d.p]+)/i,
      apache: /Apache\/([\d.]+)/i,
      nginx: /nginx\/([\d.]+)/i,
      mysql: /mysql[_\s]*([\d.]+)/i,
      postgresql: /PostgreSQL\s*([\d.]+)/i,
      redis: /redis[_:]*([\d.]+)/i,
      mongodb: /MongoDB[\/\s]*([\d.]+)/i,
      vsftpd: /vsftpd\s*([\d.]+)/i,
      proftpd: /ProFTPD\s*([\d.]+)/i,
      samba: /Samba\s*([\d.]+)/i,
      http: /Server:\s*(.+?)(?:\r|\n|$)/i
    };

    const pattern = patterns[service.toLowerCase()];
    if (pattern) {
      const match = banner.match(pattern);
      if (match) return match[1];
    }

    // Intento genérico de encontrar versión
    const genericMatch = banner.match(/(?:version|ver|v)[:\s]*([\d.]+)/i);
    if (genericMatch) return genericMatch[1];

    return null;
  }

  /**
   * Comparar versiones (retorna true si version < maxVersion)
   * @private
   */
  _isVersionVulnerable(version, maxVersion) {
    if (maxVersion === '*') return true;
    if (!version || !maxVersion) return false;

    const parseVersion = (v) => {
      return v.replace(/^[<>=]+/, '').split(/[.-]/).map(n => parseInt(n) || 0);
    };

    const v1 = parseVersion(version);
    const v2 = parseVersion(maxVersion);

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const a = v1[i] || 0;
      const b = v2[i] || 0;
      if (a < b) return true;
      if (a > b) return false;
    }
    return false;
  }

  /**
   * Buscar CVEs en NVD (National Vulnerability Database)
   * @private
   */
  async _searchNVD(service, version) {
    if (!service || !version) return [];
    
    try {
      // NVD API v2.0
      const keyword = encodeURIComponent(`${service} ${version}`);
      const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${keyword}&resultsPerPage=10`;
      
      return new Promise((resolve) => {
        const request = https.get(url, { timeout: 10000 }, (response) => {
          let data = '';
          
          response.on('data', chunk => { data += chunk; });
          response.on('end', () => {
            try {
              const json = JSON.parse(data);
              const cves = (json.vulnerabilities || []).map(v => {
                const cve = v.cve;
                const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0] || cve.metrics?.cvssMetricV2?.[0];
                const baseScore = metrics?.cvssData?.baseScore || 0;
                
                let severity = 'LOW';
                if (baseScore >= 9.0) severity = 'CRITICAL';
                else if (baseScore >= 7.0) severity = 'HIGH';
                else if (baseScore >= 4.0) severity = 'MEDIUM';
                
                return {
                  cve: cve.id,
                  severity,
                  score: baseScore,
                  description: cve.descriptions?.find(d => d.lang === 'en')?.value || 'Sin descripción'
                };
              });
              resolve(cves.slice(0, 5)); // Max 5 CVEs
            } catch {
              resolve([]);
            }
          });
        });
        
        request.on('error', () => resolve([]));
        request.on('timeout', () => {
          request.destroy();
          resolve([]);
        });
      });
    } catch {
      return [];
    }
  }

  /**
   * Host Vulnerability Scanner
   * Escanea puertos, detecta servicios/versiones y busca CVEs conocidas
   * @param {string} host - Host a escanear
   * @param {string} ports - Puertos a escanear (por defecto: puertos comunes)
   * @param {number} timeout - Timeout por operación
   * @param {boolean} useOnline - Usar NVD online (fallback a local)
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultados del escaneo
   */
  async hostVulnScan(host, ports = '21,22,23,25,53,80,110,143,443,445,993,995,1433,1521,3306,3389,5432,5900,6379,8080,8443,27017', timeout = 5000, useOnline = true, onProgress = null) {
    if (!host || typeof host !== 'string') {
      return { success: false, error: 'Host inválido' };
    }

    const sanitizedHost = host.trim();
    const portList = this._parsePorts(ports);
    const startTime = Date.now();
    const localVulnDb = this._getLocalVulnDatabase();
    const servicesByPort = this._getServicesByPort();

    const results = {
      success: true,
      host: sanitizedHost,
      scanTime: 0,
      summary: {
        totalPorts: portList.length,
        openPorts: 0,
        servicesDetected: 0,
        vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        riskScore: 0
      },
      ports: [],
      vulnerabilities: [],
      recommendations: []
    };

    const progressLog = (msg) => {
      if (onProgress && typeof onProgress === 'function') {
        onProgress(msg);
      }
    };

    progressLog(`🔍 Iniciando escaneo de vulnerabilidades en ${sanitizedHost}\n`);
    progressLog(`📡 Escaneando ${portList.length} puertos...\n\n`);

    // Fase 1: Escaneo de puertos
    for (let i = 0; i < portList.length; i += 20) {
      const chunk = portList.slice(i, i + 20);
      const scanResults = await Promise.all(
        chunk.map(port => this._scanPort(sanitizedHost, port, timeout))
      );

      for (let j = 0; j < chunk.length; j++) {
        const port = chunk[j];
        const scanResult = scanResults[j];

        if (scanResult.status === 'open') {
          results.summary.openPorts++;
          const serviceInfo = servicesByPort[port] || { service: 'unknown', name: 'Unknown' };
          
          progressLog(`✓ Puerto ${port} (${serviceInfo.name}) - ABIERTO\n`);

          const portData = {
            port,
            status: 'open',
            service: serviceInfo.name,
            serviceId: serviceInfo.service,
            banner: null,
            version: null,
            vulnerabilities: []
          };

          // Fase 2: Banner grabbing
          progressLog(`  → Obteniendo banner...\n`);
          
          let bannerResult;
          if (port === 443 || port === 8443) {
            bannerResult = await this._grabTlsBanner(sanitizedHost, port, timeout);
          } else {
            bannerResult = await this._grabBanner(sanitizedHost, port, timeout);
          }

          if (bannerResult.success && bannerResult.banner) {
            portData.banner = bannerResult.banner.substring(0, 500);
            
            // Parsear versión del banner
            const version = this._parseVersionFromBanner(bannerResult.banner, serviceInfo.service);
            if (version) {
              portData.version = version;
              results.summary.servicesDetected++;
              progressLog(`  → Versión detectada: ${version}\n`);
            }
          }

          // Fase 3: Buscar vulnerabilidades
          if (portData.version || serviceInfo.service) {
            progressLog(`  → Buscando vulnerabilidades...\n`);
            
            // Primero buscar en base local
            const localVulns = localVulnDb[serviceInfo.service] || [];
            for (const vuln of localVulns) {
              if (this._isVersionVulnerable(portData.version, vuln.version)) {
                const vulnData = {
                  port,
                  service: serviceInfo.name,
                  version: portData.version,
                  cve: vuln.cve,
                  severity: vuln.severity,
                  description: vuln.description,
                  source: 'local'
                };
                portData.vulnerabilities.push(vulnData);
                results.vulnerabilities.push(vulnData);
                
                // Contar por severidad
                const sevKey = vuln.severity.toLowerCase();
                if (results.summary.vulnerabilities[sevKey] !== undefined) {
                  results.summary.vulnerabilities[sevKey]++;
                }
                
                progressLog(`  ⚠️ ${vuln.severity}: ${vuln.cve} - ${vuln.description}\n`);
              }
            }

            // Buscar online si está habilitado
            if (useOnline && portData.version) {
              try {
                const onlineCves = await this._searchNVD(serviceInfo.service, portData.version);
                for (const cve of onlineCves) {
                  // Evitar duplicados
                  if (!portData.vulnerabilities.some(v => v.cve === cve.cve)) {
                    const vulnData = {
                      port,
                      service: serviceInfo.name,
                      version: portData.version,
                      cve: cve.cve,
                      severity: cve.severity,
                      score: cve.score,
                      description: cve.description.substring(0, 200),
                      source: 'NVD'
                    };
                    portData.vulnerabilities.push(vulnData);
                    results.vulnerabilities.push(vulnData);
                    
                    const sevKey = cve.severity.toLowerCase();
                    if (results.summary.vulnerabilities[sevKey] !== undefined) {
                      results.summary.vulnerabilities[sevKey]++;
                    }
                    
                    progressLog(`  ⚠️ ${cve.severity}: ${cve.cve} (Score: ${cve.score})\n`);
                  }
                }
              } catch (e) {
                // Ignorar errores de NVD
              }
            }
          }

          results.ports.push(portData);
          progressLog(`\n`);
        }
      }
    }

    // Calcular score de riesgo (0-100)
    const vulnWeights = { critical: 40, high: 25, medium: 10, low: 3, info: 1 };
    let riskPoints = 0;
    for (const [severity, count] of Object.entries(results.summary.vulnerabilities)) {
      riskPoints += count * (vulnWeights[severity] || 0);
    }
    results.summary.riskScore = Math.min(100, riskPoints);

    // Generar recomendaciones
    if (results.summary.vulnerabilities.critical > 0) {
      results.recommendations.push({
        priority: 'CRITICAL',
        text: `Hay ${results.summary.vulnerabilities.critical} vulnerabilidad(es) crítica(s). ¡Actualiza los servicios afectados inmediatamente!`
      });
    }
    if (results.summary.vulnerabilities.high > 0) {
      results.recommendations.push({
        priority: 'HIGH',
        text: `Se encontraron ${results.summary.vulnerabilities.high} vulnerabilidad(es) de alta severidad. Planifica actualizaciones lo antes posible.`
      });
    }
    if (results.ports.some(p => p.serviceId === 'telnet')) {
      results.recommendations.push({
        priority: 'CRITICAL',
        text: 'Telnet detectado. Este protocolo transmite credenciales en texto plano. Migra a SSH.'
      });
    }
    if (results.ports.some(p => p.port === 3389)) {
      results.recommendations.push({
        priority: 'HIGH',
        text: 'RDP expuesto. Considera usar VPN o restringir acceso por IP.'
      });
    }
    if (results.summary.openPorts > 10) {
      results.recommendations.push({
        priority: 'MEDIUM',
        text: `${results.summary.openPorts} puertos abiertos. Revisa si todos son necesarios y cierra los innecesarios.`
      });
    }

    results.scanTime = Date.now() - startTime;

    progressLog(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    progressLog(`✅ Escaneo completado en ${(results.scanTime / 1000).toFixed(2)}s\n`);
    progressLog(`📊 Puertos abiertos: ${results.summary.openPorts}\n`);
    progressLog(`🔒 Vulnerabilidades encontradas: ${results.vulnerabilities.length}\n`);
    progressLog(`   🔴 Críticas: ${results.summary.vulnerabilities.critical}\n`);
    progressLog(`   🟠 Altas: ${results.summary.vulnerabilities.high}\n`);
    progressLog(`   🟡 Medias: ${results.summary.vulnerabilities.medium}\n`);
    progressLog(`   🟢 Bajas: ${results.summary.vulnerabilities.low}\n`);
    progressLog(`📈 Score de riesgo: ${results.summary.riskScore}/100\n`);

    return results;
  }

  /**
   * Web Security Scanner
   * Analiza headers de seguridad, SSL/TLS, cookies y configuraciones
   * @param {string} url - URL a analizar
   * @param {number} timeout - Timeout de conexión
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultados del análisis
   */
  async webSecurityScan(url, timeout = 10000, onProgress = null) {
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'URL inválida' };
    }

    let sanitizedUrl = url.trim();
    if (!sanitizedUrl.startsWith('http://') && !sanitizedUrl.startsWith('https://')) {
      sanitizedUrl = 'https://' + sanitizedUrl;
    }

    const startTime = Date.now();
    
    const results = {
      success: false,
      url: sanitizedUrl,
      scanTime: 0,
      summary: {
        score: 0,
        grade: 'F',
        issues: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        passed: 0,
        failed: 0
      },
      checks: [],
      ssl: null,
      headers: {},
      cookies: [],
      technologies: [],
      recommendations: []
    };

    const progressLog = (msg) => {
      if (onProgress && typeof onProgress === 'function') {
        onProgress(msg);
      }
    };

    try {
      const parsedUrl = new URL(sanitizedUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const hostname = parsedUrl.hostname;
      const port = parsedUrl.port || (isHttps ? 443 : 80);

      progressLog(`🌐 Iniciando análisis de seguridad web\n`);
      progressLog(`📍 URL: ${sanitizedUrl}\n`);
      progressLog(`🔒 HTTPS: ${isHttps ? 'Sí' : 'No'}\n\n`);

      // ====================
      // 1. ANÁLISIS SSL/TLS
      // ====================
      if (isHttps) {
        progressLog(`━━━ Análisis SSL/TLS ━━━\n`);
        const sslResult = await this.sslCheck(hostname, parseInt(port));
        results.ssl = sslResult;

        if (sslResult.success) {
          // Verificar certificado válido
          if (sslResult.certificate?.isValid) {
            results.checks.push({
              category: 'SSL/TLS',
              check: 'Certificado válido',
              status: 'PASS',
              severity: 'info',
              details: `Certificado válido hasta ${sslResult.certificate.validTo}`
            });
            results.summary.passed++;
            progressLog(`✅ Certificado válido\n`);
          } else {
            results.checks.push({
              category: 'SSL/TLS',
              check: 'Certificado válido',
              status: 'FAIL',
              severity: 'critical',
              details: 'El certificado SSL no es válido o está autofirmado'
            });
            results.summary.failed++;
            results.summary.issues.critical++;
            progressLog(`❌ Certificado inválido o autofirmado\n`);
          }

          // Verificar expiración próxima
          const daysUntilExpiry = sslResult.certificate?.daysUntilExpiry || 0;
          if (daysUntilExpiry < 30 && daysUntilExpiry > 0) {
            results.checks.push({
              category: 'SSL/TLS',
              check: 'Expiración del certificado',
              status: 'WARN',
              severity: 'high',
              details: `El certificado expira en ${daysUntilExpiry} días`
            });
            results.summary.failed++;
            results.summary.issues.high++;
            progressLog(`⚠️ Certificado expira en ${daysUntilExpiry} días\n`);
          } else if (daysUntilExpiry <= 0) {
            results.checks.push({
              category: 'SSL/TLS',
              check: 'Expiración del certificado',
              status: 'FAIL',
              severity: 'critical',
              details: 'El certificado ha expirado'
            });
            results.summary.failed++;
            results.summary.issues.critical++;
            progressLog(`❌ Certificado expirado\n`);
          } else {
            results.checks.push({
              category: 'SSL/TLS',
              check: 'Expiración del certificado',
              status: 'PASS',
              severity: 'info',
              details: `El certificado es válido por ${daysUntilExpiry} días más`
            });
            results.summary.passed++;
            progressLog(`✅ Certificado válido por ${daysUntilExpiry} días\n`);
          }

          // Verificar protocolos obsoletos
          const weakProtocols = sslResult.supportedProtocols?.filter(p => p.deprecated) || [];
          if (weakProtocols.length > 0) {
            const protocols = weakProtocols.map(p => p.name).join(', ');
            results.checks.push({
              category: 'SSL/TLS',
              check: 'Protocolos obsoletos',
              status: 'FAIL',
              severity: 'high',
              details: `Protocolos obsoletos habilitados: ${protocols}`
            });
            results.summary.failed++;
            results.summary.issues.high++;
            progressLog(`⚠️ Protocolos obsoletos: ${protocols}\n`);
          } else {
            results.checks.push({
              category: 'SSL/TLS',
              check: 'Protocolos obsoletos',
              status: 'PASS',
              severity: 'info',
              details: 'No se detectaron protocolos obsoletos'
            });
            results.summary.passed++;
            progressLog(`✅ Sin protocolos obsoletos\n`);
          }

          // Verificar TLS 1.3
          const hasTls13 = sslResult.supportedProtocols?.some(p => p.name === 'TLSv1.3' && !p.deprecated);
          if (hasTls13) {
            results.checks.push({
              category: 'SSL/TLS',
              check: 'TLS 1.3',
              status: 'PASS',
              severity: 'info',
              details: 'TLS 1.3 está habilitado'
            });
            results.summary.passed++;
            progressLog(`✅ TLS 1.3 habilitado\n`);
          } else {
            results.checks.push({
              category: 'SSL/TLS',
              check: 'TLS 1.3',
              status: 'WARN',
              severity: 'low',
              details: 'TLS 1.3 no está habilitado (recomendado)'
            });
            results.summary.failed++;
            results.summary.issues.low++;
            progressLog(`⚠️ TLS 1.3 no disponible\n`);
          }
        }
        progressLog(`\n`);
      } else {
        // HTTP sin SSL
        results.checks.push({
          category: 'SSL/TLS',
          check: 'HTTPS',
          status: 'FAIL',
          severity: 'critical',
          details: 'El sitio no usa HTTPS. Toda la comunicación es en texto plano.'
        });
        results.summary.failed++;
        results.summary.issues.critical++;
        progressLog(`❌ HTTPS no habilitado - CRÍTICO\n\n`);
      }

      // ====================
      // 2. ANÁLISIS HTTP
      // ====================
      progressLog(`━━━ Análisis de Headers HTTP ━━━\n`);
      
      const httpResult = await this._fetchWithDetails(sanitizedUrl, timeout);
      
      if (httpResult.success) {
        results.headers = httpResult.headers;
        results.success = true;

        // Lista de security headers a verificar
        const securityHeaders = [
          {
            header: 'strict-transport-security',
            name: 'HSTS (Strict-Transport-Security)',
            severity: 'high',
            recommendation: 'Añade: Strict-Transport-Security: max-age=31536000; includeSubDomains'
          },
          {
            header: 'content-security-policy',
            name: 'CSP (Content-Security-Policy)',
            severity: 'high',
            recommendation: 'Implementa una política CSP estricta para prevenir XSS'
          },
          {
            header: 'x-content-type-options',
            name: 'X-Content-Type-Options',
            severity: 'medium',
            expectedValue: 'nosniff',
            recommendation: 'Añade: X-Content-Type-Options: nosniff'
          },
          {
            header: 'x-frame-options',
            name: 'X-Frame-Options',
            severity: 'medium',
            expectedValues: ['DENY', 'SAMEORIGIN'],
            recommendation: 'Añade: X-Frame-Options: DENY o SAMEORIGIN'
          },
          {
            header: 'x-xss-protection',
            name: 'X-XSS-Protection',
            severity: 'low',
            recommendation: 'Añade: X-XSS-Protection: 1; mode=block (aunque CSP es preferible)'
          },
          {
            header: 'referrer-policy',
            name: 'Referrer-Policy',
            severity: 'low',
            recommendation: 'Añade: Referrer-Policy: strict-origin-when-cross-origin'
          },
          {
            header: 'permissions-policy',
            name: 'Permissions-Policy',
            severity: 'low',
            recommendation: 'Añade una Permissions-Policy para controlar features del navegador'
          },
          {
            header: 'x-permitted-cross-domain-policies',
            name: 'X-Permitted-Cross-Domain-Policies',
            severity: 'low',
            recommendation: 'Añade: X-Permitted-Cross-Domain-Policies: none'
          }
        ];

        for (const sh of securityHeaders) {
          const headerValue = httpResult.headers[sh.header];
          
          if (headerValue) {
            // Verificar valor esperado si aplica
            let isCorrect = true;
            if (sh.expectedValue && headerValue.toLowerCase() !== sh.expectedValue.toLowerCase()) {
              isCorrect = false;
            }
            if (sh.expectedValues && !sh.expectedValues.some(v => headerValue.toUpperCase().includes(v))) {
              isCorrect = false;
            }

            if (isCorrect) {
              results.checks.push({
                category: 'Headers',
                check: sh.name,
                status: 'PASS',
                severity: 'info',
                details: `Presente: ${headerValue.substring(0, 100)}${headerValue.length > 100 ? '...' : ''}`
              });
              results.summary.passed++;
              progressLog(`✅ ${sh.name}\n`);
            } else {
              results.checks.push({
                category: 'Headers',
                check: sh.name,
                status: 'WARN',
                severity: sh.severity,
                details: `Valor incorrecto: ${headerValue.substring(0, 50)}`,
                recommendation: sh.recommendation
              });
              results.summary.failed++;
              results.summary.issues[sh.severity]++;
              progressLog(`⚠️ ${sh.name} (valor incorrecto)\n`);
            }
          } else {
            results.checks.push({
              category: 'Headers',
              check: sh.name,
              status: 'FAIL',
              severity: sh.severity,
              details: 'Header no presente',
              recommendation: sh.recommendation
            });
            results.summary.failed++;
            results.summary.issues[sh.severity]++;
            progressLog(`❌ ${sh.name} - Falta\n`);
          }
        }

        // Verificar información expuesta
        progressLog(`\n━━━ Información Expuesta ━━━\n`);
        
        const serverHeader = httpResult.headers['server'];
        if (serverHeader) {
          results.technologies.push({ type: 'Server', value: serverHeader });
          
          // Verificar si expone versión
          if (/[\d.]+/.test(serverHeader)) {
            results.checks.push({
              category: 'Information Disclosure',
              check: 'Server Header',
              status: 'WARN',
              severity: 'low',
              details: `Expone información del servidor: ${serverHeader}`,
              recommendation: 'Oculta la versión del servidor en producción'
            });
            results.summary.failed++;
            results.summary.issues.low++;
            progressLog(`⚠️ Server expone versión: ${serverHeader}\n`);
          } else {
            progressLog(`ℹ️ Server: ${serverHeader}\n`);
          }
        }

        const poweredBy = httpResult.headers['x-powered-by'];
        if (poweredBy) {
          results.technologies.push({ type: 'Framework', value: poweredBy });
          results.checks.push({
            category: 'Information Disclosure',
            check: 'X-Powered-By',
            status: 'FAIL',
            severity: 'medium',
            details: `Expone tecnología: ${poweredBy}`,
            recommendation: 'Elimina el header X-Powered-By'
          });
          results.summary.failed++;
          results.summary.issues.medium++;
          progressLog(`❌ X-Powered-By expone: ${poweredBy}\n`);
        }

        // ====================
        // 3. ANÁLISIS DE COOKIES
        // ====================
        progressLog(`\n━━━ Análisis de Cookies ━━━\n`);
        
        const setCookies = httpResult.rawHeaders?.filter((h, i) => 
          h.toLowerCase() === 'set-cookie' && httpResult.rawHeaders[i + 1]
        ) || [];

        if (httpResult.headers['set-cookie']) {
          const cookies = Array.isArray(httpResult.headers['set-cookie']) 
            ? httpResult.headers['set-cookie'] 
            : [httpResult.headers['set-cookie']];

          for (const cookieStr of cookies) {
            const cookieAnalysis = this._analyzeCookie(cookieStr, isHttps);
            results.cookies.push(cookieAnalysis);

            if (cookieAnalysis.issues.length > 0) {
              for (const issue of cookieAnalysis.issues) {
                results.checks.push({
                  category: 'Cookies',
                  check: `Cookie: ${cookieAnalysis.name}`,
                  status: 'FAIL',
                  severity: issue.severity,
                  details: issue.message,
                  recommendation: issue.recommendation
                });
                results.summary.failed++;
                results.summary.issues[issue.severity]++;
                progressLog(`❌ Cookie ${cookieAnalysis.name}: ${issue.message}\n`);
              }
            } else {
              results.checks.push({
                category: 'Cookies',
                check: `Cookie: ${cookieAnalysis.name}`,
                status: 'PASS',
                severity: 'info',
                details: 'Cookie configurada correctamente'
              });
              results.summary.passed++;
              progressLog(`✅ Cookie ${cookieAnalysis.name}: Segura\n`);
            }
          }
        } else {
          progressLog(`ℹ️ No se detectaron cookies\n`);
        }

        // ====================
        // 4. CORS
        // ====================
        progressLog(`\n━━━ Configuración CORS ━━━\n`);
        
        const corsHeader = httpResult.headers['access-control-allow-origin'];
        if (corsHeader === '*') {
          results.checks.push({
            category: 'CORS',
            check: 'Access-Control-Allow-Origin',
            status: 'WARN',
            severity: 'medium',
            details: 'CORS permite cualquier origen (*)',
            recommendation: 'Restringe CORS a orígenes específicos en producción'
          });
          results.summary.failed++;
          results.summary.issues.medium++;
          progressLog(`⚠️ CORS permite cualquier origen (*)\n`);
        } else if (corsHeader) {
          results.checks.push({
            category: 'CORS',
            check: 'Access-Control-Allow-Origin',
            status: 'PASS',
            severity: 'info',
            details: `CORS restringido a: ${corsHeader}`
          });
          results.summary.passed++;
          progressLog(`✅ CORS restringido: ${corsHeader}\n`);
        } else {
          progressLog(`ℹ️ Sin header CORS (bien para misma origen)\n`);
        }

        const corsCredentials = httpResult.headers['access-control-allow-credentials'];
        if (corsCredentials === 'true' && corsHeader === '*') {
          results.checks.push({
            category: 'CORS',
            check: 'CORS + Credentials',
            status: 'FAIL',
            severity: 'high',
            details: 'CORS permite credenciales con origen wildcard - PELIGROSO',
            recommendation: 'No uses Access-Control-Allow-Credentials: true con origen *'
          });
          results.summary.failed++;
          results.summary.issues.high++;
          progressLog(`❌ CORS permite credenciales con * - PELIGROSO\n`);
        }
      } else {
        results.error = httpResult.error;
        progressLog(`❌ Error obteniendo headers: ${httpResult.error}\n`);
      }

      // Calcular score final
      const maxScore = 100;
      const deductions = {
        critical: 25,
        high: 15,
        medium: 8,
        low: 3,
        info: 0
      };

      let score = maxScore;
      for (const [severity, count] of Object.entries(results.summary.issues)) {
        score -= count * (deductions[severity] || 0);
      }
      results.summary.score = Math.max(0, score);

      // Asignar grado
      if (results.summary.score >= 90) results.summary.grade = 'A';
      else if (results.summary.score >= 80) results.summary.grade = 'B';
      else if (results.summary.score >= 70) results.summary.grade = 'C';
      else if (results.summary.score >= 60) results.summary.grade = 'D';
      else if (results.summary.score >= 50) results.summary.grade = 'E';
      else results.summary.grade = 'F';

      // Generar recomendaciones prioritarias
      const criticalChecks = results.checks.filter(c => c.status === 'FAIL' && c.severity === 'critical');
      const highChecks = results.checks.filter(c => c.status === 'FAIL' && c.severity === 'high');

      for (const check of criticalChecks.slice(0, 3)) {
        if (check.recommendation) {
          results.recommendations.push({
            priority: 'CRITICAL',
            check: check.check,
            text: check.recommendation
          });
        }
      }
      for (const check of highChecks.slice(0, 3)) {
        if (check.recommendation) {
          results.recommendations.push({
            priority: 'HIGH',
            check: check.check,
            text: check.recommendation
          });
        }
      }

      results.scanTime = Date.now() - startTime;

      progressLog(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      progressLog(`✅ Análisis completado en ${(results.scanTime / 1000).toFixed(2)}s\n`);
      progressLog(`📊 Score: ${results.summary.score}/100 (Grado: ${results.summary.grade})\n`);
      progressLog(`✓ Checks pasados: ${results.summary.passed}\n`);
      progressLog(`✗ Checks fallidos: ${results.summary.failed}\n`);
      progressLog(`   🔴 Críticos: ${results.summary.issues.critical}\n`);
      progressLog(`   🟠 Altos: ${results.summary.issues.high}\n`);
      progressLog(`   🟡 Medios: ${results.summary.issues.medium}\n`);
      progressLog(`   🟢 Bajos: ${results.summary.issues.low}\n`);

    } catch (err) {
      results.error = err.message;
      progressLog(`\n❌ Error: ${err.message}\n`);
    }

    return results;
  }

  /**
   * Fetch con detalles completos (headers, cookies, etc.)
   * @private
   */
  async _fetchWithDetails(url, timeout = 10000) {
    return new Promise((resolve) => {
      try {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
          method: 'GET',
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          timeout,
          headers: {
            'User-Agent': 'NodeTerm-SecurityScanner/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
          },
          rejectUnauthorized: false // Para poder analizar sitios con certificados inválidos
        };

        const req = protocol.request(options, (res) => {
          resolve({
            success: true,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            rawHeaders: res.rawHeaders
          });
          res.destroy(); // No necesitamos el body
        });

        req.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false, error: 'Timeout de conexión' });
        });

        req.end();
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  }

  /**
   * Analizar una cookie
   * @private
   */
  _analyzeCookie(cookieStr, isHttps) {
    const parts = cookieStr.split(';').map(p => p.trim());
    const [nameValue, ...attributes] = parts;
    const [name] = nameValue.split('=');

    const analysis = {
      name: name || 'unknown',
      raw: cookieStr,
      flags: {
        httpOnly: false,
        secure: false,
        sameSite: null
      },
      issues: []
    };

    for (const attr of attributes) {
      const lowerAttr = attr.toLowerCase();
      if (lowerAttr === 'httponly') {
        analysis.flags.httpOnly = true;
      } else if (lowerAttr === 'secure') {
        analysis.flags.secure = true;
      } else if (lowerAttr.startsWith('samesite=')) {
        analysis.flags.sameSite = attr.split('=')[1];
      }
    }

    // Verificar problemas
    if (!analysis.flags.httpOnly) {
      analysis.issues.push({
        severity: 'medium',
        message: 'Falta flag HttpOnly - vulnerable a XSS',
        recommendation: 'Añade el flag HttpOnly para prevenir acceso desde JavaScript'
      });
    }

    if (isHttps && !analysis.flags.secure) {
      analysis.issues.push({
        severity: 'high',
        message: 'Falta flag Secure en conexión HTTPS',
        recommendation: 'Añade el flag Secure para que la cookie solo se envíe por HTTPS'
      });
    }

    if (!analysis.flags.sameSite) {
      analysis.issues.push({
        severity: 'medium',
        message: 'Falta atributo SameSite - posible CSRF',
        recommendation: 'Añade SameSite=Strict o SameSite=Lax para prevenir CSRF'
      });
    } else if (analysis.flags.sameSite.toLowerCase() === 'none' && !analysis.flags.secure) {
      analysis.issues.push({
        severity: 'high',
        message: 'SameSite=None requiere flag Secure',
        recommendation: 'Añade el flag Secure cuando uses SameSite=None'
      });
    }

    return analysis;
  }

  /**
   * Get local network interfaces
   * @returns {Object} Network interfaces information
   */
  getNetworkInterfaces() {
    try {
      const interfaces = os.networkInterfaces();
      const result = [];

      // Validar que interfaces es un objeto válido
      if (!interfaces || typeof interfaces !== 'object') {
        console.warn('[NetworkToolsService] os.networkInterfaces() devolvió un valor inválido');
        return {
          success: true,
          interfaces: []
        };
      }

      for (const [name, addrs] of Object.entries(interfaces)) {
        if (!addrs || !Array.isArray(addrs)) continue;

        for (const addr of addrs) {
          if (!addr || typeof addr !== 'object') continue;
          if (addr.internal) continue; // Skip loopback

          result.push({
            name: name || 'unknown',
            address: addr.address || '',
            netmask: addr.netmask || '',
            family: addr.family || 'IPv4',
            mac: addr.mac || '',
            cidr: addr.cidr || null
          });
        }
      }

      // Smart sorting to put the primary active physical interface first
      result.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        // 1. Penalize virtual interfaces
        const virtualKeywords = ['virtual', 'vbox', 'vmware', 'wsl', 'docker', 'vethernet', 'tap', 'tun', 'vpn', 'loopback', 'br-', 'veth', 'host-only'];
        const isVirtualA = virtualKeywords.some(kw => nameA.includes(kw));
        const isVirtualB = virtualKeywords.some(kw => nameB.includes(kw));

        if (isVirtualA && !isVirtualB) return 1;
        if (!isVirtualA && isVirtualB) return -1;

        // 2. Prefer IPv4 over IPv6
        if (a.family === 'IPv4' && b.family !== 'IPv4') return -1;
        if (a.family !== 'IPv4' && b.family === 'IPv4') return 1;

        // 3. Prefer names that resemble Wi-Fi or Ethernet
        const physicalKeywords = ['wi-fi', 'wifi', 'wlan', 'ethernet', 'eth', 'en', 'wl', 'conexi'];
        const isPhysicalA = physicalKeywords.some(kw => nameA.includes(kw));
        const isPhysicalB = physicalKeywords.some(kw => nameB.includes(kw));

        if (isPhysicalA && !isPhysicalB) return -1;
        if (!isPhysicalA && isPhysicalB) return 1;

        // 4. Prefer standard home LAN range (192.168.x.x)
        const isCommonA = a.address.startsWith('192.168.');
        const isCommonB = b.address.startsWith('192.168.');
        if (isCommonA && !isCommonB) return -1;
        if (!isCommonA && isCommonB) return 1;

        return 0;
      });

      return {
        success: true,
        interfaces: result
      };
    } catch (err) {
      console.error('[NetworkToolsService] Error obteniendo interfaces de red:', err);
      return {
        success: false,
        error: err?.message || 'Error desconocido al obtener interfaces de red',
        interfaces: []
      };
    }
  }

  /**
   * Encontrar IP a partir de una dirección MAC buscando en la tabla ARP
   * @param {string} mac - MAC Address
   * @returns {Promise<Object>} IP address resolved
   */
  async findIpByMac(mac) {
    if (!mac || typeof mac !== 'string') {
      return { success: false, error: 'MAC inválida' };
    }
    const cleanMac = mac.replace(/[:-]/g, '').toUpperCase();

    return new Promise((resolve) => {
      exec('arp -a', { timeout: 5000 }, (err, stdout, stderr) => {
        if (err) {
          return resolve({ success: false, error: err.message });
        }

        const lines = stdout.split('\n');
        for (const line of lines) {
          const trimmed = line.trim().toLowerCase();
          const cleanLine = trimmed.replace(/[:-]/g, '');

          if (cleanLine.includes(cleanMac.toLowerCase())) {
            const ipMatch = trimmed.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            if (ipMatch) {
              return resolve({ success: true, ip: ipMatch[1] });
            }
          }
        }

        resolve({ success: false, error: 'No se encontró la dirección IP en la tabla ARP' });
      });
    });
  }
}

module.exports = NetworkToolsService;
