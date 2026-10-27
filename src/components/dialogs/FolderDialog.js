import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { InputText } from 'primereact/inputtext';
import { ColorSelector } from '../ColorSelector';
import { FolderIconSelectorModal, FolderIconRenderer, FolderIconPresets } from '../FolderIconSelector';
import { iconThemes } from '../../themes/icon-themes';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import AppDialog from '../ui/AppDialog';

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
    <AppDialog
      headerIcon={`pi ${isEdit ? 'pi-pencil' : 'pi-folder-plus'}`}
      headerTitle={isEdit ? t('folder.title.edit') : t('folder.title.new')}
      headerSubtitle={isEdit ? t('folder.subtitle.edit') : t('folder.subtitle.new')}
      visible={visible}
      size="md"
      onHide={onHide}
      className="folder-dialog"
      cancelLabel={tCommon('buttons.cancel')}
      confirmLabel={isEdit ? t('folder.buttons.saveChanges') : t('folder.buttons.create')}
      confirmIcon={isEdit ? 'pi pi-save' : 'pi pi-plus'}
      loading={loading}
      confirmDisabled={!folderName?.trim()}
      onConfirm={() => {
        if (setFolderIcon && typeof setFolderIcon === 'function') {
          setFolderIcon(currentFolderIcon);
        }
        onConfirm();
      }}
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

      <FolderIconSelectorModal
        visible={showIconSelector}
        onHide={() => setShowIconSelector(false)}
        selectedIconId={hasCustomIcon ? selectedPreset.id : 'general'}
        onSelectIcon={handleIconSelect}
      />
    </AppDialog>
  );
}
