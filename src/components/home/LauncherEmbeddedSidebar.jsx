import React, { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from '../Sidebar';
import { STORAGE_KEYS } from '../../utils/constants';
import { useLauncherSidebarProps } from '../../utils/launcherSidebarBridge';

function readLauncherExpandedKeys() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LAUNCHER_EXPANDED_KEYS);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * Copia de la sidebar montada dentro del panel // LAUNCHER.
 * Lee las props que publica MainContentArea, sin enganchar el efecto de la barra de pestañas.
 * Expansión propia: no comparte expandedKeys con la sidebar principal.
 */
export default function LauncherEmbeddedSidebar({ onSessionOpened }) {
  const props = useLauncherSidebarProps();
  const [launcherExpandedKeys, setLauncherExpandedKeys] = useState(readLauncherExpandedKeys);
  const [launcherAllExpanded, setLauncherAllExpanded] = useState(false);
  const lastHashRef = useRef('');

  useEffect(() => {
    try {
      const jsonStr = JSON.stringify(launcherExpandedKeys);
      if (jsonStr === lastHashRef.current) return;
      lastHashRef.current = jsonStr;
      localStorage.setItem(STORAGE_KEYS.LAUNCHER_EXPANDED_KEYS, jsonStr);
    } catch {
      // ignore quota / private mode
    }
  }, [launcherExpandedKeys]);

  const toggleLauncherExpandAll = useCallback(() => {
    const nodes = props?.nodes;
    if (launcherAllExpanded) {
      setLauncherExpandedKeys({});
      setLauncherAllExpanded(false);
    } else {
      const newExpandedKeys = {};
      for (const node of nodes || []) {
        if (node.droppable || node.children) {
          newExpandedKeys[node.key] = true;
        }
      }
      setLauncherExpandedKeys(newExpandedKeys);
      setLauncherAllExpanded(true);
    }
  }, [launcherAllExpanded, props?.nodes]);

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
      expandedKeys={launcherExpandedKeys}
      setExpandedKeys={setLauncherExpandedKeys}
      allExpanded={launcherAllExpanded}
      toggleExpandAll={toggleLauncherExpandAll}
    />
  );
}
