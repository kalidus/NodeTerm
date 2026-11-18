import React, { useMemo } from 'react';
import {
  NOTEBOOK_QUICK_KEY,
  findQuickNotesGroup,
  listNotebookSections,
  listSectionPages,
  resolveNotebookNav
} from './notesBrowse';
import '../../styles/components/notes-layouts.css';

function labelMatches(label, query) {
  return String(label || '').toLowerCase().includes(query);
}

function NotebookNavigator({
  nodes = [],
  notebookKey = null,
  sectionKey = null,
  collapsed = {},
  searchTerm = '',
  selectedKey = null,
  explorerFont,
  explorerFontSize = 14,
  onSelectNotebook,
  onSelectSection,
  onToggleCollapsed,
  onAddSection,
  onAddPage,
  onActivate,
  onContextMenu
}) {
  const query = String(searchTerm || '').trim().toLowerCase();
  const searching = query.length > 0;
  const resolved = useMemo(
    () => resolveNotebookNav(nodes, { notebookKey, sectionKey }),
    [nodes, notebookKey, sectionKey]
  );
  const { notebooks, notebook } = resolved;
  const activeSectionKey = resolved.sectionKey;
  const sections = useMemo(
    () => (notebook ? listNotebookSections(notebook, nodes) : []),
    [notebook, nodes]
  );
  const quickGroup = useMemo(() => findQuickNotesGroup(nodes), [nodes]);

  const visibleSectionKeys = useMemo(() => {
    if (!searching) return null;
    const keys = new Set();
    sections.forEach((section) => {
      const pages = listSectionPages(nodes, notebook, section.key);
      const hit = labelMatches(section.label, query)
        || pages.some((page) => labelMatches(page.label, query));
      if (!hit) return;
      keys.add(section.key);
      section.ancestorKeys.forEach((key) => keys.add(key));
    });
    return keys;
  }, [searching, sections, nodes, notebook, query]);

  const visibleSections = sections.filter((section) => {
    if (searching) return visibleSectionKeys?.has(section.key);
    return !section.ancestorKeys.some((key) => collapsed[key]);
  });

  const quickPages = useMemo(
    () => listSectionPages(nodes, notebook, NOTEBOOK_QUICK_KEY),
    [nodes, notebook]
  );
  const showQuick = !searching
    || labelMatches('Notas rápidas', query)
    || quickPages.some((page) => labelMatches(page.label, query));

  const pages = useMemo(
    () => listSectionPages(nodes, notebook, activeSectionKey),
    [nodes, notebook, activeSectionKey]
  );
  const visiblePages = searching
    ? pages.filter((page) => labelMatches(page.label, query))
    : pages;

  const fontStyle = {
    fontFamily: explorerFont || undefined,
    fontSize: `${explorerFontSize}px`
  };

  const openContext = (event, node) => {
    if (!node || !onContextMenu) return;
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, node);
  };

  const canAddPage = Boolean(activeSectionKey);

  return (
    <div className="notebook-nav" style={fontStyle}>
      {notebooks.length > 0 ? (
        <label className="notebook-nav-switcher">
          <span className="notebook-nav-switcher-label">Cuaderno</span>
          <select
            className="notebook-nav-select"
            value={notebook?.key || ''}
            aria-label="Cuaderno"
            onChange={(event) => onSelectNotebook?.(event.target.value)}
          >
            {notebooks.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </select>
        </label>
      ) : (
        <div className="notebook-nav-switcher notebook-nav-switcher--empty">Sin cuadernos</div>
      )}

      <div className="notebook-nav-columns">
        <div className="notebook-nav-col notebook-nav-col--sections" role="listbox" aria-label="Secciones">
          <button type="button" className="notebook-nav-add" onClick={() => onAddSection?.()}>
            + Agregar sección
          </button>
          {showQuick && (
            <div
              role="option"
              tabIndex={0}
              aria-selected={activeSectionKey === NOTEBOOK_QUICK_KEY}
              className={`notebook-nav-row notebook-nav-row--quick${activeSectionKey === NOTEBOOK_QUICK_KEY ? ' is-selected' : ''}`}
              title="Notas rápidas"
              onClick={() => onSelectSection?.(NOTEBOOK_QUICK_KEY)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectSection?.(NOTEBOOK_QUICK_KEY);
                }
              }}
              onContextMenu={(event) => openContext(event, quickGroup)}
            >
              <i className="pi pi-bolt notebook-nav-quick-icon" aria-hidden="true" />
              <span className="notebook-nav-label">Notas rápidas</span>
            </div>
          )}
          {visibleSections.map((section) => {
            const selected = section.key === activeSectionKey;
            const isCollapsed = Boolean(collapsed[section.key]);
            return (
              <div
                key={section.key}
                role="option"
                tabIndex={0}
                aria-selected={selected}
                className={`notebook-nav-row${selected ? ' is-selected' : ''}`}
                style={{ paddingLeft: `${6 + section.depth * 12}px` }}
                title={section.label}
                onClick={() => onSelectSection?.(section.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectSection?.(section.key);
                  }
                }}
                onContextMenu={(event) => openContext(event, section.node)}
              >
                {section.hasChildren ? (
                  <button
                    type="button"
                    className="notebook-nav-chevron"
                    aria-label={isCollapsed ? 'Expandir sección' : 'Plegar sección'}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleCollapsed?.(section.key);
                    }}
                  >
                    <i className={`pi ${isCollapsed ? 'pi-chevron-right' : 'pi-chevron-down'}`} aria-hidden="true" />
                  </button>
                ) : (
                  <span className="notebook-nav-chevron notebook-nav-chevron--spacer" aria-hidden="true" />
                )}
                <span className="notebook-nav-label">{section.label}</span>
              </div>
            );
          })}
          {!notebooks.length && !showQuick && (
            <div className="notebook-nav-empty">Crea una carpeta para empezar.</div>
          )}
        </div>

        <div className="notebook-nav-col notebook-nav-col--pages" role="listbox" aria-label="Páginas">
          <button
            type="button"
            className="notebook-nav-add"
            disabled={!canAddPage}
            onClick={() => onAddPage?.()}
          >
            + Agregar página
          </button>
          {visiblePages.map((page) => {
            const selected = selectedKey != null && page.key === selectedKey;
            return (
              <button
                key={page.key}
                type="button"
                role="option"
                aria-selected={selected}
                className={`notebook-nav-row notebook-nav-row--page${selected ? ' is-selected' : ''}`}
                title={page.label}
                onClick={() => onActivate?.(page, 'reuse')}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  onActivate?.(page, 'new');
                }}
                onContextMenu={(event) => openContext(event, page)}
              >
                <span className="notebook-nav-label">{page.label}</span>
              </button>
            );
          })}
          {visiblePages.length === 0 && (
            <div className="notebook-nav-empty">
              {!activeSectionKey
                ? 'Elige una sección.'
                : searching
                  ? 'Sin resultados.'
                  : 'Esta sección no tiene páginas.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotebookNavigator;
