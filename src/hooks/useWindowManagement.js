import { useState, useEffect, useRef, useCallback } from 'react';

const EXPANDED_KEYS_STORAGE_KEY = 'basicapp2_sidebar_expanded_keys';

export const useWindowManagement = ({ getFilteredTabs, activeTabIndex, resizeTerminals, nodes }) => {
  // ============ ESTADOS DE VENTANA Y SIDEBAR ============
  
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  // ============ FUNCIONES DE RESIZE ============
  
  // Función principal de resize
  const handleResize = useCallback(() => {
    const filteredTabs = getFilteredTabs();
    const activeTab = filteredTabs[activeTabIndex];
    
    if (!activeTab) return;

    // Cancelar resize anterior si existe
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    // Usar requestAnimationFrame para optimizar el redimensionamiento
    resizeTimeoutRef.current = setTimeout(() => {
      resizeTerminals(activeTab, [], []); // homeTabs y fileExplorerTabs los pasamos vacíos ya que están en el hook de tabs
    }, 16); // ~60fps
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
  
  // Función para expandir o plegar todas las carpetas
  const toggleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedKeys({});
      setAllExpanded(false);
    } else {
      // Recorrer todos los nodos y marcar los folders como expandidos
      const newExpandedKeys = {};
      
      const traverseNodes = (nodeList) => {
        for (const node of nodeList) {
          if (node.droppable || node.children) {
            newExpandedKeys[node.key] = true;
          }
          if (node.children && node.children.length > 0) {
            traverseNodes(node.children);
          }
        }
      };
      
      traverseNodes(nodes || []);
      setExpandedKeys(newExpandedKeys);
      setAllExpanded(true);
    }
  }, [allExpanded, nodes, expandedKeys]);

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
        clearTimeout(resizeTimeoutRef.current);
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
