import React from 'react';

/**
 * Componente que renderiza el contenido correcto según la pestaña seleccionada
 */
const SettingsContentRenderer = ({
  activeMainTab,
  activeSubTab,
  // Props del SettingsDialog que necesitamos pasar
  children
}) => {
  // Map de tabPanel headers a IDs
  const getContentIndexByTab = () => {
    const tabMap = {
      'general': 0,
      'seguridad': 1,
      'apariencia': 2,
      'rdp': 3,
      'clientes-ia': 4,
      'actualizaciones': 5,
      'sincronizacion': 6,
      'informacion': 7,
      // Subpestañas
      'clave-maestra': 1.1,
      'auditoria': 1.2,
      'interfaz': 2.1,
      'terminal': 2.2,
      'status-bar': 2.3,
      'explorador-sesiones': 2.4,
      'explorador-archivos': 2.5,
      'pestanas': 2.6
    };

    return activeSubTab ? tabMap[activeSubTab] : tabMap[activeMainTab];
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      overflow: 'hidden' 
    }}>
      {children}
    </div>
  );
};

export default SettingsContentRenderer;

