import { useCallback, useEffect, useRef } from 'react';
import { cloneForIpc } from '../utils/cloneForIpc';
import { getTabSurfaceRuntime, getTabSurfaceHandler } from '../utils/tabSurfaceRuntime';

const SKIP_CLONE_KEYS = new Set(['toast', 'sessionManager', 'secureStorage', 'terminalRefs']);

function splitBag(source) {
  const data = {};
  const methods = [];
  if (!source || typeof source !== 'object') return { data, methods };
  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (typeof value === 'function') {
      methods.push(key);
      return;
    }
    if (SKIP_CLONE_KEYS.has(key)) return;
    data[key] = cloneForIpc(value);
  });
  return { data, methods };
}

function listNameFor(tab, grouped) {
  if (!tab) return 'sshTabs';
  if (!grouped) {
    if (tab.type === 'home') return 'homeTabs';
    if (tab.type === 'rdp' || tab.type === 'rdp-guacamole' || tab.type === 'vnc' || tab.type === 'vnc-guacamole' || tab.type === 'iron-rdp') return 'rdpTabs';
    if (tab.type === 'guacamole') return 'guacamoleTabs';
    if (tab.type === 'explorer') return 'fileExplorerTabs';
    return 'sshTabs';
  }
  const has = (list) => Array.isArray(list) && list.some((item) => item && item.key === tab.key);
  if (has(grouped.homeTabs)) return 'homeTabs';
  if (has(grouped.rdpTabs)) return 'rdpTabs';
  if (has(grouped.guacamoleTabs)) return 'guacamoleTabs';
  if (has(grouped.fileExplorerTabs)) return 'fileExplorerTabs';
  return 'sshTabs';
}

/**
 * No crea vistas al abrir pestañas. La copia nativa solo existe al arrastrar
 * una pestaña fuera de la ventana.
 */
