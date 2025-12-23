# 🔍 ANÁLISIS DE MEMORY LEAKS - NodeTerm

**Fecha de análisis:** $(date)  
**Versión analizada:** 1.6.1  
**Tipo:** Análisis estático (sin cambios)

---

## 📋 RESUMEN EJECUTIVO

Se han identificado **múltiples memory leaks** en diferentes categorías:

- **🔴 CRÍTICOS**: 3 `setInterval` globales que nunca se limpian
- **🟠 ALTOS**: Múltiples timers en componentes React sin cleanup
- **🟡 MEDIOS**: Event listeners que no se remueven correctamente
- **🟢 BAJOS**: Timers con cleanup pero con posibles problemas

---

## 🔴 MEMORY LEAKS CRÍTICOS (Main Process)

### 1. setInterval para limpieza de conexiones SSH (NUNCA se limpia)

**Ubicación:** `main.js:315`

```javascript
// ❌ NUNCA se limpia - se ejecuta indefinidamente
setInterval(() => {
  const activeKeys = new Set(Object.values(sshConnections).map(conn => conn.cacheKey));
  
  for (const [poolKey, poolConnection] of Object.entries(sshConnectionPool)) {
    if (!activeKeys.has(poolKey)) {
      // Limpiar conexiones SSH huérfanas
      const connectionAge = Date.now() - (poolConnection._lastUsed || poolConnection._createdAt || 0);
      if (connectionAge > 5 * 60 * 1000) {
        // ... código de limpieza
      }
    }
  }
}, 60000); // Cada 60 segundos
```

**Problema:**
- Se ejecuta cada 60 segundos indefinidamente
- No hay referencia guardada para limpiarlo
- No se limpia al cerrar la aplicación
- Se acumula en ejecuciones largas

**Impacto:** 🔴 **CRÍTICO** - Timer global que nunca se detiene

---

### 2. setInterval para cleanup de conexiones huérfanas (NUNCA se limpia)

**Ubicación:** `main.js:2832`

```javascript
// ❌ NUNCA se limpia - se ejecuta cada 10 minutos indefinidamente
setInterval(() => cleanupOrphanedConnections(sshConnectionPool, sshConnections), 10 * 60 * 1000);
```

**Problema:**
- Se ejecuta cada 10 minutos indefinidamente
- No hay referencia guardada
- No se limpia al cerrar la aplicación

**Impacto:** 🔴 **CRÍTICO** - Timer global que nunca se detiene

---

### 3. setInterval para watchdog de guacd (Múltiples instancias)

**Ubicación:** `main.js:479` (dentro de `initializeGuacamoleServices`)

```javascript
// ❌ Se crea un nuevo interval por cada conexión Guacamole
guacdClient.activityCheckInterval = setInterval(() => {
  try {
    if (Date.now() > (guacdClient.lastActivity + guacdInactivityTimeoutMs)) {
      guacdClient.close(new Error('guacd was inactive for too long'));
    }
  } catch (e) {
    // Si ocurre un error al cerrar, evitar que detenga el loop
  }
}, 1000);
```

**Problema:**
- Se crea un nuevo `setInterval` por cada conexión Guacamole
- Los intervalos anteriores no se limpian antes de crear nuevos
- Si se abren múltiples conexiones RDP, se acumulan múltiples timers

**Impacto:** 🔴 **CRÍTICO** - Acumulación de timers con múltiples conexiones

---

## 🟠 MEMORY LEAKS ALTOS (Componentes React)

### 4. setInterval en MCPClientService (sin cleanup)

**Ubicación:** `src/services/MCPClientService.js:62`

```javascript
this.refreshInterval = setInterval(() => {
  this.refreshAll().catch(error => {
    console.error('[MCP Client] Error en auto-refresh:', error);
  });
}, 30000); // Cada 30 segundos
```

**Problema:**
- No hay método `stop()` o `cleanup()` para limpiar el intervalo
- El servicio puede ser instanciado múltiples veces
- No se limpia cuando el servicio se destruye

**Impacto:** 🟠 **ALTO** - Timer en servicio que puede instanciarse múltiples veces

---

### 5. setInterval en SyncManager (sin cleanup adecuado)

**Ubicación:** `src/utils/SyncManager.js:94`

