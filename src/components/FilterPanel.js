import React, { useState, useEffect, useRef } from 'react';
import '../styles/components/filter-panel.css';

/**
 * FilterPanel - Dropdown panel con multi-selección de filtros
 * Inspirado en Linear, Notion y GitHub
 */
const FilterPanel = ({
    isOpen = false,
    onClose,
    activeFilters = { protocols: [], groups: [], states: [] },
    onApplyFilters,
    availableFilters = { protocols: [], groups: [] },
    themeColors = {},
    onCreateGroup,
    onDeleteGroup,
}) => {
    const panelRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [tempFilters, setTempFilters] = useState(activeFilters);
    const [expandedSections, setExpandedSections] = useState(['protocols', 'groups', 'states']);

    // Sincronizar tempFilters cuando cambian los activeFilters
    useEffect(() => {
        if (isOpen) {
            setTempFilters(activeFilters);
        }
    }, [isOpen, activeFilters]);

    // Cerrar al hacer click fuera
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                onClose();
            }
        };

        // Delay para evitar que el click que abre el panel lo cierre inmediatamente
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Cerrar con tecla Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const toggleSection = (sectionId) => {
        setExpandedSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    const toggleFilter = (category, filterId) => {
        setTempFilters(prev => {
            const current = prev[category] || [];
            const newFilters = current.includes(filterId)
                ? current.filter(id => id !== filterId)
                : [...current, filterId];
            return { ...prev, [category]: newFilters };
        });
    };

    const handleClearAll = () => {
        setTempFilters({ protocols: [], groups: [], states: [] });
    };

    const handleApply = () => {
        onApplyFilters(tempFilters);
        onClose();
    };

    const getTotalActiveCount = () => {
        return (tempFilters.protocols?.length || 0) +
            (tempFilters.groups?.length || 0) +
            (tempFilters.states?.length || 0);
    };

    // Filtrar por búsqueda
    const filterBySearch = (items) => {
        if (!searchQuery.trim()) return items;
        const query = searchQuery.toLowerCase();
        return items.filter(item =>
            item.label.toLowerCase().includes(query)
        );
    };

    if (!isOpen) return null;

    return (
        <div className={`filter-panel-overlay ${isOpen ? 'open' : ''}`}>
            <div className="filter-panel-container" ref={panelRef} style={{
                '--panel-bg': themeColors.cardBackground || 'rgba(16, 20, 28, 0.95)',
                '--panel-border': themeColors.borderColor || 'rgba(255, 255, 255, 0.1)',
                '--panel-text': themeColors.textPrimary || 'rgba(255, 255, 255, 0.9)',
                '--panel-text-secondary': themeColors.textSecondary || 'rgba(255, 255, 255, 0.6)',
                '--panel-hover': themeColors.hoverBackground || 'rgba(255, 255, 255, 0.05)',
            }}>
                {/* Header */}
                <div className="filter-panel-header">
                    <div className="filter-panel-title">
                        <i className="pi pi-filter" />
                        <h3>Filtros</h3>
                        {getTotalActiveCount() > 0 && (
                            <span className="filter-active-count">{getTotalActiveCount()}</span>
                        )}
                    </div>
                    <button
                        className="filter-panel-close"
                        onClick={onClose}
                        title="Cerrar (Esc)"
                    >
                        <i className="pi pi-times" />
                    </button>
                </div>

                {/* Search */}
                <div className="filter-search">
                    <i className="pi pi-search" />
                    <input
                        type="text"
                        placeholder="Buscar filtro..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    {searchQuery && (
                        <button
                            className="search-clear"
                            onClick={() => setSearchQuery('')}
                            title="Limpiar búsqueda"
                        >
                            <i className="pi pi-times" />
                        </button>
                    )}
                </div>

                {/* Sections */}
                <div className="filter-sections">
                    {/* PROTOCOLOS */}
                    <FilterSection
                        id="protocols"
                        title="PROTOCOLOS"
                        icon="pi-server"
                        expanded={expandedSections.includes('protocols')}
                        onToggle={() => toggleSection('protocols')}
                    >
                        {filterBySearch(availableFilters.protocols).map(filter => (
                            <FilterCheckbox
                                key={filter.id}
                                label={filter.label}
                                icon={filter.icon}
                                count={filter.count}
                                checked={tempFilters.protocols?.includes(filter.id)}
                                onChange={() => toggleFilter('protocols', filter.id)}
                                color={filter.color}
                            />
                        ))}
                    </FilterSection>

                    {/* GRUPOS PERSONALIZADOS */}
                    <FilterSection
                        id="groups"
                        title="GRUPOS PERSONALIZADOS"
                        icon="pi-folder"
                        expanded={expandedSections.includes('groups')}
                        onToggle={() => toggleSection('groups')}
                    >
                        {filterBySearch(availableFilters.groups).map(filter => (
                            <FilterCheckbox
                                key={filter.id}
                                label={filter.label}
                                icon={filter.icon}
                                count={filter.count}
                                checked={tempFilters.groups?.includes(filter.id)}
                                onChange={() => toggleFilter('groups', filter.id)}
                                color={filter.color}
                                onDelete={onDeleteGroup ? () => onDeleteGroup(filter.id) : undefined}
                            />
                        ))}
                        {availableFilters.groups.length === 0 && (
                            <div className="filter-empty-state">
                                <i className="pi pi-folder-open" />
                                <span>No hay grupos personalizados</span>
                            </div>
                        )}
                        <button
                            className="filter-add-group-btn"
                            onClick={() => {
                                onClose();
                                onCreateGroup?.();
                            }}
                        >
                            <i className="pi pi-plus" />
                            <span>Nuevo grupo</span>
                        </button>
                    </FilterSection>

                    {/* ESTADO */}
                    <FilterSection
                        id="states"
                        title="ESTADO"
                        icon="pi-check-circle"
                        expanded={expandedSections.includes('states')}
                        onToggle={() => toggleSection('states')}
                    >
                        <FilterCheckbox
                            label="Solo favoritos"
                            icon="pi-star"
                            checked={tempFilters.states?.includes('favorites')}
                            onChange={() => toggleFilter('states', 'favorites')}
                            color="#FFD700"
                        />
                        <FilterCheckbox
                            label="Conectados"
                            icon="pi-circle-fill"
                            checked={tempFilters.states?.includes('connected')}
                            onChange={() => toggleFilter('states', 'connected')}
                            color="#4CAF50"
                        />
                        <FilterCheckbox
                            label="Recientes (última semana)"
                            icon="pi-clock"
                            checked={tempFilters.states?.includes('recent')}
                            onChange={() => toggleFilter('states', 'recent')}
                            color="#2196F3"
                        />
                    </FilterSection>
                </div>

                {/* Footer */}
                <div className="filter-panel-footer">
                    <button
                        className="filter-footer-btn secondary"
                        onClick={handleClearAll}
                        disabled={getTotalActiveCount() === 0}
                    >
                        Limpiar todo
                    </button>
                    <button
                        className="filter-footer-btn primary"
                        onClick={handleApply}
                    >
                        <i className="pi pi-check" />
                        Aplicar
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * FilterSection - Sección colapsable del panel de filtros
 */
