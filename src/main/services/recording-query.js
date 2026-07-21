/**
 * Consulta y export de grabaciones de sesion (sin IPC).
 * Usado por McpApiServer; lectura + export solamente.
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { getRecordingsDirectory } = require('../utils/recording-utils');

const RECORDING_ID_RE = /^[a-zA-Z0-9_-]+$/;

function getUserDataPath() {
  return app.getPath('userData');
}

async function resolveRecordingsDir() {
  return getRecordingsDirectory(getUserDataPath());
}

function getMcpExportsDir() {
  return path.join(getUserDataPath(), 'mcp-exports');
}

function assertValidRecordingId(recordingId) {
  if (!recordingId || typeof recordingId !== 'string' || !RECORDING_ID_RE.test(recordingId)) {
    const err = new Error('Invalid recordingId');
    err.code = 'INVALID_ID';
    throw err;
  }
}

function summarizeMetadata(meta) {
  if (!meta) return null;
  return {
    id: meta.id,
    host: meta.host || null,
    username: meta.username || null,
    sessionName: meta.sessionName || null,
    title: meta.title || null,
    timestamp: meta.timestamp ?? null,
    duration: meta.duration ?? null,
    endTime: meta.endTime ?? null,
    eventCount: meta.eventCount ?? null,
    createdAt: meta.createdAt ?? null
  };
}

function recordingTimeMs(meta) {
  if (meta.createdAt != null) return Number(meta.createdAt);
  if (meta.timestamp != null) return Number(meta.timestamp) * 1000;
  return 0;
}

function isPathInside(parentDir, targetPath) {
  const resolvedParent = path.resolve(parentDir);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedParent, resolvedTarget);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function readAllMetadata(recordingsDir) {
  try {
    await fs.access(recordingsDir);
  } catch {
    await fs.mkdir(recordingsDir, { recursive: true });
    return [];
  }

  const files = await fs.readdir(recordingsDir);
  const metaFiles = files.filter((f) => f.endsWith('.meta.json'));

  const recordings = await Promise.all(
    metaFiles.map(async (metaFile) => {
      try {
        const metaPath = path.join(recordingsDir, metaFile);
        const content = await fs.readFile(metaPath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        console.error(`[recording-query] Error leyendo metadata ${metaFile}:`, error.message);
        return null;
      }
    })
  );

  return recordings.filter(Boolean);
}

/**
 * @param {object} filters
 * @param {string} [filters.host]
 * @param {string} [filters.username]
 * @param {string} [filters.sessionName]
 * @param {number|string} [filters.from] epoch ms
 * @param {number|string} [filters.to] epoch ms
 */
async function listRecordings(filters = {}) {
  const recordingsDir = await resolveRecordingsDir();
  let filtered = await readAllMetadata(recordingsDir);

  if (filters.host) {
    const host = String(filters.host).toLowerCase();
    filtered = filtered.filter((r) => r.host && r.host.toLowerCase() === host);
  }

  if (filters.username) {
    const username = String(filters.username).toLowerCase();
    filtered = filtered.filter((r) => r.username && r.username.toLowerCase() === username);
  }

  if (filters.sessionName) {
    const sessionName = String(filters.sessionName).toLowerCase();
    filtered = filtered.filter(
      (r) => r.sessionName && String(r.sessionName).toLowerCase().includes(sessionName)
    );
  }

  if (filters.from != null && filters.from !== '') {
    const fromMs = Number(filters.from);
    if (!Number.isNaN(fromMs)) {
      filtered = filtered.filter((r) => recordingTimeMs(r) >= fromMs);
    }
  }

  if (filters.to != null && filters.to !== '') {
    const toMs = Number(filters.to);
    if (!Number.isNaN(toMs)) {
      filtered = filtered.filter((r) => recordingTimeMs(r) <= toMs);
    }
  }

  filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return {
    success: true,
    recordings: filtered,
    recordingsDir
  };
}

