/**
 * UpdatePanel.js
 * 
 * Componente para gestión de actualizaciones de la aplicación.
 * Permite configurar y controlar el sistema de actualización automática.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { ProgressBar } from 'primereact/progressbar';
import { Checkbox } from 'primereact/checkbox';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';
import { Message } from 'primereact/message';
import { useTranslation } from '../i18n/hooks/useTranslation';

const UpdatePanel = () => {
  const { t } = useTranslation('common');

  const [currentVersion, setCurrentVersion] = useState('');
  const [config, setConfig] = useState({
    autoCheck: true,
    checkIntervalHours: 24,
    autoDownload: true,
    autoInstall: false,
    channel: 'latest',
  });

  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, downloading, downloaded, error
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isLinux, setIsLinux] = useState(false);
  const [isAppImage, setIsAppImage] = useState(false);

  const toast = useRef(null);

  /**
   * Maneja eventos de actualización del proceso principal
   */
  const handleUpdateEvent = (data) => {
    const { event, data: eventData } = data;

    console.log('📨 Evento de actualización recibido:', event, eventData);

    switch (event) {
      case 'checking-for-update':
        console.log('Evento: checking-for-update');
        setUpdateStatus('checking');
        setIsChecking(true);
        break;

      case 'update-available':
        console.log('Evento: update-available', eventData);
        setUpdateStatus('available');
        setUpdateInfo(eventData);
        setIsChecking(false);
        if (toast.current) {
          toast.current.show({
            severity: 'info',
            summary: 'Actualización Disponible',
            detail: `Versión ${eventData.version} disponible`,
            life: 5000,
          });
        }
        break;

      case 'update-not-available':
        console.log('Evento: update-not-available', eventData);
        setUpdateStatus('idle');
        setIsChecking(false);
        if (toast.current) {
          toast.current.show({
            severity: 'success',
            summary: 'Actualizado',
            detail: 'Ya tienes la última versión',
            life: 3000,
          });
        }
        break;

      case 'download-progress':
        console.log('Evento: download-progress', eventData.percent);
        setUpdateStatus('downloading');
        setDownloadProgress(eventData.percent || 0);
        break;

      case 'update-downloaded':
        console.log('Evento: update-downloaded', eventData);
        setUpdateStatus('downloaded');
        setDownloadProgress(100);
        if (toast.current) {
          toast.current.show({
            severity: 'success',
            summary: 'Descarga Completa',
            detail: 'La actualización está lista para instalar',
            life: 5000,
          });
        }
        break;

      case 'error':
        console.log('Evento: error', eventData);
        setUpdateStatus('error');
        setErrorMessage(eventData.message || 'Error desconocido');
        setIsChecking(false);
        if (toast.current) {
          toast.current.show({
            severity: 'error',
            summary: 'Error',
            detail: eventData.message || 'Error al actualizar',
            life: 5000,
          });
        }
        break;

      default:
        console.log('Evento desconocido:', event);
        break;
    }
  };

  // Cargar configuración y versión al montar
  useEffect(() => {
    loadConfig();
    loadCurrentVersion();

    // Suscribirse a eventos de actualización
    const handleUpdaterEvent = (data) => {
      console.log('🎯 Evento IPC recibido en UpdatePanel:', data);
      handleUpdateEvent(data);
    };

    if (window.electron?.ipcRenderer) {
      // Suscribiéndose a eventos updater silenciosamente
      const unsubscribe = window.electron.ipcRenderer.on('updater-event', handleUpdaterEvent);

      return () => {
        // Desuscribiéndose silenciosamente
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } else {
      console.error('❌ window.electron.ipcRenderer NO disponible');
    }
  }, []);

  /**
   * Carga la configuración desde el backend
   */
  const loadConfig = async () => {
    try {
      if (window.electron?.updater) {
        const result = await window.electron.updater.getConfig();
        if (result.success) {
          setConfig(result.config);
        }
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  /**
   * Carga la versión actual de la aplicación
   */
  const loadCurrentVersion = async () => {
    try {
      if (window.electron?.updater) {
        const result = await window.electron.updater.getUpdateInfo();
        if (result.success) {
          setCurrentVersion(result.currentVersion);
          setIsLinux(!!result.isLinux);
          setIsAppImage(!!result.isAppImage);
          if (result.isUpdateDownloaded && !result.isLinux) {
            setUpdateStatus('downloaded');
            setUpdateInfo(result.updateInfo);
            setDownloadProgress(100);
          } else if (result.updateAvailable) {
            setUpdateStatus('available');
            setUpdateInfo(result.updateInfo);
          }
        }
      }
    } catch (error) {
      console.error('Error cargando versión:', error);
    }
  };

  /**
   * Actualiza la configuración
   */
  const updateConfig = async (newConfig) => {
    try {
      if (window.electron?.updater) {
        const result = await window.electron.updater.updateConfig(newConfig);
        if (result.success) {
          setConfig(result.config);
          if (toast.current) {
            toast.current.show({
              severity: 'success',
              summary: 'Configuración Guardada',
              detail: 'Los cambios se han aplicado',
              life: 3000,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      if (toast.current) {
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar la configuración',
          life: 3000,
        });
      }
    }
  };

  /**
   * Comprueba manualmente si hay actualizaciones
   */
  const checkForUpdates = async () => {
    console.log('🔍 INICIANDO BÚSQUEDA DE ACTUALIZACIONES');
    setIsChecking(true);
    setUpdateStatus('checking');
    setErrorMessage('');

    try {
      if (window.electron?.updater) {
        console.log('📡 Llamando a electron.updater.checkForUpdates()');
        const result = await window.electron.updater.checkForUpdates();

        console.log('📦 Resultado recibido:', result);

        // Si estamos en modo desarrollo, la simulación ya está en marcha
        if (result?.isDevMode) {
          console.log('🔧 Modo desarrollo detectado - simulación activada');
          // Los eventos llegarán por IPC, no hacemos nada más aquí
          return;
        }

        console.log('✅ Comprobación iniciada - esperando eventos IPC');
        // La respuesta real llegará por eventos IPC desde electron-updater
      } else {
        console.error('❌ window.electron.updater no disponible');
        throw new Error('Sistema de actualización no disponible');
      }
    } catch (error) {
      console.error('❌ ERROR al iniciar comprobación:', error);
      setIsChecking(false);
      setUpdateStatus('error');
      setErrorMessage(error.message || 'Error desconocido');

      if (toast.current) {
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'No se pudo comprobar actualizaciones',
          life: 5000,
        });
      }
    }
  };

  /**
   * Cancela la búsqueda de actualizaciones
   */
  const cancelCheck = () => {
    console.log('🛑 Cancelando búsqueda de actualizaciones');
    setIsChecking(false);
    setUpdateStatus('idle');
    setErrorMessage('');

    if (toast.current) {
      toast.current.show({
        severity: 'info',
        summary: 'Cancelado',
        detail: 'Búsqueda de actualizaciones cancelada',
        life: 3000,
      });
    }
  };

  /**
   * Descarga la actualización
   */
  const downloadUpdate = async () => {
    try {
      if (window.electron?.updater) {
        await window.electron.updater.downloadUpdate();
      }
    } catch (error) {
      console.error('Error descargando actualización:', error);
    }
  };

  /**
   * Instala la actualización y reinicia
   */
  const installUpdate = async () => {
    try {
      if (window.electron?.updater) {
        await window.electron.updater.quitAndInstall();
      }
    } catch (error) {
      console.error('Error instalando actualización:', error);
    }
  };

  /**
   * Limpia el caché de actualizaciones
   */
  const clearUpdateCache = async () => {
    try {
      if (window.electron?.updater) {
        const result = await window.electron.updater.clearCache();
        if (result.success) {
          if (toast.current) {
            toast.current.show({
              severity: 'success',
              summary: 'Caché Limpiado',
              detail: result.message || 'Caché de actualizaciones limpiado correctamente',
              life: 3000,
            });
          }
        } else {
          if (toast.current) {
            toast.current.show({
              severity: 'error',
              summary: 'Error',
              detail: result.error || 'No se pudo limpiar el caché',
              life: 3000,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error limpiando caché:', error);
      if (toast.current) {
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo limpiar el caché de actualizaciones',
          life: 3000,
        });
      }
    }
  };

  // Opciones para el dropdown de canal
  const channelOptions = [
    { label: 'Estable (Recomendado)', value: 'latest' },
    { label: 'Beta (Pruebas)', value: 'beta' },
  ];

  return (
    <div style={{
      padding: '2rem 0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      height: '100%',
      minHeight: '100%',
      width: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>
      <Toast ref={toast} />

      {/* Header */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <i className="pi pi-refresh" style={{
          fontSize: '4rem',
          color: 'var(--primary-color)',
          marginBottom: '1rem',
          display: 'block'
        }}></i>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
          Actualizaciones de NodeTerm
        </h3>
        <p style={{
          margin: '0 0 1rem 0',
          color: 'var(--text-color-secondary)',
          fontSize: '1rem',
          maxWidth: '600px'
        }}>
          Mantén tu aplicación actualizada con las últimas características y correcciones de seguridad.
        </p>
      </div>

      {/* Estado Actual */}
      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem',
        width: '100%',
        maxWidth: '600px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-color)' }}>Versión Actual:</strong>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)', marginTop: '0.5rem' }}>
              v{currentVersion}
            </div>
          </div>

          {updateStatus === 'available' && updateInfo && (
            <div style={{ textAlign: 'right' }}>
              <Badge value={`v${updateInfo.version}`} severity="success" size="large" />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)', marginTop: '0.5rem' }}>
                Nueva versión disponible
              </div>
            </div>
          )}
        </div>

        {/* Mensaje de Estado */}
        {updateStatus === 'checking' && (
          <Message severity="info" text="Comprobando actualizaciones..." style={{ width: '100%', marginTop: '1rem' }} />
        )}

        {updateStatus === 'available' && (isLinux || isAppImage) && (
          <Message
            severity="info"
            text="En Linux (AppImage), te recomendamos buscar y aplicar las actualizaciones directamente desde tu gestor de aplicaciones (como Gear Lever o AppImageLauncher) para evitar que se rompa el acceso directo o el lanzador en tu sistema."
            style={{ width: '100%', marginTop: '1rem' }}
          />
        )}

        {updateStatus === 'downloading' && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-color-secondary)' }}>
              Descargando actualización... {downloadProgress.toFixed(1)}%
            </div>
            <ProgressBar value={downloadProgress} showValue={false} />
          </div>
        )}

        {updateStatus === 'downloaded' && (
          <Message
            severity="success"
            text="Actualización descargada y lista para instalar"
            style={{ width: '100%', marginTop: '1rem' }}
          />
        )}

        {updateStatus === 'error' && (
          <Message
            severity="error"
            text={`Error: ${errorMessage}`}
            style={{ width: '100%', marginTop: '1rem' }}
          />
        )}
      </div>

      {/* Botones de Acción */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {!isChecking ? (
          <Button
            label="Buscar Actualizaciones"
            icon="pi pi-search"
            onClick={checkForUpdates}
            disabled={updateStatus === 'downloading'}
            className="p-button-outlined"
          />
        ) : (
          <Button
            label="Cancelar Búsqueda"
            icon="pi pi-times"
            onClick={cancelCheck}
            className="p-button-danger p-button-outlined"
          />
        )}

        {updateStatus === 'available' && !config.autoDownload && !(isLinux || isAppImage) && (
          <Button
            label="Descargar"
            icon="pi pi-download"
            onClick={downloadUpdate}
            className="p-button-success"
          />
        )}

        {updateStatus === 'downloaded' && !(isLinux || isAppImage) && (
          <Button
            label="Instalar y Reiniciar"
            icon="pi pi-check"
            onClick={installUpdate}
            className="p-button-success"
          />
        )}

        {updateStatus === 'error' && (
          <Button
            label="Limpiar Caché"
            icon="pi pi-trash"
            onClick={clearUpdateCache}
            className="p-button-warning p-button-outlined"
            tooltip={t('tooltips.clearUpdateCache')}
          />
        )}
      </div>

      <Divider />

      {/* Configuración */}
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <h4 style={{
          margin: '0 0 1.5rem 0',
          color: 'var(--text-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="pi pi-cog" style={{ color: 'var(--primary-color)' }}></i>
          Configuración de Actualizaciones
        </h4>

        {/* Auto-comprobación */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'var(--surface-ground)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Checkbox
              checked={config.autoCheck}
              onChange={(e) => updateConfig({ ...config, autoCheck: e.checked })}
            />
            <label style={{ fontWeight: '500', color: 'var(--text-color)' }}>
              Buscar actualizaciones automáticamente
            </label>
          </div>

          {config.autoCheck && (
            <div style={{ marginLeft: '2rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.9rem',
                color: 'var(--text-color-secondary)'
              }}>
                Intervalo de comprobación (horas)
              </label>
              <InputNumber
                value={config.checkIntervalHours}
                onValueChange={(e) => updateConfig({ ...config, checkIntervalHours: e.value })}
                min={1}
                max={168}
                showButtons
                buttonLayout="horizontal"
                style={{ width: '200px' }}
              />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)', marginTop: '0.5rem' }}>
                Recomendado: 24 horas
              </div>
            </div>
          )}
        </div>

        {/* Auto-descarga */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'var(--surface-ground)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Checkbox
              checked={isLinux || isAppImage ? false : config.autoDownload}
              onChange={(e) => updateConfig({ ...config, autoDownload: e.checked })}
              disabled={isLinux || isAppImage}
            />
            <div>
              <label style={{
                display: 'block',
                fontWeight: '500',
                color: 'var(--text-color)',
                marginBottom: '0.25rem'
              }}>
                Descargar actualizaciones automáticamente
              </label>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>
                {isLinux || isAppImage
                  ? 'Desactivado en Linux (gestionado por tu gestor de aplicaciones)'
                  : 'Las actualizaciones se descargarán en segundo plano'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Auto-instalación */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'var(--surface-ground)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Checkbox
              checked={isLinux || isAppImage ? false : config.autoInstall}
              onChange={(e) => updateConfig({ ...config, autoInstall: e.checked })}
              disabled={isLinux || isAppImage || !config.autoDownload} // Deshabilitar si no se descarga automáticamente
            />
            <div>
              <label style={{
                display: 'block',
                fontWeight: '500',
                color: 'var(--text-color)',
                marginBottom: '0.25rem'
              }}>
                Instalar automáticamente
              </label>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>
                {isLinux || isAppImage
                  ? 'Desactivado en Linux'
                  : 'Se instalarán las actualizaciones al reiniciar la aplicación (sin preguntar)'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Canal de actualizaciones */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'var(--surface-ground)',
          borderRadius: '8px'
        }}>
          <label style={{
            display: 'block',
            marginBottom: '0.75rem',
            fontWeight: '500',
            color: 'var(--text-color)'
          }}>
            Canal de actualizaciones
          </label>
          <Dropdown
            value={config.channel}
            options={channelOptions}
            onChange={(e) => updateConfig({ ...config, channel: e.value })}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)', marginTop: '0.75rem' }}>
            {config.channel === 'latest'
              ? '📦 Recibirás solo versiones estables y probadas'
              : '🧪 Recibirás versiones beta con nuevas funcionalidades (puede contener bugs)'
            }
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div style={{
        marginTop: '2rem',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-color-secondary)'
      }}>
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            background: 'var(--orange-100)',
            border: '1px solid var(--orange-300)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            color: 'var(--orange-800)'
          }}>
            <i className="pi pi-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
            <strong>Modo Desarrollo:</strong> Las actualizaciones se prueban con la aplicación empaquetada
          </div>
        )}

        <p style={{ margin: '0.5rem 0' }}>
          <i className="pi pi-info-circle" style={{ marginRight: '0.5rem' }}></i>
          Las actualizaciones se descargan desde GitHub Releases
        </p>
        <p style={{ margin: '0.5rem 0' }}>
          <i className="pi pi-shield" style={{ marginRight: '0.5rem' }}></i>
          Todas las actualizaciones están firmadas y verificadas
        </p>
      </div>
    </div>
  );
};

export default UpdatePanel;

