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
    const terminalRefs = useRef({});

    // Registrar eventos para la pestaña inicial
    useEffect(() => {
        console.log('TabbedTerminal mounted, window.electron:', !!window.electron);
        if (window.electron) {
            console.log('Registering tab-1 events');
            window.electron.ipcRenderer.send('register-tab-events', 'tab-1');
        }
        
        // Cleanup al desmontar el componente
        return () => {
            console.log('TabbedTerminal unmounting, cleaning up processes');
            if (window.electron) {
                // Detener todos los procesos activos
                tabs.forEach(tab => {
                    window.electron.ipcRenderer.send(`powershell:stop:${tab.id}`);
                    window.electron.ipcRenderer.send(`wsl:stop:${tab.id}`);
                });
            }
        };
    }, []);

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
    };

    // Función para cambiar de pestaña activa
    const switchTab = (tabId) => {
        setTabs(prevTabs => 
            prevTabs.map(tab => ({
                ...tab,
                active: tab.id === tabId
            }))
        );
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
                            display: tab.active ? 'block' : 'none',
                            height: '100%',
                            width: '100%'
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
