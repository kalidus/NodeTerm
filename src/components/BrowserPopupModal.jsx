import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import '../styles/components/browser-tab.css';

/**
 * BrowserPopupModal - Ventana emergente flotante dentro de NodeTerm
 * para visualizar enlaces de terminal y páginas web sin salir del contexto actual.
 */
const BrowserPopupModal = () => {
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const webviewRef = useRef(null);

  // Escuchar evento global 'open-browser-popup' y evento IPC desde el proceso main
  useEffect(() => {
    const handleOpenPopup = (e) => {
      const detail = e.detail || {};
      const targetUrl = detail.url;
      if (!targetUrl || typeof targetUrl !== 'string') return;

      const host = targetUrl.replace(/^https?:\/\//i, '').split('/')[0];
      setUrl(targetUrl);
      setCurrentUrl(targetUrl);
      setInputUrl(targetUrl);
      setTitle(detail.title || host || 'Vista previa');
      setLoading(true);
      setHasError(false);
      setCanGoBack(false);
      setCanGoForward(false);
      setCopied(false);
      setVisible(true);
    };

    window.addEventListener('open-browser-popup', handleOpenPopup);

    let unsubscribeIpc = null;
    if (window.electron?.on) {
      unsubscribeIpc = window.electron.on('system:open-browser-popup', (data) => {
        if (data?.url) {
          handleOpenPopup({ detail: { url: data.url, title: data.title } });
        }
      });
    }

    return () => {
      window.removeEventListener('open-browser-popup', handleOpenPopup);
      if (typeof unsubscribeIpc === 'function') {
        unsubscribeIpc();
      }
    };
  }, []);

  // Manejadores del ciclo de vida del WebView
  useEffect(() => {
    if (!visible) return undefined;
    const view = webviewRef.current;
    if (!view) return undefined;

    const handleLoadStart = () => {
      setLoading(true);
      setHasError(false);
    };

    const handleLoadStop = () => {
      setLoading(false);
      if (view) {
        setCanGoBack(view.canGoBack());
        setCanGoForward(view.canGoForward());
      }
    };

    const handleNavigate = (event) => {
      const newUrl = event.url;
      setCurrentUrl(newUrl);
      setInputUrl(newUrl);
      if (view) {
        setCanGoBack(view.canGoBack());
        setCanGoForward(view.canGoForward());
      }
    };

    const handleFailLoad = (event) => {
      // Ignorar cancelaciones intencionales (ej. ERR_ABORTED -3)
      if (event.errorCode !== -3) {
        setHasError(true);
        setLoading(false);
      }
    };

    const handleDomReady = () => {
      setLoading(false);
      if (view) {
        setCanGoBack(view.canGoBack());
        setCanGoForward(view.canGoForward());
      }
    };

    view.addEventListener('did-start-loading', handleLoadStart);
    view.addEventListener('did-stop-loading', handleLoadStop);
    view.addEventListener('did-navigate', handleNavigate);
    view.addEventListener('did-navigate-in-page', handleNavigate);
    view.addEventListener('did-fail-load', handleFailLoad);
    view.addEventListener('dom-ready', handleDomReady);

    return () => {
      view.removeEventListener('did-start-loading', handleLoadStart);
      view.removeEventListener('did-stop-loading', handleLoadStop);
      view.removeEventListener('did-navigate', handleNavigate);
      view.removeEventListener('did-navigate-in-page', handleNavigate);
      view.removeEventListener('did-fail-load', handleFailLoad);
      view.removeEventListener('dom-ready', handleDomReady);
    };
  }, [visible, reloadKey]);

  const handleClose = useCallback(() => {
    const view = webviewRef.current;
    if (view) {
      try {
        view.stop();
      } catch {
        // Ignorar si el webview ya se detuvo
      }
    }
    setVisible(false);
    setUrl('');
    setCurrentUrl('');
    setInputUrl('');
    setLoading(false);
    setHasError(false);
  }, []);

  const handleBack = () => {
    const view = webviewRef.current;
    if (view && view.canGoBack()) view.goBack();
  };

  const handleForward = () => {
    const view = webviewRef.current;
    if (view && view.canGoForward()) view.goForward();
  };

  const handleReload = () => {
    const view = webviewRef.current;
    if (view) {
      setLoading(true);
      setHasError(false);
      view.reload();
    }
  };

  const handleAddressSubmit = (e) => {
    if (e.key === 'Enter') {
      const view = webviewRef.current;
      if (view && inputUrl.trim()) {
        let target = inputUrl.trim();
        if (!target.startsWith('http://') && !target.startsWith('https://')) {
          target = `https://${target}`;
        }
        setLoading(true);
        setHasError(false);
        view.loadURL(target);
      }
    }
  };

  const handleCopyUrl = async () => {
    const target = currentUrl || url;
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('[BrowserPopupModal] Error al copiar URL:', err);
    }
  };

  const handleOpenExternal = () => {
    const target = currentUrl || url;
    if (!target) return;
    if (window.electron?.system?.openWithBrowser) {
      window.electron.system.openWithBrowser(target).catch(() => {
        window.electron?.openExternal?.(target);
      });
    } else if (window.electron?.openExternal) {
      window.electron.openExternal(target);
    }
  };

  const handleOpenInNewTab = () => {
    const target = currentUrl || url;
    if (!target) return;
    window.dispatchEvent(new CustomEvent('open-browser-tab', {
      detail: {
        url: target,
        title: title || 'Navegador'
      }
    }));
    handleClose();
  };

  const customHeader = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      gap: '12px',
      paddingRight: '36px'
    }}>
      {/* Título e icono */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '140px', flexShrink: 0 }}>
        <i className="pi pi-globe" style={{ fontSize: '18px', color: '#38bdf8' }} />
        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ui-dialog-text)' }}>
          {title}
        </span>
      </div>

      {/* Barra de navegación interna */}
      <div className="browser-nav-group" style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
        <Button
          icon="pi pi-chevron-left"
          disabled={!canGoBack}
          onClick={handleBack}
          className="p-button-rounded p-button-text p-button-secondary browser-action-btn"
          tooltip="Atrás"
          tooltipOptions={{ position: 'bottom' }}
        />
        <Button
          icon="pi pi-chevron-right"
          disabled={!canGoForward}
          onClick={handleForward}
          className="p-button-rounded p-button-text p-button-secondary browser-action-btn"
          tooltip="Adelante"
          tooltipOptions={{ position: 'bottom' }}
        />
        <Button
          icon="pi pi-refresh"
          onClick={handleReload}
          className="p-button-rounded p-button-text p-button-secondary browser-action-btn"
          tooltip="Recargar"
          tooltipOptions={{ position: 'bottom' }}
          disabled={loading}
        />
      </div>

      {/* Barra de direcciones editable */}
      <div className="browser-address-container" style={{ flex: 1, height: '32px' }}>
        <input
          type="text"
          className="browser-address-input"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={handleAddressSubmit}
          placeholder="Escribe una URL y pulsa Enter"
          style={{ fontSize: '12px' }}
        />
        {loading && (
          <span className="pi pi-spin pi-spinner" style={{ color: '#38bdf8', fontSize: '12px' }} />
        )}
      </div>

      {/* Botones de acción derecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <Button
          icon={copied ? 'pi pi-check' : 'pi pi-copy'}
          onClick={handleCopyUrl}
          className={`p-button-rounded p-button-text ${copied ? 'p-button-success' : 'p-button-secondary'} browser-action-btn`}
          tooltip={copied ? '¡Copiado!' : 'Copiar enlace'}
          tooltipOptions={{ position: 'bottom' }}
        />
        <Button
          icon="pi pi-clone"
          onClick={handleOpenInNewTab}
          className="p-button-rounded p-button-text p-button-secondary browser-action-btn"
          tooltip="Abrir como pestaña en NodeTerm"
          tooltipOptions={{ position: 'bottom' }}
        />
        <Button
          icon="pi pi-external-link"
          onClick={handleOpenExternal}
          className="p-button-rounded p-button-text p-button-secondary browser-action-btn"
          tooltip="Abrir en navegador externo del sistema"
          tooltipOptions={{ position: 'bottom' }}
        />
      </div>
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={handleClose}
      header={customHeader}
      dismissableMask={false}
      closeOnEscape={true}
      resizable={true}
      draggable={true}
      maximizable={true}
      className="browser-popup-dialog"
      style={{ width: '84vw', height: '82vh', maxWidth: '1400px', minWidth: '480px', minHeight: '360px' }}
      contentStyle={{ padding: 0, height: 'calc(100% - 48px)', display: 'flex', flexDirection: 'column' }}
      keepInViewport={true}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', flex: 1, overflow: 'hidden' }}>
        {/* Overlay de carga */}
        {loading && (
          <div className="browser-overlay" style={{ background: 'rgba(15, 23, 34, 0.75)' }}>
            <ProgressSpinner style={{ width: '38px', height: '38px' }} />
            <p style={{ marginTop: '10px', fontSize: '13px' }}>Cargando vista previa…</p>
          </div>
        )}

        {/* Overlay de error */}
        {hasError && (
          <div className="browser-overlay">
            <span className="pi pi-exclamation-triangle" style={{ fontSize: '32px', color: '#f59e0b', marginBottom: '12px' }} />
            <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>No se pudo cargar la página.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                label="Reintentar"
                icon="pi pi-sync"
                onClick={() => {
                  setHasError(false);
                  setReloadKey((prev) => prev + 1);
                }}
                severity="warning"
                size="small"
              />
              <Button
                label="Abrir Externo"
                icon="pi pi-external-link"
                onClick={handleOpenExternal}
                severity="secondary"
                size="small"
              />
            </div>
          </div>
        )}

        {/* Webview embebido */}
        {visible && url && (
          <webview
            key={`${url}-${reloadKey}`}
            ref={webviewRef}
            src={url}
            allowpopups="true"
            style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff' }}
            webpreferences="contextIsolation=yes, nodeIntegration=no, webSecurity=yes"
          />
        )}
      </div>
    </Dialog>
  );
};

export default BrowserPopupModal;
