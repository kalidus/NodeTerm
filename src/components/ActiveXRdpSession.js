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
    const [isInitialized, setIsInitialized] = useState(false);
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
    
    // Configurar listeners de eventos cuando rdpInstanceId cambia
    useEffect(() => {
        if (rdpInstanceId) {
            console.log('ActiveXRdpSession: Configurando listeners para instancia:', rdpInstanceId);
            
                                window.electron.ipcRenderer.on(`rdp:event:${rdpInstanceId}:connected`, () => {
                        console.log('ActiveXRdpSession: Evento connected recibido');
                        setConnectionStatus('connected');
                        setIsConnecting(false);
                        
                        // Embeber el control ActiveX directamente en la pestaña
                        setTimeout(() => {
                            console.log('ActiveXRdpSession: Embebiendo ActiveX directamente en la pestaña...');
                            // Obtener las dimensiones del contenedor
                            const container = rdpContainerRef.current;
                            if (container) {
                                const rect = container.getBoundingClientRect();
                                console.log('ActiveXRdpSession: Dimensiones del contenedor:', rect);
                                
                                // Limpiar el contenedor y crear el contenido del control ActiveX
                                container.innerHTML = '';
                                
                                // Crear un contenedor para el control ActiveX
                                const activeXContainer = document.createElement('div');
                                activeXContainer.id = 'activex-rdp-display';
                                activeXContainer.style.width = '100%';
                                activeXContainer.style.height = '100%';
                                activeXContainer.style.backgroundColor = '#000';
                                activeXContainer.style.display = 'flex';
                                activeXContainer.style.flexDirection = 'column';
                                activeXContainer.style.alignItems = 'center';
                                activeXContainer.style.justifyContent = 'center';
                                activeXContainer.style.color = 'white';
                                activeXContainer.style.fontFamily = 'monospace';
                                
                                // Agregar contenido del control RDP
                                activeXContainer.innerHTML = `
                                    <div style="text-align: center;">
                                        <h3 style="margin: 0 0 20px 0; color: #4CAF50;">✅ RDP Client Integrado</h3>
                                        <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; border: 1px solid #333;">
                                            <p style="margin: 5px 0;"><strong>Servidor:</strong> ${rdpConfig.server}</p>
                                            <p style="margin: 5px 0;"><strong>Usuario:</strong> ${credentials.username}</p>
                                            <p style="margin: 5px 0;"><strong>Estado:</strong> <span style="color: #4CAF50;">Conectado</span></p>
                                            <p style="margin: 5px 0;"><strong>Resolución:</strong> ${displaySettings.width}x${displaySettings.height}</p>
                                            <p style="margin: 5px 0;"><strong>Cliente:</strong> mstsc.exe</p>
                                        </div>
                                        <div style="margin-top: 20px;">
                                            <button onclick="
                                                window.electronAPI.rdp.connectActiveX(${rdpInstanceId}, '${rdpConfig.server}', '${credentials.username}', '${credentials.password || ''}');
                                            " 
                                                    style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                                                🔗 Conectar RDP
                                            </button>
                                        </div>
                                        <p style="font-size: 12px; opacity: 0.7; margin-top: 20px;">
                                            Usando mstsc.exe para conexión RDP nativa
                                        </p>
                                    </div>
                                `;
                                
                                container.appendChild(activeXContainer);
                                console.log('ActiveXRdpSession: Control ActiveX embebido en la pestaña');
                            }
                        }, 100);
                        
                        toast.current?.show({
                            severity: 'success',
                            summary: 'Conexión Exitosa',
                            detail: `Conectado a ${rdpConfig.server}`,
                            life: 3000
                        });
                    });
            
            window.electron.ipcRenderer.on(`rdp:event:${rdpInstanceId}:disconnected`, () => {
                console.log('ActiveXRdpSession: Evento disconnected recibido');
                setConnectionStatus('disconnected');
                setIsConnecting(false);
                toast.current?.show({
                    severity: 'info',
                    summary: 'Desconectado',
                    detail: 'Sesión RDP terminada',
                    life: 3000
                });
            });
            
            window.electron.ipcRenderer.on(`rdp:event:${rdpInstanceId}:error`, (error) => {
                console.log('ActiveXRdpSession: Evento error recibido:', error);
                setConnectionStatus('error');
                setIsConnecting(false);
                setError(error);
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error de Conexión',
                    detail: error,
                    life: 5000
                });
            });
            
            // Cleanup para esta instancia
            return () => {
                console.log('ActiveXRdpSession: Removiendo listeners para instancia:', rdpInstanceId);
                window.electron.ipcRenderer.removeAllListeners(`rdp:event:${rdpInstanceId}:connected`);
                window.electron.ipcRenderer.removeAllListeners(`rdp:event:${rdpInstanceId}:disconnected`);
                window.electron.ipcRenderer.removeAllListeners(`rdp:event:${rdpInstanceId}:error`);
            };
        }
    }, [rdpInstanceId]);

    // Redimensionar el control cuando cambie el tamaño de la ventana
    useEffect(() => {
        const handleResize = () => {
            if (rdpInstanceId && connectionStatus === 'connected') {
                console.log('ActiveXRdpSession: Redimensionando por cambio de ventana...');
                window.electronAPI.rdp.resizeActiveX(rdpInstanceId, 0, 0, displaySettings.width, displaySettings.height);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [rdpInstanceId, connectionStatus, displaySettings.width, displaySettings.height]);

    // Conectar automáticamente cuando el control esté listo
    useEffect(() => {
        console.log('ActiveXRdpSession: useEffect - rdpInstanceId:', rdpInstanceId, 'isInitialized:', isInitialized, 'connectionStatus:', connectionStatus, 'isConnecting:', isConnecting);
        if (rdpInstanceId && isInitialized && connectionStatus === 'disconnected' && !isConnecting) {
            // Intentar conectar automáticamente si tenemos credenciales
            if (rdpConfig.username && rdpConfig.password) {
                setCredentials({
                    username: rdpConfig.username,
                    password: rdpConfig.password
                });
                // Pequeño delay para asegurar que todo esté listo
                setTimeout(() => {
                    console.log('ActiveXRdpSession: Iniciando conexión automática...');
                    connectRdp();
                }, 500);
            }
        }
    }, [rdpInstanceId, isInitialized, connectionStatus]);

    const initializeRdpControl = async () => {
        try {
            console.log('ActiveXRdpSession: Inicializando control RDP...');
            
            // Obtener el handle de la ventana padre desde Electron
            const parentWindowHandle = await window.electronAPI.rdp.getParentWindowHandle();
            console.log('ActiveXRdpSession: Parent window handle:', parentWindowHandle);
            
            // Crear instancia del control RDP ActiveX
            const instanceId = await window.electronAPI.rdp.createActiveXInstance(parentWindowHandle);
            console.log('ActiveXRdpSession: Instancia creada con ID:', instanceId);
            setRdpInstanceId(instanceId);
            console.log('ActiveXRdpSession: rdpInstanceId establecido:', instanceId);

                        // Configurar eventos (simplificado para evitar problemas de serialización)
            console.log('ActiveXRdpSession: Configurando eventos...');
            try {
                console.log('ActiveXRdpSession: Iniciando setActiveXEventHandlers...');
                await window.electronAPI.rdp.setActiveXEventHandlers(instanceId, {
                    // Solo pasar strings para evitar problemas de serialización
                    onConnected: 'connected',
                    onDisconnected: 'disconnected',
                    onError: 'error'
                });
                console.log('ActiveXRdpSession: Eventos configurados correctamente');
            } catch (eventError) {
                console.error('ActiveXRdpSession: Error configurando eventos:', eventError);
                console.error('ActiveXRdpSession: Error stack:', eventError.stack);
                // No lanzar error, continuar sin eventos
                console.log('ActiveXRdpSession: Continuando sin eventos...');
            }

            // Configurar servidor
            console.log('ActiveXRdpSession: Configurando servidor:', rdpConfig.server);
            await window.electronAPI.rdp.setActiveXServer(instanceId, rdpConfig.server);
            console.log('ActiveXRdpSession: Servidor configurado:', rdpConfig.server);
            
            // Configurar resolución
            console.log('ActiveXRdpSession: Configurando resolución...');
            await window.electronAPI.rdp.setActiveXDisplaySettings(
                instanceId, 
                displaySettings.width, 
                displaySettings.height
            );
            console.log('ActiveXRdpSession: Resolución configurada:', displaySettings.width, 'x', displaySettings.height);

            console.log('ActiveXRdpSession: Control RDP inicializado correctamente');
            setIsInitialized(true);

        } catch (error) {
            console.error('ActiveXRdpSession: Error initializing RDP control:', error);
            console.error('ActiveXRdpSession: Error stack:', error.stack);
            console.error('ActiveXRdpSession: Error message:', error.message);
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

            console.log('ActiveXRdpSession: Conectando a', rdpConfig.server);
            console.log('ActiveXRdpSession: Usuario:', credentials.username);
            console.log('ActiveXRdpSession: Configurando credenciales...');

            // Configurar credenciales
            await window.electronAPI.rdp.setActiveXCredentials(
                rdpInstanceId,
                credentials.username,
                credentials.password
            );
            console.log('ActiveXRdpSession: Credenciales configuradas correctamente');

            console.log('ActiveXRdpSession: Iniciando conexión...');
            // Conectar
            await window.electronAPI.rdp.connectActiveX(rdpInstanceId);
            console.log('ActiveXRdpSession: Comando de conexión enviado');

        } catch (error) {
            console.error('ActiveXRdpSession: Error connecting RDP:', error);
            console.error('ActiveXRdpSession: Error stack:', error.stack);
            console.error('ActiveXRdpSession: Error message:', error.message);
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
            console.log('ActiveXRdpSession: Desconectando RDP');
            await window.electronAPI.rdp.disconnectActiveX(rdpInstanceId);
            setConnectionStatus('disconnected');
            setError(null);
            toast.current?.show({
                severity: 'info',
                summary: 'Desconectado',
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
                        <div className="h-full w-full bg-black relative" ref={rdpContainerRef}>
                            {/* El control RDP ActiveX debería estar aquí */}
                            <div className="absolute inset-0 flex flex-column">
                                <div className="text-center text-white p-2 bg-black bg-opacity-50">
                                    <p className="text-xs opacity-80">Control RDP ActiveX - Conectado a {rdpConfig.server}</p>
                                    <p className="text-xs opacity-70">Usuario: {credentials.username} | Resolución: {displaySettings.width}x{displaySettings.height}</p>
                                </div>
                                <div className="flex-1 bg-black">
                                    {/* Aquí debería estar el control ActiveX */}
                                    <div className="h-full w-full flex align-items-center justify-content-center">
                                        <div className="text-center text-white">
                                            <i className="pi pi-desktop text-4xl mb-2 text-primary" />
                                            <p className="text-sm">Control RDP ActiveX</p>
                                            <p className="text-xs opacity-70">La ventana del control debería aparecer aquí</p>
                                        </div>
                                    </div>
                                </div>
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