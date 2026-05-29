import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { useTranslation } from '../i18n/hooks/useTranslation';
import TerminalFrame from './TerminalFrame';

// Componente local para campos editables
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
  inputRefs
}) => {
  const inputRef = (el) => {
    if (el && fieldKey) {
      inputRefs.current[fieldKey] = el;
    }
  };

  if (isEditing) {
    return (
      <div className="detail-row editing">
        <div className="detail-label">{label}</div>
        <div className="detail-value">
          <InputText
            ref={inputRef}
            value={editValue}
            onChange={(e) => onValueChange(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={onSave}
            className="editable-input"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="detail-row" onClick={onEdit} style={{ cursor: 'pointer' }}>
      <div className="detail-label">{label}</div>
      <div className="detail-value editable-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ flex: 1 }}>{value || <span style={{ opacity: 0.5 }}>Click para editar</span>}</span>
        <i className="pi pi-pencil" style={{ fontSize: '10px', opacity: 0.5 }}></i>
      </div>
    </div>
  );
};

const DocumentDetailsPanel = ({
  selectedNode,
  uiTheme = 'Light',
  onNodeUpdate = null,
  onOpenDocument = null
}) => {
  const { t } = useTranslation('common');
  const [collapsed, setCollapsed] = useState(false);
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = localStorage.getItem('documentDetailsPanelHeight');
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

  // Focus en el input al iniciar edición
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

  const startEdit = useCallback((section, field, currentValue) => {
    setEditingField({ section, field });
    setEditValue(currentValue || '');
  }, []);

  const saveEdit = useCallback(() => {
    if (!selectedNode || !editingField || !onNodeUpdate) return;
    const { section, field } = editingField;
    const updatedNode = { ...selectedNode };

    if (section === 'display' && field === 'name') {
      updatedNode.label = editValue;
    }

    onNodeUpdate(updatedNode);
    setEditingField(null);
    setEditValue('');
  }, [selectedNode, editingField, editValue, onNodeUpdate]);

  const cancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValue('');
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  const data = selectedNode?.data;
  const label = selectedNode?.label;
  const isFolder = selectedNode?.droppable || selectedNode?.type === 'document-folder';

  const handleOpenClick = useCallback((e) => {
    e.stopPropagation();
    if (selectedNode && onOpenDocument) {
      onOpenDocument(selectedNode);
    }
  }, [selectedNode, onOpenDocument]);

  if (!selectedNode) {
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

  const formatDate = (ts) => {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleString();
  };

  if (isFolder) {
    return (
      <Wrapper
        iconNode={<i className="pi pi-folder" style={{ fontSize: '14px', color: '#ffc107' }}></i>}
        rightButtons={chevronBtn}
      >
        <div className="details-section">
          <div className="section-title">Display</div>
          <EditableField
            label="Nombre"
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
          <div className="detail-row">
            <div className="detail-label">Creado</div>
            <div className="detail-value">{formatDate(data?.createdAt)}</div>
          </div>
        </div>
      </Wrapper>
    );
  }

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
      <div className="details-section">
        <div className="section-title">Display</div>
        <EditableField
          label="Nombre"
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
        <div className="detail-row">
          <div className="detail-label">Creado</div>
          <div className="detail-value">{formatDate(data?.createdAt)}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Modificado</div>
          <div className="detail-value">{formatDate(data?.updatedAt)}</div>
        </div>
      </div>

      <div className="details-section">
        <div className="section-title">Vista Previa</div>
        {hasPreview ? (
          <div 
            className="detail-value notes-value note-preview-box" 
            dangerouslySetInnerHTML={{ __html: data.content }}
          />
        ) : (
          <div className="detail-value notes-value note-preview-box empty-preview" style={{ opacity: 0.5, fontStyle: 'italic' }}>
            Nota vacía
          </div>
        )}
      </div>
    </Wrapper>
  );
};

export default DocumentDetailsPanel;
