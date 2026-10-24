/**
 * One-shot: split src/themes/session-action-icons.js into per-theme modules.
 * Premium pack stays as a separate lazy bundle (session-action-icons-premium.js).
 *
 * Usage: node scripts/split-session-action-icons.js [path-to-monolith.js]
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const generate = require('@babel/generator').default;

const OUT_DIR = path.resolve(__dirname, '../src/themes/session-action-icons');
const DEFAULT_SRC = path.resolve(__dirname, '_session-action-icons.monolith.js');
const SRC = path.resolve(process.argv[2] || path.resolve(__dirname, '../src/themes/session-action-icons.js'));

if (path.resolve(SRC) === path.resolve(__dirname, '../src/themes/session-action-icons.js')) {
  const probe = fs.readFileSync(SRC, 'utf8');
  if (!probe.includes('export const sessionActionIconThemes = {')) {
    console.error('Refusing to split the shim. Pass a monolith backup path.');
    process.exit(1);
  }
}

const src = fs.readFileSync(SRC, 'utf8');
const ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx'] });

let themesObj = null;
for (const node of ast.program.body) {
  if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration') {
    for (const d of node.declaration.declarations) {
      if (d.id.name === 'sessionActionIconThemes' && d.init?.type === 'ObjectExpression') {
        themesObj = d.init;
      }
    }
  }
}
if (!themesObj) {
  console.error('sessionActionIconThemes object not found');
  process.exit(1);
}

const byKey = new Map();
for (const prop of themesObj.properties) {
  if (prop.type === 'SpreadElement') continue; // premium spread — handled as lazy bundle
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
  let description = '';
  if (prop.value.type === 'ObjectExpression') {
    for (const p of prop.value.properties) {
      if (p.type !== 'ObjectProperty') continue;
      const pk = p.key.type === 'Identifier' ? p.key.name : p.key.value;
      if (pk === 'name' && p.value.type === 'StringLiteral') name = p.value.value;
      if (pk === 'description' && p.value.type === 'StringLiteral') description = p.value.value;
    }
  }

  const valueCode = generate(prop.value, {
    jsescOption: { minimal: true },
    retainLines: false,
    compact: false
  }).code;
  const fileBody = `import React from 'react';\n\nconst theme = ${valueCode};\n\nexport default theme;\n`;
  fs.writeFileSync(path.join(OUT_DIR, `${key}.js`), fileBody, 'utf8');
  meta.push({ id: key, name, description, premium: false });
  themeIds.push(key);
  console.log('wrote', key);
}

// Premium meta (ids only — SVGs stay in premium bundle)
const premiumSrc = fs.readFileSync(
  path.resolve(__dirname, '../src/themes/session-action-icons-premium.js'),
  'utf8'
);
const premiumAst = parser.parse(premiumSrc, { sourceType: 'module', plugins: ['jsx'] });
let premiumObj = null;
for (const node of premiumAst.program.body) {
  if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration') {
    for (const d of node.declaration.declarations) {
      if (d.id.name === 'premiumSessionActionIconThemes' && d.init?.type === 'ObjectExpression') {
        premiumObj = d.init;
      }
    }
  }
}
const premiumIds = [];
if (premiumObj) {
  for (const prop of premiumObj.properties) {
    if (prop.type !== 'ObjectProperty') continue;
    const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
    let name = key;
    let description = '';
    if (prop.value.type === 'ObjectExpression') {
      for (const p of prop.value.properties) {
        if (p.type !== 'ObjectProperty') continue;
        const pk = p.key.type === 'Identifier' ? p.key.name : p.key.value;
        if (pk === 'name' && p.value.type === 'StringLiteral') name = p.value.value;
        if (pk === 'description' && p.value.type === 'StringLiteral') description = p.value.value;
      }
    }
    meta.push({ id: key, name, description, premium: true });
    premiumIds.push(key);
    themeIds.push(key);
    console.log('meta premium', key);
  }
}

fs.writeFileSync(
  path.join(OUT_DIR, 'meta.js'),
  [
    '/** Lightweight session-action icon catalog (no SVG). */',
    `export const sessionActionIconThemeMeta = ${JSON.stringify(meta, null, 2)};`,
    '',
    'export const sessionActionIconThemeIds = sessionActionIconThemeMeta.map((t) => t.id);',
    '',
    'export const sessionActionIconThemeOptions = sessionActionIconThemeMeta.map((t) => ({',
    '  label: t.name,',
    '  value: t.id,',
    '  description: t.description || \'\'',
    '}));',
    '',
    `export const PREMIUM_SESSION_ACTION_IDS = ${JSON.stringify(premiumIds)};`,
    ''
  ].join('\n'),
  'utf8'
);

console.log('base themes', byKey.size, 'premium', premiumIds.length, 'total', themeIds.length);
