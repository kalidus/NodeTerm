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
const net = require('net');
const dns = require('dns').promises;
const tls = require('tls');
const https = require('https');
const http = require('http');
const dgram = require('dgram');
const os = require('os');

class NetworkToolsService {
  constructor() {
    this.platform = process.platform;
  }

  /**
   * Ping a host with statistics
   * @param {string} host - Host or IP to ping
   * @param {number} count - Number of pings (default: 4)
   * @param {number} timeout - Timeout in seconds (default: 5)
   * @returns {Promise<Object>} Ping results
   */
  async ping(host, count = 4, timeout = 5) {
    return new Promise((resolve) => {
      if (!host || typeof host !== 'string') {
        return resolve({ success: false, error: 'Host inválido' });
      }

      const sanitizedHost = host.trim().replace(/[;&|`$]/g, '');
      let command;
      let args;

      if (this.platform === 'win32') {
        command = 'ping';
        args = ['-n', count.toString(), '-w', (timeout * 1000).toString(), sanitizedHost];
      } else {
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
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        results.rawOutput = output;
        results.duration = Date.now() - startTime;

        // Parse output based on platform
        if (this.platform === 'win32') {
          // Windows ping output parsing
          const timeMatches = output.match(/tiempo[=<](\d+)ms/gi) || output.match(/time[=<](\d+)ms/gi);
          if (timeMatches) {
            results.times = timeMatches.map(m => parseInt(m.match(/\d+/)[0]));
            results.received = results.times.length;
          }

          const statsMatch = output.match(/Perdidos\s*=\s*(\d+)/i) || output.match(/Lost\s*=\s*(\d+)/i);
          if (statsMatch) {
            results.lost = parseInt(statsMatch[1]);
          }

          const avgMatch = output.match(/Media\s*=\s*(\d+)ms/i) || output.match(/Average\s*=\s*(\d+)ms/i);
          if (avgMatch) {
            results.avg = parseInt(avgMatch[1]);
          }
        } else {
          // Linux/Mac ping output parsing
          const timeMatches = output.match(/time=(\d+\.?\d*)\s*ms/gi);
          if (timeMatches) {
            results.times = timeMatches.map(m => parseFloat(m.match(/[\d.]+/)[0]));
            results.received = results.times.length;
          }

          const statsMatch = output.match(/(\d+)\s*packets?\s*transmitted,\s*(\d+)\s*(?:packets?\s*)?received/i);
          if (statsMatch) {
            results.sent = parseInt(statsMatch[1]);
            results.received = parseInt(statsMatch[2]);
          }

          const rttMatch = output.match(/rtt\s+min\/avg\/max\/\w+\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/i);
          if (rttMatch) {
            results.min = parseFloat(rttMatch[1]);
            results.avg = parseFloat(rttMatch[2]);
            results.max = parseFloat(rttMatch[3]);
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
        results.error = err.message;
        resolve(results);
      });
    });
  }

  /**
   * Scan ports on a host
   * @param {string} host - Host to scan
   * @param {string|Array} ports - Ports to scan (e.g., "80,443" or "1-1024" or [80, 443])
   * @param {number} timeout - Timeout per port in ms (default: 2000)
   * @returns {Promise<Object>} Scan results
   */
  async portScan(host, ports = '1-1024', timeout = 2000) {
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

    // Split ports into chunks for concurrent scanning
    for (let i = 0; i < portList.length; i += concurrency) {
      const chunk = portList.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(port => this._scanPort(sanitizedHost, port, timeout))
      );

      chunkResults.forEach((result, index) => {
        const port = chunk[index];
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
   * Check SSL/TLS certificate
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
      protocols: [],
      error: null
    };

    return new Promise((resolve) => {
      const options = {
        host: sanitizedHost,
        port: port,
        servername: sanitizedHost,
        rejectUnauthorized: false,
        timeout: 10000
      };

      const socket = tls.connect(options, () => {
        try {
          const cert = socket.getPeerCertificate(true);
          const protocol = socket.getProtocol();
          const cipher = socket.getCipher();

          if (cert && cert.subject) {
            results.success = true;
            results.certificate = {
              subject: cert.subject,
              issuer: cert.issuer,
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              serialNumber: cert.serialNumber,
              fingerprint: cert.fingerprint,
              fingerprint256: cert.fingerprint256,
              subjectAltNames: cert.subjectaltname ? cert.subjectaltname.split(', ') : [],
              isValid: socket.authorized,
              daysUntilExpiry: Math.floor((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24))
            };

            results.protocols = {
              version: protocol,
              cipher: cipher ? cipher.name : null,
              cipherVersion: cipher ? cipher.version : null
            };

            // Get certificate chain
            let currentCert = cert;
            while (currentCert && currentCert.issuerCertificate && 
                   currentCert.issuerCertificate !== currentCert) {
              results.chain.push({
                subject: currentCert.issuerCertificate.subject,
                issuer: currentCert.issuerCertificate.issuer
              });
              currentCert = currentCert.issuerCertificate;
            }
          }
        } catch (err) {
          results.error = err.message;
        }

        socket.end();
        resolve(results);
      });

      socket.on('error', (err) => {
        results.error = err.message;
        resolve(results);
      });

      socket.on('timeout', () => {
        results.error = 'Timeout de conexión';
        socket.destroy();
        resolve(results);
      });
    });
  }

  /**
   * WHOIS lookup
   * @param {string} domain - Domain to lookup
   * @returns {Promise<Object>} WHOIS results
   */
  async whois(domain) {
    if (!domain || typeof domain !== 'string') {
      return { success: false, error: 'Dominio inválido' };
    }

    const sanitizedDomain = domain.trim().toLowerCase().replace(/[;&|`$]/g, '');

    return new Promise((resolve) => {
      const results = {
        success: false,
        domain: sanitizedDomain,
        rawData: '',
        parsed: {},
        error: null
      };

      const command = this.platform === 'win32' ? 'whois' : 'whois';
      const args = [sanitizedDomain];

      const child = spawn(command, args, { timeout: 30000 });
      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
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
          results.error = 'El comando whois no está disponible en este sistema';
        } else {
          results.error = err.message;
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
   * @returns {Promise<Object>} Traceroute results
   */
  async traceroute(host, maxHops = 30) {
    if (!host || typeof host !== 'string') {
      return { success: false, error: 'Host inválido' };
    }

    const sanitizedHost = host.trim().replace(/[;&|`$]/g, '');

    return new Promise((resolve) => {
      const results = {
        success: false,
        host: sanitizedHost,
        hops: [],
        rawOutput: '',
        error: null
      };

      let command, args;

      if (this.platform === 'win32') {
        command = 'tracert';
        args = ['-h', maxHops.toString(), '-w', '3000', sanitizedHost];
      } else {
        command = 'traceroute';
        args = ['-m', maxHops.toString(), '-w', '3', sanitizedHost];
      }

      const child = spawn(command, args, { timeout: 120000 });
      let output = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        results.rawOutput = output;

        // Parse traceroute output
        const lines = output.split('\n');
        let hopNumber = 0;

        for (const line of lines) {
          // Windows format: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
          // Linux format: " 1  192.168.1.1 (192.168.1.1)  0.123 ms  0.456 ms  0.789 ms"
          const winMatch = line.match(/^\s*(\d+)\s+(?:(\*|<?\d+)\s*ms\s+)?(?:(\*|<?\d+)\s*ms\s+)?(?:(\*|<?\d+)\s*ms\s+)?(.+)?$/);
          const linuxMatch = line.match(/^\s*(\d+)\s+(.+?)\s+\(?([\d.]+)\)?\s+([\d.]+)\s*ms/);

          if (winMatch && winMatch[1]) {
            hopNumber = parseInt(winMatch[1]);
            const times = [winMatch[2], winMatch[3], winMatch[4]]
              .filter(t => t && t !== '*')
              .map(t => t.replace('<', '').replace('ms', '').trim())
              .map(t => parseFloat(t) || 0);

            const hostInfo = winMatch[5] ? winMatch[5].trim() : '*';

            results.hops.push({
              hop: hopNumber,
              host: hostInfo !== '*' ? hostInfo : null,
              times: times,
              avgTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null,
              timeout: hostInfo === '*' || times.length === 0
            });
          } else if (linuxMatch) {
            hopNumber = parseInt(linuxMatch[1]);
            const hostName = linuxMatch[2].trim();
            const ip = linuxMatch[3];
            const time = parseFloat(linuxMatch[4]);

            results.hops.push({
              hop: hopNumber,
              host: hostName,
              ip: ip,
              times: [time],
              avgTime: time,
              timeout: false
            });
          }
        }

        results.success = results.hops.length > 0;
        if (!results.success && !results.error) {
          results.error = 'No se pudieron obtener resultados del traceroute';
        }

        resolve(results);
      });

      child.on('error', (err) => {
        if (err.code === 'ENOENT') {
          results.error = 'El comando traceroute/tracert no está disponible';
        } else {
          results.error = err.message;
        }
        resolve(results);
      });
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

    return new Promise((resolve) => {
      try {
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

        // Create UDP socket and send
        const socket = dgram.createSocket('udp4');

        socket.on('error', (err) => {
          socket.close();
          resolve({ success: false, error: err.message });
        });

        socket.bind(() => {
          socket.setBroadcast(true);
          socket.send(magicPacket, 0, magicPacket.length, port, broadcast, (err) => {
            socket.close();
            if (err) {
              resolve({ success: false, error: err.message });
            } else {
              resolve({
                success: true,
                mac: mac,
                broadcast: broadcast,
                port: port,
                message: 'Magic packet enviado correctamente'
              });
            }
          });
        });
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  }

  /**
   * Network scan - Discover hosts in a subnet
   * @param {string} subnet - Subnet in CIDR notation (e.g., "192.168.1.0/24")
   * @param {number} timeout - Timeout per host in ms (default: 1000)
   * @returns {Promise<Object>} Discovered hosts
   */
  async networkScan(subnet, timeout = 1000) {
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

    const results = {
      success: true,
      subnet: subnet,
      subnetInfo: subnetInfo,
      hosts: [],
      scanTime: 0,
      scannedCount: 0
    };

    const startTime = Date.now();
    const startIp = this._ipToInt(subnetInfo.firstHost);
    const endIp = this._ipToInt(subnetInfo.lastHost);
    const concurrency = 50;

    const ipList = [];
    for (let ip = startIp; ip <= endIp; ip++) {
      ipList.push(this._intToIp(ip));
    }

    // Scan in batches
    for (let i = 0; i < ipList.length; i += concurrency) {
      const batch = ipList.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(ip => this._quickPing(ip, timeout))
      );

      batchResults.forEach((result, index) => {
        results.scannedCount++;
        if (result.alive) {
          results.hosts.push({
            ip: batch[index],
            responseTime: result.time,
            hostname: null // Could add reverse DNS lookup here
          });
        }
      });
    }

    results.scanTime = Date.now() - startTime;

    // Try to get hostnames for discovered hosts (optional, async)
    for (const host of results.hosts) {
      try {
        const reverseDns = await this.reverseDns(host.ip);
        if (reverseDns.success && reverseDns.hostnames.length > 0) {
          host.hostname = reverseDns.hostnames[0];
        }
      } catch {
        // Ignore reverse DNS errors
      }
    }

    return results;
  }

  /**
   * Quick ping using TCP connection (faster than ICMP ping)
   * @private
   */
  _quickPing(ip, timeout) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const socket = new net.Socket();

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        const time = Date.now() - startTime;
        socket.destroy();
        resolve({ alive: true, time });
      });

      socket.on('error', (err) => {
        socket.destroy();
        // ECONNREFUSED means host is up but port is closed
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

      // Try common ports
      socket.connect(80, ip);
    });
  }

  /**
   * Get local network interfaces
   * @returns {Object} Network interfaces information
   */
  getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const result = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;

      for (const addr of addrs) {
        if (addr.internal) continue; // Skip loopback

        result.push({
          name: name,
          address: addr.address,
          netmask: addr.netmask,
          family: addr.family,
          mac: addr.mac,
          cidr: addr.cidr
        });
      }
    }

    return {
      success: true,
      interfaces: result
    };
  }
}

module.exports = NetworkToolsService;
