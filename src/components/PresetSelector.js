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

    return (
      <div
        key={preset.id}
        className={`preset-card ${isActive ? 'preset-card--active' : ''}`}
        title={preset.description || preset.name}
      >
        <div className="preset-card__header">
          <span className="preset-card__icon">{preset.icon || '🎨'}</span>
          <div className="preset-card__meta">
            <span className="preset-card__name">{preset.name}</span>
            {preset.description && (
              <span className="preset-card__description">{preset.description}</span>
            )}
          </div>
          {isActive && (
            <span className="preset-card__badge">
              <i className="pi pi-check-circle" /> {t('presets.active') || 'Activo'}
            </span>
          )}
        </div>

        <div className="preset-card__actions">
          <Button
            label={isApplying ? (t('presets.applying') || 'Aplicando…') : (t('presets.apply') || 'Aplicar')}
            icon={isApplying ? 'pi pi-spin pi-spinner' : 'pi pi-play'}
            size="small"
            disabled={isActive || isApplying}
            onClick={() => handleApply(preset)}
            className="preset-card__btn-apply"
          />

          {!preset.isBuiltin && (
            <>
              <Button
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                tooltip={t('presets.rename') || 'Renombrar'}
                tooltipOptions={{ position: 'top' }}
                onClick={() => handleRenameOpen(preset)}
                className="preset-card__btn-icon"
              />

              {isConfirmingDelete ? (
                <span className="preset-card__confirm-delete">
                  <Button
                    label={t('presets.confirmDelete') || '¿Eliminar?'}
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    onClick={() => handleDeleteConfirm(preset.id)}
                    className="preset-card__btn-confirm"
                  />
                  <Button
                    icon="pi pi-times"
                    size="small"
                    text
                    severity="secondary"
                    onClick={() => setConfirmDeleteId(null)}
                    className="preset-card__btn-icon"
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
                  className="preset-card__btn-icon"
                />
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="preset-selector general-settings-container" style={{ width: '100%', maxWidth: '100%' }}>
      <style>{PRESET_SELECTOR_STYLES}</style>

      {/* Header */}
      <div className="general-settings-header-wrapper">
        <div className="general-header-content">
          <span className="general-header-icon protocol-dialog-header-icon" style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)'
          }}>
            <i className="pi pi-star" />
          </span>
          <div className="general-header-text">
            <h3 className="general-header">{t('presets.title') || 'Presets de Apariencia'}</h3>
            <p className="general-description">
              {t('presets.description') || 'Guarda y restaura toda tu configuración visual de un solo clic'}
            </p>
          </div>
        </div>
      </div>

      {/* Save current settings button */}
      <div className="general-settings-section" style={{ marginBottom: '1.25rem' }}>
        <div className="general-section-header">
          <div className="general-section-icon" style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
          }}>
            <i className="pi pi-save" />
          </div>
          <h4 className="general-section-title">
            {t('presets.saveSection') || 'Guardar configuración actual'}
          </h4>
        </div>
        <div style={{ padding: '0.75rem 1.25rem' }}>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--ui-dialog-text, #666)', opacity: 0.8 }}>
            {t('presets.saveDescription') || 'Captura todos los temas, fuentes, iconos y estilos de cursor actuales como un nuevo preset personalizado.'}
          </p>
          <Button
            label={t('presets.saveCurrent') || 'Guardar como preset…'}
            icon="pi pi-plus"
            onClick={handleSaveOpen}
            size="small"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', border: 'none' }}
          />
        </div>
      </div>

      {/* User presets */}
      {userPresets.length > 0 && (
        <div className="general-settings-section" style={{ marginBottom: '1.25rem' }}>
          <div className="general-section-header">
            <div className="general-section-icon" style={{
              background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
              boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)'
            }}>
              <i className="pi pi-user" />
            </div>
            <h4 className="general-section-title">
              {t('presets.custom') || 'Mis presets'}
            </h4>
          </div>
          <div className="preset-grid" style={{ padding: '0.75rem 1.25rem' }}>
            {userPresets.map(renderPresetCard)}
          </div>
        </div>
      )}

      {/* Built-in presets */}
      <div className="general-settings-section">
        <div className="general-section-header">
          <div className="general-section-icon" style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
          }}>
            <i className="pi pi-palette" />
          </div>
          <h4 className="general-section-title">
            {t('presets.builtin') || 'Presets incluidos'}
          </h4>
        </div>
        <div className="preset-grid" style={{ padding: '0.75rem 1.25rem' }}>
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
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.75rem;
  }

  .preset-card {
    border: 1px solid var(--ui-content-border, rgba(255,255,255,0.08));
    border-radius: 10px;
    background: var(--ui-content-bg, rgba(255,255,255,0.03));
    padding: 0.9rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }

  .preset-card:hover {
    border-color: var(--ui-button-primary, #7c3aed);
    box-shadow: 0 2px 12px rgba(124, 58, 237, 0.15);
  }

  .preset-card--active {
    border-color: var(--ui-button-primary, #7c3aed) !important;
    background: color-mix(in srgb, var(--ui-button-primary, #7c3aed) 8%, transparent) !important;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ui-button-primary, #7c3aed) 30%, transparent);
  }

  .preset-card__header {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
  }

  .preset-card__icon {
    font-size: 1.5rem;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .preset-card__meta {
    flex: 1;
    min-width: 0;
  }

  .preset-card__name {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--ui-dialog-text, inherit);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preset-card__description {
    display: block;
    font-size: 0.75rem;
    opacity: 0.65;
    color: var(--ui-dialog-text, inherit);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preset-card__badge {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--ui-button-primary, #7c3aed);
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
  }

  .preset-card__actions {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    justify-content: flex-end;
  }

  .preset-card__btn-apply {
    flex: 1;
  }

  .preset-card__btn-icon {
    flex-shrink: 0;
  }

  .preset-card__confirm-delete {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
`;

export default PresetSelector;
