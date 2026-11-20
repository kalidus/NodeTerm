import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toast } from 'primereact/toast';
import TabContentRenderer from './TabContentRenderer';
import HomeEmbeddedSessions from './home/HomeEmbeddedSessions';
import { LazyFileExplorer, LazySSHSystemMonitorPanel, TabChunkFallback } from './tabLoaders';
import ErrorBoundary from './ErrorBoundary';
import SecureStorage from '../services/SecureStorage';
import { cloneForIpc } from '../utils/cloneForIpc';
import { findNodeByKeyInTree } from '../utils/importIntoVaultTree';
import { stopTabSession } from '../utils/stopTabSession';

const LIST_SETTERS = {
  setSshTabs: 'sshTabs',
  setRdpTabs: 'rdpTabs',
  setGuacamoleTabs: 'guacamoleTabs',
  setFileExplorerTabs: 'fileExplorerTabs',
  setHomeTabs: 'homeTabs'
};

function bindCaller(tabKey, method) {
  return (...args) => {
    const safe = (args || []).map((item) => cloneForIpc(item));
    const pending = window.electron?.tabViews?.call(tabKey, method, safe);
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
    return undefined;
  };
}

export default function TabHostApp({ tabKey }) {
  const [model, setModel] = useState(null);
  const [localExplorer, setLocalExplorer] = useState(false);
  const [localMonitor, setLocalMonitor] = useState(false);
  const toast = useRef(null);
  const terminalRefs = useRef({});
  const secureStorage = useMemo(() => new SecureStorage(), []);
  const tabRef = useRef(null);
  tabRef.current = model && model.tab;

  useEffect(() => {
    let unsubscribe = () => {};
    const apply = (state) => {
      if (state && state.tab) setModel(state);
    };
    window.electron?.tabViews?.getState(tabKey).then(apply).catch(() => {});
    if (window.electron?.ipcRenderer?.on) {
      unsubscribe = window.electron.ipcRenderer.on('tab-views:state', apply) || unsubscribe;
    }
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [tabKey]);

  useEffect(() => {
    if (!window.electron?.ipcRenderer?.on) return undefined;
    const offCmd = window.electron.ipcRenderer.on('tab-views:terminal-cmd', (payload) => {
      if (!payload || payload.tabKey !== tabKey) return;
      const ref = terminalRefs.current[payload.targetKey || tabKey];
      if (ref && payload.cmd === 'fit' && typeof ref.fit === 'function') ref.fit();
      if (ref && payload.cmd === 'focus' && typeof ref.focus === 'function') ref.focus();
    });
    const offClose = window.electron.ipcRenderer.on('tab-views:prepare-close', () => {
      stopTabSession(tabRef.current);
    });
    return () => {
      if (typeof offCmd === 'function') offCmd();
      if (typeof offClose === 'function') offClose();
    };
  }, [tabKey]);

  const bindListSetter = useCallback((method, listName) => (updater) => {
    setModel((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev[listName]) ? prev[listName] : [];
      let next = list;
      try {
        next = typeof updater === 'function' ? updater(list) : updater;
      } catch (_) {
        next = list;
      }
      const tab = (next || []).find((item) => item && item.key === tabKey) || prev.tab;
      const safeTab = cloneForIpc(tab);
      queueMicrotask(() => {
        window.electron?.tabViews?.call(tabKey, 'patchTab', [safeTab]);
      });
      return { ...prev, [listName]: next, tab: tab || prev.tab };
    });
  }, [tabKey]);

  if (!model || !model.tab) {
    return <div style={{ background: '#0a0f1f', width: '100%', height: '100%' }} />;
  }

  const content = { ...(model.contentProps || {}) };
  (model.contentMethods || []).forEach((name) => {
    if (LIST_SETTERS[name]) content[name] = bindListSetter(name, LIST_SETTERS[name]);
    else content[name] = bindCaller(tabKey, name);
  });
  content.terminalRefs = terminalRefs;
  content.findNodeByKey = (key) => findNodeByKeyInTree(content.nodes, key);
  content.getAllTabs = () => [
    ...(model.homeTabs || []),
    ...(model.sshTabs || []),
    ...(model.rdpTabs || []),
    ...(model.guacamoleTabs || []),
    ...(model.fileExplorerTabs || [])
  ];
  content.masterKey = content.masterKey || model.masterKey || null;
  content.secureStorage = secureStorage;

  const settings = { ...(model.settingsProps || {}) };
  (model.settingsMethods || []).forEach((name) => {
    settings[name] = bindCaller(tabKey, `settings:${name}`);
  });
  settings.toast = toast;
  settings.secureStorage = secureStorage;
  settings.masterKey = settings.masterKey || content.masterKey;

  const flags = model.flags || {};
  const showExplorer = localExplorer || flags.fileExplorerTabId === tabKey;
  const showMonitor = localMonitor || flags.systemMonitorTabId === tabKey;

  return (
    <ErrorBoundary>
      <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--ui-content-bg, #0a0f1f)' }}>
        <Toast ref={toast} />
        <TabContentRenderer
          tab={model.tab}
          isActiveTab={model.isActive !== false}
          {...content}
          settingsTabProps={settings}
          isMinimalMode={!!flags.isMinimalMode}
          titleBarCollapsed={!!flags.titleBarCollapsed}
          tabBarCollapsed={!!flags.tabBarCollapsed}
          getAllTabs={content.getAllTabs}
          onStartRecording={bindCaller(tabKey, 'onStartRecording')}
          onStopRecording={bindCaller(tabKey, 'onStopRecording')}
          isRecordingTab={(key) => !!flags.isRecording && key === tabKey}
          onShowSystemMonitor={() => setLocalMonitor(true)}
          onShowFileExplorer={() => setLocalExplorer(true)}
          onToggleBroadcast={bindCaller(tabKey, 'onToggleBroadcast')}
        />
        {model.tab.type === 'home' && (
          <HomeEmbeddedSessions
            sshTabs={model.sshTabs}
            rdpTabs={model.rdpTabs}
            guacamoleTabs={model.guacamoleTabs}
            fileExplorerTabs={model.fileExplorerTabs}
            isHomeTabActive={model.isActive !== false}
            onCloseTab={bindCaller(tabKey, 'handleTabClose')}
            memoizedContentRendererProps={content}
            settingsTabProps={settings}
            isMinimalMode={!!flags.isMinimalMode}
            getAllTabs={content.getAllTabs}
            onStartRecording={bindCaller(tabKey, 'onStartRecording')}
            onStopRecording={bindCaller(tabKey, 'onStopRecording')}
            isRecordingTab={(key) => !!flags.isRecording && key === tabKey}
            onShowSystemMonitor={bindCaller(tabKey, 'onShowSystemMonitor')}
            onShowFileExplorer={bindCaller(tabKey, 'onShowFileExplorer')}
            onToggleBroadcast={bindCaller(tabKey, 'onToggleBroadcast')}
          />
        )}
        {showMonitor && (model.tab.type === 'terminal' || model.tab.type === 'local-terminal') && (
          <React.Suspense fallback={<TabChunkFallback />}>
            <LazySSHSystemMonitorPanel
              tabId={tabKey}
              tab={model.tab}
              onClose={() => setLocalMonitor(false)}
            />
          </React.Suspense>
        )}
        {showExplorer && model.tab.type === 'terminal' && (
          <React.Suspense fallback={<TabChunkFallback />}>
            <LazyFileExplorer
              tabId={tabKey}
              tab={model.tab}
              sshConfig={model.tab.sshConfig}
              onClose={() => setLocalExplorer(false)}
              isStandaloneTab={false}
              iconTheme={content.iconTheme}
              explorerFont={content.explorerFont}
              explorerColorTheme={content.explorerColorTheme}
              setExplorerColorTheme={content.setExplorerColorTheme}
              explorerFontSize={content.explorerFontSize}
            />
          </React.Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
}
