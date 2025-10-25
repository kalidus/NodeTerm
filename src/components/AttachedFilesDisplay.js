import React from 'react';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

const AttachedFilesDisplay = ({ attachedFiles, compact = false }) => {
  const [themeVersion, setThemeVersion] = React.useState(0);

  // Obtener tema actual
  const currentTheme = React.useMemo(() => {
    return themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [themeVersion]);

  const themeColors = React.useMemo(() => {
    return {
      background: currentTheme.colors?.contentBackground || '#fafafa',
      cardBackground: currentTheme.colors?.dialogBackground || 'rgba(16, 20, 28, 0.6)',
      textPrimary: currentTheme.colors?.sidebarText || currentTheme.colors?.tabText || '#ffffff',
      textSecondary: currentTheme.colors?.sidebarText || '#9E9E9E',
      borderColor: currentTheme.colors?.sidebarBorder || currentTheme.colors?.contentBorder || 'rgba(255,255,255,0.1)',
      primaryColor: currentTheme.colors?.buttonPrimary || currentTheme.colors?.primaryColor || '#2196f3',
      successColor: '#4caf50',
      errorColor: '#f44336',
      warningColor: '#ff9800'
    };
  }, [currentTheme]);

  // Obtener icono según tipo de archivo
  const getFileIcon = (fileType) => {
    if (fileType.includes('image/')) return 'pi pi-image';
    if (fileType.includes('pdf')) return 'pi pi-file-pdf';
    if (fileType.includes('text/')) return 'pi pi-file';
    if (fileType.includes('json')) return 'pi pi-code';
    if (fileType.includes('csv')) return 'pi pi-table';
    if (fileType.includes('doc')) return 'pi pi-file-word';
    return 'pi pi-file';
  };

  // Obtener color según tipo de archivo
  const getFileColor = (fileType) => {
    if (fileType.includes('image/')) return themeColors.successColor;
    if (fileType.includes('pdf')) return themeColors.errorColor;
    if (fileType.includes('text/')) return themeColors.primaryColor;
    if (fileType.includes('json')) return themeColors.warningColor;
    if (fileType.includes('csv')) return themeColors.successColor;
    if (fileType.includes('doc')) return themeColors.primaryColor;
    return themeColors.textSecondary;
  };

  if (!attachedFiles || attachedFiles.length === 0) {
    return null;
  }

  return (
    <div style={{
      marginTop: '0.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>
      <div style={{
        fontSize: '0.8rem',
        color: themeColors.textSecondary,
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <i className="pi pi-paperclip" />
        <span>Archivos adjuntos ({attachedFiles.length})</span>
      </div>
      
      <div style={{
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        gap: '0.5rem',
        flexWrap: compact ? 'wrap' : 'nowrap'
      }}>
        {attachedFiles.map((file) => (
          <div
            key={file.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: compact ? '0.5rem' : '0.75rem',
              backgroundColor: themeColors.cardBackground,
              border: `1px solid ${themeColors.borderColor}`,
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              minWidth: compact ? '200px' : 'auto',
              maxWidth: compact ? '300px' : '100%'
            }}
          >
            <i 
              className={getFileIcon(file.type)} 
              style={{ 
                fontSize: '1.2rem', 
                color: getFileColor(file.type),
                flexShrink: 0
              }} 
            />
            <div style={{ 
              flex: 1, 
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <div style={{ 
                fontSize: '0.9rem',
                fontWeight: '500',
                color: themeColors.textPrimary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {file.name}
              </div>
              <div style={{ 
                fontSize: '0.8rem',
                color: themeColors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>{file.sizeFormatted}</span>
                <span>•</span>
                <span style={{
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  {file.category}
                </span>
                {file.content?.extracted && (
                  <>
                    <span>•</span>
                    <span style={{ color: themeColors.successColor }}>
                      ✓ Procesado
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttachedFilesDisplay;
