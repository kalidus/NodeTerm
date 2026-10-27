import { useState, useEffect, useCallback } from 'react';

const TRASH_STORAGE_KEY = 'nodeterm_trash_connections';

const loadTrash = () => {
  try {
    return JSON.parse(localStorage.getItem(TRASH_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

/**
 * Estado y acciones de la papelera de conexiones del Sidebar.
 * @param {{ setNodes: Function, showToast?: Function }} deps
 */
export function useSidebarTrash({ setNodes, showToast } = {}) {
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [trashedConnections, setTrashedConnections] = useState(loadTrash);
  // null | { type: 'empty' } | { type: 'single', id, label }
  const [trashConfirm, setTrashConfirm] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(trashedConnections));
    } catch (e) {
      console.warn('Error guardando papelera:', e);
    }
  }, [trashedConnections]);

  const moveToTrash = useCallback((nodeKey, nodeLabel, nodeData) => {
    const trashItem = {
      id: `trash_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      key: nodeKey,
      label: nodeLabel,
      type: 'connection',
      deletedAt: new Date().toISOString(),
      nodeData,
    };
    setTrashedConnections(prev => [trashItem, ...prev]);
  }, []);

  const restoreFromTrash = useCallback((trashId) => {
    const item = trashedConnections.find(i => i.id === trashId);
    if (!item || !item.nodeData) return;
    setNodes(prev => [item.nodeData, ...prev]);
    setTrashedConnections(prev => prev.filter(i => i.id !== trashId));
    showToast && showToast({
      severity: 'success',
      summary: 'Restaurado',
      detail: `"${item.label}" restaurado al árbol`,
      life: 3000
    });
  }, [trashedConnections, setNodes, showToast]);

  const deleteFromTrashPermanently = useCallback((trashId, label) => {
    setTrashConfirm({ type: 'single', id: trashId, label });
  }, []);

  const emptyTrash = useCallback(() => {
    setTrashConfirm({ type: 'empty' });
  }, []);

  const executeTrashConfirm = useCallback(() => {
    if (!trashConfirm) return;
    if (trashConfirm.type === 'empty') {
      setTrashedConnections([]);
    } else if (trashConfirm.type === 'single') {
      setTrashedConnections(prev => prev.filter(i => i.id !== trashConfirm.id));
    }
    setTrashConfirm(null);
  }, [trashConfirm]);

  const closeTrashModal = useCallback(() => {
    setShowTrashModal(false);
    setTrashConfirm(null);
  }, []);

  return {
    showTrashModal,
    setShowTrashModal,
    trashedConnections,
    trashConfirm,
    setTrashConfirm,
    moveToTrash,
    restoreFromTrash,
    deleteFromTrashPermanently,
    emptyTrash,
    executeTrashConfirm,
    closeTrashModal,
  };
}
