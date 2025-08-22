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
    
    // No permitir arrastrar la pestaña de Inicio
    if (tab.type === 'home' || tab.label === 'Inicio') return;
    
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
    // No permitir mover/soltar la pestaña de Inicio
    if (isHome(draggedTab) || isHome(dropTab) || (dropIndex === 0 && isHome(filtered[0]))) {
      setDraggedTabIndex(null);
      setDragOverTabIndex(null);
      return;
    }

    // Reordenación global entre tipos usando openTabOrder
    const hasHomeAtZero = filtered.length > 0 && isHome(filtered[0]);
    // Claves visibles (excluyendo Home)
    const visibleKeys = filtered.filter(t => !isHome(t)).map(t => t.key);

    const from = visibleKeys.indexOf(draggedTab.key);
    let to = hasHomeAtZero ? dropIndex - 1 : dropIndex;
    to = Math.max(0, Math.min(visibleKeys.length - 1, to));

    if (from === -1 || from === to) {
      setDraggedTabIndex(null);
      setDragOverTabIndex(null);
      return;
    }

    const reorderedVisible = [...visibleKeys];
    const [movedKey] = reorderedVisible.splice(from, 1);
    reorderedVisible.splice(to, 0, movedKey);

    // Nuevo openTabOrder: primero las visibles reordenadas, luego el resto en su orden actual
    const restKeys = openTabOrder.filter(k => !reorderedVisible.includes(k));
    const newOpenOrder = [...reorderedVisible, ...restKeys];

    setOpenTabOrder(newOpenOrder);
    setActiveTabIndex(dropIndex);
    
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
