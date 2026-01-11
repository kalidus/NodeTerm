/**
 * SSHTunnelService - Servicio para gestionar túneles SSH
 * 
 * Soporta tres tipos de túneles:
 * - Local Port Forwarding (-L): Redirige puerto local a servidor remoto
 * - Remote Port Forwarding (-R): Redirige puerto remoto a servidor local
 * - Dynamic Port Forwarding (-D): Proxy SOCKS
 */

const { Client } = require('ssh2');
const net = require('net');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

class SSHTunnelService extends EventEmitter {
  constructor() {
    super();
    // Map de túneles activos: tunnelId -> { config, client, server, status, logs }
    this.activeTunnels = new Map();
    // Contador para generar IDs únicos
    this.tunnelCounter = 0;
  }

  /**
   * Genera un ID único para el túnel
   */
  generateTunnelId() {
    return `tunnel-${Date.now()}-${++this.tunnelCounter}`;
  }

  /**
   * Añade un log al túnel
   */
  addLog(tunnelId, level, message) {
    const tunnel = this.activeTunnels.get(tunnelId);
    if (tunnel) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message
      };
      tunnel.logs.push(logEntry);
      // Limitar a últimos 100 logs
      if (tunnel.logs.length > 100) {
        tunnel.logs.shift();
      }
      this.emit('tunnel-log', { tunnelId, log: logEntry });
    }
  }

  /**
   * Actualiza el estado del túnel
   */
  updateStatus(tunnelId, status, error = null) {
    const tunnel = this.activeTunnels.get(tunnelId);
    if (tunnel) {
      tunnel.status = status;
      tunnel.error = error;
      tunnel.lastStatusChange = new Date().toISOString();
      this.emit('tunnel-status', { tunnelId, status, error });
    }
  }

  /**
   * Verifica si un puerto está libre
   * @param {number} port - Puerto a verificar
   * @param {string} host - Host (por defecto '127.0.0.1')
   * @returns {Promise<boolean>} - true si el puerto está libre, false si está ocupado
   */
  async isPortAvailable(port, host = '127.0.0.1') {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(false);
        }
      });
      
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      
      server.listen(port, host);
    });
  }

  /**
   * Encuentra y cierra túneles que usen el mismo puerto local
   * @param {number} localPort - Puerto local a verificar
   * @param {string} localHost - Host local (por defecto '127.0.0.1')
   * @returns {Promise<number>} - Número de túneles cerrados
   */
  async closeTunnelsUsingPort(localPort, localHost = '127.0.0.1') {
    let closedCount = 0;
    const tunnelsToClose = [];
    
    // Buscar túneles que usen el mismo puerto
    for (const [tunnelId, tunnel] of this.activeTunnels) {
      if (tunnel.config.localPort === localPort && 
          (tunnel.config.localHost || '127.0.0.1') === localHost) {
        tunnelsToClose.push(tunnelId);
      }
    }
    
    // Cerrar túneles encontrados
    for (const tunnelId of tunnelsToClose) {
      try {
        await this.stopTunnel(tunnelId);
        closedCount++;
      } catch (err) {
        console.error(`[SSHTunnelService] Error cerrando túnel ${tunnelId}:`, err);
      }
    }
    
    return closedCount;
  }

  /**
   * Crea la configuración de conexión SSH
   */
  buildSSHConfig(config) {
    const sshConfig = {
      host: config.sshHost,
      port: config.sshPort || 22,
      username: config.sshUser,
      readyTimeout: 30000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
      algorithms: {
        kex: [
          'curve25519-sha256',
          'curve25519-sha256@libssh.org',
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
          'diffie-hellman-group-exchange-sha256',
          'diffie-hellman-group14-sha256',
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group1-sha1'
        ],
        cipher: [
          'aes128-ctr',
          'aes192-ctr',
          'aes256-ctr',
          'aes128-gcm',
          'aes128-gcm@openssh.com',
          'aes256-gcm',
          'aes256-gcm@openssh.com'
        ],
        serverHostKey: [
          'ssh-ed25519',
          'ecdsa-sha2-nistp256',
          'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521',
          'rsa-sha2-512',
          'rsa-sha2-256',
          'ssh-rsa',
          'ssh-dss'
        ],
        hmac: [
          'hmac-sha2-256',
          'hmac-sha2-512',
          'hmac-sha1'
        ]
      }
    };

    // Autenticación por contraseña o clave
    if (config.authType === 'key' && config.privateKeyPath) {
      try {
        sshConfig.privateKey = fs.readFileSync(config.privateKeyPath);
        if (config.passphrase) {
          sshConfig.passphrase = config.passphrase;
        }
      } catch (err) {
        throw new Error(`No se pudo leer la clave privada: ${err.message}`);
      }
    } else {
      sshConfig.password = config.sshPassword;
    }

    return sshConfig;
  }

  /**
   * Crea un túnel de Local Port Forwarding (-L)
   * Escucha en un puerto local y reenvía conexiones al servidor remoto a través del túnel SSH
   * 
   * Ejemplo: -L 8080:remote-server:80
   * Las conexiones a localhost:8080 se reenvían a remote-server:80 a través del SSH
   */
  async createLocalForward(config) {
    const tunnelId = this.generateTunnelId();
    
    const tunnelInfo = {
      id: tunnelId,
      type: 'local',
      config: { ...config },
      client: null,
      server: null,
      status: 'connecting',
      error: null,
      logs: [],
      connections: 0,
      createdAt: new Date().toISOString(),
      lastStatusChange: new Date().toISOString()
    };
    
    this.activeTunnels.set(tunnelId, tunnelInfo);
    this.addLog(tunnelId, 'info', `Iniciando túnel local: localhost:${config.localPort} -> ${config.remoteHost}:${config.remotePort}`);

    return new Promise((resolve, reject) => {
      const sshClient = new Client();
      tunnelInfo.client = sshClient;

      sshClient.on('ready', () => {
        this.addLog(tunnelId, 'info', `Conexión SSH establecida con ${config.sshHost}`);
        
        // Crear servidor TCP local
        const server = net.createServer((socket) => {
          tunnelInfo.connections++;
          this.addLog(tunnelId, 'info', `Nueva conexión entrante (total: ${tunnelInfo.connections})`);
          
          sshClient.forwardOut(
            socket.remoteAddress || '127.0.0.1',
            socket.remotePort || 0,
            config.remoteHost,
            config.remotePort,
            (err, stream) => {
              if (err) {
                this.addLog(tunnelId, 'error', `Error al crear canal: ${err.message}`);
                socket.end();
                tunnelInfo.connections--;
                return;
              }
              
              // Pipe bidireccional
              socket.pipe(stream);
              stream.pipe(socket);
              
              socket.on('close', () => {
                tunnelInfo.connections--;
                this.addLog(tunnelId, 'debug', `Conexión cerrada (activas: ${tunnelInfo.connections})`);
              });
              
              stream.on('close', () => {
                socket.end();
              });
            }
          );
        });

        server.on('error', (err) => {
          this.addLog(tunnelId, 'error', `Error en servidor local: ${err.message}`);
          this.updateStatus(tunnelId, 'error', err.message);
        });

        server.listen(config.localPort, config.localHost || '127.0.0.1', () => {
          tunnelInfo.server = server;
          this.updateStatus(tunnelId, 'active');
          this.addLog(tunnelId, 'info', `Túnel activo - Escuchando en ${config.localHost || '127.0.0.1'}:${config.localPort}`);
          resolve({ success: true, tunnelId, status: 'active' });
        });
      });

      sshClient.on('error', (err) => {
        this.addLog(tunnelId, 'error', `Error SSH: ${err.message}`);
        this.updateStatus(tunnelId, 'error', err.message);
        reject({ success: false, error: err.message });
      });

      sshClient.on('close', () => {
        this.addLog(tunnelId, 'info', 'Conexión SSH cerrada');
        if (tunnelInfo.status === 'active') {
          this.updateStatus(tunnelId, 'disconnected');
        }
      });

      try {
        const sshConfig = this.buildSSHConfig(config);
        sshClient.connect(sshConfig);
      } catch (err) {
        this.addLog(tunnelId, 'error', `Error de configuración: ${err.message}`);
        this.updateStatus(tunnelId, 'error', err.message);
        reject({ success: false, error: err.message });
      }
    });
  }

  /**
   * Crea un túnel de Remote Port Forwarding (-R)
   * El servidor SSH escucha en un puerto y reenvía conexiones a nuestro servidor local
   * 
   * Ejemplo: -R 8080:localhost:3000
   * Las conexiones al servidor SSH en puerto 8080 se reenvían a localhost:3000
   */
  async createRemoteForward(config) {
    const tunnelId = this.generateTunnelId();
    
    const tunnelInfo = {
      id: tunnelId,
      type: 'remote',
      config: { ...config },
      client: null,
      server: null,
      status: 'connecting',
      error: null,
      logs: [],
      connections: 0,
      createdAt: new Date().toISOString(),
      lastStatusChange: new Date().toISOString()
    };
    
    this.activeTunnels.set(tunnelId, tunnelInfo);
    this.addLog(tunnelId, 'info', `Iniciando túnel remoto: ${config.sshHost}:${config.remotePort} -> ${config.localHost}:${config.localPort}`);

    return new Promise((resolve, reject) => {
      const sshClient = new Client();
      tunnelInfo.client = sshClient;

      sshClient.on('ready', () => {
        this.addLog(tunnelId, 'info', `Conexión SSH establecida con ${config.sshHost}`);
        
        // Solicitar al servidor SSH que escuche en el puerto remoto
        sshClient.forwardIn(config.bindHost || '0.0.0.0', config.remotePort, (err) => {
          if (err) {
            this.addLog(tunnelId, 'error', `Error al crear forward remoto: ${err.message}`);
            this.updateStatus(tunnelId, 'error', err.message);
            reject({ success: false, error: err.message });
            return;
          }
          
          this.updateStatus(tunnelId, 'active');
          this.addLog(tunnelId, 'info', `Túnel activo - Servidor SSH escuchando en puerto ${config.remotePort}`);
          resolve({ success: true, tunnelId, status: 'active' });
        });
      });

      // Manejar conexiones entrantes del túnel remoto
      sshClient.on('tcp connection', (info, accept, reject) => {
        tunnelInfo.connections++;
        this.addLog(tunnelId, 'info', `Conexión remota entrante desde ${info.srcIP}:${info.srcPort}`);
        
        const stream = accept();
        
        // Conectar al servidor local
        const localSocket = net.createConnection({
          host: config.localHost || '127.0.0.1',
          port: config.localPort
        }, () => {
          this.addLog(tunnelId, 'debug', `Conectado a servidor local ${config.localHost}:${config.localPort}`);
        });
        
        localSocket.on('error', (err) => {
          this.addLog(tunnelId, 'error', `Error conectando a servidor local: ${err.message}`);
          stream.end();
          tunnelInfo.connections--;
        });
        
        // Pipe bidireccional
        stream.pipe(localSocket);
        localSocket.pipe(stream);
        
        stream.on('close', () => {
          localSocket.end();
          tunnelInfo.connections--;
          this.addLog(tunnelId, 'debug', `Conexión remota cerrada (activas: ${tunnelInfo.connections})`);
        });
      });

      sshClient.on('error', (err) => {
        this.addLog(tunnelId, 'error', `Error SSH: ${err.message}`);
        this.updateStatus(tunnelId, 'error', err.message);
        reject({ success: false, error: err.message });
      });

      sshClient.on('close', () => {
        this.addLog(tunnelId, 'info', 'Conexión SSH cerrada');
        if (tunnelInfo.status === 'active') {
          this.updateStatus(tunnelId, 'disconnected');
        }
      });

      try {
        const sshConfig = this.buildSSHConfig(config);
        sshClient.connect(sshConfig);
      } catch (err) {
        this.addLog(tunnelId, 'error', `Error de configuración: ${err.message}`);
        this.updateStatus(tunnelId, 'error', err.message);
        reject({ success: false, error: err.message });
      }
    });
  }

  /**
   * Crea un túnel de Dynamic Port Forwarding (-D) - Proxy SOCKS
   * Crea un proxy SOCKS5 local que enruta todo el tráfico a través del túnel SSH
   * 
   * Ejemplo: -D 1080
   * Las aplicaciones configuradas para usar proxy SOCKS en localhost:1080
   * enviarán su tráfico a través del túnel SSH
   */
  async createDynamicForward(config) {
    const tunnelId = this.generateTunnelId();
    
    const tunnelInfo = {
      id: tunnelId,
      type: 'dynamic',
      config: { ...config },
      client: null,
      server: null,
      status: 'connecting',
      error: null,
      logs: [],
      connections: 0,
      createdAt: new Date().toISOString(),
      lastStatusChange: new Date().toISOString()
    };
    
    this.activeTunnels.set(tunnelId, tunnelInfo);
    this.addLog(tunnelId, 'info', `Iniciando proxy SOCKS en localhost:${config.localPort}`);

    return new Promise((resolve, reject) => {
      const sshClient = new Client();
      tunnelInfo.client = sshClient;

      sshClient.on('ready', () => {
        this.addLog(tunnelId, 'info', `Conexión SSH establecida con ${config.sshHost}`);
        
        // Crear servidor SOCKS5
        const server = net.createServer((socket) => {
          tunnelInfo.connections++;
          
          // Handshake SOCKS5
          socket.once('data', (data) => {
            // Verificar versión SOCKS5
            if (data[0] !== 0x05) {
              this.addLog(tunnelId, 'warn', 'Cliente no SOCKS5, rechazando');
              socket.end();
              tunnelInfo.connections--;
              return;
            }
            
            // Responder: sin autenticación
            socket.write(Buffer.from([0x05, 0x00]));
            
            // Esperar solicitud de conexión
            socket.once('data', (request) => {
              if (request[0] !== 0x05 || request[1] !== 0x01) {
                socket.end();
                tunnelInfo.connections--;
                return;
              }
              
              let targetHost, targetPort;
              let addressType = request[3];
              
              if (addressType === 0x01) {
                // IPv4
                targetHost = `${request[4]}.${request[5]}.${request[6]}.${request[7]}`;
                targetPort = (request[8] << 8) | request[9];
              } else if (addressType === 0x03) {
                // Dominio
                const domainLength = request[4];
                targetHost = request.slice(5, 5 + domainLength).toString();
                targetPort = (request[5 + domainLength] << 8) | request[6 + domainLength];
              } else if (addressType === 0x04) {
                // IPv6 (simplificado)
                targetHost = request.slice(4, 20).toString('hex').match(/.{4}/g).join(':');
                targetPort = (request[20] << 8) | request[21];
              } else {
                socket.end();
                tunnelInfo.connections--;
                return;
              }
              
              this.addLog(tunnelId, 'debug', `SOCKS: Conectando a ${targetHost}:${targetPort}`);
              
              // Crear túnel SSH hacia el destino
              sshClient.forwardOut(
                socket.remoteAddress || '127.0.0.1',
                socket.remotePort || 0,
                targetHost,
                targetPort,
                (err, stream) => {
                  if (err) {
                    this.addLog(tunnelId, 'error', `SOCKS error: ${err.message}`);
                    // Responder con error
                    socket.write(Buffer.from([0x05, 0x01, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
                    socket.end();
                    tunnelInfo.connections--;
                    return;
                  }
                  
                  // Responder con éxito
                  socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
                  
                  // Pipe bidireccional
                  socket.pipe(stream);
                  stream.pipe(socket);
                  
                  socket.on('close', () => {
                    tunnelInfo.connections--;
                  });
                  
                  stream.on('close', () => {
                    socket.end();
                  });
                }
              );
            });
          });
        });

        server.on('error', (err) => {
          this.addLog(tunnelId, 'error', `Error en servidor SOCKS: ${err.message}`);
          this.updateStatus(tunnelId, 'error', err.message);
        });

        server.listen(config.localPort, config.localHost || '127.0.0.1', () => {
          tunnelInfo.server = server;
          this.updateStatus(tunnelId, 'active');
          this.addLog(tunnelId, 'info', `Proxy SOCKS5 activo en ${config.localHost || '127.0.0.1'}:${config.localPort}`);
          resolve({ success: true, tunnelId, status: 'active' });
        });
      });

      sshClient.on('error', (err) => {
        this.addLog(tunnelId, 'error', `Error SSH: ${err.message}`);
        this.updateStatus(tunnelId, 'error', err.message);
        reject({ success: false, error: err.message });
      });

      sshClient.on('close', () => {
        this.addLog(tunnelId, 'info', 'Conexión SSH cerrada');
        if (tunnelInfo.status === 'active') {
          this.updateStatus(tunnelId, 'disconnected');
        }
      });

      try {
        const sshConfig = this.buildSSHConfig(config);
        sshClient.connect(sshConfig);
      } catch (err) {
        this.addLog(tunnelId, 'error', `Error de configuración: ${err.message}`);
        this.updateStatus(tunnelId, 'error', err.message);
        reject({ success: false, error: err.message });
      }
    });
  }

  /**
   * Inicia un túnel según su tipo
   */
  async startTunnel(config) {
    // Verificar y limpiar puerto local si es necesario (para local y dynamic)
    if (config.tunnelType === 'local' || config.tunnelType === 'dynamic') {
      const localHost = config.localHost || '127.0.0.1';
      const localPort = config.localPort;
      
      if (!localPort) {
        return { success: false, error: 'Puerto local requerido' };
      }
      
      // Cerrar túneles anteriores que usen el mismo puerto
      const closedCount = await this.closeTunnelsUsingPort(localPort, localHost);
      if (closedCount > 0) {
        console.log(`[SSHTunnelService] Se cerraron ${closedCount} túnel(es) anterior(es) usando el puerto ${localPort}`);
      }
      
      // Verificar si el puerto está libre
      const isAvailable = await this.isPortAvailable(localPort, localHost);
      if (!isAvailable) {
        return { 
          success: false, 
          error: `El puerto ${localPort} en ${localHost} está ocupado. Por favor, cierra la aplicación que lo está usando o elige otro puerto.` 
        };
      }
    }
    
    switch (config.tunnelType) {
      case 'local':
        return this.createLocalForward(config);
      case 'remote':
        return this.createRemoteForward(config);
      case 'dynamic':
        return this.createDynamicForward(config);
      default:
        return { success: false, error: `Tipo de túnel desconocido: ${config.tunnelType}` };
    }
  }

  /**
   * Detiene un túnel activo
   */
  async stopTunnel(tunnelId) {
    const tunnel = this.activeTunnels.get(tunnelId);
    if (!tunnel) {
      return { success: false, error: 'Túnel no encontrado' };
    }

    this.addLog(tunnelId, 'info', 'Deteniendo túnel...');

    try {
      // Cerrar servidor local si existe
      if (tunnel.server) {
        tunnel.server.close();
      }
      
      // Cerrar cliente SSH
      if (tunnel.client) {
        tunnel.client.end();
      }
      
      this.updateStatus(tunnelId, 'stopped');
      this.addLog(tunnelId, 'info', 'Túnel detenido correctamente');
      
      return { success: true };
    } catch (err) {
      this.addLog(tunnelId, 'error', `Error al detener túnel: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Elimina un túnel del registro
   */
  async removeTunnel(tunnelId) {
    const tunnel = this.activeTunnels.get(tunnelId);
    if (!tunnel) {
      return { success: false, error: 'Túnel no encontrado' };
    }

    // Primero detener si está activo
    if (tunnel.status === 'active') {
      await this.stopTunnel(tunnelId);
    }

    this.activeTunnels.delete(tunnelId);
    this.emit('tunnel-removed', { tunnelId });
    
    return { success: true };
  }

  /**
   * Obtiene el estado de un túnel
   */
  getTunnelStatus(tunnelId) {
    const tunnel = this.activeTunnels.get(tunnelId);
    if (!tunnel) {
      return { success: false, error: 'Túnel no encontrado' };
    }

    return {
      success: true,
      tunnel: {
        id: tunnel.id,
        type: tunnel.type,
        status: tunnel.status,
        error: tunnel.error,
        connections: tunnel.connections,
        createdAt: tunnel.createdAt,
        lastStatusChange: tunnel.lastStatusChange,
        config: {
          tunnelType: tunnel.type,
          sshHost: tunnel.config.sshHost,
          sshPort: tunnel.config.sshPort,
          sshUser: tunnel.config.sshUser,
          localPort: tunnel.config.localPort,
          localHost: tunnel.config.localHost,
          remoteHost: tunnel.config.remoteHost,
          remotePort: tunnel.config.remotePort
        }
      }
    };
  }

  /**
   * Obtiene los logs de un túnel
   */
  getTunnelLogs(tunnelId) {
    const tunnel = this.activeTunnels.get(tunnelId);
    if (!tunnel) {
      return { success: false, error: 'Túnel no encontrado' };
    }

    return {
      success: true,
      logs: tunnel.logs
    };
  }

  /**
   * Lista todos los túneles activos
   */
  listActiveTunnels() {
    const tunnels = [];
    for (const [id, tunnel] of this.activeTunnels) {
      tunnels.push({
        id: tunnel.id,
        type: tunnel.type,
        status: tunnel.status,
        connections: tunnel.connections,
        config: {
          sshHost: tunnel.config.sshHost,
          localPort: tunnel.config.localPort,
          remoteHost: tunnel.config.remoteHost,
          remotePort: tunnel.config.remotePort
        }
      });
    }
    return { success: true, tunnels };
  }

  /**
   * Cierra todos los túneles (para cleanup al cerrar la app)
   */
  async closeAll() {
    const promises = [];
    for (const [tunnelId] of this.activeTunnels) {
      promises.push(this.stopTunnel(tunnelId));
    }
    await Promise.allSettled(promises);
    this.activeTunnels.clear();
  }
}

module.exports = SSHTunnelService;
