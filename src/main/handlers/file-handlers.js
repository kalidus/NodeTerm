/**
 * Manejadores IPC para funcionalidades de archivos (SFTP/FTP/SCP)
 */

const { ipcMain } = require('electron');
const SftpClient = require('ssh2-sftp-client');
const { Client: FTPClient } = require('basic-ftp');
const fs = require('fs');
const path = require('path');

/**
 * Valida y sanitiza paths remotos para prevenir path traversal
 * @param {string} userPath - Path proporcionado por el usuario
 * @param {string} basePath - Path base permitido (opcional, por defecto '/')
 * @returns {string} - Path sanitizado o null si es inválido
 */
function sanitizeRemotePath(userPath, basePath = '/') {
  if (!userPath || typeof userPath !== 'string') {
    return basePath;
  }
  
  // Normalizar el path: eliminar espacios, normalizar separadores
  let normalized = userPath.trim().replace(/\\/g, '/');
  
  // Detectar intentos de path traversal
  if (normalized.includes('../') || normalized.includes('..\\') || normalized.startsWith('..')) {
    console.warn(`[SECURITY] Path traversal detectado y bloqueado: ${userPath}`);
    return basePath;
  }
  
  // Detectar rutas absolutas sospechosas (permitir / pero no // o más)
  if (normalized.startsWith('//')) {
    console.warn(`[SECURITY] Ruta absoluta sospechosa bloqueada: ${userPath}`);
    return basePath;
  }
  
  // Si el path está vacío o solo tiene espacios, usar basePath
  if (!normalized || normalized === '') {
    return basePath;
  }
  
  // Asegurar que empiece con /
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  
  // Normalizar múltiples slashes
  normalized = normalized.replace(/\/+/g, '/');
  
  return normalized;
}

/**
 * Convierte información de archivo de SFTP a formato estándar
 */
function formatSftpFile(item) {
  return {
    name: item.name,
    permissions: item.longname?.split(' ')[0] || '',
    owner: item.longname?.split(' ')[2] || '',
    group: item.longname?.split(' ')[3] || '',
    size: item.size || 0,
    modified: item.modifyTime ? new Date(item.modifyTime * 1000).toLocaleString() : '',
    type: item.type === 'd' ? 'directory' : (item.type === 'l' ? 'symlink' : 'file'),
  };
}

/**
 * Convierte información de archivo de FTP a formato estándar
 */
function formatFtpFile(item) {
  return {
    name: item.name,
    permissions: item.permissions || '',
    owner: item.user || '',
    group: item.group || '',
    size: item.size || 0,
    modified: item.date ? item.date.toLocaleString() : '',
    type: item.type === 2 ? 'directory' : 'file', // 2 = directory en basic-ftp
  };
}

/**
 * Obtiene el directorio home según el protocolo
 */
