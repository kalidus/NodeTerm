const webSearchService = require('../WebSearchService');

class WebSearchNativeServer {
  constructor(initialConfig = {}) {
    this.serverId = initialConfig.serverId || 'web-search-native';
    this.mode = initialConfig.mode || 'scraping';
    this.options = initialConfig.options || {};
    this.allowedDomains = initialConfig.allowedDomains || [];
    this.renderMode = initialConfig.renderMode || 'static';
    this.renderDelayMs = typeof initialConfig.renderDelayMs === 'number'
      ? initialConfig.renderDelayMs
      : (typeof this.options.renderDelayMs === 'number' ? this.options.renderDelayMs : 1200);
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
      userAgent: this.options.userAgent || 'NodeTerm-WebSearch/1.0',
      renderMode: this.renderMode,
      renderDelayMs: this.renderDelayMs
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
          name: 'site_search',
          description: 'Realiza una búsqueda web limitada a un dominio específico y devuelve enlaces relevantes.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL o dominio base donde limitar la búsqueda.',
                format: 'uri'
              },
              query: {
                type: 'string',
                description: 'Palabras clave a buscar dentro del sitio.'
              },
              maxResults: {
                type: 'number',
                minimum: 1,
                maximum: 10,
                default: 6,
                description: 'Número máximo de enlaces a devolver.'
              }
            },
            required: ['url', 'query']
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
              },
              render: {
                type: 'boolean',
                description: 'Si es true, renderiza la página con un motor headless (BrowserWindow).'
              }
            },
            required: ['url']
          }
        },
        {
          name: 'extract_text',
          description: 'Descarga una página, extrae el contenido principal y devuelve resumen, markdown y texto plano.',
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
                maximum: 500000,
                default: 200000,
                description: 'Cantidad máxima de texto a procesar.'
              },
              render: {
                type: 'boolean',
                description: 'Renderizar la página antes de extraer el texto.'
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
      case 'site_search':
        return this.executeSiteSearch(args);
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

  async executeSiteSearch(args = {}) {
    const url = (args.url || '').trim();
    const query = (args.query || '').trim();
    if (!url) {
      throw new Error('Se requiere el argumento "url".');
    }
    if (!query) {
      throw new Error('Se requiere el argumento "query".');
    }

    const maxResults = Math.min(Math.max(args.maxResults || 6, 1), 10);

    const results = await webSearchService.searchSite(url, query, {
      maxResults,
      mode: this.mode,
      allowedDomains: this.allowedDomains
    });

    const lines = results.length
      ? results.map((r, idx) => {
          const displayUrl = r.url.length > 120 ? `${r.url.slice(0, 117)}...` : r.url;
          const snippet = r.snippet ? `\n  ${r.snippet}` : '';
          return `${idx + 1}. ${r.title}\n   ${displayUrl}${snippet}`;
        }).join('\n\n')
      : 'No se encontraron resultados relevantes en el sitio.';

    return {
      content: [
        {
          type: 'text',
          text: [
            `Resultados en ${url} para "${query}":`,
            '',
            lines
          ].join('\n').trim()
        }
      ],
      data: {
        url,
        query,
        results
      }
    };
  }

  async executeFetchPage(args = {}) {
    const url = (args.url || '').trim();
    if (!url) {
      throw new Error('Se requiere el argumento "url".');
    }

    const maxLengthRaw = Number(args.maxLength);
    const maxLength = Number.isFinite(maxLengthRaw) && maxLengthRaw > 0
      ? maxLengthRaw
      : Math.max(400000, this.options.maxContentLength || 200000);
    const useRender = args.render === true || this.renderMode === 'rendered';

    const page = await webSearchService.fetchPage(url, {
      maxContentLength: maxLength,
      allowedDomains: this.allowedDomains,
      render: useRender
    });

    const mainLength = page.content ? page.content.length : 0;
    const originalLength = page.originalContent ? page.originalContent.length : mainLength;

    return {
      content: [
        {
          type: 'text',
          text: [
            `HTML principal (${mainLength} caracteres)`,
            `HTML original (${originalLength} caracteres)`,
            `Renderizado: ${useRender ? 'sí' : 'no'}`
          ].join('\n')
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

    const maxLengthRaw = Number(args.maxLength);
    const maxLength = Number.isFinite(maxLengthRaw) && maxLengthRaw > 0
      ? maxLengthRaw
      : Math.max(400000, this.options.maxContentLength || 200000);
    const useRender = args.render === true || this.renderMode === 'rendered';

    const result = await webSearchService.extractText(url, {
      maxContentLength: maxLength,
      allowedDomains: this.allowedDomains,
      render: useRender
    });

    const fullText = result.rawText || result.text || '';
    const looksLikeNotFound = /404/i.test(fullText) && /not found|page could not be found|doesn'?t exist/i.test(fullText);

    const lines = [
      `Contenido extraído (${fullText.length} caracteres procesados)`
    ];

    if (result.title) {
      lines.push(`Título: ${result.title}`);
    }

    if (result.metadata?.byline) {
      lines.push(`Autoría: ${result.metadata.byline}`);
    }

    if (result.summary) {
      lines.push('Resumen:');
      lines.push(result.summary);
    }

    const headlineEntries = Array.isArray(result.headlineLinks) && result.headlineLinks.length
      ? result.headlineLinks.map(item => ({
          text: (item.text || '').trim(),
          href: (item.href || '').trim()
        }))
      : (Array.isArray(result.headlines) ? result.headlines.map(text => ({ text: (text || '').trim(), href: '' })) : []);

    const headlineTextSet = new Set(
      headlineEntries
        .map(item => (item.text || '').toLowerCase())
        .filter(Boolean)
    );

    if (headlineEntries.length) {
      lines.push('');
      lines.push('Titulares detectados:');
      headlineEntries.slice(0, 20).forEach((headline, idx) => {
        const display = headline.href ? `${headline.text} → ${headline.href}` : headline.text;
        lines.push(`${idx + 1}. ${display}`);
      });
    }

    const structureHeadings = Array.isArray(result.headings)
      ? result.headings.filter(h => {
          const text = (h.text || '').trim();
          if (!text) return false;
          const key = text.toLowerCase();
          if (headlineTextSet.has(key)) return false;
          return true;
        })
      : [];

    if (structureHeadings.length && structureHeadings.length < 6) {
      const dedupeStructure = new Set();
      const headingLines = structureHeadings
        .filter(h => {
          const key = (h.text || '').trim().toLowerCase();
          if (!key) return false;
          if (dedupeStructure.has(key)) return false;
          dedupeStructure.add(key);
          return true;
        })
        .slice(0, 12)
        .map(h => {
          const prefix = '  '.repeat(Math.max(0, Math.min((h.level || 1) - 1, 4)));
          return `${prefix}- [H${h.level || '?'}] ${h.text}`;
        });
      if (headingLines.length) {
        lines.push('');
        lines.push('Estructura detectada:');
        lines.push(...headingLines);
      }
    }

    if (Array.isArray(result.links) && result.links.length) {
      const linkLines = result.links.slice(0, 6).map(link => `- ${link.text} → ${link.href}`);
      if (linkLines.length) {
        lines.push('');
        lines.push('Enlaces principales:');
        lines.push(...linkLines);
      }
    }

    if (looksLikeNotFound) {
      lines.push('');
      lines.push('⚠️ El sitio devolvió un texto que parece un error (404 / no encontrado). Puede requerir JavaScript o una navegación con Puppeteer.');
    }

    lines.push('');
    lines.push('El cuerpo completo está disponible en data.markdown (Markdown) y data.rawText (texto plano).');
    lines.push(`Renderizado: ${useRender ? 'sí' : 'no'}`);

    return {
      content: [
        {
          type: 'text',
          text: lines.join('\n\n')
        }
      ],
      data: {
        ...result,
        requestedUrl: url,
        renderUsed: useRender
      }
    };
  }

  async shutdown() {
    // No hay recursos persistentes por liberar; se deja por compatibilidad futura.
    return true;
  }
}

module.exports = WebSearchNativeServer;

