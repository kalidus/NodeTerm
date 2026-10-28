import React, { useCallback, useEffect, useRef, useState } from 'react';
import HomePanelWrapper from '../HomePanelWrapper';
import { collectVaultEntries } from '../../utils/homeWidgets';
import { allocHomePanelZ } from '../../utils/homePanelStack';
import VaultCyberTerminal, { VaultCyberDetail } from './VaultCyberTerminal';

const LIST_BOX = {
  x: 24,
  y: 24,
  width: 680,
  height: 440,
  zIndex: 20,
  isMaximized: false,
  isMinimized: false,
  visible: true
};

const DETAIL_BOX = {
  x: 400,
  y: 56,
  width: 360,
  height: 400,
  zIndex: 21,
  isMaximized: false,
  isMinimized: false,
  visible: true
};

function patchBox(setter, updates) {
  setter((prev) => ({ ...prev, ...updates }));
}

export default function VaultCyberPanels({
  passwordNodes = [],
  vaultLocked = false,
  autoShowList = false,
  terminalFrameStyle = 'default',
  snapToGrid = true,
  smartSnap = true,
  frameBackground = null
}) {
  const [listDismissed, setListDismissed] = useState(true);
  const [listBox, setListBox] = useState(LIST_BOX);
  const [detailEntry, setDetailEntry] = useState(null);
  const [detailBox, setDetailBox] = useState(DETAIL_BOX);
  const passwordNodesRef = useRef(passwordNodes);
  passwordNodesRef.current = passwordNodes;

  const raise = useCallback((target) => {
    const zIndex = allocHomePanelZ();
    if (target === 'list') {
      setListBox((prev) => ({ ...prev, zIndex, isMinimized: false }));
    } else {
      setDetailBox((prev) => ({ ...prev, zIndex, isMinimized: false }));
    }
  }, []);

  const openDetail = useCallback((entry) => {
    if (!entry) return;
    setListDismissed(false);
    setDetailEntry(entry);
    raise('list');
    raise('detail');
  }, [raise]);

  const openDetailByKey = useCallback((key) => {
    if (key == null) return;
    const wanted = String(key);
    const entry = collectVaultEntries(passwordNodesRef.current)
      .find((item) => String(item.key) === wanted);
    if (entry) openDetail(entry);
  }, [openDetail]);

  // Abrir la lista al entrar en Contraseñas; al salir no se fuerza el cierre.
  useEffect(() => {
    if (!autoShowList) return;
    setListDismissed(false);
    raise('list');
  }, [autoShowList, raise]);

  useEffect(() => {
    const onOpen = (event) => {
      openDetailByKey(event?.detail?.key);
    };
    window.addEventListener('open-home-vault-secret', onOpen);
    return () => window.removeEventListener('open-home-vault-secret', onOpen);
  }, [openDetailByKey]);

  useEffect(() => {
    if (!detailEntry) return;
    if (vaultLocked) {
      setDetailEntry(null);
      return;
    }
    const fresh = collectVaultEntries(passwordNodes).find((entry) => entry.key === detailEntry.key);
    if (!fresh) {
      setDetailEntry(null);
      return;
    }
    const same = fresh.name === detailEntry.name
      && fresh.folder === detailEntry.folder
      && fresh.username === detailEntry.username
      && fresh.url === detailEntry.url
      && fresh.type === detailEntry.type
      && fresh.secret === detailEntry.secret;
    if (!same) setDetailEntry(fresh);
  }, [detailEntry, passwordNodes, vaultLocked]);

  const moveBox = (setter) => (_id, next) => {
    if (!next) return;
    patchBox(setter, {
      x: next.x,
      y: next.y,
      width: next.width,
      height: next.height
    });
  };

  return (
    <>
      {!listDismissed && (
        <HomePanelWrapper
          id="vault-cyber"
          title="~/vault"
          path="vault · secretos"
          panelState={listBox}
          terminalFrameStyle={terminalFrameStyle}
          snapToGrid={snapToGrid}
          smartSnap={smartSnap}
          frameBackground={frameBackground}
          minWidth={420}
          minHeight={280}
          className="vault-cyber-frame"
          onClose={() => setListDismissed(true)}
          onBringToFront={() => raise('list')}
          onToggleMaximize={() => setListBox((prev) => ({
            ...prev,
            isMaximized: !prev.isMaximized,
            isMinimized: false
          }))}
          onToggleMinimize={() => setListBox((prev) => ({
            ...prev,
            isMinimized: !prev.isMinimized
          }))}
          onDragEnd={moveBox(setListBox)}
          onResizeEnd={moveBox(setListBox)}
        >
          <VaultCyberTerminal
            passwordNodes={passwordNodes}
            vaultLocked={vaultLocked}
            selectedKey={detailEntry?.key || null}
            onOpenDetail={openDetail}
          />
        </HomePanelWrapper>
      )}
      {detailEntry && (
        <HomePanelWrapper
          id="vault-cyber-detail"
          title="~/vault · detalle"
          path={`detalle · ${detailEntry.name || 'secreto'}`}
          panelState={detailBox}
          terminalFrameStyle={terminalFrameStyle}
          snapToGrid={snapToGrid}
          smartSnap={smartSnap}
          frameBackground={frameBackground}
          minWidth={300}
          minHeight={240}
          className="vault-cyber-frame"
          onClose={() => setDetailEntry(null)}
          onBringToFront={() => raise('detail')}
          onToggleMaximize={() => setDetailBox((prev) => ({
            ...prev,
            isMaximized: !prev.isMaximized,
            isMinimized: false
          }))}
          onToggleMinimize={() => setDetailBox((prev) => ({
            ...prev,
            isMinimized: !prev.isMinimized
          }))}
          onDragEnd={moveBox(setDetailBox)}
          onResizeEnd={moveBox(setDetailBox)}
        >
          <VaultCyberDetail entry={detailEntry} />
        </HomePanelWrapper>
      )}
    </>
  );
}
