/**
 * Ciclo de vida de Guacamole: clave secreta, arranque, parada y desconexión.
 * main.js solo llama a initialize() y stop().
 */
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;

function createGuacamoleLifecycle({
  getGuacdService,
  peekGuacdService,
  getGuacamoleLite,
  ensureGuacdClientPatched
}) {
  const { getNodeTermDataDir, loadPreferredGuacdMethod, loadGuacdInactivityTimeout } = require('../utils/file-utils');
  const debug = process.env.NODETERM_DEBUG_GUACAMOLE === '1';

  const state = {
    server: null,
    readyAt: 0,
    connections: new Set(),
    inactivityTimeoutMs: 7200000,
    initializing: false,
    initialized: false,
    initPromise: null
  };

  async function getOrCreateSecretKey() {
    const configDir = getNodeTermDataDir();
    try {
      await fs.mkdir(configDir, { recursive: true });
    } catch (e) { }

    const keyPath = path.join(configDir, 'guacamole-secret.key');

    try {
      const existingKey = await fs.readFile(keyPath);
      if (existingKey.length === 32) {
        console.log('🔐 [Guacamole] Clave secreta cargada desde archivo');
        return existingKey;
      }
      console.warn('⚠️ [Guacamole] Clave existente tiene tamaño incorrecto, generando nueva');
    } catch (error) {
      console.log('🔐 [Guacamole] Generando nueva clave secreta única...');
    }

    const newKey = crypto.randomBytes(32);
    try {
      await fs.writeFile(keyPath, newKey, { mode: 0o600 });
      console.log('✅ [Guacamole] Clave secreta única generada y guardada de forma segura');
    } catch (writeError) {
      console.error('❌ [Guacamole] Error guardando clave secreta:', writeError);
    }
    return newKey;
  }

  async function disconnectAll() {
    try {
      if (state.connections.size === 0 && !state.initialized) {
        return;
      }
      console.log(`🧹 Cerrando ${state.connections.size} conexiones Guacamole activas...`);
      for (const conn of Array.from(state.connections)) {
        try {
          if (typeof conn.close === 'function') {
            conn.close();
          } else if (conn.ws && typeof conn.ws.close === 'function') {
            conn.ws.close();
          }
        } catch (e) {
          // swallow per-connection errors
        } finally {
          state.connections.delete(conn);
        }
      }
    } catch (e) {
      console.warn('⚠️ Error cerrando conexiones Guacamole:', e?.message || e);
    }
  }

  async function initialize() {
    if (state.initPromise) {
      console.log('✅ Servicios Guacamole ya inicializándose, esperando...');
      return await state.initPromise;
    }

    if (state.initialized) {
      console.log('✅ Servicios Guacamole ya inicializados, omitiendo...');
      return;
    }

    const GuacamoleConfigService = require('./GuacamoleConfigService');

    state.initPromise = (async () => {
      try {
        state.initializing = true;
        ensureGuacdClientPatched();
        console.log('🚀 Inicializando servicios Guacamole...');

        try {
          const pref = await loadPreferredGuacdMethod();
          if (pref) {
            getGuacdService().setPreferredMethod(pref);
          }
        } catch { }

        const guacdReady = await getGuacdService().initialize();
        if (!guacdReady) {
          console.warn('⚠️ No se pudo inicializar guacd. RDP Guacamole no estará disponible.');
          state.initializing = false;
          return;
        }

        const guacdStatus = getGuacdService().getStatus();
        await GuacamoleConfigService.waitForGuacdReady(getGuacdService(), guacdStatus);

        let websocketPort = 8081;
        let serverCreated = false;
        const MAX_RETRIES = 20;
        const guacdOptions = getGuacdService().getGuacdOptions();
        const SECRET_KEY = await getOrCreateSecretKey();

        process.env.DISABLE_GUACD_WATCHDOG = '1';

        const clientOptions = {
          crypt: {
            cypher: 'AES-256-CBC',
            key: SECRET_KEY
          },
          log: {
            level: 'ERRORS'
          },
          maxInactivityTime: 0,
          connectionDefaultSettings: {
            rdp: {
              port: '3389',
              width: 1024,
              height: 768,
              dpi: 96,
              audio: [],
              video: null,
              image: ['image/webp', 'image/jpeg', 'image/png'],
              timezone: null
            },
            vnc: {
              port: '5900',
              width: 1024,
              height: 768,
              dpi: 96,
              audio: [],
              video: null,
              image: ['image/webp', 'image/jpeg', 'image/png'],
              timezone: null
            },
            ssh: {
              port: 22,
              width: 1024,
              height: 768,
              dpi: 96,
              audio: [],
              video: null,
              image: ['image/webp', 'image/jpeg', 'image/png'],
              timezone: null
            },
            telnet: {
              port: 23,
              width: 1024,
              height: 768,
              dpi: 96,
              audio: [],
              video: null,
              image: ['image/webp', 'image/jpeg', 'image/png'],
              timezone: null
            },
            join: {
              width: 1024,
              height: 768,
              dpi: 96,
              audio: [],
              video: null,
              image: ['image/webp', 'image/jpeg', 'image/png'],
              timezone: null
            }
          }
        };

        state.inactivityTimeoutMs = await GuacamoleConfigService.getConfiguredInactivityTimeout(
          loadGuacdInactivityTimeout,
          state.inactivityTimeoutMs
        );

        const GuacamoleLite = getGuacamoleLite();
        for (let i = 0; i < MAX_RETRIES; i++) {
          try {
            websocketPort = 8081 + i;
            const websocketOptions = { host: '127.0.0.1', port: websocketPort, perMessageDeflate: false };
            if (debug) console.log(`🔄 Intentando iniciar WebSocket en puerto ${websocketPort} (intento ${i + 1}/${MAX_RETRIES})`);

            state.server = new GuacamoleLite(websocketOptions, guacdOptions, clientOptions);

            await new Promise((resolve, reject) => {
              const errorHandler = (err) => {
                if (err.code === 'EADDRINUSE') reject(err);
              };
              if (state.server && state.server.webSocketServer) {
                state.server.webSocketServer.on('error', errorHandler);
              }
              setTimeout(() => {
                if (state.server && state.server.webSocketServer) {
                  state.server.webSocketServer.removeListener('error', errorHandler);
                }
                resolve();
              }, 100);
            });

            serverCreated = true;
            console.log(`✅ Servidor Guacamole-lite iniciado en puerto ${websocketPort}`);
            break;
          } catch (error) {
            if (error.code === 'EADDRINUSE') {
              console.log(`⚠️ Puerto ${websocketPort} ocupado, probando siguiente...`);
              state.server = null;
              continue;
            }
            console.error('❌ Error no relacionado con puerto:', error);
            throw error;
          }
        }

        if (!serverCreated) {
          throw new Error(`No se pudo encontrar un puerto libre entre 8081 y ${8081 + MAX_RETRIES}`);
        }

        const websocketOptions = { host: '127.0.0.1', port: websocketPort };
        if (debug) {
          console.log('🌐 [initializeGuacamoleServices] Servidor Guacamole-lite creado:', !!state.server);
          console.log('🌐 [initializeGuacamoleServices] Servidor tiene port:', state.server.port || 'no definido');
        }

        GuacamoleConfigService.setupGuacamoleServerEvents(
          state.server,
          state.connections,
          state.inactivityTimeoutMs
        );

        state.readyAt = Date.now();
        state.initialized = true;
        state.initializing = false;

        console.log('✅ Servicios Guacamole inicializados correctamente');
        console.log(`🌐 Servidor WebSocket: localhost:${websocketOptions.port}`);
        console.log(`🔧 GuacD: ${guacdOptions.host}:${guacdOptions.port}`);

        if (debug) {
          console.log('📊 [initializeGuacamoleServices] guacamoleServer asignado:', !!state.server);
        }
        return true;
      } catch (error) {
        console.error('❌ Error inicializando servicios Guacamole:', error);
        state.initializing = false;
        throw error;
      } finally {
        state.initPromise = null;
      }
    })();

    return await state.initPromise;
  }

  async function stop() {
    console.log('🛑 [main] Deteniendo servicios de Guacamole...');
    try {
      await disconnectAll();
    } catch (e) {
      console.warn('⚠️ Error desconectando sesiones de Guacamole:', e?.message || e);
    }

    if (state.server) {
      try {
        if (state.server.webSocketServer && typeof state.server.webSocketServer.close === 'function') {
          state.server.webSocketServer.close();
        }
      } catch (e) {
        console.warn('⚠️ Error cerrando websocket de Guacamole:', e?.message || e);
      }
      state.server = null;
    }

    try {
      if (typeof peekGuacdService === 'function' && peekGuacdService()) {
        await getGuacdService().stop();
      }
    } catch (e) {
      console.warn('⚠️ Error deteniendo guacdService:', e?.message || e);
    }

    state.initialized = false;
    state.initializing = false;
    state.initPromise = null;
    state.readyAt = 0;
    console.log('✅ Servicios de Guacamole detenidos.');
    return true;
  }

  return {
    getOrCreateSecretKey,
    initialize,
    stop,
    disconnectAll,
    getServer: () => state.server,
    getServerReadyAt: () => state.readyAt,
    getConnections: () => state.connections,
    getInactivityTimeoutMs: () => state.inactivityTimeoutMs,
    isInitializing: () => state.initializing,
    isInitialized: () => state.initialized,
    getWebSocketPort: () => (state.server ? state.server.port : null)
  };
}

module.exports = { createGuacamoleLifecycle };
