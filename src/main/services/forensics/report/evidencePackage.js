/**
 * evidencePackage.js - Empaquetado ZIP de un caso (sin dependencias externas)
 *
 * Genera un ZIP estándar (método DEFLATE) con los ficheros del caso, el manifiesto
 * y los informes opcionales. Escribe en streaming para soportar artefactos grandes.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf, prev = 0) {
  let c = (prev ^ 0xffffffff) >>> 0;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const time = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff;
  const day = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;
  return { time, day };
}

async function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(full, base));
    else out.push({ full, name: path.relative(base, full).split(path.sep).join('/') });
  }
  return out;
}

/**
 * Crea un ZIP. entries: [{ name, data: Buffer }] en memoria + ficheros del directorio del caso.
 */
async function createEvidenceZip(caseDir, destPath, extraEntries = []) {
  const files = await listFiles(caseDir);
  const items = [
    ...files.map((f) => ({ name: `case/${f.name}`, file: f.full })),
    ...extraEntries.map((e) => ({ name: e.name, data: e.data }))
  ];

  const out = fs.createWriteStream(destPath);
  const done = new Promise((resolve, reject) => {
    out.on('finish', resolve);
    out.on('error', reject);
  });

  let offset = 0;
  const central = [];
  const write = (buf) => new Promise((resolve, reject) => {
    out.write(buf, (err) => (err ? reject(err) : resolve()));
    offset += buf.length;
  });

  for (const item of items) {
    const raw = item.data || await fs.promises.readFile(item.file);
    const stat = item.file ? await fs.promises.stat(item.file) : null;
    const { time, day } = dosDateTime(stat ? stat.mtime : new Date());
    const nameBuf = Buffer.from(item.name, 'utf8');
    const crc = crc32(raw);
    const compressed = zlib.deflateRawSync(raw, { level: 6 });
    const useDeflate = compressed.length < raw.length;
    const payload = useDeflate ? compressed : raw;
    const method = useDeflate ? 8 : 0;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(day, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const localOffset = offset;
    await write(localHeader);
    await write(nameBuf);
    await write(payload);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(day, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(payload.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(localOffset, 42);
    central.push(Buffer.concat([cd, nameBuf]));
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const c of central) {
    await write(c);
    centralSize += c.length;
  }

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(central.length, 8);
  end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);
  await write(end);
  out.end();
  await done;
  return { path: destPath, entries: items.length };
}

module.exports = { createEvidenceZip, crc32 };
