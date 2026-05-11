import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Card } from 'primereact/card';
import { Fieldset } from 'primereact/fieldset';
import { RadioButton } from 'primereact/radiobutton';
import { ColorSelector } from './ColorSelector';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tooltip } from 'primereact/tooltip';
import { InputSwitch } from 'primereact/inputswitch';
import { FolderIconSelectorModal, FolderIconRenderer, FolderIconPresets } from './FolderIconSelector';
import { SSHIconSelectorModal, SSHIconRenderer, SSHIconPresets } from './SSHIconSelector';
import { iconThemes } from '../themes/icon-themes';
import { useTranslation } from '../i18n/hooks/useTranslation';

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
    <Dialog 
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <i className="pi pi-terminal" style={{ fontSize: '1.25rem', color: 'var(--ui-button-primary)' }}></i>
          <span>{isEdit ? t('ssh.title.edit') : t('ssh.title.new')}</span>
        </div>
      }
      visible={visible} 
      style={{
        width: '600px',
        maxWidth: '95vw',
        minWidth: '420px',
        height: 'auto',
        maxHeight: '90vh',
        minHeight: '420px'
      }} 
      modal 
      resizable
      onHide={onHide}
      className="ssh-connection-dialog"
      contentStyle={{
        background: 'var(--ui-dialog-bg)',
        color: 'var(--ui-dialog-text)',
        padding: '0',
        overflow: 'auto'
      }}
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

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--ui-dialog-border)' }}>
          <Button 
            label={tCommon('buttons.cancel')} 
            icon="pi pi-times" 
            className="p-button-text" 
            onClick={onHide} 
            style={{ minWidth: '120px' }} 
          />
          <Button 
            label={isEdit ? tCommon('buttons.save') : tCommon('buttons.create')} 
            icon="pi pi-check" 
            className="p-button-primary" 
            onClick={onConfirm} 
            style={{ minWidth: '120px' }} 
            loading={loading} 
          />
        </div>
      </div>
    </Dialog>
  );
}

// --- FolderDialog: para crear o editar carpetas ---
export function FolderDialog({
  visible,
  onHide,
  mode = 'new',
  folderName, setFolderName,
  folderColor, setFolderColor,
  folderIcon = null, 
  setFolderIcon,
  onConfirm,
  loading = false,
  iconTheme = 'material'
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  const isEdit = mode === 'edit';
  const [showIconSelector, setShowIconSelector] = useState(false);
  // Estado local como fallback si setFolderIcon no está disponible
  const [localFolderIcon, setLocalFolderIcon] = useState(folderIcon || null);
  
  
  // Usar el icono del prop si está disponible, sino el local
  const currentFolderIcon = folderIcon !== undefined ? folderIcon : localFolderIcon;
  
  // Determinar si hay un icono personalizado válido
  const hasCustomIcon = currentFolderIcon && currentFolderIcon !== 'general' && FolderIconPresets[currentFolderIcon.toUpperCase()];
  
  const selectedPreset = useMemo(() => {
    if (hasCustomIcon) {
      return FolderIconPresets[currentFolderIcon.toUpperCase()];
    }
    return FolderIconPresets.GENERAL; // Solo para el modal, no se usará en el renderizado
  }, [currentFolderIcon, hasCustomIcon]);
  
  // Obtener el icono del tema para mostrar cuando no hay icono personalizado
  const themeIcon = useMemo(() => {
    const theme = iconThemes[iconTheme] || iconThemes['material'];
    return theme?.icons?.folder || null;
  }, [iconTheme]);
  
  // Sincronizar estado local cuando cambia el prop
  useEffect(() => {
    if (folderIcon !== undefined) {
      setLocalFolderIcon(folderIcon);
    }
  }, [folderIcon]);
  
  // Función segura para actualizar el icono
  const handleIconSelect = useCallback((iconId) => {
    // Si se selecciona 'general', establecer como null para usar el icono del tema
    const iconToSet = iconId === 'general' ? null : iconId;
    
    // Siempre actualizar el estado local primero
    setLocalFolderIcon(iconToSet);
    
    // Intentar actualizar el hook si está disponible
    if (setFolderIcon && typeof setFolderIcon === 'function') {
      try {
        setFolderIcon(iconToSet);
      } catch (error) {
        console.error('❌ Error al llamar setFolderIcon:', error);
      }
    }
  }, [setFolderIcon]);
  
  return (
    <Dialog 
      header={
        <div className="folder-dialog-header">
          <div className="header-icon">
            <i className={`pi ${isEdit ? 'pi-pencil' : 'pi-folder-plus'}`}></i>
          </div>
          <div className="header-content">
            <h3 className="header-title">{isEdit ? t('folder.title.edit') : t('folder.title.new')}</h3>
            <p className="header-subtitle">
              {isEdit ? t('folder.subtitle.edit') : t('folder.subtitle.new')}
            </p>
          </div>
        </div>
      } 
      visible={visible} 
      style={{ width: '420px', borderRadius: '16px' }} 
      modal 
      onHide={onHide}
      className="folder-dialog"
    >
      <div className="folder-dialog-content">
        <div className="form-section">
          <div className="form-field">
            <label htmlFor="folderName" className="field-label">
              <i className="pi pi-tag"></i>
              {t('folder.fields.name')}
            </label>
            <InputText 
              id="folderName" 
              value={folderName} 
              onChange={e => setFolderName(e.target.value)} 
              placeholder={t('folder.placeholders.name')}
              className="folder-name-input"
              autoFocus 
            />
          </div>
          
          <div className="form-field">
            <label className="field-label">
              <i className="pi pi-palette"></i>
              {t('folder.fields.icon')}
            </label>
            <button
              type="button"
              onClick={() => setShowIconSelector(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem',
                backgroundColor: 'var(--ui-card-bg, rgba(255, 255, 255, 0.05))',
                border: '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.1))',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'var(--ui-dialog-text, #ffffff)',
                fontSize: '0.95rem'
              }}
            >
              {hasCustomIcon ? (
                <FolderIconRenderer preset={selectedPreset} size="medium" />
              ) : themeIcon ? (
                React.cloneElement(themeIcon, {
                  width: 40,
                  height: 40,
                  style: { 
                    ...themeIcon.props.style,
                    color: folderColor || '#007ad9',
                    width: '40px',
                    height: '40px'
                  }
                })
              ) : (
                <span className="pi pi-folder" style={{ fontSize: '40px', color: folderColor || '#007ad9' }} />
              )}
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: '600' }}>
                  {hasCustomIcon ? selectedPreset.name : t('folder.icon.themeIcon')}
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                  {hasCustomIcon ? selectedPreset.description : t('folder.icon.themeIconDescription')}
                </div>
              </div>
              <i className="pi pi-chevron-right"></i>
            </button>
          </div>
          
          <div className="form-field">
            <ColorSelector
              selectedColor={folderColor}
              onColorChange={setFolderColor}
              label={t('folder.fields.color')}
              iconTheme={iconTheme}
            />
          </div>
        </div>
        
        <div className="folder-preview">
          <div className="preview-label">{t('folder.preview.label')}</div>
          <div className="preview-folder" style={{ borderLeftColor: folderColor || '#007ad9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {hasCustomIcon ? (
              <FolderIconRenderer preset={selectedPreset} size="medium" />
            ) : themeIcon ? (
              React.cloneElement(themeIcon, {
                width: 40,
                height: 40,
                style: { 
                  ...themeIcon.props.style,
                  color: folderColor || '#007ad9',
                  width: '40px',
                  height: '40px'
                }
              })
            ) : (
              <span className="pi pi-folder" style={{ fontSize: '40px', color: folderColor || '#007ad9' }} />
            )}
            <span className="preview-name" style={{ color: folderColor || '#007ad9' }}>{folderName || t('folder.preview.defaultName')}</span>
          </div>
        </div>
      </div>
      
      <div className="folder-dialog-footer">
        <Button 
          label={tCommon('buttons.cancel')} 
          icon="pi pi-times" 
          className="p-button-text cancel-button" 
          onClick={onHide}
        />
        <Button 
          label={isEdit ? t('folder.buttons.saveChanges') : t('folder.buttons.create')} 
          icon={isEdit ? 'pi pi-save' : 'pi pi-plus'} 
          className="p-button-primary create-button" 
          onClick={() => {
            // Asegurar que el icono se actualice en el hook antes de guardar
            console.log('💾 Guardando carpeta con icono:', currentFolderIcon);
            if (setFolderIcon && typeof setFolderIcon === 'function') {
              setFolderIcon(currentFolderIcon);
            }
            onConfirm();
          }} 
          loading={loading}
          disabled={!folderName?.trim()}
        />
      </div>
      
      <FolderIconSelectorModal
        visible={showIconSelector}
        onHide={() => setShowIconSelector(false)}
        selectedIconId={hasCustomIcon ? selectedPreset.id : 'general'}
        onSelectIcon={handleIconSelect}
      />
    </Dialog>
  );
}

