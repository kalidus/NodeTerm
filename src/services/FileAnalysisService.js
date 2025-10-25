/**
 * FileAnalysisService - Servicio para analizar y procesar archivos para el chat de IA
 * Soporta PDF, TXT, DOC, DOCX, CSV, JSON, imágenes y más
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
   * Procesar archivos PDF
   */
  async processPDFFile(file) {
    try {
      // Para PDFs, necesitaremos una librería externa
      // Por ahora, intentamos con una aproximación básica
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Verificar si es un PDF válido
      if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46) {
        return {
          text: '[PDF detectado - Se requiere procesamiento avanzado]',
          isPDF: true,
          size: file.size,
          note: 'Para análisis completo de PDF, se recomienda usar un modelo con capacidades de visión'
        };
      } else {
        throw new Error('Archivo PDF no válido');
      }
    } catch (error) {
      throw new Error(`Error procesando PDF: ${error.message}`);
    }
  }

  /**
   * Procesar archivos DOC (básico)
   */
  async processDocFile(file) {
    return {
      text: '[Documento DOC detectado - Se requiere procesamiento avanzado]',
      isDoc: true,
      size: file.size,
      note: 'Para análisis completo de documentos DOC, se recomienda convertir a TXT primero'
    };
  }

  /**
   * Procesar archivos DOCX (básico)
   */
  async processDocxFile(file) {
    return {
      text: '[Documento DOCX detectado - Se requiere procesamiento avanzado]',
      isDocx: true,
      size: file.size,
      note: 'Para análisis completo de documentos DOCX, se recomienda convertir a TXT primero'
    };
  }

  /**
   * Procesar archivos CSV
   */
  async processCSVFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n');
          const headers = lines[0]?.split(',') || [];
          
          resolve({
            text: text,
            headers: headers,
            rows: lines.length - 1,
            columns: headers.length,
            preview: lines.slice(0, 5).join('\n') // Primeras 5 líneas
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
        aiContent += `📋 Columnas: ${content.headers.join(', ')}\n\n`;
        aiContent += `**Vista previa:**\n\`\`\`csv\n${content.preview}\n\`\`\`\n`;
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
      case 'doc':
      case 'docx':
        aiContent += `**Documento detectado:**\n`;
        aiContent += `📄 ${content.note}\n`;
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
