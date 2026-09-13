import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import RFB from '@novnc/novnc';
import '../styles/components/vnc-toolbar.css';

const VncCanvasTab = forwardRef(({
  tabId,
  vncConfig: propVncConfig,
  rdpConfig: propRdpConfig, // Compatibilidad con el contenedor de pestañas existente
  isActive = true,
  onClose
}, ref) => {
  const config = propVncConfig || propRdpConfig || {};
  const host = config.hostname || config.server || config.host || '127.0.0.1';
  const port = parseInt(config.port, 10) || 5900;
  const initialUsername = config.username || config.user || '';
  const initialPassword = config.password || '';

  const toastRef = useRef(null);
  const containerRef = useRef(null);
  const rfbRef = useRef(null);

  // Estados de conexión
  // 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'
  const [connectionState, setConnectionState] = useState('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [desktopName, setDesktopName] = useState('');

  // Estados de configuración de visualización
  const [scaleViewport, setScaleViewport] = useState(config.autoResize !== false);
  const [isReadOnly, setIsReadOnly] = useState(config.readOnly === true);

  // Estados de barra de herramientas flotante
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const [isToolbarPinned, setIsToolbarPinned] = useState(false);

  // Estados de diálogo de portapapeles y contraseña
  const [showClipboardDialog, setShowClipboardDialog] = useState(false);
  const [clipboardText, setClipboardText] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [usernameInput, setUsernameInput] = useState(initialUsername);
  const [passwordInput, setPasswordInput] = useState(initialPassword);
  const [credentialsTypes, setCredentialsTypes] = useState(['password']);

  // Manejador imperativo expuesto al padre (cerrar o desconectar)
  useImperativeHandle(ref, () => ({
    disconnect: () => {
      if (rfbRef.current) {
        rfbRef.current.disconnect();
      }
    },
    reconnect: () => {
      startConnection();
    }
  }));

  /**
   * Inicia el proceso de conexión nativo:
   * 1. Solicita token al puente TCP local
   * 2. Conecta noVNC vía WebSocket binario
   */
  const startConnection = useCallback(async () => {
    if (rfbRef.current) {
      try {
        rfbRef.current.disconnect();
      } catch (_) {}
      rfbRef.current = null;
    }

    setConnectionState('connecting');
    setErrorMessage('');

    try {
      // 1. Obtener token del puente nativo de Electron
      const tokenPayload = {
        hostname: host,
        port: port,
        username: usernameInput || initialUsername,
        password: passwordInput || initialPassword,
        readOnly: isReadOnly
      };

      let tokenResponse = null;
      if (window.electron?.ipcRenderer?.invoke) {
        tokenResponse = await window.electron.ipcRenderer.invoke('vnc:create-native-bridge-token', tokenPayload);
      } else if (window.electronAPI?.vnc?.createNativeBridgeToken) {
        tokenResponse = await window.electronAPI.vnc.createNativeBridgeToken(tokenPayload);
      } else {
        throw new Error('API de IPC de Electron no disponible para VNC');
      }

      if (!tokenResponse || !tokenResponse.success) {
        setConnectionState('error');
        setErrorMessage(tokenResponse?.error || 'No se pudo contactar con el servidor VNC.');
        return;
      }

      if (!containerRef.current) {
        setConnectionState('error');
        setErrorMessage('El contenedor del lienzo VNC no está disponible.');
        return;
      }

      // Limpiar contenedor previo
      containerRef.current.innerHTML = '';

      // 2. Inicializar cliente noVNC (RFB)
      const credentials = {};
      const effectiveUser = usernameInput || initialUsername;
      const effectivePass = passwordInput || initialPassword;
      if (effectiveUser) credentials.username = effectiveUser;
      if (effectivePass) credentials.password = effectivePass;

      const rfb = new RFB(containerRef.current, tokenResponse.wsUrl, {
        credentials,
        wsProtocols: ['binary']
      });

      rfbRef.current = rfb;

      // Configuración de visualización y modo
      rfb.scaleViewport = scaleViewport;
      rfb.resizeSession = false;
      rfb.viewOnly = isReadOnly;
      rfb.clipViewport = false;
      rfb.dragViewport = false;

      // Eventos de RFB
      rfb.addEventListener('connect', () => {
        setConnectionState('connected');
        toastRef.current?.show({
          severity: 'success',
          summary: 'VNC Conectado',
          detail: `Conectado exitosamente a ${host}:${port}`,
          life: 2500
        });
      });

      rfb.addEventListener('disconnect', (e) => {
        setConnectionState('disconnected');
        const clean = e.detail?.clean;
        if (!clean) {
          setErrorMessage('La conexión con el servidor VNC se interrumpió.');
        }
      });

      rfb.addEventListener('credentialsrequired', (e) => {
        const types = e.detail?.types || ['password'];
        setCredentialsTypes(types);
        setShowPasswordDialog(true);
      });

      rfb.addEventListener('securityfailure', (e) => {
        setConnectionState('error');
        const status = e.detail?.status;
        setErrorMessage(`Fallo de seguridad o autenticación VNC (código: ${status || 'desconocido'}). Comprueba la contraseña.`);
      });

      rfb.addEventListener('clipboard', (e) => {
        if (e.detail && e.detail.text) {
          try {
            if (window.electron?.clipboard?.writeText) {
              window.electron.clipboard.writeText(e.detail.text);
            } else if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(e.detail.text);
            }
          } catch (_) {}
        }
      });

      rfb.addEventListener('desktopname', (e) => {
        if (e.detail?.name) {
          setDesktopName(e.detail.name);
        }
      });

    } catch (err) {
      console.error('Error iniciando conexión VNC:', err);
      setConnectionState('error');
      setErrorMessage(err.message || 'Error inesperado al conectar.');
    }
  }, [host, port, initialUsername, initialPassword, usernameInput, passwordInput, isReadOnly, scaleViewport]);

  // Iniciar conexión al montar el componente
  useEffect(() => {
    startConnection();

    return () => {
      if (rfbRef.current) {
        try {
          rfbRef.current.disconnect();
        } catch (_) {}
        rfbRef.current = null;
      }
    };
  }, [startConnection]);

  // Actualizar modo de escala en noVNC dinámicamente
  useEffect(() => {
    if (rfbRef.current) {
      rfbRef.current.scaleViewport = scaleViewport;
    }
  }, [scaleViewport]);

  // Actualizar modo de solo lectura en noVNC dinámicamente
  useEffect(() => {
    if (rfbRef.current) {
      rfbRef.current.viewOnly = isReadOnly;
    }
  }, [isReadOnly]);

  // Acción: Enviar Ctrl+Alt+Del
  const handleSendCtrlAltDel = () => {
    if (rfbRef.current) {
      rfbRef.current.sendCtrlAltDel();
      toastRef.current?.show({
        severity: 'info',
        summary: 'Secuencia Enviada',
        detail: 'Ctrl+Alt+Del enviado al servidor VNC',
        life: 1800
      });
    }
  };

  // Acción: Enviar Tecla Windows
  const handleSendWinKey = () => {
    if (rfbRef.current) {
      // 0xFFEB es el Keysym para Meta/Super/Windows Left
      rfbRef.current.sendKey(0xFFEB, 'MetaLeft', true);
      setTimeout(() => {
        rfbRef.current?.sendKey(0xFFEB, 'MetaLeft', false);
      }, 100);
      toastRef.current?.show({
        severity: 'info',
        summary: 'Secuencia Enviada',
        detail: 'Tecla Windows enviada al servidor',
        life: 1500
      });
    }
  };

  // Acción: Pegar texto al portapapeles remoto
  const handlePasteClipboard = () => {
    if (rfbRef.current && clipboardText) {
      rfbRef.current.clipboardPasteFrom(clipboardText);
      setShowClipboardDialog(false);
      setClipboardText('');
      toastRef.current?.show({
        severity: 'success',
        summary: 'Portapapeles',
        detail: 'Texto enviado a la sesión remota',
        life: 2000
      });
    }
  };

  // Acción: Cargar portapapeles local al abrir diálogo
  const handleOpenClipboardDialog = async () => {
    try {
      let text = '';
      if (window.electron?.clipboard?.readText) {
        text = await window.electron.clipboard.readText();
      } else if (navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText();
      }
      setClipboardText(text || '');
    } catch (_) {}
    setShowClipboardDialog(true);
  };

  // Acción: Enviar credenciales solicitadas
  const handleSubmitPassword = () => {
    if (rfbRef.current) {
      const creds = {};
      if (usernameInput) creds.username = usernameInput;
      if (passwordInput) creds.password = passwordInput;
      rfbRef.current.sendCredentials(creds);
      setShowPasswordDialog(false);
    }
  };

  // Acción: Alternar Pantalla Completa
  const handleToggleFullscreen = () => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(err => console.warn('Error solicitando fullscreen:', err));
    } else {
      document.exitFullscreen().catch(err => console.warn('Error saliendo de fullscreen:', err));
    }
  };

  return (
    <div className="vnc-canvas-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Toast ref={toastRef} />

      {/* Barra flotante de utilidades VNC Cyberpunk */}
      {connectionState === 'connected' && (
        <div
          onMouseEnter={() => setIsToolbarHovered(true)}
          onMouseLeave={() => setIsToolbarHovered(false)}
          className={`vnc-toolbar-wrapper ${(isToolbarPinned || isToolbarHovered) ? 'is-visible' : 'is-hidden'}`}
        >
          <div className="vnc-cyber-bar">
            {/* Host Badge */}
            <span className="vnc-badge-host" title={`Servidor VNC: ${host}:${port}`}>
              <i className="pi pi-desktop"></i>
              <span>{desktopName || `${host}:${port}`}</span>
            </span>

            <span className="vnc-cyber-divider" />

            {/* Scale Toggle Badge */}
            <button
              type="button"
              className={`vnc-badge-scale ${scaleViewport ? 'active' : ''}`}
              title="Alternar entre ajustar a ventana o escala real 1:1"
              onClick={() => setScaleViewport(!scaleViewport)}
            >
              <i className={`pi ${scaleViewport ? 'pi-expand' : 'pi-arrows-alt'}`}></i>
              <span>{scaleViewport ? 'Auto-Ajuste' : '1:1 Real'}</span>
            </button>

            <span className="vnc-cyber-divider" />

            {/* Ctrl + Alt + Del */}
            <button
              type="button"
              className="vnc-cyber-btn vnc-cyber-btn-cad"
              title="Enviar Ctrl+Alt+Del"
              onClick={handleSendCtrlAltDel}
            >
              <i className="pi pi-key"></i>
              <span>Ctrl+Alt+Del</span>
            </button>

            {/* Tecla Windows */}
            <button
              type="button"
              className="vnc-cyber-btn"
              title="Enviar Tecla Windows"
              onClick={handleSendWinKey}
            >
              <i className="pi pi-microsoft"></i>
              <span>Win</span>
            </button>

            {/* Portapapeles */}
            <button
              type="button"
              className="vnc-cyber-btn"
              title="Enviar texto al portapapeles remoto"
              onClick={handleOpenClipboardDialog}
            >
              <i className="pi pi-send"></i>
              <span>Portapapeles</span>
            </button>

            {/* Solo Lectura */}
            <button
              type="button"
              className={`vnc-cyber-btn ${isReadOnly ? 'active' : ''}`}
              title={isReadOnly ? 'Modo Solo Lectura activo (haz clic para interactuar)' : 'Activar Modo Solo Lectura (sin eventos de teclado/ratón)'}
              onClick={() => setIsReadOnly(!isReadOnly)}
            >
              <i className={`pi ${isReadOnly ? 'pi-eye' : 'pi-pencil'}`}></i>
              <span>{isReadOnly ? 'Solo Lectura' : 'Control'}</span>
            </button>

            {/* Pantalla Completa */}
            <button
              type="button"
              className="vnc-cyber-btn"
              title="Pantalla Completa"
              onClick={handleToggleFullscreen}
            >
              <i className="pi pi-window-maximize"></i>
            </button>

            {/* Fijar Barra */}
            <button
              type="button"
              className={`vnc-cyber-btn ${isToolbarPinned ? 'active' : ''}`}
              title={isToolbarPinned ? 'Desfijar barra flotante' : 'Fijar barra siempre visible'}
              onClick={() => setIsToolbarPinned(!isToolbarPinned)}
            >
              <i className={isToolbarPinned ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'}></i>
            </button>

            {/* Desconectar */}
            <button
              type="button"
              className="vnc-cyber-btn vnc-cyber-btn-disconnect"
              title="Desconectar sesión VNC"
              onClick={() => rfbRef.current?.disconnect()}
            >
              <i className="pi pi-power-off"></i>
            </button>
          </div>

          {!(isToolbarPinned || isToolbarHovered) && (
            <div
              onClick={() => setIsToolbarPinned(true)}
              className="vnc-cyber-handle"
              title="Mostrar barra de herramientas VNC"
            />
          )}
        </div>
      )}

      {/* Overlay de Carga */}
      {connectionState === 'connecting' && (
        <div className="vnc-status-overlay">
          <div className="vnc-status-card">
            <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="4" />
            <h3 className="vnc-status-title" style={{ marginTop: '1rem' }}>Conectando a VNC...</h3>
            <p className="vnc-status-desc">{host}:{port} (noVNC Nativo sin Guacamole)</p>
          </div>
        </div>
      )}

      {/* Overlay de Error */}
      {connectionState === 'error' && (
        <div className="vnc-status-overlay">
          <div className="vnc-status-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
            <i className="pi pi-exclamation-triangle" style={{ fontSize: '2.5rem', color: '#ef4444', marginBottom: '1rem' }}></i>
            <h3 className="vnc-status-title" style={{ color: '#ef4444' }}>Error de Conexión VNC</h3>
            <p className="vnc-status-desc">{errorMessage || 'No se pudo establecer la sesión con el servidor remoto.'}</p>
            <div className="flex justify-content-center gap-3">
              <Button
                label="Reintentar"
                icon="pi pi-refresh"
                className="p-button-outlined p-button-success"
                onClick={startConnection}
              />
              {onClose && (
                <Button
                  label="Cerrar Pestaña"
                  icon="pi pi-times"
                  className="p-button-outlined p-button-secondary"
                  onClick={onClose}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overlay de Desconexión */}
      {connectionState === 'disconnected' && (
        <div className="vnc-status-overlay">
          <div className="vnc-status-card">
            <i className="pi pi-info-circle" style={{ fontSize: '2.5rem', color: '#00ff9d', marginBottom: '1rem' }}></i>
            <h3 className="vnc-status-title">Sesión VNC Finalizada</h3>
            <p className="vnc-status-desc">La conexión con {host}:{port} se ha cerrado.</p>
            <div className="flex justify-content-center gap-3">
              <Button
                label="Reconectar"
                icon="pi pi-refresh"
                className="p-button-outlined p-button-success"
                onClick={startConnection}
              />
              {onClose && (
                <Button
                  label="Cerrar Pestaña"
                  icon="pi pi-times"
                  className="p-button-outlined p-button-secondary"
                  onClick={onClose}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contenedor del Canvas de noVNC */}
      <div
        ref={containerRef}
        className="vnc-canvas-viewport"
        style={{
          width: '100%',
          height: '100%',
          overflow: scaleViewport ? 'hidden' : 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none'
        }}
        tabIndex={0}
      />

      {/* Diálogo para Enviar Portapapeles */}
      <Dialog
        header="Enviar Texto al Portapapeles Remoto"
        visible={showClipboardDialog}
        onHide={() => setShowClipboardDialog(false)}
        style={{ width: '450px' }}
        modal
        footer={
          <div className="flex justify-content-end gap-2">
            <Button label="Cancelar" icon="pi pi-times" className="p-button-text" onClick={() => setShowClipboardDialog(false)} />
            <Button label="Enviar" icon="pi pi-send" className="p-button-success" onClick={handlePasteClipboard} />
          </div>
        }
      >
        <p className="text-sm text-color-secondary mb-2">
          El texto introducido se sincronizará con el portapapeles del servidor VNC remoto:
        </p>
        <InputTextarea
          value={clipboardText}
          onChange={(e) => setClipboardText(e.target.value)}
          rows={5}
          className="w-full"
          placeholder="Escribe o pega el texto aquí..."
          autoFocus
        />
      </Dialog>

      {/* Diálogo para Autenticación interactiva (si no se proveyó contraseña o requiere credenciales) */}
      <Dialog
        header="Autenticación VNC Requerida"
        visible={showPasswordDialog}
        onHide={() => setShowPasswordDialog(false)}
        style={{ width: '400px' }}
        modal
        footer={
          <div className="flex justify-content-end gap-2">
            <Button label="Cancelar" icon="pi pi-times" className="p-button-text" onClick={() => setShowPasswordDialog(false)} />
            <Button label="Conectar" icon="pi pi-check" className="p-button-success" onClick={handleSubmitPassword} />
          </div>
        }
      >
        <p className="text-sm text-color-secondary mb-3">
          El servidor VNC en {host}:{port} requiere credenciales para autorizar el acceso:
        </p>
        <div className="mb-3">
          <label className="block text-xs font-semibold mb-1 opacity-70">USUARIO (OPCIONAL)</label>
          <input
            type="text"
            className="p-inputtext w-full"
            placeholder="Usuario VNC (si el servidor lo requiere)"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitPassword()}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 opacity-70">CONTRASEÑA VNC</label>
          <input
            type="password"
            className="p-inputtext w-full"
            placeholder="Contraseña VNC"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitPassword()}
            autoFocus
          />
        </div>
      </Dialog>
    </div>
  );
});

VncCanvasTab.displayName = 'VncCanvasTab';

export default VncCanvasTab;
