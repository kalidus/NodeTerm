(function () {
  var PAYPAL = 'https://paypal.me/k4lidus';
  var FALLBACK = 'https://github.com/kalidus/NodeTerm/releases/latest';
  var API = 'https://api.github.com/repos/kalidus/NodeTerm/releases/latest';
  var ETH = '0x7D18e60b2717edA94e6a48d05e6d09038dCf9342';
  var SOL = 'DAP3efj9Fvp1uvf8eVse3dMTxxyw2bWLh4snA891iNZh';

  var I18N = {
    es: {
      'meta.title': 'NodeTerm — cliente de acceso remoto',
      'meta.description': 'Cliente de acceso remoto all-in-one para Windows, Linux y macOS. SSH, RDP, VNC, SFTP, bóveda cifrada y agentes MCP.',
      'nav.features': 'Funciones',
      'nav.download': 'Descarga',
      'nav.support': 'Apoyar',
      'nav.sections': 'Secciones',
      'nav.protocols': 'Protocolos',
      'footer.project': 'Proyecto',
      'footer.donations': 'Donaciones',
      'hero.kicker': 'Escritorio · Windows, Linux y macOS',
      'hero.title': 'Cliente de acceso remoto all-in-one',
      'hero.lead': 'Moderno y multiprotocolo, con bóveda de contraseñas e IA en un espacio multipestaña ultrarrápido.',
      'hero.free': 'Gratis · GPL-3.0',
      'hero.version': 'Última versión',
      'hero.download': 'Descargar',
      'hero.github': 'Ver en GitHub',
      'shot.alt': 'Pantalla de inicio de NodeTerm con widgets, terminal y paneles flotantes',
      'features.title': 'Hecho para el trabajo diario',
      'features.lead': 'Un solo sitio para entrar a los servidores, guardar las credenciales y dejar que un agente ayude sin ver las contraseñas.',
      'f1.title': 'SSH, RDP, VNC y SFTP',
      'f1.body': 'IronRDP por defecto, VNC con noVNC, explorador SFTP y bastiones Wallix. Sesiones en carpetas y pestañas por proyecto.',
      'f2.title': 'Bóveda AES-256',
      'f2.body': 'Clave maestra, bloqueo automático y cifrado local de credenciales.',
      'f3.title': 'Agentes MCP',
      'f3.body': 'Cursor, Claude y otros agentes consultan conexiones, notas y terminales. Los secretos se inyectan sin mostrarse.',
      'f4.title': 'Splits de terminal',
      'f4.body': 'Divide la pantalla en horizontal y vertical con xterm.js, a 60 FPS.',
      'f5.title': 'Auditoría de sesiones',
      'f5.body': 'Graba la sesión SSH en asciicast v2 y reprodúcela dentro de la aplicación.',
      'f6.title': 'Temas y tipografía',
      'f6.body': 'Interfaz oscura o clara, fuentes con ligaduras y paquetes de iconos.',
      'download.title': 'Descarga NodeTerm',
      'download.lead': 'El botón abre la última release publicada en GitHub. Elige el paquete de tu sistema.',
      'os.recommended': 'Para tu sistema',
      'os.windowsText': 'Instalador para Windows (.exe).',
      'os.windowsBtn': 'Descargar .exe',
      'os.linuxText': 'AppImage, deb, pacman o rpm.',
      'os.macText': 'Imagen de disco para Apple silicon (arm64).',
      'os.macBtn': 'Descargar .dmg',
      'download.forWindows': 'Descargar para Windows',
      'download.forMac': 'Descargar para macOS',
      'download.forLinux': 'Descargar para Linux',
      'footer.license': 'Licencia GPL-3.0',
      'footer.code': 'Código',
      'footer.sponsors': 'GitHub Sponsors',
      'footer.support': 'Si te ahorra tiempo, puedes apoyar el proyecto:',
      'modal.title': 'NodeTerm es gratis',
      'modal.lead': 'Si te resulta útil en el trabajo diario, puedes apoyar el mantenimiento. La descarga no depende de la donación.',
      'modal.paypal': 'Donar con PayPal',
      'modal.crypto': 'Criptomonedas',
      'modal.copy': 'Copiar',
      'modal.copied': 'Copiado',
      'modal.explorer': 'Ver en el explorador',
      'modal.skip': 'Solo descargar',
      'modal.support': 'Apoyar y descargar',
      'modal.close': 'Cerrar',
      'modal.file': 'Archivo',
      'modal.fallback': 'Se abrirá la página de releases',
      'modal.copyFail': 'Selecciona la dirección y cópiala a mano'
    },
    en: {
      'meta.title': 'NodeTerm — remote access client',
      'meta.description': 'All-in-one remote access client for Windows, Linux, and macOS. SSH, RDP, VNC, SFTP, an encrypted vault, and MCP agents.',
      'nav.features': 'Features',
      'nav.download': 'Download',
      'nav.support': 'Support',
      'nav.sections': 'Sections',
      'nav.protocols': 'Protocols',
      'footer.project': 'Project',
      'footer.donations': 'Donations',
      'hero.kicker': 'Desktop · Windows, Linux, and macOS',
      'hero.title': 'All-in-one remote access client',
      'hero.lead': 'A modern multi-protocol workspace with a password vault and AI, in a fast multi-tab layout.',
      'hero.free': 'Free · GPL-3.0',
      'hero.version': 'Latest version',
      'hero.download': 'Download',
      'hero.github': 'View on GitHub',
      'shot.alt': 'NodeTerm home screen with widgets, terminal, and floating panels',
      'features.title': 'Built for daily work',
      'features.lead': 'One place to reach servers, store credentials, and let an agent help without seeing passwords.',
      'f1.title': 'SSH, RDP, VNC, and SFTP',
      'f1.body': 'IronRDP by default, noVNC, a visual SFTP browser, and Wallix bastions. Sessions in folders and project tabs.',
      'f2.title': 'AES-256 vault',
      'f2.body': 'Master password, auto-lock, and local encryption for credentials.',
      'f3.title': 'MCP agents',
      'f3.body': 'Cursor, Claude, and other agents can use connections, notes, and open terminals. Secrets are injected, not revealed.',
      'f4.title': 'Terminal splits',
      'f4.body': 'Split the screen horizontally and vertically with xterm.js, at 60 FPS.',
      'f5.title': 'Session audit',
      'f5.body': 'Record SSH sessions as asciicast v2 and play them back inside the app.',
      'f6.title': 'Themes and type',
      'f6.body': 'Dark or light interface, ligature fonts, and icon packs.',
      'download.title': 'Download NodeTerm',
      'download.lead': 'The button uses the latest release published on GitHub. Pick the package for your system.',
      'os.recommended': 'For your system',
      'os.windowsText': 'Windows installer (.exe).',
      'os.windowsBtn': 'Download .exe',
      'os.linuxText': 'AppImage, deb, pacman, or rpm.',
      'os.macText': 'Disk image for Apple silicon (arm64).',
      'os.macBtn': 'Download .dmg',
      'download.forWindows': 'Download for Windows',
      'download.forMac': 'Download for macOS',
      'download.forLinux': 'Download for Linux',
      'footer.license': 'GPL-3.0 license',
      'footer.code': 'Source',
      'footer.sponsors': 'GitHub Sponsors',
      'footer.support': 'If it saves you time, you can support the project:',
      'modal.title': 'NodeTerm is free',
      'modal.lead': 'If it helps your daily work, you can support maintenance. The download does not depend on a donation.',
      'modal.paypal': 'Donate with PayPal',
      'modal.crypto': 'Crypto',
      'modal.copy': 'Copy',
      'modal.copied': 'Copied',
      'modal.explorer': 'View on explorer',
      'modal.skip': 'Just download',
      'modal.support': 'Support and download',
      'modal.close': 'Close',
      'modal.file': 'File',
      'modal.fallback': 'The releases page will open',
      'modal.copyFail': 'Select the address and copy it manually'
    }
  };

  var release = null;
  var lang = 'es';
  var pendingKind = 'windows';
  var lastFocus = null;
  var modal = document.getElementById('donate-modal');
  var dialog = document.getElementById('donate-dialog');
  var fileLine = document.getElementById('download-file');
  var copyStatus = document.getElementById('copy-status');

  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || I18N.es[key] || key;
  }

  function detectKind() {
    var ua = navigator.userAgent || '';
    var platform = navigator.platform || '';
    if (/Win/i.test(platform) || /Windows/i.test(ua)) return 'windows';
    if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return 'mac';
    if (/Linux/i.test(platform) || /Linux/i.test(ua)) return 'appimage';
    return 'windows';
  }

  function familyOf(kind) {
    if (kind === 'mac') return 'mac';
    if (kind === 'windows') return 'windows';
    return 'linux';
  }

  function matchAsset(kind) {
    var assets = (release && release.assets) || [];
    function find(re) {
      for (var i = 0; i < assets.length; i += 1) {
        if (re.test(assets[i].name)) return assets[i];
      }
      return null;
    }
    if (kind === 'windows') return find(/^NodeTerm-Setup-.*\.exe$/i) || find(/\.exe$/i);
    if (kind === 'appimage') return find(/\.AppImage$/i);
    if (kind === 'deb') return find(/\.deb$/i);
    if (kind === 'pacman') return find(/\.pacman$/i);
    if (kind === 'rpm') return find(/\.rpm$/i);
    if (kind === 'mac') return find(/arm64\.dmg$/i) || find(/\.dmg$/i);
    return null;
  }

  function resolveUrl(kind) {
    var asset = matchAsset(kind);
    return asset ? asset.browser_download_url : FALLBACK;
  }

  function heroLabel(kind) {
    if (kind === 'mac') return t('download.forMac');
    if (kind === 'windows') return t('download.forWindows');
    return t('download.forLinux');
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    document.title = t('meta.title');
    var description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', t('meta.description'));
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      el.alt = t(el.getAttribute('data-i18n-alt'));
    });
    document.querySelectorAll('[data-i18n-label]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-label')));
    });
    document.querySelectorAll('.lang button').forEach(function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
    var primary = document.getElementById('primary-download');
    if (primary) primary.textContent = heroLabel(primary.getAttribute('data-asset'));
    var version = document.getElementById('release-version');
    if (version) {
      version.textContent = release && release.tag_name
        ? t('hero.version') + ' ' + release.tag_name
        : t('hero.free');
    }
    if (!modal.hidden) renderFileLine();
  }

  function renderFileLine() {
    var asset = matchAsset(pendingKind);
    fileLine.textContent = asset
      ? t('modal.file') + ': ' + asset.name
      : t('modal.fallback');
  }

  function markCurrentOs() {
    var family = familyOf(detectKind());
    document.querySelectorAll('.os').forEach(function (panel) {
      var current = panel.getAttribute('data-family') === family;
      panel.classList.toggle('is-current', current);
      var badge = panel.querySelector('.recommend');
      if (badge) badge.hidden = !current;
    });
    var kind = detectKind();
    ['primary-download', 'nav-download'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.setAttribute('data-asset', kind);
    });
    var primary = document.getElementById('primary-download');
    if (primary) primary.textContent = heroLabel(kind);
  }

  function setLang(next) {
    lang = next === 'en' ? 'en' : 'es';
    try { localStorage.setItem('nodeterm-lang', lang); } catch (e) {}
    applyI18n();
  }

  function focusable() {
    return Array.prototype.slice.call(dialog.querySelectorAll('a[href], button:not([disabled])'));
  }

  function openModal(kind) {
    pendingKind = kind || detectKind();
    renderFileLine();
    copyStatus.textContent = '';
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var closeButton = document.getElementById('modal-close');
    if (closeButton) closeButton.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function startDownload() {
    var kind = pendingKind;
    releasePromise.then(function () {
      window.location.assign(resolveUrl(kind));
      closeModal();
    });
  }

  function copyAddress(value, button) {
    function legacy() {
      var area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '0';
      area.style.left = '0';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.focus();
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      area.remove();
      return ok;
    }
    function done(ok) {
      button.textContent = ok ? t('modal.copied') : t('modal.copy');
      copyStatus.textContent = ok ? t('modal.copied') : t('modal.copyFail');
      if (!ok) {
        var code = button.closest('.coin') && button.closest('.coin').querySelector('code');
        if (code) {
          var range = document.createRange();
          range.selectNodeContents(code);
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      if (ok) {
        window.setTimeout(function () {
          if (button.textContent === t('modal.copied')) button.textContent = t('modal.copy');
          if (copyStatus.textContent === t('modal.copied')) copyStatus.textContent = '';
        }, 1600);
      }
    }
    var legacyOk = legacy();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () { done(true); }, function () { done(legacyOk); });
      return;
    }
    done(legacyOk);
  }

  document.querySelectorAll('[data-asset]').forEach(function (el) {
    el.addEventListener('click', function (event) {
      event.preventDefault();
      openModal(el.getAttribute('data-asset'));
    });
  });

  document.querySelectorAll('.lang button').forEach(function (button) {
    button.addEventListener('click', function () {
      setLang(button.getAttribute('data-lang'));
    });
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  modal.querySelector('[data-close]').addEventListener('click', closeModal);
  document.getElementById('download-only').addEventListener('click', startDownload);
  document.getElementById('support-download').addEventListener('click', function () {
    window.open(PAYPAL, '_blank', 'noopener');
    startDownload();
  });

  document.querySelectorAll('[data-copy]').forEach(function (button) {
    button.addEventListener('click', function () {
      var value = button.getAttribute('data-copy') === 'sol' ? SOL : ETH;
      copyAddress(value, button);
    });
  });

  document.addEventListener('keydown', function (event) {
    if (modal.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    var items = focusable();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  try {
    var saved = localStorage.getItem('nodeterm-lang');
    if (saved === 'en' || saved === 'es') lang = saved;
  } catch (e) {}

  markCurrentOs();
  applyI18n();

  var releaseTimer = window.setTimeout(function () {
    if (releaseController) releaseController.abort();
  }, 8000);
  var releaseController = new AbortController();
  var releasePromise = fetch(API, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: releaseController.signal
  })
    .then(function (response) {
      if (!response.ok) throw new Error('release');
      return response.json();
    })
    .then(function (data) {
      release = data;
      document.querySelectorAll('[data-asset]').forEach(function (el) {
        el.dataset.url = resolveUrl(el.getAttribute('data-asset'));
      });
      applyI18n();
    })
    .catch(function () {
      release = null;
      applyI18n();
    })
    .finally(function () {
      window.clearTimeout(releaseTimer);
    });
})();
