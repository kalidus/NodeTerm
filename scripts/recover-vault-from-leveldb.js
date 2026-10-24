/**
 * One-shot: extract largest passwords_encrypted / documents_encrypted
 * blobs from Electron LevelDB into vault/*.recovered.json
 *
 * Uso:
 *   node scripts/recover-vault-from-leveldb.js
 * Luego, con la app CERRADA:
 *   $env:NODETERM_TEST_DATA_DIR="$env:APPDATA\nodeterm"
 *   node -e "..."  # writeVaultSidecar desde recovered/bak
 */
const fs = require('fs');
const path = require('path');

const appDataRoot = path.join(process.env.APPDATA, 'nodeterm');
const ldb = path.join(appDataRoot, 'Local Storage', 'leveldb');
const outDir = path.join(appDataRoot, 'vault');


const files = fs
  .readdirSync(ldb)
  .filter((f) => /\.(ldb|log)$/.test(f))
  .map((f) => {
    const p = path.join(ldb, f);
    return { f, p, len: fs.statSync(p).size };
  })
  .sort((a, b) => b.len - a.len);

function extractBlobs(buf, key) {
  const s = buf.toString('latin1');
  const out = [];
  let idx = 0;
  while ((idx = s.indexOf(key, idx)) !== -1) {
    const windowEnd = Math.min(s.length, idx + 120);
    let start = s.indexOf('{"v":', idx);
    if (start === -1 || start > windowEnd) {
      start = s.indexOf('{"salt"', idx);
    }
    if (start === -1 || start > windowEnd) {
      idx += key.length;
      continue;
    }
    let depth = 0;
    let end = -1;
    const max = Math.min(s.length, start + 5e6);
    for (let i = start; i < max; i++) {
      const c = s[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end > start) {
      out.push({ len: end - start + 1, json: s.slice(start, end + 1), at: idx });
    }
    idx += key.length;
  }
  return out;
}

const best = {
  passwords_encrypted: null,
  documents_encrypted: null
};

for (const { f, p, len } of files) {
  const buf = fs.readFileSync(p);
  for (const key of Object.keys(best)) {
    const blobs = extractBlobs(buf, key);
    let maxLen = 0;
    for (const b of blobs) {
      try {
        const o = JSON.parse(b.json);
        const dataLen =
          typeof o.data === 'string'
            ? o.data.length
            : Array.isArray(o.data)
              ? o.data.length
              : 0;
        if (!best[key] || b.len > best[key].len) {
          best[key] = { file: f, len: b.len, dataLen, json: b.json };
        }
        if (b.len > maxLen) maxLen = b.len;
      } catch (_) {
        /* skip */
      }
    }
    if (blobs.length) {
      console.log(f, 'fileSize', len, key, 'hits', blobs.length, 'maxJson', maxLen);
    }
  }
}

fs.mkdirSync(outDir, { recursive: true });
console.log('\nBEST:');
for (const [k, b] of Object.entries(best)) {
  if (!b) {
    console.log(k, 'NONE');
    continue;
  }
  const out = path.join(outDir, `${k}.recovered.json`);
  fs.writeFileSync(out, b.json);
  console.log(k, 'from', b.file, 'jsonLen', b.len, 'dataLen', b.dataLen, '->', out);
}
