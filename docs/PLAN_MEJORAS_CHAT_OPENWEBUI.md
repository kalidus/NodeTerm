# Plan de Mejoras del Chat AI - Inspirado en Open WebUI

## Objetivo
Mejorar el chat AI nativo para que tenga funcionalidades similares a Open WebUI, especialmente:
- ✒️🔢 Soporte completo de Markdown y LaTeX
- Mejor gestión de conversaciones
- Interfaz más pulida

---

## 1. Soporte Completo de Markdown y LaTeX

### 1.1 Agregar KaTeX para LaTeX
**Estado**: ✅ COMPLETADO
**Prioridad**: Alta

- [x] Instalar `katex` y `katex-css` como dependencias
- [x] Integrar KaTeX en el renderizado de Markdown
- [x] Soporte para:
  - Fórmulas inline: `$...$` o `\(...\)`
  - Fórmulas en bloque: `$$...$$` o `\[...\]`
  - Entornos matemáticos completos
- [x] Estilos CSS para fórmulas matemáticas

### 1.2 Mejorar Renderizado de Markdown
**Estado**: ✅ COMPLETADO (parcialmente)
**Prioridad**: Media

- [x] Mejorar soporte de tablas (con estilos mejorados)
- [x] Agregar soporte para:
  - Task lists (`- [ ]` y `- [x]`) ✅
  - Strikethrough (`~~texto~~`) ✅
  - Subscript y superscript (pendiente)
  - Footnotes (pendiente)
  - Definition lists (pendiente)
- [ ] Mejorar renderizado de enlaces con previews
- [ ] Soporte para diagramas (Mermaid, PlantUML)

### 1.3 Extensiones de Markdown
**Estado**: No implementado
**Prioridad**: Baja

- [ ] Soporte para emojis mejorado
- [ ] Soporte para menciones (@usuario)
- [ ] Soporte para hashtags (#tag)
- [ ] Soporte para código con números de línea

---

## 2. Gestión de Conversaciones Mejorada

### 2.1 Características Actuales (ConversationService)
✅ Implementado:
- Sistema de múltiples conversaciones
- Carpetas y organización
- Favoritos
- Tags/etiquetas
- Búsqueda básica
- Persistencia en localStorage

### 2.2 Mejoras Necesarias
**Estado**: Pendiente
**Prioridad**: Media

- [ ] **Búsqueda avanzada**:
  - Búsqueda por contenido de mensajes
  - Filtros por fecha, modelo usado, tags
  - Búsqueda semántica (si hay embeddings)
  
- [ ] **Exportación/Importación**:
  - Exportar conversaciones a Markdown
  - Exportar a JSON
  - Importar desde otros formatos
  
- [ ] **Organización mejorada**:
  - Drag & drop para reorganizar conversaciones
  - Agrupar por fecha automáticamente
  - Vista de calendario
  
- [ ] **Metadatos adicionales**:
  - Estadísticas de tokens por conversación
  - Tiempo total de conversación
  - Modelos usados en la conversación
  - Archivos adjuntos asociados

---

## 3. Interfaz de Usuario Mejorada

### 3.1 Panel de Conversaciones
**Estado**: Implementado básicamente
**Prioridad**: Media

- [ ] **Vista mejorada**:
  - Preview más rico del último mensaje
  - Indicadores visuales de estado (nuevo, archivado)
  - Avatares o iconos por conversación
  
- [ ] **Acciones rápidas**:
  - Duplicar conversación
  - Compartir conversación
  - Archivar/desarchivar
  - Eliminar con confirmación

### 3.2 Editor de Mensajes
**Estado**: ✅ COMPLETADO (parcialmente)
**Prioridad**: Alta

- [x] **Barra de herramientas Markdown**:
  - Botones para negrita, cursiva, código ✅
  - Insertar enlaces, imágenes ✅
  - Insertar bloques de código ✅
  - Insertar fórmulas LaTeX ✅
  - Listas, citas ✅
  
- [ ] **Preview en tiempo real**:
  - Toggle entre editor y preview
  - Vista dividida (editor | preview)
  
- [x] **Atajos de teclado**:
  - Ctrl+B para negrita ✅
  - Ctrl+I para cursiva ✅
  - Ctrl+K para enlace ✅
  - Ctrl+Shift+K para código inline ✅
  - Ctrl+Shift+C para bloque de código ✅

---

## 4. Funcionalidades Adicionales

### 4.1 Archivos Adjuntos Mejorados
**Estado**: Implementado básicamente
**Prioridad**: Media

- [ ] Preview de imágenes en el chat
- [ ] Visualización de PDFs inline
- [ ] Soporte para más tipos de archivos
- [ ] Drag & drop mejorado

### 4.2 Respuestas con Código
**Estado**: Implementado
**Prioridad**: Baja

- [ ] Mejorar visualización de bloques de código
- [ ] Números de línea opcionales
- [ ] Botón de "Ejecutar código" para lenguajes soportados
- [ ] Diferenciación visual por lenguaje

### 4.3 Streaming Mejorado
**Estado**: Implementado
**Prioridad**: Baja

- [ ] Indicador de velocidad de escritura
- [ ] Pausar/reanudar streaming
- [ ] Copiar texto mientras se escribe

---

## Implementación Prioritaria

### Fase 1: LaTeX y Markdown Mejorado (Esta semana)
1. Instalar KaTeX
2. Integrar renderizado de fórmulas
3. Mejorar soporte de Markdown extendido
4. Agregar estilos CSS para matemáticas

### Fase 2: Gestión de Conversaciones (Próxima semana)
1. Mejorar búsqueda
2. Agregar exportación/importación
3. Mejorar organización visual

### Fase 3: UI/UX (Siguiente semana)
1. Barra de herramientas Markdown
2. Preview en tiempo real
3. Atajos de teclado

---

## Notas Técnicas

### Dependencias Necesarias
```json
{
  "katex": "^0.16.9",
  "katex-css": "^0.1.1"
}
```

### Estructura de Archivos
- `src/services/MarkdownFormatter.js` - Ya existe, mejorar
- `src/components/AIChatPanel.js` - Agregar soporte LaTeX
- `src/styles/components/ai-chat.css` - Estilos para fórmulas

### Consideraciones
- KaTeX es más ligero que MathJax
- Compatible con marked.js
- Soporta la mayoría de comandos LaTeX comunes
- Renderizado del lado del cliente (rápido)

