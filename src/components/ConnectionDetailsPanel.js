import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { useTranslation } from '../i18n/hooks/useTranslation';
import '../styles/components/connection-details-panel.css';

// Componente para campos editables
const EditableField = ({
  label,
  value,
  onEdit,
  isEditing,
  editValue,
  onValueChange,
  onSave,
  onCancel,
  onKeyDown,
  fieldKey,
  inputRefs,
  isPassword = false,
  onCopy = null,
  copyValue = null
}) => {
  const inputRef = (el) => {
    if (el && fieldKey) {
      inputRefs.current[fieldKey] = el;
    }
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    if (onCopy && copyValue) {
      onCopy(copyValue, label);
    }
  };

  if (isEditing) {
    return (
      <div className="detail-row editing">
        <div className="detail-label">{label}</div>
        <div className="detail-value">
          {isPassword ? (
            <Password
              ref={inputRef}
              value={editValue}
              onChange={(e) => onValueChange(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={onSave}
              feedback={false}
              className="editable-input"
              style={{ width: '100%' }}
            />
          ) : (
            <InputText
              ref={inputRef}
              value={editValue}
              onChange={(e) => onValueChange(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={onSave}
              className="editable-input"
              style={{ width: '100%' }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="detail-row" onClick={onEdit} style={{ cursor: 'pointer' }}>
      <div className="detail-label">{label}</div>
      <div className="detail-value editable-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ flex: 1 }}>{value || <span style={{ opacity: 0.5 }}>Click para editar</span>}</span>
        {onCopy && copyValue && (
          <i
            className="pi pi-copy"
            style={{
              fontSize: '10px',
              opacity: 0.5,
              cursor: 'pointer',
              padding: '2px',
              transition: 'opacity 0.2s'
            }}
            onClick={handleCopy}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
            title="Copiar"
          ></i>
        )}
        <i className="pi pi-pencil" style={{ fontSize: '10px', opacity: 0.5 }}></i>
      </div>
    </div>
  );
};

const ConnectionDetailsPanel = ({
  selectedNode,
  uiTheme = 'Light',
  sessionActionIconTheme = 'modern',
  onNodeUpdate = null, // Función para actualizar el nodo
  onOpenSSHConnection,
  onOpenVncConnection
}) => {
  // TODOS LOS HOOKS DEBEN IR AL PRINCIPIO, ANTES DE CUALQUIER RETORNO CONDICIONAL
  const { t } = useTranslation('common');
  const [collapsed, setCollapsed] = useState(false);
  const [panelHeight, setPanelHeight] = useState(() => {
    // Cargar altura guardada del localStorage
    const saved = localStorage.getItem('connectionDetailsPanelHeight');
    return saved ? parseInt(saved, 10) : 200;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [editingField, setEditingField] = useState(null); // { section, field }
  const [editValue, setEditValue] = useState('');
  const panelRef = useRef(null);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);
  const inputRefs = useRef({});

  // Handlers para redimensionamiento
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = panelHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [panelHeight]);

  const handleResizeMove = useCallback((e) => {
    if (!isResizing) return;

    const delta = resizeStartY.current - e.clientY; // Invertido porque arrastramos hacia arriba
    const newHeight = Math.max(150, Math.min(500, resizeStartHeight.current + delta));
    setPanelHeight(newHeight);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Guardar altura en localStorage
      localStorage.setItem('connectionDetailsPanelHeight', panelHeight.toString());
    }
  }, [isResizing, panelHeight]);

  // Event listeners para el redimensionamiento
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);

      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Focus en el input cuando se activa la edición
  useEffect(() => {
    if (editingField) {
      const fieldKey = `${editingField.section}-${editingField.field}`;
      const input = inputRefs.current[fieldKey];
      if (input) {
        setTimeout(() => {
          input.focus();
          input.select();
        }, 10);
      }
    }
  }, [editingField]);

  // Función para iniciar edición
  const startEdit = useCallback((section, field, currentValue) => {
    setEditingField({ section, field });
    setEditValue(currentValue || '');
  }, []);

  // Función para guardar cambios
  const saveEdit = useCallback(() => {
    if (!selectedNode || !editingField || !onNodeUpdate) return;

    const { section, field } = editingField;
    const updatedNode = { ...selectedNode };

    // Mapear campos a la estructura del nodo
    if (section === 'display' && field === 'name') {
      updatedNode.label = editValue;
    } else if (section === 'display' && field === 'description') {
      if (!updatedNode.data) updatedNode.data = {};
      updatedNode.data.description = editValue;
    } else if (section === 'connection' && field === 'hostname') {
      if (!updatedNode.data) updatedNode.data = {};
      if (updatedNode.data.useBastionWallix) {
        updatedNode.data.targetServer = editValue;
      } else {
        updatedNode.data.host = editValue;
        updatedNode.data.hostname = editValue;
        updatedNode.data.server = editValue;
      }
    } else if (section === 'connection' && field === 'username') {
      if (!updatedNode.data) updatedNode.data = {};
      if (updatedNode.data.useBastionWallix) {
        updatedNode.data.bastionUser = editValue;
      } else {
        updatedNode.data.user = editValue;
        updatedNode.data.username = editValue;
      }
    } else if (section === 'connection' && field === 'password') {
      if (!updatedNode.data) updatedNode.data = {};
      updatedNode.data.password = editValue;
    } else if (section === 'connection' && field === 'domain') {
      if (!updatedNode.data) updatedNode.data = {};
      updatedNode.data.domain = editValue;
    } else if (section === 'protocol' && field === 'port') {
      if (!updatedNode.data) updatedNode.data = {};
      updatedNode.data.port = parseInt(editValue, 10) || (isSSH ? 22 : isRDP ? 3389 : 5900);
    } else if (section === 'folders' && field === 'remote') {
      if (!updatedNode.data) updatedNode.data = {};
      updatedNode.data.remoteFolder = editValue;
    } else if (section === 'folders' && field === 'target') {
      if (!updatedNode.data) updatedNode.data = {};
      updatedNode.data.targetFolder = editValue;
    }

    // Actualizar el nodo
    onNodeUpdate(updatedNode);

    setEditingField(null);
    setEditValue('');
  }, [selectedNode, editingField, editValue, onNodeUpdate]);

  // Función para cancelar edición
  const cancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValue('');
  }, []);

  // Manejar Enter y Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  // Función para copiar al portapapeles
  const copyToClipboard = useCallback(async (text, fieldName) => {
    if (!text) return;

    try {
      if (window.electron && window.electron.clipboard) {
        // Electron
        window.electron.clipboard.writeText(text);
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        // Navegador moderno
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback para navegadores antiguos
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      // Mostrar notificación (si hay un sistema de toast disponible)
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'success',
          summary: 'Copiado',
          detail: `${fieldName} copiado al portapapeles`,
          life: 2000
        });
      }
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo copiar al portapapeles',
          life: 2000
        });
      }
    }
  }, []);

  // DEFINICIONES DE VARIABLES (Movidas antes de los retornos condicionales)
  const data = selectedNode?.data;
  const label = selectedNode?.label;
  const isFolder = selectedNode?.droppable;
  const isSSH = data && data.type === 'ssh';
  const isRDP = data && (data.type === 'rdp' || data.type === 'rdp-guacamole');
  const isVNC = data && (data.type === 'vnc' || data.type === 'vnc-guacamole');
  const isPassword = data && data.type === 'password';

  // Handler for connecting (Movido antes de los retornos condicionales)
  const handleConnect = useCallback((e) => {
    e.stopPropagation();
    if (!selectedNode || !selectedNode.data) return;

    if (isSSH && onOpenSSHConnection) {
      onOpenSSHConnection(selectedNode);
    } else if (isVNC && onOpenVncConnection) {
      onOpenVncConnection(selectedNode);
    } else if (isRDP) {
      // Dispatch event for RDP as Sidebar does
      const newTab = {
        key: selectedNode.key,
        title: selectedNode.label || selectedNode.data.host || 'RDP Session',
        type: 'rdp',
        data: selectedNode.data,
        id: selectedNode.key // Ensure ID is passed
      };
      window.dispatchEvent(new CustomEvent('create-rdp-tab', {
        detail: { tab: newTab }
      }));
    }
  }, [selectedNode, isSSH, isVNC, isRDP, onOpenSSHConnection, onOpenVncConnection]);

  // AHORA SÍ PODEMOS HACER RETORNOS CONDICIONALES
  if (!selectedNode) {
    return null;
  }

  // Si el nodo no tiene data, podría ser una carpeta
  if (!selectedNode.data && !selectedNode.droppable) {
    return null;
  }

  // Si es una carpeta, mostrar información básica
  if (isFolder) {
    return (
      <div
        ref={panelRef}
        className={`connection-details-panel ${collapsed ? 'collapsed' : ''} ${isResizing ? 'resizing' : ''}`}
        style={!collapsed ? { height: `${panelHeight}px`, maxHeight: `${panelHeight}px` } : {}}
      >
        {!collapsed && (
          <div
            className="panel-resizer"
            onMouseDown={handleResizeStart}
          />
        )}
        <div className="details-header" onClick={() => setCollapsed(!collapsed)}>
          <div className="details-title">
            <i className="pi pi-folder" style={{ fontSize: '14px', color: selectedNode.color || 'var(--ui-folder-color, #ffa726)' }}></i>
            <span>{label}</span>
          </div>
          <Button
            icon={collapsed ? "pi pi-chevron-up" : "pi pi-chevron-down"}
            className="p-button-text p-button-sm"
            onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
          />
        </div>
        {!collapsed && (
          <div className="details-content">
            <div className="details-section">
              <div className="section-title">Display</div>
              <div className="detail-row">
                <div className="detail-label">Name</div>
                <div className="detail-value">{label}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Icon</div>
                <div className="detail-value">
                  {selectedNode.icon ?
                    <span style={{ fontSize: '16px' }}>{selectedNode.icon.emoji}</span> :
                    'Folder'
                  }
                </div>
              </div>
              {selectedNode.color && (
                <div className="detail-row">
                  <div className="detail-label">Color</div>
                  <div className="detail-value">
                    <span
                      className="color-indicator"
                      style={{ backgroundColor: selectedNode.color }}
                    ></span>
                    {selectedNode.color}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Si es un password, mostrar información del password manager
  if (isPassword) {
    return (
      <div
        ref={panelRef}
        className={`connection-details-panel ${collapsed ? 'collapsed' : ''} ${isResizing ? 'resizing' : ''}`}
        style={!collapsed ? { height: `${panelHeight}px`, maxHeight: `${panelHeight}px` } : {}}
      >
        {!collapsed && (
          <div
            className="panel-resizer"
            onMouseDown={handleResizeStart}
          />
        )}
        <div className="details-header" onClick={() => setCollapsed(!collapsed)}>
          <div className="details-title">
            <i className="pi pi-key" style={{ fontSize: '14px', color: '#ffc107' }}></i>
            <span>{label}</span>
          </div>
          <Button
            icon={collapsed ? "pi pi-chevron-up" : "pi pi-chevron-down"}
            className="p-button-text p-button-sm"
            onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
          />
        </div>
        {!collapsed && (
          <div className="details-content">
            <div className="details-section">
              <div className="section-title">Display</div>
              <div className="detail-row">
                <div className="detail-label">Name</div>
                <div className="detail-value">{label}</div>
              </div>
              {data?.username && (
                <div className="detail-row">
                  <div className="detail-label">Username</div>
                  <div className="detail-value">{data.username}</div>
                </div>
              )}
              {data?.url && (
                <div className="detail-row">
                  <div className="detail-label">URL</div>
                  <div className="detail-value">{data.url}</div>
                </div>
              )}
              {data?.notes && (
                <div className="detail-row">
                  <div className="detail-label">Notes</div>
                  <div className="detail-value notes-value">{data.notes}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Para conexiones SSH, RDP, VNC
  return (
    <div
      ref={panelRef}
      className={`connection-details-panel ${collapsed ? 'collapsed' : ''} ${isResizing ? 'resizing' : ''}`}
      style={!collapsed ? { height: `${panelHeight}px`, maxHeight: `${panelHeight}px` } : {}}
    >
      {!collapsed && (
        <div
          className="panel-resizer"
          onMouseDown={handleResizeStart}
        />
      )}
      <div className="details-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="details-title">
          <i
            className={`pi ${isSSH ? 'pi-desktop' : isRDP ? 'pi-window-maximize' : 'pi-eye'}`}
            style={{
              fontSize: '14px',
              color: isSSH ? '#4caf50' : isRDP ? '#2196f3' : '#ff9800'
            }}
          ></i>
          <span>{label}</span>
        </div>
        <Button
          icon={collapsed ? "pi pi-chevron-up" : "pi pi-chevron-down"}
          className="p-button-text p-button-sm"
          onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
        />
      </div>

      {!collapsed && (
        <div className="details-content">
          <div className="connect-button-container">
            <Button
              label="Quick Connect"
              icon="pi pi-play"
              className="p-button-outlined p-button-sm connect-button"
              onClick={handleConnect}
            />
          </div>

          {/* Sección Display */}
          <div className="details-section">
            <div className="section-title">Display</div>
            <EditableField
              label="Name"
              value={label}
              onEdit={() => startEdit('display', 'name', label)}
              isEditing={editingField?.section === 'display' && editingField?.field === 'name'}
              editValue={editValue}
              onValueChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              onKeyDown={handleKeyDown}
              fieldKey="display-name"
              inputRefs={inputRefs}
            />
            <EditableField
              label="Description"
              value={data?.description || 'mRemoteNG'}
              onEdit={() => startEdit('display', 'description', data?.description || 'mRemoteNG')}
              isEditing={editingField?.section === 'display' && editingField?.field === 'description'}
              editValue={editValue}
              onValueChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              onKeyDown={handleKeyDown}
              fieldKey="display-description"
              inputRefs={inputRefs}
            />
          </div>

          {/* Sección Connection */}
          <div className="details-section">
            <div className="section-title">Connection</div>
            <EditableField
              label="Hostname/IP"
              value={data?.useBastionWallix ? data?.targetServer : (data?.host || data?.hostname || data?.server || '')}
              onEdit={() => startEdit('connection', 'hostname', data?.useBastionWallix ? data?.targetServer : (data?.host || data?.hostname || data?.server || ''))}
              isEditing={editingField?.section === 'connection' && editingField?.field === 'hostname'}
              editValue={editValue}
              onValueChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              onKeyDown={handleKeyDown}
              fieldKey="connection-hostname"
              inputRefs={inputRefs}
              onCopy={copyToClipboard}
              copyValue={data?.useBastionWallix ? data?.targetServer : (data?.host || data?.hostname || data?.server || '')}
            />
            <EditableField
              label="Username"
              value={data?.user || data?.username || ''}
              onEdit={() => startEdit('connection', 'username', data?.user || data?.username || '')}
              isEditing={editingField?.section === 'connection' && editingField?.field === 'username'}
              editValue={editValue}
              onValueChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              onKeyDown={handleKeyDown}
              fieldKey="connection-username"
              inputRefs={inputRefs}
              onCopy={copyToClipboard}
              copyValue={data?.user || data?.username || ''}
            />
            <EditableField
              label="Password"
              value={data?.password ? '••••••••' : ''}
              onEdit={() => startEdit('connection', 'password', data?.password || '')}
              isEditing={editingField?.section === 'connection' && editingField?.field === 'password'}
              editValue={editValue}
              onValueChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              onKeyDown={handleKeyDown}
              fieldKey="connection-password"
              inputRefs={inputRefs}
              isPassword={true}
              onCopy={copyToClipboard}
              copyValue={data?.password || ''}
            />
            {isRDP && (
              <EditableField
                label="Domain"
                value={data?.domain || ''}
                onEdit={() => startEdit('connection', 'domain', data?.domain || '')}
                isEditing={editingField?.section === 'connection' && editingField?.field === 'domain'}
                editValue={editValue}
                onValueChange={setEditValue}
                onSave={saveEdit}
                onCancel={cancelEdit}
                onKeyDown={handleKeyDown}
                fieldKey="connection-domain"
                inputRefs={inputRefs}
              />
            )}
          </div>

          {/* Sección Protocol */}
          <div className="details-section">
            <div className="section-title">Protocol</div>
            <div className="detail-row">
              <div className="detail-label">Protocol</div>
              <div className="detail-value">
                {isSSH ? 'SSH' : isRDP ? 'RDP' : isVNC ? 'VNC' : 'Unknown'}
              </div>
            </div>
            <EditableField
              label="Port"
              value={String(data?.port || (isSSH ? '22' : isRDP ? '3389' : '5900'))}
              onEdit={() => startEdit('protocol', 'port', String(data?.port || (isSSH ? '22' : isRDP ? '3389' : '5900')))}
              isEditing={editingField?.section === 'protocol' && editingField?.field === 'port'}
              editValue={editValue}
              onValueChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              onKeyDown={handleKeyDown}
              fieldKey="protocol-port"
              inputRefs={inputRefs}
            />

            {isRDP && (
              <>
                <div className="detail-row">
                  <div className="detail-label">Use Console Session</div>
                  <div className="detail-value">{data?.useConsoleSession ? 'Yes' : 'No'}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Server Authentication</div>
                  <div className="detail-value">
                    {data?.serverAuthentication || 'Always connect, even if authentication fails'}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sección RDP - Resolution */}
          {isRDP && (
            <div className="details-section">
              <div className="section-title">RDP Settings</div>
              <div className="detail-row">
                <div className="detail-label">Resolution</div>
                <div className="detail-value">{data?.resolution || '1024x768'}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Colors</div>
                <div className="detail-value">{data?.colors || '32'} bit</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Redirect Keys</div>
                <div className="detail-value">{data?.redirectKeys === 'true' ? 'Yes' : 'No'}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Redirect Drives</div>
                <div className="detail-value">{data?.redirectDrives === 'true' ? 'Yes' : 'No'}</div>
              </div>
            </div>
          )}

          {/* Sección SSH - Bastion Wallix */}
          {isSSH && data?.useBastionWallix && (
            <div className="details-section">
              <div className="section-title">Bastion Wallix</div>
              <div className="detail-row">
                <div className="detail-label">Use Bastion</div>
                <div className="detail-value">Yes</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Bastion Host</div>
                <div className="detail-value">{data?.bastionHost || ''}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Bastion User</div>
                <div className="detail-value">{data?.bastionUser || ''}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Target Server</div>
                <div className="detail-value">{data?.targetServer || ''}</div>
              </div>
            </div>
          )}

          {/* Sección SSH - Folders */}
          {isSSH && (
            <div className="details-section">
              <div className="section-title">Folders</div>
              <EditableField
                label="Remote Folder"
                value={data?.remoteFolder || ''}
                onEdit={() => startEdit('folders', 'remote', data?.remoteFolder || '')}
                isEditing={editingField?.section === 'folders' && editingField?.field === 'remote'}
                editValue={editValue}
                onValueChange={setEditValue}
                onSave={saveEdit}
                onCancel={cancelEdit}
                onKeyDown={handleKeyDown}
                fieldKey="folders-remote"
                inputRefs={inputRefs}
              />
              <EditableField
                label="Target Folder"
                value={data?.targetFolder || ''}
                onEdit={() => startEdit('folders', 'target', data?.targetFolder || '')}
                isEditing={editingField?.section === 'folders' && editingField?.field === 'target'}
                editValue={editValue}
                onValueChange={setEditValue}
                onSave={saveEdit}
                onCancel={cancelEdit}
                onKeyDown={handleKeyDown}
                fieldKey="folders-target"
                inputRefs={inputRefs}
              />
            </div>
          )}

          {/* Sección VNC */}
          {isVNC && (
            <div className="details-section">
              <div className="section-title">VNC Settings</div>
              <div className="detail-row">
                <div className="detail-label">Color Depth</div>
                <div className="detail-value">{data?.vncColorDepth || 'Default'}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Compression</div>
                <div className="detail-value">{data?.vncCompression || 'Default'}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionDetailsPanel;

