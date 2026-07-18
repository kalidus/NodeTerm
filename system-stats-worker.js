// system-stats-worker.js
// ⚠️  SIN SUBPROCESOS EXTERNOS: nvidia-smi, sensors y df se bloquean en estado
// D (uninterruptible sleep) con drivers NVIDIA en CachyOS/Wayland. SIGKILL no
// puede interrumpir procesos en estado D. Usamos solo APIs del kernel directamente.

const os = require('os');
const fs = require('fs');

// systeminformation solo para currentLoad() que lee /proc/stat sin subprocesos
let _si = null;
function getSI() {
  if (!_si) _si = require('systeminformation');
  return _si;
}

let detectedOsPrettyName = '';
if (process.platform === 'linux') {
  try {
    const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
    const match = osRelease.match(/^PRETTY_NAME="?([^"\n]+)"?/m);
    if (match) {
      detectedOsPrettyName = match[1];
    }
  } catch (_) {}
} else if (process.platform === 'darwin') {
  detectedOsPrettyName = 'macOS';
} else if (process.platform === 'win32') {
  detectedOsPrettyName = 'Windows';
}

let lastNetStats = null;
let lastNetTime = null;
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
  osPrettyName: detectedOsPrettyName,
  uptime: ''
};

// ── Temperatura CPU desde /sys/class/thermal (sin subprocesos) ──
function readCpuTempSync() {
  try {
    const base = '/sys/class/thermal';
    const zones = fs.readdirSync(base).filter(z => z.startsWith('thermal_zone'));
    const temps = [];
    for (const zone of zones) {
      try {
        const type = fs.readFileSync(`${base}/${zone}/type`, 'utf8').trim();
        if (/cpu|acpi|x86_pkg|coretemp|tdie|tccd/i.test(type)) {
          const raw = parseInt(fs.readFileSync(`${base}/${zone}/temp`, 'utf8').trim(), 10);
          if (!isNaN(raw) && raw > 0) temps.push(raw / 1000);
        }
      } catch (_) {}
    }
    return temps.length > 0 ? Math.round(Math.max(...temps) * 10) / 10 : 0;
  } catch (_) { return 0; }
}

// ── Discos desde /proc/mounts + statfsSync (sin subprocesos) ──
function readDisksSync() {
  try {
    const lines = fs.readFileSync('/proc/mounts', 'utf8').split('\n').filter(Boolean);
    const results = [];
    const seen = new Set();
    const SKIP_FS = /^(proc|sysfs|devtmpfs|devpts|tmpfs|cgroup|cgroup2|pstore|bpf|tracefs|debugfs|securityfs|autofs|hugetlbfs|mqueue|fusectl|configfs|efivarfs|nsfs|overlay|squashfs|ramfs|udev|fuse\.gvfsd|fuse\.portal)$/i;
    for (const line of lines) {
      const parts = line.split(' ');
      if (parts.length < 3) continue;
      const [dev, mount, fstype] = parts;
      if (SKIP_FS.test(fstype)) continue;
      if (/^\/(?:sys|proc|dev\/pts|run)/.test(mount)) continue;
      if (seen.has(mount)) continue;
      seen.add(mount);
      try {
        const stat = fs.statfsSync(mount);
        const total = stat.blocks * stat.bsize;
        const free = stat.bfree * stat.bsize;
        const used = total - free;
        if (total < 1024 * 1024) continue;
        const isNetwork = /\b(cifs|smb|nfs|sshfs|fuse\.sshfs|davfs)\b/i.test(fstype) || dev.startsWith('//') || dev.startsWith('\\\\');
        results.push({
          name: dev,
          mount,
          used: Math.round(used / (1024 ** 3) * 10) / 10,
          total: Math.round(total / (1024 ** 3) * 10) / 10,
          percentage: total > 0 ? Math.round((used / total) * 100) : 0,
          isNetwork
        });
      } catch (_) {}
    }
    if (process.platform === 'darwin') {
      const root = results.find(d => d.mount === '/');
      return root ? [{ ...root, name: 'Macintosh HD' }] : results;
    }
    return results;
  } catch (_) { return []; }
}

// ── Red desde /proc/net/dev (sin subprocesos) ──
function readNetRaw() {
  try {
    const lines = fs.readFileSync('/proc/net/dev', 'utf8').split('\n');
    const ifaces = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('Inter') || t.startsWith('face')) continue;
      const ci = t.indexOf(':');
      if (ci < 0) continue;
      const name = t.substring(0, ci).trim();
      if (name === 'lo') continue;
      const vals = t.substring(ci + 1).trim().split(/\s+/);
      if (vals.length < 10) continue;
      ifaces.push({ iface: name, rx_bytes: parseInt(vals[0], 10) || 0, tx_bytes: parseInt(vals[8], 10) || 0 });
    }
    return ifaces;
  } catch (_) { return []; }
}

// ── IPs desde os.networkInterfaces() (sin subprocesos) ──
function readNetIfaces() {
  try {
    return Object.entries(os.networkInterfaces() || {}).reduce((acc, [name, addrs]) => {
      if (!addrs) return acc;
      const ip4 = addrs.find(a => a.family === 'IPv4' && !a.internal)?.address || '';
      const ip6 = addrs.find(a => a.family === 'IPv6' && !a.internal)?.address || '';
      if (ip4 || ip6) {
        const mac = addrs.find(a => a.mac && a.mac !== '00:00:00:00:00:00')?.mac || '';
        acc.push({ iface: name, ip4, ip6, mac, operstate: 'unknown', rx_speed: 0, tx_speed: 0 });
      }
      return acc;
    }, []);
  } catch (_) { return []; }
}

