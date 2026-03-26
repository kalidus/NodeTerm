import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useTranslation } from '../i18n/hooks/useTranslation';
import '../styles/components/libre-chat.css';

const INITIAL_STATUS = {
  phase: 'init',
  message: 'Preparando LibreChat...',
  isRunning: false
};

const LibreChatTab = () => {
  const { t } = useTranslation('common');
  
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [webviewState, setWebviewState] = useState('idle');
  const [webviewError, setWebviewError] = useState(null);
  const webviewRef = useRef(null);
  const mountedRef = useRef(true);
  const toast = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const invokeLibreChat = useCallback(async (method) => {
    if (!window.electron?.ipcRenderer) {
      throw new Error('IPC no disponible.');
    }
    const response = await window.electron.ipcRenderer.invoke(`librechat:${method}`);
    if (!response || response.success === false) {
      throw new Error(response?.error || 'No se pudo comunicar con LibreChat.');
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
      message: 'Iniciando contenedores (App + Mongo)...'
    }));
    try {
      const response = await invokeLibreChat('start');
      if (!mountedRef.current) return;
      const nextStatus = response.status || INITIAL_STATUS;
      setStatus(nextStatus);
      setIsReady(Boolean(nextStatus.isRunning));

      if (nextStatus.url) {
        setUrl(nextStatus.url);
      } else {
        const urlResponse = await invokeLibreChat('get-url');
        if (!mountedRef.current) return;
        setUrl(urlResponse.url);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || 'No se pudo iniciar LibreChat.');
    }
  }, [invokeLibreChat]);

  useEffect(() => {
    const checkAndStartIfEnabled = () => {
      try {
        const aiClientsConfig = localStorage.getItem('ai_clients_enabled');
        if (aiClientsConfig) {
          const config = JSON.parse(aiClientsConfig);
          if (config.librechat === true) {
            console.log('[LibreChat] Servicio activado en configuración, iniciando...');
            startService();
          } else {
            console.log('[LibreChat] Servicio desactivado en configuración');
            setStatus({
              phase: 'disabled',
              message: 'LibreChat está desactivado. Actívalo en Configuración → Clientes de IA',
              isRunning: false
            });
          }
        } else {
          setStatus({
            phase: 'disabled',
            message: 'LibreChat está desactivado. Actívalo en Configuración → Clientes de IA',
            isRunning: false
          });
        }
      } catch (error) {
        console.error('[LibreChat] Error:', error);
        setStatus({
          phase: 'error',
          message: 'Error al verificar configuración',
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
      // Solo poner en 'loading' si no estábamos ya 'ready' (evita overlay intrusivo en navegación interna)
      setWebviewState(prev => prev === 'ready' ? 'ready' : 'loading');
    };
    const handleFinishLoad = () => {
      setWebviewState('ready');
      setWebviewError(null);
    };
    const handleDomReady = () => {
      setWebviewState('ready');
      setWebviewError(null);
    };
    const handleFail = (e) => {
      // Ignorar ERR_ABORTED (-3), que suele ser un redirect o cancelación manual inofensiva
      if (e.errorCode === -3) return;
      
      console.error('[LibreChat:WebView] Fail load:', e);
      setWebviewState('error');
      setWebviewError(`${e.errorDescription || 'Error desconocido'} (${e.errorCode})`);
    };

    const safetyTimeout = setTimeout(() => {
      setWebviewState(prev => prev === 'loading' ? 'ready' : prev);
    }, 15000); // 15s timeout for initial load

    view.addEventListener('did-start-loading', handleLoadStart);
    view.addEventListener('did-finish-load', handleFinishLoad);
    view.addEventListener('dom-ready', handleDomReady);
    view.addEventListener('did-fail-load', handleFail);

    return () => {
      clearTimeout(safetyTimeout);
      view.removeEventListener('did-start-loading', handleLoadStart);
      view.removeEventListener('did-finish-load', handleFinishLoad);
      view.removeEventListener('dom-ready', handleDomReady);
      view.removeEventListener('did-fail-load', handleFail);
    };
  }, [url, reloadKey]);

  const handleReloadWebView = () => {
    setWebviewState('loading');
    setReloadKey((prev) => prev + 1);
  };

  const renderStatusCard = () => (
    <div className="librechat-status-card">
      <ProgressSpinner style={{ width: '40px', height: '40px' }} />
      <h3>Preparando LibreChat…</h3>
      <p>{status.message || 'Inicializando servicios de Docker'}</p>
      <div className="librechat-meta">
        <div>
          <span>Imagen</span>
          <span>{status.imageName || 'ghcr.io/danny-avila/librechat:latest'}</span>
        </div>
        <div>
          <span>Base de datos</span>
          <span>MongoDB (Docker)</span>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="librechat-error-card">
      <h3>Problema al iniciar LibreChat</h3>
      <p>{error}</p>
      <Button
        label="Reintentar"
        icon="pi pi-sync"
        severity="warning"
        onClick={startService}
      />
    </div>
  );

  const renderDisabled = () => (
    <div className="librechat-disabled-card">
      <i className="pi pi-power-off" style={{ fontSize: '4rem', color: '#9E9E9E', marginBottom: '1.5rem' }} />
      <h3>LibreChat Desactivado</h3>
      <p>Este servicio está desactivado en la configuración.</p>
      <Button
        label="Ir a Configuración"
        icon="pi pi-cog"
        severity="info"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('open-settings-dialog', { 
            detail: { tab: 'ai-clients' } 
          }));
        }}
      />
    </div>
  );

  const renderWebView = () => {
    if (!url) return null;
    const overlayClass = webviewState === 'ready' ? 'librechat-overlay fading' : 'librechat-overlay';
    return (
      <div className="librechat-webview-wrapper">
        {webviewState !== 'ready' && (
          <div className={overlayClass}>
            <ProgressSpinner style={{ width: '36px', height: '36px' }} />
            <p>{webviewState === 'error' ? `Error: ${webviewError || 'Error cargando la UI'}` : 'Cargando interfaz de LibreChat…'}</p>
          </div>
        )}
        <webview
          key={`${url}-${reloadKey}`}
          ref={webviewRef}
          src={url}
          partition="persist:librechat"
          allowpopups="true"
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px', background: 'transparent' }}
          webpreferences="contextIsolation=yes, nodeIntegration=no, webSecurity=yes"
        />
      </div>
    );
  };

  return (
    <div className="librechat-tab">
      <Toast ref={toast} />
      
      {status.phase === 'disabled' && renderDisabled()}
      {status.phase !== 'disabled' && error && renderError()}
      {status.phase !== 'disabled' && !error && (!isReady || !url) && renderStatusCard()}
      {status.phase !== 'disabled' && !error && isReady && url && renderWebView()}
      
      <div className="librechat-toolbar">
        <div className="librechat-status-pill">
          <span className={`state ${isReady ? 'ready' : 'pending'}`}>
            {isReady ? 'Listo' : 'Preparando'}
          </span>
        </div>
        <div className="librechat-actions">
          <Button
            icon="pi pi-sync"
            size="small"
            className="librechat-action-btn"
            onClick={startService}
            tooltip={t('tooltips.retry')}
            tooltipOptions={{ position: 'top' }}
          />
          <Button
            icon="pi pi-refresh"
            size="small"
            className="librechat-action-btn"
            disabled={!isReady}
            onClick={handleReloadWebView}
            tooltip={t('tooltips.reloadUI')}
            tooltipOptions={{ position: 'top' }}
          />
        </div>
      </div>
    </div>
  );
};

export default LibreChatTab;
