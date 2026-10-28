import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import appIcon from '../assets/app-icon.png';
import { ensureIconTheme } from '../themes/icon-themes';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { themeManager } from '../utils/themeManager';
import { appConfirm } from './ui/AppConfirm';
import TitleBarUpdateButton from './TitleBarUpdateButton';
import TitleBarSearch from './TitleBarSearch';
import {
  UI_LAYOUT_OPTIONS,
  getCurrentUILayoutId,
  setUILayout,
} from '../utils/appearanceLayout';

const TitleBarIconButton = ({
  title,
  onClick,
  active = false,
  danger = false,
  className = '',
  children,
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active || undefined}
    className={`title-bar-icon-btn${active ? ' is-active' : ''}${danger ? ' is-danger' : ''}${className ? ` ${className}` : ''}`}
    onClick={onClick}
  >
    {children}
  </button>
);

/* Layout Cursor-like: misma forma, trazo fino (sin relleno grueso) */
const LAYOUT_STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const IconSidebarLeft = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" rx="1.5" {...LAYOUT_STROKE} />
    <path d="M6 2v12" {...LAYOUT_STROKE} />
  </svg>
);

const IconMinimal = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" rx="1.5" {...LAYOUT_STROKE} />
  </svg>
);

const IconPanelTop = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" rx="1.5" {...LAYOUT_STROKE} />
    <path d="M2 5.5h12" {...LAYOUT_STROKE} />
  </svg>
);

const IconLayout = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="1.5" y="1.5" width="5" height="13" rx="1.2" {...LAYOUT_STROKE} />
    <rect x="8.5" y="1.5" width="6" height="5.5" rx="1.2" {...LAYOUT_STROKE} />
    <rect x="8.5" y="9" width="6" height="5.5" rx="1.2" {...LAYOUT_STROKE} />
  </svg>
);

