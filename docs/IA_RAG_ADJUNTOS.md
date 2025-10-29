## Sistema de contexto efímero para archivos adjuntos (RAG ligero)

### Objetivo
- Evitar pegar el contenido de archivos en el chat visible.
- Mantener el contexto de archivos al retomar conversaciones.
- Inyectar de forma efímera solo fragmentos relevantes del/los archivos (estilo ChatGPT/Claude/Gemini).

### Resumen de cambios
- Los archivos adjuntos se guardan como metadatos de la conversación (`attachedFiles`) y ya no se concatenan al prompt del usuario.
- Al enviar un mensaje, se genera un “contexto efímero” con: resumen por archivo + fragmentos relevantes; se añade como mensaje `system` sólo para ese turno.
- Saneado de conversaciones antiguas: se eliminan bloques legacy “📎 Archivo adjunto…” y duplicados consecutivos.
- Se crea copia de seguridad previa a la migración en `localStorage` (`ai-conversations-data-backup`).

### Flujo
- Adjuntar: `FileUploader` → `fileAnalysisService.processFile(file)` → objeto `fileData` con `content` y metadatos.
- Persistencia: `ConversationService` añade/quita `attachedFiles` por conversación. Los mensajes del chat no incluyen texto de archivos.
- Envío:
  - `AIChatPanel` envía solo el texto del usuario.
  - `AIService.sendMessageWithCallbacks`:
    1) Añade el último mensaje del usuario al historial.
    2) Limita historial por tokens (ventana deslizante).
    3) Construye `ephemeralContext` vía `fileAnalysisService.buildEphemeralContext(attachedFiles, userQuery)`.
    4) Monta `providerMessages = [...historialLimitado, {role:'system', content:ephemeralContext?}, {role:'user', content:userQuery}]` y lo envía al modelo.

### Detalles técnicos
- Resumen de archivo: `FileAnalysisService.generateFileSummary(fileData)` crea una línea estable con nombre, tipo, tamaño y datos clave (p.ej. páginas en PDF, filas/columnas en CSV, claves principales en JSON).
- Extracción de texto plano por tipo: `extractPlainText(content, category)` (PDF/DOCX/TXT/RTF/XML/JSON/CSV/HTML).
- Selección de fragmentos: `buildEphemeralContext()` divide por párrafos/ventanas (~500 chars), puntúa por coincidencia con términos de la consulta y longitud moderada; recoge los mejores segmentos por archivo hasta un máximo global.
- Límite: por defecto `maxChars ≈ 3000` o la mitad del `contextLimit` del modelo (el menor). Se reparte por archivo (`maxPerFile`).
- Inyección: el contexto se añade como rol `system` y NO se persiste en el historial visible.

### Compatibilidad y migración
- `ConversationService.loadConversations()` ejecuta:
  - `sanitizeUserMessageContent`: recorta bloques legacy que comenzaban con “📎 **Archivo adjunto:” en mensajes `user`.
  - `deduplicateConsecutiveMessages`: elimina duplicados consecutivos (mismo rol y contenido normalizado).
  - Backup en `localStorage` clave `ai-conversations-data-backup` antes de guardar.

### Cómo retomar una conversación
- Al abrir una conversación con `attachedFiles`, cada nuevo mensaje vuelve a inyectar un contexto efímero relevante.
- Si se quitan los adjuntos de la conversación, el sistema deja de reinyectar contexto.
- Para re-analizar con contenido distinto, re-adjuntar o sustituir archivos.

### Configuración y puntos de ajuste
- Tamaño del contexto efímero: parámetro `maxChars` en `buildEphemeralContext`. Se calcula en `AIService.sendMessageWithCallbacks()`:
  - `maxChars = min(3000, (contextLimit || 8000) / 2)`.
- Heurística de ranking: edición en `buildEphemeralContext` (lista de stopwords, cálculo de score, tamaño de ventana, nº de segmentos).

### Desactivar rápidamente la inyección efímera
- En `AIService.sendMessageWithCallbacks`, no añadir el bloque `{ role:'system', content: ephemeralContext }` (o forzar `maxChars = 0`).

### Pruebas sugeridas
1) Adjuntar PDF/TXT y preguntar por contenido específico: debe responder usando datos del archivo, sin mostrar el bloque “Archivo adjunto…”.
2) Retomar conversación con adjuntos: debe seguir contestando con contexto correcto sin re-adjuntar.
3) Quitar los adjuntos y volver a preguntar: el modelo ya no usará ese contexto.
4) Cargar conversaciones antiguas: no deben verse duplicados ni bloques legacy.

### FAQ
- ¿El modelo “ve” todo el archivo? No. Sólo el resumen y fragmentos relevantes dentro del límite dinámico de contexto.
- ¿Se guarda lo inyectado? No, la inyección es efímera y no aparece en el historial visible.
- ¿Puedo aumentar la profundidad? Sí, ajustando `maxChars` y los parámetros del modelo (tokens/contexto).


