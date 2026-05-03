const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const util = require('util');

const execAsync = util.promisify(exec);
const DOCKER_CHECK_TTL_MS = 20_000;

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

class AgentZeroService {
  constructor() {
    this.imageName = (process.env.NODETERM_AGENTZERO_IMAGE || 'agent0ai/agent-zero:latest').trim();
    this.containerName = (process.env.NODETERM_AGENTZERO_CONTAINER || 'nodeterm-agentzero').trim();
    this.hostPort = parseInt(process.env.NODETERM_AGENTZERO_PORT, 10) || 3081;
    this.containerPort = 80;
    
    const configuredBase = (process.env.NODETERM_AGENTZERO_URL || `http://127.0.0.1:${this.hostPort}`).replace(/\/$/, '');
    this.baseUrl = configuredBase;
    this.healthTimeoutMs = 120_000; 
    this.healthIntervalMs = 3_000;
    
    this.ensurePromise = null;
    this.lastHealthCheck = null;
    this.lastError = null;
    this._dockerCommand = null;
    this._dockerCheckedAt = 0;

    this.status = {
      isRunning: false,
      phase: 'idle',
      message: 'Servicio Agent Zero inactivo',
      url: null,
      containerName: this.containerName,
      dataDir: null,
      lastError: null,
      updateAvailable: false,
      lastCheck: null
    };

    this.dataDir = this._resolveDataDir();
    this.status.dataDir = this.dataDir;

    // Ollama en el host: desde el contenedor, localhost no es el PC anfitrión.
    // LiteLLM usa OLLAMA_API_BASE si no hay api_base en el modelo (venv site-packages litellm/llms/ollama).
    // A0_SET__model_config__* aplica al cargar default_config.yaml del plugin (sin config.json previo).
    this.ollamaBaseUrl = (process.env.NODETERM_AGENTZERO_OLLAMA_BASE_URL || 'http://host.docker.internal:11434').trim();
  }

  _resolveDataDir() {
    const custom = (process.env.NODETERM_AGENTZERO_DATA || '').trim();
    if (custom) {
      try {
        fs.mkdirSync(custom, { recursive: true });
        return custom;
      } catch (error) {
        console.warn('[AgentZero] No se pudo crear el directorio personalizado, usando userData:', error.message);
      }
    }
    const dir = path.join(getUserDataDir(), 'agentzero-data');
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
        this.status.message = error.message || 'Error iniciando Agent Zero';
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

    await Promise.all([
      this.ensureImagePresent(this.imageName, 'Agent Zero'),
      this.ensureDataDir()
    ]);

    const running = await this.isContainerRunning(this.containerName);
    if (!running) {
      const exists = await this.isContainerExisting(this.containerName);
      if (exists) {
        await this.startExistingContainer(this.containerName);
      } else {
        await this.startContainer();
      }
    } else {
      this.status.phase = 'running';
      this.status.message = 'Contenedor Agent Zero en ejecución';
    }

    await this.waitForHealth();

    this.status.isRunning = true;
    this.status.phase = 'ready';
    this.status.message = 'Agent Zero listo';
    this.status.url = this.getBaseUrl();
    this.status.lastError = null;

    return this.getStatus();
  }

  async ensureDockerAvailable() {
    if (Date.now() - this._dockerCheckedAt < DOCKER_CHECK_TTL_MS) {
      return;
    }
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
    this._dockerCheckedAt = Date.now();
  }

  async ensureImagePresent(imageName, label) {
    this.status.phase = 'image';
    this.status.message = `Verificando imagen ${label}`;
    try {
      await execAsync(this.buildDockerCommand(`image inspect ${imageName}`));
    } catch (_) {
      this.status.message = `Descargando imagen ${label}...`;
      await execAsync(this.buildDockerCommand(`pull ${imageName}`));
    }
  }

  async getImageId(imageName) {
    try {
      const { stdout } = await execAsync(this.buildDockerCommand(`image inspect --format "{{.Id}}" ${imageName}`));
      return stdout.trim();
    } catch (_) {
      return null;
    }
  }