async function getHomeDirectory(config) {
  const { protocol, host, port, username, password, useBastionWallix, bastionHost, bastionUser } = config;

  if (protocol === 'sftp' || protocol === 'scp') {
    const sftp = new SftpClient();
    try {
      let connectConfig;
      if (useBastionWallix) {
        connectConfig = {
          host: bastionHost,
          port: port || 22,
          username: bastionUser,
          password: password,
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
          host: host,
          port: port || 22,
          username: username,
          password: password,
          readyTimeout: 20000,
        };
      }
      await sftp.connect(connectConfig);
      const home = await sftp.realPath('.');
      await sftp.end();
      return { success: true, home };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  } else if (protocol === 'ftp') {
    const client = new FTPClient();
    try {
      await client.access({
        host: host,
        port: port || 21,
        user: username,
        password: password,
        secure: false, // FTP sin SSL por defecto
      });
      const pwd = await client.pwd();
      await client.close();
      return { success: true, home: pwd || '/' };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  }
  return { success: false, error: 'Protocolo no soportado' };
}

/**
 * Lista archivos según el protocolo
 */
async function listFiles(config, filePath) {
  const { protocol, host, port, username, password, useBastionWallix, bastionHost, bastionUser } = config;
  // ✅ SEGURIDAD: Sanitizar path para prevenir path traversal
  const safePath = sanitizeRemotePath(filePath, '/');

  if (protocol === 'sftp' || protocol === 'scp') {
    const sftp = new SftpClient();
    try {
      let connectConfig;
      if (useBastionWallix) {
        connectConfig = {
          host: bastionHost,
          port: port || 22,
          username: bastionUser,
          password: password,
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
          host: host,
          port: port || 22,
          username: username,
          password: password,
          readyTimeout: 20000,
        };
      }
      await sftp.connect(connectConfig);
      const list = await sftp.list(safePath);
      await sftp.end();
      const files = list.map(formatSftpFile);
      return { success: true, files };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  } else if (protocol === 'ftp') {
    const client = new FTPClient();
    try {
      await client.access({
        host: host,
        port: port || 21,
        user: username,
        password: password,
        secure: false,
      });
      const list = await client.list(safePath);
      await client.close();
      const files = list.map(formatFtpFile);
      return { success: true, files };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  }
  return { success: false, error: 'Protocolo no soportado' };
}

/**
 * Verifica si un directorio existe
 */
async function checkDirectory(config, dirPath) {
  const { protocol, host, port, username, password, useBastionWallix, bastionHost, bastionUser } = config;
  // ✅ SEGURIDAD: Sanitizar path para prevenir path traversal
  const safeDirPath = sanitizeRemotePath(dirPath, '/');

  if (protocol === 'sftp' || protocol === 'scp') {
    const sftp = new SftpClient();
    try {
      let connectConfig;
      if (useBastionWallix) {
        connectConfig = {
          host: bastionHost,
          port: port || 22,
          username: bastionUser,
          password: password,
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
          host: host,
          port: port || 22,
          username: username,
          password: password,
          readyTimeout: 20000,
        };
      }
      await sftp.connect(connectConfig);
      const stats = await sftp.stat(safeDirPath);
      await sftp.end();
      return { success: true, exists: stats.isDirectory };
    } catch (err) {
      return { success: true, exists: false };
    }
  } else if (protocol === 'ftp') {
    const client = new FTPClient();
    try {
      await client.access({
        host: host,
        port: port || 21,
        user: username,
        password: password,
        secure: false,
      });
      await client.cd(safeDirPath);
      await client.close();
      return { success: true, exists: true };
    } catch (err) {
      return { success: true, exists: false };
    }
  }
  return { success: false, error: 'Protocolo no soportado' };
}

/**
 * Descarga un archivo
 */
async function downloadFile(config, remotePath, localPath) {
  const { protocol, host, port, username, password, useBastionWallix, bastionHost, bastionUser } = config;

  if (!remotePath || typeof remotePath !== 'string' || remotePath.trim() === '') {
    return { success: false, error: 'remotePath inválido o vacío' };
  }
  if (!localPath || typeof localPath !== 'string' || localPath.trim() === '') {
    return { success: false, error: 'localPath inválido o vacío' };
  }

  // ✅ SEGURIDAD: Sanitizar paths para prevenir path traversal
  const safeRemotePath = sanitizeRemotePath(remotePath, '/');
  const safeLocalPath = localPath.trim();

  // Crear directorio local si no existe
  const localDir = path.dirname(safeLocalPath);
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  if (protocol === 'sftp' || protocol === 'scp') {
    const sftp = new SftpClient();
    try {
      let connectConfig;
      if (useBastionWallix) {
        connectConfig = {
          host: bastionHost,
          port: port || 22,
          username: bastionUser,
          password: password,
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
          host: host,
          port: port || 22,
          username: username,
          password: password,
          readyTimeout: 20000,
        };
      }
      await sftp.connect(connectConfig);
      await sftp.fastGet(safeRemotePath, safeLocalPath);
      await sftp.end();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  } else if (protocol === 'ftp') {
    const client = new FTPClient();
    try {
      await client.access({
        host: host,
        port: port || 21,
        user: username,
        password: password,
        secure: false,
      });
      await client.downloadTo(safeLocalPath, safeRemotePath);
      await client.close();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  }
  return { success: false, error: 'Protocolo no soportado' };
}

/**
 * Sube un archivo
 */
async function uploadFile(config, localPath, remotePath) {
  const { protocol, host, port, username, password, useBastionWallix, bastionHost, bastionUser } = config;

  if (!localPath || typeof localPath !== 'string' || localPath.trim() === '') {
    return { success: false, error: 'localPath inválido o vacío' };
  }
  if (!remotePath || typeof remotePath !== 'string' || remotePath.trim() === '') {
    return { success: false, error: 'remotePath inválido o vacío' };
  }

  const safeLocalPath = localPath.trim();
  // ✅ SEGURIDAD: Sanitizar path remoto para prevenir path traversal
  const safeRemotePath = sanitizeRemotePath(remotePath, '/');

  if (!fs.existsSync(safeLocalPath)) {
    return { success: false, error: 'El archivo local no existe' };
  }

  if (protocol === 'sftp' || protocol === 'scp') {
    const sftp = new SftpClient();
    try {
      let connectConfig;
      if (useBastionWallix) {
        connectConfig = {
          host: bastionHost,
          port: port || 22,
          username: bastionUser,
          password: password,
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
          host: host,
          port: port || 22,
          username: username,
          password: password,
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
  } else if (protocol === 'ftp') {
    const client = new FTPClient();
    try {
      await client.access({
        host: host,
        port: port || 21,
        user: username,
        password: password,
        secure: false,
      });
      await client.uploadFrom(safeLocalPath, safeRemotePath);
      await client.close();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  }
  return { success: false, error: 'Protocolo no soportado' };
}

/**
 * Elimina un archivo o directorio
 */
async function deleteFile(config, remotePath, isDirectory) {
  const { protocol, host, port, username, password, useBastionWallix, bastionHost, bastionUser } = config;
  // ✅ SEGURIDAD: Sanitizar path para prevenir path traversal
  const safeRemotePath = sanitizeRemotePath(remotePath, '/');

  if (protocol === 'sftp' || protocol === 'scp') {
    const sftp = new SftpClient();
    try {
      let connectConfig;
      if (useBastionWallix) {
        connectConfig = {
          host: bastionHost,
          port: port || 22,
          username: bastionUser,
          password: password,
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
          host: host,
          port: port || 22,
          username: username,
          password: password,
          readyTimeout: 20000,
        };
      }
      await sftp.connect(connectConfig);
      if (isDirectory) {
        try {
          await sftp.rmdir(safeRemotePath, true);
        } catch (rmdirErr) {
          await sftp.rmdir(safeRemotePath);
        }
      } else {
        await sftp.delete(safeRemotePath);
      }
      await sftp.end();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  } else if (protocol === 'ftp') {
    const client = new FTPClient();
    try {
      await client.access({
        host: host,
        port: port || 21,
        user: username,
        password: password,
        secure: false,
      });
      if (isDirectory) {
        await client.removeDir(safeRemotePath);
      } else {
        await client.remove(safeRemotePath);
      }
      await client.close();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  }
  return { success: false, error: 'Protocolo no soportado' };
}

/**
 * Crea un directorio
 */
async function createDirectory(config, remotePath) {
  const { protocol, host, port, username, password, useBastionWallix, bastionHost, bastionUser } = config;
  // ✅ SEGURIDAD: Sanitizar path para prevenir path traversal
  const safeRemotePath = sanitizeRemotePath(remotePath, '/');

  if (protocol === 'sftp' || protocol === 'scp') {
    const sftp = new SftpClient();
    try {
      let connectConfig;
      if (useBastionWallix) {
        connectConfig = {
          host: bastionHost,
          port: port || 22,
          username: bastionUser,
          password: password,
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
          host: host,
          port: port || 22,
          username: username,
          password: password,
          readyTimeout: 20000,
        };
      }
      await sftp.connect(connectConfig);
      await sftp.mkdir(safeRemotePath, true); // true = recursive
      await sftp.end();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  } else if (protocol === 'ftp') {
    const client = new FTPClient();
    try {
      await client.access({
        host: host,
        port: port || 21,
        user: username,
        password: password,
        secure: false,
      });
      await client.ensureDir(safeRemotePath);
      await client.close();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  }
  return { success: false, error: 'Protocolo no soportado' };
}

/**
 * Renombra/Mueve un archivo o directorio
 */
async function renameFile(config, oldPath, newPath) {
  const { protocol, host, port, username, password, useBastionWallix, bastionHost, bastionUser } = config;
  // ✅ SEGURIDAD: Sanitizar paths para prevenir path traversal
  const safeOldPath = sanitizeRemotePath(oldPath, '/');
  const safeNewPath = sanitizeRemotePath(newPath, '/');

  if (protocol === 'sftp' || protocol === 'scp') {
    const sftp = new SftpClient();
    try {
      let connectConfig;
      if (useBastionWallix) {
        connectConfig = {
          host: bastionHost,
          port: port || 22,
          username: bastionUser,
          password: password,
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
          host: host,
          port: port || 22,
          username: username,
          password: password,
          readyTimeout: 20000,
        };
      }
      await sftp.connect(connectConfig);
      await sftp.rename(safeOldPath, safeNewPath);
      await sftp.end();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  } else if (protocol === 'ftp') {
    const client = new FTPClient();
    try {
      await client.access({
        host: host,
        port: port || 21,
        user: username,
        password: password,
        secure: false,
      });
      await client.rename(safeOldPath, safeNewPath);
      await client.close();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  }
  return { success: false, error: 'Protocolo no soportado' };
}

/**
 * Registra todos los manejadores IPC relacionados con archivos (SFTP/FTP/SCP)
 */
function registerFileHandlers() {
  // Obtener directorio home
  ipcMain.handle('file:get-home-directory', async (event, { tabId, config }) => {
    return await getHomeDirectory(config);
  });

  // Listar archivos
  ipcMain.handle('file:list-files', async (event, { tabId, path, config }) => {
    return await listFiles(config, path);
  });

  // Verificar directorio
  ipcMain.handle('file:check-directory', async (event, { tabId, path, config }) => {
    return await checkDirectory(config, path);
  });

  // Descargar archivo
  ipcMain.handle('file:download-file', async (event, { tabId, remotePath, localPath, config }) => {
    return await downloadFile(config, remotePath, localPath);
  });

  // Subir archivo
  ipcMain.handle('file:upload-file', async (event, { tabId, localPath, remotePath, config }) => {
    return await uploadFile(config, localPath, remotePath);
  });

  // Eliminar archivo/directorio
  ipcMain.handle('file:delete-file', async (event, { tabId, remotePath, isDirectory, config }) => {
    return await deleteFile(config, remotePath, isDirectory);
  });

  // Crear directorio
  ipcMain.handle('file:create-directory', async (event, { tabId, remotePath, config }) => {
    return await createDirectory(config, remotePath);
  });

  // Renombrar/Mover archivo o directorio
  ipcMain.handle('file:rename-file', async (event, { tabId, oldPath, newPath, config }) => {
    return await renameFile(config, oldPath, newPath);
  });
}

module.exports = {
  registerFileHandlers
};

