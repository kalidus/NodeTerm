import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { OverlayPanel } from 'primereact/overlaypanel';
import { getVersionInfo } from '../version-info';
import { statusBarIconThemes } from '../themes/statusbar-icon-themes';
import { statusBarThemes } from '../themes/status-bar-themes';
import { CpuPanel, MemPanel, NetPanel, DiskPanel, DiskSummaryPanel, GpuPanel, HostPanel, HostNetworkPanel, useMetricPopover } from './StatusBarMetricPopover';
import {
  getVisibleStatusBarOrder,
  loadStatusBarLayout,
  normalizeStatusBarLayout,
  STATUSBAR_LAYOUT_STORAGE_KEY
} from '../config/statusBarItems';
import {
  createStatusBarItemRenderers,
  renderStatusBarLoadingItems
} from './statusbar/statusBarItemRenderers';

const StatusBar = ({
  stats,
  active,
  statusBarIconTheme = 'classic',
  layout: layoutProp,
  isLoading = false,
  gpuStats = null,
  terminalType = 'ssh'
}) => {
  const op = useRef(null);
  const { open: popOpen, openPopover, closePopover, cancelClose } = useMetricPopover();
  const { appVersion } = getVersionInfo();
  const currentIconTheme = statusBarIconThemes[statusBarIconTheme] || statusBarIconThemes.classic;

  const [layoutState, setLayoutState] = useState(() => normalizeStatusBarLayout(layoutProp || loadStatusBarLayout()));

  useEffect(() => {
    if (layoutProp) {
      setLayoutState(normalizeStatusBarLayout(layoutProp));
    }
  }, [layoutProp]);

  useEffect(() => {
    if (layoutProp) return undefined;
    const syncLayout = () => setLayoutState(loadStatusBarLayout());
    const onLayoutChanged = (e) => {
      if (e.detail) {
        setLayoutState(normalizeStatusBarLayout(e.detail));
      } else {
        syncLayout();
      }
    };
    const onStorage = (e) => {
      if (!e.key || e.key === STATUSBAR_LAYOUT_STORAGE_KEY) {
        syncLayout();
      }
    };
    window.addEventListener('statusbar-layout-changed', onLayoutChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('statusbar-layout-changed', onLayoutChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [layoutProp]);

  const layout = normalizeStatusBarLayout(layoutProp || layoutState);
  const visibleOrder = useMemo(() => getVisibleStatusBarOrder(layout), [layout]);

  const GPUIcon = useMemo(() => (
    <svg
      viewBox="0 0 100 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: 'block',
        width: '1em',
        height: '1em',
        minWidth: '22px',
        minHeight: '22px'
      }}
    >
      <rect x="2" y="20" width="4" height="35" fill="#2C5F5F" rx="0.5" />
      <rect x="7" y="25" width="6" height="8" fill="#FF9800" rx="0.5" />
      <rect x="7" y="35" width="6" height="8" fill="#FFB74D" rx="0.5" />
      <rect x="15" y="22" width="14" height="32" fill="#66BB6A" rx="1" />
      <line x1="16" y1="28" x2="27" y2="28" stroke="#4CAF50" strokeWidth="1.5" />
      <line x1="16" y1="32" x2="27" y2="32" stroke="#4CAF50" strokeWidth="1.5" />
      <line x1="16" y1="36" x2="27" y2="36" stroke="#4CAF50" strokeWidth="1.5" />
      <path d="M30 15 L88 15 L88 52 L30 52 Z" fill="#546E7A" rx="1" />
      <rect x="30" y="15" width="58" height="37" fill="#455A64" rx="1" />
      <circle cx="42" cy="36" r="7" fill="#81D4FA" />
      <path d="M42 29 L42 43 M35 36 L49 36 M38 33 L46 39 M46 33 L38 39"
        stroke="#546E7A" strokeWidth="2" strokeLinecap="round" fill="#455A64" />
      <circle cx="62" cy="36" r="7" fill="#81D4FA" />
      <path d="M62 29 L62 43 M55 36 L69 36 M58 33 L66 39 M66 33 L58 39"
        stroke="#546E7A" strokeWidth="2" strokeLinecap="round" fill="#455A64" />
      <rect x="73" y="18" width="3" height="3" fill="#81D4FA" rx="0.3" />
      <rect x="77" y="18" width="3" height="3" fill="#81D4FA" rx="0.3" />
      <rect x="82" y="18" width="3" height="3" fill="#81D4FA" rx="0.3" />
      <line x1="30" y1="50" x2="88" y2="50" stroke="#81D4FA" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ), []);

  const getGPUColor = useCallback((type) => {
    if (!type) return currentIconTheme.colors.memory;
    if (type.toLowerCase().includes('nvidia')) return '#76b900';
    if (type.toLowerCase().includes('amd')) return '#ED1C24';
    if (type.toLowerCase().includes('apple')) return '#A8A8A8';
    if (type.toLowerCase().includes('intel')) return '#0071C5';
    return '#9c27b0';
  }, [currentIconTheme.colors.memory]);

  const makeHoverProps = useCallback((type, diskIndex = 0) => ({
    onMouseEnter: (e) => openPopover(type, e.currentTarget.getBoundingClientRect(), diskIndex),
    onMouseLeave: closePopover,
  }), [openPopover, closePopover]);

  if (!stats || isLoading) {
    return (
      <div className="status-bar">
        <div className="status-group">
          {renderStatusBarLoadingItems(layout, currentIconTheme)}
        </div>
      </div>
    );
  }

  const { disk, sessionHistory, versionId = '' } = stats;
  const allDisks = Array.isArray(disk) ? disk : [];
  const localDisks = allDisks.filter((d) => !Boolean(d && d.isNetwork));
  const networkDisks = allDisks.filter((d) => Boolean(d && d.isNetwork));
  const localDiskAvgUse = localDisks.length > 0
    ? Math.round(localDisks.reduce((acc, d) => acc + Number((d && (d.use || d.percentage)) || 0), 0) / localDisks.length)
    : 0;
  const networkDiskAvgUse = networkDisks.length > 0
    ? Math.round(networkDisks.reduce((acc, d) => acc + Number((d && (d.use || d.percentage)) || 0), 0) / networkDisks.length)
    : 0;

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond) => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return `${(bytesPerSecond / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const renderers = createStatusBarItemRenderers({
    stats,
    currentIconTheme,
    makeHoverProps,
    formatBytes,
    formatSpeed,
    gpuStats,
    GPUIcon,
    getGPUColor,
    localDisks,
    networkDisks,
    localDiskAvgUse,
    networkDiskAvgUse,
    appVersion,
    versionId,
    op
  });

  return (
    <div className="status-bar">
      <div className="status-group status-bar-metrics">
        {visibleOrder.map((id) => renderers[id]?.()).filter(Boolean)}
      </div>
      <div className="status-group status-bar-actions">
        {renderers.settings?.()}
      </div>

      {popOpen?.type === 'cpu' && (
        <CpuPanel stats={stats} sessionHistory={sessionHistory} anchorRect={popOpen.rect} onClose={closePopover} onStay={cancelClose} />
      )}
      {popOpen?.type === 'mem' && (
        <MemPanel stats={stats} sessionHistory={sessionHistory} anchorRect={popOpen.rect} onClose={closePopover} onStay={cancelClose} />
      )}
      {popOpen?.type === 'net' && (
        <NetPanel stats={stats} sessionHistory={sessionHistory} anchorRect={popOpen.rect} onClose={closePopover} onStay={cancelClose} />
      )}
      {popOpen?.type === 'gpu' && gpuStats && (
        <GpuPanel gpuStats={gpuStats} sessionHistory={sessionHistory} anchorRect={popOpen.rect} onClose={closePopover} onStay={cancelClose} />
      )}
      {popOpen?.type === 'host' && (
        <HostPanel stats={stats} anchorRect={popOpen.rect} onClose={closePopover} onStay={cancelClose} />
      )}
      {popOpen?.type === 'host-net' && (
        <HostNetworkPanel stats={stats} sessionHistory={sessionHistory} anchorRect={popOpen.rect} onClose={closePopover} onStay={cancelClose} />
      )}
      {popOpen?.type === 'disk' && Array.isArray(disk) && disk[popOpen.diskIndex] && (
        <DiskPanel disk={disk[popOpen.diskIndex]} anchorRect={popOpen.rect} onClose={closePopover} onStay={cancelClose} />
      )}
      {popOpen?.type === 'disk-local-summary' && localDisks.length > 0 && (
        <DiskSummaryPanel
          disks={localDisks}
          title="DISCOS LOCALES"
          anchorRect={popOpen.rect}
          onClose={closePopover}
          onStay={cancelClose}
        />
      )}
      {popOpen?.type === 'disk-network-summary' && networkDisks.length > 0 && (
        <DiskSummaryPanel
          disks={networkDisks}
          title="UNIDADES DE RED"
          anchorRect={popOpen.rect}
          onClose={closePopover}
          onStay={cancelClose}
        />
      )}

      <OverlayPanel ref={op} className="statusbar-theme-overlay app-surface" style={{ width: '280px' }}>
        <div className="statusbar-quick-presets">
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--statusbar-border, var(--ui-statusbar-border))', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9em', color: 'var(--statusbar-text, var(--ui-statusbar-text))' }}>
            Temas de la barra de estado
          </div>
          <div className="theme-list-container" style={{ maxHeight: '300px', overflowY: 'auto', padding: '0 4px' }}>
            {Object.keys(statusBarThemes).map((themeName) => {
              const theme = statusBarThemes[themeName];
              return (
                <div
                  key={themeName}
                  className="theme-item"
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderRadius: 'var(--ui-radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '2px',
                    transition: 'background 0.2s',
                    fontSize: '0.9em',
                    color: theme.colors.text,
                    background: theme.colors.background,
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.colors.iconColor; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
                  onClick={() => {
                    const themeStorageKeys = {
                      ssh: 'basicapp_statusbar_theme',
                      powershell: 'localPowerShellStatusBarTheme',
                      linux: 'localLinuxStatusBarTheme',
                      docker: 'localDockerStatusBarTheme',
                      cygwin: 'localCygwinStatusBarTheme'
                    };
                    const storageKey = themeStorageKeys[terminalType] || 'basicapp_statusbar_theme';
                    localStorage.setItem(storageKey, themeName);
                    if (terminalType === 'ssh') {
                      localStorage.setItem('basicapp_statusbar_theme', themeName);
                    }
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new CustomEvent('statusbar-theme-changed', {
                      detail: { theme: themeName, terminalType }
                    }));
                    op.current.hide();
                  }}
                >
                  <span>{themeName}</span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.colors.cpuBarColor }} />
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.colors.memoryBarColor }} />
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.colors.diskBarColor }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              marginTop: '10px',
              padding: '10px 12px',
              borderTop: '1px solid var(--statusbar-border, var(--ui-statusbar-border))',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--statusbar-text, var(--ui-statusbar-text))',
              fontSize: '0.85em',
              opacity: 0.8
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.8; }}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-settings-dialog', {
                detail: { tab: 'appearance', subTab: 'status-bar' }
              }));
              op.current.hide();
            }}
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: '0.9em' }} />
            Configuración completa...
          </div>
        </div>
      </OverlayPanel>
    </div>
  );
};

export default StatusBar;
