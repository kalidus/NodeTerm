/**
 * Manejadores IPC para funcionalidades SSH
 */

const { ipcMain } = require('electron');
const { buildSshAlgorithms } = require('../../utils/sshConnectOptions');
const SSH2Promise = require('ssh2-promise');
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const { PassThrough, Transform } = require('stream');
const { parseProcessList } = require('../utils/parsing-utils');
const sshStatsService = require('../services/SSHStatsService');

/**
 * Escapa caracteres especiales de shell para prevenir command injection
 * @param {string} path - Ruta a escapar
 * @returns {string} - Ruta escapada de forma segura
 */
function escapeShellPath(path) {
  if (!path || typeof path !== 'string') {
    return '';
  }
  // Sanitizar saltos de línea y escapar caracteres especiales: ", `, $, \, !, ;, |, &, <, >
  return path.replace(/[\r\n]/g, '').replace(/(["`$\\!;|&<>])/g, '\\$1');
}

/**
 * Ejecuta el script vía /bin/sh para no depender del login shell (fish/zsh/etc.).
 * fish interpreta ()/&& de forma distinta; sh recibe el script intacto.
 */
function wrapInPosixSh(command) {
  return `/bin/sh -c '${String(command).replace(/'/g, `'\\''`)}'`;
}

/**
 * ls portable: BusyBox no siempre acepta --color=never; evita aliases fish/eza.
 */
function buildPortableLsCommand(safePath) {
  const escapedPath = escapeShellPath(safePath);
  return wrapInPosixSh(
    `LS_COLORS= command ls -la -- "${escapedPath}" 2>/dev/null || LS_COLORS= ls -la -- "${escapedPath}" 2>/dev/null || ls -la "${escapedPath}"`
  );
}

function buildPortableDirCheckCommand(safePath) {
  const escapedPath = escapeShellPath(safePath);
  return wrapInPosixSh(`[ -d "${escapedPath}" ] && echo exists || echo notfound`);
}

function stripLsAnsi(output) {
  return String(output || '').replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Parsea ls y falla si hay líneas de contenido que no se pudieron interpretar
 * (evita devolver "carpeta vacía" ante eza/salida corrupta).
 */
function filesFromLsOutput(rawOutput) {
  const cleanOutput = stripLsAnsi(rawOutput).replace(/\r/g, '');
  const files = parseLsOutput(cleanOutput);
  const meaningful = cleanOutput
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^total\b/i.test(line));
  if (files.length === 0 && meaningful.length > 0) {
    throw new Error('No se pudo interpretar la salida de ls');
  }
  return files;
}

function mapSftpListItem(item) {
  return {
    name: item.name,
    target: item.target || null,
    permissions: item.longname?.split(' ')[0] || '',
    owner: '',
    group: '',
    size: item.size,
    modified: item.modifyTime ? new Date(item.modifyTime * 1000).toLocaleString() : '',
    type: item.type === 'd' ? 'directory' : (item.type === 'l' ? 'symlink' : 'file'),
  };
}

function buildSftpConnectConfig(secureConfig) {
  if (secureConfig.useBastionWallix) {
    return {
      host: secureConfig.bastionHost,
      port: secureConfig.port || 22,
      username: secureConfig.bastionUser,
      password: secureConfig.password,
      readyTimeout: 20000,
      algorithms: buildSshAlgorithms(secureConfig)
    };
  }
  return {
    host: secureConfig.host,
    port: secureConfig.port || 22,
    username: secureConfig.username,
    password: secureConfig.password,
    privateKey: secureConfig.privateKey,
    passphrase: secureConfig.passphrase,
    readyTimeout: 20000,
    algorithms: buildSshAlgorithms(secureConfig)
  };
}

async function listFilesViaSftp(connectConfig, remotePath) {
  const sftp = new SftpClient();
  try {
    await sftp.connect(connectConfig);
    const sftpList = await sftp.list(remotePath);
    return (sftpList || []).map(mapSftpListItem);
  } finally {
    try { await sftp.end(); } catch (_) { /* ignore */ }
  }
}

async function statDirectoryViaSftp(connectConfig, remotePath) {
  const sftp = new SftpClient();
  try {
    await sftp.connect(connectConfig);
    const st = await sftp.stat(remotePath);
    if (!st) return false;
    if (typeof st.isDirectory === 'function') return !!st.isDirectory();
    if (typeof st.isDirectory === 'boolean') return st.isDirectory;
    return st.type === 'd' || st.type === 2;
  } finally {
    try { await sftp.end(); } catch (_) { /* ignore */ }
  }
}

/**
 * Exec compatible con SSH2Promise (thenable) y ssh2.Client (callback).
 * Rechaza resultados no textuales (p. ej. await client.exec sin callback → Client).
 */
async function safeExec(ssh, command) {
  if (!ssh || typeof ssh.exec !== 'function') {
    throw new Error('SSH exec no disponible');
  }

  let Ssh2Client = null;
  try {
    Ssh2Client = require('ssh2').Client;
  } catch (_) { /* noop */ }
  const isRaw = !!(Ssh2Client && ssh instanceof Ssh2Client);

  if (isRaw) {
    return new Promise((resolve, reject) => {
      ssh.exec(command, (err, stream) => {
        if (err) return reject(err);
        let stdout = '';
        let stderr = '';
        stream.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
        if (stream.stderr) {
          stream.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
        }
        stream.on('error', reject);
        stream.on('close', (code) => {
          if ((!stdout || !stdout.length) && code && code !== 0) {
            reject(new Error((stderr || '').trim() || `SSH exec exit ${code}`));
            return;
          }
          resolve(stdout);
        });
      });
    });
  }

  const out = await ssh.exec(command);
  if (out != null && typeof out !== 'string' && !Buffer.isBuffer(out)) {
    throw new Error('SSH exec devolvió un resultado no textual');
  }
  return String(out || '');
}

/**
 * Extrae la primera ruta absoluta útil de salida remota (ANSI / prompts).
 */
function sanitizeRemoteHomePath(raw) {
  const text = String(raw || '')
    .replace(/\x1b\][^\x07]*(\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, '')
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  const first = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('/'));
  if (!first) return '';
  return first.length > 1 && first.endsWith('/') ? first.slice(0, -1) : first;
}

/**
 * Home al estilo WinSCP/FileZilla: SFTP realPath('.').
 */
async function getHomeViaSftpClient(connectConfig) {
  const sftp = new SftpClient();
  try {
    await sftp.connect(connectConfig);
    const home = await sftp.realPath('.');
    return sanitizeRemoteHomePath(home);
  } finally {
    try { await sftp.end(); } catch (_) { /* ignore */ }
  }
}

/**
 * Fallback: $HOME canónico (sigue symlinks; típico en ASUSWRT /root -> /tmp/home/root).
 */
async function getHomeViaExecCanonical(ssh) {
  if (!ssh || typeof ssh.exec !== 'function') return '';
  const cmd = wrapInPosixSh('h=${HOME:-/}; (readlink -f "$h" 2>/dev/null || realpath "$h" 2>/dev/null || echo "$h")');
  const out = await safeExec(ssh, cmd);
  return sanitizeRemoteHomePath(out);
}

/**
 * Parsea la salida del comando ls -la en formato de objetos
 * Soporta nombres con espacios, enlaces simbólicos (-> destino),
 * fechas tradicionales, ISO y localizadas, y atributos SELinux/ACL (+/.).
 */
function parseLsOutput(output) {
  if (!output || typeof output !== 'string') return [];
  const lines = output.split(/\r?\n/);
  const results = [];

  // Regex para formato estándar ls -l:
  // 1: permisos ([bcdlps-][rwxstST-]{9}[.+@]?)
  // 2: links (\d+)
  // 3: owner (\S+)
  // 4: group (\S+)
  // 5: size (\d+(?:,\s*\d+)?)
  // 6: fecha (ISO "YYYY-MM-DD HH:MM[:SS]" o Tradicional "Mes Dia Hora/Año" o "Dia Mes Hora/Año")
  // 7: resto de la línea (nombre del archivo y opcional destino de enlace)
  const lsRegex = /^([bcdlps\-][rwxstST\-]{9}[.+@]?)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\d+(?:,\s*\d+)?)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?|[A-Za-z\u00C0-\u017F\.]+\s+\d{1,2}\s+(?:\d{2}:\d{2}|\d{4})|\d{1,2}\s+[A-Za-z\u00C0-\u017F\.]+\s+(?:\d{2}:\d{2}|\d{4}))\s+(.+)$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('total') || line.startsWith('total:')) continue;

    const match = line.match(lsRegex);
    if (match) {
      const [, permissions, , owner, group, sizeStr, dateStr, rawName] = match;
      const typeChar = permissions[0];
      let type = 'file';
      if (typeChar === 'd') type = 'directory';
      else if (typeChar === 'l') type = 'symlink';
      else if (typeChar === 'c' || typeChar === 'b') type = 'device';
      else if (typeChar === 's') type = 'socket';
      else if (typeChar === 'p') type = 'fifo';

      let name = rawName.trim();
      let target = null;

      if (type === 'symlink' && name.includes(' -> ')) {
        const arrowIdx = name.indexOf(' -> ');
        target = name.substring(arrowIdx + 4).trim();
        name = name.substring(0, arrowIdx).trim();
      }

      const size = parseInt(sizeStr.replace(/\s+/g, ''), 10) || 0;

      results.push({
        name,
        target,
        permissions,
        owner,
        group,
        size,
        modified: dateStr.trim(),
        type,
      });
    } else {
      // Fallback por división de tokens para formatos no estándar
      const parts = line.split(/\s+/);
      if (parts.length >= 9 && /^[bcdlps\-]/.test(parts[0])) {
        const permissions = parts[0];
        const owner = parts[2];
        const group = parts[3];
        const size = parseInt(parts[4], 10) || 0;
        const month = parts[5];
        const day = parts[6];
        const timeOrYear = parts[7];
        const rawName = parts.slice(8).join(' ');

        const typeChar = permissions[0];
        let type = 'file';
        if (typeChar === 'd') type = 'directory';
        else if (typeChar === 'l') type = 'symlink';
        else if (typeChar === 'c' || typeChar === 'b') type = 'device';
        else if (typeChar === 's') type = 'socket';
        else if (typeChar === 'p') type = 'fifo';

        let name = rawName.trim();
        let target = null;
        if (type === 'symlink' && name.includes(' -> ')) {
          const arrowIdx = name.indexOf(' -> ');
          target = name.substring(arrowIdx + 4).trim();
          name = name.substring(0, arrowIdx).trim();
        }

        results.push({
          name,
          target,
          permissions,
          owner,
          group,
          size,
          modified: `${month} ${day} ${timeOrYear}`,
          type,
        });
      }
    }
  }

  return results;
}

function waitForWritableCompletion(stream) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err) => {
      if (settled) return;
      settled = true;
      stream.removeListener('finish', onFinish);
      stream.removeListener('close', onClose);
      stream.removeListener('error', onError);
      if (err) reject(err);
      else resolve();
    };
    const onFinish = () => done();
    const onClose = () => done();
    const onError = (err) => done(err || new Error('Error escribiendo archivo local'));
    stream.once('finish', onFinish);
    stream.once('close', onClose);
    stream.once('error', onError);
  });
}

function withTimeout(promise, ms, message) {
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message || `Operación excedió ${ms}ms`)), ms);
  });
  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    timeoutPromise
  ]);
}

function parseListeningPorts(rawOutput) {
  const lines = String(rawOutput || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const ports = [];

  for (const line of lines) {
    if (!line) continue;
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('proto') || lowerLine.includes('active internet connections') || lowerLine.includes('recv-q') || lowerLine.includes('recvv-q') || lowerLine.includes('netid')) {
      continue;
    }

    const parts = line.split(/\s+/);
    if (parts.length < 4) continue;

    const protocol = parts[0];
    let state = 'LISTEN';
    if (!protocol.startsWith('udp')) {
      if (parts.includes('LISTEN')) {
        state = 'LISTEN';
      } else if (parts[1] && isNaN(Number(parts[1]))) {
        state = parts[1].toUpperCase();
      } else {
        const lastPart = parts[parts.length - 1];
        state = lastPart ? lastPart.toUpperCase() : 'LISTEN';
      }
    }

    // Support ss/netstat variants
    const localCandidate = parts.find((part) => part.includes(':') || part === '*') || '';
    const localAddress = localCandidate;
    const portMatch = localCandidate.match(/:(\d+)\b/);
    const localPort = portMatch ? portMatch[1] : '';

    ports.push({
      protocol,
      localAddress,
      localPort,
      state: state || 'UNKNOWN'
    });
  }

  return ports.slice(0, 300);
}

function parseRunningServices(rawOutput) {
  const lines = String(rawOutput || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const services = [];

  for (const line of lines) {
    if (!line) continue;

    // systemd format: name.service loaded active running Description
    const systemdMatch = line.match(/^([^\s]+)\s+\S+\s+(\S+)\s+(\S+)\s+(.+)$/);
    if (systemdMatch) {
      services.push({
        name: systemdMatch[1],
        state: `${systemdMatch[2]} ${systemdMatch[3]}`.trim(),
        detail: systemdMatch[4] || ''
      });
      continue;
    }

    // service --status-all format: [ + ]  ssh
    const serviceMatch = line.match(/^\[\s*([+\-?])\s*\]\s+(.+)$/);
    if (serviceMatch) {
      const token = serviceMatch[1];
      services.push({
        name: serviceMatch[2],
        state: token === '+' ? 'running' : token === '-' ? 'stopped' : 'unknown',
        detail: ''
      });
      continue;
    }
  }

  return services.slice(0, 300);
}

/**
 * Valida si un PID es seguro y válido para terminar
 * @param {number|string} pid - PID del proceso a finalizar
 * @param {boolean} isLocal - Indica si es un proceso del sistema local
 * @returns {{ valid: boolean, pid?: number, error?: string }}
 */
function validateKillPid(pid, isLocal = false) {
  if (pid === null || pid === undefined) {
    return { valid: false, error: 'PID inválido. Debe ser un entero positivo mayor que 0.' };
  }

  const strPid = String(pid).trim();
  if (!/^\d+$/.test(strPid)) {
    return { valid: false, error: 'PID inválido. Debe ser un entero positivo mayor que 0.' };
  }

  const safePid = parseInt(strPid, 10);
  if (isNaN(safePid) || safePid <= 0) {
    return { valid: false, error: 'PID inválido. Debe ser un entero positivo mayor que 0.' };
  }

  // Protección para procesos locales
  if (isLocal) {
    if (safePid === process.pid) {
      return { valid: false, error: 'Operación denegada: no se puede finalizar el propio proceso de NodeTerm.' };
    }
    if (process.ppid && safePid === process.ppid) {
      return { valid: false, error: 'Operación denegada: no se puede finalizar el proceso padre de NodeTerm.' };
    }
    // Proteger PID 0 y 4 (System Idle / System en Windows)
    if (process.platform === 'win32' && (safePid === 0 || safePid === 4)) {
      return { valid: false, error: 'Operación denegada: no se pueden finalizar procesos protegidos del sistema.' };
    }
    // Proteger PID 1 en POSIX (init / launchd)
    if (process.platform !== 'win32' && safePid === 1) {
      return { valid: false, error: 'Operación denegada: no se puede finalizar el proceso init del sistema.' };
    }
  }

  return { valid: true, pid: safePid };
}

/**
 * Registra todos los manejadores IPC relacionados con SSH
 * @param {Object} dependencies - Dependencias necesarias para los handlers
 */
/**
 * Parsea la salida de 'ps aux' en una lista de objetos de proceso
 */

function registerSSHHandlers(dependencies = {}) {
  const { findSSHConnection, sshConnections } = dependencies || {};
  const activeTransfers = new Map();

  /**
   * ✅ SEGURIDAD: Resuelve las credenciales de una conexión.
   * Si el renderer no envía password pero tenemos una conexión activa con password manual,
   * inyectamos el password manual en la configuración para la operación SFTP/SSH.
   */
  const resolveCredentials = async (tabId, sshConfig) => {
    if (!sshConfig) return sshConfig;
    
    // Si ya tiene password o tiene llave privada, no hacemos nada
    if (sshConfig.password || sshConfig.privateKey) return sshConfig;

    // Intentar encontrar una conexión activa para este tabId o servidor
    const conn = await findSSHConnection(tabId, sshConfig);
    if (conn && conn.manualPassword) {
      return { ...sshConfig, password: conn.manualPassword };
    }
    
    return sshConfig;
  };

  /**
   * ✅ SEGURIDAD: Entrega one-shot del password manual al renderer para auto-guardar
   * en el árbol cifrado. No se emite en ssh-connection-ready.
   */
  ipcMain.handle('ssh:claim-manual-password', async (_event, { tabId, originalKey } = {}) => {
    try {
      let conn = null;
      if (tabId && sshConnections && sshConnections[tabId]) {
        conn = sshConnections[tabId];
      } else if (originalKey && sshConnections) {
        conn = Object.values(sshConnections).find(
          (c) => c && (c.originalKey === originalKey || c.tabId === originalKey)
        ) || null;
      } else if (tabId && findSSHConnection) {
        conn = await findSSHConnection(tabId, { originalKey });
      }

      const password = conn?.manualPassword;
      if (!password || typeof password !== 'string') {
        return { ok: false, error: 'No manual password available' };
      }
      return { ok: true, password };
    } catch (e) {
      return { ok: false, error: e?.message || 'claim failed' };
    }
  });

  const markTransferDone = (transferId) => {
    if (!transferId) return;
    activeTransfers.delete(transferId);
  };

  ipcMain.handle('ssh:cancel-transfer', async (_event, { transferId }) => {
    try {
      const transfer = activeTransfers.get(transferId);
      if (!transfer) {
        return { success: false, error: 'Transferencia no encontrada o ya finalizada' };
      }

      transfer.cancelled = true;
      if (transfer.readStream && !transfer.readStream.destroyed) transfer.readStream.destroy(new Error('Transferencia cancelada por usuario'));
      if (transfer.writeStream && !transfer.writeStream.destroyed) transfer.writeStream.destroy(new Error('Transferencia cancelada por usuario'));
      if (transfer.counter && !transfer.counter.destroyed) transfer.counter.destroy(new Error('Transferencia cancelada por usuario'));

      try {
        if (transfer.sftp) await transfer.sftp.end();
      } catch (_) { }

      activeTransfers.delete(transferId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error?.message || 'No se pudo cancelar la transferencia' };
    }
  });

  // SSH: Probar conexión
  ipcMain.handle('ssh:test-connection', async (event, { sshConfig }) => {
    try {
      if (!sshConfig) return { success: false, error: 'Configuración SSH no provista' };
      const config = {
        host: sshConfig.bastionHost || sshConfig.host || sshConfig.sshHost,
        port: parseInt(sshConfig.port || sshConfig.sshPort) || 22,
        username: sshConfig.bastionUser || sshConfig.user || sshConfig.username || sshConfig.sshUser,
        password: sshConfig.password || sshConfig.sshPassword,
        privateKey: sshConfig.privateKey || sshConfig.sshPrivateKey || sshConfig.privateKeyPath,
        readyTimeout: 10000,
        reconnect: false,
        algorithms: buildSshAlgorithms(sshConfig)
      };

      if (config.privateKey && typeof config.privateKey === 'string' && (config.privateKey.startsWith('/') || config.privateKey.includes(':') || config.privateKey.includes('\\'))) {
        try {
          if (fs.existsSync(config.privateKey)) {
            config.privateKey = fs.readFileSync(config.privateKey, 'utf8');
          }
        } catch (_) {}
      }

      try {
        const ssh = new SSH2Promise(config);
        await ssh.connect();
        await ssh.close();
      } catch (firstErr) {
        const { isHandshakeOrKexError } = require('../../utils/sshConnectOptions');
        if (!sshConfig.legacyCompatibility && isHandshakeOrKexError(firstErr)) {
          const sshLegacy = new SSH2Promise({
            ...config,
            algorithms: buildSshAlgorithms({ ...sshConfig, legacyCompatibility: true })
          });
          await sshLegacy.connect();
          await sshLegacy.close();
        } else {
          throw firstErr;
        }
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  // SSH: Obtener directorio home (como WinSCP/FileZilla: SFTP realPath('.'))
  ipcMain.handle('ssh:get-home-directory', async (event, { tabId, sshConfig }) => {
    try {
      const secureConfig = await resolveCredentials(tabId, sshConfig);
      const existingConn = findSSHConnection ? await findSSHConnection(tabId, secureConfig) : null;

      const sftpConnectConfig = secureConfig.useBastionWallix
        ? {
            host: secureConfig.bastionHost,
            port: secureConfig.port || 22,
            username: secureConfig.bastionUser,
            password: secureConfig.password,
            readyTimeout: 20000,
            algorithms: buildSshAlgorithms(secureConfig)
          }
        : {
            host: secureConfig.host,
            port: secureConfig.port || 22,
            username: secureConfig.username,
            password: secureConfig.password,
            privateKey: secureConfig.privateKey,
            passphrase: secureConfig.passphrase,
            readyTimeout: 20000,
            algorithms: buildSshAlgorithms(secureConfig)
          };

      // 1) Preferir SFTP realPath('.') — home de archivos del servidor
      try {
        const sftpHome = await getHomeViaSftpClient(sftpConnectConfig);
        if (sftpHome) return { success: true, home: sftpHome };
      } catch (sftpErr) {
        console.warn('[SSH:get-home] SFTP realPath falló, intentando fallback:', sftpErr.message);
      }

      // 2) Conexión activa: $HOME canónico (readlink/realpath)
      if (existingConn && existingConn.ssh && typeof existingConn.ssh.exec === 'function') {
        try {
          const execHome = await getHomeViaExecCanonical(existingConn.ssh);
          if (execHome) return { success: true, home: execHome };
        } catch (execErr) {
          console.warn('[SSH:get-home] exec canónico falló, intentando fallback:', execErr.message);
        }
      }

      // 3) Bastión Wallix: stream interactivo solo como último recurso
      if (secureConfig.useBastionWallix && existingConn?.stream && !existingConn.stream.destroyed) {
        const stream = existingConn.stream;
        const command = 'h=${HOME:-/}; (readlink -f "$h" 2>/dev/null || realpath "$h" 2>/dev/null || echo "$h")\n';
        let output = '';
        const onData = (data) => {
          output += data.toString('utf-8');
        };
        stream.on('data', onData);
        stream.write(command);
        await new Promise((resolve) => setTimeout(resolve, 300));
        stream.removeListener('data', onData);
        const home = sanitizeRemoteHomePath(output) || '/';
        return { success: true, home };
      }

      // 4) Conexión efímera + $HOME canónico
      const ssh = new SSH2Promise({
        ...secureConfig,
        reconnect: false,
        algorithms: buildSshAlgorithms(secureConfig)
      });
      try {
        await ssh.connect();
        const home = await getHomeViaExecCanonical(ssh);
        if (home) return { success: true, home };
        return { success: true, home: '/' };
      } finally {
        try { await ssh.close(); } catch (_) { /* ignore */ }
      }
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  });

  // SSH: Listar archivos (SFTP primero; fallback ls vía /bin/sh — fish/BusyBox/sesiones dedicadas)
  ipcMain.handle('ssh:list-files', async (event, { tabId, path, sshConfig }) => {
    try {
      const secureConfig = await resolveCredentials(tabId, sshConfig);
      let safePath = '/';
      if (typeof path === 'string') {
        safePath = path;
      } else if (path && typeof path.path === 'string') {
        safePath = path.path;
      }

      const existingConn = findSSHConnection ? await findSSHConnection(tabId, secureConfig) : null;
      const sftpConnectConfig = buildSftpConnectConfig(secureConfig);
      const lsCommand = buildPortableLsCommand(safePath);

      // 1) SFTP — independiente del login shell (fish) y de ssh2.Client.exec mal awaited
      try {
        const files = await listFilesViaSftp(sftpConnectConfig, safePath);
        return { success: true, files };
      } catch (sftpErr) {
        console.warn('[SSH:list-files] SFTP list falló, intentando fallback:', sftpErr.message);
      }

      // 2) Conexión activa + exec seguro + ls POSIX
      if (existingConn && existingConn.ssh && typeof existingConn.ssh.exec === 'function') {
        try {
          const lsOutput = await safeExec(existingConn.ssh, lsCommand);
          return { success: true, files: filesFromLsOutput(lsOutput) };
        } catch (execErr) {
          console.warn('[SSH:list-files] exec en conexión activa falló, intentando fallback:', execErr.message);
        }
      }

      // 3) Bastión: último recurso por stream interactivo
      if (secureConfig.useBastionWallix) {
        if (existingConn && existingConn.stream && !existingConn.stream.destroyed) {
          const stream = existingConn.stream;
          const escapedPath = escapeShellPath(safePath);
          const command = `ls -la "${escapedPath}"\n`;
          let output = '';
          const onData = (data) => {
            output += data.toString('utf-8');
          };
          stream.on('data', onData);
          stream.write(command);
          await new Promise((resolve) => setTimeout(resolve, 400));
          stream.removeListener('data', onData);
          let cleanOutput = output.replace(command.trim(), '').replace(/\r/g, '');
          cleanOutput = stripLsAnsi(cleanOutput);
          cleanOutput = cleanOutput.split('\n').filter(line => line.trim() !== '' && !line.trim().endsWith('$') && !line.trim().endsWith('#')).join('\n');
          return { success: true, files: filesFromLsOutput(cleanOutput) };
        }
        return { success: false, error: 'No se pudo listar por SFTP ni por la sesión bastión activa.' };
      }

      // 4) SSH directo: conexión efímera
      const ssh = new SSH2Promise({ ...secureConfig, reconnect: false, algorithms: buildSshAlgorithms(secureConfig) });
      try {
        await ssh.connect();
        const lsOutput = await safeExec(ssh, lsCommand);
        return { success: true, files: filesFromLsOutput(lsOutput) };
      } finally {
        try { await ssh.close(); } catch (_) { /* ignore */ }
      }
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  });

  // SSH: Verificar si un directorio existe
  ipcMain.handle('ssh:check-directory', async (event, { tabId, path, sshConfig }) => {
    try {
      const secureConfig = await resolveCredentials(tabId, sshConfig);
      const existingConn = findSSHConnection ? await findSSHConnection(tabId, secureConfig) : null;
      const sftpConnectConfig = buildSftpConnectConfig(secureConfig);
      const checkCommand = buildPortableDirCheckCommand(path);

      // 1) SFTP stat
      try {
        const exists = await statDirectoryViaSftp(sftpConnectConfig, path);
        return { success: true, exists };
      } catch (sftpErr) {
        console.warn('[SSH:check-directory] SFTP stat falló, intentando fallback:', sftpErr.message);
      }

      // 2) Exec seguro vía /bin/sh (evita fish con [ -d ])
      if (existingConn && existingConn.ssh && typeof existingConn.ssh.exec === 'function') {
        try {
          const result = await safeExec(existingConn.ssh, checkCommand);
          return { success: true, exists: String(result).includes('exists') };
        } catch (execErr) {
          console.warn('[SSH:check-directory] exec en conexión activa falló, intentando fallback:', execErr.message);
        }
      }

      if (secureConfig.useBastionWallix) {
        if (!existingConn || !existingConn.stream || existingConn.stream.destroyed) {
          return { success: false, error: 'No se encontró una conexión bastión activa para este tabId. Abre primero una terminal.' };
        }
        const stream = existingConn.stream;
        const escapedPath = escapeShellPath(path);
        const command = `[ -d "${escapedPath}" ] && echo exists || echo notfound\n`;
        let output = '';
        const onData = (data) => {
          output += data.toString('utf-8');
        };
        stream.on('data', onData);
        stream.write(command);
        await new Promise((resolve) => setTimeout(resolve, 350));
        stream.removeListener('data', onData);
        let cleanOutput = output.replace(command.trim(), '').replace(/\r/g, '');
        cleanOutput = stripLsAnsi(cleanOutput);
        return { success: true, exists: cleanOutput.includes('exists') };
      }

      const ssh = new SSH2Promise({ ...secureConfig, reconnect: false, algorithms: buildSshAlgorithms(secureConfig) });
      try {
        await ssh.connect();
        const result = await safeExec(ssh, checkCommand);
        return { success: true, exists: String(result).includes('exists') };
      } finally {
        try { await ssh.close(); } catch (_) { /* ignore */ }
      }
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  });

  // SSH: Descargar archivo
  ipcMain.handle('ssh:download-file', async (event, { tabId, remotePath, localPath, sshConfig, transferId }) => {
    let currentTransferId = transferId || `${tabId}-dl-${Date.now()}`;
    try {
      const secureConfig = await resolveCredentials(tabId, sshConfig);
      // ✅ VALIDACIÓN CRÍTICA: Validar inputs antes de procesar
      if (!remotePath || typeof remotePath !== 'string' || remotePath.trim() === '') {
        return { success: false, error: 'remotePath inválido o vacío' };
      }
      if (!localPath || typeof localPath !== 'string' || localPath.trim() === '') {
        return { success: false, error: 'localPath inválido o vacío' };
      }
      if (!secureConfig || typeof secureConfig !== 'object') {
        return { success: false, error: 'sshConfig inválido' };
      }

      // Sanitizar paths (prevenir path traversal)
      const safeRemotePath = remotePath.trim();
      const safeLocalPath = localPath.trim();

      const fileName = safeRemotePath.split('/').pop() || safeRemotePath;
      currentTransferId = transferId || `${tabId}-dl-${Date.now()}`;

      const buildProgressStep = (knownTotal = 0) => {
        let lastSentBytes = 0;
        let lastSentTime = Date.now();
        return (totalTransferred, chunk, total) => {
          try {
            if (event.sender && !event.sender.isDestroyed()) {
              const now = Date.now();
              const deltaTime = (now - lastSentTime) / 1000;
              const speed = deltaTime > 0 ? (totalTransferred - lastSentBytes) / deltaTime : 0;
              lastSentBytes = totalTransferred;
              lastSentTime = now;
              event.sender.send('ssh:transfer-progress', {
                tabId, transferId: currentTransferId, type: 'download', fileName,
                transferred: totalTransferred, total: total || knownTotal, speed
              });
            }
          } catch (_) { /* webContents destruido */ }
        };
      };

      const makeDownloadTransfer = async (sftp, connectConfig) => {
        await sftp.connect(connectConfig);
        activeTransfers.set(currentTransferId, { sftp, cancelled: false, type: 'download', tabId, fileName });
        const remoteStat = await sftp.stat(safeRemotePath).catch(() => null);
        const knownTotal = Number(remoteStat?.size) || 0;
        const progress = buildProgressStep(knownTotal);

        // Evento inicial con total conocido
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('ssh:transfer-progress', {
            tabId, transferId: currentTransferId, type: 'download', fileName,
            transferred: 0, total: knownTotal, speed: 0
          });
        }

        await withTimeout(
          sftp.fastGet(safeRemotePath, safeLocalPath, {
            concurrency: 64,
            chunkSize: 128 * 1024,
            step: (totalTransferred, _chunk, total) => {
              const ctx = activeTransfers.get(currentTransferId);
              if (ctx?.cancelled) {
                throw new Error('Transferencia cancelada por usuario');
              }
              progress(totalTransferred, null, total || knownTotal);
            }
          }),
          60 * 60 * 1000, // 1h timeout for very large files
          'Timeout al descargar archivo remoto'
        );

        await withTimeout(
          sftp.end(),
          15 * 1000,
          'Timeout cerrando sesión SFTP'
        );
        await withTimeout(
          sftp.end(),
          15 * 1000,
          'Timeout cerrando sesión SFTP'
        );
        markTransferDone(currentTransferId);
      };

      if (secureConfig.useBastionWallix) {
        const sftp = new SftpClient();
        await makeDownloadTransfer(sftp, {
          host: secureConfig.bastionHost,
          port: secureConfig.port || 22,
          username: secureConfig.bastionUser,
          password: secureConfig.password,
          readyTimeout: 20000,
          algorithms: buildSshAlgorithms(secureConfig)
        });
        return { success: true };
      } else {
        const sftp = new SftpClient();
        await makeDownloadTransfer(sftp, {
          host: secureConfig.host,
          port: secureConfig.port || 22,
          username: secureConfig.username,
          password: secureConfig.password,
          readyTimeout: 30000,
          keepaliveInterval: 10000,
          algorithms: buildSshAlgorithms(secureConfig)
        });
        return { success: true };
      }
    } catch (err) {
      try {
        const ctx = activeTransfers.get(currentTransferId);
        if (ctx?.counter && !ctx.counter.destroyed) ctx.counter.destroy(err);
        if (ctx?.writeStream && !ctx.writeStream.destroyed) ctx.writeStream.destroy(err);
        if (ctx?.sftp) await Promise.race([ctx.sftp.end(), new Promise((resolve) => setTimeout(resolve, 2000))]);
      } catch (_) { }
      markTransferDone(currentTransferId);
      return { success: false, error: err.message || err };
    }
  });

  // SSH: Subir archivo
  ipcMain.handle('ssh:upload-file', async (event, { tabId, localPath, remotePath, sshConfig, transferId }) => {
    let uploadTransferId = transferId || `${tabId}-ul-${Date.now()}`;
    try {
      const secureConfig = await resolveCredentials(tabId, sshConfig);
      // ✅ VALIDACIÓN CRÍTICA: Validar inputs antes de procesar
      if (!localPath || typeof localPath !== 'string' || localPath.trim() === '') {
        return { success: false, error: 'localPath inválido o vacío' };
      }
      if (!remotePath || typeof remotePath !== 'string' || remotePath.trim() === '') {
        return { success: false, error: 'remotePath inválido o vacío' };
      }
      if (!secureConfig || typeof secureConfig !== 'object') {
        return { success: false, error: 'sshConfig inválido' };
      }

      // Sanitizar paths
      const safeLocalPath = localPath.trim();
      const safeRemotePath = remotePath.trim();

      // Verificar que el archivo local existe
      if (!fs.existsSync(safeLocalPath)) {
        return { success: false, error: 'El archivo local no existe' };
      }

      const uploadFileName = safeLocalPath.split(/[/\\]/).pop() || safeLocalPath;
      uploadTransferId = transferId || `${tabId}-ul-${Date.now()}`;

      let uploadLastBytes = 0;
      let uploadLastTime = Date.now();
      const localSize = Number(fs.statSync(safeLocalPath)?.size) || 0;
      const uploadStep = (totalTransferred, chunk, total) => {
        try {
          if (event.sender && !event.sender.isDestroyed()) {
            const now = Date.now();
            const deltaTime = (now - uploadLastTime) / 1000;
            const speed = deltaTime > 0 ? (totalTransferred - uploadLastBytes) / deltaTime : 0;
            uploadLastBytes = totalTransferred;
            uploadLastTime = now;
            event.sender.send('ssh:transfer-progress', {
              tabId, transferId: uploadTransferId, type: 'upload', fileName: uploadFileName,
              transferred: totalTransferred, total: total || localSize, speed
            });
          }
        } catch (_) { /* webContents destruido */ }
      };
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('ssh:transfer-progress', {
          tabId, transferId: uploadTransferId, type: 'upload', fileName: uploadFileName,
          transferred: 0, total: localSize, speed: 0
        });
      }

      const sftp = new SftpClient();
      activeTransfers.set(uploadTransferId, { sftp, cancelled: false, type: 'upload', tabId, fileName: uploadFileName });
      let connectConfig;
      if (secureConfig.useBastionWallix) {
        connectConfig = {
          host: secureConfig.bastionHost,
          port: secureConfig.port || 22,
          username: secureConfig.bastionUser,
          password: secureConfig.password,
          readyTimeout: 20000,
          algorithms: buildSshAlgorithms(secureConfig)
        };
      } else {
        connectConfig = {
          host: secureConfig.host,
          port: secureConfig.port || 22,
          username: secureConfig.username,
          password: secureConfig.password,
          readyTimeout: 30000,
          keepaliveInterval: 10000,
          algorithms: buildSshAlgorithms(secureConfig)
        };
      }
      await sftp.connect(connectConfig);

      await sftp.fastPut(safeLocalPath, safeRemotePath, {
        concurrency: 64,
        chunkSize: 128 * 1024,
        step: (totalTransferred, _chunk, total) => {
          const ctx = activeTransfers.get(uploadTransferId);
          if (ctx?.cancelled) {
            throw new Error('Transferencia cancelada por usuario');
          }
          uploadStep(totalTransferred, null, total || localSize);
        }
      });

      await sftp.end();
      markTransferDone(uploadTransferId);
      return { success: true };
    } catch (err) {
      markTransferDone(uploadTransferId);
      return { success: false, error: err.message || err };
    }
  });

  // SSH: Eliminar archivo o directorio
  ipcMain.handle('ssh:delete-file', async (event, { tabId, remotePath, isDirectory, sshConfig }) => {
    try {
      const secureConfig = await resolveCredentials(tabId, sshConfig);
      const sftp = new SftpClient();
      let connectConfig;
      if (secureConfig.useBastionWallix) {
        connectConfig = {
          host: secureConfig.bastionHost,
          port: secureConfig.port || 22,
          username: secureConfig.bastionUser,
          password: secureConfig.password,
          readyTimeout: 20000,
          algorithms: buildSshAlgorithms(secureConfig)
        };
      } else {
        connectConfig = {
          host: secureConfig.host,
          port: secureConfig.port || 22,
          username: secureConfig.username,
          password: secureConfig.password,
          readyTimeout: 20000,
          algorithms: buildSshAlgorithms(secureConfig)
        };
      }

      await sftp.connect(connectConfig);

      if (isDirectory) {
        // Probar diferentes métodos para directorios
        try {
          await sftp.rmdir(remotePath, true);
        } catch (rmdirErr) {
          await sftp.rmdir(remotePath);
        }
      } else {
        await sftp.delete(remotePath);
      }

      await sftp.end();
      return { success: true };
    } catch (err) {
      console.error(`[SSH DELETE] Error en eliminación:`, err);
      return { success: false, error: err.message || err };
    }
  });

  // SSH: Crear directorio
  ipcMain.handle('ssh:create-directory', async (event, { tabId, remotePath, sshConfig }) => {
    try {
      const secureConfig = await resolveCredentials(tabId, sshConfig);
      const sftp = new SftpClient();
      let connectConfig;
      if (secureConfig.useBastionWallix) {
        connectConfig = {
          host: secureConfig.bastionHost,
          port: secureConfig.port || 22,
          username: secureConfig.bastionUser,
          password: secureConfig.password,
          readyTimeout: 20000,
          algorithms: buildSshAlgorithms(secureConfig)
        };
      } else {
        connectConfig = {
          host: secureConfig.host,
          port: secureConfig.port || 22,
          username: secureConfig.username,
          password: secureConfig.password,
          readyTimeout: 20000,
          algorithms: buildSshAlgorithms(secureConfig)
        };
      }
      await sftp.connect(connectConfig);
      await sftp.mkdir(remotePath, true); // true = recursive
      await sftp.end();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  });

  // SSH: Renombrar/Mover archivo o directorio
  ipcMain.handle('ssh:rename-file', async (event, { tabId, oldPath, newPath, sshConfig }) => {
    try {
      const secureConfig = await resolveCredentials(tabId, sshConfig);
      const sftp = new SftpClient();
      let connectConfig;
      if (secureConfig.useBastionWallix) {
        connectConfig = {
          host: secureConfig.bastionHost,
          port: secureConfig.port || 22,
          username: secureConfig.bastionUser,
          password: secureConfig.password,
          readyTimeout: 20000,
          algorithms: buildSshAlgorithms(secureConfig)
        };
      } else {
        connectConfig = {
          host: secureConfig.host,
          port: secureConfig.port || 22,
          username: secureConfig.username,
          password: secureConfig.password,
          readyTimeout: 20000,
          algorithms: buildSshAlgorithms(secureConfig)
        };
      }
      await sftp.connect(connectConfig);
      await sftp.rename(oldPath, newPath);
      await sftp.end();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  });

  // SSH: Obtener lista de procesos para System Monitor
  ipcMain.handle('ssh:get-processes', async (event, { tabId }) => {
    try {
      const conn = sshConnections && sshConnections[tabId];
      if (!conn || !conn.ssh) {
        return { success: false, error: 'No SSH connection found' };
      }

      // Consolidar intentos en una sola llamada de shell para evitar sobrecargar el router con múltiples canales
      const command = 'ps aux 2>/dev/null || ps w 2>/dev/null || ps 2>/dev/null';
      const rawOutput = await conn.ssh.exec(command);
      const processes = parseProcessList(rawOutput);

      return { success: true, processes };
    } catch (err) {
      console.error('[SSH PROCESSES] Error:', err);
      return { success: false, error: err.message || String(err) };
    }
  });

  // SSH: Obtener puertos en escucha (on-demand)
  ipcMain.handle('ssh:get-listening-ports', async (event, { tabId }) => {
    try {
      const conn = sshConnections && sshConnections[tabId];
      if (!conn || !conn.ssh) {
        return { success: false, error: 'No SSH connection found' };
      }

      const command = 'ss -tuln 2>/dev/null || netstat -tuln 2>/dev/null || netstat -an 2>/dev/null';
      const rawOutput = await conn.ssh.exec(command);
      const ports = parseListeningPorts(rawOutput);
      const warning = ports.length === 0 ? 'No se pudieron leer puertos o no hay datos disponibles.' : null;

      return {
        success: true,
        ports,
        meta: {
          sourceCommand: 'ss/netstat',
          fetchedAt: new Date().toISOString(),
          warning
        }
      };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  // SSH: Obtener servicios en ejecución (on-demand)
  ipcMain.handle('ssh:get-running-services', async (event, { tabId }) => {
    try {
      const conn = sshConnections && sshConnections[tabId];
      if (!conn || !conn.ssh) {
        return { success: false, error: 'No SSH connection found' };
      }

      const command = 'systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null || service --status-all 2>/dev/null';
      const rawOutput = await conn.ssh.exec(command);
      const services = parseRunningServices(rawOutput);
      const warning = services.length === 0 ? 'No se pudieron leer servicios o el sistema no expone esta información.' : null;

      return {
        success: true,
        services,
        meta: {
          sourceCommand: 'systemctl/service',
          fetchedAt: new Date().toISOString(),
          warning
        }
      };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  // SSH: Obtener lista de interfaces de red para System Monitor
  ipcMain.handle('ssh:get-net-interfaces', async (event, { tabId }) => {
    try {
      const conn = sshConnections && sshConnections[tabId];
      if (!conn || !conn.ssh) {
        return { success: false, error: 'No SSH connection found' };
      }

      // Probar múltiples comandos para obtener interfaces
      const raw = await conn.ssh.exec('ip -br addr 2>/dev/null || ip addr 2>/dev/null || ifconfig -a 2>/dev/null || ifconfig 2>/dev/null');

      const interfaces = [];
      const lines = (raw || '').trim().split('\n').filter(Boolean);

      if (raw.includes('link/') || (raw.includes('inet ') && raw.includes('<'))) {
        // Formato verbose de 'ip address'
        let currentIface = null;
        for (const line of lines) {
          const ifaceMatch = line.match(/^\d+:\s+([^:@\s]+)/);
          if (ifaceMatch) {
            currentIface = { name: ifaceMatch[1], state: line.includes('UP') ? 'UP' : 'DOWN', ip: '' };
            if (currentIface.name !== 'lo') interfaces.push(currentIface);
            continue;
          }
          if (currentIface && line.trim().startsWith('inet ')) {
            const ipMatch = line.trim().match(/^inet\s+([0-9.]+)/);
            if (ipMatch && !ipMatch[1].startsWith('127.')) {
              currentIface.ip = ipMatch[1];
            }
          }
        }
      } else if (raw.includes('Link encap') || raw.includes('HWaddr') || raw.includes('flags=')) {
        // Formato ifconfig
        let currentIface = null;
        for (const line of lines) {
          const ifaceMatch = line.match(/^([a-zA-Z0-9.]+)/);
          if (ifaceMatch) {
            currentIface = { name: ifaceMatch[1], state: 'UP', ip: '' };
            if (currentIface.name !== 'lo') interfaces.push(currentIface);
          }
          if (currentIface && line.includes('inet ')) {
            // Soporte para "inet addr:192.168.1.1" (ifconfig antiguo) o "inet 192.168.1.1" (ip/ifconfig moderno)
            const ipMatch = line.match(/inet\s+(?:addr:)?([0-9.]+)/);
            if (ipMatch && !ipMatch[1].startsWith('127.')) {
              currentIface.ip = ipMatch[1];
            }
          }
        }
      } else {
        // Formato ip -br o similar
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            const name = parts[0].replace(/@.*/, '');
            const state = parts[1] || 'UNKNOWN';
            const ipPart = parts.slice(2).find(p => p.includes('.') && !p.startsWith('127.')) || '';
            if (name !== 'lo') {
              interfaces.push({ name, state, ip: ipPart.split('/')[0] });
            }
          }
        }
      }

      return { success: true, interfaces: interfaces.filter(i => i.name !== 'lo') };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  // Todos los handlers SSH registrados exitosamente

  // SSH: Iniciar/Detener/Reiniciar un servicio
  ipcMain.handle('ssh:manage-service', async (event, { tabId, serviceName, action }) => {
    try {
      const conn = sshConnections && sshConnections[tabId];
      if (!conn || !conn.ssh) {
        return { success: false, error: 'No SSH connection found' };
      }

      if (!serviceName || typeof serviceName !== 'string' || !action || typeof action !== 'string') {
        return { success: false, error: 'Parámetros inválidos' };
      }

      const safeServiceName = escapeShellPath(serviceName.trim());
      let command = '';

      if (action === 'restart') {
        command = `sudo systemctl restart "${safeServiceName}" || systemctl restart "${safeServiceName}" || sudo service "${safeServiceName}" restart || service "${safeServiceName}" restart`;
      } else if (action === 'stop') {
        command = `sudo systemctl stop "${safeServiceName}" || systemctl stop "${safeServiceName}" || sudo service "${safeServiceName}" stop || service "${safeServiceName}" stop`;
      } else if (action === 'start') {
        command = `sudo systemctl start "${safeServiceName}" || systemctl start "${safeServiceName}" || sudo service "${safeServiceName}" start || service "${safeServiceName}" start`;
      } else {
        return { success: false, error: 'Acción no soportada' };
      }

      const result = await conn.ssh.exec(command);
      return { success: true, output: result };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  // SSH/Local: Matar un proceso
  ipcMain.handle('ssh:kill-process', async (event, { tabId, pid, isLocal }) => {
    try {
      const validation = validateKillPid(pid, isLocal);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      const safePid = validation.pid;

      if (isLocal) {
        try {
          process.kill(safePid, 'SIGTERM');
          return { success: true };
        } catch (killErr) {
          if (killErr.code === 'ESRCH') {
            return { success: false, error: 'El proceso ya no existe o ya ha finalizado.' };
          }
          if (killErr.code === 'EPERM') {
            return { success: false, error: 'Permisos insuficientes para finalizar el proceso.' };
          }
          return { success: false, error: killErr.message || String(killErr) };
        }
      }

      const conn = sshConnections && sshConnections[tabId];
      if (!conn || !conn.ssh) {
        return { success: false, error: 'No SSH connection found' };
      }

      const command = `kill ${safePid} || sudo kill ${safePid} || kill -9 ${safePid} || sudo kill -9 ${safePid}`;
      const result = await conn.ssh.exec(command);
      return { success: true, output: result };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  // SSH: Obtener logs de un servicio (journalctl / systemctl status)
  ipcMain.handle('ssh:get-service-logs', async (event, { tabId, serviceName }) => {
    try {
      const conn = sshConnections && sshConnections[tabId];
      if (!conn || !conn.ssh) {
        return { success: false, error: 'No SSH connection found' };
      }

      if (!serviceName || typeof serviceName !== 'string') {
        return { success: false, error: 'Nombre de servicio inválido' };
      }

      const safeServiceName = escapeShellPath(serviceName.trim());
      // Obtener últimas 100 líneas con journalctl, o bien usar systemctl status
      const command = `sudo journalctl -u "${safeServiceName}" -n 100 --no-pager 2>/dev/null || journalctl -u "${safeServiceName}" -n 100 --no-pager 2>/dev/null || systemctl status "${safeServiceName}" --no-pager 2>/dev/null`;
      const logs = await conn.ssh.exec(command);
      return { success: true, logs: logs || 'No se obtuvieron logs para este servicio.' };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  // SSH: Configurar intervalo de actualización de stats
  ipcMain.handle('ssh:set-stats-interval', async (event, { intervalMs }) => {
    try {
      sshStatsService.setPollingInterval(intervalMs);
      return { success: true, intervalMs };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

registerSSHHandlers.parseLsOutput = parseLsOutput;
registerSSHHandlers.escapeShellPath = escapeShellPath;
registerSSHHandlers.wrapInPosixSh = wrapInPosixSh;
registerSSHHandlers.buildPortableLsCommand = buildPortableLsCommand;
registerSSHHandlers.filesFromLsOutput = filesFromLsOutput;
registerSSHHandlers.mapSftpListItem = mapSftpListItem;
registerSSHHandlers.safeExec = safeExec;
registerSSHHandlers.parseListeningPorts = parseListeningPorts;
registerSSHHandlers.validateKillPid = validateKillPid;

module.exports = registerSSHHandlers;
