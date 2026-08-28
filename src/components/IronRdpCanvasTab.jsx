import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressBar } from 'primereact/progressbar';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { Backend, init as initIronRdp, enableCredssp, displayControl, RdpFileTransferProvider } from '@devolutions/iron-remote-desktop-rdp';
import { resolveCredsspPolicy } from '../utils/rdpSecurityPolicy';

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

const sendClipboardToSession = async (session, text) => {
  if (!session || typeof text !== 'string' || !text) return;
  try {
    const clip = new Backend.ClipboardData();
    clip.addText('text/plain', text);
    await session.onClipboardPaste(clip);
    console.log('📋 [IronRDP Clipboard] Enviado a sesión remota:', text.slice(0, 80));
  } catch (err) {
    console.warn('[IronRDP Clipboard] Error enviando a remoto:', err);
  }
};

const IronRdpCanvasTab = ({ tabId, rdpConfig = {}, isActive = true }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const sessionRef = useRef(null);
  const fileTransferProviderRef = useRef(null);
  const toastRef = useRef(null);

  const [connectionState, setConnectionState] = useState('connecting'); // connecting, connected, error, disconnected
  const [errorMessage, setErrorMessage] = useState('');
  const [isToolbarPinned, setIsToolbarPinned] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const [showClipboardDialog, setShowClipboardDialog] = useState(false);
  const [clipboardText, setClipboardText] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [activeTransfers, setActiveTransfers] = useState({});

  const lastReceivedClipboardTextRef = useRef('');
  const lastSentClipboardTextRef = useRef('');

  const isDriveEnabled = rdpConfig.redirectFolders !== false && rdpConfig.enableDrive !== false;

  useEffect(() => {
    let isMounted = true;
    let currentSession = null;
    let currentFileTransferProvider = null;

    const startRdpSession = async () => {
      try {
        setConnectionState('connecting');
        setErrorMessage('');

        if (!window.electron || !window.electron.ipcRenderer) {
          throw new Error('Electron IPC no está disponible');
        }

        // 1. Inicializar módulo WebAssembly de IronRDP con nivel warn para evitar ruido de consola
        await initIronRdp('warn');

        // 2. Obtener dimensiones del contenedor o ventana
        const rect = containerRef.current?.getBoundingClientRect() || { width: 1600, height: 1000 };
        const alignDesktop = (n) => {
          const base = Math.max(1, Math.floor(n));
          return (base + 3) & ~3;
        };
        const width = alignDesktop(Math.max(800, rect.width || window.innerWidth));
        const height = alignDesktop(Math.max(600, rect.height || window.innerHeight));

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

        if (!isMounted) return;

        // 4. Construir la sesión de IronRDP WebAssembly
        let usernameStr = String(rdpConfig.username || '');
        let domainStr = String(rdpConfig.domain || '');
        const destinationStr = `${rdpConfig.hostname || rdpConfig.server}:${rdpConfig.port || 3389}`;

        // Formato usuario Wallix solo si hay flags/cadena de target (NO por hostname)
        const isWallixUserFormat = rdpConfig.useBastionWallix || rdpConfig.bastionUser || rdpConfig.targetServer || usernameStr.includes('@default@') || usernameStr.includes(':APP:');

        if (isWallixUserFormat) {
          // Mantener la cadena de usuario de Wallix intacta
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

        const alignedWidth = (width + 3) & ~3;
        const alignedHeight = (height + 3) & ~3;

        const isClipboardEnabled = rdpConfig.redirectClipboard !== false;

        const builder = new Backend.SessionBuilder()
          .username(usernameStr)
          .password(passwordStr)
          .destination(destinationStr)
          .proxyAddress(proxyAddressStr)
          .authToken(authTokenStr)
          .desktopSize(new Backend.DesktopSize(alignedWidth, alignedHeight))
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
          .extension(enableCredssp(useCredssp))
          .extension(displayControl(false));

        // Registrar extensiones para transferencia de archivos / carpeta compartida (RdpFileTransferProvider)
        if (isDriveEnabled) {
          try {
            currentFileTransferProvider = new RdpFileTransferProvider({ chunkSize: 64 * 1024 });
            fileTransferProviderRef.current = currentFileTransferProvider;
            for (const ext of currentFileTransferProvider.getBuilderExtensions()) {
              builder.extension(ext);
            }
            console.log('📁 [IronRDP FileTransfer] Extensiones de transferencia de archivos registradas');
          } catch (ftpErr) {
            console.warn('[IronRDP FileTransfer] Error creando FileTransferProvider:', ftpErr);
          }
        }

        // Configurar sincronización del portapapeles nativo (CLIPRDR)
        if (isClipboardEnabled) {
          // Remoto -> Local: cuando se copia texto en el servidor RDP, escribir en portapapeles del cliente
          builder.remoteClipboardChangedCallback(async (clipboardData) => {
            if (!clipboardData) return;
            try {
              for (const item of clipboardData.items()) {
                const mime = item.mimeType ? item.mimeType() : '';
                const val = item.value ? item.value() : null;
                if (mime.startsWith('text/')) {
                  const text = typeof val === 'string'
                    ? val
                    : (val instanceof Uint8Array ? new TextDecoder().decode(val) : String(val || ''));
                  if (text && text !== lastSentClipboardTextRef.current) {
                    lastReceivedClipboardTextRef.current = text;
                    console.log('📋 [IronRDP Clipboard] Recibido desde servidor remoto:', text.slice(0, 80));
                    await writeLocalClipboardText(text);
                  }
                  break;
                }
              }
            } catch (e) {
              console.warn('[IronRDP Clipboard] Error en remoteClipboardChangedCallback:', e);
            }
          });

          // Local -> Remoto (solicitud de actualización del portapapeles)
          builder.forceClipboardUpdateCallback(async () => {
            try {
              const text = await readLocalClipboardText();
              if (text && text !== lastReceivedClipboardTextRef.current && sessionRef.current) {
                lastSentClipboardTextRef.current = text;
                await sendClipboardToSession(sessionRef.current, text);
              }
            } catch (_) {}
          });
        }

        if (domainStr) {
          builder.serverDomain(domainStr);
        }

        if (canvasRef.current) {
          builder.renderCanvas(canvasRef.current);
        }

        console.log(`🚀 [IronRDP WASM] Conectando a ${destinationStr} (protocolo=${tokenResponse.protocolLabel || 'auto'}, credssp=${useCredssp}, clipboard=${isClipboardEnabled}, drive=${isDriveEnabled})...`);
        
        currentSession = await builder.connect();
        sessionRef.current = currentSession;
        console.log('✅ [IronRDP WASM] Sesión RDP conectada');

        // Inicializar FileTransferProvider con la sesión activa
        if (currentFileTransferProvider) {
          try {
            currentFileTransferProvider.setSession(currentSession);

            currentFileTransferProvider.on('upload-progress', (progress) => {
              setActiveTransfers(prev => ({
                ...prev,
                [progress.transferId]: {
                  name: progress.fileName,
                  type: 'upload',
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

            currentFileTransferProvider.on('upload-complete', (file, fileIndex, transferId) => {
              console.log('✅ [IronRDP FileTransfer] Subida completada:', file?.name);
              setActiveTransfers(prev => {
                const next = { ...prev };
                delete next[transferId];
                return next;
              });
              toastRef.current?.show({
                severity: 'success',
                summary: 'Archivo Transferido',
                detail: `${file?.name || 'Archivo'} subido a la sesión remota`,
                life: 3000
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
            });

            currentFileTransferProvider.on('error', (err) => {
              console.warn('⚠️ [IronRDP FileTransfer] Error:', err);
            });
          } catch (ftpInitErr) {
            console.warn('[IronRDP FileTransfer] Error asociando sesión:', ftpInitErr);
          }
        }

        // Enviar estado inicial del portapapeles local inmediatamente tras conectar
        if (isClipboardEnabled) {
          readLocalClipboardText().then((initText) => {
            if (initText && isMounted && currentSession) {
              lastSentClipboardTextRef.current = initText;
              sendClipboardToSession(currentSession, initText);
            }
          }).catch(() => {});
        }

        if (isMounted) {
          setConnectionState('connected');
          setTimeout(() => {
            canvasRef.current?.focus();
          }, 100);
        }

        // Ejecutar sesión RDP
        currentSession.run().then((terminationInfo) => {
          console.log('ℹ️ [IronRDP WASM] Sesión terminada:', terminationInfo?.reason?.() || terminationInfo);
          if (isMounted) {
            setConnectionState('disconnected');
          }
        }).catch((err) => {
          const detail = extractErrorMessage(err);
          console.error('❌ [IronRDP WASM] Error en ejecución de sesión:', detail, err);
          if (isMounted) {
            setConnectionState('error');
            setErrorMessage(detail);
          }
        });

      } catch (err) {
        const detail = extractErrorMessage(err);
        console.error('❌ [IronRDP WASM] Error conectando:', detail, err);
        if (isMounted) {
          setConnectionState('error');
          setErrorMessage(detail);
        }
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
        try { currentSession.shutdown(); } catch (e) {}
      }
      sessionRef.current = null;
    };
  }, [rdpConfig]);

  // Manejo de enfoque dinámico del canvas al activar pestaña
  useEffect(() => {
    if (connectionState === 'connected' && isActive && canvasRef.current) {
      canvasRef.current.focus();
    }
  }, [connectionState, isActive]);

  // Sincronización periódica y por enfoque del portapapeles Local -> Remoto
  useEffect(() => {
    if (connectionState !== 'connected' || !sessionRef.current || !isActive) return;
    const isClipboardEnabled = rdpConfig.redirectClipboard !== false;
    if (!isClipboardEnabled) return;

    let isDisposed = false;

    const syncLocalClipboardToRemote = async () => {
      if (isDisposed || !sessionRef.current) return;
      try {
        const text = await readLocalClipboardText();
        if (
          text &&
          text !== lastReceivedClipboardTextRef.current &&
          text !== lastSentClipboardTextRef.current
        ) {
          lastSentClipboardTextRef.current = text;
          await sendClipboardToSession(sessionRef.current, text);
        }
      } catch (_) {}
    };

    // Sincronizar inmediatamente al activarse
    syncLocalClipboardToRemote();

    const handleWindowFocus = () => {
      syncLocalClipboardToRemote();
    };

    window.addEventListener('focus', handleWindowFocus);
    const intervalId = setInterval(syncLocalClipboardToRemote, 500);

    return () => {
      isDisposed = true;
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(intervalId);
    };
  }, [connectionState, isActive, rdpConfig.redirectClipboard]);

  // Manejo de eventos de entrada (Ratón y Teclado) para IronRDP WASM
  useEffect(() => {
    if (connectionState !== 'connected' || !canvasRef.current) return;
    const canvas = canvasRef.current;

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
      F7: 0x41, F8: 0x42, F9: 0x43, F10: 0x44, F11: 0x57, F12: 0x58
    };

    const getCanvasPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: Math.floor((e.clientX - rect.left) * scaleX),
        y: Math.floor((e.clientY - rect.top) * scaleY)
      };
    };

    const handleMouseMove = (e) => {
      if (!sessionRef.current) return;
      const { x, y } = getCanvasPos(e);
      try {
        const transaction = new Backend.InputTransaction();
        transaction.addEvent(Backend.DeviceEvent.mouseMove(x, y));
        sessionRef.current.applyInputs(transaction);
      } catch (err) {}
    };

    const handleMouseDown = (e) => {
      if (!sessionRef.current) return;
      canvas.focus();
      e.preventDefault();
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
      try {
        const transaction = new Backend.InputTransaction();
        transaction.addEvent(Backend.DeviceEvent.wheelRotations(isVertical, delta, 0));
        sessionRef.current.applyInputs(transaction);
      } catch (err) {}
    };

    const handleKeyDown = (e) => {
      if (!sessionRef.current) return;

      // Si el usuario pulsa Ctrl+V (o Cmd+V), asegurar sincronización del portapapeles local antes de pegar
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyV' || e.key === 'v' || e.key === 'V')) {
        const isClipboardEnabled = rdpConfig.redirectClipboard !== false;
        if (isClipboardEnabled) {
          readLocalClipboardText().then((text) => {
            if (text && text !== lastReceivedClipboardTextRef.current && sessionRef.current) {
              lastSentClipboardTextRef.current = text;
              sendClipboardToSession(sessionRef.current, text);
            }
          }).catch(() => {});
        }
      }

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
      } catch (err) {}
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
      } catch (err) {}
    };

    const handlePaste = async (e) => {
      const isClipboardEnabled = rdpConfig.redirectClipboard !== false;
      if (!isClipboardEnabled || !sessionRef.current) return;

      let text = e.clipboardData?.getData('text/plain') || '';
      if (!text) {
        text = await readLocalClipboardText();
      }

      if (text && text !== lastReceivedClipboardTextRef.current) {
        lastSentClipboardTextRef.current = text;
        console.log('📋 [IronRDP Clipboard] Evento Paste -> enviando a remoto:', text.slice(0, 80));
        await sendClipboardToSession(sessionRef.current, text);
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

  // Manejo de redimensionado de canvas dinámico
  useEffect(() => {
    if (!containerRef.current || connectionState !== 'connected') return;

    let resizeTimer = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!containerRef.current || !sessionRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const alignDesktop = (n) => {
          const base = Math.max(1, Math.floor(n));
          return (base + 3) & ~3;
        };
        const width = alignDesktop(Math.max(800, rect.width || window.innerWidth));
        const height = alignDesktop(Math.max(600, rect.height || window.innerHeight));

        try {
          console.log(`📐 [IronRDP WASM] Redimensionando escritorio a ${width}x${height}`);
          sessionRef.current.requestDesktopSize(new Backend.DesktopSize(width, height));
        } catch (e) {
          console.warn('[IronRDP WASM] requestDesktopSize no soportado o falló:', e);
        }
      }, 300);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [connectionState]);

  const handleSendCtrlAltDel = () => {
    if (sessionRef.current) {
      try {
        const transaction = new Backend.InputTransaction();
        transaction.addEvent(Backend.DeviceEvent.keyPressed(0x1D)); // Ctrl
        transaction.addEvent(Backend.DeviceEvent.keyPressed(0x38)); // Alt
        transaction.addEvent(Backend.DeviceEvent.keyPressed(0x53)); // Delete
        transaction.addEvent(Backend.DeviceEvent.keyReleased(0x53));
        transaction.addEvent(Backend.DeviceEvent.keyReleased(0x38));
        transaction.addEvent(Backend.DeviceEvent.keyReleased(0x1D));
        sessionRef.current.applyInputs(transaction);
      } catch (e) {
        console.error('Error enviando Ctrl+Alt+Del:', e);
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
            fileTransferProviderRef.current.uploadFiles(dropped);
            toastRef.current?.show({
              severity: 'info',
              summary: 'Iniciando Transferencia',
              detail: `Subiendo ${dropped.length} archivo(s) a la sesión RDP...`,
              life: 3000
            });
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

      {/* Elemento Canvas HTML5 para IronRDP WASM siempre presente en el DOM */}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        onClick={() => canvasRef.current?.focus()}
        onMouseDown={() => canvasRef.current?.focus()}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          backgroundColor: '#000000',
          outline: 'none',
          cursor: 'default'
        }}
      />

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
      {Object.keys(activeTransfers).length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            backgroundColor: 'rgba(20, 24, 33, 0.94)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '8px',
            padding: '10px 14px',
            zIndex: 100,
            minWidth: '260px',
            maxWidth: '340px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}
        >
          <div className="text-xs font-semibold text-blue-400 mb-2 flex align-items-center justify-content-between">
            <span>Transferencias en curso</span>
            <i className="pi pi-sync pi-spin text-xs"></i>
          </div>
          {Object.entries(activeTransfers).map(([id, t]) => (
            <div key={id} className="mb-2 last:mb-0">
              <div className="flex justify-content-between text-xs text-gray-300 mb-1">
                <span className="text-truncate" style={{ maxWidth: '180px' }} title={t.name}>{t.name}</span>
                <span className="font-medium text-blue-300">{Math.round(t.percentage)}%</span>
              </div>
              <ProgressBar value={Math.round(t.percentage)} showValue={false} style={{ height: '4px' }} />
            </div>
          ))}
        </div>
      )}

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

      {connectionState === 'error' && (
        <div
          className="flex flex-column align-items-center justify-content-center text-white gap-3 p-4 text-center"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#141821',
            zIndex: 10
          }}
        >
          <i className="pi pi-exclamation-triangle text-red-500" style={{ fontSize: '3rem' }}></i>
          <h3 className="m-0 text-red-400">Error de Conexión RDP Web</h3>
          <p className="m-0 text-sm text-gray-300 max-w-26rem">{errorMessage || 'Ocurrió un error inesperado al establecer la sesión RDP'}</p>
        </div>
      )}

      {connectionState === 'disconnected' && (
        <div className="flex flex-column align-items-center justify-content-center h-full text-white gap-3">
          <i className="pi pi-desktop text-gray-500" style={{ fontSize: '3rem' }}></i>
          <h4 className="m-0 text-gray-300">Sesión RDP Finalizada</h4>
        </div>
      )}

      {/* Barra flotante de utilidades RDP (HTML5 Canvas) */}
      {connectionState === 'connected' && (
        <div
          onMouseEnter={() => setIsToolbarHovered(true)}
          onMouseLeave={() => setIsToolbarHovered(false)}
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'all 0.25s ease-in-out',
            marginTop: (isToolbarPinned || isToolbarHovered) ? '0px' : '-28px',
            opacity: (isToolbarPinned || isToolbarHovered) ? 1 : 0.45
          }}
        >
          <div
            className="flex align-items-center gap-2 px-3 py-1 border-round-bottom shadow-4"
            style={{
              backgroundColor: 'rgba(20, 24, 33, 0.92)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderTop: 'none',
              color: '#ffffff',
              fontSize: '12px'
            }}
          >
            <span className="flex align-items-center gap-1 font-semibold text-blue-400" style={{ fontSize: '11px' }}>
              <i className="pi pi-globe text-xs"></i> {rdpConfig?.hostname || rdpConfig?.server || 'RDP Web'}
            </span>

            <span style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.2)' }} />

            <Button
              icon="pi pi-key"
              label="Ctrl+Alt+Del"
              tooltip="Enviar Ctrl+Alt+Del"
              tooltipOptions={{ position: 'bottom' }}
              size="small"
              className="p-button-text p-button-secondary p-button-sm text-xs py-0 px-2"
              style={{ color: '#e0e0e0', fontSize: '11px' }}
              onClick={handleSendCtrlAltDel}
            />

            <Button
              icon="pi pi-send"
              tooltip="Enviar texto al portapapeles remoto"
              tooltipOptions={{ position: 'bottom' }}
              size="small"
              className="p-button-text p-button-secondary p-button-sm text-xs py-0 px-2"
              style={{ color: '#e0e0e0', fontSize: '11px' }}
              onClick={() => setShowClipboardDialog(true)}
            />

            {isDriveEnabled && (
              <Button
                icon="pi pi-upload"
                tooltip="Subir archivos a la sesión remota"
                tooltipOptions={{ position: 'bottom' }}
                size="small"
                className="p-button-text p-button-secondary p-button-sm text-xs py-0 px-2"
                style={{ color: '#e0e0e0', fontSize: '11px' }}
                onClick={async () => {
                  if (fileTransferProviderRef.current) {
                    try {
                      const files = await fileTransferProviderRef.current.showFilePicker({ multiple: true });
                      if (files && files.length) {
                        fileTransferProviderRef.current.uploadFiles(files);
                        toastRef.current?.show({
                          severity: 'info',
                          summary: 'Iniciando Transferencia',
                          detail: `Subiendo ${files.length} archivo(s)...`,
                          life: 3000
                        });
                      }
                    } catch (e) {
                      console.warn('Selector de archivos cancelado o error:', e);
                    }
                  }
                }}
              />
            )}

            <Button
              icon="pi pi-window-maximize"
              tooltip="Pantalla Completa"
              tooltipOptions={{ position: 'bottom' }}
              size="small"
              className="p-button-text p-button-secondary p-button-sm text-xs py-0 px-2"
              style={{ color: '#e0e0e0', fontSize: '11px' }}
              onClick={handleToggleFullscreen}
            />

            <Button
              icon={isToolbarPinned ? "pi pi-bookmark-fill" : "pi pi-bookmark"}
              tooltip={isToolbarPinned ? "Desfijar barra flotante" : "Fijar barra siempre visible"}
              tooltipOptions={{ position: 'bottom' }}
              size="small"
              className="p-button-text p-button-secondary p-button-sm text-xs py-0 px-2"
              style={{ color: isToolbarPinned ? '#64b5f6' : '#a0a0a0', fontSize: '11px' }}
              onClick={() => setIsToolbarPinned(!isToolbarPinned)}
            />
          </div>
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
                  await sendClipboardToSession(sessionRef.current, clipboardText);
                  lastSentClipboardTextRef.current = clipboardText;

                  const transaction = new Backend.InputTransaction();
                  for (const char of clipboardText) {
                    transaction.addEvent(Backend.DeviceEvent.unicodePressed(char));
                    transaction.addEvent(Backend.DeviceEvent.unicodeReleased(char));
                  }
                  sessionRef.current.applyInputs(transaction);
                  setShowClipboardDialog(false);
                  setClipboardText('');
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
};

export default IronRdpCanvasTab;
