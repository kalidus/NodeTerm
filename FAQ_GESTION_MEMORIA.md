# ❓ PREGUNTAS FRECUENTES: Gestión de Memoria IA

## GENERALES

### P1: ¿Por qué es importante gestionar la memoria de modelos locales?

**R:** Porque cada modelo ocupa 2-40GB de RAM, y el usuario típico tiene 8-16GB total. Sin gestión:
- Los modelos se quedan en RAM indefinidamente
- Cambiar de modelo no libera el anterior
- Se agotan rápidamente los recursos
- El sistema se ralentiza o crashea
- El usuario pierde productividad

### P2: ¿Los modelos Cloud (GPT, Claude) tienen este problema?

**R:** No. Los modelos Cloud se ejecutan en servidores remotos. No usan tu RAM local. Solo consumen:
- Ancho de banda (internet)
- CPU (procesamiento local mínimo)

Solo los modelos **locales** (Ollama) necesitan gestión de memoria.

### P3: ¿Qué pasa si no implemento esta solución?

**R:** 
- Los usuarios seguirán teniendo crashes
- Sesiones limitadas a 1-2 horas
- Soporte técnico con consultas constantes
- Comentarios negativos sobre estabilidad
- Algunos usuarios descartarán la app

---

## TÉCNICAS

### P4: ¿Cómo sé si Ollama está usando memoria?

**R:** Puedes verificar de varias formas:

```javascript
// Opción 1: Endpoint /api/ps (Ollama v0.1.20+)
fetch('http://localhost:11434/api/ps')
  .then(r => r.json())
  .then(data => console.log(data.models))
  // Retorna: modelos actualmente en RAM

// Opción 2: Monitor de sistema (Windows)
// Taskmgr.exe → Procesos → ollama (ver memoria)

// Opción 3: Comando (PowerShell)
Get-Process | Where-Object {$_.ProcessName -eq "ollama"} | Select-Object WorkingSet
```

### P5: ¿Cómo se descarga un modelo sin borrar el archivo?

**R:**
```javascript
// DELETE /api/delete con delete_model: false
fetch('http://localhost:11434/api/delete', {
  method: 'DELETE',
  body: JSON.stringify({
    name: 'llama2:7b',
    delete_model: false  // ← Importante
  })
});

// Resultado:
// ✅ Modelo liberado de RAM (2-5 segundos)
// ✅ Archivo sigue en disk (~4GB)
// ✅ Puede recargarse rápido después
```

### P6: ¿Puedo gestionar memoria de Ollama remoto?

**R:** Sí, pero con cuidados:

```javascript
// Remoto: http://192.168.1.5:11434
const ollamaUrl = 'http://192.168.1.5:11434';

// ⚠️ Consideraciones:
// 1. Ollama remoto debe tener /api/ps habilitado
// 2. Red debe ser confiable (no sobre internet)
// 3. Política de memoria en servidor remoto
// 4. Diferentes usuarios pueden interferir
```

### P7: ¿Qué es LRU y por qué es importante?

**R:** LRU = "Least Recently Used" (Menos recientemente usado)

```
Estrategia: Si RAM se agota, descargar el modelo 
que lleva más tiempo sin usar.

Ejemplo:
  Cargados: Llama (45 min sin usar), Mistral (5 min sin usar)
  RAM: 8GB / 10GB (sobre límite)
  
  Acción LRU: Descargar Llama (más viejo)
  Resultado: Liberados 4GB, dentro del límite ✅

Ventaja: No interrumpe trabajo actual
```

### P8: ¿Qué contexto dinámico es mejor?

**R:** Depende de tu RAM disponible:

```javascript
function calcOptimalContext(freeRAM_MB) {
  // Regla: contexto ≈ RAM libre / 2
  //        (deja margen para sistema operativo)
  
  if (freeRAM_MB < 1000)  return 1000;   // Crisis
  if (freeRAM_MB < 2000)  return 2000;   // Bajo
  if (freeRAM_MB < 4000)  return 4000;   // Normal
  if (freeRAM_MB < 8000)  return 6000;   // Bueno
  return 8000;                           // Óptimo
}

// Resultado: Modelo se adapta al harware disponible
```

### P9: ¿Cómo integro esto sin romper código existente?

**R:** Pasos seguros:

```javascript
// 1. Crear ModelMemoryService.js (independiente)
// 2. Agregar imports en AIService.js
// 3. Agregar métodos validateMemory, switchModel
// 4. Modificar sendToLocalModel() (compatible)
// 5. Crear UI component ModelMemoryIndicator (opcional)
// 6. Tests para verificar no hay regresión

// Resultado: Código existente sigue funcionando
//            Nueva funcionalidad activada gradualmente
```

