import { createAiCliTerminalComponent } from '../utils/aiCliTerminalFactory';

const AntigravityCliTerminal = createAiCliTerminalComponent({
  displayName: 'AntigravityCliTerminal',
  ipcPrefix: 'antigravitycli',
  errorLabel: 'Antigravity CLI',
  defaultBackground: '#0f172a',
  cursor: '#4285f4',
  selection: 'rgba(66, 133, 244, 0.3)',
  shellClass: 'antigravitycli-terminal-shell',
  windowsConpty: true,
  validateConfig: () => window.electron?.antigravitycli?.validateConfig?.()
});

export default AntigravityCliTerminal;
