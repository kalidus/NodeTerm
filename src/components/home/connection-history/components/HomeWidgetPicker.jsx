import React from 'react';
import { getOptionalHomeWidgets } from '../../../../utils/homeWidgets';

export const HomeWidgetPicker = ({
  panelsLayout = {},
  onTogglePanel
}) => {
  const widgets = getOptionalHomeWidgets();

  return (
    <div className="home-picker">
      {widgets.map((widget) => {
        const on = !!panelsLayout?.[widget.id]?.visible;
        return (
          <button
            key={widget.id}
            type="button"
            className={`home-picker-item${on ? ' is-on' : ''}`}
            onClick={() => onTogglePanel?.(widget.id, !on)}
            title={on ? 'Ocultar panel' : 'Mostrar panel'}
          >
            <i className={widget.icon} />
            <span>{widget.title}</span>
          </button>
        );
      })}
    </div>
  );
};

export default HomeWidgetPicker;
