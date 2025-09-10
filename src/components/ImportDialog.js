import React, { useState, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { FileUpload } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';
import { ProgressBar } from 'primereact/progressbar';
import { Divider } from 'primereact/divider';
import { Message } from 'primereact/message';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';
import ImportService from '../services/ImportService';

const ImportDialog = ({ 
  visible, 
  onHide, 
  onImportComplete, 
  showToast,
  presetOptions,
  targetFolderOptions,
  defaultTargetFolderKey
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileUploadRef = useRef(null);
  const toast = useRef(null);
  const [placeInFolder, setPlaceInFolder] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [linkFile, setLinkFile] = useState(false);
  const [pollInterval, setPollInterval] = useState(30000); // 30s por defecto
  const [linkedPath, setLinkedPath] = useState('');
  const [linkStatus, setLinkStatus] = useState(null); // { text, color }
  const lastCheckRef = useRef(null);
  const previewTimerRef = useRef(null);
  const linkFileInputRef = useRef(null);
  const [lastKnownHash, setLastKnownHash] = useState(null);
  const [changesDetected, setChangesDetected] = useState(false);
  const [containerFolderName, setContainerFolderName] = useState(`mRemoteNG imported - ${new Date().toLocaleDateString()}`);
  // Selección de carpeta destino (manual y vinculado)
  const ROOT_VALUE = 'ROOT';
  const folderOptionsWithRoot = [{ label: 'Raíz', value: ROOT_VALUE }, ...((targetFolderOptions || []))];
  const [targetFolderKey, setTargetFolderKey] = useState(defaultTargetFolderKey || ROOT_VALUE);
  const [linkedTargetFolderKey, setLinkedTargetFolderKey] = useState(defaultTargetFolderKey || ROOT_VALUE);
  // Opciones específicas para modo vinculado
  const [linkedPlaceInFolder, setLinkedPlaceInFolder] = useState(false);
  const [linkedOverwrite, setLinkedOverwrite] = useState(false);
  const [linkedContainerFolderName, setLinkedContainerFolderName] = useState(`mRemoteNG linked - ${new Date().toLocaleDateString()}`);
  const getFolderLabel = (key) => {
    const opt = (folderOptionsWithRoot || []).find(o => o.value === key);
    return opt ? opt.label : 'Raíz';
  };

  const handleFileSelect = (event) => {
    const file = event.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xml')) {
        showToast && showToast({
          severity: 'error',
          summary: 'Error',
          detail: 'Solo se permiten archivos XML de mRemoteNG',
          life: 3000
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
  };

  const handleChooseFile = () => {
    console.log('Intentando abrir selector de archivos (input nativo)...');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml';
    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        console.log('Archivo seleccionado:', file.name);
        handleFileSelect({ files: [file] });
      }
    };
    input.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      console.log('Archivo arrastrado:', file.name);
      
      if (!file.name.toLowerCase().endsWith('.xml')) {
        showToast && showToast({
          severity: 'error',
          summary: 'Error',
          detail: 'Solo se permiten archivos XML de mRemoteNG',
          life: 3000
        });
        return;
      }
      
      handleFileSelect({ files: [file] });
    }
  };

  const startPreviewPolling = () => {
    if (!linkFile || !linkedPath) return;
    if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    const run = async () => {
      try {
        const info = await window.electron?.import?.getFileInfo?.(linkedPath);
        if (info?.ok) {
          lastCheckRef.current = Date.now();
          const d = new Date(lastCheckRef.current);
          setLinkStatus({ text: `Vinculado • Última comprobación ${d.toLocaleTimeString()} • ${Math.round(info.size/1024)} KB`, color: '#2e7d32' });
        }
      } catch {}
    };
    run();
    previewTimerRef.current = setInterval(run, Math.max(5000, Number(pollInterval) || 30000));
  };

  React.useEffect(() => {
    if (linkFile && linkedPath) {
      startPreviewPolling();
    }
    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    };
  }, [linkFile, linkedPath, pollInterval]);

  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('IMPORT_DIALOG_OPTS') || '{}');
      if (saved) {
        if (typeof saved.placeInFolder === 'boolean') setPlaceInFolder(saved.placeInFolder);
        if (typeof saved.overwrite === 'boolean') setOverwrite(saved.overwrite);
        if (typeof saved.linkFile === 'boolean') setLinkFile(saved.linkFile);
        if (typeof saved.pollInterval === 'number') setPollInterval(saved.pollInterval);
        if (typeof saved.linkedPath === 'string') setLinkedPath(saved.linkedPath);
        if (typeof saved.targetFolderKey === 'string') setTargetFolderKey(saved.targetFolderKey);
        if (typeof saved.linkedTargetFolderKey === 'string') setLinkedTargetFolderKey(saved.linkedTargetFolderKey);
        if (typeof saved.linkedPlaceInFolder === 'boolean') setLinkedPlaceInFolder(saved.linkedPlaceInFolder);
        if (typeof saved.linkedOverwrite === 'boolean') setLinkedOverwrite(saved.linkedOverwrite);
        if (typeof saved.linkedContainerFolderName === 'string') setLinkedContainerFolderName(saved.linkedContainerFolderName);
      }
      if (presetOptions) {
        if (typeof presetOptions.placeInFolder === 'boolean') setPlaceInFolder(presetOptions.placeInFolder);
        if (typeof presetOptions.overwrite === 'boolean') setOverwrite(presetOptions.overwrite);
        if (typeof presetOptions.linkFile === 'boolean') setLinkFile(presetOptions.linkFile);
        if (typeof presetOptions.pollInterval === 'number') setPollInterval(presetOptions.pollInterval);
        if (typeof presetOptions.linkedPath === 'string') setLinkedPath(presetOptions.linkedPath);
        setLinkStatus({ text: 'Cambios detectados', color: '#e67e22' });
      }
    } catch {}
  }, [presetOptions]);
  React.useEffect(() => {
    const toSave = {
      placeInFolder,
      overwrite,
      linkFile,
      pollInterval,
      linkedPath,
      targetFolderKey,
      linkedTargetFolderKey,
      linkedPlaceInFolder,
      linkedOverwrite,
      linkedContainerFolderName
    };
    try { localStorage.setItem('IMPORT_DIALOG_OPTS', JSON.stringify(toSave)); } catch {}
  }, [placeInFolder, overwrite, linkFile, pollInterval, linkedPath, targetFolderKey, linkedTargetFolderKey, linkedPlaceInFolder, linkedOverwrite, linkedContainerFolderName]);

  // Función para importación manual (columna izquierda)
  const processManualImport = async () => {
    if (!selectedFile) {
      showToast && showToast({ severity: 'error', summary: 'Error', detail: 'Debe seleccionar un archivo XML', life: 3000 });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      setImportProgress(10);

      const result = await ImportService.importFromMRemoteNG(selectedFile);
      console.log('📋 Resultado de ImportService (manual):', result);
      setImportProgress(80);

      if (!result.success) {
        throw new Error(result.error || 'Error al procesar el archivo');
      }

      if (onImportComplete) {
        console.log('📞 Llamando a onImportComplete (manual)...');
        try {
          await onImportComplete({
            ...result,
            createContainerFolder: !!placeInFolder,
            containerFolderName: containerFolderName,
            overwrite: !!overwrite,
            linkFile: false, // Importación manual, no vinculada
            pollInterval: Number(pollInterval) || 30000,
            linkedFileName: null,
            linkedFilePath: null,
            linkedFileSize: null,
            linkedFileHash: null,
            targetBaseFolderKey: targetFolderKey || ROOT_VALUE,
            linkedTargetFolderKey: targetFolderKey || ROOT_VALUE,
            // Opciones específicas para modo vinculado (no aplican aquí)
            linkedCreateContainerFolder: false,
            linkedContainerFolderName: '',
            linkedOverwrite: false
          });
          console.log('✅ onImportComplete (manual) ejecutado');
        } catch (error) {
          console.error('❌ Error en onImportComplete (manual):', error);
          throw error;
        }
      }

      setImportProgress(100);

      showToast && showToast({
        severity: 'success',
        summary: 'Importación exitosa',
        detail: result.structure && result.structure.folderCount > 0
          ? `Se importaron ${result.structure.connectionCount} conexiones y ${result.structure.folderCount} carpetas`
          : `Se importaron ${result.count} conexiones desde ${result.metadata.source}`,
        life: 5000
      });

      handleClose();

    } catch (error) {
      console.error('Error durante la importación manual:', error);
      showToast && showToast({
        severity: 'error',
        summary: 'Error de importación',
        detail: error.message || 'Error al procesar el archivo XML',
        life: 5000
      });
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  // Función para importación vinculada (columna derecha)
  const processLinkedImport = async () => {
    if (!linkedPath) {
      showToast && showToast({ severity: 'error', summary: 'Error', detail: 'Debe vincular un archivo XML', life: 3000 });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      setImportProgress(10);

      // Leer el archivo vinculado
      const readRes = await window.electron?.import?.readFile?.(linkedPath);
      if (!readRes?.ok) {
        throw new Error('No se pudo leer el archivo vinculado');
      }

      let fileToImport;
      try {
        const fileName = linkedPath.split('\\').pop() || 'import.xml';
        fileToImport = new File([readRes.content], fileName, { type: 'text/xml' });
      } catch (e) {
        fileToImport = new Blob([readRes.content], { type: 'text/xml' });
      }

      const result = await ImportService.importFromMRemoteNG(fileToImport);
      console.log('📋 Resultado de ImportService (vinculado):', result);
      setImportProgress(80);

      if (!result.success) {
        throw new Error(result.error || 'Error al procesar el archivo');
      }

      if (onImportComplete) {
        console.log('📞 Llamando a onImportComplete (vinculado)...');
        try {
          await onImportComplete({
            ...result,
            createContainerFolder: !!linkedPlaceInFolder,
            containerFolderName: linkedContainerFolderName,
            overwrite: !!linkedOverwrite,
            linkFile: true, // Importación vinculada
            pollInterval: Number(pollInterval) || 30000,
            linkedFileName: linkedPath ? linkedPath.split('\\').pop() : null,
            linkedFilePath: linkedPath || null,
            linkedFileSize: fileToImport?.size || null,
            linkedFileHash: result?.metadata?.contentHash || null,
            targetBaseFolderKey: linkedTargetFolderKey || ROOT_VALUE,
            linkedTargetFolderKey: linkedTargetFolderKey || ROOT_VALUE,
            // Opciones específicas para modo vinculado
            linkedCreateContainerFolder: !!linkedPlaceInFolder,
            linkedContainerFolderName: linkedContainerFolderName,
            linkedOverwrite: !!linkedOverwrite
          });
          console.log('✅ onImportComplete (vinculado) ejecutado');
        } catch (error) {
          console.error('❌ Error en onImportComplete (vinculado):', error);
          throw error;
        }
      }

      setImportProgress(100);

      showToast && showToast({
        severity: 'success',
        summary: 'Importación vinculada exitosa',
        detail: result.structure && result.structure.folderCount > 0
          ? `Se importaron ${result.structure.connectionCount} conexiones y ${result.structure.folderCount} carpetas desde el archivo vinculado`
          : `Se importaron ${result.count} conexiones desde ${result.metadata.source}`,
        life: 5000
      });

      // Actualizar el hash conocido
      const hashRes = await window.electron?.import?.getFileHash?.(linkedPath);
      if (hashRes?.ok) setLastKnownHash(hashRes.hash);

      setChangesDetected(false);
      startPreviewPolling();

    } catch (error) {
      console.error('Error durante la importación vinculada:', error);
      showToast && showToast({
        severity: 'error',
        summary: 'Error de importación vinculada',
        detail: error.message || 'Error al procesar el archivo XML vinculado',
        life: 5000
      });
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };


  const handleClose = () => {
    setSelectedFile(null);
    setImporting(false);
    setImportProgress(0);
    setIsDragOver(false);
    onHide();
  };

  const headerTemplate = (options) => {
    return (
      <div className="flex align-items-center">
        <i className="pi pi-upload mr-2" style={{ fontSize: '1.2rem' }}></i>
        <span className="font-bold">Importar sesiones de mRemoteNG</span>
      </div>
    );
  };

  const customFileUploadTemplate = () => {
    return (
      <div className="p-4">
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
            isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          <i className="pi pi-file-excel text-4xl text-gray-400 mb-3"></i>
          <div className="text-lg font-medium text-gray-700 mb-2">
            Seleccionar archivo XML de mRemoteNG
          </div>
          <div className="text-sm text-gray-500 mb-4">
            Arrastra el archivo aquí o haz clic para seleccionar
          </div>
          <Button
            label="Elegir archivo"
            icon="pi pi-folder-open"
            onClick={handleChooseFile}
            className="p-button-outlined"
            disabled={importing}
          />
        </div>
        
        <FileUpload
          ref={fileUploadRef}
          mode="basic"
          name="mremoteng-file"
          accept=".xml"
          maxFileSize={10000000}
          onSelect={handleFileSelect}
          onRemove={handleFileRemove}
          style={{ display: 'none' }}
          chooseLabel="Seleccionar"
        />
        
        {selectedFile && (
          <div className="mt-4 p-3 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">{selectedFile.name}</div>
                <div className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <Button
                icon="pi pi-times"
                className="p-button-rounded p-button-text p-button-danger"
                onClick={handleFileRemove}
                disabled={importing}
                tooltip="Remover archivo"
              />
            </div>
          </div>
        )}
        
        {importing && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">
              Importando conexiones... {importProgress}%
            </div>
            <ProgressBar value={importProgress} />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        visible={visible}
        style={{ width: '900px', maxWidth: '95vw' }}
        header={headerTemplate()}
        modal
        onHide={handleClose}
        closable={!importing}
        footer={
          <div className="flex justify-content-end">
            <Button
              label="Cerrar"
              icon="pi pi-times"
              onClick={handleClose}
              className="p-button-text"
              disabled={importing}
            />
          </div>
        }
      >
        <div className="p-3">
          {/* Layout de 2 columnas con flexbox */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            {/* Columna izquierda - Opciones de importación */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Card className="mb-3" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
                <div className="p-3">
                  <h6 style={{ margin: '0 0 12px 0', color: 'var(--text-color)', fontSize: '14px', fontWeight: '600' }}>
                    <i className="pi pi-cog mr-2"></i>Opciones de importación
                  </h6>
                  
                  {/* Carpeta de destino (manual) */}
                  <div className="mb-3">
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-color)', marginBottom: '6px' }}>
                      Carpeta de destino en la Sidebar
                    </label>
                    <Dropdown
                      value={targetFolderKey}
                      onChange={(e) => setTargetFolderKey(e.value)}
                      options={folderOptionsWithRoot}
                      placeholder="Selecciona carpeta"
                      style={{ width: '100%', maxWidth: '360px' }}
                      disabled={importing}
                    />
                    <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                      Destino actual: {getFolderLabel(targetFolderKey)}
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex align-items-center mb-2" style={{ gap: 8 }}>
                      <input
                        type="checkbox"
                        id="placeInFolder"
                        checked={placeInFolder}
                        onChange={(e) => setPlaceInFolder(e.target.checked)}
                        disabled={importing}
                      />
                      <label htmlFor="placeInFolder" style={{ fontWeight: '500', color: 'var(--text-color)' }}>
                        Crear subcarpeta contenedora
                      </label>
                    </div>
                    {placeInFolder && (
                      <div style={{ marginLeft: '26px' }}>
                        <div className="mb-2">
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-color)', marginBottom: '6px' }}>
                            Nombre de la subcarpeta:
                          </label>
                          <InputText
                            value={containerFolderName}
                            onChange={(e) => setContainerFolderName(e.target.value)}
                            placeholder="Nombre de la carpeta"
                            disabled={importing}
                            style={{ width: '300px', fontSize: '13px' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-2">
                    <div className="flex align-items-center" style={{ gap: 8 }}>
                      <input
                        type="checkbox"
                        id="overwrite"
                        checked={overwrite}
                        onChange={(e) => setOverwrite(e.target.checked)}
                        disabled={importing}
                      />
                      <label htmlFor="overwrite" style={{ fontWeight: '500', color: 'var(--text-color)' }}>
                        Reemplazar duplicados
                      </label>
                    </div>
                    <div style={{ marginLeft: '26px', fontSize: '12px', color: 'var(--text-color-secondary)', marginTop: '4px' }}>
                      {overwrite ? 'Elimina y reemplaza carpetas/conexiones con el mismo nombre. Prioridad al archivo importado.' : 'Permite duplicados sin reemplazar'}
                    </div>
                  </div>

                  {/* Selector de archivo integrado */}
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-color)', marginBottom: '8px' }}>
                      Archivo XML a importar:
                    </label>
                    
                    {/* Texto informativo integrado */}
                    <div style={{ 
                      background: 'var(--blue-50)', 
                      border: '1px solid var(--blue-200)', 
                      borderRadius: '6px', 
                      padding: '12px',
                      marginBottom: '12px',
                      fontSize: '13px',
                      color: 'var(--blue-700)'
                    }}>
                      <i className="pi pi-info-circle mr-2" style={{ color: 'var(--blue-600)' }}></i>
                      Selecciona un archivo XML exportado desde mRemoteNG. Se importarán todas las conexiones SSH y RDP encontradas.
                    </div>
                    
                    {customFileUploadTemplate()}
                  </div>

                  {/* Botón de importación manual */}
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)' }}>
                    <Button
                      label={importing ? "Importando..." : "Importar"}
                      icon={importing ? "pi pi-spin pi-spinner" : "pi pi-upload"}
                      onClick={processManualImport}
                      disabled={!selectedFile || importing || (placeInFolder && !(containerFolderName || '').toString().trim())}
                      className="w-full"
                      severity="primary"
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Columna derecha - Vincular archivo */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Card className="mb-3" style={{ backgroundColor: 'var(--surface-card)', border: linkFile ? '2px solid var(--primary-color)' : '1px solid var(--surface-border)' }}>
                <div className="p-3">
                  <div className="flex align-items-center mb-3" style={{ gap: 8 }}>
                    <input
                      type="checkbox"
                      id="linkFile"
                      checked={linkFile}
                      onChange={(e) => setLinkFile(e.target.checked)}
                      disabled={importing}
                    />
                    <label htmlFor="linkFile" style={{ fontWeight: '600', color: 'var(--text-color)', fontSize: '14px' }}>
                      <i className="pi pi-link mr-2"></i>Vincular archivo y detectar cambios
                    </label>
                  </div>
                  
                  {linkFile && (
                    <div style={{ marginLeft: '26px' }}>
                      <div className="mb-3">
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-color)', marginBottom: '6px' }}>
                          Archivo a vincular:
                        </label>
                        <div className="flex align-items-center" style={{ gap: 8 }}>
                          <InputText
                            value={linkedPath || 'No seleccionado'}
                            readOnly
                            style={{ flex: 1, fontSize: '13px' }}
                            disabled={importing}
                          />
                          <Button
                            label={linkedPath ? 'Cambiar' : 'Seleccionar'}
                            icon="pi pi-folder-open"
                            size="small"
                            onClick={() => linkFileInputRef.current && linkFileInputRef.current.click()}
                            disabled={importing}
                          />
                        </div>
                        <input
                          type="file"
                          accept=".xml"
                          ref={linkFileInputRef}
                          onChange={async (e) => {
                            const f = e.target.files && e.target.files[0];
                            if (!f) return;
                            const p = f.path || f.name;
                            setLinkedPath(p);
                            setSelectedFile(f);
                            const hashRes = await window.electron?.import?.getFileHash?.(p);
                            if (hashRes?.ok) setLastKnownHash(hashRes.hash);
                            startPreviewPolling();
                          }}
                          style={{ display: 'none' }}
                        />
                      </div>

                      {linkedPath && (
                        <div style={{ 
                          background: 'var(--surface-ground)', 
                          border: '1px solid var(--surface-border)', 
                          borderRadius: '6px', 
                          padding: '12px',
                          marginBottom: '12px'
                        }}>
                          <div className="flex align-items-center justify-content-between mb-2">
                            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color)' }}>Estado:</span>
                            <span style={{ fontSize: '13px', color: linkStatus?.color || 'var(--text-color-secondary)' }}>
                              {linkStatus?.text || 'Sin comprobaciones aún'}
                            </span>
                          </div>
                          <div className="flex align-items-center" style={{ gap: 8 }}>
                            <Button
                              label="Detectar cambios"
                              icon="pi pi-refresh"
                              size="small"
                              className="p-button-outlined"
                              onClick={async () => {
                                const h = await window.electron?.import?.getFileHash?.(linkedPath);
                                if (h?.ok && lastKnownHash && h.hash !== lastKnownHash) {
                                  setLinkStatus({ text: 'Cambios detectados', color: '#e67e22' });
                                  setChangesDetected(true);
                                } else {
                                  setLinkStatus({ text: 'Sin cambios', color: '#2e7d32' });
                                  setChangesDetected(false);
                                }
                              }}
                              disabled={importing}
                            />
                            <Button
                              label="Actualizar ahora"
                              icon="pi pi-upload"
                              size="small"
                              onClick={processLinkedImport}
                              disabled={!changesDetected || importing}
                            />
                          </div>
                        </div>
                      )}

                      {/* Carpeta destino para vinculado */}
                      <div className="mb-3" style={{ 
                        background: 'var(--surface-ground)', 
                        border: '1px solid var(--surface-border)', 
                        borderRadius: '6px', 
                        padding: '12px'
                      }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-color)', marginBottom: '8px' }}>
                          Carpeta destino (modo vinculado)
                        </label>
                        <Dropdown
                          value={linkedTargetFolderKey}
                          onChange={(e) => setLinkedTargetFolderKey(e.value)}
                          options={folderOptionsWithRoot}
                          placeholder="Selecciona carpeta"
                          style={{ width: '100%', maxWidth: '360px' }}
                          disabled={importing}
                        />
                        <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                          Actualizando en: {getFolderLabel(linkedTargetFolderKey)}
                        </div>
                      </div>

                      {/* Opciones específicas para modo vinculado */}
                      <div className="mb-3" style={{ 
                        background: 'var(--surface-ground)', 
                        border: '1px solid var(--surface-border)', 
                        borderRadius: '6px', 
                        padding: '12px'
                      }}>
                        <div className="mb-3">
                          <div className="flex align-items-center mb-2" style={{ gap: 8 }}>
                            <input
                              type="checkbox"
                              id="linkedPlaceInFolder"
                              checked={linkedPlaceInFolder}
                              onChange={(e) => setLinkedPlaceInFolder(e.target.checked)}
                              disabled={importing}
                            />
                            <label htmlFor="linkedPlaceInFolder" style={{ fontWeight: '500', color: 'var(--text-color)' }}>
                              Crear subcarpeta contenedora
                            </label>
                          </div>
                          {linkedPlaceInFolder && (
                            <div style={{ marginLeft: '26px' }}>
                              <div className="mb-2">
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-color)', marginBottom: '6px' }}>
                                  Nombre de la subcarpeta:
                                </label>
                                <InputText
                                  value={linkedContainerFolderName}
                                  onChange={(e) => setLinkedContainerFolderName(e.target.value)}
                                  placeholder="Nombre de la carpeta"
                                  disabled={importing}
                                  style={{ width: '100%', maxWidth: '300px', fontSize: '13px' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mb-2">
                          <div className="flex align-items-center" style={{ gap: 8 }}>
                            <input
                              type="checkbox"
                              id="linkedOverwrite"
                              checked={linkedOverwrite}
                              onChange={(e) => setLinkedOverwrite(e.target.checked)}
                              disabled={importing}
                            />
                            <label htmlFor="linkedOverwrite" style={{ fontWeight: '500', color: 'var(--text-color)' }}>
                              Reemplazar duplicados
                            </label>
                          </div>
                          <div style={{ marginLeft: '26px', fontSize: '12px', color: 'var(--text-color-secondary)', marginTop: '4px' }}>
                            {linkedOverwrite ? 'Elimina y reemplaza carpetas/conexiones con el mismo nombre. Prioridad al archivo vinculado.' : 'Permite duplicados sin reemplazar'}
                          </div>
                        </div>
                      </div>

                      <div style={{ 
                        background: 'var(--surface-ground)', 
                        border: '1px solid var(--surface-border)', 
                        borderRadius: '6px', 
                        padding: '12px'
                      }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-color)', marginBottom: '8px' }}>
                          Frecuencia de sondeo:
                        </label>
                        <div className="flex align-items-center" style={{ gap: 12 }}>
                          <Dropdown
                            value={String(pollInterval)}
                            onChange={(e) => setPollInterval(Number(e.value))}
                            options={[
                              { label: '10 segundos', value: '10000' },
                              { label: '30 segundos', value: '30000' },
                              { label: '1 minuto', value: '60000' },
                              { label: '2 minutos', value: '120000' },
                              { label: '5 minutos', value: '300000' }
                            ]}
                            style={{ width: '150px' }}
                            disabled={importing}
                          />
                          <span style={{ fontSize: '13px', color: 'var(--text-color-secondary)' }}>o</span>
                          <InputText
                            type="number"
                            value={pollInterval}
                            onChange={(e) => setPollInterval(Number(e.target.value))}
                            placeholder="ms"
                            min={5000}
                            step={1000}
                            style={{ width: '100px' }}
                            disabled={importing}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>ms</span>
                        </div>
                      </div>

                      {/* Botón principal para importación vinculada */}
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)' }}>
                        <Button
                          label={importing ? "Importando..." : "Importar archivo vinculado"}
                          icon={importing ? "pi pi-spin pi-spinner" : "pi pi-link"}
                          onClick={processLinkedImport}
                          disabled={!linkedPath || importing || (linkedPlaceInFolder && !(linkedContainerFolderName || '').toString().trim())}
                          className="w-full"
                          severity="secondary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
          
          <Divider />
          
          <div className="text-sm text-gray-600">
            <strong>Formatos soportados:</strong>
            <ul className="list-disc list-inside mt-2 ml-4">
              <li>Conexiones SSH (SSH1, SSH2)</li>
              <li>Conexiones RDP</li>
              <li>Otros protocolos se convertirán a SSH</li>
            </ul>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default ImportDialog;
