const { windowManager } = require('node-window-manager');

const title = 'FreeRDP: 192.168.10.52'; // Título exacto

function moveFreeRDPWindow() {
  const win = windowManager.getWindows().find(w => w.getTitle() === title);
  if (win) {
    const bounds = win.getBounds();
    win.setBounds({ x: -2000, y: 0, width: bounds.width, height: bounds.height });
    console.log('Ventana FreeRDP movida fuera del área visible.');
  } else {
    console.log('No se encontró la ventana de FreeRDP.');
  }
}

moveFreeRDPWindow(); 