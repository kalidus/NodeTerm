import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from 'primereact/button';
import { useTranslation } from '../i18n/hooks/useTranslation';
import TerminalFrame from './TerminalFrame';

const DocumentDetailsPanel = ({
  selectedNode,
  uiTheme = 'Light',
  onOpenDocument = null
}) => {
  const { t } = useTranslation('common');
  const [collapsed, setCollapsed] = useState(false);
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = localStorage.getItem('documentDetailsPanelHeight');
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
    const delta = resizeStartY.current - e.clientY; // Arrastramos hacia arriba
    const newHeight = Math.max(150, Math.min(500, resizeStartHeight.current + delta));
    setPanelHeight(newHeight);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('documentDetailsPanelHeight', panelHeight.toString());
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
  const isFolder = selectedNode?.droppable || selectedNode?.type === 'document-folder';

  const handleOpenClick = useCallback((e) => {
    e.stopPropagation();
    if (selectedNode && onOpenDocument) {
      onOpenDocument(selectedNode);
    }
  }, [selectedNode, onOpenDocument]);

  // Si no hay nodo seleccionado o es una carpeta, no mostramos el panel
  if (!selectedNode || isFolder) {
    return null;
  }

  const Wrapper = ({ children, iconNode, rightButtons }) => (
    <div
      className={`connection-details-panel document-details-panel ${collapsed ? 'collapsed' : ''} ${isResizing ? 'resizing' : ''}`}
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
            {iconNode}
            <span>{label}</span>
          </div>
        }
        headerExtra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {rightButtons}
          </div>
        }
        onMinimize={(e) => { e?.stopPropagation(); setCollapsed(true); }}
        onMaximize={(e) => { e?.stopPropagation(); setCollapsed(false); }}
        onClose={(e) => { e?.stopPropagation(); setCollapsed(true); }}
      >
        {!collapsed && (
          <div className="details-content">
            {children}
          </div>
        )}
      </TerminalFrame>
    </div>
  );

  const chevronBtn = (
    <Button
      icon={collapsed ? "pi pi-chevron-up" : "pi pi-chevron-down"}
      className="p-button-text p-button-sm panel-toggle-button"
      onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
    />
  );

  // Vista previa HTML o texto
  const hasPreview = !!(data?.content && data.content.trim() !== '<p></p>' && data.content.trim() !== '');

  return (
    <Wrapper
      iconNode={<i className="pi pi-file" style={{ fontSize: '14px', color: '#64b5f6' }}></i>}
      rightButtons={
        <>
          <Button
            icon="pi pi-external-link"
            className="p-button-text p-button-sm panel-toggle-button"
            onClick={handleOpenClick}
            tooltip="Abrir nota"
            tooltipOptions={{ showDelay: 500, position: 'bottom' }}
            style={{ color: 'var(--ui-primary-color, #4caf50)', opacity: 0.8 }}
          />
          {chevronBtn}
        </>
      }
    >
      <div className="note-preview-container">
        {hasPreview ? (
          <div 
            className="note-preview-content" 
            dangerouslySetInnerHTML={{ __html: data.content }}
          />
        ) : (
          <div className="note-preview-empty">
            Nota vacía
          </div>
        )}
      </div>
    </Wrapper>
  );
};

export default DocumentDetailsPanel;
