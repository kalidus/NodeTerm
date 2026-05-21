/**
 * Comprueba que existan rutas que el proceso main necesita en runtime
 * (electron-builder files + requires desde main.js / handlers).
 * Ejecutar antes de pack/dist: node scripts/verify-electron-packaging.js
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

/** Rutas relativas a la raíz del repo que deben empaquetarse o existir en el repo */
const REQUIRED_PATHS = [
  'main.js',
  'preload.js',
  'system-stats-worker.js',
  'package.json',
  'config/librechat.full.yaml',
  'dist/index.html',
  'src/main/utils/sync-keys.js',
  'src/shared/sync-keys.js',
  'src/main/handlers/index.js',
  'src/main/handlers/appdata-handlers.js',
  'src/main/services/StatsWorkerService.js',
  'src/services/GuacdService.js',
  'src/services/LibreChatService.js',
  'src/utils/sshConnectOptions.js',
  'src/utils/rdpScreenConfig.js',
  'src/components/bastion-ssh.js'
];

/** Patrones declarados en package.json build.files (auditoría manual) */
const PACKAGE_JSON_GLOBS = [
  'src/main/**',
  'src/shared/**',
  'src/services/**',
  'src/utils/**',
  'config/librechat.full.yaml'
];

function main() {
  const missing = [];
  for (const rel of REQUIRED_PATHS) {
    const full = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(full)) {
      missing.push(rel);
    }
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const files = pkg.build?.files || [];
  const filesStr = files.join('\n');
  const unpackGaps = [];
  if (!filesStr.includes('src/main/**')) unpackGaps.push('falta src/main/** en build.files');
  if (!filesStr.includes('src/services/**')) unpackGaps.push('falta src/services/** en build.files');
  if (!filesStr.includes('src/utils/**')) unpackGaps.push('falta src/utils/** en build.files');
  if (!filesStr.includes('system-stats-worker.js')) {
    unpackGaps.push('falta system-stats-worker.js en build.files');
  }

  console.log('\n📦 Verificación de empaquetado NodeTerm\n');
  console.log('Rutas runtime requeridas:');
  for (const rel of REQUIRED_PATHS) {
    const ok = !missing.includes(rel);
    console.log(`  ${ok ? '✅' : '❌'} ${rel}`);
  }

  console.log('\nPatrones en package.json build.files:');
  for (const g of PACKAGE_JSON_GLOBS) {
    console.log(`  ${filesStr.includes(g.replace('/**', '')) || filesStr.includes(g) ? '✅' : '⚠️'} ${g}`);
  }

  if (unpackGaps.length) {
    console.log('\n⚠️  Posibles huecos en build.files:');
    unpackGaps.forEach((m) => console.log(`  - ${m}`));
  }

  if (missing.length) {
    console.error('\n❌ Faltan archivos requeridos:', missing.join(', '));
    process.exit(1);
  }

  if (unpackGaps.length) {
    console.error('\n❌ Revisa package.json build.files antes de publicar.');
    process.exit(1);
  }

  console.log('\n✅ Comprobación OK. Puedes ejecutar npm run dist / release.js\n');
}

main();
