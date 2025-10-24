/**
 * SmartFileDetectionService - Servicio inteligente para detectar tipos de archivos
 * que puede generar la IA basándose en el contexto de la conversación
 * Similar a ChatGPT, analiza patrones y sugiere tipos de archivos relevantes
 */

class SmartFileDetectionService {
  constructor() {
    this.fileTypePatterns = this.initializeFileTypePatterns();
    this.contextKeywords = this.initializeContextKeywords();
    this.languagePatterns = this.initializeLanguagePatterns();
  }

  /**
   * Inicializa los patrones de detección para diferentes tipos de archivos
   */
  initializeFileTypePatterns() {
    return {
      // Archivos de código
      'javascript': {
        extensions: ['.js', '.jsx', '.mjs', '.ts', '.tsx'],
        keywords: ['javascript', 'js', 'node', 'react', 'vue', 'angular', 'typescript', 'ts', 'jsx', 'tsx', 'npm', 'yarn', 'webpack', 'babel'],
        patterns: [
          /function\s+\w+\s*\(/,
          /const\s+\w+\s*=/,
          /import\s+.*from/,
          /export\s+/,
          /console\.log/,
          /document\./,
          /window\./,
          /require\(/,
          /module\.exports/
        ],
        description: 'Archivos JavaScript/TypeScript',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#f7df1e'
      },
      'python': {
        extensions: ['.py', '.pyw', '.pyc', '.pyo'],
        keywords: ['python', 'py', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'matplotlib', 'tensorflow', 'pytorch', 'pip', 'conda', 'virtualenv'],
        patterns: [
          /def\s+\w+\s*\(/,
          /import\s+\w+/,
          /from\s+\w+\s+import/,
          /class\s+\w+/,
          /if\s+__name__\s*==\s*['"]__main__['"]/,
          /print\s*\(/,
          /#.*python/i
        ],
        description: 'Archivos Python',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#3776ab'
      },
      'java': {
        extensions: ['.java', '.class', '.jar'],
        keywords: ['java', 'spring', 'maven', 'gradle', 'jvm', 'jdk', 'jre', 'servlet', 'jsp', 'hibernate', 'mybatis'],
        patterns: [
          /public\s+class\s+\w+/,
          /import\s+java\./,
          /package\s+\w+/,
          /@Override/,
          /@Service/,
          /@Controller/,
          /System\.out\.print/
        ],
        description: 'Archivos Java',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#ed8b00'
      },
      'cpp': {
        extensions: ['.cpp', '.cc', '.cxx', '.c++', '.hpp', '.h', '.hxx'],
        keywords: ['c++', 'cpp', 'c', 'gcc', 'g++', 'cmake', 'make', 'stl', 'boost', 'qt', 'opengl', 'directx'],
        patterns: [
          /#include\s*<.*>/,
          /using\s+namespace/,
          /class\s+\w+/,
          /int\s+main\s*\(/,
          /std::/,
          /cout\s*<</,
          /cin\s*>>/
        ],
        description: 'Archivos C/C++',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#00599c'
      },
      'csharp': {
        extensions: ['.cs', '.csx'],
        keywords: ['c#', 'csharp', 'dotnet', '.net', 'asp.net', 'mvc', 'entity framework', 'linq', 'nuget', 'visual studio'],
        patterns: [
          /using\s+System/,
          /namespace\s+\w+/,
          /public\s+class\s+\w+/,
          /Console\.WriteLine/,
          /[A-Z]\w+\s+\w+\s*{/,
          /get;\s*set;/
        ],
        description: 'Archivos C#',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#239120'
      },
      'php': {
        extensions: ['.php', '.phtml', '.php3', '.php4', '.php5'],
        keywords: ['php', 'laravel', 'symfony', 'codeigniter', 'wordpress', 'drupal', 'composer', 'apache', 'nginx'],
        patterns: [
          /<\?php/,
          /\$[a-zA-Z_][a-zA-Z0-9_]*/,
          /function\s+\w+\s*\(/,
          /class\s+\w+/,
          /echo\s+/,
          /require\s+['"]/,
          /include\s+['"]/
        ],
        description: 'Archivos PHP',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#777bb4'
      },
      'go': {
        extensions: ['.go'],
        keywords: ['golang', 'go', 'goroutine', 'channel', 'gofmt', 'go mod', 'gin', 'echo', 'fiber'],
        patterns: [
          /package\s+\w+/,
          /import\s+['"]/,
          /func\s+\w+\s*\(/,
          /type\s+\w+\s+struct/,
          /go\s+func/,
          /make\s*\(/,
          /chan\s+/
        ],
        description: 'Archivos Go',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#00add8'
      },
      'rust': {
        extensions: ['.rs'],
        keywords: ['rust', 'cargo', 'crate', 'tokio', 'serde', 'actix', 'rocket', 'warp'],
        patterns: [
          /fn\s+\w+\s*\(/,
          /let\s+\w+/,
          /use\s+\w+/,
          /struct\s+\w+/,
          /impl\s+\w+/,
          /match\s+\w+/,
          /Result<.*>/
        ],
        description: 'Archivos Rust',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#000000'
      },

      // Archivos de datos
      'json': {
        extensions: ['.json'],
        keywords: ['json', 'api', 'rest', 'ajax', 'fetch', 'axios', 'http', 'restful', 'endpoint', 'response'],
        patterns: [
          /[{}[\]]/,
          /"[^"]*"\s*:/,
          /true|false|null/,
          /JSON\./,
          /\.json/
        ],
        description: 'Archivos JSON',
        category: 'data',
        icon: 'pi pi-file',
        color: '#000000'
      },
      'xml': {
        extensions: ['.xml', '.xsd', '.xsl', '.xslt'],
        keywords: ['xml', 'xpath', 'xslt', 'xsd', 'soap', 'rss', 'atom', 'sitemap', 'config'],
        patterns: [
          /<\?xml/,
          /<[^>]+>/,
          /<\/[^>]+>/,
          /<!DOCTYPE/,
          /<!\[CDATA\[/
        ],
        description: 'Archivos XML',
        category: 'data',
        icon: 'pi pi-file',
        color: '#ff6600'
      },
      'csv': {
        extensions: ['.csv'],
        keywords: ['csv', 'excel', 'spreadsheet', 'data', 'table', 'import', 'export', 'pandas', 'dataframe'],
        patterns: [
          /,.*,/,
          /".*",.*"/,
          /excel/i,
          /spreadsheet/i,
          /data\s+table/i
        ],
        description: 'Archivos CSV',
        category: 'data',
        icon: 'pi pi-table',
        color: '#1f6b75'
      },
      'yaml': {
        extensions: ['.yml', '.yaml'],
        keywords: ['yaml', 'yml', 'docker', 'kubernetes', 'k8s', 'ansible', 'github actions', 'ci/cd', 'config'],
        patterns: [
          /^[a-zA-Z_][a-zA-Z0-9_]*:/,
          /^\s*-\s/,
          /^\s*[a-zA-Z_][a-zA-Z0-9_]*:/,
          /---/,
          /\.\.\./
        ],
        description: 'Archivos YAML',
        category: 'config',
        icon: 'pi pi-file',
        color: '#cb171e'
      },

      // Archivos de configuración
      'dockerfile': {
        extensions: ['Dockerfile', '.dockerfile'],
        keywords: ['docker', 'container', 'image', 'dockerfile', 'kubernetes', 'k8s', 'deployment', 'microservice'],
        patterns: [
          /FROM\s+/,
          /RUN\s+/,
          /COPY\s+/,
          /WORKDIR\s+/,
          /EXPOSE\s+/,
          /CMD\s+/,
          /ENTRYPOINT\s+/
        ],
        description: 'Dockerfiles',
        category: 'config',
        icon: 'pi pi-cog',
        color: '#2496ed'
      },
      'docker-compose': {
        extensions: ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'],
        keywords: ['docker-compose', 'compose', 'services', 'networks', 'volumes', 'environment', 'ports'],
        patterns: [
          /version:\s*['"]/,
          /services:/,
          /networks:/,
          /volumes:/,
          /environment:/,
          /ports:/
        ],
        description: 'Docker Compose',
        category: 'config',
        icon: 'pi pi-cog',
        color: '#2496ed'
      },
      'nginx': {
        extensions: ['.conf', '.nginx'],
        keywords: ['nginx', 'proxy', 'load balancer', 'reverse proxy', 'server', 'upstream', 'location'],
        patterns: [
          /server\s*{/,
          /location\s+\//,
          /upstream\s+\w+/,
          /proxy_pass/,
          /listen\s+\d+/
        ],
        description: 'Configuración Nginx',
        category: 'config',
        icon: 'pi pi-server',
        color: '#009639'
      },
      'apache': {
        extensions: ['.conf', '.htaccess'],
        keywords: ['apache', 'httpd', 'htaccess', 'mod_rewrite', 'virtual host', 'directory', 'allow', 'deny'],
        patterns: [
          /<VirtualHost/,
          /<Directory/,
          /RewriteEngine\s+On/,
          /AllowOverride/,
          /DocumentRoot/
        ],
        description: 'Configuración Apache',
        category: 'config',
        icon: 'pi pi-server',
        color: '#d22128'
      },

      // Archivos de documentación
      'markdown': {
        extensions: ['.md', '.markdown'],
        keywords: ['markdown', 'md', 'readme', 'documentation', 'wiki', 'github', 'gitlab', 'docs'],
        patterns: [
          /^#\s+/,
          /^\*\s+/,
          /^\d+\.\s+/,
          /\[.*\]\(.*\)/,
          /```/,
          /^---$/
        ],
        description: 'Archivos Markdown',
        category: 'documentation',
        icon: 'pi pi-file',
        color: '#083fa1'
      },
      'html': {
        extensions: ['.html', '.htm', '.xhtml'],
        keywords: ['html', 'htm', 'web', 'page', 'website', 'browser', 'dom', 'css', 'javascript'],
        patterns: [
          /<!DOCTYPE\s+html/i,
          /<html/,
          /<head>/,
          /<body>/,
          /<div/,
          /<span/,
          /<p>/,
          /<a\s+href/
        ],
        description: 'Archivos HTML',
        category: 'web',
        icon: 'pi pi-globe',
        color: '#e34f26'
      },
      'css': {
        extensions: ['.css', '.scss', '.sass', '.less'],
        keywords: ['css', 'scss', 'sass', 'less', 'stylesheet', 'styling', 'responsive', 'bootstrap', 'tailwind'],
        patterns: [
          /\.[a-zA-Z][a-zA-Z0-9_-]*\s*\{/,
          /#[a-fA-F0-9]{3,6}/,
          /@media/,
          /@import/,
          /@keyframes/,
          /margin|padding|border|color|background/
        ],
        description: 'Archivos CSS',
        category: 'web',
        icon: 'pi pi-palette',
        color: '#1572b6'
      },

      // Archivos de base de datos
      'sql': {
        extensions: ['.sql'],
        keywords: ['sql', 'database', 'mysql', 'postgresql', 'sqlite', 'oracle', 'mssql', 'query', 'table', 'select', 'insert', 'update', 'delete'],
        patterns: [
          /SELECT\s+.*FROM/i,
          /INSERT\s+INTO/i,
          /UPDATE\s+.*SET/i,
          /DELETE\s+FROM/i,
          /CREATE\s+TABLE/i,
          /ALTER\s+TABLE/i,
          /DROP\s+TABLE/i
        ],
        description: 'Archivos SQL',
        category: 'database',
        icon: 'pi pi-database',
        color: '#336791'
      },

      // Archivos de configuración de sistemas
      'bash': {
        extensions: ['.sh', '.bash'],
        keywords: ['bash', 'shell', 'script', 'linux', 'unix', 'terminal', 'command', 'automation', 'deploy'],
        patterns: [
          /#!\/bin\/bash/,
          /#!\/bin\/sh/,
          /if\s+\[/,
          /for\s+\w+\s+in/,
          /while\s+\[/,
          /echo\s+/,
          /cd\s+/,
          /ls\s+/
        ],
        description: 'Scripts Bash',
        category: 'scripting',
        icon: 'pi pi-terminal',
        color: '#4eaa25'
      },
      'powershell': {
        extensions: ['.ps1', '.psm1', '.psd1'],
        keywords: ['powershell', 'ps1', 'windows', 'automation', 'cmdlet', 'module', 'script'],
        patterns: [
          /function\s+\w+/,
          /param\s*\(/,
          /Get-/,
          /Set-/,
          /Write-/,
          /$[a-zA-Z_][a-zA-Z0-9_]*/,
          /\.ps1/
        ],
        description: 'Scripts PowerShell',
        category: 'scripting',
        icon: 'pi pi-terminal',
        color: '#012456'
      },

      // Archivos de configuración de desarrollo
      'gitignore': {
        extensions: ['.gitignore'],
        keywords: ['git', 'gitignore', 'version control', 'repository', 'commit', 'push', 'pull'],
        patterns: [
          /^#/,
          /^\*/,
          /^\./,
          /node_modules/,
          /\.env/,
          /dist/,
          /build/
        ],
        description: 'Archivos .gitignore',
        category: 'config',
        icon: 'pi pi-github',
        color: '#f05032'
      },
      'env': {
        extensions: ['.env', '.env.local', '.env.production', '.env.development'],
        keywords: ['environment', 'env', 'variables', 'config', 'settings', 'api key', 'secret', 'database'],
        patterns: [
          /^[A-Z_][A-Z0-9_]*=/,
          /API_KEY/,
          /DATABASE_URL/,
          /SECRET/,
          /PASSWORD/,
          /TOKEN/
        ],
        description: 'Archivos de entorno',
        category: 'config',
        icon: 'pi pi-cog',
        color: '#ff6b6b'
      }
    };
  }

  /**
   * Inicializa palabras clave de contexto
   */
  initializeContextKeywords() {
    return {
      'web_development': ['website', 'web', 'frontend', 'backend', 'fullstack', 'browser', 'responsive', 'mobile'],
      'data_science': ['data', 'analysis', 'machine learning', 'ai', 'ml', 'dataset', 'statistics', 'visualization'],
      'mobile_development': ['mobile', 'app', 'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin'],
      'devops': ['deploy', 'ci/cd', 'pipeline', 'infrastructure', 'cloud', 'aws', 'azure', 'docker', 'kubernetes'],
      'database': ['database', 'db', 'sql', 'nosql', 'mongodb', 'mysql', 'postgresql', 'redis'],
      'automation': ['script', 'automation', 'task', 'cron', 'scheduled', 'batch', 'workflow'],
      'documentation': ['documentation', 'readme', 'guide', 'tutorial', 'manual', 'wiki', 'docs'],
      'testing': ['test', 'testing', 'unit test', 'integration test', 'jest', 'mocha', 'cypress', 'selenium'],
      'security': ['security', 'auth', 'authentication', 'authorization', 'jwt', 'oauth', 'ssl', 'tls', 'encryption']
    };
  }

  /**
   * Inicializa patrones de lenguajes de programación
   */
  initializeLanguagePatterns() {
    return {
      'javascript': ['js', 'javascript', 'node', 'react', 'vue', 'angular', 'typescript'],
      'python': ['python', 'py', 'django', 'flask', 'fastapi', 'pandas', 'numpy'],
      'java': ['java', 'spring', 'maven', 'gradle'],
      'cpp': ['c++', 'cpp', 'c', 'gcc', 'g++'],
      'csharp': ['c#', 'csharp', 'dotnet', '.net'],
      'php': ['php', 'laravel', 'symfony'],
      'go': ['golang', 'go'],
      'rust': ['rust'],
      'ruby': ['ruby', 'rails', 'gem'],
      'swift': ['swift', 'ios'],
      'kotlin': ['kotlin', 'android'],
      'scala': ['scala', 'spark'],
      'r': ['r', 'statistics'],
      'matlab': ['matlab', 'simulink'],
      'perl': ['perl'],
      'lua': ['lua'],
      'dart': ['dart', 'flutter']
    };
  }

  /**
   * Analiza el contexto de la conversación para detectar tipos de archivos relevantes
   * @param {Array} messages - Array de mensajes de la conversación
   * @param {string} currentInput - Input actual del usuario
   * @returns {Array} Array de tipos de archivos detectados con su relevancia
   */
  analyzeContext(messages, currentInput = '') {
    const context = this.extractContext(messages, currentInput);
    const detectedTypes = this.detectFileTypes(context);
    return this.rankFileTypes(detectedTypes, context);
  }

  /**
   * Extrae contexto relevante de los mensajes
   */
  extractContext(messages, currentInput) {
    const allText = [
      currentInput,
      ...messages.slice(-10).map(msg => msg.content || '')
    ].join(' ').toLowerCase();

    return {
      text: allText,
      keywords: this.extractKeywords(allText),
      patterns: this.extractPatterns(allText),
      context: this.identifyContext(allText),
      languages: this.identifyLanguages(allText)
    };
  }

  /**
   * Extrae palabras clave del texto
   */
  extractKeywords(text) {
    const words = text.split(/\s+/)
      .filter(word => word.length > 2)
      .map(word => word.replace(/[^\w]/g, ''));
    
    return [...new Set(words)];
  }

  /**
   * Extrae patrones de código del texto
   */
  extractPatterns(text) {
    const patterns = [];
    Object.values(this.fileTypePatterns).forEach(fileType => {
      fileType.patterns.forEach(pattern => {
        if (pattern.test(text)) {
          patterns.push(pattern);
        }
      });
    });
    return patterns;
  }

  /**
   * Identifica el contexto general de la conversación
   */
  identifyContext(text) {
    const contexts = [];
    Object.entries(this.contextKeywords).forEach(([context, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        contexts.push({
          name: context,
          matches: matches,
          score: matches.length
        });
      }
    });
    return contexts;
  }

  /**
   * Identifica lenguajes de programación mencionados
   */
  identifyLanguages(text) {
    const languages = [];
    Object.entries(this.languagePatterns).forEach(([lang, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        languages.push({
          name: lang,
          matches: matches,
          score: matches.length
        });
      }
    });
    return languages;
  }

  /**
   * Detecta tipos de archivos basándose en el contexto
   */
  detectFileTypes(context) {
    const detected = [];

    Object.entries(this.fileTypePatterns).forEach(([type, config]) => {
      let score = 0;
      const reasons = [];

      // Verificar palabras clave
      const keywordMatches = config.keywords.filter(keyword => 
        context.text.includes(keyword.toLowerCase())
      );
      if (keywordMatches.length > 0) {
        score += keywordMatches.length * 2;
        reasons.push(`Palabras clave: ${keywordMatches.join(', ')}`);
      }

      // Verificar patrones de código
      const patternMatches = config.patterns.filter(pattern => 
        pattern.test(context.text)
      );
      if (patternMatches.length > 0) {
        score += patternMatches.length * 3;
        reasons.push(`Patrones de código detectados`);
      }

      // Verificar contexto específico
      context.context.forEach(ctx => {
        if (this.isContextRelevant(type, ctx.name)) {
          score += ctx.score;
          reasons.push(`Contexto: ${ctx.name}`);
        }
      });

      // Verificar lenguajes de programación
      context.languages.forEach(lang => {
        if (this.isLanguageRelevant(type, lang.name)) {
          score += lang.score * 2;
          reasons.push(`Lenguaje: ${lang.name}`);
        }
      });

      if (score > 0) {
        detected.push({
          type,
          score,
          reasons,
          config: {
            description: config.description,
            category: config.category,
            icon: config.icon,
            color: config.color,
            extensions: config.extensions
          }
        });
      }
    });

    return detected;
  }

  /**
   * Verifica si un contexto es relevante para un tipo de archivo
   */
  isContextRelevant(fileType, contextName) {
    const relevanceMap = {
      'javascript': ['web_development', 'mobile_development', 'testing'],
      'python': ['data_science', 'web_development', 'automation'],
      'java': ['web_development', 'mobile_development'],
      'cpp': ['web_development', 'mobile_development'],
      'csharp': ['web_development', 'mobile_development'],
      'php': ['web_development'],
      'go': ['web_development', 'devops'],
      'rust': ['web_development', 'devops'],
      'json': ['web_development', 'data_science'],
      'xml': ['web_development', 'data_science'],
      'csv': ['data_science', 'database'],
      'yaml': ['devops', 'config'],
      'dockerfile': ['devops'],
      'docker-compose': ['devops'],
      'nginx': ['devops', 'web_development'],
      'apache': ['devops', 'web_development'],
      'markdown': ['documentation'],
      'html': ['web_development'],
      'css': ['web_development'],
      'sql': ['database', 'web_development'],
      'bash': ['devops', 'automation'],
      'powershell': ['automation', 'devops'],
      'gitignore': ['devops'],
      'env': ['devops', 'web_development']
    };

    return relevanceMap[fileType]?.includes(contextName) || false;
  }

  /**
   * Verifica si un lenguaje es relevante para un tipo de archivo
   */
  isLanguageRelevant(fileType, languageName) {
    return this.languagePatterns[languageName]?.includes(fileType) || false;
  }

  /**
   * Clasifica los tipos de archivos por relevancia
   */
  rankFileTypes(detectedTypes, context) {
    return detectedTypes
      .sort((a, b) => b.score - a.score)
      .slice(0, 8) // Top 8 tipos más relevantes
      .map(item => ({
        ...item,
        confidence: Math.min(item.score / 10, 1), // Normalizar a 0-1
        suggested: item.score > 5
      }));
  }

  /**
   * Obtiene sugerencias inteligentes de tipos de archivos
   * @param {Array} messages - Mensajes de la conversación
   * @param {string} currentInput - Input actual
   * @returns {Object} Objeto con tipos detectados y sugerencias
   */
  getSmartSuggestions(messages, currentInput = '') {
    const detected = this.analyzeContext(messages, currentInput);
    
    return {
      detected: detected,
      suggestions: this.generateSuggestions(detected),
      context: this.getContextSummary(detected),
      confidence: this.calculateOverallConfidence(detected)
    };
  }

  /**
   * Genera sugerencias basadas en los tipos detectados
   */
  generateSuggestions(detectedTypes) {
    const suggestions = [];
    
    detectedTypes.forEach(item => {
      if (item.suggested) {
        suggestions.push({
          type: item.type,
          description: item.config.description,
          icon: item.config.icon,
          color: item.config.color,
          extensions: item.config.extensions,
          confidence: item.confidence,
          reasons: item.reasons
        });
      }
    });

    return suggestions;
  }

  /**
   * Obtiene un resumen del contexto detectado
   */
  getContextSummary(detectedTypes) {
    const categories = {};
    detectedTypes.forEach(item => {
      const category = item.config.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item.type);
    });

    return {
      categories,
      totalTypes: detectedTypes.length,
      suggestedTypes: detectedTypes.filter(item => item.suggested).length
    };
  }

  /**
   * Calcula la confianza general de la detección
   */
  calculateOverallConfidence(detectedTypes) {
    if (detectedTypes.length === 0) return 0;
    
    const totalScore = detectedTypes.reduce((sum, item) => sum + item.score, 0);
    const maxPossibleScore = detectedTypes.length * 10;
    
    return Math.min(totalScore / maxPossibleScore, 1);
  }

  /**
   * Obtiene todos los tipos de archivos disponibles
   */
  getAllFileTypes() {
    return Object.entries(this.fileTypePatterns).map(([type, config]) => ({
      type,
      description: config.description,
      category: config.category,
      icon: config.icon,
      color: config.color,
      extensions: config.extensions
    }));
  }

  /**
   * Obtiene tipos de archivos por categoría
   */
  getFileTypesByCategory(category) {
    return Object.entries(this.fileTypePatterns)
      .filter(([type, config]) => config.category === category)
      .map(([type, config]) => ({
        type,
        description: config.description,
        icon: config.icon,
        color: config.color,
        extensions: config.extensions
      }));
  }
}

// Crear instancia singleton
const smartFileDetectionService = new SmartFileDetectionService();

export default smartFileDetectionService;
