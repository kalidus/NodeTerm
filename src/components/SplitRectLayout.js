import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import TerminalComponent from './TerminalComponent';
import PowerShellTerminal from './PowerShellTerminal';
import WSLTerminal from './WSLTerminal';
import UbuntuTerminal from './UbuntuTerminal';
import CygwinTerminal from './CygwinTerminal';
import { themes } from '../themes';
import { setUiDragging } from '../utils/uiDragPerformance';
import { clampSplitRatio, layoutSplitTree, splitPathKey } from '../utils/splitTreeLayout';
import { resolvePtyChannel } from '../utils/localPtyChannel';

const ACTION_BUTTON = {
  height: '18px',
  borderRadius: '4px',
  border: 'none',
  background: 'rgba(15, 15, 15, 0.8)',
  color: '#d0d0d0',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '11px',
  padding: '0 4px',
};

function localThemeFor(node, powerShellThemeName, linuxThemeName) {
  const type = node?.terminalType;
  const name = (type === 'powershell' || type === 'linux-terminal')
    ? powerShellThemeName
    : linuxThemeName;
  return themes[name]?.theme || themes['Default Dark']?.theme || {};
}

function SplitPaneTerminal({
  node,
  layoutSuspended,
  panePreferWebgl,
  terminalRefs,
  fontFamily,
  fontSize,
  theme,
  localFontFamily,
  localFontSize,
  localPowerShellTheme,
  localLinuxTerminalTheme,
  onContextMenu,
  active,
  statusBarIconTheme,
  isBroadcastActive,
  onBroadcastData,
  onToggleBroadcast,
  onToggleBroadcastTarget,
  broadcastExcludedTargets,
  onTerminalFocus,
}) {
  const common = {
    ref: (el) => {
      if (terminalRefs && node.key) terminalRefs.current[node.key] = el;
    },
    tabId: node.key,
    active,
    hideStatusBar: true,
    onContextMenu,
    layoutSuspended,
    onTerminalFocus,
    isBroadcastActive,
    onBroadcastData,
    broadcastExcludedTargets,
  };

  const channel = resolvePtyChannel(node);
  if (channel) {
    const localTheme = localThemeFor(node, localPowerShellTheme, localLinuxTerminalTheme);
    const localProps = {
      ...common,
      fontFamily: localFontFamily,
      fontSize: localFontSize,
      theme: localTheme,
    };
    if (channel === 'powershell') return <PowerShellTerminal {...localProps} />;
    if (channel === 'wsl') return <WSLTerminal {...localProps} />;
    if (channel === 'cygwin') return <CygwinTerminal {...localProps} />;
    return <UbuntuTerminal {...localProps} ubuntuInfo={node.distroInfo} />;
  }

  return (
    <TerminalComponent
      {...common}
      sshConfig={node.sshConfig || {}}
      fontFamily={fontFamily}
      fontSize={fontSize}
      theme={theme}
      preferWebgl={panePreferWebgl ? panePreferWebgl(node.key) : true}
      statusBarIconTheme={statusBarIconTheme}
      onToggleBroadcast={onToggleBroadcast}
      onToggleBroadcastTarget={onToggleBroadcastTarget}
      isSplit
      preserveSessionOnUnmount
    />
  );
}

