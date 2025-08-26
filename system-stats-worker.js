// system-stats-worker.js
const os = require('os');
const si = require('systeminformation');
const { execSync } = require('child_process');

let lastNetStats = null;
let lastNetTime = null;
// Cache para unidades de red (se actualiza cada 30 segundos)
let networkDrivesCache = { data: new Set(), timestamp: 0, ttl: 30000 };
// Sticky stats para mantener estado cuando hay errores
let lastValidStats = {
  cpu: { usage: 0, cores: 0, model: 'Iniciando...' },
  memory: { used: 0, total: 0, percentage: 0 },
  disks: [],
  network: { download: 0, upload: 0 },
  hostname: '',
  ip: '',
  temperature: { cpu: 0, gpu: 0 }
};

async function getSystemStats() {
  // Comenzar con los últimos valores válidos conocidos
  const stats = {
    cpu: { ...lastValidStats.cpu },
    memory: { ...lastValidStats.memory },
    disks: [...lastValidStats.disks],
    network: { ...lastValidStats.network },
    hostname: lastValidStats.hostname || os.hostname(),
    ip: lastValidStats.ip || '',
    temperature: { ...lastValidStats.temperature }
  };

  // Memoria (siempre disponible, actualizar directamente)
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    if (totalMem > 0) {
      stats.memory.total = Math.round(totalMem / (1024 * 1024 * 1024) * 10) / 10;
      stats.memory.used = Math.round(usedMem / (1024 * 1024 * 1024) * 10) / 10;
      stats.memory.percentage = Math.round((usedMem / totalMem) * 100 * 10) / 10;
    }
  } catch (error) {
    // Mantener valores anteriores si falla
  }

  // CPU (solo actualizar si obtiene datos válidos)
  try {
    const cpuData = await Promise.race([
      si.currentLoad(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('CPU timeout')), 3000))
    ]);
    
    if (cpuData && typeof cpuData.currentLoad === 'number') {
      stats.cpu.usage = Math.round(cpuData.currentLoad * 10) / 10;
      stats.cpu.cores = cpuData.cpus ? cpuData.cpus.length : os.cpus().length;
      stats.cpu.model = os.cpus()[0]?.model || 'CPU';
    }
  } catch (error) {
    // Mantener valores anteriores de CPU si falla
  }

  // Discos - optimizado con timeout reducido y detección de red asíncrona
  try {
    const diskData = await Promise.race([
      si.fsSize(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Disk timeout')), 2500)) // Reducido de 5000ms a 2500ms
    ]);
    if (Array.isArray(diskData) && diskData.length > 0) {
      // Detectar unidades de red en Windows de forma asíncrona
      const isWindows = process.platform === 'win32';
      let networkLetters = new Set();
      
      if (isWindows) {
        const now = Date.now();
        
        // Usar cache si es válido (TTL de 30 segundos)
        if (now - networkDrivesCache.timestamp < networkDrivesCache.ttl) {
          networkLetters = networkDrivesCache.data;
        } else {
          // Actualizar cache de forma asíncrona y con timeout reducido
          try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
                      // Solo PowerShell optimizado con timeout más agresivo en primera ejecución
          const isFirstRun = networkDrivesCache.timestamp === 0;
          const timeout = isFirstRun ? 400 : 600; // Más rápido en primera ejecución
          const ps = 'powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_LogicalDisk -Filter \\"DriveType=4\\" | Select-Object -ExpandProperty DeviceID"';
          const { stdout } = await Promise.race([
            execAsync(ps, { timeout }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Network detection timeout')), timeout))
          ]);
            
            const newNetworkLetters = new Set();
            stdout.split(/\r?\n/).forEach(line => {
              const m = line && line.match(/^[A-Z]:/i);
              if (m) newNetworkLetters.add(m[0].toUpperCase());
            });
            
            // Actualizar cache
            networkDrivesCache = {
              data: newNetworkLetters,
              timestamp: now,
              ttl: 30000
            };
            networkLetters = newNetworkLetters;
          } catch {
            // Si falla, mantener cache anterior o usar Set vacío
            networkLetters = networkDrivesCache.data;
          }
        }
      }

      // Solo actualizar discos si obtenemos datos válidos y completos
      if (diskData && diskData.length > 0) {
        stats.disks = diskData.map(disk => {
          const size = Number(disk.size || 0);
          const used = Number(disk.used || 0);
          const percentage = size > 0 ? Math.round((used / size) * 100) : 0;
          const fs = String(disk.fs || '');
          const mount = String(disk.mount || '');
          const type = String(disk.type || '');
          // Heurística robusta para red
          const isUNC = fs.startsWith('\\\\') || fs.startsWith('//') || mount.startsWith('\\\\') || mount.startsWith('//');
          const isNetworkType = /\b(cifs|smb|smbfs|nfs|afs|gluster|glusterfs|ceph|iscsi|webdav|davfs|sshfs|fuse.sshfs)\b/i.test(type);
          let isNetwork = isUNC || isNetworkType;
          if (!isNetwork && isWindows) {
            // Detectar por letra de unidad mapeada (Z:, Y:, etc.)
            const letter = (mount || fs).match(/^[A-Z]:/i);
            if (letter && networkLetters.has(letter[0].toUpperCase())) {
              isNetwork = true;
            }
          }
          return {
            name: fs,
            mount,
            used: Math.round(used / (1024 * 1024 * 1024) * 10) / 10,
            total: Math.round(size / (1024 * 1024 * 1024) * 10) / 10,
            percentage,
            isNetwork
          };
        });
      }
      // Si falla o no hay datos, mantener la lista anterior de discos
    }
  } catch (error) {}

  // Red
  try {
    const netIfaces = await si.networkInterfaces();
    const netStats = await si.networkStats();
    const now = Date.now();
    const validIfaces = netIfaces.filter(i => i.operstate === 'up' && !i.virtual && !i.internal);
    const validNames = validIfaces.map(i => i.iface);
    const filteredStats = netStats.filter(s => validNames.includes(s.iface));

    // Solo actualizar red si obtenemos datos válidos
    if (validIfaces && validIfaces.length > 0) {
      const primary = validIfaces[0];
      if (primary && (primary.ip4 || primary.ip6)) {
        stats.ip = primary.ip4 || primary.ip6 || '';
      }
    }
    
    // Actualizar estadísticas de red solo si hay datos válidos
    if (filteredStats && filteredStats.length > 0) {
      let rx = 0, tx = 0;
      if (lastNetStats && lastNetTime) {
        for (const stat of filteredStats) {
          const prev = lastNetStats.find(s => s.iface === stat.iface);
          if (prev) {
            rx += Math.max(0, stat.rx_bytes - prev.rx_bytes);
            tx += Math.max(0, stat.tx_bytes - prev.tx_bytes);
          }
        }
        const dt = (now - lastNetTime) / 1000;
        if (dt > 0) {
          stats.network.download = Math.round((rx * 8 / 1e6) / dt * 10) / 10;
          stats.network.upload = Math.round((tx * 8 / 1e6) / dt * 10) / 10;
        }
      }
      lastNetStats = filteredStats.map(s => ({ iface: s.iface, rx_bytes: s.rx_bytes, tx_bytes: s.tx_bytes }));
      lastNetTime = now;
    }
  } catch (error) {}

  // Temperatura (solo actualizar si obtenemos datos válidos)
  try {
    const tempData = await Promise.race([
      si.cpuTemperature(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Temperature timeout')), 2000))
    ]);
    
    if (tempData && typeof tempData.main === 'number' && tempData.main > 0) {
      stats.temperature.cpu = tempData.main;
    }
    // Si falla o no hay datos, mantener temperatura anterior
  } catch (error) {}

  // Guardar los stats actuales como últimos válidos
  lastValidStats = {
    cpu: { ...stats.cpu },
    memory: { ...stats.memory },
    disks: [...stats.disks],
    network: { ...stats.network },
    hostname: stats.hostname,
    ip: stats.ip,
    temperature: { ...stats.temperature }
  };

  return stats;
}

// Variable para controlar si se deben generar estadísticas
let shouldGenerateStats = true;

process.on('message', async (msg) => {
  if (msg === 'get-stats') {
    try {
      const stats = await getSystemStats();
      process.send({ type: 'stats', data: stats });
    } catch (error) {
      process.send({ type: 'error', error: error.message });
    }
  } else if (msg === 'pause-stats') {
    shouldGenerateStats = false;
  } else if (msg === 'resume-stats') {
    shouldGenerateStats = true;
  }
}); 