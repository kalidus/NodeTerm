import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Button } from 'primereact/button';
import Guacamole from 'guacamole-common-js';

const GuacamoleTerminal = forwardRef(({ 
    tabId = 'default',
    rdpConfig = null
}, ref) => {
    const containerRef = useRef(null);
    const guacamoleClientRef = useRef(null);
    const mouseRef = useRef(null);
    const keyboardRef = useRef(null);
    const canvasObserverRef = useRef(null);
    const initialResizeDoneRef = useRef(false);
    const initialResizeAttemptsRef = useRef(0);
    const initialResizeTimerRef = useRef(null);
    const resizeListenerRef = useRef(null); // Para evitar múltiples listeners
    const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected, error
    const connectionStateRef = useRef('disconnected');
    const [errorMessage, setErrorMessage] = useState('');
    const [isGuacamoleLoaded, setIsGuacamoleLoaded] = useState(false);
    const [autoResize, setAutoResize] = useState(false);
    const [lastActivityTime, setLastActivityTime] = useState(Date.now());
    const [freezeDetected, setFreezeDetected] = useState(false);
    
    // Variables persistentes para rate limiting (fuera de useEffect)
    const lastResizeTimeRef = useRef(0);
    const consecutiveResizeCountRef = useRef(0);
    const lastDimensionsRef = useRef({ width: 0, height: 0 });
    const initialResizeCooldownUntilRef = useRef(0);
    const isInitialResizingRef = useRef(false);
    const lastBigChangeAtRef = useRef(0);
    const lastBigChangeSizeRef = useRef({ width: 0, height: 0 });
    const burstWindowStartRef = useRef(0);
    const burstCountRef = useRef(0);
    const quietUntilRef = useRef(0);
    const visibilitySuppressUntilRef = useRef(0);
    const returningFromBlurRef = useRef(false);
    const postBigChangeUntilRef = useRef(0); // será ignorado tras rollback
    const startupSettleUntilRef = useRef(0);
    const startupLastPlanRef = useRef({ width: 0, height: 0 });
    const startupStableCountRef = useRef(0);
    // Idle/warm-up control
    const wasIdleRef = useRef(false);
    const lastActivityTimeRef = useRef(Date.now());
    const pendingPostConnectResizeRef = useRef(null);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        fit: () => {
            // Ajuste y envío de tamaño al servidor cuando sea posible
            const client = guacamoleClientRef.current;
            const container = containerRef.current;
            if (!container) return;
            try {
                const rect = container.getBoundingClientRect();
                const newWidth = Math.floor(rect.width);
                const newHeight = Math.floor(rect.height);
                if (client && typeof client.getDisplay === 'function') {
                    const display = client.getDisplay();
                    if (display) {
                        const defaultLayer = display.getDefaultLayer?.();
                        if (defaultLayer && newWidth > 0 && newHeight > 0) {
                            // Redimensionar localmente
                            try { display.resize(defaultLayer, newWidth, newHeight); } catch {}
                            try { if (display.scale) display.scale(1.0); } catch {}
                            try { if (display.onresize) display.onresize(); } catch {}
                        }
                    }
                }
                // Enviar tamaño al servidor si está conectado
                if (client && connectionStateRef.current === 'connected' && newWidth > 0 && newHeight > 0) {
                    if (typeof client.sendSize === 'function') {
                        client.sendSize(newWidth, newHeight);
                    } else if (typeof client.sendInstruction === 'function') {
                        client.sendInstruction('size', newWidth, newHeight);
                    }
                    lastDimensionsRef.current = { width: newWidth, height: newHeight };
                    lastResizeTimeRef.current = Date.now();
                }
            } catch (e) {
                console.warn(`Guacamole fit() error for tab ${tabId}:`, e);
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
                    
                    // Para autoResize, NO CAMBIAR las dimensiones que ya vienen calculadas
                    if (rdpConfig.autoResize) {
                        // Solo agregar el flag para el backend, NO cambiar width/height
                        rdpConfig.enableDynamicResize = true;
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

                // Warm-up si el servidor WebSocket acaba de arrancar
                try {
                    const readyAt = Number(status.server.readyAt || 0);
                    if (readyAt > 0) {
                        const sinceReady = Date.now() - readyAt;
                        if (sinceReady < 2000) {
                            const waitMs = 2000 - sinceReady + 200;
                            console.log(`⏳ Warm-up guacamole-lite reciente (${sinceReady}ms). Esperando ${waitMs}ms...`);
                            await new Promise(resolve => setTimeout(resolve, waitMs));
                        }
                    }
                } catch {}

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
                 mouseRef.current = mouse;
                 keyboardRef.current = keyboard;

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
                    const nowTs = Date.now();
                    setLastActivityTime(nowTs); // Registrar actividad
                    lastActivityTimeRef.current = nowTs;
                    wasIdleRef.current = false;
                };
                 
                 // Eventos del display para debug
                 if (display.onresize) {
                     // console.log('📺 Display tiene onresize');
                 }
                 if (display.scale) {
                     // console.log('📺 Display tiene scale');
                 }
                 
                 // Agregar eventos para detectar cuando llegan datos
                 if (display.onresize) {
                     const originalOnResize = display.onresize;
                     display.onresize = () => {
                         // console.log('📺 Display onresize llamado - datos recibidos');
                         originalOnResize();
                     };
                 }

                                                                 // Eventos del teclado
                keyboard.onkeydown = (keysym) => {
                    console.log('⌨️ Tecla presionada:', keysym);
                    client.sendKeyEvent(1, keysym);
                    const nowTs = Date.now();
                    setLastActivityTime(nowTs); // Registrar actividad
                    lastActivityTimeRef.current = nowTs;
                    wasIdleRef.current = false;
                };
                keyboard.onkeyup = (keysym) => {
                    console.log('⌨️ Tecla liberada:', keysym);
                    client.sendKeyEvent(0, keysym);
                    const nowTs = Date.now();
                    setLastActivityTime(nowTs); // Registrar actividad
                    lastActivityTimeRef.current = nowTs;
                    wasIdleRef.current = false;
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
                     // console.log(`🔍 Comparando: state=${state}, CONNECTED=${window.Guacamole.Client.CONNECTED}`);
                     
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
                        const nowTsConn = Date.now();
                        setLastActivityTime(nowTsConn); // Registrar actividad inicial
                        lastActivityTimeRef.current = nowTsConn;
                        wasIdleRef.current = false;
                        console.log('✅ Estado cambiado a CONNECTED');
                         
                          // Si autoResize está activado, hacer resize inicial tras conexión
                          if (rdpConfig.autoResize) {
                             // Función para intentar resize inicial con reintentos
                              const attemptInitialResize = (attempt = 1) => {
                                 const container = containerRef.current;
                                 if (!container) {
                                     if (attempt < 5) {
                                         setTimeout(() => attemptInitialResize(attempt + 1), 500);
                                     }

                          // Si hay un resize pendiente post-reconexión (por inactividad), enviarlo una vez
                          try {
                              if (pendingPostConnectResizeRef.current) {
                                  const { width: pendW, height: pendH } = pendingPostConnectResizeRef.current;
                                  setTimeout(() => {
                                      try {
                                          const c2 = guacamoleClientRef.current;
                                          if (!c2) return;
                                          if (c2.sendSize) c2.sendSize(pendW, pendH);
                                          else if (c2.sendInstruction) c2.sendInstruction('size', pendW, pendH);
                                          lastDimensionsRef.current = { width: pendW, height: pendH };
                                          lastResizeTimeRef.current = Date.now();
                                      } catch {}
                                  }, 400);
                                  pendingPostConnectResizeRef.current = null;
                              }
                          } catch {}
                                     return;
                                 }
                                  // Asegurar túnel no esté explícitamente CERRADO y que estemos conectados antes de enviar
                                  try {
                                      const t = client.getTunnel ? client.getTunnel() : null;
                                      const openConst = window.Guacamole?.Tunnel?.OPEN;
                                      if (t && openConst !== undefined && typeof t.state !== 'undefined' && t.state !== openConst) {
                                          const nextAttempt = Math.min(attempt + 1, 12);
                                          const delay = Math.min(250 + attempt * 150, 1500);
                                          setTimeout(() => attemptInitialResize(nextAttempt), delay);
                                          return;
                                      }
                                      if (connectionStateRef.current !== 'connected') {
                                          const nextAttempt = Math.min(attempt + 1, 12);
                                          const delay = Math.min(250 + attempt * 150, 1500);
                                          setTimeout(() => attemptInitialResize(nextAttempt), delay);
                                          return;
                                      }
                                  } catch { /* noop */ }
                                 
                                     const containerRect = container.getBoundingClientRect();
                                     const newWidth = Math.floor(containerRect.width);
                                     const newHeight = Math.floor(containerRect.height);
                                 
                                 // Verificar que las dimensiones sean válidas
                                  if (newWidth <= 0 || newHeight <= 0) {
                                      const nextAttempt = Math.min(attempt + 1, 12);
                                      const delay = Math.min(400 + attempt * 150, 1600);
                                      if (attempt < 12) setTimeout(() => attemptInitialResize(nextAttempt), delay);
                                      return;
                                  }
                                 
                                  console.log(`🔄 Intento ${attempt}: Auto-resize inicial ${newWidth}x${newHeight}`);
                                 
                                  try {
                                     // 1) Ajuste local solo para el inicial (no dispara window.resize)
                                         const display = client.getDisplay();
                                         if (display) {
                                             const defaultLayer = display.getDefaultLayer();
                                             if (defaultLayer) {
                                                 display.resize(defaultLayer, newWidth, newHeight);
                                         }
                                         if (display.scale) display.scale(1.0);
                                         if (display.onresize) display.onresize();
                                     }

                                     // 2) Enviar tamaño al servidor
                                     if (client.sendSize) {
                                             console.log(`📡 Resize inicial via sendSize: ${newWidth}x${newHeight}`);
                                             client.sendSize(newWidth, newHeight);
                                     } else if (client.sendInstruction) {
                                         console.log(`📡 Resize inicial via sendInstruction: ${newWidth}x${newHeight}`);
                                         client.sendInstruction("size", newWidth, newHeight);
                                         } else {
                                             console.log(`⚠️ No se encontró método de resize para resize inicial`);
                                         }

                                     // 3) Actualizar refs y cooldown
                                      lastDimensionsRef.current = { width: newWidth, height: newHeight };
                                      lastResizeTimeRef.current = Date.now();
                                      consecutiveResizeCountRef.current = 0;
                                      initialResizeCooldownUntilRef.current = Date.now() + 2500;
                                      // Reiniciar ventana de asentamiento de arranque cada nueva conexión
                                      startupSettleUntilRef.current = Date.now() + 2500;
                                      startupStableCountRef.current = 0;
                                      startupLastPlanRef.current = { width: newWidth, height: newHeight };
                                      isInitialResizingRef.current = true;
                                      initialResizeDoneRef.current = true;

                                     // 4) Verificar y reintentar hasta 3 veces si el canvas no adopta el tamaño
                                     const verifyAndNudge = (attempt = 1) => {
                                         try {
                                             const canvas = containerRef.current?.querySelector('canvas');
                                             if (!canvas) return;
                                             const cw = canvas.width;
                                             const ch = canvas.height;
                                              const ok = Math.abs(cw - newWidth) < 40 && Math.abs(ch - newHeight) < 40;
                                             if (ok) return;
                                             if (attempt >= 3) return;
                                             // Reenviar tamaño una vez más
                                             if (client.sendSize) client.sendSize(newWidth, newHeight);
                                             else if (client.sendInstruction) client.sendInstruction("size", newWidth, newHeight);
                                             const disp = client.getDisplay?.();
                                             if (disp?.onresize) disp.onresize();
                                             setTimeout(() => verifyAndNudge(attempt + 1), 700);
                                         } catch { /* noop */ }
                                     };
                                     setTimeout(() => verifyAndNudge(1), 700);

                                     console.log(`✅ Auto-resize inicial completado exitosamente`);
                                     } catch (e) {
                                         console.error('❌ Error en resize inicial:', e);
                                      if (attempt < 5) {
                                          setTimeout(() => attemptInitialResize(attempt + 1), 1000);
                                     }
                                 }
                              };
                             
                              // Disparadores para hacer el resize inicial en el momento más estable
                              // 1) Retardo inicial
                              initialResizeAttemptsRef.current = 0;
                              initialResizeDoneRef.current = false;
                              if (initialResizeTimerRef.current) clearTimeout(initialResizeTimerRef.current);
                              initialResizeTimerRef.current = setTimeout(() => attemptInitialResize(1), 900);
                              // 2) Cuando el servidor reporta tamaño por primera vez
                              const originalOnSizeForInitial = client.onsize;
                              client.onsize = (...args) => {
                                  if (!initialResizeDoneRef.current) {
                                      setTimeout(() => attemptInitialResize(1), 150);
                                  }
                                  if (originalOnSizeForInitial) originalOnSizeForInitial.apply(client, args);
                              };
                              // 3) Cuando aparezca el canvas en el DOM
                              try {
                                  if (canvasObserverRef.current) {
                                      canvasObserverRef.current.disconnect();
                                  }
                                  const observer = new MutationObserver(() => {
                                      if (!initialResizeDoneRef.current) {
                                          attemptInitialResize(1);
                                      }
                                  });
                                  observer.observe(containerRef.current, { childList: true, subtree: true });
                                  canvasObserverRef.current = observer;
                              } catch {}
                              // 4) Reasegurado post-conexión: si tras unos segundos las dimensiones del canvas
                              // aún no se aproximan al contenedor, reenviar tamaño un par de veces con backoff
                              const ensureCanvasMatches = (attempt = 1) => {
                                  try {
                                      const container = containerRef.current;
                                      const canvas = container?.querySelector('canvas');
                                      if (!container || !canvas) {
                                          if (attempt < 5) setTimeout(() => ensureCanvasMatches(attempt + 1), 400);
                                          return;
                                      }
                                      const rect = container.getBoundingClientRect();
                                      const targetW = Math.floor(rect.width);
                                      const targetH = Math.floor(rect.height);
                                      const cw = canvas.width;
                                      const ch = canvas.height;
                                      const diffW = Math.abs(cw - targetW);
                                      const diffH = Math.abs(ch - targetH);
                                      const ok = diffW < 40 && diffH < 40;
                                      if (ok) return;
                                      // Reenviar tamaño y refrescar display
                                      if (client.sendSize) client.sendSize(targetW, targetH);
                                      else if (client.sendInstruction) client.sendInstruction('size', targetW, targetH);
                                      const disp = client.getDisplay?.();
                                      if (disp?.onresize) disp.onresize();
                                      if (attempt < 5) setTimeout(() => ensureCanvasMatches(attempt + 1), 600 + attempt * 150);
                                  } catch { /* noop */ }
                              };
                              setTimeout(() => ensureCanvasMatches(1), 1200);
                         }
                         
                         // Timeout para detectar si no llegan datos visuales
                         setTimeout(() => {
                             console.log('🔍 Verificando si el display ha recibido datos...');
                             const displayElement = containerRef.current?.querySelector('canvas');
                             if (displayElement) {
                                  console.log('📺 Canvas encontrado en display');
                                 console.log('📺 Dimensiones del canvas:', displayElement.width, 'x', displayElement.height);
                                 
                                 // Si autoResize está activo, forzar un resize secundario más agresivo
                                 if (false && rdpConfig.autoResize) {
                                     const container = containerRef.current;
                                     if (container) {
                                         const containerRect = container.getBoundingClientRect();
                                         const targetWidth = Math.floor(containerRect.width);
                                         const targetHeight = Math.floor(containerRect.height);
                                         
                                         // console.log(`🔄 RESIZE SECUNDARIO FORZADO: ${targetWidth}x${targetHeight}`);
                                         
                                         try {
                                             // desactivado
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
                          // Resetear timers/refs críticos al desconectar para que próxima conexión tenga estado limpio
                          try {
                              lastDimensionsRef.current = { width: 0, height: 0 };
                              consecutiveResizeCountRef.current = 0;
                              lastResizeTimeRef.current = 0;
                              initialResizeCooldownUntilRef.current = 0;
                              startupSettleUntilRef.current = 0;
                              startupStableCountRef.current = 0;
                              startupLastPlanRef.current = { width: 0, height: 0 };
                              isInitialResizingRef.current = false;
                              burstWindowStartRef.current = 0;
                              burstCountRef.current = 0;
                              quietUntilRef.current = 0;
                              visibilitySuppressUntilRef.current = 0;
                              returningFromBlurRef.current = false;
                              postBigChangeUntilRef.current = 0;
                          } catch {}
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
                         // Guardar estado en ref si está disponible
                         try { quietUntilRef.current = quietUntilRef.current; } catch {}
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
                const connectStartedAt = Date.now();
                client.connect();
                
                                 // Limpiar timeout cuando se conecte exitosamente
                const originalStateChange = client.onstatechange;
                 client.onstatechange = (state) => {
                     if (state === 3) { // CONNECTED
                         clearTimeout(connectionTimeout);
                     }
                    // Si se desconecta muy pronto tras conectar, hacer un reintento único
                    if (state === 4) { // DISCONNECTED
                        const elapsed = Date.now() - connectStartedAt;
                        if (elapsed < 5000 && !initialResizeDoneRef.current) {
                            console.warn(`⚠️ Desconexión temprana (${elapsed}ms). Reintentando una vez...`);
                            try {
                                const container = containerRef.current;
                                if (container) {
                                    const r = container.getBoundingClientRect();
                                    pendingPostConnectResizeRef.current = { width: Math.floor(r.width), height: Math.floor(r.height) };
                                }
                            } catch {}
                            setTimeout(() => {
                                try { client.disconnect(); } catch {}
                                setConnectionState('disconnected');
                            }, 200);
                            return;
                        }
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
            try {
                if (guacamoleClientRef.current) {
                    try { guacamoleClientRef.current.disconnect(); } catch {}
                }
                if (initialResizeTimerRef.current) {
                    clearTimeout(initialResizeTimerRef.current);
                    initialResizeTimerRef.current = null;
                }
                if (canvasObserverRef.current) {
                    try { canvasObserverRef.current.disconnect(); } catch {}
                    canvasObserverRef.current = null;
                }
                // Limpiar listeners de teclado/ratón
                if (keyboardRef.current) {
                    try { keyboardRef.current.onkeydown = null; keyboardRef.current.onkeyup = null; } catch {}
                    keyboardRef.current = null;
                }
                if (mouseRef.current) {
                    try { mouseRef.current.onmousedown = null; mouseRef.current.onmouseup = null; mouseRef.current.onmousemove = null; } catch {}
                    mouseRef.current = null;
                }
                // Vaciar contenedor
                if (containerRef.current) {
                    try { containerRef.current.innerHTML = ''; } catch {}
                }
            } finally {
                guacamoleClientRef.current = null;
            }
        };
    }, [isGuacamoleLoaded, rdpConfig, tabId]);

    // Desconexión segura en recargas/cierrres de ventana
    useEffect(() => {
        const handleBeforeUnload = () => {
            try {
                if (guacamoleClientRef.current) {
                    try { guacamoleClientRef.current.disconnect(); } catch {}
                }
                if (keyboardRef.current) {
                    try { keyboardRef.current.onkeydown = null; keyboardRef.current.onkeyup = null; } catch {}
                    keyboardRef.current = null;
                }
                if (mouseRef.current) {
                    try { mouseRef.current.onmousedown = null; mouseRef.current.onmouseup = null; mouseRef.current.onmousemove = null; } catch {}
                    mouseRef.current = null;
                }
                if (containerRef.current) {
                    try { containerRef.current.innerHTML = ''; } catch {}
                }
            } finally {
                guacamoleClientRef.current = null;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // Mantener ref sincronizado con el estado de conexión para evitar cierres obsoletos en handlers
    useEffect(() => {
        connectionStateRef.current = connectionState;
    }, [connectionState]);

    // Mantener ref sincronizado con la última actividad
    useEffect(() => {
        lastActivityTimeRef.current = lastActivityTime;
    }, [lastActivityTime]);

    // 🛡️ ESTABLE: Auto-resize listener con enfoque conservador
    useEffect(() => {
        if (!autoResize) {
            // Si autoResize se desactiva, limpiar listener existente
            if (resizeListenerRef.current) {
                window.removeEventListener('resize', resizeListenerRef.current);
                resizeListenerRef.current = null;
                console.log('🗑️ AutoResize desactivado, removiendo listener');
            }
            return;
        }
        
        // Re-crear siempre el listener cuando cambie connectionState/autoResize para garantizar cierre fresco
        if (resizeListenerRef.current) {
            window.removeEventListener('resize', resizeListenerRef.current);
            resizeListenerRef.current = null;
            console.log('🗑️ Removiendo listener anterior para crear uno nuevo');
        }
        
        console.log('🔄 AutoResize: Agregando listener de resize ESTABLE');
        
        let resizeTimeout = null;
        let isResizing = false; // Protección contra resize simultáneo
        let pendingResize = null; // Para capturar solo el resize final

        // Handlers de visibilidad/foco para suprimir ráfagas al volver
        const onVisibilityChange = () => {
            if (!document.hidden) {
                visibilitySuppressUntilRef.current = Date.now() + 1200;
                returningFromBlurRef.current = true;
            }
        };
        const onFocus = () => {
            visibilitySuppressUntilRef.current = Date.now() + 1200;
            returningFromBlurRef.current = true;
        };
        const onBlur = () => {
            visibilitySuppressUntilRef.current = Date.now() + 1200;
            returningFromBlurRef.current = true;
        };
        window.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('focus', onFocus);
        window.addEventListener('blur', onBlur);
        
        const handleWindowResize = () => {
            // Capturar las dimensiones actuales inmediatamente
            const container = containerRef.current;
            if (!container) return;
            
            const rect = container.getBoundingClientRect();
            const currentWidth = Math.floor(rect.width);
            const currentHeight = Math.floor(rect.height);
            
            // Guardar el resize pendiente (siempre el más reciente)
            pendingResize = { width: currentWidth, height: currentHeight };

            // Detección de inactividad (>60s) y warm-up en el primer resize tras idle
            // Leer umbral de inactividad configurable (fallback 60s)
            const configuredIdleMs = parseInt(localStorage.getItem('rdp_idle_threshold_ms') || '60000', 10);
            const IDLE_MS = isNaN(configuredIdleMs) ? 60000 : Math.max(5000, configuredIdleMs);
            const nowIdleCheck = Date.now();
            const isIdleNow = (nowIdleCheck - (lastActivityTimeRef.current || 0)) > IDLE_MS;
            if (isIdleNow && !wasIdleRef.current) {
                wasIdleRef.current = true;
                try {
                    const client = guacamoleClientRef.current;
                    if (!client) return;
                    let clientStateVal = undefined;
                    try { clientStateVal = client.currentState; } catch {}
                    const isDisconnected = clientStateVal === 4 || connectionStateRef.current !== 'connected';
                    const tunnel = client.getTunnel ? client.getTunnel() : null;
                    const openConstWU = window.Guacamole?.Tunnel?.OPEN;
                    const tunnelNotOpen = tunnel && typeof tunnel.state !== 'undefined' && openConstWU !== undefined && tunnel.state !== openConstWU;
                    if (isDisconnected || tunnelNotOpen) {
                        // Guardar tamaño y forzar reconexión
                        pendingPostConnectResizeRef.current = { width: currentWidth, height: currentHeight };
                        try { client.disconnect(); } catch {}
                        setConnectionState('disconnected');
                        return;
                    }
                    // Warm-up suave: refresco local y un único sendSize
                    try {
                        const disp = client.getDisplay?.();
                        const defLayer = disp?.getDefaultLayer?.();
                        if (disp && defLayer && currentWidth > 0 && currentHeight > 0) {
                            try { disp.resize(defLayer, currentWidth, currentHeight); } catch {}
                            try { disp.onresize && disp.onresize(); } catch {}
                        }
                    } catch {}
                    try {
                        if (client.sendSize) client.sendSize(currentWidth, currentHeight);
                        else if (client.sendInstruction) client.sendInstruction('size', currentWidth, currentHeight);
                    } catch {}
                    lastDimensionsRef.current = { width: currentWidth, height: currentHeight };
                    lastResizeTimeRef.current = Date.now();
                    quietUntilRef.current = Date.now() + 1200;
                    return; // No continuar con el flujo normal en este primer resize post-idle
                } catch { /* noop */ }
            }

            // Supresión por visibilidad/foco reciente
            const now0 = Date.now();
            if (now0 < visibilitySuppressUntilRef.current) {
                const remaining = Math.max(visibilitySuppressUntilRef.current - now0, 150);
                if (resizeTimeout) clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    handleWindowResize();
                }, remaining + 50);
                return;
            }
            
            // Determinar si es un cambio grande (maximizar/minimizar o similar)
            const diffNowW = Math.abs(currentWidth - (lastDimensionsRef.current.width || 0));
            const diffNowH = Math.abs(currentHeight - (lastDimensionsRef.current.height || 0));
            const combinedNow = diffNowW + diffNowH;
            const isBigChangeNow = (diffNowW >= 350 || diffNowH >= 250 || combinedNow >= 200);
            const isAxisOnlyNow = (diffNowW >= 20 && diffNowH < 20) || (diffNowH >= 20 && diffNowW < 20);

            // Debounce dinámico: ventana de asentamiento para cambios grandes (coalesce a un único envío)
            let delayMs = isBigChangeNow ? 1200 : (isAxisOnlyNow ? 1400 : 1000);
            // Anti-toggle: si otro big-change llega muy pronto, ampliar ventana para consolidar
            const sinceLastBigPreview = Date.now() - lastBigChangeAtRef.current;
            if (isBigChangeNow && sinceLastBigPreview < 1200) {
                delayMs = Math.max(delayMs, 1600);
            }
            if (returningFromBlurRef.current) {
                delayMs = Math.max(delayMs, 1600);
            }

            // Debounce: Solo procesar después de delayMs sin cambios
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            
            resizeTimeout = setTimeout(() => {
                // Verificar que esté conectado ANTES de procesar - usar ref sincronizada (no cierre obsoleto)
                const currentConnectionState = connectionStateRef.current;
                if (currentConnectionState !== 'connected') {
                    console.log(`⏭️ No conectado (${currentConnectionState}), saltando resize`);
                    return;
                }
                
                // Protección contra resize simultáneo
                if (isResizing) {
                    console.log('⏭️ Resize en progreso, saltando...');
                    return;
                }
                
                // Usar SIEMPRE el último tamaño observado (snapshot)
                if (!pendingResize) return;
                const plannedWidth = pendingResize.width;
                const plannedHeight = pendingResize.height;
                
                // Verificar cliente
                const client = guacamoleClientRef.current;
                if (!client) {
                    console.log('❌ No hay cliente');
                    return;
                }
                
                // VERIFICAR ESTADO DIRECTO DEL CLIENTE GUACAMOLE
                const tunnel = client.getTunnel ? client.getTunnel() : null;
                const display = client.getDisplay ? client.getDisplay() : null;
                const hasDisplay = display && display.getDefaultLayer && display.getDefaultLayer();
                
                // Verificar si está realmente conectado
                const isReallyConnected = hasDisplay && currentConnectionState === 'connected';
                
                if (!isReallyConnected) {
                    console.log(`❌ No realmente conectado - Display: ${!!hasDisplay}, Estado: ${currentConnectionState}`);
                    return;
                }
                
                if (!client.getDisplay) {
                    console.log('❌ No hay display');
                    return;
                }
                
                try {
                    isResizing = true; // Bloquear resize simultáneo
 
                    // Cooldown tras el resize inicial
                    if (Date.now() < initialResizeCooldownUntilRef.current) {
                        // Permitir un único resize si las dimensiones actuales del contenedor
                        // difieren del último tamaño enviado significativamente (≥80px)
                        const containerNow = containerRef.current?.getBoundingClientRect();
                        if (containerNow) {
                            const cw = Math.floor(containerNow.width);
                            const ch = Math.floor(containerNow.height);
                            const dw = Math.abs(cw - lastDimensionsRef.current.width);
                            const dh = Math.abs(ch - lastDimensionsRef.current.height);
                            if (dw < 80 && dh < 80) {
                                console.log('⏭️ En cooldown tras resize inicial, saltando');
                                return;
                            }
                            // Si hay cambio grande, continuamos para no perder el ajuste inicial
                            console.log('⚠️ Cooldown activo, pero cambio significativo detectado: procesando');
                        } else {
                            console.log('⏭️ En cooldown tras resize inicial, saltando');
                            return;
                        }
                    }

                    // Confirmar que el tamaño planificado sigue siendo el actual del contenedor
                    const currentRect = containerRef.current?.getBoundingClientRect();
                    if (!currentRect) {
                        return;
                    }
                    const currentCw = Math.floor(currentRect.width);
                    const currentCh = Math.floor(currentRect.height);
                    const driftW = Math.abs(currentCw - plannedWidth);
                    const driftH = Math.abs(currentCh - plannedHeight);
                    if (driftW > 10 || driftH > 10) {
                        // El usuario aún está arrastrando o el tamaño cambió antes de enviar: re-coalesce
                        pendingResize = { width: currentCw, height: currentCh };
                        if (resizeTimeout) clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            handleWindowResize();
                        }, 200);
                        return;
                    }
                    // Si venimos de blur/focus, hacer una comprobación extra de estabilidad (220ms)
                    if (returningFromBlurRef.current) {
                        returningFromBlurRef.current = false;
                        if (resizeTimeout) clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            handleWindowResize();
                        }, 220);
                        return;
                    }
                    // Si la ventana está oculta/minimizada o el contenedor es demasiado pequeño, no enviar aún
                    const MIN_WIDTH_TO_SEND = 320;
                    const MIN_HEIGHT_TO_SEND = 240;
                    if (document.hidden || currentCw < MIN_WIDTH_TO_SEND || currentCh < MIN_HEIGHT_TO_SEND) {
                        if (resizeTimeout) clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            handleWindowResize();
                        }, 400);
                        console.log('⏸️ Ventana oculta/minimizada o tamaño demasiado pequeño, aplazando envío');
                        return;
                    }
                    
                    // Calcular deltas finales
                    const widthDiff = Math.abs(plannedWidth - lastDimensionsRef.current.width);
                    const heightDiff = Math.abs(plannedHeight - lastDimensionsRef.current.height);
                    const combinedDiff = widthDiff + heightDiff;
                    const isBigChange = (widthDiff >= 350 || heightDiff >= 250 || combinedDiff >= 200);
                    const isAxisOnly = (widthDiff >= 20 && heightDiff < 20) || (heightDiff >= 20 && widthDiff < 20);

                    // Gate universal (rollback): desactivado

                    // Reglas más estrictas durante arranque (ventana de asentamiento)
                    if (Date.now() < startupSettleUntilRef.current) {
                        if (isAxisOnly) {
                            const axisDelta = widthDiff >= 20 && heightDiff < 20 ? widthDiff : heightDiff;
                            // Ignorar cambios de un solo eje pequeños en arranque
                            if (axisDelta < 200 && combinedDiff < 350) {
                                console.log('⏭️ Arranque: ignorando cambio de un eje pequeño');
                                return;
                            }
                        }
                        // Requerir dos comprobaciones de estabilidad (2×200ms) sin deriva
                        const sameAsLastPlan =
                          Math.abs(plannedWidth - startupLastPlanRef.current.width) < 10 &&
                          Math.abs(plannedHeight - startupLastPlanRef.current.height) < 10;
                        if (!sameAsLastPlan) {
                            startupLastPlanRef.current = { width: plannedWidth, height: plannedHeight };
                            startupStableCountRef.current = 0;
                            if (resizeTimeout) clearTimeout(resizeTimeout);
                            resizeTimeout = setTimeout(() => handleWindowResize(), 200);
                            return;
                        } else if (startupStableCountRef.current < 2) {
                            startupStableCountRef.current += 1;
                            if (resizeTimeout) clearTimeout(resizeTimeout);
                            resizeTimeout = setTimeout(() => handleWindowResize(), 200);
                            return;
                        }
                    }

                    // Cooldown de cambios grandes: no aceptar otro big-change en < 2.5s
                    const now = Date.now();

                    // Quiet period post-send: ignorar resizes durante 600ms salvo cambios muy grandes
                    if (now < quietUntilRef.current && combinedDiff < 350) {
                        const remainingQuiet = Math.max(quietUntilRef.current - now, 150);
                        if (resizeTimeout) clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            handleWindowResize();
                        }, remainingQuiet);
                        console.log(`⏸️ Quiet period activo (${remainingQuiet}ms), reprogramando`);
                        return;
                    }
                    if (isBigChange) {
                        const nowTs = now;
                        if (nowTs - lastBigChangeAtRef.current < 2500) {
                            console.log('⏭️ Cooldown big-change activo (<2.5s), saltando');
                            return;
                        }
                        // Gate big-change (rollback): desactivado
                    }

                    // Evitar ping-pong de cambios grandes repetidos iguales en < 1.2s (barra lateral)
                    if (isBigChange) {
                        const sameAsLastBig =
                          Math.abs(plannedWidth - lastBigChangeSizeRef.current.width) < 10 &&
                          Math.abs(plannedHeight - lastBigChangeSizeRef.current.height) < 10;
                        const nowTs = now;
                        if (sameAsLastBig && (nowTs - lastBigChangeAtRef.current < 3000)) {
                            console.log('⏭️ Ignorando big-change repetido (anti ping-pong)');
                            return;
                        }
                        lastBigChangeAtRef.current = nowTs;
                        lastBigChangeSizeRef.current = { width: plannedWidth, height: plannedHeight };
                    }

                    // Guard adicional: si el túnel no está OPEN, no enviar (si la constante existe)
                    const tunnelOpenConst = window.Guacamole?.Tunnel?.OPEN;
                    if (tunnel && typeof tunnel.state !== 'undefined' && tunnelOpenConst !== undefined && tunnel.state !== tunnelOpenConst) {
                        console.log('⏭️ Tunnel no OPEN, reprogramando resize en 300ms');
                        if (resizeTimeout) clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            handleWindowResize();
                        }, 300);
                        return;
                    }

                    // 🚦 BURST LIMIT: Máximo 3 envíos en 10s, luego pausar 3s
                    if (now - burstWindowStartRef.current > 10000) {
                        burstWindowStartRef.current = now;
                        burstCountRef.current = 0;
                    }
                    if (burstCountRef.current >= 3) {
                        console.log('⏳ Burst limit alcanzado (3/10s), posponiendo 3000ms');
                        if (resizeTimeout) clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            handleWindowResize();
                        }, 3000);
                        return;
                    }

                    // ⏱️ RATE LIMITING: No enviar más de 1 resize cada 2.5 segundos (3s para big-change)
                    const minInterval = isBigChange ? 3000 : 2500;
                    if (now - lastResizeTimeRef.current < minInterval) {
                        const remaining = minInterval - (now - lastResizeTimeRef.current);
                        console.log(`⏭️ Rate limiting: reprogramando resize en ${remaining}ms`);
                        // Reintentar automáticamente tras el cooldown
                        // mantener pendingResize con el último tamaño observado
                        if (resizeTimeout) clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            handleWindowResize();
                        }, Math.max(remaining + 50, 100));
                        return;
                    }
                    
                    // 🚫 PROTECCIÓN ADICIONAL: Si hay más de 2 resizes consecutivos, esperar un poco más
                    if (consecutiveResizeCountRef.current >= 2 && now - lastResizeTimeRef.current < 3500) {
                        const remainingSpam = 3500 - (now - lastResizeTimeRef.current);
                        console.log(`⏭️ Protección anti-spam: reprogramando en ${remainingSpam}ms`);
                        // mantener pendingResize con el último tamaño observado
                        if (resizeTimeout) clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            handleWindowResize();
                        }, Math.max(remainingSpam + 50, 100));
                        return;
                    }
                    
                    // 🎯 THRESHOLD: Solo resize si hay un cambio significativo (>40px)
                    // Evitar resize repetitivo: si las dimensiones son exactamente las mismas, no hacer nada
                    if (plannedWidth === lastDimensionsRef.current.width && plannedHeight === lastDimensionsRef.current.height) {
                        console.log('⏭️ Dimensiones idénticas, saltando resize');
                        return;
                    }
                    
                    // Solo resize si hay un cambio significativo
                    if (!isBigChange && (widthDiff < 40 && heightDiff < 40)) {
                        console.log(`⏭️ Cambio muy pequeño (${widthDiff}x${heightDiff}px), ignorando resize`);
                        return;
                    }
                    // Umbral más alto para cambios de un solo eje (para barras superior/inferior o lateral)
                    const isAxisOnlyFinal = (widthDiff >= 20 && heightDiff < 20) || (heightDiff >= 20 && widthDiff < 20);
                    // Supresión axis-only post big-change (rollback): desactivado
                    if (!isBigChange && isAxisOnlyFinal) {
                        const axisDelta = widthDiff >= 20 && heightDiff < 20 ? widthDiff : heightDiff;
                        if (axisDelta < 80) {
                            console.log(`⏭️ Cambio de un solo eje insuficiente (${widthDiff}x${heightDiff}px), umbral 120px`);
                            return;
                        }
                    }
                    
                    console.log(`✅ AutoResize: EJECUTANDO RESIZE FINAL: ${plannedWidth}x${plannedHeight} (cambio: ${widthDiff}x${heightDiff}px)`);
                    
                    // ACTUALIZAR TIEMPO Y CONTADOR ANTES de ejecutar el resize
                    lastResizeTimeRef.current = now;
                    consecutiveResizeCountRef.current++;
                    
                        // Guardar nuevas dimensiones ANTES de ejecutar el resize
                        lastDimensionsRef.current = { width: plannedWidth, height: plannedHeight };

                        // Verificar túnel OPEN justo antes de enviar para evitar errores de CLOSED/CLOSING
                        const t = client.getTunnel ? client.getTunnel() : null;
                        const openConst2 = window.Guacamole?.Tunnel?.OPEN;
                        if (t && openConst2 !== undefined && typeof t.state !== 'undefined' && t.state !== openConst2) {
                            console.log('⏭️ Saltando sendSize: túnel no OPEN');
                            return;
                        }
                        if (connectionStateRef.current !== 'connected') {
                            console.log('⏭️ Saltando sendSize: estado no conectado');
                            return;
                        }

                        // 📡 ENVIAR SOLO UNA VEZ al servidor (método más estable)
                        if (client.sendSize) {
                            try { client.sendSize(plannedWidth, plannedHeight); } catch {}
                            console.log(`📡 sendSize enviado UNA VEZ: ${plannedWidth}x${plannedHeight}`);
                        burstCountRef.current++;
                        // Activar periodo de silencio: 1500 ms para big-change, 900 ms eje único, 600 ms normal
                        const isAxisOnlyQuiet = (Math.abs(plannedWidth - lastDimensionsRef.current.width) >= 20 && Math.abs(plannedHeight - lastDimensionsRef.current.height) < 20) || (Math.abs(plannedHeight - lastDimensionsRef.current.height) >= 20 && Math.abs(plannedWidth - lastDimensionsRef.current.width) < 20);
                        const quietMs = isBigChange ? 1500 : (isAxisOnlyQuiet ? 900 : 600);
                        quietUntilRef.current = Date.now() + quietMs;
                        // Supresión post-big-change (rollback): desactivado
                        // Nudge/verify tras resize normal para evitar pantalla negra o tamaños no adoptados
                        try {
                            const localDisplay = client.getDisplay?.();
                            if (localDisplay?.onresize) {
                                localDisplay.onresize();
                            }
                            const verifyAfter = (attempt = 1) => {
                                try {
                                    const canvas = containerRef.current?.querySelector('canvas');
                                    if (!canvas) return;
                                    const cw = canvas.width;
                                    const ch = canvas.height;
                                    const ok = Math.abs(cw - plannedWidth) < 40 && Math.abs(ch - plannedHeight) < 40;
                                    if (ok) return;
                                    // Limitar reintentos: 0 para big-change, 1 para normal
                                    if (isBigChange || attempt >= 1) return;
                                    if (client.sendSize) client.sendSize(plannedWidth, plannedHeight);
                                    const disp2 = client.getDisplay?.();
                                    if (disp2?.onresize) disp2.onresize();
                                    setTimeout(() => verifyAfter(attempt + 1), 700);
                                } catch { /* noop */ }
                            };
                            setTimeout(() => verifyAfter(1), 700);
                        } catch { /* noop */ }
                    }
                    // Consumir el pendiente solo si no apareció un tamaño más nuevo durante el envío
                    if (pendingResize && (pendingResize.width !== plannedWidth || pendingResize.height !== plannedHeight)) {
                        // Hay un tamaño más nuevo; reprogramar pronto para enviar SOLO el último
                        if (resizeTimeout) clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            handleWindowResize();
                        }, 150);
                    } else {
                        pendingResize = null;
                    }
 
                    console.log(`✅ AutoResize: RESIZE FINAL COMPLETADO`);
                    // Si era parte del inicial, liberar cooldown antes
                    if (isInitialResizingRef.current) {
                        initialResizeCooldownUntilRef.current = 0;
                        isInitialResizingRef.current = false;
                    }
                    
                    // Reset contador después de 10 segundos sin resize
                    setTimeout(() => {
                        if (Date.now() - lastResizeTimeRef.current >= 10000) {
                            consecutiveResizeCountRef.current = 0;
                            console.log('🔄 Reset contador de resizes consecutivos');
                        }
                    }, 10000);
                    
                } catch (e) {
                    console.error('❌ Error en resize:', e);
                } finally {
                    isResizing = false; // Liberar el flag
                }
            }, delayMs);
        };
        
        // Guardar referencia al handler
        resizeListenerRef.current = handleWindowResize;
        
        window.addEventListener('resize', handleWindowResize);
        
        return () => {
            console.log('🗑️ Removiendo listener resize');
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            window.removeEventListener('resize', handleWindowResize);
            resizeListenerRef.current = null; // Limpiar referencia
        };
    }, [autoResize, connectionState]); // Re-crear listener al cambiar estado/flag

    // 🔍 VIGILANTE: Detectar congelaciones y reconectar automáticamente
    useEffect(() => {
        // Leer umbral de congelación configurable (fallback 1h)
        const configuredFreezeMs = parseInt(localStorage.getItem('rdp_freeze_timeout_ms') || '3600000', 10);
        const FREEZE_TIMEOUT = isNaN(configuredFreezeMs) ? 3600000 : Math.max(30000, configuredFreezeMs);
        const CHECK_INTERVAL = Math.max(15000, Math.min(300000, Math.floor(FREEZE_TIMEOUT / 12)));

        if (connectionState !== 'connected') return;
        
        // console.log('🛡️ Iniciando vigilante anti-congelación');
        
        // Intervalo y timeout dinámicos
        
        let watchdog = null;
        
        const checkForFreeze = () => {
            const now = Date.now();
            const timeSinceActivity = now - lastActivityTime;
            
            // Solo loggear si hay mucho tiempo sin actividad (para debug)
            if (timeSinceActivity > 1800000) { // Solo loggear después de 30 minutos
            console.log(`🔍 Vigilante: última actividad hace ${Math.round(timeSinceActivity/1000)}s`);
            }
            
            // Solo considerar congelación si han pasado más de 2 minutos Y el cliente está en estado connected
            if (timeSinceActivity > FREEZE_TIMEOUT && !freezeDetected && connectionState === 'connected') {
                console.warn('🚨 CONGELACIÓN DETECTADA! Iniciando reconexión automática...');
                setFreezeDetected(true);
                
                // Reconectar automáticamente
                if (guacamoleClientRef.current) {
                    try {
                        guacamoleClientRef.current.disconnect();
                    } catch (e) {
                        console.warn('Error desconectando cliente congelado:', e);
                    }
                }
                
                // Reiniciar la conexión después de un breve delay
                setTimeout(() => {
                    console.log('🔄 Reiniciando conexión tras congelación...');
                    setConnectionState('connecting');
                    setFreezeDetected(false);
                    setLastActivityTime(Date.now());
                }, 2000);
            }
        };
        
        watchdog = setInterval(checkForFreeze, CHECK_INTERVAL);
        
        return () => {
            // console.log('🗑️ Deteniendo vigilante anti-congelación');
            if (watchdog) {
                clearInterval(watchdog);
            }
        };
    }, [connectionState, lastActivityTime, freezeDetected]);

    // 📡 MONITOR: Actualizar actividad cuando hay eventos del cliente
    useEffect(() => {
        const client = guacamoleClientRef.current;
        if (!client || connectionState !== 'connected') return;
        
        const updateActivity = () => {
            setLastActivityTime(Date.now());
        };
        
        // Monitorear eventos que indican que la conexión está viva
        const originalOnSync = client.onsync;
        const originalOnSize = client.onsize;
        const originalOnStateChange = client.onstatechange;
        
        client.onsync = (...args) => {
            updateActivity();
            if (originalOnSync) originalOnSync.apply(client, args);
        };
        
        client.onsize = (...args) => {
            updateActivity();
            if (originalOnSize) originalOnSize.apply(client, args);
        };
        
        // También monitorear cambios de estado
        client.onstatechange = (...args) => {
            updateActivity();
            if (originalOnStateChange) originalOnStateChange.apply(client, args);
        };
        
        return () => {
            // Restaurar handlers originales
            if (client) {
                client.onsync = originalOnSync;
                client.onsize = originalOnSize;
                client.onstatechange = originalOnStateChange;
            }
        };
    }, [connectionState]);

         // Renderizar diferentes estados
     // console.log('🎨 Renderizando con connectionState:', connectionState);
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
