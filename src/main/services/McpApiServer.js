/**
 * McpApiServer - Servidor HTTP local para integración MCP
 * 
 * Expone una API REST en localhost para que clientes MCP externos
 * puedan interactuar con NodeTerm de forma segura.
 * 
 * Condiciones de seguridad:
 * 1. Solo escucha en 127.0.0.1 (no accesible desde red)
 * 2. Requiere API Key en header X-API-Key
 * 3. Verifica que la integración esté habilitada
 * 4. Solo funciona con NodeTerm abierto
 * 
 * Endpoints:
 * - GET  /api/status      → Estado del servidor
 * - GET  /api/connections  → Listar conexiones (sin passwords)
 * - POST /api/ssh/exec     → Ejecutar comando SSH (headless, sin UI)
 * - GET  /api/terminals    → Listar terminales PTY abiertos
 * - POST /api/terminals/open|focus|input-lock|exec|write|buffer|wait|status|inject-secret
 * - GET  /api/passwords    → Listar entradas KeePass (metadata; sin secretos)
 * - GET  /api/recordings   → Listar grabaciones (metadata; filtros query)
 * - GET  /api/recordings/stats → Estadisticas de grabaciones
 * - GET  /api/recordings/:id → Metadata de una grabacion
 * - POST /api/recordings/export → Exportar .cast a fichero (mcp-exports)
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Client } = require('ssh2');
const { getNodeTermDataDir } = require('../utils/file-utils');
const recordingQuery = require('./recording-query');

// Ruta del archivo de configuración MCP
const MCP_CONFIG_PATH = path.join(getNodeTermDataDir(), 'mcp-config.json');
// Ruta del archivo de service discovery (para que el MCP client encuentre el puerto)
const MCP_SERVER_INFO_PATH = path.join(getNodeTermDataDir(), 'mcp-server.json');

class McpApiServer {
  constructor() {
    this.server = null;
    this.port = 19800;
    this.config = { enabled: false, apiKey: '', port: 19800 };
    this.sshPool = new Map(); // Pool de conexiones SSH efímeras
    this.sshPoolTimers = new Map(); // Timers de inactividad
    this.requestCount = 0;
    this.startedAt = null;

    // Referencia a la función que obtiene las conexiones del renderer
    // Se inyecta desde main.js
    this._getConnectionsFn = null;
    this._mainWindow = null;
  }

  /**
   * Inyecta dependencias del proceso principal
   */
  setDependencies({ mainWindow, getConnectionsFn }) {
    this._mainWindow = mainWindow;
    this._getConnectionsFn = getConnectionsFn;
  }

  /**
   * Lee la configuración de MCP desde disco
   */
  loadConfig() {
    try {
      if (fs.existsSync(MCP_CONFIG_PATH)) {
        const raw = fs.readFileSync(MCP_CONFIG_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        this.config = {
          enabled: parsed.enabled || false,
          apiKey: parsed.apiKey || '',
          port: parsed.port || 19800
        };
      }
    } catch (err) {
      console.warn('⚠️ [MCP-API] Error leyendo mcp-config.json:', err.message);
    }
    return this.config;
  }

  /**
   * Guarda la configuración de MCP a disco
   */
  saveConfig(config) {
    try {
      this.config = {
        enabled: config.enabled !== undefined ? config.enabled : this.config.enabled,
        apiKey: config.apiKey !== undefined ? config.apiKey : this.config.apiKey,
        port: config.port !== undefined ? config.port : this.config.port
      };
      fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf8');
      return { success: true };
    } catch (err) {
      console.error('❌ [MCP-API] Error guardando mcp-config.json:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Genera una API key aleatoria
   */
  generateApiKey() {
    return crypto.randomBytes(24).toString('hex');
  }

  /**
   * Escribe el archivo de service discovery
   */
  _writeServerInfo() {
    try {
      const info = {
        port: this.port,
        pid: process.pid,
        startedAt: this.startedAt,
        version: require('../../../../package.json').version
      };
      fs.writeFileSync(MCP_SERVER_INFO_PATH, JSON.stringify(info, null, 2), 'utf8');
    } catch (err) {
      // Intentar con ruta relativa alternativa
      try {
        const packagePath = path.join(process.cwd(), 'package.json');
        const version = fs.existsSync(packagePath)
          ? JSON.parse(fs.readFileSync(packagePath, 'utf8')).version
          : 'unknown';
        const info = {
          port: this.port,
          pid: process.pid,
          startedAt: this.startedAt,
          version
        };
        fs.writeFileSync(MCP_SERVER_INFO_PATH, JSON.stringify(info, null, 2), 'utf8');
      } catch (e) {
        console.warn('⚠️ [MCP-API] No se pudo escribir mcp-server.json:', e.message);
      }
    }
  }

  /**
   * Elimina el archivo de service discovery
   */
  _removeServerInfo() {
    try {
      if (fs.existsSync(MCP_SERVER_INFO_PATH)) {
        fs.unlinkSync(MCP_SERVER_INFO_PATH);
      }
    } catch (err) {
      console.warn('⚠️ [MCP-API] No se pudo eliminar mcp-server.json:', err.message);
    }
  }

  /**
   * Parsea el body de un POST request
   */
  _parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
        // Limitar tamaño del body a 1MB
        if (body.length > 1048576) {
          reject(new Error('Request body too large'));
        }
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(new Error('Invalid JSON body'));
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * Envía respuesta JSON
   */
  _sendJson(res, statusCode, data) {
    const json = JSON.stringify(data);
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'http://localhost',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(json);
  }

  /**
   * Helper recursivo para aplanar el árbol de conexiones
   */
  _flattenConnections(nodes, parentGroup = '') {
    let result = [];
    if (!Array.isArray(nodes)) return result;
    for (const node of nodes) {
      const nodeType = node.type || (node.data && node.data.type);
      if (nodeType === 'folder' || node.children) {
        const currentGroup = parentGroup ? `${parentGroup}/${node.label || node.name}` : (node.label || node.name);
        result.push({
          id: node.id || node.key,
          name: node.label || node.name,
          type: 'folder',
          group: parentGroup || null,
          isFolder: true
        });
        if (node.children) {
          result = result.concat(this._flattenConnections(node.children, currentGroup));
        }
      } else {
        const data = node.data || {};
        result.push({
          ...node,
          id: node.id || node.key,
          name: node.label || node.name || `${data.username || data.user || ''}@${data.host || data.server || ''}`,
          host: data.host || data.server || data.hostname,
          port: data.port || 22,
          username: data.username || data.user,
          password: data.password,
          privateKey: data.privateKey,
          passphrase: data.passphrase,
          type: nodeType || 'ssh',
          group: parentGroup || null,
          isFolder: false
        });
      }
    }
    return result;
  }

  /**
   * Helper recursivo para aplanar el árbol de contraseñas
   */
  _flattenPasswords(nodes, parentPath = '') {
    let result = [];
    if (!Array.isArray(nodes)) return result;
    for (const node of nodes) {
      const nodeType = node.type || (node.data && node.data.type);
      const isFolder = nodeType === 'password-folder' || node.droppable;
      const currentPath = parentPath ? `${parentPath}/${node.label}` : node.label;
      if (isFolder) {
        result.push({
          id: node.key || node.id,
          name: node.label,
          type: 'folder',
          path: parentPath || null,
          isFolder: true
        });
        if (node.children) {
          result = result.concat(this._flattenPasswords(node.children, currentPath));
        }
      } else {
        const data = node.data || {};
        result.push({
          id: node.key || node.id,
          name: node.label,
          type: nodeType || 'password',
          path: parentPath || null,
          isFolder: false,
          username: data.username || '',
          password: data.password || '',
          website: data.website || data.url || '',
          notes: data.notes || '',
          api_key: data.api_key || data.apiKey || '',
          wallet_seed: data.wallet_seed || data.seedPhrase || '',
        });
      }
    }
    return result;
  }

  /**
   * Filtra entradas del password manager para no exponer secretos al MCP.
   */
  _sanitizePasswords(passwords) {
    // Nunca incluir password, notes, api_key, wallet_seed, privateKey, passphrase, etc.
    return (passwords || []).map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type || 'password',
      path: p.path || null,
      isFolder: !!p.isFolder,
      username: p.username || '',
      website: p.website || ''
    }));
  }

  /**
   * Helper recursivo para aplanar el árbol de documentos/notas
   */
  _flattenDocuments(nodes, parentPath = '') {
    let result = [];
    if (!Array.isArray(nodes)) return result;
    for (const node of nodes) {
      const isFolder = node.type === 'document-folder';
      const currentPath = parentPath ? `${parentPath}/${node.label}` : node.label;
      if (isFolder) {
        result.push({
          id: node.key || node.id,
          name: node.label,
          type: 'folder',
          path: parentPath || null,
          isFolder: true
        });
        if (node.children) {
          result = result.concat(this._flattenDocuments(node.children, currentPath));
        }
      } else {
        result.push({
          id: node.key || node.id,
          name: node.label,
          type: 'document',
          path: parentPath || null,
          content: node.data ? (node.data.content || node.data.markdownSource || '') : '',
          isFolder: false
        });
      }
    }
    return result;
  }

  /**
   * Obtiene las conexiones guardadas desde el renderer vía IPC
   */
  async _getConnections() {
    if (!this._mainWindow || this._mainWindow.isDestroyed()) {
      return [];
    }

    try {
      // Pedir al renderer que nos envíe las conexiones
      const result = await this._mainWindow.webContents.executeJavaScript(`
        (function() {
          try {
            if (window.nodeterm_integration) {
              const conns = window.nodeterm_integration.getConnections();
              return JSON.stringify(conns);
            }
            const favs = JSON.parse(localStorage.getItem('nodeterm_favorite_connections') || '[]');
            const history = JSON.parse(localStorage.getItem('nodeterm_connection_history') || '[]');
            // Combinar y deduplicar por ID
            const all = [...favs, ...history];
            const seen = new Set();
            const unique = [];
            for (const c of all) {
              if (c && c.id && !seen.has(c.id)) {
                seen.add(c.id);
                unique.push(c);
              }
            }
            return JSON.stringify(unique);
          } catch(e) {
            return '[]';
          }
        })()
      `);
      return JSON.parse(result);
    } catch (err) {
      console.warn('⚠️ [MCP-API] Error obteniendo conexiones:', err.message);
      return [];
    }
  }

  /**
   * Filtra las conexiones para no exponer passwords
   */
  _sanitizeConnections(connections) {
    return connections.map(conn => ({
      id: conn.id,
      name: conn.name || conn.label || `${conn.username}@${conn.host}`,
      host: conn.host,
      port: conn.port || 22,
      username: conn.username,
      type: conn.type || 'ssh',
      group: conn.group || null,
      isFavorite: conn.isFavorite || false,
      lastConnected: conn.lastConnected || null,
      isFolder: conn.isFolder || false,
      // NUNCA exponer password, privateKey, passphrase
    }));
  }

  /**
   * Obtiene una conexión SSH del pool o crea una nueva
   */
  async _getOrCreateSshConnection(connectionId) {
    // Si ya existe en el pool y está activa, reutilizar
    if (this.sshPool.has(connectionId)) {
      const pooled = this.sshPool.get(connectionId);
      if (pooled.client && pooled.client._sock && !pooled.client._sock.destroyed) {
        // Renovar timer de inactividad
        this._renewPoolTimer(connectionId);
        return pooled;
      }
      // Conexión muerta, limpiar
      this._cleanupPoolEntry(connectionId);
    }

    // Buscar la conexión en las guardadas
    const rawConnections = await this._getConnections();
    const flatConnections = this._flattenConnections(rawConnections);
    const connConfig = flatConnections.find(c => 
      c.id === connectionId || 
      (c.name && c.name.toLowerCase() === connectionId.toLowerCase())
    );
    if (!connConfig) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    if (!connConfig.host || !connConfig.username) {
      throw new Error('Connection is missing host or username');
    }

    // Crear nueva conexión SSH
    const client = new Client();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end();
        reject(new Error('SSH connection timeout (15s)'));
      }, 15000);

      client.on('ready', () => {
        clearTimeout(timeout);
        const poolEntry = { client, config: connConfig };
        this.sshPool.set(connectionId, poolEntry);
        this._renewPoolTimer(connectionId);
        console.log(`✅ [MCP-API] Conexión SSH establecida: ${connConfig.username}@${connConfig.host}`);
        resolve(poolEntry);
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        this._cleanupPoolEntry(connectionId);
        reject(new Error(`SSH connection failed: ${err.message}`));
      });

      // Preparar opciones de conexión
      const connectOptions = {
        host: connConfig.host,
        port: connConfig.port || 22,
        username: connConfig.username,
        readyTimeout: 15000,
        // Aceptar host keys automáticamente para conexiones desde API
        // (el usuario ya validó la conexión desde NodeTerm)
        hostVerifier: () => true
      };

      // Autenticación: password o privateKey
      if (connConfig.password) {
        connectOptions.password = connConfig.password;
      }
      if (connConfig.privateKey) {
        connectOptions.privateKey = connConfig.privateKey;
        if (connConfig.passphrase) {
          connectOptions.passphrase = connConfig.passphrase;
        }
      }

      // Si no hay credenciales, intentar con agente SSH del sistema
      if (!connConfig.password && !connConfig.privateKey) {
        if (process.platform === 'win32') {
          connectOptions.agent = '\\\\.\\pipe\\openssh-ssh-agent';
        } else {
          connectOptions.agent = process.env.SSH_AUTH_SOCK;
        }
      }

      client.connect(connectOptions);
    });
  }

  /**
   * Ejecuta un comando SSH
   */
  async _execSshCommand(client, command, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      client.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('data', (data) => {
          stdout += data.toString('utf-8');
        });

        stream.stderr.on('data', (data) => {
          stderr += data.toString('utf-8');
        });

        stream.on('close', (code) => {
          clearTimeout(timer);
          resolve({ stdout, stderr, exitCode: code || 0 });
        });
      });
    });
  }

  /**
   * Renueva el timer de inactividad de una conexión del pool
   */
  _renewPoolTimer(connectionId) {
    if (this.sshPoolTimers.has(connectionId)) {
      clearTimeout(this.sshPoolTimers.get(connectionId));
    }
    // 5 minutos de inactividad → cerrar conexión
    const timer = setTimeout(() => {
      console.log(`🔄 [MCP-API] Cerrando conexión SSH inactiva: ${connectionId}`);
      this._cleanupPoolEntry(connectionId);
    }, 5 * 60 * 1000);
    this.sshPoolTimers.set(connectionId, timer);
  }

  /**
   * Limpia una entrada del pool de conexiones
   */
  _cleanupPoolEntry(connectionId) {
    if (this.sshPoolTimers.has(connectionId)) {
      clearTimeout(this.sshPoolTimers.get(connectionId));
      this.sshPoolTimers.delete(connectionId);
    }
    if (this.sshPool.has(connectionId)) {
      const entry = this.sshPool.get(connectionId);
      try {
        if (entry.client) entry.client.end();
      } catch (e) { /* noop */ }
      this.sshPool.delete(connectionId);
    }
  }

  /**
   * Limpia todo el pool de conexiones SSH
   */
  _cleanupAllPool() {
    for (const [id] of this.sshPool) {
      this._cleanupPoolEntry(id);
    }
  }

  /**
   * Handler: GET /api/status
   */
  async _handleStatus(req, res) {
    let version = 'unknown';
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packagePath)) {
        version = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
      }
    } catch (e) { /* noop */ }

    this._sendJson(res, 200, {
      active: true,
      version,
      port: this.port,
      uptime: this.startedAt ? Math.floor((Date.now() - new Date(this.startedAt).getTime()) / 1000) : 0,
      requestCount: this.requestCount,
      activeConnections: this.sshPool.size
    });
  }

  /**
   * Handler: GET /api/connections
   */
  async _handleListConnections(req, res) {
    try {
      const connections = await this._getConnections();
      const flat = this._flattenConnections(connections);
      const sanitized = this._sanitizeConnections(flat);
      this._sendJson(res, 200, { connections: sanitized });
    } catch (err) {
      this._sendJson(res, 500, { error: 'Failed to list connections', detail: err.message });
    }
  }

  /**
   * Handler: GET /api/passwords
   */
  async _handleListPasswords(req, res) {
    try {
      if (!this._mainWindow || this._mainWindow.isDestroyed()) {
        this._sendJson(res, 503, { error: 'NodeTerm window not available' });
        return;
      }
      const result = await this._mainWindow.webContents.executeJavaScript(`
        (async function() {
          try {
            if (window.nodeterm_integration) {
              const passwords = await window.nodeterm_integration.getPasswords();
              return JSON.stringify(passwords || []);
            }
            return '[]';
          } catch(e) {
            return '[]';
          }
        })()
      `);
      const rawPasswords = JSON.parse(result);
      const flat = this._flattenPasswords(rawPasswords);
      const sanitized = this._sanitizePasswords(flat);
      this._sendJson(res, 200, { passwords: sanitized });
    } catch (err) {
      this._sendJson(res, 500, { error: 'Failed to list passwords', detail: err.message });
    }
  }

  /**
   * Handler: GET /api/documents
   */
  async _handleListDocuments(req, res) {
    try {
      if (!this._mainWindow || this._mainWindow.isDestroyed()) {
        this._sendJson(res, 503, { error: 'NodeTerm window not available' });
        return;
      }
      const result = await this._mainWindow.webContents.executeJavaScript(`
        (async function() {
          try {
            if (window.nodeterm_integration) {
              const docs = await window.nodeterm_integration.getDocuments();
              return JSON.stringify(docs || []);
            }
            return '[]';
          } catch(e) {
            return '[]';
          }
        })()
      `);
      const rawDocs = JSON.parse(result);
      const flat = this._flattenDocuments(rawDocs);
      this._sendJson(res, 200, { documents: flat });
    } catch (err) {
      this._sendJson(res, 500, { error: 'Failed to list documents', detail: err.message });
    }
  }

  /**
   * Handler: POST /api/ssh/exec
   */
  async _handleSshExec(req, res) {
    let body;
    try {
      body = await this._parseBody(req);
    } catch (err) {
      this._sendJson(res, 400, { error: err.message });
      return;
    }

    const { connectionId, command } = body;

    if (!connectionId) {
      this._sendJson(res, 400, { error: 'Missing required field: connectionId' });
      return;
    }
    if (!command) {
      this._sendJson(res, 400, { error: 'Missing required field: command' });
      return;
    }

    // Limitar longitud del comando
    if (command.length > 10000) {
      this._sendJson(res, 400, { error: 'Command too long (max 10000 chars)' });
      return;
    }

    try {
      const poolEntry = await this._getOrCreateSshConnection(connectionId);
      const result = await this._execSshCommand(poolEntry.client, command);
      this._sendJson(res, 200, result);
    } catch (err) {
      const statusCode = err.message.includes('not found') ? 404 : 500;
      this._sendJson(res, statusCode, { error: err.message });
    }
  }

  /**
   * Handler: POST /api/passwords
   */
  async _handleSavePassword(req, res) {
    let body;
    try {
      body = await this._parseBody(req);
    } catch (err) {
      this._sendJson(res, 400, { error: err.message });
      return;
    }

    if (!body.name) {
      this._sendJson(res, 400, { error: 'Missing required field: name' });
      return;
    }

    try {
      if (!this._mainWindow || this._mainWindow.isDestroyed()) {
        this._sendJson(res, 503, { error: 'NodeTerm window not available' });
        return;
      }
      const escapedBody = JSON.stringify(body);
      const result = await this._mainWindow.webContents.executeJavaScript(`
        (async function() {
          try {
            if (window.nodeterm_integration && window.nodeterm_integration.upsertPassword) {
              const newId = await window.nodeterm_integration.upsertPassword(${escapedBody});
              return JSON.stringify({ success: true, id: newId });
            }
            return JSON.stringify({ success: false, error: 'Integration not available' });
          } catch(e) {
            return JSON.stringify({ success: false, error: e.message });
          }
        })()
      `);
      const responseObj = JSON.parse(result);
      if (responseObj.success) {
        this._sendJson(res, 200, responseObj);
      } else {
        this._sendJson(res, 500, { error: responseObj.error });
      }
    } catch (err) {
      this._sendJson(res, 500, { error: 'Failed to save password', detail: err.message });
    }
  }

  /**
   * Llama a un metodo async/sync de window.nodeterm_integration y parsea JSON.
   */
  async _callIntegration(methodName, args = []) {
    if (!this._mainWindow || this._mainWindow.isDestroyed()) {
      const err = new Error('NodeTerm window not available');
      err.statusCode = 503;
      throw err;
    }
    const argsLiteral = JSON.stringify(args);
    const result = await this._mainWindow.webContents.executeJavaScript(`
      (async function() {
        try {
          if (!window.nodeterm_integration || typeof window.nodeterm_integration[${JSON.stringify(methodName)}] !== 'function') {
            return JSON.stringify({ __error: 'Integration method not available', method: ${JSON.stringify(methodName)} });
          }
          const fn = window.nodeterm_integration[${JSON.stringify(methodName)}];
          const args = ${argsLiteral};
          const out = await fn.apply(window.nodeterm_integration, args);
          return JSON.stringify({ __ok: true, result: out === undefined ? null : out });
        } catch (e) {
          return JSON.stringify({ __error: e && e.message ? e.message : String(e) });
        }
      })()
    `);
    const parsed = JSON.parse(result);
    if (parsed.__error) {
      const err = new Error(parsed.__error);
      err.statusCode = 500;
      throw err;
    }
    return parsed.result;
  }

  async _handleListTerminals(req, res) {
    try {
      const result = await this._callIntegration('listOpenTerminals', []);
      const payload = result || { terminals: [] };
      if (!Array.isArray(payload.terminals)) {
        payload.terminals = [];
      }
      if (payload.count == null) {
        payload.count = payload.terminals.length;
      }
      this._sendJson(res, 200, payload);
    } catch (err) {
      this._sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  async _handleTerminalOpen(req, res) {
    let body;
    try {
      body = await this._parseBody(req);
    } catch (err) {
      this._sendJson(res, 400, { error: err.message });
      return;
    }
    if (!body.connectionId && !body.localType) {
      this._sendJson(res, 400, { error: 'Missing connectionId or localType' });
      return;
    }
    try {
      const result = await this._callIntegration('openTerminal', [body]);
      if (result && result.success === false) {
        const code = result.error === 'connection_not_found' ? 404 : 400;
        this._sendJson(res, code, result);
        return;
      }
      this._sendJson(res, 200, result);
    } catch (err) {
      this._sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  async _handleTerminalFocus(req, res) {
    let body;
    try {
      body = await this._parseBody(req);
    } catch (err) {
      this._sendJson(res, 400, { error: err.message });
      return;
    }
    if (!body.terminalId) {
      this._sendJson(res, 400, { error: 'Missing required field: terminalId' });
      return;
    }
    try {
      const result = await this._callIntegration('focusTerminal', [body.terminalId]);
      if (result && result.success === false) {
        this._sendJson(res, result.error === 'terminal_not_found' ? 404 : 400, result);
        return;
      }
      this._sendJson(res, 200, result);
    } catch (err) {
      this._sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  async _handleTerminalInputLock(req, res) {
    let body;
    try {
      body = await this._parseBody(req);
    } catch (err) {
      this._sendJson(res, 400, { error: err.message });
      return;
    }
    if (!body.terminalId || typeof body.locked !== 'boolean') {
      this._sendJson(res, 400, { error: 'Missing terminalId or locked (boolean)' });
      return;
    }
    try {
      const result = await this._callIntegration('setTerminalInputLock', [body.terminalId, body.locked]);
      if (result && result.success === false) {
        this._sendJson(res, result.error === 'terminal_not_found' ? 404 : 400, result);
        return;
      }
      this._sendJson(res, 200, result);
    } catch (err) {
      this._sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  async _handleTerminalExec(req, res) {
    let body;
    try {
      body = await this._parseBody(req);
    } catch (err) {
      this._sendJson(res, 400, { error: err.message });
      return;
    }
    if (!body.terminalId || body.command == null) {
      this._sendJson(res, 400, { error: 'Missing terminalId or command' });
      return;
    }
    try {
      const result = await this._callIntegration('execInTerminal', [body.terminalId, {
        command: body.command,
        timeoutMs: body.timeoutMs,
        humanTyping: body.humanTyping,
        keepLocked: body.keepLocked,
        takeControl: body.takeControl,
        idleMs: body.idleMs,
        appendNewline: body.appendNewline
      }]);
      if (result && result.error === 'terminal_not_found') {
        this._sendJson(res, 404, result);
        return;
      }
      if (result && result.error === 'busy') {
        this._sendJson(res, 409, result);
        return;
      }
      if (result && result.error && result.error !== 'command_required') {
        this._sendJson(res, 400, result);
        return;
      }
      this._sendJson(res, 200, result);
    } catch (err) {
      this._sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  async _handleTerminalWrite(req, res) {
    let body;
    try {
      body = await this._parseBody(req);
    } catch (err) {
      this._sendJson(res, 400, { error: err.message });
      return;
    }
    if (!body.terminalId) {
      this._sendJson(res, 400, { error: 'Missing required field: terminalId' });
      return;
    }
    try {
      const result = await this._callIntegration('writeTerminal', [body.terminalId, {
        data: body.data,
        keys: body.keys,
        humanTyping: body.humanTyping,
        takeControl: body.takeControl,
        keepLocked: body.keepLocked
      }]);
      if (result && result.success === false) {
        const code = result.error === 'terminal_not_found' ? 404 : (result.statusCode || 400);
        this._sendJson(res, code, result);
        return;
      }
      this._sendJson(res, 200, result);
    } catch (err) {
      this._sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  /**
   * Handler: POST /api/terminals/inject-secret
   * Inyecta un secreto por referencia (connection|keepass). Nunca acepta ni devuelve el valor.
   */
  async _handleTerminalInjectSecret(req, res) {
    let body;
    try {
      body = await this._parseBody(req);
    } catch (err) {
      this._sendJson(res, 400, { error: err.message });
      return;
    }

    if (!body || !body.terminalId) {
      this._sendJson(res, 400, { error: 'Missing required field: terminalId' });
      return;
    }
    if (body.password != null || body.data != null || body.secret != null || body.passphrase != null) {
      this._sendJson(res, 400, {
        error: 'Plaintext secrets are not accepted. Use inject-secret by reference only (source + id).'
      });
      return;
    }
    if (!body.source) {
      this._sendJson(res, 400, { error: 'Missing required field: source (connection|keepass)' });
      return;
    }
    if (body.promptTicket == null || String(body.promptTicket).length === 0) {
      this._sendJson(res, 400, {
        success: false,
        error: 'prompt_ticket_required'
      });
      return;
    }

    try {
      const result = await this._callIntegration('injectSecretIntoTerminal', [body.terminalId, {
        source: body.source,
        id: body.id != null ? body.id : null,
        field: body.field,
        promptTicket: body.promptTicket,
        keepLocked: body.keepLocked
      }]);
      if (result && result.success === false) {
        let code = result.statusCode || 400;
        if (result.error === 'terminal_not_found' || result.error === 'secret_not_found') code = 404;
        else if (result.error === 'rate_limited') code = 429;
        else if (
          result.error === 'password_prompt_required' ||
          result.error === 'prompt_ticket_expired' ||
          result.error === 'command_correlation_required' ||
          result.error === 'password_prompt_already_consumed'
        ) code = 403;
        this._sendJson(res, code, {
          success: false,
          error: result.error
        });
        return;
      }
      this._sendJson(res, 200, {
        success: true,
        matchedPrompt: result && result.matchedPrompt ? result.matchedPrompt : null,
        source: result && result.source ? result.source : body.source
      });
    } catch (err) {
      this._sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  async _handleTerminalBuffer(req, res) {
    let body;
    try {
      body = await this._parseBody(req);
    } catch (err) {
      this._sendJson(res, 400, { error: err.message });
      return;
    }
    if (!body.terminalId) {
      this._sendJson(res, 400, { error: 'Missing required field: terminalId' });
      return;
    }
    try {
      const result = await this._callIntegration('readTerminalBuffer', [body.terminalId, {
        maxChars: body.maxChars,
        maxLines: body.maxLines,
        fromOffset: body.fromOffset
      }]);
      if (result && result.error === 'terminal_not_found') {
        this._sendJson(res, 404, result);
        return;
      }
      this._sendJson(res, 200, result);
    } catch (err) {
      this._sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  async _handleTerminalWait(req, res) {
    let body;
    try {
      body = await this._parseBody(req);
    } catch (err) {
      this._sendJson(res, 400, { error: err.message });
      return;
    }
    if (!body.terminalId || body.pattern == null) {
      this._sendJson(res, 400, { error: 'Missing terminalId or pattern' });
      return;
    }
    try {
      const result = await this._callIntegration('waitTerminalPattern', [body.terminalId, {
        pattern: body.pattern,
        regex: body.regex,
        timeoutMs: body.timeoutMs,
        includeBuffer: body.includeBuffer,
        takeControl: body.takeControl,
        keepLocked: body.keepLocked
      }]);
      if (result && result.error === 'terminal_not_found') {
        this._sendJson(res, 404, result);
        return;
      }
      this._sendJson(res, 200, result);
    } catch (err) {
      this._sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  async _handleTerminalStatus(req, res) {
    let body;
    try {
      body = await this._parseBody(req);
    } catch (err) {
      this._sendJson(res, 400, { error: err.message });
      return;
    }
    if (!body.terminalId) {
      this._sendJson(res, 400, { error: 'Missing required field: terminalId' });
      return;
    }
    try {
      const result = await this._callIntegration('getTerminalStatus', [body.terminalId]);
      if (result && result.error === 'terminal_not_found') {
        this._sendJson(res, 404, result);
        return;
      }
      this._sendJson(res, 200, result);
    } catch (err) {
      this._sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  /**
   * Handler: POST /api/documents
   */
  async _handleSaveDocument(req, res) {
    let body;
    try {
      body = await this._parseBody(req);
    } catch (err) {
      this._sendJson(res, 400, { error: err.message });
      return;
    }

    if (!body.name) {
      this._sendJson(res, 400, { error: 'Missing required field: name' });
      return;
    }

    try {
      if (!this._mainWindow || this._mainWindow.isDestroyed()) {
        this._sendJson(res, 503, { error: 'NodeTerm window not available' });
        return;
      }
      const escapedBody = JSON.stringify(body);
      const result = await this._mainWindow.webContents.executeJavaScript(`
        (async function() {
          try {
            if (window.nodeterm_integration && window.nodeterm_integration.upsertDocument) {
              const newId = await window.nodeterm_integration.upsertDocument(${escapedBody});
              return JSON.stringify({ success: true, id: newId });
            }
            return JSON.stringify({ success: false, error: 'Integration not available' });
          } catch(e) {
            return JSON.stringify({ success: false, error: e.message });
          }
        })()
      `);
      const responseObj = JSON.parse(result);
      if (responseObj.success) {
        this._sendJson(res, 200, responseObj);
      } else {
        this._sendJson(res, 500, { error: responseObj.error });
      }
    } catch (err) {
      this._sendJson(res, 500, { error: 'Failed to save note', detail: err.message });
    }
  }

  /**
   * Handler: GET /api/recordings
   */
  async _handleListRecordings(req, res, searchParams) {
    try {
      const filters = {
        host: searchParams.get('host') || undefined,
        username: searchParams.get('username') || undefined,
        sessionName: searchParams.get('sessionName') || undefined,
        from: searchParams.get('from') || undefined,
        to: searchParams.get('to') || undefined
      };
      const result = await recordingQuery.listRecordings(filters);
      this._sendJson(res, 200, {
        success: true,
        recordings: result.recordings || [],
        recordingsDir: result.recordingsDir
      });
    } catch (err) {
      this._sendJson(res, 500, { error: 'Failed to list recordings', detail: err.message });
    }
  }

  /**
   * Handler: GET /api/recordings/stats
   */
  async _handleRecordingStats(req, res) {
    try {
      const result = await recordingQuery.getRecordingStats();
      this._sendJson(res, 200, result);
    } catch (err) {
      this._sendJson(res, 500, { error: 'Failed to get recording stats', detail: err.message });
    }
  }

  /**
   * Handler: GET /api/recordings/:id
   */
  async _handleGetRecording(req, res, recordingId) {
    try {
      const result = await recordingQuery.getRecordingMeta(recordingId);
      this._sendJson(res, 200, result);
    } catch (err) {
      if (err.code === 'NOT_FOUND' || err.code === 'INVALID_ID') {
        this._sendJson(res, 404, { error: err.message });
        return;
      }
      this._sendJson(res, 500, { error: 'Failed to get recording', detail: err.message });
    }
  }

  /**
   * Handler: POST /api/recordings/export
   * Body: { recordingId, exportPath? }
   * Escribe el .cast completo a disco; no cambia config de grabacion.
   */
  async _handleExportRecording(req, res) {
    try {
      const body = await this._parseBody(req);
      const recordingId = body && body.recordingId;
      if (!recordingId) {
        this._sendJson(res, 400, { error: 'recordingId is required' });
        return;
      }
      const result = await recordingQuery.exportRecording(recordingId, body.exportPath);
      this._sendJson(res, 200, result);
    } catch (err) {
      if (err.code === 'NOT_FOUND' || err.code === 'INVALID_ID') {
        this._sendJson(res, 404, { error: err.message });
        return;
      }
      if (err.code === 'INVALID_PATH') {
        this._sendJson(res, 400, { error: err.message });
        return;
      }
      this._sendJson(res, 500, { error: 'Failed to export recording', detail: err.message });
    }
  }

  /**
   * Router principal
   */
  async _handleRequest(req, res) {
    this.requestCount++;
    const { method } = req;
    let pathname = req.url || '/';
    let searchParams = new URLSearchParams();
    try {
      const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
      pathname = parsedUrl.pathname;
      searchParams = parsedUrl.searchParams;
    } catch {
      const q = (req.url || '').indexOf('?');
      pathname = q >= 0 ? req.url.slice(0, q) : (req.url || '/');
    }

    // CORS preflight
    if (method === 'OPTIONS') {
      this._sendJson(res, 204, {});
      return;
    }

    // Auth: API Key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      this._sendJson(res, 401, { error: 'Missing X-API-Key header' });
      return;
    }
    if (apiKey !== this.config.apiKey) {
      this._sendJson(res, 403, { error: 'Invalid API key' });
      return;
    }

    // State: integración habilitada
    if (!this.config.enabled) {
      this._sendJson(res, 503, { error: 'MCP integration is disabled' });
      return;
    }

    // Router
    try {
      if (method === 'GET' && pathname === '/api/status') {
        await this._handleStatus(req, res);
      } else if (method === 'GET' && pathname === '/api/connections') {
        await this._handleListConnections(req, res);
      } else if (method === 'GET' && pathname === '/api/passwords') {
        await this._handleListPasswords(req, res);
      } else if (method === 'GET' && pathname === '/api/documents') {
        await this._handleListDocuments(req, res);
      } else if (method === 'POST' && pathname === '/api/ssh/exec') {
        await this._handleSshExec(req, res);
      } else if (method === 'GET' && pathname === '/api/terminals') {
        await this._handleListTerminals(req, res);
      } else if (method === 'POST' && pathname === '/api/terminals/open') {
        await this._handleTerminalOpen(req, res);
      } else if (method === 'POST' && pathname === '/api/terminals/focus') {
        await this._handleTerminalFocus(req, res);
      } else if (method === 'POST' && pathname === '/api/terminals/input-lock') {
        await this._handleTerminalInputLock(req, res);
      } else if (method === 'POST' && pathname === '/api/terminals/exec') {
        await this._handleTerminalExec(req, res);
      } else if (method === 'POST' && pathname === '/api/terminals/write') {
        await this._handleTerminalWrite(req, res);
      } else if (method === 'POST' && pathname === '/api/terminals/inject-secret') {
        await this._handleTerminalInjectSecret(req, res);
      } else if (method === 'POST' && pathname === '/api/terminals/buffer') {
        await this._handleTerminalBuffer(req, res);
      } else if (method === 'POST' && pathname === '/api/terminals/wait') {
        await this._handleTerminalWait(req, res);
      } else if (method === 'POST' && pathname === '/api/terminals/status') {
        await this._handleTerminalStatus(req, res);
      } else if (method === 'POST' && pathname === '/api/passwords') {
        await this._handleSavePassword(req, res);
      } else if (method === 'POST' && pathname === '/api/documents') {
        await this._handleSaveDocument(req, res);
      } else if (method === 'GET' && pathname === '/api/recordings') {
        await this._handleListRecordings(req, res, searchParams);
      } else if (method === 'GET' && pathname === '/api/recordings/stats') {
        await this._handleRecordingStats(req, res);
      } else if (method === 'POST' && pathname === '/api/recordings/export') {
        await this._handleExportRecording(req, res);
      } else if (method === 'GET' && pathname.startsWith('/api/recordings/')) {
        const recordingId = decodeURIComponent(pathname.slice('/api/recordings/'.length));
        if (!recordingId || recordingId.includes('/')) {
          this._sendJson(res, 404, { error: 'Not found' });
        } else {
          await this._handleGetRecording(req, res, recordingId);
        }
      } else {
        this._sendJson(res, 404, {
          error: 'Not found',
          availableEndpoints: [
            '/api/status',
            '/api/connections',
            '/api/passwords',
            '/api/documents',
            '/api/ssh/exec',
            '/api/terminals',
            'POST /api/terminals/open',
            'POST /api/terminals/focus',
            'POST /api/terminals/input-lock',
            'POST /api/terminals/exec',
            'POST /api/terminals/write',
            'POST /api/terminals/inject-secret',
            'POST /api/terminals/buffer',
            'POST /api/terminals/wait',
            'POST /api/terminals/status',
            'POST /api/passwords',
            'POST /api/documents',
            'GET /api/recordings',
            'GET /api/recordings/stats',
            'GET /api/recordings/:id',
            'POST /api/recordings/export'
          ]
        });
      }
    } catch (err) {
      console.error('❌ [MCP-API] Error en request:', err);
      this._sendJson(res, 500, { error: 'Internal server error' });
    }
  }

  /**
   * Inicia el servidor HTTP
   */
  start(port) {
    return new Promise((resolve, reject) => {
      if (this.server) {
        console.warn('⚠️ [MCP-API] Servidor ya está corriendo');
        resolve({ success: true, port: this.port });
        return;
      }

      this.port = port || this.config.port || 19800;
      this.server = http.createServer((req, res) => this._handleRequest(req, res));

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`❌ [MCP-API] Puerto ${this.port} ya está en uso`);
          this.server = null;
          reject(new Error(`Port ${this.port} is already in use`));
        } else {
          console.error('❌ [MCP-API] Error del servidor:', err);
          this.server = null;
          reject(err);
        }
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        this.startedAt = new Date().toISOString();
        this._writeServerInfo();
        console.log(`✅ [MCP-API] Servidor iniciado en http://127.0.0.1:${this.port}`);
        resolve({ success: true, port: this.port });
      });
    });
  }

  /**
   * Detiene el servidor HTTP
   */
  stop() {
    return new Promise((resolve) => {
      this._cleanupAllPool();
      this._removeServerInfo();

      if (!this.server) {
        resolve({ success: true });
        return;
      }

      this.server.close(() => {
        console.log('🔴 [MCP-API] Servidor detenido');
        this.server = null;
        this.startedAt = null;
        this.requestCount = 0;
        resolve({ success: true });
      });

      // Force close después de 3s si no cierra limpiamente
      setTimeout(() => {
        if (this.server) {
          this.server = null;
          this.startedAt = null;
          resolve({ success: true });
        }
      }, 3000);
    });
  }

  /**
   * Reinicia el servidor
   */
  async restart() {
    await this.stop();
    this.loadConfig();
    if (this.config.enabled) {
      return this.start(this.config.port);
    }
    return { success: true, stopped: true };
  }

  /**
   * Obtiene el estado actual del servidor
   */
  getStatus() {
    return {
      running: !!this.server,
      port: this.port,
      startedAt: this.startedAt,
      uptime: this.startedAt ? Math.floor((Date.now() - new Date(this.startedAt).getTime()) / 1000) : 0,
      requestCount: this.requestCount,
      activeConnections: this.sshPool.size,
      enabled: this.config.enabled
    };
  }
}

// Singleton
module.exports = new McpApiServer();
