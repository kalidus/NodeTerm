import React, { useCallback, useEffect, useRef, useState } from 'react';
import HomePanelWrapper from '../HomePanelWrapper';
import { findNodeInTree } from '../../utils/treeDragDrop';
import { allocHomePanelZ } from '../../utils/homePanelStack';
import NotesCyberPanel from './NotesCyberPanel';

const PANEL_BOX = {
  x: 72,
  y: 48,
  width: 460,
  height: 500,
  zIndex: 20,
  isMaximized: false,
  isMinimized: false,
  visible: true
};

const NOTE_TYPES = new Set(['document', 'quick-note']);

function isNoteNode(node) {
  if (!node || node.droppable || node.data?.type === 'document-folder') return false;
  return NOTE_TYPES.has(String(node.data?.type || '').toLowerCase());
}

export default function NotesCyberPanels({
  documentNodes = [],
  terminalFrameStyle = 'default',
  snapToGrid = true,
  smartSnap = true,
  frameBackground = null
}) {
  const [node, setNode] = useState(null);
  const [box, setBox] = useState(PANEL_BOX);
  const nodesRef = useRef(documentNodes);
  nodesRef.current = documentNodes;

  const raise = useCallback(() => {
    const zIndex = allocHomePanelZ();
    setBox((prev) => ({ ...prev, zIndex, isMinimized: false }));
  }, []);

  const openNode = useCallback((nextNode) => {
    if (!nextNode || !isNoteNode(nextNode)) return;
    setNode(nextNode);
    raise();
  }, [raise]);

  const openByKey = useCallback((key, fallback) => {
    if (key == null && !fallback) return;
    const found = key != null ? findNodeInTree(nodesRef.current, key) : null;
    if (found && isNoteNode(found)) {
      openNode(found);
      return;
    }
    if (fallback && (fallback.key || fallback.label)) {
      openNode({
        key: fallback.key || key,
        label: fallback.label || 'nota',
        data: fallback.data || { type: 'document', content: '' }
      });
    }
  }, [openNode]);

  useEffect(() => {
    const onOpen = (event) => {
      const detail = event?.detail || {};
      openByKey(detail.key, detail);
    };
    window.addEventListener('open-home-note-panel', onOpen);
    return () => window.removeEventListener('open-home-note-panel', onOpen);
  }, [openByKey]);

  useEffect(() => {
    setNode((current) => {
      if (!current) return null;
      const fresh = findNodeInTree(documentNodes, current.key);
      if (fresh && isNoteNode(fresh)) return fresh;
      if (isNoteNode(current)) return current;
      return null;
    });
  }, [documentNodes]);

  const handleOpenInTab = useCallback((selected) => {
    if (!selected) return;
    window.dispatchEvent(new CustomEvent('open-document-tab', {
      detail: {
        key: selected.key,
        label: selected.label,
        data: selected.data,
        mode: 'reuse'
      }
    }));
  }, []);

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
      id="notes-cyber"
      title="~/notes"
      path={`notes · ${node.label || 'nota'}`}
      panelState={box}
      terminalFrameStyle={terminalFrameStyle}
      snapToGrid={snapToGrid}
      smartSnap={smartSnap}
      frameBackground={frameBackground}
      minWidth={340}
      minHeight={300}
      className="notes-cyber-frame"
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
      <NotesCyberPanel node={node} onOpenInTab={handleOpenInTab} />
    </HomePanelWrapper>
  );
}
