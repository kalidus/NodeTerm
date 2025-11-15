import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import '../styles/components/anything-llm.css';

const INITIAL_STATUS = {
  phase: 'init',
  message: 'Preparando AnythingLLM...',
  isRunning: false
};

const AnythingLLMTab = () => {
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

  const invokeAnythingLLM = useCallback(async (method) => {
    if (!window.electron?.anythingLLM || typeof window.electron.anythingLLM[method] !== 'function') {
      throw new Error('API AnythingLLM no disponible en este entorno.');
    }
    const response = await window.electron.anythingLLM[method]();
    if (!response || response.success === false) {
      throw new Error(response?.error || 'No se pudo comunicar con AnythingLLM.');
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
      message: 'Iniciando contenedor AnythingLLM...'
    }));
    try {
      const response = await invokeAnythingLLM('start');
      if (!mountedRef.current) return;
      const nextStatus = response.status || INITIAL_STATUS;
      setStatus(nextStatus);
      setIsReady(Boolean(nextStatus.isRunning));

      if (nextStatus.url) {
        setUrl(nextStatus.url);
      } else {
        const urlResponse = await invokeAnythingLLM('get-url');
        if (!mountedRef.current) return;
        setUrl(urlResponse.url);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || 'No se pudo iniciar AnythingLLM.');
    }
  }, [invokeAnythingLLM]);

  useEffect(() => {
    startService();
  }, [startService]);

  useEffect(() => {
    const view = webviewRef.current;
    if (!view || !url) return undefined;
    
    const handleLoadStart = () => {
      console.log('[AnythingLLM] Webview iniciando carga...');
      setWebviewState('loading');
    };
    
    const handleFinishLoad = () => {
      console.log('[AnythingLLM] Webview cargado completamente (did-finish-load)');
      setWebviewState('ready');
    };
    
    const handleDomReady = () => {
      console.log('[AnythingLLM] Webview DOM listo');
      // Si aún está en loading, marcarlo como ready
      setWebviewState(prev => prev === 'loading' ? 'ready' : prev);
    };
    
    const handleStopLoading = () => {
      console.log('[AnythingLLM] Webview dejó de cargar');
      // Verificar si realmente terminó de cargar
      setTimeout(() => {
        if (view && !view.isLoading()) {
          console.log('[AnythingLLM] Webview verificado como listo (isLoading=false)');
          setWebviewState('ready');
        }
      }, 500);
    };
    
    const handleFail = (event) => {
      console.error('[AnythingLLM] Error cargando webview:', event);
      setWebviewState('error');
    };

    // Timeout de seguridad: ocultar overlay después de 5 segundos
    const safetyTimeout = setTimeout(() => {
      console.log('[AnythingLLM] Timeout de seguridad: ocultando overlay');
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

  const handleOpenExternal = useCallback(() => {
    if (!url) return;
    if (window.electron?.import?.openExternal) {
      window.electron.import.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  }, [url]);

  const renderStatusCard = () => (
    <div className="anythingllm-status-card">
      <ProgressSpinner style={{ width: '40px', height: '40px' }} />
      <h3>Preparando AnythingLLM…</h3>
      <p>{status.message || 'Inicializando servicio local'}</p>
      <div className="anythingllm-meta">
        <div>
          <span>Imagen</span>
          <span>{status.imageName || 'mintplexlabs/anythingllm:latest'}</span>
        </div>
        <div>
          <span>Datos</span>
          <span>{status.dataDir || '---'}</span>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="anythingllm-error-card">
      <h3>Problema al iniciar AnythingLLM</h3>
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

  const renderWebView = () => {
    if (!url) return null;
    
    const overlayClass = webviewState === 'ready' ? 'anythingllm-overlay fading' : 'anythingllm-overlay';
    
    return (
      <div className="anythingllm-webview-wrapper">
        {webviewState !== 'ready' && (
          <div className={overlayClass}>
            <ProgressSpinner style={{ width: '36px', height: '36px' }} />
            <p>{webviewState === 'error' ? 'Error cargando la UI' : 'Cargando interfaz de AnythingLLM…'}</p>
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
    <div className="anythingllm-tab">
      <div className="anythingllm-toolbar">
        <div className="anythingllm-status-pill">
          <span className={`state ${isReady ? 'ready' : 'pending'}`}>
            {isReady ? 'Listo' : 'Preparando'}
          </span>
          <div className="status-copy">
            <strong>{(status.phase || 'idle').toUpperCase()}</strong>
            <span>{status.message || 'Esperando estado...'}</span>
          </div>
        </div>
        <div className="anythingllm-actions">
          <Button
            label="Reintentar"
            icon="pi pi-sync"
            size="small"
            className="p-button-text"
            onClick={startService}
          />
          <Button
            label="Recargar UI"
            icon="pi pi-refresh"
            size="small"
            disabled={!isReady}
            onClick={handleReloadWebView}
          />
          <Button
            label="Abrir en navegador"
            icon="pi pi-external-link"
            size="small"
            disabled={!isReady || !url}
            onClick={handleOpenExternal}
          />
        </div>
      </div>

      {error && renderError()}
      {!error && (!isReady || !url) && renderStatusCard()}
      {!error && isReady && url && renderWebView()}
    </div>
  );
};

export default AnythingLLMTab;

