import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { InputText } from 'primereact/inputtext';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import AppDialog from '../ui/AppDialog';

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
    <AppDialog
      visible={visible}
      onHide={onHide}
      size="sm"
      headerIcon="pi pi-th-large"
      headerTitle={t('group.title.new')}
      cancelLabel={tCommon('buttons.cancel')}
      confirmLabel={t('group.buttons.create')}
      confirmIcon="pi pi-plus"
      onConfirm={onConfirm}
      loading={loading}
      confirmDisabled={!groupName.trim()}
    >
      <div className="p-fluid">
        <div className="app-form-field">
          <label htmlFor="groupName" className="app-form-label">{t('group.fields.name')}</label>
          <InputText id="groupName" value={groupName} onChange={e => setGroupName(e.target.value)} autoFocus />
        </div>
        <div className="app-form-field">
          <label className="app-form-label">{t('group.fields.color')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
            {colorOptions.map(color => (
              <div
                key={color}
                onClick={() => setGroupColor(color)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: color,
                  border: groupColor === color ? '3px solid var(--ui-button-primary)' : '2px solid var(--ui-dialog-border)',
                  boxShadow: groupColor === color ? '0 0 0 4px color-mix(in srgb, var(--ui-button-primary) 65%, transparent)' : '0 1px 4px var(--ui-dialog-shadow)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border 0.2s',
                  outline: groupColor === color ? '2px solid var(--ui-button-primary)' : 'none',
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
                    color: 'var(--ui-button-primary-text)',
                    fontSize: 16,
                    fontWeight: 900,
                    pointerEvents: 'none',
                    textShadow: '0 1px 4px var(--ui-button-primary)'
                  }}>OK</span>
                )}
              </div>
            ))}
            <div
              onClick={() => document.getElementById('custom-group-color-input').click()}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: groupColor && !colorOptions.includes(groupColor) ? groupColor : 'var(--ui-dialog-border)',
                border: !colorOptions.includes(groupColor) ? '3px solid var(--ui-button-primary)' : '2px dashed var(--ui-dialog-text)',
                boxShadow: !colorOptions.includes(groupColor) ? '0 0 0 4px color-mix(in srgb, var(--ui-button-primary) 65%, transparent)' : '0 1px 4px var(--ui-dialog-shadow)',
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
              <span style={{ fontSize: 12, color: !colorOptions.includes(groupColor) ? 'var(--ui-button-primary-text)' : 'var(--ui-button-primary)', pointerEvents: 'none', userSelect: 'none' }}>+</span>
              <input
                id="custom-group-color-input"
                type="color"
                value={groupColor}
                onChange={e => setGroupColor(e.target.value)}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>
      </div>
    </AppDialog>
  );
}
