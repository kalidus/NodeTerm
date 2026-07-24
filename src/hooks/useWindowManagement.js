import { useState, useEffect, useRef, useCallback } from 'react';
import { STORAGE_KEYS } from '../utils/constants';

const EXPANDED_KEYS_STORAGE_KEY = 'basicapp2_sidebar_expanded_keys';

export const useWindowManagement = ({ getFilteredTabs, activeTabIndex, resizeTerminals, nodes, resizeTimeoutRef }) => {
  // ============ ESTADOS DE VENTANA Y SIDEBAR ============

  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_START_COLLAPSED);
      return saved ? JSON.parse(saved) : false; // Por defecto false (desplegada)
    } catch (error) {
      console.error('Error loading sidebar collapsed state from localStorage:', error);
      return false; // Por defecto desplegada
    }
  });
  // ============ REFERENCIAS ============

  // Ref para throttling del resize
  // const resizeTimeoutRef = useRef(null); // Ahora viene desde fuera
  // Nota: `resizeTimeoutRef` se comparte con otros hooks; evitamos reutilizarlo para ids mixtos (RAF/timeout)
  const resizeRafIdRef = useRef(null);
  const resizeThrottleTimerIdRef = useRef(null);

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

  // Releer preferencia tras sync desde app-data.json (solo al iniciar / sincronizar)
  useEffect(() => {
    const reloadSidebarCollapsed = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_START_COLLAPSED);
        if (saved !== null) {
          setSidebarCollapsed(JSON.parse(saved));
        }
      } catch {
        /* noop */
      }
    };

    window.addEventListener('localstorage-sync-ready', reloadSidebarCollapsed);
    return () => {
      window.removeEventListener('localstorage-sync-ready', reloadSidebarCollapsed);
    };
  }, []);

  // Aplicar "sidebar colapsada al iniciar" solo cuando el usuario cambia esa opción en Ajustes
  useEffect(() => {
    const handleApplySidebarStartCollapsed = (event) => {
      const collapsed = event?.detail?.collapsed;
      if (typeof collapsed === 'boolean') {
        setSidebarCollapsed(collapsed);
      }
    };

    window.addEventListener('apply-sidebar-start-collapsed', handleApplySidebarStartCollapsed);
    return () => {
      window.removeEventListener('apply-sidebar-start-collapsed', handleApplySidebarStartCollapsed);
    };
  }, []);

  // ============ FUNCIONES DE RESIZE ============

  // Función principal de resize (optimizada para fluidez)
  const handleResize = useCallback(() => {
    const filteredTabs = getFilteredTabs();
    const activeTab = filteredTabs[activeTabIndex];

    if (!activeTab) return;

    // Cancelar resize anterior si existe
    if (resizeRafIdRef.current) cancelAnimationFrame(resizeRafIdRef.current);

    // Usar requestAnimationFrame para máxima fluidez
    resizeRafIdRef.current = requestAnimationFrame(() => {
      resizeTerminals(activeTab, [], []); // homeTabs y fileExplorerTabs los pasamos vacíos ya que están en el hook de tabs
    });
  }, [getFilteredTabs, activeTabIndex, resizeTerminals]);

  // Versión con throttling para onResize del splitter
  const handleResizeThrottled = useCallback(() => {
    if (resizeThrottleTimerIdRef.current) clearTimeout(resizeThrottleTimerIdRef.current);

    resizeThrottleTimerIdRef.current = setTimeout(() => {
      handleResize();
    }, 32); // ~30fps - Optimización para macOS donde el redimensionamiento es más pesado
  }, [handleResize]);



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
    let done = false;
    let fallbackTimeoutId = null;
    let idleId = null;

    const runOnce = () => {
      if (done) return;
      done = true;
      handleResize();
    };

    const sidebarEl = document.querySelector('.sidebar-container');
    const tr = sidebarEl ? window.getComputedStyle(sidebarEl).transition : '';
    const hasTransition = !!sidebarEl && tr !== 'none' && !/^all 0s|^none/i.test(tr || '');

    const onTransitionEnd = (e) => {
      if (e?.propertyName && !['width', 'flex-basis', 'max-width', 'min-width'].includes(e.propertyName)) return;
      runOnce();
    };

    if (sidebarEl?.addEventListener && hasTransition) {
      sidebarEl.addEventListener('transitionend', onTransitionEnd, { passive: true });
      fallbackTimeoutId = setTimeout(runOnce, 320);
    } else {
      // Sin transición: doble rAF para que layout termine (~32ms) - más predecible que requestIdleCallback
      const rafId = requestAnimationFrame(() => {
        requestAnimationFrame(runOnce);
      });
      return () => {
        cancelAnimationFrame(rafId);
      };
    }

    return () => {
      if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
      if (idleId != null && typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(idleId);
      if (sidebarEl?.removeEventListener && hasTransition) {
        sidebarEl.removeEventListener('transitionend', onTransitionEnd);
      }
    };
  }, [sidebarCollapsed, handleResize]); // Se ejecuta cuando cambia el estado del sidebar

  // Optimización para redimensionamiento fluido del splitter
  useEffect(() => {
    const handleResizeStart = (e) => {
      const target = e.target;
      if (
        target &&
        (target.classList?.contains('p-splitter-gutter') ||
          target.closest?.('.p-splitter-gutter') ||
          target.classList?.contains('p-splitter-gutter-handle'))
      ) {
        document.body.classList.add('is-splitter-resizing');
        document.querySelectorAll('.p-splitter').forEach(el => el.classList.add('p-splitter-resizing'));
        document.documentElement.style.setProperty('--sidebar-transition', 'none');
      }
    };

    const handleResizeEnd = () => {
      document.body.classList.remove('is-splitter-resizing');
      document.querySelectorAll('.p-splitter').forEach(el => el.classList.remove('p-splitter-resizing'));
      document.documentElement.style.removeProperty('--sidebar-transition');
    };

    // Eventos globales con captura para inicio y fin del redimensionamiento
    document.addEventListener('mousedown', handleResizeStart, true);
    document.addEventListener('mouseup', handleResizeEnd, true);

    return () => {
      document.removeEventListener('mousedown', handleResizeStart, true);
      document.removeEventListener('mouseup', handleResizeEnd, true);
      document.body.classList.remove('is-splitter-resizing');
    };
  }, []);

  // ============ CLEANUP ============

  // Cleanup del timeout al desmontar
  useEffect(() => {
    return () => {
      if (resizeRafIdRef.current) cancelAnimationFrame(resizeRafIdRef.current);
      if (resizeThrottleTimerIdRef.current) clearTimeout(resizeThrottleTimerIdRef.current);
    };
  }, []);

  return {
    // Estados de ventana y sidebar
    sidebarVisible,
    setSidebarVisible,
    sidebarCollapsed,
    setSidebarCollapsed,


    // Referencias
    resizeTimeoutRef,

    // Funciones de resize
    handleResize,
    handleResizeThrottled
  };
};
