import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Card } from 'primereact/card';

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

// --- RdpGuacamoleDialog: para crear o editar conexiones RDP ---
export function RdpGuacamoleDialog({
  visible,
  onHide,
  mode = 'new', // 'new' o 'edit'
  name, setName,
  hostname, setHostname,
  username, setUsername, 
  password, setPassword,
  port, setPort,
  targetFolder, setTargetFolder,
  foldersOptions = [],
  onConfirm,
  loading = false
}) {
  const isEdit = mode === 'edit';
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Opciones avanzadas
  const [width, setWidth] = useState('1024');
  const [height, setHeight] = useState('768');
  const [dpi, setDpi] = useState('96');
  const [enableDrive, setEnableDrive] = useState(false);
  const [enableWallpaper, setEnableWallpaper] = useState(false);
  const [security, setSecurity] = useState('any');

  const securityOptions = [
    { label: 'Cualquiera (Recomendado)', value: 'any' },
    { label: 'RDP', value: 'rdp' },
    { label: 'TLS', value: 'tls' },
    { label: 'NLA', value: 'nla' }
  ];

  const resolutionPresets = [
    { label: '1024x768', value: '1024x768' },
    { label: '1280x720', value: '1280x720' },
    { label: '1366x768', value: '1366x768' },
    { label: '1920x1080', value: '1920x1080' },
    { label: 'Personalizado', value: 'custom' }
  ];

  const [selectedResolution, setSelectedResolution] = useState('1024x768');

  const handleResolutionChange = (value) => {
    setSelectedResolution(value);
    if (value !== 'custom') {
      const [w, h] = value.split('x');
      setWidth(w);
      setHeight(h);
    }
  };

  const handleConfirm = () => {
    const config = {
      name,
      hostname,
      username,
      password,
      port: port || '3389',
      targetFolder,
      // Opciones avanzadas
      width: parseInt(width) || 1024,
      height: parseInt(height) || 768,
      dpi: parseInt(dpi) || 96,
      enableDrive,
      enableWallpaper,
      security
    };
    onConfirm(config);
  };

  return (
    <Dialog 
      header={isEdit ? 'Editar conexión RDP' : 'Nueva conexión RDP'} 
      visible={visible} 
      style={{ width: '420px', borderRadius: 16 }} 
      modal 
      onHide={onHide}
    >
      <div className="p-fluid" style={{ padding: 8 }}>
        {/* Campos básicos */}
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="rdpName">Nombre</label>
          <InputText 
            id="rdpName" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            autoFocus 
            placeholder="Mi servidor Windows"
          />
        </div>

        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="rdpHostname">Servidor / IP</label>
          <InputText 
            id="rdpHostname" 
            value={hostname} 
            onChange={e => setHostname(e.target.value)} 
            placeholder="192.168.1.100 o servidor.empresa.com"
          />
        </div>

        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="rdpUsername">Usuario</label>
          <InputText 
            id="rdpUsername" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            placeholder="Administrador"
          />
        </div>

        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="rdpPassword">Contraseña</label>
          <InputText 
            id="rdpPassword" 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="••••••••"
          />
        </div>

        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="rdpPort">Puerto (opcional)</label>
          <InputText 
            id="rdpPort" 
            value={port} 
            onChange={e => setPort(e.target.value)} 
            placeholder="3389"
          />
        </div>

        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="rdpTargetFolder">Carpeta destino (opcional)</label>
          <Dropdown 
            id="rdpTargetFolder" 
            value={targetFolder} 
            options={foldersOptions} 
            onChange={e => setTargetFolder(e.value)} 
            placeholder="Selecciona una carpeta" 
            showClear 
            filter
          />
        </div>

        {/* Botón para mostrar opciones avanzadas */}
        <div style={{ marginBottom: 16 }}>
          <Button
            label={showAdvanced ? "Ocultar opciones avanzadas" : "Mostrar opciones avanzadas"}
            icon={showAdvanced ? "pi pi-chevron-up" : "pi pi-chevron-down"}
            className="p-button-text p-button-sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ fontSize: '12px', color: '#4fc3f7' }}
          />
        </div>

        {/* Opciones avanzadas */}
        {showAdvanced && (
          <Card style={{ marginBottom: 16, backgroundColor: '#f8f9fa', border: '1px solid #dee2e6' }}>
            <div style={{ padding: '12px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#495057' }}>
                Configuración Avanzada
              </h4>
              
              <div className="p-field" style={{ marginBottom: 12 }}>
                <label htmlFor="rdpResolution">Resolución</label>
                <Dropdown
                  id="rdpResolution"
                  value={selectedResolution}
                  options={resolutionPresets}
                  onChange={e => handleResolutionChange(e.value)}
                />
              </div>

              {selectedResolution === 'custom' && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: 12 }}>
                  <div className="p-field" style={{ flex: 1 }}>
                    <label htmlFor="rdpWidth">Ancho</label>
                    <InputText
                      id="rdpWidth"
                      value={width}
                      onChange={e => setWidth(e.target.value)}
                      placeholder="1024"
                    />
                  </div>
                  <div className="p-field" style={{ flex: 1 }}>
                    <label htmlFor="rdpHeight">Alto</label>
                    <InputText
                      id="rdpHeight"
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      placeholder="768"
                    />
                  </div>
                </div>
              )}

              <div className="p-field" style={{ marginBottom: 12 }}>
                <label htmlFor="rdpDpi">DPI</label>
                <InputText
                  id="rdpDpi"
                  value={dpi}
                  onChange={e => setDpi(e.target.value)}
                  placeholder="96"
                />
              </div>

              <div className="p-field" style={{ marginBottom: 12 }}>
                <label htmlFor="rdpSecurity">Seguridad</label>
                <Dropdown
                  id="rdpSecurity"
                  value={security}
                  options={securityOptions}
                  onChange={e => setSecurity(e.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="p-field-checkbox">
                  <Checkbox
                    inputId="rdpEnableDrive"
                    checked={enableDrive}
                    onChange={e => setEnableDrive(e.checked)}
                  />
                  <label htmlFor="rdpEnableDrive" style={{ marginLeft: '8px', fontSize: '14px' }}>
                    Habilitar redirección de unidades
                  </label>
                </div>

                <div className="p-field-checkbox">
                  <Checkbox
                    inputId="rdpEnableWallpaper"
                    checked={enableWallpaper}
                    onChange={e => setEnableWallpaper(e.checked)}
                  />
                  <label htmlFor="rdpEnableWallpaper" style={{ marginLeft: '8px', fontSize: '14px' }}>
                    Mostrar fondo de escritorio (más lento)
                  </label>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Botones de acción */}
        <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'flex-end' }}>
          <Button 
            label="Cancelar" 
            icon="pi pi-times" 
            className="p-button-text" 
            onClick={onHide} 
            style={{ minWidth: 120 }} 
          />
          <Button 
            label={isEdit ? 'Guardar' : 'Conectar'} 
            icon="pi pi-desktop" 
            className="p-button-primary" 
            onClick={handleConfirm} 
            style={{ minWidth: 120, backgroundColor: '#ff6b35', borderColor: '#ff6b35' }} 
            loading={loading}
            disabled={!name.trim() || !hostname.trim() || !username.trim() || !password.trim()}
          />
        </div>
      </div>
    </Dialog>
  );
} 