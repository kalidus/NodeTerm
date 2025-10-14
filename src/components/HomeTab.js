import React, { useState, useEffect, useRef } from 'react';
import SplitLayout from './SplitLayout';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';
import { Divider } from 'primereact/divider';
import { getVersionInfo } from '../version-info';
import TabbedTerminal from './TabbedTerminal';
import ConnectionHistory from './ConnectionHistory';
import QuickActions from './QuickActions';
import NodeTermStatus from './NodeTermStatus';
import { uiThemes } from '../themes/ui-themes';
import { themeManager } from '../utils/themeManager';
import { themes } from '../themes';

const HomeTab = ({
  onCreateSSHConnection,
  onCreateFolder,
  onOpenFileExplorer,
  onOpenSettings,
  sshConnectionsCount = 0,
  foldersCount = 0,
  rdpConnectionsCount = 0,
  localFontFamily,
  localFontSize,
  localPowerShellTheme,
  localLinuxTerminalTheme,
  onCreateRdpConnection, // Nuevo prop para crear conexiones RDP
  onEditConnection, // Nuevo prop: editar conexión desde Home (se pasa directo a ConnectionHistory)
  onLoadGroup, // Nuevo prop para cargar grupos desde favoritos
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [terminalState, setTerminalState] = useState('normal'); // 'normal', 'minimized', 'maximized'
  const versionInfo = getVersionInfo();
  const tabbedTerminalRef = useRef();

  // Estado para forzar re-render al cambiar el tema
  const [themeVersion, setThemeVersion] = useState(0);

  // Escuchar cambios en el tema (evento global 'theme-changed')
  useEffect(() => {
    const onThemeChanged = () => {
      setThemeVersion(v => v + 1); // Forzar re-render
    };
    window.addEventListener('theme-changed', onThemeChanged);
    return () => window.removeEventListener('theme-changed', onThemeChanged);
  }, []);

  // Obtener el color de fondo del tema actual
  const currentTheme = React.useMemo(() => {
    return themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [themeVersion]);
  
  const dashboardBg = React.useMemo(() => {
    return currentTheme.colors?.contentBackground || '#fafafa';
  }, [currentTheme]);
  
  const localTerminalBg = React.useMemo(() => {
    return themes[localLinuxTerminalTheme]?.theme?.background || themes[localPowerShellTheme]?.theme?.background || '#222';
  }, [localLinuxTerminalTheme, localPowerShellTheme]);

  const handleConnectToHistory = (connection) => {
    // console.log('Conectando a:', connection);
    if (connection.type === 'group') {
      // Manejar grupos - cargar todas las sesiones del grupo
      handleLoadGroup(connection);
    } else if (connection.type === 'rdp-guacamole') {
      // Manejar conexiones RDP-Guacamole
      handleCreateRdpConnection(connection);
    } else if (onCreateSSHConnection) {
      // Manejar conexiones SSH tradicionales
      onCreateSSHConnection(connection);
    }
  };

  const handleLoadGroup = (groupConnection) => {
    if (onLoadGroup) {
      onLoadGroup(groupConnection);
    }
  };

  const handleCreateRdpConnection = (connectionData) => {
    if (onCreateRdpConnection) {
      onCreateRdpConnection(connectionData);
    }
  };

  // Funciones para controlar el estado del terminal
  const handleMinimizeTerminal = () => {
    const newState = terminalState === 'minimized' ? 'normal' : 'minimized';
    // console.log('🔽 Cambiando estado del terminal:', terminalState, '->', newState);
    setTerminalState(newState);
  };

  const handleMaximizeTerminal = () => {
    const newState = terminalState === 'maximized' ? 'normal' : 'maximized';
    // console.log('🔼 Cambiando estado del terminal:', terminalState, '->', newState);
    setTerminalState(newState);
  };

  // Función para resetear a modo manual cuando el usuario redimensiona
  const handleManualResize = () => {
    if (terminalState !== 'normal') {
      // console.log('🖱️ Redimensionamiento manual detectado, volviendo a modo normal');
      setTerminalState('normal');
    }
  };

  // Determinar el tamaño del panel superior (Dashboard) basado en el estado del terminal
  const getTopPanelSize = () => {
    const containerHeight = window.innerHeight;
    let size;

    switch (terminalState) {
      case 'minimized':
        // Terminal minimizado: Dashboard ocupa casi todo, terminal solo 40px (pestañas)
        size = Math.max(containerHeight - 40, 100); // Mínimo 100px para el dashboard
        break;
      case 'maximized':
        // Terminal maximizado: Dashboard desaparece, terminal ocupa todo
        size = 0;
        break;
      default:
        // Estado normal: permitir redimensionamiento manual
        return null; // No controlar externamente, usar redimensionamiento manual
    }

    // console.log('📏 getTopPanelSize:', {
    //   terminalState,
    //   containerHeight,
    //   topPanelSize: size,
    //   terminalSize: containerHeight - size
    // });

    return size;
  };

  // Panel superior: Hub de conexiones con nuevo layout
  const topPanel = (
    <div style={{
      height: '100%',
      overflow: 'hidden',
      background: dashboardBg,
      display: 'flex',
      flexDirection: 'column',
      opacity: terminalState === 'maximized' ? 0 : 1,
      visibility: terminalState === 'maximized' ? 'hidden' : 'visible',
      transition: 'opacity 0.1s ease, visibility 0.1s ease'
    }}>
      <div className="home-page-scroll" style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        {/* Fila superior: Acciones Rápidas y Estado de NodeTerm */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr', 
          gap: '1rem', 
          marginBottom: '1rem' 
        }}>
          <QuickActions
            onCreateSSHConnection={onCreateSSHConnection}
            onCreateFolder={onCreateFolder}
            onOpenFileExplorer={() => {
              // Abrir un explorador vacío requiere un nodo SSH; si no hay, solo no-op
              try {
                window.dispatchEvent(new CustomEvent('open-explorer-dialog'));
              } catch (e) { /* noop */ }
            }}
            onOpenSettings={() => {
              try {
                window.dispatchEvent(new CustomEvent('open-settings-dialog'));
              } catch (e) { /* noop */ }
            }}
            sshConnectionsCount={sshConnectionsCount}
            foldersCount={foldersCount}
          />
          <NodeTermStatus
            sshConnectionsCount={sshConnectionsCount}
            foldersCount={foldersCount}
            rdpConnectionsCount={rdpConnectionsCount}
          />
        </div>
        
        {/* Fila inferior: Conexiones Favoritas y Recientes */}
        <ConnectionHistory 
          onConnectToHistory={handleConnectToHistory}
          layout="two-columns"
          recentsLimit={10}
          activeIds={new Set()}
          // Layout: 3/2 para que favoritos tenga más ancho que recientes
          templateColumns="3fr 2fr"
          favoritesColumns={2}
          recentsColumns={1}
          onEdit={onEditConnection}
          sshConnectionsCount={sshConnectionsCount}
          foldersCount={foldersCount}
          rdpConnectionsCount={rdpConnectionsCount}
        />
      </div>
    </div>
  );

  // Panel inferior: Terminal con pestañas
  const bottomPanel = (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: localTerminalBg
    }}>
      <TabbedTerminal
        ref={tabbedTerminalRef}
        onMinimize={handleMinimizeTerminal}
        onMaximize={handleMaximizeTerminal}
        terminalState={terminalState}
        localFontFamily={localFontFamily}
        localFontSize={localFontSize}
        localPowerShellTheme={localPowerShellTheme}
        localLinuxTerminalTheme={localLinuxTerminalTheme}
      />
    </div>
  );

  const splitterColor = React.useMemo(() => {
    return currentTheme.colors?.splitter || localTerminalBg || dashboardBg || '#2d2d2d';
  }, [currentTheme, localTerminalBg, dashboardBg]);

  return (
    <SplitLayout
      key={`home-split-${themeVersion}`} // Forzar re-render al cambiar tema
      leftTerminal={{ key: 'home_top', content: topPanel }}
      rightTerminal={{ key: 'home_bottom', content: bottomPanel }}
      orientation="horizontal"
      fontFamily={''}
      fontSize={16}
      theme={{ background: localTerminalBg }}
      onContextMenu={() => {}}
      sshStatsByTabId={{}}
      terminalRefs={{ current: {} }}
      statusBarIconTheme="classic"
      isHomeTab={true}
      externalPaneSize={getTopPanelSize()}
      onManualResize={handleManualResize}
      splitterColor={splitterColor}
    />
  );
};

export default HomeTab;