```javascript
this.autoSyncInterval = setInterval(() => {
  if (this.syncEnabled && !this.syncInProgress) {
    this.syncToCloud().catch(error => {
      console.error('Error en sincronización automática:', error);
    });
  }
}, intervalMs);
```

**Problema:**
- Aunque hay `stopAutoSync()`, el intervalo puede no limpiarse en todos los casos
- Si se llama `startAutoSync()` múltiples veces, se crean múltiples intervalos

**Impacto:** 🟠 **ALTO** - Posible acumulación si se reinicia múltiples veces

---

### 6. setInterval en NodeTermStatus (sin cleanup en useEffect)

**Ubicación:** `src/components/NodeTermStatus.js:80, 108`

```javascript
// ❌ No hay cleanup en el useEffect
useEffect(() => {
  // ... código ...
  intervalId = setInterval(fetchGuacd, 10000);
  // ... código ...
  const ollamaIntervalId = setInterval(fetchOllama, 10000);
  // ❌ NO HAY return () => { clearInterval(...) }
}, []);
```

**Problema:**
- Dos `setInterval` creados sin cleanup
- Se ejecutan indefinidamente aunque el componente se desmonte
- Variables `intervalId` y `ollamaIntervalId` no están en scope del cleanup

**Impacto:** 🟠 **ALTO** - Timers que continúan después de desmontar componente

---

### 7. setInterval en UpdateService (sin cleanup)

**Ubicación:** `src/main/services/UpdateService.js:328`

```javascript
this.checkInterval = setInterval(() => {
  this.checkForUpdates();
}, intervalMs);
```

**Problema:**
- No hay método para limpiar el intervalo
- El servicio puede vivir durante toda la vida de la aplicación
- Se acumula si se reinicia el servicio

**Impacto:** 🟠 **ALTO** - Timer en servicio de actualizaciones

---

### 8. setInterval en GuacamoleTerminal (watchdog sin cleanup completo)

**Ubicación:** `src/components/GuacamoleTerminal.js:1102, 1894`

```javascript
// Línea 1102 - keepAliveTimer
keepAliveTimerRef.current = setInterval(() => {
  // ... código keep-alive
}, 30000);

// Línea 1894 - watchdog anti-congelación
watchdog = setInterval(checkForFreeze, CHECK_INTERVAL);
```

**Problema:**
- `keepAliveTimerRef` se limpia en el cleanup (✅)
- `watchdog` se limpia en el cleanup (✅)
- PERO: Si hay errores durante la creación, los timers pueden quedar huérfanos
- Si el componente se desmonta durante la inicialización, los timers pueden no limpiarse

**Impacto:** 🟠 **ALTO** - Posible leak en casos de error o desmontaje prematuro

---

### 9. setInterval en App.js (con cleanup parcial)

**Ubicación:** `src/components/App.js:210`

```javascript
const interval = setInterval(() => {
  if (toast.current) {
    updateToast();
    clearInterval(interval);
  }
}, 100);

setTimeout(() => clearInterval(interval), 5000);
```

**Problema:**
- Tiene cleanup con `setTimeout`, pero si el componente se desmonta antes de 5 segundos, el intervalo puede quedar activo
- No hay cleanup en el `useEffect` return

**Impacto:** 🟠 **ALTO** - Posible leak si componente se desmonta rápidamente

---

### 10. setInterval en MainContentArea (sin cleanup)

**Ubicación:** `src/components/MainContentArea.js:247`

```javascript
const interval = setInterval(() => {
  const currentValue = localStorage.getItem('lock_home_button') === 'true';
  if (currentValue !== homeButtonLocked) {
    // ... actualizar estado
  }
}, 100);
```

**Problema:**
- No hay cleanup en el `useEffect`
- Se ejecuta cada 100ms indefinidamente
- Continúa después de desmontar el componente

**Impacto:** 🟠 **ALTO** - Timer de alta frecuencia sin cleanup

---

### 11. setInterval en QuickAccessSidebar (sin cleanup)

**Ubicación:** `src/components/QuickAccessSidebar.js:115`

```javascript
const interval = setInterval(() => {
  checkTransitionState();
}, 100);
```

**Problema:**
- No hay cleanup en el `useEffect`
- Se ejecuta cada 100ms indefinidamente
- Continúa después de desmontar el componente

