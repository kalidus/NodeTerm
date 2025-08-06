import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';

const GuacamoleTab = ({ config, tabId }) => {
  const toast = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);

  // Referencia al contenedor donde se embeberá Guacamole
  const guacamoleContainerRef = useRef(null);

  useEffect(() => {
    // Inicializar la pestaña de Guacamole
    console.log('GuacamoleTab initialized with config:', config);
    
    // Aquí se puede inicializar la conexión con Guacamole
    // Por ahora solo mostramos el contenedor vacío
  }, [config]);

  const handleConnect = () => {
    setIsLoading(true);
    setConnectionStatus('connecting');
    setError(null);

    // Simular conexión (aquí se implementaría la conexión real con Guacamole)
    setTimeout(() => {
      setIsLoading(false);
      setConnectionStatus('connected');
      toast.current?.show({
        severity: 'success',
        summary: 'Conectado',
        detail: 'Conexión Guacamole establecida',
        life: 3000
      });
    }, 2000);
  };

  const handleDisconnect = () => {
    setConnectionStatus('disconnected');
    toast.current?.show({
      severity: 'info',
      summary: 'Desconectado',
      detail: 'Conexión Guacamole terminada',
      life: 3000
    });
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'error': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Conectado';
      case 'connecting': return 'Conectando...';
      case 'error': return 'Error';
      default: return 'Desconectado';
    }
  };

  return (
    <div className="guacamole-tab h-full flex flex-column">
      <Toast ref={toast} />
      
      {/* Header con información de conexión */}
      <Card className="mb-3">
        <div className="flex justify-content-between align-items-center">
          <div className="flex align-items-center gap-3">
            <i className="pi pi-desktop" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}></i>
            <div>
              <h3 className="m-0">{config.name || 'Conexión Guacamole'}</h3>
              <p className="m-0 text-color-secondary">
                {config.server}:{config.port} - {config.username}
              </p>
            </div>
          </div>
          <div className="flex align-items-center gap-2">
            <div className={`p-2 border-round ${getStatusColor() === 'success' ? 'bg-green-100' : 
              getStatusColor() === 'warning' ? 'bg-yellow-100' : 
              getStatusColor() === 'danger' ? 'bg-red-100' : 'bg-gray-100'}`}>
              <span className={`text-${getStatusColor()} font-semibold`}>
                {getStatusText()}
              </span>
            </div>
            {connectionStatus === 'disconnected' && (
              <Button
                label="Conectar"
                icon="pi pi-play"
                className="p-button-success"
                onClick={handleConnect}
                disabled={isLoading}
              />
            )}
            {connectionStatus === 'connected' && (
              <Button
                label="Desconectar"
                icon="pi pi-stop"
                className="p-button-danger"
                onClick={handleDisconnect}
              />
            )}
            {isLoading && <ProgressSpinner style={{ width: '20px', height: '20px' }} />}
          </div>
        </div>
      </Card>

      {/* Contenedor principal para Guacamole */}
      <Card className="flex-1">
        <div 
          ref={guacamoleContainerRef}
          className="guacamole-container w-full h-full flex align-items-center justify-content-center"
          style={{ 
            minHeight: '400px',
            backgroundColor: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '4px'
          }}
        >
          {connectionStatus === 'disconnected' && (
            <div className="text-center">
              <i className="pi pi-desktop" style={{ fontSize: '4rem', color: '#666' }}></i>
              <h4 className="text-color-secondary mt-3">Pestaña de Guacamole</h4>
              <p className="text-color-secondary">
                Haz clic en "Conectar" para establecer la conexión RDP
              </p>
              <Button
                label="Conectar"
                icon="pi pi-play"
                className="p-button-success"
                onClick={handleConnect}
                disabled={isLoading}
              />
            </div>
          )}
          
          {connectionStatus === 'connecting' && (
            <div className="text-center">
              <ProgressSpinner style={{ width: '50px', height: '50px' }} />
              <h4 className="text-color-secondary mt-3">Conectando...</h4>
              <p className="text-color-secondary">
                Estableciendo conexión con {config.server}
              </p>
            </div>
          )}
          
          {connectionStatus === 'connected' && (
            <div className="text-center w-full h-full">
              <div className="guacamole-embed-placeholder w-full h-full flex align-items-center justify-content-center">
                <div className="text-center">
                  <i className="pi pi-check-circle" style={{ fontSize: '3rem', color: '#22c55e' }}></i>
                  <h4 className="text-color mt-3">Conectado a Guacamole</h4>
                  <p className="text-color-secondary">
                    Contenedor preparado para embeber cliente RDP
                  </p>
                  <div className="mt-3 p-3 border-round" style={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}>
                    <p className="text-color-secondary m-0">
                      <strong>Servidor:</strong> {config.server}:{config.port}<br/>
                      <strong>Usuario:</strong> {config.username}<br/>
                      <strong>Resolución:</strong> {config.resolution}<br/>
                      <strong>Color:</strong> {config.colorDepth} bits
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {connectionStatus === 'error' && (
            <div className="text-center">
              <i className="pi pi-exclamation-triangle" style={{ fontSize: '4rem', color: '#ef4444' }}></i>
              <h4 className="text-color-secondary mt-3">Error de Conexión</h4>
              <p className="text-color-secondary">
                {error || 'No se pudo establecer la conexión'}
              </p>
              <Button
                label="Reintentar"
                icon="pi pi-refresh"
                className="p-button-warning"
                onClick={handleConnect}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default GuacamoleTab;
