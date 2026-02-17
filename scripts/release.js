const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function runCommand(command, description) {
    console.log(`\n\x1b[36m[Ejecutando]\x1b[0m ${description}...`);
    try {
        execSync(command, { stdio: 'inherit', env: { ...process.env } });
        return true;
    } catch (error) {
        console.error(`\x1b[31m[Error]\x1b[0m Error al ejecutar "${command}": ${error.message}`);
        return false;
    }
}

function getOutput(command) {
    try {
        return execSync(command).toString().trim();
    } catch (e) {
        return '';
    }
}

function getReleaseNotes(version) {
    const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
    if (!fs.existsSync(changelogPath)) return '';
    let content = fs.readFileSync(changelogPath, 'utf8');

    // Normalizar finales de línea
    content = content.replace(/\r\n/g, '\n');

    // Buscar todas las secciones de la versión [x.y.z]
    const escapedVersion = version.replace(/\./g, '\\.');
    const regex = new RegExp(`## \\[${escapedVersion}\\][^\n]*\n([\\s\\S]*?)(?=\n## \\[|$)`, 'g');

    let allNotes = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        if (match[1]) {
            allNotes.push(match[1].trim());
        }
    }

    return allNotes.length > 0 ? allNotes.join('\n\n---\n\n') : '';
}

