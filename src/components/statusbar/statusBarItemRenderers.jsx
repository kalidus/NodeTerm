import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog } from '@fortawesome/free-solid-svg-icons';
import { FaLinux, FaUbuntu, FaRedhat, FaCentos, FaFedora, FaWindows } from 'react-icons/fa';
import { SiDebian } from 'react-icons/si';
import { getVisibleStatusBarOrder } from '../../config/statusBarItems';

export const CpuSparkline = ({ history }) => (
  <div className="sparkline-container">
    <div className="sparkline-bars">
      {history.map((value, index) => (
        <div
          key={index}
          className="sparkline-bar"
          style={{ height: `${Math.max(value, 1)}%` }}
        />
      ))}
    </div>
  </div>
);

export const DistroIcon = ({ distro }) => {
  const id = String(distro || '').toLowerCase();
  switch (id) {
    case 'windows':
    case 'win':
    case 'win32':
      return <FaWindows />;
    case 'ubuntu':
    case 'ubuntu-core':
    case 'ubuntu_server':
      return <FaUbuntu />;
    case 'debian':
      return <SiDebian />;
    case 'rhel':
    case 'redhat':
    case 'red hat enterprise linux':
      return <FaRedhat />;
    case 'centos':
      return <FaCentos />;
    case 'fedora':
      return <FaFedora />;
    case 'rocky':
    case 'rockylinux':
    case 'alma':
    case 'almalinux':
    case 'oracle':
    case 'ol':
    case 'opensuse':
    case 'opensuse-leap':
    case 'opensuse-tumbleweed':
    case 'suse':
    case 'sles':
    case 'arch':
    case 'archlinux':
    case 'manjaro':
    case 'alpine':
    case 'alpinelinux':
    case 'kali':
    case 'kalilinux':
    case 'gentoo':
    case 'linuxmint':
    case 'amazon':
    case 'amzn':
    case 'pop':
    case 'pop_os':
    case 'pop-os':
    case 'elementary':
    case 'elementaryos':
    case 'zorin':
      return <FaLinux />;
    default:
      return <FaLinux />;
  }
};

const LOADING_PLACEHOLDERS = {
  cpu: (currentIconTheme) => (
    <div className="status-bar-section loading-section" key="loading-cpu">
      <span className="status-bar-icon cpu loading" style={{ color: currentIconTheme.colors.cpu }}>
        {currentIconTheme.icons.cpu}
      </span>
      <span className="loading-text">--%</span>
      <div className="sparkline-container loading">
        <div className="sparkline-bars">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="sparkline-bar loading" />
          ))}
        </div>
      </div>
    </div>
  ),
  memory: (currentIconTheme) => (
    <div className="status-bar-section loading-section" key="loading-memory">
      <span className="status-bar-icon mem loading" style={{ color: currentIconTheme.colors.memory }}>
        {currentIconTheme.icons.memory}
      </span>
      <span className="loading-text">-- / --</span>
    </div>
  ),
  network: (currentIconTheme) => (
    <div className="status-bar-section loading-section" key="loading-network">
      <span className="status-bar-icon net-down loading" style={{ color: currentIconTheme.colors.networkDown }}>
        {currentIconTheme.icons.networkDown}
      </span>
      <span className="loading-text">-- B/s</span>
      <span
        className="status-bar-icon net-up loading"
        style={{ color: currentIconTheme.colors.networkUp, marginLeft: '5px' }}
      >
        {currentIconTheme.icons.networkUp}
      </span>
      <span className="loading-text">-- B/s</span>
    </div>
  )
};

export function renderStatusBarLoadingItems(layout, currentIconTheme) {
  return getVisibleStatusBarOrder(layout)
    .map((id) => LOADING_PLACEHOLDERS[id]?.(currentIconTheme))
    .filter(Boolean);
}

