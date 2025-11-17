import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import '../styles/components/open-webui.css';

const INITIAL_STATUS = {
  phase: 'init',
  message: 'Preparando Open WebUI...',
  isRunning: false
};

const OpenWebUITab = () => {
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [webviewState, setWebviewState] = useState('idle');
  const webviewRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const invokeOpenWebUI = useCallback(async (method) => {
    if (!window.electron?.openWebUI || typeof window.electron.openWebUI[method] !== 'function') {
      throw new Error('API Open WebUI no disponible en este entorno.');
    }
    const response = await window.electron.openWebUI[method]();
    if (!response || response.success === false) {
      throw new Error(response?.error || 'No se pudo comunicar con Open WebUI.');
    }
    return response;
  }, []);

  const startService = useCallback(async () => {
    setError(null);
    setIsReady(false);
    setWebviewState('idle');
    setStatus((prev) => ({
      ...prev,
      phase: 'starting',
      message: 'Iniciando contenedor Open WebUI...'
    }));
    try {
      const response = await invokeOpenWebUI('start');
      if (!mountedRef.current) return;
      const nextStatus = response.status || INITIAL_STATUS;
      setStatus(nextStatus);
      setIsReady(Boolean(nextStatus.isRunning));

      if (nextStatus.url) {
        setUrl(nextStatus.url);
      } else {
        const urlResponse = await invokeOpenWebUI('get-url');
        if (!mountedRef.current) return;
        setUrl(urlResponse.url);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || 'No se pudo iniciar Open WebUI.');
    }
  }, [invokeOpenWebUI]);

  useEffect(() => {
    // Verificar si el servicio está activado en la configuración
    const checkAndStartIfEnabled = () => {
      try {
        const aiClientsConfig = localStorage.getItem('ai_clients_enabled');
        if (aiClientsConfig) {
          const config = JSON.parse(aiClientsConfig);
          if (config.openwebui === true) {
            console.log('[OpenWebUI] Servicio activado en configuración, iniciando...');
            startService();
          } else {
            console.log('[OpenWebUI] Servicio desactivado en configuración, no se iniciará automáticamente');
            setStatus({
              phase: 'disabled',
              message: 'Open WebUI está desactivado. Actívalo en Configuración → Clientes de IA',
              isRunning: false
            });
          }
        } else {
          // Si no hay configuración, asumir que está desactivado por defecto
          console.log('[OpenWebUI] Sin configuración, servicio desactivado por defecto');
          setStatus({
            phase: 'disabled',
            message: 'Open WebUI está desactivado. Actívalo en Configuración → Clientes de IA',
            isRunning: false
          });
        }
      } catch (error) {
        console.error('[OpenWebUI] Error al verificar configuración:', error);
        // En caso de error, no iniciar el servicio
        setStatus({
          phase: 'error',
          message: 'Error al verificar configuración de clientes de IA',
          isRunning: false
        });
      }
    };
    
    checkAndStartIfEnabled();
  }, [startService]);

  useEffect(() => {
    const view = webviewRef.current;
    if (!view || !url) return undefined;
    
    const handleLoadStart = () => {
      console.log('[OpenWebUI] Webview iniciando carga...');
      setWebviewState('loading');
    };
    
    const handleFinishLoad = () => {
      console.log('[OpenWebUI] Webview cargado completamente (did-finish-load)');
      setWebviewState('ready');
    };
    
    const handleDomReady = () => {
      console.log('[OpenWebUI] Webview DOM listo');
      setWebviewState(prev => prev === 'loading' ? 'ready' : prev);
    };
    
    const handleStopLoading = () => {
      console.log('[OpenWebUI] Webview dejó de cargar');
      setTimeout(() => {
        if (view && !view.isLoading()) {
          console.log('[OpenWebUI] Webview verificado como listo (isLoading=false)');
          setWebviewState('ready');
        }
      }, 500);
    };
    
    const handleFail = (event) => {
      console.error('[OpenWebUI] Error cargando webview:', event);
      setWebviewState('error');
    };

    const safetyTimeout = setTimeout(() => {
      console.log('[OpenWebUI] Timeout de seguridad: ocultando overlay');
      setWebviewState(prev => prev === 'loading' ? 'ready' : prev);
    }, 5000);

    view.addEventListener('did-start-loading', handleLoadStart);
    view.addEventListener('did-finish-load', handleFinishLoad);
    view.addEventListener('dom-ready', handleDomReady);
    view.addEventListener('did-stop-loading', handleStopLoading);
    view.addEventListener('did-fail-load', handleFail);

    return () => {
      clearTimeout(safetyTimeout);
      view.removeEventListener('did-start-loading', handleLoadStart);
      view.removeEventListener('did-finish-load', handleFinishLoad);
      view.removeEventListener('dom-ready', handleDomReady);
      view.removeEventListener('did-stop-loading', handleStopLoading);
      view.removeEventListener('did-fail-load', handleFail);
    };
  }, [url, reloadKey]);

  const handleReloadWebView = () => {
    setWebviewState('loading');
    setReloadKey((prev) => prev + 1);
  };

  const renderStatusCard = () => (
    <div className="openwebui-status-card">
      <ProgressSpinner style={{ width: '40px', height: '40px' }} />
      <h3>Preparando Open WebUI…</h3>
      <p>{status.message || 'Inicializando servicio local'}</p>
      <div className="openwebui-meta">
        <div>
          <span>Imagen</span>
          <span>{status.imageName || 'ghcr.io/open-webui/open-webui:main'}</span>
        </div>
        <div>
          <span>Datos</span>
          <span>{status.dataDir || '---'}</span>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="openwebui-error-card">
      <h3>Problema al iniciar Open WebUI</h3>
      <p>{error}</p>
      <ul>
        <li>Verifica que Docker Desktop esté ejecutándose.</li>
        <li>Confirma tu conexión a Internet para descargar la imagen.</li>
        <li>Reintenta con el botón inferior.</li>
      </ul>
      <Button
        label="Reintentar"
        icon="pi pi-sync"
        severity="warning"
        onClick={startService}
      />
    </div>
  );

  const renderDisabled = () => (
    <div className="openwebui-disabled-card" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <i className="pi pi-power-off" style={{ fontSize: '4rem', color: '#9E9E9E', marginBottom: '1.5rem' }} />
      <h3 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>Open WebUI Desactivado</h3>
      <p style={{ marginBottom: '2rem', color: 'var(--text-color-secondary)', maxWidth: '500px' }}>
        Este servicio está desactivado en la configuración. Para usarlo, actívalo primero en la gestión de clientes de IA.
      </p>
      <Button
        label="Ir a Configuración"
        icon="pi pi-cog"
        severity="info"
        onClick={() => {
          // Emitir evento para abrir el diálogo de configuración
          window.dispatchEvent(new CustomEvent('open-settings-dialog', { 
            detail: { tab: 'ai-clients' } 
          }));
        }}
      />
    </div>
  );

  const renderWebView = () => {
    if (!url) return null;
    
    const overlayClass = webviewState === 'ready' ? 'openwebui-overlay fading' : 'openwebui-overlay';
    
    return (
      <div className="openwebui-webview-wrapper">
        {webviewState !== 'ready' && (
          <div className={overlayClass}>
            <ProgressSpinner style={{ width: '36px', height: '36px' }} />
            <p>{webviewState === 'error' ? 'Error cargando la UI' : 'Cargando interfaz de Open WebUI…'}</p>
          </div>
        )}
        <webview
          key={`${url}-${reloadKey}`}
          ref={webviewRef}
          src={url}
          allowpopups="true"
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px', background: 'transparent' }}
          webpreferences="contextIsolation=yes, nodeIntegration=no, webSecurity=yes"
        />
      </div>
    );
  };

  return (
    <div className="openwebui-tab">
      {status.phase === 'disabled' && renderDisabled()}
      {status.phase !== 'disabled' && error && renderError()}
      {status.phase !== 'disabled' && !error && (!isReady || !url) && renderStatusCard()}
      {status.phase !== 'disabled' && !error && isReady && url && renderWebView()}
      
      <div className="openwebui-toolbar">
        <div className="openwebui-status-pill">
          <span className={`state ${isReady ? 'ready' : 'pending'}`}>
            {isReady ? 'Listo' : 'Preparando'}
          </span>
        </div>
        <div className="openwebui-actions">
          <Button
            icon="pi pi-sync"
            size="small"
            className="openwebui-action-btn"
            onClick={startService}
            tooltip="Reintentar"
            tooltipOptions={{ position: 'top' }}
          />
          <Button
            icon="pi pi-refresh"
            size="small"
            className="openwebui-action-btn"
            disabled={!isReady}
            onClick={handleReloadWebView}
            tooltip="Recargar UI"
            tooltipOptions={{ position: 'top' }}
          />
        </div>
      </div>
    </div>
  );
};

export default OpenWebUITab;

