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
import { InputSwitch } from 'primereact/inputswitch';
import { TerminalOptionHelp } from './TerminalOptionHelp';
import { FolderIconSelectorModal, FolderIconRenderer, FolderIconPresets } from './FolderIconSelector';
import { SSHIconSelectorModal, SSHIconRenderer, SSHIconPresets } from './SSHIconSelector';
import { iconThemes } from '../themes/icon-themes';
import { useTranslation } from '../i18n/hooks/useTranslation';
import {
  EnhancedRDPForm,
  RdpTerminalDialogHeader,
  createDefaultRdpFormData,
  mapEditNodeDataToRdpFormData,
  isRdpFormValid,
  TERMINAL_PRO_DIALOG_STYLE,
  TERMINAL_PRO_DIALOG_CONTENT_STYLE,
  TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE
} from './EnhancedRDPForm';
import {
  EnhancedVNCForm,
  VncTerminalDialogHeader,
  createDefaultVncFormData,
  mapEditNodeDataToVncFormData,
  isVncFormValid
} from './EnhancedVNCForm';

const resolveSSHIconPreset = (iconId) => {
  if (!iconId || iconId === 'default') return null;
  const normalizedId = String(iconId).toLowerCase();
  const presetById = Object.values(SSHIconPresets).find((preset) => preset.id === normalizedId);
  if (presetById) return presetById;
  return SSHIconPresets[String(iconId).toUpperCase()] || null;
};

const SSH_DIALOG_HEADER_ICON_SIZE = 24;

