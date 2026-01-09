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
      
      switch (direction) {
        case 'upload':
          // Subir árbol completo de nodos
          let treeJson = null;
          if (exportTreeToJson) {
            treeJson = exportTreeToJson();
            await syncManager.nextcloudService.uploadFile('nodeterm-tree.json', treeJson);
            // Árbol exportado a la nube
            // Listar archivos tras la subida
            const files = await syncManager.nextcloudService.listFiles();
            // Log de debug removido para limpiar la consola
            // --- Sincronizar sesiones SSH con SessionManager ---
            const nodes = JSON.parse(treeJson);
            const sshSessions = extractAllSshSessions(nodes);
            // Logs de debug removidos para limpiar la consola
            if (sessionManager && typeof sessionManager.loadSessionsFromArray === 'function') {
              sessionManager.loadSessionsFromArray(sshSessions);
              // Log de debug removido para limpiar la consola
            }
          }
          result = await syncManager.syncToCloud(treeJson);
          break;
        case 'download':
          // Descargar y restaurar árbol completo de nodos
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
              const ok = importTreeFromJson(treeJson);
            } else {
              setMessage({ severity: 'warn', summary: 'Sin datos', detail: 'No se encontró árbol remoto en la nube.' });
            }
          }
          break;
        case 'smart':
          result = await syncManager.smartSync();
          break;
        default:
          throw new Error('Dirección de sincronización inválida');
      }

      setMessage({ 
        severity: 'success', 
        summary: 'Sincronización completa', 
        detail: `${result.message} (${result.itemsCount} elementos)` 
      });
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
        minWidth: '700px',
        minHeight: '600px'
      }}
      contentStyle={{
        background: 'var(--ui-dialog-bg)',
        color: 'var(--ui-dialog-text)'
      }}
      headerStyle={{
        background: 'var(--ui-dialog-bg)',
        color: 'var(--ui-dialog-text)',
        borderBottom: '1px solid var(--ui-dialog-border)'
      }}
      onHide={onHide}
      modal
      maximizable
      footer={
        <div style={{
          background: 'var(--ui-dialog-bg)',
          color: 'var(--ui-dialog-text)',
          borderTop: '1px solid var(--ui-dialog-border)'
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
      <div style={{ padding: '1rem' }}>
        {/* Mensaje de estado */}
        {message && (
          <Message 
            severity={message.severity} 
            text={message.detail}
            style={{ marginBottom: '1rem', width: '100%' }}
          />
        )}

        {/* Configuración de Nextcloud */}
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="pi pi-server" style={{ color: 'var(--primary-color)' }}></i>
              <span>Configuración de Nextcloud</span>
              {isConfigured && (
                <Badge value="Configurado" severity="success" />
              )}
            </div>
          }
          style={{ marginBottom: '1rem' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="nc-url" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                URL del servidor Nextcloud
              </label>
              <InputText
                id="nc-url"
                value={nextcloudConfig.baseUrl}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                placeholder="https://tu-nextcloud.com"
                style={{ width: '100%' }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label htmlFor="nc-username" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Usuario
                </label>
                <InputText
                  id="nc-username"
                  value={nextcloudConfig.username}
                  onChange={(e) => handleConfigChange('username', e.target.value)}
                  placeholder="usuario"
                  style={{ width: '100%' }}
                />
              </div>
              
              <div>
                <label htmlFor="nc-password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Contraseña
                </label>
                <Password
                  id="nc-password"
                  value={nextcloudConfig.password}
                  onChange={(e) => handleConfigChange('password', e.target.value)}
                  placeholder="contraseña"
                  style={{ width: '100%' }}
                  feedback={false}
                  toggleMask
                />
              </div>
            </div>

            {/* Opción para ignorar errores SSL */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface-50)', borderRadius: '6px', border: '1px solid var(--surface-200)' }}>
              <div>
                <h5 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-color)' }}>Ignorar Errores SSL</h5>
                <p style={{ margin: 0, color: 'var(--text-color-secondary)', fontSize: '0.85rem' }}>
                  Habilita esta opción si tu servidor Nextcloud tiene certificados SSL autofirmados o problemas de certificados
                </p>
              </div>
              <ToggleButton
                checked={nextcloudConfig.ignoreSSLErrors}
                onChange={(e) => handleConfigChange('ignoreSSLErrors', e.value)}
                onLabel="Habilitado"
                offLabel="Deshabilitado"
                onIcon="pi pi-shield"
                offIcon="pi pi-shield"
                className={nextcloudConfig.ignoreSSLErrors ? "p-button-warning" : "p-button-outlined"}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button
                label="Probar Conexión"
                icon={testingConnection ? "pi pi-spin pi-spinner" : "pi pi-check"}
                onClick={testConnection}
                loading={testingConnection}
                disabled={!nextcloudConfig.baseUrl || !nextcloudConfig.username || !nextcloudConfig.password}
                className="p-button-outlined"
              />
              <Button
                label="Guardar"
                icon="pi pi-save"
                onClick={saveConfiguration}
                disabled={!isConfigured}
              />
              {isConfigured && (
                <Button
                  label="Limpiar"
                  icon="pi pi-trash"
                  onClick={clearConfiguration}
                  className="p-button-outlined p-button-danger"
                />
              )}
            </div>
          </div>
        </Card>

        {/* Control de Sincronización */}
        {isConfigured && (
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="pi pi-sync" style={{ color: 'var(--primary-color)' }}></i>
                <span>Control de Sincronización</span>
                {syncStatus.enabled && (
                  <Badge value="Activo" severity="success" />
                )}
              </div>
            }
            style={{ marginBottom: '1rem' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Toggle de sincronización */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>Sincronización Automática</h4>
                  <p style={{ margin: 0, color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>
                    Sincroniza automáticamente cada {autoSyncInterval} minutos
                  </p>
                </div>
                <ToggleButton
                  checked={syncStatus.enabled || false}
                  onChange={(e) => toggleSync(e.value)}
                  onLabel="Habilitada"
                  offLabel="Deshabilitada"
                  onIcon="pi pi-check"
                  offIcon="pi pi-times"
                />
              </div>

              {/* Configuración del intervalo de sincronización */}
              {syncStatus.enabled && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: 'var(--surface-50)',
                  borderRadius: '6px',
                  border: '1px solid var(--surface-200)'
                }}>
                  <div>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>Intervalo de Sincronización</h5>
                    <p style={{ margin: 0, color: 'var(--text-color-secondary)', fontSize: '0.85rem' }}>
                      Configura cada cuántos minutos se sincronizará automáticamente (1-1440 minutos)
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      border: '1px solid var(--surface-300)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: 'var(--surface-0)'
                    }}>
                      <Button
                        icon="pi pi-minus"
                        className="p-button-secondary p-button-sm"
                        onClick={() => {
                          const newValue = Math.max(1, autoSyncInterval - 1);
                          handleIntervalChange(newValue);
                        }}
                        style={{ 
                          borderRadius: 0,
                          border: 'none',
                          minWidth: '40px'
                        }}
                      />
                      <InputText
                        value={autoSyncInterval}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          const clampedValue = Math.max(1, Math.min(1440, value));
                          handleIntervalChange(clampedValue);
                        }}
                        style={{ 
                          width: '60px',
                          textAlign: 'center',
                          border: 'none',
                          borderRadius: 0,
                          fontSize: '0.9rem'
                        }}
                      />
                      <Button
                        icon="pi pi-plus"
                        className="p-button-secondary p-button-sm"
                        onClick={() => {
                          const newValue = Math.min(1440, autoSyncInterval + 1);
                          handleIntervalChange(newValue);
                        }}
                        style={{ 
                          borderRadius: 0,
                          border: 'none',
                          minWidth: '40px'
                        }}
                      />
                    </div>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      color: 'var(--text-color-secondary)',
                      marginLeft: '0.5rem'
                    }}>minutos</span>
                  </div>
                </div>
              )}

              <Divider />

              {/* Botones de sincronización manual */}
              <div>
                <h4 style={{ margin: '0 0 1rem 0' }}>Sincronización Manual</h4>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <Button
                    label="Subir a la Nube"
                    icon="pi pi-cloud-upload"
                    onClick={() => performSync('upload')}
                    loading={loading}
                    disabled={loading || syncStatus.inProgress}
                    className="p-button-outlined"
                    tooltip={t('tooltips.uploadToNextcloud')}
                  />
                  <Button
                    label="Descargar de la Nube"
                    icon="pi pi-cloud-download"
                    onClick={() => performSync('download')}
                    loading={loading}
                    disabled={loading || syncStatus.inProgress}
                    className="p-button-outlined"
                    tooltip={t('tooltips.downloadFromNextcloud')}
                  />
                  <Button
                    label="Sincronización Inteligente"
                    icon="pi pi-refresh"
                    onClick={() => performSync('smart')}
                    loading={loading}
                    disabled={loading || syncStatus.inProgress}
                    tooltip={t('tooltips.autoSyncLatest')}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Estado y Estadísticas */}
        {isConfigured && (
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="pi pi-info-circle" style={{ color: 'var(--primary-color)' }}></i>
                <span>Estado y Estadísticas</span>
              </div>
            }
            style={{ marginBottom: '1rem' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Estado de sincronización */}
              <div>
                <h4 style={{ margin: '0 0 1rem 0' }}>Estado de Sincronización</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Estado:</span>
                    <span style={{ 
                      color: syncStatus.enabled ? 'var(--green-500)' : 'var(--orange-500)',
                      fontWeight: 'bold'
                    }}>
                      {syncStatus.enabled ? 'Habilitada' : 'Deshabilitada'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Última sincronización:</span>
                    <span>{formatDate(syncStatus.lastSync)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sincronización automática:</span>
                    <span style={{ 
                      color: syncStatus.autoSyncActive ? 'var(--green-500)' : 'var(--text-color-secondary)'
                    }}>
                      {syncStatus.autoSyncActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Intervalo configurado:</span>
                    <span style={{ 
                      color: 'var(--primary-color)',
                      fontWeight: 'bold'
                    }}>
                      {syncStatus.autoSyncIntervalMinutes || 5} minutos
                    </span>
                  </div>
                  {syncStatus.inProgress && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                      <ProgressSpinner size="20px" strokeWidth="4" />
                      <span>Sincronizando...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Estadísticas de la nube */}
              <div>
                <h4 style={{ margin: '0 0 1rem 0' }}>Estadísticas de la Nube</h4>
                {syncStats ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Archivos totales:</span>
                      <span>{syncStats.totalFiles}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Archivo de configuración:</span>
                      <span style={{ 
                        color: syncStats.settingsFileExists ? 'var(--green-500)' : 'var(--orange-500)'
                      }}>
                        {syncStats.settingsFileExists ? 'Existe' : 'No encontrado'}
                      </span>
                    </div>
                    {syncStats.settingsFileExists && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Tamaño del archivo:</span>
                          <span>{formatFileSize(syncStats.settingsFileSize)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Última modificación:</span>
                          <span>{formatDate(syncStats.settingsLastModified)}</span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color-secondary)' }}>
                    <ProgressSpinner size="20px" strokeWidth="4" />
                    <span>Cargando estadísticas...</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Información sobre qué se sincroniza */}
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="pi pi-list" style={{ color: 'var(--primary-color)' }}></i>
              <span>¿Qué se sincroniza?</span>
            </div>
          }
        >
          <div style={{ fontSize: '0.9rem', color: 'var(--text-color-secondary)' }}>
            <p style={{ marginBottom: '1rem' }}>
              NodeTerm sincroniza toda tu configuración personal para que tengas la misma experiencia en todos tus dispositivos:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>Configuración de Terminal:</h5>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  <li>Fuentes y tamaños</li>
                  <li>Temas de colores</li>
                  <li>Configuración de PowerShell y Linux</li>
                  <li>Altura de la barra de estado</li>
                </ul>
              </div>
              <div>
                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>Configuración de Interfaz:</h5>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  <li>Temas de la interfaz</li>
                  <li>Iconos y fuentes del explorador</li>
                  <li>Configuración de la barra de estado</li>
                  <li>Historial de conexiones</li>
                </ul>
              </div>
            </div>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface-100)', borderRadius: '6px', borderLeft: '4px solid var(--primary-color)' }}>
              <strong>Nota de seguridad:</strong> Las contraseñas SSH no se sincronizan por razones de seguridad.
            </div>
          </div>
        </Card>
      </div>
    </Dialog>
  );
};

export default SyncSettingsDialog;