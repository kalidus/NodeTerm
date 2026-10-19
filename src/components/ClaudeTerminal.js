import { createAiCliTerminalComponent } from '../utils/aiCliTerminalFactory';

const ClaudeTerminal = createAiCliTerminalComponent({
  displayName: 'ClaudeTerminal',
  ipcPrefix: 'claude',
  errorLabel: 'Claude',
  defaultBackground: '#111827',
  cursor: '#60a5fa',
  selection: 'rgba(96, 165, 250, 0.3)',
  shellClass: 'claude-terminal-shell',
  validateConfig: () => window.electron?.claude?.validateConfig?.()
});

export default ClaudeTerminal;
