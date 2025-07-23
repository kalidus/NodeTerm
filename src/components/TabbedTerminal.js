import React, { useState, useRef, useEffect } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import PowerShellTerminal from './PowerShellTerminal';
import WSLTerminal from './WSLTerminal';
import UbuntuTerminal from './UbuntuTerminal';
import { themes } from '../themes';
import { uiThemes } from '../themes/ui-themes';
import { themeManager } from '../utils/themeManager';

// Utilidad para ajustar brillo de un color hex
function adjustColorBrightness(hex, percent) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, Math.round(r + (percent / 100) * 255)));
    g = Math.min(255, Math.max(0, Math.round(g + (percent / 100) * 255)));
    b = Math.min(255, Math.max(0, Math.round(b + (percent / 100) * 255)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const TabbedTerminal = ({ onMinimize, onMaximize, terminalState, localFontFamily, localFontSize, localPowerShellTheme, localLinuxTerminalTheme }) => {
    // Determinar la pestaña inicial según el SO
    const getInitialTab = () => {
        const platform = window.electron?.platform || 'unknown';
        if (platform === 'linux') {
            return {
                id: 'tab-1',
                title: 'Terminal Linux',
                type: 'powershell', // Reutilizar la lógica de PowerShell
                active: true
            };
        } else if (platform === 'darwin') {
            return {
                id: 'tab-1',
                title: 'Terminal macOS',
                type: 'powershell', // Reutilizar la lógica de PowerShell
                active: true
            };
        }
        return {
            id: 'tab-1',
            title: 'Windows PowerShell',
            type: 'powershell',
            active: true
        };
    };
    
    const [tabs, setTabs] = useState([getInitialTab()]);
    const [nextTabId, setNextTabId] = useState(2);
    // Determinar el tipo de terminal por defecto según el SO
    const getDefaultTerminalType = () => {
        const platform = window.electron?.platform || 'unknown';
        if (platform === 'linux' || platform === 'darwin') {
            return 'linux-terminal';
        }
        return 'powershell';
    };
    
    const [selectedTerminalType, setSelectedTerminalType] = useState(getDefaultTerminalType());
    const [activeTabKey, setActiveTabKey] = useState(0); // Para forzar re-render
    const [wslDistributions, setWSLDistributions] = useState([]);
    const terminalRefs = useRef({});

    // Detectar distribuciones WSL usando el backend
    useEffect(() => {
        // console.log('🔍 Iniciando detección de distribuciones WSL...');
        
        const detectWSLDistributions = async () => {
            try {
                if (window.electron && window.electron.ipcRenderer) {
                    // console.log('🚀 Invocando detección de distribuciones WSL...');
                    const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
                    // console.log('✅ Distribuciones WSL detectadas:', distributions);
                    
                    // Verificar que recibimos un array válido
                    if (Array.isArray(distributions)) {
                        setWSLDistributions(distributions);
                        // console.log('🎯 Estado actualizado con', distributions.length, 'distribuciones WSL');
                        // distributions.forEach(distro => console.log(`  - ${distro.label} (${distro.category})`));
                    } else {
                        // console.log('⚠️ Respuesta no es un array, fallback a array vacío');
                        setWSLDistributions([]);
                    }
                } else {
                    // console.log('❌ No hay acceso a electron IPC');
                    setWSLDistributions([]);
                }
            } catch (error) {
                // console.error('❌ Error en detección de distribuciones WSL:', error);
                setWSLDistributions([]);
            }
        };
        
        detectWSLDistributions();
    }, []);

    // LEGACY: Detección frontend temporal (DESACTIVADA - usando solo backend)
    /*
    useEffect(() => {
        // console.log('🎯 LEGACY: Detección directa de Ubuntu en frontend (DESACTIVADA)');
        // Código legacy comentado para usar solo detección del backend
    }, []);
    */

    // Registrar eventos para la pestaña inicial
    useEffect(() => {
        // console.log('TabbedTerminal mounted, window.electron:', !!window.electron);
        if (window.electron) {
            // console.log('Registering tab-1 events');
            window.electron.ipcRenderer.send('register-tab-events', 'tab-1');
        }
        
        // Listener para redimensionamiento de ventana
        const handleResize = () => {
            const activeTab = tabs.find(tab => tab.active);
            if (activeTab) {
                setTimeout(() => {
                    const terminalRef = terminalRefs.current[activeTab.id];
                    if (terminalRef && terminalRef.fit) {
                        try {
                            terminalRef.fit();
                            // console.log(`Terminal ${activeTab.id} resized on window resize`);
                        } catch (error) {
                            // console.error(`Error resizing terminal on window resize:`, error);
                        }
                    }
                }, 100);
            }
        };
        
        // Listener para cambios de visibilidad
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                const activeTab = tabs.find(tab => tab.active);
                if (activeTab) {
                    setTimeout(() => {
                        const terminalRef = terminalRefs.current[activeTab.id];
                        if (terminalRef && terminalRef.fit) {
                            try {
                                terminalRef.fit();
                                // console.log(`Terminal ${activeTab.id} resized on visibility change`);
                            } catch (error) {
                                // console.error(`Error resizing terminal on visibility change:`, error);
                            }
                        }
                    }, 100);
                }
            }
        };
        
        window.addEventListener('resize', handleResize);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Cleanup al desmontar el componente
        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            
            // Solo limpiar procesos cuando se cierra realmente la aplicación, no durante reloads
            const isReloading = performance.navigation?.type === 1;
            if (!isReloading && window.electron) {
                tabs.forEach(tab => {
                    window.electron.ipcRenderer.send(`powershell:stop:${tab.id}`);
                    window.electron.ipcRenderer.send(`wsl:stop:${tab.id}`);
                    window.electron.ipcRenderer.send(`ubuntu:stop:${tab.id}`);
                });
            }
        };
    }, []);
    
    // Efecto para redimensionar terminales cuando cambian las pestañas
    useEffect(() => {
        const activeTab = tabs.find(tab => tab.active);
        if (activeTab) {
            // console.log(`Tab change effect triggered for tab: ${activeTab.id}, key: ${activeTabKey}`);
            
            // Forzar re-render del terminal activo con múltiples intentos
            const resizeTerminal = () => {
                const terminalRef = terminalRefs.current[activeTab.id];
                if (terminalRef && terminalRef.fit) {
                    try {
                        terminalRef.fit();
                        // console.log(`Terminal ${activeTab.id} resized successfully (key: ${activeTabKey})`);
                    } catch (error) {
                        // console.error(`Error resizing terminal ${activeTab.id}:`, error);
                    }
                } else {
                    // console.warn(`Terminal ref not found for tab ${activeTab.id}`);
                }
            };
            
            // Intentar redimensionar con diferentes delays para asegurar que el DOM esté listo
            resizeTerminal();
            setTimeout(resizeTerminal, 10);
            setTimeout(resizeTerminal, 50);
            setTimeout(resizeTerminal, 100);
            setTimeout(resizeTerminal, 200);
            setTimeout(resizeTerminal, 500);
            
            // También intentar después de que el navegador haya procesado el cambio de visibilidad
            requestAnimationFrame(() => {
                setTimeout(resizeTerminal, 0);
                setTimeout(resizeTerminal, 50);
            });
        }
    }, [tabs, activeTabKey]);

    // Efecto adicional que se ejecuta cuando cambia la key activa
    useEffect(() => {
        const activeTab = tabs.find(tab => tab.active);
        if (activeTab && activeTabKey > 0) {
            // console.log(`Active tab key changed to ${activeTabKey}, forcing resize for tab: ${activeTab.id}`);
            
            const forceResize = () => {
                const terminalRef = terminalRefs.current[activeTab.id];
                if (terminalRef && terminalRef.fit) {
                    try {
                        terminalRef.fit();
                        // console.log(`Force resize successful for tab ${activeTab.id} (key: ${activeTabKey})`);
                    } catch (error) {
                        // console.error(`Force resize error for tab ${activeTab.id}:`, error);
                    }
                }
            };
            
            // Forzar redimensionamiento inmediato y con delays
            forceResize();
            setTimeout(forceResize, 0);
            setTimeout(forceResize, 10);
            setTimeout(forceResize, 50);
            setTimeout(forceResize, 100);
            setTimeout(forceResize, 200);
        }
    }, [activeTabKey, tabs]);

    // Opciones para el selector de tipo de terminal (dinámicas basadas en SO y distribuciones disponibles)
    const getTerminalOptions = () => {
        const platform = window.electron?.platform || 'unknown';
        
        if (platform === 'win32') {
            // En Windows: mostrar PowerShell y WSL
            return [
                { label: 'PowerShell', value: 'powershell', icon: 'pi pi-desktop' },
                { label: 'WSL', value: 'wsl', icon: 'pi pi-server' },
                // Agregar cada distribución WSL como opción separada
                ...wslDistributions.map(distro => ({
                    label: distro.label,
                    value: `wsl-${distro.name}`,
                    icon: distro.icon,
                    executable: distro.executable,
                    category: distro.category,
                    distroName: distro.name,
                    distroInfo: distro
                }))
            ];
        } else if (platform === 'linux' || platform === 'darwin') {
            // En Linux/macOS: mostrar terminal nativo
            return [
                { label: 'Terminal', value: 'linux-terminal', icon: 'pi pi-desktop' }
            ];
        } else {
            // Fallback para otros sistemas
            return [
                { label: 'Terminal', value: 'powershell', icon: 'pi pi-desktop' }
            ];
        }
    };
    
    const terminalOptions = getTerminalOptions();
    
    // Log para depuración
    // console.log('🎯 Terminal options:', {
    //     wslDistributionsCount: wslDistributions.length,
    //     optionsCount: terminalOptions.length,
    //     options: terminalOptions.map(opt => opt.label),
    //     distributions: wslDistributions.map(distro => `${distro.label} (${distro.category})`)
    // });

    // Función para crear una nueva pestaña
    const createNewTab = (terminalTypeOverride = null) => {
        const terminalTypeToUse = terminalTypeOverride || selectedTerminalType;
        // console.log('Creating new tab, type:', terminalTypeToUse);
        const newTabId = `tab-${nextTabId}`;
        
        // Determinar título y tipo basado en la selección
        let title, terminalType, distroInfo = null;
        
        if (terminalTypeToUse === 'powershell') {
            title = 'Windows PowerShell';
            terminalType = 'powershell';
        } else if (terminalTypeToUse === 'linux-terminal') {
            // Detectar el shell en Linux para mostrar el nombre apropiado
            const platform = window.electron?.platform || 'unknown';
            if (platform === 'linux') {
                title = 'Terminal Linux';
            } else if (platform === 'darwin') {
                title = 'Terminal macOS';
            } else {
                title = 'Terminal';
            }
            terminalType = 'powershell'; // Reutilizar la lógica de PowerShell pero con shell Linux
        } else if (terminalTypeToUse === 'wsl') {
            title = 'WSL';
            terminalType = 'wsl';
        } else if (terminalTypeToUse.startsWith('wsl-')) {
            // Extraer información de la distribución WSL seleccionada
            const distroName = terminalTypeToUse.replace('wsl-', '');
            const selectedDistro = wslDistributions.find(d => d.name === distroName);
            
            if (selectedDistro) {
                title = selectedDistro.label;
                terminalType = selectedDistro.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
                distroInfo = {
                    name: selectedDistro.name,
                    executable: selectedDistro.executable,
                    label: selectedDistro.label,
                    icon: selectedDistro.icon,
                    category: selectedDistro.category
                };
            } else {
                title = 'WSL';
                terminalType = 'wsl-distro';
            }
        } else {
            title = 'Terminal';
            terminalType = terminalTypeToUse;
        }
        
        // console.log('🎯 Nueva pestaña:', { title, terminalType, distroInfo });
        
        // Registrar eventos para la nueva pestaña
        if (window.electron) {
            // console.log('Registering events for new tab:', newTabId);
            window.electron.ipcRenderer.send('register-tab-events', newTabId);
        }
        
        // Desactivar todas las pestañas
        setTabs(prevTabs => prevTabs.map(tab => ({ ...tab, active: false })));
        
        // Agregar nueva pestaña
        setTabs(prevTabs => {
            const newTabs = [...prevTabs, {
                id: newTabId,
                title,
                type: terminalType,
                distroInfo: distroInfo, // Información específica para distribuciones WSL
                active: true
            }];
            // console.log('New tabs state:', newTabs);
            return newTabs;
        });
        
        setNextTabId(prev => prev + 1);
        
        // Redimensionar el terminal de la nueva pestaña después de que se renderice
        setTimeout(() => {
            const terminalRef = terminalRefs.current[newTabId];
            if (terminalRef && terminalRef.fit) {
                terminalRef.fit();
            }
        }, 200);
    };

    // Función para cambiar de pestaña activa
    const switchTab = (tabId) => {
        // console.log(`Switching to tab: ${tabId}`);
        setTabs(prevTabs => 
            prevTabs.map(tab => ({
                ...tab,
                active: tab.id === tabId
            }))
        );
        
        // Incrementar la key para forzar re-render
        setActiveTabKey(prev => prev + 1);
        
        // Forzar redimensionamiento agresivo
        setTimeout(() => {
            const terminalRef = terminalRefs.current[tabId];
            if (terminalRef && terminalRef.fit) {
                // console.log(`Forcing aggressive resize for tab: ${tabId}`);
                try {
                    terminalRef.fit();
                    // Intentar múltiples veces
                    setTimeout(() => terminalRef.fit(), 10);
                    setTimeout(() => terminalRef.fit(), 50);
                    setTimeout(() => terminalRef.fit(), 100);
                    setTimeout(() => terminalRef.fit(), 200);
                } catch (error) {
                    // console.error(`Error in aggressive resize for tab ${tabId}:`, error);
                }
            }
        }, 0);
    };

    // Función para cerrar una pestaña
    const closeTab = (tabId) => {
        // console.log('Cerrando pestaña:', tabId);
        
        // Detener procesos del terminal antes de cerrar
        if (window.electron) {
            window.electron.ipcRenderer.send(`powershell:stop:${tabId}`);
            window.electron.ipcRenderer.send(`wsl:stop:${tabId}`);
            window.electron.ipcRenderer.send(`ubuntu:stop:${tabId}`);
        }
        
        setTabs(prevTabs => {
            const filteredTabs = prevTabs.filter(tab => tab.id !== tabId);
            
            // Si cerramos la pestaña activa, activar otra
            const closedTab = prevTabs.find(tab => tab.id === tabId);
            if (closedTab && closedTab.active && filteredTabs.length > 0) {
                const activeIndex = prevTabs.findIndex(tab => tab.id === tabId);
                const newActiveIndex = activeIndex > 0 ? activeIndex - 1 : 0;
                filteredTabs[newActiveIndex].active = true;
            }
            
            return filteredTabs;
        });
        
        // Limpiar referencia del terminal
        delete terminalRefs.current[tabId];
    };

    // Declarar activeTab solo una vez antes de la lógica de color y renderizado
    const activeTab = tabs.find(tab => tab.active);
    // Al inicio del componente:
    const LOCAL_FONT_FAMILY_STORAGE_KEY = 'basicapp_local_terminal_font_family';
    const LOCAL_FONT_SIZE_STORAGE_KEY = 'basicapp_local_terminal_font_size';
    const getLocalFontFamily = () => localStorage.getItem(LOCAL_FONT_FAMILY_STORAGE_KEY) || '"FiraCode Nerd Font", monospace';
    const getLocalFontSize = () => parseInt(localStorage.getItem(LOCAL_FONT_SIZE_STORAGE_KEY) || '14', 10);

    // Obtener el tema UI actual
    const currentUITheme = themeManager.getCurrentTheme() || uiThemes['Light'];
    
    // Crear objetos de tema diferenciados para cada tipo de terminal
    const powershellXtermTheme = {
        background: currentUITheme.colors?.powershellTerminalBackground || '#1e1e1e',
        foreground: '#FFFFFF',
        cursor: '#FFFFFF',
        selection: 'rgba(255,255,255,0.3)'
    };
    
    const linuxXtermTheme = {
        background: currentUITheme.colors?.linuxTerminalBackground || '#2d112b',
        foreground: '#FFFFFF', 
        cursor: '#FFFFFF',
        selection: 'rgba(255,255,255,0.3)'
    };

    // En el renderizado de la barra de pestañas:
    let tabBarBg = '';
    let activeTabBg = '';
    if (activeTab) {
        let localBg = '#222';
        if (activeTab.type === 'powershell') {
            localBg = themes[localPowerShellTheme]?.theme?.background || '#222';
        } else if (activeTab.type === 'wsl' || activeTab.type === 'ubuntu' || activeTab.type === 'wsl-distro') {
            localBg = themes[localLinuxTerminalTheme]?.theme?.background || '#222';
        }
        // Determinar si el fondo es claro u oscuro
        const isDark = (() => {
            if (!localBg.startsWith('#') || localBg.length < 7) return true;
            const r = parseInt(localBg.slice(1, 3), 16);
            const g = parseInt(localBg.slice(3, 5), 16);
            const b = parseInt(localBg.slice(5, 7), 16);
            // Percepción de brillo
            return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
        })();
        
        // Si solo hay una pestaña, usar el mismo color para bar y tab activa
        if (tabs.length === 1) {
            activeTabBg = adjustColorBrightness(localBg, isDark ? 12 : -12);
            tabBarBg = activeTabBg;  // Mismo color para apariencia uniforme
        } else {
            // Si hay múltiples pestañas, usar colores diferenciados
            tabBarBg = adjustColorBrightness(localBg, isDark ? 8 : -8);
            activeTabBg = adjustColorBrightness(localBg, isDark ? 16 : -16);
        }
    } else {
        tabBarBg = '#2a4a6b';
        activeTabBg = '#3a5a7b';
    }

    return (
        <div style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: activeTab?.type === 'powershell' ? (themes[localPowerShellTheme]?.theme?.background || '#222') : (activeTab?.type === 'ubuntu' ? '#300A24' : '#300A24'),
            overflow: 'hidden'
        }}>
            {/* Barra de pestañas */}
            <div style={{
                background: tabBarBg,
                borderBottom: '1px solid #2a4a6b',
                display: 'flex',
                alignItems: 'center',
                minHeight: '40px',
                overflow: 'hidden'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: 1,
                    overflow: 'hidden'
                }}>
                    {/* Pestañas */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'auto',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}>
                        {tabs.map((tab, index) => (
                            <div
                                key={tab.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: tab.active ? activeTabBg : 'transparent',
                                    color: '#ffffff',
                                    borderTop: tab.active ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                                    borderLeft: tab.active ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                                    borderRight: tab.active ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                                    borderBottom: tab.active ? 'none' : '1px solid transparent',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    minWidth: '120px',
                                    maxWidth: '200px',
                                    borderTopLeftRadius: '4px',
                                    borderTopRightRadius: '4px',
                                    transition: 'all 0.2s ease',
                                    opacity: tab.active ? 1 : 0.8
                                }}
                                onClick={() => switchTab(tab.id)}
                                onMouseEnter={(e) => {
                                    if (!tab.active) {
                                        e.target.style.background = 'rgba(255,255,255,0.05)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!tab.active) {
                                        e.target.style.background = 'transparent';
                                    }
                                }}
                            >
                                <i 
                                    className={tab.type === 'powershell' ? 'pi pi-desktop' : 
                                              tab.type === 'wsl' ? 'pi pi-server' : 'pi pi-circle'} 
                                    style={{ 
                                        color: tab.type === 'powershell' ? '#4fc3f7' : 
                                               tab.type === 'wsl' ? '#8ae234' : '#e95420',
                                        fontSize: '12px',
                                        marginRight: '6px'
                                    }}
                                />
                                <span style={{
                                    color: '#ffffff',
                                    fontSize: '12px',
                                    fontWeight: tab.active ? '600' : '400',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1
                                }}>
                                    {tab.title}
                                </span>
                                {tabs.length > 1 && (
                                    <Button
                                        icon="pi pi-times"
                                        className="p-button-text p-button-sm"
                                        style={{
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            padding: '2px',
                                            minWidth: '16px',
                                            width: '16px',
                                            height: '16px',
                                            marginLeft: '4px'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            closeTab(tab.id);
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                        
                        {/* Botones estilo PowerShell al lado de las pestañas */}
                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
                            {/* Botón para nueva pestaña */}
                            <Button
                                icon="pi pi-plus"
                                className="p-button-text p-button-sm"
                                style={{
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    padding: '4px 6px',
                                    minWidth: '24px',
                                    height: '24px',
                                    fontSize: '10px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '3px',
                                    marginRight: '2px'
                                }}
                                onClick={() => {
                                    // Usar el tipo de terminal actualmente seleccionado
                                    createNewTab();
                                }}
                                aria-label="Nueva pestaña"
                                title="Nueva pestaña"
                            />
                            
                            {/* Botón dropdown para seleccionar tipo de terminal */}
                            <Button
                                icon="pi pi-chevron-down"
                                className="p-button-text p-button-sm"
                                style={{
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    padding: '4px 6px',
                                    minWidth: '24px',
                                    height: '24px',
                                    fontSize: '8px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '3px'
                                }}
                                onClick={(e) => {
                                    // Crear un menú contextual
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    // Crear un menú desplegable temporal
                                    const menu = document.createElement('div');
                                    menu.style.position = 'absolute';
                                    menu.style.top = (e.target.getBoundingClientRect().bottom + 5) + 'px';
                                    menu.style.left = e.target.getBoundingClientRect().left + 'px';
                                    menu.style.background = '#2a4a6b';
                                    menu.style.border = '1px solid #3a5a7b';
                                    menu.style.borderRadius = '4px';
                                    menu.style.padding = '4px 0';
                                    menu.style.minWidth = '180px';
                                    menu.style.zIndex = '1000';
                                    menu.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                                    
                                    terminalOptions.forEach(option => {
                                        const item = document.createElement('div');
                                        item.style.padding = '8px 12px';
                                        item.style.cursor = 'pointer';
                                        item.style.display = 'flex';
                                        item.style.alignItems = 'center';
                                        item.style.gap = '8px';
                                        item.style.color = '#ffffff';
                                        item.style.fontSize = '12px';
                                        item.style.transition = 'background-color 0.2s';
                                        
                                        item.innerHTML = `
                                            <i class="${option.icon}" style="color: ${
                                                option.value === 'powershell' ? '#4fc3f7' : 
                                                option.value === 'wsl' ? '#8ae234' : '#e95420'
                                            }; font-size: 12px;"></i>
                                            <span>${option.label}</span>
                                        `;
                                        
                                        item.addEventListener('mouseenter', () => {
                                            item.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                        });
                                        
                                        item.addEventListener('mouseleave', () => {
                                            item.style.backgroundColor = 'transparent';
                                        });
                                        
                                        item.addEventListener('click', () => {
                                            setSelectedTerminalType(option.value);
                                            createNewTab(option.value);
                                            document.body.removeChild(menu);
                                        });
                                        
                                        menu.appendChild(item);
                                    });
                                    
                                    // Agregar listener para cerrar el menú al hacer click fuera
                                    const handleClickOutside = (event) => {
                                        if (!menu.contains(event.target)) {
                                            if (menu.parentNode) {
                                                menu.parentNode.removeChild(menu);
                                            }
                                            document.removeEventListener('click', handleClickOutside);
                                        }
                                    };
                                    
                                    document.body.appendChild(menu);
                                    setTimeout(() => {
                                        document.addEventListener('click', handleClickOutside);
                                    }, 0);
                                }}
                                aria-label="Seleccionar tipo de terminal"
                                title="Seleccionar tipo de terminal"
                            />
                        </div>
                    </div>
                </div>

                {/* Controles del lado derecho - Solo botones de control de ventana */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '0 16px' 
                }}>
                    {/* Botones de control de ventana - EXACTAMENTE como la imagen */}
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
                        {/* Botón Minimizar */}
                        <div 
                            style={{
                                width: '12px',
                                height: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onClick={onMinimize}
                            title="Minimizar terminal"
                        >
                            <div style={{
                                width: '8px',
                                height: '1px',
                                background: '#ffffff'
                            }}></div>
                        </div>
                        
                        {/* Botón Maximizar */}
                        <div 
                            style={{
                                width: '12px',
                                height: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onClick={onMaximize}
                            title={terminalState === 'maximized' ? "Restaurar terminal" : "Maximizar terminal"}
                        >
                            {terminalState === 'maximized' ? (
                                // Icono de restaurar: líneas que forman dos cuadrados superpuestos
                                <div style={{ position: 'relative', width: '8px', height: '8px' }}>
                                    {/* Cuadrado de fondo - líneas desplazadas */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '2px',
                                        left: '2px',
                                        width: '6px',
                                        height: '6px'
                                    }}>
                                        {/* Línea superior del cuadrado de fondo */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '6px',
                                            height: '1px',
                                            background: '#ffffff'
                                        }}></div>
                                        {/* Línea inferior del cuadrado de fondo */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            width: '6px',
                                            height: '1px',
                                            background: '#ffffff'
                                        }}></div>
                                        {/* Línea izquierda del cuadrado de fondo */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '1px',
                                            height: '6px',
                                            background: '#ffffff'
                                        }}></div>
                                        {/* Línea derecha del cuadrado de fondo */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            width: '1px',
                                            height: '6px',
                                            background: '#ffffff'
                                        }}></div>
                                    </div>
                                    
                                    {/* Cuadrado de frente - líneas en posición original */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '0px',
                                        left: '0px',
                                        width: '6px',
                                        height: '6px'
                                    }}>
                                        {/* Línea superior del cuadrado de frente */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '6px',
                                            height: '1px',
                                            background: '#ffffff'
                                        }}></div>
                                        {/* Línea inferior del cuadrado de frente */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            width: '6px',
                                            height: '1px',
                                            background: '#ffffff'
                                        }}></div>
                                        {/* Línea izquierda del cuadrado de frente */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '1px',
                                            height: '6px',
                                            background: '#ffffff'
                                        }}></div>
                                        {/* Línea derecha del cuadrado de frente */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            width: '1px',
                                            height: '6px',
                                            background: '#ffffff'
                                        }}></div>
                                    </div>
                                </div>
                            ) : (
                                // Icono de maximizar: cuadrado vacío (estado normal)
                                <div style={{ position: 'relative', width: '8px', height: '8px' }}>
                                    {/* Línea superior */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '8px',
                                        height: '1px',
                                        background: '#ffffff'
                                    }}></div>
                                    {/* Línea inferior */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        width: '8px',
                                        height: '1px',
                                        background: '#ffffff'
                                    }}></div>
                                    {/* Línea izquierda */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '1px',
                                        height: '8px',
                                        background: '#ffffff'
                                    }}></div>
                                    {/* Línea derecha */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        width: '1px',
                                        height: '8px',
                                        background: '#ffffff'
                                    }}></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido de las pestañas */}
            <div style={{ 
                flex: 1, 
                position: 'relative',
                overflow: 'hidden'
            }}>
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            transform: tab.active ? 'translateX(0)' : 'translateX(100%)',
                            transition: 'transform 0.1s ease-out',
                            visibility: tab.active ? 'visible' : 'hidden',
                            opacity: tab.active ? 1 : 0
                        }}
                    >
                        {tab.type === 'powershell' ? (
                            <PowerShellTerminal
                                key={`${tab.id}-terminal`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                fontFamily={localFontFamily}
                                fontSize={localFontSize}
                                theme={themes[localPowerShellTheme]?.theme || powershellXtermTheme}
                            />
                        ) : tab.type === 'wsl' ? (
                            <WSLTerminal 
                                key={`${tab.id}-terminal`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                theme={themes[localLinuxTerminalTheme]?.theme || linuxXtermTheme}
                            />
                        ) : (tab.type === 'ubuntu' || tab.type === 'wsl-distro') ? (
                            <UbuntuTerminal 
                                key={`${tab.id}-terminal`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                ubuntuInfo={tab.distroInfo}
                                theme={themes[localLinuxTerminalTheme]?.theme || linuxXtermTheme}
                            />
                        ) : (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: 'rgba(255,255,255,0.7)'
                            }}>
                                <span>Tipo de terminal no soportado: {tab.type}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TabbedTerminal;
