import React from 'react';
import { iconThemes } from '../../themes/icon-themes';
import { FolderIconRenderer, FolderIconPresets } from '../FolderIconSelector';

const STANDARD_ICON_IDS = [
  'pi-key',
  'pi-globe',
  'pi-exclamation-triangle',
  'pi-user',
  'pi-save',
  'pi-calendar',
  'pi-cog',
  'pi-envelope',
  'pi-database',
  'pi-lock',
  'pi-unlock',
  'pi-link',
  'pi-book',
  'pi-shield',
  'pi-wifi',
  'pi-desktop',
  'pi-mobile',
  'pi-chart-line',
  'pi-sitemap',
  'pi-cloud',
  'pi-server',
  'pi-bolt',
  'pi-star',
  'pi-wrench',
  'pi-credit-card',
  'pi-map',
  'pi-question-circle',
  'pi-info-circle',
  'pi-times-circle',
  'pi-check-circle',
  'pi-download',
  'pi-upload',
  'pi-bell',
  'pi-image',
  'pi-briefcase',
  'pi-clipboard',
  'pi-list',
  'pi-prime',
  'pi-building',
  'pi-folder'
];

const STANDARD_ICON_COLORS = [
  '#ffc107', '#00bcd4', '#ff7043', '#8bc34a', '#90caf9', '#ffb74d', '#9fa8da', '#f48fb1', '#ce93d8', '#ff5252',
  '#4db6ac', '#64b5f6', '#bdbdbd', '#81c784', '#ffca28', '#42a5f5', '#26a69a', '#9575cd', '#4dd0e1', '#90a4ae',
  '#ff8a65', '#ffd54f', '#fbc02d', '#78909c', '#8d6e63', '#a5d6a7', '#4fc3f7', '#f06292', '#ef9a9a', '#66bb6a',
  '#29b6f6', '#ab47bc', '#7e57c2', '#5c6bc0', '#26c6da', '#9ccc65', '#ffa726', '#607d8b', '#ffd54f'
];

const FOLDER_TINTS = ['#5e81ac', '#88c0d0', '#a3be8c', '#ebcb8b', '#d08770', '#b48ead', '#bf616a', '#8fbcbb'];

export function getThemeDefaultColor(themeName) {
  const theme = iconThemes[themeName];
  if (!theme || !theme.icons || !theme.icons.folder) return '#5e81ac';

  const folderIcon = theme.icons.folder;

  if (folderIcon.props && folderIcon.props.fill && folderIcon.props.fill !== 'none') {
    return folderIcon.props.fill;
  }

  if (folderIcon.props && folderIcon.props.stroke) {
    return folderIcon.props.stroke;
  }

  if (folderIcon.props && folderIcon.props.children) {
    const children = Array.isArray(folderIcon.props.children)
      ? folderIcon.props.children
      : [folderIcon.props.children];

    for (const child of children) {
      if (child && child.props && child.props.fill && child.props.fill !== 'none') {
        return child.props.fill;
      }
      if (child && child.props && child.props.stroke) {
        return child.props.stroke;
      }
    }
  }

  return '#5e81ac';
}

function renderStandardIcon(id, sizePx) {
  const index = Number(id) || 0;
  const cls = STANDARD_ICON_IDS[index % STANDARD_ICON_IDS.length];
  const color = STANDARD_ICON_COLORS[index % STANDARD_ICON_COLORS.length];
  return <span className={`pi ${cls}`} style={{ color, fontSize: `${sizePx}px` }} />;
}

function cloneThemeIcon(themeIcon, sizePx, color) {
  if (!React.isValidElement(themeIcon)) return null;
  return React.cloneElement(themeIcon, {
    width: sizePx,
    height: sizePx,
    style: {
      ...themeIcon.props.style,
      color,
      width: `${sizePx}px`,
      height: `${sizePx}px`,
      flexShrink: 0
    }
  });
}

function isSecretNode(node) {
  const secretType = node?.data?.type;
  return Boolean(node?.data && ['password', 'crypto_wallet', 'api_key', 'secure_note'].includes(secretType));
}

/**
 * Icono de carpeta o secreto, el mismo que pinta el árbol de vaults.
 */
export function renderPasswordNodeIcon(node, { iconTheme = 'nord', size = 20, expanded = false } = {}) {
  if (!node) return null;
  const themeIcons = iconThemes[iconTheme]?.icons || iconThemes.nord?.icons || {};
  const themeColor = getThemeDefaultColor(iconTheme);
  const isFolder = Boolean(node.droppable);

  if (isSecretNode(node)) {
    const secretType = node.data?.type || 'password';
    if (node.data?.iconImage) {
      return (
        <img
          src={node.data.iconImage}
          alt=""
          style={{ width: `${size}px`, height: `${size}px`, objectFit: 'cover', borderRadius: 3 }}
        />
      );
    }
    if (node.data?.iconId != null) {
      return renderStandardIcon(Number(node.data.iconId), size);
    }

    if (secretType === 'crypto_wallet') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h14v4" />
          <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
          <path d="M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6h-4z" />
        </svg>
      );
    }
    if (secretType === 'api_key') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      );
    }
    if (secretType === 'secure_note') {
      return cloneThemeIcon(themeIcons.file, size, themeColor) || (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    }
    return cloneThemeIcon(themeIcons.password, size, themeColor) || (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }

  if (!isFolder) return null;

  if (node.folderIcon && node.folderIcon !== 'general' && FolderIconPresets[node.folderIcon.toUpperCase()]) {
    const preset = FolderIconPresets[node.folderIcon.toUpperCase()];
    return <FolderIconRenderer preset={preset} pixelSize={size} />;
  }
  if (node.data && node.data.iconImage) {
    return (
      <img
        src={node.data.iconImage}
        alt=""
        style={{ width: `${size}px`, height: `${size}px`, objectFit: 'cover', borderRadius: 3 }}
      />
    );
  }

  let tintColor = node.color || themeColor;
  if (node.data && node.data.iconId != null) {
    const id = Number(node.data.iconId);
    tintColor = FOLDER_TINTS[id % FOLDER_TINTS.length];
  }
  const themeIcon = expanded ? themeIcons.folderOpen : themeIcons.folder;
  return cloneThemeIcon(themeIcon, size, tintColor) || (
    <span className={expanded ? 'pi pi-folder-open' : 'pi pi-folder'} style={{ color: tintColor, fontSize: `${size}px` }} />
  );
}
