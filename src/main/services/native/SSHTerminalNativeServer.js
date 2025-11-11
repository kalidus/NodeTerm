const { spawn } = require('child_process');
const path = require('path');
const SSH2Promise = require('ssh2-promise');

/**
 * SSHTerminalNativeServer - MCP Server nativo para ejecutar comandos locales y remotos
 * 
 * Características:
 * - Ejecutar comandos en terminales locales (WSL, Cygwin, PowerShell)
 * - Ejecutar comandos remotos por SSH
 * - Pool de conexiones SSH reutilizables
 * - Validación de seguridad (listas blancas de comandos)
 * - Timeouts configurables
 */
class SSHTerminalNativeServer {
  constructor(initialConfig = {}) {
    this.serverId = initialConfig.serverId || 'ssh-terminal';
    
    // Configuración de seguridad
    this.allowedDir = initialConfig.allowedDir || initialConfig.options?.allowedDir || '';
    this.allowedCommands = this.parseAllowedCommands(
      initialConfig.allowedCommands || initialConfig.options?.allowedCommands || 'all'
    );
    this.commandTimeout = parseInt(initialConfig.commandTimeout || initialConfig.options?.commandTimeout || '30', 10);
    
    // Terminal preferido para comandos locales
    this.preferredTerminal = initialConfig.preferredTerminal || initialConfig.options?.preferredTerminal || 'wsl';
    
    // Conexiones SSH configuradas
    this.sshConnections = initialConfig.sshConnections || initialConfig.options?.sshConnections || [];
    
    // Pool de conexiones SSH activas
    this.sshPool = new Map();
    
    // Servicios locales (se inicializarán según disponibilidad)
    this.localTerminals = {
      wsl: null,
      cygwin: null,
      powershell: null
    };
    
    console.log(`🔧 [SSH Terminal MCP] Inicializado con config:`, {
      allowedDir: this.allowedDir,
      allowedCommands: this.allowedCommands.length === 0 ? 'all' : this.allowedCommands.join(','),
      commandTimeout: this.commandTimeout,
      preferredTerminal: this.preferredTerminal,
      sshConnections: this.sshConnections.length
    });
  }

  /**
   * Parsear comandos permitidos desde string a array
   */
  parseAllowedCommands(commandsStr) {
    if (!commandsStr || commandsStr === 'all' || commandsStr.toLowerCase() === 'all') {
      return []; // Array vacío = todos permitidos
    }
    return commandsStr.split(',').map(cmd => cmd.trim()).filter(Boolean);
  }

  /**
   * Validar si un comando está permitido
   */
  isCommandAllowed(command) {
    // Si allowedCommands está vacío, todos los comandos están permitidos
    if (this.allowedCommands.length === 0) {
      return true;
    }
    
    // Extraer el comando base (primera palabra)
    const baseCommand = command.trim().split(/\s+/)[0];
    
    // Verificar si el comando está en la lista blanca
    return this.allowedCommands.some(allowed => 
      baseCommand === allowed || baseCommand.startsWith(allowed)
    );
  }

  /**
   * Validar que la ruta esté dentro del directorio permitido
   */
  isPathAllowed(commandPath) {
    if (!this.allowedDir) {
      return true; // Sin restricción de directorio
    }
    
    // Normalizar rutas para comparación
    const normalizedAllowed = path.normalize(this.allowedDir).toLowerCase();
    const normalizedPath = path.normalize(commandPath).toLowerCase();
    
    return normalizedPath.startsWith(normalizedAllowed);
  }

  /**
   * Handler principal de requests MCP
   */
  async handleRequest(method, params = {}) {
    switch (method) {
      case 'initialize':
        return this.handleInitialize();
      case 'tools/list':
        return this.handleToolsList();
      case 'resources/list':
        return { resources: [] };
      case 'prompts/list':
        return { prompts: [] };
      case 'tools/call':
        return this.handleToolsCall(params);
      case 'resources/read':
        throw new Error('Este servidor no expone resources.');
      default:
        throw new Error(`Método ${method} no soportado por ${this.serverId}`);
    }
  }

