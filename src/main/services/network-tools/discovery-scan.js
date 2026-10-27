const { exec, execFile, spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const dns = require('dns').promises;
const tls = require('tls');
const https = require('https');
const http = require('http');
const dgram = require('dgram');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);
const sslCertAnalyzer = require('../ssl/sslCertAnalyzer');

const methods = {};


  /**
   * Ping a host with statistics
   * @param {string} host - Host or IP to ping
   * @param {number} count - Number of pings (default: 4)
   * @param {number} timeout - Timeout in seconds (default: 5)
   * @param {Function} onProgress - Callback para actualizaciones en tiempo real (data: string)
   * @returns {Promise<Object>} Ping results
   */
methods.ping = async function(host, count = 4, timeout = 5, onProgress = null) {
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
  };


  /**
   * Scan ports on a host
   * @param {string} host - Host to scan
   * @param {string|Array} ports - Ports to scan (e.g., "80,443" or "1-1024" or [80, 443])
   * @param {number} timeout - Timeout per port in ms (default: 2000)
   * @returns {Promise<Object>} Scan results
   */
methods.portScan = async function(host, ports = '1-1024', timeout = 2000, onProgress = null) {
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
  };


  /**
   * Scan a single port
   * @private
   */
methods._scanPort = function(host, port, timeout) {
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
  };


  /**
   * Parse port specification into array
   * @private
   */
methods._parsePorts = function(ports) {
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
  };


  /**
   * Get common service name for a port
   * @private
   */
methods._getServiceName = function(port) {
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
  };


  /**
   * DNS Lookup
   * @param {string} domain - Domain to lookup
   * @param {string} type - Record type (A, AAAA, MX, TXT, NS, SOA, CNAME, SRV)
   * @returns {Promise<Object>} DNS results
   */
methods.dnsLookup = async function(domain, type = 'A') {
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
  };


  /**
   * Reverse DNS lookup
   * @param {string} ip - IP address
   * @returns {Promise<Object>} Reverse DNS results
   */
methods.reverseDns = async function(ip) {
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
  };


  /**
   * Check SSL/TLS certificate with comprehensive protocol and cipher testing
   * @param {string} host - Host to check
   * @param {number} port - Port (default: 443)
   * @returns {Promise<Object>} SSL certificate info
   */
