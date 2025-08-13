// system-stats-worker.js
const os = require('os');
const si = require('systeminformation');

let lastNetStats = null;
let lastNetTime = null;

async function getSystemStats() {
  const stats = {
    cpu: {
      usage: 0,
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Desconocido'
    },
    memory: {
      used: 0,
      total: 0,
      percentage: 0
    },
    disks: [],
    network: {
      download: 0,
      upload: 0
    },
    hostname: os.hostname(),
    ip: '',
    temperature: {
      cpu: 0,
      gpu: 0
    }
  };

  // Memoria
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  stats.memory.total = Math.round(totalMem / (1024 * 1024 * 1024) * 10) / 10;
  stats.memory.used = Math.round(usedMem / (1024 * 1024 * 1024) * 10) / 10;
  stats.memory.percentage = Math.round((usedMem / totalMem) * 100 * 10) / 10;

  // CPU
  try {
    const cpuData = await Promise.race([
      si.currentLoad(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('CPU timeout')), 3000))
    ]);
    stats.cpu.usage = Math.round(cpuData.currentLoad * 10) / 10;
    stats.cpu.cores = cpuData.cpus.length;
  } catch (error) {}

  // Discos
  try {
    const diskData = await Promise.race([
      si.fsSize(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Disk timeout')), 5000))
    ]);
    if (diskData && diskData.length > 0) {
      stats.disks = diskData.map(disk => ({
        name: disk.fs,
        used: Math.round(disk.used / (1024 * 1024 * 1024) * 10) / 10,
        total: Math.round(disk.size / (1024 * 1024 * 1024) * 10) / 10,
        percentage: Math.round((disk.used / disk.size) * 100)
      }));
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

    // Primary IP (prefer IPv4)
    if (validIfaces.length > 0) {
      const primary = validIfaces[0];
      stats.ip = primary.ip4 || primary.ip6 || '';
    }
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
  } catch (error) {}

  // Temperatura
  try {
    const tempData = await Promise.race([
      si.cpuTemperature(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Temperature timeout')), 2000))
    ]);
    stats.temperature.cpu = tempData.main || 0;
  } catch (error) {}

  return stats;
}

process.on('message', async (msg) => {
  if (msg === 'get-stats') {
    try {
      const stats = await getSystemStats();
      process.send({ type: 'stats', data: stats });
    } catch (error) {
      process.send({ type: 'error', error: error.message });
    }
  }
}); 