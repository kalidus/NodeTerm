import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../i18n/hooks/useTranslation';
import { getVersionInfo } from '../../../version-info';
import AppUpdateTab from '../../AppUpdateTab';

export const UpdatesSettingsTab = ({
  contentHeight,
  toastRef,
  activeMainTab = 'actualizaciones'
}) => {
  const { t } = useTranslation('settings');

  // Estados para actualizaciones
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, downloaded
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(() => {
    const stored = localStorage.getItem('update_auto_check');
    return stored !== null ? stored === 'true' : true;
  });
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState(() => {
    const stored = localStorage.getItem('update_auto_download');
    return stored !== null ? stored === 'true' : true;
  });
  const [autoInstallEnabled, setAutoInstallEnabled] = useState(() => {
    const stored = localStorage.getItem('update_auto_install');
    return stored !== null ? stored === 'true' : false;
  });
  const [updateChannel, setUpdateChannel] = useState(() => {
    const stored = localStorage.getItem('update_channel');
    return stored || 'latest';
  });
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [currentAppVersion, setCurrentAppVersion] = useState(() => getVersionInfo().appVersion || '1.0.0');

  // Escuchar eventos del actualizador (update-available, update-downloaded, etc.) para actualizar la UI
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return;
    const handleUpdaterEvent = (ev) => {
      const { event, data } = ev;
      switch (event) {
        case 'update-available':
          setUpdateStatus('available');
          setUpdateInfo(data);
          setIsCheckingUpdates(false);
          if (toastRef?.current) {
            toastRef.current.show({
              severity: 'info',
              summary: t('updateChannels.available'),
              detail: `${t('updateChannels.newVersion') || 'Nueva versión'}: ${data?.version || ''}`,
              life: 5000,
            });
          }
          break;
        case 'update-downloaded':
          setUpdateStatus('downloaded');
          setUpdateInfo(data);
          setDownloadProgress(100);
          setIsDownloading(false);
          if (toastRef?.current) {
            toastRef.current.show({
              severity: 'success',
              summary: t('updateChannels.downloadComplete'),
              detail: t('updateChannels.downloadCompleteDetail'),
              life: 5000,
            });
          }
          break;
        case 'update-not-available':
          setUpdateStatus('idle');
          setUpdateInfo(null);
          setIsCheckingUpdates(false);
          if (toastRef?.current) {
            toastRef.current.show({
              severity: 'success',
              summary: t('updateChannels.upToDate'),
              detail: t('updateChannels.upToDateDetail'),
              life: 3000,
            });
          }
          break;
        case 'download-progress':
          setUpdateStatus('downloading');
          setDownloadProgress(data?.percent ?? 0);
          break;
        case 'error':
          setUpdateStatus('error');
          setIsCheckingUpdates(false);
          setIsDownloading(false);
          break;
        default:
          break;
      }
    };
    const unsubscribe = window.electron.ipcRenderer.on('updater-event', handleUpdaterEvent);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [t, toastRef]);

  // Al abrir la sección Actualizaciones, sincronizar estado con el main (p. ej. si ya hay actualización descargada)
  useEffect(() => {
    if (activeMainTab !== 'actualizaciones' || !window.electron?.updater) return;
    window.electron.updater.getUpdateInfo().then((result) => {
      if (!result) return;
      if (result.currentVersion) setCurrentAppVersion(result.currentVersion);
      if (result.isUpdateDownloaded && result.updateInfo) {
        setUpdateStatus('downloaded');
        setUpdateInfo(result.updateInfo);
        setDownloadProgress(100);
      } else if (result.updateAvailable && result.updateInfo) {
        setUpdateStatus('available');
        setUpdateInfo(result.updateInfo);
      } else {
        setUpdateStatus('idle');
        setUpdateInfo(null);
      }
    }).catch(() => { });
  }, [activeMainTab]);

  // Función para cambiar el canal de actualizaciones
  const handleChannelChange = (channel) => {
    setUpdateChannel(channel);
    localStorage.setItem('update_channel', channel);

    if (toastRef?.current) {
      const channelLabel = channel === 'latest' ? t('updateChannels.stable') : t('updateChannels.beta');
      toastRef.current.show({
        severity: 'success',
        summary: t('updateChannels.channelUpdated'),
        detail: t('updateChannels.message').replace('{channel}', channelLabel),
        life: 2000,
      });
    }
  };

  // Función para verificar actualizaciones
  const checkForUpdates = async () => {
    setIsCheckingUpdates(true);
    setUpdateStatus('checking');

    try {
      if (window.electron?.updater) {
        console.log('🔍 Buscando actualizaciones en canal:', updateChannel);
        const result = await window.electron.updater.checkForUpdates();
        console.log('📦 Resultado de búsqueda:', result);

        if (result?.updateAvailable && result?.updateInfo) {
          setUpdateStatus('available');
          setUpdateInfo(result.updateInfo);
          if (toastRef?.current) {
            toastRef.current.show({
              severity: 'info',
              summary: t('updateChannels.available'),
              detail: `Nueva versión: ${result.updateInfo?.version || ''}`,
              life: 5000,
            });
          }
        }
      } else {
        throw new Error(t('updateChannels.notAvailable'));
      }
    } catch (error) {
      console.error('❌ Error al verificar actualizaciones:', error);
      setUpdateStatus('error');

      if (toastRef?.current) {
        toastRef.current.show({
          severity: 'error',
          summary: 'Error',
          detail: error.message || t('updateChannels.checkError'),
          life: 5000,
        });
      }
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  // Función para descargar la actualización
  const downloadUpdate = async () => {
    setIsDownloading(true);
    setUpdateStatus('downloading');
    setDownloadProgress(0);

    try {
      if (window.electron?.updater) {
        console.log('⬇️ Descargando actualización...');

        const handleProgressEvent = (data) => {
          console.log('📊 Progreso de descarga:', data.percent);
          setDownloadProgress(data.percent || 0);
        };

        if (window.electron?.ipcRenderer) {
          const unsubscribe = window.electron.ipcRenderer.on('updater-event', (event) => {
            if (event.event === 'download-progress') {
              handleProgressEvent(event.data);
            }
          });

          await window.electron.updater.downloadUpdate();

          setTimeout(() => {
            setUpdateStatus('downloaded');
            setDownloadProgress(100);
            setIsDownloading(false);

            if (toastRef?.current) {
              toastRef.current.show({
                severity: 'success',
                summary: t('updateChannels.downloadComplete'),
                detail: t('updateChannels.downloadCompleteDetail'),
                life: 3000,
              });
            }

            if (unsubscribe && typeof unsubscribe === 'function') {
              unsubscribe();
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('❌ Error descargando actualización:', error);
      setUpdateStatus('error');
      setIsDownloading(false);

      if (toastRef?.current) {
        toastRef.current.show({
          severity: 'error',
          summary: 'Error',
          detail: t('updateChannels.downloadError'),
          life: 5000,
        });
      }
    }
  };

  // Función para instalar la actualización
  const installUpdate = async () => {
    setIsInstalling(true);

    try {
      if (window.electron?.updater) {
        console.log('📦 Instalando actualización e reiniciando...');

        if (toastRef?.current) {
          toastRef.current.show({
            severity: 'info',
            summary: 'Instalando',
            detail: t('updateChannels.installing'),
            life: 3000,
          });
        }

        await window.electron.updater.quitAndInstall();
      }
    } catch (error) {
      console.error('❌ Error instalando actualización:', error);
      setIsInstalling(false);

      if (toastRef?.current) {
        toastRef.current.show({
          severity: 'error',
          summary: 'Error',
          detail: t('updateChannels.installError'),
          life: 5000,
        });
      }
    }
  };

  const handleAutoCheckChange = (enabled) => {
    setAutoCheckEnabled(enabled);
    localStorage.setItem('update_auto_check', enabled.toString());

    if (toastRef?.current) {
      toastRef.current.show({
        severity: 'success',
        summary: 'Guardado',
        detail: enabled ? t('updateChannels.autoCheckEnabled') : t('updateChannels.autoCheckDisabled'),
        life: 2000,
      });
    }
  };

  const handleAutoDownloadChange = (enabled) => {
    setAutoDownloadEnabled(enabled);
    localStorage.setItem('update_auto_download', enabled.toString());

    if (toastRef?.current) {
      toastRef.current.show({
        severity: 'success',
        summary: 'Guardado',
        detail: enabled ? t('updateChannels.autoDownloadEnabled') : t('updateChannels.autoDownloadDisabled'),
        life: 2000,
      });
    }
  };

  const handleAutoInstallChange = async (enabled) => {
    setAutoInstallEnabled(enabled);
    localStorage.setItem('update_auto_install', enabled.toString());
    try {
      if (window.electron?.updater?.updateConfig) {
        await window.electron.updater.updateConfig({ autoInstall: enabled });
      }
    } catch (e) {
      console.warn('[Settings] No se pudo sincronizar autoInstall con el proceso principal:', e);
    }
    if (toastRef?.current) {
      toastRef.current.show({
        severity: 'success',
        summary: 'Guardado',
        detail: enabled ? t('updateChannels.autoInstallEnabled') : t('updateChannels.autoInstallDisabled'),
        life: 2000,
      });
    }
  };

  return (
    <div style={{ height: `${contentHeight}px`, overflow: 'hidden' }}>
      <AppUpdateTab 
        contentHeight={contentHeight}
        currentAppVersion={currentAppVersion}
        updateStatus={updateStatus}
        isCheckingUpdates={isCheckingUpdates}
        checkForUpdates={checkForUpdates}
        downloadProgress={downloadProgress}
        updateInfo={updateInfo}
        isDownloading={isDownloading}
        downloadUpdate={downloadUpdate}
        installUpdate={installUpdate}
        isInstalling={isInstalling}
        autoCheckEnabled={autoCheckEnabled}
        handleAutoCheckChange={handleAutoCheckChange}
        autoInstallEnabled={autoInstallEnabled}
        handleAutoInstallChange={handleAutoInstallChange}
        autoDownloadEnabled={autoDownloadEnabled}
        handleAutoDownloadChange={handleAutoDownloadChange}
        updateChannel={updateChannel}
        handleChannelChange={handleChannelChange}
      />
    </div>
  );
};

export default UpdatesSettingsTab;
