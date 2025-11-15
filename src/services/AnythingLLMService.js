const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const util = require('util');

const execAsync = util.promisify(exec);

let electronApp = null;
try {
  electronApp = require('electron').app;
} catch (_) {
  electronApp = null;
}

function getUserDataDir() {
  try {
    if (electronApp && typeof electronApp.getPath === 'function') {
      return electronApp.getPath('userData');
    }
  } catch (_) {}
  return path.join(os.homedir(), '.nodeterm');
}

class AnythingLLMService {
  constructor() {
    this.imageName = (process.env.NODETERM_ANYTHINGLLM_IMAGE || 'mintplexlabs/anythingllm:latest').trim();
    this.containerName = (process.env.NODETERM_ANYTHINGLLM_CONTAINER || 'nodeterm-anythingllm').trim();
    this.hostPort = parseInt(process.env.NODETERM_ANYTHINGLLM_PORT, 10) || 3001;
    this.containerPort = 3001;
    const configuredBase = (process.env.NODETERM_ANYTHINGLLM_URL || `http://127.0.0.1:${this.hostPort}`).replace(/\/$/, '');
    this.baseUrl = configuredBase;
    this.healthUrl = `${configuredBase}/api/health`;
    this.healthTimeoutMs = 90_000;
    this.healthIntervalMs = 2_000;
    this.ensurePromise = null;
    this.lastHealthCheck = null;
    this.lastError = null;
    this._dockerCommand = null;

    this.status = {
      isRunning: false,
      phase: 'idle',
      message: 'Servicio AnythingLLM inactivo',
      url: null,
      containerName: this.containerName,
      dataDir: null,
      lastError: null
    };

    this.dataDir = this._resolveDataDir();
    this.status.dataDir = this.dataDir;
  }

  _resolveDataDir() {
    const custom = (process.env.NODETERM_ANYTHINGLLM_DATA || '').trim();
    if (custom) {
      try {
        fs.mkdirSync(custom, { recursive: true });
        return custom;
      } catch (error) {
        console.warn('[AnythingLLM] No se pudo crear el directorio personalizado, usando userData:', error.message);
      }
    }
    const dir = path.join(getUserDataDir(), 'anythingllm-data');
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (_) {}
    return dir;
  }

  resolveDockerCommand() {
    if (this._dockerCommand) return this._dockerCommand;
    let candidate = 'docker';
    if (process.platform === 'darwin') {
      candidate = '/usr/local/bin/docker';
    } else if (process.platform === 'win32') {
      const possible = [
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Docker', 'Docker', 'resources', 'bin', 'docker.exe')
      ];
      candidate = possible.find(fs.existsSync) || 'docker';
    } else {
      candidate = '/usr/bin/docker';
    }

    if (candidate && candidate !== 'docker' && candidate !== 'docker.exe' && !fs.existsSync(candidate)) {
      candidate = 'docker';
    }

    this._dockerCommand = candidate;
    return this._dockerCommand;
  }

