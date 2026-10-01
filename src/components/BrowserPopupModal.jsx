import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import {
  BROWSER_WEBVIEW_PARTITION,
  getBrowserWebviewUserAgent,
  isIgnorableWebviewFail
} from '../utils/browserWebview';
import '../styles/components/browser-tab.css';

/**
 * Ventana flotante minima para previsualizar enlaces sin chrome de navegador.
 */
const BrowserPopupModal = () => {
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const webviewRef = useRef(null);
  const boundViewRef = useRef(null);
  const userAgentRef = useRef(getBrowserWebviewUserAgent());

  const handleOpenPopup = useCallback((detail) => {
    const targetUrl = detail?.url;
    if (!targetUrl || typeof targetUrl !== 'string') return;

    const host = targetUrl.replace(/^https?:\/\//i, '').split('/')[0];
    setUrl(targetUrl);
    setTitle(detail.title || host || 'Vista previa');
    setLoading(true);
    setHasError(false);
    setVisible(true);
  }, []);

  useEffect(() => {
    const onCustomEvent = (e) => handleOpenPopup(e.detail || {});
    window.addEventListener('open-browser-popup', onCustomEvent);

    let unsubscribeIpc = null;
    if (window.electron?.ipcRenderer?.on) {
      unsubscribeIpc = window.electron.ipcRenderer.on('system:open-browser-popup', (data) => {
        if (data?.url) {
          handleOpenPopup({ url: data.url, title: data.title });
        }
      });
    }

    return () => {
      window.removeEventListener('open-browser-popup', onCustomEvent);
      if (typeof unsubscribeIpc === 'function') {
        unsubscribeIpc();
      }
    };
  }, [handleOpenPopup]);

  const attachWebview = useCallback((view) => {
    if (boundViewRef.current && boundViewRef.current !== view) {
      boundViewRef.current = null;
    }
    webviewRef.current = view;
    if (!view || boundViewRef.current === view) return;

    boundViewRef.current = view;

    const handleLoadStart = () => {
      setLoading(true);
    };

    const handleDomReady = () => {
      setLoading(false);
    };

    const handleTitle = (event) => {
      if (event?.title) {
        setTitle(event.title);
      }
    };

    const handleFailLoad = (event) => {
      if (isIgnorableWebviewFail(event)) return;
      setHasError(true);
      setLoading(false);
    };

    view.addEventListener('did-start-loading', handleLoadStart);
    view.addEventListener('dom-ready', handleDomReady);
    view.addEventListener('page-title-updated', handleTitle);
    view.addEventListener('did-fail-load', handleFailLoad);
  }, []);

  const handleClose = useCallback(() => {
    const view = webviewRef.current;
    if (view) {
      try {
        view.stop();
      } catch {
        // Ignorar si el webview ya se detuvo
      }
    }
    boundViewRef.current = null;
    setVisible(false);
    setUrl('');
    setLoading(false);
    setHasError(false);
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setLoading(true);
    boundViewRef.current = null;
    setReloadKey((prev) => prev + 1);
  }, []);

  const header = (
    <div className="browser-popup-header">
      <span className="browser-popup-title" title={title}>{title}</span>
      {loading && <span className="pi pi-spin pi-spinner browser-popup-spinner" />}
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={handleClose}
      header={header}
      dismissableMask={false}
      closeOnEscape={true}
      resizable={true}
      draggable={true}
      maximizable={true}
      className="browser-popup-dialog"
      style={{ width: '84vw', height: '82vh', maxWidth: '1400px', minWidth: '480px', minHeight: '360px' }}
      contentStyle={{ padding: 0, display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
      keepInViewport={true}
    >
      <div className="browser-popup-body">
        {hasError && (
          <div className="browser-overlay">
            <span className="pi pi-exclamation-triangle" style={{ fontSize: '32px', color: '#f59e0b', marginBottom: '12px' }} />
            <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>No se pudo cargar la pagina.</p>
            <Button
              label="Reintentar"
              icon="pi pi-sync"
              onClick={handleRetry}
              severity="warning"
              size="small"
            />
          </div>
        )}

        {visible && url && (
          <webview
            key={`${url}-${reloadKey}`}
            ref={attachWebview}
            src={url}
            partition={BROWSER_WEBVIEW_PARTITION}
            useragent={userAgentRef.current}
            allowpopups="true"
            style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff', display: 'flex' }}
            webpreferences="contextIsolation=yes, nodeIntegration=no, webSecurity=yes"
          />
        )}
      </div>
    </Dialog>
  );
};

export default BrowserPopupModal;
