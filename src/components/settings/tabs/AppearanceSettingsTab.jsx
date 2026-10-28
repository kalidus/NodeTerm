import React, { useRef, useCallback } from 'react';
import ThemeSelector from '../../ThemeSelector';
import LayoutThemeSelector from '../../LayoutThemeSelector';
import TerminalSettingsTab from '../../TerminalSettingsTab';
import StatusBarSettingsTab from '../../StatusBarSettingsTab';
import TabThemeSelector from '../../TabThemeSelector';
import PresetSelector from '../../PresetSelector';
import SessionExplorerSubTab from './appearance/SessionExplorerSubTab';
import FileExplorerSubTab from './appearance/FileExplorerSubTab';
import SplashScreenSubTab from './appearance/SplashScreenSubTab';
import UnlockScreenSubTab from './appearance/UnlockScreenSubTab';
import HomePageSubTab from './appearance/HomePageSubTab';

export const AppearanceSettingsTab = ({
  activeSubTab = 'interfaz',
  toastRef,
  // Terminal Props
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  terminalTheme,
  setTerminalTheme,
  availableFonts,
  localFontFamily,
  setLocalFontFamily,
  localFontSize,
  setLocalFontSize,
  localPowerShellTheme,
  setLocalPowerShellTheme,
  localLinuxTerminalTheme,
  setLocalLinuxTerminalTheme,
  localDockerTerminalTheme,
  setLocalDockerTerminalTheme,
  dockerFontFamily,
  setDockerFontFamily,
  dockerFontSize,
  setDockerFontSize,
  defaultLocalTerminal,
  defaultTerminalOptions,
  onDefaultTerminalChange,
  // StatusBar Props
  statusBarTheme,
  setStatusBarTheme,
  statusBarIconTheme,
  setStatusBarIconTheme,
  statusBarPollingInterval,
  setStatusBarPollingInterval,
  statusBarLayout,
  setStatusBarLayout,
  // Session Explorer Props
  treeTheme,
  setTreeTheme,
  iconThemeSidebar,
  setIconThemeSidebar,
  sessionActionIconTheme,
  setSessionActionIconTheme,
  uiFont,
  uiFontSize,
  sidebarFontColor,
  setSidebarFontColor,
  folderIconSize,
  connectionIconSize,
  // File Explorer Props
  explorerColorTheme,
  setExplorerColorTheme,
  iconTheme,
  setIconTheme
}) => {
  const colorTimeoutRef = useRef(null);

  const handleSidebarFontColorChange = useCallback((newColor) => {
    if (colorTimeoutRef.current) {
      clearTimeout(colorTimeoutRef.current);
      colorTimeoutRef.current = null;
    }
    if (!setSidebarFontColor) return;
    if (!newColor) {
      setSidebarFontColor('');
      return;
    }
    colorTimeoutRef.current = setTimeout(() => {
      setSidebarFontColor(newColor);
    }, 150);
  }, [setSidebarFontColor]);

  return (
    <div className="apariencia-tab-container" style={{ right: '8px', width: 'calc(100% - 8px)' }}>
      {activeSubTab === 'interfaz' && (
        <ThemeSelector
          showPreview={true}
          uiFont={uiFont}
          uiFontSize={uiFontSize}
        />
      )}

      {activeSubTab === 'layouts' && (
        <LayoutThemeSelector />
      )}

      {activeSubTab === 'terminal' && (
        <TerminalSettingsTab
          fontFamily={fontFamily}
          setFontFamily={setFontFamily}
          fontSize={fontSize}
          setFontSize={setFontSize}
          terminalTheme={terminalTheme}
          setTerminalTheme={setTerminalTheme}
          availableFonts={availableFonts}
          localFontFamily={localFontFamily}
          setLocalFontFamily={setLocalFontFamily}
          localFontSize={localFontSize}
          setLocalFontSize={setLocalFontSize}
          localPowerShellTheme={localPowerShellTheme}
          setLocalPowerShellTheme={setLocalPowerShellTheme}
          localLinuxTerminalTheme={localLinuxTerminalTheme}
          setLocalLinuxTerminalTheme={setLocalLinuxTerminalTheme}
          localDockerTerminalTheme={localDockerTerminalTheme}
          setLocalDockerTerminalTheme={setLocalDockerTerminalTheme}
          localDockerFontFamily={dockerFontFamily}
          setLocalDockerFontFamily={setDockerFontFamily}
          localDockerFontSize={dockerFontSize}
          setLocalDockerFontSize={setDockerFontSize}
          defaultLocalTerminal={defaultLocalTerminal}
          defaultTerminalOptions={defaultTerminalOptions}
          onDefaultTerminalChange={onDefaultTerminalChange}
        />
      )}

      {activeSubTab === 'status-bar' && (
        <StatusBarSettingsTab
          statusBarTheme={statusBarTheme}
          setStatusBarTheme={setStatusBarTheme}
          statusBarIconTheme={statusBarIconTheme}
          setStatusBarIconTheme={setStatusBarIconTheme}
          statusBarPollingInterval={statusBarPollingInterval}
          setStatusBarPollingInterval={setStatusBarPollingInterval}
          statusBarLayout={statusBarLayout}
          setStatusBarLayout={setStatusBarLayout}
        />
      )}

      {activeSubTab === 'explorador-sesiones' && (
        <SessionExplorerSubTab
          treeTheme={treeTheme}
          setTreeTheme={setTreeTheme}
          iconThemeSidebar={iconThemeSidebar}
          setIconThemeSidebar={setIconThemeSidebar}
          sessionActionIconTheme={sessionActionIconTheme}
          setSessionActionIconTheme={setSessionActionIconTheme}
          sidebarFontColor={sidebarFontColor}
          handleSidebarFontColorChange={handleSidebarFontColorChange}
          folderIconSize={folderIconSize}
          connectionIconSize={connectionIconSize}
        />
      )}

      {activeSubTab === 'explorador-archivos' && (
        <FileExplorerSubTab
          explorerColorTheme={explorerColorTheme}
          setExplorerColorTheme={setExplorerColorTheme}
          iconTheme={iconTheme}
          setIconTheme={setIconTheme}
        />
      )}

      {activeSubTab === 'pestanas' && (
        <TabThemeSelector />
      )}

      {activeSubTab === 'presets' && (
        <div className="apariencia-tab-container presets-tab-wrapper">
          <PresetSelector />
        </div>
      )}

      {activeSubTab === 'splash-screen' && (
        <SplashScreenSubTab toastRef={toastRef} />
      )}

      {activeSubTab === 'unlock-screen' && (
        <UnlockScreenSubTab toastRef={toastRef} />
      )}

      {activeSubTab === 'pagina-inicio' && (
        <HomePageSubTab />
      )}
    </div>
  );
};

export default AppearanceSettingsTab;
