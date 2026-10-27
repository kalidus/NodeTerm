import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import AppDialog from '../ui/AppDialog';

// --- SSHDialog: para crear o editar conexiones SSH ---
export function SSHDialog({
  visible,
  onHide,
  mode = 'new', // 'new' o 'edit'
  name, setName,
  host, setHost,
  user, setUser,
  password, setPassword,
  port, setPort,
  remoteFolder, setRemoteFolder,
  targetFolder, setTargetFolder,
  foldersOptions = [],
  onConfirm,
  loading = false
}) {
  const isEdit = mode === 'edit';
  const [showPassword, setShowPassword] = useState(false);
  
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  return (
    <AppDialog
      headerIcon="pi pi-terminal"
      headerTitle={isEdit ? t('ssh.title.edit') : t('ssh.title.new')}
      visible={visible}
      size="lg"
      style={{
        width: '600px',
        maxWidth: '95vw',
        minWidth: '420px',
        height: 'auto',
        maxHeight: '90vh',
        minHeight: '420px'
      }}
      resizable
      onHide={onHide}
      className="ssh-connection-dialog"
      contentStyle={{
        padding: 0,
        overflow: 'auto'
      }}
      cancelLabel={tCommon('buttons.cancel')}
      confirmLabel={isEdit ? tCommon('buttons.save') : tCommon('buttons.create')}
      confirmIcon="pi pi-check"
      onConfirm={onConfirm}
      loading={loading}
    >
      <div className="general-settings-container" style={{ padding: '2rem' }}>
        {/* Sección: Conexión */}
        <div className="settings-section">
          <div className="section-header">
            <i className="pi pi-link section-icon"></i>
            <h3 className="section-title">{t('ssh.sections.connection')}</h3>
          </div>
          <div className="settings-options">
            <div className="p-field">
              <label htmlFor="sshName" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--ui-dialog-text)' }}>
                {t('ssh.fields.name')} <span style={{ color: 'var(--ui-button-primary)' }}>*</span>
              </label>
              <InputText 
                id="sshName" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder={t('ssh.placeholders.name')}
                autoFocus
                style={{ width: '100%' }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
              <div className="p-field">
                <label htmlFor="sshHost" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--ui-dialog-text)' }}>
                  {t('ssh.fields.host')} <span style={{ color: 'var(--ui-button-primary)' }}>*</span>
                </label>
                <InputText 
                  id="sshHost" 
                  value={host} 
                  onChange={e => setHost(e.target.value)} 
                  placeholder={t('ssh.placeholders.host')}
                  style={{ width: '100%' }}
                />
              </div>
              
              <div className="p-field" style={{ minWidth: '100px', maxWidth: '120px' }}>
                <label htmlFor="sshPort" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--ui-dialog-text)' }}>
                  {t('ssh.fields.port')}
                </label>
                <InputText 
                  id="sshPort" 
                  value={port} 
                  onChange={e => setPort(e.target.value)} 
                  placeholder={t('ssh.placeholders.port')}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            
            <div className="p-field">
              <label htmlFor="sshUser" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--ui-dialog-text)' }}>
                {t('ssh.fields.user')} <span style={{ color: 'var(--ui-button-primary)' }}>*</span>
              </label>
              <InputText 
                id="sshUser" 
                value={user} 
                onChange={e => setUser(e.target.value)} 
                placeholder={t('ssh.placeholders.user')}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Sección: Autenticación */}
        <div className="settings-section">
          <div className="section-header">
            <i className="pi pi-lock section-icon"></i>
            <h3 className="section-title">{t('ssh.sections.authentication')}</h3>
          </div>
          <div className="settings-options">
            <div className="p-field">
              <label htmlFor="sshPassword" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--ui-dialog-text)' }}>
                {t('ssh.fields.password')} <span style={{ color: 'var(--ui-button-primary)' }}>*</span>
              </label>
              <div className="p-inputgroup" style={{ width: '100%' }}>
                <InputText 
                  id="sshPassword" 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder={t('ssh.placeholders.password')}
                  style={{ width: '100%' }}
                />
                <Button 
                  type="button" 
                  icon={showPassword ? "pi pi-eye-slash" : "pi pi-eye"} 
                  className="p-button-outlined"
                  onClick={() => setShowPassword(!showPassword)}
                  tooltip={showPassword ? t('ssh.tooltips.hidePassword') : t('ssh.tooltips.showPassword')}
                  tooltipOptions={{ position: 'top' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Carpetas */}
        <div className="settings-section">
          <div className="section-header">
            <i className="pi pi-folder section-icon"></i>
            <h3 className="section-title">{t('ssh.sections.folders')}</h3>
          </div>
          <div className="settings-options">
            <div className="p-field">
              <label htmlFor="sshRemoteFolder" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--ui-dialog-text)' }}>
                {t('ssh.fields.remoteFolder')} <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>({tCommon('labels.optional')})</span>
              </label>
              <InputText 
                id="sshRemoteFolder" 
                value={remoteFolder} 
                onChange={e => setRemoteFolder(e.target.value)} 
                placeholder={t('ssh.placeholders.remoteFolder')}
                style={{ width: '100%' }}
              />
            </div>
            
            <div className="p-field">
              <label htmlFor="sshTargetFolder" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--ui-dialog-text)' }}>
                {t('ssh.fields.targetFolder')} <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>({tCommon('labels.optional')})</span>
              </label>
              <Dropdown 
                id="sshTargetFolder" 
                value={targetFolder} 
                options={foldersOptions} 
                onChange={e => setTargetFolder(e.value)} 
                placeholder={t('ssh.placeholders.targetFolder')}
                showClear 
                filter
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

      </div>
    </AppDialog>
  );
}
