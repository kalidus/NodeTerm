import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Button } from 'primereact/button';
import Guacamole from 'guacamole-common-js';
import ResizeController from '../utils/ResizeController';
import ErrorMapper from '../utils/guacamoleErrorMapper';
import { normalizeRdpColorDepth } from '../utils/rdpScreenConfig';

const GuacamoleTerminal = forwardRef(({
    tabId = 'default',
    rdpConfig = null,
    isActive = true
}, ref) => {
    const containerRef = useRef(null);
    const guacamoleClientRef = useRef(null);
    const mouseRef = useRef(null);
    const keyboardRef = useRef(null);
    const canvasObserverRef = useRef(null);
    // Congelación de resize inicial para camuflar comportamiento del RDProxy
    const freezeResizeUntilRef = useRef(0);
    const allowResizeNow = () => Date.now() >= (freezeResizeUntilRef.current || 0);
    const initialResizeDoneRef = useRef(false);
    const initialResizeAttemptsRef = useRef(0);
    const initialResizeScheduledRef = useRef(false);
    const initialResizeTimerRef = useRef(null);
    const resizeListenerRef = useRef(null); // Para evitar múltiples listeners
    const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected, error
    const connectionStateRef = useRef('disconnected');
    const isActiveRef = useRef(isActive);
    const [errorMessage, setErrorMessage] = useState('');
    const [isGuacamoleLoaded, setIsGuacamoleLoaded] = useState(false);
    const [autoResize, setAutoResize] = useState(true); // Por defecto true para evitar reconexiones
    const [freezeDetected, setFreezeDetected] = useState(false);
    const [isRdpSessionActive, setIsRdpSessionActive] = useState(false);
    // ⚡ PERF: debug flag - set window.__rdp_debug__ = true in console to enable verbose logs
    const _rdpDebug = () => typeof window !== 'undefined' && window.__rdp_debug__;

    // Variables persistentes para rate limiting (fuera de useEffect)
    const lastResizeTimeRef = useRef(0);
    const consecutiveResizeCountRef = useRef(0);
    const initialResizeCooldownUntilRef = useRef(0);
    const startupSettleUntilRef = useRef(0);
    const startupStableCountRef = useRef(0);
    const startupLastPlanRef = useRef({ width: 0, height: 0 });
    const isInitialResizingRef = useRef(false);
    const startupSentOneResizeRef = useRef(false);
    const lastDimensionsRef = useRef({ width: 0, height: 0 });
    // Idle/warm-up control
    const wasIdleRef = useRef(false);
    const lastActivityTimeRef = useRef(Date.now());
    const pendingPostConnectResizeRef = useRef(null);
    const lastEarlyRetryAtRef = useRef(0);
    const noFrameReconnectAttemptedRef = useRef(false);
    // Sync readiness para habilitar resizes no iniciales tras primer onsync
    const syncReadyRef = useRef(false);
    // Wake-up de sesión tras conectar
    const wakeUpSentRef = useRef(false);
    // Keep-alive periódico
    const keepAliveTimerRef = useRef(null);
    const devicePixelRatioRef = useRef(typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1);
    const resizeControllerRef = useRef(null);
    // ⚡ PERF: cache display reference to avoid getDisplay() DOM lookup on every canSend()
    const displayRef = useRef(null);
    // Ack gating de tamaño
    const awaitingSizeAckRef = useRef(false);
    const sizeAckDeadlineRef = useRef(0);
    const lastSentSizeRef = useRef({ width: 0, height: 0, at: 0 });
    // Anti ping-pong A->B->A
    // Solo se mantiene el último tamaño y tiempos; el coalesce lo gestiona el ResizeController
    const hasFatalErrorRef = useRef(false);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        fit: () => {
            try {
                if (resizeControllerRef.current) {
                    resizeControllerRef.current.flush();
                    return;
                }
                // Fallback minimal
                const client = guacamoleClientRef.current;
                const container = containerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const w = Math.floor(rect.width);
                const h = Math.floor(rect.height);
                if (client && connectionStateRef.current === 'connected' && w > 0 && h > 0 && client.sendSize) {
                    client.sendSize(w, h);
                    lastDimensionsRef.current = { width: w, height: h };
                    lastResizeTimeRef.current = Date.now();
                }
            } catch (e) {
                console.warn(`Guacamole fit() error for tab ${tabId}:`, e);
            }
        },
        focus: () => {
            try {
                const el = guacamoleClientRef.current?.getDisplay?.()?.getElement?.();
                if (el) el.focus({ preventScroll: true });
            } catch { }
        },
        disconnect: () => {
            if (guacamoleClientRef.current) {
                guacamoleClientRef.current.disconnect();
            }
        }
    }));

    // Inicializar guacamole-common-js con importación local
    useEffect(() => {
        // Hacer que Guacamole esté disponible globalmente para compatibilidad
        window.Guacamole = Guacamole;
        setIsGuacamoleLoaded(true);
    }, []);

    // Inicializar conexión Guacamole cuando la librería esté lista
    useEffect(() => {


        if (!isGuacamoleLoaded || !rdpConfig || connectionState !== 'disconnected') {
            return;
        }

        const initializeGuacamoleConnection = async () => {
            try {
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

                // Aplicar congelación inicial (por defecto 4000ms optimizado, configurable vía localStorage)
                try {
                    const freezeMs = Math.max(0, parseInt(localStorage.getItem('rdp_initial_freeze_ms') || '4000', 10));
                    if (rdpConfig && rdpConfig.freezeInitialResize) {
                        freezeResizeUntilRef.current = Date.now() + freezeMs;
                    } else {
                        freezeResizeUntilRef.current = 0;
                    }
                } catch { freezeResizeUntilRef.current = 0; }

                // Verificar que electron esté disponible
                if (!window.electron || !window.electron.ipcRenderer) {
                    throw new Error('Electron IPC no está disponible');
                }

                // Esperar un poco para asegurar que los servicios estén listos (optimizado)
                await new Promise(resolve => setTimeout(resolve, 300));

                // Obtener estado del servicio Guacamole con reintentos
                let status = null;
                let attempts = 0;
                const maxAttempts = 3;

                // Verificar si estamos en modo mock

                // Obtener estado detallado del servicio
                const detailedStatus = await window.electron.ipcRenderer.invoke('guacamole:get-status');
                if (detailedStatus && detailedStatus.guacd) {

                    // Mostrar información adicional según el método
                    if (detailedStatus.guacd.method === 'docker') {
                    } else if (detailedStatus.guacd.method === 'native') {
                    }
                }

                while (attempts < maxAttempts && !status) {
                    try {
                        attempts++;
                        status = await window.electron.ipcRenderer.invoke('guacamole:get-status');

                        if (status && status.server) {
                            break; // Éxito
                        }
                    } catch (error) {
                        console.error(`❌ Error en intento ${attempts}:`, error);
                        if (attempts < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 400));
                        }
                    }
                }

                if (!status || !status.server) {
                    throw new Error(`No se pudo obtener estado del servidor Guacamole después de ${maxAttempts} intentos`);
                }

                if (!status.server.isRunning) {
                    throw new Error('Servidor Guacamole no está ejecutándose');
                }

                // Warm-up si el servidor WebSocket acaba de arrancar (optimizado)
                try {
                    const readyAt = Number(status.server.readyAt || 0);
                    if (readyAt > 0) {
                        const sinceReady = Date.now() - readyAt;
                        if (sinceReady < 800) {
                            const waitMs = 800 - sinceReady;
                            await new Promise(resolve => setTimeout(resolve, waitMs));
                        }
                    }
                } catch { }

                // Antes de crear el token, si está activada la congelación inicial,
                // esperar a que el contenedor tenga tamaño estable y usarlo como resolución fija inicial
                try {
                    if (rdpConfig && rdpConfig.freezeInitialResize) {
                        const wait = (ms) => new Promise(r => setTimeout(r, ms));
                        const measureContainer = () => {
                            const cont = containerRef.current;
                            if (!cont) return { w: 0, h: 0 };
                            const rect = cont.getBoundingClientRect();
                            // Usar también clientWidth/Height como respaldo
                            const cw = Math.floor(rect.width || cont.clientWidth || 0);
                            const ch = Math.floor(rect.height || cont.clientHeight || 0);
                            return { w: cw, h: ch };
                        };
                        // Insertar un probe para forzar cálculo de layout de altura completa
                        let probe = null;
                        try {
                            const cont = containerRef.current;
                            if (cont) {
                                probe = document.createElement('div');
                                probe.style.position = 'absolute';
                                probe.style.inset = '0';
                                probe.style.width = '100%';
                                probe.style.height = '100%';
                                probe.style.minWidth = '1px';
                                probe.style.minHeight = '1px';
                                probe.style.visibility = 'hidden';
                                probe.style.pointerEvents = 'none';
                                cont.appendChild(probe);
                            }
                        } catch { }
                        // Esperar a que el layout se estabilice (optimizado a ~800ms máximo)
                        await wait(100);
                        let last = { w: 0, h: 0 };
                        let stableCount = 0;
                        let attempts = 0;
                        while (attempts < 15) { // hasta ~800ms (15 * 50ms + 100ms inicial)
                            await wait(50);
                            const now = measureContainer();
                            const dw = Math.abs(now.w - last.w);
                            const dh = Math.abs(now.h - last.h);
                            if (dw < 2 && dh < 2 && now.w > 0 && now.h > 0) {
                                stableCount += 1;
                            } else {
                                stableCount = 0;
                            }
                            last = now;
                            if (stableCount >= 2) break; // tamaño estable
                            attempts += 1;
                        }
                        // Quitar probe
                        try { if (probe && probe.parentNode) probe.parentNode.removeChild(probe); } catch { }
                        let { w, h } = last;
                        // Si sigue siendo demasiado pequeño, intentar medir ancestros
                        if (w < 320 || h < 240) {
                            try {
                                let el = containerRef.current;
                                let tries = 0;
                                while (el && tries < 5) {
                                    const r = el.getBoundingClientRect();
                                    if (r.width >= 320 && r.height >= 240) {
                                        w = Math.floor(r.width);
                                        h = Math.floor(r.height);
                                        break;
                                    }
                                    el = el.parentElement;
                                    tries += 1;
                                }
                            } catch { }
                        }
                        // Último recurso: usar ventana
                        if (w < 320 || h < 240) {
                            w = Math.floor(window.innerWidth * 0.8);
                            h = Math.floor(window.innerHeight * 0.7);
                            console.log(`⚠️ Medida inicial pequeña, usando fallback de ventana: ${w}x${h}`);
                        }
                        if (w > 0 && h > 0) {
                            rdpConfig.width = w;
                            rdpConfig.height = h;
                            rdpConfig.resolution = `${w}x${h}`;
                        }
                    }
                } catch { }

                // Asegurar que colorDepth viaje al backend
                try {
                    if (typeof rdpConfig.colorDepth !== 'number') {
                        const parsed = parseInt(rdpConfig.colorDepth, 10);
                        if (!isNaN(parsed)) rdpConfig.colorDepth = parsed;
                    }
                    rdpConfig.colorDepth = normalizeRdpColorDepth(rdpConfig.colorDepth, 32);
                } catch { }

                // Crear token de conexión
                // Log crítico: verificar configuración antes de enviar al backend

                const tokenResponse = await window.electron.ipcRenderer.invoke('guacamole:create-token', rdpConfig);

                if (!tokenResponse.success) {
                    try {
                        const mapped = ErrorMapper && typeof ErrorMapper.mapGuacamoleError === 'function'
                            ? ErrorMapper.mapGuacamoleError({ message: tokenResponse.error, type: 'token' })
                            : null;
                        const userMsg = mapped && mapped.userMessage ? mapped.userMessage : (tokenResponse.error || 'Error creando token');
                        hasFatalErrorRef.current = true;
                        setConnectionState('error');
                        setErrorMessage(userMsg);
                        return;
                    } catch (_) {
                        hasFatalErrorRef.current = true;
                        setConnectionState('error');
                        setErrorMessage(tokenResponse.error || 'Error creando token');
                        return;
                    }
                }

                // Configurar tunnel WebSocket
                const tunnel = new window.Guacamole.WebSocketTunnel(tokenResponse.websocketUrl);

                // Crear cliente Guacamole
                const client = new window.Guacamole.Client(tunnel);
                guacamoleClientRef.current = client;

                // Obtener display y elementos de input
                const display = client.getDisplay();

                const targetElement = display.getElement();
                try { targetElement.setAttribute('tabindex', '0'); } catch { }
                try {
                    targetElement.addEventListener('mousedown', () => {
                        try { targetElement.focus({ preventScroll: true }); } catch { try { targetElement.focus(); } catch { } }
                    });
                } catch { }
                const mouse = new window.Guacamole.Mouse(targetElement);
                const keyboard = new window.Guacamole.Keyboard(targetElement);
                mouseRef.current = mouse;
                keyboardRef.current = keyboard;
                try { setTimeout(() => { try { targetElement.focus({ preventScroll: true }); } catch { try { targetElement.focus(); } catch { } } }, 0); } catch { }

                // Clipboard integration (remote -> local)
                try {
                    client.onclipboard = (stream, mimetype) => {
                        try {
                            // Respeta explícitamente cuando el usuario desactiva el portapapeles; por defecto permitido
                            if (rdpConfig && rdpConfig.redirectClipboard === false) return;
                            if (!mimetype || !/^text\//i.test(mimetype)) return; // text only
                            const reader = new window.Guacamole.StringReader(stream);
                            let data = '';
                            reader.ontext = (text) => { data += text; };
                            reader.onend = () => {
                                try {
                                    if (window.electron && window.electron.clipboard && typeof window.electron.clipboard.writeText === 'function') {
                                        window.electron.clipboard.writeText(data || '');
                                    }
                                } catch { }
                            };
                        } catch { }
                    };
                } catch { }

                // Clipboard integration (local -> remote) via Ctrl/Cmd+V
                try {
                    const handlePasteKeydown = (e) => {
                        try {
                            // Respeta explícitamente cuando el usuario desactiva el portapapeles; por defecto permitido
                            if (rdpConfig && rdpConfig.redirectClipboard === false) return;
                            const isMac = (window.electron && window.electron.platform === 'darwin');
                            const modifier = isMac ? e.metaKey : e.ctrlKey;
                            if (modifier && (e.key || '').toLowerCase() === 'v') {
                                e.preventDefault();
                                if (window.electron && window.electron.clipboard && typeof window.electron.clipboard.readText === 'function') {
                                    window.electron.clipboard.readText().then((text) => {
                                        try {
                                            if (typeof text !== 'string' || !client || typeof client.createClipboardStream !== 'function') return;
                                            const stream = client.createClipboardStream('text/plain');
                                            const writer = new window.Guacamole.StringWriter(stream);
                                            writer.sendText(text);
                                            writer.sendEnd();
                                        } catch { }
                                    }).catch(() => { });
                                }
                            }
                        } catch { }
                    };
                    targetElement.addEventListener('keydown', handlePasteKeydown);
                } catch { }

                // Configurar display en el contenedor
                const container = containerRef.current;
                if (container) {

                    // Limpiar contenedor
                    container.innerHTML = '';

                    // Obtener elemento display
                    const displayElement = display.getElement();

                    // Configurar estilos del display
                    displayElement.style.width = '100%';
                    displayElement.style.height = '100%';
                    displayElement.style.display = 'block';
                    displayElement.style.position = 'relative';
                    displayElement.style.backgroundColor = '#000000';
                    displayElement.style.zIndex = '1';
                    displayElement.style.visibility = 'visible';
                    displayElement.style.opacity = '1';

                    // Agregar clase CSS para eliminar borde de foco
                    displayElement.classList.add('guacamole-display');
                    displayElement.setAttribute('data-guacamole-display', 'true');

                    // Añadir al contenedor
                    container.appendChild(displayElement);

                    // Forzar un refresco del display (optimizado)
                    setTimeout(() => {
                        if (display.onresize) {
                            display.onresize();
                        }
                    }, 50);
                } else {
                    console.error('❌ Contenedor no encontrado');
                }

                // ⚡ PERF: Mouse events must NOT call React setState (causes re-render on every mousemove at 60+ events/s).
                // Idle detection uses only the ref.
                mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (mouseState) => {
                    // Enviar eventos solo si el display está montado.
                    if (!document.body.contains(targetElement)) return;
                    try { client.sendMouseState(mouseState); } catch { }
                    lastActivityTimeRef.current = Date.now();
                    wasIdleRef.current = false;
                };

                // Eventos del display (debug only)

                // Agregar eventos para detectar cuando llegan datos
                if (display.onresize) {
                    const originalOnResize = display.onresize;
                    display.onresize = () => {
                        // Siempre permitir que Guacamole procese su propio onresize
                        try { originalOnResize(); } catch { }
                        // No tocar ACK aquí; usar client.onsize como confirmación de servidor
                    };
                }

                keyboard.onkeydown = (keysym) => {
                    client.sendKeyEvent(1, keysym);
                    lastActivityTimeRef.current = Date.now();
                    wasIdleRef.current = false;
                };
                keyboard.onkeyup = (keysym) => {
                    client.sendKeyEvent(0, keysym);
                    lastActivityTimeRef.current = Date.now();
                    wasIdleRef.current = false;
                };

                // Proteger contra sobrescritura no-función internas de guacamole-common-js
                try {
                    // Si por cualquier motivo se sobrescriben con algo no funcional, reinstalar handlers
                    if (typeof keyboard.onkeyup !== 'function' || typeof keyboard.onkeydown !== 'function') {
                        keyboard.onkeydown = (keysym) => {
                            client.sendKeyEvent(1, keysym);
                        };
                        keyboard.onkeyup = (keysym) => {
                            client.sendKeyEvent(0, keysym);
                        };
                    }
                } catch { }

                // Eventos de estado de conexión
                client.onstatechange = (state) => {
                    if (hasFatalErrorRef.current) return; // Mantener pantalla de error hasta que el usuario reintente
                    const stateNames = {
                        0: 'IDLE',
                        1: 'CONNECTING',
                        2: 'WAITING',
                        3: 'CONNECTED',
                        4: 'DISCONNECTED',
                        5: 'DISCONNECTING'
                    };

                    // console.log(`🔍 Comparando: state=${state}, CONNECTED=${window.Guacamole.Client.CONNECTED}`);

                    // Usar constantes directas ya que window.Guacamole.Client.CONNECTED es undefined
                    if (state === 3) { // CONNECTED

                        // Asegurar que el display esté visible
                        const container = containerRef.current;
                        if (container) {
                            container.style.display = 'block';
                        }

                        // Forzar un refresco del display después de conectar (optimizado)
                        setTimeout(() => {
                            if (display && display.onresize) {
                                // Siempre refrescar el display localmente; esto no envía tamaño
                                display.onresize();
                            }
                        }, 200);

                        setConnectionState('connected');
                        setIsRdpSessionActive(true); // Marcar sesión RDP como activa
                        const nowTsConn = Date.now();
                        lastActivityTimeRef.current = nowTsConn; // Registrar actividad inicial
                        wasIdleRef.current = false;
                        syncReadyRef.current = false; // esperar primer onsync
                        noFrameReconnectAttemptedRef.current = false;

                        // Enviar un "wake-up" suave si no hay actividad en ~1.5s tras conectar
                        wakeUpSentRef.current = false;
                        setTimeout(() => {
                            try {
                                if (wakeUpSentRef.current) return;
                                if (connectionStateRef.current !== 'connected') return;
                                const idleFor = Date.now() - (lastActivityTimeRef.current || 0);
                                if (idleFor < 1200) return; // ya hubo actividad
                                const cli = guacamoleClientRef.current;
                                if (!cli) return;
                                // Nudge de input
                                try {
                                    const disp = cli.getDisplay?.();
                                    const el = disp?.getElement?.();
                                    const rect = el?.getBoundingClientRect?.();
                                    const x = Math.max(1, Math.floor((rect?.width || 10) / 2));
                                    const y = Math.max(1, Math.floor((rect?.height || 10) / 2));
                                    const mouse = { x, y, left: false, middle: false, right: false };
                                    if (cli.sendMouseState) cli.sendMouseState(mouse);
                                } catch { }
                                try {
                                    // Tecla Shift (press + release) para despertar
                                    const SHIFT = 0xffe1;
                                    if (cli.sendKeyEvent) {
                                        cli.sendKeyEvent(1, SHIFT);
                                        cli.sendKeyEvent(0, SHIFT);
                                    }
                                } catch { }
                                // Reenviar tamaño actual del contenedor una vez
                                try {
                                    const cont = containerRef.current;
                                    if (cont) {
                                        const r = cont.getBoundingClientRect();
                                        const w = Math.floor(r.width);
                                        const h = Math.floor(r.height);
                                        if (w > 0 && h > 0) {
                                            if (!isActive) return;
                                            const disp = cli.getDisplay?.();
                                            const el = disp?.getElement?.();
                                            if (!el || !document.body.contains(el)) return;
                                            if (allowResizeNow() && cli.sendSize) cli.sendSize(w, h);
                                            else if (cli.sendInstruction) cli.sendInstruction('size', w, h);
                                            lastDimensionsRef.current = { width: w, height: h };
                                            lastResizeTimeRef.current = Date.now();
                                        }
                                    }
                                } catch { }
                                wakeUpSentRef.current = true;
                                console.log('🟢 Wake-up inicial enviado');
                            } catch { }
                        }, 1500);

                        // Si autoResize está activado, hacer resize inicial tras conexión
                        if (rdpConfig.autoResize && !rdpConfig.freezeInitialResize) {
                            // Función para intentar resize inicial con reintentos
                            const attemptInitialResize = (attempt = 1) => {
                                const container = containerRef.current;
                                if (!container) {
                                    if (attempt < 5) {
                                        setTimeout(() => attemptInitialResize(attempt + 1), 200);
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
                                                } catch { }
                                            }, 400);
                                            pendingPostConnectResizeRef.current = null;
                                        }
                                    } catch { }
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


                                try {
                                    // 1) Ajuste local solo para el inicial (no dispara window.resize)
                                    const display = client.getDisplay();
                                    // ⚡ PERF: cache display to avoid repeated DOM lookups in canSend()
                                    displayRef.current = display; if (display) {
                                        const defaultLayer = display.getDefaultLayer();
                                        if (defaultLayer) {
                                            display.resize(defaultLayer, newWidth, newHeight);
                                        }
                                        if (display.scale) display.scale(1.0);
                                        if (display.onresize) display.onresize();
                                    }

                                    // 2) Enviar tamaño al servidor
                                    // IMPORTANTE: El resize inicial SIEMPRE debe enviarse, incluso si la pestaña no está activa
                                    // Esto es crítico para configurar correctamente la sesión RDP desde el inicio
                                    if (client.sendSize) {
                                        console.log(`📡 Resize inicial via sendSize: ${newWidth}x${newHeight} (isActive: ${isActive})`);
                                        client.sendSize(newWidth, newHeight);
                                    } else if (client.sendInstruction) {
                                        console.log(`📡 Resize inicial via sendInstruction: ${newWidth}x${newHeight} (isActive: ${isActive})`);
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
                                    startupSettleUntilRef.current = Date.now() + 4000; // ventana más larga
                                    startupStableCountRef.current = 0;
                                    startupLastPlanRef.current = { width: newWidth, height: newHeight };
                                    isInitialResizingRef.current = true;
                                    initialResizeDoneRef.current = true;
                                    startupSentOneResizeRef.current = false;

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
                                            // Reenviar tamaño una vez más (como parte del resize inicial, NO verificar isActive)
                                            console.log(`🔄 Reintento ${attempt} de resize inicial: ${newWidth}x${newHeight}`);
                                            if (client.sendSize && allowResizeNow()) client.sendSize(newWidth, newHeight);
                                            else if (client.sendInstruction) client.sendInstruction("size", newWidth, newHeight);
                                            const disp = client.getDisplay?.();
                                            if (disp?.onresize) disp.onresize();
                                            setTimeout(() => verifyAndNudge(attempt + 1), 700);
                                        } catch { /* noop */ }
                                    };
                                    setTimeout(() => verifyAndNudge(1), 700);

                                    console.log(`✅ Auto-resize inicial completado exitosamente`);
                                    initialResizeScheduledRef.current = true;
                                } catch (e) {
                                    console.error('❌ Error en resize inicial:', e);
                                    if (attempt < 5) {
                                        setTimeout(() => attemptInitialResize(attempt + 1), 400);
                                    }
                                }
                            };

                            // Disparadores para hacer el resize inicial en el momento más estable
                            // 1) Retardo inicial (solo programar una vez)
                            initialResizeAttemptsRef.current = 0;
                            initialResizeDoneRef.current = false;
                            initialResizeScheduledRef.current = false;
                            if (initialResizeTimerRef.current) clearTimeout(initialResizeTimerRef.current);
                            initialResizeTimerRef.current = setTimeout(() => {
                                if (!initialResizeDoneRef.current && !initialResizeScheduledRef.current) {
                                    initialResizeScheduledRef.current = true;
                                    attemptInitialResize(1);
                                }
                            }, 900);
                            // 2) Cuando el servidor reporta tamaño por primera vez
                            const originalOnSizeForInitial = client.onsize;
                            client.onsize = (...args) => {
                                if (!initialResizeDoneRef.current && !initialResizeScheduledRef.current) {
                                    initialResizeScheduledRef.current = true;
                                    setTimeout(() => attemptInitialResize(1), 150);
                                }
                                if (originalOnSizeForInitial) originalOnSizeForInitial.apply(client, args);
                            };
                            // 2b) Al recibir el primer onsync, intentar el resize inicial (gating por sync)
                            const originalOnSyncForInitial = client.onsync;
                            client.onsync = (...args) => {
                                if (!initialResizeDoneRef.current && !initialResizeScheduledRef.current) {
                                    initialResizeScheduledRef.current = true;
                                    setTimeout(() => attemptInitialResize(1), 120);
                                }
                                if (originalOnSyncForInitial) originalOnSyncForInitial.apply(client, args);
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
                            } catch { }
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
                            const displayElement = containerRef.current?.querySelector('canvas');
                            if (displayElement) {

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

                                // Verificar visibilidad del canvas
                                const rect = displayElement.getBoundingClientRect();

                                // Verificar estilos del canvas
                                const styles = window.getComputedStyle(displayElement);

                                if (!hasData) {
                                    console.warn('⚠️ Canvas está vacío - no hay datos del servidor RDP');
                                    try {
                                        const cli = guacamoleClientRef.current;
                                        if (cli) {
                                            // Nudge de input (mouse + Shift) y reenviar tamaño actual
                                            try {
                                                const dispN = cli.getDisplay?.();
                                                const elN = dispN?.getElement?.();
                                                const rectN = elN?.getBoundingClientRect?.();
                                                const xN = Math.max(1, Math.floor((rectN?.width || 10) / 2));
                                                const yN = Math.max(1, Math.floor((rectN?.height || 10) / 2));
                                                cli.sendMouseState && cli.sendMouseState({ x: xN, y: yN, left: false, middle: false, right: false });
                                                const SHIFT = 0xffe1;
                                                cli.sendKeyEvent && cli.sendKeyEvent(1, SHIFT);
                                                cli.sendKeyEvent && cli.sendKeyEvent(0, SHIFT);
                                            } catch { }
                                            try {
                                                const contN = containerRef.current;
                                                if (contN) {
                                                    const rN = contN.getBoundingClientRect();
                                                    const wN = Math.floor(rN.width);
                                                    const hN = Math.floor(rN.height);
                                                    if (wN > 0 && hN > 0) {
                                                        if (cli.sendSize) cli.sendSize(wN, hN);
                                                        else if (cli.sendInstruction) cli.sendInstruction('size', wN, hN);
                                                    }
                                                }
                                            } catch { }
                                            try { if (display && display.onresize) display.onresize(); } catch { }
                                            // Re-chequear en ~1.4s; si sigue vacío, reconexión única
                                            setTimeout(() => {
                                                try {
                                                    const de = containerRef.current?.querySelector('canvas');
                                                    if (!de) return;
                                                    const ctx2 = de.getContext('2d');
                                                    const imageData2 = ctx2.getImageData(0, 0, de.width, de.height);
                                                    const stillEmpty = !imageData2.data.some(pixel => pixel !== 0);
                                                    if (stillEmpty && connectionStateRef.current === 'connected' && !noFrameReconnectAttemptedRef.current) {
                                                        console.warn('🚨 Sin datos tras nudge; reconexión única para recuperar frames');
                                                        noFrameReconnectAttemptedRef.current = true;
                                                        // Guardar tamaño para reenviarlo tras reconectar
                                                        try {
                                                            const cont3 = containerRef.current;
                                                            if (cont3) {
                                                                const r3 = cont3.getBoundingClientRect();
                                                                pendingPostConnectResizeRef.current = { width: Math.floor(r3.width), height: Math.floor(r3.height) };
                                                            }
                                                        } catch { }
                                                        try { cli.disconnect && cli.disconnect(); } catch { }
                                                        setConnectionState('disconnected');
                                                    }
                                                } catch { }
                                            }, 1400);
                                        }
                                    } catch { }
                                }
                            } else {
                                console.log('⚠️ No se encontró canvas - posible problema de datos visuales');
                            }
                        }, 5000);
                    } else if (state === 4) { // DISCONNECTED
                        setConnectionState('disconnected');
                        setIsRdpSessionActive(false); // Desactivar sesión RDP
                        // Resetear timers/refs críticos al desconectar para que próxima conexión tenga estado limpio
                        try {
                            lastDimensionsRef.current = { width: 0, height: 0 };
                            lastResizeTimeRef.current = 0;
                        } catch { }
                    } else if (state === 2) { // WAITING
                        setConnectionState('connecting');
                    } else if (state === 1) { // CONNECTING  
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
                    hasFatalErrorRef.current = true;
                    setConnectionState('error');
                    try {
                        const mapped = ErrorMapper && typeof ErrorMapper.mapGuacamoleError === 'function'
                            ? ErrorMapper.mapGuacamoleError(error, {
                                phase: (connectionStateRef.current === 'connected') ? 'connected' : 'connecting',
                                elapsedMs: Date.now() - connectStartedAt
                            })
                            : null;
                        const userMsg = mapped && mapped.userMessage
                            ? mapped.userMessage
                            : (`Error de conexión: ${error?.message || 'Error desconocido'}`);
                        setErrorMessage(userMsg);
                    } catch (_) {
                        setErrorMessage(`Error de conexión: ${error?.message || 'Error desconocido'}`);
                    }
                };

                // Eventos de datos recibidos (para debug)
                if (tunnel.onerror) {
                    tunnel.onerror = (error) => {
                        console.error('❌ Error en tunnel WebSocket:', error);
                        try {
                            const mapped = ErrorMapper && typeof ErrorMapper.mapGuacamoleError === 'function'
                                ? ErrorMapper.mapGuacamoleError(error, {
                                    phase: (connectionStateRef.current === 'connected') ? 'connected' : 'connecting',
                                    elapsedMs: Date.now() - connectStartedAt
                                })
                                : null;
                            if (mapped && mapped.userMessage) {
                                setErrorMessage(mapped.userMessage);
                            }
                        } catch (_) { }
                    };
                }

                // Eventos de estado del tunnel
                if (tunnel.onstatechange) {
                    const originalStateChange = tunnel.onstatechange;
                    tunnel.onstatechange = (state) => {
                        console.log('🌐 Estado del tunnel WebSocket:', state);
                        // Guardar estado en ref si está disponible
                        try { quietUntilRef.current = quietUntilRef.current; } catch { }
                        if (originalStateChange) {
                            originalStateChange(state);
                        }
                    };
                }

                // Timeout de conexión (30 segundos)
                const connectionTimeout = setTimeout(() => {
                    console.error('⏰ Timeout de conexión RDP - 30 segundos');
                    hasFatalErrorRef.current = true;
                    setConnectionState('error');
                    try {
                        const userMsg = ErrorMapper && typeof ErrorMapper.mapTimeoutError === 'function'
                            ? ErrorMapper.mapTimeoutError(rdpConfig?.hostname || rdpConfig?.server)
                            : `Timeout: El servidor RDP no responde (${rdpConfig?.hostname || rdpConfig?.server || ''} no existe?)`;
                        setErrorMessage(userMsg);
                    } catch (_) {
                        setErrorMessage(`Timeout: El servidor RDP no responde (${rdpConfig?.hostname || rdpConfig?.server || ''} no existe?)`);
                    }
                    if (client) {
                        client.disconnect();
                    }
                }, 60000); // Aumentar a 60 segundos

                // Conectar
                const connectStartedAt = Date.now();
                client.connect();

                // Limpiar timeout cuando se conecte exitosamente
                const originalStateChange = client.onstatechange;
                client.onstatechange = (state) => {
                    if (hasFatalErrorRef.current) return; // No sobrescribir estado de error
                    if (state === 3) { // CONNECTED
                        clearTimeout(connectionTimeout);
                    }
                    // Si se desconecta muy pronto tras conectar, hacer un reintento único
                    if (state === 4) { // DISCONNECTED
                        const elapsed = Date.now() - connectStartedAt;
                        const nowRetry = Date.now();
                        const retryCooldownOk = (nowRetry - lastEarlyRetryAtRef.current) > 10000;
                        if (elapsed < 5000 && !initialResizeDoneRef.current && retryCooldownOk) {
                            console.warn(`⚠️ Desconexión temprana (${elapsed}ms). Reintentando una vez...`);
                            lastEarlyRetryAtRef.current = nowRetry;
                            try {
                                const container = containerRef.current;
                                if (container) {
                                    const r = container.getBoundingClientRect();
                                    pendingPostConnectResizeRef.current = { width: Math.floor(r.width), height: Math.floor(r.height) };
                                }
                            } catch { }
                            setTimeout(() => {
                                try { client.disconnect(); } catch { }
                                setConnectionState('disconnected');
                            }, 200);
                            return;
                        }
                        // Si Guacamole reporta SESSION_CONFLICT durante conexión, remapear a mensaje más claro
                        try {
                            const mapped = ErrorMapper && typeof ErrorMapper.mapGuacamoleError === 'function'
                                ? ErrorMapper.mapGuacamoleError({ code: 519, message: 'SESSION_CONFLICT' }, { phase: 'connecting', elapsedMs: elapsed })
                                : null;
                            if (mapped && mapped.userMessage && mapped.kind !== 'conflict') {
                                hasFatalErrorRef.current = true;
                                setConnectionState('error');
                                setErrorMessage(mapped.userMessage);
                                return;
                            }
                        } catch { }
                    }
                    originalStateChange(state);
                };

            } catch (error) {
                console.error('❌ Error inicializando conexión Guacamole:', error);
                hasFatalErrorRef.current = true;
                setConnectionState('error');
                try {
                    const mapped = ErrorMapper && typeof ErrorMapper.mapGuacamoleError === 'function'
                        ? ErrorMapper.mapGuacamoleError(error)
                        : null;
                    const userMsg = mapped && mapped.userMessage ? mapped.userMessage : (error?.message || 'Error desconocido');
                    setErrorMessage(userMsg);
                } catch (_) {
                    setErrorMessage(error?.message || 'Error desconocido');
                }
            }
        };

        initializeGuacamoleConnection();

        // Cleanup
        return () => {
            try {
                if (guacamoleClientRef.current) {
                    try { guacamoleClientRef.current.disconnect(); } catch { }
                }
                if (keepAliveTimerRef.current) {
                    clearInterval(keepAliveTimerRef.current);
                    keepAliveTimerRef.current = null;
                }
                if (initialResizeTimerRef.current) {
                    clearTimeout(initialResizeTimerRef.current);
                    initialResizeTimerRef.current = null;
                }
                if (canvasObserverRef.current) {
                    try { canvasObserverRef.current.disconnect(); } catch { }
                    canvasObserverRef.current = null;
                }
                // Limpiar listeners de teclado/ratón
                if (keyboardRef.current) {
                    try { keyboardRef.current.onkeydown = null; keyboardRef.current.onkeyup = null; } catch { }
                    keyboardRef.current = null;
                }
                if (mouseRef.current) {
                    try { mouseRef.current.onmousedown = null; mouseRef.current.onmouseup = null; mouseRef.current.onmousemove = null; } catch { }
                    mouseRef.current = null;
                }
                // Vaciar contenedor
                if (containerRef.current) {
                    try { containerRef.current.innerHTML = ''; } catch { }
                }
            } finally {
                guacamoleClientRef.current = null;
            }
        };
    }, [isGuacamoleLoaded, rdpConfig, tabId, connectionState]);

    // Desconexión segura en recargas/cierrres de ventana
    useEffect(() => {
        const handleBeforeUnload = () => {
            try {
                if (guacamoleClientRef.current) {
                    try { guacamoleClientRef.current.disconnect(); } catch { }
                }
                if (keyboardRef.current) {
                    try { keyboardRef.current.onkeydown = null; keyboardRef.current.onkeyup = null; } catch { }
                    keyboardRef.current = null;
                }
                if (mouseRef.current) {
                    try { mouseRef.current.onmousedown = null; mouseRef.current.onmouseup = null; mouseRef.current.onmousemove = null; } catch { }
                    mouseRef.current = null;
                }
                if (containerRef.current) {
                    try { containerRef.current.innerHTML = ''; } catch { }
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
        // Gestionar keep-alive al entrar/salir de conectado
        if (connectionState === 'connected') {
            if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
            // Keep-alive más agresivo: cada 10s, enviar si hay >15s de inactividad
            // Esto ayuda especialmente con WSL que puede perder conexiones más fácilmente
            keepAliveTimerRef.current = setInterval(() => {
                try {
                    const client = guacamoleClientRef.current;
                    if (!client) return;
                    // Send keep-alive only after >15s idle
                    const idleMs = Date.now() - (lastActivityTimeRef.current || 0);
                    if (idleMs < 15000) return;
                    // ⚡ PERF FIX: Only send lightweight mouse+key nudge.
                    // Do NOT sendSize here - it causes a visible frame repaint/glitch every 10s.
                    // Size changes are handled exclusively by ResizeController + window resize events.
                    const disp = displayRef.current || client.getDisplay?.();
                    const el = disp?.getElement?.();
                    const rect = el?.getBoundingClientRect?.();
                    const x = Math.max(1, Math.floor((rect?.width || 10) / 2));
                    const y = Math.max(1, Math.floor((rect?.height || 10) / 2));
                    try { client.sendMouseState && client.sendMouseState({ x, y, left: false, middle: false, right: false }); } catch { }
                    try { const SHIFT = 0xffe1; client.sendKeyEvent && client.sendKeyEvent(1, SHIFT); client.sendKeyEvent && client.sendKeyEvent(0, SHIFT); } catch { }
                } catch { }
            }, 10000); // Cada 10 segundos
        } else {
            if (keepAliveTimerRef.current) {
                clearInterval(keepAliveTimerRef.current);
                keepAliveTimerRef.current = null;
            }
        }
    }, [connectionState, isActive]);

    // ✅ MEMORY LEAK FIX: Cleanup general cuando el componente se desmonta
    useEffect(() => {
        return () => {
            // Limpiar keep-alive timer
            if (keepAliveTimerRef.current) {
                clearInterval(keepAliveTimerRef.current);
                keepAliveTimerRef.current = null;
            }
            // Limpiar initial resize timer
            if (initialResizeTimerRef.current) {
                clearTimeout(initialResizeTimerRef.current);
                initialResizeTimerRef.current = null;
            }
            // Limpiar resize controller (ResizeController tiene stop(), no destroy())
            if (resizeControllerRef.current) {
                try { resizeControllerRef.current.stop(); } catch { }
                resizeControllerRef.current = null;
            }
            // Desconectar cliente Guacamole
            if (guacamoleClientRef.current) {
                try {
                    guacamoleClientRef.current.disconnect();
                } catch (e) {
                    // Ignorar errores al desconectar
                }
                guacamoleClientRef.current = null;
            }
        };
    }, []); // Solo ejecutar al desmontar

    // (lastActivityTime state removed - ref is updated directly in event handlers)

    // Mantener ref sincronizado con el estado de actividad de la pestaña
    useEffect(() => {
        console.log(`[Guacamole ${tabId}] Cambio de estado isActive: ${isActiveRef.current} -> ${isActive}`);
        isActiveRef.current = isActive;
    }, [isActive]);

    // Controlador centralizado de resize: ResizeObserver + debounce + ACK gating
    useEffect(() => {
        if (!autoResize) {
            if (resizeControllerRef.current) {
                try { resizeControllerRef.current.stop(); } catch { }
                resizeControllerRef.current = null;
            }
            return;
        }

        // Mantener controlador activo incluso si la pestaña no está activa; evita cierres por falta de acks
        // Solo se controlará el envío mediante canSend/ack gating

        const canSend = () => {
            if (connectionStateRef.current !== 'connected') return false;
            // Restringir envíos durante la congelación inicial
            if (!allowResizeNow()) return false;
            const client = guacamoleClientRef.current;
            if (!client) return false;
            // ⚡ PERF: use cached displayRef instead of client.getDisplay() DOM lookup on every resize event
            const display = displayRef.current || client.getDisplay?.();
            if (!isActiveRef.current) {
                if (_rdpDebug()) console.log(`[Guacamole ${tabId}] canSend: false (pestaña inactiva)`);
                return false;
            }
            return !!(display && display.getDefaultLayer && display.getDefaultLayer());
        };
        const sendSize = (w, h) => {
            const client = guacamoleClientRef.current;
            if (!client || !client.sendSize) return;
            // Esta restricción es correcta para resizes NO iniciales
            if (!isActiveRef.current) {
                if (_rdpDebug()) console.log(`[Guacamole ${tabId}] sendSize bloqueado: pestaña inactiva`);
                return;
            }
            if (_rdpDebug()) console.log(`[Guacamole ${tabId}] Enviando resize posterior: ${w}x${h}`);
            client.sendSize(w, h);
        };
        const getContainer = () => containerRef.current;
        const getAwaitingAck = () => awaitingSizeAckRef.current;
        const getAckDeadline = () => sizeAckDeadlineRef.current;
        const setAwaitingAck = (v, deadlineTs) => {
            awaitingSizeAckRef.current = !!v;
            sizeAckDeadlineRef.current = v ? Number(deadlineTs || (Date.now() + 1500)) : 0;
        };
        const releaseAck = () => {
            awaitingSizeAckRef.current = false;
            sizeAckDeadlineRef.current = 0;
        };
        const getLastDims = () => ({ ...lastDimensionsRef.current });
        const setLastDims = ({ width, height }) => {
            lastDimensionsRef.current = { width, height };
            lastResizeTimeRef.current = Date.now();
        };
        const onLog = (msg) => console.log(msg);
        const debounceMs = Math.max(100, parseInt(localStorage.getItem('rdp_resize_debounce_ms') || '300', 10));
        const ackTimeoutMs = Math.max(600, parseInt(localStorage.getItem('rdp_resize_ack_timeout_ms') || '1500', 10));

        // Apagar instancia previa
        if (resizeControllerRef.current) {
            try { resizeControllerRef.current.stop(); } catch { }
            resizeControllerRef.current = null;
        }
        // Quitar listener antiguo si quedara activo
        if (resizeListenerRef.current) {
            try {
                window.removeEventListener('resize', resizeListenerRef.current);
            } catch { }
            resizeListenerRef.current = null;
        }

        // Crear y arrancar
        resizeControllerRef.current = new ResizeController({
            getContainer,
            canSend,
            sendSize,
            getAwaitingAck,
            getAckDeadline,
            setAwaitingAck,
            releaseAck,
            getLastDims,
            setLastDims,
            debounceMs,
            ackTimeoutMs,
            onLog
        });
        try { resizeControllerRef.current.start(); } catch { }
        // Notificar tamaño actual al arrancar para alinear con el contenedor
        try { resizeControllerRef.current.notify(); } catch { }

        return () => {
            if (resizeControllerRef.current) {
                try { resizeControllerRef.current.stop(); } catch { }
                resizeControllerRef.current = null;
            }
        };
    }, [autoResize, connectionState]);

    // 🛡️ ESTABLE: Auto-resize listener con enfoque conservador
    useEffect(() => {
        // Desactivar lógica antigua si vamos a usar el controlador centralizado
        try {
            if (resizeControllerRef.current) {
                if (resizeListenerRef.current) {
                    window.removeEventListener('resize', resizeListenerRef.current);
                    resizeListenerRef.current = null;
                }
                return;
            }
        } catch { }
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
            const dprNow = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
            const dprChanged = Math.abs(dprNow - (devicePixelRatioRef.current || 1)) > 0.05;
            devicePixelRatioRef.current = dprNow;
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
                    try { clientStateVal = client.currentState; } catch { }
                    const isDisconnected = clientStateVal === 4 || connectionStateRef.current !== 'connected';
                    const tunnel = client.getTunnel ? client.getTunnel() : null;
                    const openConstWU = window.Guacamole?.Tunnel?.OPEN;
                    const tunnelNotOpen = tunnel && typeof tunnel.state !== 'undefined' && openConstWU !== undefined && tunnel.state !== openConstWU;
                    if (isDisconnected || tunnelNotOpen) {
                        // Guardar tamaño y forzar reconexión
                        pendingPostConnectResizeRef.current = { width: currentWidth, height: currentHeight };
                        try { client.disconnect(); } catch { }
                        setConnectionState('disconnected');
                        return;
                    }
                    // Warm-up suave: refresco local y un único sendSize
                    try {
                        const disp = client.getDisplay?.();
                        const defLayer = disp?.getDefaultLayer?.();
                        if (disp && defLayer && currentWidth > 0 && currentHeight > 0) {
                            try { disp.resize(defLayer, currentWidth, currentHeight); } catch { }
                            try { disp.onresize && disp.onresize(); } catch { }
                        }
                    } catch { }
                    try {
                        if (client.sendSize) client.sendSize(currentWidth, currentHeight);
                        else if (client.sendInstruction) client.sendInstruction('size', currentWidth, currentHeight);
                    } catch { }
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
            // Heurística: cambios de ventana del sistema (maximizar/restaurar)
            const prevW = Math.max(1, lastDimensionsRef.current.width || 1);
            const prevH = Math.max(1, lastDimensionsRef.current.height || 1);
            const ratioW = Math.abs(currentWidth - prevW) / prevW;
            const ratioH = Math.abs(currentHeight - prevH) / prevH;
            const isSystemWindowResize = ((ratioW > 0.15 || ratioH > 0.15) && (diffNowW >= 120 || diffNowH >= 120)) || dprChanged;

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

                // Anti ping-pong A->B->A en 15s (tolerancia 10px)
                const nowTsPlans = Date.now();
                lastTwoPlansRef.current.push({ w: plannedWidth, h: plannedHeight, ts: nowTsPlans });
                if (lastTwoPlansRef.current.length > 3) lastTwoPlansRef.current.shift();
                if (lastTwoPlansRef.current.length >= 3) {
                    const a = lastTwoPlansRef.current[0];
                    const b = lastTwoPlansRef.current[1];
                    const c = lastTwoPlansRef.current[2];
                    const close = (x, y) => Math.abs(x - y) <= 10;
                    const isABA = close(a.w, c.w) && close(a.h, c.h) && (!close(a.w, b.w) || !close(a.h, b.h)) && (nowTsPlans - a.ts) <= 15000;
                    if (isABA) {
                        console.log('⏭️ Anti ping-pong: colapsando A→B→A; mantener último estable');
                        return;
                    }
                }

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
                        // No enviar resizes de un solo eje durante la ventana de arranque
                        if (isAxisOnly) {
                            console.log('⏭️ Arranque: ignorando cambio de un eje (axis-only)');
                            return;
                        }
                        // Permitir solo un resize enviado durante la ventana de arranque
                        if (startupSentOneResizeRef.current) {
                            console.log('⏭️ Arranque: ya se envió un resize; ignorando hasta que finalice la ventana');
                            return;
                        }
                        // Hasta primer onsync, posponer cualquier resize no inicial
                        if (!syncReadyRef.current) {
                            console.log('⏭️ Arranque: esperando primer onsync antes de resizes');
                            if (resizeTimeout) clearTimeout(resizeTimeout);
                            resizeTimeout = setTimeout(() => handleWindowResize(), 300);
                            return;
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

                    // Backoff adaptativo: si ≥4 resizes en 30s, subir mínimo a 4s por 20s
                    // No contar los resizes de sistema (maximizar/restaurar) para no penalizar UX
                    if (!resizesWindowStartRef.current || (now - resizesWindowStartRef.current) > 30000) {
                        resizesWindowStartRef.current = now;
                        resizesWindowCountRef.current = 0;
                    }
                    if (!isSystemWindowResize) {
                        resizesWindowCountRef.current += 1;
                        if (resizesWindowCountRef.current >= 4) {
                            adaptiveBackoffUntilRef.current = now + 20000; // 20s
                        }
                    }

                    // Quiet period post-send: ignorar resizes durante quiet salvo cambios muy grandes
                    // o si hay ack pendiente sin haber expirado el deadline.
                    if (now < quietUntilRef.current && combinedDiff < 350) {
                        const remainingQuiet = Math.max(quietUntilRef.current - now, 150);
                        if (resizeTimeout) clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            handleWindowResize();
                        }, remainingQuiet);
                        console.log(`⏸️ Quiet period activo (${remainingQuiet}ms), reprogramando`);
                        return;
                    }
                    if (awaitingSizeAckRef.current && now < sizeAckDeadlineRef.current) {
                        const remainingAck = sizeAckDeadlineRef.current - now;
                        if (resizeTimeout) clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => handleWindowResize(), Math.max(remainingAck, 100));
                        console.log(`⏸️ Esperando ack onsize (${remainingAck}ms)`);
                        return;
                    }
                    if (isBigChange && !isSystemWindowResize) {
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
                        if (!isSystemWindowResize && sameAsLastBig && (nowTs - lastBigChangeAtRef.current < 3000)) {
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
                        if (resizeTimeout) clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            handleWindowResize();
                        }, 3000);
                        return;
                    }

                    // ⏱️ RATE LIMITING: No enviar más de 1 resize cada 2.5 segundos (3s para big-change)
                    let minInterval = isBigChange ? 3000 : 2500;
                    if (isSystemWindowResize) {
                        // Permitir reacción más inmediata para maximizar/restaurar
                        minInterval = 0;
                    }
                    if (!isSystemWindowResize && now < adaptiveBackoffUntilRef.current) {
                        minInterval = Math.max(minInterval, 4000);
                    }
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
                        try { client.sendSize(plannedWidth, plannedHeight); } catch { }
                        console.log(`📡 sendSize enviado UNA VEZ: ${plannedWidth}x${plannedHeight}`);
                        burstCountRef.current++;
                        // Activar periodo de silencio: 2200 ms para big-change, 900 ms eje único, 600 ms normal
                        const isAxisOnlyQuiet = (Math.abs(plannedWidth - lastDimensionsRef.current.width) >= 20 && Math.abs(plannedHeight - lastDimensionsRef.current.height) < 20) || (Math.abs(plannedHeight - lastDimensionsRef.current.height) >= 20 && Math.abs(plannedWidth - lastDimensionsRef.current.width) < 20);
                        let quietMs = isBigChange ? 2200 : (isAxisOnlyQuiet ? 900 : 600);
                        if (isSystemWindowResize) {
                            quietMs = Math.min(quietMs, 600);
                        }
                        quietUntilRef.current = Date.now() + quietMs;
                        // Iniciar ack gating: esperar onsize o 1500ms
                        awaitingSizeAckRef.current = true;
                        sizeAckDeadlineRef.current = Date.now() + 1500;
                        lastSentSizeRef.current = { width: plannedWidth, height: plannedHeight, at: Date.now() };
                        // Autoliberar ack si no llega onsize en el deadline
                        setTimeout(() => {
                            if (awaitingSizeAckRef.current && Date.now() >= sizeAckDeadlineRef.current) {
                                awaitingSizeAckRef.current = false;
                                sizeAckDeadlineRef.current = 0;
                            }
                        }, 1600);
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
                                    // Limitar reintentos: 0 para big-change inmediato, 1 para normal
                                    if (isBigChange || attempt >= 2) return;
                                    if (client.sendSize) client.sendSize(plannedWidth, plannedHeight);
                                    const disp2 = client.getDisplay?.();
                                    if (disp2?.onresize) disp2.onresize();
                                    setTimeout(() => verifyAfter(attempt + 1), 700);
                                } catch { /* noop */ }
                            };
                            setTimeout(() => verifyAfter(1), 700);

                            // Watchdog post-envío: si tras un big-change no hay actividad en ~1.8s, hacer un nudge único
                            setTimeout(() => {
                                try {
                                    if (connectionStateRef.current !== 'connected') return;
                                    const noActivityFor = Date.now() - (lastActivityTimeRef.current || 0);
                                    if (isBigChange && noActivityFor > 1800) {
                                        if (client.sendSize) client.sendSize(plannedWidth, plannedHeight);
                                        const disp3 = client.getDisplay?.();
                                        if (disp3?.onresize) disp3.onresize();
                                        console.log('🛠️ Watchdog post-big-change: reenviado tamaño por inactividad');
                                    }
                                } catch { /* noop */ }
                            }, isBigChange ? 1800 : 0);
                        } catch { /* noop */ }
                        // Si seguimos en ventana de arranque, marcar que ya enviamos un resize
                        if (Date.now() < startupSettleUntilRef.current) {
                            startupSentOneResizeRef.current = true;
                        }
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
        // Leer umbral de congelación configurable (fallback 2h)
        const configuredFreezeMs = parseInt(localStorage.getItem('rdp_freeze_timeout_ms') || '7200000', 10);
        const FREEZE_TIMEOUT = isNaN(configuredFreezeMs) ? 7200000 : Math.max(300000, configuredFreezeMs); // Mínimo 5 minutos
        const CHECK_INTERVAL = Math.max(15000, Math.min(300000, Math.floor(FREEZE_TIMEOUT / 12)));

        if (connectionState !== 'connected') return;

        // console.log('🛡️ Iniciando vigilante anti-congelación');

        // Intervalo y timeout dinámicos

        let watchdog = null;

        const checkForFreeze = () => {
            const now = Date.now();
            // ⚡ PERF: use ref (not state) - avoids stale closure issue and never schedules re-renders
            const timeSinceActivity = now - (lastActivityTimeRef.current || 0);

            if (timeSinceActivity > FREEZE_TIMEOUT && !freezeDetected && connectionState === 'connected') {
                console.warn('🚨 CONGRELACIÓN DETECTADA! Iniciando reconexión automática...');
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
                    setConnectionState('connecting');
                    setFreezeDetected(false);
                    lastActivityTimeRef.current = Date.now(); // reset idle counter via ref
                }, 2000);
            }
        };

        watchdog = setInterval(checkForFreeze, CHECK_INTERVAL);

        return () => {
            if (watchdog) {
                clearInterval(watchdog);
            }
        };
    }, [connectionState, freezeDetected]); // lastActivityTime removed - we read from ref now

    // 🔌 POWER MONITOR: Detectar reanudación del sistema (después de suspensión/pantallas apagadas)
    // WSL puede suspenderse cuando Windows entra en modo de ahorro de energía
    useEffect(() => {
        if (!window?.electron?.ipcRenderer) return;

        const handleSystemResume = (data) => {
            const duration = data?.suspendDuration || 0;
            const reason = data?.reason || 'system-resume';
            console.log(`☀️ [Guacamole ${tabId}] Reanudación detectada (${reason}) después de ${duration}s`);

            // Si la sesión estaba conectada, verificar si sigue viva
            if (connectionStateRef.current === 'connected') {
                const client = guacamoleClientRef.current;
                if (!client) return;

                // Verificar estado del cliente
                let clientState = null;
                try { clientState = client.currentState; } catch { }

                // Si el cliente está desconectado o en estado inválido, reconectar inmediatamente
                if (clientState === 4 || clientState === 0) { // DISCONNECTED o IDLE
                    console.warn(`⚠️ [Guacamole ${tabId}] Conexión perdida, reconectando...`);
                    try { client.disconnect(); } catch { }
                    setConnectionState('disconnected');
                    setFreezeDetected(false);
                    lastActivityTimeRef.current = Date.now();
                    return;
                }

                // Marcar tiempo antes del ping
                const pingTime = Date.now();

                // Enviar un ping para verificar que la conexión sigue viva
                console.log(`🔍 [Guacamole ${tabId}] Verificando conexión...`);
                try {
                    const disp = client.getDisplay?.();
                    const el = disp?.getElement?.();
                    const rect = el?.getBoundingClientRect?.();
                    const x = Math.max(1, Math.floor((rect?.width || 10) / 2));
                    const y = Math.max(1, Math.floor((rect?.height || 10) / 2));

                    // Enviar múltiples eventos para asegurar que se detecte actividad
                    client.sendMouseState?.({ x, y, left: false, middle: false, right: false });
                    client.sendMouseState?.({ x: x + 1, y, left: false, middle: false, right: false });

                    // También enviar tecla para más probabilidad de respuesta
                    const SHIFT = 0xffe1;
                    client.sendKeyEvent?.(1, SHIFT);
                    client.sendKeyEvent?.(0, SHIFT);
                } catch (e) {
                    console.warn(`⚠️ [Guacamole ${tabId}] Error enviando ping:`, e?.message);
                    try { client.disconnect(); } catch { }
                    setConnectionState('disconnected');
                    setFreezeDetected(false);
                    lastActivityTimeRef.current = Date.now();
                    return;
                }

                // Verificación rápida (3 segundos) para detectar conexiones muertas
                setTimeout(() => {
                    const timeSinceActivity = Date.now() - (lastActivityTimeRef.current || 0);
                    const timeSincePing = Date.now() - pingTime;

                    // Si lastActivity no se actualizó después del ping, la conexión está muerta
                    if (lastActivityTimeRef.current < pingTime && connectionStateRef.current === 'connected') {
                        console.warn(`🚨 [Guacamole ${tabId}] Sin respuesta en ${timeSincePing}ms, reconectando...`);
                        try { guacamoleClientRef.current?.disconnect(); } catch { }
                        setConnectionState('disconnected');
                        setFreezeDetected(false);
                        lastActivityTimeRef.current = Date.now();
                    } else if (connectionStateRef.current === 'connected') {
                        if (_rdpDebug()) console.log(`✅ [Guacamole ${tabId}] Conexión verificada OK`);
                    }
                }, 3000); // Reducido a 3 segundos
            }
        };

        const handleSystemSuspend = () => {
            console.log(`💤 [Guacamole ${tabId}] Sistema entrando en suspensión...`);
            // Marcar el tiempo de última actividad para detectar congelación después
            lastActivityTimeRef.current = Date.now();
        };

        // Escuchar eventos de suspensión/reanudación
        const unsubscribeResume = window.electron.ipcRenderer.on('system:resume', handleSystemResume);
        const unsubscribeSuspend = window.electron.ipcRenderer.on('system:suspend', handleSystemSuspend);

        return () => {
            if (typeof unsubscribeResume === 'function') unsubscribeResume();
            if (typeof unsubscribeSuspend === 'function') unsubscribeSuspend();
        };
    }, [tabId]);

    // 📡 MONITOR: Actualizar actividad cuando hay eventos del cliente
    useEffect(() => {
        const client = guacamoleClientRef.current;
        if (!client || connectionState !== 'connected') return;

        // ⚡ PERF: update only the ref, never React state, to avoid scheduling re-renders from server events
        const updateActivity = () => {
            lastActivityTimeRef.current = Date.now();
        };

        // Monitorear eventos que indican que la conexión está viva
        const originalOnSync = client.onsync;
        const originalOnSize = client.onsize;
        const originalOnStateChange = client.onstatechange;

        client.onsync = (...args) => {
            updateActivity();
            // Marcar que ya recibimos el primer sync tras conexión para permitir resizes no iniciales
            if (!syncReadyRef.current) {
                syncReadyRef.current = true;
            }
            if (originalOnSync) originalOnSync.apply(client, args);
        };

        client.onsize = (...args) => {
            updateActivity();
            // ACK de tamaño: liberar gate y permitir enviar pendiente
            awaitingSizeAckRef.current = false;
            sizeAckDeadlineRef.current = 0;
            try { resizeControllerRef.current && resizeControllerRef.current.handleAck(); } catch { }
            if (originalOnSize) originalOnSize.apply(client, args);
        };

        // También monitorear cambios de estado
        client.onstatechange = (...args) => {
            updateActivity();
            if (originalOnStateChange) originalOnStateChange.apply(client, args);
        };

        // Monitorear también eventos de teclado y ratón para detectar actividad del usuario
        if (client.onkeydown) {
            const originalOnKeyDown = client.onkeydown;
            client.onkeydown = (...args) => {
                updateActivity();
                if (originalOnKeyDown) originalOnKeyDown.apply(client, args);
            };
        }

        if (client.onmousedown) {
            const originalOnMouseDown = client.onmousedown;
            client.onmousedown = (...args) => {
                updateActivity();
                if (originalOnMouseDown) originalOnMouseDown.apply(client, args);
            };
        }

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
                                hasFatalErrorRef.current = false;
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
                                if (guacamoleClientRef.current) {
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
            className={isRdpSessionActive ? 'rdp-session-active' : ''}
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
