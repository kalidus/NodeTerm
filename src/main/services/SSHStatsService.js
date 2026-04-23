/**
 * SSHStatsService - Servicio centralizado para recolección y parsing de estadísticas SSH
 * Maneja tanto conexiones SSH directas como conexiones Bastion/Wallix
 */

const { parseDfOutput, parseNetDev, sendToRenderer } = require('../utils');

class SSHStatsService {
  constructor() {
    this.activeStatsTabId = null;
    this.statusBarPollingIntervalMs = 5000; // 5 segundos por defecto (reducir contención SSH)
  }

  /**
   * Establece qué pestaña está activa para recibir estadísticas
   */
  setActiveStatsTab(tabId) {
    this.activeStatsTabId = tabId;
  }

  /**
   * Obtiene la pestaña activa actual
   */
  getActiveStatsTab() {
    return this.activeStatsTabId;
  }

  /**
   * Establece el intervalo de polling para estadísticas (en milisegundos)
   */
  setPollingInterval(intervalMs) {
    this.statusBarPollingIntervalMs = Math.max(1000, Math.min(20000, intervalMs));
  }

  /**
   * Obtiene el intervalo de polling actual
   */
  getPollingInterval() {
    return this.statusBarPollingIntervalMs;
  }

  /**
   * Parsea CPU del output de /proc/stat
   * El output puede contener varias líneas (grep '^cpu' /proc/stat)
   */
  parseCPU(cpuStatOutput, previousCpu) {
    const lines = (cpuStatOutput || '').trim().split('\n').filter(l => l.startsWith('cpu'));
    if (lines.length === 0) return { cpuLoad: '0.00', currentCpu: null, cores: 1 };

    // La primera línea es la agregada ("cpu  ...")
    const cpuStatLine = lines[0];
    // El resto son líneas por core ("cpu0 ...", "cpu1 ...")
    const cores = Math.max(1, lines.length - 1);

    const cpuTimes = cpuStatLine.trim().split(/\s+/).slice(1).map(t => parseInt(t, 10));
    let cpuLoad = '0.00';

    if (cpuTimes.length < 8) {
      return { cpuLoad, currentCpu: null, cores };
    }

    const currentCpu = {
      user: cpuTimes[0],
      nice: cpuTimes[1],
      system: cpuTimes[2],
      idle: cpuTimes[3],
      iowait: cpuTimes[4],
      irq: cpuTimes[5],
      softirq: cpuTimes[6],
      steal: cpuTimes[7],
      coresData: []
    };

    // Calculate core by core
    for (let i = 1; i < lines.length; i++) {
      const coreCpuTimes = lines[i].trim().split(/\s+/).slice(1).map(t => parseInt(t, 10));
      if (coreCpuTimes.length >= 8) {
        currentCpu.coresData.push({
          user: coreCpuTimes[0],
          nice: coreCpuTimes[1],
          system: coreCpuTimes[2],
          idle: coreCpuTimes[3],
          iowait: coreCpuTimes[4],
          irq: coreCpuTimes[5],
          softirq: coreCpuTimes[6],
          steal: coreCpuTimes[7]
        });
      }
    }

    let coreLoads = [];

    if (previousCpu) {
      const prevIdle = (previousCpu.idle || 0) + (previousCpu.iowait || 0);
      const currentIdle = currentCpu.idle + currentCpu.iowait;
      const prevTotal = Object.keys(currentCpu).filter(k => typeof currentCpu[k] === 'number').reduce((a, k) => a + currentCpu[k], 0);
      const prevObjTotal = previousCpu
        ? Object.keys(previousCpu).filter(k => typeof previousCpu[k] === 'number').reduce((a, k) => a + (previousCpu[k] || 0), 0)
        : 0;

      const totalDiff = prevTotal - prevObjTotal;
      const idleDiff = currentIdle - prevIdle;

      if (totalDiff > 0) {
        cpuLoad = ((totalDiff - idleDiff) * 100 / totalDiff).toFixed(2);
      }

      // Calculate per core
      if (previousCpu.coresData && currentCpu.coresData.length === previousCpu.coresData.length) {
        for (let i = 0; i < currentCpu.coresData.length; i++) {
          const prevCore = previousCpu.coresData[i];
          const currCore = currentCpu.coresData[i];

          const prevCoreIdle = prevCore.idle + prevCore.iowait;
          const currCoreIdle = currCore.idle + currCore.iowait;

          const prevCoreTotal = Object.values(prevCore).reduce((a, b) => a + b, 0);
          const currCoreTotal = Object.values(currCore).reduce((a, b) => a + b, 0);

          const totalCoreDiff = currCoreTotal - prevCoreTotal;
          const idleCoreDiff = currCoreIdle - prevCoreIdle;

          let coreLoad = '0.00';
          if (totalCoreDiff > 0) {
            coreLoad = ((totalCoreDiff - idleCoreDiff) * 100 / totalCoreDiff).toFixed(2);
          }
          coreLoads.push(parseFloat(coreLoad));
        }
      }
    }

    return { cpuLoad, currentCpu, cores, coreLoads };
  }

