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
        execSync(command, { stdio: 'inherit' });
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
    console.log('  • Validación de Git');
    console.log('  • Incremento de versión (opcional)');
    console.log('  • Actualización de CHANGELOG.md');

    const startStage1 = await question('\n¿Deseas comenzar la preparación? (S/n): ');
    if (startStage1.toLowerCase() === 'n') {
        process.exit(0);
    }

    if (gitStatus) {
        const proceedGit = await question('Hay cambios pendientes. ¿Continuar de todos modos? (s/N): ');
        if (proceedGit.toLowerCase() !== 's') process.exit(0);
    }

    // Selección de Versión
    console.log('\n¿Qué tipo de release es?');
    console.log(`  0) Mantener v${oldVersion} (solo corrección de build/metadata)`);
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
    console.log(`  • Salto de ${currentBranch} ➔ main`);
    console.log(`  • Consolidación de cambios en main`);

    if (currentBranch === 'main' || currentBranch === 'master') {
        console.log('  ℹ️ Ya estás en la rama principal. Saltando etapa de merge.');
    } else {
        const doMerge = await question(`\n¿Deseas fusionar "${currentBranch}" en "main" ahora? (S/n): `);
        if (doMerge.toLowerCase() !== 'n') {
            if (await runCommand('git checkout main', 'Cambiando a main')) {
                if (await runCommand(`git merge ${currentBranch}`, 'Fusionando cambios')) {
                    console.log('\x1b[32m✅ Integración completada.\x1b[0m');
                } else {
                    console.log('\x1b[31m❌ Error en el merge. Resuelve los conflictos y vuelve a empezar.\x1b[0m');
                    process.exit(1);
                }
            } else {
                console.error('\x1b[31m❌ No se pudo cambiar a la rama main.\x1b[0m');
                process.exit(1);
            }
        }
    }

    // =========================================================================
    // ETAPA 3: DESPLIEGUE (Build, Tag y Push)
    // =========================================================================
    console.log('\n\x1b[1m\x1b[36m--- ETAPA 3: DESPLIEGUE ---\x1b[0m');
    console.log('  • Build de producción');
    console.log('  • Generación de binarios (dist)');
    console.log('  • Creación de Tag de Git');
    console.log('  • Push a GitHub');

    const startStage3 = await question('\n¿Deseas lanzar el despliegue final? (S/n): ');
    if (startStage3.toLowerCase() === 'n') {
        console.log('\nRelease pausado. Los cambios están guardados en el repo.');
        rl.close();
        return;
    }

    // Build y Dist
    const runBuild = await question('\n¿Ejecutar BUILD y generar BINARIOS (dist)? (S/n): ');
    if (runBuild.toLowerCase() !== 'n') {
        await runCommand('npm run build', 'Build de producción');
        await runCommand('npm run dist', 'Generando instaladores');
    }

    // Tag y Push
    const finalBranch = getOutput('git rev-parse --abbrev-ref HEAD');
    const doFinal = await question(`\n¿Crear tag v${nextVersion} y subir TODO a GitHub? (S/n): `);
    if (doFinal.toLowerCase() !== 'n') {
        await runCommand(`git tag v${nextVersion}`, `Creando etiqueta v${nextVersion}`);
        await runCommand(`git push origin ${finalBranch} --tags`, 'Subiendo a GitHub');
    }

    console.log('\n\x1b[1m\x1b[32m═══════════════════════════════════════════════════\x1b[0m');
    console.log(`\x1b[1m\x1b[32m   🚀 ¡RELEASE v${nextVersion} COMPLETADO CON ÉXITO!   \x1b[0m`);
    console.log('\x1b[1m\x1b[32m═══════════════════════════════════════════════════\x1b[0m\n');
    rl.close();
}

main();
