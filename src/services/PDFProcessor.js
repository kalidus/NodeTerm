/**
 * PDFProcessor - Servicio especializado para procesar PDFs usando pdf-parse
 * Este servicio se ejecuta en el proceso principal de Electron
 */

const { ipcMain } = require('electron');
const { PDFParse } = require('pdf-parse');
const path = require('path');
const fs = require('fs');

class PDFProcessor {
  constructor() {
    this.setupIPC();
  }

  /**
   * Configurar comunicación IPC con el renderer
   */
  setupIPC() {
    ipcMain.handle('process-pdf', async (event, filePath) => {
      try {
        return await this.processPDFFile(filePath);
      } catch (error) {
        console.error('Error procesando PDF:', error);
        throw error;
      }
    });

    ipcMain.handle('process-pdf-buffer', async (event, base64Data) => {
      try {
        return await this.processPDFBuffer(base64Data);
      } catch (error) {
        console.error('Error procesando PDF buffer:', error);
        throw error;
      }
    });

    ipcMain.handle('create-temp-file', async (event, fileName, arrayBuffer) => {
      try {
        return await this.createTempFile(fileName, arrayBuffer);
      } catch (error) {
        console.error('Error creando archivo temporal:', error);
        throw error;
      }
    });

    ipcMain.handle('cleanup-temp-file', async (event, filePath) => {
      try {
        return await this.cleanupTempFile(filePath);
      } catch (error) {
        console.error('Error limpiando archivo temporal:', error);
        throw error;
      }
    });
  }

  /**
   * Procesar archivo PDF y extraer texto
   */
  async processPDFFile(filePath) {
    try {
      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        throw new Error('El archivo PDF no existe');
      }

      // Leer el archivo PDF
      const dataBuffer = fs.readFileSync(filePath);
      
      // Procesar con pdf-parse
      const pdfParser = new PDFParse({ 
        data: dataBuffer,
        verbosity: 0 // Reducir verbosidad para evitar errores
      });
      
      await pdfParser.load();
      
      // Extraer información relevante
      const textResult = await pdfParser.getText();
      const infoResult = await pdfParser.getInfo();
      const pages = pdfParser.doc.numPages;
      
      // Extraer texto del resultado
      const text = textResult.text || textResult;
      const info = infoResult.info || infoResult;
      
      const result = {
        text: text,
        pages: pages,
        info: info,
        metadata: info,
        wordCount: text.split(/\s+/).length,
        characterCount: text.length,
        extracted: true,
        success: true,
        note: `PDF procesado exitosamente - ${pages} páginas, ${text.split(/\s+/).length} palabras`
      };

      return result;

    } catch (error) {
      console.error('Error procesando PDF:', error);
      return {
        text: '[Error procesando PDF]',
        pages: 0,
        extracted: false,
        success: false,
        error: error.message,
        note: `Error procesando PDF: ${error.message}`
      };
    }
  }

  /**
   * Procesar PDF desde buffer base64
   */
  async processPDFBuffer(base64Data) {
    try {
      // Convertir base64 a buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      const pdfParser = new PDFParse({ 
        data: buffer,
        verbosity: 0 // Reducir verbosidad para evitar errores
      });
      await pdfParser.load();
      
      // Extraer información relevante
      const textResult = await pdfParser.getText();
      const infoResult = await pdfParser.getInfo();
      const pages = pdfParser.doc.numPages;
      
      // Extraer texto del resultado
      const text = textResult.text || textResult;
      const info = infoResult.info || infoResult;
      
      return {
        text: text,
        pages: pages,
        info: info,
        metadata: info,
        wordCount: text.split(/\s+/).length,
        characterCount: text.length,
        extracted: true,
        success: true,
        note: `PDF procesado exitosamente - ${pages} páginas, ${text.split(/\s+/).length} palabras`
      };

    } catch (error) {
      console.error('Error procesando PDF buffer:', error);
      return {
        text: '[Error procesando PDF]',
        pages: 0,
        extracted: false,
        success: false,
        error: error.message,
        note: `Error procesando PDF: ${error.message}`
      };
    }
  }

  /**
   * Crear archivo temporal para procesar
   */
  async createTempFile(fileName, arrayBuffer) {
    try {
      // Crear nombre de archivo temporal único
      const tempFileName = `temp_pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`;
      const tempFilePath = path.join(require('os').tmpdir(), tempFileName);
      
      // Convertir ArrayBuffer a Buffer
      const buffer = Buffer.from(arrayBuffer);
      
      // Escribir archivo temporal
      fs.writeFileSync(tempFilePath, buffer);
      
      return tempFilePath;
    } catch (error) {
      console.error('Error creando archivo temporal:', error);
      throw error;
    }
  }

  /**
   * Limpiar archivo temporal
   */
  async cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (error) {
      console.warn('No se pudo limpiar archivo temporal:', error);
      return false;
    }
  }
}

// Crear instancia singleton
const pdfProcessor = new PDFProcessor();

module.exports = pdfProcessor;
