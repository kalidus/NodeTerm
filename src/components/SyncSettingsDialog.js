import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Divider } from 'primereact/divider';
import { Card } from 'primereact/card';
import { ToggleButton } from 'primereact/togglebutton';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Message } from 'primereact/message';
import { Badge } from 'primereact/badge';
import { Tooltip } from 'primereact/tooltip';
import SyncManager from '../utils/SyncManager';
import { useTranslation } from '../i18n/hooks/useTranslation';

// Función robusta para extraer todas las sesiones SSH del árbol de nodos
function extractAllSshSessions(nodes) {
  let sessions = [];
  if (!Array.isArray(nodes)) return sessions;
  for (const node of nodes) {
    if (node && node.data && node.data.type === 'ssh') {
      sessions.push(node.data);
    }
    if (node && Array.isArray(node.children) && node.children.length > 0) {
      sessions = sessions.concat(extractAllSshSessions(node.children));
    }
  }
  return sessions;
}

const SyncSettingsDialog = ({ visible, onHide, onReloadSessions, sessionManager, exportTreeToJson, importTreeFromJson }) => {
  const { t } = useTranslation('common');
  const [syncManager] = useState(() => new SyncManager(sessionManager));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [syncStatus, setSyncStatus] = useState({});
  const [syncStats, setSyncStats] = useState(null);
  const [autoSyncInterval, setAutoSyncInterval] = useState(5); // Intervalo por defecto: 5 minutos
  
  // Configuración de Nextcloud
  const [nextcloudConfig, setNextcloudConfig] = useState({
    baseUrl: '',
    username: '',
    password: '',
    ignoreSSLErrors: false
  });
  
  const [isConfigured, setIsConfigured] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);

  useEffect(() => {
    loadConfiguration();
    updateSyncStatus();
  }, []);

  const loadConfiguration = async () => {
    // Cargar configuración de Nextcloud si existe (ahora es async)
    try {
      const loaded = await syncManager.nextcloudService.loadConfig();
      
      if (loaded && syncManager.nextcloudService.isConfigured) {
        setNextcloudConfig({
          baseUrl: syncManager.nextcloudService.baseUrl || '',
          username: syncManager.nextcloudService.username || '',
          password: '••••••••', // Mostrar asteriscos por seguridad
          ignoreSSLErrors: syncManager.nextcloudService.ignoreSSLErrors || false
        });
        setIsConfigured(true);
      }
    } catch (error) {
      console.error('Error cargando configuración Nextcloud:', error);
    }
  };

  const updateSyncStatus = async () => {
    const status = syncManager.getSyncStatus();
    setSyncStatus(status);
    setAutoSyncInterval(status.autoSyncIntervalMinutes || 5);
    
    if (status.configured) {
      try {
        const stats = await syncManager.getSyncStats();
        setSyncStats(stats);
      } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
      }
    }
  };

  const handleConfigChange = (field, value) => {
    setNextcloudConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testConnection = async () => {
    if (!nextcloudConfig.baseUrl || !nextcloudConfig.username || !nextcloudConfig.password) {
      setMessage({ severity: 'warn', summary: 'Advertencia', detail: 'Complete todos los campos' });
      return;
    }

    setTestingConnection(true);
    setMessage(null);

    try {
      // Configurar temporalmente para hacer la prueba (ahora es async)
      const tempPassword = nextcloudConfig.password === '••••••••' 
        ? syncManager.nextcloudService.password 
        : nextcloudConfig.password;
        
      await syncManager.nextcloudService.configure(
        nextcloudConfig.baseUrl,
        nextcloudConfig.username,
        tempPassword,
        nextcloudConfig.ignoreSSLErrors
      );

      const result = await syncManager.nextcloudService.testConnection();
      
      if (result.success) {
        setMessage({ severity: 'success', summary: 'Éxito', detail: 'Conexión establecida correctamente' });
        setIsConfigured(true);
        updateSyncStatus();
      }
    } catch (error) {
      setMessage({ severity: 'error', summary: 'Error', detail: error.message });
      setIsConfigured(false);
    } finally {
      setTestingConnection(false);
    }
  };

  const saveConfiguration = async () => {
    if (!isConfigured) {
      setMessage({ severity: 'warn', summary: 'Advertencia', detail: 'Pruebe la conexión primero' });
      return;
    }

    try {
      const tempPassword = nextcloudConfig.password === '••••••••' 
        ? syncManager.nextcloudService.password 
        : nextcloudConfig.password;
        
      await syncManager.nextcloudService.configure(
        nextcloudConfig.baseUrl,
        nextcloudConfig.username,
        tempPassword,
        nextcloudConfig.ignoreSSLErrors
      );

      setMessage({ severity: 'success', summary: 'Guardado', detail: 'Configuración guardada correctamente' });
      updateSyncStatus();
    } catch (error) {
      setMessage({ severity: 'error', summary: 'Error', detail: 'Error guardando configuración' });
    }
  };

  const clearConfiguration = () => {
    syncManager.clearSyncData();
    setNextcloudConfig({ baseUrl: '', username: '', password: '', ignoreSSLErrors: false });
    setIsConfigured(false);
    setSyncStatus({});
    setSyncStats(null);
    setMessage({ severity: 'info', summary: 'Información', detail: 'Configuración eliminada' });
  };

  const toggleSync = async (enabled) => {
    try {
      syncManager.setSyncEnabled(enabled);
      updateSyncStatus();
      
      const status = enabled ? 'habilitada' : 'deshabilitada';
      setMessage({ severity: 'success', summary: 'Sincronización', detail: `Sincronización ${status}` });
    } catch (error) {
      setMessage({ severity: 'error', summary: 'Error', detail: error.message });
    }
  };

  const handleIntervalChange = async (newInterval) => {
    try {
      syncManager.setAutoSyncInterval(newInterval);
      setAutoSyncInterval(newInterval);
      setMessage({ 
        severity: 'success', 
        summary: 'Intervalo actualizado', 
        detail: `Sincronización automática configurada cada ${newInterval} minutos` 
      });
    } catch (error) {
      setMessage({ severity: 'error', summary: 'Error', detail: error.message });
    }
  };

  const performSync = async (direction) => {
    setLoading(true);
    setMessage(null);

    try {
      let result;
      let securityNotice = null;
      
      switch (direction) {
        case 'upload': {
          let treeJson = null;
          if (exportTreeToJson) {
            treeJson = exportTreeToJson();
            if (sessionManager && typeof sessionManager.loadSessionsFromArray === 'function') {
              try {
                const parsed = JSON.parse(treeJson);
                const nodes = Array.isArray(parsed) ? parsed : parsed?.nodes;
                if (Array.isArray(nodes)) {
                  sessionManager.loadSessionsFromArray(extractAllSshSessions(nodes));
                }
              } catch (_) { /* árbol opcional para sesiones */ }
            }
          }
          result = await syncManager.syncToCloud(treeJson);
          break;
        }
        case 'download': {
          result = await syncManager.syncFromCloud();
          if (importTreeFromJson) {
            let treeJson = null;
            try {
              treeJson = await Promise.race([
                syncManager.nextcloudService.downloadFile('nodeterm-tree.json'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout descargando nodeterm-tree.json')), 5000))
              ]);
            } catch (err) {
              console.error('[SYNC] Error descargando árbol:', err);
            }
            if (treeJson) {
              importTreeFromJson(treeJson);
            } else {
              setMessage({ severity: 'warn', summary: 'Sin datos', detail: 'No se encontró árbol remoto en la nube.' });
            }
          }
          if (result?.security?.requiresMasterKey && !result.security.canUnlockSecrets) {
            securityNotice = {
              severity: 'warn',
              summary: 'Clave maestra necesaria',
              detail:
                'Se descargaron vaults cifrados (conexiones y/o contraseñas). La clave maestra no se sincroniza por seguridad: configúrala en este equipo con la misma clave del origen para ver credenciales.'
            };
          } else if (result?.security?.legacyPlainTreePossible) {
            securityNotice = {
              severity: 'info',
              summary: 'Backup anterior detectado',
              detail:
                'Este backup puede incluir credenciales en nodeterm-tree.json sin cifrar. Tras configurar la clave maestra, vuelve a subir a la nube para migrar al formato seguro.'
            };
          }
          break;
        }
        case 'smart':
          result = await syncManager.smartSync();
          break;
        default:
          throw new Error('Dirección de sincronización inválida');
      }

      if (securityNotice) {
        setMessage(securityNotice);
      } else {
        setMessage({
          severity: 'success',
          summary: 'Sincronización completa',
          detail: `${result.message} (${result.itemsCount} elementos)`
        });
      }
      updateSyncStatus();

      // Quitar el refresco visual forzado del árbol
      // if (direction === 'download' && onReloadSessions) {
      //   await onReloadSessions();
      // }
    } catch (error) {
      console.error('[SYNC] Error en sincronización:', error);
      setMessage({ severity: 'error', summary: 'Error de sincronización', detail: error.message });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleString('es-ES');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="pi pi-cloud" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}></i>
          <span>Sincronización en la Nube</span>
        </div>
      }
      visible={visible}
      className="sync-settings-dialog"
      style={{
        maxWidth: '90vw',
        maxHeight: '90vh',
        width: '800px',
        minHeight: '520px'
      }}
      contentStyle={{
        background: 'var(--ui-dialog-bg)',
        color: 'var(--ui-dialog-text)',
        padding: '1.25rem'
      }}
      headerStyle={{
        background: 'var(--ui-dialog-bg)',
        color: 'var(--ui-dialog-text)',
        borderBottom: '1px solid var(--ui-dialog-border)',
        padding: '1rem 1.25rem'
      }}
      onHide={onHide}
      modal
      maximizable
      footer={
        <div style={{
          background: 'var(--ui-dialog-bg)',
          color: 'var(--ui-dialog-text)',
          borderTop: '1px solid var(--ui-dialog-border)',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <Button
            label="Cerrar"
            icon="pi pi-times"
            onClick={onHide}
            className="p-button-text"
          />
        </div>
      }
    >
      <div>
        {/* Mensaje de estado */}
        {message && (
          <Message 
            severity={message.severity} 
            text={message.detail}
            style={{ marginBottom: '1rem', width: '100%' }}
          />
        )}

        <div className="sync-dashboard-grid">
          {/* COLUMNA IZQUIERDA: Configuración */}
          <div className="sync-dashboard-col-left">
            <div className="sync-glass-card">
              <div className="sync-card-header">
                <i className="pi pi-server"></i>
                <h3>Servidor Nextcloud</h3>
                {isConfigured && (
                  <Badge value="Configurado" severity="success" className="sync-status-pulse-success" />
                )}
              </div>

              <div className="sync-form-group">
                <label htmlFor="nc-url">URL del Servidor</label>
                <InputText
                  id="nc-url"
                  value={nextcloudConfig.baseUrl}
                  onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                  placeholder="https://tu-nextcloud.com"
                  style={{ width: '100%' }}
                  disabled={loading || testingConnection}
                />
              </div>

              <div className="sync-form-row-2col">
                <div className="sync-form-group">
                  <label htmlFor="nc-username">Usuario</label>
                  <InputText
                    id="nc-username"
                    value={nextcloudConfig.username}
                    onChange={(e) => handleConfigChange('username', e.target.value)}
                    placeholder="Usuario"
                    style={{ width: '100%' }}
                    disabled={loading || testingConnection}
                  />
                </div>
                <div className="sync-form-group">
                  <label htmlFor="nc-password">Contraseña</label>
                  <Password
                    id="nc-password"
                    value={nextcloudConfig.password}
                    onChange={(e) => handleConfigChange('password', e.target.value)}
                    placeholder="Contraseña"
                    style={{ width: '100%' }}
                    feedback={false}
                    toggleMask
                    disabled={loading || testingConnection}
                  />
                </div>
              </div>

              {/* Opción SSL */}
              <div className="sync-control-row" style={{ marginTop: '1.25rem' }}>
                <div className="sync-control-info">
                  <span className="sync-control-title">Ignorar SSL</span>
                  <span className="sync-control-desc">Permite conexiones con certificados SSL no verificados/autofirmados.</span>
                </div>
                <ToggleButton
                  checked={nextcloudConfig.ignoreSSLErrors}
                  onChange={(e) => handleConfigChange('ignoreSSLErrors', e.value)}
                  onLabel=""
                  offLabel=""
                  onIcon="pi pi-shield-ban"
                  offIcon="pi pi-shield"
                  className={nextcloudConfig.ignoreSSLErrors ? "p-button-warning p-button-sm" : "p-button-outlined p-button-sm"}
                  disabled={loading || testingConnection}
                  tooltip={nextcloudConfig.ignoreSSLErrors ? "Errores SSL ignorados" : "Verificación SSL activa"}
                  tooltipOptions={{ position: 'top' }}
                />
              </div>

              {/* Acciones de Conexión */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'stretch', marginTop: '1.25rem' }}>
                <Button
                  label="Probar"
                  icon={testingConnection ? "pi pi-spin pi-spinner" : "pi pi-check"}
                  onClick={testConnection}
                  loading={testingConnection}
                  disabled={!nextcloudConfig.baseUrl || !nextcloudConfig.username || !nextcloudConfig.password || loading}
                  className="p-button-outlined"
                  style={{ flex: 1 }}
                />
                <Button
                  label="Guardar"
                  icon="pi pi-save"
                  onClick={saveConfiguration}
                  disabled={!isConfigured || loading || testingConnection}
                  style={{ flex: 1 }}
                />
                {isConfigured && (
                  <Button
                    icon="pi pi-trash"
                    onClick={clearConfiguration}
                    className="p-button-outlined p-button-danger"
                    disabled={loading || testingConnection}
                    tooltip="Eliminar configuración"
                    tooltipOptions={{ position: 'top' }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Control, Sincronización y Estado */}
          <div className="sync-dashboard-col-right">
            {/* Si no está configurado, mostramos un aviso amigable y desactivamos las acciones */}
            {!isConfigured ? (
              <div className="sync-glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '300px', opacity: 0.8 }}>
                <i className="pi pi-cloud-lock" style={{ fontSize: '3rem', color: 'var(--text-color-secondary)', marginBottom: '1rem' }}></i>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>Sincronización Inactiva</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-color-secondary)', maxWidth: '280px' }}>
                  Configura y guarda la conexión de Nextcloud a la izquierda para activar el panel de sincronización.
                </p>
              </div>
            ) : (
              <>
                {/* Control de Sincronización */}
                <div className="sync-glass-card">
                  <div className="sync-card-header">
                    <i className="pi pi-cog"></i>
                    <h3>Sincronización Automática</h3>
                    {syncStatus.enabled && (
                      <Badge value="Activo" severity="success" />
                    )}
                  </div>

                  <div className="sync-control-row">
                    <div className="sync-control-info">
                      <span className="sync-control-title">Sincronización Automática</span>
                      <span className="sync-control-desc">
                        Sincroniza tus datos de fondo cada cierto tiempo.
                      </span>
                    </div>
                    <ToggleButton
                      checked={syncStatus.enabled || false}
                      onChange={(e) => toggleSync(e.value)}
                      onLabel="Activo"
                      offLabel="Inactivo"
                      onIcon="pi pi-check"
                      offIcon="pi pi-times"
                      className="p-button-sm"
                    />
                  </div>

                  {/* Configuración del intervalo de sincronización */}
                  {syncStatus.enabled && (
                    <div className="sync-control-row" style={{ animation: 'fadeIn 0.2s ease' }}>
                      <div className="sync-control-info">
                        <span className="sync-control-title">Frecuencia</span>
                        <span className="sync-control-desc">Intervalo de sincronización en minutos.</span>
                      </div>
                      <div className="sync-interval-selector">
                        <Button
                          icon="pi pi-minus"
                          className="sync-interval-btn"
                          onClick={() => {
                            const newValue = Math.max(1, autoSyncInterval - 1);
                            handleIntervalChange(newValue);
                          }}
                        />
                        <InputText
                          value={autoSyncInterval}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 1;
                            const clampedValue = Math.max(1, Math.min(1440, value));
                            handleIntervalChange(clampedValue);
                          }}
                          className="sync-interval-input"
                        />
                        <Button
                          icon="pi pi-plus"
                          className="sync-interval-btn"
                          onClick={() => {
                            const newValue = Math.min(1440, autoSyncInterval + 1);
                            handleIntervalChange(newValue);
                          }}
                        />
                      </div>
                      <span className="sync-interval-unit">min</span>
                    </div>
                  )}
                </div>

                {/* Sincronización Manual */}
                <div className="sync-glass-card">
                  <div className="sync-card-header">
                    <i className="pi pi-sync"></i>
                    <h3>Sincronización Manual</h3>
                  </div>

                  <div className="sync-manual-grid">
                    <button
                      type="button"
                      className="sync-action-card-btn"
                      onClick={() => performSync('upload')}
                      disabled={loading || syncStatus.inProgress}
                      title={t('tooltips.uploadToNextcloud')}
                    >
                      <i className={loading && syncStatus.inProgress ? "pi pi-spin pi-spinner" : "pi pi-cloud-upload"}></i>
                      <span>Subir a Nube</span>
                    </button>
                    <button
                      type="button"
                      className="sync-action-card-btn"
                      onClick={() => performSync('download')}
                      disabled={loading || syncStatus.inProgress}
                      title={t('tooltips.downloadFromNextcloud')}
                    >
                      <i className={loading && syncStatus.inProgress ? "pi pi-spin pi-spinner" : "pi pi-cloud-download"}></i>
                      <span>Descargar</span>
                    </button>
                    <button
                      type="button"
                      className="sync-action-card-btn"
                      onClick={() => performSync('smart')}
                      disabled={loading || syncStatus.inProgress}
                      title={t('tooltips.autoSyncLatest')}
                      style={{ border: '1px solid rgba(var(--primary-color-rgb, 99, 102, 241), 0.25) !important' }}
                    >
                      <i className={loading && syncStatus.inProgress ? "pi pi-spin pi-spinner sync-spin-animation" : "pi pi-refresh"}></i>
                      <span style={{ fontWeight: 'bold' }}>Inteligente</span>
                    </button>
                  </div>
                </div>

                {/* Estado y Estadísticas */}
                <div className="sync-glass-card">
                  <div className="sync-card-header">
                    <i className="pi pi-chart-bar"></i>
                    <h3>Estadísticas y Estado</h3>
                  </div>

                  <div className="sync-stats-grid">
                    <div className="sync-stats-group">
                      <h4>Historial Local</h4>
                      <div className="sync-stat-row">
                        <span className="sync-stat-label">Última sinc:</span>
                        <span className="sync-stat-value">{formatDate(syncStatus.lastSync)}</span>
                      </div>
                      <div className="sync-stat-row">
                        <span className="sync-stat-label">Fondo activa:</span>
                        <span className="sync-stat-value" style={{ color: syncStatus.autoSyncActive ? 'var(--green-500)' : 'var(--text-color-secondary)' }}>
                          {syncStatus.autoSyncActive ? 'Sí' : 'No'}
                        </span>
                      </div>
                    </div>

                    <div className="sync-stats-group">
                      <h4>Nube Remota</h4>
                      {syncStats ? (
                        <>
                          <div className="sync-stat-row">
                            <span className="sync-stat-label">Archivos:</span>
                            <span className="sync-stat-value">{syncStats.totalFiles}</span>
                          </div>
                          <div className="sync-stat-row">
                            <span className="sync-stat-label">Tamaño settings:</span>
                            <span className="sync-stat-value">{formatFileSize(syncStats.settingsFileSize)}</span>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                          <i className="pi pi-spin pi-spinner" style={{ fontSize: '0.8rem' }}></i>
                          <span>Cargando...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sección Informativa Colapsable "¿Qué se sincroniza?" */}
        <div className="sync-glass-card sync-info-accordion" style={{ marginTop: '1.25rem' }}>
          <button 
            type="button" 
            className="sync-info-trigger" 
            onClick={() => setInfoExpanded(!infoExpanded)}
          >
            <span>¿Qué datos se sincronizan con Nextcloud?</span>
            <i className={`pi ${infoExpanded ? 'pi-chevron-up' : 'pi-chevron-down'}`} style={{ fontSize: '0.8rem' }}></i>
          </button>
          
          <div className={`sync-info-content ${infoExpanded ? 'expanded' : ''}`}>
            <div className="sync-info-details">
              <div>
                <h5>Configuración de Terminal</h5>
                <ul>
                  <li>Fuentes, tamaños y temas de colores</li>
                  <li>Configuración de PowerShell y Linux</li>
                  <li>Ajustes de la barra de estado y terminales activos</li>
                </ul>
              </div>
              <div>
                <h5>Configuración de Interfaz</h5>
                <ul>
                  <li>Temas generales y colores de la app</li>
                  <li>Explorador de archivos e iconos</li>
                  <li>Historial de conexiones y notas locales</li>
                </ul>
              </div>
            </div>
            <div className="sync-info-security-notice">
              <i className="pi pi-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
              <strong>Nota de Seguridad:</strong> Las contraseñas en claro y claves maestras no se suben a la nube. Todos los datos sensibles almacenados en Nextcloud se cifran con tu clave maestra local.
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default SyncSettingsDialog;