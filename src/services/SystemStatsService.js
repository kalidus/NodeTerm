/**
 * SystemStatsService - Centralized reactive service for system statistics.
 * Consolidates all component polling loops into a single singleton with reference counting.
 * When 0 subscribers exist, or local telemetry is disabled, polling completely stops.
 */

import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../utils/constants';

function mapSystemStatsToPayload(systemStats) {
  if (!systemStats) return null;

  const memTotalBytes = (systemStats.memory?.total || 0) * 1024 * 1024 * 1024;
  const memUsedBytes = (systemStats.memory?.used || 0) * 1024 * 1024 * 1024;
  const memFreeBytes = (systemStats.memory?.free || 0) * 1024 * 1024 * 1024;

  const disk = Array.isArray(systemStats.disks)
    ? systemStats.disks.map(d => ({
        fs: d.name,
        mount: d.mount,
        use: d.percentage,
        isNetwork: d.isNetwork,
        usedGb: d.used,
        totalGb: d.total
      }))
    : [];

  const rxBytesPerSec = ((systemStats.network?.download || 0) * 1000000) / 8;
  const txBytesPerSec = ((systemStats.network?.upload || 0) * 1000000) / 8;

  let distroVal = systemStats.platform === 'win32' ? 'windows' : (systemStats.platform === 'darwin' ? 'macos' : 'linux');
  if (systemStats.platform === 'linux' && systemStats.osPrettyName) {
    const pretty = systemStats.osPrettyName.toLowerCase();
    const distros = ['ubuntu', 'debian', 'fedora', 'centos', 'arch', 'opensuse', 'redhat', 'rhel', 'alpine', 'kali', 'gentoo', 'linuxmint', 'pop'];
    const found = distros.find(d => pretty.includes(d));
    if (found) {
      distroVal = found === 'rhel' ? 'redhat' : found;
    }
  }

  return {
    cpu: Math.round((systemStats.cpu?.usage || 0) * 10) / 10,
    mem: { total: memTotalBytes, used: memUsedBytes, free: memFreeBytes },
    disk,
    network: { rx_speed: rxBytesPerSec, tx_speed: txBytesPerSec },
    networkInterfaces: Array.isArray(systemStats.networkInterfaces) ? systemStats.networkInterfaces : [],
    hostname: systemStats.hostname,
    ip: systemStats.ip || undefined,
    distro: distroVal,
    versionId: systemStats.osVersion || '',
    kernel: systemStats.kernel || '',
    platform: systemStats.platform || (typeof window !== 'undefined' && window.electron?.platform) || 'win32',
    arch: systemStats.arch || '',
    osPrettyName: systemStats.osPrettyName || '',
    uptime: systemStats.uptime || '',
    cpuMeta: {
      cores: systemStats.cpu?.cores || 0,
      model: systemStats.cpu?.model || '',
      perCpuLoad: systemStats.cpu?.perCpuLoad || [],
    },
    raw: systemStats
  };
}

function readPollIntervalMs() {
  const isLinux = typeof window !== 'undefined' && window.electron?.platform === 'linux';
  const fallback = isLinux ? 5000 : 2000;
  try {
    const saved = localStorage.getItem('statusBarPollingInterval');
    const sec = parseInt(saved, 10);
    if (Number.isFinite(sec) && sec >= 1) {
      return Math.max(1000, Math.min(20000, sec * 1000));
    }
  } catch (_) {}
  return fallback;
}

function readTelemetryEnabled() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCAL_TELEMETRY_ENABLED);
    if (saved === null) return true;
    return saved === 'true' || saved === '1';
  } catch (_) {
    return true;
  }
}

