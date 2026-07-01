/**
 * ExportDialog - Diálogo minimalista para exportar datos de NodeTerm
 * Diseño simple y profesional con opciones de selección
 */

import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { ProgressBar } from 'primereact/progressbar';
import { Message } from 'primereact/message';
import exportImportService from '../services/ExportImportService';
import { useTranslation } from '../i18n/hooks/useTranslation';

const ExportDialog = ({ visible, onHide, showToast, isEmbedded = false }) => {
  const { t } = useTranslation('common');
  
  // Estados de opciones de exportación
  const [options, setOptions] = useState({
    connections: true,
    passwords: true,
    conversations: true,
    config: true,
    documents: true,
    recordings: false
  });

  // Estados de encriptación
  const [useEncryption, setUseEncryption] = useState(false);
  const [encryptPassword, setEncryptPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados de UI
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState(`nodeterm-backup-${new Date().toISOString().split('T')[0]}`);

  /**
   * Maneja el cambio de opciones
   */
  const handleOptionChange = (key) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  /**
   * Valida que al menos una opción esté seleccionada
   */
  const isValidSelection = () => {
    return Object.values(options).some(v => v === true);
  };

  /**
   * Valida las contraseñas de encriptación
   */
  const isValidPassword = () => {
    if (!useEncryption) return true;
    return encryptPassword.length >= 8 && encryptPassword === confirmPassword;
  };

  /**
   * Ejecuta la exportación
   */
  const handleExport = async () => {
    if (!isValidSelection()) {
      showToast?.({
        severity: 'warn',
        summary: t('export.warning') || 'Advertencia',
        detail: t('export.selectAtLeastOne') || 'Selecciona al menos una categoría para exportar',
        life: 3000
      });
      return;
    }

    if (!isValidPassword()) {
      showToast?.({
        severity: 'warn',
        summary: t('export.warning') || 'Advertencia',
        detail: t('export.passwordMismatch') || 'Las contraseñas no coinciden o son muy cortas (mínimo 8 caracteres)',
        life: 3000
      });
      return;
    }

    setExporting(true);
    setProgress(10);

    try {
      // Exportar datos
      setProgress(30);
      const exportData = await exportImportService.exportAllData({
        ...options,
        encryptPassword: useEncryption ? encryptPassword : null
      });

      setProgress(60);

      // Convertir a JSON y crear blob
      const jsonString = JSON.stringify(exportData, null, 2);
      
      setProgress(80);

      // Descargar archivo usando IPC de Electron
      const cleanFileName = fileName.endsWith('.nodeterm') ? fileName : `${fileName}.nodeterm`;
      const result = await window.electron?.import?.saveFile({
        fileName: cleanFileName,
        fileContent: jsonString
      });

      setProgress(100);

      if (result && result.success) {
        showToast?.({
          severity: 'success',
          summary: t('export.success') || 'Éxito',
          detail: t('export.successMessage') || 'Datos exportados correctamente',
          life: 3000
        });
        handleClose();
      } else if (result && result.canceled) {
        // Cancelado por el usuario
      } else {
        throw new Error('Export canceled or failed');
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      showToast?.({
        severity: 'error',
        summary: t('export.error') || 'Error',
        detail: error.message || t('export.errorMessage') || 'Error al exportar los datos',
        life: 3000
      });
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  /**
   * Cierra el diálogo y resetea estados
   */
  const handleClose = () => {
    if (!exporting) {
      setOptions({
        connections: true,
        passwords: true,
        conversations: true,
        config: true,
        documents: true,
        recordings: false
      });
      setUseEncryption(false);
      setEncryptPassword('');
      setConfirmPassword('');
      setProgress(0);
      setExporting(false);
      setFileName(`nodeterm-backup-${new Date().toISOString().split('T')[0]}`);
      onHide && onHide();
    }
  };

  /**
   * Estima el tamaño de los datos
   */
  const getEstimatedSize = () => {
    let size = 0;
    if (options.connections) size += 100; // KB estimados
    if (options.passwords) size += 50;
    if (options.conversations) size += 500;
    if (options.config) size += 20;
    if (options.documents) size += 80;
    if (options.recordings) size += 1000;
    
    if (size < 1024) return `~${size} KB`;
    return `~${(size / 1024).toFixed(1)} MB`;
  };

  /**
   * Footer del diálogo
   */
  const renderFooter = () => {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
          {t('export.estimatedSize') || 'Tamaño estimado'}: <strong>{getEstimatedSize()}</strong>
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            label={t('common.cancel') || 'Cancelar'}
            icon="pi pi-times"
            onClick={handleClose}
            className="p-button-text"
            disabled={exporting}
          />
          <Button
            label={t('export.export') || 'Exportar'}
            icon="pi pi-download"
            onClick={handleExport}
            disabled={exporting || !isValidSelection()}
            loading={exporting}
          />
        </div>
      </div>
    );
  };

  const dialogContent = (
    <div style={{ padding: isEmbedded ? '0' : '10px 0' }}>
      {/* Advertencia de seguridad */}
      <Message
        severity="info"
        text={t('export.securityNote') || 'La master key NO se exporta por seguridad. Solo se exportan datos encriptados.'}
        style={{ marginBottom: '20px', width: '100%' }}
      />

      {/* Sección: Seleccionar datos */}
      <div style={{ marginBottom: '25px' }}>
        <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '600' }}>
          {t('export.selectData') || '📦 Seleccionar datos a exportar'}
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Checkbox
              inputId="opt-connections"
              checked={options.connections}
              onChange={() => handleOptionChange('connections')}
              disabled={exporting}
            />
            <label htmlFor="opt-connections" style={{ margin: 0, cursor: 'pointer' }}>
              <strong>{t('export.connections') || 'Conexiones SSH/RDP/VNC'}</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                {t('export.connectionsDesc') || 'Árbol de conexiones, favoritos y fuentes de importación'}
              </div>
            </label>
          </div>

          <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Checkbox
              inputId="opt-passwords"
              checked={options.passwords}
              onChange={() => handleOptionChange('passwords')}
              disabled={exporting}
            />
            <label htmlFor="opt-passwords" style={{ margin: 0, cursor: 'pointer' }}>
              <strong>{t('export.passwords') || 'Gestor de Contraseñas'}</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                {t('export.passwordsDesc') || 'Contraseñas encriptadas y estructura de carpetas'}
              </div>
            </label>
          </div>

          <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Checkbox
              inputId="opt-conversations"
              checked={options.conversations}
              onChange={() => handleOptionChange('conversations')}
              disabled={exporting}
            />
            <label htmlFor="opt-conversations" style={{ margin: 0, cursor: 'pointer' }}>
              <strong>{t('export.conversations') || 'Conversaciones de IA'}</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                {t('export.conversationsDesc') || 'Historial de conversaciones y backups'}
              </div>
            </label>
          </div>

          <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Checkbox
              inputId="opt-config"
              checked={options.config}
              onChange={() => handleOptionChange('config')}
              disabled={exporting}
            />
            <label htmlFor="opt-config" style={{ margin: 0, cursor: 'pointer' }}>
              <strong>{t('export.config') || 'Configuraciones'}</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                {t('export.configDesc') || 'Temas, fuentes, terminal por defecto, MCPs, etc.'}
              </div>
            </label>
          </div>

          <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Checkbox
              inputId="opt-documents"
              checked={options.documents}
              onChange={() => handleOptionChange('documents')}
              disabled={exporting}
            />
            <label htmlFor="opt-documents" style={{ margin: 0, cursor: 'pointer' }}>
              <strong>{t('export.documents') || 'Notas / documentos'}</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                {t('export.documentsDesc') || 'Árbol de notas, carpetas y contenido'}
              </div>
            </label>
          </div>

          <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Checkbox
              inputId="opt-recordings"
              checked={options.recordings}
              onChange={() => handleOptionChange('recordings')}
              disabled={exporting}
            />
            <label htmlFor="opt-recordings" style={{ margin: 0, cursor: 'pointer' }}>
              <strong>{t('export.recordings') || 'Grabaciones (metadata)'}</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                {t('export.recordingsDesc') || 'Solo información de grabaciones, no el contenido completo'}
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Sección: Nombre del archivo */}
      <div style={{ marginBottom: '25px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600' }}>
          {t('export.fileName') || '📄 Nombre del archivo'}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <InputText
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            disabled={exporting}
            style={{ flex: 1 }}
            placeholder="nodeterm-backup"
          />
          <span style={{ color: 'var(--text-color-secondary)' }}>.nodeterm</span>
        </div>
      </div>

      {/* Sección: Encriptación opcional */}
      <div style={{ marginBottom: '20px' }}>
        <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <Checkbox
            inputId="opt-encryption"
            checked={useEncryption}
            onChange={(e) => setUseEncryption(e.checked)}
            disabled={exporting}
          />
          <label htmlFor="opt-encryption" style={{ margin: 0, cursor: 'pointer' }}>
            <strong>{t('export.useEncryption') || '🔒 Proteger con contraseña adicional'}</strong>
            <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
              {t('export.encryptionNote') || 'Encriptación AES-256-GCM (recomendado)'}
            </div>
          </label>
        </div>

        {useEncryption && (
          <div style={{ paddingLeft: '34px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label htmlFor="encrypt-pwd" style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                {t('export.password') || 'Contraseña'}
              </label>
              <Password
                id="encrypt-pwd"
                value={encryptPassword}
                onChange={(e) => setEncryptPassword(e.target.value)}
                disabled={exporting}
                feedback={false}
                toggleMask
                style={{ width: '100%' }}
                inputStyle={{ width: '100%' }}
                placeholder={t('export.passwordPlaceholder') || 'Mínimo 8 caracteres'}
              />
            </div>
            <div>
              <label htmlFor="confirm-pwd" style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                {t('export.confirmPassword') || 'Confirmar contraseña'}
              </label>
              <Password
                id="confirm-pwd"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={exporting}
                feedback={false}
                toggleMask
                style={{ width: '100%' }}
                inputStyle={{ width: '100%' }}
                placeholder={t('export.confirmPasswordPlaceholder') || 'Repetir contraseña'}
              />
            </div>
            {encryptPassword && confirmPassword && encryptPassword !== confirmPassword && (
              <small style={{ color: 'var(--red-500)', fontSize: '12px' }}>
                {t('export.passwordsDoNotMatch') || '⚠️ Las contraseñas no coinciden'}
              </small>
            )}
          </div>
        )}
      </div>

      {/* Barra de progreso */}
      {exporting && (
        <div style={{ marginTop: '20px' }}>
          <ProgressBar value={progress} showValue={false} style={{ height: '6px' }} />
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: 'var(--text-color-secondary)' }}>
            {progress < 30 && (t('export.preparing') || 'Preparando datos...')}
            {progress >= 30 && progress < 60 && (t('export.exporting') || 'Exportando...')}
            {progress >= 60 && progress < 80 && (t('export.generating') || 'Generando archivo...')}
            {progress >= 80 && progress < 100 && (t('export.downloading') || 'Descargando...')}
            {progress >= 100 && (t('export.completed') || '✓ Completado')}
          </div>
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="export-dialog-embedded" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          {dialogContent}
        </div>
        <div style={{ borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))', paddingTop: '15px', marginTop: '15px' }}>
          {renderFooter()}
        </div>
      </div>
    );
  }

  return (
    <Dialog
      visible={visible}
      onHide={handleClose}
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="pi pi-download" style={{ fontSize: '1.2rem' }}></i>
          <span>{t('export.title') || 'Exportar Datos de NodeTerm'}</span>
        </div>
      }
      footer={renderFooter()}
      style={{ width: '480px' }}
      modal
      draggable={false}
      resizable={false}
      closable={!exporting}
      className="export-dialog"
    >
      {dialogContent}
    </Dialog>
  );
};

export default ExportDialog;
