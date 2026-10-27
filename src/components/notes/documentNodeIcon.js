import React from 'react';
import { iconThemes } from '../../themes/icon-themes';
import { FolderIconRenderer, FolderIconPresets } from '../FolderIconSelector';
import { isNotebook, isQuickNotesGroup, isLibraryFile, isLinkedFolder, isCloudFolder, libraryFileKind } from './notesBrowse';

/** Icono y color por categoría de visor, para los archivos de la biblioteca. */
const FILE_KIND_ICON = {
  pdf: { icon: 'pi pi-file-pdf', color: '#ef5350' },
  image: { icon: 'pi pi-image', color: '#66bb6a' },
  markdown: { icon: 'pi pi-file-edit', color: '#64b5f6' },
  text: { icon: 'pi pi-align-left', color: '#90a4ae' },
  video: { icon: 'pi pi-video', color: '#ab47bc' },
  audio: { icon: 'pi pi-volume-up', color: '#ffa726' },
  unsupported: { icon: 'pi pi-box', color: '#8d9aa5' }
};

export function renderDocumentNodeIcon(node, { iconTheme = 'nord', size = 18, expanded = false, NotebookIcon } = {}) {
  if (!node) return null;

  if (isQuickNotesGroup(node)) {
    return <i className="pi pi-bolt" style={{ fontSize: `${Math.max(12, size - 2)}px`, color: '#ffc107' }} />;
  }

  if (isCloudFolder(node)) {
    return (
      <i
        className="pi pi-cloud"
        style={{ fontSize: `${Math.max(12, size - 2)}px`, color: '#4fc3f7' }}
        title={node.data?.remotePath || 'Nextcloud'}
      />
    );
  }

  if (isLinkedFolder(node)) {
    return (
      <i
        className={expanded ? 'pi pi-folder-open' : 'pi pi-folder'}
        style={{ fontSize: `${Math.max(12, size - 2)}px`, color: '#26c6da' }}
        title={node.data?.absPath}
      />
    );
  }

  if (isLibraryFile(node)) {
    const { icon, color } = FILE_KIND_ICON[libraryFileKind(node)] || FILE_KIND_ICON.unsupported;
    return <i className={icon} style={{ fontSize: `${Math.max(12, size - 2)}px`, color }} />;
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
