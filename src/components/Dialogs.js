import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Card } from 'primereact/card';
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

// --- EditSSHConnectionDialog: Diálogo independiente para editar conexiones SSH ---
export function EditSSHConnectionDialog({
  visible,
  onHide,
  editNodeData,
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
  // Precargar datos cuando se abre el diálogo
  useEffect(() => {
    if (editNodeData && visible) {
      if (setSSHName) setSSHName(editNodeData.label || '');
      if (setSSHHost) setSSHHost(editNodeData.data?.bastionHost || editNodeData.data?.host || '');
      if (setSSHUser) setSSHUser(editNodeData.data?.useBastionWallix ? editNodeData.data?.bastionUser || '' : editNodeData.data?.user || '');
      if (setSSHPassword) setSSHPassword(editNodeData.data?.password || '');
      if (setSSHRemoteFolder) setSSHRemoteFolder(editNodeData.data?.remoteFolder || '');
      if (setSSHPort) setSSHPort(editNodeData.data?.port || 22);
      if (setSSHAutoCopyPassword && typeof setSSHAutoCopyPassword === 'function') {
        setSSHAutoCopyPassword(editNodeData.data?.autoCopyPassword || false);
      }
    }
  }, [editNodeData, visible, setSSHName, setSSHHost, setSSHUser, setSSHPassword, setSSHRemoteFolder, setSSHPort, setSSHAutoCopyPassword]);

  return (
    <Dialog
      header="Editar Conexión SSH"
      visible={visible}
      style={{ width: '90vw', maxWidth: '1200px', height: '90vh' }}
      modal
      resizable={true}
      onHide={onHide}
      contentStyle={{ padding: '0', overflow: 'auto' }}
      className="edit-ssh-connection-dialog"
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

// --- EditRDPConnectionDialog: Diálogo independiente para editar conexiones RDP ---
export function EditRDPConnectionDialog({
  visible,
  onHide,
  editNodeData,
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

  // Precargar datos cuando se abre el diálogo
  useEffect(() => {
    if (editNodeData && visible) {
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
        autoResize: data.autoResize !== false,
        guacDpi: data.guacDpi || 96,
        guacSecurity: data.guacSecurity || 'any',
        guacEnableWallpaper: data.guacEnableWallpaper || false,
        guacEnableDrive: data.guacEnableDrive || false,
        guacDriveHostDir: data.guacDriveHostDir || '',
        guacEnableGfx: data.guacEnableGfx || false,
        guacEnableDesktopComposition: data.guacEnableDesktopComposition || false,
        guacEnableFontSmoothing: data.guacEnableFontSmoothing || false,
        guacEnableTheming: data.guacEnableTheming || false,
        guacEnableFullWindowDrag: data.guacEnableFullWindowDrag || false,
        guacEnableMenuAnimations: data.guacEnableMenuAnimations || false,
        guacDisableGlyphCaching: data.guacDisableGlyphCaching || false,
        guacDisableOffscreenCaching: data.guacDisableOffscreenCaching || false,
        guacDisableBitmapCaching: data.guacDisableBitmapCaching || false,
        guacDisableCopyRect: data.guacDisableCopyRect || false
      });
    }
  }, [editNodeData, visible]);

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
      setShowRdpPassword(false);
    }
  }, [visible]);

  const handleTextChange = useCallback((field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCheckboxChange = useCallback((field) => (e) => {
    // PrimeReact Checkbox pasa el estado en e.checked (boolean)
    const newValue = !!e.checked; // Asegurar que sea boolean
    console.log(`[EditRDP] Checkbox ${field} cambiado:`, { 
      checked: e.checked, 
      newValue,
      currentState: formData[field]
    });
    
    setFormData(prev => {
      const updated = { ...prev, [field]: newValue };
      console.log(`[EditRDP] Estado actualizado:`, { field, oldValue: prev[field], newValue: updated[field] });
      return updated;
    });
  }, [formData]);

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

  const isFormValid = useMemo(() => {
    return formData.name.trim() !== '' && formData.server.trim() !== '' && formData.username.trim() !== '';
  }, [formData]);

  return (
    <Dialog
      header="Editar Conexión RDP"
      visible={visible}
      onHide={onHide}
      style={{ width: '90vw', maxWidth: '1200px', height: '90vh' }}
      modal
      resizable={true}
      contentStyle={{ padding: '0', overflow: 'auto' }}
      className="edit-rdp-connection-dialog"
    >
      <div className="p-fluid" style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* --- COLUMNA IZQUIERDA: Conexión --- */}
            <div style={{ flex: '1', minWidth: '320px' }}>
              <Card title="🔗 Conexión" className="mb-2">
                <div className="formgrid grid">
                  <div className="field col-12">
                    <label htmlFor="name-edit-rdp">Nombre *</label>
                    <InputText
                      id="name-edit-rdp"
                      value={formData.name}
                      onChange={handleTextChange('name')}
                      placeholder="Nombre descriptivo"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-8">
                    <label htmlFor="server-edit-rdp">Servidor *</label>
                    <InputText
                      id="server-edit-rdp"
                      value={formData.server}
                      onChange={handleTextChange('server')}
                      placeholder="IP o nombre del servidor"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-4">
                    <label htmlFor="port-edit-rdp">Puerto</label>
                    <InputText
                      id="port-edit-rdp"
                      type="number"
                      value={formData.port}
                      onChange={handleTextChange('port')}
                      placeholder="3389"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="username-edit-rdp">Usuario *</label>
                    <InputText
                      id="username-edit-rdp"
                      value={formData.username}
                      onChange={handleTextChange('username')}
                      placeholder="Usuario"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="password-edit-rdp">Contraseña</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="password-edit-rdp"
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
                    <label htmlFor="clientType-edit-rdp">💻 Cliente</label>
                    <Dropdown
                      id="clientType-edit-rdp"
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
                      <label htmlFor="guacSecurity-edit-rdp">🔒 Seguridad</label>
                      <Dropdown
                        id="guacSecurity-edit-rdp"
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
                    <label htmlFor="guacDriveHostDir-edit-rdp">Ruta del directorio local</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="guacDriveHostDir-edit-rdp"
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
                    <label htmlFor="preset-edit-rdp">Preset</label>
                    <Dropdown
                      id="preset-edit-rdp"
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
                    <label htmlFor="resolution-edit-rdp">Resolución</label>
                    <Dropdown
                      id="resolution-edit-rdp"
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
                    <label htmlFor="colorDepth-edit-rdp">Color</label>
                    <Dropdown
                      id="colorDepth-edit-rdp"
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
                    <label htmlFor="guacDpi-edit-rdp">DPI</label>
                    <InputText
                      id="guacDpi-edit-rdp"
                      value={formData.guacDpi}
                      onChange={handleTextChange('guacDpi')}
                      placeholder="96"
                    />
                  </div>
                </div>
              </Card>

              {/* Card: Opciones */}
              <Card title="⚙️ Opciones">
                <div className="formgrid grid">
                  {/* Opciones para MSTSC */}
                  {formData.clientType === 'mstsc' && (
                    <>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectClipboard-edit-rdp" checked={formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} /><label htmlFor="mstsc-redirectClipboard-edit-rdp">📋 Portapapeles</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectAudio-edit-rdp" checked={formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} /><label htmlFor="mstsc-redirectAudio-edit-rdp">🔊 Audio</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectPrinters-edit-rdp" checked={formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} /><label htmlFor="mstsc-redirectPrinters-edit-rdp">🖨️ Impresoras</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectFolders-edit-rdp" checked={formData.redirectFolders} onChange={handleCheckboxChange('redirectFolders')} /><label htmlFor="mstsc-redirectFolders-edit-rdp">📁 Carpetas</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-smartSizing-edit-rdp" checked={formData.smartSizing} onChange={handleCheckboxChange('smartSizing')} /><label htmlFor="mstsc-smartSizing-edit-rdp">📐 Ajuste automático</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-fullscreen-edit-rdp" checked={formData.fullscreen} onChange={handleCheckboxChange('fullscreen')} /><label htmlFor="mstsc-fullscreen-edit-rdp">🖥️ Pantalla completa</label></div>
                    </>
                  )}
                  {/* Opciones para Guacamole */}
                  {formData.clientType === 'guacamole' && (
                    <>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectClipboard-edit-rdp" checked={!!formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} key={`clipboard-${formData.redirectClipboard}`} /><label htmlFor="guac-redirectClipboard-edit-rdp">📋 Portapapeles</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectAudio-edit-rdp" checked={!!formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} key={`audio-${formData.redirectAudio}`} /><label htmlFor="guac-redirectAudio-edit-rdp">🔊 Audio</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-enableDrive-edit-rdp" checked={!!formData.guacEnableDrive} onChange={handleCheckboxChange('guacEnableDrive')} key={`drive-${formData.guacEnableDrive}`} /><label htmlFor="guac-enableDrive-edit-rdp">💾 Carpetas (NodeTerm Drive)</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-autoResize-edit-rdp" checked={!!formData.autoResize} onChange={handleCheckboxChange('autoResize')} key={`resize-${formData.autoResize}`} /><label htmlFor="guac-autoResize-edit-rdp">📐 Ajuste automático</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-enableWallpaper-edit-rdp" checked={!!formData.guacEnableWallpaper} onChange={handleCheckboxChange('guacEnableWallpaper')} key={`wallpaper-${formData.guacEnableWallpaper}`} /><label htmlFor="guac-enableWallpaper-edit-rdp">🖼️ Mostrar fondo</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectPrinters-edit-rdp" checked={!!formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} key={`printers-${formData.redirectPrinters}`} /><label htmlFor="guac-redirectPrinters-edit-rdp">🖨️ Impresoras</label></div>
                    </>
                  )}
                </div>

                {/* Fieldset: Opciones Avanzadas */}
                {formData.clientType === 'guacamole' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                    <Fieldset legend="⚙️ Opciones Avanzadas" toggleable collapsed className="advanced-fieldset">
                      <div className="formgrid grid">
                        <div className="col-4">
                          <h5>Rendimiento</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-gfx-edit-rdp" checked={!!formData.guacEnableGfx} onChange={handleCheckboxChange('guacEnableGfx')} key={`gfx-${formData.guacEnableGfx}`} /><label htmlFor="guac-gfx-edit-rdp">🎨 Habilitar GFX</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-composition-edit-rdp" checked={!!formData.guacEnableDesktopComposition} onChange={handleCheckboxChange('guacEnableDesktopComposition')} key={`composition-${formData.guacEnableDesktopComposition}`} /><label htmlFor="guac-composition-edit-rdp">🖼️ Desktop Composition</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-font-edit-rdp" checked={!!formData.guacEnableFontSmoothing} onChange={handleCheckboxChange('guacEnableFontSmoothing')} key={`font-${formData.guacEnableFontSmoothing}`} /><label htmlFor="guac-font-edit-rdp">✨ Font Smoothing</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-theming-edit-rdp" checked={!!formData.guacEnableTheming} onChange={handleCheckboxChange('guacEnableTheming')} key={`theming-${formData.guacEnableTheming}`} /><label htmlFor="guac-theming-edit-rdp">🎭 Theming</label></div>
                        </div>
                        <div className="col-4">
                          <h5>Interfaz</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-drag-edit-rdp" checked={!!formData.guacEnableFullWindowDrag} onChange={handleCheckboxChange('guacEnableFullWindowDrag')} key={`drag-${formData.guacEnableFullWindowDrag}`} /><label htmlFor="guac-drag-edit-rdp">🖱️ Full Window Drag</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-menu-edit-rdp" checked={!!formData.guacEnableMenuAnimations} onChange={handleCheckboxChange('guacEnableMenuAnimations')} key={`menu-${formData.guacEnableMenuAnimations}`} /><label htmlFor="guac-menu-edit-rdp">🎬 Animaciones de menú</label></div>
                        </div>
                        <div className="col-4">
                          <h5>Caché</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-glyph-cache-edit-rdp" checked={!!(!formData.guacDisableGlyphCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableGlyphCaching', !newValue); }} key={`glyph-${!formData.guacDisableGlyphCaching}`} /><label htmlFor="guac-glyph-cache-edit-rdp">🔤 Glyph Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-offscreen-cache-edit-rdp" checked={!!(!formData.guacDisableOffscreenCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableOffscreenCaching', !newValue); }} key={`offscreen-${!formData.guacDisableOffscreenCaching}`} /><label htmlFor="guac-offscreen-cache-edit-rdp">📱 Offscreen Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-bitmap-cache-edit-rdp" checked={!!(!formData.guacDisableBitmapCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableBitmapCaching', !newValue); }} key={`bitmap-${!formData.guacDisableBitmapCaching}`} /><label htmlFor="guac-bitmap-cache-edit-rdp">🖼️ Bitmap Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-copy-rect-edit-rdp" checked={!!(!formData.guacDisableCopyRect)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableCopyRect', !newValue); }} key={`copyrect-${!formData.guacDisableCopyRect}`} /><label htmlFor="guac-copy-rect-edit-rdp">📋 Copy-Rect</label></div>
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
              onHide();
            }}
            disabled={!isFormValid}
            style={{ fontSize: '13px', padding: '8px 16px' }}
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
  onGoBack,
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

        <div className="flex justify-content-between gap-2 mt-3" style={{ borderTop: '1px solid #e9ecef', paddingTop: '12px' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {onGoBack && (
              <Button
                label="Volver"
                icon="pi pi-arrow-left"
                className="p-button-text"
                onClick={onGoBack}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
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
      </div>
    </Dialog>
  );
}

// UnifiedConnectionDialog ELIMINADO - Ahora se usan diálogos independientes:
// - EditSSHConnectionDialog para editar SSH
// - EditRDPConnectionDialog para editar RDP  
// - FileConnectionDialog para editar/crear File connections

function PasswordCreateForm({ foldersOptions = [], onCreate }) {
  const [title, setTitle] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [group, setGroup] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [targetFolder, setTargetFolder] = React.useState(null);
  const [showPassword, setShowPassword] = React.useState('');

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
          <label htmlFor="pwdFolder">Carpeta</label>
          <Dropdown
            id="pwdFolder"
            value={targetFolder}
            options={foldersOptions}
            onChange={(e) => setTargetFolder(e.value)}
            placeholder="Seleccionar carpeta"
            optionLabel="label"
            optionValue="key"
          />
        </div>
        <div className="field col-12">
          <label htmlFor="pwdNotes">Notas</label>
          <InputTextarea id="pwdNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </div>
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <Button
          label="Crear"
          icon="pi pi-plus"
          onClick={() => {
            if (canCreate && onCreate) {
              onCreate({
                title,
                username,
                password,
                url,
                group,
                notes,
                targetFolder
              });
            }
          }}
          disabled={!canCreate}
          className="p-button-success"
        />
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
  sshAutoCopyPassword = false, setSSHAutoCopyPassword = () => {},
  foldersOptions = [],
  onSSHConfirm,
  onHide,
  onGoBack,
  sshLoading = false
}) {
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'key'
  const [sshPrivateKey, setSSHPrivateKey] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [autoCopyPassword, setAutoCopyPassword] = useState(!!sshAutoCopyPassword);

  // Sincronizar autoCopyPassword con el prop
  useEffect(() => {
    if (sshAutoCopyPassword !== undefined) {
      setAutoCopyPassword(!!sshAutoCopyPassword);
    }
  }, [sshAutoCopyPassword]);

  // Validación del formulario
  const validateForm = useCallback(() => {
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
      errors.password = 'La contraseña es requerida';
    }
    
    if (authMethod === 'key' && !sshPrivateKey?.trim()) {
      errors.privateKey = 'La clave privada es requerida';
    }
    
    return errors;
  }, [sshName, sshHost, sshUser, sshPassword, authMethod, sshPrivateKey]);

  // Handler para enviar el formulario
  const handleSubmit = useCallback((e) => {
    if (e) e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    
    // Preparar datos para enviar
    const connectionData = {
      name: sshName.trim(),
      host: sshHost.trim(),
      user: sshUser.trim(),
      password: authMethod === 'password' ? sshPassword : '',
      port: sshPort || 22,
      remoteFolder: sshRemoteFolder || '',
      targetFolder: sshTargetFolder || '',
      autoCopyPassword: autoCopyPassword,
      authMethod: authMethod,
      privateKey: authMethod === 'key' ? sshPrivateKey : ''
    };
    
    if (onSSHConfirm && typeof onSSHConfirm === 'function') {
      onSSHConfirm(connectionData);
    }
  }, [sshName, sshHost, sshUser, sshPassword, sshPort, sshRemoteFolder, sshTargetFolder, autoCopyPassword, authMethod, sshPrivateKey, validateForm, onSSHConfirm]);

  // Handler para subir archivo de clave privada
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

  // Handler para toggle de autoCopyPassword
  const handleAutoCopyToggle = useCallback((checked) => {
    setAutoCopyPassword(checked);
    if (setSSHAutoCopyPassword && typeof setSSHAutoCopyPassword === 'function') {
      setSSHAutoCopyPassword(checked);
    }
  }, [setSSHAutoCopyPassword]);

  const isFormValid = () => {
    return sshName?.trim() && 
           sshHost?.trim() && 
           sshUser?.trim() &&
           (authMethod === 'password' ? sshPassword?.trim() : sshPrivateKey?.trim());
  };

  // Render del formulario
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
                          placeholder="Contraseña"
                          className={validationErrors.password ? 'p-invalid' : ''}
                        />
                        <Button 
                          type="button" 
                          icon={showPassword ? "pi pi-eye-slash" : "pi pi-eye"} 
                          className="p-button-outlined"
                          onClick={() => setShowPassword(!showPassword)}
                          tooltip={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        />
                      </div>
                      {validationErrors.password && <small className="p-error">{validationErrors.password}</small>}
                    </div>
                    <div className="field col-12">
                      <div className="field-checkbox">
                        <Checkbox 
                          inputId="autoCopyPassword" 
                          checked={autoCopyPassword} 
                          onChange={(e) => handleAutoCopyToggle(e.checked)} 
                        />
                        <label htmlFor="autoCopyPassword">Copiar contraseña automáticamente al portapapeles</label>
                      </div>
                    </div>
                  </>
                )}

                {authMethod === 'key' && (
                  <>
                    <div className="field col-12">
                      <label htmlFor="sshPrivateKey">Clave Privada SSH *</label>
                      <FileUpload
                        mode="basic"
                        name="sshPrivateKey"
                        accept=".pem,.key"
                        maxFileSize={10000000}
                        chooseLabel="Seleccionar archivo de clave"
                        onUpload={handleFileUpload}
                        auto
                        style={{ width: '100%' }}
                      />
                      {sshPrivateKey && (
                        <InputTextarea
                          id="sshPrivateKey"
                          value={sshPrivateKey}
                          onChange={(e) => setSSHPrivateKey(e.target.value)}
                          rows={6}
                          placeholder="O pegar la clave privada aquí"
                          className={validationErrors.privateKey ? 'p-invalid' : ''}
                          style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '12px' }}
                        />
                      )}
                      {validationErrors.privateKey && <small className="p-error">{validationErrors.privateKey}</small>}
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card title="📁 Carpetas">
              <div className="formgrid grid">
                <div className="field col-12">
                  <label htmlFor="sshRemoteFolder">Carpeta remota (opcional)</label>
                  <InputText 
                    id="sshRemoteFolder"
                    value={sshRemoteFolder} 
                    onChange={(e) => setSSHRemoteFolder(e.target.value)}
                    placeholder="/home/usuario"
                  />
                </div>

                <div className="field col-12">
                  <label htmlFor="sshTargetFolder">Carpeta destino (opcional)</label>
                  <Dropdown
                    id="sshTargetFolder"
                    value={sshTargetFolder}
                    options={foldersOptions}
                    onChange={(e) => setSSHTargetFolder(e.value)}
                    placeholder="Seleccionar carpeta local"
                    filter
                    showClear
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 0, justifyContent: 'space-between', paddingTop: '12px' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {onGoBack && (
            <Button 
              label="Volver" 
              icon="pi pi-arrow-left" 
              className="p-button-text" 
              onClick={onGoBack}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
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
            onClick={handleSubmit}
            disabled={!isFormValid()}
            loading={sshLoading}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          />
        </div>
      </div>
    </div>
  );
}

