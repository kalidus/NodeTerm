import React from 'react';

const ToolViewSwitch = ({ views, value, onChange, accent = '#f59e0b' }) => (
  <div style={{
    display: 'flex',
    gap: '0.4rem',
    padding: '0.45rem 0.75rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    flexWrap: 'wrap'
  }}
  >
    {views.map((view) => {
      const active = view.id === value;
      return (
        <button
          key={view.id}
          type="button"
          onClick={() => onChange(view.id)}
          style={{
            border: active ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            padding: '0.28rem 0.7rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            background: active ? `color-mix(in srgb, ${accent} 20%, transparent)` : 'transparent',
            color: active ? accent : 'var(--text-color-secondary)'
          }}
        >
          {view.label}
        </button>
      );
    })}
  </div>
);

export default ToolViewSwitch;
