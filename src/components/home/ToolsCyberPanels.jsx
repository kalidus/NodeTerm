import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import HomePanelWrapper from '../HomePanelWrapper';
import { findToolMetadata, TOOL_COMPONENTS } from '../network-tools/toolRegistry';
import { allocHomePanelZ } from '../../utils/homePanelStack';

const NetworkToolsDialog = React.lazy(() => import('../NetworkToolsDialog'));

const COMPACT_WIDTH = 640;

const PANEL_BOX = {
  x: 40,
  y: 28,
  width: 800,
  height: 560,
  zIndex: 20,
  isMaximized: false,
  isMinimized: false,
  visible: true
};

export default function ToolsCyberPanels({
  terminalFrameStyle = 'macos',
  snapToGrid = true,
  smartSnap = true,
  frameBackground = null
}) {
  const [tool, setTool] = useState(null);
  const [box, setBox] = useState(PANEL_BOX);
  const [compact, setCompact] = useState(false);
  const bodyRef = useRef(null);

  const raise = useCallback(() => {
    const zIndex = allocHomePanelZ();
    setBox((prev) => ({ ...prev, zIndex, isMinimized: false }));
  }, []);

  const openTool = useCallback((detail) => {
    const toolId = detail?.toolId;
    if (!toolId || !TOOL_COMPONENTS[toolId]) return;
    const meta = findToolMetadata(toolId);
    setTool({
      id: toolId,
      label: detail.toolLabel || meta.label || toolId,
      icon: detail.toolIcon || meta.icon || 'pi pi-cog'
    });
    raise();
  }, [raise]);

  useEffect(() => {
    const onOpen = (event) => {
      openTool(event?.detail || {});
    };
    window.addEventListener('open-home-tool-panel', onOpen);
    return () => window.removeEventListener('open-home-tool-panel', onOpen);
  }, [openTool]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width || 0;
      const next = width > 0 && width < COMPACT_WIDTH;
      setCompact((prev) => (prev === next ? prev : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [tool?.id]);

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

  if (!tool) return null;

  return (
    <HomePanelWrapper
      id="tools-cyber"
      title="~/tools"
      path={`tools · ${tool.label}`}
      titleIcon={<i className={tool.icon} style={{ fontSize: '0.8rem' }} />}
      panelState={box}
      terminalFrameStyle={terminalFrameStyle}
      snapToGrid={snapToGrid}
      smartSnap={smartSnap}
      frameBackground={frameBackground}
      minWidth={520}
      minHeight={400}
      className="tools-cyber-frame"
      onClose={() => setTool(null)}
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
      <div ref={bodyRef} className="tools-cyber-body">
        <style>{`
          .tools-cyber-frame .tools-cyber-body {
            flex: 1;
            min-height: 0;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .tools-cyber-frame .network-tools-standalone {
            flex: 1;
            min-height: 0;
          }
          .tools-cyber-loading {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-color-secondary, rgba(255,255,255,0.65));
            font-size: 0.85rem;
          }
          .p-overlaypanel,
          .p-tooltip,
          .p-dropdown-panel,
          .p-autocomplete-panel,
          .p-menu-overlay {
            z-index: 130000 !important;
          }
        `}</style>
        <Suspense
          fallback={(
            <div className="tools-cyber-loading">
              Cargando herramienta...
            </div>
          )}
        >
          <NetworkToolsDialog
            key={tool.id}
            standalone
            toolId={tool.id}
            compact={compact}
          />
        </Suspense>
      </div>
    </HomePanelWrapper>
  );
}
