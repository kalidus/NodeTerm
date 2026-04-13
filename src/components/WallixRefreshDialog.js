import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { ProgressSpinner } from 'primereact/progressspinner';
import ImportService from '../services/ImportService';

const WallixRefreshDialog = ({ visible, onHide, node, onRefreshComplete, toast }) => {
    const [wallixUsername, setWallixUsername] = useState('');
    const [wallixUrl, setWallixUrl] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && node && node.data) {
            setWallixUrl(node.data.wallixUrl || '');
            setWallixUsername(node.data.wallixUsername || '');
            setPassword('');
        }
    }, [visible, node]);

    const handleRefresh = async () => {
        if (!wallixUrl || !wallixUsername || !password) {
            toast?.current?.show({ severity: 'error', summary: 'Error', detail: 'Todos los campos son obligatorios', life: 3000 });
            return;
        }

        setLoading(true);
        try {
            const result = await ImportService.importFromWallix(wallixUrl, wallixUsername, password);
            if (result && result.success) {
                // Return result to parent so it performs the intelligent merge
                onRefreshComplete(result, node.key);
                onHide();
            } else {
                throw new Error("No se obtuvieron resultados de la API");
            }
        } catch (error) {
            console.error('Error refrescando Wallix:', error);
            toast?.current?.show({ severity: 'error', summary: 'Error de importación', detail: error.message, life: 5000 });
        } finally {
            setLoading(false);
        }
    };

    const renderFooter = () => (
        <div>
            <Button label="Cancelar" icon="pi pi-times" onClick={onHide} className="p-button-text" disabled={loading} />
            <Button label="Refrescar" icon="pi pi-refresh" onClick={handleRefresh} autoFocus disabled={loading} />
        </div>
    );

    return (
        <Dialog 
            header="Refrescar Conexiones de Wallix" 
            visible={visible} 
            style={{ width: '400px' }} 
            footer={renderFooter()} 
            onHide={onHide}
            closable={!loading}
        >
            <div className="flex flex-column gap-3 p-fluid">
                {loading ? (
                    <div className="flex flex-column align-items-center justify-content-center p-4">
                        <ProgressSpinner style={{width: '50px', height: '50px'}} />
                        <p className="mt-3 text-center">Consultando API de Wallix...</p>
                    </div>
                ) : (
                    <>
                        <div className="field">
                            <label htmlFor="wallixUrl">URL Servidor Wallix</label>
                            <InputText id="wallixUrl" value={wallixUrl} onChange={(e) => setWallixUrl(e.target.value)} placeholder="https://..." />
                        </div>
                        <div className="field">
                            <label htmlFor="wallixUser">Usuario Administrador / API</label>
                            <InputText id="wallixUser" value={wallixUsername} onChange={(e) => setWallixUsername(e.target.value)} />
                        </div>
                        <div className="field">
                            <label htmlFor="wallixPass">Contraseña</label>
                            <Password id="wallixPass" value={password} onChange={(e) => setPassword(e.target.value)} feedback={false} toggleMask />
                            <small className="block mt-1 text-color-secondary">La contraseña no se almacena por seguridad.</small>
                        </div>
                    </>
                )}
            </div>
        </Dialog>
    );
};

export default WallixRefreshDialog;