### P10: ¿Qué pasa si /api/ps no está disponible?

**R:** Fallback automático:

```javascript
async getLoadedModels() {
  try {
    const response = await fetch(`${url}/api/ps`);
    if (!response.ok) throw new Error('Not available');
    // ... procesar /api/ps ...
  } catch (error) {
    console.warn('[ModelMemory] /api/ps no disponible');
    
    // Fallback 1: Usar caché local
    return this.loadedModels; // Info previa
    
    // Fallback 2: Estimar basado en última detección
    // Fallback 3: Mostrar advertencia al usuario
  }
}
```

---

## CONFIGURACIÓN

### P11: ¿Cuál es el límite de memoria ideal?

**R:** Depende del hardware:

| Hardware | Recomendación | Razón |
|----------|---------------|-------|
| Laptop 8GB | 2GB | Dejar margen para SO |
| Desktop 16GB | 6-8GB | Balance seguro |
| Workstation 32GB | 12-16GB | Más modelos |
| Server 64GB | 24GB | Máximo rendimiento |

**Fórmula**: Límite = (RAM total - 4GB) / 2

### P12: ¿Puedo cambiar el límite mientras usa un modelo?

**R:** Sí, es seguro:

```javascript
// Antes: Límite 6GB
modelMemoryService.setMemoryLimit(6000);

// Usuario está usando modelo...

// Cambio: Límite 12GB
modelMemoryService.setMemoryLimit(12000);
// ✅ Seguro: aplica en siguiente verificación

// Usuario cambia de modelo:
// ✅ Sistema respeta nuevo límite
```

### P13: ¿Qué ocurre si establezco un límite muy bajo?

**R:** 
```
Límite: 1GB

Escenario:
  ✅ Si modelo es 7B (4GB):
     No cabe → Se rechaza → Error amable
     
  ✅ Si modelo es 3B (2GB):
     Cabe parcialmente → Funciona pero inestable
     
  ✅ Si cambias modelo:
     Descarga anterior → Carga nuevo → OK

Recomendación: Límite mínimo = tamaño del modelo + 1GB
```

### P14: ¿Hay timeout para descargar modelos?

**R:** No por defecto, pero puede agregarse:

```javascript
// Opción: Descargar automático después de inactividad
async autoUnloadAfterTimeout(modelName, minutes) {
  setTimeout(async () => {
    const stats = this.getMemoryStats();
    const model = stats.models.find(m => m.name === modelName);
    
    if (model && model.minutesAgo > minutes) {
      console.log(`Auto-descargando ${modelName} por inactividad`);
      await this.unloadModel(modelName);
    }
  }, minutes * 60 * 1000);
}

// Uso: autoUnloadAfterTimeout('llama2', 120); // 2 horas
```

---

## UI/UX

### P15: ¿Dónde muestro el widget de memoria?

**R:** Opciones:

```
Opción A: Top del chat (recomendado)
┌─────────────────────────────┐
│ 🧠 Modelos: 1 | 4GB / 12GB  │ ← Widget
├─────────────────────────────┤
│ Chat messages...            │
└─────────────────────────────┘

Opción B: Sidebar derecha
┌──────────────┬──────────────┐
│              │ 🧠 Modelos   │
│              │ llama2: 4GB  │
│    Chat      │ [❌ Descarg] │
│              │              │
└──────────────┴──────────────┘

Opción C: Modal flotante (Ctrl+M)
┌─────────────────────────────┐
│ 💻 Sistema: 10GB / 16GB     │
│ 🧠 Modelos: 2               │
│  - llama2: 4GB              │
│  - mistral: 4GB             │
└─────────────────────────────┘

Recomendación: Opción A + Ctrl+M para expandido
```

### P16: ¿Cómo hago el widget atractivo visualmente?

**R:** Diseño recomendado:

```javascript
// Colores por estado
const colors = {
  ok: '#4eccf0',       // Azul (todo bien)
  warning: '#ffd700',  // Amarillo (precaución)
  danger: '#ff6b6b',   // Rojo (crítico)
  background: 'rgba(0, 0, 0, 0.2)'
};

// Elementos clave:
// 1. Barra de progreso (RAM uso)
// 2. Lista desplegable de modelos
// 3. Botón para descargar cada uno
// 4. Límite configurable
// 5. Actualización en tiempo real (cada 5s)

// Animaciones:
// • Fade in al cambiar modelos
// • Color warning cuando se acerca límite
// • Transición suave de barras de progreso
```

### P17: ¿Debo mostrar memoria en Bytes, MB o GB?

