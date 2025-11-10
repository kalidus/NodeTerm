# 🔄 DIAGRAMAS DE FLUJO: Gestión de Memoria

## ESTADO ACTUAL vs PROPUESTO

### 1️⃣ FLUJO ACTUAL: Cargar Modelo Local

```
┌─────────────────────────────────────────────────────────┐
│ Usuario selecciona: "Llama 7B"                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ AIService.setModel('llama2', 'local')                   │
│ {                                                       │
│   this.currentModel = 'llama2'                          │
│   this.modelType = 'local'                              │
│ }                                                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
            ❌ NADA OCURRE ESPECIAL
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Usuario envía mensaje: "Hola, ¿cómo estás?"            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ AIService.sendToLocalModel(message)                     │
│   → sendToLocalModelStreaming()                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ fetch('http://localhost:11434/api/chat')               │
│ {                                                       │
│   model: 'llama2',                                      │
│   stream: true,                                         │
│   messages: [...]                                       │
│ }                                                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ ¿Está llama2 en RAM?             │
        └──────────────────────────────────┘
                   │              │
           SI ✅  │              │  NO ❌
                   │              │
                   ▼              ▼
          ┌────────────────┐  ┌──────────────────────┐
          │ RETORNA RÁPIDO │  │ CARGA DE DISCO A RAM │
          │ (~1s)          │  │ (45-60 segundos)     │
          └────────────────┘  │ ~4GB transferidos    │
                   │          │                      │
                   └────┬─────┘                      │
                        │◄─────────────────────────┘
                        │
                        ▼
        ┌──────────────────────────────────┐
        │ llama2 AHORA EN RAM               │
        │ 🔴 SE QUEDA AQUÍ INDEFINIDAMENTE │
        └──────────────────────────────────┘
                        │
                        ▼
        ┌──────────────────────────────────┐
        │ Usuario cambia a: "Mistral 7B"   │
        └──────────────────────────────────┘
                        │
                        ▼
        ┌──────────────────────────────────┐
        │ AIService.setModel('mistral',    │
        │   'local')                        │
        │                                  │
        │ 🔴 llama2 SIGUE EN RAM           │
        └──────────────────────────────────┘
                        │
                        ▼
        ┌──────────────────────────────────┐
        │ fetch('/api/chat')               │
        │ Mistral se carga                 │
        │                                  │
        │ 🔴 Ahora llama2 + mistral en RAM │
        │   = 8GB RAM ocupada              │
        └──────────────────────────────────┘
                        │
                        ▼
        ┌──────────────────────────────────┐
        │ ⚠️ SI TIENES MÁS CAMBIOS:        │
        │                                  │
        │ llama2 + mistral + neural-chat   │
        │ = 12GB RAM (llena toda la RAM)   │
        │                                  │
        │ SISTEMA SE RALENTIZA / CRASH ❌  │
        └──────────────────────────────────┘
```

---

### 2️⃣ FLUJO PROPUESTO: Cargar Modelo Local con Gestión

```
┌─────────────────────────────────────────────────────────┐
│ Usuario selecciona: "Mistral 7B"                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ AIService.setModel('mistral', 'local')                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
            ✅ AHORA OCURRE ALGO:
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ ModelMemoryService.getLoadedModels()                    │
│   fetch('/api/ps')                                      │
│   → { loaded: ['llama2:7b'], free: 2GB }                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Verificar límites:                                      │
│                                                         │
│ RAM disponible: 2GB                                     │
│ Modelo a cargar: 4GB                                    │
│                                                         │
│ ¿Cabe? NO (2GB < 4GB)                                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ ✅ SOLUCIÓN: Descargar modelo antiguo                   │
│                                                         │
│ ModelMemoryService.unloadModel('llama2')                │
│   fetch('/api/delete', {                                │
│     method: 'DELETE',                                   │
│     body: { name: 'llama2:7b' }                         │
│   })                                                    │
│                                                         │
│ 🧹 llama2 eliminado de RAM (2 segundos)                 │
│ 📊 RAM ahora: 6GB libre (6GB - 4GB = 2GB aún lib.)      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ Usuario envía mensaje             │
        └──────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ fetch('/api/chat')               │
        │ {                                │
        │   model: 'mistral',              │
        │   messages: [...]                │
        │   options: {                     │
        │     num_ctx: 6000,  ✅ Dinámico! │
        │     num_predict: 2000            │
        │   }                              │
        │ }                                │
        └──────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ 📍 Mistral cargado en RAM         │
        │ ✅ llama2 YA FUE LIBERADO        │
        │ 📊 RAM libre: 2GB (seguro)       │
        └──────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ Usuario cambia a: "Neural-Chat"  │
        └──────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ ✅ MISMO PROCESO:                │
        │    1. Detectar cargados          │
        │    2. Ver espacio libre          │
        │    3. Descargar si es necesario  │
        │    4. Cargar nuevo               │
        │    5. Optimizar contexto         │
        └──────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ ✅ RESULTADO:                    │
        │ • 1 modelo en RAM siempre        │
        │ • RAM estable (2-4GB libre)      │
        │ • Sin crashes 🎉                 │
        │ • Usuario ve todo en UI 👀       │
        └──────────────────────────────────┘
```

