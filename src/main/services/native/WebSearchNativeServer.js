const webSearchService = require('../WebSearchService');

class WebSearchNativeServer {
  constructor(initialConfig = {}) {
    this.serverId = initialConfig.serverId || 'web-search-native';
    this.mode = initialConfig.mode || 'scraping';
    this.options = initialConfig.options || {};
    this.allowedDomains = initialConfig.allowedDomains || [];
    this.updateServiceConfig();
  }

  updateServiceConfig() {
    webSearchService.updateConfig({
      mode: this.mode,
      maxResults: this.options.maxResults || 5,
      timeoutMs: this.options.timeoutMs || 5000,
      maxContentLength: this.options.maxContentLength || 200000,
      allowedDomains: this.allowedDomains,
      api: this.options.api || {},
      userAgent: this.options.userAgent || 'NodeTerm-WebSearch/1.0'
    });
  }

  async handleRequest(method, params = {}) {
    switch (method) {
      case 'initialize':
        return this.handleInitialize();
      case 'tools/list':
        return this.handleToolsList();
      case 'resources/list':
        return { resources: [] };
      case 'prompts/list':
        return { prompts: [] };
      case 'tools/call':
        return this.handleToolsCall(params);
      case 'resources/read':
        throw new Error('Este servidor no expone resources.');
      default:
        throw new Error(`Método ${method} no soportado por ${this.serverId}`);
    }
  }

  handleInitialize() {
    return {
      capabilities: {
        tools: {
          list: true,
          call: true
        },
        resources: {
          list: false,
          read: false
        },
        prompts: {
          list: false,
          get: false
        }
      },
      serverInfo: {
        name: 'Web Search (nativo)',
        version: '1.0.0',
        description: 'Servidor nativo para búsquedas web y extracción de contenido usando scraping controlado.'
      }
    };
  }

  handleToolsList() {
    return {
      tools: [
        {
          name: 'web_search',
          description: 'Realiza una búsqueda web ligera (DuckDuckGo scraping) y devuelve los resultados principales.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Consulta a buscar.'
              },
              maxResults: {
                type: 'number',
                minimum: 1,
                maximum: 10,
                default: 5,
                description: 'Número máximo de resultados (1-10).'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'fetch_page',
          description: 'Descarga el HTML de una página web (con límites de tamaño y timeout).',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL de la página a descargar.',
                format: 'uri'
              },
              maxLength: {
                type: 'number',
                minimum: 1024,
                maximum: 500000,
                default: 200000,
                description: 'Máximo de bytes a descargar.'
              }
            },
            required: ['url']
          }
        },
        {
          name: 'extract_text',
          description: 'Descarga una página y devuelve texto plano limpio.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL de la página.',
                format: 'uri'
              },
              maxLength: {
                type: 'number',
                minimum: 1024,
                maximum: 200000,
                default: 60000,
                description: 'Cantidad máxima de texto a devolver.'
              }
            },
            required: ['url']
          }
        }
      ]
    };
  }

  async handleToolsCall(params) {
    const toolName = params.name;
    const args = params.arguments || {};

    switch (toolName) {
      case 'web_search':
        return this.executeWebSearch(args);
      case 'fetch_page':
        return this.executeFetchPage(args);
      case 'extract_text':
        return this.executeExtractText(args);
      default:
        throw new Error(`Tool ${toolName} no soportada por ${this.serverId}`);
    }
  }

  async executeWebSearch(args = {}) {
    const query = (args.query || '').trim();
    if (!query) {
      throw new Error('Se requiere el argumento "query".');
    }

    const maxResults = Math.min(Math.max(args.maxResults || this.options.maxResults || 5, 1), 10);

    const results = await webSearchService.search(query, {
      maxResults,
      mode: this.mode,
      allowedDomains: this.allowedDomains,
      api: this.options.api
    });

    const lines = results.length
      ? results.map(r => {
          const displayUrl = r.url.length > 120 ? `${r.url.slice(0, 117)}...` : r.url;
          const snippet = r.snippet ? `\n  ${r.snippet}` : '';
          return `• ${r.title}\n  ${displayUrl}${snippet}`;
        }).join('\n\n')
      : 'No se encontraron resultados.';

    return {
      content: [
        {
          type: 'text',
          text: [
            `Resultados de búsqueda para "${query}" (modo: ${this.mode}):`,
            '',
            lines
          ].join('\n').trim()
        }
      ],
      data: {
        query,
        mode: this.mode,
        results
      }
    };
  }

  async executeFetchPage(args = {}) {
    const url = (args.url || '').trim();
    if (!url) {
      throw new Error('Se requiere el argumento "url".');
    }

    const maxLength = args.maxLength || this.options.maxContentLength || 200000;
    const page = await webSearchService.fetchPage(url, {
      maxContentLength: maxLength,
      allowedDomains: this.allowedDomains
    });

    return {
      content: [
        {
          type: 'text',
          text: `Contenido HTML descargado (${page.content.length} caracteres)`
        }
      ],
      data: page
    };
  }

  async executeExtractText(args = {}) {
    const url = (args.url || '').trim();
    if (!url) {
      throw new Error('Se requiere el argumento "url".');
    }

    const maxLength = args.maxLength || 60000;
    const result = await webSearchService.extractText(url, {
      maxContentLength: maxLength,
      allowedDomains: this.allowedDomains
    });

    const fullText = result.text || '';
    let preview = fullText;
    let truncated = false;

    const PREVIEW_LIMIT = 1200;
    if (preview.length > PREVIEW_LIMIT) {
      preview = `${preview.slice(0, PREVIEW_LIMIT)}…`;
      truncated = true;
    }

    const looksLikeNotFound = /404/i.test(fullText) && /not found|page could not be found|doesn'?t exist/i.test(fullText);

    const lines = [
      `Texto extraído (${fullText.length} caracteres)`
    ];

    if (looksLikeNotFound) {
      lines.push('⚠️ El sitio devolvió un texto que parece un error (404 / no encontrado). Puede requerir JavaScript o una navegación con Puppeteer.');
    }

    if (preview.trim()) {
      lines.push(preview.trim());
      if (truncated) {
        lines.push('… (texto truncado, usa el campo data.text para el contenido completo)');
      }
    } else if (!looksLikeNotFound) {
      lines.push('No se encontró texto significativo en la página.');
    }

    return {
      content: [
        {
          type: 'text',
          text: lines.join('\n\n')
        }
      ],
      data: result
    };
  }

  async shutdown() {
    // No hay recursos persistentes por liberar; se deja por compatibilidad futura.
    return true;
  }
}

module.exports = WebSearchNativeServer;

