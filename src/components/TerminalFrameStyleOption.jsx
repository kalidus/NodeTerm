import React from 'react';
import '../styles/components/terminal-frame-style-option.css';

function FramePreviewChrome({ style }) {
  if (style.id === 'default') {
    return (
      <>
        <div className="frame-preview-bar" />
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          {(style.icons || ['pi-minus', 'pi-stop', 'pi-times']).map((ico, i) => (
            <i key={i} className={`pi ${ico}`} style={{ fontSize: '6px', opacity: 0.55 }} />
          ))}
        </div>
      </>
    );
  }

  if (style.id === 'macos') {
    return (
      <>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {style.dots.map((c, i) => (
            <div key={i} className="frame-preview-dot" style={{ background: c }} />
          ))}
        </div>
        <div className="frame-preview-bar" />
      </>
    );
  }

  if (style.noButtons) {
    return <div className="frame-preview-bar" />;
  }

  if (style.frameless) {
    return (
      <>
        <div className="frame-preview-bar" style={{ borderTopStyle: 'dashed' }} />
        <span style={{ fontSize: '7px', color: '#fff', fontWeight: 'bold', fontFamily: 'monospace' }}>∅</span>
      </>
    );
  }

  return (
    <>
      <div className="frame-preview-bar" />
      {style.dots ? (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          {style.dots.map((c, i) => (
            <div
              key={i}
              className="frame-preview-dot"
              style={{ background: c, boxShadow: style.synthwave ? `0 0 3px ${c}` : undefined }}
            />
          ))}
        </div>
      ) : style.switch ? (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <div className="frame-preview-dot" style={{ background: '#0f0', opacity: 0.4 }} />
          <div className="frame-preview-dot" style={{ background: '#0f0', opacity: 0.7 }} />
          <div className="frame-preview-dot" style={{ background: '#0f0', boxShadow: '0 0 4px #0f0' }} />
        </div>
      ) : style.hud ? (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <span style={{ fontSize: '6px', color: style.color || '#00e5ff', lineHeight: 1 }}>—</span>
          <span style={{ fontSize: '7px', color: style.color || '#00e5ff', lineHeight: 1 }}>◈</span>
          <span style={{ fontSize: '6px', color: style.color || '#00e5ff', lineHeight: 1 }}>✕</span>
        </div>
      ) : style.tag ? (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '5px',
              color: '#000',
              background: style.color,
              padding: '0 1px',
              borderRadius: '1px',
              fontWeight: 'bold'
            }}
          >
            {style.tag}
          </span>
          <span style={{ fontSize: '5px', color: style.color || '#fcee0a', lineHeight: 1 }}>_</span>
          <span style={{ fontSize: '5px', color: style.color || '#fcee0a', lineHeight: 1 }}>⬡</span>
          <span style={{ fontSize: '5px', color: style.color || '#fcee0a', lineHeight: 1 }}>✕</span>
        </div>
      ) : style.matrix ? (
        <div
          style={{
            display: 'flex',
            gap: '1px',
            alignItems: 'center',
            fontSize: '5px',
            color: style.color || '#00ff66',
            fontFamily: 'monospace'
          }}
        >
          <span>01</span>
          <span>10</span>
          <span>11</span>
        </div>
      ) : style.futuristic ? (
        <div
          style={{
            display: 'flex',
            gap: '2px',
            alignItems: 'center',
            fontSize: '5px',
            color: style.color || '#00f2ff'
          }}
        >
          <span>-</span>
          <span>□</span>
          <span>✕</span>
        </div>
      ) : style.stealth ? (
        <div
          style={{
            display: 'flex',
            gap: '2px',
            alignItems: 'center',
            fontSize: '6px',
            color: style.color || '#ff6b00'
          }}
        >
          <span>—</span>
          <span>□</span>
          <span>✕</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          {(style.icons || [style.icon || 'pi-times']).map((ico, i) => (
            <i key={i} className={`pi ${ico}`} style={{ fontSize: '6px', opacity: 0.6 }} />
          ))}
        </div>
      )}
    </>
  );
}

export default function TerminalFrameStyleOption({ style, selected = false, onSelect, as = 'button' }) {
  if (!style) return null;

  const previewStyle = {
    borderColor: style.frameless ? 'rgba(255,255,255,0.25)' : (style.color || 'rgba(255,255,255,0.1)'),
    borderStyle: style.frameless ? 'dashed' : 'solid',
    borderTop: style.line
      ? `2px solid ${style.line}`
      : (style.cyberBorder ? '2px solid #fcee0a' : undefined),
    borderRadius: style.rounded ? '8px' : (style.frameless ? '2px' : '4px'),
    background: style.aurora
      ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(20,184,166,0.25))'
      : undefined,
    boxShadow: style.hud
      ? `0 0 6px ${style.color || 'rgba(0,229,255,0.4)'}`
      : (style.synthwave ? `0 0 6px ${style.glow || 'rgba(217,70,239,0.5)'}` : undefined)
  };

  const className = `frame-style-option${selected ? ' active is-selected' : ''}`;
  const handleClick = () => {
    if (typeof onSelect === 'function') onSelect(style.id);
  };

  const content = (
    <>
      <div className="frame-preview" style={previewStyle}>
        <FramePreviewChrome style={style} />
      </div>
      <span className="frame-style-option-label">{style.label}</span>
    </>
  );

  if (as === 'div') {
    return (
      <div
        role="menuitemradio"
        aria-checked={selected}
        className={className}
        onClick={handleClick}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      className={className}
      onClick={handleClick}
    >
      {content}
    </button>
  );
}
