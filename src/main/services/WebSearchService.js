const { URL } = require('url');
class WebSearchService {
  constructor() {
    this.defaultConfig = {
      mode: 'scraping', // scraping | api
      maxResults: 5,
      maxContentLength: 200000, // 200 KB
      timeoutMs: 5000,
      allowedDomains: [],
      userAgent: 'NodeTerm-WebSearch/1.0',
      api: {
        endpoint: '',
        key: '',
        provider: ''
      }
    };

    this.config = { ...this.defaultConfig };
  }

  updateConfig(partial = {}) {
    this.config = {
      ...this.defaultConfig,
      ...partial,
      api: {
        ...this.defaultConfig.api,
        ...(partial.api || {})
      }
    };
  }

  mergeOptions(options = {}) {
    return {
      ...this.config,
      ...options,
      api: {
        ...this.config.api,
        ...(options.api || {})
      }
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
    return this.decodeHtmlEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
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

    const html = await this.fetchWithTimeout(url, {
      timeoutMs: cfg.timeoutMs,
      maxContentLength: cfg.maxContentLength,
      headers: {
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    return {
      url,
      contentType: 'text/html',
      content: html,
      fetchedAt: new Date().toISOString()
    };
  }

  async extractText(url, options = {}) {
    const cfg = this.mergeOptions(options);
    const page = await this.fetchPage(url, cfg);
    const text = this.stripHtml(page.content);

    return {
      url,
      text: text.slice(0, cfg.maxContentLength),
      fetchedAt: page.fetchedAt
    };
  }

}

module.exports = new WebSearchService();

