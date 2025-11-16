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

class OpenWebUIService {
  constructor() {
    this.imageName = (process.env.NODETERM_OPENWEBUI_IMAGE || 'ghcr.io/open-webui/open-webui:main').trim();
    this.containerName = (process.env.NODETERM_OPENWEBUI_CONTAINER || 'nodeterm-openwebui').trim();
    this.hostPort = parseInt(process.env.NODETERM_OPENWEBUI_PORT, 10) || 3000;
    this.containerPort = 8080;
    const configuredBase = (process.env.NODETERM_OPENWEBUI_URL || `http://127.0.0.1:${this.hostPort}`).replace(/\/$/, '');
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
      message: 'Servicio Open WebUI inactivo',
      url: null,
      containerName: this.containerName,
      dataDir: null,
      lastError: null
    };

    this.dataDir = this._resolveDataDir();
    this.status.dataDir = this.dataDir;
  }

  _resolveDataDir() {
    const custom = (process.env.NODETERM_OPENWEBUI_DATA || '').trim();
    if (custom) {
      try {
        fs.mkdirSync(custom, { recursive: true });
        return custom;
      } catch (error) {
        console.warn('[OpenWebUI] No se pudo crear el directorio personalizado, usando userData:', error.message);
      }
    }
    const dir = path.join(getUserDataDir(), 'openwebui-data');
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
        this.status.message = error.message || 'Error iniciando Open WebUI';
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
      this.status.message = 'Contenedor Open WebUI en ejecución';
    }

    await this.waitForHealth();

    this.status.isRunning = true;
    this.status.phase = 'ready';
    this.status.message = 'Open WebUI listo';
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
    this.status.message = 'Verificando imagen Open WebUI';
    try {
      await execAsync(this.buildDockerCommand(`image inspect ${this.imageName}`));
    } catch (_) {
      this.status.message = 'Descargando imagen Open WebUI...';
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
      await execAsync(this.buildDockerCommand(`stop ${this.containerName}`));
    } catch (_) {
      // ignore
    }
    try {
      await execAsync(this.buildDockerCommand(`rm -f ${this.containerName}`));
    } catch (_) {
      // ignore
    }
  }

  async startContainer() {
    this.status.phase = 'starting';
    this.status.message = 'Iniciando contenedor Open WebUI';

    const volumeHostPath = process.platform === 'win32'
      ? this.dataDir
      : this.dataDir.replace(/\\/g, '/');

    // Variables de entorno opcionales
    const envVars = [];
    if (process.env.NODETERM_OPENWEBUI_WEBUI_AUTH !== undefined) {
      envVars.push(`-e WEBUI_AUTH=${process.env.NODETERM_OPENWEBUI_WEBUI_AUTH}`);
    } else {
      // Por defecto, desactivar autenticación para desarrollo local
      envVars.push('-e WEBUI_AUTH=false');
    }

    if (process.env.NODETERM_OPENWEBUI_OPENAI_API_BASE_URL) {
      envVars.push(`-e OPENAI_API_BASE_URL=${process.env.NODETERM_OPENWEBUI_OPENAI_API_BASE_URL}`);
    }

    const args = [
      'run -d',
      `--name ${this.containerName}`,
      '--restart unless-stopped',
      `-p ${this.hostPort}:${this.containerPort}`,
      `-v "${volumeHostPath}:/app/backend/data"`,
      ...envVars,
      this.imageName
    ].join(' ');

    await execAsync(this.buildDockerCommand(args));
  }

  async waitForHealth() {
    this.status.phase = 'health';
    this.status.message = 'Esperando a que Open WebUI responda';
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.healthTimeoutMs) {
      const healthy = await this.checkHealth();
      if (healthy) {
        this.lastHealthCheck = Date.now();
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, this.healthIntervalMs));
    }

    throw new Error('El servicio Open WebUI no respondió dentro del tiempo esperado.');
  }

  checkHealth() {
    return new Promise((resolve) => {
      // Intentar primero /api/health, luego /api/v1/health, luego la raíz
      const healthUrls = [
        `${this.baseUrl}/api/health`,
        `${this.baseUrl}/api/v1/health`,
        `${this.baseUrl}/`
      ];

      let currentIndex = 0;

      const tryNext = () => {
        if (currentIndex >= healthUrls.length) {
          resolve(false);
          return;
        }

        const request = http.get(healthUrls[currentIndex], (res) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            // 404 también es válido si el endpoint existe pero no está implementado
            res.resume();
            resolve(true);
          } else {
            res.resume();
            currentIndex++;
            tryNext();
          }
        });

        request.on('error', () => {
          currentIndex++;
          tryNext();
        });

        request.setTimeout(3_000, () => {
          request.destroy();
          currentIndex++;
          tryNext();
        });
      };

      tryNext();
    });
  }

  async stop() {
    this.status.phase = 'stopping';
    this.status.message = 'Deteniendo Open WebUI';
    try {
      await execAsync(this.buildDockerCommand(`stop ${this.containerName}`));
      await execAsync(this.buildDockerCommand(`rm ${this.containerName}`));
    } catch (_) {
      // ignore errors when stopping
    }
    this.status.isRunning = false;
    this.status.phase = 'idle';
    this.status.message = 'Open WebUI detenido';
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
   * Obtiene la ruta del directorio de datos de Open WebUI
   */
  getDataDir() {
    return this.dataDir;
  }

  /**
   * Reinicia el contenedor
   */
  async restartContainer() {
    await this.removeContainer();
    await this.startContainer();
    await this.waitForHealth();
    return this.getStatus();
  }
}

module.exports = OpenWebUIService;