**Impacto:** 🟠 **ALTO** - Timer de alta frecuencia sin cleanup

---

### 12. setInterval en ImportDialog (sin cleanup)

**Ubicación:** `src/components/ImportDialog.js:299`

```javascript
previewTimerRef.current = setInterval(run, Math.max(5000, Number(pollInterval) || 30000));
```

**Problema:**
- Usa `useRef` pero no hay cleanup en el `useEffect`
- Continúa después de desmontar el componente
- Se puede acumular si se abre/cierra el diálogo múltiples veces

**Impacto:** 🟠 **ALTO** - Timer en diálogo que puede abrirse múltiples veces

---

### 13. setTimeout recursivo en ModelMemoryService (sin cleanup)

**Ubicación:** `src/services/ModelMemoryService.js:411`

```javascript
setTimeout(monitor, this.checkInterval);
```

**Problema:**
- Es un setTimeout recursivo (se llama a sí mismo)
- No hay referencia guardada para cancelarlo
- No hay método `stop()` para detener el monitoreo
- Continúa indefinidamente aunque el servicio no se use

**Impacto:** 🟠 **ALTO** - Timer recursivo sin control

---

## 🟡 MEMORY LEAKS MEDIOS (Event Listeners)

### 14. Event Listeners en GuacamoleTerminal (múltiples sin cleanup completo)

**Ubicación:** `src/components/GuacamoleTerminal.js:1092, 1301-1303, 1835`

```javascript
// Línea 1092
window.addEventListener('beforeunload', handleBeforeUnload);

// Líneas 1301-1303
window.addEventListener('visibilitychange', onVisibilityChange);
window.addEventListener('focus', onFocus);
window.addEventListener('blur', onBlur);

// Línea 1835
window.addEventListener('resize', handleWindowResize);
```

**Problema:**
- Múltiples event listeners en `window`
- Algunos se limpian en el cleanup, pero no todos
- Si hay errores durante la inicialización, los listeners pueden quedar huérfanos
- `handleWindowResize` puede no limpiarse correctamente en todos los casos

**Impacto:** 🟡 **MEDIO** - Múltiples listeners globales

---

### 15. Event Listeners en AIChatPanel (múltiples sin cleanup completo)

**Ubicación:** `src/components/AIChatPanel.js:219, 315, 785-786, 881, 900-901, 926, 1002`

```javascript
window.addEventListener('conversation-updated', handleConversationUpdate);
window.addEventListener('theme-changed', onThemeChanged);
window.addEventListener('connections-updated', handleTreeUpdated);
window.addEventListener('sidebar-ssh-connections-updated', handleSidebarSSHUpdated);
window.addEventListener('passwords-updated', handlePasswordsUpdated);
window.addEventListener('load-conversation', handleLoadConversationEvent);
window.addEventListener('new-conversation', handleNewConversationEvent);
window.addEventListener('open-ai-config', handleOpenAIConfig);
window.addEventListener('keydown', handleKeyDown);
```

**Problema:**
- Muchos event listeners en `window`
- Algunos se limpian en cleanup, pero puede haber casos donde no se limpien todos
- Si el componente se desmonta durante una operación async, algunos listeners pueden quedar

**Impacto:** 🟡 **MEDIO** - Muchos listeners, posible cleanup incompleto

---

### 16. Event Listeners en App.js (sin cleanup completo)

**Ubicación:** `src/components/App.js:884, 898, 1546, 1575`

```javascript
window.addEventListener('storage', handleStorageChange);
window.addEventListener('localStorageChange', handleCustomStorageChange);
window.addEventListener('create-password-from-dialog', handler);
window.addEventListener('open-password-tab-in-dialog', handler);
```

**Problema:**
- Algunos tienen cleanup, otros no
- `handleStorageChange` y `handleCustomStorageChange` pueden no limpiarse en todos los casos
- Los handlers pueden cambiar en re-renders, dejando listeners antiguos

**Impacto:** 🟡 **MEDIO** - Listeners que pueden acumularse

---

### 17. Event Listeners en QuickAccessSidebar (sin cleanup)

**Ubicación:** `src/components/QuickAccessSidebar.js:60-61, 82, 96`

