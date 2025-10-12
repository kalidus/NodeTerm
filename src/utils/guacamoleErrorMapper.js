// Mapea errores de Guacamole/WS a mensajes claros para el usuario
// Sin dependencias externas; seguro de importar en renderer

export function normalizeString(value) {
  try {
    if (value == null) return '';
    return String(value).trim();
  } catch (_) {
    return '';
  }
}

export function getStatusNameFromCode(code) {
  // Tabla parcial basada en Guacamole.Status
  const map = {
    0: 'SUCCESS',
    256: 'UNAUTHORIZED',
    512: 'SERVER_ERROR',
    513: 'UPSTREAM_TIMEOUT',
    514: 'UPSTREAM_ERROR',
    515: 'RESOURCE_NOT_FOUND',
    516: 'RESOURCE_CONFLICT',
    517: 'CLIENT_BAD_REQUEST',
    518: 'CLIENT_UNSUPPORTED',
    519: 'SESSION_CONFLICT',
    520: 'SESSION_TIMEOUT',
    521: 'UPSTREAM_NOT_FOUND',
    522: 'UPSTREAM_UNAVAILABLE',
    523: 'SESSION_CLOSED',
  };
  return map[code] || '';
}

export function mapGuacamoleError(input, context = {}) {
  const err = input || {};
  const message = normalizeString(err.message || err.msg || err.reason || err.code || err.statusText);
  const type = normalizeString(err.type || err.name);
  const code = typeof err.code === 'number' ? err.code : (typeof err.status === 'number' ? err.status : undefined);
  const phase = normalizeString(context.phase);
  const elapsedMs = Number.isFinite(context.elapsedMs) ? Number(context.elapsedMs) : undefined;

  // 1) Casos de WebSocket/network
  if (type.toLowerCase().includes('websocket') || message.toLowerCase().includes('websocket')) {
    if (message.toLowerCase().includes('close') || message.toLowerCase().includes('closed')) {
      return {
        kind: 'network',
        userMessage: 'Conexión de red cerrada. Verifica tu Internet y el servicio RDP.',
      };
    }
    if (message.toLowerCase().includes('failed') || message.toLowerCase().includes('refused')) {
      return {
        kind: 'network',
        userMessage: 'No se pudo abrir el canal WebSocket. ¿Guacamole está activo y accesible?',
      };
    }
    return {
      kind: 'network',
      userMessage: 'Problema en el canal WebSocket. Intenta reintentar la conexión.',
    };
  }

  // 2) Códigos Guacamole.Status conocidos
  if (typeof code === 'number') {
    const statusName = getStatusNameFromCode(code);
    switch (code) {
      case 256: // UNAUTHORIZED
        return { kind: 'auth', userMessage: 'Credenciales inválidas o no autorizadas.' };
      case 513: // UPSTREAM_TIMEOUT
        return { kind: 'timeout', userMessage: 'Timeout conectando al servidor RDP. Verifica host/puerto 3389.' };
      case 514: // UPSTREAM_ERROR
        return { kind: 'upstream', userMessage: 'Error del servidor remoto RDP. Reintenta o revisa el servicio.' };
      case 515: // RESOURCE_NOT_FOUND
      case 521: // UPSTREAM_NOT_FOUND
        return { kind: 'host', userMessage: 'Servidor/host RDP no encontrado. Verifica el nombre o IP.' };
      case 522: // UPSTREAM_UNAVAILABLE
        return { kind: 'upstream', userMessage: 'Servidor RDP no disponible. ¿Serv. apagado o firewall?' };
      case 520: // SESSION_TIMEOUT
        return { kind: 'timeout', userMessage: 'Sesión expirada por inactividad.' };
      case 523: // SESSION_CLOSED
        return { kind: 'closed', userMessage: 'Sesión RDP cerrada.' };
      case 519: { // SESSION_CONFLICT
        // Si ocurre muy pronto durante la fase de conexión, en algunos entornos indica upstream inalcanzable
        if (phase === 'connecting' && (elapsedMs === undefined || elapsedMs < 7000)) {
          return { kind: 'timeout', userMessage: 'Timeout conectando al servidor RDP. Verifica host/puerto 3389.' };
        }
        return { kind: 'conflict', userMessage: 'Conflicto de sesión. Cierra otras sesiones o espera unos segundos y reintenta.' };
      }
      case 512: // SERVER_ERROR
        return { kind: 'server', userMessage: 'Error interno del servidor Guacamole.' };
      default:
        if (statusName) {
          return { kind: 'status', userMessage: `Error de conexión (${statusName}).` };
        }
        break;
    }
  }
  // 3b) Mensajes explícitos de conflicto de sesión
  if (m.includes('session_conflict') || m.includes('session conflict')) {
    if (phase === 'connecting' && (elapsedMs === undefined || elapsedMs < 7000)) {
      return { kind: 'timeout', userMessage: 'Timeout conectando al servidor RDP. Verifica host/puerto 3389.' };
    }
    return { kind: 'conflict', userMessage: 'Conflicto de sesión. Cierra otras sesiones o espera y reintenta.' };
  }


  // 3) Heurísticas por texto común
  const m = message.toLowerCase();
  if (m.includes('auth') || m.includes('credencial') || m.includes('unauthor')) {
    return { kind: 'auth', userMessage: 'Falla de autenticación. Verifica usuario/contraseña/dominio.' };
  }
  if (m.includes('timeout') || m.includes('timed out')) {
    return { kind: 'timeout', userMessage: 'Timeout de conexión. ¿El puerto 3389 está abierto?' };
  }
  if (m.includes('not found') || m.includes('dns') || m.includes('hostname')) {
    return { kind: 'host', userMessage: 'No se pudo resolver el host. Verifica DNS o IP.' };
  }
  if (m.includes('refused') || m.includes('unreachable') || m.includes('network')) {
    return { kind: 'network', userMessage: 'Conexión rechazada o red inalcanzable. Revisa firewall/red.' };
  }

  // 4) Fallback genérico
  return {
    kind: 'unknown',
    userMessage: message ? `Error de conexión: ${message}` : 'Error de conexión desconocido.',
  };
}

export function mapTimeoutError(hostname) {
  const host = normalizeString(hostname);
  if (host) {
    return `Timeout: El servidor RDP no responde (${host} inaccesible o puerto 3389 bloqueado).`;
  }
  return 'Timeout: El servidor RDP no responde.';
}

const GuacamoleErrorMapper = { mapGuacamoleError, mapTimeoutError };
export default GuacamoleErrorMapper;


