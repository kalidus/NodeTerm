import React from 'react';
import ReactDOM from 'react-dom';

/**
 * Modal portal de la papelera de conexiones.
 */
export default function SidebarTrashModal({
  visible,
  onClose,
  trashedConnections,
  trashConfirm,
  setTrashConfirm,
  executeTrashConfirm,
  emptyTrash,
  restoreFromTrash,
  deleteFromTrashPermanently,
}) {
  if (!visible) return null;

  return ReactDOM.createPortal(
    <div
      className="app-dialog-portal-mask"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes trashModalIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        .trash-item-row { transition: background 0.15s ease; }
        .trash-item-row:hover { background: rgba(255,255,255,0.06) !important; }
        .trash-restore-btn:hover { background: rgba(34,197,94,0.22) !important; }
        .trash-delete-btn:hover { background: rgba(239,68,68,0.22) !important; }
        .trash-empty-btn:hover { background: rgba(239,68,68,0.25) !important; }
      `}</style>
      <div className="app-dialog app-dialog-portal" style={{ width: '460px', maxHeight: '560px' }}>
        <div className="app-dialog-portal-header">
          <div className="app-dialog-header">
            <span className="app-dialog-header-icon" aria-hidden="true"><i className="pi pi-trash" /></span>
            <div className="app-dialog-header-text">
              <span className="app-dialog-header-title">Papelera de conexiones</span>
              <span className="app-dialog-header-subtitle">
                {trashedConnections.length === 0 ? 'Vacía' : `${trashedConnections.length} elemento${trashedConnections.length !== 1 ? 's' : ''} • Se pueden restaurar`}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="app-dialog-portal-close"
            onClick={onClose}
            title="Cerrar"
          >
            <i className="pi pi-times" />
          </button>
        </div>

        {trashConfirm && (
          <div style={{
            margin: '0', padding: '12px 16px',
            background: 'rgba(239,68,68,0.12)',
            borderBottom: '1px solid rgba(239,68,68,0.25)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <i className="pi pi-exclamation-triangle" style={{ color: '#f87171', fontSize: '14px', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '12px', color: '#fca5a5', lineHeight: 1.4 }}>
              {trashConfirm.type === 'empty'
                ? '¿Vaciar toda la papelera? No se puede deshacer.'
                : `¿Eliminar permanentemente «${trashConfirm.label}»?`
              }
            </span>
            <button
              onClick={executeTrashConfirm}
              style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}
            >
              Confirmar
            </button>
            <button
              onClick={() => setTrashConfirm(null)}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '7px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}
            >
              Cancelar
            </button>
          </div>
        )}

        {trashedConnections.length > 0 && (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)' }}>
            <span style={{ fontSize: '11px', color: '#475569' }}>Haz clic en «Restaurar» para recuperar un elemento</span>
            <button
              className="trash-empty-btn"
              onClick={emptyTrash}
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
            >
              <i className="pi pi-trash" style={{ fontSize: '10px' }} /> Vaciar todo
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {trashedConnections.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <i className="pi pi-check" style={{ fontSize: '24px', color: '#4ade80' }} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Papelera vacía</div>
              <div style={{ fontSize: '12px', color: '#475569' }}>Los elementos eliminados aparecerán aquí</div>
            </div>
          ) : (
            trashedConnections.map((item, idx) => (
              <div
                key={item.id}
                className="trash-item-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 16px',
                  borderBottom: idx < trashedConnections.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                  background: 'rgba(100,116,139,0.15)',
                  border: '1px solid rgba(100,116,139,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className="pi pi-server" style={{ color: '#64748b', fontSize: '13px' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="pi pi-clock" style={{ fontSize: '9px' }} />
                    {new Date(item.deletedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    className="trash-restore-btn"
                    onClick={() => restoreFromTrash(item.id)}
                    title="Restaurar al árbol"
                    style={{
                      background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
                      color: '#4ade80', borderRadius: '7px', padding: '5px 10px',
                      fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600,
                    }}
                  >
                    <i className="pi pi-undo" style={{ fontSize: '10px' }} /> Restaurar
                  </button>
                  <button
                    className="trash-delete-btn"
                    onClick={() => deleteFromTrashPermanently(item.id, item.label)}
                    title="Eliminar permanentemente"
                    style={{
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)',
                      color: '#f87171', borderRadius: '7px', padding: '5px 8px',
                      fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    }}
                  >
                    <i className="pi pi-times" style={{ fontSize: '10px' }} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
