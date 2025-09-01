import { useState } from 'react';

export const useDragAndDrop = (tabManagementProps = {}) => {
  const {
    getFilteredTabs,
    openTabOrder,
    setOpenTabOrder,
    setActiveTabIndex
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
    
    if (!getFilteredTabs || !setOpenTabOrder || !setActiveTabIndex) return;
    
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
    handleTabDragEnd
  };
};
