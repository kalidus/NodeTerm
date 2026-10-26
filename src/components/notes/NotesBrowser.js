import React from 'react';
import { renderDocumentNodeIcon } from './documentNodeIcon';
import {
  TIMELINE_SECTIONS,
  collectDescendantNotes,
  collectSearchHits,
  groupNotesByTag,
  isNotebook,
  isNote,
  isQuickNotesGroup,
  notebookSpineColor,
  noteSnippet,
  notesSubtitle,
  relativeNoteDate,
  resolveBrowse,
  timelineBucket,
  toRoman
} from './notesBrowse';
import '../../styles/components/notes-layouts.css';

const ICON_SIZE = {
  shelf: 28,
  cards: 22,
  index: 16,
  list: 16,
  timeline: 16,
  tags: 16
};

function NotesItem({
  node,
  layout,
  selected,
  iconTheme,
  NotebookIcon,
  indexLabel,
  onActivate,
  onContextMenu
}) {
  const folder = isNotebook(node) || isQuickNotesGroup(node);
  const showPreview = layout === 'cards' && isNote(node);
  const showMeta = layout === 'cards' || layout === 'list' || layout === 'timeline' || layout === 'tags' || layout === 'index';
  const meta = layout === 'cards' && isNote(node)
    ? relativeNoteDate(node.data?.updatedAt || node.data?.createdAt)
    : notesSubtitle(node);
  const spineColor = layout === 'shelf' && isNotebook(node) ? notebookSpineColor(node) : undefined;

  return (
    <button
      type="button"
      className={`notes-item notes-item--${layout}${selected ? ' is-selected' : ''}${folder ? ' is-folder' : ''}${isQuickNotesGroup(node) ? ' is-quick' : ''}`}
      title={node.label}
      aria-current={selected ? 'true' : undefined}
      style={spineColor ? { '--notes-spine': spineColor } : undefined}
      onClick={() => onActivate(node, 'reuse')}
      onDoubleClick={(event) => {
        event.preventDefault();
        onActivate(node, 'new');
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu?.(event, node);
      }}
    >
      {layout === 'index' && (
        <span className="notes-item-index">{indexLabel}</span>
      )}
      <span className="notes-item-icon">
        {renderDocumentNodeIcon(node, {
          iconTheme,
          size: ICON_SIZE[layout] || 16,
          expanded: false,
          NotebookIcon
        })}
      </span>
      <span className="notes-item-text">
        <span className="notes-item-label">{node.label}</span>
        {showPreview && <span className="notes-item-preview">{noteSnippet(node)}</span>}
        {showMeta && !showPreview && <span className="notes-item-sub">{meta}</span>}
        {showPreview && meta && <span className="notes-item-sub">{meta}</span>}
      </span>
    </button>
  );
}

const NotesBrowser = ({
  nodes = [],
  layout = 'shelf',
  browseStack = [],
  searching = false,
  searchTerm = '',
  selectedKey = null,
  iconTheme = 'nord',
  explorerFont,
  explorerFontSize = 14,
  NotebookIcon,
  onCrumb,
  onActivate,
  onContextMenu
}) => {
  const browse = resolveBrowse(nodes, browseStack);
  const items = searching ? collectSearchHits(nodes, searchTerm) : browse.children;
  const fontStyle = {
    fontFamily: explorerFont || undefined,
    fontSize: `${explorerFontSize}px`
  };

  const renderItem = (node, indexLabel) => (
    <NotesItem
      key={node.key}
      node={node}
      layout={layout}
      selected={selectedKey != null && node.key === selectedKey}
      iconTheme={iconTheme}
      NotebookIcon={NotebookIcon}
      indexLabel={indexLabel}
      onActivate={onActivate}
      onContextMenu={onContextMenu}
    />
  );

  let body;
  if (items.length === 0) {
    const message = searching
      ? 'Sin resultados.'
      : browse.stack.length === 0
        ? 'No hay notas. Usa el botón + para crear una.'
        : 'Esta libreta está vacía.';
    body = <div className="notes-browser-empty">{message}</div>;
  } else if (layout === 'timeline') {
    const folders = items.filter((node) => isNotebook(node) || isQuickNotesGroup(node));
    const notes = collectDescendantNotes(items.filter((node) => !isQuickNotesGroup(node)));
    body = (
      <div className="notes-layout-sections">
        {folders.length > 0 && (
          <section className="notes-section">
            <h3 className="notes-section-title">Libretas</h3>
            <div className="notes-section-items">
              {folders.map((node) => renderItem(node))}
            </div>
          </section>
        )}
        {TIMELINE_SECTIONS.map((section) => {
          const sectionItems = notes.filter((node) => timelineBucket(node.data?.updatedAt || node.data?.createdAt) === section.id);
          if (sectionItems.length === 0) return null;
          return (
            <section key={section.id} className="notes-section">
              <h3 className="notes-section-title">{section.title}</h3>
              <div className="notes-section-items">
                {sectionItems.map((node) => renderItem(node))}
              </div>
            </section>
          );
        })}
      </div>
    );
  } else if (layout === 'tags') {
    const folders = items.filter((node) => isNotebook(node) || isQuickNotesGroup(node));
    const notes = items.filter(isNote);
    const tagSections = groupNotesByTag(notes);
    body = (
      <div className="notes-layout-sections">
        {folders.length > 0 && (
          <section className="notes-section">
            <h3 className="notes-section-title">Libretas</h3>
            <div className="notes-section-items">
              {folders.map((node) => renderItem(node))}
            </div>
          </section>
        )}
        {tagSections.map((section) => (
          <section key={section.title} className="notes-section">
            <h3 className="notes-section-title">{section.title}</h3>
            <div className="notes-section-items">
              {section.items.map((node) => renderItem(node))}
            </div>
          </section>
        ))}
      </div>
    );
  } else if (layout === 'index') {
    let part = 0;
    let chapter = 0;
    body = (
      <div className="notes-layout notes-layout--index">
        {items.map((node) => {
          const label = isNotebook(node) || isQuickNotesGroup(node)
            ? `${toRoman((part += 1))}.`
            : `${(chapter += 1)}.`;
          return renderItem(node, label);
        })}
      </div>
    );
  } else {
    body = (
      <div className={`notes-layout notes-layout--${layout}`}>
        {items.map((node) => renderItem(node))}
      </div>
    );
  }

  return (
    <div className="notes-browser" style={fontStyle}>
      {searching ? (
        <div className="notes-browser-search">Resultados de «{searchTerm.trim()}»</div>
      ) : (
        <nav className="notes-browser-crumbs" aria-label="Ruta de la libreta">
          {browse.crumbs.map((crumb, index) => {
            const last = index === browse.crumbs.length - 1;
            return (
              <React.Fragment key={`${crumb.key ?? 'root'}-${index}`}>
                {index > 0 && <span className="notes-browser-crumb-sep" aria-hidden="true">/</span>}
                <button
                  type="button"
                  className="notes-browser-crumb"
                  disabled={last}
                  onClick={() => {
                    if (!last) onCrumb?.(index);
                  }}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      )}
      <div className="notes-browser-scroll">
        {body}
      </div>
    </div>
  );
};

export default NotesBrowser;
