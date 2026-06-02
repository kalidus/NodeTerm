import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useTranslation } from '../i18n/hooks/useTranslation';
import '../styles/components/browser-tab.css';

const BrowserTab = ({ tabId, browserData }) => {
  const { t } = useTranslation('common');
  const webviewRef = useRef(null);

  const { url: initialUrl, username, password, title } = browserData || {};

  const [currentUrl, setCurrentUrl] = useState(initialUrl || '');
  const [inputUrl, setInputUrl] = useState(initialUrl || '');
  const [webviewState, setWebviewState] = useState('loading');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Script de autocompletado inteligente
  const handleAutofill = useCallback(() => {
    const view = webviewRef.current;
    if (!view || !username || !password) return;

    const usernameStr = JSON.stringify(username);
    const passwordStr = JSON.stringify(password);

    const script = `
      (function() {
        function autofill() {
          const passwordInputs = document.querySelectorAll('input[type="password"]');
          if (passwordInputs.length === 0) return false;

          const pwdInput = passwordInputs[0];
          pwdInput.value = ${passwordStr};
          pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
          pwdInput.dispatchEvent(new Event('change', { bubbles: true }));

          let userInput = null;
          const form = pwdInput.form;
          if (form) {
            const textInputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="url"]');
            if (textInputs.length > 0) {
              userInput = textInputs[0];
            }
          }

          if (!userInput) {
            const allInputs = Array.from(document.querySelectorAll('input'));
            const pwdIndex = allInputs.indexOf(pwdInput);
            for (let i = pwdIndex - 1; i >= 0; i--) {
              const type = allInputs[i].getAttribute('type');
              if (type === 'text' || type === 'email' || type === 'username') {
                userInput = allInputs[i];
                break;
              }
            }
          }

          if (userInput) {
            userInput.value = ${usernameStr};
            userInput.dispatchEvent(new Event('input', { bubbles: true }));
            userInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          return true;
        }

        // 1. Intentar inmediatamente
        if (autofill()) return;

        // 2. Si no se encuentra el formulario, escuchar cambios dinámicos del DOM (MutationObserver)
        const observer = new MutationObserver((mutations, obs) => {
          if (autofill()) {
            obs.disconnect();
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        // Timeout de seguridad: Desconectar el observador después de 15 segundos
        setTimeout(() => {
          observer.disconnect();
        }, 15000);
      })();
    `;

    view.executeJavaScript(script)
      .then(() => {
        console.log('[BrowserTab] Credenciales auto-completadas con éxito.');
      })
      .catch(err => {
        console.warn('[BrowserTab] Error al inyectar script de auto-completado:', err);
      });
  }, [username, password]);

  // Manejar el ciclo de vida de los eventos de <webview>
  useEffect(() => {
    const view = webviewRef.current;
    if (!view) return undefined;

    const handleLoadStart = () => {
      setWebviewState('loading');
    };

    const handleLoadStop = () => {
      if (view) {
        setWebviewState('ready');
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

    const handleFailLoad = () => {
      setWebviewState('error');
    };

    const handleDomReady = () => {
      setWebviewState('ready');
      if (view) {
        setCanGoBack(view.canGoBack());
        setCanGoForward(view.canGoForward());
      }
      // Auto-inyectar credenciales cuando el DOM esté listo
      handleAutofill();
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
  }, [reloadKey, handleAutofill]);

  // Navegación del WebView
  const handleBack = () => {
    const view = webviewRef.current;
    if (view && view.canGoBack()) {
      view.goBack();
    }
  };

  const handleForward = () => {
    const view = webviewRef.current;
    if (view && view.canGoForward()) {
      view.goForward();
    }
  };

  const handleReload = () => {
    const view = webviewRef.current;
    if (view) {
      setWebviewState('loading');
      view.reload();
    }
  };

  const handleHome = () => {
    const view = webviewRef.current;
    if (view && initialUrl) {
      setWebviewState('loading');
      view.loadURL(initialUrl);
    }
  };

  const handleAddressSubmit = (e) => {
    if (e.key === 'Enter') {
      const view = webviewRef.current;
      if (view && inputUrl.trim()) {
        let targetUrl = inputUrl.trim();
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = `https://${targetUrl}`;
        }
        setWebviewState('loading');
        view.loadURL(targetUrl);
      }
    }
  };

  const handleExternalOpen = () => {
    if (currentUrl) {
      window.electron?.import?.openExternal?.(currentUrl);
    }
  };

  const handleReloadWebViewForce = () => {
    setWebviewState('loading');
    setReloadKey(prev => prev + 1);
  };

  const overlayClass = webviewState === 'ready' ? 'browser-overlay fading' : 'browser-overlay';

  return (
    <div className="browser-tab">
      {/* Barra de Herramientas del Navegador */}
      <div className="browser-toolbar">
        <div className="browser-nav-group">
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
            disabled={webviewState === 'loading'}
          />
          <Button
            icon="pi pi-home"
            onClick={handleHome}
            className="p-button-rounded p-button-text p-button-secondary browser-action-btn"
            tooltip="Ir a URL Inicial"
            tooltipOptions={{ position: 'bottom' }}
          />
        </div>

        {/* Barra de Direcciones */}
        <div className="browser-address-container">
          <span className="pi pi-globe browser-address-icon"></span>
          <input
            type="text"
            className="browser-address-input"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleAddressSubmit}
            placeholder="Introduce una dirección URL (ej. router.local) y pulsa Enter"
          />
          {webviewState === 'loading' && (
            <span className="pi pi-spin pi-spinner" style={{ color: 'var(--ui-button-primary)', opacity: 0.8 }}></span>
          )}
        </div>

        {/* Botones de acción derecha */}
        <div className="browser-nav-group">
          {username && password && (
            <Button
              icon="pi pi-key"
              onClick={handleAutofill}
              className="p-button-rounded p-button-text p-button-secondary browser-action-btn"
              tooltip="Rellenar Credenciales (Auto-completar)"
              tooltipOptions={{ position: 'bottom' }}
            />
          )}
          <Button
            icon="pi pi-external-link"
            onClick={handleExternalOpen}
            className="p-button-rounded p-button-text p-button-secondary browser-action-btn"
            tooltip="Abrir en Navegador Externo"
            tooltipOptions={{ position: 'bottom' }}
          />
        </div>
      </div>

      {/* Contenedor del WebView y Carga */}
      <div className="browser-webview-container">
        {webviewState !== 'ready' && webviewState !== 'error' && (
          <div className={overlayClass}>
            <ProgressSpinner style={{ width: '36px', height: '36px' }} />
            <p>Cargando página y preparando auto-completado…</p>
          </div>
        )}

        {webviewState === 'error' && (
          <div className="browser-overlay">
            <span className="pi pi-exclamation-triangle" style={{ fontSize: '32px', color: 'var(--ui-button-primary)', marginBottom: '12px' }}></span>
            <p style={{ margin: '0 0 16px 0' }}>No se pudo cargar la página. Verifica la URL o tu conexión de red.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                label="Reintentar"
                icon="pi pi-sync"
                onClick={handleReloadWebViewForce}
                severity="warning"
                size="small"
              />
              <Button
                label="Abrir Externo"
                icon="pi pi-external-link"
                onClick={handleExternalOpen}
                severity="secondary"
                size="small"
              />
            </div>
          </div>
        )}

        <webview
          key={`${initialUrl}-${reloadKey}`}
          ref={webviewRef}
          src={initialUrl}
          allowpopups="true"
          style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff' }}
          webpreferences="contextIsolation=yes, nodeIntegration=no, webSecurity=yes"
        />
      </div>

      {/* Barra de Estado Inferior */}
      <div className="browser-status-bar">
        <span>{webviewState === 'loading' ? 'Cargando...' : webviewState === 'error' ? 'Error al cargar' : 'Listo'}</span>
        {username && (
          <div className="browser-credential-badge">
            <span className="pi pi-user"></span>
            <span>Credenciales listas para: {username}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowserTab;
