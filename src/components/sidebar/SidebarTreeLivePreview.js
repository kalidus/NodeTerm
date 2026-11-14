import React, { useEffect } from 'react';
import { iconThemes, ensureIconTheme } from '../../themes/icon-themes';
import '../../styles/components/tree-themes.css';

const ICON = 14;

function cloneIcon(node, size = ICON) {
  if (!node || !React.isValidElement(node)) return null;
  return React.cloneElement(node, {
    width: size,
    height: size,
    style: {
      ...(node.props?.style || {}),
      width: `${size}px`,
      height: `${size}px`,
      flexShrink: 0
    }
  });
}

/** Mini árbol vivo para el tab Estilo del menú de apariencia. */
const SidebarTreeLivePreview = ({
  treeTheme = 'cursorCompact',
  iconTheme = 'nord',
  fontColor
}) => {
  useEffect(() => {
    ensureIconTheme(iconTheme);
  }, [iconTheme]);

  const icons = iconThemes[iconTheme]?.icons;
  const folder = cloneIcon(icons?.folder) || <i className="pi pi-folder" style={{ fontSize: '0.75rem' }} />;
  const ssh = cloneIcon(icons?.ssh) || <i className="pi pi-server" style={{ fontSize: '0.75rem' }} />;

  return (
    <div
      className={`sap-live-preview tree-preview-container tree-theme-${treeTheme}`}
      style={fontColor ? { color: fontColor } : undefined}
    >
      <div className="tree-preview-node sap-live-node">
        {folder}
        <span>Producción</span>
      </div>
      <div className="tree-preview-children">
        <div className="tree-preview-child">
          <div className="tree-preview-node sap-live-node">
            {folder}
            <span>Web</span>
          </div>
          <div className="tree-preview-children">
            <div className="tree-preview-child">
              <div className="tree-preview-node sap-live-node">
                {ssh}
                <span>app-01</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarTreeLivePreview;
