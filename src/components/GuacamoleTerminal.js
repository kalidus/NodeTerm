import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Button } from 'primereact/button';
import Guacamole from 'guacamole-common-js';

const GuacamoleTerminal = forwardRef(({ 
    tabId = 'default',
    rdpConfig = null
}, ref) => {
    const containerRef = useRef(null);
    const guacamoleClientRef = useRef(null);
    const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected, error
    const [errorMessage, setErrorMessage] = useState('');
    const [isGuacamoleLoaded, setIsGuacamoleLoaded] = useState(false);
    const [autoResize, setAutoResize] = useState(false);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        fit: () => {
            // Redimensionar el display de Guacamole si es necesario
            if (guacamoleClientRef.current && guacamoleClientRef.current.getDisplay) {
                try {
                    const display = guacamoleClientRef.current.getDisplay();
                    if (display && display.scale) {
                        // Ajustar escala basada en el contenedor
                        const container = containerRef.current;
                        if (container) {
                            const containerRect = container.getBoundingClientRect();
                            // El fit se maneja automáticamente por Guacamole, pero podemos forzar un refresco
                            display.onresize();
                        }
                    }
                } catch (e) {
                    console.warn(`Guacamole fit() error for tab ${tabId}:`, e);
                }
            }
        },
        focus: () => {
            if (guacamoleClientRef.current && guacamoleClientRef.current.focus) {
                guacamoleClientRef.current.focus();
            }
        },
        disconnect: () => {
            if (guacamoleClientRef.current) {
                guacamoleClientRef.current.disconnect();
            }
        }
    }));

    // Inicializar guacamole-common-js con importación local
    useEffect(() => {
        console.log('✅ guacamole-common-js disponible localmente');
        // Hacer que Guacamole esté disponible globalmente para compatibilidad
        window.Guacamole = Guacamole;
        setIsGuacamoleLoaded(true);
    }, []);

    // Inicializar conexión Guacamole cuando la librería esté lista
    useEffect(() => {
        console.log('🔍 GuacamoleTerminal useEffect:', { 
            isGuacamoleLoaded, 
            rdpConfig, 
            connectionState,
            hasElectron: !!window.electron,
            hasIPC: !!(window.electron && window.electron.ipcRenderer)
        });
        
        // Log simplificado de configuración RDP
        if (rdpConfig) {
            console.log('📋 RDP Config:', {
                autoResize: rdpConfig.autoResize,
                width: rdpConfig.width,
                height: rdpConfig.height,
                enableDynamicResize: rdpConfig.enableDynamicResize
            });
        }
        
        if (!isGuacamoleLoaded || !rdpConfig || connectionState !== 'disconnected') {
            console.log('⏸️ Condiciones no cumplidas para inicializar conexión:', {
                isGuacamoleLoaded,
                hasRdpConfig: !!rdpConfig,
                connectionState,
                rdpConfigAutoResize: rdpConfig?.autoResize,
                rdpConfigWidth: rdpConfig?.width,
                rdpConfigHeight: rdpConfig?.height
            });
            return;
        }

        const initializeGuacamoleConnection = async () => {
            try {
                console.log('🔗 Iniciando conexión con rdpConfig:', rdpConfig);
                setConnectionState('connecting');
                setErrorMessage('');

                // Extraer configuración de autoResize
                if (rdpConfig && rdpConfig.autoResize !== undefined) {
                    setAutoResize(rdpConfig.autoResize);
                    console.log('🖥️ Auto-resize configurado:', rdpConfig.autoResize);
                    
                    // Para autoResize, NO CAMBIAR las dimensiones que ya vienen calculadas
                    if (rdpConfig.autoResize) {
                        console.log('🔄 Auto-resize: PRESERVANDO dimensiones dinámicas recibidas');
                        console.log('🔄 Dimensiones recibidas:', {
                            width: rdpConfig.width,
                            height: rdpConfig.height
                        });
                        
                        // Solo agregar el flag para el backend, NO cambiar width/height
                        rdpConfig.enableDynamicResize = true;
                        
                        console.log('✅ CONFIGURACIÓN PRESERVADA - CONFIG COMPLETA:', rdpConfig);
                    }
                }

                // Verificar que electron esté disponible
                if (!window.electron || !window.electron.ipcRenderer) {
                    throw new Error('Electron IPC no está disponible');
                }

                // Esperar un poco para asegurar que los servicios estén listos
                console.log('⏳ Esperando a que los servicios estén listos...');
                await new Promise(resolve => setTimeout(resolve, 1000));

                                 // Obtener estado del servicio Guacamole con reintentos
                 console.log('📞 Consultando estado del servicio Guacamole...');
                 let status = null;
                 let attempts = 0;
                 const maxAttempts = 3;
                 
                 // Verificar si estamos en modo mock
                 console.log('🔍 Verificando modo de operación...');
                 
                 // Obtener estado detallado del servicio
                 const detailedStatus = await window.electron.ipcRenderer.invoke('guacamole:get-status');
                 console.log('🔧 Estado detallado del servicio:', detailedStatus);
                 
                 if (detailedStatus && detailedStatus.guacd) {
                     console.log('🔧 Método guacd:', detailedStatus.guacd.method || 'NO ESPECIFICADO');
                     console.log('🔧 Puerto guacd:', detailedStatus.guacd.port || 'NO ESPECIFICADO');
                     console.log('🔧 Host guacd:', detailedStatus.guacd.host || 'NO ESPECIFICADO');
                     
                     // Mostrar información adicional según el método
                     if (detailedStatus.guacd.method === 'docker') {
                         console.log('🐳 Guacd corriendo en Docker - Conexión RDP real');
                     } else if (detailedStatus.guacd.method === 'native') {
                         console.log('📦 Guacd corriendo como proceso nativo - Conexión RDP real');
                     } else if (detailedStatus.guacd.method === 'mock') {
                         console.log('🧪 Guacd en modo mock - Sin conexión RDP real');
                     } else {
                         console.log('❓ Método de guacd desconocido - Verificar configuración');
                     }
                 }
                
                while (attempts < maxAttempts && !status) {
                    try {
                        attempts++;
                        console.log(`📞 Intento ${attempts}/${maxAttempts}...`);
                                                 status = await window.electron.ipcRenderer.invoke('guacamole:get-status');
                         console.log('📋 Estado recibido:', status);
                         
                         // Log detallado del estado
                         if (status) {
                             console.log('🔧 Detalles del estado:');
                             console.log('  - guacd:', status.guacd);
                             console.log('  - server:', status.server);
                             if (status.guacd && status.guacd.method) {
                                 console.log('  - Método guacd:', status.guacd.method);
                             }
                         }
                        
                        if (status && status.server) {
                            break; // Éxito
                        }
                    } catch (error) {
                        console.error(`❌ Error en intento ${attempts}:`, error);
                        if (attempts < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }
                
                if (!status || !status.server) {
                    throw new Error(`No se pudo obtener estado del servidor Guacamole después de ${maxAttempts} intentos`);
                }
                
                if (!status.server.isRunning) {
                    throw new Error('Servidor Guacamole no está ejecutándose');
                }

                                 // Crear token de conexión
                 // Log crítico: verificar configuración antes de enviar al backend
                 console.log('🚀 ENVIANDO AL BACKEND:', rdpConfig);
                 
                 const tokenResponse = await window.electron.ipcRenderer.invoke('guacamole:create-token', rdpConfig);
                console.log('📄 Respuesta del token:', tokenResponse);
                
                if (!tokenResponse.success) {
                    throw new Error(tokenResponse.error);
                }

                // Configurar tunnel WebSocket
                const tunnel = new window.Guacamole.WebSocketTunnel(tokenResponse.websocketUrl);
                
                // Crear cliente Guacamole
                const client = new window.Guacamole.Client(tunnel);
                guacamoleClientRef.current = client;

                                 // Obtener display y elementos de input
                 const display = client.getDisplay();
                 console.log('📺 Display creado:', display);
                 console.log('📺 Display element:', display.getElement());
                 
                 const mouse = new window.Guacamole.Mouse(display.getElement());
                 const keyboard = new window.Guacamole.Keyboard(document);

                                 // Configurar display en el contenedor
                 const container = containerRef.current;
                 if (container) {
                     console.log('🎨 Configurando display en contenedor...');
                     
                     // Limpiar contenedor
                     container.innerHTML = '';
                     
                     // Obtener elemento display
                     const displayElement = display.getElement();
                     console.log('📺 Elemento display obtenido:', displayElement);
                     
                                           // Configurar estilos del display
                      displayElement.style.width = '100%';
                      displayElement.style.height = '100%';
                      displayElement.style.display = 'block';
                      displayElement.style.position = 'relative';
                      displayElement.style.backgroundColor = '#000000';
                      displayElement.style.zIndex = '1';
                      displayElement.style.visibility = 'visible';
                      displayElement.style.opacity = '1';
                     
                     // Añadir al contenedor
                     container.appendChild(displayElement);
                     console.log('✅ Display añadido al contenedor');
                     
                     // Forzar un refresco del display
                     setTimeout(() => {
                         if (display.onresize) {
                             display.onresize();
                             console.log('🔄 Display refrescado');
                         }
                     }, 100);
                 } else {
                     console.error('❌ Contenedor no encontrado');
                 }

                                 // Eventos del mouse
                 mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (mouseState) => {
                     client.sendMouseState(mouseState);
                 };
                 
                 // Eventos del display para debug
                 if (display.onresize) {
                     console.log('📺 Display tiene onresize');
                 }
                 if (display.scale) {
                     console.log('📺 Display tiene scale');
                 }
                 
                 // Agregar eventos para detectar cuando llegan datos
                 if (display.onresize) {
                     const originalOnResize = display.onresize;
                     display.onresize = () => {
                         console.log('📺 Display onresize llamado - datos recibidos');
                         originalOnResize();
                     };
                 }

                                 // Eventos del teclado
                 keyboard.onkeydown = (keysym) => {
                     console.log('⌨️ Tecla presionada:', keysym);
                     client.sendKeyEvent(1, keysym);
                 };
                 keyboard.onkeyup = (keysym) => {
                     console.log('⌨️ Tecla liberada:', keysym);
                     client.sendKeyEvent(0, keysym);
                 };

                // Eventos de estado de conexión
                client.onstatechange = (state) => {
                    const stateNames = {
                        0: 'IDLE',
                        1: 'CONNECTING', 
                        2: 'WAITING',
                        3: 'CONNECTED',
                        4: 'DISCONNECTED',
                        5: 'DISCONNECTING'
                    };
                    
                                         console.log(`🔄 Estado Guacamole: ${state} (${stateNames[state] || 'UNKNOWN'})`);
                     console.log(`🔍 Comparando: state=${state}, CONNECTED=${window.Guacamole.Client.CONNECTED}`);
                     
                     // Usar constantes directas ya que window.Guacamole.Client.CONNECTED es undefined
                     if (state === 3) { // CONNECTED
                         console.log('✅ Conexión RDP establecida para tab', tabId);
                         
                         // Asegurar que el display esté visible
                         const container = containerRef.current;
                         if (container) {
                             container.style.display = 'block';
                             console.log('🎨 Contenedor display hecho visible');
                         }
                         
                         // Forzar un refresco del display después de conectar
                         setTimeout(() => {
                             if (display && display.onresize) {
                                 display.onresize();
                                 console.log('🔄 Display refrescado después de conectar');
                             }
                         }, 500);
                         
                         console.log('🔄 Cambiando estado a CONNECTED...');
                         setConnectionState('connected');
                         console.log('✅ Estado cambiado a CONNECTED');
                         
                         // Si autoResize está activado, hacer resize inicial tras conexión
                         if (rdpConfig.autoResize) {
                             setTimeout(() => {
                                 const container = containerRef.current;
                                 if (container) {
                                     const containerRect = container.getBoundingClientRect();
                                     const newWidth = Math.floor(containerRect.width);
                                     const newHeight = Math.floor(containerRect.height);
                                     console.log(`🔄 Auto-resize inicial tras conexión: ${newWidth}x${newHeight}`);
                                     
                                     try {
                                         // 1. ✅ REDIMENSIONAR EL DISPLAY LOCAL (CANVAS)
                                         const display = client.getDisplay();
                                         if (display) {
                                             const defaultLayer = display.getDefaultLayer();
                                             if (defaultLayer) {
                                                 display.resize(defaultLayer, newWidth, newHeight);
                                                 console.log(`✅ Display redimensionado localmente: ${newWidth}x${newHeight}`);
                                             }
                                             
                                             // Configurar escala 1:1
                                             if (display.scale) {
                                                 display.scale(1.0);
                                             }
                                         }

                                         // 2. Enviar instrucción al servidor RDP
                                         if (client.sendInstruction) {
                                             console.log(`📡 Resize inicial via sendInstruction: ${newWidth}x${newHeight}`);
                                             client.sendInstruction("size", newWidth, newHeight);
                                         } else if (client.sendSize) {
                                             console.log(`📡 Resize inicial via sendSize: ${newWidth}x${newHeight}`);
                                             client.sendSize(newWidth, newHeight);
                                         } else {
                                             console.log(`⚠️ No se encontró método de resize para resize inicial`);
                                         }
                                     } catch (e) {
                                         console.error('❌ Error en resize inicial:', e);
                                     }
                                 }
                             }, 1000); // Esperar 1 segundo para que la conexión se estabilice
                         }
                         
                         // Timeout para detectar si no llegan datos visuales
                         setTimeout(() => {
                             console.log('🔍 Verificando si el display ha recibido datos...');
                             const displayElement = containerRef.current?.querySelector('canvas');
                             if (displayElement) {
                                 console.log('📺 Canvas encontrado en display');
                                 console.log('📺 Dimensiones del canvas:', displayElement.width, 'x', displayElement.height);
                                 
                                 // Si autoResize está activo, forzar un resize secundario más agresivo
                                 if (rdpConfig.autoResize) {
                                     const container = containerRef.current;
                                     if (container) {
                                         const containerRect = container.getBoundingClientRect();
                                         const targetWidth = Math.floor(containerRect.width);
                                         const targetHeight = Math.floor(containerRect.height);
                                         
                                         console.log(`🔄 RESIZE SECUNDARIO FORZADO: ${targetWidth}x${targetHeight}`);
                                         
                                         try {
                                             // 1. Redimensionar display local
                                             const display = client.getDisplay();
                                             if (display) {
                                                 const defaultLayer = display.getDefaultLayer();
                                                 if (defaultLayer) {
                                                     display.resize(defaultLayer, targetWidth, targetHeight);
                                                     console.log(`✅ Display redimensionado a: ${targetWidth}x${targetHeight}`);
                                                 }
                                             }
                                             
                                             // 2. Enviar comandos de resize múltiples
                                             if (client.sendInstruction) {
                                                 client.sendInstruction("size", targetWidth, targetHeight);
                                                 console.log(`📡 sendInstruction enviado: ${targetWidth}x${targetHeight}`);
                                             }
                                             if (client.sendSize) {
                                                 client.sendSize(targetWidth, targetHeight);
                                                 console.log(`📡 sendSize enviado: ${targetWidth}x${targetHeight}`);
                                             }
                                         } catch (e) {
                                             console.error('❌ Error en resize secundario:', e);
                                         }
                                     }
                                 }
                                 
                                 // Verificar si el canvas tiene datos
                                 const ctx = displayElement.getContext('2d');
                                 const imageData = ctx.getImageData(0, 0, displayElement.width, displayElement.height);
                                 const hasData = imageData.data.some(pixel => pixel !== 0);
                                 console.log('📺 Canvas tiene datos visuales:', hasData);
                                 
                                 // Verificar visibilidad del canvas
                                 const rect = displayElement.getBoundingClientRect();
                                 console.log('📺 Posición del canvas:', {
                                     top: rect.top,
                                     left: rect.left,
                                     width: rect.width,
                                     height: rect.height,
                                     visible: rect.width > 0 && rect.height > 0
                                 });
                                 
                                 // Verificar estilos del canvas
                                 const styles = window.getComputedStyle(displayElement);
                                 console.log('📺 Estilos del canvas:', {
                                     display: styles.display,
                                     visibility: styles.visibility,
                                     opacity: styles.opacity,
                                     zIndex: styles.zIndex
                                 });
                                 
                                 if (!hasData) {
                                     console.warn('⚠️ Canvas está vacío - no hay datos del servidor RDP');
                                 }
                             } else {
                                 console.log('⚠️ No se encontró canvas - posible problema de datos visuales');
                                 console.log('🔍 Elementos en el contenedor:', containerRef.current?.children);
                             }
                         }, 5000);
                                          } else if (state === 4) { // DISCONNECTED
                         setConnectionState('disconnected');
                         console.log('🔚 Conexión RDP cerrada para tab', tabId);
                     } else if (state === 2) { // WAITING
                        console.log('⏳ Esperando respuesta del servidor RDP...');
                        setConnectionState('connecting');
                    } else if (state === 1) { // CONNECTING  
                        console.log('🔌 Estableciendo conexión...');
                        setConnectionState('connecting');
                    }
                };

                                 // Eventos de error
                 client.onerror = (error) => {
                     console.error('❌ Error en cliente Guacamole:', error);
                     console.error('❌ Detalles del error:', {
                         message: error.message,
                         stack: error.stack,
                         type: error.type
                     });
                     setConnectionState('error');
                     setErrorMessage(`Error de conexión: ${error.message || 'Error desconocido'}`);
                 };
                 
                 // Eventos de datos recibidos (para debug)
                 if (tunnel.onerror) {
                     tunnel.onerror = (error) => {
                         console.error('❌ Error en tunnel WebSocket:', error);
                     };
                 }
                 
                 // Eventos de estado del tunnel
                 if (tunnel.onstatechange) {
                     const originalStateChange = tunnel.onstatechange;
                     tunnel.onstatechange = (state) => {
                         console.log('🌐 Estado del tunnel WebSocket:', state);
                         if (originalStateChange) {
                             originalStateChange(state);
                         }
                     };
                 }

                // Timeout de conexión (30 segundos)
                const connectionTimeout = setTimeout(() => {
                    console.error('⏰ Timeout de conexión RDP - 30 segundos');
                    setConnectionState('error');
                                                    setErrorMessage(`Timeout: El servidor RDP no responde (${rdpConfig.hostname} no existe?)`);
                    if (client) {
                        client.disconnect();
                    }
                }, 30000);

                // Conectar
                console.log('🚀 Iniciando conexión cliente Guacamole...');
                client.connect();
                
                                 // Limpiar timeout cuando se conecte exitosamente
                 const originalStateChange = client.onstatechange;
                 client.onstatechange = (state) => {
                     if (state === 3) { // CONNECTED
                         clearTimeout(connectionTimeout);
                     }
                     originalStateChange(state);
                 };

            } catch (error) {
                console.error('❌ Error inicializando conexión Guacamole:', error);
                setConnectionState('error');
                setErrorMessage(error.message);
            }
        };

        initializeGuacamoleConnection();

        // Cleanup
        return () => {
            if (guacamoleClientRef.current) {
                try {
                    guacamoleClientRef.current.disconnect();
                } catch (e) {
                    console.warn('Error desconectando cliente Guacamole:', e);
                }
            }
        };
    }, [isGuacamoleLoaded, rdpConfig, tabId]);

    // Manejar redimensionamiento automático de ventana
    useEffect(() => {
        if (!autoResize || connectionState !== 'connected' || !guacamoleClientRef.current) {
            return;
        }

        let resizeTimeout;
        
        const handleResize = () => {
            // Debounce para evitar demasiadas llamadas mientras se redimensiona
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                try {
                    const client = guacamoleClientRef.current;
                    const container = containerRef.current;
                    
                    if (client && container && client.getDisplay) {
                        const display = client.getDisplay();
                        if (display) {
                            // Calcular nueva resolución basada en el contenedor
                            const containerRect = container.getBoundingClientRect();
                            const newWidth = Math.floor(containerRect.width);
                            const newHeight = Math.floor(containerRect.height);
                            
                            // Enviar comando de resize (solo log la primera vez)
                            if (!window.resizeLogged) {
                                console.log(`🔄 Auto-resize activo: ${newWidth}x${newHeight}`);
                                window.resizeLogged = true;
                            }
                            
                            try {
                                // 1. ✅ REDIMENSIONAR EL DISPLAY LOCAL (CANVAS)
                                const defaultLayer = display.getDefaultLayer();
                                if (defaultLayer) {
                                    display.resize(defaultLayer, newWidth, newHeight);
                                    // Solo log la primera vez
                                    if (!window.displayResizeLogged) {
                                        console.log(`✅ Display redimensionado localmente: ${newWidth}x${newHeight}`);
                                        window.displayResizeLogged = true;
                                    }
                                }
                                
                                // 2. Enviar instrucción al servidor RDP
                                if (client.sendInstruction) {
                                    client.sendInstruction("size", newWidth, newHeight);
                                } else if (client.sendSize) {
                                    client.sendSize(newWidth, newHeight);
                                }
                                
                                // 3. Configurar escala 1:1
                                if (display.scale) {
                                    display.scale(1.0);
                                }
                            } catch (e) {
                                console.error('❌ Error en auto-resize completo:', e);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error en auto-resize:', error);
                }
            }, 150); // Esperar 150ms después de que pare el redimensionamiento
        };

        console.log('🖥️ Activando listener de auto-resize');
        window.addEventListener('resize', handleResize);
        
        // También ejecutar un resize inicial
        handleResize();

        return () => {
            console.log('🖥️ Desactivando listener de auto-resize');
            clearTimeout(resizeTimeout);
            window.removeEventListener('resize', handleResize);
        };
    }, [autoResize, connectionState]);

         // Renderizar diferentes estados
     console.log('🎨 Renderizando con connectionState:', connectionState);
     const renderContent = () => {
        switch (connectionState) {
            case 'connecting':
                return (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#ffffff',
                        backgroundColor: '#1e1e1e'
                    }}>
                        <i className="pi pi-spin pi-spinner" style={{ fontSize: '48px', marginBottom: '16px' }} />
                        <h3>Conectando a {rdpConfig?.hostname || 'servidor RDP'}...</h3>
                        <p>Por favor espere mientras se establece la conexión</p>
                    </div>
                );

            case 'error':
                return (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#ffffff',
                        backgroundColor: '#1e1e1e',
                        padding: '20px'
                    }}>
                        <i className="pi pi-exclamation-triangle" style={{ fontSize: '48px', marginBottom: '16px', color: '#f44336' }} />
                        <h3>Error de Conexión</h3>
                        <p style={{ textAlign: 'center', marginBottom: '20px' }}>{errorMessage}</p>
                        <Button 
                            label="Reintentar" 
                            icon="pi pi-refresh" 
                            onClick={() => {
                                setConnectionState('disconnected');
                                setErrorMessage('');
                            }}
                            className="p-button-outlined"
                        />
                    </div>
                );

            case 'disconnected':
                if (!isGuacamoleLoaded) {
                    return (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: '#ffffff',
                            backgroundColor: '#1e1e1e'
                        }}>
                            <i className="pi pi-spin pi-spinner" style={{ fontSize: '48px', marginBottom: '16px' }} />
                            <h3>Cargando Guacamole...</h3>
                        </div>
                    );
                }
                
                return (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#ffffff',
                        backgroundColor: '#1e1e1e'
                    }}>
                        <i className="pi pi-desktop" style={{ fontSize: '48px', marginBottom: '16px', color: '#4fc3f7' }} />
                        <h3>Conexión RDP Lista</h3>
                        <p>Configure la conexión RDP para comenzar</p>
                    </div>
                );

                         case 'connected':
                 return (
                     <div style={{
                         position: 'absolute',
                         top: '10px',
                         left: '10px',
                         backgroundColor: 'rgba(0, 255, 0, 0.8)',
                         color: 'white',
                         padding: '5px 10px',
                         borderRadius: '4px',
                         fontSize: '12px',
                         zIndex: 100
                     }}>
                         ✅ RDP Conectado - {rdpConfig?.hostname}
                         <br />
                         <small>Mueve el mouse o presiona teclas para activar</small>
                         <br />
                         <small style={{ color: '#4caf50' }}>✅ Conexión RDP real funcionando</small>
                         <br />
                         <Button 
                             label="Probar Conexión" 
                             icon="pi pi-refresh" 
                             size="small"
                             onClick={() => {
                                 console.log('🔍 Probando conexión RDP...');
                                 if (guacamoleClientRef.current) {
                                     console.log('📊 Estado actual del cliente:', guacamoleClientRef.current.currentState);
                                 }
                             }}
                             className="p-button-text p-button-sm"
                             style={{ marginTop: '5px' }}
                         />
                     </div>
                 );

            default:
                return null;
        }
    };

    return (
        <div 
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#1e1e1e'
            }}
        >
                         {/* Contenedor para el display de Guacamole */}
                           <div 
                  ref={containerRef}
                  style={{
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      display: connectionState === 'connected' ? 'block' : 'none',
                      backgroundColor: '#000000',
                      overflow: 'hidden',
                      zIndex: 1,
                      visibility: connectionState === 'connected' ? 'visible' : 'hidden',
                      opacity: connectionState === 'connected' ? 1 : 0
                  }}
              />
            
            {/* Overlay para estados de conexión */}
            {connectionState !== 'connected' && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 10
                }}>
                    {renderContent()}
                </div>
            )}
        </div>
    );
});

GuacamoleTerminal.displayName = 'GuacamoleTerminal';

export default GuacamoleTerminal;
