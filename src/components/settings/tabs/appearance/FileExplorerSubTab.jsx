import React from 'react';
import { FaFolder, FaFilePdf, FaFileWord, FaFileExcel } from 'react-icons/fa';
import { Dropdown } from 'primereact/dropdown';
import { Slider } from 'primereact/slider';
import { useTranslation } from '../../../../i18n/hooks/useTranslation';
import { uiThemes } from '../../../../themes/ui-themes';
import { iconThemes } from '../../../../themes/icon-themes';
import { explorerFonts } from '../../../../themes';
import { buildSidebarFontStack } from '../../../../utils/sidebarFontStack';

export const FileExplorerSubTab = ({
  explorerFont,
  explorerFontSize,
  setExplorerFontSize,
  explorerColorTheme,
  setExplorerColorTheme,
  iconTheme,
  setIconTheme,
  uiFont,
  handleUnifiedFontChange
}) => {
  const { t } = useTranslation('settings');

  const themeColors = uiThemes[explorerColorTheme]?.colors || uiThemes['Light']?.colors || {};
  const previewBg = themeColors.contentBackground || '#ffffff';
  const previewText = themeColors.dialogText || '#1e293b';
  const previewBorder = themeColors.contentBorder || '#e2e8f0';
  const previewHover = themeColors.sidebarHover || '#f1f5f9';

  return (
    <div className="general-settings-container" style={{ maxWidth: '100%', margin: '0 auto' }}>
      {/* Header */}
      <div className="general-settings-header-wrapper">
        <div className="general-header-content">
          <span className="general-header-icon protocol-dialog-header-icon" style={{
            background: 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)',
            boxShadow: '0 2px 8px rgba(139, 195, 74, 0.25)'
          }}>
            <i className="pi pi-folder-open"></i>
          </span>
          <div className="general-header-text">
            <h3 className="general-header">Explorador de Archivos</h3>
            <p className="general-description">Personaliza iconos, tipografía y tema de colores</p>
          </div>
        </div>
      </div>

      {/* Card Unificada: Dashboard de Personalización */}
      <div className="general-settings-section" style={{
        marginBottom: 0,
        maxWidth: '100%',
        width: '100%'
      }}>
        <div className="general-section-header">
          <div className="general-section-icon" style={{
            background: 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)',
            boxShadow: '0 2px 8px rgba(139, 195, 74, 0.3)'
          }}>
            <i className="pi pi-eye"></i>
          </div>
          <h4 className="general-section-title">Personalización del Explorador</h4>
        </div>

        <div className="general-settings-options" style={{ padding: '1rem 1.25rem' }}>

          {/* ═══════════════════════════════════════════════════════════════
            VISTA PREVIA EN VIVO DEL EXPLORADOR
            ═══════════════════════════════════════════════════════════════ */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.15) 100%)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem',
              opacity: 0.7,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-color-secondary)'
            }}>
              <i className="pi pi-desktop" style={{ fontSize: '0.7rem' }}></i>
              Vista Previa
            </div>

            {/* Vista Previa del Explorador de Archivos - Estilo Material Design Cards */}
            <div
              className="explorer-preview-container"
              style={{
                fontFamily: buildSidebarFontStack(explorerFont),
                fontSize: `${explorerFontSize}px`,
                background: previewBg,
                borderRadius: '8px',
                padding: '0.5rem',
                border: `1px solid ${previewBorder}`,
                maxHeight: '200px',
                overflowY: 'auto'
              }}
            >
              {/* Carpeta */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  marginBottom: '0.25rem',
                  background: previewHover,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = themeColors.sidebarSelected || '#e0e7ff'}
                onMouseLeave={(e) => e.currentTarget.style.background = previewHover}
              >
                <FaFolder style={{
                  fontSize: '20px',
                  color: themeColors.buttonPrimary || '#667eea',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600,
                    color: previewText,
                    fontSize: `${explorerFontSize}px`,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>Notas</div>
                  <div style={{
                    fontSize: `${Math.max(explorerFontSize - 2, 10)}px`,
                    color: previewText,
                    opacity: 0.7,
                    marginTop: '2px'
                  }}>Carpeta • Modificado hoy</div>
                </div>
              </div>

              {/* Archivo PDF */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  marginBottom: '0.25rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = previewHover}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <FaFilePdf style={{
                  fontSize: '18px',
                  color: '#dc2626',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 500,
                    color: previewText,
                    fontSize: `${explorerFontSize}px`,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>reporte.pdf</div>
                  <div style={{
                    fontSize: `${Math.max(explorerFontSize - 2, 10)}px`,
                    color: previewText,
                    opacity: 0.7,
                    marginTop: '2px'
                  }}>PDF • 2.4 MB • Modificado ayer</div>
                </div>
              </div>

              {/* Archivo PowerPoint */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  marginBottom: '0.25rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = previewHover}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <FaFileWord style={{
                  fontSize: '18px',
                  color: '#ea580c',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 500,
                    color: previewText,
                    fontSize: `${explorerFontSize}px`,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>presentacion.pptx</div>
                  <div style={{
                    fontSize: `${Math.max(explorerFontSize - 2, 10)}px`,
                    color: previewText,
                    opacity: 0.7,
                    marginTop: '2px'
                  }}>Word • 1.8 MB • Modificado hace 2 días</div>
                </div>
              </div>

              {/* Archivo Excel */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = previewHover}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <FaFileExcel style={{
                  fontSize: '18px',
                  color: '#16a34a',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 500,
                    color: previewText,
                    fontSize: `${explorerFontSize}px`,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>datos.xlsx</div>
                  <div style={{
                    fontSize: `${Math.max(explorerFontSize - 2, 10)}px`,
                    color: previewText,
                    opacity: 0.7,
                    marginTop: '2px'
                  }}>Excel • 856 KB • Modificado hace 3 días</div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
            DIVIDER
            ═══════════════════════════════════════════════════════════════ */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(139, 195, 74, 0.4) 50%, transparent 100%)',
            margin: '0.5rem 0 1rem 0'
          }}></div>

          {/* ═══════════════════════════════════════════════════════════════
            FILA 1: TEMA DE ICONOS + TEMA DE COLORES
            ═══════════════════════════════════════════════════════════════ */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            {/* Tema de Iconos */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <i className="pi pi-palette" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--ui-dialog-text)'
                }}>Tema de Iconos</label>
              </div>
              <Dropdown
                id="icon-theme"
                value={iconTheme}
                options={Object.entries(iconThemes).map(([key, theme]) => ({ label: theme.name, value: key }))}
                onChange={e => setIconTheme && setIconTheme(e.value)}
                placeholder={t('appearance.sessionExplorer.selectTheme')}
                style={{ width: '100%' }}
                itemTemplate={option => (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {iconThemes[option.value]?.icons.folder}
                    {iconThemes[option.value]?.name}
                  </span>
                )}
              />
            </div>

            {/* Tema de Colores */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <i className="pi pi-sun" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--ui-dialog-text)'
                }}>Tema de Colores</label>
              </div>
              <Dropdown
                id="explorer-color-theme"
                value={explorerColorTheme}
                options={Object.entries(uiThemes).map(([key, theme]) => ({ label: theme.name, value: key }))}
                onChange={e => setExplorerColorTheme && setExplorerColorTheme(e.value)}
                placeholder={t('appearance.sessionExplorer.selectTheme')}
                style={{ width: '100%' }}
                itemTemplate={option => (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '4px 0'
                  }}>
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: uiThemes[option.value]?.colors?.buttonPrimary || '#007ad9',
                      border: '2px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}></div>
                    {option.label}
                  </span>
                )}
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
            FILA 2: TIPOGRAFÍA
            ═══════════════════════════════════════════════════════════════ */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.08)',
            borderRadius: '10px',
            padding: '0.875rem 1rem',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: '1rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <i className="pi pi-pencil" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--ui-dialog-text)'
              }}>Tipografía</span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem'
            }}>
              {/* Fuente */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minWidth: '60px'
                }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>{t('appearance.homePage.font')}</span>
                </div>
                <Dropdown
                  id="explorer-font"
                  value={uiFont || explorerFont}
                  options={explorerFonts.map(f => ({ label: f, value: f }))}
                  onChange={e => handleUnifiedFontChange && handleUnifiedFontChange(e.value)}
                  placeholder={t('appearance.sessionExplorer.selectFont')}
                  style={{ flex: 1 }}
                  itemTemplate={option => (
                    <span style={{ fontFamily: buildSidebarFontStack(option.value) }}>{option.label}</span>
                  )}
                />
              </div>

              {/* Tamaño de Fuente con Slider */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minWidth: '60px'
                }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>{t('appearance.homePage.fontSize')}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Slider
                    value={explorerFontSize}
                    onChange={(e) => setExplorerFontSize && setExplorerFontSize(e.value)}
                    min={8}
                    max={32}
                    style={{ flex: 1 }}
                  />
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--ui-button-primary)',
                    fontWeight: 600,
                    minWidth: '40px',
                    textAlign: 'right'
                  }}>{explorerFontSize} px</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FileExplorerSubTab;
