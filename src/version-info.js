// Información de versión centralizada y segura para el entorno del navegador

// Función helper para obtener información de versión de forma segura
const getVersionInfo = () => {
  // Valores por defecto
  const defaultInfo = {
    appVersion: '1.5.3',
    appName: 'NodeTerm',
    buildDate: new Date().toLocaleDateString(),
    electronVersion: 'Unknown',
    nodeVersion: 'Unknown',
    chromeVersion: 'Unknown'
  };

  try {
    // Intentar obtener información del entorno
    const info = {
      appVersion: process?.env?.REACT_APP_VERSION || defaultInfo.appVersion,
      appName: process?.env?.REACT_APP_NAME || defaultInfo.appName,
      buildDate: process?.env?.REACT_APP_BUILD_DATE || defaultInfo.buildDate,
      electronVersion: process?.versions?.electron || defaultInfo.electronVersion,
      nodeVersion: process?.versions?.node || defaultInfo.nodeVersion,
      chromeVersion: process?.versions?.chrome || defaultInfo.chromeVersion
    };

    return info;
  } catch (error) {
    console.warn('Error getting version info, using defaults:', error);
    return defaultInfo;
  }
};

// Obtener información desde el proceso principal de Electron si está disponible
const getElectronVersionInfo = async () => {
  try {
    if (window.electron && window.electron.ipcRenderer && window.electron.ipcRenderer.invoke) {
      // Solicitar información de versión al proceso principal
      const versions = await window.electron.ipcRenderer.invoke('get-version-info');
      return versions || {};
    } else {
      console.log('IPC invoke not available, using default version info');
    }
  } catch (error) {
    console.warn('Could not get Electron version info:', error);
  }
  return {};
};

export { getVersionInfo, getElectronVersionInfo }; 