class SystemStatsService {
  constructor() {
    this.subscribers = new Set();
    this.timer = null;
    this.pollArmed = false;
    this.isFetching = false;
    this.latestStats = null;
    this.pollIntervalMs = readPollIntervalMs();
    this.isPaused = false;
    this.telemetryEnabled = readTelemetryEnabled();
    this.demandSeq = 0;

    // Escuchar eventos del sistema para suspender el polling cuando la pantalla se bloquee o entre en reposo
    if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('system:lock-screen', () => this.handleSystemPause());
      window.electron.ipcRenderer.on('system:suspend', () => this.handleSystemPause());
      window.electron.ipcRenderer.on('system:unlock-screen', () => this.handleSystemResume());
      window.electron.ipcRenderer.on('system:resume', () => this.handleSystemResume());
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('local-telemetry-enabled-changed', (e) => {
        const enabled = e?.detail?.enabled;
        this.setTelemetryEnabled(enabled !== false);
      });
      window.addEventListener('settings-updated', () => {
        this.setTelemetryEnabled(readTelemetryEnabled());
      });
      window.addEventListener('localstorage-sync-ready', () => {
        this.setTelemetryEnabled(readTelemetryEnabled());
      });
    }
  }

  isTelemetryEnabled() {
    return this.telemetryEnabled;
  }

  setTelemetryEnabled(enabled) {
    const next = !!enabled;
    if (this.telemetryEnabled === next) return;
    this.telemetryEnabled = next;
    if (!next) {
      this.latestStats = null;
      this.stopPolling();
      this.notifyDemand();
      this.subscribers.forEach((cb) => {
        try { cb(null); } catch (_) {}
      });
      return;
    }
    if (this.subscribers.size > 0 && !this.isPaused) {
      this.beginPollingAfterDemand();
    }
  }

  canPoll() {
    return this.telemetryEnabled && this.subscribers.size > 0 && !this.isPaused;
  }

  handleSystemPause() {
    this.isPaused = true;
    this.stopPolling();
    this.notifyDemand();
  }

  handleSystemResume() {
    this.isPaused = false;
    if (this.canPoll()) {
      this.beginPollingAfterDemand();
    }
  }

  notifyDemand() {
    if (typeof window === 'undefined' || typeof window.electron?.ipcRenderer?.invoke !== 'function') {
      return Promise.resolve();
    }
    const seq = ++this.demandSeq;
    const active = this.canPoll();
    return window.electron.ipcRenderer.invoke('stats:set-demand', {
      active,
      intervalMs: this.pollIntervalMs,
      seq
    }).catch(() => {});
  }

  beginPollingAfterDemand() {
    const start = () => {
      if (this.canPoll()) this.startPolling();
    };
    const pending = this.notifyDemand();
    if (pending && typeof pending.finally === 'function') pending.finally(start);
    else start();
  }

  /**
   * Returns the current cached stats immediately.
   */
  getLatestStats() {
    return this.latestStats;
  }

  /**
   * Sets custom polling interval (in milliseconds).
   */
  setIntervalMs(ms) {
    const validMs = Math.max(1000, Math.min(20000, Number(ms) || 2000));
    this.pollIntervalMs = validMs;
    this.notifyDemand();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      if (this.canPoll()) {
        this.timer = setTimeout(() => this.pollLoop(), this.pollIntervalMs);
      }
    }
  }

  /**
   * Subscribes a callback to receive stats updates.
   * Starts the polling loop when the first subscriber joins (if telemetry is enabled).
   * Returns an unsubscribe function.
   *
   * @param {(stats: ReturnType<mapSystemStatsToPayload>) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') return () => {};

    this.subscribers.add(callback);

    // Si ya tenemos estadísticas cacheadas y la telemetría está activa, entregarlas
    if (this.telemetryEnabled && this.latestStats) {
      try {
        callback(this.latestStats);
      } catch (_) {}
    } else if (!this.telemetryEnabled) {
      try {
        callback(null);
      } catch (_) {}
    }

    // Iniciar bucle si es el primer suscriptor y no está en pausa
    if (this.subscribers.size === 1 && this.canPoll()) {
      this.beginPollingAfterDemand();
    } else if (!this.telemetryEnabled) {
      this.notifyDemand();
    }

    return () => {
      this.subscribers.delete(callback);
      // Detener bucle si ya no quedan suscriptores
      if (this.subscribers.size === 0) {
        this.stopPolling();
        this.notifyDemand();
      }
    };
  }

  startPolling() {
    if (this.timer || !this.canPoll() || this.pollArmed) return;
    this.pollArmed = true;
    this.fetchOnce().finally(() => {
      this.pollArmed = false;
      if (this.canPoll() && !this.timer) {
        this.timer = setTimeout(() => this.pollLoop(), this.pollIntervalMs);
      }
    });
  }

  stopPolling() {
    this.pollArmed = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async pollLoop() {
    this.timer = null;
    if (!this.canPoll()) return;

    await this.fetchOnce();

    if (this.canPoll()) {
      this.timer = setTimeout(() => this.pollLoop(), this.pollIntervalMs);
    }
  }

  async fetchOnce() {
    if (this.isFetching || !this.canPoll()) return;
    if (typeof window === 'undefined' || !window.electronAPI?.getSystemStats) return;

    this.isFetching = true;
    try {
      const raw = await window.electronAPI.getSystemStats();
      if (raw && this.canPoll()) {
        const payload = mapSystemStatsToPayload(raw);
        this.latestStats = payload;
        // Notificar a todos los suscriptores en el mismo tick
        this.subscribers.forEach((cb) => {
          try {
            cb(payload);
          } catch (err) {
            console.error('[SystemStatsService] Error en callback de suscriptor:', err);
          }
        });
      }
    } catch (e) {
      // Ignorar errores de transporte para no romper el bucle
    } finally {
      this.isFetching = false;
    }
  }
}

export const systemStatsService = new SystemStatsService();

/**
 * React hook to consume consolidated system stats in functional components.
 * Automatically subscribes on mount and unsubscribes on unmount.
 */
export function useSystemStats(options = {}) {
  const enabled = options.enabled !== false;
  const [stats, setStats] = useState(() => (
    systemStatsService.isTelemetryEnabled() ? systemStatsService.getLatestStats() : null
  ));
  const [telemetryEnabled, setTelemetryEnabled] = useState(() => systemStatsService.isTelemetryEnabled());

  useEffect(() => {
    if (!enabled) return undefined;
    const onToggle = (e) => {
      setTelemetryEnabled(e?.detail?.enabled !== false);
    };
    window.addEventListener('local-telemetry-enabled-changed', onToggle);
    const unsubscribe = systemStatsService.subscribe((newStats) => {
      setStats(newStats);
      setTelemetryEnabled(systemStatsService.isTelemetryEnabled());
    });
    return () => {
      window.removeEventListener('local-telemetry-enabled-changed', onToggle);
      unsubscribe();
    };
  }, [enabled]);

  return { stats, telemetryEnabled };
}

export default systemStatsService;
