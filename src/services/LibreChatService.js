const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const util = require('util');
const crypto = require('crypto');

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

class LibreChatService {
  constructor() {
    this.imageName = (process.env.NODETERM_LIBRECHAT_IMAGE || 'ghcr.io/danny-avila/librechat:latest').trim();
    this.mongoImageName = (process.env.NODETERM_LIBRECHAT_MONGO_IMAGE || 'mongo:latest').trim();
    this.containerName = (process.env.NODETERM_LIBRECHAT_CONTAINER || 'nodeterm-librechat').trim();
    this.mongoContainerName = (process.env.NODETERM_LIBRECHAT_MONGO_CONTAINER || 'nodeterm-librechat-mongo').trim();
    this.hostPort = parseInt(process.env.NODETERM_LIBRECHAT_PORT, 10) || 3080;
    this.containerPort = 3080;
    
    const configuredBase = (process.env.NODETERM_LIBRECHAT_URL || `http://127.0.0.1:${this.hostPort}`).replace(/\/$/, '');
    this.baseUrl = configuredBase;
    this.healthUrl = `${configuredBase}/api/health`; // LibreChat health check
    this.healthTimeoutMs = 120_000; // LibreChat takes a bit to start
    this.healthIntervalMs = 3_000;
    
    this.ensurePromise = null;
    this.lastHealthCheck = null;
    this.lastError = null;
    this._dockerCommand = null;

    this.status = {
      isRunning: false,
      phase: 'idle',
      message: 'Servicio LibreChat inactivo',
      url: null,
      containerName: this.containerName,
      dataDir: null,
      lastError: null
    };

    this.dataDir = this._resolveDataDir();
    this.status.dataDir = this.dataDir;
  }

