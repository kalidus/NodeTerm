# 📊 ANÁLISIS PROFUNDO: Gestión de Memoria de Modelos de IA

## 🎯 RESUMEN EJECUTIVO

Actualmente el proyecto **NO tiene control activo de memoria** en modelos de IA. La gestión es **pasiva y desorganizada**:

- ✅ **Modelos Cloud**: No ocupan RAM local (se alojan en servidores remotos)
- ❌ **Modelos Locales (Ollama)**: Se cargan completamente en RAM y se quedan allí indefinidamente
- ❌ **No hay monitoreo**: No sabemos cuánta memoria usa cada modelo
- ❌ **No hay liberación**: Los modelos nunca se descargan de la memoria
- ❌ **No hay indicadores**: El usuario no sabe qué modelos están cargados

---

## 🔍 FLUJO ACTUAL DE GESTIÓN

### 1. CARGA DE MODELOS LOCALES (Ollama)

```
Usuario selecciona modelo local
        ↓
AIService.setModel(modelId, 'local')
        ↓
(No ocurre nada especial)
        ↓
Usuario envía mensaje
        ↓
AIService.sendToLocalModel()
        ↓
fetch(`http://localhost:11434/api/chat`)
        ↓
Ollama carga el modelo en RAM (si no está cargado)
        ↓
El modelo PERMANECE en memoria indefinidamente
```

**Problema**: Ollama carga automáticamente los modelos. Si cargaste `llama2` de 7B, `mistral` de 7B 
y `neural-chat` de 7B (21GB total), **todos se quedan en RAM**, consumiendo recursos.

---

### 2. API DE OLLAMA QUE USAMOS

**Endpoints actuales:**
```javascript
// ✅ Detectar modelos instalados
GET /api/tags
Response: { models: [{ name: 'llama2:7b', size: 3B, ... }, ...] }

// ✅ Chat con modelo (carga automática si no está)
POST /api/chat
Body: { model: 'llama2', messages: [...], stream: true, options: {...} }

// ❌ NUNCA USAMOS: Descargar modelo de memoria
DELETE /api/models/:name
```

---

### 3. FLUJO EN `AIService.sendToLocalModelStreaming()`

```javascript
// src/services/AIService.js (línea 4406)
async sendToLocalModelStreaming(modelId, messages, options) {
  const ollamaUrl = this.getOllamaUrl();
  
  const ollamaOptions = {
    temperature: options.temperature ?? 0.7,
    num_predict: options.maxTokens ?? 4000,
    num_ctx: options.contextLimit ?? 8000,
    top_k: options.top_k ?? 40,
    top_p: options.top_p ?? 0.9,
    repeat_penalty: options.repeat_penalty ?? 1.1
  };
  
  const requestBody = {
    model: modelId,
    messages: messages,
    stream: true,
    options: ollamaOptions  // 👈 Configuración para optimizar memoria
  };
  
  // Fetch a Ollama - Ollama carga el modelo si no está cargado
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: options.signal  // Para cancelación
  });
  
  // Streaming de respuesta (lectura en chunks)
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    // Procesar chunk...
    fullResponse += data.message.content;
  }
  
  reader.releaseLock();  // 👈 Liberar el reader (no la memoria del modelo)
  return fullResponse;
}
```

**Problema**: `reader.releaseLock()` solo libera el reader del stream, **NO la memoria del modelo**.

---

## 📈 PROBLEMAS ACTUALES

### Problema 1: Sin monitoreo de memoria
```
No sabemos cuánta RAM usa cada modelo:
┌─────────────────┬──────────┬─────────┐
│ Modelo          │ Parámetros│ RAM Est.│
├─────────────────┼──────────┼─────────┤
│ llama2:7b       │ 7B       │ 4GB     │
│ mistral:7b      │ 7B       │ 4GB     │
│ neural-chat:7b  │ 7B       │ 4GB     │
│ dolphin:7b      │ 7B       │ 4GB     │
│ TOTAL POSIBLE   │ 28B      │ 16GB    │
└─────────────────┴──────────┴─────────┘

