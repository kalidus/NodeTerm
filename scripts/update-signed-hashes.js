const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getSha512Base64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha512').update(fileBuffer).digest('base64');
}

function updateLatestYml() {
  const distDir = path.join(process.cwd(), 'dist');
  const latestYmlPath = path.join(distDir, 'latest.yml');

  if (!fs.existsSync(latestYmlPath)) {
    console.log('[update-signed-hashes] No latest.yml found in dist/, skipping.');
    return;
  }

  let content = fs.readFileSync(latestYmlPath, 'utf8');
  console.log('[update-signed-hashes] Updating hashes in latest.yml for signed binaries...');

  const exeFiles = fs.readdirSync(distDir).filter(file => file.endsWith('.exe'));

  for (const exeFile of exeFiles) {
    const fullPath = path.join(distDir, exeFile);
    const stats = fs.statSync(fullPath);
    const newSha512 = getSha512Base64(fullPath);
    const newSize = stats.size;

    console.log(`[update-signed-hashes] File: ${exeFile}`);
    console.log(`  Size: ${newSize} bytes`);
    console.log(`  SHA-512: ${newSha512}`);

    // Update inside files array:
    const escapedFile = exeFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fileBlockRegex = new RegExp(
      `(url:\\s*${escapedFile}\\s*\\n\\s*sha512:\\s*)[^\\n]+(\\n\\s*size:\\s*)\\d+`,
      'g'
    );
    content = content.replace(fileBlockRegex, `$1${newSha512}$2${newSize}`);

    // Replace if this is the primary installer in path:
    const pathMatchRegex = new RegExp(`(path:\\s*${escapedFile}\\s*\\n\\s*sha512:\\s*)[^\\n]+`, 'g');
    content = content.replace(pathMatchRegex, `$1${newSha512}`);
  }

  fs.writeFileSync(latestYmlPath, content, 'utf8');
  console.log('[update-signed-hashes] latest.yml successfully updated with new signatures.');
}

updateLatestYml();
