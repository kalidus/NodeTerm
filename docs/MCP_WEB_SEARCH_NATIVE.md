## Servidor MCP Nativo: Web Search

Este MCP permite realizar búsquedas web ligeras y extraer contenido sin depender de procesos externos (Puppeteer/npx).

### Capacidades

- `web_search(query, maxResults?)`: usa DuckDuckGo HTML para obtener los principales resultados (título, URL, snippet).
- `fetch_page(url, maxLength?)`: descarga el HTML de una página (límites de tamaño/timeout).
- `extract_text(url, maxLength?)`: devuelve la versión en texto plano del contenido descargado.

### Configuración

En `MCP Manager` o durante la instalación desde el catálogo:

| Campo | Descripción |
| --- | --- |
| `mode` | `scraping` (por defecto) o `api`. Cuando `api` se requiere `apiEndpoint` y, normalmente, `apiKey`. |
| `renderMode` | `static` (HTML plano) o `rendered` (usa un BrowserWindow offscreen para ejecutar JavaScript). |
| `maxResults` | Máximo de resultados por búsqueda (1-10). |
| `timeoutMs` | Timeout por petición en milisegundos (default 5000). |
| `maxContentLength` | Límite de bytes/caracteres a descargar para cada página (default 200000). |
| `allowedDomains` | Lista separada por comas. Si se deja vacío no se filtran dominios. |
| `userAgent` | User-Agent personalizado para las peticiones HTTP. |
| `apiEndpoint`, `apiKey`, `apiProvider` | Opcional: datos para integrar una API externa en modo `api`. |

Los valores se almacenan en `mcp-config.json` dentro del bloque `web-search-native`.

### Funcionamiento interno

1. `MCPService` detecta `type: "native"` y crea `WebSearchNativeServer`.
2. `WebSearchNativeServer` delega en `WebSearchService`, que usa `fetch` + parsing ligero de DuckDuckGo.
3. Los resultados se devuelven como `content` (texto resumido) + `data` (JSON separado) para que la IA pueda citarlos.
4. En `AIService` el filtrado contextual prioriza `web-search-native` para consultas web y mantiene Puppeteer como fallback visual.
5. Si `renderMode` está en `rendered` o la tool recibe `render: true`, se usa un `BrowserWindow` offscreen para obtener el HTML tras ejecutar JavaScript (similar a Puppeteer).

### Limitaciones y futuras mejoras

- Scraping basado en HTML de DuckDuckGo; si cambia el marcado habrá que ajustar los selectores.
- Modo API está soportado a nivel de configuración, pero requiere proporcionar endpoint y key válidos.
- No se exponen `resources` ni `prompts`; sólo herramientas.
- `extract_text` realiza limpieza básica (regex). Para análisis avanzado puede combinarse con Puppeteer o herramientas adicionales.
- Con `renderMode: rendered` el costo de ejecución aumenta; úsalo sólo para sitios que realmente necesiten JavaScript.