async function main() {
    console.log('\n\x1b[1m\x1b[35m═══════════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[1m\x1b[35m       ASISTENTE DE RELEASE PROFESIONAL (v2.1)     \x1b[0m');
    console.log('\x1b[1m\x1b[35m═══════════════════════════════════════════════════\x1b[0m\n');

    // --- ESTADO INICIAL ---
    const currentBranch = getOutput('git rev-parse --abbrev-ref HEAD');
    const gitStatus = getOutput('git status --porcelain');
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const oldVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;

    console.log(`📍 Rama actual: \x1b[33m${currentBranch}\x1b[0m`);
    console.log(`📦 Versión actual: \x1b[33mv${oldVersion}\x1b[0m`);

    if (gitStatus) {
        console.log('\n\x1b[33m⚠️  ADVERTENCIA: Tienes cambios sin guardar.\x1b[0m');
    }

    // =========================================================================
    // ETAPA 1: PREPARACIÓN (Versión y Changelog)
    // =========================================================================
    console.log('\n\x1b[1m\x1b[36m--- ETAPA 1: PREPARACIÓN ---\x1b[0m');

    const startStage1 = await question('\n¿Deseas preparar una nueva versión? (S/n): ');
    let nextVersion = oldVersion;

    if (startStage1.toLowerCase() !== 'n') {
        // Selección de Versión
        console.log('\n¿Qué tipo de release es?');
        console.log(`  0) Mantener v${oldVersion}`);
        console.log(`  1) Patch (v${oldVersion} -> Arreglo de bugs)`);
        console.log(`  2) Minor (v${oldVersion} -> Funcionalidad nueva)`);
        console.log(`  3) Major (v${oldVersion} -> Cambio disruptivo)`);

        const typeChoice = await question('\nSelecciona opción: ');
        let npmVersionCmd = '';
        switch (typeChoice) {
            case '0': npmVersionCmd = 'none'; break;
            case '1': npmVersionCmd = 'patch'; break;
            case '2': npmVersionCmd = 'minor'; break;
            case '3': npmVersionCmd = 'major'; break;
            default: console.log('Opción inválida.'); process.exit(1);
        }

        if (npmVersionCmd !== 'none') {
            if (await runCommand(`npm version ${npmVersionCmd} --no-git-tag-version`, 'Actualizando versión')) {
                nextVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
            }
        }

        // Changelog
        const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
        if (fs.existsSync(changelogPath)) {
            const updateLog = await question(`\n¿Actualizar CHANGELOG.md para la v${nextVersion}? (S/n): `);
            if (updateLog.toLowerCase() !== 'n') {
                let changelog = fs.readFileSync(changelogPath, 'utf8');
                const today = new Date().toISOString().split('T')[0];
                const versionHeader = `## [${nextVersion}] - ${today}`;

                if (changelog.includes('Por definir')) {
                    changelog = changelog.replace(/## \[\d+\.\d+\.\d+\] - Por definir/, versionHeader);
                } else if (!changelog.includes(versionHeader)) {
                    const lines = changelog.split('\n');
                    lines.splice(7, 0, '\n' + versionHeader + '\n');
                    changelog = lines.join('\n');
                }
                fs.writeFileSync(changelogPath, changelog);
                console.log('\x1b[32m✅ CHANGELOG.md actualizado.\x1b[0m');
            }
        }

        // Commit de Preparación
        const needsCommit = getOutput('git status --porcelain');
        if (needsCommit) {
            const doCommit = await question('\n¿Hacer commit de la preparación de release? (S/n): ');
            if (doCommit.toLowerCase() !== 'n') {
                await runCommand('git add .', 'Añadiendo cambios');
                await runCommand(`git commit -m "release: preparación v${nextVersion}"`, 'Haciendo commit');
            }
        }
    } else {
        console.log('  ℹ️ Saltando preparación de versión.');
    }

    // =========================================================================
    // ETAPA 2: INTEGRACIÓN (Merge a Main)
    // =========================================================================
    console.log('\n\x1b[1m\x1b[36m--- ETAPA 2: INTEGRACIÓN ---\x1b[0m');

    let branchForBuild = currentBranch;
    if (currentBranch === 'main' || currentBranch === 'master') {
        console.log('  ℹ️ Ya estás en la rama principal.');
    } else {
        console.log('\x1b[33m💡 Si quieres probar solo en esta rama, elige "n".\x1b[0m');
        const doMerge = await question(`\n¿Mezclar "${currentBranch}" en "main" antes de compilar? (s/N): `);
        if (doMerge.toLowerCase() === 's') {
            if (await runCommand('git checkout main', 'Cambiando a main')) {
                if (await runCommand(`git merge ${currentBranch}`, 'Fusionando cambios')) {
                    console.log('\x1b[32m✅ Integración completada.\x1b[0m');
                    branchForBuild = 'main';
                } else {
                    console.log('\x1b[31m❌ Error en el merge. Resuélvelo manualmente.\x1b[0m');
                    process.exit(1);
                }
            }
        } else {
            console.log(`  ℹ️ Continuando en la rama actual: ${currentBranch}`);
        }
    }

    // =========================================================================
    // ETAPA 3: COMPILACIÓN Y DESPLIEGUE
    // =========================================================================
    console.log('\n\x1b[1m\x1b[36m--- ETAPA 3: COMPILACIÓN ---\x1b[0m');

    // 1. Elegir Tareas
    console.log('\n¿Qué deseas hacer?');
    console.log('  1) Solo Compilar localmente (No publica nada)');
    console.log('  2) Compilar y Publicar en GitHub');
    console.log('  n) Salir');

    const actionChoice = await question('\nSelecciona opción: ');
    if (actionChoice.toLowerCase() === 'n') {
        rl.close();
        return;
    }

    const isPublish = actionChoice === '2';

    // 2. Elegir Plataformas
    console.log('\n¿Para qué plataformas deseas compilar?');
    console.log('  w) Windows');
    console.log('  m) macOS');
    console.log('  l) Linux');
    console.log('  a) Todas (W+M+L)');
    console.log('  c) Solo plataforma actual');

    const platChoice = (await question('\nSelecciona plataformas (ej: ml para Mac y Linux): ')).toLowerCase();

    let platforms = [];
    if (platChoice.includes('a')) platforms = ['--win', '--mac', '--linux'];
    else if (platChoice.includes('c')) platforms = []; // Default platform
    else {
        if (platChoice.includes('w')) platforms.push('--win');
        if (platChoice.includes('m')) platforms.push('--mac');
        if (platChoice.includes('l')) platforms.push('--linux');
    }

    if (platforms.length === 0 && !platChoice.includes('c')) {
        console.log('No has seleccionado ninguna plataforma válida.');
        process.exit(1);
    }

    // 3. Preparar comando electron-builder
    let ebCommand = `npx electron-builder ${platforms.join(' ')}`;

    if (isPublish) {
        if (!process.env.GH_TOKEN) {
            console.log('\n\x1b[33m⚠️  No se detectó GH_TOKEN.\x1b[0m');
            const token = await question('Pega tu GitHub Personal Access Token (Enter para omitir subida): ');
            if (token) process.env.GH_TOKEN = token;
        }

        if (process.env.GH_TOKEN) {
            ebCommand += ' --publish always -c.publish.releaseType=release';
        } else {
            console.log('\n\x1b[31m❌ No se puede publicar sin Token. Cambiando a modo local.\x1b[0m');
            ebCommand += ' --publish never';
        }
    } else {
        ebCommand += ' --publish never';
    }

    // 4. Ejecución
    console.log(`\x1b[34m[Debug]\x1b[0m Rama: ${branchForBuild} | Plataformas: ${platforms.length ? platforms.join(' ') : 'Actual'}`);

    // --- CONFIGURACIÓN DE RED (Solo para macOS que es donde falla) ---
    const isMacTarget = platforms.includes('--mac') || (platforms.length === 0 && process.platform === 'darwin');

    if (isMacTarget) {
        const skipSSL = await question('\n¿Tienes problemas de red/SSL detectados en macOS? (¿Omitir validación?) (s/N): ');
        if (skipSSL.toLowerCase() === 's') {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            console.log('\x1b[33m⚠️  Validación SSL desactivada para esta sesión\x1b[0m');
        }
    }

    // Build de React/Webpack (necesario siempre)
    await runCommand('npm run build', 'Compilando código fuente (Webpack)');

    if (await runCommand(ebCommand, isPublish ? 'Generando paquetes y publicando' : 'Generando paquetes locales')) {
        console.log('\n\x1b[32m✅ Compilación finalizada correctamente.\x1b[0m');

        if (isPublish && process.env.GH_TOKEN) {
            // Lógica de Notas (Opcional, similar a tu script anterior)
            const notes = getReleaseNotes(nextVersion);
            if (notes) {
                console.log('\n\x1b[33mℹ️  Sugerencia: Puedes actualizar las notas en GitHub usando las de CHANGELOG.md\x1b[0m');
            }
        }
    }

    // =========================================================================
    // ETAPA FINAL: TAGS (Solo si es publicación)
    // =========================================================================
    if (isPublish) {
        console.log('\n\x1b[1m\x1b[36m--- ETAPA FINAL: ETIQUETADO ---\x1b[0m');
        const tagExists = getOutput(`git tag -l v${nextVersion}`);

        if (tagExists) {
            console.log(`\n\x1b[33mℹ️  La etiqueta v${nextVersion} ya existe.\x1b[0m`);
            const doPushTags = await question('¿Sincronizar etiquetas con GitHub de todos modos? (S/n): ');
            if (doPushTags.toLowerCase() !== 'n') {
                await runCommand(`git push origin ${branchForBuild} --tags`, 'Subiendo etiquetas');
            }
        } else {
            const doTag = await question(`\n¿Crear y subir tag v${nextVersion}? (S/n): `);
            if (doTag.toLowerCase() !== 'n') {
                await runCommand(`git tag v${nextVersion}`, `Creando tag v${nextVersion}`);
                await runCommand(`git push origin ${branchForBuild} --tags`, 'Sincronizando con GitHub');
            }
        }
    }

    console.log('\n\x1b[1m\x1b[32m═══════════════════════════════════════════════════\x1b[0m');
    console.log(`\x1b[1m\x1b[32m   🚀 PROCESO FINALIZADO   \x1b[0m`);
    console.log('\x1b[1m\x1b[32m═══════════════════════════════════════════════════\x1b[0m\n');
    rl.close();
}

main();
