const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const util = require('util');

const execAsync = util.promisify(exec);
const { removeReplacedImageAfterUpdate } = require('../utils/dockerImageCleanup');
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

class OpenNotebookService {
  constructor() {
    this.imageName = (process.env.NODETERM_OPENNOTEBOOK_IMAGE || 'lfnovo/open_notebook:v1-latest-single').trim();
    this.containerName = (process.env.NODETERM_OPENNOTEBOOK_CONTAINER || 'nodeterm-open-notebook').trim();
    this.hostPort = parseInt(process.env.NODETERM_OPENNOTEBOOK_PORT, 10) || 8502;
    this.containerPort = 8502;
    this.apiHostPort = parseInt(process.env.NODETERM_OPENNOTEBOOK_API_PORT, 10) || 5055;
    this.apiContainerPort = 5055;

    const configuredBase = (process.env.NODETERM_OPENNOTEBOOK_URL || `http://127.0.0.1:${this.hostPort}`).replace(/\/$/, '');
    this.baseUrl = configuredBase;
    this.healthUrl = `http://127.0.0.1:${this.apiHostPort}/health`;
    this.healthTimeoutMs = 300_000;
    this.healthIntervalMs = 2_000;

    this.ensurePromise = null;
    this.lastHealthCheck = null;
    this.lastError = null;
    this._dockerCommand = null;
    this._dockerCheckedAt = 0;
    this._encryptionKey = null;

    this.status = {
      isRunning: false,
      phase: 'idle',
      message: 'Servicio Open Notebook inactivo',
      url: null,
      containerName: this.containerName,
      dataDir: null,
      lastError: null,
      updateAvailable: false,
      lastCheck: null
    };

    this.dataDir = this._resolveDataDir();
    this.status.dataDir = this.dataDir;
  }

