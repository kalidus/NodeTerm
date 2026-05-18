// system-stats-worker.js
// 🚀 OPTIMIZACIÓN: Lazy loading de systeminformation
const os = require('os');

// systeminformation se carga solo cuando se necesita
let _si = null;
function getSI() {
  if (!_si) {
    _si = require('systeminformation');
  }
  return _si;
}

let lastNetStats = null;
let lastNetTime = null;
// Cache para unidades de red (se actualiza cada 30 segundos)
let networkDrivesCache = { data: new Set(), timestamp: 0, ttl: 30000 };
// Sticky stats para mantener estado cuando hay errores
let lastValidStats = {
  cpu: { usage: 0, cores: 0, model: 'Iniciando...', perCpuLoad: [] },
  memory: { used: 0, total: 0, free: 0, percentage: 0 },
  disks: [],
  network: { download: 0, upload: 0 },
  networkInterfaces: [],
  hostname: '',
  ip: '',
  temperature: { cpu: 0, gpu: 0 },
  platform: process.platform,
  arch: os.arch(),
  kernel: os.release(),
  osVersion: (typeof os.version === 'function' ? os.version() : ''),
  osPrettyName: ''
};

async function getSystemStats() {
  // Comenzar con los últimos valores válidos conocidos
  const stats = {
    cpu: { ...lastValidStats.cpu },
    memory: { ...lastValidStats.memory },
    disks: [...lastValidStats.disks],
    network: { ...lastValidStats.network },
    networkInterfaces: Array.isArray(lastValidStats.networkInterfaces) ? [...lastValidStats.networkInterfaces] : [],
    hostname: os.hostname(),
    ip: lastValidStats.ip || '',
    temperature: { ...lastValidStats.temperature },
    platform: process.platform,
    arch: os.arch(),
    kernel: os.release(),
    osVersion: (typeof os.version === 'function' ? os.version() : ''),
    osPrettyName: lastValidStats.osPrettyName || ''
  };

  // Memoria (siempre disponible, actualizar directamente)
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    if (totalMem > 0) {
      stats.memory.total = Math.round(totalMem / (1024 * 1024 * 1024) * 10) / 10;
      stats.memory.used = Math.round(usedMem / (1024 * 1024 * 1024) * 10) / 10;
      stats.memory.free = Math.round(freeMem / (1024 * 1024 * 1024) * 10) / 10;
      stats.memory.percentage = Math.round((usedMem / totalMem) * 100 * 10) / 10;
    }
  } catch (error) {
    // Mantener valores anteriores si falla
  }

  // CPU (solo actualizar si obtiene datos válidos)
  try {
    const cpuData = await Promise.race([
      getSI().currentLoad(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('CPU timeout')), 3000))
    ]);

    if (cpuData && typeof cpuData.currentLoad === 'number') {
      stats.cpu.usage = Math.round(cpuData.currentLoad * 10) / 10;
      stats.cpu.cores = cpuData.cpus ? cpuData.cpus.length : os.cpus().length;
      stats.cpu.model = os.cpus()[0]?.model || 'CPU';
      stats.cpu.perCpuLoad = cpuData.cpus
        ? cpuData.cpus.map(c => Math.round((c.load || 0) * 10) / 10)
        : [];
    }
  } catch (error) {
    // Mantener valores anteriores de CPU si falla
  }

  // Discos - optimizado con timeout reducido y detección de red asíncrona
  try {
    const diskData = await Promise.race([
      getSI().fsSize(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Disk timeout')), 2500)) // Reducido de 5000ms a 2500ms
    ]);
    if (Array.isArray(diskData) && diskData.length > 0) {
      // Detectar unidades de red en Windows de forma asíncrona
      const isWindows = process.platform === 'win32';
      const isMacOS = process.platform === 'darwin';
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
        let processedDisks = diskData.map(disk => {
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

        // En macOS, mostrar solo volúmenes principales con nombres amigables
        if (isMacOS) {
          // REEMPLAZAR completamente la lista de discos con solo Macintosh HD
          processedDisks = [{
            name: 'Macintosh HD',
            mount: '/',
            used: processedDisks.find(d => d.mount === '/')?.used || 0,
            total: processedDisks.find(d => d.mount === '/')?.total || 0,
            percentage: processedDisks.find(d => d.mount === '/')?.percentage || 0,
            isNetwork: false
          }];
        }

        stats.disks = processedDisks;
      }
      // Si falla o no hay datos, mantener la lista anterior de discos
    }
  } catch (error) { }

  // Red
  try {
    const netIfaces = await getSI().networkInterfaces();
    const netStats = await getSI().networkStats();
    const now = Date.now();
    const validIfaces = netIfaces.filter(i => !i.internal && i.iface);
    const validNames = validIfaces.map(i => i.iface);
    const filteredStats = netStats.filter(s => validNames.includes(s.iface));

    // Publicar lista base de interfaces aunque no haya trafico
    stats.networkInterfaces = validIfaces.map((i) => ({
      iface: i.iface,
      ip4: i.ip4 || '',
      ip6: i.ip6 || '',
      mac: i.mac || '',
      operstate: i.operstate || '',
      rx_speed: 0,
      tx_speed: 0
    }));

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
      const ifaceSpeeds = [];
      if (lastNetStats && lastNetTime) {
        const dt = (now - lastNetTime) / 1000;
        for (const stat of filteredStats) {
          const prev = lastNetStats.find(s => s.iface === stat.iface);
          if (prev) {
            const rxDelta = Math.max(0, stat.rx_bytes - prev.rx_bytes);
            const txDelta = Math.max(0, stat.tx_bytes - prev.tx_bytes);
            rx += rxDelta;
            tx += txDelta;
            const meta = validIfaces.find(i => i.iface === stat.iface);
            ifaceSpeeds.push({
              iface: stat.iface,
              ip4: meta?.ip4 || '',
              ip6: meta?.ip6 || '',
              mac: meta?.mac || '',
              operstate: meta?.operstate || '',
              rx_speed: dt > 0 ? rxDelta / dt : 0,
              tx_speed: dt > 0 ? txDelta / dt : 0
            });
          }
        }
        if (dt > 0) {
          stats.network.download = Math.round((rx * 8 / 1e6) / dt * 10) / 10;
          stats.network.upload = Math.round((tx * 8 / 1e6) / dt * 10) / 10;
        }
        const ifaceSpeedMap = new Map(ifaceSpeeds.map((i) => [i.iface, i]));
        stats.networkInterfaces = validIfaces.map((i) => {
          const live = ifaceSpeedMap.get(i.iface);
          return {
            iface: i.iface,
            ip4: i.ip4 || '',
            ip6: i.ip6 || '',
            mac: i.mac || '',
            operstate: i.operstate || '',
            rx_speed: live?.rx_speed || 0,
            tx_speed: live?.tx_speed || 0
          };
        });
      }
      lastNetStats = filteredStats.map(s => ({ iface: s.iface, rx_bytes: s.rx_bytes, tx_bytes: s.tx_bytes }));
      lastNetTime = now;
    }
  } catch (error) { }

  // Temperatura (solo actualizar si obtenemos datos válidos)
  try {
    const tempData = await Promise.race([
      getSI().cpuTemperature(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Temperature timeout')), 2000))
    ]);

    if (tempData && typeof tempData.main === 'number' && tempData.main > 0) {
      stats.temperature.cpu = tempData.main;
    }
    // Si falla o no hay datos, mantener temperatura anterior
  } catch (error) { }

  // Guardar los stats actuales como últimos válidos
  lastValidStats = {
    cpu: { ...stats.cpu },
    memory: { ...stats.memory },
    disks: [...stats.disks],
    network: { ...stats.network },
    networkInterfaces: Array.isArray(stats.networkInterfaces) ? [...stats.networkInterfaces] : [],
    hostname: stats.hostname,
    ip: stats.ip,
    temperature: { ...stats.temperature },
    platform: stats.platform,
    arch: stats.arch,
    kernel: stats.kernel,
    osVersion: stats.osVersion,
    osPrettyName: stats.osPrettyName
  };

  return stats;
}

// Variable para controlar si se deben generar estadísticas
let shouldGenerateStats = true;

process.on('message', async (msg) => {
  if (msg === 'get-stats') {
    if (!shouldGenerateStats) {
      return;
    }
    try {
      const stats = await getSystemStats();
      if (process.connected) {
        process.send({ type: 'stats', data: stats });
      }
    } catch (error) {
      if (process.connected) {
        process.send({ type: 'error', error: error.message });
      }
    }
  } else if (msg === 'pause-stats') {
    shouldGenerateStats = false;
  } else if (msg === 'resume-stats') {
    shouldGenerateStats = true;
  }
}); 