  /**
   * Verifica si hay una versión más reciente de la imagen en el registro.
   * @returns {Promise<boolean>} True si hay una actualización disponible.
   */
  async checkForUpdate() {
    this.status.message = 'Buscando actualizaciones...';
    try {
      const oldId = await this.getImageId(this.imageName);
      
      // Intentamos descargar la última versión
      await execAsync(this.buildDockerCommand(`pull ${this.imageName}`));
      
      const newId = await this.getImageId(this.imageName);
      
      const hasUpdate = oldId !== null && newId !== null && oldId !== newId;
      
      this.status.updateAvailable = hasUpdate;
      this.status.lastUpdateCheck = new Date().toISOString();
      
      if (hasUpdate) {
        this.status.message = 'Actualización disponible';
      } else {
        this.status.message = 'El software está al día';
      }
      
      return hasUpdate;
    } catch (error) {
      console.error('[AgentZero] Error buscando actualizaciones:', error);
      this.status.message = 'Error al buscar actualizaciones';
      return false;
    }
  }

  /**
   * Aplica la actualización: detiene, elimina y vuelve a crear el contenedor.
   */
  async applyUpdate() {
    this.status.phase = 'updating';
    this.status.message = 'Aplicando actualización...';
    
    try {
      // 1. Detener y eliminar (los datos están en el volumen persistente)
      await this.removeContainer(this.containerName);
      
      // 2. Iniciar de nuevo (usará la imagen que acabamos de bajar en checkForUpdate)
      await this.startContainer();
      
      // 3. Esperar a que esté listo
      await this.waitForHealth();
      
      this.status.updateAvailable = false;
      this.status.message = 'Actualización completada con éxito';
      return true;
    } catch (error) {
      this.status.phase = 'error';
      this.status.message = `Error actualizando: ${error.message}`;
      throw error;
    }
  }

  async ensureDataDir() {
    this.status.phase = 'volume';
    this.status.message = 'Preparando volúmenes de datos';
    await fs.promises.mkdir(this.dataDir, { recursive: true });
    // Crear carpetas necesarias para Agent Zero
    await fs.promises.mkdir(path.join(this.dataDir, 'config'), { recursive: true });
    await fs.promises.mkdir(path.join(this.dataDir, 'logs'), { recursive: true });
  }

  async isContainerRunning(name) {
    try {
      const { stdout } = await execAsync(this.buildDockerCommand(`ps --filter "name=${name}" --format "{{.Names}}"`));
      const lines = stdout.trim().split('\n');
      return lines.some(l => l.trim() === name);
    } catch (_) {
      return false;
    }
  }

  async isContainerExisting(name) {
    try {
      const { stdout } = await execAsync(this.buildDockerCommand(`ps -a --filter "name=${name}" --format "{{.Names}}"`));
      const lines = stdout.trim().split('\n');
      return lines.some(l => l.trim() === name);
    } catch (_) {
      return false;
    }
  }

  async removeContainer(name) {
    this.status.phase = 'cleanup';
    this.status.message = `Eliminando contenedor previo de ${name}`;
    try {
      await execAsync(this.buildDockerCommand(`stop ${name}`));
    } catch (_) {}
    try {
      await execAsync(this.buildDockerCommand(`rm -f ${name}`));
    } catch (_) {}
  }

  /** Arranca un contenedor ya creado (conserva datos dentro del contenedor / volúmenes anónimos). */
  async startExistingContainer(name) {
    this.status.phase = 'starting';
    this.status.message = 'Arrancando contenedor Agent Zero existente';
    await execAsync(this.buildDockerCommand(`start ${name}`));
  }

  async startContainer() {
    this.status.phase = 'starting';
    this.status.message = 'Iniciando contenedor Agent Zero';

    const volumeHostPath = process.platform === 'win32'
      ? this.dataDir
      : this.dataDir.replace(/\\/g, '/');
      
    const configHostPath = path.join(volumeHostPath, 'config').replace(/\\/g, '/');
    const logsHostPath = path.join(volumeHostPath, 'logs').replace(/\\/g, '/');

    // Intentar crear red comun
    try {
      await execAsync(this.buildDockerCommand('network create nodeterm-network'));
    } catch (_) {}

    const args = [
      'run -d',
      `--name ${this.containerName}`,
      '--restart unless-stopped',
      `--network nodeterm-network`,
      `-p ${this.hostPort}:${this.containerPort}`,
      ...(process.platform === 'linux' ? ['--add-host host.docker.internal:host-gateway'] : []),
      `-e OLLAMA_API_BASE=${this.ollamaBaseUrl}`,
      `-e OLLAMA_BASE_URL=${this.ollamaBaseUrl}`,
      `-e A0_SET__model_config__chat_model__api_base=${this.ollamaBaseUrl}`,
      `-e A0_SET__model_config__utility_model__api_base=${this.ollamaBaseUrl}`,
      // Montamos las carpetas para exponer metadatos localmente
      /* Descomentar en el futuro si soportamos montaje total:
      `-v "${configHostPath}:/app/conf"`,
      `-v "${logsHostPath}:/app/logs"`,
      */
      this.imageName
    ].join(' ');

    await execAsync(this.buildDockerCommand(args));
  }

