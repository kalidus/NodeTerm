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
        try {
            if (fs.existsSync(THEME_CONFIG_PATH)) {
                const data = fs.readFileSync(THEME_CONFIG_PATH, 'utf8');
                return JSON.parse(data);
            }
            return null;
        } catch (error) {
            console.warn('⚠️ [Theme] Error leyendo configuración de tema:', error.message);
            return null;
        }
    });

    // Handler para guardar el tema actual
    ipcMain.handle('theme:save', async (event, themeConfig) => {
        try {
            const dir = os.homedir(); // Ensure .nodeterm exists (should exist)
            const configDir = path.join(dir, '.nodeterm');
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Escritura atómica simple
            fs.writeFileSync(THEME_CONFIG_PATH, JSON.stringify(themeConfig, null, 2), 'utf8');
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
