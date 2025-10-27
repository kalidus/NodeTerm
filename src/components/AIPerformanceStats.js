import React from 'react';
import TokenCounter from '../utils/tokenCounter';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

const AIPerformanceStats = ({
  currentModel = null,
  modelType = 'local',
  maxTokens = 7000,
  inputValue = '',
  messageCount = 0,
  isLoading = false
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

  // Calcular estadísticas de tokens
  const historyTokens = React.useMemo(() => {
    return Math.ceil(messageCount * 150); // Estimación: ~150 tokens por mensaje en historial
  }, [messageCount]);

  const stats = TokenCounter.getTokenStats(inputValue, maxTokens, historyTokens);

  const getIndicatorColor = () => {
    if (stats.percentUsed > 90) return themeColors.dangerColor;
    if (stats.percentUsed > 75) return themeColors.warningColor;
    return themeColors.successColor;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.75rem 0',
      fontSize: '0.85rem',
      color: themeColors.textSecondary,
      borderTop: `1px solid ${themeColors.borderColor}`,
      marginTop: '0.5rem',
      flexWrap: 'wrap'
    }}>
      {/* Modelo actual */}
      {currentModel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <i className="pi pi-database" style={{ fontSize: '0.8rem' }} />
          <span>{currentModel.split(':')[0].slice(0, 15)}</span>
        </div>
      )}

      {/* Indicador de tokens */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <i className="pi pi-bolt" style={{ fontSize: '0.8rem', color: getIndicatorColor() }} />
        <span style={{ color: getIndicatorColor() }}>
          {stats.availableTokens} / {stats.maxTokens}
        </span>
      </div>

      {/* Barra de progreso */}
      <div style={{
        flex: 1,
        minWidth: '100px',
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${stats.percentUsed}%`,
          background: getIndicatorColor(),
          transition: 'width 0.2s ease'
        }} />
      </div>

      {/* Porcentaje */}
      <span style={{ color: getIndicatorColor(), fontWeight: '500' }}>
        {stats.percentUsed}%
      </span>

      {/* Estado de carga */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
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
