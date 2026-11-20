'use strict';

// =============================================================================
// ssh-connect-session.js
//
// Registra los handlers IPC de conexión SSH activa:
//   • ssh:check-connection
//   • ssh:connect  (bloque grande: bastión Wallix + SSH directo + ProxyJump)
//   • ssh:data     (escritura al shell, keyboard-interactive, manual password)
//   • ssh:resize
//   • ssh:disconnect
//
// Uso:
//   const { registerSshConnectSession } = require('./ssh-connect-session');
//   registerSshConnectSession({ sshConnections, sshConnectionPool, ... });
// =============================================================================

const path = require('path');
const fs   = require('fs');
const { ipcMain }      = require('electron');
const { StringDecoder } = require('string_decoder');

// ── Servicios SSH (singletons, se pueden requerir directamente) ───────────────
const sshAuthService     = require('./SSHAuthService');
const sshCleanupService  = require('./SSHConnectionCleanupService');
const sshWriteBufferService = require('./SSHWriteBufferService');
const sshStatsService    = require('./SSHStatsService');
const sshKnownHostsService = require('./SSHKnownHostsService');
const { connectViaProxyJump } = require('./SSHProxyJumpService');
const { terminalStdoutRingBuffer } = require('./TerminalStdoutRingBuffer');
const { terminalIpcBatcher }       = require('./TerminalIpcBatcher');

// ── Utilidades SSH ─────────────────────────────────────────────────────────────
const {
  buildSshConnectOptions,
  buildShellOptions,
  isProxyJumpEnabled,
  requiresDedicatedSshSession,
  applyHostKeyPolicy,
  isHandshakeOrKexError,
} = require('../../utils/sshConnectOptions');

const { extractMotdBanner }      = require('../utils/ssh-motd');
const { getRecordingsDirectory } = require('../utils/recording-utils');
const { getNodeTermDataDir }     = require('../utils/file-utils');
const { createBastionShell }     = require('../../components/bastion-ssh');

// =============================================================================
/**
 * Registra los handlers IPC de conexión SSH.
 *
 * @param {Object} deps  Dependencias inyectadas desde main.js
 * @param {Object}  deps.sshConnections        Mapa tabId → estado de conexión SSH
 * @param {Object}  deps.sshConnectionPool     Pool de conexiones SSH compartidas
 * @param {Object}  deps.motdCache             Caché de MOTD por cacheKey
 * @param {Object}  deps.bastionStatsState     Estado de stats por tabId para bastiones
 * @param {Function} deps.sendToRenderer       Helper para enviar IPC al renderer
 * @param {Object}  deps.connectionThrottle    Control de throttling de conexiones
 * @param {Function} deps.getBastionForwardingWarning  Aviso de forwarding en bastión
 * @param {Function} deps.appendForwardingFlagsToCacheKey  Genera cacheKey con flags
 * @param {Function} deps.getSessionRecorder  Getter lazy del SessionRecorder
 * @param {Function} deps.getSSH2Promise      Getter lazy de ssh2-promise
 * @param {Function} deps.getSSH2Client       Getter lazy de ssh2.Client
 * @param {Function} deps.statsLoop           Inicia el bucle de stats SSH directo
 */
