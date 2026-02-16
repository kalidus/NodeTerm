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
    console.log('\x1b[1m\x1b[35m       ASISTENTE DE RELEASE PROFESIONAL (v2)       \x1b[0m');
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

    const startStage1 = await question('\n¿Deseas comenzar la preparación? (S/n): ');
    if (startStage1.toLowerCase() === 'n') process.exit(0);

    if (gitStatus) {
        const proceedGit = await question('Hay cambios pendientes en el repositorio. ¿Continuar? (s/N): ');
        if (proceedGit.toLowerCase() !== 's') process.exit(0);
    }

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

    let nextVersion = oldVersion;
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

    // =========================================================================
    // ETAPA 2: INTEGRACIÓN (Merge a Main)
    // =========================================================================
    console.log('\n\x1b[1m\x1b[36m--- ETAPA 2: INTEGRACIÓN ---\x1b[0m');

    if (currentBranch === 'main' || currentBranch === 'master') {
        console.log('  ℹ️ Ya estás en la rama principal. Saltando merge.');
    } else {
        const doMerge = await question(`\n¿Mezclar "${currentBranch}" en "main" ahora? (S/n): `);
        if (doMerge.toLowerCase() !== 'n') {
            if (await runCommand('git checkout main', 'Cambiando a main')) {
                if (await runCommand(`git merge ${currentBranch}`, 'Fusionando cambios')) {
                    console.log('\x1b[32m✅ Integración completada.\x1b[0m');
                } else {
                    console.log('\x1b[31m❌ Error en el merge. Resuélvelo manualmente.\x1b[0m');
                    process.exit(1);
                }
            }
        }
    }

    // =========================================================================
    // ETAPA 3: DESPLIEGUE (Build y Publicación)
    // =========================================================================
    console.log('\n\x1b[1m\x1b[36m--- ETAPA 3: DESPLIEGUE ---\x1b[0m');

    const doEverything = await question('\n¿Deseas generar binarios y PUBLICAR en GitHub? (S/n): ');
    if (doEverything.toLowerCase() === 'n') {
        console.log('\nRelease pausado.');
        rl.close();
        return;
    }

    // Token interactivo
    if (!process.env.GH_TOKEN) {
        console.log('\n\x1b[33m⚠️  No se detectó GH_TOKEN.\x1b[0m');
        const token = await question('Pega tu GitHub Personal Access Token (Enter para omitir subida): ');
        if (token) process.env.GH_TOKEN = token;
    }

    // Proceso unificado para evitar doble build
    // 1. Build de React/Webpack (necesario siempre)
    await runCommand('npm run build', 'Compilando código fuente (Webpack)');

    // 2. Electron-builder (Build de ejecutables + opcional Publish)
    let ebCommand = 'npx electron-builder';
    let tempNotesPath = null;

    if (process.env.GH_TOKEN) {
        const confirmPublish = await question('\n¿Confirmas subir a GitHub Releases ahora? (S/n): ');
        if (confirmPublish.toLowerCase() !== 'n') {
            const notes = getReleaseNotes(nextVersion);
            console.log('\n\x1b[36m[Info]\x1b[0m Extrayendo notas de release...');
            if (notes) {
                console.log('-------------------------------------------');
                console.log(notes);
                console.log('-------------------------------------------');
                tempNotesPath = path.join(__dirname, '..', `temp-notes-${nextVersion}.md`);
                fs.writeFileSync(tempNotesPath, notes);
                ebCommand += ` --publish always -c.releaseInfo.releaseNotesFile="${tempNotesPath}" -c.publish.releaseType=release`;
                console.log('\x1b[32m✅ Notas de release preparadas.\x1b[0m');
            } else {
                ebCommand += ' --publish always -c.publish.releaseType=release';
                console.log('\x1b[33m⚠️  No se encontraron notas para esta versión en CHANGELOG.md\x1b[0m');
            }
        }
    }

    if (await runCommand(ebCommand, 'Generando paquetes y gestionando publicación')) {
        console.log('\n\x1b[32m✅ Proceso de binarios finalizado.\x1b[0m');
        console.log('   Archivos en "dist/":');
        console.log('     - Instalador: NodeTerm-Setup-*.exe');
        console.log('     - Portable:   NodeTerm-*.exe');
        console.log('     - Update:     latest.yml');

        if (tempNotesPath && fs.existsSync(tempNotesPath)) {
            fs.unlinkSync(tempNotesPath);
        }
    }

    // Tags finales
    const activeBranch = getOutput('git rev-parse --abbrev-ref HEAD');
    const tagExists = getOutput(`git tag -l v${nextVersion}`);

    if (tagExists) {
        console.log(`\n\x1b[33mℹ️  La etiqueta v${nextVersion} ya existe localmente.\x1b[0m`);
        const doPushTags = await question('¿Deseas intentar subir las etiquetas a GitHub de todos modos? (S/n): ');
        if (doPushTags.toLowerCase() !== 'n') {
            await runCommand(`git push origin ${activeBranch} --tags`, 'Subiendo etiquetas');
        }
    } else {
        const doTag = await question(`\n¿Crear y subir tag v${nextVersion} a GitHub? (S/n): `);
        if (doTag.toLowerCase() !== 'n') {
            await runCommand(`git tag v${nextVersion}`, `Creando tag v${nextVersion}`);
            await runCommand(`git push origin ${activeBranch} --tags`, 'Sincronizando con GitHub');
        }
    }

    console.log('\n\x1b[1m\x1b[32m═══════════════════════════════════════════════════\x1b[0m');
    console.log(`\x1b[1m\x1b[32m   🚀 ¡RELEASE v${nextVersion} FINALIZADO!   \x1b[0m`);
    console.log('\x1b[1m\x1b[32m═══════════════════════════════════════════════════\x1b[0m\n');
    rl.close();
}

main();
