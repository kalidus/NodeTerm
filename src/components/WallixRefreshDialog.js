import React, { useState, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { ProgressSpinner } from 'primereact/progressspinner';
import ImportService from '../services/ImportService';
import AppDialog from './ui/AppDialog';
import { useTranslation } from '../i18n/hooks/useTranslation';

const WallixRefreshDialog = ({ visible, onHide, node, onRefreshComplete, toast }) => {
  const { t } = useTranslation();
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
      toast?.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: t('dialogs.wallix.requiredFields', 'Todos los campos son obligatorios'),
        life: 3000
      });
      return;
    }

    setLoading(true);
    try {
      const result = await ImportService.importFromWallix(wallixUrl, wallixUsername, password);
      if (result && result.success) {
        onRefreshComplete(result, node.key);
        onHide();
      } else {
        throw new Error(t('dialogs.wallix.emptyResult', 'No se obtuvieron resultados de la API'));
      }
    } catch (error) {
      console.error('Error refrescando Wallix:', error);
      toast?.current?.show({
        severity: 'error',
        summary: t('dialogs.wallix.importError', 'Error de importación'),
        detail: error.message,
        life: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppDialog
      headerIcon="pi pi-refresh"
      headerTitle={t('dialogs.wallix.title', 'Refrescar Conexiones de Wallix')}
      visible={visible}
      size="sm"
      onHide={onHide}
      closable={!loading}
      cancelLabel={t('common.cancel', 'Cancelar')}
      confirmLabel={t('dialogs.wallix.confirm', 'Refrescar')}
      confirmIcon="pi pi-refresh"
      onConfirm={handleRefresh}
      loading={loading}
      confirmDisabled={loading}
    >
      <div className="p-fluid">
        {loading ? (
          <div className="flex flex-column align-items-center justify-content-center p-4">
            <ProgressSpinner style={{ width: '50px', height: '50px' }} />
            <p className="mt-3 text-center">{t('dialogs.wallix.loading', 'Consultando API de Wallix...')}</p>
          </div>
        ) : (
          <>
            <div className="app-form-field">
              <label htmlFor="wallixUrl" className="app-form-label">{t('dialogs.wallix.url', 'URL Servidor Wallix')}</label>
              <InputText id="wallixUrl" value={wallixUrl} onChange={(e) => setWallixUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="app-form-field">
              <label htmlFor="wallixUser" className="app-form-label">{t('dialogs.wallix.adminUser', 'Usuario Administrador / API')}</label>
              <InputText id="wallixUser" value={wallixUsername} onChange={(e) => setWallixUsername(e.target.value)} />
            </div>
            <div className="app-form-field">
              <label htmlFor="wallixPass" className="app-form-label">{t('dialogs.wallix.password', 'Contraseña')}</label>
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
