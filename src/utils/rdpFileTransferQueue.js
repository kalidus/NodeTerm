/**
 * Cola de transferencias Iron RDP (CLIPRDR).
 * Copiar en el remoto solo siembra pendientes; los bytes empiezan al descargar.
 */

function fileTransferNameOf(file) {
  return file?.name || file?.file?.name || 'Archivo';
}

function isDownloadableFile(file) {
  return !!file && file.isDirectory !== true;
}

function createPendingDownloadId(fileIndex) {
  return `pending-${fileIndex}`;
}

function formatTransferSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) {
    const kb = n / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  if (n < 1024 * 1024 * 1024) {
    const mb = n / (1024 * 1024);
    return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  }
  const gb = n / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function cloneTransfers(prev) {
  return prev && typeof prev === 'object' ? { ...prev } : {};
}

function seedPendingDownloads(prev, files) {
  const next = cloneTransfers(prev);
  Object.keys(next).forEach((id) => {
    const entry = next[id];
    if (entry && entry.type === 'download' && entry.status === 'pending') {
      delete next[id];
    }
  });
  if (!Array.isArray(files)) return next;
  files.forEach((file, fileIndex) => {
    if (!isDownloadableFile(file)) return;
    const id = createPendingDownloadId(fileIndex);
    next[id] = {
      name: fileTransferNameOf(file),
      type: 'download',
      percentage: 0,
      status: 'pending',
      fileIndex,
      size: Number(file.size) || 0,
      fileInfo: file
    };
  });
  return next;
}

function activatePendingDownload(prev, pendingId, transferId) {
  if (pendingId == null || transferId == null) return prev || {};
  const existing = prev?.[pendingId];
  if (!existing || existing.status !== 'pending') return prev || {};
  const next = cloneTransfers(prev);
  delete next[pendingId];
  next[transferId] = {
    ...existing,
    status: 'active',
    percentage: existing.percentage || 0,
    type: 'download'
  };
  return next;
}

function transferIdAliases(id) {
  if (id == null) return [];
  const aliases = [id];
  const asString = String(id);
  if (!aliases.includes(asString)) aliases.push(asString);
  const asNumber = Number(id);
  if (Number.isFinite(asNumber) && !aliases.includes(asNumber)) aliases.push(asNumber);
  return aliases;
}

function markAborted(abortedIds, id) {
  if (!abortedIds || typeof abortedIds.add !== 'function' || id == null) return;
  transferIdAliases(id).forEach((alias) => abortedIds.add(alias));
}

function isAbortedId(abortedIds, id) {
  if (!abortedIds || typeof abortedIds.has !== 'function' || id == null) return false;
  return transferIdAliases(id).some((alias) => abortedIds.has(alias));
}

function getTransferEntry(transfers, id) {
  if (!transfers || id == null) return undefined;
  if (Object.prototype.hasOwnProperty.call(transfers, id)) return transfers[id];
  const asString = String(id);
  if (Object.prototype.hasOwnProperty.call(transfers, asString)) return transfers[asString];
  const asNumber = Number(id);
  if (Number.isFinite(asNumber) && Object.prototype.hasOwnProperty.call(transfers, asNumber)) {
    return transfers[asNumber];
  }
  return undefined;
}

function applyDownloadProgress(prev, progress, abortedIds) {
  const transferId = progress?.transferId;
  if (transferId == null) return prev || {};
  if (isAbortedId(abortedIds, transferId)) return prev || {};
  const existing = getTransferEntry(prev, transferId);
  if (!existing) return prev || {};
  if (existing.status === 'complete' || existing.status === 'error' || existing.status === 'pending') {
    return prev || {};
  }
  const percentage = Number(progress.percentage) || 0;
  const next = cloneTransfers(prev);
  delete next[transferId];
  delete next[String(transferId)];
  next[transferId] = {
    ...existing,
    name: progress.fileName || existing.name || 'Archivo',
    type: 'download',
    percentage,
    status: percentage >= 100 ? 'complete' : 'active',
    size: existing.size || Number(progress.totalBytes) || 0
  };
  return next;
}

function removeTransfer(prev, transferId) {
  if (transferId == null || !prev) return prev || {};
  const existing = getTransferEntry(prev, transferId);
  if (!existing) return prev;
  const next = cloneTransfers(prev);
  transferIdAliases(transferId).forEach((alias) => {
    delete next[alias];
  });
  return next;
}

function isStartedTransferStatus(status) {
  return status === 'active' || status === 'pasting' || status == null;
}

function cancelTransferEntry(prev, id, abortedIds) {
  const existing = getTransferEntry(prev, id);
  if (!existing) return prev || {};
  if (isStartedTransferStatus(existing.status)) {
    markAborted(abortedIds, id);
  }
  return removeTransfer(prev, id);
}

function abortProviderDownload(provider, transferId) {
  if (!provider || transferId == null) return false;
  const downloads = provider.activeDownloads;
  if (!downloads || typeof downloads.get !== 'function') return false;
  let state = null;
  let foundKey = null;
  transferIdAliases(transferId).some((alias) => {
    if (downloads.has(alias)) {
      state = downloads.get(alias);
      foundKey = alias;
      return true;
    }
    return false;
  });
  if (!state) return false;
  downloads.delete(foundKey);
  state.chunks = [];
  if (typeof state.reject === 'function') {
    try {
      state.reject(new Error('Transferencia cancelada'));
    } catch (_) {
      /* noop */
    }
  }
  return true;
}

function installDownloadAbortGuard(provider, abortedIds) {
  if (!provider || provider.__nodetermAbortGuard) return;
  const original = typeof provider.handleFileContentsResponse === 'function'
    ? provider.handleFileContentsResponse.bind(provider)
    : null;
  if (!original) return;
  provider.__nodetermAbortGuard = true;
  provider.handleFileContentsResponse = (response) => {
    const streamId = response?.streamId;
    if (isAbortedId(abortedIds, streamId)) {
      abortProviderDownload(provider, streamId);
      return;
    }
    return original(response);
  };
}

function discardPendingDownloads(prev) {
  const next = cloneTransfers(prev);
  Object.keys(next).forEach((id) => {
    if (next[id]?.type === 'download' && next[id]?.status === 'pending') {
      delete next[id];
    }
  });
  return next;
}

function shouldAcceptCompletion(abortedIds, transferId) {
  if (transferId == null) return false;
  return !isAbortedId(abortedIds, transferId);
}

function listPendingDownloadIds(transfers) {
  return Object.entries(transfers || {})
    .filter(([, entry]) => entry && entry.type === 'download' && entry.status === 'pending')
    .map(([id]) => id);
}

function hasFileTransferWork(transfers) {
  return Object.values(transfers || {}).some((entry) => {
    if (!entry) return false;
    if (entry.type === 'download') return entry.status !== 'complete' && entry.status !== 'error';
    return entry.status === 'ready' || entry.status === 'pasting' || entry.status === 'active';
  });
}

function getTransferOverlayHeader(transfers) {
  const entries = Object.values(transfers || {});
  const hasPending = entries.some((t) => t.status === 'pending');
  const hasReady = entries.some((t) => t.status === 'ready');
  const hasPasting = entries.some((t) => t.status === 'pasting');
  const hasActive = entries.some((t) => t.status === 'active' || !t.status);
  const hasError = entries.some((t) => t.status === 'error');

  if (hasPasting || hasActive) {
    return {
      headerLabel: hasPasting ? 'Pegando en el remoto' : 'Transferencias en curso',
      headerColor: '#60a5fa',
      headerIcon: 'pi pi-sync pi-spin',
      borderColor: 'rgba(59, 130, 246, 0.4)',
      hint: null
    };
  }
  if (hasPending) {
    return {
      headerLabel: 'Archivos listos para descargar',
      headerColor: '#38bdf8',
      headerIcon: 'pi pi-download',
      borderColor: 'rgba(56, 189, 248, 0.45)',
      hint: 'La copia no transfiere bytes hasta pulsar Descargar'
    };
  }
  if (hasReady) {
    return {
      headerLabel: 'Listo para pegar',
      headerColor: '#38bdf8',
      headerIcon: 'pi pi-clipboard',
      borderColor: 'rgba(56, 189, 248, 0.45)',
      hint: 'Pulsa Ctrl+V en el escritorio remoto'
    };
  }
  if (hasError) {
    return {
      headerLabel: 'Error de transferencia',
      headerColor: '#f87171',
      headerIcon: 'pi pi-times-circle',
      borderColor: 'rgba(248, 113, 113, 0.45)',
      hint: null
    };
  }
  return {
    headerLabel: 'Completado',
    headerColor: '#4ade80',
    headerIcon: 'pi pi-check-circle',
    borderColor: 'rgba(74, 222, 128, 0.45)',
    hint: null
  };
}

module.exports = {
  fileTransferNameOf,
  isDownloadableFile,
  createPendingDownloadId,
  formatTransferSize,
  seedPendingDownloads,
  activatePendingDownload,
  applyDownloadProgress,
  removeTransfer,
  cancelTransferEntry,
  abortProviderDownload,
  installDownloadAbortGuard,
  markAborted,
  isAbortedId,
  getTransferEntry,
  discardPendingDownloads,
  shouldAcceptCompletion,
  listPendingDownloadIds,
  hasFileTransferWork,
  getTransferOverlayHeader
};
