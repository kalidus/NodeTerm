/**
 * FileAnalysisService - Servicio para analizar y procesar archivos para el chat de IA
 * Soporta PDF, TXT, DOC, DOCX, CSV, JSON, XML, RTF, ODT, imágenes y más
 */

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
      
      // Documentos OpenDocument
      'application/vnd.oasis.opendocument.text': { type: 'odt', processor: 'processOdtFile' },
      
      // Rich Text Format
      'application/rtf': { type: 'rtf', processor: 'processRtfFile' },
      'text/rtf': { type: 'rtf', processor: 'processRtfFile' },
      
      // XML
      'application/xml': { type: 'xml', processor: 'processXMLFile' },
      'text/xml': { type: 'xml', processor: 'processXMLFile' },
      
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
    
    this.maxFileSize = 50 * 1024 * 1024; // 50MB por defecto
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
      const fileInfo = this.getFileInfo(file);
      
      if (!fileInfo) {
        throw new Error(`Tipo de archivo no soportado: ${file.type}`);
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
        type: file.type,
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
   * Procesar archivos DOCX (básico - sin mammoth.js)
   */
  async processDocxFile(file) {
    try {
      // Los archivos DOCX son ZIP que contienen XML
      // Por ahora, proporcionamos información básica
      return {
        text: '[Documento DOCX detectado]',
        isDocx: true,
        size: file.size,
        note: 'Los archivos DOCX requieren procesamiento especializado. Se recomienda convertir a TXT para análisis completo.',
        extracted: false
      };
    } catch (error) {
      console.error('Error procesando DOCX:', error);
      return {
        text: '[Error procesando documento DOCX]',
        isDocx: true,
        size: file.size,
        error: error.message,
        extracted: false
      };
    }
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
   * Procesar archivos XML (parser simple para navegador)
   */
  async processXMLFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const xmlText = e.target.result;
          
          // Parser XML simple usando DOMParser del navegador
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          
          // Verificar si hay errores de parsing
          const parseError = xmlDoc.getElementsByTagName('parsererror');
          if (parseError.length > 0) {
            throw new Error('XML no válido: ' + parseError[0].textContent);
          }
          
          // Extraer información del XML
          const rootElement = xmlDoc.documentElement;
          const elementInfo = this.extractXMLElements(rootElement);
          const attributes = this.extractXMLAttributes(rootElement);
          
          resolve({
            text: xmlText,
            parsed: this.xmlToObject(rootElement),
            isValid: true,
            rootElement: rootElement.tagName,
            elements: elementInfo,
            attributes: attributes,
            size: file.size,
            nodeCount: this.countXMLNodes(rootElement)
          });
        } catch (error) {
          // Si falla el parsing, devolver el XML como texto
          resolve({
            text: e.target.result,
            parsed: null,
            isValid: false,
            error: error.message,
            note: 'XML no válido o con formato complejo'
          });
        }
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo XML'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Procesar archivos RTF (Rich Text Format)
   */
  async processRtfFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const rtfText = e.target.result;
          
          // Extraer texto básico del RTF (remover códigos de formato)
          const cleanText = rtfText
            .replace(/\\[a-z]+\d*\s?/g, ' ') // Remover códigos RTF
            .replace(/[{}]/g, ' ') // Remover llaves
            .replace(/\s+/g, ' ') // Normalizar espacios
            .trim();
          
          const lines = cleanText.split('\n').length;
          const words = cleanText.split(/\s+/).filter(word => word.length > 0).length;
          
          resolve({
            text: cleanText,
            originalRtf: rtfText,
            isRtf: true,
            size: file.size,
            extracted: cleanText.length > 10,
            lines: lines,
            words: words,
            characters: cleanText.length,
            note: cleanText.length > 10 ? 'Texto extraído del RTF' : 'RTF sin texto extraíble'
          });
        } catch (error) {
          reject(new Error('Error procesando RTF'));
        }
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo RTF'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Procesar archivos ODT (OpenDocument Text)
   */
  async processOdtFile(file) {
    try {
      // Los archivos ODT son ZIP que contienen XML
      // Por ahora, proporcionamos información básica
      return {
        text: '[Documento ODT detectado]',
        isOdt: true,
        size: file.size,
        note: 'Los archivos ODT requieren procesamiento especializado. Se recomienda convertir a DOCX o TXT para análisis completo.',
        extracted: false
      };
    } catch (error) {
      console.error('Error procesando ODT:', error);
      return {
        text: '[Error procesando documento ODT]',
        isOdt: true,
        size: file.size,
        error: error.message,
        extracted: false
      };
    }
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
        if (content.isValid && content.parsed) {
          aiContent += `**Estructura XML:**\n`;
          aiContent += `🏷️ Elemento raíz: ${content.rootElement}\n`;
          aiContent += `📊 Nodos totales: ${content.nodeCount}\n`;
          aiContent += `📋 Elementos: ${content.elements.length}\n`;
          if (content.attributes && content.attributes.length > 0) {
            aiContent += `🔧 Atributos: ${content.attributes.join(', ')}\n`;
          }
          aiContent += `\n**Estructura detallada:**\n\`\`\`\n${content.elements.slice(0, 20).join('\n')}${content.elements.length > 20 ? '\n...' : ''}\n\`\`\`\n`;
          aiContent += `\n**Contenido XML (primeros 1000 caracteres):**\n\`\`\`xml\n${content.text.substring(0, 1000)}${content.text.length > 1000 ? '...' : ''}\n\`\`\`\n`;
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
        aiContent += `**Documento ODT:**\n`;
        aiContent += `📄 ${content.note}\n`;
        if (content.error) {
          aiContent += `⚠️ Error: ${content.error}\n`;
        }
        break;
        
      default:
        aiContent += `**Archivo:** ${name}\n`;
    }
    
    return aiContent;
  }

  /**
   * Validar si un archivo es soportado
   */
  isFileSupported(file) {
    return this.supportedTypes.hasOwnProperty(file.type);
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
