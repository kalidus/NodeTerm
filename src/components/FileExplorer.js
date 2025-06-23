import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { ProgressBar } from 'primereact/progressbar';
import { Toolbar } from 'primereact/toolbar';
import { FileUpload } from 'primereact/fileupload';
import { Breadcrumb } from 'primereact/breadcrumb';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

const FileExplorer = ({ sshConfig, tabId }) => {
  const toast = useRef(null);
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [breadcrumbItems, setBreadcrumbItems] = useState([]);

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath, sshConfig]);

  useEffect(() => {
    updateBreadcrumb();
  }, [currentPath]);

  const updateBreadcrumb = () => {
    const pathParts = currentPath.split('/').filter(part => part !== '');
    const items = pathParts.map((part, index) => {
      const path = '/' + pathParts.slice(0, index + 1).join('/');
      return {
        label: part,
        command: () => setCurrentPath(path)
      };
    });
    
    // Añadir el root
    items.unshift({
      label: 'Root',
      icon: 'pi pi-home',
      command: () => setCurrentPath('/')
    });

    setBreadcrumbItems(items);
  };

  const loadFiles = async (path) => {
    setLoading(true);
    try {
      if (window.electron && window.electron.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('ssh:list-files', {
          tabId,
          path,
          sshConfig
        });
        
        if (result.success) {
          setFiles(result.files);
        } else {
          toast.current.show({
            severity: 'error',
            summary: 'Error',
            detail: result.error || 'Error al cargar archivos',
            life: 3000
          });
        }
      } else {
        // Datos de ejemplo para desarrollo web
        setFiles([
          { name: '..', type: 'directory', size: 0, modified: new Date(), permissions: 'drwxr-xr-x' },
          { name: 'Documents', type: 'directory', size: 0, modified: new Date(), permissions: 'drwxr-xr-x' },
          { name: 'config.txt', type: 'file', size: 1024, modified: new Date(), permissions: '-rw-r--r--' },
          { name: 'script.sh', type: 'file', size: 2048, modified: new Date(), permissions: '-rwxr-xr-x' }
        ]);
      }
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al conectar con el servidor',
        life: 3000
      });
    }
    setLoading(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  const nameTemplate = (rowData) => {
    const icon = rowData.type === 'directory' ? 'pi pi-folder' : 'pi pi-file';
    return (
      <div className="flex align-items-center gap-2">
        <i className={icon}></i>
        <span>{rowData.name}</span>
      </div>
    );
  };

  const actionsTemplate = (rowData) => {
    if (rowData.name === '..') return null;
    
    return (
      <div className="flex gap-1">
        {rowData.type === 'file' && (
          <Button
            icon="pi pi-download"
            size="small"
            outlined
            tooltip="Descargar"
            onClick={() => downloadFile(rowData)}
          />
        )}
        <Button
          icon="pi pi-trash"
          size="small"
          outlined
          severity="danger"
          tooltip="Eliminar"
          onClick={() => deleteFile(rowData)}
        />
      </div>
    );
  };

  const onRowDoubleClick = (e) => {
    const file = e.data;
    if (file.type === 'directory') {
      if (file.name === '..') {
        // Ir al directorio padre
        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
        setCurrentPath(parentPath);
      } else {
        // Entrar al directorio
        const newPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
        setCurrentPath(newPath);
      }
    }
  };

  const downloadFile = async (file) => {
    try {
      if (window.electron && window.electron.ipcRenderer) {
        const filePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
        const result = await window.electron.ipcRenderer.invoke('ssh:download-file', {
          tabId,
          remotePath: filePath,
          sshConfig
        });
        
        if (result.success) {
          toast.current.show({
            severity: 'success',
            summary: 'Descarga completada',
            detail: `Archivo descargado: ${file.name}`,
            life: 3000
          });
        } else {
          throw new Error(result.error);
        }
      } else {
        toast.current.show({
          severity: 'info',
          summary: 'Modo demo',
          detail: 'La descarga no está disponible en modo web',
          life: 3000
        });
      }
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: `Error al descargar: ${error.message}`,
        life: 3000
      });
    }
  };

  const deleteFile = (file) => {
    confirmDialog({
      message: `¿Estás seguro de que deseas eliminar "${file.name}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          if (window.electron && window.electron.ipcRenderer) {
            const filePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
            const result = await window.electron.ipcRenderer.invoke('ssh:delete-file', {
              tabId,
              path: filePath,
              sshConfig
            });
            
            if (result.success) {
              toast.current.show({
                severity: 'success',
                summary: 'Eliminado',
                detail: `${file.name} eliminado correctamente`,
                life: 3000
              });
              loadFiles(currentPath); // Recargar la lista
            } else {
              throw new Error(result.error);
            }
          } else {
            toast.current.show({
              severity: 'info',
              summary: 'Modo demo',
              detail: 'La eliminación no está disponible en modo web',
              life: 3000
            });
          }
        } catch (error) {
          toast.current.show({
            severity: 'error',
            summary: 'Error',
            detail: `Error al eliminar: ${error.message}`,
            life: 3000
          });
        }
      }
    });
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'El nombre de la carpeta no puede estar vacío',
        life: 3000
      });
      return;
    }

    try {
      if (window.electron && window.electron.ipcRenderer) {
        const folderPath = currentPath === '/' ? `/${newFolderName}` : `${currentPath}/${newFolderName}`;
        const result = await window.electron.ipcRenderer.invoke('ssh:create-folder', {
          tabId,
          path: folderPath,
          sshConfig
        });
        
        if (result.success) {
          toast.current.show({
            severity: 'success',
            summary: 'Carpeta creada',
            detail: `Carpeta "${newFolderName}" creada correctamente`,
            life: 3000
          });
          setNewFolderName('');
          setShowCreateFolderDialog(false);
          loadFiles(currentPath); // Recargar la lista
        } else {
          throw new Error(result.error);
        }
      } else {
        toast.current.show({
          severity: 'info',
          summary: 'Modo demo',
          detail: 'La creación de carpetas no está disponible en modo web',
          life: 3000
        });
        setShowCreateFolderDialog(false);
      }
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: `Error al crear carpeta: ${error.message}`,
        life: 3000
      });
    }
  };

  const onUpload = async (event) => {
    const files = event.files;
    setUploadProgress(0);
    setShowUploadDialog(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (window.electron && window.electron.ipcRenderer) {
          const remotePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
          const result = await window.electron.ipcRenderer.invoke('ssh:upload-file', {
            tabId,
            localFile: file,
            remotePath,
            sshConfig
          });
          
          if (!result.success) {
            throw new Error(result.error);
          }
        }
        
        const progress = ((i + 1) / files.length) * 100;
        setUploadProgress(progress);
      } catch (error) {
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: `Error al subir ${file.name}: ${error.message}`,
          life: 3000
        });
      }
    }

    setShowUploadDialog(false);
    toast.current.show({
      severity: 'success',
      summary: 'Subida completada',
      detail: `${files.length} archivo(s) subido(s) correctamente`,
      life: 3000
    });
    loadFiles(currentPath); // Recargar la lista
  };

  const toolbarStart = (
    <div className="flex gap-2">
      <Button
        icon="pi pi-refresh"
        tooltip="Actualizar"
        onClick={() => loadFiles(currentPath)}
      />
      <Button
        icon="pi pi-folder-plus"
        tooltip="Nueva carpeta"
        onClick={() => setShowCreateFolderDialog(true)}
      />
    </div>
  );

  const toolbarEnd = (
    <FileUpload
      mode="basic"
      multiple
      accept="*/*"
      maxFileSize={1000000000} // 1GB
      customUpload
      uploadHandler={onUpload}
      chooseLabel="Subir archivos"
      className="p-button-outlined"
    />
  );

  return (
    <div className="file-explorer" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toast ref={toast} />
      <ConfirmDialog />
      
      <Toolbar start={toolbarStart} end={toolbarEnd} className="mb-2" />
      
      <Breadcrumb model={breadcrumbItems} className="mb-2" />
      
      <div style={{ flex: 1, overflow: 'auto' }}>
        <DataTable
          value={files}
          loading={loading}
          onRowDoubleClick={onRowDoubleClick}
          selectionMode="multiple"
          selection={selectedFiles}
          onSelectionChange={(e) => setSelectedFiles(e.value)}
          scrollable
          scrollHeight="flex"
          size="small"
        >
          <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
          <Column field="name" header="Nombre" body={nameTemplate} sortable />
          <Column field="size" header="Tamaño" body={(rowData) => formatFileSize(rowData.size)} sortable />
          <Column field="modified" header="Modificado" body={(rowData) => formatDate(rowData.modified)} sortable />
          <Column field="permissions" header="Permisos" sortable />
          <Column header="Acciones" body={actionsTemplate} headerStyle={{ width: '8rem' }} />
        </DataTable>
      </div>

      <Dialog
        header="Nueva Carpeta"
        visible={showCreateFolderDialog}
        style={{ width: '30rem' }}
        onHide={() => setShowCreateFolderDialog(false)}
        footer={
          <div>
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setShowCreateFolderDialog(false)} className="p-button-text" />
            <Button label="Crear" icon="pi pi-check" onClick={createFolder} autoFocus />
          </div>
        }
      >
        <div className="p-fluid">
          <div className="p-field">
            <label htmlFor="folderName">Nombre de la carpeta</label>
            <InputText
              id="folderName"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') createFolder();
              }}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header="Subiendo archivos..."
        visible={showUploadDialog}
        style={{ width: '30rem' }}
        closable={false}
      >
        <div className="p-fluid">
          <ProgressBar value={uploadProgress} />
          <p className="mt-2">Progreso: {uploadProgress.toFixed(0)}%</p>
        </div>
      </Dialog>
    </div>
  );
};

export default FileExplorer; 