import React, { useState, useEffect, useMemo } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Slider } from 'primereact/slider';
import { Checkbox } from 'primereact/checkbox';
import { useTranslation } from '../../../../i18n/hooks/useTranslation';
import { STORAGE_KEYS } from '../../../../utils/constants';
import { explorerFonts } from '../../../../themes';
import { buildSidebarFontStack } from '../../../../utils/sidebarFontStack';
import { actionBarThemes } from '../../../../themes/action-bar-themes';
import {
  actionBarIconThemes,
  actionBarIconThemeList,
  getActionBarIcon,
  actionBarIconColors,
  actionBarIconNames
} from '../../../../themes/action-bar-icon-themes';

export const HomePageSubTab = ({
  uiFont,
  handleUnifiedFontChange
}) => {
  const { t } = useTranslation('settings');

  // Configuración de tipografía de HomeTab
  const [homeTabFont, setHomeTabFont] = useState(() => {
    try {
      return localStorage.getItem('uiFont') || localStorage.getItem('homeTabFont') || explorerFonts[0];
    } catch {
      return explorerFonts[0];
    }
  });

  useEffect(() => {
    const handleUiFontChange = (e) => {
      const font = e.detail?.font || localStorage.getItem('uiFont');
      if (font) setHomeTabFont(font);
    };
    window.addEventListener('ui-font-changed', handleUiFontChange);
    return () => window.removeEventListener('ui-font-changed', handleUiFontChange);
  }, []);

  useEffect(() => {
    if (uiFont && uiFont !== homeTabFont) {
      setHomeTabFont(uiFont);
    }
  }, [uiFont]);

  const [homeTabFontSize, setHomeTabFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem('homeTabFontSize');
      return saved ? parseInt(saved, 10) : 15;
    } catch {
      return 15;
    }
  });

  // Tema de iconos de la barra de acciones
  const [actionBarIconTheme, setActionBarIconTheme] = useState(() => {
    try {
      return localStorage.getItem('actionBarIconTheme') || 'original';
    } catch {
      return 'original';
    }
  });

  // Tema visual de la barra de acciones (Contenedor/Efectos)
  const [actionBarTheme, setActionBarTheme] = useState(() => {
    try {
      return localStorage.getItem('actionBarTheme') || 'default';
    } catch {
      return 'default';
    }
  });

  const activeActionBarVisualTheme = useMemo(() => {
    return actionBarThemes[actionBarTheme] || actionBarThemes.default;
  }, [actionBarTheme]);

  // Configuración para mostrar/ocultar terminal local al iniciar
  const [localTerminalVisible, setLocalTerminalVisible] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE);
      return saved !== null ? saved === 'true' : false; // Por defecto false (oculto)
    } catch {
      return false;
    }
  });

  // Configuración para mostrar/ocultar statusbar al iniciar
  const [statusBarVisible, setStatusBarVisible] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOME_TAB_STATUS_BAR_VISIBLE);
      return saved !== null ? saved === 'true' : true; // Por defecto true (visible)
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('homeTabFontSize', String(homeTabFontSize));
      window.dispatchEvent(new CustomEvent('home-tab-font-changed'));
    } catch { }
  }, [homeTabFontSize]);

  // Persistir tema de iconos de la barra de acciones
  useEffect(() => {
    try {
      localStorage.setItem('actionBarIconTheme', actionBarIconTheme);
      window.dispatchEvent(new CustomEvent('action-bar-icon-theme-changed', {
        detail: { theme: actionBarIconTheme }
      }));
    } catch { }
  }, [actionBarIconTheme]);

  // Persistir configuración de visibilidad del terminal local
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE, String(localTerminalVisible));
      window.dispatchEvent(new CustomEvent('home-tab-local-terminal-visibility-changed'));
    } catch { }
  }, [localTerminalVisible]);

  // Persistir configuración de visibilidad de la statusbar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HOME_TAB_STATUS_BAR_VISIBLE, String(statusBarVisible));
      window.dispatchEvent(new CustomEvent('statusbar-visibility-changed', {
        detail: { visible: statusBarVisible }
      }));
    } catch { }
  }, [statusBarVisible]);

  return (
    <div className="general-settings-container" style={{ maxWidth: '100%', margin: '0 auto' }}>
      {/* Header */}
      <div className="general-settings-header-wrapper">
        <div className="general-header-content">
          <span className="general-header-icon protocol-dialog-header-icon" style={{
            background: 'linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%)',
            boxShadow: '0 2px 8px rgba(79, 195, 247, 0.25)'
          }}>
            <i className="pi pi-home"></i>
          </span>
          <div className="general-header-text">
            <h3 className="general-header">{t('sidebar.homePage')}</h3>
            <p className="general-description">{t('appearance.homePage.description')}</p>
          </div>
        </div>
      </div>

      {/* Sección de Tipografía */}
      <div className="general-settings-section" style={{
        marginBottom: 0,
        maxWidth: '100%',
        width: '100%'
      }}>
        <div className="general-section-header">
          <div className="general-section-icon" style={{
            background: 'linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%)',
            boxShadow: '0 2px 8px rgba(79, 195, 247, 0.3)'
          }}>
            <i className="pi pi-pencil"></i>
          </div>
          <h4 className="general-section-title">{t('appearance.homePage.menuTypography')}</h4>
        </div>

        <div className="general-settings-options" style={{ padding: '1rem 1.25rem' }}>
          {/* Tipografía */}
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
              }}>{t('appearance.homePage.typography')}</span>
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
                  id="homeTab-font"
                  value={uiFont || homeTabFont}
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
                    value={homeTabFontSize}
                    onChange={(e) => setHomeTabFontSize(e.value)}
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
                  }}>{homeTabFontSize} px</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tema de Iconos */}
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
              <i className="pi pi-palette" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--ui-dialog-text)'
              }}>{t('appearance.homePage.iconTheme')}</span>
            </div>

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
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>{t('appearance.homePage.selectIconTheme')}</span>
              </div>
              <Dropdown
                id="actionbar-icon-theme"
                value={actionBarIconTheme}
                options={actionBarIconThemeList}
                onChange={e => setActionBarIconTheme(e.value)}
                placeholder={t('appearance.homePage.selectIconTheme')}
                style={{ flex: 1 }}
                itemTemplate={option => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {getActionBarIcon(option.value, 'nuevo', 18)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{option.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>{option.description}</div>
                    </div>
                  </div>
                )}
                valueTemplate={option => option ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {getActionBarIcon(option.value, 'nuevo', 16)}
                    </div>
                    <span>{option.label}</span>
                  </div>
                ) : t('appearance.homePage.selectIconTheme')}
              />
            </div>
          </div>

          {/* Tema Visual de la Barra */}
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
              <i className="pi pi-palette" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--ui-dialog-text)'
              }}>Tema de la Barra de Acciones</span>
            </div>

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
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>Seleccionar tema</span>
              </div>
              <Dropdown
                id="actionbar-visual-theme"
                value={actionBarTheme}
                options={Object.values(actionBarThemes).map(theme => ({ label: theme.name, value: theme.id }))}
                onChange={e => {
                  setActionBarTheme(e.value);
                  localStorage.setItem('actionBarTheme', e.value);
                  window.dispatchEvent(new CustomEvent('action-bar-theme-changed'));
                }}
                placeholder="Seleccionar tema visual"
                style={{ flex: 1 }}
                itemTemplate={option => {
                  const theme = actionBarThemes[option.value];
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        background: theme.container.background,
                        border: theme.container.border !== 'none' ? theme.container.border : '1px solid rgba(255,255,255,0.1)',
                        backdropFilter: theme.container.backdropFilter
                      }}></div>
                      <span>{theme.name}</span>
                    </div>
                  );
                }}
              />
            </div>
          </div>

          {/* Terminal Local */}
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
              <i className="pi pi-terminal" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--ui-dialog-text)'
              }}>{t('appearance.homePage.localTerminal')}</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                flex: 1
              }}>
                <span style={{
                  fontSize: '0.8125rem',
                  color: 'var(--ui-dialog-text)',
                  fontWeight: 500
                }}>{t('appearance.homePage.showLocalTerminal')}</span>
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-color-secondary)'
                }}>{t('appearance.homePage.showLocalTerminalDescription')}</span>
              </div>
              <Checkbox
                inputId="local-terminal-visible"
                checked={localTerminalVisible}
                onChange={(e) => setLocalTerminalVisible(e.checked)}
              />
            </div>
          </div>

          {/* Status Bar */}
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
              <i className="pi pi-bars" style={{ fontSize: '0.875rem', color: 'var(--ui-button-primary)' }}></i>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--ui-dialog-text)'
              }}>{t('appearance.homePage.statusBar')}</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                flex: 1
              }}>
                <span style={{
                  fontSize: '0.8125rem',
                  color: 'var(--ui-dialog-text)',
                  fontWeight: 500
                }}>{t('appearance.homePage.showStatusBar')}</span>
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-color-secondary)'
                }}>{t('appearance.homePage.showStatusBarDescription')}</span>
              </div>
              <Checkbox
                inputId="status-bar-visible"
                checked={statusBarVisible}
                onChange={(e) => setStatusBarVisible(e.checked)}
              />
            </div>
          </div>

          {/* Vista Previa */}
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
              }}>{t('appearance.homePage.preview')}</span>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.15)',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{
                width: '74px',
                height: 'auto',
                minHeight: '240px',
                background: activeActionBarVisualTheme.container.background,
                backdropFilter: activeActionBarVisualTheme.container.backdropFilter,
                WebkitBackdropFilter: activeActionBarVisualTheme.container.backdropFilter,
                border: activeActionBarVisualTheme.container.border,
                borderRadius: '14px',
                boxShadow: activeActionBarVisualTheme.container.boxShadow,
                display: 'flex',
                flexDirection: 'column',
                padding: '0.6rem 0.4rem',
                gap: '0.35rem',
                boxSizing: 'border-box'
              }}>
                {[
                  { label: 'Nuevo', icon: 'nuevo' },
                  { label: 'Grupo', icon: 'grupo' },
                  { label: 'Sesiones', icon: 'conexiones' },
                  { label: 'Contraseñas', icon: 'contraseñas' },
                  { label: 'Audit', icon: 'audit' }
                ].map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.125rem',
                    padding: '0.4rem 0',
                    borderRadius: '12px',
                    background: activeActionBarVisualTheme.button.background,
                    border: activeActionBarVisualTheme.button.border,
                    boxShadow: activeActionBarVisualTheme.button.boxShadow,
                    backdropFilter: activeActionBarVisualTheme.button.backdropFilter || 'none',
                    WebkitBackdropFilter: activeActionBarVisualTheme.button.backdropFilter || 'none',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: activeActionBarVisualTheme.iconBox.borderRadius,
                      background: `linear-gradient(135deg, ${actionBarIconColors[item.icon] || '#4fc3f7'} 0%, ${(actionBarIconColors[item.icon] || '#4fc3f7')}dd 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 1px 4px ${(actionBarIconColors[item.icon] || '#4fc3f7')}40`
                    }}>
                      {getActionBarIcon(actionBarIconTheme, item.icon, 16)}
                    </div>
                    <span style={{
                      fontSize: '8px',
                      fontFamily: homeTabFont,
                      color: 'var(--text-color-secondary)',
                      textAlign: 'center',
                      opacity: 0.8,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%',
                      padding: '0 2px'
                    }}>{item.label}</span>
                  </div>
                ))}
              </div>

              <div style={{
                marginLeft: '1.5rem',
                flex: 1,
                height: '240px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '12px',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-color-secondary)',
                fontSize: '0.8rem'
              }}>
                Contenido del HomeTab
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePageSubTab;
