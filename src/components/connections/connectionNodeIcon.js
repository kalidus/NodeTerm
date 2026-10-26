import React from 'react';
import { iconThemes } from '../../themes/icon-themes';
import { FolderIconRenderer, FolderIconPresets } from '../FolderIconSelector';
import { SSHIconRenderer, SSHIconPresets } from '../SSHIconSelector';
import { isConnectionFolder, nodeType } from './connectionsBrowse';

const iconCache = new Map();

function cached(key, creator) {
  if (iconCache.has(key)) return iconCache.get(key);
  const value = creator();
  iconCache.set(key, value);
  return value;
}

const SCALES = {
  material: 1.12,
  nord: 1.05,
  cyberpunk: 1.04,
  dracula: 1.08,
  solarized: 1.08,
  monokai: 1.08,
  onedark: 1.08,
  gruvbox: 1.06,
  atom: 1.05,
  vscode: 1.05,
  linea: 1.06,
  fluent: 1.0
};

function normalizeIcon(rawIcon, size, themeKey) {
  if (!rawIcon || !React.isValidElement(rawIcon)) return null;
  const finalSize = Math.round(size * (SCALES[themeKey] || 1));
  return React.cloneElement(rawIcon, {
    width: finalSize,
    height: finalSize,
    style: {
      ...rawIcon.props.style,
      width: `${finalSize}px`,
      height: `${finalSize}px`,
      flexShrink: 0,
      display: 'block'
    }
  });
}

function themeDefaultColor(themeName) {
  const theme = iconThemes[themeName];
  const folderIcon = theme?.icons?.folder;
  if (!folderIcon?.props) return '#5e81ac';
  if (folderIcon.props.fill && folderIcon.props.fill !== 'none') return folderIcon.props.fill;
  if (folderIcon.props.stroke) return folderIcon.props.stroke;
  return '#5e81ac';
}

export function renderConnectionNodeIcon(node, {
  iconTheme = 'nord',
  size = 20,
  expanded = false,
  favoritesView = false
} = {}) {
  if (!node) return null;
  const themeKey = (iconTheme || 'nord').toLowerCase();
  const themeIcons = iconThemes[themeKey]?.icons || iconThemes.nord?.icons || {};
  const type = nodeType(node);
  const folder = isConnectionFolder(node);

  if (type === 'ssh') {
    if (node.data?.customIcon && node.data.customIcon !== 'default' && SSHIconPresets[node.data.customIcon.toUpperCase()]) {
      const preset = SSHIconPresets[node.data.customIcon.toUpperCase()];
      return cached(`ssh-custom-${node.data.customIcon}-${size}`, () => (
        <SSHIconRenderer preset={preset} pixelSize={size} />
      ));
    }
    return cached(`ssh-default-${size}-${themeKey}`, () => normalizeIcon(themeIcons.ssh, size, themeKey))
      || <span className="pi pi-desktop" style={{ fontSize: `${size}px` }} />;
  }

  if (type === 'rdp' || type === 'rdp-guacamole') {
    return cached(`rdp-${size}-${themeKey}`, () => normalizeIcon(themeIcons.rdp, size, themeKey))
      || <span className="pi pi-desktop" style={{ fontSize: `${size}px` }} />;
  }

  if (type === 'vnc' || type === 'vnc-guacamole') {
    return cached(`vnc-${size}-${themeKey}`, () => normalizeIcon(themeIcons.vnc || themeIcons.rdp, size, themeKey))
      || <span className="pi pi-desktop" style={{ fontSize: `${size}px` }} />;
  }

  if (type === 'ssh-tunnel') {
    const tunnelStatus = node.data?.tunnelStatus || 'stopped';
    const statusColors = {
      active: '#a6e3a1',
      connecting: '#89b4fa',
      error: '#f38ba8',
      stopped: '#6c7086'
    };
    return (
      <span className="pi pi-share-alt" style={{ color: statusColors[tunnelStatus] || '#89b4fa', fontSize: `${size}px` }} />
    );
  }

  if (type === 'sftp' || type === 'ftp' || type === 'scp') {
    const protocol = node.data?.protocol || type;
    const themeIcon = themeIcons[protocol] || iconThemes.material?.icons?.[protocol];
    return cached(`file-${protocol}-${size}-${themeKey}`, () => normalizeIcon(themeIcon, size, themeKey))
      || <span className="pi pi-folder" style={{ color: '#89b4fa', fontSize: `${size}px` }} />;
  }

  if (type === 'password') {
    return <span className="pi pi-lock" style={{ color: '#E91E63', fontSize: `${size}px` }} />;
  }
  if (type === 'crypto_wallet') {
    return <span className="pi pi-wallet" style={{ color: '#F7931A', fontSize: `${size}px` }} />;
  }
  if (type === 'api_key') {
    return <span className="pi pi-key" style={{ color: '#00BCD4', fontSize: `${size}px` }} />;
  }
  if (type === 'secure_note') {
    return <span className="pi pi-file-edit" style={{ color: '#9C27B0', fontSize: `${size}px` }} />;
  }
  if (type === 'document' || type === 'quick-note') {
    return <span className="pi pi-file" style={{ color: '#64b5f6', fontSize: `${size}px` }} />;
  }

  if (folder) {
    if (favoritesView) {
      return cached(`fav-folder-${size}`, () => (
        <FolderIconRenderer preset={FolderIconPresets.FAVORITES} pixelSize={size} />
      ));
    }
    const custom = node.data?.customIcon || node.folderIcon;
    if (custom && custom !== 'default' && custom !== 'general' && FolderIconPresets[custom.toUpperCase()]) {
      const preset = FolderIconPresets[custom.toUpperCase()];
      return cached(`folder-custom-${custom}-${size}`, () => (
        <FolderIconRenderer preset={preset} pixelSize={size} />
      ));
    }
    const folderColor = node.color || themeDefaultColor(themeKey);
    const baseIcon = expanded ? themeIcons.folderOpen : themeIcons.folder;
    const normalized = normalizeIcon(baseIcon, size, themeKey);
    if (normalized) {
      return React.cloneElement(normalized, {
        style: { ...normalized.props.style, color: folderColor }
      });
    }
    return (
      <span
        className={expanded ? 'pi pi-folder-open' : 'pi pi-folder'}
        style={{ color: folderColor, fontSize: `${size}px` }}
      />
    );
  }

  return normalizeIcon(themeIcons.file, size, themeKey)
    || <span className="pi pi-file" style={{ fontSize: `${size}px` }} />;
}
