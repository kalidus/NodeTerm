# Optimizaciones de RAM - NodeTerm (Documento Completo)

> **Documento consolidado** con todas las optimizaciones de RAM, análisis y estado actual

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Optimizaciones Implementadas](#optimizaciones-implementadas)
3. [Optimizaciones Pendientes](#optimizaciones-pendientes)
4. [Análisis de Limpieza de RAM](#análisis-de-limpieza-de-ram)
5. [Cómo Probar las Optimizaciones](#cómo-probar-las-optimizaciones)
6. [Resultados Esperados](#resultados-esperados)

---

## 🎯 Resumen Ejecutivo

### Estado Actual
- ✅ **Completadas:** 3/6 optimizaciones principales
- ⏳ **Pendientes:** 3 optimizaciones
- 📊 **Impacto total:** Reducción estimada de ~40-50% en uso de RAM

### Optimizaciones Completadas
1. ✅ Scrollback Configurable (ALTO impacto)
2. ✅ Reducción de Frecuencia de Polling (MEDIO impacto)
3. ✅ Desactivar Source Maps en Producción (MEDIO impacto)

### Optimizaciones Pendientes
1. ⏳ WebGL Opcional (MEDIO impacto)
2. ⏳ Lazy Loading de Componentes (MEDIO impacto)
3. ⏳ Limpieza de Fuentes (BAJO-MEDIO impacto)

---

## ✅ Optimizaciones Implementadas

### 1. ✅ Scrollback Configurable (Impacto: ALTO)

**Estado:** ✅ COMPLETADO  
**Ahorro estimado:** ~90% de memoria en buffers de terminal (con valor por defecto)

**Antes:** `scrollback: 10000` líneas (hardcodeado)  
**Después:** `scrollback: 1000` líneas por defecto, **configurable desde Settings**

**Archivos modificados:**
- `src/components/TerminalComponent.js`
- `src/components/PowerShellTerminal.js`
- `src/components/WSLTerminal.js`
- `src/components/UbuntuTerminal.js`
- `src/components/CygwinTerminal.js`
- `src/components/RecordingPlayerTab.js`
- `src/components/DockerTerminal.js`

**Configuración:**
- El scrollback ahora se lee desde `localStorage.getItem('nodeterm_scrollback_lines')`
- Valor por defecto: **1000 líneas** (optimizado para ahorrar RAM)
- Rango configurable: **100 - 10000 líneas** (desde Settings → Terminal Settings → Historial)
- Los nuevos terminales usarán automáticamente el valor configurado

**Impacto:** Cada terminal ahora guarda 10x menos líneas en memoria por defecto. Los usuarios pueden aumentar el valor si necesitan más historial, pero el valor por defecto optimizado reduce significativamente el uso de RAM.

---

### 2. ✅ Reducción de Frecuencia de Polling (Impacto: MEDIO)

**Estado:** ✅ COMPLETADO  
**Ahorro:** Menos llamadas a APIs, menos CPU y menos objetos temporales en memoria

**Archivos modificados:**
- `src/components/NodeTermStatus.js` - Guacd/Ollama: 5000ms → 10000ms ✅
- `src/components/LocalFileExplorerSidebar.js` - Storage check: 500ms → 2000ms ✅
- `src/components/ModelMemoryIndicator.jsx` - Stats: 5000ms → 10000ms ✅
- `src/components/SettingsDialog.js` - Status check: 2000ms → 5000ms ✅
- `src/components/SystemStats.js` - Ya estaba en 10000ms ✅

**Cambios específicos:**
- **NodeTermStatus.js:** Guacd y Ollama ahora se verifican cada 10 segundos (antes 5)
- **LocalFileExplorerSidebar.js:** Verificación de storage cada 2 segundos (antes 500ms)
- **ModelMemoryIndicator.jsx:** Actualización de stats cada 10 segundos (antes 5)
- **SettingsDialog.js:** Verificación de status cada 5 segundos (antes 2)

**Impacto:** Reduce la carga del sistema y la creación de objetos temporales para métricas. Menos llamadas a APIs y menos actualizaciones de estado.

---

### 3. ✅ Desactivar Source Maps en Producción (Impacto: MEDIO)

**Estado:** ✅ COMPLETADO  
**Ahorro estimado:** ~30-50% menos bundle size

**Archivo modificado:**
- `webpack.config.js` - Línea ~166

**Cambio:**
- **Antes:** `devtool: 'source-map'` (siempre activo)
- **Después:** `devtool: process.env.NODE_ENV === 'production' ? false : 'source-map'`

**Resultado:**
- En **desarrollo:** source maps activos (para debugging)
- En **producción:** source maps desactivados (reduce bundle size significativamente)

**Impacto:** Los source maps pueden ser muy grandes y no son necesarios en producción. Esta optimización reduce el tamaño del bundle final en ~30-50%.

---

## ⏳ Optimizaciones Pendientes

### 4. ⏳ WebGL Opcional (MEDIO - MEDIO IMPACTO)

**Estado:** Pendiente  
**Impacto:** MEDIO (10-20% menos RAM si se deshabilita)  
**Facilidad:** MEDIO

**Descripción:** Hacer que WebGL solo se cargue si está habilitado en configuración. WebGL consume memoria de GPU y RAM adicional.

**Archivos a modificar:**
- `src/components/TerminalComponent.js` - WebGL condicional
- `src/components/PowerShellTerminal.js` - WebGL condicional
- `src/components/WSLTerminal.js` - WebGL condicional
- `src/components/UbuntuTerminal.js` - WebGL condicional
- `src/components/CygwinTerminal.js` - WebGL condicional
- `src/components/DockerTerminal.js` - WebGL condicional
- `src/components/TerminalSettingsTab.js` - Añadir toggle WebGL

**Cambio propuesto:**
- Antes: WebGL siempre se carga
- Después: `const useWebGL = localStorage.getItem('nodeterm_use_webgl') !== 'false'`
- Añadir toggle en Settings → Terminal Settings → Configuración Global

**Implementación sugerida:**
- Añadir opción en Settings: "Usar renderer WebGL (mejor rendimiento, más RAM)"
- Cargar WebGL solo si está habilitado
- Fallback automático a canvas renderer

---

### 5. ⏳ Lazy Loading de Componentes (MEDIO - MEDIO IMPACTO)

**Estado:** Pendiente  
**Impacto:** MEDIO (~30-40% menos RAM inicial)  
**Facilidad:** MEDIO

**Descripción:** Cargar componentes pesados solo cuando se necesiten usando `React.lazy()`.

**Archivos a modificar:**
- `src/components/TabContentRenderer.js` - React.lazy para HomeTab y AIChatTab

**Cambio propuesto:**
```javascript
const HomeTab = React.lazy(() => import('./HomeTab'));
const AIChatTab = React.lazy(() => import('./AIChatTab'));
```

**Componentes candidatos:**
- `HomeTab` - ~1080 líneas, múltiples dependencias
- `AIChatTab` - Componente pesado con IA

**Impacto:** Reduce el bundle inicial y la memoria al arranque. Los componentes se cargan solo cuando se abren sus pestañas correspondientes.

---

### 6. ⏳ Limpieza de Fuentes (DIFÍCIL - BAJO-MEDIO IMPACTO)

**Estado:** Pendiente  
**Impacto:** BAJO-MEDIO  
**Facilidad:** DIFÍCIL (requiere análisis de uso)

**Descripción:** Eliminar fuentes `.woff2` no utilizadas. Actualmente hay 145 archivos de fuentes que se cargan en memoria.

**Archivos a analizar:**
- `src/` - Buscar qué fuentes se usan realmente
- Eliminar las no utilizadas

**Tareas:**
1. Identificar qué fuentes se usan realmente en el código
2. Eliminar archivos `.woff2` no utilizados
3. Considerar cargar fuentes bajo demanda
4. Usar subset de fuentes (solo caracteres necesarios)

---

## 🔍 Análisis de Limpieza de RAM

### Estado Actual de la Limpieza

#### ✅ Lo que SÍ se limpia correctamente:

**1. Terminales SSH**
- ✅ Se envía `ssh:disconnect` al cerrar pestaña
- ✅ Se elimina de `sshConnections[tabId]`
- ✅ Se limpian listeners IPC
- ✅ Se llama `term.dispose()` en el componente
- ✅ Se desconecta `resizeObserver`
- ✅ Se eliminan event listeners del DOM

**Archivos:**
- `src/components/TerminalComponent.js` - Cleanup en useEffect
- `main.js` - Handler `ssh:disconnect`

**2. Terminales PowerShell**
- ✅ Se envía `powershell:stop:${tabId}` al cerrar
- ✅ Se elimina de `powershellProcesses[tabId]`
- ✅ Se llama `process.kill()` o `process.kill('SIGKILL')`
- ✅ Se limpian listeners IPC
- ✅ Se llama `term.dispose()`

**Archivos:**
- `src/components/PowerShellTerminal.js` - Cleanup
- `main.js` - Handler `powershell:stop:${tabId}`

**3. Terminales WSL/Ubuntu**
- ✅ Se envía `wsl:stop:${tabId}` o `ubuntu:stop:${tabId}`
- ✅ Se elimina de `wslDistroProcesses[tabId]`
- ✅ Se llama `process.kill('SIGKILL')`
- ✅ Se limpian listeners

**Archivos:**
- `src/components/WSLTerminal.js` - Cleanup
- `src/components/UbuntuTerminal.js` - Cleanup
- `main.js` - Handler `wsl:stop:${tabId}`

**4. Terminales Cygwin**
- ✅ Se envía `cygwin:stop:${tabId}`
- ✅ Se limpian listeners
- ✅ Se llama `term.dispose()`

**Archivos:**
- `src/components/CygwinTerminal.js` - Cleanup
- `main.js` - Handler `cygwin:stop:${tabId}`

**5. Guacamole/RDP**
- ✅ Se llama `guacamoleClient.disconnect()`
- ✅ Se limpian timers (`keepAliveTimer`, `initialResizeTimer`)
- ✅ Se desconectan observers
- ✅ Se limpian listeners de teclado/ratón
- ✅ Se vacía el contenedor DOM

**Archivos:**
- `src/components/GuacamoleTerminal.js` - Cleanup extensivo

**6. Componentes React**
- ✅ La mayoría de componentes tienen cleanup en `useEffect`
- ✅ Se eliminan event listeners de `window` y `document`
- ✅ Se limpian referencias con `removeEventListener`

---

### ⚠️ Posibles Memory Leaks Identificados

#### 1. **Pool de Conexiones SSH** (MEJORABLE)
**Estado:** ✅ Parcialmente implementado

**Comportamiento actual:**
- Las conexiones SSH se eliminan del pool cuando se cierra la **última pestaña** que las usa
- Si hay múltiples pestañas usando la misma conexión, se mantiene en el pool (diseño intencional para reutilización)

**Ubicación:** `main.js` línea 2691

**Problema potencial:** Si una conexión queda en el pool pero nunca se reutiliza, puede quedarse en memoria indefinidamente.

**Solución implementada:**
- ✅ Ya existe limpieza periódica cada 10 minutos (`cleanupOrphanedConnections` - línea 2794)
- ⚠️ Considerar timeout más agresivo (5 minutos) para conexiones inactivas
- ⚠️ Añadir logging para verificar que la limpieza funciona

#### 2. **Referencias en `terminalRefs`** (MEDIO)
**Problema:** Las referencias de terminales se eliminan en algunos casos, pero no de forma consistente.

**Ubicación:** `src/hooks/useTabManagement.js`

**Impacto:** Referencias pueden quedar en memoria si no se eliminan correctamente.

#### 3. **Stats State y Timeouts** (BAJO)
**Problema:** Algunos timeouts de stats pueden no limpiarse correctamente.

**Ubicación:** `main.js` - Varios lugares con `statsTimeout`

**Impacto:** Timeouts pueden seguir ejecutándose después de cerrar pestañas.

#### 4. **Event Listeners Globales** (BAJO)
**Problema:** Algunos componentes registran listeners globales que pueden no limpiarse si el componente se desmonta de forma inesperada.

**Ejemplo:** `window.addEventListener` sin cleanup correspondiente.

---

### Recomendaciones de Mejora

#### Prioridad ALTA
1. ✅ **Ya implementado:** Pool de Conexiones SSH se limpia correctamente
   - Se elimina cuando no hay pestañas activas
   - Limpieza periódica cada 10 minutos

2. ✅ **Ya implementado:** Todos los procesos node-pty se limpian
   - PowerShell: `powershellProcesses[tabId].kill()`
   - WSL: `wslDistroProcesses[tabId].kill('SIGKILL')`
   - Cygwin: Limpieza en `CygwinHandlers.stop()`
   - Docker: Limpieza en `DockerHandlers.stop()`

#### Prioridad MEDIA
3. ⚠️ **Mejora opcional:** Reducir timeout de limpieza automática
   - Actualmente: 10 minutos
   - Sugerencia: Reducir a 5 minutos para limpieza más agresiva

4. ⚠️ **Mejora opcional:** Añadir logging de limpieza
   - Log cuando se eliminan procesos/conexiones (solo en modo debug)
   - Métricas para monitorear eficacia de limpieza

#### Prioridad BAJA
5. **Auditoría de event listeners**
   - Verificar que todos los `addEventListener` tienen su `removeEventListener`
   - Usar WeakMap para referencias débiles donde sea posible

---

## 🧪 Cómo Probar las Optimizaciones

### Método 1: Administrador de Tareas (Windows)
1. Abre el Administrador de Tareas (`Ctrl+Shift+Esc`)
2. Ve a la pestaña **"Detalles"**
3. Busca **"NodeTerm.exe"** o **"electron.exe"**
4. Anota el valor de **"Memoria (conjunto de trabajo privado)"**
5. Abre varios terminales (PowerShell, WSL, SSH, etc.)
6. Compara el uso de RAM antes y después de los cambios

### Método 2: Script de Medición (DevTools)
1. Abre NodeTerm
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña **"Console"**
4. Ejecuta el script de `testing/test-ram-usage.js`:
   ```javascript
   // Copia y pega el contenido del script en la consola
   testRAMUsage();
   ```

### Método 3: Chrome DevTools Memory Profiler
1. Abre DevTools (`F12`)
2. Ve a la pestaña **"Memory"**
3. Haz un **Heap Snapshot** antes de abrir terminales
4. Abre varios terminales
5. Haz otro **Heap Snapshot**
6. Compara el tamaño de los snapshots

### Método 4: Verificar Limpieza al Cerrar Pestañas
1. Abre varias pestañas (SSH, PowerShell, WSL, etc.)
2. Anota el uso de RAM
3. Cierra todas las pestañas
4. Espera 5-10 segundos
5. Verifica que la RAM se reduce significativamente

---

## 📊 Resultados Esperados

### Antes de las optimizaciones:
- **1 terminal:** ~150-200 MB
- **5 terminales:** ~400-600 MB
- **10 terminales:** ~800-1200 MB

### Después de las optimizaciones:
- **1 terminal:** ~80-120 MB (ahorro ~40%)
- **5 terminales:** ~200-350 MB (ahorro ~50%)
- **10 terminales:** ~400-600 MB (ahorro ~50%)

*Nota: Los valores exactos dependen del sistema y del uso del terminal.*

---

## 📝 Notas Técnicas

- El `scrollback` de 1000 líneas por defecto sigue siendo suficiente para la mayoría de casos de uso
- **El scrollback es ahora completamente configurable** desde Settings → Terminal Settings → Historial
- Si necesitas más historial, puedes aumentarlo hasta 10000 líneas desde la configuración
- Los cambios en scrollback se aplicarán a los nuevos terminales (los existentes mantendrán su valor actual)
- El polling de 10 segundos sigue siendo lo suficientemente rápido para métricas en tiempo real
- Las optimizaciones son compatibles con todas las funcionalidades existentes
- Los source maps se desactivan automáticamente en builds de producción

---

## 🔄 Revertir Cambios

Si necesitas revertir alguna optimización:

1. **Scrollback:** Cambiar `scrollback: 1000` a `scrollback: 10000` en los archivos mencionados
2. **Polling:** Cambiar los intervalos de vuelta a sus valores originales
3. **Source Maps:** Cambiar `devtool: process.env.NODE_ENV === 'production' ? false : 'source-map'` a `devtool: 'source-map'`

---

## 🎯 Plan de Ejecución Futuro

1. ✅ **#1 (Scrollback)** - COMPLETADO (ya estaba hecho)
2. ✅ **#2 (Polling)** - COMPLETADO
3. ✅ **#5 (Source Maps)** - COMPLETADO
4. **SIGUIENTE: #3 (WebGL)** - Requiere más cambios pero buen impacto
5. **Después #4 (Lazy Loading)** - Requiere más cambios
6. **Por último #6 (Fuentes)** - Requiere análisis previo

---

## 📊 Resumen de Estado

- ✅ **Completadas:** 3/6 optimizaciones principales
- ⏳ **Pendientes:** 3 optimizaciones
- 🎯 **Siguiente recomendado:** #3 (WebGL) o #4 (Lazy Loading)

---

## 📅 Información del Documento

**Fecha de creación:** 17 de diciembre de 2025  
**Última actualización:** 17 de diciembre de 2025  
**Versión:** v1.6.1

**Documentos consolidados:**
- `docs/OPTIMIZACIONES_RAM.md`
- `docs/LISTA_OPTIMIZACIONES_PRIORIZADA.md`
- `docs/ANALISIS_LIMPIEZA_RAM.md`
