/**
 * Servicio de configuración para Guacamole
 * Gestiona watchdog, eventos y configuración del servidor
 */

const DEBUG_GUACAMOLE = process.env.NODETERM_DEBUG_GUACAMOLE === '1';

/**
 * Configurar eventos del servidor Guacamole
 * @param {Object} guacamoleServer - Servidor Guacamole-lite
 * @param {Set} activeGuacamoleConnections - Set de conexiones activas
 * @param {number} guacdInactivityTimeoutMs - Timeout de inactividad en ms
 */
function setupGuacamoleServerEvents(guacamoleServer, activeGuacamoleConnections, guacdInactivityTimeoutMs) {
  guacamoleServer.on('open', (clientConnection) => {
    try {
      // Nueva conexión Guacamole abierta
      activeGuacamoleConnections.add(clientConnection);

      // Parche en runtime del watchdog de guacd (backup del parche global)
      // Reemplaza el de 10s por uno configurable o lo desactiva completamente
      try {
        const guacdClient = clientConnection && clientConnection.guacdClient ? clientConnection.guacdClient : null;
        if (guacdClient) {
          // PASO 1: Desactivar SIEMPRE el watchdog original de 10s
          if (guacdClient.activityCheckInterval) {
            clearInterval(guacdClient.activityCheckInterval);
            guacdClient.activityCheckInterval = null;
            if (DEBUG_GUACAMOLE) {
              console.log('🔧 [Guacamole] Watchdog original de 10s desactivado');
            }
          }

          // PASO 2: Aplicar watchdog personalizado solo si está configurado (>0)
          if (guacdInactivityTimeoutMs > 0) {
            const timeoutMinutes = Math.round(guacdInactivityTimeoutMs / 60000);
            console.log(`🕐 [Guacamole] Watchdog de inactividad configurado: ${timeoutMinutes} minutos`);
            
            guacdClient.activityCheckInterval = setInterval(() => {
              try {
                const inactiveMs = Date.now() - guacdClient.lastActivity;
                if (inactiveMs > guacdInactivityTimeoutMs) {
                  const inactiveMinutes = Math.round(inactiveMs / 60000);
                  console.warn(`⏰ [Guacamole] Cerrando conexión por inactividad: ${inactiveMinutes} minutos sin actividad`);
                  guacdClient.close(new Error(`guacd inactivo por ${inactiveMinutes} minutos`));
                }
              } catch (e) {
                // Si ocurre un error al cerrar, evitar que detenga el loop
              }
            }, 30000); // Verificar cada 30 segundos en lugar de cada 1 segundo
          } else {
            console.log('🔓 [Guacamole] Watchdog de inactividad DESACTIVADO (timeout = 0)');
          }

          // PASO 3: Interceptar método send para actualizar lastActivity bidireccionalmente
          // (backup del parche global en caso de que no se aplicara)
          if (!guacdClient._sendPatched) {
            const originalSend = guacdClient.send.bind(guacdClient);
            guacdClient.send = function(data, afterOpened = false) {
              this.lastActivity = Date.now();
              return originalSend(data, afterOpened);
            };
            guacdClient._sendPatched = true;
            if (DEBUG_GUACAMOLE) {
              console.log('🔧 [Guacamole] Parche bidireccional de lastActivity aplicado');
            }
          }
        } else {
          console.warn('⚠️  No se encontró guacdClient para aplicar watchdog');
        }
      } catch (e) {
        console.warn('⚠️  Error aplicando watchdog de guacd:', e?.message || e);
      }
    } catch (e) {
      console.warn('No se pudo registrar conexión Guacamole:', e?.message || e);
    }
  });

  guacamoleServer.on('close', (clientConnection) => {
    try {
      console.log('🔚 Conexión Guacamole cerrada:', clientConnection.connectionId);
      activeGuacamoleConnections.delete(clientConnection);
    } catch (e) {
      // noop
    }
  });

  guacamoleServer.on('error', (clientConnection, error) => {
    console.error('❌ Error en conexión Guacamole:', error);
  });
}

/**
 * Esperar a que guacd esté accesible
 * @param {Object} guacdService - Servicio guacd
 * @param {Object} guacdStatus - Estado del servicio guacd
 * @param {number} maxWaitTime - Tiempo máximo de espera en ms
 * @returns {Promise<boolean>} - true si está listo, false si timeout
 */
async function waitForGuacdReady(guacdService, guacdStatus, maxWaitTime = 10000) {
  if (DEBUG_GUACAMOLE) {
    console.log('⏳ [GuacamoleConfig] Esperando a que guacd esté accesible...');
  }

  const checkInterval = 200; // Verificar cada 200ms
  const startTime = Date.now();
  let isReady = false;
  
  while (!isReady && (Date.now() - startTime) < maxWaitTime) {
    try {
      const isAvailable = await guacdService.isPortAvailable(guacdStatus.port);
      if (!isAvailable) {
        // Puerto ocupado = guacd está escuchando y accesible
        isReady = true;
        if (DEBUG_GUACAMOLE) {
          console.log(`✅ [GuacamoleConfig] guacd accesible en ${guacdStatus.host}:${guacdStatus.port}`);
        }
        break;
      }
    } catch (error) {
      // Continuar esperando
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  if (!isReady) {
    console.warn('⚠️ [GuacamoleConfig] guacd no está accesible después de esperar, continuando de todas formas...');
  }

  return isReady;
}

/**
 * Obtener timeout de inactividad configurado
 * @param {Function} loadGuacdInactivityTimeout - Función para cargar timeout persistido
 * @param {number} defaultTimeout - Timeout por defecto
 * @returns {Promise<number>} - Timeout en ms
 */
async function getConfiguredInactivityTimeout(loadGuacdInactivityTimeout, defaultTimeout = 7200000) {
  // Prioridad: 1) Variable de entorno, 2) Valor persistido, 3) Valor por defecto (120 min)
  const envTimeoutRaw = process.env.GUACD_INACTIVITY_TIMEOUT_MS;
  
  if (typeof envTimeoutRaw === 'string' && envTimeoutRaw.trim() !== '') {
    // Usar variable de entorno si está definida
    const parsed = parseInt(envTimeoutRaw, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      console.log(`🕐 [Guacamole] Timeout de inactividad desde env: ${Math.round(parsed / 60000)} minutos`);
      return parsed;
    }
  }
  
  // Cargar valor persistido (sincronizado con Umbral de actividad de sesión del frontend)
  try {
    const savedTimeout = await loadGuacdInactivityTimeout();
    if (savedTimeout !== null && savedTimeout >= 0) {
      console.log(`🕐 [Guacamole] Timeout de inactividad cargado: ${Math.round(savedTimeout / 60000)} minutos`);
      return savedTimeout;
    }
  } catch (e) {
    // Usar valor por defecto
  }
  
  console.log(`🕐 [Guacamole] Timeout de inactividad por defecto: ${Math.round(defaultTimeout / 60000)} minutos`);
  return defaultTimeout;
}

module.exports = {
  setupGuacamoleServerEvents,
  waitForGuacdReady,
  getConfiguredInactivityTimeout
};
