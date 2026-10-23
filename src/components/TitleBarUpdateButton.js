/**
 * Icono de actualización en la titlebar (estilo Discord).
 * Solo se muestra si hay una versión nueva. No abre avisos por sí solo:
 * clic en "disponible" descarga; clic en "lista" abre un menú del tema.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from '../i18n/hooks/useTranslation';

const MENU_WIDTH = 280;
const MENU_MARGIN = 8;

const placeMenu = (anchor) => {
  if (!anchor) return null;
  const rect = anchor.getBoundingClientRect();
  let left = rect.right - MENU_WIDTH;
  if (left < MENU_MARGIN) left = MENU_MARGIN;
  const maxLeft = window.innerWidth - MENU_MARGIN - MENU_WIDTH;
  if (left > maxLeft) left = Math.max(MENU_MARGIN, maxLeft);
  return { top: rect.bottom + 6, left };
};

const TitleBarUpdateButton = () => {
  const { t } = useTranslation('settings');

  const [status, setStatus] = useState('idle');
  const [version, setVersion] = useState('');
  const [progress, setProgress] = useState(0);
  const [isManagedAppImage, setIsManagedAppImage] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);

  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!window.electron?.updater) return;

    const rememberVersion = (info) => {
      if (info?.version) setVersion(String(info.version));
    };

    const handleUpdaterEvent = (ev) => {
      const { event, data } = ev || {};
      switch (event) {
        case 'update-available':
          setStatus('available');
          setProgress(0);
          rememberVersion(data);
          break;
        case 'download-progress':
          setStatus((prev) => (prev === 'downloaded' ? prev : 'downloading'));
          setProgress(typeof data?.percent === 'number' ? data.percent : 0);
          break;
        case 'update-downloaded':
          setStatus('downloaded');
          setProgress(100);
          rememberVersion(data);
          break;
        case 'update-not-available':
          setStatus((prev) => (prev === 'downloaded' ? prev : 'idle'));
          setMenuOpen(false);
          break;
        case 'error':
          setStatus((prev) => {
            if (prev === 'downloaded') return prev;
            if (prev === 'downloading') return 'available';
            return prev;
          });
          break;
        default:
          break;
      }
    };

    window.electron.updater.getUpdateInfo?.()
      .then((result) => {
        if (!result) return;
        setIsManagedAppImage(!!result.isManagedAppImage);
        rememberVersion(result.updateInfo);
        if (result.isUpdateDownloaded) setStatus('downloaded');
        else if (result.updateAvailable) setStatus('available');
      })
      .catch(() => {});

    const unsubscribe = window.electron.ipcRenderer?.on?.('updater-event', handleUpdaterEvent);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (status !== 'downloaded' && !(status === 'available' && isManagedAppImage)) {
      setMenuOpen(false);
    }
  }, [status, isManagedAppImage]);

  useLayoutEffect(() => {
    if (!menuOpen) return undefined;
    const sync = () => setMenuPos(placeMenu(btnRef.current));
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointer = (event) => {
      if (btnRef.current?.contains(event.target)) return;
      if (menuRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (status === 'idle') return null;

  const versionTag = version ? `v${version}` : '';

  const openMenu = () => {
    setMenuPos(placeMenu(btnRef.current));
    setMenuOpen(true);
  };

  const handleDownload = async () => {
    try {
      setStatus('downloading');
      setProgress(0);
      const result = await window.electron?.updater?.downloadUpdate?.();
      if (result && result.success === false) {
        setStatus('available');
      }
    } catch (err) {
      console.error('Error iniciando descarga:', err);
      setStatus('available');
    }
  };

  const handleInstall = async () => {
    try {
      await window.electron?.updater?.quitAndInstall?.();
    } catch (err) {
      console.error('Error instalando actualización:', err);
    }
  };

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (status === 'downloading') return;
    if (status === 'downloaded' || isManagedAppImage) {
      if (menuOpen) setMenuOpen(false);
      else openMenu();
      return;
    }
    handleDownload();
  };

  const tooltip = status === 'downloaded'
    ? (versionTag
      ? t('updateChannels.readyTooltip', { version: versionTag })
      : t('updateChannels.downloadCompleteDetail'))
    : status === 'downloading'
      ? t('updateChannels.downloadingTooltip', { percent: Math.round(progress) })
      : (versionTag
        ? t('updateChannels.availableTooltip', { version: versionTag })
        : t('updateChannels.available'));

  const iconClass = status === 'downloaded'
    ? 'pi pi-refresh'
    : status === 'downloading'
      ? 'pi pi-spin pi-spinner'
      : 'pi pi-download';

  const showDot = status === 'available' || status === 'downloaded';

  const menu = menuOpen && menuPos
    ? ReactDOM.createPortal(
      <div
        ref={menuRef}
        className="title-bar-update-menu"
        style={{ top: menuPos.top, left: menuPos.left }}
        role="dialog"
        aria-label={t('updateChannels.readyTitle')}
      >
        <div className="title-bar-update-menu-title">
          {status === 'downloaded'
            ? t('updateChannels.readyTitle')
            : t('updateChannels.available')}
        </div>
        {versionTag && (
          <div className="title-bar-update-menu-version">{versionTag}</div>
        )}
        <p className="title-bar-update-menu-text">
          {status === 'downloaded'
            ? (versionTag
              ? t('updateChannels.readyDetail', { version: versionTag })
              : t('updateChannels.downloadCompleteDetail'))
            : t('updateChannels.managedDetail', { version: versionTag })}
        </p>
        <div className="title-bar-update-menu-actions">
          <button
            type="button"
            className="title-bar-update-menu-btn title-bar-update-menu-btn--ghost"
            onClick={() => setMenuOpen(false)}
          >
            {t('updateChannels.later')}
          </button>
          {status === 'downloaded' && (
            <button
              type="button"
              className="title-bar-update-menu-btn title-bar-update-menu-btn--primary"
              onClick={handleInstall}
            >
              <i className="pi pi-refresh" aria-hidden="true" />
              {t('updateChannels.restartAndUpdate')}
            </button>
          )}
        </div>
      </div>,
      document.body
    )
    : null;

  return (
    <>
      <div className="title-bar-action-sep" aria-hidden="true" />
      <div className="title-bar-action-group">
        <button
          ref={btnRef}
          type="button"
          className={[
            'title-bar-icon-btn',
            'title-bar-update-btn',
            status === 'downloaded' ? 'is-ready' : '',
            status === 'available' ? 'is-available' : '',
            status === 'downloading' ? 'is-downloading' : '',
            menuOpen ? 'is-active' : '',
          ].filter(Boolean).join(' ')}
          title={tooltip}
          aria-label={tooltip}
          aria-haspopup={status === 'downloaded' || isManagedAppImage ? 'dialog' : undefined}
          aria-expanded={status === 'downloaded' || isManagedAppImage ? menuOpen : undefined}
          onClick={handleClick}
        >
          <i className={iconClass} aria-hidden="true" />
          {showDot && <span className="title-bar-update-dot" aria-hidden="true" />}
        </button>
        {menu}
      </div>
    </>
  );
};

export default TitleBarUpdateButton;
