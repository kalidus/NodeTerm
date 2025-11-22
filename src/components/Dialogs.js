import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';
import { Fieldset } from 'primereact/fieldset';
import { RadioButton } from 'primereact/radiobutton';
import { ColorSelector } from './ColorSelector';
import { InputTextarea } from 'primereact/inputtextarea';
import { FileUpload } from 'primereact/fileupload';
import { Message } from 'primereact/message';

// --- SSHDialog: para crear o editar conexiones SSH ---
export function SSHDialog({
  visible,
  onHide,
  mode = 'new', // 'new' o 'edit'
  name, setName,
  host, setHost,
  user, setUser,
  password, setPassword,
  port, setPort,
  remoteFolder, setRemoteFolder,
  targetFolder, setTargetFolder,
  foldersOptions = [],
  onConfirm,
  loading = false
}) {
  const isEdit = mode === 'edit';
  const [showPassword, setShowPassword] = useState(false);
  return (
    <Dialog header={isEdit ? 'Editar conexión SSH' : 'Nueva conexión SSH'} visible={visible} style={{ width: '370px', borderRadius: 16 }} modal onHide={onHide}>
      <div className="p-fluid" style={{ padding: 8 }}>
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="sshName">Nombre</label>
          <InputText id="sshName" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="sshHost">Host</label>
          <InputText id="sshHost" value={host} onChange={e => setHost(e.target.value)} />
        </div>
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="sshUser">Usuario</label>
          <InputText id="sshUser" value={user} onChange={e => setUser(e.target.value)} />
        </div>
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="sshPassword">Contraseña</label>
          <div className="p-inputgroup">
            <InputText 
              id="sshPassword" 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
            <Button 
              type="button" 
              icon={showPassword ? "pi pi-eye-slash" : "pi pi-eye"} 
              className="p-button-outlined"
              onClick={() => setShowPassword(!showPassword)}
              tooltip={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              tooltipOptions={{ position: 'top' }}
            />
          </div>
        </div>
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="sshPort">Puerto</label>
          <InputText id="sshPort" value={port} onChange={e => setPort(e.target.value)} />
        </div>
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="sshTargetFolder">Carpeta destino (opcional)</label>
          <Dropdown id="sshTargetFolder" value={targetFolder} options={foldersOptions} onChange={e => setTargetFolder(e.value)} placeholder="Selecciona una carpeta" showClear filter/>
        </div>
        <div className="p-field" style={{ marginBottom: 18 }}>
          <label htmlFor="sshRemoteFolder">Carpeta remota (opcional)</label>
          <InputText id="sshRemoteFolder" value={remoteFolder} onChange={e => setRemoteFolder(e.target.value)} />
        </div>
        <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'flex-end' }}>
          <Button label="Cancelar" icon="pi pi-times" className="p-button-text" onClick={onHide} style={{ minWidth: 120 }} />
          <Button label={isEdit ? 'Guardar' : 'Crear'} icon="pi pi-check" className="p-button-primary" onClick={onConfirm} style={{ minWidth: 120 }} loading={loading} />
        </div>
      </div>
    </Dialog>
  );
}

// --- FolderDialog: para crear o editar carpetas ---
export function FolderDialog({
  visible,
  onHide,
  mode = 'new',
  folderName, setFolderName,
  folderColor, setFolderColor,
  onConfirm,
  loading = false,
  iconTheme = 'material' // Agregar prop para el tema de iconos
}) {
  const isEdit = mode === 'edit';
  
  return (
    <Dialog 
      header={
        <div className="folder-dialog-header">
          <div className="header-icon">
            <i className={`pi ${isEdit ? 'pi-pencil' : 'pi-folder-plus'}`}></i>
          </div>
          <div className="header-content">
            <h3 className="header-title">{isEdit ? 'Editar carpeta' : 'Nueva carpeta'}</h3>
            <p className="header-subtitle">
              {isEdit ? 'Modifica los detalles de tu carpeta' : 'Crea una nueva carpeta organizada'}
            </p>
          </div>
        </div>
      } 
      visible={visible} 
      style={{ width: '420px', borderRadius: '16px' }} 
      modal 
      onHide={onHide}
      className="folder-dialog"
    >
      <div className="folder-dialog-content">
        <div className="form-section">
          <div className="form-field">
            <label htmlFor="folderName" className="field-label">
              <i className="pi pi-tag"></i>
              Nombre de la carpeta
            </label>
            <InputText 
              id="folderName" 
              value={folderName} 
              onChange={e => setFolderName(e.target.value)} 
              placeholder="Ingresa el nombre de la carpeta"
              className="folder-name-input"
              autoFocus 
            />
          </div>
          
          <div className="form-field">
            <ColorSelector
              selectedColor={folderColor}
              onColorChange={setFolderColor}
              label="Color de la carpeta"
              iconTheme={iconTheme}
            />
          </div>
        </div>
        
        <div className="folder-preview">
          <div className="preview-label">Vista previa:</div>
          <div className="preview-folder" style={{ borderLeftColor: folderColor || '#007ad9' }}>
            <i className="pi pi-folder" style={{ color: folderColor || '#007ad9' }}></i>
            <span className="preview-name">{folderName || 'Nombre de la carpeta'}</span>
          </div>
        </div>
      </div>
      
      <div className="folder-dialog-footer">
        <Button 
          label="Cancelar" 
          icon="pi pi-times" 
          className="p-button-text cancel-button" 
          onClick={onHide}
        />
        <Button 
          label={isEdit ? 'Guardar cambios' : 'Crear carpeta'} 
          icon={isEdit ? 'pi pi-save' : 'pi pi-plus'} 
          className="p-button-primary create-button" 
          onClick={onConfirm} 
          loading={loading}
          disabled={!folderName?.trim()}
        />
      </div>
    </Dialog>
  );
}

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
  return (
    <Dialog header="Nuevo grupo de pestañas" visible={visible} style={{ width: '370px', borderRadius: 16 }} modal onHide={onHide}>
      <div className="p-fluid" style={{ padding: 8 }}>
        <div className="p-field" style={{ marginBottom: 18 }}>
          <label htmlFor="groupName">Nombre del grupo</label>
          <InputText id="groupName" value={groupName} onChange={e => setGroupName(e.target.value)} autoFocus />
        </div>
        <div className="p-field" style={{ marginBottom: 18 }}>
          <label>Color del grupo</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8, justifyContent: 'center', alignItems: 'center' }}>
            {colorOptions.map(color => (
              <div
                key={color}
                onClick={() => setGroupColor(color)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: color,
                  border: groupColor === color ? '3px solid #1976d2' : '2px solid #23272f',
                  boxShadow: groupColor === color ? '0 0 0 4px #1976d2aa' : '0 1px 4px rgba(0,0,0,0.10)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border 0.2s',
                  outline: groupColor === color ? '2px solid #1976d2' : 'none',
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
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 900,
                    pointerEvents: 'none',
                    textShadow: '0 1px 4px #1976d2, 0 0 2px #23272f'
                  }}>✓</span>
                )}
              </div>
            ))}
            {/* Selector personalizado */}
            <div
              onClick={() => document.getElementById('custom-group-color-input').click()}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: groupColor && !colorOptions.includes(groupColor) ? groupColor : '#23272f',
                border: !colorOptions.includes(groupColor) ? '3px solid #1976d2' : '2px dashed #888',
                boxShadow: !colorOptions.includes(groupColor) ? '0 0 0 4px #1976d2aa' : '0 1px 4px rgba(0,0,0,0.10)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'box-shadow 0.2s, border 0.2s',
                margin: 0
              }}
              title="Color personalizado"
            >
              <span style={{ fontSize: 16, color: !colorOptions.includes(groupColor) ? '#fff' : '#1976d2', pointerEvents: 'none', userSelect: 'none' }}>🎨</span>
              <input
                id="custom-group-color-input"
                type="color"
                value={groupColor}
                onChange={e => setGroupColor(e.target.value)}
                style={{ display: 'none' }}
              />
              {!colorOptions.includes(groupColor) && groupColor && (
                <span style={{
                  position: 'absolute',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 900,
                  pointerEvents: 'none',
                  textShadow: '0 1px 4px #1976d2, 0 0 2px #23272f',
                  left: 0, right: 0, top: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>✓</span>
              )}
            </div>
          </div>
        </div>
        <div className="p-field" style={{ marginTop: 18 }}>
          <Button
            label="Crear grupo"
            icon="pi pi-plus"
            onClick={onConfirm}
            disabled={!groupName.trim()}
            className="p-button-success"
            style={{ width: '100%' }}
            loading={loading}
          />
        </div>
      </div>
    </Dialog>
  );
}

// --- UnifiedConnectionDialog: diálogo unificado para SSH y RDP ---
// Diálogo independiente para conexiones de archivos (SFTP/FTP/SCP)
export function FileConnectionDialog({
  visible,
  onHide,
  // Props para edición
  isEditMode = false,
  editNodeData = null,
  // Props para creación
  fileConnectionName = '',
  setFileConnectionName = () => {},
  fileConnectionHost = '',
  setFileConnectionHost = () => {},
  fileConnectionUser = '',
  setFileConnectionUser = () => {},
  fileConnectionPassword = '',
  setFileConnectionPassword = () => {},
  fileConnectionPort = 22,
  setFileConnectionPort = () => {},
  fileConnectionProtocol = 'sftp',
  setFileConnectionProtocol = () => {},
  fileConnectionRemoteFolder = '',
  setFileConnectionRemoteFolder = () => {},
  fileConnectionTargetFolder = '',
  setFileConnectionTargetFolder = () => {},
  onFileConnectionConfirm = null,
  fileConnectionLoading = false
}) {
  // Estados locales para el formulario
  const [localName, setLocalName] = useState('');
  const [localHost, setLocalHost] = useState('');
  const [localUser, setLocalUser] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [localPort, setLocalPort] = useState(22);
  const [localProtocol, setLocalProtocol] = useState('sftp');
  const [localRemoteFolder, setLocalRemoteFolder] = useState('');
  const [localTargetFolder, setLocalTargetFolder] = useState('');

  // Precargar datos en modo edición
  useEffect(() => {
    if (isEditMode && editNodeData && visible) {
      const data = editNodeData.data || {};
      setLocalName(editNodeData.label || '');
      setLocalHost(data.host || '');
      setLocalUser(data.user || data.username || '');
      setLocalPassword(data.password || '');
      setLocalPort(data.port || (data.protocol === 'ftp' ? 21 : 22));
      setLocalProtocol(data.protocol || data.type || 'sftp');
      setLocalRemoteFolder(data.remoteFolder || '');
      setLocalTargetFolder(data.targetFolder || '');
    } else if (!isEditMode && visible) {
      // Modo creación: usar valores por defecto o de props
      setLocalName(fileConnectionName || '');
      setLocalHost(fileConnectionHost || '');
      setLocalUser(fileConnectionUser || '');
      setLocalPassword(fileConnectionPassword || '');
      setLocalPort(fileConnectionPort || 22);
      setLocalProtocol(fileConnectionProtocol || 'sftp');
      setLocalRemoteFolder(fileConnectionRemoteFolder || '');
      setLocalTargetFolder(fileConnectionTargetFolder || '');
    }
  }, [isEditMode, editNodeData, visible, fileConnectionName, fileConnectionHost, fileConnectionUser, fileConnectionPassword, fileConnectionPort, fileConnectionProtocol, fileConnectionRemoteFolder, fileConnectionTargetFolder]);

  // Resetear al cerrar
  useEffect(() => {
    if (!visible) {
      setLocalName('');
      setLocalHost('');
      setLocalUser('');
      setLocalPassword('');
      setLocalPort(22);
      setLocalProtocol('sftp');
      setLocalRemoteFolder('');
      setLocalTargetFolder('');
    }
  }, [visible]);

  const handleProtocolChange = (value) => {
    setLocalProtocol(value);
    if (setFileConnectionProtocol) setFileConnectionProtocol(value);
    // Cambiar puerto por defecto según protocolo
    const defaultPorts = { sftp: 22, ftp: 21, scp: 22 };
    const newPort = defaultPorts[value] || 22;
    setLocalPort(newPort);
    if (setFileConnectionPort) setFileConnectionPort(newPort);
  };

  const handleConfirm = () => {
    if (!localName.trim() || !localHost.trim() || !localUser.trim()) {
      console.error('❌ Faltan campos requeridos');
      return;
    }

    const fileData = {
      name: localName,
      host: localHost,
      username: localUser,
      password: localPassword,
      port: localPort,
      protocol: localProtocol,
      remoteFolder: localRemoteFolder,
      targetFolder: localTargetFolder
    };

    if (onFileConnectionConfirm && typeof onFileConnectionConfirm === 'function') {
      try {
        onFileConnectionConfirm(fileData);
      } catch (error) {
        console.error('❌ Error al guardar conexión de archivos:', error);
      }
    } else {
      console.error('❌ onFileConnectionConfirm no es una función válida');
    }
  };

  return (
    <Dialog
      header={isEditMode ? "Editar Conexión de Archivos" : "Nueva Conexión de Archivos"}
      visible={visible}
      style={{ width: '500px', borderRadius: '16px' }}
      modal
      onHide={onHide}
      className="file-connection-dialog"
    >
      <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
          <Card title="🔗 Conexión de Archivos" className="mb-2">
            <div className="formgrid grid">
              <div className="field col-12">
                <label htmlFor="file-name">Nombre de la conexión *</label>
                <InputText
                  id="file-name"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="Mi servidor SFTP"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12 md:col-6">
                <label htmlFor="file-protocol">Protocolo *</label>
                <Dropdown
                  id="file-protocol"
                  value={localProtocol}
                  options={[
                    { label: 'SFTP', value: 'sftp' },
                    { label: 'FTP', value: 'ftp' },
                    { label: 'SCP', value: 'scp' }
                  ]}
                  onChange={(e) => handleProtocolChange(e.value)}
                  placeholder="Seleccionar protocolo"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12 md:col-6">
                <label htmlFor="file-host">Host *</label>
                <InputText
                  id="file-host"
                  value={localHost}
                  onChange={(e) => setLocalHost(e.target.value)}
                  placeholder="192.168.1.100"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12 md:col-6">
                <label htmlFor="file-user">Usuario *</label>
                <InputText
                  id="file-user"
                  value={localUser}
                  onChange={(e) => setLocalUser(e.target.value)}
                  placeholder="usuario"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12 md:col-6">
                <label htmlFor="file-port">Puerto</label>
                <InputText
                  id="file-port"
                  type="number"
                  value={localPort}
                  onChange={(e) => setLocalPort(parseInt(e.target.value) || (localProtocol === 'ftp' ? 21 : 22))}
                  placeholder={localProtocol === 'ftp' ? '21' : '22'}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12">
                <label htmlFor="file-password">Contraseña</label>
                <InputText
                  id="file-password"
                  type="password"
                  value={localPassword}
                  onChange={(e) => setLocalPassword(e.target.value)}
                  placeholder="Contraseña"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12">
                <label htmlFor="file-remote-folder">Carpeta remota (opcional)</label>
                <InputText
                  id="file-remote-folder"
                  value={localRemoteFolder}
                  onChange={(e) => setLocalRemoteFolder(e.target.value)}
                  placeholder="/home/usuario"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="field col-12">
                <label htmlFor="file-target-folder">Carpeta local destino (opcional)</label>
                <InputText
                  id="file-target-folder"
                  value={localTargetFolder}
                  onChange={(e) => setLocalTargetFolder(e.target.value)}
                  placeholder="C:\\Downloads"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-content-end gap-2 mt-3" style={{ borderTop: '1px solid #e9ecef', paddingTop: '12px' }}>
          <Button
            label="Cancelar"
            icon="pi pi-times"
            className="p-button-text"
            onClick={onHide}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          />
          <Button
            label={isEditMode ? "Guardar Cambios" : "Crear Conexión"}
            icon="pi pi-check"
            className="p-button-primary"
            onClick={handleConfirm}
            loading={fileConnectionLoading}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          />
        </div>
      </div>
    </Dialog>
  );
}

