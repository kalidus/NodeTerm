# Análisis de Refactorización - NodeTerm

## 📊 Resumen Ejecutivo

Este documento identifica oportunidades de refactorización en el código base de NodeTerm para mejorar la mantenibilidad, testabilidad y escalabilidad.

## 🔴 Problemas Críticos Identificados

### 1. AIService.js - Archivo Monolítico (7,504 líneas, ~425 métodos)

**Problema**: El archivo `src/services/AIService.js` es extremadamente grande y tiene demasiadas responsabilidades.

**Responsabilidades Actuales**:
- Gestión de modelos (remotos y locales)
- Comunicación con APIs (OpenAI, Anthropic, Google, Ollama)
- Procesamiento de herramientas MCP
- Análisis y evaluación de código
- Gestión de contexto y historial
- Filtrado y scoring de herramientas
- Generación de prompts
- Detección de archivos
- Y muchas más...

**Impacto**:
- Dificulta el mantenimiento
- Hace difícil escribir tests unitarios
- Alto acoplamiento
- Difícil de entender para nuevos desarrolladores

**Recomendación de Refactorización**:

```
src/services/ai/
├── AIService.js (orquestador principal, ~200 líneas)
├── providers/
│   ├── OpenAIProvider.js
│   ├── AnthropicProvider.js
│   ├── GoogleProvider.js
│   └── OllamaProvider.js
├── ModelManager.js (gestión de modelos disponibles)
├── ContextManager.js (gestión de contexto e historial)
├── ToolProcessor.js (procesamiento de herramientas MCP)
├── CodeAnalyzer.js (análisis de código - métodos como calculateCodeSignificance, etc.)
├── PromptBuilder.js (construcción de prompts)
└── ToolFilter.js (filtrado y scoring de herramientas)
```

**Beneficios**:
- Separación clara de responsabilidades
- Fácil de testear cada componente
- Fácil de extender con nuevos proveedores
- Mejor organización del código

---

### 2. AIChatPanel.js - Componente Monolítico (6,395 líneas)

**Problema**: El componente `AIChatPanel` tiene demasiados estados (30+) y responsabilidades mezcladas.

**Estados Identificados**:
- Gestión de mensajes (messages, inputValue, isLoading)
- Gestión de conversaciones (currentConversationId, conversationTitle)
- Gestión de modelos (currentModel, modelType, functionalModels)
- Gestión de archivos (attachedFiles, detectedFileTypes)
- Gestión de MCP (mcpToolsEnabled, activeMcpServers, selectedMcpServers)
- Gestión de UI (showConfigDialog, showFileUploader, themeVersion)
- Y muchos más...

**Recomendación de Refactorización**:

```
src/components/ai-chat/
├── AIChatPanel.js (componente principal, ~200 líneas)
├── hooks/
│   ├── useMessages.js (gestión de mensajes)
│   ├── useConversations.js (gestión de conversaciones)
│   ├── useModelSelection.js (gestión de modelos)
│   ├── useFileAttachments.js (gestión de archivos)
│   ├── useMCPTools.js (gestión de herramientas MCP)
│   └── useChatUI.js (estados de UI)
├── components/
│   ├── MessageList.jsx
│   ├── MessageInput.jsx
│   ├── ConversationHistory.jsx
│   ├── ModelSelector.jsx
│   ├── FileUploader.jsx
│   └── MCPToolsPanel.jsx
└── utils/
    └── messageFormatters.js
```

**Beneficios**:
- Componentes más pequeños y enfocados
- Hooks reutilizables
- Mejor rendimiento (menos re-renders)
- Más fácil de mantener y testear

---

### 3. main.js - Archivo Principal Monolítico (4,000+ líneas)

**Problema**: El archivo `main.js` mezcla muchas responsabilidades del proceso principal de Electron.

**Recomendación de Refactorización**:

```
main/
├── main.js (punto de entrada, ~100 líneas)
├── window/
│   ├── WindowManager.js (creación y gestión de ventanas)
│   └── window-config.js (configuraciones de ventana)
├── lifecycle/
│   ├── AppLifecycle.js (ready, will-quit, etc.)
│   └── WindowLifecycle.js (close, minimize, etc.)
├── initialization/
│   ├── ServiceInitializer.js (inicialización de servicios)
│   └── HandlerRegistrar.js (registro de handlers IPC)
└── utils/
    └── ErrorHandler.js (manejo centralizado de errores)
```

