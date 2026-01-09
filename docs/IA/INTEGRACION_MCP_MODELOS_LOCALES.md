# 🔧 Integración MCP con Modelos Locales - NodeTerm

## 📝 Resumen de Implementación

Se ha implementado la integración completa de MCP (Model Context Protocol) con modelos locales (Ollama, DeepSeek, Llama, etc.) usando el enfoque de **System Prompt** para modelos que no soportan function calling nativo.

---

## ✅ Cambios Implementados

### 1️⃣ **AIService.js** - Servicio Principal

#### **Método: `sendToLocalModelWithCallbacks` (Modificado)**
- ✅ **Inyección automática de MCP tools** en system prompt
- ✅ Control de activación/desactivación con `options.mcpEnabled`
- ✅ **Detección automática de tool calls** en respuestas del modelo
- ✅ **Loop de ejecución** automático si el modelo solicita herramientas

```javascript
// Línea 2599-2668
// Características:
- Obtiene tools disponibles via mcpClient.injectMCPContext()
- Inyecta tools en system message (al inicio o añade al existente)
- Detecta tool calls en la respuesta
- Ejecuta handleLocalToolCallLoop si se detecta tool call
```

#### **Método: `generateMCPSystemPrompt` (Mejorado)**
- ✅ **Formato detallado y profesional** para modelos locales
- ✅ Muestra nombre, servidor, descripción y parámetros de cada tool
- ✅ Instrucciones claras sobre cómo usar herramientas
- ✅ Formato JSON explícito con ejemplos

```javascript
// Línea 2008-2052
// Formato mejorado con separadores visuales y ejemplos claros
```

