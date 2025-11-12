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
    
    // Conexiones SSH sincronizadas desde NodeTerm (en memoria, vía IPC)
    this.nodeTermConnections = [];
    
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
   * 🤖 Detectar tipo de comando (linux vs windows)
   * Esto permite auto-seleccionar el terminal apropiado
   */
  detectCommandType(command) {
    const baseCommand = command.trim().split(/\s+/)[0].toLowerCase();
    
    // Comandos típicos de Linux/Unix
    const linuxCommands = [
      'ls', 'cd', 'pwd', 'cat', 'grep', 'awk', 'sed', 'find', 'which',
      'echo', 'touch', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown',
      'ps', 'kill', 'top', 'df', 'du', 'tar', 'gzip', 'gunzip',
      'curl', 'wget', 'ssh', 'scp', 'rsync', 'git', 'npm', 'node',
      'python', 'python3', 'pip', 'apt', 'apt-get', 'yum', 'dnf',
      'systemctl', 'service', 'docker', 'kubectl', 'vim', 'nano',
      'tail', 'head', 'less', 'more', 'sort', 'uniq', 'wc', 'diff',
      'bash', 'sh', 'zsh', 'make', 'gcc', 'g++', 'java', 'javac'
    ];
    
    // Comandos típicos de PowerShell/Windows
    const windowsCommands = [
      'get-', 'set-', 'new-', 'remove-', 'start-', 'stop-', 'test-',
      'dir', 'copy', 'move', 'del', 'type', 'cls', 'ipconfig',
      'netstat', 'tasklist', 'taskkill', 'reg', 'sc'
    ];
    
    // Verificar si es comando Linux
    if (linuxCommands.includes(baseCommand)) {
      return 'linux';
    }
    
    // Verificar si es comando Windows/PowerShell
    if (windowsCommands.some(win => baseCommand.startsWith(win))) {
      return 'windows';
    }
    
    // Por defecto, asumir Linux (ya que la mayoría de comandos dev son Linux)
    return 'linux';
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
          description: 'IMPORTANTE: Ejecuta comandos en la MÁQUINA LOCAL (no remota, no por SSH). Perfecta para: listar procesos locales, revisar servicios Windows, ejecutar scripts, obtener información del sistema. DIFERENTE de execute_ssh que usa máquinas remotas. Comandos Linux (ls, cat, pwd) usan WSL/Ubuntu. Comandos Windows (Get-Process, dir) usan PowerShell.',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'Comando a ejecutar en la MÁQUINA LOCAL (ej: "ls -la" o "Get-Process")'
              },
              workingDir: {
                type: 'string',
                description: 'Directorio de trabajo opcional'
              }
            },
            required: ['command']
          }
        },
        {
          name: 'execute_ssh',
          description: 'IMPORTANTE: Ejecuta un comando en un servidor remoto por SSH (máquina externa, no local). PRIMERO debe usar list_ssh_hosts para obtener el ID del servidor. El hostId es la identificación única del servidor remoto. Ejemplo: hostId="192.168.1.10_root_22" command="ls -la /home". Usa credenciales guardadas automáticamente.',
          inputSchema: {
            type: 'object',
            properties: {
              hostId: {
                type: 'string',
                description: 'ID único del servidor SSH remoto (ej: "192.168.1.10_root_22"). Obtener de list_ssh_hosts.'
              },
              command: {
                type: 'string',
                description: 'Comando Linux a ejecutar en el servidor remoto (ej: "ls -la", "pwd", "cat /etc/hostname")'
              }
            },
            required: ['hostId', 'command']
          }
        },
        {
          name: 'list_terminals',
          description: 'Lista las terminales locales disponibles: distribuciones WSL (Ubuntu, Kali, etc.), Cygwin, PowerShell. Usa esto para responder qué sistemas operativos están instalados.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'list_ssh_hosts',
          description: 'IMPORTANTE: Lista TODOS los servidores SSH remotos configurados en NodeTerm (desde la barra lateral). Devuelve: nombre del servidor, dirección IP/hostname, usuario SSH, puerto SSH, y estado de conexión. DIFERENTE de list_directory que lista archivos locales. Use esta herramienta SOLO para obtener la lista de servidores SSH disponibles, luego use execute_ssh para conectarse a uno específico.',
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
          description: 'Muestra qué comandos están permitidos y en qué directorios se pueden ejecutar.',
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
    const { command, workingDir } = args;
    
    // Validación de seguridad
    if (!this.isCommandAllowed(command)) {
      throw new Error(`❌ Comando no permitido: "${command}". Ver show_security_rules para comandos permitidos.`);
    }
    
    if (workingDir && !this.isPathAllowed(workingDir)) {
      throw new Error(`❌ Directorio no permitido: "${workingDir}". Debe estar en: ${this.allowedDir}`);
    }
    
    // 🤖 AUTO-DETECCIÓN SIEMPRE ACTIVA
    // El terminal se selecciona automáticamente basado en el tipo de comando
    let targetTerminal;
    {
      // Detectar tipo de comando
      const commandType = this.detectCommandType(command);
      
      // Obtener distribuciones WSL disponibles
      const wslDistros = await this.detectWSLDistros();
      const wslDistroIds = wslDistros.map(d => d.id);
      const hasCygwin = this.detectCygwinPath() !== null;
      
      if (commandType === 'linux') {
        // 🎯 PRIORIDAD CORRECTA: WSL primero, luego Cygwin
        // 1. Verificar si preferredTerminal está disponible y NO es powershell
        if (this.preferredTerminal && this.preferredTerminal !== 'powershell') {
          // Validar que el preferredTerminal esté realmente disponible
          if (this.preferredTerminal === 'wsl' && wslDistroIds.includes('ubuntu')) {
            targetTerminal = 'ubuntu';
          } else if (this.preferredTerminal === 'wsl' && wslDistros.length > 0) {
            targetTerminal = wslDistroIds[0];
          } else if (wslDistroIds.includes(this.preferredTerminal)) {
            targetTerminal = this.preferredTerminal;
          } else if (this.preferredTerminal === 'ubuntu') {
            // NUEVO: Buscar variantes de Ubuntu si "ubuntu" exacto no existe
            const ubuntuDistro = wslDistros.find(d => 
              d.id.startsWith('ubuntu-') || 
              d.name.toLowerCase().includes('ubuntu')
            );
            if (ubuntuDistro) {
              targetTerminal = ubuntuDistro.id;
            } else {
              targetTerminal = wslDistros.length > 0 ? wslDistroIds[0] : null;
            }
          } else if (this.preferredTerminal === 'cygwin' && hasCygwin) {
            targetTerminal = 'cygwin';
          } else {
            // preferredTerminal no disponible, hacer fallback
            console.warn(`⚠️ [Auto-detección] Terminal preferido "${this.preferredTerminal}" no disponible, usando fallback`);
            if (wslDistroIds.includes('ubuntu')) {
              targetTerminal = 'ubuntu';
            } else if (wslDistroIds.length > 0) {
              targetTerminal = wslDistroIds[0];
            } else if (hasCygwin) {
              targetTerminal = 'cygwin';
            } else {
              throw new Error(`❌ No hay terminales Linux disponibles. Terminal preferido "${this.preferredTerminal}" no está instalado.`);
            }
          }
        }
        // 2. Si no hay preferredTerminal válido, usar Ubuntu si está disponible
        else if (wslDistroIds.includes('ubuntu')) {
          targetTerminal = 'ubuntu';
        }
        // 3. Si no hay Ubuntu, usar primera distribución WSL disponible
        else if (wslDistroIds.length > 0) {
          targetTerminal = wslDistroIds[0];
        }
        // 4. Si no hay WSL, intentar Cygwin
        else if (hasCygwin) {
          targetTerminal = 'cygwin';
        }
        // 5. Error: no hay terminales Linux
        else {
          throw new Error(`❌ No hay terminales Linux disponibles. Comando "${command}" requiere Linux/WSL/Cygwin. Instala WSL o Cygwin.`);
        }
      } else {
        // Para comandos Windows, usar PowerShell
        targetTerminal = 'powershell';
      }
      
      console.log(`🤖 [Auto-detección] Comando "${command}" detectado como ${commandType} → usando ${targetTerminal}`);
    }
    
    // Ejecutar según el terminal
    let result;
    let terminalLabel = targetTerminal;
    
    // Detectar distribuciones WSL disponibles
    const wslDistros = await this.detectWSLDistros();
    const wslDistroIds = wslDistros.map(d => d.id);
    
    // 🔧 Construir label descriptivo para el resultado
    let displayLabel = terminalLabel;
    
    // Verificar disponibilidad del terminal ANTES de ejecutar
    if (targetTerminal === 'cygwin') {
      const cygwinPath = this.detectCygwinPath();
      if (!cygwinPath) {
        throw new Error(`❌ Cygwin no está disponible. Verifica que esté en resources/cygwin64 o en C:\\cygwin64. Terminales disponibles: wsl, ${wslDistroIds.join(', ')}, powershell`);
      }
    }
    
    if (targetTerminal === 'wsl' || wslDistroIds.includes(targetTerminal)) {
      // Es WSL o una distribución específica
      if (wslDistros.length === 0 && targetTerminal === 'wsl') {
        throw new Error(`❌ WSL no está disponible. Instala WSL o usa: cygwin, powershell`);
      }
      
      const distroName = targetTerminal === 'wsl' ? null : wslDistros.find(d => d.id === targetTerminal)?.name;
      
      if (targetTerminal !== 'wsl' && !distroName) {
        throw new Error(`❌ Distribución "${targetTerminal}" no encontrada. Distribuciones disponibles: ${wslDistroIds.join(', ')}`);
      }
      
      result = await this.executeInWSL(command, workingDir, distroName);
      displayLabel = distroName ? `wsl:${distroName}` : 'wsl';
    } else if (targetTerminal === 'cygwin') {
      result = await this.executeInCygwin(command, workingDir);
      displayLabel = 'cygwin';
    } else if (targetTerminal === 'powershell') {
      result = await this.executeInPowerShell(command, workingDir);
      displayLabel = 'powershell';
    } else {
      // Terminal desconocido - mostrar opciones disponibles
      const availableTerminals = ['wsl', ...wslDistroIds, 'cygwin', 'powershell'];
      throw new Error(`❌ Terminal desconocido: "${targetTerminal}". Terminales disponibles: ${availableTerminals.join(', ')}`);
    }
    
    return this.formatCommandResult(result, `local:${displayLabel}`);
  }

  /**
   * Ejecutar comando en WSL
   * @param {string} command - Comando a ejecutar
   * @param {string} workingDir - Directorio de trabajo (opcional)
   * @param {string} distroName - Nombre de la distribución específica (opcional, ej: "Ubuntu", "kali-linux")
   */
  async executeInWSL(command, workingDir, distroName = null) {
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
      
      // Construir argumentos para WSL
      const wslArgs = [];
      
      // Si se especifica una distribución, usar -d
      if (distroName) {
        wslArgs.push('-d', distroName);
      }
      
      // Agregar comando
      wslArgs.push('-e', 'bash', '-c', wslCommand);
      
      const process = spawn('wsl', wslArgs, {
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
        reject(new Error(`Error ejecutando WSL${distroName ? ` (${distroName})` : ''}: ${err.message}`));
      });
    });
  }

  /**
   * Ejecutar comando en Cygwin
   */
  /**
   * Detectar ruta de Cygwin (embebido o del sistema)
   */
  detectCygwinPath() {
    const fs = require('fs');
    const path = require('path');
    const { app } = require('electron');
    
    // 1. Buscar en resources de NodeTerm (embebido)
    const appPath = app.getAppPath();
    const resourcesCygwin = path.join(appPath, 'resources', 'cygwin64', 'bin', 'bash.exe');
    console.log(`🔍 [Cygwin] Buscando en resources: ${resourcesCygwin}`);
    if (fs.existsSync(resourcesCygwin)) {
      console.log(`✅ [Cygwin] Encontrado en resources`);
      return resourcesCygwin;
    }
    
    // 2. Buscar en instalación del sistema
    const systemCygwin = 'C:\\cygwin64\\bin\\bash.exe';
    console.log(`🔍 [Cygwin] Buscando en sistema: ${systemCygwin}`);
    if (fs.existsSync(systemCygwin)) {
      console.log(`✅ [Cygwin] Encontrado en sistema`);
      return systemCygwin;
    }
    
    console.log(`❌ [Cygwin] No encontrado en ninguna ubicación`);
    return null;
  }

  async executeInCygwin(command, workingDir) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        process.kill();
        reject(new Error(`Timeout después de ${this.commandTimeout}s`));
      }, this.commandTimeout * 1000);
      
      // Buscar bash de Cygwin (embebido o del sistema)
      const cygwinBash = this.detectCygwinPath();
      if (!cygwinBash) {
        clearTimeout(timeout);
        reject(new Error('Cygwin no está disponible. Instala Cygwin o verifica que resources/cygwin64 existe.'));
        return;
      }
      
      let cygwinCommand = command;
      if (workingDir) {
        // Convertir path de Windows a Cygwin
        const cygwinPath = workingDir.replace(/\\/g, '/').replace(/^([A-Z]):/i, (match, drive) => {
          return `/cygdrive/${drive.toLowerCase()}`;
        });
        cygwinCommand = `cd "${cygwinPath}" && ${command}`;
      }
      
      // Usar -l (login) para que Cygwin cargue el PATH y encuentre los comandos
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
    
    // 🔗 Buscar configuración del host (MCP + NodeTerm)
    const nodetermConnections = await this.loadNodeTermSSHConnections();
    const allConnections = [...this.sshConnections, ...nodetermConnections];
    
    // Intentar match exacto primero (ID completo)
    let hostConfig = allConnections.find(h => h.id === hostId);
    
    // Si no encuentra por ID exacto, intentar por nombre (insensible a mayúsculas)
    if (!hostConfig && hostId) {
      const lowerHostId = String(hostId).toLowerCase();
      hostConfig = allConnections.find(h => {
        // Buscar en: label (original del nodo), name, y id
        const cleanLabel = (h.label || '').toLowerCase();
        const cleanName = (h.name || '').split('[')[0].trim().toLowerCase();
        const cleanId = (h.id || '').toLowerCase();
        
        // Match exacto en cualquiera de los campos
        return (
          cleanLabel === lowerHostId ||
          cleanName === lowerHostId ||
          cleanId === lowerHostId ||
          cleanLabel.includes(lowerHostId) ||
          cleanName.includes(lowerHostId)
        );
      });
    }
    
    if (!hostConfig) {
      const availableLabels = allConnections.map(h => `"${h.label || h.name}"`).join(', ');
      const availableNames = allConnections.map(h => `"${h.name.split('[')[0].trim()}"`).join(', ');
      const availableIds = allConnections.map(h => `"${h.id}"`).slice(0, 5).join(', ');
      const availableMsg = allConnections.length > 0 
        ? `\n\n📌 Labels disponibles: ${availableLabels.substring(0, 200)}...\n📌 Nombres disponibles: ${availableNames.substring(0, 150)}\n📌 IDs disponibles: ${availableIds}${allConnections.length > 5 ? '... y más' : ''}`
        : `\n\n⚠️ No hay hosts SSH disponibles. Usa list_ssh_hosts para ver opciones.`;
      throw new Error(`❌ Host SSH no encontrado: "${hostId || 'undefined'}"${availableMsg}`);
    }
    
    // DEBUG: Log si tiene datos de Bastion
    console.log(`🔍 [SSH MCP] Configuración encontrada para: ${hostId}`);
    if (hostConfig.useBastionWallix) {
      console.log(`   🔗 BASTION WALLIX DETECTADO`);
      console.log(`      bastionHost: ${hostConfig.bastionHost}`);
      console.log(`      bastionUser: ${hostConfig.bastionUser}`);
      console.log(`      targetServer: ${hostConfig.targetServer}`);
    } else {
      console.log(`   ❌ NO ES BASTION (useBastionWallix=${hostConfig.useBastionWallix})`);
    }
    
    // Validación de seguridad
    if (!this.isCommandAllowed(command)) {
      throw new Error(`❌ Comando no permitido: "${command}". Ver show_security_rules para comandos permitidos.`);
    }
    
    // Obtener o crear conexión SSH
    let ssh = this.sshPool.get(hostId);
    
    if (!ssh || !ssh.isConnected || !ssh.isConnected()) {
      console.log(`🔌 [SSH Terminal MCP] Conectando a ${hostConfig.name} (${hostConfig.host})...`);
      
      // ⚠️ CONSTRUCCIÓN DE CONFIGURACIÓN SSH - Manejo especial para Bastion Wallix
      const sshConfig = {
        readyTimeout: 20000,
        keepaliveInterval: 60000
      };
      
      // Autenticación por password o llave privada (SIEMPRE requerida)
      if (hostConfig.password) {
        sshConfig.password = hostConfig.password;
      } else if (hostConfig.privateKey) {
        sshConfig.privateKey = hostConfig.privateKey;
      } else {
        throw new Error(`❌ Host ${hostId}: No se configuró password ni privateKey`);
      }
      
      // ✅ USAR EXACTAMENTE LA MISMA LÓGICA QUE LA APP
      // La app usa SSH2 con estos parámetros - simplemente replicar eso
      
      // Para Bastion Wallix: usar bastionUser como username y bastionHost como host
      if (hostConfig.useBastionWallix && hostConfig.bastionHost && hostConfig.bastionUser) {
        console.log(`🔗 [SSH Terminal MCP] BASTION Wallix - Conectando a través de ${hostConfig.bastionHost}`);
        sshConfig.host = hostConfig.bastionHost;
        sshConfig.port = parseInt(hostConfig.port) || 22;
        sshConfig.username = hostConfig.bastionUser; // Formato especial: rt01119@default@HOST:SSH:rt01119
      }
      // Para conexión directa: usar host y username normales
      else {
        console.log(`🔗 [SSH Terminal MCP] Conexión DIRECTA a ${hostConfig.host}`);
        sshConfig.host = hostConfig.host;
        sshConfig.port = parseInt(hostConfig.port) || 22;
        sshConfig.username = hostConfig.username || hostConfig.user;
      }
      
      console.log(`🔧 [SSH Terminal MCP] SSH - Host: "${sshConfig.host}:${sshConfig.port}" | Usuario: "${sshConfig.username}"`);
      
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
   * Detectar distribuciones WSL instaladas
   */
  async detectWSLDistros() {
    const distros = [];
    try {
      const { execSync } = require('child_process');
      // Ejecutar wsl --list --quiet para obtener lista de distribuciones
      const output = execSync('wsl --list --quiet', { 
        timeout: 3000, 
        windowsHide: true,
        encoding: 'utf16le' // WSL devuelve UTF-16LE
      }).toString();
      
      // Parsear las líneas (cada línea es una distribución)
      const lines = output.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/\0/g, '')); // Remover null bytes
      
      for (const distroName of lines) {
        if (distroName) {
          // Normalizar nombre para ID (minúsculas, sin espacios)
          const distroId = distroName.toLowerCase().replace(/\s+/g, '-');
          distros.push({
            id: distroId,
            name: distroName,
            fullName: `WSL (${distroName})`,
            type: 'wsl-distro'
          });
        }
      }
    } catch (e) {
      console.log('[SSH Terminal MCP] No se pudo detectar distribuciones WSL:', e.message);
    }
    return distros;
  }

  /**
   * TOOL: list_terminals - Listar terminales disponibles
   */
  async listTerminals() {
    const terminals = [];
    
    // Detectar distribuciones WSL específicas
    const wslDistros = await this.detectWSLDistros();
    if (wslDistros.length > 0) {
      // Agregar cada distribución como terminal separado
      for (const distro of wslDistros) {
        terminals.push({
          id: distro.id,
          name: distro.fullName,
          available: true,
          type: 'wsl',
          distro: distro.name,
          preferred: this.preferredTerminal === distro.id
        });
      }
      
      // Agregar WSL genérico también (usa la distribución por defecto)
      terminals.push({
        id: 'wsl',
        name: 'WSL (distribución por defecto)',
        available: true,
        type: 'wsl',
        preferred: this.preferredTerminal === 'wsl',
        note: 'Usa la distribución configurada como default en WSL'
      });
    } else {
      // WSL no disponible
      terminals.push({
        id: 'wsl',
        name: 'WSL (Windows Subsystem for Linux)',
        available: false,
        type: 'wsl',
        reason: 'No instalado o no disponible'
      });
    }
    
    // Detectar Cygwin (embebido en NodeTerm o instalación del sistema)
    const cygwinPath = this.detectCygwinPath();
    const cygwinAvailable = cygwinPath !== null;
    
    if (cygwinAvailable) {
      console.log('✅ [SSH Terminal] Cygwin encontrado:', cygwinPath);
    } else {
      console.log('⚠️ [SSH Terminal] Cygwin no encontrado');
    }
    
    terminals.push({
      id: 'cygwin',
      name: 'Cygwin',
      available: cygwinAvailable,
      type: 'cygwin',
      preferred: this.preferredTerminal === 'cygwin',
      ...(!cygwinAvailable && { reason: 'No instalado' }),
      ...(cygwinAvailable && { path: cygwinPath })
    });
    
    // PowerShell siempre disponible en Windows
    terminals.push({
      id: 'powershell',
      name: 'PowerShell',
      available: true,
      type: 'powershell',
      preferred: this.preferredTerminal === 'powershell'
    });
    
    const availableCount = terminals.filter(t => t.available).length;
    
    return {
      terminals,
      preferredTerminal: this.preferredTerminal,
      wslDistributions: wslDistros.length,
      summary: `${availableCount} terminales disponibles`,
      availableTerminals: terminals.filter(t => t.available).map(t => t.id)
    };
  }

  /**
   * TOOL: list_ssh_hosts - Listar hosts SSH configurados
   */
  async listSSHHosts() {
    // 🔗 Integrar conexiones de NodeTerm automáticamente
    const nodetermConnections = await this.loadNodeTermSSHConnections();
    const allConnections = [...this.sshConnections, ...nodetermConnections];
    
    if (allConnections.length === 0) {
      return '📡 **No hay hosts SSH configurados**\n\n' +
             '**Opciones:**\n' +
             '1. ✅ Agrega conexiones en NodeTerm (Sidebar → SSH)\n' +
             '2. ⚙️ Configura en MCP: Configuración → MCP Tools → SSH/Terminal\n\n' +
             '💡 Las conexiones de NodeTerm se detectan automáticamente!';
    }
    
    const hosts = allConnections.map(host => {
      const poolEntry = this.sshPool.get(host.id);
      const isConnected = poolEntry && poolEntry.isConnected && poolEntry.isConnected();
      const source = host._source === 'nodeterm' ? '🔗 NodeTerm' : '⚙️ MCP';
      
      return {
        id: host.id,
        name: `${host.name} [${source}]`,
        host: host.host,
        port: host.port || 22,
        username: host.username,
        status: isConnected ? 'connected' : 'disconnected',
        source: host._source || 'mcp',
        ...(isConnected && {
          connectedSince: new Date(poolEntry._createdAt).toISOString(),
          lastUsed: new Date(poolEntry._lastUsed).toISOString()
        })
      };
    });
    
    // Crear formato legible para presentar al modelo
    const hostsList = hosts
      .map((h, idx) => `${idx + 1}. **${h.name}**\n   🔑 ID: \`${h.id}\`\n   📍 Host: ${h.host}:${h.port}\n   👤 Usuario: ${h.username}\n   ⚡ Estado: ${h.status}`)
      .join('\n\n');
    
    const activeCount = hosts.filter(h => h.status === 'connected').length;
    
    // Crear mapeo de nombres a IDs para facilitar búsqueda
    const nameToIdMap = {};
    hosts.forEach(h => {
      const cleanName = h.name.split('[')[0].trim().toLowerCase();
      nameToIdMap[cleanName] = h.id;
    });
    
    // Devolver SOLO el texto formateado, no un objeto JSON
    const firstHostId = hosts.length > 0 ? hosts[0].id : 'ssh:host:usuario:22';
    
    return `✅ **${hosts.length} conexiones SSH disponibles**\n\n${hostsList}\n\n📊 **Resumen:**\n- Total configuradas: ${hosts.length}\n- Conexiones activas: ${activeCount}\n- Desde NodeTerm: ${nodetermConnections.length}\n\n**🔗 CÓMO CONECTAR:**\n\n✅ **MANERA FÁCIL (RECOMENDADO):**\nCuando el usuario mencione un nombre de host (ej: "conecta a Kepler"), usa directamente el parámetro:\n- \`hostId\`: El nombre exacto del host (ej: "Kepler")\n- \`command\`: El comando a ejecutar\n\nLos IDs disponibles son:\n${Object.entries(nameToIdMap).map(([name, id]) => `- "${name}" → ${id}`).slice(0, 20).join('\n')}${hosts.length > 20 ? `\n... y ${hosts.length - 20} más` : ''}\n\n**EJEMPLO:** Si el usuario dice "conecta a Kepler y lista archivos":\n- \`hostId\`: \`Kepler\`\n- \`command\`: \`ls -la\``;

  }

  /**
   * 🔗 Cargar conexiones SSH desde NodeTerm
   * Lee el archivo mcp-ssh-connections.json que se actualiza desde el renderer
   */
  async loadNodeTermSSHConnections() {
    try {
      // 💾 Conexiones almacenadas en memoria (sincronizadas vía IPC desde localStorage del renderer)
      // NO se guardan en archivo, viven en memoria durante la sesión
      // Las recibe el IPC handler en main.js cuando el renderer sincroniza
      console.log(`📂 [SSH Terminal MCP] Usando conexiones SSH sincronizadas desde el renderer (en memoria)`);
      
      let connections = this.nodeTermConnections || [];
      
      if (!Array.isArray(connections)) {
        console.warn(`⚠️ [SSH Terminal MCP] Conexiones no es un array válido`);
        return [];
      }
      
      console.log(`📊 [SSH Terminal MCP] Total de conexiones en memoria: ${connections.length}`);
      
      // Filtrar solo conexiones SSH válidas
      const sshConnections = connections
        .filter(conn => {
          // El campo puede ser "username" o "user" (NodeTerm usa "user")
          const username = conn.username || conn.user;
          const isValid = conn && conn.type === 'ssh' && conn.host && username;
          if (!isValid) {
            console.log(`🚫 [SSH Terminal MCP] Conexión descartada (falta host o usuario):`, conn);
          }
          return isValid;
        })
        .map(conn => {
          const username = conn.username || conn.user;
          return {
            id: conn.id || `nodeterm_${conn.host}_${username}`,
            name: conn.name || `${username}@${conn.host}`,
            host: conn.host,
            port: conn.port || 22,
            username: username,  // Normalizar siempre a "username"
            user: username,      // Mantener también "user" por compatibilidad
            password: conn.password || '',
            privateKey: conn.privateKey || '',
            _source: 'nodeterm',
            ...conn  // Incluir TODOS los campos originales
          };
        });
      
      console.log(`✅ [SSH Terminal MCP] Cargadas ${sshConnections.length} conexiones SSH válidas de NodeTerm`);
      sshConnections.forEach((conn, idx) => {
        console.log(`  [${idx}] ${conn.name} (${conn.host}:${conn.port})`);
      });
      return sshConnections;
      
    } catch (error) {
      // No es crítico, simplemente no hay conexiones de NodeTerm
      console.log(`ℹ️ [SSH Terminal MCP] Error cargando conexiones de NodeTerm:`, error.message);
      console.error(error.stack);
      return [];
    }
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
    
    // 🔧 Combinar stdout + stderr (muchos comandos usan stderr para output informativo)
    const combinedOutput = (stdout.trim() + '\n' + stderr.trim()).trim();
    
    let formatted = '';
    
    if (exitCode === 0) {
      // ✅ Éxito - mostrar solo resultado sin Exit Code
      formatted += `✅ Ejecutado en ${source}\n\n`;
      formatted += combinedOutput || '✓ Comando completado sin output';
    } else {
      // ❌ Error - mostrar Exit Code y error
      formatted += `❌ Error en ${source} (Exit Code: ${exitCode})\n\n`;
      formatted += combinedOutput || '(sin información de error)';
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

