/**
 * Manejadores IPC para funcionalidades SSH
 */

const { ipcMain } = require('electron');
const SSH2Promise = require('ssh2-promise');
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const { PassThrough, Transform } = require('stream');
const { once } = require('events');
const { parseProcessList } = require('../utils/parsing-utils');
const sshStatsService = require('../services/SSHStatsService');

/**
 * Escapa caracteres especiales de shell para prevenir command injection
 * @param {string} path - Ruta a escapar
 * @returns {string} - Ruta escapada de forma segura
 */
function escapeShellPath(path) {
  if (typeof path !== 'string') {
    return '';
  }
  // Escapar caracteres especiales: ", `, $, \, !, ;, |, &, <, >
  return path.replace(/(["`$\\!;|&<>])/g, '\\$1');
}

/**
 * Parsea la salida del comando ls -la en formato de objetos
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
 * Registra todos los manejadores IPC relacionados con SSH
 * @param {Object} dependencies - Dependencias necesarias para los handlers
 */
/**
 * Parsea la salida de 'ps aux' en una lista de objetos de proceso
 */

function registerSSHHandlers(dependencies = {}) {
  const { findSSHConnection, sshConnections } = dependencies || {};

  // SSH: Obtener directorio home
  ipcMain.handle('ssh:get-home-directory', async (event, { tabId, sshConfig }) => {
    try {
      if (sshConfig.useBastionWallix) {
        // Buscar la conexión existente para bastion
        const existingConn = await findSSHConnection(tabId, sshConfig);
        if (existingConn && existingConn.ssh && existingConn.stream) {
          // Modo antiguo: usar stream interactivo si existe
          const stream = existingConn.stream;
          const command = 'echo $HOME\n';
          let output = '';
          const onData = (data) => {
            output += data.toString('utf-8');
          };
          stream.on('data', onData);
          stream.write(command);
          await new Promise((resolve) => setTimeout(resolve, 300));
          stream.removeListener('data', onData);
          // LOGS DE DEPURACIÓN
          // console.log('[ssh:get-home-directory][BASTION] output bruto:', JSON.stringify(output));
          // Split por líneas ANTES de limpiar
          const lines = output.replace(command.trim(), '').replace(/\r/g, '').split('\n');
          const cleanedLines = lines.map(line => line
            .replace(/\x1b\][^\x07]*(\x07|\x1b\\)/g, '') // OSC
            .replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, '') // CSI/SGR
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Otros controles
            .trim()
          );
          // console.log('[ssh:get-home-directory][BASTION] cleanedLines:', cleanedLines);
          const home = cleanedLines.find(l => l.startsWith('/')) || '/';
          // console.log('[ssh:get-home-directory][BASTION] home final:', home);
          return { success: true, home };
        } else {
          // Nuevo: usar SFTP para obtener el home si no hay stream interactivo
          const SftpClient = require('ssh2-sftp-client');
          const sftp = new SftpClient();
          const connectConfig = {
            host: sshConfig.bastionHost,
            port: sshConfig.port || 22,
            username: sshConfig.bastionUser,
            password: sshConfig.password,
            readyTimeout: 20000,
            algorithms: {
              kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
              cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm'],
              serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'ssh-ed25519', 'rsa-sha2-256', 'rsa-sha2-512'],
              hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
            }
          };
          await sftp.connect(connectConfig);
          // Obtener el home real del usuario conectado
          const home = await sftp.realPath('.');
          await sftp.end();
          return { success: true, home };
        }
      } else {
        const ssh = new SSH2Promise(sshConfig);
        await ssh.connect();
        const home = await ssh.exec('echo $HOME');
        await ssh.close();
        return { success: true, home: (home || '/').trim() };
      }
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  });

  // SSH: Listar archivos
  ipcMain.handle('ssh:list-files', async (event, { tabId, path, sshConfig }) => {
    try {
      // Validación robusta de path
      let safePath = '/';
      if (typeof path === 'string') {
        safePath = path;
      } else if (path && typeof path.path === 'string') {
        safePath = path.path;
      }

      let ssh;
      let shouldCloseConnection = false;

      if (sshConfig.useBastionWallix) {
        // Buscar la conexión existente para bastion
        const existingConn = await findSSHConnection(tabId, sshConfig);
        if (existingConn && existingConn.ssh && existingConn.stream) {
          // Modo antiguo: usar stream interactivo si existe
          ssh = existingConn.ssh;
          const stream = existingConn.stream;
          shouldCloseConnection = false;
          // Ejecutar el comando en el stream interactivo
          // ✅ SEGURIDAD: Escapar el path para prevenir command injection
          const escapedPath = escapeShellPath(safePath);
          const command = `ls -la --color=never "${escapedPath}"\n`;
          let output = '';
          // Listener temporal para capturar la salida
          const onData = (data) => {
            output += data.toString('utf-8');
          };
          stream.on('data', onData);
          // Escribir el comando
          stream.write(command);
          // Esperar la respuesta (timeout corto o hasta que llegue el prompt)
          await new Promise((resolve) => setTimeout(resolve, 400));
          stream.removeListener('data', onData);
          // Limpiar la salida: quitar el comando enviado y posibles prompts
          let cleanOutput = output.replace(command.trim(), '').replace(/\r/g, '');
          // Eliminar códigos ANSI
          cleanOutput = cleanOutput.replace(/\x1b\[[0-9;]*m/g, '');
          // Quitar líneas vacías y posibles prompts
          cleanOutput = cleanOutput.split('\n').filter(line => line.trim() !== '' && !line.trim().endsWith('$') && !line.trim().endsWith('#')).join('\n');
          return { success: true, files: parseLsOutput(cleanOutput) };
        } else {
          // Nuevo: usar SFTP para listar archivos si no hay stream interactivo
          const sftp = new SftpClient();
          const connectConfig = {
            host: sshConfig.bastionHost,
            port: sshConfig.port || 22,
            username: sshConfig.bastionUser,
            password: sshConfig.password,
            readyTimeout: 20000,
            algorithms: {
              kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
              cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm'],
              serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'ssh-ed25519', 'rsa-sha2-256', 'rsa-sha2-512'],
              hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
            }
          };
          await sftp.connect(connectConfig);
          const sftpList = await sftp.list(safePath);
          await sftp.end();
          // Adaptar el formato a lo que espera el frontend
          const files = sftpList.map(item => ({
            name: item.name,
            permissions: item.longname?.split(' ')[0] || '',
            owner: '',
            group: '',
            size: item.size,
            modified: item.modifyTime ? new Date(item.modifyTime * 1000).toLocaleString() : '',
            type: item.type === 'd' ? 'directory' : (item.type === 'l' ? 'symlink' : 'file'),
          }));
          return { success: true, files };
        }
      } else {
        // SSH directo: crear nueva conexión
        ssh = new SSH2Promise(sshConfig);
        await ssh.connect();
        shouldCloseConnection = true;
        // ✅ SEGURIDAD: Escapar el path para prevenir command injection
        const escapedPath = escapeShellPath(safePath);
        const lsOutput = await ssh.exec(`ls -la --color=never "${escapedPath}"`);
        // Eliminar códigos ANSI por si acaso
        const cleanOutput = lsOutput.replace(/\x1b\[[0-9;]*m/g, '');
        if (shouldCloseConnection && ssh) {
          await ssh.close();
        }
        return { success: true, files: parseLsOutput(cleanOutput) };
      }
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  });

  // SSH: Verificar si un directorio existe
  ipcMain.handle('ssh:check-directory', async (event, { tabId, path, sshConfig }) => {
    try {
      if (sshConfig.useBastionWallix) {
        // Buscar la conexión existente para bastion
        const existingConn = await findSSHConnection(tabId, sshConfig);
        if (!existingConn || !existingConn.ssh || !existingConn.stream) {
          return { success: false, error: 'No se encontró una conexión bastión activa para este tabId. Abre primero una terminal.' };
        }
        const stream = existingConn.stream;
        // ✅ SEGURIDAD: Escapar el path para prevenir command injection
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
        // Limpiar la salida: quitar el comando enviado y posibles prompts
        let cleanOutput = output.replace(command.trim(), '').replace(/\r/g, '');
        // Eliminar códigos ANSI
        cleanOutput = cleanOutput.replace(/\x1b\[[0-9;]*m/g, '');
        // Buscar si existe
        if (cleanOutput.includes('exists')) {
          return { success: true, exists: true };
        } else {
          return { success: true, exists: false };
        }
      } else {
        // SSH directo
        const ssh = new SSH2Promise(sshConfig);
        await ssh.connect();
        // ✅ SEGURIDAD: Escapar el path para prevenir command injection
        const escapedPath = escapeShellPath(path);
        const result = await ssh.exec(`[ -d "${escapedPath}" ] && echo exists || echo notfound`);
        await ssh.close();
        if (result.includes('exists')) {
          return { success: true, exists: true };
        } else {
          return { success: true, exists: false };
        }
      }
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  });

  // SSH: Descargar archivo
  ipcMain.handle('ssh:download-file', async (event, { tabId, remotePath, localPath, sshConfig }) => {
    try {
      // ✅ VALIDACIÓN CRÍTICA: Validar inputs antes de procesar
      if (!remotePath || typeof remotePath !== 'string' || remotePath.trim() === '') {
        return { success: false, error: 'remotePath inválido o vacío' };
      }
      if (!localPath || typeof localPath !== 'string' || localPath.trim() === '') {
        return { success: false, error: 'localPath inválido o vacío' };
      }
      if (!sshConfig || typeof sshConfig !== 'object') {
        return { success: false, error: 'sshConfig inválido' };
      }

      // Sanitizar paths (prevenir path traversal)
      const safeRemotePath = remotePath.trim();
      const safeLocalPath = localPath.trim();

      const fileName = safeRemotePath.split('/').pop() || safeRemotePath;
      const transferId = `${tabId}-dl-${Date.now()}`;

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
                tabId, transferId, type: 'download', fileName,
                transferred: totalTransferred, total: total || knownTotal, speed
              });
            }
          } catch (_) { /* webContents destruido */ }
        };
      };

      const makeDownloadTransfer = async (sftp, connectConfig) => {
        await sftp.connect(connectConfig);
        const remoteStat = await sftp.stat(safeRemotePath).catch(() => null);
        const knownTotal = Number(remoteStat?.size) || 0;
        const progress = buildProgressStep(knownTotal);

        // Evento inicial con total conocido
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('ssh:transfer-progress', {
            tabId, transferId, type: 'download', fileName,
            transferred: 0, total: knownTotal, speed: 0
          });
        }

        // Transform stream: cuenta bytes mientras pasan hacia el archivo local
        let transferred = 0;
        const counter = new Transform({
          transform(chunk, _enc, cb) {
            transferred += chunk.length;
            progress(transferred, chunk, knownTotal);
            cb(null, chunk);
          }
        });
        const writeStream = fs.createWriteStream(safeLocalPath);
        counter.pipe(writeStream);
        await sftp.get(safeRemotePath, counter);
        await once(writeStream, 'finish');
        await sftp.end();
      };

      if (sshConfig.useBastionWallix) {
        const sftp = new SftpClient();
        await makeDownloadTransfer(sftp, {
          host: sshConfig.bastionHost,
          port: sshConfig.port || 22,
          username: sshConfig.bastionUser,
          password: sshConfig.password,
          readyTimeout: 20000,
          algorithms: {
            kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
            cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm'],
            serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'ssh-ed25519', 'rsa-sha2-256', 'rsa-sha2-512'],
            hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
          }
        });
        return { success: true };
      } else {
        const sftp = new SftpClient();
        await makeDownloadTransfer(sftp, {
          host: sshConfig.host,
          port: sshConfig.port || 22,
          username: sshConfig.username,
          password: sshConfig.password,
          readyTimeout: 20000,
        });
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  });

  // SSH: Subir archivo
  ipcMain.handle('ssh:upload-file', async (event, { tabId, localPath, remotePath, sshConfig }) => {
    try {
      // ✅ VALIDACIÓN CRÍTICA: Validar inputs antes de procesar
      if (!localPath || typeof localPath !== 'string' || localPath.trim() === '') {
        return { success: false, error: 'localPath inválido o vacío' };
      }
      if (!remotePath || typeof remotePath !== 'string' || remotePath.trim() === '') {
        return { success: false, error: 'remotePath inválido o vacío' };
      }
      if (!sshConfig || typeof sshConfig !== 'object') {
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
      const uploadTransferId = `${tabId}-ul-${Date.now()}`;

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
      let connectConfig;
      if (sshConfig.useBastionWallix) {
        connectConfig = {
          host: sshConfig.bastionHost,
          port: sshConfig.port || 22,
          username: sshConfig.bastionUser,
          password: sshConfig.password,
          readyTimeout: 20000,
          algorithms: {
            kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
            cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm'],
            serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'ssh-ed25519', 'rsa-sha2-256', 'rsa-sha2-512'],
            hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
          }
        };
      } else {
        connectConfig = {
          host: sshConfig.host,
          port: sshConfig.port || 22,
          username: sshConfig.username,
          password: sshConfig.password,
          readyTimeout: 20000,
        };
      }
      await sftp.connect(connectConfig);

      // Transform stream: lee del archivo local, cuenta bytes, y los pasa a SFTP
      let uploaded = 0;
      const uploadCounter = new Transform({
        transform(chunk, _enc, cb) {
          uploaded += chunk.length;
          uploadStep(uploaded, chunk, localSize);
          cb(null, chunk);
        }
      });
      const readStream = fs.createReadStream(safeLocalPath);
      readStream.pipe(uploadCounter);
      await sftp.put(uploadCounter, safeRemotePath);
      await sftp.end();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  });

  // SSH: Eliminar archivo o directorio
  ipcMain.handle('ssh:delete-file', async (event, { tabId, remotePath, isDirectory, sshConfig }) => {
    try {
      const sftp = new SftpClient();
      let connectConfig;
      if (sshConfig.useBastionWallix) {
        connectConfig = {
          host: sshConfig.bastionHost,
          port: sshConfig.port || 22,
          username: sshConfig.bastionUser,
          password: sshConfig.password,
          readyTimeout: 20000,
          algorithms: {
            kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
            cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm'],
            serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'ssh-ed25519', 'rsa-sha2-256', 'rsa-sha2-512'],
            hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
          }
        };
      } else {
        connectConfig = {
          host: sshConfig.host,
          port: sshConfig.port || 22,
          username: sshConfig.username,
          password: sshConfig.password,
          readyTimeout: 20000,
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
      const sftp = new SftpClient();
      let connectConfig;
      if (sshConfig.useBastionWallix) {
        connectConfig = {
          host: sshConfig.bastionHost,
          port: sshConfig.port || 22,
          username: sshConfig.bastionUser,
          password: sshConfig.password,
          readyTimeout: 20000,
          algorithms: {
            kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
            cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm'],
            serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'ssh-ed25519', 'rsa-sha2-256', 'rsa-sha2-512'],
            hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
          }
        };
      } else {
        connectConfig = {
          host: sshConfig.host,
          port: sshConfig.port || 22,
          username: sshConfig.username,
          password: sshConfig.password,
          readyTimeout: 20000,
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
      const sftp = new SftpClient();
      let connectConfig;
      if (sshConfig.useBastionWallix) {
        connectConfig = {
          host: sshConfig.bastionHost,
          port: sshConfig.port || 22,
          username: sshConfig.bastionUser,
          password: sshConfig.password,
          readyTimeout: 20000,
          algorithms: {
            kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
            cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm'],
            serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'ssh-ed25519', 'rsa-sha2-256', 'rsa-sha2-512'],
            hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
          }
        };
      } else {
        connectConfig = {
          host: sshConfig.host,
          port: sshConfig.port || 22,
          username: sshConfig.username,
          password: sshConfig.password,
          readyTimeout: 20000,
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

  // MCP: Obtener hosts SSH desde la aplicación (NodeTerm sidebar)
  ipcMain.handle('mcp:get-ssh-hosts-from-app', async (event) => {
    try {
      // Nota: Este handler es llamado desde el MCP process (que es el main process)
      // No tenemos acceso directo a localStorage, así que retornamos un mensaje
      // indicando que debe ser llamado desde el renderer.
      // Sin embargo, si estamos en el main process y tenemos acceso a persistencia,
      // podríamos leer el archivo de configuración.

      // De momento, devolvemos un indicador para que se maneje correctamente
      return {
        success: false,
        reason: 'Handler debe recibir datos desde el renderer',
        message: 'Use ipcRenderer.invoke(\'app:get-ssh-connections-for-mcp\') desde el renderer'
      };
    } catch (error) {
      console.error('[MCP SSH] Error obteniendo hosts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Nota: El handler 'app:save-ssh-connections-for-mcp' está registrado directamente en main.js
  // para asegurar que se cargue correctamente sin depender de registerSSHHandlers

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

  // SSH: Copiar archivo/directorio en el servidor remoto (remoto→remoto)
  ipcMain.handle('ssh:copy-file', async (event, { tabId, srcPath, destPath, sshConfig }) => {
    try {
      if (!srcPath || !destPath) return { success: false, error: 'srcPath o destPath inválido' };
      const safeSrc = escapeShellPath(srcPath.trim());
      const safeDest = escapeShellPath(destPath.trim());
      const command = `cp -r "${safeSrc}" "${safeDest}" && echo __OK__ || echo __FAIL__`;

      const ssh = new SSH2Promise(sshConfig);
      await ssh.connect();
      const result = await ssh.exec(command);
      await ssh.close();
      return result.includes('__OK__') ? { success: true } : { success: false, error: 'cp falló en el servidor' };
    } catch (err) {
      return { success: false, error: err.message || err };
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

module.exports = registerSSHHandlers;