  /**
   * Initialize - Retornar capabilities del servidor
   */
  handleInitialize() {
    return {
      capabilities: {
        tools: {
          list: true,
          call: true
        },
        resources: {
          list: false,
          read: false
        },
        prompts: {
          list: false,
          get: false
        }
      },
      serverInfo: {
        name: 'SSH/Terminal (nativo)',
        version: '1.0.0',
        description: 'Servidor nativo para ejecutar comandos locales (WSL, Cygwin, PowerShell) y remotos por SSH.'
      }
    };
  }

  /**
   * Tools/List - Listar herramientas disponibles
   */
  handleToolsList() {
    return {
      tools: [
        {
          name: 'execute_local',
          description: 'Ejecuta un comando en el terminal local (WSL, Cygwin o PowerShell). Respeta las políticas de seguridad configuradas.',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'Comando a ejecutar (ej: "ls -la", "dir", "cat file.txt")'
              },
              terminal: {
                type: 'string',
                enum: ['wsl', 'cygwin', 'powershell', 'auto'],
                default: 'auto',
                description: 'Terminal a usar. "auto" usa el preferido configurado.'
              },
              workingDir: {
                type: 'string',
                description: 'Directorio de trabajo (opcional, debe estar en ALLOWED_DIR)'
              }
            },
            required: ['command']
          }
        },
        {
          name: 'execute_ssh',
          description: 'Ejecuta un comando en un servidor remoto por SSH. Usa el pool de conexiones para eficiencia.',
          inputSchema: {
            type: 'object',
            properties: {
              hostId: {
                type: 'string',
                description: 'ID del host SSH configurado (usar list_ssh_hosts para ver disponibles)'
              },
              command: {
                type: 'string',
                description: 'Comando a ejecutar en el servidor remoto'
              }
            },
            required: ['hostId', 'command']
          }
        },
        {
          name: 'list_terminals',
          description: 'Lista los terminales locales disponibles en el sistema.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'list_ssh_hosts',
          description: 'Lista los hosts SSH configurados y disponibles para conexión.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'test_ssh_connection',
          description: 'Prueba la conexión a un host SSH específico.',
          inputSchema: {
            type: 'object',
            properties: {
              hostId: {
                type: 'string',
                description: 'ID del host SSH a probar'
              }
            },
            required: ['hostId']
          }
        },
        {
          name: 'show_security_rules',
          description: 'Muestra las reglas de seguridad activas (comandos permitidos, directorio base, etc.)',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      ]
    };
  }

  /**
   * Tools/Call - Ejecutar una herramienta
   */
  async handleToolsCall(params) {
    const { name, arguments: args } = params;
    
    console.log(`🔧 [SSH Terminal MCP] Ejecutando tool: ${name}`, args);
    
    try {
      let result;
      
      switch (name) {
        case 'execute_local':
          result = await this.executeLocal(args);
          break;
        case 'execute_ssh':
          result = await this.executeSSH(args);
          break;
        case 'list_terminals':
          result = await this.listTerminals();
          break;
        case 'list_ssh_hosts':
          result = await this.listSSHHosts();
          break;
        case 'test_ssh_connection':
          result = await this.testSSHConnection(args);
          break;
        case 'show_security_rules':
          result = await this.showSecurityRules();
          break;
        default:
          throw new Error(`Tool desconocida: ${name}`);
      }
      
      console.log(`✅ [SSH Terminal MCP] Tool ${name} completada`);
      
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error(`❌ [SSH Terminal MCP] Error en tool ${name}:`, error);
      
      return {
        content: [
          {
            type: 'text',
            text: `❌ Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * TOOL: execute_local - Ejecutar comando local
   */
  async executeLocal(args) {
    const { command, terminal = 'auto', workingDir } = args;
    
    // Validación de seguridad
    if (!this.isCommandAllowed(command)) {
      throw new Error(`❌ Comando no permitido: "${command}". Ver show_security_rules para comandos permitidos.`);
    }
    
    if (workingDir && !this.isPathAllowed(workingDir)) {
      throw new Error(`❌ Directorio no permitido: "${workingDir}". Debe estar en: ${this.allowedDir}`);
    }
    
    // Normalizar el terminal: remover "local:" si existe, convertir a minúsculas
    let normalizedTerminal = terminal;
    if (typeof normalizedTerminal === 'string') {
      // Remover prefijo "local:" si existe
      normalizedTerminal = normalizedTerminal.replace(/^local:/i, '');
      // Convertir a minúsculas
      normalizedTerminal = normalizedTerminal.toLowerCase().trim();
    }
    
    // Determinar terminal a usar
    const targetTerminal = normalizedTerminal === 'auto' ? this.preferredTerminal : normalizedTerminal;
    
    // Ejecutar según el terminal
    let result;
    switch (targetTerminal) {
      case 'wsl':
        result = await this.executeInWSL(command, workingDir);
        break;
      case 'cygwin':
        result = await this.executeInCygwin(command, workingDir);
        break;
      case 'powershell':
        result = await this.executeInPowerShell(command, workingDir);
        break;
      default:
        throw new Error(`❌ Terminal desconocido: "${targetTerminal}". Usa: wsl, cygwin o powershell`);
    }
    
    return this.formatCommandResult(result, `local:${targetTerminal}`);
  }

  /**
   * Ejecutar comando en WSL
   */
  async executeInWSL(command, workingDir) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        process.kill();
        reject(new Error(`Timeout después de ${this.commandTimeout}s`));
      }, this.commandTimeout * 1000);
      
      let wslCommand = command;
      if (workingDir) {
        // Convertir path de Windows a WSL si es necesario
        const wslPath = workingDir.replace(/\\/g, '/').replace(/^([A-Z]):/i, (match, drive) => {
          return `/mnt/${drive.toLowerCase()}`;
        });
        wslCommand = `cd "${wslPath}" && ${command}`;
      }
      
      const process = spawn('wsl', ['-e', 'bash', '-c', wslCommand], {
        shell: false,
        windowsHide: true
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        clearTimeout(timeout);
        resolve({ stdout, stderr, exitCode: code });
      });
      
      process.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Error ejecutando WSL: ${err.message}`));
      });
    });
  }

  /**
   * Ejecutar comando en Cygwin
   */
  async executeInCygwin(command, workingDir) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        process.kill();
        reject(new Error(`Timeout después de ${this.commandTimeout}s`));
      }, this.commandTimeout * 1000);
      
      // Buscar bash de Cygwin
      const cygwinBash = 'C:\\cygwin64\\bin\\bash.exe';
      
      let cygwinCommand = command;
      if (workingDir) {
        // Convertir path de Windows a Cygwin
        const cygwinPath = workingDir.replace(/\\/g, '/').replace(/^([A-Z]):/i, (match, drive) => {
          return `/cygdrive/${drive.toLowerCase()}`;
        });
        cygwinCommand = `cd "${cygwinPath}" && ${command}`;
      }
      
      const process = spawn(cygwinBash, ['-l', '-c', cygwinCommand], {
        shell: false,
        windowsHide: true
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        clearTimeout(timeout);
        resolve({ stdout, stderr, exitCode: code });
      });
      
      process.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Error ejecutando Cygwin: ${err.message}. ¿Está instalado en C:\\cygwin64?`));
      });
    });
  }

  /**
   * Ejecutar comando en PowerShell
   */
  async executeInPowerShell(command, workingDir) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        process.kill();
        reject(new Error(`Timeout después de ${this.commandTimeout}s`));
      }, this.commandTimeout * 1000);
      
      let psCommand = command;
      if (workingDir) {
        psCommand = `Set-Location "${workingDir}"; ${command}`;
      }
      
      const process = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        psCommand
      ], {
        shell: false,
        windowsHide: true
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        clearTimeout(timeout);
        resolve({ stdout, stderr, exitCode: code });
      });
      
      process.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Error ejecutando PowerShell: ${err.message}`));
      });
    });
  }

  /**
   * TOOL: execute_ssh - Ejecutar comando por SSH
   */
  async executeSSH(args) {
    const { hostId, command } = args;
    
    // Buscar configuración del host
    const hostConfig = this.sshConnections.find(h => h.id === hostId);
    if (!hostConfig) {
      throw new Error(`❌ Host SSH no configurado: "${hostId}". Usa list_ssh_hosts para ver hosts disponibles.`);
    }
    
    // Validación de seguridad
    if (!this.isCommandAllowed(command)) {
      throw new Error(`❌ Comando no permitido: "${command}". Ver show_security_rules para comandos permitidos.`);
    }
    
    // Obtener o crear conexión SSH
    let ssh = this.sshPool.get(hostId);
    
    if (!ssh || !ssh.isConnected || !ssh.isConnected()) {
      console.log(`🔌 [SSH Terminal MCP] Conectando a ${hostConfig.name} (${hostConfig.host})...`);
      
      const sshConfig = {
        host: hostConfig.host,
        port: hostConfig.port || 22,
        username: hostConfig.username,
        readyTimeout: 20000,
        keepaliveInterval: 60000
      };
      
      // Autenticación por password o llave privada
      if (hostConfig.password) {
        sshConfig.password = hostConfig.password;
      } else if (hostConfig.privateKey) {
        sshConfig.privateKey = hostConfig.privateKey;
      } else {
        throw new Error(`❌ Host ${hostId}: No se configuró password ni privateKey`);
      }
      
      ssh = new SSH2Promise(sshConfig);
      await ssh.connect();
      
      ssh._createdAt = Date.now();
      ssh._lastUsed = Date.now();
      this.sshPool.set(hostId, ssh);
      
      console.log(`✅ [SSH Terminal MCP] Conectado a ${hostConfig.name}`);
    } else {
      ssh._lastUsed = Date.now();
    }
    
    // Ejecutar comando con timeout
    const result = await Promise.race([
      ssh.exec(command),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout después de ${this.commandTimeout}s`)), 
        this.commandTimeout * 1000)
      )
    ]);
    
    return this.formatCommandResult({
      stdout: result,
      stderr: '',
      exitCode: 0
    }, `ssh:${hostConfig.name}`);
  }

  /**
   * TOOL: list_terminals - Listar terminales disponibles
   */
  async listTerminals() {
    const terminals = [];
    
    // Detectar WSL
    try {
      const { execSync } = require('child_process');
      execSync('wsl --list', { timeout: 2000, windowsHide: true });
      terminals.push({
        id: 'wsl',
        name: 'WSL (Windows Subsystem for Linux)',
        available: true,
        preferred: this.preferredTerminal === 'wsl'
      });
    } catch (e) {
      terminals.push({
        id: 'wsl',
        name: 'WSL (Windows Subsystem for Linux)',
        available: false,
        reason: 'No instalado o no disponible'
      });
    }
    
    // Detectar Cygwin
    const fs = require('fs');
    const cygwinAvailable = fs.existsSync('C:\\cygwin64\\bin\\bash.exe');
    terminals.push({
      id: 'cygwin',
      name: 'Cygwin',
      available: cygwinAvailable,
      preferred: this.preferredTerminal === 'cygwin',
      ...(!cygwinAvailable && { reason: 'No instalado en C:\\cygwin64' })
    });
    
    // PowerShell siempre disponible en Windows
    terminals.push({
      id: 'powershell',
      name: 'PowerShell',
      available: true,
      preferred: this.preferredTerminal === 'powershell'
    });
    
    return {
      terminals,
      preferredTerminal: this.preferredTerminal,
      summary: `${terminals.filter(t => t.available).length}/${terminals.length} terminales disponibles`
    };
  }

  /**
   * TOOL: list_ssh_hosts - Listar hosts SSH configurados
   */
  async listSSHHosts() {
    if (this.sshConnections.length === 0) {
      return {
        hosts: [],
        message: 'No hay hosts SSH configurados. Agrégalos en la configuración del MCP.'
      };
    }
    
    const hosts = this.sshConnections.map(host => {
      const poolEntry = this.sshPool.get(host.id);
      const isConnected = poolEntry && poolEntry.isConnected && poolEntry.isConnected();
      
      return {
        id: host.id,
        name: host.name,
        host: host.host,
        port: host.port || 22,
        username: host.username,
        status: isConnected ? 'connected' : 'disconnected',
        ...(isConnected && {
          connectedSince: new Date(poolEntry._createdAt).toISOString(),
          lastUsed: new Date(poolEntry._lastUsed).toISOString()
        })
      };
    });
    
    return {
      hosts,
      totalConfigured: hosts.length,
      activeConnections: hosts.filter(h => h.status === 'connected').length
    };
  }

  /**
   * TOOL: test_ssh_connection - Probar conexión SSH
   */
  async testSSHConnection(args) {
    const { hostId } = args;
    
    const hostConfig = this.sshConnections.find(h => h.id === hostId);
    if (!hostConfig) {
      throw new Error(`Host SSH no encontrado: ${hostId}`);
    }
    
    const startTime = Date.now();
    
    try {
      const sshConfig = {
        host: hostConfig.host,
        port: hostConfig.port || 22,
        username: hostConfig.username,
        readyTimeout: 10000
      };
      
      if (hostConfig.password) {
        sshConfig.password = hostConfig.password;
      } else if (hostConfig.privateKey) {
        sshConfig.privateKey = hostConfig.privateKey;
      }
      
      const testSSH = new SSH2Promise(sshConfig);
      await testSSH.connect();
      
      // Ejecutar comando simple para verificar
      const result = await testSSH.exec('echo "Connection test successful"');
      
      await testSSH.close();
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        host: hostConfig.name,
        address: `${hostConfig.host}:${hostConfig.port || 22}`,
        username: hostConfig.username,
        latency: `${duration}ms`,
        message: '✅ Conexión SSH exitosa',
        testOutput: result.trim()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        host: hostConfig.name,
        address: `${hostConfig.host}:${hostConfig.port || 22}`,
        username: hostConfig.username,
        latency: `${duration}ms`,
        message: `❌ Error de conexión: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * TOOL: show_security_rules - Mostrar reglas de seguridad
   */
  async showSecurityRules() {
    return {
      allowedDirectory: this.allowedDir || 'Sin restricción',
      allowedCommands: this.allowedCommands.length === 0 
        ? 'Todos los comandos permitidos' 
        : this.allowedCommands.join(', '),
      commandTimeout: `${this.commandTimeout} segundos`,
      preferredTerminal: this.preferredTerminal,
      sshHostsConfigured: this.sshConnections.length,
      activeSSHConnections: this.sshPool.size,
      note: 'Estas reglas se configuran en el MCPManagerTab de NodeTerm'
    };
  }

  /**
   * Formatear resultado de comando para la IA
   */
  formatCommandResult(result, source) {
    const { stdout, stderr, exitCode } = result;
    
    let formatted = `🖥️ Comando ejecutado en: ${source}\n`;
    formatted += `📊 Exit Code: ${exitCode}\n\n`;
    
    if (exitCode === 0) {
      formatted += `✅ Resultado:\n${stdout.trim() || '(sin output)'}`;
    } else {
      formatted += `❌ Error:\n${stderr.trim() || stdout.trim() || '(sin información de error)'}`;
    }
    
    return formatted;
  }

  /**
   * Cleanup - Cerrar conexiones SSH al destruir el servidor
   */
  async cleanup() {
    console.log(`🧹 [SSH Terminal MCP] Limpiando ${this.sshPool.size} conexiones SSH...`);
    
    for (const [hostId, ssh] of this.sshPool.entries()) {
      try {
        if (ssh && ssh.isConnected && ssh.isConnected()) {
          await ssh.close();
          console.log(`✅ [SSH Terminal MCP] Conexión SSH cerrada: ${hostId}`);
        }
      } catch (error) {
        console.error(`❌ [SSH Terminal MCP] Error cerrando ${hostId}:`, error.message);
      }
    }
    
    this.sshPool.clear();
  }
}

module.exports = SSHTerminalNativeServer;

