import { useState, useEffect, useRef, useCallback } from 'react';
import { STORAGE_KEYS } from '../utils/constants';

const EXPANDED_KEYS_STORAGE_KEY = 'basicapp2_sidebar_expanded_keys';

export const useWindowManagement = ({ getFilteredTabs, activeTabIndex, resizeTerminals, nodes }) => {
  // ============ ESTADOS DE VENTANA Y SIDEBAR ============
  
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_START_COLLAPSED);
      return saved ? JSON.parse(saved) : true; // Por defecto true (colapsada)
    } catch (error) {
      console.error('Error loading sidebar collapsed state from localStorage:', error);
      return true; // Por defecto colapsada
    }
  });
  const [allExpanded, setAllExpanded] = useState(false);

  // Estado para expandedKeys, inicializado desde localStorage si existe
  const [expandedKeys, setExpandedKeys] = useState(() => {
    try {
      const saved = localStorage.getItem(EXPANDED_KEYS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading expanded keys from localStorage:', error);
      return {};
    }
  });

  // ============ REFERENCIAS ============
  
  // Ref para throttling del resize
  const resizeTimeoutRef = useRef(null);

  // ============ EFECTOS PARA PERSISTENCIA ============
  
  // Guardar expandedKeys en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem(EXPANDED_KEYS_STORAGE_KEY, JSON.stringify(expandedKeys));
  }, [expandedKeys]);

  // ============ EFECTOS PARA EVENTOS GLOBALES ============
  
  // Escuchar evento para expandir sidebar
  useEffect(() => {
    const handleExpandSidebar = () => {
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    };
    
    window.addEventListener('expand-sidebar', handleExpandSidebar);
    
    return () => {
      window.removeEventListener('expand-sidebar', handleExpandSidebar);
    };
  }, [sidebarCollapsed]);

  // ============ FUNCIONES DE RESIZE ============
  
  // Función principal de resize (optimizada para fluidez)
  const handleResize = useCallback(() => {
    const filteredTabs = getFilteredTabs();
    const activeTab = filteredTabs[activeTabIndex];
    
    if (!activeTab) return;

    // Cancelar resize anterior si existe
    if (resizeTimeoutRef.current) {
      cancelAnimationFrame(resizeTimeoutRef.current);
    }
    
    // Usar requestAnimationFrame para máxima fluidez
    resizeTimeoutRef.current = requestAnimationFrame(() => {
      resizeTerminals(activeTab, [], []); // homeTabs y fileExplorerTabs los pasamos vacíos ya que están en el hook de tabs
    });
  }, [getFilteredTabs, activeTabIndex, resizeTerminals]);
  
  // Versión con throttling para onResize del splitter
  const handleResizeThrottled = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      handleResize();
    }, 16); // ~60fps
  }, [handleResize]);

  // ============ FUNCIONES DE EXPANSIÓN ============
  
  // Función para expandir o plegar solo las carpetas de primer nivel
  const toggleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedKeys({});
      setAllExpanded(false);
    } else {
      // Solo expandir carpetas de primer nivel
      const newExpandedKeys = {};
      
      // Solo recorrer los nodos de primer nivel (no recursivo)
      for (const node of nodes || []) {
        if (node.droppable || node.children) {
          newExpandedKeys[node.key] = true;
        }
      }
      
      setExpandedKeys(newExpandedKeys);
      setAllExpanded(true);
    }
  }, [allExpanded, nodes]);

  // expandAllFolders ya no es necesaria como función separada

  // ============ EFECTOS DE RESIZE ============
  
  // useEffect para redimensionar cuando cambia la pestaña activa
  useEffect(() => {
    // Cuando cambiamos de pestaña, la terminal necesita recalcular su tamaño
    // para ajustarse al contenedor que ahora es visible.
    // Llamar inmediatamente para que el servidor SSH reciba las dimensiones correctas
    handleResize();
  }, [activeTabIndex, handleResize]); // Se ejecuta cuando cambia la pestaña activa

  // useEffect para redimensionar terminal cuando se colapsa/expande el sidebar
  useEffect(() => {
    // Necesitamos un pequeño delay para que el CSS termine la transición
    const timeoutId = setTimeout(() => {
      handleResize();
    }, 250); // Coincide con la duración de la transición CSS (0.2s + buffer)
    
    return () => clearTimeout(timeoutId);
  }, [sidebarCollapsed, handleResize]); // Se ejecuta cuando cambia el estado del sidebar

  // Optimización para redimensionamiento fluido del splitter
  useEffect(() => {
    const splitterElement = document.querySelector('.p-splitter');
    if (!splitterElement) return;

    const handleResizeStart = (e) => {
      // Solo aplicar optimizaciones si el click es en el gutter
      if (e.target.classList.contains('p-splitter-gutter')) {
        splitterElement.classList.add('p-splitter-resizing');
        // Deshabilitar transiciones durante el redimensionamiento para mejor rendimiento
        document.documentElement.style.setProperty('--sidebar-transition', 'none');
      }
    };

    const handleResizeEnd = () => {
      splitterElement.classList.remove('p-splitter-resizing');
      // Reactivar transiciones después del redimensionamiento
      document.documentElement.style.removeProperty('--sidebar-transition');
    };

    // Eventos para detectar inicio y fin del redimensionamiento
    splitterElement.addEventListener('mousedown', handleResizeStart);
    document.addEventListener('mouseup', handleResizeEnd);
    
    return () => {
      splitterElement.removeEventListener('mousedown', handleResizeStart);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  // ============ CLEANUP ============
  
  // Cleanup del timeout al desmontar
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        cancelAnimationFrame(resizeTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Estados de ventana y sidebar
    sidebarVisible,
    setSidebarVisible,
    sidebarCollapsed,
    setSidebarCollapsed,
    allExpanded,
    setAllExpanded,
    expandedKeys,
    setExpandedKeys,
    
    // Referencias
    resizeTimeoutRef,
    
    // Funciones de resize
    handleResize,
    handleResizeThrottled,
    
    // Funciones de expansión
    toggleExpandAll
  };
};
