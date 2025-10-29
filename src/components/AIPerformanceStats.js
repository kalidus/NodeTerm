import React from 'react';
import TokenCounter from '../utils/tokenCounter';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

const AIPerformanceStats = ({
  currentModel = null,
  modelType = 'local',
  contextLimit = 16000,
  inputValue = '',
  messageCount = 0,
  isLoading = false,
  attachedFiles = []
}) => {
  const currentTheme = React.useMemo(() => {
    return themeManager.getCurrentTheme() || uiThemes['Light'];
  }, []);

  const themeColors = React.useMemo(() => {
    return {
      background: currentTheme.colors?.contentBackground || '#fafafa',
      textPrimary: currentTheme.colors?.sidebarText || '#ffffff',
      textSecondary: currentTheme.colors?.textMuted || '#9E9E9E',
      borderColor: currentTheme.colors?.sidebarBorder || 'rgba(255,255,255,0.1)',
      primaryColor: currentTheme.colors?.buttonPrimary || '#2196f3',
      warningColor: '#FFC107',
      dangerColor: '#F44336',
      successColor: '#4CAF50'
    };
  }, [currentTheme]);

  // Calcular contexto usado (historial + archivos adjuntos) de forma simple
  const contextUsed = React.useMemo(() => {
    let totalContext = messageCount * 150; // Estimación simple para historial
    
    // Agregar contexto de archivos adjuntos
    if (attachedFiles && attachedFiles.length > 0) {
      attachedFiles.forEach(file => {
        if (file.content && typeof file.content === 'string') {
          totalContext += TokenCounter.countTokens(file.content);
        } else if (file.text && typeof file.text === 'string') {
          totalContext += TokenCounter.countTokens(file.text);
        } else if (file.size && typeof file.size === 'number') {
          totalContext += Math.ceil(file.size / 4);
        }
      });
    }
    
    return totalContext;
  }, [messageCount, attachedFiles]);

  const contextPercent = Math.min(100, Math.round((contextUsed / contextLimit) * 100));
  
  // Color del contador según el uso
  const getContextColor = (percent) => {
    if (percent < 50) return themeColors.successColor;
    if (percent < 75) return themeColors.warningColor;
    if (percent < 90) return '#FF9800'; // Naranja
    return themeColors.dangerColor;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.5rem 0',
      fontSize: '0.8rem',
      color: themeColors.textSecondary,
      borderTop: `1px solid ${themeColors.borderColor}`,
      marginTop: '0.5rem'
    }}>
      {/* Modelo actual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {currentModel && (
          <>
            <i className="pi pi-database" style={{ fontSize: '0.75rem', opacity: 0.7 }} />
            <span style={{ opacity: 0.8 }}>
              {currentModel.split(':')[0].slice(0, 20)}
            </span>
          </>
        )}
      </div>

      {/* Información contextual (sutil) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Mostrar mensajes en la conversación */}
        {messageCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <i className="pi pi-comments" style={{ fontSize: '0.7rem', opacity: 0.6 }} />
            <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>
              {messageCount} mensaje{messageCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        
        {/* Archivos adjuntos */}
        {attachedFiles && attachedFiles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <i className="pi pi-file" style={{ fontSize: '0.7rem', opacity: 0.6 }} />
            <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>
              {attachedFiles.length} archivo{attachedFiles.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        
        {/* Contexto siempre visible */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.3rem',
            cursor: 'help',
            position: 'relative',
            padding: '0.2rem 0.4rem',
            borderRadius: '0.3rem',
            backgroundColor: contextPercent > 75 ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${getContextColor(contextPercent)}20`,
            transition: 'all 0.2s ease'
          }}
          title={`Contexto usado: ${contextUsed.toLocaleString()} / ${contextLimit.toLocaleString()} tokens (${contextPercent}%)`}
        >
          <i 
            className="pi pi-clock" 
            style={{ 
              fontSize: '0.7rem', 
              color: getContextColor(contextPercent),
              opacity: 0.8 
            }} 
          />
          <span style={{ 
            color: getContextColor(contextPercent),
            fontSize: '0.75rem',
            fontWeight: contextPercent > 75 ? '600' : '400',
            opacity: 0.9
          }}>
            {contextPercent}% ctx
          </span>
        </div>

        {/* Estado de carga */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <i className="pi pi-spin pi-spinner" style={{
              fontSize: '0.7rem',
              opacity: 0.8,
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ opacity: 0.8, fontSize: '0.75rem' }}>Procesando...</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AIPerformanceStats;