Si todo está cargado: ¡16GB de RAM usado! 
El usuario no tiene idea.
```

### Problema 2: Sin control de descarga
```
No hay forma de liberar memoria:

Usuario cambia de modelo → Modelo anterior sigue en RAM
Aplicación cierra → Modelos se descargan (si SO libera memoria)
Usuario reinicia → Todos los modelos deben cargarse de nuevo
```

### Problema 3: Sin información en UI
```
El usuario no ve:
- Cuál es el modelo actual cargado
- Cuánta memoria usa
- Cuáles otros modelos están en memoria
- Cuánta RAM total está disponible
```

### Problema 4: Sin optimización de contexto
```
La configuración actual es hardcodeada:
num_ctx: 8000  // Contexto máximo (consume MÁS memoria)
num_predict: 4000  // Tokens máximos

En sistemas de bajo consumo, esto es excesivo.
No hay forma de ajustar según RAM disponible.
```

---

## 🔧 SOLUCIONES PROPUESTAS

### SOLUCIÓN 1: Servicio de Gestión de Memoria
```javascript
// NUEVO: src/services/ModelMemoryService.js

class ModelMemoryService {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434';
    this.loadedModels = new Map(); // { modelName: { size, memory, timestamp } }
    this.memoryLimit = 12000; // MB (ajustable por usuario)
    this.monitoringInterval = null;
  }
  
  // 1. Obtener info de memoria del sistema
  async getSystemMemory() {
    const os = require('os');
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    return {
      total: Math.round(totalMemory / 1024 / 1024), // MB
      free: Math.round(freeMemory / 1024 / 1024),
      used: Math.round((totalMemory - freeMemory) / 1024 / 1024),
      usagePercent: Math.round(((totalMemory - freeMemory) / totalMemory) * 100)
    };
  }
  
  // 2. Obtener modelos cargados en Ollama
  async getLoadedModels() {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/ps`);
      // ⚠️ Nota: /api/ps está disponible en Ollama v0.1.20+
      const data = await response.json();
      
      this.loadedModels.clear();
      for (const model of data.models) {
        this.loadedModels.set(model.name, {
          size: model.size,  // Tamaño total del modelo
          memory: model.memory,  // RAM usado aproximadamente
          timestamp: Date.now()
        });
      }
      
      return this.loadedModels;
    } catch (error) {
      console.warn('No se puede obtener modelos cargados:', error.message);
      return new Map();
    }
  }
  
  // 3. Descargar modelo de memoria (liberar RAM)
  async unloadModel(modelName) {
    try {
      const response = await fetch(
        `${this.ollamaUrl}/api/delete`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: modelName, delete_model: false })
          // delete_model: false = solo quitar de RAM, no borrar archivo
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      this.loadedModels.delete(modelName);
      console.log(`✅ Modelo ${modelName} descargado de RAM`);
      return true;
    } catch (error) {
      console.error(`❌ Error descargando ${modelName}:`, error);
      return false;
    }
  }
  
  // 4. Gestión automática de memoria (LRU - Least Recently Used)
  async enforceMemoryLimit() {
    const systemMem = await this.getSystemMemory();
    const usedByModels = Array.from(this.loadedModels.values())
      .reduce((sum, m) => sum + (m.memory || 0), 0);
    
    if (usedByModels > this.memoryLimit) {
      console.warn(`⚠️ Memoria excedida: ${usedByModels}MB > ${this.memoryLimit}MB`);
      
      // Ordenar por timestamp (más antiguos primero)
      const toUnload = Array.from(this.loadedModels.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, Math.ceil(this.loadedModels.size / 2)); // Descargar 50%
      
      for (const [modelName] of toUnload) {
        await this.unloadModel(modelName);
      }
    }
  }
  
  // 5. Obtener estadísticas detalladas
  getMemoryStats() {
    const models = Array.from(this.loadedModels.entries()).map(([name, info]) => ({
      name,
      sizeGB: (info.size / 1024 / 1024 / 1024).toFixed(2),
      memoryMB: info.memory,
      loadedSince: new Date(info.timestamp).toLocaleTimeString()
    }));
    
    const totalMemory = models.reduce((sum, m) => sum + m.memoryMB, 0);
    
    return { models, totalMemory };
  }
  
  // 6. Monitoreo continuo
  startMonitoring(intervalMs = 30000) {
    this.monitoringInterval = setInterval(async () => {
      await this.getLoadedModels();
      await this.enforceMemoryLimit();
    }, intervalMs);
    
    console.log('✅ Monitoreo de memoria iniciado');
  }
  
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⛔ Monitoreo de memoria detenido');
    }
  }
  
  // 7. Limpieza al cerrar
  async cleanup() {
    this.stopMonitoring();
    // Opcional: descargar todos los modelos
    // for (const modelName of this.loadedModels.keys()) {
    //   await this.unloadModel(modelName);
    // }
  }
}
```

---

### SOLUCIÓN 2: Integración en AIService

```javascript
// En src/services/AIService.js

class AIService {
  constructor() {
    // ...existing...
    this.memoryService = new ModelMemoryService();
  }
  
  // Al seleccionar modelo local
  setModel(modelId, modelType) {
    // ...existing...
    
    if (modelType === 'local') {
      // Mostrar información de memoria
      const stats = this.memoryService.getMemoryStats();
      console.log('Modelos en memoria:', stats);
    }
  }
  
  // Antes de usar modelo
  async sendToLocalModel(message, options = {}) {
    // Actualizar información de modelos cargados
    await this.memoryService.getLoadedModels();
    
    // Si estamos muy ajustados de memoria, descargar un modelo antiguo
    if (this.memoryService.getMemoryStats().totalMemory > 10000) {
      console.warn('Memoria alta, liberando modelo antiguo...');
      await this.memoryService.enforceMemoryLimit();
    }
    
    // Continuar con el envío normal...
    return await this.sendToLocalModelStreaming(...);
  }
  
  // Al cambiar de modelo
  async switchModel(newModelId, newModelType) {
    if (this.modelType === 'local' && newModelType === 'local') {
      // Opcional: descargar modelo anterior después de 1 minuto
      if (this.currentModel !== newModelId) {
        setTimeout(async () => {
          const confirmed = await userConfirm(
            `¿Descargar ${this.currentModel} para liberar ${getModelSize(this.currentModel)}MB?`
          );
          if (confirmed) {
            await this.memoryService.unloadModel(this.currentModel);
          }
        }, 60000);
      }
    }
    
    this.currentModel = newModelId;
    this.modelType = newModelType;
  }
}
```

---

### SOLUCIÓN 3: Indicador en UI

```javascript
// NUEVO: src/components/ModelMemoryIndicator.jsx

import React, { useState, useEffect } from 'react';

const ModelMemoryIndicator = () => {
  const [memoryStats, setMemoryStats] = useState(null);
  const [systemMem, setSystemMem] = useState(null);
  
  useEffect(() => {
    const updateMemory = async () => {
      const stats = memoryService.getMemoryStats();
      const system = await memoryService.getSystemMemory();
      
      setMemoryStats(stats);
      setSystemMem(system);
    };
    
    updateMemory();
    const interval = setInterval(updateMemory, 5000);
    return () => clearInterval(interval);
  }, []);
  
  if (!memoryStats) return null;
  
  const totalUsed = memoryStats.totalMemory;
  const systemUsagePercent = systemMem?.usagePercent || 0;
  
  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '8px',
      padding: '8px 12px',
      marginBottom: '12px',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      {/* Sistema */}
      <div style={{ marginBottom: '8px', color: '#888' }}>
        💻 Sistema: <strong>{systemMem?.used}MB / {systemMem?.total}MB</strong>
        <div style={{
          background: '#333',
          height: '4px',
          borderRadius: '2px',
          marginTop: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: systemUsagePercent > 80 ? '#ff6b6b' : '#4eccf0',
            height: '100%',
            width: `${systemUsagePercent}%`,
            transition: 'width 0.3s'
          }} />
        </div>
      </div>
      
      {/* Modelos */}
      {memoryStats.models.length > 0 && (
        <div style={{ color: '#4eccf0' }}>
          🧠 Modelos en RAM: <strong>{memoryStats.models.length}</strong>
          <div style={{ marginTop: '4px', paddingLeft: '12px' }}>
            {memoryStats.models.map(model => (
              <div key={model.name} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                borderBottom: '1px solid #333',
                fontSize: '11px'
              }}>
                <span>{model.name}</span>
                <span style={{ color: '#666' }}>
                  {model.sizeGB}GB ({model.memoryMB}MB)
                </span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #333',
            textAlign: 'right',
            color: '#ffd700',
            fontWeight: 'bold'
          }}>
            Total: {(totalUsed / 1024).toFixed(2)}GB
          </div>
        </div>
      )}
      
      {memoryStats.models.length === 0 && (
        <div style={{ color: '#666' }}>
          ✅ Sin modelos en memoria (listo para cargar)
        </div>
      )}
    </div>
  );
};

export default ModelMemoryIndicator;
```

---

### SOLUCIÓN 4: Configuración de Límites

```javascript
// Agregar a AIConfigDialog.js

const memoryLimitOptions = [
  { label: 'Bajo (2GB)', value: 2000, icon: '💾', desc: 'Ideal para laptops' },
  { label: 'Medio (6GB)', value: 6000, icon: '🖥️', desc: 'Desktop estándar' },
  { label: 'Alto (12GB)', value: 12000, icon: '🖥️🖥️', desc: 'Workstation' },
  { label: 'Muy Alto (24GB)', value: 24000, icon: '🔥', desc: 'Server' }
];

// En el diálogo de rendimiento:
<div style={{ marginBottom: '16px' }}>
  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
    🧠 Límite de Memoria para Modelos
  </label>
  
  {memoryLimitOptions.map(opt => (
    <button key={opt.value}
      onClick={() => {
        memoryService.memoryLimit = opt.value;
        aiService.saveConfig();
      }}
      style={{
        padding: '8px 12px',
        margin: '4px',
        background: memoryService.memoryLimit === opt.value 
          ? '#4eccf0' 
          : '#222',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      {opt.icon} {opt.label}
    </button>
  ))}
</div>
```

---

## 📊 IMPACTO ESPERADO

| Aspecto | Antes | Después |
|--------|-------|---------|
| **Monitoreo de memoria** | ❌ Nada | ✅ Automático cada 30s |
| **Control de modelos** | ❌ Manual/nunca | ✅ Automático (LRU) |
| **Visibilidad en UI** | ❌ No sabe nada | ✅ Widget en tiempo real |
| **Liberación de RAM** | ❌ Solo cierre app | ✅ A demanda o automática |
| **Optimización contexto** | ❌ Fijo (8000) | ✅ Dinámico según RAM |
| **Duración sesiones largas** | ❌ RAM se agota | ✅ Equilibrio dinámico |

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Servicio Base
1. Crear `ModelMemoryService.js`
2. Implementar `/api/ps` polling
3. Implementar `/api/delete` para descarga

### Fase 2: Integración
1. Integrar en `AIService.js`
2. Agregar monitoreo automático
3. Implementar LRU

### Fase 3: UI
1. Crear `ModelMemoryIndicator.jsx`
2. Integrar en `AIChatPanel.js`
3. Agregar configuración en `AIConfigDialog.js`

### Fase 4: Optimización
1. Contexto dinámico según RAM
2. Predicción de carga
3. Recomendaciones inteligentes

---

## ⚠️ NOTAS IMPORTANTES

1. **Ollama v0.1.20+**: `/api/ps` requiere versión reciente de Ollama
2. **No es destructivo**: Descarga de RAM, no borra archivos del modelo
3. **Fallback**: Si Ollama no soporta `/api/ps`, usar caché local
4. **Configuración**: Guardar límites de memoria en `config.json`
5. **Hotkeys**: Agregar Ctrl+M para ver estadísticas rápidas


