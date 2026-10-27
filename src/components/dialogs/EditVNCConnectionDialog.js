import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import {
  EnhancedVNCForm,
  VncTerminalDialogHeader,
  createDefaultVncFormData,
  mapEditNodeDataToVncFormData,
  isVncFormValid
} from '../EnhancedVNCForm';
import {
  TERMINAL_PRO_DIALOG_STYLE,
  TERMINAL_PRO_DIALOG_CONTENT_STYLE,
  TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE
} from '../EnhancedRDPForm';

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
      className="app-dialog terminal-pro-dialog"
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
