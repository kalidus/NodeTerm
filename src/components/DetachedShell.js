import React, { useCallback, useEffect, useRef, useState } from 'react';
import TabHeader from './TabHeader';
import { requestTabDetach } from '../utils/tabDragDetach';

export default function DetachedShell() {
  const [tabs, setTabs] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  const hostRef = useRef(null);

  const adopt = useCallback((payload) => {
    if (!payload || !payload.tabKey) return;
    setTabs((prev) => {
      if (prev.some((tab) => tab.key === payload.tabKey)) return prev;
      const tab = payload.tab || { key: payload.tabKey, label: 'Pestaña', type: 'terminal' };
      return [...prev, { ...tab, key: payload.tabKey }];
    });
    setActiveKey((current) => current || payload.tabKey);
  }, []);

  useEffect(() => {
    let offAdopted = () => {};
    let offRemoved = () => {};
    window.electron?.tabViews?.pullAdopted().then((list) => {
      (list || []).forEach(adopt);
    }).catch(() => {});
    if (window.electron?.ipcRenderer?.on) {
      offAdopted = window.electron.ipcRenderer.on('tab-views:adopted', adopt) || offAdopted;
      offRemoved = window.electron.ipcRenderer.on('tab-views:removed', (payload) => {
        if (!payload?.tabKey) return;
        setTabs((prev) => prev.filter((tab) => tab.key !== payload.tabKey));
      }) || offRemoved;
      const offReleased = window.electron.ipcRenderer.on('tab-views:released', (payload) => {
        if (!payload?.tabKey) return;
        setTabs((prev) => prev.filter((tab) => tab.key !== payload.tabKey));
      });
      return () => {
        if (typeof offAdopted === 'function') offAdopted();
        if (typeof offRemoved === 'function') offRemoved();
        if (typeof offReleased === 'function') offReleased();
      };
    }
    return undefined;
  }, [adopt]);

  useEffect(() => {
    if (tabs.length === 0) return;
    if (!tabs.some((tab) => tab.key === activeKey)) setActiveKey(tabs[0].key);
  }, [tabs, activeKey]);

  const publishLayout = useCallback(() => {
    const node = hostRef.current;
    const tabKey = activeKey;
    if (!node || !tabKey || !window.electron?.tabViews?.layout) return;
    const rect = node.getBoundingClientRect();
    window.electron.tabViews.layout({
      activeKey: tabKey,
      visible: true,
      bounds: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    }).catch(() => {});
  }, [activeKey]);

  useEffect(() => {
    publishLayout();
    const node = hostRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => publishLayout());
    observer.observe(node);
    window.addEventListener('resize', publishLayout);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', publishLayout);
    };
  }, [publishLayout]);

  const onDragEnd = (_event, tabKey) => {
    requestTabDetach(tabKey);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0f1f', color: '#d7dde8' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', height: 36, flexShrink: 0, background: '#121826' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', overflow: 'hidden', WebkitAppRegion: 'drag' }}>
          {tabs.map((tab, idx) => (
            <TabHeader
              key={tab.key}
              tab={tab}
              idx={idx}
              selected={tab.key === activeKey}
              isDraggable
              onTabClick={() => setActiveKey(tab.key)}
              onTabDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', tab.key);
              }}
              onTabDragOver={(event) => event.preventDefault()}
              onTabDragEnd={() => onDragEnd(null, tab.key)}
              onTabClose={() => {
                window.electron?.tabViews?.close(tab.key);
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', WebkitAppRegion: 'no-drag' }}>
          <button type="button" aria-label="Minimizar" onClick={() => window.electronAPI?.minimize?.()} style={chromeButton}>–</button>
          <button type="button" aria-label="Maximizar" onClick={() => window.electronAPI?.maximize?.()} style={chromeButton}>□</button>
          <button type="button" aria-label="Cerrar" onClick={() => window.electronAPI?.close?.()} style={chromeButton}>×</button>
        </div>
      </div>
      <div ref={hostRef} style={{ flex: 1, minHeight: 0, position: 'relative', WebkitAppRegion: 'no-drag' }} />
    </div>
  );
}

const chromeButton = {
  width: 42,
  height: '100%',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer'
};
