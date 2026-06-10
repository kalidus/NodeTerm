import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from 'primereact/button';
import TerminalFrame from './TerminalFrame';
import { getNetworkById } from '../utils/cryptoNetworks';
import { isFavorite, toggleFavorite } from '../utils/connectionStore';
import '../styles/components/connection-details-panel.css';

const SECRET_TYPES = ['password', 'crypto_wallet', 'api_key', 'secure_note'];

const CopyableDetailRow = ({ label, value, copyValue, masked = false, onCopy, multiline = false }) => {
  if (!value && !copyValue) return null;

  const displayValue = masked && copyValue ? '••••••••' : (value || copyValue);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (onCopy && copyValue) {
      onCopy(copyValue, label);
    }
  };

  return (
    <div className="detail-row">
      <div className="detail-label">{label}</div>
      <div
        className={`detail-value${multiline ? ' notes-value' : ''}`}
        style={{ display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: '4px' }}
      >
        <span style={{ flex: 1 }}>{displayValue}</span>
        {onCopy && copyValue && (
          <i
            className="pi pi-copy"
            style={{
              fontSize: '10px',
              opacity: 0.5,
              cursor: 'pointer',
              padding: '2px',
              transition: 'opacity 0.2s',
              flexShrink: 0
            }}
            onClick={handleCopy}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
            title="Copiar"
          />
        )}
      </div>
    </div>
  );
};

const getSecretIcon = (secretType) => {
  switch (secretType) {
    case 'crypto_wallet':
      return <i className="pi pi-wallet" style={{ fontSize: '14px', color: '#F7931A' }} />;
    case 'api_key':
      return <i className="pi pi-key" style={{ fontSize: '14px', color: '#00BCD4' }} />;
    case 'secure_note':
      return <i className="pi pi-file-edit" style={{ fontSize: '14px', color: '#9C27B0' }} />;
    case 'password':
    default:
      return <i className="pi pi-lock" style={{ fontSize: '14px', color: '#E91E63' }} />;
  }
};

