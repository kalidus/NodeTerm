import React, { useState, useRef, useEffect } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import PowerShellTerminal from './PowerShellTerminal';
import WSLTerminal from './WSLTerminal';

const TabbedTerminal = () => {
    const [tabs, setTabs] = useState([
        { 
            id: 'tab-1', 
            title: 'Windows PowerShell', 
            type: 'powershell', 
            active: true 
        }
    ]);
    const [nextTabId, setNextTabId] = useState(2);
    const [selectedTerminalType, setSelectedTerminalType] = useState('powershell');
    const [activeTabKey, setActiveTabKey] = useState(0); // Para forzar re-render
    const terminalRefs = useRef({});

    // Registrar eventos para la pestaña inicial
    useEffect(() => {
        console.log('TabbedTerminal mounted, window.electron:', !!window.electron);
        if (window.electron) {
            console.log('Registering tab-1 events');
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
                            console.log(`Terminal ${activeTab.id} resized on window resize`);
                        } catch (error) {
                            console.error(`Error resizing terminal on window resize:`, error);
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
                                console.log(`Terminal ${activeTab.id} resized on visibility change`);
                            } catch (error) {
                                console.error(`Error resizing terminal on visibility change:`, error);
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
            console.log('TabbedTerminal unmounting, cleaning up processes');
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (window.electron) {
                // Detener todos los procesos activos
                tabs.forEach(tab => {
                    window.electron.ipcRenderer.send(`powershell:stop:${tab.id}`);
                    window.electron.ipcRenderer.send(`wsl:stop:${tab.id}`);
                });
            }
        };
    }, []);
    
    // Efecto para redimensionar terminales cuando cambian las pestañas
    useEffect(() => {
        const activeTab = tabs.find(tab => tab.active);
        if (activeTab) {
            console.log(`Tab change effect triggered for tab: ${activeTab.id}, key: ${activeTabKey}`);
            
            // Forzar re-render del terminal activo con múltiples intentos
            const resizeTerminal = () => {
                const terminalRef = terminalRefs.current[activeTab.id];
                if (terminalRef && terminalRef.fit) {
                    try {
                        terminalRef.fit();
                        console.log(`Terminal ${activeTab.id} resized successfully (key: ${activeTabKey})`);
                    } catch (error) {
                        console.error(`Error resizing terminal ${activeTab.id}:`, error);
                    }
                } else {
                    console.warn(`Terminal ref not found for tab ${activeTab.id}`);
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
            console.log(`Active tab key changed to ${activeTabKey}, forcing resize for tab: ${activeTab.id}`);
            
            const forceResize = () => {
                const terminalRef = terminalRefs.current[activeTab.id];
                if (terminalRef && terminalRef.fit) {
                    try {
                        terminalRef.fit();
                        console.log(`Force resize successful for tab ${activeTab.id} (key: ${activeTabKey})`);
                    } catch (error) {
                        console.error(`Force resize error for tab ${activeTab.id}:`, error);
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

    // Opciones para el selector de tipo de terminal
    const terminalOptions = [
        { label: 'PowerShell', value: 'powershell', icon: 'pi pi-desktop' },
        { label: 'WSL', value: 'wsl', icon: 'pi pi-server' }
    ];

    // Función para crear una nueva pestaña
    const createNewTab = () => {
        console.log('Creating new tab, type:', selectedTerminalType);
        const newTabId = `tab-${nextTabId}`;
        const title = selectedTerminalType === 'powershell' ? 'Windows PowerShell' : 'WSL';
        
        // Registrar eventos para la nueva pestaña
        if (window.electron) {
            console.log('Registering events for new tab:', newTabId);
            window.electron.ipcRenderer.send('register-tab-events', newTabId);
        }
        
        // Desactivar todas las pestañas
        setTabs(prevTabs => prevTabs.map(tab => ({ ...tab, active: false })));
        
        // Agregar nueva pestaña
        setTabs(prevTabs => {
            const newTabs = [...prevTabs, {
                id: newTabId,
                title,
                type: selectedTerminalType,
                active: true
            }];
            console.log('New tabs state:', newTabs);
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
        console.log(`Switching to tab: ${tabId}`);
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
                console.log(`Forcing aggressive resize for tab: ${tabId}`);
                try {
                    terminalRef.fit();
                    // Intentar múltiples veces
                    setTimeout(() => terminalRef.fit(), 10);
                    setTimeout(() => terminalRef.fit(), 50);
                    setTimeout(() => terminalRef.fit(), 100);
                    setTimeout(() => terminalRef.fit(), 200);
                } catch (error) {
                    console.error(`Error in aggressive resize for tab ${tabId}:`, error);
                }
            }
        }, 0);
    };

    // Función para cerrar una pestaña
    const closeTab = (tabId) => {
        console.log('Cerrando pestaña:', tabId);
        
        // Detener procesos del terminal antes de cerrar
        if (window.electron) {
            window.electron.ipcRenderer.send(`powershell:stop:${tabId}`);
            window.electron.ipcRenderer.send(`wsl:stop:${tabId}`);
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

    const activeTab = tabs.find(tab => tab.active);

    return (
        <div style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: activeTab?.type === 'powershell' ? '#012456' : '#300A24',
            overflow: 'hidden'
        }}>
            {/* Barra de pestañas */}
            <div style={{
                background: '#1e3a5f',
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
                        msOverflowStyle: 'none',
                        flex: 1
                    }}>
                        {tabs.map((tab, index) => (
                            <div
                                key={tab.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: tab.active ? 
                                        (tab.type === 'powershell' ? '#012456' : '#300A24') : 
                                        'transparent',
                                    border: tab.active ? '1px solid #2a4a6b' : '1px solid transparent',
                                    borderBottom: 'none',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    minWidth: '120px',
                                    maxWidth: '200px',
                                    borderTopLeftRadius: '4px',
                                    borderTopRightRadius: '4px',
                                    transition: 'all 0.2s ease'
                                }}
                                onClick={() => switchTab(tab.id)}
                            >
                                <i 
                                    className={tab.type === 'powershell' ? 'pi pi-desktop' : 'pi pi-server'} 
                                    style={{ 
                                        color: tab.type === 'powershell' ? '#4fc3f7' : '#8ae234',
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
                    </div>
                </div>

                {/* Controles del lado derecho */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '0 16px' 
                }}>
                    {/* Selector de tipo de terminal */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                            color: 'rgba(255, 255, 255, 0.8)', 
                            fontSize: '12px',
                            fontWeight: '500'
                        }}>
                            Nuevo:
                        </span>
                        <Dropdown
                            value={selectedTerminalType}
                            options={terminalOptions}
                            onChange={(e) => setSelectedTerminalType(e.value)}
                            optionLabel="label"
                            style={{
                                width: '130px',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '4px'
                            }}
                            panelStyle={{
                                backgroundColor: '#2a4a6b',
                                border: '1px solid #3a5a7b',
                                borderRadius: '4px'
                            }}
                            itemTemplate={(option) => (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                                    <i 
                                        className={option.icon} 
                                        style={{ 
                                            color: option.value === 'powershell' ? '#4fc3f7' : '#8ae234',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <span>{option.label}</span>
                                </div>
                            )}
                            valueTemplate={(option) => (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
                                    <i 
                                        className={option.icon} 
                                        style={{ 
                                            color: option.value === 'powershell' ? '#4fc3f7' : '#8ae234',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <span style={{ fontSize: '12px' }}>{option.label}</span>
                                </div>
                            )}
                        />
                    </div>

                    {/* Botón para nueva pestaña */}
                    <Button
                        icon="pi pi-plus"
                        className="p-button-text p-button-sm"
                        style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            padding: '4px 8px',
                            minWidth: '32px',
                            height: '32px'
                        }}
                        onClick={createNewTab}
                        aria-label="Nueva pestaña"
                    />

                    {/* Botones de control de ventana */}
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#ff5f57'
                        }}></div>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#ffbd2e'
                        }}></div>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#28ca42'
                        }}></div>
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
                            />
                        ) : (
                            <WSLTerminal 
                                key={`${tab.id}-terminal`}
                                ref={(ref) => {
                                    if (ref) terminalRefs.current[tab.id] = ref;
                                }}
                                tabId={tab.id}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TabbedTerminal;
