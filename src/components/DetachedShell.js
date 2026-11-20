import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaLinux, FaTerminal, FaUbuntu, FaWindows } from 'react-icons/fa';
import { requestTabDetach } from '../utils/tabDragDetach';

function ShellTabIcon({ tab, size = 14 }) {
  const terminalType = String(tab?.terminalType || '').toLowerCase();
  const label = String(tab?.label || '').toLowerCase();
  const category = String(tab?.distroInfo?.category || '').toLowerCase();
  const style = { fontSize: size, flexShrink: 0, opacity: 0.95 };

  if (terminalType === 'powershell') {
    return <FaWindows style={{ ...style, color: '#0078D4' }} />;
  }
  if (category === 'ubuntu' || terminalType === 'ubuntu' || label.includes('ubuntu')) {
    return <FaUbuntu style={{ ...style, color: '#E95420' }} />;
  }
  if (terminalType === 'wsl' || category || label.includes('linux')) {
    return <FaLinux style={{ ...style, color: '#9aa4b2' }} />;
  }
  return <FaTerminal style={{ ...style, color: '#9aa4b2' }} />;
}

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

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.key === activeKey) || tabs[0] || null,
    [tabs, activeKey]
  );

  const layoutRafRef = useRef(0);
  const publishLayout = useCallback(() => {
    if (layoutRafRef.current) return;
    layoutRafRef.current = requestAnimationFrame(() => {
      layoutRafRef.current = 0;
      const node = hostRef.current;
      const tabKey = activeKey;
      if (!node || !tabKey || !window.electron?.tabViews?.layout) return;
      const rect = node.getBoundingClientRect();
      window.electron.tabViews.layout({
        activeKey: tabKey,
        visible: true,
        bounds: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
      }).catch(() => {});
    });
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
      if (layoutRafRef.current) {
        cancelAnimationFrame(layoutRafRef.current);
        layoutRafRef.current = 0;
      }
    };
  }, [publishLayout]);

  const onDragEnd = (tabKey) => {
    requestTabDetach(tabKey);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0f1f', color: '#d7dde8' }}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'stretch',
          height: 40,
          flexShrink: 0,
          background: 'linear-gradient(180deg, #161d2e 0%, #121826 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          WebkitAppRegion: 'drag'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            paddingLeft: 10,
            minWidth: 0,
            flex: 1,
            overflow: 'hidden'
          }}
        >
          {tabs.length > 1 && tabs.map((tab) => {
            const selected = tab.key === activeKey;
            return (
              <button
                key={tab.key}
                type="button"
                title={tab.label}
                draggable
                onClick={() => setActiveKey(tab.key)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', tab.key);
                }}
                onDragEnd={() => onDragEnd(tab.key)}
                style={{
                  ...pillButton,
                  WebkitAppRegion: 'no-drag',
                  background: selected ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: selected ? '#eef2f8' : '#9aa4b2'
                }}
              >
                <ShellTabIcon tab={tab} size={12} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 96 }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              maxWidth: '46%',
              pointerEvents: 'none',
              color: '#eef2f8'
            }}
          >
            <ShellTabIcon tab={activeTab} size={15} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {activeTab.label || 'Pestaña'}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexShrink: 0, WebkitAppRegion: 'no-drag' }}>
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
  cursor: 'pointer',
  fontSize: 14
};

const pillButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  maxWidth: 140,
  height: 26,
  padding: '0 8px',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  lineHeight: 1
};
