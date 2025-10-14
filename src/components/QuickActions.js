import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';

const QuickActions = ({ 
  onCreateSSHConnection, 
  onCreateFolder,
  onOpenFileExplorer,
  onOpenSettings,
  sshConnectionsCount = 0,
  foldersCount = 0 
}) => {
  // Estados para terminales detectados dinámicamente
  const [wslDistributions, setWSLDistributions] = useState([]);
  const [cygwinAvailable, setCygwinAvailable] = useState(false);
  const [availableTerminals, setAvailableTerminals] = useState([]);

  // Handlers for actions that don't come from props
  const handleOpenPasswords = () => {
    try {
      window.dispatchEvent(new CustomEvent('open-password-manager'));
    } catch (e) { /* noop */ }
  };

  const handleOpenAuditGlobal = async () => {
    try {
      if (window?.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('recording:list', {});
        if (result && result.success && Array.isArray(result.recordings) && result.recordings.length > 0) {
          const auditTabId = `audit_global_${Date.now()}`;
          window.dispatchEvent(new CustomEvent('create-audit-tab', {
            detail: {
              tabId: auditTabId,
              title: 'Auditoría Global',
              recordings: result.recordings
            }
          }));
        }
      }
    } catch (e) { /* noop */ }
  };

  // Handler genérico para abrir terminales
  const handleOpenTerminal = (terminalType, distroInfo = null) => {
    try {
      window.dispatchEvent(new CustomEvent('create-terminal-tab', {
        detail: { 
          type: terminalType,
          distroInfo: distroInfo
        }
      }));
    } catch (e) { /* noop */ }
  };

  // Detectar distribuciones WSL usando el backend (EXACTA MISMA LÓGICA QUE TabbedTerminal.js)
  useEffect(() => {
    const detectWSLDistributions = async () => {
      try {
        if (window.electron && window.electron.ipcRenderer) {
          const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
          console.log('✅ Distribuciones WSL detectadas:', distributions);
          
          // Verificar que recibimos un array válido
          if (Array.isArray(distributions)) {
            setWSLDistributions(distributions);
            distributions.forEach(distro => console.log(`  - ${distro.label} (${distro.category})`));
          } else {
            console.log('⚠️ Respuesta no es un array, fallback a array vacío');
            setWSLDistributions([]);
          }
        } else {
          console.log('❌ No hay acceso a electron IPC');
          setWSLDistributions([]);
        }
      } catch (error) {
        console.error('❌ Error en detección de distribuciones WSL:', error);
        setWSLDistributions([]);
      }
    };
    
    detectWSLDistributions();
  }, []);

  // Detectar disponibilidad de Cygwin embebido (EXACTA MISMA LÓGICA QUE TabbedTerminal.js)
  useEffect(() => {
    const detectCygwin = async () => {
      if (window.electron && window.electron.platform === 'win32') {
        try {
          // Usar window.electronAPI.invoke que definimos en preload.js
          const result = await window.electronAPI.invoke('cygwin:detect');
          if (result && typeof result.available === 'boolean') {
            setCygwinAvailable(result.available);
            console.log('✅ Cygwin detectado:', result.available);
          } else {
            console.warn('⚠️ Cygwin: Respuesta inválida');
            setCygwinAvailable(false);
          }
        } catch (error) {
          console.error('❌ Error detectando Cygwin:', error);
          setCygwinAvailable(false);
        }
      } else {
        setCygwinAvailable(false);
      }
    };
    
    detectCygwin();
  }, []);

  // Generar lista de terminales disponibles (EXACTA MISMA LÓGICA QUE TabbedTerminal.js)
  useEffect(() => {
    const platform = window.electron?.platform || 'unknown';
    const terminals = [];

    console.log('🔧 Generando terminales para plataforma:', platform);
    console.log('🔧 WSL Distributions:', wslDistributions);
    console.log('🔧 Cygwin available:', cygwinAvailable);

    if (platform === 'win32') {
      // En Windows: mostrar PowerShell, WSL, Cygwin y cada distribución WSL detectada
      const options = [
        { label: 'PowerShell', value: 'powershell', icon: 'pi pi-desktop' },
        { label: 'WSL', value: 'wsl', icon: 'pi pi-server' },
        // Cygwin siempre visible en Windows (se instalará bajo demanda si no existe)
        { 
          label: cygwinAvailable ? 'Cygwin' : 'Cygwin (instalar)', 
          value: 'cygwin', 
          icon: 'pi pi-code',
          color: '#00FF00'
        },
      ];
      
      // Agregar cada distribución WSL como opción separada
      options.push(...wslDistributions.map(distro => ({
        label: distro.label,
        value: `wsl-${distro.name}`,
        icon: distro.icon,
        executable: distro.executable,
        category: distro.category,
        distroName: distro.name,
        distroInfo: distro
      })));
      
      // Convertir a formato de terminales para QuickActions
      options.forEach(option => {
        terminals.push({
          label: option.label,
          value: option.value,
          icon: option.icon,
          color: getColorForCategory(option.category) || '#4fc3f7',
          action: () => handleOpenTerminal(option.value, option.distroInfo),
          distroInfo: option.distroInfo
        });
      });
    } else if (platform === 'linux' || platform === 'darwin') {
      // En Linux/macOS: mostrar terminal nativo
      terminals.push({
        label: 'Terminal',
        value: 'linux-terminal',
        icon: 'pi pi-desktop',
        color: '#4fc3f7',
        action: () => handleOpenTerminal('linux-terminal')
      });
    } else {
      // Fallback para otros sistemas
      terminals.push({
        label: 'Terminal',
        value: 'powershell',
        icon: 'pi pi-desktop',
        color: '#4fc3f7',
        action: () => handleOpenTerminal('powershell')
      });
    }

    console.log('🎯 Lista final de terminales:', terminals);
    setAvailableTerminals(terminals);
  }, [wslDistributions, cygwinAvailable]);

  // Función para obtener colores según la categoría de distribución
  const getColorForCategory = (category) => {
    const colorMap = {
      'ubuntu': '#E95420',
      'debian': '#A81D33',
      'kali': '#557C94',
      'alpine': '#0D597F',
      'opensuse': '#73BA25',
      'fedora': '#294172',
      'centos': '#262577',
      'default': '#8ae234'
    };
    return colorMap[category] || colorMap.default;
  };

  // Segunda fila: Acciones principales
  const quickActionItems = [
    {
      label: 'Nueva Conexión SSH',
      icon: 'pi pi-plus',
      color: '#2196F3',
      description: 'Crear nueva conexión SSH',
      action: onCreateSSHConnection,
      badge: null
    },
    {
      label: 'Nueva Carpeta',
      icon: 'pi pi-folder-plus',
      color: '#4CAF50',
      description: 'Organizar conexiones',
      action: onCreateFolder,
      badge: foldersCount
    },
    {
      label: 'Configuración',
      icon: 'pi pi-cog',
      color: '#9C27B0',
      description: 'Ajustes y preferencias',
      action: onOpenSettings,
      badge: null
    },
    {
      label: 'Auditoría Global',
      icon: 'pi pi-video',
      color: '#EF5350',
      description: 'Ver grabaciones y auditoría',
      action: handleOpenAuditGlobal,
      badge: null
    },
    {
      label: 'Gestor de Contraseñas',
      icon: 'pi pi-key',
      color: '#FFC107',
      description: 'Ver y gestionar passwords',
      action: handleOpenPasswords,
      badge: null
    },
    {
      label: 'Historial',
      icon: 'pi pi-history',
      color: '#795548',
      description: 'Conexiones recientes',
      action: () => {},
      badge: null
    },
    {
      label: 'Favoritos',
      icon: 'pi pi-star',
      color: '#FFD700',
      description: 'Acceso rápido',
      action: () => {},
      badge: null
    }
  ];

  if (onOpenFileExplorer) {
    quickActionItems.splice(2, 0, {
      label: 'Explorador',
      icon: 'pi pi-folder-open',
      color: '#FF9800',
      description: 'Explorar archivos',
      action: onOpenFileExplorer,
      badge: null
    });
  }

  // Función helper para renderizar cards (versión compacta con iconos grandes)
  const renderActionCard = (item, index) => (
    <Card 
      key={index}
      className="quick-action-card"
      style={{ 
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        position: 'relative',
        minHeight: '36px', // Cards más pequeñas
        width: '100%',
        borderRadius: '5px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.15)';
        e.currentTarget.style.borderColor = item.color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        e.currentTarget.style.borderColor = 'var(--surface-border)';
      }}
      onClick={item.action}
    >
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.05rem',
        padding: '0.15rem 0.05rem', // Padding más pequeño
        height: '100%',
        justifyContent: 'center'
      }}>
        {item.badge !== null && (
          <Badge 
            value={item.badge} 
            style={{ 
              position: 'absolute',
              top: '0.05rem',
              right: '0.05rem',
              fontSize: '0.45rem',
              minWidth: '0.7rem',
              height: '0.7rem',
              lineHeight: '0.7rem'
            }}
          />
        )}
        
        <div style={{ 
          width: '18px', // Icono más grande
          height: '18px',
          borderRadius: '50%',
          background: `${item.color}25`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '0.05rem',
          border: `1px solid ${item.color}50`
        }}>
          <i 
            className={item.icon}
            style={{ 
              fontSize: '0.8rem', // Icono más grande
              color: item.color
            }}
          />
        </div>
        
        <h4 style={{ 
          margin: 0,
          color: 'var(--text-color)',
          fontSize: '0.4rem', // Texto más pequeño
          fontWeight: '500',
          textAlign: 'center',
          lineHeight: '0.9',
          letterSpacing: '0.01rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%'
        }}>
          {item.label}
        </h4>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: '0.75rem' }}>
      <h3 style={{ 
        margin: '0 0 0.6rem 0', 
        color: 'var(--text-color)',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontWeight: '600'
      }}>
        <i className="pi pi-bolt" style={{ color: 'var(--primary-color)', fontSize: '0.8rem' }} />
        Acciones Rápidas
      </h3>
      
      {/* Primera fila: Terminales locales */}
      <div style={{ marginBottom: '0.6rem' }}>
        <h4 style={{ 
          margin: '0 0 0.3rem 0', 
          color: 'var(--text-color-secondary)',
          fontSize: '0.7rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontWeight: '500'
        }}>
          <i className="pi pi-terminal" style={{ color: 'var(--primary-color)', fontSize: '0.6rem' }} />
          Terminales Locales
        </h4>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(50px, 1fr))',
          gap: '0.15rem',
          width: '100%'
        }}>
          {availableTerminals.map((item, index) => renderActionCard(item, index))}
        </div>
      </div>

      {/* Segunda fila: Acciones principales */}
      <div>
        <h4 style={{ 
          margin: '0 0 0.3rem 0', 
          color: 'var(--text-color-secondary)',
          fontSize: '0.7rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontWeight: '500'
        }}>
          <i className="pi pi-cog" style={{ color: 'var(--primary-color)', fontSize: '0.6rem' }} />
          Acciones Principales
        </h4>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(50px, 1fr))',
          gap: '0.15rem',
          width: '100%'
        }}>
          {quickActionItems.map((item, index) => renderActionCard(item, index))}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;