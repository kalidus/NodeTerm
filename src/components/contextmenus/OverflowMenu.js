import React from 'react';
import {
  APP_MENU_SURFACE_CLASS,
  APP_MENU_ITEM_CLASS,
  APP_MENU_EMPTY_CLASS,
  getAppMenuSurfaceStyle
} from '../ui/AppMenu';

const OverflowMenu = ({
  showOverflowMenu,
  setShowOverflowMenu,
  overflowMenuPosition,
  overflowMenuItems = []
}) => {
  if (!showOverflowMenu) return null;

  return (
    <>
      <div
        className={APP_MENU_SURFACE_CLASS}
        style={getAppMenuSurfaceStyle({
          x: overflowMenuPosition.x,
          y: overflowMenuPosition.y
        })}
        onMouseLeave={() => setShowOverflowMenu(false)}
      >
        {overflowMenuItems.map((item, index) => (
          <div
            key={index}
            className={APP_MENU_ITEM_CLASS}
            onClick={() => {
              item.command();
              setShowOverflowMenu(false);
            }}
          >
            <i className={`${item.icon || 'pi pi-circle'} app-menu-item-icon`} />
            <span className="app-menu-item-label">{item.label}</span>
          </div>
        ))}
        {overflowMenuItems.length === 0 && (
          <div className={APP_MENU_EMPTY_CLASS}>
            No hay pestanas ocultas
          </div>
        )}
      </div>

      <div
        className="app-menu-backdrop"
        onClick={() => setShowOverflowMenu(false)}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowOverflowMenu(false);
        }}
      />
    </>
  );
};

export default OverflowMenu;
