/**
 * SSHTunnelTab - Tab para mostrar el estado y logs de un túnel SSH activo
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useTranslation } from '../i18n/hooks/useTranslation';

const SSHTunnelTab = ({
  tunnelConfig,
  tunnelId,
  onClose,
  onStatusChange
}) => {
  const { t } = useTranslation('dialogs');
  
  const [status, setStatus] = useState('stopped');
  const [logs, setLogs] = useState([]);
  const [connections, setConnections] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const logsEndRef = useRef(null);
  const activeTunnelIdRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Escuchar eventos de estado del túnel
  useEffect(() => {
    const handleStatusChange = (event, data) => {
      if (data.tunnelId === activeTunnelIdRef.current) {
        setStatus(data.status);
        if (data.error) {
          setError(data.error);
        }
        if (onStatusChange) {
          onStatusChange(data.status);
        }
      }
    };

    const handleLog = (event, data) => {
      if (data.tunnelId === activeTunnelIdRef.current) {
        setLogs(prev => [...prev, data.log]);
      }
    };

    // Escuchar eventos IPC
    if (window.electronAPI) {
      window.electronAPI.on('ssh-tunnel:status-changed', handleStatusChange);
      window.electronAPI.on('ssh-tunnel:log', handleLog);
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeListener('ssh-tunnel:status-changed', handleStatusChange);
        window.electronAPI.removeListener('ssh-tunnel:log', handleLog);
      }
    };
  }, [onStatusChange]);

  // Iniciar túnel automáticamente al montar
  useEffect(() => {
    if (tunnelConfig && !activeTunnelIdRef.current) {
      startTunnel();
    }
    
    return () => {
      // Detener túnel al desmontar
      if (activeTunnelIdRef.current) {
        stopTunnel();
      }
    };
  }, []);

  // Iniciar túnel
  const startTunnel = useCallback(async () => {
    if (!tunnelConfig) return;
    
    setIsLoading(true);
    setError(null);
    setStatus('connecting');
    setLogs([{ timestamp: new Date().toISOString(), level: 'info', message: 'Iniciando túnel...' }]);

    try {
      const result = await window.electronAPI.invoke('ssh-tunnel:start', tunnelConfig);
      
      if (result.success) {
        activeTunnelIdRef.current = result.tunnelId;
        setStatus('active');
        setLogs(prev => [...prev, { 
          timestamp: new Date().toISOString(), 
          level: 'info', 
          message: `Túnel activo con ID: ${result.tunnelId}` 
        }]);
      } else {
        setStatus('error');
        setError(result.error);
        setLogs(prev => [...prev, { 
          timestamp: new Date().toISOString(), 
          level: 'error', 
          message: `Error: ${result.error}` 
        }]);
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
      setLogs(prev => [...prev, { 
        timestamp: new Date().toISOString(), 
        level: 'error', 
        message: `Error: ${err.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [tunnelConfig]);

  // Detener túnel
  const stopTunnel = useCallback(async () => {
    if (!activeTunnelIdRef.current) return;
    
    setIsLoading(true);

    try {
      await window.electronAPI.invoke('ssh-tunnel:stop', { tunnelId: activeTunnelIdRef.current });
      setStatus('stopped');
      setLogs(prev => [...prev, { 
        timestamp: new Date().toISOString(), 
        level: 'info', 
        message: 'Túnel detenido' 
      }]);
      activeTunnelIdRef.current = null;
    } catch (err) {
      setLogs(prev => [...prev, { 
        timestamp: new Date().toISOString(), 
        level: 'error', 
        message: `Error al detener: ${err.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reconectar túnel
  const reconnectTunnel = useCallback(async () => {
    await stopTunnel();
    await startTunnel();
  }, [stopTunnel, startTunnel]);

  // Obtener etiqueta de estado
  const getStatusTag = () => {
    switch (status) {
      case 'active':
        return <Tag severity="success" value={t('sshTunnel.status.active') || 'Activo'} icon="pi pi-check-circle" />;
      case 'connecting':
        return <Tag severity="info" value={t('sshTunnel.status.connecting') || 'Conectando...'} icon="pi pi-spin pi-spinner" />;
      case 'error':
        return <Tag severity="danger" value={t('sshTunnel.status.error') || 'Error'} icon="pi pi-times-circle" />;
      case 'disconnected':
        return <Tag severity="warning" value={t('sshTunnel.status.disconnected') || 'Desconectado'} icon="pi pi-exclamation-triangle" />;
      default:
        return <Tag severity="secondary" value={t('sshTunnel.status.stopped') || 'Detenido'} icon="pi pi-stop-circle" />;
    }
  };

  // Obtener descripción del tipo de túnel
  const getTunnelTypeDescription = () => {
    switch (tunnelConfig?.tunnelType) {
      case 'local':
        return `Local: localhost:${tunnelConfig.localPort} → ${tunnelConfig.remoteHost}:${tunnelConfig.remotePort}`;
      case 'remote':
        return `Remote: ${tunnelConfig.sshHost}:${tunnelConfig.remotePort} → localhost:${tunnelConfig.localPort}`;
      case 'dynamic':
        return `SOCKS Proxy: localhost:${tunnelConfig.localPort}`;
      default:
        return 'Desconocido';
    }
  };

  // Formatear timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Obtener color del log según nivel
  const getLogColor = (level) => {
    switch (level) {
      case 'error':
        return '#f38ba8';
      case 'warn':
        return '#fab387';
      case 'info':
        return '#89b4fa';
      case 'debug':
        return '#6c7086';
      default:
        return '#cdd6f4';
    }
  };

  return (
    <div className="ssh-tunnel-tab" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--ui-content-bg)',
      color: 'var(--ui-dialog-text)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem',
        borderBottom: '1px solid var(--ui-content-border)',
        background: 'var(--ui-card-bg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <i className="pi pi-share-alt" style={{ fontSize: '1.5rem', color: '#89b4fa' }}></i>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
              {tunnelConfig?.name || 'Túnel SSH'}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--ui-dialog-text-muted)' }}>
              {getTunnelTypeDescription()}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {getStatusTag()}
          
          {connections > 0 && (
            <Tag value={`${connections} ${t('sshTunnel.connections') || 'conexiones'}`} severity="info" />
          )}
        </div>
      </div>

      {/* Info del túnel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        padding: '1rem',
        background: 'var(--ui-card-bg)',
        borderBottom: '1px solid var(--ui-content-border)'
      }}>
        <div className="tunnel-info-item">
          <span style={{ color: 'var(--ui-dialog-text-muted)', fontSize: '0.8rem' }}>
            {t('sshTunnel.fields.sshServer') || 'Servidor SSH'}
          </span>
          <span style={{ fontWeight: '500' }}>
            {tunnelConfig?.sshHost}:{tunnelConfig?.sshPort || 22}
          </span>
        </div>
        <div className="tunnel-info-item">
          <span style={{ color: 'var(--ui-dialog-text-muted)', fontSize: '0.8rem' }}>
            {t('sshTunnel.fields.sshLogin') || 'Usuario'}
          </span>
          <span style={{ fontWeight: '500' }}>
            {tunnelConfig?.sshUser}
          </span>
        </div>
        <div className="tunnel-info-item">
          <span style={{ color: 'var(--ui-dialog-text-muted)', fontSize: '0.8rem' }}>
            {t('sshTunnel.fields.localPort') || 'Puerto local'}
          </span>
          <span style={{ fontWeight: '500' }}>
            {tunnelConfig?.localPort}
          </span>
        </div>
        {tunnelConfig?.tunnelType !== 'dynamic' && (
          <div className="tunnel-info-item">
            <span style={{ color: 'var(--ui-dialog-text-muted)', fontSize: '0.8rem' }}>
              {tunnelConfig?.tunnelType === 'local' 
                ? (t('sshTunnel.fields.remoteHost') || 'Host remoto')
                : (t('sshTunnel.fields.forwardedPort') || 'Puerto reenviado')
              }
            </span>
            <span style={{ fontWeight: '500' }}>
              {tunnelConfig?.tunnelType === 'local' 
                ? `${tunnelConfig?.remoteHost}:${tunnelConfig?.remotePort}`
                : tunnelConfig?.remotePort
              }
            </span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(243, 139, 168, 0.1)',
          borderBottom: '1px solid rgba(243, 139, 168, 0.3)',
          color: '#f38ba8',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="pi pi-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Logs */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '0.5rem',
        fontFamily: 'monospace',
        fontSize: '0.85rem',
        background: '#1e1e2e'
      }}>
        {logs.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: '#6c7086'
          }}>
            {isLoading ? (
              <ProgressSpinner style={{ width: '50px', height: '50px' }} />
            ) : (
              <span>{t('sshTunnel.noLogs') || 'Sin logs disponibles'}</span>
            )}
          </div>
        ) : (
          logs.map((log, index) => (
            <div 
              key={index} 
              style={{ 
                padding: '0.25rem 0.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <span style={{ color: '#6c7086', marginRight: '0.5rem' }}>
                [{formatTime(log.timestamp)}]
              </span>
              <span style={{ 
                color: getLogColor(log.level),
                textTransform: 'uppercase',
                marginRight: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {log.level}
              </span>
              <span style={{ color: '#cdd6f4' }}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '0.5rem',
        padding: '1rem',
        borderTop: '1px solid var(--ui-content-border)',
        background: 'var(--ui-card-bg)'
      }}>
        <Button
          label={t('sshTunnel.actions.clearLogs') || 'Limpiar logs'}
          icon="pi pi-trash"
          className="p-button-text p-button-secondary"
          onClick={() => setLogs([])}
          disabled={logs.length === 0}
        />
        
        {status === 'active' ? (
          <>
            <Button
              label={t('sshTunnel.actions.reconnect') || 'Reconectar'}
              icon="pi pi-refresh"
              className="p-button-outlined"
              onClick={reconnectTunnel}
              loading={isLoading}
            />
            <Button
              label={t('sshTunnel.actions.stop') || 'Detener'}
              icon="pi pi-stop"
              className="p-button-danger"
              onClick={stopTunnel}
              loading={isLoading}
            />
          </>
        ) : (
          <Button
            label={t('sshTunnel.actions.start') || 'Iniciar'}
            icon="pi pi-play"
            className="p-button-success"
            onClick={startTunnel}
            loading={isLoading}
            disabled={status === 'connecting'}
          />
        )}
      </div>
    </div>
  );
};

export default SSHTunnelTab;
