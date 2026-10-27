import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import {
  EnhancedRDPForm,
  RdpTerminalDialogHeader,
  createDefaultRdpFormData,
  isRdpFormValid,
  TERMINAL_PRO_DIALOG_STYLE,
  TERMINAL_PRO_DIALOG_CONTENT_STYLE,
  TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE
} from '../EnhancedRDPForm';

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
          onHide={onHide}
          onGoBack={onGoBack}
          onSubmit={handleSubmit}
          idPrefix="create-rdp"
        />
      </div>
    </Dialog>
  );
}