export function UnifiedConnectionDialog({
  visible,
  onHide,
  // Props SSH
  sshName, setSSHName,
  sshHost, setSSHHost,
  sshUser, setSSHUser,
  sshPassword, setSSHPassword,
  sshPort, setSSHPort,
  sshRemoteFolder, setSSHRemoteFolder,
  sshTargetFolder, setSSHTargetFolder,
  sshAutoCopyPassword = false, setSSHAutoCopyPassword = () => {},
  foldersOptions = [],
  onSSHConfirm,
  sshLoading = false,
  // Props RDP
  rdpNodeData,
  onSaveToSidebar,
  editingNode = null,
  // Props para modo edición
  isEditMode = false,
  editConnectionType = null, // 'ssh', 'rdp', 'sftp', 'ftp', 'scp'
  editNodeData = null,
  // Prop para controlar si mostrar la pestaña de password
  allowPasswordTab = false,
  // Props Archivos (SFTP/FTP/SCP)
  fileConnectionName = '', setFileConnectionName = () => {},
  fileConnectionHost = '', setFileConnectionHost = () => {},
  fileConnectionUser = '', setFileConnectionUser = () => {},
  fileConnectionPassword = '', setFileConnectionPassword = () => {},
  fileConnectionPort = 22, setFileConnectionPort = () => {},
  fileConnectionProtocol = 'sftp', setFileConnectionProtocol = () => {},
  fileConnectionRemoteFolder = '', setFileConnectionRemoteFolder = () => {},
  fileConnectionTargetFolder = '', setFileConnectionTargetFolder = () => {},
  onFileConnectionConfirm = null,
  fileConnectionLoading = false
}) {
  // Usar useRef para mantener una referencia estable al handler
  // Inicializar con el valor del prop si está disponible
  const stableHandlerRef = useRef(onFileConnectionConfirm);
  
    // Actualizar la referencia cuando el prop es válido - NUNCA limpiar
  useEffect(() => {
    // Solo actualizar si el prop es una función válida
    if (onFileConnectionConfirm && typeof onFileConnectionConfirm === 'function') {
      stableHandlerRef.current = onFileConnectionConfirm;
    }
    // NO hacer nada si el prop es null/undefined - mantener el último valor válido
  }, [onFileConnectionConfirm]);
  // Estados locales para los campos de archivos - siempre funcionan
  // Para modo edición, inicializar con valores por defecto que se sobrescribirán en useEffect
  const [localFileConnectionName, setLocalFileConnectionName] = useState('');
  const [localFileConnectionHost, setLocalFileConnectionHost] = useState('');
  const [localFileConnectionUser, setLocalFileConnectionUser] = useState('');
  const [localFileConnectionPassword, setLocalFileConnectionPassword] = useState('');
  const [localFileConnectionPort, setLocalFileConnectionPort] = useState(22);
  const [localFileConnectionProtocol, setLocalFileConnectionProtocol] = useState('sftp');
  const [localFileConnectionRemoteFolder, setLocalFileConnectionRemoteFolder] = useState('');
  const [localFileConnectionTargetFolder, setLocalFileConnectionTargetFolder] = useState('');
  
  // Sincronizar estados locales con props para modo creación
  useEffect(() => {
    // Siempre sincronizar con props, pero el modo edición tiene prioridad con editNodeData
    if (fileConnectionName !== undefined) {
      setLocalFileConnectionName(fileConnectionName);
    }
    if (fileConnectionHost !== undefined) {
      setLocalFileConnectionHost(fileConnectionHost);
    }
    if (fileConnectionUser !== undefined) {
      setLocalFileConnectionUser(fileConnectionUser);
    }
    if (fileConnectionPassword !== undefined) {
      setLocalFileConnectionPassword(fileConnectionPassword);
    }
    if (fileConnectionPort !== undefined) {
      setLocalFileConnectionPort(fileConnectionPort);
    }
    if (fileConnectionProtocol !== undefined) {
      setLocalFileConnectionProtocol(fileConnectionProtocol);
    }
    if (fileConnectionRemoteFolder !== undefined) {
      setLocalFileConnectionRemoteFolder(fileConnectionRemoteFolder);
    }
    if (fileConnectionTargetFolder !== undefined) {
      setLocalFileConnectionTargetFolder(fileConnectionTargetFolder);
    }
  }, [fileConnectionName, fileConnectionHost, fileConnectionUser, fileConnectionPassword, fileConnectionPort, fileConnectionProtocol, fileConnectionRemoteFolder, fileConnectionTargetFolder]);

  // Resetear estados locales cuando se cierra el diálogo
  useEffect(() => {
    if (!visible) {
      console.log('🔄 [Dialogs] Reseteando estados locales al cerrar diálogo');
      setLocalFileConnectionName('');
      setLocalFileConnectionHost('');
      setLocalFileConnectionUser('');
      setLocalFileConnectionPassword('');
      setLocalFileConnectionPort(22);
      setLocalFileConnectionProtocol('sftp');
      setLocalFileConnectionRemoteFolder('');
      setLocalFileConnectionTargetFolder('');
    }
  }, [visible]);

  // Sincronizar cambios locales con los setters externos
  const handleFileConnectionNameChange = (value) => {
    setLocalFileConnectionName(value);
    if (setFileConnectionName) setFileConnectionName(value);
  };
  const handleFileConnectionHostChange = (value) => {
    setLocalFileConnectionHost(value);
    if (setFileConnectionHost) setFileConnectionHost(value);
  };
  const handleFileConnectionUserChange = (value) => {
    setLocalFileConnectionUser(value);
    if (setFileConnectionUser) setFileConnectionUser(value);
  };
  const handleFileConnectionPasswordChange = (value) => {
    setLocalFileConnectionPassword(value);
    if (setFileConnectionPassword) setFileConnectionPassword(value);
  };
  const handleFileConnectionPortChange = (value) => {
    setLocalFileConnectionPort(value);
    if (setFileConnectionPort) setFileConnectionPort(value);
  };
  const handleFileConnectionProtocolChange = (value) => {
    setLocalFileConnectionProtocol(value);
    if (setFileConnectionProtocol) setFileConnectionProtocol(value);
    // Actualizar puerto por defecto según protocolo
    const defaultPorts = { sftp: 22, ftp: 21, scp: 22 };
    const newPort = defaultPorts[value] || 22;
    setLocalFileConnectionPort(newPort);
    if (setFileConnectionPort) setFileConnectionPort(newPort);
  };
  const handleFileConnectionRemoteFolderChange = (value) => {
    setLocalFileConnectionRemoteFolder(value);
    if (setFileConnectionRemoteFolder) setFileConnectionRemoteFolder(value);
  };
  const handleFileConnectionTargetFolderChange = (value) => {
    setLocalFileConnectionTargetFolder(value);
    if (setFileConnectionTargetFolder) setFileConnectionTargetFolder(value);
  };
  
  const [activeTabIndex, setActiveTabIndex] = useState(0); // 0 = SSH, 1 = RDP, 2 = Archivos, 3 = Password
  const [isExpanded, setIsExpanded] = useState(false); // Estado para controlar si está expandido
  const [showRdpPassword, setShowRdpPassword] = useState(false); // Estado para mostrar/ocultar contraseña RDP

  // Ref para almacenar el tabIndex pendiente cuando el diálogo se abre desde el selector de protocolo
  const pendingTabIndexRef = useRef(null);

  // Listener para establecer la pestaña desde el diálogo de selección de protocolo
  useEffect(() => {
    const handleSetTab = (event) => {
      if (event.detail?.tabIndex !== undefined) {
        pendingTabIndexRef.current = event.detail.tabIndex;
        // Si el diálogo está visible, establecer la pestaña inmediatamente
        if (visible) {
          setActiveTabIndex(event.detail.tabIndex);
          pendingTabIndexRef.current = null;
        }
      }
    };

    window.addEventListener('set-unified-dialog-tab', handleSetTab);
    return () => {
      window.removeEventListener('set-unified-dialog-tab', handleSetTab);
    };
  }, [visible]);

  // Cuando el diálogo se hace visible, aplicar el tabIndex pendiente si existe
  useEffect(() => {
    if (visible && pendingTabIndexRef.current !== null) {
      setActiveTabIndex(pendingTabIndexRef.current);
      pendingTabIndexRef.current = null;
    } else if (!visible) {
      // Resetear cuando se cierra
      pendingTabIndexRef.current = null;
    }
  }, [visible]);

  
  // Estados para RDP
  const [formData, setFormData] = useState({
    name: '',
    server: '',
    username: '',
    password: '',
    port: 3389,
    clientType: 'guacamole',
    preset: 'default',
    resolution: '1600x1000',
    colorDepth: 32,
    redirectFolders: true,
    redirectClipboard: true,
    redirectPrinters: false,
    redirectAudio: false, // Desactivar audio por defecto
    fullscreen: false,
    smartSizing: true,
    span: false,
    admin: false,
    public: false,
    // Campos específicos para Guacamole
    autoResize: true,
    guacDpi: 96,
    guacSecurity: 'any',
    guacEnableWallpaper: true, // Activar mostrar fondo por defecto
    guacEnableDrive: false,
    guacDriveHostDir: '',
    guacEnableGfx: false,
    // Opciones avanzadas
    guacEnableDesktopComposition: false,
    guacEnableFontSmoothing: false,
    guacEnableTheming: false,
    guacEnableFullWindowDrag: false,
    guacEnableMenuAnimations: false,
    // Flags de prueba
    guacDisableGlyphCaching: false,
    guacDisableOffscreenCaching: false,
    guacDisableBitmapCaching: false,
    guacDisableCopyRect: false
  });

  // Handlers para RDP
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleCheckboxChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.checked }));
  };

  // Función para abrir el selector de carpeta
  const handleSelectFolder = async () => {
    try {
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Seleccionar carpeta para NodeTerm Drive'
      });
      
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        setFormData(prev => ({ ...prev, guacDriveHostDir: result.filePaths[0] }));
      }
    } catch (error) {
      console.error('Error al abrir selector de carpeta:', error);
    }
  };

  // Función para alternar expansión
  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  // Calcular estilo dinámico basado en expansión
  const dialogStyle = isExpanded 
    ? { width: '98vw', height: '98vh', minWidth: '1000px', minHeight: '800px' }
    : { width: '1100px', height: '80vh', minWidth: '1000px', minHeight: '700px' };

  // Permitir cambiar pestaña desde evento global (para abrir directamente Password)
  useEffect(() => {
    const switchHandler = (e) => {
      const idx = e.detail?.index ?? 2;
      if (typeof idx === 'number') {
        // Solo permitir cambiar a la pestaña de password si allowPasswordTab es true
        if (idx === 2 && !allowPasswordTab) {
          console.log('⚠️ Intentando acceder a pestaña de password sin permisos - ignorando');
          return;
        }
        setActiveTabIndex(idx);
      }
    };
    window.addEventListener('switch-unified-tab', switchHandler);
    return () => window.removeEventListener('switch-unified-tab', switchHandler);
  }, [allowPasswordTab]);

  // Precargar datos cuando esté en modo edición
  useEffect(() => {
    if (isEditMode && editNodeData && visible) {
      if (editConnectionType === 'ssh') {
        // Precargar datos SSH
        if (setSSHName) setSSHName(editNodeData.label || '');
        if (setSSHHost) setSSHHost(editNodeData.data?.bastionHost || editNodeData.data?.host || '');
        if (setSSHUser) setSSHUser(editNodeData.data?.useBastionWallix ? editNodeData.data?.bastionUser || '' : editNodeData.data?.user || '');
        if (setSSHPassword) setSSHPassword(editNodeData.data?.password || '');
        if (setSSHRemoteFolder) setSSHRemoteFolder(editNodeData.data?.remoteFolder || '');
        if (setSSHPort) setSSHPort(editNodeData.data?.port || 22);
        if (setSSHAutoCopyPassword && typeof setSSHAutoCopyPassword === 'function') {
          setSSHAutoCopyPassword(editNodeData.data?.autoCopyPassword || false);
        }
        setActiveTabIndex(0); // Tab SSH
      } else if (editConnectionType === 'rdp') {
        // Precargar datos RDP
        const data = editNodeData.data || {};
        setFormData({
          name: editNodeData.label || '',
          server: data.server || data.hostname || '',
          username: data.username || '',
          password: data.password || '',
          port: data.port || 3389,
          clientType: data.clientType || 'guacamole',
          preset: data.preset || 'default',
          resolution: data.resolution || '1600x1000',
          colorDepth: data.colorDepth || 32,
          redirectFolders: data.redirectFolders !== undefined ? data.redirectFolders : true,
          redirectClipboard: data.redirectClipboard !== undefined ? data.redirectClipboard : true,
          redirectPrinters: data.redirectPrinters || false,
          redirectAudio: data.redirectAudio !== undefined ? data.redirectAudio : true,
          fullscreen: data.fullscreen || false,
          smartSizing: data.smartSizing !== undefined ? data.smartSizing : true,
          span: data.span || false,
          admin: data.admin || false,
          public: data.public || false,
          // Campos específicos para Guacamole
          autoResize: data.autoResize !== false, // Por defecto true, solo false si explícitamente se establece
          guacDpi: data.guacDpi || 96,
          guacSecurity: data.guacSecurity || 'any',
          guacEnableWallpaper: data.guacEnableWallpaper || false,
          guacEnableDrive: data.guacEnableDrive || false,
          guacDriveHostDir: data.guacDriveHostDir || '',
          guacEnableGfx: data.guacEnableGfx || false,
          // Opciones avanzadas
          guacEnableDesktopComposition: data.guacEnableDesktopComposition || false,
          guacEnableFontSmoothing: data.guacEnableFontSmoothing || false,
          guacEnableTheming: data.guacEnableTheming || false,
          guacEnableFullWindowDrag: data.guacEnableFullWindowDrag || false,
          guacEnableMenuAnimations: data.guacEnableMenuAnimations || false,
          // Flags de prueba
          guacDisableGlyphCaching: data.guacDisableGlyphCaching || false,
          guacDisableOffscreenCaching: data.guacDisableOffscreenCaching || false,
          guacDisableBitmapCaching: data.guacDisableBitmapCaching || false,
          guacDisableCopyRect: data.guacDisableCopyRect || false
        });
        setActiveTabIndex(1); // Tab RDP
      } else if (editConnectionType === 'sftp' || editConnectionType === 'ftp' || editConnectionType === 'scp') {
        // Precargar datos de archivos (SFTP/FTP/SCP)
        const data = editNodeData.data || {};
        const name = editNodeData.label || '';
        const host = data.host || '';
        const user = data.user || data.username || '';
        const password = data.password || '';
        const port = data.port || (editConnectionType === 'ftp' ? 21 : 22);
        const protocol = data.protocol || editConnectionType || 'sftp';
        const remoteFolder = data.remoteFolder || '';
        const targetFolder = data.targetFolder || '';

        // Actualizar estados locales directamente (solo para modo edición)
        setLocalFileConnectionName(name);
        setLocalFileConnectionHost(host);
        setLocalFileConnectionUser(user);
        setLocalFileConnectionPassword(password);
        setLocalFileConnectionPort(port);
        setLocalFileConnectionProtocol(protocol);
        setLocalFileConnectionRemoteFolder(remoteFolder);
        setLocalFileConnectionTargetFolder(targetFolder);

        // NO actualizar los props externos en modo edición para evitar interferencias
        // Los props externos se usan solo para modo creación
        setActiveTabIndex(2); // Tab Archivos
      } else {
        console.log('⚠️ [Dialogs] editConnectionType no reconocido:', { editConnectionType, isEditMode, editNodeData });
      }
    }
  }, [isEditMode, editNodeData, editConnectionType, visible, setSSHName, setSSHHost, setSSHUser, setSSHPassword, setSSHRemoteFolder, setSSHPort, setSSHAutoCopyPassword]);

  // Resetear estados locales cuando se cierra el diálogo
  useEffect(() => {
    if (!visible) {
      setLocalFileConnectionName('');
      setLocalFileConnectionHost('');
      setLocalFileConnectionUser('');
      setLocalFileConnectionPassword('');
      setLocalFileConnectionPort(22);
      setLocalFileConnectionProtocol('sftp');
      setLocalFileConnectionRemoteFolder('');
      setLocalFileConnectionTargetFolder('');
    }
  }, [visible]);

  // Header personalizado con botón de expansión
  const customHeader = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 0' }}>
      <span style={{ fontSize: '16px', fontWeight: '500' }}>
        {isEditMode ? "Editar Conexión" : "Nueva Conexión"}
      </span>
      <Button
        icon={isExpanded ? "pi pi-window-minimize" : "pi pi-window-maximize"}
        className="p-button-text p-button-sm"
        onClick={toggleExpansion}
        tooltip={isExpanded ? "Contraer" : "Expandir"}
        style={{ marginRight: '8px', padding: '3px 6px' }}
      />
    </div>
  );

  return (
    <Dialog 
      header={customHeader}
      visible={visible} 
      style={dialogStyle} 
      modal 
      resizable={true}
      onHide={onHide}
      contentStyle={{ padding: '0', overflow: 'auto' }}
      className="unified-connection-dialog"
    >
      {isEditMode ? (
        // Verificar primero SFTP/FTP/SCP antes que SSH para evitar conflictos
        editConnectionType === 'sftp' || editConnectionType === 'ftp' || editConnectionType === 'scp' ? (
          // Formulario de archivos (SFTP/FTP/SCP) optimizado para edición
          (() => {
            // Usar los estados locales, pero si están vacíos y los props tienen valores, usar los props
            const displayName = localFileConnectionName || fileConnectionName || '';
            const displayHost = localFileConnectionHost || fileConnectionHost || '';
            const displayUser = localFileConnectionUser || fileConnectionUser || '';
            const displayPassword = localFileConnectionPassword || fileConnectionPassword || '';
            const displayPort = localFileConnectionPort || fileConnectionPort || 22;
            const displayProtocol = localFileConnectionProtocol || fileConnectionProtocol || 'sftp';
            const displayRemoteFolder = localFileConnectionRemoteFolder || fileConnectionRemoteFolder || '';
            const displayTargetFolder = localFileConnectionTargetFolder || fileConnectionTargetFolder || '';
            return (
              <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
              <Card title="🔗 Conexión de Archivos" className="mb-2">
                <div className="formgrid grid">
                  <div className="field col-12">
                    <label htmlFor="file-name-edit">Nombre de la conexión *</label>
                    <InputText
                      id="file-name-edit"
                      value={displayName}
                      onChange={(e) => handleFileConnectionNameChange(e.target.value)}
                      placeholder="Mi servidor SFTP"
                      style={{ width: '100%' }}
                    />
                  </div>
                  
                  <div className="field col-12 md:col-6">
                    <label htmlFor="file-protocol-edit">Protocolo *</label>
                    <Dropdown
                      id="file-protocol-edit"
                      value={displayProtocol}
                      options={[
                        { label: 'SFTP', value: 'sftp' },
                        { label: 'FTP', value: 'ftp' },
                        { label: 'SCP', value: 'scp' }
                      ]}
                      onChange={(e) => handleFileConnectionProtocolChange(e.value)}
                      placeholder="Seleccionar protocolo"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12 md:col-6">
                    <label htmlFor="file-host-edit">Host *</label>
                    <InputText
                      id="file-host-edit"
                      value={displayHost}
                      onChange={(e) => handleFileConnectionHostChange(e.target.value)}
                      placeholder="192.168.1.100"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12 md:col-6">
                    <label htmlFor="file-user-edit">Usuario *</label>
                    <InputText
                      id="file-user-edit"
                      value={displayUser}
                      onChange={(e) => handleFileConnectionUserChange(e.target.value)}
                      placeholder="usuario"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12 md:col-6">
                    <label htmlFor="file-port-edit">Puerto</label>
                    <InputText
                      id="file-port-edit"
                      type="number"
                      value={displayPort}
                      onChange={(e) => {
                        const portValue = parseInt(e.target.value) || (displayProtocol === 'ftp' ? 21 : 22);
                        handleFileConnectionPortChange(portValue);
                      }}
                      placeholder={displayProtocol === 'ftp' ? '21' : '22'}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12">
                    <label htmlFor="file-password-edit">Contraseña</label>
                    <InputText
                      id="file-password-edit"
                      type="password"
                      value={displayPassword}
                      onChange={(e) => handleFileConnectionPasswordChange(e.target.value)}
                      placeholder="Contraseña (opcional)"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12 md:col-6">
                    <label htmlFor="file-remote-folder-edit">Carpeta remota (opcional)</label>
                    <InputText
                      id="file-remote-folder-edit"
                      value={displayRemoteFolder}
                      onChange={(e) => handleFileConnectionRemoteFolderChange(e.target.value)}
                      placeholder="/home/usuario"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12 md:col-6">
                    <label htmlFor="file-target-folder-edit">Carpeta destino (opcional)</label>
                    <InputText
                      id="file-target-folder-edit"
                      value={displayTargetFolder}
                      onChange={(e) => handleFileConnectionTargetFolderChange(e.target.value)}
                      placeholder="Carpeta local"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Botones */}
            <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 0, justifyContent: 'flex-end', paddingTop: '12px' }}>
              <Button 
                label="Cancelar" 
                icon="pi pi-times" 
                className="p-button-text" 
                onClick={onHide}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
              <Button 
                label="Guardar" 
                icon="pi pi-check" 
                className="p-button-primary" 
                onClick={() => {
                  // Validar que los campos requeridos estén presentes
                  if (!localFileConnectionName?.trim() || !localFileConnectionHost?.trim() || !localFileConnectionUser?.trim()) {
                    console.error('Faltan campos requeridos');
                    return;
                  }
                  
                  const fileData = {
                    name: localFileConnectionName.trim(),
                    host: localFileConnectionHost.trim(),
                    username: localFileConnectionUser.trim(),
                    password: localFileConnectionPassword || '',
                    port: localFileConnectionPort || (localFileConnectionProtocol === 'ftp' ? 21 : 22),
                    protocol: localFileConnectionProtocol || 'sftp',
                    remoteFolder: localFileConnectionRemoteFolder || '',
                    targetFolder: localFileConnectionTargetFolder || ''
                  };
                  
                  if (onFileConnectionConfirm && typeof onFileConnectionConfirm === 'function') {
                    onFileConnectionConfirm(fileData);
                  }
                }}
                disabled={!localFileConnectionName?.trim() || !localFileConnectionHost?.trim() || !localFileConnectionUser?.trim() || fileConnectionLoading}
                loading={fileConnectionLoading}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
            </div>
          </div>
            );
          })()
        ) :         editConnectionType === 'ssh' ? (
          (() => {
            return (
              <EnhancedSSHForm 
                activeTabIndex={activeTabIndex}
                sshName={sshName}
                setSSHName={setSSHName}
                sshHost={sshHost}
                setSSHHost={setSSHHost}
                sshUser={sshUser}
                setSSHUser={setSSHUser}
                sshPassword={sshPassword}
                setSSHPassword={setSSHPassword}
                sshPort={sshPort}
                setSSHPort={setSSHPort}
                sshRemoteFolder={sshRemoteFolder}
                setSSHRemoteFolder={setSSHRemoteFolder}
                sshTargetFolder={sshTargetFolder}
                setSSHTargetFolder={setSSHTargetFolder}
                sshAutoCopyPassword={sshAutoCopyPassword}
                setSSHAutoCopyPassword={setSSHAutoCopyPassword}
                foldersOptions={foldersOptions}
                onSSHConfirm={onSSHConfirm}
                onHide={onHide}
                sshLoading={sshLoading}
              />
            );
          })()
        ) : (
          // Formulario RDP optimizado para edición (mismo diseño que el tab RDP)
          (() => {
            return (
              <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Contenedor principal que se expande */}
            <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
              {/* Contenedor principal de 2 columnas */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                
                {/* --- COLUMNA IZQUIERDA: Conexión --- */}
                <div style={{ flex: '1', minWidth: '320px' }}>
                  <Card title="🔗 Conexión" className="mb-2">
                    <div className="formgrid grid">
                      <div className="field col-12">
                        <label htmlFor="name-edit">Nombre *</label>
                        <InputText
                          id="name-edit"
                          value={formData?.name || ''}
                          onChange={handleTextChange('name')}
                          placeholder="Nombre descriptivo"
                          autoComplete="off"
                        />
                      </div>
                      <div className="field col-8">
                        <label htmlFor="server-edit">Servidor *</label>
                        <InputText
                          id="server-edit"
                          value={formData.server}
                          onChange={handleTextChange('server')}
                          placeholder="IP o nombre del servidor"
                          autoComplete="off"
                        />
                      </div>
                      <div className="field col-4">
                        <label htmlFor="port-edit">Puerto</label>
                        <InputText
                          id="port-edit"
                          type="number"
                          value={formData.port}
                          onChange={handleTextChange('port')}
                          placeholder="3389"
                          autoComplete="off"
                        />
                      </div>
                      <div className="field col-12">
                        <label htmlFor="username-edit">Usuario *</label>
                        <InputText
                          id="username-edit"
                          value={formData.username}
                          onChange={handleTextChange('username')}
                          placeholder="Usuario"
                          autoComplete="off"
                        />
                      </div>
                      <div className="field col-12">
                        <label htmlFor="password-edit">Contraseña</label>
                        <div className="p-inputgroup">
                          <InputText
                            id="password-edit"
                            type={showRdpPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={handleTextChange('password')}
                            placeholder="Contraseña (opcional)"
                            autoComplete="off"
                          />
                          <Button 
                            type="button" 
                            icon={showRdpPassword ? "pi pi-eye-slash" : "pi pi-eye"} 
                            className="p-button-outlined"
                            onClick={() => setShowRdpPassword(!showRdpPassword)}
                            tooltip={showRdpPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            tooltipOptions={{ position: 'top' }}
                          />
                        </div>
                      </div>
                      <div className="field col-12">
                        <label htmlFor="clientType-edit">💻 Cliente</label>
                        <Dropdown
                          id="clientType-edit"
                          value={formData.clientType}
                          options={[
                            { label: 'Windows MSTSC', value: 'mstsc' },
                            { label: 'Apache Guacamole', value: 'guacamole' }
                          ]}
                          onChange={(e) => handleInputChange('clientType', e.value)}
                          placeholder="Seleccionar tipo"
                        />
                      </div>
                      {formData.clientType === 'guacamole' && (
                        <div className="field col-12">
                          <label htmlFor="guacSecurity-edit">🔒 Seguridad</label>
                          <Dropdown
                            id="guacSecurity-edit"
                            value={formData.guacSecurity}
                            options={[
                              { label: '🛡️ Automático', value: 'any' },
                              { label: '🔐 RDP Estándar', value: 'rdp' },
                              { label: '🔒 TLS', value: 'tls' },
                              { label: '🛡️ Network Level Authentication', value: 'nla' }
                            ]}
                            onChange={(e) => handleInputChange('guacSecurity', e.value)}
                            placeholder="Seleccionar protocolo"
                          />
                          <small>Nivel de seguridad para la conexión RDP</small>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Nueva Card condicional para NodeTerm Drive - MODO EDICIÓN */}
                  {formData.clientType === 'guacamole' && formData.guacEnableDrive && (
                    <Card title="📁 Carpeta Compartida" className="mt-3">
                        <div className="field">
                            <label htmlFor="guacDriveHostDir-edit">Ruta del directorio local</label>
                            <div className="p-inputgroup">
                                <InputText
                                    id="guacDriveHostDir-edit"
                                    value={formData.guacDriveHostDir}
                                    onChange={handleTextChange('guacDriveHostDir')}
                                    placeholder="Ej: C:\Users\TuUsuario\Compartido"
                                />
                                <Button icon="pi pi-folder-open" className="p-button-secondary p-button-outlined" onClick={handleSelectFolder} tooltip="Seleccionar carpeta" />
                            </div>
                            <small className="p-d-block mt-2 text-color-secondary">
                                Esta carpeta estará disponible como una unidad de red dentro de la sesión RDP.
                            </small>
                        </div>
                    </Card>
                  )}
                </div>

                {/* --- COLUMNA DERECHA: Ajustes de Sesión --- */}
                <div style={{ flex: '1.5', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Card: Pantalla */}
                  <Card title="🖥️ Pantalla">
                    <div className="formgrid grid">
                      <div className="field col-6">
                        <label htmlFor="preset-edit">Preset</label>
                        <Dropdown
                          id="preset-edit"
                          value={formData.preset}
                          options={[
                            { label: 'Por defecto', value: 'default' },
                            { label: 'Rendimiento', value: 'performance' },
                            { label: 'Calidad', value: 'quality' }
                          ]}
                          onChange={(e) => handleInputChange('preset', e.value)}
                        />
                      </div>
                      <div className="field col-6">
                        <label htmlFor="resolution-edit">Resolución</label>
                        <Dropdown
                          id="resolution-edit"
                          value={formData.resolution}
                          options={[
                            { label: 'Pantalla completa', value: 'fullscreen' },
                            { label: '1920x1080', value: '1920x1080' },
                            { label: '1600x1000', value: '1600x1000' },
                            { label: '1366x768', value: '1366x768' },
                            { label: '1024x768', value: '1024x768' }
                          ]}
                          onChange={(e) => handleInputChange('resolution', e.value)}
                        />
                      </div>
                      <div className="field col-6">
                        <label htmlFor="colorDepth-edit">Color</label>
                        <Dropdown
                          id="colorDepth-edit"
                          value={formData.colorDepth}
                          options={[
                            { label: '32 bits', value: 32 },
                            { label: '24 bits', value: 24 },
                            { label: '16 bits', value: 16 },
                            { label: '15 bits', value: 15 }
                          ]}
                          onChange={(e) => handleInputChange('colorDepth', e.value)}
                        />
                      </div>
                      <div className="field col-6">
                        <label htmlFor="guacDpi-edit">DPI</label>
                        <InputText
                          id="guacDpi-edit"
                          value={formData.guacDpi}
                          onChange={handleTextChange('guacDpi')}
                          placeholder="96"
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Card: Recursos Locales */}
                  <Card title="⚙️ Opciones">
                    <div className="formgrid grid">
                      {/* Opciones para MSTSC */}
                      {formData.clientType === 'mstsc' && (
                        <>
                          <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectClipboard-edit" checked={formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} /><label htmlFor="mstsc-redirectClipboard-edit">📋 Portapapeles</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectAudio-edit" checked={formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} /><label htmlFor="mstsc-redirectAudio-edit">🔊 Audio</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectPrinters-edit" checked={formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} /><label htmlFor="mstsc-redirectPrinters-edit">🖨️ Impresoras</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectFolders-edit" checked={formData.redirectFolders} onChange={handleCheckboxChange('redirectFolders')} /><label htmlFor="mstsc-redirectFolders-edit">📁 Carpetas</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="mstsc-smartSizing-edit" checked={formData.smartSizing} onChange={handleCheckboxChange('smartSizing')} /><label htmlFor="mstsc-smartSizing-edit">📐 Ajuste automático</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="mstsc-fullscreen-edit" checked={formData.fullscreen} onChange={handleCheckboxChange('fullscreen')} /><label htmlFor="mstsc-fullscreen-edit">🖥️ Pantalla completa</label></div>
                        </>
                      )}
                      {/* Opciones para Guacamole */}
                      {formData.clientType === 'guacamole' && (
                        <>
                          <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectClipboard-edit" checked={formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} /><label htmlFor="guac-redirectClipboard-edit">📋 Portapapeles</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectAudio-edit" checked={formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} /><label htmlFor="guac-redirectAudio-edit">🔊 Audio</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="guac-enableDrive-edit" checked={formData.guacEnableDrive} onChange={handleCheckboxChange('guacEnableDrive')} /><label htmlFor="guac-enableDrive-edit">💾 Carpetas (NodeTerm Drive)</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="guac-autoResize-edit" checked={formData.autoResize} onChange={handleCheckboxChange('autoResize')} /><label htmlFor="guac-autoResize-edit">📐 Ajuste automático</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="guac-enableWallpaper-edit" checked={formData.guacEnableWallpaper} onChange={handleCheckboxChange('guacEnableWallpaper')} /><label htmlFor="guac-enableWallpaper-edit">🖼️ Mostrar fondo</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectPrinters-edit" checked={formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} /><label htmlFor="guac-redirectPrinters-edit">🖨️ Impresoras</label></div>
                        </>
                      )}
                    </div>
                    {/* Configuración de carpetas condicional para Guacamole - ELIMINADO DE AQUÍ */}
                    

                    {/* Fieldset: Opciones Avanzadas (anidado y con separador) */}
                    {formData.clientType === 'guacamole' && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                        <Fieldset legend="⚙️ Opciones Avanzadas" toggleable collapsed>
                          <div className="formgrid grid">
                            <div className="col-4">
                              <h5>Rendimiento</h5>
                              <div className="field-checkbox"><Checkbox inputId="guac-gfx-edit" checked={formData.guacEnableGfx} onChange={handleCheckboxChange('guacEnableGfx')} /><label htmlFor="guac-gfx-edit">🎨 Habilitar GFX</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-composition-edit" checked={formData.guacEnableDesktopComposition} onChange={handleCheckboxChange('guacEnableDesktopComposition')} /><label htmlFor="guac-composition-edit">🖼️ Desktop Composition</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-font-edit" checked={formData.guacEnableFontSmoothing} onChange={handleCheckboxChange('guacEnableFontSmoothing')} /><label htmlFor="guac-font-edit">✨ Font Smoothing</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-theming-edit" checked={formData.guacEnableTheming} onChange={handleCheckboxChange('guacEnableTheming')} /><label htmlFor="guac-theming-edit">🎭 Theming</label></div>
                            </div>
                            <div className="col-4">
                              <h5>Interfaz</h5>
                              <div className="field-checkbox"><Checkbox inputId="guac-drag-edit" checked={formData.guacEnableFullWindowDrag} onChange={handleCheckboxChange('guacEnableFullWindowDrag')} /><label htmlFor="guac-drag-edit">🖱️ Full Window Drag</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-menu-edit" checked={formData.guacEnableMenuAnimations} onChange={handleCheckboxChange('guacEnableMenuAnimations')} /><label htmlFor="guac-menu-edit">🎬 Animaciones de menú</label></div>
                            </div>
                            <div className="col-4">
                              <h5>Caché</h5>
                              <div className="field-checkbox"><Checkbox inputId="guac-glyph-cache-edit" checked={!formData.guacDisableGlyphCaching} onChange={(e) => handleInputChange('guacDisableGlyphCaching', !e.checked)} /><label htmlFor="guac-glyph-cache-edit">🔤 Glyph Caching</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-offscreen-cache-edit" checked={!formData.guacDisableOffscreenCaching} onChange={(e) => handleInputChange('guacDisableOffscreenCaching', !e.checked)} /><label htmlFor="guac-offscreen-cache-edit">📱 Offscreen Caching</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-bitmap-cache-edit" checked={!formData.guacDisableBitmapCaching} onChange={(e) => handleInputChange('guacDisableBitmapCaching', !e.checked)} /><label htmlFor="guac-bitmap-cache-edit">🖼️ Bitmap Caching</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-copy-rect-edit" checked={!formData.guacDisableCopyRect} onChange={(e) => handleInputChange('guacDisableCopyRect', !e.checked)} /><label htmlFor="guac-copy-rect-edit">📋 Copy-Rect</label></div>
                            </div>
                          </div>
                        </Fieldset>
                      </div>
                    )}
                  </Card>

                </div>
              </div>
            </div>
            {/* Botones */}
            <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 0, justifyContent: 'flex-end', paddingTop: '12px' }}>
              <Button 
                label="Cancelar" 
                icon="pi pi-times" 
                className="p-button-text" 
                onClick={onHide}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
              <Button 
                label="Guardar Cambios" 
                icon="pi pi-check" 
                className="p-button-primary" 
                onClick={() => {
                  console.log('Guardar cambios RDP con datos:', formData);
                  onSaveToSidebar && onSaveToSidebar(formData, true, editNodeData);
                }}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
            </div>
          </div>
            );
          })()
        )
      ) : (
        // Modo creación: mostrar pestañas
        <TabView 
          activeIndex={activeTabIndex} 
          onTabChange={(e) => setActiveTabIndex(e.index)}
          style={{ marginTop: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}
        >
        {/* Tab SSH - Nuevo diseño mejorado */}
        <TabPanel header="SSH" leftIcon="pi pi-server">
          <EnhancedSSHForm 
            activeTabIndex={activeTabIndex}
            sshName={sshName}
            setSSHName={setSSHName}
            sshHost={sshHost}
            setSSHHost={setSSHHost}
            sshUser={sshUser}
            setSSHUser={setSSHUser}
            sshPassword={sshPassword}
            setSSHPassword={setSSHPassword}
            sshPort={sshPort}
            setSSHPort={setSSHPort}
            sshRemoteFolder={sshRemoteFolder}
            setSSHRemoteFolder={setSSHRemoteFolder}
            sshTargetFolder={sshTargetFolder}
            setSSHTargetFolder={setSSHTargetFolder}
            sshAutoCopyPassword={sshAutoCopyPassword}
            setSSHAutoCopyPassword={setSSHAutoCopyPassword}
            foldersOptions={foldersOptions}
            onSSHConfirm={onSSHConfirm}
            onHide={onHide}
            sshLoading={sshLoading}
          />
        </TabPanel>

        {/* Tab RDP */}
        <TabPanel header="RDP" leftIcon="pi pi-desktop">
          <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Contenedor principal que se expande */}
            <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
              {/* Contenedor principal de 2 columnas */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                
                {/* --- COLUMNA IZQUIERDA: Conexión --- */}
                <div style={{ flex: '1', minWidth: '320px' }}>
                  <Card title="🔗 Conexión" className="mb-2">
                    <div className="formgrid grid">
                      <div className="field col-12">
                        <label htmlFor="name-edit">Nombre *</label>
                        <InputText
                          id="name-edit"
                          value={formData?.name || ''}
                          onChange={handleTextChange('name')}
                          placeholder="Nombre descriptivo"
                          autoComplete="off"
                        />
                      </div>
                      <div className="field col-8">
                        <label htmlFor="server-edit">Servidor *</label>
                        <InputText
                          id="server-edit"
                          value={formData.server}
                          onChange={handleTextChange('server')}
                          placeholder="IP o nombre del servidor"
                          autoComplete="off"
                        />
                      </div>
                      <div className="field col-4">
                        <label htmlFor="port-edit">Puerto</label>
                        <InputText
                          id="port-edit"
                          type="number"
                          value={formData.port}
                          onChange={handleTextChange('port')}
                          placeholder="3389"
                          autoComplete="off"
                        />
                      </div>
                      <div className="field col-12">
                        <label htmlFor="username-edit">Usuario *</label>
                        <InputText
                          id="username-edit"
                          value={formData.username}
                          onChange={handleTextChange('username')}
                          placeholder="Usuario"
                          autoComplete="off"
                        />
                      </div>
                      <div className="field col-12">
                        <label htmlFor="password-edit">Contraseña</label>
                        <div className="p-inputgroup">
                          <InputText
                            id="password-edit"
                            type={showRdpPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={handleTextChange('password')}
                            placeholder="Contraseña (opcional)"
                            autoComplete="off"
                          />
                          <Button 
                            type="button" 
                            icon={showRdpPassword ? "pi pi-eye-slash" : "pi pi-eye"} 
                            className="p-button-outlined"
                            onClick={() => setShowRdpPassword(!showRdpPassword)}
                            tooltip={showRdpPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            tooltipOptions={{ position: 'top' }}
                          />
                        </div>
                      </div>
                      <div className="field col-12">
                        <label htmlFor="clientType-edit">💻 Cliente</label>
                        <Dropdown
                          id="clientType-edit"
                          value={formData.clientType}
                          options={[
                            { label: 'Windows MSTSC', value: 'mstsc' },
                            { label: 'Apache Guacamole', value: 'guacamole' }
                          ]}
                          onChange={(e) => handleInputChange('clientType', e.value)}
                          placeholder="Seleccionar tipo"
                        />
                      </div>
                      {formData.clientType === 'guacamole' && (
                        <div className="field col-12">
                          <label htmlFor="guacSecurity-edit">🔒 Seguridad</label>
                          <Dropdown
                            id="guacSecurity-edit"
                            value={formData.guacSecurity}
                            options={[
                              { label: '🛡️ Automático', value: 'any' },
                              { label: '🔐 RDP Estándar', value: 'rdp' },
                              { label: '🔒 TLS', value: 'tls' },
                              { label: '🛡️ Network Level Authentication', value: 'nla' }
                            ]}
                            onChange={(e) => handleInputChange('guacSecurity', e.value)}
                            placeholder="Seleccionar protocolo"
                          />
                          <small>Nivel de seguridad para la conexión RDP</small>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Nueva Card condicional para NodeTerm Drive - MODO CREACIÓN */}
                  {formData.clientType === 'guacamole' && formData.guacEnableDrive && (
                    <Card title="📁 Carpeta Compartida" className="mt-3">
                        <div className="field">
                            <label htmlFor="guacDriveHostDir-create">Ruta del directorio local</label>
                            <div className="p-inputgroup">
                                <InputText
                                    id="guacDriveHostDir-create"
                                    value={formData.guacDriveHostDir}
                                    onChange={handleTextChange('guacDriveHostDir')}
                                    placeholder="Ej: C:\Users\TuUsuario\Compartido"
                                />
                                <Button icon="pi pi-folder-open" className="p-button-secondary p-button-outlined" onClick={handleSelectFolder} tooltip="Seleccionar carpeta" />
                            </div>
                            <small className="p-d-block mt-2 text-color-secondary">
                                Esta carpeta estará disponible como una unidad de red dentro de la sesión RDP.
                            </small>
                        </div>
                    </Card>
                  )}
                </div>

                {/* --- COLUMNA DERECHA: Ajustes de Sesión --- */}
                <div style={{ flex: '1.5', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Card: Pantalla */}
                  <Card title="🖥️ Pantalla">
                    <div className="formgrid grid">
                      <div className="field col-6">
                        <label htmlFor="preset-edit">Preset</label>
                        <Dropdown
                          id="preset-edit"
                          value={formData.preset}
                          options={[
                            { label: 'Por defecto', value: 'default' },
                            { label: 'Rendimiento', value: 'performance' },
                            { label: 'Calidad', value: 'quality' }
                          ]}
                          onChange={(e) => handleInputChange('preset', e.value)}
                        />
                      </div>
                      <div className="field col-6">
                        <label htmlFor="resolution-edit">Resolución</label>
                        <Dropdown
                          id="resolution-edit"
                          value={formData.resolution}
                          options={[
                            { label: 'Pantalla completa', value: 'fullscreen' },
                            { label: '1920x1080', value: '1920x1080' },
                            { label: '1600x1000', value: '1600x1000' },
                            { label: '1366x768', value: '1366x768' },
                            { label: '1024x768', value: '1024x768' }
                          ]}
                          onChange={(e) => handleInputChange('resolution', e.value)}
                        />
                      </div>
                      <div className="field col-6">
                        <label htmlFor="colorDepth-edit">Color</label>
                        <Dropdown
                          id="colorDepth-edit"
                          value={formData.colorDepth}
                          options={[
                            { label: '32 bits', value: 32 },
                            { label: '24 bits', value: 24 },
                            { label: '16 bits', value: 16 },
                            { label: '15 bits', value: 15 }
                          ]}
                          onChange={(e) => handleInputChange('colorDepth', e.value)}
                        />
                      </div>
                      <div className="field col-6">
                        <label htmlFor="guacDpi-edit">DPI</label>
                        <InputText
                          id="guacDpi-edit"
                          value={formData.guacDpi}
                          onChange={handleTextChange('guacDpi')}
                          placeholder="96"
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Card: Recursos Locales */}
                  <Card title="⚙️ Opciones">
                    <div className="formgrid grid">
                      {/* Opciones para MSTSC */}
                      {formData.clientType === 'mstsc' && (
                        <>
                          <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectClipboard-edit" checked={formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} /><label htmlFor="mstsc-redirectClipboard-edit">📋 Portapapeles</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectAudio-edit" checked={formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} /><label htmlFor="mstsc-redirectAudio-edit">🔊 Audio</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectPrinters-edit" checked={formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} /><label htmlFor="mstsc-redirectPrinters-edit">🖨️ Impresoras</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectFolders-edit" checked={formData.redirectFolders} onChange={handleCheckboxChange('redirectFolders')} /><label htmlFor="mstsc-redirectFolders-edit">📁 Carpetas</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="mstsc-smartSizing-edit" checked={formData.smartSizing} onChange={handleCheckboxChange('smartSizing')} /><label htmlFor="mstsc-smartSizing-edit">📐 Ajuste automático</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="mstsc-fullscreen-edit" checked={formData.fullscreen} onChange={handleCheckboxChange('fullscreen')} /><label htmlFor="mstsc-fullscreen-edit">🖥️ Pantalla completa</label></div>
                        </>
                      )}
                      {/* Opciones para Guacamole */}
                      {formData.clientType === 'guacamole' && (
                        <>
                          <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectClipboard-create" checked={formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} /><label htmlFor="guac-redirectClipboard-create">📋 Portapapeles</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectAudio-create" checked={formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} /><label htmlFor="guac-redirectAudio-create">🔊 Audio</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="guac-enableDrive-create" checked={formData.guacEnableDrive} onChange={handleCheckboxChange('guacEnableDrive')} /><label htmlFor="guac-enableDrive-create">💾 Carpetas (NodeTerm Drive)</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="guac-autoResize-create" checked={formData.autoResize} onChange={handleCheckboxChange('autoResize')} /><label htmlFor="guac-autoResize-create">📐 Ajuste automático</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="guac-enableWallpaper-create" checked={formData.guacEnableWallpaper} onChange={handleCheckboxChange('guacEnableWallpaper')} /><label htmlFor="guac-enableWallpaper-create">🖼️ Mostrar fondo</label></div>
                          <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectPrinters-create" checked={formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} /><label htmlFor="guac-redirectPrinters-create">🖨️ Impresoras</label></div>
                        </>
                      )}
                    </div>
                    {/* Configuración de carpetas condicional para Guacamole - ELIMINADO DE AQUÍ */}
                    

                    {/* Fieldset: Opciones Avanzadas (anidado y con separador) */}
                    {formData.clientType === 'guacamole' && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                        <Fieldset legend="⚙️ Opciones Avanzadas" toggleable collapsed>
                          <div className="formgrid grid">
                            <div className="col-4">
                              <h5>Rendimiento</h5>
                              <div className="field-checkbox"><Checkbox inputId="guac-gfx-edit" checked={formData.guacEnableGfx} onChange={handleCheckboxChange('guacEnableGfx')} /><label htmlFor="guac-gfx-edit">🎨 Habilitar GFX</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-composition-edit" checked={formData.guacEnableDesktopComposition} onChange={handleCheckboxChange('guacEnableDesktopComposition')} /><label htmlFor="guac-composition-edit">🖼️ Desktop Composition</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-font-edit" checked={formData.guacEnableFontSmoothing} onChange={handleCheckboxChange('guacEnableFontSmoothing')} /><label htmlFor="guac-font-edit">✨ Font Smoothing</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-theming-edit" checked={formData.guacEnableTheming} onChange={handleCheckboxChange('guacEnableTheming')} /><label htmlFor="guac-theming-edit">🎭 Theming</label></div>
                            </div>
                            <div className="col-4">
                              <h5>Interfaz</h5>
                              <div className="field-checkbox"><Checkbox inputId="guac-drag-edit" checked={formData.guacEnableFullWindowDrag} onChange={handleCheckboxChange('guacEnableFullWindowDrag')} /><label htmlFor="guac-drag-edit">🖱️ Full Window Drag</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-menu-edit" checked={formData.guacEnableMenuAnimations} onChange={handleCheckboxChange('guacEnableMenuAnimations')} /><label htmlFor="guac-menu-edit">🎬 Animaciones de menú</label></div>
                            </div>
                            <div className="col-4">
                              <h5>Caché</h5>
                              <div className="field-checkbox"><Checkbox inputId="guac-glyph-cache-edit" checked={!formData.guacDisableGlyphCaching} onChange={(e) => handleInputChange('guacDisableGlyphCaching', !e.checked)} /><label htmlFor="guac-glyph-cache-edit">🔤 Glyph Caching</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-offscreen-cache-edit" checked={!formData.guacDisableOffscreenCaching} onChange={(e) => handleInputChange('guacDisableOffscreenCaching', !e.checked)} /><label htmlFor="guac-offscreen-cache-edit">📱 Offscreen Caching</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-bitmap-cache-edit" checked={!formData.guacDisableBitmapCaching} onChange={(e) => handleInputChange('guacDisableBitmapCaching', !e.checked)} /><label htmlFor="guac-bitmap-cache-edit">🖼️ Bitmap Caching</label></div>
                              <div className="field-checkbox"><Checkbox inputId="guac-copy-rect-edit" checked={!formData.guacDisableCopyRect} onChange={(e) => handleInputChange('guacDisableCopyRect', !e.checked)} /><label htmlFor="guac-copy-rect-edit">📋 Copy-Rect</label></div>
                            </div>
                          </div>
                        </Fieldset>
                      </div>
                    )}
                  </Card>

                </div>
              </div>
            </div>
            {/* Botones */}
            <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 0, justifyContent: 'flex-end', paddingTop: '12px' }}>
              <Button 
                label="Cancelar" 
                icon="pi pi-times" 
                className="p-button-text" 
                onClick={onHide}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
              <Button 
                label="Guardar" 
                icon="pi pi-check" 
                className="p-button-primary" 
                onClick={() => {
                  console.log('Crear conexión RDP con datos:', formData);
                  onSaveToSidebar && onSaveToSidebar(formData, false, null);
                  onHide();
                }}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
            </div>
          </div>
        </TabPanel>

        {/* Tab Archivos (SFTP/FTP/SCP) */}
        <TabPanel header="Archivos" leftIcon="pi pi-folder">
          <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
              <Card title="🔗 Conexión de Archivos" className="mb-2">
                <div className="formgrid grid">
                  <div className="field col-12">
                    <label htmlFor="file-name">Nombre de la conexión *</label>
                    <InputText
                      id="file-name"
                      value={localFileConnectionName}
                      onChange={(e) => handleFileConnectionNameChange(e.target.value)}
                      placeholder="Mi servidor SFTP"
                      style={{ width: '100%' }}
                    />
                  </div>
                  
                  <div className="field col-12 md:col-6">
                    <label htmlFor="file-protocol">Protocolo *</label>
                    <Dropdown
                      id="file-protocol"
                      value={localFileConnectionProtocol}
                      options={[
                        { label: 'SFTP', value: 'sftp' },
                        { label: 'FTP', value: 'ftp' },
                        { label: 'SCP', value: 'scp' }
                      ]}
                      onChange={(e) => handleFileConnectionProtocolChange(e.value)}
                      placeholder="Seleccionar protocolo"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12 md:col-6">
                    <label htmlFor="file-host">Host *</label>
                    <InputText
                      id="file-host"
                      value={localFileConnectionHost}
                      onChange={(e) => handleFileConnectionHostChange(e.target.value)}
                      placeholder="192.168.1.100"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12 md:col-6">
                    <label htmlFor="file-user">Usuario *</label>
                    <InputText
                      id="file-user"
                      value={localFileConnectionUser}
                      onChange={(e) => handleFileConnectionUserChange(e.target.value)}
                      placeholder="usuario"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12 md:col-6">
                    <label htmlFor="file-port">Puerto</label>
                    <InputText
                      id="file-port"
                      type="number"
                      value={localFileConnectionPort}
                      onChange={(e) => {
                        const portValue = parseInt(e.target.value) || (localFileConnectionProtocol === 'ftp' ? 21 : 22);
                        handleFileConnectionPortChange(portValue);
                      }}
                      placeholder={localFileConnectionProtocol === 'ftp' ? '21' : '22'}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12">
                    <label htmlFor="file-password">Contraseña</label>
                    <InputText
                      id="file-password"
                      type="password"
                      value={localFileConnectionPassword}
                      onChange={(e) => handleFileConnectionPasswordChange(e.target.value)}
                      placeholder="Contraseña (opcional)"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12 md:col-6">
                    <label htmlFor="file-remote-folder">Carpeta remota (opcional)</label>
                    <InputText
                      id="file-remote-folder"
                      value={localFileConnectionRemoteFolder}
                      onChange={(e) => handleFileConnectionRemoteFolderChange(e.target.value)}
                      placeholder="/home/usuario"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12 md:col-6">
                    <label htmlFor="file-target-folder">Carpeta destino (opcional)</label>
                    <InputText
                      id="file-target-folder"
                      value={localFileConnectionTargetFolder}
                      onChange={(e) => handleFileConnectionTargetFolderChange(e.target.value)}
                      placeholder="Carpeta local"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Botones */}
            <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 0, justifyContent: 'flex-end', paddingTop: '12px' }}>
              <Button 
                label="Cancelar" 
                icon="pi pi-times" 
                className="p-button-text" 
                onClick={onHide}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
              <Button 
                label="Guardar" 
                icon="pi pi-check" 
                className="p-button-primary" 
                onClick={() => {
                  // Validar que los campos requeridos estén presentes
                  if (!localFileConnectionName?.trim() || !localFileConnectionHost?.trim() || !localFileConnectionUser?.trim()) {
                    console.error('Faltan campos requeridos');
                    return;
                  }
                  
                  const fileData = {
                    name: localFileConnectionName.trim(),
                    host: localFileConnectionHost.trim(),
                    username: localFileConnectionUser.trim(),
                    password: localFileConnectionPassword || '',
                    port: localFileConnectionPort || (localFileConnectionProtocol === 'ftp' ? 21 : 22),
                    protocol: localFileConnectionProtocol || 'sftp',
                    remoteFolder: localFileConnectionRemoteFolder || '',
                    targetFolder: localFileConnectionTargetFolder || ''
                  };
                  
                  console.log('Guardar clickeado - Datos:', fileData);
                  console.log('onFileConnectionConfirm existe:', !!onFileConnectionConfirm);
                  console.log('onFileConnectionConfirm tipo:', typeof onFileConnectionConfirm);
                  console.log('onFileConnectionConfirm valor:', onFileConnectionConfirm);
                  console.log('stableHandlerRef.current existe:', !!stableHandlerRef.current);
                  console.log('stableHandlerRef.current tipo:', typeof stableHandlerRef.current);
                  console.log('stableHandlerRef.current valor:', stableHandlerRef.current);
                  
                  // Intentar usar el prop directamente primero
                  let handlerToUse = null;
                  
                  if (onFileConnectionConfirm && typeof onFileConnectionConfirm === 'function') {
                    handlerToUse = onFileConnectionConfirm;
                    console.log('✅ Usando prop directo');
                  } else if (stableHandlerRef.current && typeof stableHandlerRef.current === 'function') {
                    handlerToUse = stableHandlerRef.current;
                    console.log('✅ Usando stableHandlerRef');
                  } else {
                    console.error('❌ No hay handler disponible!');
                    console.error('onFileConnectionConfirm:', onFileConnectionConfirm);
                    console.error('stableHandlerRef.current:', stableHandlerRef.current);
                    // Fallback: usar evento personalizado
                    console.log('⚠️ Usando fallback: evento personalizado');
                    window.dispatchEvent(new CustomEvent('save-file-connection', {
                      detail: fileData
                    }));
                  }
                  
                  if (handlerToUse) {
                    try {
                      handlerToUse(fileData);
                    } catch (error) {
                      console.error('❌ Error al llamar handler:', error);
                    }
                  }
                }}
                disabled={!localFileConnectionName?.trim() || !localFileConnectionHost?.trim() || !localFileConnectionUser?.trim() || fileConnectionLoading}
                loading={fileConnectionLoading}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
            </div>
          </div>
        </TabPanel>

        {/* Tab Password - Solo mostrar si allowPasswordTab es true */}
        {allowPasswordTab && (
          <TabPanel header="Password" leftIcon="pi pi-key">
          <PasswordCreateForm
            foldersOptions={foldersOptions}
            onCreate={(payload) => {
              // Lógica de creación vendrá por props parent (usaremos window-dispatch via custom event)
              const ev = new CustomEvent('create-password-from-dialog', { detail: payload });
              window.dispatchEvent(ev);
              onHide();
            }}
          />
        </TabPanel>
        )}
      </TabView>
      )}
    </Dialog>
  );
}
function PasswordCreateForm({ foldersOptions = [], onCreate }) {
  const [title, setTitle] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [group, setGroup] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [targetFolder, setTargetFolder] = React.useState(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const canCreate = title.trim().length > 0;

  return (
    <div className="p-fluid" style={{ padding: '12px' }}>
      <div className="formgrid grid">
        <div className="field col-12">
          <label htmlFor="pwdTitle">Título *</label>
          <InputText id="pwdTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mi cuenta" />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdUser">Usuario</label>
          <InputText id="pwdUser" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdPass">Contraseña</label>
          <div className="p-inputgroup">
            <InputText 
              id="pwdPass" 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            <Button 
              type="button" 
              icon={showPassword ? "pi pi-eye-slash" : "pi pi-eye"} 
              className="p-button-outlined"
              onClick={() => setShowPassword(!showPassword)}
              tooltip={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              tooltipOptions={{ position: 'top' }}
            />
          </div>
        </div>
        <div className="field col-12">
          <label htmlFor="pwdUrl">URL</label>
          <InputText id="pwdUrl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdGroup">Grupo</label>
          <InputText id="pwdGroup" value={group} onChange={(e) => setGroup(e.target.value)} />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdTarget">Carpeta destino</label>
          <Dropdown id="pwdTarget" value={targetFolder} options={foldersOptions} onChange={(e) => setTargetFolder(e.value)} placeholder="Opcional" showClear filter />
        </div>
        <div className="field col-12">
          <label htmlFor="pwdNotes">Notas</label>
          <InputText id="pwdNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="p-field" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: '12px' }}>
        <Button label="Crear" icon="pi pi-check" disabled={!canCreate} onClick={() => onCreate && onCreate({ title, username, password, url, group, notes, targetFolder })} />
      </div>
    </div>
  );
}


// --- EnhancedSSHForm: Formulario SSH mejorado con soporte para claves ---
export function EnhancedSSHForm({
  activeTabIndex,
  sshName, setSSHName,
  sshHost, setSSHHost,
  sshUser, setSSHUser,
  sshPassword, setSSHPassword,
  sshPort, setSSHPort,
  sshRemoteFolder, setSSHRemoteFolder,
  sshTargetFolder, setSSHTargetFolder,
  sshAutoCopyPassword, setSSHAutoCopyPassword,
  foldersOptions,
  onSSHConfirm,
  onHide,
  sshLoading
}) {
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'key'
  const [sshPrivateKey, setSSHPrivateKey] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [autoCopyPassword, setAutoCopyPassword] = useState(!!sshAutoCopyPassword);

  useEffect(() => {
    setAutoCopyPassword(!!sshAutoCopyPassword);
  }, [sshAutoCopyPassword]);

  const handleAutoCopyToggle = (checked) => {
    setAutoCopyPassword(!!checked);
    if (typeof setSSHAutoCopyPassword === 'function') {
      setSSHAutoCopyPassword(!!checked);
    }
  };

  // Validación solo al intentar crear la conexión
  const validateForm = () => {
    const errors = {};
    
    if (!sshName?.trim()) {
      errors.name = 'El nombre es requerido';
    }
    
    if (!sshHost?.trim()) {
      errors.host = 'El host es requerido';
    }
    
    if (!sshUser?.trim()) {
      errors.user = 'El usuario es requerido';
    }
    
    if (authMethod === 'password' && !sshPassword?.trim()) {
      errors.auth = 'La contraseña es requerida';
    } else if (authMethod === 'key' && !sshPrivateKey?.trim()) {
      errors.auth = 'La clave privada es requerida';
    }
    
    const portNum = parseInt(sshPort);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.port = 'Puerto debe ser un número entre 1 y 65535';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileUpload = (event) => {
    const file = event.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSSHPrivateKey(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const isFormValid = () => {
    return sshName?.trim() && 
           sshHost?.trim() && 
           sshUser?.trim() &&
           (authMethod === 'password' ? sshPassword?.trim() : sshPrivateKey?.trim());
  };

  return (
    <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Contenedor principal que se expande */}
      <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          
          {/* --- COLUMNA IZQUIERDA: Conexión --- */}
          <div style={{ flex: '1', minWidth: '320px' }}>
            <Card title="🔗 Conexión">
              <div className="formgrid grid">
                <div className="field col-12">
                  <label htmlFor="sshName">Nombre *</label>
                  <InputText 
                    id="sshName"
                    value={sshName} 
                    onChange={(e) => setSSHName(e.target.value)}
                    placeholder="Servidor de producción"
                    autoFocus={activeTabIndex === 0}
                    className={validationErrors.name ? 'p-invalid' : ''}
                  />
                  {validationErrors.name && <small className="p-error">{validationErrors.name}</small>}
                </div>

                <div className="field col-8">
                  <label htmlFor="sshHost">Host *</label>
                  <InputText 
                    id="sshHost"
                    value={sshHost} 
                    onChange={(e) => setSSHHost(e.target.value)}
                    placeholder="IP o nombre del servidor"
                    className={validationErrors.host ? 'p-invalid' : ''}
                  />
                  {validationErrors.host && <small className="p-error">{validationErrors.host}</small>}
                </div>

                <div className="field col-4">
                  <label htmlFor="sshPort">Puerto</label>
                  <InputText 
                    id="sshPort"
                    value={sshPort} 
                    onChange={(e) => setSSHPort(e.target.value)}
                    placeholder="22"
                    className={validationErrors.port ? 'p-invalid' : ''}
                  />
                  {validationErrors.port && <small className="p-error">{validationErrors.port}</small>}
                </div>

                <div className="field col-12">
                  <label htmlFor="sshUser">Usuario *</label>
                  <InputText 
                    id="sshUser"
                    value={sshUser} 
                    onChange={(e) => setSSHUser(e.target.value)}
                    placeholder="root"
                    className={validationErrors.user ? 'p-invalid' : ''}
                  />
                  {validationErrors.user && <small className="p-error">{validationErrors.user}</small>}
                </div>
              </div>
            </Card>
          </div>

          {/* --- COLUMNA DERECHA: Autenticación y Opciones --- */}
          <div style={{ flex: '1.5', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Card title="🔐 Autenticación">
              <div className="formgrid grid">
                <div className="field col-12" style={{ display: 'flex', gap: '2rem' }}>
                  <div className="field-radiobutton">
                    <RadioButton inputId="authPassword" name="authMethod" value="password" onChange={(e) => setAuthMethod(e.value)} checked={authMethod === 'password'} />
                    <label htmlFor="authPassword">Contraseña</label>
                  </div>
                  <div className="field-radiobutton">
                    <RadioButton inputId="authKey" name="authMethod" value="key" onChange={(e) => setAuthMethod(e.value)} checked={authMethod === 'key'} />
                    <label htmlFor="authKey">Clave SSH</label>
                  </div>
                </div>

                {authMethod === 'password' && (
                  <>
                    <div className="field col-12">
                      <label htmlFor="sshPassword">Contraseña *</label>
                      <div className="p-inputgroup">
                        <InputText 
                          id="sshPassword"
                          type={showPassword ? "text" : "password"} 
                          value={sshPassword} 
                          onChange={(e) => setSSHPassword(e.target.value)}
                          placeholder="Ingresa tu contraseña"
                          className={validationErrors.auth ? 'p-invalid' : ''}
                        />
                        <Button 
                          type="button" 
                          icon={showPassword ? "pi pi-eye-slash" : "pi pi-eye"} 
                          className="p-button-outlined"
                          onClick={() => setShowPassword(!showPassword)}
                          tooltip={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          tooltipOptions={{ position: 'top' }}
                        />
                      </div>
                      {validationErrors.auth && <small className="p-error">{validationErrors.auth}</small>}
                    </div>
                    <div className="field-checkbox col-12" style={{ marginTop: '8px' }}>
                      <Checkbox 
                        inputId="sshAutoCopyPassword" 
                        checked={autoCopyPassword} 
                        onChange={(e) => handleAutoCopyToggle(e.checked)}
                      />
                      <label htmlFor="sshAutoCopyPassword" style={{ cursor: 'pointer', marginLeft: '8px' }}>
                        Copiar contraseña automáticamente al conectar
                      </label>
                    </div>
                  </>
                )}

                {authMethod === 'key' && (
                  <div className="field col-12">
                    <label>Clave Privada SSH *</label>
                    <FileUpload 
                        mode="basic" 
                        name="sshKey" 
                        accept=".pem,.key,.ppk,*" 
                        maxFileSize={1000000}
                        onSelect={handleFileUpload}
                        chooseLabel="📁 Cargar desde archivo"
                        className="p-button-outlined p-button-sm"
                        auto
                      />
                    <InputTextarea 
                      value={sshPrivateKey}
                      onChange={(e) => setSSHPrivateKey(e.target.value)}
                      rows={8}
                      placeholder="O pega tu clave privada aquí (ej. -----BEGIN...)"
                      className={`w-full ${validationErrors.auth ? 'p-invalid' : ''}`}
                      style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '12px' }}
                    />
                    {validationErrors.auth && <small className="p-error">{validationErrors.auth}</small>}
                  </div>
                )}
              </div>
            </Card>

            <Card title="⚙️ Opciones">
              <div className="formgrid grid">
                <div className="field col-6">
                  <label htmlFor="sshTargetFolder">Carpeta destino</label>
                  <Dropdown 
                    id="sshTargetFolder"
                    value={sshTargetFolder} 
                    options={foldersOptions} 
                    onChange={(e) => setSSHTargetFolder(e.value)} 
                    placeholder="Opcional"
                    showClear
                  />
                </div>
                <div className="field col-6">
                  <label htmlFor="sshRemoteFolder">Directorio remoto inicial</label>
                  <InputText 
                    id="sshRemoteFolder"
                    value={sshRemoteFolder} 
                    onChange={(e) => setSSHRemoteFolder(e.target.value)}
                    placeholder="/home/usuario"
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Botones (se mantienen al fondo) */}
      <div className="p-field" style={{ flexShrink: 0, display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: '12px' }}>
        <Button 
          label="Cancelar" 
          icon="pi pi-times" 
          className="p-button-text" 
          onClick={onHide}
          style={{ fontSize: '13px', padding: '8px 16px' }}
        />
        <Button 
          label="Guardar" 
          icon="pi pi-check" 
          className="p-button-primary" 
          onClick={() => {
            if (validateForm()) {
              onSSHConfirm();
            }
          }}
          style={{ fontSize: '13px', padding: '8px 16px' }}
          loading={sshLoading}
          disabled={!isFormValid()}
        />
      </div>
    </div>
  );
}

// --- NewSSHConnectionDialog: Diálogo simple solo para SSH ---
export function NewSSHConnectionDialog({
  visible,
  onHide,
  sshName, setSSHName,
  sshHost, setSSHHost,
  sshUser, setSSHUser,
  sshPassword, setSSHPassword,
  sshPort, setSSHPort,
  sshRemoteFolder, setSSHRemoteFolder,
  sshTargetFolder, setSSHTargetFolder,
  sshAutoCopyPassword = false, setSSHAutoCopyPassword = () => {},
  foldersOptions = [],
  onSSHConfirm,
  sshLoading = false
}) {
  return (
    <Dialog
      header="Nueva Conexión SSH"
      visible={visible}
      style={{ width: '90vw', maxWidth: '1200px', height: '90vh' }}
      modal
      resizable={true}
      onHide={onHide}
      contentStyle={{ padding: '0', overflow: 'auto' }}
      className="new-ssh-connection-dialog"
    >
      <div style={{ marginTop: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <EnhancedSSHForm
          activeTabIndex={0}
          sshName={sshName}
          setSSHName={setSSHName}
          sshHost={sshHost}
          setSSHHost={setSSHHost}
          sshUser={sshUser}
          setSSHUser={setSSHUser}
          sshPassword={sshPassword}
          setSSHPassword={setSSHPassword}
          sshPort={sshPort}
          setSSHPort={setSSHPort}
          sshRemoteFolder={sshRemoteFolder}
          setSSHRemoteFolder={setSSHRemoteFolder}
          sshTargetFolder={sshTargetFolder}
          setSSHTargetFolder={setSSHTargetFolder}
          sshAutoCopyPassword={sshAutoCopyPassword}
          setSSHAutoCopyPassword={setSSHAutoCopyPassword}
          foldersOptions={foldersOptions}
          onSSHConfirm={onSSHConfirm}
          onHide={onHide}
          sshLoading={sshLoading}
        />
      </div>
    </Dialog>
  );
}

// --- NewRDPConnectionDialog: Diálogo simple solo para RDP ---
export function NewRDPConnectionDialog({
  visible,
  onHide,
  onSaveToSidebar
}) {
  const [formData, setFormData] = useState({
    name: '',
    server: '',
    username: '',
    password: '',
    port: 3389,
    clientType: 'guacamole',
    preset: 'default',
    resolution: '1600x1000',
    colorDepth: 32,
    redirectFolders: true,
    redirectClipboard: true,
    redirectPrinters: false,
    redirectAudio: false,
    fullscreen: false,
    smartSizing: true,
    span: false,
    admin: false,
    public: false,
    autoResize: true,
    guacDpi: 96,
    guacSecurity: 'any',
    guacEnableWallpaper: true,
    guacEnableDrive: false,
    guacDriveHostDir: '',
    guacEnableGfx: false,
    guacEnableDesktopComposition: false,
    guacEnableFontSmoothing: false,
    guacEnableTheming: false,
    guacEnableFullWindowDrag: false,
    guacEnableMenuAnimations: false,
    guacDisableGlyphCaching: false,
    guacDisableOffscreenCaching: false,
    guacDisableBitmapCaching: false,
    guacDisableCopyRect: false
  });

  const [showRdpPassword, setShowRdpPassword] = useState(false);

  // Resetear formulario al cerrar
  useEffect(() => {
    if (!visible) {
      setFormData({
        name: '',
        server: '',
        username: '',
        password: '',
        port: 3389,
        clientType: 'guacamole',
        preset: 'default',
        resolution: '1600x1000',
        colorDepth: 32,
        redirectFolders: true,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: false,
        fullscreen: false,
        smartSizing: true,
        span: false,
        admin: false,
        public: false,
        autoResize: true,
        guacDpi: 96,
        guacSecurity: 'any',
        guacEnableWallpaper: true,
        guacEnableDrive: false,
        guacDriveHostDir: '',
        guacEnableGfx: false,
        guacEnableDesktopComposition: false,
        guacEnableFontSmoothing: false,
        guacEnableTheming: false,
        guacEnableFullWindowDrag: false,
        guacEnableMenuAnimations: false,
        guacDisableGlyphCaching: false,
        guacDisableOffscreenCaching: false,
        guacDisableBitmapCaching: false,
        guacDisableCopyRect: false
      });
    }
  }, [visible]);

  const handleTextChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.checked }));
  };

  const handleSelectFolder = async () => {
    try {
      const { dialog } = window.require('electron').remote || window.require('@electron/remote');
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      if (!result.canceled && result.filePaths.length > 0) {
        setFormData(prev => ({ ...prev, guacDriveHostDir: result.filePaths[0] }));
      }
    } catch (error) {
      console.error('Error al seleccionar carpeta:', error);
    }
  };

  return (
    <Dialog
      header="Nueva Conexión RDP"
      visible={visible}
      style={{ width: '90vw', maxWidth: '1200px', height: '90vh' }}
      modal
      resizable={true}
      onHide={onHide}
      contentStyle={{ padding: '0', overflow: 'auto' }}
      className="new-rdp-connection-dialog"
    >
      <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            
            {/* --- COLUMNA IZQUIERDA: Conexión --- */}
            <div style={{ flex: '1', minWidth: '320px' }}>
              <Card title="🔗 Conexión" className="mb-2">
                <div className="formgrid grid">
                  <div className="field col-12">
                    <label htmlFor="rdp-name">Nombre *</label>
                    <InputText
                      id="rdp-name"
                      value={formData.name}
                      onChange={handleTextChange('name')}
                      placeholder="Nombre descriptivo"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-8">
                    <label htmlFor="rdp-server">Servidor *</label>
                    <InputText
                      id="rdp-server"
                      value={formData.server}
                      onChange={handleTextChange('server')}
                      placeholder="IP o nombre del servidor"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-4">
                    <label htmlFor="rdp-port">Puerto</label>
                    <InputText
                      id="rdp-port"
                      type="number"
                      value={formData.port}
                      onChange={handleTextChange('port')}
                      placeholder="3389"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="rdp-username">Usuario *</label>
                    <InputText
                      id="rdp-username"
                      value={formData.username}
                      onChange={handleTextChange('username')}
                      placeholder="Usuario"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="rdp-password">Contraseña</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="rdp-password"
                        type={showRdpPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleTextChange('password')}
                        placeholder="Contraseña (opcional)"
                        autoComplete="off"
                      />
                      <Button 
                        type="button" 
                        icon={showRdpPassword ? "pi pi-eye-slash" : "pi pi-eye"} 
                        className="p-button-outlined"
                        onClick={() => setShowRdpPassword(!showRdpPassword)}
                        tooltip={showRdpPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        tooltipOptions={{ position: 'top' }}
                      />
                    </div>
                  </div>
                  <div className="field col-12">
                    <label htmlFor="rdp-clientType">💻 Cliente</label>
                    <Dropdown
                      id="rdp-clientType"
                      value={formData.clientType}
                      options={[
                        { label: 'Windows MSTSC', value: 'mstsc' },
                        { label: 'Apache Guacamole', value: 'guacamole' }
                      ]}
                      onChange={(e) => handleInputChange('clientType', e.value)}
                      placeholder="Seleccionar tipo"
                    />
                  </div>
                  {formData.clientType === 'guacamole' && (
                    <div className="field col-12">
                      <label htmlFor="rdp-guacSecurity">🔒 Seguridad</label>
                      <Dropdown
                        id="rdp-guacSecurity"
                        value={formData.guacSecurity}
                        options={[
                          { label: '🛡️ Automático', value: 'any' },
                          { label: '🔐 RDP Estándar', value: 'rdp' },
                          { label: '🔒 TLS', value: 'tls' },
                          { label: '🛡️ Network Level Authentication', value: 'nla' }
                        ]}
                        onChange={(e) => handleInputChange('guacSecurity', e.value)}
                        placeholder="Seleccionar protocolo"
                      />
                      <small>Nivel de seguridad para la conexión RDP</small>
                    </div>
                  )}
                </div>
              </Card>

              {formData.clientType === 'guacamole' && formData.guacEnableDrive && (
                <Card title="📁 Carpeta Compartida" className="mt-3">
                  <div className="field">
                    <label htmlFor="rdp-guacDriveHostDir">Ruta del directorio local</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="rdp-guacDriveHostDir"
                        value={formData.guacDriveHostDir}
                        onChange={handleTextChange('guacDriveHostDir')}
                        placeholder="Ej: C:\Users\TuUsuario\Compartido"
                      />
                      <Button icon="pi pi-folder-open" className="p-button-secondary p-button-outlined" onClick={handleSelectFolder} tooltip="Seleccionar carpeta" />
                    </div>
                    <small className="p-d-block mt-2 text-color-secondary">
                      Esta carpeta estará disponible como una unidad de red dentro de la sesión RDP.
                    </small>
                  </div>
                </Card>
              )}
            </div>

            {/* --- COLUMNA DERECHA: Ajustes de Sesión --- */}
            <div style={{ flex: '1.5', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <Card title="🖥️ Pantalla">
                <div className="formgrid grid">
                  <div className="field col-6">
                    <label htmlFor="rdp-preset">Preset</label>
                    <Dropdown
                      id="rdp-preset"
                      value={formData.preset}
                      options={[
                        { label: 'Por defecto', value: 'default' },
                        { label: 'Rendimiento', value: 'performance' },
                        { label: 'Calidad', value: 'quality' }
                      ]}
                      onChange={(e) => handleInputChange('preset', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="rdp-resolution">Resolución</label>
                    <Dropdown
                      id="rdp-resolution"
                      value={formData.resolution}
                      options={[
                        { label: 'Pantalla completa', value: 'fullscreen' },
                        { label: '1920x1080', value: '1920x1080' },
                        { label: '1600x1000', value: '1600x1000' },
                        { label: '1366x768', value: '1366x768' },
                        { label: '1024x768', value: '1024x768' }
                      ]}
                      onChange={(e) => handleInputChange('resolution', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="rdp-colorDepth">Color</label>
                    <Dropdown
                      id="rdp-colorDepth"
                      value={formData.colorDepth}
                      options={[
                        { label: '32 bits', value: 32 },
                        { label: '24 bits', value: 24 },
                        { label: '16 bits', value: 16 },
                        { label: '15 bits', value: 15 }
                      ]}
                      onChange={(e) => handleInputChange('colorDepth', e.value)}
                    />
                  </div>
                  <div className="field col-6">
                    <label htmlFor="rdp-guacDpi">DPI</label>
                    <InputText
                      id="rdp-guacDpi"
                      value={formData.guacDpi}
                      onChange={handleTextChange('guacDpi')}
                      placeholder="96"
                    />
                  </div>
                </div>
              </Card>

              <Card title="⚙️ Opciones">
                <div className="formgrid grid">
                  {formData.clientType === 'mstsc' && (
                    <>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectClipboard" checked={formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} /><label htmlFor="mstsc-redirectClipboard">📋 Portapapeles</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectAudio" checked={formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} /><label htmlFor="mstsc-redirectAudio">🔊 Audio</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectPrinters" checked={formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} /><label htmlFor="mstsc-redirectPrinters">🖨️ Impresoras</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectFolders" checked={formData.redirectFolders} onChange={handleCheckboxChange('redirectFolders')} /><label htmlFor="mstsc-redirectFolders">📁 Carpetas</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-smartSizing" checked={formData.smartSizing} onChange={handleCheckboxChange('smartSizing')} /><label htmlFor="mstsc-smartSizing">📐 Ajuste automático</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-fullscreen" checked={formData.fullscreen} onChange={handleCheckboxChange('fullscreen')} /><label htmlFor="mstsc-fullscreen">🖥️ Pantalla completa</label></div>
                    </>
                  )}
                  {formData.clientType === 'guacamole' && (
                    <>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectClipboard" checked={formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} /><label htmlFor="guac-redirectClipboard">📋 Portapapeles</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectAudio" checked={formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} /><label htmlFor="guac-redirectAudio">🔊 Audio</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-enableDrive" checked={formData.guacEnableDrive} onChange={handleCheckboxChange('guacEnableDrive')} /><label htmlFor="guac-enableDrive">💾 Carpetas (NodeTerm Drive)</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-autoResize" checked={formData.autoResize} onChange={handleCheckboxChange('autoResize')} /><label htmlFor="guac-autoResize">📐 Ajuste automático</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-enableWallpaper" checked={formData.guacEnableWallpaper} onChange={handleCheckboxChange('guacEnableWallpaper')} /><label htmlFor="guac-enableWallpaper">🖼️ Mostrar fondo</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectPrinters" checked={formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} /><label htmlFor="guac-redirectPrinters">🖨️ Impresoras</label></div>
                    </>
                  )}
                </div>

                {formData.clientType === 'guacamole' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                    <Fieldset legend="⚙️ Opciones Avanzadas" toggleable collapsed>
                      <div className="formgrid grid">
                        <div className="col-4">
                          <h5>Rendimiento</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-gfx" checked={formData.guacEnableGfx} onChange={handleCheckboxChange('guacEnableGfx')} /><label htmlFor="guac-gfx">🎨 Habilitar GFX</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-composition" checked={formData.guacEnableDesktopComposition} onChange={handleCheckboxChange('guacEnableDesktopComposition')} /><label htmlFor="guac-composition">🖼️ Desktop Composition</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-font" checked={formData.guacEnableFontSmoothing} onChange={handleCheckboxChange('guacEnableFontSmoothing')} /><label htmlFor="guac-font">✨ Font Smoothing</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-theming" checked={formData.guacEnableTheming} onChange={handleCheckboxChange('guacEnableTheming')} /><label htmlFor="guac-theming">🎭 Theming</label></div>
                        </div>
                        <div className="col-4">
                          <h5>Interfaz</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-drag" checked={formData.guacEnableFullWindowDrag} onChange={handleCheckboxChange('guacEnableFullWindowDrag')} /><label htmlFor="guac-drag">🖱️ Full Window Drag</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-menu" checked={formData.guacEnableMenuAnimations} onChange={handleCheckboxChange('guacEnableMenuAnimations')} /><label htmlFor="guac-menu">🎬 Animaciones de menú</label></div>
                        </div>
                        <div className="col-4">
                          <h5>Caché</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-glyph-cache" checked={!formData.guacDisableGlyphCaching} onChange={(e) => handleInputChange('guacDisableGlyphCaching', !e.checked)} /><label htmlFor="guac-glyph-cache">🔤 Glyph Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-offscreen-cache" checked={!formData.guacDisableOffscreenCaching} onChange={(e) => handleInputChange('guacDisableOffscreenCaching', !e.checked)} /><label htmlFor="guac-offscreen-cache">📱 Offscreen Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-bitmap-cache" checked={!formData.guacDisableBitmapCaching} onChange={(e) => handleInputChange('guacDisableBitmapCaching', !e.checked)} /><label htmlFor="guac-bitmap-cache">🖼️ Bitmap Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-copy-rect" checked={!formData.guacDisableCopyRect} onChange={(e) => handleInputChange('guacDisableCopyRect', !e.checked)} /><label htmlFor="guac-copy-rect">📋 Copy-Rect</label></div>
                        </div>
                      </div>
                    </Fieldset>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
        
        <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 0, justifyContent: 'flex-end', paddingTop: '12px' }}>
          <Button 
            label="Cancelar" 
            icon="pi pi-times" 
            className="p-button-text" 
            onClick={onHide}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          />
          <Button 
            label="Crear Conexión" 
            icon="pi pi-check" 
            className="p-button-primary" 
            onClick={() => {
              if (!formData.name?.trim() || !formData.server?.trim() || !formData.username?.trim()) {
                return;
              }
              console.log('Crear conexión RDP con datos:', formData);
              onSaveToSidebar && onSaveToSidebar(formData, false, null);
              onHide();
            }}
            disabled={!formData.name?.trim() || !formData.server?.trim() || !formData.username?.trim()}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          />
        </div>
      </div>
    </Dialog>
  );
}

// --- ProtocolSelectionDialog: diálogo de selección de protocolo con cards ---
export function ProtocolSelectionDialog({
  visible,
  onHide,
  onSelectProtocol // Callback: (protocol) => void
}) {
  const protocols = [
    {
      id: 'ssh',
      name: 'SSH',
      description: 'Conexión segura para terminal remoto y transferencia de archivos',
      icon: 'pi pi-terminal',
      color: '#2196F3'
    },
    {
      id: 'rdp',
      name: 'RDP',
      description: 'Escritorio remoto de Windows con soporte completo de sesiones',
      icon: 'pi pi-desktop',
      color: '#4CAF50'
    },
    {
      id: 'sftp',
      name: 'SFTP',
      description: 'Transferencia segura de archivos mediante SSH',
      icon: 'pi pi-folder-open',
      color: '#FF9800'
    },
    {
      id: 'ftp',
      name: 'FTP',
      description: 'Protocolo de transferencia de archivos estándar',
      icon: 'pi pi-cloud-upload',
      color: '#9C27B0'
    },
    {
      id: 'scp',
      name: 'SCP',
      description: 'Copia segura de archivos mediante SSH',
      icon: 'pi pi-copy',
      color: '#00BCD4'
    }
  ];

  const handleProtocolSelect = (protocolId) => {
    if (onSelectProtocol) {
      onSelectProtocol(protocolId);
    }
    onHide();
  };

  return (
    <Dialog
      header="Seleccionar Tipo de Conexión"
      visible={visible}
      onHide={onHide}
      style={{ width: '90vw', maxWidth: '900px' }}
      modal
      className="protocol-selection-dialog"
    >
      <div className="protocol-selection-container">
        {/* Header */}
        <div className="protocol-selection-header">
          <h3 className="protocol-selection-title">
            <span className="protocol-selection-icon">
              <i className="pi pi-sitemap"></i>
            </span>
            Crear Nueva Conexión
          </h3>
          <p className="protocol-selection-description">
            Selecciona el tipo de conexión que deseas crear
          </p>
        </div>

        {/* Grid de protocolos */}
        <div className="protocol-selection-grid">
          {protocols.map((protocol) => (
            <div
              key={protocol.id}
              className="protocol-card"
              onClick={() => handleProtocolSelect(protocol.id)}
            >
              <div className="protocol-card-content">
                <div 
                  className="protocol-card-icon"
                  style={{ background: protocol.color }}
                >
                  <i className={protocol.icon}></i>
                </div>
                <div className="protocol-card-info">
                  <h4 className="protocol-card-name">{protocol.name}</h4>
                  <p className="protocol-card-description">{protocol.description}</p>
                </div>
                <div className="protocol-card-arrow">
                  <i className="pi pi-chevron-right"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

 