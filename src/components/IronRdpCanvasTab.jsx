import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Backend, init as initIronRdp, enableCredssp, displayControl } from '@devolutions/iron-remote-desktop-rdp';
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

const IronRdpCanvasTab = ({ tabId, rdpConfig = {}, isActive = true }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const sessionRef = useRef(null);

  const [connectionState, setConnectionState] = useState('connecting'); // connecting, connected, error, disconnected
  const [errorMessage, setErrorMessage] = useState('');
  const [isToolbarPinned, setIsToolbarPinned] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const [showClipboardDialog, setShowClipboardDialog] = useState(false);
  const [clipboardText, setClipboardText] = useState('');

  useEffect(() => {
    let isMounted = true;
    let currentSession = null;

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

        if (domainStr) {
          builder.serverDomain(domainStr);
        }

        if (canvasRef.current) {
          builder.renderCanvas(canvasRef.current);
        }

        console.log(`🚀 [IronRDP WASM] Conectando a ${destinationStr} (protocolo=${tokenResponse.protocolLabel || 'auto'}, credssp=${useCredssp})...`);
        
        currentSession = await builder.connect();
        sessionRef.current = currentSession;
        console.log('✅ [IronRDP WASM] Sesión RDP conectada');

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
      // Mapeo botones: 0 -> Izquierdo (0), 1 -> Central (1), 2 -> Derecho (2)
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

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('keyup', handleKeyUp);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('keyup', handleKeyUp);
    };
  }, [connectionState]);

  // Manejo de redimensionamiento dinámico del canvas RDP
  useEffect(() => {
    if (connectionState !== 'connected' || !sessionRef.current || !containerRef.current) return;

    const handleResize = () => {
      if (!containerRef.current || !sessionRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w > 320 && h > 240) {
        try {
          sessionRef.current.resize(w, h);
        } catch (e) {
          console.warn('Advertencia redimensionando IronRDP:', e);
        }
      }
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
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#141821',
        overflow: 'hidden'
      }}
    >
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
            <Button label="Enviar" icon="pi pi-check" className="p-button-primary p-button-sm" onClick={() => {
              if (sessionRef.current && clipboardText) {
                try {
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
