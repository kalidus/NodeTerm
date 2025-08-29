import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';

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
      style={{ width: '650px', minHeight: '600px' }} 
      modal 
      onHide={onHide}
      maximizable
    >
      <TabView 
        activeIndex={activeTabIndex} 
        onTabChange={(e) => setActiveTabIndex(e.index)}
        style={{ marginTop: '10px' }}
      >
        {/* Tab SSH */}
        <TabPanel header="SSH" leftIcon="pi pi-server">
          <div className="p-fluid" style={{ padding: '8px 0' }}>
            <div className="p-field" style={{ marginBottom: 14 }}>
              <label htmlFor="unifiedSSHName">Nombre</label>
              <InputText 
                id="unifiedSSHName" 
                value={sshName} 
                onChange={e => setSSHName(e.target.value)} 
                autoFocus={activeTabIndex === 0} 
              />
            </div>
            <div className="p-field" style={{ marginBottom: 14 }}>
              <label htmlFor="unifiedSSHHost">Host</label>
              <InputText 
                id="unifiedSSHHost" 
                value={sshHost} 
                onChange={e => setSSHHost(e.target.value)} 
              />
            </div>
            <div className="p-field" style={{ marginBottom: 14 }}>
              <label htmlFor="unifiedSSHUser">Usuario</label>
              <InputText 
                id="unifiedSSHUser" 
                value={sshUser} 
                onChange={e => setSSHUser(e.target.value)} 
              />
            </div>
            <div className="p-field" style={{ marginBottom: 14 }}>
              <label htmlFor="unifiedSSHPassword">Contraseña</label>
              <InputText 
                id="unifiedSSHPassword" 
                type="password" 
                value={sshPassword} 
                onChange={e => setSSHPassword(e.target.value)} 
              />
            </div>
            <div className="p-field" style={{ marginBottom: 14 }}>
              <label htmlFor="unifiedSSHPort">Puerto</label>
              <InputText 
                id="unifiedSSHPort" 
                value={sshPort} 
                onChange={e => setSSHPort(e.target.value)} 
              />
            </div>
            <div className="p-field" style={{ marginBottom: 14 }}>
              <label htmlFor="unifiedSSHTargetFolder">Carpeta destino (opcional)</label>
              <Dropdown 
                id="unifiedSSHTargetFolder" 
                value={sshTargetFolder} 
                options={foldersOptions} 
                onChange={e => setSSHTargetFolder(e.value)} 
                placeholder="Selecciona una carpeta" 
                showClear 
                filter
              />
            </div>
            <div className="p-field" style={{ marginBottom: 18 }}>
              <label htmlFor="unifiedSSHRemoteFolder">Carpeta remota (opcional)</label>
              <InputText 
                id="unifiedSSHRemoteFolder" 
                value={sshRemoteFolder} 
                onChange={e => setSSHRemoteFolder(e.target.value)} 
              />
            </div>
            <div className="p-field" style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'flex-end' }}>
              <Button 
                label="Cancelar" 
                icon="pi pi-times" 
                className="p-button-text" 
                onClick={onHide} 
                style={{ minWidth: 120 }} 
              />
              <Button 
                label="Crear SSH" 
                icon="pi pi-check" 
                className="p-button-primary" 
                onClick={onSSHConfirm} 
                style={{ minWidth: 120 }} 
                loading={sshLoading} 
              />
            </div>
          </div>
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

 