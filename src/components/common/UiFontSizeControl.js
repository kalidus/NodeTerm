import React from 'react';
import { Slider } from 'primereact/slider';
import {
  UI_FONT_SIZE_DEFAULT,
  UI_FONT_SIZE_MAX,
  UI_FONT_SIZE_MIN,
  UI_FONT_SIZE_PRESETS,
  UI_FONT_SIZE_STEP,
  clampUiFontSize,
  formatUiFontSize
} from '../../utils/sidebarFontStack';

const UiFontSizeControl = ({
  value,
  onChange,
  label = 'Tamano interfaz',
  compact = false
}) => {
  const size = clampUiFontSize(value == null ? UI_FONT_SIZE_DEFAULT : value);

  const commit = (next) => {
    if (typeof onChange !== 'function') return;
    onChange(clampUiFontSize(next));
  };

  return (
    <div className={`ui-font-size-control${compact ? ' ui-font-size-control--compact' : ''}`}>
      <div className="theme-size-header-row">
        <span className="theme-size-header-label">
          <i className="pi pi-sliders-h" style={{ fontSize: '0.6875rem', opacity: 0.75, width: '0.6875rem', display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}></i>
          {label}
        </span>
        <div className="theme-size-stepper-pill" title="Ajuste fino de 0.5px por clic">
          <button
            type="button"
            className="theme-size-step-btn"
            onClick={() => commit(size - UI_FONT_SIZE_STEP)}
            title="Disminuir 0.5px"
            disabled={size <= UI_FONT_SIZE_MIN}
          >
            <i className="pi pi-minus" style={{ fontSize: '0.625rem' }}></i>
          </button>
          <span className="theme-size-value-badge">
            {formatUiFontSize(size)} px
          </span>
          <button
            type="button"
            className="theme-size-step-btn"
            onClick={() => commit(size + UI_FONT_SIZE_STEP)}
            title="Aumentar 0.5px"
            disabled={size >= UI_FONT_SIZE_MAX}
          >
            <i className="pi pi-plus" style={{ fontSize: '0.625rem' }}></i>
          </button>
        </div>
      </div>

      <div className="theme-size-track-container" title="Arrastra para ajustar (0.5px)">
        <Slider
          value={size}
          onChange={(e) => commit(e.value)}
          min={UI_FONT_SIZE_MIN}
          max={UI_FONT_SIZE_MAX}
          step={UI_FONT_SIZE_STEP}
          style={{ width: '100%' }}
        />
      </div>

      <div className="theme-size-presets">
        {UI_FONT_SIZE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`theme-size-chip ${Math.abs(size - preset) < 0.25 ? 'active' : ''}`}
            onClick={() => commit(preset)}
            title={`Fijar a ${preset}px`}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
};

export default UiFontSizeControl;
