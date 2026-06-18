// ============================================
// SERVICIO DE HISTORIAL DE CONEXIONES
// Gestiona el historial de conexiones SSH recientes y favoritas
// ============================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getNodeTermDataDir, encryptStringSecurely, decryptStringSecurely } = require('../utils/file-utils');

let connectionHistory = {
  recent: [],
  favorites: []
};

// Helper para espera síncrona sin consumo de CPU (yield al planificador del SO)
function sleepSync(ms) {
  try {
    const sab = new SharedArrayBuffer(4);
    const int32 = new Int32Array(sab);
    Atomics.wait(int32, 0, 0, ms);
  } catch (e) {
    // Fallback si SharedArrayBuffer no es compatible
    const start = Date.now();
    while (Date.now() - start < ms) { }
  }
}

// Cargar historial de conexiones
function loadConnectionHistory(retries = 3) {
  try {
    const historyPath = path.join(getNodeTermDataDir(), 'connection_history.json');
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8');
      try {
        const decrypted = decryptStringSecurely(data);
        connectionHistory = JSON.parse(decrypted);
      } catch (parseError) {
        console.warn('⚠️ Error parseando historial, archivo corrupto?', parseError);
        // Si el archivo está corrupto (vacío), mantener defaults
      }
    }
  } catch (error) {
    console.error('Error cargando historial de conexiones:', error);
    // Retry si es bloqueo de archivo
    if (retries > 0 && (error.code === 'EBUSY' || error.code === 'EPERM')) {
      console.log(`Reintentando carga de historial... (${retries} restantes)`);
      sleepSync(100);
      loadConnectionHistory(retries - 1);
    }
  }
}

// Guardar historial de conexiones
function saveConnectionHistory() {
  try {
    const historyDir = getNodeTermDataDir();
    const historyPath = path.join(historyDir, 'connection_history.json');
    const tempPath = path.join(historyDir, `connection_history.${Date.now()}.tmp`);

    // Escritura atómica encriptada: escribir a temp, luego renombrar
    const encrypted = encryptStringSecurely(JSON.stringify(connectionHistory, null, 2));
    fs.writeFileSync(tempPath, encrypted, 'utf8');

    // Retry rename loop
    let retries = 5;
    while (retries > 0) {
      try {
        fs.renameSync(tempPath, historyPath);
        break;
      } catch (e) {
        retries--;
        if (retries === 0) throw e;
        sleepSync(50);
      }
    }
  } catch (error) {
    console.error('Error guardando historial de conexiones:', error);
  }
}

// Agregar conexión al historial
function addToConnectionHistory(connection) {
  const historyItem = {
    id: Date.now().toString(),
    name: connection.name || `${connection.username}@${connection.host}`,
    host: connection.host,
    username: connection.username,
    port: connection.port || 22,
    lastConnected: new Date(),
    status: 'success',
    connectionTime: Math.random() * 3 + 0.5 // Simular tiempo de conexión
  };

  // Remover entrada existente si ya existe
  connectionHistory.recent = connectionHistory.recent.filter(
    item => !(item.host === connection.host && item.username === connection.username && item.port === (connection.port || 22))
  );

  // Agregar al inicio
  connectionHistory.recent.unshift(historyItem);

  // Mantener solo las últimas 10 conexiones
  connectionHistory.recent = connectionHistory.recent.slice(0, 10);

  saveConnectionHistory();
}

// Obtener historial de conexiones
function getConnectionHistory() {
  loadConnectionHistory();
  return connectionHistory;
}

// Alternar favorito
function toggleFavoriteConnection(connectionId) {
  try {
    loadConnectionHistory();

    // Buscar en recientes
    const recentIndex = connectionHistory.recent.findIndex(conn => conn.id === connectionId);
    if (recentIndex !== -1) {
      const connection = connectionHistory.recent[recentIndex];
      if (connection.isFavorite) {
        // Quitar de favoritos
        connection.isFavorite = false;
        connectionHistory.favorites = connectionHistory.favorites.filter(fav => fav.id !== connectionId);
      } else {
        // Agregar a favoritos
        connection.isFavorite = true;
        connectionHistory.favorites.push({ ...connection });
      }
      saveConnectionHistory();
      return { success: true, isFavorite: connection.isFavorite };
    }

    // Buscar en favoritos
    const favoriteIndex = connectionHistory.favorites.findIndex(conn => conn.id === connectionId);
    if (favoriteIndex !== -1) {
      connectionHistory.favorites.splice(favoriteIndex, 1);
      saveConnectionHistory();
      return { success: true, isFavorite: false };
    }

    return { success: false, error: 'Conexión no encontrada' };
  } catch (error) {
    console.error('Error al alternar favorito:', error);
    return { success: false, error: error.message };
  }
}

// Eliminar conexión del historial
function removeFromHistory(connectionId) {
  try {
    loadConnectionHistory();

    // Eliminar de recientes
    const beforeLength = connectionHistory.recent.length;
    connectionHistory.recent = connectionHistory.recent.filter(conn => conn.id !== connectionId);

    // Eliminar de favoritos
    connectionHistory.favorites = connectionHistory.favorites.filter(conn => conn.id !== connectionId);

    saveConnectionHistory();

    return { success: true, removed: beforeLength > connectionHistory.recent.length };
  } catch (error) {
    console.error('Error eliminando conexión del historial:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  loadConnectionHistory,
  saveConnectionHistory,
  addToConnectionHistory,
  getConnectionHistory,
  toggleFavoriteConnection,
  removeFromHistory
};
