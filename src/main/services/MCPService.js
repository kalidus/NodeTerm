/**
 * MCPService - Servicio principal para gestionar servidores MCP (Model Context Protocol)
 * 
 * Gestiona:
 * - Ejecución de MCPs externos vía npx
 * - Comunicación JSON-RPC 2.0 sobre stdio
 * - Lifecycle de MCPs: initialize, listTools, listResources, listPrompts, callTool
 * - Pool de MCPs activos con reinicio automático
 * - Persistencia de configuración en mcp-config.json
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const WebSearchNativeServer = require('./native/WebSearchNativeServer');
const SSHTerminalNativeServer = require('./native/SSHTerminalNativeServer');

// Note: En el main process no podemos usar import ES6, pero los logs irán al renderer
// El logging detallado se hará en consola del main process

class MCPService {
  constructor() {
    this.mcpProcesses = new Map(); // Map<serverId, MCPProcess>
    this.nativeFactories = new Map(); // Map<serverId, () => NativeServer>
    this.registerNativeFactories();
    this.mcpConfig = null;
    this.configPath = path.join(app.getPath('userData'), 'mcp-config.json');
    this.messageIdCounter = 0;
    this.pendingRequests = new Map(); // Map<messageId, {resolve, reject, timeout}>
    this.initialized = false;
    // Keepalive y logging
    this.keepaliveIntervalMs = 30000; // 30 segundos para heartbeat básico
    this.keepaliveTimeoutMs = 5000;
    this.keepaliveMaxFailures = 2;
    this.keepaliveTimers = new Map();
    this.verboseLogs = false;
    // 🔧 FIX: Rastrear última actividad para evitar refrescos innecesarios
    this.lastActivityByServer = new Map(); // Map<serverId, timestamp>
  }

  registerNativeFactories() {
    this.nativeFactories.set('web-search-native', (config) => new WebSearchNativeServer(config));
    this.nativeFactories.set('ssh-terminal', (config) => new SSHTerminalNativeServer(config));
  }

  /**
   * Inicializar el servicio MCP
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔧 [MCP] Inicializando servicio MCP...');
      await this.loadConfig();
      
      // Auto-iniciar MCPs configurados con autostart
      for (const [serverId, config] of Object.entries(this.mcpConfig.mcpServers || {})) {
        if (config.enabled && config.autostart) {
          try {
            await this.startMCPServer(serverId);
          } catch (error) {
            console.error(`❌ [MCP] Error auto-iniciando ${serverId}:`, error.message);
          }
        }
      }

      this.initialized = true;
      console.log('✅ [MCP] Servicio inicializado correctamente');
    } catch (error) {
      console.error('❌ [MCP] Error inicializando servicio:', error);
      throw error;
    }
  }

  /**
   * Cargar configuración desde archivo JSON
   */
  async loadConfig() {
    try {
      const configExists = await fs.access(this.configPath).then(() => true).catch(() => false);
      
      if (configExists) {
        const data = await fs.readFile(this.configPath, 'utf8');
        this.mcpConfig = JSON.parse(data);
        console.log(`📄 [MCP] Configuración cargada: ${Object.keys(this.mcpConfig.mcpServers || {}).length} servidores`);
        this.verboseLogs = !!this.mcpConfig.verbose || !!process.env.MCP_VERBOSE;
        
        // 🔒 AUTO-FIX: Corregir configuración de Tenable si está usando npx incorrecto
        const tenableConfig = this.mcpConfig.mcpServers?.tenable;
        if (tenableConfig && (tenableConfig.command === 'npx' || !tenableConfig.cwd || tenableConfig.cwd !== path.join(app.getAppPath(), 'src', 'mcp-servers', 'tenable'))) {
          console.log(`🔧 [MCP] Auto-corrigiendo configuración de Tenable al cargar...`);
          const projectRoot = app.getAppPath();
          const tenableDir = path.join(projectRoot, 'src', 'mcp-servers', 'tenable');
          const tenablePath = path.join(tenableDir, 'index.js');
          
          tenableConfig.command = 'node';
          tenableConfig.args = ['index.js'];
          tenableConfig.cwd = tenableDir; // CRÍTICO: Ejecutar desde el directorio donde están las dependencias
          
          // Guardar la configuración corregida
          await this.saveConfig();
          console.log(`   ✅ Configuración de Tenable corregida y guardada`);
          console.log(`   Comando: node index.js`);
          console.log(`   CWD: ${tenableDir}`);
        }
        
        // Migración/auto-fix: si cli-mcp-server no tiene cwd pero sí ALLOWED_DIR, usarlo como cwd
        // También asegurar que ALLOWED_FLAGS incluye flags de PowerShell por defecto
        try {
          const cfg = this.mcpConfig?.mcpServers || {};
          const cliCfg = cfg['cli-mcp-server'];
          let needsSave = false;
          
          if (cliCfg) {
            // Migración 1: establecer cwd si no existe pero sí ALLOWED_DIR
            if (!cliCfg.cwd && cliCfg.env && typeof cliCfg.env.ALLOWED_DIR === 'string' && cliCfg.env.ALLOWED_DIR.trim().length > 0) {
              cliCfg.cwd = cliCfg.env.ALLOWED_DIR;
              console.log(`🔧 [MCP] Ajuste automático: establecido cwd de cli-mcp-server a ${cliCfg.cwd}`);
              needsSave = true;
            }
            
            // Migración 2: asegurar que ALLOWED_FLAGS incluye flags de PowerShell
            const defaultPowerShellFlags = ['-command', '-Command', '-ExecutionPolicy', '-NoProfile', '-NonInteractive'];
            if (cliCfg.env && cliCfg.env.ALLOWED_FLAGS) {
              const currentFlags = cliCfg.env.ALLOWED_FLAGS;
              // Solo procesar si no es 'all' y no está vacío
              if (currentFlags.toLowerCase() !== 'all' && currentFlags.trim() !== '') {
                const existingFlags = currentFlags.split(',').map(f => f.trim()).filter(Boolean);
                const existingLower = existingFlags.map(f => f.toLowerCase());
                let addedFlags = false;
                
                // Agregar flags de PowerShell que no estén ya presentes
                defaultPowerShellFlags.forEach(flag => {
                  if (!existingLower.includes(flag.toLowerCase())) {
                    existingFlags.push(flag);
                    addedFlags = true;
                  }
                });
                
                if (addedFlags) {
                  cliCfg.env.ALLOWED_FLAGS = existingFlags.join(',');
                  console.log(`🔧 [MCP] Ajuste automático: agregadas flags de PowerShell a ALLOWED_FLAGS de cli-mcp-server`);
                  needsSave = true;
                }
              }
            } else if (cliCfg.env) {
              // Si ALLOWED_FLAGS no existe, usar valores por defecto recomendados (ya incluyen PowerShell)
              // Esto solo se aplica si el servidor está configurado pero no tiene ALLOWED_FLAGS definido
              // No lo hacemos automáticamente para no sobrescribir configuraciones intencionalmente vacías
            }
            
            if (needsSave) {
              await this.saveConfig();
            }
          }
        } catch (e) {
          console.warn('⚠️ [MCP] No se pudo aplicar migración para cli-mcp-server:', e.message);
        }
      } else {
        // Crear configuración por defecto
        this.mcpConfig = {
          mcpServers: {},
          version: '1.0.0',
          verbose: false
        };
        await this.saveConfig();
        console.log('📄 [MCP] Configuración por defecto creada');
      }
    } catch (error) {
      console.error('❌ [MCP] Error cargando configuración:', error);
      this.mcpConfig = { mcpServers: {}, version: '1.0.0' };
    }
  }

  /**
   * Guardar configuración a archivo JSON
   */
  async saveConfig() {
    try {
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.mcpConfig, null, 2),
        'utf8'
      );
      console.log('💾 [MCP] Configuración guardada');
    } catch (error) {
      console.error('❌ [MCP] Error guardando configuración:', error);
      throw error;
    }
  }

  /**
   * Iniciar servidor MCP
   */
  async startMCPServer(serverId) {
    // ✅ Si ya está corriendo, devolver éxito (idempotente)
    if (this.mcpProcesses.has(serverId)) {
      console.log(`ℹ️ [MCP] ${serverId} ya está en ejecución, devolviendo éxito`);
      return { success: true, serverId, alreadyRunning: true };
    }

    const config = this.mcpConfig.mcpServers[serverId];
    if (!config) {
      throw new Error(`Configuración no encontrada para MCP ${serverId}`);
    }

    if (!config.enabled) {
      throw new Error(`MCP ${serverId} está deshabilitado`);
    }

    if (config.type === 'native') {
      return this.startNativeMCPServer(serverId, config);
    }

    try {
      // Detectar plataforma ANTES de crear la variable local 'childProcess'
      const isWindows = process.platform === 'win32';
      
      // En Windows con shell: true, necesitamos construir el comando completo
      // envolviendo argumentos con espacios en comillas
      let spawnArgs = config.args;
      if (isWindows) {
        spawnArgs = config.args.map(arg => {
          // Si el argumento contiene espacios, envolverlo en comillas
          return arg.includes(' ') ? `"${arg}"` : arg;
        });
      }
      
      // 🔒 DEBUG: Log de variables de entorno para debugging (sin mostrar valores completos)
      if (config.env && Object.keys(config.env).length > 0) {
        const envSummary = Object.keys(config.env).map(key => {
          const value = config.env[key];
          const displayValue = value && value.length > 0 
            ? `${value.substring(0, 4)}...${value.length} chars` 
            : 'VACÍO';
          return `${key}=${displayValue}`;
        }).join(', ');
        console.log(`🔑 [MCP ${serverId}] Variables de entorno configuradas: ${envSummary}`);
      } else {
        console.log(`⚠️ [MCP ${serverId}] No hay variables de entorno configuradas en config.env`);
      }

      const childProcess = spawn(config.command, spawnArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: isWindows,
        cwd: config.cwd || undefined,
        env: {
          ...process.env,
          ...(config.env || {})
        }
      });

      const mcpProcess = {
        process: childProcess,
        serverId,
        config,
        state: 'starting',
        buffer: '',
        capabilities: null,
        tools: [],
        resources: [],
        prompts: [],
        keepaliveTimer: null,
        keepaliveFailures: 0,
        lastHeartbeatAt: 0,
        lastCapabilitiesRefreshAt: 0,
        keepaliveInFlight: false
      };

      this.mcpProcesses.set(serverId, mcpProcess);

      // Configurar handlers
      this.setupProcessHandlers(mcpProcess);

      // Inicializar el servidor MCP
      await this.initializeMCPServer(serverId);

      // Obtener capabilities
      await this.refreshServerCapabilities(serverId);

      // Iniciar keepalive
      this.startKeepalive(serverId);
      
      return { success: true, serverId };
    } catch (error) {
      this.mcpProcesses.delete(serverId);
      console.error(`❌ [MCP] Error iniciando ${serverId}:`, error);
      throw error;
    }
  }

  async startNativeMCPServer(serverId, config) {
    const factory =
      this.nativeFactories.get(serverId) ||
      this.nativeFactories.get(config.nativeType || config.id);

    if (!factory) {
      throw new Error(`No existe factory nativa registrada para ${serverId}`);
    }

    try {
      const bridge = factory({
        serverId,
        options: config.options || {},
        allowedDomains: config.allowedDomains || [],
        mode: config.mode || 'scraping'
      });

      this.mcpProcesses.set(serverId, {
        type: 'native',
        serverId,
        config,
        bridge,
        state: 'starting',
        tools: [],
        resources: [],
        prompts: [],
        capabilities: null
      });

      // 🔗 Guardar referencia global para SSH Terminal
      if (serverId === 'ssh-terminal') {
        global.sshTerminalServer = bridge;
      }

      await this.initializeMCPServer(serverId);
      await this.refreshServerCapabilities(serverId);

      const mcpProcess = this.mcpProcesses.get(serverId);
      if (mcpProcess) {
        mcpProcess.state = 'ready';
      }

      return { success: true, serverId };
    } catch (error) {
      this.mcpProcesses.delete(serverId);
      console.error(`❌ [MCP] Error iniciando servidor nativo ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Configurar handlers del proceso
   */
  setupProcessHandlers(mcpProcess) {
    const { process, serverId } = mcpProcess;

    // stdout: recibir respuestas JSON-RPC
    process.stdout.on('data', (data) => {
      this.handleStdoutData(serverId, data);
    });

    // stderr: logs y errores
    process.stderr.on('data', (data) => {
      const message = data.toString().trim();
      // 🔒 CRÍTICO: Siempre mostrar stderr para servidores que fallan
      if (message) {
        if (serverId === 'tenable' || this.verboseLogs) {
          console.error(`📝 [MCP ${serverId}] stderr:`, message);
        } else if (this.verboseLogs) {
          console.log(`📝 [MCP ${serverId}] stderr:`, message);
        }
      }
    });

    // exit: proceso terminado
    process.on('exit', (code, signal) => {
      if (code !== 0) {
        console.error(`❌ [MCP ${serverId}] Proceso terminado con ERROR (código: ${code}, señal: ${signal})`);
        console.error(`   Comando: ${mcpProcess.config.command} ${(mcpProcess.config.args || []).join(' ')}`);
        if (mcpProcess.config.cwd) {
          console.error(`   Directorio: ${mcpProcess.config.cwd}`);
        }
      } else {
        console.log(`🛑 [MCP ${serverId}] Proceso terminado (código: ${code}, señal: ${signal})`);
      }
      this.handleProcessExit(serverId, code, signal);
    });

    // error: error al iniciar proceso
    process.on('error', (error) => {
      console.error(`❌ [MCP ${serverId}] Error de proceso:`, error);
      mcpProcess.state = 'error';
    });
    
  }

  /**
   * Manejar datos de stdout (respuestas JSON-RPC)
   */
  handleStdoutData(serverId, data) {
    const mcpProcess = this.mcpProcesses.get(serverId);
    if (!mcpProcess) return;

    const dataStr = data.toString();
    if (this.verboseLogs) {
      console.log(`📥 [MCP ${serverId}] Datos en stdout:`, dataStr);
    }

    mcpProcess.buffer += dataStr;

    // Procesar mensajes completos (separados por newline)
    const lines = mcpProcess.buffer.split('\n');
    mcpProcess.buffer = lines.pop() || ''; // Guardar última línea incompleta


    for (const line of lines) {
      if (!line.trim()) continue;

      if (this.verboseLogs) {
        console.log(`   Procesando línea: ${line.substring(0, 120)}...`);
      }

      try {
        const message = JSON.parse(line);
        if (this.verboseLogs) {
          console.log(`   ✅ JSON parseado correctamente, tipo:`, message.method || 'response');
        }
        this.handleJSONRPCMessage(serverId, message);
      } catch (error) {
        console.error(`❌ [MCP ${serverId}] Error parseando JSON:`, error.message);
        if (this.verboseLogs) {
          console.error(`   Línea completa: ${line}`);
        }
      }
    }
  }

  /**
   * Manejar mensaje JSON-RPC recibido
   */
  handleJSONRPCMessage(serverId, message) {
    if (this.verboseLogs) {
      console.log(`🔔 [MCP ${serverId}] Mensaje JSON-RPC recibido:`, JSON.stringify(message, null, 2));
    } else {
      const id = message.id;
      const method = message.method || 'response';
      let summary = method;
      if (!message.method && message.result) {
        if (Array.isArray(message.result?.content)) {
          const first = message.result.content[0];
          const sample = typeof first?.text === 'string' ? first.text.substring(0, 80) : '';
          summary = `response(content[0]: "${sample}"${first?.text && first.text.length > 80 ? '…' : ''})`;
        } else if (message.result?.tools) {
          summary = `response(tools: ${message.result.tools.length})`;
        } else {
          summary = 'response(result)';
        }
      }
      if (this.verboseLogs) {
        console.log(`🔔 [MCP ${serverId}] Mensaje JSON-RPC recibido (#${id}): ${summary}`);
      }
    }
    
    // Respuesta a una petición nuestra
    if (message.id !== undefined) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);

        if (message.error) {
          console.error(`   ❌ Error en respuesta:`, message.error);
          pending.reject(new Error(`MCP Error: ${message.error.message || JSON.stringify(message.error)}`));
        } else {
          pending.resolve(message.result);
        }
      }
    }
    
    // Notificación del servidor (sin id)
    if (message.method && message.id === undefined) {
      if (this.verboseLogs) {
        console.log(`📨 [MCP ${serverId}] Notificación:`, message.method);
      }
    }
  }

  /**
   * Enviar petición JSON-RPC al servidor MCP
   */
  async sendRequest(serverId, method, params = {}, timeout = 60000) {
    const mcpProcess = this.mcpProcesses.get(serverId);
    if (!mcpProcess) {
      throw new Error(`MCP ${serverId} no está en ejecución`);
    }

    if (mcpProcess.type === 'native') {
      return this.sendNativeRequest(serverId, mcpProcess, method, params);
    }

    const id = ++this.messageIdCounter;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    if (this.verboseLogs) {
      console.log(`📤 [MCP ${serverId}] Enviando request #${id}: ${method}`);
      console.log(`   Params:`, JSON.stringify(params, null, 2));
    }

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        console.error(`⏱️ [MCP ${serverId}] TIMEOUT en request #${id} (${method}) después de ${timeout}ms`);
        console.error(`   Peticiones pendientes:`, this.pendingRequests.size);
        reject(new Error(`Timeout esperando respuesta de ${method} en ${serverId}`));
      }, timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout: timeoutHandle });

      try {
        const message = JSON.stringify(request) + '\n';
        if (this.verboseLogs) {
          console.log(`📝 [MCP ${serverId}] Escribiendo en stdin:`, message.trim());
        }
        mcpProcess.process.stdin.write(message);
      } catch (error) {
        clearTimeout(timeoutHandle);
        this.pendingRequests.delete(id);
        console.error(`❌ [MCP ${serverId}] Error escribiendo en stdin:`, error);
        reject(error);
      }
    });
  }

  async sendNativeRequest(serverId, mcpProcess, method, params = {}) {
    if (!mcpProcess.bridge || typeof mcpProcess.bridge.handleRequest !== 'function') {
      throw new Error(`MCP ${serverId} no tiene bridge nativo válido`);
    }

    console.log(`📤 [MCP ${serverId}] (nativo) Ejecutando ${method}`);
    if (this.verboseLogs) {
      console.log(`   Params:`, JSON.stringify(params, null, 2));
    }

    try {
      const result = await mcpProcess.bridge.handleRequest(method, params);
      return result;
    } catch (error) {
      console.error(`❌ [MCP ${serverId}] Error en request nativa ${method}:`, error);
      throw error;
    }
  }

  /**
   * Inicializar servidor MCP (handshake)
   */
  async initializeMCPServer(serverId) {
    const result = await this.sendRequest(serverId, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: {
          listChanged: true
        },
        sampling: {}
      },
      clientInfo: {
        name: 'NodeTerm',
        version: '1.6.2'
      }
    });

    const mcpProcess = this.mcpProcesses.get(serverId);
    if (mcpProcess) {
      mcpProcess.capabilities = result.capabilities;
      mcpProcess.state = 'ready';
      console.log(`✅ [MCP ${serverId}] Handshake completado`);
      console.log(`   Capabilities:`, JSON.stringify({
        tools: result.capabilities?.tools ? 'soportado' : 'no soportado',
        resources: result.capabilities?.resources ? 'soportado' : 'no soportado',
        prompts: result.capabilities?.prompts ? 'soportado' : 'no soportado'
      }));
    }

    // Enviar initialized notification
    await this.sendNotification(serverId, 'notifications/initialized');

    return result;
  }

  /**
   * Enviar notificación (sin esperar respuesta)
   */
  async sendNotification(serverId, method, params = {}) {
    const mcpProcess = this.mcpProcesses.get(serverId);
    if (!mcpProcess) {
      throw new Error(`MCP ${serverId} no está en ejecución`);
    }

     if (mcpProcess.type === 'native') {
       if (mcpProcess.bridge && typeof mcpProcess.bridge.handleNotification === 'function') {
         await mcpProcess.bridge.handleNotification(method, params);
       }
       return;
     }

    const notification = {
      jsonrpc: '2.0',
      method,
      params
    };

    const message = JSON.stringify(notification) + '\n';
    mcpProcess.process.stdin.write(message);
  }

  /**
   * Refrescar capabilities del servidor (tools, resources, prompts)
   */
  async refreshServerCapabilities(serverId) {
    const mcpProcess = this.mcpProcesses.get(serverId);
    if (!mcpProcess) {
      console.warn(`⚠️ [MCP ${serverId}] No se puede refrescar capabilities: proceso no existe`);
      return;
    }
    
    if (mcpProcess.state !== 'ready') {
      console.warn(`⚠️ [MCP ${serverId}] No se puede refrescar capabilities: estado es '${mcpProcess.state}' (necesita 'ready')`);
      return;
    }

    try {
      // Listar tools - SIEMPRE intentar si el servidor está ready, incluso si capabilities no lo indica explícitamente
      // Algunos servidores MCP pueden no reportar capabilities.tools pero sí tener tools
      const shouldListTools = mcpProcess.capabilities?.tools !== false; // true si no está explícitamente en false
      
      if (shouldListTools) {
        try {
          const toolsResult = await this.sendRequest(serverId, 'tools/list');
          const newTools = toolsResult.tools || [];
          const previousToolsCount = mcpProcess.tools?.length || 0;
          const toolsChanged = previousToolsCount !== newTools.length || 
            JSON.stringify(mcpProcess.tools?.map(t => t.name).sort()) !== JSON.stringify(newTools.map(t => t.name).sort());
          
          mcpProcess.tools = newTools;
          
          // 🔧 FIX: Solo loguear cuando hay cambios o es la primera vez
          if (toolsChanged || previousToolsCount === 0) {
            console.log(`🔧 [MCP ${serverId}] Tools disponibles: ${mcpProcess.tools.length}`);
            
            // Log de nombres de herramientas solo si hay cambios o es primera vez
            if (mcpProcess.tools.length > 0) {
              const toolNames = mcpProcess.tools.map(t => t.name).join(', ');
              console.log(`   Herramientas: ${toolNames}`);
            } else {
              console.warn(`⚠️ [MCP ${serverId}] Servidor reporta 0 herramientas`);
            }
          }
        } catch (error) {
          console.error(`❌ [MCP ${serverId}] Error obteniendo tools:`, error.message);
          // No fallar completamente, continuar con resources y prompts
        }
      } else {
        // Solo loguear si verboseLogs está activo
        if (this.verboseLogs) {
          console.log(`ℹ️ [MCP ${serverId}] Servidor no reporta soporte para tools`);
        }
      }

      // Listar resources
      if (mcpProcess.capabilities?.resources) {
        const resourcesResult = await this.sendRequest(serverId, 'resources/list');
        mcpProcess.resources = resourcesResult.resources || [];
        if (this.verboseLogs) {
          console.log(`📦 [MCP ${serverId}] Resources disponibles: ${mcpProcess.resources.length}`);
        }
      }

      // Listar prompts
      if (mcpProcess.capabilities?.prompts) {
        const promptsResult = await this.sendRequest(serverId, 'prompts/list');
        mcpProcess.prompts = promptsResult.prompts || [];
        if (this.verboseLogs) {
          console.log(`💬 [MCP ${serverId}] Prompts disponibles: ${mcpProcess.prompts.length}`);
        }
      }
    } catch (error) {
      console.error(`❌ [MCP ${serverId}] Error refrescando capabilities:`, error.message);
    }
  }

  /**
   * Detener servidor MCP
   */
  async stopMCPServer(serverId) {
    const mcpProcess = this.mcpProcesses.get(serverId);
    if (!mcpProcess) {
      return { success: false, error: 'Servidor no está en ejecución' };
    }

    console.log(`🛑 [MCP] Deteniendo ${serverId}...`);

    try {
      // Limpiar peticiones pendientes
      for (const [id, pending] of this.pendingRequests.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Servidor MCP detenido'));
      }
      this.pendingRequests.clear();

      if (mcpProcess.type === 'native') {
        if (mcpProcess.bridge && typeof mcpProcess.bridge.shutdown === 'function') {
          await mcpProcess.bridge.shutdown();
        }
        this.mcpProcesses.delete(serverId);
        console.log(`✅ [MCP] ${serverId} (nativo) detenido`);
        return { success: true };
      }

      // Terminar proceso
      mcpProcess.process.kill('SIGTERM');
      
      // Timeout para force kill
      setTimeout(() => {
        if (this.mcpProcesses.has(serverId)) {
          mcpProcess.process.kill('SIGKILL');
        }
      }, 5000);

      this.mcpProcesses.delete(serverId);
      console.log(`✅ [MCP] ${serverId} detenido`);

      return { success: true };
    } catch (error) {
      console.error(`❌ [MCP] Error deteniendo ${serverId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Manejar salida del proceso
   */
  handleProcessExit(serverId, code, signal) {
    const mcpProcess = this.mcpProcesses.get(serverId);
    if (!mcpProcess) return;

    const config = mcpProcess.config;

    // Detener keepalive en cualquier caso
    this.stopKeepalive(serverId);

    // Si tiene restart automático habilitado y no fue detenido manualmente
    if (config.autoRestart && mcpProcess.state === 'ready') {
      console.log(`🔄 [MCP ${serverId}] Reiniciando automáticamente...`);
      
      this.mcpProcesses.delete(serverId);
      
      setTimeout(() => {
        this.startMCPServer(serverId).catch(error => {
          console.error(`❌ [MCP ${serverId}] Error en reinicio automático:`, error);
        });
      }, 2000);
    } else {
      this.mcpProcesses.delete(serverId);
    }
  }

  // ===== Keepalive =====
  startKeepalive(serverId) {
    const proc = this.mcpProcesses.get(serverId);
    if (!proc) return;
    if (proc.keepaliveTimer || this.keepaliveTimers.has(serverId)) return;

      const tick = async () => {
      const m = this.mcpProcesses.get(serverId);
      if (!m || m.state !== 'ready') return;
      if (m.keepaliveInFlight) return;
      m.keepaliveInFlight = true;
      try {
        // 🔧 FIX: Solo hacer heartbeat básico, sin refrescar capabilities constantemente
        await this.sendRequest(serverId, 'tools/list', {}, this.keepaliveTimeoutMs);
        m.keepaliveFailures = 0;
        m.lastHeartbeatAt = Date.now();
        
        // 🔧 FIX: Solo refrescar capabilities si:
        // 1. Es la primera vez (no hay timestamp)
        // 2. Ha pasado más de 5 minutos desde el último refresh
        // 3. Ha habido actividad reciente (últimos 2 minutos)
        const now = Date.now();
        const lastActivity = this.lastActivityByServer.get(serverId) || 0;
        const timeSinceLastActivity = now - lastActivity;
        const timeSinceLastRefresh = now - (m.lastCapabilitiesRefreshAt || 0);
        const shouldRefresh = !m.lastCapabilitiesRefreshAt || 
          (timeSinceLastRefresh > 300000 && timeSinceLastActivity < 120000); // 5 min sin refresh Y actividad reciente
        
        if (shouldRefresh) {
          m.lastCapabilitiesRefreshAt = now;
          this.refreshServerCapabilities(serverId).catch(() => {});
        }
      } catch (e) {
        m.keepaliveFailures = (m.keepaliveFailures || 0) + 1;
        console.warn(`⚠️ [MCP ${serverId}] Keepalive fallo #${m.keepaliveFailures}: ${e.message}`);
        if (m.keepaliveFailures >= this.keepaliveMaxFailures) {
          console.warn(`🔁 [MCP ${serverId}] Reinicio por keepalive fallido`);
          this.stopKeepalive(serverId);
          this.mcpProcesses.delete(serverId);
          this.startMCPServer(serverId).catch(err => console.error(`❌ [MCP ${serverId}] Error reiniciando:`, err.message));
          m.keepaliveInFlight = false;
          return;
        }
      }
      m.keepaliveInFlight = false;
    };

    const t = setInterval(tick, this.keepaliveIntervalMs);
    proc.keepaliveTimer = t;
    this.keepaliveTimers.set(serverId, t);
  }

  stopKeepalive(serverId) {
    const proc = this.mcpProcesses.get(serverId);
    if (!proc) return;
    if (proc.keepaliveTimer) {
      clearInterval(proc.keepaliveTimer);
      proc.keepaliveTimer = null;
    }
    if (this.keepaliveTimers.has(serverId)) {
      clearInterval(this.keepaliveTimers.get(serverId));
      this.keepaliveTimers.delete(serverId);
    }
  }

  /**
   * Instalar nuevo servidor MCP
   */
  async installMCPServer(serverId, config) {
    console.log(`📦 [MCP Service] Instalando servidor: ${serverId}`);
    console.log('   Config recibida:', JSON.stringify(config, null, 2));
    
    if (this.mcpConfig.mcpServers[serverId]) {
      console.log(`⚠️ [MCP Service] ${serverId} ya está instalado`);
      throw new Error(`MCP ${serverId} ya está instalado`);
    }

    let fullConfig;

    if (config.type === 'native') {
      fullConfig = {
        type: 'native',
        enabled: config.enabled !== undefined ? config.enabled : true,
        autostart: config.autostart !== undefined ? config.autostart : false,
        autoRestart: false,
        mode: config.mode || 'scraping',
        renderMode: config.renderMode || 'static',
        options: config.options || {},
        allowedDomains: config.allowedDomains || []
      };
    } else {
      if (!config.command || !config.args) {
        console.error('❌ [MCP Service] Configuración inválida:', config);
        throw new Error('Configuración inválida: se requiere command y args');
      }

      fullConfig = {
        ...config,
        enabled: config.enabled !== undefined ? config.enabled : true,
        autostart: config.autostart !== undefined ? config.autostart : false, // Cambiar a false por defecto
        autoRestart: config.autoRestart !== undefined ? config.autoRestart : true
      };
    }

    console.log('   Config completa:', JSON.stringify(fullConfig, null, 2));

    this.mcpConfig.mcpServers[serverId] = fullConfig;
    await this.saveConfig();

    console.log(`✅ [MCP Service] ${serverId} instalado correctamente`);
    console.log(`   Configuración guardada en: ${this.configPath}`);

    return { success: true, serverId };
  }

  /**
   * Desinstalar servidor MCP
   */
  async uninstallMCPServer(serverId) {
    // Detener si está corriendo
    if (this.mcpProcesses.has(serverId)) {
      await this.stopMCPServer(serverId);
    }

    delete this.mcpConfig.mcpServers[serverId];
    await this.saveConfig();

    console.log(`✅ [MCP] ${serverId} desinstalado`);

    return { success: true };
  }

  /**
   * Actualizar configuración de un servidor MCP (y reiniciar si está corriendo)
   */
  async updateMCPServerConfig(serverId, newConfig) {
    const existing = this.mcpConfig.mcpServers[serverId];
    if (!existing) {
      return { success: false, error: `MCP ${serverId} no encontrado` };
    }
    
    // 🔒 AUTO-FIX: Si Tenable está usando npx con paquete inexistente, corregir automáticamente
    if (serverId === 'tenable') {
      const projectRoot = app.getAppPath();
      const tenableDir = path.join(projectRoot, 'src', 'mcp-servers', 'tenable');
      const correctCwd = tenableDir;
      
      if (existing.command === 'npx' || existing.cwd !== correctCwd) {
        console.log(`🔧 [MCP Service] Auto-corrigiendo configuración de Tenable...`);
        
        existing.command = 'node';
        existing.args = ['index.js'];
        existing.cwd = correctCwd; // CRÍTICO: Ejecutar desde el directorio donde están las dependencias
        console.log(`   Comando corregido: node index.js`);
        console.log(`   CWD: ${correctCwd}`);
      }
    }

    let merged;

    if (existing.type === 'native') {
      // 🔧 Lógica específica para ssh-terminal
      if (serverId === 'ssh-terminal') {
        merged = {
          ...existing,
          ...newConfig,
          enabled: newConfig.enabled !== undefined ? newConfig.enabled : existing.enabled,
          autostart: newConfig.autostart !== undefined ? newConfig.autostart : existing.autostart,
          options: {
            preferredTerminal: newConfig.options?.preferredTerminal || existing.options?.preferredTerminal || 'wsl',
            allowedDir: newConfig.options?.allowedDir || existing.options?.allowedDir || '',
            allowedCommands: newConfig.options?.allowedCommands || existing.options?.allowedCommands || 'all',
            commandTimeout: newConfig.options?.commandTimeout || existing.options?.commandTimeout || 30,
            sshConnections: Array.isArray(newConfig.options?.sshConnections) 
              ? newConfig.options.sshConnections 
              : (existing.options?.sshConnections || [])
          }
        };
      } 
      // 🔧 Lógica específica para web-search-native
      else {
        merged = {
          ...existing,
          ...newConfig,
          mode: newConfig.mode || existing.mode || 'scraping',
          renderMode: newConfig.renderMode || existing.renderMode || 'static',
          options: { ...(existing.options || {}), ...(newConfig.options || {}) },
          allowedDomains: Array.isArray(newConfig.allowedDomains) ? newConfig.allowedDomains : (existing.allowedDomains || [])
        };
      }
    } else {
      merged = {
        ...existing,
        ...newConfig,
        args: Array.isArray(newConfig.args) ? newConfig.args : (existing.args || []),
        env: { ...(existing.env || {}), ...(newConfig.env || {}) }
      };
    }
    
    console.log(`💾 [MCP] Guardando configuración para ${serverId}:`, JSON.stringify(merged, null, 2));
    this.mcpConfig.mcpServers[serverId] = merged;
    await this.saveConfig();

    // Reiniciar si está corriendo para aplicar cambios
    if (this.mcpProcesses.has(serverId)) {
      await this.stopMCPServer(serverId);
      await this.startMCPServer(serverId);
    }

    return { success: true };
  }

  /**
   * Activar/desactivar servidor MCP
   */
  async toggleMCPServer(serverId, enabled) {
    const config = this.mcpConfig.mcpServers[serverId];
    if (!config) {
      throw new Error(`MCP ${serverId} no encontrado`);
    }

    config.enabled = enabled;
    await this.saveConfig();

    // Si se desactiva y está corriendo, detenerlo
    if (!enabled && this.mcpProcesses.has(serverId)) {
      await this.stopMCPServer(serverId);
    }

    // Si se activa, iniciarlo
    if (enabled && !this.mcpProcesses.has(serverId)) {
      await this.startMCPServer(serverId);
    }

    return { success: true };
  }

  /**
   * Listar servidores instalados
   */
  listInstalledServers() {
    const servers = [];
    
    for (const [serverId, config] of Object.entries(this.mcpConfig.mcpServers || {})) {
      const isRunning = this.mcpProcesses.has(serverId);
      const mcpProcess = this.mcpProcesses.get(serverId);

      servers.push({
        id: serverId,
        config,
        running: isRunning,
        state: mcpProcess?.state || 'stopped',
        toolsCount: mcpProcess?.tools.length || 0,
        resourcesCount: mcpProcess?.resources.length || 0,
        promptsCount: mcpProcess?.prompts.length || 0
      });
    }

    return servers;
  }

  /**
   * Listar todas las tools disponibles de todos los MCPs activos
   */
  listAllTools() {
    const tools = [];

    for (const [serverId, mcpProcess] of this.mcpProcesses.entries()) {
      if (mcpProcess.state === 'ready' && mcpProcess.tools) {
        for (const tool of mcpProcess.tools) {
          tools.push({
            ...tool,
            serverId,
            serverName: serverId
          });
        }
      }
    }

    return tools;
  }

  /**
   * Listar todos los resources disponibles
   */
  listAllResources() {
    const resources = [];

    for (const [serverId, mcpProcess] of this.mcpProcesses.entries()) {
      if (mcpProcess.state === 'ready' && mcpProcess.resources) {
        for (const resource of mcpProcess.resources) {
          resources.push({
            ...resource,
            serverId,
            serverName: serverId
          });
        }
      }
    }

    return resources;
  }

  /**
   * Listar todos los prompts disponibles
   */
  listAllPrompts() {
    const prompts = [];

    for (const [serverId, mcpProcess] of this.mcpProcesses.entries()) {
      if (mcpProcess.state === 'ready' && mcpProcess.prompts) {
        for (const prompt of mcpProcess.prompts) {
          prompts.push({
            ...prompt,
            serverId,
            serverName: serverId
          });
        }
      }
    }

    return prompts;
  }

  /**
   * Llamar a una tool específica
   */
  async callTool(serverId, toolName, args = {}) {
    // 🔧 FIX: Marcar actividad cuando se usa una herramienta
    this.lastActivityByServer.set(serverId, Date.now());
    
    const mcpProcess = this.mcpProcesses.get(serverId);
    if (!mcpProcess) {
      throw new Error(`MCP ${serverId} no está en ejecución`);
    }

    if (mcpProcess.state !== 'ready') {
      throw new Error(`MCP ${serverId} no está listo (estado: ${mcpProcess.state})`);
    }

    console.log(`🔧 [MCP ${serverId}] Llamando tool: ${toolName}`);
    console.log(`   Argumentos:`, JSON.stringify(args, null, 2));
    
    // 🔒 DEBUG: Validar que toolName no sea undefined
    if (!toolName || toolName === 'undefined') {
      console.error(`❌ [MCP ${serverId}] ERROR: toolName es undefined o inválido`);
      console.error(`   Tipo: ${typeof toolName}`);
      console.error(`   Valor: ${toolName}`);
      throw new Error(`Nombre de herramienta inválido: ${toolName}`);
    }

    try {
      const requestParams = {
        name: toolName,
        arguments: args || {}
      };
      
      console.log(`📤 [MCP ${serverId}] Enviando request tools/call con:`, JSON.stringify(requestParams, null, 2));
      
      const result = await this.sendRequest(serverId, 'tools/call', requestParams, 60000); // 60s timeout para tools

      console.log(`✅ [MCP ${serverId}] Tool ${toolName} ejecutada correctamente`);
      
      return result;
    } catch (error) {
      console.error(`❌ [MCP ${serverId}] Error ejecutando tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Obtener un resource específico
   */
  async getResource(serverId, resourceUri) {
    const mcpProcess = this.mcpProcesses.get(serverId);
    if (!mcpProcess) {
      throw new Error(`MCP ${serverId} no está en ejecución`);
    }

    console.log(`📦 [MCP ${serverId}] Obteniendo resource: ${resourceUri}`);

    try {
      const result = await this.sendRequest(serverId, 'resources/read', {
        uri: resourceUri
      });

      console.log(`✅ [MCP ${serverId}] Resource obtenido correctamente`);
      
      return result;
    } catch (error) {
      console.error(`❌ [MCP ${serverId}] Error obteniendo resource:`, error);
      throw error;
    }
  }

  /**
   * Obtener un prompt con sus argumentos
   */
  async getPrompt(serverId, promptName, args = {}) {
    const mcpProcess = this.mcpProcesses.get(serverId);
    if (!mcpProcess) {
      throw new Error(`MCP ${serverId} no está en ejecución`);
    }

    console.log(`💬 [MCP ${serverId}] Obteniendo prompt: ${promptName}`);

    try {
      const result = await this.sendRequest(serverId, 'prompts/get', {
        name: promptName,
        arguments: args
      });

      console.log(`✅ [MCP ${serverId}] Prompt obtenido correctamente`);
      
      return result;
    } catch (error) {
      console.error(`❌ [MCP ${serverId}] Error obteniendo prompt:`, error);
      throw error;
    }
  }

  /**
   * Limpiar todos los procesos (al cerrar la app)
   */
  async cleanup() {
    console.log(`🧹 [MCP] Limpiando ${this.mcpProcesses.size} servidores...`);

    const stopPromises = [];
    for (const serverId of this.mcpProcesses.keys()) {
      stopPromises.push(this.stopMCPServer(serverId));
    }

    await Promise.allSettled(stopPromises);
    
    console.log('✅ [MCP] Limpieza completada');
  }
}

// Singleton instance
const mcpService = new MCPService();

module.exports = {
  mcpService,
  MCPService
};

