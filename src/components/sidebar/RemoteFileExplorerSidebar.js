import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ContextMenu } from 'primereact/contextmenu';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import { appConfirm } from '../ui/AppConfirm';
import { appPrompt } from '../ui/AppPrompt';
import { CONNECTION_STATUS } from '../../utils/constants';

function joinRemotePath(base, name) {
  const cleanName = String(name || '').replace(/^\/+/, '');
  if (!base || base === '/') return `/${cleanName}`;
  return `${String(base).replace(/\/+$/, '')}/${cleanName}`;
}

function parentRemotePath(path) {
  if (!path || path === '/') return null;
  const trimmed = String(path).replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  if (idx <= 0) return '/';
  return trimmed.slice(0, idx);
}

function formatSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isInternalDrag(dataTransfer) {
  const types = Array.from(dataTransfer?.types || []);
  return types.includes('application/nodeterm-connection')
    || types.includes('application/nodeterm-ssh-node')
    || types.includes('application/vnd.nodeterm.side');
}

function canAcceptFiles(dataTransfer) {
  if (!dataTransfer || isInternalDrag(dataTransfer)) return false;
  return Array.from(dataTransfer.types || []).includes('Files');
}

function basename(filePath) {
  const parts = String(filePath || '').split(/[/\\]/);
  return parts[parts.length - 1] || '';
}

/** Electron 32+ quitó File.path; hay que resolverlo con webUtils (ver preload). */
function resolveDroppedLocalPath(file) {
  if (!file) return '';
  try {
    const viaWebUtils = window.electron?.webUtils?.getPathForFile?.(file);
    if (typeof viaWebUtils === 'string' && viaWebUtils) return viaWebUtils;
  } catch {
    /* webUtils no disponible o File no válido */
  }
  if (typeof file.path === 'string' && file.path) return file.path;
  return '';
}

function partitionDrop(dataTransfer) {
  // Resolver rutas antes de webkitGetAsEntry; getAsFile() no aporta path usable.
  const snapped = Array.from(dataTransfer?.files || []).map((file) => {
    const localPath = resolveDroppedLocalPath(file);
    return {
      path: localPath,
      name: basename(localPath) || (typeof file?.name === 'string' ? file.name : '')
    };
  });

  const folderNames = [];
  Array.from(dataTransfer?.items || []).forEach((item) => {
    if (item.kind && item.kind !== 'file') return;
    try {
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) folderNames.push(entry.name || '');
    } catch {
      /* la entrada no se puede inspeccionar */
    }
  });

  const folderNameSet = new Set(folderNames.filter(Boolean));
  const files = snapped.filter((file) => file.path && !folderNameSet.has(file.name));
  return { files, folderNames };
}

function sortEntries(files) {
  return [...files].sort((a, b) => {
    const aDir = a.type === 'directory' ? 0 : 1;
    const bDir = b.type === 'directory' ? 0 : 1;
    if (aDir !== bDir) return aDir - bDir;
    return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
  });
}