// --- GroupDialog: para crear nuevo grupo de pestañas ---
export function GroupDialog({
  visible,
  onHide,
  groupName, setGroupName,
  groupColor, setGroupColor,
  colorOptions = [],
  onConfirm,
  loading = false
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  return (
    <Dialog header={t('group.title.new')} visible={visible} style={{ width: '370px', borderRadius: 16 }} modal onHide={onHide}>
      <div className="p-fluid" style={{ padding: 8 }}>
        <div className="p-field" style={{ marginBottom: 18 }}>
          <label htmlFor="groupName">{t('group.fields.name')}</label>
          <InputText id="groupName" value={groupName} onChange={e => setGroupName(e.target.value)} autoFocus />
        </div>
        <div className="p-field" style={{ marginBottom: 18 }}>
          <label>{t('group.fields.color')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8, justifyContent: 'center', alignItems: 'center' }}>
            {colorOptions.map(color => (
              <div
                key={color}
                onClick={() => setGroupColor(color)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: color,
                  border: groupColor === color ? '3px solid #1976d2' : '2px solid #23272f',
                  boxShadow: groupColor === color ? '0 0 0 4px #1976d2aa' : '0 1px 4px rgba(0,0,0,0.10)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border 0.2s',
                  outline: groupColor === color ? '2px solid #1976d2' : 'none',
                  margin: 0,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={color}
              >
                {groupColor === color && (
                  <span style={{
                    position: 'absolute',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 900,
                    pointerEvents: 'none',
                    textShadow: '0 1px 4px #1976d2, 0 0 2px #23272f'
                  }}>✓</span>
                )}
              </div>
            ))}
            {/* Selector personalizado */}
            <div
              onClick={() => document.getElementById('custom-group-color-input').click()}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: groupColor && !colorOptions.includes(groupColor) ? groupColor : '#23272f',
                border: !colorOptions.includes(groupColor) ? '3px solid #1976d2' : '2px dashed #888',
                boxShadow: !colorOptions.includes(groupColor) ? '0 0 0 4px #1976d2aa' : '0 1px 4px rgba(0,0,0,0.10)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'box-shadow 0.2s, border 0.2s',
                margin: 0
              }}
              title={t('group.color.custom')}
            >
              <span style={{ fontSize: 16, color: !colorOptions.includes(groupColor) ? '#fff' : '#1976d2', pointerEvents: 'none', userSelect: 'none' }}>🎨</span>
              <input
                id="custom-group-color-input"
                type="color"
                value={groupColor}
                onChange={e => setGroupColor(e.target.value)}
                style={{ display: 'none' }}
              />
              {!colorOptions.includes(groupColor) && groupColor && (
                <span style={{
                  position: 'absolute',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 900,
                  pointerEvents: 'none',
                  textShadow: '0 1px 4px #1976d2, 0 0 2px #23272f',
                  left: 0, right: 0, top: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>✓</span>
              )}
            </div>
          </div>
        </div>
        <div className="p-field" style={{ marginTop: 18 }}>
          <Button
            label={t('group.buttons.create')}
            icon="pi pi-plus"
            onClick={onConfirm}
            disabled={!groupName.trim()}
            className="p-button-success"
            style={{ width: '100%' }}
            loading={loading}
          />
        </div>
      </div>
    </Dialog>
  );
}

// --- EditSSHConnectionDialog: Diálogo independiente para editar conexiones SSH ---
export function EditSSHConnectionDialog({
  visible,
  onHide,
  editNodeData,
  sshName, setSSHName,
  sshHost, setSSHHost,
  sshUser, setSSHUser,
  sshPassword, setSSHPassword,
  sshPort, setSSHPort,
  sshRemoteFolder, setSSHRemoteFolder,
  sshTargetFolder, setSSHTargetFolder,
  sshAuthMethod = 'password', setSSHAuthMethod = () => {},
  sshPrivateKey = '', setSSHPrivateKey = () => {},
  sshAutoCopyPassword = false, setSSHAutoCopyPassword = () => {},
  sshDescription = '', setSSHDescription = () => {},
  sshIcon = null, setSSHIcon = () => {},
  foldersOptions = [],
  onSSHConfirm,
  sshLoading = false,
  iconTheme = 'material'
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  
  // Estado para el modal del selector de iconos
  const [showIconSelector, setShowIconSelector] = useState(false);
  
  // Obtener el preset del icono actual
  const currentIconPreset = useMemo(() => {
    // Ignorar 'default' y null para usar el icono del tema
    if (sshIcon && sshIcon !== 'default' && SSHIconPresets[sshIcon.toUpperCase()]) {
      return SSHIconPresets[sshIcon.toUpperCase()];
    }
    return null;
  }, [sshIcon]);
  
  // Obtener el icono SSH del tema actual
  const themeSSHIcon = useMemo(() => {
    const theme = iconThemes[iconTheme] || iconThemes['material'];
    return theme?.icons?.ssh || null;
  }, [iconTheme]);
  
  // Precargar datos cuando se abre el diálogo
  useEffect(() => {
    if (editNodeData && visible) {
      if (setSSHName) setSSHName(editNodeData.label || '');
      if (setSSHHost) setSSHHost(editNodeData.data?.bastionHost || editNodeData.data?.host || '');
      if (setSSHUser) setSSHUser(editNodeData.data?.useBastionWallix ? editNodeData.data?.bastionUser || '' : editNodeData.data?.user || '');
      if (setSSHPassword) setSSHPassword(editNodeData.data?.password || '');
      if (setSSHAuthMethod) setSSHAuthMethod(deriveSSHAuthMethod(editNodeData.data));
      if (setSSHPrivateKey) setSSHPrivateKey(editNodeData.data?.privateKey || '');
      if (setSSHRemoteFolder) setSSHRemoteFolder(editNodeData.data?.remoteFolder || '');
      if (setSSHPort) setSSHPort(editNodeData.data?.port || 22);
      if (setSSHAutoCopyPassword && typeof setSSHAutoCopyPassword === 'function') {
        setSSHAutoCopyPassword(editNodeData.data?.autoCopyPassword || false);
      }
      if (setSSHDescription && typeof setSSHDescription === 'function') {
        setSSHDescription(editNodeData.data?.description || '');
      }
      if (setSSHIcon && typeof setSSHIcon === 'function') {
        setSSHIcon(editNodeData.data?.customIcon || null);
      }
    }
  }, [editNodeData, visible, setSSHName, setSSHHost, setSSHUser, setSSHPassword, setSSHAuthMethod, setSSHPrivateKey, setSSHRemoteFolder, setSSHPort, setSSHAutoCopyPassword, setSSHDescription, setSSHIcon]);

  // Handler para seleccionar icono
  const handleIconSelect = useCallback((iconId) => {
    if (setSSHIcon && typeof setSSHIcon === 'function') {
      // Convertir 'default' a null para usar el icono del tema
      setSSHIcon(iconId === 'default' ? null : iconId);
    }
  }, [setSSHIcon]);

  const headerTemplate = (
    <div className="terminal-header-compact">
      <div className="flex align-items-center gap-2">
        <button 
          type="button"
          onClick={() => setShowIconSelector(true)} 
          className="terminal-header-icon-btn"
          title="Cambiar Icono"
        >
          {currentIconPreset ? (
            <SSHIconRenderer preset={currentIconPreset} size="small" />
          ) : (
            <div className="terminal-header-icon-mini">
              <i className="pi pi-terminal"></i>
            </div>
          )}
        </button>
        <span className="terminal-header-title">{t('ssh.title.edit').toUpperCase()}</span>
      </div>
      <div className="terminal-header-accent"></div>
    </div>
  );

  return (
    <>
      <Dialog
        header={headerTemplate}
        visible={visible}
        style={{
          width: '600px',
          maxWidth: '95vw',
          minWidth: '420px',
          height: 'auto',
          maxHeight: '90vh',
          minHeight: '480px'
        }}
        modal
        resizable
        onHide={onHide}
        contentStyle={{
          padding: '0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: '1',
          minHeight: '0',
          background: 'var(--ui-dialog-bg)'
        }}
        className="terminal-pro-dialog"
        closable={false}
      >
        <div style={{ marginTop: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <EnhancedSSHForm
            activeTabIndex={0}
            sshName={sshName}
            setSSHName={setSSHName}
            sshHost={sshHost}
            setSSHHost={setSSHHost}
            sshUser={sshUser}
            setSSHUser={setSSHUser}
            sshPassword={sshPassword}
            setSSHPassword={setSSHPassword}
            sshPort={sshPort}
            setSSHPort={setSSHPort}
            sshRemoteFolder={sshRemoteFolder}
            setSSHRemoteFolder={setSSHRemoteFolder}
            sshTargetFolder={sshTargetFolder}
            setSSHTargetFolder={setSSHTargetFolder}
            sshAuthMethod={sshAuthMethod}
            setSSHAuthMethod={setSSHAuthMethod}
            sshPrivateKey={sshPrivateKey}
            setSSHPrivateKey={setSSHPrivateKey}
            sshAutoCopyPassword={sshAutoCopyPassword}
            setSSHAutoCopyPassword={setSSHAutoCopyPassword}
            sshDescription={sshDescription}
            setSSHDescription={setSSHDescription}
            foldersOptions={foldersOptions}
            onSSHConfirm={onSSHConfirm}
            onHide={onHide}
            sshLoading={sshLoading}
            isEditMode
          />
        </div>
      </Dialog>
      
      {/* Modal selector de iconos SSH */}
      <SSHIconSelectorModal
        visible={showIconSelector}
        onHide={() => setShowIconSelector(false)}
        selectedIconId={sshIcon}
        onSelectIcon={handleIconSelect}
      />
    </>
  );
}

// --- EditRDPConnectionDialog: Diálogo independiente para editar conexiones RDP ---
export function EditRDPConnectionDialog({
  visible,
  onHide,
  editNodeData,
  onSaveToSidebar
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  const [formData, setFormData] = useState({
    name: '',
    server: '',
    username: '',
    password: '',
    port: 3389,
    clientType: 'guacamole',
    preset: 'default',
    resolution: '1600x1000',
    colorDepth: 32,
    redirectFolders: true,
    redirectClipboard: true,
    redirectPrinters: false,
    redirectAudio: false,
    fullscreen: false,
    smartSizing: true,
    span: false,
    admin: false,
    public: false,
    autoResize: true,
    guacDpi: 96,
    guacSecurity: 'any',
    guacEnableWallpaper: true,
    guacEnableDrive: false,
    guacDriveHostDir: '',
    guacEnableGfx: false,
    guacEnableDesktopComposition: false,
    guacEnableFontSmoothing: false,
    guacEnableTheming: false,
    guacEnableFullWindowDrag: false,
    guacEnableMenuAnimations: false,
    guacDisableGlyphCaching: false,
    guacDisableOffscreenCaching: false,
    guacDisableBitmapCaching: false,
    guacDisableCopyRect: false
  });

  const [showRdpPassword, setShowRdpPassword] = useState(false);

  // Precargar datos cuando se abre el diálogo
  useEffect(() => {
    if (editNodeData && visible) {
      const data = editNodeData.data || {};
      setFormData({
        name: editNodeData.label || '',
        server: data.server || data.hostname || '',
        username: data.username || '',
        password: data.password || '',
        port: data.port || 3389,
        clientType: data.clientType || 'guacamole',
        preset: data.preset || 'default',
        resolution: data.resolution || '1600x1000',
        colorDepth: data.colorDepth || 32,
        redirectFolders: data.redirectFolders !== undefined ? data.redirectFolders : true,
        redirectClipboard: data.redirectClipboard !== undefined ? data.redirectClipboard : true,
        redirectPrinters: data.redirectPrinters || false,
        redirectAudio: data.redirectAudio !== undefined ? data.redirectAudio : true,
        fullscreen: data.fullscreen || false,
        smartSizing: data.smartSizing !== undefined ? data.smartSizing : true,
        span: data.span || false,
        admin: data.admin || false,
        public: data.public || false,
        autoResize: data.autoResize !== false,
        guacDpi: data.guacDpi || 96,
        guacSecurity: data.guacSecurity || 'any',
        guacEnableWallpaper: data.guacEnableWallpaper || false,
        guacEnableDrive: data.guacEnableDrive || false,
        guacDriveHostDir: data.guacDriveHostDir || '',
        guacEnableGfx: data.guacEnableGfx || false,
        guacEnableDesktopComposition: data.guacEnableDesktopComposition || false,
        guacEnableFontSmoothing: data.guacEnableFontSmoothing || false,
        guacEnableTheming: data.guacEnableTheming || false,
        guacEnableFullWindowDrag: data.guacEnableFullWindowDrag || false,
        guacEnableMenuAnimations: data.guacEnableMenuAnimations || false,
        guacDisableGlyphCaching: data.guacDisableGlyphCaching || false,
        guacDisableOffscreenCaching: data.guacDisableOffscreenCaching || false,
        guacDisableBitmapCaching: data.guacDisableBitmapCaching || false,
        guacDisableCopyRect: data.guacDisableCopyRect || false
      });
    }
  }, [editNodeData, visible]);

  // Resetear formulario al cerrar
  useEffect(() => {
    if (!visible) {
      setFormData({
        name: '',
        server: '',
        username: '',
        password: '',
        port: 3389,
        clientType: 'guacamole',
        preset: 'default',
        resolution: '1600x1000',
        colorDepth: 32,
        redirectFolders: true,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: false,
        fullscreen: false,
        smartSizing: true,
        span: false,
        admin: false,
        public: false,
        autoResize: true,
        guacDpi: 96,
        guacSecurity: 'any',
        guacEnableWallpaper: true,
        guacEnableDrive: false,
        guacDriveHostDir: '',
        guacEnableGfx: false,
        guacEnableDesktopComposition: false,
        guacEnableFontSmoothing: false,
        guacEnableTheming: false,
        guacEnableFullWindowDrag: false,
        guacEnableMenuAnimations: false,
        guacDisableGlyphCaching: false,
        guacDisableOffscreenCaching: false,
        guacDisableBitmapCaching: false,
        guacDisableCopyRect: false
      });
      setShowRdpPassword(false);
    }
  }, [visible]);

  const handleTextChange = useCallback((field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCheckboxChange = useCallback((field) => (e) => {
    const newValue = !!e.checked;
    setFormData(prev => ({ ...prev, [field]: newValue }));
  }, []);

  const handleSelectFolder = async () => {
    try {
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: t('rdp.tooltips.selectFolder')
      });
      
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        setFormData(prev => ({ ...prev, guacDriveHostDir: result.filePaths[0] }));
      }
    } catch (error) {
      console.error('Error al abrir selector de carpeta:', error);
    }
  };

  const isFormValid = useMemo(() => {
    return formData.name.trim() !== '' && formData.server.trim() !== '' && formData.username.trim() !== '';
  }, [formData]);

  const headerTemplate = (
    <div className="terminal-header-compact">
      <div className="flex align-items-center gap-2">
        <div className="terminal-header-icon-mini" style={{ background: 'rgba(33, 150, 243, 0.1)', color: '#2196F3' }}>
          <i className="pi pi-desktop"></i>
        </div>
        <span className="terminal-header-title">{t('rdp.title.edit').toUpperCase()}</span>
      </div>
      <div className="terminal-header-accent" style={{ background: '#2196F3', boxShadow: '0 0 8px #2196F3' }}></div>
    </div>
  );

  return (
    <Dialog
      header={headerTemplate}
      visible={visible}
      onHide={onHide}
      style={{ width: '100%', maxWidth: '800px' }}
      modal
      resizable={false}
      contentStyle={{ padding: '0', overflow: 'auto', background: 'var(--ui-dialog-bg)' }}
      className="terminal-pro-dialog"
      closable={false}
    >
      <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* --- COLUMNA IZQUIERDA: Conexión --- */}
            <div style={{ flex: '1', minWidth: '320px' }}>
              <Card title={`🔗 ${t('rdp.sections.connection')}`} className="mb-2">
                <div className="formgrid grid">
                  <div className="field col-12">
                    <label htmlFor="name-edit-rdp">{t('rdp.fields.name')} *</label>
                    <InputText
                      id="name-edit-rdp"
                      value={formData.name}
                      onChange={handleTextChange('name')}
                      placeholder={t('rdp.placeholders.name')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-8">
                    <label htmlFor="server-edit-rdp">{t('rdp.fields.server')} *</label>
                    <InputText
                      id="server-edit-rdp"
                      value={formData.server}
                      onChange={handleTextChange('server')}
                      placeholder={t('rdp.placeholders.server')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-4">
                    <label htmlFor="port-edit-rdp">{t('rdp.fields.port')}</label>
                    <InputText
                      id="port-edit-rdp"
                      type="number"
                      value={formData.port}
                      onChange={handleTextChange('port')}
                      placeholder={t('rdp.placeholders.port')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="username-edit-rdp">{t('rdp.fields.username')} *</label>
                    <InputText
                      id="username-edit-rdp"
                      value={formData.username}
                      onChange={handleTextChange('username')}
                      placeholder={t('rdp.placeholders.username')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="password-edit-rdp">{t('rdp.fields.password')}</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="password-edit-rdp"
                        type={showRdpPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleTextChange('password')}
                        placeholder={t('rdp.placeholders.password')}
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        icon={showRdpPassword ? "pi pi-eye-slash" : "pi pi-eye"}
                        className="p-button-outlined"
                        onClick={() => setShowRdpPassword(!showRdpPassword)}
                        tooltip={showRdpPassword ? t('rdp.tooltips.hidePassword') : t('rdp.tooltips.showPassword')}
                        tooltipOptions={{ position: 'top' }}
                      />
                    </div>
                  </div>
                  <div className="field col-12">
                    <label htmlFor="clientType-edit-rdp">💻 {t('rdp.fields.client')}</label>
                    <Dropdown
                      id="clientType-edit-rdp"
                      value={formData.clientType}
                      options={[
                        { label: t('rdp.clientTypes.mstsc'), value: 'mstsc' },
                        { label: t('rdp.clientTypes.guacamole'), value: 'guacamole' }
                      ]}
                      onChange={(e) => handleInputChange('clientType', e.value)}
                      placeholder={tCommon('labels.select')}
                    />
                  </div>
                  {formData.clientType === 'guacamole' && (
                    <div className="field col-12">
                      <label htmlFor="guacSecurity-edit-rdp">🔒 {t('rdp.fields.security')}</label>
                      <Dropdown
                        id="guacSecurity-edit-rdp"
                        value={formData.guacSecurity}
                        options={[
                          { label: `🛡️ ${t('rdp.securityOptions.any')}`, value: 'any' },
                          { label: `🔐 ${t('rdp.securityOptions.rdp')}`, value: 'rdp' },
                          { label: `🔒 ${t('rdp.securityOptions.tls')}`, value: 'tls' },
                          { label: `🛡️ ${t('rdp.securityOptions.nla')}`, value: 'nla' }
                        ]}
                        onChange={(e) => handleInputChange('guacSecurity', e.value)}
                        placeholder={tCommon('labels.select')}
                      />
                      <small>{t('rdp.descriptions.security')}</small>
                    </div>
                  )}
                </div>
              </Card>

              {formData.clientType === 'guacamole' && formData.guacEnableDrive && (
                <Card title={`📁 ${t('rdp.fields.sharedFolder')}`} className="mt-3">
                  <div className="field">
                    <label htmlFor="guacDriveHostDir-edit-rdp">{t('rdp.fields.localPath')}</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="guacDriveHostDir-edit-rdp"
                        value={formData.guacDriveHostDir}
                        onChange={handleTextChange('guacDriveHostDir')}
                        placeholder={t('rdp.placeholders.localPath')}
                      />
                      <Button icon="pi pi-folder-open" className="p-button-secondary p-button-outlined" onClick={handleSelectFolder} tooltip={t('rdp.tooltips.selectFolder')} />
                    </div>
                    <small className="p-d-block mt-2 text-color-secondary">
                      {t('rdp.descriptions.sharedFolder')}
                    </small>
                  </div>
                </Card>
              )}
            </div>

            {/* --- COLUMNA DERECHA: Ajustes de Sesión --- */}
            <div style={{ flex: '1.5', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Card: Pantalla */}
              <Card title={`🖥️ ${t('rdp.sections.screen')}`}>
                <div className="formgrid grid">
                  <div className="field col-6">
                    <label htmlFor="preset-edit-rdp">{t('rdp.fields.preset')}</label>
                    <Dropdown
                      id="preset-edit-rdp"
                      value={formData.preset}
                      options={[
                        { label: t('rdp.presets.default'), value: 'default' },
                        { label: t('rdp.presets.performance'), value: 'performance' },
                        { label: t('rdp.presets.quality'), value: 'quality' }
                      ]}
                      onChange={(e) => handleInputChange('preset', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="resolution-edit-rdp">{t('rdp.fields.resolution')}</label>
                    <Dropdown
                      id="resolution-edit-rdp"
                      value={formData.resolution}
                      options={[
                        { label: t('rdp.resolutions.fullscreen'), value: 'fullscreen' },
                        { label: '1920x1080', value: '1920x1080' },
                        { label: '1600x1000', value: '1600x1000' },
                        { label: '1366x768', value: '1366x768' },
                        { label: '1024x768', value: '1024x768' }
                      ]}
                      onChange={(e) => handleInputChange('resolution', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="colorDepth-edit-rdp">{t('rdp.fields.color')}</label>
                    <Dropdown
                      id="colorDepth-edit-rdp"
                      value={formData.colorDepth}
                      options={[
                        { label: t('rdp.colorDepths.32'), value: 32 },
                        { label: t('rdp.colorDepths.24'), value: 24 },
                        { label: t('rdp.colorDepths.16'), value: 16 },
                        { label: t('rdp.colorDepths.15'), value: 15 }
                      ]}
                      onChange={(e) => handleInputChange('colorDepth', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="guacDpi-edit-rdp">{t('rdp.fields.dpi')}</label>
                    <InputText
                      id="guacDpi-edit-rdp"
                      value={formData.guacDpi}
                      onChange={handleTextChange('guacDpi')}
                      placeholder={t('rdp.placeholders.dpi')}
                    />
                  </div>
                </div>
              </Card>

              {/* Card: Opciones */}
              <Card title={`⚙️ ${t('rdp.sections.options')}`}>
                <div className="formgrid grid">
                  {/* Opciones para MSTSC */}
                  {formData.clientType === 'mstsc' && (
                    <>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectClipboard-edit-rdp" checked={formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} /><label htmlFor="mstsc-redirectClipboard-edit-rdp">📋 {t('rdp.options.clipboard')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectAudio-edit-rdp" checked={formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} /><label htmlFor="mstsc-redirectAudio-edit-rdp">🔊 {t('rdp.options.audio')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectPrinters-edit-rdp" checked={formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} /><label htmlFor="mstsc-redirectPrinters-edit-rdp">🖨️ {t('rdp.options.printers')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectFolders-edit-rdp" checked={formData.redirectFolders} onChange={handleCheckboxChange('redirectFolders')} /><label htmlFor="mstsc-redirectFolders-edit-rdp">📁 {t('rdp.options.folders')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-smartSizing-edit-rdp" checked={formData.smartSizing} onChange={handleCheckboxChange('smartSizing')} /><label htmlFor="mstsc-smartSizing-edit-rdp">📐 {t('rdp.options.smartSizing')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-fullscreen-edit-rdp" checked={formData.fullscreen} onChange={handleCheckboxChange('fullscreen')} /><label htmlFor="mstsc-fullscreen-edit-rdp">🖥️ {t('rdp.options.fullscreen')}</label></div>
                    </>
                  )}
                  {/* Opciones para Guacamole */}
                  {formData.clientType === 'guacamole' && (
                    <>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectClipboard-edit-rdp" checked={!!formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} key={`clipboard-${formData.redirectClipboard}`} /><label htmlFor="guac-redirectClipboard-edit-rdp">📋 {t('rdp.options.clipboard')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectAudio-edit-rdp" checked={!!formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} key={`audio-${formData.redirectAudio}`} /><label htmlFor="guac-redirectAudio-edit-rdp">🔊 {t('rdp.options.audio')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-enableDrive-edit-rdp" checked={!!formData.guacEnableDrive} onChange={handleCheckboxChange('guacEnableDrive')} key={`drive-${formData.guacEnableDrive}`} /><label htmlFor="guac-enableDrive-edit-rdp">💾 {t('rdp.options.enableDrive')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-autoResize-edit-rdp" checked={!!formData.autoResize} onChange={handleCheckboxChange('autoResize')} key={`resize-${formData.autoResize}`} /><label htmlFor="guac-autoResize-edit-rdp">📐 {t('rdp.options.autoResize')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-enableWallpaper-edit-rdp" checked={!!formData.guacEnableWallpaper} onChange={handleCheckboxChange('guacEnableWallpaper')} key={`wallpaper-${formData.guacEnableWallpaper}`} /><label htmlFor="guac-enableWallpaper-edit-rdp">🖼️ {t('rdp.options.enableWallpaper')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectPrinters-edit-rdp" checked={!!formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} key={`printers-${formData.redirectPrinters}`} /><label htmlFor="guac-redirectPrinters-edit-rdp">🖨️ {t('rdp.options.printers')}</label></div>
                    </>
                  )}
                </div>

                {/* Fieldset: Opciones Avanzadas */}
                {formData.clientType === 'guacamole' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                    <Fieldset legend={`⚙️ ${t('rdp.sections.advanced')}`} toggleable collapsed className="advanced-fieldset">
                      <div className="formgrid grid">
                        <div className="col-4">
                          <h5>{t('rdp.advanced.performance')}</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-gfx-edit-rdp" checked={!!formData.guacEnableGfx} onChange={handleCheckboxChange('guacEnableGfx')} key={`gfx-${formData.guacEnableGfx}`} /><label htmlFor="guac-gfx-edit-rdp">🎨 {t('rdp.advanced.enableGfx')}</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-composition-edit-rdp" checked={!!formData.guacEnableDesktopComposition} onChange={handleCheckboxChange('guacEnableDesktopComposition')} key={`composition-${formData.guacEnableDesktopComposition}`} /><label htmlFor="guac-composition-edit-rdp">🖼️ {t('rdp.advanced.desktopComposition')}</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-font-edit-rdp" checked={!!formData.guacEnableFontSmoothing} onChange={handleCheckboxChange('guacEnableFontSmoothing')} key={`font-${formData.guacEnableFontSmoothing}`} /><label htmlFor="guac-font-edit-rdp">✨ {t('rdp.advanced.fontSmoothing')}</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-theming-edit-rdp" checked={!!formData.guacEnableTheming} onChange={handleCheckboxChange('guacEnableTheming')} key={`theming-${formData.guacEnableTheming}`} /><label htmlFor="guac-theming-edit-rdp">🎭 {t('rdp.advanced.theming')}</label></div>
                        </div>
                        <div className="col-4">
                          <h5>{t('rdp.advanced.interface')}</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-drag-edit-rdp" checked={!!formData.guacEnableFullWindowDrag} onChange={handleCheckboxChange('guacEnableFullWindowDrag')} key={`drag-${formData.guacEnableFullWindowDrag}`} /><label htmlFor="guac-drag-edit-rdp">🖱️ {t('rdp.advanced.fullWindowDrag')}</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-menu-edit-rdp" checked={!!formData.guacEnableMenuAnimations} onChange={handleCheckboxChange('guacEnableMenuAnimations')} key={`menu-${formData.guacEnableMenuAnimations}`} /><label htmlFor="guac-menu-edit-rdp">🎬 {t('rdp.advanced.menuAnimations')}</label></div>
                        </div>
                        <div className="col-4">
                          <h5>{t('rdp.advanced.cache')}</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-glyph-cache-edit-rdp" checked={!!(!formData.guacDisableGlyphCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableGlyphCaching', !newValue); }} key={`glyph-${!formData.guacDisableGlyphCaching}`} /><label htmlFor="guac-glyph-cache-edit-rdp">🔤 {t('rdp.advanced.glyphCaching')}</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-offscreen-cache-edit-rdp" checked={!!(!formData.guacDisableOffscreenCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableOffscreenCaching', !newValue); }} key={`offscreen-${!formData.guacDisableOffscreenCaching}`} /><label htmlFor="guac-offscreen-cache-edit-rdp">📱 {t('rdp.advanced.offscreenCaching')}</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-bitmap-cache-edit-rdp" checked={!!(!formData.guacDisableBitmapCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableBitmapCaching', !newValue); }} key={`bitmap-${!formData.guacDisableBitmapCaching}`} /><label htmlFor="guac-bitmap-cache-edit-rdp">🖼️ {t('rdp.advanced.bitmapCaching')}</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-copy-rect-edit-rdp" checked={!!(!formData.guacDisableCopyRect)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableCopyRect', !newValue); }} key={`copyrect-${!formData.guacDisableCopyRect}`} /><label htmlFor="guac-copy-rect-edit-rdp">📋 {t('rdp.advanced.copyRect')}</label></div>
                        </div>
                      </div>
                    </Fieldset>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
        {/* Botones */}
        <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 0, justifyContent: 'flex-end', paddingTop: '12px' }}>
          <Button
            label={tCommon('buttons.cancel')}
            icon="pi pi-times"
            className="p-button-text"
            onClick={onHide}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          />
          <Button
            label={tCommon('buttons.save')}
            icon="pi pi-check"
            className="p-button-primary"
            onClick={() => {
              console.log('Guardar cambios RDP con datos:', formData);
              onSaveToSidebar && onSaveToSidebar(formData, true, editNodeData);
              onHide();
            }}
            disabled={!isFormValid}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          />
        </div>
      </div>
    </Dialog>
  );
}

// --- UnifiedConnectionDialog: diálogo unificado para SSH y RDP ---
// Diálogo independiente para conexiones de archivos (SFTP/FTP/SCP)
export function FileConnectionDialog({
  visible,
  onHide,
  onGoBack,
  // Props para edición
  isEditMode = false,
  editNodeData = null,
  // Props para creación
  fileConnectionName = '',
  setFileConnectionName = () => {},
  fileConnectionHost = '',
  setFileConnectionHost = () => {},
  fileConnectionUser = '',
  setFileConnectionUser = () => {},
  fileConnectionPassword = '',
  setFileConnectionPassword = () => {},
  fileConnectionPort = 22,
  setFileConnectionPort = () => {},
  fileConnectionProtocol = 'sftp',
  setFileConnectionProtocol = () => {},
  fileConnectionRemoteFolder = '',
  setFileConnectionRemoteFolder = () => {},
  fileConnectionTargetFolder = '',
  setFileConnectionTargetFolder = () => {},
  onFileConnectionConfirm = null,
  fileConnectionLoading = false
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  // Estados locales para el formulario
  const [localName, setLocalName] = useState('');
  const [localHost, setLocalHost] = useState('');
  const [localUser, setLocalUser] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [localPort, setLocalPort] = useState(22);
  const [localProtocol, setLocalProtocol] = useState('sftp');
  const [localRemoteFolder, setLocalRemoteFolder] = useState('');
  const [localTargetFolder, setLocalTargetFolder] = useState('');

  // Precargar datos en modo edición
  useEffect(() => {
    if (isEditMode && editNodeData && visible) {
      const data = editNodeData.data || {};
      setLocalName(editNodeData.label || '');
      setLocalHost(data.host || '');
      setLocalUser(data.user || data.username || '');
      setLocalPassword(data.password || '');
      setLocalPort(data.port || (data.protocol === 'ftp' ? 21 : 22));
      setLocalProtocol(data.protocol || data.type || 'sftp');
      setLocalRemoteFolder(data.remoteFolder || '');
      setLocalTargetFolder(data.targetFolder || '');
    } else if (!isEditMode && visible) {
      // Modo creación: usar valores por defecto o de props
      setLocalName(fileConnectionName || '');
      setLocalHost(fileConnectionHost || '');
      setLocalUser(fileConnectionUser || '');
      setLocalPassword(fileConnectionPassword || '');
      setLocalPort(fileConnectionPort || 22);
      setLocalProtocol(fileConnectionProtocol || 'sftp');
      setLocalRemoteFolder(fileConnectionRemoteFolder || '');
      setLocalTargetFolder(fileConnectionTargetFolder || '');
    }
  }, [isEditMode, editNodeData, visible, fileConnectionName, fileConnectionHost, fileConnectionUser, fileConnectionPassword, fileConnectionPort, fileConnectionProtocol, fileConnectionRemoteFolder, fileConnectionTargetFolder]);

  // Resetear al cerrar
  useEffect(() => {
    if (!visible) {
      setLocalName('');
      setLocalHost('');
      setLocalUser('');
      setLocalPassword('');
      setLocalPort(22);
      setLocalProtocol('sftp');
      setLocalRemoteFolder('');
      setLocalTargetFolder('');
    }
  }, [visible]);

  const handleProtocolChange = (value) => {
    setLocalProtocol(value);
    if (setFileConnectionProtocol) setFileConnectionProtocol(value);
    // Cambiar puerto por defecto según protocolo
    const defaultPorts = { sftp: 22, ftp: 21, scp: 22 };
    const newPort = defaultPorts[value] || 22;
    setLocalPort(newPort);
    if (setFileConnectionPort) setFileConnectionPort(newPort);
  };

  const handleConfirm = () => {
    if (!localName.trim() || !localHost.trim() || !localUser.trim()) {
      console.error('❌ Faltan campos requeridos');
      return;
    }

    const fileData = {
      name: localName,
      host: localHost,
      username: localUser,
      password: localPassword,
      port: localPort,
      protocol: localProtocol,
      remoteFolder: localRemoteFolder,
      targetFolder: localTargetFolder
    };

    if (onFileConnectionConfirm && typeof onFileConnectionConfirm === 'function') {
      try {
        onFileConnectionConfirm(fileData);
      } catch (error) {
        console.error('❌ Error al guardar conexión de archivos:', error);
      }
    } else {
      console.error('❌ onFileConnectionConfirm no es una función válida');
    }
  };

  return (
    <Dialog
      header={isEditMode ? t('fileConnection.title.edit') : t('fileConnection.title.new')}
      visible={visible}
      style={{ width: '500px', borderRadius: '16px' }}
      modal
      onHide={onHide}
      className="file-connection-dialog"
    >
      <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
          <Card title={`🔗 ${t('fileConnection.sections.connection')}`} className="mb-2">
            <div className="formgrid grid">
              <div className="field col-12">
                <label htmlFor="file-name">{t('fileConnection.fields.name')} *</label>
                <InputText
                  id="file-name"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder={t('fileConnection.placeholders.name')}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12 md:col-6">
                <label htmlFor="file-protocol">{t('fileConnection.fields.protocol')} *</label>
                <Dropdown
                  id="file-protocol"
                  value={localProtocol}
                  options={[
                    { label: t('fileConnection.protocols.sftp'), value: 'sftp' },
                    { label: t('fileConnection.protocols.ftp'), value: 'ftp' },
                    { label: t('fileConnection.protocols.scp'), value: 'scp' }
                  ]}
                  onChange={(e) => handleProtocolChange(e.value)}
                  placeholder={tCommon('labels.select')}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12 md:col-6">
                <label htmlFor="file-host">{t('fileConnection.fields.host')} *</label>
                <InputText
                  id="file-host"
                  value={localHost}
                  onChange={(e) => setLocalHost(e.target.value)}
                  placeholder={t('fileConnection.placeholders.host')}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12 md:col-6">
                <label htmlFor="file-user">{t('fileConnection.fields.user')} *</label>
                <InputText
                  id="file-user"
                  value={localUser}
                  onChange={(e) => setLocalUser(e.target.value)}
                  placeholder={t('fileConnection.placeholders.user')}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12 md:col-6">
                <label htmlFor="file-port">{t('fileConnection.fields.port')}</label>
                <InputText
                  id="file-port"
                  type="number"
                  value={localPort}
                  onChange={(e) => setLocalPort(parseInt(e.target.value) || (localProtocol === 'ftp' ? 21 : 22))}
                  placeholder={localProtocol === 'ftp' ? '21' : '22'}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12">
                <label htmlFor="file-password">{t('fileConnection.fields.password')}</label>
                <InputText
                  id="file-password"
                  type="password"
                  value={localPassword}
                  onChange={(e) => setLocalPassword(e.target.value)}
                  placeholder={t('fileConnection.placeholders.password')}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12">
                <label htmlFor="file-remote-folder">{t('fileConnection.fields.remoteFolder')} ({tCommon('labels.optional')})</label>
                <InputText
                  id="file-remote-folder"
                  value={localRemoteFolder}
                  onChange={(e) => setLocalRemoteFolder(e.target.value)}
                  placeholder={t('fileConnection.placeholders.remoteFolder')}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12">
                <label htmlFor="file-target-folder">{t('fileConnection.fields.targetFolder')} ({tCommon('labels.optional')})</label>
                <InputText
                  id="file-target-folder"
                  value={localTargetFolder}
                  onChange={(e) => setLocalTargetFolder(e.target.value)}
                  placeholder={t('fileConnection.placeholders.targetFolder')}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-content-between gap-2 mt-3" style={{ borderTop: '1px solid #e9ecef', paddingTop: '12px' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {onGoBack && (
              <Button
                label={t('common.back')}
                icon="pi pi-arrow-left"
                className="p-button-text"
                onClick={onGoBack}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              label={tCommon('buttons.cancel')}
              icon="pi pi-times"
              className="p-button-text"
              onClick={onHide}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            />
            <Button
              label={isEditMode ? t('fileConnection.buttons.saveChanges') : t('fileConnection.buttons.create')}
              icon="pi pi-check"
              className="p-button-primary"
              onClick={handleConfirm}
              loading={fileConnectionLoading}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// UnifiedConnectionDialog ELIMINADO - Ahora se usan diálogos independientes:
// - EditSSHConnectionDialog para editar SSH
// - EditRDPConnectionDialog para editar RDP  
// - FileConnectionDialog para editar/crear File connections

function PasswordCreateForm({ foldersOptions = [], onCreate }) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  const [title, setTitle] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [group, setGroup] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [targetFolder, setTargetFolder] = React.useState(null);
  const [showPassword, setShowPassword] = React.useState('');

  const canCreate = title.trim().length > 0;

  return (
    <div className="p-fluid" style={{ padding: '12px' }}>
      <div className="formgrid grid">
        <div className="field col-12">
          <label htmlFor="pwdTitle">{t('passwordManager.fields.title')} *</label>
          <InputText id="pwdTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('passwordManager.placeholders.title')} />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdUser">{t('passwordManager.fields.username')}</label>
          <InputText id="pwdUser" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdPass">{t('passwordManager.fields.password')}</label>
          <div className="p-inputgroup">
            <InputText 
              id="pwdPass" 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            <Button 
              type="button" 
              icon={showPassword ? "pi pi-eye-slash" : "pi pi-eye"} 
              className="p-button-outlined"
              onClick={() => setShowPassword(!showPassword)}
              tooltip={showPassword ? t('passwordManager.tooltips.hidePassword') : t('passwordManager.tooltips.showPassword')}
              tooltipOptions={{ position: 'top' }}
            />
          </div>
        </div>
        <div className="field col-12">
          <label htmlFor="pwdUrl">{t('passwordManager.fields.url')}</label>
          <InputText id="pwdUrl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('passwordManager.placeholders.url')} />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdGroup">{t('passwordManager.fields.group')}</label>
          <InputText id="pwdGroup" value={group} onChange={(e) => setGroup(e.target.value)} />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdFolder">{t('passwordManager.fields.folder')}</label>
          <Dropdown
            id="pwdFolder"
            value={targetFolder}
            options={foldersOptions}
            onChange={(e) => setTargetFolder(e.value)}
            placeholder={t('passwordManager.placeholders.folder')}
            optionLabel="label"
            optionValue="key"
          />
        </div>
        <div className="field col-12">
          <label htmlFor="pwdNotes">{t('passwordManager.fields.notes')}</label>
          <InputTextarea id="pwdNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </div>
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <Button
          label={tCommon('buttons.create')}
          icon="pi pi-plus"
          onClick={() => {
            if (canCreate && onCreate) {
              onCreate({
                title,
                username,
                password,
                url,
                group,
                notes,
                targetFolder
              });
            }
          }}
          disabled={!canCreate}
          className="p-button-success"
        />
      </div>
    </div>
  );
}


function deriveSSHAuthMethod(nodeData) {
  if (!nodeData) return 'password';
  if (nodeData.authMethod === 'key' || nodeData.authMethod === 'password') {
    return nodeData.authMethod;
  }
  if (nodeData.privateKey?.trim()) return 'key';
  return 'password';
}

// --- EnhancedSSHForm: Formulario SSH mejorado con soporte para claves ---
export function EnhancedSSHForm({
  activeTabIndex,
  sshName, setSSHName,
  sshHost, setSSHHost,
  sshUser, setSSHUser,
  sshPassword, setSSHPassword,
  sshPort, setSSHPort,
  sshRemoteFolder, setSSHRemoteFolder,
  sshTargetFolder, setSSHTargetFolder,
  sshAuthMethod = 'password', setSSHAuthMethod = () => {},
  sshPrivateKey = '', setSSHPrivateKey = () => {},
  sshAutoCopyPassword = false, setSSHAutoCopyPassword = () => {},
  sshDescription = '', setSSHDescription = () => {},
  foldersOptions = [],
  onSSHConfirm,
  onHide,
  onGoBack,
  sshLoading = false,
  isEditMode = false
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [privateKeyFileName, setPrivateKeyFileName] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const privateKeyInputRef = useRef(null);

  // Validación del formulario
  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!sshName?.trim()) {
      errors.name = t('ssh.validation.nameRequired');
    }
    
    if (!sshHost?.trim()) {
      errors.host = t('ssh.validation.hostRequired');
    }
    
    if (!sshUser?.trim()) {
      errors.user = t('ssh.validation.userRequired');
    }
    
    if (sshAuthMethod === 'password' && !sshPassword?.trim()) {
      errors.password = t('ssh.validation.passwordRequired');
    }
    
    if (sshAuthMethod === 'key' && !sshPrivateKey?.trim()) {
      errors.privateKey = t('ssh.validation.privateKeyRequired');
    }
    
    return errors;
  }, [sshName, sshHost, sshUser, sshPassword, sshAuthMethod, sshPrivateKey, t]);

  const handleSubmit = useCallback((e) => {
    if (e) e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    
    if (onSSHConfirm && typeof onSSHConfirm === 'function') {
      onSSHConfirm();
    }
  }, [validateForm, onSSHConfirm]);

  const handlePrivateKeyFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPrivateKeyFileName(file.name);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setSSHPrivateKey(loadEvent.target?.result || '');
    };
    reader.readAsText(file);
  }, [setSSHPrivateKey]);

  const isFormValid = () => {
    return sshName?.trim() && 
           sshHost?.trim() && 
           sshUser?.trim() &&
           (sshAuthMethod === 'password' ? sshPassword?.trim() : sshPrivateKey?.trim());
  };

  // Render del formulario
  return (
    <div className="ssh-terminal-form" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0.75rem 1rem' }}>
      <Tooltip target=".info-icon" position="top" />
      
      <div className="terminal-form-scroll-area" style={{ flex: '1 1 auto', overflowY: 'auto', paddingRight: '4px' }}>
        
        {/* Row: Host / Port — grid fijo para que el puerto no robe espacio al host */}
        <div className="terminal-host-port-row mb-3">
          <div className="terminal-host-port-host">
            <label className="terminal-label">HOST / DIRECCIÓN IP</label>
            <div className="terminal-input-wrap">
              <i className="pi pi-server terminal-icon-left"></i>
              <InputText 
                value={sshHost} 
                onChange={(e) => setSSHHost(e.target.value)}
                placeholder="ssh.ejemplo.com"
                className={`terminal-input ${validationErrors.host ? 'p-invalid' : ''}`}
              />
              <i className="pi pi-ellipsis-h terminal-icon-right opacity-30"></i>
            </div>
          </div>
          <div className="terminal-host-port-port">
            <label className="terminal-label">PUERTO</label>
            <div className="terminal-input-wrap terminal-port-input-wrap">
              <InputText
                value={sshPort}
                onChange={(e) => setSSHPort(e.target.value)}
                placeholder="22"
                className="terminal-input terminal-port-input text-center"
              />
            </div>
          </div>
        </div>

        {/* Row: Name / Description */}
        <div className="terminal-row grid grid-nogutter gap-3 mb-3">
          <div className="col">
            <label className="terminal-label">NOMBRE DE CONEXIÓN</label>
            <div className="terminal-input-wrap">
              <InputText value={sshName} onChange={(e) => setSSHName(e.target.value)} placeholder="Mi Servidor" className="terminal-input" />
            </div>
          </div>
          <div className="col">
            <label className="terminal-label">DESCRIPCIÓN</label>
            <div className="terminal-input-wrap">
              <InputText value={sshDescription} onChange={(e) => setSSHDescription(e.target.value)} placeholder="..." className="terminal-input" />
            </div>
          </div>
        </div>

        {/* Row: Auth Type */}
        <div className="terminal-row mb-3">
          <label className="terminal-label">{t('ssh.auth.method').toUpperCase()}</label>
          <div className="terminal-auth-selector">
            <div
              className={`terminal-auth-chip ${sshAuthMethod === 'password' ? 'active' : ''}`}
              onClick={() => {
                setSSHAuthMethod('password');
                setSSHPrivateKey('');
                setPrivateKeyFileName('');
              }}
            >
              <i className="pi pi-lock"></i> {t('ssh.auth.password')}
            </div>
            <div
              className={`terminal-auth-chip ${sshAuthMethod === 'key' ? 'active' : ''}`}
              onClick={() => {
                setSSHAuthMethod('key');
                setSSHPassword('');
              }}
            >
              <i className="pi pi-key"></i> {t('ssh.auth.key')}
            </div>
          </div>
        </div>

        {/* Row: User */}
        <div className="terminal-row mb-3">
          <label className="terminal-label">USUARIO</label>
          <div className="terminal-input-wrap">
            <i className="pi pi-user terminal-icon-left"></i>
            <InputText value={sshUser} onChange={(e) => setSSHUser(e.target.value)} placeholder="admin_usuario" className="terminal-input" />
          </div>
        </div>

        {sshAuthMethod === 'password' ? (
          <div className="terminal-row mb-4">
            <label className="terminal-label">{t('ssh.fields.password').toUpperCase()}</label>
            <div className="terminal-input-wrap">
              <i className="pi pi-lock terminal-icon-left"></i>
              <InputText
                type={showPassword ? 'text' : 'password'}
                value={sshPassword}
                onChange={(e) => setSSHPassword(e.target.value)}
                placeholder={t('ssh.placeholders.password')}
                className={`terminal-input ${validationErrors.password ? 'p-invalid' : ''}`}
              />
              <i
                className={`pi ${showPassword ? 'pi-eye-slash' : 'pi-eye'} terminal-icon-right cursor-pointer`}
                onClick={() => setShowPassword(!showPassword)}
              ></i>
            </div>
          </div>
        ) : (
          <div className="terminal-row mb-4">
            <label className="terminal-label">{t('ssh.fields.privateKeySSH').toUpperCase()}</label>
            <div className="terminal-input-wrap terminal-key-file-wrap">
              <i className="pi pi-file terminal-icon-left"></i>
              <span className="terminal-key-file-name opacity-60 truncate">
                {privateKeyFileName || (sshPrivateKey ? t('ssh.auth.keyLoaded') : t('ssh.auth.keyFilePlaceholder'))}
              </span>
              <input
                ref={privateKeyInputRef}
                type="file"
                accept=".pem,.key,.ppk,text/plain"
                className="terminal-key-file-input"
                onChange={handlePrivateKeyFileChange}
              />
              <button
                type="button"
                className="terminal-key-file-btn"
                onClick={() => privateKeyInputRef.current?.click()}
              >
                {t('ssh.auth.browseKeyFile')}
              </button>
            </div>
          </div>
        )}

        <div className="terminal-advanced-section mb-3">
          <button
            type="button"
            className="terminal-advanced-header"
            onClick={() => setShowAdvancedOptions((open) => !open)}
            aria-expanded={showAdvancedOptions}
          >
            <span className="terminal-label mb-0">{t('ssh.sections.advanced').toUpperCase()}</span>
            <i className={`pi ${showAdvancedOptions ? 'pi-chevron-up' : 'pi-chevron-down'} opacity-50`}></i>
          </button>

          {showAdvancedOptions && (
            <div className="terminal-options-list">
          <div className="terminal-option-item">
              <div className="flex align-items-center">
                <i className="pi pi-save terminal-option-icon"></i>
                <span className="terminal-option-text">{t('ssh.auth.autoCopyPassword')}</span>
              </div>
              <div className="terminal-dotted-spacer"></div>
              <InputSwitch
                checked={sshAutoCopyPassword}
                onChange={(e) => setSSHAutoCopyPassword(e.value)}
                className="terminal-switch"
                disabled={sshAuthMethod === 'key'}
              />
            </div>

          <div className="terminal-option-item">
            <div className="flex align-items-center">
              <i className="pi pi-desktop terminal-option-icon"></i>
              <span className="terminal-option-text">X11 Forwarding</span>
            </div>
            <div className="terminal-dotted-spacer"></div>
            <InputSwitch checked={false} className="terminal-switch" />
          </div>

          <div className="terminal-option-item">
            <div className="flex align-items-center">
              <i className="pi pi-shield terminal-option-icon"></i>
              <span className="terminal-option-text">Agent Forwarding</span>
            </div>
            <div className="terminal-dotted-spacer"></div>
            <InputSwitch checked={false} className="terminal-switch" />
          </div>

              <div className="terminal-row mt-2">
                <label className="terminal-label">
                  {t('ssh.fields.targetFolder').toUpperCase()}{' '}
                  <span className="opacity-50">({tCommon('labels.optional')})</span>
                </label>
                <div className="terminal-input-wrap terminal-folder-dropdown-wrap">
                  <i className="pi pi-folder terminal-icon-left"></i>
                  <Dropdown
                    value={sshTargetFolder}
                    options={foldersOptions}
                    onChange={(e) => setSSHTargetFolder(e.value)}
                    optionLabel="label"
                    optionValue="value"
                    placeholder={t('ssh.placeholders.targetFolder')}
                    showClear
                    filter
                    filterPlaceholder={t('ssh.placeholders.targetFolder')}
                    className="terminal-folder-dropdown"
                    panelClassName="terminal-folder-dropdown-panel"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Footer Terminal */}
      <div className="terminal-footer">
        <button className="terminal-btn-outline" onClick={() => {}}>
          <i className="pi pi-sync mr-2"></i> PROBAR CONEXIÓN
        </button>
        <div className="flex gap-2">
          <button className="terminal-btn-text" onClick={onHide}>CANCELAR</button>
          <button
            className="terminal-btn-outline terminal-btn-submit"
            onClick={handleSubmit}
            disabled={!isFormValid() || sshLoading}
          >
            <i className={sshLoading ? 'pi pi-spin pi-spinner mr-2' : isEditMode ? 'pi pi-save mr-2' : 'pi pi-angle-right mr-2'}></i>
            {sshLoading ? '_ CARGANDO...' : isEditMode ? tCommon('buttons.save').toUpperCase() : '_ CONECTAR'}
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .ssh-terminal-form {
          font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
          background: var(--ui-dialog-bg);
          color: var(--ui-dialog-text);
        }
        .terminal-host-port-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 7.5rem;
          gap: 0.75rem;
          align-items: start;
          width: 100%;
        }
        .terminal-host-port-host {
          min-width: 0;
        }
        .terminal-host-port-port {
          min-width: 0;
          width: 7.5rem;
          max-width: 7.5rem;
        }
        .terminal-label {
          display: block;
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--ui-button-primary);
          margin-bottom: 0.5rem;
          letter-spacing: 0.05em;
        }
        .terminal-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          background: color-mix(in srgb, var(--ui-dialog-text) 3%, transparent);
          border: 1px solid var(--ui-dialog-border);
          border-radius: 4px;
          padding: 0 0.5rem;
          transition: all 0.2s ease;
        }
        .terminal-port-input-wrap {
          overflow: hidden;
          padding: 0 0.35rem;
        }
        .terminal-input-wrap:focus-within {
          border-color: var(--ui-button-primary);
          box-shadow: 0 0 10px color-mix(in srgb, var(--ui-button-primary) 10%, transparent);
        }
        .terminal-input {
          background: transparent !important;
          border: none !important;
          color: var(--ui-dialog-text) !important;
          font-family: inherit !important;
          font-size: 0.85rem !important;
          padding: 0.5rem 0.25rem !important;
          flex: 1;
        }
        .terminal-port-input {
          width: 100% !important;
          min-width: 0 !important;
          text-align: center !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        .terminal-input:focus,
        .terminal-input:enabled:focus,
        .terminal-input.p-focus {
          box-shadow: none !important;
          outline: none !important;
          border-color: transparent !important;
        }
        /* PrimeReact + tema cyberpunk: layouts.css fuerza un halo con !important */
        body.layout-cyberpunk .ssh-terminal-form .p-inputtext,
        .ssh-terminal-form .p-inputtext {
          box-shadow: none !important;
          outline: none !important;
        }
        body.layout-cyberpunk .ssh-terminal-form .p-inputtext:enabled:focus,
        body.layout-cyberpunk .ssh-terminal-form .p-inputtext:enabled:focus-visible,
        body.layout-cyberpunk .ssh-terminal-form .p-inputtext.p-focus,
        .ssh-terminal-form .p-inputtext:enabled:focus,
        .ssh-terminal-form .p-inputtext:enabled:focus-visible,
        .ssh-terminal-form .p-inputtext.p-focus {
          box-shadow: none !important;
          outline: none !important;
        }
        /* En los inputs sin icono (nombre/descripcion), reforzar feedback visual de foco */
        .ssh-terminal-form .terminal-row .terminal-input-wrap:focus-within {
          border-color: var(--ui-button-primary) !important;
          box-shadow: 0 0 12px color-mix(in srgb, var(--ui-button-primary) 16%, transparent) !important;
        }
        .terminal-icon-left {
          font-size: 0.9rem;
          margin-right: 0.5rem;
          opacity: 0.5;
        }
        .terminal-icon-right {
          font-size: 0.9rem;
          margin-left: 0.5rem;
          opacity: 0.5;
        }
        .terminal-auth-selector {
          display: flex;
          gap: 1px;
          background: color-mix(in srgb, var(--ui-dialog-text) 5%, transparent);
          border: 1px solid var(--ui-dialog-border);
          border-radius: 4px;
          padding: 1px;
        }
        .terminal-auth-chip {
          flex: 1;
          text-align: center;
          padding: 0.5rem;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          color: color-mix(in srgb, var(--ui-dialog-text) 40%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .terminal-auth-chip i { font-size: 0.8rem; }
        .terminal-auth-chip.active {
          background: var(--ui-sidebar-button-bg) !important;
          color: var(--ui-button-primary) !important;
          border: 1px solid color-mix(in srgb, var(--ui-button-primary) 30%, transparent) !important;
          border-radius: 4px;
        }
        .terminal-auth-chip.disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .terminal-key-file-wrap {
          gap: 0.5rem;
          min-height: 2.25rem;
        }
        .terminal-key-file-name {
          flex: 1;
          min-width: 0;
          font-size: 0.75rem;
        }
        .terminal-key-file-input {
          display: none;
        }
        .terminal-key-file-btn {
          background: transparent;
          border: 1px solid color-mix(in srgb, var(--ui-button-primary) 30%, transparent);
          color: var(--ui-button-primary);
          padding: 0.2rem 0.6rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }
        .terminal-key-file-btn:hover {
          background: var(--ui-sidebar-button-bg);
        }
        .terminal-advanced-section {
          width: 100%;
        }
        .terminal-advanced-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.25rem 0;
          background: transparent;
          border: none;
          cursor: pointer;
          color: inherit;
          text-align: left;
        }
        .terminal-advanced-header:hover .terminal-label {
          color: var(--ui-button-primary);
        }
        .terminal-advanced-section .terminal-options-list {
          padding-top: 0.35rem;
        }
        .terminal-folder-dropdown-wrap {
          padding: 0 0.5rem;
          min-height: 2.25rem;
          gap: 0;
        }
        .ssh-terminal-form .terminal-folder-dropdown-wrap .terminal-icon-left {
          flex-shrink: 0;
          align-self: center;
          margin-right: 0.5rem;
          opacity: 0.5;
          color: inherit;
          line-height: 1;
        }
        .ssh-terminal-form .terminal-folder-dropdown.p-dropdown {
          width: 100%;
          min-width: 0;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          font-family: inherit;
        }
        .ssh-terminal-form .terminal-folder-dropdown.p-dropdown.p-focus,
        .ssh-terminal-form .terminal-folder-dropdown.p-dropdown:not(.p-disabled):hover,
        body.layout-cyberpunk .ssh-terminal-form .terminal-folder-dropdown.p-dropdown:not(.p-disabled).p-focus {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
        .ssh-terminal-form .terminal-folder-dropdown .p-dropdown-label {
          color: var(--ui-dialog-text) !important;
          font-size: 0.85rem !important;
          padding: 0.5rem 0.25rem !important;
        }
        .ssh-terminal-form .terminal-folder-dropdown .p-dropdown-label.p-placeholder {
          color: color-mix(in srgb, var(--ui-dialog-text) 40%, transparent) !important;
        }
        .ssh-terminal-form .terminal-folder-dropdown .p-dropdown-trigger {
          color: color-mix(in srgb, var(--ui-dialog-text) 50%, transparent);
          width: 2rem;
        }
        .ssh-terminal-form .terminal-folder-dropdown .p-dropdown-clear-icon {
          color: color-mix(in srgb, var(--ui-dialog-text) 45%, transparent) !important;
          right: 2rem;
        }
        .ssh-terminal-form .terminal-folder-dropdown .p-dropdown-clear-icon:hover {
          color: var(--ui-button-primary) !important;
        }
        .terminal-folder-dropdown-panel.p-dropdown-panel {
          background: var(--ui-dialog-bg) !important;
          border: 1px solid color-mix(in srgb, var(--ui-button-primary) 28%, transparent) !important;
          border-radius: 4px !important;
          box-shadow: 0 12px 32px var(--ui-dialog-shadow) !important;
          font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
          color: var(--ui-dialog-text) !important;
        }
        .terminal-folder-dropdown-panel .p-dropdown-header {
          background: transparent !important;
          border-bottom: 1px solid var(--ui-dialog-border) !important;
          padding: 0.5rem !important;
        }
        .terminal-folder-dropdown-panel .p-dropdown-filter-container .p-dropdown-filter {
          background: color-mix(in srgb, var(--ui-dialog-text) 3%, transparent) !important;
          border: 1px solid var(--ui-dialog-border) !important;
          color: var(--ui-dialog-text) !important;
          border-radius: 4px !important;
          font-family: inherit !important;
          font-size: 0.8rem !important;
          padding: 0.45rem 0.5rem 0.45rem 2rem !important;
          box-shadow: none !important;
        }
        .terminal-folder-dropdown-panel .p-dropdown-filter-container .p-dropdown-filter:enabled:focus {
          border-color: var(--ui-button-primary) !important;
          box-shadow: 0 0 10px color-mix(in srgb, var(--ui-button-primary) 12%, transparent) !important;
          outline: none !important;
        }
        .terminal-folder-dropdown-panel .p-dropdown-filter-icon {
          color: color-mix(in srgb, var(--ui-button-primary) 70%, transparent) !important;
          left: 0.65rem !important;
        }
        .terminal-folder-dropdown-panel .p-dropdown-items {
          padding: 0.35rem !important;
        }
        .terminal-folder-dropdown-panel .p-dropdown-item {
          color: color-mix(in srgb, var(--ui-dialog-text) 85%, transparent) !important;
          background: transparent !important;
          border-radius: 4px !important;
          font-size: 0.8rem !important;
          padding: 0.45rem 0.6rem !important;
          margin: 0.1rem 0 !important;
        }
        .terminal-folder-dropdown-panel .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover {
          background: color-mix(in srgb, var(--ui-button-primary) 8%, transparent) !important;
          color: var(--ui-dialog-text) !important;
        }
        .terminal-folder-dropdown-panel .p-dropdown-item.p-highlight {
          background: color-mix(in srgb, var(--ui-button-primary) 16%, transparent) !important;
          color: var(--ui-button-primary) !important;
        }
        .terminal-folder-dropdown-panel .p-dropdown-empty-message {
          color: color-mix(in srgb, var(--ui-dialog-text) 45%, transparent) !important;
          font-size: 0.8rem !important;
          padding: 0.5rem 0.6rem !important;
        }
        .terminal-option-item {
          display: flex;
          align-items: center;
          padding: 0.4rem 0;
          font-size: 0.75rem;
        }
        .terminal-option-icon {
          margin-right: 0.75rem;
          color: var(--ui-button-primary);
          opacity: 0.8;
          font-size: 0.9rem;
        }
        .terminal-dotted-spacer {
          flex: 1;
          border-bottom: 1px dotted var(--ui-dialog-border);
          margin: 0 0.75rem;
          align-self: flex-end;
          height: 10px;
        }
        .terminal-switch .p-inputswitch-slider {
          background: color-mix(in srgb, var(--ui-dialog-text) 10%, transparent) !important;
          transform: scale(0.7);
        }
        .terminal-switch.p-inputswitch-checked .p-inputswitch-slider {
          background: var(--ui-button-primary) !important;
        }
        .terminal-footer {
          display: flex;
          justify-content: space-between;
          padding-top: 1rem;
          border-top: 1px solid var(--ui-dialog-border);
        }
        .terminal-btn-primary {
          background: var(--ui-button-primary) !important;
          color: var(--ui-button-primary-text);
          border: none;
          padding: 0.6rem 1.5rem;
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .terminal-btn-outline {
          background: transparent;
          border: 1px solid color-mix(in srgb, var(--ui-button-primary) 30%, transparent);
          color: var(--ui-button-primary);
          padding: 0.6rem 1rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          font-family: inherit;
        }
        .terminal-btn-outline:hover:not(:disabled) {
          background: color-mix(in srgb, var(--ui-button-primary) 8%, transparent);
        }
        .terminal-btn-outline:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .terminal-btn-submit {
          padding: 0.6rem 1.5rem;
          font-size: 0.8rem;
        }
        .terminal-btn-text {
          background: transparent;
          border: none;
          color: color-mix(in srgb, var(--ui-dialog-text) 50%, transparent);
          padding: 0.6rem 1rem;
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .terminal-btn-text:hover { color: var(--ui-dialog-text); }

        /* Estilos del Header Terminal */
        .terminal-header-compact {
          background: var(--ui-dialog-bg);
          padding: 0.75rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--ui-dialog-border);
          position: relative;
        }
        .terminal-header-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--ui-dialog-text);
          letter-spacing: 0.1em;
        }
        .terminal-header-icon-mini {
          width: 24px;
          height: 24px;
          background: var(--ui-sidebar-button-bg);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ui-button-primary);
          font-size: 0.8rem;
        }
        .terminal-header-icon-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .terminal-header-icon-btn:hover {
          transform: scale(1.1);
        }
        .terminal-header-accent {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 40px;
          height: 2px;
          background: var(--ui-button-primary);
          box-shadow: 0 0 8px var(--ui-button-primary);
        }
        .terminal-pro-dialog .p-dialog-header {
          padding: 0 !important;
          background: var(--ui-dialog-bg) !important;
          border: none !important;
        }
        .terminal-pro-dialog .p-dialog-content {
          background: var(--ui-dialog-bg) !important;
          border: none !important;
          flex: 1 1 auto;
          min-height: 0;
        }
        .terminal-pro-dialog.p-dialog {
          display: flex;
          flex-direction: column;
        }
        .terminal-pro-dialog .p-resizable-handle {
          background: transparent !important;
          z-index: 1000 !important;
        }
        .terminal-pro-dialog .p-resizable-handle:hover {
          background: rgba(33, 150, 243, 0.2) !important;
        }
        .terminal-pro-dialog .p-resizable-handle-e {
          width: 12px !important;
          right: -2px !important;
          cursor: ew-resize !important;
        }
        .terminal-pro-dialog .p-resizable-handle-se {
          width: 20px !important;
          height: 20px !important;
          right: -2px !important;
          bottom: -2px !important;
          cursor: nwse-resize !important;
        }
      `}} />
    </div>
  );
}

// --- NewSSHConnectionDialog: Diálogo simple solo para SSH ---
export function NewSSHConnectionDialog({
  visible,
  onHide,
  onGoBack,
  sshName, setSSHName,
  sshHost, setSSHHost,
  sshUser, setSSHUser,
  sshPassword, setSSHPassword,
  sshPort, setSSHPort,
  sshRemoteFolder, setSSHRemoteFolder,
  sshTargetFolder, setSSHTargetFolder,
  sshAuthMethod = 'password', setSSHAuthMethod = () => {},
  sshPrivateKey = '', setSSHPrivateKey = () => {},
  sshAutoCopyPassword = false, setSSHAutoCopyPassword = () => {},
  sshDescription = '', setSSHDescription = () => {},
  foldersOptions = [],
  onSSHConfirm,
  sshLoading = false
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  
  const headerTemplate = (
    <div className="terminal-header-compact">
      <div className="flex align-items-center gap-2">
        <div className="terminal-header-icon-mini">
          <i className="pi pi-terminal"></i>
        </div>
        <span className="terminal-header-title">{t('ssh.title.new').toUpperCase()}</span>
      </div>
      <div className="terminal-header-accent"></div>
    </div>
  );

  return (
    <Dialog
      header={headerTemplate}
      visible={visible}
      style={{
        width: '600px',
        maxWidth: '95vw',
        minWidth: '420px',
        height: 'auto',
        maxHeight: '90vh',
        minHeight: '480px'
      }}
      modal
      resizable
      onHide={onHide}
      contentStyle={{
        padding: '0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        minHeight: '0',
        background: 'var(--ui-dialog-bg)'
      }}
      className="terminal-pro-dialog"
      closable={false}
    >
      <div style={{ marginTop: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <EnhancedSSHForm
          activeTabIndex={0}
          sshName={sshName}
          setSSHName={setSSHName}
          sshHost={sshHost}
          setSSHHost={setSSHHost}
          sshUser={sshUser}
          setSSHUser={setSSHUser}
          sshPassword={sshPassword}
          setSSHPassword={setSSHPassword}
          sshPort={sshPort}
          setSSHPort={setSSHPort}
          sshRemoteFolder={sshRemoteFolder}
          setSSHRemoteFolder={setSSHRemoteFolder}
          sshTargetFolder={sshTargetFolder}
          setSSHTargetFolder={setSSHTargetFolder}
          sshAuthMethod={sshAuthMethod}
          setSSHAuthMethod={setSSHAuthMethod}
          sshPrivateKey={sshPrivateKey}
          setSSHPrivateKey={setSSHPrivateKey}
          sshAutoCopyPassword={sshAutoCopyPassword}
          setSSHAutoCopyPassword={setSSHAutoCopyPassword}
          sshDescription={sshDescription}
          setSSHDescription={setSSHDescription}
          foldersOptions={foldersOptions}
          onSSHConfirm={onSSHConfirm}
          onHide={onHide}
          onGoBack={onGoBack}
          sshLoading={sshLoading}
        />
      </div>
    </Dialog>
  );
}

// --- NewRDPConnectionDialog: Diálogo simple solo para RDP ---
export function NewRDPConnectionDialog({
  visible,
  onHide,
  onGoBack,
  onSaveToSidebar
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  const [formData, setFormData] = useState({
    name: '',
    server: '',
    username: '',
    password: '',
    port: 3389,
    clientType: 'guacamole',
    preset: 'default',
    resolution: '1600x1000',
    colorDepth: 32,
    redirectFolders: true,
    redirectClipboard: true,
    redirectPrinters: false,
    redirectAudio: false, // Desactivar audio por defecto
    fullscreen: false,
    smartSizing: true,
    span: false,
    admin: false,
    public: false,
    // Campos específicos para Guacamole
    autoResize: true,
    guacDpi: 96,
    guacSecurity: 'any',
    guacEnableWallpaper: true, // Activar mostrar fondo por defecto
    guacEnableDrive: false,
    guacDriveHostDir: '',
    guacEnableGfx: false,
    // Opciones avanzadas
    guacEnableDesktopComposition: false,
    guacEnableFontSmoothing: false,
    guacEnableTheming: false,
    guacEnableFullWindowDrag: false,
    guacEnableMenuAnimations: false,
    // Flags de prueba
    guacDisableGlyphCaching: false,
    guacDisableOffscreenCaching: false,
    guacDisableBitmapCaching: false,
    guacDisableCopyRect: false
  });

  // Handlers para RDP
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleCheckboxChange = (field) => (e) => {
    // PrimeReact Checkbox pasa el estado en e.checked (boolean)
    const newValue = !!e.checked; // Asegurar que sea boolean
    console.log(`[NewRDP] Checkbox ${field} cambiado:`, { 
      checked: e.checked, 
      newValue,
      currentState: formData[field]
    });
    
    setFormData(prev => {
      const updated = { ...prev, [field]: newValue };
      console.log(`[NewRDP] Estado actualizado:`, { field, oldValue: prev[field], newValue: updated[field] });
      return updated;
    });
  };

  // Función para abrir el selector de carpeta
  const handleSelectFolder = async () => {
    try {
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: t('rdp.tooltips.selectFolder')
      });
      
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        setFormData(prev => ({ ...prev, guacDriveHostDir: result.filePaths[0] }));
      }
    } catch (error) {
      console.error('Error al abrir selector de carpeta:', error);
    }
  };

  const [showRdpPassword, setShowRdpPassword] = useState(false);

  // Resetear formulario al cerrar
  useEffect(() => {
    if (!visible) {
      setFormData({
        name: '',
        server: '',
        username: '',
        password: '',
        port: 3389,
        clientType: 'guacamole',
        preset: 'default',
        resolution: '1600x1000',
        colorDepth: 32,
        redirectFolders: true,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: false,
        fullscreen: false,
        smartSizing: true,
        span: false,
        admin: false,
        public: false,
        autoResize: true,
        guacDpi: 96,
        guacSecurity: 'any',
        guacEnableWallpaper: true,
        guacEnableDrive: false,
        guacDriveHostDir: '',
        guacEnableGfx: false,
        guacEnableDesktopComposition: false,
        guacEnableFontSmoothing: false,
        guacEnableTheming: false,
        guacEnableFullWindowDrag: false,
        guacEnableMenuAnimations: false,
        guacDisableGlyphCaching: false,
        guacDisableOffscreenCaching: false,
        guacDisableBitmapCaching: false,
        guacDisableCopyRect: false
      });
      setShowRdpPassword(false);
    }
  }, [visible]);

  const isFormValid = useMemo(() => {
    return formData.name.trim() !== '' && formData.server.trim() !== '' && formData.username.trim() !== '';
  }, [formData]);

  const headerTemplate = (
    <div className="terminal-header-compact">
      <div className="flex align-items-center gap-2">
        <div className="terminal-header-icon-mini" style={{ background: 'rgba(33, 150, 243, 0.1)', color: '#2196F3' }}>
          <i className="pi pi-desktop"></i>
        </div>
        <span className="terminal-header-title">{t('rdp.title.new').toUpperCase()}</span>
      </div>
      <div className="terminal-header-accent" style={{ background: '#2196F3', boxShadow: '0 0 8px #2196F3' }}></div>
    </div>
  );

  return (
    <Dialog
      header={headerTemplate}
      visible={visible}
      onHide={onHide}
      style={{ width: '100%', maxWidth: '800px' }}
      modal
      resizable={false}
      contentStyle={{ padding: '0', overflow: 'auto', background: 'var(--ui-dialog-bg)' }}
      className="terminal-pro-dialog"
      closable={false}
    >
      <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* --- COLUMNA IZQUIERDA: Conexión --- */}
            <div style={{ flex: '1', minWidth: '320px' }}>
              <Card title={`🔗 ${t('rdp.sections.connection')}`} className="mb-2">
                <div className="formgrid grid">
                  <div className="field col-12">
                    <label htmlFor="name-create-rdp">{t('rdp.fields.name')} *</label>
                    <InputText
                      id="name-create-rdp"
                      value={formData.name}
                      onChange={handleTextChange('name')}
                      placeholder={t('rdp.placeholders.name')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-8">
                    <label htmlFor="server-create-rdp">{t('rdp.fields.server')} *</label>
                    <InputText
                      id="server-create-rdp"
                      value={formData.server}
                      onChange={handleTextChange('server')}
                      placeholder={t('rdp.placeholders.server')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-4">
                    <label htmlFor="port-create-rdp">{t('rdp.fields.port')}</label>
                    <InputText
                      id="port-create-rdp"
                      type="number"
                      value={formData.port}
                      onChange={handleTextChange('port')}
                      placeholder={t('rdp.placeholders.port')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="username-create-rdp">{t('rdp.fields.username')} *</label>
                    <InputText
                      id="username-create-rdp"
                      value={formData.username}
                      onChange={handleTextChange('username')}
                      placeholder={t('rdp.placeholders.username')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="password-create-rdp">{t('rdp.fields.password')}</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="password-create-rdp"
                        type={showRdpPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleTextChange('password')}
                        placeholder={t('rdp.placeholders.password')}
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        icon={showRdpPassword ? "pi pi-eye-slash" : "pi pi-eye"}
                        className="p-button-outlined"
                        onClick={() => setShowRdpPassword(!showRdpPassword)}
                        tooltip={showRdpPassword ? t('rdp.tooltips.hidePassword') : t('rdp.tooltips.showPassword')}
                        tooltipOptions={{ position: 'top' }}
                      />
                    </div>
                  </div>
                  <div className="field col-12">
                    <label htmlFor="clientType-create-rdp">💻 {t('rdp.fields.client')}</label>
                    <Dropdown
                      id="clientType-create-rdp"
                      value={formData.clientType}
                      options={[
                        { label: t('rdp.clientTypes.mstsc'), value: 'mstsc' },
                        { label: t('rdp.clientTypes.guacamole'), value: 'guacamole' }
                      ]}
                      onChange={(e) => handleInputChange('clientType', e.value)}
                      placeholder={tCommon('labels.select')}
                    />
                  </div>
                  {formData.clientType === 'guacamole' && (
                    <div className="field col-12">
                      <label htmlFor="guacSecurity-create-rdp">🔒 {t('rdp.fields.security')}</label>
                      <Dropdown
                        id="guacSecurity-create-rdp"
                        value={formData.guacSecurity}
                        options={[
                          { label: `🛡️ ${t('rdp.securityOptions.any')}`, value: 'any' },
                          { label: `🔐 ${t('rdp.securityOptions.rdp')}`, value: 'rdp' },
                          { label: `🔒 ${t('rdp.securityOptions.tls')}`, value: 'tls' },
                          { label: `🛡️ ${t('rdp.securityOptions.nla')}`, value: 'nla' }
                        ]}
                        onChange={(e) => handleInputChange('guacSecurity', e.value)}
                        placeholder={tCommon('labels.select')}
                      />
                      <small>{t('rdp.descriptions.security')}</small>
                    </div>
                  )}
                </div>
              </Card>

              {formData.clientType === 'guacamole' && formData.guacEnableDrive && (
                <Card title={`📁 ${t('rdp.fields.sharedFolder')}`} className="mt-3">
                  <div className="field">
                    <label htmlFor="guacDriveHostDir-create-rdp">{t('rdp.fields.localPath')}</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="guacDriveHostDir-create-rdp"
                        value={formData.guacDriveHostDir}
                        onChange={handleTextChange('guacDriveHostDir')}
                        placeholder={t('rdp.placeholders.localPath')}
                      />
                      <Button icon="pi pi-folder-open" className="p-button-secondary p-button-outlined" onClick={handleSelectFolder} tooltip={t('rdp.tooltips.selectFolder')} />
                    </div>
                    <small className="p-d-block mt-2 text-color-secondary">
                      {t('rdp.descriptions.sharedFolder')}
                    </small>
                  </div>
                </Card>
              )}
            </div>

            {/* --- COLUMNA DERECHA: Ajustes de Sesión --- */}
            <div style={{ flex: '1.5', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Card: Pantalla */}
              <Card title={`🖥️ ${t('rdp.sections.screen')}`}>
                <div className="formgrid grid">
                  <div className="field col-6">
                    <label htmlFor="preset-create-rdp">{t('rdp.fields.preset')}</label>
                    <Dropdown
                      id="preset-create-rdp"
                      value={formData.preset}
                      options={[
                        { label: t('rdp.presets.default'), value: 'default' },
                        { label: t('rdp.presets.performance'), value: 'performance' },
                        { label: t('rdp.presets.quality'), value: 'quality' }
                      ]}
                      onChange={(e) => handleInputChange('preset', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="resolution-create-rdp">{t('rdp.fields.resolution')}</label>
                    <Dropdown
                      id="resolution-create-rdp"
                      value={formData.resolution}
                      options={[
                        { label: t('rdp.resolutions.fullscreen'), value: 'fullscreen' },
                        { label: '1920x1080', value: '1920x1080' },
                        { label: '1600x1000', value: '1600x1000' },
                        { label: '1366x768', value: '1366x768' },
                        { label: '1024x768', value: '1024x768' }
                      ]}
                      onChange={(e) => handleInputChange('resolution', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="colorDepth-create-rdp">{t('rdp.fields.color')}</label>
                    <Dropdown
                      id="colorDepth-create-rdp"
                      value={formData.colorDepth}
                      options={[
                        { label: t('rdp.colorDepths.32'), value: 32 },
                        { label: t('rdp.colorDepths.24'), value: 24 },
                        { label: t('rdp.colorDepths.16'), value: 16 },
                        { label: t('rdp.colorDepths.15'), value: 15 }
                      ]}
                      onChange={(e) => handleInputChange('colorDepth', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="guacDpi-create-rdp">{t('rdp.fields.dpi')}</label>
                    <InputText
                      id="guacDpi-create-rdp"
                      value={formData.guacDpi}
                      onChange={handleTextChange('guacDpi')}
                      placeholder={t('rdp.placeholders.dpi')}
                    />
                  </div>
                </div>
              </Card>

              {/* Card: Opciones */}
              <Card title={`⚙️ ${t('rdp.sections.options')}`}>
                <div className="formgrid grid">
                  {/* Opciones para MSTSC */}
                  {formData.clientType === 'mstsc' && (
                    <>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectClipboard-create-rdp" checked={formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} /><label htmlFor="mstsc-redirectClipboard-create-rdp">📋 {t('rdp.options.clipboard')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectAudio-create-rdp" checked={formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} /><label htmlFor="mstsc-redirectAudio-create-rdp">🔊 {t('rdp.options.audio')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectPrinters-create-rdp" checked={formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} /><label htmlFor="mstsc-redirectPrinters-create-rdp">🖨️ {t('rdp.options.printers')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectFolders-create-rdp" checked={formData.redirectFolders} onChange={handleCheckboxChange('redirectFolders')} /><label htmlFor="mstsc-redirectFolders-create-rdp">📁 {t('rdp.options.folders')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-smartSizing-create-rdp" checked={formData.smartSizing} onChange={handleCheckboxChange('smartSizing')} /><label htmlFor="mstsc-smartSizing-create-rdp">📐 {t('rdp.options.smartSizing')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-fullscreen-create-rdp" checked={formData.fullscreen} onChange={handleCheckboxChange('fullscreen')} /><label htmlFor="mstsc-fullscreen-create-rdp">🖥️ {t('rdp.options.fullscreen')}</label></div>
                    </>
                  )}
                  {/* Opciones para Guacamole */}
                  {formData.clientType === 'guacamole' && (
                    <>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectClipboard-create-rdp" checked={!!formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} key={`clipboard-create-${formData.redirectClipboard}`} /><label htmlFor="guac-redirectClipboard-create-rdp">📋 {t('rdp.options.clipboard')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectAudio-create-rdp" checked={!!formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} key={`audio-create-${formData.redirectAudio}`} /><label htmlFor="guac-redirectAudio-create-rdp">🔊 {t('rdp.options.audio')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-enableDrive-create-rdp" checked={!!formData.guacEnableDrive} onChange={handleCheckboxChange('guacEnableDrive')} key={`drive-create-${formData.guacEnableDrive}`} /><label htmlFor="guac-enableDrive-create-rdp">💾 {t('rdp.options.enableDrive')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-autoResize-create-rdp" checked={!!formData.autoResize} onChange={handleCheckboxChange('autoResize')} key={`resize-create-${formData.autoResize}`} /><label htmlFor="guac-autoResize-create-rdp">📐 {t('rdp.options.autoResize')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-enableWallpaper-create-rdp" checked={!!formData.guacEnableWallpaper} onChange={handleCheckboxChange('guacEnableWallpaper')} key={`wallpaper-create-${formData.guacEnableWallpaper}`} /><label htmlFor="guac-enableWallpaper-create-rdp">🖼️ {t('rdp.options.enableWallpaper')}</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectPrinters-create-rdp" checked={!!formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} key={`printers-create-${formData.redirectPrinters}`} /><label htmlFor="guac-redirectPrinters-create-rdp">🖨️ {t('rdp.options.printers')}</label></div>
                    </>
                  )}
                </div>

                {/* Fieldset: Opciones Avanzadas */}
                {formData.clientType === 'guacamole' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                    <Fieldset legend={`⚙️ ${t('rdp.sections.advanced')}`} toggleable collapsed className="advanced-fieldset">
                      <div className="formgrid grid">
                        <div className="col-4">
                          <h5>{t('rdp.advanced.performance')}</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-gfx-create-rdp" checked={!!formData.guacEnableGfx} onChange={handleCheckboxChange('guacEnableGfx')} key={`gfx-create-${formData.guacEnableGfx}`} /><label htmlFor="guac-gfx-create-rdp">🎨 Habilitar GFX</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-composition-create-rdp" checked={!!formData.guacEnableDesktopComposition} onChange={handleCheckboxChange('guacEnableDesktopComposition')} key={`composition-create-${formData.guacEnableDesktopComposition}`} /><label htmlFor="guac-composition-create-rdp">🖼️ Desktop Composition</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-font-create-rdp" checked={!!formData.guacEnableFontSmoothing} onChange={handleCheckboxChange('guacEnableFontSmoothing')} key={`font-create-${formData.guacEnableFontSmoothing}`} /><label htmlFor="guac-font-create-rdp">✨ Font Smoothing</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-theming-create-rdp" checked={!!formData.guacEnableTheming} onChange={handleCheckboxChange('guacEnableTheming')} key={`theming-create-${formData.guacEnableTheming}`} /><label htmlFor="guac-theming-create-rdp">🎭 Theming</label></div>
                        </div>
                        <div className="col-4">
                          <h5>{t('rdp.advanced.interface')}</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-drag-create-rdp" checked={!!formData.guacEnableFullWindowDrag} onChange={handleCheckboxChange('guacEnableFullWindowDrag')} key={`drag-create-${formData.guacEnableFullWindowDrag}`} /><label htmlFor="guac-drag-create-rdp">🖱️ {t('rdp.advanced.fullWindowDrag')}</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-menu-create-rdp" checked={!!formData.guacEnableMenuAnimations} onChange={handleCheckboxChange('guacEnableMenuAnimations')} key={`menu-create-${formData.guacEnableMenuAnimations}`} /><label htmlFor="guac-menu-create-rdp">🎬 {t('rdp.advanced.menuAnimations')}</label></div>
                        </div>
                        <div className="col-4">
                          <h5>{t('rdp.advanced.cache')}</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-glyph-cache-create-rdp" checked={!!(!formData.guacDisableGlyphCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableGlyphCaching', !newValue); }} key={`glyph-create-${!formData.guacDisableGlyphCaching}`} /><label htmlFor="guac-glyph-cache-create-rdp">🔤 Glyph Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-offscreen-cache-create-rdp" checked={!!(!formData.guacDisableOffscreenCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableOffscreenCaching', !newValue); }} key={`offscreen-create-${!formData.guacDisableOffscreenCaching}`} /><label htmlFor="guac-offscreen-cache-create-rdp">📱 Offscreen Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-bitmap-cache-create-rdp" checked={!!(!formData.guacDisableBitmapCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableBitmapCaching', !newValue); }} key={`bitmap-create-${!formData.guacDisableBitmapCaching}`} /><label htmlFor="guac-bitmap-cache-create-rdp">🖼️ Bitmap Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-copy-rect-create-rdp" checked={!!(!formData.guacDisableCopyRect)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableCopyRect', !newValue); }} key={`copyrect-create-${!formData.guacDisableCopyRect}`} /><label htmlFor="guac-copy-rect-create-rdp">📋 Copy-Rect</label></div>
                        </div>
                      </div>
                    </Fieldset>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
        {/* Botones */}
        <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 0, justifyContent: 'space-between', paddingTop: '12px' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {onGoBack && (
              <Button
                label={t('common.back')}
                icon="pi pi-arrow-left"
                className="p-button-text"
                onClick={onGoBack}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              label={tCommon('buttons.cancel')}
              icon="pi pi-times"
              className="p-button-text"
              onClick={onHide}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            />
            <Button
              label={tCommon('buttons.save')}
              icon="pi pi-check"
              className="p-button-primary"
              onClick={() => {
                console.log('Crear conexión RDP con datos:', formData);
                onSaveToSidebar && onSaveToSidebar(formData, false, null);
                onHide();
              }}
              disabled={!isFormValid}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// Código residual eliminado - las funciones NewRDPConnectionDialog duplicadas fueron removidas

// Código residual del UnifiedConnectionDialog eliminado completamente

// --- NewVNCConnectionDialog: Diálogo simple para VNC ---
export function NewVNCConnectionDialog({
  visible,
  onHide,
  onGoBack,
  onSaveToSidebar
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  const [formData, setFormData] = useState({
    name: '',
    server: '',
    password: '',
    port: 5900,
    resolution: '1600x1000',
    colorDepth: 32,
    readOnly: false,
    enableCompression: true,
    imageQuality: 'lossless',
    autoReconnect: true,
    autoResize: true,
    redirectClipboard: true,
    guacDpi: 96
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleCheckboxChange = (field) => (e) => {
    const newValue = !!e.checked;
    setFormData(prev => ({ ...prev, [field]: newValue }));
  };

  const [showVncPassword, setShowVncPassword] = useState(false);

  // Resetear formulario al cerrar
  useEffect(() => {
    if (!visible) {
      setFormData({
        name: '',
        server: '',
        password: '',
        port: 5900,
        resolution: '1600x1000',
        colorDepth: 32,
        readOnly: false,
        enableCompression: true,
        imageQuality: 'lossless',
        autoReconnect: true,
        autoResize: true,
        redirectClipboard: true,
        guacDpi: 96
      });
      setShowVncPassword(false);
    }
  }, [visible]);

  const isFormValid = useMemo(() => {
    return formData.name.trim() !== '' && formData.server.trim() !== '';
  }, [formData]);

  const headerTemplate = (
    <div className="terminal-header-compact">
      <div className="flex align-items-center gap-2">
        <div className="terminal-header-icon-mini" style={{ background: 'rgba(255, 179, 0, 0.1)', color: '#ffb300' }}>
          <i className="pi pi-globe"></i>
        </div>
        <span className="terminal-header-title">{t('vnc.title.new').toUpperCase()}</span>
      </div>
      <div className="terminal-header-accent" style={{ background: '#ffb300', boxShadow: '0 0 8px #ffb300' }}></div>
    </div>
  );

  return (
    <Dialog
      header={headerTemplate}
      visible={visible}
      onHide={onHide}
      style={{ width: '100%', maxWidth: '800px' }}
      modal
      resizable={false}
      contentStyle={{ padding: '0', overflow: 'auto', background: 'var(--ui-dialog-bg)' }}
      className="terminal-pro-dialog"
      closable={false}
    >
      <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* --- COLUMNA IZQUIERDA: Conexión --- */}
            <div style={{ flex: '1', minWidth: '320px' }}>
              <Card title={`🔗 ${t('vnc.sections.connection')}`} className="mb-2">
                <div className="formgrid grid">
                  <div className="field col-12">
                    <label htmlFor="name-create-vnc">{t('vnc.fields.name')} *</label>
                    <InputText
                      id="name-create-vnc"
                      value={formData.name}
                      onChange={handleTextChange('name')}
                      placeholder={t('vnc.placeholders.name')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-8">
                    <label htmlFor="server-create-vnc">{t('vnc.fields.server')} *</label>
                    <InputText
                      id="server-create-vnc"
                      value={formData.server}
                      onChange={handleTextChange('server')}
                      placeholder={t('vnc.placeholders.server')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-4">
                    <label htmlFor="port-create-vnc">{t('vnc.fields.port')}</label>
                    <InputText
                      id="port-create-vnc"
                      type="number"
                      value={formData.port}
                      onChange={handleTextChange('port')}
                      placeholder={t('vnc.placeholders.port')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="password-create-vnc">{t('vnc.fields.password')}</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="password-create-vnc"
                        type={showVncPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleTextChange('password')}
                        placeholder={t('vnc.placeholders.password')}
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        icon={showVncPassword ? "pi pi-eye-slash" : "pi pi-eye"}
                        className="p-button-outlined"
                        onClick={() => setShowVncPassword(!showVncPassword)}
                        tooltip={showVncPassword ? t('vnc.tooltips.hidePassword') : t('vnc.tooltips.showPassword')}
                        tooltipOptions={{ position: 'top' }}
                      />
                    </div>
                    <small className="p-d-block mt-2 text-color-secondary">
                      {t('vnc.descriptions.password')}
                    </small>
                  </div>
                </div>
              </Card>
            </div>

            {/* --- COLUMNA DERECHA: Ajustes de Sesión --- */}
            <div style={{ flex: '1.5', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Card: Pantalla */}
              <Card title={`🖥️ ${t('vnc.sections.screen')}`}>
                <div className="formgrid grid">
                  <div className="field col-6">
                    <label htmlFor="resolution-create-vnc">{t('vnc.fields.resolution')}</label>
                    <Dropdown
                      id="resolution-create-vnc"
                      value={formData.resolution}
                      options={[
                        { label: t('rdp.resolutions.fullscreen'), value: 'fullscreen' },
                        { label: '1920x1080', value: '1920x1080' },
                        { label: '1600x1000', value: '1600x1000' },
                        { label: '1366x768', value: '1366x768' },
                        { label: '1024x768', value: '1024x768' }
                      ]}
                      onChange={(e) => handleInputChange('resolution', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="colorDepth-create-vnc">{t('vnc.fields.colorDepth')}</label>
                    <Dropdown
                      id="colorDepth-create-vnc"
                      value={formData.colorDepth}
                      options={[
                        { label: t('vnc.colorDepths.32'), value: 32 },
                        { label: t('vnc.colorDepths.24'), value: 24 },
                        { label: t('vnc.colorDepths.16'), value: 16 },
                        { label: t('vnc.colorDepths.8'), value: 8 }
                      ]}
                      onChange={(e) => handleInputChange('colorDepth', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="guacDpi-create-vnc">{t('vnc.fields.dpi')}</label>
                    <InputText
                      id="guacDpi-create-vnc"
                      type="number"
                      value={formData.guacDpi}
                      onChange={handleTextChange('guacDpi')}
                      placeholder={t('vnc.placeholders.dpi')}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="imageQuality-create-vnc">{t('vnc.fields.imageQuality')}</label>
                    <Dropdown
                      id="imageQuality-create-vnc"
                      value={formData.imageQuality}
                      options={[
                        { label: t('vnc.imageQualities.lossless'), value: 'lossless' },
                        { label: t('vnc.imageQualities.lossyLow'), value: 'lossy-low' },
                        { label: t('vnc.imageQualities.lossyMedium'), value: 'lossy-medium' },
                        { label: t('vnc.imageQualities.lossyHigh'), value: 'lossy-high' }
                      ]}
                      onChange={(e) => handleInputChange('imageQuality', e.value)}
                    />
                  </div>
                </div>
              </Card>

              {/* Card: Opciones */}
              <Card title={`⚙️ ${t('vnc.sections.options')}`}>
                <div className="formgrid grid">
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="readOnly-create-vnc" 
                      checked={formData.readOnly} 
                      onChange={handleCheckboxChange('readOnly')} 
                    />
                    <label htmlFor="readOnly-create-vnc">👁️ {t('vnc.options.readOnly')}</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="enableCompression-create-vnc" 
                      checked={formData.enableCompression} 
                      onChange={handleCheckboxChange('enableCompression')} 
                    />
                    <label htmlFor="enableCompression-create-vnc">🗜️ {t('vnc.options.compression')}</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="autoReconnect-create-vnc" 
                      checked={formData.autoReconnect} 
                      onChange={handleCheckboxChange('autoReconnect')} 
                    />
                    <label htmlFor="autoReconnect-create-vnc">🔄 {t('vnc.options.autoReconnect')}</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="autoResize-create-vnc" 
                      checked={formData.autoResize} 
                      onChange={handleCheckboxChange('autoResize')} 
                    />
                    <label htmlFor="autoResize-create-vnc">📐 {t('vnc.options.autoResize')}</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="redirectClipboard-create-vnc" 
                      checked={formData.redirectClipboard} 
                      onChange={handleCheckboxChange('redirectClipboard')} 
                    />
                    <label htmlFor="redirectClipboard-create-vnc">📋 {t('vnc.options.clipboard')}</label>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
        {/* Botones */}
        <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 0, justifyContent: 'space-between', paddingTop: '12px' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {onGoBack && (
              <Button
                label={t('common.back')}
                icon="pi pi-arrow-left"
                className="p-button-text"
                onClick={onGoBack}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              label={tCommon('buttons.cancel')}
              icon="pi pi-times"
              className="p-button-text"
              onClick={onHide}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            />
            <Button
              label={tCommon('buttons.save')}
              icon="pi pi-check"
              className="p-button-primary"
              onClick={() => {
                console.log('Crear conexión VNC con datos:', formData);
                if (onSaveToSidebar) {
                  onSaveToSidebar(formData, false, null);
                }
                // Cerrar diálogo después de guardar
                setTimeout(() => {
                  onHide();
                }, 0);
              }}
              disabled={!isFormValid}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// --- EditVNCConnectionDialog: Diálogo independiente para editar conexiones VNC ---
export function EditVNCConnectionDialog({
  visible,
  onHide,
  editNodeData,
  onSaveToSidebar
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  const [formData, setFormData] = useState({
    name: '',
    server: '',
    password: '',
    port: 5900,
    resolution: '1600x1000',
    colorDepth: 32,
    readOnly: false,
    enableCompression: true,
    imageQuality: 'lossless',
    autoReconnect: true,
    autoResize: true,
    redirectClipboard: true,
    guacDpi: 96
  });

  const [showVncPassword, setShowVncPassword] = useState(false);

  // Precargar datos cuando se abre el diálogo
  useEffect(() => {
    if (editNodeData && visible) {
      const data = editNodeData.data || {};
      setFormData({
        name: editNodeData.label || '',
        server: data.server || data.hostname || data.host || '',
        password: data.password || '',
        port: data.port || 5900,
        resolution: data.resolution || '1600x1000',
        colorDepth: data.colorDepth || 32,
        readOnly: data.readOnly === true,
        enableCompression: data.enableCompression !== false,
        imageQuality: data.imageQuality || 'lossless',
        autoReconnect: data.autoReconnect !== false,
        autoResize: data.autoResize !== false,
        redirectClipboard: data.redirectClipboard !== false,
        guacDpi: data.guacDpi || 96
      });
    }
  }, [editNodeData, visible]);

  // Resetear formulario al cerrar
  useEffect(() => {
    if (!visible) {
      setFormData({
        name: '',
        server: '',
        password: '',
        port: 5900,
        resolution: '1600x1000',
        colorDepth: 32,
        readOnly: false,
        enableCompression: true,
        imageQuality: 'lossless',
        autoReconnect: true,
        autoResize: true,
        redirectClipboard: true,
        guacDpi: 96
      });
      setShowVncPassword(false);
    }
  }, [visible]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleCheckboxChange = (field) => (e) => {
    const newValue = !!e.checked;
    setFormData(prev => ({ ...prev, [field]: newValue }));
  };

  const isFormValid = useMemo(() => {
    return formData.name.trim() !== '' && formData.server.trim() !== '';
  }, [formData]);

  const headerTemplate = (
    <div className="terminal-header-compact">
      <div className="flex align-items-center gap-2">
        <div className="terminal-header-icon-mini" style={{ background: 'rgba(255, 179, 0, 0.1)', color: '#ffb300' }}>
          <i className="pi pi-globe"></i>
        </div>
        <span className="terminal-header-title">{t('vnc.title.edit').toUpperCase()}</span>
      </div>
      <div className="terminal-header-accent" style={{ background: '#ffb300', boxShadow: '0 0 8px #ffb300' }}></div>
    </div>
  );

  return (
    <Dialog
      header={headerTemplate}
      visible={visible}
      onHide={onHide}
      style={{ width: '100%', maxWidth: '800px' }}
      modal
      resizable={false}
      contentStyle={{ padding: '0', overflow: 'auto', background: 'var(--ui-dialog-bg)' }}
      className="terminal-pro-dialog"
      closable={false}
    >
      <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* --- COLUMNA IZQUIERDA: Conexión --- */}
            <div style={{ flex: '1', minWidth: '320px' }}>
              <Card title={`🔗 ${t('vnc.sections.connection')}`} className="mb-2">
                <div className="formgrid grid">
                  <div className="field col-12">
                    <label htmlFor="name-edit-vnc">{t('vnc.fields.name')} *</label>
                    <InputText
                      id="name-edit-vnc"
                      value={formData.name}
                      onChange={handleTextChange('name')}
                      placeholder={t('vnc.placeholders.name')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-8">
                    <label htmlFor="server-edit-vnc">{t('vnc.fields.server')} *</label>
                    <InputText
                      id="server-edit-vnc"
                      value={formData.server}
                      onChange={handleTextChange('server')}
                      placeholder={t('vnc.placeholders.server')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-4">
                    <label htmlFor="port-edit-vnc">{t('vnc.fields.port')}</label>
                    <InputText
                      id="port-edit-vnc"
                      type="number"
                      value={formData.port}
                      onChange={handleTextChange('port')}
                      placeholder={t('vnc.placeholders.port')}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="password-edit-vnc">{t('vnc.fields.password')}</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="password-edit-vnc"
                        type={showVncPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleTextChange('password')}
                        placeholder={t('vnc.placeholders.password')}
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        icon={showVncPassword ? "pi pi-eye-slash" : "pi pi-eye"}
                        className="p-button-outlined"
                        onClick={() => setShowVncPassword(!showVncPassword)}
                        tooltip={showVncPassword ? t('vnc.tooltips.hidePassword') : t('vnc.tooltips.showPassword')}
                        tooltipOptions={{ position: 'top' }}
                      />
                    </div>
                    <small className="p-d-block mt-2 text-color-secondary">
                      {t('vnc.descriptions.password')}
                    </small>
                  </div>
                </div>
              </Card>
            </div>

            {/* --- COLUMNA DERECHA: Ajustes de Sesión --- */}
            <div style={{ flex: '1.5', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Card: Pantalla */}
              <Card title={`🖥️ ${t('vnc.sections.screen')}`}>
                <div className="formgrid grid">
                  <div className="field col-6">
                    <label htmlFor="resolution-edit-vnc">{t('vnc.fields.resolution')}</label>
                    <Dropdown
                      id="resolution-edit-vnc"
                      value={formData.resolution}
                      options={[
                        { label: t('rdp.resolutions.fullscreen'), value: 'fullscreen' },
                        { label: '1920x1080', value: '1920x1080' },
                        { label: '1600x1000', value: '1600x1000' },
                        { label: '1366x768', value: '1366x768' },
                        { label: '1024x768', value: '1024x768' }
                      ]}
                      onChange={(e) => handleInputChange('resolution', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="colorDepth-edit-vnc">{t('vnc.fields.colorDepth')}</label>
                    <Dropdown
                      id="colorDepth-edit-vnc"
                      value={formData.colorDepth}
                      options={[
                        { label: t('vnc.colorDepths.32'), value: 32 },
                        { label: t('vnc.colorDepths.24'), value: 24 },
                        { label: t('vnc.colorDepths.16'), value: 16 },
                        { label: t('vnc.colorDepths.8'), value: 8 }
                      ]}
                      onChange={(e) => handleInputChange('colorDepth', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="guacDpi-edit-vnc">{t('vnc.fields.dpi')}</label>
                    <InputText
                      id="guacDpi-edit-vnc"
                      type="number"
                      value={formData.guacDpi}
                      onChange={handleTextChange('guacDpi')}
                      placeholder={t('vnc.placeholders.dpi')}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="imageQuality-edit-vnc">{t('vnc.fields.imageQuality')}</label>
                    <Dropdown
                      id="imageQuality-edit-vnc"
                      value={formData.imageQuality}
                      options={[
                        { label: t('vnc.imageQualities.lossless'), value: 'lossless' },
                        { label: t('vnc.imageQualities.lossyLow'), value: 'lossy-low' },
                        { label: t('vnc.imageQualities.lossyMedium'), value: 'lossy-medium' },
                        { label: t('vnc.imageQualities.lossyHigh'), value: 'lossy-high' }
                      ]}
                      onChange={(e) => handleInputChange('imageQuality', e.value)}
                    />
                  </div>
                </div>
              </Card>

              {/* Card: Opciones */}
              <Card title={`⚙️ ${t('vnc.sections.options')}`}>
                <div className="formgrid grid">
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="readOnly-edit-vnc" 
                      checked={formData.readOnly} 
                      onChange={handleCheckboxChange('readOnly')} 
                    />
                    <label htmlFor="readOnly-edit-vnc">👁️ {t('vnc.options.readOnly')}</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="enableCompression-edit-vnc" 
                      checked={formData.enableCompression} 
                      onChange={handleCheckboxChange('enableCompression')} 
                    />
                    <label htmlFor="enableCompression-edit-vnc">🗜️ {t('vnc.options.compression')}</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="autoReconnect-edit-vnc" 
                      checked={formData.autoReconnect} 
                      onChange={handleCheckboxChange('autoReconnect')} 
                    />
                    <label htmlFor="autoReconnect-edit-vnc">🔄 {t('vnc.options.autoReconnect')}</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="autoResize-edit-vnc" 
                      checked={formData.autoResize} 
                      onChange={handleCheckboxChange('autoResize')} 
                    />
                    <label htmlFor="autoResize-edit-vnc">📐 {t('vnc.options.autoResize')}</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="redirectClipboard-edit-vnc" 
                      checked={formData.redirectClipboard} 
                      onChange={handleCheckboxChange('redirectClipboard')} 
                    />
                    <label htmlFor="redirectClipboard-edit-vnc">📋 {t('vnc.options.clipboard')}</label>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
        {/* Botones */}
        <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 0, justifyContent: 'flex-end', paddingTop: '12px' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              label={tCommon('buttons.cancel')}
              icon="pi pi-times"
              className="p-button-text"
              onClick={onHide}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            />
            <Button
              label={tCommon('buttons.save')}
              icon="pi pi-check"
              className="p-button-primary"
              onClick={() => {
                if (onSaveToSidebar && editNodeData) {
                  onSaveToSidebar(formData, true, editNodeData);
                }
                onHide();
              }}
              disabled={!isFormValid}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// --- ProtocolSelectionDialog: diálogo de selección de protocolo con diseño de dos paneles ---
export function ProtocolSelectionDialog({
  visible,
  onHide,
  onSelectProtocol, // Callback: (protocol) => void
  initialCategory = null // Categoría inicial a seleccionar
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  
  const remoteAccessCategory = t('protocolSelection.categories.remoteAccess');
  const passwordManagementCategory = t('protocolSelection.categories.passwordManagement');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || remoteAccessCategory);

  // Resetear categoría cuando se abre el diálogo
  useEffect(() => {
    if (visible) {
      setSelectedCategory(initialCategory || remoteAccessCategory);
    }
  }, [visible, remoteAccessCategory, initialCategory]);

  const protocolSections = [
    {
      id: remoteAccessCategory,
      title: remoteAccessCategory,
      protocols: [
        {
          id: 'ssh',
          name: t('protocolSelection.protocols.ssh.name'),
          fullName: t('protocolSelection.protocols.ssh.name'),
          description: t('protocolSelection.protocols.ssh.description'),
          icon: 'pi pi-server',
          iconColor: '#2196F3',
          advantages: t('protocolSelection.protocols.ssh.advantages'),
          badges: [t('protocolSelection.badges.secure')]
        },
        {
          id: 'rdp',
          name: t('protocolSelection.protocols.rdp.name'),
          fullName: t('protocolSelection.protocols.rdp.name'),
          description: t('protocolSelection.protocols.rdp.description'),
          icon: 'pi pi-desktop',
          iconColor: '#4CAF50',
          advantages: t('protocolSelection.protocols.rdp.advantages'),
          badges: [t('protocolSelection.badges.windows')]
        },
        {
          id: 'vnc',
          name: t('protocolSelection.protocols.vnc.name'),
          fullName: t('protocolSelection.protocols.vnc.name'),
          description: t('protocolSelection.protocols.vnc.description'),
          icon: 'pi pi-eye',
          iconColor: '#FF5722',
          advantages: t('protocolSelection.protocols.vnc.advantages'),
          badges: [t('protocolSelection.badges.crossPlatform')]
        },
        {
          id: 'ssh-tunnel',
          name: t('protocolSelection.protocols.sshTunnel.name') || 'SSH Tunnel',
          fullName: t('protocolSelection.protocols.sshTunnel.fullName') || 'SSH Tunnel / Port Forwarding',
          description: t('protocolSelection.protocols.sshTunnel.description') || 'Crea túneles SSH para redirigir puertos de forma segura',
          icon: 'pi pi-share-alt',
          iconColor: '#89b4fa',
          advantages: t('protocolSelection.protocols.sshTunnel.advantages') || 'Acceso seguro a servicios internos, proxy SOCKS, bypass de firewalls',
          badges: [t('protocolSelection.badges.secure')]
        }
      ]
    },
    {
      id: t('protocolSelection.categories.fileTransfer'),
      title: t('protocolSelection.categories.fileTransfer'),
      protocols: [
        {
          id: 'sftp',
          name: t('protocolSelection.protocols.sftp.name'),
          fullName: t('protocolSelection.protocols.sftp.fullName'),
          description: t('protocolSelection.protocols.sftp.description'),
          icon: 'pi pi-folder-open',
          iconColor: '#FF9800',
          advantages: t('protocolSelection.protocols.sftp.advantages'),
          isRecommended: true,
          badges: [t('protocolSelection.badges.secure'), t('protocolSelection.badges.recommended')]
        },
        {
          id: 'ftp',
          name: t('protocolSelection.protocols.ftp.name'),
          fullName: t('protocolSelection.protocols.ftp.fullName'),
          description: t('protocolSelection.protocols.ftp.description'),
          icon: 'pi pi-cloud-upload',
          iconColor: '#9C27B0',
          advantages: t('protocolSelection.protocols.ftp.advantages'),
          isInsecure: true,
          badges: [t('protocolSelection.badges.insecure')]
        },
        {
          id: 'scp',
          name: t('protocolSelection.protocols.scp.name'),
          fullName: t('protocolSelection.protocols.scp.fullName'),
          description: t('protocolSelection.protocols.scp.description'),
          icon: 'pi pi-copy',
          iconColor: '#00BCD4',
          advantages: t('protocolSelection.protocols.scp.advantages'),
          badges: [t('protocolSelection.badges.secure')]
        }
      ]
    },
    {
      id: t('protocolSelection.categories.secretsManagement'),
      title: t('protocolSelection.categories.secretsManagement'),
      protocols: [
        {
          id: 'password',
          name: t('protocolSelection.protocols.password.name'),
          fullName: t('protocolSelection.protocols.password.name'),
          description: t('protocolSelection.protocols.password.description'),
          icon: 'pi pi-lock',
          iconColor: '#E91E63',
          advantages: t('protocolSelection.protocols.password.advantages'),
          badges: [t('protocolSelection.badges.secure')]
        },
        {
          id: 'crypto_wallet',
          name: t('protocolSelection.protocols.crypto_wallet.name'),
          fullName: t('protocolSelection.protocols.crypto_wallet.name'),
          description: t('protocolSelection.protocols.crypto_wallet.description'),
          icon: 'pi pi-wallet',
          iconColor: '#F7931A',
          advantages: t('protocolSelection.protocols.crypto_wallet.advantages'),
          badges: [t('protocolSelection.badges.secure')]
        },
        {
          id: 'api_key',
          name: t('protocolSelection.protocols.api_key.name'),
          fullName: t('protocolSelection.protocols.api_key.name'),
          description: t('protocolSelection.protocols.api_key.description'),
          icon: 'pi pi-key',
          iconColor: '#00BCD4',
          advantages: t('protocolSelection.protocols.api_key.advantages'),
          badges: [t('protocolSelection.badges.secure')]
        },
        {
          id: 'secure_note',
          name: t('protocolSelection.protocols.secure_note.name'),
          fullName: t('protocolSelection.protocols.secure_note.name'),
          description: t('protocolSelection.protocols.secure_note.description'),
          icon: 'pi pi-file-edit',
          iconColor: '#9C27B0',
          advantages: t('protocolSelection.protocols.secure_note.advantages'),
          badges: [t('protocolSelection.badges.secure')]
        }
      ]
    }
  ];

  const handleProtocolSelect = (protocolId) => {
    // Tipos de secretos: abrir el gestor de secretos y luego el diálogo correspondiente
    const secretTypes = ['password', 'crypto_wallet', 'api_key', 'secure_note'];
    
    if (secretTypes.includes(protocolId)) {
      // Cambiar a la vista de secretos
      window.dispatchEvent(new CustomEvent('open-password-manager'));
      // Pequeño delay para asegurar que la vista cambie antes de abrir el diálogo
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-new-secret-dialog', { 
          detail: { secretType: protocolId } 
        }));
      }, 100);
      onHide();
      return;
    }
    
    if (onSelectProtocol) {
      onSelectProtocol(protocolId);
    }
    onHide();
  };

  const currentSection = protocolSections.find(section => section.id === selectedCategory) || protocolSections[0];

  const headerTemplate = (
    <div className="protocol-dialog-header-custom">
      <div className="protocol-dialog-header-icon">
        <i className="pi pi-plus-circle"></i>
      </div>
      <span className="protocol-dialog-header-title">{t('protocolSelection.title')}</span>
    </div>
  );

  return (
    <Dialog
      header={headerTemplate}
      visible={visible}
      onHide={onHide}
      style={{ width: '70vw', maxWidth: '95vw', minWidth: '600px', height: 'auto', maxHeight: '90vh' }}
      modal
      resizable
      className="protocol-selection-dialog-new"
      contentStyle={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' }}
    >
      <div className="protocol-selection-layout">
        {/* Panel izquierdo: Categorías */}
        <div className="protocol-categories-panel">
          {protocolSections.map((section) => (
            <div
              key={section.id}
              className={`protocol-category-item ${selectedCategory === section.id ? 'active' : ''}`}
              data-category={section.id}
              onClick={() => setSelectedCategory(section.id)}
            >
              <span className="protocol-category-title">{section.title}</span>
            </div>
          ))}
        </div>

        {/* Panel derecho: Protocolos */}
        <div className="protocol-options-panel">
          {currentSection.protocols.map((protocol) => (
            <div 
              key={protocol.id} 
              className="protocol-option-card" 
              data-protocol={protocol.id}
              onClick={() => handleProtocolSelect(protocol.id)}
            >
              <div className="protocol-option-icon" style={{ backgroundColor: protocol.iconColor }}>
                <i className={protocol.icon}></i>
              </div>
              <div className="protocol-option-content">
                <div className="protocol-option-header">
                  <h3 className="protocol-option-title">{protocol.fullName || protocol.name}</h3>
                  {protocol.badges && protocol.badges.length > 0 && (
                    <div className="protocol-badges-container">
                      {protocol.badges.map((badge, idx) => {
                        const secureBadge = t('protocolSelection.badges.secure');
                        const recommendedBadge = t('protocolSelection.badges.recommended');
                        const insecureBadge = t('protocolSelection.badges.insecure');
                        const windowsBadge = t('protocolSelection.badges.windows');
                        const crossPlatformBadge = t('protocolSelection.badges.crossPlatform');
                        
                        return (
                          <span 
                            key={idx} 
                            className={`protocol-badge protocol-badge-${badge.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {badge === secureBadge && '🛡️'}
                            {badge === recommendedBadge && '⭐'}
                            {badge === insecureBadge && '⚠️'}
                            {badge === windowsBadge && '🖥️'}
                            {badge === crossPlatformBadge && '🌐'}
                            <span className="protocol-badge-text">{badge}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="protocol-option-description">{protocol.description}</p>
                <div className="protocol-option-advantages">
                  <div className="protocol-advantages-badges">
                    {protocol.advantages.map((advantage, idx) => (
                      <span key={idx} className="protocol-advantage-badge">
                        {advantage}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

 