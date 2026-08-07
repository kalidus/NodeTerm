import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Backend, init as initIronRdp, enableCredssp, displayControl } from '@devolutions/iron-remote-desktop-rdp';

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
    } catch {
      msg = String(err);
    }
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

        // 1. Inicializar módulo WebAssembly de IronRDP pasando cadena de configuración de log
        console.log('⏳ [IronRDP WASM] Cargando motor WebAssembly RDP...');
        await initIronRdp('');

        // 2. Obtener dimensiones del contenedor o ventana
        const rect = containerRef.current?.getBoundingClientRect() || { width: 1600, height: 1000 };
        const width = Math.max(800, Math.floor(rect.width || window.innerWidth));
        const height = Math.max(600, Math.floor(rect.height || window.innerHeight));

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
        const host = String(rdpConfig.hostname || rdpConfig.server || rdpConfig.host || '127.0.0.1');
        const port = parseInt(rdpConfig.port, 10) || 3389;
        const destinationStr = `${host}:${port}`;
        const usernameStr = String(rdpConfig.username || rdpConfig.user || '');
        const passwordStr = String(rdpConfig.password || '');
        const proxyAddressStr = String(tokenResponse.wsUrl || '');
        const authTokenStr = String(tokenResponse.tokenId || '');

        const builder = new Backend.SessionBuilder()
          .username(usernameStr)
          .password(passwordStr)
          .destination(destinationStr)
          .proxyAddress(proxyAddressStr)
          .authToken(authTokenStr)
          .desktopSize(new Backend.DesktopSize(width, height))
          .setCursorStyleCallback(() => {})
          .setCursorStyleCallbackContext({})
          .extension(enableCredssp(true))
          .extension(displayControl(true));

        if (rdpConfig.domain || rdpConfig.serverDomain) {
          builder.serverDomain(String(rdpConfig.domain || rdpConfig.serverDomain));
        }

        if (canvasRef.current) {
          builder.renderCanvas(canvasRef.current);
        }

        console.log(`🚀 [IronRDP WASM] Iniciando sesión RDP para ${destinationStr} vía ${tokenResponse.wsUrl}...`);
        console.log('⏳ [IronRDP WASM] Ejecutando builder.connect()...');
        
        currentSession = await builder.connect();
        sessionRef.current = currentSession;
        console.log('✅ [IronRDP WASM] builder.connect() completado con éxito!');

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
