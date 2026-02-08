/**
 * Handlers para sincronización de localStorage entre instancias
 * 
 * Problema: Las instancias secundarias usan un UserData temporal y no tienen acceso
 * al localStorage de la instancia principal.
 * 
 * Solución: Sincronizar datos críticos a un archivo compartido (~/.nodeterm/app-data.json)
 * La instancia secundaria carga estos datos al iniciar.
 */

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Ruta al archivo de datos compartidos
const APP_DATA_PATH = path.join(os.homedir(), '.nodeterm', 'app-data.json');

// Lista de claves de localStorage que deben sincronizarse entre instancias
const SYNC_KEYS = [
    // Conexiones encriptadas
    'connections_encrypted',
    'passwords_encrypted',
    'nodeterm_secure_sessions',

    // Historial y favoritos
    'nodeterm_connection_history',
    'nodeterm_favorite_connections',

    // Árbol de datos (conexiones organizadas)
    'basicapp2_tree_data',

    // Configuración de sincronización
    'nodeterm_sync_config',

    // Temas y configuración visual
    'ui_theme',
    'basicapp_statusbar_theme',
    'basicapp_terminal_theme',
    'iconTheme',
    'explorerFont',
    'explorerFontSize',
    'explorerColorTheme',
    'sidebarFont',
    'sidebarFontSize',

    // Configuración de terminal
    'basicapp_statusbar_height',
    'basicapp_local_terminal_font_family',
    'basicapp_local_terminal_font_size',
    'basicapp_local_powershell_theme',
    'basicapp_local_linux_terminal_theme',

    // Grupos de favoritos
    'nodeterm_favorite_groups',
    'nodeterm_group_assignments',
    'nodeterm_filter_config',

    // Configuración específica de terminales (Docker/Linux)
    'localDockerTerminalTheme',
    'nodeterm_docker_font_family',
    'nodeterm_docker_font_size',
    'nodeterm_linux_font_family',
    'nodeterm_linux_font_size',

    // Master key (backup)
    'nodeterm_master_key'
];

/**
 * Registra los handlers de sincronización de datos de aplicación
 */
function registerAppDataHandlers(dependencies) {
    // Handler para obtener todos los datos sincronizados
    ipcMain.handle('appdata:get-all', async () => {
        let retries = 3;
        while (retries > 0) {
            try {
                if (fs.existsSync(APP_DATA_PATH)) {
                    const data = fs.readFileSync(APP_DATA_PATH, 'utf8');
                    try {
                        return JSON.parse(data);
                    } catch (e) {
                        console.warn(`⚠️ [AppData] Error parseando app-data.json (intento ${4 - retries}):`, e);
                        // Si el archivo está corrupto o vacío, podría ser porque se está escribiendo
                        retries--;
                        await new Promise(resolve => setTimeout(resolve, 100));
                        continue;
                    }
                }
                return null;
            } catch (error) {
                console.warn(`⚠️ [AppData] Error leyendo datos (intento ${4 - retries}):`, error.message);
                retries--;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        return null;
    });

    // Handler para guardar todos los datos sincronizados
    ipcMain.handle('appdata:save-all', async (event, data) => {
        try {
            const configDir = path.join(os.homedir(), '.nodeterm');
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Añadir timestamp para saber cuándo se sincronizó
            const dataWithMeta = {
                ...data,
                _syncedAt: new Date().toISOString()
            };

            // ESCRITURA ATÓMICA: Escribir a un archivo temporal único y luego renombrar
            // Usamos un ID único para evitar colisiones entre múltiples procesos (ENOENT race condition)
            const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const tempPath = path.join(path.dirname(APP_DATA_PATH), `app-data.${uniqueId}.tmp`);

            fs.writeFileSync(tempPath, JSON.stringify(dataWithMeta, null, 2), 'utf8');

            try {
                fs.renameSync(tempPath, APP_DATA_PATH);
            } catch (err) {
                // Intentar limpiar el archivo temporal si falla el renombrado
                try { fs.unlinkSync(tempPath); } catch (e) { /* ignorar error de limpieza */ }
                throw err;
            }

            return { success: true };
        } catch (error) {
            console.error('❌ [AppData] Error guardando datos:', error.message);
            return { success: false, error: error.message };
        }
    });

    // Handler para obtener la lista de claves que deben sincronizarse
    ipcMain.handle('appdata:get-sync-keys', async () => {
        return SYNC_KEYS;
    });
}

module.exports = {
    registerAppDataHandlers,
    SYNC_KEYS
};