  buildDockerCommand(args) {
    const binary = this.resolveDockerCommand();
    const needsQuotes = /\s/.test(binary);
    const quoted = needsQuotes ? `"${binary}"` : binary;
    if (!args) return quoted;
    return `${quoted} ${args}`.trim();
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async start() {
    return this.ensureContainerRunning();
  }

  async ensureContainerRunning() {
    if (this.ensurePromise) {
      return this.ensurePromise;
    }
    this.ensurePromise = this._ensureContainerRunning()
      .catch((error) => {
        this.lastError = error;
        this.status.isRunning = false;
        this.status.phase = 'error';
        this.status.message = error.message || 'Error iniciando AnythingLLM';
        this.status.lastError = this.status.message;
        throw error;
      })
      .finally(() => {
        this.ensurePromise = null;
      });
    return this.ensurePromise;
  }

  async _ensureContainerRunning() {
    await this.ensureDockerAvailable();
    await this.ensureImagePresent();
    await this.ensureDataDir();

    const running = await this.isContainerRunning();
    if (!running) {
      const exists = await this.isContainerExisting();
      if (exists) {
        await this.removeContainer();
      }
      await this.startContainer();
    } else {
      this.status.phase = 'running';
      this.status.message = 'Contenedor AnythingLLM en ejecución';
    }

    await this.waitForHealth();

    this.status.isRunning = true;
    this.status.phase = 'ready';
    this.status.message = 'AnythingLLM listo';
    this.status.url = this.getBaseUrl();
    this.status.lastError = null;

    return this.getStatus();
  }

  async ensureDockerAvailable() {
    this.status.phase = 'docker-check';
    this.status.message = 'Verificando Docker Desktop';

    try {
      await execAsync(this.buildDockerCommand('--version'));
    } catch (_) {
      try {
        await execAsync('docker --version');
        this._dockerCommand = 'docker';
      } catch (error) {
        throw new Error('Docker no está instalado o no se encuentra en el PATH.');
      }
    }

    try {
      await execAsync(this.buildDockerCommand('info'));
    } catch (error) {
      throw new Error('Docker Desktop no está en ejecución. Inícialo e inténtalo nuevamente.');
    }
  }

  async ensureImagePresent() {
    this.status.phase = 'image';
    this.status.message = 'Verificando imagen AnythingLLM';
    try {
      await execAsync(this.buildDockerCommand(`image inspect ${this.imageName}`));
    } catch (_) {
      this.status.message = 'Descargando imagen AnythingLLM...';
      await execAsync(this.buildDockerCommand(`pull ${this.imageName}`));
    }
  }

  async ensureDataDir() {
    this.status.phase = 'volume';
    this.status.message = 'Preparando volúmenes de datos';
    await fs.promises.mkdir(this.dataDir, { recursive: true });
  }

  async isContainerRunning() {
    try {
      const { stdout } = await execAsync(this.buildDockerCommand(`ps --filter "name=${this.containerName}" --format "{{.Names}}"`));
      return stdout.trim() === this.containerName;
    } catch (_) {
      return false;
    }
  }

  async isContainerExisting() {
    try {
      const { stdout } = await execAsync(this.buildDockerCommand(`ps -a --filter "name=${this.containerName}" --format "{{.Names}}"`));
      return stdout.trim() === this.containerName;
    } catch (_) {
      return false;
    }
  }

  async removeContainer() {
    this.status.phase = 'cleanup';
    this.status.message = 'Eliminando contenedor previo';
    try {
      await execAsync(this.buildDockerCommand(`rm -f ${this.containerName}`));
    } catch (_) {
      // ignore
    }
  }

  async startContainer() {
    this.status.phase = 'starting';
    this.status.message = 'Iniciando contenedor AnythingLLM';

    const volumeHostPath = process.platform === 'win32'
      ? this.dataDir
      : this.dataDir.replace(/\\/g, '/');

    const args = [
      'run -d',
      `--name ${this.containerName}`,
      '--restart unless-stopped',
      `-p ${this.hostPort}:${this.containerPort}`,
      `-v "${volumeHostPath}:/app/server/storage"`,
      '-e DISABLE_TELEMETRY=true',
      '-e STORAGE_DIR=/app/server/storage',
      this.imageName
    ].join(' ');

    await execAsync(this.buildDockerCommand(args));
  }

  async waitForHealth() {
    this.status.phase = 'health';
    this.status.message = 'Esperando a que AnythingLLM responda';
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.healthTimeoutMs) {
      const healthy = await this.checkHealth();
      if (healthy) {
        this.lastHealthCheck = Date.now();
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, this.healthIntervalMs));
    }