export function createStatusBarItemRenderers(ctx) {
  const {
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
  } = ctx;

  const {
    cpu,
    mem,
    cpuHistory,
    uptime,
    network,
    hostname,
    distro,
    ip
  } = stats;

  return {
    host: () => {
      if (!(hostname || distro || ip)) return null;
      return (
        <div
          key="host"
          className="status-bar-section hostname-section sbpop-trigger"
          title={`Host: ${hostname || ip || 'Unknown'} | IP: ${ip || 'N/A'} | Platform: ${distro || 'linux'}`}
          {...makeHoverProps('host')}
        >
          <DistroIcon distro={distro} />
          <span>{(hostname && hostname !== 'unknown' && hostname !== 'localhost') ? hostname : (ip || hostname || 'Unknown')}</span>
        </div>
      );
    },
    cpu: () => {
      if (cpu === undefined) return null;
      return (
        <div key="cpu" className="status-bar-section cpu-section sbpop-trigger" {...makeHoverProps('cpu')}>
          <span className="status-bar-icon cpu" style={{ color: currentIconTheme.colors.cpu }}>
            {currentIconTheme.icons.cpu}
          </span>
          <span>{cpu}%</span>
          <CpuSparkline history={cpuHistory || []} />
        </div>
      );
    },
    memory: () => {
      if (!mem || mem.total <= 0) return null;
      return (
        <div key="memory" className="status-bar-section sbpop-trigger" {...makeHoverProps('mem')}>
          <span className="status-bar-icon mem" style={{ color: currentIconTheme.colors.memory }}>
            {currentIconTheme.icons.memory}
          </span>
          <span>{formatBytes(mem.used)} / {formatBytes(mem.total)}</span>
        </div>
      );
    },
    gpu: () => {
      if (!gpuStats || !gpuStats.ok || !gpuStats.type) return null;
      return (
        <div
          key="gpu"
          className="status-bar-section gpu-section sbpop-trigger"
          title={gpuStats.name || `${gpuStats.type.toUpperCase()} GPU`}
          {...makeHoverProps('gpu')}
        >
          <span
            className="status-bar-icon gpu"
            style={{
              color: getGPUColor(gpuStats.type),
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 'calc(var(--statusbar-height, 40px) * 0.75)',
              lineHeight: '1'
            }}
          >
            {GPUIcon}
          </span>
          {gpuStats.totalMB && gpuStats.usedMB !== null ? (
            <span>{Math.round(gpuStats.usedMB / 1024 * 10) / 10}GB / {Math.round(gpuStats.totalMB / 1024 * 10) / 10}GB</span>
          ) : gpuStats.totalMB ? (
            <span>{Math.round(gpuStats.totalMB / 1024 * 10) / 10}GB {gpuStats.type && gpuStats.type.toUpperCase()}</span>
          ) : (
            <span>{gpuStats.type && gpuStats.type.toUpperCase()}</span>
          )}
          {gpuStats.temperature !== null && (
            <span style={{ marginLeft: '4px' }}>{gpuStats.temperature}°C</span>
          )}
        </div>
      );
    },
    network: () => {
      if (!network) return null;
      return (
        <div key="network" className="status-bar-section network-section sbpop-trigger" {...makeHoverProps('net')}>
          <span className="status-bar-icon net-down" style={{ color: currentIconTheme.colors.networkDown }}>
            {currentIconTheme.icons.networkDown}
          </span>
          <span>{formatSpeed(network.rx_speed)}</span>
          <span
            className="status-bar-icon net-up"
            style={{ color: currentIconTheme.colors.networkUp, marginLeft: '5px' }}
          >
            {currentIconTheme.icons.networkUp}
          </span>
          <span>{formatSpeed(network.tx_speed)}</span>
        </div>
      );
    },
    diskLocal: () => {
      if (localDisks.length === 0) return null;
      return (
        <div
          key="diskLocal"
          className="status-bar-section disk-section disk-local-section"
        >
          <div className="disk-info-item sbpop-trigger" {...makeHoverProps('disk-local-summary')}>
            <span className="status-bar-icon disk" style={{ color: currentIconTheme.colors.disk }}>
              {currentIconTheme.icons.disk}
            </span>
            <span className="disk-info-text">Local {localDiskAvgUse}%</span>
          </div>
        </div>
      );
    },
    diskNetwork: () => {
      if (networkDisks.length === 0) return null;
      return (
        <div
          key="diskNetwork"
          className="status-bar-section disk-section disk-network-section"
        >
          <div className="disk-info-item sbpop-trigger" {...makeHoverProps('disk-network-summary')}>
            <span className="status-bar-icon disk" style={{ color: currentIconTheme.colors.networkDown }}>
              {currentIconTheme.icons.disk}
            </span>
            <span className="disk-info-text">Red {networkDiskAvgUse}%</span>
          </div>
        </div>
      );
    },
    uptime: () => {
      if (!uptime) return null;
      return (
        <div key="uptime" className="status-bar-section">
          <span className="status-bar-icon" style={{ color: currentIconTheme.colors.uptime }}>
            {currentIconTheme.icons.uptime}
          </span>
          <span>{uptime}</span>
        </div>
      );
    },
    ip: () => {
      if (!ip || !hostname || ip === hostname || hostname === 'unknown' || hostname === 'localhost') {
        return null;
      }
      return (
        <div key="ip" className="status-bar-section ip-section sbpop-trigger" {...makeHoverProps('host-net')}>
          <span className="status-bar-icon" style={{ color: currentIconTheme.colors.server }}>
            {currentIconTheme.icons.server}
          </span>
          <span>{ip}</span>
        </div>
      );
    },
    version: () => {
      if (!appVersion || appVersion === '0.0.0') return null;
      return (
        <div
          key="version"
          className="status-bar-section version-info-section"
          style={{ opacity: 0.5, fontSize: '0.85em', display: 'flex', alignItems: 'center' }}
        >
          <span title={versionId && versionId !== '0.0.0' ? `OS Version: ${versionId}` : undefined}>
            v{appVersion}
          </span>
        </div>
      );
    },
    settings: () => (
      <div
        key="settings"
        className="status-bar-section settings-section"
        style={{
          marginLeft: '15px',
          cursor: 'pointer',
          opacity: 0.5,
          transition: 'opacity 0.2s',
          display: 'flex',
          alignItems: 'center'
        }}
        title="Configuración rápida de temas"
        onClick={(e) => op.current.toggle(e)}
      >
        <FontAwesomeIcon icon={faCog} className="status-bar-settings-icon" />
      </div>
    )
  };
}
