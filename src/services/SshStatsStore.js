/**
 * SshStatsStore - External reactive store for SSH telemetry and stats.
 * Decouples periodic (1-2s) SSH stats updates from the React component tree (App.js, MainContentArea, SplitLayout).
 * Prevents cascading root re-renders across the application by providing granular per-tabId subscriptions.
 */

import { useSyncExternalStore, useCallback } from 'react';

export class SshStatsStore {
  constructor() {
    this.statsByTabId = new Map();
    this.listenersByTabId = new Map();
    this.globalListeners = new Set();
  }

  /**
   * Sets new stats for a specific tab and notifies only subscribers of that tab.
   * @param {string} tabId
   * @param {Object} stats
   */
  setStats(tabId, stats) {
    if (!tabId) return;
    this.statsByTabId.set(tabId, stats);

    // Notify tab-specific subscribers
    const tabListeners = this.listenersByTabId.get(tabId);
    if (tabListeners && tabListeners.size > 0) {
      tabListeners.forEach(listener => {
        try {
          listener(stats);
        } catch (err) {
          console.error(`[SshStatsStore] Error in listener for tab ${tabId}:`, err);
        }
      });
    }

    // Notify global subscribers (if any)
    if (this.globalListeners.size > 0) {
      this.globalListeners.forEach(listener => {
        try {
          listener(this.statsByTabId);
        } catch (err) {
          console.error('[SshStatsStore] Error in global listener:', err);
        }
      });
    }
  }

  /**
   * Returns current stats for a specific tab.
   * @param {string} tabId
   * @returns {Object|null}
   */
  getStats(tabId) {
    if (!tabId) return null;
    return this.statsByTabId.get(tabId) || null;
  }

  /**
   * Returns a snapshot object of all current tab stats.
   * @returns {Record<string, any>}
   */
  getAllStats() {
    const result = {};
    for (const [key, value] of this.statsByTabId.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Removes stats and listeners for a tab that was closed.
   * @param {string} tabId
   */
  removeTab(tabId) {
    if (!tabId) return;
    this.statsByTabId.delete(tabId);
    this.listenersByTabId.delete(tabId);

    if (this.globalListeners.size > 0) {
      this.globalListeners.forEach(listener => {
        try {
          listener(this.statsByTabId);
        } catch (_) {}
      });
    }
  }

  /**
   * Clears all stored stats and listeners.
   */
  clear() {
    this.statsByTabId.clear();
    this.listenersByTabId.clear();
    this.globalListeners.clear();
  }

  /**
   * Subscribes a callback to stats changes for a specific tabId.
   * @param {string} tabId
   * @param {() => void} callback
   * @returns {() => void} Unsubscribe function
   */
  subscribeTab(tabId, callback) {
    if (!tabId || typeof callback !== 'function') return () => {};

    if (!this.listenersByTabId.has(tabId)) {
      this.listenersByTabId.set(tabId, new Set());
    }
    const listeners = this.listenersByTabId.get(tabId);
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listenersByTabId.delete(tabId);
      }
    };
  }

  /**
   * Subscribes to any stats update across all tabs.
   * @param {() => void} callback
   * @returns {() => void} Unsubscribe function
   */
  subscribeAll(callback) {
    if (typeof callback !== 'function') return () => {};
    this.globalListeners.add(callback);
    return () => {
      this.globalListeners.delete(callback);
    };
  }
}

export const sshStatsStore = new SshStatsStore();

/**
 * React hook to subscribe to stats for a single SSH tab without triggering
 * re-renders in parent components or unaffected tabs.
 *
 * @param {string|null|undefined} tabId
 * @returns {Object|null} The latest stats for this tab
 */
export function useSshTabStats(tabId) {
  const subscribe = useCallback((onStoreChange) => {
    if (!tabId) return () => {};
    return sshStatsStore.subscribeTab(tabId, onStoreChange);
  }, [tabId]);

  const getSnapshot = useCallback(() => {
    if (!tabId) return null;
    return sshStatsStore.getStats(tabId);
  }, [tabId]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export default sshStatsStore;
