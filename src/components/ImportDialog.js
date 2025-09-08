import React, { useState, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { FileUpload } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';
import { ProgressBar } from 'primereact/progressbar';
import { Divider } from 'primereact/divider';
import { Message } from 'primereact/message';
import ImportService from '../services/ImportService';

const ImportDialog = ({ 
  visible, 
  onHide, 
  onImportComplete, 
  showToast
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
  const containerFolderName = `mRemoteNG imported - ${new Date().toLocaleDateString()}`;

  const handleFileSelect = (event) => {
    const file = event.files[0];
    if (file) {
      // Validar que sea un archivo XML
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

  // Función para manejar el click en "Elegir archivo" (siempre input nativo)
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

  // Funciones para drag & drop
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
    // Solo cambiar estado si realmente salimos del área
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
      
      // Validar que sea un archivo XML
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

  // Sondeo previo dentro del diálogo para mostrar "última actualización"
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

  const processImport = async () => {
    // Determinar el archivo a importar de forma síncrona (evitar depender de setState)
    let fileToImport = selectedFile;
    if (!fileToImport && linkedPath) {
      const readRes = await window.electron?.import?.readFile?.(linkedPath);
      if (readRes?.ok) {
        try {
          const fileName = linkedPath.split('\\').pop() || 'import.xml';
          fileToImport = new File([readRes.content], fileName, { type: 'text/xml' });
        } catch (e) {
          fileToImport = new Blob([readRes.content], { type: 'text/xml' });
        }
        // Guardar para futuras operaciones, pero usar fileToImport directamente ahora
        try { setSelectedFile(fileToImport); } catch {}
      }
    }
    if (!fileToImport) {
      showToast && showToast({ severity: 'error', summary: 'Error', detail: 'Debe seleccionar un archivo XML', life: 3000 });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      // Simular progreso inicial
      setImportProgress(10);

      // Usar ImportService para procesar el archivo
      const result = await ImportService.importFromMRemoteNG(fileToImport);
      console.log('📋 Resultado de ImportService:', result);
      setImportProgress(80);

      if (!result.success) {
        throw new Error(result.error || 'Error al procesar el archivo');
      }

      // Llamar callback con el resultado completo (estructura incluida)
      if (onImportComplete) {
        console.log('📞 Llamando a onImportComplete...');
        await onImportComplete({
          ...result,
          createContainerFolder: !!placeInFolder,
          containerFolderName,
          overwrite: !!overwrite,
          linkFile: !!linkFile,
          pollInterval: Number(pollInterval) || 30000,
          linkedFileName: linkedPath ? linkedPath.split('\\').pop() : (fileToImport?.name || null),
          linkedFilePath: linkedPath || null,
          linkedFileSize: fileToImport?.size || null,
          linkedFileHash: result?.metadata?.contentHash || null
        });
        console.log('✅ onImportComplete ejecutado');
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

      // Cerrar diálogo
      handleClose();

    } catch (error) {
      console.error('Error durante la importación:', error);
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
          maxFileSize={10000000} // 10MB
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
        style={{ width: '600px' }}
        header={headerTemplate()}
        modal
        onHide={handleClose}
        closable={!importing}
        footer={
          <div className="flex justify-content-end">
            <Button
              label="Cancelar"
              icon="pi pi-times"
              onClick={handleClose}
              className="p-button-text"
              disabled={importing}
            />
            <Button
              label={importing ? "Importando..." : "Importar"}
              icon={importing ? "pi pi-spin pi-spinner" : "pi pi-upload"}
              onClick={processImport}
              disabled={!selectedFile || importing}
              autoFocus
            />
          </div>
        }
      >
        <div className="p-3">
          <Message 
            severity="info" 
            text="Selecciona un archivo XML exportado desde mRemoteNG. Se importarán todas las conexiones SSH y RDP encontradas."
            className="mb-4"
          />
          
          {customFileUploadTemplate()}

          <Divider />
          <div className="mb-3">
            <div className="flex align-items-center mb-2" style={{ gap: 8 }}>
              <input
                type="checkbox"
                id="placeInFolder"
                checked={placeInFolder}
                onChange={(e) => setPlaceInFolder(e.target.checked)}
                disabled={importing}
              />
              <label htmlFor="placeInFolder">Importar dentro de una carpeta</label>
            </div>
            {placeInFolder && (
              <div className="text-sm text-gray-600">Se creará la carpeta “{containerFolderName}” en la raíz y se colocarán todos los elementos dentro.</div>
            )}
          </div>
          <div className="mb-3">
            <div className="flex align-items-center mb-2" style={{ gap: 8 }}>
              <input
                type="checkbox"
                id="overwrite"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                disabled={importing}
              />
              <label htmlFor="overwrite">Sobrescribir (evitar duplicados y fusionar por nombre)</label>
            </div>
            {!overwrite && (
              <div className="text-sm text-gray-600">Si no está activado, se permiten duplicados de carpetas y sesiones.</div>
            )}
          </div>
          <Divider />
          <div className="mb-3">
            <div className="flex align-items-center mb-2" style={{ gap: 8 }}>
              <input
                type="checkbox"
                id="linkFile"
                checked={linkFile}
                onChange={(e) => setLinkFile(e.target.checked)}
                disabled={importing}
              />
              <label htmlFor="linkFile">Vincular archivo y detectar cambios</label>
            </div>
            {linkFile && (
              <>
              <div style={{
                border: '1px solid #ddd',
                borderRadius: 6,
                padding: 10,
                marginBottom: 8,
                background: '#f9fafb'
              }}>
                <div className="flex align-items-center" style={{ gap: 8, marginBottom: 8 }}>
                  <label style={{ minWidth: 130, fontSize: 12, color: '#555' }}>Archivo vinculado:</label>
                  <input
                    type="text"
                    readOnly
                    value={linkedPath || 'No seleccionado'}
                    style={{ flex: 1, height: 26, fontSize: 12, padding: '2px 6px' }}
                  />
                  <Button
                    label={linkedPath ? 'Cambiar…' : 'Seleccionar…'}
                    icon="pi pi-link"
                    onClick={() => linkFileInputRef.current && linkFileInputRef.current.click()}
                    className="p-button-outlined"
                    disabled={importing}
                  />
                  <input
                    type="file"
                    accept=".xml"
                    ref={linkFileInputRef}
                    onChange={async (e) => {
                      const f = e.target.files && e.target.files[0];
                      if (!f) return;
                      const p = f.path || f.name;
                      setLinkedPath(p);
                      // Usar este fichero como seleccionado para importar
                      setSelectedFile(f);
                      // Hash inicial
                      const hashRes = await window.electron?.import?.getFileHash?.(p);
                      if (hashRes?.ok) setLastKnownHash(hashRes.hash);
                      startPreviewPolling();
                    }}
                    style={{ display: 'none' }}
                  />
                </div>
                <div className="flex align-items-center" style={{ gap: 8 }}>
                  <label style={{ minWidth: 130, fontSize: 12, color: '#555' }}>Estado:</label>
                  <span style={{ fontSize: 12, color: linkStatus?.color || '#666' }}>{linkStatus?.text || 'Sin comprobaciones aún'}</span>
                  {linkedPath && (
                    <>
                      <Button
                        label="Detectar cambios"
                        icon="pi pi-refresh"
                        className="p-button-text"
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
                        onClick={processImport}
                        disabled={!changesDetected || importing}
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="flex align-items-center" style={{ gap: 12, marginTop: 6 }}>
                <div className="flex align-items-center" style={{ gap: 8 }}>
                  <label htmlFor="pollInterval" className="text-sm text-gray-600">Sondeo:</label>
                  <select
                    id="pollIntervalPreset"
                    value={String(pollInterval)}
                    onChange={(e) => setPollInterval(Number(e.target.value))}
                    disabled={importing}
                    style={{ height: 28 }}
                  >
                    <option value="10000">10s</option>
                    <option value="30000">30s</option>
                    <option value="60000">1 min</option>
                    <option value="120000">2 min</option>
                    <option value="300000">5 min</option>
                  </select>
                </div>
                <div className="flex align-items-center" style={{ gap: 8 }}>
                  <label htmlFor="pollInterval" className="text-sm text-gray-600">Personalizado (ms):</label>
                  <input
                    id="pollInterval"
                    type="number"
                    min={5000}
                    step={1000}
                    value={pollInterval}
                    onChange={(e) => setPollInterval(Number(e.target.value))}
                    disabled={importing}
                    style={{ width: 120, height: 26 }}
                  />
                </div>
              </div>
              </>
            )}
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
