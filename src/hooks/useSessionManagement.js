import { useState, useEffect, useRef, useCallback } from 'react';
import SessionManager from '../services/SessionManager';
import { createTerminalActionWrapper, hideContextMenu, handleUnblockForms } from '../utils/tabEventHandlers';

export const useSessionManagement = (toast) => {
  // Referencias para terminales
  const terminalRefs = useRef({});
  const activeListenersRef = useRef(new Set());
  
  // Session Manager
  const sessionManager = useRef(new SessionManager()).current;
  
  // Estado global para stats por tabId
  const [sshStatsByTabId, setSshStatsByTabId] = useState({});
  
  // Estado para trackear conexiones SSH
  const [sshConnectionStatus, setSshConnectionStatus] = useState({});

  // Efectos de inicialización
  useEffect(() => {
    // Configurar listeners de SSH si están disponibles
    if (window.electron && window.electron.ipcRenderer) {
      // Listener para estadísticas SSH
      window.electron.ipcRenderer.on('ssh:stats', (data) => {
        if (data && data.tabId) {
          setSshStatsByTabId(prev => ({
            ...prev,
            [data.tabId]: data
          }));
        }
      });

      // Cleanup on unmount
      return () => {
        window.electron.ipcRenderer.removeAllListeners('ssh:stats');
      };
    }
  }, []);

  // Funciones de manejo de terminal
  const handleCopyFromTerminal = useCallback((tabKey) => {
    if (window.electron && terminalRefs.current[tabKey]) {
      const terminal = terminalRefs.current[tabKey];
      const selection = terminal.getSelection();
      if (selection) {
        window.electron.clipboard.writeText(selection);
        if (toast?.current?.show) {
          toast.current.show({
            severity: 'success',
            summary: 'Copiado',
            detail: 'Texto copiado al portapapeles',
            life: 2000
          });
        }
      }
    }
  }, [toast]);

  const handlePasteToTerminal = useCallback(async (tabKey) => {
    if (window.electron && terminalRefs.current[tabKey]) {
      try {
        const text = await window.electron.clipboard.readText();
        if (text) {
          const terminal = terminalRefs.current[tabKey];
          
          // Asegurar que el terminal tenga el foco antes de pegar
          terminal.focus();
          
          // Usar un pequeño delay para asegurar que el terminal esté listo
          setTimeout(() => {
            terminal.paste(text);
            // Restaurar el foco después de pegar
            terminal.focus();
          }, 10);
          
          if (toast?.current?.show) {
            toast.current.show({
              severity: 'info',
              summary: 'Pegado',
              detail: 'Texto pegado en el terminal',
              life: 2000
            });
          }
        }
      } catch (error) {
        console.error('Error al pegar texto:', error);
        if (toast?.current?.show) {
          toast.current.show({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo pegar el texto',
            life: 3000
          });
        }
      }
    }
  }, [toast]);

  const handleSelectAllTerminal = useCallback((tabKey) => {
    if (terminalRefs.current[tabKey]) {
      const terminal = terminalRefs.current[tabKey];
      terminal.selectAll();
      if (toast?.current?.show) {
        toast.current.show({
          severity: 'info',
          summary: 'Seleccionado',
          detail: 'Todo el texto del terminal seleccionado',
          life: 2000
        });
      }
    }
  }, [toast]);

  const handleClearTerminal = useCallback((tabKey) => {
    if (terminalRefs.current[tabKey]) {
      const terminal = terminalRefs.current[tabKey];
      // Limpiar el buffer visual del terminal
      terminal.clear();
      // También enviar comando clear al servidor SSH para limpiar la sesión
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.send('ssh:send-command', { tabId: tabKey, command: 'clear\n' });
      }
      if (toast?.current?.show) {
        toast.current.show({
          severity: 'info',
          summary: 'Terminal limpiado',
          detail: 'Pantalla del terminal borrada',
          life: 2000
        });
      }
    }
  }, [toast]);

  // Función para limpiar referencias de terminal
  const cleanupTerminalRef = useCallback((tabKey) => {
    if (terminalRefs.current[tabKey]) {
      delete terminalRefs.current[tabKey];
    }
    if (activeListenersRef.current.has(tabKey)) {
      activeListenersRef.current.delete(tabKey);
    }
    // Limpiar stats también
    setSshStatsByTabId(prev => {
      const newStats = { ...prev };
      delete newStats[tabKey];
      return newStats;
    });
  }, []);

  // Función para desconectar una sesión SSH
  const disconnectSSHSession = useCallback((tabKey) => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('ssh:disconnect', tabKey);
    }
    cleanupTerminalRef(tabKey);
  }, [cleanupTerminalRef]);

  // Función para desconectar sesión split
  const disconnectSplitSession = useCallback((splitTab) => {
    if (splitTab.leftTerminal) {
      disconnectSSHSession(splitTab.leftTerminal.key);
    }
    if (splitTab.rightTerminal) {
      disconnectSSHSession(splitTab.rightTerminal.key);
    }
  }, [disconnectSSHSession]);

  // Función para desconectar sesión RDP-Guacamole
  const disconnectRDPSession = useCallback((tabKey) => {
    try {
      const ref = terminalRefs.current[tabKey];
      if (ref && typeof ref.disconnect === 'function') {
        ref.disconnect();
      }
    } catch (error) {
      console.error('Error al desconectar RDP:', error);
    }
    cleanupTerminalRef(tabKey);
  }, [cleanupTerminalRef]);

  // Función para redimensionar terminales
  const resizeTerminals = useCallback((activeTab) => {
    requestAnimationFrame(() => {
      if (activeTab.type === 'split') {
        // Para splits, redimensionar ambos terminales
        if (activeTab.leftTerminal && terminalRefs.current[activeTab.leftTerminal.key]) {
          terminalRefs.current[activeTab.leftTerminal.key].fit();
        }
        if (activeTab.rightTerminal && terminalRefs.current[activeTab.rightTerminal.key]) {
          terminalRefs.current[activeTab.rightTerminal.key].fit();
        }
      } else if (activeTab.type === 'terminal' && terminalRefs.current[activeTab.key]) {
        // Para terminales normales
        terminalRefs.current[activeTab.key].fit();
      } else if (activeTab.type === 'rdp-guacamole' && terminalRefs.current[activeTab.key]) {
        // Ajustar Guacamole RDP al contenedor cuando cambia el layout (e.g., sidebar)
        terminalRefs.current[activeTab.key].fit();
      }
    });
  }, []);

  // Función para recargar sesiones desde almacenamiento
  const reloadSessionsFromStorage = useCallback(async () => {
    await sessionManager.initialize();
    const sessions = sessionManager.getAllSessions();
    const nodesFromSessions = sessions.map(session => ({
      key: session.id,
      label: session.name,
      data: {
        ...session,
        type: 'ssh',
      },
      draggable: true,
      droppable: false,
      uid: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }));
    return nodesFromSessions;
  }, [sessionManager]);

  // === FUNCIONES WRAPPER DE TERMINAL ===
  const handleCopyFromTerminalWrapper = createTerminalActionWrapper(handleCopyFromTerminal, () => hideContextMenu());
  const handlePasteToTerminalWrapper = createTerminalActionWrapper(handlePasteToTerminal, () => hideContextMenu());
  const handleSelectAllTerminalWrapper = createTerminalActionWrapper(handleSelectAllTerminal, () => hideContextMenu());
  const handleClearTerminalWrapper = createTerminalActionWrapper(handleClearTerminal, () => hideContextMenu());

  // === FUNCIÓN WRAPPER PARA DESBLOQUEAR FORMULARIOS ===
  const handleUnblockFormsWrapper = useCallback(() => handleUnblockForms(toast), [toast]);

  return {
    // Referencias
    terminalRefs,
    activeListenersRef,
    sessionManager,
    
    // Estados
    sshStatsByTabId,
    setSshStatsByTabId,
    sshConnectionStatus,
    setSshConnectionStatus,
    
    // Funciones de terminal
    handleCopyFromTerminal,
    handlePasteToTerminal,
    handleSelectAllTerminal,
    handleClearTerminal,
    
    // Funciones wrapper de terminal
    handleCopyFromTerminalWrapper,
    handlePasteToTerminalWrapper,
    handleSelectAllTerminalWrapper,
    handleClearTerminalWrapper,
    
    // Funciones wrapper adicionales
    handleUnblockFormsWrapper,
    
    // Funciones de gestión de sesiones
    cleanupTerminalRef,
    disconnectSSHSession,
    disconnectSplitSession,
    disconnectRDPSession,
    resizeTerminals,
    reloadSessionsFromStorage
  };
};