**Nota**: Ya existe una estructura parcial en `src/main/handlers/` y `src/main/services/`, pero `main.js` aún tiene demasiado código.

---

### 4. Sidebar.js - Componente Grande (2,300+ líneas)

**Problema**: El componente `Sidebar` maneja muchas responsabilidades relacionadas con el árbol de conexiones.

**Recomendación de Refactorización**:

```
src/components/sidebar/
├── Sidebar.js (componente principal, ~300 líneas)
├── ConnectionTree.jsx (árbol de conexiones)
├── ConnectionDialogs.jsx (diálogos de creación/edición)
├── hooks/
│   ├── useConnectionTree.js
│   ├── useConnectionDialogs.js
│   └── useConnectionActions.js
└── utils/
    └── connectionHelpers.js
```

---

## 🟡 Problemas Menores

### 5. Duplicación de Código

**Áreas identificadas**:
- Lógica de validación repetida en múltiples componentes
- Formateo de mensajes duplicado
- Manejo de errores similar en varios lugares

**Recomendación**: Crear utilidades compartidas en `src/utils/` para:
- Validación de formularios
- Formateo de mensajes
- Manejo de errores estandarizado

### 6. Configuración de Modelos Hardcodeada

**Problema**: Los modelos están hardcodeados en `AIService.js` (líneas 37-700+).

**Recomendación**: Mover a archivo de configuración:
```
src/config/
└── ai-models.json
```

---

## 📋 Plan de Refactorización Sugerido

### Fase 1: Refactorización de AIService (Prioridad Alta)
1. Extraer proveedores de IA a clases separadas
2. Extraer análisis de código a `CodeAnalyzer.js`
3. Extraer gestión de contexto a `ContextManager.js`
4. Extraer procesamiento de herramientas a `ToolProcessor.js`
5. Mantener `AIService.js` como orquestador delgado

**Tiempo estimado**: 2-3 días
**Riesgo**: Medio (requiere testing exhaustivo)

### Fase 2: Refactorización de AIChatPanel (Prioridad Alta)
1. Extraer hooks personalizados para cada responsabilidad
2. Dividir en componentes más pequeños
3. Mover lógica de negocio a hooks
4. Simplificar el componente principal

**Tiempo estimado**: 2-3 días
**Riesgo**: Medio-Alto (componente crítico de UI)

### Fase 3: Refactorización de main.js (Prioridad Media)
1. Extraer gestión de ventanas
2. Extraer lifecycle management
3. Simplificar punto de entrada

**Tiempo estimado**: 1-2 días
**Riesgo**: Bajo-Medio

### Fase 4: Refactorización de Sidebar (Prioridad Media)
1. Extraer componentes más pequeños
2. Crear hooks para lógica de negocio
3. Simplificar componente principal

**Tiempo estimado**: 1-2 días
**Riesgo**: Bajo-Medio

### Fase 5: Limpieza General (Prioridad Baja)
1. Eliminar código duplicado
2. Mover configuraciones a archivos JSON
3. Mejorar documentación

**Tiempo estimado**: 1 día
**Riesgo**: Bajo

---

## ✅ Criterios de Éxito

- Cada archivo tiene menos de 500 líneas (idealmente menos de 300)
- Cada clase/componente tiene una responsabilidad única
- Cobertura de tests > 80% para servicios críticos
- Tiempo de compilación no aumenta significativamente
- No se introducen bugs durante la refactorización

---

## 🚨 Advertencias

1. **No refactorizar todo a la vez**: Hacerlo en fases incrementales
2. **Mantener tests durante refactorización**: Asegurar que los tests existentes sigan pasando
3. **Comunicar cambios**: Documentar cambios importantes para el equipo
4. **Hacer commits frecuentes**: Facilita el rollback si es necesario

---

## 📝 Notas Adicionales

- El proyecto ya tiene una buena estructura en `src/main/handlers/` y `src/main/services/`
- Los hooks personalizados en `src/hooks/` son un buen patrón a seguir
- Considerar usar TypeScript en el futuro para mejor type safety
- Considerar usar un state management library (Redux, Zustand) si el estado se vuelve más complejo

---

**Fecha de análisis**: 2024
**Analizado por**: AI Assistant
**Próxima revisión**: Después de implementar Fase 1