const PasswordDetailsPanel = ({
  selectedNode,
  onCopy = null,
  collapsed: controlledCollapsed,
  onCollapseChange
}) => {
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isControlled = controlledCollapsed !== undefined;
  const collapsed = isControlled ? controlledCollapsed : localCollapsed;
  const setCollapsed = (val) => {
    if (isControlled) {
      onCollapseChange?.(val);
    } else {
      setLocalCollapsed(val);
    }
  };
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = localStorage.getItem('passwordDetailsPanelHeight');
    return saved ? parseInt(saved, 10) : 200;
  });
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

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
    const delta = resizeStartY.current - e.clientY;
    const newHeight = Math.max(150, Math.min(500, resizeStartHeight.current + delta));
    setPanelHeight(newHeight);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('passwordDetailsPanelHeight', panelHeight.toString());
    }
  }, [isResizing, panelHeight]);

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

  const data = selectedNode?.data;
  const label = selectedNode?.label;
  const secretType = data?.type || 'password';
  const isFolder = selectedNode?.droppable || data?.type === 'password-folder';
  const isSecret = data && SECRET_TYPES.includes(secretType);

  const [favStatus, setFavStatus] = useState(false);
  const secretConnection = selectedNode ? {
    id: selectedNode.key,
    type: selectedNode.data?.type || 'password',
    name: selectedNode.label,
    ...selectedNode.data
  } : null;

  useEffect(() => {
    if (secretConnection) {
      setFavStatus(isFavorite(secretConnection));
    }
  }, [selectedNode]);

  useEffect(() => {
    const handleFavsUpdate = () => {
      if (secretConnection) {
        setFavStatus(isFavorite(secretConnection));
      }
    };
    window.addEventListener('connections-updated', handleFavsUpdate);
    return () => {
      window.removeEventListener('connections-updated', handleFavsUpdate);
    };
  }, [selectedNode]);

  const handleToggleFav = (e) => {
    e.stopPropagation();
    if (secretConnection) {
      toggleFavorite(secretConnection);
      setFavStatus(isFavorite(secretConnection));
    }
  };

  if (!selectedNode || isFolder || data?.isShowMoreBtn || !isSecret) {
    return null;
  }

  const chevronBtn = (
    <Button
      icon={collapsed ? 'pi pi-chevron-up' : 'pi pi-chevron-down'}
      className="p-button-text p-button-sm panel-toggle-button"
      onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
    />
  );

  const renderFields = () => {
    switch (secretType) {
      case 'password':
        return (
          <>
            <CopyableDetailRow
              label="Usuario"
              value={data.username}
              copyValue={data.username}
              onCopy={onCopy}
            />
            <CopyableDetailRow
              label="Contraseña"
              value={data.password ? '••••••••' : ''}
              copyValue={data.password}
              masked
              onCopy={onCopy}
            />
            <CopyableDetailRow
              label="URL"
              value={data.url}
              copyValue={data.url}
              onCopy={onCopy}
            />
            {data.group && (
              <div className="detail-row">
                <div className="detail-label">Grupo</div>
                <div className="detail-value">{data.group}</div>
              </div>
            )}
            <CopyableDetailRow
              label="Notas"
              value={data.notes}
              copyValue={data.notes}
              onCopy={onCopy}
              multiline
            />
            {!data.username && !data.password && !data.url && !data.group && !data.notes && (
              <div className="detail-row">
                <div className="detail-label">Nombre</div>
                <div className="detail-value">{label}</div>
              </div>
            )}
          </>
        );
      case 'crypto_wallet': {
        const network = getNetworkById(data.network);
        return (
          <>
            {network && (
              <div className="detail-row">
                <div className="detail-label">Red</div>
                <div className="detail-value">{network.name} ({network.symbol})</div>
              </div>
            )}
            <CopyableDetailRow
              label="Dirección"
              value={data.address}
              copyValue={data.address}
              onCopy={onCopy}
            />
            <CopyableDetailRow
              label="Seed phrase"
              value={data.seedPhrase ? '••••••••' : ''}
              copyValue={data.seedPhrase}
              masked
              onCopy={onCopy}
            />
            <CopyableDetailRow
              label="Clave privada"
              value={data.privateKey ? '••••••••' : ''}
              copyValue={data.privateKey}
              masked
              onCopy={onCopy}
            />
            <CopyableDetailRow
              label="Passphrase"
              value={data.passphrase ? '••••••••' : ''}
              copyValue={data.passphrase}
              masked
              onCopy={onCopy}
            />
            <CopyableDetailRow
              label="Notas"
              value={data.notes}
              copyValue={data.notes}
              onCopy={onCopy}
              multiline
            />
          </>
        );
      }
      case 'api_key':
        return (
          <>
            {data.serviceName && (
              <div className="detail-row">
                <div className="detail-label">Servicio</div>
                <div className="detail-value">{data.serviceName}</div>
              </div>
            )}
            <CopyableDetailRow
              label="API Key"
              value={data.apiKey ? '••••••••' : ''}
              copyValue={data.apiKey}
              masked
              onCopy={onCopy}
            />
            <CopyableDetailRow
              label="API Secret"
              value={data.apiSecret ? '••••••••' : ''}
              copyValue={data.apiSecret}
              masked
              onCopy={onCopy}
            />
            <CopyableDetailRow
              label="Endpoint"
              value={data.endpoint}
              copyValue={data.endpoint}
              onCopy={onCopy}
            />
            <CopyableDetailRow
              label="Notas"
              value={data.notes}
              copyValue={data.notes}
              onCopy={onCopy}
              multiline
            />
          </>
        );
      case 'secure_note':
        return (
          <>
            <CopyableDetailRow
              label="Contenido"
              value={data.noteContent}
              copyValue={data.noteContent}
              onCopy={onCopy}
              multiline
            />
            <CopyableDetailRow
              label="Notas"
              value={data.notes}
              copyValue={data.notes}
              onCopy={onCopy}
              multiline
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`connection-details-panel password-details-panel ${collapsed ? 'collapsed' : ''} ${isResizing ? 'resizing' : ''}`}
      style={!collapsed ? { height: `${panelHeight}px`, maxHeight: `${panelHeight}px` } : {}}
      ref={panelRef}
    >
      {!collapsed && (
        <div
          className="panel-resizer"
          onMouseDown={handleResizeStart}
          style={{ zIndex: 100, top: '-2px', height: '6px' }}
        />
      )}
      <TerminalFrame
        style={{ height: '100%', width: '100%' }}
        showControls={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {getSecretIcon(secretType)}
            <span>{label}</span>
          </div>
        }
        headerExtra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Button
              icon={favStatus ? 'pi pi-star-fill' : 'pi pi-star'}
              className="p-button-text p-button-sm panel-toggle-button"
              onClick={handleToggleFav}
              style={{ color: favStatus ? '#ffd700' : undefined }}
              tooltip={favStatus ? "Quitar de favoritos" : "Añadir a favoritos"}
            />
            {chevronBtn}
          </div>
        }
        onMinimize={(e) => { e?.stopPropagation(); setCollapsed(true); }}
        onMaximize={(e) => { e?.stopPropagation(); setCollapsed(false); }}
        onClose={(e) => { e?.stopPropagation(); setCollapsed(true); }}
      >
        {!collapsed && (
          <div className="details-content">
            <div className="details-section">
              <div className="section-title">Detalles</div>
              {renderFields()}
            </div>
          </div>
        )}
      </TerminalFrame>
    </div>
  );
};

export default PasswordDetailsPanel;
