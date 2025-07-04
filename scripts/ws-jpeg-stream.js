const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 9001;
const FFMPEG = path.join(__dirname, '../resources/ffmpeg/ffmpeg-7.1.1-essentials_build/bin/ffmpeg.exe');

const wss = new WebSocket.Server({ port: PORT });
console.log(`WebSocket JPEG server listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('Cliente WebSocket conectado');

  // Lanza ffmpeg para capturar el escritorio a resolución nativa
  const ffmpeg = spawn(FFMPEG, [
    '-f', 'gdigrab',
    '-framerate', '10',
    '-i', 'desktop',
    '-update', '1',
    '-q:v', '5',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-'
  ]);

  let buffer = Buffer.alloc(0);

  ffmpeg.stdout.on('data', (data) => {
    buffer = Buffer.concat([buffer, data]);
    // Buscar SOI y EOI de JPEG
    let start, end;
    while ((start = buffer.indexOf(Buffer.from([0xFF, 0xD8]))) !== -1 && (end = buffer.indexOf(Buffer.from([0xFF, 0xD9]), start)) !== -1) {
      const jpeg = buffer.slice(start, end + 2);
      ws.send(jpeg);
      buffer = buffer.slice(end + 2);
    }
  });

  ffmpeg.stderr.on('data', d => process.stdout.write('[ffmpeg] ' + d.toString()));
  ffmpeg.on('exit', (code, signal) => {
    console.log(`ffmpeg terminó con código ${code}, señal ${signal}`);
    ws.close();
  });
  ws.on('close', () => {
    ffmpeg.kill('SIGKILL');
    console.log('Cliente WebSocket desconectado, ffmpeg terminado');
  });
}); 