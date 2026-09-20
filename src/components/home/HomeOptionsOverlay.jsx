import React, { useState } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Slider } from 'primereact/slider';
import { HomeWidgetPicker } from './connection-history';

const TABS = [
  { id: 'apariencia', label: 'Apariencia' },
  { id: 'paneles', label: 'Paneles' },
  { id: 'layout', label: 'Layout' }
];

function SwitchRow({ label, icon, iconStyle, checked, onToggle, themeColors }) {
  return (
    <div className="menu-item-row" onClick={onToggle}>
      <span style={{ color: themeColors.textPrimary || '#fff', fontSize: '0.86rem', fontWeight: 500 }}>
        {icon ? (
          <i className={icon} style={{ marginRight: '6px', fontSize: '0.8rem', opacity: 0.7, ...iconStyle }} />
        ) : null}
        {label}
      </span>
      <label className="premium-switch" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className="premium-slider"></span>
      </label>
    </div>
  );
}

function toggleMinimalMode() {
  try {
    window.dispatchEvent(new CustomEvent('toggle-minimal-mode'));
  } catch (e) {
    /* noop */
  }
}

export default function HomeOptionsOverlay({
  overlayRef,
  themeColors = {},
  themes = {},
  localLinuxTerminalTheme,
  terminalFrameStyleLabel,
  terminalOpacity,
  onTerminalOpacityChange,
  showLocalTerminalTabs,
  onToggleLocalTabs,
  statusBarVisible,
  onToggleStatusBar,
  onOpenLocalTheme,
  onOpenFrameStyle,
  panelsLayout,
  onTogglePanel,
  onToggleMinimizePanel,
  smartSnap,
  onToggleSmartSnap,
  onEqualizeBottomRow,
  onAutoOrganizePanels,
  onApplyBuiltinPreset,
  onApplySplitPreset,
  onApplyTerminalMaxPreset,
  newPresetName,
  onNewPresetNameChange,
  onSaveCustomPreset,
  userPresets,
  onApplyCustomPreset,
  onDeleteCustomPreset,
  onResetLayout,
  isMinimalMode
}) {
  const [activeTab, setActiveTab] = useState('apariencia');
  const primary = themeColors.primaryColor || '#2196f3';
  const text = themeColors.textPrimary || '#fff';
  const themePreview = themes[localLinuxTerminalTheme]?.theme || {};
  const themeAccent = themePreview.cursor || themePreview.green || themePreview.blue || themePreview.foreground || '#fff';

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    requestAnimationFrame(() => {
      try {
        overlayRef?.current?.align?.();
      } catch (e) {
        /* noop */
      }
    });
  };

  return (
    <OverlayPanel
      ref={overlayRef}
      className="premium-overlay home-options-overlay"
    >
      <div
        className="home-options-shell"
        style={{ '--home-options-accent': primary }}
      >
        <div className="home-options-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`home-options-tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="home-options-body">
          {activeTab === 'apariencia' && (
            <>
              <div className="home-options-opacity">
                <div className="home-options-opacity-row">
                  <span style={{ color: text, fontSize: '0.95rem', fontWeight: 600 }}>Opacidad</span>
                  <span
                    className="home-options-opacity-value"
                    style={{
                      color: primary,
                      background: `${primary}22`
                    }}
                  >
                    {Math.round(terminalOpacity * 100)}%
                  </span>
                </div>
                <Slider
                  value={terminalOpacity * 100}
                  onChange={(e) => onTerminalOpacityChange?.(e.value / 100)}
                  min={5}
                  max={100}
                  step={1}
                  style={{ width: '100%', height: '4px' }}
                />
              </div>

              <div className="home-options-field">
                <div className="home-options-field-label">
                  <span style={{ color: text }}>Tema terminal local</span>
                  <i className="pi pi-palette" style={{ color: primary, fontSize: '0.8rem', opacity: 0.8 }} />
                </div>
                <button
                  type="button"
                  className="home-options-select"
                  onClick={onOpenLocalTheme}
                  style={{
                    borderColor: `${themeAccent}55`,
                    background: `linear-gradient(90deg, ${(themePreview.background || '#111')}cc 0%, rgba(255,255,255,0.08) 100%)`,
                    color: text
                  }}
                  title="Tema (Linux/WSL)"
                >
                  <span className="home-options-select-main">
                    <span
                      className="home-options-theme-swatch"
                      style={{
                        background: `linear-gradient(135deg, ${themePreview.background || '#111'} 0%, ${themePreview.background || '#111'} 50%, ${themeAccent} 100%)`,
                        borderColor: themePreview.cursor || themePreview.foreground || 'rgba(255,255,255,0.2)'
                      }}
                    />
                    <span className="home-options-select-text">{localLinuxTerminalTheme}</span>
                  </span>
                  <i className="pi pi-chevron-down" />
                </button>
              </div>

              <div className="home-options-field">
                <div className="home-options-field-label">
                  <span style={{ color: text }}>Estilo de marco</span>
                  <i className="pi pi-desktop" style={{ color: primary, fontSize: '0.8rem', opacity: 0.8 }} />
                </div>
                <button
                  type="button"
                  className="home-options-select"
                  onClick={onOpenFrameStyle}
                  style={{
                    borderColor: themeColors.borderColor || 'rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)',
                    color: text
                  }}
                  title="Estilo de marco de la ventana del terminal"
                >
                  <span className="home-options-select-text">{terminalFrameStyleLabel}</span>
                  <i className="pi pi-chevron-down" />
                </button>
              </div>

              <SwitchRow
                label="Pestañas"
                checked={!!showLocalTerminalTabs}
                onToggle={onToggleLocalTabs}
                themeColors={themeColors}
              />
              <SwitchRow
                label="Status bar terminal local"
                checked={!!statusBarVisible}
                onToggle={onToggleStatusBar}
                themeColors={themeColors}
              />
              <SwitchRow
                label="Modo Minimalista Absoluto"
                checked={!!isMinimalMode}
                onToggle={toggleMinimalMode}
                themeColors={themeColors}
              />
            </>
          )}

          {activeTab === 'paneles' && (
            <>
              <SwitchRow
                label="Buscador y Acciones"
                icon="pi pi-search"
                checked={panelsLayout?.search?.visible !== false}
                onToggle={() => onTogglePanel?.('search')}
                themeColors={themeColors}
              />
              <SwitchRow
                label="Terminal Integrado"
                icon="pi pi-desktop"
                checked={!panelsLayout?.terminal?.isMinimized}
                onToggle={() => onToggleMinimizePanel?.('terminal')}
                themeColors={themeColors}
              />
              <HomeWidgetPicker
                panelsLayout={panelsLayout}
                onTogglePanel={onTogglePanel}
              />
            </>
          )}

          {activeTab === 'layout' && (
            <>
              <SwitchRow
                label="Alineación Magnética (Snap)"
                icon="pi pi-table"
                iconStyle={{ opacity: 1, color: '#00e5ff' }}
                checked={!!smartSnap}
                onToggle={onToggleSmartSnap}
                themeColors={themeColors}
              />

              <div className="home-options-actions">
                <button
                  type="button"
                  className="home-options-action-btn is-primary"
                  onClick={onEqualizeBottomRow}
                  title="Alinear al mismo nivel Y, misma altura y distribuir uniformemente los módulos de la fila inferior"
                >
                  <i className="pi pi-align-justify" /> Nivelar Fila
                </button>
                <button
                  type="button"
                  className="home-options-action-btn"
                  onClick={onAutoOrganizePanels}
                  title="Ajustar y reorganizar inteligentemente todos los paneles activos"
                >
                  <i className="pi pi-sparkles" /> Auto-Ajustar
                </button>
              </div>

              <div className="home-options-section-label">Presets Oficiales</div>
              <div className="home-options-presets-grid">
                <button
                  type="button"
                  className="home-options-preset-btn accent-blue"
                  onClick={() => onApplyBuiltinPreset?.('launcher')}
                  title="Launcher: buscador, favoritos y terminal"
                >
                  <i className="pi pi-bolt" />
                  <span>Launcher</span>
                </button>
                <button
                  type="button"
                  className="home-options-preset-btn accent-cyan"
                  onClick={() => onApplyBuiltinPreset?.('dashboard-pro')}
                  title="Dashboard Pro: Terminal ancho arriba y fila con 4 widgets nivelados abajo"
                >
                  <i className="pi pi-th-large" />
                  <span>Dashboard</span>
                </button>
                <button
                  type="button"
                  className="home-options-preset-btn"
                  onClick={onApplySplitPreset}
                  style={{ color: text }}
                  title="Diseño dividido: Terminal a la izquierda y Recientes a la derecha"
                >
                  <i className="pi pi-pause" style={{ transform: 'rotate(90deg)' }} />
                  <span>2 Columnas</span>
                </button>
                <button
                  type="button"
                  className="home-options-preset-btn"
                  onClick={onApplyTerminalMaxPreset}
                  style={{ color: text }}
                  title="Maximizar terminal en la pantalla de inicio"
                >
                  <i className="pi pi-window-maximize" />
                  <span>Terminal Max</span>
                </button>
              </div>

              <div className="home-presets-section">
                <div className="home-options-section-label">Mis Presets</div>
                <div className="home-presets-save-row">
                  <input
                    type="text"
                    className="home-presets-input"
                    placeholder="Nombre de mi preset..."
                    value={newPresetName}
                    onChange={(e) => onNewPresetNameChange?.(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        onSaveCustomPreset?.();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="home-presets-save-btn"
                    onClick={onSaveCustomPreset}
                    title="Guardar distribución actual de paneles"
                  >
                    <i className="pi pi-bookmark" /> Guardar
                  </button>
                </div>

                {userPresets && userPresets.length > 0 && (
                  <div className="home-presets-list">
                    {userPresets.map((preset) => (
                      <div key={preset.id} className="home-preset-item">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                          {preset.name}
                        </span>
                        <div className="home-preset-item-actions">
                          <button
                            type="button"
                            className="home-preset-apply-btn"
                            onClick={() => onApplyCustomPreset?.(preset)}
                            title="Aplicar preset"
                          >
                            Cargar
                          </button>
                          <button
                            type="button"
                            className="home-preset-delete-btn"
                            onClick={() => onDeleteCustomPreset?.(preset.id)}
                            title="Eliminar preset"
                          >
                            <i className="pi pi-trash" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="home-options-reset-btn"
                onClick={onResetLayout}
                style={{ color: text }}
                title="Restablecer posición y tamaño de todos los paneles a sus valores por defecto"
              >
                <i className="pi pi-refresh" /> Restablecer Posiciones
              </button>
            </>
          )}
        </div>
      </div>
    </OverlayPanel>
  );
}
