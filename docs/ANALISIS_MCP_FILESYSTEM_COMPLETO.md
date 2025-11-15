# 📋 ANÁLISIS COMPLETO: MCP Filesystem con Modelos Locales - NodeTerm

**Fecha**: 2025-01-07  
**Objetivo**: Revisar cómo utilizamos MCP Filesystem con modelos locales y comparar con Cursor/otros clientes

---

## 📊 TABLA DE CONTENIDOS

1. [Estado Actual del Sistema](#estado-actual)
2. [Comparación con Cursor y Otros Clientes](#comparación)
3. [Puntos Fuertes de Nuestra Implementación](#puntos-fuertes)
4. [Problemas y Mejoras Necesarias](#problemas-mejoras)
5. [Evaluación de Modelos Locales](#modelos-locales)
6. [Información Enviada al Modelo - Análisis Detallado](#información-enviada)
7. [Recomendaciones y Plan de Acción](#recomendaciones)

---

## 🏗️ ESTADO ACTUAL DEL SISTEMA {#estado-actual}

### Arquitectura Actual

```
┌─────────────────────────────────────────────────────────────┐
│ Usuario escribe mensaje en chat                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ AIChatPanel.js → sendMessageWithCallbacks()                 │
│ (Conversación actual, historial)                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ AIService.sendToLocalModelWithCallbacks()                   │
│ - smartTokenBasedHistoryLimit() [Ventana deslizante]       │
│ - fileAnalysisService.buildEphemeralContext() [RAG]        │
│ - injectMCPContext() [Obtiene tools MCP]                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ generateMCPSystemPrompt()                                    │
│ - Formatea tools: write_file, edit_file, read_text_file    │
│ - Directorios permitidos                                     │
│ - Ejemplos JSON                                              │
│ - Instrucciones detalladas                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Mensaje enviado a Ollama/modelo local                        │
│ [System prompt] + [Contexto RAG] + [Historial] + [User msg] │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Respuesta del modelo                                         │
│ ├─ Opción A: Respuesta normal (texto)                        │
│ └─ Opción B: Tool call JSON                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ detectToolCallInResponse()                                   │
│ - Busca ```json{...}``` o JSON sin backticks               │
│ - Detecta formatos: use_tool, tool                          │
└────────────────┬────────────────────────────────────────────┘
                 │
       ┌─────────┴──────────┐
       │                    │
       ▼ Tool encontrado   ▼ No es tool call
    LOOP              Retorna respuesta
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ handleLocalToolCallLoop()                                    │
│ - Máximo 5 iteraciones                                       │
│ - MCPClientService.callTool() → Ejecuta tool               │
│ - Formatea resultado                                         │
│ - Retorna resultado al usuario                              │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Clave

**AIService.js (líneas 2840-2931)**
- `sendToLocalModelWithCallbacks()`: Orquesta todo el flujo
- `generateMCPSystemPrompt()` (líneas 2051-2081): Genera instrucciones
- `detectToolCallInResponse()` (líneas 2086-2153): Detección de tool calls
- `handleLocalToolCallLoop()` (líneas 2158-2317): Loop de ejecución

**MCPClientService.js**
- `injectMCPContext()`: Obtiene tools disponibles
- `callTool()`: Ejecuta tools via IPC
- Cache de tools, resources, prompts

---

## 🔄 COMPARACIÓN CON CURSOR Y OTROS CLIENTES {#comparación}

### Cursor (Codebase AI Assistant)

#### ✅ Cómo lo hace Cursor

```
1. INICIALIZACIÓN:
   - Carga MCP servers configurados en .cursor/settings
   - Establece conexiones JSON-RPC 2.0 con cada server
   - Inyecta directamente los schemas de tools en system prompt

2. SYSTEM PROMPT:
   - Define herramientas con JSON Schema completo
   - Incluye: nombre, descripción, parámetros, tipos, validación
   - Formato: MCP Tool Format (estandarizado)
   
3. TOOL EXECUTION:
   - Si detecta tool call: Ejecuta directamente
   - Devuelve resultado formateado
   - Re-inyecta resultado en conversación
   - Modelo puede decidir: "usar otra tool" o "responder"

4. INFORMACIÓN ENVIADA:
   - Schema JSON Schema 2020-12 completo
   - Ejemplos de uso
   - Restricciones y validaciones
   - Path permitidas (whitelist)
```

#### ❌ Limitaciones de Cursor

- Solo soporta modelos propios (Claude)
- No es abierto para terceros
- Requiere instalación de Cursor
- Integración cerrada sin opciones de personalización

### Claude Desktop (Anthropic)

#### ✅ Cómo lo hace Claude Desktop

```
1. MCP Protocol Nativo:
   - Soporta protocolo MCP 1.0 completo
   - Function calling nativo en Claude 3.5 Sonnet
   - No necesita system prompt workarounds

2. TOOL DESCRIPTION:
   - Usa Anthropic Tool Use Format
   - Incluye: {name, description, input_schema}
   - input_schema es JSON Schema completo

3. EXECUTION:
   - Modelo genera tool call
   - Sistema ejecuta automáticamente
   - Resultado se vuelve a inyectar
   - Loop hasta que modelo diga "done"

4. VENTAJA CLAVE:
   - Function calling es nativo, no por system prompt
   - Modelo entiende mejor cuándo NO usar tools
```

### OpenAI Assistants API

#### ✅ Cómo lo hace OpenAI

```
1. FUNCTION CALLING NATIVO:
   - Define functions con JSON Schema
   - Modelo elige automáticamente cuándo llamar

2. FORMAT:
   {
     "type": "function",
     "function": {
       "name": "read_file",
       "description": "Leer archivo",
       "parameters": {
         "type": "object",
         "properties": {...},
         "required": [...]
       }
     }
   }

3. WORKFLOW:
   - API maneja toda la orquestación
   - Modelo genera tool_calls
   - Sistema ejecuta automáticamente
   - Loop transparente
```

### 🔍 Comparación: NodeTerm vs Otros

| Característica | **NodeTerm** | **Cursor** | **Claude Desktop** | **OpenAI** |
|---|---|---|---|---|
| **Protocolo** | MCP (Sistema Prompt) | MCP (Propietario) | MCP 1.0 Nativo | OpenAI Format |
| **Modelos** | Cualquiera (Ollama) | Solo Claude | Claude 3.5+ | GPT-4, GPT-3.5 |
| **Function Calling** | Emulado (JSON) | Nativo | Nativo | Nativo |
| **Detección Tools** | Regex + JSON parsing | Automático | Automático | Automático |
| **Schema Completo** | Parcial | Completo | Completo | Completo |
| **Loop Automático** | Manual (5 iter max) | Automático | Automático | Automático |
| **Información Enviada** | Básica | Completa | Completa | Completa |

---

## ✅ PUNTOS FUERTES DE NUESTRA IMPLEMENTACIÓN {#puntos-fuertes}

### 1. **Flexibilidad con Modelos Locales**
- ✅ Funciona con CUALQUIER modelo local (Llama, Qwen, DeepSeek, Mistral, etc.)
- ✅ No dependencia de API externa
- ✅ Privacidad total - datos nunca salen de la máquina
- ✅ Bajo costo operativo

### 2. **Arquitectura Limpia**
- ✅ Separación clara de responsabilidades (AIService, MCPClientService, IPC handlers)
- ✅ IPC protocol bien estructurado
- ✅ Callbacks para monitoreo en tiempo real

### 3. **Manejo de Errores Robusto**
- ✅ Try-catch en múltiples niveles
- ✅ Recuperación en caso de fallo
- ✅ Logs informativos para debugging
- ✅ Fallback a respuesta de error
- ✅ Límite de iteraciones (previene bucles infinitos)

### 4. **Optimización de Tokens**
- ✅ smartTokenBasedHistoryLimit() - Ventana deslizante inteligente
- ✅ Reduce maxTokens si hay herramientas (800 vs 2000)
- ✅ Caché de directorios permitidos (5 minutos)
- ✅ Contexto efímero RAG limitado

### 5. **Control Granular**
- ✅ Activar/desactivar MCP via `options.mcpEnabled`
- ✅ Configuración de temperatura, top_k, top_p
- ✅ Control de iteraciones máximas
- ✅ Callback de estado detallado

### 6. **Formato System Prompt Clara**
- ✅ Ejemplo explícito del formato JSON esperado
- ✅ Enumera cuándo usar cada herramienta
- ✅ Especifica directorios permitidos
- ✅ Advertencia CRÍTICA sobre edit_file vs write_file

---

## ⚠️ PROBLEMAS Y MEJORAS NECESARIAS {#problemas-mejoras}

### 🔴 PROBLEMA 1: System Prompt NO Incluye JSON Schema Completo

**Estado Actual (líneas 2057-2081):**
```javascript
return `
Herramientas disponibles:
• write_file - Crear archivo NUEVO o SOBRESCRIBIR completamente uno existente
• edit_file - MODIFICAR parte de un archivo existente (reemplazar texto específico)
• read_text_file - Leer contenido
• list_directory - Listar archivos/carpetas

FORMATO: {"tool":"nombre","arguments":{...}}

EJEMPLOS:
• Crear: {"tool":"write_file","arguments":{"path":"...","content":"..."}}
• Editar: {"tool":"edit_file","arguments":{"path":"...","edits":[...]}}
• Leer: {"tool":"read_text_file","arguments":{"path":"..."}}
• Listar: {"tool":"list_directory","arguments":{"path":"..."}}
`;
```

**❌ Lo que falta:**
- ❌ NO incluye tipos de parámetros (string, number, array, object)
- ❌ NO indica parámetros requeridos vs opcionales
- ❌ NO describe formato de `edits` en edit_file
- ❌ NO valida ruta absoluta vs relativa
- ❌ NO describe qué retorna cada tool
- ❌ NO incluye límites (tamaño máximo de archivo, etc.)
- ❌ NO describe manejo de errores posibles
- ❌ Demasiado simple comparado con OpenAI/Cursor

**✅ Cómo lo hace Cursor/OpenAI:**
```json
{
  "type": "function",
  "function": {
    "name": "write_file",
    "description": "Crear o sobrescribir un archivo. Especifica el path completo y contenido.",
    "parameters": {
      "type": "object",
      "properties": {
        "path": {
          "type": "string",
          "description": "Path absoluto del archivo a crear/modificar"
        },
        "content": {
          "type": "string",
          "description": "Contenido completo del archivo"
        }
      },
      "required": ["path", "content"]
    }
  }
}
```

### 🔴 PROBLEMA 2: NO Se Envía Información Contextual Completa

**Lo que actualmente se envía:**
1. System prompt con 4 herramientas
2. Directorios permitidos (1 sola línea)
3. Historial de conversación (limitado por tokens)
4. Contexto RAG de archivos (si hay)

**Lo que FALTA (comparado con Cursor):**
- ❌ Descripción extendida de cada tool
- ❌ Ejemplos reales de parámetros
- ❌ Restricciones y limitaciones
- ❌ Información sobre el servidor (versión, capacidades)
- ❌ Listado actual de directorios disponibles
- ❌ Listado de archivos recientes editados
- ❌ Metadata de archivos (tamaño, tipo, permisos)
- ❌ Validaciones recomendadas

### 🔴 PROBLEMA 3: Detección de Tool Calls Es Frágil

**Estado Actual (líneas 2086-2153):**
```javascript
// Estrategia 1: Bloques JSON con backticks
const jsonBlockRegex = /```(?:json|tool|tool_call)?\s*([\s\S]*?)```/gi;

// Estrategia 2: JSON sin backticks
const jsonRegex = /^\s*(\{[\s\S]*?\})\s*$/m;
```

**❌ Problemas:**
- ❌ Solo detecta si TODA la respuesta es JSON
- ❌ Modelos frecuentemente PREAMBULO + JSON
- ❌ No maneja múltiples tool calls en una respuesta
- ❌ Regex no es robusto para JSON anidado complejo
- ❌ NO detecta si JSON está en medio de texto

**Ejemplo que FALLA:**
```
"Voy a crear el archivo para ti:
{"tool": "write_file", "arguments": {...}}
¿Necesitas algo más?"
```
↑ Esto NO se detecta como tool call porque hay texto alrededor

### 🔴 PROBLEMA 4: Loop de Herramientas Es Muy Limitado

**Estado Actual:**
- Máximo 5 iteraciones
- Si el modelo pide 6ta tool, se devuelve error
- NO re-inyecta resultado en conversación
- NO permite al modelo refinarse

**Comparado con Cursor/Claude:**
- Permite múltiples tools (sin límite arbitrario)
- Re-inyecta resultado
- Modelo ve contexto completo
- Puede usar info de un tool para el siguiente

### 🔴 PROBLEMA 5: NO Captura Schemas de Tools Reales

**Estado Actual:**
- System prompt hardcodeado con 4 herramientas
- NO obtiene los schemas reales de MCP
- NO incluye tools adicionales (si existen)
- NO se actualiza si tools cambian

```javascript
// LÍNEA 2051 - generateMCPSystemPrompt recibe tools como parámetro
// PERO NO los usa para generar schema
generateMCPSystemPrompt(tools, allowedDirsText = null) {
  // tools contiene toda la información
  // pero ignoramos tools.inputSchema
  // hardcodeamos solo 4 herramientas
}
```

### 🔴 PROBLEMA 6: Modelos Locales No Optimizados para MCP

**Consideraciones:**
- La mayoría de modelos locales NO fueron entrenados con MCP
- No entienden JSON Schema nativo
- Requieren prompts MUCHO más explícitos
- Pequeños modelos (7B) tienen dificultad
- Modelos "instruct" funcionan mejor

---

## 🤖 EVALUACIÓN DE MODELOS LOCALES {#modelos-locales}

### Matriz de Compatibilidad con MCP Filesystem

| Modelo | Tamaño | RAM | MCP Score | Notas |
|--------|--------|-----|-----------|-------|
| **Llama 3.1** | 8B | 8GB | ⭐⭐⭐⭐ | Excelente, bien entrenado |
| **Llama 3.1** | 70B | 48GB | ⭐⭐⭐⭐⭐ | Mejor en clase |
| **Qwen 2.5** | 7B | 8GB | ⭐⭐⭐⭐ | Bueno para JSON |
| **Qwen 2.5** | 32B | 24GB | ⭐⭐⭐⭐⭐ | Excelente para tools |
| **DeepSeek** | 7B | 8GB | ⭐⭐⭐ | Capaz pero más lento |
| **DeepSeek** | 33B | 24GB | ⭐⭐⭐⭐ | Bueno para razonamiento |
| **Mistral** | 7B | 8GB | ⭐⭐⭐ | No muy preciso con JSON |
| **Mistral Large** | 123B | 80GB | ⭐⭐⭐⭐⭐ | Excelente, muy preciso |
| **Grok** | 314B | 200GB | ⭐⭐⭐⭐⭐ | Máxima precisión, overkill |
| **OpenHermes** | 7B | 8GB | ⭐⭐ | Débil con formato JSON |
| **Phi 3** | 3.8B | 8GB | ⭐⭐ | Muy pequeño para MCP |
| **Zephyr** | 7B | 8GB | ⭐⭐⭐ | Decente, algo inconsistente |

### 🏆 RECOMENDACIONES POR CASO DE USO

#### 1️⃣ **Mejor Relación Calidad/Costo** (RECOMENDADO)
```
✅ Llama 3.1 8B (8GB RAM)
   - Excelente comprensión de JSON
   - Entiende MCP bien
   - Rápido, 8GB RAM accesible
   - MEJOR PARA: Desarrollo, testing

✅ Qwen 2.5 7B (8GB RAM)
   - Específicamente optimizado para JSON
   - Mejor que Llama en algunos tests
   - Multilingüe (soporte español excelente)
```

#### 2️⃣ **Máxima Precisión** (Si tienes recursos)
```
✅ Llama 3.1 70B (48GB RAM)
   - Casi perfecto en ejecución de tools
   - Comprende contexto profundo
   - Mejor para tareas críticas

✅ Qwen 2.5 32B (24GB RAM)
   - Balance: calidad + velocidad
   - Mejor que 70B para MCP specificamente
```

#### 3️⃣ **Mejor Para Razonamiento Profundo**
```
✅ DeepSeek 33B (24GB RAM)
   - Excelente razonamiento
   - JSON funciona pero más lento
   - MEJOR PARA: Análisis, investigación
```

---

## 📤 INFORMACIÓN ENVIADA AL MODELO - ANÁLISIS DETALLADO {#información-enviada}

### Flujo Actual (Líneas 2840-2931)

```javascript
// 1. Conversación anterior (limitada por tokens)
let messages = conversationMessages.map(msg => ({
  role: msg.role,
  content: msg.content
}));

// 2. INYECCIÓN MCP
if (mcpEnabled) {
  mcpContext = await this.injectMCPContext();
  
  if (mcpContext.hasTools) {
    const toolsPrompt = this.generateMCPSystemPrompt(
      mcpContext.tools,        // ← Disponible pero NO se usa
      allowedDirs || null
    );
    
    // Insertar system prompt
    messages.unshift({
      role: 'system',
      content: toolsPrompt
    });
  }
}

// 3. Enviar a Ollama
const requestBody = {
  model: modelId,
  messages: messages,
  stream: true,
  options: ollamaOptions
};
```

### ¿Qué Incluye?

**✅ Se envía:**
1. System prompt (hardcodeado, 4 tools, directorios)
2. Contexto RAG (archivos adjuntos)
3. Histórico de conversación (ventana deslizante)
4. Mensaje del usuario actual
5. Parámetros de Ollama (temperatura, top_k, top_p, etc.)

**❌ NO se envía:**
1. Schemas reales de MCP tools (inputSchema)
2. Descripción completa de cada herramienta
3. Tipos de parámetros
4. Parámetros requeridos
5. Ejemplos reales de uso
6. Límites y restricciones
7. Validaciones
8. Respuesta esperada (output)
9. Casos de error posibles
10. Metadatos de servidor MCP
11. Información del estado del sistema
12. Archivos recientemente modificados
13. Estructura de directorios actual
14. Listado de archivos disponibles

### Ejemplo de Mensaje Enviado a Ollama

```
[SYSTEM PROMPT]
Herramientas disponibles:
• write_file - Crear archivo NUEVO...
• edit_file - MODIFICAR parte...
• read_text_file - Leer contenido
• list_directory - Listar archivos

DIR: C:/Users/kalid/Documents/Cursor/NodeTerm

FORMATO: {"tool":"nombre","arguments":{...}}

EJEMPLOS:
• Crear: {"tool":"write_file","arguments":{"path":"C:/Users/kalid/Documents/Cursor/NodeTerm/nuevo.txt","content":"..."}}
...

[CONTEXTO RAG - opcional]
Archivo adjunto: package.json (conten 2345 chars)

[HISTORIAL]
User: "Crea un archivo test.js"
Assistant: "Voy a crear el archivo..."
User: "Ahora lee el contenido"

[MENSAJE ACTUAL]
User: "Quiero que escribas una función para..."

→ TOTAL: ~3000-4000 chars (ventana deslizante)
```

### Comparación: Qué Envía Cursor

```
[SYSTEM]
You have access to these tools:

{
  "name": "write_file",
  "description": "Write content to a file. Create file if it doesn't exist.",
  "parameters": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Absolute file path"
      },
      "content": {
        "type": "string",
        "description": "Complete file content"
      }
    },
    "required": ["path", "content"]
  }
}

{... 3 más tools similar ...}

Current workspace:
- Project: NodeTerm
- Files: [listado completo]
- Recent changes: [últimas 5 ediciones]
- Allowed paths: C:/Users/...

[HISTORIAL]
...

[MENSAJE]
...

→ TOTAL: ~8000-12000 chars (mucho más detallado)
```

---

## 📝 RECOMENDACIONES Y PLAN DE ACCIÓN {#recomendaciones}

### ⭐ PRIORIDAD 1 (Crítica - Mejora Inmediata)

#### 1. Mejorar System Prompt con JSON Schema Completo

**Cambio en `generateMCPSystemPrompt()` (línea 2051):**

```javascript
generateMCPSystemPrompt(tools, allowedDirsText = null) {
  if (!tools || tools.length === 0) return '';

  // NUEVO: Construir schema desde tools reales
  let toolsSection = 'HERRAMIENTAS DISPONIBLES (Usa JSON):\n\n';
  
  for (const tool of tools) {
    const schema = tool.inputSchema || {};
    const params = schema.properties || {};
    const required = schema.required || [];
    
    toolsSection += `📌 ${tool.name}
Descripción: ${tool.description}

Parámetros:
${Object.entries(params).map(([key, prop]) => {
  const req = required.includes(key) ? '(REQUERIDO)' : '(opcional)';
  return `  • ${key} [${prop.type}] ${req}: ${prop.description || 'N/A'}`;
}).join('\n')}

Ejemplo:
{
  "tool": "${tool.name}",
  "arguments": {
    ${Object.keys(params).map(k => `"${k}": "${params[k].description || 'valor'}"`).join(',\n    ')}
  }
}

---

`;
  }

  return toolsSection;
}
```

**Beneficio:** 
- ✅ Sistema dinámico - se adapta a nuevas tools
- ✅ Incluye tipos de parámetros
- ✅ Indica requeridos vs opcionales
- ✅ Ejemplos reales basados en schema

#### 2. Mejorar Detección de Tool Calls

**Cambio en `detectToolCallInResponse()` (línea 2086):**

```javascript
detectToolCallInResponse(response) {
  if (!response || typeof response !== 'string') return null;
  
  try {
    // ESTRATEGIA NUEVA: Buscar JSON en cualquier posición
    // Permite preámbulo + JSON + epilogo
    
    // 1. Bloques explícitos con backticks
    let jsonBlockRegex = /```(?:json|tool)?\s*([\s\S]*?)```/gi;
    let match = jsonBlockRegex.exec(response);
    
    if (match) {
      const data = JSON.parse(match[1].trim());
      if (this._isValidToolCall(data)) {
        return this._normalizeToolCall(data);
      }
    }
    
    // 2. NUEVO: Buscar JSON cualquier formato
    // {"tool": ... } o { "use_tool": ... }
    const jsonPattern = /\{[\s\S]*?"(?:tool|use_tool)"[\s\S]*?\}/g;
    const matches = response.match(jsonPattern);
    
    if (matches) {
      for (const jsonStr of matches) {
        try {
          const data = JSON.parse(jsonStr);
          if (this._isValidToolCall(data)) {
            return this._normalizeToolCall(data);
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // 3. Si nada funciona, retornar null
    return null;
    
  } catch (error) {
    return null;
  }
}

_isValidToolCall(data) {
  return (data.tool && typeof data.tool === 'string') ||
         (data.use_tool && typeof data.use_tool === 'string');
}

_normalizeToolCall(data) {
  return {
    toolName: data.tool || data.use_tool,
    arguments: data.arguments || {},
    serverId: data.serverId || data.server || null
  };
}
```

**Beneficio:**
- ✅ Detecta JSON en cualquier posición
- ✅ Permite preámbulo y epilogo
- ✅ Más flexible para diferentes modelos
- ✅ Mejor logging de errores

#### 3. Expandir Loop de Herramientas

**Cambio en `handleLocalToolCallLoop()` (línea 2158):**

```javascript
// CAMBIO: Remover límite arbitrario de 5 iteraciones
// NUEVO: Usar límite inteligente basado en progreso

async handleLocalToolCallLoop(
  toolCall, 
  messages, 
  callbacks = {}, 
  options = {}, 
  modelId, 
  maxIterations = 10  // ← Aumentado de 5 a 10
) {
  let iteration = 0;
  let toolResults = []; // ← Nuevo: seguir resultados
  let lastToolName = null;
  
  while (toolCall && iteration < maxIterations) {
    iteration++;
    
    // NUEVO: Detectar si es el MISMO tool repetido
    if (lastToolName === toolCall.toolName && iteration > 2) {
      console.warn('⚠️ [MCP] Mismo tool repetido 2x, deteniendo');
      break;
    }
    lastToolName = toolCall.toolName;
    
    // ... ejecutar tool ...
    
    // NUEVO: Re-inyectar resultado en conversación
    conversationMessages.push({
      role: 'user',
      content: `🔧 RESULTADO TOOL: ${toolCall.toolName}\n${result}`
    });
    
    // NUEVO: Pedirle al modelo si necesita más tools
    const followUp = await this.sendToLocalModelStreamingWithCallbacks(
      modelId,
      conversationMessages,
      callbacks,
      { ...options, maxTokens: 500, temperature: 0.3 }
    );
    
    toolCall = this.detectToolCallInResponse(followUp);
    
    if (!toolCall) {
      // No hay más tools, el modelo respondió
      return followUp;
    }
  }
  
  // ...
}
```

**Beneficio:**
- ✅ Permite más iteraciones si es necesario
- ✅ Re-inyecta resultados (mejor contexto)
- ✅ Detecta loops infinitos
- ✅ Modelo puede refinarse

### ⭐ PRIORIDAD 2 (Alta - Siguientes 2 semanas)

#### 4. Enviar Información Contextual Completa

**Nuevo método en AIService:**

```javascript
async buildCompleteMCPContext() {
  const tools = await mcpClient.getAvailableTools();
  const dirDirs = await this.getAllowedDirectoriesCached();
  
  // NUEVO: Listar archivos recientemente editados
  const recentFiles = conversationService
    .getConversationHistory()
    .filter(m => m.toolName && 
            ['write_file', 'edit_file'].includes(m.toolName))
    .map(m => m.toolArgs?.path)
    .slice(0, 5);
  
  return {
    tools,
    allowedDirectories: dirDirs,
    recentFiles,
    timestamp: new Date().toISOString()
  };
}
```

#### 5. Crear Documentación de Tools Dinámicamente

**Nuevo componente: ToolDocumentation**

```javascript
// En system prompt, incluir:
"HERRAMIENTAS DISPONIBLES:

" + tools.map(tool => `
${tool.name.toUpperCase()}
${'-'.repeat(tool.name.length)}
Descripción: ${tool.description}
Parámetros: ${JSON.stringify(tool.inputSchema.properties, null, 2)}
Ejemplo: ${JSON.stringify(tool.example || {}, null, 2)}
`).join('\n\n')
```

### ⭐ PRIORIDAD 3 (Media - Siguiente mes)

#### 6. Soportar Múltiples Tool Calls Simultáneos

Permitir que el modelo pida ejecutar 2-3 tools en paralelo.

#### 7. Crear Caché de Resultados

Guardar resultados de tools para reutilizar.

#### 8. Integración con Cursor-like Panels

UI para mostrar:
- Tools disponibles
- Última ejecución
- Resultados formateados
- Errores

---

## 📊 RESUMEN DE MEJORAS

| Mejora | Impacto | Complejidad | Tiempo |
|--------|---------|-------------|--------|
| JSON Schema completo | ⭐⭐⭐⭐⭐ | Media | 2h |
| Mejor detección tools | ⭐⭐⭐⭐ | Media | 1.5h |
| Loop expandido | ⭐⭐⭐⭐ | Alta | 2h |
| Contexto completo | ⭐⭐⭐⭐ | Media | 1h |
| Documentación dinámica | ⭐⭐⭐ | Baja | 1h |
| **TOTAL** | | | **7.5h** |

---

## 🎯 SIGUIENTE PASO

¿Deseas que comencemos con las mejoras de Prioridad 1?

### Punto por Punto:
1. ¿Empezamos por mejorar `generateMCPSystemPrompt()` para usar JSON Schema real?
2. ¿O prefieres primero mejorar `detectToolCallInResponse()`?
3. ¿O expandir el loop de herramientas?

Podemos hacerlo **paso a paso, probando cada cambio**, como prefieres.