export function useTabSurfaces({
  enabled,
  tabsSignature,
  getAllTabs,
  getFilteredTabs,
  activeTabIndex,
  releaseTabByKey,
  contentProps,
  settingsTabProps,
  extraHandlers,
  isRecordingTab,
  isMinimalMode,
  titleBarCollapsed,
  tabBarCollapsed
}) {
  const knownRef = useRef(new Set());
  const releasedRef = useRef(new Set());
  const apiRef = useRef({});
  const propsRef = useRef({});

  propsRef.current = {
    getAllTabs,
    getFilteredTabs,
    activeTabIndex,
    releaseTabByKey,
    contentProps,
    settingsTabProps,
    extraHandlers,
    isRecordingTab,
    isMinimalMode,
    titleBarCollapsed,
    tabBarCollapsed
  };

  const apiReady = enabled !== false && typeof window !== 'undefined' && !!window.electron?.tabViews;

  const contentHostRef = useCallback(() => {}, []);

  useEffect(() => {
    if (!apiReady) return undefined;
    const onCall = (payload) => {
      if (!payload) return;
      const { requestId, method, args } = payload;
      const finish = (result) => {
        window.electron.tabViews.callResult({ requestId, result: cloneForIpc(result) });
      };
      try {
        const fn = getTabSurfaceHandler(method) || apiRef.current[method];
        if (typeof fn !== 'function') {
          finish(null);
          return;
        }
        Promise.resolve(fn(...(args || []))).then(finish).catch(() => finish(null));
      } catch (_) {
        finish(null);
      }
    };
    const onReleased = (payload) => {
      const tabKey = payload && payload.tabKey;
      if (!tabKey) return;
      releasedRef.current.add(tabKey);
      const release = propsRef.current.releaseTabByKey;
      if (typeof release === 'function') release(tabKey);
    };
    const onAdopted = (payload) => {
      if (!payload || !payload.tab || !payload.tabKey) return;
      releasedRef.current.delete(payload.tabKey);
      const adopt = propsRef.current.extraHandlers && propsRef.current.extraHandlers.adoptTab;
      if (typeof adopt === 'function') adopt(payload.tab, payload.listName);
    };
    const offCall = window.electron.ipcRenderer.on('tab-views:call', onCall);
    const offReleased = window.electron.ipcRenderer.on('tab-views:released', onReleased);
    const offAdopted = window.electron.ipcRenderer.on('tab-views:adopted', onAdopted);
    return () => {
      if (typeof offCall === 'function') offCall();
      if (typeof offReleased === 'function') offReleased();
      if (typeof offAdopted === 'function') offAdopted();
    };
  }, [apiReady]);

  const syncApi = useCallback(() => {
    const current = propsRef.current;
    apiRef.current = {
      ...(current.contentProps || {}),
      ...(current.extraHandlers || {}),
      patchTab: (tab) => {
        const patch = current.extraHandlers && current.extraHandlers.patchTab;
        if (typeof patch === 'function') patch(tab);
      }
    };
    Object.keys(current.settingsTabProps || {}).forEach((key) => {
      const value = current.settingsTabProps[key];
      if (typeof value === 'function') apiRef.current[`settings:${key}`] = value;
    });
  }, []);

  const prepareDetach = useCallback(async (tabKey) => {
    if (!apiReady || !tabKey || !window.electron?.tabViews) return;
    syncApi();
    const current = propsRef.current;
    const tabs = (current.getAllTabs ? current.getAllTabs() : []).filter((tab) => tab && tab.key && !tab.embedInHome);
    const tab = tabs.find((item) => item.key === tabKey);
    if (!tab) return;
    const runtime = getTabSurfaceRuntime();
    const contentBag = splitBag(current.contentProps);
    const settingsBag = splitBag(current.settingsTabProps);
    const all = current.getAllTabs ? current.getAllTabs() : [];
    const grouped = current.extraHandlers?.groupedTabs;
    const lists = grouped ? {
      homeTabs: cloneForIpc(grouped.homeTabs || []),
      sshTabs: cloneForIpc(grouped.sshTabs || []),
      rdpTabs: cloneForIpc(grouped.rdpTabs || []),
      guacamoleTabs: cloneForIpc(grouped.guacamoleTabs || []),
      fileExplorerTabs: cloneForIpc(grouped.fileExplorerTabs || [])
    } : {
      homeTabs: cloneForIpc(all.filter((item) => item && item.type === 'home')),
      sshTabs: cloneForIpc(all.filter((item) => item && item.type !== 'home')),
      rdpTabs: [],
      guacamoleTabs: [],
      fileExplorerTabs: []
    };
    const state = {
      tab: cloneForIpc(tab),
      listName: listNameFor(tab, grouped),
      isActive: true,
      ...lists,
      contentProps: contentBag.data,
      contentMethods: contentBag.methods,
      settingsProps: settingsBag.data,
      settingsMethods: settingsBag.methods,
      masterKey: current.contentProps?.masterKey || null,
      flags: {
        fileExplorerTabId: runtime.fileExplorerTabId,
        systemMonitorTabId: runtime.systemMonitorTabId,
        contentBlocked: false,
        isRecording: typeof current.isRecordingTab === 'function' ? !!current.isRecordingTab(tab.key) : false,
        isMinimalMode: !!current.isMinimalMode,
        titleBarCollapsed: !!current.titleBarCollapsed,
        tabBarCollapsed: !!current.tabBarCollapsed
      }
    };
    const created = await window.electron.tabViews.ensure(tab.key);
    if (!created || created.ok === false) return;
    knownRef.current.add(tab.key);
    await window.electron.tabViews.updateState(tab.key, state);
  }, [apiReady, syncApi]);

  useEffect(() => {
    syncApi();
    window.__nodetermPrepareDetach = prepareDetach;
    return () => {
      if (window.__nodetermPrepareDetach === prepareDetach) delete window.__nodetermPrepareDetach;
    };
  }, [syncApi, prepareDetach, contentProps, settingsTabProps, extraHandlers]);

  return { contentHostRef, hostedTabKeys: [], apiReady };
}
