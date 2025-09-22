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
   * Envía datos al renderer de forma segura
   */
  sendToRenderer(sender, eventName, ...args) {
    try {
      if (sender && !sender.isDestroyed()) {
        sender.send(eventName, ...args);
      }
    } catch (error) {
      console.error('Error sending to renderer:', error);
    }
  }

  /**
   * Bucle de estadísticas para conexiones bastión
   */
  wallixStatsLoop(tabId) {
    const connObj = this.sshConnections[tabId];
    if (this.activeStatsTabId !== tabId) {
      if (connObj) {
        connObj.statsTimeout = null;
        connObj.statsLoopRunning = false;
      }
      return;
    }

    if (!connObj || !connObj.stream || connObj.statsLoopRunning) {
      return;
    }

    connObj.statsLoopRunning = true;

    try {
      // Implementar lógica de estadísticas aquí
      // Por ahora solo un placeholder
      connObj.statsTimeout = setTimeout(() => {
        connObj.statsLoopRunning = false;
        if (this.activeStatsTabId === tabId) {
          this.wallixStatsLoop(tabId);
        }
      }, 2000);
    } catch (error) {
      console.error('Error in wallixStatsLoop:', error);
      connObj.statsLoopRunning = false;
    }
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
    try {
      if (sshConfig.useBastionWallix) {
        // Buscar la conexión existente para bastion
        const existingConn = await this.findSSHConnection(tabId, sshConfig);
        if (!existingConn || !existingConn.ssh || !existingConn.stream) {
          return { success: false, error: 'No se encontró una conexión bastión activa para este tabId. Abre primero una terminal.' };
        }
        const stream = existingConn.stream;
        const command = `[ -d "${path}" ] && echo exists || echo notfound\n`;
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
        const result = await ssh.exec(`[ -d "${path}" ] && echo exists || echo notfound`);
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
  }

  /**
   * Conecta a un servidor SSH
   */
  async connectSSH(event, tabId, config) {
    try {
      // Para bastiones: usar cacheKey único por destino (permite reutilización)
      // Para SSH directo: usar pooling normal para eficiencia
      const cacheKey = config.useBastionWallix 
        ? `bastion-${config.bastionUser}@${config.bastionHost}->${config.username}@${config.host}:${config.port || 22}`
        : `${config.username}@${config.host}:${config.port || 22}`;
      
      // Aplicar throttling solo para SSH directo (bastiones son únicos)
      if (!config.useBastionWallix) {
        const lastAttempt = this.connectionThrottle.lastAttempt.get(cacheKey) || 0;
        const now = Date.now();
        const timeSinceLastAttempt = now - lastAttempt;
        
        if (timeSinceLastAttempt < this.connectionThrottle.minInterval) {
          const waitTime = this.connectionThrottle.minInterval - timeSinceLastAttempt;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.connectionThrottle.lastAttempt.set(cacheKey, Date.now());
      }
      
      // Para bastiones: cada terminal tiene su propia conexión independiente (no pooling)
      // Para SSH directo: usar pooling normal para eficiencia
      let ssh;
      let isReusedConnection = false;

      if (config.useBastionWallix) {
        // BASTIÓN: Usar ssh2 puro para crear una conexión y shell independientes
        const bastionConfig = {
          bastionHost: config.bastionHost,
          port: 22,
          bastionUser: config.bastionUser,
          password: config.password
        };
        
        const { conn } = createBastionShell(
          bastionConfig,
          (data) => {
            this.sendToRenderer(event.sender, `ssh:data:${tabId}`, data.toString('utf-8'));
          },
          () => {
            this.sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\nConnection closed.\r\n');
            if (this.sshConnections[tabId] && this.sshConnections[tabId].statsTimeout) {
              clearTimeout(this.sshConnections[tabId].statsTimeout);
            }
            this.sendToRenderer(event.sender, 'ssh-connection-disconnected', {
              originalKey: config.originalKey || tabId,
              tabId: tabId
            });
            // Limpiar estado persistente de bastión al cerrar la pestaña
            delete this.bastionStatsState[tabId];
            delete this.sshConnections[tabId];
          },
          (err) => {
            this.sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${err.message || err}\r\n`);
          },
          (stream) => {
            if (this.sshConnections[tabId]) {
              this.sshConnections[tabId].stream = stream;
              // Si hay un resize pendiente, aplicarlo ahora
              const pending = this.sshConnections[tabId]._pendingResize;
              if (pending && stream && !stream.destroyed && typeof stream.setWindow === 'function') {
                const safeRows = Math.max(1, Math.min(300, pending.rows || 24));
                const safeCols = Math.max(1, Math.min(500, pending.cols || 80));
                stream.setWindow(safeRows, safeCols);
                this.sshConnections[tabId]._pendingResize = null;
              }
              // Lanzar bucle de stats SOLO cuando el stream está listo
              // Solo iniciar stats si esta pestaña está activa
              if (this.activeStatsTabId === tabId) {
                this.wallixStatsLoop(tabId);
              }
            }
          }
        );
        
        // Guardar la conexión para gestión posterior (stream se asigna en onShellReady)
        this.sshConnections[tabId] = {
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
        
        ssh = conn;
      } else {
        // SSH DIRECTO: Usar pooling para eficiencia
        if (this.sshConnectionPool[cacheKey]) {
          ssh = this.sshConnectionPool[cacheKey];
          isReusedConnection = true;
        } else {
          ssh = new SSH2Promise(config);
          await ssh.connect();
          this.sshConnectionPool[cacheKey] = ssh;
        }
        
        // Crear shell interactivo
        const shell = await ssh.shell({
          term: 'xterm-256color',
          cols: config.cols || 80,
          rows: config.rows || 24
        });
        
        // Guardar la conexión
        this.sshConnections[tabId] = {
          ssh,
          shell,
          config,
          cacheKey,
          originalKey: config.originalKey || tabId
        };
        
        // Configurar eventos del shell
        shell.on('data', (data) => {
          this.sendToRenderer(event.sender, `ssh:data:${tabId}`, data.toString('utf-8'));
        });
        
        shell.on('close', () => {
          this.sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\nConnection closed.\r\n');
          this.sendToRenderer(event.sender, 'ssh-connection-disconnected', {
            originalKey: config.originalKey || tabId,
            tabId: tabId
          });
          delete this.sshConnections[tabId];
        });
        
        shell.on('error', (err) => {
          this.sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${err.message || err}\r\n`);
        });
      }
      
      // Notificar conexión exitosa
      this.sendToRenderer(event.sender, 'ssh-connection-established', {
        tabId,
        originalKey: config.originalKey || tabId,
        isReusedConnection
      });
      
    } catch (error) {
      console.error('Error connecting SSH:', error);
      this.sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${error.message}\r\n`);
    }
  }

  /**
   * Envía datos a la conexión SSH
   */
  sendSSHData(event, tabId, data) {
    const connection = this.sshConnections[tabId];
    if (!connection) {
      console.warn(`No SSH connection found for tabId: ${tabId}`);
      return;
    }

    try {
      if (connection.stream) {
        // Bastión: usar stream directo
        connection.stream.write(data);
      } else if (connection.shell) {
        // SSH directo: usar shell
        connection.shell.write(data);
      }
    } catch (error) {
      console.error('Error sending SSH data:', error);
    }
  }

  /**
   * Redimensiona el terminal SSH
   */
  resizeSSH(event, tabId, rows, cols) {
    const connection = this.sshConnections[tabId];
    if (!connection) {
      console.warn(`No SSH connection found for tabId: ${tabId}`);
      return;
    }

    const safeRows = Math.max(1, Math.min(300, rows || 24));
    const safeCols = Math.max(1, Math.min(500, cols || 80));

    try {
      if (connection.stream && typeof connection.stream.setWindow === 'function') {
        // Bastión: usar setWindow
        connection.stream.setWindow(safeRows, safeCols);
      } else if (connection.shell && typeof connection.shell.setWindow === 'function') {
        // SSH directo: usar setWindow del shell
        connection.shell.setWindow(safeRows, safeCols);
      } else if (connection.stream) {
        // Si el stream no está listo, guardar para aplicar después
        connection._pendingResize = { rows: safeRows, cols: safeCols };
      }
    } catch (error) {
      console.error('Error resizing SSH terminal:', error);
    }
  }

  /**
   * Desconecta la conexión SSH
   */
  disconnectSSH(event, tabId) {
    const connection = this.sshConnections[tabId];
    if (!connection) {
      console.warn(`No SSH connection found for tabId: ${tabId}`);
      return;
    }

    try {
      // Limpiar timeouts de stats
      if (connection.statsTimeout) {
        clearTimeout(connection.statsTimeout);
      }

      // Cerrar conexión según el tipo
      if (connection.stream) {
        // Bastión: cerrar stream
        if (!connection.stream.destroyed) {
          connection.stream.end();
        }
      } else if (connection.shell) {
        // SSH directo: cerrar shell
        connection.shell.end();
      }

      // Limpiar estado
      delete this.sshConnections[tabId];
      delete this.bastionStatsState[tabId];

      console.log(`SSH connection disconnected for tabId: ${tabId}`);
    } catch (error) {
      console.error('Error disconnecting SSH:', error);
    }
  }

  /**
   * Descarga un archivo del servidor SSH
   */
  async downloadFile(event, tabId, remotePath, localPath, sshConfig) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (sshConfig.useBastionWallix) {
        // Para bastiones, usar SFTP
        const sftp = new SftpClient();
        const connectConfig = {
          host: sshConfig.bastionHost,
          port: sshConfig.port || 22,
          username: sshConfig.bastionUser,
          password: sshConfig.password,
          readyTimeout: 20000,
        };
        await sftp.connect(connectConfig);
        
        // Asegurar que el directorio local existe
        const localDir = path.dirname(localPath);
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }
        
        await sftp.fastGet(remotePath, localPath);
        await sftp.end();
        return { success: true };
      } else {
        // SSH directo
        const ssh = new SSH2Promise(sshConfig);
        await ssh.connect();
        
        // Asegurar que el directorio local existe
        const localDir = path.dirname(localPath);
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }
        
        await ssh.getFile(localPath, remotePath);
        await ssh.close();
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  }

  /**
   * Sube un archivo al servidor SSH
   */
  async uploadFile(event, tabId, localPath, remotePath, sshConfig) {
    try {
      const fs = require('fs');
      
      if (sshConfig.useBastionWallix) {
        // Para bastiones, usar SFTP
        const sftp = new SftpClient();
        const connectConfig = {
          host: sshConfig.bastionHost,
          port: sshConfig.port || 22,
          username: sshConfig.bastionUser,
          password: sshConfig.password,
          readyTimeout: 20000,
        };
        await sftp.connect(connectConfig);
        
        // Verificar que el archivo local existe
        if (!fs.existsSync(localPath)) {
          await sftp.end();
          return { success: false, error: 'Archivo local no encontrado' };
        }
        
        await sftp.fastPut(localPath, remotePath);
        await sftp.end();
        return { success: true };
      } else {
        // SSH directo
        const ssh = new SSH2Promise(sshConfig);
        await ssh.connect();
        
        // Verificar que el archivo local existe
        if (!fs.existsSync(localPath)) {
          await ssh.close();
          return { success: false, error: 'Archivo local no encontrado' };
        }
        
        await ssh.putFile(localPath, remotePath);
        await ssh.close();
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  }

  /**
   * Elimina un archivo o directorio del servidor SSH
   */
  async deleteFile(event, tabId, remotePath, isDirectory, sshConfig) {
    try {
      if (sshConfig.useBastionWallix) {
        // Para bastiones, usar SFTP
        const sftp = new SftpClient();
        const connectConfig = {
          host: sshConfig.bastionHost,
          port: sshConfig.port || 22,
          username: sshConfig.bastionUser,
          password: sshConfig.password,
          readyTimeout: 20000,
        };
        await sftp.connect(connectConfig);
        
        if (isDirectory) {
          await sftp.rmdir(remotePath, true); // true = recursive
        } else {
          await sftp.delete(remotePath);
        }
        
        await sftp.end();
        return { success: true };
      } else {
        // SSH directo
        const ssh = new SSH2Promise(sshConfig);
        await ssh.connect();
        
        if (isDirectory) {
          await ssh.exec(`rm -rf "${remotePath}"`);
        } else {
          await ssh.exec(`rm "${remotePath}"`);
        }
        
        await ssh.close();
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.message || err };
    }
  }

  /**
   * Crea un directorio en el servidor SSH
   */
  async createDirectory(event, tabId, remotePath, sshConfig) {
    try {
      if (sshConfig.useBastionWallix) {
        // Para bastiones, usar SFTP
        const sftp = new SftpClient();
        const connectConfig = {
          host: sshConfig.bastionHost,
          port: sshConfig.port || 22,
          username: sshConfig.bastionUser,
          password: sshConfig.password,
          readyTimeout: 20000,
        };
        await sftp.connect(connectConfig);
        
        await sftp.mkdir(remotePath, true); // true = recursive
        await sftp.end();
        return { success: true };
      } else {
        // SSH directo
        const ssh = new SSH2Promise(sshConfig);
        await ssh.connect();
        
        await ssh.exec(`mkdir -p "${remotePath}"`);
        await ssh.close();
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.message || err };
    }
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
