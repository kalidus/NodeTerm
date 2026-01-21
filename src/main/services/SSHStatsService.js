/**
 * SSHStatsService - Servicio centralizado para recolección y parsing de estadísticas SSH
 * Maneja tanto conexiones SSH directas como conexiones Bastion/Wallix
 */

const { parseDfOutput, parseNetDev, sendToRenderer } = require('../utils');

class SSHStatsService {
  constructor() {
    this.activeStatsTabId = null;
    this.statusBarPollingIntervalMs = 3000; // 3 segundos por defecto
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
   */
  parseCPU(cpuStatOutput, previousCpu) {
    const cpuTimes = cpuStatOutput.trim().split(/\s+/).slice(1).map(t => parseInt(t, 10));
    let cpuLoad = '0.00';
    
    if (cpuTimes.length < 8) {
      return { cpuLoad, currentCpu: null };
    }

    const currentCpu = {
      user: cpuTimes[0],
      nice: cpuTimes[1],
      system: cpuTimes[2],
      idle: cpuTimes[3],
      iowait: cpuTimes[4],
      irq: cpuTimes[5],
      softirq: cpuTimes[6],
      steal: cpuTimes[7]
    };

    if (previousCpu) {
      const prevIdle = previousCpu.idle + previousCpu.iowait;
      const currentIdle = currentCpu.idle + currentCpu.iowait;
      const prevTotal = Object.values(previousCpu).reduce((a, b) => a + b, 0);
      const currentTotal = Object.values(currentCpu).reduce((a, b) => a + b, 0);
      const totalDiff = currentTotal - prevTotal;
      const idleDiff = currentIdle - prevIdle;
      
      if (totalDiff > 0) {
        cpuLoad = ((totalDiff - idleDiff) * 100 / totalDiff).toFixed(2);
      }
    }

    return { cpuLoad, currentCpu };
  }

  /**
   * Parsea memoria del output de 'free -b'
   */
  parseMemory(parts) {
    const memLine = parts.find(line => line.startsWith('Mem:')) || '';
    const memParts = memLine.split(/\s+/);
    
    return {
      total: parseInt(memParts[1], 10) || 0,
      used: parseInt(memParts[2], 10) || 0,
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
        const name = p[p.length - 1];
        
        // Filtrar montajes no relevantes
        if (name && name.startsWith('/') && !isNaN(use) && 
            !name.startsWith('/sys') && 
            !name.startsWith('/opt') && 
            !name.startsWith('/run') && 
            name !== '/boot/efi' && 
            !name.startsWith('/dev') && 
            !name.startsWith('/var')) {
          return { fs: name, use };
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

    const netLines = parts.slice(netIndex + 2, netIndex + 4);
    let totalRx = 0, totalTx = 0;
    
    netLines.forEach(line => {
      const p = line.trim().split(/\s+/);
      if (p.length >= 10) {
        totalRx += parseInt(p[1], 10) || 0;
        totalTx += parseInt(p[9], 10) || 0;
      }
    });

    const currentTime = Date.now();
    let network = { rx_speed: 0, tx_speed: 0 };

    if (previousNet && previousTime) {
      const timeDiff = (currentTime - previousTime) / 1000;
      const rxDiff = totalRx - previousNet.totalRx;
      const txDiff = totalTx - previousNet.totalTx;
      
      network.rx_speed = Math.max(0, rxDiff / timeDiff);
      network.tx_speed = Math.max(0, txDiff / timeDiff);
    }

    return { 
      network, 
      currentNet: { totalRx, totalTx }, 
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
      // CPU
      const cpuStatOutput = await conn.ssh.exec("grep 'cpu ' /proc/stat");
      const { cpuLoad, currentCpu } = this.parseCPU(cpuStatOutput, conn.previousCpu);
      
      if (currentCpu) {
        conn.previousCpu = currentCpu;
      }

      // Memoria, disco, uptime, red, IP
      const allStatsRes = await conn.ssh.exec(
        "free -b && df -P && uptime && cat /proc/net/dev && hostname -I 2>/dev/null || hostname -i 2>/dev/null || echo ''"
      );
      const parts = allStatsRes.trim().split('\n');

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
        hostname: realHostname,
        distro,
        versionId,
        ip
      };
    } catch (error) {
      throw error;
    }
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
      
      if (cpuLineIndex >= 0) {
        const cpuLine = parts[cpuLineIndex];
        const { cpuLoad: parsedCpuLoad, currentCpu } = this.parseCPU(
          cpuLine, 
          bastionStatsState[tabId]?.previousCpu
        );
        
        cpuLoad = parsedCpuLoad;
        
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
        hostname,
        distro,
        versionId,
        ip
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
          const command = 'grep "cpu " /proc/stat && free -b && df -P && uptime && cat /proc/net/dev && hostname && hostname -I 2>/dev/null || hostname -i 2>/dev/null || echo "" && cat /etc/os-release';
          
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
              sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 2000);
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
