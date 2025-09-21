/**
 * SSH Handlers para NodeTerm
 * Maneja todas las operaciones relacionadas con SSH
 */

const { ipcMain } = require('electron');
const SSH2Promise = require('ssh2-promise');
const { NodeSSH } = require('node-ssh');
const SftpClient = require('ssh2-sftp-client');
const { createBastionShell } = require('../../components/bastion-ssh');

class SSHHandlers {
  constructor() {
    this.sshConnections = {};
    this.bastionStatsState = {};
    this.motdCache = {};
    this.sshConnectionPool = {};
    this.connectionThrottle = {
      minInterval: 1000, // 1 segundo mínimo entre intentos
      lastAttempt: new Map()
    };
    this.activeStatsTabId = null;
    this.setupHandlers();
  }

  /**
   * Configura todos los manejadores SSH
   */
  setupHandlers() {
    // Handler para obtener directorio home
    ipcMain.handle('ssh:get-home-directory', async (event, { tabId, sshConfig }) => {
      return await this.getHomeDirectory(tabId, sshConfig);
    });

    // Handler para listar archivos
    ipcMain.handle('ssh:list-files', async (event, { tabId, path, sshConfig }) => {
      return await this.listFiles(tabId, path, sshConfig);
    });

    // Handler para verificar directorio
    ipcMain.handle('ssh:check-directory', async (event, { tabId, path, sshConfig }) => {
      return await this.checkDirectory(tabId, path, sshConfig);
    });

    // Handler para conectar SSH
    ipcMain.on('ssh:connect', async (event, { tabId, config }) => {
      return await this.connectSSH(event, tabId, config);
    });

    // Handler para enviar datos SSH
    ipcMain.on('ssh:data', (event, { tabId, data }) => {
      return this.sendSSHData(event, tabId, data);
    });

    // Handler para redimensionar terminal SSH
    ipcMain.on('ssh:resize', (event, { tabId, rows, cols }) => {
      return this.resizeSSH(event, tabId, rows, cols);
    });

    // Handler para desconectar SSH
    ipcMain.on('ssh:disconnect', (event, tabId) => {
      return this.disconnectSSH(event, tabId);
    });

    // Handler para descargar archivo
    ipcMain.handle('ssh:download-file', async (event, { tabId, remotePath, localPath, sshConfig }) => {
      return await this.downloadFile(event, tabId, remotePath, localPath, sshConfig);
    });

    // Handler para subir archivo
    ipcMain.handle('ssh:upload-file', async (event, { tabId, localPath, remotePath, sshConfig }) => {
      return await this.uploadFile(event, tabId, localPath, remotePath, sshConfig);
    });

    // Handler para eliminar archivo
    ipcMain.handle('ssh:delete-file', async (event, { tabId, remotePath, isDirectory, sshConfig }) => {
      return await this.deleteFile(event, tabId, remotePath, isDirectory, sshConfig);
    });

    // Handler para crear directorio
    ipcMain.handle('ssh:create-directory', async (event, { tabId, remotePath, sshConfig }) => {
      return await this.createDirectory(event, tabId, remotePath, sshConfig);
    });

    // Handler para establecer pestaña activa de estadísticas
    ipcMain.on('ssh:set-active-stats-tab', (event, tabId) => {
      return this.setActiveStatsTab(event, tabId);
    });
  }

  /**
   * Obtiene el directorio home del usuario SSH
   */
  async getHomeDirectory(tabId, sshConfig) {
    try {
      if (sshConfig.useBastionWallix) {
        // Buscar la conexión existente para bastion
        const existingConn = await this.findSSHConnection(tabId, sshConfig);
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
          
          // Limpiar output y obtener home
          const lines = output.replace(command.trim(), '').replace(/\r/g, '').split('\n');
          const cleanedLines = lines.map(line => line
            .replace(/\x1b\][^\x07]*(\x07|\x1b\\)/g, '') // OSC
            .replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, '') // CSI/SGR
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Otros controles
            .trim()
          );
          const home = cleanedLines.find(l => l.startsWith('/')) || '/';
          return { success: true, home };
        } else {
          // Nuevo: usar SFTP para obtener el home si no hay stream interactivo
          const sftp = new SftpClient();
          const connectConfig = {
            host: sshConfig.bastionHost,
            port: sshConfig.port || 22,
            username: sshConfig.bastionUser,
            password: sshConfig.password,
            readyTimeout: 20000,
          };
          await sftp.connect(connectConfig);
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
  }

