import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { FaSearch } from 'react-icons/fa';
import { helpers, isFavorite, toggleFavorite } from '../utils/connectionStore';
import { writeText as clipboardWriteText } from '../utils/clipboard';
import { SEARCH_CATEGORIES, highlightParts } from '../search/appSearchIndex';
import { useAppSearchIndex } from '../search/useAppSearchIndex';

const KIND_META = {
  ssh: { icon: 'pi pi-bolt', label: 'SSH' },
  rdp: { icon: 'pi pi-desktop', label: 'RDP' },
  'rdp-guacamole': { icon: 'pi pi-desktop', label: 'RDP' },
  vnc: { icon: 'pi pi-desktop', label: 'VNC' },
  'vnc-guacamole': { icon: 'pi pi-desktop', label: 'VNC' },
  sftp: { icon: 'pi pi-folder-open', label: 'SFTP' },
  ftp: { icon: 'pi pi-folder-open', label: 'FTP' },
  scp: { icon: 'pi pi-folder-open', label: 'SCP' },
  'ssh-tunnel': { icon: 'pi pi-share-alt', label: 'Túnel' },
  password: { icon: 'pi pi-key', label: 'Contraseña' },
  api_key: { icon: 'pi pi-key', label: 'API' },
  crypto_wallet: { icon: 'pi pi-wallet', label: 'Wallet' },
  secure_note: { icon: 'pi pi-file-edit', label: 'Nota segura' },
  document: { icon: 'pi pi-file', label: 'Nota' },
  'quick-note': { icon: 'pi pi-file-edit', label: 'Nota rápida' },
  'library-file': { icon: 'pi pi-file', label: 'Archivo' }
};

function kindMeta(kind) {
  return KIND_META[kind] || { icon: 'pi pi-link', label: kind || 'Elemento' };
}

function Highlight({ text, query }) {
  const parts = highlightParts(text, query);
  return parts.map((part, index) => (
    part.match
      ? <mark key={index} className="app-search-mark">{part.text}</mark>
      : <span key={index}>{part.text}</span>
  ));
}

function connectionIsFavorite(node, tick) {
  if (!node || tick < 0) return false;
  try {
    const connection = helpers.fromSidebarNode(node);
    return !!(connection && isFavorite(connection));
  } catch {
    return false;
  }
}

function copyableSecret(node) {
  const data = node?.data || {};
  const type = data.type || node?.type;
  if (type === 'api_key') return data.apiKey || '';
  if (type === 'crypto_wallet') return data.seedPhrase || '';
  if (type === 'secure_note') return data.noteContent || '';
  return data.password || '';
}

function placePanel(anchor) {
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(640, Math.max(rect.width, Math.min(520, window.innerWidth - 16)));
  let left = rect.left + (rect.width / 2) - (width / 2);
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  return {
    position: 'fixed',
    top: Math.round(rect.bottom + 6),
    left: Math.round(left),
    width: Math.round(width),
    zIndex: 9999
  };
}