---

## 3️⃣ FLUJO DE DESCARGAR MODELO AUTOMÁTICO (LRU)

```
┌────────────────────────────────────────────────────┐
│ ModelMemoryService.startMonitoring()               │
│ Cada 30 segundos:                                  │
└─────────────────────┬────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ getLoadedModels()            │
        │ getSystemMemory()            │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌─────────────────────────────────────┐
        │ Modelos cargados:                   │
        │  1. llama2 (loaded 45min ago)       │
        │  2. mistral (loaded 5min ago)       │
        │  3. neural-chat (loaded 2min ago)   │
        │                                     │
        │ RAM total usado: 12GB                │
        │ Límite configurado: 10GB             │
        │ EXCESO: 2GB                         │
        └──────────────┬──────────────────────┘
                       │
                       ▼
        ┌─────────────────────────────────────┐
        │ ⚠️ ACTUAR: Liberar memoria          │
        │                                     │
        │ LRU: Less Recently Used              │
        │ Ordenar por timestamp               │
        └──────────────┬──────────────────────┘
                       │
                       ▼
        ┌─────────────────────────────────────┐
        │ Descargar en orden (hasta bajar):   │
        │                                     │
        │ 1. llama2 (más viejo) ← PRIMERO     │
        │    DELETE /api/delete               │
        │    ✅ Liberados: 4GB                │
        │                                     │
        │ ¿Suficiente? NO (aún 8GB > 10GB)   │
        │                                     │
        │ 2. mistral (viejo) ← SEGUNDO        │
        │    DELETE /api/delete               │
        │    ✅ Liberados: 4GB más            │
        │                                     │
        │ ¿Suficiente? SI (4GB < 10GB)        │
        │ ✅ PARAR                            │
        └──────────────┬──────────────────────┘
                       │
                       ▼
        ┌─────────────────────────────────────┐
        │ RESULTADO:                          │
        │ • Modelos en RAM: neural-chat       │
        │ • RAM usado: 4GB                    │
        │ • RAM libre: 12GB                   │
        │ • Sistema estable ✅                │
        │                                     │
        │ Todo automático, sin tocar UI 🤖   │
        └─────────────────────────────────────┘
```

---

## 4️⃣ INTEGRACIÓN EN AIChatPanel

