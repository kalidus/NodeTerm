import { createAiCliTerminalComponent } from '../utils/aiCliTerminalFactory';

const CodexCliTerminal = createAiCliTerminalComponent({
  displayName: 'CodexCliTerminal',
  ipcPrefix: 'codexcli',
  errorLabel: 'Codex CLI',
  defaultBackground: '#111827',
  cursor: '#10b981',
  selection: 'rgba(16, 185, 129, 0.3)',
  shellClass: 'codexcli-terminal-shell',
  validateConfig: () => window.electron?.codexcli?.validateConfig?.()
});

export default CodexCliTerminal;
