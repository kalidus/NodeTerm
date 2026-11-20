import { useCallback, useEffect, useRef, useState } from 'react';
import { cloneForIpc } from '../utils/cloneForIpc';
import { getTabSurfaceRuntime, getTabSurfaceHandler } from '../utils/tabSurfaceRuntime';
import { isSurfaceHostedTab } from '../utils/surfaceHostedTab';

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
    if (tab.type === 'rdp' || tab.type === 'rdp-guacamole' || tab.type === 'vnc' || tab.type === 'vnc-guacamole' || tab.type === 'iron-rdp' || tab.type === 'rdp-iron') return 'rdpTabs';
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
 * SSH/local: inline. RDP/VNC: WebContentsView desde el inicio (detach sin reconectar).
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
  const hostNodeRef = useRef(null);
  const layoutRafRef = useRef(0);
  const [hostedKeys, setHostedKeys] = useState([]);

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

  const buildState = useCallback((tab, isActive) => {
    const current = propsRef.current;
    const runtime = getTabSurfaceRuntime();
    const contentBag = splitBag(current.contentProps);
    const settingsBag = splitBag(current.settingsTabProps);
    const all = current.getAllTabs ? current.getAllTabs() : [];
    const grouped = current.extraHandlers?.groupedTabs;
    const listName = listNameFor(tab, grouped);
    const lists = listsForTab(tab, listName, grouped, all);
    return {
      tab: cloneForIpc(tab),
      listName,
      isActive: !!isActive,
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
  }, []);

  const ensureHostedTab = useCallback(async (tab, isActive) => {
    if (!apiReady || !tab?.key || !window.electron?.tabViews) return false;
    syncApi();
    const created = await window.electron.tabViews.ensure(tab.key);
    if (!created || created.ok === false) return false;
    knownRef.current.add(tab.key);
    await window.electron.tabViews.updateState(tab.key, buildState(tab, isActive));
    return true;
  }, [apiReady, syncApi, buildState]);

  const prepareDetach = useCallback(async (tabKey) => {
    if (!apiReady || !tabKey || !window.electron?.tabViews) return;
    syncApi();
    const current = propsRef.current;
    const tabs = (current.getAllTabs ? current.getAllTabs() : []).filter((tab) => tab && tab.key && !tab.embedInHome);
    const tab = tabs.find((item) => item.key === tabKey);
    if (!tab) return;
    await ensureHostedTab(tab, true);
  }, [apiReady, syncApi, ensureHostedTab]);

  prepareDetachRef.current = prepareDetach;

  const publishLayout = useCallback(() => {
    if (layoutRafRef.current) return;
    layoutRafRef.current = requestAnimationFrame(() => {
      layoutRafRef.current = 0;
      const node = hostNodeRef.current;
      if (!node || !window.electron?.tabViews?.layout) return;
      const current = propsRef.current;
      const filtered = typeof current.getFilteredTabs === 'function' ? current.getFilteredTabs() : [];
      const active = filtered[current.activeTabIndex];
      const activeKey = active && isSurfaceHostedTab(active) && !releasedRef.current.has(active.key)
        ? active.key
        : null;
      const rect = node.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      window.electron.tabViews.layout({
        activeKey,
        visible: !!activeKey,
        bounds: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
      }).catch(() => {});
    });
  }, []);

  const setSurfaceHostNode = useCallback((node) => {
    hostNodeRef.current = node;
    if (node) publishLayout();
  }, [publishLayout]);

  // Mantener WebContentsView para RDP/VNC abiertos en main.
  useEffect(() => {
    if (!apiReady) return undefined;
    let cancelled = false;

    const sync = async () => {
      const current = propsRef.current;
      const all = (current.getAllTabs ? current.getAllTabs() : []).filter((tab) => tab && tab.key && !tab.embedInHome);
      const filtered = typeof current.getFilteredTabs === 'function' ? current.getFilteredTabs() : [];
      const active = filtered[current.activeTabIndex];
      const wanted = all.filter(isSurfaceHostedTab);

      for (const key of [...knownRef.current]) {
        const stillWanted = wanted.some((tab) => tab.key === key);
        if (!stillWanted && !releasedRef.current.has(key)) {
          knownRef.current.delete(key);
          try { await window.electron.tabViews.destroy(key); } catch (_) { /* noop */ }
        }
      }

      for (const tab of wanted) {
        if (cancelled || releasedRef.current.has(tab.key)) continue;
        const isActive = !!(active && active.key === tab.key);
        await ensureHostedTab(tab, isActive);
      }

      if (!cancelled) {
        const nextKeys = [...knownRef.current].filter((key) => !releasedRef.current.has(key));
        setHostedKeys((prev) => {
          if (prev.length === nextKeys.length && prev.every((key, i) => key === nextKeys[i])) return prev;
          return nextKeys;
        });
        publishLayout();
      }
    };

    sync();
    return () => { cancelled = true; };
  }, [
    apiReady,
    ensureHostedTab,
    publishLayout,
    activeTabIndex,
    // Re-sync when tab lists change (via props identity from App).
    getAllTabs,
    getFilteredTabs,
    contentProps,
    settingsTabProps,
    isMinimalMode,
    titleBarCollapsed,
    tabBarCollapsed
  ]);

  useEffect(() => {
    if (!apiReady) return undefined;
    publishLayout();
    const node = hostNodeRef.current;
    const onResize = () => publishLayout();
    window.addEventListener('resize', onResize);
    let observer = null;
    if (node && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => publishLayout());
      observer.observe(node);
    }
    return () => {
      window.removeEventListener('resize', onResize);
      if (observer) observer.disconnect();
      if (layoutRafRef.current) {
        cancelAnimationFrame(layoutRafRef.current);
        layoutRafRef.current = 0;
      }
    };
  }, [apiReady, publishLayout, hostedKeys]);

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
      setHostedKeys((prev) => prev.filter((key) => key !== tabKey));
      publishLayout();
    };
    const onAdopted = (payload) => {
      if (!payload || !payload.tab || !payload.tabKey) return;
      releasedRef.current.delete(payload.tabKey);
      if (isSurfaceHostedTab(payload.tab)) {
        knownRef.current.add(payload.tabKey);
        setHostedKeys((prev) => (prev.includes(payload.tabKey) ? prev : [...prev, payload.tabKey]));
      }
      const adopt = propsRef.current.extraHandlers && propsRef.current.extraHandlers.adoptTab;
      if (typeof adopt === 'function') adopt(payload.tab, payload.listName);
      publishLayout();
    };
    const prepareFn = (tabKey) => {
      const fn = prepareDetachRef.current;
      return typeof fn === 'function' ? fn(tabKey) : undefined;
    };
    window.__nodetermPrepareDetach = prepareFn;
    const offCall = window.electron.ipcRenderer.on('tab-views:call', onCall);
    const offReleased = window.electron.ipcRenderer.on('tab-views:released', onReleased);
    const offAdopted = window.electron.ipcRenderer.on('tab-views:adopted', onAdopted);

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
  }, [apiReady, publishLayout]);

  const isTabSurfaceHosted = useCallback((tabOrKey) => {
    const key = typeof tabOrKey === 'string' ? tabOrKey : tabOrKey?.key;
    if (!key) return false;
    if (releasedRef.current.has(key)) return false;
    return knownRef.current.has(key) || hostedKeys.includes(key);
  }, [hostedKeys]);

  return {
    apiReady,
    hostedKeys,
    setSurfaceHostNode,
    publishSurfaceLayout: publishLayout,
    isTabSurfaceHosted,
    deferToSurfaceHost: true
  };
}
