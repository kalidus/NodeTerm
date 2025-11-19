const { URL } = require('url');
const { BrowserWindow } = require('electron');
const { Readability } = require('@mozilla/readability');
const TurndownService = require('turndown');

// DOMMatrix polyfill ya está cargado en main.js antes de cualquier importación
const { JSDOM } = require('jsdom');
class WebSearchService {
  constructor() {
    this.defaultConfig = {
      mode: 'scraping', // scraping | api
      maxResults: 5,
      maxContentLength: 200000, // 200 KB
      timeoutMs: 5000,
      allowedDomains: [],
      userAgent: 'NodeTerm-WebSearch/1.0',
      renderMode: 'static', // static | rendered
      renderDelayMs: 1200,
      api: {
        endpoint: '',
        key: '',
        provider: ''
      }
    };

    this.config = { ...this.defaultConfig };
    this.turndown = new TurndownService({
      codeBlockStyle: 'fenced',
      headingStyle: 'atx',
      bulletListMarker: '-'
    });
    this.turndown.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);
  }

  updateConfig(partial = {}) {
    this.config = {
      ...this.defaultConfig,
      ...partial,
      api: {
        ...this.defaultConfig.api,
        ...(partial.api || {})
      },
      renderMode: partial.renderMode || partial.renderMode === '' ? partial.renderMode : this.defaultConfig.renderMode,
      renderDelayMs: partial.renderDelayMs !== undefined ? partial.renderDelayMs : this.defaultConfig.renderDelayMs
    };
  }

  mergeOptions(options = {}) {
    return {
      ...this.config,
      ...options,
      api: {
        ...this.config.api,
        ...(options.api || {})
      },
      renderMode: options.renderMode || this.config.renderMode,
      renderDelayMs: options.renderDelayMs !== undefined ? options.renderDelayMs : this.config.renderDelayMs
    };
  }

  isDomainAllowed(targetUrl, allowedDomains = []) {
    if (!allowedDomains || allowedDomains.length === 0) return true;
    try {
      const { hostname } = new URL(targetUrl);
      return allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  }

  decodeHtmlEntities(text = '') {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, '\'')
      .replace(/&#96;/g, '`');
  }

  stripHtml(html = '') {
    const withoutScripts = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');

    const withBreaks = withoutScripts
      .replace(/<(br|hr)\s*\/?>(\s*)/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/(div|section|article|header|footer|main)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/li>/gi, '')
      .replace(/<h[1-6][^>]*>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n');

    const withoutTags = withBreaks.replace(/<[^>]+>/g, ' ');

    const normalized = this.decodeHtmlEntities(withoutTags)
      .replace(/\r/g, '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => {
        const lower = line.toLowerCase();
        if (line === '•') return false;
        if (lower === 'ad' || lower === 'ads' || lower === 'publicidad') return false;
        if (lower.startsWith('síguenos en') || lower.startsWith('seguir en')) return false;
        if (/^copyright/i.test(line)) return false;
        if (/^comentarios?$/i.test(line)) return false;
        if (/^(inicio|home)$/i.test(line)) return false;
        return true;
      })
      .join('\n');

    return normalized.trim();
  }

  createDom(html = '', url = 'https://example.com/') {
    return new JSDOM(html || '<!DOCTYPE html><html><body></body></html>', {
      url,
      contentType: 'text/html',
      pretendToBeVisual: true,
      includeNodeLocations: false
    });
  }

  convertHtmlToMarkdown(html = '') {
    if (!html || !html.trim()) return '';
    try {
      return this.turndown.turndown(html);
    } catch (error) {
      console.warn('[WebSearchService] Turndown falló, usando texto plano:', error.message);
      return this.stripHtml(html);
    }
  }

  extractHeadingsFromHtml(html = '') {
    try {
      const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`, {
        pretendToBeVisual: true
      });
      const headings = [];
      dom.window.document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
        const text = (el.textContent || '').trim();
        if (!text) return;
        const level = Number(el.tagName.replace('H', '')) || 0;
        headings.push({
          level,
          text,
          anchor: el.id || undefined
        });
      });
      return headings.slice(0, 100);
    } catch (error) {
      console.warn('[WebSearchService] No se pudieron extraer headings:', error.message);
      return [];
    }
  }

  extractLinksFromHtml(html = '', limit = 50) {
    try {
      const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`, {
        pretendToBeVisual: true
      });
      const links = [];
      dom.window.document.querySelectorAll('a[href]').forEach((el) => {
        if (links.length >= limit) return;
        const href = el.getAttribute('href');
        const text = (el.textContent || '').trim();
        if (!href || !text) return;
        links.push({ href, text });
      });
      return links;
    } catch {
      return [];
    }
  }

  extractHeadlineLinks(html = '', baseUrl = '') {
    try {
      const dom = this.createDom(html, baseUrl || undefined);
      const document = dom.window.document;
      const selectors = [
        'article h1 a',
        'article h2 a',
        'article h3 a',
        '.entry-title a',
        '.post-title a',
        '.card-title a',
        '.news-item a',
        '.headline a',
        '.listing a.title',
        '.post a.title',
        '.post a.card-title',
        '.featured-article a',
        'h2 a[href]',
        'h3 a[href]'
      ];

      const dedupe = new Map();
      const addHeadline = (text, href) => {
        if (!text) return;
        const normalized = text.replace(/\s+/g, ' ').trim();
        if (!normalized) return;
        // Evitar elementos de navegación comunes
        if (normalized.length < 15) return;
        const key = normalized.toLowerCase();
        if (!dedupe.has(key)) {
          dedupe.set(key, { text: normalized, href: href || '' });
        } else if (!dedupe.get(key).href && href) {
          dedupe.get(key).href = href;
        }
      };

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const anchor = el.tagName === 'A' ? el : el.closest('a');
          if (!anchor) return;
          const text = (anchor.textContent || '').trim();
          const rawHref = anchor.getAttribute('href') || '';
          let href = '';
          if (rawHref) {
            try {
              href = new URL(rawHref, baseUrl || dom.window.location.href).toString();
            } catch {
              href = rawHref;
            }
          }
          addHeadline(text, href);
        });
      });

      return Array.from(dedupe.values()).slice(0, 50);
    } catch (error) {
      console.warn('[WebSearchService] No se pudieron extraer titulares:', error.message);
      return [];
    }
  }

  async searchSite(targetUrl, query, options = {}) {
    if (!targetUrl || !query) {
      throw new Error('Se requieren "url" y "query" para la búsqueda en sitio.');
    }

    let domain = '';
    try {
      const parsed = new URL(targetUrl);
      domain = parsed.hostname;
    } catch (error) {
      const cleaned = targetUrl.replace(/^https?:\/\//i, '').split('/')[0].trim();
      if (cleaned) {
        domain = cleaned;
      }
    }

    if (!domain) {
      throw new Error('No se pudo determinar el dominio del sitio.');
    }

    const cfg = this.mergeOptions(options);
    const siteQuery = `site:${domain} ${query}`.trim();
    const results = await this.search(siteQuery, {
      ...cfg,
      maxResults: Math.min(options.maxResults || cfg.maxResults || 5, 10),
      allowedDomains: [domain]
    });

    // Garantizar que los resultados pertenezcan al dominio
    const filtered = results.filter(item => {
      if (!item.url) return false;
      try {
        const parsed = new URL(item.url);
        return parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`);
      } catch {
        return item.url.includes(domain);
      }
    });

    return filtered;
  }

  buildSummaryFromText(text = '', fallback = '') {
    if (text) {
      const paragraphs = text
        .split(/\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      if (paragraphs.length > 0) {
        let summary = paragraphs[0];
        if (summary.length < 160 && paragraphs[1]) {
          summary = `${summary} ${paragraphs[1]}`.trim();
        }
        if (summary.length > 600) {
          summary = `${summary.slice(0, 597)}…`;
        }
        return summary;
      }
    }
    return fallback || '';
  }

  getFallbackContentNode(document) {
    const selectors = [
      'article',
      'main',
      '.markdown-body',
      '.entry-content',
      '.article-body',
      '.post-content',
      '.content',
      '#readme',
      '.readme'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.innerHTML && el.innerHTML.trim().length > 0) {
        return el;
      }
    }

    return document.body || null;
  }

  buildStructuredContent({ url, html, rawHtml, metadata = {}, maxLength = 200000 }) {
    const dom = this.createDom(html, url);
    const document = dom.window.document;
    const reader = new Readability(document);
    const article = reader.parse();

    let contentHtml = article?.content || '';
    let title = article?.title || document.querySelector('title')?.textContent?.trim() || '';
    let excerpt = article?.excerpt || '';
    let byline = article?.byline || '';
    let textContent = article?.textContent || '';

    if (!contentHtml || (textContent && textContent.trim().length < 150)) {
      const fallbackNode = this.getFallbackContentNode(document);
      if (fallbackNode) {
        contentHtml = fallbackNode.innerHTML;
        textContent = fallbackNode.textContent || textContent;
        if (!title) {
          const heading = fallbackNode.querySelector('h1, h2');
          if (heading) {
            title = heading.textContent.trim();
          }
        }
      }
    }

    if (!contentHtml) {
      contentHtml = document.body ? document.body.innerHTML : html;
      textContent = document.body ? document.body.textContent : this.stripHtml(html);
    }

    const markdown = this.convertHtmlToMarkdown(contentHtml).slice(0, maxLength);
    const plainText = this.stripHtml(contentHtml || html).slice(0, maxLength);
    const headings = this.extractHeadingsFromHtml(contentHtml);
    const links = this.extractLinksFromHtml(contentHtml);
    const summary = this.buildSummaryFromText(plainText, excerpt || metadata.snippet);

    const headlineEntriesRaw = this.extractHeadlineLinks(rawHtml || html, url);
    const combinedHeadlinesMap = new Map();

    const addHeadline = (text, href) => {
      if (!text) return;
      const normalized = text.replace(/\s+/g, ' ').trim();
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (!combinedHeadlinesMap.has(key)) {
        combinedHeadlinesMap.set(key, { text: normalized, href: href || '' });
      } else if (!combinedHeadlinesMap.get(key).href && href) {
        combinedHeadlinesMap.get(key).href = href;
      }
    };

    if (Array.isArray(metadata.headlines)) {
      metadata.headlines.forEach(text => addHeadline(text));
    }

    headlineEntriesRaw.forEach(entry => addHeadline(entry.text, entry.href));
    headings.forEach(entry => addHeadline(entry.text));

    const combinedHeadlineEntries = Array.from(combinedHeadlinesMap.values());

    return {
      title,
      excerpt: summary || excerpt || '',
      markdown,
      plainText,
      contentHtml,
      headings,
      links,
      headlines: combinedHeadlineEntries.map(item => item.text).filter(Boolean),
      headlineLinks: combinedHeadlineEntries,
      byline: byline || undefined,
      wordCount: plainText ? plainText.split(/\s+/).filter(Boolean).length : undefined
    };
  }

  cleanSearchUrl(rawUrl = '') {
    if (!rawUrl) return '';

    let url = rawUrl;

    const uddgMatch = url.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      try {
        url = decodeURIComponent(uddgMatch[1]);
      } catch {
        url = uddgMatch[1];
      }
    }

    try {
      url = decodeURIComponent(url);
    } catch {
      // ignorar
    }

    url = url.trim().replace(/&rut=.*$/, '');

    return url;
  }

  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...options.headers
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;
      const maxLength = options.maxContentLength || this.config.maxContentLength;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const bufferChunk = Buffer.from(value);
        received += bufferChunk.length;
        if (received > maxLength) {
          const remaining = bufferChunk.length - (received - maxLength);
          if (remaining > 0) {
            chunks.push(bufferChunk.subarray(0, remaining));
          }
          break;
        }
        chunks.push(bufferChunk);
      }

      const buffer = Buffer.concat(chunks);
      return buffer.toString('utf-8');
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout exceeded');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async search(query, options = {}) {
    const cfg = this.mergeOptions(options);

    if (!query || typeof query !== 'string') {
      throw new Error('Query inválida');
    }

    if (cfg.mode === 'api' && cfg.api && cfg.api.endpoint) {
      return this.searchViaApi(query, cfg);
    }

    return this.searchViaScraping(query, cfg);
  }

  async searchViaApi(query, cfg) {
    if (!cfg.api.endpoint) {
      console.warn('[WebSearchService] Modo API seleccionado pero sin endpoint configurado. Usando scraping.');
      return this.searchViaScraping(query, cfg);
    }

    try {
      const payload = {
        query,
        maxResults: cfg.maxResults
      };

      const response = await fetch(cfg.api.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': cfg.api.key ? `Bearer ${cfg.api.key}` : undefined
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }

      const json = await response.json();
      if (!Array.isArray(json.results)) {
        throw new Error('Respuesta de API inválida (sin results)');
      }

      return json.results.slice(0, cfg.maxResults).map((item, idx) => ({
        index: idx + 1,
        title: item.title || item.name || 'Sin título',
        url: item.url || item.href || '',
        snippet: item.snippet || item.description || '',
        source: cfg.api.provider || 'api',
        fetchedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('[WebSearchService] Error en searchViaApi:', error.message);
      throw error;
    }
  }

  async searchViaScraping(query, cfg) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://duckduckgo.com/html/?q=${encodedQuery}&kl=wt-wt`;

      const html = await this.fetchWithTimeout(url, {
        timeoutMs: cfg.timeoutMs,
        maxContentLength: 250000
      });

      const resultBlocks = html.match(/<div class="result[^>]*">[\s\S]*?<\/div>/gi) || [];

      const results = [];

      for (const block of resultBlocks) {
        const linkMatch = block.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        if (!linkMatch) continue;

        const rawUrl = this.decodeHtmlEntities(linkMatch[1]);
        const cleanUrl = this.cleanSearchUrl(rawUrl);
        if (!cleanUrl) continue;

        if (!this.isDomainAllowed(cleanUrl, cfg.allowedDomains)) {
          continue;
        }

        const title = this.stripHtml(linkMatch[2]);
        if (!title) continue;

        const snippetMatch = block.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
          || block.match(/<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

        const snippetRaw = snippetMatch ? this.stripHtml(snippetMatch[1]) : '';
        const snippet = snippetRaw.length > 260 ? `${snippetRaw.slice(0, 257)}...` : snippetRaw;

        results.push({
          index: results.length + 1,
          title,
          url: cleanUrl,
          snippet,
          source: 'duckduckgo',
          fetchedAt: new Date().toISOString()
        });

        if (results.length >= cfg.maxResults) break;
      }

      return results;
    } catch (error) {
      console.error('[WebSearchService] Error en searchViaScraping:', error.message);
      throw error;
    }
  }

  async fetchPage(url, options = {}) {
    const cfg = this.mergeOptions(options);

    if (!this.isDomainAllowed(url, cfg.allowedDomains)) {
      throw new Error('Dominio no permitido');
    }

    const explicitRender = typeof options.render === 'boolean' ? options.render : null;
    const baseRenderMode = cfg.renderMode || 'static';
    let shouldRender = explicitRender === true || baseRenderMode === 'rendered';

    let html;
    let metadata = {};
    let originalHtml;
    if (shouldRender) {
      const renderResult = await this.fetchRenderedPage(url, cfg);
      html = renderResult.html;
      originalHtml = renderResult.originalHtml || renderResult.html;
      metadata = renderResult.metadata || {};
    } else {
      html = await this.fetchWithTimeout(url, {
        timeoutMs: cfg.timeoutMs,
        maxContentLength: cfg.maxContentLength,
        headers: {
          'Accept': 'text/html,application/xhtml+xml'
        }
      });
      originalHtml = html;

      // Fallback automático: si apenas hay contenido útil, intentar versión renderizada
      if (explicitRender !== false) {
        const plain = this.stripHtml(html);
        const hasNextRoot = /<div[^>]+id=["']__next["']/i.test(html);
        const isVeryShort = plain.length < 200;
        if ((hasNextRoot || isVeryShort) && baseRenderMode !== 'rendered') {
          try {
            const renderResult = await this.fetchRenderedPage(url, cfg);
            html = renderResult.html;
            originalHtml = renderResult.originalHtml || renderResult.html;
            metadata = renderResult.metadata || {};
          } catch (renderError) {
            console.warn('[WebSearchService] Render fallback falló, se mantiene HTML estático:', renderError.message);
          }
        }
      }
    }

    return {
      url,
      contentType: 'text/html',
      content: html,
      originalContent: originalHtml || html,
      fetchedAt: new Date().toISOString(),
      metadata
    };
  }

  async extractText(url, options = {}) {
    const cfg = this.mergeOptions(options);
    const page = await this.fetchPage(url, cfg);
    const baseHtml = page.originalContent || page.content;
    const fallbackSnippet = this.getSmartSnippet(baseHtml);
    const structured = this.buildStructuredContent({
      url,
      html: baseHtml,
      rawHtml: page.originalContent || baseHtml,
      metadata: {
        ...(page.metadata || {}),
        snippet: fallbackSnippet
      },
      maxLength: cfg.maxContentLength
    });

    const snippet = structured.excerpt || fallbackSnippet;

    return {
      url,
      title: structured.title || undefined,
      summary: structured.excerpt || undefined,
      text: structured.plainText,
      rawText: structured.plainText,
      markdown: structured.markdown,
      rawHtml: page.originalContent,
      contentHtml: structured.contentHtml,
      snippet,
      headlines: structured.headlines,
      headlineLinks: structured.headlineLinks,
      headings: structured.headings,
      links: structured.links,
      metadata: {
        byline: structured.byline,
        wordCount: structured.wordCount,
        headlines: structured.headlines,
        fetchedAt: page.fetchedAt
      },
      fetchedAt: page.fetchedAt
    };
  }

  getSmartSnippet(html = '') {
    if (!html) return '';

    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)
      || html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i);

    const fallback = metaMatch ? this.decodeHtmlEntities(metaMatch[1]).trim() : '';

    const text = this.stripHtml(html);
    if (!text) return fallback;

    const candidates = text.split(/\n+/)
      .map(line => line.trim())
      .filter(line => line.length >= 25 && line.length <= 280);

    const valid = candidates.find(line => {
      if (/cookie|aceptar cookies|suscríbete|newsletter/i.test(line)) return false;
      if (/Copyright|Todos los derechos/i.test(line)) return false;
      return true;
    });

    return valid || fallback || text.slice(0, 280);
  }

  async fetchRenderedPage(url, cfg) {
    return new Promise((resolve, reject) => {
      let finished = false;
      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          offscreen: true,
          javascript: true,
          sandbox: true,
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      win.webContents.on('will-navigate', (event) => {
        event.preventDefault();
      });

      const cleanup = (error, payload) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutHandle);
        if (!win.isDestroyed()) {
          win.destroy();
        }
        if (error) {
          reject(error);
        } else {
          resolve(payload);
        }
      };

      const timeoutHandle = setTimeout(() => {
        cleanup(new Error('Timeout renderizando página'));
      }, cfg.timeoutMs || 10000);

      const userAgent = cfg.userAgent || this.config.userAgent;
      if (userAgent) {
        win.webContents.setUserAgent(userAgent);
      }

      const renderDelay = Math.max(0, cfg.renderDelayMs || this.config.renderDelayMs || 0);

      win.webContents.once('did-finish-load', async () => {
        try {
          if (renderDelay > 0) {
            await new Promise(res => setTimeout(res, renderDelay));
          }
          const result = await win.webContents.executeJavaScript(`(() => {
            const html = document.documentElement.outerHTML;

            const mainCandidates = [
              '#main',
              'main',
              '.site-content',
              '.content-area',
              '.articles',
              '.post-list',
              '.entry-content'
            ];
            let mainHtml = '';
            for (const sel of mainCandidates) {
              const el = document.querySelector(sel);
              if (el) {
                mainHtml = el.innerHTML;
                break;
              }
            }
            if (!mainHtml) {
              mainHtml = document.body ? document.body.innerHTML : html;
            }

            const selectors = [
              'article h2 a',
              'article .entry-title a',
              'h2.entry-title a',
              'header h2 a',
              'h2.post-title a',
              'article h3 a',
              '.post h2 a',
              '.post h3 a',
              '.headline a'
            ];
            const headlines = [];
            const seen = new Set();
            selectors.forEach(sel => {
              document.querySelectorAll(sel).forEach(el => {
                const text = (el.textContent || '').trim();
                if (!text || text.length < 8) return;
                if (seen.has(text)) return;
                seen.add(text);
                headlines.push(text);
              });
            });

            return { html, mainHtml, headlines };
          })();`, true);

          const finalHtml = result.mainHtml ? `<!DOCTYPE html><html><body>${result.mainHtml}</body></html>` : result.html;
          cleanup(null, {
            html: finalHtml,
            originalHtml: result.html,
            metadata: { headlines: result.headlines }
          });
        } catch (error) {
          cleanup(error);
        }
      });

      win.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
        cleanup(new Error(`Error cargando página (${errorCode}): ${errorDescription}`));
      });

      win.loadURL(url);
    });
  }
}

module.exports = new WebSearchService();

