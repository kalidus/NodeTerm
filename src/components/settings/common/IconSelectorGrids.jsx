import React, { useState, useRef, useEffect } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { TabView, TabPanel } from 'primereact/tabview';
import { Slider } from 'primereact/slider';
import { useTranslation } from '../../../i18n/hooks/useTranslation';
import { homeTabIcons, getHomeTabIconGroups } from '../../../themes/home-tab-icons';
import { groupTabIcons } from '../../../themes/group-tab-icons';

export const SmoothIconSlider = ({ connectionIconSize, setConnectionIconSize }) => {
  const [localSize, setLocalSize] = useState(connectionIconSize || 20);
  const timeoutRef = useRef(null);
  const isChangingRef = useRef(false);

  useEffect(() => {
    if (!isChangingRef.current) {
      setLocalSize(connectionIconSize || 20);
    }
  }, [connectionIconSize]);

  const updateGlobal = (val) => {
    if (setConnectionIconSize && val !== undefined && val !== null) {
      setConnectionIconSize(val);
    }
  };

  const handleChange = (e) => {
    const val = e.value;
    if (val === null || val === undefined) return;
    
    setLocalSize(val);
    isChangingRef.current = true;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      updateGlobal(val);
      isChangingRef.current = false;
    }, 100);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
      <Slider
        value={localSize}
        onChange={handleChange}
        min={12}
        max={32}
        step={1}
        style={{ flex: 1 }}
      />
      <span style={{ minWidth: '40px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>
        {localSize}px
      </span>
    </div>
  );
};

export const HomeIconSelectorGrid = ({ selected, onSelect }) => {
  const { t } = useTranslation('settings');
  const opRef = useRef(null);
  const groups = getHomeTabIconGroups();
  const [activeTab, setActiveTab] = useState(0);
  const openPanel = (e) => opRef.current?.toggle(e);
  const currentIcon = homeTabIcons[selected];

  return (
    <div className="home-icon-selector">
      <button
        type="button"
        onClick={openPanel}
        className="home-icon-expandable-badge"
      >
        <div className="home-icon-badge-content">
          {currentIcon?.icon(20)}
          <span className="home-icon-badge-name">{currentIcon?.name || t('common.selectIcon')}</span>
        </div>
        <i className="pi pi-chevron-down home-icon-badge-chevron"></i>
      </button>
      <OverlayPanel ref={opRef} showCloseIcon dismissable style={{ width: 420, maxWidth: '90vw' }} className="home-icon-overlay">
        <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--text-color-secondary)' }}>
          Selecciona una categoría
        </div>
        <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)} className="home-icon-tabs">
          {groups.map(group => (
            <TabPanel key={group.label} header={group.label}>
              <div className="home-icon-grid" style={{ paddingTop: 4 }}>
                {group.items.map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => { onSelect(item.value); opRef.current?.hide(); }}
                    className={`home-icon-grid-btn ${selected === item.value ? 'is-selected' : ''}`}
                    style={{ height: 44 }}
                    title={item.label}
                  >
                    <div style={{ transform: 'scale(1.0)' }}>{item.icon}</div>
                  </button>
                ))}
              </div>
            </TabPanel>
          ))}
        </TabView>
      </OverlayPanel>
    </div>
  );
};

export const GroupIconSelectorGrid = ({ selected, onSelect }) => {
  const { t } = useTranslation('settings');
  const opRef = useRef(null);
  const openPanel = (e) => opRef.current?.toggle(e);
  const iconOptions = Object.entries(groupTabIcons).map(([key, iconData]) => ({
    key,
    name: iconData.name,
    icon: iconData.icon(18)
  }));
  const currentIcon = groupTabIcons[selected];

  return (
    <div className="group-icon-selector">
      <button
        type="button"
        onClick={openPanel}
        className="group-icon-expandable-badge"
      >
        <div className="group-icon-badge-content">
          {currentIcon?.icon(20)}
          <span className="group-icon-badge-name">{currentIcon?.name || t('common.selectIcon')}</span>
        </div>
        <i className="pi pi-chevron-down group-icon-badge-chevron"></i>
      </button>
      <OverlayPanel ref={opRef} showCloseIcon dismissable
        className="group-icon-overlay"
        style={{ width: '300px' }}
      >
        <div className="group-icon-grid">
          {iconOptions.map((option) => (
            <button
              key={option.key}
              className={`group-icon-grid-btn ${selected === option.key ? 'is-selected' : ''}`}
              onClick={() => {
                onSelect(option.key);
                opRef.current?.hide();
              }}
              title={option.name}
            >
              {option.icon}
            </button>
          ))}
        </div>
      </OverlayPanel>
    </div>
  );
};
