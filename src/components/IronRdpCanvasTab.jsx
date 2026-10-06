import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressBar } from 'primereact/progressbar';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import {
  Backend,
  init as initIronRdp,
  enableCredssp,
  displayControl,
  RdpFileTransferProvider,
  printerDeviceId,
  printerDriverName,
  printerName,
  printJobStreamCallbacks,
  PrinterDriverName
} from '@devolutions/iron-remote-desktop-rdp';
import { resolveCredsspPolicy } from '../utils/rdpSecurityPolicy';
import { parseResolutionValue } from '../utils/rdpScreenConfig';
import { mapTerminationReason } from '../utils/rdpTerminationReasons';
import { installCanvasDrawProbe } from '../utils/rdpCanvasProbe';
import {
  fileTransferNameOf,
  formatTransferSize,
  seedPendingDownloads,
  activatePendingDownload,
  applyDownloadProgress,
  removeTransfer,
  cancelTransferEntry,
  abortProviderDownload,
  installStreamingDownload,
  getTransferEntry,
  discardPendingDownloads,
  shouldAcceptCompletion,
  listPendingDownloadIds,
  hasFileTransferWork,
  getTransferOverlayHeader
} from '../utils/rdpFileTransferQueue';

// 64KB es el default de IronRDP. 256KB rompe el decode de FileContentsResponse
// (received N, expected 262148) y tumba toda la sesion CLIPRDR.
const CLIPRDR_DOWNLOAD_CHUNK = 64 * 1024;
const TEMP_FILE_WRITE_CHUNK = 4 * 1024 * 1024;

export { mapTerminationReason };

const extractErrorMessage = (err) => {
  if (!err) return 'Error desconocido de conexión RDP';
  if (typeof err === 'string') return err;

  let msg = err.message || '';

  if (typeof err.kind === 'function') {
    try {
      const k = err.kind();
      const kinds = [
        'General (0)',
        'Contraseña o usuario incorrecto (1)',
        'Fallo de inicio de sesión / Logon Failure (2)',
        'Acceso denegado (3)',
        'RDCleanPath (4)',
        'Error de conexión Proxy WebSocket (5)',
        'Fallo de negociación RDP (6)'
      ];
      const kindStr = kinds[k] || `Código ${k}`;
      const backtrace = typeof err.backtrace === 'function' ? err.backtrace() : '';
      msg = `IronRDP: ${kindStr}${backtrace ? ` - ${backtrace}` : ''}`;
    } catch (e) {
      console.warn('Error leyendo detalles de IronError:', e);
    }
  }

  if (!msg && typeof err.toString === 'function' && err.toString() !== '[object Object]') {
    msg = err.toString();
  }

  if (!msg) {
    try {
      const props = Object.getOwnPropertyNames(err);
      msg = `Error (${props.map(p => `${p}:${err[p]}`).join(', ')})`;
    } catch (e) {
      msg = String(err);
    }
  }

  if (msg.includes('read RDCleanPath request') || (msg.includes('not enough bytes') && msg.includes('RDCleanPath'))) {
    return `La conexión RDP se cerró prematuramente durante el saludo inicial (${msg}). Verifica que la IP/puerto del servidor sea correcta y que el equipo esté encendido y accesible desde esta red.`;
  }

  if (msg.includes('not enough bytes') || msg.includes('read frame by hint')) {
    return `La sesion RDP se corto al leer el siguiente frame (${msg}).`;
  }

  return msg;
};

// desynchronized pinta el canvas sin esperar al compositor. Va por defecto.
// Para quitarlo: `localStorage.setItem('NODETERM_RDP_DESYNC', '0')` y reabrir la pestaña.
// No se usa contain:strict (iba junto a los recuadros negros).
const isRdpDesyncEnabled = () => {
  try {
    return window.localStorage?.getItem('NODETERM_RDP_DESYNC') !== '0';
  } catch (_) {
    return true;
  }
};

const getOptimized2dContext = (canvas) => {
  if (!canvas) return null;
  const options = {
    alpha: false,
    willReadFrequently: false
  };
  if (isRdpDesyncEnabled()) options.desynchronized = true;
  return canvas.getContext('2d', options);
};

const readLocalClipboardText = async () => {
  try {
    if (window.electron?.clipboard?.readText) {
      const text = await window.electron.clipboard.readText();
      if (typeof text === 'string') return text;
    }
  } catch (_) {}
  try {
    if (navigator.clipboard?.readText) {
      return await navigator.clipboard.readText();
    }
  } catch (_) {}
  return '';
};

const writeLocalClipboardText = async (text) => {
  if (typeof text !== 'string') return;
  try {
    if (window.electron?.clipboard?.writeText) {
      await window.electron.clipboard.writeText(text);
      return;
    }
  } catch (_) {}
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch (_) {}
};

// Publica una Format List CLIPRDR en la sesión remota.
// Un texto vacío es legítimo y necesario: tras CB_MONITOR_READY el cliente debe anunciar
// formatos aunque no tenga nada que ofrecer (MS-RDPECLIP 1.3.2.1). Si no se llama a
// onClipboardPaste, IronRDP nunca emite CB_CLIP_CAPS ni CB_FORMAT_LIST y los bastiones
// estrictos (Wallix) cierran la conexión al recibir el CB_FORMAT_LIST_RESPONSE huérfano.
const sendClipboardToSession = async (session, text) => {
  if (!session) return;
  // Normalizar saltos de línea a CRLF para compatibilidad nativa con servidores Windows
  const normalizedText = String(text || '').replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  const clip = new Backend.ClipboardData();
  clip.addText('text/plain', normalizedText);
  await session.onClipboardPaste(clip);
};

const RESOLUTION_OPTIONS = [
  { label: '3840x2160', tag: '4K UHD', width: 3840, height: 2160 },
  { label: '2560x1440', tag: '2K QHD', width: 2560, height: 1440 },
  { label: '1920x1080', tag: 'Full HD', width: 1920, height: 1080 },
  { label: '1600x1000', tag: '16:10', width: 1600, height: 1000 },
  { label: '1600x900', tag: 'HD+', width: 1600, height: 900 },
  { label: '1440x900', tag: '16:10', width: 1440, height: 900 },
  { label: '1366x768', tag: 'WXGA', width: 1366, height: 768 },
  { label: '1280x800', tag: '16:10', width: 1280, height: 800 },
  { label: '1280x720', tag: 'HD', width: 1280, height: 720 },
  { label: '1024x768', tag: 'XGA 4:3', width: 1024, height: 768 }
];