const TitleBar = ({
  sidebarFilter,
  setSidebarFilter,
  allNodes,
  onOpenSSHConnection,
  onOpenRdpConnection,
  onOpenVncConnection,
  onShowImportDialog,
  onShowExportDialog,
  onShowImportExportDialog,
  onShowImportWizard,
  onOpenImportWithSource,
  onQuickImportFromSource,
  iconTheme = 'material',
  openEditSSHDialog,
  openEditRdpDialog,
  expandedKeys,
  masterKey,
  secureStorage,
  onToggleTitleBar,
  sidebarCollapsed = false,
  isMinimalMode = false,
  tabBarCollapsed = false,
  sidebarCallbacksRef,
}) => {
  // Hook de internacionalización
  const { t } = useTranslation('common');

  const [isMaximized, setIsMaximized] = useState(false);
  const layoutBtnRef = useRef(null);
  const [layoutPopoverOpen, setLayoutPopoverOpen] = useState(false);
  const [currentUiLayout, setCurrentUiLayout] = useState(() => getCurrentUILayoutId());

  useEffect(() => {
    const syncLayout = () => setCurrentUiLayout(getCurrentUILayoutId());
    window.addEventListener('layout-changed', syncLayout);
    return () => window.removeEventListener('layout-changed', syncLayout);
  }, []);

  useEffect(() => {
    if (!layoutPopoverOpen) return;
    const onDown = (e) => {
      if (layoutBtnRef.current?.contains(e.target)) return;
      if (e.target?.closest?.('.title-bar-layout-popover')) return;
      setLayoutPopoverOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setLayoutPopoverOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [layoutPopoverOpen]);

  const handleSelectUiLayout = useCallback((layoutId) => {
    setUILayout(layoutId);
    setCurrentUiLayout(layoutId);
    setLayoutPopoverOpen(false);
  }, []);

  useEffect(() => {
    ensureIconTheme(iconTheme);
  }, [iconTheme]);



  // Banner para detectar cambios en fuentes vinculadas (usuario inicia revalidación bajo demanda)
  const [importBanner, setImportBanner] = useState(null);

  // Sincronizar titlebar al montar y tras cambio de tema o estilo de apariencia
  useEffect(() => {
    const syncTitlebarColors = () => themeManager.refreshTitlebarForCurrentLayout();
    syncTitlebarColors();
    window.addEventListener('theme-changed', syncTitlebarColors);
    window.addEventListener('layout-changed', syncTitlebarColors);
    return () => {
      window.removeEventListener('theme-changed', syncTitlebarColors);
      window.removeEventListener('layout-changed', syncTitlebarColors);
    };
  }, []);

  // Sincronizar el estado de maximizado de la ventana al redimensionar (con debounce para evitar inundación de IPC)
  useEffect(() => {
    let debounceTimeout = null;
    const handleResize = () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        if (window.electronAPI?.isMaximized) {
          window.electronAPI.isMaximized().then(maximized => {
            setIsMaximized(maximized);
          });
        }
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    
    // Verificar estado inicial inmediatamente
    if (window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then(maximized => {
        setIsMaximized(maximized);
      });
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, []);

  // Efecto para crear copos de nieve dinámicamente para el tema Winter Snowfall
  useEffect(() => {
    const titleBar = document.querySelector('.title-bar');
    if (!titleBar) return;

    // Verificar si el tema es winter-snowfall
    const checkAnimation = () => {
      const animation = titleBar.getAttribute('data-animation');
      return animation === 'winter-snowfall';
    };

    // Crear copos de nieve si el tema está activo
    if (checkAnimation()) {
      const snowflakes = [];

      // Crear 6 copos de nieve adicionales
      for (let i = 1; i <= 6; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = `snowflake-${i}`;
        snowflake.textContent = '❄';
        titleBar.appendChild(snowflake);
        snowflakes.push(snowflake);
      }

      // Cleanup: remover copos cuando el componente se desmonte o cambie el tema
      return () => {
        snowflakes.forEach(snowflake => {
          if (snowflake.parentNode) {
            snowflake.parentNode.removeChild(snowflake);
          }
        });
      };
    }
  }, []);

  // Observer para detectar cambios en data-animation
  useEffect(() => {
    const titleBar = document.querySelector('.title-bar');
    if (!titleBar) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-animation') {
          const animation = titleBar.getAttribute('data-animation');

          // Limpiar elementos animados existentes
          const existingSnowflakes = titleBar.querySelectorAll('[class^="snowflake-"]');
          const existingRaindrops = titleBar.querySelectorAll('[class^="raindrop-"]');
          const existingLightning = titleBar.querySelectorAll('[class^="lightning-"]');
          const existingSand = titleBar.querySelectorAll('[class^="sand-"]');
          existingSnowflakes.forEach(el => el.remove());
          existingRaindrops.forEach(el => el.remove());
          existingLightning.forEach(el => el.remove());
          existingSand.forEach(el => el.remove());

          // Crear nuevos copos si es winter-snowfall
          if (animation === 'winter-snowfall') {
            // Verificar velocidad de animación
            const animSpeed = document.documentElement.getAttribute('data-ui-anim-speed') || 'normal';
            const maxSnowflakes = animSpeed === 'slow' ? 2 : (animSpeed === 'normal' ? 8 : 6); // Más copos en normal

            for (let i = 1; i <= maxSnowflakes; i++) {
              const snowflake = document.createElement('div');
              snowflake.className = `snowflake-${i}`;
              snowflake.textContent = '❄';
              titleBar.appendChild(snowflake);
            }
          }

          // Crear gotas de lluvia y relámpagos si es thunderstorm
          if (animation === 'thunderstorm') {
            // Verificar velocidad de animación
            const animSpeed = document.documentElement.getAttribute('data-ui-anim-speed') || 'normal';
            const maxRaindrops = animSpeed === 'slow' ? 4 : (animSpeed === 'normal' ? 16 : 12); // Más gotas en normal
            const maxLightning = animSpeed === 'slow' ? 1 : (animSpeed === 'normal' ? 3 : 2); // Más rayos en normal

            // Crear gotas de lluvia
            for (let i = 1; i <= maxRaindrops; i++) {
              const raindrop = document.createElement('div');
              raindrop.className = `raindrop-${i}`;
              raindrop.textContent = '💧';
              titleBar.appendChild(raindrop);
            }

            // Crear rayos visibles
            for (let i = 1; i <= maxLightning; i++) {
              const lightning = document.createElement('div');
              lightning.className = `lightning-${i}`;
              lightning.textContent = '⚡';
              titleBar.appendChild(lightning);
            }
          }

          // Crear partículas de arena si es desert-storm
          if (animation === 'desert-storm') {
            // Verificar velocidad de animación
            const animSpeed = document.documentElement.getAttribute('data-ui-anim-speed') || 'normal';
            const maxSand = animSpeed === 'slow' ? 5 : (animSpeed === 'normal' ? 20 : 15); // Más partículas en normal

            for (let i = 1; i <= maxSand; i++) {
              const sand = document.createElement('div');
              sand.className = `sand-${i}`;
              sand.textContent = '•';
              titleBar.appendChild(sand);
            }
          }
        }
      });
    });

    observer.observe(titleBar, {
      attributes: true,
      attributeFilter: ['data-animation']
    });

    return () => observer.disconnect();
  }, []);
  const [bannerTime, setBannerTime] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      const { source, hasChange } = e.detail || {};
      if (!source) return;
      // Mostrar banner solo si hay cambio confirmado
      if (hasChange === true) {
        setImportBanner({ fileName: source?.fileName, source });
        setBannerTime(new Date());
      }
    };
    window.addEventListener('import-source:poll', handler);
    return () => window.removeEventListener('import-source:poll', handler);
  }, []);

  const handleRecheckImportSource = async (source) => {
    try {
      // Intento directo: si tenemos ruta guardada, comparar hash y ofrecer actualizar
      const filePath = source?.filePath;
      if (!filePath) {
        window.dispatchEvent(new CustomEvent('open-settings-tab', { detail: { mainTab: 'importar-exportar' } }));
        setImportBanner(null);
        return;
      }
      const info = await window.electron?.import?.getFileInfo?.(filePath);
      if (!info?.ok) {
        window.dispatchEvent(new CustomEvent('open-settings-tab', { detail: { mainTab: 'importar-exportar' } }));
        setImportBanner(null);
        return;
      }
      const hashRes = await window.electron?.import?.getFileHash?.(filePath);
      if (!hashRes?.ok) {
        window.dispatchEvent(new CustomEvent('open-settings-tab', { detail: { mainTab: 'importar-exportar' } }));
        setImportBanner(null);
        return;
      }
      const changed = hashRes.hash && source.fileHash && hashRes.hash !== source.fileHash;
      if (changed) {
        // Abrir Configuracion -> Importar/Exportar para aplicar con opciones
        window.dispatchEvent(new CustomEvent('open-settings-tab', { detail: { mainTab: 'importar-exportar' } }));
      } else {
        alert('No se han detectado cambios en el archivo vinculado.');
      }
      setImportBanner(null);
    } catch (err) {
      console.error('Error revalidando fuente de importación:', err);
    }
  };

  const handleMinimize = () => {
    window.electronAPI?.minimize && window.electronAPI.minimize();
  };
  const handleMaximizeRestore = () => {
    if (isMaximized) {
      window.electronAPI?.unmaximize && window.electronAPI.unmaximize();
      setIsMaximized(false);
    } else {
      window.electronAPI?.maximize && window.electronAPI.maximize();
      setIsMaximized(true);
    }
  };
  const handleClose = () => {
    window.electronAPI?.close && window.electronAPI.close();
  };

  return (
    <div
      className="title-bar"
      style={{
        height: 36,
        minHeight: 36,
        maxHeight: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--ui-titlebar-accent, #1976d2)',
        boxShadow: 'none',
        padding: '0 6px',
        userSelect: 'none',
        WebkitAppRegion: 'drag',
        zIndex: 1000,
        position: 'relative',
        border: '1px solid var(--ui-titlebar-border, rgba(255,255,255,0.14))',
        borderBottom: 'none',
        boxSizing: 'border-box',
        borderRadius: 10,
        margin: '8px 6px 0 6px',
        overflow: 'hidden'
      }}
    >
      {importBanner && (
        <div style={{
          position: 'absolute',
          top: 34,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface-card, #2b2f33)',
          border: '1px solid var(--surface-border, #3a3f44)',
          color: 'var(--text-color, #e0e0e0)',
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 2000
        }}>
          <span>Detectado cambio en “{importBanner.fileName}”. {bannerTime ? `(${bannerTime.toLocaleTimeString()})` : ''}</span>
          <button
            onClick={() => { if (onQuickImportFromSource) onQuickImportFromSource(importBanner.source); setImportBanner(null); }}
            style={{
              background: 'var(--primary-color, #1976d2)',
              color: 'var(--primary-color-text, #fff)',
              border: 'none',
              padding: '4px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12
            }}
          >{t('appMenu.updateNow')}</button>
          <button
            onClick={() => {
              if (onOpenImportWithSource) onOpenImportWithSource(importBanner.source);
              setImportBanner(null);
            }}
            style={{
              background: 'transparent',
              color: 'var(--primary-color, #1976d2)',
              border: '1px solid var(--primary-color, #1976d2)',
              padding: '3px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12
            }}
          >Revisar</button>
          <button
            onClick={() => setImportBanner(null)}
            style={{
              background: 'transparent',
              color: 'var(--text-color-secondary, #a0a0a0)',
              border: 'none',
              padding: '2px 6px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12
            }}
          >Ignorar</button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 6 }}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          style={{
            width: 18,
            height: 18,
            marginRight: 6,
            marginLeft: 8,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <g fill="var(--ui-titlebar-text, #fff)">
            {/* Símbolo > de prompt */}
            <path d="M7 8 L11 12 L7 16" stroke="var(--ui-titlebar-text, #fff)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* Línea de comando _ */}
            <rect x="13" y="15" width="5" height="1.5" rx="0.75" className="title-cursor-blink" />
          </g>
        </svg>
        <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--ui-titlebar-text, #fff)', letterSpacing: 0.1, lineHeight: '18px', display: 'flex', alignItems: 'center', height: 18, marginTop: '2px' }}>NodeTerm</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 10, flex: 1, justifyContent: 'center' }}>
        <TitleBarSearch
          sidebarFilter={sidebarFilter}
          setSidebarFilter={setSidebarFilter}
          allNodes={allNodes}
          masterKey={masterKey}
          secureStorage={secureStorage}
          onOpenSSHConnection={onOpenSSHConnection}
          onOpenRdpConnection={onOpenRdpConnection}
          onOpenVncConnection={onOpenVncConnection}
          openEditSSHDialog={openEditSSHDialog}
          openEditRdpDialog={openEditRdpDialog}
          sidebarCallbacksRef={sidebarCallbacksRef}
        />
      </div>
      <div className="title-bar-actions">
        <div className="title-bar-action-group">
          <TitleBarIconButton
            title={sidebarCollapsed ? 'Mostrar sidebar' : 'Ocultar sidebar'}
            active={!sidebarCollapsed}
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
          >
            <IconSidebarLeft />
          </TitleBarIconButton>
          <TitleBarIconButton
            title={tabBarCollapsed ? 'Mostrar barra de pestañas' : 'Ocultar barra de pestañas'}
            active={!tabBarCollapsed}
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-tabbar'))}
          >
            <IconPanelTop />
          </TitleBarIconButton>
          <TitleBarIconButton
            title={isMinimalMode ? 'Salir del modo minimalista (Esc / Ctrl+Shift+M)' : 'Modo minimalista (Ctrl+Shift+M)'}
            active={isMinimalMode}
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-minimal-mode'))}
          >
            <IconMinimal />
          </TitleBarIconButton>
        </div>

        <div className="title-bar-action-sep" aria-hidden="true" />

        <div className="title-bar-action-group" ref={layoutBtnRef}>
          <TitleBarIconButton
            title="Cambiar layout de la UI"
            active={layoutPopoverOpen}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLayoutPopoverOpen((open) => !open);
            }}
          >
            <IconLayout />
          </TitleBarIconButton>
          {layoutPopoverOpen && layoutBtnRef.current && ReactDOM.createPortal(
            (() => {
              const rect = layoutBtnRef.current.getBoundingClientRect();
              const estimated = Math.min(360, UI_LAYOUT_OPTIONS.length * 32 + 16);
              const openUp = window.innerHeight - rect.bottom < estimated;
              return (
                <div
                  className="title-bar-layout-popover"
                  style={{
                    top: openUp ? Math.max(8, rect.top - estimated - 4) : rect.bottom + 4,
                    right: Math.max(8, window.innerWidth - rect.right),
                  }}
                  role="menu"
                >
                  {UI_LAYOUT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={currentUiLayout === opt.id}
                      className={`title-bar-layout-popover-item${currentUiLayout === opt.id ? ' is-selected' : ''}`}
                      onClick={() => handleSelectUiLayout(opt.id)}
                    >
                      <i className={`pi ${opt.icon}`} />
                      <span>{opt.name}</span>
                    </button>
                  ))}
                </div>
              );
            })(),
            document.body
          )}
        </div>

        <div className="title-bar-action-sep" aria-hidden="true" />

        <div className="title-bar-action-group">
          <TitleBarIconButton
            title="Tema y diseño de pestañas"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const anchor = event.currentTarget;
              window.dispatchEvent(new CustomEvent('open-appearance-quick-panel', {
                detail: { anchor }
              }));
            }}
          >
            <i className="pi pi-cog" />
          </TitleBarIconButton>
        </div>

        <TitleBarUpdateButton />

        <div className="title-bar-action-sep" aria-hidden="true" />

        <div className="title-bar-action-group">
          <TitleBarIconButton title="Minimizar" onClick={handleMinimize}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
              <rect x="3" y="6.5" width="8" height="1.7" rx="0.85" />
            </svg>
          </TitleBarIconButton>
          <TitleBarIconButton
            title={isMaximized ? 'Restaurar' : 'Maximizar'}
            onClick={handleMaximizeRestore}
          >
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M4.5 4.5v-2h7v7h-2M2.5 4.5h7v7h-7z" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
                <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            )}
          </TitleBarIconButton>
          <TitleBarIconButton title="Cerrar" danger onClick={handleClose}>
            <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
              <line x1="4" y1="4" x2="10" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="10" y1="4" x2="4" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </TitleBarIconButton>
        </div>
      </div>
    </div>
  );
};

export default TitleBar; 