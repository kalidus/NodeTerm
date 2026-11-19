import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  NOTEBOOK_QUICK_KEY,
  findQuickNotesGroup,
  listNotebookMenu,
  listNotebookSections,
  listSectionPages,
  notebookSpineColor,
  resolveNotebookNav
} from './notesBrowse';
import '../../styles/components/notes-layouts.css';

function labelMatches(label, query) {
  return String(label || '').toLowerCase().includes(query);
}

const NOTEBOOK_SPLIT_KEY = 'documents_notebook_split';
const MIN_SECTION_WIDTH = 96;
const MIN_PAGE_WIDTH = 80;

function readSplitWidth() {
  try {
    const width = Number(localStorage.getItem(NOTEBOOK_SPLIT_KEY));
    return Number.isFinite(width) && width >= MIN_SECTION_WIDTH ? width : null;
  } catch {
    return null;
  }
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
  onAddNotebook,
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
  const menu = useMemo(() => listNotebookMenu(nodes), [nodes]);
  const hasMenu = menu.some((group) => group.label || group.notebooks.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const switcherRef = useRef(null);
  const columnsRef = useRef(null);
  const sectionWidthRef = useRef(null);
  const [sectionWidth, setSectionWidth] = useState(readSplitWidth);
  const [splitDrag, setSplitDrag] = useState(false);
  sectionWidthRef.current = sectionWidth;
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

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointer = (event) => {
      if (switcherRef.current && switcherRef.current.contains(event.target)) return;
      setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const chooseNotebook = (key) => {
    onSelectNotebook?.(key);
    setMenuOpen(false);
  };

  const addNotebook = (vaultKey) => {
    setMenuOpen(false);
    onAddNotebook?.(vaultKey);
  };

  const onSplitPointerDown = (event) => {
    const columns = columnsRef.current;
    const handle = event.currentTarget;
    if (!columns) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    setSplitDrag(true);

    const applyWidth = (clientX) => {
      const rect = columns.getBoundingClientRect();
      const max = Math.max(MIN_SECTION_WIDTH, rect.width - MIN_PAGE_WIDTH - 6);
      const next = Math.min(Math.max(Math.round(clientX - rect.left), MIN_SECTION_WIDTH), max);
      sectionWidthRef.current = next;
      setSectionWidth(next);
    };

    const onMove = (ev) => applyWidth(ev.clientX);
    const onUp = (ev) => {
      if (handle.hasPointerCapture?.(ev.pointerId)) handle.releasePointerCapture(ev.pointerId);
      setSplitDrag(false);
      const width = sectionWidthRef.current;
      if (width != null) {
        try { localStorage.setItem(NOTEBOOK_SPLIT_KEY, String(width)); } catch { /* ignore */ }
      }
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
    };

    applyWidth(event.clientX);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  };

  return (
    <div className="notebook-nav" style={fontStyle}>
      {hasMenu ? (
        <div className="notebook-nav-switcher" ref={switcherRef}>
          <button
            type="button"
            className={`notebook-nav-trigger${menuOpen ? ' is-open' : ''}`}
            aria-label="Cuaderno"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            style={notebook ? { '--notebook-spine': notebookSpineColor(notebook) } : undefined}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {notebook && <span className="notebook-nav-spine notebook-nav-spine--trigger" aria-hidden="true" />}
            <i className="pi pi-book notebook-nav-trigger-icon" aria-hidden="true" />
            <span className="notebook-nav-trigger-label">{notebook?.label || 'Sin cuadernos'}</span>
            <i className="pi pi-chevron-down notebook-nav-trigger-chevron" aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="notebook-nav-menu" role="listbox" aria-label="Cuadernos">
              {menu.map((group) => (
                <div key={group.key || 'flat'} className="notebook-nav-menu-group">
                  {group.label && (
                    <div className={`notebook-nav-menu-vault${group.locked ? ' is-locked' : ''}`}>
                      {group.locked && <i className="pi pi-lock" aria-hidden="true" />}
                      <span>{group.label}</span>
                    </div>
                  )}
                  {group.notebooks.map((item) => {
                    const selected = item.key === notebook?.key;
                    const spine = notebookSpineColor(item.node || { key: item.key, label: item.label });
                    return (
                      <button
                        key={item.key}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`notebook-nav-menu-item${selected ? ' is-selected' : ''}`}
                        style={{ '--notebook-spine': spine }}
                        title={item.label}
                        onClick={() => chooseNotebook(item.key)}
                      >
                        <span className="notebook-nav-spine" aria-hidden="true" />
                        <span className="notebook-nav-label">{item.label}</span>
                        {selected && <i className="pi pi-check notebook-nav-menu-check" aria-hidden="true" />}
                      </button>
                    );
                  })}
                  {!group.locked && (
                    <button
                      type="button"
                      className="notebook-nav-menu-add"
                      onClick={() => addNotebook(group.key)}
                    >
                      <i className="pi pi-plus" aria-hidden="true" />
                      Agregar libreta
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="notebook-nav-switcher">
          <button type="button" className="notebook-nav-menu-add" onClick={() => onAddNotebook?.(null)}>
            <i className="pi pi-plus" aria-hidden="true" />
            Agregar libreta
          </button>
        </div>
      )}

      <div className={`notebook-nav-columns${splitDrag ? ' is-dragging' : ''}`} ref={columnsRef}>
        <div
          className="notebook-nav-col notebook-nav-col--sections"
          role="listbox"
          aria-label="Secciones"
          style={sectionWidth != null ? { width: sectionWidth, flex: '0 0 auto', maxWidth: 'none' } : undefined}
        >
          <button type="button" className="notebook-nav-add" onClick={() => onAddSection?.()}>
            + Agregar sección
          </button>
          {showQuick && (
            <div
              role="option"
              tabIndex={0}
              aria-selected={activeSectionKey === NOTEBOOK_QUICK_KEY}
              className={`notebook-nav-row${activeSectionKey === NOTEBOOK_QUICK_KEY ? ' is-selected' : ''}`}
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
              <span className="notebook-nav-mark">
                <span className="notebook-nav-tab" style={{ '--notebook-spine': '#5b7fc7' }} aria-hidden="true" />
              </span>
              <span className="notebook-nav-label">Notas rápidas</span>
            </div>
          )}
          {visibleSections.map((section) => {
            const selected = section.key === activeSectionKey;
            const isCollapsed = Boolean(collapsed[section.key]);
            const spine = notebookSpineColor(section.node || { key: section.key, label: section.label });
            return (
              <div
                key={section.key}
                role="option"
                tabIndex={0}
                aria-selected={selected}
                className={`notebook-nav-row${selected ? ' is-selected' : ''}${section.hasChildren ? ' is-group' : ''}`}
                style={{ paddingLeft: `${8 + section.depth * 14}px` }}
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
                <span className="notebook-nav-mark">
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
                    <span className="notebook-nav-tab" style={{ '--notebook-spine': spine }} aria-hidden="true" />
                  )}
                </span>
                <span className="notebook-nav-label">{section.label}</span>
              </div>
            );
          })}
          {!notebooks.length && !showQuick && (
            <div className="notebook-nav-empty">Crea una carpeta para empezar.</div>
          )}
        </div>
        <div
          className={`notebook-nav-split${splitDrag ? ' is-dragging' : ''}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar secciones"
          onPointerDown={onSplitPointerDown}
        />
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
