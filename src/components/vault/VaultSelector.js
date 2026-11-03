import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { isMultiVaultEnabled } from '../../utils/multiVaultFlag';
import {
  DEFAULT_VAULT_ID,
  getVisibleConnectionVaultIds
} from '../../utils/activeConnectionVault';
import { listRegisteredExtraVaults } from '../../utils/extraConnectionVaults';
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
  const [enabled, setEnabled] = useState(() => isMultiVaultEnabled());
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const refresh = useCallback(async () => {
    const on = isMultiVaultEnabled();
    setEnabled(on);
    if (!on) {
      setVaults([]);
      return;
    }
    const extras = await listRegisteredExtraVaults();
    setVaults(extras);
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
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!enabled) return null;

  const visible = Array.isArray(visibleVaultIds)
    ? visibleVaultIds
    : getVisibleConnectionVaultIds();
  const visibleSet = new Set(visible);

  const label = (() => {
    if (visible.length === 0) return 'Ninguno';
    if (visible.length === 1) {
      const id = visible[0];
      if (id === DEFAULT_VAULT_ID) return 'Principal';
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
      return;
    }
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 260))
    });
    setOpen(true);
  };

  const handleToggle = (vaultId, currentlyChecked) => {
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

  const noDrag = {
    WebkitAppRegion: 'no-drag',
    appRegion: 'no-drag'
  };

  const renderCheckRow = (vaultId, title, iconClass, isLocked) => {
    const checked = visibleSet.has(vaultId);
    return (
      <button
        key={vaultId}
        type="button"
        role="menuitemcheckbox"
        aria-checked={checked}
        onClick={() => handleToggle(vaultId, checked)}
        style={itemStyle(checked)}
      >
        <span
          aria-hidden
          style={{
            width: 16,
            height: 16,
            borderRadius: 3,
            border: checked
              ? '1px solid transparent'
              : '1px solid rgba(255,255,255,0.35)',
            background: checked
              ? 'var(--primary-color, #89b4fa)'
              : 'transparent',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
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
        <i className={iconClass} style={{ fontSize: 12, opacity: 0.9 }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
        {isLocked ? (
          <span style={{ fontSize: 10, opacity: 0.65 }}>Bloqueado</span>
        ) : null}
      </button>
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
              minWidth: 240,
              maxWidth: 300,
              background: 'var(--surface-overlay, #1e1e2e)',
              border: '1px solid var(--surface-border, #45475a)',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              zIndex: 100000,
              padding: 4,
              color: 'var(--text-color, #cdd6f4)',
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

            {renderCheckRow(DEFAULT_VAULT_ID, 'Principal', 'pi pi-home', false)}

            {vaults.map((v) => {
              const isLocked = !vaultKeyring.isUnlocked(v.id);
              return renderCheckRow(
                v.id,
                v.name,
                isLocked ? 'pi pi-lock' : 'pi pi-unlock',
                isLocked
              );
            })}

            <div
              style={{
                height: 1,
                background: 'var(--surface-border)',
                margin: '4px 0'
              }}
            />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
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
    background: selected ? 'rgba(137, 180, 250, 0.12)' : 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: 12
  };
}

export default VaultSelector;