  /**
   * Lista archivos en el directorio remoto
   */
  async listFiles(tabId, path, sshConfig) {
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
        const existingConn = await this.findSSHConnection(tabId, sshConfig);
        if (existingConn && existingConn.ssh && existingConn.stream) {
          // Modo antiguo: usar stream interactivo si existe
          ssh = existingConn.ssh;
          const stream = existingConn.stream;
          shouldCloseConnection = false;
          // Ejecutar el comando en el stream interactivo
          const command = `ls -la --color=never "${safePath}"\n`;
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
          return { success: true, files: this.parseLsOutput(cleanOutput) };
        } else {
          // Nuevo: usar SFTP para listar archivos si no hay stream interactivo
          const sftp = new SftpClient();
          const connectConfig = {
            host: sshConfig.bastionHost,
            port: sshConfig.port || 22,
            username: sshConfig.bastionUser,
            password: sshConfig.password,
            readyTimeout: 20000,
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
        const lsOutput = await ssh.exec(`ls -la --color=never "${safePath}"`);
        // Eliminar códigos ANSI por si acaso
        const cleanOutput = lsOutput.replace(/\x1b\[[0-9;]*m/g, '');
        if (shouldCloseConnection && ssh) {
          await ssh.close();
        }
        return { success: true, files: this.parseLsOutput(cleanOutput) };
      }
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  }

  /**
   * Verifica si un directorio existe
   */
  async checkDirectory(tabId, path, sshConfig) {
    // Implementación pendiente - se moverá desde main.js
    return { success: false, error: 'Not implemented yet' };
  }

  /**
   * Conecta a un servidor SSH
   */
  async connectSSH(event, tabId, config) {
    // Implementación pendiente - se moverá desde main.js
    console.log('SSH Connect - Not implemented yet');
  }

  /**
   * Envía datos a la conexión SSH
   */
  sendSSHData(event, tabId, data) {
    // Implementación pendiente - se moverá desde main.js
    console.log('SSH Data - Not implemented yet');
  }

  /**
   * Redimensiona el terminal SSH
   */
  resizeSSH(event, tabId, rows, cols) {
    // Implementación pendiente - se moverá desde main.js
    console.log('SSH Resize - Not implemented yet');
  }

  /**
   * Desconecta la conexión SSH
   */
  disconnectSSH(event, tabId) {
    // Implementación pendiente - se moverá desde main.js
    console.log('SSH Disconnect - Not implemented yet');
  }

  /**
   * Descarga un archivo del servidor SSH
   */
  async downloadFile(event, tabId, remotePath, localPath, sshConfig) {
    // Implementación pendiente - se moverá desde main.js
    return { success: false, error: 'Not implemented yet' };
  }

  /**
   * Sube un archivo al servidor SSH
   */
  async uploadFile(event, tabId, localPath, remotePath, sshConfig) {
    // Implementación pendiente - se moverá desde main.js
    return { success: false, error: 'Not implemented yet' };
  }

  /**
   * Elimina un archivo o directorio del servidor SSH
   */
  async deleteFile(event, tabId, remotePath, isDirectory, sshConfig) {
    // Implementación pendiente - se moverá desde main.js
    return { success: false, error: 'Not implemented yet' };
  }

  /**
   * Crea un directorio en el servidor SSH
   */
  async createDirectory(event, tabId, remotePath, sshConfig) {
    // Implementación pendiente - se moverá desde main.js
    return { success: false, error: 'Not implemented yet' };
  }

  /**
   * Establece la pestaña activa para estadísticas
   */
  setActiveStatsTab(event, tabId) {
    this.activeStatsTabId = tabId;
  }

  /**
   * Parsea la salida del comando ls -la
   */
  parseLsOutput(output) {
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
   * Busca una conexión SSH existente
   */
  async findSSHConnection(tabId, sshConfig = null) {
    // Primero intentar por tabId (para conexiones directas de terminal)
    if (this.sshConnections[tabId]) {
      return this.sshConnections[tabId];
    }
    
    // Si no existe por tabId y tenemos sshConfig, buscar cualquier conexión al mismo servidor
    if (sshConfig && sshConfig.host && sshConfig.username) {
      // Para bastiones: buscar cualquier conexión activa al mismo destino via bastión
      if (sshConfig.useBastionWallix) {
        // Buscar en conexiones activas cualquier conexión que vaya al mismo destino via bastión
        for (const conn of Object.values(this.sshConnections)) {
          if (conn.config && 
              conn.config.useBastionWallix &&
              conn.config.bastionHost === sshConfig.bastionHost &&
              conn.config.bastionUser === sshConfig.bastionUser &&
              conn.config.host === sshConfig.host &&
              conn.config.username === sshConfig.username &&
              (conn.config.port || 22) === (sshConfig.port || 22)) {
            return conn;
          }
        }
      }
    }
    // Si no se encuentra, retornar null
    return null;
  }

  /**
   * Obtiene las conexiones SSH activas
   */
  getSSHConnections() {
    return this.sshConnections;
  }

  /**
   * Obtiene la pestaña activa de estadísticas
   */
  getActiveStatsTab() {
    return this.activeStatsTabId;
  }
}

module.exports = SSHHandlers;
