import { useState, useRef, useCallback } from 'react';

export const useContextMenuManagement = () => {
  // ============ ESTADOS DE MENÚS CONTEXTUALES ============

  // Estado para menú contextual de terminal
  const [terminalContextMenu, setTerminalContextMenu] = useState(null);

  // Estados para menú de overflow
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [overflowMenuPosition, setOverflowMenuPosition] = useState({ x: 0, y: 0 });

  // ============ REFERENCIAS ============

  // Referencia para menú contextual del árbol
  const treeContextMenuRef = useRef(null);

  // ============ FUNCIONES DE MENÚ CONTEXTUAL DE TERMINAL ============

  // Mostrar menú contextual de terminal
  const showTerminalContextMenu = useCallback((tabKey, event) => {
    const { clientX: mouseX, clientY: mouseY } = event;
    setTerminalContextMenu({ tabKey, mouseX, mouseY });
  }, []);

  // Ocultar menú contextual de terminal
  const hideTerminalContextMenu = useCallback(() => {
    setTerminalContextMenu(null);
  }, []);

  // Estado para menú contextual del árbol
  const [treeContextMenu, setTreeContextMenu] = useState(null);

  // ============ FUNCIONES DE MENÚ DE OVERFLOW ============

  // Mostrar menú de overflow
  const showOverflowMenuAt = useCallback((x, y) => {
    setOverflowMenuPosition({ x, y });
    setShowOverflowMenu(true);
  }, []);

  // Ocultar menú de overflow
  const hideOverflowMenu = useCallback(() => {
    setShowOverflowMenu(false);
  }, []);

  // ============ FUNCIONES DE MENÚ CONTEXTUAL DEL ÁRBOL ============

  // Context menu for nodes
  const onNodeContextMenu = useCallback((event, node, setSelectedNode, setIsGeneralTreeMenu) => {
    if (event.persist) event.persist();
    event.preventDefault();
    event.stopPropagation();
    const x = event.clientX ?? event.pageX ?? 0;
    const y = event.clientY ?? event.pageY ?? 0;
    if (setSelectedNode) setSelectedNode(node);
    if (setIsGeneralTreeMenu) setIsGeneralTreeMenu(false);
    setTreeContextMenu({ x, y, node, isGeneral: false });
  }, []);

  // Context menu for tree area (general)
  const onTreeAreaContextMenu = useCallback((event, setSelectedNode, setIsGeneralTreeMenu) => {
    const targetElement = event.target;
    const isNodeClick = targetElement.closest('.p-treenode-content') ||
      targetElement.closest('.p-treenode') ||
      targetElement.closest('.p-tree-toggler');

    if (!isNodeClick) {
      if (event.persist) event.persist();
      event.preventDefault();
      event.stopPropagation();
      const x = event.clientX ?? event.pageX ?? 0;
      const y = event.clientY ?? event.pageY ?? 0;
      if (setSelectedNode) setSelectedNode(null);
      if (setIsGeneralTreeMenu) setIsGeneralTreeMenu(true);
      setTreeContextMenu({ x, y, node: null, isGeneral: true });
    }
  }, []);

  // Función para cerrar el menú contextual del árbol
  const hideContextMenu = useCallback(() => {
    setTreeContextMenu(null);
    try {
      if (treeContextMenuRef.current && treeContextMenuRef.current.hide) {
        treeContextMenuRef.current.hide();
      }
    } catch (_) {}
  }, []);

  return {
    // Estados de menús contextuales
    terminalContextMenu,
    setTerminalContextMenu,
    showOverflowMenu,
    setShowOverflowMenu,
    overflowMenuPosition,
    setOverflowMenuPosition,
    treeContextMenu,
    setTreeContextMenu,

    // Referencias
    treeContextMenuRef,

    // Funciones de terminal context menu
    showTerminalContextMenu,
    hideTerminalContextMenu,

    // Funciones de overflow menu
    showOverflowMenuAt,
    hideOverflowMenu,

    // Funciones de tree context menu
    onNodeContextMenu,
    onTreeAreaContextMenu,
    hideContextMenu
  };
};
