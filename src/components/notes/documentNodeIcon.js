import React from 'react';
import { iconThemes } from '../../themes/icon-themes';
import { FolderIconRenderer, FolderIconPresets } from '../FolderIconSelector';
import { isNotebook, isQuickNotesGroup } from './notesBrowse';

export function renderDocumentNodeIcon(node, { iconTheme = 'nord', size = 18, expanded = false, NotebookIcon } = {}) {
  if (!node) return null;

  if (isQuickNotesGroup(node)) {
    return <i className="pi pi-bolt" style={{ fontSize: `${Math.max(12, size - 2)}px`, color: '#ffc107' }} />;
  }

  if (isNotebook(node)) {
    if (node.data?.customIcon) {
      const preset = Object.values(FolderIconPresets).find((p) => p.id === node.data.customIcon);
      if (preset) {
        return <FolderIconRenderer preset={preset} pixelSize={size} />;
      }
    }
    if (NotebookIcon) {
      return <NotebookIcon themeKey={iconTheme} isOpen={expanded} size={size} />;
    }
    return <i className="pi pi-book" style={{ fontSize: `${size}px`, color: '#64b5f6' }} />;
  }

  if (node.data?.icon) {
    return (
      <span style={{
        fontSize: `${Math.max(12, size - 2)}px`,
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      >
        {node.data.icon}
      </span>
    );
  }

  const themeIcons = iconThemes[iconTheme]?.icons || iconThemes.nord?.icons || {};
  if (themeIcons.file && React.isValidElement(themeIcons.file)) {
    return React.cloneElement(themeIcons.file, {
      width: size,
      height: size,
      style: {
        ...themeIcons.file.props.style,
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0
      }
    });
  }

  return <i className="pi pi-file" style={{ fontSize: `${Math.max(12, size - 2)}px`, color: '#64b5f6' }} />;
}
