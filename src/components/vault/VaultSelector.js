import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { isMultiVaultEnabled } from '../../utils/multiVaultFlag';
import {
  DEFAULT_VAULT_ID,
  getActiveConnectionVaultId
} from '../../utils/activeConnectionVault';
import { listRegisteredExtraVaults } from '../../utils/extraConnectionVaults';
import vaultKeyring from '../../services/VaultKeyring';

/**
 * Selector de vault tipo Termius para la title bar.
 * El menú se renderiza en portal (la title bar tiene overflow:hidden).
 */
const VaultSelector = ({
  activeVaultId,
  onSelectVault,
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

  const currentId = activeVaultId || getActiveConnectionVaultId() || DEFAULT_VAULT_ID;
  const currentExtra = vaults.find((v) => v.id === currentId);
  const label =
    currentId === DEFAULT_VAULT_ID
      ? 'Principal'
      : currentExtra?.name || currentId;
  const locked =
    currentId !== DEFAULT_VAULT_ID && !vaultKeyring.isUnlocked(currentId);

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
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 240))
    });
    setOpen(true);
  };

  const handlePick = (vaultId) => {
    setOpen(false);
    if (vaultId === currentId) return;
    if (vaultId !== DEFAULT_VAULT_ID && !vaultKeyring.isUnlocked(vaultId)) {
      const meta = vaults.find((v) => v.id === vaultId);
      onRequestUnlock?.({
        id: vaultId,
        name: meta?.name || vaultId,
        icon: meta?.icon
      });
      return;
    }
    onSelectVault?.(vaultId);
  };

  const noDrag = {
    WebkitAppRegion: 'no-drag',
    appRegion: 'no-drag'
  };

  return (
    <>
      <div style={{ position: 'relative', marginLeft: 8, ...noDrag }}>
        <button
          ref={btnRef}
          type="button"
          title="Vault de conexiones"
          aria-haspopup="listbox"
          aria-expanded={open}
          onMouseDown={(e) => {
            // Evita que el drag de la title bar se coma el clic en Electron
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
            maxWidth: 160,
            ...noDrag
          }}
        >
          <i className={locked ? 'pi pi-lock' : 'pi pi-box'} style={{ fontSize: 11 }} />
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 110
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
            role="listbox"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              minWidth: 220,
              maxWidth: 280,
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
            <button
              type="button"
              role="option"
              aria-selected={currentId === DEFAULT_VAULT_ID}
              onClick={() => handlePick(DEFAULT_VAULT_ID)}
              style={itemStyle(currentId === DEFAULT_VAULT_ID)}
            >
              <i className="pi pi-home" />
              <span style={{ flex: 1, textAlign: 'left' }}>Principal</span>
            </button>

            {vaults.map((v) => {
              const isLocked = !vaultKeyring.isUnlocked(v.id);
              const selected = currentId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => handlePick(v.id)}
                  style={itemStyle(selected)}
                >
                  <i className={isLocked ? 'pi pi-lock' : 'pi pi-unlock'} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{v.name}</span>
                  {isLocked ? (
                    <span style={{ fontSize: 10, opacity: 0.65 }}>Bloqueado</span>
                  ) : null}
                </button>
              );
            })}

            <div style={{ height: 1, background: 'var(--surface-border)', margin: '4px 0' }} />
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
    background: selected ? 'var(--primary-color, #89b4fa)' : 'transparent',
    color: selected ? 'var(--primary-color-text, #111)' : 'inherit',
    cursor: 'pointer',
    fontSize: 12
  };
}

export default VaultSelector;
