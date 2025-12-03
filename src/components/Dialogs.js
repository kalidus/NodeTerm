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
import { FileUpload } from 'primereact/fileupload';
import { Message } from 'primereact/message';
import { FolderIconSelectorModal, FolderIconRenderer, FolderIconPresets } from './FolderIconSelector';
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
      style={{ width: '600px', maxWidth: '95vw' }} 
      modal 
      onHide={onHide}
      className="ssh-connection-dialog"
      contentStyle={{
        background: 'var(--ui-dialog-bg)',
        color: 'var(--ui-dialog-text)',
        padding: '0'
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
  sshAutoCopyPassword = false, setSSHAutoCopyPassword = () => {},
  foldersOptions = [],
  onSSHConfirm,
  sshLoading = false
}) {
  // Precargar datos cuando se abre el diálogo
  useEffect(() => {
    if (editNodeData && visible) {
      if (setSSHName) setSSHName(editNodeData.label || '');
      if (setSSHHost) setSSHHost(editNodeData.data?.bastionHost || editNodeData.data?.host || '');
      if (setSSHUser) setSSHUser(editNodeData.data?.useBastionWallix ? editNodeData.data?.bastionUser || '' : editNodeData.data?.user || '');
      if (setSSHPassword) setSSHPassword(editNodeData.data?.password || '');
      if (setSSHRemoteFolder) setSSHRemoteFolder(editNodeData.data?.remoteFolder || '');
      if (setSSHPort) setSSHPort(editNodeData.data?.port || 22);
      if (setSSHAutoCopyPassword && typeof setSSHAutoCopyPassword === 'function') {
        setSSHAutoCopyPassword(editNodeData.data?.autoCopyPassword || false);
      }
    }
  }, [editNodeData, visible, setSSHName, setSSHHost, setSSHUser, setSSHPassword, setSSHRemoteFolder, setSSHPort, setSSHAutoCopyPassword]);

  const headerTemplate = (
    <div className="protocol-dialog-header-custom">
      <div className="protocol-dialog-header-icon" style={{ background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)', boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)' }}>
        <i className="pi pi-terminal"></i>
      </div>
      <span className="protocol-dialog-header-title">Editar Conexión SSH</span>
    </div>
  );

  return (
    <Dialog
      header={headerTemplate}
      visible={visible}
      style={{ width: '90vw', maxWidth: '1200px', height: '90vh' }}
      modal
      resizable={true}
      onHide={onHide}
      contentStyle={{ padding: '0', overflow: 'hidden', background: 'var(--ui-dialog-bg)', color: 'var(--ui-dialog-text)' }}
      className="edit-ssh-connection-dialog protocol-selection-dialog-new"
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
          sshAutoCopyPassword={sshAutoCopyPassword}
          setSSHAutoCopyPassword={setSSHAutoCopyPassword}
          foldersOptions={foldersOptions}
          onSSHConfirm={onSSHConfirm}
          onHide={onHide}
          sshLoading={sshLoading}
        />
      </div>
    </Dialog>
  );
}

