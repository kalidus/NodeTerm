import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import HomePanelWrapper from '../HomePanelWrapper';
import TabContentRenderer from '../TabContentRenderer';
import {
  getHomeSessionHost,
  getHomeSessionHostOptions,
  subscribeHomeSessionHost
} from '../../utils/homeSessionHostBus';

const BASE_Z = 80000;

function panelIdFor(tabKey) {
  return `home-session-${tabKey}`;
}

function boxKeyFrom(id, boxes) {
  if (id && boxes[id]) return id;
  const raw = String(id || '');
  if (raw.startsWith('home-session-') && boxes[raw.slice('home-session-'.length)]) {
    return raw.slice('home-session-'.length);
  }
  if (boxes[panelIdFor(raw)]) return panelIdFor(raw);
  return raw;
}

function sessionPath(tab) {
  const cfg = tab?.sshConfig || tab?.rdpConfig || tab?.vncConfig || tab?.tunnelConfig || {};
  const user = cfg.username || cfg.user || cfg.sshUser || '';
  const host = cfg.host || cfg.hostname || cfg.server || cfg.sshHost || '';
  if (user && host) return `${user}@${host}`;
  if (host) return String(host);
  return tab?.label || 'sesión';
}

function collectEmbedded(sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs) {
  const list = [];
  [sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs].forEach((tabs) => {
    (tabs || []).forEach((tab) => {
      if (tab?.embedInHome) list.push(tab);
    });
  });
  return list;
}

export default function HomeEmbeddedSessions({
  sshTabs,
  rdpTabs,
  guacamoleTabs,
  fileExplorerTabs,
  isHomeTabActive = false,
  onCloseTab,
  memoizedContentRendererProps,
  settingsTabProps,
  isMinimalMode,
  getAllTabs,
  onStartRecording,
  onStopRecording,
  isRecordingTab,
  onShowSystemMonitor,
  onShowFileExplorer,
  onToggleBroadcast
}) {
  const embeddedTabs = useMemo(
    () => collectEmbedded(sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs),
    [sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs]
  );
  const signature = embeddedTabs.map((tab) => tab.key).join('\n');
  const zRef = useRef(BASE_Z);
  const [boxes, setBoxes] = useState({});
  const [hostState, setHostState] = useState(() => ({
    element: getHomeSessionHost(),
    options: getHomeSessionHostOptions()
  }));

  useEffect(() => subscribeHomeSessionHost(setHostState), []);

  useEffect(() => {
    const keys = signature ? signature.split('\n') : [];
    setBoxes((prev) => {
      const next = {};
      let changed = false;
      let added = 0;
      keys.forEach((key) => {
        const id = panelIdFor(key);
        if (prev[id]) {
          next[id] = prev[id];
          return;
        }
        changed = true;
        zRef.current += 1;
        const slot = Object.keys(prev).length + added;
        added += 1;
        next[id] = {
          x: 64 + (slot % 8) * 28,
          y: 48 + (slot % 8) * 28,
          width: 780,
          height: 520,
          zIndex: zRef.current,
          isMaximized: false,
          isMinimized: false,
          visible: true
        };
      });
      if (!changed && Object.keys(prev).length === keys.length) return prev;
      return next;
    });
  }, [signature]);

  useEffect(() => {
    const onFocus = (event) => {
      const key = event?.detail?.key;
      if (!key) return;
      zRef.current += 1;
      const zIndex = zRef.current;
      setBoxes((prev) => {
        const id = boxKeyFrom(key, prev);
        if (!prev[id]) return prev;
        return {
          ...prev,
          [id]: { ...prev[id], zIndex, isMinimized: false }
        };
      });
    };
    window.addEventListener('focus-home-session-panel', onFocus);
    return () => window.removeEventListener('focus-home-session-panel', onFocus);
  }, []);

  const raise = useCallback((id) => {
    zRef.current += 1;
    const zIndex = zRef.current;
    setBoxes((prev) => {
      const key = boxKeyFrom(id, prev);
      if (!prev[key]) return prev;
      return {
        ...prev,
        [key]: { ...prev[key], zIndex, isMinimized: false }
      };
    });
  }, []);

  const moveBox = useCallback((id, next) => {
    if (!next) return;
    setBoxes((prev) => {
      const key = boxKeyFrom(id, prev);
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: {
          ...current,
          x: next.x,
          y: next.y,
          width: next.width,
          height: next.height
        }
      };
    });
  }, []);

  const host = hostState.element;
  if (!host || embeddedTabs.length === 0) return null;

  const options = hostState.options || {};
  const orderedTabs = [...embeddedTabs].sort(
    (a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0)
  );

  return createPortal(
    orderedTabs.map((tab) => {
      const id = panelIdFor(tab.key);
      const box = boxes[id];
      if (!box) return null;
      const sessionActive = !!isHomeTabActive && !box.isMinimized;
      return (
        <HomePanelWrapper
          key={id}
          id={id}
          title={tab.label || 'sesión'}
          path={`session · ${sessionPath(tab)}`}
          panelState={box}
          terminalFrameStyle={options.terminalFrameStyle || 'macos'}
          snapToGrid={options.snapToGrid !== false}
          smartSnap={options.smartSnap !== false}
          frameBackground={options.frameBackground || null}
          minWidth={480}
          minHeight={320}
          className="home-session-frame"
          onClose={() => onCloseTab?.(tab)}
          onBringToFront={raise}
          onToggleMaximize={() => setBoxes((prev) => (
            prev[id]
              ? {
                ...prev,
                [id]: {
                  ...prev[id],
                  isMaximized: !prev[id].isMaximized,
                  isMinimized: false
                }
              }
              : prev
          ))}
          onToggleMinimize={() => setBoxes((prev) => (
            prev[id]
              ? {
                ...prev,
                [id]: {
                  ...prev[id],
                  isMinimized: !prev[id].isMinimized
                }
              }
              : prev
          ))}
          onDragEnd={moveBox}
          onResizeEnd={moveBox}
        >
          <div className="home-session-fill">
            <TabContentRenderer
              tab={tab}
              isActiveTab={sessionActive}
              {...(memoizedContentRendererProps || {})}
              settingsTabProps={settingsTabProps}
              isMinimalMode={isMinimalMode}
              getAllTabs={getAllTabs}
              onStartRecording={onStartRecording}
              onStopRecording={onStopRecording}
              isRecordingTab={isRecordingTab}
              onShowSystemMonitor={onShowSystemMonitor}
              onShowFileExplorer={onShowFileExplorer}
              onToggleBroadcast={onToggleBroadcast}
            />
          </div>
        </HomePanelWrapper>
      );
    }),
    host
  );
}
