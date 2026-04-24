/**
 * Utilidades para parsing de datos del sistema
 * - Parsear salida del comando df (uso de disco)
 * - Parsear salida de /proc/net/dev (estadísticas de red)
 */

/**
 * Parsea la salida del comando 'df -P' para extraer información de uso de disco
 * @param {string} dfOutput - Salida del comando df
 * @returns {Array} Array de objetos con {fs, use, usedGb, totalGb} para cada filesystem
 */
function parseDfOutput(dfOutput) {
  const lines = dfOutput.trim().split('\n');
  lines.shift(); // Remove header line
  return lines.map(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 6) {
      const mount = parts[parts.length - 1];
      const use = parseInt(parts[parts.length - 2], 10);
      // Formato esperado df -P: ... <total> <used> <avail> <use%> <mount>
      // Tomamos desde el final para evitar problemas con columnas variables.
      const totalKb = parseInt(parts[parts.length - 5], 10);
      const usedKb = parseInt(parts[parts.length - 4], 10);

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
  }).filter(Boolean); // Filter out null entries
}

/**
 * Parsea la salida de /proc/net/dev para extraer estadísticas de red
 * @param {string} netDevOutput - Salida de /proc/net/dev
 * @returns {Object} Objeto con {totalRx, totalTx} para tráfico total de red
 */
function parseNetDev(netDevOutput) {
  const lines = netDevOutput.trim().split('\n');
  let totalRx = 0;
  let totalTx = 0;
  const interfaces = [];

  lines.slice(2).forEach(line => {
    const parts = line.trim().split(/\s+/);
    const iface = parts[0];
    if (iface && iface !== 'lo:' && parts.length >= 10) {
      const rx = parseInt(parts[1], 10);
      const tx = parseInt(parts[9], 10);
      const rxBytes = isNaN(rx) ? 0 : rx;
      const txBytes = isNaN(tx) ? 0 : tx;
      totalRx += rxBytes;
      totalTx += txBytes;
      interfaces.push({
        iface: iface.replace(/:$/, ''),
        rx_bytes: rxBytes,
        tx_bytes: txBytes
      });
    }
  });

  return { totalRx, totalTx, interfaces };
}

/**
 * Parsea la salida de 'ps aux' o 'ps' en una lista de objetos de proceso
 * Soporta Linux, macOS y BusyBox.
 * @param {string} output - Salida del comando ps
 * @returns {Array} Array de objetos de proceso
 */
function parseProcessList(output) {
  if (!output || typeof output !== 'string') return [];

  // Dividir líneas, pero NO aplicar trim() globalmente para mantener alineación de columnas si fuera necesario
  const lines = output.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  let headerIndex = -1;
  let idx = { pid: -1, user: -1, cpu: -1, mem: -1, vsz: -1, rss: -1, command: -1 };

  // 1. Buscar cabecera (usualmente en las primeras líneas)
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].toUpperCase();
    // Keywords críticos que definen una cabecera de ps
    if (line.includes('PID') && (line.includes('COMMAND') || line.includes('CMD') || line.includes('VSZ') || line.includes('STAT') || line.includes('TIME') || line.includes('VMSIZE'))) {
      headerIndex = i;
      const parts = lines[i].trim().split(/\s+/).map(p => p.toUpperCase());

      idx.pid = parts.indexOf('PID');
      idx.user = parts.findIndex(p => p === 'USER' || p === 'OWNER' || p === 'UID' || p === 'TTY' || p === 'UNAME');
      idx.cpu = parts.findIndex(p => p.includes('%CPU') || p === 'CPU');
      idx.mem = parts.findIndex(p => p.includes('%MEM') || p === 'MEM');
      idx.vsz = parts.findIndex(p => p === 'VSZ' || p === 'VMSIZE' || p === 'SZ');
      idx.rss = parts.indexOf('RSS');
      idx.command = parts.findIndex(p => p === 'COMMAND' || p === 'CMD' || p === 'ARGS' || p === 'PROC');

      // Si no encontró comando pero hay PID, el comando suele ser el último
      if (idx.command === -1 && idx.pid !== -1) {
        idx.command = parts.length - 1;
      }
      break;
    }
  }

  // 2. Si no hay cabecera clara, intentar detectar basándonos en la primera línea si parece numérica
  if (idx.pid === -1) {
    const firstParts = lines[0].trim().split(/\s+/);
    if (!isNaN(parseInt(firstParts[0], 10))) {
      headerIndex = -1; // No hay cabecera, empezar desde la línea 0
      idx.pid = 0;
      // Heurística BusyBox: [PID, USER, VSZ, STAT, COMMAND]
      if (firstParts.length >= 5) {
        idx.user = 1;
        idx.vsz = 2;
        idx.command = 4;
      } else {
        idx.command = firstParts.length - 1;
      }
    }
  }

  if (idx.pid === -1) return [];

  const results = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length <= idx.pid) continue;

    const pid = parseInt(parts[idx.pid], 10);
    if (isNaN(pid)) continue;

    // Extraer valores con fallbacks seguros
    const user = (idx.user >= 0 && parts[idx.user]) ? parts[idx.user] : 'root';
    const cpu = (idx.cpu >= 0 && parts[idx.cpu]) ? parseFloat(parts[idx.cpu].replace(',', '.')) || 0 : 0;
    const mem = (idx.mem >= 0 && parts[idx.mem]) ? parseFloat(parts[idx.mem].replace(',', '.')) || 0 : 0;
    const vsz = (idx.vsz >= 0 && parts[idx.vsz]) ? parseInt(parts[idx.vsz], 10) || 0 : 0;
    const rss = (idx.rss >= 0 && parts[idx.rss]) ? parseInt(parts[idx.rss], 10) || 0 : 0;

    // El comando puede contener espacios, así que tomamos todo desde idx.command hasta el final
    const cmdStart = idx.command >= 0 ? idx.command : (parts.length - 1);
    const command = parts.slice(cmdStart).join(' ');

    if (command) {
      results.push({ user, pid, cpu, mem, vsz, rss, command: command.substring(0, 250) });
    }
  }

  // Ordenar por CPU descendente si hay datos, si no por PID descendente
  if (idx.cpu >= 0 && results.some(r => r.cpu > 0.1)) {
    results.sort((a, b) => b.cpu - a.cpu);
  } else {
    results.sort((a, b) => b.pid - a.pid);
  }

  return results;
}

module.exports = {
  parseDfOutput,
  parseNetDev,
  parseProcessList
};
