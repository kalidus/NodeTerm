import React, { useState, useEffect } from 'react';
import SplitLayout from './SplitLayout';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';
import { Divider } from 'primereact/divider';
import { getVersionInfo } from '../version-info';
import TabbedTerminal from './TabbedTerminal';
import SystemStats from './SystemStats';
import ConnectionHistory from './ConnectionHistory';
import QuickActions from './QuickActions';
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
  localFontFamily,
  localFontSize,
  localPowerShellTheme,
  localLinuxTerminalTheme,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [terminalState, setTerminalState] = useState('normal'); // 'normal', 'minimized', 'maximized'
  const versionInfo = getVersionInfo();

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
  const currentTheme = themeManager.getCurrentTheme() || uiThemes['Light'];
  const dashboardBg = currentTheme.colors?.contentBackground || '#fafafa';
  const localTerminalBg = themes[localLinuxTerminalTheme]?.theme?.background || '#222';

  const handleConnectToHistory = (connection) => {
    // console.log('Conectando a:', connection);
    if (onCreateSSHConnection) {
      onCreateSSHConnection(connection);
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

  // Panel superior: Dashboard moderno sin pestañas
  const topPanel = (
    <div style={{
      height: '100%',
      overflow: 'hidden',
      background: dashboardBg,
      display: 'flex',
      flexDirection: 'column',
      opacity: terminalState === 'maximized' ? 0 : 1, // Ocultar completamente cuando maximizado
      visibility: terminalState === 'maximized' ? 'hidden' : 'visible', // Evitar interacciones
      transition: 'opacity 0.1s ease, visibility 0.1s ease' // Transición más rápida como minimizar
    }}>
      {/* Contenido principal del dashboard (sin tabs) */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        <SystemStats />
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

  const splitterColor = currentTheme.colors?.splitter || dashboardBg;

  return (
    <SplitLayout
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