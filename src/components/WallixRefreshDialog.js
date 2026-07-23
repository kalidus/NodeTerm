import React, { useState, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { ProgressSpinner } from 'primereact/progressspinner';
import ImportService from '../services/ImportService';
import AppDialog from './ui/AppDialog';

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
        onRefreshComplete(result, node.key);
        onHide();
      } else {
        throw new Error('No se obtuvieron resultados de la API');
      }
    } catch (error) {
      console.error('Error refrescando Wallix:', error);
      toast?.current?.show({ severity: 'error', summary: 'Error de importacion', detail: error.message, life: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppDialog
      headerIcon="pi pi-refresh"
      headerTitle="Refrescar Conexiones de Wallix"
      visible={visible}
      size="sm"
      onHide={onHide}
      closable={!loading}
      cancelLabel="Cancelar"
      confirmLabel="Refrescar"
      confirmIcon="pi pi-refresh"
      onConfirm={handleRefresh}
      loading={loading}
      confirmDisabled={loading}
    >
      <div className="p-fluid">
        {loading ? (
          <div className="flex flex-column align-items-center justify-content-center p-4">
            <ProgressSpinner style={{ width: '50px', height: '50px' }} />
            <p className="mt-3 text-center">Consultando API de Wallix...</p>
          </div>
        ) : (
          <>
            <div className="app-form-field">
              <label htmlFor="wallixUrl" className="app-form-label">URL Servidor Wallix</label>
              <InputText id="wallixUrl" value={wallixUrl} onChange={(e) => setWallixUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="app-form-field">
              <label htmlFor="wallixUser" className="app-form-label">Usuario Administrador / API</label>
              <InputText id="wallixUser" value={wallixUsername} onChange={(e) => setWallixUsername(e.target.value)} />
            </div>
            <div className="app-form-field">
              <label htmlFor="wallixPass" className="app-form-label">Contrasena</label>
              <Password
                id="wallixPass"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                feedback={false}
                toggleMask
              />
            </div>
          </>
        )}
      </div>
    </AppDialog>
  );
};

export default WallixRefreshDialog;
