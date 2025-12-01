import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

// Presets de iconos disponibles
export const FolderIconPresets = {
  GENERAL: { id: 'general', name: 'General', emoji: '📁', description: 'Carpeta estándar', color: '#2196F3' },
  SECURITY: { id: 'security', name: 'Seguridad', emoji: '🔒', description: 'Datos seguros', color: '#F44336' },
  NETWORK: { id: 'network', name: 'Redes', emoji: '🌐', description: 'Conexiones', color: '#FF9800' },
  DATABASE: { id: 'database', name: 'Base de Datos', emoji: '💾', description: 'Almacenamiento', color: '#673AB7' },
  ANALYTICS: { id: 'analytics', name: 'Análisis', emoji: '📊', description: 'Reportes y datos', color: '#4CAF50' },
  SETTINGS: { id: 'settings', name: 'Configuración', emoji: '⚙️', description: 'Ajustes', color: '#009688' },
  PROJECTS: { id: 'projects', name: 'Proyectos', emoji: '💼', description: 'Trabajos', color: '#3F51B5' },
  DOCUMENTS: { id: 'documents', name: 'Documentos', emoji: '📝', description: 'Archivos', color: '#2196F3' },
  DESIGN: { id: 'design', name: 'Diseño', emoji: '🎨', description: 'Creatividad', color: '#E91E63' },
  MEDIA: { id: 'media', name: 'Media', emoji: '🎬', description: 'Videos e imágenes', color: '#FF5722' },
  FAVORITES: { id: 'favorites', name: 'Favoritos', emoji: '⭐', description: 'Marcados', color: '#FFC107' },
  SYNC: { id: 'sync', name: 'Sincronización', emoji: '🔄', description: 'Actualizaciones', color: '#00BCD4' }
};

