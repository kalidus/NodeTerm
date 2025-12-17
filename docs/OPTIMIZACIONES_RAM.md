# Optimizaciones de RAM - NodeTerm

## Cambios Implementados

### 1. ✅ Scrollback Configurable (Impacto: ALTO)
**Antes:** `scrollback: 10000` líneas (hardcodeado)  
**Después:** `scrollback: 1000` líneas por defecto, **configurable desde Settings**  
**Ahorro estimado:** ~90% de memoria en buffers de terminal (con valor por defecto)

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
**Antes:** `setInterval(..., 5000)` - cada 5 segundos  
**Después:** `setInterval(..., 10000)` - cada 10 segundos  
**Ahorro:** Menos llamadas a `systeminformation`, menos CPU y menos objetos temporales en memoria

**Archivo modificado:**
- `src/components/SystemStats.js`

**Impacto:** Reduce la carga del sistema y la creación de objetos temporales para métricas.

---

## Cómo Probar las Optimizaciones

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

---

## Resultados Esperados

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

## Optimizaciones Futuras (Pendientes)

### 3. ⏳ WebGL Opcional
**Estado:** Pendiente  
**Impacto:** MEDIO  
**Descripción:** Hacer que el addon WebGL solo se cargue si está habilitado en configuración. WebGL consume memoria de GPU y RAM adicional.

**Implementación sugerida:**
- Añadir opción en Settings: "Usar renderer WebGL (mejor rendimiento, más RAM)"
- Cargar WebGL solo si está habilitado
- Fallback automático a canvas renderer

### 4. ⏳ Lazy Loading de Componentes
**Estado:** Pendiente  
**Impacto:** MEDIO  
**Descripción:** Cargar componentes pesados (HomeTab, AIChat, etc.) solo cuando se necesiten usando `React.lazy()`.

### 5. ⏳ Limpieza de Fuentes
**Estado:** Pendiente  
**Impacto:** BAJO-MEDIO  
**Descripción:** Eliminar fuentes `.woff2` no utilizadas. Actualmente hay 145 archivos de fuentes que se cargan en memoria.

---

## Notas Técnicas

- El `scrollback` de 1000 líneas por defecto sigue siendo suficiente para la mayoría de casos de uso
- **El scrollback es ahora completamente configurable** desde Settings → Terminal Settings → Historial
- Si necesitas más historial, puedes aumentarlo hasta 10000 líneas desde la configuración
- Los cambios en scrollback se aplicarán a los nuevos terminales (los existentes mantendrán su valor actual)
- El polling de 10 segundos sigue siendo lo suficientemente rápido para métricas en tiempo real
- Las optimizaciones son compatibles con todas las funcionalidades existentes

---

## Revertir Cambios

Si necesitas revertir alguna optimización:

1. **Scrollback:** Cambiar `scrollback: 1000` a `scrollback: 10000` en los archivos mencionados
2. **Polling:** Cambiar `10000` a `5000` en `SystemStats.js`

---

**Fecha de implementación:** 17 de diciembre de 2025  
**Versión:** v1.6.1
