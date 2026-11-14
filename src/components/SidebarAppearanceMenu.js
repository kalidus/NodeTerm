import React, { useEffect, useMemo, useRef, useState } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { treeThemes, treeThemeOptions } from '../themes/tree-themes';
import {
  iconThemes,
  iconThemeMeta,
  ensureIconTheme,
  preloadIconThemes,
  onIconThemeLoaded
} from '../themes/icon-themes';
import {
  sessionActionIconThemes,
  sessionActionIconThemeMeta,
  ensureSessionActionIconTheme,
  preloadSessionActionIconThemes,
  onSessionActionIconThemeLoaded
} from '../themes/session-action-icons';
import SidebarLayoutMiniPreview from './sidebar/SidebarLayoutMiniPreview';
import SidebarTreeLivePreview from './sidebar/SidebarTreeLivePreview';
import '../styles/components/tree-themes.css';
import '../styles/components/sidebar-appearance-panel.css';

const TB_ICON = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '16px',
  height: '16px'
};

const TREE_THEME_ICON = {
  default: 'pi pi-folder',
  minimal: 'pi pi-minus',
  connected: 'pi pi-share-alt',
  compact: 'pi pi-align-justify',
  neon: 'pi pi-bolt',
  cyber: 'pi pi-code',
  circuit: 'pi pi-share-alt',
  terminal: 'pi pi-desktop',
  modern: 'pi pi-objects-column',
  dotted: 'pi pi-ellipsis-v',
  matrix: 'pi pi-microsoft',
  cursor: 'pi pi-folder',
  cursorCompact: 'pi pi-folder'
};

function uniqueGroups(meta) {
  const seen = new Set();
  const groups = [];
  meta.forEach((item) => {
    if (!item.group || seen.has(item.group)) return;
    seen.add(item.group);
    groups.push(item.group);
  });
  return groups;
}

function matchesQuery(text, query) {
  if (!query) return true;
  return String(text || '').toLowerCase().includes(query);
}

