const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Handlers para sincronización de temas entre instancias
 * Permite que diferentes ventanas/instancias compartan la configuración de tema
 * sin depender de localStorage (que no se comparte en instancias secundarias)
 */

// Ruta al archivo de configuración de tema compartido
const THEME_CONFIG_PATH = path.join(os.homedir(), '.nodeterm', 'theme.json');

function registerThemeHandlers(dependencies) {
    // Handler para obtener el tema actual
    ipcMain.handle('theme:get', async () => {
        let retries = 3;
        while (retries > 0) {
            try {
                if (fs.existsSync(THEME_CONFIG_PATH)) {
                    const data = fs.readFileSync(THEME_CONFIG_PATH, 'utf8');
                    try {
                        return JSON.parse(data);
                    } catch (e) {
                        console.warn(`⚠️ [Theme] Error parseando theme.json (intento ${4 - retries}):`, e);
                        retries--;
                        await new Promise(resolve => setTimeout(resolve, 100));
                        continue;
                    }
                }
                return null;
            } catch (error) {
                console.warn(`⚠️ [Theme] Error leyendo configuración de tema (intento ${4 - retries}):`, error.message);
                retries--;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        return null;
    });

    // Handler para guardar el tema actual
    ipcMain.handle('theme:save', async (event, themeConfig) => {
        try {
            const dir = os.homedir(); // Ensure .nodeterm exists (should exist)
            const configDir = path.join(dir, '.nodeterm');
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Escritura atómica simple: Escribir a un archivo temporal y luego renombrar
            const tempPath = `${THEME_CONFIG_PATH}.tmp`;
            fs.writeFileSync(tempPath, JSON.stringify(themeConfig, null, 2), 'utf8');
            fs.renameSync(tempPath, THEME_CONFIG_PATH);

            return { success: true };
        } catch (error) {
            console.error('❌ [Theme] Error guardando configuración de tema:', error.message);
            return { success: false, error: error.message };
        }
    });
}

module.exports = {
    registerThemeHandlers
};
