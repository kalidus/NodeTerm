import React from 'react';
import { getOptionalHomeWidgetsByGroup } from '../../../../utils/homeWidgets';

export const HomeWidgetPicker = ({
  panelsLayout = {},
  onTogglePanel
}) => {
  const groups = getOptionalHomeWidgetsByGroup();

  return (
    <div className="home-picker-groups">
      {groups.map((group) => (
        <div key={group.id} className="home-picker-group">
          <div className="home-picker-group-label">{group.label}</div>
          <div className="home-picker">
            {group.widgets.map((widget) => {
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
        </div>
      ))}
    </div>
  );
};

export default HomeWidgetPicker;
