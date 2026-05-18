import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { InputText } from 'primereact/inputtext';
import { FaSearch } from 'react-icons/fa';
import { iconThemes } from '../themes/icon-themes';
import { toggleFavorite, helpers } from '../utils/connectionStore';

const VARIANT_STYLES = {
  titlebar: {
    container: {
      minWidth: 350,
      maxWidth: 600,
      width: '35vw',
    },
    input: {
      minWidth: 350,
      maxWidth: 600,
      width: '100%',
      paddingLeft: 12,
      height: 28,
      borderRadius: 6,
      border: '1px solid #bbb',
      fontSize: 13,
      background: '#f5f5f5',
      color: '#333',
      fontWeight: 500,
      textAlign: 'center',
    },
    emptyLabelColor: 'var(--ui-titlebar-text, #fff)',
  },
  'main-frame': {
    container: {
      minWidth: 260,
      maxWidth: 520,
      width: 'min(42vw, 520px)',
    },
    input: {
      width: '100%',
      paddingLeft: 12,
      height: 26,
      borderRadius: 6,
      border: '1px solid rgba(255,255,255,0.12)',
      fontSize: 12,
      background: 'rgba(0,0,0,0.22)',
      color: 'var(--ui-titlebar-text, #fff)',
      fontWeight: 500,
      textAlign: 'center',
    },
    emptyLabelColor: 'var(--ui-sidebar-text, #a9b1d6)',
  },
  palette: {
    container: {
      minWidth: '100%',
      maxWidth: '100%',
      width: '100%',
    },
    input: {
      width: '100%',
      paddingLeft: 16,
      paddingRight: 16,
      height: 44,
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.14)',
      fontSize: 15,
      background: 'rgba(0,0,0,0.28)',
      color: 'var(--ui-titlebar-text, #fff)',
      fontWeight: 500,
      textAlign: 'left',
    },
    emptyLabelColor: 'var(--ui-sidebar-text, #a9b1d6)',
    dropdownMaxHeight: 360,
    dropdownZIndex: 10051,
  },
};