export default function RemoteFileExplorerSidebar({
  tabId,
  sshConfig,
  sessionLabel,
  connected,
  status,
  showToast,
  pathMemoryRef
}) {
  const { t } = useTranslation('common');
  const sshConfigRef = useRef(sshConfig);
  sshConfigRef.current = sshConfig;
  const fallbackPathMemory = useRef(new Map());
  const pathMemory = pathMemoryRef || fallbackPathMemory;
  const listSeq = useRef(0);
  const contextMenuRef = useRef(null);
  const pendingMenuEventRef = useRef(null);
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPath, setSelectedPath] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [menuModel, setMenuModel] = useState([]);
  const [transfer, setTransfer] = useState(null);

  const notify = useCallback((severity, summary, detail) => {
    if (typeof showToast !== 'function') return;
    showToast({ severity, summary, detail, life: severity === 'error' ? 4500 : 2800 });
  }, [showToast]);

  const listDirectory = useCallback(async (path) => {
    const fe = window.electron?.fileExplorer;
    if (!fe || !tabId || !path) return;
    const seq = ++listSeq.current;
    setLoading(true);
    setError('');
    try {
      const result = await fe.listFiles(tabId, path, sshConfigRef.current);
      if (seq !== listSeq.current) return;
      if (!result?.success) {
        setError(result?.error || t('remoteExplorer.listError'));
        setCurrentPath((prev) => prev || path);
        return;
      }
      const files = (result.files || []).filter((file) => file?.name && file.name !== '.' && file.name !== '..');
      setEntries(sortEntries(files));
      setCurrentPath(path);
      pathMemory.current.set(String(tabId), path);
    } catch (err) {
      if (seq !== listSeq.current) return;
      setCurrentPath((prev) => prev || path);
      setError(err?.message || t('remoteExplorer.listError'));
    } finally {
      if (seq === listSeq.current) setLoading(false);
    }
  }, [pathMemory, t, tabId]);

  useEffect(() => {
    setEntries([]);
    setError('');
    setSelectedPath(null);
    setDropTarget(null);
    setTransfer(null);
    setCurrentPath(tabId ? (pathMemory.current.get(String(tabId)) || '') : '');
  }, [pathMemory, tabId]);

  useEffect(() => {
    if (!tabId || !connected) return undefined;
    let cancelled = false;
    const open = async () => {
      const remembered = pathMemory.current.get(String(tabId));
      if (remembered) {
        if (!cancelled) await listDirectory(remembered);
        return;
      }
      const fe = window.electron?.fileExplorer;
      if (!fe) return;
      setLoading(true);
      setError('');
      try {
        const home = await fe.getHomeDirectory(tabId, sshConfigRef.current);
        if (cancelled) return;
        const path = home?.success && home.home ? home.home : '/';
        pathMemory.current.set(String(tabId), path);
        await listDirectory(path);
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        setError(err?.message || t('remoteExplorer.listError'));
      }
    };
    open();
    return () => {
      cancelled = true;
    };
  }, [connected, listDirectory, pathMemory, t, tabId]);

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer;
    if (!ipc?.on || !tabId) return undefined;
    const onProgress = (data) => {
      if (!data || String(data.tabId) !== String(tabId)) return;
      const transferred = Number(data.transferred) || 0;
      const total = Number(data.total) || 0;
      setTransfer({
        fileName: data.fileName || '',
        transferred,
        total,
        type: data.type || 'upload'
      });
      if (total > 0 && transferred >= total) {
        const fileName = data.fileName || '';
        window.setTimeout(() => {
          setTransfer((current) => (current && current.fileName === fileName ? null : current));
        }, 900);
      }
    };
    const offSsh = ipc.on('ssh:transfer-progress', onProgress);
    const offFile = ipc.on('file:transfer-progress', onProgress);
    return () => {
      if (typeof offSsh === 'function') offSsh();
      if (typeof offFile === 'function') offFile();
    };
  }, [tabId]);

  const uploadFiles = useCallback(async (fileList, destination) => {
    const fe = window.electron?.fileExplorer;
    const baseDir = destination || currentPath;
    if (!fe || !baseDir) return;
    const usable = fileList.filter((file) => file?.path);
    if (usable.length === 0) {
      notify('warn', t('remoteExplorer.uploadFailTitle'), t('remoteExplorer.uploadNoPath'));
      return;
    }
    let ok = 0;
    let failed = 0;
    const errors = [];
    for (const file of usable) {
      const fileName = basename(file.path);
      if (!fileName) {
        failed += 1;
        errors.push(t('remoteExplorer.uploadNoPath'));
        continue;
      }
      const remotePath = joinRemotePath(baseDir, fileName);
      try {
        const result = await fe.uploadFile(tabId, file.path, remotePath, sshConfigRef.current);
        if (result?.success) ok += 1;
        else {
          failed += 1;
          if (result?.error) errors.push(String(result.error));
        }
      } catch (err) {
        failed += 1;
        if (err?.message) errors.push(err.message);
      }
    }
    if (ok > 0) {
      notify('success', t('remoteExplorer.uploadOkTitle'), t('remoteExplorer.uploadOk', { count: ok }));
      if (baseDir === currentPath) await listDirectory(currentPath);
    }
    if (failed > 0) {
      const detail = errors.length > 0
        ? errors.slice(0, 3).join('\n')
        : t('remoteExplorer.uploadFail', { count: failed });
      notify('error', t('remoteExplorer.uploadFailTitle'), detail);
    }
  }, [currentPath, listDirectory, notify, t, tabId]);

  const onDragOver = useCallback((event) => {
    if (!canAcceptFiles(event.dataTransfer) || !connected) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    const row = event.target.closest?.('[data-entry-path]');
    if (row?.dataset?.entryType === 'directory' && row.dataset.entryPath) {
      setDropTarget(row.dataset.entryPath);
      return;
    }
    setDropTarget(currentPath || '/');
  }, [connected, currentPath]);

  const onDragLeave = useCallback((event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setDropTarget(null);
  }, []);

  const onDrop = useCallback(async (event) => {
    if (!canAcceptFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    const row = event.target.closest?.('[data-entry-path]');
    const destination = row?.dataset?.entryType === 'directory' && row.dataset.entryPath
      ? row.dataset.entryPath
      : currentPath;
    setDropTarget(null);
    const { files, folderNames } = partitionDrop(event.dataTransfer);
    if (folderNames.length > 0) {
      notify('info', t('remoteExplorer.foldersSkippedTitle'), t('remoteExplorer.foldersSkipped'));
    }
    if (files.length > 0) await uploadFiles(files, destination);
  }, [currentPath, notify, t, uploadFiles]);

  const createFolder = useCallback(async (baseDir) => {
    const fe = window.electron?.fileExplorer;
    if (!fe || !baseDir) return;
    const name = await appPrompt({
      header: t('remoteExplorer.newFolder'),
      placeholder: t('remoteExplorer.folderName'),
      acceptLabel: t('remoteExplorer.accept'),
      rejectLabel: t('common.cancel')
    });
    if (!name || !name.trim()) return;
    const remotePath = joinRemotePath(baseDir, name.trim());
    try {
      const result = await fe.createDirectory(tabId, remotePath, sshConfigRef.current);
      if (result?.success) {
        notify('success', t('remoteExplorer.createdTitle'), name.trim());
        if (baseDir === currentPath) await listDirectory(currentPath);
      } else {
        notify('error', t('remoteExplorer.actionFailTitle'), result?.error || t('remoteExplorer.listError'));
      }
    } catch (err) {
      notify('error', t('remoteExplorer.actionFailTitle'), err?.message || t('remoteExplorer.listError'));
    }
  }, [currentPath, listDirectory, notify, t, tabId]);

  const renameEntry = useCallback(async (entry) => {
    const fe = window.electron?.fileExplorer;
    if (!fe || !entry?.name || !currentPath) return;
    const nextName = await appPrompt({
      header: t('remoteExplorer.rename'),
      defaultValue: entry.name,
      acceptLabel: t('remoteExplorer.accept'),
      rejectLabel: t('common.cancel')
    });
    if (!nextName || !nextName.trim() || nextName.trim() === entry.name) return;
    const oldPath = joinRemotePath(currentPath, entry.name);
    const newPath = joinRemotePath(currentPath, nextName.trim());
    try {
      const result = await fe.renameFile(tabId, oldPath, newPath, sshConfigRef.current);
      if (result?.success) {
        notify('success', t('remoteExplorer.renamedTitle'), nextName.trim());
        await listDirectory(currentPath);
      } else {
        notify('error', t('remoteExplorer.actionFailTitle'), result?.error || t('remoteExplorer.listError'));
      }
    } catch (err) {
      notify('error', t('remoteExplorer.actionFailTitle'), err?.message || t('remoteExplorer.listError'));
    }
  }, [currentPath, listDirectory, notify, t, tabId]);

  const deleteEntry = useCallback(async (entry) => {
    const fe = window.electron?.fileExplorer;
    if (!fe || !entry?.name || !currentPath) return;
    const ok = await appConfirm({
      message: t('remoteExplorer.confirmDelete', { name: entry.name }),
      header: t('remoteExplorer.delete'),
      severity: 'danger',
      acceptLabel: t('remoteExplorer.delete'),
      rejectLabel: t('common.cancel')
    });
    if (!ok) return;
    const remotePath = joinRemotePath(currentPath, entry.name);
    try {
      const result = await fe.deleteFile(tabId, remotePath, entry.type === 'directory', sshConfigRef.current);
      if (result?.success) {
        notify('success', t('remoteExplorer.deletedTitle'), entry.name);
        await listDirectory(currentPath);
      } else {
        notify('error', t('remoteExplorer.actionFailTitle'), result?.error || t('remoteExplorer.listError'));
      }
    } catch (err) {
      notify('error', t('remoteExplorer.actionFailTitle'), err?.message || t('remoteExplorer.listError'));
    }
  }, [currentPath, listDirectory, notify, t, tabId]);

  const downloadEntry = useCallback(async (entry) => {
    const fe = window.electron?.fileExplorer;
    const dialog = window.electron?.dialog;
    if (!fe || !dialog || !entry?.name || entry.type === 'directory' || !currentPath) return;
    try {
      const picked = await dialog.showSaveDialog({ defaultPath: entry.name });
      if (!picked || picked.canceled || !picked.filePath) return;
      const remotePath = joinRemotePath(currentPath, entry.name);
      const result = await fe.downloadFile(tabId, remotePath, picked.filePath, sshConfigRef.current);
      if (result?.success) {
        notify('success', t('remoteExplorer.downloadedTitle'), entry.name);
      } else {
        notify('error', t('remoteExplorer.actionFailTitle'), result?.error || t('remoteExplorer.listError'));
      }
    } catch (err) {
      notify('error', t('remoteExplorer.actionFailTitle'), err?.message || t('remoteExplorer.listError'));
    }
  }, [currentPath, notify, t, tabId]);

  const openMenu = useCallback((event, entry) => {
    event.preventDefault();
    event.stopPropagation();
    const items = [];
    if (!entry) {
      items.push({
        label: t('remoteExplorer.refresh'),
        icon: 'pi pi-refresh',
        command: () => { if (currentPath) listDirectory(currentPath); }
      });
      items.push({
        label: t('remoteExplorer.newFolder'),
        icon: 'pi pi-plus',
        command: () => createFolder(currentPath)
      });
    } else {
      if (entry.type === 'directory' || entry.type === 'symlink') {
        items.push({
          label: t('remoteExplorer.open'),
          icon: 'pi pi-folder-open',
          command: () => listDirectory(joinRemotePath(currentPath, entry.name))
        });
      }
      if (entry.type === 'directory') {
        items.push({
          label: t('remoteExplorer.newFolder'),
          icon: 'pi pi-plus',
          command: () => createFolder(joinRemotePath(currentPath, entry.name))
        });
      }
      items.push({
        label: t('remoteExplorer.rename'),
        icon: 'pi pi-pencil',
        command: () => renameEntry(entry)
      });
      items.push({
        label: t('remoteExplorer.delete'),
        icon: 'pi pi-trash',
        command: () => deleteEntry(entry)
      });
      if (entry.type === 'file' || entry.type === 'symlink') {
        items.push({
          label: t('remoteExplorer.download'),
          icon: 'pi pi-download',
          command: () => downloadEntry(entry)
        });
      }
    }
    setSelectedPath(entry ? joinRemotePath(currentPath, entry.name) : null);
    pendingMenuEventRef.current = event.nativeEvent || event;
    setMenuModel(items);
  }, [createFolder, currentPath, deleteEntry, downloadEntry, listDirectory, renameEntry, t]);

  useEffect(() => {
    const nativeEvent = pendingMenuEventRef.current;
    if (!nativeEvent || menuModel.length === 0) return;
    pendingMenuEventRef.current = null;
    contextMenuRef.current?.show(nativeEvent);
  }, [menuModel]);

  const parent = parentRemotePath(currentPath);
  const waiting = !connected;
  const disconnected = status === CONNECTION_STATUS.DISCONNECTED || status === CONNECTION_STATUS.ERROR;
  const progressPct = transfer && transfer.total > 0
    ? Math.min(100, Math.round((transfer.transferred / transfer.total) * 100))
    : 0;

  return (
    <div className="remote-explorer-sidebar">
      <div className="remote-explorer-toolbar">
        <button
          type="button"
          className="remote-explorer-icon-btn"
          title={t('tooltips.goToParent')}
          disabled={!parent || waiting}
          onClick={() => parent && listDirectory(parent)}
        >
          <i className="pi pi-arrow-up" />
        </button>
        <button
          type="button"
          className="remote-explorer-icon-btn"
          title={t('tooltips.refresh')}
          disabled={waiting || !currentPath}
          onClick={() => currentPath && listDirectory(currentPath)}
        >
          <i className="pi pi-refresh" />
        </button>
        <span className="remote-explorer-session" title={sessionLabel || ''}>{sessionLabel}</span>
      </div>
      <div className="remote-explorer-path" title={currentPath || ''}>{currentPath || '…'}</div>
      {transfer && (
        <div className="remote-explorer-progress" title={transfer.fileName}>
          <span className="remote-explorer-progress-name">{transfer.fileName}</span>
          <span className="remote-explorer-progress-pct">{transfer.total > 0 ? `${progressPct}%` : ''}</span>
          <div className="remote-explorer-progress-track">
            <div className="remote-explorer-progress-fill" style={{ width: `${transfer.total > 0 ? progressPct : 30}%` }} />
          </div>
        </div>
      )}
      <div
        className={`remote-explorer-list${dropTarget && dropTarget === (currentPath || '/') ? ' is-drop-target' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onContextMenu={(event) => {
          if (event.target.closest?.('[data-entry-path]')) return;
          if (waiting) return;
          openMenu(event, null);
        }}
      >
        {waiting && (
          <div className="remote-explorer-status">
            {disconnected ? t('remoteExplorer.disconnected') : t('remoteExplorer.waiting')}
          </div>
        )}
        {!waiting && loading && entries.length === 0 && (
          <div className="remote-explorer-status">{t('remoteExplorer.loading')}</div>
        )}
        {!waiting && error && (
          <div className="remote-explorer-status remote-explorer-status-error">
            <span>{error}</span>
            <button type="button" onClick={() => currentPath && listDirectory(currentPath)}>
              {t('tooltips.retry')}
            </button>
          </div>
        )}
        {!waiting && !error && !loading && entries.length === 0 && currentPath && (
          <div className="remote-explorer-status">{t('remoteExplorer.empty')}</div>
        )}
        {!waiting && entries.map((entry) => {
          const entryPath = joinRemotePath(currentPath, entry.name);
          const isDir = entry.type === 'directory';
          const isLink = entry.type === 'symlink';
          const hidden = String(entry.name).startsWith('.');
          const selected = selectedPath === entryPath;
          const dropping = dropTarget === entryPath && isDir;
          return (
            <div
              key={entryPath}
              data-entry-path={entryPath}
              data-entry-type={isDir ? 'directory' : 'file'}
              className={`remote-explorer-row${selected ? ' is-selected' : ''}${dropping ? ' is-drop-target' : ''}${hidden ? ' is-hidden' : ''}`}
              title={entry.name}
              onClick={() => setSelectedPath(entryPath)}
              onDoubleClick={() => {
                if (isDir || isLink) listDirectory(entryPath);
              }}
              onContextMenu={(event) => openMenu(event, entry)}
            >
              <i className={isDir ? 'pi pi-folder' : (isLink ? 'pi pi-link' : 'pi pi-file')} aria-hidden="true" />
              <span className="remote-explorer-name">{entry.name}</span>
              {!isDir && <span className="remote-explorer-meta">{formatSize(entry.size)}</span>}
            </div>
          );
        })}
        {dropTarget && (
          <div className="remote-explorer-drop-hint">{t('remoteExplorer.dropHint')}</div>
        )}
      </div>
      <ContextMenu model={menuModel} ref={contextMenuRef} />
    </div>
  );
}