```javascript
window.addEventListener('resize', updatePosition);
window.addEventListener('scroll', updatePosition, true);
window.addEventListener('theme-changed', onThemeChanged);
```

**Problema:**
- No todos tienen cleanup en el `useEffect`
- `updatePosition` se ejecuta en cada resize/scroll
- Pueden acumularse si el componente se monta/desmonta múltiples veces

**Impacto:** 🟡 **MEDIO** - Listeners de eventos frecuentes sin cleanup

---

### 18. Event Listeners en ResizeController (sin cleanup)

**Ubicación:** `src/utils/ResizeController.js:62-64`

```javascript
document.addEventListener('mouseup', this._onMouseUp);
document.addEventListener('pointerup', this._onMouseUp);
document.addEventListener('touchend', this._onMouseUp, { passive: true });
```

**Problema:**
- Listeners en `document` global
- No hay método `destroy()` o `cleanup()` visible
- Si se crean múltiples instancias, se acumulan listeners

**Impacto:** 🟡 **MEDIO** - Listeners globales en utilidad reutilizable

---

## 🟢 PROBLEMAS MENORES (Con cleanup pero mejorables)

### 19. setTimeout en formDebugger (cleanup parcial)

**Ubicación:** `src/utils/formDebugger.js:47, 61`

```javascript
// Tiene cleanup ✅
debugIntervalRef.current = setInterval(checkFormHealth, 2000);

// Pero también crea otro intervalo dentro de checkFormHealth
debugIntervalRef.current = setInterval(() => {
  // ... código
}, 2000);
```

**Problema:**
- Tiene cleanup, pero puede crear múltiples intervalos si se llama `checkFormHealth` múltiples veces
- El segundo intervalo puede no limpiarse correctamente

**Impacto:** 🟢 **BAJO** - Cleanup existe pero puede mejorarse

---

### 20. ModelMemoryIndicator (cleanup correcto ✅)

**Ubicación:** `src/components/ModelMemoryIndicator.jsx:77`

```javascript
const interval = setInterval(updateStats, 10000);
return () => clearInterval(interval); // ✅ Tiene cleanup
```

**Estado:** ✅ **CORRECTO** - Tiene cleanup adecuado

---

## 📊 RESUMEN POR PRIORIDAD

| Prioridad | Cantidad | Tipo | Impacto |
|-----------|----------|------|---------|
| 🔴 CRÍTICO | 3 | setInterval globales | Timer que nunca se detiene |
| 🟠 ALTO | 10 | Timers sin cleanup | Acumulación en componentes |
| 🟡 MEDIO | 5 | Event listeners | Listeners huérfanos |
| 🟢 BAJO | 2 | Cleanup mejorable | Funciona pero puede optimizarse |

---

## 🎯 RECOMENDACIONES PRIORITARIAS

### Fase 1: Críticos (Inmediato)
1. ✅ Guardar referencias a los 3 `setInterval` globales en `main.js`
2. ✅ Limpiar todos los intervalos en `app.on('before-quit')`
3. ✅ Limpiar intervalos de guacd antes de crear nuevos

### Fase 2: Altos (Esta semana)
4. ✅ Agregar cleanup a todos los `useEffect` con `setInterval`
5. ✅ Agregar métodos `stop()`/`cleanup()` a servicios con timers
6. ✅ Usar `useRef` para guardar referencias de timers

### Fase 3: Medios (Próximas semanas)
7. ✅ Revisar y limpiar todos los event listeners
8. ✅ Usar `useEffect` cleanup para todos los listeners
9. ✅ Agregar métodos de destrucción a clases/utilities

---

## 📝 NOTAS ADICIONALES

- **Timers recursivos**: `ModelMemoryService` usa `setTimeout` recursivo sin control
- **Múltiples instancias**: Algunos servicios pueden instanciarse múltiples veces, acumulando timers
- **Cleanup condicional**: Algunos componentes tienen cleanup pero solo en ciertos casos
- **Event listeners globales**: Muchos listeners en `window` y `document` que pueden acumularse

---

**Nota:** Este análisis es estático. Se recomienda usar herramientas de profiling (Chrome DevTools Memory Profiler, Node.js `--inspect`) para confirmar estos leaks en tiempo de ejecución.




