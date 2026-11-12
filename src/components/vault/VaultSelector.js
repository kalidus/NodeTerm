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
import VaultSafeIcon from './VaultSafeIcon';

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
    const menuWidth = 280;
    setMenuPos({
      top: rect.bottom + 6,
      left: Math.max(
        8,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)
      )
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

  const renderCheckRow = (vaultId, title, isLocked, canLock) => {
    const checked = visibleSet.has(vaultId);
    const isEditing = renameId === vaultId;
    const rowClass = [
      'title-bar-vault-menu-row',
      isEditing ? 'is-editing' : '',
      isLocked ? 'is-locked' : ''
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        key={vaultId}
        role="menuitemcheckbox"
        aria-checked={checked}
        className={rowClass}
        onClick={() => {
          if (!isEditing) handleToggle(vaultId, checked);
        }}
      >
        <span className="title-bar-vault-menu-glyph" aria-hidden>
          <VaultSafeIcon size={16} />
        </span>

        {isEditing ? (
          <input
            ref={renameInputRef}
            className="title-bar-vault-menu-input"
            value={renameValue}
            disabled={renaming}
            onChange={(e) => setRenameValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commitRename(e, vaultId);
              if (e.key === 'Escape') cancelRename(e);
            }}
          />
        ) : (
          <span className="title-bar-vault-menu-label">{title}</span>
        )}

        {isEditing ? (
          <>
            <button
              type="button"
              title="Guardar"
              aria-label="Guardar nombre"
              disabled={renaming || !String(renameValue || '').trim()}
              onClick={(e) => commitRename(e, vaultId)}
              className="title-bar-vault-menu-icon-btn"
            >
              <i className="pi pi-check" />
            </button>
            <button
              type="button"
              title="Cancelar"
              aria-label="Cancelar edición"
              disabled={renaming}
              onClick={cancelRename}
              className="title-bar-vault-menu-icon-btn"
            >
              <i className="pi pi-times" />
            </button>
          </>
        ) : (
          <>
            {canLock && isLocked ? (
              <button
                type="button"
                title="Desbloquear"
                aria-label={`Desbloquear ${title}`}
                onClick={(e) => handleUnlock(e, vaultId)}
                className="title-bar-vault-menu-icon-btn is-lock"
              >
                <i className="pi pi-lock" />
              </button>
            ) : null}
            <span className="title-bar-vault-menu-hover-actions">
              {canLock && !isLocked ? (
                <button
                  type="button"
                  title="Bloquear"
                  aria-label={`Bloquear ${title}`}
                  onClick={(e) => handleLock(e, vaultId)}
                  className="title-bar-vault-menu-icon-btn"
                >
                  <i className="pi pi-unlock" />
                </button>
              ) : null}
              <button
                type="button"
                title="Renombrar"
                aria-label={`Renombrar ${title}`}
                onClick={(e) => startRename(e, vaultId, title)}
                className="title-bar-vault-menu-icon-btn"
              >
                <i className="pi pi-pencil" />
              </button>
            </span>
          </>
        )}

        <span
          aria-hidden
          className={
            checked
              ? 'title-bar-vault-menu-check is-on'
              : 'title-bar-vault-menu-check'
          }
        >
          {checked ? <i className="pi pi-check" /> : null}
        </span>
      </div>
    );
  };

  const chipClassName = [
    'title-bar-icon-btn',
    'title-bar-vault-selector',
    open ? 'is-active' : '',
    anyLocked ? 'is-locked' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className="title-bar-action-group">
        <button
          ref={btnRef}
          type="button"
          className={chipClassName}
          title={`Vaults visibles: ${label}`}
          aria-label={`Vaults visibles: ${label}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={openMenu}
          style={noDrag}
        >
          <VaultSafeIcon size={18} />
        </button>
      </div>
      <div className="title-bar-action-sep" aria-hidden="true" />

      {open &&
        ReactDOM.createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="title-bar-vault-menu"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              ...noDrag
            }}
          >
            {renderCheckRow(DEFAULT_VAULT_ID, defaultVaultName, false, false)}

            {vaults.map((v) => {
              const isLocked = !vaultKeyring.isUnlocked(v.id);
              return renderCheckRow(v.id, v.name, isLocked, true);
            })}

            <div className="title-bar-vault-menu-sep" />
            <button
              type="button"
              className="title-bar-vault-menu-row title-bar-vault-menu-action"
              onClick={() => {
                setOpen(false);
                setRenameId(null);
                onRequestCreate?.();
              }}
            >
              <i className="pi pi-plus" />
              <span>Nuevo vault…</span>
            </button>
            <button
              type="button"
              className="title-bar-vault-menu-row title-bar-vault-menu-action"
              onClick={() => {
                setOpen(false);
                setRenameId(null);
                window.dispatchEvent(
                  new CustomEvent('open-settings-tab', {
                    detail: { tab: 'security', subTab: 'vaults' }
                  })
                );
              }}
            >
              <i className="pi pi-cog" />
              <span>Gestionar vaults…</span>
            </button>
          </div>,
          document.body
        )}
    </>
  );
};

export default VaultSelector;