const TitleBarSearch = ({
  sidebarFilter,
  setSidebarFilter,
  allNodes,
  masterKey,
  secureStorage,
  onOpenSSHConnection,
  onOpenRdpConnection,
  onOpenVncConnection,
  openEditSSHDialog,
  openEditRdpDialog,
  sidebarCallbacksRef
}) => {
  const { search, getNode, ready, vaultLocked } = useAppSearchIndex({
    allNodes,
    masterKey,
    secureStorage
  });
  const [localFilter, setLocalFilter] = useState(sidebarFilter || '');
  const [query, setQuery] = useState((sidebarFilter || '').trim());
  const [category, setCategory] = useState('all');
  const [show, setShow] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [favoriteTick, setFavoriteTick] = useState(0);
  const [panelStyle, setPanelStyle] = useState(null);
  const anchorRef = useRef(null);
  const sidebarTimerRef = useRef(null);
  const queryTimerRef = useRef(null);

  useEffect(() => {
    setLocalFilter(sidebarFilter || '');
    setQuery((sidebarFilter || '').trim());
  }, [sidebarFilter]);

  useEffect(() => () => {
    clearTimeout(sidebarTimerRef.current);
    clearTimeout(queryTimerRef.current);
  }, []);

  const result = useMemo(
    () => search(query, category),
    [search, query, category]
  );
  const flat = result.flat;
  const safeIndex = flat.length
    ? Math.min(Math.max(activeIndex, 0), flat.length - 1)
    : -1;

  useEffect(() => {
    if (query.length >= 2) {
      setShow(true);
      setActiveIndex(0);
      if (anchorRef.current) setPanelStyle(placePanel(anchorRef.current));
    } else {
      setShow(false);
      setActiveIndex(-1);
    }
  }, [query, category]);

  useEffect(() => {
    if (!show) return undefined;
    const update = () => {
      if (anchorRef.current) setPanelStyle(placePanel(anchorRef.current));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [show, query, category, flat.length]);

  useEffect(() => {
    if (!show || safeIndex < 0) return;
    document.getElementById(`app-search-option-${safeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [show, safeIndex, flat.length]);

  useEffect(() => {
    if (!show) return undefined;
    const onDown = (event) => {
      if (event.target.closest('.app-search-panel') || event.target.closest('.app-search-anchor')) return;
      setShow(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [show]);

  const handleFilterChange = (value) => {
    setLocalFilter(value);
    clearTimeout(queryTimerRef.current);
    clearTimeout(sidebarTimerRef.current);
    queryTimerRef.current = setTimeout(() => setQuery(value.trim()), 40);
    sidebarTimerRef.current = setTimeout(() => setSidebarFilter(value), 200);
  };

  const closeAndClear = () => {
    clearTimeout(queryTimerRef.current);
    clearTimeout(sidebarTimerRef.current);
    setLocalFilter('');
    setQuery('');
    setShow(false);
    setSidebarFilter('');
  };

  const openHit = (hit) => {
    const node = getNode(hit?.id);
    if (!node || !hit) return;
    const type = node.data?.type || node.type;
    closeAndClear();

    if (hit.category === 'password') {
      window.dispatchEvent(new CustomEvent('open-password-tab', {
        detail: {
          key: node.key,
          label: node.label,
          title: node.label,
          type,
          mode: 'permanent',
          ...node.data,
          id: node.key
        }
      }));
      return;
    }

    if (hit.category === 'note') {
      if (type === 'library-file') {
        window.dispatchEvent(new CustomEvent('open-library-file-tab', {
          detail: { key: node.key, label: node.label, data: node.data }
        }));
        return;
      }
      window.dispatchEvent(new CustomEvent('open-document-tab', {
        detail: { key: node.key, label: node.label, data: node.data }
      }));
      return;
    }

    if (type === 'ssh' && onOpenSSHConnection) {
      onOpenSSHConnection(node, allNodes);
    } else if ((type === 'rdp' || type === 'rdp-guacamole') && onOpenRdpConnection) {
      onOpenRdpConnection(node, allNodes);
    } else if ((type === 'vnc' || type === 'vnc-guacamole') && onOpenVncConnection) {
      onOpenVncConnection(node, allNodes);
    } else if (['sftp', 'ftp', 'scp'].includes(type)) {
      sidebarCallbacksRef?.current?.openFileConnection?.(node, allNodes);
    } else if (type === 'ssh-tunnel') {
      sidebarCallbacksRef?.current?.openSSHTunnel?.(node, allNodes);
    } else if (onOpenSSHConnection) {
      onOpenSSHConnection(node, allNodes);
    }
  };

  const editHit = (hit) => {
    const node = getNode(hit?.id);
    if (!node) return;
    const type = node.data?.type;
    let openEditor = null;
    if (type === 'ssh' && openEditSSHDialog) openEditor = () => openEditSSHDialog(node);
    else if ((type === 'rdp' || type === 'rdp-guacamole') && openEditRdpDialog) openEditor = () => openEditRdpDialog(node);
    else if ((type === 'vnc' || type === 'vnc-guacamole') && sidebarCallbacksRef?.current?.editVNC) {
      openEditor = () => sidebarCallbacksRef.current.editVNC(node);
    } else if (['sftp', 'ftp', 'scp'].includes(type) && sidebarCallbacksRef?.current?.editFileConnection) {
      openEditor = () => sidebarCallbacksRef.current.editFileConnection(node);
    } else if (type === 'ssh-tunnel' && sidebarCallbacksRef?.current?.editSSHTunnel) {
      openEditor = () => sidebarCallbacksRef.current.editSSHTunnel(node);
    }
    if (!openEditor) return;
    closeAndClear();
    openEditor();
  };

  const copySecret = async (node) => {
    const secret = copyableSecret(node);
    if (!secret) return;
    try {
      await clipboardWriteText(secret);
      window.toast?.current?.show?.({
        severity: 'success',
        summary: 'Copiado',
        detail: 'Secreto copiado',
        life: 1500
      });
    } catch (error) {
      console.error('Error copiando secreto:', error);
    }
  };

  const toggleHitFavorite = (node) => {
    try {
      const connection = helpers.fromSidebarNode(node);
      if (connection) {
        toggleFavorite(connection);
        setFavoriteTick((tick) => tick + 1);
      }
    } catch (error) {
      console.error('Error al actualizar favorito:', error);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setShow(false);
      return;
    }
    if (!show || !flat.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => {
        if (prev < 0) return 0;
        return prev < flat.length - 1 ? prev + 1 : prev;
      });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (event.key === 'Enter' && safeIndex >= 0) {
      event.preventDefault();
      openHit(flat[safeIndex]);
    }
  };

  let optionIndex = -1;

  return (
    <div className="app-search-anchor" ref={anchorRef}>
      {!localFilter && (
        <span className="app-search-placeholder">
          <FaSearch />
          <span>NodeTerm</span>
        </span>
      )}
      <input
        value={localFilter}
        onChange={(event) => handleFilterChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query.length >= 2) setShow(true);
        }}
        placeholder=""
        type="text"
        className="app-search-field app-search-input search-input"
        data-animation=""
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-controls="app-search-list"
        aria-activedescendant={safeIndex >= 0 ? `app-search-option-${safeIndex}` : undefined}
      />
      {show && panelStyle && ReactDOM.createPortal(
        <div
          className="search-dropdown app-surface app-search-panel"
          style={panelStyle}
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="app-search-chips" role="tablist">
            {SEARCH_CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={category === item.id}
                className={`app-search-chip${category === item.id ? ' is-active' : ''}`}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="app-search-results" id="app-search-list" role="listbox">
            {!ready && (
              <div className="app-search-empty">Preparando búsqueda…</div>
            )}
            {ready && flat.length === 0 && (
              <div className="app-search-empty">Sin resultados</div>
            )}
            {ready && result.groups.map((group) => (
              <section key={group.category}>
                <div className="app-search-group-label">
                  <span>{group.label}</span>
                  <span>{group.items.length < group.total ? `${group.items.length} de ${group.total}` : group.total}</span>
                </div>
                {group.items.map((hit) => {
                  optionIndex += 1;
                  const index = optionIndex;
                  const node = getNode(hit.id);
                  const meta = kindMeta(hit.kind);
                  const secondary = hit.subtitle || hit.snippet;
                  const secret = node ? copyableSecret(node) : '';
                  const showCopy = !!secret && (hit.category === 'password' || hit.category === 'connection');
                  const favorite = hit.category === 'connection'
                    ? connectionIsFavorite(node, favoriteTick)
                    : false;
                  return (
                    <div
                      key={hit.id}
                      id={`app-search-option-${index}`}
                      role="option"
                      aria-selected={index === safeIndex}
                      className={`app-search-row${index === safeIndex ? ' is-active' : ''}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => openHit(hit)}
                    >
                      <div className="app-search-icon" aria-hidden="true">
                        <i className={meta.icon} />
                      </div>
                      <div className="app-search-body">
                        <div className="app-search-title-row">
                          <span className="app-search-title">
                            <Highlight text={hit.label} query={query} />
                          </span>
                          <span className={`app-search-kind is-${hit.category}`}>{meta.label}</span>
                        </div>
                        {secondary && (
                          <div className="app-search-subtitle">
                            <Highlight text={secondary} query={query} />
                          </div>
                        )}
                        {hit.folder && (
                          <div className="app-search-folder">
                            <Highlight text={hit.folder} query={query} />
                          </div>
                        )}
                      </div>
                      {(showCopy || hit.category === 'connection') && (
                        <div className="app-search-actions">
                          {showCopy && (
                            <button
                              type="button"
                              className="app-search-action"
                              title="Copiar secreto"
                              onClick={(event) => {
                                event.stopPropagation();
                                copySecret(node);
                              }}
                            >
                              <i className="pi pi-key" />
                            </button>
                          )}
                          {hit.category === 'connection' && (
                            <button
                              type="button"
                              className={`app-search-action${favorite ? ' is-favorite' : ''}`}
                              title={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleHitFavorite(node);
                              }}
                            >
                              <i className={`pi ${favorite ? 'pi-star-fill' : 'pi-star'}`} />
                            </button>
                          )}
                          {hit.category === 'connection' && (
                            <button
                              type="button"
                              className="app-search-action"
                              title="Editar conexión"
                              onClick={(event) => {
                                event.stopPropagation();
                                editHit(hit);
                              }}
                            >
                              <i className="pi pi-pencil" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
          <div className="app-search-footer">
            <span>↑↓ navegar · Enter abrir · Esc cerrar</span>
            {vaultLocked && (
              <span>Desbloquea la caja fuerte para buscar contraseñas y notas</span>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TitleBarSearch;
