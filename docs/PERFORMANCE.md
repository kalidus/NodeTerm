# Optimización de Rendimiento y Gestión de Memoria

Este documento resume las directrices y arquitecturas de optimización aplicadas en NodeTerm para garantizar bajo consumo de RAM y CPU en sesiones prolongadas.

---

## 1. Gestión de Memoria en Terminales (XTerm.js)

### Scrollback Dinámico
- **Límites Adaptativos**:
  - Pestañas en segundo plano / inactivas: scrollback acotado a 1.000 líneas.
  - Pestaña activa: hasta 5.000 - 10.000 líneas según configuración de usuario.
- **Limpieza de Buffers Ocultos**:
  - Al minimizar o cambiar de pestaña, se invoca `terminal.clear()` del renderizador visual manteniendo el buffer crudo mínimo en backend pty para evitar fugas de texturas WebGL/Canvas.

### Renderers (WebGL vs Canvas vs DOM)
- Por defecto se usa **WebGL** con fallback automático a **Canvas** si falla el contexto GPU.
- Si una pestaña permanece inactiva por más de 10 minutos, el addon WebGL se pausa o desacopla temporalmente liberando VRAM hasta que la pestaña vuelve a enfocarse.

---

## 2. Optimizaciones en React y Renderizado

- **Virtualización de Árboles y Listas**:
  - El panel lateral (conexiones, historial, grabaciones) utiliza renderizado virtualizado o carga paginada para listas de más de 100 elementos.
- **Memoización de Componentes**:
  - `React.memo` en `TabHeader`, terminal containers y elementos de alta frecuencia de eventos.
- **Debounce de Redibujado**:
  - Eventos de redimensión (`fitAddon.fit()`) agrupados con `requestAnimationFrame` o debounce de 50ms para evitar múltiples cálculos de geometría por frame.

---

## 3. Optimizaciones de Procesos en Backend (Electron / Main)

- **Handlers de Arranque Lazy**:
  - Los módulos pesados (KeePass, importadores de sesiones externas, crypto helpers avanzados) no se importan en el arranque principal; se cargan mediante `require()` diferido al invocarse su primer comando IPC.
- **Limpieza de Procesos Huérfanos**:
  - Al cerrar pestañas de terminales locales o SSH, el proceso PTY o socket SSH correspondiente es terminado inmediatamente (`pty.kill()`, `sshClient.end()`).
  - Verificación periódica al cierre de ventana para evitar procesos Node/PTY en segundo plano.

---

## 4. Particularidades por Sistema Operativo

- **Windows**:
  - Optimización de ConPTY vs winpty según la versión del build de Windows 10/11.
- **macOS**:
  - Desactivación de aceleraciones de GPU redundantes si se detecta perfil de ahorro de energía.
  - Corrección de listeners de focus en ventanas minimizadas de macOS para detener el polling de estado de terminales.

