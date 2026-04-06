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

class OpenClawService {
  constructor() {
    this.imageName = (process.env.NODETERM_OPENCLAW_IMAGE || 'ghcr.io/openclaw/openclaw:latest').trim();
    this.containerName = (process.env.NODETERM_OPENCLAW_CONTAINER || 'nodeterm-openclaw').trim();
    this.hostPort = parseInt(process.env.NODETERM_OPENCLAW_PORT, 10) || 18789;
    this.containerPort = 18789;

    const configuredBase = (process.env.NODETERM_OPENCLAW_URL || `http://127.0.0.1:${this.hostPort}`).replace(/\/$/, '');
    this.baseUrl = configuredBase;
    this.healthUrl = configuredBase;
    this.healthTimeoutMs = 300_000;
    this.healthIntervalMs = 3_000;

    this.ensurePromise = null;
    this.lastHealthCheck = null;
    this.lastError = null;
    this._dockerCommand = null;

    this.status = {
      isRunning: false,
      phase: 'idle',
      message: 'Servicio OpenClaw inactivo',
      url: null,
      containerName: this.containerName,
      dataDir: null,
      lastError: null
    };

    this.dataDir = this._resolveDataDir();
    this.status.dataDir = this.dataDir;
  }

  _resolveDataDir() {
    const custom = (process.env.NODETERM_OPENCLAW_DATA || '').trim();
    if (custom) {
      try {
        fs.mkdirSync(custom, { recursive: true });
        return custom;
      } catch (error) {
        console.warn('[OpenClaw] No se pudo crear el directorio personalizado, usando userData:', error.message);
      }
    }
    const dir = path.join(getUserDataDir(), 'openclaw-data');
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
        this.status.message = error.message || 'Error iniciando OpenClaw';
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

    // OpenClaw por defecto escucha solo en 127.0.0.1 dentro del contenedor; con red bridge
    // y -p host:contenedor el host no llega al proceso. Hay que usar --bind lan (0.0.0.0).
    // Si el contenedor ya existía sin ese flag, hay que recrearlo.
    let running = await this.isContainerRunning(this.containerName);
    if (running) {
      const quickOk = await this.checkHealth();
      if (!quickOk) {
        this.status.phase = 'cleanup';
        this.status.message = 'Recreando contenedor OpenClaw (escucha en todas las interfaces)';
        await this.removeContainer(this.containerName);
        running = false;
      } else {
        this.status.phase = 'running';
        this.status.message = 'Contenedor OpenClaw en ejecución';
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
    this.status.message = 'OpenClaw listo';
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
    this.status.message = 'Verificando imagen OpenClaw';
    try {
      await execAsync(this.buildDockerCommand(`image inspect ${this.imageName}`), { timeout: 15_000 });
      // Imagen ya disponible localmente
    } catch (_) {
      this.status.message = 'Descargando imagen OpenClaw... (puede tardar varios minutos)';
      try {
        await execAsync(this.buildDockerCommand(`pull ${this.imageName}`), { timeout: 600_000, maxBuffer: 50 * 1024 * 1024 });
      } catch (pullError) {
        throw new Error(`No se pudo descargar la imagen OpenClaw (${this.imageName}): ${pullError.message || pullError}`);
      }
    }
  }

  async ensureDataDir() {
    this.status.phase = 'volume';
    this.status.message = 'Preparando volúmenes de datos';
    await fs.promises.mkdir(this.dataDir, { recursive: true });
    await this.ensureControlUiAllowedOrigins();
  }

  /**
   * Con --bind lan el Control UI no es loopback; OpenClaw exige orígenes explícitos.
   * @see https://docs.openclaw.ai/install/docker (gateway.controlUi.allowedOrigins)
   */
  async ensureControlUiAllowedOrigins() {
    const configPath = path.join(this.dataDir, 'openclaw.json');
    const required = [
      `http://127.0.0.1:${this.hostPort}`,
      `http://localhost:${this.hostPort}`
    ];
    const extra = (process.env.NODETERM_OPENCLAW_ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const o of extra) {
      if (!required.includes(o)) required.push(o);
    }

    let data = {};
    try {
      const raw = await fs.promises.readFile(configPath, 'utf8');
      data = JSON.parse(raw);
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('openclaw.json debe ser un objeto JSON');
      }
    } catch (e) {
      if (e.code === 'ENOENT') {
        data = {};
      } else {
        throw new Error(
          `No se pudo leer o parsear openclaw.json en ${configPath}: ${e.message}. Corrige el archivo o elimínalo para regenerarlo.`
        );
      }
    }

    if (!data.gateway || typeof data.gateway !== 'object') data.gateway = {};
    if (!data.gateway.controlUi || typeof data.gateway.controlUi !== 'object') {
      data.gateway.controlUi = {};
    }
    const existing = Array.isArray(data.gateway.controlUi.allowedOrigins)
      ? data.gateway.controlUi.allowedOrigins.map(String)
      : [];
    const merged = [...new Set([...existing, ...required])];
    data.gateway.controlUi.allowedOrigins = merged;

    await fs.promises.writeFile(configPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
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
    this.status.message = 'Iniciando contenedor OpenClaw';

    // Ruta del volumen principal: mapea todo el directorio de datos al home de openclaw.
    // Un solo volumen evita problemas con montajes anidados en Docker Desktop para Windows.
    const dataHostPath = process.platform === 'win32'
      ? this.dataDir
      : this.dataDir.replace(/\\/g, '/');

    try {
      await execAsync(this.buildDockerCommand('network create nodeterm-network'), { timeout: 10_000 });
    } catch (_) {}

    const envArgs = [];
    if (process.env.ANTHROPIC_API_KEY) {
      envArgs.push(`-e ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY}`);
    }
    if (process.env.OPENAI_API_KEY) {
      envArgs.push(`-e OPENAI_API_KEY=${process.env.OPENAI_API_KEY}`);
    }
    if (process.env.NODETERM_OPENCLAW_GATEWAY_TOKEN) {
      envArgs.push(`-e OPENCLAW_GATEWAY_TOKEN=${process.env.NODETERM_OPENCLAW_GATEWAY_TOKEN}`);
    }

    // Misma entrada que la imagen oficial, pero --bind lan para que el puerto publicado sea alcanzable
    // desde el host (ver comentario en Dockerfile de openclaw sobre loopback + bridge).
    const args = [
      'run -d',
      `--name ${this.containerName}`,
      '--restart unless-stopped',
      '--pull never',
      '--network nodeterm-network',
      `-p ${this.hostPort}:${this.containerPort}`,
      ...(process.platform === 'linux' ? ['--add-host host.docker.internal:host-gateway'] : []),
      `-v "${dataHostPath}:/home/node/.openclaw"`,
      ...envArgs,
      this.imageName,
      'node',
      'openclaw.mjs',
      'gateway',
      '--allow-unconfigured',
      '--bind',
      'lan'
    ].join(' ');

    const cmd = this.buildDockerCommand(args);
    console.log('[OpenClaw] Ejecutando:', cmd);
    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
      console.log('[OpenClaw] docker run stdout:', stdout?.trim());
      if (stderr) console.warn('[OpenClaw] docker run stderr:', stderr?.trim());
    } catch (runError) {
      console.error('[OpenClaw] docker run falló:', runError.message);
      throw new Error(`No se pudo iniciar el contenedor OpenClaw: ${runError.message}`);
    }
  }

  async waitForHealth() {
    this.status.phase = 'health';
    this.status.message = 'Esperando a que OpenClaw responda';
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.healthTimeoutMs) {
      const healthy = await this.checkHealth();
      if (healthy) {
        this.lastHealthCheck = Date.now();
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, this.healthIntervalMs));
    }

    throw new Error('El servicio OpenClaw no respondió dentro del tiempo esperado.');
  }

  checkHealth() {
    return new Promise((resolve) => {
      const request = http.get(this.healthUrl, (res) => {
        // Aceptar cualquier código que indique que el servidor HTTP está respondiendo,
        // incluyendo redirecciones (onboarding) y páginas no encontradas.
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
    this.status.message = 'Deteniendo OpenClaw';
    try {
      await execAsync(this.buildDockerCommand(`stop ${this.containerName}`));
    } catch (_) {}

    this.status.isRunning = false;
    this.status.phase = 'idle';
    this.status.message = 'OpenClaw detenido';
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

module.exports = OpenClawService;
