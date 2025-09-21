/**
 * Utilidades de parsing para comandos del sistema
 */

/**
 * Parsea la salida del comando 'ls -la'
 * @param {string} output - Salida del comando ls -la
 * @returns {Array} Array de objetos con información de archivos/directorios
 */
function parseLsOutput(output) {
  const lines = output.split('\n').filter(line => line.trim() !== '' && !line.startsWith('total'));
  return lines.map(line => {
    // Ejemplo: -rw-r--r-- 1 user group 4096 Jan 1 12:00 filename
    const parts = line.split(/\s+/);
    if (parts.length < 9) return null;
    const [permissions, , owner, group, size, month, day, timeOrYear, ...nameParts] = parts;
    const name = nameParts.join(' ');
    return {
      name,
      permissions,
      owner,
      group,
      size: parseInt(size, 10) || 0,
      modified: `${month} ${day} ${timeOrYear}`,
      type: permissions[0] === 'd' ? 'directory' : 'file',
    };
  }).filter(Boolean);
}

/**
 * Parsea la salida del comando 'df -P'
 * @param {string} dfOutput - Salida del comando df -P
 * @returns {Array} Array de objetos con información de sistemas de archivos
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
 * Parsea la salida del comando de red para obtener estadísticas
 * @param {string} netDevOutput - Salida del comando de estadísticas de red
 * @returns {Object} Objeto con totalRx y totalTx
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
  parseLsOutput,
  parseDfOutput,
  parseNetDev
};