  _resolveDataDir() {
    const custom = (process.env.NODETERM_OPENNOTEBOOK_DATA || '').trim();
    if (custom) {
      try {
        fs.mkdirSync(custom, { recursive: true });
        return custom;
      } catch (error) {
        console.warn('[OpenNotebook] No se pudo crear el directorio personalizado, usando userData:', error.message);
      }
    }
    const dir = path.join(getUserDataDir(), 'opennotebook-data');
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
        this.status.message = error.message || 'Error iniciando Open Notebook';
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
      this.ensureImagePresent(),
      this.ensureDataDir()
    ]);

    let running = await this.isContainerRunning(this.containerName);
    if (running) {
      const quickOk = await this.checkHealth();
      if (!quickOk) {
        this.status.phase = 'cleanup';
        this.status.message = 'Recreando contenedor Open Notebook';
        await this.removeContainer(this.containerName);
        running = false;
      } else {
        this.status.phase = 'running';
        this.status.message = 'Contenedor Open Notebook en ejecución';
      }
    }

    if (!running) {
      const exists = await this.isContainerExisting(this.containerName);
      if (exists) {
        await this.removeContainer(this.containerName);
      }
      await this.startContainer();
    }

    await this.waitForHealth();

    this.status.isRunning = true;
    this.status.phase = 'ready';
    this.status.message = 'Open Notebook listo';
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

  async ensureImagePresent() {
    this.status.phase = 'image';
    this.status.message = 'Verificando imagen Open Notebook';
    try {
      await execAsync(this.buildDockerCommand(`image inspect ${this.imageName}`), { timeout: 15_000 });
    } catch (_) {
      this.status.message = 'Descargando imagen Open Notebook... (puede tardar varios minutos)';
      try {
        await execAsync(this.buildDockerCommand(`pull ${this.imageName}`), { timeout: 600_000, maxBuffer: 50 * 1024 * 1024 });
      } catch (pullError) {
        throw new Error(`No se pudo descargar la imagen Open Notebook (${this.imageName}): ${pullError.message || pullError}`);
      }
    }
  }

  async ensureDataDir() {
    this.status.phase = 'volume';
    this.status.message = 'Preparando volúmenes de datos';
    await fs.promises.mkdir(this.dataDir, { recursive: true });
    const notebookDataDir = path.join(this.dataDir, 'notebook_data');
    const surrealDataDir = path.join(this.dataDir, 'surreal_data');
    await fs.promises.mkdir(notebookDataDir, { recursive: true });
    await fs.promises.mkdir(surrealDataDir, { recursive: true });
    await this.ensureEncryptionKey();
  }

  async ensureEncryptionKey() {
    const envOverride = (process.env.OPEN_NOTEBOOK_ENCRYPTION_KEY || '').trim();
    const keyPath = path.join(this.dataDir, '.nodeterm-encryption-key');
    let key = envOverride;

    if (!key) {
      try {
        key = (await fs.promises.readFile(keyPath, 'utf8')).trim();
      } catch (_) {
        key = '';
      }
    }

    if (!key) {
      key = crypto.randomBytes(24).toString('hex');
      await fs.promises.writeFile(keyPath, key, 'utf8');
    }

    this._encryptionKey = key;
  }

  getEncryptionKey() {
    return this._encryptionKey || '';
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
    this.status.message = `Eliminando contenedor previo ${name}`;
    try {
      await execAsync(this.buildDockerCommand(`stop ${name}`), { timeout: 30_000 });
    } catch (_) {}
    try {
      await execAsync(this.buildDockerCommand(`rm -f ${name}`), { timeout: 30_000 });
    } catch (_) {}
  }

  async startContainer() {
    this.status.phase = 'starting';
    this.status.message = 'Iniciando contenedor Open Notebook';

    const notebookDataDir = path.join(this.dataDir, 'notebook_data');
    const surrealDataDir = path.join(this.dataDir, 'surreal_data');

    const toDockerPath = (p) => process.platform === 'win32' ? p : p.replace(/\\/g, '/');

    try {
      await execAsync(this.buildDockerCommand('network create nodeterm-network'), { timeout: 10_000 });
    } catch (_) {}

    const encKey = this._encryptionKey || 'nodeterm-default-key';

    const args = [
      'run -d',
      `--name ${this.containerName}`,
      '--restart unless-stopped',
      '--pull never',
      '--network nodeterm-network',
      `-p ${this.hostPort}:${this.containerPort}`,
      `-p ${this.apiHostPort}:${this.apiContainerPort}`,
      ...(process.platform === 'linux' ? ['--add-host host.docker.internal:host-gateway'] : []),
      `-v "${toDockerPath(notebookDataDir)}:/app/data"`,
      `-v "${toDockerPath(surrealDataDir)}:/mydata"`,
      `-e OPEN_NOTEBOOK_ENCRYPTION_KEY=${encKey}`,
      `-e SURREAL_URL=ws://localhost:8000/rpc`,
      `-e SURREAL_USER=root`,
      `-e SURREAL_PASSWORD=root`,
      `-e SURREAL_NAMESPACE=open_notebook`,
      `-e SURREAL_DATABASE=open_notebook`,
      this.imageName
    ].join(' ');

    const cmd = this.buildDockerCommand(args);
    console.log('[OpenNotebook] Ejecutando:', cmd);
    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
      console.log('[OpenNotebook] docker run stdout:', stdout?.trim());
      if (stderr) console.warn('[OpenNotebook] docker run stderr:', stderr?.trim());
    } catch (runError) {
      console.error('[OpenNotebook] docker run falló:', runError.message);
      throw new Error(`No se pudo iniciar el contenedor Open Notebook: ${runError.message}`);
    }
  }

  async waitForHealth() {
    this.status.phase = 'health';
    this.status.message = 'Esperando a que Open Notebook responda';
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.healthTimeoutMs) {
      const healthy = await this.checkHealth();
      if (healthy) {
        this.lastHealthCheck = Date.now();
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, this.healthIntervalMs));
    }

    throw new Error('El servicio Open Notebook no respondió dentro del tiempo esperado.');
  }

  checkHealth() {
    return new Promise((resolve) => {
      const request = http.get(this.healthUrl, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 600) {
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
    this.status.message = 'Deteniendo Open Notebook';
    try {
      await execAsync(this.buildDockerCommand(`stop ${this.containerName}`));
    } catch (_) {}

    this.status.isRunning = false;
    this.status.phase = 'idle';
    this.status.message = 'Open Notebook detenido';
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
    this.status.message = 'Buscando actualizaciones para Open Notebook...';
    try {
      const currentImageId = await this.getImageId(this.imageName);
      
      // Pull silencioso para ver si hay algo nuevo
      await execAsync(this.buildDockerCommand(`pull ${this.imageName}`));
      
      const latestImageId = await this.getImageId(this.imageName);
      
      const updateAvailable = currentImageId !== latestImageId;
      
      this.status.updateAvailable = updateAvailable;
      this.status.lastCheck = new Date().toISOString();
      this.status.phase = 'idle';
      this.status.message = updateAvailable ? 'Actualización disponible' : 'Open Notebook está al día';
      
      return this.getStatus();
    } catch (error) {
      this.status.phase = 'error';
      this.status.message = 'Error buscando actualizaciones';
      throw error;
    }
  }

  async applyUpdate() {
    this.status.phase = 'updating';
    this.status.message = 'Actualizando Open Notebook (esto puede tardar)...';
    try {
      const priorImageId = await this.getImageId(this.imageName);
      // 1. Asegurar que tenemos la última imagen
      await execAsync(this.buildDockerCommand(`pull ${this.imageName}`));
      
      // 2. Detener y eliminar contenedor actual
      await this.removeContainer(this.containerName);
      
      // 3. Iniciar de nuevo (usará la nueva imagen)
      await this.startContainer();
      
      // 4. Esperar a que esté listo
      await this.waitForHealth();

      await removeReplacedImageAfterUpdate(
        this.buildDockerCommand.bind(this),
        this.imageName,
        priorImageId
      );
      
      this.status.updateAvailable = false;
      this.status.phase = 'ready';
      this.status.message = 'Open Notebook actualizado con éxito';
      
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
      lastError: this.status.lastError || (this.lastError && this.lastError.message) || null,
      updateAvailable: this.status.updateAvailable || false,
      lastCheck: this.status.lastCheck || null
    };
  }

  getDataDir() {
    return this.dataDir;
  }
}

module.exports = OpenNotebookService;
