/**
 * MarkdownFormatter - Servicio para validar y corregir formato Markdown
 * Soluciona problemas de formato inconsistente en respuestas de IA
 */

class MarkdownFormatter {
  constructor() {
    this.formatRules = {
      // Reglas para encabezados
      headers: {
        pattern: /^(#{1,6})\s*(.+)$/gm,
        fix: (match, hashes, text) => {
          const level = hashes.length;
          return `${hashes} ${text.trim()}`;
        }
      },
      
      // Reglas para listas
      lists: {
        bullet: {
          pattern: /^(\s*)([-*+])\s+(.+)$/gm,
          fix: (match, indent, marker, text) => {
            return `${indent}${marker} ${text.trim()}`;
          }
        },
        numbered: {
          pattern: /^(\s*)(\d+\.)\s+(.+)$/gm,
          fix: (match, indent, number, text) => {
            return `${indent}${number} ${text.trim()}`;
          }
        }
      },
      
      // Reglas para bloques de código
      codeBlocks: {
        pattern: /```(\w+)?\n([\s\S]*?)```/g,
        fix: (match, lang, code) => {
          const language = lang || 'text';
          return `\`\`\`${language}\n${code.trim()}\n\`\`\``;
        }
      },
      
      // Reglas para texto en línea
      inlineCode: {
        pattern: /`([^`]+)`/g,
        fix: (match, code) => {
          return `\`${code.trim()}\``;
        }
      }
    };
  }

  /**
   * Analizar el contenido y detectar problemas de formato
   */
  analyzeFormat(content) {
    const issues = [];
    
    // Detectar encabezados mal formateados
    const headerIssues = this.detectHeaderIssues(content);
    if (headerIssues.length > 0) {
      issues.push({
        type: 'headers',
        count: headerIssues.length,
        issues: headerIssues
      });
    }
    
    // Detectar listas mal formateadas
    const listIssues = this.detectListIssues(content);
    if (listIssues.length > 0) {
      issues.push({
        type: 'lists',
        count: listIssues.length,
        issues: listIssues
      });
    }
    
    // Detectar bloques de código mal formateados
    const codeIssues = this.detectCodeIssues(content);
    if (codeIssues.length > 0) {
      issues.push({
        type: 'code',
        count: codeIssues.length,
        issues: codeIssues
      });
    }
    
    return {
      hasIssues: issues.length > 0,
      totalIssues: issues.reduce((sum, issue) => sum + issue.count, 0),
      issues: issues
    };
  }

  /**
   * Detectar problemas en encabezados
   */
  detectHeaderIssues(content) {
    const issues = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Detectar encabezados sin espacio después de #
      if (/^#{1,6}[^#\s]/.test(line)) {
        issues.push({
          line: index + 1,
          content: line,
          issue: 'Encabezado sin espacio después de #'
        });
      }
      
      // Detectar encabezados con formato inconsistente
      if (/^#{1,6}\s+[a-z]/.test(line)) {
        issues.push({
          line: index + 1,
          content: line,
          issue: 'Encabezado con formato inconsistente'
        });
      }
    });
    
    return issues;
  }

  /**
   * Detectar problemas en listas
   */
  detectListIssues(content) {
    const issues = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Detectar listas sin espacio después del marcador
      if (/^(\s*)([-*+])([^\s])/.test(line)) {
        issues.push({
          line: index + 1,
          content: line,
          issue: 'Lista sin espacio después del marcador'
        });
      }
      
      // Detectar listas numeradas mal formateadas
      if (/^(\s*)(\d+\.)([^\s])/.test(line)) {
        issues.push({
          line: index + 1,
          content: line,
          issue: 'Lista numerada sin espacio después del punto'
        });
      }
    });
    
    return issues;
  }

  /**
   * Detectar problemas en bloques de código
   */
  detectCodeIssues(content) {
    const issues = [];
    
    // Detectar bloques de código sin cerrar
    const codeBlockMatches = content.match(/```/g);
    if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
      issues.push({
        line: 'unknown',
        content: 'Bloque de código sin cerrar',
        issue: 'Bloque de código incompleto'
      });
    }
    
    return issues;
  }

  /**
   * Corregir formato del contenido
   */
  fixFormat(content) {
    let fixedContent = content;
    
    // Corregir encabezados
    fixedContent = this.fixHeaders(fixedContent);
    
    // Corregir listas
    fixedContent = this.fixLists(fixedContent);
    
    // Corregir bloques de código
    fixedContent = this.fixCodeBlocks(fixedContent);
    
    // Corregir texto en línea
    fixedContent = this.fixInlineCode(fixedContent);
    
    // Limpiar espacios extra
    fixedContent = this.cleanExtraSpaces(fixedContent);
    
    return fixedContent;
  }

  /**
   * Corregir encabezados
   */
  fixHeaders(content) {
    return content.replace(/^(#{1,6})([^#\s].*)$/gm, (match, hashes, text) => {
      return `${hashes} ${text.trim()}`;
    });
  }

  /**
   * Corregir listas
   */
  fixLists(content) {
    // Corregir listas con viñetas
    content = content.replace(/^(\s*)([-*+])([^\s].*)$/gm, (match, indent, marker, text) => {
      return `${indent}${marker} ${text.trim()}`;
    });
    
    // Corregir listas numeradas
    content = content.replace(/^(\s*)(\d+\.)([^\s].*)$/gm, (match, indent, number, text) => {
      return `${indent}${number} ${text.trim()}`;
    });
    
    // Corregir listas numeradas sin espacio después del punto
    content = content.replace(/^(\s*)(\d+\.)([^\s])/gm, (match, indent, number, text) => {
      return `${indent}${number} ${text}`;
    });
    
    return content;
  }

  /**
   * Corregir bloques de código
   */
  fixCodeBlocks(content) {
    // Asegurar que los bloques de código estén bien formateados
    return content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      return `\`\`\`${language}\n${code.trim()}\n\`\`\``;
    });
  }

  /**
   * Corregir código en línea
   */
  fixInlineCode(content) {
    return content.replace(/`([^`\n]+)`/g, (match, code) => {
      return `\`${code.trim()}\``;
    });
  }

  /**
   * Limpiar espacios extra
   */
  cleanExtraSpaces(content) {
    // Limpiar espacios al final de líneas
    content = content.replace(/[ \t]+$/gm, '');
    
    // Limpiar líneas vacías múltiples (máximo 2 consecutivas)
    content = content.replace(/\n{3,}/g, '\n\n');
    
    return content;
  }

  /**
   * Aplicar correcciones específicas para el problema de formato degradado
   */
  fixDegradedFormat(content) {
    // Detectar el patrón del problema: slides que pierden formato
    const slidePattern = /(Slide \d+: [^\n]+)/g;
    const diapositivaPattern = /(Diapositiva \d+: [^\n]+)/g;
    
    const slideMatches = content.match(slidePattern);
    const diapositivaMatches = content.match(diapositivaPattern);
    
    if (slideMatches) {
      // Aplicar formato de encabezado a los slides
      content = content.replace(slidePattern, (match) => {
        return `## ${match}`;
      });
    }
    
    if (diapositivaMatches) {
      // Aplicar formato de encabezado a las diapositivas
      content = content.replace(diapositivaPattern, (match) => {
        return `## ${match}`;
      });
    }
    
    // Detectar fórmulas matemáticas y ponerlas en bloques de código
    const formulaPattern = /([A-Za-z] = [^=]+)/g;
    content = content.replace(formulaPattern, (match) => {
      return `\`${match}\``;
    });
    
    // Detectar y corregir patrones específicos del problema
    content = this.fixSpecificPatterns(content);
    
    return content;
  }

  /**
   * Corregir patrones específicos del problema de formato degradado
   */
  fixSpecificPatterns(content) {
    // Patrón 1: Detectar "Diapositiva X:" que no tienen formato de encabezado
    content = content.replace(/^(Diapositiva \d+: [^\n]+)$/gm, (match) => {
      return `## ${match}`;
    });
    
    // Patrón 2: Detectar "Slide X:" que no tienen formato de encabezado
    content = content.replace(/^(Slide \d+: [^\n]+)$/gm, (match) => {
      return `## ${match}`;
    });
    
    // Patrón 3: Detectar títulos que están en negrita pero no son encabezados
    content = content.replace(/^\*\*([^*]+)\*\*$/gm, (match, title) => {
      // Solo convertir a encabezado si parece un título de diapositiva
      if (title.includes('Título:') || title.includes('Subtítulo:')) {
        return `### ${title}`;
      }
      return match; // Mantener negrita si no es un título
    });
    
    // Patrón 4: Detectar listas que perdieron formato
    content = content.replace(/^([A-Z][^:]+:)$/gm, (match) => {
      return `**${match}**`;
    });
    
    // Patrón 5: Detectar elementos de lista que perdieron viñetas
    content = content.replace(/^(\s*)([A-Z][^:]+:)$/gm, (match, indent, text) => {
      return `${indent}- **${text}**`;
    });
    
    // Patrón 6: Detectar fórmulas matemáticas sin formato
    content = content.replace(/^([A-Za-z] = [^=]+)$/gm, (match) => {
      return `\`${match}\``;
    });
    
    // Patrón 7: Detectar bloques de código que perdieron formato
    content = content.replace(/^(\s*)(def |class |import |from |if |for |while |def\w+\([^)]*\):)/gm, (match, indent, code) => {
      return `${indent}\`\`\`python\n${code.trim()}\n\`\`\``;
    });
    
    return content;
  }

  /**
   * Procesar contenido completo con todas las correcciones
   */
  processContent(content) {
    if (!content || typeof content !== 'string') {
      return content;
    }
    
    // Analizar el contenido
    const analysis = this.analyzeFormat(content);
    
    // Aplicar correcciones básicas
    let fixedContent = this.fixFormat(content);
    
    // Aplicar correcciones específicas para formato degradado
    fixedContent = this.fixDegradedFormat(fixedContent);
    
    return {
      original: content,
      fixed: fixedContent,
      analysis: analysis,
      wasFixed: content !== fixedContent
    };
  }
}

// Exportar instancia singleton
export const markdownFormatter = new MarkdownFormatter();
export default markdownFormatter;
