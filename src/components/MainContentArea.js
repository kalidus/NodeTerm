import React, { useState, useRef, useEffect } from 'react';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { TabView, TabPanel } from 'primereact/tabview';
import { Card } from 'primereact/card';
import { ContextMenu } from 'primereact/contextmenu';
import { Button } from 'primereact/button';
import Sidebar from './Sidebar';
import TabHeader from './TabHeader';
import TabContentRenderer from './TabContentRenderer';
import TabContextMenu from './contextmenus/TabContextMenu';
import TerminalContextMenu from './contextmenus/TerminalContextMenu';
import OverflowMenu from './contextmenus/OverflowMenu';
import { TAB_TYPES } from '../utils/constants';

const MainContentArea = ({
  // Sidebar props
  sidebarCollapsed,
  setSidebarCollapsed,
  sidebarVisible,
  handleResize,
  handleResizeThrottled,
  memoizedSidebarProps,
  
  // Tab management props
  homeTabs,
  sshTabs,
  setSshTabs,
  fileExplorerTabs,
  rdpTabs,
  guacamoleTabs,
  activeGroupId,
  setActiveGroupId,
  getTabsInGroup,
  activeTabIndex,
  setActiveTabIndex,
  activatingNowRef,
  setGroupActiveIndices,
  setLastOpenedTabKey,
  setOnCreateActivateTabKey,
  GROUP_KEYS,
  
  // Tab rendering props
  renderGroupTabs,
  filteredTabs,
  
  // Tab header props
  memoizedTabProps,
  tabHandlers,
  dragOverTabIndex,
  
  // Content renderer props
  memoizedContentRendererProps,
  sshStatsByTabId,
  
  // Context menu props
  tabContextMenu,
  setTabContextMenu,
  terminalContextMenu,
  setTerminalContextMenu,
  showOverflowMenu,
  setShowOverflowMenu,
  overflowMenuPosition,
  overflowMenuItems,
  
  // Tab context menu props
  tabGroups,
  moveTabToGroup,
  setShowCreateGroupDialog,
  isGroupFavorite,
  addGroupToFavorites,
  removeGroupFromFavorites,
  deleteGroup,
  toast,
  
  // Selected node props
  selectedNodeKey,
  
  // Terminal handlers
  handleCopyFromTerminalWrapper,
  handlePasteToTerminalWrapper,
  handleSelectAllTerminalWrapper,
  handleClearTerminalWrapper,
  
  // Theme props
  isHomeTabActive,
  localTerminalBg,
  
  // Tree context menu
  isGeneralTreeMenu,
  getGeneralTreeContextMenuItems,
  getTreeContextMenuItems,
  selectedNode,
  treeContextMenuRef
}) => {
  // Estados para las flechas de navegación de pestañas
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabsContainerRef = useRef(null);
  
  // Estado para recordar último tipo de terminal local
  const [lastLocalTerminalType, setLastLocalTerminalType] = useState('powershell');
  // Referencia para mantener el último tipo usado de forma síncrona
  const lastLocalTerminalTypeRef = useRef('powershell');
  
  // Función para detectar el último tipo de terminal local usado
  const getLastLocalTerminalType = () => {
    // Usar el estado actual de sshTabs en lugar de getTabsInGroup para evitar problemas de sincronización
    const allTabs = [...homeTabs, ...sshTabs, ...fileExplorerTabs];
    console.log('Todas las pestañas (estado actual):', allTabs.map(tab => ({ key: tab.key, type: tab.type, terminalType: tab.terminalType, label: tab.label })));
    
    // Buscar la última pestaña de terminal local (tipo 'local-terminal')
    const localTerminalTabs = allTabs.filter(tab => tab.type === 'local-terminal');
    console.log('Pestañas de terminal local encontradas:', localTerminalTabs.length);
    
    if (localTerminalTabs.length > 0) {
      // Ordenar por fecha de creación y tomar la más reciente
      const lastLocalTab = localTerminalTabs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      console.log('Última pestaña local:', lastLocalTab);
      
      if (lastLocalTab.terminalType === 'ubuntu' || lastLocalTab.terminalType === 'wsl-distro') {
        // Si tiene información de distribución específica, usar esa distribución
        if (lastLocalTab.distroInfo && lastLocalTab.distroInfo.name) {
          console.log('Usando distribución específica:', `wsl-${lastLocalTab.distroInfo.name}`);
          return `wsl-${lastLocalTab.distroInfo.name}`;
        }
        console.log('Usando WSL genérico');
        return 'wsl'; // Fallback a WSL genérico
      }
      console.log('Usando tipo de terminal:', lastLocalTab.terminalType || 'powershell');
      return lastLocalTab.terminalType || 'powershell';
    }
    
    // Si no hay terminales locales, usar el último tipo guardado
    console.log('No hay terminales locales, usando último tipo guardado:', lastLocalTerminalType);
    return lastLocalTerminalType;
  };
  
  // Ref y estado para el menú contextual de selección de terminal
  const terminalSelectorMenuRef = useRef(null);
  
  // Estado para las opciones del menú de terminales
  const [terminalMenuItems, setTerminalMenuItems] = useState([]);
  
  // Contador para IDs de terminales locales - iniciar desde 1000 para evitar colisiones con Home
  const localTerminalCounterRef = useRef(1000);
  
  // Estado para distribuciones WSL disponibles
  const [wslDistributions, setWslDistributions] = useState([]);
  
  // Generar opciones del menú de terminales
  useEffect(() => {
    const platform = window.electron?.platform || 'unknown';
    
    if (platform === 'win32') {
      const menuItems = [
        {
          label: 'PowerShell',
          icon: 'pi pi-desktop',
          command: () => {
            setLastLocalTerminalType('powershell');
            createLocalTerminalTab('powershell');
          }
        },
        {
          label: 'WSL',
          icon: 'pi pi-server',
          command: () => {
            setLastLocalTerminalType('wsl');
            createLocalTerminalTab('wsl');
          }
        },
        {
          label: 'Cygwin',
          icon: 'pi pi-code',
          command: () => {
            setLastLocalTerminalType('cygwin');
            createLocalTerminalTab('cygwin');
          }
        }
      ];
      
      // Agregar distribuciones WSL detectadas dinámicamente
      if (wslDistributions && wslDistributions.length > 0) {
        wslDistributions.forEach(distro => {
          menuItems.push({
            label: distro.label,
            icon: distro.icon || 'pi pi-circle',
            command: () => {
              setLastLocalTerminalType(distro.name);
              createLocalTerminalTab(distro.name, distro);
            }
          });
        });
      }
      
      setTerminalMenuItems(menuItems);
    } else {
      setTerminalMenuItems([
        {
          label: 'Terminal',
          icon: 'pi pi-desktop',
          command: () => {
            setLastLocalTerminalType('linux-terminal');
            createLocalTerminalTab('linux-terminal');
          }
        }
      ]);
    }
  }, [wslDistributions]);
  
  // Detectar distribuciones WSL disponibles al montar el componente
  useEffect(() => {
    const detectWSLDistributions = async () => {
      try {
        if (window.electron && window.electron.ipcRenderer) {
          const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
          if (Array.isArray(distributions)) {
            setWslDistributions(distributions);
          } else {
            setWslDistributions([]);
          }
        } else {
          setWslDistributions([]);
        }
      } catch (error) {
        console.error('Error detecting WSL distributions:', error);
        setWslDistributions([]);
      }
    };
    
    detectWSLDistributions();
  }, []);
  
  // Efecto para añadir botones después de las pestañas usando DOM
  useEffect(() => {
    const navContainer = tabsContainerRef.current;
    if (!navContainer) return;
    
    const navList = navContainer.querySelector('.p-tabview-nav');
    if (!navList) return;
    
    // Eliminar botones existentes si los hay para recrearlos
    const existingButtons = navList.querySelector('.local-terminal-buttons');
    if (existingButtons) {
      existingButtons.remove();
    }
    
    // Crear contenedor de botones
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'local-terminal-buttons';
    buttonsContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: 8px;
      flex-shrink: 0;
    `;
    
    // Botón +
    const plusButton = document.createElement('button');
    plusButton.innerHTML = '<i class="pi pi-plus"></i>';
    plusButton.className = 'p-button p-button-text p-button-sm';
    plusButton.style.cssText = `
      color: var(--ui-sidebar-text, #cccccc) !important;
      padding: 0 !important;
      min-width: 15px !important;
      width: 15px !important;
      height: 15px !important;
      font-size: 8px !important;
      background: transparent !important;
      background-color: transparent !important;
      border: none !important;
      border-radius: 2px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
    `;
    
    // Aplicar color del tema al icono
    const plusIcon = plusButton.querySelector('i');
    if (plusIcon) {
      plusIcon.style.setProperty('color', 'var(--ui-sidebar-text, #cccccc)', 'important');
    }
    plusButton.title = 'Nueva terminal local';
    plusButton.addEventListener('mouseenter', () => {
      plusButton.style.setProperty('background-color', 'var(--ui-sidebar-hover, rgba(255, 255, 255, 0.1))', 'important');
      plusButton.style.setProperty('color', 'var(--ui-sidebar-text, #cccccc)', 'important');
      const icon = plusButton.querySelector('i');
      if (icon) icon.style.setProperty('color', 'var(--ui-sidebar-text, #cccccc)', 'important');
    });
    plusButton.addEventListener('mouseleave', () => {
      plusButton.style.setProperty('background-color', 'transparent', 'important');
      plusButton.style.setProperty('color', 'var(--ui-sidebar-text, #cccccc)', 'important');
      const icon = plusButton.querySelector('i');
      if (icon) icon.style.setProperty('color', 'var(--ui-sidebar-text, #cccccc)', 'important');
    });
    plusButton.addEventListener('click', () => {
      // Usar la referencia que se actualiza de forma síncrona
      const terminalTypeToUse = lastLocalTerminalTypeRef.current;
      console.log('Botón + presionado. Usando último tipo guardado (ref):', terminalTypeToUse);
      
      // Buscar la distribución correcta
      let distro = null;
      if (terminalTypeToUse.startsWith('wsl-')) {
        // Extraer el nombre de la distribución (ej: 'wsl-Ubuntu' -> 'Ubuntu')
        const distroName = terminalTypeToUse.replace('wsl-', '');
        console.log('Distribuciones disponibles:', wslDistributions.map(d => d.name));
        distro = wslDistributions.find(d => d.name === distroName);
        console.log('Buscando distribución:', distroName, 'Encontrada:', distro);
      }
      
      createLocalTerminalTab(terminalTypeToUse, distro || null);
    });
    
    // Botón dropdown
    const dropdownButton = document.createElement('button');
    dropdownButton.innerHTML = '<i class="pi pi-chevron-down"></i>';
    dropdownButton.className = 'p-button p-button-text p-button-sm';
    dropdownButton.style.cssText = `
      color: var(--ui-sidebar-text, #cccccc) !important;
      padding: 0 !important;
      min-width: 15px !important;
      width: 15px !important;
      height: 15px !important;
      font-size: 7px !important;
      background: transparent !important;
      background-color: transparent !important;
      border: none !important;
      border-radius: 2px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
    `;
    
    // Aplicar color del tema al icono
    const dropdownIcon = dropdownButton.querySelector('i');
    if (dropdownIcon) {
      dropdownIcon.style.setProperty('color', 'var(--ui-sidebar-text, #cccccc)', 'important');
    }
    dropdownButton.title = 'Seleccionar tipo de terminal';
    dropdownButton.addEventListener('mouseenter', () => {
      dropdownButton.style.setProperty('background-color', 'var(--ui-sidebar-hover, rgba(255, 255, 255, 0.1))', 'important');
      dropdownButton.style.setProperty('color', 'var(--ui-sidebar-text, #cccccc)', 'important');
      const icon = dropdownButton.querySelector('i');
      if (icon) icon.style.setProperty('color', 'var(--ui-sidebar-text, #cccccc)', 'important');
    });
    dropdownButton.addEventListener('mouseleave', () => {
      dropdownButton.style.setProperty('background-color', 'transparent', 'important');
      dropdownButton.style.setProperty('color', 'var(--ui-sidebar-text, #cccccc)', 'important');
      const icon = dropdownButton.querySelector('i');
      if (icon) icon.style.setProperty('color', 'var(--ui-sidebar-text, #cccccc)', 'important');
    });
    dropdownButton.addEventListener('click', (e) => {
      terminalSelectorMenuRef.current?.show(e);
    });
    
    buttonsContainer.appendChild(plusButton);
    buttonsContainer.appendChild(dropdownButton);
    navList.appendChild(buttonsContainer);
  }, [filteredTabs, activeTabIndex, wslDistributions]); // Recrear botones cuando cambien las pestañas o distribuciones
  
  // Función para crear una nueva pestaña de terminal local independiente
  const createLocalTerminalTab = (terminalType, distroInfo = null) => {
    if (activeGroupId !== null) {
      const currentGroupKey = activeGroupId || 'no-group';
      setGroupActiveIndices(prev => ({
        ...prev,
        [currentGroupKey]: activeTabIndex
      }));
      setActiveGroupId(null);
    }
    
    setSshTabs(prevTabs => {
      const nowTs = Date.now();
      // Usar formato simple con contador alto para evitar colisiones: tab-1000, tab-1001, etc.
      const tabId = `tab-${localTerminalCounterRef.current}`;
      localTerminalCounterRef.current += 1;
      
      // Registrar eventos para el nuevo tab en el backend de Electron
      if (window.electron) {
        window.electron.ipcRenderer.send('register-tab-events', tabId);
      }
      
      // Determinar el label según el tipo de terminal
      let label = 'Terminal';
      let finalTerminalType = terminalType;
      
      // Si hay distroInfo, usamos sus datos
      if (distroInfo) {
        label = distroInfo.label;
        finalTerminalType = distroInfo.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
      } else {
        // Si no hay distroInfo, usar lógica anterior
        switch(terminalType) {
          case 'powershell':
            label = 'PowerShell';
            break;
          case 'wsl':
            label = 'WSL';
            break;
          case 'wsl-ubuntu':
            label = 'Ubuntu 24.04';
            finalTerminalType = 'ubuntu';
            break;
          case 'wsl-ubuntu-old':
            label = 'Ubuntu';
            finalTerminalType = 'ubuntu';
            break;
          case 'wsl-kali':
            label = 'Kali Linux';
            finalTerminalType = 'wsl-distro';
            break;
          case 'wsl-debian':
            label = 'Debian';
            finalTerminalType = 'wsl-distro';
            break;
          case 'linux-terminal':
            label = 'Terminal';
            break;
          default:
            label = 'Terminal';
        }
      }
      
      const newTab = {
        key: tabId,
        label: label,
        type: 'local-terminal',
        terminalType: finalTerminalType,
        distroInfo: distroInfo, // Información completa de la distribución
        createdAt: nowTs,
        groupId: null
      };
      
      // Activar como última abierta (índice 1) y registrar orden de apertura
      setLastOpenedTabKey(tabId);
      setOnCreateActivateTabKey(tabId);
      setActiveTabIndex(1);
      setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
      
      // Actualizar el último tipo de terminal local usado
      let typeToStore;
      if (finalTerminalType === 'ubuntu' || finalTerminalType === 'wsl-distro') {
        // Para distribuciones específicas, reconstruir el tipo correcto
        if (distroInfo && distroInfo.name) {
          typeToStore = `wsl-${distroInfo.name}`; // ej: 'wsl-ubuntu'
        } else {
          typeToStore = 'wsl'; // fallback
        }
      } else {
        typeToStore = finalTerminalType; // ej: 'powershell', 'wsl'
      }
      
      console.log('Debug - terminalType:', terminalType, 'finalTerminalType:', finalTerminalType, 'distroInfo:', distroInfo, 'typeToStore:', typeToStore);
      
      setLastLocalTerminalType(typeToStore);
      lastLocalTerminalTypeRef.current = typeToStore; // Actualizar la referencia también
      console.log('Actualizando lastLocalTerminalType a:', typeToStore);
      
      console.log('Nueva pestaña creada:', newTab);
      console.log('Todas las pestañas después de crear:', [newTab, ...prevTabs]);
      
      return [newTab, ...prevTabs];
    });
  };
  
  // Funciones para controlar el scroll de pestañas
  const checkScrollButtons = () => {
    if (!tabsContainerRef.current) return;
    
    const container = tabsContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth - 1);
  };
  
  const scrollTabs = (direction) => {
    if (!tabsContainerRef.current) return;
    
    const container = tabsContainerRef.current;
    const scrollAmount = 200; // Píxeles a desplazar
    const newScrollLeft = direction === 'left' 
      ? Math.max(0, container.scrollLeft - scrollAmount)
      : Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + scrollAmount);
    
    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };
  
  // Efectos para verificar botones de scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      checkScrollButtons();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [filteredTabs]);
  
  useEffect(() => {
    const handleResize = () => {
      setTimeout(checkScrollButtons, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Efecto para agregar event listener al contenedor de pestañas
  useEffect(() => {
    // Buscar el elemento de navegación de PrimeReact
    const findTabNav = () => {
      const tabNav = document.querySelector('.main-tab-view .p-tabview-nav');
      if (tabNav) {
        tabsContainerRef.current = tabNav;
        tabNav.addEventListener('scroll', checkScrollButtons);
        checkScrollButtons(); // Verificar estado inicial
        return true;
      }
      return false;
    };
    
    // Intentar encontrar el elemento con un pequeño delay
    const timer = setTimeout(() => {
      if (!findTabNav()) {
        // Si no se encuentra, intentar de nuevo
        const retryTimer = setTimeout(findTabNav, 500);
        return () => clearTimeout(retryTimer);
      }
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (tabsContainerRef.current) {
        tabsContainerRef.current.removeEventListener('scroll', checkScrollButtons);
      }
    };
  }, [filteredTabs]);
  
  // Ancho fijo para restauración del botón (ancho inicial de la app)
  const FIXED_EXPANDED_SIZE = 18; // 18% - ancho inicial cuando se abre la app
  // Estado de tamaño actual del sidebar (en %), usado cuando está expandido
  const [sidebarSizePercent, setSidebarSizePercent] = React.useState(FIXED_EXPANDED_SIZE);
  

  // Función personalizada para manejar toggle del sidebar
  const handleSidebarToggle = React.useCallback((toggleFunctionOrValue) => {
    // Determinar el nuevo estado
    let newCollapsedState;
    if (typeof toggleFunctionOrValue === 'function') {
      newCollapsedState = toggleFunctionOrValue(sidebarCollapsed);
    } else {
      newCollapsedState = toggleFunctionOrValue;
    }
    
    // Si se expande por botón, restaurar tamaño fijo
    if (newCollapsedState === false) {
      setSidebarSizePercent(FIXED_EXPANDED_SIZE);
    }
    // Proceder con el cambio de estado
    setSidebarCollapsed(newCollapsedState);
  }, [sidebarCollapsed, setSidebarCollapsed, FIXED_EXPANDED_SIZE]);

  // Función de resize sin colapso automático (para arrastre libre)
  const handleResizeOnly = (e) => {
    // No llamar handleResize durante el arrastre para evitar interferencias
  };

  // Función de colapso automático solo al terminar el arrastre
  const handleResizeEndWithAutoCollapse = (e) => {
    
    // Calcular ancho real del panel en píxeles
    const splitterElement = document.querySelector('.main-splitter');
    if (splitterElement) {
      const splitterWidth = splitterElement.offsetWidth;
      const sidebarPercentage = e.sizes[0];
      const sidebarWidthPx = (splitterWidth * sidebarPercentage) / 100;
      
      // Umbrales optimizados para expansión muy fácil
      const collapseThresholdPx = 80;   // Colapsar antes del límite físico
      const expandThresholdPx = 60;     // Expandir muy fácilmente desde colapsado
      
      
      // Guardar el tamaño resultante del arrastre
      setSidebarSizePercent(sidebarPercentage);
      
      // Solo evaluar colapso/expansión al soltar el mouse
      if (!sidebarCollapsed && sidebarWidthPx <= collapseThresholdPx) {
        requestAnimationFrame(() => {
          setSidebarCollapsed(true);
        });
      } else if (sidebarCollapsed && sidebarWidthPx > expandThresholdPx) {
        requestAnimationFrame(() => {
          // Respetar el tamaño arrastrado al expandir
          setSidebarSizePercent(sidebarPercentage);
          setSidebarCollapsed(false);
        });
      }
    }
    
    // Llamar al resize original solo al final (para redimensionar terminales)
    if (handleResize) {
      handleResize(e);
    }
  };

  // Aplicar ancho actual del sidebar sin remount
  React.useEffect(() => {
    const splitterElement = document.querySelector('.main-splitter');
    if (!splitterElement) return;
    const panels = splitterElement.querySelectorAll('.p-splitter-panel');
    if (!panels || panels.length === 0) return;

    const leftPanel = panels[0];

    if (!sidebarCollapsed) {
      // Expandido: aplicar tamaño actual deseado
      try {
        leftPanel.style.flexBasis = `${sidebarSizePercent}%`;
        leftPanel.style.width = '';
        leftPanel.style.minWidth = '';
        leftPanel.style.maxWidth = '';
      } catch {}
    } else {
      // Colapsado: asegurar anchura mínima visual (alineado con estilos del panel)
      try {
        leftPanel.style.flexBasis = '44px';
      } catch {}
    }
  }, [sidebarCollapsed, sidebarSizePercent]);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', width: '100%' }}>
      <Splitter 
        style={{ height: '100%', width: '100%' }} 
        onResizeEnd={handleResizeEndWithAutoCollapse}
        onResize={handleResizeOnly} // Sin colapso durante arrastre
        disabled={false}
        className="main-splitter"
        pt={{
          gutter: {
            style: {
              transition: 'none', // Clave: sin transición para fluidez
              background: 'transparent', // Línea invisible pero área de detección amplia
              borderColor: 'transparent',
              width: '8px', // Área mucho más amplia para mejor detección
              cursor: 'col-resize', // Asegurar cursor correcto
              margin: '0 -4px' // Centrar el área de detección más amplia
            }
          }
        }}
      >
        <SplitterPanel 
          size={sidebarCollapsed ? 4 : sidebarSizePercent} 
          minSize={sidebarCollapsed ? 4 : 4} 
          maxSize={sidebarCollapsed ? 4 : 35}
          style={sidebarCollapsed 
            ? { width: 44, minWidth: 44, maxWidth: 44, padding: 0, height: '100%', transition: 'none', display: 'flex', flexDirection: 'column' }
            : { padding: 0, height: '100%', transition: 'none', display: 'flex', flexDirection: 'column' }
          }
          pt={{
            root: {
              style: {
                minWidth: '44px !important',
                width: 'auto'
              }
            }
          }}
        >
          <Sidebar 
            {...memoizedSidebarProps} 
            setSidebarCollapsed={handleSidebarToggle}
          />
        </SplitterPanel>
        
        <SplitterPanel size={sidebarVisible ? 85 : 100} style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minWidth: 0, 
          width: '100%', 
          height: '100%',
          background: isHomeTabActive ? localTerminalBg : undefined
        }}>
          {(homeTabs.length > 0 || sshTabs.length > 0 || fileExplorerTabs.length > 0) ? (
            <div style={{ 
              width: '100%', 
              minWidth: 0, 
              minHeight: 0, 
              display: 'flex', 
              flexDirection: 'column', 
              flex: 1, 
              height: '100%',
              background: isHomeTabActive ? localTerminalBg : undefined
            }}>
              {/* Barra de grupos como TabView scrollable */}
              {renderGroupTabs()}
              
              <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                {/* Solo mostrar TabView de pestañas si el grupo no está vacío */}
                {!(activeGroupId !== null && getTabsInGroup(activeGroupId).length === 0) && (
                  <div style={{ position: 'relative' }}>
                    <TabView 
                      activeIndex={activeTabIndex} 
                      onTabChange={(e) => {
                        if (activatingNowRef.current) return; // bloquear cambios durante activación forzada
                        setActiveTabIndex(e.index);
                        // Solo guardar el nuevo índice si el grupo actual tiene pestañas
                        const currentGroupKey = activeGroupId || GROUP_KEYS.DEFAULT;
                        const currentTabs = getTabsInGroup(activeGroupId);
                        
                        if (currentTabs.length > 0) {
                          setGroupActiveIndices(prev => ({
                            ...prev,
                            [currentGroupKey]: e.index
                          }));
                        }
                      }}
                      renderActiveOnly={false}
                      scrollable={true}
                      className="main-tab-view"
                      pt={{
                        navContainer: {
                          ref: tabsContainerRef,
                          style: {
                            borderBottom: '0.5px solid var(--ui-tabgroup-border, #444)',
                            opacity: 1.0
                          }
                        }
                      }}
                    >
                    {filteredTabs.map((tab, idx) => {
                      // Con las pestañas híbridas, todas las pestañas visibles están en el contexto home, SSH o explorer
                      // OJO: como reordenamos virtualmente (pin a índice 1), no podemos fiarnos de idx
                      const isHomeTab = tab.type === TAB_TYPES.HOME;
                      const isSSHTab = tab.type === TAB_TYPES.TERMINAL || tab.type === TAB_TYPES.SPLIT || tab.isExplorerInSSH;
                      const originalIdx = idx; // No usamos originalIdx para decisiones críticas
                      
                      return (
                        <TabPanel 
                          key={tab.key} 
                          header={tab.label}
                          headerTemplate={(options) => (
                            <TabHeader
                              // Props de PrimeReact
                              className={options.className}
                              onClick={options.onClick}
                              onKeyDown={options.onKeyDown}
                              leftIcon={options.leftIcon}
                              rightIcon={options.rightIcon}
                              style={options.style}
                              selected={options.selected}
                              
                              // Props específicas
                              tab={tab}
                              idx={idx}
                              
                              // Estados de drag & drop
                              isDragging={memoizedTabProps.draggedTabIndex === idx}
                              isDragOver={dragOverTabIndex === idx}
                              dragStartTimer={memoizedTabProps.dragStartTimer}
                              draggedTabIndex={memoizedTabProps.draggedTabIndex}
                              
                              // Props de iconos
                              tabDistros={memoizedTabProps.tabDistros}
                              
                              // Event handlers (memoizados)
                              onTabDragStart={tabHandlers.onTabDragStart}
                              onTabDragOver={tabHandlers.onTabDragOver}
                              onTabDragLeave={tabHandlers.onTabDragLeave}
                              onTabDrop={tabHandlers.onTabDrop}
                              onTabDragEnd={tabHandlers.onTabDragEnd}
                              onTabContextMenu={tabHandlers.onTabContextMenu}
                              onTabClose={tabHandlers.onTabClose}
                            />
                          )}
                        />
                      );
                    })}
                    </TabView>
                    
                    {/* Flecha izquierda */}
                    {canScrollLeft && (
                      <Button
                        icon="pi pi-chevron-left"
                        className="p-button-text p-button-sm tab-nav-arrow"
                        style={{
                          position: 'absolute',
                          left: '4px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 1000,
                          color: 'var(--ui-tab-text) !important',
                          padding: '2px',
                          minWidth: '16px',
                          width: '16px',
                          height: '16px',
                          fontSize: '8px',
                          background: 'rgba(0, 0, 0, 0.3) !important',
                          border: 'none !important',
                          borderRadius: '2px',
                          opacity: 0.9,
                          transition: 'opacity 0.2s ease'
                        }}
                        pt={{
                          root: {
                            style: {
                              color: 'var(--ui-tab-text) !important',
                              background: 'rgba(0, 0, 0, 0.3) !important',
                              border: 'none !important'
                            }
                          },
                          icon: {
                            style: {
                              color: 'var(--ui-tab-text) !important'
                            }
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.opacity = '0.9';
                        }}
                        onClick={() => scrollTabs('left')}
                        aria-label="Desplazar pestañas a la izquierda"
                        title="Desplazar pestañas a la izquierda"
                      />
                    )}
                    
                    {/* Flecha derecha */}
                    {canScrollRight && (
                      <Button
                        icon="pi pi-chevron-right"
                        className="p-button-text p-button-sm tab-nav-arrow"
                        style={{
                          position: 'absolute',
                          right: '4px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 1000,
                          color: 'var(--ui-tab-text) !important',
                          padding: '2px',
                          minWidth: '16px',
                          width: '16px',
                          height: '16px',
                          fontSize: '8px',
                          background: 'rgba(0, 0, 0, 0.3) !important',
                          border: 'none !important',
                          borderRadius: '2px',
                          opacity: 0.9,
                          transition: 'opacity 0.2s ease'
                        }}
                        pt={{
                          root: {
                            style: {
                              color: 'var(--ui-tab-text) !important',
                              background: 'rgba(0, 0, 0, 0.3) !important',
                              border: 'none !important'
                            }
                          },
                          icon: {
                            style: {
                              color: 'var(--ui-tab-text) !important'
                            }
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.opacity = '0.9';
                        }}
                        onClick={() => scrollTabs('right')}
                        aria-label="Desplazar pestañas a la derecha"
                        title="Desplazar pestañas a la derecha"
                      />
                    )}
                    
                    {/* ContextMenu para seleccionar tipo de terminal */}
                    <ContextMenu
                      ref={terminalSelectorMenuRef}
                      className="context-menu-themed"
                      model={terminalMenuItems}
                    />
                  </div>
                )}
                
                
                {/* Menús contextuales refactorizados */}
                <TabContextMenu
                  tabContextMenu={tabContextMenu}
                  setTabContextMenu={setTabContextMenu}
                  tabGroups={tabGroups}
                  moveTabToGroup={moveTabToGroup}
                  setShowCreateGroupDialog={setShowCreateGroupDialog}
                  isGroupFavorite={isGroupFavorite}
                  addGroupToFavorites={addGroupToFavorites}
                  removeGroupFromFavorites={removeGroupFromFavorites}
                  getTabsInGroup={getTabsInGroup}
                  deleteGroup={deleteGroup}
                  toast={toast}
                />

                <TerminalContextMenu
                  terminalContextMenu={terminalContextMenu}
                  setTerminalContextMenu={setTerminalContextMenu}
                  onCopy={handleCopyFromTerminalWrapper}
                  onPaste={handlePasteToTerminalWrapper}
                  onSelectAll={handleSelectAllTerminalWrapper}
                  onClear={handleClearTerminalWrapper}
                />

                <OverflowMenu
                  showOverflowMenu={showOverflowMenu}
                  setShowOverflowMenu={setShowOverflowMenu}
                  overflowMenuPosition={overflowMenuPosition}
                  overflowMenuItems={overflowMenuItems}
                />
              </div>
              
              <div style={{ 
                flexGrow: 1, 
                position: 'relative',
                background: isHomeTabActive ? localTerminalBg : undefined
              }}>
                {/* SIEMPRE renderizar todas las pestañas para preservar conexiones SSH */}
                {/* Overlay para grupo vacío se muestra por encima */}
                {activeGroupId !== null && getTabsInGroup(activeGroupId).length === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ui-content-bg, #222)',
                    color: '#888', textAlign: 'center', padding: '2rem 0',
                    zIndex: 1000,
                    backdropFilter: 'blur(2px)'
                  }}>
                    <i className="pi pi-folder-open" style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }} />
                    <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Este grupo está vacío</div>
                    <div style={{ fontSize: 15, marginBottom: 0 }}>Crea una nueva pestaña o arrastra aquí una existente.</div>
                  </div>
                )}
                
                {/* SIEMPRE renderizar TODAS las pestañas para preservar conexiones SSH */}
                {[...homeTabs, ...sshTabs, ...rdpTabs, ...guacamoleTabs, ...fileExplorerTabs].map((tab) => {
                  const isInActiveGroup = filteredTabs.some(filteredTab => filteredTab.key === tab.key);
                  const tabIndexInActiveGroup = filteredTabs.findIndex(filteredTab => filteredTab.key === tab.key);
                  const isActiveTab = isInActiveGroup && tabIndexInActiveGroup === activeTabIndex;
                  
                  return (
                    <div 
                      key={tab.key}
                      style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        width: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        visibility: isActiveTab ? 'visible' : 'hidden',
                        zIndex: isActiveTab ? 1 : 0,
                        pointerEvents: isActiveTab ? 'auto' : 'none',
                        background: (tab.type === TAB_TYPES.HOME && isActiveTab) ? localTerminalBg : undefined
                      }}
                    >
                      <TabContentRenderer
                        tab={tab}
                        isActiveTab={isActiveTab}
                        // Props memoizadas
                        {...memoizedContentRendererProps}
                        // Terminal props (específicas)
                        sshStatsByTabId={sshStatsByTabId}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card title="Contenido Principal" style={{ flex: 1, minWidth: 0, minHeight: 0, height: '100%' }}>
              <p className="m-0">
                Bienvenido a la aplicación de escritorio. Seleccione un archivo del panel lateral para ver su contenido.
              </p>
              {selectedNodeKey && (
                <div className="mt-3">
                  <p>Elemento seleccionado: {Object.keys(selectedNodeKey)[0]}</p>
                </div>
              )}
              <div className="mt-3">
                <p>Puedes arrastrar y soltar elementos en el panel lateral para reorganizarlos.</p>
                <p>Haz clic en el botón "+" para crear carpetas nuevas.</p>
                <p>Para eliminar un elemento, haz clic en el botón de la papelera que aparece al pasar el ratón.</p>
              </div>
            </Card>
          )}
        </SplitterPanel>
      </Splitter>

      {/* Context Menu para el árbol de la sidebar */}
      <ContextMenu
        ref={treeContextMenuRef}
        model={isGeneralTreeMenu ? getGeneralTreeContextMenuItems() : getTreeContextMenuItems(selectedNode)}
        breakpoint="767px"
      />
    </div>
  );
};

export default MainContentArea;
