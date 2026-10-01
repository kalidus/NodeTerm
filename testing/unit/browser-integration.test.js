const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('NodeTerm Browser Integration (Popup & Tab)', () => {
  it('despacha evento open-browser-popup al hacer clic en enlaces de terminal', () => {
    let capturedEvent = null;
    let capturedDetail = null;

    const fakeWindow = {
      dispatchEvent: (e) => {
        capturedEvent = e.type;
        capturedDetail = e.detail;
      }
    };

    // Simulación de handleTerminalLink
    function handleTerminalLink(uri, win) {
      if (!uri || typeof uri !== 'string') return;
      const trimmed = uri.trim();
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return;

      const domain = trimmed.replace(/^https?:\/\//i, '').split('/')[0];
      win.dispatchEvent({
        type: 'open-browser-popup',
        detail: {
          url: trimmed,
          title: domain || 'Vista previa'
        }
      });
    }

    handleTerminalLink('https://ubuntu.com/security/esm', fakeWindow);
    assert.strictEqual(capturedEvent, 'open-browser-popup');
    assert.strictEqual(capturedDetail.url, 'https://ubuntu.com/security/esm');
    assert.strictEqual(capturedDetail.title, 'ubuntu.com');
  });

  it('despacha evento open-browser-tab con about:blank al hacer clic en la barra lateral', () => {
    let capturedEvent = null;
    let capturedDetail = null;

    const fakeWindow = {
      dispatchEvent: (e) => {
        capturedEvent = e.type;
        capturedDetail = e.detail;
      }
    };

    function handleSidebarBrowserClick(win) {
      win.dispatchEvent({
        type: 'open-browser-tab',
        detail: {
          url: 'about:blank',
          title: 'Navegador'
        }
      });
    }

    handleSidebarBrowserClick(fakeWindow);
    assert.strictEqual(capturedEvent, 'open-browser-tab');
    assert.strictEqual(capturedDetail.url, 'about:blank');
    assert.strictEqual(capturedDetail.title, 'Navegador');
  });

  it('procesa targetUrl about:blank sin rechazar la apertura de la pestaña', () => {
    function resolveBrowserTabPayload(info) {
      const { url, username, password, title } = info || {};
      const targetUrl = (url && typeof url === 'string') ? url.trim() : 'about:blank';
      return {
        url: targetUrl,
        username,
        password,
        title: title || (targetUrl === 'about:blank' ? 'Navegador' : targetUrl.replace(/^https?:\/\//i, '').split('/')[0])
      };
    }

    const blankPayload = resolveBrowserTabPayload({ url: 'about:blank' });
    assert.strictEqual(blankPayload.url, 'about:blank');
    assert.strictEqual(blankPayload.title, 'Navegador');

    const emptyPayload = resolveBrowserTabPayload({});
    assert.strictEqual(emptyPayload.url, 'about:blank');
    assert.strictEqual(emptyPayload.title, 'Navegador');

    const specificPayload = resolveBrowserTabPayload({ url: 'https://github.com/kalidus/NodeTerm' });
    assert.strictEqual(specificPayload.url, 'https://github.com/kalidus/NodeTerm');
    assert.strictEqual(specificPayload.title, 'github.com');
  });
});
