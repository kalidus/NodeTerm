import { useState, useRef } from 'react';

// Almacenamiento global para el nodo SSH que se está arrastrando desde la sidebar
// Esto es necesario porque PrimeReact Tree no expone correctamente el dataTransfer
const draggedSSHNodeRef = { current: null };

export const useDragAndDrop = (tabManagementProps = {}) => {
  const {
    getFilteredTabs,
    openTabOrder,
    setOpenTabOrder,
    setActiveTabIndex,
    openInSplit // Función para abrir conexión SSH en split
  } = tabManagementProps;

  // Estados para drag & drop de pestañas
  const [draggedTabIndex, setDraggedTabIndex] = useState(null);
  const [dragOverTabIndex, setDragOverTabIndex] = useState(null);
  const [dragStartTimer, setDragStartTimer] = useState(null);

  // Funciones para drag & drop de pestañas
  const handleTabDragStart = (e, tabIndex) => {
    if (!getFilteredTabs) return;
    
    const filtered = getFilteredTabs();
    const tab = filtered[tabIndex];
    if (!tab) return;
    
    // Verificar si el botón de inicio está bloqueado
    const isHomeButtonLocked = localStorage.getItem('lock_home_button') === 'true';
    
    // Solo bloquear el arrastre de la pestaña de Inicio si está configurada para bloquear
    if ((tab.type === 'home' || tab.label === 'Inicio') && isHomeButtonLocked) return;
    
    // Pequeño delay para distinguir entre click y drag
    const timer = setTimeout(() => {
      setDraggedTabIndex(tabIndex);
    }, 50);
    setDragStartTimer(timer);
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabIndex.toString());
  };

  const handleTabDragOver = (e, tabIndex) => {
    e.preventDefault();
    
    if (!getFilteredTabs) {
      setDragOverTabIndex(null);
      return;
    }
    
    // Verificar si se está arrastrando un nodo SSH desde la sidebar
    // Primero verificar el ref global (más confiable)
    const hasSSHNode = draggedSSHNodeRef.current !== null;
    
    // También verificar dataTransfer como fallback
    const hasSSHNodeType = !hasSSHNode && e.dataTransfer.types && 
      e.dataTransfer.types.includes('application/nodeterm-ssh-node');
    
    // Si no hay draggedTabIndex y hay un nodo SSH, es un nodo SSH desde la sidebar
    // (las pestañas siempre tienen draggedTabIndex cuando se arrastran)
    const mightBeSSHNode = !draggedTabIndex && (hasSSHNode || hasSSHNodeType);
    
    if (mightBeSSHNode) {
      // Verificar que la pestaña de destino sea válida (terminal o split)
      const filtered = getFilteredTabs();
      const dropTab = filtered[tabIndex];
      
      if (dropTab && (dropTab.type === 'terminal' || dropTab.type === 'split')) {
        // Si es un nodo SSH y la pestaña es válida, permitir drop y cambiar el efecto visual
        e.dataTransfer.dropEffect = 'copy';
        setDragOverTabIndex(tabIndex);
        return;
      }
    }
    
    // Comportamiento normal para reordenar pestañas
    e.dataTransfer.dropEffect = 'move';
    setDragOverTabIndex(tabIndex);
  };

  const handleTabDragLeave = (e) => {
    // Solo limpiar si realmente salimos del área de pestañas
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverTabIndex(null);
    }
  };

  const handleTabDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (!getFilteredTabs) return;
    
    console.log('🟢 Tab drop event:', { dropIndex, draggedTabIndex, types: e.dataTransfer.types });
    
    // Verificar si se está arrastrando un nodo SSH desde la sidebar
    // Primero intentar desde el almacenamiento global (más confiable con PrimeReact)
    let sshNodeData = draggedSSHNodeRef.current;
    console.log('🟢 SSH node from ref:', sshNodeData);
    
    // Si no está en el ref, intentar desde dataTransfer (fallback)
    if (!sshNodeData) {
      try {
        if (e.dataTransfer.types && e.dataTransfer.types.includes('application/nodeterm-ssh-node')) {
          sshNodeData = JSON.parse(e.dataTransfer.getData('application/nodeterm-ssh-node'));
          console.log('🟢 SSH node from dataTransfer:', sshNodeData);
        } else if (e.dataTransfer.types && e.dataTransfer.types.includes('text/plain')) {
          const textData = e.dataTransfer.getData('text/plain');
          console.log('🟢 Text data:', textData);
          if (textData && textData.startsWith('ssh:')) {
            // Formato alternativo: ssh:key - no tenemos el nodo completo, necesitamos el ref
            // Si llegamos aquí, el ref debería tener el dato
            sshNodeData = draggedSSHNodeRef.current;
          }
        }
      } catch (err) {
        console.warn('Error parsing SSH node data:', err);
      }
    }
    
    // NO limpiar el ref aquí - se limpiará después de procesar el drop
    
    // Si es un nodo SSH, intentar abrir en split
    console.log('🟢 Checking SSH node:', { 
      hasSSHNodeData: !!sshNodeData, 
      nodeType: sshNodeData?.type, 
      hasOpenInSplit: !!openInSplit,
      sshNodeData 
    });
    
    if (sshNodeData && sshNodeData.type === 'ssh-node') {
      console.log('🟢 SSH node detected, openInSplit available:', !!openInSplit);
      
      if (!openInSplit) {
        console.error('🟢 openInSplit is not available!');
        setDraggedTabIndex(null);
        setDragOverTabIndex(null);
        // Limpiar el ref después de procesar
        draggedSSHNodeRef.current = null;
        return;
      }
      
      const filtered = getFilteredTabs();
      const dropTab = filtered[dropIndex];
      
      if (!dropTab) {
        console.log('🟢 No drop tab found');
        setDraggedTabIndex(null);
        setDragOverTabIndex(null);
        // Limpiar el ref después de procesar
        draggedSSHNodeRef.current = null;
        return;
      }
      
      // Solo permitir drop sobre pestañas de terminal o split
      if (dropTab.type === 'terminal' || dropTab.type === 'split') {
        console.log('🟢 Opening SSH in split:', { sshNode: sshNodeData, dropTab });
        // Crear un objeto nodo compatible con openInSplit
        const sshNode = {
          key: sshNodeData.key,
          label: sshNodeData.label,
          data: sshNodeData.data
        };
        
        // Determinar orientación (vertical por defecto, pero podría detectarse según la posición del mouse)
        const orientation = 'vertical'; // Por defecto vertical, podría mejorarse detectando la posición
        
        // Llamar a openInSplit
        try {
          openInSplit(sshNode, dropTab, orientation);
          console.log('🟢 openInSplit called successfully');
        } catch (err) {
          console.error('🟢 Error calling openInSplit:', err);
        }
        
        setDraggedTabIndex(null);
        setDragOverTabIndex(null);
        // Limpiar el ref después de procesar exitosamente
        draggedSSHNodeRef.current = null;
        return;
      } else {
        console.log('🟢 Drop tab is not terminal or split:', dropTab.type);
        // Limpiar el ref si no es una pestaña válida
        draggedSSHNodeRef.current = null;
      }
    } else {
      console.log('🟢 No SSH node data:', { sshNodeData, hasOpenInSplit: !!openInSplit });
    }
    
    // Comportamiento normal: reordenar pestañas
    if (!setOpenTabOrder || !setActiveTabIndex) return;
    
    const dragIndex = draggedTabIndex;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDraggedTabIndex(null);
      setDragOverTabIndex(null);
      return;
    }
    
    const filtered = getFilteredTabs();
    const draggedTab = filtered[dragIndex];
    const dropTab = filtered[dropIndex];

    if (!draggedTab || !dropTab) {
      setDraggedTabIndex(null);
      setDragOverTabIndex(null);
      return;
    }

    const isHome = (t) => t && (t.type === 'home' || t.label === 'Inicio');
    
    // Verificar si el botón de inicio está bloqueado
    const isHomeButtonLocked = localStorage.getItem('lock_home_button') === 'true';
    
    // Si está bloqueado, no permitir mover la pestaña de inicio
    if (isHomeButtonLocked && isHome(draggedTab)) {
      setDraggedTabIndex(null);
      setDragOverTabIndex(null);
      return;
    }
    
    // Si está bloqueado, no permitir soltar sobre la pestaña de inicio
    if (isHomeButtonLocked && isHome(dropTab)) {
      setDraggedTabIndex(null);
      setDragOverTabIndex(null);
      return;
    }
    

    // Obtener todas las claves de pestañas en el orden actual
    const allTabKeys = filtered.map(t => t.key);
    
    // Encontrar los índices de origen y destino
    const fromIndex = allTabKeys.indexOf(draggedTab.key);
    const toIndex = dropIndex;
    
    if (fromIndex === -1 || fromIndex === toIndex) {
      setDraggedTabIndex(null);
      setDragOverTabIndex(null);
      return;
    }

    // Crear el nuevo orden de pestañas
    const newOrder = [...allTabKeys];
    const [movedKey] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedKey);

    // Actualizar el orden de pestañas
    setOpenTabOrder(newOrder);
    setActiveTabIndex(toIndex);
    
    setDraggedTabIndex(null);
    setDragOverTabIndex(null);
  };

  const handleTabDragEnd = () => {
    // Limpiar timer si existe
    if (dragStartTimer) {
      clearTimeout(dragStartTimer);
      setDragStartTimer(null);
    }
    setDraggedTabIndex(null);
    setDragOverTabIndex(null);
    // Limpiar el nodo SSH arrastrado si existe
    draggedSSHNodeRef.current = null;
  };

  return {
    // Estados
    draggedTabIndex,
    dragOverTabIndex,
    dragStartTimer,

    // Funciones
    handleTabDragStart,
    handleTabDragOver,
    handleTabDragLeave,
    handleTabDrop,
    handleTabDragEnd,
    
    // Exportar el ref para que Sidebar pueda usarlo
    draggedSSHNodeRef
  };
};
