import React from 'react';
import Sidebar from '../Sidebar';
import { useLauncherSidebarProps } from '../../utils/launcherSidebarBridge';

/**
 * Copia de la sidebar montada dentro del panel // LAUNCHER.
 * Lee las props que publica MainContentArea, sin enganchar el efecto de la barra de pestañas.
 */
export default function LauncherEmbeddedSidebar({ onSessionOpened }) {
  const props = useLauncherSidebarProps();

  if (!props) {
    return (
      <div style={{ padding: 16, opacity: 0.7, fontSize: 12 }}>
        Cargando sidebar...
      </div>
    );
  }

  return (
    <Sidebar
      {...props}
      embedded
      isTransitioningSidebar={false}
      onSessionOpened={onSessionOpened}
    />
  );
}
