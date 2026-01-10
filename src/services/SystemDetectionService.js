/**
 * 🚀 OPTIMIZACIÓN: Servicio centralizado de detección de sistema
 * Cachea los resultados para evitar múltiples llamadas IPC bloqueantes
 * y difiere las detecciones para no bloquear el render inicial.
 */

class SystemDetectionService {
  constructor() {
    this._cache = {
      wslDistributions: null,
      cygwinAvailable: null,
      dockerContainers: null,
    };
    this._pending = {
      wsl: null,
      cygwin: null,
      docker: null,
    };
    this._initialized = false;
    this._listeners = new Set();
  }

  /**
   * Suscribirse a cambios en las detecciones
   */
  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  _notify() {
    this._listeners.forEach(cb => cb(this.getAll()));
  }

  /**
   * Obtener todos los valores cacheados
   */
  getAll() {
    return { ...this._cache };
  }

  /**
   * Obtener distribuciones WSL (cacheado)
   */
  async getWSLDistributions() {
    if (this._cache.wslDistributions !== null) {
      return this._cache.wslDistributions;
    }

    if (this._pending.wsl) {
      return this._pending.wsl;
    }

    this._pending.wsl = this._detectWSL();
    const result = await this._pending.wsl;
    this._pending.wsl = null;
    return result;
  }

  async _detectWSL() {
    try {
      if (window.electron && window.electron.ipcRenderer) {
        const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
        this._cache.wslDistributions = Array.isArray(distributions) ? distributions : [];
        this._notify();
        return this._cache.wslDistributions;
      }
    } catch (error) {
      console.error('[SystemDetection] Error detectando WSL:', error);
    }
    this._cache.wslDistributions = [];
    this._notify();
    return [];
  }

  /**
   * Obtener disponibilidad de Cygwin (cacheado)
   */
  async getCygwinAvailable() {
    if (this._cache.cygwinAvailable !== null) {
      return this._cache.cygwinAvailable;
    }

    if (this._pending.cygwin) {
      return this._pending.cygwin;
    }

    this._pending.cygwin = this._detectCygwin();
    const result = await this._pending.cygwin;
    this._pending.cygwin = null;
    return result;
  }

  async _detectCygwin() {
    try {
      if (window.electron?.platform === 'win32' && window.electronAPI) {
        const result = await window.electronAPI.invoke('cygwin:detect');
        this._cache.cygwinAvailable = result?.available || false;
        this._notify();
        return this._cache.cygwinAvailable;
      }
    } catch (error) {
      console.error('[SystemDetection] Error detectando Cygwin:', error);
    }
    this._cache.cygwinAvailable = false;
    this._notify();
    return false;
  }

  /**
   * Obtener contenedores Docker (cacheado)
   */
  async getDockerContainers() {
    if (this._cache.dockerContainers !== null) {
      return this._cache.dockerContainers;
    }

    if (this._pending.docker) {
      return this._pending.docker;
    }

    this._pending.docker = this._detectDocker();
    const result = await this._pending.docker;
    this._pending.docker = null;
    return result;
  }

  async _detectDocker() {
    try {
      if (window.electron && window.electronAPI) {
        const result = await window.electronAPI.invoke('docker:list');
        this._cache.dockerContainers = result?.success ? (result.containers || []) : [];
        this._notify();
        return this._cache.dockerContainers;
      }
    } catch (error) {
      // Docker error es común, no loguear
    }
    this._cache.dockerContainers = [];
    this._notify();
    return [];
  }

  /**
   * Invalidar caché (para re-detectar)
   */
  invalidate(type = 'all') {
    if (type === 'all' || type === 'wsl') this._cache.wslDistributions = null;
    if (type === 'all' || type === 'cygwin') this._cache.cygwinAvailable = null;
    if (type === 'all' || type === 'docker') this._cache.dockerContainers = null;
    this._notify();
  }

  /**
   * Inicializar detecciones de forma diferida (no bloquea render)
   * Llamar después de que la app se haya renderizado
   */
  initializeDeferred(delayMs = 500) {
    if (this._initialized) return;
    this._initialized = true;

    setTimeout(() => {
      // Ejecutar detecciones en paralelo pero sin bloquear
      Promise.all([
        this.getWSLDistributions(),
        this.getCygwinAvailable(),
        this.getDockerContainers(),
      ]).catch(() => {});
    }, delayMs);
  }
}

// Singleton
const systemDetectionService = new SystemDetectionService();
export default systemDetectionService;
