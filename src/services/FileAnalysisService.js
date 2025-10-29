/**
 * FileAnalysisService - Servicio para analizar y procesar archivos para el chat de IA
 * Soporta PDF, TXT, DOC, DOCX, CSV, JSON, XML, RTF, ODT, imágenes y más
 */

import pako from 'pako';

class FileAnalysisService {
  constructor() {
    this.supportedTypes = {
      // Documentos de texto
      'text/plain': { type: 'text', processor: 'processTextFile' },
      'application/txt': { type: 'text', processor: 'processTextFile' },
      
      // PDFs
      'application/pdf': { type: 'pdf', processor: 'processPDFFile' },
      
      // Documentos de Microsoft
      'application/msword': { type: 'doc', processor: 'processDocFile' },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { type: 'docx', processor: 'processDocxFile' },
      'application/vnd.ms-word.document.macroEnabled.12': { type: 'docm', processor: 'processDocxFile' },
      
      // PowerPoint
      'application/vnd.ms-powerpoint': { type: 'ppt', processor: 'processPptFile' },
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': { type: 'pptx', processor: 'processPptxFile' },
      
      // Excel
      'application/vnd.ms-excel': { type: 'xls', processor: 'processXlsFile' },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { type: 'xlsx', processor: 'processXlsxFile' },
      
      // Documentos OpenDocument
      'application/vnd.oasis.opendocument.text': { type: 'odt', processor: 'processOdtFile' },
      'application/vnd.oasis.opendocument.spreadsheet': { type: 'ods', processor: 'processOdsFile' },
      
      // Rich Text Format
      'application/rtf': { type: 'rtf', processor: 'processRtfFile' },
      'text/rtf': { type: 'rtf', processor: 'processRtfFile' },
      
      // XML
      'application/xml': { type: 'xml', processor: 'processXMLFile' },
      'text/xml': { type: 'xml', processor: 'processXMLFile' },
      
      // HTML
      'text/html': { type: 'html', processor: 'processHtmlFile' },
      'application/xhtml+xml': { type: 'html', processor: 'processHtmlFile' },
      
      // Markdown
      'text/markdown': { type: 'markdown', processor: 'processMarkdownFile' },
      'text/x-markdown': { type: 'markdown', processor: 'processMarkdownFile' },
      
      // Hojas de cálculo
      'text/csv': { type: 'csv', processor: 'processCSVFile' },
      'application/csv': { type: 'csv', processor: 'processCSVFile' },
      
      // JSON
      'application/json': { type: 'json', processor: 'processJSONFile' },
      
      // Imágenes
      'image/jpeg': { type: 'image', processor: 'processImageFile' },
      'image/jpg': { type: 'image', processor: 'processImageFile' },
      'image/png': { type: 'image', processor: 'processImageFile' },
      'image/gif': { type: 'image', processor: 'processImageFile' },
      'image/webp': { type: 'image', processor: 'processImageFile' },
      'image/svg+xml': { type: 'image', processor: 'processImageFile' }
    };
    
    // Mapeo de extensiones de archivo a tipos MIME (para fallback cuando el navegador no detecta)
    this.extensionMimeTypes = {
      'txt': 'text/plain',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'docm': 'application/vnd.ms-word.document.macroEnabled.12',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'odt': 'application/vnd.oasis.opendocument.text',
      'ods': 'application/vnd.oasis.opendocument.spreadsheet',
      'rtf': 'application/rtf',
      'xml': 'application/xml',
      'html': 'text/html',
      'htm': 'text/html',
      'md': 'text/markdown',
      'markdown': 'text/markdown',
      'csv': 'text/csv',
      'json': 'application/json',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    
    this.maxFileSize = 50 * 1024 * 1024; // 50MB por defecto
  }

  /**
   * Genera un resumen corto y estable del archivo para orientar al modelo
   * sin exponer contenido completo.
   */
  generateFileSummary(fileData) {
    try {
      if (!fileData) return '';
      const { name, type, sizeFormatted, category, content } = fileData;
      const parts = [];
      parts.push(`Archivo: ${name}`);
      parts.push(`Tipo: ${type}`);
      parts.push(`Tamaño: ${sizeFormatted}`);
      parts.push(`Categoría: ${category}`);

      // Añadir detalles breves según la categoría
      if (category === 'pdf' && content?.pages) {
        parts.push(`Páginas: ${content.pages}`);
        if (content?.wordCount) parts.push(`Palabras: ${content.wordCount}`);
      } else if (category === 'csv' && content?.rows != null && content?.columns != null) {
        parts.push(`Filas: ${content.rows}, Columnas: ${content.columns}`);
      } else if (category === 'json' && Array.isArray(content?.keys)) {
        parts.push(`Claves: ${content.keys.slice(0, 8).join(', ')}${content.keys.length > 8 ? '…' : ''}`);
      } else if (category === 'docx' && (content?.words || content?.lines)) {
        if (content?.words) parts.push(`Palabras: ${content.words}`);
        if (content?.lines) parts.push(`Líneas: ${content.lines}`);
      } else if (category === 'text' && (content?.lines || content?.characters)) {
        parts.push(`Líneas: ${content.lines}, Caracteres: ${content.characters}`);
      } else if (category === 'xml' && content?.rootElement) {
        parts.push(`Raíz: ${content.rootElement}`);
      }

      return `Resumen de archivo — ${parts.join(' • ')}`;
    } catch (e) {
      return '';
    }
  }

  /**
   * Extrae texto bruto del contenido procesado según la categoría.
   */
  extractPlainText(content, category) {
    if (!content) return '';
    switch (category) {
      case 'text':
        return content.text || '';
      case 'pdf':
        return content.text || '';
      case 'docx':
        return content.text || '';
      case 'csv':
        // Preferir vista previa textual
        if (content.preview) return content.preview;
        return '';
      case 'json':
        return content.text || (typeof content === 'string' ? content : JSON.stringify(content).slice(0, 4000));
      case 'xml':
        return content.plainText || content.text || '';
      case 'rtf':
        return content.text || '';
      case 'odt':
        return content.text || '';
      case 'html':
        return content.plainText || content.text || '';
      default:
        return '';
    }
  }

  /**
   * Construye un contexto efímero (RAG ligero) para inyectar al prompt:
   * incluye un resumen breve por archivo y los fragmentos más relevantes
   * respecto a la consulta del usuario, limitado en tamaño.
   */
  buildEphemeralContext(attachedFiles = [], userQuery = '', options = {}) {
    try {
      if (!Array.isArray(attachedFiles) || attachedFiles.length === 0) return '';
      const maxChars = options.maxChars || 2000;
      const maxPerFile = Math.max(300, Math.floor(maxChars / attachedFiles.length));
      const stopWords = new Set(['el','la','los','las','de','del','y','o','u','que','en','a','un','una','para','con','por','es','son','al','se','lo','su','sus','como','si','no','más','menos','the','of','and','to','in','for','on','is','are']);
      const qTokens = (userQuery || '').toLowerCase().split(/[^a-záéíóúñ0-9]+/i).filter(t => t && !stopWords.has(t));

      const pickTopSegments = (text, perFileLimit) => {
        if (!text) return [];
        const chunks = [];
        // Segmentar por párrafos o ventanas deslizantes ~350-500 chars
        const paras = text.split(/\n\n+/);
        for (const p of paras) {
          const trimmed = p.trim();
          if (!trimmed) continue;
          // Ventanas internas si es muy largo
          if (trimmed.length > 600) {
            for (let i = 0; i < trimmed.length; i += 450) {
              chunks.push(trimmed.slice(i, i + 500));
            }
          } else {
            chunks.push(trimmed);
          }
          if (chunks.length > 60) break; // límite de seguridad
        }

        const score = (seg) => {
          const tokens = seg.toLowerCase().split(/[^a-záéíóúñ0-9]+/i);
          let hits = 0;
          for (const t of qTokens) {
            if (!t) continue;
            if (tokens.includes(t)) hits += 1;
          }
          // Bonus por longitud moderada
          const len = Math.min(seg.length, 500) / 500;
          return hits + 0.2 * len;
        };

        const ranked = chunks
          .map(seg => ({ seg, s: score(seg) }))
          .sort((a, b) => b.s - a.s);

        const out = [];
        let used = 0;
        for (const { seg } of ranked) {
          if (used + seg.length > perFileLimit) break;
          out.push(seg);
          used += seg.length + 1;
          if (out.length >= 5) break;
        }
        return out;
      };

      const blocks = [];
      let totalChars = 0;
      for (const f of attachedFiles) {
        const summary = this.generateFileSummary(f);
        const plain = this.extractPlainText(f.content, f.category);
        const segs = pickTopSegments(plain, maxPerFile);

        let block = `Archivo: ${f.name}\n${summary}`;
        if (segs.length > 0) {
          block += `\nFragmentos relevantes:\n\n\`\`\`\n${segs.join('\n---\n')}\n\`\`\``;
        }

        if (totalChars + block.length > maxChars) break;
        blocks.push(block);
        totalChars += block.length;
      }

      if (blocks.length === 0) return '';
      const header = 'Contexto de archivos adjuntos (usar solo como referencia; no repetir textualmente si no es necesario):';
      return `${header}\n\n${blocks.join('\n\n')}`;
    } catch (e) {
      return '';
    }
  }

  /**
   * Obtener MIME type desde la extensión del archivo
   */
  getMimeTypeFromExtension(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    return this.extensionMimeTypes[ext] || null;
  }

  /**
   * Procesar un archivo y extraer su contenido
   * @param {File} file - El archivo a procesar
   * @returns {Promise<Object>} - Objeto con el contenido y metadatos
   */
  async processFile(file) {
    try {
      // Validar tamaño del archivo
      if (file.size > this.maxFileSize) {
        throw new Error(`El archivo es demasiado grande. Máximo permitido: ${this.formatFileSize(this.maxFileSize)}`);
      }

      // Obtener información del tipo de archivo
      let fileInfo = this.getFileInfo(file);
      
      // Si no se detectó el tipo MIME, intentar por extensión
      if (!fileInfo && file.name) {
        const mimeFromExt = this.getMimeTypeFromExtension(file.name);
        if (mimeFromExt) {
          fileInfo = this.supportedTypes[mimeFromExt];
        }
      }
      
      if (!fileInfo) {
        throw new Error(`Tipo de archivo no soportado: ${file.type || 'desconocido'} (${file.name})`);
      }

      // Procesar según el tipo
      const processor = this[fileInfo.processor];
      if (!processor) {
        throw new Error(`Procesador no disponible para: ${file.type}`);
      }

      const content = await processor.call(this, file);
      
      return {
        id: this.generateFileId(),
        name: file.name,
        type: file.type || this.getMimeTypeFromExtension(file.name) || 'application/octet-stream',
        size: file.size,
        sizeFormatted: this.formatFileSize(file.size),
        category: fileInfo.type,
        content: content,
        processedAt: new Date().toISOString(),
        metadata: {
          originalName: file.name,
          lastModified: file.lastModified
        }
      };

    } catch (error) {
      console.error('Error procesando archivo:', error);
      throw error;
    }
  }

  /**
   * Obtener información del archivo basada en su tipo MIME
   */
  getFileInfo(file) {
    return this.supportedTypes[file.type] || null;
  }

  /**
   * Procesar archivos de texto plano
   */
  async processTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          text: e.target.result,
          lines: e.target.result.split('\n').length,
          characters: e.target.result.length
        });
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo de texto'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Procesar archivos PDF usando el proceso principal
   */
  async processPDFFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Verificar si es un PDF válido
      if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46) {
        
        // Crear archivo temporal usando el proceso principal
        const tempFilePath = await window.electron.pdfProcessor.createTempFile(file.name, arrayBuffer);
        
        try {
          // Procesar PDF usando el proceso principal
          const result = await window.electron.pdfProcessor.processPDF(tempFilePath);
          
          // Limpiar archivo temporal
          await window.electron.pdfProcessor.cleanupTempFile(tempFilePath);
          
          if (result.success && result.text && result.text.length > 10) {
            return {
              text: result.text,
              isPDF: true,
              size: file.size,
              pages: result.pages,
              wordCount: result.wordCount,
              characterCount: result.characterCount,
              extracted: true,
              note: result.note
            };
          } else {
            return {
              text: '[PDF detectado pero no se pudo extraer el contenido]',
              isPDF: true,
              size: file.size,
              extracted: false,
              error: result.error,
              note: result.note || 'PDF detectado pero el contenido no se pudo extraer.'
            };
          }
        } catch (processError) {
          // Limpiar archivo temporal en caso de error
          await window.electron.pdfProcessor.cleanupTempFile(tempFilePath);
          throw processError;
        }
      } else {
        throw new Error('Archivo PDF no válido');
      }
      
    } catch (error) {
      console.error('Error procesando PDF:', error);
      throw new Error(`Error procesando PDF: ${error.message}`);
    }
  }


  /**
   * Procesar archivos DOC (usando mammoth.js)
   */
  async processDocFile(file) {
    try {
      // Para archivos DOC antiguos, intentamos procesamiento básico
      // Los archivos DOC son más complejos y requieren librerías especializadas
      return {
        text: '[Documento DOC detectado]',
        isDoc: true,
        size: file.size,
        note: 'Los archivos DOC requieren conversión a DOCX para análisis completo. Se recomienda guardar como DOCX primero.',
        extracted: false
      };
    } catch (error) {
      console.error('Error procesando DOC:', error);
      return {
        text: '[Error procesando documento DOC]',
        isDoc: true,
        size: file.size,
        error: error.message,
        extracted: false
      };
    }
  }

  /**
   * Procesar archivos DOCX - Extrae texto del XML interno
   */
  async processDocxFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Verificar que es un ZIP válido (comienza con PK)
      if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
      return {
          text: '[Archivo DOCX detectado pero no es un ZIP válido]',
        isDocx: true,
        size: file.size,
          extracted: false,
          note: 'El archivo DOCX no tiene formato ZIP válido'
      };
      }

      // Usar fallback para extraer contenido del ZIP
      return await this.fallbackDocxExtraction(file, arrayBuffer);
      
    } catch (error) {
      console.error('Error procesando DOCX:', error);
      return {
        text: '[Error procesando archivo DOCX]',
        isDocx: true,
        size: file.size,
        error: error.message,
        extracted: false,
        note: 'Hubo un error al intentar extraer el contenido'
      };
    }
  }

  /**
   * Método fallback para extraer DOCX en el navegador sin dependencias externas
   */
  async fallbackDocxExtraction(file, arrayBuffer) {
    try {
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Buscar archivos dentro del ZIP usando su estructura
      // Un archivo ZIP tiene: local file headers, data, central directory
      // Cada archivo comienza con: 50 4B 03 04 (PK\003\004)
      // Y contiene el nombre del archivo como string ASCII
      
      let text = '';
      
      // Buscar la entrada de "document.xml" o "word/document.xml"
      const documentXmlStart = this.findFileInZip(uint8Array, 'document.xml');
      
      if (documentXmlStart >= 0) {
        // Extraer el contenido del archivo encontrado
        const fileContent = this.extractFileFromZip(uint8Array, documentXmlStart);
        
        if (fileContent && fileContent.length > 0) {
          // Parsear el XML y extraer texto
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(fileContent, 'text/xml');
            
            // Verificar que no hay errores de parsing
            const parseError = xmlDoc.getElementsByTagName('parsererror');
            if (parseError.length === 0) {
              // Extraer texto de todos los elementos w:t
              const textElements = xmlDoc.getElementsByTagName('w:t');
              const paraElements = xmlDoc.getElementsByTagName('w:p');
              
              if (textElements.length > 0) {
                // Extraer párrafo por párrafo
                for (let i = 0; i < paraElements.length; i++) {
                  const para = paraElements[i];
                  const textsInPara = para.getElementsByTagName('w:t');
                  let paraText = '';
                  
                  for (let j = 0; j < textsInPara.length; j++) {
                    paraText += textsInPara[j].textContent || '';
                  }
                  
                  if (paraText.trim()) {
                    text += paraText + '\n';
                  }
                }
              }
            }
          } catch (xmlError) {
            console.warn('Error parseando XML, usando texto plano:', xmlError);
            // Fallback: extraer texto plano del contenido del archivo
            text = this.extractPlainTextFromXML(fileContent);
          }
        }
      }
      
      // Si no encontramos texto aún, intentar método alternativo
      if (text.length < 20) {
        text = this.extractAllTextFromDocx(uint8Array);
      }
      
      text = text.replace(/\s+/g, ' ').trim();
      
      if (text.length > 20) {
        const words = text.split(/\s+/).length;
        const lines = text.split('\n').length;
        
        return {
          text: text,
          isDocx: true,
          size: file.size,
          extracted: true,
          lines: lines,
          words: words,
          characters: text.length,
          note: 'Texto extraído del DOCX correctamente'
        };
      } else {
        return {
          text: '[Archivo DOCX sin contenido de texto extraíble]',
          isDocx: true,
          size: file.size,
          extracted: false,
          note: 'No se pudo extraer contenido de texto válido del documento'
        };
      }
    } catch (error) {
      console.error('Error en fallback de extracción DOCX:', error);
      return {
        text: '[Error en fallback de extracción DOCX]',
        isDocx: true,
        size: file.size,
        error: error.message,
        extracted: false,
        note: 'Error: ' + error.message
      };
    }
  }

  /**
   * Buscar un archivo dentro de un ZIP por su nombre
   */
  findFileInZip(uint8Array, fileName) {
    const fileNameBytes = new TextEncoder().encode(fileName);
    
    for (let i = 0; i < uint8Array.length - fileNameBytes.length; i++) {
      // Buscar la secuencia del nombre del archivo
      let matches = true;
      for (let j = 0; j < fileNameBytes.length; j++) {
        if (uint8Array[i + j] !== fileNameBytes[j]) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        // Encontramos el nombre del archivo, ahora buscar el inicio del archivo
        // Retroceder para encontrar el local file header (PK\003\004)
        for (let k = i - 30; k >= Math.max(0, i - 100); k--) {
          if (uint8Array[k] === 0x50 && uint8Array[k + 1] === 0x4B && 
              uint8Array[k + 2] === 0x03 && uint8Array[k + 3] === 0x04) {
            return k;
          }
        }
      }
    }
    
    return -1;
  }

  /**
   * Extraer el contenido de un archivo desde su posición en el ZIP
   */
  extractFileFromZip(uint8Array, startPos) {
    try {
      // Saltar el local file header (30 bytes mínimo + nombre del archivo)
      // Estructura: signature(4) + version(2) + flags(2) + compression(2) + time(4) + crc(4) + size(4) + uncompressed(4) + name_len(2) + extra_len(2) + name + extra + data
      
      if (startPos + 30 > uint8Array.length) return '';
      
      // Obtener el método de compresión (offset 8, 2 bytes, little-endian)
      const compressionMethod = uint8Array[startPos + 8] | (uint8Array[startPos + 9] << 8);
      
      // Obtener la longitud del nombre del archivo (offset 26, 2 bytes, little-endian)
      const nameLength = uint8Array[startPos + 26] | (uint8Array[startPos + 27] << 8);
      
      // Obtener la longitud de campos extra (offset 28, 2 bytes, little-endian)
      const extraLength = uint8Array[startPos + 28] | (uint8Array[startPos + 29] << 8);
      
      // Obtener el tamaño comprimido (offset 18, 4 bytes, little-endian)
      const compressedSize = uint8Array[startPos + 18] | 
                             (uint8Array[startPos + 19] << 8) |
                             (uint8Array[startPos + 20] << 16) |
                             (uint8Array[startPos + 21] << 24);
      
      // Obtener el tamaño sin comprimir (offset 22, 4 bytes, little-endian)
      const uncompressedSize = uint8Array[startPos + 22] | 
                               (uint8Array[startPos + 23] << 8) |
                               (uint8Array[startPos + 24] << 16) |
                               (uint8Array[startPos + 25] << 24);
      
      // El contenido del archivo comienza después del header + nombre + extra
      const dataStart = startPos + 30 + nameLength + extraLength;
      const dataEnd = Math.min(dataStart + compressedSize, uint8Array.length);
      
      if (dataStart >= uint8Array.length) return '';
      
      let data = uint8Array.slice(dataStart, dataEnd);
      
      // Si el archivo está comprimido (método 8 = DEFLATE, 0 = sin comprimir)
      if (compressionMethod === 8) {
        try {
          // Descomprimir usando pako
          data = pako.inflate(data);
        } catch (deflateError) {
          console.warn('Error descomprimiendo con pako, intentando con inflateRaw:', deflateError);
          try {
            data = pako.inflateRaw(data);
          } catch (inflateRawError) {
            console.error('Error descomprimiendo:', inflateRawError);
            return '';
          }
        }
      } else if (compressionMethod !== 0) {
        console.warn('Método de compresión no soportado:', compressionMethod);
        return '';
      }
      
      // Extraer como texto UTF-8
      const decoder = new TextDecoder('utf-8', { fatal: false });
      return decoder.decode(data);
      
    } catch (error) {
      console.error('Error extrayendo archivo del ZIP:', error);
      return '';
    }
  }

  /**
   * Extraer texto plano desde contenido XML (limpiando etiquetas)
   */
  extractPlainTextFromXML(xmlContent) {
    // Remover etiquetas XML y mantener solo el texto
    return xmlContent
      .replace(/<\?xml[^?]*\?>/g, '')           // Remover declaración XML
      .replace(/<!--[\s\S]*?-->/g, '')          // Remover comentarios
      .replace(/<[^>]+>/g, ' ')                  // Remover etiquetas
      .replace(/&quot;/g, '"')                   // Decodificar entidades
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')                      // Normalizar espacios
      .trim();
  }

  /**
   * Método alternativo: extraer TODO el texto del DOCX sin parsear
   */
  extractAllTextFromDocx(uint8Array) {
    let text = '';
    
    // Buscar solo texto dentro de etiquetas w:t (Word text)
    for (let i = 0; i < uint8Array.length - 10; i++) {
      // Detectar </w:t> 
      if (uint8Array[i] === 0x3C &&      // '<'
          uint8Array[i + 1] === 0x2F &&  // '/'
          uint8Array[i + 2] === 0x77 &&  // 'w'
          uint8Array[i + 3] === 0x3A &&  // ':'
          uint8Array[i + 4] === 0x74) {  // 't'
        
        // Retroceder para encontrar <w:t> anterior
        let j = i - 1;
        while (j >= 0 && uint8Array[j] !== 0x3E) j--;
        
        // Extraer el contenido entre >...< 
        let content = '';
        for (let k = j + 1; k < i; k++) {
          const byte = uint8Array[k];
          if ((byte >= 0x20 && byte <= 0x7E) || byte === 0x0A || byte === 0x0D) {
            if (byte === 0x0A || byte === 0x0D) {
              if (content.trim()) {
                text += content.trim() + ' ';
                content = '';
              }
            } else {
              content += String.fromCharCode(byte);
            }
          }
        }
        if (content.trim()) {
          text += content.trim() + ' ';
        }
      }
    }
    
    return text.trim();
  }

  /**
   * Procesar archivos CSV (mejorado)
   */
  async processCSVFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').filter(line => line.trim().length > 0);
          const headers = lines[0]?.split(',').map(h => h.trim()) || [];
          
          // Análisis más detallado
          const dataRows = lines.slice(1);
          const numericColumns = [];
          const textColumns = [];
          
          // Analizar tipos de datos en cada columna
          headers.forEach((header, index) => {
            const columnData = dataRows.map(row => {
              const values = row.split(',');
              return values[index]?.trim() || '';
            }).filter(val => val.length > 0);
            
            const isNumeric = columnData.every(val => !isNaN(parseFloat(val)) && isFinite(val));
            if (isNumeric && columnData.length > 0) {
              numericColumns.push({
                name: header,
                index: index,
                min: Math.min(...columnData.map(Number)),
                max: Math.max(...columnData.map(Number)),
                avg: columnData.reduce((sum, val) => sum + Number(val), 0) / columnData.length
              });
            } else {
              textColumns.push({
                name: header,
                index: index,
                uniqueValues: [...new Set(columnData)].length,
                sampleValues: [...new Set(columnData)].slice(0, 3)
              });
            }
          });
          
          resolve({
            text: text,
            headers: headers,
            rows: dataRows.length,
            columns: headers.length,
            preview: lines.slice(0, 5).join('\n'),
            analysis: {
              numericColumns: numericColumns,
              textColumns: textColumns,
              totalCells: dataRows.length * headers.length,
              emptyCells: dataRows.reduce((count, row) => {
                const values = row.split(',');
                return count + values.filter(val => val.trim() === '').length;
              }, 0)
            }
          });
        } catch (error) {
          reject(new Error('Error procesando CSV'));
        }
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo CSV'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Procesar archivos JSON
   */
  async processJSONFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          resolve({
            text: e.target.result,
            parsed: jsonData,
            isValid: true,
            keys: Object.keys(jsonData),
            type: Array.isArray(jsonData) ? 'array' : 'object'
          });
        } catch (error) {
          reject(new Error('JSON inválido'));
        }
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo JSON'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Procesar archivos XML (parser mejorado para namespaces)
   */
  async processXMLFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const xmlText = e.target.result;
          
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          
          const parseError = xmlDoc.getElementsByTagName('parsererror');
          const isValid = parseError.length === 0;
          
          let cleanText = '';
          let metadata = {
            rootElement: '',
            nodeCount: 0,
            elements: [],
            attributes: []
          };
          
          if (isValid) {
          const rootElement = xmlDoc.documentElement;
            metadata.rootElement = rootElement.tagName;
            metadata.nodeCount = this.countXMLNodes(rootElement);
            
            // Extraer contenido de atributos como texto legible
            cleanText = this.extractXMLAttributesAsText(rootElement);
            
            if (cleanText.length < 50) {
              // Si no hay contenido de atributos, intentar extraer texto
              cleanText = xmlText
                .replace(/<\?xml[^?]*\?>/g, '')
                .replace(/<!--[\s\S]*?-->/g, '')
                .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&apos;/g, "'")
                .replace(/&#(\d+);/g, (match, code) => String.fromCharCode(parseInt(code)))
                .replace(/&#x([0-9a-f]+);/gi, (match, code) => String.fromCharCode(parseInt(code, 16)))
                .replace(/\s+/g, ' ')
                .trim();
            }
            
            metadata.elements = this.extractXMLElementsAdvanced(rootElement);
            metadata.attributes = this.extractXMLAttributesAdvanced(rootElement);
          } else {
            // Fallback: texto limpio si hay error de parsing
            cleanText = xmlText
              .replace(/<\?xml[^?]*\?>/g, '')
              .replace(/<!--[\s\S]*?-->/g, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&apos;/g, "'")
              .replace(/\s+/g, ' ')
              .trim();
          }
          
          // Garantizar que siempre hay contenido
          if (cleanText.length < 20) {
            cleanText = xmlText.substring(0, 500);
          }
          
          resolve({
            text: cleanText,
            plainText: cleanText,
            xmlContent: xmlText,
            parsed: isValid ? this.xmlToObject(xmlDoc.documentElement) : null,
            isValid: isValid,
            ...metadata,
            size: file.size,
            characterCount: cleanText.length,
            note: isValid ? 'XML válido' : 'XML con errores de parsing'
          });
          
        } catch (error) {
          console.error('Error procesando XML:', error);
          reject(new Error('Error procesando XML: ' + error.message));
        }
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo XML'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Extraer todo el texto de un elemento XML (sin importar namespaces)
   */
  extractAllTextFromXML(element, depth = 0, maxDepth = 50) {
    if (depth > maxDepth) return '';
    
    let text = '';
    
    // Procesar el contenido de texto del elemento actual
    if (element.nodeType === Node.TEXT_NODE) {
      const nodeText = element.textContent.trim();
      if (nodeText) {
        text += nodeText + ' ';
      }
    }
    
    // Procesar todos los nodos hijos
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes[i];
      if (child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.TEXT_NODE) {
        text += this.extractAllTextFromXML(child, depth + 1, maxDepth);
      }
    }
    
    return text.trim();
  }

  /**
   * Extraer elementos XML de forma mejorada (con namespaces)
   */
  extractXMLElementsAdvanced(element, path = '', maxItems = 50, currentCount = { count: 0 }) {
    if (currentCount.count >= maxItems) return [];
    
    const elements = [];
    const children = element.children;
    
    for (let i = 0; i < children.length && currentCount.count < maxItems; i++) {
      const child = children[i];
      const tagName = child.tagName;
      const fullPath = path ? `${path}/${tagName}` : tagName;
      
      currentCount.count++;
      
      // Obtener atributos
      const attrs = child.attributes.length > 0 
        ? Array.from(child.attributes).map(a => `${a.name}="${a.value}"`).join(', ')
        : '';
      
      // Obtener contenido de texto
      const textContent = child.textContent?.trim();
      
      if (child.children.length > 0) {
        const attrStr = attrs ? ` [${attrs}]` : '';
        elements.push(`${fullPath}${attrStr} (${child.children.length} hijos)`);
        elements.push(...this.extractXMLElementsAdvanced(child, fullPath, maxItems, currentCount));
      } else {
        const preview = textContent ? textContent.substring(0, 50) : '[vacío]';
        const attrStr = attrs ? ` [${attrs}]` : '';
        elements.push(`${fullPath}${attrStr}: ${preview}`);
      }
    }
    
    if (currentCount.count >= maxItems && elements.length > 0) {
      elements.push(`... (y ${Math.max(0, this.countXMLNodes(element) - maxItems)} elementos más)`);
    }
    
    return elements;
  }

  /**
   * Extraer atributos XML de forma mejorada
   */
  extractXMLAttributesAdvanced(element) {
    const attributes = [];
    
    const processAttributes = (el, path = '') => {
      const attrs = el.attributes;
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        attributes.push({
          path: path || el.tagName,
          name: attr.name,
          value: attr.value.substring(0, 50)
        });
      }
      
      // Procesar atributos de elementos hijos
      for (let i = 0; i < el.children.length && attributes.length < 20; i++) {
        processAttributes(el.children[i], (path ? path + '/' : '') + el.tagName);
      }
    };
    
    processAttributes(element);
    return attributes;
  }

  /**
   * Procesar archivos RTF (Rich Text Format) - Mejorado
   */
  async processRtfFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const rtfText = e.target.result;
          
          // Extraer texto de RTF de forma más robusta
          let cleanText = rtfText;
          
          // Remover el encabezado RTF
          cleanText = cleanText.replace(/\{\\\*?[a-z]+\s?.*?\}/gi, ''); // Remover propiedades especiales
          cleanText = cleanText.replace(/\\\'([0-9a-f]{2})/gi, (match, hex) => {
            // Convertir caracteres escapados en hexadecimal
            try {
              return String.fromCharCode(parseInt(hex, 16));
            } catch {
              return '';
            }
          });
          
          // Remover códigos de formato RTF
          cleanText = cleanText.replace(/\\[a-z]+\d*\s?/g, ' '); // Remover comandos RTF
          cleanText = cleanText.replace(/[{}\\]/g, ' '); // Remover caracteres especiales
          cleanText = cleanText.replace(/\s+/g, ' '); // Normalizar espacios
          cleanText = cleanText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, ''); // Remover caracteres de control
          cleanText = cleanText.trim();
          
          const lines = cleanText.split('\n').filter(l => l.trim()).length;
          const words = cleanText.split(/\s+/).filter(word => word.length > 0).length;
          
          resolve({
            text: cleanText,
            isRtf: true,
            size: file.size,
            extracted: cleanText.length > 10,
            lines: lines,
            words: words,
            characters: cleanText.length,
            note: cleanText.length > 10 ? 'Texto extraído del RTF correctamente' : 'RTF sin texto extraíble'
          });
        } catch (error) {
          reject(new Error('Error procesando RTF: ' + error.message));
        }
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo RTF'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Procesar archivos ODT (OpenDocument Text) - Extrae texto del XML interno
   */
  async processOdtFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Verificar que es un ZIP válido (comienza con PK)
      if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
      return {
          text: '[Archivo ODT detectado pero no es un ZIP válido]',
        isOdt: true,
        size: file.size,
          extracted: false,
          note: 'El archivo ODT no tiene formato ZIP válido'
      };
      }

      // Usar fallback para extraer contenido del ZIP
      return await this.fallbackOdtExtraction(file, arrayBuffer);
      
    } catch (error) {
      console.error('Error procesando ODT:', error);
      return {
        text: '[Error procesando archivo ODT]',
        isOdt: true,
        size: file.size,
        error: error.message,
        extracted: false,
        note: 'Hubo un error al intentar extraer el contenido'
      };
    }
  }

  /**
   * Método fallback para extraer ODT en el navegador sin dependencias externas
   */
  async fallbackOdtExtraction(file, arrayBuffer) {
    try {
      // Intentar extraer directamente del ArrayBuffer
      const uint8Array = new Uint8Array(arrayBuffer);
      let text = '';
      let inTag = false;
      let currentText = '';
      let buffer = '';
      
      // Buscar etiquetas específicas de ODT (text:p, text:span)
      for (let i = 0; i < uint8Array.length; i++) {
        const byte = uint8Array[i];
        
        if (byte === 0x3C) { // '<'
          buffer = '';
          inTag = true;
          if (currentText.trim()) {
            text += currentText + ' ';
            currentText = '';
          }
        } else if (byte === 0x3E) { // '>'
          // Si está dentro de text:p o text:span, estará en contenido
          inTag = false;
          buffer = '';
        } else if (inTag && byte >= 0x20 && byte <= 0x7E && buffer.length < 50) {
          buffer += String.fromCharCode(byte);
        } else if (!inTag && byte >= 0x20 && byte <= 0x7E) {
          currentText += String.fromCharCode(byte);
        } else if (!inTag && (byte === 0x0A || byte === 0x0D)) {
          if (currentText.trim()) {
            text += currentText + '\n';
            currentText = '';
          }
        }
      }
      
      // Agregar cualquier texto restante
      if (currentText.trim()) {
        text += currentText;
      }
      
      text = text.replace(/\s+/g, ' ').trim();
      
      if (text.length > 20) {
        const words = text.split(/\s+/).length;
        const lines = text.split('\n').length;
        
        return {
          text: text,
          isOdt: true,
          size: file.size,
          extracted: true,
          lines: lines,
          words: words,
          characters: text.length,
          note: 'Texto extraído del ODT correctamente'
        };
      } else {
        return {
          text: '[Archivo ODT sin contenido de texto extraíble]',
          isOdt: true,
          size: file.size,
          extracted: false,
          note: 'No se pudo extraer contenido de texto válido'
        };
      }
    } catch (error) {
      console.error('Error en fallback de extracción ODT:', error);
      return {
        text: '[Error en fallback de extracción ODT]',
        isOdt: true,
        size: file.size,
        error: error.message,
        extracted: false,
        note: 'Error: ' + error.message
      };
    }
  }

  /**
   * Extraer atributos del XML como texto legible
   */
  extractXMLAttributesAsText(element, depth = 0, maxDepth = 20) {
    if (depth > maxDepth) return '';
    
    let text = '';
    const indent = '  '.repeat(depth);
    
    // Extraer información principal del elemento
    const nodeName = element.getAttribute('Name') || element.tagName;
    const nodeType = element.getAttribute('Type') || '';
    const descr = element.getAttribute('Descr') || '';
    
    // Crear línea descriptiva
    let line = `${indent}${element.tagName}`;
    if (nodeName) line += `: ${nodeName}`;
    if (nodeType) line += ` [${nodeType}]`;
    text += line + '\n';
    
    // Extraer atributos importantes (máximo 15 para no saturar)
    const importantAttrs = [
      'Username', 'Hostname', 'Protocol', 'Port', 
      'Domain', 'Panel', 'Descr', 'Id',
      'RenderingEngine', 'Resolution', 'Colors',
      'RedirectDiskDrives', 'UseCredSsp', 'ConnectToConsole'
    ];
    
    let attrCount = 0;
    for (const attr of importantAttrs) {
      const value = element.getAttribute(attr);
      if (value && value.trim() && attrCount < 10) {
        text += `${indent}  • ${attr}: ${value}\n`;
        attrCount++;
      }
    }
    
    // Procesar nodos hijos
    for (let i = 0; i < element.children.length && depth < maxDepth; i++) {
      const child = element.children[i];
      text += this.extractXMLAttributesAsText(child, depth + 1, maxDepth);
    }
    
    return text;
  }

  /**
   * Extraer elementos XML
   */
  extractXMLElements(element, path = '') {
    const elements = [];
    const children = element.children;
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const fullPath = path ? `${path}.${child.tagName}` : child.tagName;
      
      if (child.children.length > 0) {
        elements.push(`${fullPath} (${child.children.length} hijos)`);
        elements.push(...this.extractXMLElements(child, fullPath));
      } else {
        const textContent = child.textContent?.trim();
        elements.push(`${fullPath}: ${textContent || '[vacío]'}`);
      }
    }
    
    return elements;
  }

  /**
   * Extraer atributos XML
   */
  extractXMLAttributes(element) {
    const attributes = [];
    const attrs = element.attributes;
    
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      attributes.push(`${attr.name}="${attr.value}"`);
    }
    
    return attributes;
  }

  /**
   * Convertir XML a objeto JavaScript
   */
  xmlToObject(element) {
    const obj = {};
    
    // Procesar atributos
    if (element.attributes.length > 0) {
      obj['@attributes'] = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        obj['@attributes'][attr.name] = attr.value;
      }
    }
    
    // Procesar elementos hijos
    const children = element.children;
    if (children.length === 0) {
      // Elemento hoja
      const textContent = element.textContent?.trim();
      return textContent || '';
    } else {
      // Elemento con hijos
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const tagName = child.tagName;
        
        if (obj[tagName]) {
          // Convertir a array si hay múltiples elementos con el mismo nombre
          if (!Array.isArray(obj[tagName])) {
            obj[tagName] = [obj[tagName]];
          }
          obj[tagName].push(this.xmlToObject(child));
        } else {
          obj[tagName] = this.xmlToObject(child);
        }
      }
    }
    
    return obj;
  }

  /**
   * Contar nodos XML
   */
  countXMLNodes(element) {
    let count = 1; // El elemento actual
    
    for (let i = 0; i < element.children.length; i++) {
      count += this.countXMLNodes(element.children[i]);
    }
    
    return count;
  }

  /**
   * Procesar archivos de imagen
   */
  async processImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl: e.target.result,
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height,
            size: file.size,
            format: file.type,
            note: 'Imagen cargada - Se puede analizar con modelos de visión'
          });
        };
        img.onerror = () => reject(new Error('Error cargando imagen'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo de imagen'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generar ID único para archivo
   */
  generateFileId() {
    return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Formatear tamaño de archivo
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Preparar contenido para envío a IA
   */
  prepareContentForAI(fileData) {
    const { name, type, category, content, sizeFormatted } = fileData;
    
    let aiContent = `📎 **Archivo adjunto: ${name}**\n`;
    aiContent += `📊 Tipo: ${type} | Tamaño: ${sizeFormatted}\n\n`;
    
    switch (category) {
      case 'text':
        aiContent += `**Contenido del archivo:**\n\`\`\`\n${content.text}\n\`\`\`\n`;
        aiContent += `📈 Estadísticas: ${content.lines} líneas, ${content.characters} caracteres\n`;
        break;
        
      case 'csv':
        aiContent += `**Datos CSV:**\n`;
        aiContent += `📊 ${content.rows} filas, ${content.columns} columnas\n`;
        aiContent += `📋 Columnas: ${content.headers.join(', ')}\n`;
        if (content.analysis) {
          aiContent += `📈 Análisis: ${content.analysis.numericColumns.length} columnas numéricas, ${content.analysis.textColumns.length} columnas de texto\n`;
          if (content.analysis.numericColumns.length > 0) {
            aiContent += `🔢 Columnas numéricas: ${content.analysis.numericColumns.map(col => `${col.name} (${col.min}-${col.max})`).join(', ')}\n`;
          }
        }
        aiContent += `\n**Vista previa:**\n\`\`\`csv\n${content.preview}\n\`\`\`\n`;
        break;
        
      case 'json':
        aiContent += `**Datos JSON:**\n`;
        aiContent += `🔑 Claves principales: ${content.keys.join(', ')}\n`;
        aiContent += `📊 Tipo: ${content.type}\n\n`;
        aiContent += `**Contenido:**\n\`\`\`json\n${content.text}\n\`\`\`\n`;
        break;
        
      case 'image':
        aiContent += `**Imagen adjunta:**\n`;
        aiContent += `🖼️ Dimensiones: ${content.width}x${content.height}px\n`;
        aiContent += `📐 Proporción: ${content.aspectRatio.toFixed(2)}\n`;
        aiContent += `💡 Nota: ${content.note}\n`;
        break;
        
      case 'pdf':
        if (content.extracted && content.text) {
          aiContent += `**Contenido del PDF:**\n`;
          aiContent += `📊 ${content.pages} páginas | ${content.wordCount} palabras | ${content.characterCount} caracteres\n\n`;
          aiContent += `**Texto extraído:**\n\`\`\`\n${content.text}\n\`\`\`\n`;
        } else {
          aiContent += `**PDF detectado:**\n`;
          aiContent += `📄 ${content.note}\n`;
          if (content.error) {
            aiContent += `⚠️ Error: ${content.error}\n`;
          }
        }
        break;
        
      case 'doc':
        aiContent += `**Documento DOC:**\n`;
        aiContent += `📄 ${content.note}\n`;
        if (content.error) {
          aiContent += `⚠️ Error: ${content.error}\n`;
        }
        break;
        
      case 'docx':
        if (content.extracted && content.text) {
          aiContent += `**Contenido del DOCX:**\n`;
          aiContent += `📊 ${content.lines} líneas | ${content.words} palabras | ${content.characters} caracteres\n\n`;
          aiContent += `**Texto extraído:**\n\`\`\`\n${content.text}\n\`\`\`\n`;
          if (content.warnings && content.warnings.length > 0) {
            aiContent += `⚠️ Advertencias: ${content.warnings.length}\n`;
          }
        } else {
          aiContent += `**DOCX detectado:**\n`;
          aiContent += `📄 ${content.note}\n`;
          if (content.error) {
            aiContent += `⚠️ Error: ${content.error}\n`;
          }
        }
        break;
        
      case 'xml':
        if (content.plainText && content.plainText.length > 0) {
          aiContent += `**Contenido de texto XML:**\n`;
          aiContent += `📊 ${content.characterCount || content.plainText.length} caracteres | ${content.nodeCount || 0} nodos\n`;
          aiContent += `**Texto extraído:**\n\`\`\`\n${content.plainText.substring(0, 2000)}${content.plainText.length > 2000 ? '\n...' : ''}\n\`\`\`\n`;
          if (content.isValid) {
            aiContent += `🏷️ Raíz: ${content.rootElement}\n`;
            if (content.elements && content.elements.length > 0) {
              aiContent += `📋 Estructura:\n\`\`\`\n${content.elements.slice(0, 10).join('\n')}${content.elements.length > 10 ? '\n...' : ''}\n\`\`\`\n`;
            }
          }
        } else {
          aiContent += `**XML detectado:**\n`;
          aiContent += `📄 ${content.note}\n`;
          if (content.error) {
            aiContent += `⚠️ Error: ${content.error}\n`;
          }
        }
        break;
        
      case 'rtf':
        if (content.extracted && content.text) {
          aiContent += `**Contenido RTF:**\n`;
          aiContent += `📊 ${content.lines} líneas | ${content.words} palabras | ${content.characters} caracteres\n\n`;
          aiContent += `**Texto extraído:**\n\`\`\`\n${content.text}\n\`\`\`\n`;
        } else {
          aiContent += `**RTF detectado:**\n`;
          aiContent += `📄 ${content.note}\n`;
        }
        break;
        
      case 'odt':
        if (content.extracted && content.text) {
          aiContent += `**Contenido del ODT:**\n`;
          aiContent += `📊 ${content.lines} líneas | ${content.words} palabras | ${content.characters} caracteres\n\n`;
          aiContent += `**Texto extraído:**\n\`\`\`\n${content.text}\n\`\`\`\n`;
          if (content.warnings && content.warnings.length > 0) {
            aiContent += `⚠️ Advertencias: ${content.warnings.length}\n`;
          }
        } else {
          aiContent += `**ODT detectado:**\n`;
        aiContent += `📄 ${content.note}\n`;
        if (content.error) {
          aiContent += `⚠️ Error: ${content.error}\n`;
          }
        }
        break;
        
      case 'ppt':
        aiContent += `**PowerPoint (.ppt) detectado:**\n`;
        aiContent += `📄 ${content.note}\n`;
        if (content.error) {
          aiContent += `⚠️ Error: ${content.error}\n`;
        }
        break;
        
      case 'pptx':
        if (content.text && content.text.trim()) {
          aiContent += `**Contenido de PowerPoint:**\n`;
          aiContent += `📊 ${content.metadata?.slides || 1} slides | ${content.metadata?.characters || content.text.length} caracteres extraídos\n\n`;
          aiContent += `**Texto extraído:**\n\`\`\`\n${content.text}\n\`\`\`\n`;
        } else {
          aiContent += `**PowerPoint (.pptx) detectado:**\n`;
          aiContent += `📄 ${content.metadata?.note || 'Sin contenido extraíble'}\n`;
          if (content.metadata?.error) {
            aiContent += `⚠️ Error: ${content.metadata.error}\n`;
          }
        }
        break;
        
      case 'xls':
        aiContent += `**Excel (.xls) detectado:**\n`;
        aiContent += `📄 ${content.note}\n`;
        if (content.error) {
          aiContent += `⚠️ Error: ${content.error}\n`;
        }
        break;
        
      case 'xlsx':
        if (content.extractedText) {
          aiContent += `**Contenido de Excel:**\n`;
          aiContent += `📊 ${content.characters} caracteres extraídos\n\n`;
          aiContent += `**Texto extraído:**\n\`\`\`\n${content.extractedText}\n\`\`\`\n`;
        } else {
          aiContent += `**Excel (.xlsx) detectado:**\n`;
          aiContent += `📄 ${content.note}\n`;
          if (content.error) {
            aiContent += `⚠️ Error: ${content.error}\n`;
          }
        }
        break;
        
      case 'ods':
        if (content.extractedText) {
          aiContent += `**Contenido de OpenDocument Spreadsheet:**\n`;
          aiContent += `📊 ${content.characters} caracteres extraídos\n\n`;
          aiContent += `**Texto extraído:**\n\`\`\`\n${content.extractedText}\n\`\`\`\n`;
        } else {
          aiContent += `**OpenDocument Spreadsheet (.ods) detectado:**\n`;
          aiContent += `📄 ${content.note}\n`;
          if (content.error) {
            aiContent += `⚠️ Error: ${content.error}\n`;
          }
        }
        break;
        
      case 'html':
        if (content.extractedText) {
          aiContent += `**Contenido HTML:**\n`;
          aiContent += `📊 ${content.lines} líneas | ${content.words} palabras | ${content.characters} caracteres\n\n`;
          aiContent += `**Texto extraído:**\n\`\`\`\n${content.extractedText}\n\`\`\`\n`;
        } else {
          aiContent += `**HTML detectado:**\n`;
          aiContent += `📄 ${content.note}\n`;
          if (content.error) {
            aiContent += `⚠️ Error: ${content.error}\n`;
          }
        }
        break;
        
      case 'markdown':
        if (content.extractedText) {
          aiContent += `**Contenido Markdown:**\n`;
          aiContent += `📊 ${content.lines} líneas | ${content.words} palabras | ${content.characters} caracteres\n\n`;
          aiContent += `**Contenido:**\n\`\`\`\n${content.extractedText}\n\`\`\`\n`;
        } else {
          aiContent += `**Markdown detectado:**\n`;
          aiContent += `📄 ${content.note}\n`;
          if (content.error) {
            aiContent += `⚠️ Error: ${content.error}\n`;
          }
        }
        break;
        
      default:
        aiContent += `**Archivo:** ${name}\n`;
    }
    
    return aiContent;
  }

  /**
   * Procesar archivo PPT (PowerPoint antiguo)
   */
  async processPptFile(file) {
    try {
      // PPT es un formato binario complejo, por ahora solo información básica
      return {
        type: 'ppt',
        text: `[Archivo PowerPoint (.ppt) detectado - ${file.name}]\n\nLos archivos PPT son formatos binarios complejos que requieren procesamiento especializado. Para análisis completo, se recomienda convertir a PPTX o exportar como texto.`,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          note: 'Formato PPT requiere conversión para análisis completo'
        }
      };
    } catch (error) {
      console.error('Error procesando PPT:', error);
      return {
        type: 'ppt',
        text: `[Error procesando archivo PPT: ${error.message}]`,
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Procesar archivo PPTX (PowerPoint moderno)
   */
  async processPptxFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log('PPTX: Iniciando procesamiento del archivo');
      
      // Buscar todos los slides disponibles
      const slideFiles = this.findAllFilesInZip(uint8Array, 'ppt/slides/slide');
      console.log('PPTX: Slides encontrados:', slideFiles.length);
      
      if (slideFiles.length === 0) {
        // Intentar buscar en otra ubicación
        const altSlideFiles = this.findAllFilesInZip(uint8Array, 'slides/slide');
        console.log('PPTX: Slides alternativos encontrados:', altSlideFiles.length);
        
        if (altSlideFiles.length === 0) {
          throw new Error('No se encontraron slides en el archivo PPTX');
        }
        
        // Usar slides alternativos
        slideFiles.push(...altSlideFiles);
      }
      
      // Procesar todos los slides y extraer texto
      let allText = '';
      let slideCount = 0;
      
      for (let i = 0; i < Math.min(slideFiles.length, 10); i++) {
        try {
          console.log(`PPTX: Procesando slide ${i + 1}`);
          const slideContent = this.extractFileFromZip(uint8Array, slideFiles[i]);
          console.log(`PPTX: Slide ${i + 1} extraído, tamaño:`, slideContent.length);
          
          const slideText = this.extractTextFromPptxSlide(slideContent);
          console.log(`PPTX: Slide ${i + 1} texto extraído:`, slideText.metadata?.extractedText?.length || 0, 'caracteres');
          
          if (slideText && slideText.metadata && slideText.metadata.extractedText && slideText.metadata.extractedText.trim()) {
            allText += `\n--- Slide ${i + 1} ---\n${slideText.metadata.extractedText}\n`;
            slideCount++;
          }
        } catch (slideError) {
          console.warn(`Error procesando slide ${i + 1}:`, slideError);
        }
      }
      
      console.log('PPTX: Total slides procesados:', slideCount);
      console.log('PPTX: Texto total extraído:', allText.length, 'caracteres');
      
      if (!allText.trim()) {
        throw new Error('No se pudo extraer texto de ningún slide');
      }
      
      return {
        type: 'pptx',
        text: allText.trim(),
        metadata: {
          extractedText: allText.trim(),
          characters: allText.length,
          slides: slideCount,
          note: `Texto extraído de ${slideCount} slides de PowerPoint`
        }
      };
    } catch (error) {
      console.error('Error procesando PPTX:', error);
      return {
        type: 'pptx',
        text: `[Error procesando archivo PPTX: ${error.message}]`,
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Extraer texto de un slide de PPTX
   */
  extractTextFromPptxSlide(slideXml) {
    try {
      // slideXml ya es un string desde extractFileFromZip
      const xmlText = slideXml;
      console.log('PPTX Slide: XML length:', xmlText.length);
      
      let extractedText = '';
      
      // Método 1: Extraer texto de elementos a:t (texto en PowerPoint)
      const aTextMatches = xmlText.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
      console.log('PPTX Slide: a:t matches:', aTextMatches?.length || 0);
      if (aTextMatches && aTextMatches.length > 0) {
        extractedText = aTextMatches
          .map(match => match.replace(/<a:t[^>]*>([^<]*)<\/a:t>/, '$1'))
          .join(' ')
          .trim();
      }
      
      // Método 2: Si no hay a:t, buscar elementos t: (texto genérico)
      if (!extractedText) {
        const tMatches = xmlText.match(/<t[^>]*>([^<]*)<\/t>/g);
        console.log('PPTX Slide: t matches:', tMatches?.length || 0);
        if (tMatches && tMatches.length > 0) {
          extractedText = tMatches
            .map(match => match.replace(/<t[^>]*>([^<]*)<\/t>/, '$1'))
            .join(' ')
            .trim();
        }
      }
      
      // Método 3: Buscar elementos p: (párrafos)
      if (!extractedText) {
        const pMatches = xmlText.match(/<p[^>]*>([^<]*)<\/p>/g);
        console.log('PPTX Slide: p matches:', pMatches?.length || 0);
        if (pMatches && pMatches.length > 0) {
          extractedText = pMatches
            .map(match => match.replace(/<p[^>]*>([^<]*)<\/p>/, '$1'))
            .join(' ')
            .trim();
        }
      }
      
      // Método 4: Extraer texto de cualquier elemento que contenga texto
      if (!extractedText) {
        const allTextMatches = xmlText.match(/<[^>]*>([^<]+)<\/[^>]*>/g);
        console.log('PPTX Slide: all text matches:', allTextMatches?.length || 0);
        if (allTextMatches && allTextMatches.length > 0) {
          extractedText = allTextMatches
            .map(match => match.replace(/<[^>]*>([^<]+)<\/[^>]*>/, '$1'))
            .filter(text => text.trim().length > 0)
            .join(' ')
            .trim();
        }
      }
      
      // Método 5: Fallback - extraer todo el texto entre tags
      if (!extractedText) {
        extractedText = xmlText
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      console.log('PPTX Slide: Texto extraído:', extractedText.length, 'caracteres');
      
      return {
        type: 'pptx',
        text: extractedText || '[Slide de PowerPoint sin texto extraíble]',
        metadata: {
          extractedText: extractedText,
          characters: extractedText.length,
          note: 'Texto extraído de slide de PowerPoint'
        }
      };
    } catch (error) {
      console.error('PPTX Slide: Error:', error);
      return {
        type: 'pptx',
        text: `[Error extrayendo texto del slide: ${error.message}]`,
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Procesar archivo XLS (Excel antiguo)
   */
  async processXlsFile(file) {
    try {
      // XLS es un formato binario complejo, por ahora solo información básica
      return {
        type: 'xls',
        text: `[Archivo Excel (.xls) detectado - ${file.name}]\n\nLos archivos XLS son formatos binarios complejos que requieren procesamiento especializado. Para análisis completo, se recomienda convertir a XLSX o exportar como CSV.`,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          note: 'Formato XLS requiere conversión para análisis completo'
        }
      };
    } catch (error) {
      console.error('Error procesando XLS:', error);
      return {
        type: 'xls',
        text: `[Error procesando archivo XLS: ${error.message}]`,
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Procesar archivo XLSX (Excel moderno)
   */
  async processXlsxFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Buscar y extraer sharedStrings.xml del ZIP
      const sharedStringsXml = this.findFileInZip(uint8Array, 'xl/sharedStrings.xml');
      if (!sharedStringsXml) {
        throw new Error('No se encontró sharedStrings.xml en el archivo XLSX');
      }
      
      // Extraer texto del XML
      const extractedText = this.extractTextFromXlsxSharedStrings(sharedStringsXml);
      
      return {
        type: 'xlsx',
        text: extractedText || '[Hoja de cálculo sin texto extraíble]',
        metadata: {
          extractedText: extractedText,
          characters: extractedText.length,
          note: 'Texto extraído de hoja de cálculo Excel'
        }
      };
    } catch (error) {
      console.error('Error procesando XLSX:', error);
      return {
        type: 'xlsx',
        text: `[Error procesando archivo XLSX: ${error.message}]`,
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Extraer texto de sharedStrings.xml de XLSX
   */
  extractTextFromXlsxSharedStrings(sharedStringsXml) {
    try {
      // Convertir bytes a string
      const xmlText = new TextDecoder('utf-8').decode(sharedStringsXml);
      
      // Extraer texto de elementos <t> (texto en Excel)
      const textMatches = xmlText.match(/<t[^>]*>([^<]*)<\/t>/g);
      let extractedText = '';
      
      if (textMatches) {
        extractedText = textMatches
          .map(match => match.replace(/<t[^>]*>([^<]*)<\/t>/, '$1'))
          .join(' ')
          .trim();
      }
      
      return extractedText;
    } catch (error) {
      console.error('Error extrayendo texto de XLSX:', error);
      return '';
    }
  }

  /**
   * Procesar archivo ODS (OpenDocument Spreadsheet)
   */
  async processOdsFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Buscar y extraer content.xml del ZIP
      const contentXml = this.findFileInZip(uint8Array, 'content.xml');
      if (!contentXml) {
        throw new Error('No se encontró content.xml en el archivo ODS');
      }
      
      // Extraer texto del XML
      const extractedText = this.extractTextFromOdsContent(contentXml);
      
      return {
        type: 'ods',
        text: extractedText || '[Hoja de cálculo sin texto extraíble]',
        metadata: {
          extractedText: extractedText,
          characters: extractedText.length,
          note: 'Texto extraído de hoja de cálculo OpenDocument'
        }
      };
    } catch (error) {
      console.error('Error procesando ODS:', error);
      return {
        type: 'ods',
        text: `[Error procesando archivo ODS: ${error.message}]`,
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Extraer texto de content.xml de ODS
   */
  extractTextFromOdsContent(contentXml) {
    try {
      // Convertir bytes a string
      const xmlText = new TextDecoder('utf-8').decode(contentXml);
      
      // Extraer texto de elementos text:p y text:span
      const textMatches = xmlText.match(/<text:p[^>]*>([^<]*)<\/text:p>|<text:span[^>]*>([^<]*)<\/text:span>/g);
      let extractedText = '';
      
      if (textMatches) {
        extractedText = textMatches
          .map(match => {
            const pMatch = match.match(/<text:p[^>]*>([^<]*)<\/text:p>/);
            const spanMatch = match.match(/<text:span[^>]*>([^<]*)<\/text:span>/);
            return pMatch ? pMatch[1] : (spanMatch ? spanMatch[1] : '');
          })
          .join(' ')
          .trim();
      }
      
      return extractedText;
    } catch (error) {
      console.error('Error extrayendo texto de ODS:', error);
      return '';
    }
  }

  /**
   * Procesar archivo HTML
   */
  async processHtmlFile(file) {
    try {
      const text = await file.text();
      
      // Extraer texto limpio del HTML
      const cleanText = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      return {
        type: 'html',
        text: cleanText,
        metadata: {
          extractedText: cleanText,
          lines: cleanText.split('\n').length,
          words: cleanText.split(/\s+/).filter(word => word.length > 0).length,
          characters: cleanText.length,
          note: 'Texto extraído de página HTML'
        }
      };
    } catch (error) {
      console.error('Error procesando HTML:', error);
      return {
        type: 'html',
        text: `[Error procesando archivo HTML: ${error.message}]`,
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Procesar archivo Markdown
   */
  async processMarkdownFile(file) {
    try {
      const text = await file.text();
      
      return {
        type: 'markdown',
        text: text,
        metadata: {
          extractedText: text,
          lines: text.split('\n').length,
          words: text.split(/\s+/).filter(word => word.length > 0).length,
          characters: text.length,
          note: 'Contenido Markdown'
        }
      };
    } catch (error) {
      console.error('Error procesando Markdown:', error);
      return {
        type: 'markdown',
        text: `[Error procesando archivo Markdown: ${error.message}]`,
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Buscar todos los archivos en un ZIP que coincidan con un patrón
   */
  findAllFilesInZip(uint8Array, pattern) {
    const patternBytes = new TextEncoder().encode(pattern);
    const files = [];
    
    for (let i = 0; i < uint8Array.length - patternBytes.length; i++) {
      let matches = true;
      for (let j = 0; j < patternBytes.length; j++) {
        if (uint8Array[i + j] !== patternBytes[j]) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        // Encontramos el patrón, buscar el inicio del archivo
        for (let k = i - 30; k >= Math.max(0, i - 100); k--) {
          if (uint8Array[k] === 0x50 && uint8Array[k + 1] === 0x4B && 
              uint8Array[k + 2] === 0x03 && uint8Array[k + 3] === 0x04) {
            files.push(k);
            break;
          }
        }
      }
    }
    
    return files;
  }

  /**
   * Validar si un archivo es soportado
   */
  isFileSupported(file) {
    // Primero validar por MIME type
    if (this.supportedTypes.hasOwnProperty(file.type)) {
      return true;
    }
    
    // Si el navegador no detectó el MIME type, validar por extensión
    if (file.name) {
      const mimeFromExt = this.getMimeTypeFromExtension(file.name);
      return mimeFromExt !== null && this.supportedTypes.hasOwnProperty(mimeFromExt);
    }
    
    return false;
  }

  /**
   * Obtener lista de tipos soportados
   */
  getSupportedTypes() {
    return Object.keys(this.supportedTypes).map(type => ({
      mimeType: type,
      ...this.supportedTypes[type]
    }));
  }
}

// Crear instancia singleton
const fileAnalysisService = new FileAnalysisService();

export default fileAnalysisService;
