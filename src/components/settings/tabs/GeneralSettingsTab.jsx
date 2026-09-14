import React, { useState, useEffect, useRef } from 'react';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { useTranslation } from '../../../i18n/hooks/useTranslation';
import { STORAGE_KEYS } from '../../../utils/constants';
import { persistSyncedSetting } from '../../../utils/persistSyncedSetting';
import {
  getConnectionSearchShortcut,
  setConnectionSearchShortcut,
  resetConnectionSearchShortcut,
  formatShortcutLabel,
  shortcutFromKeyboardEvent,
  isValidShortcut,
} from '../../../utils/keyboardShortcuts';
import { setHomeTabIcon } from '../../../themes/home-tab-icons';
import { setGroupTabIcon } from '../../../themes/group-tab-icons';
import { HomeIconSelectorGrid, GroupIconSelectorGrid } from '../common/IconSelectorGrids';

const INTERACTIVE_ICON_STORAGE_KEY = 'nodeterm_interactive_icon';

const GeneralSettingsTab = ({
  contentHeight,
  defaultLocalTerminal,
  defaultTerminalOptions = [],
  terminalOptionsReady = true,
  onDefaultTerminalChange
}) => {
  const { t, locale, setLocale, availableLocales } = useTranslation('settings');

  // Estados de comportamiento
  const [lockHomeButton, setLockHomeButton] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOCK_HOME_BUTTON);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [interactiveIcon, setInteractiveIcon] = useState(() => {
    try {
      const saved = localStorage.getItem(INTERACTIVE_ICON_STORAGE_KEY);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [sidebarStartCollapsed, setSidebarStartCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_START_COLLAPSED);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [mainFrameHeaderStartCollapsed, setMainFrameHeaderCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  const sidebarStartCollapsedUserChangeRef = useRef(false);

  // Atajo de teclado para buscar conexiones
  const [connectionSearchShortcut, setConnectionSearchShortcutState] = useState(() => getConnectionSearchShortcut());
  const [isCapturingConnectionSearchShortcut, setIsCapturingConnectionSearchShortcut] = useState(false);
  const connectionSearchShortcutInputRef = useRef(null);

  // Iconos de Home y Grupos
  const [selectedHomeIcon, setSelectedHomeIcon] = useState(() => {
    return localStorage.getItem('nodeterm_home_tab_icon') || 'home';
  });

  const [selectedGroupIcon, setSelectedGroupIcon] = useState(() => {
    return localStorage.getItem('nodeterm_group_tab_icon') || 'folder';
  });

  // Guardar lockHomeButton
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCK_HOME_BUTTON, JSON.stringify(lockHomeButton));
      persistSyncedSetting(STORAGE_KEYS.LOCK_HOME_BUTTON, lockHomeButton);
      window.dispatchEvent(new CustomEvent('lock-home-button-changed', {
        detail: { locked: lockHomeButton }
      }));
    } catch (e) {
      console.warn('Error saving lockHomeButton:', e);
    }
  }, [lockHomeButton]);

  // Guardar interactiveIcon
  useEffect(() => {
    try {
      localStorage.setItem(INTERACTIVE_ICON_STORAGE_KEY, JSON.stringify(interactiveIcon));
      persistSyncedSetting(INTERACTIVE_ICON_STORAGE_KEY, interactiveIcon);
      window.dispatchEvent(new CustomEvent('interactive-icon-changed', {
        detail: { interactive: interactiveIcon }
      }));
    } catch (e) {
      console.warn('Error saving interactiveIcon:', e);
    }
  }, [interactiveIcon]);

  // Guardar sidebarStartCollapsed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_START_COLLAPSED, JSON.stringify(sidebarStartCollapsed));
      persistSyncedSetting(STORAGE_KEYS.SIDEBAR_START_COLLAPSED, sidebarStartCollapsed);
      if (sidebarStartCollapsedUserChangeRef.current) {
        window.dispatchEvent(new CustomEvent('sidebar-collapsed-changed', {
          detail: { collapsed: sidebarStartCollapsed }
        }));
      }
    } catch (e) {
      console.warn('Error saving sidebarStartCollapsed:', e);
    }
  }, [sidebarStartCollapsed]);

  // Guardar mainFrameHeaderStartCollapsed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED, mainFrameHeaderStartCollapsed.toString());
      persistSyncedSetting(STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED, mainFrameHeaderStartCollapsed.toString());
      window.dispatchEvent(new CustomEvent('main-frame-header-collapsed-changed', {
        detail: { collapsed: mainFrameHeaderStartCollapsed }
      }));
    } catch (e) {
      console.warn('Error saving mainFrameHeaderStartCollapsed:', e);
    }
  }, [mainFrameHeaderStartCollapsed]);

  // Guardar iconos seleccionados
  useEffect(() => {
    setHomeTabIcon(selectedHomeIcon);
  }, [selectedHomeIcon]);

  useEffect(() => {
    setGroupTabIcon(selectedGroupIcon);
  }, [selectedGroupIcon]);

  // Escuchar eventos externos de sincronización
  useEffect(() => {
    const reloadBehaviorFromStorage = () => {
      try {
        const lock = localStorage.getItem(STORAGE_KEYS.LOCK_HOME_BUTTON);
        if (lock !== null) {
          try {
            setLockHomeButton(JSON.parse(lock));
          } catch {
            setLockHomeButton(lock === 'true');
          }
        }
        const icon = localStorage.getItem(INTERACTIVE_ICON_STORAGE_KEY);
        if (icon !== null) setInteractiveIcon(JSON.parse(icon));
        const sidebar = localStorage.getItem(STORAGE_KEYS.SIDEBAR_START_COLLAPSED);
        if (sidebar !== null) setSidebarStartCollapsed(JSON.parse(sidebar));
        const header = localStorage.getItem(STORAGE_KEYS.MAIN_FRAME_HEADER_START_COLLAPSED);
        if (header !== null) setMainFrameHeaderCollapsed(header === 'true');
        setConnectionSearchShortcutState(getConnectionSearchShortcut());
      } catch {
        /* noop */
      }
    };
    window.addEventListener('localstorage-sync-ready', reloadBehaviorFromStorage);
    window.addEventListener('settings-updated', reloadBehaviorFromStorage);
    return () => {
      window.removeEventListener('localstorage-sync-ready', reloadBehaviorFromStorage);
      window.removeEventListener('settings-updated', reloadBehaviorFromStorage);
    };
  }, []);

  // Captura de atajos de teclado
  const startConnectionSearchShortcutCapture = () => {
    setIsCapturingConnectionSearchShortcut(true);
    setTimeout(() => {
      connectionSearchShortcutInputRef.current?.focus();
    }, 0);
  };

  const handleResetConnectionSearchShortcut = () => {
    const defaultShortcut = resetConnectionSearchShortcut();
    setConnectionSearchShortcutState(defaultShortcut);
    setIsCapturingConnectionSearchShortcut(false);
  };

  useEffect(() => {
    if (!isCapturingConnectionSearchShortcut) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setIsCapturingConnectionSearchShortcut(false);
        return;
      }

      const parsed = shortcutFromKeyboardEvent(e);
      if (!parsed || !isValidShortcut(parsed)) return;

      setConnectionSearchShortcut(parsed);
      setConnectionSearchShortcutState(parsed);
      setIsCapturingConnectionSearchShortcut(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isCapturingConnectionSearchShortcut]);

  return (
    <div className="settings-tab-outer-wrapper" style={{ height: `${contentHeight}px`, maxHeight: `${contentHeight}px`, minHeight: `${contentHeight}px`, overflow: 'hidden', position: 'relative' }}>
      <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: '8px', bottom: 0, width: 'calc(100% - 8px)' }}>
        {/* Header */}
        <div className="general-settings-header-wrapper" style={{ flexShrink: 0 }}>
          <div className="general-header-content">
            <span className="general-header-icon protocol-dialog-header-icon">
              <i className="pi pi-sliders-h"></i>
            </span>
            <div className="general-header-text">
              <h3 className="general-header">{t('general.title')}</h3>
              <p className="general-description">{t('description')}</p>
            </div>
          </div>
        </div>

        {/* Grid de 2 columnas para las secciones */}
        <div className="general-settings-content">
          {/* Columna Izquierda: Comportamiento */}
          <div className="general-settings-column">
            <div className="general-settings-section">
              <div className="general-section-header">
                <div className="general-section-icon">
                  <i className="pi pi-sliders-h"></i>
                </div>
                <h4 className="general-section-title">{t('general.sections.behavior.title')}</h4>
              </div>

              <div className="general-settings-options">
                <div className="general-setting-card" onClick={() => setLockHomeButton(!lockHomeButton)}>
                  <div className="general-setting-content">
                    <div className="general-setting-icon lock">
                      <i className="pi pi-lock"></i>
                    </div>
                    <div className="general-setting-info">
                      <label htmlFor="lock-home-button" className="general-setting-label">
                        {t('general.sections.behavior.lockHomeButton.label')}
                      </label>
                      <p className="general-setting-description">
                        {t('general.sections.behavior.lockHomeButton.description')}
                      </p>
                    </div>
                    <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        id="lock-home-button"
                        checked={lockHomeButton}
                        onChange={(e) => setLockHomeButton(e.checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="general-setting-card" onClick={() => setInteractiveIcon(!interactiveIcon)}>
                  <div className="general-setting-content">
                    <div className="general-setting-icon bolt">
                      <i className="pi pi-bolt"></i>
                    </div>
                    <div className="general-setting-info">
                      <label htmlFor="interactive-icon" className="general-setting-label">
                        {t('general.sections.behavior.interactiveIcon.label')}
                      </label>
                      <p className="general-setting-description">
                        {t('general.sections.behavior.interactiveIcon.description')}
                      </p>
                    </div>
                    <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        id="interactive-icon"
                        checked={interactiveIcon}
                        onChange={(e) => setInteractiveIcon(e.checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="general-setting-card" onClick={() => {
                  sidebarStartCollapsedUserChangeRef.current = true;
                  setSidebarStartCollapsed(!sidebarStartCollapsed);
                }}>
                  <div className="general-setting-content">
                    <div className="general-setting-icon collapse">
                      <i className="pi pi-angle-left"></i>
                    </div>
                    <div className="general-setting-info">
                      <label htmlFor="sidebar-start-collapsed" className="general-setting-label">
                        {t('general.sections.behavior.sidebarStartCollapsed.label')}
                      </label>
                      <p className="general-setting-description">
                        {t('general.sections.behavior.sidebarStartCollapsed.description')}
                      </p>
                    </div>
                    <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        id="sidebar-start-collapsed"
                        checked={sidebarStartCollapsed}
                        onChange={(e) => {
                          sidebarStartCollapsedUserChangeRef.current = true;
                          setSidebarStartCollapsed(e.checked);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="general-setting-card" onClick={() => setMainFrameHeaderCollapsed(!mainFrameHeaderStartCollapsed)}>
                  <div className="general-setting-content">
                    <div className="general-setting-icon">
                      <i className="pi pi-window-maximize"></i>
                    </div>
                    <div className="general-setting-info">
                      <label htmlFor="main-frame-header-start-collapsed" className="general-setting-label">
                        {t('general.sections.behavior.mainFrameHeaderStartCollapsed.label')}
                      </label>
                      <p className="general-setting-description">
                        {t('general.sections.behavior.mainFrameHeaderStartCollapsed.description')}
                      </p>
                    </div>
                    <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        id="main-frame-header-start-collapsed"
                        checked={mainFrameHeaderStartCollapsed}
                        onChange={(e) => setMainFrameHeaderCollapsed(e.checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="general-setting-card general-setting-card--shortcut">
                  <div className="general-setting-content general-setting-content--shortcut">
                    <div className="general-setting-icon">
                      <i className="pi pi-search"></i>
                    </div>
                    <div className="general-setting-info">
                      <label htmlFor="connection-search-shortcut" className="general-setting-label">
                        {t('general.sections.behavior.connectionSearchShortcut.label')}
                      </label>
                      <p className="general-setting-description">
                        {t('general.sections.behavior.connectionSearchShortcut.description')}
                      </p>
                      <p className="general-setting-description general-setting-hint">
                        {t('general.sections.behavior.connectionSearchShortcut.hint')}
                      </p>
                    </div>
                    <div
                      className="general-setting-control general-setting-control--shortcut"
                      data-capturing-shortcut={isCapturingConnectionSearchShortcut ? 'true' : 'false'}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <InputText
                        id="connection-search-shortcut"
                        ref={connectionSearchShortcutInputRef}
                        readOnly
                        value={isCapturingConnectionSearchShortcut
                          ? t('general.sections.behavior.connectionSearchShortcut.capturePlaceholder')
                          : formatShortcutLabel(connectionSearchShortcut, locale)}
                        onBlur={() => setIsCapturingConnectionSearchShortcut(false)}
                        className="general-setting-shortcut-input"
                      />
                      <Button
                        type="button"
                        label={t('general.sections.behavior.connectionSearchShortcut.change')}
                        className="p-button-sm"
                        onClick={startConnectionSearchShortcutCapture}
                      />
                      <Button
                        type="button"
                        label={t('general.sections.behavior.connectionSearchShortcut.reset')}
                        className="p-button-sm p-button-text"
                        onClick={handleResetConnectionSearchShortcut}
                      />
                    </div>
                  </div>
                </div>

                {defaultLocalTerminal !== undefined && onDefaultTerminalChange && (
                  <div className="general-setting-card">
                    <div className="general-setting-content">
                      <div className="general-setting-icon">
                        <i className="pi pi-terminal"></i>
                      </div>
                      <div className="general-setting-info">
                        <label htmlFor="default-terminal" className="general-setting-label">
                          Terminal por Defecto
                        </label>
                        <p className="general-setting-description">
                          Selecciona el terminal que se abrirá por defecto al crear una nueva pestaña local
                        </p>
                      </div>
                      <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                          id="default-terminal"
                          value={defaultLocalTerminal}
                          options={defaultTerminalOptions.length > 0 ? defaultTerminalOptions : [{ label: 'PowerShell', value: 'powershell' }]}
                          optionLabel="label"
                          optionValue="value"
                          onChange={(e) => onDefaultTerminalChange(e.value)}
                          placeholder="Seleccionar terminal"
                          style={{ minWidth: '200px' }}
                          disabled={!terminalOptionsReady || defaultTerminalOptions.length === 0}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Idioma & Personalización Visual */}
          <div className="general-settings-column">
            {/* Sección de Idioma */}
            <div className="general-settings-section">
              <div className="general-section-header">
                <div className="general-section-icon">
                  <i className="pi pi-globe"></i>
                </div>
                <h4 className="general-section-title">{t('language.title')}</h4>
              </div>

              <div className="general-settings-options">
                <div className="general-setting-card">
                  <div className="general-setting-content">
                    <div className="general-setting-icon" style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #2196F3 100%)' }}>
                      <i className="pi pi-language"></i>
                    </div>
                    <div className="general-setting-info">
                      <label htmlFor="language-select" className="general-setting-label">
                        {t('language.select')}
                      </label>
                      <p className="general-setting-description">
                        {t('language.description')}
                      </p>
                    </div>
                    <div className="general-setting-control" onClick={(e) => e.stopPropagation()} style={{ minWidth: '180px' }}>
                      <Dropdown
                        id="language-select"
                        value={locale}
                        options={availableLocales.map(loc => ({
                          label: `${loc.flag} ${loc.name}`,
                          value: loc.code
                        }))}
                        onChange={(e) => setLocale(e.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección de Personalización Visual */}
            <div className="general-settings-section">
              <div className="general-section-header">
                <div className="general-section-icon">
                  <i className="pi pi-palette"></i>
                </div>
                <h4 className="general-section-title">{t('general.sections.visual.title')}</h4>
              </div>

              {/* Selector de Icono de Pestaña de Inicio */}
              <div className="general-icon-selector-section">
                <div className="general-selector-row-expandable">
                  <div className="general-selector-info-group">
                    <div className="general-selector-icon-compact">
                      <i className="pi pi-home"></i>
                    </div>
                    <div className="general-selector-text-group">
                      <span className="general-selector-title-compact">{t('general.sections.visual.homeTabIcon.title')}</span>
                      <span className="general-selector-description-compact">{t('general.sections.visual.homeTabIcon.description')}</span>
                    </div>
                  </div>
                  <div className="general-selector-action-wrapper">
                    <HomeIconSelectorGrid
                      selected={selectedHomeIcon}
                      onSelect={setSelectedHomeIcon}
                    />
                  </div>
                </div>
              </div>

              {/* Selector de Icono de Grupos */}
              <div className="general-icon-selector-section">
                <div className="general-selector-row-expandable">
                  <div className="general-selector-info-group">
                    <div className="general-selector-icon-compact">
                      <i className="pi pi-th-large"></i>
                    </div>
                    <div className="general-selector-text-group">
                      <span className="general-selector-title-compact">{t('general.sections.visual.groupTabIcon.title')}</span>
                      <span className="general-selector-description-compact">{t('general.sections.visual.groupTabIcon.description')}</span>
                    </div>
                  </div>
                  <div className="general-selector-action-wrapper">
                    <GroupIconSelectorGrid
                      selected={selectedGroupIcon}
                      onSelect={setSelectedGroupIcon}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GeneralSettingsTab);
