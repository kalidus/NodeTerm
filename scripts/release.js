const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));
const YES_VALUES = new Set(['s', 'si', 'sí', 'y', 'yes', 'true', '1']);

/** Raíz del repo: electron-builder y npm deben ejecutarse aquí, no en scripts/ */
const REPO_ROOT = path.resolve(__dirname, '..');

function parseCliArgs(argv) {
    const args = {
        yes: false,
        publish: false,
        prepare: false,
        mergeMain: false,
        changelog: false,
        commitPrep: false,
        skipSsl: false,
        releaseType: 'keep', // keep|patch|minor|major
        platform: '', // win|mac|linux|all|current|wm|ml|...
        tagStrategy: 'ask', // ask|move|skip|cancel
        token: '',
        fixNotes: false,
        version: '',
        help: false
    };

    for (let i = 0; i < argv.length; i += 1) {
        const a = argv[i];
        if (a === '--help' || a === '-h') args.help = true;
        else if (a === '--yes' || a === '-y') args.yes = true;
        else if (a === '--publish') args.publish = true;
        else if (a === '--local') args.publish = false;
        else if (a === '--prepare') args.prepare = true;
        else if (a === '--merge-main') args.mergeMain = true;
        else if (a === '--update-changelog') args.changelog = true;
        else if (a === '--commit-prep') args.commitPrep = true;
        else if (a === '--skip-ssl') args.skipSsl = true;
        else if (a === '--release-type' && argv[i + 1]) args.releaseType = String(argv[++i]).toLowerCase();
        else if (a === '--platform' && argv[i + 1]) args.platform = String(argv[++i]).toLowerCase();
        else if (a === '--tag-strategy' && argv[i + 1]) args.tagStrategy = String(argv[++i]).toLowerCase();
        else if (a === '--token' && argv[i + 1]) args.token = String(argv[++i]);
        else if (a === '--fix-notes') args.fixNotes = true;
        else if (a === '--version' && argv[i + 1]) args.version = String(argv[++i]);
    }
    return args;
}

function printHelp() {
    console.log('\nUso: node scripts/release.js [opciones]\n');
    console.log('Opciones rápidas:');
    console.log('  --yes, -y                 Modo no interactivo (respuestas por defecto seguras)');
    console.log('  --publish                 Compilar y publicar en GitHub');
    console.log('  --local                   Solo compilar local (sin publicar)');
    console.log('  --platform <valor>        win|mac|linux|all|current|wm|ml|wml');
    console.log('  --prepare                 Ejecutar preparación de versión');
    console.log('  --release-type <tipo>     keep|patch|minor|major');
    console.log('  --merge-main              Hacer merge a main antes de compilar');
    console.log('  --update-changelog        Actualizar encabezado en CHANGELOG');
    console.log('  --commit-prep             Commit automático de preparación');
    console.log('  --tag-strategy <modo>     ask|move|skip|cancel (si tag existe y no apunta a HEAD)');
    console.log('  --skip-ssl                Fuerza NODE_TLS_REJECT_UNAUTHORIZED=0 para target mac');
    console.log('  --token <gh_token>        Token para publicar (alternativa a variable GH_TOKEN)');
    console.log('  --fix-notes               Solo republicar notas UTF-8 de la release (sin compilar)');
    console.log('  --version <x.y.z>         Versión para --fix-notes (por defecto package.json)');
    console.log('  --help, -h                Mostrar esta ayuda\n');
    console.log('Ejemplo: node scripts/release.js --yes --publish --platform win --merge-main --tag-strategy move\n');
}

function isYes(value) {
    return YES_VALUES.has(String(value || '').trim().toLowerCase());
}

function resolvePlatforms(platChoice) {
    const normalized = (platChoice || '').toLowerCase();
    let platforms = [];
    if (normalized.includes('a') || normalized === 'all') platforms = ['--win', '--mac', '--linux'];
    else if (normalized.includes('c') || normalized === 'current') platforms = [];
    else {
        if (normalized.includes('w') || normalized === 'win' || normalized === 'windows') platforms.push('--win');
        if (normalized.includes('m') || normalized === 'mac' || normalized === 'darwin') platforms.push('--mac');
        if (normalized.includes('l') || normalized === 'linux') platforms.push('--linux');
    }
    return { platforms, isCurrent: normalized.includes('c') || normalized === 'current' };
}

