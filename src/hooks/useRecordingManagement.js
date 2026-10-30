/**
 * Hook para gestionar grabaciones de sesiones SSH
 */
import { useState, useCallback, useRef } from 'react';

export const useRecordingManagement = (toast) => {
  // Validar que toast existe
  if (!toast) {
    console.warn('useRecordingManagement: toast es undefined');
  }
  
  // Estado para trackear qué tabs están grabando
  const [recordingTabs, setRecordingTabs] = useState(new Set());
  const recordingInfoRef = useRef({});

  /**
   * Inicia grabación para un tab
   */
  const startRecording = useCallback(async (tabKey, tabInfo) => {
    try {
      // Obtener información del terminal
      const metadata = {
        cols: tabInfo?.cols || 80,
        rows: tabInfo?.rows || 24,
        title: tabInfo?.label || `Session ${tabKey}`,
        host: tabInfo?.sshConfig?.host || 'unknown',
        username: tabInfo?.sshConfig?.username || 'unknown',
        port: tabInfo?.sshConfig?.port || 22,
        connectionType: 'ssh',
        useBastionWallix: tabInfo?.sshConfig?.useBastionWallix || false,
        bastionHost: tabInfo?.sshConfig?.bastionHost || null,
        bastionUser: tabInfo?.sshConfig?.bastionUser || null,
        sessionName: tabInfo?.label || null,
        shell: '/bin/bash'
      };

      const result = await window.electron.ipcRenderer.invoke('recording:start', {
        tabId: tabKey,
        metadata
      });

      if (result.success) {
        setRecordingTabs(prev => new Set([...prev, tabKey]));
        recordingInfoRef.current[tabKey] = {
          recordingId: result.recordingId,
          startTime: Date.now()
        };

        toast?.current?.show({
          severity: 'success',
          summary: '🔴 Grabación iniciada',
          detail: `Grabando sesión: ${metadata.title}`,
          life: 3000
        });

        return { success: true, recordingId: result.recordingId };
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error iniciando grabación:', error);
      toast?.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: `No se pudo iniciar la grabación: ${error.message}`,
        life: 5000
      });
      return { success: false, error: error.message };
    }
  }, [toast]);

  /**
   * Detiene grabación para un tab
   */
  const stopRecording = useCallback(async (tabKey) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('recording:stop', {
        tabId: tabKey
      });

      if (result.success) {
        setRecordingTabs(prev => {
          const newSet = new Set(prev);
          newSet.delete(tabKey);
          return newSet;
        });

        const info = recordingInfoRef.current[tabKey];
        delete recordingInfoRef.current[tabKey];

        const duration = info ? Math.round((Date.now() - info.startTime) / 1000) : 0;

        toast?.current?.show({
          severity: 'success',
          summary: '⏹️ Grabación detenida',
          detail: `Grabación guardada (${duration}s, ${result.eventCount || 0} eventos)`,
          life: 4000
        });

        if (result.recordingId) {
          window.dispatchEvent(new CustomEvent('refresh-audit-tab'));
        }

        return { success: true, ...result };
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error deteniendo grabación:', error);
      toast?.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: `No se pudo detener la grabación: ${error.message}`,
        life: 5000
      });
      return { success: false, error: error.message };
    }
  }, [toast]);

  /**
   * Verifica si un tab está grabando
   */
  const isRecording = useCallback((tabKey) => {
    return recordingTabs.has(tabKey);
  }, [recordingTabs]);

  /**
   * Obtiene información de grabación activa
   */
  const getRecordingInfo = useCallback((tabKey) => {
    return recordingInfoRef.current[tabKey] || null;
  }, []);

  /**
   * Pausa grabación
   */
  const pauseRecording = useCallback(async (tabKey) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('recording:pause', {
        tabId: tabKey
      });

      if (result.success) {
        toast?.current?.show({
          severity: 'info',
          summary: '⏸️ Grabación pausada',
          detail: 'La grabación se ha pausado',
          life: 2000
        });
        return { success: true };
      }
    } catch (error) {
      console.error('Error pausando grabación:', error);
      return { success: false, error: error.message };
    }
  }, [toast]);

  /**
   * Reanuda grabación
   */
  const resumeRecording = useCallback(async (tabKey) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('recording:resume', {
        tabId: tabKey
      });

      if (result.success) {
        toast?.current?.show({
          severity: 'info',
          summary: '▶️ Grabación reanudada',
          detail: 'La grabación continúa',
          life: 2000
        });
        return { success: true };
      }
    } catch (error) {
      console.error('Error reanudando grabación:', error);
      return { success: false, error: error.message };
    }
  }, [toast]);

  /**
   * Limpieza al cerrar tab
   */
  const cleanupRecording = useCallback((tabKey) => {
    if (recordingTabs.has(tabKey)) {
      // Detener grabación si está activa
      stopRecording(tabKey);
    }
  }, [recordingTabs, stopRecording]);

  return {
    // Estado
    recordingTabs,
    
    // Funciones principales
    startRecording,
    stopRecording,
    isRecording,
    getRecordingInfo,
    
    // Funciones de control
    pauseRecording,
    resumeRecording,
    cleanupRecording
  };
};

