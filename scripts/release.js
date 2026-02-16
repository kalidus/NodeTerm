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
    console.log(`\x1b[36m[NodeTerm Release]\x1b[0m ${description}...`);
    try {
        execSync(command, { stdio: 'inherit' });
        return true;
    } catch (error) {
        console.error(`\x1b[31m[Error]\x1b[0m Error executing ${command}: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('\n\x1b[1m\x1b[35m--- ASISTENTE DE RELEASE DE NODETERM ---\x1b[0m\n');

    // 1. Verificar Git Status
    const gitStatus = execSync('git status --porcelain').toString();
    if (gitStatus) {
        console.log('\x1b[33m[Advertencia]\x1b[0m Tienes cambios sin commitear en el repositorio:');
        console.log(gitStatus);
        const proceed = await question('¿Deseas continuar de todos modos? (s/N): ');
        if (proceed.toLowerCase() !== 's') {
            console.log('Release cancelado.');
            process.exit(0);
        }
    }

    // 2. Preguntar tipo de incremento
    console.log('\nSelecciona el tipo de actualización de versión:');
    console.log('1) Patch (1.6.3 -> 1.6.4) - Correcciones de bugs');
    console.log('2) Minor (1.6.3 -> 1.7.0) - Nuevas funcionalidades');
    console.log('3) Major (1.6.3 -> 2.0.0) - Cambios disruptivos');

    const typeChoice = await question('\nOpción: ');
    let npmVersionCmd = '';
    switch (typeChoice) {
        case '1': npmVersionCmd = 'patch'; break;
        case '2': npmVersionCmd = 'minor'; break;
        case '3': npmVersionCmd = 'major'; break;
        default:
            console.log('Opción inválida. Cancelando.');
            process.exit(1);
    }

    // 3. Obtener versión actual y calcular nueva
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const oldVersion = pkg.version;

    console.log(`\nActualizando versión desde v${oldVersion}...`);

    // Ejecutamos npm version para que haga el trabajo sucio en package.json
    // Usamos --no-git-tag-version para manejar los tags nosotros
    if (!await runCommand(`npm version ${npmVersionCmd} --no-git-tag-version`, 'Actualizando package.json')) {
        process.exit(1);
    }

    const newPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const newVersion = newPkg.version;
    console.log(`\x1b[32m[Éxito]\x1b[0m Nueva versión: v${newVersion}`);

    // 4. Actualizar CHANGELOG.md
    const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
        console.log('Actualizando CHANGELOG.md...');
        let changelog = fs.readFileSync(changelogPath, 'utf8');
        const today = new Date().toISOString().split('T')[0];

        // Buscar la línea "## [V.V.V] - Por definir" o similar
        // Si no existe, insertamos una nueva cabecera
        const versionHeader = `## [${newVersion}] - ${today}`;

        // Intentamos reemplazar el placeholder de "Por definir" si existe
        if (changelog.includes('Por definir')) {
            changelog = changelog.replace(/## \[\d+\.\d+\.\d+\] - Por definir/, versionHeader);
        } else {
            // Insertamos después de la línea 6 (después de la intro del changelog)
            const lines = changelog.split('\n');
            lines.splice(7, 0, '\n' + versionHeader + '\n');
            changelog = lines.join('\n');
        }

        fs.writeFileSync(changelogPath, changelog);
        console.log('\x1b[32m[Éxito]\x1b[0m CHANGELOG.md actualizado.');
    }

    // 5. Build
    const runBuild = await question('\n¿Deseas ejecutar el build de producción ahora? (s/N): ');
    if (runBuild.toLowerCase() === 's') {
        if (!await runCommand('npm run build', 'Ejecutando Build')) {
            console.log('El build falló. Por favor corrige los errores antes de continuar.');
            process.exit(1);
        }
    }

    // 6. Dist y VirusTotal
    const runDist = await question('\n¿Deseas generar los binarios (dist) y escanear con VirusTotal? (s/N): ');
    if (runDist.toLowerCase() === 's') {
        await runCommand('npm run dist:scan', 'Generando binarios y escaneando');
    }

    // 7. Instrucciones finales
    console.log('\n\x1b[1m\x1b[32m--- PROCESO CASI COMPLETADO ---\x1b[0m');
    console.log('\nPara finalizar el release, ejecuta estos comandos:');
    console.log(`\x1b[36m  git add package.json package-lock.json CHANGELOG.md\x1b[0m`);
    console.log(`\x1b[36m  git commit -m "release: v${newVersion}"\x1b[0m`);
    console.log(`\x1b[36m  git tag v${newVersion}\x1b[0m`);
    console.log(`\x1b[36m  git push origin main --tags\x1b[0m`);

    console.log('\n\x1b[1m¡Buen trabajo!\x1b[0m\n');

    rl.close();
}

main();
