import React, { useEffect, useMemo, useState } from 'react';
import {
  DOCK_ACTIONS,
  MAX_LAUNCHER_ACTION_PINS,
  getDockAction,
  getLauncherActionPins,
  pinLauncherAction,
  runDockAction,
  unpinLauncherAction
} from '../../utils/homeDock';

const LauncherQuickActions = ({
  variant = 'overlay',
  onActionRun,
  onOpenSettings
}) => {
  const [pins, setPins] = useState(() => getLauncherActionPins());
  const [collapsed, setCollapsed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setPins(getLauncherActionPins());
    window.addEventListener('launcher-action-pins-changed', refresh);
    return () => window.removeEventListener('launcher-action-pins-changed', refresh);
  }, []);

  const actions = useMemo(
    () => pins.map((id) => getDockAction(id)).filter(Boolean),
    [pins]
  );

  const pinnedIds = useMemo(() => new Set(pins), [pins]);
  const atLimit = pins.length >= MAX_LAUNCHER_ACTION_PINS;

  const handleRun = (actionId, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    runDockAction(actionId, { onOpenSettings });
    if (typeof onActionRun === 'function') onActionRun();
  };

  const handleUnpin = (actionId, event) => {
    event.preventDefault();
    event.stopPropagation();
    setPins(unpinLauncherAction(actionId));
  };

  const handleTogglePin = (actionId, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (pinnedIds.has(actionId)) {
      setPins(unpinLauncherAction(actionId));
      return;
    }
    setPins(pinLauncherAction(actionId));
  };

  return (
    <div className={`launcher-actions launcher-actions--${variant}`}>
      <div
        className="launcher-actions-title"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <span className="launcher-actions-title-left">
          <i className="pi pi-bolt" />
          Acciones ({actions.length})
        </span>
        <span className="launcher-actions-title-right">
          <button
            type="button"
            className={`launcher-actions-add${pickerOpen ? ' is-open' : ''}`}
            title="Configurar acciones"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setPickerOpen((prev) => !prev);
              setCollapsed(false);
            }}
          >
            <i className="pi pi-plus" />
          </button>
          <i className={`pi ${collapsed ? 'pi-chevron-down' : 'pi-chevron-up'}`} />
        </span>
      </div>

      {!collapsed && (
        <>
          {actions.length === 0 ? (
            <div className="launcher-actions-empty">Pinea acciones con +</div>
          ) : (
            <div className="launcher-actions-grid">
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="launcher-action-card"
                  style={{ '--action-color': action.color || 'var(--terminal-tab-accent, #00f2ff)' }}
                  title={`${action.label} - clic derecho para quitar`}
                  onClick={(event) => handleRun(action.id, event)}
                  onContextMenu={(event) => handleUnpin(action.id, event)}
                >
                  <span className="launcher-action-icon">
                    <i className={action.icon} />
                  </span>
                  <span className="launcher-action-label">{action.label}</span>
                  <i className="pi pi-angle-right launcher-action-arrow" />
                </button>
              ))}
            </div>
          )}

          {pickerOpen && (
            <div className="launcher-actions-picker">
              <div className="launcher-actions-picker-hint">
                {atLimit
                  ? `Maximo ${MAX_LAUNCHER_ACTION_PINS} acciones. Quita una para anadir otra.`
                  : 'Clic para pinear o quitar. Clic derecho en una card para quitarla.'}
              </div>
              <div className="launcher-actions-picker-grid">
                {DOCK_ACTIONS.map((action) => {
                  const isPinned = pinnedIds.has(action.id);
                  const disabled = !isPinned && atLimit;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`launcher-actions-picker-item${isPinned ? ' is-on' : ''}${disabled ? ' is-disabled' : ''}`}
                      style={{ '--action-color': action.color || 'var(--terminal-tab-accent, #00f2ff)' }}
                      disabled={disabled}
                      title={action.label}
                      onClick={(event) => handleTogglePin(action.id, event)}
                    >
                      <i className={action.icon} />
                      <span>{action.label}</span>
                      <i className={`pi ${isPinned ? 'pi-check' : 'pi-plus'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LauncherQuickActions;
