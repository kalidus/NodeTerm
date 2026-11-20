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
import { sshStatsStore } from '../services/SshStatsStore';
import { EVENT_NAMES } from '../utils/constants';
import { beginSessionHandoff } from '../utils/sessionHandoff';
import { stashTabScreenNow } from '../utils/terminalScreenHandoff';

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

  const fitTerminal = useCallback(() => {
    const ref = terminalRefs.current[tabKey];
    if (ref && typeof ref.fit === 'function') {
      try { ref.fit(); } catch (_) { /* noop */ }
    }
  }, [tabKey]);

  const focusTerminal = useCallback(() => {
    const ref = terminalRefs.current[tabKey];
    if (ref && typeof ref.focus === 'function') {
      try { ref.focus(); } catch (_) { /* noop */ }
    }
  }, [tabKey]);

  const scheduleFits = useCallback(() => {
    fitTerminal();
    const timers = [0, 32, 80, 160, 320].map((ms) => setTimeout(fitTerminal, ms));
    const focusTimers = [100, 250].map((ms) => setTimeout(focusTerminal, ms));
    return () => {
      timers.forEach(clearTimeout);
      focusTimers.forEach(clearTimeout);
    };
  }, [fitTerminal, focusTerminal]);

  useEffect(() => {
    if (!window.electron?.ipcRenderer?.on) return undefined;
    const offCmd = window.electron.ipcRenderer.on('tab-views:terminal-cmd', (payload) => {
      if (!payload || payload.tabKey !== tabKey) return;
      if (payload.cmd === 'fit') scheduleFits();
      if (payload.cmd === 'focus') focusTerminal();
    });
    const offClose = window.electron.ipcRenderer.on('tab-views:prepare-close', () => {
      stopTabSession(tabRef.current);
    });
    const offHandoff = window.electron.ipcRenderer.on('tab-views:begin-handoff', (payload) => {
      if (payload && payload.tabKey && payload.tabKey !== tabKey) return;
      beginSessionHandoff(15000);
    });
    const offStash = window.electron.ipcRenderer.on('tab-views:stash-now', (payload) => {
      if (payload && payload.tabKey && payload.tabKey !== tabKey) return;
      beginSessionHandoff(15000);
      stashTabScreenNow(tabKey);
    });
    return () => {
      if (typeof offCmd === 'function') offCmd();
      if (typeof offClose === 'function') offClose();
      if (typeof offHandoff === 'function') offHandoff();
      if (typeof offStash === 'function') offStash();
    };
  }, [tabKey, scheduleFits, focusTerminal]);

  // Tras reparent/setBounds el guest a veces no hace fit hasta un resize manual.
  useEffect(() => {
    if (!model?.tab) return undefined;
    const cancel = scheduleFits();
    const onResize = () => scheduleFits();
    window.addEventListener('resize', onResize);
    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => fitTerminal());
      observer.observe(document.documentElement);
    }
    return () => {
      cancel();
      window.removeEventListener('resize', onResize);
      if (observer) observer.disconnect();
    };
  }, [model?.tab, scheduleFits, fitTerminal]);

  useEffect(() => {
    if (!window.electron?.ipcRenderer) return undefined;
    const tab = model && model.tab;
    const isSsh = tab && (tab.type === 'terminal' || tab.sshConfig);
    if (!isSsh) return undefined;

    const eventName = `${EVENT_NAMES.SSH_STATS_UPDATE}:${tabKey}`;
    const onStats = (stats) => {
      if (stats) sshStatsStore.setStats(tabKey, stats);
    };
    const offStats = window.electron.ipcRenderer.on(eventName, onStats);
    const claimStats = () => {
      try {
        window.electron.ipcRenderer.send('ssh:set-active-stats-tab', tabKey);
        window.electron.ipcRenderer.send('ssh:set-statusbar-visible', tabKey, true);
      } catch (_) { /* noop */ }
    };
    claimStats();
    // Por si el cleanup de main marca hidden justo después del detach.
    const retry = setTimeout(claimStats, 120);

    return () => {
      clearTimeout(retry);
      if (typeof offStats === 'function') offStats();
      else {
        try { window.electron.ipcRenderer.removeAllListeners(eventName); } catch (_) { /* noop */ }
      }
      sshStatsStore.removeTab(tabKey);
    };
  }, [tabKey, model?.tab?.type, !!model?.tab?.sshConfig]);

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
