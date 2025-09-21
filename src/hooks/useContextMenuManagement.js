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
    
    // Calcular posición ajustada para que no se salga de la pantalla
    const menuWidth = 180;
    const menuHeight = 160;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let adjustedX = mouseX;
    let adjustedY = mouseY;
    
    // Ajustar horizontalmente si se sale por la derecha
    if (mouseX + menuWidth > windowWidth) {
      adjustedX = windowWidth - menuWidth - 10;
    }
    
    // Ajustar verticalmente si se sale por abajo
    if (mouseY + menuHeight > windowHeight) {
      adjustedY = windowHeight - menuHeight - 10;
    }
    
    // Asegurar que no se salga por arriba o por la izquierda
    adjustedX = Math.max(10, adjustedX);
    adjustedY = Math.max(10, adjustedY);
    
    setTerminalContextMenu({ tabKey, mouseX: adjustedX, mouseY: adjustedY });
  }, []);

  // Ocultar menú contextual de terminal
  const hideTerminalContextMenu = useCallback(() => {
    setTerminalContextMenu(null);
  }, []);

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
    event.preventDefault();
    event.stopPropagation();
    setSelectedNode(node);
    setIsGeneralTreeMenu(false);
    if (treeContextMenuRef.current) {
      treeContextMenuRef.current.show(event);
    }
  }, []);

  // Context menu for tree area (general)
  const onTreeAreaContextMenu = useCallback((event, setSelectedNode, setIsGeneralTreeMenu) => {
    const targetElement = event.target;
    const isNodeClick = targetElement.closest('.p-treenode-content') || 
                       targetElement.closest('.p-treenode') ||
                       targetElement.closest('.p-tree-toggler');
    
    if (!isNodeClick) {
      event.preventDefault();
      event.stopPropagation();
      setSelectedNode(null);
      setIsGeneralTreeMenu(true);
      if (treeContextMenuRef.current) {
        treeContextMenuRef.current.show(event);
      }
    }
  }, []);

  // Función para cerrar el menú contextual del árbol
  const hideContextMenu = useCallback(() => {
    try {
      if (treeContextMenuRef.current && treeContextMenuRef.current.hide) {
        treeContextMenuRef.current.hide();
      }
    } catch (error) {
      console.error('Error cerrando menú contextual:', error);
    }
  }, []);

  return {
    // Estados de menús contextuales
    terminalContextMenu,
    setTerminalContextMenu,
    showOverflowMenu,
    setShowOverflowMenu,
    overflowMenuPosition,
    setOverflowMenuPosition,
    
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