methods.sslCheck = async function(host, port = 443) {
    if (!host || typeof host !== 'string') {
      return { success: false, error: 'Host inválido' };
    }

    const parsedTarget = sslCertAnalyzer.parseSslTarget(host, port);
    const sanitizedHost = parsedTarget.host;
    const targetPort = parsedTarget.port;
    const results = {
      success: false,
      host: sanitizedHost,
      port: targetPort,
      certificate: null,
      chain: [],
      trust: null,
      supportedProtocols: [],
      testedProtocols: [],
      ciphers: [],
      security: {
        hasWeakProtocols: false,
        hasWeakCiphers: false,
        recommendations: [],
        score: 0,
        grade: 'F',
        breakdown: { protocol: 0, key: 0, cipher: 0 },
        riskLevel: 'ALTO'
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
          port: targetPort,
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
        port: targetPort,
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

            const analyzed = sslCertAnalyzer.analyzeCertificate(defaultSocket, cert, sanitizedHost);
            results.certificate = analyzed.certificate;
            results.trust = analyzed.trust;
            results.chain = sslCertAnalyzer.buildChain(cert);

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

          const assessment = sslCertAnalyzer.computeSecurityAssessment({
            trust: results.trust,
            daysUntilExpiry: results.certificate ? results.certificate.daysUntilExpiry : 0,
            supportedProtocols: results.supportedProtocols,
            certificate: results.certificate,
            negotiatedCipher: results.protocols && results.protocols.cipher
          });
          results.security.score = assessment.score;
          results.security.grade = assessment.grade;
          results.security.breakdown = assessment.breakdown;
          results.security.riskLevel = assessment.riskLevel;
          results.security.recommendations = sslCertAnalyzer.buildRecommendations({
            trust: results.trust,
            certificate: results.certificate,
            hasWeakProtocols: results.security.hasWeakProtocols,
            supportedProtocols: results.supportedProtocols
          });

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
  };


  /**
   * WHOIS lookup
   * @param {string} domain - Domain to lookup
   * @param {Function} onProgress - Callback para actualizaciones en tiempo real (data: string)
   * @returns {Promise<Object>} WHOIS results
   */
methods.whois = async function(domain, onProgress = null) {
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
  };


  /**
   * Parse WHOIS output
   * @private
   */
methods._parseWhois = function(data) {
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
  };


  /**
   * Traceroute to a host
   * @param {string} host - Destination host
   * @param {number} maxHops - Maximum hops (default: 30)
   * @param {Function} onProgress - Callback para actualizaciones en tiempo real (data: string)
   * @returns {Promise<Object>} Traceroute results
   */
methods.traceroute = async function(host, maxHops = 30, onProgress = null) {
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
  };


  /**
   * Get HTTP headers from a URL
   * @param {string} url - URL to check
   * @returns {Promise<Object>} HTTP headers
   */
methods.httpHeaders = async function(url) {
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'URL invalida' };
    }

    let sanitizedUrl = url.trim();
    if (!sanitizedUrl.startsWith('http://') && !sanitizedUrl.startsWith('https://')) {
      sanitizedUrl = 'https://' + sanitizedUrl;
    }

    const urlGuard = this._assertHttpToolUrl(sanitizedUrl);
    if (!urlGuard.ok) {
      return { success: false, error: `URL bloqueada: ${urlGuard.error}` };
    }

    const startTime = Date.now();
    const results = {
      success: false,
      url: sanitizedUrl,
      finalUrl: sanitizedUrl,
      method: 'HEAD',
      statusCode: null,
      statusMessage: null,
      headers: {},
      securityHeaders: {},
      timing: {},
      error: null
    };

    let currentUrl = sanitizedUrl;
    let method = 'HEAD';
    let triedGetFallback = false;
    const maxHops = 6;

    for (let hop = 0; hop < maxHops; hop++) {
      const response = await this._requestHttpHeaders(currentUrl, method);

      if (!response.success) {
        if (method === 'HEAD' && !triedGetFallback) {
          method = 'GET';
          triedGetFallback = true;
          continue;
        }
        results.error = response.error || 'Error al obtener cabeceras HTTP';
        results.method = method;
        results.finalUrl = currentUrl;
        results.timing.responseTime = Date.now() - startTime;
        return results;
      }

      const headerCount = Object.keys(response.headers || {}).length;
      const shouldFallbackGet = method === 'HEAD' && !triedGetFallback && (
        response.statusCode === 405 ||
        response.statusCode === 501 ||
        headerCount === 0
      );

      if (shouldFallbackGet) {
        method = 'GET';
        triedGetFallback = true;
        continue;
      }

      const isRedirect = response.statusCode >= 300 && response.statusCode < 400 && response.location;
      if (isRedirect && hop < maxHops - 1) {
        try {
          const nextUrl = new URL(response.location, currentUrl).toString();
          const redirectGuard = this._assertHttpToolUrl(nextUrl);
          if (!redirectGuard.ok) {
            results.error = `Redirección bloqueada: ${redirectGuard.error}`;
            results.finalUrl = currentUrl;
            results.timing.responseTime = Date.now() - startTime;
            return results;
          }
          currentUrl = nextUrl;
          method = 'HEAD';
          triedGetFallback = false;
          continue;
        } catch (_) {
          // Si Location no es valida, devolver la respuesta actual
        }
      }

      results.success = true;
      results.finalUrl = currentUrl;
      results.method = method;
      results.statusCode = response.statusCode;
      results.statusMessage = response.statusMessage;
      results.headers = response.headers;
      results.securityHeaders = this._buildSecurityHeaders(response.headers);
      results.timing.responseTime = Date.now() - startTime;
      return results;
    }

    results.error = 'Demasiadas redirecciones';
    results.finalUrl = currentUrl;
    results.method = method;
    results.timing.responseTime = Date.now() - startTime;
    return results;
  };


  /**
   * Clone IncomingHttpHeaders into a plain IPC-safe object
   * @private
   */