#### **Método: `detectToolCallInResponse` (Mejorado)**
- ✅ **2 estrategias de detección**:
  1. Bloques JSON con ````json`
  2. JSON directo sin backticks
- ✅ Manejo robusto de errores
- ✅ Logs informativos para debugging

```javascript
// Línea 2057-2101
// Soporta múltiples formatos de respuesta de modelos
```

#### **Método: `handleLocalToolCallLoop` (Nuevo)**
- ✅ **Loop completo de ejecución de tools**
- ✅ Máximo 5 iteraciones para prevenir bucles infinitos
- ✅ Manejo de errores con recuperación
- ✅ Callbacks de estado (tool-execution, tool-error)
- ✅ Formatea resultados para el modelo
- ✅ Soporta múltiples tool calls encadenados

```javascript
// Línea 2106-2253
// Características:
- Ejecuta tool via mcpClient.callTool()
- Formatea resultado con separadores visuales
- Continúa conversación con resultado
- Detecta nuevos tool calls en respuestas
- Maneja errores e informa al modelo
```

---

### 2️⃣ **MCPClientService.js** - Cliente MCP

#### **Método: `callTool` (Nuevo)**
- ✅ **Ejecuta tools MCP** via IPC
- ✅ Busca tool en cache para obtener serverId
- ✅ Verifica que el servidor esté activo
- ✅ Manejo completo de errores
- ✅ Notifica listeners con evento 'tool-called'

```javascript
// Línea 397-436
// Características:
- Validación de tool y servidor
- Ejecución via window.electron.mcp.callTool
- Logs detallados de debug
- Retorna resultado directo (no wrapped)
```

---

### 3️⃣ **AIChatPanel.js** - Interfaz de Usuario

#### **Estados Nuevos**
```javascript
// Línea 57
const [mcpToolsEnabled, setMcpToolsEnabled] = useState(true);
```

#### **Indicadores Visuales de Tool Execution**

**Icono y Color del Estado:**
- 🔧 **Icono**: `pi-wrench` (girando)
- 🟠 **Color**: Naranja (#ff9800)
- ❌ **Error**: Rojo con icono de advertencia

```javascript
// Línea 2066-2087
// Cambios dinámicos de color según estado:
- tool-execution: Naranja con sombra
- tool-error: Rojo con sombra
- Otros: Color del tema
```

**Texto del Estado:**
```javascript
// Línea 2105-2115
// Muestra:
"🔧 Ejecutando: nombre_herramienta (1/5)"
"❌ Error en: nombre_herramienta"
```

**Información Adicional:**
```javascript
// Línea 2150-2162
// Muestra número de parámetros:
"Con 3 parámetro(s)"
"Sin parámetros"
```

#### **Toggle MCP Tools**

**Botón en Header:**
- 🔧 **Icono**: Wrench (llave inglesa)
- 🟠 **Color activo**: Naranja
- ⚪ **Color inactivo**: Gris
- 📍 **Ubicación**: Entre "Nueva conversación" y "Abrir en pestaña"

```javascript
// Línea 1943-1970
// Características:
- Toggle visual claro
- Hover effects
- Tooltip informativo
- Persiste durante la sesión
```

**Integración con AIService:**
```javascript
// Línea 421-424
await aiService.sendMessageWithCallbacks(userMessage, callbacks, {
  signal: controller.signal,
  mcpEnabled: mcpToolsEnabled // Pasar estado
});
```

---

## 🎯 Compatibilidad de Modelos

### ✅ **Modelos Locales Soportados**

| Modelo | Método | Estado |
|--------|--------|--------|
| **Llama 3.1+** | System Prompt | ✅ Implementado |
| **DeepSeek R1** | System Prompt | ✅ Implementado |
| **Qwen** | System Prompt | ✅ Implementado |
| **Mistral** | System Prompt | ✅ Implementado |
| **Llama 3.2** | System Prompt | ✅ Implementado |
| **Otros Ollama** | System Prompt | ✅ Implementado |

### 📋 **Requisitos**
- ✅ Servidor MCP instalado y activo
- ✅ Tools disponibles en el servidor
- ✅ Modelo local descargado en Ollama
- ✅ MCP Tools activado en UI (botón 🔧)

---

## 🔄 Flujo de Ejecución

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario envía mensaje                                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. AIService obtiene tools MCP disponibles                 │
│    - mcpClient.injectMCPContext()                           │
│    - Retorna lista de tools con descripción y esquema      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Inyecta tools en system prompt                          │
│    - generateMCPSystemPrompt(tools)                         │
│    - Añade instrucciones de uso con formato JSON           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Envía mensajes a Ollama                                 │
│    - Incluye system message con tools                       │
│    - Incluye conversación e historial                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Modelo responde (texto o tool call)                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
         ┌────────┴────────┐
         │                 │
    Tool Call?         No Tool Call
         │                 │
         ▼                 ▼
┌─────────────────┐ ┌──────────────────┐
│ 6. Detecta JSON │ │ 7. Retorna texto │
│    tool call    │ │    al usuario    │
└────────┬────────┘ └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Ejecuta handleLocalToolCallLoop                         │
│    Loop hasta 5 iteraciones:                               │
│    a. Ejecuta tool via mcpClient.callTool()                │
│    b. Callback: status='tool-execution' (UI muestra 🔧)    │
│    c. Formatea resultado para el modelo                    │
│    d. Envía resultado al modelo                            │
│    e. Detecta nuevos tool calls en respuesta               │
│    f. Si hay más tool calls, repite desde (a)              │
│    g. Si no hay más, retorna respuesta final               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Muestra respuesta final al usuario                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Cómo Probar

### Paso 1: Verificar MCPs Instalados
```javascript
// En DevTools console:
await window.electron.mcp.listServers()
await window.electron.mcp.listTools()
```

### Paso 2: Asegurar MCP Activo
- Ir a Settings → Tab "MCP Manager"
- Verificar que hay al menos 1 servidor activo (verde)
- Ver que hay tools disponibles

### Paso 3: Activar Toggle MCP
- En header del chat, click en botón 🔧
- Debe estar naranja (activado)

### Paso 4: Seleccionar Modelo Local
- Dropdown de modelos → Seleccionar modelo local (ej: llama3.2)

### Paso 5: Enviar Prompt de Prueba
```
"Usa la herramienta X para hacer Y"
```

### Paso 6: Observar Estado
- Verás indicador 🔧 naranja: "Ejecutando: nombre_tool (1/5)"
- Logs en consola:
  ```
  🔌 [MCP] Inyectando N herramientas en system prompt
  🔍 [MCP] Tool call detectado en bloque JSON
  🔧 [MCP] Iteración 1/5 - Ejecutando: nombre_tool
  📡 [MCP] Llamando a mcpClient.callTool(...)
  ✅ [MCP] Resultado de nombre_tool: {...}
  🤖 [MCP] Enviando resultado al modelo para continuar...
  ✅ [MCP] Loop finalizado - respuesta final del modelo
  ```

---

## 🐛 Debugging

### Logs Importantes

**En AIService:**
```javascript
console.log('🔌 [MCP] Inyectando N herramientas en system prompt')
console.log('🔍 [MCP] Tool call detectado en bloque JSON')
console.log('🔧 [MCP] Iteración X/5 - Ejecutando: nombre')
console.log('✅ [MCP] Resultado de nombre: {...}')
console.log('❌ [MCP] Error ejecutando tool nombre: {...}')
```

**En MCPClientService:**
```javascript
console.log('🔧 [MCP Client] Llamando a tool: nombre')
console.log('   Servidor: serverId')
console.log('✅ [MCP Client] Tool nombre ejecutado correctamente')
```

### Problemas Comunes

#### ❌ "Tool no encontrado"
**Causa**: Tool no está en cache
**Solución**: 
- Refrescar MCP Manager
- Verificar que el servidor está activo

#### ❌ "Servidor no está activo"
**Causa**: MCP server no está corriendo
**Solución**:
- Ir a MCP Manager
- Toggle ON en el servidor
- Esperar estado "running"

#### ❌ Modelo no usa tools
**Causa**: Prompt no es claro o modelo no entiende formato
**Solución**:
- Usar prompts más explícitos: "Usa la herramienta X..."
- Probar con modelos más grandes (ej: llama3.1-70b)
- Verificar que MCP toggle esté ON (🔧 naranja)

#### ❌ Loop infinito
**Causa**: Modelo sigue pidiendo tools
**Solución**:
- Límite de 5 iteraciones previene esto
- Verás warning: "Límite de herramientas alcanzado"

---

## 📊 Métricas y Logs

### Información en Callbacks

**Estado: `tool-execution`**
```javascript
{
  status: 'tool-execution',
  message: '🔧 Ejecutando herramienta: nombre...',
  model: 'modelId',
  provider: 'local',
  toolName: 'nombre',
  toolArgs: { ... },
  iteration: 1,
  maxIterations: 5
}
```

**Estado: `tool-error`**
```javascript
{
  status: 'tool-error',
  message: 'Error en herramienta nombre: error message',
  model: 'modelId',
  provider: 'local',
  toolName: 'nombre',
  error: 'error message'
}
```

---

## 🚀 Próximos Pasos (Futuro)

### Modelos Remotos (OpenAI, Claude, Gemini)
- [ ] Implementar `convertMCPToolsToProviderFormat` completo
- [ ] Añadir `handleRemoteToolCallLoop` para function calling nativo
- [ ] Modificar `sendToRemoteModelWithCallbacks`

### Mejoras
- [ ] Cache de resultados de tools
- [ ] Timeout configurable para ejecución de tools
- [ ] Estadísticas de uso de tools
- [ ] Historial de tool calls

---

## 📝 Notas Técnicas

### Formato JSON Esperado del Modelo

```json
{
  "use_tool": "nombre_herramienta",
  "arguments": {
    "param1": "valor1",
    "param2": "valor2"
  }
}
```

### Formato de Resultado para el Modelo

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 RESULTADO DE HERRAMIENTA: nombre_herramienta
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{resultado en JSON o texto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usa este resultado para responder al usuario...
```

---

## ✅ Checklist de Implementación

- [x] Modificar sendToLocalModelWithCallbacks para inyectar MCP tools
- [x] Implementar handleLocalToolCallLoop para ejecutar tools
- [x] Mejorar detectToolCallInResponse para modelos locales
- [x] Añadir método callTool en MCPClientService
- [x] Añadir indicadores visuales en UI (🔧 tool-execution)
- [x] Añadir toggle en UI para activar/desactivar MCP tools
- [x] Documentación completa

---

## 🎉 ¡Implementación Completa!

La integración de MCP con modelos locales está **100% funcional** y lista para usar.

**Fecha**: 2025-01-04
**Versión**: 1.0.0

