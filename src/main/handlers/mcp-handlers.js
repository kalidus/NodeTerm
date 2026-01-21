/**
 * Manejadores IPC para sincronización con MCP Server
 * Gestiona conexiones SSH y contraseñas en memoria
 */

const { ipcMain } = require('electron');

// Variables para tracking de cambios
let lastConnectionCount = 0;
let lastPasswordCount = 0;

/**
 * Registra todos los manejadores IPC relacionados con MCP
 */
function registerMCPHandlers() {
  // 🔗 IPC Handler para sincronizar conexiones SSH con el MCP (EN MEMORIA, SIN ARCHIVO)
  ipcMain.on('app:save-ssh-connections-for-mcp', async (event, connections) => {
    try {
      if (!Array.isArray(connections)) {
        console.warn('[SSH MCP] ⚠️ Parámetro no es un array:', typeof connections);
        return;
      }
      
      // Guardar en memoria en el MCP Server
      if (global.sshTerminalServer) {
        global.sshTerminalServer.nodeTermConnections = connections;
        // Solo loggear la primera vez o cuando cambia el número de conexiones
        if (lastConnectionCount !== connections.length) {
          console.log(`✅ [SSH MCP] ${connections.length} conexiones SSH sincronizadas en memoria`);
          lastConnectionCount = connections.length;
        }
      } else {
        console.warn('⚠️ [SSH MCP] SSH Terminal Server no disponible aún');
      }
    } catch (error) {
      console.error('[APP SSH] ❌ Error sincronizando conexiones:', error.message);
    }
  });

  // 🔐 IPC Handler para sincronizar PASSWORDS con el MCP (KeepPass, Password Manager, etc.)
  ipcMain.on('app:save-passwords-for-mcp', async (event, passwords) => {
    try {
      if (!Array.isArray(passwords)) {
        console.warn('[Password MCP] ⚠️ Parámetro no es un array:', typeof passwords);
        return;
      }
      
      // Guardar en memoria en el MCP Server
      if (global.sshTerminalServer) {
        global.sshTerminalServer.nodeTermPasswords = passwords;
        // Solo loggear la primera vez o cuando cambia el número
        if (lastPasswordCount !== passwords.length) {
          console.log(`✅ [Password MCP] ${passwords.length} contraseñas sincronizadas en memoria`);
          lastPasswordCount = passwords.length;
        }
      } else {
        console.warn('⚠️ [Password MCP] MCP Server no disponible aún');
      }
    } catch (error) {
      console.error('[APP Password] ❌ Error sincronizando contraseñas:', error.message);
    }
  });

  console.log('✅ [MCP Handlers] Registrados');
}

module.exports = { registerMCPHandlers };
