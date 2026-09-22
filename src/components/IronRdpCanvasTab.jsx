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
    return `Fallo al decodificar PDU RDP (${msg}). Si acabas de cambiar el bridge, reinicia npm run dev. Alternativa: Seguridad=TLS o Guacamole/MSTSC.`;
  }

  return msg;
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

  const lastReceivedClipboardTextRef = useRef('');
  const lastSentClipboardTextRef = useRef('');
  const isFileTransferArmedRef = useRef(false);
  const localClipboardCacheRef = useRef('');
  const clipboardChainRef = useRef(Promise.resolve());
  const pendingClipboardSendRef = useRef(null);
  const currentDesktopSizeRef = useRef({ width: 0, height: 0 });
  const hasEverConnectedRef = useRef(false);
  const currentTokenIdRef = useRef(null);
  const lastBackendReasonRef = useRef(null);
  const uploadFailedIdsRef = useRef(new Set());
  const transferDismissTimersRef = useRef(new Map());
  const TRANSFER_COMPLETE_OVERLAY_MS = 2500;

  // Búferes de diagnóstico en memoria para volcado automático ante incidencias
  const bridgeTraceBufferRef = useRef([]);
  const clipboardHistoryRef = useRef([]);
  const clipboardFailedRef = useRef(false);

  const isRdpDebugEnabled = () => {
    return (
      (typeof window !== 'undefined' && window.__NODETERM_RDP_DEBUG__ === true) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('NODETERM_RDP_DEBUG') === '1')
    );
  };

  const notifyUserClose = () => {
    const tokenId = currentTokenIdRef.current;
    if (!tokenId || !window.electron?.ipcRenderer?.invoke) return;
    void window.electron.ipcRenderer.invoke('rdp:mark-user-close', tokenId).catch(() => {});
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

  const fileTransferNameOf = (file) => file?.name || file?.file?.name || 'Archivo';

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

  const isDriveEnabled = rdpConfig.enableDrive !== false && (rdpConfig.guacEnableDrive !== false || rdpConfig.redirectFolders !== false || rdpConfig.enableDrive === true);
  const isPrinterEnabled = rdpConfig.redirectPrinters === true;
  const isFullscreen = rdpConfig.fullscreen === true || rdpConfig.resolution === 'fullscreen';

  const alignDesktop = (n) => {
    const base = Math.max(1, Math.floor(n));
    return (base + 3) & ~3;
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
        clipboardFailedRef.current = true;
        recordClipboardAction(`Error enviando Format List (${reason})`, err?.message || String(err));
        console.warn(`⚠️ [IronRDP Clipboard] Error enviando Format List (${reason}):`, err);
        dumpClipboardHistory('Historial previo al fallo de envío de Format List:');
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
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#141821';
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      } catch (_) {}
    }
    hasEverConnectedRef.current = false;
    lastBackendReasonRef.current = null;
    clipboardFailedRef.current = false;
    clearTransferDismissTimers();
    uploadFailedIdsRef.current.clear();
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

    const handleSessionClosed = (event, data) => {
      if (data && data.tokenId && data.tokenId === currentTokenIdRef.current) {
        lastBackendReasonRef.current = data.reason;
        const clipFailed = data.clipboardFailed === true || clipboardFailedRef.current;

        if (clipFailed || isRdpDebugEnabled()) {
          if (clipFailed) {
            console.warn('📡 [IronRDP Tab] Fallo de clipboard al cerrar:', data.reason);
          } else {
            console.log('📡 [IronRDP Tab] Recibido rdp:native-session-closed del bridge:', data.reason);
          }
          dumpBridgeTraces('Trazas del bridge previas al corte de conexion:');
          dumpClipboardHistory('Historial de portapapeles previo al corte:');
        }

        // Si la sesión WASM aún no terminó de procesar el cierre del socket, ordenar shutdown
        if (sessionRef.current) {
          try { sessionRef.current.shutdown(); } catch (_) {}
        }
      }
    };

    const handleDiagnosticLog = (event, data) => {
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

    window.electron.ipcRenderer.on('rdp:native-session-closed', handleSessionClosed);
    window.electron.ipcRenderer.on('rdp:diagnostic-log', handleDiagnosticLog);
    return () => {
      window.electron.ipcRenderer.removeListener('rdp:native-session-closed', handleSessionClosed);
      window.electron.ipcRenderer.removeListener('rdp:diagnostic-log', handleDiagnosticLog);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let currentSession = null;
    let currentFileTransferProvider = null;

    const clearCanvasScreen = () => {
      if (canvasRef.current) {
        try {
          const ctx = canvasRef.current.getContext('2d');
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
        setConnectionState('connecting');
        setErrorMessage('');
        setDisconnectDetails(null);

        if (!window.electron || !window.electron.ipcRenderer) {
          throw new Error('Electron IPC no está disponible');
        }

        // 1. Inicializar módulo WebAssembly de IronRDP con nivel warn para evitar ruido de consola
        await initIronRdp('warn');

        // 2. Obtener dimensiones calculadas según configuración (autoResize vs resolución fija)
        const dims = calculateInitialDimensions();
        const width = dims.width;
        const height = dims.height;

        currentDesktopSizeRef.current = { width, height };
        setDesktopDimensions({ width, height });

        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }

        const configPayload = {
          ...rdpConfig,
          width,
          height
        };

        // 3. Crear token y endpoint para el proxy nativo TCP-a-WebSocket en Node.js (Sin guacd/WSL/Docker)
        const tokenResponse = await window.electron.ipcRenderer.invoke('rdp:create-native-bridge-token', configPayload);

        if (!tokenResponse || !tokenResponse.success || !tokenResponse.wsUrl) {
          throw new Error(tokenResponse?.error || 'No se pudo inicializar el puente RDP nativo');
        }

        currentTokenIdRef.current = tokenResponse.tokenId;

        if (!isMounted) return;

        // 4. Construir la sesión de IronRDP WebAssembly
        let rawUser = (rdpConfig.useBastionWallix && rdpConfig.bastionUser)
          ? rdpConfig.bastionUser
          : (rdpConfig.username || rdpConfig.user || '');
        let usernameStr = String(rawUser || '').trim();
        let domainStr = String(rdpConfig.domain || rdpConfig.serverDomain || '').trim();
        const destinationStr = `${rdpConfig.hostname || rdpConfig.server}:${rdpConfig.port || 3389}`;

        // Formato usuario Wallix:
        // - Modo 2 (Cadena Wallix): si ya viene con cadena (ej: rt01119@default@Fortigate_JC:APP:rt01119)
        //   o si tiene targetServer especificado para construirla.
        // - Modo 1 (Conexión directa Wallix / solo host): solo usuario bastion (ej: rt01119),
        //   sin targetServer. No debe romperse como email ni NetBIOS.
        // - Cadenas de bastión PAM (Wallix con :, CyberArk con # o múltiples @):
        const isBastionChain = usernameStr.split('@').length >= 3 || (usernameStr.includes('@') && (usernameStr.includes(':') || usernameStr.includes('#')));
        const isWallixUserFormat = !!(
          rdpConfig.useBastionWallix ||
          rdpConfig.bastionUser ||
          rdpConfig.targetServer ||
          isBastionChain
        );

        if (isWallixUserFormat) {
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
            if (canvasRef.current) {
              if (cursorKind === 'url' && cursorData) {
                const hX = Math.round(hotspotX || 0);
                const hY = Math.round(hotspotY || 0);
                canvasRef.current.style.cursor = `url(${cursorData}) ${hX} ${hY}, default`;
              } else if (cursorKind === 'none') {
                canvasRef.current.style.cursor = 'none';
              } else {
                canvasRef.current.style.cursor = 'default';
              }
            }
          })
          .setCursorStyleCallbackContext({})
          .canvasResizedCallback((w, h) => {
            if (w && h) {
              console.log(`📐 [IronRDP WASM] Canvas redimensionado por servidor a ${w}x${h}`);
              if (canvasRef.current) {
                canvasRef.current.width = w;
                canvasRef.current.height = h;
              }
              currentDesktopSizeRef.current = { width: w, height: h };
              setDesktopDimensions({ width: w, height: h });
            }
          })
          .extension(enableCredssp(useCredssp));

        // Registrar extensiones para transferencia de archivos / carpeta compartida (RdpFileTransferProvider)
        if (isDriveEnabled) {
          try {
            // onUploadStarted silencia el sync de texto para que no pise la Format List del fichero.
            // No usar onUploadFinished: en iron-remote-desktop-rdp 0.7.0 se dispara al initiate, no al terminar.
            currentFileTransferProvider = new RdpFileTransferProvider({
              chunkSize: 64 * 1024,
              onUploadStarted: () => { isFileTransferArmedRef.current = true; }
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
            if (isFileTransferArmedRef.current) {
              recordClipboardAction('remoteClipboardChanged omitido: transferencia en curso');
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
              clipboardFailedRef.current = true;
              recordClipboardAction('Error en remoteClipboardChangedCallback', e?.message || String(e));
              console.warn('⚠️ [IronRDP Clipboard] Error en remoteClipboardChangedCallback:', e);
              dumpClipboardHistory('Historial previo al fallo en recepcion de portapapeles:');
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
          builder.renderCanvas(canvasRef.current);
        }

        // Precargar el portapapeles local antes de conectar: el saludo CLIPRDR debe responderse
        // sin latencia, antes de que el servidor envíe su propio CB_FORMAT_LIST.
        if (isClipboardEnabled) {
          await refreshLocalClipboardCache().catch(() => {});
        }

        console.log(`🚀 [IronRDP WASM] Conectando a ${destinationStr} (protocolo=${tokenResponse.protocolLabel || 'auto'}, credssp=${useCredssp}, clipboard=${isClipboardEnabled}, drive=${isDriveEnabled})...`);
        
        currentSession = await builder.connect();
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
              console.log('[IronRDP FileTransfer] Pegado en el remoto:', file?.name);
              markTransferStatus(transferId, 'complete', {
                name: file?.name || 'Archivo',
                type: 'upload'
              });
            });

            currentFileTransferProvider.on('download-progress', (progress) => {
              setActiveTransfers(prev => ({
                ...prev,
                [progress.transferId]: {
                  name: progress.fileName,
                  type: 'download',
                  percentage: progress.percentage || 0
                }
              }));

              if (progress.percentage >= 100) {
                setTimeout(() => {
                  setActiveTransfers(prev => {
                    const next = { ...prev };
                    delete next[progress.transferId];
                    return next;
                  });
                }, 1000);
              }
            });

            currentFileTransferProvider.on('download-complete', (fileInfo, blob, fileIndex, transferId) => {
              console.log('✅ [IronRDP FileTransfer] Recepción de buffer completada:', fileInfo?.name);
              setActiveTransfers(prev => {
                const next = { ...prev };
                delete next[transferId];
                return next;
              });
            });

            currentFileTransferProvider.on('files-available', async (files) => {
              if (!files || !files.length) return;
              console.log('📁 [IronRDP FileTransfer] Archivos remotos disponibles:', files);

              toastRef.current?.show({
                severity: 'info',
                summary: 'Descargando Archivo(s)',
                detail: `Recibiendo ${files.map(f => f.name).join(', ')} del servidor remoto...`,
                life: 3000
              });

              const copiedPaths = [];
              for (let i = 0; i < files.length; i++) {
                try {
                  const { completion } = currentFileTransferProvider.downloadFile(files[i], i);
                  const blob = await completion;
                  const arrayBuffer = await blob.arrayBuffer();
                  const uint8 = new Uint8Array(arrayBuffer);
                  if (window.electron?.clipboard?.saveTempFile) {
                    const res = await window.electron.clipboard.saveTempFile(files[i].name, uint8);
                    if (res?.success && res.filePath) {
                      copiedPaths.push(res.filePath);
                    }
                  }
                } catch (dlErr) {
                  console.warn('[IronRDP FileTransfer] Error descargando archivo:', dlErr);
                }
              }

              if (copiedPaths.length && window.electron?.clipboard?.writeFiles) {
                await window.electron.clipboard.writeFiles(copiedPaths);
                toastRef.current?.show({
                  severity: 'success',
                  summary: 'Archivo Listo en Portapapeles',
                  detail: `${files.map(f => f.name).join(', ')} copiado. Pulsa Ctrl+V en cualquier carpeta de tu PC para pegarlo.`,
                  life: 5000
                });
              }
              isFileTransferArmedRef.current = false;
            });

            currentFileTransferProvider.on('error', (err) => {
              console.warn('[IronRDP FileTransfer] Error:', err);
              const transferId = err?.transferId;
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
          console.error('❌ [IronRDP WASM] Error en ejecucion de sesion:', detail, err);
          if (clipboardFailedRef.current || isRdpDebugEnabled()) {
            dumpBridgeTraces('Trazas del bridge previas al error de sesion:');
            dumpClipboardHistory('Historial de portapapeles previo al error de sesion:');
          }
          handleSessionEnded(null, err);
        });

      } catch (err) {
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
      isMounted = false;
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
      isFileTransferArmedRef.current = false;
      pendingClipboardSendRef.current = null;
    };
  }, [rdpConfig, reconnectTrigger]);

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
          text !== lastReceivedClipboardTextRef.current &&
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

    const getCanvasPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
      const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
      const rawX = Math.floor((e.clientX - rect.left) * scaleX);
      const rawY = Math.floor((e.clientY - rect.top) * scaleY);
      return {
        x: Math.max(0, Math.min(canvas.width - 1, rawX)),
        y: Math.max(0, Math.min(canvas.height - 1, rawY))
      };
    };

    let pendingMousePos = null;
    let mouseRafId = null;

    const flushPendingMouseMove = () => {
      if (mouseRafId != null) {
        cancelAnimationFrame(mouseRafId);
        mouseRafId = null;
      }
      if (pendingMousePos && sessionRef.current) {
        const { x, y } = pendingMousePos;
        pendingMousePos = null;
        try {
          const transaction = new Backend.InputTransaction();
          transaction.addEvent(Backend.DeviceEvent.mouseMove(x, y));
          sessionRef.current.applyInputs(transaction);
        } catch (_) {}
      }
    };

    const handleMouseMove = (e) => {
      if (!sessionRef.current) return;
      pendingMousePos = getCanvasPos(e);
      if (mouseRafId == null) {
        mouseRafId = requestAnimationFrame(() => {
          mouseRafId = null;
          if (pendingMousePos && sessionRef.current) {
            const { x, y } = pendingMousePos;
            pendingMousePos = null;
            try {
              const transaction = new Backend.InputTransaction();
              transaction.addEvent(Backend.DeviceEvent.mouseMove(x, y));
              sessionRef.current.applyInputs(transaction);
            } catch (_) {}
          }
        });
      }
    };

    const handleMouseDown = (e) => {
      if (!sessionRef.current) return;
      canvas.focus();
      e.preventDefault();
      flushPendingMouseMove();
      const { x, y } = getCanvasPos(e);
      const btn = e.button === 0 ? 0 : e.button === 2 ? 2 : 1;
      try {
        const transaction = new Backend.InputTransaction();
        transaction.addEvent(Backend.DeviceEvent.mouseMove(x, y));
        transaction.addEvent(Backend.DeviceEvent.mouseButtonPressed(btn));
        sessionRef.current.applyInputs(transaction);
      } catch (err) {}
    };

    const handleMouseUp = (e) => {
      if (!sessionRef.current) return;
      e.preventDefault();
      flushPendingMouseMove();
      const { x, y } = getCanvasPos(e);
      const btn = e.button === 0 ? 0 : e.button === 2 ? 2 : 1;
      try {
        const transaction = new Backend.InputTransaction();
        transaction.addEvent(Backend.DeviceEvent.mouseMove(x, y));
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

      // El pegado se sincroniza en el manejador del evento 'paste', que cubre Ctrl+V, Cmd+V
      // y el menú contextual. Duplicarlo aquí emitiría dos Format List por pulsación.
      e.preventDefault();
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

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('paste', handlePaste);

    return () => {
      if (mouseRafId != null) {
        cancelAnimationFrame(mouseRafId);
        mouseRafId = null;
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
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

  // Manejo de redimensionado de canvas dinámico
  useEffect(() => {
    if (!containerRef.current || connectionState !== 'connected' || !isAutoResize) return;

    let resizeTimer = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!containerRef.current || !isAutoResize) return;
        const rect = containerRef.current.getBoundingClientRect();
        const width = alignDesktop(Math.max(640, rect.width || window.innerWidth));
        const height = alignDesktop(Math.max(480, rect.height || window.innerHeight));

        if (width === currentDesktopSizeRef.current.width && height === currentDesktopSizeRef.current.height) {
          return;
        }
        currentDesktopSizeRef.current = { width, height };
        // En modo autoResize, el CSS del canvas (width: 100%, height: 100%) ya ajusta
        // perfectamente el escritorio al visor en tiempo real sin desestabilizar
        // la sesión RDP con solicitudes DisplayControl DVC no soportadas.
      }, 300);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
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
      console.log('📐 [IronRDP] Cambiando a resolución dinámica Auto (ajuste CSS)');
      toastRef.current?.show({
        severity: 'info',
        summary: 'Ajuste Dinámico',
        detail: 'Modo adaptativo activado (ajuste automático a ventana)',
        life: 2000
      });
    } else {
      setIsAutoResize(false);
      const parsed = parseResolutionValue(resKey);
      if (parsed) {
        const targetW = alignDesktop(parsed.width);
        const targetH = alignDesktop(parsed.height);
        console.log(`📐 [IronRDP] Cambiando resolución de visualización a ${targetW}x${targetH}`);
        // Actualizar dimensiones visuales en el estado de React (controla el CSS width/height del canvas sin borrar el búfer)
        setDesktopDimensions({ width: targetW, height: targetH });
        rdpConfig.resolution = resKey;
        rdpConfig.autoResize = false;

        // Intentar redimensionado dinámico en la sesión si el servidor soporta DisplayControl
        if (sessionRef.current?.resize) {
          try {
            sessionRef.current.resize(targetW, targetH);
          } catch (resizeErr) {
            console.warn('[IronRDP] Error solicitando resize a la sesión:', resizeErr);
          }
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
              cursor: 'default'
            } : {
              width: `${desktopDimensions.width}px`,
              height: `${desktopDimensions.height}px`,
              minWidth: `${desktopDimensions.width}px`,
              minHeight: `${desktopDimensions.height}px`,
              display: 'block',
              backgroundColor: '#000000',
              outline: 'none',
              cursor: 'default',
              borderRadius: '4px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)'
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
        const hasReady = transferEntries.some(([, t]) => t.status === 'ready');
        const hasPasting = transferEntries.some(([, t]) => t.status === 'pasting');
        const hasActive = transferEntries.some(([, t]) => !t.status || t.status === 'active');
        const hasError = transferEntries.some(([, t]) => t.status === 'error');
        let headerLabel = 'Completado';
        let headerColor = '#4ade80';
        let headerIcon = 'pi pi-check-circle';
        let borderColor = 'rgba(74, 222, 128, 0.45)';
        if (hasError && !hasReady && !hasPasting && !hasActive) {
          headerLabel = 'Error de transferencia';
          headerColor = '#f87171';
          headerIcon = 'pi pi-times-circle';
          borderColor = 'rgba(248, 113, 113, 0.45)';
        } else if (hasPasting || hasActive) {
          headerLabel = hasPasting ? 'Pegando en el remoto' : 'Transferencias en curso';
          headerColor = '#60a5fa';
          headerIcon = 'pi pi-sync pi-spin';
          borderColor = 'rgba(59, 130, 246, 0.4)';
        } else if (hasReady) {
          headerLabel = 'Listo para pegar';
          headerColor = '#38bdf8';
          headerIcon = 'pi pi-clipboard';
          borderColor = 'rgba(56, 189, 248, 0.45)';
        } else {
          headerLabel = 'Pegado';
        }
        return (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            backgroundColor: 'rgba(20, 24, 33, 0.94)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '10px 14px',
            zIndex: 100,
            minWidth: '260px',
            maxWidth: '340px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}
        >
          <div className="text-xs font-semibold mb-2 flex align-items-center justify-content-between" style={{ color: headerColor }}>
            <span>{headerLabel}</span>
            <i className={`${headerIcon} text-xs`}></i>
          </div>
          {hasReady && (
            <p className="m-0 mb-2 text-xs text-gray-400">Pulsa Ctrl+V en el escritorio remoto</p>
          )}
          {transferEntries.map(([id, t]) => {
            const isReady = t.status === 'ready';
            const isComplete = t.status === 'complete';
            const isError = t.status === 'error';
            const itemColor = isComplete ? '#4ade80' : (isError ? '#f87171' : (isReady ? '#38bdf8' : '#93c5fd'));
            const itemLabel = isComplete
              ? 'Pegado'
              : (isError ? 'Error' : (isReady ? 'Ctrl+V' : `${Math.round(t.percentage || 0)}%`));
            return (
            <div key={id} className="mb-2 last:mb-0">
              <div className="flex justify-content-between text-xs text-gray-300 mb-1">
                <span className="text-truncate" style={{ maxWidth: '180px' }} title={t.name}>{t.name}</span>
                <span className="font-medium" style={{ color: itemColor }}>{itemLabel}</span>
              </div>
              {!isReady && (
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
