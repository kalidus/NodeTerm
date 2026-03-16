import React, { useState, useEffect, useCallback } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { presetManager } from '../utils/presetManager';

/**
 * PresetSelector renders the Appearance > Presets settings section.
 * It shows built-in and user presets as cards. Users can apply any preset,
 * save their current configuration as a new preset, rename, and delete
 * user-defined presets.
 */
const PresetSelector = () => {
  const { t } = useTranslation('settings');

  const [allPresets, setAllPresets] = useState(() => presetManager.getAllPresets());
  const [activePresetId, setActivePresetId] = useState(() => presetManager.getActivePresetId());
  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetIcon, setNewPresetIcon] = useState('⭐');
  const [renameDialogVisible, setRenameDialogVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmUpdateId, setConfirmUpdateId] = useState(null);
  const [applyingId, setApplyingId] = useState(null);

  // Refresh preset list when presetManager notifies changes
  const refresh = useCallback(() => {
    setAllPresets(presetManager.getAllPresets());
    setActivePresetId(presetManager.getActivePresetId());
  }, []);

  useEffect(() => {
    const unsub = presetManager.subscribe(refresh);
    return unsub;
  }, [refresh]);

  // ─── Apply ──────────────────────────────────────────────────────────────────

  const handleApply = (preset) => {
    setApplyingId(preset.id);
    presetManager.applyPreset(preset);
    setActivePresetId(preset.id);
    setTimeout(() => setApplyingId(null), 800);
  };

  // ─── Save current ────────────────────────────────────────────────────────────

  const handleSaveOpen = () => {
    setNewPresetName('');
    setNewPresetIcon('⭐');
    setSaveDialogVisible(true);
  };

  const handleSaveConfirm = () => {
    const name = newPresetName.trim();
    if (!name) return;
    presetManager.saveCurrentAsPreset(name, newPresetIcon || '⭐');
    setSaveDialogVisible(false);
  };

  // ─── Rename ──────────────────────────────────────────────────────────────────

  const handleRenameOpen = (preset) => {
    setRenameTarget(preset);
    setRenameValue(preset.name);
    setRenameDialogVisible(true);
  };

  const handleRenameConfirm = () => {
    if (renameTarget && renameValue.trim()) {
      presetManager.renameUserPreset(renameTarget.id, renameValue.trim());
    }
    setRenameDialogVisible(false);
    setRenameTarget(null);
  };

  // ─── Update (overwrite) ──────────────────────────────────────────────────────

  const handleUpdateConfirm = (id) => {
    presetManager.updateUserPreset(id);
    setConfirmUpdateId(null);
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = (id) => {
    presetManager.deleteUserPreset(id);
    setConfirmDeleteId(null);
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const builtins = allPresets.filter(p => p.isBuiltin);
  const userPresets = allPresets.filter(p => !p.isBuiltin);

  const renderPresetCard = (preset) => {
    const isActive = activePresetId === preset.id;
    const isApplying = applyingId === preset.id;
    const isConfirmingDelete = confirmDeleteId === preset.id;
    const isConfirmingUpdate = confirmUpdateId === preset.id;

    return (
      <div
        key={preset.id}
        className={`preset-card ${isActive ? 'preset-card--active' : ''}`}
        title={preset.description || preset.name}
      >
        <div className="preset-card__content">
          <div className="preset-card__header-info">
            <span className="preset-card__icon">{preset.icon || '🎨'}</span>
            <div className="preset-card__meta">
              <span className="preset-card__name">{preset.name}</span>
              {preset.description && (
                <span className="preset-card__description">{preset.description}</span>
              )}
            </div>
          </div>
          
          {isActive ? (
            <div className="preset-card__status">
              <i className="pi pi-check-circle" /> {t('presets.active') || 'Activo'}
            </div>
          ) : (
            <div className="preset-card__actions">
              <Button
                label={isApplying ? (t('presets.applying') || '...') : (t('presets.apply') || 'Aplicar')}
                icon={isApplying ? 'pi pi-spin pi-spinner' : 'pi pi-play'}
                size="small"
                disabled={isApplying}
                onClick={() => handleApply(preset)}
                className="preset-card__btn-apply"
              />
            </div>
          )}
        </div>

        {!preset.isBuiltin && (
          <div className="preset-card__manage-actions">
            {isConfirmingUpdate ? (
              <span className="preset-card__confirm-inline">
                <Button
                  icon="pi pi-check"
                  size="small"
                  severity="warning"
                  onClick={() => handleUpdateConfirm(preset.id)}
                  className="preset-card__btn-icon-sm"
                />
                <Button
                  icon="pi pi-times"
                  size="small"
                  text
                  severity="secondary"
                  onClick={() => setConfirmUpdateId(null)}
                  className="preset-card__btn-icon-sm"
                />
              </span>
            ) : (
              <Button
                icon="pi pi-refresh"
                size="small"
                text
                severity="warning"
                tooltip={t('presets.update') || 'Actualizar'}
                tooltipOptions={{ position: 'top' }}
                onClick={() => setConfirmUpdateId(preset.id)}
                className="preset-card__btn-icon-sm"
              />
            )}

            <Button
              icon="pi pi-pencil"
              size="small"
              text
              severity="secondary"
              tooltip={t('presets.rename') || 'Renombrar'}
              tooltipOptions={{ position: 'top' }}
              onClick={() => handleRenameOpen(preset)}
              className="preset-card__btn-icon-sm"
            />

            {isConfirmingDelete ? (
              <span className="preset-card__confirm-inline">
                <Button
                  icon="pi pi-check"
                  size="small"
                  severity="danger"
                  onClick={() => handleDeleteConfirm(preset.id)}
                  className="preset-card__btn-icon-sm"
                />
                <Button
                  icon="pi pi-times"
                  size="small"
                  text
                  severity="secondary"
                  onClick={() => setConfirmDeleteId(null)}
                  className="preset-card__btn-icon-sm"
                />
              </span>
            ) : (
              <Button
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                tooltip={t('presets.delete') || 'Eliminar'}
                tooltipOptions={{ position: 'top' }}
                onClick={() => setConfirmDeleteId(preset.id)}
                className="preset-card__btn-icon-sm"
              />
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="preset-selector" style={{ width: '100%', maxWidth: '100%' }}>
      <style>{PRESET_SELECTOR_STYLES}</style>

      {/* Header */}
      <div className="general-settings-header-wrapper" style={{ marginBottom: '1rem' }}>
        <div className="general-header-content">
          <span className="general-header-icon protocol-dialog-header-icon" style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
            width: '32px',
            height: '32px',
            fontSize: '1rem'
          }}>
            <i className="pi pi-star" />
          </span>
          <div className="general-header-text">
            <h3 className="general-header" style={{ fontSize: '1rem', marginBottom: '2px' }}>{t('presets.title') || 'Presets de Apariencia'}</h3>
            <p className="general-description" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              {t('presets.description') || 'Guarda y restaura toda tu configuración visual de un solo clic'}
            </p>
          </div>
        </div>
      </div>

      {/* Save current settings button */}
      <div className="general-settings-section" style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="general-section-icon" style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
              width: '28px',
              height: '28px',
              fontSize: '0.9rem'
            }}>
              <i className="pi pi-save" />
            </div>
            <div>
              <h4 className="general-section-title" style={{ fontSize: '0.9rem', marginBottom: '0' }}>
                {t('presets.saveSection') || 'Guardar configuración actual'}
              </h4>
              <p style={{ margin: '0', fontSize: '0.75rem', color: 'var(--ui-dialog-text, #666)', opacity: 0.6 }}>
                {t('presets.saveDescription') || 'Crea un nuevo preset con el tema, fuentes e iconos actuales.'}
              </p>
            </div>
          </div>
          <Button
            label={t('presets.saveCurrent') || 'Guardar como...'}
            icon="pi pi-plus"
            onClick={handleSaveOpen}
            size="small"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', border: 'none', padding: '4px 12px' }}
          />
        </div>
      </div>

      {/* User presets */}
      {userPresets.length > 0 && (
        <div className="general-settings-section" style={{ marginBottom: '1.25rem' }}>
          <div className="general-section-header" style={{ padding: '0.5rem 1rem' }}>
            <div className="general-section-icon" style={{
              background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
              boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)',
              width: '24px',
              height: '24px',
              fontSize: '0.8rem'
            }}>
              <i className="pi pi-user" />
            </div>
            <h4 className="general-section-title" style={{ fontSize: '0.85rem' }}>
              {t('presets.custom') || 'Mis presets'}
            </h4>
          </div>
          <div className="preset-grid" style={{ padding: '0.5rem 1rem 1rem' }}>
            {userPresets.map(renderPresetCard)}
          </div>
        </div>
      )}

      {/* Built-in presets */}
      <div className="general-settings-section">
        <div className="general-section-header" style={{ padding: '0.5rem 1rem' }}>
          <div className="general-section-icon" style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
            width: '24px',
            height: '24px',
            fontSize: '0.8rem'
          }}>
            <i className="pi pi-palette" />
          </div>
          <h4 className="general-section-title" style={{ fontSize: '0.85rem' }}>
            {t('presets.builtin') || 'Presets incluidos'}
          </h4>
        </div>
        <div className="preset-grid" style={{ padding: '0.5rem 1rem 1rem' }}>
          {builtins.map(renderPresetCard)}
        </div>
      </div>

      {/* Save dialog */}
      <Dialog
        header={t('presets.saveDialogTitle') || 'Guardar como preset'}
        visible={saveDialogVisible}
        style={{ width: '380px' }}
        onHide={() => setSaveDialogVisible(false)}
        modal
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button
              label={t('presets.cancel') || 'Cancelar'}
              icon="pi pi-times"
              outlined
              size="small"
              onClick={() => setSaveDialogVisible(false)}
            />
            <Button
              label={t('presets.save') || 'Guardar'}
              icon="pi pi-check"
              size="small"
              disabled={!newPresetName.trim()}
              onClick={handleSaveConfirm}
            />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500 }}>
              {t('presets.nameLabel') || 'Nombre del preset'}
            </label>
            <InputText
              value={newPresetName}
              onChange={e => setNewPresetName(e.target.value)}
              placeholder={t('presets.namePlaceholder') || 'Ej: Mi configuración de trabajo'}
              style={{ width: '100%' }}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSaveConfirm(); }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500 }}>
              {t('presets.iconLabel') || 'Icono (emoji)'}
            </label>
            <InputText
              value={newPresetIcon}
              onChange={e => setNewPresetIcon(e.target.value)}
              placeholder="⭐"
              style={{ width: '80px', textAlign: 'center', fontSize: '1.2rem' }}
              maxLength={2}
            />
          </div>
        </div>
      </Dialog>

      {/* Rename dialog */}
      <Dialog
        header={t('presets.renameDialogTitle') || 'Renombrar preset'}
        visible={renameDialogVisible}
        style={{ width: '360px' }}
        onHide={() => setRenameDialogVisible(false)}
        modal
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button
              label={t('presets.cancel') || 'Cancelar'}
              icon="pi pi-times"
              outlined
              size="small"
              onClick={() => setRenameDialogVisible(false)}
            />
            <Button
              label={t('presets.rename') || 'Renombrar'}
              icon="pi pi-check"
              size="small"
              disabled={!renameValue.trim()}
              onClick={handleRenameConfirm}
            />
          </div>
        }
      >
        <div style={{ paddingTop: '0.5rem' }}>
          <InputText
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            style={{ width: '100%' }}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(); }}
          />
        </div>
      </Dialog>
    </div>
  );
};