const ConnectionSearchBar = ({
  sidebarFilter,
  setSidebarFilter,
  allNodes,
  findAllConnections,
  onOpenSSHConnection,
  onOpenRdpConnection,
  onOpenVncConnection,
  openEditSSHDialog,
  openEditRdpDialog,
  expandedKeys,
  masterKey,
  secureStorage,
  iconTheme = 'material',
  variant = 'titlebar',
  emptyLabel = 'NodeTerm',
  className = '',
  autoFocus = false,
  onRequestClose,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [passwordNodes, setPasswordNodes] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cachedAllItems, setCachedAllItems] = useState([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const lastAutoExpandedSignatureRef = useRef('');
  const MIN_SEARCH_CHARS = 3;
  const variantStyles = VARIANT_STYLES[variant] || VARIANT_STYLES.titlebar;

  // Debounced search state
  const [localFilter, setLocalFilter] = useState(sidebarFilter || '');
  const debounceTimeoutRef = useRef(null);

  useEffect(() => {
    setLocalFilter(sidebarFilter || '');
  }, [sidebarFilter]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleFilterChange = (val) => {
    setLocalFilter(val);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setSidebarFilter(val);
    }, 200);
  };

  useEffect(() => {
    const loadPasswords = async () => {
      try {
        if (masterKey && secureStorage) {
          const encryptedData = localStorage.getItem('passwords_encrypted');

          if (encryptedData) {
            const decrypted = await secureStorage.decryptData(
              JSON.parse(encryptedData),
              masterKey
            );
            setPasswordNodes(decrypted);
          } else {
            const plainData = localStorage.getItem('passwordManagerNodes');
            if (plainData) {
              setPasswordNodes(JSON.parse(plainData));
            } else {
              setPasswordNodes([]);
            }
          }
        } else {
          const saved = localStorage.getItem('passwordManagerNodes');
          if (saved) {
            setPasswordNodes(JSON.parse(saved));
          } else {
            setPasswordNodes([]);
          }
        }
      } catch (error) {
        if (error.name !== 'OperationError') {
          console.error('Error loading passwords for search:', error);
        }
        setPasswordNodes([]);
      }
    };

    loadPasswords();

    const handleStorageChange = (e) => {
      if (e.key === 'passwordManagerNodes' || e.key === 'passwords_encrypted') {
        loadPasswords();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [masterKey, secureStorage]);

  const findAllPasswords = (nodes) => {
    const result = [];
    const traverse = (nodeList) => {
      for (const node of nodeList) {
        if (node.data && node.data.type === 'password') {
          result.push(node);
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };
    traverse(nodes);
    return result;
  };

  useEffect(() => {
    const updateCache = () => {
      try {
        const allConnections = findAllConnections(allNodes);
        const allPasswords = findAllPasswords(passwordNodes);
        setCachedAllItems([...allConnections, ...allPasswords]);
      } catch (error) {
        console.error('Error actualizando cache:', error);
      }
    };

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(updateCache);
    } else {
      setTimeout(updateCache, 0);
    }
  }, [allNodes, passwordNodes, findAllConnections]);

  const getDisplayUser = (node) => {
    if (!node.data) return null;

    const user = node.data.user || node.data.username;
    if (!user) return null;

    const wallixPattern = /^(.+)@(.+)@(.+):(.+):(.+)$/;
    const match = user.match(wallixPattern);

    if (match) {
      const targetUser = match[5];
      return targetUser.length > 25 ? targetUser.substring(0, 22) + '...' : targetUser;
    }

    return user.length > 25 ? user.substring(0, 22) + '...' : user;
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (sidebarFilter.trim().length >= MIN_SEARCH_CHARS) {
        setIsSearching(true);

        const performFilter = () => {
          try {
            const searchTerm = sidebarFilter.toLowerCase();
            const filtered = [];
            const MAX_RESULTS = 50;

            for (let i = 0; i < cachedAllItems.length && filtered.length < MAX_RESULTS; i++) {
              const node = cachedAllItems[i];
              let matches = false;

              if (node.label.toLowerCase().includes(searchTerm)) {
                matches = true;
              } else if (node.data) {
                if (node.data.type === 'password') {
                  matches = (
                    (node.data.password && node.data.password.toLowerCase().includes(searchTerm)) ||
                    (node.data.username && node.data.username.toLowerCase().includes(searchTerm)) ||
                    (node.data.url && node.data.url.toLowerCase().includes(searchTerm)) ||
                    (node.data.group && node.data.group.toLowerCase().includes(searchTerm))
                  );
                } else {
                  matches = (
                    (node.data.username && node.data.username.toLowerCase().includes(searchTerm)) ||
                    (node.data.user && node.data.user.toLowerCase().includes(searchTerm))
                  );
                }
              }

              if (matches) {
                filtered.push(node);
              }
            }

            setFilteredConnections(filtered);
            setShowDropdown(filtered.length > 0);
            setActiveIndex(filtered.length > 0 ? 0 : -1);
            setIsSearching(false);
          } catch (error) {
            console.error('Error en búsqueda:', error);
            setIsSearching(false);
          }
        };

        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(performFilter, { timeout: 100 });
        } else {
          setTimeout(performFilter, 0);
        }
      } else {
        setFilteredConnections([]);
        setShowDropdown(false);
        setActiveIndex(-1);
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [sidebarFilter, cachedAllItems]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.search-dropdown') && !event.target.closest('.search-input')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const findNodePath = (nodes, targetNode) => {
    const findPath = (nodeList, target, currentPath = []) => {
      for (const node of nodeList) {
        const newPath = [...currentPath, node.key];

        if (node.key === target.key) {
          return newPath;
        }

        if (node.children && node.children.length > 0) {
          const foundPath = findPath(node.children, target, newPath);
          if (foundPath) {
            return foundPath;
          }
        }
      }
      return null;
    };

    return findPath(nodes, targetNode);
  };

  const getNodeFolderPath = (nodes, targetNode) => {
    const findFolderPath = (nodeList, target, currentPath = []) => {
      for (const node of nodeList) {
        const isFolder = !node.data || (!node.data.type || (node.data.type !== 'ssh' && node.data.type !== 'rdp' && node.data.type !== 'rdp-guacamole'));
        const newPath = isFolder ? [...currentPath, node.label] : currentPath;

        if (node.key === target.key) {
          return currentPath;
        }

        if (node.children && node.children.length > 0) {
          const foundPath = findFolderPath(node.children, target, newPath);
          if (foundPath) {
            return foundPath;
          }
        }
      }
      return null;
    };

    return findFolderPath(nodes, targetNode);
  };

  const expandNodePath = (nodePath, currentExpandedKeys) => {
    if (!nodePath || nodePath.length === 0) return currentExpandedKeys;

    const newExpandedKeys = { ...currentExpandedKeys };

    for (let i = 0; i < nodePath.length - 1; i++) {
      const folderKey = nodePath[i];
      if (!newExpandedKeys[folderKey]) {
        newExpandedKeys[folderKey] = true;
      }
    }

    return newExpandedKeys;
  };

  const handleSelectConnection = (node) => {
    setSidebarFilter('');
    setShowDropdown(false);
    setActiveIndex(-1);
    onRequestClose?.();

    window.dispatchEvent(new CustomEvent('expand-sidebar'));

    const nodePath = findNodePath(allNodes, node);
    if (nodePath && nodePath.length > 1) {
      const newExpandedKeys = expandNodePath(nodePath, expandedKeys || {});
      window.dispatchEvent(new CustomEvent('expand-node-path', {
        detail: { expandedKeys: newExpandedKeys, nodeKey: node.key }
      }));
    }

    const isPassword = node.data && node.data.type === 'password';
    const isSSH = node.data && node.data.type === 'ssh';
    const isRDP = node.data && (node.data.type === 'rdp' || node.data.type === 'rdp-guacamole');
    const isVNC = node.data && (node.data.type === 'vnc' || node.data.type === 'vnc-guacamole');

    if (isPassword) {
      const payload = {
        key: node.key,
        label: node.label,
        data: {
          username: node.data?.username || '',
          password: node.data?.password || '',
          url: node.data?.url || '',
          group: node.data?.group || '',
          notes: node.data?.notes || ''
        }
      };
      window.dispatchEvent(new CustomEvent('open-password-tab', { detail: payload }));
    } else if (isSSH && onOpenSSHConnection) {
      onOpenSSHConnection(node, allNodes);
    } else if (isRDP && onOpenRdpConnection) {
      onOpenRdpConnection(node, allNodes);
    } else if (isVNC && onOpenVncConnection) {
      onOpenVncConnection(node, allNodes);
    } else if (onOpenSSHConnection) {
      onOpenSSHConnection(node, allNodes);
    }
  };

  const handleToggleFavorite = (node) => {
    try {
      const connection = helpers.fromSidebarNode(node);
      if (connection) {
        toggleFavorite(connection);
      }
    } catch (error) {
      console.error('Error al actualizar favorito:', error);
    }
  };

  const handleEditConnection = (node) => {
    setSidebarFilter('');
    setShowDropdown(false);

    const isSSH = node.data && node.data.type === 'ssh';
    const isRDP = node.data && (node.data.type === 'rdp' || node.data.type === 'rdp-guacamole');

    if (isSSH && openEditSSHDialog) {
      openEditSSHDialog(node);
    } else if (isRDP && openEditRdpDialog) {
      openEditRdpDialog(node);
    }
  };

  const copyToClipboard = async (text, fieldName) => {
    try {
      if (window.electron?.clipboard?.writeText) {
        await window.electron.clipboard.writeText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }

      if (window.toast?.current?.show) {
        const message = fieldName === 'Contraseña' || fieldName === 'Password'
          ? 'Password copiado'
          : `${fieldName} copiado al portapapeles`;

        window.toast.current.show({
          severity: 'success',
          summary: 'Copiado',
          detail: message,
          life: 1500
        });
      }
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
    }
  };

  useEffect(() => {
    if (!showDropdown) return;
    if (sidebarFilter.trim().length < MIN_SEARCH_CHARS) return;
    if (!filteredConnections.length) return;

    const keysToExpand = filteredConnections.map((node) => node?.key).filter(Boolean);
    if (!keysToExpand.length) return;
    const signature = keysToExpand.join('|');
    if (lastAutoExpandedSignatureRef.current === signature) return;
    lastAutoExpandedSignatureRef.current = signature;

    window.dispatchEvent(new CustomEvent('expand-sidebar'));

    let mergedExpandedKeys = { ...(expandedKeys || {}) };
    keysToExpand.forEach((nodeKey) => {
      const node = filteredConnections.find((n) => n?.key === nodeKey);
      if (!node) return;
      const nodePath = findNodePath(allNodes, node);
      if (nodePath && nodePath.length > 1) {
        mergedExpandedKeys = expandNodePath(nodePath, mergedExpandedKeys);
      }
    });

    window.dispatchEvent(new CustomEvent('expand-node-path', {
      detail: { expandedKeys: mergedExpandedKeys, nodeKey: keysToExpand[0] }
    }));
  }, [showDropdown, sidebarFilter, filteredConnections, allNodes, expandedKeys]);

  const updateDropdownPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!showDropdown) return;
    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [showDropdown, filteredConnections, sidebarFilter, variant]);

  useEffect(() => {
    if (!autoFocus) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [autoFocus]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (showDropdown) {
        setShowDropdown(false);
      }
      if (!sidebarFilter.trim()) {
        e.preventDefault();
        onRequestClose?.();
      }
      return;
    }

    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredConnections.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredConnections.length) {
        handleSelectConnection(filteredConnections[activeIndex]);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`connection-search-bar ${className}`.trim()}
      style={{
        position: 'relative',
        WebkitAppRegion: 'no-drag',
        ...variantStyles.container,
      }}
    >
      {!localFilter ? (
        <span style={{
          position: 'absolute',
          left: variant === 'palette' ? 16 : '50%',
          top: '50%',
          transform: variant === 'palette' ? 'translateY(-50%)' : 'translate(-50%, -50%)',
          color: variantStyles.emptyLabelColor,
          pointerEvents: 'none',
          fontSize: variant === 'main-frame' ? 12 : (variant === 'palette' ? 14 : 13),
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          opacity: variant === 'main-frame' || variant === 'palette' ? 0.75 : 1,
          zIndex: 2
        }}>
          <FaSearch />
          <span>{emptyLabel}</span>
        </span>
      ) : isSearching && (
        <span style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#666',
          pointerEvents: 'none',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          zIndex: 2
        }}>
          <i className="pi pi-spin pi-spinner" style={{ fontSize: '12px' }} />
        </span>
      )}
      <InputText
        ref={inputRef}
        value={localFilter}
        onChange={(e) => handleFilterChange(e.target.value)}
        onKeyDown={handleSearchKeyDown}
        placeholder=""
        className="search-input"
        data-animation=""
        style={{
          ...variantStyles.input,
          outline: 'none',
          boxShadow: variant === 'titlebar' ? '0 1px 4px 0 rgba(0,0,0,0.1)' : 'none',
          transition: 'border 0.2s',
          zIndex: 1,
        }}
        onFocus={() => {
          if (filteredConnections.length > 0) {
            setShowDropdown(true);
          }
        }}
        onBlur={() => {
          if (variant === 'palette') {
            return;
          }
          if (!localFilter.trim()) {
            setTimeout(() => {
              setShowDropdown(false);
              onRequestClose?.();
            }, 150);
          }
        }}
        autoComplete="off"
      />
      {showDropdown && ReactDOM.createPortal(
        <div
          className="search-dropdown"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            minWidth: variantStyles.container.minWidth,
            maxWidth: variantStyles.container.maxWidth,
            maxHeight: variantStyles.dropdownMaxHeight || 300,
            background: 'var(--ui-dialog-bg, #232629)',
            color: 'var(--ui-dialog-text, #fff)',
            borderRadius: variant === 'palette' ? 10 : 6,
            boxShadow: variant === 'palette' ? '0 12px 40px rgba(0,0,0,0.35)' : '0 4px 16px rgba(0,0,0,0.18)',
            zIndex: variantStyles.dropdownZIndex || 9999,
            overflowY: 'auto',
            border: '1px solid var(--ui-dialog-border, #444)',
            WebkitAppRegion: 'no-drag',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: '500',
            margin: 0,
            padding: 0,
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--ui-sidebar-selected, #00bfff) var(--ui-dialog-bg, #232629)',
          }}
        >
          {filteredConnections.map((node, idx) => {
            const isSSH = node.data && node.data.type === 'ssh';
            const isRDP = node.data && node.data.type === 'rdp';
            const isPassword = node.data && node.data.type === 'password';

            let protocolColor = '#4fc3f7';
            let protocolName = 'Conexión';

            if (isPassword) {
              protocolColor = '#ffc107';
              protocolName = 'Password';
            } else if (isSSH) {
              protocolColor = '#28a745';
              protocolName = 'SSH';
            } else if (isRDP) {
              protocolColor = '#007ad9';
              protocolName = 'RDP';
            }

            const folderPath = getNodeFolderPath(allNodes, node);
            const folderPathString = folderPath && folderPath.length > 0 ? folderPath.join(' / ') : 'Raíz';
            const connection = helpers.fromSidebarNode(node);
            const favorites = JSON.parse(localStorage.getItem('nodeterm_favorite_connections') || '[]');
            const isFavorite = favorites.some((fav) => fav.id === connection?.id);

            return (
              <div
                key={node.key}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: 13,
                  borderBottom: '1px solid var(--ui-dialog-border, #333)',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  borderRadius: '4px',
                  margin: '2px 4px',
                  minHeight: '60px',
                  backgroundColor: activeIndex === idx ? 'var(--ui-sidebar-hover, #2a2d31)' : 'transparent',
                  transform: activeIndex === idx ? 'translateY(-1px)' : 'translateY(0)',
                  boxShadow: activeIndex === idx ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                }}
                onMouseEnter={(e) => {
                  setActiveIndex(idx);
                  e.currentTarget.style.backgroundColor = 'var(--ui-sidebar-hover, #2a2d31)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectConnection(node)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 20, justifyContent: 'center', paddingTop: '2px' }}>
                  {isPassword ? (
                    <span style={{ color: protocolColor, fontSize: 16, fontWeight: 'bold' }}>🔑</span>
                  ) : isSSH ? (
                    <span style={{ color: protocolColor, fontSize: 16, fontWeight: 'bold' }}>⚡</span>
                  ) : isRDP ? (
                    <span style={{ color: protocolColor, fontSize: 16, fontWeight: 'bold' }}>🖥️</span>
                  ) : (
                    <span style={{ color: protocolColor, fontSize: 16, fontWeight: 'bold' }}>🔗</span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 500,
                      color: 'var(--ui-dialog-text, #fff)',
                      fontSize: '13px'
                    }}>
                      {node.label}
                    </span>
                    <span style={{
                      fontSize: 10,
                      color: protocolColor,
                      fontWeight: 600,
                      backgroundColor: `${protocolColor}20`,
                      padding: '2px 6px',
                      borderRadius: '10px',
                      border: `1px solid ${protocolColor}40`,
                      whiteSpace: 'nowrap'
                    }}>
                      {protocolName}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '11px',
                    color: 'var(--ui-dialog-text, #aaa)',
                    opacity: 0.8
                  }}>
                    <span style={{ fontSize: '10px' }}>📁</span>
                    <span style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontStyle: 'italic'
                    }}>
                      {folderPathString}
                    </span>
                  </div>
                </div>

                {getDisplayUser(node) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                    marginRight: 8,
                    paddingTop: '2px'
                  }}>
                    <span style={{
                      fontSize: 11,
                      color: 'var(--ui-dialog-text, #fff)',
                      fontWeight: 600,
                      backgroundColor: 'var(--ui-sidebar-hover, #2a2d31)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      border: '1px solid var(--ui-dialog-border, #444)',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <span style={{ fontSize: 10 }}>👤</span>
                      <span>{getDisplayUser(node)}</span>
                    </span>
                  </div>
                )}

                {isPassword ? (
                  node.data?.password && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '2px', marginLeft: '4px' }}>
                      <span
                        title="Copiar contraseña"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffc107',
                          background: 'rgba(255, 193, 7, 0.15)',
                          border: '1px solid rgba(255, 193, 7, 0.4)',
                          transition: 'all .15s ease',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(node.data.password, 'Contraseña');
                        }}
                      >
                        <i className="pi pi-key" style={{ fontSize: '12px' }} />
                      </span>
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, paddingTop: '2px' }}>
                    {node.data?.password && (
                      <span
                        title="Copiar contraseña"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffc107',
                          background: 'rgba(255, 193, 7, 0.15)',
                          border: '1px solid rgba(255, 193, 7, 0.4)',
                          transition: 'all .15s ease',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(node.data.password, 'Contraseña');
                        }}
                      >
                        <i className="pi pi-key" style={{ fontSize: '12px' }} />
                      </span>
                    )}

                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isFavorite ? 'var(--ui-primary-color, #ffd700)' : 'var(--ui-dialog-text, #666)',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(node);
                      }}
                      title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    >
                      <i className="pi pi-star" />
                    </button>

                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--ui-dialog-text, #888)',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditConnection(node);
                      }}
                      title="Editar conexión"
                    >
                      <i className="pi pi-pencil" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {filteredConnections.length === 0 && (
            <div style={{
              padding: '12px',
              color: 'var(--ui-dialog-text, #aaa)',
              fontSize: 13,
              textAlign: 'center',
              fontFamily: 'inherit'
            }}>Sin resultados</div>
          )}
          {filteredConnections.length >= 50 && (
            <div style={{
              padding: '8px 12px',
              color: 'var(--ui-dialog-text, #888)',
              fontSize: 11,
              textAlign: 'center',
              fontFamily: 'inherit',
              fontStyle: 'italic',
              borderTop: '1px solid var(--ui-dialog-border, #333)'
            }}>
              Mostrando primeros 50 resultados. Refina tu búsqueda para ver más.
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ConnectionSearchBar;