const renderSSHDialogHeaderIconContent = (iconPreset, themeIcon, size = SSH_DIALOG_HEADER_ICON_SIZE) => {
  if (iconPreset) {
    return <SSHIconRenderer preset={iconPreset} pixelSize={size} />;
  }

  if (React.isValidElement(themeIcon)) {
    return (
      <div className="terminal-header-icon-mini" aria-hidden="true">
        {React.cloneElement(themeIcon, {
          width: size,
          height: size,
          style: {
            ...(themeIcon.props?.style || {}),
            width: `${size}px`,
            height: `${size}px`,
            display: 'block',
            flexShrink: 0,
          },
        })}
      </div>
    );
  }

  return (
    <div className="terminal-header-icon-mini" aria-hidden="true">
      <i className="pi pi-desktop"></i>
    </div>
  );
};

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
                  border: groupColor === color ? '3px solid var(--primary-color, #1976d2)' : '2px solid var(--ui-dialog-border, #23272f)',
                  boxShadow: groupColor === color ? '0 0 0 4px color-mix(in srgb, var(--primary-color, #1976d2) 65%, transparent)' : '0 1px 4px rgba(0,0,0,0.10)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border 0.2s',
                  outline: groupColor === color ? '2px solid var(--primary-color, #1976d2)' : 'none',
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
                    textShadow: '0 1px 4px var(--primary-color, #1976d2), 0 0 2px var(--ui-dialog-border, #23272f)'
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
                background: groupColor && !colorOptions.includes(groupColor) ? groupColor : 'var(--ui-dialog-border, #23272f)',
                border: !colorOptions.includes(groupColor) ? '3px solid var(--primary-color, #1976d2)' : '2px dashed var(--ui-dialog-text, #888)',
                boxShadow: !colorOptions.includes(groupColor) ? '0 0 0 4px color-mix(in srgb, var(--primary-color, #1976d2) 65%, transparent)' : '0 1px 4px rgba(0,0,0,0.10)',
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
              <span style={{ fontSize: 16, color: !colorOptions.includes(groupColor) ? '#fff' : 'var(--primary-color, #1976d2)', pointerEvents: 'none', userSelect: 'none' }}>🎨</span>
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
                  textShadow: '0 1px 4px var(--primary-color, #1976d2), 0 0 2px var(--ui-dialog-border, #23272f)',
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
  sshX11Forwarding = false, setSSHX11Forwarding = () => {},
  sshAgentForwarding = false, setSSHAgentForwarding = () => {},
  sshAutoRecording = false, setSSHAutoRecording = () => {},
  sshProxyJumpEnabled = false, setSSHProxyJumpEnabled = () => {},
  sshJumpHost = '', setSSHJumpHost = () => {},
  sshJumpPort = 22, setSSHJumpPort = () => {},
  sshJumpUser = '', setSSHJumpUser = () => {},
  sshJumpAuthMethod = 'password', setSSHJumpAuthMethod = () => {},
  sshJumpPassword = '', setSSHJumpPassword = () => {},
  sshJumpPrivateKey = '', setSSHJumpPrivateKey = () => {},
  sshHostKeyPolicy = 'warn_new', setSSHHostKeyPolicy = () => {},
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
  
  const currentIconPreset = useMemo(() => resolveSSHIconPreset(sshIcon), [sshIcon]);
  
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
      if (setSSHX11Forwarding && typeof setSSHX11Forwarding === 'function') {
        setSSHX11Forwarding(editNodeData.data?.x11Forwarding || false);
      }
      if (setSSHAgentForwarding && typeof setSSHAgentForwarding === 'function') {
        setSSHAgentForwarding(editNodeData.data?.agentForwarding || false);
      }
      if (setSSHAutoRecording && typeof setSSHAutoRecording === 'function') {
        setSSHAutoRecording(editNodeData.data?.autoRecording || false);
      }
      if (setSSHProxyJumpEnabled && typeof setSSHProxyJumpEnabled === 'function') {
        setSSHProxyJumpEnabled(editNodeData.data?.proxyJumpEnabled || false);
      }
      if (setSSHJumpHost && typeof setSSHJumpHost === 'function') {
        setSSHJumpHost(editNodeData.data?.jumpHost || '');
      }
      if (setSSHJumpPort && typeof setSSHJumpPort === 'function') {
        setSSHJumpPort(editNodeData.data?.jumpPort || 22);
      }
      if (setSSHJumpUser && typeof setSSHJumpUser === 'function') {
        setSSHJumpUser(editNodeData.data?.jumpUser || '');
      }
      if (setSSHJumpAuthMethod && typeof setSSHJumpAuthMethod === 'function') {
        setSSHJumpAuthMethod(editNodeData.data?.jumpAuthMethod === 'key' ? 'key' : 'password');
      }
      if (setSSHJumpPassword && typeof setSSHJumpPassword === 'function') {
        setSSHJumpPassword(editNodeData.data?.jumpPassword || '');
      }
      if (setSSHJumpPrivateKey && typeof setSSHJumpPrivateKey === 'function') {
        setSSHJumpPrivateKey(editNodeData.data?.jumpPrivateKey || '');
      }
      if (setSSHHostKeyPolicy && typeof setSSHHostKeyPolicy === 'function') {
        setSSHHostKeyPolicy(editNodeData.data?.hostKeyPolicy || 'warn_new');
      }
      if (setSSHDescription && typeof setSSHDescription === 'function') {
        setSSHDescription(editNodeData.data?.description || '');
      }
      if (setSSHIcon && typeof setSSHIcon === 'function') {
        setSSHIcon(editNodeData.data?.customIcon || null);
      }
    }
  }, [editNodeData, visible, setSSHName, setSSHHost, setSSHUser, setSSHPassword, setSSHAuthMethod, setSSHPrivateKey, setSSHRemoteFolder, setSSHPort, setSSHAutoCopyPassword, setSSHX11Forwarding, setSSHAgentForwarding, setSSHAutoRecording, setSSHProxyJumpEnabled, setSSHJumpHost, setSSHJumpPort, setSSHJumpUser, setSSHJumpAuthMethod, setSSHJumpPassword, setSSHJumpPrivateKey, setSSHHostKeyPolicy, setSSHDescription, setSSHIcon]);

  // Handler para seleccionar icono
  const handleIconSelect = useCallback((iconId) => {
    if (setSSHIcon && typeof setSSHIcon === 'function') {
      setSSHIcon(iconId === 'default' || iconId == null ? null : iconId);
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
          {renderSSHDialogHeaderIconContent(currentIconPreset, themeSSHIcon)}
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
        style={TERMINAL_PRO_DIALOG_STYLE}
        modal
        resizable
        onHide={onHide}
        contentStyle={TERMINAL_PRO_DIALOG_CONTENT_STYLE}
        className="terminal-pro-dialog"
        closable={false}
      >
        <div style={TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE}>
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
            sshX11Forwarding={sshX11Forwarding}
            setSSHX11Forwarding={setSSHX11Forwarding}
            sshAgentForwarding={sshAgentForwarding}
            setSSHAgentForwarding={setSSHAgentForwarding}
            sshAutoRecording={sshAutoRecording}
            setSSHAutoRecording={setSSHAutoRecording}
            sshProxyJumpEnabled={sshProxyJumpEnabled}
            setSSHProxyJumpEnabled={setSSHProxyJumpEnabled}
            sshJumpHost={sshJumpHost}
            setSSHJumpHost={setSSHJumpHost}
            sshJumpPort={sshJumpPort}
            setSSHJumpPort={setSSHJumpPort}
            sshJumpUser={sshJumpUser}
            setSSHJumpUser={setSSHJumpUser}
            sshJumpAuthMethod={sshJumpAuthMethod}
            setSSHJumpAuthMethod={setSSHJumpAuthMethod}
            sshJumpPassword={sshJumpPassword}
            setSSHJumpPassword={setSSHJumpPassword}
            sshJumpPrivateKey={sshJumpPrivateKey}
            setSSHJumpPrivateKey={setSSHJumpPrivateKey}
            sshHostKeyPolicy={sshHostKeyPolicy}
            setSSHHostKeyPolicy={setSSHHostKeyPolicy}
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
        selectedIconId={sshIcon ?? 'default'}
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
  const { t } = useTranslation('dialogs');

  const [formData, setFormData] = useState(() => createDefaultRdpFormData());
  const [showRdpPassword, setShowRdpPassword] = useState(false);

  useEffect(() => {
    if (editNodeData && visible) {
      setFormData(mapEditNodeDataToRdpFormData(editNodeData));
    }
  }, [editNodeData, visible]);

  useEffect(() => {
    if (!visible) {
      setFormData(createDefaultRdpFormData());
      setShowRdpPassword(false);
    }
  }, [visible]);

  const handleTextChange = useCallback((field) => (event) => {
    setFormData((previous) => ({ ...previous, [field]: event.target.value }));
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  }, []);

  const applyFormPatch = useCallback((patch) => {
    setFormData((previous) => ({ ...previous, ...patch }));
  }, []);

  const handleSelectFolder = useCallback(async () => {
    try {
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: t('rdp.tooltips.selectFolder')
      });

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        setFormData((previous) => ({ ...previous, guacDriveHostDir: result.filePaths[0] }));
      }
    } catch (error) {
      console.error('Error al abrir selector de carpeta:', error);
    }
  }, [t]);

  const handleSubmit = useCallback(() => {
    if (!isRdpFormValid(formData)) {
      return;
    }

    if (onSaveToSidebar) {
      onSaveToSidebar(formData, true, editNodeData);
    }
    onHide();
  }, [editNodeData, formData, onHide, onSaveToSidebar]);

  return (
    <Dialog
      header={<RdpTerminalDialogHeader title={t('rdp.title.edit').toUpperCase()} />}
      visible={visible}
      onHide={onHide}
      style={TERMINAL_PRO_DIALOG_STYLE}
      modal
      resizable
      contentStyle={TERMINAL_PRO_DIALOG_CONTENT_STYLE}
      className="terminal-pro-dialog"
      closable={false}
    >
      <div style={TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE}>
        <EnhancedRDPForm
          formData={formData}
          handleTextChange={handleTextChange}
          handleInputChange={handleInputChange}
          applyFormPatch={applyFormPatch}
          showPassword={showRdpPassword}
          setShowPassword={setShowRdpPassword}
          onSelectFolder={handleSelectFolder}
          isEditMode
          onHide={onHide}
          onSubmit={handleSubmit}
          idPrefix="edit-rdp"
        />
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

function isWallixUserString(userString) {
  return /^(.+)@(.+)@(.+):(.+):(.+)$/.test((userString || '').trim());
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
  sshX11Forwarding = false, setSSHX11Forwarding = () => {},
  sshAgentForwarding = false, setSSHAgentForwarding = () => {},
  sshAutoRecording = false, setSSHAutoRecording = () => {},
  sshProxyJumpEnabled = false, setSSHProxyJumpEnabled = () => {},
  sshJumpHost = '', setSSHJumpHost = () => {},
  sshJumpPort = 22, setSSHJumpPort = () => {},
  sshJumpUser = '', setSSHJumpUser = () => {},
  sshJumpAuthMethod = 'password', setSSHJumpAuthMethod = () => {},
  sshJumpPassword = '', setSSHJumpPassword = () => {},
  sshJumpPrivateKey = '', setSSHJumpPrivateKey = () => {},
  sshHostKeyPolicy = 'warn_new', setSSHHostKeyPolicy = () => {},
  sshDescription = '', setSSHDescription = () => {},
  foldersOptions = [],
  onSSHConfirm,
  onHide,
  onGoBack,
  sshLoading = false,
  isEditMode = false,
  layoutMode = 'standard',
  hideFooter = false
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showJumpPassword, setShowJumpPassword] = useState(false);
  const [privateKeyFileName, setPrivateKeyFileName] = useState('');
  const [jumpPrivateKeyFileName, setJumpPrivateKeyFileName] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(true);
  const [advancedOptionsTab, setAdvancedOptionsTab] = useState('general');
  const [activeFormTab, setActiveFormTab] = useState('general'); // 'general', 'auth', 'advanced'
  const [editingField, setEditingField] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Haz clic en cualquier pastilla para editar su valor.');
  
  const privateKeyInputRef = useRef(null);
  const jumpPrivateKeyInputRef = useRef(null);
  const isWallixUser = useMemo(() => isWallixUserString(sshUser), [sshUser]);
  const advancedOptionTabs = useMemo(() => {
    const tabs = [
      {
        id: 'general',
        label: t('ssh.advancedTabs.general'),
        icon: 'pi-sliders-h'
      }
    ];

    if (!isWallixUser) {
      tabs.push(
        {
          id: 'proxyJump',
          label: t('ssh.auth.proxyJump'),
          icon: 'pi-share-alt'
        },
        {
          id: 'hostKey',
          label: t('ssh.auth.hostKeyPolicy'),
          icon: 'pi-shield'
        }
      );
    }

    return tabs;
  }, [isWallixUser, t]);
  const hostKeyPolicyOptions = useMemo(() => ([
    { label: t('ssh.auth.hostKeyPolicies.warn_new'), value: 'warn_new' },
    { label: t('ssh.auth.hostKeyPolicies.known_hosts'), value: 'known_hosts' },
    { label: t('ssh.auth.hostKeyPolicies.strict'), value: 'strict' }
  ]), [t]);

  const sidebarTabs = useMemo(() => {
    const tabs = [
      { id: 'general', label: 'General', icon: 'pi pi-info-circle' },
      { id: 'auth', label: 'Autenticación', icon: 'pi pi-lock' },
      { id: 'folders', label: 'Carpetas', icon: 'pi pi-folder' }
    ];
    if (!isWallixUser) {
      tabs.push(
        { id: 'proxy', label: 'Salto SSH', icon: 'pi pi-share-alt' },
        { id: 'security', label: 'Seguridad', icon: 'pi pi-shield' }
      );
    }
    tabs.push({ id: 'advanced', label: 'Avanzado', icon: 'pi pi-cog' });
    return tabs;
  }, [isWallixUser]);

  useEffect(() => {
    if (!advancedOptionTabs.some((tab) => tab.id === advancedOptionsTab)) {
      setAdvancedOptionsTab(advancedOptionTabs[0]?.id || 'general');
    }
  }, [advancedOptionTabs, advancedOptionsTab]);

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

  const handleJumpPrivateKeyFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setJumpPrivateKeyFileName(file.name);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setSSHJumpPrivateKey(loadEvent.target?.result || '');
    };
    reader.readAsText(file);
  }, [setSSHJumpPrivateKey]);

  const isFormValid = () => {
    return sshName?.trim() && 
           sshHost?.trim() && 
           sshUser?.trim() &&
           (sshAuthMethod === 'password' ? sshPassword?.trim() : sshPrivateKey?.trim());
  };

  const renderHostPort = () => (
    <div className="terminal-host-port-row mb-3">
      <div className="terminal-host-port-host">
        <label className="terminal-label">Host / Dirección IP</label>
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
        <label className="terminal-label">Puerto</label>
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
  );

  const renderNameDesc = () => (
    <div className="terminal-row grid grid-nogutter gap-3 mb-3">
      <div className="col">
        <label className="terminal-label">Nombre de Conexión</label>
        <div className="terminal-input-wrap">
          <InputText value={sshName} onChange={(e) => setSSHName(e.target.value)} placeholder="Mi Servidor" className="terminal-input" />
        </div>
      </div>
      <div className="col">
        <label className="terminal-label">Descripción</label>
        <div className="terminal-input-wrap">
          <InputText value={sshDescription} onChange={(e) => setSSHDescription(e.target.value)} placeholder="..." className="terminal-input" />
        </div>
      </div>
    </div>
  );

  const renderAuthMethodSelector = () => (
    <div className="terminal-row mb-3">
      <label className="terminal-label">{t('ssh.auth.method')}</label>
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
  );

  const renderUserAndAuthInput = () => (
    <>
      <div className="terminal-row mb-3">
        <label className="terminal-label">Usuario</label>
        <div className="terminal-input-wrap">
          <i className="pi pi-user terminal-icon-left"></i>
          <InputText value={sshUser} onChange={(e) => setSSHUser(e.target.value)} placeholder="admin_usuario" className="terminal-input" />
        </div>
      </div>

      {sshAuthMethod === 'password' ? (
        <div className="terminal-row mb-4">
          <label className="terminal-label">{t('ssh.fields.password')}</label>
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
          <label className="terminal-label">{t('ssh.fields.privateKeySSH')}</label>
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
    </>
  );

  const renderFolderSelector = () => (
    <div className="terminal-row mb-4">
      <label className="terminal-label">
        {t('ssh.fields.targetFolder')}{' '}
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
  );

  const renderFoldersContent = () => (
    <div>
      {renderFolderSelector()}
      <div className="terminal-row mb-4">
        <label className="terminal-label">CARPETA REMOTA (INICIAL) <span className="opacity-50">({tCommon('labels.optional')})</span></label>
        <div className="terminal-input-wrap">
          <i className="pi pi-folder-open terminal-icon-left"></i>
          <InputText
            value={sshRemoteFolder}
            onChange={(e) => setSSHRemoteFolder && setSSHRemoteFolder(e.target.value)}
            placeholder={t('ssh.placeholders.remoteFolder') || '/var/www o /home/usuario'}
            className="terminal-input"
          />
        </div>
      </div>
    </div>
  );

  const renderAdvancedContent = () => (
    <div className="terminal-options-list" style={{ marginTop: 0 }}>
      <div className="terminal-advanced-tabs" role="tablist" aria-label={t('ssh.sections.advanced')}>
        {advancedOptionTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`ssh-advanced-tab-${tab.id}`}
            aria-selected={advancedOptionsTab === tab.id}
            aria-controls={`ssh-advanced-panel-${tab.id}`}
            className={`terminal-advanced-tab${advancedOptionsTab === tab.id ? ' active' : ''}`}
            onClick={() => setAdvancedOptionsTab(tab.id)}
          >
            <i className={`pi ${tab.icon}`} aria-hidden="true"></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {advancedOptionsTab === 'general' && (
        <div
          id="ssh-advanced-panel-general"
          role="tabpanel"
          aria-labelledby="ssh-advanced-tab-general"
          className="terminal-advanced-panel-pane"
        >
          <div className="terminal-options-grid">
            <div className="terminal-option-item">
              <div className="flex align-items-center">
                <i className="pi pi-save terminal-option-icon"></i>
                <span className="terminal-option-text">{t('ssh.auth.autoCopyPassword')}</span>
                <TerminalOptionHelp text={t('ssh.auth.autoCopyPasswordDescription')} />
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
                <i className="pi pi-video terminal-option-icon"></i>
                <span className="terminal-option-text">{t('ssh.auth.autoRecording')}</span>
                <TerminalOptionHelp text={t('ssh.auth.autoRecordingDescription')} />
              </div>
              <div className="terminal-dotted-spacer"></div>
              <InputSwitch
                checked={sshAutoRecording}
                onChange={(e) => setSSHAutoRecording(e.value)}
                className="terminal-switch"
              />
            </div>

            <div className="terminal-option-item">
              <div className="flex align-items-center">
                <i className="pi pi-shield terminal-option-icon"></i>
                <span className="terminal-option-text">{t('ssh.auth.agentForwarding')}</span>
                <TerminalOptionHelp text={t('ssh.auth.agentForwardingDescription')} />
              </div>
              <div className="terminal-dotted-spacer"></div>
              <InputSwitch
                checked={sshAgentForwarding}
                onChange={(e) => setSSHAgentForwarding(e.value)}
                className="terminal-switch"
              />
            </div>

            <div className="terminal-option-item">
              <div className="flex align-items-center">
                <i className="pi pi-desktop terminal-option-icon"></i>
                <span className="terminal-option-text">{t('ssh.auth.x11Forwarding')}</span>
                <TerminalOptionHelp text={t('ssh.auth.x11ForwardingDescription')} />
              </div>
              <div className="terminal-dotted-spacer"></div>
              <InputSwitch
                checked={sshX11Forwarding}
                onChange={(e) => setSSHX11Forwarding(e.value)}
                className="terminal-switch"
              />
            </div>
          </div>
        </div>
      )}

      {!isWallixUser && advancedOptionsTab === 'proxyJump' && (
        <div
          id="ssh-advanced-panel-proxyJump"
          role="tabpanel"
          aria-labelledby="ssh-advanced-tab-proxyJump"
          className="terminal-advanced-panel-pane terminal-proxyjump-panel"
        >
          <p className="terminal-proxyjump-intro">
            <i className="pi pi-question-circle terminal-proxyjump-intro-icon" aria-hidden="true"></i>
            <span>{t('ssh.auth.proxyJumpDescription')}</span>
          </p>
          <div className="terminal-host-port-row mb-2">
            <div className="terminal-host-port-host">
              <label className="terminal-label">{t('ssh.auth.jumpHost').toUpperCase()}</label>
              <div className="terminal-input-wrap">
                <InputText
                  value={sshJumpHost}
                  onChange={(e) => setSSHJumpHost(e.target.value)}
                  placeholder="jump.ejemplo.com"
                  className="terminal-input"
                />
              </div>
            </div>
            <div className="terminal-host-port-port">
              <label className="terminal-label">{t('ssh.auth.jumpPort').toUpperCase()}</label>
              <div className="terminal-input-wrap terminal-port-input-wrap">
                <InputText
                  value={sshJumpPort}
                  onChange={(e) => setSSHJumpPort(e.target.value)}
                  placeholder="22"
                  className="terminal-input terminal-port-input text-center"
                />
              </div>
            </div>
          </div>

          <div className="terminal-row mb-2">
                <label className="terminal-label">{t('ssh.auth.jumpUser').toUpperCase()}</label>
                <div className="terminal-input-wrap">
                  <InputText
                    value={sshJumpUser}
                    onChange={(e) => setSSHJumpUser(e.target.value)}
                    placeholder="jump_user"
                    className="terminal-input"
                  />
                </div>
              </div>

              <div className="terminal-row mb-2">
                <label className="terminal-label">{t('ssh.auth.method').toUpperCase()}</label>
                <div className="terminal-auth-selector">
                  <div
                    className={`terminal-auth-chip ${sshJumpAuthMethod === 'password' ? 'active' : ''}`}
                    onClick={() => {
                      setSSHJumpAuthMethod('password');
                      setSSHJumpPrivateKey('');
                      setJumpPrivateKeyFileName('');
                    }}
                  >
                    <i className="pi pi-lock"></i> {t('ssh.auth.password')}
                  </div>
                  <div
                    className={`terminal-auth-chip ${sshJumpAuthMethod === 'key' ? 'active' : ''}`}
                    onClick={() => {
                      setSSHJumpAuthMethod('key');
                      setSSHJumpPassword('');
                    }}
                  >
                    <i className="pi pi-key"></i> {t('ssh.auth.key')}
                  </div>
                </div>
              </div>

              {sshJumpAuthMethod === 'password' ? (
                <div className="terminal-row mb-0">
                  <label className="terminal-label">{t('ssh.auth.jumpPassword').toUpperCase()}</label>
                  <div className="terminal-input-wrap">
                    <InputText
                      type={showJumpPassword ? 'text' : 'password'}
                      value={sshJumpPassword}
                      onChange={(e) => setSSHJumpPassword(e.target.value)}
                      className="terminal-input"
                    />
                    <i
                      className={`pi ${showJumpPassword ? 'pi-eye-slash' : 'pi-eye'} terminal-icon-right cursor-pointer`}
                      onClick={() => setShowJumpPassword(!showJumpPassword)}
                    ></i>
                  </div>
                </div>
              ) : (
                <div className="terminal-row mb-0">
                  <label className="terminal-label">{t('ssh.auth.jumpPrivateKey').toUpperCase()}</label>
                  <div className="terminal-input-wrap terminal-key-file-wrap">
                    <span className="terminal-key-file-name opacity-60 truncate">
                      {jumpPrivateKeyFileName || (sshJumpPrivateKey ? t('ssh.auth.keyLoaded') : t('ssh.auth.keyFilePlaceholder'))}
                    </span>
                    <input
                      ref={jumpPrivateKeyInputRef}
                      type="file"
                      accept=".pem,.key,.ppk,text/plain"
                      className="terminal-key-file-input"
                      onChange={handleJumpPrivateKeyFileChange}
                    />
                    <button
                      type="button"
                      className="terminal-key-file-btn"
                      onClick={() => jumpPrivateKeyInputRef.current?.click()}
                    >
                      {t('ssh.auth.browseKeyFile')}
                    </button>
                  </div>
                </div>
              )}
        </div>
      )}

      {!isWallixUser && advancedOptionsTab === 'hostKey' && (
        <div
          id="ssh-advanced-panel-hostKey"
          role="tabpanel"
          aria-labelledby="ssh-advanced-tab-hostKey"
          className="terminal-advanced-panel-pane"
        >
          <div className="terminal-row">
            <label className="terminal-label terminal-label-with-help">
              <span>{t('ssh.auth.hostKeyPolicy').toUpperCase()}</span>
              <TerminalOptionHelp text={t('ssh.auth.hostKeyPolicyDescription')} />
            </label>
            <div className="terminal-input-wrap terminal-folder-dropdown-wrap">
              <Dropdown
                value={sshHostKeyPolicy}
                options={hostKeyPolicyOptions}
                onChange={(e) => setSSHHostKeyPolicy(e.value)}
                optionLabel="label"
                optionValue="value"
                className="terminal-folder-dropdown"
                panelClassName="terminal-folder-dropdown-panel"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render del formulario
  if (layoutMode === 'hud-badges') {
    const isFieldWarning = (field) => {
      if (field === 'name' && !sshName?.trim()) return true;
      if (field === 'host' && !sshHost?.trim()) return true;
      if (field === 'user' && !sshUser?.trim()) return true;
      if (field === 'password' && sshAuthMethod === 'password' && !sshPassword?.trim()) return true;
      if (field === 'privateKey' && sshAuthMethod === 'key' && !sshPrivateKey?.trim()) return true;
      return false;
    };

    return (
      <div className="connection-terminal-form" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0.75rem 1rem' }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', marginBottom: '1rem', paddingRight: '4px' }}>
          
          {/* Grupo 1: Conexión y Acceso */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚙️ Conexión y Acceso Básicos
            </h4>
            <div className="hud-badge-container">
              
              {/* Nombre */}
              <div 
                className={`hud-badge-pill ${editingField === 'name' ? 'editing' : ''} ${isFieldWarning('name') ? 'warning' : ''}`}
                onClick={() => { setEditingField('name'); setStatusMessage('Editando nombre de la conexión.'); }}
              >
                <i className="pi pi-tag hud-badge-icon"></i>
                <span className="hud-badge-label">Nombre:</span>
                {editingField === 'name' ? (
                  <input 
                    type="text" 
                    className="hud-badge-input" 
                    value={sshName} 
                    onChange={(e) => setSSHName(e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{sshName || 'Definir nombre...'}</span>
                )}
              </div>

              {/* Host */}
              <div 
                className={`hud-badge-pill ${editingField === 'host' ? 'editing' : ''} ${isFieldWarning('host') ? 'warning' : ''}`}
                onClick={() => { setEditingField('host'); setStatusMessage('Editando dirección IP o host del servidor.'); }}
              >
                <i className="pi pi-server hud-badge-icon"></i>
                <span className="hud-badge-label">Host:</span>
                {editingField === 'host' ? (
                  <input 
                    type="text" 
                    className="hud-badge-input" 
                    value={sshHost} 
                    onChange={(e) => setSSHHost(e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{sshHost || 'Definir host...'}</span>
                )}
              </div>

              {/* Puerto */}
              <div 
                className={`hud-badge-pill ${editingField === 'port' ? 'editing' : ''}`}
                onClick={() => { setEditingField('port'); setStatusMessage('Editando puerto SSH (por defecto 22).'); }}
              >
                <i className="pi pi-info-circle hud-badge-icon"></i>
                <span className="hud-badge-label">Puerto:</span>
                {editingField === 'port' ? (
                  <input 
                    type="number" 
                    className="hud-badge-input" 
                    style={{ width: '60px' }}
                    value={sshPort} 
                    onChange={(e) => setSSHPort(parseInt(e.target.value) || 22)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{sshPort}</span>
                )}
              </div>

              {/* Usuario */}
              <div 
                className={`hud-badge-pill ${editingField === 'user' ? 'editing' : ''} ${isFieldWarning('user') ? 'warning' : ''}`}
                onClick={() => { setEditingField('user'); setStatusMessage('Editando nombre de usuario SSH.'); }}
              >
                <i className="pi pi-user hud-badge-icon"></i>
                <span className="hud-badge-label">Usuario:</span>
                {editingField === 'user' ? (
                  <input 
                    type="text" 
                    className="hud-badge-input" 
                    value={sshUser} 
                    onChange={(e) => setSSHUser(e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{sshUser || 'Definir usuario...'}</span>
                )}
              </div>

              {/* Método Auth */}
              <div 
                className="hud-badge-pill active"
                onClick={() => {
                  const nextMethod = sshAuthMethod === 'password' ? 'key' : 'password';
                  setSSHAuthMethod(nextMethod);
                  setStatusMessage(`Cambiado método de autenticación a: ${nextMethod === 'password' ? 'Contraseña' : 'Clave privada'}`);
                }}
              >
                <i className="pi pi-key hud-badge-icon"></i>
                <span className="hud-badge-label">Auth:</span>
                <span className="hud-badge-value">{sshAuthMethod === 'password' ? 'Contraseña' : 'Clave privada'}</span>
              </div>

              {/* Contraseña (si es contraseña) */}
              {sshAuthMethod === 'password' && (
                <div 
                  className={`hud-badge-pill ${editingField === 'password' ? 'editing' : ''} ${isFieldWarning('password') ? 'warning' : ''}`}
                  onClick={() => { setEditingField('password'); setStatusMessage('Editando contraseña de acceso.'); }}
                >
                  <i className="pi pi-lock hud-badge-icon"></i>
                  <span className="hud-badge-label">Contraseña:</span>
                  {editingField === 'password' ? (
                    <input 
                      type="password" 
                      className="hud-badge-input" 
                      value={sshPassword} 
                      onChange={(e) => setSSHPassword(e.target.value)} 
                      onBlur={() => setEditingField(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                      autoFocus 
                    />
                  ) : (
                    <span className="hud-badge-value">{sshPassword ? '••••••••' : 'Definir contraseña...'}</span>
                  )}
                </div>
              )}

              {/* Clave Privada (si es clave) */}
              {sshAuthMethod === 'key' && (
                <div 
                  className={`hud-badge-pill ${isFieldWarning('privateKey') ? 'warning' : 'active'}`}
                  onClick={() => {
                    privateKeyInputRef.current?.click();
                    setStatusMessage('Abre el explorador de archivos para cargar tu clave privada.');
                  }}
                >
                  <i className="pi pi-file hud-badge-icon"></i>
                  <span className="hud-badge-label">Clave:</span>
                  <span className="hud-badge-value">
                    {privateKeyFileName || (sshPrivateKey ? 'Clave cargada' : 'Cargar clave...')}
                  </span>
                  <input
                    ref={privateKeyInputRef}
                    type="file"
                    accept=".pem,.key,.ppk,text/plain"
                    style={{ display: 'none' }}
                    onChange={handlePrivateKeyFileChange}
                  />
                </div>
              )}

              {/* Carpeta destino */}
              <div className="hud-badge-pill">
                <i className="pi pi-folder hud-badge-icon"></i>
                <span className="hud-badge-label">Carpeta local:</span>
                <Dropdown
                  value={sshTargetFolder}
                  options={foldersOptions}
                  onChange={(e) => {
                    setSSHTargetFolder(e.value);
                    setStatusMessage(`Carpeta local destino cambiada.`);
                  }}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Sin carpeta"
                  showClear
                  className="hud-dropdown-inline"
                  panelClassName="terminal-folder-dropdown-panel"
                />
              </div>

              {/* Carpeta remota */}
              <div 
                className={`hud-badge-pill ${editingField === 'remoteFolder' ? 'editing' : ''}`}
                onClick={() => { setEditingField('remoteFolder'); setStatusMessage('Editando directorio inicial en el servidor.'); }}
              >
                <i className="pi pi-folder-open hud-badge-icon"></i>
                <span className="hud-badge-label">Dir. remoto:</span>
                {editingField === 'remoteFolder' ? (
                  <input 
                    type="text" 
                    className="hud-badge-input" 
                    value={sshRemoteFolder} 
                    onChange={(e) => setSSHRemoteFolder(e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{sshRemoteFolder || '/'}</span>
                )}
              </div>

              {/* Descripción */}
              <div 
                className={`hud-badge-pill ${editingField === 'description' ? 'editing' : ''}`}
                onClick={() => { setEditingField('description'); setStatusMessage('Editando descripción para esta conexión.'); }}
              >
                <i className="pi pi-align-left hud-badge-icon"></i>
                <span className="hud-badge-label">Nota:</span>
                {editingField === 'description' ? (
                  <input 
                    type="text" 
                    className="hud-badge-input" 
                    value={sshDescription} 
                    onChange={(e) => setSSHDescription(e.target.value)} 
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                    autoFocus 
                  />
                ) : (
                  <span className="hud-badge-value">{sshDescription || 'Sin descripción...'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Grupo 2: Opciones de Sesión (Switches) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Opciones de Sesión (Clic para alternar)
            </h4>
            <div className="hud-badge-container" style={{ minHeight: 'auto' }}>
              
              {/* Auto copiar contraseña */}
              <div 
                className={`hud-badge-pill ${sshAutoCopyPassword ? 'active' : ''}`}
                onClick={() => {
                  setSSHAutoCopyPassword(!sshAutoCopyPassword);
                  setStatusMessage(`Auto-copiar contraseña: ${!sshAutoCopyPassword ? 'Activado' : 'Desactivado'}`);
                }}
              >
                <i className="pi pi-save hud-badge-icon"></i>
                <span className="hud-badge-label">Auto copiar clave:</span>
                <span className="hud-badge-value">{sshAutoCopyPassword ? 'SÍ' : 'NO'}</span>
              </div>

              {/* Auto Recording */}
              <div 
                className={`hud-badge-pill ${sshAutoRecording ? 'active' : ''}`}
                onClick={() => {
                  setSSHAutoRecording(!sshAutoRecording);
                  setStatusMessage(`Grabación automática de sesión: ${!sshAutoRecording ? 'Activada' : 'Desactivada'}`);
                }}
              >
                <i className="pi pi-video hud-badge-icon"></i>
                <span className="hud-badge-label">Grabar sesión:</span>
                <span className="hud-badge-value">{sshAutoRecording ? 'SÍ' : 'NO'}</span>
              </div>

              {/* Agent Forwarding */}
              <div 
                className={`hud-badge-pill ${sshAgentForwarding ? 'active' : ''}`}
                onClick={() => {
                  setSSHAgentForwarding(!sshAgentForwarding);
                  setStatusMessage(`Reenvío de agente SSH: ${!sshAgentForwarding ? 'Activado' : 'Desactivado'}`);
                }}
              >
                <i className="pi pi-shield hud-badge-icon"></i>
                <span className="hud-badge-label">Agente SSH:</span>
                <span className="hud-badge-value">{sshAgentForwarding ? 'SÍ' : 'NO'}</span>
              </div>

              {/* X11 Forwarding */}
              <div 
                className={`hud-badge-pill ${sshX11Forwarding ? 'active' : ''}`}
                onClick={() => {
                  setSSHX11Forwarding(!sshX11Forwarding);
                  setStatusMessage(`Reenvío de servidor gráfico X11: ${!sshX11Forwarding ? 'Activado' : 'Desactivado'}`);
                }}
              >
                <i className="pi pi-desktop hud-badge-icon"></i>
                <span className="hud-badge-label">Gráficos X11:</span>
                <span className="hud-badge-value">{sshX11Forwarding ? 'SÍ' : 'NO'}</span>
              </div>
            </div>
          </div>

          {/* Grupo 3: Salto SSH (Proxy Jump) */}
          {!isWallixUser && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.75rem 0.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🚀 Túnel y Salto (Proxy Jump)
                </h4>
                <div 
                  className={`hud-badge-pill ${sshProxyJumpEnabled ? 'active' : ''}`}
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}
                  onClick={() => {
                    setSSHProxyJumpEnabled(!sshProxyJumpEnabled);
                    setStatusMessage(`Bastión de Salto SSH: ${!sshProxyJumpEnabled ? 'Habilitado' : 'Deshabilitado'}`);
                  }}
                >
                  <span className="hud-badge-value">{sshProxyJumpEnabled ? 'HABILITADO' : 'DESHABILITADO'}</span>
                </div>
              </div>

              {sshProxyJumpEnabled && (
                <div className="hud-badge-container">
                  {/* Host Salto */}
                  <div 
                    className={`hud-badge-pill ${editingField === 'jumpHost' ? 'editing' : ''}`}
                    onClick={() => { setEditingField('jumpHost'); setStatusMessage('Editando host del servidor de salto.'); }}
                  >
                    <i className="pi pi-server hud-badge-icon"></i>
                    <span className="hud-badge-label">Host salto:</span>
                    {editingField === 'jumpHost' ? (
                      <input 
                        type="text" 
                        className="hud-badge-input" 
                        value={sshJumpHost} 
                        onChange={(e) => setSSHJumpHost(e.target.value)} 
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                        autoFocus 
                      />
                    ) : (
                      <span className="hud-badge-value">{sshJumpHost || 'Definir host...'}</span>
                    )}
                  </div>

                  {/* Puerto Salto */}
                  <div 
                    className={`hud-badge-pill ${editingField === 'jumpPort' ? 'editing' : ''}`}
                    onClick={() => { setEditingField('jumpPort'); setStatusMessage('Editando puerto de salto (por defecto 22).'); }}
                  >
                    <i className="pi pi-info-circle hud-badge-icon"></i>
                    <span className="hud-badge-label">Puerto salto:</span>
                    {editingField === 'jumpPort' ? (
                      <input 
                        type="number" 
                        className="hud-badge-input" 
                        style={{ width: '60px' }}
                        value={sshJumpPort} 
                        onChange={(e) => setSSHJumpPort(parseInt(e.target.value) || 22)} 
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                        autoFocus 
                      />
                    ) : (
                      <span className="hud-badge-value">{sshJumpPort}</span>
                    )}
                  </div>

                  {/* Usuario Salto */}
                  <div 
                    className={`hud-badge-pill ${editingField === 'jumpUser' ? 'editing' : ''}`}
                    onClick={() => { setEditingField('jumpUser'); setStatusMessage('Editando usuario de salto.'); }}
                  >
                    <i className="pi pi-user hud-badge-icon"></i>
                    <span className="hud-badge-label">Usuario salto:</span>
                    {editingField === 'jumpUser' ? (
                      <input 
                        type="text" 
                        className="hud-badge-input" 
                        value={sshJumpUser} 
                        onChange={(e) => setSSHJumpUser(e.target.value)} 
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                        autoFocus 
                      />
                    ) : (
                      <span className="hud-badge-value">{sshJumpUser || 'Definir usuario...'}</span>
                    )}
                  </div>

                  {/* Auth Salto */}
                  <div 
                    className="hud-badge-pill active"
                    onClick={() => {
                      const nextMethod = sshJumpAuthMethod === 'password' ? 'key' : 'password';
                      setSSHJumpAuthMethod(nextMethod);
                      setStatusMessage(`Cambiado método de autenticación de salto a: ${nextMethod === 'password' ? 'Contraseña' : 'Clave privada'}`);
                    }}
                  >
                    <i className="pi pi-key hud-badge-icon"></i>
                    <span className="hud-badge-label">Auth salto:</span>
                    <span className="hud-badge-value">{sshJumpAuthMethod === 'password' ? 'Contraseña' : 'Clave privada'}</span>
                  </div>

                  {/* Contraseña Salto */}
                  {sshJumpAuthMethod === 'password' && (
                    <div 
                      className={`hud-badge-pill ${editingField === 'jumpPassword' ? 'editing' : ''}`}
                      onClick={() => { setEditingField('jumpPassword'); setStatusMessage('Editando contraseña de salto.'); }}
                    >
                      <i className="pi pi-lock hud-badge-icon"></i>
                      <span className="hud-badge-label">Contraseña salto:</span>
                      {editingField === 'jumpPassword' ? (
                        <input 
                          type="password" 
                          className="hud-badge-input" 
                          value={sshJumpPassword} 
                          onChange={(e) => setSSHJumpPassword(e.target.value)} 
                          onBlur={() => setEditingField(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                          autoFocus 
                        />
                      ) : (
                        <span className="hud-badge-value">{sshJumpPassword ? '••••••••' : 'Definir contraseña...'}</span>
                      )}
                    </div>
                  )}

                  {/* Clave Salto */}
                  {sshJumpAuthMethod === 'key' && (
                    <div 
                      className="hud-badge-pill active"
                      onClick={() => {
                        jumpPrivateKeyInputRef.current?.click();
                        setStatusMessage('Abre el explorador para cargar la clave privada de salto.');
                      }}
                    >
                      <i className="pi pi-file hud-badge-icon"></i>
                      <span className="hud-badge-label">Clave salto:</span>
                      <span className="hud-badge-value">
                        {jumpPrivateKeyFileName || (sshJumpPrivateKey ? 'Clave cargada' : 'Cargar clave...')}
                      </span>
                      <input
                        ref={jumpPrivateKeyInputRef}
                        type="file"
                        accept=".pem,.key,.ppk,text/plain"
                        style={{ display: 'none' }}
                        onChange={handleJumpPrivateKeyFileChange}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Grupo 4: Seguridad */}
          {!isWallixUser && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ui-button-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🛡️ Políticas de Seguridad
              </h4>
              <div className="hud-badge-container" style={{ minHeight: 'auto' }}>
                {/* Host Key Policy */}
                <div className="hud-badge-pill">
                  <i className="pi pi-shield hud-badge-icon"></i>
                  <span className="hud-badge-label">Host Key:</span>
                  <Dropdown
                    value={sshHostKeyPolicy}
                    options={hostKeyPolicyOptions}
                    onChange={(e) => {
                      setSSHHostKeyPolicy(e.value);
                      setStatusMessage(`Política Host Key cambiada.`);
                    }}
                    optionLabel="label"
                    optionValue="value"
                    className="hud-dropdown-inline"
                    panelClassName="terminal-folder-dropdown-panel"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Barra de Estado HUD */}
        <div className="hud-status-line">
          <i className="pi pi-info-circle" style={{ color: 'var(--ui-button-primary)' }}></i>
          <span>{statusMessage}</span>
        </div>

        {/* Footer */}
        {!hideFooter && (
          <div className="terminal-footer" style={{ marginTop: '0.5rem' }}>
            <button type="button" className="terminal-btn-outline" onClick={() => {}}>
              <i className="pi pi-sync mr-2"></i> PROBAR CONEXIÓN
            </button>
            <div className="flex gap-2">
              <button type="button" className="terminal-btn-text" onClick={onHide}>CANCELAR</button>
              <button
                type="button"
                className="terminal-btn-outline terminal-btn-submit"
                onClick={handleSubmit}
                disabled={!isFormValid() || sshLoading}
              >
                <i className={sshLoading ? 'pi pi-spin pi-spinner mr-2' : isEditMode ? 'pi pi-save mr-2' : 'pi pi-angle-right mr-2'}></i>
                {sshLoading ? '_ CARGANDO...' : isEditMode ? tCommon('buttons.save').toUpperCase() : '_ CONECTAR'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render del formulario
  if (layoutMode === 'sidebar') {
    return (
      <div className="connection-terminal-form" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0.75rem 1rem' }}>
        <div className="form-layout-sidebar" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', marginBottom: '1rem' }}>
          <div className="form-sidebar-nav">
            {sidebarTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`form-sidebar-nav-btn ${activeFormTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveFormTab(tab.id)}
              >
                <i className={tab.icon}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="form-sidebar-content" style={{ overflowY: 'auto', flex: 1, paddingRight: '6px' }}>
            {activeFormTab === 'general' && (
              <div>
                {renderHostPort()}
                {renderNameDesc()}
              </div>
            )}
            {activeFormTab === 'auth' && (
              <div>
                {renderAuthMethodSelector()}
                {renderUserAndAuthInput()}
              </div>
            )}
            {activeFormTab === 'folders' && renderFoldersContent()}
            {activeFormTab === 'proxy' && (
              <div className="p-fluid">
                <h4 style={{ marginBottom: '1.25rem', marginTop: 0, fontSize: '0.9rem', fontWeight: 600 }}>Configuración de Salto SSH (Proxy Jump)</h4>
                <p className="terminal-proxyjump-intro" style={{ marginBottom: '1.25rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
                  <i className="pi pi-question-circle" style={{ fontSize: '1rem', color: 'var(--ui-button-primary)' }}></i>
                  <span>{t('ssh.auth.proxyJumpDescription')}</span>
                </p>
                <div className="terminal-host-port-row mb-3">
                  <div className="terminal-host-port-host">
                    <label className="terminal-label">HOST / IP DE SALTO</label>
                    <div className="terminal-input-wrap">
                      <InputText
                        value={sshJumpHost}
                        onChange={(e) => setSSHJumpHost(e.target.value)}
                        placeholder="jump.ejemplo.com"
                        className="terminal-input"
                      />
                    </div>
                  </div>
                  <div className="terminal-host-port-port">
                    <label className="terminal-label">PUERTO</label>
                    <div className="terminal-input-wrap terminal-port-input-wrap">
                      <InputText
                        value={sshJumpPort}
                        onChange={(e) => setSSHJumpPort(parseInt(e.target.value) || 22)}
                        placeholder="22"
                        className="terminal-input terminal-port-input text-center"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="terminal-row mb-3">
                  <label className="terminal-label">USUARIO DE SALTO</label>
                  <div className="terminal-input-wrap">
                    <i className="pi pi-user terminal-icon-left"></i>
                    <InputText
                      value={sshJumpUser}
                      onChange={(e) => setSSHJumpUser(e.target.value)}
                      placeholder="jump_user"
                      className="terminal-input"
                    />
                  </div>
                </div>

                <div className="terminal-row mb-3">
                  <label className="terminal-label">MÉTODO DE AUTENTICACIÓN</label>
                  <div className="terminal-auth-selector">
                    <div
                      className={`terminal-auth-chip ${sshJumpAuthMethod === 'password' ? 'active' : ''}`}
                      onClick={() => {
                        setSSHJumpAuthMethod('password');
                        setSSHJumpPrivateKey('');
                        setJumpPrivateKeyFileName('');
                      }}
                    >
                      <i className="pi pi-lock"></i> Contraseña
                    </div>
                    <div
                      className={`terminal-auth-chip ${sshJumpAuthMethod === 'key' ? 'active' : ''}`}
                      onClick={() => {
                        setSSHJumpAuthMethod('key');
                        setSSHJumpPassword('');
                      }}
                    >
                      <i className="pi pi-key"></i> Clave privada
                    </div>
                  </div>
                </div>

                {sshJumpAuthMethod === 'password' ? (
                  <div className="terminal-row mb-0">
                    <label className="terminal-label">CONTRASEÑA DE SALTO</label>
                    <div className="terminal-input-wrap">
                      <i className="pi pi-lock terminal-icon-left"></i>
                      <InputText
                        type={showJumpPassword ? 'text' : 'password'}
                        value={sshJumpPassword}
                        onChange={(e) => setSSHJumpPassword(e.target.value)}
                        placeholder="Contraseña"
                        className="terminal-input"
                      />
                      <i
                        className={`pi ${showJumpPassword ? 'pi-eye-slash' : 'pi-eye'} terminal-icon-right cursor-pointer`}
                        onClick={() => setShowJumpPassword(!showJumpPassword)}
                      ></i>
                    </div>
                  </div>
                ) : (
                  <div className="terminal-row mb-0">
                    <label className="terminal-label">CLAVE PRIVADA DE SALTO</label>
                    <div className="terminal-input-wrap terminal-key-file-wrap">
                      <i className="pi pi-file terminal-icon-left"></i>
                      <span className="terminal-key-file-name opacity-60 truncate">
                        {jumpPrivateKeyFileName || (sshJumpPrivateKey ? 'Clave cargada' : 'Selecciona archivo de clave')}
                      </span>
                      <input
                        ref={jumpPrivateKeyInputRef}
                        type="file"
                        accept=".pem,.key,.ppk,text/plain"
                        style={{ display: 'none' }}
                        onChange={handleJumpPrivateKeyFileChange}
                      />
                      <button
                        type="button"
                        className="terminal-key-file-btn"
                        onClick={() => jumpPrivateKeyInputRef.current?.click()}
                      >
                        Examinar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeFormTab === 'security' && (
              <div className="p-fluid">
                <h4 style={{ marginBottom: '1.25rem', marginTop: 0, fontSize: '0.9rem', fontWeight: 600 }}>Políticas de Seguridad de Host</h4>
                <div className="terminal-row">
                  <label className="terminal-label terminal-label-with-help">
                    <span>{t('ssh.auth.hostKeyPolicy').toUpperCase()}</span>
                    <TerminalOptionHelp text={t('ssh.auth.hostKeyPolicyDescription')} />
                  </label>
                  <div className="terminal-input-wrap terminal-folder-dropdown-wrap">
                    <i className="pi pi-shield terminal-icon-left"></i>
                    <Dropdown
                      value={sshHostKeyPolicy}
                      options={hostKeyPolicyOptions}
                      onChange={(e) => setSSHHostKeyPolicy(e.value)}
                      optionLabel="label"
                      optionValue="value"
                      className="terminal-folder-dropdown"
                      panelClassName="terminal-folder-dropdown-panel"
                    />
                  </div>
                </div>
              </div>
            )}
            {activeFormTab === 'advanced' && (
              <div>
                <h4 style={{ marginBottom: '1.25rem', marginTop: 0, fontSize: '0.9rem', fontWeight: 600 }}>Opciones Avanzadas</h4>
                <div className="terminal-options-grid" style={{ gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                  <div className="terminal-option-item" style={{ padding: '0.5rem 0' }}>
                    <div className="flex align-items-center">
                      <i className="pi pi-save terminal-option-icon"></i>
                      <span className="terminal-option-text">{t('ssh.auth.autoCopyPassword')}</span>
                      <TerminalOptionHelp text={t('ssh.auth.autoCopyPasswordDescription')} />
                    </div>
                    <div className="terminal-dotted-spacer"></div>
                    <InputSwitch
                      checked={sshAutoCopyPassword}
                      onChange={(e) => setSSHAutoCopyPassword(e.value)}
                      className="terminal-switch"
                      disabled={sshAuthMethod === 'key'}
                    />
                  </div>

                  <div className="terminal-option-item" style={{ padding: '0.5rem 0' }}>
                    <div className="flex align-items-center">
                      <i className="pi pi-video terminal-option-icon"></i>
                      <span className="terminal-option-text">{t('ssh.auth.autoRecording')}</span>
                      <TerminalOptionHelp text={t('ssh.auth.autoRecordingDescription')} />
                    </div>
                    <div className="terminal-dotted-spacer"></div>
                    <InputSwitch
                      checked={sshAutoRecording}
                      onChange={(e) => setSSHAutoRecording(e.value)}
                      className="terminal-switch"
                    />
                  </div>

                  <div className="terminal-option-item" style={{ padding: '0.5rem 0' }}>
                    <div className="flex align-items-center">
                      <i className="pi pi-shield terminal-option-icon"></i>
                      <span className="terminal-option-text">{t('ssh.auth.agentForwarding')}</span>
                      <TerminalOptionHelp text={t('ssh.auth.agentForwardingDescription')} />
                    </div>
                    <div className="terminal-dotted-spacer"></div>
                    <InputSwitch
                      checked={sshAgentForwarding}
                      onChange={(e) => setSSHAgentForwarding(e.value)}
                      className="terminal-switch"
                    />
                  </div>

                  <div className="terminal-option-item" style={{ padding: '0.5rem 0' }}>
                    <div className="flex align-items-center">
                      <i className="pi pi-desktop terminal-option-icon"></i>
                      <span className="terminal-option-text">{t('ssh.auth.x11Forwarding')}</span>
                      <TerminalOptionHelp text={t('ssh.auth.x11ForwardingDescription')} />
                    </div>
                    <div className="terminal-dotted-spacer"></div>
                    <InputSwitch
                      checked={sshX11Forwarding}
                      onChange={(e) => setSSHX11Forwarding(e.value)}
                      className="terminal-switch"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Terminal */}
        {!hideFooter && (
          <div className="terminal-footer">
            <button type="button" className="terminal-btn-outline" onClick={() => {}}>
              <i className="pi pi-sync mr-2"></i> PROBAR CONEXIÓN
            </button>
            <div className="flex gap-2">
              <button type="button" className="terminal-btn-text" onClick={onHide}>CANCELAR</button>
              <button
                type="button"
                className="terminal-btn-outline terminal-btn-submit"
                onClick={handleSubmit}
                disabled={!isFormValid() || sshLoading}
              >
                <i className={sshLoading ? 'pi pi-spin pi-spinner mr-2' : isEditMode ? 'pi pi-save mr-2' : 'pi pi-angle-right mr-2'}></i>
                {sshLoading ? '_ CARGANDO...' : isEditMode ? tCommon('buttons.save').toUpperCase() : '_ CONECTAR'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="connection-terminal-form" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0.75rem 1rem' }}>
      
      {layoutMode === 'tabbed' && (
        <div className="form-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.08))', paddingBottom: '0.5rem' }}>
          {[
            { id: 'general', label: 'General', icon: 'pi-info-circle' },
            { id: 'auth', label: 'Autenticación', icon: 'pi-lock' },
            { id: 'advanced', label: 'Opciones Avanzadas', icon: 'pi-cog' }
          ].map(ft => (
            <button
              key={ft.id}
              type="button"
              onClick={() => setActiveFormTab(ft.id)}
              style={{
                background: activeFormTab === ft.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: activeFormTab === ft.id ? 'var(--ui-button-primary, #6366f1)' : 'rgba(255, 255, 255, 0.6)',
                border: 'none',
                borderBottom: activeFormTab === ft.id ? '2px solid var(--ui-button-primary, #6366f1)' : 'none',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s ease'
              }}
            >
              <i className={`pi ${ft.icon}`}></i>
              {ft.label}
            </button>
          ))}
        </div>
      )}

      <div className="terminal-form-scroll-area" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
        
        {layoutMode === 'split' ? (
          <div className="grid" style={{ gap: '0' }}>
            <div className="col-12 md:col-6" style={{ padding: '0 1rem 0 0' }}>
              {renderHostPort()}
              {renderNameDesc()}
              {renderAuthMethodSelector()}
              {renderUserAndAuthInput()}
            </div>
            
            <div className="col-12 md:col-6" style={{ padding: '0 0 0 1rem', borderLeft: '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.08))' }}>
              {renderFolderSelector()}
              <div className="terminal-options-section-title mb-2">OPCIONES AVANZADAS</div>
              {renderAdvancedContent()}
            </div>
          </div>
        ) : layoutMode === 'tabbed' ? (
          <div>
            {activeFormTab === 'general' && (
              <div>
                {renderHostPort()}
                {renderNameDesc()}
                {renderFolderSelector()}
              </div>
            )}
            
            {activeFormTab === 'auth' && (
              <div>
                {renderAuthMethodSelector()}
                {renderUserAndAuthInput()}
              </div>
            )}
            
            {activeFormTab === 'advanced' && (
              <div>
                {renderAdvancedContent()}
              </div>
            )}
          </div>
        ) : (
          /* Standard Layout */
          <>
            {renderHostPort()}
            {renderNameDesc()}
            {renderAuthMethodSelector()}
            {renderUserAndAuthInput()}
            {renderFolderSelector()}

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

              {showAdvancedOptions && renderAdvancedContent()}
            </div>
          </>
        )}

      </div>

      {/* Footer Terminal */}
      {!hideFooter && (
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
      )}
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
  sshX11Forwarding = false, setSSHX11Forwarding = () => {},
  sshAgentForwarding = false, setSSHAgentForwarding = () => {},
  sshAutoRecording = false, setSSHAutoRecording = () => {},
  sshProxyJumpEnabled = false, setSSHProxyJumpEnabled = () => {},
  sshJumpHost = '', setSSHJumpHost = () => {},
  sshJumpPort = 22, setSSHJumpPort = () => {},
  sshJumpUser = '', setSSHJumpUser = () => {},
  sshJumpAuthMethod = 'password', setSSHJumpAuthMethod = () => {},
  sshJumpPassword = '', setSSHJumpPassword = () => {},
  sshJumpPrivateKey = '', setSSHJumpPrivateKey = () => {},
  sshHostKeyPolicy = 'warn_new', setSSHHostKeyPolicy = () => {},
  sshDescription = '', setSSHDescription = () => {},
  sshIcon = null, setSSHIcon = () => {},
  foldersOptions = [],
  onSSHConfirm,
  sshLoading = false,
  iconTheme = 'material'
}) {
  const { t } = useTranslation('dialogs');
  const [showIconSelector, setShowIconSelector] = useState(false);

  // Reset fields on dialog open
  useEffect(() => {
    if (visible) {
      if (setSSHName) setSSHName('');
      if (setSSHHost) setSSHHost('');
      if (setSSHUser) setSSHUser('');
      if (setSSHPassword) setSSHPassword('');
      if (setSSHRemoteFolder) setSSHRemoteFolder('');
      if (setSSHPort) setSSHPort(22);
      if (setSSHTargetFolder) setSSHTargetFolder(null);
      if (setSSHAutoCopyPassword) setSSHAutoCopyPassword(false);
      if (setSSHX11Forwarding) setSSHX11Forwarding(false);
      if (setSSHAgentForwarding) setSSHAgentForwarding(false);
      if (setSSHAutoRecording) setSSHAutoRecording(false);
      if (setSSHProxyJumpEnabled) setSSHProxyJumpEnabled(false);
      if (setSSHJumpHost) setSSHJumpHost('');
      if (setSSHJumpPort) setSSHJumpPort(22);
      if (setSSHJumpUser) setSSHJumpUser('');
      if (setSSHJumpAuthMethod) setSSHJumpAuthMethod('password');
      if (setSSHJumpPassword) setSSHJumpPassword('');
      if (setSSHJumpPrivateKey) setSSHJumpPrivateKey('');
      if (setSSHHostKeyPolicy) setSSHHostKeyPolicy('warn_new');
      if (setSSHDescription) setSSHDescription('');
      if (setSSHIcon) setSSHIcon(null);
      if (setSSHAuthMethod) setSSHAuthMethod('password');
      if (setSSHPrivateKey) setSSHPrivateKey('');
    }
  }, [
    visible,
    setSSHName, setSSHHost, setSSHUser, setSSHPassword, setSSHRemoteFolder, setSSHPort,
    setSSHTargetFolder, setSSHAutoCopyPassword, setSSHX11Forwarding, setSSHAgentForwarding,
    setSSHAutoRecording, setSSHProxyJumpEnabled, setSSHJumpHost, setSSHJumpPort, setSSHJumpUser,
    setSSHJumpAuthMethod, setSSHJumpPassword, setSSHJumpPrivateKey, setSSHHostKeyPolicy,
    setSSHDescription, setSSHIcon, setSSHAuthMethod, setSSHPrivateKey
  ]);

  const currentIconPreset = useMemo(() => resolveSSHIconPreset(sshIcon), [sshIcon]);
  const themeSSHIcon = useMemo(() => {
    const theme = iconThemes[iconTheme] || iconThemes.material;
    return theme?.icons?.ssh || null;
  }, [iconTheme]);

  const handleIconSelect = useCallback((iconId) => {
    if (setSSHIcon && typeof setSSHIcon === 'function') {
      setSSHIcon(iconId === 'default' || iconId == null ? null : iconId);
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
          {renderSSHDialogHeaderIconContent(currentIconPreset, themeSSHIcon)}
        </button>
        <span className="terminal-header-title">{t('ssh.title.new').toUpperCase()}</span>
      </div>
      <div className="terminal-header-accent"></div>
    </div>
  );

  return (
    <>
    <Dialog
      header={headerTemplate}
      visible={visible}
      style={TERMINAL_PRO_DIALOG_STYLE}
      modal
      resizable
      onHide={onHide}
      contentStyle={TERMINAL_PRO_DIALOG_CONTENT_STYLE}
      className="terminal-pro-dialog"
      closable={false}
    >
      <div style={TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE}>
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
          sshX11Forwarding={sshX11Forwarding}
          setSSHX11Forwarding={setSSHX11Forwarding}
          sshAgentForwarding={sshAgentForwarding}
          setSSHAgentForwarding={setSSHAgentForwarding}
          sshAutoRecording={sshAutoRecording}
          setSSHAutoRecording={setSSHAutoRecording}
          sshProxyJumpEnabled={sshProxyJumpEnabled}
          setSSHProxyJumpEnabled={setSSHProxyJumpEnabled}
          sshJumpHost={sshJumpHost}
          setSSHJumpHost={setSSHJumpHost}
          sshJumpPort={sshJumpPort}
          setSSHJumpPort={setSSHJumpPort}
          sshJumpUser={sshJumpUser}
          setSSHJumpUser={setSSHJumpUser}
          sshJumpAuthMethod={sshJumpAuthMethod}
          setSSHJumpAuthMethod={setSSHJumpAuthMethod}
          sshJumpPassword={sshJumpPassword}
          setSSHJumpPassword={setSSHJumpPassword}
          sshJumpPrivateKey={sshJumpPrivateKey}
          setSSHJumpPrivateKey={setSSHJumpPrivateKey}
          sshHostKeyPolicy={sshHostKeyPolicy}
          setSSHHostKeyPolicy={setSSHHostKeyPolicy}
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

    <SSHIconSelectorModal
      visible={showIconSelector}
      onHide={() => setShowIconSelector(false)}
      selectedIconId={sshIcon ?? 'default'}
      onSelectIcon={handleIconSelect}
    />
    </>
  );
}

// --- NewRDPConnectionDialog: Diálogo simple solo para RDP ---
export function NewRDPConnectionDialog({
  visible,
  onHide,
  onGoBack,
  onSaveToSidebar
}) {
  const { t } = useTranslation('dialogs');

  const [formData, setFormData] = useState(() => createDefaultRdpFormData());
  const [showRdpPassword, setShowRdpPassword] = useState(false);

  useEffect(() => {
    if (!visible) {
      setFormData(createDefaultRdpFormData());
      setShowRdpPassword(false);
    }
  }, [visible]);

  const handleTextChange = useCallback((field) => (event) => {
    setFormData((previous) => ({ ...previous, [field]: event.target.value }));
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  }, []);

  const applyFormPatch = useCallback((patch) => {
    setFormData((previous) => ({ ...previous, ...patch }));
  }, []);

  const handleSelectFolder = useCallback(async () => {
    try {
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: t('rdp.tooltips.selectFolder')
      });

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        setFormData((previous) => ({ ...previous, guacDriveHostDir: result.filePaths[0] }));
      }
    } catch (error) {
      console.error('Error al abrir selector de carpeta:', error);
    }
  }, [t]);

  const handleSubmit = useCallback(() => {
    if (!isRdpFormValid(formData)) {
      return;
    }

    if (onSaveToSidebar) {
      onSaveToSidebar(formData, false, null);
    }
    onHide();
  }, [formData, onHide, onSaveToSidebar]);

  return (
    <Dialog
      header={<RdpTerminalDialogHeader title={t('rdp.title.new').toUpperCase()} />}
      visible={visible}
      onHide={onHide}
      style={TERMINAL_PRO_DIALOG_STYLE}
      modal
      resizable
      contentStyle={TERMINAL_PRO_DIALOG_CONTENT_STYLE}
      className="terminal-pro-dialog"
      closable={false}
    >
      <div style={TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE}>
        <EnhancedRDPForm
          formData={formData}
          handleTextChange={handleTextChange}
          handleInputChange={handleInputChange}
          applyFormPatch={applyFormPatch}
          showPassword={showRdpPassword}
          setShowPassword={setShowRdpPassword}
          onSelectFolder={handleSelectFolder}
          onHide={onHide}
          onGoBack={onGoBack}
          onSubmit={handleSubmit}
          idPrefix="create-rdp"
        />
      </div>
    </Dialog>
  );
}

// --- NewVNCConnectionDialog: Diálogo simple para VNC ---
export function NewVNCConnectionDialog({
  visible,
  onHide,
  onGoBack,
  onSaveToSidebar
}) {
  const { t } = useTranslation('dialogs');

  const [formData, setFormData] = useState(() => createDefaultVncFormData());
  const [showVncPassword, setShowVncPassword] = useState(false);

  useEffect(() => {
    if (!visible) {
      setFormData(createDefaultVncFormData());
      setShowVncPassword(false);
    }
  }, [visible]);

  const handleTextChange = useCallback((field) => (event) => {
    setFormData((previous) => ({ ...previous, [field]: event.target.value }));
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!isVncFormValid(formData)) {
      return;
    }

    if (onSaveToSidebar) {
      onSaveToSidebar(formData, false, null);
    }
    onHide();
  }, [formData, onHide, onSaveToSidebar]);

  return (
    <Dialog
      header={<VncTerminalDialogHeader title={t('vnc.title.new')} />}
      visible={visible}
      onHide={onHide}
      style={TERMINAL_PRO_DIALOG_STYLE}
      modal
      resizable
      contentStyle={TERMINAL_PRO_DIALOG_CONTENT_STYLE}
      className="terminal-pro-dialog"
      closable={false}
    >
      <div style={TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE}>
        <EnhancedVNCForm
          formData={formData}
          handleTextChange={handleTextChange}
          handleInputChange={handleInputChange}
          showPassword={showVncPassword}
          setShowPassword={setShowVncPassword}
          onHide={onHide}
          onGoBack={onGoBack}
          onSubmit={handleSubmit}
          idPrefix="create-vnc"
        />
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
  const { t } = useTranslation('dialogs');

  const [formData, setFormData] = useState(() => createDefaultVncFormData());
  const [showVncPassword, setShowVncPassword] = useState(false);

  useEffect(() => {
    if (editNodeData && visible) {
      setFormData(mapEditNodeDataToVncFormData(editNodeData));
    }
  }, [editNodeData, visible]);

  useEffect(() => {
    if (!visible) {
      setFormData(createDefaultVncFormData());
      setShowVncPassword(false);
    }
  }, [visible]);

  const handleTextChange = useCallback((field) => (event) => {
    setFormData((previous) => ({ ...previous, [field]: event.target.value }));
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!isVncFormValid(formData)) {
      return;
    }

    if (onSaveToSidebar && editNodeData) {
      onSaveToSidebar(formData, true, editNodeData);
    }
    onHide();
  }, [editNodeData, formData, onHide, onSaveToSidebar]);

  return (
    <Dialog
      header={<VncTerminalDialogHeader title={t('vnc.title.edit')} />}
      visible={visible}
      onHide={onHide}
      style={TERMINAL_PRO_DIALOG_STYLE}
      modal
      resizable
      contentStyle={TERMINAL_PRO_DIALOG_CONTENT_STYLE}
      className="terminal-pro-dialog"
      closable={false}
    >
      <div style={TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE}>
        <EnhancedVNCForm
          formData={formData}
          handleTextChange={handleTextChange}
          handleInputChange={handleInputChange}
          showPassword={showVncPassword}
          setShowPassword={setShowVncPassword}
          isEditMode
          onHide={onHide}
          onSubmit={handleSubmit}
          idPrefix="edit-vnc"
        />
      </div>
    </Dialog>
  );
}


const PROTOCOL_SECTION_KEYS = ['remoteAccess', 'fileTransfer', 'secrets'];

const PROTOCOL_PICKER_DIALOG_STYLE = {
  ...TERMINAL_PRO_DIALOG_STYLE,
  width: '760px',
  minWidth: '560px',
  minHeight: '380px',
  maxHeight: '90vh'
};

// --- ProtocolSelectionDialog: categorías + lista compacta (alineado con diálogos terminal-pro) ---
export function ProtocolSelectionDialog({
  visible,
  onHide,
  onSelectProtocol,
  iconTheme = 'material',
  initialCategory = null // 'remoteAccess' | 'fileTransfer' | 'secrets'
}) {
  const { t } = useTranslation('dialogs');

  const [selectedCategoryKey, setSelectedCategoryKey] = useState('remoteAccess');

  useEffect(() => {
    if (!visible) {
      return;
    }
    const key =
      initialCategory && PROTOCOL_SECTION_KEYS.includes(initialCategory)
        ? initialCategory
        : 'remoteAccess';
    setSelectedCategoryKey(key);
  }, [visible, initialCategory]);

  const protocolSections = useMemo(
    () => [
      {
        sectionKey: 'remoteAccess',
        title: t('protocolSelection.categories.remoteAccess'),
        protocols: [
          {
            id: 'ssh',
            listTitle: t('protocolSelection.protocols.ssh.listTitle'),
            tagline: t('protocolSelection.protocols.ssh.tagline'),
            icon: 'pi pi-server',
            iconColor: '#2196F3',
            infoBadge: t('protocolSelection.badges.secure'),
            infoBadgeTone: 'secure',
            isRecommended: false,
            isInsecure: false
          },
          {
            id: 'rdp',
            listTitle: t('protocolSelection.protocols.rdp.listTitle'),
            tagline: t('protocolSelection.protocols.rdp.tagline'),
            icon: 'pi pi-desktop',
            iconColor: '#4CAF50',
            infoBadge: t('protocolSelection.badges.windows'),
            infoBadgeTone: 'windows',
            isRecommended: false,
            isInsecure: false
          },
          {
            id: 'vnc',
            listTitle: t('protocolSelection.protocols.vnc.listTitle'),
            tagline: t('protocolSelection.protocols.vnc.tagline'),
            icon: 'pi pi-eye',
            iconColor: '#FF5722',
            infoBadge: t('protocolSelection.badges.crossPlatform'),
            infoBadgeTone: 'cross',
            isRecommended: false,
            isInsecure: false
          },
          {
            id: 'ssh-tunnel',
            listTitle: t('protocolSelection.protocols.sshTunnel.listTitle'),
            tagline: t('protocolSelection.protocols.sshTunnel.tagline'),
            icon: 'pi pi-share-alt',
            iconColor: '#89b4fa',
            infoBadge: t('protocolSelection.badges.secure'),
            infoBadgeTone: 'secure',
            isRecommended: false,
            isInsecure: false
          }
        ]
      },
      {
        sectionKey: 'fileTransfer',
        title: t('protocolSelection.categories.fileTransfer'),
        protocols: [
          {
            id: 'sftp',
            listTitle: t('protocolSelection.protocols.sftp.listTitle'),
            tagline: t('protocolSelection.protocols.sftp.tagline'),
            icon: 'pi pi-folder-open',
            iconColor: '#FF9800',
            infoBadge: t('protocolSelection.badges.secure'),
            infoBadgeTone: 'secure',
            isRecommended: true,
            isInsecure: false
          },
          {
            id: 'ftp',
            listTitle: t('protocolSelection.protocols.ftp.listTitle'),
            tagline: t('protocolSelection.protocols.ftp.tagline'),
            icon: 'pi pi-cloud-upload',
            iconColor: '#9C27B0',
            isRecommended: false,
            isInsecure: true
          },
          {
            id: 'scp',
            listTitle: t('protocolSelection.protocols.scp.listTitle'),
            tagline: t('protocolSelection.protocols.scp.tagline'),
            icon: 'pi pi-copy',
            iconColor: '#00BCD4',
            infoBadge: t('protocolSelection.badges.secure'),
            infoBadgeTone: 'secure',
            isRecommended: false,
            isInsecure: false
          }
        ]
      },
      {
        sectionKey: 'secrets',
        title: t('protocolSelection.categories.secretsManagement'),
        protocols: [
          {
            id: 'password',
            listTitle: t('protocolSelection.protocols.password.listTitle'),
            tagline: t('protocolSelection.protocols.password.tagline'),
            icon: 'pi pi-lock',
            iconColor: '#E91E63',
            infoBadge: t('protocolSelection.badges.vault'),
            infoBadgeTone: 'vault',
            isRecommended: false,
            isInsecure: false
          },
          {
            id: 'crypto_wallet',
            listTitle: t('protocolSelection.protocols.crypto_wallet.listTitle'),
            tagline: t('protocolSelection.protocols.crypto_wallet.tagline'),
            icon: 'pi pi-wallet',
            iconColor: '#F7931A',
            infoBadge: t('protocolSelection.badges.bip39'),
            infoBadgeTone: 'bip39',
            isRecommended: false,
            isInsecure: false
          },
          {
            id: 'api_key',
            listTitle: t('protocolSelection.protocols.api_key.listTitle'),
            tagline: t('protocolSelection.protocols.api_key.tagline'),
            icon: 'pi pi-key',
            iconColor: '#00BCD4',
            infoBadge: t('protocolSelection.badges.api'),
            infoBadgeTone: 'api',
            isRecommended: false,
            isInsecure: false
          },
          {
            id: 'secure_note',
            listTitle: t('protocolSelection.protocols.secure_note.listTitle'),
            tagline: t('protocolSelection.protocols.secure_note.tagline'),
            icon: 'pi pi-file-edit',
            iconColor: '#9C27B0',
            infoBadge: t('protocolSelection.badges.notes'),
            infoBadgeTone: 'notes',
            isRecommended: false,
            isInsecure: false
          }
        ]
      }
    ],
    [t]
  );

  const handleProtocolSelect = useCallback(
    (protocolId) => {
      const secretTypes = ['password', 'crypto_wallet', 'api_key', 'secure_note'];

      if (secretTypes.includes(protocolId)) {
        window.dispatchEvent(new CustomEvent('open-password-manager'));
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('open-new-secret-dialog', {
              detail: { secretType: protocolId }
            })
          );
        }, 100);
        onHide();
        return;
      }

      if (onSelectProtocol) {
        onSelectProtocol(protocolId);
      }
      onHide();
    },
    [onHide, onSelectProtocol]
  );

  const currentSection = useMemo(
    () =>
      protocolSections.find((section) => section.sectionKey === selectedCategoryKey) ||
      protocolSections[0],
    [protocolSections, selectedCategoryKey]
  );

  const activeThemeIcons = useMemo(() => {
    const themeKey = String(iconTheme || 'material').toLowerCase();
    return (iconThemes[themeKey] || iconThemes.material || iconThemes.nord)?.icons || {};
  }, [iconTheme]);

  const renderProtocolIcon = useCallback((protocol) => {
    const themeIcon =
      activeThemeIcons[protocol.id] ||
      // Algunos temas usan claves alternativas para VNC/túnel.
      (protocol.id === 'vnc' ? activeThemeIcons.rdp : null) ||
      (protocol.id === 'ssh-tunnel' ? activeThemeIcons['ssh-tunnel'] : null);

    if (themeIcon) {
      return (
        <span className="protocol-option-row-icon protocol-option-row-icon--themed" aria-hidden>
          {React.cloneElement(themeIcon, {
            width: 19,
            height: 19,
            style: {
              ...(themeIcon.props?.style || {}),
              width: '19px',
              height: '19px',
              display: 'block'
            }
          })}
        </span>
      );
    }

    return (
      <div
        className="protocol-option-row-icon"
        style={{ backgroundColor: protocol.iconColor }}
        aria-hidden
      >
        <i className={protocol.icon} />
      </div>
    );
  }, [activeThemeIcons]);

  const headerTitle = String(t('protocolSelection.headerTitle') || t('protocolSelection.title')).toUpperCase();

  const headerTemplate = (
    <div className="terminal-header-compact">
      <div className="flex align-items-center gap-2">
        <div className="terminal-header-icon-mini">
          <i className="pi pi-plus" aria-hidden="true" />
        </div>
        <span className="terminal-header-title">{headerTitle}</span>
      </div>
      <div className="terminal-header-accent" aria-hidden="true" />
    </div>
  );

  return (
    <Dialog
      header={headerTemplate}
      visible={visible}
      onHide={onHide}
      style={PROTOCOL_PICKER_DIALOG_STYLE}
      modal
      resizable
      className="terminal-pro-dialog protocol-selection-dialog-new protocol-selection-picker-compact"
      contentStyle={TERMINAL_PRO_DIALOG_CONTENT_STYLE}
      closable
    >
      <div className="protocol-selection-layout">
        <div className="protocol-categories-panel" role="tablist" aria-label={t('protocolSelection.title')}>
          {protocolSections.map((section) => (
            <div
              key={section.sectionKey}
              role="tab"
              tabIndex={0}
              aria-selected={selectedCategoryKey === section.sectionKey}
              className={`protocol-category-item ${selectedCategoryKey === section.sectionKey ? 'active' : ''}`}
              data-section-key={section.sectionKey}
              onClick={() => setSelectedCategoryKey(section.sectionKey)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedCategoryKey(section.sectionKey);
                }
              }}
            >
              <span className="protocol-category-title">{section.title}</span>
            </div>
          ))}
        </div>

        <div className="protocol-options-panel protocol-options-panel--compact" role="tabpanel">
          {currentSection.protocols.map((protocol) => (
            <div
              key={protocol.id}
              role="button"
              tabIndex={0}
              className="protocol-option-row"
              data-protocol={protocol.id}
              onClick={() => handleProtocolSelect(protocol.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleProtocolSelect(protocol.id);
                }
              }}
            >
              {renderProtocolIcon(protocol)}
              <div className="protocol-option-row-main">
                <div className="protocol-option-row-titleline">
                  <span className="protocol-option-row-title">{protocol.listTitle}</span>
                  <span className="protocol-option-row-pills">
                    {protocol.isInsecure ? (
                      <span className="protocol-option-row-pill protocol-option-row-pill--warn">
                        {t('protocolSelection.badges.insecure')}
                      </span>
                    ) : null}
                    {protocol.isRecommended ? (
                      <span className="protocol-option-row-pill protocol-option-row-pill--info">
                        {t('protocolSelection.badges.recommended')}
                      </span>
                    ) : null}
                    {protocol.infoBadge ? (
                      <span
                        className={`protocol-option-row-pill protocol-option-row-pill--${protocol.infoBadgeTone || 'neutral'}`}
                      >
                        {protocol.infoBadge}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="protocol-option-row-tagline">{protocol.tagline}</div>
              </div>
              <i className="pi pi-angle-right protocol-option-row-chevron" aria-hidden />
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

 