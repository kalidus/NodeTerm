import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import {
  EnhancedRDPForm,
  RdpTerminalDialogHeader,
  createDefaultRdpFormData,
  mapEditNodeDataToRdpFormData,
  isRdpFormValid,
  TERMINAL_PRO_DIALOG_STYLE,
  TERMINAL_PRO_DIALOG_CONTENT_STYLE,
  TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE
} from '../EnhancedRDPForm';

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
      className="app-dialog terminal-pro-dialog"
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