async function getSystemStats() {
  // Uptime
  let uptime = '';
  try {
    const s = os.uptime();
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    uptime = d > 0 ? `${d} ${d === 1 ? 'day' : 'days'}, ${h}:${String(m).padStart(2, '0')}` : `${h}:${String(m).padStart(2, '0')}`;
  } catch (_) {}

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
    osPrettyName: detectedOsPrettyName || lastValidStats.osPrettyName || '',
    uptime
  };

  // ── Memoria (os.* — sin subprocesos) ──
  try {
    const total = os.totalmem(), free = os.freemem(), used = total - free;
    if (total > 0) {
      stats.memory.total = Math.round(total / (1024 ** 3) * 10) / 10;
      stats.memory.used = Math.round(used / (1024 ** 3) * 10) / 10;
      stats.memory.free = Math.round(free / (1024 ** 3) * 10) / 10;
      stats.memory.percentage = Math.round((used / total) * 1000) / 10;
    }
  } catch (_) {}

  // ── CPU load (systeminformation.currentLoad lee /proc/stat — sin subprocesos) ──
  try {
    const cpuData = await Promise.race([
      getSI().currentLoad(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('CPU timeout')), 3000))
    ]);
    if (cpuData && typeof cpuData.currentLoad === 'number') {
      stats.cpu.usage = Math.round(cpuData.currentLoad * 10) / 10;
      stats.cpu.cores = cpuData.cpus ? cpuData.cpus.length : os.cpus().length;
      stats.cpu.model = os.cpus()[0]?.model || 'CPU';
      stats.cpu.perCpuLoad = cpuData.cpus ? cpuData.cpus.map(c => Math.round((c.load || 0) * 10) / 10) : [];
    }
  } catch (_) {}

  // ── Discos ──
  if (process.platform === 'win32') {
    try {
      const d = await Promise.race([getSI().fsSize(), new Promise((_, rej) => setTimeout(() => rej(), 3000))]);
      if (Array.isArray(d) && d.length > 0) {
        stats.disks = d.map(disk => ({
          name: String(disk.fs || ''), mount: String(disk.mount || ''),
          used: Math.round(Number(disk.used || 0) / (1024 ** 3) * 10) / 10,
          total: Math.round(Number(disk.size || 0) / (1024 ** 3) * 10) / 10,
          percentage: Number(disk.size) > 0 ? Math.round((Number(disk.used) / Number(disk.size)) * 100) : 0,
          isNetwork: false
        }));
      }
    } catch (_) {}
  } else {
    const disks = readDisksSync();
    if (disks.length > 0) stats.disks = disks;
  }

  // ── Red (/proc/net/dev — sin subprocesos) ──
  try {
    const now = Date.now();
    const ifaceAddrs = readNetIfaces();
    const netRaw = readNetRaw();
    if (lastNetStats && lastNetTime && netRaw.length > 0) {
      const dt = (now - lastNetTime) / 1000;
      if (dt > 0) {
        let rx = 0, tx = 0;
        const speeds = [];
        for (const iface of netRaw) {
          const prev = lastNetStats.find(p => p.iface === iface.iface);
          if (prev) {
            const rxD = Math.max(0, iface.rx_bytes - prev.rx_bytes);
            const txD = Math.max(0, iface.tx_bytes - prev.tx_bytes);
            rx += rxD; tx += txD;
            const meta = ifaceAddrs.find(a => a.iface === iface.iface) || {};
            speeds.push({ iface: iface.iface, ip4: meta.ip4 || '', ip6: meta.ip6 || '', mac: meta.mac || '', operstate: 'unknown', rx_speed: rxD / dt, tx_speed: txD / dt });
          }
        }
        stats.network.download = Math.round((rx * 8 / 1e6) / dt * 10) / 10;
        stats.network.upload = Math.round((tx * 8 / 1e6) / dt * 10) / 10;
        if (speeds.length > 0) stats.networkInterfaces = speeds;
      }
    } else {
      stats.networkInterfaces = ifaceAddrs;
    }
    lastNetStats = netRaw;
    lastNetTime = now;
    const primary = ifaceAddrs[0];
    if (primary?.ip4 || primary?.ip6) stats.ip = primary.ip4 || primary.ip6;
  } catch (_) {}

  // ── Temperatura CPU (/sys/class/thermal — sin subprocesos) ──
  // ❌ NO usar nvidia-smi ni sensors: se bloquean en estado D en CachyOS/NVIDIA
  try {
    const t = readCpuTempSync();
    if (t > 0) stats.temperature.cpu = t;
  } catch (_) {}
  // stats.temperature.gpu permanece en 0 — nvidia-smi no es llamado

  lastValidStats = {
    cpu: { ...stats.cpu }, memory: { ...stats.memory }, disks: [...stats.disks],
    network: { ...stats.network },
    networkInterfaces: Array.isArray(stats.networkInterfaces) ? [...stats.networkInterfaces] : [],
    hostname: stats.hostname, ip: stats.ip, temperature: { ...stats.temperature },
    platform: stats.platform, arch: stats.arch, kernel: stats.kernel,
    osVersion: stats.osVersion, osPrettyName: stats.osPrettyName || detectedOsPrettyName, uptime: stats.uptime
  };

  return stats;
}

let shouldGenerateStats = true;

process.on('message', async (msg) => {
  if (msg === 'get-stats') {
    if (!shouldGenerateStats) return;
    try {
      const stats = await getSystemStats();
      if (process.connected) process.send({ type: 'stats', data: stats });
    } catch (error) {
      if (process.connected) process.send({ type: 'error', error: error.message });
    }
  } else if (msg === 'pause-stats') {
    shouldGenerateStats = false;
  } else if (msg === 'resume-stats') {
    shouldGenerateStats = true;
  }
});