**R:** Usa el contexto:

```
SIEMPRE mostrar en la unidad más legible:

< 1GB:     Mostrar en MB
           "Modelo: 256MB" ✓
           "Modelo: 0.25GB" ✗

1-999GB:   Mostrar en GB
           "Modelo: 4.0GB" ✓
           "Modelo: 4096MB" ✗

Barra de RAM global: GB
"12.5GB / 16GB" ✓

Herramienta avanzada: Permitir toggle
MB ⟷ GB
```

### P18: ¿Debo permitir descargar el modelo actual?

**R:** Depende:

```
ANTES de descargar:
  ✅ Permitir (usuario sabe qué hace)
  ✅ Mostrar advertencia: "¿Descargar modelo en uso?"
  ✅ No permitir si hay query activa

DURANTE query activa:
  ❌ Deshabilitar botón
  ❌ Mostrar: "Esperando respuesta..."

DESPUÉS de respuesta:
  ✅ Permitir nuevamente
```

### P19: ¿Necesito confirmación para descargar?

**R:** Sí, pero con contexto:

```javascript
// Descarga automática LRU:
// ❌ No necesita confirmación (es automático)

// Descarga manual por usuario (botón):
// ✅ Sí necesita confirmación

const confirm = () => dialog({
  title: "Descargar modelo",
  message: "¿Liberar 4.0GB de RAM?",
  description: "Puedes recargarlo después",
  buttons: ["Descargar", "Cancelar"]
});

// Si es automático (LRU):
// Solo log, sin popup
console.log('[ModelMemory] Auto-descargando llama2 para espacio');
```

---

## RENDIMIENTO

### P20: ¿Cuánto overhead agrega el monitoreo?

**R:**
```
Impacto CPU (cada 30 segundos):
  getLoadedModels() → ~5-10ms (fetch API)
  getSystemMemory() → ~1ms (os.totalmem())
  enforceMemoryLimit() → ~2-5ms (lógica)
  ───────────────────────────────────
  Total: ~10-20ms cada 30 segundos

Porcentaje: 0.03-0.06% del tiempo total
Conclusión: Negligible ✅

Impacto RAM:
  ModelMemoryService: ~2MB
  Caché de modelos: ~1MB
  Total: ~3MB
  Conclusión: Insignificante ✅
```

### P21: ¿Cómo evito que el monitoreo interfiera con queries?

**R:**

```javascript
// Sistema de prioridades:

async sendToLocalModel() {
  // Alto: En progreso
  this.queryInProgress = true;
  
  // Pausa el monitoreo automático
  this.pauseMonitoring();
  
  try {
    // Ejecutar query...
    const response = await fetch('/api/chat');
  } finally {
    // Reanudar monitoreo
    this.resumeMonitoring();
    this.queryInProgress = false;
  }
}

// Resultado: Monitoreo respeta queries activas
```

### P22: ¿Descarga de modelo es muy lenta?

**R:** Típicamente 2-5 segundos:

```
Tiempo de descarga:
  ✅ 2-5 segundos: Normal
  ⚠️  5-10 segundos: Lento (verifica /api/delete)
  ❌ >10 segundos: Problema (posible timeout)

Si es lento:
  1. Verifica Ollama en segundo plano
  2. Aumenta timeout en fetch
  3. Verifica CPU/Disk disponible
  4. Considera menos modelos cargados
```

---

## TROUBLESHOOTING

### P23: ¿Qué pasa si /api/delete falla?

**R:**
```javascript
async unloadModel(modelName) {
  try {
    const response = await fetch('/api/delete', {
      method: 'DELETE',
      body: JSON.stringify({ name: modelName })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error descargando:', error);
    
    // Fallback:
    // 1. Log del error
    // 2. No descargar (conservador)
    // 3. Notificar al usuario
    // 4. Sugerir reinicio de Ollama
    
    return false;
  }
}
```

### P24: ¿Qué pasa si se agota la RAM durante una query?

**R:**
```
Escenario:
  1. User hace query
  2. Modelo comienza a generar respuesta
  3. Memoria crítica (< 500MB libre)
  
Acción:
  ✅ Sistema detecta (cada 30s)
  ✅ Descargar modelo antiguo (LRU)
  ✅ Si aun falta: Abortar query activa
  ✅ Mostrar error: "Memoria insuficiente"
  ✅ Sugerir: "Descarga otros modelos"

Código:
```

```javascript
if (freeRAM < 500) {
  // Crisis: descargar agresivamente
  await this.unloadMultiple(
    this.getMemoryStats().models.slice(0, -1) // Todos menos el actual
  );
  
  if (freeRAM < 500) {
    // Aun crítico: abortar query
    this.abortCurrentQuery();
    throw new Error('Memoria crítica: descargados modelos');
  }
}
```

