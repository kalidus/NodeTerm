/**
 * Manejadores IPC para funcionalidades de grabación de sesiones
 */

const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs').promises;

/**
 * Instancia global del SessionRecorder (se inicializa en main.js)
 */
let sessionRecorder = null;

/**
 * Establece la instancia del SessionRecorder
 */
function setSessionRecorder(recorder) {
  sessionRecorder = recorder;
}

/**
 * Registra todos los manejadores IPC relacionados con grabaciones
 */
function registerRecordingHandlers() {
  
  // RECORDING: Iniciar grabación
  ipcMain.handle('recording:start', async (event, { tabId, metadata }) => {
    try {
      if (!sessionRecorder) {
        throw new Error('SessionRecorder no inicializado');
      }

      const recordingId = sessionRecorder.startRecording(tabId, metadata);
      
      return {
        success: true,
        recordingId,
        message: `Grabación iniciada: ${metadata.username}@${metadata.host}`
      };
    } catch (error) {
      console.error('Error iniciando grabación:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // RECORDING: Detener grabación y guardar
  ipcMain.handle('recording:stop', async (event, { tabId }) => {
    try {
      if (!sessionRecorder) {
        throw new Error('SessionRecorder no inicializado');
      }

      // Detener grabación
      const recording = sessionRecorder.stopRecording(tabId);
      
      // Guardar archivo en disco
      const recordingId = recording.id;
      const userDataPath = app.getPath('userData');
      const recordingsDir = path.join(userDataPath, 'recordings');
      
      // Crear directorio si no existe
      await fs.mkdir(recordingsDir, { recursive: true });
      
      // Generar formato asciicast
      const asciicastContent = sessionRecorder.toAsciicast(recording);
      const filename = `${recordingId}.cast`;
      const filepath = path.join(recordingsDir, filename);
      
      // Guardar archivo
      await fs.writeFile(filepath, asciicastContent, 'utf-8');
      
      // Guardar metadata en archivo separado para índice rápido
      const metadataPath = path.join(recordingsDir, `${recordingId}.meta.json`);
      const metadata = {
        id: recordingId,
        filepath,
        filename,
        ...recording.metadata,
        duration: recording.duration,
        endTime: recording.endTime,
        eventCount: recording.eventCount,
        bytesRecorded: recording.bytesRecorded,
        createdAt: Date.now()
      };
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
      
      console.log(`💾 Grabación guardada: ${filepath}`);
      
      return {
        success: true,
        recordingId,
        filepath,
        duration: recording.duration,
        eventCount: recording.eventCount,
        message: `Grabación guardada: ${filename}`
      };
    } catch (error) {
      console.error('Error deteniendo grabación:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // RECORDING: Pausar grabación
  ipcMain.handle('recording:pause', async (event, { tabId }) => {
    try {
      if (!sessionRecorder) {
        throw new Error('SessionRecorder no inicializado');
      }

      sessionRecorder.pauseRecording(tabId);
      
      return {
        success: true,
        message: 'Grabación pausada'
      };
    } catch (error) {
      console.error('Error pausando grabación:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // RECORDING: Reanudar grabación
  ipcMain.handle('recording:resume', async (event, { tabId }) => {
    try {
      if (!sessionRecorder) {
        throw new Error('SessionRecorder no inicializado');
      }

      sessionRecorder.resumeRecording(tabId);
      
      return {
        success: true,
        message: 'Grabación reanudada'
      };
    } catch (error) {
      console.error('Error reanudando grabación:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // RECORDING: Verificar si hay grabación activa
  ipcMain.handle('recording:is-active', async (event, { tabId }) => {
    try {
      if (!sessionRecorder) {
        return { success: true, isRecording: false };
      }

      const isRecording = sessionRecorder.isRecording(tabId);
      const info = sessionRecorder.getRecordingInfo(tabId);
      
      return {
        success: true,
        isRecording,
        info
      };
    } catch (error) {
      console.error('Error verificando grabación:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // RECORDING: Listar todas las grabaciones
  ipcMain.handle('recording:list', async (event, filters = {}) => {
    try {
      const userDataPath = app.getPath('userData');
      const recordingsDir = path.join(userDataPath, 'recordings');
      
      // Verificar si existe el directorio
      try {
        await fs.access(recordingsDir);
      } catch {
        // Si no existe, crear y devolver array vacío
        await fs.mkdir(recordingsDir, { recursive: true });
        return { success: true, recordings: [] };
      }
      
      // Leer archivos .meta.json
      const files = await fs.readdir(recordingsDir);
      const metaFiles = files.filter(f => f.endsWith('.meta.json'));
      
      const recordings = await Promise.all(
        metaFiles.map(async (metaFile) => {
          try {
            const metaPath = path.join(recordingsDir, metaFile);
            const content = await fs.readFile(metaPath, 'utf-8');
            return JSON.parse(content);
          } catch (error) {
            console.error(`Error leyendo metadata ${metaFile}:`, error);
            return null;
          }
        })
      );
      
      // Filtrar nulos y aplicar filtros
      let filteredRecordings = recordings.filter(Boolean);
      
      // Aplicar filtros si existen
      if (filters.host) {
        filteredRecordings = filteredRecordings.filter(r => 
          r.host && r.host.toLowerCase().includes(filters.host.toLowerCase())
        );
      }
      
      if (filters.username) {
        filteredRecordings = filteredRecordings.filter(r => 
          r.username && r.username.toLowerCase().includes(filters.username.toLowerCase())
        );
      }
      
      // Ordenar por fecha (más reciente primero)
      filteredRecordings.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      return {
        success: true,
        recordings: filteredRecordings
      };
    } catch (error) {
      console.error('Error listando grabaciones:', error);
      return {
        success: false,
        error: error.message,
        recordings: []
      };
    }
  });

  // RECORDING: Cargar grabación específica
  ipcMain.handle('recording:load', async (event, { recordingId }) => {
    try {
      const userDataPath = app.getPath('userData');
      const recordingsDir = path.join(userDataPath, 'recordings');
      
      // Leer metadata
      const metaPath = path.join(recordingsDir, `${recordingId}.meta.json`);
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const metadata = JSON.parse(metaContent);
      
      // Leer archivo de grabación
      const castPath = path.join(recordingsDir, `${recordingId}.cast`);
      const castContent = await fs.readFile(castPath, 'utf-8');
      
      return {
        success: true,
        recording: {
          metadata,
          content: castContent
        }
      };
    } catch (error) {
      console.error('Error cargando grabación:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // RECORDING: Eliminar grabación
  ipcMain.handle('recording:delete', async (event, { recordingId }) => {
    try {
      const userDataPath = app.getPath('userData');
      const recordingsDir = path.join(userDataPath, 'recordings');
      
      // Eliminar archivos
      const castPath = path.join(recordingsDir, `${recordingId}.cast`);
      const metaPath = path.join(recordingsDir, `${recordingId}.meta.json`);
      
      await Promise.all([
        fs.unlink(castPath).catch(() => {}), // Ignorar si no existe
        fs.unlink(metaPath).catch(() => {})
      ]);
      
      console.log(`🗑️ Grabación eliminada: ${recordingId}`);
      
      return {
        success: true,
        message: 'Grabación eliminada correctamente'
      };
    } catch (error) {
      console.error('Error eliminando grabación:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // RECORDING: Exportar grabación
  ipcMain.handle('recording:export', async (event, { recordingId, exportPath }) => {
    try {
      const userDataPath = app.getPath('userData');
      const recordingsDir = path.join(userDataPath, 'recordings');
      
      const castPath = path.join(recordingsDir, `${recordingId}.cast`);
      const castContent = await fs.readFile(castPath, 'utf-8');
      
      // Copiar a la ruta de exportación
      await fs.writeFile(exportPath, castContent, 'utf-8');
      
      console.log(`📤 Grabación exportada a: ${exportPath}`);
      
      return {
        success: true,
        message: 'Grabación exportada correctamente',
        exportPath
      };
    } catch (error) {
      console.error('Error exportando grabación:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // RECORDING: Obtener estadísticas
  ipcMain.handle('recording:stats', async () => {
    try {
      const userDataPath = app.getPath('userData');
      const recordingsDir = path.join(userDataPath, 'recordings');
      
      try {
        await fs.access(recordingsDir);
      } catch {
        return {
          success: true,
          stats: {
            total: 0,
            totalDuration: 0,
            totalSize: 0,
            byHost: {},
            byUsername: {}
          }
        };
      }
      
      const files = await fs.readdir(recordingsDir);
      const metaFiles = files.filter(f => f.endsWith('.meta.json'));
      
      const recordings = await Promise.all(
        metaFiles.map(async (metaFile) => {
          try {
            const metaPath = path.join(recordingsDir, metaFile);
            const content = await fs.readFile(metaPath, 'utf-8');
            return JSON.parse(content);
          } catch {
            return null;
          }
        })
      );
      
      const validRecordings = recordings.filter(Boolean);
      
      const stats = {
        total: validRecordings.length,
        totalDuration: validRecordings.reduce((sum, r) => sum + (r.duration || 0), 0),
        totalSize: validRecordings.reduce((sum, r) => sum + (r.bytesRecorded || 0), 0),
        byHost: {},
        byUsername: {}
      };
      
      validRecordings.forEach(r => {
        if (r.host) {
          stats.byHost[r.host] = (stats.byHost[r.host] || 0) + 1;
        }
        if (r.username) {
          stats.byUsername[r.username] = (stats.byUsername[r.username] || 0) + 1;
        }
      });
      
      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('✅ Recording handlers registrados');
}

module.exports = {
  registerRecordingHandlers,
  setSessionRecorder
};

