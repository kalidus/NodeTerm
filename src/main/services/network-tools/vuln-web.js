const net = require('net');
const tls = require('tls');
const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');

const methods = {};


  // =============================================
  // BASE DE DATOS DE VULNERABILIDADES CONOCIDAS
  // =============================================
  
  /**
   * Base de datos local de vulnerabilidades conocidas por servicio/versión
   * Fallback cuando no hay conexión a NVD
   * @private
   */
methods._getLocalVulnDatabase = function() {
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
  };


  /**
   * Mapa de servicios conocidos por puerto
   * @private
   */
methods._getServicesByPort = function() {
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
  };


  /**
   * Banner grabbing - intenta obtener el banner de un servicio
   * @private
   */
methods._grabBanner = async function(host, port, timeout = 3000) {
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
  };


  /**
   * Obtener banner via TLS
   * @private
   */
methods._grabTlsBanner = async function(host, port, timeout = 5000) {
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
  };


  /**
   * Parsear versión de un banner
   * @private
   */
methods._parseVersionFromBanner = function(banner, service) {
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
  };


  /**
   * Comparar versiones (retorna true si version < maxVersion)
   * @private
   */
methods._isVersionVulnerable = function(version, maxVersion) {
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
  };


  /**
   * Buscar CVEs en NVD (National Vulnerability Database)
   * @private
   */
methods._searchNVD = async function(service, version) {
    if (!service || !version) return [];
    
    try {
      // NVD API v2.0
      const keyword = encodeURIComponent(`${service} ${version}`);
      const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${keyword}&resultsPerPage=10`;
      
      return new Promise((resolve) => {
        const request = https.get(url, { timeout: 10000 }, (response) => {
          if (response.statusCode !== 200) {
            return resolve([]);
          }
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
  };


  /**
   * Obtiene las vulnerabilidades más críticas de los últimos X años
   * @param {number} years - Número de años configurados
   * @param {number} minScore - Puntuación CVSS mínima
   * @param {number} [days=null] - Número de días alternativos
   * @returns {Promise<Object>} Lista de vulnerabilidades
   */
methods.getRecentCriticalVulns = async function(years = 1, minScore = 9.0, days = null) {
    try {
      const totalDays = days !== null && days !== undefined ? days : Math.round(years * 365.25);
      const cacheKey = `${totalDays}_${minScore}`;
      const cached = this.nvdCache.get(cacheKey);
      const CACHE_TTL = 3600000; // 1 hora de TTL para caché
      
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return { success: true, vulnerabilities: cached.vulnerabilities, fromCache: true };
      }

      const chunks = [];
      const now = new Date();
      let daysLeft = totalDays;
      let currentEndDate = new Date(now);

      while (daysLeft > 0) {
        const daysToSubtract = Math.min(120, daysLeft);
        const currentStartDate = new Date(currentEndDate);
        currentStartDate.setDate(currentEndDate.getDate() - daysToSubtract);

        chunks.push({
          start: currentStartDate.toISOString().split('.')[0] + '.000',
          end: currentEndDate.toISOString().split('.')[0] + '.000'
        });

        currentEndDate = new Date(currentStartDate);
        daysLeft -= daysToSubtract;
      }

      let allCves = [];
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Agregar un pequeño retardo de 1s entre llamadas para evitar límites de tasa
        if (i > 0) {
          await sleep(1000);
        }

        const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${chunk.start}&pubEndDate=${chunk.end}&cvssV3Severity=CRITICAL`;
        
        const chunkCves = await new Promise((resolve) => {
          const options = {
            headers: {
              'User-Agent': 'NodeTerm-Security-Scanner'
            },
            timeout: 15000
          };
          
          const request = https.get(url, options, (response) => {
            if (response.statusCode !== 200) {
              return resolve([]);
            }
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
                    published: cve.published,
                    description: cve.descriptions?.find(d => d.lang === 'es')?.value || cve.descriptions?.find(d => d.lang === 'en')?.value || 'Sin descripción',
                    references: (cve.references || []).slice(0, 5).map(r => r.url)
                  };
                });
                resolve(cves);
              } catch (e) {
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

        allCves = allCves.concat(chunkCves);
      }

      // Filtrar por puntuación mínima y ordenar descendentemente por puntuación
      const filtered = allCves
        .filter(c => c.score >= minScore)
        .sort((a, b) => b.score - a.score);

      // Si la API falló o devolvió vacío y ya tenemos datos en caché, usarlos como fallback
      if (filtered.length === 0 && cached) {
        return { success: true, vulnerabilities: cached.vulnerabilities, fromCache: true };
      }

      // Guardar en caché sólo si obtuvimos resultados
      if (filtered.length > 0) {
        this.nvdCache.set(cacheKey, {
          timestamp: Date.now(),
          vulnerabilities: filtered
        });
        this._saveCache();
      }

      return { success: true, vulnerabilities: filtered };
    } catch (error) {
      console.error('[NetworkToolsService:getRecentCriticalVulns] Error:', error);
      return { success: false, error: error.message || 'Error desconocido al obtener vulnerabilidades' };
    }
  };


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
methods.hostVulnScan = async function(host, ports = '21,22,23,25,53,80,110,143,443,445,993,995,1433,1521,3306,3389,5432,5900,6379,8080,8443,27017', timeout = 5000, useOnline = true, onProgress = null) {
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
  };


  /**
   * Web Security Scanner
   * Analiza headers de seguridad, SSL/TLS, cookies y configuraciones
   * @param {string} url - URL a analizar
   * @param {number} timeout - Timeout de conexión
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultados del análisis
   */
