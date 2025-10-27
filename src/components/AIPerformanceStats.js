import React from 'react';
import TokenCounter from '../utils/tokenCounter';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

const AIPerformanceStats = ({
  currentModel = null,
  modelType = 'local',
  maxTokens = 7000,
  contextLimit = 16000,
  inputValue = '',
  messageCount = 0,
  isLoading = false,
  lastResponseTokens = 0,
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

  // Calcular estadísticas de tokens reales
  const historyTokens = React.useMemo(() => {
    // Usar tokens reales de la última respuesta si están disponibles
    if (lastResponseTokens > 0) {
      return lastResponseTokens + TokenCounter.countTokens(inputValue);
    }
    // Fallback: estimación básica
    return Math.ceil(messageCount * 200) + Math.ceil(messageCount * 0.5 * 500);
  }, [messageCount, lastResponseTokens, inputValue]);

  // Calcular contexto usado (historial + archivos adjuntos)
  const contextUsed = React.useMemo(() => {
    let totalContext = historyTokens;
    
    // Agregar tokens de archivos adjuntos
    if (attachedFiles && attachedFiles.length > 0) {
      attachedFiles.forEach(file => {
        // Estimación de tokens en archivos (PDFs, textos, etc.)
        if (file.size) {
          // Estimación: ~1 token cada 4 caracteres
          const estimatedTokens = Math.ceil(file.size / 4);
          totalContext += estimatedTokens;
        }
      });
    }
    
    return totalContext;
  }, [historyTokens, attachedFiles]);

  const stats = TokenCounter.getTokenStats(inputValue, maxTokens, historyTokens);
  const contextStats = TokenCounter.getTokenStats('', contextLimit, contextUsed);

  const getIndicatorColor = () => {
    if (stats.percentUsed > 90) return themeColors.dangerColor;
    if (stats.percentUsed > 75) return themeColors.warningColor;
    return themeColors.successColor;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '0.75rem 0',
      fontSize: '0.85rem',
      color: themeColors.textSecondary,
      borderTop: `1px solid ${themeColors.borderColor}`,
      marginTop: '0.5rem',
      flexWrap: 'nowrap',
      overflowX: 'auto'
    }}>
      {/* Lado izquierdo: Modelo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 'fit-content' }}>
        {currentModel && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem',
            minWidth: 'fit-content',
            whiteSpace: 'nowrap'
          }}>
            <i className="pi pi-database" style={{ fontSize: '0.8rem', color: themeColors.textSecondary }} />
            <span>{currentModel.split(':')[0].slice(0, 15)}</span>
          </div>
        )}

        {/* Grupo Tokens: Icono + Texto + Barra + Porcentaje */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.4rem',
          minWidth: 'fit-content',
          whiteSpace: 'nowrap'
        }}>
          <i className="pi pi-bolt" style={{ fontSize: '0.8rem', color: getIndicatorColor() }} />
          <span style={{ color: getIndicatorColor() }}>
            {stats.availableTokens} / {stats.maxTokens}
          </span>
        </div>
      </div>

      {/* Barra de progreso - Tokens (OCUPA TODO EL ESPACIO) */}
      <div style={{
        flex: 1,
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        overflow: 'hidden',
        margin: '0 1rem',
        position: 'relative'
      }}>
        <div style={{
          height: '100%',
          width: `${stats.percentUsed}%`,
          background: getIndicatorColor(),
          transition: 'width 0.2s ease'
        }} />
      </div>

      {/* Porcentaje - Tokens */}
      <span style={{ 
        color: getIndicatorColor(), 
        fontWeight: '500',
        minWidth: 'fit-content',
        whiteSpace: 'nowrap'
      }}>
        {stats.percentUsed}%
      </span>

      {/* Lado derecho: Contexto */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.4rem',
        minWidth: 'fit-content',
        whiteSpace: 'nowrap',
        marginLeft: '1rem'
      }}>
        <i className="pi pi-file" style={{ 
          fontSize: '0.8rem', 
          color: '#2196F3' // Azul fijo para contexto
        }} />
        <span style={{ 
          color: '#2196F3' // Azul fijo para contexto
        }}>
          {contextStats.availableTokens} / {contextStats.maxTokens}
        </span>
      </div>

      {/* Barra de progreso - Contexto (OCUPA TODO EL ESPACIO) */}
      <div style={{
        flex: 1,
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        overflow: 'hidden',
        margin: '0 1rem',
        position: 'relative'
      }}>
        <div style={{
          height: '100%',
          width: `${contextStats.percentUsed}%`,
          background: '#2196F3', // Azul fijo para contexto
          transition: 'width 0.2s ease'
        }} />
      </div>

      {/* Porcentaje - Contexto */}
      <span style={{ 
        color: '#2196F3', // Azul fijo para contexto
        fontWeight: '500',
        minWidth: 'fit-content',
        whiteSpace: 'nowrap'
      }}>
        {contextStats.percentUsed}%
      </span>

      {/* Estado de carga */}
      {isLoading && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.4rem', 
          marginLeft: 'auto',
          minWidth: 'fit-content',
          whiteSpace: 'nowrap'
        }}>
          <i className="pi pi-spin pi-spinner" style={{
            fontSize: '0.8rem',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ color: themeColors.primaryColor }}>Procesando...</span>
        </div>
      )}

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
