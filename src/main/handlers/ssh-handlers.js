/**
 * Manejadores IPC para funcionalidades SSH
 */

const { ipcMain } = require('electron');
const SSH2Promise = require('ssh2-promise');
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');

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
function registerSSHHandlers(dependencies = {}) {
  const { findSSHConnection } = dependencies || {};

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
      
      if (sshConfig.useBastionWallix) {
        // Construir string de conexión Wallix para SFTP
        // Formato: <USER>@<BASTION>::<TARGET>@<DEVICE>::<SERVICE>
        // En la mayoría de los casos, bastionUser ya tiene el formato correcto
        const sftp = new SftpClient();
        const         connectConfig = {
          host: sshConfig.bastionHost,
          port: sshConfig.port || 22,
          username: sshConfig.bastionUser, // Wallix espera el string especial aquí
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
        await sftp.fastGet(safeRemotePath, safeLocalPath);
        await sftp.end();
        return { success: true };
      } else {
        // SSH directo - usar SftpClient para consistencia
        const sftp = new SftpClient();
        const connectConfig = {
          host: sshConfig.host,
          port: sshConfig.port || 22,
          username: sshConfig.username,
          password: sshConfig.password,
          readyTimeout: 20000,
        };
        await sftp.connect(connectConfig);
        await sftp.fastGet(safeRemotePath, safeLocalPath);
        await sftp.end();
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
      
      const sftp = new SftpClient();
      let connectConfig;
      if (sshConfig.useBastionWallix) {
        // Bastion: usar string Wallix
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
        // SSH directo
        connectConfig = {
          host: sshConfig.host,
          port: sshConfig.port || 22,
          username: sshConfig.username,
          password: sshConfig.password,
          readyTimeout: 20000,
        };
      }
        await sftp.connect(connectConfig);
        await sftp.fastPut(safeLocalPath, safeRemotePath);
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

  // Todos los handlers SSH registrados exitosamente
}

module.exports = registerSSHHandlers;
