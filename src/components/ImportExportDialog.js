/**
 * ImportExportDialog - Diálogo para importar archivos .nodeterm exportados
 * Muestra preview de los datos y permite elegir opciones de importación
 */

import React, { useState, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { FileUpload } from 'primereact/fileupload';
import { Checkbox } from 'primereact/checkbox';
import { Password } from 'primereact/password';
import { ProgressBar } from 'primereact/progressbar';
import { Message } from 'primereact/message';
import { RadioButton } from 'primereact/radiobutton';
import { Card } from 'primereact/card';
import { confirmDialog } from 'primereact/confirmdialog';
import exportImportService from '../services/ExportImportService';
import { useTranslation } from '../i18n/hooks/useTranslation';

const ImportExportDialog = ({ visible, onHide, showToast, onImportComplete, isEmbedded = false }) => {
  const { t } = useTranslation('common');
  const fileUploadRef = useRef(null);
  const fileInputRef = useRef(null);

  // Estados del archivo
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);

  // Estados de importación
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importMode, setImportMode] = useState('merge'); // 'merge' o 'replace'
  
  // Estados de categorías
  const [categories, setCategories] = useState({
    connections: true,
    passwords: true,
    conversations: true,
    config: true,
    documents: true,
    recordings: true
  });

  // Estados de encriptación
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [decryptPassword, setDecryptPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [needsMasterKey, setNeedsMasterKey] = useState(false);
  const [masterKey, setMasterKey] = useState('');

  /**
   * Maneja la selección de archivo desde input nativo
   */
  const handleNativeFileSelect = async (e) => {
    console.log('[ImportExportDialog] handleNativeFileSelect llamado:', e);
    const file = e.target?.files?.[0];
    console.log('[ImportExportDialog] Archivo del input nativo:', file);
    if (file) {
      // Pasar el evento completo para que handleFileSelect pueda procesarlo
      await handleFileSelect(e);
    } else {
      console.error('[ImportExportDialog] No se encontró archivo en input nativo');
      showToast?.({
        severity: 'error',
        summary: t('import.error') || 'Error',
        detail: t('import.noFileSelected') || 'No se pudo obtener el archivo seleccionado',
        life: 3000
      });
    }
  };

  /**
   * Abre el selector de archivo nativo como fallback
   */
  const handleChooseFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.nodeterm,.json';
    input.onchange = handleNativeFileSelect;
    input.click();
  };

  /**
   * Maneja la selección de archivo
   */
  const handleFileSelect = async (event) => {
    console.log('[ImportExportDialog] handleFileSelect llamado:', event);
    console.log('[ImportExportDialog] Estructura del evento:', {
      hasFiles: !!event.files,
      filesLength: event.files?.length,
      hasTarget: !!event.target,
      hasTargetFiles: !!event.target?.files,
      targetFilesLength: event.target?.files?.length,
      keys: Object.keys(event || {}),
      isFile: event instanceof File
    });
    
    // Intentar obtener el archivo de diferentes formas
    let file = null;
    
    // Forma 1: event.files[0] (PrimeReact FileUpload)
    if (event.files && event.files.length > 0) {
      file = event.files[0];
      console.log('[ImportExportDialog] Archivo encontrado en event.files[0]');
    }
    // Forma 2: event.target.files[0] (input nativo)
    else if (event.target && event.target.files && event.target.files.length > 0) {
      file = event.target.files[0];
      console.log('[ImportExportDialog] Archivo encontrado en event.target.files[0]');
    }
    // Forma 3: El evento ES el archivo
    else if (event instanceof File) {
      file = event;
      console.log('[ImportExportDialog] El evento es directamente un File');
    }
    // Forma 4: Buscar en propiedades del objeto
    else if (event && typeof event === 'object') {
      // Buscar cualquier propiedad que sea un File
      for (const key in event) {
        if (event[key] instanceof File) {
          file = event[key];
          console.log(`[ImportExportDialog] Archivo encontrado en event.${key}`);
          break;
        }
        // O si hay un array de files
        if (Array.isArray(event[key]) && event[key].length > 0 && event[key][0] instanceof File) {
          file = event[key][0];
          console.log(`[ImportExportDialog] Archivo encontrado en event.${key}[0]`);
          break;
        }
      }
    }
    
    if (!file) {
      console.warn('[ImportExportDialog] No se encontró archivo en el evento. Estructura completa:', JSON.stringify(event, null, 2));
      showToast?.({
        severity: 'error',
        summary: t('import.error') || 'Error',
        detail: t('import.noFileSelected') || 'No se pudo obtener el archivo seleccionado',
        life: 3000
      });
      return;
    }

    // Validar que el archivo tenga nombre
    if (!file.name || typeof file.name !== 'string') {
      console.error('[ImportExportDialog] Archivo sin nombre válido:', file);
      showToast?.({
        severity: 'error',
        summary: t('import.error') || 'Error',
        detail: t('import.invalidFile') || 'Archivo inválido: no se pudo obtener el nombre del archivo',
        life: 3000
      });
      return;
    }

    console.log('[ImportExportDialog] Archivo seleccionado:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    try {
      // Validar extensión
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.nodeterm') && !fileName.endsWith('.json')) {
        showToast?.({
          severity: 'error',
          summary: t('import.error') || 'Error',
          detail: t('import.invalidFileType') || 'Solo se permiten archivos .nodeterm o .json',
          life: 3000
        });
        return;
      }

      // Mostrar indicador de carga
      setLoadingFile(true);
      
      // Leer archivo
      const reader = new FileReader();
      
      reader.onerror = (error) => {
        console.error('[ImportExportDialog] Error al leer archivo:', error);
        setLoadingFile(false);
        showToast?.({
          severity: 'error',
          summary: t('import.error') || 'Error',
          detail: t('import.fileReadError') || 'Error al leer el archivo',
          life: 3000
        });
      };
      
      reader.onload = async (e) => {
        setLoadingFile(false);
        try {
          console.log('[ImportExportDialog] Archivo leído, tamaño:', e.target.result?.length);
          const content = JSON.parse(e.target.result);
          console.log('[ImportExportDialog] JSON parseado correctamente:', {
            version: content.version,
            encrypted: content.encrypted,
            hasData: !!content.data
          });
          
          setFileData(content);
          setSelectedFile(file);
          setIsEncrypted(content.encrypted || false);
          setNeedsPassword(content.encrypted || false);
          
          // Detectar si hay datos encriptados dentro del archivo (passwords_encrypted, connections_encrypted)
          // incluso si el archivo completo no está encriptado
          const hasEncryptedData = !!(
            content.data?.passwords?.encrypted ||
            content.data?.connections?.encrypted ||
            content.data?.documents?.encrypted
          );
          setNeedsMasterKey(hasEncryptedData && !content.encrypted);
          
          console.log('[ImportExportDialog] Detección de datos encriptados:', {
            fileEncrypted: content.encrypted,
            hasEncryptedPasswords: !!content.data?.passwords?.encrypted,
            hasEncryptedConnections: !!content.data?.connections?.encrypted,
            needsMasterKey: hasEncryptedData && !content.encrypted
          });

          // Obtener preview si no está encriptado
          if (!content.encrypted) {
            try {
              const preview = await exportImportService.getExportPreview(content);
              setFilePreview(preview);
              console.log('[ImportExportDialog] Preview generado:', preview);
              
              // Asegurar que al menos una categoría esté seleccionada si hay datos
              if (preview.stats) {
                const hasData =
                  preview.stats.connections > 0 ||
                  preview.stats.passwords > 0 ||
                  preview.stats.conversations > 0 ||
                  preview.stats.configItems > 0 ||
                  preview.stats.documents > 0 ||
                  preview.stats.documentsEncryptedUnknown;

                if (hasData) {
                  // Si no hay ninguna categoría seleccionada, seleccionar las que tienen datos
                  const currentSelection = Object.values(categories).some(v => v === true);
                  if (!currentSelection) {
                    setCategories({
                      connections: preview.stats.connections > 0,
                      passwords: preview.stats.passwords > 0,
                      conversations: preview.stats.conversations > 0,
                      config: preview.stats.configItems > 0,
                      documents: preview.stats.documents > 0 || preview.stats.documentsEncryptedUnknown,
                      recordings: (preview.stats.recordings || 0) > 0
                    });
                  }
                }
              }
            } catch (error) {
              console.error('[ImportExportDialog] Error al generar preview:', error);
              // Aún así, permitir importar si hay datos
              setFilePreview({
                encrypted: false,
                version: content.version,
                exportedAt: content.exportedAt,
                appVersion: content.appVersion,
                dataSize: content.dataSize || 0,
                stats: null // Preview falló, pero permitir importar
              });
            }
          } else {
            setFilePreview({
              encrypted: true,
              version: content.version,
              exportedAt: content.exportedAt,
              appVersion: content.appVersion,
              dataSize: content.dataSize
            });
          }

        } catch (error) {
          console.error('[ImportExportDialog] Error al procesar archivo:', error);
          setLoadingFile(false);
          showToast?.({
            severity: 'error',
            summary: t('import.error') || 'Error',
            detail: error.message || t('import.invalidFile') || 'Archivo inválido o corrupto',
            life: 5000
          });
        }
      };
      
      // Leer el archivo como texto
      reader.readAsText(file);

    } catch (error) {
      console.error('[ImportExportDialog] Error al procesar archivo:', error);
      showToast?.({
        severity: 'error',
        summary: t('import.error') || 'Error',
        detail: error.message,
        life: 3000
      });
    }
  };

  /**
   * Desencripta el preview con la contraseña proporcionada (para archivo completo encriptado)
   */
  const handleDecryptPreview = async () => {
    if (!decryptPassword) {
      showToast?.({
        severity: 'warn',
        summary: t('import.warning') || 'Advertencia',
        detail: t('import.enterPassword') || 'Ingresa la contraseña',
        life: 3000
      });
      return;
    }

    try {
      const decryptedData = await exportImportService.decryptData(fileData.data, decryptPassword);
      const preview = await exportImportService.getExportPreview({
        ...fileData,
        data: decryptedData,
        encrypted: false
      });
      setFilePreview(preview);
      setNeedsPassword(false);

      showToast?.({
        severity: 'success',
        summary: t('import.success') || 'Éxito',
        detail: t('import.decrypted') || 'Archivo desencriptado correctamente',
        life: 3000
      });
    } catch (error) {
      showToast?.({
        severity: 'error',
        summary: t('import.error') || 'Error',
        detail: error.message || t('import.wrongPassword') || 'Contraseña incorrecta',
        life: 3000
      });
    }
  };

  /**
   * Desencripta datos internos con master key para ver el preview completo
   */
  const handleDecryptWithMasterKey = async () => {
    if (!masterKey) {
      showToast?.({
        severity: 'warn',
        summary: t('import.warning') || 'Advertencia',
        detail: t('import.enterMasterKey') || 'Ingresa la Master Key',
        life: 3000
      });
      return;
    }

    try {
      // Necesitamos SecureStorage para desencriptar
      const { default: SecureStorage } = await import('../services/SecureStorage');
      const secureStorage = new SecureStorage();
      
      // Desencriptar datos internos si están encriptados
      let decryptedData = { ...fileData.data };
      
      if (fileData.data.passwords?.encrypted) {
        try {
          // Los datos encriptados pueden estar como string JSON o ya parseados
          const encryptedPasswords = typeof fileData.data.passwords.encrypted === 'string' 
            ? JSON.parse(fileData.data.passwords.encrypted)
            : fileData.data.passwords.encrypted;
          
          const decryptedPasswords = await secureStorage.decryptData(encryptedPasswords, masterKey);
          
          decryptedData.passwords = {
            ...fileData.data.passwords,
            nodes: decryptedPasswords,
            encrypted: null // Limpiar para que el preview pueda contar
          };
        } catch (error) {
          console.error('[ImportExportDialog] Error desencriptando contraseñas:', error);
          throw new Error('Master Key incorrecta o datos corruptos en contraseñas');
        }
      }
      
      if (fileData.data.connections?.encrypted) {
        try {
          // Los datos encriptados pueden estar como string JSON o ya parseados
          const encryptedConnections = typeof fileData.data.connections.encrypted === 'string'
            ? JSON.parse(fileData.data.connections.encrypted)
            : fileData.data.connections.encrypted;
          
          const decryptedConnections = await secureStorage.decryptData(encryptedConnections, masterKey);
          
          decryptedData.connections = {
            ...fileData.data.connections,
            tree: decryptedConnections,
            encrypted: null // Limpiar para que el preview pueda contar
          };
        } catch (error) {
          console.error('[ImportExportDialog] Error desencriptando conexiones:', error);
          throw new Error('Master Key incorrecta o datos corruptos en conexiones');
        }
      }

      if (fileData.data.documents?.encrypted) {
        try {
          const encryptedDocs =
            typeof fileData.data.documents.encrypted === 'string'
              ? JSON.parse(fileData.data.documents.encrypted)
              : fileData.data.documents.encrypted;

          const decryptedDocs = await secureStorage.decryptData(encryptedDocs, masterKey);

          decryptedData.documents = {
            ...fileData.data.documents,
            nodes: decryptedDocs,
            encrypted: null
          };
        } catch (error) {
          console.error('[ImportExportDialog] Error desencriptando documentos:', error);
          throw new Error('Master Key incorrecta o datos corruptos en notas/documentos');
        }
      }
      
      // Generar preview con datos desencriptados
      const preview = await exportImportService.getExportPreview({
        ...fileData,
        data: decryptedData,
        encrypted: false
      });
      
      setFilePreview(preview);
      setNeedsMasterKey(false);
      
      // Asegurar que al menos una categoría esté seleccionada si hay datos
      if (preview.stats) {
        const hasData =
          preview.stats.connections > 0 ||
          preview.stats.passwords > 0 ||
          preview.stats.conversations > 0 ||
          preview.stats.configItems > 0 ||
          preview.stats.documents > 0 ||
          preview.stats.documentsEncryptedUnknown;

        if (hasData) {
          const currentSelection = Object.values(categories).some(v => v === true);
          if (!currentSelection) {
            setCategories({
              connections: preview.stats.connections > 0,
              passwords: preview.stats.passwords > 0,
              conversations: preview.stats.conversations > 0,
              config: preview.stats.configItems > 0,
              documents: preview.stats.documents > 0 || preview.stats.documentsEncryptedUnknown,
              recordings: (preview.stats.recordings || 0) > 0
            });
          }
        }
      }

      showToast?.({
        severity: 'success',
        summary: t('import.success') || 'Éxito',
        detail: t('import.decryptedWithMasterKey') || 'Datos desencriptados correctamente con Master Key',
        life: 3000
      });
    } catch (error) {
      showToast?.({
        severity: 'error',
        summary: t('import.error') || 'Error',
        detail: error.message || t('import.wrongMasterKey') || 'Master Key incorrecta',
        life: 3000
      });
    }
  };

  /**
   * Maneja el cambio de categorías
   */
  const handleCategoryChange = (key) => {
    setCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  /**
   * Valida selección de categorías
   */
  const isValidSelection = () => {
    return Object.values(categories).some(v => v === true);
  };

  /**
   * Confirma y ejecuta la importación
   */
  const handleImportConfirm = () => {
    if (!fileData) return;

    const message = importMode === 'replace' 
      ? (t('import.confirmReplace') || '⚠️ Se REEMPLAZARÁN todos los datos existentes. Esta acción NO se puede deshacer. ¿Continuar?')
      : (t('import.confirmMerge') || '¿Fusionar estos datos con los existentes?');

    confirmDialog({
      message: message,
      header: t('import.confirmation') || 'Confirmación',
      icon: importMode === 'replace' ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle',
      acceptLabel: t('common.yes') || 'Sí',
      rejectLabel: t('common.no') || 'No',
      accept: () => handleImport(),
      acceptClassName: importMode === 'replace' ? 'p-button-danger' : 'p-button-primary'
    });
  };

  /**
   * Ejecuta la importación
   */
  const handleImport = async () => {
    if (!isValidSelection()) {
      showToast?.({
        severity: 'warn',
        summary: t('import.warning') || 'Advertencia',
        detail: t('import.selectAtLeastOne') || 'Selecciona al menos una categoría para importar',
        life: 3000
      });
      return;
    }

    setImporting(true);
    setProgress(10);

    try {
      // Preparar opciones
      const selectedCategories = Object.keys(categories).filter(k => categories[k]);
      
      setProgress(30);

      // Importar
      const result = await exportImportService.importAllData(fileData, {
        merge: importMode === 'merge',
        replace: importMode === 'replace',
        categories: selectedCategories,
        decryptPassword: isEncrypted ? decryptPassword : null
      });

      setProgress(80);

      showToast?.({
        severity: 'success',
        summary: t('import.success') || 'Importación exitosa',
        detail: `${t('import.imported') || 'Importado'}: ${result.stats.connections} ${t('import.connections') || 'conexiones'}, ${result.stats.passwords} ${t('import.passwords') || 'contraseñas'}, ${result.stats.conversations} ${t('import.conversations') || 'conversaciones'}, ${result.stats.documents ?? 0} ${t('import.documents') || 'notas'}`,
        life: 5000
      });

      setProgress(100);

      // Notificar al componente padre
      onImportComplete?.(result);

      // Recargar página después de un momento para aplicar cambios
      setTimeout(() => {
        if (window.confirm(t('import.reloadRequired') || '¿Recargar la aplicación para aplicar los cambios?')) {
          window.location.reload();
        } else {
          handleClose();
        }
      }, 1500);

    } catch (error) {
      console.error('[ImportExportDialog] Error al importar:', error);
      showToast?.({
        severity: 'error',
        summary: t('import.error') || 'Error',
        detail: error.message || t('import.errorMessage') || 'Error al importar los datos',
        life: 5000
      });
      setProgress(0);
      setImporting(false);
    }
  };

  /**
   * Limpia el archivo seleccionado
   */
  const handleClearFile = () => {
    setSelectedFile(null);
    setFileData(null);
    setFilePreview(null);
    setDecryptPassword('');
    setMasterKey('');
    setNeedsPassword(false);
    setNeedsMasterKey(false);
    setIsEncrypted(false);
    setLoadingFile(false);
    if (fileUploadRef.current) {
      fileUploadRef.current.clear();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Cierra el diálogo
   */
  const handleClose = () => {
    if (!importing && !loadingFile) {
      handleClearFile();
      setCategories({
        connections: true,
        passwords: true,
        conversations: true,
        config: true,
        documents: true,
        recordings: true
      });
      setImportMode('merge');
      setProgress(0);
      setImporting(false);
      setLoadingFile(false);
      onHide && onHide();
    }
  };

  /**
   * Renderiza el preview del archivo
   */
  const renderPreview = () => {
    if (!filePreview) return null;

    return (
      <Card className="import-preview-card" style={{ marginBottom: '20px', background: 'var(--surface-card)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-border)', paddingBottom: '10px' }}>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>
              {t('import.fileInfo') || '📄 Información del archivo'}
            </span>
            {!needsPassword && (
              <Button
                icon="pi pi-times"
                className="p-button-text p-button-sm"
                onClick={handleClearFile}
                tooltip={t('import.clearFile') || 'Limpiar archivo'}
              />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
            <div>
              <strong>{t('import.version') || 'Versión'}:</strong> {filePreview.version}
            </div>
            <div>
              <strong>{t('import.exportedAt') || 'Exportado'}:</strong> {new Date(filePreview.exportedAt).toLocaleString()}
            </div>
            <div>
              <strong>{t('import.appVersion') || 'App'}:</strong> {filePreview.appVersion}
            </div>
            <div>
              <strong>{t('import.size') || 'Tamaño'}:</strong> {(filePreview.dataSize / 1024).toFixed(1)} KB
            </div>
          </div>

          {filePreview.encrypted && needsPassword && (
            <Message
              severity="warn"
              text={t('import.encryptedFile') || '🔒 Archivo encriptado - Ingresa la contraseña para ver el contenido'}
              style={{ marginTop: '10px' }}
            />
          )}

          {!needsPassword && filePreview.stats && (
            <>
              <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '10px', marginTop: '5px' }}>
                <strong style={{ fontSize: '13px' }}>{t('import.content') || '📦 Contenido'}:</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="pi pi-sitemap" style={{ color: 'var(--primary-color)' }}></i>
                  <span><strong>{filePreview.stats.connections}</strong> {t('import.connections') || 'conexiones'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="pi pi-lock" style={{ color: 'var(--primary-color)' }}></i>
                  <span><strong>{filePreview.stats.passwords}</strong> {t('import.passwords') || 'contraseñas'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="pi pi-comments" style={{ color: 'var(--primary-color)' }}></i>
                  <span><strong>{filePreview.stats.conversations}</strong> {t('import.conversations') || 'conversaciones'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="pi pi-cog" style={{ color: 'var(--primary-color)' }}></i>
                  <span><strong>{filePreview.stats.configItems}</strong> {t('import.configItems') || 'configs'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="pi pi-file-edit" style={{ color: 'var(--primary-color)' }}></i>
                  <span>
                    <strong>
                      {filePreview.stats.documentsEncryptedUnknown
                        ? '∗'
                        : filePreview.stats.documents}
                    </strong>{' '}
                    {t('import.documents') || 'notas'}
                  </span>
                </div>
              </div>
              
              {/* Advertencia sobre master key */}
              {(filePreview.stats.passwords > 0 ||
                filePreview.stats.connections > 0 ||
                filePreview.stats.documents > 0 ||
                filePreview.stats.documentsEncryptedUnknown) && (
                <Message
                  severity="info"
                  text={t('import.masterKeyNote') || '🔑 Nota: Los datos encriptados (contraseñas/conexiones) se importan tal cual. Necesitarás la misma Master Key del sistema origen para desencriptarlos. Si no tienes la Master Key, esos datos no serán accesibles.'}
                  style={{ marginTop: '10px' }}
                />
              )}
            </>
          )}
        </div>
      </Card>
    );
  };

  /**
   * Footer del diálogo
   */
  const renderFooter = () => {
    // Calcular si el botón debe estar deshabilitado
    // El botón se habilita si:
    // - No está importando
    // - Hay datos del archivo
    // - Si está encriptado, ya se desencriptó (needsPassword = false)
    // - Hay al menos una categoría seleccionada (o el preview falló pero hay datos)
    const hasValidSelection = isValidSelection();
    const isButtonDisabled = importing || !fileData || (isEncrypted && needsPassword) || (needsMasterKey && !filePreview?.stats) || (!hasValidSelection && filePreview?.stats);
    
    // Debug: Log del estado del botón
    if (fileData && !importing) {
      console.log('[ImportExportDialog] Estado del botón:', {
        importing,
        hasFileData: !!fileData,
        isEncrypted,
        needsPassword,
        hasValidSelection,
        filePreview: filePreview ? 'existe' : 'null',
        stats: filePreview?.stats,
        isButtonDisabled
      });
    }
    
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <Button
          label={t('common.cancel') || 'Cancelar'}
          icon="pi pi-times"
          onClick={handleClose}
          className="p-button-text"
          disabled={importing}
        />
        <Button
          label={t('import.import') || 'Importar'}
          icon="pi pi-upload"
          onClick={handleImportConfirm}
          disabled={isButtonDisabled}
          loading={importing}
        />
      </div>
    );
  };

  const dialogContent = (
    <div style={{ padding: isEmbedded ? '0' : '10px 0', maxHeight: isEmbedded ? 'none' : 'calc(90vh - 200px)', overflowY: isEmbedded ? 'visible' : 'auto' }}>
      {/* Selección de archivo */}
      {!selectedFile && (
        <div style={{ marginBottom: '20px' }}>
          {/* Input file nativo oculto como fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".nodeterm,.json"
            onChange={handleNativeFileSelect}
            style={{ display: 'none' }}
          />
          
          {/* Botón personalizado que abre el selector nativo */}
          <Button
            label={loadingFile ? (t('import.loading') || 'Cargando...') : (t('import.chooseFile') || '📁 Seleccionar archivo .nodeterm')}
            icon="pi pi-upload"
            onClick={handleChooseFile}
            className="p-button-outlined"
            disabled={importing || loadingFile}
            style={{ width: '100%' }}
          />
          
          {loadingFile && (
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              <i className="pi pi-spin pi-spinner" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}></i>
              <div style={{ marginTop: '5px', fontSize: '13px', color: 'var(--text-color-secondary)' }}>
                {t('import.readingFile') || 'Leyendo archivo...'}
              </div>
            </div>
          )}
          <small style={{ display: 'block', marginTop: '8px', color: 'var(--text-color-secondary)', fontSize: '12px' }}>
            {t('import.supportedFormats') || 'Formatos soportados: .nodeterm, .json (máx. 50 MB)'}
          </small>
        </div>
      )}

      {/* Preview del archivo */}
      {selectedFile && renderPreview()}

      {/* Contraseña de desencriptación (archivo completo encriptado) */}
      {isEncrypted && needsPassword && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
            {t('import.enterPassword') || '🔑 Contraseña de desencriptación'}
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Password
              value={decryptPassword}
              onChange={(e) => setDecryptPassword(e.target.value)}
              disabled={importing}
              feedback={false}
              toggleMask
              style={{ flex: 1 }}
              inputStyle={{ width: '100%' }}
              placeholder={t('import.passwordPlaceholder') || 'Ingresa la contraseña'}
              onKeyPress={(e) => e.key === 'Enter' && handleDecryptPreview()}
            />
            <Button
              label={t('import.decrypt') || 'Desencriptar'}
              icon="pi pi-unlock"
              onClick={handleDecryptPreview}
              disabled={!decryptPassword}
            />
          </div>
        </div>
      )}

      {/* Master Key para desencriptar datos internos */}
      {needsMasterKey && !needsPassword && (
        <div style={{ marginBottom: '20px' }}>
          <Message
            severity="info"
            text={t('import.masterKeyRequired') || '🔒 Este archivo contiene datos encriptados (contraseñas/conexiones). Ingresa la Master Key para ver el contenido completo y poder importar.'}
            style={{ marginBottom: '15px' }}
          />
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
            {t('import.enterMasterKey') || '🔑 Master Key'}
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Password
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              disabled={importing}
              feedback={false}
              toggleMask
              style={{ flex: 1 }}
              inputStyle={{ width: '100%' }}
              placeholder={t('import.masterKeyPlaceholder') || 'Ingresa la Master Key del sistema origen'}
              onKeyPress={(e) => e.key === 'Enter' && handleDecryptWithMasterKey()}
            />
            <Button
              label={t('import.decrypt') || 'Desencriptar'}
              icon="pi pi-unlock"
              onClick={handleDecryptWithMasterKey}
              disabled={!masterKey || importing}
            />
          </div>
          <small style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: 'var(--text-color-secondary)' }}>
            {t('import.masterKeyNote') || 'La Master Key es la misma que usaste en el sistema donde exportaste los datos.'}
          </small>
        </div>
      )}

      {/* Opciones de importación - Solo mostrar si hay archivo y no necesita contraseña/master key */}
      {selectedFile && !needsPassword && !needsMasterKey && (
        <>
          {/* Modo de importación */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
              {t('import.importMode') || '🔄 Modo de importación'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="p-field-radiobutton" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RadioButton
                  inputId="mode-merge"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={(e) => setImportMode(e.value)}
                  disabled={importing}
                />
                <label htmlFor="mode-merge" style={{ margin: 0, cursor: 'pointer' }}>
                  <strong>{t('import.merge') || 'Fusionar con datos existentes'}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                    {t('import.mergeDesc') || 'Los datos nuevos se añaden sin eliminar los existentes'}
                  </div>
                </label>
              </div>
              <div className="p-field-radiobutton" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RadioButton
                  inputId="mode-replace"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={(e) => setImportMode(e.value)}
                  disabled={importing}
                />
                <label htmlFor="mode-replace" style={{ margin: 0, cursor: 'pointer' }}>
                  <strong style={{ color: 'var(--red-500)' }}>{t('import.replace') || '⚠️ Reemplazar datos existentes'}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                    {t('import.replaceDesc') || 'Se eliminarán TODOS los datos actuales (se crea backup automático)'}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Selección de categorías */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
              {t('import.selectCategories') || '📦 Seleccionar categorías a importar'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Checkbox
                  inputId="cat-connections"
                  checked={categories.connections}
                  onChange={() => handleCategoryChange('connections')}
                  disabled={importing}
                />
                <label htmlFor="cat-connections" style={{ margin: 0, cursor: 'pointer' }}>
                  <strong>{t('import.connections') || 'Conexiones'}</strong> ({filePreview?.stats?.connections || 0})
                </label>
              </div>
              <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Checkbox
                  inputId="cat-passwords"
                  checked={categories.passwords}
                  onChange={() => handleCategoryChange('passwords')}
                  disabled={importing}
                />
                <label htmlFor="cat-passwords" style={{ margin: 0, cursor: 'pointer' }}>
                  <strong>{t('import.passwords') || 'Contraseñas'}</strong> ({filePreview?.stats?.passwords || 0})
                </label>
              </div>
              <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Checkbox
                  inputId="cat-conversations"
                  checked={categories.conversations}
                  onChange={() => handleCategoryChange('conversations')}
                  disabled={importing}
                />
                <label htmlFor="cat-conversations" style={{ margin: 0, cursor: 'pointer' }}>
                  <strong>{t('import.conversations') || 'Conversaciones'}</strong> ({filePreview?.stats?.conversations || 0})
                </label>
              </div>
              <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Checkbox
                  inputId="cat-config"
                  checked={categories.config}
                  onChange={() => handleCategoryChange('config')}
                  disabled={importing}
                />
                <label htmlFor="cat-config" style={{ margin: 0, cursor: 'pointer' }}>
                  <strong>{t('import.config') || 'Configuraciones'}</strong> ({filePreview?.stats?.configItems || 0})
                </label>
              </div>
              <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Checkbox
                  inputId="cat-documents"
                  checked={categories.documents}
                  onChange={() => handleCategoryChange('documents')}
                  disabled={importing}
                />
                <label htmlFor="cat-documents" style={{ margin: 0, cursor: 'pointer' }}>
                  <strong>{t('export.documents') || 'Notas / documentos'}</strong> (
                  {filePreview?.stats?.documentsEncryptedUnknown
                    ? '∗'
                    : filePreview?.stats?.documents ?? 0}
                  )
                </label>
              </div>
              {filePreview?.stats?.recordings > 0 && (
                <div className="p-field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Checkbox
                    inputId="cat-recordings"
                    checked={categories.recordings}
                    onChange={() => handleCategoryChange('recordings')}
                    disabled={importing}
                  />
                  <label htmlFor="cat-recordings" style={{ margin: 0, cursor: 'pointer' }}>
                    <strong>{t('import.recordings') || 'Grabaciones'}</strong> ({filePreview?.stats?.recordings || 0})
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Advertencia para modo replace */}
          {importMode === 'replace' && (
            <Message
              severity="warn"
              text={t('import.replaceWarning') || '⚠️ ADVERTENCIA: Se creará un backup automático antes de reemplazar los datos. Podrás restaurarlo si es necesario.'}
              style={{ marginBottom: '15px' }}
            />
          )}
        </>
      )}

      {/* Barra de progreso */}
      {importing && (
        <div style={{ marginTop: '20px' }}>
          <ProgressBar value={progress} showValue={false} style={{ height: '6px' }} />
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: 'var(--text-color-secondary)' }}>
            {progress < 30 && (t('import.validating') || 'Validando archivo...')}
            {progress >= 30 && progress < 80 && (t('import.importing') || 'Importando datos...')}
            {progress >= 80 && progress < 100 && (t('import.finalizing') || 'Finalizando...')}
            {progress >= 100 && (t('import.completed') || '✓ Completado')}
          </div>
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="import-dialog-embedded" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
          <i className="pi pi-upload" style={{ fontSize: '1.2rem' }}></i>
          <span>{t('import.title') || 'Importar Datos de NodeTerm'}</span>
        </div>
      }
      footer={renderFooter()}
      style={{ width: '600px', maxHeight: '90vh' }}
      modal
      draggable={false}
      resizable={false}
      closable={!importing}
      className="import-export-dialog"
    >
      {dialogContent}
    </Dialog>
  );
};

export default ImportExportDialog;
