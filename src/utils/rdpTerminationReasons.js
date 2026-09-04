/**
 * rdpTerminationReasons.js
 * Clasificación y mapeo comprensible para el usuario de códigos y motivos de desconexión RDP
 * (IronRDP WebAssembly, RdpNativeBridgeService y errores de red).
 */

function mapTerminationReason(rawReason, backendReason, wasEverConnected = false, error = null) {
  const errStr = error ? (error.message || String(error)) : '';
  const combined = `${rawReason || ''} ${backendReason || ''} ${errStr}`.toLowerCase();

  // 1. Inactividad / Idle Timeout (Servidor RDP o red)
  if (
    combined.includes('idle timeout') ||
    combined.includes('idletimeout') ||
    combined.includes('errinfo_idle_timeout') ||
    combined.includes('inactividad') ||
    combined.includes('by server (idle timeout)')
  ) {
    return {
      category: 'INACTIVITY_TIMEOUT',
      title: 'Conexión cortada por inactividad',
      description: 'El servidor remoto o la red ha cerrado la sesión debido a que se ha superado el tiempo límite de inactividad permitido.',
      suggestion: 'Para reanudar tu trabajo, pulsa en "Reconectar".',
      severity: 'warn',
      icon: 'pi pi-hourglass',
      badge: 'Inactividad / Timeout'
    };
  }

  // 2. Logon Timeout (Tiempo de espera en pantalla de inicio de sesión)
  if (
    combined.includes('logon timeout') ||
    combined.includes('logontimeout') ||
    combined.includes('errinfo_logon_timeout')
  ) {
    return {
      category: 'LOGON_TIMEOUT',
      title: 'Tiempo de inicio de sesión agotado',
      description: 'Se superó el tiempo máximo permitido para completar la autenticación en el servidor remoto.',
      suggestion: 'Verifica tus credenciales y vuelve a intentarlo.',
      severity: 'warn',
      icon: 'pi pi-clock',
      badge: 'Timeout'
    };
  }

  // 3. Desplazado por otra conexión (mismo usuario / otra máquina)
  if (
    combined.includes('disconnected by other connection') ||
    combined.includes('disconnectedbyotherconnection') ||
    combined.includes('errinfo_disconnected_by_otherconnection') ||
    combined.includes('another user') ||
    combined.includes('otra conexión') ||
    combined.includes('otra sesion') ||
    combined.includes('otra sesión')
  ) {
    return {
      category: 'DISPLACED_SESSION',
      title: 'Sesión desplazada por otra conexión',
      description: 'La sesión remota se ha cerrado porque otro usuario o equipo ha iniciado sesión con estas mismas credenciales.',
      suggestion: 'Si deseas recuperar el control de la sesión en este equipo, pulsa en "Reconectar".',
      severity: 'info',
      icon: 'pi pi-users',
      badge: 'Sesión desplazada'
    };
  }

  // 4. Cierre ordenado por el usuario (Logoff de Windows / usuario final)
  if (
    combined.includes('user initiated') ||
    combined.includes('userinitiated') ||
    combined.includes('logoff') ||
    combined.includes('errinfo_server_status_logoff') ||
    combined.includes('rpc_initiated_disconnect') ||
    (combined.includes('cerrado por el usuario') && !combined.includes('econnreset'))
  ) {
    return {
      category: 'USER_LOGOFF',
      title: 'Sesión finalizada',
      description: 'La sesión RDP se ha cerrado correctamente desde el sistema remoto o por solicitud del usuario.',
      suggestion: 'Puedes reconectarte o cerrar esta pestaña.',
      severity: 'info',
      icon: 'pi pi-check-circle',
      badge: 'Finalizada'
    };
  }

  // 5. Reinicio o apagado del servidor remoto
  if (
    combined.includes('shutdown') ||
    combined.includes('reboot') ||
    combined.includes('reiniciado') ||
    combined.includes('errinfo_server_status_disconnected')
  ) {
    return {
      category: 'SERVER_SHUTDOWN',
      title: 'Servidor remoto desconectado o reiniciado',
      description: 'El servidor remoto ha detenido el servicio de Escritorio Remoto o se encuentra en proceso de reinicio.',
      suggestion: 'Espera unos momentos a que el host vuelva a estar disponible y pulsa "Reconectar".',
      severity: 'warn',
      icon: 'pi pi-server',
      badge: 'Servidor reiniciado'
    };
  }

  // 6. Credenciales / Acceso denegado
  if (
    combined.includes('contraseña o usuario incorrecto') ||
    combined.includes('logon failure') ||
    combined.includes('errinfo_logon_failed') ||
    combined.includes('acceso denegado') ||
    combined.includes('serverdeniedconnection')
  ) {
    return {
      category: 'AUTH_FAILED',
      title: 'Fallo de autenticación o acceso denegado',
      description: 'El servidor remoto rechazó las credenciales o el usuario no tiene permisos de Escritorio Remoto.',
      suggestion: 'Revisa el usuario, contraseña o dominio configurados para esta conexión.',
      severity: 'danger',
      icon: 'pi pi-lock',
      badge: 'Autenticación'
    };
  }

  // 7. Desconexión de red / Socket Reset / Timeout durante sesión activa
  if (
    wasEverConnected && (
      combined.includes('econnreset') ||
      combined.includes('epipe') ||
      combined.includes('etimedout') ||
      combined.includes('connection reset') ||
      combined.includes('cerrado por el servidor') ||
      combined.includes('conexión cortada') ||
      combined.includes('proxy websocket') ||
      combined.includes('not enough bytes') ||
      combined.includes('read frame by hint') ||
      combined.includes('connection closed') ||
      combined.includes('premature close') ||
      combined.includes('fin')
    )
  ) {
    return {
      category: 'CONNECTION_LOST',
      title: 'Conexión cortada por el servidor remoto o la red',
      description: 'La sesión RDP se ha interrumpido inesperadamente. Esto suele deberse a un timeout de inactividad en el servidor o cortafuegos, o a una pérdida momentánea de conectividad.',
      suggestion: 'Comprueba tu conexión de red o VPN y pulsa "Reconectar" para restablecer el escritorio.',
      severity: 'warn',
      icon: 'pi pi-wifi',
      badge: 'Corte de conexión'
    };
  }

  // 8. Error de inicio o conexión nunca establecida
  if (!wasEverConnected) {
    return {
      category: 'CONNECT_ERROR',
      title: 'Error al establecer sesión RDP',
      description: backendReason || (error ? (error.message || String(error)) : rawReason) || 'No se pudo establecer la conexión RDP con el servidor.',
      suggestion: 'Verifica la dirección IP, puerto y estado del servidor de destino.',
      severity: 'danger',
      icon: 'pi pi-exclamation-triangle',
      badge: 'Error de conexión'
    };
  }

  // 9. Desconexión genérica en sesión que estuvo activa
  return {
    category: 'DISCONNECTED',
    title: 'Sesión RDP Finalizada',
    description: backendReason || rawReason || 'La conexión con el equipo remoto se ha cerrado.',
    suggestion: 'Puedes reconectarte en cualquier momento o cerrar la pestaña.',
    severity: 'info',
    icon: 'pi pi-desktop',
    badge: 'Desconectado'
  };
}

module.exports = {
  mapTerminationReason
};
