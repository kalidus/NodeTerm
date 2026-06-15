import React, { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Dropdown } from 'primereact/dropdown';
import { Slider } from 'primereact/slider';
import { treeThemes, treeThemeOptions } from '../themes/tree-themes';
import { iconThemes } from '../themes/icon-themes';
import { sessionActionIconThemes } from '../themes/session-action-icons';
import { explorerFonts } from '../themes';
import '../styles/components/tree-themes.css';

const TB_ICON = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '16px',
  height: '16px'
};

const SidebarAppearanceMenu = ({
  treeTheme,
  setTreeTheme,
  iconTheme = 'nord',
  setIconTheme,
  sessionActionIconTheme = 'modern',
  setSessionActionIconTheme,
  explorerFont,
  setExplorerFont,
  explorerFontSize,
  setExplorerFontSize,
  explorerFontColor,
  setExplorerFontColor,
  iconSize,
  setIconSize,
  tooltip = 'Apariencia del árbol',
}) => {
  const panelRef = useRef(null);
  const [settingsView, setSettingsView] = useState('choice');
  const themeIcons = sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons;

  return (
    <>
      <button
        type="button"
        className="sidebar-panel-toolbar-btn sidebar-panel-toolbar-btn--appearance"
        onClick={(e) => panelRef.current?.toggle(e)}
        title={tooltip}
        aria-label={tooltip}
      >
        <span style={TB_ICON}>
          {themeIcons?.settings ?? <i className="pi pi-cog" style={{ fontSize: '1rem' }} />}
        </span>
      </button>

      <OverlayPanel
        ref={panelRef}
        id="sidebar_appearance_panel"
        style={{
          width: '280px',
          background: 'var(--ui-dialog-bg, #1a1a1e)',
          border: '1px solid var(--ui-tab-border, rgba(255,255,255,0.1))',
          borderRadius: '12px',
          boxShadow: '0 15px 50px rgba(0,0,0,0.8)',
          backdropFilter: 'blur(30px)',
          zIndex: 10001,
          marginTop: '5px'
        }}
        className="glass-panel tree-theme-overlay-fix"
        appendTo={document.body}
        onHide={() => setSettingsView('choice')}
      >
        <div style={{ padding: '8px' }}>
          {settingsView === 'choice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '0 8px' }}>
                <i className="pi pi-palette" style={{ color: 'var(--primary-color)', fontSize: '1rem' }} />
                <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--ui-sidebar-text)', letterSpacing: '0.5px' }}>
                  Apariencia Sidebar
                </span>
              </div>
              <div
                onClick={() => setSettingsView('tree')}
                className="theme-item"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSettingsView('tree'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px',
                  cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(33, 150, 243, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="pi pi-sitemap" style={{ color: '#2196f3' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ui-sidebar-text)' }}>Temas del Árbol</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5, color: 'var(--ui-sidebar-text)' }}>Estilo de líneas y conectores</div>
                </div>
                <i className="pi pi-chevron-right" style={{ fontSize: '0.7rem', opacity: 0.5 }} />
              </div>
              <div
                onClick={() => setSettingsView('treeIcons')}
                className="theme-item"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSettingsView('treeIcons'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px',
                  cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(76, 175, 80, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="pi pi-folder" style={{ color: '#4caf50' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ui-sidebar-text)' }}>Iconos del Árbol</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5, color: 'var(--ui-sidebar-text)' }}>Carpetas y conexiones</div>
                </div>
                <i className="pi pi-chevron-right" style={{ fontSize: '0.7rem', opacity: 0.5 }} />
              </div>
              <div
                onClick={() => setSettingsView('actionIcons')}
                className="theme-item"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSettingsView('actionIcons'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px',
                  cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(156, 39, 176, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="pi pi-th-large" style={{ color: '#9c27b0' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ui-sidebar-text)' }}>Iconos de Acción</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5, color: 'var(--ui-sidebar-text)' }}>Botones de la barra superior</div>
                </div>
                <i className="pi pi-chevron-right" style={{ fontSize: '0.7rem', opacity: 0.5 }} />
              </div>
              <div
                onClick={() => setSettingsView('typography')}
                className="theme-item"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSettingsView('typography'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px',
                  cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(233, 30, 99, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="pi pi-sliders-h" style={{ color: '#e91e63' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ui-sidebar-text)' }}>Tipografía y Color</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5, color: 'var(--ui-sidebar-text)' }}>Fuente, color y tamaño del texto</div>
                </div>
                <i className="pi pi-chevron-right" style={{ fontSize: '0.7rem', opacity: 0.5 }} />
              </div>
            </div>
          )}

          {settingsView === 'tree' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Button icon="pi pi-arrow-left" className="p-button-text p-button-sm" style={{ padding: '4px', width: '24px', height: '24px' }} onClick={() => setSettingsView('choice')} />
                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--ui-sidebar-text)', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Temas del Árbol</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin' }}>
                {treeThemeOptions.map((opt) => {
                  const theme = treeThemes[opt.value] || {};
                  const isActive = treeTheme === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setTreeTheme?.(opt.value)}
                      className="theme-item"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') setTreeTheme?.(opt.value); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '8px',
                        cursor: 'pointer', background: isActive ? 'rgba(var(--primary-rgb, 33, 150, 243), 0.15)' : 'transparent',
                        border: '1px solid', borderColor: isActive ? 'rgba(var(--primary-rgb, 33, 150, 243), 0.3)' : 'transparent',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ width: '30px', height: '30px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', fontSize: '1.1rem', flexShrink: 0 }}>
                        {opt.value === 'default' && <i className="pi pi-folder" style={{ color: '#64b5f6' }} />}
                        {opt.value === 'minimal' && <i className="pi pi-minus" style={{ color: '#90a4ae' }} />}
                        {opt.value === 'connected' && <i className="pi pi-share-alt" style={{ color: '#81c784' }} />}
                        {opt.value === 'compact' && <i className="pi pi-align-justify" style={{ color: '#ce93d8' }} />}
                        {opt.value === 'neon' && <i className="pi pi-bolt" style={{ color: '#ff4081' }} />}
                        {opt.value === 'cyber' && <i className="pi pi-code" style={{ color: '#00e5ff' }} />}
                        {opt.value === 'modern' && <i className="pi pi-objects-column" style={{ color: '#ffb74d' }} />}
                        {opt.value === 'dotted' && <i className="pi pi-ellipsis-v" style={{ color: '#fff176' }} />}
                        {opt.value === 'matrix' && <i className="pi pi-microsoft" style={{ color: '#4caf50' }} />}
                        {opt.value === 'cursor' && <i className="pi pi-folder" style={{ color: '#2196f3' }} />}
                        {opt.value === 'cursorCompact' && <i className="pi pi-folder" style={{ color: '#64b5f6' }} />}
                        {opt.value.includes('Compact') && opt.value !== 'cursorCompact' && <i className="pi pi-compress" style={{ color: '#90caf9' }} />}
                        {!['default', 'minimal', 'connected', 'compact', 'neon', 'cyber', 'modern', 'dotted', 'matrix', 'cursor'].includes(opt.value) && !opt.value.includes('Compact') && <i className="pi pi-folder" style={{ color: 'var(--primary-color)' }} />}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, lineHeight: '1.2' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: isActive ? '600' : '500', color: isActive ? 'var(--primary-color)' : 'var(--ui-sidebar-text)' }}>{opt.label}</div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ui-sidebar-text)' }}>{theme.description || ''}</div>
                      </div>
                      {isActive && <i className="pi pi-check" style={{ color: 'var(--primary-color)', fontSize: '0.75rem' }} />}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {settingsView === 'treeIcons' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Button icon="pi pi-arrow-left" className="p-button-text p-button-sm" style={{ padding: '4px', width: '24px', height: '24px' }} onClick={() => setSettingsView('choice')} />
                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--ui-sidebar-text)', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Iconos del Árbol</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin' }}>
                {Object.entries(iconThemes).map(([id, theme]) => {
                  const isActive = (iconTheme || 'nord').toLowerCase() === id.toLowerCase();
                  const previewIcon = theme.icons?.folder;
                  return (
                    <div
                      key={id}
                      onClick={() => setIconTheme?.(id)}
                      className="theme-item"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') setIconTheme?.(id); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px',
                        cursor: 'pointer', background: isActive ? 'rgba(var(--primary-rgb, 33, 150, 243), 0.15)' : 'transparent',
                        border: '1px solid', borderColor: isActive ? 'rgba(var(--primary-rgb, 33, 150, 243), 0.3)' : 'transparent',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ width: '30px', height: '30px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
                        <div style={{ transform: 'scale(0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {previewIcon || <i className="pi pi-folder" style={{ color: 'var(--primary-color)' }} />}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, lineHeight: '1.2' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: isActive ? '600' : '500', color: isActive ? 'var(--primary-color)' : 'var(--ui-sidebar-text)' }}>{theme.name}</div>
                        {theme.description && (
                          <div style={{ fontSize: '0.65rem', opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ui-sidebar-text)' }}>{theme.description}</div>
                        )}
                      </div>
                      {isActive && <i className="pi pi-check" style={{ color: 'var(--primary-color)', fontSize: '0.75rem' }} />}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {settingsView === 'actionIcons' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Button icon="pi pi-arrow-left" className="p-button-text p-button-sm" style={{ padding: '4px', width: '24px', height: '24px' }} onClick={() => setSettingsView('choice')} />
                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--ui-sidebar-text)', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Iconos de Acción</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin' }}>
                {Object.entries(sessionActionIconThemes).map(([id, theme]) => {
                  const isActive = sessionActionIconTheme === id;
                  return (
                    <div
                      key={id}
                      onClick={() => setSessionActionIconTheme?.(id)}
                      className="theme-item"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSessionActionIconTheme?.(id); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px',
                        cursor: 'pointer', background: isActive ? 'rgba(var(--primary-rgb, 33, 150, 243), 0.15)' : 'transparent',
                        border: '1px solid', borderColor: isActive ? 'rgba(var(--primary-rgb, 33, 150, 243), 0.3)' : 'transparent',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ width: '30px', height: '30px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
                        <div style={{ transform: 'scale(0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {theme.icons.newConnection}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, lineHeight: '1.2' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: isActive ? '600' : '500', color: isActive ? 'var(--primary-color)' : 'var(--ui-sidebar-text)' }}>{theme.name}</div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ui-sidebar-text)' }}>{theme.description || ''}</div>
                      </div>
                      {isActive && <i className="pi pi-check" style={{ color: 'var(--primary-color)', fontSize: '0.75rem' }} />}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {settingsView === 'typography' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Button 
                  icon="pi pi-arrow-left" 
                  className="p-button-text p-button-sm" 
                  style={{ padding: '4px', width: '24px', height: '24px' }} 
                  onClick={() => setSettingsView('choice')} 
                />
                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--ui-sidebar-text)', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Tipografía y Color</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px', paddingBottom: '4px', scrollbarWidth: 'thin' }}>
                
                {/* Selector de Fuente */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--ui-sidebar-text)', opacity: 0.7 }}>Fuente</span>
                  <Dropdown
                    value={explorerFont || 'Segoe UI'}
                    options={explorerFonts.map(f => ({ label: f, value: f }))}
                    onChange={(e) => setExplorerFont?.(e.value)}
                    placeholder="Seleccionar fuente"
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      height: '34px',
                      fontSize: '0.8rem'
                    }}
                    panelStyle={{
                      background: 'var(--ui-dialog-bg, #1a1a1e)',
                      border: '1px solid var(--ui-tab-border, rgba(255,255,255,0.1))',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                      borderRadius: '8px'
                    }}
                    itemTemplate={(option) => (
                      <span style={{ fontFamily: option.value, fontSize: '0.8rem', color: 'var(--ui-sidebar-text)' }}>
                        {option.label}
                      </span>
                    )}
                  />
                </div>

                {/* Selector de Tamaño */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--ui-sidebar-text)', opacity: 0.7 }}>Tamaño de Iconos / Carpetas</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{iconSize || 20} px</span>
                  </div>
                  <div style={{ padding: '8px 4px 4px 4px' }}>
                    <Slider
                      value={iconSize || 20}
                      onChange={(e) => setIconSize?.(e.value)}
                      min={12}
                      max={32}
                      step={1}
                      style={{ height: '4px' }}
                    />
                  </div>
                </div>

                {/* Selector de Color */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--ui-sidebar-text)', opacity: 0.7 }}>Color del Texto</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: explorerFontColor || '#a9b1d6',
                      border: '2px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      flexShrink: 0
                    }} title="Seleccionar color">
                      <input 
                        type="color" 
                        value={explorerFontColor || '#a9b1d6'} 
                        onChange={(e) => setExplorerFontColor?.(e.target.value)}
                        style={{
                          position: 'absolute',
                          top: '-5px',
                          left: '-5px',
                          width: '34px',
                          height: '34px',
                          opacity: 0,
                          cursor: 'pointer'
                        }} 
                      />
                    </div>
                    <input 
                      type="text"
                      value={explorerFontColor || ''}
                      placeholder="Color por defecto"
                      onChange={(e) => setExplorerFontColor?.(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        height: '30px'
                      }}
                    />
                    {explorerFontColor && (
                      <Button 
                        icon="pi pi-times" 
                        className="p-button-text p-button-sm" 
                        style={{ padding: '4px', width: '24px', height: '24px', color: '#ff5555', flexShrink: 0 }} 
                        onClick={() => setExplorerFontColor?.('')} 
                        title="Restablecer color por defecto"
                      />
                    )}
                  </div>
                </div>

                {/* Restablecer por defecto */}
                <button
                  type="button"
                  onClick={() => {
                    setExplorerFont?.('Segoe UI');
                    setIconSize?.(20);
                    setExplorerFontColor?.('');
                  }}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--ui-sidebar-text)',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <i className="pi pi-refresh" style={{ fontSize: '0.75rem' }} />
                  Restablecer por defecto
                </button>
              </div>
            </>
          )}
        </div>
      </OverlayPanel>
    </>
  );
};

export default SidebarAppearanceMenu;
