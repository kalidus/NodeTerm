const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const unzip = require('unzipper');

const FFMPEG_URL = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';
const ZIP_PATH = path.join(__dirname, '../ffmpeg-release-essentials.zip');
const OUT_DIR = path.join(__dirname, '../resources/ffmpeg');

async function downloadFFmpeg() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  if (fs.existsSync(path.join(OUT_DIR, 'ffmpeg.exe'))) {
    console.log('ffmpeg.exe ya descargado.');
    return;
  }
  console.log('Descargando ffmpeg...');
  const res = await fetch(FFMPEG_URL);
  if (!res.ok) throw new Error('Error descargando ffmpeg: ' + res.statusText);
  const fileStream = fs.createWriteStream(ZIP_PATH);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
  console.log('Descomprimiendo...');
  await fs.createReadStream(ZIP_PATH)
    .pipe(unzip.Extract({ path: OUT_DIR }))
    .promise();
  // Buscar ffmpeg.exe dentro de la carpeta descomprimida
  const walk = dir => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(filePath));
      } else {
        results.push(filePath);
      }
    });
    return results;
  };
  const files = walk(OUT_DIR);
  const ffmpegBin = files.find(f => f.endsWith('ffmpeg.exe'));
  if (!ffmpegBin) throw new Error('No se encontró ffmpeg.exe tras descomprimir.');
  fs.copyFileSync(ffmpegBin, path.join(OUT_DIR, 'ffmpeg.exe'));
  console.log('ffmpeg.exe listo en', path.join(OUT_DIR, 'ffmpeg.exe'));
}

downloadFFmpeg().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 