  _resolveDataDir() {
    const custom = (process.env.NODETERM_LIBRECHAT_DATA || '').trim();
    if (custom) {
      try {
        fs.mkdirSync(custom, { recursive: true });
        return custom;
      } catch (error) {
        console.warn('[LibreChat] No se pudo crear el directorio personalizado, usando userData:', error.message);
      }
    }
    const dir = path.join(getUserDataDir(), 'librechat-data');
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

  /**
   * Genera secretos necesarios para LibreChat si no existen
   */
  async _ensureSecrets() {
    const secretsPath = path.join(this.dataDir, '.env.secrets');
    if (fs.existsSync(secretsPath)) {
      const content = fs.readFileSync(secretsPath, 'utf8');
      const secrets = {};
      content.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) secrets[key.trim()] = value.trim();
      });
      return secrets;
    }

    const secrets = {
      CREDS_KEY: crypto.randomBytes(32).toString('hex'),
      CREDS_IV: crypto.randomBytes(16).toString('hex'),
      JWT_SECRET: crypto.randomBytes(32).toString('hex'),
      JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex')
    };

    const content = Object.entries(secrets).map(([k, v]) => `${k}=${v}`).join('\n');
    fs.writeFileSync(secretsPath, content, 'utf8');
    return secrets;
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
        this.status.message = error.message || 'Error iniciando LibreChat';
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
    
    // 1. Asegurar base de datos (MongoDB)
    await this.ensureMongoRunning();

    // 2. Asegurar aplicación (LibreChat)
    await this.ensureImagePresent(this.imageName, 'LibreChat');
    await this.ensureDataDir();

    const running = await this.isContainerRunning(this.containerName);
    if (!running) {
      const exists = await this.isContainerExisting(this.containerName);
      if (exists) {
        await this.removeContainer(this.containerName);
      }
      await this.startContainer();
    } else {
      this.status.phase = 'running';
      this.status.message = 'Contenedor LibreChat en ejecución';
    }

    await this.waitForHealth();

    this.status.isRunning = true;
    this.status.phase = 'ready';
    this.status.message = 'LibreChat listo';
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

  async ensureMongoRunning() {
    this.status.phase = 'mongo-check';
    this.status.message = 'Verificando MongoDB para LibreChat';

    await this.ensureImagePresent(this.mongoImageName, 'MongoDB');

    const running = await this.isContainerRunning(this.mongoContainerName);
    if (!running) {
      const exists = await this.isContainerExisting(this.mongoContainerName);
      if (exists) {
        // Si existe pero no corre, lo iniciamos
        this.status.message = 'Iniciando contenedor MongoDB...';
        await execAsync(this.buildDockerCommand(`start ${this.mongoContainerName}`));
      } else {
        // Si no existe, lo creamos
        this.status.message = 'Creando contenedor MongoDB...';
        const mongoDataDir = path.join(this.dataDir, 'mongo-data');
        await fs.promises.mkdir(mongoDataDir, { recursive: true });
        
        const volumeHostPath = process.platform === 'win32'
          ? mongoDataDir
          : mongoDataDir.replace(/\\/g, '/');

        const args = [
          'run -d',
          `--name ${this.mongoContainerName}`,
          '--restart unless-stopped',
          `-v "${volumeHostPath}:/data/db"`,
          this.mongoImageName
        ].join(' ');
        
        await execAsync(this.buildDockerCommand(args));
      }
    }
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

  async ensureDataDir() {
    this.status.phase = 'volume';
    this.status.message = 'Preparando volúmenes de datos';
    await fs.promises.mkdir(this.dataDir, { recursive: true });
    // Crear carpetas necesarias para LibreChat
    await fs.promises.mkdir(path.join(this.dataDir, 'images'), { recursive: true });
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

  async startContainer() {
    this.status.phase = 'starting';
    this.status.message = 'Iniciando contenedor LibreChat';

    const secrets = await this._ensureSecrets();
    
    const volumeHostPath = process.platform === 'win32'
      ? this.dataDir
      : this.dataDir.replace(/\\/g, '/');

    // Configuración de red: LibreChat necesita conectarse a Mongo
    // Usaremos --link para simplicidad o simplemente la IP si fuera necesario, 
    // pero --link es más "igual a AnythingLLM" (si usara links)
    // En Docker moderno, usar una red es mejor, pero NodeTerm parece preferir contenedores aislados.
    // Sin embargo, LibreChat NECESITA mongo. Usaremos la red por defecto o --link.
    
    // Intentar crear una red común si no existe
    try {
      await execAsync(this.buildDockerCommand('network create nodeterm-network'));
    } catch (_) {}

    // Asegurar que mongo está en la red (si no lo estaba)
    try {
      await execAsync(this.buildDockerCommand(`network connect nodeterm-network ${this.mongoContainerName}`));
    } catch (_) {}

    const envVars = [
      `-e MONGO_URI=mongodb://${this.mongoContainerName}:27017/LibreChat`,
      `-e PORT=${this.containerPort}`,
      '-e HOST=0.0.0.0',
      `-e DOMAIN_CLIENT=http://127.0.0.1:${this.hostPort}`,
      `-e DOMAIN_SERVER=http://127.0.0.1:${this.hostPort}`,
      `-e CREDS_KEY=${secrets.CREDS_KEY}`,
      `-e CREDS_IV=${secrets.CREDS_IV}`,
      `-e JWT_SECRET=${secrets.JWT_SECRET}`,
      `-e JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}`,
      '-e ALLOW_REGISTRATION=true',
      '-e ALLOW_SOCIAL_LOGIN=false',
      '-e ALLOW_EMAIL_LOGIN=true',
      '-e ALLOW_PASSWORD_RESET=false',
      '-e SHOW_BIRTHDAY_FIELD=false',
      '-e DEBUG_LOGGING=true',
      '-e ANY_LLM_URL=http://nodeterm-anythingllm:3001/api/v1', // Integración opcional con AnythingLLM
      '-e HELP_AND_FAQ_URL=https://librechat.ai'
    ];

    const args = [
      'run -d',
      `--name ${this.containerName}`,
      '--restart unless-stopped',
      `--network nodeterm-network`,
      `-p ${this.hostPort}:${this.containerPort}`,
      `-v "${volumeHostPath}/images:/app/client/public/images"`,
      `-v "${volumeHostPath}/logs:/app/api/logs"`,
      ...envVars,
      this.imageName
    ].join(' ');

    await execAsync(this.buildDockerCommand(args));
  }

  async waitForHealth() {
    this.status.phase = 'health';
    this.status.message = 'Esperando a que LibreChat responda';
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.healthTimeoutMs) {
      const healthy = await this.checkHealth();
      if (healthy) {
        this.lastHealthCheck = Date.now();
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, this.healthIntervalMs));
    }

    throw new Error('El servicio LibreChat no respondió dentro del tiempo esperado.');
  }

  checkHealth() {
    return new Promise((resolve) => {
      // LibreChat tiene un dashboard en la raíz
      const request = http.get(this.baseUrl, (res) => {
        if (res.statusCode === 200 || res.statusCode === 302) {
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
    this.status.message = 'Deteniendo LibreChat';
    try {
      await execAsync(this.buildDockerCommand(`stop ${this.containerName}`));
      await execAsync(this.buildDockerCommand(`rm ${this.containerName}`));
      // No detenemos Mongo por defecto para mantener la DB rápida si reinicia
    } catch (_) {}
    
    this.status.isRunning = false;
    this.status.phase = 'idle';
    this.status.message = 'LibreChat detenido';
    this.status.url = null;
    return this.getStatus();
  }

  getStatus() {
    return {
      ...this.status,
      url: this.status.url || this.getBaseUrl(),
      containerName: this.containerName,
      imageName: this.imageName,
      dataDir: this.dataDir,
      lastHealthCheck: this.lastHealthCheck,
      lastError: this.status.lastError || (this.lastError && this.lastError.message) || null
    };
  }

  getDataDir() {
    return this.dataDir;
  }
}

module.exports = LibreChatService;
