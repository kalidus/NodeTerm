import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { SSHIconRenderer, SSHIconPresets } from '../SSHIconSelector';

export const resolveSSHIconPreset = (iconId) => {
  if (!iconId || iconId === 'default') return null;
  const normalizedId = String(iconId).toLowerCase();
  const presetById = Object.values(SSHIconPresets).find((preset) => preset.id === normalizedId);
  if (presetById) return presetById;
  return SSHIconPresets[String(iconId).toUpperCase()] || null;
};

export const SSH_DIALOG_HEADER_ICON_SIZE = 24;

export const renderSSHDialogHeaderIconContent = (iconPreset, themeIcon, size = SSH_DIALOG_HEADER_ICON_SIZE) => {
  if (iconPreset) {
    return <SSHIconRenderer preset={iconPreset} pixelSize={size} />;
  }

  if (React.isValidElement(themeIcon)) {
    return (
      <div className="terminal-header-icon-mini" aria-hidden="true">
        {React.cloneElement(themeIcon, {
          width: size,
          height: size,
          style: {
            ...(themeIcon.props?.style || {}),
            width: `${size}px`,
            height: `${size}px`,
            display: 'block',
            flexShrink: 0,
          },
        })}
      </div>
    );
  }

  return (
    <div className="terminal-header-icon-mini" aria-hidden="true">
      <i className="pi pi-desktop"></i>
    </div>
  );
};