const FilterSection = ({ id, title, icon, expanded, onToggle, children }) => {
    return (
        <div className={`filter-section ${expanded ? 'expanded' : 'collapsed'}`}>
            <div className="filter-section-header" onClick={onToggle}>
                <i className={`pi ${icon} section-icon`} />
                <span className="section-title">{title}</span>
                <i className={`pi pi-chevron-${expanded ? 'up' : 'down'} section-chevron`} />
            </div>
            {expanded && (
                <div className="filter-section-content">
                    {children}
                </div>
            )}
        </div>
    );
};

/**
 * FilterCheckbox - Checkbox individual para un filtro
 */
const FilterCheckbox = ({ label, icon, count, checked, onChange, color, onDelete }) => {
    return (
        <div className="filter-checkbox-wrapper">
            <label className="filter-checkbox" style={{ '--filter-color': color }}>
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                />
                <div className="filter-checkbox-label">
                    {icon && <i className={`pi ${icon}`} style={{ color }} />}
                    <span>{label}</span>
                </div>
                {count !== undefined && (
                    <span className="filter-checkbox-count">{count}</span>
                )}
            </label>
            {onDelete && (
                <button
                    className="filter-checkbox-delete"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Confirm deletion? Since it's a destructive action inside a menu.
                        // Assuming the parent component handles confirmation or it's direct.
                        // User asked for "some way to delete".
                        onDelete();
                    }}
                    title="Eliminar grupo"
                >
                    <i className="pi pi-trash" />
                </button>
            )}
        </div>
    );
};

export default FilterPanel;
