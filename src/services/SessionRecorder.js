/**
 * SessionRecorder - Servicio para grabar sesiones SSH en formato asciicast
 * Compatible con asciinema para reproducción posterior
 */

const MAX_RECORDING_BYTES = 32 * 1024 * 1024; // 32 MB por sesion en RAM

class SessionRecorder {
  constructor() {
    this.recordings = new Map(); // Map<tabId, RecordingState>
  }

  _canRecord(recording) {
    if (!recording || recording.isPaused) return false;
    if (recording.bytesRecorded >= MAX_RECORDING_BYTES) {
      if (!recording.memoryCapped) {
        recording.memoryCapped = true;
        recording.isPaused = true;
        console.warn(`[SessionRecorder] Tope de RAM (${MAX_RECORDING_BYTES} bytes) en ${recording.id}. Grabacion pausada.`);
      }
      return false;
    }
    return true;
  }

  /**
   * Inicia una grabación para una sesión
   * @param {string} tabId - ID único de la pestaña
   * @param {Object} metadata - Metadatos de la sesión (host, user, etc.)
   * @returns {string} recordingId
   */
  startRecording(tabId, metadata = {}) {
    if (this.recordings.has(tabId)) {
      throw new Error(`Ya existe una grabación activa para tabId: ${tabId}`);
    }

    const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const recordingState = {
      id: recordingId,
      tabId,
      startTime,
      metadata: {
        version: 2, // asciicast v2 format
        width: metadata.cols || 80,
        height: metadata.rows || 24,
        timestamp: Math.floor(startTime / 1000),
        title: metadata.title || `${metadata.username}@${metadata.host}`,
        env: {
          SHELL: metadata.shell || '/bin/bash',
          TERM: 'xterm-256color'
        },
        // Metadata adicional para nuestra app
        host: metadata.host,
        username: metadata.username,
        port: metadata.port || 22,
        connectionType: metadata.connectionType || 'ssh',
        useBastionWallix: metadata.useBastionWallix || false,
        bastionHost: metadata.bastionHost || null,
        bastionUser: metadata.bastionUser || null,
        sessionName: metadata.sessionName || null
      },
      events: [], // Array de [time, type, data]
      lastEventTime: startTime,
      isPaused: false,
      memoryCapped: false,
      bytesRecorded: 0
    };

    this.recordings.set(tabId, recordingState);
    console.log(`📹 Grabación iniciada: ${recordingId} para ${metadata.username}@${metadata.host}`);
    
    return recordingId;
  }

  /**
   * Registra un evento de salida (output del servidor)
   * @param {string} tabId
   * @param {string|Buffer} data
   */
  recordOutput(tabId, data) {
    const recording = this.recordings.get(tabId);
    if (!this._canRecord(recording)) return;

    const now = Date.now();
    const relativeTime = (now - recording.startTime) / 1000; // Segundos con decimales

    // Convertir Buffer a string si es necesario
    const output = typeof data === 'string' ? data : data.toString('utf-8');
    
    // Formato asciicast v2: [time, "o", data]
    recording.events.push([relativeTime, 'o', output]);
    recording.lastEventTime = now;
    recording.bytesRecorded += output.length;
    this._canRecord(recording);
  }

  /**
   * Registra un evento de entrada (input del usuario)
   * @param {string} tabId
   * @param {string|Buffer} data
   */
  recordInput(tabId, data) {
    const recording = this.recordings.get(tabId);
    if (!this._canRecord(recording)) return;

    const now = Date.now();
    const relativeTime = (now - recording.startTime) / 1000;

    const input = typeof data === 'string' ? data : data.toString('utf-8');
    
    // Formato asciicast v2: [time, "i", data]
    recording.events.push([relativeTime, 'i', input]);
    recording.lastEventTime = now;
    recording.bytesRecorded += input.length;
    this._canRecord(recording);
  }

  /**
   * Pausa la grabación (no registra eventos hasta que se reanude)
   * @param {string} tabId
   */
  pauseRecording(tabId) {
    const recording = this.recordings.get(tabId);
    if (recording) {
      recording.isPaused = true;
      console.log(`⏸️ Grabación pausada: ${recording.id}`);
    }
  }

