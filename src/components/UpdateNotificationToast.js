/**
 * UpdateNotificationToast.js
 * 
 * Componente flotante de notificación de actualización (Estilo Cursor / VS Code).
 * Se muestra en la esquina inferior izquierda al detectar una nueva versión de NodeTerm.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/hooks/useTranslation';

const UpdateNotificationToast = ({ onOpenUpdateSettings }) => {
  const { t: tSettings } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');

  const [visible, setVisible] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, available, downloading, downloaded, error
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isManagedAppImage, setIsManagedAppImage] = useState(false);
  const [dismissedVersion, setDismissedVersion] = useState(null);

  useEffect(() => {
    if (!window.electron?.updater) return;

    // Verificar estado inicial al cargar
    window.electron.updater.getUpdateInfo?.()
      .then((result) => {
        if (!result) return;
        setIsManagedAppImage(!!result.isManagedAppImage);

        if (result.isUpdateDownloaded) {
          setUpdateStatus('downloaded');
          setUpdateInfo(result.updateInfo);
          setDownloadProgress(100);
          setVisible(true);
        } else if (result.updateAvailable) {
          setUpdateStatus('available');
          setUpdateInfo(result.updateInfo);
          setVisible(true);
        }
      })
      .catch((err) => {
        console.error('Error obteniendo estado de actualización inicial:', err);
      });

    // Suscribirse a eventos de actualización en tiempo real
    const handleUpdaterEvent = (data) => {
      const { event, data: eventData } = data || {};

      switch (event) {
        case 'update-available':
          setUpdateStatus('available');
          setUpdateInfo(eventData);
          if (dismissedVersion !== eventData?.version) {
            setVisible(true);
          }
          break;

        case 'download-progress':
          setUpdateStatus('downloading');
          setDownloadProgress(eventData?.percent || 0);
          setVisible(true);
          break;

        case 'update-downloaded':
          setUpdateStatus('downloaded');
          setUpdateInfo(eventData);
          setDownloadProgress(100);
          setVisible(true); // Siempre se muestra cuando está lista para instalar
          break;

        case 'error':
          setUpdateStatus('error');
          setErrorMessage(eventData?.message || 'Error al comprobar actualizaciones');
          break;

        case 'update-not-available':
          // Si ya no hay actualizaciones, ocultar aviso
          if (updateStatus !== 'downloaded') {
            setVisible(false);
            setUpdateStatus('idle');
          }
          break;

        default:
          break;
      }
    };

    const unsubscribe = window.electron.ipcRenderer?.on?.('updater-event', handleUpdaterEvent);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [dismissedVersion]);

  // Si no está visible o el estado es inactivo, no renderizar nada
  if (!visible || updateStatus === 'idle') {
    return null;
  }

  const versionTag = updateInfo?.version ? `v${updateInfo.version}` : '';

  const handleDismiss = () => {
    setVisible(false);
    if (updateInfo?.version) {
      setDismissedVersion(updateInfo.version);
    }
  };

  const handleDownload = async () => {
    try {
      if (window.electron?.updater?.downloadUpdate) {
        setUpdateStatus('downloading');
        await window.electron.updater.downloadUpdate();
      }
    } catch (err) {
      console.error('Error iniciando descarga:', err);
    }
  };

  const handleInstall = async () => {
    try {
      if (window.electron?.updater?.quitAndInstall) {
        await window.electron.updater.quitAndInstall();
      }
    } catch (err) {
      console.error('Error instalando actualización:', err);
    }
  };

  const renderContent = () => {
    if (updateStatus === 'downloaded') {
      return (
        <>
          <div className="update-notification-header">
            <div className="update-notification-title-container">
              <i className="pi pi-check-circle update-notification-icon" style={{ color: 'var(--green-500, #22c55e)' }}></i>
              <span>Actualización lista</span>
            </div>
            <button
              className="update-notification-close-btn"
              onClick={handleDismiss}
              title={tCommon?.('actions.close') || 'Cerrar'}
            >
              <i className="pi pi-times"></i>
            </button>
          </div>

          <div className="update-notification-body">
            {versionTag && <span className="update-notification-badge">{versionTag}</span>}
            <div className="update-notification-text">
              NodeTerm {versionTag} se ha descargado y está lista para instalar.
            </div>
          </div>

          <div className="update-notification-actions">
            <button
              className="update-notification-btn-secondary"
              onClick={handleDismiss}
            >
              Más tarde
            </button>
            <button
              className="update-notification-btn-primary update-notification-btn-primary--success"
              onClick={handleInstall}
            >
              <i className="pi pi-refresh" style={{ fontSize: '0.8rem' }}></i>
              Reiniciar y Actualizar
            </button>
          </div>
        </>
      );
    }

    if (updateStatus === 'downloading') {
      return (
        <>
          <div className="update-notification-header">
            <div className="update-notification-title-container">
              <i className="pi pi-spin pi-spinner update-notification-icon"></i>
              <span>Descargando actualización...</span>
            </div>
            <button
              className="update-notification-close-btn"
              onClick={handleDismiss}
              title={tCommon?.('actions.close') || 'Cerrar'}
            >
              <i className="pi pi-times"></i>
            </button>
          </div>

          <div className="update-notification-body">
            <div className="update-notification-progress-container">
              <div className="update-notification-progress-header">
                <span>NodeTerm {versionTag}</span>
                <span>{downloadProgress.toFixed(0)}%</span>
              </div>
              <div className="update-notification-progress-track">
                <div
                  className="update-notification-progress-bar"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </>
      );
    }

    // Default: update Available
    return (
      <>
        <div className="update-notification-header">
          <div className="update-notification-title-container">
            <i className="pi pi-sparkles update-notification-icon"></i>
            <span>Actualización disponible</span>
          </div>
          <button
            className="update-notification-close-btn"
            onClick={handleDismiss}
            title={tCommon?.('actions.close') || 'Cerrar'}
          >
            <i className="pi pi-times"></i>
          </button>
        </div>

        <div className="update-notification-body">
          {versionTag && <span className="update-notification-badge">{versionTag}</span>}
          <div className="update-notification-text">
            {isManagedAppImage
              ? `Nueva versión ${versionTag} disponible. Actualiza desde tu gestor de aplicaciones (Gear Lever / AppImage).`
              : `Una nueva versión de NodeTerm (${versionTag}) está lista para descargar.`
            }
          </div>
        </div>

        <div className="update-notification-actions">
          {onOpenUpdateSettings && (
            <button
              className="update-notification-btn-secondary"
              onClick={onOpenUpdateSettings}
            >
              Ver detalles
            </button>
          )}
          {!isManagedAppImage && (
            <button
              className="update-notification-btn-primary"
              onClick={handleDownload}
            >
              <i className="pi pi-download" style={{ fontSize: '0.8rem' }}></i>
              Descargar
            </button>
          )}
        </div>
      </>
    );
  };

  const toastClassNames = [
    'update-notification-toast',
    updateStatus === 'downloaded' ? 'update-notification-toast--downloaded' : '',
    updateStatus === 'downloading' ? 'update-notification-toast--downloading' : '',
    updateStatus === 'error' ? 'update-notification-toast--error' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={toastClassNames}>
      {renderContent()}
    </div>
  );
};

export default UpdateNotificationToast;
