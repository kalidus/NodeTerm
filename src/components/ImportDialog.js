import React, { useState, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
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
  const [manualSelectedFile, setManualSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragOverLinked, setIsDragOverLinked] = useState(false);
  const toast = useRef(null);
  const [placeInFolder, setPlaceInFolder] = useState(true);
  const [importInRoot, setImportInRoot] = useState(false);
  const [overwrite, setOverwrite] = useState(true);
  const [linkFile, setLinkFile] = useState(false);
  const [pollInterval, setPollInterval] = useState(30000); // 30s por defecto
  const [linkedPath, setLinkedPath] = useState('');
  const [linkedFromUrl, setLinkedFromUrl] = useState(false);
  const [linkedUrl, setLinkedUrl] = useState('');
  const [linkedDownloadSince, setLinkedDownloadSince] = useState(null);
  const [linkStatus, setLinkStatus] = useState(null); // { text, color }
  const lastCheckRef = useRef(null);
  const [lastCheckMs, setLastCheckMs] = useState(null);
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
  const [linkedImportInRoot, setLinkedImportInRoot] = useState(false);
  const [linkedPlaceInFolder, setLinkedPlaceInFolder] = useState(true);
  const [linkedOverwrite, setLinkedOverwrite] = useState(true);
  const [linkedContainerFolderName, setLinkedContainerFolderName] = useState(`mRemoteNG linked - ${new Date().toLocaleDateString()}`);
  
  // Estados para sustitución de usuarios
  const [analyzedUsers, setAnalyzedUsers] = useState([]);
  const [userSubstitutions, setUserSubstitutions] = useState([]);
  const [showUserSubstitution, setShowUserSubstitution] = useState(false);
  const [analyzedFileContent, setAnalyzedFileContent] = useState(null);
  
  const getFolderLabel = (key) => {
    const opt = (folderOptionsWithRoot || []).find(o => o.value === key);
    return opt ? opt.label : 'Raíz';
  };

  // Helper para mostrar toasts aunque no pasen showToast desde fuera
  const showToastSafe = (opts) => {
    try {
      if (showToast) {
        showToast(opts);
      } else if (toast?.current?.show) {
        toast.current.show({ life: 4000, ...opts });
      }
    } catch {}
  };

  const handleFileSelect = async (event) => {
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
      setManualSelectedFile(file);
      
      // Analizar usuarios en el archivo
      try {
        const result = await ImportService.importFromMRemoteNG(file);
        if (result.success && result.topUsers && result.topUsers.length > 0) {
          setAnalyzedUsers(result.topUsers);
          setShowUserSubstitution(true);
          setAnalyzedFileContent(file);
          // Inicializar sustituciones vacías
          setUserSubstitutions(result.topUsers.map(user => ({
            originalUsername: user.username,
            newUsername: '',
            enabled: false
          })));
        } else {
          setAnalyzedUsers([]);
          setShowUserSubstitution(false);
          setAnalyzedFileContent(null);
        }
      } catch (error) {
        console.error('Error analizando usuarios:', error);
        setAnalyzedUsers([]);
        setShowUserSubstitution(false);
        setAnalyzedFileContent(null);
      }
    }
  };

  const handleFileRemove = () => {
    setManualSelectedFile(null);
    setAnalyzedUsers([]);
    setUserSubstitutions([]);
    setShowUserSubstitution(false);
    setAnalyzedFileContent(null);
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

  // Handlers para drag & drop en modo vinculado
  const handleDragOverLinked = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverLinked(true);
  };

  const handleDragEnterLinked = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverLinked(true);
  };

  const handleDragLeaveLinked = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOverLinked(false);
    }
  };

  const handleDropLinked = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverLinked(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.xml')) {
        showToast && showToast({
          severity: 'error',
          summary: 'Error',
          detail: 'Solo se permiten archivos XML de mRemoteNG',
          life: 3000
        });
        return;
      }
      const p = file.path || file.name;
      setLinkedPath(p);
      try {
        const hashRes = await window.electron?.import?.getFileHash?.(p);
        if (hashRes?.ok) setLastKnownHash(hashRes.hash);
      } catch {}
      startPreviewPolling();
    }
  };

  const handleFileRemoveLinked = () => {
    setLinkedPath('');
    setLinkStatus(null);
    setLastKnownHash(null);
    setChangesDetected(false);
    try { if (linkFileInputRef.current) linkFileInputRef.current.value = ''; } catch {}
  };

  const startPreviewPolling = () => {
    if (!linkFile) return;
    if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    const run = async () => {
      try {
        if (linkedFromUrl) {
          if (!linkedUrl) return;
          const res = await window.electron?.import?.findLatestXmlDownload?.({ sinceMs: Date.now() - Math.max(5000, Number(pollInterval) || 30000) });
          if (res?.ok && res.latest) {
            // Actualizar path si es distinto al actual
            if (!linkedPath || linkedPath !== res.latest.path) {
              setLinkedPath(res.latest.path);
            }
            // Hash y estado
            const h = await window.electron?.import?.getFileHash?.(res.latest.path);
            lastCheckRef.current = Date.now();
            setLastCheckMs(lastCheckRef.current);
            const d = new Date(lastCheckRef.current);
            if (h?.ok && lastKnownHash && h.hash !== lastKnownHash) {
              setLinkStatus({ text: `Cambios detectados • ${d.toLocaleTimeString()}`, color: '#e67e22' });
              setChangesDetected(true);
              showToastSafe({ severity: 'info', summary: 'Cambios detectados', detail: 'Hay una nueva versión del XML descargado' });
            } else {
              setLinkStatus({ text: `Vinculado • Última comprobación ${d.toLocaleTimeString()} • ${Math.round((res.latest.size||0)/1024)} KB`, color: '#2e7d32' });
              setChangesDetected(false);
            }
            if (res.latest && res.latest.path) {
              // Persistir última URL y hash cuando esté disponible
              try { localStorage.setItem('IMPORT_DIALOG_LAST_URL', linkedUrl || ''); } catch {}
              if (h?.ok) try { localStorage.setItem('IMPORT_DIALOG_LAST_HASH', h.hash); } catch {}
            }
          }
        } else if (linkedPath) {
          const info = await window.electron?.import?.getFileInfo?.(linkedPath);
          if (info?.ok) {
            const h = await window.electron?.import?.getFileHash?.(linkedPath);
            lastCheckRef.current = Date.now();
            setLastCheckMs(lastCheckRef.current);
            const d = new Date(lastCheckRef.current);
            if (h?.ok && lastKnownHash && h.hash !== lastKnownHash) {
              setLinkStatus({ text: `Cambios detectados • ${d.toLocaleTimeString()}`, color: '#e67e22' });
              setChangesDetected(true);
            } else {
              setLinkStatus({ text: `Vinculado • Última comprobación ${d.toLocaleTimeString()} • ${Math.round(info.size/1024)} KB`, color: '#2e7d32' });
              setChangesDetected(false);
            }
          }
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

  // Asegurar exclusión mutua entre placeInFolder e importInRoot
  React.useEffect(() => {
    if (placeInFolder && importInRoot) {
      setImportInRoot(false);
    }
  }, [placeInFolder, importInRoot]);

  // Asegurar exclusión mutua entre linkedPlaceInFolder y linkedImportInRoot
  React.useEffect(() => {
    if (linkedPlaceInFolder && linkedImportInRoot) {
      setLinkedImportInRoot(false);
    }
  }, [linkedPlaceInFolder, linkedImportInRoot]);

  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('IMPORT_DIALOG_OPTS') || '{}');
      if (saved) {
        if (typeof saved.placeInFolder === 'boolean' && saved.placeInFolder) setPlaceInFolder(saved.placeInFolder);
        if (typeof saved.importInRoot === 'boolean') setImportInRoot(saved.importInRoot);
        if (typeof saved.overwrite === 'boolean') setOverwrite(saved.overwrite);
        if (typeof saved.linkFile === 'boolean') setLinkFile(saved.linkFile);
        if (typeof saved.pollInterval === 'number') setPollInterval(saved.pollInterval);
        if (typeof saved.linkedPath === 'string') setLinkedPath(saved.linkedPath);
        if (typeof saved.targetFolderKey === 'string') setTargetFolderKey(saved.targetFolderKey);
        if (typeof saved.linkedTargetFolderKey === 'string') setLinkedTargetFolderKey(saved.linkedTargetFolderKey);
        if (typeof saved.linkedImportInRoot === 'boolean') setLinkedImportInRoot(saved.linkedImportInRoot);
        if (typeof saved.linkedPlaceInFolder === 'boolean' && saved.linkedPlaceInFolder) setLinkedPlaceInFolder(saved.linkedPlaceInFolder);
        if (typeof saved.linkedOverwrite === 'boolean') setLinkedOverwrite(saved.linkedOverwrite);
        if (typeof saved.linkedContainerFolderName === 'string') setLinkedContainerFolderName(saved.linkedContainerFolderName);
        if (typeof saved.linkedFromUrl === 'boolean') setLinkedFromUrl(saved.linkedFromUrl);
        if (typeof saved.linkedUrl === 'string') setLinkedUrl(saved.linkedUrl);
      }
      // Restaurar último fichero y hash de descarga si existen
      const lastDlPath = localStorage.getItem('IMPORT_DIALOG_LAST_DL_PATH');
      const lastDlHash = localStorage.getItem('IMPORT_DIALOG_LAST_HASH');
      const lastDlMs = Number(localStorage.getItem('IMPORT_DIALOG_LAST_DL_MS') || 0);
      if (lastDlPath) {
        // Verificar que el archivo exista
        (async () => {
          try {
            const info = await window.electron?.import?.getFileInfo?.(lastDlPath);
            if (info?.ok) {
              setLinkedPath(lastDlPath);
              if (lastDlHash) setLastKnownHash(lastDlHash);
            }
          } catch {}
        })();
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
      importInRoot,
      overwrite,
      linkFile,
      pollInterval,
      linkedPath,
      targetFolderKey,
      linkedTargetFolderKey,
      linkedImportInRoot,
      linkedPlaceInFolder,
      linkedOverwrite,
      linkedContainerFolderName,
      linkedFromUrl,
      linkedUrl
    };
    try { localStorage.setItem('IMPORT_DIALOG_OPTS', JSON.stringify(toSave)); } catch {}
  }, [placeInFolder, importInRoot, overwrite, linkFile, pollInterval, linkedPath, targetFolderKey, linkedTargetFolderKey, linkedImportInRoot, linkedPlaceInFolder, linkedOverwrite, linkedContainerFolderName, linkedFromUrl, linkedUrl]);

  // Auto-cargar último fichero y refrescar en segundo plano al abrir el diálogo
  React.useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        if (linkedFromUrl && (linkedUrl || localStorage.getItem('IMPORT_DIALOG_LAST_URL'))) {
          const lastUrl = linkedUrl || localStorage.getItem('IMPORT_DIALOG_LAST_URL');
          if (!linkedUrl) setLinkedUrl(lastUrl || '');
          const lastDlPath = localStorage.getItem('IMPORT_DIALOG_LAST_DL_PATH');
          const lastDlHash = localStorage.getItem('IMPORT_DIALOG_LAST_HASH');
          const lastDlMs = Number(localStorage.getItem('IMPORT_DIALOG_LAST_DL_MS') || 0);

          // Mostrar último fichero si existe
          if (lastDlPath) {
            const info = await window.electron?.import?.getFileInfo?.(lastDlPath);
            if (info?.ok) {
              setLinkedPath(lastDlPath);
              if (lastDlHash) setLastKnownHash(lastDlHash);
            }
          }

          // Intentar actualización transparente si está desactualizado
          const maxAge = Math.max(5000, Number(pollInterval) || 30000);
          if (!lastDlMs || (Date.now() - lastDlMs) > maxAge) {
            showToastSafe({ severity: 'info', summary: 'Actualizando', detail: 'Abriendo URL para verificar cambios…' });
            // Abrir navegador y esperar nueva descarga sin interacción
            if (lastUrl) {
              try { await window.electron?.import?.openExternal?.(lastUrl); } catch {}
              const timeoutMs = 15000;
              const pollEvery = 1000;
              const startedAt = Date.now();
              let found = null;
              while (Date.now() - startedAt < timeoutMs) {
                const res = await window.electron?.import?.findLatestXmlDownload?.({ sinceMs: startedAt - 1000 });
                if (res?.ok && res.latest) { found = res.latest; break; }
                await new Promise(r => setTimeout(r, pollEvery));
              }
              if (found) {
                setLinkedPath(found.path);
                const h = await window.electron?.import?.getFileHash?.(found.path);
                if (h?.ok) {
                  setLastKnownHash(h.hash);
                  try { localStorage.setItem('IMPORT_DIALOG_LAST_HASH', h.hash); } catch {}
                }
                try {
                  localStorage.setItem('IMPORT_DIALOG_LAST_DL_PATH', found.path);
                  localStorage.setItem('IMPORT_DIALOG_LAST_DL_MS', String(found.mtimeMs || Date.now()));
                } catch {}
                showToastSafe({ severity: 'success', summary: 'Actualizado', detail: 'Archivo descargado y vinculado correctamente' });
              } else {
                showToastSafe({ severity: 'warn', summary: 'Descarga no detectada', detail: 'No se encontró el XML en Descargas (15s). Vuelve a intentar.' });
              }
            }
          }
        }
      } catch {}
    })();
  }, [visible]);

  // Función para importación manual (columna izquierda)
  const processManualImport = async () => {
    if (!manualSelectedFile) {
      showToast && showToast({ severity: 'error', summary: 'Error', detail: 'Debe seleccionar un archivo XML', life: 3000 });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      setImportProgress(10);

      const result = await ImportService.importFromMRemoteNG(manualSelectedFile);
      console.log('📋 Resultado de ImportService (manual):', result);
      
      // Aplicar sustituciones de usuarios si las hay
      let finalResult = result;
      const activeSubstitutions = userSubstitutions.filter(sub => sub.enabled && sub.newUsername.trim() !== '');
      if (activeSubstitutions.length > 0) {
        console.log('🔄 Aplicando sustituciones de usuarios:', activeSubstitutions);
        const substitutions = activeSubstitutions.map(sub => ({
          originalUsername: sub.originalUsername,
          newUsername: sub.newUsername
        }));
        
        // Aplicar sustituciones a la estructura
        const modifiedStructure = ImportService.applyUserSubstitutions(result.structure.nodes, substitutions);
        finalResult = {
          ...result,
          structure: {
            ...result.structure,
            nodes: modifiedStructure
          }
        };
      }
      
      setImportProgress(80);

      if (!finalResult.success) {
        throw new Error(finalResult.error || 'Error al procesar el archivo');
      }

      if (onImportComplete) {
        console.log('📞 Llamando a onImportComplete (manual)...');
        try {
          await onImportComplete({
            ...finalResult,
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
        detail: finalResult.structure && finalResult.structure.folderCount > 0
          ? `Se importaron ${finalResult.structure.connectionCount} conexiones y ${finalResult.structure.folderCount} carpetas`
          : `Se importaron ${finalResult.count} conexiones desde ${finalResult.metadata.source}`,
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
    if (!linkedFromUrl && !linkedPath) {
      showToast && showToast({ severity: 'error', summary: 'Error', detail: 'Debe vincular un archivo XML', life: 3000 });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      setImportProgress(10);

      let fileToImport;
      if (linkedFromUrl) {
        // Descargar mediante navegador (sesión del usuario)
        const startedAt = Date.now();
        setLinkedDownloadSince(startedAt);
        await window.electron?.import?.openExternal?.(linkedUrl);
        // Esperar a que aparezca el XML en Descargas
        const timeoutMs = 15000; // 15s
        const pollEvery = 1000;
        let found = null;
        const downloadsPathRes = await window.electron?.import?.getDownloadsPath?.();
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          const res = await window.electron?.import?.findLatestXmlDownload?.({ sinceMs: startedAt - 1000 });
          if (res?.ok && res.latest) { found = res.latest; break; }
          await new Promise(r => setTimeout(r, pollEvery));
        }
        if (!found) throw new Error('No se detectó la descarga del XML en la carpeta Descargas');
        setLinkedPath(found.path);
        const readRes = await window.electron?.import?.readFile?.(found.path);
        if (!readRes?.ok) throw new Error('No se pudo leer el archivo descargado');
        try {
          const fileName = found.fileName || 'import.xml';
          fileToImport = new File([readRes.content], fileName, { type: 'text/xml' });
        } catch (e) {
          fileToImport = new Blob([readRes.content], { type: 'text/xml' });
        }
        // Guardar última descarga
        try {
          localStorage.setItem('IMPORT_DIALOG_LAST_DL_PATH', found.path);
          localStorage.setItem('IMPORT_DIALOG_LAST_DL_MS', String(found.mtimeMs || Date.now()));
        } catch {}
      } else {
        // Leer archivo vinculado del disco
        const readRes = await window.electron?.import?.readFile?.(linkedPath);
        if (!readRes?.ok) {
          throw new Error('No se pudo leer el archivo vinculado');
        }
        try {
          const fileName = linkedPath.split('\\').pop() || 'import.xml';
          fileToImport = new File([readRes.content], fileName, { type: 'text/xml' });
        } catch (e) {
          fileToImport = new Blob([readRes.content], { type: 'text/xml' });
        }
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
            linkedFileName: linkedFromUrl ? (linkedPath ? linkedPath.split('\\').pop() : 'descarga.xml') : (linkedPath ? linkedPath.split('\\').pop() : null),
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


  // Funciones para manejar sustituciones de usuarios
  const handleUserSubstitutionChange = (index, field, value) => {
    const newSubstitutions = [...userSubstitutions];
    newSubstitutions[index] = {
      ...newSubstitutions[index],
      [field]: value
    };
    setUserSubstitutions(newSubstitutions);
  };

  const handleClose = () => {
    setManualSelectedFile(null);
    setImporting(false);
    setImportProgress(0);
    setIsDragOver(false);
    setAnalyzedUsers([]);
    setUserSubstitutions([]);
    setShowUserSubstitution(false);
    setAnalyzedFileContent(null);
    onHide();
  };

  const headerTemplate = (options) => {
    return (
      <div className="flex align-items-center">
        <i className="pi pi-upload mr-2" style={{ fontSize: '1.2rem' }}></i>
        <span className="font-bold">Importar sesiones</span>
      </div>
    );
  };


  return (
    <>
      <Toast ref={toast} />
      <Dialog
        visible={visible}
        style={{ width: '900px', maxWidth: '95vw' }}
        contentStyle={{ padding: '0' }}
        className="import-dialog"
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
        <div style={{ padding: '0 16px 16px 16px' }}>
          {/* Layout de 2 filas: Card manual arriba y Card vinculada abajo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            {/* Primera fila - Importación manual */}
            <Card style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
              <div style={{ padding: '0 16px 16px 16px' }}>
                <div style={{ 
                  margin: '0 0 16px 0', 
                  padding: '0 0 8px 0',
                  borderBottom: '1px solid var(--surface-border)'
                }}>
                  <h5 style={{ 
                    margin: '0', 
                    color: 'var(--text-color)', 
                    fontSize: '16px', 
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="pi pi-cog" style={{ fontSize: '16px', color: 'var(--primary-color)' }}></i>
                    Opciones de importación
                  </h5>
                </div>
                {/* Grid a dos columnas: izquierda (opciones), derecha (archivo) */}
                <div className="import-two-col-grid">
                  {/* Columna izquierda: Opciones de importación */}
                  <div>
                    {/* 1. Crear carpeta */}
                    <div className="mb-3">
                      <div className="flex align-items-center mb-2" style={{ gap: 8 }}>
                        <input
                          type="checkbox"
                          id="placeInFolder"
                          checked={placeInFolder}
                          onChange={(e) => {
                            setPlaceInFolder(e.target.checked);
                            if (e.target.checked) {
                              setImportInRoot(false);
                            }
                          }}
                          disabled={importing}
                        />
                        <label htmlFor="placeInFolder" style={{ fontWeight: '500', color: 'var(--text-color)' }}>
                          Crear carpeta
                        </label>
                      </div>
                      {placeInFolder && (
                        <div style={{ marginLeft: '26px' }}>
                          <div className="mb-2">
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-color)', marginBottom: '6px' }}>
                              Nombre de la carpeta:
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

                    {/* 2. Importar en Raíz */}
                    <div className="mb-3">
                      <div className="flex align-items-center" style={{ gap: 8 }}>
                        <input
                          type="checkbox"
                          id="importInRoot"
                          checked={importInRoot}
                          onChange={(e) => {
                            setImportInRoot(e.target.checked);
                            if (e.target.checked) {
                              setTargetFolderKey('ROOT');
                              setPlaceInFolder(false);
                            } else {
                              setTargetFolderKey(folderOptionsWithRoot[1]?.value || 'ROOT');
                            }
                          }}
                          disabled={importing}
                        />
                        <label htmlFor="importInRoot" style={{ fontWeight: '500', color: 'var(--text-color)' }}>
                          Importar en Raíz
                        </label>
                      </div>
                      <div style={{ marginLeft: '26px', fontSize: '12px', color: 'var(--text-color-secondary)', marginTop: '4px' }}>
                        {importInRoot ? 'Las conexiones se importarán directamente en la raíz de la sidebar' : `Importando en: ${getFolderLabel(targetFolderKey)}`}
                      </div>
                    </div>

                    {/* 3. Reemplazar duplicados */}
                    <div className="mb-3">
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
                  </div>

                  {/* Columna derecha: Área de archivo XML y progreso */}
                  <div>
                    <div className="flex align-items-center mb-3" style={{ gap: 8 }}>
                      <i className="pi pi-file" style={{ fontSize: '16px', color: 'var(--text-color)' }}></i>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-color)' }}>
                        Archivo XML
                      </span>
                    </div>

                    {!manualSelectedFile ? (
                      <div 
                        className={`border-2 border-dashed rounded-lg text-center transition-all duration-200 cursor-pointer ${
                          isDragOver 
                            ? 'border-blue-400 bg-blue-50' 
                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                        style={{ padding: '20px' }}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onClick={handleChooseFile}
                      >
                        <i className="pi pi-cloud-upload text-2xl mb-2" style={{ color: 'var(--text-color-secondary)' }}></i>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-color)', marginBottom: '4px' }}>
                          Arrastra tu archivo XML aquí
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                          o haz clic para seleccionar
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        background: 'var(--green-50)', 
                        border: '1px solid var(--green-200)', 
                        borderRadius: '8px', 
                        padding: '16px'
                      }}>
                        <div className="flex align-items-center justify-content-between">
                          <div className="flex align-items-center" style={{ gap: 12 }}>
                            <div style={{ 
                              background: 'var(--green-500)', 
                              borderRadius: '50%', 
                              width: '40px', 
                              height: '40px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center' 
                            }}>
                              <i className="pi pi-file" style={{ color: 'white', fontSize: '16px' }}></i>
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-color)', marginBottom: '2px' }}>
                                {manualSelectedFile.name}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                                {(manualSelectedFile.size / 1024).toFixed(1)} KB • Archivo XML de mRemoteNG
                              </div>
                            </div>
                          </div>
                          <div className="flex align-items-center" style={{ gap: 8 }}>
                            <Button
                              icon="pi pi-refresh"
                              className="p-button-outlined p-button-sm"
                              onClick={handleChooseFile}
                              disabled={importing}
                              tooltip="Cambiar archivo"
                              tooltipOptions={{ position: 'top' }}
                            />
                            <Button
                              icon="pi pi-times"
                              className="p-button-outlined p-button-danger p-button-sm"
                              onClick={handleFileRemove}
                              disabled={importing}
                              tooltip="Remover archivo"
                              tooltipOptions={{ position: 'top' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sección de sustitución de usuarios - Layout compacto */}
                    {showUserSubstitution && analyzedUsers.length > 0 && (
                      <div style={{ 
                        marginTop: '12px', 
                        padding: '8px', 
                        background: 'var(--blue-50)', 
                        border: '1px solid var(--blue-200)', 
                        borderRadius: '6px' 
                      }}>
                        <div className="flex align-items-center mb-2" style={{ gap: 6 }}>
                          <i className="pi pi-users" style={{ fontSize: '12px', color: 'var(--primary-color)' }}></i>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-color)' }}>
                            Usuarios más frecuentes detectados
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '10px', color: 'var(--text-color-secondary)', marginBottom: '8px' }}>
                          Puedes sustituir los nombres de usuario más utilizados antes de importar:
                        </div>

                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {analyzedUsers.map((user, index) => (
                            <div key={user.username} style={{ 
                              marginBottom: '6px', 
                              padding: '6px', 
                              background: 'white', 
                              border: '1px solid var(--surface-border)', 
                              borderRadius: '4px' 
                            }}>
                              <div className="flex align-items-center justify-content-between mb-1">
                                <div className="flex align-items-center" style={{ gap: 6 }}>
                                  <input
                                    type="checkbox"
                                    id={`substitute-${index}`}
                                    checked={userSubstitutions[index]?.enabled || false}
                                    onChange={(e) => handleUserSubstitutionChange(index, 'enabled', e.target.checked)}
                                    disabled={importing}
                                    style={{ transform: 'scale(0.8)' }}
                                  />
                                  <label htmlFor={`substitute-${index}`} style={{ fontWeight: '500', color: 'var(--text-color)', fontSize: '10px' }}>
                                    <strong>{user.username}</strong>
                                  </label>
                                </div>
                                <span style={{ fontSize: '9px', color: 'var(--text-color-secondary)' }}>
                                  {user.count} conexiones
                                </span>
                              </div>
                              
                              {userSubstitutions[index]?.enabled && (
                                <div style={{ marginLeft: '20px' }}>
                                  <div className="flex align-items-center" style={{ gap: 6 }}>
                                    <span style={{ fontSize: '9px', color: 'var(--text-color-secondary)' }}>
                                      Sustituir por:
                                    </span>
                                    <InputText
                                      value={userSubstitutions[index]?.newUsername || ''}
                                      onChange={(e) => handleUserSubstitutionChange(index, 'newUsername', e.target.value)}
                                      placeholder="Nuevo nombre de usuario"
                                      disabled={importing}
                                      style={{ flex: 1, fontSize: '10px', height: '20px', padding: '2px 6px' }}
                                    />
                                  </div>
                                  {user.connections.length > 0 && (
                                    <div style={{ marginTop: '4px', fontSize: '8px', color: 'var(--text-color-secondary)' }}>
                                      <div style={{ marginBottom: '2px' }}>
                                        <strong>Conexiones:</strong> {user.connections.slice(0, 2).join(', ')}
                                        {user.connections.length > 2 && ` +${user.connections.length - 2}`}
                                      </div>
                                      {user.contexts && user.contexts.length > 0 && (
                                        <div>
                                          <strong>Contextos:</strong>
                                          <div style={{ marginTop: '1px', fontFamily: 'monospace', fontSize: '7px' }}>
                                            {user.contexts.slice(0, 1).map((context, idx) => (
                                              <div key={idx} style={{ marginBottom: '1px', wordBreak: 'break-all' }}>
                                                {context}
                                              </div>
                                            ))}
                                            {user.contexts.length > 1 && (
                                              <div style={{ color: 'var(--text-color-secondary)' }}>
                                                ... +{user.contexts.length - 1} más
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {importing && (
                      <div style={{ marginTop: '12px', padding: '12px', background: 'var(--surface-ground)', borderRadius: '6px' }}>
                        <div className="flex align-items-center justify-content-between mb-2">
                          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color)' }}>
                            Importando conexiones...
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--text-color-secondary)' }}>
                            {importProgress}%
                          </span>
                        </div>
                        <ProgressBar value={importProgress} style={{ height: '6px' }} />
                      </div>
                    )}

                    {/* Botón de importación manual dentro de la columna de Archivo */}
                    <div style={{ marginTop: '1rem' }}>
                      <Button
                        label={importing ? "Importando..." : "Importar"}
                        icon={importing ? "pi pi-spin pi-spinner" : "pi pi-upload"}
                        onClick={processManualImport}
                        disabled={!manualSelectedFile || importing || (placeInFolder && !(containerFolderName || '').toString().trim())}
                        className="w-full"
                        severity="primary"
                      />
                    </div>
                  </div>
                </div>
                
              </div>
            </Card>

            {/* Segunda fila - Modo vinculado */}
            <Card style={{ backgroundColor: 'var(--surface-card)', border: linkFile ? '2px solid var(--primary-color)' : '1px solid var(--surface-border)' }}>
              <div style={{ padding: '0 16px 16px 16px' }}>
                <div style={{ 
                  margin: '0 0 16px 0', 
                  padding: '0 0 8px 0',
                  borderBottom: '1px solid var(--surface-border)'
                }}>
                  <div className="flex align-items-center" style={{ gap: 8, justifyContent: 'space-between' }}>
                    <div className="flex align-items-center" style={{ gap: 8 }}>
                      <input
                        type="checkbox"
                        id="linkFile"
                        checked={linkFile}
                        onChange={(e) => setLinkFile(e.target.checked)}
                        disabled={importing}
                      />
                      <h5 style={{ 
                        margin: '0', 
                        color: 'var(--text-color)', 
                        fontSize: '16px', 
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <i className="pi pi-link" style={{ fontSize: '16px', color: 'var(--primary-color)' }}></i>
                        Vincular archivo y detectar cambios
                      </h5>
                    </div>
                    <div style={{ fontSize: '12px', color: linkStatus?.color || 'var(--text-color-secondary)', textAlign: 'right' }}>
                      {linkFile ? (
                        `${linkedFromUrl ? 'URL' : 'Archivo'}${linkedPath ? ' • ' + (linkedPath.split('\\').pop() || linkedPath.split('/').pop()) : ''}${lastCheckMs ? ' • Última: ' + new Date(lastCheckMs).toLocaleTimeString() : ''}`
                      ) : ''}
                    </div>
                  </div>
                </div>
                
                {linkFile && (
                  <div>
                    <div className="import-two-col-grid">
                      {/* Columna izquierda: opciones vinculadas */}
                      <div>
                        {/* Importar en Raíz para vinculado (estilo compacto) */}
                        <div className="mb-3">
                          <div className="flex align-items-center" style={{ gap: 8 }}>
                            <input
                              type="checkbox"
                              id="linkedImportInRoot"
                              checked={linkedImportInRoot}
                              onChange={(e) => {
                                setLinkedImportInRoot(e.target.checked);
                                if (e.target.checked) {
                                  setLinkedTargetFolderKey('ROOT');
                                  setLinkedPlaceInFolder(false);
                                } else {
                                  setLinkedTargetFolderKey(folderOptionsWithRoot[1]?.value || 'ROOT');
                                }
                              }}
                              disabled={importing}
                            />
                            <label htmlFor="linkedImportInRoot" style={{ fontWeight: '500', color: 'var(--text-color)' }}>
                              Importar en Raíz (modo vinculado)
                            </label>
                          </div>
                          <div style={{ marginLeft: '26px', fontSize: '12px', color: 'var(--text-color-secondary)', marginTop: '4px' }}>
                            {linkedImportInRoot ? 'Las actualizaciones se aplicarán directamente en la raíz de la sidebar' : `Actualizando en: ${getFolderLabel(linkedTargetFolderKey)}`}
                          </div>
                        </div>

                        {/* Crear carpeta (vinculado) */}
                        <div className="mb-3">
                          <div className="flex align-items-center mb-2" style={{ gap: 8 }}>
                            <input
                              type="checkbox"
                              id="linkedPlaceInFolder"
                              checked={linkedPlaceInFolder}
                              onChange={(e) => {
                                setLinkedPlaceInFolder(e.target.checked);
                                if (e.target.checked) {
                                  setLinkedImportInRoot(false);
                                }
                              }}
                              disabled={importing}
                            />
                            <label htmlFor="linkedPlaceInFolder" style={{ fontWeight: '500', color: 'var(--text-color)' }}>
                              Crear carpeta
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

                        {/* Reemplazar duplicados (vinculado) */}
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

                        {/* Frecuencia de sondeo (solo selector, alineado al margen izquierdo) */}
                        <div className="mb-3">
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-color)', marginBottom: '6px' }}>
                            Frecuencia de sondeo:
                          </label>
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
                            style={{ width: '180px' }}
                            disabled={importing}
                          />
                        </div>
                      </div>

                      {/* Columna derecha: archivo vinculado y controles */}
                      <div>
                        <div className="mb-3">
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-color)', marginBottom: '6px' }}>
                            Archivo XML
                          </label>
                          <div className="flex align-items-center mb-2" style={{ gap: 10 }}>
                            <div className="flex align-items-center" style={{ gap: 6 }}>
                              <input
                                type="radio"
                                id="linkedSourceLocal"
                                name="linkedSource"
                                checked={!linkedFromUrl}
                                onChange={() => setLinkedFromUrl(false)}
                              />
                              <label htmlFor="linkedSourceLocal" style={{ fontSize: 12, color: 'var(--text-color)' }}>Archivo local</label>
                            </div>
                            <div className="flex align-items-center" style={{ gap: 6 }}>
                              <input
                                type="radio"
                                id="linkedSourceUrl"
                                name="linkedSource"
                                checked={linkedFromUrl}
                                onChange={() => setLinkedFromUrl(true)}
                              />
                              <label htmlFor="linkedSourceUrl" style={{ fontSize: 12, color: 'var(--text-color)' }}>URL (navegador)</label>
                            </div>
                          </div>

                          {!linkedFromUrl && !linkedPath ? (
                            <div
                              className={`${isDragOverLinked ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'} border-2 border-dashed rounded-lg text-center transition-all duration-200 cursor-pointer`}
                              style={{ padding: '20px' }}
                              onDrop={handleDropLinked}
                              onDragOver={handleDragOverLinked}
                              onDragEnter={handleDragEnterLinked}
                              onDragLeave={handleDragLeaveLinked}
                              onClick={() => linkFileInputRef.current && linkFileInputRef.current.click()}
                            >
                              <i className="pi pi-cloud-upload text-2xl mb-2" style={{ color: 'var(--text-color-secondary)' }}></i>
                              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-color)', marginBottom: '4px' }}>
                                Arrastra tu archivo XML aquí
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                                o haz clic para seleccionar
                              </div>
                            </div>
                          ) : linkedFromUrl && !linkedPath ? (
                            <div className="flex align-items-center" style={{ gap: 8 }}>
                              <InputText
                                value={linkedUrl}
                                onChange={(e) => setLinkedUrl(e.target.value)}
                                placeholder="https://.../archivo.xml"
                                style={{ flex: 1, fontSize: '13px' }}
                              />
                              <Button
                                label="Abrir"
                                icon="pi pi-external-link"
                                onClick={async () => {
                                  if (!linkedUrl) return;
                                  setLinkedDownloadSince(Date.now());
                                  try { localStorage.setItem('IMPORT_DIALOG_LAST_URL', linkedUrl); } catch {}
                                  await window.electron?.import?.openExternal?.(linkedUrl);
                                }}
                              />
                              <Button
                                label="Pegar URL"
                                icon="pi pi-clipboard"
                                className="p-button-outlined"
                                onClick={async () => {
                                  try {
                                    const t = await window.electron?.clipboard?.readText?.();
                                    if (t) setLinkedUrl(t.trim());
                                  } catch {}
                                }}
                              />
                            </div>
                          ) : (
                            <div style={{ 
                              background: 'var(--blue-50)', 
                              border: '1px solid var(--blue-200)', 
                              borderRadius: '8px', 
                              padding: '16px'
                            }}>
                              <div className="flex align-items-center justify-content-between">
                                <div className="flex align-items-center" style={{ gap: 12 }}>
                                  <div style={{ 
                                    background: 'var(--blue-500)', 
                                    borderRadius: '50%', 
                                    width: '40px', 
                                    height: '40px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center' 
                                  }}>
                                    <i className="pi pi-file" style={{ color: 'white', fontSize: '16px' }}></i>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-color)', marginBottom: '2px' }}>
                                      {linkedPath.split('\\').pop()}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                                      Archivo XML vinculado
                                    </div>
                                  </div>
                                </div>
                                <div className="flex align-items-center" style={{ gap: 8 }}>
                                  <Button
                                    icon="pi pi-refresh"
                                    className="p-button-outlined p-button-sm"
                                    onClick={() => linkFileInputRef.current && linkFileInputRef.current.click()}
                                    disabled={importing}
                                    tooltip="Cambiar archivo"
                                    tooltipOptions={{ position: 'top' }}
                                  />
                                  <Button
                                    icon="pi pi-times"
                                    className="p-button-outlined p-button-danger p-button-sm"
                                    onClick={handleFileRemoveLinked}
                                    disabled={importing}
                                    tooltip="Remover archivo"
                                    tooltipOptions={{ position: 'top' }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          <input
                            type="file"
                            accept=".xml"
                            ref={linkFileInputRef}
                            onChange={async (e) => {
                              const f = e.target.files && e.target.files[0];
                              if (!f) return;
                              const p = f.path || f.name;
                              setLinkedPath(p);
                              try {
                                const hashRes = await window.electron?.import?.getFileHash?.(p);
                                if (hashRes?.ok) setLastKnownHash(hashRes.hash);
                              } catch {}
                              startPreviewPolling();
                              try { e.target.value = ''; } catch {}
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
                                  if (linkedFromUrl) {
                                    const res = await window.electron?.import?.findLatestXmlDownload?.({ sinceMs: Date.now() - 24*60*60*1000 });
                                    if (res?.ok && res.latest) {
                                      setLinkedPath(res.latest.path);
                                      const h = await window.electron?.import?.getFileHash?.(res.latest.path);
                                      if (h?.ok && lastKnownHash && h.hash !== lastKnownHash) {
                                        setLinkStatus({ text: 'Cambios detectados', color: '#e67e22' });
                                        setChangesDetected(true);
                                      } else {
                                        setLinkStatus({ text: 'Sin cambios', color: '#2e7d32' });
                                        setChangesDetected(false);
                                      }
                                    }
                                  } else {
                                    const h = await window.electron?.import?.getFileHash?.(linkedPath);
                                    if (h?.ok && lastKnownHash && h.hash !== lastKnownHash) {
                                      setLinkStatus({ text: 'Cambios detectados', color: '#e67e22' });
                                      setChangesDetected(true);
                                    } else {
                                      setLinkStatus({ text: 'Sin cambios', color: '#2e7d32' });
                                      setChangesDetected(false);
                                    }
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
                              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-color-secondary)' }}>
                                Origen: {linkedFromUrl ? 'URL' : 'Archivo local'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Botón principal para importación vinculada (sin línea superior) */}
                        <div style={{ marginTop: '1rem' }}>
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
                    </div>
                  </div>
                )}
              </div>
            </Card>
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
