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

    const initializeRdpControl = async () => {
        try {
            // Obtener el handle de la ventana padre desde Electron
            const parentWindowHandle = await window.electronAPI.rdp.getParentWindowHandle();
            
            // Crear instancia del control RDP ActiveX
            const instanceId = await window.electronAPI.rdp.createActiveXInstance(parentWindowHandle);
            setRdpInstanceId(instanceId);

            // Configurar eventos
            await window.electronAPI.rdp.setActiveXEventHandlers(instanceId, {
                onConnected: () => {
                    setConnectionStatus('connected');
                    setIsConnecting(false);
                    toast.current.show({
                        severity: 'success',
                        summary: 'Conexión Exitosa',
                        detail: `Conectado a ${rdpConfig.server}`,
                        life: 3000
                    });
                },
                onDisconnected: () => {
                    setConnectionStatus('disconnected');
                    setIsConnecting(false);
                    toast.current.show({
                        severity: 'info',
                        summary: 'Desconectado',
                        detail: 'Sesión RDP terminada',
                        life: 3000
                    });
                },
                onError: (error) => {
                    setConnectionStatus('error');
                    setIsConnecting(false);
                    setError(error);
                    toast.current.show({
                        severity: 'error',
                        summary: 'Error de Conexión',
                        detail: error,
                        life: 5000
                    });
                }
            });

            // Configurar servidor
            await window.electronAPI.rdp.setActiveXServer(instanceId, rdpConfig.server);
            
            // Configurar resolución
            await window.electronAPI.rdp.setActiveXDisplaySettings(
                instanceId, 
                displaySettings.width, 
                displaySettings.height
            );

        } catch (error) {
            console.error('Error initializing RDP control:', error);
            setError(error.message);
            toast.current.show({
                severity: 'error',
                summary: 'Error de Inicialización',
                detail: error.message,
                life: 5000
            });
        }
    };

    const connectRdp = async () => {
        if (!rdpInstanceId) {
            toast.current.show({
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

            // Configurar credenciales
            await window.electronAPI.rdp.setActiveXCredentials(
                rdpInstanceId,
                credentials.username,
                credentials.password
            );

            // Conectar
            await window.electronAPI.rdp.connectActiveX(rdpInstanceId);

        } catch (error) {
            console.error('Error connecting RDP:', error);
            setError(error.message);
            setConnectionStatus('error');
            setIsConnecting(false);
            toast.current.show({
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
            await window.electronAPI.rdp.disconnectActiveX(rdpInstanceId);
            setConnectionStatus('disconnected');
            setError(null);
        } catch (error) {
            console.error('Error disconnecting RDP:', error);
            toast.current.show({
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
        <div className="h-full flex flex-column">
            <Toast ref={toast} />
            
            {/* Header con información de conexión */}
            <Card className="mb-2">
                <div className="flex align-items-center justify-content-between">
                    <div className="flex align-items-center gap-3">
                        <i className="pi pi-desktop text-xl" />
                        <div>
                            <h3 className="m-0">{rdpConfig.name || rdpConfig.server}</h3>
                            <p className="text-sm text-gray-600 m-0">{rdpConfig.server}</p>
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
            </Card>

            {/* Contenedor principal */}
            <div className="flex-1 flex flex-column">
                {/* Barra de herramientas */}
                <div className="flex align-items-center justify-content-between p-3 bg-gray-50 border-round">
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
                        <span className="text-sm">Resolución:</span>
                        <InputText
                            value={displaySettings.width}
                            onChange={(e) => setDisplaySettings(prev => ({ ...prev, width: parseInt(e.target.value) || 1024 }))}
                            className="w-4rem text-center"
                            disabled={connectionStatus === 'connected'}
                        />
                        <span>x</span>
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
                    className="flex-1 bg-black border-round"
                    style={{ minHeight: '400px' }}
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
                                <i className="pi pi-desktop text-6xl mb-3" />
                                <h3>RDP Session</h3>
                                <p>Haz clic en "Conectar" para iniciar la sesión</p>
                            </div>
                        </div>
                    )}
                    
                    {connectionStatus === 'error' && (
                        <div className="flex align-items-center justify-content-center h-full">
                            <div className="text-center text-red-300">
                                <i className="pi pi-exclamation-triangle text-6xl mb-3" />
                                <h3>Error de Conexión</h3>
                                <p>{error}</p>
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