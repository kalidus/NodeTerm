/**
 * Helper para captura y gestión limpia de mensajes de bienvenida (MOTD) en SSH
 * Permite preservar el MOTD en conexiones multiplexadas (Ubuntu/Debian/Linux)
 * sin interferir ni descartar paquetes en routers (Asuswrt-Merlin, Cisco, etc.)
 */

// Expresión regular para detectar el inicio de información de sesión / último login
const LOGIN_INDICATORS = /(?:\r?\n|^)(?:Last login:|Last failed login:|Último inicio de sesión:|Ultimo inicio de sesion:)/i;

/**
 * Extrae el banner MOTD del buffer inicial de una conexión SSH directa.
 * Si encuentra un indicador de login (como "Last login:"), extrae todo el contenido
 * previo como el MOTD legítimo del sistema.
 * 
 * @param {string} buffer - Acumulador de datos iniciales del stream
 * @returns {{ matched: boolean, motd: string | null }}
 */
function extractMotdBanner(buffer) {
  if (!buffer || typeof buffer !== 'string') {
    return { matched: false, motd: null };
  }

  const match = buffer.match(LOGIN_INDICATORS);
  if (!match) {
    return { matched: false, motd: null };
  }

  const rawMotd = buffer.substring(0, match.index).trimEnd();
  if (rawMotd.length === 0) {
    return { matched: true, motd: null };
  }

  // Normalizar saltos de línea a CRLF para renderizado correcto en xterm.js
  const formattedMotd = rawMotd.replace(/\r?\n/g, '\r\n') + '\r\n\r\n';
  return { matched: true, motd: formattedMotd };
}

module.exports = {
  LOGIN_INDICATORS,
  extractMotdBanner
};
