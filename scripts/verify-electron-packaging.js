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

const VENDOR_DEP = 'file:third_party/ironrdp/wasm';
const VENDOR_JS = 'third_party/ironrdp/wasm/iron-remote-desktop-rdp.js';
const VENDOR_WASM = 'third_party/ironrdp/wasm/iron-remote-desktop-rdp_bg.wasm';
const VENDOR_PKG = 'third_party/ironrdp/wasm/package.json';

/**
 * El WASM IronRDP NodeTerm viaja congelado en third_party/ironrdp/wasm/ (JS glue + .wasm binario);
 * releases no lo recompilan.
 * @param {object} rootPkg
 * @returns {string[]}
 */
function verifyIronRdpVendor(rootPkg) {
  const errors = [];
  const dep = rootPkg.dependencies && rootPkg.dependencies['@devolutions/iron-remote-desktop-rdp'];
  if (dep !== VENDOR_DEP) {
    errors.push(
      `dependencia @devolutions/iron-remote-desktop-rdp debe ser "${VENDOR_DEP}" (actual: ${dep || 'ausente'})`
    );
  }

  const jsPath = path.join(REPO_ROOT, VENDOR_JS);
  const wasmPath = path.join(REPO_ROOT, VENDOR_WASM);
  const pkgPath = path.join(REPO_ROOT, VENDOR_PKG);
  if (!fs.existsSync(jsPath)) {
    errors.push(`falta ${VENDOR_JS}`);
  }
  if (!fs.existsSync(wasmPath)) {
    errors.push(`falta ${VENDOR_WASM}`);
  }
  if (!fs.existsSync(pkgPath)) {
    errors.push(`falta ${VENDOR_PKG}`);
  }
  if (errors.length) return errors;

  let vendorPkg;
  try {
    vendorPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    errors.push(`no se pudo leer ${VENDOR_PKG}: ${err.message}`);
    return errors;
  }

  const ver = String(vendorPkg.version || '');
  if (!ver.includes('nodeterm-egfx') && !ver.includes('egfx')) {
    errors.push(`versión vendor inválida (se esperaba *nodeterm-egfx* / *egfx*): ${ver || '(vacía)'}`);
  }

  const files = Array.isArray(vendorPkg.files) ? vendorPkg.files : [];
  if (!files.includes('iron-remote-desktop-rdp_bg.wasm')) {
    errors.push(`${VENDOR_PKG} files[] debe incluir iron-remote-desktop-rdp_bg.wasm`);
  }

  const js = fs.readFileSync(jsPath, 'utf8');
  if (js.includes('data:application/wasm;base64,')) {
    errors.push(
      `${VENDOR_JS} aún tiene WASM embebido en base64; ejecuta node scripts/extract-ironrdp-wasm.js`
    );
  }
  if (!js.includes('iron-remote-desktop-rdp_bg.wasm')) {
    errors.push(`${VENDOR_JS} no referencia iron-remote-desktop-rdp_bg.wasm`);
  }
  if (js.length > 2_000_000) {
    errors.push(`${VENDOR_JS} demasiado grande (${js.length} bytes); ¿sigue el base64?`);
  }

  const wasmStat = fs.statSync(wasmPath);
  if (wasmStat.size < 100_000) {
    errors.push(`${VENDOR_WASM} demasiado pequeño (${wasmStat.size} bytes)`);
  }
  const magic = Buffer.alloc(4);
  const fd = fs.openSync(wasmPath, 'r');
  fs.readSync(fd, magic, 0, 4, 0);
  fs.closeSync(fd);
  if (magic.toString('binary') !== '\0asm') {
    errors.push(`${VENDOR_WASM} magic inválido (no es módulo WASM)`);
  }

  const unpack = (rootPkg.build && rootPkg.build.asarUnpack) || [];
  const unpackStr = unpack.join('\n');
  if (!unpackStr.includes('.wasm')) {
    errors.push('build.asarUnpack debe incluir **/*.wasm (fetch de WASM desde asar falla)');
  }

  return errors;
}

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

  const vendorErrors = verifyIronRdpVendor(pkg);

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

  console.log('\nIronRDP WASM vendor (congelado):');
  if (vendorErrors.length === 0) {
    const vendorPkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, VENDOR_PKG), 'utf8'));
    console.log(`  ✅ ${VENDOR_DEP} → ${vendorPkg.version}`);
  } else {
    vendorErrors.forEach((m) => console.log(`  ❌ ${m}`));
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

  if (vendorErrors.length) {
    console.error('\n❌ Vendor IronRDP incompleto o no congelado. Releases deben usar file:third_party/ironrdp/wasm.');
    process.exit(1);
  }

  console.log('\n✅ Comprobación OK. Puedes ejecutar npm run dist / release.js\n');
}

main();