const PRESET_SELECTOR_STYLES = `
  .preset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.6rem;
  }

  .preset-card {
    border: 1px solid var(--ui-content-border, rgba(255,255,253,0.06));
    border-radius: 12px;
    background: var(--ui-content-bg, rgba(255,255,255,0.02));
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(4px);
  }

  .preset-card:hover {
    border-color: var(--ui-button-primary, #7c3aed);
    background: var(--ui-tab-hover-bg, rgba(255,255,255,0.05));
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }

  .preset-card--active {
    border-color: var(--ui-button-primary, #7c3aed) !important;
    background: color-mix(in srgb, var(--ui-button-primary, #7c3aed) 12%, transparent) !important;
    box-shadow: 0 0 0 1px var(--ui-button-primary, #7c3aed), 0 4px 20px rgba(124, 58, 237, 0.15) !important;
  }

  .preset-card__content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
  }

  .preset-card__header-info {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex: 1;
    min-width: 0;
  }

  .preset-card__icon {
    font-size: 1.4rem;
    line-height: 1;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
  }

  .preset-card__meta {
    flex: 1;
    min-width: 0;
  }

  .preset-card__name {
    display: block;
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--ui-dialog-text, inherit);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preset-card__description {
    display: block;
    font-size: 0.7rem;
    opacity: 0.55;
    color: var(--ui-dialog-text, inherit);
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preset-card__status {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ui-button-primary, #7c3aed);
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(124, 58, 237, 0.1);
    border-radius: 20px;
    flex-shrink: 0;
  }

  .preset-card__actions {
    flex-shrink: 0;
  }

  .preset-card__btn-apply {
    padding: 4px 10px !important;
    font-size: 0.75rem !important;
    height: 28px !important;
  }

  .preset-card__manage-actions {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    margin-top: 0.25rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    opacity: 0.4;
    transition: opacity 0.2s;
  }

  .preset-card:hover .preset-card__manage-actions {
    opacity: 1;
  }

  .preset-card__btn-icon-sm {
    width: 24px !important;
    height: 24px !important;
    padding: 0 !important;
  }

  .preset-card__btn-icon-sm i {
    font-size: 0.75rem !important;
  }

  .preset-card__confirm-inline {
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }

  /* Custom Scrollbar for the selector */
  .preset-selector::-webkit-scrollbar {
    width: 6px;
  }
  .preset-selector::-webkit-scrollbar-track {
    background: transparent;
  }
  .preset-selector::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
  .preset-selector::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

export default PresetSelector;
