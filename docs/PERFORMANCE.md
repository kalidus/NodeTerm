# Optimización de Rendimiento y Gestión de Memoria

Este documento resume las directrices y arquitecturas de optimización aplicadas en NodeTerm para bajo consumo de RAM/CPU y fluidez en sesiones prolongadas (especialmente Linux/Wayland).

---

## 1. Gestión de Memoria en Terminales (XTerm.js)

### Scrollback
- El scrollback lo define la configuración de usuario (`getTerminalScrollback()`; default ~2 000 líneas).
- Al ocultar una pestaña se **desacopla el renderer GPU** (WebGL/Canvas dispose); el buffer de texto de xterm y el PTY/SSH en main siguen vivos.

### Renderers (WebGL vs Canvas vs DOM)
- Por defecto **WebGL**, con fallback automático a **Canvas** y luego DOM.
- Pestaña/pane inactivo: se suspende el addon GPU (no se mantiene un timer de 10 min; el desacople es al pasar a segundo plano).
- En splits hay un **presupuesto de paneles WebGL** (`MAX_WEBGL_PANES`: 4, o **2** en Linux con ≤8 GB RAM). El resto usa Canvas.
- Salida masiva: write-buffer con batching por `requestAnimationFrame` + backpressure SSH.

### Activación de pestaña
- Un solo `requestAnimationFrame`; retry (~80 ms) **solo** si el renderer se recreó, el contenedor aún no tiene tamaño o el geom cambió (`scheduleTerminalActivatePaint`).
- `fitStable() === false` por tamaño igual **no** fuerza retry (switch warm instantáneo).

---

## 2. Optimizaciones en React y Renderizado

- **Listas**: historial/cyber usa `VirtualScroller`; el árbol de conexiones poda nodos colapsados y pagina (“mostrar más”).
- **Memoización**: `React.memo` en cabeceras de pestaña y contenedores de terminal de alta frecuencia.
- **Fit / resize**: `createStableTerminalFit` + debounce/`rAF`; durante drag de splits se apaga blur (`nodeterm-ui-dragging`).
- **Lite-effects** (`data-ui-lite-effects`): apaga `backdrop-filter`, glow y `will-change` permanente de temas de tabs. En Linux está **ON por defecto** (el usuario puede desactivarlo).

### Hibernación de pestañas (MRU)
- Terminales **SSH simples** fuera del MRU se **desmontan en el renderer**; la sesión sigue viva en main (preserve + ring).
- MRU: activa + 3 (o +1 si low-RAM).
- **No hibernan** (esta versión): locales/docker (unmount mataría el PTY), splits, RDP, Guacamole, Home, explorers.
- Pestañas **montadas inactivas** mantienen WebGL/Canvas caliente (solo se pause el write-buffer); dispose GPU al unmount.

---

## 3. Backend (Electron / Main)

- Módulos pesados con `require()` diferido al primer IPC.
- Al cerrar pestaña: `pty.kill()` / `sshClient.end()` inmediato; barrido de workers huérfanos al arranque.
- IPC de stdout: batcher en main (ventana corta / tope de bytes).
- Heap V8 acotado según RAM del equipo (`--max-old-space-size`, override `NODETERM_MAX_OLD_SPACE_SIZE`).
- `BrowserWindow` principal: `paintWhenInitiallyHidden: true`, `show: false` hasta ready.

---

## 4. Particularidades por Sistema Operativo

### Windows
- ConPTY vs winpty según build; `DirectComposition` en flags GPU.
- RDP H.264 puede usar WebGPU cuando el entorno lo permite.

### macOS
- Listeners de focus en ventanas minimizadas para no seguir haciendo polling de terminales.

### Linux (Wayland / X11) — NVIDIA y AMD

Stack Chromium/Ozone en `main.js`:

| Pieza | Comportamiento |
|--------|----------------|
| Detección GPU | DRM: GPU con conector `connected` (`0x10de` NVIDIA, `0x1002` AMD, `0x8086` Intel). Override: `NODETERM_GPU=auto\|nvidia\|integrated`. |
| ANGLE | `use-angle=gl` (Desktop GL). Vulkan y WebGPU **desactivados** (conflicto con Ozone Wayland). |
| Explicit sync | `WaylandLinuxDrmSyncobj` + `WaylandSyncobjReleaseTimeline` en **AMD/Mesa e NVIDIA**. |
| NVIDIA display | PRIME env + `GBM_BACKEND=nvidia-drm`; log del render node DRM. |
| iGPU display (híbrido) | Limpia env NVIDIA heredado para no forzar offload. |
| Ozone | `ozone-platform-hint` = `NODETERM_OZONE_HINT` o `auto` (Wayland nativo si la sesión lo es). |
| IME | `disable-wayland-ime` (menos latencia de teclado en canvas). |
| UI | Lite-effects default ON; blur Home capped; polling de stats más lento. |
| GPU stats | Solo **sysfs/proc** (sin `nvidia-smi`/`rocm-smi` en el poll — pueden bloquear en D con NVIDIA+Wayland). |
| RDP present | Modo `direct` / `drawImage` (sin WebGPU). |
| Diagnóstico renderer | `window.electron.linuxPerf` → `{ isLowRam, displayGpu, ozoneHint }`. |

Variables útiles:

```bash
NODETERM_GPU=auto|nvidia|integrated
NODETERM_OZONE_HINT=auto|wayland|x11
NODETERM_DISABLE_GPU=true          # desactiva aceleración HW
NODETERM_MAX_OLD_SPACE_SIZE=2048   # MB heap V8
```

---

## 5. Criterios prácticos de suavidad

- Preferir lite-effects en Linux; no reactivar Vulkan/WebGPU bajo Wayland.
- Con muchas pestañas: confiar en hibernación MRU + presupuesto WebGL.
- Si NVIDIA+Wayland sigue irregular: probar `NODETERM_OZONE_HINT=wayland` explícito (drivers 555+/620+ con syncobj) o, como diagnóstico, `x11`.
- Telemetría GPU en status bar/Home puede mostrar nombre sin utilization/VRAM en NVIDIA híbrida apagada; eso es esperado sin `nvidia-smi`.
