const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ruta al ejecutable FreeRDP y carpeta de DLLs
const FREERDP_DIR = path.join(__dirname, '../resources/freerdp');
const FREERDP_EXE = path.join(FREERDP_DIR, 'wfreerdp.exe');

// Almacén de procesos RDP activos
const activeRdpSessions = new Map();

/**
 * Verifica que el ejecutable FreeRDP esté disponible
 */
function checkFreeRDPAvailable() {
  if (!fs.existsSync(FREERDP_EXE)) {
    throw new Error(`FreeRDP no encontrado en: ${FREERDP_EXE}`);
  }
  return true;
}

/**
 * Inicia una nueva sesión RDP
 * @param {Object} config - Configuración de la sesión RDP
 * @param {string} config.host - Host/IP del servidor RDP
 * @param {string} config.user - Usuario
 * @param {string} config.password - Contraseña
 * @param {number} config.port - Puerto (por defecto 3389)
 * @param {number} config.width - Ancho de pantalla (por defecto 1280)
 * @param {number} config.height - Alto de pantalla (por defecto 800)
 * @param {string} config.sessionId - ID único de la sesión
 */
function startRdpSession(config) {
  checkFreeRDPAvailable();

  const {
    host,
    user,
    password,
    port = 3389,
    width = 1280,
    height = 800,
    sessionId = `rdp_${Date.now()}`
  } = config;

  // Verificar si ya existe una sesión con este ID
  if (activeRdpSessions.has(sessionId)) {
    throw new Error(`La sesión ${sessionId} ya está activa`);
  }

  // Construir argumentos para wfreerdp.exe
  const args = [
    `/v:${host}:${port}`,
    `/u:${user}`,
    `/p:${password}`,
    `/size:${width}x${height}`,
    `/cert:ignore`,
    `/compression`,
    `/clipboard`,
    '/audio-mode:0', // Desactivar audio por defecto
    '/gdi:hw', // Usar aceleración hardware si está disponible
    '+auto-reconnect', // Reconexión automática
    '/auto-reconnect-max-retries:3'
  ];

  console.log(`🚀 Iniciando sesión RDP: ${sessionId} -> ${user}@${host}:${port}`);

  // Spawning del proceso FreeRDP
  const rdpProcess = spawn(FREERDP_EXE, args, {
    cwd: FREERDP_DIR, // Importante: working directory donde están las DLLs
    stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
    windowsHide: false, // Mostrar la ventana RDP
    detached: false // No detached para poder manejar el proceso
  });

  // Configurar handlers del proceso
  rdpProcess.on('spawn', () => {
    console.log(`✅ Sesión RDP ${sessionId} iniciada (PID: ${rdpProcess.pid})`);
  });

  rdpProcess.on('close', (code, signal) => {
    console.log(`🔚 Sesión RDP ${sessionId} terminada - Code: ${code}, Signal: ${signal}`);
    activeRdpSessions.delete(sessionId);
    
    // Callback opcional para notificar al UI
    if (config.onClose) {
      config.onClose(sessionId, code, signal);
    }
  });

  rdpProcess.on('error', (error) => {
    console.error(`❌ Error en sesión RDP ${sessionId}:`, error);
    activeRdpSessions.delete(sessionId);
    
    // Callback opcional para notificar errores al UI
    if (config.onError) {
      config.onError(sessionId, error);
    }
  });

  // Capturar stdout/stderr para logs (opcional)
  rdpProcess.stdout.on('data', (data) => {
    console.log(`[${sessionId}] STDOUT:`, data.toString());
  });

  rdpProcess.stderr.on('data', (data) => {
    console.error(`[${sessionId}] STDERR:`, data.toString());
  });

  // Almacenar la sesión activa
  activeRdpSessions.set(sessionId, {
    process: rdpProcess,
    config: { ...config, sessionId },
    startTime: new Date(),
    pid: rdpProcess.pid
  });

  return {
    sessionId,
    pid: rdpProcess.pid,
    config: { host, user, port, width, height }
  };
}

/**
 * Detiene una sesión RDP específica
 * @param {string} sessionId - ID de la sesión a detener
 */
function stopRdpSession(sessionId) {
  const session = activeRdpSessions.get(sessionId);
  
  if (!session) {
    throw new Error(`Sesión ${sessionId} no encontrada`);
  }

  console.log(`🛑 Deteniendo sesión RDP: ${sessionId}`);
  
  try {
    // Intentar cerrar graciosamente
    session.process.kill('SIGTERM');
    
    // Si no se cierra en 3 segundos, forzar cierre
    setTimeout(() => {
      if (!session.process.killed) {
        console.log(`⚡ Forzando cierre de sesión ${sessionId}`);
        session.process.kill('SIGKILL');
      }
    }, 3000);
    
  } catch (error) {
    console.error(`Error al detener sesión ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Detiene todas las sesiones RDP activas
 */
function stopAllRdpSessions() {
  console.log(`🛑 Deteniendo todas las sesiones RDP (${activeRdpSessions.size})`);
  
  for (const sessionId of activeRdpSessions.keys()) {
    try {
      stopRdpSession(sessionId);
    } catch (error) {
      console.error(`Error al detener sesión ${sessionId}:`, error);
    }
  }
}

/**
 * Obtiene información de las sesiones activas
 */
function getActiveSessions() {
  const sessions = [];
  
  for (const [sessionId, session] of activeRdpSessions.entries()) {
    sessions.push({
      sessionId,
      pid: session.pid,
      startTime: session.startTime,
      config: session.config,
      uptime: Date.now() - session.startTime.getTime()
    });
  }
  
  return sessions;
}

/**
 * Verifica si una sesión específica está activa
 */
function isSessionActive(sessionId) {
  return activeRdpSessions.has(sessionId);
}

module.exports = {
  startRdpSession,
  stopRdpSession,
  stopAllRdpSessions,
  getActiveSessions,
  isSessionActive,
  checkFreeRDPAvailable
}; 