methods.webSecurityScan = async function(url, timeout = 10000, onProgress = null) {
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'URL inválida' };
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
          if (sslResult.trust?.authorized || sslResult.certificate?.isValid) {
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
            const trustLabel = sslResult.trust?.statusLabel || 'No confiable';
            const trustDetail = sslResult.trust?.issues?.[0]?.detail
              || sslResult.trust?.summary
              || 'El certificado SSL no es de confianza.';
            const failSeverity = ['expired', 'not_yet_valid', 'hostname_mismatch'].includes(sslResult.trust?.status)
              ? 'critical'
              : 'high';
            results.checks.push({
              category: 'SSL/TLS',
              check: 'Certificado válido',
              status: 'FAIL',
              severity: failSeverity,
              details: `${trustLabel}. ${trustDetail}`
            });
            results.summary.failed++;
            if (failSeverity === 'critical') results.summary.issues.critical++;
            else results.summary.issues.high++;
            progressLog(`❌ Certificado: ${trustLabel}\n`);
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
  };


  /**
   * Fetch con detalles completos (headers, cookies, etc.)
   * @private
   */
methods._fetchWithDetails = async function(url, timeout = 10000) {
    return new Promise((resolve) => {
      try {
        const urlGuard = this._assertHttpToolUrl(url);
        if (!urlGuard.ok) {
          resolve({ success: false, error: `URL bloqueada: ${urlGuard.error}` });
          return;
        }
        const parsedUrl = urlGuard.parsed;
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
  };


  /**
   * Analizar una cookie
   * @private
   */
methods._analyzeCookie = function(cookieStr, isHttps) {
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
  };


  /**
   * Get local network interfaces
   * @returns {Object} Network interfaces information
   */
methods.getNetworkInterfaces = function() {
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
  };


  /**
   * Obtiene los detalles de un CVE específico desde NVD
   * @param {string} cveId - El ID de CVE (ej: CVE-2026-46331)
   * @returns {Promise<Object>} Detalles de la vulnerabilidad
   */
methods.getCveDetails = async function(cveId) {
    if (!cveId || typeof cveId !== 'string') {
      return { success: false, error: 'CVE ID inválido' };
    }
    const cleanCveId = cveId.trim().toUpperCase();
    if (!/^CVE-\d{4}-\d{4,7}$/.test(cleanCveId)) {
      return { success: false, error: 'Formato de CVE inválido (debe ser CVE-YYYY-NNNN)' };
    }

    try {
      const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cleanCveId}`;
      
      return new Promise((resolve) => {
        const request = https.get(url, { 
          timeout: 10000,
          headers: { 'User-Agent': 'NodeTerm-Security-App' }
        }, (response) => {
          if (response.statusCode !== 200) {
            return resolve({ 
              success: false, 
              error: `El servicio de NVD de NIST retornó un error HTTP ${response.statusCode}. Esto suele deberse a límites de peticiones (rate limiting) o bloqueos temporales.` 
            });
          }
          let data = '';
          
          response.on('data', chunk => { data += chunk; });
          response.on('end', () => {
            try {
              const json = JSON.parse(data);
              const vuln = json.vulnerabilities?.[0]?.cve;
              if (!vuln) {
                return resolve({ success: false, error: 'No se encontraron registros para este CVE' });
              }

              // Buscar vector CVSS en la respuesta (V4.0, V3.1, V3.0, V2)
              const v4Metric = vuln.metrics?.cvssMetricV40?.[0];
              const v31Metric = vuln.metrics?.cvssMetricV31?.[0];
              const v30Metric = vuln.metrics?.cvssMetricV30?.[0];
              const v2Metric = vuln.metrics?.cvssMetricV2?.[0];

              const selectedMetric = v4Metric || v31Metric || v30Metric || v2Metric;
              const cvssData = selectedMetric?.cvssData;

              // Obtener sistemas operativos / plataformas afectadas
              const affectedPlatforms = [];
              if (vuln.configurations) {
                for (const config of vuln.configurations) {
                  for (const node of config.nodes || []) {
                    for (const match of node.cpeMatch || []) {
                      if (match.vulnerable && match.criteria) {
                        // El CPE suele tener la forma: cpe:2.3:part:vendor:product:version:...
                        const parts = match.criteria.split(':');
                        if (parts.length >= 5) {
                          const part = parts[2]; // o, a, h
                          const vendor = parts[3];
                          const product = parts[4];
                          const version = parts[5];
                          
                          let partDesc = '';
                          if (part === 'o') partDesc = 'Sistema Operativo';
                          else if (part === 'a') partDesc = 'Aplicación';
                          else if (part === 'h') partDesc = 'Hardware';
                          
                          let desc = `${vendor} ${product}`;
                          if (version && version !== '*' && version !== '-') {
                            desc += ` (${version})`;
                          }
                          affectedPlatforms.push({ part: partDesc, name: desc });
                        }
                      }
                    }
                  }
                }
              }

              // Eliminar duplicados
              const uniquePlatforms = [];
              const seen = new Set();
              for (const plat of affectedPlatforms) {
                const key = `${plat.part}:${plat.name}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  uniquePlatforms.push(plat);
                }
              }

              const description = vuln.descriptions?.find(d => d.lang === 'es')?.value || vuln.descriptions?.find(d => d.lang === 'en')?.value || 'Sin descripción';

              // Si no se detectaron plataformas por CPE, intentar deducir de la descripción
              if (uniquePlatforms.length === 0 && description) {
                const descLower = description.toLowerCase();
                if (descLower.includes('linux kernel') || descLower.includes('in the linux kernel')) {
                  uniquePlatforms.push({ part: 'Sistema Operativo', name: 'Linux Kernel' });
                } else if (descLower.includes('windows')) {
                  uniquePlatforms.push({ part: 'Sistema Operativo', name: 'Microsoft Windows' });
                } else if (descLower.includes('android')) {
                  uniquePlatforms.push({ part: 'Sistema Operativo', name: 'Android OS' });
                } else if (descLower.includes('macos') || descLower.includes('os x')) {
                  uniquePlatforms.push({ part: 'Sistema Operativo', name: 'Apple macOS' });
                } else if (descLower.includes('ios')) {
                  uniquePlatforms.push({ part: 'Sistema Operativo', name: 'Apple iOS' });
                }
              }

              // Obtener referencias de mitigaciones / oficiales
              const references = (vuln.references || []).map(r => r.url);

              resolve({
                success: true,
                cveId: vuln.id,
                description: vuln.descriptions?.find(d => d.lang === 'es')?.value || vuln.descriptions?.find(d => d.lang === 'en')?.value || 'Sin descripción',
                cvss: cvssData ? {
                  version: cvssData.version || (v4Metric ? '4.0' : v31Metric ? '3.1' : '3.0'),
                  vectorString: cvssData.vectorString,
                  baseScore: cvssData.baseScore,
                  baseSeverity: cvssData.baseSeverity || selectedMetric?.baseSeverity
                } : null,
                affectedPlatforms: uniquePlatforms,
                references
              });
            } catch (err) {
              resolve({ success: false, error: 'Error al parsear datos de NVD: ' + err.message });
            }
          });
        });

        request.on('error', (err) => resolve({ success: false, error: 'Error de conexión con NVD: ' + err.message }));
        request.on('timeout', () => {
          request.destroy();
          resolve({ success: false, error: 'Tiempo de espera agotado al conectar con NVD' });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

module.exports = methods;
