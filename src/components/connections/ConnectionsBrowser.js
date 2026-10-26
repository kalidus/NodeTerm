import React from 'react';
import { renderConnectionNodeIcon } from './connectionNodeIcon';
import {
  PROTOCOL_SECTIONS,
  STATUS_SECTIONS,
  collectSearchHits,
  connectionHost,
  connectionSubtitle,
  connectionUser,
  isConnectionFolder,
  protocolLabel,
  protocolSectionId,
  resolveBrowse,
  statusSectionId
} from './connectionsBrowse';
import '../../styles/components/connections-layouts.css';

const ICON_SIZE = {
  hosts: 36,
  cards: 26,
  list: 18,
  protocols: 18,
  status: 18
};

function ConnectionItem({
  node,
  layout,
  selected,
  iconTheme,
  favoritesView,
  hasOpenSession,
  onActivate,
  onContextMenu
}) {
  const folder = isConnectionFolder(node);
  const showHost = layout === 'list' || layout === 'protocols' || layout === 'status';
  const showCardMeta = layout === 'cards';
  const host = connectionHost(node);
  const user = connectionUser(node);

  return (
    <button
      type="button"
      className={`conn-item conn-item--${layout}${selected ? ' is-selected' : ''}${folder ? ' is-folder' : ''}${hasOpenSession ? ' is-open' : ''}`}
      title={node.label}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onActivate(node, 'preview')}
      onDoubleClick={(event) => {
        event.preventDefault();
        onActivate(node, 'connect');
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu?.(event, node);
      }}
    >
      <span className="conn-item-icon">
        {renderConnectionNodeIcon(node, {
          iconTheme,
          size: ICON_SIZE[layout] || 18,
          expanded: false,
          favoritesView
        })}
        {hasOpenSession && <span className="conn-item-live" aria-hidden="true" />}
      </span>
      <span className="conn-item-text">
        <span className="conn-item-label">{node.label}</span>
        {showHost && !folder && <span className="conn-item-sub">{connectionSubtitle(node)}</span>}
        {folder && (layout === 'list' || layout === 'hosts' || layout === 'cards') && (
          <span className="conn-item-sub">{connectionSubtitle(node)}</span>
        )}
        {showCardMeta && !folder && (
          <>
            <span className="conn-item-sub">{protocolLabel(node)}{host ? ` · ${host}` : ''}</span>
            {user ? <span className="conn-item-sub">{user}</span> : null}
          </>
        )}
      </span>
    </button>
  );
}

const ConnectionsBrowser = ({
  nodes = [],
  layout = 'hosts',
  browseStack = [],
  searching = false,
  searchTerm = '',
  selectedKey = null,
  iconTheme = 'nord',
  explorerFont,
  explorerFontSize = 14,
  favoritesView = false,
  rootLabel = 'Conexiones',
  openSessionNodeKeys,
  sessionKeyFor,
  isFavoriteFn,
  onCrumb,
  onActivate,
  onContextMenu
}) => {
  const browse = resolveBrowse(nodes, browseStack, rootLabel);
  const items = searching ? collectSearchHits(nodes, searchTerm) : browse.children;
  const fontStyle = {
    fontFamily: explorerFont || undefined,
    fontSize: `${explorerFontSize}px`
  };

  const renderItem = (node) => {
    const resolvedKey = sessionKeyFor?.(node) || node.key;
    return (
      <ConnectionItem
        key={node.key}
        node={node}
        layout={layout === 'protocols' || layout === 'status' ? 'list' : layout}
        selected={selectedKey != null && (node.key === selectedKey || resolvedKey === selectedKey)}
        iconTheme={iconTheme}
        favoritesView={favoritesView}
        hasOpenSession={Boolean(!isConnectionFolder(node) && openSessionNodeKeys?.has?.(resolvedKey))}
        onActivate={onActivate}
        onContextMenu={onContextMenu}
      />
    );
  };

  let body;
  if (items.length === 0) {
    const message = searching
      ? 'Sin resultados.'
      : browse.stack.length === 0
        ? 'No hay elementos. Usa el botón + para crear una carpeta o conexión.'
        : 'Esta carpeta está vacía.';
    body = <div className="conn-browser-empty">{message}</div>;
  } else if (layout === 'protocols') {
    body = (
      <div className="conn-layout-sections">
        {PROTOCOL_SECTIONS.map((section) => {
          const sectionItems = items.filter((node) => protocolSectionId(node) === section.id);
          if (sectionItems.length === 0) return null;
          return (
            <section key={section.id} className="conn-section">
              <h3 className="conn-section-title">{section.title}</h3>
              <div className="conn-section-items">
                {sectionItems.map(renderItem)}
              </div>
            </section>
          );
        })}
      </div>
    );
  } else if (layout === 'status') {
    body = (
      <div className="conn-layout-sections">
        {STATUS_SECTIONS.map((section) => {
          const sectionItems = items.filter((node) => statusSectionId(node, {
            openSessionNodeKeys,
            isFavoriteFn,
            sessionKey: sessionKeyFor?.(node) || node.key
          }) === section.id);
          if (sectionItems.length === 0) return null;
          return (
            <section key={section.id} className="conn-section">
              <h3 className="conn-section-title">{section.title}</h3>
              <div className="conn-section-items">
                {sectionItems.map(renderItem)}
              </div>
            </section>
          );
        })}
      </div>
    );
  } else {
    body = (
      <div className={`conn-layout conn-layout--${layout}`}>
        {items.map(renderItem)}
      </div>
    );
  }

  return (
    <div className="conn-browser" style={fontStyle}>
      {searching ? (
        <div className="conn-browser-search">Resultados de «{searchTerm.trim()}»</div>
      ) : (
        <nav className="conn-browser-crumbs" aria-label="Ruta de la carpeta">
          {browse.crumbs.map((crumb, index) => {
            const last = index === browse.crumbs.length - 1;
            return (
              <React.Fragment key={`${crumb.key ?? 'root'}-${index}`}>
                {index > 0 && <span className="conn-browser-crumb-sep" aria-hidden="true">/</span>}
                <button
                  type="button"
                  className="conn-browser-crumb"
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
      <div className="conn-browser-scroll">
        {body}
      </div>
    </div>
  );
};

export default ConnectionsBrowser;