  /**
   * Reanuda la grabación
   * @param {string} tabId
   */
  resumeRecording(tabId) {
    const recording = this.recordings.get(tabId);
    if (recording) {
      recording.isPaused = false;
      console.log(`▶️ Grabación reanudada: ${recording.id}`);
    }
  }

  /**
   * Detiene y finaliza una grabación
   * @param {string} tabId
   * @returns {Object} Recording data completo
   */
  stopRecording(tabId) {
    const recording = this.recordings.get(tabId);
    if (!recording) {
      throw new Error(`No hay grabación activa para tabId: ${tabId}`);
    }

    const endTime = Date.now();
    const duration = (endTime - recording.startTime) / 1000; // Duración en segundos

    const finalRecording = {
      id: recording.id,
      metadata: recording.metadata,
      events: recording.events,
      duration,
      endTime,
      bytesRecorded: recording.bytesRecorded,
      eventCount: recording.events.length
    };

    this.recordings.delete(tabId);
    console.log(`⏹️ Grabación detenida: ${recording.id} (${duration.toFixed(2)}s, ${recording.events.length} eventos)`);
    
    return finalRecording;
  }

  /**
   * Verifica si hay una grabación activa para un tabId
   * @param {string} tabId
   * @returns {boolean}
   */
  isRecording(tabId) {
    return this.recordings.has(tabId);
  }

  /**
   * Obtiene información de una grabación activa
   * @param {string} tabId
   * @returns {Object|null}
   */
  getRecordingInfo(tabId) {
    const recording = this.recordings.get(tabId);
    if (!recording) return null;

    return {
      id: recording.id,
      startTime: recording.startTime,
      duration: (Date.now() - recording.startTime) / 1000,
      eventCount: recording.events.length,
      bytesRecorded: recording.bytesRecorded,
      isPaused: recording.isPaused,
      memoryCapped: !!recording.memoryCapped,
      metadata: recording.metadata
    };
  }

  /**
   * Convierte una grabación al formato asciicast v2
   * @param {Object} recording
   * @returns {string} JSON string del formato asciicast
   */
  toAsciicast(recording) {
    // Formato asciicast v2: header + eventos separados por newlines
    const header = {
      version: 2,
      width: recording.metadata.width,
      height: recording.metadata.height,
      timestamp: recording.metadata.timestamp,
      duration: recording.duration,
      title: recording.metadata.title,
      env: recording.metadata.env
    };

    // Primera línea: header JSON
    let output = JSON.stringify(header) + '\n';

    // Siguientes líneas: eventos [time, type, data]
    recording.events.forEach(event => {
      output += JSON.stringify(event) + '\n';
    });

    return output;
  }

  /**
   * Parsea un archivo asciicast
   * @param {string} asciicastContent
   * @returns {Object} Recording parseado
   */
  fromAsciicast(asciicastContent) {
    const lines = asciicastContent.trim().split('\n');
    if (lines.length < 1) {
      throw new Error('Archivo asciicast vacío');
    }

    // Primera línea es el header
    const header = JSON.parse(lines[0]);
    
    // Resto son eventos
    const events = lines.slice(1).map(line => JSON.parse(line));

    return {
      metadata: header,
      events,
      duration: header.duration || (events.length > 0 ? events[events.length - 1][0] : 0)
    };
  }

  /**
   * Limpia todas las grabaciones activas (útil al cerrar la app)
   */
  cleanup() {
    this.recordings.clear();
    console.log('🧹 SessionRecorder limpiado');
  }
}

// Singleton para uso en el proceso principal
let sessionRecorderInstance = null;

function getSessionRecorder() {
  if (!sessionRecorderInstance) {
    sessionRecorderInstance = new SessionRecorder();
  }
  return sessionRecorderInstance;
}

// Exportar para CommonJS (Node.js/Electron main process)
module.exports = SessionRecorder;
module.exports.getSessionRecorder = getSessionRecorder;