### P25: ¿Los modelos quedan en el disco permanentemente?

**R:** Sí, con `delete_model: false`:

```javascript
// Opción A: Solo descargar de RAM (recomendado)
{ name: 'llama2', delete_model: false }
// Resultado: Modelo en disk (4GB), no en RAM

// Opción B: Borrar completamente
{ name: 'llama2', delete_model: true }
// Resultado: Archivo eliminado (~4GB recup.)

// Recomendación:
// - Por defecto: false (liberar RAM, mantener archivo)
// - Usuario decide: "Borrar modelo" (opción separada)
```

---

## CASOS ESPECIALES

### P26: ¿Qué pasa con modelos quantizados (Q4, Q5)?

**R:**
```
Modelos quantizados usan MENOS RAM:

Llama2 7B:
  Completo (fp16): 4GB
  Q8:              3.5GB
  Q5:              2.0GB ← Recomendado
  Q4:              1.5GB
  Q3:              1.0GB

Ventaja: Más modelos simultáneamente
Desventaja: Calidad ligeramente menor

Recomendación:
  - RAM < 8GB: Usar Q4 o Q5
  - RAM 8-16GB: Usar Q5 o Q8
  - RAM > 16GB: Usar completo o Q8
```

### P27: ¿Funcionan las sesiones multihilo?

**R:**
```javascript
// Problema: 2 usuarios simultáneamente con Ollama

User1: Carga llama2
       ├─ Ollama: llama2 en RAM (4GB)
       
User2: Intenta cargar mistral
       ├─ ¿Hay espacio? SÍ (5GB free)
       ├─ Ollama: llama2 + mistral (8GB)
       
Resultado: Funciona pero:
  ✅ RAM comparte (por eso Ollama es monousuario)
  ❌ Si uno cambia → afecta al otro
  
Recomendación:
  - Ollama es más estable single-user
  - Para multi-user: Ollama separado por usuario
  - O: Pool de Ollama (avanzado)
```

### P28: ¿Qué pasa si Ollama se reinicia?

**R:**
```javascript
// Si Ollama se reinicia (proceso muere):
// 1. /api/chat falla → Error al usuario
// 2. /api/ps retorna vacío → Widget se limpia
// 3. this.loadedModels se vacía

async handleOllamaRestart() {
  // Detectar: fetch('/api/ps') retorna error
  
  // Acción:
  this.loadedModels.clear();
  this.emit('ollamaDown');
  
  // UI:
  // Mostrar: "⚠️ Ollama desconectado"
  // Sugerir: "Reinicia Ollama"
  
  // Auto-recovery:
  // Reintentar cada 5 segundos hasta conectar
}
```

---

## PRÓXIMO PASO

### P29: ¿Qué debo hacer primero?

**R:** Plan de implementación:

```
FASE 1 (2 horas): Core
  1. Crear ModelMemoryService.js
  2. Implementar getSystemMemory()
  3. Implementar getLoadedModels()
  4. Implementar unloadModel()
  
FASE 2 (1 hora): Integración
  5. Agregar validateModelMemory() en AIService
  6. Integrar en sendToLocalModel()
  
FASE 3 (1 hora): UI
  7. Crear ModelMemoryIndicator.jsx
  8. Integrar en AIChatPanel
  
FASE 4 (1 hora): Polish
  9. Agregar configuración en AIConfigDialog
  10. Tests básicos
  
Total: 5-6 horas
Impacto: ✅ Massivo (eliminan crashes)
```

### P30: ¿Necesito permiso del usuario para hacer todo esto?

**R:**
```
✅ Automático (sin confirmación):
   - Monitoreo de memoria (passivo)
   - Contexto dinámico (transparente)
   - Descarga LRU (inteligente)
   
✅ Confirmación (según contexto):
   - Descarga manual (botón en UI)
   - Cambio de límite (settings)
   
❌ NO hacer sin avisar:
   - Cambiar modelo sin avisar
   - Abortar query activa
   - Borrar archivos de modelo

Recomendación:
  - Mostrar notificación: "Descargando llama2 para liberar RAM"
  - Pero no bloquear (no es crítico)
```

---

## CONCLUSIÓN

Esta gestión de memoria transforma la experiencia del usuario de **"app que se crashea"** a **"app estable y predecible"**.

**Tiempo de implementación**: 5-6 horas
**Valor agregado**: ∞ (elimina problema principal)
**Complejidad técnica**: Media (APIs bien documentadas)

¿Listo para empezar? 🚀