// --- NewSSHConnectionDialog: Diálogo simple solo para SSH ---
export function NewSSHConnectionDialog({
  visible,
  onHide,
  onGoBack,
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
          onGoBack={onGoBack}
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
  onGoBack,
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
    // PrimeReact Checkbox pasa el estado en e.checked (boolean)
    const newValue = !!e.checked; // Asegurar que sea boolean
    console.log(`[NewRDP] Checkbox ${field} cambiado:`, { 
      checked: e.checked, 
      newValue,
      currentState: formData[field]
    });
    
    setFormData(prev => {
      const updated = { ...prev, [field]: newValue };
      console.log(`[NewRDP] Estado actualizado:`, { field, oldValue: prev[field], newValue: updated[field] });
      return updated;
    });
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
      setShowRdpPassword(false);
    }
  }, [visible]);

  const isFormValid = useMemo(() => {
    return formData.name.trim() !== '' && formData.server.trim() !== '' && formData.username.trim() !== '';
  }, [formData]);

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
                    <label htmlFor="name-create-rdp">Nombre *</label>
                    <InputText
                      id="name-create-rdp"
                      value={formData.name}
                      onChange={handleTextChange('name')}
                      placeholder="Nombre descriptivo"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-8">
                    <label htmlFor="server-create-rdp">Servidor *</label>
                    <InputText
                      id="server-create-rdp"
                      value={formData.server}
                      onChange={handleTextChange('server')}
                      placeholder="IP o nombre del servidor"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-4">
                    <label htmlFor="port-create-rdp">Puerto</label>
                    <InputText
                      id="port-create-rdp"
                      type="number"
                      value={formData.port}
                      onChange={handleTextChange('port')}
                      placeholder="3389"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="username-create-rdp">Usuario *</label>
                    <InputText
                      id="username-create-rdp"
                      value={formData.username}
                      onChange={handleTextChange('username')}
                      placeholder="Usuario"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field col-12">
                    <label htmlFor="password-create-rdp">Contraseña</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="password-create-rdp"
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
                    <label htmlFor="clientType-create-rdp">💻 Cliente</label>
                    <Dropdown
                      id="clientType-create-rdp"
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
                      <label htmlFor="guacSecurity-create-rdp">🔒 Seguridad</label>
                      <Dropdown
                        id="guacSecurity-create-rdp"
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
                    <label htmlFor="guacDriveHostDir-create-rdp">Ruta del directorio local</label>
                    <div className="p-inputgroup">
                      <InputText
                        id="guacDriveHostDir-create-rdp"
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
                    <label htmlFor="preset-create-rdp">Preset</label>
                    <Dropdown
                      id="preset-create-rdp"
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
                    <label htmlFor="resolution-create-rdp">Resolución</label>
                    <Dropdown
                      id="resolution-create-rdp"
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
                    <label htmlFor="colorDepth-create-rdp">Color</label>
                    <Dropdown
                      id="colorDepth-create-rdp"
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
                    <label htmlFor="guacDpi-create-rdp">DPI</label>
                    <InputText
                      id="guacDpi-create-rdp"
                      value={formData.guacDpi}
                      onChange={handleTextChange('guacDpi')}
                      placeholder="96"
                    />
                  </div>
                </div>
              </Card>

              {/* Card: Opciones */}
              <Card title="⚙️ Opciones">
                <div className="formgrid grid">
                  {/* Opciones para MSTSC */}
                  {formData.clientType === 'mstsc' && (
                    <>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectClipboard-create-rdp" checked={formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} /><label htmlFor="mstsc-redirectClipboard-create-rdp">📋 Portapapeles</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectAudio-create-rdp" checked={formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} /><label htmlFor="mstsc-redirectAudio-create-rdp">🔊 Audio</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectPrinters-create-rdp" checked={formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} /><label htmlFor="mstsc-redirectPrinters-create-rdp">🖨️ Impresoras</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-redirectFolders-create-rdp" checked={formData.redirectFolders} onChange={handleCheckboxChange('redirectFolders')} /><label htmlFor="mstsc-redirectFolders-create-rdp">📁 Carpetas</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-smartSizing-create-rdp" checked={formData.smartSizing} onChange={handleCheckboxChange('smartSizing')} /><label htmlFor="mstsc-smartSizing-create-rdp">📐 Ajuste automático</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="mstsc-fullscreen-create-rdp" checked={formData.fullscreen} onChange={handleCheckboxChange('fullscreen')} /><label htmlFor="mstsc-fullscreen-create-rdp">🖥️ Pantalla completa</label></div>
                    </>
                  )}
                  {/* Opciones para Guacamole */}
                  {formData.clientType === 'guacamole' && (
                    <>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectClipboard-create-rdp" checked={!!formData.redirectClipboard} onChange={handleCheckboxChange('redirectClipboard')} key={`clipboard-create-${formData.redirectClipboard}`} /><label htmlFor="guac-redirectClipboard-create-rdp">📋 Portapapeles</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectAudio-create-rdp" checked={!!formData.redirectAudio} onChange={handleCheckboxChange('redirectAudio')} key={`audio-create-${formData.redirectAudio}`} /><label htmlFor="guac-redirectAudio-create-rdp">🔊 Audio</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-enableDrive-create-rdp" checked={!!formData.guacEnableDrive} onChange={handleCheckboxChange('guacEnableDrive')} key={`drive-create-${formData.guacEnableDrive}`} /><label htmlFor="guac-enableDrive-create-rdp">💾 Carpetas (NodeTerm Drive)</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-autoResize-create-rdp" checked={!!formData.autoResize} onChange={handleCheckboxChange('autoResize')} key={`resize-create-${formData.autoResize}`} /><label htmlFor="guac-autoResize-create-rdp">📐 Ajuste automático</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-enableWallpaper-create-rdp" checked={!!formData.guacEnableWallpaper} onChange={handleCheckboxChange('guacEnableWallpaper')} key={`wallpaper-create-${formData.guacEnableWallpaper}`} /><label htmlFor="guac-enableWallpaper-create-rdp">🖼️ Mostrar fondo</label></div>
                      <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectPrinters-create-rdp" checked={!!formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} key={`printers-create-${formData.redirectPrinters}`} /><label htmlFor="guac-redirectPrinters-create-rdp">🖨️ Impresoras</label></div>
                    </>
                  )}
                </div>

                {/* Fieldset: Opciones Avanzadas */}
                {formData.clientType === 'guacamole' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                    <Fieldset legend="⚙️ Opciones Avanzadas" toggleable collapsed className="advanced-fieldset">
                      <div className="formgrid grid">
                        <div className="col-4">
                          <h5>Rendimiento</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-gfx-create-rdp" checked={!!formData.guacEnableGfx} onChange={handleCheckboxChange('guacEnableGfx')} key={`gfx-create-${formData.guacEnableGfx}`} /><label htmlFor="guac-gfx-create-rdp">🎨 Habilitar GFX</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-composition-create-rdp" checked={!!formData.guacEnableDesktopComposition} onChange={handleCheckboxChange('guacEnableDesktopComposition')} key={`composition-create-${formData.guacEnableDesktopComposition}`} /><label htmlFor="guac-composition-create-rdp">🖼️ Desktop Composition</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-font-create-rdp" checked={!!formData.guacEnableFontSmoothing} onChange={handleCheckboxChange('guacEnableFontSmoothing')} key={`font-create-${formData.guacEnableFontSmoothing}`} /><label htmlFor="guac-font-create-rdp">✨ Font Smoothing</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-theming-create-rdp" checked={!!formData.guacEnableTheming} onChange={handleCheckboxChange('guacEnableTheming')} key={`theming-create-${formData.guacEnableTheming}`} /><label htmlFor="guac-theming-create-rdp">🎭 Theming</label></div>
                        </div>
                        <div className="col-4">
                          <h5>Interfaz</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-drag-create-rdp" checked={!!formData.guacEnableFullWindowDrag} onChange={handleCheckboxChange('guacEnableFullWindowDrag')} key={`drag-create-${formData.guacEnableFullWindowDrag}`} /><label htmlFor="guac-drag-create-rdp">🖱️ Full Window Drag</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-menu-create-rdp" checked={!!formData.guacEnableMenuAnimations} onChange={handleCheckboxChange('guacEnableMenuAnimations')} key={`menu-create-${formData.guacEnableMenuAnimations}`} /><label htmlFor="guac-menu-create-rdp">🎬 Animaciones de menú</label></div>
                        </div>
                        <div className="col-4">
                          <h5>Caché</h5>
                          <div className="field-checkbox"><Checkbox inputId="guac-glyph-cache-create-rdp" checked={!!(!formData.guacDisableGlyphCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableGlyphCaching', !newValue); }} key={`glyph-create-${!formData.guacDisableGlyphCaching}`} /><label htmlFor="guac-glyph-cache-create-rdp">🔤 Glyph Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-offscreen-cache-create-rdp" checked={!!(!formData.guacDisableOffscreenCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableOffscreenCaching', !newValue); }} key={`offscreen-create-${!formData.guacDisableOffscreenCaching}`} /><label htmlFor="guac-offscreen-cache-create-rdp">📱 Offscreen Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-bitmap-cache-create-rdp" checked={!!(!formData.guacDisableBitmapCaching)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableBitmapCaching', !newValue); }} key={`bitmap-create-${!formData.guacDisableBitmapCaching}`} /><label htmlFor="guac-bitmap-cache-create-rdp">🖼️ Bitmap Caching</label></div>
                          <div className="field-checkbox"><Checkbox inputId="guac-copy-rect-create-rdp" checked={!!(!formData.guacDisableCopyRect)} onChange={(e) => { const newValue = !!e.checked; handleInputChange('guacDisableCopyRect', !newValue); }} key={`copyrect-create-${!formData.guacDisableCopyRect}`} /><label htmlFor="guac-copy-rect-create-rdp">📋 Copy-Rect</label></div>
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
        <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 0, justifyContent: 'space-between', paddingTop: '12px' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {onGoBack && (
              <Button
                label="Volver"
                icon="pi pi-arrow-left"
                className="p-button-text"
                onClick={onGoBack}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
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
              disabled={!isFormValid}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// Código residual eliminado - las funciones NewRDPConnectionDialog duplicadas fueron removidas

// Código residual del UnifiedConnectionDialog eliminado completamente

// --- ProtocolSelectionDialog: diálogo de selección de protocolo con cards agrupadas por sección ---
export function ProtocolSelectionDialog({
  visible,
  onHide,
  onSelectProtocol // Callback: (protocol) => void
}) {
  // Hook para igualar alturas de cards en cada sección
  useEffect(() => {
    if (!visible) return;
    
    const equalizeCardHeights = () => {
      // Para cada sección, encontrar la altura máxima de las cards
      const sections = document.querySelectorAll('.protocol-section');
      sections.forEach((section) => {
        const cards = section.querySelectorAll('.protocol-card');
        if (cards.length === 0) return;
        
        // Resetear alturas para recalcular
        cards.forEach(card => {
          card.style.height = 'auto';
        });
        
        // Encontrar la altura máxima
        let maxHeight = 0;
        cards.forEach(card => {
          const height = card.offsetHeight;
          if (height > maxHeight) {
            maxHeight = height;
          }
        });
        
        // Aplicar la altura máxima a todas las cards
        cards.forEach(card => {
          card.style.height = `${maxHeight}px`;
        });
      });
    };
    
    // Ejecutar después de que el DOM se actualice
    setTimeout(equalizeCardHeights, 0);
    
    // Re-ejecutar cuando cambie el tamaño de la ventana
    window.addEventListener('resize', equalizeCardHeights);
    
    return () => {
      window.removeEventListener('resize', equalizeCardHeights);
    };
  }, [visible]);
  const protocolSections = [
    {
      title: 'Acceso Remoto',
      icon: 'pi pi-link',
      protocols: [
        {
          id: 'ssh',
          name: 'SSH',
          description: 'Acceso remoto y seguro a línea de comandos. Ideal para administración de servidores y ejecución de comandos.',
          icon: 'pi pi-terminal',
          color: '#2196F3'
        },
        {
          id: 'rdp',
          name: 'RDP',
          description: 'Control total del entorno gráfico de un PC con Windows. Soporte completo de sesiones y periféricos.',
          icon: 'pi pi-desktop',
          color: '#4CAF50'
        }
      ]
    },
    {
      title: 'Transferencia de Archivos',
      icon: 'pi pi-cloud',
      protocols: [
        {
          id: 'sftp',
          name: 'SFTP',
          description: 'La forma más recomendada para mover archivos de forma encriptada, utilizando vías de seguridad de SSH.',
          icon: 'pi pi-folder-open',
          color: '#FF9800'
        },
        {
          id: 'ftp',
          name: 'FTP',
          description: 'Protocolo clásico de transferencia. Rápido, pero *no encripta* los datos (no recomendado para información sensible).',
          icon: 'pi pi-cloud-upload',
          color: '#9C27B0',
          isInsecure: true
        },
        {
          id: 'scp',
          name: 'SCP',
          description: 'Herramienta rápida y segura para copiar archivos y directorios entre hosts remotos (basado en SSH).',
          icon: 'pi pi-copy',
          color: '#00BCD4'
        }
      ]
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
      style={{ width: '90vw', maxWidth: '1000px' }}
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
            Seleccionar Tipo de Conexión
          </h3>
          <p className="protocol-selection-description">
            Seleca al tipo de conexión que deseas crear
          </p>
        </div>

        {/* Secciones agrupadas */}
        {protocolSections.map((section) => (
          <div key={section.title} className="protocol-section">
            <div className="protocol-section-header">
              <div className="protocol-section-title-group">
                <span className="protocol-section-icon">
                  <i className={section.icon}></i>
                </span>
                <h4 className="protocol-section-title">{section.title}</h4>
              </div>
            </div>

            {/* Grid de protocolos en esta sección */}
            <div className="protocol-section-grid">
              {section.protocols.map((protocol) => (
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
                      <div className="protocol-card-header">
                        <h4 className="protocol-card-name">{protocol.name}</h4>
                        {protocol.isInsecure && (
                          <span className="protocol-card-warning" title="Conexión no encriptada">
                            <i className="pi pi-exclamation-triangle"></i>
                          </span>
                        )}
                      </div>
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
        ))}
      </div>
    </Dialog>
  );
}

 