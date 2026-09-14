import React, { useState, useEffect } from 'react';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { Checkbox } from 'primereact/checkbox';
import { useTranslation } from '../../../../i18n/hooks/useTranslation';
import SecureStorage from '../../../../services/SecureStorage';
import { appConfirm } from '../../../ui/AppConfirm';

const MasterKeySubTab = ({
  onMasterPasswordConfigured,
  onMasterPasswordChanged,
  showToast
}) => {
  const { t } = useTranslation('settings');
  const [secureStorage] = useState(() => new SecureStorage());

  const [hasMasterKey, setHasMasterKey] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(() => {
    return localStorage.getItem('nodeterm_remember_password') === 'true';
  });

  useEffect(() => {
    let isMounted = true;
    const checkMasterKey = async () => {
      try {
        const hasKey = await secureStorage.checkHasSavedMasterKey();
        if (isMounted) setHasMasterKey(hasKey);
        const rem = await secureStorage.isRememberPasswordEnabled();
        if (isMounted) setRememberPassword(rem);
      } catch (err) {
        console.warn('Error checking master key:', err);
      }
    };
    checkMasterKey();
    return () => { isMounted = false; };
  }, [secureStorage]);

  const validateMasterPassword = () => {
    return masterPassword.length >= 6 && masterPassword === confirmPassword;
  };

  const validatePasswordChange = () => {
    return (
      currentPassword.length >= 6 &&
      newPassword.length >= 6 &&
      newPassword === confirmNewPassword &&
      currentPassword !== newPassword
    );
  };

  const handleSaveMasterPassword = async () => {
    if (!validateMasterPassword()) {
      showToast?.('error', 'Error', 'Las contraseñas deben tener al menos 6 caracteres y coincidir');
      return;
    }

    setIsLoading(true);
    try {
      await secureStorage.saveMasterKey(masterPassword);
      setHasMasterKey(true);

      if (onMasterPasswordConfigured) {
        onMasterPasswordConfigured(masterPassword);
      }

      setMasterPassword('');
      setConfirmPassword('');
      showToast?.('success', 'Éxito', 'Clave maestra configurada correctamente');
    } catch (error) {
      console.error('Error guardando clave maestra:', error);
      showToast?.('error', 'Error', 'Error al guardar la clave maestra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeMasterPassword = async () => {
    if (!validatePasswordChange()) {
      showToast?.('error', 'Error', 'Verifica que las contraseñas sean válidas y diferentes');
      return;
    }

    setIsLoading(true);
    try {
      await secureStorage.changeMasterKey(currentPassword, newPassword);

      if (onMasterPasswordChanged) {
        onMasterPasswordChanged(newPassword);
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast?.('success', 'Éxito', 'Clave maestra actualizada correctamente');
    } catch (error) {
      console.error('Error cambiando clave maestra:', error);
      showToast?.('error', 'Error', error.message || 'Error al cambiar la clave maestra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMasterKey = async () => {
    const ok = await appConfirm({
      message: '¿Estás seguro de que quieres eliminar la clave maestra? Esto eliminará todas las sesiones guardadas de forma segura.',
      header: 'Confirmar',
      severity: 'danger',
      acceptLabel: 'Aceptar',
      rejectLabel: 'Cancelar'
    });
    if (!ok) return;

    try {
      await secureStorage.clearMasterKey();
      setHasMasterKey(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast?.('info', 'Información', 'Clave maestra eliminada');
    } catch (error) {
      console.error('Error eliminando clave maestra:', error);
      showToast?.('error', 'Error', 'Error al eliminar la clave maestra');
    }
  };

  const handleRememberPasswordChange = async (checked) => {
    setRememberPassword(checked);
    try {
      await secureStorage.setRememberPassword(checked);
      if (checked) {
        showToast?.('success', 'Configurado', 'La contraseña se recordará en este dispositivo');
      } else {
        showToast?.('info', 'Configurado', 'Se pedirá la contraseña al iniciar la app');
      }
    } catch (err) {
      console.error('Error actualizando recordar contraseña:', err);
    }
  };

  return (
    <div className="security-settings-container">
      <div className="security-settings-content">
        {/* Header */}
        <div className="security-settings-header-wrapper">
          <div className="security-header-content">
            <span className="security-header-icon protocol-dialog-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="masterKeyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="50%" stopColor="#764ba2" />
                    <stop offset="100%" stopColor="#f093fb" />
                  </linearGradient>
                  <linearGradient id="keyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e8e8f0" />
                  </linearGradient>
                </defs>
                <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                  fill="url(#masterKeyGradient)"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="0.6" />
                <g transform="translate(12, 11)">
                  <circle cx="0" cy="-1" r="2.2"
                    fill="none"
                    stroke="url(#keyGradient)"
                    strokeWidth="1.4"
                    opacity="0.98" />
                  <rect x="-1.8" y="0.5" width="3.6" height="5.5" rx="1.2"
                    fill="url(#keyGradient)"
                    opacity="0.98"
                    stroke="rgba(102, 126, 234, 0.25)"
                    strokeWidth="0.4" />
                  <rect x="-1" y="3.5" width="2" height="2.5" rx="0.5"
                    fill="url(#keyGradient)"
                    opacity="0.98" />
                  <rect x="-0.4" y="5" width="0.8" height="1.2" rx="0.2"
                    fill="rgba(102, 126, 234, 0.5)" />
                </g>
              </svg>
            </span>
            <div className="security-header-text">
              <h3 className="security-header">Gestión de Clave Maestra</h3>
              <p className="security-description">La clave maestra protege tus credenciales de sesión con cifrado AES-256. Se requiere para sincronizar sesiones de forma segura.</p>
            </div>
          </div>
        </div>

        {/* Layout de 2 columnas */}
        <div className="security-layout-grid">
          {/* Columna izquierda: Estado */}
          <div className="security-status-card">
            <div className="security-status-header">
              <span className={`security-status-icon ${hasMasterKey ? 'success' : 'warning'}`}>
                {hasMasterKey ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="statusSuccessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#11998e" />
                        <stop offset="100%" stopColor="#38ef7d" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                      fill="url(#statusSuccessGradient)"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="0.5" />
                    <path d="M9 12l2 2 4-4"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="statusWarningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f093fb" />
                        <stop offset="100%" stopColor="#f5576c" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                      fill="url(#statusWarningGradient)"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="0.5" />
                    <circle cx="12" cy="9" r="1.2" fill="#ffffff" />
                    <rect x="11" y="11.5" width="2" height="4" rx="1" fill="#ffffff" />
                  </svg>
                )}
              </span>
              <span className="security-status-label">Estado:</span>
              <div className="security-status-badge">
                <Badge
                  value={hasMasterKey ? 'Configurada' : 'No configurada'}
                  severity={hasMasterKey ? 'success' : 'warning'}
                />
              </div>
            </div>

            {hasMasterKey && (
              <>
                <div className="security-status-info" style={{ marginTop: '0.75rem', padding: '0 1.25rem' }}>
                  <i className="pi pi-info-circle" style={{ marginRight: '0.5rem', color: 'var(--ui-button-primary)' }}></i>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>
                    Las sesiones se cifran automáticamente antes del almacenamiento
                  </span>
                </div>

                {/* Opción de recordar contraseña */}
                <div className="security-checkbox-container" style={{ marginTop: '0.75rem', marginBottom: '0.75rem', padding: '0 1.25rem' }}>
                  <div className="security-checkbox-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Checkbox
                      inputId="remember-password-settings"
                      checked={rememberPassword}
                      onChange={(e) => handleRememberPasswordChange(!!e.checked)}
                    />
                    <label htmlFor="remember-password-settings" className="security-checkbox-label" style={{ cursor: 'pointer', fontSize: '0.8125rem' }}>
                      {t('security.masterPassword.rememberPassword') || 'Recordar contraseña en este dispositivo'}
                    </label>
                  </div>
                  <small className="security-checkbox-hint" style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-color-secondary)', opacity: 0.7, fontSize: '0.75rem' }}>
                    {t('security.masterPassword.rememberPasswordHint') || 'Si está activado, no se pedirá la contraseña al iniciar la app'}
                  </small>
                </div>
              </>
            )}
          </div>

          {/* Columna derecha: Formularios */}
          {!hasMasterKey ? (
            <div className="security-form-container">
              <h4 className="security-form-title">
                <span className="security-form-title-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="formKeyGradientNew" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="50%" stopColor="#764ba2" />
                        <stop offset="100%" stopColor="#f093fb" />
                      </linearGradient>
                      <linearGradient id="formKeyGradientWhiteNew" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#e8e8f0" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                      fill="url(#formKeyGradientNew)"
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth="0.6" />
                    <g transform="translate(12, 11)">
                      <circle cx="0" cy="-1" r="2.2"
                        fill="none"
                        stroke="url(#formKeyGradientWhiteNew)"
                        strokeWidth="1.4"
                        opacity="0.98" />
                      <rect x="-1.8" y="0.5" width="3.6" height="5.5" rx="1.2"
                        fill="url(#formKeyGradientWhiteNew)"
                        opacity="0.98"
                        stroke="rgba(102, 126, 234, 0.25)"
                        strokeWidth="0.4" />
                      <rect x="-1" y="3.5" width="2" height="2.5" rx="0.5"
                        fill="url(#formKeyGradientWhiteNew)"
                        opacity="0.98" />
                      <rect x="-0.4" y="5" width="0.8" height="1.2" rx="0.2"
                        fill="rgba(102, 126, 234, 0.5)" />
                    </g>
                  </svg>
                </span>
                {t('security.masterPassword.configureTitle') || 'Configurar Clave Maestra'}
              </h4>

              <div className="security-field">
                <label htmlFor="master-password" className="security-field-label">
                  <i className="pi pi-key"></i>
                  {t('security.masterPassword.newPassword') || 'Nueva Clave Maestra'}
                </label>
                <div className="security-field-input">
                  <Password
                    id="master-password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder={t('security.masterPassword.placeholders.minChars') || 'Mínimo 6 caracteres'}
                    feedback={false}
                    toggleMask
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="security-field">
                <label htmlFor="confirm-password" className="security-field-label">
                  <i className="pi pi-shield"></i>
                  {t('security.masterPassword.confirmPassword') || 'Confirmar Clave Maestra'}
                </label>
                <div className="security-field-input">
                  <Password
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('security.masterPassword.placeholders.repeat') || 'Repetir la clave'}
                    feedback={false}
                    toggleMask
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                label={isLoading ? (t('security.masterPassword.buttons.saving') || 'Guardando...') : (t('security.masterPassword.buttons.save') || 'Guardar Clave Maestra')}
                icon={isLoading ? 'pi pi-spin pi-spinner' : 'pi pi-save'}
                onClick={handleSaveMasterPassword}
                disabled={!validateMasterPassword() || isLoading}
                className="security-button security-button-primary"
                style={{ width: '100%' }}
              />
            </div>
          ) : (
            <div className="security-form-container">
              <h4 className="security-form-title">
                <span className="security-form-title-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="formKeyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="50%" stopColor="#764ba2" />
                        <stop offset="100%" stopColor="#f093fb" />
                      </linearGradient>
                      <linearGradient id="formKeyGradientWhite" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#e8e8f0" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                      fill="url(#formKeyGradient)"
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth="0.6" />
                    <g transform="translate(12, 11)">
                      <circle cx="0" cy="-1" r="2.2"
                        fill="none"
                        stroke="url(#formKeyGradientWhite)"
                        strokeWidth="1.4"
                        opacity="0.98" />
                      <rect x="-1.8" y="0.5" width="3.6" height="5.5" rx="1.2"
                        fill="url(#formKeyGradientWhite)"
                        opacity="0.98"
                        stroke="rgba(102, 126, 234, 0.25)"
                        strokeWidth="0.4" />
                      <rect x="-1" y="3.5" width="2" height="2.5" rx="0.5"
                        fill="url(#formKeyGradientWhite)"
                        opacity="0.98" />
                      <rect x="-0.4" y="5" width="0.8" height="1.2" rx="0.2"
                        fill="rgba(102, 126, 234, 0.5)" />
                    </g>
                  </svg>
                </span>
                {t('security.masterPassword.changeTitle') || 'Cambiar Clave Maestra'}
              </h4>

              <div className="security-field">
                <label htmlFor="current-password" className="security-field-label">
                  <i className="pi pi-unlock"></i>
                  {t('security.masterPassword.currentPassword') || 'Clave Actual'}
                </label>
                <div className="security-field-input">
                  <Password
                    id="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('security.masterPassword.placeholders.current') || 'Clave maestra actual'}
                    feedback={false}
                    toggleMask
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="security-field">
                <label htmlFor="new-password" className="security-field-label">
                  <i className="pi pi-key"></i>
                  {t('security.masterPassword.newPassword') || 'Nueva Clave Maestra'}
                </label>
                <div className="security-field-input">
                  <Password
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('security.masterPassword.placeholders.new') || 'Nueva clave (mínimo 6 caracteres)'}
                    feedback={false}
                    toggleMask
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="security-field">
                <label htmlFor="confirm-new-password" className="security-field-label">
                  <i className="pi pi-shield"></i>
                  {t('security.masterPassword.confirmNewPassword') || 'Confirmar Nueva Clave'}
                </label>
                <div className="security-field-input">
                  <Password
                    id="confirm-new-password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder={t('security.masterPassword.placeholders.repeatNew') || 'Repetir la nueva clave'}
                    feedback={false}
                    toggleMask
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="security-actions">
                <Button
                  label={isLoading ? (t('security.masterPassword.buttons.changing') || 'Cambiando...') : (t('security.masterPassword.buttons.change') || 'Cambiar Clave')}
                  icon={isLoading ? 'pi pi-spin pi-spinner' : 'pi pi-sync'}
                  onClick={handleChangeMasterPassword}
                  disabled={!validatePasswordChange() || isLoading}
                  className="security-button security-button-primary"
                />

                <Button
                  label={t('security.masterPassword.buttons.delete') || 'Eliminar'}
                  icon="pi pi-times-circle"
                  onClick={handleRemoveMasterKey}
                  disabled={isLoading}
                  className="security-button security-button-danger"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(MasterKeySubTab);