export default function SplitRectLayout({
  root,
  gridApiRef,
  splitNavRef,
  focusedKeyRef,
  splitRootRef,
  focusedKey,
  setFocusedKey,
  zoomedKey,
  setZoomedKey,
  panePreferWebgl,
  terminalRefs,
  fontFamily,
  fontSize,
  theme,
  localFontFamily,
  localFontSize,
  localPowerShellTheme,
  localLinuxTerminalTheme,
  onContextMenu,
  active,
  statusBarIconTheme,
  isBroadcastActive,
  onBroadcastData,
  onToggleBroadcast,
  onToggleBroadcastTarget,
  broadcastExcludedTargets,
  onClosePanel,
  effectiveSplitterColor,
}) {
  const [sizes, setSizes] = useState({});
  const dragRef = useRef(null);

  const layout = useMemo(
    () => layoutSplitTree(root, sizes),
    [root, sizes]
  );

  const setSize = useCallback((key, value) => {
    setSizes((prev) => ({ ...prev, [key]: clampSplitRatio(value) }));
  }, []);

  const equalize = useCallback(() => setSizes({}), []);

  const publishGridApi = useCallback(() => {
    const terminals = layout.panes.map((pane) => pane.node);
    const nextApi = {
      panes: layout.panes,
      gutters: layout.gutters,
      sizes,
      focusedKey: focusedKeyRef?.current ?? focusedKey,
      zoomedKey,
      terminals,
      setSize,
      equalize,
    };
    if (gridApiRef) {
      gridApiRef.current = nextApi;
    }
    if (splitNavRef) {
      splitNavRef.current = {
        panes: layout.panes,
        gutters: layout.gutters,
        sizes,
        focusedKey: focusedKeyRef?.current ?? focusedKey,
        terminals,
        orientation: root?.orientation || null,
      };
    }
  }, [
    layout.panes,
    layout.gutters,
    sizes,
    focusedKey,
    focusedKeyRef,
    zoomedKey,
    setSize,
    equalize,
    gridApiRef,
    splitNavRef,
    root?.orientation,
  ]);

  // Publicar en render (sin anular desde el padre) y reforzar tras commit.
  publishGridApi();
  useLayoutEffect(() => {
    publishGridApi();
  }, [publishGridApi]);

  useEffect(() => {
    const onMove = (event) => {
      const drag = dragRef.current;
      const rootEl = splitRootRef?.current;
      if (!drag || !rootEl) return;
      const bounds = rootEl.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const parent = drag.parent;
      let ratio = 50;
      if (drag.orientation === 'horizontal') {
        const yPct = ((event.clientY - bounds.top) / bounds.height) * 100;
        ratio = ((yPct - parent.y) / parent.h) * 100;
      } else {
        const xPct = ((event.clientX - bounds.left) / bounds.width) * 100;
        ratio = ((xPct - parent.x) / parent.w) * 100;
      }
      setSize(drag.key, ratio);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setUiDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [splitRootRef]);

  const zoomed = zoomedKey && layout.panes.some((pane) => pane.key === zoomedKey);

  return (
    <div
      ref={splitRootRef}
      data-split-root
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: theme?.background || '#000000',
      }}
    >
      {layout.panes.map((pane) => {
        const visible = !zoomed || pane.key === zoomedKey;
        const rect = visible && zoomed
          ? { x: 0, y: 0, w: 100, h: 100 }
          : pane.rect;
        const focused = pane.key === focusedKey;
        const suspended = !visible;
        return (
          <div
            key={pane.key}
            style={{
              position: 'absolute',
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: visible ? `${rect.w}%` : 0,
              height: visible ? `${rect.h}%` : 0,
              overflow: 'hidden',
              visibility: visible ? 'visible' : 'hidden',
              pointerEvents: visible ? 'auto' : 'none',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {visible && layout.panes.length > 1 && (
              <>
                {focused && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    outline: '2px solid #4da6ff',
                    outlineOffset: '-2px',
                    pointerEvents: 'none',
                    zIndex: 6,
                  }}
                  />
                )}
                {!focused && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.28)',
                    pointerEvents: 'none',
                    zIndex: 4,
                  }}
                  />
                )}
                {focused && (
                  <div style={{ position: 'absolute', top: '4px', right: onClosePanel ? '22px' : '4px', display: 'flex', gap: '4px', zIndex: 1001 }}>
                    <button
                      type="button"
                      style={ACTION_BUTTON}
                      title={zoomed ? 'Restaurar (Alt+Mayús+Intro)' : 'Ampliar panel (Alt+Mayús+Intro)'}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedKey((prev) => (prev === pane.key ? null : pane.key));
                      }}
                    >
                      <i className={zoomed ? 'pi pi-window-minimize' : 'pi pi-window-maximize'} />
                    </button>
                    {!zoomed && (
                      <button
                        type="button"
                        style={ACTION_BUTTON}
                        title="Igualar paneles (Alt+Mayús+=)"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSizes({});
                        }}
                      >
                        <i className="pi pi-th-large" />
                      </button>
                    )}
                    {resolvePtyChannel(pane.node) && (
                      <button
                        type="button"
                        style={{
                          ...ACTION_BUTTON,
                          color: isBroadcastActive && !(broadcastExcludedTargets || []).includes(pane.key) ? '#4da6ff' : '#d0d0d0',
                        }}
                        title={isBroadcastActive && !(broadcastExcludedTargets || []).includes(pane.key)
                          ? 'Quitar este panel del broadcast'
                          : (isBroadcastActive ? 'Añadir este panel al broadcast' : 'Activar broadcast en todos los paneles')}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBroadcastTarget?.(pane.key);
                        }}
                      >
                        <i className="pi pi-megaphone" />
                      </button>
                    )}
                  </div>
                )}
                {onClosePanel && (
                  <button
                    type="button"
                    title="Cerrar terminal"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClosePanel(pane.path);
                    }}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: 'rgba(220, 53, 69, 0.8)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      zIndex: 1001,
                      lineHeight: '14px',
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </>
            )}
            <SplitPaneTerminal
              node={pane.node}
              layoutSuspended={suspended}
              panePreferWebgl={panePreferWebgl}
              terminalRefs={terminalRefs}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              localFontFamily={localFontFamily}
              localFontSize={localFontSize}
              localPowerShellTheme={localPowerShellTheme}
              localLinuxTerminalTheme={localLinuxTerminalTheme}
              onContextMenu={onContextMenu}
              active={active}
              statusBarIconTheme={statusBarIconTheme}
              isBroadcastActive={isBroadcastActive}
              onBroadcastData={onBroadcastData}
              onToggleBroadcast={onToggleBroadcast}
              onToggleBroadcastTarget={onToggleBroadcastTarget}
              broadcastExcludedTargets={broadcastExcludedTargets}
              onTerminalFocus={() => setFocusedKey(pane.key)}
            />
          </div>
        );
      })}
      {!zoomed && layout.gutters.map((gutter) => {
        const key = splitPathKey(gutter.path);
        const horizontal = gutter.orientation === 'horizontal';
        const line = horizontal
          ? gutter.parent.y + gutter.parent.h * gutter.ratio / 100
          : gutter.parent.x + gutter.parent.w * gutter.ratio / 100;
        return (
          <div
            key={key}
            onMouseDown={(event) => {
              event.preventDefault();
              dragRef.current = {
                key,
                orientation: gutter.orientation,
                parent: gutter.parent,
              };
              setUiDragging(true);
              document.body.style.userSelect = 'none';
              document.body.style.cursor = horizontal ? 'row-resize' : 'col-resize';
            }}
            style={{
              position: 'absolute',
              left: horizontal ? `${gutter.parent.x}%` : `calc(${line}% - 4px)`,
              top: horizontal ? `calc(${line}% - 4px)` : `${gutter.parent.y}%`,
              width: horizontal ? `${gutter.parent.w}%` : '8px',
              height: horizontal ? '8px' : `${gutter.parent.h}%`,
              cursor: horizontal ? 'row-resize' : 'col-resize',
              zIndex: 30,
              backgroundImage: horizontal
                ? `linear-gradient(to bottom, transparent calc(50% - 1px), ${effectiveSplitterColor || 'var(--ui-tab-border, #3e3e42)'} calc(50% - 1px), ${effectiveSplitterColor || 'var(--ui-tab-border, #3e3e42)'} calc(50% + 1px), transparent calc(50% + 1px))`
                : `linear-gradient(to right, transparent calc(50% - 1px), ${effectiveSplitterColor || 'var(--ui-tab-border, #3e3e42)'} calc(50% - 1px), ${effectiveSplitterColor || 'var(--ui-tab-border, #3e3e42)'} calc(50% + 1px), transparent calc(50% + 1px))`,
            }}
          />
        );
      })}
    </div>
  );
}
