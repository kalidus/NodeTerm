import React from 'react';

/**
 * NetworkToolHeader - Encabezado unificado para las herramientas de red
 */
const NetworkToolHeader = ({ tool, children, extraActions, isMobile = false }) => {
  const categoryColor = tool?.categoryColor || '#2196f3';
  const icon = tool?.icon || 'pi pi-cog';
  const label = tool?.label || '';
  const description = tool?.description || '';

  return (
    <div
      className="network-tool-header-container"
      style={{
        padding: '0.85rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        background: 'rgba(0,0,0,0.12)',
        flexShrink: 0
      }}
    >
      {/* Título, icono y descripción */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${categoryColor}30 0%, ${categoryColor}15 100%)`,
              border: `1px solid ${categoryColor}50`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <i className={icon} style={{ color: categoryColor, fontSize: '0.95rem' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {label}
            </h4>
            {!isMobile && description && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-color-secondary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {description}
              </span>
            )}
          </div>
        </div>
        {extraActions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {extraActions}
          </div>
        )}
      </div>

      {/* Controles de formulario / acciones */}
      {children && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default NetworkToolHeader;
