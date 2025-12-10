import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from 'primereact/button';
import { useTranslation } from '../i18n/hooks/useTranslation';
import '../styles/components/connection-details-panel.css';

const ConnectionDetailsPanel = ({ 
  selectedNode, 
  uiTheme = 'Light',
  sessionActionIconTheme = 'modern'
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
  const panelRef = useRef(null);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

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

  // AHORA SÍ PODEMOS HACER RETORNOS CONDICIONALES
  if (!selectedNode) {
    return null;
  }

  // Si el nodo no tiene data, podría ser una carpeta
  if (!selectedNode.data && !selectedNode.droppable) {
    return null;
  }

  const { data, label } = selectedNode;
  const isFolder = selectedNode.droppable;
  const isSSH = data && data.type === 'ssh';
  const isRDP = data && (data.type === 'rdp' || data.type === 'rdp-guacamole');
  const isVNC = data && (data.type === 'vnc' || data.type === 'vnc-guacamole');
  const isPassword = data && data.type === 'password';

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
        <div className="details-header">
        <div className="details-title">
          <i className="pi pi-folder" style={{ marginRight: '6px', fontSize: '12px', color: selectedNode.color || '#ffa726' }}></i>
          <span>{label}</span>
        </div>
          <Button
            icon={collapsed ? "pi pi-chevron-up" : "pi pi-chevron-down"}
            className="p-button-text p-button-sm"
            onClick={() => setCollapsed(!collapsed)}
            style={{ 
              minWidth: '20px', 
              width: '20px',
              height: '20px',
              padding: 0,
              fontSize: '10px'
            }}
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
                    'Carpeta'
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
        <div className="details-header">
        <div className="details-title">
          <i className="pi pi-key" style={{ marginRight: '6px', fontSize: '12px', color: '#ffc107' }}></i>
          <span>{label}</span>
        </div>
          <Button
            icon={collapsed ? "pi pi-chevron-up" : "pi pi-chevron-down"}
            className="p-button-text p-button-sm"
            onClick={() => setCollapsed(!collapsed)}
            style={{ 
              minWidth: '20px', 
              width: '20px',
              height: '20px',
              padding: 0,
              fontSize: '10px'
            }}
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
      <div className="details-header">
        <div className="details-title">
          <i 
            className={`pi ${isSSH ? 'pi-desktop' : isRDP ? 'pi-window-maximize' : 'pi-eye'}`} 
            style={{ 
              marginRight: '6px',
              fontSize: '12px',
              color: isSSH ? '#4caf50' : isRDP ? '#2196f3' : '#ff9800' 
            }}
          ></i>
          <span>{label}</span>
        </div>
        <Button
          icon={collapsed ? "pi pi-chevron-up" : "pi pi-chevron-down"}
          className="p-button-text p-button-sm"
          onClick={() => setCollapsed(!collapsed)}
          style={{ 
            minWidth: '20px', 
            width: '20px',
            height: '20px',
            padding: 0,
            fontSize: '10px'
          }}
        />
      </div>
      
      {!collapsed && (
        <div className="details-content">
          {/* Sección Display */}
          <div className="details-section">
            <div className="section-title">Display</div>
            <div className="detail-row">
              <div className="detail-label">Name</div>
              <div className="detail-value">{label}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Description</div>
              <div className="detail-value">{data?.description || 'mRemoteNG'}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Icon</div>
              <div className="detail-value">{isSSH ? 'mRemoteNG' : isRDP ? 'mRemoteNG' : 'mRemoteNG'}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Panel</div>
              <div className="detail-value">General</div>
            </div>
          </div>

          {/* Sección Connection */}
          <div className="details-section">
            <div className="section-title">Connection</div>
            <div className="detail-row">
              <div className="detail-label">Hostname/IP</div>
              <div className="detail-value">
                {data?.useBastionWallix ? data?.targetServer : (data?.host || data?.hostname || data?.server || '')}
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Username</div>
              <div className="detail-value">{data?.user || data?.username || ''}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Password</div>
              <div className="detail-value">
                {data?.password ? '••••••••' : ''}
              </div>
            </div>
            {isRDP && data?.domain && (
              <div className="detail-row">
                <div className="detail-label">Domain</div>
                <div className="detail-value">{data.domain}</div>
              </div>
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
            <div className="detail-row">
              <div className="detail-label">Port</div>
              <div className="detail-value">{data?.port || (isSSH ? '22' : isRDP ? '3389' : '5900')}</div>
            </div>
            
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
              <div className="section-title">RDP</div>
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
          {isSSH && (data?.remoteFolder || data?.targetFolder) && (
            <div className="details-section">
              <div className="section-title">Folders</div>
              {data?.remoteFolder && (
                <div className="detail-row">
                  <div className="detail-label">Remote Folder</div>
                  <div className="detail-value">{data.remoteFolder}</div>
                </div>
              )}
              {data?.targetFolder && (
                <div className="detail-row">
                  <div className="detail-label">Target Folder</div>
                  <div className="detail-value">{data.targetFolder}</div>
                </div>
              )}
            </div>
          )}

          {/* Sección VNC */}
          {isVNC && (
            <div className="details-section">
              <div className="section-title">VNC</div>
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

