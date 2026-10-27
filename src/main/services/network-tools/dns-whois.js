const { exec, execFile } = require('child_process');
const net = require('net');
const dns = require('dns').promises;
const https = require('https');
const crypto = require('crypto');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { assertSafeOutboundUrl } = require('../../utils/ssrf-guard');

const methods = {};


  /**
   * Resolves MAC Address to IP Address by looking up the local ARP table
   * @param {string} mac - MAC Address
   * @returns {Promise<Object>} IP address resolved
   */
methods.findIpByMac = async function(mac) {
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
  };


  /**
   * Nombre DNS seguro para consultas que no pasan por un shell.
   * @private
   */
methods._isSafeDnsName = function(name) {
    if (!name || typeof name !== 'string') return false;
    const d = name.trim().replace(/\.$/, '');
    if (!d || d.length > 253 || d.includes('..')) return false;
    return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/.test(d);
  };


  /**
   * Host aceptable para una conexión directa (IP o nombre DNS).
   * @private
   */
methods._isSafeConnectTarget = function(host) {
    if (!host || typeof host !== 'string') return false;
    const value = host.trim();
    if (this._isValidIp(value)) return true;
    return this._isSafeDnsName(value);
  };


  /**
   * ¿La IP v4 cae dentro del CIDR?
   */
methods.ipInCidr = function(ip, cidr) {
    const calc = this.subnetCalc(cidr);
    if (!calc.success) return calc;
    const cleanIp = String(ip || '').trim();
    if (!this._isValidIp(cleanIp) || cleanIp.includes(':')) {
      return { success: false, error: 'IP inválida' };
    }
    const ipInt = this._ipToInt(cleanIp);
    const network = this._ipToInt(calc.networkAddress);
    const broadcast = this._ipToInt(calc.broadcastAddress);
    return {
      ...calc,
      queryIp: cleanIp,
      contains: ipInt >= network && ipInt <= broadcast
    };
  };


  /**
   * Resuelve un tipo de registro con un Resolver concreto.
   * @private
   */
methods._resolveTyped = async function(domain, type, servers) {
    const { Resolver } = require('dns').promises;
    const resolver = new Resolver({ timeout: 4000, tries: 1 });
    if (servers && servers.length) resolver.setServers(servers);
    const recordType = String(type || 'A').toUpperCase();
    switch (recordType) {
      case 'A':
        return (await resolver.resolve4(domain)).map(value => ({ type: 'A', value }));
      case 'AAAA':
        return (await resolver.resolve6(domain)).map(value => ({ type: 'AAAA', value }));
      case 'MX':
        return (await resolver.resolveMx(domain)).map(r => ({ type: 'MX', value: r.exchange, priority: r.priority }));
      case 'TXT':
        return (await resolver.resolveTxt(domain)).map(r => ({ type: 'TXT', value: r.join(' ') }));
      case 'NS':
        return (await resolver.resolveNs(domain)).map(value => ({ type: 'NS', value }));
      case 'CNAME':
        return (await resolver.resolveCname(domain)).map(value => ({ type: 'CNAME', value }));
      default:
        throw new Error(`Tipo de registro no soportado: ${recordType}`);
    }
  };


  /**
   * Misma consulta DNS contra el resolver del sistema y tres públicos.
   */
methods.dnsCompare = async function(domain, type = 'A') {
    const name = String(domain || '').trim().replace(/\.$/, '');
    if (!this._isSafeDnsName(name)) {
      return { success: false, error: 'Dominio inválido' };
    }
    const recordType = String(type || 'A').toUpperCase();
    const targets = [
      { id: 'system', label: 'Sistema', servers: null },
      { id: 'cloudflare', label: 'Cloudflare', servers: ['1.1.1.1'] },
      { id: 'google', label: 'Google', servers: ['8.8.8.8'] },
      { id: 'quad9', label: 'Quad9', servers: ['9.9.9.9'] }
    ];
    const resolvers = await Promise.all(targets.map(async (target) => {
      const started = Date.now();
      try {
        const records = await this._resolveTyped(name, recordType, target.servers);
        return {
          id: target.id,
          label: target.label,
          servers: target.servers || [],
          success: records.length > 0,
          records,
          queryTime: Date.now() - started,
          error: records.length ? null : 'Sin registros'
        };
      } catch (err) {
        return {
          id: target.id,
          label: target.label,
          servers: target.servers || [],
          success: false,
          records: [],
          queryTime: Date.now() - started,
          error: err.code || err.message || 'Error DNS'
        };
      }
    }));
    return { success: true, domain: name, type: recordType, resolvers };
  };


  /**
   * MX, SPF, DMARC y DKIM opcional de un dominio.
   */
