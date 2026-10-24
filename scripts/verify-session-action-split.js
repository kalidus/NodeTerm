const fs = require('fs');
const path = require('path');

const mainPath = path.resolve('dist/main.bundle.js');
if (!fs.existsSync(mainPath)) {
  console.error('dist/main.bundle.js missing — run webpack first');
  process.exit(1);
}

const main = fs.readFileSync(mainPath, 'utf8');
const neon = fs.readFileSync(path.resolve('src/themes/session-action-icons/neon.js'), 'utf8');
const neonId = (neon.match(/id="([^"]+)"/) || [])[1];

const chunks = fs.readdirSync('dist').filter(
  (f) => f.startsWith('session-action-') && f.endsWith('.chunk.js')
);

const premiumSvgPath = 'M12 8.5v7M8.5 12h7'; // unique to session-action premium studio
const hasPremiumChunk = fs.existsSync(path.resolve('dist/session-action-premium.chunk.js'));

const results = {
  modernConnectionGrad_in_main: main.includes('modernConnectionGrad'),
  neonId,
  neonId_in_main: neonId ? main.includes(neonId) : null,
  premiumSvgPath_in_main: main.includes(premiumSvgPath),
  hasPremiumChunk,
  sessionActionChunks: chunks.length,
  chunkNames: chunks.slice(0, 8)
};

console.log(JSON.stringify(results, null, 2));

if (!results.modernConnectionGrad_in_main) {
  console.error('FAIL: modern eager theme missing from main');
  process.exit(1);
}
if (results.neonId_in_main) {
  console.error('FAIL: neon SVG still in main bundle');
  process.exit(1);
}
if (results.premiumSvgPath_in_main) {
  console.error('FAIL: premium session-action SVG still in main bundle');
  process.exit(1);
}
if (!results.hasPremiumChunk) {
  console.error('FAIL: missing session-action-premium.chunk.js');
  process.exit(1);
}
if (results.sessionActionChunks < 15) {
  console.error('FAIL: expected many session-action chunks, got', results.sessionActionChunks);
  process.exit(1);
}
console.log('OK: session-action split verified');
