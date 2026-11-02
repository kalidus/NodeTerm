import React, { useMemo } from 'react';
import { uiThemes } from '../themes/ui-themes';
import '../styles/components/preset-style-option.css';

const FALLBACK_COLORS = {
  menuBarBackground: '#1a1d24',
  sidebarBackground: '#161b22',
  sidebarSelected: '#243044',
  tabBackground: '#1a1d24',
  tabActiveBackground: '#0e1116',
  contentBackground: '#0e1116',
  buttonPrimary: '#6366f1',
  statusBarBackground: '#111827',
  dialogText: '#e6edf3',
};

function resolvePresetColors(preset) {
  const themeName = preset?.settings?.ui_theme;
  const theme = themeName ? uiThemes[themeName] : null;
  if (!theme?.colors) return FALLBACK_COLORS;
  return { ...FALLBACK_COLORS, ...theme.colors };
}

function PresetColorPreview({ colors }) {
  return (
    <div className="preset-style-preview" aria-hidden="true">
      <div
        className="preset-style-preview__bar"
        style={{ background: colors.menuBarBackground }}
      >
        <span style={{ background: colors.buttonPrimary }} />
        <span style={{ background: colors.buttonPrimary, opacity: 0.55 }} />
        <span style={{ background: colors.buttonPrimary, opacity: 0.3 }} />
      </div>
      <div className="preset-style-preview__body">
        <div
          className="preset-style-preview__side"
          style={{ background: colors.sidebarBackground }}
        >
          <span style={{ background: colors.sidebarSelected || colors.buttonPrimary }} />
          <span style={{ background: 'rgba(255,255,255,0.18)' }} />
          <span style={{ background: 'rgba(255,255,255,0.12)' }} />
        </div>
        <div className="preset-style-preview__main">
          <div
            className="preset-style-preview__tabs"
            style={{ background: colors.tabBackground }}
          >
            <span style={{ background: colors.tabActiveBackground || colors.contentBackground }} />
          </div>
          <div
            className="preset-style-preview__content"
            style={{ background: colors.contentBackground, color: colors.buttonPrimary }}
          >
            <i>$</i>
            <em style={{ background: colors.buttonPrimary }} />
          </div>
        </div>
      </div>
      <div
        className="preset-style-preview__status"
        style={{ background: colors.statusBarBackground }}
      >
        <span style={{ background: colors.buttonPrimary }} />
        <span style={{ background: 'rgba(255,255,255,0.2)' }} />
      </div>
      <div className="preset-style-preview__strip">
        <span style={{ background: colors.sidebarBackground }} />
        <span style={{ background: colors.contentBackground }} />
        <span style={{ background: colors.buttonPrimary }} />
        <span style={{ background: colors.statusBarBackground }} />
        <span style={{ background: colors.tabBackground || colors.menuBarBackground }} />
      </div>
    </div>
  );
}

export default function PresetStyleOption({ preset, selected = false, onSelect }) {
  const colors = useMemo(() => resolvePresetColors(preset), [preset]);

  if (!preset) return null;

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      title={preset.description || preset.name}
      className={`preset-style-option${selected ? ' is-selected' : ''}`}
      onClick={() => {
        if (typeof onSelect === 'function') onSelect(preset);
      }}
    >
      <PresetColorPreview colors={colors} />
      <span className="preset-style-option-label">{preset.name}</span>
    </button>
  );
}