```
┌──────────────────────────────────────────────┐
│ AIChatPanel                                  │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ ModelMemoryIndicator (NUEVO)           │ │
│  │  🧠 Modelos en RAM: 1                  │ │
│  │  📦 mistral:7b - 4.0GB [❌ Descargar]   │ │
│  │  💻 Sistema: 8GB/16GB [50%]            │ │
│  │  ⚙️ Límite: 12GB [Cambiar]              │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Chat Messages                          │ │
│  │ ┌──────────────────────────────────┐  │ │
│  │ │ Usuario: Hola, cómo estás?      │  │ │
│  │ └──────────────────────────────────┘  │ │
│  │ ┌──────────────────────────────────┐  │ │
│  │ │ IA: Hola! Estoy bien gracias... │  │ │
│  │ └──────────────────────────────────┘  │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Input + Send Button                    │ │
│  └────────────────────────────────────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 5️⃣ FLUJO DE CONTEXTO DINÁMICO

```
┌─────────────────────────────────────┐
│ Usuario envía mensaje               │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ AIService.sendToLocalModel()         │
│ before streaming                    │
└────────────┬────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ calcDynamicContext(systemFreeRAM)        │
│                                          │
│ Ej: systemFreeRAM = 2.5GB                │
│                                          │
│ if (systemFreeRAM < 2000MB)              │
│   → contextLimit = 1000 (muy bajo)       │
│                                          │
│ else if (systemFreeRAM < 4000MB)         │
│   → contextLimit = 4000 (bajo)           │
│                                          │
│ else if (systemFreeRAM < 8000MB)         │
│   → contextLimit = 6000 (normal)         │
│                                          │
│ else                                     │
│   → contextLimit = 8000 (óptimo)         │
│                                          │
│ RESULTADO: 4000 (adaptado al sistema)   │
└────────────┬──────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ Enviar a Ollama:                         │
│ {                                        │
│   options: {                             │
│     num_ctx: 4000,  ✅ Dinámico          │
│     num_predict: options.maxTokens       │
│   }                                      │
│ }                                        │
└────────────┬──────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ ✅ Resultado:                             │
│ • Contexto adaptado a disponibilidad     │
│ • Sin crashes                            │
│ • Sin lentitud                           │
│ • Óptimo rendimiento                     │
└──────────────────────────────────────────┘
```

---

## 6️⃣ ÁRBOL DE DECISIONES: Seleccionar Modelo

```
                    Usuario selecciona modelo
                              │
                              ▼
                    ¿Es modelo LOCAL?
                           /│\
                          / │ \
                        SI  │  NO → ✅ Cloud
                           │      (sin gestión RAM)
                           ▼
                  ModelMemoryService
                  .getLoadedModels()
                           │
                           ▼
                ┌──────────────────────┐
                │ Modelos cargados    │
                │ Espacio libre       │
                │ Límite configurado  │
                └──────────────────────┘
                           │
                           ▼
            ¿Cabe modelo sin descargar?
                       /    \
                      /      \
                    SÍ        NO
                     │         │
                     ▼         ▼
              ✅ Cargar    Descargar LRU
              directo     (más antiguo)
                           │
                           ▼
                    ¿Hay espacio ahora?
                        /      \
                       /        \
                      SÍ         NO
                      │           │
                      ▼           ▼
                ✅ Cargar    ❌ Error
                           (Insuficiente RAM)
                           (Sugerir laptop)
```

---

## 7️⃣ CICLO DE VIDA DE UN MODELO

```
┌──────────────────────────────────────────────┐
│ DESCARGADO EN OLLAMA (archivo en disco)      │
│ Estado: 🟡 Disponible pero no en RAM         │
│ RAM: 0MB                                     │
│                                              │
│ User clicks: "Usar llama2"                   │
└───────────────┬────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────┐
│ CARGANDO (transferencia desde disco)         │
│ Estado: 🟠 En proceso (45-60 segundos)       │
│ RAM: Creciente...                            │
│                                              │
│ Progress: ████░░░░░░ 45%                    │
└───────────────┬────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────┐
│ CARGADO EN RAM (listo para usar)             │
│ Estado: 🟢 En memoria                        │
│ RAM: 4GB (constante)                         │
│                                              │
│ // Puede estar aquí horas                    │
│ // hasta que se cambie o se libere           │
└───────────────┬────────────────────────────┘
          /     │     \
         /      │      \
        /       │       \
   Usuario   Timeout    Sistema sin
   cambia    (opcional) espacio
   modelo    4 horas       │
      │         │          │
      ▼         ▼          ▼
┌──────────────────────────────────────────────┐
│ DESCARGANDO (liberación de RAM)              │
│ Estado: 🟡 En proceso (2-5 segundos)         │
│ RAM: Creciente (temporal)                    │
│                                              │
│ Progress: ████████░░ 85%                    │
└───────────────┬────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────┐
│ DESCARGADO (archivo aún en disco)            │
│ Estado: 🟡 Disponible pero no en RAM         │
│ RAM: 0MB                                     │
│                                              │
│ Archivo sigue en disco, puede recargarse     │
└──────────────────────────────────────────────┘
```

---

## 📝 TABLA DE TRANSICIONES

| Estado Actual | Acción | Nuevo Estado | Tiempo | RAM |
|--------------|--------|-------------|--------|-----|
| Disponible | Click "Usar" | Cargando | 45-60s | 📈 |
| Cargando | En proceso | Cargado | - | 📈 |
| Cargado | Usuario activo | Cargado | ∞ | 🔒 |
| Cargado | Cambiar modelo | Descargando | 2-5s | 📉 |
| Cargado | Timeout (4h) | Descargando | 2-5s | 📉 |
| Cargado | RAM baja (LRU) | Descargando | 2-5s | 📉 |
| Descargando | En proceso | Disponible | - | 📉 |
| Disponible | Nada | Disponible | ∞ | 0MB |


