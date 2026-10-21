import React, { useCallback, useEffect, useRef, useState } from 'react';
import HomePanelWrapper from '../HomePanelWrapper';
import { findNodeInTree } from '../../utils/treeDragDrop';
import connectionStore from '../../utils/connectionStore';
import ConnectionCyberPanel from './ConnectionCyberPanel';

const BASE_Z = 10020;

const PANEL_BOX = {
  x: 48,
  y: 40,
  width: 420,
  height: 460,
  zIndex: BASE_Z,
  isMaximized: false,
  isMinimized: false,
  visible: true
};

const CONNECTION_TYPES = new Set([
  'ssh',
  'rdp',
  'rdp-guacamole',
  'vnc',
  'vnc-guacamole',
  'sftp',
  'ftp',
  'scp',
  'ssh-tunnel'
]);

function isConnectionNode(node) {
  if (!node || node.droppable) return false;
  return CONNECTION_TYPES.has(String(node.data?.type || '').toLowerCase());
}

function toConnectPayload(node) {
  const base = connectionStore.helpers.fromSidebarNode(node);
  if (!base) return null;
  return {
    ...base,
    password: node.data?.password || '',
    privateKey: node.data?.privateKey || ''
  };
}

export default function ConnectionCyberPanels({
  sidebarNodes = [],
  onConnectToHistory,
  onEdit,
  terminalFrameStyle = 'macos',
  snapToGrid = true,
  smartSnap = true,
  frameBackground = null
}) {
  const [node, setNode] = useState(null);
  const [box, setBox] = useState(PANEL_BOX);
  const zRef = useRef(BASE_Z);
  const nodesRef = useRef(sidebarNodes);
  nodesRef.current = sidebarNodes;

  const raise = useCallback(() => {
    zRef.current += 1;
    setBox((prev) => ({ ...prev, zIndex: zRef.current, isMinimized: false }));
  }, []);

  const openByKey = useCallback((key) => {
    if (key == null) return;
    const found = findNodeInTree(nodesRef.current, key);
    if (!found || !isConnectionNode(found)) return;
    setNode(found);
    raise();
  }, [raise]);

  useEffect(() => {
    const onOpen = (event) => {
      openByKey(event?.detail?.key);
    };
    window.addEventListener('open-home-connection-panel', onOpen);
    return () => window.removeEventListener('open-home-connection-panel', onOpen);
  }, [openByKey]);

  useEffect(() => {
    setNode((current) => {
      if (!current) return null;
      const fresh = findNodeInTree(sidebarNodes, current.key);
      if (!fresh || !isConnectionNode(fresh)) return null;
      return fresh;
    });
  }, [sidebarNodes]);

  const handleConnect = useCallback((selected) => {
    if (!selected || !onConnectToHistory) return;
    const payload = toConnectPayload(selected);
    if (payload) onConnectToHistory(payload, { embedInHome: true });
  }, [onConnectToHistory]);

  const handleConnectInTab = useCallback((selected) => {
    if (!selected || !onConnectToHistory) return;
    const payload = toConnectPayload(selected);
    if (payload) onConnectToHistory(payload);
  }, [onConnectToHistory]);

  const handleInfo = useCallback((selected) => {
    if (!selected || !onEdit) return;
    const payload = toConnectPayload(selected);
    if (payload) onEdit(payload);
  }, [onEdit]);

  const moveBox = useCallback((_id, next) => {
    if (!next) return;
    setBox((prev) => ({
      ...prev,
      x: next.x,
      y: next.y,
      width: next.width,
      height: next.height
    }));
  }, []);

  if (!node) return null;

  return (
    <HomePanelWrapper
      id="connection-cyber"
      title="~/conn"
      path={`conn · ${node.label || 'sesión'}`}
      panelState={box}
      terminalFrameStyle={terminalFrameStyle}
      snapToGrid={snapToGrid}
      smartSnap={smartSnap}
      frameBackground={frameBackground}
      minWidth={320}
      minHeight={280}
      className="connection-cyber-frame"
      onClose={() => setNode(null)}
      onBringToFront={raise}
      onToggleMaximize={() => setBox((prev) => ({
        ...prev,
        isMaximized: !prev.isMaximized,
        isMinimized: false
      }))}
      onToggleMinimize={() => setBox((prev) => ({
        ...prev,
        isMinimized: !prev.isMinimized
      }))}
      onDragEnd={moveBox}
      onResizeEnd={moveBox}
    >
      <ConnectionCyberPanel
        node={node}
        onConnect={handleConnect}
        onConnectInTab={handleConnectInTab}
        onInfo={handleInfo}
      />
    </HomePanelWrapper>
  );
}