methods.mailDns = async function(domain, dkimSelector) {
    const name = String(domain || '').trim().replace(/\.$/, '').toLowerCase();
    if (!this._isSafeDnsName(name)) {
      return { success: false, error: 'Dominio inválido' };
    }
    const selector = dkimSelector ? String(dkimSelector).trim() : '';
    if (selector && !/^[A-Za-z0-9._-]{1,64}$/.test(selector)) {
      return { success: false, error: 'Selector DKIM inválido' };
    }

    const load = async (host, recordType) => {
      try {
        return await this._resolveTyped(host, recordType, null);
      } catch (err) {
        return { error: err.code || err.message || 'Error DNS' };
      }
    };

    const [mx, txt, dmarc] = await Promise.all([
      load(name, 'MX'),
      load(name, 'TXT'),
      load(`_dmarc.${name}`, 'TXT')
    ]);
    const dkim = selector ? await load(`${selector}._domainkey.${name}`, 'TXT') : null;
    const txtRecords = Array.isArray(txt) ? txt : [];

    return {
      success: true,
      domain: name,
      mx: Array.isArray(mx) ? mx : [],
      mxError: Array.isArray(mx) ? null : mx.error,
      spf: txtRecords.filter(r => /^v=spf1\b/i.test(r.value)).map(r => r.value),
      txtError: Array.isArray(txt) ? null : txt.error,
      dmarc: Array.isArray(dmarc) ? dmarc.map(r => r.value) : [],
      dmarcError: Array.isArray(dmarc) ? null : dmarc.error,
      dkimSelector: selector || null,
      dkim: Array.isArray(dkim) ? dkim.map(r => r.value) : [],
      dkimError: dkim && !Array.isArray(dkim) ? dkim.error : null
    };
  };


  /**
   * GET JSON por HTTPS, siguiendo solo redirecciones públicas.
   * @private
   */
methods._httpsGetJson = function(url, redirectsLeft = 4) {
    const guard = assertSafeOutboundUrl(url, { allowPrivate: false, allowLoopback: false });
    if (!guard.ok) {
      return Promise.resolve({ success: false, error: guard.error });
    }
    return new Promise((resolve) => {
      const req = https.get(url, {
        headers: {
          Accept: 'application/rdap+json, application/json',
          'User-Agent': 'NodeTerm-NetworkTools/1.0'
        },
        timeout: 12000
      }, (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirectsLeft <= 0) {
            resolve({ success: false, error: 'Demasiadas redirecciones' });
            return;
          }
          let next;
          try {
            next = new URL(res.headers.location, url).toString();
          } catch {
            resolve({ success: false, error: 'Redirección inválida' });
            return;
          }
          if (!next.startsWith('https:')) {
            resolve({ success: false, error: 'Redirección no HTTPS bloqueada' });
            return;
          }
          resolve(this._httpsGetJson(next, redirectsLeft - 1));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          if (status < 200 || status >= 300) {
            resolve({ success: false, error: `RDAP respondió HTTP ${status}` });
            return;
          }
          try {
            resolve({ success: true, json: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
          } catch {
            resolve({ success: false, error: 'Respuesta RDAP no es JSON' });
          }
        });
      });
      req.on('error', (err) => resolve({ success: false, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Tiempo de espera agotado' });
      });
    });
  };


  /**
   * Resume un documento RDAP de IP.
   * @private
   */
methods._summarizeRdap = function(json) {
    const doc = json && typeof json === 'object' ? json : {};
    const cidrs = (Array.isArray(doc.cidr0_cidrs) ? doc.cidr0_cidrs : []).map((c) => {
      if (c && c.v4prefix) return `${c.v4prefix}/${c.length}`;
      if (c && c.v6prefix) return `${c.v6prefix}/${c.length}`;
      return null;
    }).filter(Boolean);
    const organizations = [];
    for (const ent of Array.isArray(doc.entities) ? doc.entities : []) {
      const rows = ent && Array.isArray(ent.vcardArray) ? ent.vcardArray[1] : null;
      if (Array.isArray(rows)) {
        const fn = rows.find(row => Array.isArray(row) && row[0] === 'fn' && row[3]);
        if (fn) {
          organizations.push(String(fn[3]));
          continue;
        }
      }
      if (ent && ent.handle) organizations.push(String(ent.handle));
    }
    return {
      name: doc.name || doc.handle || null,
      handle: doc.handle || null,
      type: doc.type || null,
      country: doc.country || null,
      startAddress: doc.startAddress || null,
      endAddress: doc.endAddress || null,
      cidrs,
      organizations,
      port43: doc.port43 || null
    };
  };


  /**
   * WHOIS de IP vía RDAP.
   */
