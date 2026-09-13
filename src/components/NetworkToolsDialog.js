/**
 * NetworkToolsDialog.js - Diálogo y panel autónomo de herramientas de red y seguridad
 * 
 * Componente modularizado que orquesta las herramientas de red mediante toolRegistry
 * y subpaneles especializados en src/components/network-tools/.
 */

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';
import {
  TOOL_CATEGORIES,
  TOOL_COMPONENTS,
  findToolMetadata
} from './network-tools/toolRegistry';

const NetworkToolsDialog = ({ visible, onHide, standalone = false, toolId = null }) => {
  // Categoría y herramienta seleccionada
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (toolId) {
      const cat = TOOL_CATEGORIES.find(c => c.tools.some(t => t.id === toolId));
      return cat?.id || 'connectivity';
    }
    return 'connectivity';
  });

  const [selectedTool, setSelectedTool] = useState(() => {
    if (toolId) return toolId;
    return 'ping';
  });

  // Filtro de búsqueda en la barra lateral
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Actualizar herramienta si cambia la prop toolId
  useEffect(() => {
    if (toolId) {
      setSelectedTool(toolId);
      const cat = TOOL_CATEGORIES.find(c => c.tools.some(t => t.id === toolId));
      if (cat) setSelectedCategory(cat.id);
    }
  }, [toolId]);

  // Dimensiones del diálogo
  const [dialogSize, setDialogSize] = useState(() => {
    try {
      const saved = localStorage.getItem('network-tools-dialog-size');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          width: Math.max(800, Math.min(window.innerWidth * 0.95, parsed.width || window.innerWidth * 0.9)),
          height: Math.max(600, Math.min(window.innerHeight * 0.95, parsed.height || window.innerHeight * 0.85))
        };
      }
    } catch (e) {
      console.warn('Error loading dialog size:', e);
    }
    return {
      width: Math.max(800, Math.min(1200, window.innerWidth * 0.9)),
      height: Math.max(600, Math.min(800, window.innerHeight * 0.85))
    };
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [themeVersion, setThemeVersion] = useState(0);

  // Escuchar cambios de tema y resize
  useEffect(() => {
    const onThemeChanged = () => setThemeVersion(v => v + 1);
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('theme-changed', onThemeChanged);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('theme-changed', onThemeChanged);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const currentTheme = useMemo(() => {
    return themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [themeVersion]);

  const themeColors = useMemo(() => {
    return {
      background: currentTheme.colors?.contentBackground || 'var(--ui-content-bg, #10141c)',
      cardBackground: currentTheme.colors?.dialogBackground || 'rgba(16, 20, 28, 0.6)',
      textPrimary: currentTheme.colors?.sidebarText || currentTheme.colors?.tabText || '#ffffff',
      textSecondary: currentTheme.colors?.sidebarText || '#9E9E9E',
      borderColor: currentTheme.colors?.sidebarBorder || currentTheme.colors?.contentBorder || 'rgba(255,255,255,0.1)',
      primaryColor: currentTheme.colors?.buttonPrimary || currentTheme.colors?.primaryColor || '#2196f3',
      hoverBackground: currentTheme.colors?.sidebarHover || 'rgba(255,255,255,0.1)',
    };
  }, [currentTheme]);

  // Centrado del diálogo modal
  useEffect(() => {
    if (standalone || !visible) return;

    const timer = setTimeout(() => {
      const dialogElement = document.querySelector('.network-tools-dialog .p-dialog');
      if (dialogElement) {
        dialogElement.style.width = `${dialogSize.width}px`;
        dialogElement.style.height = `${dialogSize.height}px`;
        const left = Math.max(0, (window.innerWidth - dialogSize.width) / 2);
        const top = Math.max(0, (window.innerHeight - dialogSize.height) / 2);
        dialogElement.style.left = `${left}px`;
        dialogElement.style.top = `${top}px`;
        setIsMobile(dialogSize.width < 900);
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [visible, standalone, dialogSize.width, dialogSize.height]);

  const handleToolSelect = (categoryId, tool) => {
    setSelectedCategory(categoryId);
    setSelectedTool(tool);
  };

  // Filtrado de categorías según el texto de búsqueda (para el modal)
  const filteredCategories = useMemo(() => {
    const query = sidebarSearch.trim().toLowerCase();
    if (!query) return TOOL_CATEGORIES;

    return TOOL_CATEGORIES.map(cat => {
      const matchingTools = cat.tools.filter(t =>
        t.label.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query)
      );
      return { ...cat, tools: matchingTools };
    }).filter(cat => cat.tools.length > 0);
  }, [sidebarSearch]);

  // En modo standalone, priorizar toolId directo si se proporciona
  const activeToolId = (standalone && toolId) ? toolId : selectedTool;
  const ActiveToolComponent = TOOL_COMPONENTS[activeToolId] || null;

  // Renderizador del contenido interno para el diálogo modal (con sidebar de navegación)
  const renderModalContent = () => (
    <div
      className="network-tools-dialog-content"
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        background: themeColors.background,
        color: themeColors.textPrimary
      }}
    >
      {/* Sidebar de categorías y herramientas */}
      <div
        className="network-tools-sidebar"
        style={{
          width: isMobile ? '100%' : '240px',
          minWidth: isMobile ? 'auto' : '220px',
          maxWidth: isMobile ? '100%' : '260px',
          background: 'rgba(0,0,0,0.22)',
          borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
          borderBottom: isMobile ? '1px solid rgba(255,255,255,0.08)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden'
        }}
      >
        {/* Buscador de herramientas */}
        <div style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="p-input-icon-left" style={{ width: '100%' }}>
            <i className="pi pi-search" style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }} />
            <InputText
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Buscar herramienta..."
              style={{
                width: '100%',
                fontSize: '0.78rem',
                padding: '0.35rem 0.5rem 0.35rem 1.8rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: 'var(--text-color)'
              }}
            />
          </span>
        </div>

        {/* Lista de categorías */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem 0' }}>
          {filteredCategories.map(category => (
            <div key={category.id} style={{ marginBottom: '0.5rem' }}>
              <div
                style={{
                  padding: '0.4rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: category.color,
                  fontWeight: '700',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  opacity: 0.95
                }}
              >
                <i className={category.icon} style={{ fontSize: '0.8rem' }} />
                <span>{category.label}</span>
              </div>

              {category.tools.map(tool => {
                const isSelected = selectedTool === tool.id;
                return (
                  <div
                    key={tool.id}
                    onClick={() => handleToolSelect(category.id, tool.id)}
                    style={{
                      padding: '0.5rem 0.85rem 0.5rem 1.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      background: isSelected ? 'rgba(255,255,255,0.09)' : 'transparent',
                      borderLeft: `3px solid ${isSelected ? category.color : 'transparent'}`,
                      transition: 'all 0.15s ease',
                      color: isSelected ? 'var(--text-color)' : 'var(--text-color-secondary)',
                      fontWeight: isSelected ? '600' : 'normal',
                      fontSize: '0.82rem'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <i className={tool.icon} style={{ fontSize: '0.82rem', opacity: isSelected ? 1 : 0.7, color: isSelected ? category.color : 'inherit' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tool.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Área principal de la herramienta seleccionada en modal */}
      <div className="network-tools-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', background: 'rgba(0,0,0,0.1)' }}>
        <Suspense
          fallback={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', gap: '1rem', color: 'var(--text-color-secondary)' }}>
              <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="4" />
              <span style={{ fontSize: '0.85rem' }}>Cargando herramienta...</span>
            </div>
          }
        >
          {ActiveToolComponent ? (
            <ActiveToolComponent isMobile={isMobile} standalone={false} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-color-secondary)' }}>
              <span>Selecciona una herramienta del menú lateral.</span>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );

  const styleBlock = (
    <style>{`
      .network-tools-dialog .p-dialog {
        position: fixed !important;
        max-width: 95vw !important;
        max-height: 95vh !important;
        min-width: 780px !important;
        min-height: 550px !important;
        margin: 0 !important;
        border-radius: 8px !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6) !important;
        transition: width 0.2s ease, height 0.2s ease !important;
      }
      .network-tools-dialog .p-dialog-mask {
        background-color: rgba(0, 0, 0, 0.85) !important;
      }
      .network-tools-dialog .p-dialog-content {
        display: flex !important;
        flex-direction: column !important;
        padding: 0 !important;
        overflow: hidden !important;
        flex: 1 !important;
      }
      .network-tools-sidebar::-webkit-scrollbar,
      .network-tools-main::-webkit-scrollbar,
      .network-tools-standalone::-webkit-scrollbar {
        width: 6px !important;
        height: 6px !important;
      }
      .network-tools-sidebar::-webkit-scrollbar-track,
      .network-tools-main::-webkit-scrollbar-track,
      .network-tools-standalone::-webkit-scrollbar-track {
        background: ${themeColors.background} !important;
      }
      .network-tools-sidebar::-webkit-scrollbar-thumb,
      .network-tools-main::-webkit-scrollbar-thumb,
      .network-tools-standalone::-webkit-scrollbar-thumb {
        background: ${themeColors.borderColor} !important;
        border-radius: 3px !important;
      }
    `}</style>
  );

  // Modo Standalone (cuando se abre dentro de una pestaña individual de NodeTerm)
  // En este modo, NO se renderiza la barra lateral repetida: la herramienta seleccionada ocupa el 100% de la pestaña
  // con fondo completamente opaco según el tema activo para evitar que se transparente el fondo o el HomeTab.
  if (standalone) {
    return (
      <div
        className="network-tools-standalone"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: themeColors.background,
          color: themeColors.textPrimary
        }}
      >
        {styleBlock}
        <div
          className="network-tools-main"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
            background: 'rgba(0, 0, 0, 0.06)'
          }}
        >
          <Suspense
            fallback={
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '300px',
                  gap: '1rem',
                  color: 'var(--text-color-secondary)'
                }}
              >
                <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="4" />
                <span style={{ fontSize: '0.85rem' }}>Cargando herramienta...</span>
              </div>
            }
          >
            {ActiveToolComponent ? (
              <ActiveToolComponent isMobile={isMobile} standalone={true} />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-color-secondary)'
                }}
              >
                <span>Herramienta no encontrada ({activeToolId}).</span>
              </div>
            )}
          </Suspense>
        </div>
      </div>
    );
  }

  // Modo Diálogo Modal
  return (
    <>
      {styleBlock}
      <Dialog
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.3) 0%, rgba(33, 150, 243, 0.1) 100%)',
                border: '1px solid rgba(33, 150, 243, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="pi pi-globe" style={{ color: '#2196f3', fontSize: '0.9rem' }} />
            </div>
            <div>
              <span style={{ fontSize: '1rem', fontWeight: '700' }}>Herramientas de Red y Seguridad</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', marginLeft: '0.75rem', fontWeight: 'normal' }}>
                Diagnóstico, escaneo y análisis
              </span>
            </div>
          </div>
        }
        visible={visible}
        onHide={onHide}
        className="network-tools-dialog"
        resizable
        maximizable
        modal
        style={{
          width: `${dialogSize.width}px`,
          height: `${dialogSize.height}px`,
          maxWidth: '95vw',
          maxHeight: '95vh'
        }}
        contentStyle={{
          background: themeColors.background,
          padding: 0
        }}
        onResizeEnd={(e) => {
          const dialogEl = document.querySelector('.network-tools-dialog .p-dialog');
          if (dialogEl) {
            const w = dialogEl.offsetWidth;
            const h = dialogEl.offsetHeight;
            const newSize = { width: w, height: h };
            setDialogSize(newSize);
            try {
              localStorage.setItem('network-tools-dialog-size', JSON.stringify(newSize));
            } catch (err) {
              console.warn(err);
            }
            setIsMobile(w < 900);
          }
        }}
      >
        {renderModalContent()}
      </Dialog>
    </>
  );
};

export default NetworkToolsDialog;