const SidebarAppearanceMenu = ({
  treeTheme,
  setTreeTheme,
  iconTheme = 'nord',
  setIconTheme,
  sectionLabel,
  hasSectionOverride = false,
  onResetSection,
  sessionActionIconTheme = 'modern',
  setSessionActionIconTheme,
  explorerFontColor,
  setExplorerFontColor,
  layouts = null,
  layout = null,
  onSelectLayout,
  tooltip = 'Apariencia del árbol',
  panelId = 'sidebar_appearance_panel',
  overlayZIndex = 10001,
}) => {
  const panelRef = useRef(null);
  const hasLayouts = Array.isArray(layouts) && layouts.length > 0;
  const [mainTab, setMainTab] = useState(() => (hasLayouts ? 'vista' : 'estilo'));
  const [picker, setPicker] = useState(null); // 'tree' | 'treeIcons' | 'actionIcons' | null
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [iconPackTick, setIconPackTick] = useState(0);
  const [actionPackTick, setActionPackTick] = useState(0);
  const themeIcons = sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons;

  useEffect(() => {
    ensureSessionActionIconTheme(sessionActionIconTheme);
  }, [sessionActionIconTheme]);

  useEffect(() => {
    ensureIconTheme(iconTheme);
  }, [iconTheme]);

  useEffect(() => {
    if (picker !== 'treeIcons') return undefined;
    preloadIconThemes();
    return onIconThemeLoaded(() => setIconPackTick((v) => v + 1));
  }, [picker]);
  void iconPackTick;

  useEffect(() => {
    if (picker !== 'actionIcons') return undefined;
    preloadSessionActionIconThemes();
    return onSessionActionIconThemeLoaded(() => setActionPackTick((v) => v + 1));
  }, [picker]);
  void actionPackTick;

  useEffect(() => {
    if (!hasLayouts && mainTab === 'vista') setMainTab('estilo');
  }, [hasLayouts, mainTab]);

  const openPicker = (id) => {
    setSearch('');
    setGroupFilter('all');
    setPicker(id);
  };

  const closePicker = () => {
    setPicker(null);
    setSearch('');
    setGroupFilter('all');
  };

  const treeThemeLabel = treeThemes[treeTheme]?.name || treeTheme || '—';
  const iconMeta = iconThemeMeta.find((m) => m.id.toLowerCase() === String(iconTheme || '').toLowerCase());
  const iconThemeLabel = iconMeta?.name || iconTheme || '—';
  const actionMeta = sessionActionIconThemeMeta.find((m) => m.id === sessionActionIconTheme);
  const actionThemeLabel = actionMeta?.name || sessionActionIconTheme || '—';
  const folderThumb = iconThemes[iconTheme]?.icons?.folder;
  const actionThumb = sessionActionIconThemes[sessionActionIconTheme]?.icons?.newConnection;

  const iconGroups = useMemo(() => uniqueGroups(iconThemeMeta), []);
  const actionGroups = useMemo(() => uniqueGroups(sessionActionIconThemeMeta), []);

  const filteredTreeThemes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return treeThemeOptions.filter((opt) => {
      const theme = treeThemes[opt.value] || {};
      return matchesQuery(opt.label, q) || matchesQuery(theme.description, q);
    });
  }, [search]);

  const filteredIconThemes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return iconThemeMeta.filter((item) => {
      if (groupFilter !== 'all' && item.group !== groupFilter) return false;
      return matchesQuery(item.name, q) || matchesQuery(item.group, q);
    });
  }, [search, groupFilter]);

  const filteredActionThemes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessionActionIconThemeMeta.filter((item) => {
      if (groupFilter !== 'all' && item.group !== groupFilter) return false;
      return matchesQuery(item.name, q) || matchesQuery(item.description, q) || matchesQuery(item.group, q);
    });
  }, [search, groupFilter]);

  const pickerTitle = picker === 'tree'
    ? 'Tema del árbol'
    : picker === 'treeIcons'
      ? 'Iconos del árbol'
      : picker === 'actionIcons'
        ? 'Iconos de barra'
        : '';

  const pickerGroups = picker === 'treeIcons' ? iconGroups : picker === 'actionIcons' ? actionGroups : [];

  const renderPickerList = () => {
    if (picker === 'tree') {
      return filteredTreeThemes.map((opt) => {
        const theme = treeThemes[opt.value] || {};
        const isActive = treeTheme === opt.value;
        const iconClass = TREE_THEME_ICON[opt.value]
          || (String(opt.value).includes('Compact') ? 'pi pi-compress' : 'pi pi-folder');
        return (
          <button
            key={opt.value}
            type="button"
            className={`sap-picker-row${isActive ? ' is-active' : ''}`}
            title={theme.description || opt.label}
            onClick={() => setTreeTheme?.(opt.value)}
          >
            <span className="sap-picker-thumb">
              <i className={iconClass} />
            </span>
            <span className="sap-picker-name">{opt.label}</span>
            {isActive && <i className="pi pi-check sap-picker-check" aria-hidden="true" />}
          </button>
        );
      });
    }

    if (picker === 'treeIcons') {
      return filteredIconThemes.map(({ id, name }) => {
        const theme = iconThemes[id];
        const isActive = (iconTheme || 'nord').toLowerCase() === id.toLowerCase();
        const previewIcon = theme?.icons?.folder;
        return (
          <button
            key={id}
            type="button"
            className={`sap-picker-row${isActive ? ' is-active' : ''}`}
            title={name}
            onClick={() => {
              ensureIconTheme(id);
              setIconTheme?.(id);
            }}
          >
            <span className="sap-picker-thumb">
              {previewIcon || <i className="pi pi-folder" />}
            </span>
            <span className="sap-picker-name">{name}</span>
            {isActive && <i className="pi pi-check sap-picker-check" aria-hidden="true" />}
          </button>
        );
      });
    }

    if (picker === 'actionIcons') {
      return filteredActionThemes.map(({ id, name, description }) => {
        const theme = sessionActionIconThemes[id];
        const isActive = sessionActionIconTheme === id;
        return (
          <button
            key={id}
            type="button"
            className={`sap-picker-row${isActive ? ' is-active' : ''}`}
            title={description || name}
            onClick={() => {
              ensureSessionActionIconTheme(id);
              setSessionActionIconTheme?.(id);
            }}
          >
            <span className="sap-picker-thumb">
              {theme?.icons?.newConnection || <i className="pi pi-plus-circle" />}
            </span>
            <span className="sap-picker-name">{name}</span>
            {isActive && <i className="pi pi-check sap-picker-check" aria-hidden="true" />}
          </button>
        );
      });
    }

    return null;
  };

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
        id={panelId}
        style={{
          width: '320px',
          zIndex: overlayZIndex,
          marginTop: '5px'
        }}
        className="app-surface app-surface-lg glass-panel tree-theme-overlay-fix sap-overlay"
        appendTo={document.body}
        onHide={() => {
          // Mantener tab Vista/Estilo; solo salir del picker
          closePicker();
        }}
      >
        <div className="sap-panel">
          {picker ? (
            <div className="sap-picker">
              <div className="sap-picker-head">
                <button
                  type="button"
                  className="sap-icon-btn"
                  onClick={closePicker}
                  title="Volver"
                  aria-label="Volver"
                >
                  <i className="pi pi-arrow-left" />
                </button>
                <span className="sap-picker-title">{pickerTitle}</span>
              </div>
              <div className="sap-search-wrap">
                <i className="pi pi-search" aria-hidden="true" />
                <input
                  type="search"
                  className="sap-search"
                  placeholder="Buscar…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    className="sap-icon-btn sap-icon-btn--tiny"
                    onClick={() => setSearch('')}
                    aria-label="Limpiar búsqueda"
                  >
                    <i className="pi pi-times" />
                  </button>
                )}
              </div>
              {pickerGroups.length > 0 && (
                <div className="sap-chips" role="tablist" aria-label="Grupo">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={groupFilter === 'all'}
                    className={`sap-chip${groupFilter === 'all' ? ' is-active' : ''}`}
                    onClick={() => setGroupFilter('all')}
                  >
                    Todos
                  </button>
                  {pickerGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      role="tab"
                      aria-selected={groupFilter === group}
                      className={`sap-chip${groupFilter === group ? ' is-active' : ''}`}
                      onClick={() => setGroupFilter(group)}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              )}
              {picker === 'tree' && (
                <SidebarTreeLivePreview
                  treeTheme={treeTheme}
                  iconTheme={iconTheme}
                  fontColor={explorerFontColor}
                />
              )}
              <div className="sap-picker-list">
                {renderPickerList()}
                {(picker === 'tree' ? filteredTreeThemes
                  : picker === 'treeIcons' ? filteredIconThemes
                    : filteredActionThemes).length === 0 && (
                  <div className="sap-empty">Sin resultados</div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="sap-head">
                <div className="sap-head-left">
                  <i className="pi pi-palette" aria-hidden="true" />
                  <span className="sap-title">{sectionLabel || 'Sidebar'}</span>
                </div>
                {hasSectionOverride && onResetSection && (
                  <button
                    type="button"
                    className="sap-reset"
                    onClick={onResetSection}
                    title="Usar tema general"
                  >
                    <i className="pi pi-refresh" aria-hidden="true" />
                    General
                  </button>
                )}
              </div>

              {hasLayouts && (
                <div className="sap-tabs" role="tablist" aria-label="Sección">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mainTab === 'vista'}
                    className={`sap-tab${mainTab === 'vista' ? ' is-active' : ''}`}
                    onClick={() => setMainTab('vista')}
                  >
                    Vista
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mainTab === 'estilo'}
                    className={`sap-tab${mainTab === 'estilo' ? ' is-active' : ''}`}
                    onClick={() => setMainTab('estilo')}
                  >
                    Estilo
                  </button>
                </div>
              )}

              {(!hasLayouts || mainTab === 'vista') && hasLayouts && (
                <div className="sap-vista" role="radiogroup" aria-label="Vista">
                  <div className="sap-layout-grid">
                    {layouts.map((item) => {
                      const active = layout === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          className={`sap-layout-cell${active ? ' is-active' : ''}`}
                          title={item.description || item.name}
                          onClick={() => onSelectLayout?.(item.id)}
                        >
                          <SidebarLayoutMiniPreview variant={item.preview || item.id} />
                          <span className="sap-layout-name">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(!hasLayouts || mainTab === 'estilo') && (
                <div className="sap-estilo">
                  <SidebarTreeLivePreview
                    treeTheme={treeTheme}
                    iconTheme={iconTheme}
                    fontColor={explorerFontColor}
                  />

                  <div className="sap-value-group">
                    <button type="button" className="sap-value-row" onClick={() => openPicker('tree')}>
                      <span className="sap-value-label">Tema del árbol</span>
                      <span className="sap-value-current">{treeThemeLabel}</span>
                      <i className="pi pi-chevron-right sap-value-chevron" aria-hidden="true" />
                    </button>
                    <button type="button" className="sap-value-row" onClick={() => openPicker('treeIcons')}>
                      <span className="sap-value-label">Iconos del árbol</span>
                      <span className="sap-value-current">
                        <span className="sap-value-thumb">{folderThumb || <i className="pi pi-folder" />}</span>
                        {iconThemeLabel}
                      </span>
                      <i className="pi pi-chevron-right sap-value-chevron" aria-hidden="true" />
                    </button>
                    <button type="button" className="sap-value-row" onClick={() => openPicker('actionIcons')}>
                      <span className="sap-value-label">Barra (global)</span>
                      <span className="sap-value-current">
                        <span className="sap-value-thumb">{actionThumb || <i className="pi pi-plus-circle" />}</span>
                        {actionThemeLabel}
                      </span>
                      <i className="pi pi-chevron-right sap-value-chevron" aria-hidden="true" />
                    </button>
                    <div className="sap-value-row sap-value-row--static">
                      <span className="sap-value-label">Color</span>
                      <span className="sap-color-controls">
                        <label
                          className="sap-swatch"
                          title="Color del texto"
                          style={{ background: explorerFontColor || '#a9b1d6' }}
                        >
                          <input
                            type="color"
                            value={explorerFontColor || '#a9b1d6'}
                            onChange={(e) => setExplorerFontColor?.(e.target.value)}
                          />
                        </label>
                        <input
                          type="text"
                          className="sap-hex"
                          value={explorerFontColor || ''}
                          placeholder="Auto"
                          onChange={(e) => setExplorerFontColor?.(e.target.value)}
                        />
                        {explorerFontColor && (
                          <button
                            type="button"
                            className="sap-icon-btn sap-icon-btn--tiny"
                            onClick={() => setExplorerFontColor?.('')}
                            title="Restablecer color"
                            aria-label="Restablecer color"
                          >
                            <i className="pi pi-times" />
                          </button>
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="sap-link-btn"
                    onClick={(event) => {
                      window.dispatchEvent(new CustomEvent('open-appearance-quick-panel', {
                        detail: { anchor: event.currentTarget, section: 'ui', chip: 'typography' }
                      }));
                    }}
                  >
                    <i className="pi pi-pencil" aria-hidden="true" />
                    Tipografía de la interfaz
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </OverlayPanel>
    </>
  );
};

export default SidebarAppearanceMenu;
