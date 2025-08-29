import React, { useState } from 'react';
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
  editingNode = null
}) {
  const [activeTabIndex, setActiveTabIndex] = useState(0); // 0 = SSH, 1 = RDP

  return (
    <Dialog 
      header="Nueva Conexión" 
      visible={visible} 
      style={{ width: '98vw', height: '90vh' }} 
      modal 
      onHide={onHide}
      maximizable
      contentStyle={{ padding: '0', height: '100%' }}
      className="unified-connection-dialog"
    >
      <TabView 
        activeIndex={activeTabIndex} 
        onTabChange={(e) => setActiveTabIndex(e.index)}
        style={{ marginTop: '10px' }}
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
          <div className="p-fluid" style={{ padding: '8px 0' }}>
            <Card title="Configuración RDP" className="mb-3">
              <div className="formgrid grid">
                <div className="field col-12">
                  <label htmlFor="rdpName">Nombre de la Conexión</label>
                  <InputText 
                    id="rdpName" 
                    placeholder="Nombre descriptivo para la conexión"
                    autoFocus={activeTabIndex === 1}
                  />
                </div>
                <div className="field col-12 md:col-6">
                  <label htmlFor="rdpServer">Servidor *</label>
                  <InputText 
                    id="rdpServer" 
                    placeholder="IP o nombre del servidor"
                  />
                </div>
                <div className="field col-12 md:col-6">
                  <label htmlFor="rdpPort">Puerto</label>
                  <InputText 
                    id="rdpPort" 
                    defaultValue="3389"
                  />
                </div>
                <div className="field col-12 md:col-6">
                  <label htmlFor="rdpUsername">Usuario</label>
                  <InputText 
                    id="rdpUsername" 
                    placeholder="Nombre de usuario"
                  />
                </div>
                <div className="field col-12 md:col-6">
                  <label htmlFor="rdpPassword">Contraseña</label>
                  <InputText 
                    id="rdpPassword" 
                    type="password"
                    placeholder="Contraseña"
                  />
                </div>
              </div>
            </Card>
            <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'flex-end' }}>
              <Button 
                label="Cancelar" 
                icon="pi pi-times" 
                className="p-button-text" 
                onClick={onHide} 
                style={{ minWidth: 120 }} 
              />
              <Button 
                label="Crear RDP" 
                icon="pi pi-check" 
                className="p-button-primary" 
                onClick={() => {
                  // Por ahora, solo cerrar y mostrar mensaje
                  console.log('Crear conexión RDP - funcionalidad pendiente');
                  onHide();
                }} 
                style={{ minWidth: 120 }} 
              />
            </div>
          </div>
        </TabPanel>
      </TabView>
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
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="formgrid grid" style={{ gap: '20px', flex: 1 }}>
        
        {/* Columna izquierda - Información de Conexión */}
        <div className="col-12 md:col-6" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            padding: '24px', 
            borderRadius: '8px',
            height: '100%'
          }}>
            <h6 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
              📡 Información de Conexión
            </h6>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '6px' }}>
                Nombre *
              </label>
              <InputText 
                value={sshName} 
                onChange={(e) => setSSHName(e.target.value)}
                placeholder="Servidor producción"
                autoFocus={activeTabIndex === 0}
                className={`w-full ${validationErrors.name ? 'p-invalid' : ''}`}
                style={{ padding: '12px' }}
              />
              {validationErrors.name && (
                <small style={{ color: 'var(--red-400)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  {validationErrors.name}
                </small>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '6px' }}>
                  Host *
                </label>
                <InputText 
                  value={sshHost} 
                  onChange={(e) => setSSHHost(e.target.value)}
                  placeholder="192.168.1.100"
                  className={`w-full ${validationErrors.host ? 'p-invalid' : ''}`}
                  style={{ padding: '12px' }}
                />
                {validationErrors.host && (
                  <small style={{ color: 'var(--red-400)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    {validationErrors.host}
                  </small>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '6px' }}>
                  Puerto
                </label>
                <InputText 
                  value={sshPort} 
                  onChange={(e) => setSSHPort(e.target.value)}
                  placeholder="22"
                  className={`w-full ${validationErrors.port ? 'p-invalid' : ''}`}
                  style={{ padding: '12px' }}
                />
                {validationErrors.port && (
                  <small style={{ color: 'var(--red-400)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    {validationErrors.port}
                  </small>
                )}
              </div>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '6px' }}>
                Usuario *
              </label>
              <InputText 
                value={sshUser} 
                onChange={(e) => setSSHUser(e.target.value)}
                placeholder="root"
                className={`w-full ${validationErrors.user ? 'p-invalid' : ''}`}
                style={{ padding: '12px' }}
              />
              {validationErrors.user && (
                <small style={{ color: 'var(--red-400)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  {validationErrors.user}
                </small>
              )}
            </div>

            {/* Configuración opcional */}
            <h6 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
              ⚙️ Configuración Opcional
            </h6>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '6px' }}>
                  Carpeta destino
                </label>
                <Dropdown 
                  value={sshTargetFolder} 
                  options={foldersOptions} 
                  onChange={(e) => setSSHTargetFolder(e.value)} 
                  placeholder="Seleccionar carpeta"
                  showClear 
                  className="w-full"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '6px' }}>
                  Directorio remoto inicial
                </label>
                <InputText 
                  value={sshRemoteFolder} 
                  onChange={(e) => setSSHRemoteFolder(e.target.value)}
                  placeholder="/home/usuario"
                  className="w-full"
                  style={{ padding: '12px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha - Autenticación */}
        <div className="col-12 md:col-6" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            padding: '24px', 
            borderRadius: '8px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h6 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
              🔐 Autenticación
            </h6>
            
            <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RadioButton 
                  inputId="authPassword" 
                  name="authMethod" 
                  value="password" 
                  onChange={(e) => setAuthMethod(e.value)} 
                  checked={authMethod === 'password'} 
                />
                <label htmlFor="authPassword" style={{ fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                  🔑 Contraseña
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RadioButton 
                  inputId="authKey" 
                  name="authMethod" 
                  value="key" 
                  onChange={(e) => setAuthMethod(e.value)} 
                  checked={authMethod === 'key'} 
                />
                <label htmlFor="authKey" style={{ fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                  🗝️ Clave SSH
                </label>
              </div>
            </div>

            {authMethod === 'password' && (
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color-secondary)', display: 'block', marginBottom: '6px' }}>
                  Contraseña *
                </label>
                <InputText 
                  type="password" 
                  value={sshPassword} 
                  onChange={(e) => setSSHPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className={`w-full ${validationErrors.auth ? 'p-invalid' : ''}`}
                  style={{ padding: '12px', fontSize: '14px' }}
                />
                {validationErrors.auth && authMethod === 'password' && (
                  <small style={{ color: 'var(--red-400)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    {validationErrors.auth}
                  </small>
                )}
              </div>
            )}

            {authMethod === 'key' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '12px' }}>
                  <FileUpload 
                    mode="basic" 
                    name="sshKey" 
                    accept=".pem,.key,.ppk,*" 
                    maxFileSize={1000000}
                    onSelect={handleFileUpload}
                    chooseLabel="📁 Cargar archivo de clave SSH"
                    className="p-button-outlined"
                    style={{ fontSize: '13px', padding: '8px 16px' }}
                    auto
                  />
                </div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color-secondary)', marginBottom: '8px', display: 'block' }}>
                  O pega tu clave privada SSH:
                </label>
                <InputTextarea 
                  value={sshPrivateKey}
                  onChange={(e) => setSSHPrivateKey(e.target.value)}
                  rows={15}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABCr2J...&#10;-----END OPENSSH PRIVATE KEY-----"
                  className={`w-full ${validationErrors.auth ? 'p-invalid' : ''}`}
                  style={{ 
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace', 
                    fontSize: '12px',
                    flex: 1,
                    resize: 'none',
                    minHeight: '350px',
                    lineHeight: '1.4'
                  }}
                />
                {validationErrors.auth && authMethod === 'key' && (
                  <small style={{ color: 'var(--red-400)', fontSize: '11px', display: 'block', marginTop: '6px' }}>
                    {validationErrors.auth}
                  </small>
                )}
                <small style={{ color: 'var(--text-color-secondary)', fontSize: '11px', marginTop: '8px', display: 'block' }}>
                  💡 Soporta claves OpenSSH, RSA, DSA y ECDSA en formatos PEM, OpenSSH y PuTTY
                </small>
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Botones en la parte inferior */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'flex-end', 
        paddingTop: '16px',
        borderTop: '1px solid #e2e8f0',
        marginTop: '12px'
      }}>
        <Button 
          label="Cancelar" 
          icon="pi pi-times" 
          className="p-button-text" 
          onClick={onHide} 
          style={{ fontSize: '13px', padding: '8px 16px', fontWeight: '500' }}
        />
        <Button 
          label="Crear conexión SSH" 
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
          style={{ fontSize: '13px', padding: '8px 20px', fontWeight: '500' }}
          loading={sshLoading}
          disabled={!isFormValid()}
        />
      </div>
    </div>
  );
}

 