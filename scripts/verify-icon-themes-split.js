const fs = require('fs');
const path = require('path');

const main = fs.readFileSync(path.resolve('dist/main.bundle.js'), 'utf8');
const glass = fs.readFileSync(path.resolve('src/themes/icon-themes/glassmorphism.js'), 'utf8');
const synth = fs.readFileSync(path.resolve('src/themes/icon-themes/synthwave.js'), 'utf8');

const glassId = (glass.match(/linearGradient id="([^"]+)"/) || [])[1];
const synthId = (synth.match(/id="([^"]+)"/) || [])[1];

const results = {
  nordSSH_in_main: main.includes('nordSSH'),
  materialSSH_in_main: main.includes('materialSSH'),
  glassGradient_in_main: glassId ? main.includes(glassId) : null,
  glassGradient_id: glassId,
  synthId_in_main: synthId ? main.includes(synthId) : null,
  synthId,
  iconThemeChunks: fs.readdirSync('dist').filter((f) => f.startsWith('icon-theme-') && f.endsWith('.chunk.js')).length,
  mainKB: +(main.length / 1024).toFixed(1)
};

console.log(JSON.stringify(results, null, 2));

if (!results.nordSSH_in_main || !results.materialSSH_in_main) {
  console.error('FAIL: eager themes missing from main');
  process.exit(1);
}
if (results.glassGradient_in_main || results.synthId_in_main) {
  console.error('FAIL: lazy theme SVG still in main bundle');
  process.exit(1);
}
if (results.iconThemeChunks < 40) {
  console.error('FAIL: expected ~44 lazy icon-theme chunks');
  process.exit(1);
}
console.log('OK: split verified');
