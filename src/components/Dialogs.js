import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';
import { Fieldset } from 'primereact/fieldset';
import { RadioButton } from 'primereact/radiobutton';
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
          <InputText id="sshPassword" type="password" value={password} onChange={e => setPassword(e.target.value)} />
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
  onConfirm,
  loading = false
}) {
  const isEdit = mode === 'edit';
  return (
    <Dialog header={isEdit ? 'Editar carpeta' : 'Nueva carpeta'} visible={visible} style={{ width: 350 }} modal onHide={onHide}>
      <div className="p-fluid">
        <div className="p-field">
          <label htmlFor="folderName">Nombre de la carpeta</label>
          <InputText id="folderName" value={folderName} onChange={e => setFolderName(e.target.value)} autoFocus />
        </div>
      </div>
      <div className="p-dialog-footer">
        <Button label="Cancelar" icon="pi pi-times" className="p-button-text" onClick={onHide} />
        <Button label={isEdit ? 'Guardar' : 'Crear'} icon="pi pi-check" className="p-button-primary" onClick={onConfirm} autoFocus loading={loading} />
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
  foldersOptions = [],
  onSSHConfirm,
  sshLoading = false,
  // Props RDP
  rdpNodeData,
  onSaveToSidebar,
  editingNode = null,
  // Props para modo edición
  isEditMode = false,
  editConnectionType = null, // 'ssh' o 'rdp'
  editNodeData = null
}) {
  const [activeTabIndex, setActiveTabIndex] = useState(0); // 0 = SSH, 1 = RDP
  const [isExpanded, setIsExpanded] = useState(false); // Estado para controlar si está expandido
  
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
    redirectAudio: true,
    fullscreen: false,
    smartSizing: true,
    span: false,
    admin: false,
    public: false,
    // Campos específicos para Guacamole
    autoResize: false,
    guacDpi: 96,
    guacSecurity: 'any',
    guacEnableWallpaper: false,
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

  // Precargar datos cuando esté en modo edición
  useEffect(() => {
    if (isEditMode && editNodeData && visible) {
      if (editConnectionType === 'ssh') {
        // Precargar datos SSH
        setSSHName(editNodeData.label || '');
        setSSHHost(editNodeData.data?.bastionHost || editNodeData.data?.host || '');
        setSSHUser(editNodeData.data?.useBastionWallix ? editNodeData.data?.bastionUser || '' : editNodeData.data?.user || '');
        setSSHPassword(editNodeData.data?.password || '');
        setSSHRemoteFolder(editNodeData.data?.remoteFolder || '');
        setSSHPort(editNodeData.data?.port || 22);
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
          autoResize: data.autoResize || false,
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
      }
    }
  }, [isEditMode, editNodeData, editConnectionType, visible, setSSHName, setSSHHost, setSSHUser, setSSHPassword, setSSHRemoteFolder, setSSHPort]);

  // Header personalizado con botón de expansión
  const customHeader = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 0' }}>
      <span style={{ fontSize: '16px', fontWeight: '500' }}>{isEditMode ? "Editar Conexión" : "Nueva Conexión"}</span>
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
        // Modo edición: mostrar solo el formulario específico sin pestañas
        editConnectionType === 'ssh' ? (
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
            foldersOptions={foldersOptions}
            onSSHConfirm={onSSHConfirm}
            onHide={onHide}
            sshLoading={sshLoading}
          />
        ) : (
          // Formulario RDP optimizado para edición (mismo diseño que el tab RDP)
          <div className="p-fluid" style={{ padding: '12px', maxHeight: '70vh', overflowY: 'auto' }}>
            
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
                        value={formData.name}
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
                      <InputText
                        id="password-edit"
                        type="password"
                        value={formData.password}
                        onChange={handleTextChange('password')}
                        placeholder="Contraseña (opcional)"
                        autoComplete="off"
                      />
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
                        <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectPrinters-edit" checked={formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} /><label htmlFor="guac-redirectPrinters-edit">🖨️ Impresoras</label></div>
                        <div className="field-checkbox col-6"><Checkbox inputId="guac-autoResize-edit" checked={formData.autoResize} onChange={handleCheckboxChange('autoResize')} /><label htmlFor="guac-autoResize-edit">📐 Ajuste automático</label></div>
                        <div className="field-checkbox col-6"><Checkbox inputId="guac-enableWallpaper-edit" checked={formData.guacEnableWallpaper} onChange={handleCheckboxChange('guacEnableWallpaper')} /><label htmlFor="guac-enableWallpaper-edit">🖼️ Mostrar fondo</label></div>
                        <div className="field-checkbox col-6"><Checkbox inputId="guac-enableDrive-edit" checked={formData.guacEnableDrive} onChange={handleCheckboxChange('guacEnableDrive')} /><label htmlFor="guac-enableDrive-edit">💾 Carpetas (NodeTerm Drive)</label></div>
                      </>
                    )}
                  </div>
                  {/* Configuración de carpetas condicional para Guacamole */}
                  {formData.clientType === 'guacamole' && formData.guacEnableDrive && (
                    <div className="field" style={{ marginTop: '1rem' }}>
                      <label htmlFor="guacDriveHostDir-edit">📁 Carpeta local para "NodeTerm Drive"</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Button icon="pi pi-folder-open" className="p-button-outlined" onClick={handleSelectFolder} />
                        <InputText
                          id="guacDriveHostDir-edit"
                          value={formData.guacDriveHostDir}
                          onChange={handleTextChange('guacDriveHostDir')}
                          placeholder="C:\Users\tu_usuario\Downloads\NodeTermDrive"
                        />
                      </div>
                      {!formData.guacDriveHostDir && <small>Por defecto: C:\Users\&lt;usuario&gt;\Downloads\NodeTerm Drive</small>}
                    </div>
                  )}

                  {/* Fieldset: Opciones Avanzadas (anidado y con separador) */}
                  {formData.clientType === 'guacamole' && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                      <Fieldset legend="🚀 Opciones Avanzadas" toggleable collapsed>
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
            foldersOptions={foldersOptions}
            onSSHConfirm={onSSHConfirm}
            onHide={onHide}
            sshLoading={sshLoading}
          />
        </TabPanel>

        {/* Tab RDP */}
        <TabPanel header="RDP" leftIcon="pi pi-desktop">
          <div className="p-fluid" style={{ padding: '12px', maxHeight: '70vh', overflowY: 'auto' }}>
            
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
                        value={formData.name}
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
                      <InputText
                        id="password-edit"
                        type="password"
                        value={formData.password}
                        onChange={handleTextChange('password')}
                        placeholder="Contraseña (opcional)"
                        autoComplete="off"
                      />
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
                        <div className="field-checkbox col-6"><Checkbox inputId="guac-redirectPrinters-edit" checked={formData.redirectPrinters} onChange={handleCheckboxChange('redirectPrinters')} /><label htmlFor="guac-redirectPrinters-edit">🖨️ Impresoras</label></div>
                        <div className="field-checkbox col-6"><Checkbox inputId="guac-autoResize-edit" checked={formData.autoResize} onChange={handleCheckboxChange('autoResize')} /><label htmlFor="guac-autoResize-edit">📐 Ajuste automático</label></div>
                        <div className="field-checkbox col-6"><Checkbox inputId="guac-enableWallpaper-edit" checked={formData.guacEnableWallpaper} onChange={handleCheckboxChange('guacEnableWallpaper')} /><label htmlFor="guac-enableWallpaper-edit">🖼️ Mostrar fondo</label></div>
                        <div className="field-checkbox col-6"><Checkbox inputId="guac-enableDrive-edit" checked={formData.guacEnableDrive} onChange={handleCheckboxChange('guacEnableDrive')} /><label htmlFor="guac-enableDrive-edit">💾 Carpetas (NodeTerm Drive)</label></div>
                      </>
                    )}
                  </div>
                  {/* Configuración de carpetas condicional para Guacamole */}
                  {formData.clientType === 'guacamole' && formData.guacEnableDrive && (
                    <div className="field" style={{ marginTop: '1rem' }}>
                      <label htmlFor="guacDriveHostDir-edit">📁 Carpeta local para "NodeTerm Drive"</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Button icon="pi pi-folder-open" className="p-button-outlined" onClick={handleSelectFolder} />
                        <InputText
                          id="guacDriveHostDir-edit"
                          value={formData.guacDriveHostDir}
                          onChange={handleTextChange('guacDriveHostDir')}
                          placeholder="C:\Users\tu_usuario\Downloads\NodeTermDrive"
                        />
                      </div>
                      {!formData.guacDriveHostDir && <small>Por defecto: C:\Users\&lt;usuario&gt;\Downloads\NodeTerm Drive</small>}
                    </div>
                  )}

                  {/* Fieldset: Opciones Avanzadas (anidado y con separador) */}
                  {formData.clientType === 'guacamole' && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                      <Fieldset legend="🚀 Opciones Avanzadas" toggleable collapsed>
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
      </TabView>
      )}
    </Dialog>
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
  foldersOptions,
  onSSHConfirm,
  onHide,
  sshLoading
}) {
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'key'
  const [sshPrivateKey, setSSHPrivateKey] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Validación en tiempo real
  const validateField = (field, value) => {
    const errors = { ...validationErrors };
    
    switch (field) {
      case 'name':
        if (!value?.trim()) {
          errors.name = 'El nombre es requerido';
        } else {
          delete errors.name;
        }
        break;
      case 'host':
        if (!value?.trim()) {
          errors.host = 'El host es requerido';
        } else {
          delete errors.host;
        }
        break;
      case 'user':
        if (!value?.trim()) {
          errors.user = 'El usuario es requerido';
        } else {
          delete errors.user;
        }
        break;
      case 'auth':
        if (authMethod === 'password' && !sshPassword?.trim()) {
          errors.auth = 'La contraseña es requerida';
        } else if (authMethod === 'key' && !sshPrivateKey?.trim()) {
          errors.auth = 'La clave privada es requerida';
        } else {
          delete errors.auth;
        }
        break;
      case 'port':
        const portNum = parseInt(value);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
          errors.port = 'Puerto debe ser un número entre 1 y 65535';
        } else {
          delete errors.port;
        }
        break;
    }
    
    setValidationErrors(errors);
  };

  // Validar al cambiar valores
  React.useEffect(() => {
    validateField('name', sshName);
  }, [sshName]);

  React.useEffect(() => {
    validateField('host', sshHost);
  }, [sshHost]);

  React.useEffect(() => {
    validateField('user', sshUser);
  }, [sshUser]);

  React.useEffect(() => {
    validateField('auth');
  }, [authMethod, sshPassword, sshPrivateKey]);

  React.useEffect(() => {
    validateField('port', sshPort);
  }, [sshPort]);

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
    return Object.keys(validationErrors).length === 0 && 
           sshName?.trim() && 
           sshHost?.trim() && 
           sshUser?.trim() &&
           (authMethod === 'password' ? sshPassword?.trim() : sshPrivateKey?.trim());
  };

  return (
    <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        
        {/* Columna izquierda - Información de Conexión */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <div className="card" style={{ padding: '12px', margin: '0', height: 'fit-content' }}>
            <h6 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--primary-color)' }}>
              📡 Información de Conexión
            </h6>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '4px' }}>
                Nombre *
              </label>
              <InputText 
                value={sshName} 
                onChange={(e) => setSSHName(e.target.value)}
                placeholder="Servidor producción"
                autoFocus={activeTabIndex === 0}
                className={`w-full ${validationErrors.name ? 'p-invalid' : ''}`}
                style={{ padding: '8px 10px', fontSize: '13px' }}
              />
              {validationErrors.name && (
                <small style={{ color: 'var(--red-400)', fontSize: '10px', display: 'block', marginTop: '2px' }}>
                  {validationErrors.name}
                </small>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '4px' }}>
                  Host *
                </label>
                <InputText 
                  value={sshHost} 
                  onChange={(e) => setSSHHost(e.target.value)}
                  placeholder="192.168.1.100"
                  className={`w-full ${validationErrors.host ? 'p-invalid' : ''}`}
                  style={{ padding: '8px 10px', fontSize: '13px' }}
                />
                {validationErrors.host && (
                  <small style={{ color: 'var(--red-400)', fontSize: '10px', display: 'block', marginTop: '2px' }}>
                    {validationErrors.host}
                  </small>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '4px' }}>
                  Puerto
                </label>
                <InputText 
                  value={sshPort} 
                  onChange={(e) => setSSHPort(e.target.value)}
                  placeholder="22"
                  className={`w-full ${validationErrors.port ? 'p-invalid' : ''}`}
                  style={{ padding: '8px 10px', fontSize: '13px' }}
                />
                {validationErrors.port && (
                  <small style={{ color: 'var(--red-400)', fontSize: '10px', display: 'block', marginTop: '2px' }}>
                    {validationErrors.port}
                  </small>
                )}
              </div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '4px' }}>
                Usuario *
              </label>
              <InputText 
                value={sshUser} 
                onChange={(e) => setSSHUser(e.target.value)}
                placeholder="root"
                className={`w-full ${validationErrors.user ? 'p-invalid' : ''}`}
                style={{ padding: '8px 10px', fontSize: '13px' }}
              />
              {validationErrors.user && (
                <small style={{ color: 'var(--red-400)', fontSize: '10px', display: 'block', marginTop: '2px' }}>
                  {validationErrors.user}
                </small>
              )}
            </div>

            {/* Configuración opcional */}
            <h6 style={{ margin: '12px 0 8px 0', fontSize: '12px', fontWeight: '600', color: 'var(--text-color-secondary)', paddingTop: '8px' }}>
              ⚙️ Configuración Opcional
            </h6>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '4px' }}>
                  Carpeta destino
                </label>
                <Dropdown 
                  value={sshTargetFolder} 
                  options={foldersOptions} 
                  onChange={(e) => setSSHTargetFolder(e.value)} 
                  placeholder="Seleccionar"
                  showClear 
                  className="w-full"
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '4px' }}>
                Directorio remoto inicial
              </label>
              <InputText 
                value={sshRemoteFolder} 
                onChange={(e) => setSSHRemoteFolder(e.target.value)}
                placeholder="/home/usuario"
                className="w-full"
                style={{ padding: '6px 8px', fontSize: '12px' }}
              />
            </div>
          </div>
        </div>

        {/* Columna derecha - Autenticación */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <div className="card" style={{ 
            padding: '12px',
            margin: '0',
            height: 'fit-content',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h6 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--primary-color)' }}>
              🔐 Autenticación
            </h6>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RadioButton 
                  inputId="authPassword" 
                  name="authMethod" 
                  value="password" 
                  onChange={(e) => setAuthMethod(e.value)} 
                  checked={authMethod === 'password'} 
                />
                <label htmlFor="authPassword" style={{ fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                  🔑 Contraseña
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RadioButton 
                  inputId="authKey" 
                  name="authMethod" 
                  value="key" 
                  onChange={(e) => setAuthMethod(e.value)} 
                  checked={authMethod === 'key'} 
                />
                <label htmlFor="authKey" style={{ fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                  🗝️ Clave SSH
                </label>
              </div>
            </div>

            {authMethod === 'password' && (
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '4px' }}>
                  Contraseña *
                </label>
                <InputText 
                  type="password" 
                  value={sshPassword} 
                  onChange={(e) => setSSHPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className={`w-full ${validationErrors.auth ? 'p-invalid' : ''}`}
                  style={{ padding: '8px 10px', fontSize: '13px' }}
                />
                {validationErrors.auth && authMethod === 'password' && (
                  <small style={{ color: 'var(--red-400)', fontSize: '10px', display: 'block', marginTop: '2px' }}>
                    {validationErrors.auth}
                  </small>
                )}
              </div>
            )}

            {authMethod === 'key' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '8px' }}>
                  <FileUpload 
                    mode="basic" 
                    name="sshKey" 
                    accept=".pem,.key,.ppk,*" 
                    maxFileSize={1000000}
                    onSelect={handleFileUpload}
                    chooseLabel="📁 Cargar clave SSH"
                    className="p-button-outlined"
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                    auto
                  />
                </div>
                <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-color-secondary)', marginBottom: '4px', display: 'block' }}>
                  O pega tu clave privada SSH:
                </label>
                <InputTextarea 
                  value={sshPrivateKey}
                  onChange={(e) => setSSHPrivateKey(e.target.value)}
                  rows={10}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                  className={`w-full ${validationErrors.auth ? 'p-invalid' : ''}`}
                  style={{ 
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace', 
                    fontSize: '10px',
                    flex: 1,
                    resize: 'none',
                    minHeight: '200px',
                    lineHeight: '1.2'
                  }}
                />
                {validationErrors.auth && authMethod === 'key' && (
                  <small style={{ color: 'var(--red-400)', fontSize: '10px', display: 'block', marginTop: '2px' }}>
                    {validationErrors.auth}
                  </small>
                )}
                <small style={{ color: 'var(--text-color-secondary)', fontSize: '9px', marginTop: '4px', display: 'block' }}>
                  💡 Soporta claves OpenSSH, RSA, DSA y ECDSA
                </small>
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Botones en la parte inferior */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        justifyContent: 'flex-end', 
        paddingTop: '12px',
        marginTop: '8px'
      }}>
        <Button 
          label="Cancelar" 
          icon="pi pi-times" 
          className="p-button-text" 
          onClick={onHide} 
          style={{ fontSize: '12px', padding: '6px 12px' }}
        />
        <Button 
          label="Crear SSH" 
          icon="pi pi-check" 
          className="p-button-primary" 
          onClick={() => {
            if (isFormValid()) {
              onSSHConfirm({
                authMethod,
                privateKey: authMethod === 'key' ? sshPrivateKey : undefined
              });
            }
          }}
          style={{ fontSize: '12px', padding: '6px 16px' }}
          loading={sshLoading}
          disabled={!isFormValid()}
        />
      </div>
    </div>
  );
}

 