methods._flattenHttpHeaders = function(headers) {
    const flat = {};
    if (!headers || typeof headers !== 'object') {
      return flat;
    }
    for (const [key, value] of Object.entries(headers)) {
      if (value == null) continue;
      flat[key] = Array.isArray(value) ? value.join(', ') : String(value);
    }
    return flat;
  };


  /**
   * Extract well-known security headers from a flat headers object
   * @private
   */
methods._buildSecurityHeaders = function(headers) {
    const lower = {};
    for (const [key, value] of Object.entries(headers || {})) {
      lower[String(key).toLowerCase()] = value;
    }
    return {
      'Strict-Transport-Security': lower['strict-transport-security'] || null,
      'Content-Security-Policy': lower['content-security-policy'] || null,
      'X-Content-Type-Options': lower['x-content-type-options'] || null,
      'X-Frame-Options': lower['x-frame-options'] || null,
      'X-XSS-Protection': lower['x-xss-protection'] || null,
      'Referrer-Policy': lower['referrer-policy'] || null,
      'Permissions-Policy': lower['permissions-policy'] || null
    };
  };


  /**
   * HTTPS agent that skips certificate validation (VPN/IoT/self-signed).
   * Request-level rejectUnauthorized is ignored by https.globalAgent in Electron.
   * @private
   */
methods._getInsecureHttpsAgent = function() {
    if (!this._insecureHttpsAgent) {
      this._insecureHttpsAgent = new https.Agent({
        keepAlive: false,
        maxSockets: 8,
        rejectUnauthorized: false
      });
    }
    return this._insecureHttpsAgent;
  };


  /**
   * Single HTTP/HTTPS request used by httpHeaders
   * @private
   */
methods._requestHttpHeaders = function(url, method, timeout = 10000) {
    return new Promise((resolve) => {
      try {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const protocol = isHttps ? https : http;
        const port = parsedUrl.port || (isHttps ? 443 : 80);
        const options = {
          method,
          hostname: parsedUrl.hostname,
          port,
          path: (parsedUrl.pathname || '/') + parsedUrl.search,
          timeout,
          headers: {
            'User-Agent': 'NodeTerm-NetworkTools/1.0',
            'Accept': '*/*'
          },
          rejectUnauthorized: false,
          servername: parsedUrl.hostname,
          checkServerIdentity: () => undefined
        };

        if (isHttps) {
          options.agent = this._getInsecureHttpsAgent();
          options.createConnection = (connectOpts, callback) => {
            const socket = tls.connect({
              host: parsedUrl.hostname,
              port: Number(port),
              servername: parsedUrl.hostname,
              rejectUnauthorized: false,
              timeout
            }, () => {
              socket.setTimeout(0);
              if (typeof callback === 'function') {
                callback(null, socket);
              }
            });
            socket.on('error', (err) => {
              if (typeof callback === 'function') {
                callback(err);
              }
            });
            return socket;
          };
        }

        const req = protocol.request(options, (res) => {
          const headers = this._flattenHttpHeaders(res.headers);
          const location = res.headers && (res.headers.location || res.headers.Location);
          if (method === 'GET') {
            res.resume();
            res.destroy();
          }
          resolve({
            success: true,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers,
            location
          });
        });

        req.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false, error: 'Timeout de conexion' });
        });

        req.end();
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  };


  /**
   * Calculate subnet information
   * @param {string} cidr - CIDR notation (e.g., "192.168.1.0/24")
   * @returns {Object} Subnet information
   */
methods.subnetCalc = function(cidr) {
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
  };


  /**
   * Convert IP string to integer
   * @private
   */
methods._ipToInt = function(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  };


  /**
   * Convert integer to IP string
   * @private
   */
methods._intToIp = function(int) {
    return [
      (int >>> 24) & 255,
      (int >>> 16) & 255,
      (int >>> 8) & 255,
      int & 255
    ].join('.');
  };


  /**
   * Get IP class
   * @private
   */