  async waitForHealth() {
    this.status.phase = 'health';
    this.status.message = 'Esperando a que Agent Zero responda';
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.healthTimeoutMs) {
      const healthy = await this.checkHealth();
      if (healthy) {
        this.lastHealthCheck = Date.now();
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, this.healthIntervalMs));
    }

    throw new Error('El servicio Agent Zero no respondió dentro del tiempo esperado.');
  }

  checkHealth() {
    return new Promise((resolve) => {
      const request = http.get(this.baseUrl, (res) => {
        if (res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 304 || res.statusCode === 404) {
          // A veces si hay proxy index.html devuelve otro estatus exitoso
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
    this.status.message = 'Deteniendo Agent Zero';
    // Solo stop: no docker rm, para no borrar el estado de Agent Zero (chats, config en /a0, etc.).
    try {
      await execAsync(this.buildDockerCommand(`stop ${this.containerName}`));
    } catch (_) {}

    this.status.isRunning = false;
    this.status.phase = 'idle';
    this.status.message = 'Agent Zero detenido';
    this.status.url = null;
    return this.getStatus();
  }

  async getImageId(imageName) {
    try {
      const { stdout } = await execAsync(this.buildDockerCommand(`image inspect ${imageName} --format "{{.Id}}"`));
      return stdout.trim();
    } catch (_) {
      return null;
    }
  }

  async checkForUpdate() {
    this.status.phase = 'checking';
    this.status.message = 'Buscando actualizaciones para Agent Zero...';
    try {
      const currentImageId = await this.getImageId(this.imageName);
      
      // Pull silencioso para ver si hay algo nuevo
      await execAsync(this.buildDockerCommand(`pull ${this.imageName}`));
      
      const latestImageId = await this.getImageId(this.imageName);
      
      const updateAvailable = currentImageId !== latestImageId;
      
      this.status.updateAvailable = updateAvailable;
      this.status.lastCheck = new Date().toISOString();
      this.status.phase = 'idle';
      this.status.message = updateAvailable ? 'Actualización disponible' : 'Agent Zero está al día';
      
      return this.getStatus();
    } catch (error) {
      this.status.phase = 'error';
      this.status.message = 'Error buscando actualizaciones';
      throw error;
    }
  }

  async applyUpdate() {
    this.status.phase = 'updating';
    this.status.message = 'Actualizando Agent Zero (esto puede tardar)...';
    try {
      // 1. Asegurar que tenemos la última imagen
      await execAsync(this.buildDockerCommand(`pull ${this.imageName}`));
      
      // 2. Detener y eliminar contenedor actual (Agent Zero usa volúmenes así que es seguro)
      await this.removeContainer(this.containerName);
      
      // 3. Iniciar de nuevo (usará la nueva imagen)
      await this.startContainer();
      
      // 4. Esperar a que esté listo
      await this.waitForHealth();
      
      this.status.updateAvailable = false;
      this.status.phase = 'ready';
      this.status.message = 'Agent Zero actualizado con éxito';
      
      return this.getStatus();
    } catch (error) {
      this.status.phase = 'error';
      this.status.message = 'Error aplicando actualización';
      throw error;
    }
  }

  getStatus() {
    return {
      ...this.status,
      url: this.status.url || this.getBaseUrl(),
      containerName: this.containerName,
      imageName: this.imageName,
      dataDir: this.dataDir,
      lastHealthCheck: this.lastHealthCheck,
      updateAvailable: this.status.updateAvailable || false,
      lastCheck: this.status.lastCheck || null,
      lastError: this.status.lastError || (this.lastError && this.lastError.message) || null
    };
  }

  getDataDir() {
    return this.dataDir;
  }
}

module.exports = AgentZeroService;