// --- EditRDPConnectionDialog: Diálogo independiente para editar conexiones RDP ---
export function EditRDPConnectionDialog({
  visible,
  onHide,
  editNodeData,
  onSaveToSidebar
}) {
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
    // PrimeReact Checkbox pasa el estado en e.checked (boolean)
    const newValue = !!e.checked; // Asegurar que sea boolean
    console.log(`[EditRDP] Checkbox ${field} cambiado:`, { 
      checked: e.checked, 
      newValue,
      currentState: formData[field]
    });
    
    setFormData(prev => {
      const updated = { ...prev, [field]: newValue };
      console.log(`[EditRDP] Estado actualizado:`, { field, oldValue: prev[field], newValue: updated[field] });
      return updated;
    });
  }, [formData]);

  const handleSelectFolder = async () => {
    try {
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Seleccionar carpeta para NodeTerm Drive'
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

  return (
    <Dialog
      header="Editar Conexión RDP"
      visible={visible}
      onHide={onHide}
      style={{ width: '90vw', maxWidth: '1200px', height: '90vh' }}
      modal
      resizable={true}
      contentStyle={{ padding: '0', overflow: 'auto' }}
      className="edit-rdp-connection-dialog"
    >
      <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* --- COLUMNA IZQUIERDA: Conexión --- */}
            <div style={{ flex: '1', minWidth: '320px' }}>
              <Card title="🔗 Conexión" className="mb-2">
                <div className="formgrid grid">
                  <div className="field col-12">
                    <label htmlFor="name-edit-rdp">Nombre *</label>
                    <InputText
                      id="name-edit-rdp"
                      value={formData.name}
                      onChange={handleTextChange('name')}
                      placeholder="Nombre descriptivo"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-8">
                    <label htmlFor="server-edit-rdp">Servidor *</label>
                    <InputText
                      id="server-edit-rdp"
                      value={formData.server}
                      onChange={handleTextChange('server')}
                      placeholder="IP o nombre del servidor"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-4">
                    <label htmlFor="port-edit-rdp">Puerto</label>
                    <InputText
                      id="port-edit-rdp"
                      type="number"
                      value={formData.port}
                      onChange={handleTextChange('port')}
                      placeholder="3389"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="username-edit-rdp">Usuario *</label>
                    <InputText
                      id="username-edit-rdp"
                      value={formData.username}
                      onChange={handleTextChange('username')}
                      placeholder="Usuario"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="password-edit-rdp">Contraseña</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="password-edit-rdp"
                        type={showRdpPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleTextChange('password')}
                        placeholder="Contraseña (opcional)"
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        icon={showRdpPassword ? "pi pi-eye-slash" : "pi pi-eye"}
                        className="p-button-outlined"
                        onClick={() => setShowRdpPassword(!showRdpPassword)}
                        tooltip={showRdpPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        tooltipOptions={{ position: 'top' }}
                      />
                    </div>
                  </div>
                  <div className="field col-12">
                    <label htmlFor="clientType-edit-rdp">💻 Cliente</label>
                    <Dropdown
                      id="clientType-edit-rdp"
                      value={formData.clientType}
                      options={[
                        { label: 'Windows MSTSC', value: 'mstsc' },
                        { label: 'Apache Guacamole', value: 'guacamole' }
                      ]}
                      onChange={(e) => handleInputChange('clientType', e.value)}
                      placeholder="Seleccionar tipo"
                    />
                  </div>
                  {formData.clientType === 'guacamole' && (
                    <div className="field col-12">
                      <label htmlFor="guacSecurity-edit-rdp">🔒 Seguridad</label>
                      <Dropdown
                        id="guacSecurity-edit-rdp"
                        value={formData.guacSecurity}
                        options={[
                          { label: '🛡️ Automático', value: 'any' },
                          { label: '🔐 RDP Estándar', value: 'rdp' },
                          { label: '🔒 TLS', value: 'tls' },
                          { label: '🛡️ Network Level Authentication', value: 'nla' }
                        ]}
                        onChange={(e) => handleInputChange('guacSecurity', e.value)}
                        placeholder="Seleccionar protocolo"
                      />
                      <small>Nivel de seguridad para la conexión RDP</small>
                    </div>
                  )}
                </div>
              </Card>

              {formData.clientType === 'guacamole' && formData.guacEnableDrive && (
                <Card title="📁 Carpeta Compartida" className="mt-3">
                  <div className="field">
                    <label htmlFor="guacDriveHostDir-edit-rdp">Ruta del directorio local</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="guacDriveHostDir-edit-rdp"
                        value={formData.guacDriveHostDir}
                        onChange={handleTextChange('guacDriveHostDir')}
                        placeholder="Ej: C:\Users\TuUsuario\Compartido"
                      />
                      <Button icon="pi pi-folder-open" className="p-button-secondary p-button-outlined" onClick={handleSelectFolder} tooltip="Seleccionar carpeta" />
                    </div>
                    <small className="p-d-block mt-2 text-color-secondary">
                      Esta carpeta estará disponible como una unidad de red dentro de la sesión RDP.
                    </small>
                  </div>
                </Card>
              )}
            </div>

            {/* --- COLUMNA DERECHA: Ajustes de Sesión --- */}
            <div style={{ flex: '1.5', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Card: Pantalla */}
              <Card title="🖥️ Pantalla">
                <div className="formgrid grid">
                  <div className="field col-6">
                    <label htmlFor="preset-edit-rdp">Preset</label>
                    <Dropdown
                      id="preset-edit-rdp"
                      value={formData.preset}
                      options={[
                        { label: 'Por defecto', value: 'default' },
                        { label: 'Rendimiento', value: 'performance' },
                        { label: 'Calidad', value: 'quality' }
                      ]}
                      onChange={(e) => handleInputChange('preset', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="resolution-edit-rdp">Resolución</label>
                    <Dropdown
                      id="resolution-edit-rdp"
                      value={formData.resolution}
                      options={[
                        { label: 'Pantalla completa', value: 'fullscreen' },
                        { label: '1920x1080', value: '1920x1080' },
                        { label: '1600x1000', value: '1600x1000' },
                        { label: '1366x768', value: '1366x768' },
                        { label: '1024x768', value: '1024x768' }
                      ]}
                      onChange={(e) => handleInputChange('resolution', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="colorDepth-edit-rdp">Color</label>
                    <Dropdown
                      id="colorDepth-edit-rdp"
                      value={formData.colorDepth}
                      options={[
                        { label: '32 bits', value: 32 },
                        { label: '24 bits', value: 24 },
                        { label: '16 bits', value: 16 },
                        { label: '15 bits', value: 15 }
                      ]}
                      onChange={(e) => handleInputChange('colorDepth', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="guacDpi-edit-rdp">DPI</label>
                    <InputText
                      id="guacDpi-edit-rdp"
                      value={formData.guacDpi}
                      onChange={handleTextChange('guacDpi')}
                      placeholder="96"
                    />
                  </div>
                </div>
              </Card>

              {/* Card: Opciones */}
              <Card title="⚙️ Opciones">
                <div className="formgrid grid">
                  {/* Opciones para MSTSC */}
                  {formData.clientType === 'mstsc' && (
                    <>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectClipboard-edit-rdp" checked={formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} /><label htmlFor="mstsc-redirectClipboard-edit-rdp">📋 Portapapeles</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectAudio-edit-rdp" checked={formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} /><label htmlFor="mstsc-redirectAudio-edit-rdp">🔊 Audio</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectPrinters-edit-rdp" checked={formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} /><label htmlFor="mstsc-redirectPrinters-edit-rdp">🖨️ Impresoras</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectFolders-edit-rdp" checked={formData.redirectFolders} onChange={handleCheckboxChange('redirectFolders')} /><label htmlFor="mstsc-redirectFolders-edit-rdp">📁 Carpetas</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-smartSizing-edit-rdp" checked={formData.smartSizing} onChange={handleCheckboxChange('smartSizing')} /><label htmlFor="mstsc-smartSizing-edit-rdp">📐 Ajuste automático</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-fullscreen-edit-rdp" checked={formData.fullscreen} onChange={handleCheckboxChange('fullscreen')} /><label htmlFor="mstsc-fullscreen-edit-rdp">🖥️ Pantalla completa</label></div>
                    </>
                  )}
                  {/* Opciones para Guacamole */}
                  {formData.clientType === 'guacamole' && (
                    <>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectClipboard-edit-rdp" checked={!!formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} key={`clipboard-${formData.redirectClipboard}`} /><label htmlFor="guac-redirectClipboard-edit-rdp">📋 Portapapeles</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectAudio-edit-rdp" checked={!!formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} key={`audio-${formData.redirectAudio}`} /><label htmlFor="guac-redirectAudio-edit-rdp">🔊 Audio</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-enableDrive-edit-rdp" checked={!!formData.guacEnableDrive} onChange={handleCheckboxChange('guacEnableDrive')} key={`drive-${formData.guacEnableDrive}`} /><label htmlFor="guac-enableDrive-edit-rdp">💾 Carpetas (NodeTerm Drive)</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-autoResize-edit-rdp" checked={!!formData.autoResize} onChange={handleCheckboxChange('autoResize')} key={`resize-${formData.autoResize}`} /><label htmlFor="guac-autoResize-edit-rdp">📐 Ajuste automático</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-enableWallpaper-edit-rdp" checked={!!formData.guacEnableWallpaper} onChange={handleCheckboxChange('guacEnableWallpaper')} key={`wallpaper-${formData.guacEnableWallpaper}`} /><label htmlFor="guac-enableWallpaper-edit-rdp">🖼️ Mostrar fondo</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectPrinters-edit-rdp" checked={!!formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} key={`printers-${formData.redirectPrinters}`} /><label htmlFor="guac-redirectPrinters-edit-rdp">🖨️ Impresoras</label></div>
                    </>
                  )}
                </div>

                {/* Fieldset: Opciones Avanzadas */}
                {formData.clientType === 'guacamole' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                    <Fieldset legend="⚙️ Opciones Avanzadas" toggleable collapsed className="advanced-fieldset">
                      <div className="formgrid grid">
                        <div className="col-4">
                          <h5>Rendimiento</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-gfx-edit-rdp" checked={!!formData.guacEnableGfx} onChange={handleCheckboxChange('guacEnableGfx')} key={`gfx-${formData.guacEnableGfx}`} /><label htmlFor="guac-gfx-edit-rdp">🎨 Habilitar GFX</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-composition-edit-rdp" checked={!!formData.guacEnableDesktopComposition} onChange={handleCheckboxChange('guacEnableDesktopComposition')} key={`composition-${formData.guacEnableDesktopComposition}`} /><label htmlFor="guac-composition-edit-rdp">🖼️ Desktop Composition</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-font-edit-rdp" checked={!!formData.guacEnableFontSmoothing} onChange={handleCheckboxChange('guacEnableFontSmoothing')} key={`font-${formData.guacEnableFontSmoothing}`} /><label htmlFor="guac-font-edit-rdp">✨ Font Smoothing</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-theming-edit-rdp" checked={!!formData.guacEnableTheming} onChange={handleCheckboxChange('guacEnableTheming')} key={`theming-${formData.guacEnableTheming}`} /><label htmlFor="guac-theming-edit-rdp">🎭 Theming</label></div>
                        </div>
                        <div className="col-4">
                          <h5>Interfaz</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-drag-edit-rdp" checked={!!formData.guacEnableFullWindowDrag} onChange={handleCheckboxChange('guacEnableFullWindowDrag')} key={`drag-${formData.guacEnableFullWindowDrag}`} /><label htmlFor="guac-drag-edit-rdp">🖱️ Full Window Drag</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-menu-edit-rdp" checked={!!formData.guacEnableMenuAnimations} onChange={handleCheckboxChange('guacEnableMenuAnimations')} key={`menu-${formData.guacEnableMenuAnimations}`} /><label htmlFor="guac-menu-edit-rdp">🎬 Animaciones de menú</label></div>
                        </div>
                        <div className="col-4">
                          <h5>Caché</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-glyph-cache-edit-rdp" checked={!!(!formData.guacDisableGlyphCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableGlyphCaching', !newValue); }} key={`glyph-${!formData.guacDisableGlyphCaching}`} /><label htmlFor="guac-glyph-cache-edit-rdp">🔤 Glyph Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-offscreen-cache-edit-rdp" checked={!!(!formData.guacDisableOffscreenCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableOffscreenCaching', !newValue); }} key={`offscreen-${!formData.guacDisableOffscreenCaching}`} /><label htmlFor="guac-offscreen-cache-edit-rdp">📱 Offscreen Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-bitmap-cache-edit-rdp" checked={!!(!formData.guacDisableBitmapCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableBitmapCaching', !newValue); }} key={`bitmap-${!formData.guacDisableBitmapCaching}`} /><label htmlFor="guac-bitmap-cache-edit-rdp">🖼️ Bitmap Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-copy-rect-edit-rdp" checked={!!(!formData.guacDisableCopyRect)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableCopyRect', !newValue); }} key={`copyrect-${!formData.guacDisableCopyRect}`} /><label htmlFor="guac-copy-rect-edit-rdp">📋 Copy-Rect</label></div>
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
            label="Cancelar"
            icon="pi pi-times"
            className="p-button-text"
            onClick={onHide}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          />
          <Button
            label="Guardar Cambios"
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
      header={isEditMode ? "Editar Conexión de Archivos" : "Nueva Conexión de Archivos"}
      visible={visible}
      style={{ width: '500px', borderRadius: '16px' }}
      modal
      onHide={onHide}
      className="file-connection-dialog"
    >
      <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
          <Card title="🔗 Conexión de Archivos" className="mb-2">
            <div className="formgrid grid">
              <div className="field col-12">
                <label htmlFor="file-name">Nombre de la conexión *</label>
                <InputText
                  id="file-name"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="Mi servidor SFTP"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12 md:col-6">
                <label htmlFor="file-protocol">Protocolo *</label>
                <Dropdown
                  id="file-protocol"
                  value={localProtocol}
                  options={[
                    { label: 'SFTP', value: 'sftp' },
                    { label: 'FTP', value: 'ftp' },
                    { label: 'SCP', value: 'scp' }
                  ]}
                  onChange={(e) => handleProtocolChange(e.value)}
                  placeholder="Seleccionar protocolo"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12 md:col-6">
                <label htmlFor="file-host">Host *</label>
                <InputText
                  id="file-host"
                  value={localHost}
                  onChange={(e) => setLocalHost(e.target.value)}
                  placeholder="192.168.1.100"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12 md:col-6">
                <label htmlFor="file-user">Usuario *</label>
                <InputText
                  id="file-user"
                  value={localUser}
                  onChange={(e) => setLocalUser(e.target.value)}
                  placeholder="usuario"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12 md:col-6">
                <label htmlFor="file-port">Puerto</label>
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
                <label htmlFor="file-password">Contraseña</label>
                <InputText
                  id="file-password"
                  type="password"
                  value={localPassword}
                  onChange={(e) => setLocalPassword(e.target.value)}
                  placeholder="Contraseña"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12">
                <label htmlFor="file-remote-folder">Carpeta remota (opcional)</label>
                <InputText
                  id="file-remote-folder"
                  value={localRemoteFolder}
                  onChange={(e) => setLocalRemoteFolder(e.target.value)}
                  placeholder="/home/usuario"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12">
                <label htmlFor="file-target-folder">Carpeta local destino (opcional)</label>
                <InputText
                  id="file-target-folder"
                  value={localTargetFolder}
                  onChange={(e) => setLocalTargetFolder(e.target.value)}
                  placeholder="C:\\Downloads"
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
                label="Volver"
                icon="pi pi-arrow-left"
                className="p-button-text"
                onClick={onGoBack}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-text"
              onClick={onHide}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            />
            <Button
              label={isEditMode ? "Guardar Cambios" : "Crear Conexión"}
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
          <label htmlFor="pwdTitle">Título *</label>
          <InputText id="pwdTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mi cuenta" />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdUser">Usuario</label>
          <InputText id="pwdUser" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdPass">Contraseña</label>
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
              tooltip={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              tooltipOptions={{ position: 'top' }}
            />
          </div>
        </div>
        <div className="field col-12">
          <label htmlFor="pwdUrl">URL</label>
          <InputText id="pwdUrl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdGroup">Grupo</label>
          <InputText id="pwdGroup" value={group} onChange={(e) => setGroup(e.target.value)} />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdFolder">Carpeta</label>
          <Dropdown
            id="pwdFolder"
            value={targetFolder}
            options={foldersOptions}
            onChange={(e) => setTargetFolder(e.value)}
            placeholder="Seleccionar carpeta"
            optionLabel="label"
            optionValue="key"
          />
        </div>
        <div className="field col-12">
          <label htmlFor="pwdNotes">Notas</label>
          <InputTextarea id="pwdNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </div>
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <Button
          label="Crear"
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
  sshAutoCopyPassword = false, setSSHAutoCopyPassword = () => {},
  foldersOptions = [],
  onSSHConfirm,
  onHide,
  onGoBack,
  sshLoading = false
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'key'
  const [sshPrivateKey, setSSHPrivateKey] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [autoCopyPassword, setAutoCopyPassword] = useState(!!sshAutoCopyPassword);

  // Sincronizar autoCopyPassword con el prop
  useEffect(() => {
    if (sshAutoCopyPassword !== undefined) {
      setAutoCopyPassword(!!sshAutoCopyPassword);
    }
  }, [sshAutoCopyPassword]);

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
    
    if (authMethod === 'password' && !sshPassword?.trim()) {
      errors.password = t('ssh.validation.passwordRequired');
    }
    
    if (authMethod === 'key' && !sshPrivateKey?.trim()) {
      errors.privateKey = t('ssh.validation.privateKeyRequired');
    }
    
    return errors;
  }, [sshName, sshHost, sshUser, sshPassword, authMethod, sshPrivateKey, t]);

  // Handler para enviar el formulario
  const handleSubmit = useCallback((e) => {
    if (e) e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    
    // Preparar datos para enviar
    const connectionData = {
      name: sshName.trim(),
      host: sshHost.trim(),
      user: sshUser.trim(),
      password: authMethod === 'password' ? sshPassword : '',
      port: sshPort || 22,
      remoteFolder: sshRemoteFolder || '',
      targetFolder: sshTargetFolder || '',
      autoCopyPassword: autoCopyPassword,
      authMethod: authMethod,
      privateKey: authMethod === 'key' ? sshPrivateKey : ''
    };
    
    if (onSSHConfirm && typeof onSSHConfirm === 'function') {
      onSSHConfirm(connectionData);
    }
  }, [sshName, sshHost, sshUser, sshPassword, sshPort, sshRemoteFolder, sshTargetFolder, autoCopyPassword, authMethod, sshPrivateKey, validateForm, onSSHConfirm]);

  // Handler para subir archivo de clave privada
  const handleFileUpload = (event) => {
    const file = event.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSSHPrivateKey(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  // Handler para toggle de autoCopyPassword
  const handleAutoCopyToggle = useCallback((checked) => {
    setAutoCopyPassword(checked);
    if (setSSHAutoCopyPassword && typeof setSSHAutoCopyPassword === 'function') {
      setSSHAutoCopyPassword(checked);
    }
  }, [setSSHAutoCopyPassword]);

  const isFormValid = () => {
    return sshName?.trim() && 
           sshHost?.trim() && 
           sshUser?.trim() &&
           (authMethod === 'password' ? sshPassword?.trim() : sshPrivateKey?.trim());
  };

  // Render del formulario
  return (
    <div className="general-settings-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: '1rem' }}>
      {/* Contenedor principal que se expande */}
      <div style={{ flex: '1 1 auto', overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Grid de 2 columnas para las secciones */}
        <div className="general-settings-content">
          
          {/* Sección: Conexión - Columna Izquierda */}
          <div className="general-settings-section">
            <div className="general-section-header">
              <div className="general-section-icon">
                <i className="pi pi-link"></i>
              </div>
              <h4 className="general-section-title">{t('ssh.sections.connection')}</h4>
            </div>
            
            <div className="general-settings-options">
              <div className="general-setting-card">
                <div className="general-setting-content">
                  <div className="general-setting-icon lock">
                    <i className="pi pi-tag"></i>
                  </div>
                  <div className="general-setting-info">
                    <label htmlFor="sshName" className="general-setting-label">
                      {t('ssh.fields.name')} <span style={{ color: 'var(--ui-button-primary)' }}>*</span>
                    </label>
                    <p className="general-setting-description">
                      {t('ssh.descriptions.name')}
                    </p>
                  </div>
                  <div className="general-setting-control">
                    <InputText 
                      id="sshName"
                      value={sshName} 
                      onChange={(e) => setSSHName(e.target.value)}
                      placeholder={t('ssh.placeholders.name')}
                      autoFocus={activeTabIndex === 0}
                      className={validationErrors.name ? 'p-invalid' : ''}
                      style={{ width: '100%', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>
                {validationErrors.name && <small className="p-error" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', marginLeft: '2.75rem' }}>{validationErrors.name}</small>}
              </div>

              <div className="general-setting-card">
                <div className="general-setting-content">
                  <div className="general-setting-icon lock">
                    <i className="pi pi-server"></i>
                  </div>
                  <div className="general-setting-info">
                    <label htmlFor="sshHost" className="general-setting-label">
                      {t('ssh.fields.host')} <span style={{ color: 'var(--ui-button-primary)' }}>*</span>
                    </label>
                    <p className="general-setting-description">
                      {t('ssh.descriptions.host')}
                    </p>
                  </div>
                  <div className="general-setting-control general-setting-control-inputs" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', maxWidth: '280px', flex: '1 1 auto' }}>
                    <InputText 
                      id="sshHost"
                      value={sshHost} 
                      onChange={(e) => setSSHHost(e.target.value)}
                      placeholder={t('ssh.placeholders.host')}
                      className={validationErrors.host ? 'p-invalid' : ''}
                      style={{ flex: '1 1 auto', minWidth: '120px', maxWidth: '200px', fontSize: '0.875rem' }}
                    />
                    <InputText 
                      id="sshPort"
                      value={sshPort} 
                      onChange={(e) => setSSHPort(e.target.value)}
                      placeholder={t('ssh.placeholders.port')}
                      className={validationErrors.port ? 'p-invalid' : ''}
                      style={{ width: '70px', flexShrink: 0, fontSize: '0.875rem' }}
                    />
                  </div>
                </div>
                {validationErrors.host && <small className="p-error" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', marginLeft: '2.75rem' }}>{validationErrors.host}</small>}
                {validationErrors.port && <small className="p-error" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', marginLeft: '2.75rem' }}>{validationErrors.port}</small>}
              </div>

              <div className="general-setting-card">
                <div className="general-setting-content">
                  <div className="general-setting-icon lock">
                    <i className="pi pi-user"></i>
                  </div>
                  <div className="general-setting-info">
                    <label htmlFor="sshUser" className="general-setting-label">
                      {t('ssh.fields.user')} <span style={{ color: 'var(--ui-button-primary)' }}>*</span>
                    </label>
                    <p className="general-setting-description">
                      {t('ssh.descriptions.user')}
                    </p>
                  </div>
                  <div className="general-setting-control">
                    <InputText 
                      id="sshUser"
                      value={sshUser} 
                      onChange={(e) => setSSHUser(e.target.value)}
                      placeholder={t('ssh.placeholders.user')}
                      className={validationErrors.user ? 'p-invalid' : ''}
                      style={{ width: '100%', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>
                {validationErrors.user && <small className="p-error" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', marginLeft: '2.75rem' }}>{validationErrors.user}</small>}
              </div>
            </div>
          </div>

          {/* Sección: Autenticación - Columna Derecha */}
          <div className="general-settings-section">
            <div className="general-section-header">
              <div className="general-section-icon">
                <i className="pi pi-lock"></i>
              </div>
              <h4 className="general-section-title">{t('ssh.sections.authentication')}</h4>
            </div>
            
            <div className="general-settings-options">
              <div className="general-setting-card">
                <div className="general-setting-content">
                  <div className="general-setting-icon bolt">
                    <i className="pi pi-key"></i>
                  </div>
                  <div className="general-setting-info">
                    <label className="general-setting-label">
                      {t('ssh.auth.method')}
                    </label>
                    <p className="general-setting-description">
                      {t('ssh.auth.methodDescription')}
                    </p>
                  </div>
                  <div className="general-setting-control" style={{ display: 'flex', gap: '1rem' }}>
                    <div className="field-radiobutton">
                      <RadioButton inputId="authPassword" name="authMethod" value="password" onChange={(e) => setAuthMethod(e.value)} checked={authMethod === 'password'} />
                      <label htmlFor="authPassword" style={{ marginLeft: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem' }}>{t('ssh.auth.password')}</label>
                    </div>
                    <div className="field-radiobutton">
                      <RadioButton inputId="authKey" name="authMethod" value="key" onChange={(e) => setAuthMethod(e.value)} checked={authMethod === 'key'} />
                      <label htmlFor="authKey" style={{ marginLeft: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem' }}>{t('ssh.auth.key')}</label>
                    </div>
                  </div>
                </div>
              </div>

              {authMethod === 'password' && (
                <>
                  <div className="general-setting-card">
                    <div className="general-setting-content">
                      <div className="general-setting-icon lock">
                        <i className="pi pi-lock"></i>
                      </div>
                      <div className="general-setting-info">
                        <label htmlFor="sshPassword" className="general-setting-label">
                          {t('ssh.fields.password')} <span style={{ color: 'var(--ui-button-primary)' }}>*</span>
                        </label>
                        <p className="general-setting-description">
                          {t('ssh.descriptions.password')}
                        </p>
                      </div>
                      <div className="general-setting-control">
                        <div className="p-inputgroup" style={{ width: '100%' }}>
                          <InputText 
                            id="sshPassword"
                            type={showPassword ? "text" : "password"}
                            value={sshPassword} 
                            onChange={(e) => setSSHPassword(e.target.value)}
                            placeholder={t('ssh.placeholders.password')}
                            className={validationErrors.password ? 'p-invalid' : ''}
                            style={{ width: '100%', fontSize: '0.875rem' }}
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
                    {validationErrors.password && <small className="p-error" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', marginLeft: '2.75rem' }}>{validationErrors.password}</small>}
                  </div>

                  <div className="general-setting-card">
                    <div className="general-setting-content">
                      <div className="general-setting-icon bolt">
                        <i className="pi pi-copy"></i>
                      </div>
                      <div className="general-setting-info">
                        <label htmlFor="autoCopyPassword" className="general-setting-label">
                          {t('ssh.auth.autoCopyPassword')}
                        </label>
                        <p className="general-setting-description">
                          {t('ssh.auth.autoCopyPasswordDescription')}
                        </p>
                      </div>
                      <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          inputId="autoCopyPassword" 
                          checked={autoCopyPassword} 
                          onChange={(e) => handleAutoCopyToggle(e.checked)} 
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {authMethod === 'key' && (
                <div className="general-setting-card general-setting-card-ssh-key">
                  <div className="general-setting-content">
                    <div className="general-setting-icon lock">
                      <i className="pi pi-key"></i>
                    </div>
                    <div className="general-setting-info">
                      <label htmlFor="sshPrivateKey" className="general-setting-label">
                        {t('ssh.fields.privateKeySSH')} <span style={{ color: 'var(--ui-button-primary)' }}>*</span>
                      </label>
                      <p className="general-setting-description">
                        {t('ssh.descriptions.privateKey')}
                      </p>
                    </div>
                    <div className="general-setting-control general-setting-control-ssh-key" style={{ width: '100%', flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                      <FileUpload
                        mode="basic"
                        name="sshPrivateKey"
                        accept=".pem,.key"
                        maxFileSize={10000000}
                        chooseLabel={t('ssh.auth.selectKeyFile')}
                        onUpload={handleFileUpload}
                        auto
                        style={{ width: '100%' }}
                      />
                      {sshPrivateKey && (
                        <InputTextarea
                          id="sshPrivateKey"
                          value={sshPrivateKey}
                          onChange={(e) => setSSHPrivateKey(e.target.value)}
                          rows={6}
                          placeholder={t('ssh.auth.pasteKey')}
                          className={validationErrors.privateKey ? 'p-invalid' : ''}
                          style={{ fontFamily: 'monospace', fontSize: '12px', width: '100%' }}
                        />
                      )}
                    </div>
                  </div>
                  {validationErrors.privateKey && <small className="p-error" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', marginLeft: '2.75rem' }}>{validationErrors.privateKey}</small>}
                </div>
              )}
            </div>
          </div>

          {/* Sección: Carpetas - Ocupa ambas columnas */}
          <div className="general-settings-section" style={{ gridColumn: '1 / -1' }}>
            <div className="general-section-header">
              <div className="general-section-icon">
                <i className="pi pi-folder"></i>
              </div>
              <h4 className="general-section-title">{t('ssh.sections.folders')}</h4>
            </div>
            
            <div className="general-settings-options">
              <div className="general-setting-card">
                <div className="general-setting-content">
                  <div className="general-setting-icon collapse">
                    <i className="pi pi-folder-open"></i>
                  </div>
                  <div className="general-setting-info">
                    <label htmlFor="sshRemoteFolder" className="general-setting-label">
                      {t('ssh.fields.remoteFolder')} <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>({tCommon('labels.optional')})</span>
                    </label>
                    <p className="general-setting-description">
                      {t('ssh.descriptions.remoteFolder')}
                    </p>
                  </div>
                  <div className="general-setting-control">
                    <InputText 
                      id="sshRemoteFolder"
                      value={sshRemoteFolder} 
                      onChange={(e) => setSSHRemoteFolder(e.target.value)}
                      placeholder={t('ssh.placeholders.remoteFolder')}
                      style={{ width: '100%', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>
              </div>

              <div className="general-setting-card">
                <div className="general-setting-content">
                  <div className="general-setting-icon collapse">
                    <i className="pi pi-folder"></i>
                  </div>
                  <div className="general-setting-info">
                    <label htmlFor="sshTargetFolder" className="general-setting-label">
                      {t('ssh.fields.targetFolder')} <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>({tCommon('labels.optional')})</span>
                    </label>
                    <p className="general-setting-description">
                      {t('ssh.descriptions.targetFolder')}
                    </p>
                  </div>
                  <div className="general-setting-control">
                    <Dropdown
                      id="sshTargetFolder"
                      value={sshTargetFolder}
                      options={foldersOptions}
                      onChange={(e) => setSSHTargetFolder(e.value)}
                      placeholder={t('ssh.placeholders.targetFolder')}
                      filter
                      showClear
                      style={{ width: '100%', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--ui-dialog-border)', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {onGoBack && (
            <Button 
              label={t('common.back')} 
              icon="pi pi-arrow-left" 
              className="p-button-text" 
              onClick={onGoBack}
              style={{ minWidth: '120px' }}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button 
            label={tCommon('buttons.cancel')} 
            icon="pi pi-times" 
            className="p-button-text" 
            onClick={onHide}
            style={{ minWidth: '120px' }}
          />
          <Button 
            label={tCommon('buttons.save')} 
            icon="pi pi-check" 
            className="p-button-primary" 
            onClick={handleSubmit}
            disabled={!isFormValid()}
            loading={sshLoading}
            style={{ minWidth: '120px' }}
          />
        </div>
      </div>
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
  sshAutoCopyPassword = false, setSSHAutoCopyPassword = () => {},
  foldersOptions = [],
  onSSHConfirm,
  sshLoading = false
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  
  const headerTemplate = (
    <div className="protocol-dialog-header-custom">
      <div className="protocol-dialog-header-icon" style={{ background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)', boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)' }}>
        <i className="pi pi-terminal"></i>
      </div>
      <span className="protocol-dialog-header-title">{t('ssh.title.new')}</span>
    </div>
  );

  return (
    <Dialog
      header={headerTemplate}
      visible={visible}
      style={{ width: '90vw', maxWidth: '1200px', height: '90vh' }}
      modal
      resizable={true}
      onHide={onHide}
      contentStyle={{ padding: '0', overflow: 'hidden', background: 'var(--ui-dialog-bg)', color: 'var(--ui-dialog-text)' }}
      className="new-ssh-connection-dialog protocol-selection-dialog-new"
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
          sshAutoCopyPassword={sshAutoCopyPassword}
          setSSHAutoCopyPassword={setSSHAutoCopyPassword}
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

  return (
    <Dialog
      header={t('rdp.title.new')}
      visible={visible}
      style={{ width: '90vw', maxWidth: '1200px', height: '90vh' }}
      modal
      resizable={true}
      onHide={onHide}
      contentStyle={{ padding: '0', overflow: 'auto' }}
      className="new-rdp-connection-dialog"
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

  return (
    <Dialog
      header="Nueva Conexión VNC"
      visible={visible}
      style={{ width: '90vw', maxWidth: '1200px', height: '90vh' }}
      modal
      resizable={true}
      onHide={onHide}
      contentStyle={{ padding: '0', overflow: 'auto' }}
      className="new-vnc-connection-dialog"
    >
      <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* --- COLUMNA IZQUIERDA: Conexión --- */}
            <div style={{ flex: '1', minWidth: '320px' }}>
              <Card title="🔗 Conexión" className="mb-2">
                <div className="formgrid grid">
                  <div className="field col-12">
                    <label htmlFor="name-create-vnc">Nombre *</label>
                    <InputText
                      id="name-create-vnc"
                      value={formData.name}
                      onChange={handleTextChange('name')}
                      placeholder="Nombre descriptivo"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-8">
                    <label htmlFor="server-create-vnc">Servidor *</label>
                    <InputText
                      id="server-create-vnc"
                      value={formData.server}
                      onChange={handleTextChange('server')}
                      placeholder="IP o nombre del servidor"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-4">
                    <label htmlFor="port-create-vnc">Puerto</label>
                    <InputText
                      id="port-create-vnc"
                      type="number"
                      value={formData.port}
                      onChange={handleTextChange('port')}
                      placeholder="5900"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="password-create-vnc">Contraseña VNC</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="password-create-vnc"
                        type={showVncPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleTextChange('password')}
                        placeholder="Contraseña VNC (opcional)"
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        icon={showVncPassword ? "pi pi-eye-slash" : "pi pi-eye"}
                        className="p-button-outlined"
                        onClick={() => setShowVncPassword(!showVncPassword)}
                        tooltip={showVncPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        tooltipOptions={{ position: 'top' }}
                      />
                    </div>
                    <small className="p-d-block mt-2 text-color-secondary">
                      Contraseña del servidor VNC (si está configurada)
                    </small>
                  </div>
                </div>
              </Card>
            </div>

            {/* --- COLUMNA DERECHA: Ajustes de Sesión --- */}
            <div style={{ flex: '1.5', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Card: Pantalla */}
              <Card title="🖥️ Pantalla">
                <div className="formgrid grid">
                  <div className="field col-6">
                    <label htmlFor="resolution-create-vnc">Resolución</label>
                    <Dropdown
                      id="resolution-create-vnc"
                      value={formData.resolution}
                      options={[
                        { label: 'Pantalla completa', value: 'fullscreen' },
                        { label: '1920x1080', value: '1920x1080' },
                        { label: '1600x1000', value: '1600x1000' },
                        { label: '1366x768', value: '1366x768' },
                        { label: '1024x768', value: '1024x768' }
                      ]}
                      onChange={(e) => handleInputChange('resolution', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="colorDepth-create-vnc">Profundidad de Color</label>
                    <Dropdown
                      id="colorDepth-create-vnc"
                      value={formData.colorDepth}
                      options={[
                        { label: '32 bits', value: 32 },
                        { label: '24 bits', value: 24 },
                        { label: '16 bits', value: 16 },
                        { label: '8 bits', value: 8 }
                      ]}
                      onChange={(e) => handleInputChange('colorDepth', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="guacDpi-create-vnc">DPI</label>
                    <InputText
                      id="guacDpi-create-vnc"
                      type="number"
                      value={formData.guacDpi}
                      onChange={handleTextChange('guacDpi')}
                      placeholder="96"
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="imageQuality-create-vnc">Calidad de Imagen</label>
                    <Dropdown
                      id="imageQuality-create-vnc"
                      value={formData.imageQuality}
                      options={[
                        { label: 'Sin pérdida', value: 'lossless' },
                        { label: 'Pérdida baja', value: 'lossy-low' },
                        { label: 'Pérdida media', value: 'lossy-medium' },
                        { label: 'Pérdida alta', value: 'lossy-high' }
                      ]}
                      onChange={(e) => handleInputChange('imageQuality', e.value)}
                    />
                  </div>
                </div>
              </Card>

              {/* Card: Opciones */}
              <Card title="⚙️ Opciones">
                <div className="formgrid grid">
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="readOnly-create-vnc" 
                      checked={formData.readOnly} 
                      onChange={handleCheckboxChange('readOnly')} 
                    />
                    <label htmlFor="readOnly-create-vnc">👁️ Solo lectura</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="enableCompression-create-vnc" 
                      checked={formData.enableCompression} 
                      onChange={handleCheckboxChange('enableCompression')} 
                    />
                    <label htmlFor="enableCompression-create-vnc">🗜️ Compresión</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="autoReconnect-create-vnc" 
                      checked={formData.autoReconnect} 
                      onChange={handleCheckboxChange('autoReconnect')} 
                    />
                    <label htmlFor="autoReconnect-create-vnc">🔄 Reconexión automática</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="autoResize-create-vnc" 
                      checked={formData.autoResize} 
                      onChange={handleCheckboxChange('autoResize')} 
                    />
                    <label htmlFor="autoResize-create-vnc">📐 Ajuste automático</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="redirectClipboard-create-vnc" 
                      checked={formData.redirectClipboard} 
                      onChange={handleCheckboxChange('redirectClipboard')} 
                    />
                    <label htmlFor="redirectClipboard-create-vnc">📋 Portapapeles</label>
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
                label="Volver"
                icon="pi pi-arrow-left"
                className="p-button-text"
                onClick={onGoBack}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-text"
              onClick={onHide}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            />
            <Button
              label="Guardar"
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

  return (
    <Dialog
      header="Editar Conexión VNC"
      visible={visible}
      style={{ width: '90vw', maxWidth: '1200px', height: '90vh' }}
      modal
      resizable={true}
      onHide={onHide}
      contentStyle={{ padding: '0', overflow: 'auto' }}
      className="edit-vnc-connection-dialog"
    >
      <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* --- COLUMNA IZQUIERDA: Conexión --- */}
            <div style={{ flex: '1', minWidth: '320px' }}>
              <Card title="🔗 Conexión" className="mb-2">
                <div className="formgrid grid">
                  <div className="field col-12">
                    <label htmlFor="name-edit-vnc">Nombre *</label>
                    <InputText
                      id="name-edit-vnc"
                      value={formData.name}
                      onChange={handleTextChange('name')}
                      placeholder="Nombre descriptivo"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-8">
                    <label htmlFor="server-edit-vnc">Servidor *</label>
                    <InputText
                      id="server-edit-vnc"
                      value={formData.server}
                      onChange={handleTextChange('server')}
                      placeholder="IP o nombre del servidor"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-4">
                    <label htmlFor="port-edit-vnc">Puerto</label>
                    <InputText
                      id="port-edit-vnc"
                      type="number"
                      value={formData.port}
                      onChange={handleTextChange('port')}
                      placeholder="5900"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="password-edit-vnc">Contraseña VNC</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="password-edit-vnc"
                        type={showVncPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleTextChange('password')}
                        placeholder="Contraseña VNC (opcional)"
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        icon={showVncPassword ? "pi pi-eye-slash" : "pi pi-eye"}
                        className="p-button-outlined"
                        onClick={() => setShowVncPassword(!showVncPassword)}
                        tooltip={showVncPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        tooltipOptions={{ position: 'top' }}
                      />
                    </div>
                    <small className="p-d-block mt-2 text-color-secondary">
                      Contraseña del servidor VNC (si está configurada)
                    </small>
                  </div>
                </div>
              </Card>
            </div>

            {/* --- COLUMNA DERECHA: Ajustes de Sesión --- */}
            <div style={{ flex: '1.5', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Card: Pantalla */}
              <Card title="🖥️ Pantalla">
                <div className="formgrid grid">
                  <div className="field col-6">
                    <label htmlFor="resolution-edit-vnc">Resolución</label>
                    <Dropdown
                      id="resolution-edit-vnc"
                      value={formData.resolution}
                      options={[
                        { label: 'Pantalla completa', value: 'fullscreen' },
                        { label: '1920x1080', value: '1920x1080' },
                        { label: '1600x1000', value: '1600x1000' },
                        { label: '1366x768', value: '1366x768' },
                        { label: '1024x768', value: '1024x768' }
                      ]}
                      onChange={(e) => handleInputChange('resolution', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="colorDepth-edit-vnc">Profundidad de Color</label>
                    <Dropdown
                      id="colorDepth-edit-vnc"
                      value={formData.colorDepth}
                      options={[
                        { label: '32 bits', value: 32 },
                        { label: '24 bits', value: 24 },
                        { label: '16 bits', value: 16 },
                        { label: '8 bits', value: 8 }
                      ]}
                      onChange={(e) => handleInputChange('colorDepth', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="guacDpi-edit-vnc">DPI</label>
                    <InputText
                      id="guacDpi-edit-vnc"
                      type="number"
                      value={formData.guacDpi}
                      onChange={handleTextChange('guacDpi')}
                      placeholder="96"
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="imageQuality-edit-vnc">Calidad de Imagen</label>
                    <Dropdown
                      id="imageQuality-edit-vnc"
                      value={formData.imageQuality}
                      options={[
                        { label: 'Sin pérdida', value: 'lossless' },
                        { label: 'Pérdida baja', value: 'lossy-low' },
                        { label: 'Pérdida media', value: 'lossy-medium' },
                        { label: 'Pérdida alta', value: 'lossy-high' }
                      ]}
                      onChange={(e) => handleInputChange('imageQuality', e.value)}
                    />
                  </div>
                </div>
              </Card>

              {/* Card: Opciones */}
              <Card title="⚙️ Opciones">
                <div className="formgrid grid">
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="readOnly-edit-vnc" 
                      checked={formData.readOnly} 
                      onChange={handleCheckboxChange('readOnly')} 
                    />
                    <label htmlFor="readOnly-edit-vnc">👁️ Solo lectura</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="enableCompression-edit-vnc" 
                      checked={formData.enableCompression} 
                      onChange={handleCheckboxChange('enableCompression')} 
                    />
                    <label htmlFor="enableCompression-edit-vnc">🗜️ Compresión</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="autoReconnect-edit-vnc" 
                      checked={formData.autoReconnect} 
                      onChange={handleCheckboxChange('autoReconnect')} 
                    />
                    <label htmlFor="autoReconnect-edit-vnc">🔄 Reconexión automática</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="autoResize-edit-vnc" 
                      checked={formData.autoResize} 
                      onChange={handleCheckboxChange('autoResize')} 
                    />
                    <label htmlFor="autoResize-edit-vnc">📐 Ajuste automático</label>
                  </div>
                  <div className="field-checkbox col-6">
                    <Checkbox 
                      inputId="redirectClipboard-edit-vnc" 
                      checked={formData.redirectClipboard} 
                      onChange={handleCheckboxChange('redirectClipboard')} 
                    />
                    <label htmlFor="redirectClipboard-edit-vnc">📋 Portapapeles</label>
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
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-text"
              onClick={onHide}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            />
            <Button
              label="Guardar"
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
  onSelectProtocol // Callback: (protocol) => void
}) {
  const [selectedCategory, setSelectedCategory] = useState('Acceso Remoto');

  // Resetear categoría cuando se abre el diálogo
  useEffect(() => {
    if (visible) {
      setSelectedCategory('Acceso Remoto');
    }
  }, [visible]);

  const protocolSections = [
    {
      id: 'Acceso Remoto',
      title: 'Acceso Remoto',
      protocols: [
        {
          id: 'ssh',
          name: 'SSH (Secure Shell)',
          fullName: 'SSH (Secure Shell)',
          description: 'Acceso seguro a la línea de comandos de sistemas remotos (Linux/Unix). Esencial para administración de servidores y desarrollo.',
          icon: 'pi pi-server',
          iconColor: '#2196F3',
          advantages: [
            'Alta seguridad',
            'Versatilidad para tunelización y reenvío de puertos'
          ],
          badges: ['Seguro']
        },
        {
          id: 'rdp',
          name: 'RDP (Remote Desktop Protocol)',
          fullName: 'RDP (Remote Desktop Protocol)',
          description: 'Acceso gráfico completo a escritorios de Windows. Permite control visual de un PC remoto.',
          icon: 'pi pi-desktop',
          iconColor: '#4CAF50',
          advantages: [
            'Experiencia de usuario familiar para entornos Windows',
            'Soporte para múltiples sesiones'
          ],
          badges: ['Windows']
        },
        {
          id: 'vnc',
          name: 'VNC (Virtual Network Computing)',
          fullName: 'VNC (Virtual Network Computing)',
          description: 'Acceso remoto multiplataforma a escritorios gráficos. Compatible con Linux, Windows, macOS y sistemas embebidos.',
          icon: 'pi pi-eye',
          iconColor: '#FF5722',
          advantages: [
            'Multiplataforma (Linux, Windows, macOS)',
            'Ligero y eficiente para conexiones remotas'
          ],
          badges: ['Multiplataforma']
        }
      ]
    },
    {
      id: 'Transferencia de Archivos',
      title: 'Transferencia de Archivos',
      protocols: [
        {
          id: 'sftp',
          name: 'SFTP',
          fullName: 'SFTP (SSH File Transfer Protocol)',
          description: 'La forma más recomendada para mover archivos de forma encriptada, utilizando vías de seguridad de SSH.',
          icon: 'pi pi-folder-open',
          iconColor: '#FF9800',
          advantages: [
            'Transferencia encriptada y segura',
            'Basado en SSH, ampliamente soportado'
          ],
          isRecommended: true,
          badges: ['Seguro', 'Recomendado']
        },
        {
          id: 'ftp',
          name: 'FTP',
          fullName: 'FTP (File Transfer Protocol)',
          description: 'Protocolo clásico de transferencia. Rápido, pero *no encripta* los datos (no recomendado para información sensible).',
          icon: 'pi pi-cloud-upload',
          iconColor: '#9C27B0',
          advantages: [
            'Rápido y eficiente',
            'Amplia compatibilidad'
          ],
          isInsecure: true,
          badges: ['No seguro']
        },
        {
          id: 'scp',
          name: 'SCP',
          fullName: 'SCP (Secure Copy Protocol)',
          description: 'Herramienta rápida y segura para copiar archivos y directorios entre hosts remotos (basado en SSH).',
          icon: 'pi pi-copy',
          iconColor: '#00BCD4',
          advantages: [
            'Seguro y rápido',
            'Basado en SSH'
          ],
          badges: ['Seguro']
        }
      ]
    },
    {
      id: 'Gestión de Contraseñas',
      title: 'Gestión de Contraseñas',
      protocols: [
        {
          id: 'password',
          name: 'Nueva Contraseña',
          fullName: 'Nueva Contraseña',
          description: 'Almacena y gestiona contraseñas de forma segura. Encriptación AES-256-GCM con master password opcional.',
          icon: 'pi pi-lock',
          iconColor: '#E91E63',
          advantages: [
            'Encriptación segura AES-256-GCM',
            'Organización en carpetas y grupos'
          ],
          badges: ['Seguro']
        }
      ]
    }
  ];

  const handleProtocolSelect = (protocolId) => {
    if (protocolId === 'password') {
      // Cambiar a la vista de passwords y abrir el diálogo de nueva contraseña
      window.dispatchEvent(new CustomEvent('open-password-manager'));
      // Pequeño delay para asegurar que la vista cambie antes de abrir el diálogo
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-new-password-dialog'));
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
      <span className="protocol-dialog-header-title">Configuración de Nueva Conexión</span>
    </div>
  );

  return (
    <Dialog
      header={headerTemplate}
      visible={visible}
      onHide={onHide}
      style={{ width: '70vw', maxWidth: '850px' }}
      modal
      className="protocol-selection-dialog-new"
      contentStyle={{ padding: '0', overflow: 'hidden' }}
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
                      {protocol.badges.map((badge, idx) => (
                        <span 
                          key={idx} 
                          className={`protocol-badge protocol-badge-${badge.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {badge === 'Seguro' && '🛡️'}
                          {badge === 'Recomendado' && '⭐'}
                          {badge === 'No seguro' && '⚠️'}
                          {badge === 'Windows' && '🖥️'}
                          {badge === 'Multiplataforma' && '🌐'}
                          <span className="protocol-badge-text">{badge}</span>
                        </span>
                      ))}
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

 