  /**
   * Parsea memoria del output de 'free -b'
   */
  parseMemory(parts) {
    const memLine = parts.find(line => line.trim().startsWith('Mem:')) || '';
    const swapLine = parts.find(line => line.trim().startsWith('Swap:')) || '';

    const memParts = memLine.trim().split(/\s+/);
    const swapParts = swapLine.trim().split(/\s+/);

    if (memParts.length < 2) {
      return { total: 0, used: 0, cached: 0, swapTotal: 0, swapUsed: 0 };
    }

    let total = parseInt(memParts[1], 10) || 0;
    let used = parseInt(memParts[2], 10) || 0;
    let cached = parseInt(memParts[5], 10) || 0;
    let swapTotal = parseInt(swapParts[1], 10) || 0;
    let swapUsed = parseInt(swapParts[2], 10) || 0;

    let multiplier = 1;
    // Detectar si los valores están en KB en lugar de Bytes.
    // Heurística: Si la memoria total es < 16,000,000 (lo que serían 16MB si fuesen Bytes),
    // es casi seguro que son KB (representando hasta 16GB RAM), ya que es raro un sistema con < 16MB RAM real.
    if (total > 0 && total < 16000000) {
      multiplier = 1024;
    }

    total *= multiplier;
    used *= multiplier;
    cached *= multiplier;
    swapTotal *= multiplier;
    swapUsed *= multiplier;

    // Si hay un índice 6 y el 5 parece ser buffers (BusyBox free), sumar el 6 que suele ser cached real
    if (memParts.length > 6 && !isNaN(parseInt(memParts[6], 10))) {
      const val5 = parseInt(memParts[5], 10) || 0;
      const val6 = parseInt(memParts[6], 10) || 0;
      // En BusyBox, buffers suelen ser menos que cached.
      // Si sumamos ambos suele ser más preciso para lo que el UI llama "Caché" (buff/cache)
      // val6 < total / multiplier para evitar confundir con 'available' en sistemas con mucha RAM
      if (val6 > 0 && total > 0 && val6 < total / (multiplier / 1)) {
        cached = (val5 + val6) * multiplier;
      }
    }

    return { total, used, cached, swapTotal, swapUsed };
  }

  /**
   * Parsea memoria de macOS (output de vm_stat y sysctl hw.memsize)
   */
  parseMemoryMacOS(vmStatOutput, totalMemBytes) {
    const lines = vmStatOutput.split('\n');
    const getVal = (label) => {
      const line = lines.find(l => l.includes(label));
      if (!line) return 0;
      const match = line.match(/: \s*(\d+)\./);
      return match ? parseInt(match[1], 10) : 0;
    };

    const pageSize = 4096; // Standard on macOS
    const free = getVal('Pages free') * pageSize;
    const active = getVal('Pages active') * pageSize;
    const inactive = getVal('Pages inactive') * pageSize;
    const speculative = getVal('Pages speculative') * pageSize;
    const wired = getVal('Pages wired down') * pageSize;
    const compressed = getVal('Pages occupied by compressor') * pageSize;

    const used = active + wired + compressed;
    const cached = inactive + speculative;

    return {
      total: totalMemBytes || (used + free + cached),
      used: used,
      cached: cached,
      swapTotal: 0,
      swapUsed: 0
    };
  }

