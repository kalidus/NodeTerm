const { windowManager } = require('node-window-manager');

const title = process.argv[2] || 'FreeRDP: 192.168.10.52';
const width = parseInt(process.argv[3] || '1280', 10);
const height = parseInt(process.argv[4] || '720', 10);

const win = windowManager.getWindows().find(w => w.getTitle() === title);
if (!win) {
  console.error(`No se encontró la ventana con título: '${title}'`);
  process.exit(1);
}
console.log(`Redimensionando ventana '${title}' a ${width+2}x${height+2} (forzar repintado)...`);
win.setBounds({ x: win.getBounds().x, y: win.getBounds().y, width: width+2, height: height+2 });
setTimeout(() => {
  console.log(`Redimensionando ventana '${title}' a ${width}x${height} (final)...`);
  win.setBounds({ x: win.getBounds().x, y: win.getBounds().y, width, height });
  console.log(`Ventana '${title}' redimensionada a ${width}x${height}`);
}, 200); 