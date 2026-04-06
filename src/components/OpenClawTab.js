import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useTranslation } from '../i18n/hooks/useTranslation';
import '../styles/components/agent-zero.css';

const INITIAL_STATUS = {
  phase: 'init',
  message: 'Preparando OpenClaw...',
  isRunning: false
};

const OpenClawTab = () => {
  const { t } = useTranslation('common');

  const [status, setStatus] = useState(INITIAL_STATUS);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [webviewState, setWebviewState] = useState('idle');
  const [webviewError, setWebviewError] = useState(null);
  const [gatewayToken, setGatewayToken] = useState('');
  const webviewRef = useRef(null);
  const mountedRef = useRef(true);
  const toast = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const invokeOpenClaw = useCallback(async (method) => {
    if (!window.electron?.ipcRenderer) {
      throw new Error('IPC no disponible.');
    }
    const response = await window.electron.ipcRenderer.invoke(`openclaw:${method}`);
    if (!response || response.success === false) {
      throw new Error(response?.error || 'No se pudo comunicar con OpenClaw.');
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
      message: 'Iniciando contenedor de OpenClaw...'
    }));
    try {
      const response = await invokeOpenClaw('start');
      if (!mountedRef.current) return;
      const nextStatus = response.status || INITIAL_STATUS;
      setStatus(nextStatus);
      setIsReady(Boolean(nextStatus.isRunning));

      if (nextStatus.url) {
        setUrl(nextStatus.url);
      } else {
        const urlResponse = await invokeOpenClaw('get-url');
        if (!mountedRef.current) return;
        setUrl(urlResponse.url);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || 'No se pudo iniciar OpenClaw.');
    }
  }, [invokeOpenClaw]);

  useEffect(() => {
    const checkAndStartIfEnabled = () => {
      try {
        const aiClientsConfig = localStorage.getItem('ai_clients_enabled');
        if (aiClientsConfig) {
          const config = JSON.parse(aiClientsConfig);
          if (config.openclaw === true) {
            console.log('[OpenClaw] Servicio activado en configuración, iniciando...');
            startService();
          } else {
            console.log('[OpenClaw] Servicio desactivado en configuración');
            setStatus({
              phase: 'disabled',
              message: 'OpenClaw está desactivado. Actívalo en Configuración → Clientes de IA',
              isRunning: false
            });
          }
        } else {
          setStatus({
            phase: 'disabled',
            message: 'OpenClaw está desactivado. Actívalo en Configuración → Clientes de IA',
            isRunning: false
          });
        }
      } catch (error) {
        console.error('[OpenClaw] Error:', error);
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
    if (!isReady || !url || !window.electron?.ipcRenderer) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await window.electron.ipcRenderer.invoke('openclaw:get-gateway-token');
        if (!cancelled && res?.success && res.token) {
          setGatewayToken(res.token);
        }
      } catch (e) {
        console.warn('[OpenClawTab] No se pudo cargar el token del gateway:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, url]);

  const copyGatewayToken = useCallback(async () => {
    if (!gatewayToken) return;
    try {
      await navigator.clipboard.writeText(gatewayToken);
      toast.current?.show({
        severity: 'success',
        summary: 'Copiado',
        detail: 'Pega el token en Ajustes del Control UI de OpenClaw.',
        life: 3500
      });
    } catch (e) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Portapapeles',
        detail: 'Selecciona el token y cópialo manualmente (Ctrl+C).',
        life: 4000
      });
    }
  }, [gatewayToken]);

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
      console.error('[OpenClaw:WebView] Fail load:', e);
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
      <h3>Preparando OpenClaw…</h3>
      <p>{status.message || 'Inicializando servicios de Docker'}</p>
      <div className="agentzero-meta">
        <div>
          <span>Imagen</span>
          <span>{status.imageName || 'ghcr.io/openclaw/openclaw:latest'}</span>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="agentzero-error-card">
      <h3>Problema al iniciar OpenClaw</h3>
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
      <h3>OpenClaw Desactivado</h3>
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
            <p>{webviewState === 'error' ? `Error: ${webviewError || 'Error cargando la UI'}` : 'Cargando interfaz de OpenClaw…'}</p>
          </div>
        )}
        <webview
          key={`${url}-${reloadKey}`}
          ref={webviewRef}
          src={url}
          partition="persist:openclaw"
          allowpopups="true"
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px', background: 'transparent' }}
          webpreferences="contextIsolation=yes, nodeIntegration=no, webSecurity=no"
        />
      </div>
    );
  };

  const renderToolbar = () => (
    <div className="agentzero-toolbar agentzero-toolbar--floating" role="toolbar" aria-label="OpenClaw">
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
        {status.phase !== 'disabled' && !error && isReady && url && gatewayToken && (
          <div
            className="openclaw-gateway-token-hint"
            style={{
              flexShrink: 0,
              padding: '0.5rem 0.75rem 0.75rem',
              borderBottom: '1px solid var(--surface-border, rgba(255,255,255,0.12))'
            }}
          >
            <Message
              severity="info"
              text="Tras el último arranque, el token ya está en openclaw.json y en el contenedor. Pulsa conectar o recarga la página; si el Control UI sigue pidiendo secreto compartido, pega abajo el mismo token en Ajustes del Control UI."
              style={{ width: '100%', marginBottom: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <InputText
                readOnly
                value={gatewayToken}
                className="font-mono"
                style={{ flex: '1 1 200px', minWidth: 0, fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }}
              />
              <Button type="button" label="Copiar token" icon="pi pi-copy" size="small" onClick={copyGatewayToken} />
            </div>
          </div>
        )}
        {status.phase !== 'disabled' && !error && isReady && url && renderWebView()}
      </div>

      {status.phase !== 'disabled' && !error && renderToolbar()}
    </div>
  );
};

export default OpenClawTab;
