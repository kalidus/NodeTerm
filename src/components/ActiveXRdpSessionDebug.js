import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tag } from 'primereact/tag';

const ActiveXRdpSessionDebug = ({ rdpConfig, tabId, onClose }) => {
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [credentials, setCredentials] = useState({
        username: rdpConfig.username || '',
        password: rdpConfig.password || ''
    });
    const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
    const [error, setError] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [debugLog, setDebugLog] = useState([]);
    
    const toast = useRef(null);

    const addDebugLog = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        setDebugLog(prev => [...prev, `[${timestamp}] ${message}`]);
        console.log(`[ActiveX Debug] ${message}`);
    };

    useEffect(() => {
        addDebugLog('Componente ActiveX inicializado');
        addDebugLog(`Configuración RDP: ${rdpConfig.server}:${rdpConfig.port || 3389}`);
        
        // Verificar APIs disponibles
        if (window.electronAPI) {
            addDebugLog('✓ window.electronAPI disponible');
            if (window.electronAPI.rdp) {
                addDebugLog('✓ window.electronAPI.rdp disponible');
            } else {
                addDebugLog('✗ window.electronAPI.rdp NO disponible');
            }
        } else {
            addDebugLog('✗ window.electronAPI NO disponible');
        }
        
        testNativeModule();
    }, []);

    const testNativeModule = async () => {
        try {
            addDebugLog('Probando módulo nativo...');
            
            // Test 1: Verificar handle de ventana
            const handle = await window.electronAPI.rdp.getParentWindowHandle();
            addDebugLog(`Handle de ventana: ${handle}`);
            
            // Test 2: Intentar crear instancia
            if (handle) {
                const instanceId = await window.electronAPI.rdp.createActiveXInstance(handle);
                addDebugLog(`Instancia creada: ${instanceId}`);
                
                if (instanceId) {
                    // Test 3: Configurar servidor
                    await window.electronAPI.rdp.setActiveXServer(instanceId, rdpConfig.server);
                    addDebugLog(`Servidor configurado: ${rdpConfig.server}`);
                    
                    // Test 4: Limpiar instancia
                    await window.electronAPI.rdp.disconnectActiveX(instanceId);
                    addDebugLog('Instancia limpia exitosamente');
                } else {
                    addDebugLog('✗ No se pudo crear instancia');
                }
            } else {
                addDebugLog('✗ No se pudo obtener handle de ventana');
            }
        } catch (error) {
            addDebugLog(`✗ Error en prueba: ${error.message}`);
            setError(error.message);
        }
    };

    const testBasicConnection = async () => {
        if (!credentials.username || !credentials.password) {
            setShowCredentialsDialog(true);
            return;
        }

        try {
            setIsConnecting(true);
            setConnectionStatus('connecting');
            addDebugLog('Iniciando prueba de conexión básica...');

            // Usar la conexión RDP normal como fallback
            const result = await window.electronAPI.rdp.connect({
                server: rdpConfig.server,
                username: credentials.username,
                password: credentials.password,
                port: rdpConfig.port || 3389,
                client: 'mstsc'
            });
            
            addDebugLog(`Resultado de conexión: ${JSON.stringify(result)}`);
            
            if (result.success) {
                setConnectionStatus('connected');
                addDebugLog('✓ Conexión exitosa con mstsc');
                toast.current.show({
                    severity: 'success',
                    summary: 'Conexión Exitosa',
                    detail: 'Conexión RDP establecida',
                    life: 3000
                });
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (error) {
            addDebugLog(`✗ Error de conexión: ${error.message}`);
            setError(error.message);
            setConnectionStatus('error');
            toast.current.show({
                severity: 'error',
                summary: 'Error de Conexión',
                detail: error.message,
                life: 5000
            });
        } finally {
            setIsConnecting(false);
        }
    };

    const handleCredentialsSubmit = () => {
        if (!credentials.username || !credentials.password) {
            toast.current.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Usuario y contraseña son requeridos',
                life: 3000
            });
            return;
        }
        
        setShowCredentialsDialog(false);
        testBasicConnection();
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

    return (
        <div className="h-full flex flex-column">
            <Toast ref={toast} />
            
            {/* Header con información de conexión */}
            <Card className="mb-2">
                <div className="flex align-items-center justify-content-between">
                    <div className="flex align-items-center gap-3">
                        <i className="pi pi-desktop text-xl" />
                        <div>
                            <h3 className="m-0">{rdpConfig.name || rdpConfig.server} (DEBUG)</h3>
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
                            label="Probar Módulo"
                            icon="pi pi-cog"
                            onClick={testNativeModule}
                            className="p-button-sm"
                        />
                        <Button
                            label="Conectar (mstsc)"
                            icon="pi pi-play"
                            onClick={testBasicConnection}
                            disabled={isConnecting}
                            className="p-button-sm"
                        />
                        <Button
                            label="Credenciales"
                            icon="pi pi-key"
                            onClick={() => setShowCredentialsDialog(true)}
                            className="p-button-sm p-button-text"
                        />
                    </div>
                </div>

                {/* Área de debug */}
                <div className="flex-1 p-3">
                    <h4>Debug Log:</h4>
                    <div 
                        className="border-1 border-300 border-round p-2 h-20rem overflow-auto"
                        style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace', fontSize: '12px' }}
                    >
                        {debugLog.map((log, index) => (
                            <div key={index} className="mb-1">{log}</div>
                        ))}
                    </div>
                    
                    {error && (
                        <div className="mt-3 p-3 bg-red-100 text-red-800 border-round">
                            <strong>Error:</strong> {error}
                        </div>
                    )}
                    
                    {isConnecting && (
                        <div className="mt-3 flex align-items-center gap-2">
                            <ProgressSpinner style={{ width: '20px', height: '20px' }} />
                            <span>Probando conexión...</span>
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

export default ActiveXRdpSessionDebug;
