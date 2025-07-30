import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tag } from 'primereact/tag';
import { Divider } from 'primereact/divider';

const ActiveXRdpSession = ({ rdpConfig, tabId, onClose }) => {
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [credentials, setCredentials] = useState({
        username: rdpConfig.username || '',
        password: ''
    });
    const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
    const [rdpInstanceId, setRdpInstanceId] = useState(null);
    const [error, setError] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [displaySettings, setDisplaySettings] = useState({
        width: rdpConfig.width || 1024,
        height: rdpConfig.height || 768
    });
    
    const rdpContainerRef = useRef(null);
    const toast = useRef(null);

    // Inicializar el control RDP ActiveX cuando el componente se monta
    useEffect(() => {
        initializeRdpControl();
        
        // Cleanup al desmontar
        return () => {
            if (rdpInstanceId) {
                disconnectRdp();
            }
        };
    }, []);

    // Conectar automáticamente cuando el control esté listo
    useEffect(() => {
        if (rdpInstanceId && connectionStatus === 'disconnected' && !isConnecting) {
            // Intentar conectar automáticamente si tenemos credenciales
            if (rdpConfig.username && rdpConfig.password) {
                setCredentials({
                    username: rdpConfig.username,
                    password: rdpConfig.password
                });
                // Pequeño delay para asegurar que el control esté listo
                setTimeout(() => {
                    connectRdp();
                }, 1000);
            }
        }
    }, [rdpInstanceId, connectionStatus]);

    const initializeRdpControl = async () => {
        try {
            console.log('ActiveXRdpSession: Inicializando control RDP...');
            
            // Simular inicialización exitosa para testing
            const mockInstanceId = `mock_${Date.now()}`;
            setRdpInstanceId(mockInstanceId);
            
            console.log('ActiveXRdpSession: Instancia mock creada con ID:', mockInstanceId);
            console.log('ActiveXRdpSession: Control RDP inicializado correctamente (MOCK)');

        } catch (error) {
            console.error('ActiveXRdpSession: Error initializing RDP control:', error);
            setError(error.message);
            toast.current?.show({
                severity: 'error',
                summary: 'Error de Inicialización',
                detail: error.message,
                life: 5000
            });
        }
    };

    const connectRdp = async () => {
        if (!rdpInstanceId) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Control RDP no inicializado',
                life: 3000
            });
            return;
        }

        if (!credentials.username || !credentials.password) {
            setShowCredentialsDialog(true);
            return;
        }

        try {
            setIsConnecting(true);
            setConnectionStatus('connecting');

            // Simular conexión para testing
            console.log('ActiveXRdpSession: Simulando conexión a', rdpConfig.server);
            console.log('ActiveXRdpSession: Usuario:', credentials.username);
            
            // Simular delay de conexión
            setTimeout(() => {
                setConnectionStatus('connected');
                setIsConnecting(false);
                toast.current?.show({
                    severity: 'success',
                    summary: 'Conexión Exitosa (MOCK)',
                    detail: `Conectado a ${rdpConfig.server}`,
                    life: 3000
                });
            }, 2000);

        } catch (error) {
            console.error('Error connecting RDP:', error);
            setError(error.message);
            setConnectionStatus('error');
            setIsConnecting(false);
            toast.current?.show({
                severity: 'error',
                summary: 'Error de Conexión',
                detail: error.message,
                life: 5000
            });
        }
    };

    const disconnectRdp = async () => {
        if (!rdpInstanceId) return;

        try {
            // Simular desconexión para testing
            console.log('ActiveXRdpSession: Simulando desconexión');
            setConnectionStatus('disconnected');
            setError(null);
            toast.current?.show({
                severity: 'info',
                summary: 'Desconectado (MOCK)',
                detail: 'Sesión RDP terminada',
                life: 3000
            });
        } catch (error) {
            console.error('Error disconnecting RDP:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al desconectar',
                life: 3000
            });
        }
    };

    const handleCredentialsSubmit = () => {
        setShowCredentialsDialog(false);
        connectRdp();
    };

    const getStatusTag = () => {
        switch (connectionStatus) {
            case 'connected':
                return <Tag value="Conectado" severity="success" />;
            case 'connecting':
                return <Tag value="Conectando..." severity="warning" />;
            case 'error':
                return <Tag value="Error" severity="danger" />;
            default:
                return <Tag value="Desconectado" severity="secondary" />;
        }
    };

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected': return 'text-green-500';
            case 'connecting': return 'text-orange-500';
            case 'error': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="h-full w-full flex flex-column" style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          backgroundColor: 'var(--ui-content-bg, #222)',
          zIndex: 1
        }}>
            <Toast ref={toast} />
            
            {/* Header con información de conexión */}
            <div className="flex align-items-center justify-content-between p-3 border-bottom-1 surface-border" style={{
              backgroundColor: 'var(--ui-content-bg, #222)',
              filter: 'brightness(1.2)',
              borderBottom: '1px solid var(--surface-border, #444)'
            }}>
                <div className="flex align-items-center gap-3">
                    <i className="pi pi-desktop text-xl text-primary" />
                    <div>
                        <h3 className="m-0 text-lg font-semibold" style={{ color: 'var(--text-color, #fff)' }}>{rdpConfig.name || rdpConfig.server}</h3>
                        <p className="text-sm m-0" style={{ color: 'var(--text-color-secondary, #ccc)' }}>{rdpConfig.server}:{rdpConfig.port || 3389}</p>
                    </div>
                </div>
                <div className="flex align-items-center gap-2">
                    {getStatusTag()}
                    <Button
                        icon="pi pi-times"
                        className="p-button-text p-button-rounded"
                        onClick={onClose}
                        tooltip="Cerrar pestaña"
                    />
                </div>
            </div>

            {/* Contenedor principal */}
            <div className="flex-1 flex flex-column">
                {/* Barra de herramientas */}
                <div className="flex align-items-center justify-content-between p-3 border-bottom-1 surface-border" style={{
                  backgroundColor: 'var(--ui-content-bg, #222)',
                  filter: 'brightness(1.1)',
                  borderBottom: '1px solid var(--surface-border, #444)'
                }}>
                    <div className="flex align-items-center gap-2">
                        <Button
                            label="Conectar"
                            icon="pi pi-play"
                            onClick={connectRdp}
                            disabled={connectionStatus === 'connected' || isConnecting}
                            className="p-button-sm"
                        />
                        <Button
                            label="Desconectar"
                            icon="pi pi-stop"
                            onClick={disconnectRdp}
                            disabled={connectionStatus !== 'connected'}
                            className="p-button-sm p-button-outlined"
                        />
                        <Button
                            label="Credenciales"
                            icon="pi pi-key"
                            onClick={() => setShowCredentialsDialog(true)}
                            className="p-button-sm p-button-text"
                        />
                    </div>
                    
                    <div className="flex align-items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-color, #fff)' }}>Resolución:</span>
                        <InputText
                            value={displaySettings.width}
                            onChange={(e) => setDisplaySettings(prev => ({ ...prev, width: parseInt(e.target.value) || 1024 }))}
                            className="w-4rem text-center"
                            disabled={connectionStatus === 'connected'}
                        />
                        <span className="text-sm" style={{ color: 'var(--text-color, #fff)' }}>x</span>
                        <InputText
                            value={displaySettings.height}
                            onChange={(e) => setDisplaySettings(prev => ({ ...prev, height: parseInt(e.target.value) || 768 }))}
                            className="w-4rem text-center"
                            disabled={connectionStatus === 'connected'}
                        />
                    </div>
                </div>

                {/* Área de visualización RDP */}
                <div 
                    ref={rdpContainerRef}
                    className="flex-1 bg-black border-round-bottom"
                    style={{ minHeight: '500px' }}
                >
                    {connectionStatus === 'connecting' && (
                        <div className="flex align-items-center justify-content-center h-full">
                            <div className="text-center">
                                <ProgressSpinner />
                                <p className="text-white mt-2">Conectando a {rdpConfig.server}...</p>
                            </div>
                        </div>
                    )}
                    
                    {connectionStatus === 'disconnected' && (
                        <div className="flex align-items-center justify-content-center h-full">
                            <div className="text-center text-white">
                                <i className="pi pi-desktop text-6xl mb-3 text-primary" />
                                <h3 className="text-xl font-semibold mb-2">RDP Session</h3>
                                <p className="text-sm opacity-80">Haz clic en "Conectar" para iniciar la sesión</p>
                                <Button
                                    label="Conectar Ahora"
                                    icon="pi pi-play"
                                    onClick={connectRdp}
                                    className="mt-3"
                                    disabled={isConnecting}
                                />
                            </div>
                        </div>
                    )}
                    
                    {connectionStatus === 'connected' && (
                        <div className="flex align-items-center justify-content-center h-full">
                            <div className="text-center text-white">
                                <i className="pi pi-check-circle text-6xl mb-3 text-green-400" />
                                <h3 className="text-xl font-semibold mb-2">RDP Session Connected</h3>
                                <p className="text-sm opacity-80 mb-3">Conectado a {rdpConfig.server}</p>
                                <div className="bg-gray-800 p-3 border-round">
                                    <p className="text-xs opacity-70">Usuario: {credentials.username}</p>
                                    <p className="text-xs opacity-70">Resolución: {displaySettings.width}x{displaySettings.height}</p>
                                    <p className="text-xs opacity-70">Estado: Activo (MOCK)</p>
                                </div>
                                <Button
                                    label="Desconectar"
                                    icon="pi pi-stop"
                                    onClick={disconnectRdp}
                                    className="mt-3 p-button-outlined"
                                />
                            </div>
                        </div>
                    )}
                    
                    {connectionStatus === 'error' && (
                        <div className="flex align-items-center justify-content-center h-full">
                            <div className="text-center text-red-300">
                                <i className="pi pi-exclamation-triangle text-6xl mb-3" />
                                <h3>Error de Conexión</h3>
                                <p className="mb-3">{error}</p>
                                <Button
                                    label="Reintentar"
                                    icon="pi pi-refresh"
                                    onClick={connectRdp}
                                    className="mt-3"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dialog de credenciales */}
            <Dialog
                visible={showCredentialsDialog}
                onHide={() => setShowCredentialsDialog(false)}
                header="Credenciales RDP"
                modal
                className="w-25rem"
            >
                <div className="flex flex-column gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-2">Usuario</label>
                        <InputText
                            value={credentials.username}
                            onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="Nombre de usuario"
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Contraseña</label>
                        <Password
                            value={credentials.password}
                            onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Contraseña"
                            className="w-full"
                            feedback={false}
                        />
                    </div>
                </div>
                
                <div className="flex justify-content-end gap-2 mt-4">
                    <Button
                        label="Cancelar"
                        onClick={() => setShowCredentialsDialog(false)}
                        className="p-button-text"
                    />
                    <Button
                        label="Conectar"
                        onClick={handleCredentialsSubmit}
                        disabled={!credentials.username || !credentials.password}
                    />
                </div>
            </Dialog>
        </div>
    );
};

export default ActiveXRdpSession; 