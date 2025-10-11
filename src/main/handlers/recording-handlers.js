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
      
      console.log('💾 Guardando metadata de grabación:', {
        id: metadata.id,
        host: metadata.host,
        username: metadata.username,
        title: metadata.title
      });
      
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
      console.log('🔍 recording:list - Filtros recibidos:', JSON.stringify(filters, null, 2));
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
      
      console.log(`📊 Total grabaciones antes de filtrar: ${filteredRecordings.length}`);
      if (filteredRecordings.length > 0) {
        console.log('📝 Ejemplo de grabación:', {
          host: filteredRecordings[0].host,
          username: filteredRecordings[0].username,
          title: filteredRecordings[0].title
        });
      }
      
      // Aplicar filtros si existen (comparación exacta)
      if (filters.host) {
        console.log(`🔎 Filtrando por host: "${filters.host}"`);
        filteredRecordings = filteredRecordings.filter(r => {
          const match = r.host && r.host.toLowerCase() === filters.host.toLowerCase();
          if (!match && r.host) {
            console.log(`  ❌ No coincide: "${r.host}" !== "${filters.host}"`);
          }
          return match;
        });
        console.log(`📊 Después de filtrar por host: ${filteredRecordings.length}`);
      }
      
      if (filters.username) {
        console.log(`🔎 Filtrando por username: "${filters.username}"`);
        filteredRecordings = filteredRecordings.filter(r => {
          const match = r.username && r.username.toLowerCase() === filters.username.toLowerCase();
          if (!match && r.username) {
            console.log(`  ❌ No coincide: "${r.username}" !== "${filters.username}"`);
          }
          return match;
        });
        console.log(`📊 Después de filtrar por username: ${filteredRecordings.length}`);
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

  // AUDIT: Obtener estadísticas de auditoría
  ipcMain.handle('audit:get-stats', async () => {
    try {
      const userDataPath = app.getPath('userData');
      const recordingsDir = path.join(userDataPath, 'recordings');
      
      try {
        await fs.access(recordingsDir);
      } catch {
        return {
          success: true,
          stats: {
            fileCount: 0,
            totalSize: 0,
            oldestFile: null,
            lastCleanup: null
          }
        };
      }
      
      const files = await fs.readdir(recordingsDir);
      const castFiles = files.filter(f => f.endsWith('.cast'));
      const metaFiles = files.filter(f => f.endsWith('.meta.json'));
      
      let totalSize = 0;
      let oldestFile = null;
      
      // Calcular tamaño total y archivo más antiguo
      for (const file of castFiles) {
        try {
          const filePath = path.join(recordingsDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
          
          if (!oldestFile || stats.birthtime < oldestFile) {
            oldestFile = stats.birthtime;
          }
        } catch (error) {
          console.error(`Error obteniendo stats de ${file}:`, error);
        }
      }
      
      // Leer configuración de última limpieza
      const configPath = path.join(userDataPath, 'audit-config.json');
      let lastCleanup = null;
      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        lastCleanup = config.lastCleanup;
      } catch {
        // Config file doesn't exist or is invalid
      }
      
      return {
        success: true,
        stats: {
          fileCount: castFiles.length,
          totalSize,
          oldestFile: oldestFile ? oldestFile.getTime() : null,
          lastCleanup
        }
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de auditoría:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // AUDIT: Ejecutar limpieza de archivos
  ipcMain.handle('audit:cleanup', async (event, { retentionDays, maxStorageSize, force = false }) => {
    try {
      const userDataPath = app.getPath('userData');
      const recordingsDir = path.join(userDataPath, 'recordings');
      
      try {
        await fs.access(recordingsDir);
      } catch {
        return {
          success: true,
          deletedFiles: 0,
          freedSpace: 0,
          message: 'No hay archivos de auditoría para limpiar'
        };
      }
      
      const files = await fs.readdir(recordingsDir);
      const metaFiles = files.filter(f => f.endsWith('.meta.json'));
      
      let deletedFiles = 0;
      let freedSpace = 0;
      const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
      
      // Leer todos los archivos y sus metadatos
      const fileInfo = await Promise.all(
        metaFiles.map(async (metaFile) => {
          try {
            const metaPath = path.join(recordingsDir, metaFile);
            const content = await fs.readFile(metaPath, 'utf-8');
            const metadata = JSON.parse(content);
            
            const castFile = metaFile.replace('.meta.json', '.cast');
            const castPath = path.join(recordingsDir, castFile);
            const stats = await fs.stat(castPath);
            
            return {
              metadata,
              castFile,
              metaFile,
              castPath,
              metaPath,
              size: stats.size,
              created: stats.birthtime
            };
          } catch (error) {
            console.error(`Error procesando ${metaFile}:`, error);
            return null;
          }
        })
      );
      
      const validFiles = fileInfo.filter(Boolean);
      
      // Filtrar archivos a eliminar por fecha
      const filesToDelete = validFiles.filter(file => {
        const fileDate = new Date(file.createdAt || file.created);
        return fileDate < cutoffDate;
      });
      
      // Si hay límite de tamaño, ordenar por fecha (más antiguos primero) y eliminar hasta cumplir límite
      if (maxStorageSize > 0) {
        const totalCurrentSize = validFiles.reduce((sum, file) => sum + file.size, 0);
        
        if (totalCurrentSize > maxStorageSize) {
          // Ordenar por fecha de creación (más antiguos primero)
          validFiles.sort((a, b) => new Date(a.createdAt || a.created) - new Date(b.createdAt || b.created));
          
          let currentSize = totalCurrentSize;
          for (const file of validFiles) {
            if (currentSize <= maxStorageSize) break;
            
            if (!filesToDelete.includes(file)) {
              filesToDelete.push(file);
            }
            currentSize -= file.size;
          }
        }
      }
      
      // Eliminar archivos
      for (const file of filesToDelete) {
        try {
          await Promise.all([
            fs.unlink(file.castPath).catch(() => {}),
            fs.unlink(file.metaPath).catch(() => {})
          ]);
          
          deletedFiles++;
          freedSpace += file.size;
          
          console.log(`🗑️ Archivo de auditoría eliminado: ${file.castFile}`);
        } catch (error) {
          console.error(`Error eliminando ${file.castFile}:`, error);
        }
      }
      
      // Actualizar configuración de última limpieza
      const configPath = path.join(userDataPath, 'audit-config.json');
      const config = {
        lastCleanup: Date.now(),
        retentionDays,
        maxStorageSize,
        lastCleanupStats: {
          deletedFiles,
          freedSpace,
          cutoffDate: cutoffDate.getTime()
        }
      };
      
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
      
      console.log(`🧹 Limpieza completada: ${deletedFiles} archivos eliminados, ${freedSpace} bytes liberados`);
      
      return {
        success: true,
        deletedFiles,
        freedSpace,
        message: `Limpieza completada: ${deletedFiles} archivos eliminados`
      };
    } catch (error) {
      console.error('Error ejecutando limpieza:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // AUDIT: Abrir carpeta de auditoría
  ipcMain.handle('audit:open-folder', async () => {
    try {
      const userDataPath = app.getPath('userData');
      const recordingsDir = path.join(userDataPath, 'recordings');
      
      // Crear directorio si no existe
      await fs.mkdir(recordingsDir, { recursive: true });
      
      // Abrir carpeta en el explorador de archivos
      const { shell } = require('electron');
      await shell.openPath(recordingsDir);
      
      return {
        success: true,
        message: 'Carpeta de auditoría abierta'
      };
    } catch (error) {
      console.error('Error abriendo carpeta de auditoría:', error);
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

