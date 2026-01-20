import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { FaWindows } from 'react-icons/fa';
import PowerShellTerminal from './PowerShellTerminal';
import WSLTerminal from './WSLTerminal';
import UbuntuTerminal from './UbuntuTerminal';
import CygwinTerminal from './CygwinTerminal';
import DockerTerminal from './DockerTerminal';
import GuacamoleTerminal from './GuacamoleTerminal';
import { themes } from '../themes';
import { uiThemes } from '../themes/ui-themes';
import { themeManager } from '../utils/themeManager';
import { applyTabTheme, loadSavedTabTheme } from '../utils/tabThemeLoader';

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

const TabbedTerminal = forwardRef(({ onMinimize, onMaximize, terminalState, localFontFamily, localFontSize, localPowerShellTheme, localLinuxTerminalTheme, hideStatusBar = false }, ref) => {
    // Referencias para control de scroll de pestañas
    const tabsContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    
    // Funciones para controlar el scroll de pestañas
    const checkScrollButtons = () => {
        if (!tabsContainerRef.current) return;
        
        const container = tabsContainerRef.current;
        const scrollLeft = container.scrollLeft;
        const scrollWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;
        
        
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth - 1); // Solo mostrar si hay overflow
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
    
    // Determinar la pestaña inicial según el SO y configuración
    const getInitialTab = (useCygwin = false, availableDistributions = []) => {
        // Leer configuración de terminal por defecto
        const defaultTerminal = localStorage.getItem('nodeterm_default_local_terminal');
        const platform = window.electron?.platform || 'unknown';
        
        // Si hay configuración guardada, usarla
        if (defaultTerminal) {
            const terminalTitles = {
                'powershell': 'Windows PowerShell',
                'wsl': 'WSL',
                'cygwin': 'Cygwin',
                'linux-terminal': platform === 'darwin' ? 'Terminal macOS' : 'Terminal Linux'
            };
            
            // Si es Docker
            if (defaultTerminal.startsWith('docker-')) {
                return {
                    id: 'tab-1',
                    title: `🐳 ${defaultTerminal.replace('docker-', '')}`,
                    type: 'docker',
                    active: true
                };
            }
            
            // Si es una distribución WSL (puede ser nombre directo como "Ubuntu-24.04")
            // Buscar en las distribuciones WSL disponibles (si están disponibles)
            if (availableDistributions && availableDistributions.length > 0) {
                const wslDistro = availableDistributions.find(d => 
                    d.name === defaultTerminal || 
                    d.label === defaultTerminal ||
                    d.name.toLowerCase() === defaultTerminal.toLowerCase() ||
                    d.label.toLowerCase() === defaultTerminal.toLowerCase()
                );
                if (wslDistro) {
                    return {
                        id: 'tab-1',
                        title: wslDistro.label || wslDistro.name,
                        type: wslDistro.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro',
                        distroInfo: wslDistro, // Agregar información completa de la distribución
                        active: true
                    };
                }
            }
            
            // Si es un tipo de terminal conocido
            if (terminalTitles[defaultTerminal]) {
                return {
                    id: 'tab-1',
                    title: terminalTitles[defaultTerminal],
                    type: defaultTerminal === 'linux-terminal' ? 'powershell' : defaultTerminal,
                    active: true
                };
            }
            
            // Fallback: usar el valor tal cual
            return {
                id: 'tab-1',
                title: defaultTerminal,
                type: 'powershell', // Fallback seguro
                active: true
            };
        }
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
        // Si Cygwin está disponible, usarlo como predeterminado en Windows
        if (useCygwin) {
            return {
                id: 'tab-1',
                title: 'Cygwin',
                type: 'cygwin',
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
    
    const [tabs, setTabs] = useState([getInitialTab(false, [])]);
    const [nextTabId, setNextTabId] = useState(2);
    
    // Actualizar la pestaña inicial cuando se carguen las distribuciones WSL
    useEffect(() => {
        const defaultTerminal = localStorage.getItem('nodeterm_default_local_terminal');
        
        // Si no hay distribuciones WSL o no hay pestañas, esperar
        if (wslDistributions.length === 0 || tabs.length === 0 || tabs[0].id !== 'tab-1') {
            // if (wslDistributions.length === 0) {
            //     console.log('⏳ [useEffect WSL] Esperando distribuciones WSL...');
            // }
            return;
        }

        const firstTab = tabs[0];
        
        // Si la pestaña ya tiene distroInfo correcto Y el tipo es correcto, no hacer nada
        if (firstTab.distroInfo && 
            (firstTab.type === 'ubuntu' || firstTab.type === 'wsl-distro') &&
            firstTab.type !== 'powershell') {
            // console.log('ℹ️ [useEffect WSL] Pestaña ya está correcta con distroInfo y tipo correcto');
            return;
        }

        // console.log('🔍 [useEffect WSL] Verificando actualización de pestaña:', {
        //     defaultTerminal,
        //     wslDistributionsCount: wslDistributions.length,
        //     firstTabType: firstTab.type,
        //     firstTabTitle: firstTab.title,
        //     hasDistroInfo: !!firstTab.distroInfo,
        //     distroInfoName: firstTab.distroInfo?.name
        // });

        // Buscar distribución WSL por defaultTerminal O por el título de la pestaña
        const searchTerms = [];
        if (defaultTerminal) {
            searchTerms.push(defaultTerminal);
        }
        if (firstTab.title && firstTab.title !== 'Windows PowerShell') {
            searchTerms.push(firstTab.title);
        }

        let wslDistro = null;
        for (const term of searchTerms) {
            wslDistro = wslDistributions.find(d => 
                d.name === term || 
                d.label === term ||
                d.name.toLowerCase() === term.toLowerCase() ||
                d.label.toLowerCase() === term.toLowerCase()
            );
            if (wslDistro) {
                console.log('✅ [useEffect WSL] Distribución encontrada por término:', term, wslDistro);
                break;
            }
        }

        if (wslDistro) {
            const expectedType = wslDistro.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
            const expectedTitle = wslDistro.label || wslDistro.name;
            const needsUpdate = firstTab.type !== expectedType || 
                               !firstTab.distroInfo ||
                               (firstTab.distroInfo && firstTab.distroInfo.name !== wslDistro.name) ||
                               firstTab.title !== expectedTitle;

            // console.log('🔍 [useEffect WSL] Distribución encontrada:', {
            //     wslDistro: { name: wslDistro.name, label: wslDistro.label, category: wslDistro.category },
            //     expectedType,
            //     expectedTitle,
            //     currentTab: { type: firstTab.type, title: firstTab.title, hasDistroInfo: !!firstTab.distroInfo },
            //     needsUpdate,
            //     reason: needsUpdate ? {
            //         typeMismatch: firstTab.type !== expectedType,
            //         noDistroInfo: !firstTab.distroInfo,
            //         distroMismatch: firstTab.distroInfo && firstTab.distroInfo.name !== wslDistro.name,
            //         titleMismatch: firstTab.title !== expectedTitle
            //     } : 'no necesita actualización'
            // });

            if (needsUpdate) {
                // console.log('✅ [useEffect WSL] Actualizando pestaña inicial con distribución WSL');
                setTabs(prevTabs => {
                    const currentFirstTab = prevTabs[0];
                    // Verificar de nuevo para evitar actualizaciones innecesarias
                    if (currentFirstTab.distroInfo?.name === wslDistro.name && 
                        currentFirstTab.type === expectedType &&
                        currentFirstTab.type !== 'powershell') {
                        // console.log('ℹ️ [useEffect WSL] Pestaña ya actualizada, saltando');
                        return prevTabs;
                    }
                    const updatedTab = {
                        ...currentFirstTab,
                        title: expectedTitle,
                        type: expectedType, // CRÍTICO: Cambiar el tipo de 'powershell' a 'ubuntu' o 'wsl-distro'
                        distroInfo: wslDistro, // Agregar información completa de la distribución
                        _updateKey: Date.now() // Forzar re-render
                    };
                    // console.log('✅ [useEffect WSL] Pestaña actualizada:', {
                    //     antes: { type: currentFirstTab.type, title: currentFirstTab.title, hasDistroInfo: !!currentFirstTab.distroInfo },
                    //     despues: { type: updatedTab.type, title: updatedTab.title, hasDistroInfo: !!updatedTab.distroInfo, distroName: updatedTab.distroInfo?.name }
                    // });
                    return [updatedTab, ...prevTabs.slice(1)];
                });
            } else {
                // console.log('ℹ️ [useEffect WSL] No se necesita actualizar, la pestaña ya está correcta');
            }
        } else if (defaultTerminal || (firstTab.title && firstTab.title !== 'Windows PowerShell')) {
            console.warn('⚠️ [useEffect WSL] No se encontró distribución WSL para:', {
                defaultTerminal,
                currentTitle: firstTab.title,
                searchTerms,
                availableDistros: wslDistributions.map(d => ({ name: d.name, label: d.label, category: d.category }))
            });
        }
    }, [wslDistributions, tabs.length, tabs[0]?.type, tabs[0]?.title]); // Depender de cambios específicos en tabs
    
    // useEffect adicional para corregir pestañas que tienen el título correcto pero el tipo incorrecto
    // Este es un fallback en caso de que el useEffect principal no haya funcionado
    useEffect(() => {
        // Solo ejecutar si hay distribuciones WSL disponibles
        if (wslDistributions.length === 0 || tabs.length === 0 || tabs[0].id !== 'tab-1') {
            return;
        }
        
        const firstTab = tabs[0];
        const defaultTerminal = localStorage.getItem('nodeterm_default_local_terminal');
        
        // Si la pestaña ya tiene distroInfo correcto Y el tipo es correcto, no hacer nada
        if (firstTab.distroInfo && 
            (firstTab.type === 'ubuntu' || firstTab.type === 'wsl-distro') &&
            firstTab.type !== 'powershell') {
            return;
        }
        
        // Si el tipo es 'powershell' pero el título o defaultTerminal sugiere una distribución WSL, corregirlo
        // Incluso si tiene distroInfo, si el tipo sigue siendo 'powershell', hay que corregirlo
        const isPowerShellButShouldBeWSL = firstTab.type === 'powershell' && 
                                           firstTab.title && 
                                           firstTab.title !== 'Windows PowerShell';
        
        if (isPowerShellButShouldBeWSL) {
            // console.log('🔍 [useEffect Corrección] Buscando distribución para corregir tipo:', {
            //     defaultTerminal,
            //     currentTitle: firstTab.title,
            //     currentType: firstTab.type,
            //     availableDistros: wslDistributions.map(d => ({ name: d.name, label: d.label, category: d.category }))
            // });
            
            // Buscar por defaultTerminal o por título de la pestaña
            const searchTerms = [];
            if (defaultTerminal) {
                searchTerms.push(defaultTerminal);
            }
            if (firstTab.title) {
                searchTerms.push(firstTab.title);
            }
            
            let wslDistro = null;
            for (const term of searchTerms) {
                wslDistro = wslDistributions.find(d => 
                    d.name === term || 
                    d.label === term ||
                    d.name.toLowerCase() === term.toLowerCase() ||
                    d.label.toLowerCase() === term.toLowerCase()
                );
                if (wslDistro) break;
            }
            
            if (wslDistro) {
                const expectedType = wslDistro.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
                const expectedTitle = wslDistro.label || wslDistro.name;
                // console.log('🔧 [useEffect Corrección] Corrigiendo tipo de pestaña:', {
                //     currentType: firstTab.type,
                //     currentTitle: firstTab.title,
                //     expectedType: expectedType,
                //     expectedTitle: expectedTitle,
                //     distroName: wslDistro.name,
                //     distroLabel: wslDistro.label,
                //     distroCategory: wslDistro.category
                // });
                setTabs(prevTabs => {
                    const currentFirstTab = prevTabs[0];
                    // Verificar de nuevo para evitar actualizaciones innecesarias
                    if (currentFirstTab.distroInfo?.name === wslDistro.name && 
                        currentFirstTab.type === expectedType) {
                        // console.log('ℹ️ [useEffect Corrección] Pestaña ya corregida, saltando');
                        return prevTabs;
                    }
                    const updatedTab = {
                        ...currentFirstTab,
                        type: expectedType, // Cambiar el tipo
                        title: expectedTitle, // Actualizar título también
                        distroInfo: wslDistro, // Agregar distroInfo
                        _updateKey: Date.now() // Forzar re-render
                    };
                    // console.log('✅ [useEffect Corrección] Pestaña corregida:', {
                    //     antes: { type: currentFirstTab.type, title: currentFirstTab.title, hasDistroInfo: !!currentFirstTab.distroInfo },
                    //     despues: { type: updatedTab.type, title: updatedTab.title, hasDistroInfo: !!updatedTab.distroInfo }
                    // });
                    return [updatedTab, ...prevTabs.slice(1)];
                });
            } else {
                console.warn('⚠️ [useEffect Corrección] No se encontró distribución para corregir:', {
                    defaultTerminal,
                    currentTitle: firstTab.title,
                    availableDistros: wslDistributions.map(d => ({ name: d.name, label: d.label, category: d.category }))
                });
            }
        }
    }, [wslDistributions, tabs]);
    
    // Determinar el tipo de terminal por defecto según el SO y configuración
    const getDefaultTerminalType = () => {
        // Leer configuración de terminal por defecto
        const defaultTerminal = localStorage.getItem('nodeterm_default_local_terminal');
        if (defaultTerminal) {
            return defaultTerminal;
        }
        
        // Fallback a lógica anterior
        const platform = window.electron?.platform || 'unknown';
        if (platform === 'linux' || platform === 'darwin') {
            return 'linux-terminal';
        }
        return 'powershell';
    };
    
    const [selectedTerminalType, setSelectedTerminalType] = useState(getDefaultTerminalType());
    
    // Escuchar cambios en la configuración de terminal por defecto
    useEffect(() => {
        const handleDefaultTerminalChange = (e) => {
            const newDefaultTerminal = e.detail?.terminalType;
            console.log('📢 Evento default-terminal-changed recibido:', newDefaultTerminal);
            if (newDefaultTerminal) {
                setSelectedTerminalType(newDefaultTerminal);
                
                // Buscar la distribución WSL correspondiente
                const findAndUpdateDistro = () => {
                    if (wslDistributions.length > 0 && tabs.length > 0 && tabs[0].id === 'tab-1') {
                        const wslDistro = wslDistributions.find(d => 
                            d.name === newDefaultTerminal || 
                            d.label === newDefaultTerminal ||
                            d.name.toLowerCase() === newDefaultTerminal.toLowerCase() ||
                            d.label.toLowerCase() === newDefaultTerminal.toLowerCase()
                        );
                        
                        if (wslDistro) {
                            const expectedType = wslDistro.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
                            const expectedTitle = wslDistro.label || wslDistro.name;
                            console.log('🔄 Actualizando pestaña por evento:', { 
                                expectedType, 
                                expectedTitle, 
                                distroInfo: wslDistro,
                                currentType: tabs[0].type,
                                currentTitle: tabs[0].title
                            });
                            setTabs(prevTabs => {
                                const updatedTab = {
                                    ...prevTabs[0],
                                    title: expectedTitle,
                                    type: expectedType,
                                    distroInfo: wslDistro, // Agregar información completa de la distribución
                                    _updateKey: Date.now() // Forzar re-render
                                };
                                console.log('✅ Pestaña actualizada por evento:', updatedTab);
                                return [updatedTab, ...prevTabs.slice(1)];
                            });
                        } else {
                            console.warn('⚠️ No se encontró distribución WSL para:', newDefaultTerminal);
                        }
                    } else if (wslDistributions.length === 0) {
                        // Si aún no se han cargado las distribuciones, esperar un poco
                        console.log('⏳ Esperando a que se carguen las distribuciones WSL...');
                        setTimeout(findAndUpdateDistro, 500);
                    }
                };
                
                findAndUpdateDistro();
            }
        };
        
        window.addEventListener('default-terminal-changed', handleDefaultTerminalChange);
        return () => {
            window.removeEventListener('default-terminal-changed', handleDefaultTerminalChange);
        };
    }, [wslDistributions, tabs]);
    const [activeTabKey, setActiveTabKey] = useState(0); // Para forzar re-render
    const [wslDistributions, setWSLDistributions] = useState([]);
    const [cygwinAvailable, setCygwinAvailable] = useState(false); // Estado para Cygwin
    const [dockerContainers, setDockerContainers] = useState([]); // Estado para Docker
    // Estado para drag & drop de pestañas locales del terminal
    const [draggedTabIndex, setDraggedTabIndex] = useState(null);
    const [dragOverTabIndex, setDragOverTabIndex] = useState(null);
    const [dragStartTimer, setDragStartTimer] = useState(null);
    const terminalRefs = useRef({});
    const createNewTabRef = useRef(null);
    const pendingCommands = useRef({}); // Cola de comandos pendientes por terminal
    const terminalReadyFlags = useRef({}); // Flags de terminals listos

    // Exponer métodos para uso externo
    useImperativeHandle(ref, () => ({
        createRdpTab: (title, rdpConfig) => {
            createRdpTab(title, rdpConfig);
        },
        getActiveTabKey: () => {
            // Encontrar el tab activo (el primero con active: true)
            const activeTab = tabs.find(t => t.active);
            console.log('🔍 getActiveTabKey:', { activeTab, allTabs: tabs });
            return activeTab?.id;
        },
        getSelectedTerminalType: () => {
            // Devolver el tipo del tab activo (el visible actualmente)
            const activeTab = tabs.find(t => t.active);
            const activeType = activeTab?.type || 'powershell';
            return activeType;
        },
        getOpenTerminalTypes: () => {
            // Devolver lista de tipos de terminales abiertos (excluyendo RDP)
            return tabs
                .filter(t => t.type && t.type !== 'rdp-guacamole')
                .map(t => t.type);
        },
        createAndSwitchToTerminal: (terminalType, command) => {
            console.log('🆕 createAndSwitchToTerminal:', { terminalType, command });
            
            // Buscar si ya existe una pestaña de este tipo
            const existingTab = tabs.find(t => t.type === terminalType);
            
            if (existingTab) {
                // Activar la pestaña existente
                console.log('✅ Pestaña existente encontrada:', existingTab.title);
                setTabs(prevTabs => prevTabs.map(t => ({
                    ...t,
                    active: t.id === existingTab.id
                })));
                
            // Enviar comando después de cambiar de pestaña
            setTimeout(() => {
                if (command) {
                    const finalCommand = (terminalType === 'powershell' || terminalType === 'linux-terminal') 
                        ? command + '\r' 
                        : command + '\n';
                    console.log('📤 Enviando comando a pestaña existente:', { terminalType, id: existingTab.id, command });
                    window.electron?.ipcRenderer.send(`${terminalType}:data:${existingTab.id}`, finalCommand);
                }
            }, 500); // Aumentado de 200ms a 500ms
                
                return existingTab.id;
            }
            
            // Crear nueva pestaña del tipo especificado
            const newTabId = `tab-${nextTabId}`;
            const terminalTitles = {
                'powershell': 'Windows PowerShell',
                'wsl': 'WSL',
                'cygwin': 'Cygwin',
                'ubuntu': 'Ubuntu',
                'linux-terminal': 'Terminal Linux'
            };
            
            const newTab = {
                id: newTabId,
                title: terminalTitles[terminalType] || terminalType,
                type: terminalType,
                active: true
            };
            
            console.log('🆕 Creando nueva pestaña:', newTab);
            
            // 🔧 CRÍTICO: Registrar eventos IPC para la nueva pestaña ANTES de crear el tab
            if (window.electron) {
                console.log('📝 Registrando eventos IPC para tab:', newTabId);
                window.electron.ipcRenderer.send('register-tab-events', newTabId);
                console.log('✅ Eventos IPC registrados para tab:', newTabId);
            }
            
            setTabs(prevTabs => [
                ...prevTabs.map(t => ({ ...t, active: false })),
                newTab
            ]);
            setNextTabId(prev => prev + 1);
            
            // Enviar comando después de un delay y forzar fit del terminal
            if (command) {
                console.log('📝 Programando envío de comando:', { newTabId, command });
                
                // Esperar el primer output del proceso (el prompt) antes de enviar el comando
                let promptReceived = false;
                let fitDone = false;
                
                const promptListener = (data) => {
                    if (promptReceived) return; // Ya procesado
                    
                    console.log('🎯 Primer output del terminal recibido:', { 
                        newTabId, 
                        dataLength: data?.length,
                        dataPreview: data?.substring(0, 50)
                    });
                    
                    promptReceived = true;
                    
                    // Hacer fit cuando el prompt aparece
                    if (!fitDone) {
                        fitDone = true;
                        setTimeout(() => {
                            const termRef = terminalRefs.current[newTabId];
                            if (termRef && termRef.fit) {
                                console.log('📐 Haciendo fit del terminal después del prompt:', newTabId);
                                termRef.fit();
                            }
                        }, 100);
                    }
                    
                    // Enviar comando 300ms después del primer output
                    setTimeout(() => {
                        const finalCommand = (terminalType === 'powershell' || terminalType === 'linux-terminal') 
                            ? command + '\r' 
                            : command + '\n';
                        
                        console.log('📤 Enviando comando después del prompt:', { 
                            terminalType, 
                            newTabId, 
                            command, 
                            channel: `${terminalType}:data:${newTabId}`,
                            finalCommand 
                        });
                        
                        window.electron?.ipcRenderer.send(`${terminalType}:data:${newTabId}`, finalCommand);
                        console.log('✅ Comando IPC enviado');
                        
                        // Remover listener después de enviar el comando
                        window.electron.ipcRenderer.removeListener(`${terminalType}:data:${newTabId}`, promptListener);
                    }, 300);
                };
                
                // Escuchar el primer output del proceso
                const channel = `${terminalType}:data:${newTabId}`;
                console.log('👂 Registrando listener en canal:', channel);
                window.electron.ipcRenderer.on(channel, promptListener);
                console.log('✅ Listener registrado correctamente');
                
                // Safety timeout: si no hay prompt en 5 segundos, enviar de todos modos
                setTimeout(() => {
                    if (!promptReceived) {
                        console.warn('⏰ Timeout: prompt no recibido, enviando comando de todos modos');
                        promptReceived = true;
                        
                        // Hacer fit primero
                        const termRef = terminalRefs.current[newTabId];
                        if (termRef && termRef.fit) {
                            console.log('📐 Haciendo fit del terminal (timeout):', newTabId);
                            termRef.fit();
                        }
                        
                        // Enviar comando
                        setTimeout(() => {
                            const finalCommand = (terminalType === 'powershell' || terminalType === 'linux-terminal') 
                                ? command + '\r' 
                                : command + '\n';
                            
                            window.electron?.ipcRenderer.send(`${terminalType}:data:${newTabId}`, finalCommand);
                            console.log('✅ Comando IPC enviado (timeout)');
                            
                            window.electron.ipcRenderer.removeListener(`${terminalType}:data:${newTabId}`, promptListener);
                        }, 100);
                    }
                }, 5000);
            }
            
            return newTabId;
        },
        sendCommand: (command) => {
            // Encontrar el tab activo
            const activeTab = tabs.find(t => t.active);
            if (!activeTab) {
                console.warn('⚠️ No hay terminal activo para enviar comando');
                return;
            }
            
            const tabId = activeTab.id;
            const terminalRef = terminalRefs.current[tabId];
            if (!terminalRef) {
                console.warn('⚠️ Terminal ref no encontrado para:', tabId);
                return;
            }
            
            console.log('🖥️ Enviando comando a terminal:', { tab: activeTab.title, tabId, command });
            
            // Determinar el tipo de terminal y enviar el comando apropiadamente
            const terminalType = activeTab.type || 'powershell';
            
            // Agregar Enter al final según el tipo de terminal
            let finalCommand = command;
            if (terminalType === 'powershell' || terminalType === 'linux-terminal') {
                finalCommand = command + '\r'; // PowerShell usa \r
            } else {
                finalCommand = command + '\n'; // Unix usa \n
            }
            
            console.log('📤 Enviando a IPC:', { channel: `${terminalType}:data:${tabId}`, finalCommand });
            
            // Enviar comando vía IPC al backend
            if (window.electron) {
                if (terminalType === 'powershell' || terminalType === 'linux-terminal') {
                    window.electron.ipcRenderer.send(`powershell:data:${tabId}`, finalCommand);
                } else if (terminalType === 'wsl') {
                    window.electron.ipcRenderer.send(`wsl:data:${tabId}`, finalCommand);
                } else if (terminalType === 'ubuntu' || terminalType === 'wsl-distro') {
                    const channelPrefix = activeTab.distroInfo ? 'ubuntu' : 'wsl';
                    window.electron.ipcRenderer.send(`${channelPrefix}:data:${tabId}`, finalCommand);
                } else if (terminalType === 'cygwin') {
                    window.electron.ipcRenderer.send(`cygwin:data:${tabId}`, finalCommand);
                }
                console.log('✅ Comando enviado al canal IPC');
            } else {
                console.error('❌ window.electron no disponible');
            }
        },
        addTerminalTab: (terminalType, distroInfo = null) => {
            let override = terminalType;
            if (terminalType === 'docker' && distroInfo?.containerName) {
                override = 'docker-' + distroInfo.containerName;
            } else if ((terminalType === 'ubuntu' || terminalType === 'wsl') && distroInfo?.name) {
                override = distroInfo.name.startsWith('wsl-') ? distroInfo.name : 'wsl-' + distroInfo.name;
            } else if ((terminalType === 'ubuntu' || terminalType === 'wsl') && distroInfo) {
                const n = distroInfo.name || distroInfo.label;
                override = n ? 'wsl-' + n : 'wsl';
            } else if (terminalType === 'ubuntu' || terminalType === 'wsl') {
                override = 'wsl';
            }
            createNewTabRef.current?.(override);
        }
    }), [tabs, selectedTerminalType]); // Agregar tabs y selectedTerminalType como dependencias

    // 🚀 OPTIMIZACIÓN: Detectar distribuciones WSL DIFERIDO para no bloquear arranque
    useEffect(() => {
        // Diferir detección 500ms para que la UI aparezca primero
        const timer = setTimeout(() => {
        const detectWSLDistributions = async () => {
            try {
                if (window.electron && window.electron.ipcRenderer) {
                    // console.log('🔍 [Detectar WSL] Invocando IPC detect-wsl-distributions...');
                    const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
                    // console.log('✅ [Detectar WSL] Respuesta recibida:', {
                    //     isArray: Array.isArray(distributions),
                    //     length: Array.isArray(distributions) ? distributions.length : 'N/A',
                    //     data: distributions
                    // });
                    
                    // Verificar que recibimos un array válido
                    if (Array.isArray(distributions)) {
                        // console.log('✅ [Detectar WSL] Distribuciones WSL detectadas:', distributions.map(d => ({ name: d.name, label: d.label, category: d.category })));
                        setWSLDistributions(distributions);
                        // Forzar actualización inmediata de la pestaña después de un pequeño delay
                        // para asegurar que el estado se haya actualizado
                        setTimeout(() => {
                            const defaultTerminal = localStorage.getItem('nodeterm_default_local_terminal');
                            if (defaultTerminal && distributions.length > 0) {
                                setTabs(prevTabs => {
                                    if (prevTabs.length === 0 || prevTabs[0].id !== 'tab-1') {
                                        return prevTabs;
                                    }
                                    const firstTab = prevTabs[0];
                                    // Si ya está correcto, no hacer nada
                                    if (firstTab.distroInfo && 
                                        (firstTab.type === 'ubuntu' || firstTab.type === 'wsl-distro') &&
                                        firstTab.type !== 'powershell') {
                                        return prevTabs;
                                    }
                                    // Buscar distribución
                                    const wslDistro = distributions.find(d => 
                                        d.name === defaultTerminal || 
                                        d.label === defaultTerminal ||
                                        d.name === firstTab.title ||
                                        d.label === firstTab.title ||
                                        d.name.toLowerCase() === defaultTerminal.toLowerCase() ||
                                        d.label.toLowerCase() === defaultTerminal.toLowerCase() ||
                                        (firstTab.title && d.name.toLowerCase() === firstTab.title.toLowerCase()) ||
                                        (firstTab.title && d.label.toLowerCase() === firstTab.title.toLowerCase())
                                    );
                                    if (wslDistro && (firstTab.type === 'powershell' || !firstTab.distroInfo || firstTab.distroInfo.name !== wslDistro.name)) {
                                        const expectedType = wslDistro.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
                                        const expectedTitle = wslDistro.label || wslDistro.name;
                                        // console.log('🔧 [Detectar WSL] Actualización inmediata de pestaña:', {
                                        //     antes: { type: firstTab.type, title: firstTab.title },
                                        //     despues: { type: expectedType, title: expectedTitle }
                                        // });
                                        return [{
                                            ...firstTab,
                                            type: expectedType,
                                            title: expectedTitle,
                                            distroInfo: wslDistro,
                                            _updateKey: Date.now()
                                        }, ...prevTabs.slice(1)];
                                    }
                                    return prevTabs;
                                });
                            }
                        }, 100);
                    } else {
                        console.warn('⚠️ [Detectar WSL] Respuesta no es un array, fallback a array vacío. Tipo recibido:', typeof distributions);
                        setWSLDistributions([]);
                    }
                } else {
                    console.error('❌ [Detectar WSL] No hay acceso a electron IPC');
                    setWSLDistributions([]);
                }
            } catch (error) {
                console.error('❌ [Detectar WSL] Error en detección de distribuciones WSL:', error);
                setWSLDistributions([]);
            }
        };
        
        detectWSLDistributions();
        }, 500); // 🚀 Diferir 500ms
        return () => clearTimeout(timer);
    }, []);

    // 🚀 OPTIMIZACIÓN: Detectar disponibilidad de Cygwin DIFERIDO
    useEffect(() => {
        const timer = setTimeout(() => {
        const detectCygwin = async () => {
            if (window.electron && window.electron.platform === 'win32') {
                try {
                    // Usar window.electronAPI.invoke que definimos en preload.js
                    const result = await window.electronAPI.invoke('cygwin:detect');
                    if (result && typeof result.available === 'boolean') {
                        setCygwinAvailable(result.available);
                        // NO actualizar el tab inicial si hay una configuración guardada
                        // Solo actualizar si no hay configuración y el tab actual es PowerShell (el inicial)
                        const defaultTerminal = localStorage.getItem('nodeterm_default_local_terminal');
                        if (result.available && !defaultTerminal) {
                            // Esperar más tiempo para asegurar que las distribuciones WSL se hayan cargado primero
                            setTimeout(() => {
                                setTabs(prevTabs => {
                                    // Solo actualizar si el tab actual es PowerShell (el inicial)
                                    // Y no es una distribución WSL ni Ubuntu
                                    const firstTab = prevTabs[0];
                                    const isDefaultPowerShell = firstTab && 
                                        firstTab.type === 'powershell' && 
                                        firstTab.id === 'tab-1' &&
                                        firstTab.title === 'Windows PowerShell';
                                    
                                    // Verificar que no haya configuración guardada (doble verificación)
                                    const currentDefaultTerminal = localStorage.getItem('nodeterm_default_local_terminal');
                                    if (isDefaultPowerShell && !currentDefaultTerminal) {
                                        return [{
                                            id: 'tab-1',
                                            title: 'Cygwin',
                                            type: 'cygwin',
                                            active: true
                                        }];
                                    }
                                    return prevTabs;
                                });
                            }, 1000); // Delay más largo para dar tiempo a que se carguen las distribuciones WSL
                        }
                        // Cygwin detectado silenciosamente
                    } else {
                        console.warn('⚠️ Cygwin: Respuesta inválida');
                        setCygwinAvailable(false);
                    }
                } catch (error) {
                    console.error('❌ Cygwin: Error de detección');
                    setCygwinAvailable(false);
                }
            }
        };
        
        detectCygwin();
        }, 600); // 🚀 Diferir 600ms (después de WSL)
        return () => clearTimeout(timer);
    }, []);

    // 🚀 OPTIMIZACIÓN: Detectar contenedores Docker DIFERIDO
    useEffect(() => {
        let mounted = true;
        
        const timer = setTimeout(() => {
        const detectDocker = async () => {
            try {
                if (window.electron && window.electronAPI && mounted) {
                    const result = await window.electronAPI.invoke('docker:list');
                    if (mounted && result && result.success && Array.isArray(result.containers)) {
                        setDockerContainers(result.containers);
                    } else {
                        setDockerContainers([]);
                    }
                }
            } catch (error) {
                // Docker no disponible - silencioso
                setDockerContainers([]);
            }
        };
        
        detectDocker();
        }, 700); // 🚀 Diferir 700ms (después de Cygwin)
        
        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, []); // Solo ejecutar UNA VEZ al montar

    // Función para instalar Cygwin bajo demanda
    const installCygwin = async () => {
        try {
            console.log('🚀 Cygwin: Iniciando instalación...');
            
            // Mostrar notificación de inicio
            const proceed = window.confirm(
                '⏳ ¿Instalar Cygwin Portable?\n\n' +
                '• Descarga: ~150 MB\n' +
                '• Tiempo: 5-10 minutos\n' +
                '• Requiere internet\n\n' +
                'Se abrirá una ventana de PowerShell mostrando el progreso.\n\n' +
                '¿Continuar?'
            );
            
            if (!proceed) {
                console.log('❌ Instalación cancelada por el usuario');
                return;
            }
            
            // Llamar al handler de instalación
            console.log('📥 Cygwin: Descargando...');
            const result = await window.electronAPI.invoke('cygwin:install');
            
            if (result.success) {
                console.log('✅ Cygwin: Instalación completada');
                
                // Re-detectar Cygwin
                const detectResult = await window.electronAPI.invoke('cygwin:detect');
                if (detectResult && detectResult.available) {
                    setCygwinAvailable(true);
                    alert('✅ ¡Cygwin instalado correctamente!\n\nAhora puedes crear pestañas de Cygwin.');
                } else {
                    alert('⚠️ Cygwin se instaló pero no se pudo verificar.\n\nPor favor, reinicia la aplicación.');
                }
            } else {
                alert('❌ Error instalando Cygwin:\n\n' + (result.error || 'Error desconocido') + '\n\nPuedes ejecutar manualmente:\n.\\scripts\\create-cygwin-portable.ps1');
            }
        } catch (error) {
            console.error('❌ Cygwin: Error en instalación');
            alert('❌ Error instalando Cygwin:\n\n' + error.message + '\n\nPor favor, ejecuta manualmente:\n.\\scripts\\create-cygwin-portable.ps1');
        }
    };

    // LEGACY: Detección frontend temporal (DESACTIVADA - usando solo backend)
    /*
    useEffect(() => {
        // Código legacy comentado para usar solo detección del backend
    }, []);
    */

    // Cargar el tema de pestañas al montar el componente
    useEffect(() => {
        loadSavedTabTheme();
    }, []);

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
                    window.electron.ipcRenderer.send(`cygwin:stop:${tab.id}`);
                });
            }
        };
    }, []);

    // Handlers de drag & drop para pestañas locales
    const handleLocalTabDragStart = (e, index) => {
        const tab = tabs[index];
        if (!tab) return;
        const timer = setTimeout(() => {
            setDraggedTabIndex(index);
        }, 50);
        setDragStartTimer(timer);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleLocalTabDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverTabIndex(index);
    };

    const handleLocalTabDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setDragOverTabIndex(null);
        }
    };

    const handleLocalTabDrop = (e, dropIndex) => {
        e.preventDefault();
        const dragIndex = draggedTabIndex;
        if (dragIndex === null || dragIndex === dropIndex) {
            setDraggedTabIndex(null);
            setDragOverTabIndex(null);
            return;
        }
        setTabs(prevTabs => {
            const newTabs = [...prevTabs];
            const [moved] = newTabs.splice(dragIndex, 1);
            newTabs.splice(dropIndex, 0, moved);
            return newTabs;
        });
        setDraggedTabIndex(null);
        setDragOverTabIndex(null);
        if (dragStartTimer) {
            clearTimeout(dragStartTimer);
            setDragStartTimer(null);
        }
    };

    const handleLocalTabDragEnd = () => {
        if (dragStartTimer) {
            clearTimeout(dragStartTimer);
            setDragStartTimer(null);
        }
        setDraggedTabIndex(null);
        setDragOverTabIndex(null);
    };
    
    // Efecto para verificar botones de scroll cuando cambian las pestañas
    useEffect(() => {
        // Pequeño delay para asegurar que el DOM se haya actualizado
        const timer = setTimeout(() => {
            checkScrollButtons();
        }, 100);
        
        return () => clearTimeout(timer);
    }, [tabs]);
    
    // Efecto para verificar botones de scroll cuando se redimensiona la ventana
    useEffect(() => {
        const handleResize = () => {
            setTimeout(checkScrollButtons, 100); // Pequeño delay para asegurar que el DOM se haya actualizado
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Efecto para verificar scroll cuando el componente se monta
    useEffect(() => {
        const timer = setTimeout(() => {
            checkScrollButtons();
        }, 200);
        
        return () => clearTimeout(timer);
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

    // Efecto para redimensionar terminales cuando cambia el estado (minimized/maximized/normal)
    useEffect(() => {
        const activeTab = tabs.find(tab => tab.active);
        if (activeTab && terminalState) {
            const forceResize = () => {
                const terminalRef = terminalRefs.current[activeTab.id];
                if (terminalRef && terminalRef.fit) {
                    try {
                        terminalRef.fit();
                    } catch (error) {
                        // Silently handle errors
                    }
                }
            };
            
            // Redimensionar cuando cambia el estado del terminal
            // Usar requestAnimationFrame para asegurar que el layout se haya actualizado
            requestAnimationFrame(() => {
                forceResize();
                setTimeout(forceResize, 0);
                setTimeout(forceResize, 50);
                setTimeout(forceResize, 100);
                setTimeout(forceResize, 200);
                setTimeout(forceResize, 400);
            });
        }
    }, [terminalState, tabs]);

    // Opciones para el selector de tipo de terminal (dinámicas basadas en SO y distribuciones disponibles)
    const getTerminalOptions = () => {
        const platform = window.electron?.platform || 'unknown';
        
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

            // Agregar contenedores Docker si están disponibles
            if (dockerContainers.length > 0) {
                options.push(...dockerContainers.map(container => ({
                    label: `Docker: ${container.name}`,
                    value: `docker-${container.name}`,
                    icon: 'pi pi-box',
                    color: '#2496ED',
                    dockerContainer: container
                })));
            }
            
            return options;
        } else if (platform === 'linux' || platform === 'darwin') {
            // En Linux/macOS: mostrar terminal nativo y Docker si disponible
            const options = [
                { label: 'Terminal', value: 'linux-terminal', icon: 'pi pi-desktop' }
            ];

            // Agregar contenedores Docker si están disponibles
            if (dockerContainers.length > 0) {
                options.push(...dockerContainers.map(container => ({
                    label: `Docker: ${container.name}`,
                    value: `docker-${container.name}`,
                    icon: 'pi pi-box',
                    color: '#2496ED',
                    dockerContainer: container
                })));
            }

            return options;
        } else {
            // Fallback para otros sistemas
            return [
                { label: 'Terminal', value: 'powershell', icon: 'pi pi-desktop' }
            ];
        }
    };
    
    const terminalOptions = getTerminalOptions();
    

    // Función para crear una pestaña RDP con configuración específica
    const createRdpTab = (title, rdpConfig) => {
        const newTabId = `tab-${nextTabId}`;
        
        // Registrar eventos para la nueva pestaña
        if (window.electron) {
            window.electron.ipcRenderer.send('register-tab-events', newTabId);
        }
        
        // Desactivar todas las pestañas
        setTabs(prevTabs => prevTabs.map(tab => ({ ...tab, active: false })));
        
        // Agregar nueva pestaña RDP
        setTabs(prevTabs => {
            const newTabs = [...prevTabs, {
                id: newTabId,
                title: title || 'RDP Session',
                type: 'rdp-guacamole',
                rdpConfig: rdpConfig, // Configuración RDP específica
                active: true
            }];
            return newTabs;
        });
        
        setNextTabId(prev => prev + 1);
        
        // Redimensionar y dar focus al terminal de la nueva pestaña después de que se renderice
        setTimeout(() => {
            const terminalRef = terminalRefs.current[newTabId];
            if (terminalRef && terminalRef.fit) {
                terminalRef.fit();
            }
            // Dar focus al terminal para que el cursor sea visible inmediatamente
            if (terminalRef && terminalRef.focus) {
                terminalRef.focus();
            }
        }, 200);
        
        // Intentos adicionales para asegurar el focus
        setTimeout(() => {
            const terminalRef = terminalRefs.current[newTabId];
            if (terminalRef && terminalRef.focus) {
                terminalRef.focus();
            }
        }, 300);
        
        setTimeout(() => {
            const terminalRef = terminalRefs.current[newTabId];
            if (terminalRef && terminalRef.focus) {
                terminalRef.focus();
            }
        }, 500);
    };

    // Función para crear una nueva pestaña
    const createNewTab = (terminalTypeOverride = null) => {
        // Usar siempre el terminal por defecto (configuración guardada). El dropdown sigue pudiendo pasar un override.
        const defaultTerminalType = getDefaultTerminalType();
        const terminalTypeToUse = terminalTypeOverride || defaultTerminalType || selectedTerminalType;
        // console.log('Creating new tab, type:', terminalTypeToUse);
        const newTabId = `tab-${nextTabId}`;
        
        // Determinar título y tipo basado en la selección
        let title, terminalType, distroInfo = null;

        // Detectar si el valor seleccionado es directamente el nombre/label de una distro WSL
        const findDistroByValue = (value) => {
            if (!value) return null;
            const normalized = value.startsWith('wsl-') ? value.replace('wsl-', '') : value;
            return wslDistributions.find(d =>
                d.name === normalized ||
                d.label === normalized ||
                d.name?.toLowerCase?.() === normalized.toLowerCase() ||
                d.label?.toLowerCase?.() === normalized.toLowerCase()
            );
        };
        const matchedDistro = findDistroByValue(terminalTypeToUse);
        
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
        } else if (terminalTypeToUse === 'rdp-guacamole') {
            title = 'RDP Session';
            terminalType = 'rdp-guacamole';
        } else if (terminalTypeToUse === 'cygwin') {
            // Verificar si Cygwin está instalado antes de crear la pestaña
            if (!cygwinAvailable) {
                // Mostrar diálogo para instalar Cygwin
                const install = window.confirm(
                    '🐧 Cygwin no está instalado en la aplicación.\n\n' +
                    '¿Deseas instalarlo ahora?\n\n' +
                    'Esto descargará e instalará Cygwin portable (~150 MB).\n' +
                    'Puede tomar 5-10 minutos.\n\n' +
                    'Nota: Requiere conexión a internet.'
                );
                
                if (install) {
                    // Iniciar instalación de Cygwin
                    installCygwin();
                }
                return; // No crear la pestaña aún
            }
            
            title = 'Cygwin';
            terminalType = 'cygwin';
        } else if (terminalTypeToUse.startsWith('wsl-') || matchedDistro) {
            // Extraer información de la distribución WSL seleccionada (permite tanto "wsl-<name>" como "<name>")
            const selectedDistro = matchedDistro || findDistroByValue(terminalTypeToUse);

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
        } else if (terminalTypeToUse.startsWith('docker-')) {
            // Extraer información del contenedor Docker seleccionado
            const containerName = terminalTypeToUse.replace('docker-', '');
            console.log('🐳 Buscando contenedor:', containerName, 'en', dockerContainers.map(c => c.name));
            const selectedContainer = dockerContainers.find(c => c.name === containerName);
            
            if (selectedContainer) {
                title = `🐳 ${selectedContainer.name}`;
                terminalType = 'docker';
                distroInfo = {
                    containerName: selectedContainer.name,
                    containerId: selectedContainer.id,
                    shortId: selectedContainer.shortId
                };
                console.log('🐳 Contenedor encontrado:', distroInfo);
            } else {
                console.warn('🐳 Contenedor NO encontrado, usando fallback:', containerName);
                title = `🐳 ${containerName}`;
                terminalType = 'docker';
                distroInfo = {
                    containerName: containerName,
                    containerId: 'unknown',
                    shortId: 'unknown'
                };
            }
        } else {
            title = 'Terminal';
            terminalType = terminalTypeToUse;
        }
        
        
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
                type: terminalType,  // Tipo de terminal: powershell, wsl, cygwin, ubuntu, etc.
                distroInfo: distroInfo, // Información específica para distribuciones WSL
                active: true
            }];
            // console.log('New tabs state:', newTabs);
            return newTabs;
        });
        
        setNextTabId(prev => prev + 1);
        
        // Redimensionar y dar focus al terminal de la nueva pestaña después de que se renderice
        setTimeout(() => {
            const terminalRef = terminalRefs.current[newTabId];
            if (terminalRef && terminalRef.fit) {
                terminalRef.fit();
            }
            // Dar focus al terminal para que el cursor sea visible inmediatamente
            if (terminalRef && terminalRef.focus) {
                terminalRef.focus();
            }
        }, 200);
        
        // Intentos adicionales para asegurar el focus
        setTimeout(() => {
            const terminalRef = terminalRefs.current[newTabId];
            if (terminalRef && terminalRef.focus) {
                terminalRef.focus();
            }
        }, 300);
        
        setTimeout(() => {
            const terminalRef = terminalRefs.current[newTabId];
            if (terminalRef && terminalRef.focus) {
                terminalRef.focus();
            }
        }, 500);
    };
    createNewTabRef.current = createNewTab;

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
            window.electron.ipcRenderer.send(`cygwin:stop:${tabId}`);
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

    // Obtener los colores del tema de pestañas seleccionado
    const getTabColors = () => {
        // Obtener estilos computados del documento (que incluyen los temas de pestañas)
        const rootStyles = getComputedStyle(document.documentElement);
        
        // Leer las variables CSS del tema de pestañas
        const tabBg = rootStyles.getPropertyValue('--ui-tab-bg')?.trim() || '#2d3138';
        const tabActiveBg = rootStyles.getPropertyValue('--ui-tab-active-bg')?.trim() || '#1f2329';
        const tabText = rootStyles.getPropertyValue('--ui-tab-text')?.trim() || '#d6d8db';
        const tabActiveText = rootStyles.getPropertyValue('--ui-tab-active-text')?.trim() || '#ffffff';
        
        return { tabBg, tabActiveBg, tabText, tabActiveText };
    };
    
    const { tabBg, tabActiveBg, tabText, tabActiveText } = getTabColors();

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
                background: tabBg,
                borderBottom: 'none',
                display: 'flex',
                alignItems: 'center',
                minHeight: '40px',
                overflow: 'hidden'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: 1,
                    overflow: 'hidden',
                    minWidth: 0, // Permite que se contraiga
                    marginLeft: '4px' // Margen izquierdo para que no esté pegado
                }}>
                    {/* Flecha izquierda */}
                    {(canScrollLeft || tabs.length > 3) && (
                        <Button
                            icon="pi pi-chevron-left"
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
                                marginRight: '4px'
                            }}
                            onClick={() => scrollTabs('left')}
                            aria-label="Desplazar pestañas a la izquierda"
                            title="Desplazar pestañas a la izquierda"
                        />
                    )}
                    
                    {/* Pestañas */}
                    <div 
                        ref={tabsContainerRef}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'auto',
                            scrollbarWidth: 'none', // Firefox
                            msOverflowStyle: 'none', // IE/Edge
                            WebkitScrollbar: { display: 'none' }, // Webkit browsers
                            flex: '0 1 auto', // Ajustar al contenido
                            minWidth: 0, // Permite que se contraiga
                            maxWidth: 'calc(100% - 150px)', // Dejar espacio para los botones
                            height: '40px'
                        }}
                        className="hide-scrollbar"
                        onScroll={checkScrollButtons}
                    >
                        {tabs.map((tab, index) => (
                            <div
                                key={tab.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: tab.active ? tabActiveBg : 'transparent',
                                    color: tab.active ? tabActiveText : tabText,
                                    borderTop: tab.active ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                                    borderRight: tab.active ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                                    borderBottom: 'none',
                                    // Use individual border properties instead of shorthand
                                    borderLeftColor: dragOverTabIndex === index ? 'var(--primary-color)' : (tab.active ? 'rgba(255,255,255,0.1)' : 'transparent'),
                                    borderLeftWidth: dragOverTabIndex === index ? '3px' : '1px',
                                    borderLeftStyle: 'solid',
                                    padding: '6px 12px',
                                    cursor: draggedTabIndex === index ? 'grabbing' : 'grab',
                                    position: 'relative',
                                    minWidth: '150px',
                                    maxWidth: '220px',
                                    flexShrink: 0, // Evita que las pestañas se contraigan
                                    borderTopLeftRadius: '4px',
                                    borderTopRightRadius: '4px',
                                    transition: 'all 0.2s ease',
                                    opacity: draggedTabIndex === index ? 0.5 : (tab.active ? 1 : 0.8)
                                }}
                                onClick={(e) => {
                                    if (draggedTabIndex !== null || dragStartTimer !== null) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        return;
                                    }
                                    switchTab(tab.id);
                                }}
                                onMouseEnter={(e) => {
                                    if (!tab.active && draggedTabIndex === null) {
                                        e.target.style.background = 'rgba(255,255,255,0.05)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!tab.active && draggedTabIndex === null) {
                                        e.target.style.background = 'transparent';
                                    }
                                }}
                                draggable={true}
                                onDragStart={(e) => handleLocalTabDragStart(e, index)}
                                onDragOver={(e) => handleLocalTabDragOver(e, index)}
                                onDragLeave={handleLocalTabDragLeave}
                                onDrop={(e) => handleLocalTabDrop(e, index)}
                                onDragEnd={handleLocalTabDragEnd}
                            >
                                {tab.type === 'powershell' ? (
                                    <FaWindows style={{ 
                                        color: '#4fc3f7',
                                        fontSize: '12px',
                                        marginRight: '6px'
                                    }} />
                                ) : (
                                    <i 
                                        className={tab.type === 'wsl' ? 'pi pi-server' : 
                                                  tab.type === 'cygwin' ? 'pi pi-code' :
                                                  tab.type === 'docker' ? 'pi pi-box' :
                                                  tab.type === 'rdp-guacamole' ? 'pi pi-desktop' : 'pi pi-circle'} 
                                        style={{ 
                                            color: tab.type === 'wsl' ? '#8ae234' : 
                                                   tab.type === 'cygwin' ? '#00FF00' :
                                                   tab.type === 'docker' ? '#2496ED' :
                                                   tab.type === 'rdp-guacamole' ? '#ff6b35' : '#e95420',
                                            fontSize: '12px',
                                            marginRight: '6px'
                                        }}
                                    />
                                )}
                                <span style={{
                                    color: tab.active ? tabActiveText : tabText,
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
                    </div>
                    
                    {/* Flecha derecha */}
                    {(canScrollRight || tabs.length > 3) && (
                        <Button
                            icon="pi pi-chevron-right"
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
                                marginLeft: '4px',
                                marginRight: '4px'
                            }}
                            onClick={() => scrollTabs('right')}
                            aria-label="Desplazar pestañas a la derecha"
                            title="Desplazar pestañas a la derecha"
                        />
                    )}
                        
                        {/* Botones estilo PowerShell al lado de las pestañas */}
                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '6px', gap: '4px' }}>
                            {/* Botón para nueva pestaña */}
                            <Button
                                icon="pi pi-plus"
                                className="p-button-text p-button-sm tab-action-button"
                                style={{
                                    color: 'var(--ui-tab-text, rgba(255, 255, 255, 0.7))',
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '0',
                                    minWidth: '18px',
                                    width: '18px',
                                    height: '18px',
                                    fontSize: '9px',
                                    borderRadius: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
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
                                className="p-button-text p-button-sm tab-action-button"
                                style={{
                                    color: 'var(--ui-tab-text, rgba(255, 255, 255, 0.7))',
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '0',
                                    minWidth: '18px',
                                    width: '18px',
                                    height: '18px',
                                    fontSize: '8px',
                                    borderRadius: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                onClick={(e) => {
                                    // Crear un menú contextual
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    // Recalcular terminalOptions en el momento del click para asegurar que Docker esté incluido
                                    const currentTerminalOptions = getTerminalOptions();
                                    
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
                                    
                                    // Separar opciones locales y Docker
                                    const localOptions = currentTerminalOptions.filter(opt => !opt.value.startsWith('docker-'));
                                    const dockerOptions = currentTerminalOptions.filter(opt => opt.value.startsWith('docker-'));
                                    
                                    // Agregar opciones locales
                                    localOptions.forEach((option) => {
                                        const item = document.createElement('div');
                                        item.style.padding = '8px 12px';
                                        item.style.cursor = 'pointer';
                                        item.style.display = 'flex';
                                        item.style.alignItems = 'center';
                                        item.style.gap = '8px';
                                        item.style.color = '#ffffff';
                                        item.style.fontSize = '12px';
                                        item.style.transition = 'background-color 0.2s';
                                        
                                        const iconColor = option.value === 'powershell' ? '#4fc3f7' : 
                                                        option.value === 'wsl' ? '#8ae234' : 
                                                        option.value === 'cygwin' ? '#00FF00' : '#e95420';
                                        
                                        // Usar icono de Windows para PowerShell, icono de PrimeReact para otros
                                        const iconHTML = option.value === 'powershell' 
                                            ? `<svg width="12" height="12" viewBox="0 0 448 512" fill="${iconColor}" style="margin-right: 0;"><path d="M0 93.7l183.6-25.3v177.4H0V93.7zm0 324.6l183.6 25.3V268.4H0v149.9zm203.8 28L448 480V268.4H203.8v177.9zm0-380.6v180.1H448V32L203.8 65.7z"/></svg>`
                                            : `<i class="${option.icon}" style="color: ${iconColor}; font-size: 12px;"></i>`;
                                        
                                        item.innerHTML = `
                                            ${iconHTML}
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
                                    
                                    // Agregar Docker submenu si hay contenedores
                                    if (dockerOptions.length > 0) {
                                        const divider = document.createElement('div');
                                        divider.style.height = '1px';
                                        divider.style.background = 'rgba(255, 255, 255, 0.1)';
                                        divider.style.margin = '4px 0';
                                        menu.appendChild(divider);
                                        
                                        const dockerItem = document.createElement('div');
                                        dockerItem.style.padding = '8px 12px';
                                        dockerItem.style.cursor = 'pointer';
                                        dockerItem.style.display = 'flex';
                                        dockerItem.style.alignItems = 'center';
                                        dockerItem.style.gap = '8px';
                                        dockerItem.style.color = '#ffffff';
                                        dockerItem.style.fontSize = '12px';
                                        dockerItem.style.transition = 'background-color 0.2s';
                                        dockerItem.style.position = 'relative';
                                        
                                        dockerItem.innerHTML = `
                                            <i class="pi pi-box" style="color: #2496ED; font-size: 12px;"></i>
                                            <span>🐳 Docker</span>
                                            <i class="pi pi-chevron-right" style="margin-left: auto; font-size: 10px; color: rgba(255,255,255,0.6);"></i>
                                        `;
                                        
                                        let submenuVisible = false;
                                        let submenu = null;
                                        let hideTimeout = null;
                                        
                                        const showSubmenu = () => {
                                            // Cancelar el timeout de ocultamiento si existe
                                            if (hideTimeout) {
                                                clearTimeout(hideTimeout);
                                                hideTimeout = null;
                                            }
                                            
                                            if (submenuVisible && submenu) return;
                                            
                                            submenu = document.createElement('div');
                                            submenu.style.position = 'absolute';
                                            submenu.style.left = '100%';
                                            submenu.style.top = '0';
                                            submenu.style.background = '#2a4a6b';
                                            submenu.style.border = '1px solid #3a5a7b';
                                            submenu.style.borderRadius = '4px';
                                            submenu.style.padding = '4px 0';
                                            submenu.style.minWidth = '200px';
                                            submenu.style.zIndex = '1001';
                                            submenu.style.marginLeft = '4px';
                                            
                                            dockerOptions.forEach(option => {
                                                const subItem = document.createElement('div');
                                                subItem.style.padding = '8px 12px';
                                                subItem.style.cursor = 'pointer';
                                                subItem.style.color = '#ffffff';
                                                subItem.style.fontSize = '12px';
                                                subItem.style.transition = 'background-color 0.2s';
                                                subItem.style.display = 'flex';
                                                subItem.style.alignItems = 'center';
                                                subItem.style.gap = '8px';
                                                
                                                subItem.innerHTML = `
                                                    <i class="pi pi-box" style="color: #2496ED; font-size: 12px;"></i>
                                                    <span>${option.label.replace('Docker: ', '')}</span>
                                                `;
                                                
                                                subItem.addEventListener('mouseenter', () => {
                                                    subItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                                });
                                                
                                                subItem.addEventListener('mouseleave', () => {
                                                    subItem.style.backgroundColor = 'transparent';
                                                });
                                                
                                                subItem.addEventListener('click', () => {
                                                    setSelectedTerminalType(option.value);
                                                    createNewTab(option.value);
                                                    document.body.removeChild(menu);
                                                });
                                                
                                                submenu.appendChild(subItem);
                                            });
                                            
                                            dockerItem.appendChild(submenu);
                                            submenuVisible = true;
                                        };
                                        
                                        const hideSubmenu = () => {
                                            hideTimeout = setTimeout(() => {
                                                if (submenu && dockerItem.contains(submenu)) {
                                                    dockerItem.removeChild(submenu);
                                                }
                                                submenuVisible = false;
                                                submenu = null;
                                            }, 200); // Esperar 200ms antes de ocultarlo
                                        };
                                        
                                        dockerItem.addEventListener('mouseenter', showSubmenu);
                                        dockerItem.addEventListener('mouseleave', hideSubmenu);
                                        
                                        // Cuando el mouse entra al submenu, cancelar el ocultamiento
                                        dockerItem.addEventListener('mouseenter', () => {
                                            if (submenu) {
                                                submenu.addEventListener('mouseenter', showSubmenu);
                                                submenu.addEventListener('mouseleave', hideSubmenu);
                                            }
                                        });
                                        
                                        menu.appendChild(dockerItem);
                                    }
                                    
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
                                justifyContent: 'center',
                                position: 'relative',
                                zIndex: 10001,
                                pointerEvents: 'auto'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (onMinimize) {
                                    onMinimize();
                                }
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                            }}
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
                                justifyContent: 'center',
                                position: 'relative',
                                zIndex: 10001,
                                pointerEvents: 'auto'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (onMaximize) {
                                    onMaximize();
                                }
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                            }}
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
                        {(() => {
                            // Log para depurar el tipo de terminal (deshabilitado)
                            // if (tab.id === 'tab-1') {
                            //     console.log('🔍 Renderizando terminal para tab-1:', {
                            //         type: tab.type,
                            //         title: tab.title,
                            //         hasDistroInfo: !!tab.distroInfo,
                            //         distroInfo: tab.distroInfo,
                            //         updateKey: tab._updateKey,
                            //         isPowerShell: tab.type === 'powershell',
                            //         isUbuntu: tab.type === 'ubuntu',
                            //         isWslDistro: tab.type === 'wsl-distro',
                            //         willRenderPowerShell: tab.type === 'powershell',
                            //         willRenderUbuntu: (tab.type === 'ubuntu' || tab.type === 'wsl-distro')
                            //     });
                            // }
                            return null;
                        })()}
                        {tab.type === 'powershell' ? (
                            <PowerShellTerminal
                                key={`${tab.id}-terminal-powershell-${tab._updateKey || ''}`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                fontFamily={localFontFamily}
                                fontSize={localFontSize}
                                theme={themes[localPowerShellTheme]?.theme || powershellXtermTheme}
                                hideStatusBar={hideStatusBar}
                            />
                        ) : tab.type === 'wsl' ? (
                            <WSLTerminal 
                                key={`${tab.id}-terminal-wsl-${tab._updateKey || ''}`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                theme={themes[localLinuxTerminalTheme]?.theme || linuxXtermTheme}
                                hideStatusBar={hideStatusBar}
                            />
                        ) : (tab.type === 'ubuntu' || tab.type === 'wsl-distro') ? (
                            (() => {
                                const ubuntuInfo = tab.distroInfo || tab.ubuntuInfo;
                                if (!ubuntuInfo) {
                                    console.error('❌ ERROR: UbuntuTerminal sin ubuntuInfo!', {
                                        tabId: tab.id,
                                        tabType: tab.type,
                                        tabTitle: tab.title,
                                        tab: tab
                                    });
                                }
                                return (
                                    <UbuntuTerminal 
                                        key={`${tab.id}-terminal-${tab.type}-${ubuntuInfo?.name || 'no-info'}-${tab._updateKey || ''}`}
                                        ref={(ref) => {
                                            if (ref) terminalRefs.current[tab.id] = ref;
                                        }}
                                        tabId={tab.id}
                                        ubuntuInfo={ubuntuInfo}
                                        fontFamily={localFontFamily}
                                        fontSize={localFontSize}
                                        theme={themes[localLinuxTerminalTheme]?.theme || linuxXtermTheme}
                                        hideStatusBar={hideStatusBar}
                                    />
                                );
                            })()
                        ) : tab.type === 'cygwin' ? (
                            <CygwinTerminal 
                                key={`${tab.id}-terminal`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                fontFamily={localFontFamily}
                                fontSize={localFontSize}
                                theme={themes[localLinuxTerminalTheme]?.theme || linuxXtermTheme}
                                hideStatusBar={hideStatusBar}
                            />
                        ) : tab.type === 'docker' ? (
                            <DockerTerminal 
                                key={`${tab.id}-terminal`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                dockerInfo={tab.distroInfo}
                                fontFamily={localFontFamily}
                                fontSize={localFontSize}
                                theme={themes[localLinuxTerminalTheme]?.theme || linuxXtermTheme}
                                hideStatusBar={hideStatusBar}
                            />
                        ) : tab.type === 'rdp-guacamole' ? (
                            <GuacamoleTerminal 
                                key={`${tab.id}-terminal`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                rdpConfig={tab.rdpConfig}
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
});

TabbedTerminal.displayName = 'TabbedTerminal';

export default TabbedTerminal;
