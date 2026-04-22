import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { FaWindows, FaUbuntu, FaLinux } from 'react-icons/fa';
import { SiDebian, SiDocker } from 'react-icons/si';
import PowerShellTerminal from './PowerShellTerminal';
import WSLTerminal from './WSLTerminal';
import UbuntuTerminal from './UbuntuTerminal';
import CygwinTerminal from './CygwinTerminal';
import DockerTerminal from './DockerTerminal';
import ClaudeTerminal from './ClaudeTerminal';
import OpenCodeTerminal from './OpenCodeTerminal';
import GeminiCliTerminal from './GeminiCliTerminal';
import CodexCliTerminal from './CodexCliTerminal';
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

const TabbedTerminal = forwardRef(({ onMinimize, onMaximize, terminalState, localFontFamily, localFontSize, localPowerShellTheme, localLinuxTerminalTheme, hideStatusBar = false, hideTabs = false, isIntegrated = false, onTabChange, persistenceKey = null }, ref) => {
    // Referencias para control de scroll de pestañas
    const tabsContainerRef = useRef(null);
    const dropdownRef = useRef(null);
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
                'claude': 'Claude Code',
                'opencode': 'OpenCode',
                'geminicli': 'Gemini CLI',
                'codexcli': 'Codex CLI',
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
                        type: wslDistro.category === 'ubuntu' ? 'ubuntu' : (wslDistro.category === 'debian' ? 'debian' : 'wsl-distro'),
                        distroInfo: wslDistro, // Agregar información completa de la distribución
                        active: true
                    };
                }
            }

            // Si es un tipo de terminal conocido
            if (terminalTitles[defaultTerminal]) {
                const title = defaultTerminal === 'linux-terminal'
                    ? (platform === 'darwin' ? 'Terminal macOS' : 'Terminal Linux')
                    : terminalTitles[defaultTerminal];
                return {
                    id: 'tab-1',
                    title: title,
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

    const getInitialWorkspace = () => {
        const fallbackTabs = [getInitialTab(false, [])];
        if (!persistenceKey) {
            return { tabs: fallbackTabs, nextTabId: 2 };
        }

        try {
            const raw = localStorage.getItem(persistenceKey);
            if (!raw) {
                return { tabs: fallbackTabs, nextTabId: 2 };
            }

            const parsed = JSON.parse(raw);
            const parsedTabs = Array.isArray(parsed?.tabs) ? parsed.tabs : [];
            if (!parsedTabs.length) {
                return { tabs: fallbackTabs, nextTabId: 2 };
            }

            const normalizedTabs = parsedTabs.map((tab, index) => ({
                ...tab,
                active: Boolean(tab?.active) && index >= 0
            }));
            if (!normalizedTabs.some(tab => tab.active)) {
                normalizedTabs[0].active = true;
            }

            return {
                tabs: normalizedTabs,
                nextTabId: Number.isFinite(parsed?.nextTabId) ? parsed.nextTabId : (normalizedTabs.length + 1)
            };
        } catch (error) {
            console.warn('[TabbedTerminal] No se pudo restaurar workspace:', error);
            return { tabs: fallbackTabs, nextTabId: 2 };
        }
    };

    const initialWorkspace = getInitialWorkspace();
    const [tabs, setTabs] = useState(initialWorkspace.tabs);
    const [nextTabId, setNextTabId] = useState(initialWorkspace.nextTabId);

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
            (firstTab.type === 'ubuntu' || firstTab.type === 'wsl-distro' || firstTab.type === 'debian') &&
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

        const searchTerms = [];
        if (defaultTerminal && typeof defaultTerminal === 'string') {
            searchTerms.push(defaultTerminal);
        }
        if (firstTab.title && typeof firstTab.title === 'string' && firstTab.title !== 'Windows PowerShell') {
            searchTerms.push(firstTab.title);
        }

        let wslDistro = null;
        for (const term of searchTerms) {
            const normalizedTerm = String(term).toLowerCase();
            wslDistro = wslDistributions.find(d => {
                const name = d.name ? String(d.name).toLowerCase() : '';
                const label = d.label ? String(d.label).toLowerCase() : '';
                return d.name === term ||
                    d.label === term ||
                    name === normalizedTerm ||
                    label === normalizedTerm;
            });
            if (wslDistro) {
                // console.log('✅ [useEffect WSL] Distribución encontrada por término:', term, wslDistro);
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
                        type: wslDistro.category === 'ubuntu' ? 'ubuntu' : (wslDistro.category === 'debian' ? 'debian' : 'wsl-distro'), // Corregido: incluir debian
                        distroInfo: wslDistro // Agregar información completa de la distribución
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
            // Solo loguear si realmente parece que debería haber sido una distro WSL
            const isWSLCandidate = (term) => {
                if (!term || typeof term !== 'string') return false;
                const l = term.toLowerCase();
                return l.includes('ubuntu') || l.includes('debian') || l.includes('wsl') || l.includes('kali') || l.includes('linux');
            };

            if (isWSLCandidate(defaultTerminal) || isWSLCandidate(firstTab.title)) {
                console.warn('⚠️ [useEffect WSL] No se encontró distribución WSL para:', {
                    defaultTerminal,
                    currentTitle: firstTab.title,
                    searchTerms,
                    availableDistros: wslDistributions.map(d => ({ name: d.name, label: d.label, category: d.category }))
                });
            }
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
            (firstTab.type === 'ubuntu' || firstTab.type === 'wsl-distro' || firstTab.type === 'debian') &&
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
            if (defaultTerminal && typeof defaultTerminal === 'string') {
                searchTerms.push(defaultTerminal);
            }
            if (firstTab.title && typeof firstTab.title === 'string') {
                searchTerms.push(firstTab.title);
            }

            let wslDistro = null;
            for (const term of searchTerms) {
                const normalizedTerm = String(term).toLowerCase();
                wslDistro = wslDistributions.find(d => {
                    const name = d.name ? String(d.name).toLowerCase() : '';
                    const label = d.label ? String(d.label).toLowerCase() : '';
                    return d.name === term ||
                        d.label === term ||
                        name === normalizedTerm ||
                        label === normalizedTerm;
                });
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
                        type: wslDistro.category === 'ubuntu' ? 'ubuntu' : (wslDistro.category === 'debian' ? 'debian' : 'wsl-distro'), // Corregido: incluir debian
                        title: expectedTitle, // Actualizar título también
                        distroInfo: wslDistro // Agregar distroInfo
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
                                    type: wslDistro.category === 'ubuntu' ? 'ubuntu' : (wslDistro.category === 'debian' ? 'debian' : 'wsl-distro'), // Corregido: incluir debian
                                    distroInfo: wslDistro // Agregar información completa de la distribución
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
    const fitRafIdRef = useRef(null);
    const fitTimeoutIdsRef = useRef([]);

    useEffect(() => {
        if (!persistenceKey) return;
        try {
            localStorage.setItem(
                persistenceKey,
                JSON.stringify({
                    tabs,
                    nextTabId,
                    selectedTerminalType
                })
            );
        } catch (error) {
            console.warn('[TabbedTerminal] No se pudo persistir workspace:', error);
        }
    }, [tabs, nextTabId, selectedTerminalType, persistenceKey]);

    const cancelScheduledFit = useCallback(() => {
        if (fitRafIdRef.current) {
            cancelAnimationFrame(fitRafIdRef.current);
            fitRafIdRef.current = null;
        }
        if (fitTimeoutIdsRef.current.length) {
            fitTimeoutIdsRef.current.forEach(id => clearTimeout(id));
            fitTimeoutIdsRef.current = [];
        }
    }, []);

    const scheduleFitForTab = useCallback((tabId) => {
        cancelScheduledFit();

        const doFit = () => {
            const terminalRef = terminalRefs.current[tabId];
            if (terminalRef && terminalRef.fit) {
                try {
                    terminalRef.fit();
                } catch (error) {
                    // Silently handle errors
                }
            }
        };

        // Un RAF + 2 intentos diferidos suele ser suficiente sin saturar el main thread
        fitRafIdRef.current = requestAnimationFrame(() => {
            fitRafIdRef.current = null;
            doFit();
        });
        fitTimeoutIdsRef.current.push(setTimeout(doFit, 60));
        fitTimeoutIdsRef.current.push(setTimeout(doFit, 220));
    }, [cancelScheduledFit]);

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
            const isMac = window.electron?.platform === 'darwin';
            const terminalTitles = {
                'powershell': isMac ? 'Terminal macOS' : (window.electron?.platform === 'linux' ? 'Terminal Linux' : 'Windows PowerShell'),
                'wsl': 'WSL',
                'cygwin': 'Cygwin',
                'ubuntu': 'Ubuntu',
                'claude': 'Claude Code',
                'opencode': 'OpenCode',
                'geminicli': 'Gemini CLI',
                'codexcli': 'Codex CLI',
                'linux-terminal': isMac ? 'Terminal macOS' : 'Terminal Linux'
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
                } else if (terminalType === 'ubuntu' || terminalType === 'wsl-distro' || terminalType === 'debian') {
                    // Mapear 'debian' al canal 'wsl-distro' si es el tipo guardado en el tab
                    const channelPrefix = terminalType === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
                    window.electron.ipcRenderer.send(`${channelPrefix}:data:${tabId}`, finalCommand);
                } else if (terminalType === 'cygwin') {
                    window.electron.ipcRenderer.send(`cygwin:data:${tabId}`, finalCommand);
                } else if (terminalType === 'claude') {
                    window.electron.ipcRenderer.send(`claude:data:${tabId}`, finalCommand);
                } else if (terminalType === 'opencode') {
                    window.electron.ipcRenderer.send(`opencode:data:${tabId}`, finalCommand);
                } else if (terminalType === 'geminicli') {
                    window.electron.ipcRenderer.send(`geminicli:data:${tabId}`, finalCommand);
                } else if (terminalType === 'codexcli') {
                    window.electron.ipcRenderer.send(`codexcli:data:${tabId}`, finalCommand);
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
            } else if ((terminalType === 'ubuntu' || terminalType === 'wsl' || terminalType === 'debian') && distroInfo?.name) {
                override = distroInfo.name.startsWith('wsl-') ? distroInfo.name : 'wsl-' + distroInfo.name;
            } else if ((terminalType === 'ubuntu' || terminalType === 'wsl' || terminalType === 'debian') && distroInfo) {
                const n = distroInfo.name || distroInfo.label;
                override = n ? 'wsl-' + n : 'wsl';
            } else if (terminalType === 'ubuntu' || terminalType === 'wsl' || terminalType === 'debian') {
                override = terminalType === 'debian' ? 'wsl-debian' : 'wsl';
            }
            createNewTabRef.current?.(override, distroInfo);
        },
        replaceActiveTabWithTerminal: (terminalType, distroInfo = null) => {
            tabs.forEach(tab => closeTab(tab.id));
            setTimeout(() => {
                let override = terminalType;
                if (terminalType === 'docker' && distroInfo?.containerName) {
                    override = 'docker-' + distroInfo.containerName;
                } else if ((terminalType === 'ubuntu' || terminalType === 'wsl' || terminalType === 'debian') && distroInfo?.name) {
                    override = distroInfo.name.startsWith('wsl-') ? distroInfo.name : 'wsl-' + distroInfo.name;
                }
                createNewTabRef.current?.(override, distroInfo);
            }, 10);
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
                                                type: wslDistro.category === 'ubuntu' ? 'ubuntu' : (wslDistro.category === 'debian' ? 'debian' : 'wsl-distro'),
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
            scheduleFitForTab(activeTab.id);
        }
        return () => {
            // Si el efecto se reemplaza rápidamente (tab change), cancelamos fits pendientes
            cancelScheduledFit();
        };
    }, [tabs, activeTabKey, scheduleFitForTab, cancelScheduledFit]);

    // Efecto adicional que se ejecuta cuando cambia la key activa
    useEffect(() => {
        const activeTab = tabs.find(tab => tab.active);
        if (activeTab && activeTabKey > 0) {
            scheduleFitForTab(activeTab.id);
        }
        return () => cancelScheduledFit();
    }, [activeTabKey, tabs, scheduleFitForTab, cancelScheduledFit]);

    // Efecto para redimensionar terminales cuando cambia el estado (minimized/maximized/normal)
    useEffect(() => {
        const activeTab = tabs.find(tab => tab.active);
        if (activeTab && terminalState) {
            scheduleFitForTab(activeTab.id);
        }
        return () => cancelScheduledFit();
    }, [terminalState, tabs, scheduleFitForTab, cancelScheduledFit]);

    // Opciones para el selector de tipo de terminal (dinámicas basadas en SO y distribuciones disponibles)
    const getTerminalOptions = () => {
        const platform = window.electron?.platform || 'unknown';

        if (platform === 'win32') {
            // En Windows: mostrar PowerShell, WSL, Cygwin y cada distribución WSL detectada
            const options = [
                { label: 'PowerShell', value: 'powershell', icon: 'pi pi-desktop' },
                { label: 'Claude Code', value: 'claude', icon: 'pi pi-comments', color: '#f59e0b' },
                { label: 'OpenCode', value: 'opencode', icon: 'pi pi-code', color: '#6366f1' },
                { label: 'Gemini CLI', value: 'geminicli', icon: 'pi pi-star', color: '#1a73e8' },
                { label: 'Codex CLI', value: 'codexcli', icon: 'pi pi-bolt', color: '#10b981' },
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
                { label: 'Terminal', value: 'linux-terminal', icon: 'pi pi-desktop' },
                { label: 'Claude Code', value: 'claude', icon: 'pi pi-comments', color: '#f59e0b' },
                { label: 'OpenCode', value: 'opencode', icon: 'pi pi-code', color: '#6366f1' },
                { label: 'Gemini CLI', value: 'geminicli', icon: 'pi pi-star', color: '#1a73e8' },
                { label: 'Codex CLI', value: 'codexcli', icon: 'pi pi-bolt', color: '#10b981' }
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
    const createNewTab = async (terminalTypeOverride = null, explicitDistroInfo = null) => {
        // Usar siempre el terminal por defecto (configuración guardada). El dropdown sigue pudiendo pasar un override.
        const defaultTerminalType = getDefaultTerminalType();
        const terminalTypeToUse = terminalTypeOverride || defaultTerminalType || selectedTerminalType;
        // console.log('Creating new tab, type:', terminalTypeToUse);
        const newTabId = `tab-${nextTabId}`;

        // Determinar título y tipo basado en la selección
        let title, terminalType, distroInfo = explicitDistroInfo;

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
        const matchedDistro = distroInfo || findDistroByValue(terminalTypeToUse);

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
            // Re-detectar Cygwin en tiempo real (evita pedir instalar si ya está empaquetado o recién instalado)
            try {
                const det = await window.electronAPI.invoke('cygwin:detect');
                if (det?.available) {
                    setCygwinAvailable(true);
                    title = 'Cygwin';
                    terminalType = 'cygwin';
                } else {
                    const vi = await window.electronAPI.invoke('get-version-info');
                    if (vi?.isPackaged) {
                        window.alert(
                            'Cygwin viene incluido en NodeTerm.\n\n' +
                            'No se ha encontrado; puede que la instalación esté dañada.\n\n' +
                            'Prueba a reinstalar la aplicación.'
                        );
                        return;
                    }
                    // Desarrollo: ofrecer instalación (script create-cygwin-portable)
                    installCygwin();
                    return;
                }
            } catch (e) {
                console.error('Cygwin: error en detección o versión', e);
                setCygwinAvailable(false);
                return;
            }
        } else if (terminalTypeToUse.startsWith('wsl-') || terminalTypeToUse === 'debian' || matchedDistro || terminalTypeToUse.toLowerCase().includes('ubuntu') || terminalTypeToUse.toLowerCase().includes('debian')) {
            // Extraer información de la distribución WSL seleccionada (permite tanto "wsl-<name>" como "<name>")
            const selectedDistro = matchedDistro || findDistroByValue(terminalTypeToUse);

            if (selectedDistro) {
                title = selectedDistro.label;
                terminalType = selectedDistro.category === 'ubuntu' ? 'ubuntu' : (selectedDistro.category === 'debian' ? 'debian' : 'wsl-distro');
                distroInfo = {
                    name: selectedDistro.name,
                    executable: selectedDistro.executable,
                    label: selectedDistro.label,
                    icon: selectedDistro.icon,
                    category: selectedDistro.category
                };
            } else if (terminalTypeToUse.toLowerCase().includes('ubuntu')) {
                title = terminalTypeToUse;
                terminalType = 'ubuntu';
                distroInfo = { name: terminalTypeToUse, label: terminalTypeToUse, category: 'ubuntu', executable: 'ubuntu.exe' };
            } else if (terminalTypeToUse.toLowerCase().includes('debian') || terminalTypeToUse === 'wsl-debian') {
                title = 'Debian';
                terminalType = 'debian';
                // Fallback distroInfo si no se encontró en la lista
                distroInfo = { name: 'Debian', label: 'Debian', category: 'debian', executable: 'debian.exe' };
            } else {
                title = 'WSL';
                terminalType = 'wsl-distro';
            }
        } else if (terminalTypeToUse.startsWith('docker-')) {
            // Extraer información del contenedor Docker seleccionado
            const containerName = terminalTypeToUse.replace('docker-', '');
            console.log('🐳 Buscando contenedor:', containerName, 'en', dockerContainers.map(c => c.name));
            const selectedContainer = distroInfo || dockerContainers.find(c => c.name === containerName);

            if (selectedContainer) {
                title = `🐳 ${selectedContainer.name || containerName}`;
                terminalType = 'docker';
                distroInfo = {
                    containerName: selectedContainer.name || containerName,
                    containerId: selectedContainer.id || selectedContainer.containerId,
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
        setTabs(prevTabs => {
            const newTabs = prevTabs.map(tab => ({
                ...tab,
                active: tab.id === tabId
            }));
            
            return newTabs;
        });

        // Incrementar la key para forzar re-render
        setActiveTabKey(prev => prev + 1);

        // Redimensionar el terminal activo sin saturar el main thread
        scheduleFitForTab(tabId);
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
    // Notificar al padre sobre el cambio de pestaña activa
    useEffect(() => {
        const activeTab = tabs.find(t => t.active);
        if (activeTab && onTabChange) {
            onTabChange(activeTab);
        }
    }, [tabs, onTabChange]);

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

    // Determinar el tema de la terminal actual para inyectar colores dinámicos
    const terminalTheme = activeTab?.type === 'powershell' || activeTab?.type === 'cygwin' || activeTab?.type === 'claude' || activeTab?.type === 'opencode' || activeTab?.type === 'geminicli' || activeTab?.type === 'codexcli'
        ? (themes[localPowerShellTheme]?.theme || powershellXtermTheme)
        : (themes[localLinuxTerminalTheme]?.theme || linuxXtermTheme);

    // Obtener los colores del tema de pestañas seleccionado
    const getTabColors = () => {
        // Obtener estilos computados del documento (que incluyen los temas de pestañas)
        const rootStyles = getComputedStyle(document.documentElement);

        // Leer las variables CSS del tema de pestañas
        const tabBg = rootStyles.getPropertyValue('--ui-tab-bg')?.trim() || '#2d3138';
        const tabActiveBg = rootStyles.getPropertyValue('--ui-tab-active-bg')?.trim() || '#1f2329';
        const tabText = rootStyles.getPropertyValue('--ui-tab-text')?.trim() || '#d6d8db';
        const tabActiveText = rootStyles.getPropertyValue('--ui-tab-active-text')?.trim() || '#ffffff';
        const tabAccent = rootStyles.getPropertyValue('--primary-color')?.trim() || tabActiveBg;

        // Asegurar contraste para el círculo estilo macOS
        const tabAccentCircle = adjustColorBrightness(tabAccent, 20);
        const tabAccentBorder = isIntegrated && terminalTheme.brightBlack ? terminalTheme.brightBlack + '66' : adjustColorBrightness(tabAccent, -35);

        return {
            tabBg,
            tabActiveBg,
            tabText,
            tabActiveText,
            tabAccent,
            tabAccentCircle,
            tabAccentBorder,
            terminalBg: terminalTheme.background || '#0c0c0c',
            terminalAccent: terminalTheme.cursor || terminalTheme.blue || '#00f2ff',
            terminalForeground: terminalTheme.foreground || '#c9d1d9',
            terminalSelection: terminalTheme.selection || 'rgba(255,255,255,0.1)'
        };
    };

    const {
        tabBg, tabActiveBg, tabText, tabActiveText, tabAccent, tabAccentCircle, tabAccentBorder,
        terminalBg, terminalAccent, terminalForeground, terminalSelection
    } = getTabColors();

    return (
        <div className="tabbed-terminal-root" style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'transparent',
            overflow: 'hidden',
            '--terminal-tab-bar-bg': isIntegrated ? 'transparent' : tabBg,
            '--terminal-tab-border': isIntegrated ? (terminalTheme.brightBlack ? terminalTheme.brightBlack + '33' : 'rgba(255,255,255,0.05)') : 'rgba(255,255,255,0.1)',
            '--terminal-tab-text': isIntegrated ? (terminalForeground + '99') : tabText,
            '--terminal-tab-active-text': isIntegrated ? terminalForeground : tabActiveText,
            '--terminal-tab-active-bg': isIntegrated ? (terminalSelection || 'rgba(255,255,255,0.1)') : tabActiveBg,
            '--terminal-tab-accent': isIntegrated ? terminalAccent : tabAccent,
            '--terminal-tab-accent-glow': isIntegrated ? (terminalAccent + '4d') : (tabAccent + '33')
        }}>
            {/* Barra de pestañas */}
            {!hideTabs && (
                <div className="cyber-terminal-tabs-container">
                    {/* Indicador circular estilo macOS usando el color del tema */}
                    <div className="cyber-terminal-mac-dot" />
                    
                    <div className="tabs-scroll-viewport" style={{
                        display: 'flex',
                        flex: 1,
                        overflow: 'hidden',
                        minWidth: 0,
                        marginLeft: '0'
                    }}>
                        {/* Flecha izquierda */}
                        {(canScrollLeft || tabs.length > 3) && (
                            <Button
                                icon="pi pi-chevron-left"
                                className="tab-nav-arrow p-button-text"
                                style={{
                                    padding: '2px 4px',
                                    minWidth: '18px',
                                    width: '18px',
                                    height: '24px',
                                    fontSize: '8px',
                                    marginRight: '2px',
                                    zIndex: 5
                                }}
                                onClick={() => scrollTabs('left')}
                            />
                        )}

                        {/* Pestañas */}
                        <div
                            ref={tabsContainerRef}
                            className="hide-scrollbar"
                            style={{
                                display: 'flex',
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                flex: '1 1 auto',
                                minWidth: 0,
                                height: '100%'
                            }}
                            onScroll={checkScrollButtons}
                        >
                            {tabs.map((tab, index) => (
                                <div
                                    key={tab.id}
                                    className={`cyber-tab ${tab.active ? 'active' : ''}`}
                                    style={{
                                        borderLeftColor: dragOverTabIndex === index ? 'var(--terminal-tab-accent)' : 'transparent',
                                        borderLeftWidth: dragOverTabIndex === index ? '3px' : '0',
                                        opacity: draggedTabIndex === index ? 0.5 : 1
                                    }}
                                    onClick={(e) => {
                                        if (draggedTabIndex !== null || dragStartTimer !== null) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            return;
                                        }
                                        switchTab(tab.id);
                                    }}
                                    draggable={true}
                                    onDragStart={(e) => handleLocalTabDragStart(e, index)}
                                    onDragOver={(e) => handleLocalTabDragOver(e, index)}
                                    onDragLeave={handleLocalTabDragLeave}
                                    onDrop={(e) => handleLocalTabDrop(e, index)}
                                    onDragEnd={handleLocalTabDragEnd}
                                >
                                    {tab.type === 'powershell' ? (
                                        <FaWindows className="cyber-tab-icon" style={{ color: '#4fc3f7' }} />
                                    ) : tab.type === 'ubuntu' ? (
                                        <FaUbuntu className="cyber-tab-icon" style={{ color: '#E95420' }} />
                                    ) : tab.type === 'debian' ? (
                                        <SiDebian className="cyber-tab-icon" style={{ color: '#D70A53' }} />
                                    ) : (
                                        <i
                                            className={tab.type === 'wsl' || tab.type === 'wsl-distro' ? 'pi pi-server cyber-tab-icon' :
                                                tab.type === 'cygwin' ? 'pi pi-code cyber-tab-icon' :
                                                    tab.type === 'claude' ? 'pi pi-comments cyber-tab-icon' :
                                                    tab.type === 'opencode' ? 'pi pi-code cyber-tab-icon' :
                                                    tab.type === 'geminicli' ? 'pi pi-star cyber-tab-icon' :
                                                    tab.type === 'codexcli' ? 'pi pi-bolt cyber-tab-icon' :
                                                    tab.type === 'docker' ? 'pi pi-box cyber-tab-icon' : 'pi pi-desktop cyber-tab-icon'}
                                            style={{ 
                                                color: tab.active ? 'var(--terminal-tab-accent)' : 'inherit'
                                            }}
                                        />
                                    )}

                                    <span className="cyber-tab-label">{tab.title}</span>

                                    {tabs.length > 1 && (
                                        <i
                                            className="pi pi-times cyber-tab-close"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                closeTab(tab.id);
                                            }}
                                            title="Cerrar pestaña"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Flecha derecha */}
                        {(canScrollRight || tabs.length > 3) && (
                            <Button
                                icon="pi pi-chevron-right"
                                className="tab-nav-arrow p-button-text"
                                style={{
                                    padding: '2px 4px',
                                    minWidth: '18px',
                                    width: '18px',
                                    height: '24px',
                                    fontSize: '8px',
                                    marginLeft: '2px',
                                    zIndex: 5
                                }}
                                onClick={() => scrollTabs('right')}
                            />
                        )}
                    </div>

                    {/* Botones de acción */}
                    <div className="local-terminal-buttons" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '8px' }}>
                        <Button
                            icon="pi pi-plus"
                            className="tab-action-button"
                            onClick={(e) => dropdownRef.current.toggle(e)}
                            aria-label="Nueva pestaña"
                            title="Nueva pestaña"
                        />
                        <Button
                            icon="pi pi-chevron-down"
                            className="tab-action-button"
                            onClick={(e) => dropdownRef.current.toggle(e)}
                            aria-label="Seleccionar tipo de terminal"
                            title="Seleccionar tipo de terminal"
                        />
                    </div>
                </div>
            )}

            {/* Contenido de las pestañas */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'transparent' }}>
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        style={{
                            display: tab.active ? 'block' : 'none',
                            height: '100%',
                            width: '100%',
                            position: 'absolute',
                            top: 0,
                            left: 0
                        }}
                    >
                        {tab.type === 'powershell' && (
                            <PowerShellTerminal
                                key={`${tab.id}-terminal-powershell`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                fontFamily={localFontFamily}
                                fontSize={localFontSize}
                                theme={themes[localPowerShellTheme]?.theme || powershellXtermTheme}
                                hideStatusBar={hideStatusBar}
                                isIntegrated={isIntegrated}
                            />
                        )}
                        {tab.type === 'wsl' && (
                            <WSLTerminal
                                key={`${tab.id}-terminal-wsl`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                theme={themes[localLinuxTerminalTheme]?.theme || linuxXtermTheme}
                                hideStatusBar={hideStatusBar}
                                isIntegrated={isIntegrated}
                            />
                        )}
                        {(tab.type === 'ubuntu' || tab.type === 'debian' || tab.type === 'wsl-distro') && (
                            <UbuntuTerminal
                                key={`${tab.id}-terminal-${tab.type}`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                ubuntuInfo={tab.distroInfo || tab.ubuntuInfo}
                                tabType={tab.type}
                                fontFamily={localFontFamily}
                                fontSize={localFontSize}
                                theme={themes[localLinuxTerminalTheme]?.theme || linuxXtermTheme}
                                hideStatusBar={hideStatusBar}
                                isIntegrated={isIntegrated}
                            />
                        )}
                        {tab.type === 'cygwin' && (
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
                                isIntegrated={isIntegrated}
                            />
                        )}
                        {tab.type === 'docker' && (
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
                                isIntegrated={isIntegrated}
                            />
                        )}
                        {tab.type === 'claude' && (
                            <ClaudeTerminal
                                key={`${tab.id}-terminal`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                fontFamily={localFontFamily}
                                fontSize={localFontSize}
                                theme={themes[localPowerShellTheme]?.theme || powershellXtermTheme}
                                isIntegrated={isIntegrated}
                            />
                        )}
                        {tab.type === 'opencode' && (
                            <OpenCodeTerminal
                                key={`${tab.id}-terminal`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                fontFamily={localFontFamily}
                                fontSize={localFontSize}
                                theme={themes[localPowerShellTheme]?.theme || powershellXtermTheme}
                                isIntegrated={isIntegrated}
                            />
                        )}
                        {tab.type === 'geminicli' && (
                            <GeminiCliTerminal
                                key={`${tab.id}-terminal`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                fontFamily={localFontFamily}
                                fontSize={localFontSize}
                                theme={themes[localPowerShellTheme]?.theme || powershellXtermTheme}
                                isIntegrated={isIntegrated}
                            />
                        )}
                        {tab.type === 'codexcli' && (
                            <CodexCliTerminal
                                key={`${tab.id}-terminal`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                fontFamily={localFontFamily}
                                fontSize={localFontSize}
                                theme={themes[localPowerShellTheme]?.theme || powershellXtermTheme}
                                isIntegrated={isIntegrated}
                            />
                        )}
                        {tab.type === 'rdp-guacamole' && (
                            <GuacamoleTerminal
                                key={`${tab.id}-terminal`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                                rdpConfig={tab.rdpConfig}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Menú de selección de terminal */}
            <Dropdown
                ref={dropdownRef}
                options={getTerminalOptions()}
                onChange={(e) => createNewTab(e.value)}
                style={{ display: 'none' }}
                appendTo={document.body}
            />
        </div>
    );
});

TabbedTerminal.displayName = 'TabbedTerminal';

export default TabbedTerminal;
