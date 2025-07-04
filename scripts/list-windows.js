const { windowManager } = require('node-window-manager');
windowManager.getWindows().forEach(w => {
  const title = w.getTitle();
  if (title) console.log(title);
}); 