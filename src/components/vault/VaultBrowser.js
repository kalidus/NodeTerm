import React from 'react';
import { renderPasswordNodeIcon } from './passwordNodeIcon';
import {
  VAULT_SECTIONS,
  collectSearchHits,
  isVaultFolder,
  resolveBrowse,
  vaultSectionId,
  vaultSubtitle,
  vaultTypeLabel
} from './vaultBrowse';
import '../../styles/components/password-vault-layouts.css';

const ICON_SIZE = {
  icons: 36,
  cards: 28,
  list: 18,
  detail: 18,
  sections: 18
};

function VaultItem({
  node,
  layout,
  selected,
  iconTheme,
  onActivate,
  onContextMenu
}) {
  const folder = isVaultFolder(node);
  const showMeta = layout === 'detail' || layout === 'cards' || layout === 'sections';
  const meta = layout === 'cards' ? vaultTypeLabel(node) : vaultSubtitle(node);

  return (
    <button
      type="button"
      className={`vault-item vault-item--${layout}${selected ? ' is-selected' : ''}${folder ? ' is-folder' : ''}`}
      title={node.label}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onActivate(node, 'preview')}
      onDoubleClick={(event) => {
        event.preventDefault();
        onActivate(node, 'permanent');
      }}
      onContextMenu={(event) => onContextMenu(event, node)}
    >
      <span className="vault-item-icon">
        {renderPasswordNodeIcon(node, {
          iconTheme,
          size: ICON_SIZE[layout] || 18,
          expanded: false
        })}
      </span>
      <span className="vault-item-text">
        <span className="vault-item-label">{node.label}</span>
        {showMeta && <span className="vault-item-sub">{meta}</span>}
      </span>
    </button>
  );
}

const VaultBrowser = ({
  nodes = [],
  layout = 'icons',
  browseStack = [],
  searching = false,
  searchTerm = '',
  selectedKey = null,
  iconTheme = 'nord',
  explorerFont,
  explorerFontSize = 14,
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

  const renderItem = (node) => (
    <VaultItem
      key={node.key}
      node={node}
      layout={layout === 'sections' ? 'sections' : layout}
      selected={selectedKey != null && node.key === selectedKey}
      iconTheme={iconTheme}
      onActivate={onActivate}
      onContextMenu={onContextMenu}
    />
  );

  let body;
  if (items.length === 0) {
    const message = searching
      ? 'Sin resultados.'
      : browse.stack.length === 0
        ? 'No hay passwords guardados. Usa el botón + para crear uno.'
        : 'Esta carpeta está vacía.';
    body = <div className="vault-browser-empty">{message}</div>;
  } else if (layout === 'sections') {
    body = (
      <div className="vault-layout-sections">
        {VAULT_SECTIONS.map((section) => {
          const sectionItems = items.filter((node) => vaultSectionId(node) === section.id);
          if (sectionItems.length === 0) return null;
          return (
            <section key={section.id} className="vault-section">
              <h3 className="vault-section-title">{section.title}</h3>
              <div className="vault-section-items">
                {sectionItems.map(renderItem)}
              </div>
            </section>
          );
        })}
      </div>
    );
  } else {
    body = (
      <div className={`vault-layout vault-layout--${layout}`}>
        {items.map(renderItem)}
      </div>
    );
  }

  return (
    <div className="vault-browser" style={fontStyle}>
      {searching ? (
        <div className="vault-browser-search">Resultados de «{searchTerm.trim()}»</div>
      ) : (
        <nav className="vault-browser-crumbs" aria-label="Ruta de la carpeta">
          {browse.crumbs.map((crumb, index) => {
            const last = index === browse.crumbs.length - 1;
            return (
              <React.Fragment key={`${crumb.key ?? 'root'}-${index}`}>
                {index > 0 && <span className="vault-browser-crumb-sep" aria-hidden="true">/</span>}
                <button
                  type="button"
                  className="vault-browser-crumb"
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
      <div className="vault-browser-scroll">
        {body}
      </div>
    </div>
  );
};

export default VaultBrowser;
