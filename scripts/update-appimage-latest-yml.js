/**
 * Recalcula sha512 y size de latest-linux.yml despues de reempaquetar el AppImage.
 * Quita blockMapSize: el blockmap del fichero anterior no corresponde al nuevo.
 *
 * Uso: node scripts/update-appimage-latest-yml.js <AppImage> <latest-linux.yml>
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function updateLatestLinuxYml(appImagePath, ymlPath) {
  if (!fs.existsSync(ymlPath)) {
    return { updated: false, reason: 'missing' };
  }

  const buf = fs.readFileSync(appImagePath);
  const sha512 = crypto.createHash('sha512').update(buf).digest('base64');
  const size = buf.length;
  const name = path.basename(appImagePath);

  const yml = fs.readFileSync(ymlPath, 'utf8').replace(/\r\n/g, '\n');
  if (!/\.AppImage(?:['"]?\s*)$/m.test(yml)) {
    throw new Error(ymlPath + ' no referencia un AppImage');
  }

  const lines = yml.split('\n');
  const out = [];
  let inAppImageFile = false;
  let replaceRootSha = false;
  let touchedSha = 0;
  let touchedSize = 0;

  for (const line of lines) {
    const fileUrl = line.match(/^  - url:\s*(?:['"]?)([^'"\s]+)(?:['"]?)\s*$/);
    if (fileUrl) {
      inAppImageFile = fileUrl[1].endsWith('.AppImage');
      out.push(inAppImageFile ? '  - url: ' + name : line);
      continue;
    }

    if (/^[^ \t#]/.test(line)) {
      inAppImageFile = false;
    }

    if (inAppImageFile && /^[ \t]*blockMapSize:/.test(line)) {
      continue;
    }
    if (inAppImageFile && /^[ \t]*sha512:/.test(line)) {
      out.push(line.replace(/^([ \t]*sha512:\s*).+$/, '$1' + sha512));
      touchedSha += 1;
      continue;
    }
    if (inAppImageFile && /^[ \t]*size:/.test(line)) {
      out.push(line.replace(/^([ \t]*size:\s*)\d+/, '$1' + String(size)));
      touchedSize += 1;
      continue;
    }

    const pathMatch = line.match(/^path:\s*(?:['"]?)([^'"\s]+)(?:['"]?)\s*$/);
    if (pathMatch) {
      replaceRootSha = pathMatch[1].endsWith('.AppImage');
      out.push(replaceRootSha ? 'path: ' + name : line);
      continue;
    }
    if (replaceRootSha && /^sha512:/.test(line)) {
      out.push('sha512: ' + sha512);
      replaceRootSha = false;
      touchedSha += 1;
      continue;
    }

    out.push(line);
  }

  if (touchedSha < 2 || touchedSize < 1) {
    throw new Error(ymlPath + ' no tiene la entrada AppImage esperada (sha512=' + touchedSha + ', size=' + touchedSize + ')');
  }

  let written = out.join('\n');
  if (!written.endsWith('\n')) written += '\n';
  fs.writeFileSync(ymlPath, written);

  written = fs.readFileSync(ymlPath, 'utf8');
  if (!written.includes(sha512) || !written.includes('size: ' + size)) {
    throw new Error('No se pudo escribir sha512 o size en ' + ymlPath);
  }
  if (/blockMapSize:/.test(written)) {
    throw new Error('blockMapSize sigue presente en ' + ymlPath);
  }

  return { updated: true, sha512, size, name };
}

function main() {
  const appImagePath = process.argv[2];
  const ymlPath = process.argv[3];
  if (!appImagePath || !ymlPath) {
    console.error('Uso: node scripts/update-appimage-latest-yml.js <AppImage> <latest-linux.yml>');
    process.exit(1);
  }
  if (!fs.existsSync(appImagePath)) {
    console.error('No existe el AppImage: ' + appImagePath);
    process.exit(1);
  }

  const result = updateLatestLinuxYml(appImagePath, ymlPath);
  if (!result.updated) {
    console.log('No existe ' + ymlPath + '; no hay metadatos de electron-updater que corregir.');
    return;
  }
  console.log('Actualizado ' + ymlPath + ' name=' + result.name + ' size=' + result.size);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

module.exports = { updateLatestLinuxYml };
