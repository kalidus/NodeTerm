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

const UpdatePanel = () => {
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
  
  const toast = useRef(null);

  // Cargar configuración y versión al montar
  useEffect(() => {
    loadConfig();
    loadCurrentVersion();
    
    // Suscribirse a eventos de actualización
    const handleUpdaterEvent = (event, data) => {
      handleUpdateEvent(data);
    };
    
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('updater-event', handleUpdaterEvent);
      
      return () => {
        window.electron.ipcRenderer.removeListener('updater-event', handleUpdaterEvent);
      };
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
          if (result.updateAvailable) {
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
   * Maneja eventos de actualización del proceso principal
   */
  const handleUpdateEvent = (data) => {
    const { event, data: eventData } = data;
    
    switch (event) {
      case 'checking-for-update':
        setUpdateStatus('checking');
        setIsChecking(true);
        break;
        
      case 'update-available':
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
        setUpdateStatus('downloading');
        setDownloadProgress(eventData.percent || 0);
        break;
        
      case 'update-downloaded':
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
        break;
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
    setIsChecking(true);
    setUpdateStatus('checking');
    
    try {
      if (window.electron?.updater) {
        const result = await window.electron.updater.checkForUpdates();
        
        // Manejar respuesta del modo desarrollo
        if (result.isDevMode) {
          if (toast.current) {
            toast.current.show({
              severity: 'info',
              summary: 'Modo Desarrollo',
              detail: 'Las actualizaciones se prueban con la aplicación empaquetada',
              life: 5000,
            });
          }
          setIsChecking(false);
          setUpdateStatus('idle');
          return;
        }
      }
    } catch (error) {
      console.error('Error comprobando actualizaciones:', error);
      setIsChecking(false);
      setUpdateStatus('error');
      setErrorMessage(error.message || 'Error desconocido');
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
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
      width: '100%'
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
        <Button
          label="Buscar Actualizaciones"
          icon={isChecking ? 'pi pi-spin pi-spinner' : 'pi pi-search'}
          onClick={checkForUpdates}
          disabled={isChecking || updateStatus === 'downloading'}
          className="p-button-outlined"
        />
        
        {updateStatus === 'available' && !config.autoDownload && (
          <Button
            label="Descargar"
            icon="pi pi-download"
            onClick={downloadUpdate}
            className="p-button-success"
          />
        )}
        
        {updateStatus === 'downloaded' && (
          <Button
            label="Instalar y Reiniciar"
            icon="pi pi-check"
            onClick={installUpdate}
            className="p-button-success"
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
              checked={config.autoDownload}
              onChange={(e) => updateConfig({ ...config, autoDownload: e.checked })}
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
                Las actualizaciones se descargarán en segundo plano
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

