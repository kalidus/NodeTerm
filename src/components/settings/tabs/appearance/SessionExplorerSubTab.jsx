import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { useTranslation } from '../../../../i18n/hooks/useTranslation';
import { iconThemes } from '../../../../themes/icon-themes';
import { treeThemeOptions } from '../../../../themes/tree-themes';
import { sessionActionIconThemes } from '../../../../themes/session-action-icons';
import { explorerFonts } from '../../../../themes';
import { buildSidebarFontStack } from '../../../../utils/sidebarFontStack';
import localStorageSyncService from '../../../../services/LocalStorageSyncService';
import { SmoothIconSlider } from '../../common/IconSelectorGrids';

export const SessionExplorerSubTab = ({
  treeTheme,
  setTreeTheme,
  iconThemeSidebar,
  setIconThemeSidebar,
  sessionActionIconTheme,
  setSessionActionIconTheme,
  sidebarFont,
  uiFont,
  sidebarFontSize,
  sidebarFontColor,
  setSidebarFontColor,
  handleUnifiedFontChange,
  handleSidebarFontColorChange,
  folderIconSize,
  connectionIconSize,
  setConnectionIconSize
}) => {
  const { t } = useTranslation('settings');

  return (
    <div className="general-settings-container" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <div className="general-settings-header-wrapper">
        <div className="general-header-content">
          <span className="general-header-icon protocol-dialog-header-icon" style={{
            background: 'linear-gradient(135deg, #00ACC1 0%, #0097A7 100%)',
            boxShadow: '0 2px 8px rgba(0, 172, 193, 0.25)'
          }}>
            <i className="pi pi-sitemap"></i>
          </span>
          <div className="general-header-text">
            <h3 className="general-header">{t('appearance.sessionExplorer.title')}</h3>
            <p className="general-description">{t('appearance.sessionExplorer.description')}</p>
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
            background: 'linear-gradient(135deg, #00ACC1 0%, #0097A7 100%)',
            boxShadow: '0 2px 8px rgba(0, 172, 193, 0.3)'
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

            {/* Árbol Simulado con tema dinámico */}
            <div
              className={`tree-preview-container tree-theme-${treeTheme}`}
              style={{
                fontFamily: buildSidebarFontStack(sidebarFont),
                fontSize: `${sidebarFontSize}px`,
                color: sidebarFontColor || 'var(--ui-dialog-text)'
              }}
            >
              {/* Carpeta Principal - Raíz */}
              <div className="tree-preview-node" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {iconThemes[iconThemeSidebar]?.icons.folder &&
                  React.cloneElement(iconThemes[iconThemeSidebar].icons.folder, {
                    width: folderIconSize || 20,
                    height: folderIconSize || 20,
                    style: {
                      ...iconThemes[iconThemeSidebar].icons.folder.props.style,
                      width: `${folderIconSize || 20}px`,
                      height: `${folderIconSize || 20}px`,
                      flexShrink: 0
                    }
                  })
                }
                <span style={{ fontWeight: 600 }}>Producción</span>
              </div>

              {/* Nivel 1: Hijos de la carpeta raíz */}
              <div className="tree-preview-children">
                {/* Subcarpeta 1: Servidores Web */}
                <div className="tree-preview-child">
                  <div className="tree-preview-node" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                    {iconThemes[iconThemeSidebar]?.icons.folder &&
                      React.cloneElement(iconThemes[iconThemeSidebar].icons.folder, {
                        width: folderIconSize || 20,
                        height: folderIconSize || 20,
                        style: {
                          ...iconThemes[iconThemeSidebar].icons.folder.props.style,
                          width: `${folderIconSize || 20}px`,
                          height: `${folderIconSize || 20}px`,
                          flexShrink: 0
                        }
                      })
                    }
                    <span>Servidores Web</span>
                  </div>

                  {/* Nivel 2: Conexiones dentro de Servidores Web */}
                  <div className="tree-preview-children">
                    <div className="tree-preview-child">
                      <div className="tree-preview-node" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                        {iconThemes[iconThemeSidebar]?.icons.ssh &&
                          React.cloneElement(iconThemes[iconThemeSidebar].icons.ssh, {
                            width: connectionIconSize || 20,
                            height: connectionIconSize || 20,
                            style: {
                              ...iconThemes[iconThemeSidebar].icons.ssh.props.style,
                              width: `${connectionIconSize || 20}px`,
                              height: `${connectionIconSize || 20}px`,
                              flexShrink: 0
                            }
                          })
                        }
                        <span>Apache-Server-01</span>
                      </div>
                    </div>
                    <div className="tree-preview-child">
                      <div className="tree-preview-node" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                        {iconThemes[iconThemeSidebar]?.icons.ssh &&
                          React.cloneElement(iconThemes[iconThemeSidebar].icons.ssh, {
                            width: connectionIconSize || 20,
                            height: connectionIconSize || 20,
                            style: {
                              ...iconThemes[iconThemeSidebar].icons.ssh.props.style,
                              width: `${connectionIconSize || 20}px`,
                              height: `${connectionIconSize || 20}px`,
                              flexShrink: 0
                            }
                          })
                        }
                        <span>Nginx-Proxy</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subcarpeta 2: Bases de Datos */}
                <div className="tree-preview-child">
                  <div className="tree-preview-node" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                    {iconThemes[iconThemeSidebar]?.icons.folder &&
                      React.cloneElement(iconThemes[iconThemeSidebar].icons.folder, {
                        width: folderIconSize || 20,
                        height: folderIconSize || 20,
                        style: {
                          ...iconThemes[iconThemeSidebar].icons.folder.props.style,
                          width: `${folderIconSize || 20}px`,
                          height: `${folderIconSize || 20}px`,
                          flexShrink: 0
                        }
                      })
                    }
                    <span>Bases de Datos</span>
                  </div>

                  {/* Nivel 2: Conexiones dentro de Bases de Datos */}
                  <div className="tree-preview-children">
                    <div className="tree-preview-child">
                      <div className="tree-preview-node" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                        {iconThemes[iconThemeSidebar]?.icons.rdp &&
                          React.cloneElement(iconThemes[iconThemeSidebar].icons.rdp, {
                            width: connectionIconSize || 20,
                            height: connectionIconSize || 20,
                            style: {
                              ...iconThemes[iconThemeSidebar].icons.rdp.props.style,
                              width: `${connectionIconSize || 20}px`,
                              height: `${connectionIconSize || 20}px`,
                              flexShrink: 0
                            }
                          })
                        }
                        <span>SQL-Server-Main</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
            DIVIDER
            ═══════════════════════════════════════════════════════════════ */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(0, 172, 193, 0.4) 50%, transparent 100%)',
            margin: '0.5rem 0 1rem 0'
          }}></div>

          {/* ═══════════════════════════════════════════════════════════════
            FILA 1: TEMA DE ICONOS + TEMA DEL ÁRBOL + TEMA DE ICONOS DE ACCIÓN
            ═══════════════════════════════════════════════════════════════ */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
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
                id="icon-theme-sidebar"
                value={iconThemeSidebar}
                options={Object.entries(iconThemes).map(([key, theme]) => ({ label: theme.name, value: key }))}
                onChange={e => setIconThemeSidebar && setIconThemeSidebar(e.value)}
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

            {/* Tema del Árbol */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <i className="pi pi-share-alt" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--ui-dialog-text)'
                }}>Tema del Árbol</label>
              </div>
              <Dropdown
                id="tree-theme"
                value={treeTheme}
                options={treeThemeOptions}
                onChange={(e) => setTreeTheme && setTreeTheme(e.value)}
                placeholder={t('appearance.sessionExplorer.selectTheme')}
                style={{ width: '100%' }}
                itemTemplate={(option) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 500 }}>{option.label}</span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-color-secondary)',
                      opacity: 0.7
                    }}>{option.description}</span>
                  </div>
                )}
              />
            </div>

            {/* Tema de Iconos de Acción */}
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
                }}>Iconos de Acción</label>
              </div>
              <Dropdown
                id="session-action-icon-theme"
                value={sessionActionIconTheme || 'modern'}
                options={Object.entries(sessionActionIconThemes).map(([key, theme]) => ({
                  label: theme.name,
                  value: key,
                  description: theme.description
                }))}
                onChange={(e) => {
                  if (setSessionActionIconTheme) {
                    setSessionActionIconTheme(e.value);
                  }
                }}
                placeholder="Seleccionar tema"
                style={{ width: '100%' }}
                itemTemplate={(option) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 500 }}>{option.label}</span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-color-secondary)',
                      opacity: 0.7
                    }}>{option.description}</span>
                  </div>
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
              {/* Badge con el tamaño de fuente calculado automáticamente */}
              <span style={{
                fontSize: '0.7rem',
                color: 'var(--ui-button-primary)',
                background: 'rgba(var(--ui-button-primary-rgb, 0,172,193), 0.12)',
                border: '1px solid rgba(var(--ui-button-primary-rgb, 0,172,193), 0.25)',
                borderRadius: '999px',
                padding: '1px 8px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                marginLeft: '0.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <i className="pi pi-link" style={{ fontSize: '0.6rem', opacity: 0.8 }}></i>
                {sidebarFontSize} px · auto
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1fr',
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
                  id="sidebar-font"
                  value={uiFont || sidebarFont}
                  options={explorerFonts.map(f => ({ label: f, value: f }))}
                  onChange={e => handleUnifiedFontChange && handleUnifiedFontChange(e.value)}
                  placeholder={t('appearance.sessionExplorer.selectFont')}
                  style={{ flex: 1 }}
                  itemTemplate={option => (
                    <span style={{ fontFamily: buildSidebarFontStack(option.value) }}>{option.label}</span>
                  )}
                />
              </div>

              {/* Color de Fuente */}
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
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>Color</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="color"
                      id="sidebar-font-color-input"
                      value={sidebarFontColor || '#ffffff'}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        if (handleSidebarFontColorChange) {
                          handleSidebarFontColorChange(newColor);
                        } else if (setSidebarFontColor) {
                          setSidebarFontColor(newColor);
                        }
                      }}
                      style={{
                        flex: 1,
                        height: '36px',
                        minWidth: '80px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        backgroundColor: 'transparent'
                      }}
                    />
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--ui-button-primary)',
                      fontWeight: 600,
                      minWidth: '70px',
                      textAlign: 'right',
                      fontFamily: 'monospace'
                    }}>{sidebarFontColor || 'Por defecto'}</span>
                  </div>
                  {sidebarFontColor && (
                    <Button
                      icon="pi pi-times"
                      className="p-button-text p-button-rounded"
                      onClick={() => {
                        console.log('[SettingsDialog] Restaurando color por defecto');
                        try {
                          localStorage.removeItem('sidebarFontColorSource');
                          localStorage.removeItem('sidebarFontColor');
                          // Force immediate sync so the deletion is written to
                          // app-data.json before a possible app restart
                          localStorageSyncService.forceSync();
                        } catch { }
                        if (setSidebarFontColor) setSidebarFontColor('');
                      }}
                      tooltip={t('appearance.sessionExplorer.restoreColor')}
                      tooltipOptions={{ position: 'top' }}
                      style={{
                        width: '36px',
                        height: '36px',
                        padding: 0,
                        color: 'var(--text-color-secondary)'
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Tamaño de Iconos */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minWidth: '50px'
                }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>Iconos / Carpetas</span>
                </div>
                <SmoothIconSlider 
                  connectionIconSize={connectionIconSize} 
                  setConnectionIconSize={setConnectionIconSize} 
                />
              </div>

            </div>
          </div>


          {/* ═══════════════════════════════════════════════════════════════
            VISTA PREVIA DE ICONOS DE ACCIÓN
            ═══════════════════════════════════════════════════════════════ */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.08)',
            borderRadius: '10px',
            padding: '0.875rem 1rem',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginTop: '1rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <i className="pi pi-eye" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--ui-dialog-text)'
              }}>Vista Previa de Iconos de Acción</span>
            </div>

            {/* Vista previa de iconos */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '0.75rem',
              padding: '0.75rem',
              background: 'rgba(0, 0, 0, 0.15)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              {sessionActionIconThemes[sessionActionIconTheme || 'modern'] && (
                <>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ui-sidebar-text)'
                    }}>
                      {sessionActionIconThemes[sessionActionIconTheme || 'modern'].icons.collapseLeft}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', textAlign: 'center' }}>Colapsar</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ui-sidebar-text)'
                    }}>
                      {sessionActionIconThemes[sessionActionIconTheme || 'modern'].icons.newConnection}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', textAlign: 'center' }}>Nueva Conexión</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ui-sidebar-text)'
                    }}>
                      {sessionActionIconThemes[sessionActionIconTheme || 'modern'].icons.newFolder}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', textAlign: 'center' }}>Nueva Carpeta</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ui-sidebar-text)'
                    }}>
                      {sessionActionIconThemes[sessionActionIconTheme || 'modern'].icons.newGroup}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', textAlign: 'center' }}>Nuevo Grupo</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffc107'
                    }}>
                      {sessionActionIconThemes[sessionActionIconTheme || 'modern'].icons.passwordManager}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', textAlign: 'center' }}>Contraseñas</span>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SessionExplorerSubTab;