function registerSshConnectSession(deps) {
  const {
    sshConnections,
    sshConnectionPool,
    motdCache,
    bastionStatsState,
    sendToRenderer,
    connectionThrottle,
    getBastionForwardingWarning,
    appendForwardingFlagsToCacheKey,
    getSessionRecorder,
    getSSH2Promise,
    getSSH2Client,
    statsLoop,
  } = deps;

  // ── ssh:check-connection ───────────────────────────────────────────────────
  // IPC handler to check if an SSH connection already exists
  ipcMain.handle('ssh:check-connection', async (event, tabId) => {
    // Verificar si existe una conexión SSH activa para este tabId
    return sshConnections[tabId] !== undefined &&
      sshConnections[tabId].stream !== undefined &&
      !sshConnections[tabId].stream.destroyed;
  });

  // ── ssh:connect ────────────────────────────────────────────────────────────
  // IPC handler to establish an SSH connection
  ipcMain.on('ssh:connect', async (event, { tabId, config }) => {
    try {
      const { setOutputTarget } = require('./TabOutputTarget');
      setOutputTarget(tabId, event.sender);
    } catch (_) { /* sin mapa de destino */ }
    const existing = sshConnections[tabId];
    if (existing && existing.stream && !existing.stream.destroyed) {
      sendToRenderer(event.sender, `ssh:ready:${tabId}`);
      return;
    }

    // Mostrar mensaje de conexión al inicio
    const hostName = config.name || config.label || config.host;
    sendToRenderer(event.sender, `ssh:data:${tabId}`, `Connecting to ${hostName}...\r\n`);

    const bastionForwardingWarning = getBastionForwardingWarning(config);
    if (bastionForwardingWarning) {
      sendToRenderer(event.sender, `ssh:data:${tabId}`, `[WARN] ${bastionForwardingWarning}\r\n`);
    }

    // Para bastiones: usar cacheKey único por destino (permite reutilización)
    // Para SSH directo: usar pooling normal para eficiencia
    const baseCacheKey = config.useBastionWallix
      ? `bastion-${config.bastionUser}@${config.bastionHost}->${config.username}@${config.host}:${config.port || 22}`
      : `${config.username}@${config.host}:${config.port || 22}`;
    const cacheKey = appendForwardingFlagsToCacheKey(baseCacheKey, config);

    // Aplicar throttling solo para SSH directo (bastiones son únicos)
    if (!config.useBastionWallix) {
      const lastAttempt = connectionThrottle.lastAttempt.get(cacheKey) || 0;
      const now = Date.now();
      const timeSinceLastAttempt = now - lastAttempt;

      if (timeSinceLastAttempt < connectionThrottle.minInterval) {
        const waitTime = connectionThrottle.minInterval - timeSinceLastAttempt;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      connectionThrottle.lastAttempt.set(cacheKey, Date.now());
    }

    // Para bastiones: cada terminal tiene su propia conexión independiente (no pooling)
    // Para SSH directo: usar pooling normal para eficiencia
    let ssh;
    let isReusedConnection = false;

    if (config.useBastionWallix) {
      // BASTIÓN: Usar ssh2 puro para crear una conexión y shell independientes
      const bastionConfig = {
        bastionHost: config.bastionHost,
        port: config.port || 22,
        bastionUser: config.bastionUser,
        useBastionWallix: true,
        legacyCompatibility: !!config.legacyCompatibility
      };

      // Si hay password, usarlo. Si no, permitir autenticación interactiva
      if (config.password && config.password.trim()) {
        bastionConfig.password = config.password;
      }
      let shellStream;
      const { conn } = createBastionShell(
        bastionConfig,
        (data) => {
          // Bastión suele llegar como string (setEncoding); batcher decodifica si es Buffer.
          if (getSessionRecorder().isRecording(tabId)) {
            const dataStr = typeof data === 'string' ? data : data.toString('utf-8');
            getSessionRecorder().recordOutput(tabId, dataStr);
          }
          terminalIpcBatcher.send(event.sender, `ssh:data:${tabId}`, data);
        },
        // ✅ REFACTORIZADO: Handler de cierre usando SSHConnectionCleanupService
        sshCleanupService.createCloseHandler(
          tabId,
          { originalKey: config.originalKey || tabId },
          sshConnections,
          bastionStatsState,
          event.sender
        ),
        (err) => {
          // ✅ REFACTORIZADO: Manejo de errores de autenticación con SSHAuthService
          const conn = sshConnections[tabId];
          sshAuthService.handleAuthError(conn, event.sender, tabId, err);
        },
        (stream) => {
          if (sshConnections[tabId]) {
            sshConnections[tabId].stream = stream;

            // ✅ FIX: Desactivar modo de password manual cuando el stream está listo
            sshAuthService.disableManualPasswordMode(sshConnections[tabId]);

            // Si hay un resize pendiente, aplicarlo ahora
            const pending = sshConnections[tabId]._pendingResize;
            if (pending && stream && !stream.destroyed && typeof stream.setWindow === 'function') {
              const safeRows = Math.max(1, Math.min(300, pending.rows || 24));
              const safeCols = Math.max(1, Math.min(500, pending.cols || 80));
              stream.setWindow(safeRows, safeCols);
              sshConnections[tabId]._pendingResize = null;
            }
            // Lanzar bucle de stats SOLO cuando el stream está listo
            // Solo iniciar stats si esta pestaña está activa
            if (sshStatsService.getActiveStatsTab() === tabId) {
              wallixStatsLoop();
            }
          }
        }
      );
      // Guardar la conexión para gestión posterior (stream se asigna en onShellReady)
      sshConnections[tabId] = {
        ssh: conn,
        stream: undefined,
        config,
        cacheKey,
        originalKey: config.originalKey || tabId,
        previousCpu: null,
        statsTimeout: null,
        previousNet: null,
        previousTime: null,
        statsLoopRunning: false
      };

      // ✅ REFACTORIZADO: Inicializar estado de autenticación con SSHAuthService
      sshAuthService.initializeAuthState(sshConnections[tabId], config.password && config.password.trim());

      // Si no hay password, mostrar prompt inmediatamente
      if (!(config.password && config.password.trim())) {
        sshAuthService.enableManualPasswordMode(sshConnections[tabId], event.sender, tabId, 'Por favor, introduce el password');
      }

      // ✅ REFACTORIZADO: Función de bucle de stats para Wallix/bastión ahora usa SSHStatsService
      const wallixStatsLoop = sshStatsService.createBastionStatsLoop(tabId, config, bastionStatsState, sshConnections, event.sender);

      // Asignar la función wallixStatsLoop al objeto de conexión
      sshConnections[tabId].wallixStatsLoop = wallixStatsLoop;

      sendToRenderer(event.sender, `ssh:ready:${tabId}`);
      sendToRenderer(event.sender, 'ssh-connection-ready', {
        originalKey: config.originalKey || tabId,
        tabId: tabId
      });
      return;
    } else {
      // SSH DIRECTO: pooling normal salvo cuando hay forwarding o ProxyJump activos
      const connectHelpers = {
        notify: (message) => sendToRenderer(event.sender, `ssh:data:${tabId}`, message),
        connectOptionsContext: {
          knownHostsService: sshKnownHostsService,
          notify: (message) => sendToRenderer(event.sender, `ssh:data:${tabId}`, message)
        },
        applyHostKey: (connectConfig, host, port, sessionConfig) => applyHostKeyPolicy(
          connectConfig,
          host,
          port,
          sessionConfig,
          {
            knownHostsService: sshKnownHostsService,
            notify: (message) => sendToRenderer(event.sender, `ssh:data:${tabId}`, message)
          }
        )
      };
      const directConnect = buildSshConnectOptions(config, connectHelpers.connectOptionsContext);

      const beginDedicatedSshSession = (ssh2Client, jumpClient = null) => {
        sshConnections[tabId] = {
          ssh: ssh2Client,
          jumpClient,
          stream: null,
          config,
          cacheKey,
          originalKey: config.originalKey || tabId,
          previousCpu: null,
          statsTimeout: null,
          previousNet: null,
          previousTime: null
        };

        sshAuthService.initializeAuthState(
          sshConnections[tabId],
          !!(config.password && config.password.trim())
        );

        sshAuthService.setupSSH2ClientListeners(
          ssh2Client,
          sshConnections[tabId],
          tabId,
          config,
          event.sender,
          {
            onReady: (realHostname, finalDistroId) => {
              setTimeout(() => {
                if (sshConnections[tabId] && sshConnections[tabId].ssh) {
                  statsLoop(tabId, realHostname, finalDistroId, config.host);
                }
              }, 1000);
            },
            onError: null,
            getSessionRecorder: () => getSessionRecorder()
          }
        );

        if (!(config.password && config.password.trim())) {
          sshAuthService.enableManualPasswordMode(
            sshConnections[tabId],
            event.sender,
            tabId,
            'Por favor, introduce el password'
          );
        }
      };

      if (isProxyJumpEnabled(config)) {
        sendToRenderer(
          event.sender,
          `ssh:data:${tabId}`,
          `Connecting via jump ${config.jumpUser}@${config.jumpHost}:${config.jumpPort || 22}...\r\n`
        );

        try {
          const { jumpClient, targetClient } = await connectViaProxyJump({
            config,
            Client: getSSH2Client(),
            buildSshConnectOptions: (sessionConfig) => buildSshConnectOptions(
              sessionConfig,
              connectHelpers.connectOptionsContext
            ),
            applyHostKeyPolicy: connectHelpers.applyHostKey
          });

          beginDedicatedSshSession(targetClient, jumpClient);
          return;
        } catch (jumpError) {
          const jumpMessage = jumpError?.message || jumpError || 'Error desconocido en ProxyJump';
          sendToRenderer(event.sender, `ssh:error:${tabId}`, jumpMessage);
          sendToRenderer(event.sender, 'ssh-connection-error', {
            originalKey: config.originalKey || tabId,
            tabId,
            error: jumpMessage
          });
          return;
        }
      }

      if (requiresDedicatedSshSession(config)) {
        if (directConnect.agentForwardingRequestedButUnavailable) {
          sendToRenderer(
            event.sender,
            `ssh:data:${tabId}`,
            '[WARN] Agent Forwarding activo pero no se encontro un agente SSH local.\r\n'
          );
        }

        const ssh2Client = new (getSSH2Client())();
        beginDedicatedSshSession(ssh2Client);
        ssh2Client.connect(directConnect.connectConfig);
        return;
      }

      const existingPoolConnection = sshConnectionPool[cacheKey];
      if (existingPoolConnection) {
        try {
          await existingPoolConnection.exec('echo "test"');
          ssh = existingPoolConnection;
          isReusedConnection = true;
        } catch (testError) {
          try {
            existingPoolConnection.close();
          } catch (e) { }
          delete sshConnectionPool[cacheKey];
          delete motdCache[cacheKey];
        }
      }
      if (!ssh) {
        ssh = new (getSSH2Promise())(directConnect.connectConfig);
        sshConnectionPool[cacheKey] = ssh;
      }
    }

    try {


      // Conectar SSH si es necesario
      if (!isReusedConnection) {
        // Solo conectar si es una conexión nueva (no reutilizada del pool)
        ssh.setMaxListeners(300);

        try {
          await ssh.connect();
        } catch (firstConnectErr) {
          // Si el servidor remoto falla en el handshake/KEX (por ejemplo equipos legacy con límite
          // de paquete KEXINIT pequeño o implementación PQC defectuosa), reintentar automáticamente
          // una vez en modo de compatibilidad legacy (sin PQC).
          if (!config.legacyCompatibility && isHandshakeOrKexError(firstConnectErr)) {
            try { ssh.close(); } catch (_) { }
            const legacyConfig = { ...config, legacyCompatibility: true };
            config = legacyConfig;
            const legacyConnect = buildSshConnectOptions(
              legacyConfig,
              {
                knownHostsService: sshKnownHostsService,
                notify: (message) => sendToRenderer(event.sender, `ssh:data:${tabId}`, message)
              }
            );
            ssh = new (getSSH2Promise())(legacyConnect.connectConfig);
            ssh.setMaxListeners(300);
            sshConnectionPool[cacheKey] = ssh;
            await ssh.connect();
          } else {
            throw firstConnectErr;
          }
        }

        // Guardar en el pool solo para SSH directo (bastiones son independientes)
        if (!config.useBastionWallix) {
          ssh._createdAt = Date.now();
          ssh._lastUsed = Date.now();
          sshConnectionPool[cacheKey] = ssh;
        }
      }

      // Crear shell con reintentos
      let stream;
      let shellAttempts = 0;
      const maxShellAttempts = 3;

      while (shellAttempts < maxShellAttempts) {
        try {
          // Añadir pequeño delay entre intentos
          if (shellAttempts > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000 * shellAttempts));
          }

          // Si es una conexión Wallix, usar configuración específica para bastiones
          if (ssh._isWallixConnection && ssh._wallixTarget) {
            // Para bastiones Wallix, esperar un poco antes de crear shell
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Intentar con configuración específica para Wallix
            try {
              stream = await ssh.shell({
                term: 'xterm-256color',
                cols: 80,
                rows: 24,
                modes: {
                  ECHO: 1,
                  TTY_OP_ISPEED: 14400,
                  TTY_OP_OSPEED: 14400
                }
              });
            } catch (shellError) {
              // Fallback con configuración mínima
              stream = await ssh.shell('xterm-256color');
            }

            // Enviar comando para verificar hostname
            stream.write('hostname\n');

            // Esperar un poco para procesar
            await new Promise(resolve => setTimeout(resolve, 500));

          } else {
            // Conexión SSH directa normal
            stream = await ssh.shell(buildShellOptions(config));
          }

          break;
        } catch (shellError) {
          shellAttempts++;

          if (shellAttempts >= maxShellAttempts) {
            throw new Error(`No se pudo crear shell después de ${maxShellAttempts} intentos: ${shellError?.message || shellError || 'Unknown error'}`);
          }
        }
      }

      // Configurar límites de listeners para el stream
      stream.setMaxListeners(0); // Sin límite para streams individuales

      const storedOriginalKey = config.originalKey || tabId;
      sshConnections[tabId] = {
        ssh,
        stream,
        config,
        cacheKey,
        originalKey: storedOriginalKey,
        previousCpu: null,
        statsTimeout: null,
        previousNet: null,
        previousTime: null
      };

      // Lanzar statsLoop para conexiones SSH directas (no bastion)
      if (!config.useBastionWallix) {
        let realHostname = 'unknown';
        let osRelease = '';
        try {
          realHostname = (await ssh.exec('hostname')).trim();
        } catch (e) { }
        try {
          osRelease = await ssh.exec('cat /etc/os-release');
        } catch (e) { osRelease = 'ID=linux'; }
        const distroId = (osRelease.match(/^ID=(.*)$/m) || [])[1] || 'linux';
        const finalDistroId = distroId.replace(/"/g, '').toLowerCase();
        // Si ya hay un statsTimeout para este tabId, lo limpio antes de lanzar uno nuevo
        if (sshConnections[tabId].statsTimeout) {
          clearTimeout(sshConnections[tabId].statsTimeout);
        }
        statsLoop(tabId, realHostname, finalDistroId, config.host);
      }

      // Para conexiones multiplexadas/reutilizadas, enviar el MOTD en caché si existe
      const cachedMotd = (ssh && ssh._motd) || motdCache[cacheKey];
      if (isReusedConnection && cachedMotd) {
        sendToRenderer(event.sender, `ssh:data:${tabId}`, cachedMotd);
      }

      // Para capturar el MOTD en la primera conexión directa sin bloquear
      let motdBuffer = '';
      let motdCaptured = isReusedConnection;
      // Decoder aparte del batcher: MOTD/recorder no deben usar toString por chunk (rompe €).
      const motdDecoder = new StringDecoder('utf8');

      const motdTimer = !isReusedConnection ? setTimeout(() => {
        motdCaptured = true;
        motdBuffer = '';
      }, 4000) : null;

      // Batcher + StringDecoder: nunca data.toString('utf-8') por chunk (ssh2 parte UTF-8).
      stream.on('data', (data) => {
        try {
          const dataStr = typeof data === 'string' ? data : motdDecoder.write(data);

          // Captura no-bloqueante del banner inicial (MOTD) en la primera conexión
          if (dataStr && !motdCaptured) {
            motdBuffer += dataStr;
            const motdResult = extractMotdBanner(motdBuffer);
            if (motdResult.matched) {
              motdCaptured = true;
              if (motdTimer) clearTimeout(motdTimer);
              if (motdResult.motd) {
                motdCache[cacheKey] = motdResult.motd;
                if (ssh) ssh._motd = motdResult.motd;
              }
              motdBuffer = '';
            } else if (motdBuffer.length > 8192) {
              motdCaptured = true;
              if (motdTimer) clearTimeout(motdTimer);
              motdBuffer = '';
            }
          }

          // Grabar output si hay grabación activa (texto ya decodificado en stream)
          if (dataStr && getSessionRecorder().isRecording(tabId)) {
            getSessionRecorder().recordOutput(tabId, dataStr);
          }

          terminalIpcBatcher.send(event.sender, `ssh:data:${tabId}`, data);
        } catch (e) {
          // log o ignora
        }
      });

      stream.on('close', async () => {
        if (motdTimer) clearTimeout(motdTimer);
        try { motdDecoder.end(); } catch (_) { /* noop */ }
        terminalIpcBatcher.flush(`ssh:data:${tabId}`, { final: true });
        sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\nConnection closed.\r\n');
        const conn = sshConnections[tabId];
        if (conn && conn.statsTimeout) {
          clearTimeout(conn.statsTimeout);
        }

        // Detener grabación automática si está activa
        if (getSessionRecorder().isRecording(tabId)) {
          try {
            const recording = getSessionRecorder().stopRecording(tabId);

            // Guardar grabación automáticamente (siempre guardar cuando hay una grabación activa)
            const autoRecordingEnabled = true; // Asumir que si hay grabación activa, debe guardarse
            if (autoRecordingEnabled) {
              // Guardar archivo en disco
              const fsPromises = fs.promises;
              const recordingsDir = await getRecordingsDirectory(getNodeTermDataDir());

              // Crear directorio si no existe
              await fsPromises.mkdir(recordingsDir, { recursive: true });

              // Generar formato asciicast
              const asciicastContent = getSessionRecorder().toAsciicast(recording);
              const filename = `${recording.id}.cast`;
              const filepath = path.join(recordingsDir, filename);

              // Guardar archivo
              await fsPromises.writeFile(filepath, asciicastContent, 'utf-8');

              // Guardar metadata en archivo separado para índice rápido
              const metadataPath = path.join(recordingsDir, `${recording.id}.meta.json`);
              const metadata = {
                id: recording.id,
                filepath,
                filename,
                ...recording.metadata,
                duration: recording.duration,
                endTime: recording.endTime,
                eventCount: recording.eventCount,
                bytesRecorded: recording.bytesRecorded,
                createdAt: Date.now()
              };

              await fsPromises.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

              console.log(`💾 Grabación automática guardada: ${filename}`);
            }
          } catch (error) {
            console.error('Error guardando grabación automática:', error);
          }
        }

        // Enviar evento de desconexión
        const disconnectOriginalKey = conn?.originalKey || tabId;
        sendToRenderer(event.sender, 'ssh-connection-disconnected', {
          originalKey: disconnectOriginalKey,
          tabId: tabId
        });

        delete sshConnections[tabId];
      });



      sendToRenderer(event.sender, `ssh:ready:${tabId}`);

      // Enviar evento de conexión exitosa
      const originalKey = config.originalKey || tabId;
      sendToRenderer(event.sender, 'ssh-connection-ready', {
        originalKey: originalKey,
        tabId: tabId
      });

      // After setting up the shell, get the hostname/distro and start the stats loop
      // let realHostname = 'unknown';
      // let osRelease = '';
      // try {
      //   realHostname = (await ssh.exec('hostname')).trim();
      // } catch (e) {
      //   // Si falla, dejamos 'unknown'
      // }
      // try {
      //   osRelease = await ssh.exec('cat /etc/os-release');
      // } catch (e) {
      //   osRelease = 'ID=linux'; // fallback si no existe el archivo
      // }
      // const distroId = (osRelease.match(/^ID=(.*)$/m) || [])[1] || 'linux';
      // const finalDistroId = distroId.replace(/"/g, '').toLowerCase();
      // statsLoop(tabId, realHostname, finalDistroId, config.host);

    } catch (err) {
      // Detectar si es un error de autenticación
      const isAuthError = err && (
        (typeof err === 'string' && (
          err.includes('All configured authentication methods failed') ||
          err.includes('authentication') ||
          err.includes('Authentication failed') ||
          err.includes('Failed to connect to agent')
        )) ||
        (err.message && (
          err.message.includes('All configured authentication methods failed') ||
          err.message.includes('authentication') ||
          err.message.includes('Authentication failed') ||
          err.message.includes('Failed to connect to agent')
        ))
      );

      // Si es error de autenticación, permitir reintento interactivo
      if (isAuthError && !config.useBastionWallix) {
        try {
          // Limpiar conexión problemática del pool
          if (ssh && cacheKey && sshConnectionPool[cacheKey] === ssh) {
            try {
              ssh.close();
            } catch (closeError) {
              // Ignorar errores de cierre
            }
            delete sshConnectionPool[cacheKey];
            delete motdCache[cacheKey];
          }

          // Usar ssh2 Client directamente para permitir autenticación interactiva
          const ssh2Client = new (getSSH2Client())();

          // ✅ REFACTORIZADO: Crear conexión con estado de autenticación usando SSHAuthService
          sshConnections[tabId] = {
            ssh: ssh2Client,
            stream: null,
            config,
            cacheKey,
            originalKey: config.originalKey || tabId,
            previousCpu: null,
            statsTimeout: null,
            previousNet: null,
            previousTime: null
          };

          // Inicializar estado de autenticación
          sshAuthService.initializeAuthState(sshConnections[tabId], false);

          // Configurar todos los listeners de SSH2 usando el servicio
          sshAuthService.setupSSH2ClientListeners(
            ssh2Client,
            sshConnections[tabId],
            tabId,
            config,
            event.sender,
            {
              onReady: (realHostname, finalDistroId) => {
                // Inicializar statsLoop después de conectar
                setTimeout(() => {
                  if (sshConnections[tabId] && sshConnections[tabId].ssh) {
                    statsLoop(tabId, realHostname, finalDistroId, config.host);
                  }
                }, 1000);
              },
              onError: null,
              getSessionRecorder: () => getSessionRecorder()
            }
          );

          // ✅ REFACTORIZADO: Crear configuración SSH con SSHAuthService
          // NO incluir password si falló antes - forzar autenticación interactiva
          const includePassword = config.password && config.password.trim() && !isAuthError;
          const connectConfig = sshAuthService.createInteractiveSSHConfig(config, includePassword, {
            knownHostsService: sshKnownHostsService,
            notify: (message) => sendToRenderer(event.sender, `ssh:data:${tabId}`, message)
          });

          // Si no hay password configurado, activar modo manual inmediatamente
          if (!config.password || !config.password.trim()) {
            sshAuthService.enableManualPasswordMode(
              sshConnections[tabId],
              event.sender,
              tabId,
              'Por favor, introduce el password'
            );
          }

          ssh2Client.connect(connectConfig);

          // No mostrar error, permitir que el usuario reintente interactivamente
          return;

        } catch (retryError) {
          console.error('Error en reintento interactivo:', retryError);
          // Continuar con el manejo de error normal
        }
      }

      // Limpiar conexión problemática del pool
      if (ssh && cacheKey && sshConnectionPool[cacheKey] === ssh) {
        try {
          ssh.close();
        } catch (closeError) {
          // Ignorar errores de cierre
        }
        delete sshConnectionPool[cacheKey];
        delete motdCache[cacheKey];
      }

      // Crear mensaje de error más descriptivo
      let errorMsg = 'Error desconocido al conectar por SSH';
      if (err) {
        if (typeof err === 'string') {
          errorMsg = err;
        } else if (err.message) {
          errorMsg = err.message;
        } else if (err.code) {
          errorMsg = `Error de conexión: ${err.code}`;
        } else {
          try {
            errorMsg = JSON.stringify(err);
          } catch (jsonError) {
            errorMsg = 'Error de conexión SSH';
          }
        }
      }

      // Solo mostrar error si NO es de autenticación (ya lo manejamos arriba)
      if (!isAuthError) {
        sendToRenderer(event.sender, `ssh:error:${tabId}`, errorMsg);

        // Enviar evento de error de conexión
        const errorOriginalKey = config.originalKey || tabId;
        sendToRenderer(event.sender, 'ssh-connection-error', {
          originalKey: errorOriginalKey,
          tabId: tabId,
          error: errorMsg
        });
      }
    }
  });

  // ── ssh:data ───────────────────────────────────────────────────────────────
  // IPC handler to send data to the SSH shell
  ipcMain.on('ssh:data', (event, { tabId, data }) => {
    const conn = sshConnections[tabId];

    if (!conn) {
      return;
    }

    // ✅ REFACTORIZADO: Procesar input manual de password con SSHAuthService
    if (conn.manualPasswordMode) {
      const password = sshAuthService.processManualPasswordInput(conn, data, event.sender, tabId);

      // Si processManualPasswordInput retorna un password, reconectar
      if (password) {
        // Cerrar conexión anterior si existe
        if (conn.ssh && typeof conn.ssh.end === 'function') {
          try {
            conn.ssh.end();
          } catch (e) { }
        }

        // Reconectar con el password proporcionado
        const newConfig = { ...conn.config, password: password };

        // Si es conexión Bastion, usar createBastionShell
        if (newConfig.useBastionWallix) {
          const bastionConfig = {
            bastionHost: newConfig.bastionHost,
            port: newConfig.port || 22,
            bastionUser: newConfig.bastionUser,
            password: password,
            useBastionWallix: true,
            legacyCompatibility: !!newConfig.legacyCompatibility
          };

          const { conn: newBastionConn } = createBastionShell(
            bastionConfig,
            (data) => {
              if (getSessionRecorder().isRecording(tabId)) {
                const dataStr = typeof data === 'string' ? data : data.toString('utf-8');
                getSessionRecorder().recordOutput(tabId, dataStr);
              }
              terminalIpcBatcher.send(event.sender, `ssh:data:${tabId}`, data);
            },
            // ✅ REFACTORIZADO: Handler de cierre usando SSHConnectionCleanupService
            sshCleanupService.createCloseHandler(
              tabId,
              conn,
              sshConnections,
              bastionStatsState,
              event.sender
            ),
            (err) => {
              // ✅ REFACTORIZADO: Manejo de errores de autenticación con SSHAuthService
              sshAuthService.handleAuthError(conn, event.sender, tabId, err);
            },
            (stream) => {
              if (sshConnections[tabId]) {
                sshConnections[tabId].stream = stream;

                // ✅ FIX: Desactivar modo de password manual cuando el stream está listo
                sshAuthService.disableManualPasswordMode(sshConnections[tabId]);

                const pending = sshConnections[tabId]._pendingResize;
                if (pending && stream && !stream.destroyed && typeof stream.setWindow === 'function') {
                  const safeRows = Math.max(1, Math.min(300, pending.rows || 24));
                  const safeCols = Math.max(1, Math.min(500, pending.cols || 80));
                  stream.setWindow(safeRows, safeCols);
                  sshConnections[tabId]._pendingResize = null;
                }

                // ✅ REFACTORIZADO: Crear función wallixStatsLoop usando SSHStatsService
                if (!conn.wallixStatsLoop) {
                  conn.wallixStatsLoop = sshStatsService.createBastionStatsLoop(tabId, newConfig, bastionStatsState, sshConnections, event.sender);
                }

                if (sshStatsService.getActiveStatsTab() === tabId) {
                  conn.wallixStatsLoop();
                }
              }
            }
          );

          // Actualizar conexión
          conn.ssh = newBastionConn;
          conn.config = newConfig;
          // Mantener password en main para SFTP / claim one-shot (no enviarlo al renderer)
          conn.manualPassword = password;

          // ✅ FIX: Desactivar modo de password manual después de conectar exitosamente
          sshAuthService.disableManualPasswordMode(conn);

          sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\n✅ Conectado exitosamente.\r\n');
          sendToRenderer(event.sender, `ssh:ready:${tabId}`);
          // ✅ SEGURIDAD: no enviar la contraseña al renderer; el guardado usa ssh:claim-manual-password
          sendToRenderer(event.sender, 'ssh-connection-ready', {
            originalKey: conn.originalKey || tabId,
            tabId: tabId,
            manualPasswordAvailable: true
          });
        } else {
          // ✅ REFACTORIZADO: Reconexión SSH directa usando SSHAuthService
          const ssh2Client = new (getSSH2Client())();

          // Configurar listeners usando el servicio
          sshAuthService.setupSSH2ClientListeners(
            ssh2Client,
            conn,
            tabId,
            newConfig,
            event.sender,
            {
              onReady: (realHostname, finalDistroId) => {
                // Inicializar statsLoop
                setTimeout(() => {
                  if (sshConnections[tabId] && sshConnections[tabId].ssh) {
                    statsLoop(tabId, realHostname, finalDistroId, newConfig.host);
                  }
                }, 1000);
              },
              onError: null,
              getSessionRecorder: () => getSessionRecorder()
            },
            password // Pasar password capturado manualmente
          );

          // Actualizar conexión
          conn.ssh = ssh2Client;
          conn.config = newConfig;

          const reconnectOptions = buildSshConnectOptions(newConfig, {
            includePassword: true,
            knownHostsService: sshKnownHostsService,
            notify: (message) => sendToRenderer(event.sender, `ssh:data:${tabId}`, message)
          });
          ssh2Client.connect(reconnectOptions.connectConfig);
        }
      }
      return;
    }

    // ✅ REFACTORIZADO: Procesar keyboard-interactive con SSHAuthService
    if (sshAuthService.processKeyboardInteractiveInput(conn, data, event.sender, tabId)) {
      return; // Input procesado por keyboard-interactive
    }

    // ✅ REFACTORIZADO: Enviar datos al stream con buffering optimizado para Wallix
    if (conn && conn.stream && !conn.stream.destroyed) {
      // Intentar usar buffering (retorna true si aplica, false si no)
      const buffered = sshWriteBufferService.writeWithBuffering(
        conn,
        data,
        tabId,
        getSessionRecorder
      );

      // Si no se usó buffering, usar comportamiento directo
      if (!buffered) {
        // SSH directo: sin buffering. Omitir recordInput en modo contraseña.
        const { isSecretEntry } = require('./SecretEntryState');
        if (getSessionRecorder().isRecording(tabId) && !isSecretEntry(tabId)) {
          getSessionRecorder().recordInput(tabId, data);
        }

        conn.stream.write(data);
      }

      // Fast-path interactivo: no retener eco/redraw en el batcher de salida tras tipar
      try {
        terminalIpcBatcher.flush(`ssh:data:${tabId}`);
      } catch (_) { /* noop */ }
    }
  });

  // ── ssh:resize ─────────────────────────────────────────────────────────────
  // IPC handler to handle terminal resize
  ipcMain.on('ssh:resize', (event, { tabId, rows, cols }) => {
    const conn = sshConnections[tabId];
    if (conn) {
      // Guardar el último tamaño solicitado
      conn._pendingResize = { rows, cols };
      if (conn.stream && !conn.stream.destroyed) {
        try {
          const safeRows = Math.max(1, Math.min(300, rows || 24));
          const safeCols = Math.max(1, Math.min(500, cols || 80));
          conn.stream.setWindow(safeRows, safeCols);
          conn._pendingResize = null; // Aplicado correctamente
        } catch (resizeError) {
          // Error redimensionando terminal
        }
      }
    }
  });

  // ── ssh:disconnect ─────────────────────────────────────────────────────────
  // ✅ REFACTORIZADO: Handler de desconexión SSH usando SSHConnectionCleanupService
  ipcMain.on('ssh:disconnect', (event, tabId) => {
    try {
      terminalIpcBatcher.clear(`ssh:data:${tabId}`);
      terminalStdoutRingBuffer.clear(tabId);
      const { clearSecretEntry } = require('./SecretEntryState');
      clearSecretEntry(tabId);
    } catch (_) { /* noop */ }
    const conn = sshConnections[tabId];
    if (conn) {
      sshCleanupService.cleanupConnection(
        tabId,
        conn,
        sshConnections,
        sshConnectionPool,
        bastionStatsState,
        event.sender,
        motdCache
      );
    }
  });
}

module.exports = { registerSshConnectSession };