methods._getIpClass = function(firstOctet) {
    if (firstOctet < 128) return 'A';
    if (firstOctet < 192) return 'B';
    if (firstOctet < 224) return 'C';
    if (firstOctet < 240) return 'D (Multicast)';
    return 'E (Reserved)';
  };


  /**
   * Check if IP is private
   * @private
   */
methods._isPrivateIp = function(octets) {
    if (octets[0] === 10) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 127) return true;
    return false;
  };


  /**
   * Wake on LAN - Send magic packet
   * @param {string} mac - MAC address
   * @param {string} broadcast - Broadcast address (default: 255.255.255.255)
   * @param {number} port - Port (default: 9)
   * @returns {Promise<Object>} Result
   */
methods.wakeOnLan = async function(mac, broadcast = '255.255.255.255', port = 9) {
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
  };


  /**
   * Ruta a nmap.exe si está instalado
   * @private
   */
methods._getNmapPath = async function() {
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
  };


  /**
   * Tabla vecinos Windows vía Get-NetNeighbor (más fiable que arp -a)
   * @private
   */
methods._readWindowsNeighborTable = async function() {
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
  };


  /**
   * MAC de un IP concreto (PowerShell)
   * @private
   */
methods._getMacFromNetNeighbor = async function(ip) {
    if (this.platform !== 'win32') return null;
    const cleanIp = typeof ip === 'string' ? ip.trim() : '';
    if (!this._isValidIp(cleanIp)) return null;

    const ps = `Get-NetNeighbor -IPAddress '${cleanIp}' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty LinkLayerAddress`;
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
  };


  /**
   * Lee tabla ARP clásica (arp -a / ip neigh)
   * @private
   */
methods._readArpTableClassic = async function() {
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
  };


  /**
   * Tabla IP -> MAC combinando todas las fuentes del SO
   * @private
   */
methods._readNeighborTable = async function() {
    const merged = {};

    if (this.platform === 'win32') {
      Object.assign(merged, await this._readWindowsNeighborTable());
    }

    Object.assign(merged, await this._readArpTableClassic());
    return merged;
  };


  /** @private */
methods._readArpTable = async function() {
    return this._readNeighborTable();
  };


  /**
   * Hostname vía nslookup (Windows / entornos AD)
   * @private
   */
methods._resolveHostnameNslookup = async function(ip) {
    const cleanIp = typeof ip === 'string' ? ip.trim() : '';
    if (!this._isValidIp(cleanIp)) return null;

    try {
      const { stdout } = await execAsync(`nslookup ${cleanIp}`, { timeout: 6000, shell: true });
      const nameMatch = stdout.match(/^\s*Nombre:\s*(.+)$/im) || stdout.match(/^\s*Name:\s*(.+)$/im);
      if (!nameMatch) return null;
      const name = nameMatch[1].trim().replace(/\.$/, '');
      if (!name || name === cleanIp || /servidor|server|address/i.test(name)) return null;
      return name;
    } catch {
      return null;
    }
  };


  /**
   * Enriquecimiento con nmap (MAC, fabricante, SO, hostname)
   * @private
   */