  /**
   * Parsea discos del output de 'df -P'
   */
  parseDisks(parts) {
    const dfIndex = parts.findIndex(line => line.trim().startsWith('Filesystem'));

    if (dfIndex < 0) {
      return [];
    }

    const dfOutput = parts.slice(dfIndex).join('\n');
    return parseDfOutput(dfOutput);
  }

  /**
   * Parsea discos para Bastion (formato ligeramente diferente)
   */
  parseDisksBastion(parts) {
    const dfIndex = parts.findIndex(line => line.trim().startsWith('Filesystem'));

    if (dfIndex < 0) {
      return [];
    }

    const lines = parts.slice(dfIndex).filter(l => l.trim() !== '');
    lines.shift(); // Eliminar header

    return lines.map(line => {
      const p = line.trim().split(/\s+/);
      if (p.length >= 6) {
        const use = parseInt(p[p.length - 2], 10);
        const mount = p[p.length - 1];
        // Formato esperado df -P: ... <total> <used> <avail> <use%> <mount>
        // Tomamos desde el final para robustez ante columnas variables.
        const totalKb = parseInt(p[p.length - 5], 10);
        const usedKb = parseInt(p[p.length - 4], 10);

        // Filtrar montajes no relevantes
        if (mount && mount.startsWith('/') && !isNaN(use) &&
          !mount.startsWith('/sys') &&
          !mount.startsWith('/run') &&
          !mount.startsWith('/dev') &&
          !mount.includes('/snap/')) {
          const totalGb = Number.isFinite(totalKb) ? Math.round((totalKb / (1024 * 1024)) * 10) / 10 : null;
          const usedGb = Number.isFinite(usedKb) ? Math.round((usedKb / (1024 * 1024)) * 10) / 10 : null;
          return { fs: mount, use, usedGb, totalGb };
        }
      }
      return null;
    }).filter(Boolean);
  }

  /**
   * Parsea uptime
   */
  parseUptime(parts) {
    const uptimeLine = parts.find(line => line.includes(' up '));

    if (!uptimeLine) {
      return 'N/A';
    }

    const match = uptimeLine.match(/up (.*?),/);
    return match && match[1] ? match[1].trim() : 'N/A';
  }

  /**
   * Parsea red del output de /proc/net/dev
   */
  parseNetwork(parts, previousNet, previousTime) {
    const netIndex = parts.findIndex(line => line.trim().includes('Inter-|   Receive'));

    if (netIndex < 0) {
      return { network: { rx_speed: 0, tx_speed: 0 }, currentNet: null };
    }

    // Isolar solo el bloque de red (hasta el siguiente delimitador o fin)
    const nextBlockIndex = parts.findIndex((line, i) => i > netIndex && line.includes('---'));
    const netParts = nextBlockIndex > 0 ? parts.slice(netIndex, nextBlockIndex) : parts.slice(netIndex);

    const netOutput = netParts.join('\n');
    const currentNet = parseNetDev(netOutput);
    const currentTime = Date.now();

    let network = { rx_speed: 0, tx_speed: 0 };

    if (previousNet && previousTime) {
      const timeDiff = (currentTime - previousTime) / 1000;
      const rxDiff = currentNet.totalRx - previousNet.totalRx;
      const txDiff = currentNet.totalTx - previousNet.totalTx;

      network.rx_speed = Math.max(0, rxDiff / timeDiff);
      network.tx_speed = Math.max(0, txDiff / timeDiff);
    }

    return { network, currentNet, currentTime };
  }

  /**
   * Parsea red para Bastion (formato ligeramente diferente)
   */
  parseNetworkBastion(parts, previousNet, previousTime) {
    const netIndex = parts.findIndex(line => line.trim().includes('Inter-|   Receive'));

    if (netIndex < 0) {
      return { network: { rx_speed: 0, tx_speed: 0 }, currentNet: null, currentTime: Date.now() };
    }

    const netOutput = parts.slice(netIndex).join('\n');
    const currentNet = parseNetDev(netOutput);
    const currentTime = Date.now();
    let network = { rx_speed: 0, tx_speed: 0 };

    if (previousNet && previousTime) {
      const timeDiff = (currentTime - previousTime) / 1000;
      const rxDiff = currentNet.totalRx - previousNet.totalRx;
      const txDiff = currentNet.totalTx - previousNet.totalTx;

      network.rx_speed = Math.max(0, rxDiff / timeDiff);
      network.tx_speed = Math.max(0, txDiff / timeDiff);
    }

    return {
      network,
      currentNet,
      currentTime
    };
  }

