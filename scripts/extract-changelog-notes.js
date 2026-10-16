#!/usr/bin/env node
'use strict';

/**
 * Extrae la seccion ## [version] de CHANGELOG.md para GitHub Releases.
 * Uso:
 *   node scripts/extract-changelog-notes.js [version] > RELEASE_NOTES_BODY.md
 *   GITHUB_REF_NAME=v1.7.7 node scripts/extract-changelog-notes.js
 *
 * Si version se omite, usa GITHUB_REF_NAME (quita el prefijo v) o package.json.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FALLBACK =
  '### Novedades en esta versión\n- Mejoras generales y correcciones de estabilidad.';

function resolveVersion(argvVersion) {
  if (argvVersion && String(argvVersion).trim()) {
    return String(argvVersion).trim().replace(/^v/, '');
  }
  if (process.env.GITHUB_REF_NAME) {
    return String(process.env.GITHUB_REF_NAME).replace(/^v/, '');
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    return String(pkg.version || '').replace(/^v/, '');
  } catch (_) {
    return '';
  }
}

function getReleaseNotes(version) {
  const changelogPath = path.join(ROOT, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath) || !version) return '';
  const content = fs.readFileSync(changelogPath, 'utf8').replace(/\r\n/g, '\n');
  const escapedVersion = version.replace(/\./g, '\\.');
  const regex = new RegExp(
    `## \\[${escapedVersion}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n## \\[|$)`,
    'g'
  );
  const parts = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) parts.push(match[1].trim());
  }
  return parts.length > 0 ? parts.join('\n\n---\n\n') : '';
}

function main() {
  const version = resolveVersion(process.argv[2]);
  const notes = getReleaseNotes(version);
  process.stdout.write(notes || FALLBACK);
  if (!notes) {
    process.stderr.write(
      `[extract-changelog-notes] Sin seccion ## [${version || '?'}] en CHANGELOG; usando fallback.\n`
    );
  }
}

main();