async function getRecordingMeta(recordingId) {
  assertValidRecordingId(recordingId);
  const recordingsDir = await resolveRecordingsDir();
  const metaPath = path.join(recordingsDir, `${recordingId}.meta.json`);

  try {
    const content = await fs.readFile(metaPath, 'utf-8');
    const metadata = JSON.parse(content);
    return { success: true, metadata };
  } catch (error) {
    if (error && (error.code === 'ENOENT' || error.code === 'INVALID_ID')) {
      const err = new Error(`Recording not found: ${recordingId}`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    throw error;
  }
}

/**
 * Copia el .cast completo a mcp-exports o a exportPath validado.
 * @param {string} recordingId
 * @param {string} [exportPath]
 */
async function exportRecording(recordingId, exportPath) {
  assertValidRecordingId(recordingId);

  const recordingsDir = await resolveRecordingsDir();
  const exportsDir = getMcpExportsDir();
  const castPath = path.join(recordingsDir, `${recordingId}.cast`);

  let metadata = null;
  try {
    const metaResult = await getRecordingMeta(recordingId);
    metadata = metaResult.metadata;
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      throw error;
    }
  }

  try {
    await fs.access(castPath);
  } catch {
    const err = new Error(`Recording cast not found: ${recordingId}`);
    err.code = 'NOT_FOUND';
    throw err;
  }

  let targetPath;
  if (exportPath && String(exportPath).trim()) {
    targetPath = path.resolve(String(exportPath).trim());
    if (!targetPath.toLowerCase().endsWith('.cast')) {
      const err = new Error('exportPath must end with .cast');
      err.code = 'INVALID_PATH';
      throw err;
    }
    if (!path.isAbsolute(targetPath)) {
      const err = new Error('exportPath must be an absolute path');
      err.code = 'INVALID_PATH';
      throw err;
    }
    const parentDir = path.dirname(targetPath);
    const underExports = isPathInside(exportsDir, parentDir) || isPathInside(exportsDir, targetPath);
    const underRecordings = isPathInside(recordingsDir, parentDir) || isPathInside(recordingsDir, targetPath);
    if (!underExports && !underRecordings) {
      const err = new Error(
        'exportPath must be under mcp-exports or the recordings directory'
      );
      err.code = 'INVALID_PATH';
      throw err;
    }
    await fs.mkdir(parentDir, { recursive: true });
  } else {
    await fs.mkdir(exportsDir, { recursive: true });
    targetPath = path.join(exportsDir, `${recordingId}.cast`);
  }

  const castContent = await fs.readFile(castPath, 'utf-8');
  await fs.writeFile(targetPath, castContent, 'utf-8');
  const bytes = Buffer.byteLength(castContent, 'utf-8');

  return {
    success: true,
    recordingId,
    exportPath: targetPath,
    bytes,
    metadata: summarizeMetadata(metadata) || { id: recordingId }
  };
}

async function getRecordingStats() {
  const recordingsDir = await resolveRecordingsDir();
  const empty = {
    total: 0,
    totalDuration: 0,
    totalSize: 0,
    byHost: {},
    byUsername: {}
  };

  let validRecordings;
  try {
    validRecordings = await readAllMetadata(recordingsDir);
  } catch {
    return { success: true, stats: empty };
  }

  const stats = {
    total: validRecordings.length,
    totalDuration: validRecordings.reduce((sum, r) => sum + (r.duration || 0), 0),
    totalSize: validRecordings.reduce((sum, r) => sum + (r.bytesRecorded || 0), 0),
    byHost: {},
    byUsername: {}
  };

  validRecordings.forEach((r) => {
    if (r.host) {
      stats.byHost[r.host] = (stats.byHost[r.host] || 0) + 1;
    }
    if (r.username) {
      stats.byUsername[r.username] = (stats.byUsername[r.username] || 0) + 1;
    }
  });

  return { success: true, stats };
}

module.exports = {
  resolveRecordingsDir,
  getMcpExportsDir,
  listRecordings,
  getRecordingMeta,
  exportRecording,
  getRecordingStats,
  summarizeMetadata
};
