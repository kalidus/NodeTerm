/**
 * SystemStatsService - Centralized reactive service for system statistics.
 * Consolidates all component polling loops into a single singleton with reference counting.
 * When 0 subscribers exist, polling completely stops to save CPU and power.
 */

import { useState, useEffect } from 'react';

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

class SystemStatsService {
  constructor() {
    this.subscribers = new Set();
    this.timer = null;
    this.isFetching = false;
    this.latestStats = null;
    this.pollIntervalMs = 2000;
    this.isPaused = false;

    // Escuchar eventos del sistema para suspender el polling cuando la pantalla se bloquee o entre en reposo
    if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('system:lock-screen', () => this.handleSystemPause());
      window.electron.ipcRenderer.on('system:suspend', () => this.handleSystemPause());
      window.electron.ipcRenderer.on('system:unlock-screen', () => this.handleSystemResume());
      window.electron.ipcRenderer.on('system:resume', () => this.handleSystemResume());
    }
  }

  handleSystemPause() {
    this.isPaused = true;
    this.stopPolling();
  }

  handleSystemResume() {
    this.isPaused = false;
    if (this.subscribers.size > 0) {
      this.startPolling();
    }
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
    const validMs = Math.max(1000, Number(ms) || 2000);
    this.pollIntervalMs = validMs;
    if (this.timer) {
      clearTimeout(this.timer);
      if (!this.isPaused) {
        this.timer = setTimeout(() => this.pollLoop(), this.pollIntervalMs);
      }
    }
  }

  /**
   * Subscribes a callback to receive stats updates.
   * Starts the polling loop when the first subscriber joins.
   * Returns an unsubscribe function.
   *
   * @param {(stats: ReturnType<mapSystemStatsToPayload>) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') return () => {};

    this.subscribers.add(callback);

    // Si ya tenemos estadísticas cacheadas, entregarlas inmediatamente al nuevo suscriptor
    if (this.latestStats) {
      try {
        callback(this.latestStats);
      } catch (_) {}
    }

    // Iniciar bucle si es el primer suscriptor y no está en pausa
    if (this.subscribers.size === 1 && !this.isPaused) {
      this.startPolling();
    }

    return () => {
      this.subscribers.delete(callback);
      // Detener bucle si ya no quedan suscriptores
      if (this.subscribers.size === 0) {
        this.stopPolling();
      }
    };
  }

  startPolling() {
    if (this.timer || this.isPaused) return;
    this.fetchOnce().finally(() => {
      if (this.subscribers.size > 0 && !this.isPaused) {
        this.timer = setTimeout(() => this.pollLoop(), this.pollIntervalMs);
      }
    });
  }

  stopPolling() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async pollLoop() {
    this.timer = null;
    if (this.subscribers.size === 0 || this.isPaused) return;

    await this.fetchOnce();

    if (this.subscribers.size > 0 && !this.isPaused) {
      this.timer = setTimeout(() => this.pollLoop(), this.pollIntervalMs);
    }
  }

  async fetchOnce() {
    if (this.isFetching || this.isPaused) return;
    if (typeof window === 'undefined' || !window.electronAPI?.getSystemStats) return;

    this.isFetching = true;
    try {
      const raw = await window.electronAPI.getSystemStats();
      if (raw) {
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
  const [stats, setStats] = useState(() => systemStatsService.getLatestStats());

  useEffect(() => {
    if (!enabled) return undefined;
    return systemStatsService.subscribe((newStats) => {
      setStats(newStats);
    });
  }, [enabled]);

  return stats;
}

export default systemStatsService;