methods.whoisIp = async function(ip) {
    const clean = String(ip || '').trim();
    if (!this._isValidIp(clean)) {
      return { success: false, error: 'IP inválida' };
    }
    const fetched = await this._httpsGetJson(`https://rdap.org/ip/${encodeURIComponent(clean)}`);
    if (!fetched.success) return fetched;
    return { success: true, ip: clean, ...this._summarizeRdap(fetched.json) };
  };


  /**
   * Sigue redirecciones HTTP sin el cliente automático de Node.
   */
methods.redirectChain = async function(url) {
    let current = String(url || '').trim();
    if (!current) return { success: false, error: 'URL inválida', hops: [] };
    if (!/^https?:\/\//i.test(current)) current = `https://${current}`;
    const hops = [];
    const max = 10;
    for (let i = 0; i < max; i += 1) {
      const guard = this._assertHttpToolUrl(current);
      if (!guard.ok) {
        return { success: false, error: `URL bloqueada: ${guard.error}`, hops };
      }
      const started = Date.now();
      const response = await this._requestHttpHeaders(current, 'GET', 10000);
      const elapsed = Date.now() - started;
      if (!response.success) {
        hops.push({ url: current, error: response.error || 'Error HTTP', elapsed });
        return { success: false, error: response.error || 'Error HTTP', hops };
      }
      const location = response.location || null;
      hops.push({
        url: current,
        statusCode: response.statusCode,
        location,
        elapsed
      });
      const isRedirect = response.statusCode >= 300 && response.statusCode < 400 && location;
      if (!isRedirect) {
        return { success: true, hops, finalUrl: current };
      }
      try {
        current = new URL(location, current).toString();
      } catch {
        return { success: false, error: 'Location inválido', hops };
      }
    }
    return { success: false, error: 'Demasiadas redirecciones', hops };
  };


  /**
   * Fingerprint OpenSSH de una clave de host en formato wire.
   * @private
   */
methods._describeHostKey = function(key) {
    const buf = Buffer.isBuffer(key) ? key : Buffer.from(key);
    const sha = crypto.createHash('sha256').update(buf).digest('base64').replace(/=+$/, '');
    const md5 = crypto.createHash('md5').update(buf).digest('hex').match(/.{2}/g).join(':');
    let keyType = 'desconocido';
    if (buf.length >= 4) {
      const len = buf.readUInt32BE(0);
      if (len > 0 && len < 128 && 4 + len <= buf.length) {
        const type = buf.subarray(4, 4 + len).toString('utf8');
        if (/^[a-z0-9@._-]+$/i.test(type)) keyType = type;
      }
    }
    return {
      keyType,
      fingerprintSha256: `SHA256:${sha}`,
      fingerprintMd5: md5
    };
  };


  /**
   * Lee el banner SSH y la clave del host. No intenta autenticarse.
   */
methods.sshFingerprint = async function(host, port = 22) {
    const cleanHost = String(host || '').trim();
    const cleanPort = Number(port);
    if (!this._isSafeConnectTarget(cleanHost)) {
      return { success: false, error: 'Host inválido' };
    }
    if (!Number.isInteger(cleanPort) || cleanPort < 1 || cleanPort > 65535) {
      return { success: false, error: 'Puerto inválido' };
    }

    let Client;
    try {
      ({ Client } = require('ssh2'));
    } catch {
      return { success: false, error: 'El módulo ssh2 no está disponible' };
    }

    return new Promise((resolve) => {
      let settled = false;
      let captured = null;
      let ident = '';
      let identDone = false;
      let timer = null;
      const finish = (payload) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { socket.destroy(); } catch (_) { /* socket ya cerrado */ }
        resolve(payload);
      };
      const finishCaptured = () => finish({
        success: true,
        host: cleanHost,
        port: cleanPort,
        banner: ident || null,
        ...this._describeHostKey(captured)
      });

      const socket = net.connect({ host: cleanHost, port: cleanPort });
      const origEmit = socket.emit.bind(socket);
      socket.emit = (event, ...args) => {
        if (!identDone && event === 'data' && args[0]) {
          ident += Buffer.isBuffer(args[0]) ? args[0].toString('utf8') : String(args[0]);
          const nl = ident.indexOf('\n');
          if (nl !== -1) {
            ident = ident.slice(0, nl).replace(/\r$/, '').slice(0, 240);
            identDone = true;
            socket.emit = origEmit;
          }
        }
        return origEmit(event, ...args);
      };

      const conn = new Client();
      timer = setTimeout(() => {
        try { conn.end(); } catch (_) { /* ignore */ }
        finish({ success: false, error: 'Tiempo de espera agotado' });
      }, 8000);

      socket.on('error', (err) => {
        if (captured) {
          finishCaptured();
          return;
        }
        finish({ success: false, error: err.message || 'No se pudo conectar' });
      });

      conn.on('error', (err) => {
        if (captured) {
          finishCaptured();
          return;
        }
        finish({ success: false, error: err?.message || 'No se pudo leer la clave del host' });
      });

      conn.on('ready', () => {
        try { conn.end(); } catch (_) { /* ignore */ }
        finish({ success: false, error: 'La conexión continuó sin capturar la clave' });
      });

      conn.connect({
        sock: socket,
        host: cleanHost,
        port: cleanPort,
        username: 'nodeterm-probe',
        password: 'unused',
        readyTimeout: 8000,
        hostVerifier: (key) => {
          captured = Buffer.isBuffer(key) ? Buffer.from(key) : Buffer.from(String(key));
          return false;
        }
      });
    });
  };


  /**
   * Vecinos IP/MAC de esta máquina.
   */