async function runCommand(command, description) {
    console.log(`\n\x1b[36m[Ejecutando]\x1b[0m ${description}...`);
    try {
        execSync(command, {
            stdio: 'inherit',
            env: { ...process.env },
            cwd: REPO_ROOT
        });
        return true;
    } catch (error) {
        console.error(`\x1b[31m[Error]\x1b[0m Error al ejecutar "${command}": ${error.message}`);
        return false;
    }
}

function getOutput(command) {
    try {
        return execSync(command, { cwd: REPO_ROOT }).toString().trim();
    } catch (e) {
        return '';
    }
}

function commandExists(command) {
    try {
        execSync(command, { stdio: 'ignore', cwd: REPO_ROOT });
        return true;
    } catch (e) {
        return false;
    }
}

function getHeadCommit() {
    return getOutput('git rev-parse HEAD');
}

function getTagCommit(tagName) {
    return getOutput(`git rev-list -n 1 ${tagName}`);
}

function getRemoteTagCommit(tagName) {
    const output = getOutput(`git ls-remote --tags origin ${tagName}`);
    if (!output) return '';
    return output.split(/\s+/)[0] || '';
}

/** ahead / behind respecto a origin/<branch>; null si no hay remoto o ref inválida */
function getAheadBehind(branch) {
    const lr = getOutput(`git rev-list --left-right --count ${branch}...origin/${branch}`);
    if (!lr || !/^\d+\s+\d+$/.test(lr.replace(/\t/g, ' '))) return null;
    const [a, b] = lr.split(/\s+/).map((n) => parseInt(n, 10));
    return { ahead: a, behind: b };
}

/**
 * Trae refs remotas y, si la rama está detrás de origin, ofrece integrar con rebase
 * para que git push no falle por non-fast-forward.
 */
