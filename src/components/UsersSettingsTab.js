import React, { useState, useMemo, useCallback } from 'react';
import { Button } from 'primereact/button';
import { Password } from 'primereact/password';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';
import { InputText } from 'primereact/inputtext';
import AppDialog from './ui/AppDialog';

const CONNECTION_TYPE_LABELS = {
  ssh: { label: 'SSH', icon: 'pi pi-server', color: '#4caf50' },
  rdp: { label: 'RDP', icon: 'pi pi-desktop', color: '#2196f3' },
  'rdp-guacamole': { label: 'RDP', icon: 'pi pi-desktop', color: '#2196f3' },
  vnc: { label: 'VNC', icon: 'pi pi-eye', color: '#9c27b0' },
  'vnc-guacamole': { label: 'VNC', icon: 'pi pi-eye', color: '#9c27b0' },
  sftp: { label: 'SFTP', icon: 'pi pi-folder-open', color: '#ff9800' },
  ftp: { label: 'FTP', icon: 'pi pi-folder-open', color: '#ff9800' },
  scp: { label: 'SCP', icon: 'pi pi-folder-open', color: '#ff9800' },
  'ssh-tunnel': { label: 'Túnel', icon: 'pi pi-arrows-h', color: '#00bcd4' },
};

const WALLIX_PATTERN = /^(.+)@(.+)@(.+):(.+):(.+)$/;

function getTypeInfo(type) {
  return CONNECTION_TYPE_LABELS[type] || { label: type || 'SSH', icon: 'pi pi-server', color: '#607d8b' };
}

/**
 * Extrae el usuario destino de una cadena Wallix/Bastion.
 * Formato: <bastionUser>@<domain>@<targetServer>:<protocol>:<targetUser>
 * Ejemplo: sdeng_dSN@INTERNAL_SERVICE@ESAH-DSAM-DN02M:SSH:rt01119 → rt01119
 */
export function extractBastionTargetUser(bastionUserStr) {
  if (!bastionUserStr) return null;
  const match = bastionUserStr.match(WALLIX_PATTERN);
  if (match) return match[5];
  const lastColon = bastionUserStr.lastIndexOf(':');
  if (lastColon !== -1 && lastColon < bastionUserStr.length - 1) {
    return bastionUserStr.substring(lastColon + 1);
  }
  return bastionUserStr;
}

const SSH_LIKE_TYPES = new Set(['ssh', 'rdp', 'rdp-guacamole', 'vnc', 'vnc-guacamole', 'sftp', 'ftp', 'scp', 'ssh-tunnel']);

/**
 * Devuelve true si la cadena tiene formato Wallix: user@domain@server:protocol:targetUser
 */
function isWallixString(str) {
  return str ? WALLIX_PATTERN.test(str) : false;
}

function extractUsersFromNodes(nodes, result = new Map()) {
  if (!Array.isArray(nodes)) return result;
  for (const node of nodes) {
    const type = node.type || node.data?.type;
    if (type && SSH_LIKE_TYPES.has(type)) {
      let username;
      // Caso 1: bastion configurado explícitamente con bastionUser
      if (node.data?.useBastionWallix && node.data?.bastionUser) {
        username = extractBastionTargetUser(node.data.bastionUser);
      } else {
        const rawUser = node.data?.user || node.data?.username;
        // Caso 2: el campo user contiene directamente una cadena Wallix (legacy/importado)
        if (rawUser && isWallixString(rawUser)) {
          username = extractBastionTargetUser(rawUser);
        } else {
          username = rawUser;
        }
      }
      if (username) {
        if (!result.has(username)) result.set(username, []);
        result.get(username).push(node);
      }
    }
    if (node.children?.length) {
      extractUsersFromNodes(node.children, result);
    }
  }
  return result;
}

