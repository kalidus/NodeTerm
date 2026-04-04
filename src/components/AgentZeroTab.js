import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useTranslation } from '../i18n/hooks/useTranslation';
import '../styles/components/agent-zero.css';

const INITIAL_STATUS = {
  phase: 'init',
  message: 'Preparando Agent Zero...',
  isRunning: false
};

const AgentZeroTab = () => {
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

  const invokeAgentZero = useCallback(async (method) => {
    if (!window.electron?.ipcRenderer) {
      throw new Error('IPC no disponible.');
    }
    const response = await window.electron.ipcRenderer.invoke(`agentzero:${method}`);
    if (!response || response.success === false) {
      throw new Error(response?.error || 'No se pudo comunicar con Agent Zero.');
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
      message: 'Iniciando contenedor de Agent Zero...'
    }));
    try {
      const response = await invokeAgentZero('start');
      if (!mountedRef.current) return;
      const nextStatus = response.status || INITIAL_STATUS;
      setStatus(nextStatus);
      setIsReady(Boolean(nextStatus.isRunning));

      if (nextStatus.url) {
        setUrl(nextStatus.url);
      } else {
        const urlResponse = await invokeAgentZero('get-url');
        if (!mountedRef.current) return;
        setUrl(urlResponse.url);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || 'No se pudo iniciar Agent Zero.');
    }
  }, [invokeAgentZero]);

  useEffect(() => {
    const checkAndStartIfEnabled = () => {
      try {
        const aiClientsConfig = localStorage.getItem('ai_clients_enabled');
        if (aiClientsConfig) {
          const config = JSON.parse(aiClientsConfig);
          if (config.agentzero === true) {
            console.log('[AgentZero] Servicio activado en configuración, iniciando...');
            startService();
          } else {
            console.log('[AgentZero] Servicio desactivado en configuración');
            setStatus({
              phase: 'disabled',
              message: 'Agent Zero está desactivado. Actívalo en Configuración → Clientes de IA',
              isRunning: false
            });
          }
        } else {
          setStatus({
            phase: 'disabled',
            message: 'Agent Zero está desactivado. Actívalo en Configuración → Clientes de IA',
            isRunning: false
          });
        }
      } catch (error) {
        console.error('[AgentZero] Error:', error);
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
      if (e.errorCode === -3) return;
      
      console.error('[AgentZero:WebView] Fail load:', e);
      setWebviewState('error');
      setWebviewError(`${e.errorDescription || 'Error desconocido'} (${e.errorCode})`);
    };

    const safetyTimeout = setTimeout(() => {
      setWebviewState(prev => prev === 'loading' ? 'ready' : prev);
    }, 15000);

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
    <div className="agentzero-status-card">
      <ProgressSpinner style={{ width: '40px', height: '40px' }} />
      <h3>Preparando Agent Zero…</h3>
      <p>{status.message || 'Inicializando servicios de Docker'}</p>
      <div className="agentzero-meta">
        <div>
          <span>Imagen</span>
          <span>{status.imageName || 'agent0ai/agent-zero:latest'}</span>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="agentzero-error-card">
      <h3>Problema al iniciar Agent Zero</h3>
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
    <div className="agentzero-disabled-card">
      <i className="pi pi-power-off" style={{ fontSize: '4rem', color: '#9E9E9E', marginBottom: '1.5rem' }} />
      <h3>Agent Zero Desactivado</h3>
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
    const overlayClass = webviewState === 'ready' ? 'agentzero-overlay fading' : 'agentzero-overlay';
    return (
      <div className="agentzero-webview-wrapper">
        {webviewState !== 'ready' && (
          <div className={overlayClass}>
            <ProgressSpinner style={{ width: '36px', height: '36px' }} />
            <p>{webviewState === 'error' ? `Error: ${webviewError || 'Error cargando la UI'}` : 'Cargando interfaz de Agent Zero…'}</p>
          </div>
        )}
        <webview
          key={`${url}-${reloadKey}`}
          ref={webviewRef}
          src={url}
          partition="persist:agentzero"
          allowpopups="true"
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px', background: 'transparent' }}
          webpreferences="contextIsolation=yes, nodeIntegration=no, webSecurity=no"
        />
      </div>
    );
  };

  const renderToolbar = () => (
    <div className="agentzero-toolbar agentzero-toolbar--floating" role="toolbar" aria-label="Agent Zero">
      <div className="agentzero-status-pill">
        <span className={`state ${isReady ? 'ready' : 'pending'}`}>
          {isReady ? 'Listo' : '…'}
        </span>
      </div>
      <div className="agentzero-actions">
        <Button
          icon="pi pi-sync"
          size="small"
          className="agentzero-action-btn"
          onClick={startService}
          tooltip={t('tooltips.retry') || 'Reintentar'}
          tooltipOptions={{ position: 'left' }}
        />
        <Button
          icon="pi pi-refresh"
          size="small"
          className="agentzero-action-btn"
          disabled={!isReady}
          onClick={handleReloadWebView}
          tooltip={t('tooltips.reloadUI') || 'Recargar UI'}
          tooltipOptions={{ position: 'left' }}
        />
      </div>
    </div>
  );

  return (
    <div className="agentzero-tab">
      <Toast ref={toast} />

      <div className="agentzero-body">
        {status.phase === 'disabled' && renderDisabled()}
        {status.phase !== 'disabled' && error && renderError()}
        {status.phase !== 'disabled' && !error && (!isReady || !url) && renderStatusCard()}
        {status.phase !== 'disabled' && !error && isReady && url && renderWebView()}
      </div>

      {status.phase !== 'disabled' && !error && renderToolbar()}
    </div>
  );
};

export default AgentZeroTab;
