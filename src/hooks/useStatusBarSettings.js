import { useEffect } from 'react';
import { useLocalStorageString, useLocalStorageNumber } from './useLocalStorage';

export const useStatusBarSettings = () => {
  // StatusBar icon theme usando useLocalStorage
  const [statusBarIconTheme, setStatusBarIconTheme] = useLocalStorageString('basicapp_statusbar_icon_theme', 'classic');
  
  // Estado global para el intervalo de polling de la status bar usando useLocalStorage  
  const [statusBarPollingInterval, setStatusBarPollingInterval] = useLocalStorageNumber('statusBarPollingInterval', 3); // Reducido de 5s a 3s por defecto

  // Enviar al backend cuando cambie el intervalo (localStorage ya se maneja automáticamente)
  useEffect(() => {
    if (window?.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('statusbar:set-polling-interval', statusBarPollingInterval);
    }
  }, [statusBarPollingInterval]);

  // Función para actualizar configuración desde sincronización
  const updateStatusBarFromSync = () => {
    const updatedStatusBarIconTheme = localStorage.getItem('basicapp_statusbar_icon_theme') || 'classic';
    const updatedStatusBarPollingInterval = localStorage.getItem('statusBarPollingInterval');
    
    setStatusBarIconTheme(updatedStatusBarIconTheme);
    if (updatedStatusBarPollingInterval) {
      setStatusBarPollingInterval(parseInt(updatedStatusBarPollingInterval, 10));
    }
  };

  return {
    statusBarIconTheme,
    setStatusBarIconTheme,
    statusBarPollingInterval,
    setStatusBarPollingInterval,
    updateStatusBarFromSync
  };
};