methods._nmapEnrichHost = async function(ip) {
    const cleanIp = typeof ip === 'string' ? ip.trim() : '';
    if (!this._isValidIp(cleanIp)) return null;

    const nmap = await this._getNmapPath();
    if (!nmap) return null;

    const quoted = nmap.includes(' ') ? `"${nmap}"` : nmap;
    const cmd = [
      quoted,
      '-sn', '-PR', '-Pn', '-n',
      '-O', '--osscan-guess', '--max-os-tries', '1',
      '-F', '--host-timeout', '12s',
      cleanIp
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
  };


  /**
   * @private
   */
methods._parseNmapHostOutput = function(stdout, ip) {
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
  };


  /**
   * Resuelve MAC (ping + vecinos + nmap)
   * @private
   */
methods._resolveMacForHost = async function(ip, neighborTable, nmapEnabled = true) {
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
  };


  /**
   * @private
   */
methods._normalizeMacAddress = function(mac) {
    if (!mac) return null;
    const clean = mac.replace(/[^0-9a-f]/gi, '').toUpperCase();
    if (clean.length !== 12) return null;
    return clean.match(/.{2}/g).join(':');
  };


  /**
   * @private
   */
methods._isInvalidMac = function(mac) {
    if (!mac) return true;
    const clean = mac.replace(/[^0-9A-F]/g, '');
    return clean === '000000000000' || clean === 'FFFFFFFFFFFF' || clean.startsWith('01005E');
  };


  /**
   * Lookup fabricante por prefijo OUI (MAC)
   * @private
   */
methods._lookupMacVendor = function(mac) {
    if (!mac) return null;
    const prefix = mac.replace(/[^0-9A-F]/gi, '').substring(0, 6).toUpperCase();
    const vendors = this._getOuiVendorMap();
    return vendors[prefix] || null;
  };


  /**
   * @private
   */
methods._getOuiVendorMap = function() {
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
  };


  /**
   * @private
   */
methods._extractTtlFromPingOutput = function(output) {
    if (!output) return null;
    const match = output.match(/TTL[=<]\s*(\d+)/i) || output.match(/ttl[=<]\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  };


  /**
   * Sonda rápida de puertos comunes para fingerprint
   * @private
   */
methods._quickProbePorts = async function(ip, ports = [22, 80, 135, 139, 443, 445, 3389, 548, 5357], timeout = 600) {
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
  };


  /**
   * NetBIOS / nbtstat (Windows)
   * @private
   */
methods._getNetbiosInfo = async function(ip) {
    if (this.platform !== 'win32') {
      return { name: null, group: null, mac: null };
    }

    const cleanIp = typeof ip === 'string' ? ip.trim() : '';
    if (!this._isValidIp(cleanIp)) {
      return { name: null, group: null, mac: null };
    }

    return new Promise((resolve) => {
      execFile('nbtstat', ['-A', cleanIp], { timeout: 25000, maxBuffer: 1024 * 1024, encoding: 'buffer', windowsHide: true }, (err, stdoutBuf) => {
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
  };


  /**
   * Obtiene banners ligeros para inferir SO
   * @private
   */
methods._probeOsBanners = async function(ip, openPorts) {
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
  };


  /**
   * Infiere sistema operativo a partir de señales recolectadas
   * @private
   */
methods._guessOperatingSystem = function({ ttl, openPorts = [], vendor, netbiosName, banners = {} }) {
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
  };


  /**
   * Enriquece un host descubierto con MAC, hostname, SO, etc.
   * @private
   */
methods._enrichDiscoveredHost = async function(host, neighborTable, onProgress, options = {}) {
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
  };


  /**
   * Enriquecimiento ligero (modo rápido): ARP, DNS inverso y hostname básico.
   * @private
   */
methods._enrichDiscoveredHostQuick = async function(host, neighborTable, onProgress) {
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
  };


  /**
   * Network scan - Discover hosts in a subnet
   * @param {string} subnet - Subnet in CIDR notation (e.g., "192.168.1.0/24")
   * @param {number} timeout - Timeout per host in ms (default: 1000)
   * @param {Function} onProgress - Callback para actualizaciones en tiempo real (data: string)
   * @param {Object} options - { mode: 'quick' | 'full' }
   * @returns {Promise<Object>} Discovered hosts
   */
methods.networkScan = async function(subnet, timeout = 1000, onProgress = null, options = {}) {
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
  };


  /**
   * Quick ping using TCP connection (faster than ICMP ping)
   * @private
   */
  /**
   * Ping a host using the OS ping command
   * @private
   */
methods._pingHostNative = function(ip, timeoutMs) {
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
  };


  /**
   * Quick check on a TCP port
   * @private
   */
methods._checkTcpPort = function(ip, port, timeoutMs) {
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
  };


  /**
   * Quick ping using hybrid TCP and ICMP methods
   * @private
   */
methods._quickPing = function(ip, timeout, options = {}) {
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
  };

module.exports = methods;