const IronRdpCanvasTab = forwardRef(({ tabId, rdpConfig = {}, isActive = true, onClose }, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const updateCanvasRectRef = useRef(null);
  const sessionRef = useRef(null);
  const fileTransferProviderRef = useRef(null);
  const toastRef = useRef(null);
  const resolutionMenuRef = useRef(null);

  const [connectionState, setConnectionState] = useState('connecting'); // connecting, connected, error, disconnected
  const [errorMessage, setErrorMessage] = useState('');
  const [disconnectDetails, setDisconnectDetails] = useState(null);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isToolbarPinned, setIsToolbarPinned] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const [showClipboardDialog, setShowClipboardDialog] = useState(false);
  const [clipboardText, setClipboardText] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [activeTransfers, setActiveTransfers] = useState({});
  const [isAutoResize, setIsAutoResize] = useState(rdpConfig.autoResize !== false);
  const [showResolutionMenu, setShowResolutionMenu] = useState(false);

  const lastCursorStyleRef = useRef('default');
  const lastCursorKindRef = useRef('');
  const lastCursorHotspotRef = useRef({ x: 0, y: 0 });
  const lastCursorDataUrlRef = useRef('');
  const cursorImageRef = useRef(null);
  const lastReceivedClipboardTextRef = useRef('');
  const lastSentClipboardTextRef = useRef('');
  const isFileTransferArmedRef = useRef(false);
  const localClipboardCacheRef = useRef('');
  const clipboardChainRef = useRef(Promise.resolve());
  const pendingClipboardSendRef = useRef(null);
  const currentDesktopSizeRef = useRef({ width: 0, height: 0 });
  const lastRequestedDesktopRef = useRef({ width: 0, height: 0 });
  const resizeAckTimerRef = useRef(null);
  const supportsDisplayControlRef = useRef(false);
  const hasEverConnectedRef = useRef(false);
  const currentTokenIdRef = useRef(null);
  const lastBackendReasonRef = useRef(null);
  const uploadFailedIdsRef = useRef(new Set());
  const abortedTransferIdsRef = useRef(new Set());
  const activeTransfersRef = useRef({});
  const downloadedPathsRef = useRef([]);
  const transferDismissTimersRef = useRef(new Map());
  const TRANSFER_COMPLETE_OVERLAY_MS = 2500;

  activeTransfersRef.current = activeTransfers;

  // Búferes de diagnóstico en memoria para volcado automático ante incidencias
  const bridgeTraceBufferRef = useRef([]);
  const clipboardHistoryRef = useRef([]);
  const clipboardFailedRef = useRef(false);
  const clipboardUnhealthyToastShownRef = useRef(false);
  const userClosingRef = useRef(false);

  const isRdpDebugEnabled = () => {
    return (
      (typeof window !== 'undefined' && window.__NODETERM_RDP_DEBUG__ === true) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('NODETERM_RDP_DEBUG') === '1')
    );
  };

  const notifyUserClose = () => {
    userClosingRef.current = true;
    const tokenId = currentTokenIdRef.current;
    if (!tokenId || !window.electron?.ipcRenderer?.invoke) return;
    void window.electron.ipcRenderer.invoke('rdp:mark-user-close', tokenId).catch(() => {});
  };

  const markClipboardUnhealthy = (reason = 'unknown') => {
    clipboardFailedRef.current = true;
    console.warn(`📋 [IronRDP Clipboard] Portapapeles RDP no disponible (${reason})`);
    dumpClipboardHistory('Historial de portapapeles al detectar fallo CLIPRDR:');
    dumpBridgeTraces('Trazas del bridge al detectar fallo CLIPRDR:');
    if (clipboardUnhealthyToastShownRef.current) return;
    clipboardUnhealthyToastShownRef.current = true;
    toastRef.current?.show({
      severity: 'warn',
      summary: 'Portapapeles RDP no disponible',
      detail: String(reason),
      life: 4000
    });
  };

  const recordClipboardAction = (action, details = '') => {
    const ts = new Date().toISOString().slice(11, 19);
    const entry = `[${ts}] ${action}${details ? `: ${details}` : ''}`;
    clipboardHistoryRef.current.push(entry);
    if (clipboardHistoryRef.current.length > 30) {
      clipboardHistoryRef.current.shift();
    }
  };

  const dumpClipboardHistory = (title = 'Últimas operaciones del portapapeles:') => {
    if (!clipboardHistoryRef.current.length) return;
    console.warn(`📋 [IronRDP Clipboard Diagnostics] ${title}`);
    for (const line of clipboardHistoryRef.current) {
      console.warn(`   ${line}`);
    }
  };

  const dumpBridgeTraces = (title = 'Últimos eventos del bridge antes del corte:') => {
    if (!bridgeTraceBufferRef.current.length) return;
    console.warn(`🔍 [IronRDP Bridge Diagnostics] ${title}`);
    for (const line of bridgeTraceBufferRef.current) {
      console.warn(`   ${line}`);
    }
  };

  const clearTransferDismissTimers = () => {
    for (const timer of transferDismissTimersRef.current.values()) {
      clearTimeout(timer);
    }
    transferDismissTimersRef.current.clear();
  };

  const scheduleTransferDismiss = (transferId) => {
    if (transferId == null || transferDismissTimersRef.current.has(transferId)) return;
    const timer = setTimeout(() => {
      transferDismissTimersRef.current.delete(transferId);
      setActiveTransfers((prev) => {
        if (!prev[transferId]) return prev;
        const next = { ...prev };
        delete next[transferId];
        return next;
      });
    }, TRANSFER_COMPLETE_OVERLAY_MS);
    transferDismissTimersRef.current.set(transferId, timer);
  };

  const seedUploadTransfers = (transferIds, files) => {
    if (!transferIds || typeof transferIds.forEach !== 'function') return;
    setActiveTransfers((prev) => {
      const next = { ...prev };
      transferIds.forEach((transferId, fileIndex) => {
        const existing = next[transferId];
        if (existing?.status === 'complete' || existing?.status === 'error' || existing?.status === 'pasting') {
          return;
        }
        next[transferId] = {
          name: fileTransferNameOf(files?.[fileIndex]) || existing?.name || 'Archivo',
          type: 'upload',
          percentage: existing?.percentage || 0,
          status: 'ready'
        };
      });
      return next;
    });
  };

  const markTransferStatus = (transferId, status, extra = {}) => {
    if (transferId == null) return;
    setActiveTransfers((prev) => {
      const existing = prev[transferId];
      if (status === 'complete' && existing?.status === 'error') return prev;
      if (status === 'ready' && (existing?.status === 'complete' || existing?.status === 'error' || existing?.status === 'pasting')) {
        return prev;
      }
      return {
        ...prev,
        [transferId]: {
          name: extra.name || existing?.name || 'Archivo',
          type: extra.type || existing?.type || 'upload',
          percentage: status === 'complete' ? 100 : (extra.percentage ?? existing?.percentage ?? 0),
          status
        }
      };
    });
    if (status === 'complete' || status === 'error') {
      scheduleTransferDismiss(transferId);
    }
  };

  const showUploadReadyToast = (fileCount) => {
    toastRef.current?.show({
      severity: 'success',
      summary: 'Archivo subido',
      detail: fileCount > 1
        ? `${fileCount} archivos listos. Pulsa Ctrl+V en el escritorio remoto para pegarlos.`
        : 'Listo para pegar. Pulsa Ctrl+V en el escritorio remoto.',
      life: 6000
    });
  };

  const disarmFileTransfer = () => {
    isFileTransferArmedRef.current = false;
  };

  const hasActiveFileTransfer = (transfers) => {
    return Object.values(transfers || {}).some(
      (t) => t && (t.status === 'active' || t.status === 'pasting' || t.status === 'ready')
    );
  };

  const syncTransfersAndArm = (next) => {
    if (!hasActiveFileTransfer(next)) {
      disarmFileTransfer();
    }
    return next;
  };

  const finishDownloadedFiles = async (copiedPaths, fileNames) => {
    if (!copiedPaths.length || !window.electron?.clipboard?.writeFiles) return;
    downloadedPathsRef.current = copiedPaths;
    await window.electron.clipboard.writeFiles(copiedPaths);
    toastRef.current?.show({
      severity: 'success',
      summary: 'Archivo Listo en Portapapeles',
      detail: `${fileNames.join(', ')} copiado. Pulsa Ctrl+V en cualquier carpeta de tu PC para pegarlo.`,
      life: 5000
    });
  };

  const saveBlobToTempFile = async (fileName, blob, transferId) => {
    const clipboardApi = window.electron?.clipboard;
    if (!clipboardApi) return null;
    if (clipboardApi.beginTempFile && clipboardApi.appendTempFile && blob && typeof blob.slice === 'function') {
      const begin = await clipboardApi.beginTempFile(fileName);
      if (!begin?.success || !begin.filePath) return null;
      for (let offset = 0; offset < blob.size; offset += TEMP_FILE_WRITE_CHUNK) {
        if (!shouldAcceptCompletion(abortedTransferIdsRef.current, transferId)) return null;
        const slice = blob.slice(offset, offset + TEMP_FILE_WRITE_CHUNK);
        const uint8 = new Uint8Array(await slice.arrayBuffer());
        const appended = await clipboardApi.appendTempFile(begin.filePath, uint8);
        if (!appended?.success) return null;
      }
      return begin.filePath;
    }
    if (!clipboardApi.saveTempFile) return null;
    const arrayBuffer = await blob.arrayBuffer();
    const res = await clipboardApi.saveTempFile(fileName, new Uint8Array(arrayBuffer));
    return res?.success ? res.filePath : null;
  };

  const startDownloadById = async (pendingId) => {
    const entry = activeTransfersRef.current[pendingId];
    const provider = fileTransferProviderRef.current;
    if (!entry || entry.status !== 'pending' || !entry.fileInfo || !provider) return;
    let transferId = null;
    try {
      const handle = provider.downloadFile(entry.fileInfo, entry.fileIndex);
      transferId = handle?.transferId;
      if (transferId == null || !shouldAcceptCompletion(abortedTransferIdsRef.current, transferId)) return;
      isFileTransferArmedRef.current = true;
      setActiveTransfers((prev) => activatePendingDownload(prev, pendingId, transferId));
      if (window.electron?.clipboard?.beginTempFile && typeof provider.attachStreamTarget === 'function') {
        const begin = await window.electron.clipboard.beginTempFile(entry.fileInfo.name);
        if (!begin?.success || !begin.filePath) {
          abortProviderDownload(provider, transferId);
          throw new Error(begin?.error || 'No se pudo crear el fichero temporal');
        }
        provider.attachStreamTarget(transferId, begin.filePath);
      }
      const result = await handle.completion;
      if (!shouldAcceptCompletion(abortedTransferIdsRef.current, transferId)) return;
      let filePath = result?.streamed ? result.filePath : null;
      if (!filePath && result && typeof result.arrayBuffer === 'function') {
        filePath = await saveBlobToTempFile(entry.fileInfo.name, result, transferId);
      }
      if (filePath) {
        downloadedPathsRef.current = [...downloadedPathsRef.current, filePath];
      }
      if (!shouldAcceptCompletion(abortedTransferIdsRef.current, transferId)) return;
      const copiedPaths = downloadedPathsRef.current;
      await finishDownloadedFiles(
        copiedPaths,
        copiedPaths.length > 1
          ? [`${copiedPaths.length} archivos`]
          : [entry.name || entry.fileInfo.name]
      );
      setActiveTransfers((prev) => syncTransfersAndArm(removeTransfer(prev, transferId)));
    } catch (dlErr) {
      if (transferId != null && !shouldAcceptCompletion(abortedTransferIdsRef.current, transferId)) return;
      console.warn('[IronRDP FileTransfer] Error descargando archivo:', dlErr);
      if (transferId != null) {
        markTransferStatus(transferId, 'error', { name: entry.name, type: 'download' });
      }
    }
  };

  const startAllPendingDownloads = async () => {
    const ids = listPendingDownloadIds(activeTransfersRef.current);
    for (const id of ids) {
      await startDownloadById(id);
    }
  };

  const cancelTransferById = (id) => {
    if (id == null) return;
    const entry = getTransferEntry(activeTransfersRef.current, id);
    const wasStarted = !!(entry && (entry.status === 'active' || entry.status === 'pasting' || !entry.status));
    const provider = fileTransferProviderRef.current;
    const streamPath = provider?.__nodetermStreamTargets
      && (provider.__nodetermStreamTargets.get(id)
        || provider.__nodetermStreamTargets.get(Number(id))
        || provider.__nodetermStreamTargets.get(String(id)));
    abortProviderDownload(provider, id);
    if (streamPath && window.electron?.clipboard?.deleteTempFile) {
      void window.electron.clipboard.deleteTempFile(streamPath);
    }
    setActiveTransfers((prev) => {
      const next = cancelTransferEntry(prev, id, abortedTransferIdsRef.current);
      return syncTransfersAndArm(next);
    });
    if (wasStarted) {
      toastRef.current?.show({
        severity: 'info',
        summary: 'Transferencia cancelada',
        detail: 'Se detuvo la peticion de datos al remoto.',
        life: 2500
      });
    }
  };

  const discardAllPendingDownloads = () => {
    setActiveTransfers((prev) => syncTransfersAndArm(discardPendingDownloads(prev)));
  };

  const isDriveEnabled = rdpConfig.enableDrive !== false && (rdpConfig.guacEnableDrive !== false || rdpConfig.redirectFolders !== false || rdpConfig.enableDrive === true);
  const isPrinterEnabled = rdpConfig.redirectPrinters === true;
  const isFullscreen = rdpConfig.fullscreen === true || rdpConfig.resolution === 'fullscreen';

  const alignDesktop = (n) => {
    const base = Math.max(1, Math.floor(n));
    return (base + 3) & ~3;
  };

  const clearResizeAckTimer = () => {
    if (resizeAckTimerRef.current) {
      clearTimeout(resizeAckTimerRef.current);
      resizeAckTimerRef.current = null;
    }
  };

  const readResizeSettingMs = (key, fallback, min) => {
    try {
      return Math.max(min, parseInt(localStorage.getItem(key) || String(fallback), 10));
    } catch (_) {
      return fallback;
    }
  };

  const requestSessionResize = (width, height) => {
    if (!supportsDisplayControlRef.current) return false;
    if (!sessionRef.current?.resize) return false;
    if (width === currentDesktopSizeRef.current.width && height === currentDesktopSizeRef.current.height) {
      return false;
    }
    if (width === lastRequestedDesktopRef.current.width && height === lastRequestedDesktopRef.current.height) {
      return false;
    }
    lastRequestedDesktopRef.current = { width, height };
    try {
      sessionRef.current.resize(width, height);
    } catch (resizeErr) {
      console.warn('[IronRDP] Error solicitando resize a la sesion:', resizeErr);
      return false;
    }
    clearResizeAckTimer();
    const ackTimeoutMs = readResizeSettingMs('rdp_resize_ack_timeout_ms', 1500, 600);
    resizeAckTimerRef.current = setTimeout(() => {
      resizeAckTimerRef.current = null;
    }, ackTimeoutMs);
    return true;
  };

  const refreshLocalClipboardCache = async () => {
    const text = await readLocalClipboardText();
    localClipboardCacheRef.current = typeof text === 'string' ? text : '';
    return localClipboardCacheRef.current;
  };

  // Serializa los envíos CLIPRDR. Dos Format List solapadas (foco de ventana, pegado y
  // petición de IronRDP pueden coincidir) hacen que Wallix aborte la sesión por orden de PDUs.
  // Si la sesión aún no está asignada, el envío queda pendiente y se vacía al conectar.
  const enqueueClipboardSend = (text, reason) => {
    const payload = typeof text === 'string' ? text : '';
    // Evitar reenvíos redundantes en foco de ventana si el texto no ha cambiado o está vacío
    const isRedundantFocus = reason === 'foco de ventana' && (
      payload === lastSentClipboardTextRef.current ||
      (!payload && !lastSentClipboardTextRef.current)
    );
    if (isRedundantFocus) {
      return clipboardChainRef.current;
    }

    const deliver = async () => {
      const session = sessionRef.current;
      if (!session) {
        pendingClipboardSendRef.current = { text: payload, reason };
        recordClipboardAction(`Format List pendiente (${reason})`, `${payload.length} chars`);
        return;
      }
      try {
        await sendClipboardToSession(session, payload);
        lastSentClipboardTextRef.current = payload;
        recordClipboardAction(`Format List enviada (${reason})`, `${payload.length} chars`);
        if (isRdpDebugEnabled() || (payload.length > 0 && reason !== 'handshake' && reason !== 'foco de ventana')) {
          console.log(`📋 [IronRDP Clipboard] Format List enviada (${reason}, ${payload.length} chars)`);
        }
      } catch (err) {
        recordClipboardAction(`Error enviando Format List (${reason})`, err?.message || String(err));
        console.warn(`⚠️ [IronRDP Clipboard] Error enviando Format List (${reason}):`, err);
        markClipboardUnhealthy(err?.message || String(err) || 'format_list');
      }
    };
    clipboardChainRef.current = clipboardChainRef.current.then(deliver, deliver);
    return clipboardChainRef.current;
  };

  const flushPendingClipboardSend = () => {
    const pending = pendingClipboardSendRef.current;
    if (!pending) return;
    pendingClipboardSendRef.current = null;
    enqueueClipboardSend(pending.text, `${pending.reason}-diferido`);
  };

  const calculateInitialDimensions = () => {
    if (isFullscreen || (rdpConfig.autoResize !== false)) {
      const rect = containerRef.current?.getBoundingClientRect();
      const w = (rect && rect.width > 100) ? rect.width : (window.innerWidth || 1600);
      const h = (rect && rect.height > 100) ? rect.height : (window.innerHeight || 1000);
      return {
        width: alignDesktop(Math.max(640, Math.floor(w))),
        height: alignDesktop(Math.max(480, Math.floor(h)))
      };
    }

    const parsed = parseResolutionValue(rdpConfig.resolution);
    if (parsed) {
      return {
        width: alignDesktop(parsed.width),
        height: alignDesktop(parsed.height)
      };
    }
    if (rdpConfig.width && rdpConfig.height) {
      return {
        width: alignDesktop(parseInt(rdpConfig.width, 10)),
        height: alignDesktop(parseInt(rdpConfig.height, 10))
      };
    }
    return {
      width: 1600,
      height: 1000
    };
  };

  const [desktopDimensions, setDesktopDimensions] = useState(() => calculateInitialDimensions());

  // Métodos expuestos al componente padre
  useImperativeHandle(ref, () => ({
    fit: () => {
      setIsAutoResize(true);
      if (canvasRef.current) {
        canvasRef.current.focus();
      }
    },
    focus: () => {
      canvasRef.current?.focus();
    },
    disconnect: () => {
      notifyUserClose();
      try {
        sessionRef.current?.shutdown();
      } catch (_) {}
    },
    reconnect: () => {
      handleReconnect();
    }
  }));

  const handleReconnect = () => {
    if (sessionRef.current) {
      notifyUserClose();
      try { sessionRef.current.shutdown(); } catch (_) {}
      sessionRef.current = null;
    }
    if (fileTransferProviderRef.current) {
      try { fileTransferProviderRef.current.dispose(); } catch (_) {}
      fileTransferProviderRef.current = null;
    }
    if (canvasRef.current) {
      try {
        const ctx = getOptimized2dContext(canvasRef.current);
        if (ctx) {
          ctx.fillStyle = '#141821';
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      } catch (_) {}
    }
    hasEverConnectedRef.current = false;
    lastBackendReasonRef.current = null;
    clipboardFailedRef.current = false;
    clipboardUnhealthyToastShownRef.current = false;
    userClosingRef.current = false;
    clearTransferDismissTimers();
    uploadFailedIdsRef.current.clear();
    abortedTransferIdsRef.current.clear();
    downloadedPathsRef.current = [];
    isFileTransferArmedRef.current = false;
    setActiveTransfers({});
    setDisconnectDetails(null);
    setErrorMessage('');
    setReconnectTrigger(prev => prev + 1);
  };

  const handleCloseTab = () => {
    if (sessionRef.current) {
      notifyUserClose();
      try { sessionRef.current.shutdown(); } catch (_) {}
      sessionRef.current = null;
    }
    if (fileTransferProviderRef.current) {
      try { fileTransferProviderRef.current.dispose(); } catch (_) {}
      fileTransferProviderRef.current = null;
    }
    if (typeof onClose === 'function') {
      onClose();
      return;
    }
    window.dispatchEvent(new CustomEvent('close-tab', {
      detail: { tabKey: tabId }
    }));
  };

  // Escuchar evento de desconexión y telemetría de canales enviados por el bridge de Node.js
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return;

    const handleSessionClosed = (payload) => {
      const data = payload && typeof payload === 'object' ? payload : null;
      if (data && data.tokenId && data.tokenId === currentTokenIdRef.current) {
        lastBackendReasonRef.current = data.reason;
        const clipFailed = data.clipboardFailed === true || clipboardFailedRef.current;

        if (clipFailed) {
          console.warn('📡 [IronRDP Tab] Fallo de clipboard al cerrar:', data.reason);
          dumpBridgeTraces('Trazas del bridge previas al corte de conexion:');
          dumpClipboardHistory('Historial de portapapeles previo al corte:');
        } else if (isRdpDebugEnabled()) {
          console.log('📡 [IronRDP Tab] Recibido rdp:native-session-closed del bridge:', data.reason);
          dumpBridgeTraces('Trazas del bridge previas al corte de conexion:');
          dumpClipboardHistory('Historial de portapapeles previo al corte:');
        }

        // Si la sesión WASM aún no terminó de procesar el cierre del socket, ordenar shutdown
        if (sessionRef.current) {
          try { sessionRef.current.shutdown(); } catch (_) {}
        }
      }
    };

    const handleDiagnosticLog = (payload) => {
      const data = payload && typeof payload === 'object' ? payload : null;
      if (data && data.message) {
        const ts = new Date().toISOString().slice(11, 19);
        const entry = `[${ts}] [${data.category || 'general'}] ${data.message}`;
        bridgeTraceBufferRef.current.push(entry);
        if (bridgeTraceBufferRef.current.length > 40) {
          bridgeTraceBufferRef.current.shift();
        }
        if (isRdpDebugEnabled()) {
          console.log(`🔬 [RDP Bridge Trace] ${data.message}`);
        }
      }
    };

    const handleClipboardUnhealthy = (payload) => {
      const data = payload && typeof payload === 'object' ? payload : null;
      if (!data || data.tokenId !== currentTokenIdRef.current) return;
      markClipboardUnhealthy(data.reason || 'unknown');
    };

    window.electron.ipcRenderer.on('rdp:native-session-closed', handleSessionClosed);
    window.electron.ipcRenderer.on('rdp:diagnostic-log', handleDiagnosticLog);
    window.electron.ipcRenderer.on('rdp:clipboard-unhealthy', handleClipboardUnhealthy);
    return () => {
      window.electron.ipcRenderer.removeListener('rdp:native-session-closed', handleSessionClosed);
      window.electron.ipcRenderer.removeListener('rdp:diagnostic-log', handleDiagnosticLog);
      window.electron.ipcRenderer.removeListener('rdp:clipboard-unhealthy', handleClipboardUnhealthy);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let aborted = false;
    let currentSession = null;
    let currentFileTransferProvider = null;
    let disposeCanvasProbe = null;

    const isAborted = () => aborted || !isMounted;

    const abandonSession = (session) => {
      if (!session) return;
      try { session.shutdown(); } catch (_) {}
      if (sessionRef.current === session) {
        sessionRef.current = null;
      }
    };

    const clearCanvasScreen = () => {
      if (canvasRef.current) {
        try {
          const ctx = getOptimized2dContext(canvasRef.current);
          if (ctx) {
            ctx.fillStyle = '#141821';
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        } catch (_) {}
      }
    };

    const handleSessionEnded = (rawReason, err) => {
      if (!isMounted) return;
      clearCanvasScreen();

      const wasConnected = hasEverConnectedRef.current;
      const backendReason = lastBackendReasonRef.current;
      const details = mapTerminationReason(rawReason, backendReason, wasConnected, err);

      details.rawReason = rawReason || (err ? extractErrorMessage(err) : (backendReason || 'Desconexión normal'));
      details.timestamp = new Date().toLocaleTimeString();

      abortedTransferIdsRef.current.clear();
      downloadedPathsRef.current = [];
      setActiveTransfers({});
      disarmFileTransfer();

      setDisconnectDetails(details);
      if (wasConnected || details.category !== 'CONNECT_ERROR') {
        setConnectionState('disconnected');
      } else {
        setConnectionState('error');
        setErrorMessage(details.description || details.rawReason);
      }
    };

    const startRdpSession = async () => {
      try {
        userClosingRef.current = false;
        setConnectionState('connecting');
        setErrorMessage('');
        setDisconnectDetails(null);

        if (!window.electron || !window.electron.ipcRenderer) {
          throw new Error('Electron IPC no está disponible');
        }

        // 1. Inicializar módulo WebAssembly de IronRDP con nivel warn para evitar ruido de consola
        await initIronRdp('warn');
        if (isAborted()) return;

        // 2. Obtener dimensiones calculadas según configuración (autoResize vs resolución fija)
        const dims = calculateInitialDimensions();
        const width = dims.width;
        const height = dims.height;

        currentDesktopSizeRef.current = { width, height };
        lastRequestedDesktopRef.current = { width, height };
        setDesktopDimensions({ width, height });

        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }

        const configPayload = {
          ...rdpConfig,
          width,
          height,
          // Activa logs verbose del bridge si el usuario puso debug en DevTools.
          // Las métricas [Bridge Perf] en bastión salen siempre en la consola del proceso main.
          rdpDebug: isRdpDebugEnabled()
        };

        // 3. Crear token y endpoint para el proxy nativo TCP-a-WebSocket en Node.js (Sin guacd/WSL/Docker)
        const tokenResponse = await window.electron.ipcRenderer.invoke('rdp:create-native-bridge-token', configPayload);

        if (!tokenResponse || !tokenResponse.success || !tokenResponse.wsUrl) {
          throw new Error(tokenResponse?.error || 'No se pudo inicializar el puente RDP nativo');
        }

        currentTokenIdRef.current = tokenResponse.tokenId;

        if (isAborted()) return;

        // 4. Construir la sesión de IronRDP WebAssembly
        let rawUser = (rdpConfig.useBastionWallix && rdpConfig.bastionUser)
          ? rdpConfig.bastionUser
          : (rdpConfig.username || rdpConfig.user || '');
        let usernameStr = String(rawUser || '').trim();
        let domainStr = String(rdpConfig.domain || rdpConfig.serverDomain || '').trim();
        const destinationStr = `${rdpConfig.hostname || rdpConfig.server}:${rdpConfig.port || 3389}`;

        // Formato usuario Wallix / Bastión PAM:
        // - Modo 2 (Cadena Wallix/CyberArk): si ya viene con cadena (ej: rt01119@default@Fortigate_JC:APP:rt01119)
        //   o si tiene targetServer especificado para construirla.
        // - Modo 1 (Conexión a bastión / pasarela PAM): marcado con useBastionWallix o campos de bastión.
        const isBastionChain = usernameStr.split('@').length >= 3 || usernameStr.includes('#') || (usernameStr.includes('@') && usernameStr.includes(':'));
        const isBastionSession = !!(
          rdpConfig.useBastionWallix ||
          rdpConfig.isBastion ||
          rdpConfig.bastionUser ||
          rdpConfig.bastionHost ||
          rdpConfig.targetServer ||
          rdpConfig.targetUser ||
          rdpConfig.wallixService ||
          isBastionChain
        );
        if (isBastionSession) {
          // Si tiene targetServer y el usuario aún no está formateado como cadena, construir la cadena Wallix
          if (!usernameStr.includes('@') && !usernameStr.includes(':')) {
            const tServer = rdpConfig.targetServer || rdpConfig.targetHost || '';
            const tUser = rdpConfig.targetUser || usernameStr;
            const wDomain = rdpConfig.wallixDomain || 'default';
            const wService = rdpConfig.wallixService || 'APP';
            if (tServer) {
              usernameStr = `${usernameStr}@${wDomain}@${tServer}:${wService}:${tUser}`;
            }
          }
          // En modo directo (sin tServer) o si ya es cadena completa, mantener usernameStr intacto
        } else if (!domainStr && usernameStr.includes('\\')) {
          const parts = usernameStr.split('\\');
          domainStr = parts[0];
          usernameStr = parts[1];
        } else if (usernameStr.includes('@')) {
          const emailParts = usernameStr.split('@');
          const emailPrefix = emailParts[0];
          const emailDomain = emailParts[1].toLowerCase();

          const isPublicMicrosoftEmail = ['outlook.', 'hotmail.', 'live.', 'msn.'].some(d => emailDomain.includes(d));

          if (isPublicMicrosoftEmail && !domainStr) {
            usernameStr = emailPrefix.substring(0, Math.min(5, emailPrefix.length));
          } else if (!domainStr) {
            domainStr = emailParts[1];
            usernameStr = emailPrefix;
          }
        }

        // CredSSP: security explicita, o con "any" el selectedProtocol del preflight X.224 (sin mirar hostname)
        const selectedProtocol = (typeof tokenResponse.selectedProtocol === 'number')
          ? tokenResponse.selectedProtocol
          : null;
        const useCredssp = resolveCredsspPolicy(rdpConfig.security, selectedProtocol);

        const passwordStr = String(rdpConfig.password || '');
        const proxyAddressStr = String(tokenResponse.wsUrl || '');
        const authTokenStr = String(tokenResponse.tokenId || '');

        const isClipboardEnabled = rdpConfig.redirectClipboard !== false;

        const builder = new Backend.SessionBuilder()
          .username(usernameStr)
          .password(passwordStr)
          .destination(destinationStr)
          .proxyAddress(proxyAddressStr)
          .authToken(authTokenStr)
          .desktopSize(new Backend.DesktopSize(width, height))
          .setCursorStyleCallback((cursorKind, cursorData, hotspotX, hotspotY) => {
            // Alineado con @devolutions/iron-remote-desktop: kinds default|hidden|url.
            // Dedupe + cache Image: al arrastrar ventanas el servidor reenvía el mismo
            // bitmap; evitar new Image()/style writes reduce jank.
            const hX = cursorKind === 'url' ? Math.round(hotspotX ?? 0) : 0;
            const hY = cursorKind === 'url' ? Math.round(hotspotY ?? 0) : 0;
            if (
              cursorKind === lastCursorKindRef.current &&
              (cursorKind !== 'url' || (
                hX === lastCursorHotspotRef.current.x &&
                hY === lastCursorHotspotRef.current.y &&
                cursorData === lastCursorDataUrlRef.current
              ))
            ) {
              return;
            }

            let cssStyle;
            switch (cursorKind) {
              case 'hidden':
              case 'none':
                cssStyle = 'none';
                break;
              case 'default':
                cssStyle = 'default';
                break;
              case 'url': {
                if (cursorData == null || hotspotX == null || hotspotY == null) {
                  console.error('[IronRDP] Parámetros de cursor custom inválidos.');
                  return;
                }
                if (cursorData !== lastCursorDataUrlRef.current) {
                  const image = cursorImageRef.current || (cursorImageRef.current = new Image());
                  image.src = cursorData;
                  lastCursorDataUrlRef.current = cursorData;
                }
                cssStyle = `url(${cursorData}) ${hX} ${hY}, default`;
                break;
              }
              default:
                console.error(`[IronRDP] Estilo de cursor no soportado: ${cursorKind}.`);
                return;
            }
            lastCursorKindRef.current = cursorKind;
            lastCursorHotspotRef.current = { x: hX, y: hY };
            if (cursorKind !== 'url') {
              lastCursorDataUrlRef.current = '';
            }
            lastCursorStyleRef.current = cssStyle;
            if (canvasRef.current) {
              canvasRef.current.style.cursor = cssStyle;
            }
          })
          .setCursorStyleCallbackContext({})
          .canvasResizedCallback((w, h) => {
            if (w && h) {
              console.log(`📐 [IronRDP WASM] Canvas redimensionado por servidor a ${w}x${h}`);
              clearResizeAckTimer();
              if (canvasRef.current) {
                canvasRef.current.width = w;
                canvasRef.current.height = h;
                canvasRef.current.style.cursor = lastCursorStyleRef.current;
              }
              currentDesktopSizeRef.current = { width: w, height: h };
              lastRequestedDesktopRef.current = { width: w, height: h };
              setDesktopDimensions({ width: w, height: h });
              updateCanvasRectRef.current?.();
            }
          })
          .extension(enableCredssp(useCredssp));

        // DisplayControl SOLO para conexiones directas Windows con NLA/CredSSP (HYBRID / HYBRID_EX).
        // En bastiones y proxies RDP (Wallix, CyberArk, etc.), que negocian SSL 0x01 o RDP 0x00
        // y tienen useCredssp=false, o cuando es una sesión de bastión explícita/PAM, DisplayControl
        // no se debe registrar en WASM para evitar que declare drdynvc y desestabilice el proxy.
        const isProxyOrBastionProtocol = selectedProtocol === 0x01 || selectedProtocol === 0x00;
        const supportsDisplayControl = !isBastionSession && useCredssp && !isProxyOrBastionProtocol;
        supportsDisplayControlRef.current = supportsDisplayControl;

        if (supportsDisplayControl) {
          builder.extension(displayControl(true));
        }

        // Registrar extensiones para transferencia de archivos / carpeta compartida (RdpFileTransferProvider)
        if (isDriveEnabled) {
          try {
            // onUploadStarted silencia el sync de texto para que no pise la Format List del fichero.
            // No usar onUploadFinished: en iron-remote-desktop-rdp 0.7.0 se dispara al initiate, no al terminar.
            currentFileTransferProvider = new RdpFileTransferProvider({
              chunkSize: CLIPRDR_DOWNLOAD_CHUNK,
              onUploadStarted: () => { isFileTransferArmedRef.current = true; }
            });
            installStreamingDownload(currentFileTransferProvider, {
              abortedIds: abortedTransferIdsRef.current,
              appendFile: (filePath, buffer) => {
                if (!window.electron?.clipboard?.appendTempFile) {
                  return Promise.resolve({ success: false, error: 'appendTempFile no disponible' });
                }
                return window.electron.clipboard.appendTempFile(filePath, buffer);
              }
            });
            fileTransferProviderRef.current = currentFileTransferProvider;
            for (const ext of currentFileTransferProvider.getBuilderExtensions()) {
              builder.extension(ext);
            }
            if (isRdpDebugEnabled()) {
              console.log('📁 [IronRDP FileTransfer] Extensiones de transferencia de archivos registradas');
            }
          } catch (ftpErr) {
            console.warn('[IronRDP FileTransfer] Error creando FileTransferProvider:', ftpErr);
          }
        }

        // Registrar extensión de Impresora Virtual PDF (Microsoft Print to PDF / PostScript)
        if (isPrinterEnabled) {
          try {
            const activePrintJobs = new Map();
            builder.extension(printerName('NodeTerm PDF Printer'));
            builder.extension(printerDriverName(PrinterDriverName.MicrosoftPrintToPdf));
            builder.extension(printerDeviceId(1));
            builder.extension(printJobStreamCallbacks({
              onJobStart: (fileId) => {
                console.log(`🖨️ [IronRDP Printer] Inicio de trabajo de impresión #${fileId}`);
                activePrintJobs.set(fileId, []);
                toastRef.current?.show({
                  severity: 'info',
                  summary: 'Impresión en Curso',
                  detail: 'Recibiendo documento del servidor RDP...',
                  life: 3000
                });
              },
              onJobData: (fileId, chunk) => {
                const chunks = activePrintJobs.get(fileId) || [];
                chunks.push(chunk);
                activePrintJobs.set(fileId, chunks);
              },
              onJobComplete: async (fileId) => {
                console.log(`🖨️ [IronRDP Printer] Trabajo de impresión completado #${fileId}`);
                const chunks = activePrintJobs.get(fileId) || [];
                activePrintJobs.delete(fileId);

                if (!chunks.length) return;

                const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
                const combined = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of chunks) {
                  combined.set(chunk, offset);
                  offset += chunk.length;
                }

                const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `nodeterm-print-${dateStr}.pdf`;

                if (window.electron?.ipcRenderer) {
                  const res = await window.electron.ipcRenderer.invoke('rdp:save-print-pdf', {
                    filename,
                    data: combined
                  });

                  if (res?.success) {
                    toastRef.current?.show({
                      severity: 'success',
                      summary: 'Documento Impreso Recibido',
                      detail: `Guardado en Descargas: ${res.filename}`,
                      life: 5000
                    });
                  }
                }
              },
              onJobError: (fileId) => {
                console.warn(`⚠️ [IronRDP Printer] Error en trabajo de impresión #${fileId}`);
                activePrintJobs.delete(fileId);
                toastRef.current?.show({
                  severity: 'warn',
                  summary: 'Error de Impresión',
                  detail: `Fallo al recibir documento #${fileId}`,
                  life: 4000
                });
              }
            }));
            if (isRdpDebugEnabled()) {
              console.log('🖨️ [IronRDP Printer] Extensiones de Impresora Virtual PDF registradas');
            }
          } catch (printerErr) {
            console.warn('[IronRDP Printer] Error registrando extensión de impresora:', printerErr);
          }
        }

        // Configurar sincronización del portapapeles nativo (CLIPRDR)
        if (isClipboardEnabled) {
          // Remoto -> Local: cuando se copia o corta texto en el servidor RDP, escribir en portapapeles del cliente
          builder.remoteClipboardChangedCallback(async (clipboardData) => {
            if (!clipboardData) return;
            const hasActiveTransfer = Object.values(activeTransfersRef.current || {}).some(
              (t) => t && (t.status === 'active' || t.status === 'pasting')
            );
            if (hasActiveTransfer) {
              recordClipboardAction('remoteClipboardChanged omitido: transferencia activa en curso');
              if (isRdpDebugEnabled()) {
                console.log('[IronRDP Clipboard] remoteClipboardChanged omitido: transferencia de archivos en curso');
              }
              return;
            }
            try {
              for (const item of clipboardData.items()) {
                const mime = typeof item.mimeType === 'function' ? item.mimeType() : (item.mimeType || '');
                const val = typeof item.value === 'function' ? item.value() : item.value;
                if (mime.startsWith('text/') || mime === 'text/plain' || !mime) {
                  const text = typeof val === 'string'
                    ? val
                    : (val instanceof Uint8Array ? new TextDecoder('utf-8').decode(val) : String(val || ''));
                  if (text) {
                    lastReceivedClipboardTextRef.current = text;
                    lastSentClipboardTextRef.current = text;
                    localClipboardCacheRef.current = text;
                    // El portapapeles remoto ahora contiene texto: descartar descargas pendientes obsoletas
                    setActiveTransfers((prev) => discardPendingDownloads(prev));
                    disarmFileTransfer();
                    recordClipboardAction('Copiado remoto recibido', `${text.length} chars`);
                    console.log(`📋 [IronRDP Clipboard] 📥 Copiado remoto recibido (${text.length} chars):`, text.slice(0, 80));
                    await writeLocalClipboardText(text);
                    toastRef.current?.show({
                      severity: 'success',
                      summary: 'Portapapeles Remoto',
                      detail: `Texto copiado al portapapeles: "${text.length > 50 ? text.slice(0, 50) + '...' : text}"`,
                      life: 2500
                    });
                  }
                  break;
                }
              }
            } catch (e) {
              recordClipboardAction('Error en remoteClipboardChangedCallback', e?.message || String(e));
              console.warn('⚠️ [IronRDP Clipboard] Error en remoteClipboardChangedCallback:', e);
              markClipboardUnhealthy(e?.message || String(e) || 'remote_clipboard');
            }
          });

          // Local -> Remoto: IronRDP reclama la Format List del cliente al recibir CB_MONITOR_READY.
          // Hay que contestar SIEMPRE y sin esperas asíncronas previas: la lectura del portapapeles
          // puede tardar decenas de ms y el CB_FORMAT_LIST del servidor llega inmediatamente después,
          // así que se responde desde la caché y el refresco se hace en segundo plano.
          builder.forceClipboardUpdateCallback(() => {
            if (isFileTransferArmedRef.current) {
              recordClipboardAction('forceClipboardUpdate omitido: transferencia en curso');
              if (isRdpDebugEnabled()) {
                console.log('📋 [IronRDP Clipboard] forceClipboardUpdate omitido: transferencia de archivos en curso');
              }
              return;
            }
            const cached = localClipboardCacheRef.current || '';
            recordClipboardAction('forceClipboardUpdate -> anunciando formatos', `${cached.length} chars`);
            if (isRdpDebugEnabled()) {
              console.log(`📋 [IronRDP Clipboard] 📤 forceClipboardUpdate -> anunciando formatos (${cached.length} chars)`);
            }
            enqueueClipboardSend(cached, 'handshake');
            refreshLocalClipboardCache().catch(() => {});
          });
        }

        if (domainStr) {
          builder.serverDomain(domainStr);
        }

        if (canvasRef.current) {
          getOptimized2dContext(canvasRef.current);
          if (isRdpDebugEnabled()) {
            if (disposeCanvasProbe) disposeCanvasProbe();
            disposeCanvasProbe = installCanvasDrawProbe(canvasRef.current);
          }
          lastCursorStyleRef.current = 'default';
          lastCursorKindRef.current = '';
          lastCursorHotspotRef.current = { x: 0, y: 0 };
          lastCursorDataUrlRef.current = '';
          canvasRef.current.style.cursor = 'default';
          builder.renderCanvas(canvasRef.current);
        }

        // Precargar el portapapeles local antes de conectar: el saludo CLIPRDR debe responderse
        // sin latencia, antes de que el servidor envíe su propio CB_FORMAT_LIST.
        if (isClipboardEnabled) {
          await refreshLocalClipboardCache().catch(() => {});
        }
        if (isAborted()) return;

        console.log(`🚀 [IronRDP WASM] Conectando a ${destinationStr} (protocolo=${tokenResponse.protocolLabel || 'auto'}, credssp=${useCredssp}, clipboard=${isClipboardEnabled}, drive=${isDriveEnabled})...`);
        
        currentSession = await builder.connect();
        if (isAborted()) {
          abandonSession(currentSession);
          currentSession = null;
          return;
        }
        sessionRef.current = currentSession;
        flushPendingClipboardSend();
        console.log('✅ [IronRDP WASM] Sesión RDP conectada');

        // Inicializar FileTransferProvider con la sesión activa
        if (currentFileTransferProvider) {
          try {
            currentFileTransferProvider.setSession(currentSession);

            currentFileTransferProvider.on('upload-batch-started', (transferIds, droppedFiles) => {
              isFileTransferArmedRef.current = true;
              seedUploadTransfers(transferIds, droppedFiles);
            });

            currentFileTransferProvider.on('upload-progress', (progress) => {
              if (!shouldAcceptCompletion(abortedTransferIdsRef.current, progress.transferId)) return;
              const reachedEnd = (progress.percentage || 0) >= 100;
              setActiveTransfers(prev => {
                const existing = prev[progress.transferId];
                if (existing?.status === 'complete' || existing?.status === 'error') {
                  return prev;
                }
                return {
                  ...prev,
                  [progress.transferId]: {
                    name: progress.fileName || existing?.name || 'Archivo',
                    type: 'upload',
                    percentage: progress.percentage || 0,
                    status: reachedEnd ? 'complete' : 'pasting'
                  }
                };
              });
              if (reachedEnd) {
                scheduleTransferDismiss(progress.transferId);
              }
            });

            currentFileTransferProvider.on('upload-complete', (file, fileIndex, transferId) => {
              if (!shouldAcceptCompletion(abortedTransferIdsRef.current, transferId)) return;
              console.log('[IronRDP FileTransfer] Pegado en el remoto:', file?.name);
              markTransferStatus(transferId, 'complete', {
                name: file?.name || 'Archivo',
                type: 'upload'
              });
            });

            currentFileTransferProvider.on('download-progress', (progress) => {
              setActiveTransfers(prev => applyDownloadProgress(prev, progress, abortedTransferIdsRef.current));
            });

            currentFileTransferProvider.on('download-complete', (fileInfo, blob, fileIndex, transferId) => {
              if (!shouldAcceptCompletion(abortedTransferIdsRef.current, transferId)) return;
              console.log('[IronRDP FileTransfer] Recepcion de buffer completada:', fileInfo?.name);
              setActiveTransfers(prev => syncTransfersAndArm(removeTransfer(prev, transferId)));
            });

            currentFileTransferProvider.on('files-available', (files) => {
              if (!files || !files.length) return;
              console.log('[IronRDP FileTransfer] Archivos remotos disponibles:', files);
              downloadedPathsRef.current = [];
              setActiveTransfers((prev) => {
                const next = seedPendingDownloads(prev, files);
                return syncTransfersAndArm(next);
              });
            });

            currentFileTransferProvider.on('error', (err) => {
              const transferId = err?.transferId;
              if (transferId != null && !shouldAcceptCompletion(abortedTransferIdsRef.current, transferId)) {
                return;
              }
              console.warn('[IronRDP FileTransfer] Error:', err);
              const fileName = err?.fileName || 'Archivo';
              const direction = err?.direction === 'download' ? 'download' : 'upload';
              if (transferId != null) {
                uploadFailedIdsRef.current.add(transferId);
                markTransferStatus(transferId, 'error', { name: fileName, type: direction });
              }
              toastRef.current?.show({
                severity: 'warn',
                summary: 'Error de transferencia',
                detail: err?.fileName ? `${err.fileName}: ${err.message || 'fallo'}` : (err?.message || String(err || 'Error')),
                life: 5000
              });
            });
          } catch (ftpInitErr) {
            console.warn('[IronRDP FileTransfer] Error asociando sesión:', ftpInitErr);
          }
        }

        if (isMounted) {
          hasEverConnectedRef.current = true;
          setConnectionState('connected');
          setTimeout(() => {
            canvasRef.current?.focus();
          }, 100);
        }

        // Ejecutar sesión RDP
        currentSession.run().then((terminationInfo) => {
          if (aborted) {
            console.log('ℹ️ [IronRDP WASM] Sesion abortada');
            return;
          }
          const rawReason = typeof terminationInfo?.reason === 'function'
            ? terminationInfo.reason()
            : String(terminationInfo || '');
          const isNormalEnd = !rawReason || rawReason.includes('usuario') || rawReason.includes('user') || rawReason.includes('0');
          const clipFailed = clipboardFailedRef.current;
          if (isNormalEnd && !clipFailed) {
            console.log('ℹ️ [IronRDP WASM] Sesion terminada:', rawReason);
          } else if (clipFailed || isRdpDebugEnabled()) {
            console.warn('⚠️ [IronRDP WASM] Sesion terminada:', rawReason);
            dumpBridgeTraces('Trazas del bridge previas al fin de sesion:');
            dumpClipboardHistory('Historial de portapapeles previo al fin de sesion:');
          } else {
            console.log('ℹ️ [IronRDP WASM] Sesion terminada:', rawReason);
          }
          handleSessionEnded(rawReason, null);
        }).catch((err) => {
          const detail = extractErrorMessage(err);
          if (aborted) {
            console.log('ℹ️ [IronRDP WASM] Sesion abortada:', detail);
            return;
          }
          if (userClosingRef.current) {
            console.log('ℹ️ [IronRDP WASM] Sesion cerrada por el usuario:', detail);
            handleSessionEnded('user initiated disconnect', null);
            return;
          }
          console.error('❌ [IronRDP WASM] Error en ejecucion de sesion:', detail, err);
          if (clipboardFailedRef.current || isRdpDebugEnabled()) {
            dumpBridgeTraces('Trazas del bridge previas al error de sesion:');
            dumpClipboardHistory('Historial de portapapeles previo al error de sesion:');
          }
          handleSessionEnded(null, err);
        });

      } catch (err) {
        if (aborted) {
          abandonSession(currentSession);
          currentSession = null;
          return;
        }
        const detail = extractErrorMessage(err);
        console.error('❌ [IronRDP WASM] Error conectando:', detail, err);
        if (clipboardFailedRef.current || isRdpDebugEnabled()) {
          dumpBridgeTraces('Trazas del bridge previas al error de conexion:');
          dumpClipboardHistory('Historial de portapapeles previo al error de conexion:');
        }
        handleSessionEnded(null, err);
      }
    };

    startRdpSession();

    return () => {
      aborted = true;
      isMounted = false;
      if (disposeCanvasProbe) {
        try { disposeCanvasProbe(); } catch (_) {}
        disposeCanvasProbe = null;
      }
      if (currentFileTransferProvider) {
        try { currentFileTransferProvider.dispose(); } catch (_) {}
      }
      fileTransferProviderRef.current = null;
      if (currentSession) {
        notifyUserClose();
        try { currentSession.shutdown(); } catch (e) {}
      }
      sessionRef.current = null;
      clearTransferDismissTimers();
      uploadFailedIdsRef.current.clear();
      abortedTransferIdsRef.current.clear();
      downloadedPathsRef.current = [];
      isFileTransferArmedRef.current = false;
      pendingClipboardSendRef.current = null;
    };
    // tabId + reconnectTrigger: no reciclar WASM si el padre cambia la referencia de rdpConfig
  }, [tabId, reconnectTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manejo de enfoque dinámico del canvas al activar pestaña
  useEffect(() => {
    if (connectionState === 'connected' && isActive && canvasRef.current) {
      canvasRef.current.focus();
    }
  }, [connectionState, isActive]);

  // Sincronización controlada por interacción del portapapeles Local -> Remoto
  useEffect(() => {
    if (connectionState !== 'connected' || !sessionRef.current || !isActive) return;
    const isClipboardEnabled = rdpConfig.redirectClipboard !== false;
    if (!isClipboardEnabled) return;

    let isDisposed = false;
    const connectedAt = Date.now();

    // Registrar portapapeles local inicial en lastReceivedClipboardTextRef sin marcar lastSentClipboardTextRef
    // para permitir que el foco posterior (tras el período de gracia) o el primer pegado sincronicen
    // limpiamente el portapapeles inicial hacia la máquina remota
    refreshLocalClipboardCache().then((text) => {
      if (!isDisposed && text) {
        lastReceivedClipboardTextRef.current = text;
      }
    }).catch(() => {});

    const syncLocalClipboardToRemote = async () => {
      if (isDisposed || !sessionRef.current || isFileTransferArmedRef.current) return;
      // Período de gracia mínimo de 3 segundos antes de permitir sincronizaciones reactivas por foco (protege Wallix handshake)
      if (Date.now() - connectedAt < 3000) return;
      try {
        const text = await refreshLocalClipboardCache();
        if (
          text &&
          text !== lastSentClipboardTextRef.current &&
          !isFileTransferArmedRef.current
        ) {
          enqueueClipboardSend(text, 'foco de ventana');
        }
      } catch (_) {}
    };

    const handleWindowFocus = () => {
      syncLocalClipboardToRemote();
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isDisposed = true;
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [connectionState, isActive, rdpConfig.redirectClipboard]);

  // Manejo de eventos de entrada (Ratón y Teclado) para IronRDP WASM con soporte multiplataforma nativo
  useEffect(() => {
    if (connectionState !== 'connected' || !canvasRef.current) return;
    const canvas = canvasRef.current;

    // Detección de plataforma cliente (macOS vs Windows/Linux)
    const isMac = (window.electron?.platform === 'darwin') ||
      (typeof navigator !== 'undefined' && (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent)));

    // Mapa exhaustivo de scancodes PS/2 Set 1 para RDP nativo
    const CODE_TO_SCANCODE = {
      KeyA: 0x1E, KeyB: 0x30, KeyC: 0x2E, KeyD: 0x20, KeyE: 0x12, KeyF: 0x21, KeyG: 0x22, KeyH: 0x23,
      KeyI: 0x17, KeyJ: 0x24, KeyK: 0x25, KeyL: 0x26, KeyM: 0x32, KeyN: 0x31, KeyO: 0x18, KeyP: 0x19,
      KeyQ: 0x10, KeyR: 0x13, KeyS: 0x1F, KeyT: 0x14, KeyU: 0x16, KeyV: 0x2F, KeyW: 0x11, KeyX: 0x2D,
      KeyY: 0x15, KeyZ: 0x2C, Digit1: 0x02, Digit2: 0x03, Digit3: 0x04, Digit4: 0x05, Digit5: 0x06,
      Digit6: 0x07, Digit7: 0x08, Digit8: 0x09, Digit9: 0x0A, Digit0: 0x0B, Enter: 0x1C, Escape: 0x01,
      Backspace: 0x0E, Tab: 0x0F, Space: 0x39, Minus: 0x0C, Equal: 0x0D, BracketLeft: 0x1A,
      BracketRight: 0x1B, Backslash: 0x2B, Semicolon: 0x27, Quote: 0x28, Backquote: 0x29, Comma: 0x33,
      Period: 0x34, Slash: 0x35, ControlLeft: 0x1D, ControlRight: 0xE01D, AltLeft: 0x38, AltRight: 0xE038,
      ShiftLeft: 0x2A, ShiftRight: 0x36, ArrowUp: 0xE048, ArrowDown: 0xE050, ArrowLeft: 0xE04B,
      ArrowRight: 0xE04D, Delete: 0xE053, Home: 0xE047, End: 0xE04F, PageUp: 0xE049, PageDown: 0xE051,
      Insert: 0xE052, CapsLock: 0x3A, F1: 0x3B, F2: 0x3C, F3: 0x3D, F4: 0x3E, F5: 0x3F, F6: 0x40,
      F7: 0x41, F8: 0x42, F9: 0x43, F10: 0x44, F11: 0x57, F12: 0x58,
      // Modificadores de sistema: en macOS, Cmd se traduce ergonómicamente a Ctrl para atajos remotos
      MetaLeft: isMac ? 0x1D : 0xE05B,
      MetaRight: isMac ? 0xE01D : 0xE05C,
      ContextMenu: 0xE05D,
      PrintScreen: 0xE037,
      ScrollLock: 0x46,
      NumLock: 0x45,
      Pause: 0xE11D,
      // Teclado numérico completo (Numpad)
      Numpad0: 0x52, Numpad1: 0x4F, Numpad2: 0x50, Numpad3: 0x51, Numpad4: 0x4B,
      Numpad5: 0x4C, Numpad6: 0x4D, Numpad7: 0x47, Numpad8: 0x48, Numpad9: 0x49,
      NumpadDecimal: 0x53, NumpadDivide: 0xE035, NumpadMultiply: 0x37, NumpadSubtract: 0x4A,
      NumpadAdd: 0x4E, NumpadEnter: 0xE01C, NumpadEqual: 0x59,
      // Teclados internacionales / ISO (Español, Europeo, ABNT, JIS)
      IntlBackslash: 0x56, IntlRo: 0x73, IntlYen: 0x7D
    };

    let cachedRect = null;
    let cachedScaleX = 1;
    let cachedScaleY = 1;

    const updateCanvasRect = () => {
      if (!canvas) return;
      cachedRect = canvas.getBoundingClientRect();
      cachedScaleX = cachedRect.width > 0 ? canvas.width / cachedRect.width : 1;
      cachedScaleY = cachedRect.height > 0 ? canvas.height / cachedRect.height : 1;
    };

    updateCanvasRectRef.current = updateCanvasRect;
    updateCanvasRect();

    const getCanvasPos = (e) => {
      if (!cachedRect) updateCanvasRect();
      const rawX = Math.floor((e.clientX - cachedRect.left) * cachedScaleX);
      const rawY = Math.floor((e.clientY - cachedRect.top) * cachedScaleY);
      return {
        x: Math.max(0, Math.min(canvas.width - 1, rawX)),
        y: Math.max(0, Math.min(canvas.height - 1, rawY))
      };
    };

    let pendingMousePos = null;
    let mouseThrottleTimer = null;
    let lastSentMoveTime = 0;
    const MOUSE_THROTTLE_MS = 10; // 100 Hz: cursor ultra-reactivo en movimiento libre
    const DRAG_THROTTLE_MS = 10;  // 100 Hz: movimiento de ventanas ultra-fluido e instantáneo

    let isMouseDown = false;
    let mouseDownPos = null;
    let hasDragged = false;
    const DRAG_THRESHOLD_PX = 4; // Umbral estándar de Windows (SM_CXDRAG) para proteger el click

    const sendMouseMove = (x, y) => {
      if (!sessionRef.current) return;
      lastSentMoveTime = performance.now();
      try {
        const transaction = new Backend.InputTransaction();
        transaction.addEvent(Backend.DeviceEvent.mouseMove(x, y));
        sessionRef.current.applyInputs(transaction);
      } catch (_) {}
    };

    const handleMouseMove = (e) => {
      if (!sessionRef.current) return;
      const { x, y } = getCanvasPos(e);

      // Si el botón está presionado pero no se ha iniciado un arrastre intencionado,
      // filtramos el micro-temblor de la mano (< 4px) para que Windows no cancele el click.
      if (isMouseDown && !hasDragged && mouseDownPos) {
        const dx = Math.abs(x - mouseDownPos.x);
        const dy = Math.abs(y - mouseDownPos.y);
        if (dx < DRAG_THRESHOLD_PX && dy < DRAG_THRESHOLD_PX) {
          return;
        }
        hasDragged = true;
      }

      const now = performance.now();
      const elapsed = now - lastSentMoveTime;
      const throttleLimit = isMouseDown ? DRAG_THROTTLE_MS : MOUSE_THROTTLE_MS;

      if (elapsed >= throttleLimit) {
        if (mouseThrottleTimer != null) {
          clearTimeout(mouseThrottleTimer);
          mouseThrottleTimer = null;
        }
        pendingMousePos = null;
        sendMouseMove(x, y);
      } else {
        pendingMousePos = { x, y };
        if (mouseThrottleTimer == null) {
          mouseThrottleTimer = setTimeout(() => {
            mouseThrottleTimer = null;
            if (pendingMousePos) {
              const pos = pendingMousePos;
              pendingMousePos = null;
              sendMouseMove(pos.x, pos.y);
            }
          }, throttleLimit - elapsed);
        }
      }
    };

    const handleMouseDown = (e) => {
      if (!sessionRef.current) return;
      canvas.focus();
      e.preventDefault();

      // Cancelar cualquier movimiento pendiente para que no se intercale
      if (mouseThrottleTimer != null) {
        clearTimeout(mouseThrottleTimer);
        mouseThrottleTimer = null;
      }
      pendingMousePos = null;

      const { x, y } = getCanvasPos(e);
      const btn = e.button === 0 ? 0 : e.button === 2 ? 2 : 1;

      isMouseDown = true;
      mouseDownPos = { x, y };
      hasDragged = false;

      // Click atómico: posicionar el cursor y pulsar el botón en la misma transacción de red
      try {
        const transaction = new Backend.InputTransaction();
        transaction.addEvent(Backend.DeviceEvent.mouseMove(x, y));
        transaction.addEvent(Backend.DeviceEvent.mouseButtonPressed(btn));
        sessionRef.current.applyInputs(transaction);
      } catch (err) {}
    };

    const handleMouseUp = (e) => {
      if (!sessionRef.current || !isMouseDown) return;
      e.preventDefault();

      if (mouseThrottleTimer != null) {
        clearTimeout(mouseThrottleTimer);
        mouseThrottleTimer = null;
      }
      pendingMousePos = null;

      const { x, y } = getCanvasPos(e);
      const btn = e.button === 0 ? 0 : e.button === 2 ? 2 : 1;

      // Si no hubo arrastre intencionado, soltar exactamente en la posición del mouseDown
      // para asegurar que el servidor remoto registre el click limpiamente.
      const releaseX = (!hasDragged && mouseDownPos) ? mouseDownPos.x : x;
      const releaseY = (!hasDragged && mouseDownPos) ? mouseDownPos.y : y;

      isMouseDown = false;
      mouseDownPos = null;
      hasDragged = false;

      try {
        const transaction = new Backend.InputTransaction();
        transaction.addEvent(Backend.DeviceEvent.mouseMove(releaseX, releaseY));
        transaction.addEvent(Backend.DeviceEvent.mouseButtonReleased(btn));
        sessionRef.current.applyInputs(transaction);
      } catch (err) {}
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    const handleWheel = (e) => {
      if (!sessionRef.current) return;
      e.preventDefault();
      const isVertical = e.deltaY !== 0;
      const delta = isVertical ? -e.deltaY : -e.deltaX;
      // 0 = Pixel (trackpads macOS / touchpads de precisión), 1 = Line (ruedas de ratón estándar), 2 = Page
      const unit = e.deltaMode === 1 ? 1 : (e.deltaMode === 2 ? 2 : 0);
      try {
        const transaction = new Backend.InputTransaction();
        transaction.addEvent(Backend.DeviceEvent.wheelRotations(isVertical, delta, unit));
        sessionRef.current.applyInputs(transaction);
      } catch (err) {}
    };

    const handleKeyDown = (e) => {
      if (!sessionRef.current) return;

      e.preventDefault();

      // Sincronización proactiva de Ctrl+V / Cmd+V:
      // Como e.preventDefault() cancela el evento 'paste' nativo del navegador,
      // interceptamos la combinación aquí para actualizar el portapapeles local hacia la sesión.
      const isPasteCombo = (e.ctrlKey || (isMac && e.metaKey)) && (e.code === 'KeyV' || e.key === 'v' || e.key === 'V');
      if (isPasteCombo && rdpConfig.redirectClipboard !== false) {
        refreshLocalClipboardCache().then((text) => {
          if (text && sessionRef.current && !isFileTransferArmedRef.current) {
            lastReceivedClipboardTextRef.current = text;
            enqueueClipboardSend(text, 'atajo Ctrl+V');
          }
        }).catch(() => {});
      }

      const scancode = CODE_TO_SCANCODE[e.code];
      try {
        const transaction = new Backend.InputTransaction();
        if (scancode) {
          transaction.addEvent(Backend.DeviceEvent.keyPressed(scancode));
        } else if (e.key && e.key.length === 1) {
          transaction.addEvent(Backend.DeviceEvent.unicodePressed(e.key));
        }
        sessionRef.current.applyInputs(transaction);
      } catch (err) {
        console.warn('[IronRDP Keyboard] Error aplicando tecla:', err);
      }
    };

    const handleKeyUp = (e) => {
      if (!sessionRef.current) return;
      e.preventDefault();
      const scancode = CODE_TO_SCANCODE[e.code];
      try {
        const transaction = new Backend.InputTransaction();
        if (scancode) {
          transaction.addEvent(Backend.DeviceEvent.keyReleased(scancode));
        } else if (e.key && e.key.length === 1) {
          transaction.addEvent(Backend.DeviceEvent.unicodeReleased(e.key));
        }
        sessionRef.current.applyInputs(transaction);
      } catch (err) {
        console.warn('[IronRDP Keyboard] Error soltando tecla:', err);
      }
    };

    const handlePaste = async (e) => {
      const isClipboardEnabled = rdpConfig.redirectClipboard !== false;
      if (!isClipboardEnabled || !sessionRef.current || isFileTransferArmedRef.current) return;

      let text = e.clipboardData?.getData('text/plain') || '';
      if (!text) {
        text = await refreshLocalClipboardCache();
      } else {
        localClipboardCacheRef.current = text;
      }

      if (text && !isFileTransferArmedRef.current) {
        lastReceivedClipboardTextRef.current = text;
        enqueueClipboardSend(text, 'evento paste');
      }
    };

    window.addEventListener('resize', updateCanvasRect);
    canvas.addEventListener('mouseenter', updateCanvasRect, { passive: true });
    const containerEl = containerRef.current;
    if (containerEl) {
      containerEl.addEventListener('scroll', updateCanvasRect, { passive: true });
    }
    const rectResizeObserver = new ResizeObserver(() => {
      updateCanvasRect();
    });
    rectResizeObserver.observe(canvas);
    if (containerEl) {
      rectResizeObserver.observe(containerEl);
    }
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('paste', handlePaste);

    return () => {
      if (mouseThrottleTimer != null) {
        clearTimeout(mouseThrottleTimer);
        mouseThrottleTimer = null;
      }
      if (updateCanvasRectRef.current === updateCanvasRect) {
        updateCanvasRectRef.current = null;
      }
      rectResizeObserver.disconnect();
      window.removeEventListener('resize', updateCanvasRect);
      canvas.removeEventListener('mouseenter', updateCanvasRect);
      if (containerEl) {
        containerEl.removeEventListener('scroll', updateCanvasRect);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('paste', handlePaste);
    };
  }, [connectionState, rdpConfig.redirectClipboard]);

  // Cerrar menú de resolución al hacer clic fuera o pulsar Escape
  useEffect(() => {
    if (!showResolutionMenu) return;

    const handleClickOutside = (e) => {
      if (resolutionMenuRef.current && !resolutionMenuRef.current.contains(e.target)) {
        setShowResolutionMenu(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowResolutionMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showResolutionMenu]);

  // Auto: DisplayControl via session.resize. El CSS 100% cubre el hueco hasta el ACK.
  useEffect(() => {
    if (!containerRef.current || connectionState !== 'connected' || !isAutoResize) return;

    let resizeTimer = null;
    const debounceMs = readResizeSettingMs('rdp_resize_debounce_ms', 300, 100);
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!containerRef.current || !isAutoResize) return;
        const rect = containerRef.current.getBoundingClientRect();
        const width = alignDesktop(Math.max(640, rect.width || window.innerWidth));
        const height = alignDesktop(Math.max(480, rect.height || window.innerHeight));

        if (!supportsDisplayControlRef.current) {
          if (width === currentDesktopSizeRef.current.width && height === currentDesktopSizeRef.current.height) {
            return;
          }
          currentDesktopSizeRef.current = { width, height };
          // En bastiones (Wallix), el CSS del canvas (width: 100%, height: 100%) ya ajusta
          // perfectamente el escritorio al visor en tiempo real sin desestabilizar la sesión con DisplayControl.
          return;
        }

        requestSessionResize(width, height);
      }, debounceMs);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      clearResizeAckTimer();
      resizeObserver.disconnect();
    };
  }, [connectionState, isAutoResize]);

  // Selector interactivo de resolución instantánea
  const handleSelectResolution = (resKey) => {
    setShowResolutionMenu(false);

    if (resKey === 'auto') {
      setIsAutoResize(true);
      rdpConfig.resolution = 'auto';
      rdpConfig.autoResize = true;
      const nativeW = canvasRef.current?.width || currentDesktopSizeRef.current.width || 1600;
      const nativeH = canvasRef.current?.height || currentDesktopSizeRef.current.height || 1000;
      setDesktopDimensions({ width: nativeW, height: nativeH });

      if (supportsDisplayControlRef.current) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const width = alignDesktop(Math.max(640, rect.width || window.innerWidth));
          const height = alignDesktop(Math.max(480, rect.height || window.innerHeight));
          requestSessionResize(width, height);
        }
        console.log('[IronRDP] Cambiando a resolucion dinamica Auto (DisplayControl)');
      } else {
        console.log('📐 [IronRDP] Cambiando a resolución dinámica Auto (ajuste CSS)');
      }

      toastRef.current?.show({
        severity: 'info',
        summary: 'Ajuste Dinámico',
        detail: supportsDisplayControlRef.current
          ? 'Modo adaptativo activado (cambio de resolución al tamaño de ventana)'
          : 'Modo adaptativo activado (ajuste automático a ventana)',
        life: 2000
      });
    } else {
      setIsAutoResize(false);
      const parsed = parseResolutionValue(resKey);
      if (parsed) {
        const targetW = alignDesktop(parsed.width);
        const targetH = alignDesktop(parsed.height);
        console.log(`[IronRDP] Cambiando resolucion a ${targetW}x${targetH}`);
        setDesktopDimensions({ width: targetW, height: targetH });
        rdpConfig.resolution = resKey;
        rdpConfig.autoResize = false;
        if (supportsDisplayControlRef.current) {
          requestSessionResize(targetW, targetH);
        }

        toastRef.current?.show({
          severity: 'info',
          summary: 'Resolución Cambiada',
          detail: `Visualización configurada a ${targetW}x${targetH}`,
          life: 2000
        });
      }
    }
  };

  const handleSendCtrlAltDel = () => {
    if (sessionRef.current) {
      try {
        const transaction = new Backend.InputTransaction();
        transaction.addEvent(Backend.DeviceEvent.keyPressed(0x1D)); // Ctrl
        transaction.addEvent(Backend.DeviceEvent.keyPressed(0x38)); // Alt
        transaction.addEvent(Backend.DeviceEvent.keyPressed(0xE053)); // Delete estándar
        transaction.addEvent(Backend.DeviceEvent.keyReleased(0xE053));
        transaction.addEvent(Backend.DeviceEvent.keyReleased(0x38));
        transaction.addEvent(Backend.DeviceEvent.keyReleased(0x1D));
        sessionRef.current.applyInputs(transaction);
        toastRef.current?.show({
          severity: 'info',
          summary: 'Teclado Remoto',
          detail: 'Ctrl+Alt+Del enviado',
          life: 1500
        });
      } catch (e) {
        console.error('Error enviando Ctrl+Alt+Del:', e);
      }
    }
  };

  const handleSendWinKey = () => {
    if (sessionRef.current) {
      try {
        const transaction = new Backend.InputTransaction();
        transaction.addEvent(Backend.DeviceEvent.keyPressed(0xE05B)); // Tecla Windows izquierda extendida
        transaction.addEvent(Backend.DeviceEvent.keyReleased(0xE05B));
        sessionRef.current.applyInputs(transaction);
        toastRef.current?.show({
          severity: 'info',
          summary: 'Teclado Remoto',
          detail: 'Tecla Windows enviada',
          life: 1500
        });
      } catch (e) {
        console.error('Error enviando Tecla Windows:', e);
      }
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Transferencia segura de archivos con reintento automatico si el canal CLIPRDR esta negociando
  const uploadFilesSafely = async (provider, files) => {
    if (!provider || !files || !files.length) return;
    isFileTransferArmedRef.current = true;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const handle = provider.uploadFiles(files);
        if (handle?.transferIds) {
          seedUploadTransfers(handle.transferIds, files);
        }
        showUploadReadyToast(files.length);
        if (handle?.completion) {
          handle.completion.then(() => {
            if (handle.transferIds && typeof handle.transferIds.forEach === 'function') {
              handle.transferIds.forEach((transferId, fileIndex) => {
                if (uploadFailedIdsRef.current.has(transferId)) return;
                if (!shouldAcceptCompletion(abortedTransferIdsRef.current, transferId)) return;
                markTransferStatus(transferId, 'complete', {
                  name: fileTransferNameOf(files[fileIndex]),
                  type: 'upload'
                });
              });
            }
            disarmFileTransfer();
          }).catch((completionErr) => {
            const msg = completionErr?.message || String(completionErr || 'Error de transferencia');
            if (handle?.transferIds && typeof handle.transferIds.forEach === 'function') {
              handle.transferIds.forEach((transferId, fileIndex) => {
                markTransferStatus(transferId, 'error', {
                  name: fileTransferNameOf(files[fileIndex]),
                  type: 'upload'
                });
              });
            }
            toastRef.current?.show({
              severity: 'warn',
              summary: 'Error de transferencia',
              detail: msg,
              life: 5000
            });
            disarmFileTransfer();
          });
        }
        return handle;
      } catch (err) {
        const msg = err?.message || String(err || '');
        if ((msg.includes('Ready state') || msg.includes('not in Ready')) && attempt < 4) {
          console.warn(`[IronRDP FileTransfer] Canal CLIPRDR negociando... reintento ${attempt}/4 en 1000ms`);
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        const alreadyInProgress = msg.toLowerCase().includes('already in progress');
        if (!alreadyInProgress) {
          disarmFileTransfer();
        }
        toastRef.current?.show({
          severity: 'warn',
          summary: 'Transferencia no disponible',
          detail: alreadyInProgress
            ? 'Ya hay un archivo listo para pegar en el remoto. Pulsa Ctrl+V alli o espera a que termine.'
            : (msg.includes('Ready state') || msg.includes('not in Ready')
              ? 'El canal de portapapeles aun no ha sido inicializado por el servidor o bastion remoto.'
              : msg),
          life: 5000
        });
        return null;
      }
    }
    disarmFileTransfer();
    return null;
  };

  return (
    <div
      ref={containerRef}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isDriveEnabled) {
          setIsDraggingOver(true);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isDriveEnabled) {
          fileTransferProviderRef.current?.handleDragOver(e);
          setIsDraggingOver(true);
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (containerRef.current && !containerRef.current.contains(e.relatedTarget)) {
          setIsDraggingOver(false);
        }
      }}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        if (!isDriveEnabled || !fileTransferProviderRef.current) return;
        try {
          const dropped = await fileTransferProviderRef.current.handleDrop(e);
          if (dropped && dropped.length) {
            console.log('📤 [IronRDP FileTransfer] Subiendo archivos arrastrados:', dropped.length);
            await uploadFilesSafely(fileTransferProviderRef.current, dropped);
          }
        } catch (dropErr) {
          console.warn('[IronRDP FileTransfer] Error en drop:', dropErr);
        }
      }}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#141821',
        overflow: 'hidden'
      }}
    >
      <Toast ref={toastRef} position="bottom-left" />

      {/* Contenedor de visualización / scroll para el Canvas HTML5 */}
      <div
        onClick={() => canvasRef.current?.focus()}
        style={isAutoResize ? {
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        } : {
          width: '100%',
          height: '100%',
          overflow: 'auto',
          display: 'flex',
          backgroundColor: '#141821'
        }}
      >
        <div
          style={isAutoResize ? {
            width: '100%',
            height: '100%'
          } : {
            margin: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 'fit-content',
            minHeight: 'fit-content',
            padding: '16px'
          }}
        >
          {/* Elemento Canvas HTML5 para IronRDP WASM siempre presente en el DOM */}
          <canvas
            ref={canvasRef}
            tabIndex={0}
            onClick={() => canvasRef.current?.focus()}
            onMouseDown={() => canvasRef.current?.focus()}
            style={isAutoResize ? {
              width: '100%',
              height: '100%',
              display: 'block',
              backgroundColor: '#000000',
              outline: 'none',
              // cursor lo controla setCursorStyleCallback (no pisar con React)
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              willChange: 'transform',
              imageRendering: 'auto'
            } : {
              width: `${desktopDimensions.width}px`,
              height: `${desktopDimensions.height}px`,
              minWidth: `${desktopDimensions.width}px`,
              minHeight: `${desktopDimensions.height}px`,
              display: 'block',
              backgroundColor: '#000000',
              outline: 'none',
              borderRadius: '4px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              willChange: 'transform',
              imageRendering: 'auto'
            }}
          />
        </div>
      </div>

      {/* Overlay visual cuando se arrastra un archivo sobre la pantalla RDP */}
      {isDraggingOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(6px)',
            border: '3px dashed #3b82f6',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            pointerEvents: 'none'
          }}
        >
          <i className="pi pi-cloud-upload text-blue-400 mb-3" style={{ fontSize: '3.5rem' }}></i>
          <h3 className="m-0 font-medium text-white">Soltar archivos para transferir</h3>
          <p className="m-0 mt-1 text-sm text-gray-300">Los archivos se subirán directamente a la sesión RDP</p>
        </div>
      )}

      {/* Indicador flotante de progreso de transferencias activas */}
      {Object.keys(activeTransfers).length > 0 && (() => {
        const transferEntries = Object.entries(activeTransfers);
        const pendingIds = listPendingDownloadIds(activeTransfers);
        const header = getTransferOverlayHeader(activeTransfers);
        const stopOverlayEvent = (e) => {
          e.stopPropagation();
        };
        return (
        <div
          onMouseDown={stopOverlayEvent}
          onMouseUp={stopOverlayEvent}
          onPointerDown={stopOverlayEvent}
          onClick={stopOverlayEvent}
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            backgroundColor: 'rgba(20, 24, 33, 0.94)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${header.borderColor}`,
            borderRadius: '8px',
            padding: '10px 14px',
            zIndex: 100,
            minWidth: '280px',
            maxWidth: '380px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}
        >
          <div className="text-xs font-semibold mb-2 flex align-items-center justify-content-between" style={{ color: header.headerColor }}>
            <span>{header.headerLabel}</span>
            <i className={`${header.headerIcon} text-xs`}></i>
          </div>
          {header.hint && (
            <p className="m-0 mb-2 text-xs text-gray-400">{header.hint}</p>
          )}
          {pendingIds.length > 1 && (
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                className="p-button p-button-text p-button-sm"
                onClick={(e) => {
                  stopOverlayEvent(e);
                  void startAllPendingDownloads();
                }}
              >
                Descargar todos
              </button>
              <button
                type="button"
                className="p-button p-button-text p-button-sm p-button-secondary"
                onClick={(e) => {
                  stopOverlayEvent(e);
                  discardAllPendingDownloads();
                }}
              >
                Descartar todos
              </button>
            </div>
          )}
          {transferEntries.map(([id, t]) => {
            const isPending = t.status === 'pending';
            const isReady = t.status === 'ready';
            const isPasting = t.status === 'pasting';
            const isActive = t.status === 'active' || !t.status;
            const isComplete = t.status === 'complete';
            const isError = t.status === 'error';
            const sizeLabel = formatTransferSize(t.size);
            const itemColor = isComplete ? '#4ade80' : (isError ? '#f87171' : (isPending || isReady ? '#38bdf8' : '#93c5fd'));
            const itemLabel = isComplete
              ? (t.type === 'upload' ? 'Pegado' : 'Listo')
              : (isError ? 'Error' : (isReady ? 'Ctrl+V' : (isPending ? (sizeLabel || 'Copiado') : `${Math.round(t.percentage || 0)}%`)));
            const actionLabel = isPending ? 'Descartar' : (isReady ? 'Ocultar' : 'Cancelar');
            const showCancel = isPending || isReady || isPasting || isActive;
            return (
            <div key={id} className="mb-2 last:mb-0">
              <div className="flex justify-content-between text-xs text-gray-300 mb-1 align-items-center gap-2">
                <span className="text-truncate" style={{ maxWidth: '160px' }} title={t.name}>{t.name}</span>
                <span className="font-medium white-space-nowrap" style={{ color: itemColor }}>{itemLabel}</span>
              </div>
              {isPending && (
                <div className="flex align-items-center gap-1 mb-1">
                  <button
                    type="button"
                    className="p-button p-button-text p-button-sm"
                    onClick={(e) => {
                      stopOverlayEvent(e);
                      void startDownloadById(id);
                    }}
                  >
                    Descargar
                  </button>
                  <button
                    type="button"
                    className="p-button p-button-text p-button-sm p-button-secondary"
                    onClick={(e) => {
                      stopOverlayEvent(e);
                      cancelTransferById(id);
                    }}
                  >
                    Descartar
                  </button>
                </div>
              )}
              {!isPending && showCancel && (
                <div className="flex justify-content-end mb-1">
                  <button
                    type="button"
                    className="p-button p-button-text p-button-sm p-button-secondary"
                    onClick={(e) => {
                      stopOverlayEvent(e);
                      cancelTransferById(id);
                    }}
                  >
                    {actionLabel}
                  </button>
                </div>
              )}
              {!isReady && !isPending && (
                <ProgressBar
                  value={isComplete ? 100 : Math.round(t.percentage || 0)}
                  showValue={false}
                  style={{ height: '4px' }}
                  color={isComplete ? '#4ade80' : (isError ? '#f87171' : undefined)}
                />
              )}
            </div>
            );
          })}
        </div>
        );
      })()}

      {/* Overlays de estado (Cargando / Error / Desconectado) encima del canvas */}
      {connectionState === 'connecting' && (
        <div
          className="flex flex-column align-items-center justify-content-center text-white gap-3"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#141821',
            zIndex: 10
          }}
        >
          <ProgressSpinner style={{ width: '50px', height: '50px' }} />
          <h4 className="m-0 font-medium text-blue-400">Conectando RDP WebAssembly...</h4>
          <p className="m-0 text-xs text-gray-400">Iniciando motor IronRDP nativo en Node.js (Sin Docker / Sin WSL)</p>
        </div>
      )}

      {/* Overlays de estado: Desconectado o Error */}
      {(connectionState === 'disconnected' || connectionState === 'error') && (
        <div
          className="flex flex-column align-items-center justify-content-center text-white p-4"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(20, 24, 33, 0.96)',
            backdropFilter: 'blur(8px)',
            zIndex: 30,
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              backgroundColor: '#1a1f2c',
              border: `1px solid ${
                disconnectDetails?.severity === 'danger'
                  ? 'rgba(239, 68, 68, 0.4)'
                  : disconnectDetails?.severity === 'warn'
                  ? 'rgba(245, 158, 11, 0.4)'
                  : 'rgba(59, 130, 246, 0.4)'
              }`,
              borderRadius: '12px',
              padding: '28px 36px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px'
            }}
          >
            {/* Icono de estado con aura */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  disconnectDetails?.severity === 'danger'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : disconnectDetails?.severity === 'warn'
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(59, 130, 246, 0.15)',
                boxShadow:
                  disconnectDetails?.severity === 'danger'
                    ? '0 0 20px rgba(239, 68, 68, 0.25)'
                    : disconnectDetails?.severity === 'warn'
                    ? '0 0 20px rgba(245, 158, 11, 0.25)'
                    : '0 0 20px rgba(59, 130, 246, 0.25)'
              }}
            >
              <i
                className={
                  disconnectDetails?.icon ||
                  (connectionState === 'error' ? 'pi pi-exclamation-triangle' : 'pi pi-desktop')
                }
                style={{
                  fontSize: '2rem',
                  color:
                    disconnectDetails?.severity === 'danger'
                      ? '#ef4444'
                      : disconnectDetails?.severity === 'warn'
                      ? '#f59e0b'
                      : '#38bdf8'
                }}
              />
            </div>

            {/* Badge de categoría */}
            {disconnectDetails?.badge && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor:
                    disconnectDetails?.severity === 'danger'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : disconnectDetails?.severity === 'warn'
                      ? 'rgba(245, 158, 11, 0.2)'
                      : 'rgba(59, 130, 246, 0.2)',
                  color:
                    disconnectDetails?.severity === 'danger'
                      ? '#fca5a5'
                      : disconnectDetails?.severity === 'warn'
                      ? '#fde68a'
                      : '#93c5fd'
                }}
              >
                {disconnectDetails.badge}
              </span>
            )}

            {/* Título principal */}
            <h3 className="m-0 text-xl font-semibold text-white">
              {disconnectDetails?.title || (connectionState === 'error' ? 'Error de Conexión RDP' : 'Sesión RDP Finalizada')}
            </h3>

            {/* Host Badge */}
            <div
              className="flex align-items-center gap-2 px-2 py-1"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#94a3b8'
              }}
            >
              <i className="pi pi-desktop text-xs"></i>
              <span>{rdpConfig?.hostname || rdpConfig?.server || 'Servidor RDP'}:{rdpConfig?.port || 3389}</span>
              {rdpConfig?.username && (
                <>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span>{rdpConfig.username}</span>
                </>
              )}
            </div>

            {/* Descripción en lenguaje natural */}
            <p className="m-0 text-sm text-gray-300 line-height-3">
              {disconnectDetails?.description || errorMessage || 'La sesión de escritorio remoto se ha cerrado.'}
            </p>

            {/* Sugerencia o consejo de acción */}
            {disconnectDetails?.suggestion && (
              <p className="m-0 text-xs text-blue-300 font-medium">
                {disconnectDetails.suggestion}
              </p>
            )}

            {/* Botones de acción principales */}
            <div className="flex align-items-center gap-3 mt-2 w-full justify-content-center">
              <Button
                label="Reconectar"
                icon="pi pi-replay"
                className="p-button-sm font-semibold"
                style={{
                  backgroundColor: '#00f0ff',
                  borderColor: '#00f0ff',
                  color: '#0a0d14',
                  boxShadow: '0 0 12px rgba(0, 240, 255, 0.35)',
                  minWidth: '130px'
                }}
                onClick={handleReconnect}
              />
              <Button
                label="Cerrar pestaña"
                icon="pi pi-times"
                className="p-button-outlined p-button-secondary p-button-sm"
                style={{
                  borderColor: 'rgba(148, 163, 184, 0.4)',
                  color: '#cbd5e1',
                  minWidth: '130px'
                }}
                onClick={handleCloseTab}
              />
            </div>

            {/* Diagnóstico técnico desplegable */}
            {disconnectDetails?.rawReason && (
              <div className="w-full mt-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(prev => !prev)}
                  className="flex align-items-center justify-content-center gap-2 w-full p-1"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '11px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <i className={`pi ${showDiagnostics ? 'pi-chevron-up' : 'pi-chevron-down'}`} style={{ fontSize: '10px' }}></i>
                  <span>{showDiagnostics ? 'Ocultar diagnóstico técnico' : 'Ver detalles técnicos'}</span>
                </button>

                {showDiagnostics && (
                  <div
                    className="mt-2 p-2 text-left text-xs font-mono"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.35)',
                      borderRadius: '6px',
                      color: '#94a3b8',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      wordBreak: 'break-all'
                    }}
                  >
                    <div><strong className="text-gray-400">Hora:</strong> {disconnectDetails.timestamp || 'N/A'}</div>
                    <div><strong className="text-gray-400">Motivo:</strong> {disconnectDetails.rawReason}</div>
                    {disconnectDetails.category && (
                      <div><strong className="text-gray-400">Categoría:</strong> {disconnectDetails.category}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra flotante de utilidades RDP Cyberpunk (HTML5 Canvas) */}
      {connectionState === 'connected' && (
        <div
          onMouseEnter={() => setIsToolbarHovered(true)}
          onMouseLeave={() => setIsToolbarHovered(false)}
          className={`ironrdp-toolbar-wrapper ${(isToolbarPinned || isToolbarHovered || showResolutionMenu) ? 'is-visible' : 'is-hidden'}`}
        >
          <div className="ironrdp-cyber-bar">
            {/* Host Badge */}
            <span className="ironrdp-badge-host">
              <i className="pi pi-globe"></i>
              <span>{rdpConfig?.hostname || rdpConfig?.server || 'RDP Web'}</span>
            </span>

            <span className="ironrdp-cyber-divider" />

            {/* Resolution Selector Popover */}
            <div ref={resolutionMenuRef} className="ironrdp-res-wrapper">
              <button
                type="button"
                className={`ironrdp-badge-resolution clickable ${isAutoResize ? 'is-auto' : 'is-fixed'} ${showResolutionMenu ? 'is-open' : ''}`}
                title="Hacer clic para cambiar la resolución instantáneamente"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowResolutionMenu(prev => !prev);
                }}
              >
                <i className="pi pi-desktop"></i>
                <span>{desktopDimensions.width}x{desktopDimensions.height}{isAutoResize ? ' (Auto)' : ''}</span>
                <i className={`pi ${showResolutionMenu ? 'pi-chevron-up' : 'pi-chevron-down'}`} style={{ fontSize: '8px', opacity: 0.85, marginLeft: '2px' }}></i>
              </button>

              {showResolutionMenu && (
                <div
                  className="ironrdp-res-dropdown"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="ironrdp-res-header">
                    <span>⚡ Resolución RDP</span>
                    <span className="cyber-dot"></span>
                  </div>

                  {/* Opción Ajuste Dinámico (Auto) */}
                  <div
                    className={`ironrdp-res-item ${isAutoResize ? 'is-selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectResolution('auto');
                    }}
                  >
                    <div className="ironrdp-res-item-left">
                      <i className="pi pi-sync text-xs"></i>
                      <span>Ajuste Dinámico</span>
                    </div>
                    <span className="ironrdp-res-tag">AUTO</span>
                  </div>

                  <div className="ironrdp-res-divider" />

                  {/* Lista de resoluciones predefinidas */}
                  <div className="ironrdp-res-list">
                    {RESOLUTION_OPTIONS.map((opt) => {
                      const isSelected = !isAutoResize && desktopDimensions.width === opt.width && desktopDimensions.height === opt.height;
                      return (
                        <div
                          key={opt.label}
                          className={`ironrdp-res-item ${isSelected ? 'is-selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectResolution(opt.label);
                          }}
                        >
                          <div className="ironrdp-res-item-left">
                            {isSelected ? (
                              <i className="pi pi-check text-xs" style={{ color: '#00f0ff' }}></i>
                            ) : (
                              <i className="pi pi-stop text-xs" style={{ opacity: 0.3, fontSize: '6px' }}></i>
                            )}
                            <span>{opt.label}</span>
                          </div>
                          <span className="ironrdp-res-tag">{opt.tag}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer con opción de reconectar con la resolución seleccionada */}
                  <div className="ironrdp-res-divider" />
                  <div
                    style={{
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#94a3b8',
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      borderBottomLeftRadius: '6px',
                      borderBottomRightRadius: '6px'
                    }}
                  >
                    <span style={{ fontSize: '10px', opacity: 0.85 }}>¿Escritorio nativo remoto?</span>
                    <button
                      type="button"
                      style={{
                        background: 'rgba(0, 240, 255, 0.12)',
                        border: '1px solid rgba(0, 240, 255, 0.4)',
                        color: '#00f0ff',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Reconectar la sesión con la resolución seleccionada para que Windows configure su escritorio nativo"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowResolutionMenu(false);
                        handleReconnect();
                      }}
                    >
                      <i className="pi pi-refresh" style={{ fontSize: '9px' }}></i>
                      <span>Reconectar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <span className="ironrdp-cyber-divider" />

            <button
              type="button"
              className="ironrdp-cyber-btn ironrdp-cyber-btn-cad"
              title="Enviar Ctrl+Alt+Del a la sesión"
              onClick={handleSendCtrlAltDel}
            >
              <i className="pi pi-key"></i>
              <span>Ctrl+Alt+Del</span>
            </button>

            <button
              type="button"
              className="ironrdp-cyber-btn ironrdp-cyber-btn-win"
              title="Enviar Tecla Windows"
              onClick={handleSendWinKey}
            >
              <i className="pi pi-microsoft"></i>
              <span>Win</span>
            </button>

            <button
              type="button"
              className="ironrdp-cyber-btn ironrdp-cyber-btn-clip"
              title="Enviar texto al portapapeles remoto"
              onClick={() => setShowClipboardDialog(true)}
            >
              <i className="pi pi-send"></i>
            </button>

            {isPrinterEnabled && (
              <span
                className="ironrdp-cyber-badge-printer"
                title="Impresora virtual PDF redirigida (NodeTerm PDF Printer)"
              >
                <i className="pi pi-print"></i>
                <span>PDF</span>
              </span>
            )}

            {isDriveEnabled && (
              <button
                type="button"
                className="ironrdp-cyber-btn ironrdp-cyber-btn-upload"
                title="Subir archivos a la sesión remota"
                onClick={async () => {
                  if (fileTransferProviderRef.current) {
                    try {
                      const files = await fileTransferProviderRef.current.showFilePicker({ multiple: true });
                      if (files && files.length) {
                        await uploadFilesSafely(fileTransferProviderRef.current, files);
                      }
                    } catch (e) {
                      console.warn('Selector de archivos cancelado o error:', e);
                    }
                  }
                }}
              >
                <i className="pi pi-upload"></i>
              </button>
            )}

            <button
              type="button"
              className="ironrdp-cyber-btn ironrdp-cyber-btn-screen"
              title="Pantalla Completa"
              onClick={handleToggleFullscreen}
            >
              <i className="pi pi-window-maximize"></i>
            </button>

            <button
              type="button"
              className={`ironrdp-cyber-btn ironrdp-cyber-btn-pin ${isToolbarPinned ? 'active' : ''}`}
              title={isToolbarPinned ? "Desfijar barra flotante" : "Fijar barra siempre visible"}
              onClick={() => setIsToolbarPinned(!isToolbarPinned)}
            >
              <i className={isToolbarPinned ? "pi pi-bookmark-fill" : "pi pi-bookmark"}></i>
            </button>
          </div>
          {!(isToolbarPinned || isToolbarHovered) && (
            <div
              onClick={() => setIsToolbarPinned(true)}
              className="ironrdp-cyber-handle"
              title="Mostrar barra de herramientas RDP"
            >
              <i className="pi pi-chevron-down"></i>
            </div>
          )}
        </div>
      )}

      {/* Diálogo para inyectar texto */}
      <Dialog
        header="Enviar Texto a la Sesión RDP"
        visible={showClipboardDialog}
        style={{ width: '420px' }}
        onHide={() => setShowClipboardDialog(false)}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button label="Cancelar" icon="pi pi-times" className="p-button-text p-button-sm" onClick={() => setShowClipboardDialog(false)} />
            <Button label="Enviar" icon="pi pi-check" className="p-button-primary p-button-sm" onClick={async () => {
              if (sessionRef.current && clipboardText) {
                try {
                  localClipboardCacheRef.current = clipboardText;
                  await enqueueClipboardSend(clipboardText, 'diálogo manual');

                  const transaction = new Backend.InputTransaction();
                  for (const char of clipboardText) {
                    transaction.addEvent(Backend.DeviceEvent.unicodePressed(char));
                    transaction.addEvent(Backend.DeviceEvent.unicodeReleased(char));
                  }
                  sessionRef.current.applyInputs(transaction);
                  setShowClipboardDialog(false);
                  setClipboardText('');
                  toastRef.current?.show({
                    severity: 'success',
                    summary: 'Texto Enviado',
                    detail: 'Texto transmitido a la sesión RDP',
                    life: 2500
                  });
                } catch (e) {
                  console.error('Error enviando texto:', e);
                }
              }
            }} />
          </div>
        }
      >
        <div className="flex flex-column gap-2 pt-2">
          <label className="text-xs text-color-secondary">Escribe el texto a enviar a la máquina remota:</label>
          <InputTextarea
            value={clipboardText}
            onChange={(e) => setClipboardText(e.target.value)}
            rows={4}
            autoFocus
            style={{ width: '100%', resize: 'none', backgroundColor: '#1e1e1e', color: '#fff', borderColor: '#444' }}
          />
        </div>
      </Dialog>
    </div>
  );
});

IronRdpCanvasTab.displayName = 'IronRdpCanvasTab';

export default IronRdpCanvasTab;