    throw new Error('El servicio AnythingLLM no respondió dentro del tiempo esperado.');
  }

  checkHealth() {
    return new Promise((resolve) => {
      const request = http.get(this.healthUrl, (res) => {
        if (res.statusCode === 200) {
          res.resume();
          resolve(true);
        } else {
          res.resume();
          resolve(false);
        }
      });

      request.on('error', () => resolve(false));
      request.setTimeout(3_000, () => {
        request.destroy();
        resolve(false);
      });
    });
  }

  async stop() {
    this.status.phase = 'stopping';
    this.status.message = 'Deteniendo AnythingLLM';
    try {
      await execAsync(this.buildDockerCommand(`stop ${this.containerName}`));
      await execAsync(this.buildDockerCommand(`rm ${this.containerName}`));
    } catch (_) {
      // ignore errors when stopping
    }
    this.status.isRunning = false;
    this.status.phase = 'idle';
    this.status.message = 'AnythingLLM detenido';
    this.status.url = null;
    return this.getStatus();
  }

  getStatus() {
    return {
      ...this.status,
      url: this.status.url || this.getBaseUrl(),
      healthUrl: this.healthUrl,
      containerName: this.containerName,
      imageName: this.imageName,
      dataDir: this.dataDir,
      lastHealthCheck: this.lastHealthCheck,
      lastError: this.status.lastError || (this.lastError && this.lastError.message) || null
    };
  }

  /**
   * Obtiene la ruta del directorio de datos de AnythingLLM
   */
  getDataDir() {
    return this.dataDir;
  }

  /**
   * Lee un archivo JSON del directorio de datos de AnythingLLM
   * @param {string} filename - Nombre del archivo (ej: 'mcp.json', 'config.json')
   * @returns {Promise<object>} Contenido del archivo JSON parseado
   */
  async readJsonFile(filename) {
    const filePath = path.join(this.dataDir, filename);
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Archivo no existe, retornar objeto vacío
        return {};
      }
      throw new Error(`Error leyendo ${filename}: ${error.message}`);
    }
  }

  /**
   * Escribe un archivo JSON en el directorio de datos de AnythingLLM
   * @param {string} filename - Nombre del archivo (ej: 'mcp.json', 'config.json')
   * @param {object} data - Datos a escribir (se serializarán como JSON)
   * @returns {Promise<void>}
   */
  async writeJsonFile(filename, data) {
    const filePath = path.join(this.dataDir, filename);
    try {
      // Asegurar que el directorio existe
      await fs.promises.mkdir(this.dataDir, { recursive: true });
      // Escribir con formato bonito (2 espacios de indentación)
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Error escribiendo ${filename}: ${error.message}`);
    }
  }

  /**
   * Lee la configuración de MCP de AnythingLLM
   * AnythingLLM almacena la configuración MCP en diferentes ubicaciones posibles:
   * - mcp.json (formato estándar)
   * - .mcp.json (archivo oculto)
   * - config/mcp.json (en subdirectorio)
   * @returns {Promise<object>} Configuración de MCP
   */
  async readMCPConfig() {
    const possiblePaths = [
      'mcp.json',
      '.mcp.json',
      'config/mcp.json',
      'mcp-servers.json'
    ];

    for (const filename of possiblePaths) {
      try {
        const config = await this.readJsonFile(filename);
        if (config && Object.keys(config).length > 0) {
          return config;
        }
      } catch (error) {
        // Continuar con el siguiente archivo
        continue;
      }
    }

    // Si no existe ningún archivo, retornar estructura por defecto
    return {
      mcpServers: {}
    };
  }

  /**
   * Escribe la configuración de MCP de AnythingLLM
   * @param {object} config - Configuración de MCP a escribir
   * @returns {Promise<void>}
   */
  async writeMCPConfig(config) {
    // Intentar escribir en mcp.json primero (formato estándar)
    try {
      await this.writeJsonFile('mcp.json', config);
      return;
    } catch (error) {
      // Si falla, intentar en config/mcp.json
      try {
        const configDir = path.join(this.dataDir, 'config');
        await fs.promises.mkdir(configDir, { recursive: true });
        await fs.promises.writeFile(
          path.join(configDir, 'mcp.json'),
          JSON.stringify(config, null, 2),
          'utf8'
        );
        return;
      } catch (error2) {
        throw new Error(`No se pudo escribir la configuración MCP: ${error2.message}`);
      }
    }
  }

  /**
   * Añade un servidor MCP a la configuración
   * @param {string} serverName - Nombre del servidor MCP
   * @param {object} serverConfig - Configuración del servidor (command, args, env, etc.)
   * @returns {Promise<object>} Configuración actualizada
   */
  async addMCPServer(serverName, serverConfig) {
    const config = await this.readMCPConfig();
    
    // Asegurar que existe la estructura mcpServers
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Añadir o actualizar el servidor
    config.mcpServers[serverName] = {
      ...serverConfig,
      // Asegurar campos mínimos
      command: serverConfig.command || '',
      args: serverConfig.args || [],
      env: serverConfig.env || {}
    };

    await this.writeMCPConfig(config);
    return config;
  }

  /**
   * Elimina un servidor MCP de la configuración
   * @param {string} serverName - Nombre del servidor MCP a eliminar
   * @returns {Promise<object>} Configuración actualizada
   */
  async removeMCPServer(serverName) {
    const config = await this.readMCPConfig();
    
    if (config.mcpServers && config.mcpServers[serverName]) {
      delete config.mcpServers[serverName];
      await this.writeMCPConfig(config);
    }

    return config;
  }

  /**
   * Lista todos los archivos en el directorio de datos
   * @returns {Promise<string[]>} Lista de nombres de archivos
   */
  async listDataFiles() {
    try {
      const files = await fs.promises.readdir(this.dataDir);
      return files;
    } catch (error) {
      throw new Error(`Error listando archivos: ${error.message}`);
    }
  }
}

module.exports = AnythingLLMService;