async function ensureSyncWithRemote(branch, options = {}) {
    const autoYes = !!options.autoYes;
    if (!await runCommand('git fetch origin', 'Obteniendo estado de origin (fetch)')) {
        return false;
    }
    const ab = getAheadBehind(branch);
    if (!ab) {
        console.log('\x1b[33mℹ️  No se pudo comparar con origin/' + branch + ' (¿primer push?). Se continuará.\x1b[0m');
        return true;
    }
    if (ab.behind === 0) {
        return true;
    }
    console.log(
        `\n\x1b[33m⚠️  Tu rama está \x1b[1m${ab.behind} commit(s) detrás\x1b[0m\x1b[33m de origin/${branch}` +
            (ab.ahead > 0 ? ` y \x1b[1m${ab.ahead} adelante\x1b[0m\x1b[33m (historial divergente)` : '') +
            '.\x1b[0m'
    );
    let doRebase = true;
    if (!autoYes) {
        const ans = await question(`¿Integrar con \x1b[36mgit pull --rebase origin ${branch}\x1b[0m antes de subir? (S/n): `);
        doRebase = ans.toLowerCase() !== 'n';
    }
    if (!doRebase) {
        console.log('\x1b[33mℹ️  Sin integrar: el push puede fallar si el remoto no acepta fast-forward.\x1b[0m');
        return true;
    }
    return await runCommand(`git pull --rebase origin ${branch}`, 'Integrando cambios remotos (rebase)');
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

function getReleaseNotesFromReleaseFile(version) {
    const notesPath = path.join(__dirname, '..', 'RELEASE_NOTES.md');
    if (!fs.existsSync(notesPath)) return '';
    const content = fs.readFileSync(notesPath, 'utf8').replace(/\r\n/g, '\n');
    const escapedVersion = version.replace(/\./g, '\\.');
    const sectionRegex = new RegExp(`#\\s+.*v${escapedVersion}[\\s\\S]*?(?=\\n#\\s+🚀\\s+NodeTerm\\s+v\\d+\\.\\d+\\.\\d+|$)`, 'i');
    const match = content.match(sectionRegex);
    return match ? match[0].trim() : '';
}

function buildReleaseNotes(version) {
    const changelogNotes = getReleaseNotes(version);
    if (changelogNotes) {
        return `## NodeTerm v${version}\n\n${changelogNotes}`;
    }
    const releaseFileNotes = getReleaseNotesFromReleaseFile(version);
    return releaseFileNotes || '';
}

function getGithubRepo() {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
    const pub = pkg.build && pkg.build.publish ? pkg.build.publish : {};
    return {
        owner: pub.owner || 'kalidus',
        repo: pub.repo || 'NodeTerm'
    };
}

/** Usa GH_TOKEN o el token de `gh auth login` si está disponible. */
function ensureGhToken() {
    if (process.env.GH_TOKEN) return true;
    if (!commandExists('gh --version')) return false;
    const token = getOutput('gh auth token 2>nul');
    if (token) {
        process.env.GH_TOKEN = token;
        return true;
    }
    return false;
}

/**
 * Publica notas vía REST API (JSON UTF-8). En Windows, `gh release edit --notes-file`
 * puede corromper acentos y emojis al leer el archivo con la code page del sistema.
 */
async function upsertGithubRelease(tagName, targetBranch, version, notes) {
    if (!ensureGhToken()) {
        console.log('\x1b[33mℹ️  Sin GH_TOKEN ni sesión de gh: se omite actualización de release notes por API.\x1b[0m');
        return false;
    }
    if (!commandExists('gh --version')) {
        console.log('\x1b[33mℹ️  GitHub CLI (gh) no disponible: se omite actualización automática de notas.\x1b[0m');
        return false;
    }
    if (!notes || !notes.trim()) {
        console.log('\x1b[33mℹ️  No se encontraron notas para publicar automáticamente.\x1b[0m');
        return false;
    }

    const { owner, repo } = getGithubRepo();
    const inputPath = path.join(os.tmpdir(), `nodeterm-release-${tagName}.json`);
    const hasRelease = !!getOutput(`gh release view ${tagName} --json tagName 2>nul`);

    if (hasRelease) {
        const releaseId = getOutput(`gh api repos/${owner}/${repo}/releases/tags/${tagName} --jq .id 2>nul`);
        if (!releaseId) {
            console.log(`\x1b[31m❌ No se encontró la release ${tagName} en ${owner}/${repo}.\x1b[0m`);
            return false;
        }
        fs.writeFileSync(
            inputPath,
            JSON.stringify({
                body: notes,
                draft: false,
                name: `NodeTerm ${tagName}`
            }),
            'utf8'
        );
        return await runCommand(
            `gh api repos/${owner}/${repo}/releases/${releaseId} -X PATCH --input "${inputPath}"`,
            `Actualizando release ${tagName} en GitHub (UTF-8)`
        );
    }

    fs.writeFileSync(
        inputPath,
        JSON.stringify({
            tag_name: tagName,
            target_commitish: targetBranch,
            body: notes,
            draft: false,
            name: `NodeTerm ${tagName}`
        }),
        'utf8'
    );
    return await runCommand(
        `gh api repos/${owner}/${repo}/releases -X POST --input "${inputPath}"`,
        `Creando release ${tagName} en GitHub (UTF-8)`
    );
}

async function ensureTagOnHeadAndPush(tagName, options = {}) {
    const strategy = options.tagConflictStrategy || 'ask';
    const headCommit = getHeadCommit();
    const localTagCommit = getTagCommit(tagName);
    const remoteTagCommit = getRemoteTagCommit(tagName);
    const tagExistsLocal = !!localTagCommit;
    const tagExistsRemote = !!remoteTagCommit;
    const tagMatchesHead =
        (!tagExistsLocal || localTagCommit === headCommit) &&
        (!tagExistsRemote || remoteTagCommit === headCommit);

    if (tagMatchesHead) {
        if (!tagExistsLocal) {
            if (!await runCommand(`git tag ${tagName}`, `Creando tag ${tagName}`)) return false;
        }
        return await runCommand(`git push origin ${tagName}`, `Subiendo etiqueta ${tagName}`);
    }

    console.log(`\n\x1b[33m⚠️  La etiqueta ${tagName} ya existe pero no apunta al commit actual.\x1b[0m`);
    console.log(`   HEAD actual: ${headCommit}`);
    if (tagExistsLocal) console.log(`   Tag local:   ${localTagCommit}`);
    if (tagExistsRemote) console.log(`   Tag remoto:  ${remoteTagCommit}`);
    let action = strategy;
    if (strategy === 'ask') {
        action = (await question('¿Qué deseas hacer? [m] Mover tag a HEAD / [s] Saltar / [c] Cancelar: ')).toLowerCase();
    }
    if (action === 'skip' || action === 's') {
        console.log('\x1b[33mℹ️  Se mantiene la etiqueta existente sin cambios.\x1b[0m');
        return true;
    }
    if (!(action === 'move' || action === 'm')) {
        console.log('\x1b[31m❌ Operación cancelada por el usuario.\x1b[0m');
        return false;
    }

    if (tagExistsLocal) {
        if (!await runCommand(`git tag -d ${tagName}`, `Eliminando tag local ${tagName}`)) return false;
    }
    if (!await runCommand(`git tag ${tagName}`, `Recreando tag ${tagName} en HEAD`)) return false;

    if (tagExistsRemote) {
        if (!await runCommand(`git push origin :refs/tags/${tagName}`, `Eliminando tag remoto ${tagName}`)) return false;
    }
    return await runCommand(`git push origin ${tagName}`, `Subiendo etiqueta ${tagName} actualizada`);
}

async function main() {
    const cli = parseCliArgs(process.argv.slice(2));
    if (cli.help) {
        printHelp();
        rl.close();
        return;
    }
    if (cli.token && !process.env.GH_TOKEN) {
        process.env.GH_TOKEN = cli.token;
    }
    const nonInteractive = cli.yes;

    if (cli.fixNotes) {
        const pkgPathEarly = path.join(REPO_ROOT, 'package.json');
        const fixVersion = cli.version || JSON.parse(fs.readFileSync(pkgPathEarly, 'utf8')).version;
        const tagName = fixVersion.startsWith('v') ? fixVersion : `v${fixVersion}`;
        const branch = getOutput('git rev-parse --abbrev-ref HEAD') || 'main';
        const notes = buildReleaseNotes(fixVersion.replace(/^v/, ''));
        if (!notes.trim()) {
            console.log('\x1b[31m❌ No hay notas en CHANGELOG.md ni RELEASE_NOTES.md para esa versión.\x1b[0m');
            process.exit(1);
        }
        const ok = await upsertGithubRelease(tagName, branch, fixVersion.replace(/^v/, ''), notes);
        rl.close();
        process.exit(ok ? 0 : 1);
    }

    console.log('\n\x1b[1m\x1b[35m═══════════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[1m\x1b[35m       ASISTENTE DE RELEASE PROFESIONAL (v2.2)     \x1b[0m');
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

    const startStage1 = nonInteractive ? (cli.prepare ? 's' : 'n') : await question('\n¿Deseas preparar una nueva versión? (S/n): ');
    let nextVersion = oldVersion;

    if (startStage1.toLowerCase() !== 'n') {
        // Selección de Versión
        console.log('\n¿Qué tipo de release es?');
        console.log(`  0) Mantener v${oldVersion}`);
        console.log(`  1) Patch (v${oldVersion} -> Arreglo de bugs)`);
        console.log(`  2) Minor (v${oldVersion} -> Funcionalidad nueva)`);
        console.log(`  3) Major (v${oldVersion} -> Cambio disruptivo)`);

        const typeMap = { keep: '0', patch: '1', minor: '2', major: '3' };
        const typeChoice = nonInteractive ? (typeMap[cli.releaseType] || '0') : await question('\nSelecciona opción: ');
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
            const updateLog = nonInteractive ? (cli.changelog ? 's' : 'n') : await question(`\n¿Actualizar CHANGELOG.md para la v${nextVersion}? (S/n): `);
            if (updateLog.toLowerCase() !== 'n') {
                let changelog = fs.readFileSync(changelogPath, 'utf8');
                const today = new Date().toISOString().split('T')[0];
                const versionHeader = `## [${nextVersion}] - ${today}`;

                const anyVersionHeaderRegex = new RegExp(`## \\[${nextVersion.replace(/\./g, '\\.')}\\] - .*`);
                if (anyVersionHeaderRegex.test(changelog)) {
                    console.log(`\x1b[33mℹ️  CHANGELOG ya contiene sección para v${nextVersion}; no se añade duplicado.\x1b[0m`);
                } else if (changelog.includes('Por definir')) {
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
            const doCommit = nonInteractive ? (cli.commitPrep ? 's' : 'n') : await question('\n¿Hacer commit de la preparación de release? (S/n): ');
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
        const doMerge = nonInteractive ? (cli.mergeMain ? 's' : 'n') : await question(`\n¿Mezclar "${currentBranch}" en "main" antes de compilar? (s/N): `);
        if (isYes(doMerge)) {
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

    const actionChoice = nonInteractive ? (cli.publish ? '2' : '1') : await question('\nSelecciona opción: ');
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

    const platChoice = nonInteractive ? (cli.platform || 'current') : (await question('\nSelecciona plataformas (ej: ml para Mac y Linux): ')).toLowerCase();
    const platformSelection = resolvePlatforms(platChoice);
    const platforms = platformSelection.platforms;

    if (platforms.length === 0 && !platformSelection.isCurrent) {
        console.log('No has seleccionado ninguna plataforma válida.');
        process.exit(1);
    }

    // 3. Preparar comando electron-builder
    let ebCommand = `npx electron-builder ${platforms.join(' ')}`;

    if (isPublish) {
        if (!process.env.GH_TOKEN) {
            console.log('\n\x1b[33m⚠️  No se detectó GH_TOKEN.\x1b[0m');
            if (!nonInteractive) {
                const token = await question('Pega tu GitHub Personal Access Token (Enter para omitir subida): ');
                if (token) process.env.GH_TOKEN = token;
            }
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
        const skipSSL = nonInteractive ? (cli.skipSsl ? 's' : 'n') : await question('\n¿Tienes problemas de red/SSL detectados en macOS? (¿Omitir validación?) (s/N): ');
        if (isYes(skipSSL)) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            console.log('\x1b[33m⚠️  Validación SSL desactivada para esta sesión\x1b[0m');
        }
    }

    // Build de React/Webpack (necesario siempre)
    await runCommand('npm run build', 'Compilando código fuente (Webpack)');

    // ssh2 opcional: cpu-features falla al recompilar con Electron; no es necesario en runtime
    await runCommand('npm run rm-cpu-features', 'Preparando dependencias nativas (omitir cpu-features)');

    if (await runCommand(ebCommand, isPublish ? 'Generando paquetes y publicando' : 'Generando paquetes locales')) {
        console.log('\n\x1b[32m✅ Compilación finalizada correctamente.\x1b[0m');

    }

    // =========================================================================
    // ETAPA FINAL: TAGS (Solo si es publicación)
    // =========================================================================
    if (isPublish) {
        console.log('\n\x1b[1m\x1b[36m--- ETAPA FINAL: ETIQUETADO Y SINCRONIZACIÓN ---\x1b[0m');
        const tagName = `v${nextVersion}`;

        const doTag = nonInteractive ? 's' : await question(`\n¿Asegurar y subir tag ${tagName}, rama y release notes? (S/n): `);
        if (doTag.toLowerCase() !== 'n') {
            if (await ensureSyncWithRemote(branchForBuild, { autoYes: nonInteractive })) {
                if (await runCommand(`git push origin ${branchForBuild}`, `Subiendo rama ${branchForBuild}`)) {
                    const tagOk = await ensureTagOnHeadAndPush(tagName, { tagConflictStrategy: nonInteractive ? (cli.tagStrategy || 'move') : 'ask' });
                    if (tagOk) {
                        const notes = buildReleaseNotes(nextVersion);
                        await upsertGithubRelease(tagName, branchForBuild, nextVersion, notes);
                    }
                }
            }
        }
    }

    console.log('\n\x1b[1m\x1b[32m═══════════════════════════════════════════════════\x1b[0m');
    console.log(`\x1b[1m\x1b[32m   🚀 PROCESO FINALIZADO   \x1b[0m`);
    console.log('\x1b[1m\x1b[32m═══════════════════════════════════════════════════\x1b[0m\n');
    rl.close();
}

main();
