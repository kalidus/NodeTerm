import { useCallback, useEffect, useRef } from 'react';
import { cloneForIpc } from '../utils/cloneForIpc';
import { getTabSurfaceRuntime, getTabSurfaceHandler } from '../utils/tabSurfaceRuntime';

const SKIP_CLONE_KEYS = new Set(['toast', 'sessionManager', 'secureStorage', 'terminalRefs']);
const EMPTY_LISTS = {
  homeTabs: [],
  sshTabs: [],
  rdpTabs: [],
  guacamoleTabs: [],
  fileExplorerTabs: []
};

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

function listsForTab(tab, listName, grouped, allTabs) {
  const lists = { ...EMPTY_LISTS };
  if (grouped && Array.isArray(grouped[listName])) {
    lists[listName] = cloneForIpc(grouped[listName]);
    return lists;
  }
  if (listName === 'homeTabs') {
    lists.homeTabs = cloneForIpc((allTabs || []).filter((item) => item && item.type === 'home'));
  } else {
    lists[listName] = cloneForIpc([tab]);
  }
  return lists;
}

/**
 * No crea vistas al abrir pestañas. La copia nativa solo existe al arrastrar
 * una pestaña fuera de la ventana.
 */
export function useTabSurfaces({
  enabled,
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
  const prepareDetachRef = useRef(null);

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
    const listName = listNameFor(tab, grouped);
    const lists = listsForTab(tab, listName, grouped, all);
    const state = {
      tab: cloneForIpc(tab),
      listName,
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

  prepareDetachRef.current = prepareDetach;

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
    const prepareFn = (tabKey) => {
      const fn = prepareDetachRef.current;
      return typeof fn === 'function' ? fn(tabKey) : undefined;
    };
    window.__nodetermPrepareDetach = prepareFn;
    const offCall = window.electron.ipcRenderer.on('tab-views:call', onCall);
    const offReleased = window.electron.ipcRenderer.on('tab-views:released', onReleased);
    const offAdopted = window.electron.ipcRenderer.on('tab-views:adopted', onAdopted);

    // Cursor "mover" al arrastrar una pastilla de shell sobre NodeTerm.
    // Capture: xterm/canvas y otros no burbujean dragover hasta document.
    const isTabChipDrag = (event) => {
      const types = event.dataTransfer && event.dataTransfer.types
        ? Array.from(event.dataTransfer.types)
        : [];
      return types.includes('application/x-nodeterm-tab-key') || types.includes('text/plain');
    };
    const onDragOver = (event) => {
      if (!isTabChipDrag(event)) return;
      event.preventDefault();
      try { event.dataTransfer.dropEffect = 'move'; } catch (_) { /* noop */ }
    };
    const onDrop = (event) => {
      if (!isTabChipDrag(event)) return;
      // El reintegro real lo hace dragend + IPC; solo aceptamos el drop para el cursor.
      event.preventDefault();
    };
    document.addEventListener('dragover', onDragOver, true);
    document.addEventListener('drop', onDrop, true);
    window.addEventListener('dragover', onDragOver, true);
    window.addEventListener('drop', onDrop, true);

    return () => {
      if (window.__nodetermPrepareDetach === prepareFn) delete window.__nodetermPrepareDetach;
      if (typeof offCall === 'function') offCall();
      if (typeof offReleased === 'function') offReleased();
      if (typeof offAdopted === 'function') offAdopted();
      document.removeEventListener('dragover', onDragOver, true);
      document.removeEventListener('drop', onDrop, true);
      window.removeEventListener('dragover', onDragOver, true);
      window.removeEventListener('drop', onDrop, true);
    };
  }, [apiReady]);

  return { apiReady };
}
