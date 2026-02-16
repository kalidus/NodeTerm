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
    console.log('\n\x1b[1m\x1b[35m--- ASISTENTE DE RELEASE INTERACTIVO DE NODETERM ---\x1b[0m\n');

    // 1. Detección de Rama y Estado
    const currentBranch = getOutput('git rev-parse --abbrev-ref HEAD');
    console.log(`Rama actual: \x1b[33m${currentBranch}\x1b[0m`);

    const gitStatus = getOutput('git status --porcelain');
    if (gitStatus) {
        console.log('\n\x1b[33m[Advertencia]\x1b[0m Tienes cambios sin commitear:');
        console.log(gitStatus);
        const proceedGit = await question('\n¿Deseas continuar con estos cambios? (s/N): ');
        if (proceedGit.toLowerCase() !== 's') {
            console.log('Cancelado.');
            process.exit(0);
        }
    }

    // 2. Gestión de Versión
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const oldVersion = pkg.version;

    console.log('\n--- GESTIÓN DE VERSIÓN ---');
    console.log(`0) Mantener versión actual (v${oldVersion})`);
    console.log(`1) Patch (v${oldVersion} -> 1.6.4)`);
    console.log(`2) Minor (v${oldVersion} -> 1.7.0)`);
    console.log(`3) Major (v${oldVersion} -> 2.0.0)`);

    const typeChoice = await question('\nSelecciona opción: ');
    let npmVersionCmd = '';
    switch (typeChoice) {
        case '0': npmVersionCmd = 'none'; break;
        case '1': npmVersionCmd = 'patch'; break;
        case '2': npmVersionCmd = 'minor'; break;
        case '3': npmVersionCmd = 'major'; break;
        default: console.log('Opción inválida.'); process.exit(1);
    }

    let newVersion = oldVersion;
    if (npmVersionCmd !== 'none') {
        const confirmBump = await question(`\n¿Confirmas incrementar a la versión ${npmVersionCmd}? (s/N): `);
        if (confirmBump.toLowerCase() === 's') {
            if (await runCommand(`npm version ${npmVersionCmd} --no-git-tag-version`, 'Incrementando versión en package.json')) {
                newVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
            }
        }
    }

    // 3. Actualizar CHANGELOG
    const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
        const updateLog = await question(`\n¿Deseas actualizar el CHANGELOG.md para la v${newVersion}? (s/N): `);
        if (updateLog.toLowerCase() === 's') {
            let changelog = fs.readFileSync(changelogPath, 'utf8');
            const today = new Date().toISOString().split('T')[0];
            const versionHeader = `## [${newVersion}] - ${today}`;

            if (changelog.includes('Por definir')) {
                changelog = changelog.replace(/## \[\d+\.\d+\.\d+\] - Por definir/, versionHeader);
            } else {
                const lines = changelog.split('\n');
                lines.splice(7, 0, '\n' + versionHeader + '\n');
                changelog = lines.join('\n');
            }
            fs.writeFileSync(changelogPath, changelog);
            console.log('\x1b[32m[OK]\x1b[0m CHANGELOG.md actualizado.');
        }
    }

    // 4. Commitear cambios de versión si existen
    if (newVersion !== oldVersion || gitStatus) {
        const doCommit = await question('\n¿Deseas hacer commit de los cambios actuales? (s/N): ');
        if (doCommit.toLowerCase() === 's') {
            await runCommand('git add .', 'Añadiendo archivos');
            await runCommand(`git commit -m "release: v${newVersion}"`, 'Haciendo commit');
        }
    }

    // 5. Flujo de Merge a Main
    if (currentBranch !== 'main' && currentBranch !== 'master') {
        const doMerge = await question('\n¿Deseas hacer MERGE de esta rama en "main"? (s/N): ');
        if (doMerge.toLowerCase() === 's') {
            if (await runCommand('git checkout main', 'Cambiando a rama main')) {
                if (await runCommand(`git merge ${currentBranch}`, `Mezclando ${currentBranch} en main`)) {
                    console.log('\x1b[32m[OK]\x1b[0m Merge completado en main.');
                } else {
                    console.log('\x1b[31m[Error]\x1b[0m Conflicto en el merge. Resuélvelo manualmente.');
                    process.exit(1);
                }
            }
        }
    }

    // 6. Build y Dist
    const activeBranch = getOutput('git rev-parse --abbrev-ref HEAD');
    console.log(`\nEstás en la rama: \x1b[33m${activeBranch}\x1b[0m`);

    const runBuild = await question('\n¿Deseas ejecutar el BUILD de producción ahora? (s/N): ');
    if (runBuild.toLowerCase() === 's') {
        await runCommand('npm run build', 'Ejecutando Build');
    }

    const runDist = await question('\n¿Deseas generar los BINARIOS (dist)? (s/N): ');
    if (runDist.toLowerCase() === 's') {
        await runCommand('npm run dist', 'Generando binarios');
    }

    // 7. Tags y Push
    const doTag = await question(`\n¿Deseas crear el tag v${newVersion}? (s/N): `);
    if (doTag.toLowerCase() === 's') {
        await runCommand(`git tag v${newVersion}`, `Creando tag v${newVersion}`);
    }

    const doPush = await question(`\n¿Deseas hacer PUSH de la rama y los tags a GitHub? (s/N): `);
    if (doPush.toLowerCase() === 's') {
        await runCommand(`git push origin ${activeBranch} --tags`, 'Subiendo cambios a GitHub');
    }

    console.log('\n\x1b[1m\x1b[32m--- PROCESO FINALIZADO ---\x1b[0m\n');
    rl.close();
}

main();
