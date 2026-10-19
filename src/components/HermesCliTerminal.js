import { createAiCliTerminalComponent } from '../utils/aiCliTerminalFactory';

const HermesCliTerminal = createAiCliTerminalComponent({
  displayName: 'HermesCliTerminal',
  ipcPrefix: 'hermescli',
  errorLabel: 'Hermes CLI',
  defaultBackground: '#0f172a',
  cursor: '#14b8a6',
  selection: 'rgba(20, 184, 166, 0.3)',
  shellClass: 'hermescli-terminal-shell',
  validateConfig: () => window.electron?.hermescli?.validateConfig?.()
});

export default HermesCliTerminal;
