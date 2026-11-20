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

function DragTabChip({ tab, selected, onSelect, onDragEnd, compact }) {
  return (
    <button
      type="button"
      title="Arrastra a NodeTerm para reintegrar"
      draggable
      onClick={() => onSelect?.(tab.key)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', tab.key);
        try {
          event.dataTransfer.setData('application/x-nodeterm-tab-key', tab.key);
        } catch (_) { /* noop */ }
      }}
      onDragEnd={() => onDragEnd(tab.key)}
      style={{
        ...pillButton,
        WebkitAppRegion: 'no-drag',
        background: selected ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
        color: selected ? '#eef2f8' : '#9aa4b2',
        maxWidth: compact ? 220 : 140,
        height: compact ? 28 : 26,
        padding: compact ? '0 12px' : '0 8px',
        fontSize: compact ? 13 : 12,
        fontWeight: compact ? 500 : 400,
        letterSpacing: compact ? '0.02em' : undefined,
        cursor: 'grab'
      }}
    >
      <ShellTabIcon tab={tab} size={compact ? 15 : 12} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {tab.label || 'Pestaña'}
      </span>
    </button>
  );
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
      if (rect.width < 2 || rect.height < 2) return;
      window.electron.tabViews.layout({
        activeKey: tabKey,
        visible: true,
        bounds: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
      }).then(() => {
        try { window.electron?.tabViews?.terminalCmd?.(tabKey, 'fit'); } catch (_) { /* noop */ }
      }).catch(() => {});
    });
  }, [activeKey]);

  const publishLayoutRef = useRef(publishLayout);
  publishLayoutRef.current = publishLayout;

  const scheduleLayoutRetries = useCallback(() => {
    publishLayoutRef.current();
    const t0 = setTimeout(() => publishLayoutRef.current(), 0);
    const t1 = setTimeout(() => publishLayoutRef.current(), 50);
    const t2 = setTimeout(() => publishLayoutRef.current(), 150);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const cancel = scheduleLayoutRetries();
    const node = hostRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return cancel;
    const observer = new ResizeObserver(() => publishLayout());
    observer.observe(node);
    window.addEventListener('resize', publishLayout);
    return () => {
      cancel();
      observer.disconnect();
      window.removeEventListener('resize', publishLayout);
      if (layoutRafRef.current) {
        cancelAnimationFrame(layoutRafRef.current);
        layoutRafRef.current = 0;
      }
    };
  }, [publishLayout, scheduleLayoutRetries, tabs.length]);

  useEffect(() => {
    if (!activeKey) return undefined;
    return scheduleLayoutRetries();
  }, [activeKey, tabs.length, scheduleLayoutRetries]);

  const onDragEnd = (tabKey) => {
    requestTabDetach(tabKey);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0f1f', color: '#d7dde8' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: 40,
          flexShrink: 0,
          background: 'linear-gradient(180deg, #161d2e 0%, #121826 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        {/* Zona de mover ventana */}
        <div style={{ width: 12, flexShrink: 0, WebkitAppRegion: 'drag' }} />

        {/* Asa de pestaña siempre no-drag (HTML5 drag funciona en Windows) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            minWidth: 0,
            flexShrink: 1,
            overflow: 'hidden',
            WebkitAppRegion: 'no-drag'
          }}
        >
          {tabs.length > 1
            ? tabs.map((tab) => (
              <DragTabChip
                key={tab.key}
                tab={tab}
                selected={tab.key === activeKey}
                onSelect={setActiveKey}
                onDragEnd={onDragEnd}
              />
            ))
            : (activeTab && (
              <DragTabChip
                tab={activeTab}
                selected
                onDragEnd={onDragEnd}
                compact
              />
            ))}
        </div>

        {/* Relleno arrastrable para mover la ventana */}
        <div style={{ flex: 1, minWidth: 24, WebkitAppRegion: 'drag' }} />

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
