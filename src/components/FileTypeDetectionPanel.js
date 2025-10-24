import React from 'react';

/**
 * Componente para mostrar información detallada sobre los tipos de archivos detectados
 */
const FileTypeDetectionPanel = ({ 
  detectedFileTypes = [], 
  fileTypeSuggestions = [], 
  detectionConfidence = 0,
  themeColors = {},
  onClose = () => {},
  onSelectFileType = () => {}
}) => {
  if (!detectedFileTypes.length && !fileTypeSuggestions.length) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '80vh',
        background: `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}ee 100%)`,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${themeColors.borderColor}`,
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        zIndex: 1000,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: `1px solid ${themeColors.borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="pi pi-lightbulb" style={{ color: themeColors.primaryColor, fontSize: '1.2rem' }}></i>
          <h3 style={{ 
            margin: 0, 
            color: themeColors.textPrimary, 
            fontSize: '1.1rem',
            fontWeight: '600'
          }}>
            Detección Inteligente de Archivos
          </h3>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            background: themeColors.primaryColor,
            color: 'white',
            padding: '0.3rem 0.6rem',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>
            {Math.round(detectionConfidence * 100)}% confianza
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: themeColors.textSecondary,
              cursor: 'pointer',
              padding: '0.3rem',
              borderRadius: '4px',
              fontSize: '1.2rem'
            }}
          >
            <i className="pi pi-times"></i>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
        {/* Sugerencias principales */}
        {fileTypeSuggestions.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ 
              color: themeColors.textPrimary, 
              marginBottom: '0.8rem',
              fontSize: '1rem',
              fontWeight: '600'
            }}>
              <i className="pi pi-star" style={{ color: themeColors.primaryColor, marginRight: '0.5rem' }}></i>
              Tipos Recomendados
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
              {fileTypeSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  style={{
                    padding: '0.8rem',
                    background: `${suggestion.color}15`,
                    border: `1px solid ${suggestion.color}30`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: suggestion.confidence
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = `${suggestion.color}25`;
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = `${suggestion.color}15`;
                    e.target.style.transform = 'translateY(0)';
                  }}
                  onClick={() => onSelectFileType(suggestion)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <i className={suggestion.icon} style={{ color: suggestion.color, fontSize: '1.1rem' }}></i>
                    <span style={{ 
                      fontWeight: '600', 
                      color: themeColors.textPrimary,
                      textTransform: 'capitalize'
                    }}>
                      {suggestion.type}
                    </span>
                  </div>
                  
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: themeColors.textSecondary,
                    marginBottom: '0.4rem'
                  }}>
                    {suggestion.description}
                  </div>
                  
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: suggestion.color,
                    fontWeight: '500'
                  }}>
                    {suggestion.extensions.join(', ')}
                  </div>
                  
                  {suggestion.reasons && suggestion.reasons.length > 0 && (
                    <div style={{ 
                      marginTop: '0.4rem',
                      fontSize: '0.7rem',
                      color: themeColors.textSecondary,
                      opacity: 0.8
                    }}>
                      {suggestion.reasons.slice(0, 2).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Todos los tipos detectados */}
        {detectedFileTypes.length > 0 && (
          <div>
            <h4 style={{ 
              color: themeColors.textPrimary, 
              marginBottom: '0.8rem',
              fontSize: '1rem',
              fontWeight: '600'
            }}>
              <i className="pi pi-list" style={{ color: themeColors.primaryColor, marginRight: '0.5rem' }}></i>
              Todos los Tipos Detectados
            </h4>
            
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '0.4rem' 
            }}>
              {detectedFileTypes.map((fileType, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.4rem 0.8rem',
                    background: `${fileType.config.color}20`,
                    border: `1px solid ${fileType.config.color}40`,
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    color: themeColors.textPrimary,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: fileType.confidence
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = `${fileType.config.color}30`;
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = `${fileType.config.color}20`;
                    e.target.style.transform = 'translateY(0)';
                  }}
                  onClick={() => onSelectFileType(fileType.config)}
                >
                  <i className={fileType.config.icon} style={{ color: fileType.config.color, fontSize: '0.9rem' }}></i>
                  <span style={{ fontWeight: '500' }}>{fileType.type}</span>
                  <span style={{ 
                    color: themeColors.textSecondary, 
                    fontSize: '0.7rem',
                    opacity: 0.8
                  }}>
                    {Math.round(fileType.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div style={{
          marginTop: '1.5rem',
          padding: '0.8rem',
          background: `${themeColors.primaryColor}10`,
          border: `1px solid ${themeColors.primaryColor}30`,
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: themeColors.textSecondary
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <i className="pi pi-info-circle" style={{ color: themeColors.primaryColor }}></i>
            <span style={{ fontWeight: '600', color: themeColors.textPrimary }}>¿Cómo funciona?</span>
          </div>
          <p style={{ margin: 0, lineHeight: '1.4' }}>
            El sistema analiza tu conversación y detecta automáticamente qué tipos de archivos puedes necesitar. 
            Basándose en palabras clave, patrones de código y contexto, sugiere los formatos más relevantes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileTypeDetectionPanel;
