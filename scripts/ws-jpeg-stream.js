const WebSocket = require('ws');
const { spawn, execSync } = require('child_process');
const path = require('path');

const PORT = 9001;
const FFMPEG = path.join(__dirname, '../resources/ffmpeg/ffmpeg-7.1.1-essentials_build/bin/ffmpeg.exe');

// --- DETECCIÓN AUTOMÁTICA DEL MONITOR PRINCIPAL ---
function getMonitorBounds(index = 0) {
  const psScriptPath = path.join(__dirname, 'get-monitors.ps1');
  const result = execSync(`powershell -NoProfile -File \"${psScriptPath}\"`).toString().trim();
  const monitors = JSON.parse(result);
  const arr = Array.isArray(monitors) ? monitors : [monitors];
  console.log('Monitores detectados:');
  arr.forEach((m, i) => {
    console.log(`[${i}] ${m.DeviceName} (${m.Width}x${m.Height}) offset=(${m.X},${m.Y})${m.Primary ? ' [PRINCIPAL]' : ''}`);
  });
  return arr[index];
}

// Cambia el índice aquí si quieres otro monitor (0 = primero)
const monitor = getMonitorBounds(0);
const { X: x, Y: y, PhysicalWidth: width, PhysicalHeight: height } = monitor;
console.log(`Usando monitor: offset_x=${x}, offset_y=${y}, video_size=${width}x${height}`);

const wss = new WebSocket.Server({ port: PORT });
console.log(`WebSocket JPEG server listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('Cliente WebSocket conectado');

  // Lanza ffmpeg para capturar SOLO el monitor principal
  const ffmpeg = spawn(FFMPEG, [
    '-f', 'gdigrab',
    '-framerate', '10',
    '-offset_x', String(x),
    '-offset_y', String(y),
    '-video_size', `${width}x${height}`,
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