  /**
   * Extrae IP del output
   */
  parseIP(parts, fallbackHost) {
    if (parts.length === 0) {
      return fallbackHost;
    }

    const ipLine = parts[parts.length - 1].trim();
    const ipCandidates = ipLine.split(/\s+/).filter(s => s && s !== '127.0.0.1' && s !== '::1');

    if (ipCandidates.length > 0) {
      return ipCandidates[ipCandidates.length - 1];
    }

    return fallbackHost;
  }

  /**
   * Extrae hostname para Bastion (búsqueda heurística)
   */
  parseHostnameBastion(parts) {
    const hostnameLineIndex = parts.findIndex(line =>
      line &&
      !line.includes('=') &&
      !line.includes(':') &&
      !line.includes('/') &&
      !line.includes('$') &&
      line.trim().length > 0 &&
      line.trim().length < 50 &&
      !line.includes('cpu') &&
      !line.includes('Mem') &&
      !line.includes('total') &&
      !line.includes('Filesystem')
    );

    if (hostnameLineIndex >= 0 && hostnameLineIndex < parts.length - 5) {
      return parts[hostnameLineIndex].trim();
    }

    return 'Bastión';
  }

  /**
   * Extrae IP para Bastion (línea después de hostname)
   */
  parseIPBastion(parts, fallbackHost) {
    const hostnameLineIndex = parts.findIndex(line =>
      line &&
      !line.includes('=') &&
      !line.includes(':') &&
      !line.includes('/') &&
      !line.includes('$') &&
      line.trim().length > 0 &&
      line.trim().length < 50 &&
      !line.includes('cpu') &&
      !line.includes('Mem') &&
      !line.includes('total') &&
      !line.includes('Filesystem')
    );

    if (hostnameLineIndex >= 0 && hostnameLineIndex < parts.length - 4) {
      const ipLine = parts[hostnameLineIndex + 1]?.trim() || '';

      if (ipLine) {
        const ipCandidates = ipLine.split(/\s+/).filter(s => s && s !== '127.0.0.1' && s !== '::1');
        if (ipCandidates.length > 0) {
          return ipCandidates[ipCandidates.length - 1];
        }
      }
    }

    return fallbackHost;
  }

  /**
   * Normaliza ID de distribución (manejo especial para RHEL)
   */
  parseDistro(parts, defaultDistro = 'linux') {
    let finalDistroId = defaultDistro;
    let versionId = '';

    try {
      const idLine = parts.find(line => line.trim().startsWith('ID='));
      const idLikeLine = parts.find(line => line.trim().startsWith('ID_LIKE='));
      const versionIdLine = parts.find(line => line.trim().startsWith('VERSION_ID='));

      let rawDistro = '';

      if (idLine) {
        const match = idLine.match(/^ID=("?)([^"\n]*)\1$/);
        if (match) rawDistro = match[2].toLowerCase();
      }

      // Normalización especial para RHEL
      if (["rhel", "redhat", "redhatenterpriseserver", "red hat enterprise linux"].includes(rawDistro)) {
        finalDistroId = "rhel";
      } else if (rawDistro === 'linux' && idLikeLine) {
        const match = idLikeLine.match(/^ID_LIKE=("?)([^"\n]*)\1$/);
        const idLike = match ? match[2].toLowerCase() : '';

        if (idLike.includes('rhel') || idLike.includes('redhat')) {
          finalDistroId = "rhel";
        } else {
          finalDistroId = rawDistro;
        }
      } else if (rawDistro) {
        finalDistroId = rawDistro;
      }

