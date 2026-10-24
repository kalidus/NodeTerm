/**
 * One-shot: split a monolith icon-themes source into per-theme modules.
 * Last duplicate key wins (matches object-literal semantics).
 *
 * Usage: node scripts/split-icon-themes.js [path-to-monolith.js]
 * Default source is scripts/_icon-themes.monolith.js (keep a backup there if regenerating).
 * Refuses to run against the current shim at src/themes/icon-themes.js.
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const generate = require('@babel/generator').default;

const OUT_DIR = path.resolve(__dirname, '../src/themes/icon-themes');
const DEFAULT_SRC = path.resolve(__dirname, '_icon-themes.monolith.js');
const SRC = path.resolve(process.argv[2] || DEFAULT_SRC);

if (path.resolve(SRC) === path.resolve(__dirname, '../src/themes/icon-themes.js')) {
  console.error('Refusing to split the shim at src/themes/icon-themes.js. Pass a monolith backup path.');
  process.exit(1);
}
if (!fs.existsSync(SRC)) {
  console.error('Source not found:', SRC);
  process.exit(1);
}
const src = fs.readFileSync(SRC, 'utf8');
if (!src.includes('export const iconThemes')) {
  console.error('Source does not look like an iconThemes monolith.');
  process.exit(1);
}

const ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx'] });

let themesObj = null;
for (const node of ast.program.body) {
  if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration') {
    for (const d of node.declaration.declarations) {
      if (d.id.name === 'iconThemes' && d.init?.type === 'ObjectExpression') {
        themesObj = d.init;
      }
    }
  }
}
if (!themesObj) {
  console.error('iconThemes object not found');
  process.exit(1);
}

const byKey = new Map();
for (const prop of themesObj.properties) {
  if (prop.type !== 'ObjectProperty') continue;
  let key;
  if (prop.key.type === 'Identifier') key = prop.key.name;
  else if (prop.key.type === 'StringLiteral') key = prop.key.value;
  else continue;
  byKey.set(key, prop);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const meta = [];
const themeIds = [];

for (const [key, prop] of byKey) {
  let name = key;
  if (prop.value.type === 'ObjectExpression') {
    for (const p of prop.value.properties) {
      if (p.type !== 'ObjectProperty') continue;
      const pk = p.key.type === 'Identifier' ? p.key.name : p.key.value;
      if (pk === 'name' && p.value.type === 'StringLiteral') {
        name = p.value.value;
      }
    }
  }

  const valueCode = generate(prop.value, {
    jsescOption: { minimal: true },
    retainLines: false,
    compact: false
  }).code;
  const fileBody = `import React from 'react';\n\nconst theme = ${valueCode};\n\nexport default theme;\n`;
  const fileName = `${key}.js`;
  fs.writeFileSync(path.join(OUT_DIR, fileName), fileBody, 'utf8');
  meta.push({ id: key, name });
  themeIds.push(key);
  console.log('wrote', fileName);
}

fs.writeFileSync(
  path.join(OUT_DIR, 'meta.js'),
  [
    '/** Lightweight icon-theme catalog (no SVG). */',
    `export const iconThemeMeta = ${JSON.stringify(meta, null, 2)};`,
    '',
    'export const iconThemeIds = iconThemeMeta.map((t) => t.id);',
    '',
    'export const iconThemeOptions = iconThemeMeta.map((t) => ({ label: t.name, value: t.id }));',
    ''
  ].join('\n'),
  'utf8'
);

console.log('themes', themeIds.length);
console.log('ids', themeIds.join(','));
