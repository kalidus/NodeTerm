import React, { useState, useRef, useCallback } from 'react';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';
import fileAnalysisService from '../services/FileAnalysisService';

const FileUploader = ({ 
  onFilesAdded, 
  onFileRemoved, 
  attachedFiles = [], 
  maxFiles = 5,
  disabled = false,
  expandUpload = true
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingFile, setProcessingFile] = useState(null);
  const fileInputRef = useRef(null);
  const [themeVersion, setThemeVersion] = useState(0);

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
      hoverBackground: currentTheme.colors?.sidebarHover || 'rgba(255,255,255,0.1)',
      successColor: '#4caf50',
      errorColor: '#f44336',
      warningColor: '#ff9800'
    };
  }, [currentTheme]);

  // Manejar drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  }, [disabled]);

  // Manejar selección de archivos
  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    await handleFiles(files);
    
    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Procesar archivos
  const handleFiles = async (files) => {
    if (files.length === 0) return;

    // Validar límite de archivos
    if (attachedFiles.length + files.length > maxFiles) {
      alert(`Máximo ${maxFiles} archivos permitidos. Actualmente tienes ${attachedFiles.length} archivos.`);
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingFile(null);

    const processedFiles = [];
    const errors = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingFile(file.name);
        setProcessingProgress((i / files.length) * 100);

        try {
          // Validar tipo de archivo
          if (!fileAnalysisService.isFileSupported(file)) {
            errors.push(`${file.name}: Tipo de archivo no soportado`);
            continue;
          }

          // Procesar archivo
          const processedFile = await fileAnalysisService.processFile(file);
          processedFiles.push(processedFile);

        } catch (error) {
          console.error(`Error procesando ${file.name}:`, error);
          errors.push(`${file.name}: ${error.message}`);
        }
      }

      setProcessingProgress(100);

      // Notificar archivos procesados exitosamente
      if (processedFiles.length > 0) {
        onFilesAdded(processedFiles);
      }

      // Mostrar errores si los hay
      if (errors.length > 0) {
        alert(`Errores procesando archivos:\n${errors.join('\n')}`);
      }

    } catch (error) {
      console.error('Error general procesando archivos:', error);
      alert(`Error procesando archivos: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingFile(null);
    }
  };

  // Remover archivo
  const handleRemoveFile = (fileId) => {
    onFileRemoved(fileId);
  };

  // Abrir selector de archivos
  const openFileSelector = () => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click();
    }
  };

  // Obtener icono según tipo de archivo
  const getFileIcon = (fileType) => {
    if (fileType.includes('image/')) return 'pi pi-image';
    if (fileType.includes('pdf')) return 'pi pi-file-pdf';
    if (fileType.includes('text/')) return 'pi pi-file';
    if (fileType.includes('json')) return 'pi pi-code';
    if (fileType.includes('csv')) return 'pi pi-table';
    if (fileType.includes('doc')) return 'pi pi-file-word';
    if (fileType.includes('xml')) return 'pi pi-code';
    if (fileType.includes('rtf')) return 'pi pi-file';
    if (fileType.includes('odt')) return 'pi pi-file';
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
    if (fileType.includes('xml')) return themeColors.warningColor;
    if (fileType.includes('rtf')) return themeColors.primaryColor;
    if (fileType.includes('odt')) return themeColors.primaryColor;
    return themeColors.textSecondary;
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Área de drop */}
      {expandUpload && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileSelector}
          style={{
            border: `2px dashed ${isDragOver ? themeColors.primaryColor : themeColors.borderColor}`,
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            backgroundColor: isDragOver 
              ? `${themeColors.primaryColor}10` 
              : themeColors.cardBackground,
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.5 : 1,
            marginBottom: attachedFiles.length > 0 ? '1rem' : '0'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.doc,.docx,.docm,.odt,.rtf,.xml,.csv,.json,.jpg,.jpeg,.png,.gif,.webp,.svg,.ppt,.pptx,.xls,.xlsx,.ods,.html,.htm,.md,.markdown"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={disabled}
          />

          {isProcessing ? (
            <div>
              <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: themeColors.primaryColor }} />
              <p style={{ margin: '0.5rem 0', color: themeColors.textPrimary }}>
                Procesando {processingFile}...
              </p>
              <ProgressBar 
                value={processingProgress} 
                style={{ width: '100%', height: '0.5rem' }}
              />
            </div>
          ) : (
            <div>
              <i className="pi pi-cloud-upload" style={{ fontSize: '2rem', color: themeColors.primaryColor }} />
              <p style={{ margin: '0.5rem 0', color: themeColors.textPrimary, fontWeight: '500' }}>
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <p style={{ margin: '0', color: themeColors.textSecondary, fontSize: '0.9rem' }}>
                PDF, TXT, DOC, DOCX, CSV, JSON, XML, RTF, ODT, imágenes (JPG, PNG, GIF, WebP, SVG)
              </p>
              <p style={{ margin: '0.5rem 0 0 0', color: themeColors.textSecondary, fontSize: '0.8rem' }}>
                Máximo {maxFiles} archivos • {attachedFiles.length}/{maxFiles} utilizados
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lista de archivos adjuntos */}
      {attachedFiles.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ 
            margin: '0 0 0.5rem 0', 
            color: themeColors.textPrimary, 
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            📎 Archivos adjuntos ({attachedFiles.length})
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: themeColors.cardBackground,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                  <i 
                    className={getFileIcon(file.type)} 
                    style={{ 
                      fontSize: '1.2rem', 
                      color: getFileColor(file.type) 
                    }} 
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ 
                      margin: '0', 
                      color: themeColors.textPrimary, 
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {file.name}
                    </p>
                    <p style={{ 
                      margin: '0', 
                      color: themeColors.textSecondary, 
                      fontSize: '0.8rem' 
                    }}>
                      {file.sizeFormatted} • {file.category.toUpperCase()}
                    </p>
                  </div>
                </div>
                
                <Button
                  icon="pi pi-times"
                  className="p-button-text p-button-sm"
                  onClick={() => handleRemoveFile(file.id)}
                  disabled={disabled}
                  style={{
                    color: themeColors.textSecondary,
                    minWidth: 'auto',
                    padding: '0.25rem'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