      if (versionIdLine) {
        const match = versionIdLine.match(/^VERSION_ID=("?)([^"\n]*)\1$/);
        if (match) versionId = match[2];
      }
    } catch (e) {
      // Ignorar errores de parsing
    }

    return { distro: finalDistroId, versionId };
  }

  /**
   * Crea objeto de estadísticas fallback para errores
   */
  createFallbackStats(hostname = 'Unknown', distro = 'linux', host = '') {
    return {
      cpu: '0.00',
      mem: { total: 0, used: 0 },
      disk: [],
      uptime: 'Error',
      network: { rx_speed: 0, tx_speed: 0 },
      hostname,
      distro,
      versionId: '',
      ip: host
    };
  }

  /**
   * Procesa output completo de comando de stats para SSH directo
   */
  async processDirectSSHStats(conn, realHostname, finalDistroId, host) {
    try {
      if (finalDistroId === 'macos' || finalDistroId === 'darwin') {
        return await this.processMacOSSSHStats(conn, realHostname, host);
      }

      // Consolidar CPU, memoria, disco, uptime, red, IP y distro en una SOLA llamada de shell.
      // Esto es CRÍTICO para routers y bastiones que limitan canales/sesiones.
      const command = `grep '^cpu' /proc/stat && echo "---CPU_END---" && free -b 2>/dev/null && echo "---MEM_END---" && df -P 2>/dev/null && echo "---DISK_END---" && uptime 2>/dev/null && echo "---UPTIME_END---" && cat /proc/net/dev 2>/dev/null && echo "---NET_END---" && (cat /etc/os-release 2>/dev/null || cat /usr/lib/os-release 2>/dev/null || echo "") && echo "---OS_END---" && (hostname -I 2>/dev/null || hostname -i 2>/dev/null || echo "")`;

      const rawOutput = await conn.ssh.exec(command);
      const parts = rawOutput.split('\n');

      // 1. CPU
      const cpuEndIdx = parts.indexOf("---CPU_END---");
      const cpuStatOutput = cpuEndIdx >= 0 ? parts.slice(0, cpuEndIdx).join('\n') : "";
      const { cpuLoad, currentCpu, cores, coreLoads } = this.parseCPU(cpuStatOutput, conn.previousCpu);
      if (currentCpu) conn.previousCpu = currentCpu;

      // 2. Otros (el parsing existente busca por palabras clave, así que le pasamos el resto)
      const mem = this.parseMemory(parts);
      const disks = this.parseDisks(parts);
      const uptime = this.parseUptime(parts);

      const { network, currentNet, currentTime } = this.parseNetwork(
        parts,
        conn.previousNet,
        conn.previousTime
      );

      if (currentNet) {
        conn.previousNet = currentNet;
        conn.previousTime = currentTime;
      }

      const ip = this.parseIP(parts, host);
      const { distro, versionId } = this.parseDistro(parts, finalDistroId);

      return {
        cpu: cpuLoad,
        mem,
        disk: disks,
        uptime,
        network,
        distro,
        versionId,
        ip,
        cores,
        coreLoads: coreLoads || null,
        hostname: realHostname
      };
    } catch (error) {
      console.error('[SSH STATS] Error:', error);
      throw error;
    }
  }

  /**
   * Especial para macOS SSH
   */
  async processMacOSSSHStats(conn, realHostname, host) {
    try {
      const commands = [
        "sysctl -n hw.ncpu",
        "ps -A -o %cpu | awk '{s+=$1} END {print s}'",
        "sysctl -n hw.memsize",
        "vm_stat",
        "df -P",
        "uptime",
        "networksetup -listallhardwareports" // Opcional, netstat es mejor
      ];

      // Ejecutar comandos en paralelo (o secuencial si el server es lento)
      const results = await Promise.all(commands.map(cmd => conn.ssh.exec(cmd).catch(() => '')));

      const cores = parseInt(results[0], 10) || 1;
      const cpuLoad = (parseFloat(results[1]) / cores).toFixed(2);
      const totalMem = parseInt(results[2], 10) || 0;
      const mem = this.parseMemoryMacOS(results[3], totalMem);
      const disks = this.parseDisks(results[4].split('\n'));
      const uptime = this.parseUptime(results[5].split('\n'));

      // Netstat para macOS
      const netRes = await conn.ssh.exec("netstat -ib | grep -v 'lo0'");
      const { network, currentNet, currentTime } = this.parseNetworkMacOS(
        netRes,
        conn.previousNet,
        conn.previousTime
      );

      if (currentNet) {
        conn.previousNet = currentNet;
        conn.previousTime = currentTime;
      }

      return {
        cpu: cpuLoad,
        mem,
        disk: disks,
        uptime,
        network,
        distro: 'macos',
        versionId: '',
        ip: host,
        cores,
        coreLoads: null,
        hostname: realHostname
      };
    } catch (e) {
      return this.createFallbackStats(realHostname, 'macos', host);
    }
  }

  /**
   * Parsea red para macOS
   */
  parseNetworkMacOS(netstatOutput, previousNet, previousTime) {
    const lines = netstatOutput.trim().split('\n');
    let totalRx = 0;
    let totalTx = 0;
    const currentTime = Date.now();

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      // macOS netstat -ib format:
      // Name  Mtu   Network       Address            Ipkts Ierrs    Ibytes    Opkts Oerrs    Obytes  Coll
      // en0   1500  <Link#4>    00:00:00:00:00:00  12345     0   1234567    12345     0   1234567     0
      if (parts.length >= 10) {
        const rx = parseInt(parts[6], 10);
        const tx = parseInt(parts[9], 10);
        if (!isNaN(rx)) totalRx += rx;
        if (!isNaN(tx)) totalTx += tx;
      }
    });

    const currentNet = { totalRx, totalTx };
    let network = { rx_speed: 0, tx_speed: 0 };

    if (previousNet && previousTime) {
      const timeDiff = (currentTime - previousTime) / 1000;
      if (timeDiff > 0) {
        network.rx_speed = Math.max(0, (totalRx - previousNet.totalRx) / timeDiff);
        network.tx_speed = Math.max(0, (totalTx - previousNet.totalTx) / timeDiff);
      }
    }

    return { network, currentNet, currentTime };
  }

  /**
   * Procesa output completo de comando de stats para Bastion/Wallix
   */
  processBastionStats(output, bastionStatsState, tabId, configHost) {
    try {
      const parts = output.trim().split('\n');

      // CPU
      const cpuLineIndex = parts.findIndex(line => line.trim().startsWith('cpu '));
      let cpuLoad = '0.00';
      let cores = 1;

      if (cpuLineIndex >= 0) {
        // En Bastion el output viene mezclado, parseCPU ahora sabe buscar prefijo 'cpu'
        const { cpuLoad: parsedCpuLoad, currentCpu, cores: detectedCores, coreLoads: parsedCoreLoads } = this.parseCPU(
          output, // Pasamos el output completo a parseCPU
          bastionStatsState[tabId]?.previousCpu
        );

        cpuLoad = parsedCpuLoad;
        cores = detectedCores;
        var coreLoads = parsedCoreLoads;

        if (currentCpu) {
          if (!bastionStatsState[tabId]) bastionStatsState[tabId] = {};
          bastionStatsState[tabId].previousCpu = currentCpu;
        }
      }

      // Memoria
      const mem = this.parseMemory(parts);

      // Disco
      const disks = this.parseDisksBastion(parts);

      // Uptime
      const uptime = this.parseUptime(parts);

      // Red
      const { network, currentNet, currentTime } = this.parseNetworkBastion(
        parts,
        bastionStatsState[tabId]?.previousNet,
        bastionStatsState[tabId]?.previousTime
      );

      if (currentNet) {
        if (!bastionStatsState[tabId]) bastionStatsState[tabId] = {};
        bastionStatsState[tabId].previousNet = currentNet;
        bastionStatsState[tabId].previousTime = currentTime;
      }

      // Hostname, IP y distro
      const hostname = this.parseHostnameBastion(parts);
      const ip = this.parseIPBastion(parts, configHost);
      const { distro, versionId } = this.parseDistro(parts);

      return {
        cpu: cpuLoad,
        mem,
        disk: disks,
        uptime,
        network,
        distro,
        versionId,
        ip,
        cores,
        coreLoads: typeof coreLoads !== 'undefined' ? coreLoads : null,
        hostname
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Loop principal de estadísticas para conexiones SSH directas
   */
  async startStatsLoop(tabId, conn, realHostname, finalDistroId, host, mainWindow, sshConnections) {
    if (this.activeStatsTabId !== tabId) {
      if (conn) {
        conn.statsTimeout = null;
      }
      return;
    }

    if (!conn || !conn.ssh || !conn.stream || conn.stream.destroyed) {
      return;
    }

    try {
      const stats = await this.processDirectSSHStats(conn, realHostname, finalDistroId, host);

      // Actualizar valores en la conexión
      conn.realHostname = realHostname;
      conn.finalDistroId = finalDistroId;

      sendToRenderer(mainWindow.webContents, `ssh-stats:update:${tabId}`, stats);
    } catch (e) {
      // Silenciar errores de stats
    } finally {
      const finalConn = sshConnections[tabId];
      if (finalConn && finalConn.ssh && finalConn.stream && !finalConn.stream.destroyed) {
        finalConn.statsTimeout = setTimeout(
          () => this.startStatsLoop(tabId, finalConn, realHostname, finalDistroId, host, mainWindow, sshConnections),
          this.statusBarPollingIntervalMs
        );
      }
    }
  }

  /**
   * Loop principal de estadísticas para conexiones Bastion/Wallix
   */
  createBastionStatsLoop(tabId, config, bastionStatsState, sshConnections, sender) {
    const self = this;

    function wallixStatsLoop() {
      const connObj = sshConnections[tabId];

      if (self.activeStatsTabId !== tabId) {
        if (connObj) {
          connObj.statsTimeout = null;
          connObj.statsLoopRunning = false;
        }
        return;
      }

      if (!connObj || !connObj.ssh || !connObj.stream) {
        return;
      }

      if (connObj.statsLoopRunning) {
        return;
      }

      connObj.statsLoopRunning = true;

      try {
        if (connObj.ssh.execCommand) {
          const command = 'grep "^cpu" /proc/stat && free -b && df -P && uptime && cat /proc/net/dev && hostname && hostname -I 2>/dev/null || hostname -i 2>/dev/null || echo "" && cat /etc/os-release';

          connObj.ssh.execCommand(command, (err, result) => {
            if (err || !result) {
              // Enviar stats básicas en caso de error
              const fallbackStats = self.createFallbackStats('Bastión', 'linux', config.host);
              sendToRenderer(sender, `ssh-stats:update:${tabId}`, fallbackStats);

              // Reintentar en 5 segundos
              if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream &&
                !sshConnections[tabId].stream.destroyed && self.activeStatsTabId === tabId) {
                sshConnections[tabId].statsLoopRunning = false;
                sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 5000);
              } else {
                if (sshConnections[tabId]) sshConnections[tabId].statsLoopRunning = false;
              }
              return;
            }

            try {
              const stats = self.processBastionStats(result.stdout, bastionStatsState, tabId, config.host);
              sendToRenderer(sender, `ssh-stats:update:${tabId}`, stats);
            } catch (parseErr) {
              // Error parseando stats
            }

            // Programar siguiente ejecución
            if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream &&
              !sshConnections[tabId].stream.destroyed && self.activeStatsTabId === tabId) {
              sshConnections[tabId].statsLoopRunning = false;
              sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 5000); // 5s para reducir contención en Bastion
            } else {
              if (sshConnections[tabId]) sshConnections[tabId].statsLoopRunning = false;
            }
          });
        } else {
          // Fallback con stats básicas
          const fallbackStats = self.createFallbackStats('Bastión', 'linux', config.host);
          sendToRenderer(sender, `ssh-stats:update:${tabId}`, fallbackStats);
        }
      } catch (e) {
        // Reintentar en 5 segundos
        if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream &&
          !sshConnections[tabId].stream.destroyed && self.activeStatsTabId === tabId) {
          sshConnections[tabId].statsLoopRunning = false;
          sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 5000);
        } else {
          if (sshConnections[tabId]) sshConnections[tabId].statsLoopRunning = false;
        }
      }
    }

    return wallixStatsLoop;
  }

  /**
   * Detiene el loop de estadísticas para un tabId
   */
  stopStatsLoop(tabId, sshConnections) {
    const conn = sshConnections[tabId];
    if (conn && conn.statsTimeout) {
      clearTimeout(conn.statsTimeout);
      conn.statsTimeout = null;
      conn.statsLoopRunning = false;
    }
  }

  /**
   * Detiene todos los loops de estadísticas excepto el activo
   */
  stopInactiveStatsLoops(sshConnections, activeTabId) {
    Object.entries(sshConnections).forEach(([id, conn]) => {
      if (id !== String(activeTabId)) {
        if (conn.statsTimeout) {
          clearTimeout(conn.statsTimeout);
          conn.statsTimeout = null;
        }
        conn.statsLoopRunning = false;
      }
    });
  }
}

// Exportar instancia única (singleton)
module.exports = new SSHStatsService();