methods.getNeighbors = async function() {
    const table = await this._readNeighborTable();
    const neighbors = Object.entries(table)
      .filter(([ip]) => this._isValidIp(ip) && !String(ip).includes(':'))
      .map(([ip, mac]) => ({ ip, mac }))
      .sort((a, b) => this._ipToInt(a.ip) - this._ipToInt(b.ip));
    return { success: true, neighbors };
  };


  /** @private */
methods._parseWindowsRoutes = function(stdout) {
    const routes = [];
    for (const line of String(stdout || '').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.includes('|')) continue;
      const parts = trimmed.split('|');
      if (parts.length < 4) continue;
      const metric = parts.pop();
      const iface = parts.pop();
      const gateway = parts.pop();
      const destination = parts.join('|');
      if (!destination) continue;
      routes.push({
        destination,
        gateway: gateway || '',
        interface: iface || '',
        metric: metric === '' || Number.isNaN(Number(metric)) ? null : Number(metric)
      });
    }
    return routes;
  };


  /** @private */
methods._parseLinuxRoutes = function(stdout) {
    const routes = [];
    for (const line of String(stdout || '').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const tokens = trimmed.split(/\s+/);
      const destination = tokens[0] === 'default' ? '0.0.0.0/0' : tokens[0];
      const via = trimmed.match(/\svia\s+(\S+)/);
      const dev = trimmed.match(/\sdev\s+(\S+)/);
      const metric = trimmed.match(/\smetric\s+(\d+)/);
      routes.push({
        destination,
        gateway: via ? via[1] : 'on-link',
        interface: dev ? dev[1] : '',
        metric: metric ? Number(metric[1]) : null
      });
    }
    return routes;
  };


  /** @private */
methods._parseBsdRoutes = function(stdout) {
    const routes = [];
    for (const line of String(stdout || '').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || /^Destination/i.test(trimmed) || /^Routing/i.test(trimmed) || /^Internet/i.test(trimmed)) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length < 4 || !/^(\d|default)/.test(parts[0])) continue;
      routes.push({
        destination: parts[0] === 'default' ? '0.0.0.0/0' : parts[0],
        gateway: parts[1],
        interface: parts[3] || '',
        metric: null
      });
    }
    return routes;
  };


  /**
   * Tabla de rutas de esta máquina. El comando no incorpora entrada del usuario.
   */
methods.getLocalRoutes = async function() {
    try {
      if (this.platform === 'win32') {
        const script = [
          '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)',
          'Get-NetRoute -AddressFamily IPv4 | ForEach-Object { "$($_.DestinationPrefix)|$($_.NextHop)|$($_.InterfaceAlias)|$($_.RouteMetric)" }'
        ].join('; ');
        const { stdout } = await new Promise((resolve, reject) => {
          execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
            timeout: 20000,
            maxBuffer: 4 * 1024 * 1024,
            windowsHide: true
          }, (err, out, errOut) => {
            if (err) reject(err);
            else resolve({ stdout: out, stderr: errOut });
          });
        });
        return { success: true, routes: this._parseWindowsRoutes(stdout) };
      }
      if (this.platform === 'linux') {
        const { stdout } = await execAsync('ip -4 route', { timeout: 8000, shell: true });
        return { success: true, routes: this._parseLinuxRoutes(stdout) };
      }
      const { stdout } = await execAsync('netstat -rn -f inet', { timeout: 8000, shell: true });
      return { success: true, routes: this._parseBsdRoutes(stdout) };
    } catch (err) {
      return { success: false, error: err.message || 'No se pudo leer la tabla de rutas', routes: [] };
    }
  };

module.exports = methods;
