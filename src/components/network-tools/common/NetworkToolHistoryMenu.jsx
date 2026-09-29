import React, { useRef } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';

function formatWhen(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

const NetworkToolHistoryMenu = ({ items = [], onView, onRerun, onPin, onDelete }) => {
  const panelRef = useRef(null);

  return (
    <>
      <Button
        icon="pi pi-history"
        className="p-button-text p-button-sm p-button-secondary"
        tooltip="Historial"
        onClick={(e) => panelRef.current && panelRef.current.toggle(e)}
        style={{ padding: '0.35rem 0.5rem' }}
        badge={items.length ? String(items.length) : null}
        badgeClassName="p-badge-info"
      />
      <OverlayPanel ref={panelRef} className="app-surface" style={{ width: '340px', maxWidth: '92vw' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-color)' }}>
          Historial
        </div>
        {items.length === 0 ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', padding: '0.5rem 0' }}>
            Aun no hay escaneos. Se guardan solos al verificar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '360px', overflowY: 'auto' }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '0.45rem 0.5rem',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.4rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#fff',
                      wordBreak: 'break-all'
                    }}>
                      {item.pinned ? (
                        <i className="pi pi-bookmark" style={{ fontSize: '0.65rem', marginRight: '0.3rem', color: '#f59e0b' }} />
                      ) : null}
                      {item.target}
                    </div>
                    {item.summary && (
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.12rem' }}>
                        {item.summary}
                      </div>
                    )}
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.1rem' }}>
                      {formatWhen(item.createdAt)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.15rem', marginTop: '0.3rem' }}>
                  <Button
                    icon="pi pi-eye"
                    className="p-button-text p-button-sm p-button-secondary"
                    tooltip="Ver"
                    onClick={() => onView && onView(item)}
                    style={{ padding: '0.2rem 0.35rem', width: '1.7rem', height: '1.7rem' }}
                  />
                  <Button
                    icon="pi pi-replay"
                    className="p-button-text p-button-sm p-button-secondary"
                    tooltip="Repetir"
                    onClick={() => onRerun && onRerun(item)}
                    style={{ padding: '0.2rem 0.35rem', width: '1.7rem', height: '1.7rem' }}
                  />
                  <Button
                    icon="pi pi-bookmark"
                    className="p-button-text p-button-sm p-button-secondary"
                    tooltip={item.pinned ? 'Quitar fijo' : 'Fijar'}
                    onClick={() => onPin && onPin(item.id)}
                    style={{ padding: '0.2rem 0.35rem', width: '1.7rem', height: '1.7rem' }}
                  />
                  <Button
                    icon="pi pi-trash"
                    className="p-button-text p-button-sm p-button-secondary"
                    tooltip="Borrar"
                    onClick={() => onDelete && onDelete(item.id)}
                    style={{ padding: '0.2rem 0.35rem', width: '1.7rem', height: '1.7rem' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </OverlayPanel>
    </>
  );
};

export default NetworkToolHistoryMenu;
