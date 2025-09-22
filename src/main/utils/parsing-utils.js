/**
 * Utilidades para parsing de datos del sistema
 * - Parsear salida del comando df (uso de disco)
 * - Parsear salida de /proc/net/dev (estadísticas de red)
 */

/**
 * Parsea la salida del comando 'df -P' para extraer información de uso de disco
 * @param {string} dfOutput - Salida del comando df
 * @returns {Array} Array de objetos con {fs, use} para cada filesystem
 */
function parseDfOutput(dfOutput) {
  const lines = dfOutput.trim().split('\n');
  lines.shift(); // Remove header line
  return lines.map(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 6) {
      const use = parseInt(parts[parts.length - 2], 10);
      const name = parts[parts.length - 1];
      // Filter out unwanted mount points
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

  lines.slice(2).forEach(line => {
    const parts = line.trim().split(/\s+/);
    const iface = parts[0];
    if (iface && iface !== 'lo:' && parts.length >= 10) {
      const rx = parseInt(parts[1], 10);
      const tx = parseInt(parts[9], 10);
      if (!isNaN(rx)) totalRx += rx;
      if (!isNaN(tx)) totalTx += tx;
    }
  });

  return { totalRx, totalTx };
}

module.exports = {
  parseDfOutput,
  parseNetDev
};