const UsersSettingsTab = ({ nodes = [], onUpdateUserPassword, onEditConnection }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedConnectionKeys, setSelectedConnectionKeys] = useState(new Set());
  const [passwordError, setPasswordError] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);

  const usersMap = useMemo(() => extractUsersFromNodes(nodes), [nodes]);

  const usersList = useMemo(() => {
    const arr = Array.from(usersMap.entries()).map(([username, connections]) => ({
      username,
      connections,
      count: connections.length,
      types: [...new Set(connections.map(n => n.type || n.data?.type).filter(Boolean))],
      hasBastion: connections.some(n =>
        (n.data?.useBastionWallix && n.data?.bastionUser) ||
        isWallixString(n.data?.user || n.data?.username)
      ),
    }));
    if (!searchText.trim()) return arr;
    const lower = searchText.toLowerCase();
    return arr.filter(u => u.username.toLowerCase().includes(lower));
  }, [usersMap, searchText]);

  const handleSelectUser = useCallback((user) => {
    setSelectedUser(user);
    setSelectedConnectionKeys(new Set(user.connections.map(n => n.key)));
    setApplySuccess(false);
  }, []);

  const handleOpenChangePassword = useCallback(() => {
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setApplySuccess(false);
    setChangePasswordVisible(true);
  }, []);

  const handleApplyPassword = useCallback(() => {
    if (!newPassword) {
      setPasswordError('La contraseña no puede estar vacía.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }
    setPasswordError('');

    const nodeIds = selectedConnectionKeys.size === selectedUser.connections.length
      ? null
      : Array.from(selectedConnectionKeys);

    if (onUpdateUserPassword) {
      onUpdateUserPassword(selectedUser.username, newPassword, nodeIds);
    }

    setApplySuccess(true);
    setChangePasswordVisible(false);
    setNewPassword('');
    setConfirmPassword('');
  }, [newPassword, confirmPassword, selectedUser, selectedConnectionKeys, onUpdateUserPassword]);

  const toggleConnectionSelection = useCallback((key) => {
    setSelectedConnectionKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleAllConnections = useCallback(() => {
    if (!selectedUser) return;
    if (selectedConnectionKeys.size === selectedUser.connections.length) {
      setSelectedConnectionKeys(new Set());
    } else {
      setSelectedConnectionKeys(new Set(selectedUser.connections.map(n => n.key)));
    }
  }, [selectedUser, selectedConnectionKeys]);

  const handleEditConnection = useCallback((conn, event) => {
    event?.stopPropagation();
    if (onEditConnection) {
      onEditConnection(conn);
    }
  }, [onEditConnection]);

  const containerStyle = {
    display: 'flex',
    height: '100%',
    overflow: 'hidden',
    gap: 0,
  };

  const leftPanelStyle = {
    width: '340px',
    minWidth: '280px',
    maxWidth: '340px',
    borderRight: '1px solid var(--ui-dialog-border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: 'var(--ui-content-bg)',
  };

  const rightPanelStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: 'var(--ui-dialog-bg)',
  };

  const headerStyle = {
    padding: '1rem 1.25rem 0.75rem',
    borderBottom: '1px solid var(--ui-dialog-border)',
    flexShrink: 0,
  };

  const userRowStyle = (isSelected) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.65rem 1.25rem',
    cursor: 'pointer',
    background: isSelected ? 'var(--ui-button-primary)' : 'transparent',
    color: isSelected ? 'var(--ui-button-primary-text, #fff)' : 'var(--ui-dialog-text)',
    transition: 'background 0.15s',
    borderBottom: '1px solid var(--ui-dialog-border)',
    flexShrink: 0,
  });

  const avatarStyle = (isSelected) => ({
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--ui-button-primary)',
    color: isSelected ? 'var(--ui-button-primary-text, #fff)' : 'var(--ui-button-primary-text, #fff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.9rem',
    flexShrink: 0,
    textTransform: 'uppercase',
  });

  const emptyPanelStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-color-secondary)',
    opacity: 0.5,
    gap: '0.75rem',
  };

  return (
    <div style={containerStyle}>
      {/* Panel izquierdo: lista de usuarios */}
      <div style={leftPanelStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <i className="pi pi-users" style={{ fontSize: '1.1rem', color: 'var(--ui-button-primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ui-dialog-text)' }}>
              Gestión de Usuarios
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.65, color: 'var(--ui-dialog-text)', lineHeight: 1.4 }}>
            Usuarios detectados en las conexiones configuradas.
          </p>
          <div style={{ marginTop: '0.75rem' }}>
            <span className="p-input-icon-left" style={{ width: '100%' }}>
              <i className="pi pi-search" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', zIndex: 1, pointerEvents: 'none', color: 'var(--text-color-secondary)' }} />
              <InputText
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Buscar usuario..."
                style={{ width: '100%', paddingLeft: '2rem', fontSize: '0.8rem', height: '32px' }}
              />
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {usersList.length === 0 ? (
            <div style={{ ...emptyPanelStyle, padding: '2rem 1rem' }}>
              <i className="pi pi-users" style={{ fontSize: '2rem' }} />
              <span style={{ fontSize: '0.8rem', textAlign: 'center' }}>
                {searchText ? 'Sin resultados para la búsqueda' : 'No se encontraron usuarios en las conexiones'}
              </span>
            </div>
          ) : (
            usersList.map(user => {
              const isSelected = selectedUser?.username === user.username;
              return (
                <div
                  key={user.username}
                  style={userRowStyle(isSelected)}
                  onClick={() => handleSelectUser(user)}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={avatarStyle(isSelected)}>
                    {user.username.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.username}
                      </span>
                      {user.hasBastion && (
                        <span style={{
                          fontSize: '0.55rem',
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: isSelected ? 'rgba(255,255,255,0.25)' : '#ff572222',
                          color: isSelected ? '#fff' : '#ff5722',
                          fontWeight: 700,
                          flexShrink: 0,
                          letterSpacing: '0.03em',
                        }}>
                          Bastion
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7125rem', opacity: 0.7, marginTop: 2 }}>
                      {user.count} {user.count === 1 ? 'conexión' : 'conexiones'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '80px' }}>
                    {user.types.slice(0, 3).map(type => {
                      const info = getTypeInfo(type);
                      return (
                        <span
                          key={type}
                          style={{
                            fontSize: '0.6rem',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            background: isSelected ? 'rgba(255,255,255,0.25)' : info.color + '33',
                            color: isSelected ? '#fff' : info.color,
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {info.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid var(--ui-dialog-border)',
          fontSize: '0.7rem',
          opacity: 0.5,
          color: 'var(--ui-dialog-text)',
          flexShrink: 0,
        }}>
          {usersMap.size} {usersMap.size === 1 ? 'usuario único' : 'usuarios únicos'} en total
        </div>
      </div>

      {/* Panel derecho: detalle del usuario seleccionado */}
      <div style={rightPanelStyle}>
        {!selectedUser ? (
          <div style={emptyPanelStyle}>
            <i className="pi pi-user" style={{ fontSize: '2.5rem' }} />
            <span style={{ fontSize: '0.875rem' }}>Selecciona un usuario para ver sus conexiones</span>
          </div>
        ) : (
          <>
            <div style={{
              padding: '1.25rem 1.5rem 1rem',
              borderBottom: '1px solid var(--ui-dialog-border)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--ui-button-primary)',
                color: 'var(--ui-button-primary-text, #fff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.1rem',
                flexShrink: 0,
                textTransform: 'uppercase',
              }}>
                {selectedUser.username.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ui-dialog-text)' }}>
                  {selectedUser.username}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: 2, color: 'var(--ui-dialog-text)' }}>
                  {selectedUser.count} {selectedUser.count === 1 ? 'conexión' : 'conexiones'} · {selectedUser.types.join(', ')}
                </div>
              </div>
              <Button
                label="Cambiar Contraseña"
                icon="pi pi-lock"
                size="small"
                onClick={handleOpenChangePassword}
                style={{ flexShrink: 0 }}
              />
            </div>

            {applySuccess && (
              <div style={{
                margin: '0.75rem 1.5rem 0',
                padding: '0.6rem 1rem',
                borderRadius: 8,
                background: 'rgba(76, 175, 80, 0.12)',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                color: '#4caf50',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <i className="pi pi-check-circle" />
                Contraseña actualizada correctamente en las conexiones seleccionadas.
              </div>
            )}

            <div style={{ padding: '1rem 1.5rem 0.5rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ui-dialog-text)' }}>
                  Conexiones ({selectedUser.count})
                </span>
                <button
                  onClick={toggleAllConnections}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    color: 'var(--ui-button-primary)',
                    padding: '2px 6px',
                  }}
                >
                  {selectedConnectionKeys.size === selectedUser.connections.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 1.5rem 1.5rem' }}>
              {selectedUser.connections.map(conn => {
                const type = conn.type || conn.data?.type;
                const info = getTypeInfo(type);
                const explicitBastion = !!(conn.data?.useBastionWallix && conn.data?.bastionUser);
                const rawUserWallix = !explicitBastion && isWallixString(conn.data?.user || conn.data?.username)
                  ? (conn.data?.user || conn.data?.username)
                  : null;
                const isBastion = explicitBastion || !!rawUserWallix;
                const bastionString = explicitBastion ? conn.data.bastionUser : rawUserWallix;
                const host = isBastion
                  ? (conn.data?.targetServer || conn.data?.bastionHost || conn.data?.host || '')
                  : (conn.data?.host || conn.data?.hostname || conn.data?.server || conn.data?.targetServer || '');
                const port = conn.data?.port;
                const isChecked = selectedConnectionKeys.has(conn.key);
                const hasPassword = !!(conn.data?.password);
                const bastionSubtitle = isBastion ? bastionString : null;
                return (
                  <div
                    key={conn.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 0.875rem',
                      marginBottom: '0.375rem',
                      borderRadius: 8,
                      background: isChecked
                        ? 'rgba(var(--ui-button-primary-rgb, 33, 150, 243), 0.08)'
                        : 'var(--ui-content-bg)',
                      border: `1px solid ${isChecked ? 'var(--ui-button-primary)' : 'var(--ui-dialog-border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onClick={() => toggleConnectionSelection(conn.key)}
                  >
                    <Checkbox
                      checked={isChecked}
                      onChange={() => toggleConnectionSelection(conn.key)}
                      onClick={e => e.stopPropagation()}
                    />
                    <div style={{
                      width: 30,
                      height: 30,
                      borderRadius: 6,
                      background: isBastion ? '#ff572222' : info.color + '22',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <i className={isBastion ? 'pi pi-shield' : info.icon} style={{ fontSize: '0.85rem', color: isBastion ? '#ff5722' : info.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--ui-dialog-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {conn.label || conn.data?.name || `${selectedUser.username}@${host}`}
                      </div>
                      <div style={{
                        fontSize: '0.7rem',
                        opacity: 0.6,
                        color: 'var(--ui-dialog-text)',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                        title={bastionSubtitle || undefined}
                      >
                        {isBastion
                          ? (bastionSubtitle || host)
                          : `${host}${port ? `:${port}` : ''}${!host ? 'Sin host configurado' : ''}`
                        }
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                      {onEditConnection && (
                        <button
                          type="button"
                          title="Editar conexión"
                          aria-label="Editar conexión"
                          onClick={(e) => handleEditConnection(conn, e)}
                          style={{
                            fontSize: '0.6rem',
                            padding: '2px 6px',
                            borderRadius: 4,
                            border: '1px solid var(--ui-dialog-border)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'var(--ui-dialog-text)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '24px',
                            height: '18px',
                            cursor: 'pointer',
                            opacity: 0.85
                          }}
                        >
                          <i className="pi pi-pencil" style={{ fontSize: '0.52rem' }} />
                        </button>
                      )}
                      {isBastion && (
                        <span style={{
                          fontSize: '0.6rem',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: '#ff572222',
                          color: '#ff5722',
                          fontWeight: 600,
                        }}>
                          Bastion
                        </span>
                      )}
                      <span style={{
                        fontSize: '0.6rem',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: info.color + '22',
                        color: info.color,
                        fontWeight: 600,
                      }}>
                        {info.label}
                      </span>
                      {hasPassword ? (
                        <i className="pi pi-lock" style={{ fontSize: '0.75rem', color: '#4caf50', opacity: 0.8 }} title="Tiene contraseña" />
                      ) : (
                        <i className="pi pi-lock-open" style={{ fontSize: '0.75rem', color: '#ff9800', opacity: 0.7 }} title="Sin contraseña" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedConnectionKeys.size > 0 && (
              <div style={{
                padding: '0.75rem 1.5rem',
                borderTop: '1px solid var(--ui-dialog-border)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '0.75rem', opacity: 0.65, color: 'var(--ui-dialog-text)' }}>
                  {selectedConnectionKeys.size} de {selectedUser.count} {selectedUser.count === 1 ? 'conexión seleccionada' : 'conexiones seleccionadas'}
                </span>
                <Button
                  label="Cambiar Contraseña"
                  icon="pi pi-lock"
                  size="small"
                  onClick={handleOpenChangePassword}
                />
              </div>
            )}
          </>
        )}
      </div>

      <AppDialog
        visible={changePasswordVisible}
        onHide={() => setChangePasswordVisible(false)}
        headerIcon="pi pi-lock"
        headerTitle={`Cambiar Contrasena - ${selectedUser?.username || ''}`}
        size="md"
        draggable={false}
        confirmLabel="Aplicar"
        confirmIcon="pi pi-check"
        confirmDisabled={!newPassword || !confirmPassword}
        onConfirm={handleApplyPassword}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 8,
            background: 'rgba(33, 150, 243, 0.08)',
            border: '1px solid rgba(33, 150, 243, 0.2)',
            fontSize: '0.8rem',
            color: 'var(--ui-dialog-text)',
            opacity: 0.85,
          }}>
            <i className="pi pi-info-circle" style={{ marginRight: '0.5rem', color: 'var(--ui-button-primary)' }} />
            Se actualizara la contrasena en{' '}
            <strong>{selectedConnectionKeys.size}</strong>{' '}
            {selectedConnectionKeys.size === 1 ? 'conexion' : 'conexiones'} del usuario{' '}
            <strong>{selectedUser?.username}</strong>.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ui-dialog-text)' }}>
              Nueva contrasena
            </label>
            <Password
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setPasswordError(''); }}
              feedback={false}
              toggleMask
              inputStyle={{ width: '100%' }}
              style={{ width: '100%' }}
              placeholder="Introduce la nueva contrasena"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ui-dialog-text)' }}>
              Confirmar contrasena
            </label>
            <Password
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); }}
              feedback={false}
              toggleMask
              inputStyle={{ width: '100%' }}
              style={{ width: '100%' }}
              placeholder="Repite la contrasena"
            />
          </div>

          {passwordError && (
            <div style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 6,
              background: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              color: '#f44336',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <i className="pi pi-exclamation-circle" />
              {passwordError}
            </div>
          )}
        </div>
      </AppDialog>
    </div>
  );
};

export default UsersSettingsTab;
