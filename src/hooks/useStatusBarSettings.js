import { useEffect, useCallback } from 'react';
import { useLocalStorage, useLocalStorageString, useLocalStorageNumber } from './useLocalStorage';
import { systemStatsService } from '../services/SystemStatsService';
import {
  STATUSBAR_LAYOUT_STORAGE_KEY,
  DEFAULT_STATUSBAR_LAYOUT,
  loadStatusBarLayout,
  normalizeStatusBarLayout,
  saveStatusBarLayout
} from '../config/statusBarItems';

export const useStatusBarSettings = () => {
  const [statusBarIconTheme, setStatusBarIconTheme] = useLocalStorageString('basicapp_statusbar_icon_theme', 'classic');
  const [statusBarPollingInterval, setStatusBarPollingInterval] = useLocalStorageNumber('statusBarPollingInterval', 3);
  const [statusBarLayout, setStatusBarLayoutState] = useLocalStorage(
    STATUSBAR_LAYOUT_STORAGE_KEY,
    loadStatusBarLayout()
  );

  const setStatusBarLayout = useCallback((updater) => {
    setStatusBarLayoutState((prev) => {
      const normalizedPrev = normalizeStatusBarLayout(prev);
      return typeof updater === 'function'
        ? normalizeStatusBarLayout(updater(normalizedPrev))
        : normalizeStatusBarLayout(updater);
    });
  }, [setStatusBarLayoutState]);

  useEffect(() => {
    const normalized = normalizeStatusBarLayout(statusBarLayout);
    window.dispatchEvent(new CustomEvent('statusbar-layout-changed', { detail: normalized }));
  }, [statusBarLayout]);

  useEffect(() => {
    const intervalMs = Math.max(1000, Math.min(20000, (Number(statusBarPollingInterval) || 3) * 1000));
    systemStatsService.setIntervalMs(intervalMs);
    if (window?.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('statusbar:set-polling-interval', statusBarPollingInterval);
    }
  }, [statusBarPollingInterval]);

  useEffect(() => {
    const onCatalog = (event) => {
      if (event.detail?.key === 'statusbar-icons' && event.detail.value) {
        setStatusBarIconTheme(event.detail.value);
      }
    };
    window.addEventListener('appearance-catalog-changed', onCatalog);
    return () => window.removeEventListener('appearance-catalog-changed', onCatalog);
  }, [setStatusBarIconTheme]);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem('basicapp_statusbar_height') || '32', 10);
    const height = Number.isFinite(saved) ? Math.max(20, Math.min(48, saved)) : 32;
    document.documentElement.style.setProperty('--statusbar-height', `${height}px`);
  }, []);

  useEffect(() => {
    const normalized = normalizeStatusBarLayout(statusBarLayout);
    if (JSON.stringify(normalized) !== JSON.stringify(statusBarLayout)) {
      setStatusBarLayoutState(normalized);
    }
  }, [statusBarLayout, setStatusBarLayoutState]);

  const updateStatusBarFromSync = () => {
    const updatedStatusBarIconTheme = localStorage.getItem('basicapp_statusbar_icon_theme') || 'classic';
    const updatedStatusBarPollingInterval = localStorage.getItem('statusBarPollingInterval');

    setStatusBarIconTheme(updatedStatusBarIconTheme);
    if (updatedStatusBarPollingInterval) {
      setStatusBarPollingInterval(parseInt(updatedStatusBarPollingInterval, 10));
    }

    setStatusBarLayoutState(loadStatusBarLayout());
  };

  return {
    statusBarIconTheme,
    setStatusBarIconTheme,
    statusBarPollingInterval,
    setStatusBarPollingInterval,
    statusBarLayout: normalizeStatusBarLayout(statusBarLayout),
    setStatusBarLayout,
    updateStatusBarFromSync
  };
};

export { DEFAULT_STATUSBAR_LAYOUT, loadStatusBarLayout, saveStatusBarLayout };
