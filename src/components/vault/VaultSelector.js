import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { isMultiVaultEnabled } from '../../utils/multiVaultFlag';
import {
  DEFAULT_VAULT_ID,
  getVisibleConnectionVaultIds
} from '../../utils/activeConnectionVault';
import {
  getDefaultVaultDisplayName,
  listRegisteredExtraVaults
} from '../../utils/extraConnectionVaults';
import vaultKeyring from '../../services/VaultKeyring';

/**
 * Selector de vault tipo Termius (checks) para la title bar.
 * Varios visibles → árbol con raíces; uno → árbol plano.
 * El menú se renderiza en portal (la title bar tiene overflow:hidden).
 */
const VaultSelector = ({
  visibleVaultIds,
  onToggleVault,
  onRequestUnlock,
  onRequestCreate
}) => {
  const [open, setOpen] = useState(false);
  const [vaults, setVaults] = useState([]);
  const [defaultVaultName, setDefaultVaultName] = useState('Principal');
  const [enabled, setEnabled] = useState(() => isMultiVaultEnabled());
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const renameInputRef = useRef(null);

  const refresh = useCallback(async () => {
    const on = isMultiVaultEnabled();
    setEnabled(on);
    if (!on) {
      setVaults([]);
      setDefaultVaultName('Principal');
      return;
    }
    const [extras, mainName] = await Promise.all([
      listRegisteredExtraVaults(),
      getDefaultVaultDisplayName()
    ]);
    setVaults(extras);
    setDefaultVaultName(mainName);
  }, []);

  useEffect(() => {
    refresh();
    const off = window.electron?.vaults?.onChanged?.(refresh);
    const onFlag = () => refresh();
    window.addEventListener('multi-vault-flag-changed', onFlag);
    window.addEventListener('extra-vaults-reload', onFlag);
    const unsub = vaultKeyring.subscribe?.(onFlag);
    return () => {
      off?.();
      unsub?.();
      window.removeEventListener('multi-vault-flag-changed', onFlag);
      window.removeEventListener('extra-vaults-reload', onFlag);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const t = e.target;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setRenameId(null);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (renameId) {
          setRenameId(null);
          return;
        }
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, renameId]);

  useEffect(() => {
    if (renameId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renameId]);

  if (!enabled) return null;

  const visible = Array.isArray(visibleVaultIds)
    ? visibleVaultIds
    : getVisibleConnectionVaultIds();
  const visibleSet = new Set(visible);

  const label = (() => {
    if (visible.length === 0) return 'Ninguno';
    if (visible.length === 1) {
      const id = visible[0];
      if (id === DEFAULT_VAULT_ID) return defaultVaultName;
      const meta = vaults.find((v) => v.id === id);
      return meta?.name || id;
    }
    return `${visible.length} vaults`;
  })();

  const anyLocked = visible.some(
    (id) => id !== DEFAULT_VAULT_ID && !vaultKeyring.isUnlocked(id)
  );

  const openMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!btnRef.current) {
      setOpen((v) => !v);
      return;
    }
    if (open) {
      setOpen(false);
      setRenameId(null);
      return;
    }
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 280))
    });
    setOpen(true);
  };

  const handleToggle = (vaultId, currentlyChecked) => {
    if (renameId) return;
    const nextChecked = !currentlyChecked;
    if (
      nextChecked &&
      vaultId !== DEFAULT_VAULT_ID &&
      !vaultKeyring.isUnlocked(vaultId)
    ) {
      const meta = vaults.find((v) => v.id === vaultId);
      onRequestUnlock?.({
        id: vaultId,
        name: meta?.name || vaultId,
        icon: meta?.icon
      });
      return;
    }
    // No permitir desmarcar el último
    if (!nextChecked && visible.length <= 1 && visibleSet.has(vaultId)) {
      return;
    }
    onToggleVault?.(vaultId, nextChecked);
  };

  const handleLock = (e, vaultId) => {
    e.preventDefault();
    e.stopPropagation();
    if (vaultId === DEFAULT_VAULT_ID) return;
    window.dispatchEvent(
      new CustomEvent('request-lock-extra-vault', {
        detail: { vaultId }
      })
    );
  };

  const handleUnlock = (e, vaultId) => {
    e.preventDefault();
    e.stopPropagation();
    const meta = vaults.find((v) => v.id === vaultId);
    onRequestUnlock?.({
      id: vaultId,
      name: meta?.name || vaultId,
      icon: meta?.icon
    });
  };

  const startRename = (e, vaultId, currentName) => {
    e.preventDefault();
    e.stopPropagation();
    setRenameId(vaultId);
    setRenameValue(currentName);
  };

  const cancelRename = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setRenameId(null);
    setRenameValue('');
  };

  const commitRename = async (e, vaultId) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const next = String(renameValue || '').trim();
    if (!next || renaming) return;
    setRenaming(true);
    try {
      const res = await window.electron?.vaults?.rename?.({
        vaultId,
        name: next
      });
      if (!res?.success) throw new Error(res?.error || 'Error');
      setRenameId(null);
      setRenameValue('');
      await refresh();
      window.dispatchEvent(new CustomEvent('extra-vaults-reload'));
    } catch (_) {
      /* toast no disponible aquí; el menú se mantiene abierto para reintentar */
    } finally {
      setRenaming(false);
    }
  };

  const noDrag = {
    WebkitAppRegion: 'no-drag',
    appRegion: 'no-drag'
  };

  const iconBtnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    padding: 0,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: 'inherit',
    opacity: 0.7,
    cursor: 'pointer',
    flexShrink: 0
  };

  const renderCheckRow = (vaultId, title, iconClass, isLocked, canLock) => {
    const checked = visibleSet.has(vaultId);
    const isEditing = renameId === vaultId;

    return (
      <div
        key={vaultId}
        role="menuitemcheckbox"
        aria-checked={checked}
        onClick={() => {
          if (!isEditing) handleToggle(vaultId, checked);
        }}
        style={{
          ...itemStyle(checked && !isEditing),
          cursor: isEditing ? 'default' : 'pointer'
        }}
      >
        <i className={iconClass} style={{ fontSize: 12, opacity: 0.9, flexShrink: 0 }} />

        {isEditing ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            disabled={renaming}
            onChange={(e) => setRenameValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commitRename(e, vaultId);
              if (e.key === 'Escape') cancelRename(e);
            }}
            style={{
              flex: 1,
              minWidth: 0,
              height: 22,
              padding: '0 6px',
              borderRadius: 4,
              border: '1px solid var(--ui-context-border, rgba(255,255,255,0.2))',
              background: 'var(--ui-dialog-bg, var(--ui-context-bg, #1e1e2e))',
              color: 'inherit',
              fontSize: 12,
              outline: 'none'
            }}
          />
        ) : (
          <span
            style={{
              flex: 1,
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {title}
          </span>
        )}

        {isEditing ? (
          <>
            <button
              type="button"
              title="Guardar"
              aria-label="Guardar nombre"
              disabled={renaming || !String(renameValue || '').trim()}
              onClick={(e) => commitRename(e, vaultId)}
              style={iconBtnStyle}
            >
              <i className="pi pi-check" style={{ fontSize: 11 }} />
            </button>
            <button
              type="button"
              title="Cancelar"
              aria-label="Cancelar edición"
              disabled={renaming}
              onClick={cancelRename}
              style={iconBtnStyle}
            >
              <i className="pi pi-times" style={{ fontSize: 11 }} />
            </button>
          </>
        ) : (
          <>
            {canLock ? (
              isLocked ? (
                <button
                  type="button"
                  title="Desbloquear"
                  aria-label={`Desbloquear ${title}`}
                  onClick={(e) => handleUnlock(e, vaultId)}
                  style={iconBtnStyle}
                >
                  <i className="pi pi-lock" style={{ fontSize: 11 }} />
                </button>
              ) : (
                <button
                  type="button"
                  title="Bloquear"
                  aria-label={`Bloquear ${title}`}
                  onClick={(e) => handleLock(e, vaultId)}
                  style={iconBtnStyle}
                >
                  <i className="pi pi-unlock" style={{ fontSize: 11 }} />
                </button>
              )
            ) : null}
            <button
              type="button"
              title="Renombrar"
              aria-label={`Renombrar ${title}`}
              onClick={(e) => startRename(e, vaultId, title)}
              style={iconBtnStyle}
            >
              <i className="pi pi-pencil" style={{ fontSize: 11 }} />
            </button>
          </>
        )}

        <span
          aria-hidden
          style={{
            width: 16,
            height: 16,
            borderRadius: 3,
            border: checked
              ? '1px solid transparent'
              : '1px solid color-mix(in srgb, var(--ui-context-text, #cdd6f4) 35%, transparent)',
            background: checked
              ? 'var(--primary-color, #89b4fa)'
              : 'transparent',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginLeft: 2
          }}
        >
          {checked ? (
            <i
              className="pi pi-check"
              style={{
                fontSize: 10,
                color: 'var(--primary-color-text, #111)'
              }}
            />
          ) : null}
        </span>
      </div>
    );
  };

  return (
    <>
      <div style={{ position: 'relative', marginLeft: 8, ...noDrag }}>
        <button
          ref={btnRef}
          type="button"
          title="Vaults de conexiones visibles"
          aria-haspopup="menu"
          aria-expanded={open}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={openMenu}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 24,
            padding: '0 8px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.22)',
            background: open ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.18)',
            color: 'var(--ui-titlebar-text, #fff)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            maxWidth: 180,
            ...noDrag
          }}
        >
          <i
            className={anyLocked ? 'pi pi-lock' : 'pi pi-box'}
            style={{ fontSize: 11 }}
          />
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 120
            }}
          >
            {label}
          </span>
          <i className="pi pi-chevron-down" style={{ fontSize: 9, opacity: 0.85 }} />
        </button>
      </div>

      {open &&
        ReactDOM.createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              minWidth: 260,
              maxWidth: 320,
              background:
                'var(--ui-context-bg, var(--ui-dialog-bg, #1e1e2e))',
              border:
                '1px solid var(--ui-context-border, rgba(255,255,255,0.14))',
              borderRadius: 8,
              boxShadow:
                '0 8px 24px var(--ui-context-shadow, rgba(0,0,0,0.45))',
              zIndex: 100000,
              padding: 4,
              color: 'var(--ui-context-text, #cdd6f4)',
              ...noDrag
            }}
          >
            <div
              style={{
                padding: '6px 10px 4px',
                fontSize: 10,
                opacity: 0.55,
                textTransform: 'uppercase',
                letterSpacing: 0.4
              }}
            >
              Visibles en el árbol
            </div>

            {renderCheckRow(
              DEFAULT_VAULT_ID,
              defaultVaultName,
              'pi pi-home',
              false,
              false
            )}

            {vaults.map((v) => {
              const isLocked = !vaultKeyring.isUnlocked(v.id);
              return renderCheckRow(
                v.id,
                v.name,
                isLocked ? 'pi pi-lock' : 'pi pi-box',
                isLocked,
                true
              );
            })}

            <div
              style={{
                height: 1,
                background: 'var(--ui-context-border, rgba(255,255,255,0.14))',
                margin: '4px 0'
              }}
            />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setRenameId(null);
                onRequestCreate?.();
              }}
              style={itemStyle(false)}
            >
              <i className="pi pi-plus" />
              <span style={{ flex: 1, textAlign: 'left' }}>Nuevo vault…</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setRenameId(null);
                window.dispatchEvent(
                  new CustomEvent('open-settings-tab', {
                    detail: { tab: 'security', subTab: 'vaults' }
                  })
                );
              }}
              style={itemStyle(false)}
            >
              <i className="pi pi-cog" />
              <span style={{ flex: 1, textAlign: 'left' }}>Gestionar vaults…</span>
            </button>
          </div>,
          document.body
        )}
    </>
  );
};

function itemStyle(selected) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 10px',
    border: 'none',
    borderRadius: 6,
    background: selected
      ? 'color-mix(in srgb, var(--primary-color, #89b4fa) 18%, transparent)'
      : 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: 12,
    boxSizing: 'border-box'
  };
}

export default VaultSelector;