// Renderiza un icono de carpeta con SVG
export const FolderIconRenderer = ({ preset, size = 'medium', pixelSize = null }) => {
  if (!preset) return null;

  // Si se proporciona pixelSize, usarlo directamente; si no, usar los tamaños predefinidos
  let containerSize, emojiSize;
  
  if (pixelSize && typeof pixelSize === 'number') {
    // Usar el tamaño en píxeles proporcionado
    containerSize = pixelSize;
    // Calcular el tamaño del emoji proporcionalmente (aproximadamente 48% del tamaño del contenedor)
    emojiSize = Math.max(10, Math.round(pixelSize * 0.48));
  } else {
    // Usar tamaños predefinidos para compatibilidad
    const sizes = {
      small: { container: 40, emoji: 16 },
      medium: { container: 60, emoji: 24 },
      large: { container: 80, emoji: 32 }
    };
    const dims = sizes[size] || sizes.medium;
    containerSize = dims.container;
    emojiSize = dims.emoji;
  }

  return (
    <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>
      <defs>
        <linearGradient id={`grad-${preset.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={preset.color} stopOpacity="1" />
          <stop offset="100%" stopColor={preset.color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <path d="M 10 35 L 30 20 L 40 20 L 40 35 Z" fill={`url(#grad-${preset.id})`} opacity="0.9" />
      <path d="M 10 35 L 10 85 Q 10 90 15 90 L 85 90 Q 90 90 90 85 L 90 40 Q 90 35 85 35 L 40 35 L 40 30 Q 40 25 35 25 L 15 25 Q 10 25 10 30 Z" fill={`url(#grad-${preset.id})`} />
      <path d="M 10 35 L 10 85 Q 10 90 15 90 L 85 90 Q 90 90 90 85 L 90 40 Q 90 35 85 35 L 40 35 L 40 30 Q 40 25 35 25 L 15 25 Q 10 25 10 30 Z" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <text 
        x="70" 
        y="75" 
        fontSize={pixelSize ? (emojiSize / containerSize) * 100 : emojiSize} 
        textAnchor="middle" 
        dominantBaseline="middle" 
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {preset.emoji}
      </text>
      <circle cx="70" cy="70" r="22" fill="rgba(255,255,255,0.15)" opacity="0.6" />
    </svg>
  );
};

// Modal selector de iconos
export const FolderIconSelectorModal = ({ visible, onHide, selectedIconId, onSelectIcon, theme }) => {
  const [hoveredId, setHoveredId] = useState(null);
  const [themeVersion, setThemeVersion] = useState(0);

  useEffect(() => {
    const onThemeChanged = () => setThemeVersion(v => v + 1);
    window.addEventListener('theme-changed', onThemeChanged);
    return () => window.removeEventListener('theme-changed', onThemeChanged);
  }, []);

  const currentTheme = useMemo(() => {
    return theme || themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [theme, themeVersion]);

  const themeColors = useMemo(() => {
    return {
      dialogBg: currentTheme.colors?.dialogBackground || 'rgba(16, 20, 28, 0.95)',
      dialogText: currentTheme.colors?.dialogText || '#ffffff',
      buttonPrimary: currentTheme.colors?.buttonPrimary || '#2196F3',
      buttonHover: currentTheme.colors?.buttonHoverBackground || 'rgba(33, 150, 243, 0.2)',
      border: currentTheme.colors?.contentBorder || 'rgba(255, 255, 255, 0.1)',
      cardBg: currentTheme.colors?.contentBackground || 'rgba(255, 255, 255, 0.05)'
    };
  }, [currentTheme]);

  const presets = Object.values(FolderIconPresets);

  const handleSelectIcon = useCallback((iconId) => {
    onSelectIcon(iconId);
    onHide();
  }, [onSelectIcon, onHide]);

  if (!visible) return null;

  return (
    <>
      <div
        onClick={onHide}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1090,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: themeColors.dialogBg,
            color: themeColors.dialogText,
            borderRadius: '16px',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            width: '600px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            zIndex: 1100,
            pointerEvents: 'auto'
          }}
        >
          <div style={{ padding: '1.5rem', borderBottom: `1px solid ${themeColors.border}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <i className="pi pi-palette" style={{ fontSize: '1.5rem', color: themeColors.buttonPrimary }}></i>
            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Selecciona el icono de la carpeta</span>
            <button onClick={onHide} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: themeColors.dialogText, fontSize: '1.5rem', cursor: 'pointer', padding: 0, width: '32px', height: '32px' }}>✕</button>
          </div>

          <div style={{ padding: '1.5rem', pointerEvents: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', pointerEvents: 'auto' }}>
              {presets.map((preset) => {
                const isSelected = selectedIconId === preset.id;
                const isHovered = hoveredId === preset.id;

                return (
                  <button
                    key={preset.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log('Click en icono:', preset.id);
                      handleSelectIcon(preset.id);
                    }}
                    onMouseEnter={() => setHoveredId(preset.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    type="button"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      padding: '1rem',
                      background: isSelected ? `linear-gradient(135deg, ${themeColors.buttonPrimary}33, ${themeColors.buttonPrimary}11)` : isHovered ? themeColors.buttonHover : themeColors.cardBg,
                      border: isSelected ? `2px solid ${themeColors.buttonPrimary}` : `1px solid ${themeColors.border}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      minHeight: '160px',
                      gap: '0.5rem',
                      fontFamily: 'inherit',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: themeColors.dialogText,
                      pointerEvents: 'auto',
                      zIndex: 10
                    }}
                  >
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <FolderIconRenderer preset={preset} size="large" />
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: themeColors.dialogText, textAlign: 'center', width: '100%', pointerEvents: 'none' }}>
                      {preset.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', width: '100%', pointerEvents: 'none' }}>
                      {preset.description}
                    </div>
                    {isSelected && (
                      <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: themeColors.buttonPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.9rem', fontWeight: 'bold', pointerEvents: 'none' }}>
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.5rem', borderTop: `1px solid ${themeColors.border}` }}>
            <button onClick={onHide} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: `1px solid ${themeColors.border}`, color: themeColors.dialogText, borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

