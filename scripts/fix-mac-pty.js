const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Script para corregir los permisos de ejecución en node-pty para macOS.
 * Algunos entornos de instalación no preservan los bits de ejecución de los binarios nativos.
 */
function fixPtyPermissions() {
    if (os.platform() !== 'darwin') {
        return;
    }

    console.log('🚀 [NodeTerm] Verificando permisos de node-pty para macOS...');

    const baseDir = path.join(__dirname, '..');
    const ptyPrebuildsDir = path.join(baseDir, 'node_modules', 'node-pty', 'prebuilds');

    if (!fs.existsSync(ptyPrebuildsDir)) {
        console.warn('⚠️ [NodeTerm] Directorio de prebuilds de node-pty no encontrado.');
        return;
    }

    const archs = ['darwin-arm64', 'darwin-x64'];
    const filesToFix = ['spawn-helper', 'pty.node'];

    let count = 0;

    archs.forEach(arch => {
        const archDir = path.join(ptyPrebuildsDir, arch);
        if (fs.existsSync(archDir)) {
            filesToFix.forEach(file => {
                const filePath = path.join(archDir, file);
                if (fs.existsSync(filePath)) {
                    try {
                        const stats = fs.statSync(filePath);
                        // Comprobar si ya tiene permisos de ejecución (0o111)
                        if (!(stats.mode & 0o111)) {
                            fs.chmodSync(filePath, 0o755);
                            console.log(`✅ Permiso corregido para: ${arch}/${file}`);
                            count++;
                        }
                    } catch (err) {
                        console.error(`❌ Error corrigiendo ${arch}/${file}:`, err.message);
                    }
                }
            });
        }
    });

    if (count === 0) {
        console.log('✨ Todos los binarios de node-pty ya tienen permisos correctos.');
    } else {
        console.log(`🎉 Se han corregido ${count} archivos.`);
    }
}

fixPtyPermissions();
