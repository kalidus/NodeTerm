import React from 'react';
import '../styles/components/filter-panel.css';

/**
 * FilterBadge - Badge compacto que muestra un filtro activo
 * con botón para quitarlo rápidamente
 */
const FilterBadge = ({
    label,
    color = '#4fc3f7',
    icon,
    onRemove,
    type = 'default', // 'default', 'protocol', 'group', 'state'
}) => {
    return (
        <div
            className={`filter-badge filter-badge--${type}`}
            style={{
                '--badge-color': color,
                '--badge-bg': `${color}15`,
                '--badge-border': `${color}40`,
            }}
        >
            {icon && (
                <i className={`pi ${icon} filter-badge-icon`} style={{ color }} />
            )}
            <span className="filter-badge-label">{label}</span>
            <button
                className="filter-badge-remove"
                onClick={onRemove}
                title={`Quitar filtro: ${label}`}
            >
                <i className="pi pi-times" />
            </button>
        </div>
    );
};

export default FilterBadge;
