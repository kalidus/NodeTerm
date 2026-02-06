const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Handlers para persistencia de seguridad (Master Key)
 * Permite que diferentes ventanas/instancias compartan la clave maestra cifrada
 * sin depender de localStorage (que no se comparte en instancias secundarias)
 */

// Ruta al archivo de seguridad compartido
const SECURITY_CONFIG_PATH = path.join(os.homedir(), '.nodeterm', 'security.json');

function registerSecurityHandlers(dependencies) {
    // Handler para obtener la clave maestra guardada (encriptada)
    ipcMain.handle('security:get-master-key', async () => {
        try {
            if (fs.existsSync(SECURITY_CONFIG_PATH)) {
                const data = fs.readFileSync(SECURITY_CONFIG_PATH, 'utf8');
                try {
                    const config = JSON.parse(data);
                    return config.masterKey || null;
                } catch (e) {
                    console.error('⚠️ [Security] Error parseando security.json:', e);
                    return null;
                }
            }
            return null;
        } catch (error) {
            console.warn('⚠️ [Security] Error leyendo seguridad:', error.message);
            return null;
        }
    });

    // Handler para guardar la clave maestra (encriptada)
    ipcMain.handle('security:save-master-key', async (event, encryptedMasterKey) => {
        try {
            const dir = os.homedir();
            const configDir = path.join(dir, '.nodeterm');
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            let config = {};
            if (fs.existsSync(SECURITY_CONFIG_PATH)) {
                try {
                    config = JSON.parse(fs.readFileSync(SECURITY_CONFIG_PATH, 'utf8'));
                } catch (e) { }
            }

            config.masterKey = encryptedMasterKey;
            config.updatedAt = new Date().toISOString();

            fs.writeFileSync(SECURITY_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
            return { success: true };
        } catch (error) {
            console.error('❌ [Security] Error guardando clave maestra:', error.message);
            return { success: false, error: error.message };
        }
    });

    // Handler para verificar si existe una clave maestra
    ipcMain.handle('security:has-master-key', async () => {
        try {
            if (fs.existsSync(SECURITY_CONFIG_PATH)) {
                const data = fs.readFileSync(SECURITY_CONFIG_PATH, 'utf8');
                const config = JSON.parse(data);
                return !!config.masterKey;
            }
            return false;
        } catch (error) {
            return false;
        }
    });

    // Handler para borrar la clave maestra (reset)
    ipcMain.handle('security:clear-master-key', async () => {
        try {
            if (fs.existsSync(SECURITY_CONFIG_PATH)) {
                let config = {};
                try {
                    config = JSON.parse(fs.readFileSync(SECURITY_CONFIG_PATH, 'utf8'));
                } catch (e) { }

                delete config.masterKey;
                fs.writeFileSync(SECURITY_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
            }
            return { success: true };
        } catch (error) {
            console.error('❌ [Security] Error borrando clave maestra:', error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = {
    registerSecurityHandlers
};
